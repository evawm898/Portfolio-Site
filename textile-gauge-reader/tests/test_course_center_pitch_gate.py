"""
The course axis's loop-center pitch may CORROBORATE a candidate, never pull
the pick to a harmonic it does not itself match (README: "Course loop-center
pitch: corroborate within the family's own tolerance, never override by a
harmonic").

The defect this pins (knit_sample_05 through the app path, after the ROI
proposer finally offered it areas): the course seed was RIGHT on every
window (51 px, truth ~47.8), and `_reconcile_period` then "corrected it
down" to 25.5 px to match a loop-center spacing of 15.0 px -- a pitch that
is 1.70x from the nearest member of the 0.5x/1x/2x family and is the DoG
detector's own minimum-separation floor on an over-dense detection (~1,250
"centers" in a window holding ~125 loops), not a loop pitch. Whether that
15.0 px was trusted at all sat on the consistency gate's 0.5 (0.496-0.512
across the four windows), so a one-pixel move of the window flipped the
reading between the pitch and its half, both "confident".

With `center_log_tolerance` (HARMONIC_MATCH_LOG_TOLERANCE, the same ~1.4x
the v3 scorer's _center_pitch_agreement uses on the wale axis) a pitch that
agrees with no candidate is set aside -- for the period AND for the overlay
positions -- exactly as if none had been offered, and the decision says so.
"""
from __future__ import annotations

import inspect
import os
import sys

import cv2
import numpy as np
import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

from analysis.gauge_analysis import (  # noqa: E402
    HARMONIC_MATCH_LOG_TOLERANCE,
    MIN_PLAUSIBLE_SPACING_PX,
    _analyze_direction,
    _reconcile_period,
    analyze_gauge,
)

TOL = HARMONIC_MATCH_LOG_TOLERANCE


def _periodic_signal(period: float, n: int = 640) -> np.ndarray:
    x = np.arange(n, dtype=np.float64)
    return np.sin(2 * np.pi * x / period) + 0.3 * np.sin(4 * np.pi * x / period + 0.4)


# --- _reconcile_period with the tolerance ----------------------------------


def test_a_pitch_matching_no_candidate_is_set_aside_and_said_so():
    # knit_05's own numbers: seed 51, loop-center pitch 15 (nearest candidate 25.5 is 1.70x away)
    d = _reconcile_period(p0=51.0, p_centers=15.0, min_plausible=MIN_PLAUSIBLE_SPACING_PX, center_log_tolerance=TOL)
    assert d.period == pytest.approx(51.0)
    assert d.corrected is False
    assert d.validated is False
    assert d.center_pitch_used is False
    assert "matched none of the 0.5x/1x/2x candidates" in d.reason
    assert "15.0px" in d.reason and "25.5px" in d.reason
    assert "not used" in d.reason
    assert set(d.candidates) == {25.5, 51.0, 102.0}


def test_without_the_tolerance_the_original_contract_holds():
    # The unit contract test_loop_center_reconciliation pins: nearest on a log scale, whatever the distance.
    d = _reconcile_period(p0=51.0, p_centers=15.0, min_plausible=MIN_PLAUSIBLE_SPACING_PX)
    assert d.period == pytest.approx(25.5)
    assert d.center_pitch_used is True
    assert "corrected down" in d.reason


def test_an_agreeing_pitch_still_corrects_a_doubled_seed():
    d = _reconcile_period(p0=48.0, p_centers=24.0, min_plausible=MIN_PLAUSIBLE_SPACING_PX, center_log_tolerance=TOL)
    assert d.period == pytest.approx(24.0)
    assert d.corrected is True and d.validated is True and d.center_pitch_used is True
    assert "corrected down" in d.reason


def test_an_agreeing_pitch_still_corrects_a_halved_seed():
    d = _reconcile_period(p0=12.0, p_centers=24.0, min_plausible=MIN_PLAUSIBLE_SPACING_PX, center_log_tolerance=TOL)
    assert d.period == pytest.approx(24.0)
    assert d.corrected is True and d.center_pitch_used is True


