"""
Tests for phase-consistency evidence: does a candidate period's repeat
markers land on the SAME local visual feature every time (a genuine full
repeat), or alternate between two distinct ones every other marker (the
"one leg of a V" signature of a half-period harmonic)?

Real-photo regression context: on the user's actual jersey sample
(tests/fixtures/real_jersey_sample.jpg, ~5 true wales/in, ~7.2 true
courses/in, ruler-calibrated at 166.25 px/inch), the wale axis's
generated candidate family already contained a period close to the true
repeat (~35px, ~4.75 WPI) alongside the wrong half-period harmonic
(~17.5px, ~9.5 WPI) -- diagnostics confirmed this was a SCORING problem
(the correct candidate existed but didn't reliably win), not a
candidate-generation problem. These tests confirm phase-consistency
evidence measurably discriminates the two using real image content (not
hand-fed scores), and that it's wired in a way that actually affects
which candidate is selected -- unlike the harmonic penalty (see
_harmonic_penalty's docstring), which deliberately must NOT decide a
winner, phase consistency is a genuine per-candidate structural
measurement and is supposed to.

None of this reads ground truth. `analyze_gauge()` has no ground-truth
parameter at all (see its signature) -- these tests never pass the real
5.0 WPI / 7.2 CPI values into the analysis pipeline, only compare the
INDEPENDENTLY produced prediction against them afterward, same as the
website's own Verify Measurement flow.
"""
import os

import cv2
import numpy as np
import pytest

from analysis.gauge_analysis import (
    MIN_MARKERS_FOR_PHASE_EVIDENCE,
    WEIGHTS_JERSEY,
    _patch_similarity,
    _phase_consistency_evidence,
    analyze_gauge,
)

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
REAL_JERSEY_PATH = os.path.join(FIXTURES_DIR, "real_jersey_sample.jpg")
PX_PER_INCH = 166.25  # measured directly from the ruler in the photo, not invented


# --- _patch_similarity -----------------------------------------------------


def test_patch_similarity_identical_patches_score_high():
    rng = np.random.default_rng(3)
    patch = rng.normal(128, 30, size=(20, 10))
    assert _patch_similarity(patch, patch.copy()) > 0.95


def test_patch_similarity_inverted_pattern_scores_low():
    rng = np.random.default_rng(4)
    patch = rng.normal(128, 30, size=(20, 10))
    inverted = 256 - patch  # a strong, structured difference, not noise
    assert _patch_similarity(patch, inverted) < 0.3


def test_patch_similarity_flat_patches_are_neutral_not_a_false_positive():
    flat_a = np.full((20, 10), 100.0)
    flat_b = np.full((20, 10), 150.0)
    # Two uniformly flat patches aren't evidence of anything -- shouldn't
    # register as either strongly similar or strongly dissimilar.
    assert _patch_similarity(flat_a, flat_b) == pytest.approx(0.5)


def test_patch_similarity_mismatched_shapes_returns_zero():
    a = np.zeros((10, 10))
    b = np.zeros((10, 12))
    assert _patch_similarity(a, b) == 0.0


# --- _phase_consistency_evidence: synthetic, hermetic ----------------------


def _alternating_stripe_image(width=200, height=60, stripe_period=20):
    """
    A vertical-stripe image where every OTHER stripe cell has a
    genuinely different internal TEXTURE PATTERN (not just a different
    brightness level -- _patch_similarity standardizes away flat
    brightness/contrast differences by design, so two differently-lit
    but internally FLAT patches correctly register as "no evidence
    either way", same as two flat patches that happen to match). Phase A
    cells ramp bright-to-dark left-to-right; phase B cells ramp the
    opposite way -- standardized, these correlate near +1 with same-phase
    neighbors and near -1 with opposite-phase ones, standing in for a
    V-loop's two visually-distinct legs. At `stripe_period` spacing,
    consecutive markers alternate A/B; at `2*stripe_period`, consecutive
    markers land on the SAME phase (always "A").
    """
    img = np.zeros((height, width), dtype=np.float64)
    ramp = np.linspace(0.0, 1.0, stripe_period)
    for i, x0 in enumerate(range(0, width, stripe_period)):
        cell_ramp = ramp if i % 2 == 0 else ramp[::-1]
        img[:, x0 : x0 + stripe_period] = cell_ramp[np.newaxis, :]
    return img


def test_phase_consistency_low_and_alternating_high_at_the_alternating_period():
    img = _alternating_stripe_image()
    period = 20.0
    positions = list(np.arange(10.0, 190.0, period))  # centered in each stripe cell
    phase_consistency, alternating = _phase_consistency_evidence(img, positions, period, lag_dx=True)
    assert phase_consistency < 0.3  # adjacent markers land on OPPOSITE phases
    assert alternating > 0.5        # same-parity markers agree far more than adjacent ones


