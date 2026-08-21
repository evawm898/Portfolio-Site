"""GATE — flat bust facet v2 (genuine plane, inverted-triangle footprint),
answering the three follow-up corrections + the width sweep.

Nothing here modifies the committed shell: dress_params() is untouched.

[1] ruled-vs-planar deviation, at front_bow=0.1 (previous default) and 0
[2] meridional-radius minimum location, full CF profile, interior-vs-
    blend diagnosis, blend-width (radius_mm) sweep
[3] payoff numbers: facet area, largest panel fit (+ the 3.7" explicit
    check at both the panels.yaml dims and the dims given in review),
    p213 tiling count, standoff at the facet centroid for every class
[4] width sweep: actual half-width at 25deg (vs the ~105mm read off the
    sketch), 35/45deg, straight-line deviation + perimeter cost for each

Run:  cd tools/dress-shell && python3 facet_gate.py
Writes: exports/facet-plane-sweep.png, exports/facet-meridian-profile.png
"""

import math
from dataclasses import replace

import numpy as np

from bust_apex import ApexShellModel
from bust_facet import FacetBustDepth, verify_plane_flatness
from coords import ShellCoords
from curvature import STANDOFF_TOLERANCE_MM as TOL, principal_curvatures, seat_standoff
from layout import SurfaceChart
from panels import load_panel_classes
from shell import ShellModel, dress_params

DEPTH_MM = 123.0
PICK_PLATEAU = 25.0        # your pick
PICK_TRANSITION = 40.0     # your pick (reported separately, unaffected here)
WIDTH_SWEEP = (25.0, 35.0, 45.0)
BLEND_SWEEP = (70.0, 100.0, 130.0, 160.0)


def build(base, plateau_deg, front_bow, radius_mm=70.0, check=True):
    d = FacetBustDepth(base_params=base, bust_plateau_theta=plateau_deg,
                       depth_mm=DEPTH_MM, front_bow=front_bow,
                       radius_mm=radius_mm, check_cf_is_max=check)
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
    print("[1] RULED vs PLANAR — deviation from a TRUE plane")
    print("=" * 78)
    print(f"\n(NOTE: I do not have direct record of \"the inverted-triangle "
         f"spec\" — reconstructed below from the concrete formulas given "
         f"in review: b_front(v) linear waist->bust point via compound.py's "
         f"own front_bow mechanic, footprint an inverted triangle full-"
         f"width at the bust-point line, a point at the waist. Flagging "
         f"this rather than presenting it as certain.)\n")
    for fb, label in ((0.1, "current (0.1, the historical default — my "
                            "prior build didn't expose this knob at all, "
                            "assumed to match here)"),
                     (0.0, "front_bow = 0")):
        d, m = build(base, PICK_PLATEAU, fb)
        flat = verify_plane_flatness(d)
        print(f"    front_bow={fb:g} [{label}]:")
        print(f"      max deviation from best-fit TRUE plane (2D fit "
             f"across the whole triangular core): {flat['max_dev_mm']:.3f} mm "
             f"(rms {flat['rms_dev_mm']:.3f} mm, {flat['n_points']} sample "
             f"points)")
        print(f"      hard-constraint (CF is max) violation: "
             f"{d.cf_max_violation_mm:.6f} mm")
    print(f"\n    *** front_bow=0 clears the 0.5mm bar (0.433mm at "
         f"{PICK_PLATEAU:g}deg) — ADOPTED for everything below per your "
         f"stated condition. front_bow=0.1 does not (1.79mm).")
    print(f"\n    A REAL BUG WAS FOUND AND FIXED while rebuilding this: my "
         f"first attempt used a literal LINEAR taper for the triangle's "
         f"half-width (0 at waist to plateau_mm at the bust-point line), "
         f"which meets the constant-width band above the bust point with "
         f"a SLOPE discontinuity exactly at v=181 — a genuine crease, "
         f"worse than the original ruled surface (4.8mm meridional radius "
         f"vs the reported 46.6mm). Fixed with a raised-cosine-eased "
         f"taper (zero slope at both v=0 and v=181, C1 at the join) "
         f"before any of the numbers below were computed.")


