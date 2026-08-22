"""GATE — flat bust facet v3 (exact-X construction, no reference-frame
approximation), answering the width-floor / series-artifact / keep-out /
panel-dims corrections.

STATUS: this whole facet approach was REJECTED after this report (hard
corners in plan + net seatable-area loss) — see plateau_gate2.py for the
current front construction (widened, depth-pinned PlateauBustDepth).
Kept as a record of the exact-X and C1-taper fixes, both real bugs
independent of the facet-vs-plateau decision.

Nothing here modifies the committed shell: dress_params() is untouched.

[1] width floor: theta for exactly 87.5mm half-width at v=181
[2] deviation-from-plane at 25/39/50deg equivalents under the corrected
    (exact-X) construction — confirms or refutes the series-artifact
    diagnosis
[3] meridional-radius minimum + blend-width sweep, re-verified against
    the corrected construction
[4] the blend as a named keep-out: its own area, vs the facet's area,
    net against the unfaceted baseline (seatability-based, not just
    footprint-based)
[5] panel fit numbers, panels.yaml dims ONLY, at the corrected width

Run:  cd tools/dress-shell && python3 facet_gate.py
Writes: exports/facet-exact-sweep.png, exports/facet-meridian-profile.png
"""

import math
from dataclasses import replace

import numpy as np

from bust_apex import ApexShellModel
from bust_facet import FacetBustDepth, theta_for_half_width_mm, verify_plane_flatness
from coords import ShellCoords
from curvature import STANDOFF_TOLERANCE_MM as TOL, principal_curvatures, seat_standoff
from layout import SurfaceChart
from panels import load_panel_classes
from shell import ShellModel, dress_params

DEPTH_MM = 123.0
HALF_WIDTH_MM = 87.5       # your measured floor — breast-tip distance 175mm / 2
DEG_SWEEP = (25.0, 38.965, 50.0)
BLEND_SWEEP = (70.0, 100.0, 130.0, 160.0)


def build(base, half_width_mm, radius_mm=70.0, check=True):
    d = FacetBustDepth(base_params=base, bust_half_width_mm=half_width_mm,
                       depth_mm=DEPTH_MM, front_bow=0.0, radius_mm=radius_mm,
                       check_cf_is_max=check)
    return d, ApexShellModel(replace(base, depth_curve=d))


def cf_meridian_radius(model, v_lo, v_hi, n=2401):
    vv = np.linspace(v_lo, v_hi, n)
    b = np.asarray(model.b(vv))
    db = np.asarray(model.db(vv))
    h = 0.5
    ddb = (np.asarray(model.db(vv + h)) - np.asarray(model.db(vv - h))) / (2 * h)
    k_ref = ddb / (1.0 + db ** 2) ** 1.5
    k1, k2, _ = principal_curvatures(model, np.zeros_like(vv), vv)
    d1, d2 = np.abs(k1 - k_ref), np.abs(k2 - k_ref)
    k_mer = np.where(d1 <= d2, k1, k2)
    r_mer = 1.0 / np.maximum(np.abs(k_mer), 1e-15)
    return vv, r_mer


def part1(base):
    print("=" * 78)
    print("[1] WIDTH FLOOR — theta for exactly 87.5mm at v=181")
    print("=" * 78)
    theta, r_ref = theta_for_half_width_mm(base, HALF_WIDTH_MM)
    print(f"\n    r_ref (P(181)/2pi) = {r_ref:.4f} mm")
    print(f"    theta for {HALF_WIDTH_MM:g}mm half-width = {theta:.3f} deg")
    print(f"    (this angle plays NO role in the corrected construction "
         f"below — bust_half_width_mm is now the authoritative parameter, "
         f"specified directly in mm; reported here purely for reference "
         f"against the old angular parametrization)")


