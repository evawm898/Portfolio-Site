"""
Regression tests for a real bug found on a real jersey photo: cv-v0.3's
new evidence-based candidate scorer, when used for the COURSE axis,
selected a doubled (2x) course period on real fabric texture even though
the older, previously-proven per-axis reconciliation (coarse
autocorrelation + loop-center pitch, `_analyze_direction`) already
pointed at the correct one -- flipping course from a correct ~6.87 c/in
to a wrong ~3.47 c/in, while wale (which never had a working baseline to
begin with) was essentially unchanged.

Per the user's explicit request, COURSE axis selection was restored to
the older, proven pipeline; the v0.3 scorer still runs alongside it
purely to supply richer per-candidate diagnostics for display. These
tests confirm that wiring directly -- they don't (and, per the module
docstring in gauge_analysis.py, likely can't practically) reproduce the
exact real-photo failure shape in a synthetic image, so they instead
verify the ARCHITECTURE: course's selected spacing/positions/confidence
come from `_analyze_direction`, not from whatever `_analyze_axis_v3`
would have picked, while still carrying v0.3-style diagnostic fields.
"""
from dataclasses import replace as _dc_replace
from unittest.mock import patch

import cv2
import numpy as np
import pytest

from analysis.gauge_analysis import (
    UNCERTAIN_CONFIDENCE_THRESHOLD,
    AxisResult,
    CandidateInfo,
    _apply_confidence_floor_uncertainty,
    _analyze_axis_v3,
    analyze_gauge,
)


def make_blob_grid(width=400, height=400, wale_period=24, course_period=32, blob_amp=45, seed=1):
    """A grid of compact bright Gaussian blobs at a known period, standing in for loop heads."""
    rng = np.random.default_rng(seed)
    img = np.full((height, width), 180, dtype=np.float32)
    yy, xx = np.mgrid[0:height, 0:width]
    for row_c in np.arange(course_period / 2, height, course_period):
        for col_c in np.arange(wale_period / 2, width, wale_period):
            d2 = (xx - col_c) ** 2 + (yy - row_c) ** 2
            sigma = min(wale_period, course_period) * 0.16
            img += blob_amp * np.exp(-d2 / (2 * sigma**2))
    img += rng.normal(0, 3, size=img.shape)
    img = np.clip(img, 0, 255).astype(np.uint8)
    return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)


def _replace_selected(candidate_info, selected):
    return _dc_replace(candidate_info, selected=selected)


