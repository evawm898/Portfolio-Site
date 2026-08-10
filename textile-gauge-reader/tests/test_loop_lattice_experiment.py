"""
Tests for the EXPERIMENTAL, parallel V-shape loop-center lattice
detector (analyze_loop_lattice_experiment) -- an explicit-geometry
alternative to the periodicity-based gauge detector, evaluated
independently and not wired into the main prediction (see the module
docstring in gauge_analysis.py's "Experimental" section).

Second-pass architecture: V-shape search is now constrained to narrow
bands around EXISTING course rows (a structural prior, never modified --
see PART 1/14 of the request this implements), and wale columns are
built from X-position CONSENSUS across those rows, requiring support
from multiple rows before a column is accepted (PART 6). This is a
different, more structured approach than the first pass's whole-ROI
search, and these tests check that specific architecture: the row-band
constraint, multi-row-support requirement, N-columns-vs-N-1-intervals
spacing math, and non-interference with analyze_gauge/ground truth.

These tests do NOT assert a specific WPI accuracy bar on the real photo
-- see the accompanying report for honest, as-is real-photo diagnostics
(including a still-open "possibly skipping a column" finding). The
point of these tests is the architecture, not a numeric target this
still-experimental detector hasn't earned.
"""
import os

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from analysis.gauge_analysis import (
    LoopLatticeResult,
    MIN_ROW_SUPPORT_FOR_COLUMN,
    _build_row_banded_lattice,
    _diagonal_gradient_channels,
    _local_maxima,
    _v_shape_response_map,
    analyze_gauge,
    analyze_loop_lattice_experiment,
)
from backend.main import app

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
REAL_JERSEY_PATH = os.path.join(FIXTURES_DIR, "real_jersey_sample.jpg")


def _v_grid_image(width=300, height=300, period=30, seed=1, rows=None):
    """A grid of actual drawn V-shapes (not a blob/sine proxy), standing
    in for a repeating face-knit jersey structure, with known row Y
    positions returned alongside so tests can pass them as the
    structural prior (mirroring how main.py passes the real course
    detector's own positions)."""
    rng = np.random.default_rng(seed)
    img = np.full((height, width), 180, dtype=np.uint8)
    row_ys = rows if rows is not None else list(range(period, height - period, period))
    for row_y in row_ys:
        for col_x in range(period, width - period, period):
            half = period // 2
            pts = np.array(
                [[col_x - half, row_y - half], [col_x, row_y + half // 2], [col_x + half, row_y - half]],
                dtype=np.int32,
            )
            cv2.polylines(img, [pts], isClosed=False, color=60, thickness=2, lineType=cv2.LINE_AA)
    noise = rng.normal(0, 4, size=img.shape)
    img = np.clip(img.astype(np.float64) + noise, 0, 255).astype(np.uint8)
    return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR), [float(v) for v in row_ys]


# --- Building blocks (unchanged mechanics) ----------------------------------


def test_diagonal_gradient_channels_orthogonal_on_pure_diagonal_edge():
    size = 40
    yy, xx = np.mgrid[0:size, 0:size]
    ramp = (xx + yy).astype(np.float64)
    gx = np.gradient(ramp, axis=1)
    gy = np.gradient(ramp, axis=0)
    diag_a, diag_b = _diagonal_gradient_channels(gx, gy)
    assert np.abs(diag_a).mean() > 5 * (np.abs(diag_b).mean() + 1e-6)


def test_v_shape_response_map_matches_input_shape():
    img, _ = _v_grid_image()
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float64)
    gx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    response = _v_shape_response_map(gx, gy, scale_px=30.0)
    assert response.shape == gray.shape
    assert np.all(response >= 0)


def test_local_maxima_empty_on_flat_response():
    flat = np.zeros((50, 50))
    assert _local_maxima(flat, min_separation_px=5, percentile=70) == []


def test_local_maxima_finds_isolated_peaks():
    response = np.zeros((60, 60))
    response[10, 10] = 5.0
    response[40, 45] = 5.0
    points = _local_maxima(response, min_separation_px=5, percentile=10)
    coords = {(int(round(y)), int(round(x))) for x, y in points}
    assert (10, 10) in coords
    assert (40, 45) in coords


