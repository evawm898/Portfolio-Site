"""
Metamorphic invariants (tests/metamorphic.py) pinned against the real
jersey fixture — the committed regression contract for how detection
must co-vary with image transforms on a real photo.

First-run calibration results (this project's discipline: run first,
diagnose every violation, THEN commit — tolerances stay commitments, and
violations become strict xfails carrying their diagnosis, never a
loosened tolerance):

  7/10 outcomes passed outright, with three diagnosed violations. The
  strict-xfail mechanism then worked exactly as designed: fixing the
  spacing refinement (see _refine_spacing_from_positions' docstring for
  the full story) made the mirror/wale xfail XPASS, and its mark was
  removed. Current state, 8/10 passing:

  * mirror/wale — FIXED. Was a 7.6% drift: both directions selected the
    same 35.0px candidate, but the old mean-of-all-gaps refinement was
    boundary-phase sensitive (37.2 one way, 34.4 the other). The
    per-step-normalized gap estimator brought the disagreement to 0.6%,
    inside the 1% lossless-transform bound, and moved the baseline
    toward the hand-counted ground truth (37.2 -> 35.3 vs ~33 true).
  * resize/course — HARMONIC FLIP, still open. At 1.5x upscale the
    coarse autocorrelation seed itself lands on the DOUBLED family
    (candidates go [12,24,48] -> [36,72,144] instead of [18,36,72]),
    and the course axis has no independent loop-center/structural
    evidence to correct it (the selected_reason says exactly that).
    A candidate-selection instability — refinement was never the cause.
  * rotate90/wale — DRIFT, still open, and the refinement fix REVISED
    its diagnosis: the residual ~4.5% disagreement is NOT boundary
    phase. Both paths select the same 24.0px candidate, but the wale
    pipeline refines from loop-center-CLUSTERED positions while the
    course pipeline refines from 1D signal peaks — a position-source
    asymmetry between the two axes' pipelines, so cross-axis agreement
    after rotation isn't guaranteed by construction. Fixing it means
    unifying the position sources, a separate change.
"""
from __future__ import annotations

import cv2
import pytest

from metamorphic import TOLERANCES, InvariantOutcome, _classify, run_metamorphic

JERSEY = "tests/fixtures/real_jersey_sample.jpg"
# Clean fabric region above the ruler (which starts around y=360).
JERSEY_ROI = (30, 30, 660, 310)

KNOWN_VIOLATIONS = {
    ("resize", "course"): "1.5x upscale flips the coarse autocorrelation seed to the 2x family; course has no structural evidence to correct it",
    ("rotate90", "wale"): "wale refines from loop-center-clustered positions, course from 1D signal peaks -- cross-axis agreement after rotation isn't guaranteed by construction (~4.5%)",
}


@pytest.fixture(scope="module")
def jersey_outcomes():
    img = cv2.imread(JERSEY)
    assert img is not None, f"{JERSEY} fixture missing"
    return {(o.invariant, o.axis): o for o in run_metamorphic(img, JERSEY_ROI, "vertical")}


def _params():
    params = []
    for invariant in ("resize", "rotate90", "mirror", "half_roi", "jpeg60"):
        for axis in ("wale", "course"):
            key = (invariant, axis)
            marks = []
            if key in KNOWN_VIOLATIONS:
                marks.append(pytest.mark.xfail(strict=True, reason=KNOWN_VIOLATIONS[key]))
            params.append(pytest.param(invariant, axis, id=f"{invariant}-{axis}", marks=marks))
    return params


@pytest.mark.parametrize("invariant,axis", _params())
def test_jersey_invariant(jersey_outcomes, invariant, axis):
    o: InvariantOutcome = jersey_outcomes[(invariant, axis)]
    assert o.status in ("ok", "skipped"), (
        f"{invariant}/{axis}: {o.status} (expected {o.expected_px}, measured {o.measured_px}, "
        f"ratio {o.ratio}) {o.note}"
    )


def test_jersey_baseline_detects_both_axes(jersey_outcomes):
    """run_metamorphic only emits 'baseline' outcomes when detection
    failed outright — so their absence IS the baseline assertion."""
    assert not any(inv == "baseline" for inv, _ in jersey_outcomes)


# --- classifier unit coverage (no image work) ---------------------------


def test_classifier_boundaries():
    tol = TOLERANCES["resize"]  # 0.04
    assert _classify(None, 30.0, tol)[0] == "lost"
    assert _classify(30.9, 30.0, tol)[0] == "ok"           # +3%
    assert _classify(15.6, 30.0, tol)[0] == "harmonic_flip"  # ratio 0.52
    assert _classify(55.5, 30.0, tol)[0] == "harmonic_flip"  # ratio 1.85
    assert _classify(34.5, 30.0, tol)[0] == "drift"          # +15%, not near 0.5x/2x


def test_half_roi_skips_below_five_periods():
    """A tiny ROI must yield 'skipped' half_roi outcomes (per-axis), not
    fabricated passes — synthetic jersey keeps the run fast."""
    import sys

    sys.path.insert(0, "tests")
    from synthetic_fabric import FabricSpec, render_fabric

    # 640px wide at 36px pitch -> ROI 320 wide -> half 160 -> 4.4 periods < 5.
    spec = FabricSpec(structure="jersey", wales_per_inch=5, courses_per_inch=7)
    img = render_fabric(spec)
    outcomes = run_metamorphic(img, (160, 120, 320, 240), "vertical")
    half = {o.axis: o for o in outcomes if o.invariant == "half_roi"}
    assert half["wale"].status == "skipped"
    assert "periods" in half["wale"].note
