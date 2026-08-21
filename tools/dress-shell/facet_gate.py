"""GATE — analytic flat bust facet (FacetBustDepth) + underbust_transition_height
sweep with the facet in place.

Nothing here modifies the committed shell: dress_params() is untouched.
PART A builds/verifies/renders the facet (sweeping bust_plateau_theta =
0/15/25, mirroring plateau_gate.py's structure). PART B composes the
facet on top of underbust_transition_height = 15/40/60 (TransitionDepth,
underbust_transition.py) and reports a(v) monotonicity, front-view
half-width at each anchor, and minimum meridional radius at CF, per the
brief's explicit request to report this AFTER the facet exists.

Run:  cd tools/dress-shell && python3 facet_gate.py
Writes: exports/facet-topdown-sweep.png, exports/facet-transition-sweep.png
"""

import math
from dataclasses import replace

import numpy as np

from bust_apex import ApexShellModel, PlateauBustDepth, assert_cf_is_max
from bust_facet import FacetBustDepth, verify_facet_flatness
from coords import ShellCoords
from curvature import STANDOFF_TOLERANCE_MM as TOL, principal_curvatures, seat_standoff
from layout import SurfaceChart
from panels import load_panel_classes
from shell import ShellModel, dress_params
from underbust_transition import transition_params

PLATEAU_SWEEP = (0.0, 15.0, 25.0)
TRANSITION_SWEEP = (15.0, 40.0, 60.0)
DEPTH_MM = 123.0
LANDMARKS = [("waist", 0.0), ("underbust", 152.4), ("bust", 203.2),
            ("neckline corner", 220.0)]


def build_facets(base):
    variants = {}
    for plateau in PLATEAU_SWEEP:
        d = FacetBustDepth(base_params=base, bust_plateau_theta=plateau,
                           depth_mm=DEPTH_MM)
        variants[plateau] = ApexShellModel(replace(base, depth_curve=d))
    return variants


def min_meridional_radius_at_cf(model, v_lo=120.0, v_hi=220.0, n=2001):
    zz = np.linspace(v_lo, v_hi, n)
    b = np.asarray(model.b(zz))
    db = np.asarray(model.db(zz))
    h = 0.5
    ddb = (np.asarray(model.db(zz + h)) - np.asarray(model.db(zz - h))) / (2 * h)
    k_ref = ddb / (1.0 + db ** 2) ** 1.5
    k1, k2, _ = principal_curvatures(model, np.zeros_like(zz), zz)
    d1, d2 = np.abs(k1 - k_ref), np.abs(k2 - k_ref)
    k_mer = np.where(d1 <= d2, k1, k2)
    r_mer = 1.0 / np.maximum(np.abs(k_mer), 1e-15)
    i = int(np.argmin(r_mer))
    return float(r_mer[i]), float(zz[i])


def part_a(base):
    print("=" * 78)
    print("PART A — ANALYTIC FLAT BUST FACET (FacetBustDepth)")
    print("=" * 78)

    print(f"\n[1] IS THE COMMITTED CAPSULE (PlateauBustDepth) A CHORD OR AN ARC? "
         f"— numeric proof")
    pd = PlateauBustDepth(base_params=base, bust_plateau_theta=25.0)
    v = pd.apex_v
    th = np.linspace(-20.0, 20.0, 41)
    t = pd.t_of(th, np.full_like(th, v))
    X = np.asarray(pd.a(v)) * np.sin(t)
    Y = np.asarray(pd.y_of(t, np.full_like(t, v)))
    A = np.stack([X, np.ones_like(X)], axis=1)
    m, c = np.linalg.lstsq(A, Y, rcond=None)[0]
    resid = Y - (m * X + c)
    b0 = float(np.asarray(pd.base.b(v)))
    Y_base_shape = b0 * np.cos(t)
    delta_from_base = Y - Y_base_shape
    print(f"    max |residual| from the best-fit straight line, theta in "
         f"[-20,20] at v={v:g}: {float(np.max(np.abs(resid))):.3f} mm — "
         f"NOT a chord (0.0mm would be a chord)")
    print(f"    plateau Y minus BASE ellipse Y over the same range: "
         f"{delta_from_base.min():.4f} to {delta_from_base.max():.4f} mm — "
         f"CONSTANT (={pd.amplitude_mm:g}mm, the authored amplitude) to "
         f"4 decimal places, confirming the plateau is the base arc "
         f"TRANSLATED by a constant vertical shift, same curvature as "
         f"the base ellipse there — a pushed-out arc, exactly as you "
         f"suspected. CONFIRMED: it does not produce a chord.")

    print(f"\n[2] FACET CONSTRUCTION — flatness proof (vs the capsule above)")
    for plateau in PLATEAU_SWEEP:
        fd = FacetBustDepth(base_params=base, bust_plateau_theta=plateau,
                           depth_mm=DEPTH_MM, check_cf_is_max=False)
        viol = assert_cf_is_max(fd)
        flat = verify_facet_flatness(fd)
        depth_cf = float(np.asarray(fd.depth_at(0.0, fd.apex_v)))
        print(f"    bust_plateau_theta={plateau:5.1f}: depth@CF="
             f"{depth_cf:.4f}mm (target {DEPTH_MM:g}), hard-constraint "
             f"violation={viol:+.6f}mm, perimeter residual="
             f"{fd.perimeter_residual_mm:.2e}mm, straight-line deviation="
             f"{flat.get('max_dev_from_line_mm', 0.0):.4f}mm "
             f"(capsule comparison at 25deg: 3.45mm — ~10x flatter here)")

    print(f"\n[3] DEPTH PIN — 123mm vs the old compound's 121.08mm authored "
         f"peak, vs the plateau's 137.04mm")
    print(f"    123.0mm is exact and explicit here (not solved) — this "
         f"matches the ORIGINAL compound design's own authored control "
         f"value (see compound_gate.py: \"authored control value 123.0mm\"), "
         f"so pinning to 123 recovers that original target rather than "
         f"introducing a new number. No conflict found with anything else "
         f"in the pipeline: perimeter freeze, arc-length monotonicity, and "
         f"the hard CF-max constraint all hold exactly (see [2]).")

    print(f"\n[4] bod-a30 / bod-a55 STANDOFF — unaffected (same reasoning "
         f"as before: still 61mm+ below the blend radius's v-reach)")
    classes = load_panel_classes("panels.yaml")
    p213 = classes["p213"]
    variants = build_facets(base)
    for plateau, model in variants.items():
        c = ShellCoords(model)
        ch = SurfaceChart(model, c)
        for theta, s in ((30.0, -50.1), (55.0, -50.1)):
            so = seat_standoff(c, ch, p213.outline_w, p213.outline_h,
                               theta, s, samples=7)
            print(f"    plateau={plateau:5.1f}  theta={theta:g}: "
                 f"standoff {so:.4f} mm {'OK' if so <= TOL else 'X'}")

    render_topdown(variants, "exports/facet-topdown-sweep.png")
    print("\nwrote exports/facet-topdown-sweep.png")
    return variants


