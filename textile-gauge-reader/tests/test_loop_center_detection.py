"""
End-to-end tests for the loop-center detection pathway: a synthetic
image whose dominant feature is a grid of compact bright blobs (standing
in for loop-head highlights) at a known, unambiguous period. Unlike the
pure-sinusoid images in test_gauge_analysis.py (which are a fine
regression check for the original edge/autocorrelation pipeline but have
no real "loop" structure), this exercises the loop-center detector and
the full analyze_gauge() -> loop-center-clustering path together, and
confirms the diagnostic fields (candidates, reason, loop_centers_px) are
populated sensibly.
"""
import cv2
import numpy as np
import pytest

from analysis.gauge_analysis import _detect_loop_centers, _enhance_texture, analyze_gauge


def make_blob_grid(width=400, height=400, wale_period=24, course_period=32, blob_amp=45, seed=1):
    """A grid of compact bright Gaussian blobs at a known period, standing in for loop heads."""
    rng = np.random.default_rng(seed)
    img = np.full((height, width), 180, dtype=np.float32)
    yy, xx = np.mgrid[0:height, 0:width]
    for row_c in np.arange(course_period / 2, height, course_period):
        for col_c in np.arange(wale_period / 2, width, wale_period):
            d2 = (xx - col_c) ** 2 + (yy - row_c) ** 2
            sigma = min(wale_period, course_period) * 0.16
            img += blob_amp * np.exp(-d2 / (2 * sigma**2))
    img += rng.normal(0, 3, size=img.shape)
    img = np.clip(img, 0, 255).astype(np.uint8)
    return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)


def test_loop_center_detector_finds_roughly_the_right_number_of_blobs():
    wale_period, course_period = 24, 32
    img = make_blob_grid(wale_period=wale_period, course_period=course_period)
    crop = img[20:380, 20:380]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    normalized, _, _ = _enhance_texture(gray)

    centers = _detect_loop_centers(normalized, min_separation_px=max(3.0, 0.3 * min(wale_period, course_period)))
    expected = (360 // wale_period) * (360 // course_period)
    # Generous tolerance: this is a heuristic detector, not exact segmentation.
    assert expected * 0.7 <= len(centers) <= expected * 1.5


def test_full_pipeline_confirms_period_via_loop_centers_on_clean_blob_grid():
    wale_period, course_period = 24, 32
    img = make_blob_grid(wale_period=wale_period, course_period=course_period)
    result = analyze_gauge(img, roi=(20, 20, 360, 360), orientation="vertical")

    assert result.success
    assert result.wale.spacing_px == pytest.approx(wale_period, abs=3)
    assert result.course.spacing_px == pytest.approx(course_period, abs=3)

    # Diagnostics: candidates offered, and the reason should reflect that
    # loop-center evidence was actually consulted (not just autocorrelation
    # trusted blindly) — this is the structural fix, not a relabeling.
    assert len(result.wale.candidates_px) >= 1
    assert len(result.course.candidates_px) >= 1
    assert "loop-center" in result.wale.selected_reason
    assert "loop-center" in result.course.selected_reason

    # The diagnostic loop-center overlay data should be populated and in
    # full-image coordinates (offset by the ROI origin).
    assert len(result.loop_centers_px) > 20
    xs = [c[0] for c in result.loop_centers_px]
    ys = [c[1] for c in result.loop_centers_px]
    assert min(xs) >= 20 - 1  # roughly within the ROI, allowing detector edge slop
    assert min(ys) >= 20 - 1


def test_loop_centers_positions_correspond_to_complete_repeats_not_half_repeats():
    """
    Success criterion from the bug report: overlay marker spacing must
    match the true full-loop repeat, not half of it. Verify the gap
    between consecutive detected wale/course positions clusters near the
    true period rather than near half of it.
    """
    wale_period, course_period = 24, 32
    img = make_blob_grid(wale_period=wale_period, course_period=course_period)
    result = analyze_gauge(img, roi=(20, 20, 360, 360), orientation="vertical")

    wale_gaps = np.diff(sorted(result.wale.positions_px))
    course_gaps = np.diff(sorted(result.course.positions_px))

    # Most gaps should be near the true period, not near half of it.
    assert np.median(wale_gaps) == pytest.approx(wale_period, abs=4)
    assert np.median(course_gaps) == pytest.approx(course_period, abs=4)


def test_loop_center_detection_on_flat_image_returns_empty():
    flat = np.full((300, 300), 128, dtype=np.uint8)
    centers = _detect_loop_centers(flat, min_separation_px=10.0)
    assert len(centers) == 0