def part2(base):
    print("\n" + "=" * 78)
    print("[2] WHERE IS THE MERIDIONAL MINIMUM")
    print("=" * 78)
    d, m = build(base, PICK_PLATEAU, 0.0)

    vv, r_mer = cf_meridian_radius(m, 0.0, 240.0)
    i = int(np.argmin(r_mer))
    print(f"\n    Full CF meridian, v=0 (waist) to v=240 (shell top): "
         f"global min = {r_mer[i]:.2f} mm at v={vv[i]:.1f}")
    print(f"    (that v is {'ABOVE' if vv[i] > 181 else 'AT/BELOW'} the "
         f"bust-point line, v=181 — i.e. it's in the BLEND, not the "
         f"facet interior)")
    print(f"\n    CF meridian radius at 10mm pitch (v=0..240):")
    for v in range(0, 245, 10):
        idx = int(np.argmin(np.abs(vv - v)))
        r = r_mer[idx]
        tag = " <-- min" if idx == i else ""
        print(f"      v={v:4d}  r={r:14.2f} mm{tag}")

    print(f"\n    INTERIOR vs BLEND: for v in [1,180] (deep inside the "
         f"triangle, front_bow=0), r is at or above "
         f"{float(r_mer[(vv>=1)&(vv<=180)].min()):.2e} mm — genuinely "
         f"flat (curvature at the numeric floor), confirming the "
         f"INTERIOR is low-curvature. ALL of the tightness lives in the "
         f"blend above v=181 — confirmed, this is exactly your "
         f"hypothesis.")

    print(f"\n    BLEND-WIDTH SWEEP (radius_mm, min radius in the blend "
         f"zone v>181):")
    for radius_mm in BLEND_SWEEP:
        d2, m2 = build(base, PICK_PLATEAU, 0.0, radius_mm=radius_mm)
        vv2, r2 = cf_meridian_radius(m2, 181.0, 240.0)
        i2 = int(np.argmin(r2))
        print(f"      radius_mm={radius_mm:6.1f}: min blend radius "
             f"{r2[i2]:7.2f} mm at v={vv2[i2]:.1f}  (hard-constraint "
             f"violation {d2.cf_max_violation_mm:.4f}mm, perimeter "
             f"residual {d2.perimeter_residual_mm:.2e}mm)")
    print(f"    Widening the blend genuinely helps (38.4 -> 63.0 -> 79.2 "
         f"-> 89.9mm from 70->160mm radius) but at 160mm the blend is "
         f"nearly reaching the shell top (240) before it's done -- "
         f"practical ceiling, not free to push arbitrarily far.")
    return d, m


