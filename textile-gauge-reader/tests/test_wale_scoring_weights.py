"""
Regression test for ScoringWeights.patch_consensus / phase_consistency
(analysis/gauge_analysis.py) locking in a real fix, verified against a
real, hand-counted photo.

Ground truth: tests/fixtures/sarahmaker-knitting-gauge.jpg, calibrated
directly from the ruler numerals in the photo (272.8 px/inch, cross-
checked three ways -- consecutive numeral spacing agreed to within 1.5%)
-- 4 wales/inch, hand-counted by the person who took the photo, not
inferred from any detector output.

At small (~1.25in) analysis windows -- the size this photo's usable
fabric area forces the multi-region proposal down to -- wale selection
between the true stitch-column period and its half-period harmonic (a
strong sub-column texture in this yarn, e.g. ply twist, that's genuinely
periodic at close to double the true stitch frequency) was a real,
position-dependent coin-flip: four independent 1.25in-square windows
across the same clean fabric gave WPI ratios-to-truth of 0.59, 1.11,
0.56, 1.17 -- alternating between correct and ~2x wrong depending purely
on where the window happened to land, not on any noise or bug in a
single measurement.

Diagnosed directly against the real candidate scoring breakdown (not
guessed): patch_consensus favored the WRONG (half-period) candidate in
every single case checked, often by a wide margin (e.g. 0.94-0.96 vs.
0.43-0.44) -- the exact "sub-region patches aren't independent, they can
all inherit the same wrong lock-on together" failure the weight was
already reduced once before to guard against, just not far enough.
phase_consistency favored the CORRECT candidate in every case checked,
including this one, so its weight absorbed patch_consensus's second
reduction (weights still sum to 1.0). Verified this fixes all 4 small-
window positions plus the full large-crop case, without changing the
already-correct jersey result (tests/fixtures/real_jersey_sample.jpg).

None of this reads ground truth. analyze_gauge() has no ground-truth
parameter (see its signature) -- these values are only compared against
the known-true numbers here, in the test, after the fact.

NOTE: this fix is specific to WHEN wale's raw periodicity candidate
scoring runs. On the live multi-region flow, wale for regions confident
enough is instead sourced from Stage 3's loop-lattice counted-column
path (see wale_source in analysis.gauge_analysis.analyze_multi_roi),
which has its own, separate, NOT-yet-fixed susceptibility to this same
half-period ambiguity -- see README.md. A fix attempted there during the
same investigation (blending phase_consistency into the loop-lattice's
own scale selection) was verified to improve this fixture but regress
two previously-correct real jersey positions, and was reverted rather
than shipped; not covered by a "this must now be correct" test here.
"""
import os

import cv2
import pytest

from analysis.gauge_analysis import WEIGHTS_UNKNOWN, analyze_gauge

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
REAL_TEAL_PATH = os.path.join(FIXTURES_DIR, "sarahmaker-knitting-gauge.jpg")
PX_PER_INCH = 272.8  # measured directly from the ruler numerals, not invented
TRUE_WALES_PER_INCH = 4.0  # hand-counted


@pytest.fixture()
def real_teal_image():
    if not os.path.exists(REAL_TEAL_PATH):
        pytest.skip("sarahmaker-knitting-gauge.jpg fixture not present")
    img = cv2.imread(REAL_TEAL_PATH)
    assert img is not None
    return img


def test_current_weights_still_sum_to_one_for_the_positive_terms():
    # Not a hard architectural requirement, but a useful invariant to
    # catch an accidental typo when hand-editing these values -- the
    # positive evidence terms (everything except the two penalty
    # weights) are designed to blend into one bounded [0, 1] evidence
    # score.
    w = WEIGHTS_UNKNOWN
    total = w.autocorr + w.support_2d + w.structural + w.patch_consensus + w.regularity + w.repeat_count + w.phase_consistency
    assert total == pytest.approx(1.0, abs=1e-9)


@pytest.mark.parametrize(
    "roi",
    [
        pytest.param((100, 360, 1020, 1020), id="full_fabric_area"),
        pytest.param((450, 700, 341, 341), id="small_window_a"),
        pytest.param((100, 400, 341, 341), id="small_window_b"),
        pytest.param((700, 900, 341, 341), id="small_window_c"),
        pytest.param((450, 400, 341, 341), id="small_window_d"),
    ],
)
def test_wale_matches_hand_counted_ground_truth_at_every_window_position(real_teal_image, roi):
    result = analyze_gauge(real_teal_image, roi, orientation="vertical", structure="unknown")
    assert result.wale.spacing_px is not None
    predicted_per_inch = PX_PER_INCH / result.wale.spacing_px
    ratio = predicted_per_inch / TRUE_WALES_PER_INCH
    assert 0.75 < ratio < 1.35, (
        f"roi={roi}: predicted {predicted_per_inch:.2f} WPI vs. true {TRUE_WALES_PER_INCH} "
        f"(ratio {ratio:.2f}) -- looks like a half-period lock-on, not measurement noise"
    )


def test_patch_consensus_alone_would_have_picked_the_wrong_candidate_here():
    # Documents WHY the weight changed, using the real candidate scoring
    # breakdown rather than just asserting the end-to-end number -- if
    # this ever stops being true (patch_consensus starts agreeing with
    # the correct candidate on this fixture), the weight rationale above
    # should be revisited, not silently left stale.
    img = cv2.imread(REAL_TEAL_PATH) if os.path.exists(REAL_TEAL_PATH) else None
    if img is None:
        pytest.skip("sarahmaker-knitting-gauge.jpg fixture not present")
    result = analyze_gauge(img, (100, 360, 1020, 1020), orientation="vertical", structure="unknown")
    by_period = {c.period_px: c for c in result.wale.candidate_details}
    correct = by_period[76.0]  # ~4 WPI at this crop's scale
    wrong_half = by_period[38.0]  # the half-period harmonic
    assert wrong_half.patch_consensus > correct.patch_consensus
    assert correct.phase_consistency > wrong_half.phase_consistency
    assert correct.selected
