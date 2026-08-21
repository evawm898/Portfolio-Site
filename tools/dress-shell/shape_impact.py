"""Shape-change impact report — "when a new shape.yaml is applied,
re-validate every existing placement against the new shell and report
what broke. Do not silently re-seat them."

Placements in layout.yaml live in (theta, s), a coordinate on the
SURFACE CHART, not a physical mm position — theta/s are never touched by
this module. What changes when the shell changes is what those same
(theta, s) coordinates now MEAN: the standoff at that point, whether the
connector's escape path still clears the seams, whether a mirror twin's
rotation is still legal, and which panels now overlap. This module
re-evaluates all of that against the same fixed (theta, s, rotation) for
every authored panel, under OLD and NEW shells side by side, and reports
the deltas — it never moves a panel to compensate.

Reuses existing, already-validated machinery unmodified:
  - layout.resolve_layout       outline/connector legality, twin derivation
  - curvature.seat_standoff     true per-panel footprint standoff (the
                                 same footprint-sampling seating.py already
                                 uses for the whole-shell heatmap — never
                                 the w^2/8R chord shortcut)
  - layering.analyze_layering   overlap DAG + max stack height

Run standalone:
    python3 shape_impact.py --old dress_params --new shape.yaml \
        [--layout layout.yaml] [--tolerance-mm 2.0]
"""

import argparse
import sys
from dataclasses import dataclass, replace
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from coords import ShellCoords
from curvature import STANDOFF_TOLERANCE_MM, seat_standoff
from layering import LayeringError, analyze_layering
from layout import SurfaceChart, load_layout, resolve_layout
from panels import load_panel_classes
from shell import ShellModel, dress_params


@dataclass
class PanelImpact:
    panel_id: str
    is_twin: bool
    old_standoff_mm: float
    new_standoff_mm: float
    was_within_tolerance: bool
    now_within_tolerance: bool
    standoff_regressed: bool          # was fine, now isn't
    old_problems: tuple
    new_problems: tuple
    new_problems_only: tuple          # in new, not in old — what BROKE
    resolved_problems_only: tuple     # in old, not in new — informational


@dataclass
class TwinImpact:
    source_id: str
    old_valid: bool
    new_valid: bool
    became_invalid: bool              # was valid, now isn't
    became_valid: bool                # was invalid, now is (informational)
    new_reasons: tuple                # only populated when became_invalid


@dataclass
class ShapeChangeReport:
    panel_impacts: list
    twin_impacts: list
    old_max_stack_mm: float
    new_max_stack_mm: float
    old_dag_valid: bool
    old_dag_error: str
    new_dag_valid: bool
    new_dag_error: str
    resolve_errors: tuple              # unknown-class etc., from resolve_layout

    @property
    def standoff_regressions(self):
        return [p.panel_id for p in self.panel_impacts if p.standoff_regressed]

    @property
    def now_exceeds_tolerance(self):
        return [p.panel_id for p in self.panel_impacts if not p.now_within_tolerance]

    @property
    def new_connector_or_outline_problems(self):
        return [p.panel_id for p in self.panel_impacts if p.new_problems_only]

    @property
    def twin_became_invalid(self):
        return [t.source_id for t in self.twin_impacts if t.became_invalid]

    @property
    def dag_broke(self):
        return self.old_dag_valid and not self.new_dag_valid

    @property
    def clean(self):
        """True iff nothing got WORSE. A shell that was already broken and
        stays equally broken is not a regression; a previously-clean shell
        that stays clean is not either. Only new problems count."""
        return (not self.standoff_regressions and not self.new_connector_or_outline_problems
                and not self.twin_became_invalid and not self.dag_broke)

    def summary_lines(self):
        if not self.panel_impacts and not self.resolve_errors:
            return ["no authored panels — nothing to re-validate"]
        lines = []
        if self.resolve_errors:
            lines.append(f"RESOLVE ERRORS: {'; '.join(self.resolve_errors)}")
        if self.clean:
            lines.append("no regressions — every panel that fit before still fits, "
                         "no new connector/twin problems, DAG unchanged")
        else:
            lines.append("REGRESSIONS FOUND — do not adopt this shape without reviewing these:")
        for p in self.panel_impacts:
            if p.standoff_regressed:
                lines.append(f"  ⚠ {p.panel_id}: standoff {p.old_standoff_mm:.2f} -> "
                             f"{p.new_standoff_mm:.2f} mm — now EXCEEDS tolerance "
                             f"(was within it)")
            elif not p.now_within_tolerance:
                lines.append(f"  · {p.panel_id}: standoff {p.new_standoff_mm:.2f} mm — "
                             f"still exceeds tolerance (was already {p.old_standoff_mm:.2f})")
            if p.new_problems_only:
                lines.append(f"  ⚠ {p.panel_id}: new problem(s): "
                             f"{'; '.join(p.new_problems_only)}")
        for t in self.twin_impacts:
            if t.became_invalid:
                lines.append(f"  ⚠ {t.source_id}: mirror twin now INVALID — "
                             f"{'; '.join(t.new_reasons)}")
        def _stack(valid, mm):
            return f"{mm:.2f} mm" if valid else "undefined (DAG invalid — stacking order isn't defined)"
        lines.append(f"max stack height: {_stack(self.old_dag_valid, self.old_max_stack_mm)} -> "
                     f"{_stack(self.new_dag_valid, self.new_max_stack_mm)}")
        lines.append(f"DAG: {'valid' if self.old_dag_valid else 'INVALID (' + self.old_dag_error + ')'} "
                     f"-> {'valid' if self.new_dag_valid else 'INVALID (' + self.new_dag_error + ')'}"
                     + ("  ⚠ BROKE" if self.dag_broke else ""))
        return lines


