#!/usr/bin/env python3
"""Full console report: shell, coordinates round-trip, grid, curvature /
max-class distribution (old vs new library), tolerance sweep, facets,
mirroring, layering, coverage, electrical rollup, and the honest list of
still-unverified datasheet fields.

Run:  python3 tools/dress-shell/analysis_report.py [--sweep]
(the sweep table always prints; --sweep is accepted for compatibility)
"""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from coords import ShellCoords
from curvature import (STANDOFF_TOLERANCE_MM, TOLERANCE_SWEEP_MM, analyze_cells, seat_standoff,
                       class_distribution, meridional_radius_profile,
                       required_radius, tolerance_sweep)
from facets import apply_facets, facet_panels
from grid import GridSpec, ShellGrid
from layering import LayeringError, analyze_layering, uncovered_shell_area
from layout import (SurfaceChart, asymmetry_summary, load_layout,
                    resolve_layout)
from panels import load_panel_classes, unverified_fields
from shell import ShellModel, ShellParams, build_meshes
from test_coords import named_points

HERE = Path(__file__).resolve().parent

# Previous run (circular sections on the confirmed profile), for
# comparison against the elliptical-section skirt.
PREVIOUS_RUN_DISTRIBUTION = "p213 80% | p370 0% | none 20%  (circular sections)"


def electrical_rollup(placed):
    """Informational only — no circuit design. Shared SPI bus (SCK + MOSI)
    plus per-panel CS, DC, RST, BUSY."""
    valid = [p for p in placed if p.valid]
    counts, cost, unknown_cost = {}, 0.0, []
    refresh_total, unknown_refresh = 0.0, []
    for p in valid:
        counts[p.cls.class_id] = counts.get(p.cls.class_id, 0) + 1
        if p.cls.price_usd is None:
            unknown_cost.append(p.panel_id)
        else:
            cost += p.cls.price_usd
        if p.cls.refresh_s is None:
            unknown_refresh.append(p.panel_id)
        else:
            refresh_total += p.cls.refresh_s
    return {
        "counts": counts,
        "total_panels": len(valid),
        "cost_usd": round(cost, 2),
        "cost_unknown_panels": unknown_cost,
        "control_lines": 2 + 4 * len(valid),
        "control_lines_formula": "2 shared (SCK, MOSI) + 4 per panel (CS, DC, RST, BUSY)",
        "sequential_refresh_s": round(refresh_total, 1),
        "refresh_unknown_panels": unknown_refresh,
    }


