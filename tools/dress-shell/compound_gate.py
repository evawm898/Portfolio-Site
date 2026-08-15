#!/usr/bin/env python3
"""GATE REPORT for the increased-bust-projection compound sections.

    cd tools/dress-shell && python3 compound_gate.py

Nothing here modifies the committed shell: it builds the compound model
as a prototype and reports every number the brief asks for, so the design
can be accepted or rejected before geometry is rebuilt.
"""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from bodice import solve_theta_armhole
from compound import (CompoundDepth, CompoundShellModel, compound_params,
                      compound_perimeter)
from consolidated_report import usable_area
from coords import ShellCoords
from curvature import (STANDOFF_TOLERANCE_MM, analyze_cells, class_distribution,
                       principal_curvatures, seat_standoff)
from grid import GridSpec, ShellGrid
from layout import SurfaceChart, wrap180
from panels import load_panel_classes
from shell import ShellModel, dress_params

HERE = Path(__file__).resolve().parent
TOL = STANDOFF_TOLERANCE_MM
ANCHORS = [(0.0, "waist plane"), (45.0, "front-profile join"),
           (100.0, "low bodice"), (152.4, "UNDERBUST anchor"),
           (181.0, "BUST POINT (new max)"), (190.0, "across-back level"),
           (203.2, "BUST APEX anchor"), (220.0, "CF neckline"),
           (240.0, "shell top")]


def piece_dists(chart, analyses, grid):
    split = chart.split_theta
    f, b = [], []
    for cell, a in zip(grid.cells, analyses):
        (f if abs(wrap180(cell.theta_c)) < split else b).append(a)
    return class_distribution(f), class_distribution(b)


def fmt_dist(dist):
    total = sum(dist.values()) or 1
    return "  ".join(f"{k or 'none'} {100.0 * v / total:.0f}%"
                     for k, v in sorted(dist.items(),
                                        key=lambda kv: (kv[0] is None, kv[0])))


class _NoNecklineChart:
    """The chart with the neckline keep-out removed, so a keep-out band
    measures CURVATURE alone and does not silently merge with the
    neckline strip near the top of the bodice."""

    def __init__(self, chart):
        self._c = chart
        self.neckline = None

    def __getattr__(self, name):
        return getattr(self._c, name)


def true_surface_area(model, chart, piece=None, segment=None,
                      n_theta=721, n_v=260):
    """Area of the ACTUAL surface after every keep-out, integrated with
    the true metric |X_theta x X_z|. usable_area() in the consolidated
    report uses the r_eq approximation, which depends only on the frozen
    perimeter schedule and therefore cannot see a redistribution between
    front and back — this can."""
    split = chart.split_theta
    band_lo_v = chart.height_of_s(chart.band_s_hi)
    band_hi_v = chart.height_of_s(chart.band_s_lo)
    arm = chart.armhole_band_halfwidth
    th = np.linspace(-180.0, 180.0, n_theta, endpoint=False) + 180.0 / n_theta
    dth = math.radians(360.0 / n_theta)
    total = 0.0
    dt, dz = 1e-3, 0.25
    for t_deg in th:
        lam = wrap180(t_deg)
        on_front = abs(lam) < split
        if (piece == "FRONT" and not on_front) or (piece == "BACK" and on_front):
            continue
        v_hi = float(model.z_top_at(t_deg)) - (model.neckline.params.keepout_mm
                                               if model.neckline else 0.0)
        v_lo = float(model.z_bottom)
        if segment == "bodice":
            v_lo = 0.0
        elif segment == "skirt":
            v_hi = min(v_hi, 0.0)
        if v_hi <= v_lo:
            continue
        edges = np.linspace(v_lo, v_hi, n_v + 1)
        vm = 0.5 * (edges[1:] + edges[:-1])
        dv = np.diff(edges)
        tr = math.radians(t_deg)
        zc = np.clip(vm, model.z_bottom + dz, model.z_top - dz)
        Xt = (model.point(tr + dt, vm) - model.point(tr - dt, vm)) / (2 * dt)
        Xz = (model.point(tr, zc + dz) - model.point(tr, zc - dz)) / (2 * dz)
        jac = np.linalg.norm(np.cross(Xt, Xz), axis=-1)
        w = jac * dth * dv
        keep = ~((vm > band_lo_v) & (vm < band_hi_v))
        seam_gap = split - abs(lam) if on_front else abs(lam) - split
        keep &= math.radians(seam_gap) * np.asarray(model.mean_radius(vm)) >= arm
        total += float(w[keep].sum())
    return total


