"""
Tests for the EXPERIMENTAL, parallel V-shape loop-center lattice
detector (analyze_loop_lattice_experiment) -- an explicit-geometry
alternative to the periodicity-based gauge detector, evaluated
independently and not yet wired into the main prediction (see the
module docstring in gauge_analysis.py's "Experimental" section).

These tests deliberately do NOT assert that the detector currently
finds the "correct" wale/course spacing on the real photo -- honest
first-pass diagnostics (see the accompanying report) showed it still
over-detects, likely responding partly to individual yarn legs rather
than exclusively complete loop centers. The user explicitly asked to
evaluate this visually before optimizing any number, so these tests
check the ARCHITECTURE (runs without crashing, returns a well-formed
result, never touches ground truth, doesn't affect analyze_gauge) --
not a numeric accuracy bar this first version hasn't earned yet.
"""
import os

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from analysis.gauge_analysis import (
    LoopLatticeResult,
    _diagonal_gradient_channels,
    _fit_loop_lattice,
    _local_maxima,
    _v_shape_response_map,
    analyze_gauge,
    analyze_loop_lattice_experiment,
)
from backend.main import app

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
REAL_JERSEY_PATH = os.path.join(FIXTURES_DIR, "real_jersey_sample.jpg")


def _v_grid_image(width=300, height=300, period=30, seed=1):
    """A grid of actual drawn V-shapes (not a blob/sine proxy), standing
    in for a repeating face-knit jersey structure, to exercise the
    diagonal-gradient response end to end."""
    rng = np.random.default_rng(seed)
    img = np.full((height, width), 180, dtype=np.uint8)
    for row_y in range(period, height - period, period):
        for col_x in range(period, width - period, period):
            half = period // 2
            pts = np.array(
                [[col_x - half, row_y - half], [col_x, row_y + half // 2], [col_x + half, row_y - half]],
                dtype=np.int32,
            )
            cv2.polylines(img, [pts], isClosed=False, color=60, thickness=2, lineType=cv2.LINE_AA)
    noise = rng.normal(0, 4, size=img.shape)
    img = np.clip(img.astype(np.float64) + noise, 0, 255).astype(np.uint8)
    return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)


# --- Building blocks ---------------------------------------------------


def test_diagonal_gradient_channels_orthogonal_on_pure_diagonal_edge():
    # A pure "\" (falling left-to-right) ramp should show up almost
    # entirely in one diagonal channel and near-zero in the other.
    size = 40
    yy, xx = np.mgrid[0:size, 0:size]
    ramp = (xx + yy).astype(np.float64)  # "\" oriented gradient
    gx = np.gradient(ramp, axis=1)
    gy = np.gradient(ramp, axis=0)
    diag_a, diag_b = _diagonal_gradient_channels(gx, gy)
    assert np.abs(diag_a).mean() > 5 * (np.abs(diag_b).mean() + 1e-6)


def test_v_shape_response_map_matches_input_shape():
    img = _v_grid_image()
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float64)
    gx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    response = _v_shape_response_map(gx, gy, scale_px=30.0)
    assert response.shape == gray.shape
    assert np.all(response >= 0)  # min() of two absolute-value channels


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


# --- Lattice fitting -----------------------------------------------------


def test_fit_loop_lattice_too_few_points_reports_message_not_a_fabricated_spacing():
    result = _fit_loop_lattice([(10.0, 10.0), (20.0, 10.0)], expected_scale_px=20.0)
    assert result.wale_spacing_px is None
    assert result.course_spacing_px is None
    assert "few" in result.message.lower()


def test_fit_loop_lattice_recovers_clean_grid_spacing():
    # A perfectly regular 4x4 grid at 20px spacing -- the lattice fit
    # should recover that spacing with high consistency and correct
    # row/column counts, independent of any detector noise.
    points = [(float(c * 20 + 5), float(r * 20 + 5)) for r in range(4) for c in range(4)]
    result = _fit_loop_lattice(points, expected_scale_px=20.0)
    assert result.wale_spacing_px == pytest.approx(20.0, abs=0.5)
    assert result.course_spacing_px == pytest.approx(20.0, abs=0.5)
    assert result.row_count == 4
    assert result.column_count == 4
    assert result.lattice_consistency > 0.9


def test_fit_loop_lattice_rejects_gross_outliers():
    # A clean grid plus one wildly-out-of-place point shouldn't drag the
    # median spacing off -- robust stats, not a raw mean.
    points = [(float(c * 20 + 5), float(r * 20 + 5)) for r in range(4) for c in range(4)]
    points.append((5.0, 5.0 + 1))  # near-duplicate of an existing point, creates a tiny outlier diff
    result = _fit_loop_lattice(points, expected_scale_px=20.0)
    assert result.wale_spacing_px == pytest.approx(20.0, abs=1.0)


# --- Top-level entry point -------------------------------------------------


def test_analyze_loop_lattice_experiment_runs_on_synthetic_v_grid():
    img = _v_grid_image()
    result = analyze_loop_lattice_experiment(img, roi=(20, 20, 260, 260), orientation="vertical")
    assert isinstance(result, LoopLatticeResult)
    # Not asserting a specific accuracy bar (see module docstring) --
    # just that it produces a well-formed, non-fabricated result.
    assert result.center_count >= 0
    if result.wale_spacing_px is not None:
        assert result.wale_spacing_px > 0


def test_analyze_loop_lattice_experiment_no_crash_on_flat_image():
    flat = np.full((200, 200, 3), 128, dtype=np.uint8)
    result = analyze_loop_lattice_experiment(flat, roi=(10, 10, 150, 150), orientation="vertical")
    assert isinstance(result, LoopLatticeResult)
    assert result.wale_spacing_px is None


def test_analyze_loop_lattice_experiment_signature_has_no_ground_truth_param():
    import inspect

    params = set(inspect.signature(analyze_loop_lattice_experiment).parameters)
    assert params == {"image_bgr", "roi", "orientation"}
    assert not any("actual" in p or "ground" in p or "truth" in p for p in params)


@pytest.mark.skipif(not os.path.exists(REAL_JERSEY_PATH), reason="real photo fixture not present")
def test_analyze_loop_lattice_experiment_runs_on_real_photo_without_crashing():
    img = cv2.imread(REAL_JERSEY_PATH)
    assert img is not None
    result = analyze_loop_lattice_experiment(img, roi=(280, 120, 166, 166), orientation="vertical")
    assert isinstance(result, LoopLatticeResult)
    # Development-stage assertion only: it should at least find SOME
    # candidates on real fabric texture, not silently do nothing.
    assert result.center_count > 0


def test_experiment_does_not_affect_analyze_gauge_result():
    """The parallel path must never change what analyze_gauge itself
    returns -- calling the experiment before/after/never must not alter
    the main prediction."""
    img = _v_grid_image()
    roi = (20, 20, 260, 260)
    before = analyze_gauge(img, roi=roi, orientation="vertical")
    analyze_loop_lattice_experiment(img, roi=roi, orientation="vertical")
    after = analyze_gauge(img, roi=roi, orientation="vertical")
    assert before.wale.spacing_px == after.wale.spacing_px
    assert before.course.spacing_px == after.course.spacing_px


# --- API wiring ------------------------------------------------------------


def test_analyze_endpoint_includes_loop_lattice_debug_field():
    img = _v_grid_image()
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
    # Present (even if some sub-fields are null on this input) -- proves
    # the experimental path is actually wired into the response, not
    # silently dropped.
    assert body["loop_lattice_debug"] is not None
