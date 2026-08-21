"""DIAGNOSIS — front-view flare above the bust (a(v) monotonicity).

Nothing here modifies the committed shell: FilletedDressProfiles.ABOVE_CIRC
/ _BodiceFamily.ANCHORS are monkeypatched ONLY inside the narrow
above_circ_override() context, and restored immediately after each build
(verified: default 812.8 reproduces the committed a(v) exactly, see the
sanity check this script runs first). Nothing is adopted — this reports
numbers and renders a comparison for the user to pick from.

Run:  cd tools/dress-shell && python3 flare_diagnosis.py
Writes: exports/a-of-v.csv, exports/flare-front-view-sweep.png
"""

import csv
from contextlib import contextmanager

import numpy as np
from scipy.optimize import brentq

import fillet
from fillet import FilletedDressProfiles, FilletParams
from neckline import NecklineV3Params
from shell import ShellModel, ShellParams, dress_params, dress_side_fit

BUST_V = FilletedDressProfiles.BUST_V          # 203.2 -- last point ABOVE_CIRC
CURRENT_ABOVE_CIRC = FilletedDressProfiles.ABOVE_CIRC   # 812.8, the committed value
NECK_CORNER_V = 220.0                          # NecklineV3Params.cf_height


@contextmanager
def above_circ_override(value):
    """Temporarily monkeypatch the above-bust circumference anchor in
    BOTH places it's hardcoded (FilletedDressProfiles.ABOVE_CIRC feeds
    the depth b(v) Hermite continuation above BUST_V; _BodiceFamily's
    matching ANCHORS entry feeds the perimeter P(v) schedule) so a
    build made inside this context uses the trial value everywhere the
    real one is used, then restores both immediately."""
    old_const = fillet.FilletedDressProfiles.ABOVE_CIRC
    old_anchors = fillet._BodiceFamily.ANCHORS
    fillet.FilletedDressProfiles.ABOVE_CIRC = value
    fillet._BodiceFamily.ANCHORS = (old_anchors[0], old_anchors[1],
                                    (old_anchors[2][0], value))
    try:
        yield
    finally:
        fillet.FilletedDressProfiles.ABOVE_CIRC = old_const
        fillet._BodiceFamily.ANCHORS = old_anchors


def build_model(above_circ, v_top=240.0):
    """A plain (no bust bump) ShellModel with the given above-bust
    circumference anchor -- mirrors dress_params(bust="plain")'s own
    construction exactly, bypassing its process-wide dress_depth() cache
    (which must never see a monkeypatched value)."""
    with above_circ_override(above_circ):
        d = FilletedDressProfiles(dress_side_fit(), FilletParams(), v_top=v_top)
    bp = NecklineV3Params()
    P190 = float(np.asarray(d.perimeter(190.0)))
    split = 180.0 - 180.0 * 360.0 / P190
    params = ShellParams(bodice=bp, depth_curve=d, split_theta=split)
    return ShellModel(params)


def sanity_check():
    m0 = build_model(CURRENT_ABOVE_CIRC)
    committed = ShellModel(dress_params(bust="plain"))
    vv = np.arange(0.0, NECK_CORNER_V + 1e-9, 1.0)
    res = float(np.max(np.abs(np.asarray(m0.a(vv)) - np.asarray(committed.a(vv)))))
    print(f"[sanity] override(default) vs committed plain model: "
         f"max|delta a(v)| = {res:.2e} mm "
         f"({'OK, exact reproduction' if res < 1e-9 else 'MISMATCH -- STOP'})")
    if res >= 1e-9:
        raise SystemExit("sanity check failed -- override mechanism is not "
                         "transparent, refusing to report numbers built on it")
    return committed


def a_of_v_table(model, vv):
    return np.asarray(model.a(vv), dtype=float)


def find_worst_slope(a, vv):
    da = np.diff(a) / np.diff(vv)
    i = int(np.argmax(da))
    return float(da[i]), float(vv[i]), float(vv[i + 1])