def cf_keepout_band(coords, chart, cls, bust_v, lo=110.0, hi=236.0, step=0.5,
                    ignore_neckline=True):
    """Contiguous height band at CF (theta = 0) around a feature where a
    panel cannot seat in EITHER orientation (footprint sampling — the
    seating criterion). Returns (v_lo, v_hi, width_mm, arc_width_mm)."""
    ch = _NoNecklineChart(chart) if ignore_neckline else chart
    vs = np.arange(lo, hi + 1e-9, step)
    bad = []
    for v in vs:
        s = float(coords.s_of_z(float(v)))
        best = min(seat_standoff(coords, ch, cls.outline_w, cls.outline_h,
                                 0.0, s, samples=9, rotation=r)
                   for r in (0.0, 90.0))
        bad.append(not (best <= TOL))
    bad = np.array(bad)
    i = int(np.argmin(np.abs(vs - bust_v)))
    if not bad[i]:
        return None
    lo_i = i
    while lo_i > 0 and bad[lo_i - 1]:
        lo_i -= 1
    hi_i = i
    while hi_i < len(vs) - 1 and bad[hi_i + 1]:
        hi_i += 1
    v0, v1 = float(vs[lo_i]), float(vs[hi_i])
    arc = abs(float(coords.s_of_z(v0)) - float(coords.s_of_z(v1)))
    return v0, v1, v1 - v0, arc


