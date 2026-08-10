"""
Tests for the fold-consistency structural check added to fix a real,
still-doubling wale bug: on a jersey sample the detector was placing one
marker per LEG of the V-shaped loop (predicted ~9.55 wales/in against a
~5 wales/in ground truth -- a clean ~2x error), because the loop-center
evidence used to catch exactly this in `_reconcile_period` is itself
seeded from the same (possibly-biased) coarse autocorrelation scale, so
on some photos it can "confirm" the same wrong, too-fine period instead
of catching it.

Fold-consistency is a second, differently-grounded structural signal:
stack the 1D wale-direction signal into chunks at a candidate period and
measure how self-similar those chunks are. A genuine complete-loop
repeat reproduces the same waveform every period (chunks correlate
strongly); a period that isolates one leg of a V instead alternates
between the two (structurally different) legs, so chunks correlate
poorly, even when plain autocorrelation shows a strong peak there.

These tests use hand-constructed signals with a known, deliberate
LEG-PAIR asymmetry (a short gap between a loop's two legs, a longer gap
to the next loop's near leg) -- the same alternating short/long pattern
a real V-shaped loop's two legs produce in a signed-gradient projection
-- so the fold-consistency math is exercised precisely and
deterministically, independent of whether any particular synthetic
*image* happens to fool the coarse autocorrelation into landing on the
half period too (a separate, much fuzzier concern already documented as
impractical to construct reliably -- see test_loop_center_reconciliation.py).
"""
import numpy as np
import pytest

from analysis.gauge_analysis import (
    MIN_PLAUSIBLE_SPACING_PX,
    CandidateInfo,
    _analyze_direction,
    _fold_consistency,
    _reconcile_period,
)


def leg_pair_signal(n_periods=14, period=24.0, short_frac=0.3, bump_width=2.2):
    """
    A 1D signal with two similarly-shaped positive "leg" bumps per true
    wale period: a SHORT gap between a loop's two legs, a LONGER gap
    between one loop's trailing leg and the next loop's leading leg --
    mirroring what a signed horizontal gradient looks like across a row
    of V-shaped face-knit loops. The short/long alternation is the only
    thing distinguishing "one complete loop" (period) from "one leg"
    (period/2, roughly) -- a naive same-height-peak read of the signal
    can't tell them apart, which is exactly the bug being fixed.
    """
    length = int(period * n_periods)
    x = np.arange(length, dtype=np.float64)
    signal = np.zeros(length)
    short_gap = period * short_frac
    pos = 0.0
    centers = []
    while pos < length - period:
        centers.append(pos)
        centers.append(pos + short_gap)
        pos += period
    for c in centers:
        signal += np.exp(-0.5 * ((x - c) / bump_width) ** 2)
    return signal - signal.mean()


# --- _fold_consistency ----------------------------------------------------


def test_fold_consistency_high_at_true_period_low_at_half():
    sig = leg_pair_signal(period=24.0, short_frac=0.3)
    fold_full = _fold_consistency(sig, 24.0, MIN_PLAUSIBLE_SPACING_PX)
    fold_half = _fold_consistency(sig, 12.0, MIN_PLAUSIBLE_SPACING_PX)
    fold_double = _fold_consistency(sig, 48.0, MIN_PLAUSIBLE_SPACING_PX)
    assert fold_full > 0.9, fold_full
    assert fold_half < 0.2, fold_half  # the half-period alternates between two different leg shapes
    assert fold_double > 0.8, fold_double  # doubling doesn't break self-similarity, just less efficient
    assert fold_full > fold_half + 0.5


def test_fold_consistency_zero_on_flat_signal():
    assert _fold_consistency(np.zeros(200), 20.0, MIN_PLAUSIBLE_SPACING_PX) == 0.0


def test_fold_consistency_zero_for_implausibly_small_period():
    sig = leg_pair_signal()
    assert _fold_consistency(sig, 1.0, MIN_PLAUSIBLE_SPACING_PX) == 0.0


def test_fold_consistency_zero_with_too_few_chunks():
    sig = leg_pair_signal(n_periods=2, period=24.0)
    # Only ~2 repeats available -- not enough chunks to say anything.
    assert _fold_consistency(sig, 24.0, MIN_PLAUSIBLE_SPACING_PX) == 0.0


def test_fold_consistency_high_on_clean_sine_at_its_own_period():
    # A plain sinusoid (no leg-pair ambiguity) should fold consistently at
    # its true period -- sanity check that fold-consistency doesn't
    # penalize ordinary periodic signals like the ones the existing
    # end-to-end tests (test_gauge_analysis.py) already rely on.
    t = np.arange(240)
    sig = np.sin(2 * np.pi * t / 20.0)
    assert _fold_consistency(sig, 20.0, MIN_PLAUSIBLE_SPACING_PX) > 0.95


# --- _reconcile_period with signal (fold-consistency override) -----------


