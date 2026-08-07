"""
Core computer-vision algorithm for estimating knitted-textile gauge
(wale spacing / course spacing) from a photograph, using classical
image-processing techniques only — no AI/ML models.

--- What a "gauge" measurement actually is ---------------------------

A WALE is a vertical column of complete, intermeshed knit loops. A
COURSE is a horizontal row of complete loops. Gauge is the repeat
distance from one COMPLETE loop to the next complete loop — never the
distance between a loop's two legs, one yarn edge and its own opposite
edge, or any other sub-feature of a single loop. Getting this wrong
doesn't just shift the number; it can lock onto a harmonic (typically
half the true repeat, since a V-shaped face-knit loop has two visually
prominent legs per loop) and produce a self-consistent but structurally
wrong result.

AXIS SEMANTICS (do not let this silently flip): wales are vertical
columns, but wales-per-inch comes from the HORIZONTAL center-to-center
spacing between adjacent columns. Courses are horizontal rows, but
courses-per-inch comes from the VERTICAL center-to-center spacing
between adjacent rows. See `_direction_for` below — orientation only
decides which image axis (x or y) plays which structural role; it never
changes which physical quantity (wale spacing vs. course spacing) is
being measured.

--- Pipeline ------------------------------------------------------------

  1. Crop the user-selected region of interest (ROI).
  2. Grayscale + local contrast normalization (CLAHE).
  3. Signed directional Sobel gradients (gx, gy) — signed, not
     magnitude, to avoid a frequency-doubling artifact on regular
     texture (see the comment on `_enhance_texture`).
  4. Per direction (horizontal / vertical): collapse the relevant
     gradient to a 1D projection signal and estimate a *coarse* period
     via autocorrelation. This alone is exactly the kind of measurement
     that can lock onto a loop's leg-to-leg spacing (a harmonic) instead
     of the true loop-to-loop repeat — it has no notion of "loop" at
     all, only "some periodic edge pattern."
  5. Independently, detect approximate 2D loop-CENTER points (local
     brightness maxima at the loop scale) across the whole ROI. Unlike
     the 1D projection, a genuine loop center should appear once per
     complete loop, not twice, so nearest-neighbor spacing between
     these centers is direct (harmonic-free, modulo detection noise)
     evidence for the true repeat.
  6. Reconcile: compare the coarse autocorrelation period against 0.5x/
     1x/2x candidates, and pick whichever one the loop-center evidence
     actually supports, rather than trusting the strongest
     autocorrelation peak blindly. Every candidate considered and the
     reason for the final choice are reported for diagnostics.
  7. Cross-check with loop density (2D, whole-ROI): the loop-center
     detection scale in step 5 is itself seeded from the coarse
     autocorrelation period, so on real photos it can inherit the very
     harmonic bias it's supposed to catch — both "independent" signals
     agree on the same wrong (typically too-fine) period. Loop DENSITY
     is a separate, harder-to-fool invariant: N genuine loop centers
     spread across an ROI of area A should occupy roughly N x
     (wale_pitch x course_pitch) of that area, one repeat cell per
     loop. If the reconciled wale/course pitches imply a cell far
     smaller than that, one axis is very likely still locked onto a
     sub-loop harmonic, and we look at whether that axis's OWN
     already-computed 0.5x/1x/2x candidates contain a value that
     resolves the mismatch — never an invented multiplier.
  8. Final overlay/position marks come from clustering the loop-center
     points at the reconciled period when there's enough of that
     evidence; otherwise fall back to peak-picking on the 1D signal
     (as before, just tuned to the reconciled period).
  9. A confidence score blends autocorrelation strength, spacing
     consistency, peak count, and whether structural (loop-center and/or
     density) evidence was available to validate the choice.

This module deliberately never invents a result: if the signal is too
weak, too short, or too noisy to support a periodicity estimate, the
corresponding AxisResult comes back with spacing_px=None and
confidence=0.0, with a human-readable reason. This is a heuristic V0.2
improvement, not full loop segmentation — it's meant to be checked
against real ground truth (see the Verify Measurement feature) and
tuned further from there, not treated as definitively solved.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import List, Literal, Optional, Tuple

import cv2
import numpy as np
from scipy.ndimage import center_of_mass, label, maximum_filter, uniform_filter1d
from scipy.ndimage import sum as ndimage_sum
from scipy.signal import correlate, detrend, find_peaks

Orientation = Literal["vertical", "horizontal"]
Direction = Literal["horizontal", "vertical"]  # which image axis a quantity is measured along

# Identifies which revision of this algorithm produced a given result.
# Bump this whenever the pipeline logic below changes meaningfully (new
# enhancement step, different peak-detection tuning, etc). Stored on every
# saved ground-truth correction record so later analysis can tell which
# algorithm version a given prediction came from — e.g. to check whether a
# tuning change actually reduced systematic error, not just re-labeled it.
ALGORITHM_VERSION = "cv-clahe-sobel-autocorr-loopcenter-density-v0.3"

# --- Tunable constants -------------------------------------------------

MIN_ROI_DIM_PX = 40          # smallest ROI edge we'll attempt to analyze
MIN_PEAKS_FOR_GOOD_CONFIDENCE = 3
MIN_PLAUSIBLE_SPACING_PX = 3.0   # ignore periodicities finer than this (likely noise)
SMOOTHING_WINDOW_PX = 3          # 1D smoothing window applied to projection signals
CLAHE_CLIP_LIMIT = 2.0
CLAHE_TILE_GRID = (8, 8)
MIN_LOOP_CENTERS_FOR_EVIDENCE = 4    # below this, loop-center evidence is too thin to trust
MAX_LOOP_CENTERS = 2000              # cap for pairwise-distance cost and response payload size
HARMONIC_MATCH_LOG_TOLERANCE = 0.35  # ~1.4x wiggle room when matching a candidate to loop-center pitch
MIN_CENTER_CONSISTENCY = 0.5         # min (1 - CV) of nearest-neighbor spacings to trust loop-center pitch
DENSITY_MISMATCH_LOG_THRESHOLD = 0.35  # ~1.4x wiggle room before wale*course cell area vs. loop density counts as a real conflict


@dataclass
class AxisResult:
    """Result of the periodicity analysis along a single axis (wale or course)."""

    spacing_px: Optional[float]
    positions_px: List[float] = field(default_factory=list)
    confidence: float = 0.0
    message: str = ""
    # Diagnostics (section 10 of the "structural correction" requirements):
    # every harmonic candidate considered, and why the final one was picked.
    candidates_px: List[float] = field(default_factory=list)
    selected_reason: str = ""


@dataclass
class GaugeAnalysisResult:
    """Full result of analyzing one ROI for both wale and course spacing."""

    success: bool
    message: str
    wale: AxisResult
    course: AxisResult
    roi_width_px: int = 0
    roi_height_px: int = 0
    # Approximate 2D knit-loop-center points within the ROI (full-image
    # pixel coordinates), for the "show loop centers" diagnostic overlay.
    # Empty if there wasn't enough periodicity to seed a scale hint, or no
    # confident local maxima were found.
    loop_centers_px: List[Tuple[float, float]] = field(default_factory=list)


def _direction_for(orientation: Orientation) -> Tuple[Direction, Direction]:
    """
    The one place that decides which image axis plays which structural
    role. Wales are vertical columns; wale spacing is always the
    HORIZONTAL center-to-center distance between adjacent columns.
    Courses are horizontal rows; course spacing is always the VERTICAL
    center-to-center distance between adjacent rows. Orientation only
    tells us which way the photo is rotated relative to the fabric —
    it does not change which physical quantity is which.
    """
    if orientation == "vertical":
        return "horizontal", "vertical"  # (wale_direction, course_direction)
    return "vertical", "horizontal"


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
    normalized, gx, gy = _enhance_texture(gray)

    wale_direction, course_direction = _direction_for(orientation)
    wale_source = gx if wale_direction == "horizontal" else gy
    course_source = gx if course_direction == "horizontal" else gy

    wale_signal = _project(wale_source, axis=_COLLAPSE_AXIS[wale_direction])
    course_signal = _project(course_source, axis=_COLLAPSE_AXIS[course_direction])

    # Coarse autocorrelation-based period per direction — this is the
    # "might be a harmonic" estimate that loop-center evidence will
    # cross-check below.
    p0_wale, _ = _autocorrelation_spacing(wale_signal)
    p0_course, _ = _autocorrelation_spacing(course_signal)

    # Detect approximate loop-center points once for the whole ROI (not
    # per-direction — a loop center is a single 2D feature). Use the
    # smaller of the two coarse periods as a conservative scale hint for
    # how close two detections are allowed to be: deliberately small, so
    # a harmonic error in p0 doesn't get baked into the detector before
    # we even get a chance to cross-check it.
    scale_hints = [p for p in (p0_wale, p0_course) if p]
    loop_centers = np.empty((0, 2))
    if scale_hints:
        min_separation_px = max(3.0, 0.3 * min(scale_hints))
        loop_centers = _detect_loop_centers(normalized, min_separation_px)

    # column index into `loop_centers` (0=x) for a horizontal-direction
    # quantity, (1=y) for a vertical-direction quantity.
    wale_center_axis = 0 if wale_direction == "horizontal" else 1
    course_center_axis = 0 if course_direction == "horizontal" else 1

    # "Same row/column" tolerance for nearest-neighbor pitch estimation
    # from loop centers: bounded by the *orthogonal* direction's coarse
    # period, since that scale is independent of this direction's own
    # potential harmonic error.
    wale_band_px = max(3.0, 0.4 * (p0_course or p0_wale or 10.0))
    course_band_px = max(3.0, 0.4 * (p0_wale or p0_course or 10.0))

    wale_p_centers = _trusted_center_pitch(loop_centers, wale_center_axis, wale_band_px)
    course_p_centers = _trusted_center_pitch(loop_centers, course_center_axis, course_band_px)

    wale = _analyze_direction(wale_signal, p0_wale, wale_p_centers, loop_centers, wale_center_axis)
    course = _analyze_direction(course_signal, p0_course, course_p_centers, loop_centers, course_center_axis)

    wale, course = _cross_check_density(
        wale,
        course,
        loop_centers=loop_centers,
        wale_center_axis=wale_center_axis,
        course_center_axis=course_center_axis,
        wale_p_centers=wale_p_centers,
        course_p_centers=course_p_centers,
        wale_signal=wale_signal,
        course_signal=course_signal,
        roi_area=float(w * h),
    )

    # Translate positions from ROI-local coordinates to full-image coordinates.
    if wale_center_axis == 0:
        wale.positions_px = [p + x for p in wale.positions_px]
    else:
        wale.positions_px = [p + y for p in wale.positions_px]
    if course_center_axis == 0:
        course.positions_px = [p + x for p in course.positions_px]
    else:
        course.positions_px = [p + y for p in course.positions_px]

    loop_centers_full = (
        [(float(cx + x), float(cy + y)) for cx, cy in loop_centers] if loop_centers.size else []
    )

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
        loop_centers_px=loop_centers_full,
    )


# --- Internal steps ------------------------------------------------------

_COLLAPSE_AXIS = {"horizontal": 0, "vertical": 1}  # numpy axis to .mean() away to get a signal
#                                                     that varies with x ("horizontal") or y ("vertical")


def _enhance_texture(gray: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Local contrast normalization + directional edge/texture enhancement.

    Returns (normalized, gx, gy): the CLAHE-normalized grayscale crop
    (used for loop-center detection), and its signed horizontal/vertical
    Sobel derivatives. Kept signed and separate (rather than collapsed
    into a single gradient-magnitude image) so downstream periodicity
    analysis isn't distorted by the frequency-doubling that a rectifying
    operation like magnitude/abs would introduce.
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
    return normalized, gx, gy


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

    This is deliberately a *coarse* estimate: it has no notion of "loop"
    at all, just "some periodic edge pattern" — which is exactly why it
    can lock onto a leg-to-leg (half-repeat) or other harmonic. Treat its
    output as one candidate, not the final answer; `_reconcile_period`
    cross-checks it against loop-center evidence.

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


def _detect_loop_centers(normalized: np.ndarray, min_separation_px: float) -> np.ndarray:
    """
    Approximate 2D knit-loop-center points within the crop, at roughly
    loop scale.

    This is a heuristic, not a trained detector. Real face-knit loops
    tend to show a small highlight where the yarn crosses over itself at
    the loop head — a compact, roughly isotropic bright spot, as opposed
    to the loop's legs, which are elongated edge/line-like features.
    We look for that specifically with a Difference-of-Gaussians (DoG)
    blob response rather than raw local brightness maxima: DoG responds
    strongly to compact blob-like features at a target scale and is
    substantially less excited by elongated edges/ridges, which is
    exactly the "complete loop head, not a leg" distinction we want. It
    will still miss loops in poor lighting/focus and can pick up
    spurious texture — it's meant as *cross-checking evidence* for
    harmonic disambiguation and overlay diagnostics, not a ground-truth
    loop segmentation.

    Returns an (N, 2) array of (x, y) in ROI-local pixel coordinates.
    Empty if the crop is too flat to support any confident blob response.
    """
    if normalized.size == 0:
        return np.empty((0, 2))

    working = normalized.astype(np.float32)

    # DoG blob response, tuned to a loop-head scale derived from the
    # separation hint (itself derived from the coarse autocorrelation
    # period — see analyze_gauge). sigma2/sigma1 = 1.6 is the standard
    # DoG approximation of a Laplacian-of-Gaussian blob detector.
    sigma1 = max(0.8, min_separation_px * 0.28)
    sigma2 = sigma1 * 1.6
    g1 = cv2.GaussianBlur(working, (0, 0), sigmaX=sigma1)
    g2 = cv2.GaussianBlur(working, (0, 0), sigmaX=sigma2)
    response = g1 - g2

    size = max(3, int(round(min_separation_px)))
    if size % 2 == 0:
        size += 1

    local_max = maximum_filter(response, size=size, mode="nearest")
    is_peak = response >= (local_max - 1e-6)

    std = float(np.std(response))
    if std < 1e-6:
        return np.empty((0, 2))
    prominent = response > (0.4 * std)

    mask = is_peak & prominent
    labeled, n_components = label(mask)
    if n_components == 0:
        return np.empty((0, 2))

    if n_components > MAX_LOOP_CENTERS:
        # Implausibly many detections usually means the crop is noisy or
        # the scale hint was off — keep only the most prominent components
        # rather than let the response (and the O(N^2) pitch estimation
        # below) balloon.
        sums = ndimage_sum(response, labeled, index=np.arange(1, n_components + 1))
        keep_labels = np.argsort(sums)[::-1][:MAX_LOOP_CENTERS] + 1
        keep_mask = np.isin(labeled, keep_labels)
        labeled = np.where(keep_mask, labeled, 0)
        component_ids = keep_labels
    else:
        component_ids = np.arange(1, n_components + 1)

    # Centroid (in the DoG response's own weighting) of each connected
    # component — collapses a small cluster of adjacent near-tied pixels
    # around one true peak into a single point, rather than reporting
    # several nearly-duplicate detections for the same loop head.
    centers = center_of_mass(response, labeled, component_ids)
    if not centers:
        return np.empty((0, 2))
    return np.array([(cx, cy) for cy, cx in centers], dtype=np.float64)


def _estimate_pitch_from_centers(
    centers: np.ndarray, axis_index: int, band_tolerance_px: float
) -> Tuple[Optional[float], float]:
    """
    Estimate lattice spacing along `axis_index` (0=x, 1=y) from a 2D
    point cloud, using only same-row/column neighbor pairs (points
    within `band_tolerance_px` on the other axis). Because a genuine
    loop center should appear once per complete loop (not once per leg),
    this nearest-neighbor spacing is direct evidence for the true
    loop-to-loop repeat, without the harmonic ambiguity a 1D edge signal
    is prone to — *when the loop-center detections themselves are clean*.
    A noisy/over-dense detection (spurious texture, not real loop heads)
    produces a nearest-neighbor spacing that's all over the place, so we
    also report how internally consistent it is; the caller should not
    trust a wildly inconsistent estimate just because a median exists.

    Returns (median_spacing, consistency) where consistency is
    1 - coefficient_of_variation, clipped to [0, 1] (1.0 = every
    neighbor pair agreed exactly; 0.0 = no usable signal at all).
    median_spacing is None if there isn't enough same-row/column
    evidence to compute anything.
    """
    if centers.shape[0] < MIN_LOOP_CENTERS_FOR_EVIDENCE:
        return None, 0.0

    other_index = 1 - axis_index
    a = centers[:, axis_index]
    b = centers[:, other_index]

    diff = a[None, :] - a[:, None]  # diff[i, j] = a[j] - a[i]
    same_band = np.abs(b[None, :] - b[:, None]) <= band_tolerance_px
    forward = np.where((diff > 1e-3) & same_band, diff, np.inf)
    nearest = forward.min(axis=1)
    nearest = nearest[np.isfinite(nearest)]

    if nearest.size < 3:
        return None, 0.0

    median = float(np.median(nearest))
    if median <= 0:
        return None, 0.0
    cv = float(np.std(nearest) / median)
    consistency = float(np.clip(1.0 - cv, 0.0, 1.0))
    return median, consistency


@dataclass
class _PeriodDecision:
    period: Optional[float]
    candidates: List[float]
    reason: str
    corrected: bool   # True if the final period differs from the raw autocorrelation estimate
    validated: bool    # True if independent loop-center evidence was actually available/used


def _reconcile_period(
    p0: Optional[float], p_centers: Optional[float], min_plausible: float
) -> _PeriodDecision:
    """
    Decide the final period for one direction, given:
      - p0: the coarse autocorrelation-based estimate (prone to locking
        onto a harmonic — e.g. a loop's leg-to-leg spacing instead of the
        true loop-to-loop repeat).
      - p_centers: an independent estimate from loop-center nearest-
        neighbor spacing (harmonic-free evidence for the *complete loop*
        repeat, when available).

    Rather than trusting p0's strongest autocorrelation peak outright,
    explicitly evaluate 0.5x / 1x / 2x of it and prefer whichever
    candidate the loop-center evidence actually supports.
    """
    if p0 is None and p_centers is None:
        return _PeriodDecision(None, [], "no periodicity detected", False, False)

    if p0 is None:
        return _PeriodDecision(
            p_centers,
            [round(p_centers, 3)],
            "no autocorrelation period found; used loop-center spacing directly",
            False,
            True,
        )

    candidates = sorted({round(c, 3) for c in (p0 / 2.0, p0, p0 * 2.0) if c >= min_plausible})
    if not candidates:
        candidates = [round(p0, 3)]

    if p_centers is None or p_centers < min_plausible:
        return _PeriodDecision(
            p0,
            candidates,
            "no independent loop-center evidence available; used the autocorrelation period as-is "
            "(may be a harmonic — treat with caution)",
            False,
            False,
        )

    # Pick whichever harmonic candidate is closest to the loop-center
    # pitch on a log scale (harmonics are multiplicative, not additive).
    best = min(candidates, key=lambda c: abs(math.log(c / p_centers)))
    corrected = abs(math.log(best / p0)) > 0.05  # >5% off p0 counts as "not the raw estimate"

    if not corrected:
        reason = (
            f"autocorrelation period ({p0:.1f}px) matches loop-center spacing "
            f"({p_centers:.1f}px) — treated as the full-loop repeat"
        )
    else:
        ratio = best / p0
        if ratio > 1.0:
            # best (corrected) > p0: the raw estimate was too FINE — the
            # classic "locked onto a sub-loop feature" case, e.g. one leg
            # of a V-shaped loop instead of the whole loop.
            reason = (
                f"autocorrelation period ({p0:.1f}px) looked like a sub-loop harmonic "
                f"(e.g. one leg of a V-shaped loop); corrected up to {best:.1f}px to match "
                f"loop-center spacing ({p_centers:.1f}px)"
            )
        else:
            # best (corrected) < p0: the raw estimate was too COARSE —
            # e.g. it skipped every other loop.
            reason = (
                f"autocorrelation period ({p0:.1f}px) looked like a doubled repeat "
                f"(skipped every other loop); corrected down to {best:.1f}px to match "
                f"loop-center spacing ({p_centers:.1f}px)"
            )

    return _PeriodDecision(best, candidates, reason, corrected, True)


def _cluster_positions(coords: np.ndarray, period: float) -> List[float]:
    """
    Group nearby 1D coordinates (e.g. the x-coordinates of all detected
    loop centers, for wale-column positions) into row/column groups at
    roughly `period` spacing, and return each group's mean position.
    This is what actually produces "one marker per complete wale
    column" / "one marker per complete course row" rather than one
    marker per raw detected point.
    """
    if coords.size == 0:
        return []
    sorted_coords = np.sort(coords)
    threshold = max(period * 0.5, 1.0)
    groups: List[List[float]] = [[float(sorted_coords[0])]]
    for c in sorted_coords[1:]:
        if c - groups[-1][-1] <= threshold:
            groups[-1].append(float(c))
        else:
            groups.append([float(c)])
    return [float(np.mean(g)) for g in groups]


def _trusted_center_pitch(
    loop_centers: np.ndarray, center_axis_index: int, band_tolerance_px: float
) -> Optional[float]:
    """
    Loop-center nearest-neighbor pitch along one axis, gated by
    consistency. A median exists even for pure noise (over-detected
    spurious texture, not real loop heads) — only trust it as structural
    evidence if the neighbor spacings that produced it actually agree
    with each other. Otherwise this would "correct" an already-good
    autocorrelation estimate using noise.
    """
    if loop_centers.shape[0] < MIN_LOOP_CENTERS_FOR_EVIDENCE:
        return None
    median, consistency = _estimate_pitch_from_centers(loop_centers, center_axis_index, band_tolerance_px)
    if median is not None and consistency >= MIN_CENTER_CONSISTENCY:
        return median
    return None


def _finalize_axis(
    period: float,
    signal: np.ndarray,
    loop_centers: np.ndarray,
    center_axis_index: int,
    p_centers: Optional[float],
    candidates_px: List[float],
    selected_reason: str,
    structural_score: float,
) -> AxisResult:
    """
    Turn a chosen period into the actual reported AxisResult: overlay
    positions, refined spacing, and a confidence score. Shared by the
    normal per-axis reconciliation path and by `_cross_check_density`,
    which can pick a different (but still axis-plausible) period after
    the fact.
    """
    # Prefer positions clustered directly from loop-center evidence
    # (grounded in actual detected loop features, satisfying "one marker
    # per complete loop repeat") when there's enough of it; otherwise
    # fall back to peak-picking on the 1D signal, tuned to the period.
    if p_centers is not None:
        positions = _cluster_positions(loop_centers[:, center_axis_index], period)
        position_source = "loop-center clustering"
    else:
        positions = _detect_peaks(signal, period)
        position_source = "1D edge-signal peak detection (no loop-center evidence available)"

    spacing_px = period
    spacing_consistency = 0.0
    if len(positions) >= MIN_PEAKS_FOR_GOOD_CONFIDENCE:
        diffs = np.diff(sorted(positions))
        diffs = diffs[diffs >= MIN_PLAUSIBLE_SPACING_PX]
        if len(diffs) > 0:
            spacing_px = float(np.mean(diffs))
            cv = float(np.std(diffs) / np.mean(diffs)) if np.mean(diffs) > 0 else 1.0
            spacing_consistency = float(np.clip(1.0 - cv, 0.0, 1.0))

    peak_count_score = float(np.clip(len(positions) / (MIN_PEAKS_FOR_GOOD_CONFIDENCE * 2), 0.0, 1.0))

    # Coarse autocorrelation "strength" is still informative (a very weak
    # peak means the whole signal was marginal), so blend it in, but
    # weight structural validation explicitly via the caller-supplied score.
    _, autocorr_strength = _autocorrelation_spacing(signal)
    confidence = float(
        np.clip(
            0.4 * autocorr_strength + 0.25 * spacing_consistency + 0.15 * peak_count_score + 0.2 * structural_score,
            0.0,
            1.0,
        )
    )

    message = ""
    if len(positions) < MIN_PEAKS_FOR_GOOD_CONFIDENCE:
        message = "Few repeating loops detected; spacing estimate is low-confidence."
    elif structural_score < 0.6:
        message = "Could not independently confirm this against loop-center evidence; treat with caution."

    return AxisResult(
        spacing_px=round(spacing_px, 3),
        positions_px=positions,
        confidence=round(confidence, 3),
        message=message,
        candidates_px=candidates_px,
        selected_reason=f"{selected_reason} (positions from {position_source})",
    )


def _analyze_direction(
    signal: np.ndarray,
    p0: Optional[float],
    p_centers: Optional[float],
    loop_centers: np.ndarray,
    center_axis_index: int,
) -> AxisResult:
    decision = _reconcile_period(p0, p_centers, MIN_PLAUSIBLE_SPACING_PX)

    if decision.period is None:
        return AxisResult(
            spacing_px=None,
            positions_px=[],
            confidence=0.0,
            message="No reliable periodicity detected along this axis.",
            candidates_px=decision.candidates,
            selected_reason=decision.reason,
        )

    if decision.validated and not decision.corrected:
        structural_score = 1.0
    elif decision.validated and decision.corrected:
        structural_score = 0.85
    else:
        structural_score = 0.55

    return _finalize_axis(
        decision.period,
        signal,
        loop_centers,
        center_axis_index,
        p_centers,
        decision.candidates,
        decision.reason,
        structural_score,
    )


def _cross_check_density(
    wale: AxisResult,
    course: AxisResult,
    loop_centers: np.ndarray,
    wale_center_axis: int,
    course_center_axis: int,
    wale_p_centers: Optional[float],
    course_p_centers: Optional[float],
    wale_signal: np.ndarray,
    course_signal: np.ndarray,
    roi_area: float,
) -> Tuple[AxisResult, AxisResult]:
    """
    Second, genuinely independent structural constraint: whole-ROI loop
    DENSITY. N detected loop centers spread across an ROI of area A should
    occupy roughly N x (wale_pitch x course_pitch) of that area — one
    repeat cell per loop. This exists because the per-axis check in
    `_reconcile_period` isn't fully independent of the harmonic error it's
    meant to catch: the loop-center detection *scale* is itself seeded
    from the coarse autocorrelation period (see `analyze_gauge`), so on
    real photos both signals can end up agreeing on the same wrong
    (typically too-fine, "half a loop") period. Density doesn't share that
    dependency, so it can catch cases the per-axis check alone missed.

    If the reconciled cell area is a clear mismatch against density, look
    at whether either axis's OWN already-computed 0.5x/1x/2x candidates
    contains a value that resolves it — never an invented multiplier, and
    never a value that axis's own harmonic analysis hadn't already
    flagged as plausible.
    """
    n = loop_centers.shape[0]
    if n < MIN_LOOP_CENTERS_FOR_EVIDENCE or wale.spacing_px is None or course.spacing_px is None or roi_area <= 0:
        return wale, course

    expected_cell_area = roi_area / n
    actual_cell_area = wale.spacing_px * course.spacing_px
    if expected_cell_area <= 0 or actual_cell_area <= 0:
        return wale, course

    log_ratio = math.log(actual_cell_area / expected_cell_area)
    if abs(log_ratio) < DENSITY_MISMATCH_LOG_THRESHOLD:
        return wale, course  # cell area already plausible given loop density

    # Try each axis's own candidates (never the other axis's, never an
    # arbitrary value) as a replacement for that axis's current pick,
    # holding the other axis fixed, and find the best fix *within each
    # axis independently* first.
    per_axis_best: dict = {}  # which -> (abs_log_ratio, candidate)
    for which, axis_result, other_spacing in (
        ("wale", wale, course.spacing_px),
        ("course", course, wale.spacing_px),
    ):
        for candidate in axis_result.candidates_px:
            if abs(candidate - axis_result.spacing_px) < 1e-6:
                continue
            trial_cell_area = candidate * other_spacing
            if trial_cell_area <= 0:
                continue
            trial_log_ratio = abs(math.log(trial_cell_area / expected_cell_area))
            current = per_axis_best.get(which)
            if current is None or trial_log_ratio < current[0]:
                per_axis_best[which] = (trial_log_ratio, candidate)

    candidates_by_axis = {
        which: (ratio, cand) for which, (ratio, cand) in per_axis_best.items() if ratio < DENSITY_MISMATCH_LOG_THRESHOLD
    }
    if not candidates_by_axis:
        return wale, course  # nothing among the axes' own candidates actually helps

    # Both axes independently resolving the mismatch about equally well is
    # inherently ambiguous from density alone (the product is symmetric in
    # wale/course) — break the tie by adjusting whichever axis was already
    # less trusted going in, rather than an arbitrary axis-checked-first bias.
    if len(candidates_by_axis) == 2 and abs(candidates_by_axis["wale"][0] - candidates_by_axis["course"][0]) < 0.02:
        which = "wale" if wale.confidence <= course.confidence else "course"
    else:
        which = min(candidates_by_axis, key=lambda w: candidates_by_axis[w][0])

    _, candidate = candidates_by_axis[which]
    note = (
        f"Density cross-check corrected this to {candidate:.1f}px: the previously reconciled "
        f"wale x course cell area didn't match how many loop centers were actually detected "
        f"across the ROI, and {candidate:.1f}px is a harmonic candidate this axis's own "
        f"autocorrelation already considered."
    )

    if which == "wale":
        updated = _finalize_axis(
            candidate, wale_signal, loop_centers, wale_center_axis, wale_p_centers,
            wale.candidates_px, note, structural_score=0.75,
        )
        return updated, course
    else:
        updated = _finalize_axis(
            candidate, course_signal, loop_centers, course_center_axis, course_p_centers,
            course.candidates_px, note, structural_score=0.75,
        )
        return wale, updated
