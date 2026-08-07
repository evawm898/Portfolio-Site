"""
Focused, precise tests for the harmonic-disambiguation mechanism added to
fix a real structural bug: the 1D autocorrelation estimate can lock onto
a sub-feature of a knit loop (e.g. one leg of a V-shaped loop, or a
doubled/skipped repeat) instead of the true loop-to-loop period. These
tests exercise `_reconcile_period`, `_estimate_pitch_from_centers`, and
`_cluster_positions` directly with hand-crafted inputs, so the decision
logic is verified precisely and deterministically — independent of how
well any particular synthetic *image* happens to fool (or fail to fool)
the loop-center detector, which is a separate, much fuzzier concern
covered by the end-to-end tests in test_gauge_analysis.py and
test_loop_center_detection.py.
"""
import numpy as np
import pytest

from analysis.gauge_analysis import (
    MIN_PLAUSIBLE_SPACING_PX,
    _cluster_positions,
    _estimate_pitch_from_centers,
    _reconcile_period,
)


# --- _reconcile_period ---------------------------------------------------


def test_reconcile_confirms_when_autocorrelation_already_matches_loop_centers():
    decision = _reconcile_period(p0=24.0, p_centers=24.0, min_plausible=MIN_PLAUSIBLE_SPACING_PX)
    assert decision.period == pytest.approx(24.0)
    assert decision.corrected is False
    assert decision.validated is True
    assert "matches loop-center spacing" in decision.reason
    assert set(decision.candidates) == {12.0, 24.0, 48.0}


def test_reconcile_corrects_up_when_autocorrelation_locked_onto_a_leg_sub_repeat():
    # This is the reported failure mode: autocorrelation found a period
    # that's actually half the true loop repeat (e.g. one leg of a V),
    # while independent loop-center evidence shows the true, larger repeat.
    decision = _reconcile_period(p0=12.0, p_centers=24.0, min_plausible=MIN_PLAUSIBLE_SPACING_PX)
    assert decision.period == pytest.approx(24.0)
    assert decision.corrected is True
    assert decision.validated is True
    assert "sub-loop harmonic" in decision.reason
    assert "corrected up" in decision.reason


def test_reconcile_corrects_down_when_autocorrelation_doubled_the_repeat():
    # The opposite failure: autocorrelation skipped every other loop.
    decision = _reconcile_period(p0=48.0, p_centers=24.0, min_plausible=MIN_PLAUSIBLE_SPACING_PX)
    assert decision.period == pytest.approx(24.0)
    assert decision.corrected is True
    assert decision.validated is True
    assert "doubled repeat" in decision.reason
    assert "corrected down" in decision.reason


def test_reconcile_does_not_apply_an_arbitrary_multiplier_for_unrelated_mismatch():
    # p_centers doesn't correspond to any harmonic of p0 at all (e.g. noisy
    # evidence that slipped past the caller's own gating) — the closest
    # candidate is still chosen from the *actual* 0.5x/1x/2x set, never a
    # made-up multiplier, and it should land on whichever of the three is
    # nearest on a log scale rather than blindly trusting p_centers itself.
    decision = _reconcile_period(p0=20.0, p_centers=61.0, min_plausible=MIN_PLAUSIBLE_SPACING_PX)
    assert decision.period in {10.0, 20.0, 40.0}
    assert decision.period == pytest.approx(40.0)  # closest to 61 on a log scale among {10,20,40}


def test_reconcile_falls_back_to_autocorrelation_without_center_evidence():
    decision = _reconcile_period(p0=18.0, p_centers=None, min_plausible=MIN_PLAUSIBLE_SPACING_PX)
    assert decision.period == pytest.approx(18.0)
    assert decision.corrected is False
    assert decision.validated is False
    assert "no independent loop-center evidence" in decision.reason


def test_reconcile_uses_center_evidence_alone_when_autocorrelation_found_nothing():
    decision = _reconcile_period(p0=None, p_centers=15.0, min_plausible=MIN_PLAUSIBLE_SPACING_PX)
    assert decision.period == pytest.approx(15.0)
    assert decision.validated is True