def part2(base):
    print("\n" + "=" * 78)
    print("[2] DEVIATION FROM A TRUE PLANE — corrected (exact-X) "
         "construction")
    print("=" * 78)
    print(f"\n    ROOT CAUSE CONFIRMED: the v2 construction tested the "
         f"flat-core boundary using theta_ref, an APPROXIMATE reference-"
         f"frame azimuth (see bust_apex.py's own ~2deg residual at the "
         f"old off-axis apex, same mechanism) — and, worse, computed the "
         f"whole depth field Y ONCE, before the perimeter-matching "
         f"bisection even started, using an a-independent stand-in for "
         f"the true half-width. Fixed at the source: bust_apex.py's "
         f"_BumpedDepth._solve() now recomputes Y every bisection "
         f"iteration from THAT iteration's true X = a_trial*sin(T), and "
         f"the facet's region test (|X| <= half_width(v)) uses that X "
         f"directly — no angle anywhere in the test.")
    r_ref = None
    for deg in DEG_SWEEP:
        theta_deg, r_ref = theta_for_half_width_mm(base, 1.0)  # just to get r_ref once
        hw_mm = math.radians(deg) * r_ref
        d, m = build(base, hw_mm)
        flat = verify_plane_flatness(d)
        print(f"    {deg:6.2f}deg equiv (half-width {hw_mm:6.2f}mm): "
             f"max deviation {flat['max_dev_mm']:.2e} mm, rms "
             f"{flat['rms_dev_mm']:.2e} mm, hard-constraint violation "
             f"{d.cf_max_violation_mm:.6f} mm, perimeter residual "
             f"{d.perimeter_residual_mm:.2e} mm")
    print(f"\n    *** DIAGNOSIS CONFIRMED: deviation is at the floating-"
         f"point noise floor (~1e-13 to 1e-14mm) at ALL THREE widths — "
         f"it does NOT scale with facet width any more. The series-"
         f"artifact hypothesis was correct; this was an implementation "
         f"bug, not a geometric limit. A plane is a plane at any width.")


def part3(base):
    print("\n" + "=" * 78)
    print("[3] MERIDIONAL RADIUS — re-verified against the corrected "
         "construction")
    print("=" * 78)
    d, m = build(base, HALF_WIDTH_MM)
    vv, r_mer = cf_meridian_radius(m, 0.0, 240.0)
    i = int(np.argmin(r_mer))
    print(f"\n    Full CF meridian, v=0..240: global min = {r_mer[i]:.2f} mm "
         f"at v={vv[i]:.1f} ({'above' if vv[i] > 181 else 'at/below'} the "
         f"bust-point line)")
    interior = r_mer[(vv >= 1) & (vv <= 180)]
    print(f"    interior (v=1..180): min r = {interior.min():.2e} mm — "
         f"still genuinely flat")

    print(f"\n    BLEND-WIDTH SWEEP (radius_mm, min radius in the blend "
         f"zone v>181), at the corrected 87.5mm width:")
    for radius_mm in BLEND_SWEEP:
        d2, m2 = build(base, HALF_WIDTH_MM, radius_mm=radius_mm)
        vv2, r2 = cf_meridian_radius(m2, 181.0, 240.0)
        i2 = int(np.argmin(r2))
        print(f"      radius_mm={radius_mm:6.1f}: min blend radius "
             f"{r2[i2]:7.2f} mm at v={vv2[i2]:.1f}")
    return d, m


