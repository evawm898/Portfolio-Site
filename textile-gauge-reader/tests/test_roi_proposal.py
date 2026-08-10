"""
Tests for Stage 1/4 of the multi-region workflow: automatic measurement-
area proposal (analysis.gauge_analysis.propose_measurement_rois).

No committed tests existed for this function before Stage 4 -- earlier
verification was manual/inline against the real jersey photo fixture.
These lock in the current design: propose a FEW (2-4) large regions,
each as large as possible while still "regular" (see _roi_quality_score,
especially _periodicity_consistency_score, which replaced an earlier
gradient-orientation-based signal that false-positived on genuinely flat
knit fabric -- see that function's docstring for why). A single largest
region was tried and rejected -- a window-size sweep on the real jersey
photo showed no monotonic size-to-accuracy trend, including a
confidently-wrong case -- so multi-region cross-checking (analyze_multi_
roi's consensus) is kept as a safety net; see README.md's "Stage 4"
section for the full story.
"""
import numpy as np
import pytest

from analysis.gauge_analysis import (
    MIN_ROI_DIM_PX,
    ROI_PROPOSAL_MIN_QUALITY,
    _periodicity_consistency_score,
    _roi_quality_score,
    propose_measurement_rois,
)


def make_knit_image(height=600, width=600, wale_period=14, course_period=18, noise=6, seed=7):
    """A large, uniform synthetic knit texture -- same construction style as other test files."""
    rng = np.random.default_rng(seed)
    img = np.full((height, width), 190, dtype=np.float32)
    yy, xx = np.mgrid[0:height, 0:width]
    img += 45 * np.sin(2 * np.pi * xx / wale_period)
    img += 45 * np.sin(2 * np.pi * yy / course_period)
    img += rng.normal(0, noise, size=img.shape)
    img = np.clip(img, 0, 255).astype(np.uint8)
    return np.repeat(img[:, :, None], 3, axis=2)


def make_knit_with_background_border(height=600, width=600, border=80, **knit_kwargs):
    """
    A knit swatch on a plain, flat background -- mimicking a photo of a
    small swatch (like a pinned sample) rather than a full-frame fabric
    photo. The border is deliberately flat/low-variance, unlike the knit
    interior, so a good proposal must stay inset from it.
    """
    img = make_knit_image(height=height, width=width, **knit_kwargs)
    img[:border, :] = 235
    img[-border:, :] = 235
    img[:, :border] = 235
    img[:, -border:] = 235
    return img


def make_knit_with_distorted_edge(height=600, width=600, distort_height=100, **knit_kwargs):
    """
    A knit texture that's uniform everywhere EXCEPT a band along the top
    edge, where the stitch period locally compresses -- mimicking a
    curled/rolled fabric edge. The distorted band still has real
    periodicity and decent contrast (it's still knit texture, just
    geometrically compressed), so it's the kind of region only
    _periodicity_consistency_score (not sharpness/contrast alone) should
    catch.
    """
    img = make_knit_image(height=height, width=width, **knit_kwargs)
    wale_period = knit_kwargs.get("wale_period", 14)
    gray = img[:, :, 0].astype(np.float32)
    yy, xx = np.mgrid[0:distort_height, 0:width]
    compressed_period = wale_period / 2.5
    distorted_band = 190 + 45 * np.sin(2 * np.pi * xx / compressed_period) + 45 * np.sin(2 * np.pi * yy / 18)
    gray[:distort_height, :] = np.clip(distorted_band, 0, 255)
    out = np.repeat(gray.astype(np.uint8)[:, :, None], 3, axis=2)
    return out


# --- _periodicity_consistency_score -----------------------------------------


def test_uniform_texture_scores_high():
    img = make_knit_image()
    gray = img[:, :, 0]
    crop = gray[100:100 + 300, 100:100 + 300]
    assert _periodicity_consistency_score(crop) > 0.8


def test_locally_distorted_texture_scores_lower_than_uniform():
    uniform = make_knit_image()[:, :, 0][100:400, 100:400]
    distorted = make_knit_with_distorted_edge()[:, :, 0][0:300, 100:400]
    assert _periodicity_consistency_score(distorted) < _periodicity_consistency_score(uniform)


def test_too_small_crop_is_neutral_not_penalized():
    tiny = np.full((10, 10), 128, dtype=np.uint8)
    assert _periodicity_consistency_score(tiny) == 0.5


# --- propose_measurement_rois: basic behavior --------------------------------


def test_proposes_multiple_regions_on_a_good_large_image():
    # A single region, however large, turned out not to be reliable
    # enough alone (see the module docstring on propose_measurement_rois)
    # -- a good, spacious image should get at least the minimum cross-
    # checkable count, not just one.
    img = make_knit_image()
    ppm = 8.0  # px/mm, arbitrary plausible calibration
    result = propose_measurement_rois(img, pixels_per_mm=ppm)
    assert result.success
    assert len(result.rois) >= 2
    labels = [r.label for r in result.rois]
    assert len(labels) == len(set(labels))  # every region has a unique label
    assert result.rois[0].label == "A"


