"""
Tests for _template_match_consistency_score: the automatic, self-anchored
sibling of count_repeats_by_template_match (see the module comment above
it in analysis/gauge_analysis.py). Given a candidate period, it auto-
anchors at a real detected peak, walks outward with the same
_walk_template_matches core the user-anchored path uses, and returns how
strongly a real patch of texture keeps recurring at that spacing -- one
more evidence term for _score_candidates, wired in ScoringWeights as
`template_match`.

Real-photo validation (empirical tuning pass, see ScoringWeights.
template_match's comment for how its starting weight was funded):
checked the wale axis's full candidate breakdown across 6 real ROIs (the
jersey fixture, plus all 5 teal ROIs from test_wale_scoring_weights.py)
-- in every one, the winning candidate never changed vs. template_match
disabled entirely (no regression), and in 4 of 6, template_match_score
was strongly positive (~0.7) for exactly the winning candidate and a
clean 0.0 for every harmonic alternative -- including, on jersey's course
axis, correctly confirming both the true period AND its trivial double
(a real period always reconfirms at 2x, that's not ambiguity -- see
_harmonic_penalty's docstring) while flatly rejecting the dangerous
half-period harmonic (0.0). In the other 2 (both small, ~1in teal
windows), it returned 0.0 for EVERY candidate -- non-discriminating, not
mis-discriminating: teal's fuzzier, more heavily-plied texture (already
documented as a genuine limitation for the user-anchored path too, see
README.md) doesn't correlate strongly enough for auto-anchored matching
to confirm anything there, but it never once favored a wrong candidate
over the right one in any of the 6 cases checked.

None of this reads ground truth. analyze_gauge() has no ground-truth
parameter -- these values are only compared against known-true numbers
in the test bodies below, after the fact, same as every other real-photo
test in this project.
"""
import os

import cv2
import numpy as np
import pytest

from analysis.gauge_analysis import (
    TEMPLATE_MATCH_MIN_PERIOD_PX,
    _COLLAPSE_AXIS,
    _detect_peaks,
    _direction_for,
    _enhance_texture,
    _project,
    _template_match_consistency_score,
    analyze_gauge,
)

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
REAL_JERSEY_PATH = os.path.join(FIXTURES_DIR, "real_jersey_sample.jpg")
REAL_TEAL_PATH = os.path.join(FIXTURES_DIR, "sarahmaker-knitting-gauge.jpg")


def _sine_signal(length=300, period=24.0, amp=1.0):
    t = np.arange(length, dtype=np.float64)
    return amp * np.sin(2 * np.pi * t / period)


# --- Input validation / "couldn't measure" neutral cases -------------------


def test_no_normalized_2d_is_neutral():
    signal = _sine_signal(period=24.0)
    assert _template_match_consistency_score(None, signal, 24.0, True) == 0.5


def test_period_too_small_is_neutral():
    rng = np.random.default_rng(1)
    img = rng.normal(128, 20, size=(100, 100)).astype(np.uint8)
    signal = _sine_signal(period=2.0)
    assert _template_match_consistency_score(img, signal, TEMPLATE_MATCH_MIN_PERIOD_PX - 1.0, True) == 0.5


def test_flat_signal_with_no_peaks_is_neutral():
    rng = np.random.default_rng(2)
    img = rng.normal(128, 20, size=(100, 100)).astype(np.uint8)
    flat_signal = np.zeros(300)
    assert _template_match_consistency_score(img, flat_signal, 24.0, True) == 0.5


def test_returns_a_score_in_zero_one_range_on_random_noise():
    # Random noise has no real repeating texture -- the walk should either
    # find nothing (0.0) or stay neutral (0.5), never claim strong
    # confirmation of a period that isn't really there.
    rng = np.random.default_rng(3)
    img = rng.normal(128, 20, size=(120, 200)).astype(np.uint8)
    signal = img.mean(axis=0)
    score = _template_match_consistency_score(img, signal, 20.0, True)
    assert 0.0 <= score <= 0.5


# --- lag_dx orientation handling -------------------------------------------