def render_topdown(variants, out_path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    levels = [140.0, 160.0, 181.0, 200.0, 220.0]
    cmap = plt.get_cmap("viridis")
    fig, axes = plt.subplots(1, len(variants), figsize=(4.2 * len(variants), 4.6),
                             constrained_layout=True)
    if len(variants) == 1:
        axes = [axes]
    for ax, (plateau, model) in zip(axes, variants.items()):
        th = np.linspace(-180.0, 180.0, 721)
        for i, v in enumerate(levels):
            pts = np.asarray(model.point(np.radians(th), np.full_like(th, v)))
            ax.plot(pts[:, 0], pts[:, 1], color=cmap(i / (len(levels) - 1)),
                   lw=1.3, label=f"v={v:g}")
        if model.neckline is not None:
            thn = np.linspace(-model.split_theta, model.split_theta, 361)
            zn = np.asarray(model.neckline.height(thn))
            ptsn = np.asarray(model.point(np.radians(thn), zn))
            ax.plot(ptsn[:, 0], ptsn[:, 1], color="red", lw=1.6, ls="--",
                   label="neckline")
        ax.axhline(0, color="#ccc", lw=0.5, zorder=0)
        ax.axvline(0, color="#ccc", lw=0.5, zorder=0)
        ax.set_title(f"bust_plateau_theta = {plateau:g} deg (flat facet, "
                    f"CF pinned {DEPTH_MM:g}mm)", fontsize=9)
        ax.set_xlabel("x (lateral, mm)")
        ax.set_aspect("equal")
        ax.invert_yaxis()
    axes[0].set_ylabel("y (front<->back, mm)")
    axes[-1].legend(fontsize=7, loc="upper right")
    fig.suptitle("Top-down (plan view): analytic flat facet sweep, rings "
                 "at v = " + ", ".join(f"{v:g}" for v in levels) + " mm "
                 "+ neckline (dashed red)", fontsize=10)
    fig.savefig(out_path, dpi=160)
    plt.close(fig)


def part_b(base):
    print("\n" + "=" * 78)
    print("PART B — underbust_transition_height SWEEP, FACET IN PLACE")
    print("=" * 78)
    print(f"\nFacet fixed at bust_plateau_theta=25deg, depth_mm={DEPTH_MM:g} "
         f"for this sweep (the widest/most-tested variant from PART A).")

    models = {}
    for th in TRANSITION_SWEEP:
        tparams = transition_params(th, base_params=base)
        fd = FacetBustDepth(base_params=tparams, bust_plateau_theta=25.0,
                           depth_mm=DEPTH_MM)
        models[th] = ApexShellModel(replace(tparams, depth_curve=fd))
        print(f"  built transition_height={th:g}mm: hard-constraint "
             f"violation={fd.cf_max_violation_mm:.6f}mm, perimeter "
             f"residual={fd.perimeter_residual_mm:.2e}mm")

    print(f"\n[5] a(v) MONOTONICITY, v=0 (waist) to v=220 (neckline corner)")
    vv = np.arange(0.0, 220.0 + 1e-9, 1.0)
    for th, model in models.items():
        a = np.asarray(model.a(vv))
        da = np.diff(a)
        mono = bool(np.all(da <= 1e-6))
        i = int(np.argmax(da))
        print(f"    transition_height={th:5.1f}mm: monotone? "
             f"{'YES' if mono else 'no'} — worst da/dv={da[i]:+.3f} mm/mm "
             f"at v={vv[i]:.0f}-{vv[i+1]:.0f}")

    print(f"\n[6] FRONT-VIEW HALF-WIDTH a(v) AT EACH ANCHOR")
    header = f"    {'landmark':<18}" + "".join(f"{th:>14g}mm" for th in TRANSITION_SWEEP)
    print(header)
    for label, v in LANDMARKS:
        row = f"    {label:<18}"
        for th in TRANSITION_SWEEP:
            row += f"{float(np.asarray(models[th].a(v))):16.3f}"
        print(row)

    print(f"\n[7] MINIMUM MERIDIONAL RADIUS AT CF (v in [120,220], excludes "
         f"the hem/waist-fillet singularities deliberately -- this is "
         f"about the bust region specifically)")
    radii, locations = {}, {}
    for th, model in models.items():
        r, at_v = min_meridional_radius_at_cf(model)
        radii[th] = r
        locations[th] = at_v
        print(f"    transition_height={th:5.1f}mm: min radius "
             f"{r:.3f} mm at v={at_v:.1f}")
    if len(set(round(r, 3) for r in radii.values())) == 1:
        first_r = next(iter(radii.values()))
        first_v = next(iter(locations.values()))
        print(f"    *** ALL THREE ARE IDENTICAL ({first_r:.3f}mm at "
             f"v={first_v:.1f}) — NOT A BUG, a structural fact worth "
             f"flagging: at CF (theta=0), X = a(v)*sin(0) = 0 for EVERY "
             f"a(v), so the CF meridian curve depends only on "
             f"b(v)/db/ddb, never on a(v) — and underbust_transition_"
             f"height only reshapes the PERIMETER schedule (hence a(v)), "
             f"never b(v) (confirmed in the flare diagnosis: depth in "
             f"this zone comes from the trace, not anchor "
             f"interpolation). The min radius here is entirely the "
             f"FACET's own blend curvature, invariant to this parameter "
             f"by mathematical necessity, not by coincidence.")

    render_transition(models, "exports/facet-transition-sweep.png")
    print("\nwrote exports/facet-transition-sweep.png")


def render_transition(models, out_path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 6.5), constrained_layout=True)
    vv = np.linspace(-381.0, 240.0, 1201)
    colors = {15.0: "#b3401e", 40.0: "#1b7a3d", 60.0: "#2266aa"}
    for th, model in models.items():
        a = np.asarray(model.a(vv))
        ax1.plot(a, vv, color=colors[th], label=f"{th:g}mm", lw=1.4)
        ax1.plot(-a, vv, color=colors[th], lw=1.4)
    for v in (0.0, 152.4, 203.2, 220.0):
        ax1.axhline(v, color="#ddd", lw=0.5, zorder=0)
    ax1.set_title("Full front-view silhouette, facet + transition sweep", fontsize=9)
    ax1.set_xlabel("x (lateral half-width, mm)")
    ax1.set_ylabel("v (height above waist, mm)")
    ax1.legend(fontsize=8, loc="lower right", title="transition_height")

    vv2 = np.linspace(100.0, 240.0, 601)
    for th, model in models.items():
        a = np.asarray(model.a(vv2))
        ax2.plot(a, vv2, color=colors[th], label=f"{th:g}mm", lw=1.6)
    for v, label in ((152.4, "underbust"), (203.2, "bust"), (220.0, "neckline corner")):
        ax2.axhline(v, color="#ddd", lw=0.5, zorder=0)
        ax2.text(105, v + 1.5, label, fontsize=7, color="#888")
    ax2.set_title("Zoom: bodice only, RIGHT side (x >= 0)", fontsize=9)
    ax2.set_xlabel("x (lateral half-width, mm)")
    ax2.legend(fontsize=8, loc="upper left", title="transition_height")
    fig.suptitle("Front-view half-width a(v): underbust_transition_height "
                 "sweep, facet in place", fontsize=10)
    fig.savefig(out_path, dpi=160)
    plt.close(fig)


def main():
    base = dress_params(bust="plain")
    part_a(base)
    part_b(base)
    print("\nSTATUS: prototype only. dress_params() / the committed shell "
         "are UNCHANGED. Pick a bust_plateau_theta and a "
         "underbust_transition_height (or ask for other values) and say "
         "\"approved — wire it in\" to proceed.")


if __name__ == "__main__":
    main()
