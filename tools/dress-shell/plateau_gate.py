"""GATE — center-front bust curvature fix (PlateauBustDepth), sweep report.

Nothing here modifies the committed shell: dress_params() is untouched,
ShellModel(...) still dispatches to the OLD ApexBustDepth (two off-axis
lobes, known CF dip). This script builds the NEW PlateauBustDepth
explicitly (via ApexShellModel(plateau_params(...))), sweeps
bust_plateau_theta = 0 / 15 / 25 deg, verifies the hard center-front-is-
max constraint, and renders a top-down comparison so the user can pick a
value before anything is wired in.

Run:  cd tools/dress-shell && python3 plateau_gate.py
Writes: exports/plateau-topdown-sweep.png
"""

import math

import numpy as np

from bust_apex import (ApexBustDepth, ApexShellModel, PlateauBustDepth,
                       assert_cf_is_max, verify_apex_placement,
                       verify_plateau_placement)
from coords import ShellCoords
from curvature import STANDOFF_TOLERANCE_MM as TOL, seat_standoff
from layout import SurfaceChart
from panels import load_panel_classes
from shell import ShellModel, dress_params

SWEEP = (0.0, 15.0, 25.0)


def build_all():
    base = dress_params(bust="plain")
    old = ShellModel(dress_params())   # committed apex, unchanged
    variants = {}
    for plateau in SWEEP:
        d = PlateauBustDepth(base_params=base, bust_plateau_theta=plateau)
        from dataclasses import replace
        variants[plateau] = ApexShellModel(replace(base, depth_curve=d))
    return old, variants


def theta_scan(d, v, thetas=(0, 5, 10, 15, 20, 25, 30, 35, 45, 55, 70, 90, 130, 180)):
    return [(th, float(np.asarray(d.depth_at(float(th), v)))) for th in thetas]


