"""
Analysis at one working resolution (README: "Analysis at one working
resolution"): an area finer than WORKING_PX_PER_INCH is analysed on an
INTER_AREA copy at that scale and every pixel result is mapped back to native
pixels; a coarser area is analysed on its own pixels, never upsampled.

These pin the MECHANISM (the one owner, the map-back, the never-upscale
branch); what it does to the readings is the app-path scorecard's.
"""
from __future__ import annotations

import os
import sys

import cv2
import numpy as np
import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, ".."))

from analysis import gauge_analysis as ga  # noqa: E402
from synthetic_fabric import clean, expected_periods, render_fabric  # noqa: E402

MM_PER_INCH = 25.4


def _synth(scale: float):
    """The clean synthetic jersey at 180 px/in, upscaled by `scale` (INTER_CUBIC)."""
    spec = clean("jersey", 5.0, 7.0, width_px=960, height_px=720)
    img = render_fabric(spec)
    if scale != 1.0:
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    return img, spec.px_per_inch * scale, expected_periods(spec)


def test_the_working_scale_has_one_owner():
    assert ga.ROI_PROPOSAL_WORKING_PX_PER_INCH == ga.WORKING_PX_PER_INCH == 180.0


@pytest.mark.parametrize("ppi", [100.0, 166.25, 180.0])
def test_a_photo_at_or_under_the_working_scale_is_analysed_on_its_own_pixels(ppi):
    assert ga._working_scale_factor(ppi / MM_PER_INCH) is None
    img, _, _ = _synth(1.0)
    roi = (100, 100, 500, 400)
    a = ga.analyze_gauge(img, roi, "vertical")
    b = ga.analyze_gauge(img, roi, "vertical", pixels_per_mm=ppi / MM_PER_INCH)
    assert b.analysis_px_per_inch is None and b.analysis_scale == 1.0
    assert (a.wale.spacing_px, a.course.spacing_px) == (b.wale.spacing_px, b.course.spacing_px)
    assert a.wale.positions_px == b.wale.positions_px
    assert a.loop_centers_px == b.loop_centers_px


def test_no_calibration_means_the_old_path_exactly():
    img, _, _ = _synth(3.0)
    roi = (300, 300, 1500, 1200)
    a = ga.analyze_gauge(img, roi, "vertical")
    b = ga._analyze_gauge_at_scale(img, roi, "vertical")
    assert a.wale.spacing_px == b.wale.spacing_px and a.course.spacing_px == b.course.spacing_px
    assert a.analysis_px_per_inch is None


def test_a_finer_photo_is_analysed_at_the_working_scale_and_mapped_back():
    img, ppi, periods = _synth(3.0)   # 540 px/in
    (wale_p, _), (course_p, _) = periods["wale"], periods["course"]
    x, y, w, h = 300, 300, 1500, 1200
    res = ga.analyze_gauge(img, (x, y, w, h), "vertical", pixels_per_mm=ppi / MM_PER_INCH)
    assert res.success
    assert res.analysis_px_per_inch == ga.WORKING_PX_PER_INCH
    assert abs(res.analysis_scale - 180.0 / 540.0) < 1e-3
    # periods come back in NATIVE pixels (3x the 180 px/in pitch)
    assert abs(res.wale.spacing_px / (wale_p * 3.0) - 1.0) < 0.04, res.wale.spacing_px
    assert abs(res.course.spacing_px / (course_p * 3.0) - 1.0) < 0.04, res.course.spacing_px
    # positions, candidates and loop centers are native too: inside the native ROI,
    # spanning it, spaced at the native period
    assert res.roi_width_px == w and res.roi_height_px == h
    assert all(x <= p <= x + w for p in res.wale.positions_px)
    assert all(y <= p <= y + h for p in res.course.positions_px)
    assert max(res.wale.positions_px) - min(res.wale.positions_px) > 0.6 * w
    steps = np.diff(sorted(res.wale.positions_px))
    assert abs(np.median(steps) / (wale_p * 3.0) - 1.0) < 0.06
    assert all(x <= cx <= x + w and y <= cy <= y + h for cx, cy in res.loop_centers_px)
    assert all(abs(d.period_px - c) < 1e-9 for d, c in zip(res.wale.candidate_details, res.wale.candidates_px))
    assert "analysed at 180 px/in" in res.wale.selected_reason


