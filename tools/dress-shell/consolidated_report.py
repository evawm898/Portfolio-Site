#!/usr/bin/env python3
"""CONSOLIDATED-SPEC REPORT (spec section 7) — every number the spec asks
for, computed from the committed model. Run:

    cd tools/dress-shell && python3 consolidated_report.py

Sections: solved sections vs discarded estimates; neckline v3 checks;
armhole solve + sensitivities; fillet construction + radius sweep;
top-edge binding lengths per piece; per-piece distributions and usable
areas after ALL keep-outs; CF clearance; unseatable strips; seam-at-
armhole vs seam-at-90; panel costs; standing assumptions (section 8).
"""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from bodice import solve_theta_armhole
from coords import ShellCoords
from curvature import (STANDOFF_TOLERANCE_MM, analyze_cells,
                       class_distribution, seat_standoff)
from fillet import FilletParams
from grid import GridSpec, ShellGrid
from layout import SurfaceChart, wrap180
from panels import load_panel_classes, unverified_fields
from shell import ShellModel, ShellParams, dress_params, dress_depth

HERE = Path(__file__).resolve().parent
TOL = STANDOFF_TOLERANCE_MM


def usable_area(model, chart, piece=None, segment=None, n_theta=1440, n_v=400):
    """Shell area after ALL keep-outs: neckline strip (keepout_mm), the
    DERIVED waist seam band (fillet zone), and the armhole seam band.
    piece: 'FRONT'/'BACK'/None(all); segment: 'bodice'/'skirt'/None."""
    split = chart.split_theta
    band_lo_v = chart.height_of_s(chart.band_s_hi)   # skirt side (v < 0)
    band_hi_v = chart.height_of_s(chart.band_s_lo)   # bodice side (v > 0)
    arm = chart.armhole_band_halfwidth
    thetas = np.linspace(-180.0, 180.0, n_theta, endpoint=False) + 180.0 / n_theta
    dtheta = math.radians(360.0 / n_theta)
    total = 0.0
    for th in thetas:
        lam = wrap180(th)
        on_front = abs(lam) < split
        if piece == "FRONT" and not on_front:
            continue
        if piece == "BACK" and on_front:
            continue
        v_hi = float(model.z_top_at(th)) - (model.neckline.params.keepout_mm
                                            if model.neckline else 0.0)
        v_lo = float(model.z_bottom)
        if segment == "bodice":
            v_lo = 0.0
        elif segment == "skirt":
            v_hi = min(v_hi, 0.0)
        if v_hi <= v_lo:
            continue
        v_edges = np.linspace(v_lo, v_hi, n_v + 1)
        vm = 0.5 * (v_edges[1:] + v_edges[:-1])
        dv = np.diff(v_edges)
        r = np.asarray(model.mean_radius(vm))
        g = np.sqrt(1.0 + np.asarray(model.mean_slope(vm)) ** 2)
        w = r * dtheta * g * dv
        keep = ~((vm > band_lo_v) & (vm < band_hi_v))     # waist band out
        # armhole band: lateral mm distance to the nearer seam
        seam_gap_deg = split - abs(lam) if on_front else abs(lam) - split
        gap_mm = np.radians(seam_gap_deg) * r
        keep &= gap_mm >= arm
        total += float(w[keep].sum())
    return total


def top_edge_lengths(model, n=4000):
    """3D arc length of the physical top edge (the neckline curve ON the
    shell) per piece — the edge-binding lengths."""
    split = model.split_theta
    out = {}
    for name, (t0, t1) in (("FRONT", (-split, split)),
                           ("BACK", (split, 360.0 - split))):
        th = np.linspace(t0, t1, n)
        z = np.asarray(model.neckline.height(th))
        pts = np.asarray(model.point(np.radians(th), z))
        seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
        out[name] = float(seg.sum())
    return out


def piece_distributions(chart, analyses, grid):
    split = chart.split_theta
    front, back = [], []
    for cell, a in zip(grid.cells, analyses):
        (front if abs(wrap180(cell.theta_c)) < split else back).append(a)
    return class_distribution(front), class_distribution(back)


def fmt_dist(dist):
    total = sum(dist.values())
    parts = []
    for k in sorted(dist, key=lambda x: (x is None, x)):
        parts.append(f"{k or 'none'} {dist[k]} ({100.0 * dist[k] / total:.0f}%)")
    return "  ".join(parts) + f"   [{total} cells]"


