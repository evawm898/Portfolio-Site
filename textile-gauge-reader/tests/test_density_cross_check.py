"""
Tests for `_cross_check_density`, the second, structurally-independent
harmonic check added after a real-world bug report: on a real photo, the
per-axis loop-center evidence in `_reconcile_period` can inherit the same
harmonic bias it's meant to catch, because the loop-center detection scale
is itself seeded from the coarse autocorrelation period. Both "independent"
signals then agree on the same wrong (too-fine) period, and the per-axis
check sees nothing to correct.

Loop DENSITY (N detected loop centers over the ROI's area) doesn't share
that dependency, so these tests construct the exact failure shape reported
(wale axis locked onto half its true spacing while course was already
correct) directly at the AxisResult level — deterministic and independent
of any particular synthetic image's ability to fool the detector.
"""
import numpy as np
import pytest

from analysis.gauge_analysis import AxisResult, CandidateInfo, _cross_check_density


def _axis(spacing_px, candidates_px, confidence=0.7, candidate_details=None):
    return AxisResult(
        spacing_px=spacing_px,
        positions_px=[],
        confidence=confidence,
        message="",
        candidates_px=candidates_px,
        selected_reason="test fixture",
        candidate_details=candidate_details or [],
    )


def _dummy_signal(n=64):
    return np.zeros(n, dtype=np.float64)


def test_corrects_wale_halved_when_course_already_correct():
    # Reproduces the reported bug: wale spacing detected at half its true
    # value (17.4px instead of 34.8px), course spacing already correct
    # (24.2px). True cell area = 34.8 * 24.2 = 842.16; loop-center count
    # is set to match that true density, not the (wrong) current one.
    wale = _axis(17.4, [8.7, 17.4, 34.8], confidence=0.6)
    course = _axis(24.2, [12.1, 24.2, 48.4], confidence=0.8)
    roi_area = 163.0 * 163.0
    n_centers = round(roi_area / (34.8 * 24.2))  # density implied by the TRUE spacing
    loop_centers = np.zeros((n_centers, 2))

    new_wale, new_course = _cross_check_density(
        wale, course,
        loop_centers=loop_centers,
        wale_center_axis=0, course_center_axis=1,
        wale_p_centers=None, course_p_centers=None,
        wale_signal=_dummy_signal(), course_signal=_dummy_signal(),
        roi_area=roi_area,
    )

    assert new_wale.spacing_px == pytest.approx(34.8, abs=0.1)
    assert "Density cross-check" in new_wale.selected_reason
    assert "corrected" in new_wale.selected_reason
    # Course was already right and should be left untouched.
    assert new_course.spacing_px == pytest.approx(24.2)
    assert new_course.selected_reason == "test fixture"


def test_corrects_course_halved_when_wale_already_correct():
    # Mirror case: course is the one locked onto a sub-loop harmonic.
    wale = _axis(34.8, [17.4, 34.8, 69.6], confidence=0.85)
    course = _axis(12.1, [6.05, 12.1, 24.2], confidence=0.55)
    roi_area = 163.0 * 163.0
    n_centers = round(roi_area / (34.8 * 24.2))
    loop_centers = np.zeros((n_centers, 2))

    new_wale, new_course = _cross_check_density(
        wale, course,
        loop_centers=loop_centers,
        wale_center_axis=0, course_center_axis=1,
        wale_p_centers=None, course_p_centers=None,
        wale_signal=_dummy_signal(), course_signal=_dummy_signal(),
        roi_area=roi_area,
    )

    assert new_course.spacing_px == pytest.approx(24.2, abs=0.1)
    assert new_wale.spacing_px == pytest.approx(34.8)


