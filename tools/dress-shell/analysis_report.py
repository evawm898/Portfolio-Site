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
from shell import ShellModel, ShellParams, build_meshes, dress_params
from test_coords import named_points

HERE = Path(__file__).resolve().parent

# Previous run (skirt only, constant k = 1.5), for comparison against the
# full dress (skirt + bodice with the given neckline).
PREVIOUS_RUN_DISTRIBUTION = "p213 79% | p370 0% | none 21%  (skirt only, k=1.5)"


def bodice_area_accounting(model, n_theta=720, n_v=250):
    """Gross bodice area (below the neckline edge) and usable area after
    subtracting the neckline keep-out strip and the waist seam band.
    The +-90 seams are lines (zero width) — they bound placement but
    remove no area; noted in the printout."""
    neck = model.neckline
    band = model.params.waist_band_halfwidth
    dtheta = math.radians(360.0 / n_theta)
    thetas = np.linspace(-180.0, 180.0, n_theta, endpoint=False) + 180.0 / n_theta
    gross = usable = 0.0
    for th in thetas:
        edge = float(neck.height(th))
        floor = edge - neck.params.keepout_mm
        v_edges = np.linspace(0.0, edge, n_v + 1)
        vm = 0.5 * (v_edges[1:] + v_edges[:-1])
        dv = np.diff(v_edges)
        r = np.asarray(model.mean_radius(vm))
        g = np.sqrt(1.0 + np.asarray(model.mean_slope(vm)) ** 2)
        w = r * dtheta * g * dv
        gross += float(w.sum())
        usable += float(w[(vm >= band) & (vm <= floor)].sum())
    return gross, usable


def usable_bodice_cell_indices(chart, grid):
    """Cells lying FULLY inside the usable bodice region: above the waist
    band, below the neckline keep-out floor at both theta corners."""
    keep = set()
    neck = chart.neckline
    band = chart.band_halfwidth
    for cell in grid.cells:
        if cell.s1 > 1e-9:              # skirt cell
            continue
        v_top = chart.height_of_s(cell.s0)
        v_bot = chart.height_of_s(cell.s1)
        if v_bot < band - 1e-9:
            continue
        floor0 = float(neck.keepout_floor(cell.theta0)) if neck else 0.0
        floor1 = float(neck.keepout_floor(cell.theta1)) if neck else 0.0
        if v_top <= min(floor0, floor1) + 1e-9:
            keep.add(cell.index)
    return keep


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
    model = ShellModel(dress_params())
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
          f"(dr/du {float(model.dr_super(0.0)):.4f}); CREASE angle "
          f"{model.crease_angle_deg():.2f} deg (bodice launches vertically — "
          f"monotone interpolant); fillet_radius {p.fillet_radius:g}")
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
    def _true_arc(theta_deg):
        # top edge (neckline at this azimuth) down to the hem, on-shell only
        z_hi = float(model.z_top_at(theta_deg))
        zs = np.linspace(z_hi, model.z_bottom, 1201)
        pts = model.point(np.full(zs.shape, math.radians(theta_deg)), zs)
        return float(np.linalg.norm(np.diff(pts, axis=0), axis=1).sum())
    print(f"meridians     true arc top edge->hem: CF {_true_arc(0.0):.1f} mm "
          f"(edge at z 250), side {_true_arc(90.0):.1f} mm (edge at z 205); "
          f"GRID RING PARAMETER is the r_eq meridian arc "
          f"({coords.s_max - coords.s_min:.1f} mm CF span) — true s(theta,u) "
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
    print(f"MAX CLASS     dress: {' | '.join(parts)}   (tolerance {tol} mm, "
          f"{total} shell cells; {sum(a.off_shell for a in analyses)} cells "
          f"above the neckline excluded)")
    print(f"              previous run was: {PREVIOUS_RUN_DISTRIBUTION}")
    print(f"              (p750 excluded from seating: requires_facet)")

    if model.neckline is not None:
        nk = model.neckline.params
        print()
        print(f"NECKLINE      CF {nk.cf_height:g} / side {nk.side_height:g} mm "
              f"(GIVEN); shoulder theta {nk.shoulder_theta:g} deg, plateau "
              f"flatness {nk.plateau_flatness:g}; keep-out {nk.keepout_mm:g} mm "
              f"below the edge; SHELL TOPS OUT AT THE CURVE")
        print(f"              tangent zero at CF and at the side by "
              f"construction; monotone CF->side asserted at build")
        gross, usable = bodice_area_accounting(model)
        print(f"bodice area   gross {gross / 100:.0f} cm2 (below the edge) -> "
              f"usable {usable / 100:.0f} cm2 after neckline keep-out + waist "
              f"band ({100 * usable / gross:.0f}%); the +-90 seams are lines "
              f"(zero area), they bound placement only")
        keep = usable_bodice_cell_indices(chart, grid)
        b_an = [a for a in analyses if a.cell_index in keep]
        b_dist = class_distribution(b_an)
        b_tot = max(sum(b_dist.values()), 1)
        b_parts = [f"{c.class_id} {100.0 * b_dist.get(c.class_id, 0) / b_tot:.0f}%"
                   for c in seatable]
        b_parts.append(f"none {100.0 * b_dist.get(None, 0) / b_tot:.0f}%")
        print(f"              usable-region max class ({len(b_an)} cells fully "
              f"inside): {' | '.join(b_parts)}")

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
