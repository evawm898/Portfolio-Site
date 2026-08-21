#!/usr/bin/env python3
"""GATE REPORT for apex-based bust curvature — two apex points, radial
falloff, replacing the compound model's uniform front-half bump.

    cd tools/dress-shell && python3 apex_gate.py

Nothing here modifies the committed shell: it builds the apex model as a
prototype and reports every number needed to accept or reject it,
including the specific check requested — do bod-a30/bod-a55 fall back
within the 2mm standoff tolerance on their own, with no repositioning.
"""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from bust_apex import ApexBustDepth, ApexShellModel, apex_params, verify_apex_placement
from coords import ShellCoords
from curvature import STANDOFF_TOLERANCE_MM as TOL, analyze_cells, class_distribution, seat_standoff
from grid import GridSpec, ShellGrid
from layout import SurfaceChart, load_layout, resolve_layout, wrap180
from panels import load_panel_classes
from shell import ShellModel, dress_params

HERE = Path(__file__).resolve().parent


def main():
    classes = load_panel_classes(HERE / "panels.yaml")
    p213 = classes["p213"]

    old = ShellModel(dress_params(compound=False))   # pre-compound baseline
    old_c = ShellCoords(old)
    compound = ShellModel(dress_params())            # the currently-committed compound design
    compound_c = ShellCoords(compound)

    params = apex_params()
    d = params.depth_curve
    new = ApexShellModel(params)
    new_c = ShellCoords(new)
    new_ch = SurfaceChart(new, new_c)

    print("=" * 74)
    print("GATE — APEX-BASED BUST CURVATURE (two apexes, radial falloff)")
    print("=" * 74)

    # --- 1. placement + falloff -------------------------------------------
    print("\n[1] APEX PLACEMENT AND FALLOFF (defaults — report before finalizing)")
    print(f"    two apexes at (theta, v) = (+-{d.apex_theta_deg:g} deg, "
          f"{d.apex_v:g} mm above the waist)")
    check = verify_apex_placement(d)
    print(f"    authored (reference-frame) azimuth {check['authored_deg']:.2f} deg "
          f"-> TRUE equal-arc azimuth {check['true_equal_arc_deg']:.2f} deg "
          f"(residual {check['residual_deg']:+.2f} deg — the reference-frame "
          f"approximation used to author the bump vs. what a panel author "
          f"actually sees; small, reported honestly, not corrected away)")
    print(f"    lateral reference scale r_ref = P({d.apex_v:g})/2pi = "
          f"{d.r_ref:.2f} mm/rad -> apex separation "
          f"{2 * math.radians(d.apex_theta_deg) * d.r_ref:.1f} mm arc "
          f"(NOT a measurement — an authored placement, flagged as such: "
          f"no bust-point-separation figure was ever given in the brief)")
    print(f"    falloff: raised-cosine, amplitude {d.amplitude_mm:.2f} mm, "
          f"radius {d.radius_mm:g} mm (C1 continuous: zero VALUE and zero "
          f"SLOPE at the cutoff, so no new sharp corner is introduced; "
          f"exactly zero beyond the radius, not just small)")
    print(f"    amplitude was SOLVED (not carried over from the old model's "
          f"naive delta) so the actual apex depth matches the old compound "
          f"model's peak (121.08mm) — see [2]")
    print(f"    circumference schedule FROZEN — perimeter solve residual "
          f"{d.perimeter_residual_mm:.2e} mm")

    # --- 2. does the falloff reach zero before the seams? -------------------
    print("\n[2] FALLOFF REACH — does it stay clear of the armhole/CB/hem?")
    split = compound.split_theta
    for label, theta in (("armhole seam", split), ("CB", 180.0)):
        dtheta_mm = math.radians(theta - d.apex_theta_deg) * d.r_ref
        print(f"    apex -> {label} ({theta:.1f} deg): {dtheta_mm:.1f} mm "
              f"lateral (radius {d.radius_mm:g} mm -> "
              f"{'CLEAR by ' + format(dtheta_mm - d.radius_mm, '.0f') + ' mm' if dtheta_mm > d.radius_mm else 'DOES NOT CLEAR'})")
    dv_hem = abs(d.apex_v - (-381.0))
    print(f"    apex -> hem (v=-381): {dv_hem:.0f} mm vertical alone "
          f"(radius {d.radius_mm:g} mm -> clear by {dv_hem - d.radius_mm:.0f} mm)")
    for v, tag in ((49.83, "bod-a30/bod-a55 height"), (0.0, "waist")):
        dv = abs(d.apex_v - v)
        print(f"    apex -> v={v:g} ({tag}): {dv:.1f} mm vertical alone "
              f"(radius {d.radius_mm:g} mm -> "
              f"{'clear by ' + format(dv - d.radius_mm, '.0f') + ' mm' if dv > d.radius_mm else 'DOES NOT CLEAR — v-distance alone insufficient'})")

    # --- 3. the actual ask: bod-a30 / bod-a55 -------------------------------
    print("\n[3] bod-a30 / bod-a55 STANDOFF — WITHOUT repositioning them")
    print(f"    (v = 49.83, {dv_hem - d.radius_mm:.0f}+ mm below the apex "
          f"radius reach — should read as the plain pre-bust baseline)")
    for tag, theta, s in (("bod-a30", 30.0, -50.1), ("bod-a55", 55.0, -50.1)):
        so_old = seat_standoff(old_c, SurfaceChart(old, old_c), p213.outline_w,
                               p213.outline_h, theta, s, samples=7)
        so_compound = seat_standoff(compound_c, SurfaceChart(compound, compound_c),
                                    p213.outline_w, p213.outline_h, theta, s,
                                    samples=7)
        so_new = seat_standoff(new_c, new_ch, p213.outline_w, p213.outline_h,
                               theta, s, samples=7)
        verdict = "OK — back within tolerance" if so_new <= TOL else "STILL OVER"
        print(f"    {tag} (theta={theta:g}, s={s:g}): pre-compound baseline "
              f"{so_old:.3f} mm | current compound (broken) {so_compound:.3f} mm "
              f"| apex-based (this fix) {so_new:.3f} mm  [{verdict}]")

    # --- 4. numeric correctness ---------------------------------------------
    print("\n[4] NUMERIC CORRECTNESS")
    worst_n = 0.0
    for th in np.linspace(-179.0, 179.0, 45):
        for v in np.linspace(-380.0, 235.0, 30):
            f = new_c.forward(float(th), float(new_c.s_of_z(float(v))))
            worst_n = max(worst_n, abs(1.0 - float(np.linalg.norm(f["normal"]))),
                         abs(float(f["normal"] @ f["e_theta"])),
                         abs(float(f["normal"] @ f["e_s"])))
    print(f"    frame orthonormality worst residual: {worst_n:.2e}")
    rng = np.random.default_rng(7)
    th = rng.uniform(-100.0, 100.0, 400)
    ss = rng.uniform(new_c.s_min * 0.7, new_c.s_max * 0.7, 400)
    fw = new_c.forward(th, ss)
    t2, s2 = new_c.inverse(fw["position"], check_mm=0.5)
    p2 = new_c.forward(t2, s2)["position"]
    print(f"    coords round-trip max residual: "
          f"{float(np.max(np.linalg.norm(p2 - fw['position'], axis=-1))):.2e} mm")
    th2 = np.linspace(-100.0, 100.0, 401)
    pts = new.point(np.radians(th2), np.full_like(th2, 181.0))
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    arc = np.concatenate([[0.0], np.cumsum(seg)])
    lin = (th2 - th2[0]) / (th2[-1] - th2[0]) * arc[-1]
    print(f"    equal-arc deviation at v=181 (200deg span, {arc[-1]:.1f} mm "
          f"total): max {float(np.max(np.abs(arc - lin))):.3f} mm")
    for v in (-381.0, 0.0, 100.0, 152.4, 181.0, 203.2, 220.0, 240.0):
        po = float(old.section_perimeter(v))
        pn = float(new.section_perimeter(v))
        assert abs(po - pn) < 1e-6, (v, po, pn)
    print(f"    section perimeter schedule: identical to the pre-compound "
          f"baseline at every anchor (frozen, verified)")

    # --- 5. depth field shape ------------------------------------------------
    print("\n[5] DEPTH FIELD (theta scan at v = apex height, mm from the axis)")
    print("      theta    depth    (CF=0, apex=" + f"{d.apex_theta_deg:g}" + ", side=90, CB=180)")
    for th in (0.0, 15.0, d.apex_theta_deg, 50.0, 70.0, 90.0, 130.0, 180.0):
        print(f"      {th:6.1f}   {float(d.depth_at(th, d.apex_v)):7.2f}")
    print(f"    (CF sits between the two apexes, {d.apex_theta_deg:g} deg "
          f"from each -> {math.radians(d.apex_theta_deg) * d.r_ref:.0f} mm "
          f"lateral, {'inside' if math.radians(d.apex_theta_deg) * d.r_ref < d.radius_mm else 'OUTSIDE'} "
          f"the {d.radius_mm:g} mm radius, so CF reads at its unmodified "
          f"base value — two distinct forms, not one central mound)")

    # --- 6. broader seating comparison --------------------------------------
    print("\n[6] BROADER SEATING COMPARISON (whole shell, not just the two "
          "flagged panels)")
    grid = ShellGrid(new_ch, GridSpec(10.0, 25.0))
    an_new = analyze_cells(new_c, new_ch, grid, classes, TOL, samples=7)
    old_ch = SurfaceChart(old, old_c)
    grid_old = ShellGrid(old_ch, GridSpec(10.0, 25.0))
    an_old = analyze_cells(old_c, old_ch, grid_old, classes, TOL, samples=7)
    compound_ch = SurfaceChart(compound, compound_c)
    grid_compound = ShellGrid(compound_ch, GridSpec(10.0, 25.0))
    an_compound = analyze_cells(compound_c, compound_ch, grid_compound, classes, TOL, samples=7)

    def fmt(an):
        dist = class_distribution(an)
        total = sum(dist.values())
        return "  ".join(f"{k or 'none'} {100.0 * v / total:.0f}%"
                         for k, v in sorted(dist.items(),
                                            key=lambda kv: (kv[0] is None, kv[0])))
    print(f"    pre-compound baseline: {fmt(an_old)}")
    print(f"    current compound (broken, uniform front bump): {fmt(an_compound)}")
    print(f"    apex-based (this fix): {fmt(an_new)}")

    # --- 7. layout still resolves --------------------------------------------
    print("\n[7] LAYOUT LEGALITY ON THE APEX SHELL")
    authored = load_layout(HERE / "layout.yaml")
    placed, errors = resolve_layout(new_ch, classes, authored)
    print(f"    errors: {errors or 'none'}")
    print(f"    placed {len(placed)} panels, "
          f"{sum(1 for p in placed if not p.valid)} invalid")

    # --- 8. what changed structurally ----------------------------------------
    print("\n[8] STRUCTURAL CHANGE FROM THE COMMITTED COMPOUND MODEL")
    print("    - the front/back half-ellipse split is GONE: base depth is a "
          "single shared profile (front == back away from either apex)")
    print("    - the v=45 join corner is GONE (no split boundary to blend); "
          "the bust_point_radius / join_radius corner-blend machinery is "
          "superseded by the apex falloff's own C1 raised-cosine shape")
    print("    - bust curvature now radiates in BOTH v and theta from two "
          "off-axis points and is exactly zero beyond a 70mm radius, "
          "instead of being applied uniformly across the whole front half "
          "in v-bands")
    print("    NOT wired into dress_params() — compound.py/compound_gate.py "
          "remain the committed design pending your decision.")


if __name__ == "__main__":
    main()