def main():
    classes = load_panel_classes(HERE / "panels.yaml")
    p213 = classes["p213"]

    old = ShellModel(dress_params())
    old_c = ShellCoords(old)
    old_ch = SurfaceChart(old, old_c)

    new = CompoundShellModel(compound_params())
    cd = new.cd
    new_c = ShellCoords(new)
    new_ch = SurfaceChart(new, new_c)

    print("=" * 74)
    print("GATE — COMPOUND SECTIONS, INCREASED BUST PROJECTION")
    print("=" * 74)
    print(f"front control points: (45, {cd.front.d_low:.3f}) - "
          f"({cd.bust_point_v:g}, {cd.front.d_bust:g}) - (220, "
          f"{cd.front.d_ctrl:g}); front_bow {cd.front_bow:g}, "
          f"bust_point_radius {cd.bust_point_radius:g}")
    print(f"circumference schedule FROZEN — compound-perimeter solve "
          f"residual {cd.perimeter_residual_mm:.2e} mm")

    # --- 1. a(v) old vs new ------------------------------------------------
    print("\n[1] HALF-WIDTH a(v) AND FRONT-VIEW WIDTH, OLD vs NEW")
    print("      v          a_old    a_new    delta |  width_old width_new  "
          "delta | b_front b_back")
    for v, label in ANCHORS:
        a_o = float(np.asarray(old.a(v)))
        a_n = float(cd.a(v))
        bf, bb = float(cd.b_front(v)), float(cd.b_back(v))
        print(f"  {v:7.1f} {label:<22} {a_o:7.2f} {a_n:7.2f} {a_n - a_o:+7.2f} |"
              f" {2 * a_o:8.1f} {2 * a_n:8.1f} {2 * (a_n - a_o):+7.1f} |"
              f" {bf:7.2f} {bb:7.2f}")
    print(f"  front-view silhouette width = 2a. At the BUST APEX anchor it "
          f"narrows by {2 * (float(cd.a(203.2)) - float(np.asarray(old.a(203.2)))):.1f} mm "
          f"({2 * float(np.asarray(old.a(203.2))):.0f} -> "
          f"{2 * float(cd.a(203.2)):.0f}).")

    # --- 2. back unchanged -------------------------------------------------
    vv = np.linspace(-381.0, 240.0, 20001)
    res_back = np.asarray(cd.b_back(vv)) - np.asarray(old.b(vv))
    print(f"\n[2] BACK PROFILE UNCHANGED: max |residual| over the whole shell "
          f"= {float(np.max(np.abs(res_back))):.2e} mm (identically the same "
          f"object — b_back IS the committed depth curve)")

    # --- 3. occluding contour ---------------------------------------------
    print("\n[3] OCCLUDING CONTOUR")
    worst = 0.0
    for th in (0.0, 180.0):
        for v in np.linspace(-380.0, 235.0, 400):
            s = float(new_c.s_of_z(float(v)))
            n = new_c.forward(th, s)["normal"]
            worst = max(worst, abs(float(n[0])))
    print(f"    sections stay symmetric in x, so the contour remains EXACTLY "
          f"theta = 0 / 180.")
    print(f"    worst |normal_x| on those meridians: {worst:.2e} "
          f"(equal-arc Newton noise, not geometry)")
    print(f"    NOTE: front and back profiles are no longer mirror images — "
          f"the side view is now asymmetric about the axis, which is the "
          f"point of the change.")

    # --- 4. CF hoop radius + standoff -------------------------------------
    print("\n[4] HOOP RADIUS AT CF (section curvature at the CF point, a^2/b)")
    for v in (152.4, 181.0, 203.2):
        a_o, b_o = float(np.asarray(old.a(v))), float(np.asarray(old.b(v)))
        R_o = a_o ** 2 / b_o
        R_n = float(new.hoop_radius_cf(v))
        print(f"    v = {v:6.1f}: R_old {R_o:7.1f} mm -> R_new {R_n:7.1f} mm "
              f"({100 * (R_n / R_o - 1):+.0f}%)")
        for w, tag in ((p213.outline_h, "59.2 mm dim"),
                       (p213.outline_w, "29.2 mm dim")):
            sag_o = R_o - math.sqrt(max(R_o ** 2 - (w / 2) ** 2, 0.0))
            sag_n = R_n - math.sqrt(max(R_n ** 2 - (w / 2) ** 2, 0.0))
            flag = "" if sag_n <= TOL else "   <-- OVER the 2 mm tolerance"
            print(f"        {tag} across the hoop: sagitta {sag_o:.2f} -> "
                  f"{sag_n:.2f} mm{flag}")
    print("    (closed-form hoop sagitta as requested; the seating verdict "
          "below comes from footprint sampling)")

    # --- 5. junction curvature --------------------------------------------
    print("\n[5] HALF-ELLIPSE JUNCTION (where the two halves meet at (+-a, 0))")
    for v in (152.4, 181.0, 203.2):
        kf, kb, jump = (float(x) for x in new.junction_curvature_jump(v))
        thj = float(cd.theta_junction_deg(v))
        print(f"    v = {v:6.1f}: junction sits at theta {thj:6.2f} deg "
              f"(was exactly 90); kappa_front {kf:.5f} vs kappa_back "
              f"{kb:.5f} mm^-1, JUMP {jump:.5f} (radius {1 / kf:.0f} -> "
              f"{1 / kb:.0f} mm)")
    thj = float(cd.theta_junction_deg(190.0))
    print(f"    tangent matches automatically (both halves are vertical in "
          f"the section plane there); the CURVATURE jump is a step, not a "
          f"kink — it will read as a hard edge in the heat map at theta "
          f"~{thj:.0f} deg, which is {new.split_theta - thj:.0f} deg INSIDE "
          f"the front piece from the armhole seam at {new.split_theta:.1f}.")

    # --- 6. armhole --------------------------------------------------------
    print("\n[6] ARMHOLE ANGLE")
    r_old = solve_theta_armhole(old)
    r_new = solve_theta_armhole(new)
    print(f"    old {r_old['theta_armhole']:.4f} deg -> new "
          f"{r_new['theta_armhole']:.4f} deg  (shift "
          f"{r_new['theta_armhole'] - r_old['theta_armhole']:+.4f})")
    print(f"    REFUTES the expectation that it must move: theta is EQUAL-ARC, "
          f"so the 360 mm tape spans 360*360/P(190) degrees and P(190) = "
          f"{r_new['section_perimeter']:.1f} mm is frozen. a shrinking is "
          f"exactly compensated by the front getting deeper.")
    print(f"    What DOES move: the seam's position in space (a is "
          f"{float(cd.a(190.0)) - float(np.asarray(old.a(190.0))):+.1f} mm at "
          f"v = 190) and the back half's angular span "
          f"(junction 90 -> {float(cd.theta_junction_deg(190.0)):.1f} deg).")

    # --- 7. corner sweep ---------------------------------------------------
    print("\n[7] BUST-POINT RADIUS SWEEP (CF keep-out from footprint sampling)")
    print("    R_mm  blend_halfwidth  min_merid_R   keep-out band (v)      "
          "width   arc   p213 upright  p213 rotated")
    for R in (0.0, 15.0, 30.0, 50.0):
        m = CompoundShellModel(compound_params(bust_point_radius=R))
        c = ShellCoords(m)
        ch = SurfaceChart(m, c)
        s_bp = float(c.s_of_z(m.cd.bust_point_v))
        so_up = seat_standoff(c, ch, p213.outline_w, p213.outline_h, 0.0,
                              s_bp, samples=9, rotation=0.0)
        so_rot = seat_standoff(c, ch, p213.outline_w, p213.outline_h, 0.0,
                               s_bp, samples=9, rotation=90.0)
        band = cf_keepout_band(c, ch, p213, m.cd.bust_point_v)
        w = m.cd.front.blend_halfwidth
        mr = (m.cd.front._blend_min_radius(w) if w > 0 else 0.0)
        if band is None:
            btxt = f"{'none — panel can sit on it':<34}"
            wtxt, atxt = "   -  ", "  -  "
        else:
            btxt = f"[{band[0]:7.1f}, {band[1]:7.1f}]{'':<14}"
            wtxt, atxt = f"{band[2]:5.1f}", f"{band[3]:5.1f}"
        fmt = lambda x: (f"{x:.2f} mm" + (" OK" if x <= TOL else " NO")
                         if math.isfinite(x) else "inf NO")
        print(f"    {R:4.0f}  {w:15.2f}  {mr:11.1f}   {btxt} {wtxt} {atxt}   "
              f"{fmt(so_up):<14} {fmt(so_rot)}")
    print("    'p213 upright' = 59.2 mm along the meridian (fails on the "
          "CORNER), 'rotated' = 59.2 mm across the hoop (fails on HOOP "
          "curvature alone, corner irrelevant); both centred ON the bust "
          "point. Band is curvature-only — the neckline strip is excluded "
          "so the two keep-outs are not double-counted.")
    print("    How large a radius WOULD let the upright panel cross?")
    for R in (80.0, 120.0, 200.0, 320.0):
        try:
            m = CompoundShellModel(compound_params(bust_point_radius=R))
        except Exception as exc:
            print(f"      R = {R:5.0f}: NOT CONSTRUCTIBLE — {exc}")
            break
        c = ShellCoords(m)
        ch = _NoNecklineChart(SurfaceChart(m, c))
        so = seat_standoff(c, ch, p213.outline_w, p213.outline_h, 0.0,
                           float(c.s_of_z(m.cd.bust_point_v)), samples=9,
                           rotation=0.0)
        print(f"      R = {R:5.0f}: blend half-width "
              f"{m.cd.front.blend_halfwidth:5.1f} mm, standoff {so:.2f} mm "
              f"{'OK' if so <= TOL else 'still NO'}")
    print("    Not choosing for you — the trade is projection sharpness "
          "against a bare horizontal stripe across the front.")

    # --- 8. the second corner ---------------------------------------------
    print("\n[8] FINDING — A SECOND CORNER AT v = 45 (not in the brief)")
    print(f"    The authored control point 81.0 mm sits {abs(cd.front.join_step_mm):.2f} mm "
          f"BELOW the actual unchanged profile there ({cd.front.back_d_low:.3f} mm). "
          f"Built literally it would leave a {abs(cd.front.join_step_mm):.2f} mm ledge "
          f"around the whole front, so the control point is SNAPPED to the "
          f"real value (C0 closed) and the difference reported here instead.")
    print(f"    Even snapped, the tangent breaks: the profile arrives at "
          f"v = 45 nearly vertical and leaves it climbing, a "
          f"{cd.front.join_angle_deg():.1f} deg corner — a second horizontal "
          f"crease, same kind as the bust point but unlabelled in the brief.")
    band45 = cf_keepout_band(new_c, new_ch, p213, 45.0, lo=15.0, hi=110.0)
    base45 = cf_keepout_band(old_c, old_ch, p213, 45.0, lo=15.0, hi=110.0)
    b_txt = (f"v [{band45[0]:.1f}, {band45[1]:.1f}] = {band45[2]:.1f} mm tall"
             if band45 else "none")
    base_txt = (f"v [{base45[0]:.1f}, {base45[1]:.1f}] = {base45[2]:.1f} mm"
                if base45 else "none (the baseline seats clean through v = 45)")
    print(f"    CF keep-out at that corner: {b_txt}   [baseline: {base_txt}]")
    if band45:
        print(f"    It needs its own radius knob, or the lower control point "
              f"needs a tangent condition instead of a free value. Say which "
              f"and I will add it — I have not chosen.")
    print(f"    Bust-point corner angle at R = 0: "
          f"{cd.front.corner_angle_deg():.1f} deg.")

    # --- 9. area + distribution -------------------------------------------
    print("\n[9] USABLE BODICE AREA AND MAX-SEATABLE CLASS, vs BASELINE")
    for tag, mm, cc, chh in (("baseline", old, old_c, old_ch),
                             ("compound", new, new_c, new_ch)):
        g = ShellGrid(chh, GridSpec(10.0, 25.0))
        an = analyze_cells(cc, chh, g, classes, TOL, samples=7)
        df, db = piece_dists(chh, an, g)
        uf = true_surface_area(mm, chh, "FRONT", "bodice")
        ub = true_surface_area(mm, chh, "BACK", "bodice")
        ra = usable_area(mm, chh, "FRONT", "bodice")
        print(f"    {tag}: usable bodice FRONT {uf / 100:7.1f} cm^2 | BACK "
              f"{ub / 100:7.1f} cm^2   (true metric)")
        print(f"              FRONT {fmt_dist(df)}")
        print(f"              BACK  {fmt_dist(db)}")
        print(f"              [r_eq approximation would report FRONT "
              f"{ra / 100:.1f} cm^2 — it depends only on the frozen "
              f"perimeter and is blind to this change]")

    # --- 10. the CF column ------------------------------------------------
    print("\n[10] THE CENTER-FRONT COLUMN (what a panel can actually use)")
    for tag, mm, cc, chh in (("baseline", old, old_c, old_ch),
                             ("compound", new, new_c, new_ch)):
        wins = cf_seatable_windows(cc, chh, p213)
        txt = ", ".join(f"v [{a:.1f}, {b:.1f}] ({b - a:.0f} mm)"
                        for a, b in wins) or "none"
        floor = float(mm.neckline.keepout_floor(0.0))
        usable = sum(b - min(a2, floor) for a2, b in
                     [(a, min(b, floor)) for a, b in wins] if b > a2)
        print(f"    {tag}: {txt}")
        print(f"              total seatable height below the CF neckline "
              f"floor ({floor:.0f} mm): {usable:.0f} mm")


def cf_seatable_windows(coords, chart, cls, lo=0.0, hi=225.0, step=0.5):
    """Contiguous CF height windows where the panel CAN seat in at least
    one orientation (curvature only)."""
    ch = _NoNecklineChart(chart)
    vs = np.arange(lo, hi + 1e-9, step)
    ok = np.array([min(seat_standoff(coords, ch, cls.outline_w, cls.outline_h,
                                     0.0, float(coords.s_of_z(float(v))),
                                     samples=9, rotation=r)
                       for r in (0.0, 90.0)) <= TOL for v in vs])
    out, i = [], 0
    while i < len(vs):
        if ok[i]:
            j = i
            while j + 1 < len(vs) and ok[j + 1]:
                j += 1
            out.append((float(vs[i]), float(vs[j])))
            i = j + 1
        else:
            i += 1
    return out


if __name__ == "__main__":
    main()