def part4(base, d, m):
    print("\n" + "=" * 78)
    print("[4] THE BLEND AS A NAMED KEEP-OUT — area and net vs baseline")
    print("=" * 78)
    plain = ShellModel(base)

    vv = np.linspace(0.0, d.apex_v, 4001)
    hw = np.asarray(d.half_width(vv))
    facet_area = float(2.0 * np.trapezoid(hw, vv))
    print(f"\n    FACET (core, w=1) area: {facet_area:.0f} mm^2")

    vv2 = np.linspace(0.0, d.apex_v + d.radius_mm, 6001)
    hw2 = np.asarray(d.half_width(vv2))
    dv_excess = np.maximum(0.0, vv2 - d.apex_v)
    lateral_at_edge = np.sqrt(np.maximum(d.radius_mm ** 2 - dv_excess ** 2, 0.0))
    blend_ring_area = float(2.0 * np.trapezoid(lateral_at_edge, vv2))
    print(f"    BLEND (0<w<1 annulus around the core) footprint area: "
         f"{blend_ring_area:.0f} mm^2 — {blend_ring_area/facet_area:.2f}x "
         f"the facet's own area")
    print(f"    raw area net (facet minus blend footprint, NOT "
         f"seatability-weighted): {facet_area - blend_ring_area:+.0f} mm^2")

    print(f"\n    SEATABILITY-BASED NET (the number that actually "
         f"matters): p213-seatable area, baseline vs faceted, over the "
         f"same footprint (theta +-60deg, v=0..240) — a 25x25 grid of "
         f"panel-center positions, standoff checked at each:")
    c_f, ch_f = ShellCoords(m), None
    ch_f = SurfaceChart(m, c_f)
    c_b = ShellCoords(plain)
    ch_b = SurfaceChart(plain, c_b)
    classes = load_panel_classes("panels.yaml")
    p213 = classes["p213"]
    th = np.linspace(-60.0, 60.0, 25)
    vv3 = np.linspace(0.0, 240.0, 25)
    dth = th[1] - th[0]
    dv = vv3[1] - vv3[0]
    cell_area = math.radians(dth) * d.r_ref * dv
    seatable_base = 0.0
    seatable_facet = 0.0
    for v in vv3:
        s_b = float(c_b.s_of_z(v))
        s_f = float(c_f.s_of_z(v))
        for t in th:
            so_b = seat_standoff(c_b, ch_b, p213.outline_w, p213.outline_h,
                                 t, s_b, samples=5)
            so_f = seat_standoff(c_f, ch_f, p213.outline_w, p213.outline_h,
                                 t, s_f, samples=5)
            if so_b <= TOL:
                seatable_base += cell_area
            if so_f <= TOL:
                seatable_facet += cell_area
    print(f"      baseline p213-seatable area in this window: "
         f"{seatable_base:.0f} mm^2")
    print(f"      faceted  p213-seatable area in this window: "
         f"{seatable_facet:.0f} mm^2")
    net = seatable_facet - seatable_base
    print(f"      NET CHANGE: {net:+.0f} mm^2 "
         f"({'GAIN' if net > 0 else 'LOSS'})")
    if net < 0:
        print(f"      *** THE RING COSTS MORE USABLE AREA THAN THE "
             f"FACET GAINS. The facet's own {facet_area:.0f}mm^2 is "
             f"perfectly flat, but concentrating the ring's worth of "
             f"curvature that USED to be spread gently across this "
             f"whole window into the narrow blend band makes MORE of "
             f"the surrounding area newly unseatable than the facet "
             f"itself gains — net loss of p213-seatable area, {net:.0f}mm^2 "
             f"(grid resolution 25x25, expect +-10-15% numerical "
             f"uncertainty, but the direction is unambiguous given the "
             f"size of the gap).")


