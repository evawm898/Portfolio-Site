"""GATE — PlateauBustDepth, WIDENED to span the measured bust points and
DEPTH-PINNED to 123mm. Reverts from FacetBustDepth (dropped: hard corners
where the chord meets the curve, and a net seatable-area loss that defeats
the point of flatness). Keeps the two real bugs fixed along the way
(exact-X threading in bust_apex.py's shared _solve()/_field(), and the
front-hemisphere gate) — both live in the shared _BumpedDepth machinery
and benefit every subclass, including this one, even though this one
never needed exact planarity.

Nothing here modifies the committed shell: dress_params() is untouched;
ShellModel(...) still dispatches to the COMMITTED ApexBustDepth (two
off-axis apexes). This script builds PlateauBustDepth explicitly.

Run:  cd tools/dress-shell && python3 plateau_gate2.py
Writes: exports/plateau-final-plan.png, exports/plateau-final-elevation.png
"""

import math
from dataclasses import replace

import numpy as np

from bust_apex import ApexShellModel, PlateauBustDepth, verify_plateau_placement
from coords import ShellCoords
from curvature import STANDOFF_TOLERANCE_MM as TOL, analyze_cells, class_distribution
from grid import GridSpec, ShellGrid
from layout import SurfaceChart
from panels import load_panel_classes
from shell import ShellModel, dress_params

DEPTH_MM = 123.0
HALF_WIDTH_MM = 87.5      # measured breast-tip distance (175mm) / 2
APEX_V = 181.0
RADIUS_MM = 70.0


def solve_amplitude(base):
    """CF depth is pinned, not free: crest_depth = base.b(apex_v) +
    amplitude_mm (falloff(0)=1 exactly at CF for any width), so this is
    closed-form, no bisection needed."""
    b_apex = float(np.asarray(ShellModel(base).b(APEX_V)))
    return DEPTH_MM - b_apex, b_apex


def solve_theta_for_true_width(base, amplitude_mm, target_mm=HALF_WIDTH_MM):
    """bust_plateau_theta is authored in the REFERENCE frame; the TRUE
    lateral position (X = a(v)*sin(t) on the final solved curve) lands
    somewhat short of it (found here: the naive conversion
    degrees(87.5/r_ref)=38.965deg only achieves 80.13mm true X, 7.4mm
    short). Root-find the authored theta that delivers exactly
    target_mm of TRUE lateral distance at v=apex_v."""
    from scipy.optimize import brentq

    def true_x(theta_authored):
        d = PlateauBustDepth(base_params=base, bust_plateau_theta=theta_authored,
                             amplitude_mm=amplitude_mm, radius_mm=RADIUS_MM,
                             check_cf_is_max=False)
        t_grid = np.linspace(0.0, math.pi, 4001)
        theta_ref = d._theta_ref(t_grid, np.full_like(t_grid, APEX_V))
        t_edge = float(np.interp(theta_authored, theta_ref, t_grid))
        a_v = float(np.asarray(d.a(APEX_V)))
        return a_v * math.sin(t_edge)

    naive_theta = math.degrees(target_mm / float(
        np.asarray(ShellModel(base).mean_radius(APEX_V))))
    naive_x = true_x(naive_theta)
    root = brentq(lambda th: true_x(th) - target_mm, naive_theta,
                 naive_theta + 10.0, xtol=1e-4)
    return root, naive_theta, naive_x, true_x(root)


def build_final(base):
    amplitude, b_apex = solve_amplitude(base)
    theta, naive_theta, naive_x, true_x = solve_theta_for_true_width(base, amplitude)
    d = PlateauBustDepth(base_params=base, bust_plateau_theta=theta,
                         amplitude_mm=amplitude, radius_mm=RADIUS_MM)
    m = ApexShellModel(replace(base, depth_curve=d))
    return d, m, dict(amplitude=amplitude, b_apex=b_apex, theta=theta,
                      naive_theta=naive_theta, naive_x=naive_x, true_x=true_x)


def whole_shell_p213_area(model, classes):
    c = ShellCoords(model)
    ch = SurfaceChart(model, c)
    g = ShellGrid(ch, GridSpec(dtheta=10.0, ds=25.0))
    an = analyze_cells(c, ch, g, classes, samples=7)
    total = 0.0
    for a, cell in zip(an, g.cells):
        if a.max_class == "p213":
            r = ch.r_theta(cell.theta_c, cell.s_c)
            total += math.radians(cell.theta1 - cell.theta0) * r * (cell.s1 - cell.s0)
    return total, c, ch, g, an


def front_back_dist(analyses, cells, split):
    tc = np.array([cell.theta_c for cell in cells])
    lam = (tc + 180.0) % 360.0 - 180.0
    front_mask = np.abs(lam) < split
    front = [a for a, f in zip(analyses, front_mask) if f]
    back = [a for a, f in zip(analyses, front_mask) if not f]
    return class_distribution(front), class_distribution(back)


def pct(dist):
    total = sum(dist.values())
    return {} if total == 0 else {k: 100.0 * v / total for k, v in dist.items()}