def test_phase_consistency_high_and_alternating_low_at_the_full_period():
    img = _alternating_stripe_image()
    period = 40.0  # = 2x the alternation -- every marker lands on the same phase
    positions = list(np.arange(10.0, 190.0, period))
    phase_consistency, alternating = _phase_consistency_evidence(img, positions, period, lag_dx=True)
    assert phase_consistency > 0.8
    assert alternating == pytest.approx(0.0, abs=0.05)


def test_phase_consistency_neutral_with_too_few_markers():
    img = _alternating_stripe_image()
    positions = [50.0, 70.0]  # fewer than MIN_MARKERS_FOR_PHASE_EVIDENCE
    assert len(positions) < MIN_MARKERS_FOR_PHASE_EVIDENCE
    phase_consistency, alternating = _phase_consistency_evidence(img, positions, 20.0, lag_dx=True)
    assert phase_consistency == 0.5
    assert alternating == 0.0


def test_phase_consistency_neutral_with_no_image():
    phase_consistency, alternating = _phase_consistency_evidence(None, [10, 30, 50, 70], 20.0, lag_dx=True)
    assert phase_consistency == 0.5
    assert alternating == 0.0


# --- Real-photo regression --------------------------------------------------


@pytest.fixture(scope="module")
def real_jersey_image():
    if not os.path.exists(REAL_JERSEY_PATH):
        pytest.skip("real_jersey_sample.jpg fixture not present")
    img = cv2.imread(REAL_JERSEY_PATH)
    assert img is not None
    return img


def test_real_photo_phase_evidence_favors_the_full_wale_repeat(real_jersey_image):
    """
    The core regression check. ROI/calibration are NOT the user's exact
    session values (unavailable to this environment) -- they were
    measured directly from the ruler and picked as a representative
    ~1in^2 region of clean fabric, disclosed as such. No ground-truth
    value is used anywhere in this call.
    """
    roi = (280, 120, 166, 166)  # ~1in x 1in, clear of the ruler
    result = analyze_gauge(real_jersey_image, roi=roi, orientation="vertical", structure="jersey")
    assert result.success

    by_harmonic = {d.harmonic: d for d in result.wale.candidate_details}
    half = by_harmonic["0.5x"]   # the ~9.5 WPI candidate -- one leg of a V, alternates
    full = by_harmonic["1x"]     # the ~4.75 WPI candidate -- one marker per complete wale

    # The actual measured evidence, not asserted numbers: a genuine full
    # repeat's markers should look more like each other than a
    # half-period harmonic's do, and the half-period harmonic should show
    # the "A B A B" alternation signature more strongly.
    assert full.phase_consistency > half.phase_consistency
    assert half.alternating_phase_score > full.alternating_phase_score

    # And with that evidence now factored into `evidence_score` (see
    # ScoringWeights / _score_candidates), the correct full-repeat
    # candidate wins on this canonical ROI -- previously (before phase
    # consistency) this exact ROI still won narrowly, but 2 of 6 nearby
    # ROI placements picked the wrong half-period candidate instead; see
    # the module's real-photo diagnostics for the full before/after.
    assert full.selected is True
    # result.wale.spacing_px is a REFINED value (mean of clustered-position
    # diffs, see _finalize_axis_v3), not exactly the raw candidate period --
    # allow for that normal refinement drift.
    assert result.wale.spacing_px == pytest.approx(35.0, abs=6.0)
    predicted_wpi = PX_PER_INCH / result.wale.spacing_px
    assert 3.5 < predicted_wpi < 5.5  # in the true ~5 WPI neighborhood, nowhere near ~9.5


def test_real_photo_course_selection_still_unaffected_by_phase_consistency(real_jersey_image):
    """Course keeps using the restored older pipeline (see analyze_gauge)
    -- confirms adding phase-consistency evidence to the v0.3 scorer used
    for course's DIAGNOSTICS didn't quietly change what's actually
    SELECTED for course."""
    roi = (280, 120, 166, 166)
    result = analyze_gauge(real_jersey_image, roi=roi, orientation="vertical", structure="jersey")
    assert result.success
    # ~6.93 CPI (24px), matching the pre-v0.3 baseline behavior on this
    # photo, not the doubled ~3.46 CPI the v0.3 scorer alone would give.
    assert result.course.spacing_px == pytest.approx(24.0, abs=2.0)
    assert result.course.status == "confident"


def test_real_photo_no_ground_truth_reaches_the_prediction():
    """Static confirmation that `analyze_gauge` has no path for a
    ground-truth value to enter: its signature accepts only the image,
    ROI, orientation, and structure -- nothing resembling an expected
    answer."""
    import inspect

    params = set(inspect.signature(analyze_gauge).parameters)
    assert params == {"image_bgr", "roi", "orientation", "structure"}
    assert not any("actual" in p or "ground" in p or "truth" in p for p in params)
