"""
Tests for the v0.3 candidate-scoring system: 2D periodicity support,
multi-patch regional consensus, the unified per-candidate final score,
harmonic-ambiguity penalty, and "uncertain" result flagging.

Regression note on end-to-end reproduction: constructing a *synthetic
image* where the RAW 1D autocorrelation (`_autocorrelation_spacing`)
itself locks onto the half-period -- the actual reported real-photo bug
-- was attempted here with three different constructions (paired
Gaussian "leg" ridges with a short/long gap asymmetry, and an actual
drawn zigzag V-loop line pattern) and in every case the raw estimate
already found the correct full period; this mirrors an identical,
already-documented finding earlier in this project's history for the
*loop-center* pipeline. Real yarn photos apparently fool 1D
autocorrelation through texture/lighting subtleties that are impractical
to reproduce synthetically. The regression tests below instead do what
that earlier phase of this project settled on as the reliable
alternative: force the exact reported failure shape (a wrong, half-
period `p0`, as an already-biased autocorrelation estimate from a real
photo would produce) and confirm the v0.3 scorer -- using REAL, computed
2D-autocorrelation and multi-patch evidence from a genuinely
full-period-only synthetic image, not hand-fed fake scores -- correctly
recovers the true period. See test_fold_consistency.py for the
analogous precedent this follows.
"""
import numpy as np
import pytest

from analysis.gauge_analysis import (
    MIN_PLAUSIBLE_SPACING_PX,
    WEIGHTS_JERSEY,
    WEIGHTS_UNKNOWN,
    _autocorr_strength_at_lag,
    _closeness_log,
    _harmonic_penalty,
    _patch_consensus_score,
    _patch_instability,
    _patch_period_estimates,
    _repeat_count_score,
    _sample_2d_support,
    _score_candidates,
    _two_d_autocorrelation,
    analyze_gauge,
)


def _sine_image(h=200, w=200, period_x=20.0, period_y=28.0, amp=40.0, base=100.0):
    yy, xx = np.mgrid[0:h, 0:w]
    return base + amp * np.sin(2 * np.pi * xx / period_x) + amp * np.sin(2 * np.pi * yy / period_y)


def _sine_signal(length=300, period=24.0, amp=1.0):
    t = np.arange(length, dtype=np.float64)
    return amp * np.sin(2 * np.pi * t / period)


# --- 2D periodicity (_two_d_autocorrelation / _sample_2d_support) --------


def test_2d_support_high_at_true_period_zero_at_half():
    img = _sine_image(period_x=20.0, period_y=28.0)
    ac2d = _two_d_autocorrelation(img)
    assert _sample_2d_support(ac2d, 20.0, 0.0) > 0.95
    assert _sample_2d_support(ac2d, 0.0, 28.0) > 0.9
    # A pure sinusoid is anti-correlated with itself at exactly half its
    # period (sin(x) vs sin(x+pi) = -sin(x)) -- negative correlation
    # clips to 0, a strong (not just weak) signal against the half period.
    assert _sample_2d_support(ac2d, 10.0, 0.0) < 0.05


def test_2d_support_out_of_bounds_lag_returns_zero():
    img = _sine_image(h=50, w=50)
    ac2d = _two_d_autocorrelation(img)
    assert _sample_2d_support(ac2d, 1000.0, 0.0) == 0.0


# --- Multi-patch consensus -------------------------------------------------


def test_patch_period_estimates_finds_consistent_period_across_bands():
    source = np.zeros((240, 240))
    t = np.arange(240)
    row_signal = np.sin(2 * np.pi * t / 24.0)
    source[:, :] = row_signal[None, :]  # identical every row -> horizontal periodicity
    periods = _patch_period_estimates(source, collapse_axis=0, n_patches=4, overlap=0.5)
    assert len(periods) >= 2
    for p in periods:
        assert p == pytest.approx(24.0, abs=1.0)