def test_proposed_regions_are_within_image_bounds():
    img = make_knit_image(height=500, width=700)
    ppm = 6.0
    result = propose_measurement_rois(img, pixels_per_mm=ppm)
    assert result.success
    for r in result.rois:
        assert r.x >= 0 and r.y >= 0
        assert r.x + r.width <= 700
        assert r.y + r.height <= 500
        assert r.width == r.height  # square


def test_proposed_region_quality_clears_the_bar_on_a_clean_image():
    img = make_knit_image()
    ppm = 8.0
    result = propose_measurement_rois(img, pixels_per_mm=ppm)
    assert result.success
    for r in result.rois:
        assert r.quality_score >= ROI_PROPOSAL_MIN_QUALITY
    assert "large regular region" in result.message or "large regular regions" in result.message


def test_larger_calibration_scale_proposes_a_larger_pixel_window():
    # Same physical target sizes, but a denser calibration (more px per
    # mm) should yield a larger proposed window in PIXELS for the same
    # physical inch target.
    img_hi = make_knit_image(height=1200, width=1200, wale_period=28, course_period=36)
    img_lo = make_knit_image(height=1200, width=1200, wale_period=14, course_period=18)
    hi = propose_measurement_rois(img_hi, pixels_per_mm=16.0)
    lo = propose_measurement_rois(img_lo, pixels_per_mm=8.0)
    assert hi.success and lo.success
    assert hi.window_size_px > lo.window_size_px


def test_invalid_calibration_fails_cleanly():
    img = make_knit_image()
    result = propose_measurement_rois(img, pixels_per_mm=0)
    assert not result.success


def test_no_image_fails_cleanly():
    result = propose_measurement_rois(None, pixels_per_mm=8.0)
    assert not result.success


def test_image_too_small_for_scale_fails_cleanly():
    img = make_knit_image(height=40, width=40)
    result = propose_measurement_rois(img, pixels_per_mm=8.0)
    assert not result.success


# --- propose_measurement_rois: avoids background / distorted edges -----------


def test_avoids_flat_background_border():
    img = make_knit_with_background_border(border=100)
    ppm = 8.0
    result = propose_measurement_rois(img, pixels_per_mm=ppm)
    assert result.success
    for r in result.rois:
        # No proposed box may dip into the flat 100px border on any side.
        assert r.x >= 100
        assert r.y >= 100
        assert r.x + r.width <= 600 - 100
        assert r.y + r.height <= 600 - 100


def test_prefers_uniform_region_over_locally_distorted_one():
    # A large image where only a band along the top is distorted -- every
    # proposed box should either land entirely below that band, or (if
    # forced to include it at some candidate size) only graze its edge.
    img = make_knit_with_distorted_edge(height=700, width=700, distort_height=120)
    ppm = 8.0
    result = propose_measurement_rois(img, pixels_per_mm=ppm)
    assert result.success
    for r in result.rois:
        overlap_with_distorted_band = max(0, min(r.y + r.height, 120) - max(r.y, 0))
        # Allow only a small sliver of overlap (a proposal that clears the
        # quality bar despite grazing the band's very edge is acceptable;
        # one that sits mostly inside it is not).
        assert overlap_with_distorted_band < r.height * 0.25


def test_proposed_regions_are_spatially_separated():
    # Multiple proposed regions shouldn't cluster on top of each other --
    # each pair must be far enough apart (or non-overlapping) that they're
    # genuinely independent samples of the fabric.
    img = make_knit_image(height=900, width=900)
    ppm = 8.0
    result = propose_measurement_rois(img, pixels_per_mm=ppm)
    assert result.success
    if len(result.rois) < 2:
        pytest.skip("only one region was proposed on this synthetic image")
    for i, a in enumerate(result.rois):
        for b in result.rois[i + 1:]:
            ax1, ay1, ax2, ay2 = a.x, a.y, a.x + a.width, a.y + a.height
            bx1, by1, bx2, by2 = b.x, b.y, b.x + b.width, b.y + b.height
            ix = max(0, min(ax2, bx2) - max(ax1, bx1))
            iy = max(0, min(ay2, by2) - max(ay1, by1))
            overlap_area = ix * iy
            min_area = min(a.width * a.height, b.width * b.height)
            assert overlap_area / min_area < 0.1


def test_quality_score_of_distorted_band_is_lower_than_clean_interior():
    img = make_knit_with_distorted_edge(height=700, width=700, distort_height=120)
    gray = img[:, :, 0]
    distorted_crop = gray[10:10 + 100, 200:200 + 200]
    clean_crop = gray[300:300 + 200, 200:200 + 200]
    distorted_score, _ = _roi_quality_score(distorted_crop)
    clean_score, _ = _roi_quality_score(clean_crop)
    assert clean_score > distorted_score