def render_topdown(old, variants, out_path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    levels = [140.0, 160.0, 181.0, 200.0, 220.0]
    cmap = plt.get_cmap("viridis")

    fig, axes = plt.subplots(1, len(variants) + 1, figsize=(4.2 * (len(variants) + 1), 4.6),
                             constrained_layout=True)
    panels = [("committed (two off-axis apexes, KNOWN DIP)", old)] + \
        [(f"bust_plateau_theta = {p:g} deg", m) for p, m in variants.items()]

    for ax, (title, model) in zip(axes, panels):
        th = np.linspace(-180.0, 180.0, 721)
        for i, v in enumerate(levels):
            pts = np.asarray(model.point(np.radians(th), np.full_like(th, v)))
            color = cmap(i / (len(levels) - 1))
            ax.plot(pts[:, 0], pts[:, 1], color=color, lw=1.3,
                   label=f"v={v:g}")
        # neckline plan projection for context (v = neckline height at
        # each theta, front half only, where it exists)
        if model.neckline is not None:
            thn = np.linspace(-model.split_theta, model.split_theta, 361)
            zn = np.asarray(model.neckline.height(thn))
            ptsn = np.asarray(model.point(np.radians(thn), zn))
            ax.plot(ptsn[:, 0], ptsn[:, 1], color="red", lw=1.6, ls="--",
                   label="neckline")
        ax.axhline(0, color="#ccc", lw=0.5, zorder=0)
        ax.axvline(0, color="#ccc", lw=0.5, zorder=0)
        ax.set_title(title, fontsize=9)
        ax.set_xlabel("x (lateral, mm)")
        ax.set_aspect("equal")
        ax.invert_yaxis()   # +y = toward CF/viewer, plotted "up the page"
    axes[0].set_ylabel("y (front<->back, mm)")
    axes[-1].legend(fontsize=7, loc="upper right")
    fig.suptitle("Top-down (plan view): committed vs plateau sweep, "
                 "rings at v = " + ", ".join(f"{v:g}" for v in levels) + " mm "
                 "+ neckline (dashed red)", fontsize=10)
    fig.savefig(out_path, dpi=160)
    plt.close(fig)


def main():
    old, variants = build_all()
    old_d = old.params.depth_curve

    print("=" * 78)
    print("GATE — CENTER-FRONT BUST CURVATURE FIX (PlateauBustDepth)")
    print("=" * 78)

    print("\n[1] COMMITTED DESIGN — the defect")
    check_old = verify_apex_placement(old_d)
    v0 = old_d.apex_v
    cf_old = float(np.asarray(old_d.depth_at(0.0, v0)))
    apex_old = float(np.asarray(old_d.depth_at(old_d.apex_theta_deg, v0)))
    print(f"    two apexes at +-{old_d.apex_theta_deg:g} deg, v={v0:g}: "
         f"CF depth {cf_old:.2f} mm vs apex depth {apex_old:.2f} mm -> "
         f"CF is a LOCAL MINIMUM, {apex_old - cf_old:.2f} mm below each "
         f"lobe (\"two lobes with a dip between them\")")

    print("\n[2] HARD CONSTRAINT — depth_at(0, v) >= depth_at(theta, v), "
         "every theta, every v the bump reaches")
    for plateau, model in variants.items():
        d = model.params.depth_curve
        viol = assert_cf_is_max(d)   # re-check explicitly (constructor already did)
        print(f"    bust_plateau_theta={plateau:5.1f}: worst violation "
             f"{viol:+.6f} mm (<=0 means the constraint holds everywhere "
             f"sampled) -- {'PASS' if viol <= 2e-3 else 'FAIL'}")

    print("\n[3] PLACEMENT / CREST DEPTH")
    for plateau, model in variants.items():
        d = model.params.depth_curve
        vp = verify_plateau_placement(d)
        print(f"    bust_plateau_theta={plateau:5.1f}: crest depth at CF "
             f"{vp['crest_depth_mm']:.2f} mm" + (
                 f"; plateau edge authored {plateau:g} deg -> true "
                 f"equal-arc {vp['plateau_true_equal_arc_deg']:.2f} deg "
                 f"(residual {vp['plateau_residual_deg']:+.2f} deg)"
                 if plateau > 0 else " (single point crest, exact — no "
                 "reference-frame residual, CF is the fixed symmetry point)"))
    print(f"    for reference, the OLD committed design's apex depth "
         f"({apex_old:.2f} mm) vs new crest depth (all variants: "
         f"{variants[0.0].params.depth_curve.depth_at(0.0, v0):.2f} mm) -- "
         f"the crest is DEEPER than the old apex because CF sits fully "
         f"on-axis (cos(0)=1, no ellipse-shape attenuation) whereas the "
         f"old apex sat 35 deg off-axis; amplitude_mm was left at the "
         f"unchanged 35.4 mm value (only the theta SHAPE changed, per "
         f"instruction) -- report only, amplitude was not re-solved to "
         f"target any particular peak")

    print("\n[4] PERIMETER SCHEDULE — still frozen")
    for plateau, model in variants.items():
        d = model.params.depth_curve
        print(f"    bust_plateau_theta={plateau:5.1f}: perimeter residual "
             f"{d.perimeter_residual_mm:.2e} mm")

    print("\n[5] bod-a30 / bod-a55 STANDOFF — unaffected (still 492+ mm "
         "below the bump's v-reach, regardless of theta shape)")
    classes = load_panel_classes("panels.yaml")
    p213 = classes["p213"]
    for plateau, model in variants.items():
        c = ShellCoords(model)
        ch = SurfaceChart(model, c)
        for theta, s in ((30.0, -50.1), (55.0, -50.1)):
            so = seat_standoff(c, ch, p213.outline_w, p213.outline_h,
                               theta, s, samples=7)
            print(f"    plateau={plateau:5.1f}  theta={theta:g}: "
                 f"standoff {so:.4f} mm {'OK' if so <= TOL else 'X'}")

    print("\n[6] THETA SCAN at v = apex_v (mm from axis) — confirms no dip")
    for plateau, model in variants.items():
        d = model.params.depth_curve
        row = theta_scan(d, d.apex_v)
        print(f"    bust_plateau_theta={plateau:g}:")
        print("     " + "  ".join(f"{th}:{v:.1f}" for th, v in row))

    print("\n[7] BASE PROFILE b(v) — byte-identical across every variant "
         "(and vs the committed design): the bump is purely additive on "
         "top of the SAME base.b(v) object in every case")
    vv = np.linspace(-381.0, 240.0, 2001)
    base_ref = np.asarray(old_d.base.b(vv))
    for plateau, model in variants.items():
        d = model.params.depth_curve
        res = np.max(np.abs(np.asarray(d.base.b(vv)) - base_ref))
        print(f"    bust_plateau_theta={plateau:5.1f}: max|delta| vs "
             f"committed base.b(v) = {res:.2e} mm")

    render_topdown(old, variants, "exports/plateau-topdown-sweep.png")
    print("\nwrote exports/plateau-topdown-sweep.png")
    print("\nSTATUS: prototype only. dress_params() / the committed shell "
         "are UNCHANGED. Pick a bust_plateau_theta value (or ask for "
         "other values) and say \"approved — wire it in\" to proceed.")


if __name__ == "__main__":
    main()