def test_ambiguous_tie_prefers_correcting_the_less_confident_axis():
    # Only wale is actually wrong here (half its true spacing; course is
    # already correct) -- but because the mismatch is a clean 2x, EITHER
    # axis's own candidate set contains a swap that reproduces the exact
    # same corrected product (doubling wale, or doubling the already-right
    # course), so which one "resolves" the density check is genuinely
    # ambiguous from density alone. The less-trusted (lower confidence)
    # axis should be the one adjusted, not whichever is checked first.
    wale = _axis(17.4, [8.7, 17.4, 34.8], confidence=0.9)     # trusted
    course = _axis(24.2, [12.1, 24.2, 48.4], confidence=0.3)  # not trusted
    roi_area = 163.0 * 163.0
    n_centers = round(roi_area / (34.8 * 24.2))
    loop_centers = np.zeros((n_centers, 2))

    new_wale, new_course = _cross_check_density(
        wale, course,
        loop_centers=loop_centers,
        wale_center_axis=0, course_center_axis=1,
        wale_p_centers=None, course_p_centers=None,
        wale_signal=_dummy_signal(), course_signal=_dummy_signal(),
        roi_area=roi_area,
    )

    # The low-confidence course axis gets adjusted (to whatever candidate
    # ties the density check), not the trusted wale one -- confirming the
    # tie-break rule itself, independent of which outcome is "correct"
    # in this particular (deliberately ambiguous) case.
    assert new_wale.spacing_px == pytest.approx(17.4)
    assert new_course.spacing_px == pytest.approx(48.4, abs=0.1)


def test_no_change_when_density_already_plausible():
    wale = _axis(34.8, [17.4, 34.8, 69.6])
    course = _axis(24.2, [12.1, 24.2, 48.4])
    roi_area = 163.0 * 163.0
    n_centers = round(roi_area / (34.8 * 24.2))  # matches current (correct) spacing
    loop_centers = np.zeros((n_centers, 2))

    new_wale, new_course = _cross_check_density(
        wale, course,
        loop_centers=loop_centers,
        wale_center_axis=0, course_center_axis=1,
        wale_p_centers=None, course_p_centers=None,
        wale_signal=_dummy_signal(), course_signal=_dummy_signal(),
        roi_area=roi_area,
    )

    assert new_wale is wale
    assert new_course is course


def test_no_change_when_too_few_loop_centers_for_evidence():
    wale = _axis(17.4, [8.7, 17.4, 34.8])
    course = _axis(24.2, [12.1, 24.2, 48.4])
    loop_centers = np.zeros((2, 2))  # below MIN_LOOP_CENTERS_FOR_EVIDENCE

    new_wale, new_course = _cross_check_density(
        wale, course,
        loop_centers=loop_centers,
        wale_center_axis=0, course_center_axis=1,
        wale_p_centers=None, course_p_centers=None,
        wale_signal=_dummy_signal(), course_signal=_dummy_signal(),
        roi_area=163.0 * 163.0,
    )

    assert new_wale is wale
    assert new_course is course


def test_no_change_when_axis_missing_spacing():
    wale = _axis(None, [])
    course = _axis(24.2, [12.1, 24.2, 48.4])
    loop_centers = np.zeros((20, 2))

    new_wale, new_course = _cross_check_density(
        wale, course,
        loop_centers=loop_centers,
        wale_center_axis=0, course_center_axis=1,
        wale_p_centers=None, course_p_centers=None,
        wale_signal=_dummy_signal(), course_signal=_dummy_signal(),
        roi_area=163.0 * 163.0,
    )

    assert new_wale is wale
    assert new_course is course


def test_never_invents_a_value_outside_the_axis_own_candidates():
    # Even with a large density mismatch, if neither axis's own candidate
    # set contains anything that resolves it, nothing changes — no made-up
    # multiplier is ever applied.
    wale = _axis(20.0, [20.0])       # only one candidate: itself
    course = _axis(20.0, [20.0])     # only one candidate: itself
    roi_area = 163.0 * 163.0
    loop_centers = np.zeros((500, 2))  # implies a wildly smaller expected cell area

    new_wale, new_course = _cross_check_density(
        wale, course,
        loop_centers=loop_centers,
        wale_center_axis=0, course_center_axis=1,
        wale_p_centers=None, course_p_centers=None,
        wale_signal=_dummy_signal(), course_signal=_dummy_signal(),
        roi_area=roi_area,
    )

    assert new_wale is wale
    assert new_course is course