def test_course_selection_ignores_a_wrong_v3_pick_but_keeps_its_diagnostics():
    """
    The core regression guard: force `_analyze_axis_v3` (used for course
    purely as a diagnostics source now) to return an obviously-wrong
    doubled candidate as "selected", and confirm `analyze_gauge`'s actual
    course.spacing_px/positions_px do NOT follow it -- while
    candidate_details still carries the v0.3-style score breakdown
    (autocorr_score etc. not None), proving the diagnostics survive the
    restoration.
    """
    wale_period, course_period = 24, 32
    img = make_blob_grid(wale_period=wale_period, course_period=course_period)
    real_analyze_axis_v3 = _analyze_axis_v3

    def fake_analyze_axis_v3(*args, **kwargs):
        result = real_analyze_axis_v3(*args, **kwargs)
        if kwargs.get("use_fold_consistency") is False:  # the course call only
            # Corrupt it exactly like the real bug did: report double the
            # true period as "selected" among the SAME real candidate
            # family v3 actually computed (so the true period is still
            # present for the restored old pipeline to correctly match
            # against and re-select).
            wrong = next((d.period_px for d in result.candidate_details if d.harmonic == "2x"), None)
            assert wrong is not None  # sanity: the 2x candidate exists in this fixture
            corrupted_details = [
                d if d.period_px != wrong else _replace_selected(d, True)
                for d in (_replace_selected(d, False) for d in result.candidate_details)
            ]
            return AxisResult(
                spacing_px=wrong,
                positions_px=[10.0, 10.0 + wrong],
                confidence=0.95,
                message="",
                candidates_px=result.candidates_px,
                selected_reason="fake corrupted v3 selection",
                candidate_details=corrupted_details,
            )
        return result

    with patch("analysis.gauge_analysis._analyze_axis_v3", side_effect=fake_analyze_axis_v3):
        result = analyze_gauge(img, roi=(20, 20, 360, 360), orientation="vertical")

    assert result.success
    # Course must NOT have taken the corrupted (doubled) v3 answer.
    assert result.course.spacing_px == pytest.approx(course_period, abs=3)
    assert result.course.spacing_px != pytest.approx(course_period * 2, abs=3)
    assert "fake corrupted v3 selection" not in result.course.selected_reason

    # But its candidate_details should still carry the v0.3 diagnostic
    # fields (from the real, uncorrupted v3 call's breakdown) -- not be
    # empty or fall back to the older bare-bones CandidateInfo shape.
    assert len(result.course.candidate_details) >= 1
    assert any(d.autocorr_score is not None for d in result.course.candidate_details)
    selected = [d for d in result.course.candidate_details if d.selected]
    assert len(selected) == 1
    # The selected candidate's raw period, not _finalize_axis's refined
    # spacing_px (a mean of clustered-position diffs) -- allow for that
    # refinement's normal small drift from the raw candidate value.
    assert selected[0].period_px == pytest.approx(course_period, abs=3)

    # Wale, unaffected by any of this, should still come straight from
    # the (real, uncorrupted) v3 call.
    assert result.wale.spacing_px == pytest.approx(wale_period, abs=3)


def test_wale_selection_still_uses_v3_scorer_directly():
    """Sanity check the other half of the split: wale's own v3 call is
    NOT corrupted in the test above, and this confirms wale really is
    still driven by `_analyze_axis_v3` (evidence_score-based selection,
    "Evidence score" wording) rather than silently also being switched
    to the older pipeline."""
    wale_period, course_period = 24, 32
    img = make_blob_grid(wale_period=wale_period, course_period=course_period)
    result = analyze_gauge(img, roi=(20, 20, 360, 360), orientation="vertical")
    assert result.success
    assert "Evidence score" in result.wale.selected_reason


# --- _apply_confidence_floor_uncertainty ----------------------------------


def _axis(confidence, status="confident", spacing_px=20.0, uncertain_reason=None):
    return AxisResult(
        spacing_px=spacing_px,
        positions_px=[10.0, 30.0, 50.0],
        confidence=confidence,
        message="",
        status=status,
        uncertain_reason=uncertain_reason,
    )


def test_confidence_floor_flags_uncertain_below_threshold():
    axis = _axis(confidence=UNCERTAIN_CONFIDENCE_THRESHOLD - 0.05)
    result = _apply_confidence_floor_uncertainty(axis)
    assert result.status == "uncertain"
    assert result.uncertain_reason is not None
    assert "low" in result.uncertain_reason.lower()


def test_confidence_floor_leaves_confident_results_alone_above_threshold():
    axis = _axis(confidence=UNCERTAIN_CONFIDENCE_THRESHOLD + 0.2)
    result = _apply_confidence_floor_uncertainty(axis)
    assert result.status == "confident"
    assert result.uncertain_reason is None


def test_confidence_floor_never_downgrades_already_uncertain_or_overwrites_its_reason():
    axis = _axis(
        confidence=UNCERTAIN_CONFIDENCE_THRESHOLD - 0.1,
        status="uncertain",
        uncertain_reason="Competing 0.5x harmonic candidate scored nearly as well.",
    )
    result = _apply_confidence_floor_uncertainty(axis)
    assert result.status == "uncertain"
    assert result.uncertain_reason == "Competing 0.5x harmonic candidate scored nearly as well."


def test_confidence_floor_no_op_when_no_spacing_detected():
    axis = _axis(confidence=0.0, spacing_px=None)
    result = _apply_confidence_floor_uncertainty(axis)
    assert result.status == "confident"  # nothing to be "uncertain" about
