"""
Tests for _refine_spacing_from_positions -- the final "turn a chosen
candidate period into a sub-pixel-accurate spacing" step shared by
_finalize_axis (course's legacy path) and _finalize_axis_v3 (wale).

Real-photo regression context: on a large, clean crop of the real jersey
sample (tests/fixtures/real_jersey_sample.jpg), the wale axis's evidence
scoring correctly selected 35px as the winning candidate (the true
repeat) -- but the OLD refinement step, which unconditionally overwrote
spacing_px with the mean of all detected peak-to-peak gaps, then silently
replaced it with 43px, a ~23% inflation. The peak detector (`_detect_
peaks`, tuned for overlay drawing, not measurement) had missed a handful
of real peaks on this non-synthetic photo, each miss widening the gaps on
either side of it toward a harmonic of the true period; those bad gaps
got averaged in right alongside the good ones with no way to tell them
apart from genuine sub-pixel jitter. This was a *separate* bug from
harmonic mis-selection: the evidence scorer had already picked the right
answer, and a later, unconditional step threw it away.

The fix only accepts the refined (mean-of-gaps) value when it's still
close to the period it's meant to refine; a bigger drift means the
detected positions aren't trustworthy for this and the original,
evidence-selected period should be kept as-is. See
SPACING_REFINEMENT_MAX_LOG_DEVIATION's docstring for the exact tolerance
and reasoning.

None of this reads ground truth -- analyze_gauge() has no ground-truth
parameter (see its signature). The real-photo test below compares the
independently produced prediction against the known ~5 WPI ground truth
only for human-readable context in the assertion message, the same as
the website's own Verify Measurement flow does after the fact.
"""
import os

import cv2
import numpy as np
import pytest

from analysis.gauge_analysis import (
    SPACING_REFINEMENT_MAX_LOG_DEVIATION,
    _refine_spacing_from_positions,
    analyze_gauge,
)

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
REAL_JERSEY_PATH = os.path.join(FIXTURES_DIR, "real_jersey_sample.jpg")


# --- _refine_spacing_from_positions ------------------------------------


def test_clean_evenly_spaced_positions_refine_toward_their_own_mean():
    period = 35.0
    positions = [0.0, 34.0, 69.0, 105.0, 139.0, 174.0]  # gaps: 34,35,36,34,35 -- mean 34.8
    spacing, consistency = _refine_spacing_from_positions(positions, period)
    assert spacing == pytest.approx(34.8, abs=0.01)
    assert consistency > 0.9  # gaps agree tightly with each other


def test_a_few_noisy_missed_peak_gaps_do_not_overwrite_the_period():
    # Mostly-clean ~35px gaps mixed with junk gaps (missed peaks, off-
    # lattice detections) -- the real-photo failure shape documented in
    # the module docstring above. The ORIGINAL fix rejected refinement
    # outright here (returning the candidate untouched); the current
    # per-step-gap estimator does one better: it salvages the clean gaps
    # and rejects only the junk, so the result must stay pinned tightly
    # to the candidate rather than drifting toward the old ~23%-inflated
    # all-gaps mean (~43px). Either way, the regression this guards is
    # the same: noisy gaps must never drag the result off the
    # evidence-selected period.
    period = 35.0
    positions = [0, 55, 102, 125, 156, 196, 247, 282, 336, 390, 425, 476]
    spacing, consistency = _refine_spacing_from_positions(positions, period)
    assert spacing == pytest.approx(period, rel=0.03)
    # Consistency reflects only the accepted (clean) gaps now, so it is
    # allowed to be high -- what matters is the spacing pin above.
    assert 0.0 <= consistency <= 1.0


def test_refinement_is_accepted_right_up_to_the_tolerance_boundary():
    period = 100.0
    just_inside = 100.0 * np.exp(SPACING_REFINEMENT_MAX_LOG_DEVIATION - 0.01)
    positions = [0.0, just_inside, 2 * just_inside, 3 * just_inside]
    spacing, _ = _refine_spacing_from_positions(positions, period)
    assert spacing == pytest.approx(just_inside, rel=1e-6)


def test_refinement_is_rejected_just_past_the_tolerance_boundary():
    period = 100.0
    just_outside = 100.0 * np.exp(SPACING_REFINEMENT_MAX_LOG_DEVIATION + 0.01)
    positions = [0.0, just_outside, 2 * just_outside, 3 * just_outside]
    spacing, consistency = _refine_spacing_from_positions(positions, period)
    assert spacing == period
    assert consistency == 0.0


def test_too_few_positions_returns_period_unchanged():
    spacing, consistency = _refine_spacing_from_positions([0.0, 35.0], 35.0)
    assert spacing == 35.0
    assert consistency == 0.0


def test_no_positions_returns_period_unchanged():
    spacing, consistency = _refine_spacing_from_positions([], 35.0)
    assert spacing == 35.0
    assert consistency == 0.0


def test_all_diffs_below_plausible_floor_returns_period_unchanged():
    # Every gap is finer than MIN_PLAUSIBLE_SPACING_PX -- treated as noise,
    # nothing left to refine with.
    spacing, consistency = _refine_spacing_from_positions([0.0, 1.0, 2.0, 3.0, 4.0], 35.0)
    assert spacing == 35.0
    assert consistency == 0.0


# --- Real-photo regression ----------------------------------------------


@pytest.fixture()
def real_jersey_image():
    if not os.path.exists(REAL_JERSEY_PATH):
        pytest.skip("real_jersey_sample.jpg fixture not present")
    img = cv2.imread(REAL_JERSEY_PATH)
    assert img is not None
    return img


def test_real_photo_large_crop_wale_spacing_is_not_inflated_by_noisy_peaks(real_jersey_image):
    h, w = real_jersey_image.shape[:2]
    roi = (int(w * 0.1), int(h * 0.15), int(w * 0.7), int(h * 0.6))
    result = analyze_gauge(real_jersey_image, roi, orientation="vertical", structure="unknown")

    selected = [c for c in result.wale.candidate_details if c.selected]
    assert selected, "expected a selected wale candidate"
    candidate_period = selected[0].period_px

    # The specific regression: spacing_px must track the evidence-selected
    # candidate (sub-pixel jitter aside), not drift toward an inflated
    # value some peak-detection noise happened to average out to.
    assert result.wale.spacing_px == pytest.approx(candidate_period, rel=0.05), (
        f"wale.spacing_px ({result.wale.spacing_px}) drifted away from the "
        f"evidence-selected candidate ({candidate_period}) -- the old bug "
        "let noisy peak-gap averaging silently overwrite a correct pick."
    )