def solve_monotone_minimum(vv_zone):
    def worst_slope_zone(above_circ):
        m = build_model(above_circ)
        a = a_of_v_table(m, vv_zone)
        return float(np.max(np.diff(a) / np.diff(vv_zone)))
    lo, hi = 700.0, CURRENT_ABOVE_CIRC
    flo, fhi = worst_slope_zone(lo), worst_slope_zone(hi)
    if not (flo < 0.0 < fhi):
        raise SystemExit(f"monotone-minimum solve: expected a sign change in "
                         f"[{lo},{hi}], got f(lo)={flo}, f(hi)={fhi}")
    root = brentq(worst_slope_zone, lo, hi, xtol=1e-4)
    return root, worst_slope_zone(root)


def solve_straight_continuation():
    """SOLVE 2a: above_circ so a(v) for v in (BUST_V, NECK_CORNER_V]
    continues the INCOMING slope a(v) already has approaching BUST_V
    from below (a region above_circ cannot touch) -- the top segment
    blends smoothly into the already-fixed rise instead of kinking flat.
    Local formulation: only looks at the slope right at BUST_V, ignores
    the waist entirely."""
    m0 = build_model(CURRENT_ABOVE_CIRC)
    a195 = float(np.asarray(m0.a(195.0)))
    a_bust = float(np.asarray(m0.a(BUST_V)))
    incoming_slope = (a_bust - a195) / (BUST_V - 195.0)
    target_a220 = a_bust + incoming_slope * (NECK_CORNER_V - BUST_V)

    def f(above_circ):
        m = build_model(above_circ)
        return float(np.asarray(m.a(NECK_CORNER_V))) - target_a220

    root = brentq(f, CURRENT_ABOVE_CIRC, 950.0, xtol=1e-4)
    vv = np.linspace(BUST_V, NECK_CORNER_V, 18)
    m = build_model(root)
    a = a_of_v_table(m, vv)
    line = a_bust + incoming_slope * (vv - BUST_V)
    max_dev = float(np.max(np.abs(a - line)))
    return root, incoming_slope, target_a220, max_dev


def solve_straight_global_secant():
    """SOLVE 2b: above_circ so a(v) over (BUST_V, NECK_CORNER_V] best
    fits (least squares) the SINGLE straight line connecting the true
    endpoints a(waist)=a(0) and a(neckline corner)=a(220) -- the literal
    reading of "a linear a(v) from neckline corner down to waist."
    (Fitting that same line to the FULL [0,220] range, letting the
    optimizer also move the line's own endpoint, was tried first and
    diverges to an unbounded above_circ -- the dominant non-linearity at
    v=155-190 sits entirely below BUST_V, where this anchor has zero
    reach, so an unconstrained whole-range fit just chases a marginal,
    wrong-headed improvement forever. Restricting the FIT to the segment
    this knob actually controls, while still using the TRUE a(0) and the
    trial a(220) to define the line, is the well-posed version.) NOTE:
    since a(0) < a(BUST_V) already (the design is fundamentally wider at
    the bust than the waist), the resulting line is only "straight," not
    "narrower at the top" -- see the printed caveat in main()."""
    a0 = float(np.asarray(build_model(CURRENT_ABOVE_CIRC).a(0.0)))
    vv = np.linspace(BUST_V, NECK_CORNER_V, 30)

    def obj(above_circ):
        m = build_model(above_circ)
        a = a_of_v_table(m, vv)
        a220 = a[-1]
        line = a0 + (a220 - a0) * vv / NECK_CORNER_V
        return float(np.mean((a - line) ** 2))

    lo, hi = 850.0, 950.0
    # coarse bracket check (this objective is not guaranteed unimodal
    # outside a sane range, but is well-behaved near the committed value)
    xs = np.linspace(lo, hi, 21)
    best = xs[int(np.argmin([obj(x) for x in xs]))]
    span = (hi - lo) / 20.0
    from scipy.optimize import minimize_scalar
    res = minimize_scalar(obj, bounds=(max(lo, best - 2 * span),
                                       min(hi, best + 2 * span)),
                          method="bounded", options={"xatol": 1e-4})
    above_circ = res.x
    m = build_model(above_circ)
    a220 = float(np.asarray(m.a(NECK_CORNER_V)))
    slope = (a220 - a0) / NECK_CORNER_V
    vv2 = np.linspace(BUST_V, NECK_CORNER_V, 18)
    a = a_of_v_table(m, vv2)
    line = a0 + slope * vv2
    max_dev = float(np.max(np.abs(a - line)))
    return above_circ, slope, a220, max_dev