def test_the_tolerance_is_a_log_ratio_about_the_nearest_candidate():
    # 1.30x from the half candidate (inside ~1.42x): corroborates the half, as before.
    d = _reconcile_period(p0=51.0, p_centers=25.5 / 1.30, min_plausible=MIN_PLAUSIBLE_SPACING_PX, center_log_tolerance=TOL)
    assert d.period == pytest.approx(25.5) and d.center_pitch_used is True
    # 1.50x from it (outside): not evidence about this family.
    d = _reconcile_period(p0=51.0, p_centers=25.5 / 1.50, min_plausible=MIN_PLAUSIBLE_SPACING_PX, center_log_tolerance=TOL)
    assert d.period == pytest.approx(51.0) and d.center_pitch_used is False
    # Symmetric above the family too.
    d = _reconcile_period(p0=20.0, p_centers=61.0, min_plausible=MIN_PLAUSIBLE_SPACING_PX, center_log_tolerance=TOL)
    assert d.period == pytest.approx(20.0) and d.center_pitch_used is False


def test_no_pitch_offered_is_unchanged():
    d = _reconcile_period(p0=18.0, p_centers=None, min_plausible=MIN_PLAUSIBLE_SPACING_PX, center_log_tolerance=TOL)
    assert d.period == pytest.approx(18.0)
    assert d.validated is False and d.center_pitch_used is False
    assert "no independent loop-center evidence" in d.reason


# --- _analyze_direction: one decision about the evidence --------------------


def test_analyze_direction_defaults_to_the_one_tolerance():
    sig = inspect.signature(_analyze_direction)
    assert sig.parameters["center_log_tolerance"].default == HARMONIC_MATCH_LOG_TOLERANCE


def test_a_rejected_pitch_is_withheld_from_the_overlay_positions_too():
    sig = _periodic_signal(51.0)
    # A dense noise lattice at 15 px (what the DoG floor produces), nothing to do with the 51 px rows.
    xs, ys = np.meshgrid(np.arange(20, 620, 15.0), np.arange(20, 620, 15.0))
    centers = np.column_stack([xs.ravel(), ys.ravel()])
    with_pitch = _analyze_direction(sig, p0=51.0, p_centers=15.0, loop_centers=centers, center_axis_index=1)
    without = _analyze_direction(sig, p0=51.0, p_centers=None, loop_centers=centers, center_axis_index=1)
    assert with_pitch.spacing_px == pytest.approx(without.spacing_px)
    assert with_pitch.positions_px == without.positions_px
    assert with_pitch.confidence == pytest.approx(without.confidence)
    assert "1D edge-signal peak detection" in with_pitch.selected_reason
    assert "matched none" in with_pitch.selected_reason
    # And the must-fail: with the tolerance off, the same inputs take the half.
    old = _analyze_direction(sig, p0=51.0, p_centers=15.0, loop_centers=centers, center_axis_index=1,
                             center_log_tolerance=None)
    assert old.spacing_px == pytest.approx(25.5, rel=0.05)
    assert "loop-center clustering" in old.selected_reason


# --- The real photo: knit_sample_05's placement knife edge ----------------------

FIXTURES = os.path.join(HERE, "fixtures")
KNIT_05_PX_PER_INCH = 320.0
KNIT_05_TRUE_CPI = 6.7
# The proposer's window B at 320 px/in and the same window one pixel right and down:
# 25.5 / 50.6 px on the parked tree (HANDOFF §5 of the proposer fix), both confident.
KNIT_05_WINDOW_B = (933, 709, 640, 640)


@pytest.fixture(scope="module")
def knit_05():
    img = cv2.imread(os.path.join(FIXTURES, "knit_sample_05.jpg"))
    assert img is not None
    return img


@pytest.mark.parametrize("roi", [KNIT_05_WINDOW_B, (934, 710, 640, 640), (485, 709, 640, 640), (485, 485, 640, 640)],
                         ids=["B", "B+1px", "A", "C"])
def test_knit_05_course_reads_the_row_pitch_not_its_half(knit_05, roi):
    res = analyze_gauge(knit_05, roi, "vertical")
    true_px = KNIT_05_PX_PER_INCH / KNIT_05_TRUE_CPI
    assert res.course.spacing_px is not None
    err = res.course.spacing_px / true_px - 1.0
    assert abs(err) <= 0.10, f"{roi}: course {res.course.spacing_px:.2f}px against {true_px:.2f} ({err:+.1%})"
    assert res.course.status == "confident"


def test_knit_05_course_does_not_move_under_a_one_pixel_shift(knit_05):
    a = analyze_gauge(knit_05, KNIT_05_WINDOW_B, "vertical").course.spacing_px
    b = analyze_gauge(knit_05, (934, 710, 640, 640), "vertical").course.spacing_px
    assert abs(a / b - 1.0) <= 0.02, f"B {a:.2f}px vs B+1px {b:.2f}px"