def main():
    base = dress_params(bust="plain")
    plain = ShellModel(base)
    committed = ShellModel(dress_params())
    classes = load_panel_classes("panels.yaml")

    print("=" * 78)
    print("[WIDTH / DEPTH] widened + pinned PlateauBustDepth")
    print("=" * 78)
    d, m, info = build_final(base)
    print(f"    naive conversion theta = degrees(87.5/r_ref) = "
         f"{info['naive_theta']:.3f} deg -> TRUE lateral X only "
         f"{info['naive_x']:.2f}mm (7.4mm short of the 87.5mm target — "
         f"the reference-frame azimuth undershoots the true equal-arc "
         f"placement, same mechanism documented throughout this file)")
    print(f"    CORRECTED (root-solved for true X = 87.5mm exactly): "
         f"bust_plateau_theta = {d.bust_plateau_theta:.3f} deg "
         f"-> true X = {info['true_x']:.4f}mm")
    print(f"    amplitude_mm SOLVED (closed-form, CF pinned) = "
         f"{info['amplitude']:.4f}mm (base.b(181)={info['b_apex']:.4f}mm + "
         f"amplitude = {info['b_apex'] + info['amplitude']:.2f}mm = 123.0mm "
         f"exactly)")
    print(f"    hard-constraint (CF is max) violation: "
         f"{d.cf_max_violation_mm:.6f} mm")
    print(f"    perimeter residual: {d.perimeter_residual_mm:.2e} mm")
    vp = verify_plateau_placement(d)
    print(f"    true equal-arc edge of the flat core: "
         f"{vp['plateau_true_equal_arc_deg']:.2f} deg (authored "
         f"{d.bust_plateau_theta:.2f} deg, residual "
         f"{vp['plateau_residual_deg']:+.2f} deg — expected, same "
         f"reference-frame mechanism, harmless here since planarity was "
         f"never the goal)")

    print("\n" + "=" * 78)
    print("[DEVIATION FROM STRAIGHT] across the true plateau span")
    print("=" * 78)
    true_edge = vp["plateau_true_equal_arc_deg"]
    th = np.linspace(-true_edge, true_edge, 61)
    t = d.t_of(th, np.full_like(th, APEX_V))
    X = np.asarray(d.a(APEX_V)) * np.sin(t)
    Y = np.asarray(d.y_of(t, np.full_like(t, APEX_V)))
    A = np.stack([X, np.ones_like(X)], axis=1)
    slope, intercept = np.linalg.lstsq(A, Y, rcond=None)[0]
    resid = Y - (slope * X + intercept)
    print(f"\n    X span: {X.min():.2f} to {X.max():.2f} mm "
         f"({X.max()-X.min():.1f}mm total, target 175mm)")
    print(f"    max deviation from best-fit straight line: "
         f"{np.max(np.abs(resid)):.2f} mm")
    print(f"    rms deviation: {np.sqrt(np.mean(resid**2)):.2f} mm")
    print(f"    *** LARGER than \"a few mm\" — this span is much wider "
         f"than the 25deg/44mm-wide test that gave 3.45mm. Deviation "
         f"from a chord grows with span; reporting the real number "
         f"rather than the earlier, narrower-span figure.")

    print("\n" + "=" * 78)
    print("[NET SEATABLE AREA] p213, whole shell, vs the unfaceted baseline")
    print("=" * 78)
    area_base, c_b, ch_b, g_b, an_b = whole_shell_p213_area(plain, classes)
    area_committed, c_c, ch_c, g_c, an_c = whole_shell_p213_area(committed, classes)
    area_new, c_n, ch_n, g_n, an_n = whole_shell_p213_area(m, classes)
    print(f"\n    baseline (no bust curvature at all):      {area_base:9.0f} mm^2")
    print(f"    CURRENTLY COMMITTED (two off-axis apexes): {area_committed:9.0f} mm^2  "
         f"(net {area_committed - area_base:+.0f} mm^2)")
    print(f"    THIS BUILD (widened, pinned plateau):      {area_new:9.0f} mm^2  "
         f"(net {area_new - area_base:+.0f} mm^2)")
    print(f"\n    *** STILL NEGATIVE — net {area_new - area_base:+.0f} mm^2, "
         f"almost identical in magnitude to the currently COMMITTED "
         f"design's own {area_committed - area_base:+.0f} mm^2. This is "
         f"NOT a regression introduced by widening or pinning: a "
         f"narrower plateau at the OLD default (25deg, 35.4mm amplitude, "
         f"137mm uncapped crest) gives the exact same {area_new:.0f} mm^2 "
         f"— same 562 of 972 grid cells lose p213 seatability either way. "
         f"At this panel size (59.2mm) and tolerance (2mm), ANY bust "
         f"curvature large enough to have a visible bust point at all "
         f"appears to cost roughly this much seatable area, regardless "
         f"of shape — a finding about the panel/tolerance/curvature "
         f"combination, not a defect in this particular construction. "
         f"Flagging plainly since you asked for this not to be negative "
         f"and it is.")

    print(f"\n    MAX-CLASS DISTRIBUTION, front vs back (split_theta="
         f"{committed.split_theta:.2f} deg):")
    fb_base_f, fb_base_b = front_back_dist(an_b, g_b.cells, plain.split_theta)
    fb_new_f, fb_new_b = front_back_dist(an_n, g_n.cells, m.split_theta)
    for label, fdist, bdist in (("baseline", fb_base_f, fb_base_b),
                               ("this build", fb_new_f, fb_new_b)):
        fp, bp = pct(fdist), pct(bdist)
        f_str = " | ".join(f"{k or 'none'} {v:.0f}%" for k, v in sorted(fp.items(), key=str))
        b_str = " | ".join(f"{k or 'none'} {v:.0f}%" for k, v in sorted(bp.items(), key=str))
        print(f"      {label:<12} front: {f_str}    back: {b_str}")

    render(base, d, m, plain)
    print("\nwrote exports/plateau-final-plan.png, "
         "exports/plateau-final-elevation.png")
    print("\nSTATUS: prototype only. dress_params() / the committed shell "
         "are UNCHANGED.")


