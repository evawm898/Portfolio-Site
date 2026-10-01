"""
The wale leg-lattice climb (_analyze_axis_v3): when the evidence winner's
own 2D template walk fails outright and its double walks, the wale
reading climbs to the double.

The claim worth pinning is the DISTINCTION, not only the fix: the climb
fires on knit_sample_05 (winner 33px walks at 0.0, double 66px at ~0.70)
and must never fire on a winner that walks. teal, knit_06 and knit_08 are
the controls -- each is correct at a "2x" candidate whose half was the leg
lattice, and each winner walks (0.69-0.73), so the gate is false for them
by construction. Every correct wale row on the scorecard is asserted
here, at the same pinned ROIs the scorecard uses.
"""
from __future__ import annotations

import os
import sys

import cv2
import pytest

sys.path.insert(0, os.path.dirname(__file__))
import test_ground_truth_scorecard as sc  # noqa: E402

from analysis.gauge_analysis import (  # noqa: E402
    SEED_ASCEND_TEMPLATE_FAIL_MAX,
    SEED_HALF_TEMPLATE_MIN,
    analyze_gauge,
)

CLIMBED = "Climbed from the evidence winner"


def _wale(name):
    case = next(c for c in sc.CASES if c.name == name)
    img = cv2.imread(os.path.join(sc.FIXTURES_DIR, case.filename))
    assert img is not None
    return analyze_gauge(img, sc._roi_for(case, img), "vertical").wale


def test_knit_05_climbs_off_the_leg_lattice():
    wale = _wale("knit_05")
    assert CLIMBED in wale.selected_reason, wale.selected_reason
    selected = next(d for d in wale.candidate_details if d.selected)
    half = next(d for d in wale.candidate_details if abs(2 * d.period_px - selected.period_px) < 1e-6)
    # The gate, read back off the emitted diagnostics rather than assumed.
    assert half.template_match_score <= SEED_ASCEND_TEMPLATE_FAIL_MAX
    assert selected.template_match_score >= SEED_HALF_TEMPLATE_MIN
    # The half still out-scores it on evidence -- the climb overrides the
    # composite, it does not re-weight it.
    assert half.evidence_score > selected.evidence_score
    assert 60.0 <= wale.spacing_px <= 75.0  # ~68px true stitch pitch
    assert wale.status == "uncertain"


@pytest.mark.parametrize("name", ["jersey", "teal", "knit_01", "knit_06", "knit_08", "knit_09"])
def test_climb_does_not_fire_on_a_winner_that_walks(name):
    wale = _wale(name)
    assert CLIMBED not in wale.selected_reason, wale.selected_reason
    selected = next(d for d in wale.candidate_details if d.selected)
    # The reason it cannot fire: the winner's own walk is positive evidence.
    assert selected.template_match_score > SEED_ASCEND_TEMPLATE_FAIL_MAX