# --- Row-banded lattice building --------------------------------------------


def test_row_banded_lattice_requires_multi_row_support_for_a_column():
    """A column with evidence from only 1 row must be rejected (PART 6);
    one with evidence from every row must be accepted. Built directly
    from a synthetic response map so the assertion is about the
    clustering/support logic itself, not detector sensitivity."""
    h, w = 120, 120
    response = np.zeros((h, w))
    rows_local = [20.0, 50.0, 80.0, 110.0]
    # A "real" column with a peak near x=60 in every row.
    for ry in rows_local:
        response[int(ry), 60] = 5.0
    # An isolated, single-row-only peak near x=100 -- should NOT become a column.
    response[int(rows_local[0]), 100] = 5.0

    gx = np.zeros((h, w))  # unused by _build_row_banded_lattice directly here;
    gy = np.zeros((h, w))  # response is injected via monkeypatching below instead.

    import analysis.gauge_analysis as ga

    original = ga._v_shape_response_map
    ga._v_shape_response_map = lambda gx_, gy_, scale: response
    try:
        result = _build_row_banded_lattice(gx, gy, rows_local, scale_px=20.0, image_shape=(h, w))
    finally:
        ga._v_shape_response_map = original

    assert 60.0 in [round(c) for c in result.wale_columns_px]
    assert 100.0 not in [round(c) for c in result.wale_columns_px]
    assert result.row_count == 4


def test_row_banded_lattice_column_count_vs_interval_math():
    """5 accepted columns -> exactly 4 center-to-center intervals feed
    the median spacing, never span/5 or span/count (PART 13)."""
    h, w = 60, 260
    response = np.zeros((h, w))
    rows_local = [10.0, 30.0, 50.0]
    xs = [20.0, 60.0, 100.0, 140.0, 180.0]  # 5 columns, spacing exactly 40px
    for ry in rows_local:
        for x in xs:
            response[int(ry), int(x)] = 5.0

    import analysis.gauge_analysis as ga

    original = ga._v_shape_response_map
    ga._v_shape_response_map = lambda gx_, gy_, scale: response
    try:
        result = _build_row_banded_lattice(np.zeros((h, w)), np.zeros((h, w)), rows_local, scale_px=40.0, image_shape=(h, w))
    finally:
        ga._v_shape_response_map = original

    assert result.column_count == 5
    assert result.wale_spacing_px == pytest.approx(40.0, abs=2.0)


def test_row_banded_lattice_marks_inferred_positions_for_missing_rows():
    h, w = 100, 100
    response = np.zeros((h, w))
    rows_local = [10.0, 40.0, 70.0]
    # Column at x=50 present in rows 0 and 2, missing from row 1.
    response[10, 50] = 5.0
    response[70, 50] = 5.0
    response[10, 20] = 5.0
    response[40, 20] = 5.0
    response[70, 20] = 5.0

    import analysis.gauge_analysis as ga

    original = ga._v_shape_response_map
    ga._v_shape_response_map = lambda gx_, gy_, scale: response
    try:
        result = _build_row_banded_lattice(np.zeros((h, w)), np.zeros((h, w)), rows_local, scale_px=20.0, image_shape=(h, w))
    finally:
        ga._v_shape_response_map = original

    inferred_at_50 = [p for p in result.inferred_centers_px if round(p[0]) == 50]
    assert len(inferred_at_50) == 1
    assert inferred_at_50[0][1] == pytest.approx(40.0)


# --- Top-level entry point -------------------------------------------------


def test_analyze_loop_lattice_experiment_runs_on_synthetic_v_grid_with_row_prior():
    rows = [30, 60, 90, 120, 150]
    img, row_ys = _v_grid_image(rows=rows)
    result = analyze_loop_lattice_experiment(
        img, roi=(20, 20, 260, 180), orientation="vertical", course_rows_px=row_ys
    )
    assert isinstance(result, LoopLatticeResult)
    assert result.direct_center_count >= 0
    if result.wale_spacing_px is not None:
        assert result.wale_spacing_px > 0