def test_reconcile_reports_nothing_detected_when_both_are_absent():
    decision = _reconcile_period(p0=None, p_centers=None, min_plausible=MIN_PLAUSIBLE_SPACING_PX)
    assert decision.period is None
    assert decision.candidates == []


def test_reconcile_never_produces_a_candidate_outside_the_half_one_two_family():
    # Regression guard against ever hard-coding an arbitrary multiplier:
    # every candidate offered must be exactly p0/2, p0, or p0*2.
    p0 = 17.3
    decision = _reconcile_period(p0=p0, p_centers=34.9, min_plausible=MIN_PLAUSIBLE_SPACING_PX)
    allowed = {round(p0 / 2, 3), round(p0, 3), round(p0 * 2, 3)}
    assert set(decision.candidates).issubset(allowed)


# --- _estimate_pitch_from_centers ----------------------------------------


def _grid_points(n_cols, n_rows, spacing_x, spacing_y, jitter=0.0, seed=0):
    rng = np.random.default_rng(seed)
    pts = [
        (c * spacing_x + rng.normal(0, jitter), r * spacing_y + rng.normal(0, jitter))
        for r in range(n_rows)
        for c in range(n_cols)
    ]
    return np.array(pts)


def test_pitch_from_clean_grid_is_accurate_and_high_consistency():
    centers = _grid_points(n_cols=10, n_rows=8, spacing_x=24.0, spacing_y=32.0)
    median_x, consistency_x = _estimate_pitch_from_centers(centers, axis_index=0, band_tolerance_px=8.0)
    median_y, consistency_y = _estimate_pitch_from_centers(centers, axis_index=1, band_tolerance_px=10.0)
    assert median_x == pytest.approx(24.0, abs=0.5)
    assert median_y == pytest.approx(32.0, abs=0.5)
    assert consistency_x > 0.9
    assert consistency_y > 0.9


def test_pitch_from_jittered_grid_still_reasonable_but_less_consistent():
    tight = _grid_points(10, 8, 24.0, 32.0, jitter=0.0)
    jittered = _grid_points(10, 8, 24.0, 32.0, jitter=6.0, seed=3)
    _, consistency_tight = _estimate_pitch_from_centers(tight, axis_index=0, band_tolerance_px=8.0)
    _, consistency_jittered = _estimate_pitch_from_centers(jittered, axis_index=0, band_tolerance_px=8.0)
    assert consistency_jittered < consistency_tight


def test_pitch_from_random_scatter_has_low_consistency():
    rng = np.random.default_rng(1)
    scatter = rng.uniform(0, 200, size=(60, 2))
    _, consistency = _estimate_pitch_from_centers(scatter, axis_index=0, band_tolerance_px=15.0)
    # Not a strict guarantee for any random draw, but scattered noise should
    # not look anywhere near as clean as a real lattice.
    assert consistency < 0.85


def test_pitch_returns_none_with_too_few_centers():
    centers = np.array([[0.0, 0.0], [10.0, 0.0]])
    median, consistency = _estimate_pitch_from_centers(centers, axis_index=0, band_tolerance_px=5.0)
    assert median is None
    assert consistency == 0.0


# --- _cluster_positions ---------------------------------------------------


def test_cluster_positions_groups_points_within_half_period():
    # Three loop centers' x-coordinates for each of several columns near
    # x=10, x=34, x=58 (period 24) — clustering should collapse each group
    # to one position near its true column center.
    coords = np.array([9.0, 10.0, 11.0, 33.0, 35.0, 57.0, 59.0, 60.0])
    positions = _cluster_positions(coords, period=24.0)
    assert len(positions) == 3
    assert positions[0] == pytest.approx(10.0, abs=1.0)
    assert positions[1] == pytest.approx(34.0, abs=1.0)
    assert positions[2] == pytest.approx(58.7, abs=1.0)


def test_cluster_positions_empty_input():
    assert _cluster_positions(np.array([]), period=10.0) == []
