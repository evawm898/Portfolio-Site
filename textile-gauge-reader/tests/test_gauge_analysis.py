"""
Unit tests for the pure computer-vision analysis module.

These generate a synthetic striped "textile" image with a known pixel
period so the pipeline's spacing estimate can be checked against ground
truth, plus a few edge/failure cases.
"""
import numpy as np
import pytest

from analysis.gauge_analysis import analyze_gauge


def make_synthetic_knit(width=400, height=400, wale_period=12, course_period=16, noise=6):
    """A grid of soft blobs at fixed period, mimicking stitch texture."""
    rng = np.random.default_rng(42)
    img = np.full((height, width), 200, dtype=np.float32)

    yy, xx = np.mgrid[0:height, 0:width]
    # Wale bumps: vertical ridges every `wale_period` px.
    wale_pattern = 30 * np.sin(2 * np.pi * xx / wale_period)
    # Course bumps: horizontal ridges every `course_period` px.
    course_pattern = 30 * np.sin(2 * np.pi * yy / course_period)

    img += wale_pattern + course_pattern
    img += rng.normal(0, noise, size=img.shape)
    img = np.clip(img, 0, 255).astype(np.uint8)
    bgr = np.repeat(img[:, :, None], 3, axis=2)
    return bgr


def test_detects_approximate_periodicity_vertical_orientation():
    image = make_synthetic_knit(wale_period=12, course_period=18)
    result = analyze_gauge(image, roi=(20, 20, 360, 360), orientation="vertical")

    assert result.success
    assert result.wale.spacing_px is not None
    assert result.course.spacing_px is not None
    # Allow generous tolerance since this is a heuristic pipeline on synthetic data.
    assert abs(result.wale.spacing_px - 12) < 4
    assert abs(result.course.spacing_px - 18) < 4
    assert result.wale.confidence > 0
    assert result.course.confidence > 0
    assert len(result.wale.positions_px) > 0
    assert len(result.course.positions_px) > 0


def test_orientation_swaps_which_axis_is_which():
    image = make_synthetic_knit(wale_period=10, course_period=20)
    vertical = analyze_gauge(image, roi=(10, 10, 380, 380), orientation="vertical")
    horizontal = analyze_gauge(image, roi=(10, 10, 380, 380), orientation="horizontal")

    # Swapping orientation should swap which measured spacing is "wale" vs "course".
    assert abs(vertical.wale.spacing_px - horizontal.course.spacing_px) < 2
    assert abs(vertical.course.spacing_px - horizontal.wale.spacing_px) < 2


def test_roi_too_small_fails_cleanly():
    image = make_synthetic_knit()
    result = analyze_gauge(image, roi=(0, 0, 10, 10), orientation="vertical")
    assert result.success is False
    assert result.wale.spacing_px is None
    assert result.course.spacing_px is None


def test_flat_uniform_image_does_not_fabricate_a_result():
    flat = np.full((300, 300, 3), 128, dtype=np.uint8)
    result = analyze_gauge(flat, roi=(0, 0, 300, 300), orientation="vertical")
    assert result.success is True  # request itself is valid
    assert result.wale.spacing_px is None
    assert result.course.spacing_px is None
    assert result.wale.confidence == 0.0
    assert result.course.confidence == 0.0


def test_empty_image_fails():
    result = analyze_gauge(np.zeros((0, 0, 3), dtype=np.uint8), roi=(0, 0, 10, 10), orientation="vertical")
    assert result.success is False