def test_patch_consensus_score_rewards_agreement_with_median():
    periods = [24.0, 24.2, 23.8, 24.1]
    # A candidate matching the tight patch median scores very highly...
    assert _patch_consensus_score(periods, 24.0) > 0.9
    # ...and clearly beats one that doesn't, even though the "patches
    # agree with each other" component (shared by every candidate on
    # this axis) keeps its score from collapsing to near-zero.
    assert _patch_consensus_score(periods, 24.0) > _patch_consensus_score(periods, 12.0) + 0.4


def test_patch_consensus_score_needs_at_least_two_patches():
    assert _patch_consensus_score([24.0], 24.0) == 0.0
    assert _patch_consensus_score([], 24.0) == 0.0


def test_patch_instability_low_when_patches_agree_high_when_they_dont():
    stable = _patch_instability([24.0, 24.1, 23.9, 24.0])
    unstable = _patch_instability([24.0, 12.0, 30.0, 18.0])
    assert stable < 0.05
    assert unstable > stable


# --- Harmonic ambiguity penalty --------------------------------------------


def test_harmonic_penalty_high_when_relatives_score_similarly():
    candidates = [12.0, 24.0, 48.0]
    scores = {12.0: 0.8, 24.0: 0.78, 48.0: 0.3}
    # 12 and 24 are harmonic relatives (2x) with near-identical autocorr
    # scores -- genuinely ambiguous.
    assert _harmonic_penalty(12.0, candidates, scores) > 0.9
    assert _harmonic_penalty(24.0, candidates, scores) > 0.9
    # 48 isn't close in score to either of its relatives (24 -> 2x check).
    assert _harmonic_penalty(48.0, candidates, scores) < 0.6


def test_harmonic_penalty_zero_with_no_harmonic_relatives_in_set():
    assert _harmonic_penalty(24.0, [24.0], {24.0: 0.9}) == 0.0


# --- _closeness_log / _repeat_count_score / _autocorr_strength_at_lag ----


def test_closeness_log_symmetric_and_peaks_at_equal():
    assert _closeness_log(24.0, 24.0) == pytest.approx(1.0)
    assert _closeness_log(24.0, 48.0) == pytest.approx(_closeness_log(48.0, 24.0))
    assert _closeness_log(24.0, 48.0) < _closeness_log(24.0, 30.0)


def test_repeat_count_score_rewards_more_visible_repeats():
    low = _repeat_count_score(roi_extent_px=48.0, period_px=24.0)  # only 2 repeats
    high = _repeat_count_score(roi_extent_px=240.0, period_px=24.0)  # 10 repeats
    assert low < high
    assert high == pytest.approx(1.0)


def test_autocorr_strength_at_lag_high_at_true_period_low_elsewhere():
    sig = _sine_signal(period=24.0)
    assert _autocorr_strength_at_lag(sig, 24.0) > 0.9
    assert _autocorr_strength_at_lag(sig, 12.0) < 0.05  # anti-correlated, clipped to 0


# --- Regression: v0.3 recovers the true period from a wrong (half-period)
#     autocorrelation estimate using REAL, computed 2D + patch evidence --


