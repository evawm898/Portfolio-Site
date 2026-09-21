"""
Metamorphic invariants (tests/metamorphic.py) pinned against the real
jersey fixture — the committed regression contract for how detection
must co-vary with image transforms on a real photo.

First-run calibration results (this project's discipline: run first,
diagnose every violation, THEN commit — tolerances stay commitments, and
violations become strict xfails carrying their diagnosis, never a
loosened tolerance):

  7/10 outcomes passed outright, with three diagnosed violations. The
  strict-xfail mechanism then worked exactly as designed: fixing the
  spacing refinement (see _refine_spacing_from_positions' docstring for
  the full story) made the mirror/wale xfail XPASS, and its mark was
  removed. Current state, 9/10 passing:

  * mirror/wale — FIXED. Was a 7.6% drift: both directions selected the
    same 35.0px candidate, but the old mean-of-all-gaps refinement was
    boundary-phase sensitive (37.2 one way, 34.4 the other). The
    per-step-normalized gap estimator brought the disagreement to 0.6%,
    inside the 1% lossless-transform bound, and moved the baseline
    toward the hand-counted ground truth (37.2 -> 35.3 vs ~33 true).
  * rotate90/wale — FIXED, after its diagnosis was revised TWICE, each
    time by measurement: first guessed as refinement boundary phase
    (wrong — the estimator fix left it at 4.5%), then as a
    position-source asymmetry (also wrong — both axes were refining
    from 1D peaks on this fixture; the sources refine identically).
    The real cause: the projected 1D signals are SIGNED Sobel
    derivatives, and mirror/rotation NEGATES the mapped axis's signal
    (measured correlation -0.9999), so peak detection locked onto the
    opposite edge of each ridge — the valley lattice — which refines
    4.5% differently on an asymmetric stitch profile. Fixed by
    _canonical_sign_signal (flip so skewness >= 0) at the two position-
    extraction sites; rotate90/wale now agrees to 0.7% and mirror is
    exact. Honest cost, measured: the canonical landmark on the real
    fixture's course axis is the valley lattice (24.9px, +11% vs the
    ~22.4 hand count) where the lucky pre-fix draw read 24.0 (+7%) —
    but the old value was orientation luck, not accuracy: a mirrored
    upload always read 24.9. Wale moved slightly TOWARD truth
    (35.27 -> 35.06). Synthetics (exact truth): all landmarks agree
    within 0.1px, so no systematic offset was introduced there.
  * resize/course — the 2x SEED FLIP is FIXED; a smaller ~5% drift
    remains xfailed. Original failure: at 1.5x upscale the coarse
    autocorrelation seed landed on the DOUBLED family (a T-vs-2T
    near-tie, strength ratio 0.977-0.996, decided by interpolation
    crumbs), and the course path takes its seed as-is. A strength-
    threshold-only fix was tried first and immediately WITHDRAWN: the
    rotate90 invariant showed the wale leg-harmonic's half-peak (0.969)
    is inseparable from genuine ties (>= 0.977) in the 1D
    autocorrelation — this project's oldest lesson, re-learned at the
    seed level. The landed fix (_prefer_fundamental_seed) resolves the
    tie with 2D template-walk evidence instead: genuine repeats walk at
    0.66-0.70, leg half-periods fail outright at 0.0. Verified a no-op
    on every 1x fixture reading. The residual drift (fixed-pixel
    smoothing/prominence making the upscaled gap set noisier) is a
    different, smaller mechanism — kept strictly xfailed with its own
    reason, and the seed fix is pinned independently by
    test_resize_course_stays_in_fundamental_family.
"""
from __future__ import annotations

import cv2
import pytest

from metamorphic import TOLERANCES, InvariantOutcome, _classify, run_metamorphic

JERSEY = "tests/fixtures/real_jersey_sample.jpg"
# Clean fabric region above the ruler (which starts around y=360).
JERSEY_ROI = (30, 30, 660, 310)

KNOWN_VIOLATIONS = {
    ("resize", "course"): (
        "residual ~5% refinement drift at 1.5x: SMOOTHING_WINDOW_PX and peak prominence are fixed-pixel "
        "parameters, so the upscaled signal is relatively less smoothed and its gap set noisier. The original "
        "2x SEED flip this slot was created for is FIXED (see _prefer_fundamental_seed) and separately pinned "
        "by test_resize_course_stays_in_fundamental_family below"
    ),
}


@pytest.fixture(scope="module")
def jersey_outcomes():
    img = cv2.imread(JERSEY)
    assert img is not None, f"{JERSEY} fixture missing"
    return {(o.invariant, o.axis): o for o in run_metamorphic(img, JERSEY_ROI, "vertical")}


def _params():
    params = []
    for invariant in ("resize", "rotate90", "mirror", "half_roi", "jpeg60"):
        for axis in ("wale", "course"):
            key = (invariant, axis)
            marks = []
            if key in KNOWN_VIOLATIONS:
                marks.append(pytest.mark.xfail(strict=True, reason=KNOWN_VIOLATIONS[key]))
            params.append(pytest.param(invariant, axis, id=f"{invariant}-{axis}", marks=marks))
    return params


@pytest.mark.parametrize("invariant,axis", _params())
def test_jersey_invariant(jersey_outcomes, invariant, axis):
    o: InvariantOutcome = jersey_outcomes[(invariant, axis)]
    assert o.status in ("ok", "skipped"), (
        f"{invariant}/{axis}: {o.status} (expected {o.expected_px}, measured {o.measured_px}, "
        f"ratio {o.ratio}) {o.note}"
    )