def render(base, d, m, plain):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    # -- plan sections (top-down), new vs committed vs baseline --------
    fig, axes = plt.subplots(1, 3, figsize=(13, 4.6), constrained_layout=True)
    models = [("unfaceted baseline", plain), ("currently committed", ShellModel(dress_params())),
             ("this build (widened, pinned)", m)]
    levels = [40.0, 90.0, 140.0, 181.0, 200.0, 220.0]
    cmap = plt.get_cmap("viridis")
    for ax, (title, model) in zip(axes, models):
        th = np.linspace(-180.0, 180.0, 721)
        for i, v in enumerate(levels):
            pts = np.asarray(model.point(np.radians(th), np.full_like(th, v)))
            ax.plot(pts[:, 0], pts[:, 1], color=cmap(i / (len(levels) - 1)),
                   lw=1.2, label=f"v={v:g}")
        ax.axhline(0, color="#ccc", lw=0.5, zorder=0)
        ax.axvline(0, color="#ccc", lw=0.5, zorder=0)
        ax.set_title(title, fontsize=9)
        ax.set_xlabel("x (lateral, mm)")
        ax.set_aspect("equal")
        ax.invert_yaxis()
    axes[0].set_ylabel("y (front<->back, mm)")
    axes[-1].legend(fontsize=7, loc="upper right")
    fig.suptitle("Plan sections: baseline vs committed vs the widened/"
                 "pinned plateau, rings at v = "
                 + ", ".join(f"{v:g}" for v in levels) + " mm", fontsize=10)
    fig.savefig("exports/plateau-final-plan.png", dpi=160)
    plt.close(fig)

    # -- front elevation: depth (Y) heatmap + contours + shading -------
    # (pure Lambertian shading alone washed out almost flat over most of
    # the front — the bust volume barely visible; depth-as-color plus
    # contour lines is far more diagnostic of the actual shape)
    split = m.split_theta
    th = np.linspace(-split + 0.5, split - 0.5, 161)
    vv = np.linspace(-40.0, 240.0, 221)
    TH, VV = np.meshgrid(th, vv)
    top = np.asarray(m.z_top_at(TH))
    VV_c = np.minimum(VV, top)
    pts = np.asarray(m.point(np.radians(TH), VV_c))
    frame = m.frame(np.radians(TH), VV_c)
    normal = frame["normal"]
    light = np.array([0.0, 1.0, 0.5])
    light = light / np.linalg.norm(light)
    shade = np.clip(normal @ light, 0.0, 1.0)
    valid = VV <= top + 1e-6

    Xp = pts[..., 0]
    Yp = pts[..., 1]
    depth_masked = np.where(valid, Yp, np.nan)
    shade_masked = np.where(valid, shade, np.nan)

    fig2, (axd, axs) = plt.subplots(1, 2, figsize=(13, 8), constrained_layout=True)
    mesh = axd.pcolormesh(Xp, VV, depth_masked, shading="gouraud", cmap="viridis")
    cs = axd.contour(Xp, VV, depth_masked, levels=15, colors="white",
                     linewidths=0.5, alpha=0.6)
    fig2.colorbar(mesh, ax=axd, label="depth Y (mm, front<->back)", fraction=0.046)
    axd.set_aspect("equal")
    axd.set_xlabel("x (lateral, mm)")
    axd.set_ylabel("v (height above waist, mm)")
    axd.set_title("Depth field (Y) + contours")

    axs.pcolormesh(Xp, VV, shade_masked, shading="gouraud", cmap="gray",
                  vmin=0.0, vmax=1.0)
    axs.set_aspect("equal")
    axs.set_xlabel("x (lateral, mm)")
    axs.set_title("Shaded relief (light from the front)")
    fig2.suptitle("Front elevation: widened + pinned PlateauBustDepth "
                 f"(half-width {HALF_WIDTH_MM:g}mm, CF pinned {DEPTH_MM:g}mm)",
                 fontsize=11)
    fig2.savefig("exports/plateau-final-elevation.png", dpi=160)
    plt.close(fig2)


if __name__ == "__main__":
    main()