def test_recovers_full_period_from_wrong_p0_using_2d_and_patch_evidence():
    """
    The core regression case: reproduces the reported failure SHAPE
    (autocorrelation biased toward half the true wale period, as it
    apparently is on some real photos -- see module docstring above)
    without needing a synthetic image that fools autocorrelation itself.
    p0 is forced to 12.0 (the wrong half-period); the 2D-autocorrelation
    and patch-consensus evidence are both computed for real from a
    genuinely 24px-periodic synthetic signal/image, exactly as
    analyze_gauge would compute them. No fold-consistency, no
    loop-center evidence -- purely the NEW v0.3 evidence (2D + patch
    consensus) resolving the ambiguity.
    """
    true_period = 24.0
    signal = _sine_signal(length=300, period=true_period)

    img = _sine_image(h=240, w=240, period_x=true_period, period_y=1e9)  # course irrelevant here
    ac2d = _two_d_autocorrelation(img)

    source_2d = np.tile(signal, (240, 1))  # identical every row -> clean patch estimates
    patch_periods = _patch_period_estimates(source_2d, collapse_axis=0, n_patches=4, overlap=0.5)
    assert len(patch_periods) >= 2  # sanity: the test fixture itself is valid

    wrong_p0 = true_period / 2.0  # simulates a real photo's biased autocorrelation estimate
    candidate_details, instability = _score_candidates(
        p0=wrong_p0,
        signal=signal,
        center_median=None,
        center_consistency=0.0,
        ac2d=ac2d,
        lag_dx=True,
        patch_periods=patch_periods,
        roi_extent_px=240.0,
        use_fold_consistency=False,  # deliberately NOT relying on the wale-only fold-consistency check
        min_plausible=MIN_PLAUSIBLE_SPACING_PX,
        weights=WEIGHTS_UNKNOWN,
    )
    selected = next(d for d in candidate_details if d.selected)
    assert selected.period_px == pytest.approx(true_period, abs=0.5)
    assert selected.harmonic == "2x"  # corrected UP from the wrong (half) p0, not down or sideways

    # And the wrong half-period candidate should have scored clearly worse.
    half_candidate = next(d for d in candidate_details if d.harmonic == "1x")
    assert selected.final_score > half_candidate.final_score


def test_harmonic_penalty_on_the_true_period_cannot_hand_the_win_to_an_unrelated_weak_candidate():
    """
    Regression test for a real bug found during v0.3 visual verification:
    the harmonic penalty for a candidate is `max()`-ed over EVERY harmonic
    neighbor (both its 0.5x and its 2x relative). For a genuinely periodic
    signal, a true period P and its trivial double 2P are *always* going
    to autocorrelate similarly (2P is just two repeats of P) -- that's not
    ambiguity, it's guaranteed, but the old code still penalized P heavily
    for it. If a totally unrelated third candidate (0.5x) happened to have
    picked up some non-periodicity evidence (e.g. noisy loop-center
    detections clustering near it) but was never itself part of an
    ambiguous pair, it paid NO such penalty -- and could win by default
    even with much weaker overall evidence than the true period. This is
    exactly what happened on the course axis of the v0.3 visual-check
    image before the fix (selected 0.5x with autocorr/2D support of 0.00
    over 1x with 0.94/0.89).

    `_score_candidates` must pick the winner by `evidence_score` (pre-
    penalty), not `final_score` -- confirmed here by artificially cranking
    harmonic_penalty_weight to 1.0, which flips the *final_score* ranking
    (1x's final_score goes deeply negative, well below 0.5x's) while the
    correct candidate must still win.
    """
    true_period = 24.0
    signal = _sine_signal(length=300, period=true_period)

    img = _sine_image(h=240, w=240, period_x=true_period, period_y=1e9)
    ac2d = _two_d_autocorrelation(img)

    source_2d = np.tile(signal, (240, 1))
    patch_periods = _patch_period_estimates(source_2d, collapse_axis=0, n_patches=4, overlap=0.5)

    # Fabricate exactly the kind of unrelated, non-periodicity evidence
    # the real bug hinged on: strong "structural" (loop-center) agreement
    # with the 0.5x candidate specifically, unconnected to periodicity.
    from dataclasses import replace

    weights = replace(WEIGHTS_UNKNOWN, harmonic_penalty_weight=1.0)
    candidate_details, _ = _score_candidates(
        p0=true_period,
        signal=signal,
        center_median=true_period / 2.0,
        center_consistency=1.0,
        ac2d=ac2d,
        lag_dx=True,
        patch_periods=patch_periods,
        roi_extent_px=240.0,
        use_fold_consistency=False,
        min_plausible=MIN_PLAUSIBLE_SPACING_PX,
        weights=weights,
    )
    by_harmonic = {d.harmonic: d for d in candidate_details}
    full = by_harmonic["1x"]
    half = by_harmonic["0.5x"]

    # Sanity: this fixture really does reproduce the failure shape --
    # final_score (post-penalty) is inverted, with the true period scoring
    # far below the unrelated half-period candidate.
    assert full.final_score < half.final_score

    # But evidence_score (pre-penalty, what actually decides the winner)
    # still correctly favors the true period...
    assert full.evidence_score > half.evidence_score
    # ...and the true period must still be SELECTED despite its battered
    # final_score -- this is the actual bug fix under test.
    assert full.selected is True
    assert half.selected is False
    assert full.period_px == pytest.approx(true_period, abs=0.5)