def unseatable_strips(chart, coords, cls, v, split, step=1.0):
    """Contiguous theta ranges at height v where the class cannot seat at
    rotation 0 within tolerance (footprint sampling)."""
    s = float(coords.s_of_z(v))
    bad, cur = [], None
    for th in np.arange(-180.0, 180.0, step):
        so = seat_standoff(coords, chart, cls.outline_w, cls.outline_h,
                           float(th), s, samples=7)
        if not (so <= TOL):
            if cur is None:
                cur = [th, th]
            else:
                cur[1] = th
        elif cur is not None:
            bad.append(tuple(cur)); cur = None
    if cur is not None:
        bad.append(tuple(cur))
    return bad


def main():
    params = dress_params()
    model = ShellModel(params)
    coords = ShellCoords(model)
    chart = SurfaceChart(model, coords)
    classes = load_panel_classes(HERE / "panels.yaml")
    d = params.depth_curve
    neck = model.neckline

    print("=" * 72)
    print("CONSOLIDATED BODICE SPEC — SECTION 7 REPORT (committed model)")
    print("=" * 72)

    # 1 — solved sections vs the discarded estimates
    aw, bw = d.waist_section
    print("\n[1] SOLVED SECTIONS (ratios are OUTPUTS; the old estimates are dead)")
    print(f"    waist ring    z {d.waist_ring_z:+.2f}: {aw:.2f} x {bw:.2f} mm, "
          f"ratio {aw / bw:.3f}   (discarded estimate: 1.5)")
    a203, b203 = (float(v) for v in model.semi_axes(203.2))
    print(f"    bust  v=203.2: {a203:.2f} x {b203:.2f} mm, ratio "
          f"{a203 / b203:.3f}   (discarded estimate: 1.875)")
    a254, b254 = (float(v) for v in model.semi_axes(254.0)) \
        if model.z_top >= 254.0 else (None, None)
    aab, bab = (float(v) for v in model.semi_axes(min(model.z_top, 240.0)))
    print(f"    top   v=240.0: {aab:.2f} x {bab:.2f} mm, ratio {aab / bab:.3f}"
          f"   (above-bust anchor 812.8 @ 254 carries ratio "
          f"{d.bust_ratio_output:.3f}; discarded estimate: 2.0)")
    print(f"    bodice depth continuation: b_bust {d.b_bust:.2f} mm "
          f"(monotone crest, virtual-rebased trace)")

    # 2 — neckline v3
    print("\n[2] NECKLINE v3 (CF 220 / peak 240 @ 82 / side 190 / CB 145)")
    th = np.linspace(0, 180, 3601)
    h = np.asarray(neck.height(th))
    print(f"    heights: CF {float(neck.height(0)):.1f}  peak "
          f"{float(neck.height(82)):.1f}  side {float(neck.height(90)):.1f}  "
          f"CB {float(neck.height(180)):.1f}")
    print(f"    drop by 30 deg past peak: {neck.drop_fraction(30.0) * 100:.1f}% "
          f"(spec: ~two-thirds)")
    rise = h[(th >= 0) & (th <= 82)]
    desc = h[(th >= 82)]
    print(f"    per-segment monotone: rise {'OK' if np.all(np.diff(rise) >= -1e-9) else 'BROKEN'}, "
          f"descent {'OK' if np.all(np.diff(desc) <= 1e-9) else 'BROKEN'}; "
          f"peak departure slope {neck.peak_departure_slope:.2f} mm/deg (steepest first)")
    print(f"    CB ease: |slope(180-)| = {abs(float(neck.slope(179.99))):.4f} "
          f"mm/deg (zero-tangent ease, last {neck.params.cb_ease_deg:g} deg only)")
    cf_edge = float(neck.height(0)) - neck.params.keepout_mm
    print(f"    CF usable edge {cf_edge:.1f} vs bust apex 203.2: clearance "
          f"{cf_edge - 203.2:.1f} mm — under 11 mm, said plainly")

    # 3 — armhole
    print("\n[3] ARMHOLE (solved from the 360 mm across-back tape at v = 190)")
    r = solve_theta_armhole(model)
    print(f"    theta_armhole = {r['theta_armhole']:.2f} deg "
          f"(section P(190) = {r['section_perimeter']:.1f} mm; "
          f"user estimate 101 came from linear-interp P = 824)")
    print(f"    straight chord would need {r['straight_chord_mm']:.1f} mm — "
          f"the tape ON the surface differs by {abs(r['chord_vs_arc_mm']):.1f} mm")
    base = r["theta_armhole"]
    s_arc = [solve_theta_armhole(model, back_arc_mm=b)["theta_armhole"] - base
             for b in (345.0, 375.0)]
    s_v = [solve_theta_armhole(model, v=v)["theta_armhole"] - base
           for v in (170.0, 210.0)]
    print(f"    sensitivity: arc +-15 mm -> {s_arc[0]:+.2f}/{s_arc[1]:+.2f} deg; "
          f"height +-20 mm -> {s_v[0]:+.2f}/{s_v[1]:+.2f} deg (height dominates)")
    print(f"    ordering: peak 82 < side 90 < armhole {base:.1f}  "
          f"{'OK' if 82 < 90 < base else 'BROKEN'}")

    # 4 — fillet construction
    pf, bf = d.p_fillet, d.b_fillet
    print("\n[4] WAIST FILLET (R = 25 mm, conic; THE WAIST IS A FILLET)")
    print(f"    virtual waist circumference {pf.virtual_waist_circumference:.2f} mm "
          f"(virtual apex r_eq {pf.virtual_waist_circumference / math.tau:.2f} mm); "
          f"closest approach = {d.waist_ring_circumference:.4f} mm at "
          f"z {d.waist_ring_z:+.2f} (609.6 preserved)")
    print(f"    P-fillet zone z [{pf.z1:.2f}, {pf.z2:.2f}]; depth fillet "
          f"R_b {d.depth_radius_mm:.2f} mm, zone z [{bf.z1:.2f}, {bf.z2:.2f}]")
    print(f"    G1 residual {pf.g1_residual_deg:.2e} deg; curvature jump at "
          f"tangencies: circular {sum(pf.circular_kappa_jump):.4f} vs conic "
          f"{sum(pf.conic_kappa_jump):.4f} mm^-1 (conic halves it — chosen)")
    print(f"    plan-closure residual vs old waist ellipse: "
          f"{d.plan_closure_residual_mm:.3f} mm")
    print(f"    layout keep-out DERIVED from the zone: s "
          f"[{chart.band_s_lo:.2f}, {chart.band_s_hi:.2f}] mm; the band is the "
          f"cable bus; FPC bend check: CANNOT VERIFY (min_bend_radius_mm null "
          f"for all classes)")

    # 5 — top edge binding lengths
    print("\n[5] TOP-EDGE 3D ARC LENGTHS (edge binding, per piece)")
    lengths = top_edge_lengths(model)
    print(f"    FRONT piece edge {lengths['FRONT']:.1f} mm; BACK piece edge "
          f"{lengths['BACK']:.1f} mm; total {sum(lengths.values()):.1f} mm")

    # 6 — analysis: distributions, usable areas, strips
    print("\n[6] SEATING ANALYSIS ON THE COMMITTED SHELL (tolerance "
          f"{TOL:g} mm, footprint sampling)")
    grid = ShellGrid(chart, GridSpec(10.0, 25.0))
    analyses = analyze_cells(coords, chart, grid, classes, TOL, samples=7)
    df, db = piece_distributions(chart, analyses, grid)
    print(f"    FRONT (|theta| < {chart.split_theta:.1f}): {fmt_dist(df)}")
    print(f"    BACK: {fmt_dist(db)}")
    ua = {}
    for piece in ("FRONT", "BACK"):
        for seg in ("bodice", "skirt"):
            ua[(piece, seg)] = usable_area(model, chart, piece, seg)
    gross = usable_area(model, chart)
    for piece in ("FRONT", "BACK"):
        print(f"    usable {piece}: bodice {ua[(piece, 'bodice')] / 100:.1f} cm^2, "
              f"skirt {ua[(piece, 'skirt')] / 100:.1f} cm^2")
    print(f"    usable total (all keep-outs: neckline 6 mm, derived waist "
          f"band, armhole band 8 mm): {gross / 100:.1f} cm^2")
    strips = unseatable_strips(chart, coords, classes["p213"], 100.0,
                               chart.split_theta)
    txt = "; ".join(f"[{a:.0f}, {b:.0f}]" for a, b in strips) or "none"
    print(f"    p213 unseatable theta strips at v = 100 (the old +-90 side "
          f"ring now sits MID-FRONT): {txt}")

    # 7 — seam at armhole vs seam at 90
    print("\n[7] SEAM AT armhole vs SEAM AT 90 (decision numbers)")
    p90 = float(np.asarray(d.perimeter(190.0)))
    for split_v, label in ((model.split_theta, f"armhole {model.split_theta:.1f}"),
                           (90.0, "90.0")):
        m2 = ShellModel(ShellParams(bodice=params.bodice, depth_curve=d,
                                    split_theta=split_v))
        c2 = ShellCoords(m2)
        ch2 = SurfaceChart(m2, c2)
        back_w = (180.0 - split_v) / 180.0 * p90
        ub = usable_area(m2, ch2, "BACK", "bodice")
        uf = usable_area(m2, ch2, "FRONT", "bodice")
        print(f"    split {label:>13}: back width at v=190 = {back_w:.0f} mm "
              f"(x2 halves = {2 * back_w:.0f}); usable bodice FRONT "
              f"{uf / 100:.1f} / BACK {ub / 100:.1f} cm^2")

    # 8 — costs
    print("\n[8] PANEL COST AT COVERAGE TARGETS (p213 at $9.95, active "
          f"{classes['p213'].active_area:.0f} mm^2 / outline "
          f"{classes['p213'].outline_area:.0f} mm^2)")
    for piece in ("FRONT", "BACK"):
        area = ua[(piece, "bodice")] + ua[(piece, "skirt")]
        for cov in (1.0, 0.33):
            n = math.ceil(cov * area / classes["p213"].outline_area)
            print(f"    {piece} {cov * 100:>3.0f}% of usable "
                  f"({cov * area / 100:.0f} cm^2): ~{n} x p213 = "
                  f"${n * 9.95:.2f}")

    # 9 — fillet radius sweep
    print("\n[9] FILLET RADIUS SWEEP (15 / 25 / 40 mm)")
    for R in (15.0, 25.0, 40.0):
        pr = dress_params(FilletParams(fillet_radius=R))
        mR = ShellModel(pr)
        cR = ShellCoords(mR)
        chR = SurfaceChart(mR, cR)
        dR = pr.depth_curve
        gR = ShellGrid(chR, GridSpec(10.0, 25.0))
        aR = analyze_cells(cR, chR, gR, classes, TOL, samples=5)
        above = [a for c, a in zip(gR.cells, aR) if c.s_c < 0]
        below = [a for c, a in zip(gR.cells, aR) if c.s_c >= 0]
        da_, db_ = class_distribution(above), class_distribution(below)
        seat = lambda dist: sum(v for k, v in dist.items() if k) \
            / max(1, sum(dist.values()))
        print(f"    R {R:>4.0f}: band s [{chR.band_s_lo:.2f}, "
              f"{chR.band_s_hi:.2f}] mm (width "
              f"{chR.band_s_hi - chR.band_s_lo:.1f}); usable "
              f"{usable_area(mR, chR) / 100:.0f} cm^2; seatable above "
              f"{100 * seat(da_):.0f}% / below {100 * seat(db_):.0f}%; "
              f"split {mR.split_theta:.2f}")

    # 10 — standing assumptions
    print("\n[10] STANDING ASSUMPTIONS / UNVERIFIED (spec section 8)")
    print("    - above-bust 812.8 mm @ v=254 is a garment-convention "
          "UNVERIFIED anchor (flagged since its introduction)")
    print("    - 2 mm standoff tolerance is a single named unvalidated "
          "constant; the 1.5/2/2.5/3 sweep ships in the sidecar")
    print("    - the side trace is a perspective photo: smoothed fit, "
          "residuals reported at the gate")
    print("    - across-back 360 mm was taped on an uncorseted form; "
          "P(190) interpolation residual 17.2 mm > 10 mm — flagged")
    print("    - FPC minimum bend radius: null for all classes; the "
          "cable-bus bend check CANNOT VERIFY (datasheets silent)")
    for cid, field, note in unverified_fields(classes):
        print(f"    - {cid}.{field}: {note[:80]}")


if __name__ == "__main__":
    main()
