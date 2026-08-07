"""
Core computer-vision algorithm for estimating knitted-textile gauge
(wale spacing / course spacing) from a photograph, using classical
image-processing techniques only — no AI/ML models.

Pipeline, per axis (wale axis and course axis):
  1. Crop the user-selected region of interest (ROI).
  2. Convert to grayscale.
  3. Local contrast normalization (CLAHE) to flatten uneven lighting.
  4. Texture/edge enhancement (Sobel gradient magnitude) to make the
     repeating stitch structure stand out.
  5. Collapse the enhanced image to a 1D projection signal along the
     axis perpendicular to the structures being measured.
  6. Estimate the dominant periodic spacing of that signal via
     autocorrelation.
  7. Detect individual peak positions in the (smoothed) projection
     signal for overlay/visualization and as a cross-check on spacing.
  8. Produce a simple confidence score from signal quality.

This module deliberately never invents a result: if the signal is too
weak, too short, or too noisy to support a periodicity estimate, the
corresponding AxisResult comes back with spacing_px=None and
confidence=0.0, with a human-readable reason.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Literal, Optional, Tuple

import cv2
import numpy as np
from scipy.signal import correlate, detrend, find_peaks
from scipy.ndimage import uniform_filter1d

Orientation = Literal["vertical", "horizontal"]

# --- Tunable constants -------------------------------------------------

MIN_ROI_DIM_PX = 40          # smallest ROI edge we'll attempt to analyze
MIN_PEAKS_FOR_GOOD_CONFIDENCE = 3
MIN_PLAUSIBLE_SPACING_PX = 3.0   # ignore periodicities finer than this (likely noise)
SMOOTHING_WINDOW_PX = 3          # 1D smoothing window applied to projection signals
CLAHE_CLIP_LIMIT = 2.0
CLAHE_TILE_GRID = (8, 8)


@dataclass
class AxisResult:
    """Result of the periodicity analysis along a single axis (wale or course)."""

    spacing_px: Optional[float]
    positions_px: List[float] = field(default_factory=list)
    confidence: float = 0.0
    message: str = ""


@dataclass
class GaugeAnalysisResult:
    """Full result of analyzing one ROI for both wale and course spacing."""

    success: bool
    message: str
    wale: AxisResult
    course: AxisResult
    roi_width_px: int = 0
    roi_height_px: int = 0


def analyze_gauge(
    image_bgr: np.ndarray,
    roi: Tuple[int, int, int, int],
    orientation: Orientation,
) -> GaugeAnalysisResult:
    """
    Analyze a rectangular region of a textile photograph and estimate
    wale spacing and course spacing in pixels.

    Args:
        image_bgr: full source image as a BGR numpy array (as decoded by OpenCV).
        roi: (x, y, width, height) of the region to analyze, in the
             pixel coordinates of ``image_bgr``.
        orientation: "vertical" if wales run vertically (columns run up/down,
             the common case), "horizontal" if the fabric is rotated so
             wales run left-to-right.

    Returns:
        GaugeAnalysisResult. If the ROI is invalid or the image cannot be
        analyzed at all, ``success`` is False and both axes come back empty.
        Individual axes may still fail independently (e.g. a very
        uniform/blurry crop) without failing the whole request — those
        axes report confidence=0.0 and spacing_px=None rather than a
        fabricated number.
    """
    empty = AxisResult(spacing_px=None, positions_px=[], confidence=0.0)

    if image_bgr is None or image_bgr.size == 0:
        return GaugeAnalysisResult(
            success=False,
            message="No image data to analyze.",
            wale=empty,
            course=empty,
        )

    img_h, img_w = image_bgr.shape[:2]
    x, y, w, h = roi

    # Clamp ROI to image bounds defensively.
    x = max(0, min(int(round(x)), img_w - 1))
    y = max(0, min(int(round(y)), img_h - 1))
    w = max(0, min(int(round(w)), img_w - x))
    h = max(0, min(int(round(h)), img_h - y))

    if w < MIN_ROI_DIM_PX or h < MIN_ROI_DIM_PX:
        return GaugeAnalysisResult(
            success=False,
            message=(
                f"Selected area is too small to analyze "
                f"(minimum {MIN_ROI_DIM_PX}x{MIN_ROI_DIM_PX}px)."
            ),
            wale=empty,
            course=empty,
            roi_width_px=w,
            roi_height_px=h,
        )

    crop = image_bgr[y : y + h, x : x + w]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    gx, gy = _enhance_texture(gray)

    # Wale spacing is measured along the axis PERPENDICULAR to the wale
    # direction; course spacing is measured perpendicular to the course
    # direction (which is always perpendicular to wales). We use the
    # *directional* gradient aligned with that axis (gx for horizontal
    # periodicity, gy for vertical periodicity) rather than gradient
    # magnitude: magnitude = sqrt(gx^2 + gy^2) is a nonlinear ("rectifying")
    # operation that folds negative gradient lobes onto positive ones,
    # which doubles the apparent spatial frequency for regular/symmetric
    # texture. The signed directional derivative preserves the true
    # fundamental period of the stitch pattern.
    if orientation == "vertical":
        wale_signal_axis = 0    # collapse rows -> signal varies over x (columns)
        course_signal_axis = 1  # collapse columns -> signal varies over y (rows)
        wale_source, course_source = gx, gy
    else:
        wale_signal_axis = 1
        course_signal_axis = 0
        wale_source, course_source = gy, gx

    wale = _analyze_axis(wale_source, axis=wale_signal_axis)
    course = _analyze_axis(course_source, axis=course_signal_axis)

    # Translate positions from ROI-local coordinates to full-image coordinates.
    if wale_signal_axis == 0:
        wale.positions_px = [p + x for p in wale.positions_px]
        course.positions_px = [p + y for p in course.positions_px]
    else:
        wale.positions_px = [p + y for p in wale.positions_px]
        course.positions_px = [p + x for p in course.positions_px]

    overall_ok = wale.spacing_px is not None or course.spacing_px is not None
    message = (
        "Analysis complete."
        if overall_ok
        else "No reliable periodic stitch pattern was detected in this area."
    )

    return GaugeAnalysisResult(
        success=True,
        message=message,
        wale=wale,
        course=course,
        roi_width_px=w,
        roi_height_px=h,
    )


# --- Internal steps ------------------------------------------------------


def _enhance_texture(gray: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Local contrast normalization + directional edge/texture enhancement.

    Returns (gx, gy): signed horizontal and vertical Sobel derivatives of
    the contrast-normalized crop. Kept signed and separate (rather than
    collapsed into a single gradient-magnitude image) so downstream
    periodicity analysis isn't distorted by the frequency-doubling that
    a rectifying operation like magnitude/abs would introduce.
    """
    # Local contrast normalization: CLAHE flattens uneven lighting/fabric
    # sheen so the periodic stitch texture is comparably visible everywhere.
    clahe = cv2.createCLAHE(clipLimit=CLAHE_CLIP_LIMIT, tileGridSize=CLAHE_TILE_GRID)
    normalized = clahe.apply(gray)

    # Light denoise before differentiation to avoid amplifying sensor noise.
    blurred = cv2.GaussianBlur(normalized, (3, 3), 0)

    # Texture/edge enhancement — stitch boundaries (wale columns, course
    # rows) produce strong, regularly spaced edges along each axis.
    gx = cv2.Sobel(blurred, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(blurred, cv2.CV_32F, 0, 1, ksize=3)
    return gx, gy


def _project(enhanced: np.ndarray, axis: int) -> np.ndarray:
    """Collapse a 2D enhanced image to a 1D signal by averaging along `axis`."""
    signal = enhanced.mean(axis=axis)
    # Remove any linear trend (e.g. uneven lighting gradient across the crop)
    # so autocorrelation isn't dominated by the DC/trend component.
    signal = detrend(signal, type="linear")
    # Light smoothing to suppress pixel-level noise while preserving the
    # coarser periodic structure we're trying to measure.
    if len(signal) > SMOOTHING_WINDOW_PX:
        signal = uniform_filter1d(signal, size=SMOOTHING_WINDOW_PX)
    return signal


def _autocorrelation_spacing(signal: np.ndarray) -> Tuple[Optional[float], float]:
    """
    Estimate the dominant periodic spacing of a 1D signal via autocorrelation.

    Returns (spacing_px, strength) where strength is the normalized height
    (0..1) of the first strong autocorrelation peak — a proxy for how
    periodic the signal actually is.
    """
    n = len(signal)
    if n < 2 * MIN_PLAUSIBLE_SPACING_PX or np.std(signal) < 1e-6:
        return None, 0.0

    full_corr = correlate(signal, signal, mode="full")
    zero_lag_idx = n - 1
    autocorr = full_corr[zero_lag_idx:]  # lags 0..n-1
    if autocorr[0] <= 0:
        return None, 0.0
    autocorr_norm = autocorr / autocorr[0]

    # Only consider lags in a plausible range: at least MIN_PLAUSIBLE_SPACING_PX,
    # at most half the signal length (beyond that, too few repeats to trust).
    lo = int(MIN_PLAUSIBLE_SPACING_PX)
    hi = max(lo + 1, n // 2)
    search_region = autocorr_norm[lo:hi]
    if len(search_region) < 2:
        return None, 0.0

    peaks, props = find_peaks(search_region, prominence=0.01)
    if len(peaks) == 0:
        return None, 0.0

    # Choose the highest peak (strongest periodicity) rather than simply
    # the first — the first local max can be a minor sub-harmonic wiggle.
    best_local_idx = peaks[np.argmax(search_region[peaks])]
    spacing = float(best_local_idx + lo)
    strength = float(np.clip(search_region[best_local_idx], 0.0, 1.0))
    return spacing, strength


def _detect_peaks(signal: np.ndarray, spacing_hint: float) -> List[float]:
    """Detect individual peak positions in the projection signal for overlay drawing."""
    min_distance = max(1, int(round(spacing_hint * 0.6)))
    std = np.std(signal)
    if std < 1e-6:
        return []
    peaks, _ = find_peaks(signal, distance=min_distance, prominence=std * 0.3)
    return [float(p) for p in peaks]


def _analyze_axis(enhanced: np.ndarray, axis: int) -> AxisResult:
    signal = _project(enhanced, axis=axis)

    spacing_est, autocorr_strength = _autocorrelation_spacing(signal)
    if spacing_est is None:
        return AxisResult(
            spacing_px=None,
            positions_px=[],
            confidence=0.0,
            message="No reliable periodicity detected along this axis.",
        )

    positions = _detect_peaks(signal, spacing_est)

    # Prefer the average spacing measured directly from detected peak
    # positions (more precise than the autocorrelation lag, which is
    # quantized to whole pixels) when we found enough peaks to trust it.
    spacing_px = spacing_est
    spacing_consistency = 0.0
    if len(positions) >= MIN_PEAKS_FOR_GOOD_CONFIDENCE:
        diffs = np.diff(sorted(positions))
        diffs = diffs[diffs >= MIN_PLAUSIBLE_SPACING_PX]
        if len(diffs) > 0:
            spacing_px = float(np.mean(diffs))
            cv = float(np.std(diffs) / np.mean(diffs)) if np.mean(diffs) > 0 else 1.0
            spacing_consistency = float(np.clip(1.0 - cv, 0.0, 1.0))

    peak_count_score = float(np.clip(len(positions) / (MIN_PEAKS_FOR_GOOD_CONFIDENCE * 2), 0.0, 1.0))
    confidence = float(
        np.clip(
            0.5 * autocorr_strength + 0.3 * spacing_consistency + 0.2 * peak_count_score,
            0.0,
            1.0,
        )
    )

    message = ""
    if len(positions) < MIN_PEAKS_FOR_GOOD_CONFIDENCE:
        message = "Few repeating stitches detected; spacing estimate is low-confidence."

    return AxisResult(
        spacing_px=round(spacing_px, 3),
        positions_px=positions,
        confidence=round(confidence, 3),
        message=message,
    )