def test_the_working_copy_is_never_coarser_than_the_working_scale():
    img, ppi, _ = _synth(2.5)
    out = ga._working_area(img, (0, 0, 900, 600), ppi / MM_PER_INCH)
    assert out is not None
    small, native_roi, fx, fy = out
    assert native_roi == (0, 0, 900, 600)
    assert small.shape[1] == round(900 * 180.0 / ppi) and small.shape[0] == round(600 * 180.0 / ppi)
    assert abs(fx - small.shape[1] / 900.0) < 1e-12 and abs(fy - small.shape[0] / 600.0) < 1e-12


def test_the_reading_per_inch_agrees_across_resolutions_once_normalised():
    """The same synthetic at 1x (180 px/in, own pixels) and 3x (540 px/in, the working copy)
    reads the same gauge, which is the invariance the working scale buys."""
    img1, ppi1, _ = _synth(1.0)
    img3, ppi3, _ = _synth(3.0)
    r1 = ga.analyze_gauge(img1, (100, 100, 500, 400), "vertical", pixels_per_mm=ppi1 / MM_PER_INCH)
    r3 = ga.analyze_gauge(img3, (300, 300, 1500, 1200), "vertical", pixels_per_mm=ppi3 / MM_PER_INCH)
    for axis in ("wale", "course"):
        per_inch_1 = ppi1 / getattr(r1, axis).spacing_px
        per_inch_3 = ppi3 / getattr(r3, axis).spacing_px
        assert abs(per_inch_3 / per_inch_1 - 1.0) < 0.05, (axis, per_inch_1, per_inch_3)


def test_the_loop_lattice_takes_native_rows_and_returns_native_positions():
    img, ppi, periods = _synth(3.0)
    ppm = ppi / MM_PER_INCH
    x, y, w, h = 300, 300, 1500, 1200
    gauge = ga.analyze_gauge(img, (x, y, w, h), "vertical", pixels_per_mm=ppm)
    lat = ga.analyze_loop_lattice_experiment(img, (x, y, w, h), "vertical",
                                             course_rows_px=gauge.course.positions_px or None, pixels_per_mm=ppm)
    assert lat.analysis_px_per_inch == ga.WORKING_PX_PER_INCH
    assert lat.row_count == len(gauge.course.positions_px)
    assert lat.wale_columns_px, lat.message
    assert all(x <= c <= x + w for c in lat.wale_columns_px)
    assert all(x <= cx <= x + w and y <= cy <= y + h for cx, cy in lat.direct_centers_px)
    if lat.wale_spacing_px:
        (wale_p, _), _ = periods["wale"], None
        assert 0.4 < lat.wale_spacing_px / (wale_p * 3.0) < 2.5
    if lat.course_spacing_px:
        assert abs(lat.course_spacing_px / gauge.course.spacing_px - 1.0) < 0.1


def test_the_multi_roi_path_carries_the_scale_through():
    img, ppi, _ = _synth(3.0)
    res = ga.analyze_multi_roi(
        img, [{"label": "A", "x": 300, "y": 300, "width": 1500, "height": 1200, "source": "auto"},
              {"label": "B", "x": 1200, "y": 500, "width": 1500, "height": 1200, "source": "auto"}],
        "vertical", pixels_per_mm=ppi / MM_PER_INCH,
    )
    assert res.success
    assert all(m.analysis_px_per_inch == ga.WORKING_PX_PER_INCH for m in res.per_roi)
    assert all(300 <= p for m in res.per_roi for p in m.wale.positions_px)
    assert abs(ppi / res.wale.spacing_px - 5.0) < 0.3
