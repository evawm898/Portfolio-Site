#!/usr/bin/env python3
"""Full console report: shell, coordinates round-trip, grid, curvature /
max-class distribution, layout, mirroring, layering, coverage.

Run:  python3 tools/dress-shell/analysis_report.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from coords import ShellCoords
from curvature import analyze_cells, class_distribution
from grid import GridSpec, ShellGrid
from layering import LayeringError, analyze_layering, uncovered_shell_area
from layout import (SurfaceChart, asymmetry_summary, load_layout,
                    resolve_layout)
from panels import load_panel_classes
from shell import ShellModel, ShellParams
from test_coords import named_points

HERE = Path(__file__).resolve().parent
TOLERANCE = 2.0


def main():
    model = ShellModel(ShellParams())
    coords = ShellCoords(model)
    chart = SurfaceChart(model, coords)
    classes = load_panel_classes(HERE / "panels.yaml")
    grid = ShellGrid(chart, GridSpec(10.0, 25.0))

    print("DRESS SHELL — full pipeline report (milestone 2)")
    print()
    print(f"shell         z {model.z_bottom:.0f}..{model.z_top:.0f} mm, "
          f"s {coords.s_min:.1f}..{coords.s_max:.1f} mm (0 = waist)")

    worst = 0.0
    for name, (theta, s) in named_points(coords).items():
        f = coords.forward(theta, s)
        t2, s2 = coords.inverse(f["position"], check_mm=0.01)
        p2 = coords.forward(float(t2), float(s2))["position"]
        worst = max(worst, float(np.linalg.norm(p2 - f["position"])))
    print(f"round-trip    worst |d_pos| over waist/bust apex/hem edge/max flare: "
          f"{worst:.2e} mm")

    st = grid.cell_stats()
    print(f"grid          {st['count']} cells ({grid.spec.dtheta} deg x "
          f"{grid.spec.ds} mm), physical width {st['width_min']:.1f}-"
          f"{st['width_max']:.1f} mm (mean {st['width_mean']:.1f}, "
          f"spread {st['width_spread_pct']:.0f}%)")

    analyses = analyze_cells(coords, chart, grid, classes, TOLERANCE, samples=7)
    dist = class_distribution(analyses)
    total = sum(dist.values())
    by_size = sorted(classes.values(), key=lambda c: c.outline_area)
    parts = [f"{c.class_id} {100.0 * dist.get(c.class_id, 0) / total:.0f}%"
             for c in by_size] + [f"none {100.0 * dist.get(None, 0) / total:.0f}%"]
    print(f"max class     {' | '.join(parts)}  (tolerance {TOLERANCE} mm)")

    authored = load_layout(HERE / "layout.yaml")
    placed, errors = resolve_layout(chart, classes, authored)
    pairs, aworst, amean = asymmetry_summary(placed)
    n_twins = sum(1 for p in placed if p.is_twin)
    n_invalid = sum(1 for p in placed if not p.valid)
    print(f"layout        {len(authored)} authored -> {len(placed)} placed "
          f"({n_twins} derived twins, {n_invalid} invalid)")
    print(f"mirroring     outline asymmetry worst {aworst:.2f} mm, "
          f"mean {amean:.3f} mm over {len(pairs)} pairs")
    for e in errors:
        print(f"  ! {e}")

    try:
        rep = analyze_layering(chart, placed)
        print(f"layering      {len(rep.overlaps)} overlap pair(s), "
              f"max stack {rep.max_stack_mm:.1f} mm, visible active "
              f"{rep.total_visible / 100:.1f} / {rep.total_active / 100:.1f} cm2")
        for pid, cover in rep.buried_connectors.items():
            print(f"  ! {pid}: connector buried under {', '.join(cover)}")
    except LayeringError as exc:
        print(f"layering      ERROR: {exc}")

    unc, tot = uncovered_shell_area(chart, placed)
    print(f"coverage      shell {tot / 100:.0f} cm2, uncovered "
          f"{100.0 * unc / tot:.1f}%")

    print()
    print("panels")
    for p in placed:
        mark = "" if p.valid else "  INVALID: " + p.problems[0]
        kind = "twin" if p.is_twin else "src "
        print(f"  {p.panel_id:<16} {p.cls.class_id:<3} {kind} "
              f"theta {p.theta:>8.2f}  s {p.s:>7.1f}  rot {p.rotation:>3}  "
              f"layer {p.layer}{mark}")


if __name__ == "__main__":
    main()
