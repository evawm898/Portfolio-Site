"""
The consensus loop-count candidate may CORROBORATE a region's own
periodicity reading, never REPLACE it across a harmonic.

Background (the app-path scorecard, tests/app_path_scorecard.py): on every
clean fabric -- the exact synthetic jersey and garter, the real jersey,
knit_09, teal -- each proposed area's own periodicity read the true wale
period while its loop-lattice COUNT read the stitch-leg half-period, and
the count, being "trustworthy" on its own terms (regular, well supported),
replaced the reading in the cross-region vote. The consensus then reported
twice the true wales per inch, confident. Measured over every fixture at
the exact scale and +-0.5/1/2% jitter, no region ever had a periodicity
reading that was a harmonic of the truth while its count was right.

The gate (`_wale_count_harmonic_note` in analysis.gauge_analysis): a count
that disagrees with the region's own periodicity reading by more than the
consensus's own "agrees" tolerance is not used; the region contributes its
periodicity reading, and the per-region record says why.
"""
from __future__ import annotations

import math

import numpy as np
import pytest

import analysis.gauge_analysis as gauge_analysis
from analysis.gauge_analysis import (
    CONSENSUS_INLIER_LOG_TOLERANCE,
    WALE_COUNT_AGREEMENT_LOG_TOLERANCE,
    AxisResult,
    GaugeAnalysisResult,
    _wale_count_harmonic_note,
    analyze_multi_roi,
)


class FakeLattice:
    """A loop-lattice result that is trustworthy on its own terms (regular, well supported)."""

    def __init__(self, wale_spacing_px, column_count=12):
        self.wale_spacing_px = wale_spacing_px
        self.column_count = column_count
        self.column_support_counts = [6] * column_count
        self.row_count = 6
        self.lattice_consistency = 0.95


def _image(width=300, height=100):
    rng = np.random.default_rng(1)
    return rng.integers(0, 255, size=(height, width, 3), dtype=np.uint8)


def _rois():
    return [
        {"label": "A", "x": 0, "y": 0, "width": 90, "height": 90, "source": "auto"},
        {"label": "B", "x": 100, "y": 0, "width": 90, "height": 90, "source": "auto"},
        {"label": "C", "x": 200, "y": 0, "width": 90, "height": 90, "source": "auto"},
    ]


def _run(monkeypatch, periodicity_by_x: dict, lattice_by_x: dict, **kwargs):
    def fake_analyze_gauge(image_bgr, roi, orientation, structure="unknown"):
        axis = lambda px: AxisResult(spacing_px=px, positions_px=[], confidence=0.5)
        return GaugeAnalysisResult(
            success=True, message="", wale=axis(periodicity_by_x[roi[0]]), course=axis(48.0),
            roi_width_px=roi[2], roi_height_px=roi[3],
        )

    def fake_loop_lattice(image_bgr, roi, orientation, course_rows_px=None):
        return lattice_by_x[roi[0]]

    monkeypatch.setattr(gauge_analysis, "analyze_gauge", fake_analyze_gauge)
    monkeypatch.setattr(gauge_analysis, "analyze_loop_lattice_experiment", fake_loop_lattice)
    return analyze_multi_roi(_image(), _rois(), orientation="vertical", **kwargs)


# --- The gate itself -----------------------------------------------------


def test_tolerance_is_the_consensus_own_agrees_tolerance():
    # "The count agrees with the region's own reading" means the same thing
    # as "two regions agree" does in _consensus_for_axis -- one owner.
    assert WALE_COUNT_AGREEMENT_LOG_TOLERANCE == CONSENSUS_INLIER_LOG_TOLERANCE


@pytest.mark.parametrize("count_px, period_px", [(35.5, 34.5), (36.0, 36.0), (40.0, 36.0), (33.0, 36.0)])
def test_a_count_that_agrees_is_kept(count_px, period_px):
    assert abs(math.log(count_px / period_px)) <= WALE_COUNT_AGREEMENT_LOG_TOLERANCE
    assert _wale_count_harmonic_note(count_px, period_px) is None


def test_the_leg_half_period_is_named_as_such():
    # The app-path finding exactly: a 36px wale read as 18px by the count.
    note = _wale_count_harmonic_note(18.0, 36.0)
    assert note is not None
    assert "0.50x" in note and "stitch-leg half-period" in note


def test_a_doubled_repeat_is_named_as_such():
    note = _wale_count_harmonic_note(80.0, 36.0)
    assert note is not None
    assert "doubled repeat" in note


def test_a_disagreement_with_no_clean_harmonic_is_still_rejected():
    note = _wale_count_harmonic_note(50.0, 36.0)  # 1.39x: neither agrees nor a harmonic
    assert note is not None
    assert "harmonic" not in note.lower() or "consistent with" not in note


def test_no_periodicity_reading_leaves_the_count_alone():
    # Nothing to corroborate against: a count is still a measurement.
    assert _wale_count_harmonic_note(18.0, None) is None
    assert _wale_count_harmonic_note(None, 36.0) is None


def test_the_boundary_is_the_tolerance_in_log_ratio():
    just_inside = 36.0 * math.exp(WALE_COUNT_AGREEMENT_LOG_TOLERANCE - 1e-9)
    just_outside = 36.0 * math.exp(WALE_COUNT_AGREEMENT_LOG_TOLERANCE + 1e-9)
    assert _wale_count_harmonic_note(just_inside, 36.0) is None
    assert _wale_count_harmonic_note(just_outside, 36.0) is not None