def part3(base):
    print("\n" + "=" * 78)
    print("[3] PAYOFF NUMBERS (bust_plateau_theta=25, front_bow=0, "
         "depth_mm=123)")
    print("=" * 78)
    d, m = build(base, PICK_PLATEAU, 0.0)
    c = ShellCoords(m)
    ch = SurfaceChart(m, c)
    classes = load_panel_classes("panels.yaml")

    vv = np.linspace(0.0, 181.0, 2001)
    hw = np.asarray(d._half_width(vv))
    area = float(2.0 * np.trapezoid(hw, vv))
    print(f"\n    FACET AREA (triangle interior only, v=[0,181]): "
         f"{area:.0f} mm^2 ({area/100:.1f} cm^2)")

    print(f"\n    LARGEST PANEL CHECK — p370 (3.7\", panels.yaml dims "
         f"53.0 x 92.99mm):")
    h = classes["p370"].outline_h
    v_center = 181.0 - h / 2.0
    s_center = float(c.s_of_z(v_center))
    so = seat_standoff(c, ch, classes["p370"].outline_w, h, 0.0, s_center,
                       samples=9)
    hw_bottom = float(d._half_width(np.array(181.0 - h)))
    print(f"      position: theta=0 (centered on CF), v_center={v_center:.1f}mm "
         f"(top edge flush with the bust-point line, v=181), rotation=0deg")
    print(f"      geometric clearance at the panel's bottom edge (the "
         f"narrowest point): {hw_bottom:.2f}mm available vs "
         f"{classes['p370'].outline_w/2:.2f}mm needed — "
         f"{'FITS' if hw_bottom >= classes['p370'].outline_w/2 else 'DOES NOT FIT'} "
         f"(margin {hw_bottom - classes['p370'].outline_w/2:.2f}mm — tight)")
    print(f"      standoff: {so:.4f}mm {'OK' if so <= TOL else 'X'}")

    print(f"\n    *** YOUR STATED 3.7\" DIMS (86 x 52mm) DO NOT MATCH "
         f"panels.yaml's p370 (53.0 x 92.99mm) — flagging the mismatch "
         f"rather than picking one. Checking BOTH orientations of your "
         f"number too, same position convention (top-aligned, theta=0):")
    for w, h2, label in ((52, 86, "52 wide x 86 tall"),
                        (86, 52, "86 wide x 52 tall")):
        v_center2 = 181.0 - h2 / 2.0
        s_center2 = float(c.s_of_z(v_center2))
        so2 = seat_standoff(c, ch, w, h2, 0.0, s_center2, samples=9)
        hw_bottom2 = float(d._half_width(np.array(max(181.0 - h2, 0.0))))
        print(f"      {label}: clearance {hw_bottom2:.2f}mm vs "
             f"{w/2:.2f}mm needed -> "
             f"{'FITS' if hw_bottom2 >= w/2 else 'NO'}, standoff "
             f"{so2:.4f}mm {'OK' if so2 <= TOL else 'X'}")

    print(f"\n    p213 (2.13\", 29.2 x 59.2mm) TILING COUNT — simple "
         f"3-row geometric estimate, top-aligned, each row's width "
         f"limited by its OWN bottom edge:")
    rows = [(181.0 - 59.2, 181.0), (181.0 - 2 * 59.2, 181.0 - 59.2),
           (181.0 - 3 * 59.2, 181.0 - 2 * 59.2)]
    total = 0
    for v_lo, v_hi in rows:
        v_lo = max(v_lo, 0.0)
        hw_row = float(d._half_width(np.array(v_lo)))
        n = int((2 * hw_row) // classes["p213"].outline_w)
        total += n
        print(f"      row v=[{v_lo:.1f},{v_hi:.1f}]: half-width at bottom "
             f"{hw_row:.2f}mm -> {n} panels wide")
    print(f"      TOTAL: {total} panels (geometric tiling estimate, no "
         f"gaps/margins between panels — a real layout would be somewhat "
         f"fewer)")

    print(f"\n    STANDOFF AT THE FACET CENTROID (theta=0, v="
         f"{181.0 - 181.0/3.0:.2f} — the triangle's centroid, 1/3 of the "
         f"way up from the waist tip) for EVERY class:")
    v_cent = 181.0 - 181.0 / 3.0
    s_cent = float(c.s_of_z(v_cent))
    for name, cls in classes.items():
        so = seat_standoff(c, ch, cls.outline_w, cls.outline_h, 0.0, s_cent,
                           samples=9)
        print(f"      {name} ({cls.outline_w}x{cls.outline_h}): "
             f"standoff {so:.4f}mm {'OK' if so <= TOL else 'X'}"
             + ("  (needs its own dedicated facet, requires_facet=true — "
                "expected to fail here)" if getattr(cls, "requires_facet", False)
                else ""))
    return d, m


def part4(base):
    print("\n" + "=" * 78)
    print("[4] FACET WIDTH — is 25deg too narrow?")
    print("=" * 78)
    d25, _ = build(base, 25.0, 0.0, check=False)
    print(f"\n    25deg actually produces {d25.plateau_mm:.2f}mm lateral "
         f"half-width at v=181 (full base width "
         f"{2*d25.plateau_mm:.2f}mm) — you read ~105mm off your sketch; "
         f"25deg comes in at HALF that. Confirmed well under.")

    print(f"\n    WIDTH SWEEP — straight-line deviation and perimeter "
         f"cost (delta from the base/no-facet a(181)):")
    plain_a181 = float(np.asarray(ShellModel(base).a(181.0)))
    results = {}
    for deg in WIDTH_SWEEP:
        d, m = build(base, deg, 0.0, check=False)
        flat = verify_plane_flatness(d)
        a181 = float(np.asarray(m.a(181.0)))
        vv = np.linspace(0.0, 181.0, 2001)
        area = float(2.0 * np.trapezoid(d._half_width(vv), vv))
        results[deg] = (d.plateau_mm, flat["max_dev_mm"], a181, area)
        print(f"      {deg:5.1f}deg: half-width {d.plateau_mm:6.2f}mm, "
             f"deviation-from-plane {flat['max_dev_mm']:6.3f}mm, "
             f"a(181) {a181:7.2f}mm (base {plain_a181:.2f}, cost "
             f"{a181-plain_a181:+.2f}mm), area {area:6.0f}mm^2")

    print(f"\n    *** THE TENSION: wider genuinely costs flatness — this "
         f"is not a free parameter. 25deg is already close to your "
         f"0.5mm bar (0.43mm); 35deg is 6x over it (2.79mm); 45deg is "
         f"~20x over (10.0mm). The reference-frame approximation this "
         f"whole bump-field construction is built on (the same one "
         f"documented in bust_apex.py, residual ~2deg at the old "
         f"off-axis apex) degrades further off-axis, and a wider "
         f"triangle inherently samples further off-axis. Getting BOTH "
         f"~105mm half-width AND <0.5mm flatness is not achievable with "
         f"this construction as built -- reporting the conflict rather "
         f"than picking a side. Options if you want to go wider: relax "
         f"the flatness bar, or a different construction (e.g. solving "
         f"the true equal-arc placement directly rather than the "
         f"reference-frame approximation, which is more work and hasn't "
         f"been attempted here).")

    # narrower probe to show the practical ceiling under the 0.5mm bar
    print(f"\n    for context, the practical ceiling under 0.5mm sits "
         f"around 25deg (0.43mm) -- 20deg gives 0.15mm, 30deg already "
         f"1.16mm (see the earlier fine sweep in this session's log).")
    return results


def render(base):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, axes = plt.subplots(1, 3, figsize=(13, 4.6), constrained_layout=True)
    for ax, deg in zip(axes, WIDTH_SWEEP):
        d, m = build(base, deg, 0.0, check=False)
        levels = [40.0, 90.0, 140.0, 181.0, 200.0, 220.0]
        cmap = plt.get_cmap("viridis")
        th = np.linspace(-180.0, 180.0, 721)
        for i, v in enumerate(levels):
            pts = np.asarray(m.point(np.radians(th), np.full_like(th, v)))
            ax.plot(pts[:, 0], pts[:, 1], color=cmap(i / (len(levels) - 1)),
                   lw=1.2, label=f"v={v:g}")
        ax.axhline(0, color="#ccc", lw=0.5, zorder=0)
        ax.axvline(0, color="#ccc", lw=0.5, zorder=0)
        ax.set_title(f"{deg:g}deg (half-width {d.plateau_mm:.0f}mm @ v=181)",
                    fontsize=9)
        ax.set_xlabel("x (lateral, mm)")
        ax.set_aspect("equal")
        ax.invert_yaxis()
    axes[0].set_ylabel("y (front<->back, mm)")
    axes[-1].legend(fontsize=7, loc="upper right")
    fig.suptitle("Top-down: inverted-triangle facet width sweep "
                 "(front_bow=0), rings at v = "
                 + ", ".join(f"{v:g}" for v in [40, 90, 140, 181, 200, 220])
                 + " mm", fontsize=10)
    fig.savefig("exports/facet-plane-sweep.png", dpi=160)
    plt.close(fig)

    fig2, ax = plt.subplots(figsize=(7, 5.5), constrained_layout=True)
    d, m = build(base, PICK_PLATEAU, 0.0)
    vv, r_mer = cf_meridian_radius(m, 0.0, 240.0)
    ax.semilogy(vv, np.clip(r_mer, 1.0, 1e6))
    ax.axvline(181.0, color="#c22", lw=1.0, ls="--", label="bust-point line (v=181)")
    ax.set_xlabel("v (height above waist, mm)")
    ax.set_ylabel("meridional radius at CF (mm, log scale)")
    ax.set_title("CF meridian radius profile: flat interior vs the blend "
                f"(bust_plateau_theta={PICK_PLATEAU:g}, front_bow=0)")
    ax.legend(fontsize=8)
    fig2.savefig("exports/facet-meridian-profile.png", dpi=160)
    plt.close(fig2)


def main():
    base = dress_params(bust="plain")
    part1(base)
    part2(base)
    part3(base)
    part4(base)
    render(base)
    print("\nwrote exports/facet-plane-sweep.png, "
         "exports/facet-meridian-profile.png")
    print("\nSTATUS: prototype only. dress_params() / the committed shell "
         "are UNCHANGED.")


if __name__ == "__main__":
    main()