def test_lag_dx_false_transposes_before_searching():
    # A texture that repeats along ROWS (y), not columns, should still be
    # measurable when lag_dx=False -- confirms the working-frame
    # transpose (same convention as _extract_phase_patch / analyze_gauge's
    # own work_gray = gray if along_x else gray.T) is applied correctly,
    # not just silently returning neutral because the wrong axis is
    # being searched.
    period = 20.0
    h, w = 200, 60
    yy = np.arange(h)
    row_pattern = (128 + 100 * np.sin(2 * np.pi * yy / period)).astype(np.uint8)
    img = np.tile(row_pattern.reshape(h, 1), (1, w))
    signal = img.mean(axis=1)  # collapse the varying (row) axis -> position space = y, matches lag_dx=False
    score = _template_match_consistency_score(img, signal, period, False)
    assert score > 0.3


# --- Real-photo validation --------------------------------------------------


@pytest.fixture()
def real_jersey_image():
    if not os.path.exists(REAL_JERSEY_PATH):
        pytest.skip("real_jersey_sample.jpg fixture not present")
    img = cv2.imread(REAL_JERSEY_PATH)
    assert img is not None
    return img


@pytest.fixture()
def real_teal_image():
    if not os.path.exists(REAL_TEAL_PATH):
        pytest.skip("sarahmaker-knitting-gauge.jpg fixture not present")
    img = cv2.imread(REAL_TEAL_PATH)
    assert img is not None
    return img


def test_real_jersey_wale_template_match_confirms_true_period_not_half(real_jersey_image):
    roi = (280, 120, 166, 166)
    x, y, w, h = roi
    crop = real_jersey_image[y : y + h, x : x + w]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    normalized, gx, gy = _enhance_texture(gray)
    wale_direction, _ = _direction_for("vertical")
    lag_dx = wale_direction == "horizontal"
    source = gx if lag_dx else gy
    signal = _project(source, axis=_COLLAPSE_AXIS[wale_direction])

    true_period = 35.0  # confirmed correct via analyze_gauge on this exact ROI (see test_phase_consistency.py)
    half_period = 17.5

    true_score = _template_match_consistency_score(normalized, signal, true_period, lag_dx)
    half_score = _template_match_consistency_score(normalized, signal, half_period, lag_dx)

    assert true_score > 0.5
    assert half_score == 0.0
    assert true_score > half_score


def test_real_jersey_course_template_match_confirms_period_and_its_double(real_jersey_image):
    # A real period P and its trivial double 2P are SUPPOSED to both
    # confirm (see _harmonic_penalty's docstring: this is guaranteed, not
    # ambiguity) -- only the half-period should be rejected.
    roi = (280, 120, 166, 166)
    x, y, w, h = roi
    crop = real_jersey_image[y : y + h, x : x + w]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    normalized, gx, gy = _enhance_texture(gray)
    _, course_direction = _direction_for("vertical")
    lag_dx = course_direction == "horizontal"
    source = gx if lag_dx else gy
    signal = _project(source, axis=_COLLAPSE_AXIS[course_direction])

    true_period = 24.0  # confirmed correct via analyze_gauge on this exact ROI
    double_period = 48.0
    half_period = 12.0

    assert _template_match_consistency_score(normalized, signal, true_period, lag_dx) > 0.5
    assert _template_match_consistency_score(normalized, signal, double_period, lag_dx) > 0.5
    assert _template_match_consistency_score(normalized, signal, half_period, lag_dx) == 0.0


def test_template_match_never_flips_the_winner_on_real_photos(real_jersey_image, real_teal_image):
    # The weight this score is given (ScoringWeights.template_match) must
    # not change any already-correct real-photo selection -- confirmed
    # empirically during tuning (see this file's module docstring) across
    # jersey + all 5 teal windows from test_wale_scoring_weights.py; this
    # test locks in the jersey case end-to-end (full teal sweep already
    # covered by test_wale_scoring_weights.py's own parametrized test,
    # which passes unchanged with template_match wired in).
    result = analyze_gauge(real_jersey_image, (280, 120, 166, 166), orientation="vertical", structure="jersey")
    winner = next(c for c in result.wale.candidate_details if c.selected)
    assert winner.period_px == pytest.approx(35.0)
    assert winner.template_match_score > 0.5