# --- Through analyze_multi_roi -------------------------------------------


def test_leg_lattice_count_no_longer_overrides_every_region(monkeypatch):
    # The scorecard's failure in miniature: three regions whose own
    # periodicity reads 36px (the true wale period) and whose trustworthy-
    # looking counts all read 18px (the leg lattice). Before the gate the
    # consensus was 18px, "confident"; now every region contributes 36px.
    result = _run(
        monkeypatch,
        periodicity_by_x={0: 36.0, 100: 35.5, 200: 36.5},
        lattice_by_x={0: FakeLattice(18.0), 100: FakeLattice(18.0), 200: FakeLattice(17.5)},
    )
    by_label = {m.label: m for m in result.per_roi}
    for label in "ABC":
        m = by_label[label]
        assert m.wale_source == "periodicity"
        assert m.wale_count_confidence == 0.0
        assert m.wale_count_note is not None and "stitch-leg half-period" in m.wale_count_note
        # The region's own periodicity reading is never rewritten.
        assert m.wale.spacing_px in (36.0, 35.5, 36.5)
    assert 35.0 <= result.wale_consensus.spacing_px <= 37.0
    assert result.wale_consensus.included_labels == ["A", "B", "C"]


def test_an_agreeing_count_still_corroborates_and_refines(monkeypatch):
    # The mechanism's documented purpose is intact: a count that agrees
    # with the region's own reading is preferred, and the record says so.
    result = _run(
        monkeypatch,
        periodicity_by_x={0: 82.5, 100: 72.75, 200: 78.0},
        lattice_by_x={0: FakeLattice(79.0), 100: FakeLattice(77.5), 200: FakeLattice(75.0)},
    )
    by_label = {m.label: m for m in result.per_roi}
    for label in "ABC":
        assert by_label[label].wale_source == "loop_count"
        assert by_label[label].wale_count_confidence > 0
        assert by_label[label].wale_count_note is None
    assert result.wale_consensus.spacing_px in (75.0, 77.5, 79.0)


def test_the_gate_is_per_region(monkeypatch):
    # One region's count is the leg lattice, the other two agree with
    # their own readings: only the first falls back.
    result = _run(
        monkeypatch,
        periodicity_by_x={0: 36.0, 100: 36.0, 200: 36.0},
        lattice_by_x={0: FakeLattice(18.0), 100: FakeLattice(35.0), 200: FakeLattice(37.0)},
    )
    by_label = {m.label: m for m in result.per_roi}
    assert by_label["A"].wale_source == "periodicity" and by_label["A"].wale_count_note
    assert by_label["B"].wale_source == "loop_count" and by_label["B"].wale_count_note is None
    assert by_label["C"].wale_source == "loop_count" and by_label["C"].wale_count_note is None
    assert 35.0 <= result.wale_consensus.spacing_px <= 37.0


def test_a_rejected_count_never_reaches_the_density_gate(monkeypatch):
    # The absolute-density plausibility gate reads the COUNT only when the
    # count is the region's candidate; a rejected count must not get a
    # region excluded for a density it never contributed.
    # At pixels_per_mm=4.0 (101.6 px/in): a 2px count is 50.8 wales/in
    # (absurd), its region's own 36px reading is 2.8/in (ordinary).
    result = _run(
        monkeypatch,
        periodicity_by_x={0: 36.0, 100: 36.0, 200: 36.0},
        lattice_by_x={0: FakeLattice(2.0, column_count=21), 100: FakeLattice(36.0), 200: FakeLattice(36.0)},
        pixels_per_mm=4.0,
    )
    by_label = {m.label: m for m in result.per_roi}
    assert by_label["A"].wale_source == "periodicity"
    assert "A" in result.wale_consensus.included_labels
    assert "physically plausible" not in (by_label["A"].wale.uncertain_reason or "")


def test_the_note_rides_through_the_api(monkeypatch):
    from fastapi.testclient import TestClient
    import cv2
    from backend.main import app

    from analysis.gauge_analysis import LoopLatticeResult

    def real_lattice(px):
        # The API serialises the whole lattice record, so the fakes here are
        # real LoopLatticeResults rather than FakeLattice stand-ins.
        return LoopLatticeResult(wale_spacing_px=px, column_count=12, column_support_counts=[6] * 12,
                                 row_count=6, lattice_consistency=0.95)

    _run(monkeypatch, periodicity_by_x={0: 36.0, 100: 36.0, 200: 36.0},
         lattice_by_x={0: real_lattice(18.0), 100: real_lattice(36.0), 200: real_lattice(36.0)})
    ok, buf = cv2.imencode(".png", _image())
    assert ok
    import json
    data = {"rois_json": json.dumps(_rois()), "cal_x1": 0, "cal_y1": 0, "cal_x2": 100, "cal_y2": 0,
            "known_distance": 1, "unit": "in", "orientation": "vertical", "structure": "unknown"}
    res = TestClient(app).post("/analyze-multi", files={"file": ("x.png", buf.tobytes(), "image/png")}, data=data)
    assert res.status_code == 200, res.text
    per_roi = res.json()["multi_roi"]["per_roi"]
    by_label = {m["label"]: m for m in per_roi}
    assert by_label["A"]["wale_source"] == "periodicity"
    assert "stitch-leg half-period" in by_label["A"]["wale_count_note"]
    assert by_label["B"]["wale_source"] == "loop_count"
    assert by_label["B"]["wale_count_note"] is None
