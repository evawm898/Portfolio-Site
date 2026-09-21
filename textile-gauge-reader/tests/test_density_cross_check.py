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


def test_never_corrects_course_even_when_wale_already_correct():
    # Regression test: density cross-check used to be able to "fix"
    # COURSE too (mirror of the wale case above). That let a genuinely
    # correct course pick get overwritten to compensate for an unrelated
    # wale-axis error whenever wale's own candidate family didn't happen
    # to contain a value that fully closed the density gap -- confirmed
    # as the cause of a real regression on a real jersey photo (course
    # flipped from a correct ~6.87 c/in to a doubled ~3.47 c/in). Density
    # cross-check is now wale-only: `course` itself must never be
    # substituted, even when it's the axis actually causing the mismatch.
    #
    # KNOWN TRADEOFF, accepted deliberately for this fix: with only wale
    # eligible, a mismatch actually caused by a wrong COURSE value can
    # still get "resolved" by nudging wale's own candidates until the
    # product matches -- wale.spacing_px is NOT asserted unchanged here.
    # This mirrors the exact ambiguity the density check always had (it
    # cannot tell which axis is *actually* wrong from area alone); wale
    # is the axis with the known, still-unresolved harmonic-lock-on
    # problem (see the module docstring in gauge_analysis.py), so
    # accepting this direction of ambiguity is the intentional choice
    # while course detection is deliberately frozen. A more principled
    # fix (e.g. only trusting a wale substitution when wale's own
    # confidence was already suspect) is future work, not this pass.
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

    # The one guarantee this test actually exists to enforce: course
    # itself is NEVER substituted, no matter what.
    assert new_course.spacing_px == pytest.approx(12.1)
    assert new_course.selected_reason == "test fixture"


def test_only_wale_is_ever_adjusted_even_when_course_is_less_confident():
    # Same deliberately-ambiguous-by-density-alone setup as the old
    # tie-break test, but the tie-break no longer applies: course is
    # never eligible for substitution at all, regardless of its
    # (lower) confidence relative to wale.
    wale = _axis(17.4, [8.7, 17.4, 34.8], confidence=0.9)     # trusted, actually wrong (half true spacing)
    course = _axis(24.2, [12.1, 24.2, 48.4], confidence=0.3)  # not trusted, but already correct
    roi_area = 163.0 * 163.0
    n_centers = round(roi_area / (34.8 * 24.2))  # true density (matches corrected wale, unchanged course)
    loop_centers = np.zeros((n_centers, 2))

    new_wale, new_course = _cross_check_density(
        wale, course,
        loop_centers=loop_centers,
        wale_center_axis=0, course_center_axis=1,
        wale_p_centers=None, course_p_centers=None,
        wale_signal=_dummy_signal(), course_signal=_dummy_signal(),
        roi_area=roi_area,
    )

    # Wale is corrected (its own 2x candidate closes the gap); course,
    # despite being the less-confident axis, is never touched.
    assert new_wale.spacing_px == pytest.approx(34.8, abs=0.1)
    assert new_course.spacing_px == pytest.approx(24.2)
    assert new_course.selected_reason == "test fixture"


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


def test_does_not_override_a_decisive_evidence_scorer_pick():
    # Real bug, traced directly on knit_sample_01.jpg (see
    # knit_sample_ground_truth.py): the v0.3 evidence scorer had already
    # ranked the correct 85.0px candidate over the wrong 0.5x-harmonic
    # 42.5px candidate at 0.650 vs 0.553 -- a 0.097 margin, comfortably
    # above DENSITY_OVERRIDE_MAX_EVIDENCE_MARGIN (0.08) and therefore
    # decisive, not a near-tie -- and this override still replaced the
    # correct pick with the wrong one anyway. Loop-center density is set
    # to imply the (wrong) 42.5px pitch, exactly as it did on the real
    # photo, so before the gate this would have "corrected" wale away
    # from its own already-right answer.
    wale = _axis(
        85.0,
        [42.5, 85.0, 170.0],
        confidence=0.65,
        candidate_details=[
            CandidateInfo(42.5, "0.5x", None, False, evidence_score=0.553),
            CandidateInfo(85.0, "1x", None, True, evidence_score=0.650),
            CandidateInfo(170.0, "2x", None, False, evidence_score=0.2),
        ],
    )
    course = _axis(24.2, [12.1, 24.2, 48.4], confidence=0.8)
    roi_area = 163.0 * 163.0
    # Density implied by the WRONG 42.5px wale pitch -- what tempted the
    # override on the real photo.
    n_centers = round(roi_area / (42.5 * 24.2))
    loop_centers = np.zeros((n_centers, 2))

    new_wale, new_course = _cross_check_density(
        wale, course,
        loop_centers=loop_centers,
        wale_center_axis=0, course_center_axis=1,
        wale_p_centers=None, course_p_centers=None,
        wale_signal=_dummy_signal(), course_signal=_dummy_signal(),
        roi_area=roi_area,
    )

    # Gated: wale's decisive evidence-scorer pick is left alone.
    assert new_wale.spacing_px == pytest.approx(85.0)
    assert new_wale.selected_reason == "test fixture"
    assert new_course.spacing_px == pytest.approx(24.2)
    assert new_course.selected_reason == "test fixture"


def test_still_overrides_a_genuinely_ambiguous_evidence_scorer_pick():
    # Mirror of the case above with the margin narrowed under the gate
    # threshold (0.06 < 0.08): the density check must still be free to
    # fire when the scorer itself was a near-tie -- the gate closes the
    # decisive-pick bug without disabling the mechanism entirely.
    wale = _axis(
        17.4,
        [8.7, 17.4, 34.8],
        confidence=0.6,
        candidate_details=[
            CandidateInfo(8.7, "0.5x", None, True, evidence_score=0.60),
            CandidateInfo(17.4, "1x", None, False, evidence_score=0.54),
            CandidateInfo(34.8, "2x", None, False, evidence_score=0.2),
        ],
    )
    course = _axis(24.2, [12.1, 24.2, 48.4], confidence=0.8)
    roi_area = 163.0 * 163.0
    n_centers = round(roi_area / (34.8 * 24.2))  # true density
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


def test_course_never_adjusted_even_when_wale_fold_consistency_blocks_wale_fix():
    # If wale's own leg-scale candidate is excluded by fold-consistency
    # and its remaining candidates don't close the density gap, nothing
    # is corrected on EITHER axis -- course is still never eligible for
    # substitution, even though (mathematically) its own 20.0px candidate
    # would have resolved the same mismatch.
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

    # Wale's un-excluded 28px candidate *does* mathematically close this
    # particular gap too (14 * 20 == 28 * 10), so wale still gets
    # corrected here -- but course is left untouched either way.
    assert new_wale.spacing_px == pytest.approx(28.0)
    assert new_course.spacing_px == pytest.approx(10.0)
    assert new_course.selected_reason == "test fixture"