def test_resize_course_stays_in_fundamental_family(jersey_outcomes):
    """Pins the _prefer_fundamental_seed fix INDEPENDENTLY of the strict
    xfail above, which cannot tell a 5% drift failure from a 2x flip
    failure -- both count as 'xfailed'. The seed regression this guards:
    at 1.5x upscale the course autocorrelation seed used to land on the
    doubled family (T-vs-2T near-tie, ratio 0.977-0.996, falling to 2T)
    and the course path took it as-is, reporting ~2x spacing. The fix
    resolves the tie with the template-walk score (genuine repeats
    measured 0.66-0.70, the leg-harmonic trap 0.0 -- which is also why a
    strength-threshold-only version was tried and withdrawn: it broke
    rotate90/course by halving the rotated wale structure's seed onto
    its legs). Drift is tolerated here (tracked by the xfail); a return
    to the 2x family or a lost detection is not."""
    o = jersey_outcomes[("resize", "course")]
    assert o.status not in ("harmonic_flip", "lost"), (
        f"resize/course regressed to {o.status} (measured {o.measured_px} vs expected {o.expected_px}) -- "
        "the seed-doubling fix has been undone"
    )


def test_jersey_baseline_detects_both_axes(jersey_outcomes):
    """run_metamorphic only emits 'baseline' outcomes when detection
    failed outright — so their absence IS the baseline assertion."""
    assert not any(inv == "baseline" for inv, _ in jersey_outcomes)


def test_knit_sample_05_rotate90_course_does_not_flip_to_legs():
    """Pins the seed-ASCENT fix (see _prefer_fundamental_seed): on
    knit_sample_05 the wale structure's leg-lattice autocorrelation peak
    outright BEATS the fundamental (0.755 vs 0.735 measured), so the raw
    seed lands directly on the legs. Unrotated, the wale axis's candidate
    family climbs back up; rotated, the same signal feeds the course path
    (seed-as-is), which used to report the half period (ratio 0.503).
    The ascent gate resolves it: the leg seed's own template walk fails
    outright (0.000 measured) while the double walks at 0.704.

    Deliberately NOT asserted for knit_sample_06/08: their chunky plied
    legs correlate with their mirror twins at template scale (0.70
    measured), so the discriminator saturates and they still flip — an
    honest open limitation, documented in _prefer_fundamental_seed."""
    img = cv2.imread("tests/fixtures/knit_sample_05.jpg")
    assert img is not None, "knit_sample_05.jpg fixture missing"
    h, w = img.shape[:2]
    rw, rh = int(w * 0.7), int(h * 0.7)
    x, y = (w - rw) // 2, (h - rh) // 2
    from analysis.gauge_analysis import analyze_gauge

    baseline = analyze_gauge(img, (x, y, rw, rh), "vertical")
    rotated = analyze_gauge(cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE), (h - y - rh, x, rh, rw), "vertical")
    assert baseline.wale.spacing_px is not None and rotated.course.spacing_px is not None
    ratio = rotated.course.spacing_px / baseline.wale.spacing_px
    assert 0.9 <= ratio <= 1.1, (
        f"rotated course {rotated.course.spacing_px} vs baseline wale {baseline.wale.spacing_px} "
        f"(ratio {ratio:.3f}) -- the leg-seed ascent fix has regressed"
    )


# --- classifier unit coverage (no image work) ---------------------------


def test_classifier_boundaries():
    tol = TOLERANCES["resize"]  # 0.04
    assert _classify(None, 30.0, tol)[0] == "lost"
    assert _classify(30.9, 30.0, tol)[0] == "ok"           # +3%
    assert _classify(15.6, 30.0, tol)[0] == "harmonic_flip"  # ratio 0.52
    assert _classify(55.5, 30.0, tol)[0] == "harmonic_flip"  # ratio 1.85
    assert _classify(34.5, 30.0, tol)[0] == "drift"          # +15%, not near 0.5x/2x
    # Beyond 2.5x / below 0.4x the reading is a different structure, not a
    # drifted one: "lost", exactly as when detection returns nothing.
    assert _classify(76.0, 30.0, tol)[0] == "lost"           # ratio 2.53
    assert _classify(11.7, 30.0, tol)[0] == "lost"           # ratio 0.39
    assert _classify(69.0, 30.0, tol)[0] == "drift"          # ratio 2.30: above the 2x flip band, below lost
    assert _classify(12.6, 30.0, tol)[0] == "drift"          # ratio 0.42: below the 0.5x flip band, above lost


def test_half_roi_skips_below_five_periods():
    """A tiny ROI must yield 'skipped' half_roi outcomes (per-axis), not
    fabricated passes — synthetic jersey keeps the run fast."""
    import sys

    sys.path.insert(0, "tests")
    from synthetic_fabric import FabricSpec, render_fabric

    # 640px wide at 36px pitch -> ROI 320 wide -> half 160 -> 4.4 periods < 5.
    spec = FabricSpec(structure="jersey", wales_per_inch=5, courses_per_inch=7)
    img = render_fabric(spec)
    outcomes = run_metamorphic(img, (160, 120, 320, 240), "vertical")
    half = {o.axis: o for o in outcomes if o.invariant == "half_roi"}
    assert half["wale"].status == "skipped"
    assert "periods" in half["wale"].note