def test_override_to_full_period_when_no_center_evidence_available():
    # The reported failure shape: autocorrelation locked onto the
    # leg-to-leg spacing (12px) with no loop-center evidence to fall back
    # on -- fold-consistency alone should still catch it and correct up
    # to the structurally-consistent full loop period (24px).
    sig = leg_pair_signal(period=24.0, short_frac=0.3)
    decision = _reconcile_period(p0=12.0, p_centers=None, min_plausible=MIN_PLAUSIBLE_SPACING_PX, signal=sig)
    assert decision.period == pytest.approx(24.0)
    assert decision.corrected is True
    assert decision.validated is True
    assert "structurally inconsistent" in decision.reason
    assert "leg of a V-shaped loop" in decision.reason


def test_override_even_when_loop_center_evidence_agrees_with_the_wrong_period():
    # The specific failure mode this was added for: the loop-center
    # detector's own scale is seeded from the coarse period, so on a real
    # photo it can inherit the SAME too-fine bias and "confirm" 12px
    # instead of catching it. Fold-consistency, computed independently
    # from the loop-center pipeline, should still win.
    sig = leg_pair_signal(period=24.0, short_frac=0.3)
    decision = _reconcile_period(p0=12.0, p_centers=12.0, min_plausible=MIN_PLAUSIBLE_SPACING_PX, signal=sig)
    assert decision.period == pytest.approx(24.0)
    assert decision.corrected is True
    assert "loop-center detector inherited the same leg-scale bias" in decision.reason


def test_no_override_when_signal_omitted_matches_prior_behavior():
    # Without a signal, behavior must be byte-for-byte the same as before
    # this change (course axis; and any caller that doesn't opt in).
    decision_no_signal = _reconcile_period(p0=12.0, p_centers=12.0, min_plausible=MIN_PLAUSIBLE_SPACING_PX)
    assert decision_no_signal.period == pytest.approx(12.0)
    assert decision_no_signal.corrected is False


def test_no_override_when_fold_consistency_does_not_clearly_prefer_another_candidate():
    # A clean sinusoid has no leg-pair ambiguity -- fold-consistency
    # shouldn't second-guess an already-correct estimate.
    t = np.arange(240)
    sig = np.sin(2 * np.pi * t / 20.0)
    decision = _reconcile_period(p0=20.0, p_centers=None, min_plausible=MIN_PLAUSIBLE_SPACING_PX, signal=sig)
    assert decision.period == pytest.approx(20.0)
    assert decision.corrected is False


def test_candidate_details_reflect_harmonics_scores_and_selection():
    # Harmonic labels are relative to the RAW autocorrelation estimate
    # (p0=12, the leg-locked period), not the corrected answer: 0.5x=6,
    # 1x=12 (p0 itself, ultimately rejected), 2x=24 (the actual full loop
    # repeat, and what gets selected).
    sig = leg_pair_signal(period=24.0, short_frac=0.3)
    decision = _reconcile_period(p0=12.0, p_centers=None, min_plausible=MIN_PLAUSIBLE_SPACING_PX, signal=sig)
    by_harmonic = {d.harmonic: d for d in decision.candidate_details}
    assert set(by_harmonic) == {"0.5x", "1x", "2x"}
    assert by_harmonic["0.5x"].period_px == pytest.approx(6.0)
    assert by_harmonic["1x"].period_px == pytest.approx(12.0)
    assert by_harmonic["2x"].period_px == pytest.approx(24.0)
    # Every candidate should carry a fold_consistency score since a signal was given.
    assert all(d.fold_consistency is not None for d in decision.candidate_details)
    # Exactly one candidate is selected, and it's the corrected (24px) one.
    selected = [d for d in decision.candidate_details if d.selected]
    assert len(selected) == 1
    assert selected[0].period_px == pytest.approx(24.0)
    assert selected[0].harmonic == "2x"


def test_candidate_details_empty_without_signal_and_no_override():
    decision = _reconcile_period(p0=20.0, p_centers=None, min_plausible=MIN_PLAUSIBLE_SPACING_PX)
    # No fold_consistency scores computed when no signal was provided.
    assert all(d.fold_consistency is None for d in decision.candidate_details)


# --- _analyze_direction wiring (use_fold_consistency flag) ----------------


def test_analyze_direction_applies_fold_consistency_only_when_flagged():
    sig = leg_pair_signal(period=24.0, short_frac=0.3)
    empty_centers = np.empty((0, 2))

    with_flag = _analyze_direction(sig, p0=12.0, p_centers=None, loop_centers=empty_centers, center_axis_index=0, use_fold_consistency=True)
    without_flag = _analyze_direction(sig, p0=12.0, p_centers=None, loop_centers=empty_centers, center_axis_index=0, use_fold_consistency=False)

    assert with_flag.spacing_px == pytest.approx(24.0, abs=1.0)
    # Without the flag, falls back to the pre-existing (uncorrected) behavior.
    assert without_flag.spacing_px == pytest.approx(12.0, abs=1.0)