def test_analyze_loop_lattice_experiment_no_crash_on_flat_image():
    flat = np.full((200, 200, 3), 128, dtype=np.uint8)
    result = analyze_loop_lattice_experiment(flat, roi=(10, 10, 150, 150), orientation="vertical")
    assert isinstance(result, LoopLatticeResult)
    assert result.wale_spacing_px is None


def test_analyze_loop_lattice_experiment_falls_back_without_course_rows():
    """Standalone callers that don't pass course_rows_px still get a
    (possibly less reliable) result via the coarse fallback, not a crash."""
    img, _ = _v_grid_image()
    result = analyze_loop_lattice_experiment(img, roi=(20, 20, 260, 260), orientation="vertical")
    assert isinstance(result, LoopLatticeResult)


def test_analyze_loop_lattice_experiment_signature_has_no_ground_truth_param():
    import inspect

    params = set(inspect.signature(analyze_loop_lattice_experiment).parameters)
    assert params == {"image_bgr", "roi", "orientation", "course_rows_px"}
    assert not any("actual" in p or "ground" in p or "truth" in p for p in params)


@pytest.mark.skipif(not os.path.exists(REAL_JERSEY_PATH), reason="real photo fixture not present")
def test_analyze_loop_lattice_experiment_uses_real_course_detector_as_prior():
    """The realistic usage pattern: pass the EXISTING, unmodified course
    detector's own positions in (as main.py does), and confirm the
    experiment runs against real fabric texture without crashing and
    without altering analyze_gauge's own course result."""
    img = cv2.imread(REAL_JERSEY_PATH)
    assert img is not None
    roi = (280, 120, 166, 166)
    gauge = analyze_gauge(img, roi=roi, orientation="vertical", structure="jersey")
    course_positions_before = list(gauge.course.positions_px)

    result = analyze_loop_lattice_experiment(
        img, roi=roi, orientation="vertical", course_rows_px=gauge.course.positions_px
    )
    assert isinstance(result, LoopLatticeResult)
    assert result.row_count == len(course_positions_before)

    gauge_after = analyze_gauge(img, roi=roi, orientation="vertical", structure="jersey")
    assert gauge_after.course.positions_px == course_positions_before
    assert gauge_after.wale.spacing_px == gauge.wale.spacing_px


def test_experiment_does_not_affect_analyze_gauge_result():
    img, row_ys = _v_grid_image()
    roi = (20, 20, 260, 260)
    before = analyze_gauge(img, roi=roi, orientation="vertical")
    analyze_loop_lattice_experiment(img, roi=roi, orientation="vertical", course_rows_px=row_ys)
    after = analyze_gauge(img, roi=roi, orientation="vertical")
    assert before.wale.spacing_px == after.wale.spacing_px
    assert before.course.spacing_px == after.course.spacing_px


def test_min_row_support_constant_is_at_least_two():
    # Sanity-check the constant itself matches the "no isolated single
    # detection creates a wale" requirement (PART 6).
    assert MIN_ROW_SUPPORT_FOR_COLUMN >= 2


# --- API wiring --------------------------------------------------------------


def test_analyze_endpoint_includes_loop_lattice_debug_field():
    img, _ = _v_grid_image()
    ok, buf = cv2.imencode(".jpg", img)
    assert ok
    client = TestClient(app)
    resp = client.post(
        "/analyze",
        files={"file": ("v_grid.jpg", buf.tobytes(), "image/jpeg")},
        data={
            "roi_x": 20, "roi_y": 20, "roi_width": 260, "roi_height": 260,
            "cal_x1": 0, "cal_y1": 0, "cal_x2": 300, "cal_y2": 0,
            "known_distance": 10, "unit": "cm",
            "orientation": "vertical", "structure": "unknown",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert "loop_lattice_debug" in body
    assert body["loop_lattice_debug"] is not None
    assert "wale_columns_px" in body["loop_lattice_debug"]