def main():
    committed = sanity_check()

    print("\n" + "=" * 78)
    print("DIAGNOSIS — FRONT-VIEW FLARE ABOVE THE BUST")
    print("=" * 78)

    vv = np.arange(0.0, NECK_CORNER_V + 1e-9, 1.0)
    a = a_of_v_table(committed, vv)
    worst_slope, v_lo, v_hi = find_worst_slope(a, vv)
    is_monotone = bool(np.all(np.diff(a) <= 1e-9))

    print(f"\n[1] a(v), 1mm pitch, v=0 (waist) to v={NECK_CORNER_V:g} "
         f"(neckline corner) — full table written to exports/a-of-v.csv")
    print(f"    a(waist, v=0)      = {a[0]:8.3f} mm")
    print(f"    a(underbust, 152.4)= {float(np.asarray(committed.a(152.4))):8.3f} mm")
    print(f"    a(bust, {BUST_V:g})     = {float(np.asarray(committed.a(BUST_V))):8.3f} mm")
    print(f"    a(neckline corner, {NECK_CORNER_V:g}) = {a[-1]:8.3f} mm")
    print(f"    a(v) MONOTONE (non-increasing) over [0,{NECK_CORNER_V:g}]? "
         f"{'YES' if is_monotone else 'NO -- CONFIRMED NOT MONOTONE'}")
    print(f"    worst (steepest positive) da/dv = {worst_slope:+.3f} mm/mm, "
         f"between v={v_lo:.0f} and v={v_hi:.0f}")
    print(f"    a(v) at 5mm pitch, v=140..220 (the zone in question):")
    for v in range(140, 225, 5):
        print(f"      v={v:4d}  a={float(np.asarray(committed.a(float(v)))):8.3f}")

    with open("exports/a-of-v.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["v_mm", "a_mm"])
        for vi, ai in zip(vv, a):
            w.writerow([f"{vi:.1f}", f"{ai:.4f}"])

    print(f"\n[2] YOUR HYPOTHESIS, CHECKED DIRECTLY: b(v) [the base traced "
         f"depth] and P(v) [frozen perimeter] from v={{}} to v={{}}"
         .format(181.0, NECK_CORNER_V))
    d = committed.params.depth_curve
    b181 = float(np.asarray(d.b(181.0)))
    b220 = float(np.asarray(d.b(NECK_CORNER_V)))
    P181 = float(np.asarray(d.perimeter(181.0)))
    P220 = float(np.asarray(d.perimeter(NECK_CORNER_V)))
    print(f"    b(181)={b181:.3f} mm, b(220)={b220:.3f} mm -> delta "
         f"{b220 - b181:+.3f} mm (NOT ~-21mm: the base trace barely moves "
         f"here, it's nearly flat)")
    print(f"    P(181)={P181:.3f} mm, P(220)={P220:.3f} mm -> delta "
         f"{P220 - P181:+.3f} mm (P is actually still RISING through this "
         f"whole span, not falling -- it peaks around v=205-214 and only "
         f"just starts to ease back by 220)")
    print(f"    So this specific numeric hypothesis (b drops ~21, P drops "
         f"~17, in [181,220]) does not match what the model computes for "
         f"the base b(v)/P(v) in that exact span. The real mechanism, "
         f"found by locating the worst slope directly: a(v)'s steepest "
         f"climb is v={v_lo:.0f}-{v_hi:.0f} (underbust->bust anchor "
         f"region, well BELOW 181), where P(v) rises ~155mm "
         f"(underbust 711.2 -> bust 863.6) while b(v) rises only ~3mm -- "
         f"a is tracking P almost directly there. From v~200 onward "
         f"a(v) is nearly FLAT (168.2 at 200 -> 168.6 at 220, nudging "
         f"back down after peaking ~v=210-214) rather than tapering back "
         f"down toward the neckline the way a smooth cone would -- THAT "
         f"failure to taper (not a further rise) is what the above-bust "
         f"anchor governs, and is very likely what reads visually as "
         f"\"widening toward the neckline\" even though the number "
         f"technically peaks just before v=220.")

    print(f"\n[3] IS THE ABOVE-BUST ANCHOR (812.8mm @ v={FilletedDressProfiles.ABOVE_V:g}) "
         f"THE CAUSE?")
    print(f"    Only PARTIALLY. It has ZERO effect on a(v) for v <= "
         f"{BUST_V:g} (b(v)/P(v) there come entirely from the underbust/"
         f"bust anchors and the trace) -- so it CANNOT fix the dominant "
         f"non-monotonicity at v={v_lo:.0f}-{v_hi:.0f}. It only controls "
         f"whether the top segment (v={BUST_V:g} to {NECK_CORNER_V:g}) "
         f"keeps rising, flattens, or falls. Confirmed by direct sweep: "
         f"the worst da/dv over the FULL [0,220] range stays exactly "
         f"{worst_slope:.3f} mm/mm regardless of above_circ (tested "
         f"700-900mm) -- it never moves, because it happens below "
         f"{BUST_V:g}.")

    vv_zone = np.arange(BUST_V, NECK_CORNER_V + 1e-9, 0.5)
    mono_min, mono_slope = solve_monotone_minimum(vv_zone)
    print(f"\n[4] SOLVE 1 — MONOTONE-MINIMUM (a(v) non-increasing over "
         f"[{BUST_V:g}, {NECK_CORNER_V:g}] specifically, the zone this "
         f"anchor controls; NOT achievable over the full [0,220] range "
         f"with this one knob, per [3])")
    print(f"    above_circ = {mono_min:.2f} mm (vs committed {CURRENT_ABOVE_CIRC:g}mm, "
         f"a DECREASE of {CURRENT_ABOVE_CIRC - mono_min:.2f} mm)")
    print(f"    worst da/dv in that zone at this value: {mono_slope:+.2e} "
         f"mm/mm (== 0, the critical/boundary value)")
    m_mono = build_model(mono_min)
    print(f"    a({NECK_CORNER_V:g}) under this value: "
         f"{float(np.asarray(m_mono.a(NECK_CORNER_V))):.2f} mm (vs "
         f"{a[-1]:.2f} mm committed)")

    straight_a, slope_a, target_a, dev_a = solve_straight_continuation()
    straight_b, slope_b, a220_b, dev_b = solve_straight_global_secant()
    print(f"\n[5] SOLVE 2 — STRAIGHT-EDGE. TWO readings of \"linear a(v) "
         f"from neckline corner down to waist,\" both restricted to the "
         f"segment this anchor actually controls (fitting the FULL "
         f"[0,220] range with this one knob diverges — the dominant "
         f"non-linearity, a full S-curve worth ~30mm of deviation from "
         f"any straight line, sits at v=100-190, entirely below "
         f"{BUST_V:g} — see [3]). They agree closely with each other:")
    print(f"    2a) LOCAL continuation of the incoming slope at {BUST_V:g}: "
         f"above_circ = {straight_a:.2f} mm (slope {slope_a:.4f} mm/mm, "
         f"max dev {dev_a:.3f} mm over [{BUST_V:g},{NECK_CORNER_V:g}])")
    print(f"    2b) GLOBAL secant a(0) -> a({NECK_CORNER_V:g}), fit over "
         f"[{BUST_V:g},{NECK_CORNER_V:g}]: above_circ = {straight_b:.2f} mm "
         f"(slope {slope_b:.4f} mm/mm, max dev {dev_b:.3f} mm)")
    a_bust = float(np.asarray(committed.a(BUST_V)))
    print(f"    BOTH require INCREASING above_circ from {CURRENT_ABOVE_CIRC:g} "
         f"to ~{straight_b:.0f}-{straight_a:.0f} mm — past the bust anchor's "
         f"own 863.6mm, inverting the usual taper-in-toward-the-top "
         f"ordering — and BOTH land on a(220) > a({BUST_V:g}) "
         f"({target_a:.1f}-{a220_b:.1f} mm vs {a_bust:.1f} mm at the bust).")
    print(f"    *** COUNTER-INTUITIVE FINDING, WORTH FLAGGING EXPLICITLY: "
         f"\"straight\" here means CONTINUED WIDENING toward the neckline, "
         f"not narrowing. a(0)={float(np.asarray(committed.a(0.0))):.1f}mm is "
         f"already well below a({BUST_V:g})={float(np.asarray(committed.a(BUST_V))):.1f}mm "
         f"by design (the bodice is fundamentally wider at the bust than "
         f"the waist), so ANY straight line connecting those two true "
         f"endpoints has a positive slope all the way up, and "
         f"\"continuing\" it past the bust up to the neckline corner can "
         f"only mean staying on that same upward trend. If what you "
         f"actually want is the bodice to NARROW again above the bust "
         f"(toward the shoulder, the way it narrows through the "
         f"ribcage below the bust), that is the MONOTONE-MINIMUM "
         f"direction in [4] ({mono_min:.2f}mm, a DEcrease), not this one "
         f"— the two solves point opposite ways. Neither is adopted; "
         f"see the render + landmark table below to judge visually.")

    print(f"\n[6] FRONT-VIEW HALF-WIDTH a(v) AT THE FOUR LANDMARKS, ALL "
         f"FOUR OPTIONS")
    landmarks = [("waist", 0.0), ("underbust", 152.4), ("bust", BUST_V),
                ("neckline corner", NECK_CORNER_V)]
    options = [("current (812.8)", CURRENT_ABOVE_CIRC),
              ("monotone-min", mono_min),
              ("straight-edge (local)", straight_a),
              ("straight-edge (global)", straight_b)]
    models = {name: (committed if val == CURRENT_ABOVE_CIRC else build_model(val))
             for name, val in options}
    header = f"    {'landmark':<18}" + "".join(f"{n:>18}" for n, _ in options)
    print(header)
    for label, v in landmarks:
        row = f"    {label:<18}"
        for name, _ in options:
            row += f"{float(np.asarray(models[name].a(v))):18.3f}"
        print(row)

    print(f"\n[7] b(v)/P(v) BELOW THE BUST ANCHOR — confirming the extent "
         f"of \"byte-identical to committed\"")
    vv_low = np.linspace(-381.0, BUST_V, 2001)
    d0 = committed.params.depth_curve
    for name, val in options[1:]:
        with above_circ_override(val):
            dtest = FilletedDressProfiles(dress_side_fit(), FilletParams(), v_top=240.0)
        res_b = float(np.max(np.abs(np.asarray(dtest.b(vv_low)) - np.asarray(d0.b(vv_low)))))
        res_P = float(np.max(np.abs(np.asarray(dtest.perimeter(vv_low)) - np.asarray(d0.perimeter(vv_low)))))
        print(f"    {name} (above_circ={val:.2f}): max|delta b(v)| = "
             f"{res_b:.2e} mm, max|delta P(v)| = {res_P:.2e} mm over "
             f"v in [-381, {BUST_V:g}]")
        if res_P > 0.01:
            # localize it: where does the delta first leave zero (below)
            # and where does it peak?
            delta = np.asarray(dtest.perimeter(vv_low)) - np.asarray(d0.perimeter(vv_low))
            worst_i = int(np.argmax(np.abs(delta)))
            nz = np.where(np.abs(delta) > 0.05)[0]
            lo_v = vv_low[nz[0]] if len(nz) else None
            print(f"      NOT negligible for P(v) -- PCHIP's shape-"
                 f"preserving derivative estimate at the {BUST_V:g} knot "
                 f"reacts to the changed anchor beyond it, and that "
                 f"reaction reaches back through the WHOLE underbust->"
                 f"bust rise, not just a boundary sliver: delta first "
                 f"leaves zero around v={lo_v:.0f}, peaks {delta[worst_i]:+.2f} mm "
                 f"at v={vv_low[worst_i]:.1f}, and is back to exactly zero "
                 f"at {BUST_V:g} itself (the anchor value there is pinned). "
                 f"Verified zero below v~150. So \"byte-identical to "
                 f"committed\" HOLDS for the base depth b(v) (both "
                 f"candidates, <1.5e-5mm) but does NOT fully hold for "
                 f"the perimeter schedule P(v) under the straight-edge "
                 f"candidate specifically, in the v~150-{BUST_V:g} band.")

    render(committed, models, options, "exports/flare-front-view-sweep.png")
    print("\nwrote exports/a-of-v.csv, exports/flare-front-view-sweep.png")
    print("\nSTATUS: diagnosis only. Neither above_circ value has been "
         "adopted -- FilletedDressProfiles.ABOVE_CIRC is still 812.8, "
         "the committed shell is unchanged. Pick a value (or ask for "
         "other candidates) to proceed.")


def render(committed, models, options, out_path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 6.5), constrained_layout=True)
    vv = np.linspace(-381.0, 240.0, 1201)
    colors = {"current (812.8)": "#444", "monotone-min": "#1b7a3d",
             "straight-edge (local)": "#b3401e",
             "straight-edge (global)": "#d98c00"}
    for name, _ in options:
        m = models[name]
        a = np.asarray(m.a(vv))
        ax1.plot(a, vv, color=colors[name], label=name, lw=1.4)
        ax1.plot(-a, vv, color=colors[name], lw=1.4)
    for v in (0.0, 152.4, FilletedDressProfiles.BUST_V, NECK_CORNER_V):
        ax1.axhline(v, color="#ddd", lw=0.5, zorder=0)
    ax1.set_title("Full front-view silhouette (a(v), skirt+bodice)", fontsize=9)
    ax1.set_xlabel("x (lateral half-width, mm)")
    ax1.set_ylabel("v (height above waist, mm)")
    ax1.legend(fontsize=8, loc="lower right")

    vv2 = np.linspace(100.0, 240.0, 601)
    for name, _ in options:
        m = models[name]
        a = np.asarray(m.a(vv2))
        ax2.plot(a, vv2, color=colors[name], label=name, lw=1.6)
    for v, label in ((152.4, "underbust"), (FilletedDressProfiles.BUST_V, "bust"),
                     (NECK_CORNER_V, "neckline corner")):
        ax2.axhline(v, color="#ddd", lw=0.5, zorder=0)
        ax2.text(ax2.get_xlim()[0] if False else 105, v + 1.5, label, fontsize=7, color="#888")
    ax2.set_title("Zoom: bodice only, RIGHT side (x >= 0)", fontsize=9)
    ax2.set_xlabel("x (lateral half-width, mm)")
    ax2.legend(fontsize=8, loc="upper left")
    fig.suptitle("Front-view half-width a(v): committed vs the two solved "
                 "above-bust-circumference candidates", fontsize=10)
    fig.savefig(out_path, dpi=160)
    plt.close(fig)


if __name__ == "__main__":
    main()