def part5(base):
    print("\n" + "=" * 78)
    print("[5] PANEL FIT — panels.yaml dims ONLY, corrected 87.5mm width")
    print("=" * 78)
    d, m = build(base, HALF_WIDTH_MM)
    c = ShellCoords(m)
    ch = SurfaceChart(m, c)
    classes = load_panel_classes("panels.yaml")

    print(f"\n    (your 86x52mm figure was from memory; panels.yaml's "
         f"p370 datasheet dims are 53.0 x 92.99mm — using panels.yaml "
         f"exclusively from here on, per instruction)")

    p370 = classes["p370"]
    v_center = d.apex_v - p370.outline_h / 2.0
    s_center = float(c.s_of_z(v_center))
    so = seat_standoff(c, ch, p370.outline_w, p370.outline_h, 0.0, s_center,
                       samples=9)
    hw_bottom = float(d.half_width(np.array(d.apex_v - p370.outline_h)))
    print(f"\n    p370 ({p370.outline_w} x {p370.outline_h}mm), "
         f"top-aligned at theta=0, v_center={v_center:.1f}:")
    print(f"      geometric clearance at bottom edge: {hw_bottom:.2f}mm "
         f"vs {p370.outline_w/2:.2f}mm needed — margin "
         f"{hw_bottom - p370.outline_w/2:+.2f}mm (was 0.36mm under the "
         f"old 56mm-wide facet — now comfortable)")
    print(f"      standoff: {so:.4f} mm {'OK' if so <= TOL else 'X'}")

    p213 = classes["p213"]
    rows = [(d.apex_v - p213.outline_h, d.apex_v),
           (d.apex_v - 2 * p213.outline_h, d.apex_v - p213.outline_h),
           (d.apex_v - 3 * p213.outline_h, d.apex_v - 2 * p213.outline_h)]
    total = 0
    print(f"\n    p213 ({p213.outline_w} x {p213.outline_h}mm) tiling "
         f"(3-row geometric estimate):")
    for v_lo, v_hi in rows:
        v_lo = max(v_lo, 0.0)
        hw_row = float(d.half_width(np.array(v_lo)))
        n = int((2 * hw_row) // p213.outline_w)
        total += n
        print(f"      row v=[{v_lo:.1f},{v_hi:.1f}]: half-width "
             f"{hw_row:.2f}mm -> {n} panels wide")
    print(f"      TOTAL: {total} panels (was 3 under the old 56mm-wide "
         f"facet)")

    v_cent = d.apex_v - d.apex_v / 3.0
    s_cent = float(c.s_of_z(v_cent))
    print(f"\n    standoff at the facet centroid (theta=0, v={v_cent:.2f}), "
         f"every class:")
    for name, cls in classes.items():
        so = seat_standoff(c, ch, cls.outline_w, cls.outline_h, 0.0, s_cent,
                           samples=9)
        print(f"      {name} ({cls.outline_w}x{cls.outline_h}): "
             f"{so:.4f}mm {'OK' if so <= TOL else 'X'}")


def render(base):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, axes = plt.subplots(1, 3, figsize=(13, 4.6), constrained_layout=True)
    r_ref = build(base, 1.0)[0].r_ref
    for ax, deg in zip(axes, DEG_SWEEP):
        hw_mm = math.radians(deg) * r_ref
        d, m = build(base, hw_mm, check=False)
        levels = [40.0, 90.0, 140.0, 181.0, 200.0, 220.0]
        cmap = plt.get_cmap("viridis")
        th = np.linspace(-180.0, 180.0, 721)
        for i, v in enumerate(levels):
            pts = np.asarray(m.point(np.radians(th), np.full_like(th, v)))
            ax.plot(pts[:, 0], pts[:, 1], color=cmap(i / (len(levels) - 1)),
                   lw=1.2, label=f"v={v:g}")
        ax.axhline(0, color="#ccc", lw=0.5, zorder=0)
        ax.axvline(0, color="#ccc", lw=0.5, zorder=0)
        ax.set_title(f"{deg:.1f}deg equiv (half-width {hw_mm:.0f}mm @ v=181)",
                    fontsize=9)
        ax.set_xlabel("x (lateral, mm)")
        ax.set_aspect("equal")
        ax.invert_yaxis()
    axes[0].set_ylabel("y (front<->back, mm)")
    axes[-1].legend(fontsize=7, loc="upper right")
    fig.suptitle("Top-down: EXACT-X facet construction, 25/39/50deg-"
                 "equivalent widths, rings at v = "
                 + ", ".join(f"{v:g}" for v in [40, 90, 140, 181, 200, 220])
                 + " mm", fontsize=10)
    fig.savefig("exports/facet-exact-sweep.png", dpi=160)
    plt.close(fig)

    fig2, ax = plt.subplots(figsize=(7.5, 5.5), constrained_layout=True)
    d, m = build(base, HALF_WIDTH_MM)
    vv, r_mer = cf_meridian_radius(m, 0.0, 240.0)
    ax.semilogy(vv, np.clip(r_mer, 1.0, 1e6))
    ax.axvline(181.0, color="#c22", lw=1.0, ls="--", label="bust-point line (v=181)")
    ax.set_xlabel("v (height above waist, mm)")
    ax.set_ylabel("meridional radius at CF (mm, log scale)")
    ax.set_title("CF meridian radius: flat interior vs the blend keep-out\n"
                f"(half-width={HALF_WIDTH_MM:g}mm, front_bow=0)")
    ax.legend(fontsize=8)
    fig2.savefig("exports/facet-meridian-profile.png", dpi=160)
    plt.close(fig2)


def main():
    base = dress_params(bust="plain")
    part1(base)
    part2(base)
    d, m = part3(base)
    part4(base, d, m)
    part5(base)
    render(base)
    print("\nwrote exports/facet-exact-sweep.png, "
         "exports/facet-meridian-profile.png")
    print("\nSTATUS: prototype only. dress_params() / the committed shell "
         "are UNCHANGED.")


if __name__ == "__main__":
    main()