def _resolve_and_stack(chart, classes, authored):
    placed, errors = resolve_layout(chart, classes, authored)
    try:
        report = analyze_layering(chart, placed)
        return placed, errors, report.max_stack_mm, True, None
    except LayeringError as exc:
        return placed, errors, float("nan"), False, str(exc)


def report_shape_change_impact(old_params, new_params, classes, authored,
                               tolerance_mm=STANDOFF_TOLERANCE_MM, samples=9):
    """The re-validation this module exists for. old_params/new_params are
    ShellParams (build a chart from each); classes is panels.yaml's dict;
    authored is layout.yaml's AuthoredPanel list (theta/s/rotation FIXED —
    never touched here). Returns a ShapeChangeReport; nothing is written,
    nothing is re-seated."""
    old_model, new_model = ShellModel(old_params), ShellModel(new_params)
    old_coords, new_coords = ShellCoords(old_model), ShellCoords(new_model)
    old_chart = SurfaceChart(old_model, old_coords)
    new_chart = SurfaceChart(new_model, new_coords)

    old_placed, old_errors, old_stack, old_dag_ok, old_dag_err = _resolve_and_stack(
        old_chart, classes, authored)
    new_placed, new_errors, new_stack, new_dag_ok, new_dag_err = _resolve_and_stack(
        new_chart, classes, authored)
    resolve_errors = tuple(sorted(set(old_errors) | set(new_errors)))

    old_by_id = {p.panel_id: p for p in old_placed}
    new_by_id = {p.panel_id: p for p in new_placed}

    panel_impacts, twin_impacts = [], []
    for entry in authored:
        cls = classes.get(entry.class_id)
        if cls is None:
            continue   # already reported in resolve_errors
        old_so = seat_standoff(old_coords, old_chart, cls.outline_w, cls.outline_h,
                               entry.theta, entry.s, samples, entry.rotation)
        new_so = seat_standoff(new_coords, new_chart, cls.outline_w, cls.outline_h,
                               entry.theta, entry.s, samples, entry.rotation)
        old_fit, new_fit = old_so <= tolerance_mm, new_so <= tolerance_mm
        old_p, new_p = old_by_id.get(entry.panel_id), new_by_id.get(entry.panel_id)
        old_problems = old_p.problems if old_p else ()
        new_problems = new_p.problems if new_p else ()
        panel_impacts.append(PanelImpact(
            panel_id=entry.panel_id, is_twin=False,
            old_standoff_mm=old_so, new_standoff_mm=new_so,
            was_within_tolerance=old_fit, now_within_tolerance=new_fit,
            standoff_regressed=old_fit and not new_fit,
            old_problems=old_problems, new_problems=new_problems,
            new_problems_only=tuple(p for p in new_problems if p not in old_problems),
            resolved_problems_only=tuple(p for p in old_problems if p not in new_problems),
        ))
        if entry.mirrored:
            twin_id = f"{entry.panel_id}~twin"
            old_twin, new_twin = old_by_id.get(twin_id), new_by_id.get(twin_id)
            if old_twin is not None and new_twin is not None:
                twin_impacts.append(TwinImpact(
                    source_id=entry.panel_id,
                    old_valid=old_twin.valid, new_valid=new_twin.valid,
                    became_invalid=old_twin.valid and not new_twin.valid,
                    became_valid=(not old_twin.valid) and new_twin.valid,
                    new_reasons=new_twin.problems if not new_twin.valid else (),
                ))

    return ShapeChangeReport(
        panel_impacts=panel_impacts, twin_impacts=twin_impacts,
        old_max_stack_mm=old_stack, new_max_stack_mm=new_stack,
        old_dag_valid=old_dag_ok, old_dag_error=old_dag_err,
        new_dag_valid=new_dag_ok, new_dag_error=new_dag_err,
        resolve_errors=resolve_errors,
    )


def _params_from_arg(spec):
    """'dress_params' (or empty) -> the plain committed default; a path ->
    that shape.yaml applied on top of dress_params()."""
    if not spec or spec == "dress_params":
        return dress_params()
    from shape_state import build_params_from_shape, load_shape
    saved = replace(load_shape(Path(spec)), neckline={})
    base = dress_params()
    probe = ShellModel(base)
    return build_params_from_shape(base, saved, probe.z_bottom, probe.z_top)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--old", default="dress_params",
                    help="old shape: 'dress_params' (default, the committed baseline) or a shape.yaml path")
    ap.add_argument("--new", required=True, help="new shape: a shape.yaml path")
    ap.add_argument("--layout", default=str(HERE / "layout.yaml"))
    ap.add_argument("--tolerance-mm", type=float, default=STANDOFF_TOLERANCE_MM)
    args = ap.parse_args()

    old_params = _params_from_arg(args.old)
    new_params = _params_from_arg(args.new)
    classes = load_panel_classes(HERE / "panels.yaml")
    layout_path = Path(args.layout)
    authored = load_layout(layout_path) if layout_path.exists() else []

    report = report_shape_change_impact(old_params, new_params, classes, authored,
                                        tolerance_mm=args.tolerance_mm)
    for line in report.summary_lines():
        print(line)
    sys.exit(0 if report.clean else 1)


if __name__ == "__main__":
    main()