# --- fold-consistency interaction (regression: density was reverting an
#     already-correct, fold-consistency-validated wale pick) -------------


def test_does_not_revert_a_fold_consistency_validated_wale_pick():
    # The exact regression this was added for: fold-consistency already
    # rejected the leg-scale candidate (fold_consistency=0.0) and picked
    # the structurally-consistent full-loop period (14px). If the
    # loop-center DETECTOR itself also inherited the leg-scale bias, N
    # (loop-center count) is inflated to match it, and density alone
    # would "resolve" the mismatch by reverting back to the very
    # candidate fold-consistency just rejected. That must not happen: a
    # candidate fold-consistency flagged as inconsistent-with-itself is
    # excluded from density's fix search entirely.
    wale = _axis(
        14.0,
        [7.0, 14.0, 28.0],
        candidate_details=[
            CandidateInfo(7.0, "0.5x", 0.0, False),   # leg-scale: rejected by fold-consistency
            CandidateInfo(14.0, "1x", 0.996, True),   # selected: structurally consistent
            CandidateInfo(28.0, "2x", 0.995, False),
        ],
    )
    course = _axis(20.0, [10.0, 20.0, 40.0])
    roi_area = 200.0 * 200.0
    # Loop-center count consistent with the WRONG (leg-scale, 7px) wale
    # pitch -- i.e. the loop-center detector inherited the same bias --
    # so density alone would want to pull wale back down to 7px.
    n_centers = round(roi_area / (7.0 * 20.0))
    loop_centers = np.zeros((n_centers, 2))

    new_wale, new_course = _cross_check_density(
        wale, course,
        loop_centers=loop_centers,
        wale_center_axis=0, course_center_axis=1,
        wale_p_centers=None, course_p_centers=None,
        wale_signal=_dummy_signal(), course_signal=_dummy_signal(),
        roi_area=roi_area,
    )

    # Stays at the fold-consistency-validated 14px -- not reverted to the
    # leg-scale 7px candidate that structural evidence already rejected.
    assert new_wale.spacing_px == pytest.approx(14.0)


def test_course_still_adjustable_when_wale_fold_consistency_blocks_it():
    # If wale's own leg-scale candidate is excluded by fold-consistency,
    # density can still fix a genuinely wrong COURSE value via course's
    # own candidates -- fold-consistency data (wale-only) never blocks
    # course from being corrected. Note: wale's un-excluded 28px candidate
    # *also* mathematically resolves the same density mismatch (doubling
    # either axis gives the same product) -- same inherent ambiguity as
    # the plain density cross-check tie-break, resolved the same way here
    # (favor adjusting the less-trusted axis: course).
    wale = _axis(
        14.0,
        [7.0, 14.0, 28.0],
        confidence=0.9,
        candidate_details=[
            CandidateInfo(7.0, "0.5x", 0.0, False),
            CandidateInfo(14.0, "1x", 0.996, True),
            CandidateInfo(28.0, "2x", 0.995, False),
        ],
    )
    course = _axis(10.0, [5.0, 10.0, 20.0], confidence=0.4)  # course halved, less trusted
    roi_area = 200.0 * 200.0
    n_centers = round(roi_area / (14.0 * 20.0))  # density matches the TRUE (corrected) course value
    loop_centers = np.zeros((n_centers, 2))

    new_wale, new_course = _cross_check_density(
        wale, course,
        loop_centers=loop_centers,
        wale_center_axis=0, course_center_axis=1,
        wale_p_centers=None, course_p_centers=None,
        wale_signal=_dummy_signal(), course_signal=_dummy_signal(),
        roi_area=roi_area,
    )

    assert new_wale.spacing_px == pytest.approx(14.0)
    assert new_course.spacing_px == pytest.approx(20.0, abs=0.1)