def main():
    model = ShellModel(ShellParams())
    coords = ShellCoords(model)
    chart = SurfaceChart(model, coords)
    classes = load_panel_classes(HERE / "panels.yaml")
    grid = ShellGrid(chart, GridSpec(10.0, 25.0))
    tol = STANDOFF_TOLERANCE_MM

    p = model.params
    print("DRESS SHELL — full pipeline report (confirmed skirt profile)")
    print()
    print(f"profile       r(u) = a(1-(u/b)^n)^(1/n): a {model.hem_radius:.2f}, "
          f"n {p.dome_n:g}, SOLVED b = {model.b_param:.2f} mm")
    print(f"              waist r {model.waist_radius:.2f}, drop {p.drop:g}, "
          f"s 0..{coords.s_max:.2f} mm")
    print(f"waist         tangent {model.waist_tangent_deg():.2f} deg from vertical "
          f"(dr/du {float(model.dr_super(0.0)):.4f}); CREASE — bodice side "
          f"unspecified, crease angle pending; fillet_radius {p.fillet_radius:g}")
    print(f"seam band     +-{p.waist_band_halfwidth:g} mm keep-out about s = 0; "
          f"cable bus; tails terminate at the band edge")
    aw, bw = (float(v) for v in model.semi_axes(0.0))
    ah, bh = (float(v) for v in model.semi_axes(model.z_bottom))
    print(f"sections      ELLIPTICAL, equal-arc theta: waist {aw:.2f} x {bw:.2f} "
          f"(k {p.waist_section_ratio:g}) -> hem {ah:.2f} x {bh:.2f} "
          f"(k {p.skirt_hem_ratio:g}, UNVERIFIED), blend '{p.ratio_blend}'")
    try:
        from bodice import BodiceSections
        wrow = BodiceSections().rows[0]
        print(f"waist match   residual vs bodice waist ellipse: "
              f"{model.waist_match_residual_mm(wrow['a'], wrow['b']):.2e} mm "
              f"(zero by construction)")
    except Exception as exc:
        print(f"waist match   NOT COMPUTED: {exc}")
    from shell import solve_semi_axes as _ssa
    print(f"hem widths    (for choosing skirt_hem_ratio against the photos)")
    for k in (1.0, 1.15, 1.3):
        ka, kb = _ssa(p.hem_circumference, k)
        print(f"                k={k:<5g} front-view width {2*float(ka):.0f} mm, "
              f"side-view depth {2*float(kb):.0f} mm")
    print(f"meridians     true arc waist->hem: CF "
          f"{model.true_meridian_arc(0.0, 0.0):.1f} mm, side "
          f"{model.true_meridian_arc(90.0, 0.0):.1f} mm; GRID RING PARAMETER "
          f"is the r_eq meridian arc ({coords.s_max:.1f} mm) — true s(theta,u) "
          f"is derived/reported, never the ring parameter")
    area_m2 = model.surface_area_mm2() / 1e6
    a213 = classes["p213"].active_area          # mm^2
    n100 = math.ceil(area_m2 * 1e6 / a213)
    n33 = math.ceil(0.33 * area_m2 * 1e6 / a213)
    price = classes["p213"].price_usd or 0.0
    print(f"surface area  {area_m2:.4f} m^2")
    print(f"coverage cost 100% at 2.13\" active ({a213:.0f} mm^2): {n100} panels, "
          f"${n100 * price:,.2f} list")
    print(f"              33%: {n33} panels, ${n33 * price:,.2f} list")
    mer = meridional_radius_profile(model, coords)
    print(f"meridional R  min {mer['min_radius_mm']:.0f} mm at s {mer['at_s_mm']:.0f} "
          f"(outside the {mer['singular_band_mm']:g} mm hem band)")
    if mer["hem_singular"]:
        print(f"              HEM SINGULARITY (n = {p.dome_n:g} < 2): r'' diverges at "
              f"the hem — property of the superellipse, not an error; display "
              f"clamped (band min {mer['band_min_radius_mm']:.0f} mm), seating "
              f"decisions use footprint sampling only")

    worst = 0.0
    for name, (theta, s) in named_points(coords).items():
        f = coords.forward(theta, s)
        t2, s2 = coords.inverse(f["position"], check_mm=0.01)
        p2 = coords.forward(float(t2), float(s2))["position"]
        worst = max(worst, float(np.linalg.norm(p2 - f["position"])))
    print(f"round-trip    worst |d_pos| over the four named sites: {worst:.2e} mm")

    st = grid.cell_stats()
    print(f"grid          {st['count']} cells ({grid.spec.dtheta} deg x "
          f"{grid.spec.ds} mm), width {st['width_min']:.1f}-{st['width_max']:.1f} mm "
          f"(equal-arc: uniform around each ring)")

    p213 = classes["p213"]
    print()
    print("p213 unseatable band near the sides (footprint sampling; the piece "
          "seam lives at +-90)")
    for s_lvl in (45.0, 100.0, 180.0, 260.0, 340.0):
        edge = None
        for th in np.arange(90.0, 29.0, -2.0):
            so = seat_standoff(coords, chart, p213.outline_w, p213.outline_h,
                               float(th), s_lvl)
            if so <= tol:
                edge = th + 2.0
                break
        print(f"  s = {s_lvl:>5.0f}: unseatable |theta| >= "
              f"{edge if edge is not None else '<= 30'} deg")

    analyses = analyze_cells(coords, chart, grid, classes, tol, samples=7)
    dist = class_distribution(analyses)
    total = sum(dist.values())
    seatable = sorted((c for c in classes.values() if not c.requires_facet),
                      key=lambda c: c.outline_area)
    pct = lambda n: f"{100.0 * n / total:.0f}%"
    parts = [f"{c.class_id} {pct(dist.get(c.class_id, 0))}" for c in seatable]
    parts.append(f"none {pct(dist.get(None, 0))}")
    print()
    print(f"MAX CLASS     skirt: {' | '.join(parts)}   (tolerance {tol} mm)")
    print(f"              previous run was: {PREVIOUS_RUN_DISTRIBUTION}")
    print(f"              (p750 excluded from seating: requires_facet)")

    print()
    print(f"tolerance sweep (UNVALIDATED default {tol} mm — distributions if "
          f"the real number differs)")
    for t, d in tolerance_sweep(analyses, classes, TOLERANCE_SWEEP_MM).items():
        row = [f"{c.class_id} {pct(d.get(c.class_id, 0))}" for c in seatable]
        row.append(f"none {pct(d.get(None, 0))}")
        mark = "  <- default" if t == tol else ""
        print(f"  {t:>4.1f} mm   {' | '.join(row)}{mark}")

    print()
    print("required local min curvature radius per class (chord model, "
          f"{tol} mm tolerance)")
    shell_rmin_max = max(a.r_min for a in analyses if np.isfinite(a.r_min))
    for c in sorted(classes.values(), key=lambda c: c.outline_area):
        rr = required_radius(c, tol)
        can = sum(1 for a in analyses
                  if a.standoff_by_class.get(c.class_id, float("inf")) <= tol)
        note = (f"seats in {can}/{total} cells" if not c.requires_facet
                else "requires_facet: never conformed, facet only")
        print(f"  {c.class_id}: needs R >= {rr['across_width']:.0f} mm across width, "
              f">= {rr['across_height']:.0f} mm along height — {note}")
    print(f"  flattest cell on the shell: r_min {shell_rmin_max:.0f} mm")

    authored = load_layout(HERE / "layout.yaml")
    placed, errors = resolve_layout(chart, classes, authored)
    pairs, aworst, amean = asymmetry_summary(placed)
    print()
    print(f"layout        {len(authored)} authored -> {len(placed)} placed "
          f"({sum(1 for p in placed if p.is_twin)} twins, "
          f"{sum(1 for p in placed if not p.valid)} invalid)")
    print(f"mirroring     outline asymmetry worst {aworst:.4f} mm, "
          f"mean {amean:.4f} mm over {len(pairs)} pairs")
    for e in errors:
        print(f"  ! {e}")

    # facets: deform the real mesh and report silhouette cost
    if facet_panels(placed):
        V = np.concatenate([build_meshes(model)[n][0] for n in ("FRONT", "BACK")])
        th, s = coords.inverse(V, check_mm=None)
        _, reports = apply_facets(chart, coords, V, np.stack([th, s], -1), placed)
        for r in reports:
            print(f"facet         {r.panel_id} @ (theta {r.theta:g}, s {r.s:g}): "
                  f"shell deviation max {r.max_deviation_mm:.2f} mm, "
                  f"rms {r.rms_deviation_mm:.2f} mm over {r.affected_vertices} vertices")

    try:
        rep = analyze_layering(chart, placed)
        print(f"layering      {len(rep.overlaps)} overlap pair(s), max stack "
              f"{rep.max_stack_mm:.1f} mm, visible active "
              f"{rep.total_visible / 100:.1f} / {rep.total_active / 100:.1f} cm2")
        for pid, cover in rep.buried_connectors.items():
            print(f"  ! {pid}: connector buried under {', '.join(cover)}")
    except LayeringError as exc:
        print(f"layering      ERROR: {exc}")

    unc, tot = uncovered_shell_area(chart, placed)
    print(f"coverage      shell {tot / 100:.0f} cm2, uncovered {100 * unc / tot:.1f}%")

    el = electrical_rollup(placed)
    print()
    print("electrical (informational)")
    print(f"  panels        {el['total_panels']} total: "
          + ", ".join(f"{k} x{v}" for k, v in sorted(el["counts"].items())))
    print(f"  cost          ${el['cost_usd']:.2f} at list price"
          + (f" (+{len(el['cost_unknown_panels'])} unknown)" if el["cost_unknown_panels"] else ""))
    print(f"  control lines {el['control_lines']}  ({el['control_lines_formula']})")
    print(f"  full refresh  {el['sequential_refresh_s']:.0f} s sequential"
          + (f", EXCLUDING {len(el['refresh_unknown_panels'])} panel(s) with "
             f"unverified refresh: {', '.join(el['refresh_unknown_panels'])}"
             if el["refresh_unknown_panels"] else ""))

    gaps = unverified_fields(classes)
    print()
    print(f"UNVERIFIED DATASHEET FIELDS ({len(gaps)}) — still guesses, not facts")
    for cid, field, note in gaps:
        print(f"  {cid}.{field}: {note[:100]}")


if __name__ == "__main__":
    main()