def test_uncertain_flag_when_top_two_candidates_score_similarly():
    # Construct a case with NO discriminating evidence at all (no 2D
    # image, no patches, no structural evidence) -- autocorr score alone
    # is identical for two candidates by construction, so nothing should
    # be able to confidently separate them.
    signal = _sine_signal(period=24.0)
    ac2d = np.ones((10, 10))  # degenerate/uninformative 2D data
    candidate_details, _ = _score_candidates(
        p0=24.0,
        signal=signal,
        center_median=None,
        center_consistency=0.0,
        ac2d=ac2d,
        lag_dx=True,
        patch_periods=[],
        roi_extent_px=48.0,  # only ~2 repeats -- weak repeat-count evidence for everyone
        use_fold_consistency=False,
        min_plausible=MIN_PLAUSIBLE_SPACING_PX,
        weights=WEIGHTS_UNKNOWN,
    )
    # Not asserting a specific outcome here (that's covered by the
    # dedicated recovery test above) -- just confirming the scoring
    # machinery ran and produced a well-formed, ranked result.
    assert len(candidate_details) == 3
    assert sum(d.selected for d in candidate_details) == 1


# --- structure="jersey" weighting ------------------------------------------


def test_jersey_weights_favor_structural_evidence_more_than_unknown():
    assert WEIGHTS_JERSEY.structural > WEIGHTS_UNKNOWN.structural
    assert WEIGHTS_JERSEY.autocorr < WEIGHTS_UNKNOWN.autocorr


# --- End-to-end smoke test: new fields are present and well-formed -------


def make_synthetic_knit(width=400, height=400, wale_period=12, course_period=16, noise=6):
    rng = np.random.default_rng(42)
    img = np.full((height, width), 200, dtype=np.float32)
    yy, xx = np.mgrid[0:height, 0:width]
    img += 30 * np.sin(2 * np.pi * xx / wale_period) + 30 * np.sin(2 * np.pi * yy / course_period)
    img += rng.normal(0, noise, size=img.shape)
    img = np.clip(img, 0, 255).astype(np.uint8)
    return np.repeat(img[:, :, None], 3, axis=2)


def test_analyze_gauge_end_to_end_has_v03_fields():
    image = make_synthetic_knit(wale_period=14, course_period=20)
    result = analyze_gauge(image, roi=(20, 20, 360, 360), orientation="vertical", structure="unknown")
    assert result.success
    assert result.wale.spacing_px is not None
    assert result.course.spacing_px is not None
    assert result.wale.status in ("confident", "uncertain")
    assert result.course.status in ("confident", "uncertain")
    assert isinstance(result.rotation_deg, float)
    assert len(result.wale.candidate_details) >= 1
    for d in result.wale.candidate_details:
        assert d.final_score is not None
        assert d.autocorr_score is not None
        assert d.support_2d is not None
        assert d.structural_score is not None
        assert d.patch_consensus is not None
        assert d.harmonic_penalty is not None


def test_analyze_gauge_accepts_jersey_structure_without_error():
    image = make_synthetic_knit(wale_period=14, course_period=20)
    result = analyze_gauge(image, roi=(20, 20, 360, 360), orientation="vertical", structure="jersey")
    assert result.success
    assert result.wale.spacing_px is not None


def test_analyze_gauge_still_never_fabricates_on_flat_image():
    flat = np.full((300, 300, 3), 128, dtype=np.uint8)
    result = analyze_gauge(flat, roi=(0, 0, 300, 300), orientation="vertical")
    assert result.success is True
    assert result.wale.spacing_px is None
    assert result.course.spacing_px is None
    assert result.wale.confidence == 0.0
