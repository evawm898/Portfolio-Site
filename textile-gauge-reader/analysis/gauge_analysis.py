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
  8. Wale axis only, one further structural check ("fold-consistency"):
     stack the wale-direction signal into consecutive chunks at each
     candidate period and measure how similar those chunks are to each
     other. A genuine complete-loop repeat reproduces nearly the same
     waveform shape every period, so its chunks correlate strongly. A
     period that instead isolates one leg of a V-shaped loop misaligns —
     consecutive "repeats" at that spacing are actually the alternating
     LEFT and RIGHT legs of the true loop (structurally different, often
     opposite gradient polarity) — so they correlate poorly with each
     other, even though plain autocorrelation can show just as strong a
     peak there (autocorrelation only measures energy at a lag, not
     whether the repeated unit is the same shape each time). This is
     scoped to the wale axis only — see `analyze_gauge` — since it's the
     axis a face-knit V-shape's bilateral leg symmetry specifically
     confuses; course-row periodicity doesn't have that failure mode and
     is deliberately left untouched by it.
  9. Final overlay/position marks come from clustering the loop-center
     points at the reconciled period when there's enough of that
     evidence; otherwise fall back to peak-picking on the 1D signal
     (as before, just tuned to the reconciled period).
  10. A confidence score blends autocorrelation strength, spacing
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
from dataclasses import dataclass, field, replace
from typing import List, Literal, Optional, Tuple

import cv2
import numpy as np
from scipy.ndimage import center_of_mass, label, map_coordinates, maximum_filter, uniform_filter1d
from scipy.ndimage import sum as ndimage_sum
from scipy.signal import correlate, detrend, find_peaks

Structure = Literal["jersey", "unknown"]

Orientation = Literal["vertical", "horizontal"]
Direction = Literal["horizontal", "vertical"]  # which image axis a quantity is measured along

# Identifies which revision of this algorithm produced a given result.
# Bump this whenever the pipeline logic below changes meaningfully (new
# enhancement step, different peak-detection tuning, etc). Stored on every
# saved ground-truth correction record so later analysis can tell which
# algorithm version a given prediction came from — e.g. to check whether a
# tuning change actually reduced systematic error, not just re-labeled it.
ALGORITHM_VERSION = "cv-v0.3"

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
FOLD_CONSISTENCY_MIN_TRUST = 0.55    # a candidate must reach at least this to count as "a genuine repeat"
FOLD_CONSISTENCY_MARGIN = 0.15       # ...and beat the raw estimate's own score by at least this to override it

# --- v0.3 candidate-scoring configuration ---------------------------------
#
# Every wale/course period candidate is scored by combining several
# independent pieces of evidence into one number (see _score_candidates).
# All the weights and thresholds that decide how much each piece of
# evidence matters live HERE, in one place, rather than as scattered
# coefficients through the analysis functions — change tuning here, not
# by hunting for magic numbers.
#
# The positive terms (autocorr, support_2d, structural, patch_consensus,
# regularity, repeat_count, phase_consistency) are deliberately close to
# summing to 1.0, so a candidate with strong, fully-agreeing evidence
# scores close to 1.0 before any penalty; harmonic_penalty_weight,
# alternating_phase_penalty_weight, and instability_penalty_weight are
# subtracted, not part of that budget.


@dataclass(frozen=True)
class ScoringWeights:
    autocorr: float = 0.12              # 1D autocorrelation strength at this exact lag
    support_2d: float = 0.12            # 2D autocorrelation support at this lag (see _sample_2d_support)
    structural: float = 0.20            # fold-consistency (wale) + loop-center pitch agreement
    # Deliberately reduced from earlier v0.3 tuning: real-photo diagnostics
    # (see gauge_analysis module docstring / phase-consistency work) showed
    # patch consensus is NOT as independent as it looks -- each sub-region
    # band runs its own 1D autocorrelation, seeded from the same texture,
    # and can inherit the identical half-period lock-on in every patch at
    # once (the same "independent evidence that isn't fully independent"
    # failure mode already documented for loop-center-detection scale).
    # Sub-regions agreeing with each other is corroborating evidence, not
    # proof of structural correctness.
    patch_consensus: float = 0.10       # agreement with independent overlapping sub-region estimates
    regularity: float = 0.08            # spacing consistency of the positions this candidate implies
    repeat_count: float = 0.03          # reward seeing enough repeats in the ROI to trust a periodicity claim
    # Does every repeat land on the SAME kind of textile feature (a true
    # full repeat), or does it alternate between two visually different
    # ones every other marker (a half-period harmonic, e.g. one leg of a
    # V each time)? See _phase_consistency_evidence. The LARGEST single
    # weight here, deliberately: every other positive term above is a
    # periodicity-STRENGTH proxy, and a periodic half-feature is
    # mathematically just as periodic as the true full feature -- none of
    # them can structurally tell a full loop from its own leg. Phase
    # consistency is grounded in the actual local image content at each
    # candidate's own marker positions and directly tests the thing a
    # wale/course repeat is actually DEFINED as (see the module
    # docstring), so it gets to matter the most.
    phase_consistency: float = 0.35
    harmonic_penalty_weight: float = 0.30    # subtracted: how ambiguous this candidate is vs. a 0.5x/2x relative
    # subtracted: how much repeat markers alternate between two distinct
    # visual phases (A B A B ...) instead of repeating the same one --
    # see _phase_consistency_evidence. A genuine per-candidate structural
    # red flag (not a symmetric pairwise comparison like the harmonic
    # penalty above), so -- unlike that one -- this DOES factor into
    # which candidate wins, not just confidence.
    alternating_phase_penalty_weight: float = 0.30
    instability_penalty_weight: float = 0.35  # subtracted from CONFIDENCE (not ranking) when patches disagree


# Structure="jersey" leans harder on structural (V-shape/loop-center) and
# phase-consistency evidence, since both are specifically grounded in a
# face-knit loop's actual geometry; "unknown" (default) relies relatively
# more on periodicity and cross-region consensus, which don't assume any
# particular loop shape.
WEIGHTS_UNKNOWN = ScoringWeights()
WEIGHTS_JERSEY = ScoringWeights(
    autocorr=0.08, support_2d=0.08, structural=0.25, patch_consensus=0.08,
    regularity=0.08, repeat_count=0.03, phase_consistency=0.40,
    harmonic_penalty_weight=0.30, alternating_phase_penalty_weight=0.30, instability_penalty_weight=0.35,
)

# Harmonic-relative log-tolerance: how close c2/c1 must be to exactly 2.0
# (or 0.5) to count as "the same harmonic relationship" when computing the
# ambiguity penalty (accounts for c being derived from a slightly-off p0).
HARMONIC_RELATIVE_LOG_TOLERANCE = 0.12
# Falloff scale for "closeness on a log scale" style evidence terms
# (candidate-vs-loop-center-pitch, candidate-vs-patch-median): a factor of
# ~1.28x off (log ratio 0.25) still counts as reasonably close, further
# than that falls off quickly.
CLOSENESS_LOG_SCALE = 0.25
MIN_REPEATS_FOR_FULL_SCORE = 8.0     # visible repeats in the ROI at which repeat_count score saturates at 1.0
MIN_REPEATS_FOR_ANY_SCORE = 2.0      # fewer than this and repeat_count score is 0
UNCERTAIN_SCORE_MARGIN = 0.08        # top-2 final candidate scores within this margin -> "uncertain"
UNCERTAIN_CONFIDENCE_THRESHOLD = 0.35  # confidence below this -> "uncertain" regardless of margin (any axis/pipeline)
N_CONSENSUS_PATCHES = 4              # overlapping sub-region bands analyzed per axis
PATCH_OVERLAP_FRACTION = 0.5

# --- Phase consistency (_phase_consistency_evidence) ----------------------
# For a candidate period, does every repeat marker land on the SAME kind
# of local visual feature, or does it alternate between two distinct ones
# (e.g. a V-shaped loop's left leg vs. right leg)? See the function's
# docstring for the full explanation.
PHASE_PATCH_WIDTH_FRACTION = 0.5     # patch width/height around each marker, as a fraction of the candidate period
MIN_PHASE_PATCH_PX = 3               # never extract a narrower patch than this, however small the period
MIN_MARKERS_FOR_PHASE_EVIDENCE = 3   # need >=3 markers for 1 same-parity pair; fewer -> neutral evidence
MIN_PATCH_DIM_PX = 24                # a band thinner than this along its collapsed dimension isn't trustworthy
ROTATION_SEARCH_DEG = 6.0            # search +/- this many degrees for small tilt correction
ROTATION_STEP_DEG = 1.5
MIN_ROI_DIM_FOR_ROTATION_PX = 80     # skip rotation search on ROIs too small to safely rotate/crop


@dataclass
class CandidateInfo:
    """
    One harmonic candidate considered for an axis's period, with the
    evidence used to judge it — exposed via the API so a human (or a
    future tuning pass) can see *why* a period was picked, not just what
    was picked. See AxisResult.candidate_details.
    """

    period_px: float
    harmonic: str  # "0.5x" / "1x" / "2x" relative to the raw autocorrelation estimate
    fold_consistency: Optional[float]  # None when not computed for this axis (course, currently)
    selected: bool
    # v0.3 scoring breakdown (None for candidates produced by the older,
    # still-present _reconcile_period path — e.g. when a caller opts out
    # of the v0.3 scorer). See ScoringWeights / _score_candidates.
    autocorr_score: Optional[float] = None
    support_2d: Optional[float] = None
    structural_score: Optional[float] = None
    patch_consensus: Optional[float] = None
    harmonic_penalty: Optional[float] = None
    final_score: Optional[float] = None
    # Weighted evidence composite BEFORE the harmonic penalty is subtracted
    # (autocorr + 2D support + structural + patch consensus + regularity +
    # repeat count + phase consistency - alternating-phase penalty). This
    # -- not final_score -- is what decides `selected`; see the note above
    # _score_candidates for why.
    evidence_score: Optional[float] = None
    # Do this candidate's own repeat markers land on the same local visual
    # feature every time (high) or alternate between two distinct ones
    # (low)? And the companion alternating_phase_score: how much MORE
    # similar same-parity markers (1<->3, 2<->4, ...) are than adjacent
    # ones (1<->2, 2<->3, ...) -- the specific "A B A B" signature of a
    # half-period harmonic. See _phase_consistency_evidence.
    phase_consistency: Optional[float] = None
    alternating_phase_score: Optional[float] = None


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
    # Richer per-candidate diagnostics (harmonic relationship, structural
    # score, which one was selected) — see CandidateInfo.
    candidate_details: List[CandidateInfo] = field(default_factory=list)
    # "confident" (default) or "uncertain" -- set when the top two scored
    # candidates were too close to call (see UNCERTAIN_SCORE_MARGIN). The
    # numeric spacing_px/positions_px are still the best estimate even
    # when uncertain; the UI is expected to visually flag it, not hide it.
    status: str = "confident"
    uncertain_reason: Optional[str] = None


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
    # Small-angle tilt correction applied before analysis (see
    # _normalize_rotation), in degrees; 0.0 if none was applied/needed.
    # Purely diagnostic -- overlays are always translated back to the
    # original (unrotated) image coordinates.
    rotation_deg: float = 0.0


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
    structure: Structure = "unknown",
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
             wales run left-to-right. Authoritative -- this function only
             compensates for a few degrees of tilt *around* whichever way
             the user says the fabric runs (see _normalize_rotation); it
             never guesses orientation itself.
        structure: "jersey" leans the candidate scoring harder on
             structural (V-shape/loop-center) evidence, appropriate for a
             face-knit single-jersey fabric; "unknown" (default) relies
             relatively more on periodicity and cross-region consensus,
             which don't assume any particular loop geometry.

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

    wale_direction, course_direction = _direction_for(orientation)

    # All SPATIAL evidence (loop centers, detected positions, the 2D
    # autocorrelation, overlay coordinates) is derived from this
    # ORIGINAL, unrotated crop -- never from the rotated one below -- so
    # every reported pixel coordinate stays exactly registered to the
    # original image with no inverse-rotation bookkeeping required.
    normalized, gx, gy = _enhance_texture(gray)
    wale_source = gx if wale_direction == "horizontal" else gy
    course_source = gx if course_direction == "horizontal" else gy
    wale_signal = _project(wale_source, axis=_COLLAPSE_AXIS[wale_direction])
    course_signal = _project(course_source, axis=_COLLAPSE_AXIS[course_direction])

    # Small-angle tilt correction (see _normalize_rotation): only the
    # SCALAR period estimate benefits from the cleaner, de-tilted signal
    # -- positions/overlays stay in the original crop's coordinate space
    # (see above), which is the deliberate simplification documented on
    # GaugeAnalysisResult.rotation_deg. Full perspective correction is
    # out of scope for v0.3 (see module docstring / README).
    rotation_deg, rotated_gray = _normalize_rotation(gray, wale_direction, course_direction)
    if rotation_deg != 0.0:
        _, rot_gx, rot_gy = _enhance_texture(rotated_gray)
        rot_wale_source = rot_gx if wale_direction == "horizontal" else rot_gy
        rot_course_source = rot_gx if course_direction == "horizontal" else rot_gy
        wale_signal_for_period = _project(rot_wale_source, axis=_COLLAPSE_AXIS[wale_direction])
        course_signal_for_period = _project(rot_course_source, axis=_COLLAPSE_AXIS[course_direction])
    else:
        wale_signal_for_period = wale_signal
        course_signal_for_period = course_signal

    # Coarse autocorrelation-based period per direction — this seeds the
    # 0.5x/1x/2x candidate family that _analyze_axis_v3 scores below. It
    # is exactly the kind of measurement that can lock onto a loop's
    # leg-to-leg spacing (a harmonic) instead of the true loop-to-loop
    # repeat — see the module docstring.
    p0_wale, _ = _autocorrelation_spacing(wale_signal_for_period)
    p0_course, _ = _autocorrelation_spacing(course_signal_for_period)

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

    # 2D periodicity: one FFT-based autocorrelation of the whole ROI,
    # sampled per-candidate below (see _sample_2d_support) rather than
    # trusting two independent 1D projections alone.
    ac2d = _two_d_autocorrelation(normalized)

    # Multi-patch regional consensus: independent period estimates from
    # several overlapping sub-region bands per axis (see
    # _patch_period_estimates), used both as scoring evidence and (via
    # _patch_instability) to catch spacing that varies noticeably across
    # the ROI -- e.g. from mild perspective distortion (see module
    # docstring; full perspective correction is deliberately out of
    # scope for v0.3).
    wale_patch_periods = _patch_period_estimates(
        wale_source, _COLLAPSE_AXIS[wale_direction], N_CONSENSUS_PATCHES, PATCH_OVERLAP_FRACTION
    )
    course_patch_periods = _patch_period_estimates(
        course_source, _COLLAPSE_AXIS[course_direction], N_CONSENSUS_PATCHES, PATCH_OVERLAP_FRACTION
    )

    weights = WEIGHTS_JERSEY if structure == "jersey" else WEIGHTS_UNKNOWN
    wale_p_centers = _trusted_center_pitch(loop_centers, wale_center_axis, wale_band_px)
    course_p_centers = _trusted_center_pitch(loop_centers, course_center_axis, course_band_px)

    # Fold-consistency (V-leg-pairing structural check) is scoped to the
    # wale axis only: it targets the specific failure mode of a face-knit
    # V-shape's bilateral leg symmetry fooling plain autocorrelation.
    # Course-row periodicity doesn't have that failure mode, and this
    # keeps course detection unaffected by it.
    wale = _analyze_axis_v3(
        wale_signal, p0_wale, loop_centers, wale_center_axis, wale_band_px,
        ac2d, wale_direction == "horizontal", wale_patch_periods, float(w if wale_direction == "horizontal" else h),
        use_fold_consistency=True, weights=weights, normalized_2d=normalized,
    )

    # COURSE: selection deliberately uses the older, previously-proven
    # per-axis reconciliation (_analyze_direction: autocorrelation +
    # loop-center pitch, the same pipeline that reported ~6.87 c/in on a
    # real jersey photo where ground truth was 7.2), NOT the new v0.3
    # evidence-based scorer -- a real regression was found where the v0.3
    # scorer selected a doubled (2x) course period on real fabric texture
    # even though the coarse autocorrelation/loop-center evidence already
    # pointed at the correct one. The v0.3 scorer is still run alongside
    # it purely for its richer per-candidate diagnostics (autocorrelation,
    # 2D support, structural, patch consensus, evidence/final score),
    # merged onto the older pipeline's answer with `selected` corrected to
    # match -- "improved diagnostic candidate evaluation" without
    # replacing a detector that was already working. Wale keeps using the
    # v0.3 scorer (it doesn't have a working baseline to fall back to --
    # it was ~9.55 c/in before v0.3 and ~9.64 after, i.e. still wrong
    # either way -- and is the subject of ongoing, separate work).
    course_v3_diagnostics = _analyze_axis_v3(
        course_signal, p0_course, loop_centers, course_center_axis, course_band_px,
        ac2d, course_direction == "horizontal", course_patch_periods, float(w if course_direction == "horizontal" else h),
        use_fold_consistency=False, weights=weights, normalized_2d=normalized,
    )
    course = _analyze_direction(
        course_signal, p0_course, course_p_centers, loop_centers, course_center_axis,
        use_fold_consistency=False,
    )
    old_selected = next((d.period_px for d in course.candidate_details if d.selected), None)
    if old_selected is not None and course_v3_diagnostics.candidate_details:
        course = replace(
            course,
            candidate_details=_reselect_candidate(course_v3_diagnostics.candidate_details, old_selected),
        )

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

    # Generic confidence-floor uncertainty: independent of which pipeline
    # produced the result (v0.3 scorer or the restored course pipeline
    # above), a genuinely low-confidence number shouldn't present as a
    # normal, trustworthy measurement -- see UNCERTAIN_CONFIDENCE_THRESHOLD.
    wale = _apply_confidence_floor_uncertainty(wale)
    course = _apply_confidence_floor_uncertainty(course)

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
        rotation_deg=rotation_deg,
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


def _fold_consistency(signal: np.ndarray, period: float, min_plausible: float) -> float:
    """
    Stack `signal` into consecutive chunks of length `period` and measure
    how self-similar those chunks are to each other (mean pairwise
    correlation between consecutive chunks).

    A genuine structural repeat (one complete V-loop) reproduces nearly
    the same waveform shape every period, so its chunks correlate
    strongly. A period that instead isolates one leg of a V misaligns:
    consecutive "repeats" at that spacing are actually the alternating
    LEFT and RIGHT legs of the true loop — structurally different shapes,
    typically opposite gradient polarity — so they correlate poorly with
    each other, even though the coarse autocorrelation can still show a
    strong peak there (autocorrelation only measures energy at a lag, not
    whether the repeated unit is structurally the same each time).

    Returns a score in [0, 1] (negative correlation — literally
    mirror-opposite shapes, the classic leg-vs-leg case — maps to 0). 0.0
    if there isn't enough signal to say anything.
    """
    if period < min_plausible or period <= 0 or signal.size == 0:
        return 0.0
    n_chunks = int(len(signal) // period)
    if n_chunks < 3:
        return 0.0
    chunks = []
    for i in range(n_chunks):
        start = int(round(i * period))
        end = int(round(start + period))
        if end > len(signal):
            break
        chunk = signal[start:end]
        if len(chunk) >= 3:
            chunks.append(chunk)
    if len(chunks) < 3:
        return 0.0
    target_len = min(len(c) for c in chunks)
    if target_len < 3:
        return 0.0
    chunks = [c[:target_len] for c in chunks]
    correlations = []
    for a, b in zip(chunks[:-1], chunks[1:]):
        if np.std(a) < 1e-9 or np.std(b) < 1e-9:
            continue
        r = float(np.corrcoef(a, b)[0, 1])
        if not math.isnan(r):
            correlations.append(r)
    if not correlations:
        return 0.0
    return float(np.clip(float(np.mean(correlations)), 0.0, 1.0))


@dataclass
class _PeriodDecision:
    period: Optional[float]
    candidates: List[float]
    reason: str
    corrected: bool   # True if the final period differs from the raw autocorrelation estimate
    validated: bool    # True if independent loop-center evidence was actually available/used
    candidate_details: List[CandidateInfo] = field(default_factory=list)


def _labeled_candidates(p0: float, min_plausible: float) -> List[Tuple[float, str]]:
    """The 0.5x/1x/2x harmonic family for p0, each tagged with its harmonic
    label, deduplicated by rounded value (first label wins), filtered to
    plausible spacings, and sorted ascending. This is the one place that
    generates candidates — every override elsewhere only ever picks among
    these, never invents a value."""
    specs = [(p0 / 2.0, "0.5x"), (p0, "1x"), (p0 * 2.0, "2x")]
    seen = {}
    for value, label_ in specs:
        if value < min_plausible:
            continue
        key = round(value, 3)
        if key not in seen:
            seen[key] = label_
    return sorted((value, label_) for value, label_ in seen.items())


def _reconcile_period(
    p0: Optional[float],
    p_centers: Optional[float],
    min_plausible: float,
    signal: Optional[np.ndarray] = None,
) -> _PeriodDecision:
    """
    Decide the final period for one direction, given:
      - p0: the coarse autocorrelation-based estimate (prone to locking
        onto a harmonic — e.g. a loop's leg-to-leg spacing instead of the
        true loop-to-loop repeat).
      - p_centers: an independent estimate from loop-center nearest-
        neighbor spacing (harmonic-free evidence for the *complete loop*
        repeat, when available).
      - signal: when given, enables the fold-consistency structural check
        (see `_fold_consistency`) as a second, differently-grounded vote.
        Passed only for the wale axis (see `analyze_gauge`) — course
        periodicity doesn't have the V-leg-symmetry failure mode this
        targets, and this keeps course detection byte-for-byte unchanged.

    Rather than trusting p0's strongest autocorrelation peak outright,
    explicitly evaluate 0.5x / 1x / 2x of it and prefer whichever
    candidate the available structural evidence actually supports.
    """
    if p0 is None and p_centers is None:
        return _PeriodDecision(None, [], "no periodicity detected", False, False)

    if p0 is None:
        period = round(p_centers, 3)
        return _PeriodDecision(
            p_centers,
            [period],
            "no autocorrelation period found; used loop-center spacing directly",
            False,
            True,
            [CandidateInfo(period, "1x", None, True)],
        )

    labeled = _labeled_candidates(p0, min_plausible)
    if not labeled:
        labeled = [(round(p0, 3), "1x")]
    candidates = [c for c, _ in labeled]
    harmonic_of = dict(labeled)

    fold_scores: dict = {}
    if signal is not None:
        fold_scores = {c: _fold_consistency(signal, c, min_plausible) for c in candidates}

    p0_key = min(candidates, key=lambda c: abs(c - round(p0, 3)))

    # The single most fold-consistent candidate (a genuine complete-loop
    # repeat should reproduce nearly the same waveform shape every period;
    # a leg-locked period alternates between the two, structurally
    # different, legs and correlates poorly with itself). Only trusted
    # as a *candidate* for overriding something else if it clears an
    # absolute bar — a weak best-of-three shouldn't override anything.
    best_fold_candidate = None
    best_fold_score = None
    if fold_scores and len(candidates) > 1:
        cand = max(candidates, key=lambda c: fold_scores[c])
        if fold_scores[cand] >= FOLD_CONSISTENCY_MIN_TRUST:
            best_fold_candidate, best_fold_score = cand, fold_scores[cand]

    def _fold_override_for(current: float) -> Optional[float]:
        """Whichever candidate fold-consistency prefers over `current`,
        if it clearly beats `current`'s own score — evaluated fresh at
        each decision point (against p0 with no loop-center evidence,
        or against whatever loop-center evidence separately picked),
        never just once against the raw estimate. That distinction is
        what catches the loop-center pipeline itself "confirming" a
        leg-locked period (see the p_centers branch below)."""
        if best_fold_candidate is None or best_fold_candidate == current:
            return None
        if best_fold_score - fold_scores.get(current, 0.0) >= FOLD_CONSISTENCY_MARGIN:
            return best_fold_candidate
        return None

    def _details(selected: float) -> List[CandidateInfo]:
        return [
            CandidateInfo(c, harmonic_of[c], fold_scores.get(c), c == selected) for c in candidates
        ]

    if p_centers is None or p_centers < min_plausible:
        fold_override = _fold_override_for(p0_key)
        if fold_override is not None:
            reason = (
                f"autocorrelation period ({p0:.1f}px) was structurally inconsistent with itself "
                f"across repeats (fold-consistency {fold_scores[p0_key]:.2f}) — consistent with "
                f"isolating one leg of a V-shaped loop rather than the complete loop; corrected to "
                f"{fold_override:.1f}px (fold-consistency {fold_scores[fold_override]:.2f}), the "
                f"candidate whose repeats actually look like each other"
            )
            corrected = abs(math.log(fold_override / p0)) > 0.05
            return _PeriodDecision(fold_override, candidates, reason, corrected, True, _details(fold_override))
        return _PeriodDecision(
            p0,
            candidates,
            "no independent loop-center evidence available; used the autocorrelation period as-is "
            "(may be a harmonic — treat with caution)",
            False,
            False,
            _details(p0_key),
        )

    # Pick whichever harmonic candidate is closest to the loop-center
    # pitch on a log scale (harmonics are multiplicative, not additive).
    p_centers_pick = min(candidates, key=lambda c: abs(math.log(c / p_centers)))
    best = p_centers_pick

    # The loop-center detection scale is itself seeded from p0 (see
    # analyze_gauge), so on some real photos it inherits the same
    # too-fine bias it's meant to catch — loop-center evidence can end up
    # "confirming" a leg-locked period. Check fold-consistency against
    # whatever loop-center evidence just picked (not against p0 — that
    # comparison was already tried above and can trivially agree with p0
    # while still being wrong once p_centers pulls `best` somewhere else).
    fold_override = _fold_override_for(p_centers_pick)
    overridden_by_fold = fold_override is not None
    if overridden_by_fold:
        best = fold_override

    corrected = abs(math.log(best / p0)) > 0.05  # >5% off p0 counts as "not the raw estimate"

    if overridden_by_fold:
        reason = (
            f"loop-center evidence pointed to {p_centers_pick:.1f}px, but that period was "
            f"structurally inconsistent with itself across repeats (fold-consistency "
            f"{fold_scores.get(p_centers_pick, 0.0):.2f}) — likely the loop-center detector "
            f"inherited the same leg-scale bias it was meant to catch; corrected to {best:.1f}px "
            f"instead (fold-consistency {fold_scores[best]:.2f})"
        )
    elif not corrected:
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

    return _PeriodDecision(best, candidates, reason, corrected, True, _details(best))


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
    candidate_details: Optional[List[CandidateInfo]] = None,
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
        candidate_details=candidate_details or [],
    )


def _analyze_direction(
    signal: np.ndarray,
    p0: Optional[float],
    p_centers: Optional[float],
    loop_centers: np.ndarray,
    center_axis_index: int,
    use_fold_consistency: bool = False,
) -> AxisResult:
    decision = _reconcile_period(
        p0, p_centers, MIN_PLAUSIBLE_SPACING_PX, signal=signal if use_fold_consistency else None
    )

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
        decision.candidate_details,
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
    at whether WALE's own already-computed 0.5x/1x/2x candidates contains
    a value that resolves it — never an invented multiplier, and never a
    value wale's own harmonic analysis hadn't already flagged as
    plausible. Deliberately WALE-ONLY (course is never substituted here):
    see the note above the per-axis search loop below for why trying
    course too let a correct course pick get overwritten to compensate
    for an unrelated wale-axis error.
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
    #
    # WALE ONLY: this used to also try substituting a course candidate,
    # but that let a genuinely correct course pick get "corrected" into a
    # wrong one purely to compensate for an unrelated wale-axis error --
    # since the density equation (candidate * other_spacing) is symmetric,
    # if wale's own candidate family didn't happen to contain a value
    # close enough to fully close the gap, the search would find a
    # doubled/halved COURSE candidate that closed it instead, on a real
    # photo where course was already right. Confirmed as the cause of a
    # real regression (course flipped from ~6.87 to ~3.47 c/in on a real
    # jersey photo) -- see the module docstring. Wale is the axis still
    # known to have a harmonic-lock-on problem; course is not, so only
    # wale's own candidates are ever tried as a substitute.
    per_axis_best: dict = {}  # which -> (abs_log_ratio, candidate)
    for which, axis_result, other_spacing in (
        ("wale", wale, course.spacing_px),
    ):
        # Where fold-consistency data exists (wale axis), a candidate it
        # already flagged as structurally inconsistent with itself (i.e.
        # likely one leg of a V, not a complete loop) is excluded outright
        # -- density agreeing with loop-center counts that inherited the
        # same leg-scale bias shouldn't be able to talk this back into a
        # candidate direct structural evidence already rejected.
        fold_lookup = {d.period_px: d.fold_consistency for d in axis_result.candidate_details}
        for candidate in axis_result.candidates_px:
            if abs(candidate - axis_result.spacing_px) < 1e-6:
                continue
            fold_score = fold_lookup.get(candidate)
            if fold_score is not None and fold_score < FOLD_CONSISTENCY_MIN_TRUST:
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
        return wale, course  # nothing among wale's own candidates actually helps

    _, candidate = candidates_by_axis["wale"]
    note = (
        f"Density cross-check corrected this to {candidate:.1f}px: the previously reconciled "
        f"wale x course cell area didn't match how many loop centers were actually detected "
        f"across the ROI, and {candidate:.1f}px is a harmonic candidate this axis's own "
        f"autocorrelation already considered."
    )

    updated = _finalize_axis(
        candidate, wale_signal, loop_centers, wale_center_axis, wale_p_centers,
        wale.candidates_px, note, structural_score=0.75,
        candidate_details=_reselect_candidate(wale.candidate_details, candidate),
    )
    return updated, course


def _reselect_candidate(details: List[CandidateInfo], new_period: float) -> List[CandidateInfo]:
    """Return a copy of `details` with `selected` flipped to whichever
    entry matches `new_period` — used when a later stage (density
    cross-check) picks a different candidate than the per-axis
    reconciliation did, so the diagnostics stay consistent with the
    actual final answer. Preserves every field (including the v0.3
    scoring breakdown, when present) via dataclasses.replace -- only
    `selected` changes."""
    return [replace(d, selected=abs(d.period_px - new_period) < 1e-6) for d in details]


# --- v0.3: rotation normalization, 2D periodicity, multi-patch consensus,
#     and the unified candidate-scoring system -----------------------------


def _normalize_rotation(
    gray: np.ndarray, wale_direction: Direction, course_direction: Direction
) -> Tuple[float, np.ndarray]:
    """
    Search a small range of rotation angles and return whichever one
    produces the strongest COMBINED 1D periodicity signal along both the
    wale and course directions -- i.e. de-tilt the crop just enough that
    "wale direction" and "course direction" line up cleanly with the
    image's x/y axes before periodicity analysis runs.

    This does NOT replace the user's manual orientation control (that
    still decides which axis is which, authoritatively -- see
    analyze_gauge); it only compensates for a few degrees of camera/
    fabric tilt around that. It does not attempt full perspective
    correction (a tilted-but-planar fabric is a very different problem
    from a genuinely perspective-distorted photo) -- see the module
    docstring and README for that as documented future work.

    Returns (angle_deg, rotated_gray). angle_deg is 0.0 (and rotated_gray
    is just `gray`) when the crop is too small to safely rotate/crop, or
    when no tested angle beat the unrotated baseline.
    """
    h, w = gray.shape[:2]
    if h < MIN_ROI_DIM_FOR_ROTATION_PX or w < MIN_ROI_DIM_FOR_ROTATION_PX:
        return 0.0, gray

    def _combined_strength(g: np.ndarray) -> float:
        _, gx, gy = _enhance_texture(g)
        wale_source = gx if wale_direction == "horizontal" else gy
        course_source = gx if course_direction == "horizontal" else gy
        wale_sig = _project(wale_source, axis=_COLLAPSE_AXIS[wale_direction])
        course_sig = _project(course_source, axis=_COLLAPSE_AXIS[course_direction])
        _, s1 = _autocorrelation_spacing(wale_sig)
        _, s2 = _autocorrelation_spacing(course_sig)
        return s1 + s2

    center = (w / 2.0, h / 2.0)
    best_angle = 0.0
    best_strength = _combined_strength(gray)

    angle = -ROTATION_SEARCH_DEG
    while angle <= ROTATION_SEARCH_DEG + 1e-6:
        if abs(angle) > 1e-6:
            rot_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(
                gray, rot_matrix, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT101
            )
            strength = _combined_strength(rotated)
            if strength > best_strength:
                best_strength = strength
                best_angle = angle
        angle += ROTATION_STEP_DEG

    if abs(best_angle) < 1e-6:
        return 0.0, gray

    rot_matrix = cv2.getRotationMatrix2D(center, best_angle, 1.0)
    rotated_gray = cv2.warpAffine(
        gray, rot_matrix, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT101
    )
    return float(best_angle), rotated_gray


def _two_d_autocorrelation(img: np.ndarray) -> np.ndarray:
    """
    Full 2D autocorrelation of `img` via FFT (Wiener-Khinchin theorem),
    centered (fftshift) so the zero-lag peak sits at the array's own
    center. This is "does the whole 2D texture repeat here" evidence --
    richer than two independent 1D projections, since it can confirm (or
    fail to confirm) a candidate (dx, dy) repeat directly against the
    real 2D image rather than a collapsed, direction-blind average.
    """
    arr = img.astype(np.float64)
    arr = arr - arr.mean()
    spectrum = np.fft.fft2(arr)
    power = spectrum * np.conj(spectrum)
    ac = np.fft.ifft2(power).real
    return np.fft.fftshift(ac)


def _sample_2d_support(ac2d: np.ndarray, dx: float, dy: float) -> float:
    """
    Normalized 2D autocorrelation value at lag (dx, dy) from the zero-lag
    center, in [0, 1] (bilinear-interpolated; clipped since noise can
    push interpolated values slightly outside that range).
    """
    if ac2d.size == 0:
        return 0.0
    h, w = ac2d.shape[:2]
    cy, cx = h / 2.0, w / 2.0
    zero_lag = ac2d[int(round(cy)), int(round(cx))]
    if zero_lag <= 0:
        return 0.0
    y, x = cy + dy, cx + dx
    if y < 0 or y > h - 1 or x < 0 or x > w - 1:
        return 0.0
    value = map_coordinates(ac2d, [[y], [x]], order=1, mode="nearest")[0]
    return float(np.clip(value / zero_lag, 0.0, 1.0))


def _patch_period_estimates(
    source: np.ndarray, collapse_axis: int, n_patches: int, overlap: float
) -> List[float]:
    """
    Split `source` (a 2D signed-gradient array) into `n_patches`
    overlapping bands along the SAME dimension being averaged away by
    the projection (i.e. each band is a different subset of the rows/
    columns that get collapsed into the 1D signal), run the same 1D
    autocorrelation-based period estimate independently in each band,
    and return whichever estimates were plausible.

    This is the "several overlapping sub-regions" cross-check: a genuine
    textile repeat should show up consistently across different parts of
    the ROI; a spurious one -- or one only true in part of the ROI, e.g.
    from mild perspective distortion -- won't.
    """
    band_dim = collapse_axis
    total = source.shape[band_dim]
    if n_patches < 2 or total < MIN_PATCH_DIM_PX * 2:
        return []
    band_len = max(MIN_PATCH_DIM_PX, int(total / (1 + (n_patches - 1) * (1 - overlap))))
    step = max(1, int(band_len * (1 - overlap)))
    periods: List[float] = []
    start = 0
    seen = 0
    while start < total and seen < n_patches:
        end = min(start + band_len, total)
        if end - start >= MIN_PATCH_DIM_PX:
            patch = source[start:end, :] if band_dim == 0 else source[:, start:end]
            sig = _project(patch, axis=collapse_axis)
            p, strength = _autocorrelation_spacing(sig)
            if p is not None and strength > 0.05:
                periods.append(p)
        start += step
        seen += 1
    return periods


def _closeness_log(a: float, b: float, scale: float = CLOSENESS_LOG_SCALE) -> float:
    """1.0 when a==b, smoothly falling off as their ratio moves away from
    1 on a log scale (harmonics/scale mismatches are multiplicative, not
    additive, so a log-scale falloff treats "2x off" consistently
    regardless of the absolute pixel scale)."""
    if a <= 0 or b <= 0:
        return 0.0
    return float(math.exp(-abs(math.log(a / b)) / scale))


def _patch_consensus_score(patch_periods: List[float], candidate: float) -> float:
    """How well `candidate` agrees with the robust median of independent
    per-patch period estimates, weighted by how tightly those patches
    agree with each other in the first place (a "consensus" built from
    wildly disagreeing patches isn't worth much)."""
    if len(patch_periods) < 2:
        return 0.0
    median = float(np.median(patch_periods))
    if median <= 0:
        return 0.0
    closeness = _closeness_log(candidate, median)
    mad = float(np.median(np.abs(np.array(patch_periods) - median)))
    internal_agreement = float(np.clip(1.0 - (mad / median), 0.0, 1.0))
    return float(np.clip(0.6 * closeness + 0.4 * internal_agreement, 0.0, 1.0))


def _patch_instability(patch_periods: List[float]) -> float:
    """
    Axis-level (not per-candidate) instability signal used for
    CONFIDENCE, not candidate ranking: how much the independent per-patch
    period estimates disagree with each other. High instability is
    exactly what "spacing changes noticeably across the ROI" (e.g. mild
    perspective distortion, or a crumpled/uneven fabric surface) looks
    like -- see analyze_gauge and the module docstring.
    """
    if len(patch_periods) < 2:
        return 0.3  # couldn't cross-check regionally at all -- a little uncertainty, not none
    median = float(np.median(patch_periods))
    if median <= 0:
        return 0.3
    mad = float(np.median(np.abs(np.array(patch_periods) - median)))
    return float(np.clip(mad / median, 0.0, 1.0))


def _center_pitch_agreement(candidate: float, center_median: Optional[float], center_consistency: float) -> float:
    """How well `candidate` agrees with loop-center nearest-neighbor
    pitch, weighted by how internally consistent that loop-center
    evidence itself was (see _estimate_pitch_from_centers) -- noisy
    loop-center evidence shouldn't get to vote as strongly as clean
    evidence."""
    if center_median is None or center_median <= 0:
        return 0.0
    return _closeness_log(candidate, center_median) * float(np.clip(center_consistency, 0.0, 1.0))


def _combine_structural(fold_consistency: Optional[float], center_agreement: float) -> float:
    """Blend the two structural (loop-anatomy-grounded) evidence sources
    available for a candidate: fold-consistency (wale axis only -- see
    _fold_consistency) and loop-center pitch agreement (both axes)."""
    if fold_consistency is None:
        return center_agreement
    return 0.5 * fold_consistency + 0.5 * center_agreement


def _repeat_count_score(roi_extent_px: float, period_px: float) -> float:
    """Reward a candidate that implies enough visible repeats in the ROI
    to actually trust a periodicity claim; a "period" comparable to (or
    bigger than) the ROI itself isn't a trustworthy repeat estimate no
    matter how well it scores on every other axis."""
    if period_px <= 0:
        return 0.0
    count = roi_extent_px / period_px
    span = MIN_REPEATS_FOR_FULL_SCORE - MIN_REPEATS_FOR_ANY_SCORE
    return float(np.clip((count - MIN_REPEATS_FOR_ANY_SCORE) / span, 0.0, 1.0))


def _positions_regularity(positions: List[float]) -> float:
    """Spacing consistency (1 - coefficient of variation) of consecutive
    detected positions at a candidate period -- a genuine repeat should
    imply evenly-spaced positions; a spurious one (from noise, or a
    partial/uneven match) typically doesn't."""
    if len(positions) < MIN_PEAKS_FOR_GOOD_CONFIDENCE:
        return 0.0
    diffs = np.diff(sorted(positions))
    diffs = diffs[diffs >= MIN_PLAUSIBLE_SPACING_PX]
    if len(diffs) == 0 or np.mean(diffs) <= 0:
        return 0.0
    cv = float(np.std(diffs) / np.mean(diffs))
    return float(np.clip(1.0 - cv, 0.0, 1.0))


def _autocorr_strength_at_lag(signal: np.ndarray, lag: float) -> float:
    """
    Normalized 1D autocorrelation value at an arbitrary (possibly
    non-integer) lag, interpolated. Unlike `_autocorrelation_spacing`
    (which reports only the single strongest peak found), this samples
    the curve at a SPECIFIC candidate period, whether or not it happens
    to be that peak -- so every 0.5x/1x/2x candidate gets a genuinely
    measured periodicity score, not just whichever one autocorrelation
    would have picked on its own.
    """
    n = len(signal)
    if n < 2 * MIN_PLAUSIBLE_SPACING_PX or np.std(signal) < 1e-6 or lag <= 0:
        return 0.0
    full_corr = correlate(signal, signal, mode="full")
    zero_lag_idx = n - 1
    autocorr = full_corr[zero_lag_idx:]
    if autocorr[0] <= 0:
        return 0.0
    autocorr_norm = autocorr / autocorr[0]
    if lag >= len(autocorr_norm) - 1:
        return 0.0
    value = float(np.interp(lag, np.arange(len(autocorr_norm)), autocorr_norm))
    return float(np.clip(value, 0.0, 1.0))


def _extract_phase_patch(
    normalized_2d: np.ndarray, position: float, half_width: float, lag_dx: bool
) -> Optional[np.ndarray]:
    """
    A narrow strip of the ROI's normalized image centered on one repeat
    marker: the full ROI extent along the "collapsed" direction (so the
    strip captures the whole visual character of that column/row, not
    just one point), and a narrow window of `2*half_width` around
    `position` along the axis that varies with this candidate's period.
    Returns None if the strip would run off the edge of the ROI --
    positions right at the edge don't have a full, comparable patch.
    """
    h, w = normalized_2d.shape[:2]
    lo = int(round(position - half_width))
    hi = int(round(position + half_width))
    if lag_dx:
        if lo < 0 or hi > w or hi <= lo:
            return None
        return normalized_2d[:, lo:hi]
    else:
        if lo < 0 or hi > h or hi <= lo:
            return None
        return normalized_2d[lo:hi, :]


def _patch_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    Normalized cross-correlation between two equal-shaped image patches,
    each standardized (zero mean, unit std) first so overall brightness
    differences between markers don't matter -- only the TEXTURE PATTERN
    does. Mapped from [-1, 1] to [0, 1] to match the other evidence
    terms' scale.
    """
    if a.shape != b.shape or a.size == 0:
        return 0.0
    af = a.astype(np.float64)
    bf = b.astype(np.float64)
    a_std = af.std()
    b_std = bf.std()
    if a_std < 1e-6 or b_std < 1e-6:
        return 0.5  # both (near-)flat patches -- not evidence of anything either way
    a_norm = (af - af.mean()) / a_std
    b_norm = (bf - bf.mean()) / b_std
    corr = float(np.clip(np.mean(a_norm * b_norm), -1.0, 1.0))
    return float(np.clip((corr + 1.0) / 2.0, 0.0, 1.0))


def _phase_consistency_evidence(
    normalized_2d: Optional[np.ndarray],
    positions: List[float],
    period: float,
    lag_dx: bool,
) -> Tuple[float, float]:
    """
    Does this candidate's own repeat markers land on the SAME local
    visual feature every time, or does the pattern alternate between two
    distinct ones? This is the piece of evidence pure periodicity
    strength structurally cannot provide: a loop's two legs each produce
    their own regular edge, so the half-period candidate that isolates
    one leg can autocorrelate just as strongly as the true full-loop
    period -- but the legs don't look like each other, while genuine
    repeats of the same complete structure do.

    For each marker, extract a narrow local patch (see
    _extract_phase_patch) and standardize it. Then compare:
      - ADJACENT markers (1<->2, 2<->3, ...) -- high similarity is what a
        genuine full repeat looks like (every step returns to the same
        phase of the structure).
      - SAME-PARITY markers two steps apart (1<->3, 2<->4, ...) -- for a
        half-period harmonic, two steps of the wrong (too-short) period
        equals one true full period, so these come back into phase even
        when adjacent ones don't.

    Returns (phase_consistency, alternating_phase_score):
      - phase_consistency = mean adjacent-marker similarity. High for a
        genuine full repeat; low when consecutive markers look
        different from each other.
      - alternating_phase_score = how much MORE similar same-parity
        markers are than adjacent ones (clipped at 0) -- the specific
        "A B A B" signature of a half-period harmonic. Near zero for a
        genuine full repeat (adjacent markers are already just as
        similar as same-parity ones).

    Returns (0.5, 0.0) -- neutral, no signal either way -- when there
    isn't enough image data or enough markers to measure this (fewer
    than MIN_MARKERS_FOR_PHASE_EVIDENCE positions, or no 2D image
    supplied at all).
    """
    if normalized_2d is None or period <= 0 or len(positions) < MIN_MARKERS_FOR_PHASE_EVIDENCE:
        return 0.5, 0.0

    half_width = max(MIN_PHASE_PATCH_PX, period * PHASE_PATCH_WIDTH_FRACTION / 2.0)
    ordered = sorted(positions)
    patches = [_extract_phase_patch(normalized_2d, p, half_width, lag_dx) for p in ordered]
    patches = [p for p in patches if p is not None]
    if len(patches) < MIN_MARKERS_FOR_PHASE_EVIDENCE:
        return 0.5, 0.0

    adjacent_sims = [_patch_similarity(patches[i], patches[i + 1]) for i in range(len(patches) - 1)]
    same_parity_sims = [_patch_similarity(patches[i], patches[i + 2]) for i in range(len(patches) - 2)]

    phase_consistency = float(np.mean(adjacent_sims)) if adjacent_sims else 0.5
    same_parity_mean = float(np.mean(same_parity_sims)) if same_parity_sims else phase_consistency
    alternating_phase_score = float(np.clip(same_parity_mean - phase_consistency, 0.0, 1.0))
    return phase_consistency, alternating_phase_score


def _harmonic_penalty(candidate: float, candidates: List[float], autocorr_scores: dict) -> float:
    """
    How much harmonic ambiguity exists between `candidate` and any OTHER
    candidate in the same family that's ~2x or ~0.5x of it: if a harmonic
    relative scores nearly as strongly on raw periodicity alone, that's
    exactly the "P and 2P look similar" ambiguity that causes half-repeat
    lock-on (see the module docstring), and every other piece of
    evidence needs to work harder to resolve it.

    Symmetric by construction -- it penalizes BOTH members of an
    ambiguous pair equally; which one actually wins is decided by the
    other (structural / 2D / regional-consensus) terms, never by this
    penalty alone. Returns 0 when no harmonic relative is in the
    candidate set at all.

    IMPORTANT: because it's identical for both members of a pair, it is
    mathematically a no-op for deciding a head-to-head between exactly
    those two (subtracting the same amount from both leaves their order
    unchanged) -- its only real effect is lowering the absolute score of
    an ambiguous pair, which is exactly what CONFIDENCE should reflect,
    but MUST NOT be used to rank a pair member against a *third*,
    unrelated candidate: a candidate strongly ambiguous with its 2x/0.5x
    neighbor (both scoring high) would otherwise lose to a completely
    different, evidence-weak candidate that simply wasn't part of any
    ambiguous pair. See `evidence_score` in _score_candidates, which is
    what actually decides the winner.
    """
    if candidate <= 0:
        return 0.0
    own_score = autocorr_scores.get(candidate, 0.0)
    worst = 0.0
    for other in candidates:
        if other == candidate or other <= 0:
            continue
        ratio = other / candidate
        is_double = abs(math.log(ratio / 2.0)) < HARMONIC_RELATIVE_LOG_TOLERANCE
        is_half = abs(math.log(ratio * 2.0)) < HARMONIC_RELATIVE_LOG_TOLERANCE
        if not (is_double or is_half):
            continue
        other_score = autocorr_scores.get(other, 0.0)
        similarity = 1.0 - abs(own_score - other_score)
        worst = max(worst, float(np.clip(similarity, 0.0, 1.0)))
    return worst


def _score_candidates(
    p0: float,
    signal: np.ndarray,
    center_median: Optional[float],
    center_consistency: float,
    ac2d: np.ndarray,
    lag_dx: bool,
    patch_periods: List[float],
    roi_extent_px: float,
    use_fold_consistency: bool,
    min_plausible: float,
    weights: ScoringWeights,
    normalized_2d: Optional[np.ndarray] = None,
) -> Tuple[List[CandidateInfo], float]:
    """
    Score every 0.5x/1x/2x candidate for one axis, combining periodicity
    (1D + 2D), structural (fold-consistency + loop-center) evidence,
    regional (patch) consensus, spacing regularity, visible-repeat count,
    phase consistency, and a harmonic-ambiguity penalty into one
    `final_score` per candidate (see ScoringWeights -- the one place all
    these weights are defined). Returns (candidate_infos,
    instability_penalty) -- instability_penalty is axis-level (not
    per-candidate), used for CONFIDENCE, not for deciding which
    candidate wins.

    `center_median`/`center_consistency` are the axis's loop-center
    nearest-neighbor pitch evidence, computed ONCE by the caller (see
    analyze_gauge) rather than recomputed here -- `_estimate_pitch_from_
    centers` is O(N^2) in the number of detected loop centers, by far
    the most expensive step in analysis, and was previously being
    redundantly recomputed up to 3x per axis.

    `normalized_2d` (the CLAHE-enhanced ROI grayscale) enables phase-
    consistency evidence (see _phase_consistency_evidence) -- optional
    so existing callers/tests that only have the 1D signal still work;
    phase evidence is simply neutral (no signal either way) without it.
    """
    labeled = _labeled_candidates(p0, min_plausible)
    if not labeled:
        labeled = [(round(p0, 3), "1x")]
    candidates = [c for c, _ in labeled]
    harmonic_of = dict(labeled)

    autocorr_scores: dict = {c: _autocorr_strength_at_lag(signal, c) for c in candidates}

    per_candidate: dict = {}
    for c in candidates:
        support_2d = _sample_2d_support(ac2d, c if lag_dx else 0.0, 0.0 if lag_dx else c)
        fold = _fold_consistency(signal, c, min_plausible) if use_fold_consistency else None
        center_agree = _center_pitch_agreement(c, center_median, center_consistency)
        structural = _combine_structural(fold, center_agree)
        positions_c = _detect_peaks(signal, c)
        phase_consistency, alternating_phase = _phase_consistency_evidence(
            normalized_2d, positions_c, c, lag_dx
        )
        per_candidate[c] = dict(
            autocorr=autocorr_scores[c],
            support_2d=support_2d,
            structural=structural,
            fold=fold,
            regularity=_positions_regularity(positions_c),
            repeat=_repeat_count_score(roi_extent_px, c),
            patch=_patch_consensus_score(patch_periods, c),
            phase_consistency=phase_consistency,
            alternating_phase=alternating_phase,
        )

    for c in candidates:
        e = per_candidate[c]
        e["harmonic_penalty"] = _harmonic_penalty(c, candidates, autocorr_scores)
        evidence = (
            weights.autocorr * e["autocorr"]
            + weights.support_2d * e["support_2d"]
            + weights.structural * e["structural"]
            + weights.patch_consensus * e["patch"]
            + weights.regularity * e["regularity"]
            + weights.repeat_count * e["repeat"]
            + weights.phase_consistency * e["phase_consistency"]
            - weights.alternating_phase_penalty_weight * e["alternating_phase"]
        )
        e["evidence"] = float(np.clip(evidence, 0.0, 1.0))
        e["final"] = float(np.clip(evidence - weights.harmonic_penalty_weight * e["harmonic_penalty"], -1.0, 1.0))

    # The WINNER is decided by evidence_score (periodicity + structural +
    # regional consensus + phase consistency, before the harmonic
    # penalty). The harmonic penalty is provably a wash between two
    # candidates that are actually ambiguous with each other (see
    # _harmonic_penalty docstring) -- ranking by the post-penalty `final`
    # score instead would let it leak across pairs and hand the win to
    # an unrelated, evidence-weak third candidate just because it
    # happened not to be part of any ambiguous pair. Phase consistency
    # and its alternating-phase penalty are NOT like the harmonic
    # penalty in this respect -- each is a genuine, self-contained,
    # per-candidate measurement (not a symmetric pairwise comparison),
    # so both belong in `evidence` and DO get to decide the winner.
    winner = max(candidates, key=lambda c: per_candidate[c]["evidence"])
    infos = [
        CandidateInfo(
            period_px=c,
            harmonic=harmonic_of[c],
            fold_consistency=per_candidate[c]["fold"],
            selected=(c == winner),
            autocorr_score=round(per_candidate[c]["autocorr"], 3),
            support_2d=round(per_candidate[c]["support_2d"], 3),
            structural_score=round(per_candidate[c]["structural"], 3),
            patch_consensus=round(per_candidate[c]["patch"], 3),
            evidence_score=round(per_candidate[c]["evidence"], 3),
            harmonic_penalty=round(per_candidate[c]["harmonic_penalty"], 3),
            final_score=round(per_candidate[c]["final"], 3),
            phase_consistency=round(per_candidate[c]["phase_consistency"], 3),
            alternating_phase_score=round(per_candidate[c]["alternating_phase"], 3),
        )
        for c in candidates
    ]

    instability = _patch_instability(patch_periods)
    return infos, instability


def _finalize_axis_v3(
    period: float,
    signal: np.ndarray,
    loop_centers: np.ndarray,
    center_axis_index: int,
    p_centers: Optional[float],
    candidates_px: List[float],
    selected_reason: str,
    candidate_details: List[CandidateInfo],
    final_score: float,
    instability_penalty: float,
    uncertain: bool,
    uncertain_reason: Optional[str],
) -> AxisResult:
    """v0.3 counterpart to `_finalize_axis`: same position/spacing
    derivation, but confidence comes directly from the winning
    candidate's combined evidence score (see ScoringWeights) rather than
    the older ad hoc blend, and the result can be explicitly flagged
    "uncertain" instead of always returning a single confident number."""
    if p_centers is not None:
        positions = _cluster_positions(loop_centers[:, center_axis_index], period)
        position_source = "loop-center clustering"
    else:
        positions = _detect_peaks(signal, period)
        position_source = "1D edge-signal peak detection (no loop-center evidence available)"

    spacing_px = period
    if len(positions) >= MIN_PEAKS_FOR_GOOD_CONFIDENCE:
        diffs = np.diff(sorted(positions))
        diffs = diffs[diffs >= MIN_PLAUSIBLE_SPACING_PX]
        if len(diffs) > 0:
            spacing_px = float(np.mean(diffs))

    # Confidence directly reflects the v0.3 combined evidence score for
    # the winning candidate (already blends periodicity, 2D support,
    # structural evidence, regional consensus, and the harmonic penalty
    # -- see ScoringWeights), further reduced when independent
    # sub-region patches disagreed with each other.
    confidence = float(np.clip(final_score * (1.0 - 0.5 * instability_penalty), 0.0, 1.0))

    message = ""
    if len(positions) < MIN_PEAKS_FOR_GOOD_CONFIDENCE:
        message = "Few repeating loops detected; spacing estimate is low-confidence."
    elif uncertain:
        message = uncertain_reason or "Low confidence — competing candidate scored nearly as well; manual verification recommended."
    elif instability_penalty > 0.4:
        message = (
            "Spacing varies noticeably across the selected area (possible perspective "
            "distortion or an uneven surface) — treat with caution."
        )

    return AxisResult(
        spacing_px=round(spacing_px, 3),
        positions_px=positions,
        confidence=round(confidence, 3),
        message=message,
        candidates_px=candidates_px,
        selected_reason=f"{selected_reason} (positions from {position_source})",
        candidate_details=candidate_details,
        status="uncertain" if uncertain else "confident",
        uncertain_reason=uncertain_reason,
    )


def _apply_confidence_floor_uncertainty(axis: AxisResult) -> AxisResult:
    """
    Flag "uncertain" purely from low absolute confidence, independent of
    whichever pipeline produced the result (the v0.3 candidate scorer's
    own top-two-candidates-too-close margin, or the older per-axis
    reconciliation, which has no such margin concept at all). A 9%- or
    18%-confidence number is not a trustworthy measurement regardless of
    *why* confidence came out low, and the UI should never present it as
    if it were -- see UNCERTAIN_CONFIDENCE_THRESHOLD.

    Never downgrades an already-"uncertain" result, and never invents a
    reason where one already exists.
    """
    if axis.status == "uncertain" or axis.spacing_px is None:
        return axis
    if axis.confidence >= UNCERTAIN_CONFIDENCE_THRESHOLD:
        return axis
    return replace(
        axis,
        status="uncertain",
        uncertain_reason=(
            axis.uncertain_reason
            or f"Confidence is low ({axis.confidence * 100:.0f}%) — manual verification recommended."
        ),
    )


def _analyze_axis_v3(
    signal: np.ndarray,
    p0: Optional[float],
    loop_centers: np.ndarray,
    center_axis_index: int,
    band_tolerance_px: float,
    ac2d: np.ndarray,
    lag_dx: bool,
    patch_periods: List[float],
    roi_extent_px: float,
    use_fold_consistency: bool,
    weights: ScoringWeights,
    normalized_2d: Optional[np.ndarray] = None,
) -> AxisResult:
    """
    v0.3 entry point for analyzing one axis (wale or course): generate
    the 0.5x/1x/2x candidate family from the coarse autocorrelation
    estimate, score every candidate against periodicity (1D + 2D),
    structural, and regional-consensus evidence (see _score_candidates),
    and report the winner -- explicitly flagged uncertain when the top
    two candidates scored too close to call (see UNCERTAIN_SCORE_MARGIN).
    """
    if p0 is None:
        return AxisResult(
            spacing_px=None,
            positions_px=[],
            confidence=0.0,
            message="No reliable periodicity detected along this axis.",
        )

    # Computed ONCE here (the expensive, O(N^2)-in-loop-center-count
    # step) and reused for both candidate scoring and position selection
    # below -- see the docstring on _score_candidates.
    center_median: Optional[float] = None
    center_consistency = 0.0
    if loop_centers.shape[0] >= MIN_LOOP_CENTERS_FOR_EVIDENCE:
        center_median, center_consistency = _estimate_pitch_from_centers(
            loop_centers, center_axis_index, band_tolerance_px
        )

    candidate_details, instability = _score_candidates(
        p0, signal, center_median, center_consistency, ac2d, lag_dx,
        patch_periods, roi_extent_px, use_fold_consistency, MIN_PLAUSIBLE_SPACING_PX, weights,
        normalized_2d=normalized_2d,
    )
    # Ranked (and the winner picked) by evidence_score, not final_score --
    # see _score_candidates for why the harmonic penalty must not decide
    # the winner across unrelated candidates. A fallback to final_score
    # keeps this safe for any hand-built CandidateInfo (older tests) that
    # predates the evidence_score field.
    def _rank_key(d: CandidateInfo) -> float:
        if d.evidence_score is not None:
            return d.evidence_score
        return d.final_score if d.final_score is not None else 0.0

    ranked = sorted(candidate_details, key=_rank_key, reverse=True)
    best = ranked[0]
    runner_up = ranked[1] if len(ranked) > 1 else None

    uncertain = runner_up is not None and (_rank_key(best) - _rank_key(runner_up)) < UNCERTAIN_SCORE_MARGIN
    uncertain_reason = None
    if uncertain:
        uncertain_reason = (
            f"Competing {runner_up.harmonic} candidate at {runner_up.period_px:.1f}px scored nearly "
            f"as well ({_rank_key(runner_up):.2f} vs {_rank_key(best):.2f} evidence) as the selected "
            f"{best.period_px:.1f}px ({best.harmonic}) — manual verification recommended."
        )

    p_centers_for_positions = None
    if center_median is not None and center_consistency >= MIN_CENTER_CONSISTENCY:
        p_centers_for_positions = center_median

    reason = (
        f"Selected {best.period_px:.1f}px ({best.harmonic} of raw autocorrelation estimate "
        f"{p0:.1f}px). Evidence score {_rank_key(best):.2f} = autocorrelation {best.autocorr_score:.2f} "
        f"+ 2D support {best.support_2d:.2f} + structural {best.structural_score:.2f} + regional "
        f"consensus {best.patch_consensus:.2f} (weighted); final score after harmonic-ambiguity "
        f"penalty: {best.final_score:.2f}."
    )

    return _finalize_axis_v3(
        best.period_px,
        signal,
        loop_centers,
        center_axis_index,
        p_centers_for_positions,
        [d.period_px for d in candidate_details],
        reason,
        candidate_details,
        best.final_score,
        instability,
        uncertain,
        uncertain_reason,
    )


# --- Experimental: V-shape loop-center lattice detector --------------------
#
# A parallel, INDEPENDENT path -- not called by analyze_gauge /
# _analyze_axis_v3, and does not influence the SINGLE-ROI prediction (the
# /analyze endpoint, analyze_gauge itself) in any way. See
# analyze_loop_lattice_experiment, the only public entry point here.
# Real-photo diagnostics established that the periodicity-based
# detector already generates a candidate close to the true wale repeat,
# but nothing in autocorrelation/2D-support/patch-consensus/phase-
# consistency evidence can distinguish a complete knit-loop column from
# a single yarn leg by GEOMETRY -- they measure repetition and texture
# consistency, not shape. This detector instead looks explicitly for the
# geometric signature of a complete face-knit loop: two diagonal yarn
# legs of opposite orientation converging toward a shared point,
# evaluated at scales seeded by the existing periodicity candidates
# (used as a PRIOR to know what scale to search at, never as the
# answer). Kept experimental/comparison-only everywhere EXCEPT one place:
# the multi-region consensus (analyze_multi_roi, below) DOES let a
# region's counted column spacing from here outrank its own periodicity
# estimate for the WALE axis specifically, once this detector's evidence
# clears a trust threshold -- see the module comment above
# _wale_count_candidate for why, and why wale only. Every other caller
# (the /analyze endpoint's loop_lattice_debug, Developer diagnostics)
# still only ever shows this alongside the real prediction, never inside it.

LOOP_SCALE_HALF_WIDTH_FRACTION = 0.5   # candidate loop "radius" as a fraction of the periodicity candidate period
MIN_LOOP_LATTICE_SEPARATION_FRACTION = 0.6  # min fraction of scale between two accepted loop-center local maxima
LOOP_RESPONSE_PERCENTILE = 70          # keep only local maxima above this percentile of the response map's own values
MIN_LATTICE_POINTS = 4                 # fewer detected centers than this and a spacing estimate isn't trustworthy
MIN_ROW_SUPPORT_FOR_COLUMN = 2         # a candidate wale column needs V-shape evidence from at least this many course rows
COLUMN_CLUSTER_FRACTION = 0.5          # x-position tolerance for "same column", as a fraction of the trial scale
ROW_BAND_HALF_FRACTION = 0.4           # half-height of each course-row search band, as a fraction of course-row spacing


@dataclass
class LoopLatticeResult:
    """
    Output of the experimental V-shape loop-center lattice detector (see
    analyze_loop_lattice_experiment). All positions are in FULL-IMAGE
    pixel coordinates (offset by the ROI origin), matching
    GaugeAnalysisResult.loop_centers_px's convention.

    Course rows are taken as a given structural PRIOR (the existing,
    unmodified course detector's own row positions -- see
    analyze_loop_lattice_experiment) and used to constrain the search:
    V-shape evidence is only looked for in a narrow band around each
    known course row, not the whole ROI indiscriminately. Wale columns
    are then built from X-position consensus ACROSS those rows, not
    from any single row's detections -- a column needs support from at
    least MIN_ROW_SUPPORT_FOR_COLUMN distinct rows to be accepted, so an
    isolated one-off detection can't create a spurious wale.
    """

    # Direct detections: real, individually-measured V-shape evidence.
    direct_centers_px: List[Tuple[float, float]] = field(default_factory=list)
    # Positions where an ACCEPTED column crosses a course row that had no
    # direct detection near it -- the lattice's inference, not raw
    # evidence. Shown as hollow markers so the two are never confused.
    inferred_centers_px: List[Tuple[float, float]] = field(default_factory=list)
    # Full-image X positions (or Y, if wales run horizontally) of every
    # ACCEPTED wale column -- i.e. the teal "column" lines.
    wale_columns_px: List[float] = field(default_factory=list)
    # How many distinct course rows support each entry in wale_columns_px
    # (same order/length) -- a rough per-column confidence signal.
    column_support_counts: List[int] = field(default_factory=list)
    direct_center_count: int = 0
    row_count: int = 0        # course rows used as the structural prior
    column_count: int = 0     # accepted (multi-row-supported) wale columns
    lattice_consistency: float = 0.0   # 0..1, spacing-regularity of the accepted columns
    wale_spacing_px: Optional[float] = None
    course_spacing_px: Optional[float] = None   # echoed from the given course rows, not re-measured here
    scale_used_px: Optional[float] = None   # which periodicity-candidate scale won
    message: str = ""


def _diagonal_gradient_channels(gx: np.ndarray, gy: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Project the signed Sobel gradient onto the two diagonal axes (+45
    degrees and -45 degrees), giving two channels that respond
    preferentially to "/"- and "\\"-oriented local edges respectively --
    exactly the two leg orientations of a face-knit V-shaped loop. Kept
    signed (not squared/magnitude) so a later min() of complementary
    channels can require the pair to actually be evaluated as two
    genuinely different local orientations, not just "any two strong
    edges nearby."
    """
    inv_sqrt2 = 0.7071067811865476
    diag_a = (gx + gy) * inv_sqrt2
    diag_b = (gx - gy) * inv_sqrt2
    return diag_a, diag_b


def _box_mean(channel: np.ndarray, width: int, height: int, side: str) -> np.ndarray:
    """
    Mean of `channel` over a `width` x `height` box positioned to one
    side of each output pixel (not centered on it): side="left" gives,
    at each (x, y), the mean over the box immediately to the LEFT of x;
    side="right" gives the box immediately to the RIGHT. Used to score a
    candidate loop center's two leg regions independently and
    efficiently (one box-filter call per side, rather than a
    per-candidate nested loop over every pixel).
    """
    width = max(1, int(width))
    height = max(1, int(height))
    anchor_x = width - 1 if side == "left" else 0
    anchor_y = height // 2
    return cv2.boxFilter(
        channel, ddepth=-1, ksize=(width, height), anchor=(anchor_x, anchor_y),
        normalize=True, borderType=cv2.BORDER_REPLICATE,
    )


def _v_shape_response_map(gx: np.ndarray, gy: np.ndarray, scale_px: float) -> np.ndarray:
    """
    For every pixel, how strongly does it look like the CENTER of a
    complete V-shaped knit loop at this scale: a leg of one diagonal
    orientation immediately to its left, and a leg of the OPPOSITE
    diagonal orientation immediately to its right (or vice versa -- both
    pairings are tried, since which physical diagonal appears on which
    side isn't assumed/hard-coded).

    `min()` of the two sides' evidence is deliberate (see module
    docstring): a single strong edge on only one side is exactly the
    "one yarn leg, not a complete loop" false positive this is trying to
    avoid -- BOTH sides must show real evidence. Tolerant scoring (no
    exact angle/shape match required) that still requires bilateral
    support, per the "real yarn is fuzzy, twisted, irregular" guidance.
    """
    half = max(2.0, scale_px * LOOP_SCALE_HALF_WIDTH_FRACTION)
    width = max(2, int(round(half)))
    height = max(4, int(round(half * 3)))  # taller than wide: legs span a vertical range, not one row

    diag_a, diag_b = _diagonal_gradient_channels(gx, gy)
    abs_a, abs_b = np.abs(diag_a), np.abs(diag_b)

    left_a = _box_mean(abs_a, width, height, "left")
    left_b = _box_mean(abs_b, width, height, "left")
    right_a = _box_mean(abs_a, width, height, "right")
    right_b = _box_mean(abs_b, width, height, "right")

    pairing_1 = np.minimum(left_a, right_b)  # left leg ~ diag_a, right leg ~ diag_b
    pairing_2 = np.minimum(left_b, right_a)  # left leg ~ diag_b, right leg ~ diag_a
    return np.maximum(pairing_1, pairing_2)


def _local_maxima(response: np.ndarray, min_separation_px: float, percentile: float) -> List[Tuple[float, float]]:
    """
    Non-maximum suppression: keep only pixels that are the strict max
    within a min_separation_px neighborhood AND above the given
    percentile of the response map's own (positive) values -- so a flat
    or uniformly weak map (no real loop evidence anywhere) doesn't
    return an arbitrary grid of "maxima" that aren't actually strong
    evidence of anything.
    """
    positive = response[response > 0]
    if positive.size == 0:
        return []
    threshold = float(np.percentile(positive, percentile))
    if threshold <= 0:
        return []
    size = max(3, int(round(min_separation_px)))
    local_max = maximum_filter(response, size=size, mode="nearest")
    mask = (response == local_max) & (response >= threshold)
    ys, xs = np.nonzero(mask)
    return [(float(px), float(py)) for px, py in zip(xs, ys)]


def _build_row_banded_lattice(
    gx: np.ndarray, gy: np.ndarray, rows_local: List[float], scale_px: float, image_shape: Tuple[int, int]
) -> LoopLatticeResult:
    """
    The core of the row-banded approach: search for V-shape evidence
    only in narrow bands around each given course row (never the whole
    ROI indiscriminately), then build wale columns from X-position
    CONSENSUS across those rows -- a column needs direct support from at
    least MIN_ROW_SUPPORT_FOR_COLUMN distinct rows to be accepted, so
    real but sparse/partial detections (missing loops from shadow, fuzz,
    a weak row) can still support a column without a single stray
    detection anywhere being able to invent one. All positions here are
    in the CALLER's working coordinate frame (not yet offset to the
    full image) -- see analyze_loop_lattice_experiment.
    """
    rows_sorted = sorted(rows_local)
    if len(rows_sorted) >= 2:
        row_pitch = float(np.median(np.diff(rows_sorted)))
    else:
        row_pitch = scale_px * 1.5  # rough fallback: courses are usually a bit finer than wales
    band_half = max(3.0, row_pitch * ROW_BAND_HALF_FRACTION)
    min_sep = max(3.0, scale_px * MIN_LOOP_LATTICE_SEPARATION_FRACTION)

    response = _v_shape_response_map(gx, gy, scale_px)
    h = image_shape[0]

    # (row_index, x, y) for every direct V-shape detection, confined to
    # its own row's band.
    row_points: List[Tuple[int, float, float]] = []
    for ridx, ry in enumerate(rows_sorted):
        lo = max(0, int(round(ry - band_half)))
        hi = min(h, int(round(ry + band_half)))
        if hi <= lo:
            continue
        masked = np.zeros_like(response)
        masked[lo:hi, :] = response[lo:hi, :]
        for px, py in _local_maxima(masked, min_sep, LOOP_RESPONSE_PERCENTILE):
            row_points.append((ridx, px, py))

    direct_centers = [(px, py) for _, px, py in row_points]
    if not row_points:
        return LoopLatticeResult(
            row_count=len(rows_sorted), scale_used_px=round(scale_px, 2),
            message="No V-shape evidence found in any course-row band at this scale.",
        )

    # Cluster x-positions across ALL rows into candidate wale columns.
    col_tolerance = max(3.0, scale_px * COLUMN_CLUSTER_FRACTION)
    by_x = sorted(row_points, key=lambda t: t[1])
    groups: List[List[Tuple[int, float, float]]] = []
    for item in by_x:
        if groups and abs(item[1] - np.mean([g[1] for g in groups[-1]])) <= col_tolerance:
            groups[-1].append(item)
        else:
            groups.append([item])

    wale_columns: List[float] = []
    support_counts: List[int] = []
    accepted_groups: List[List[Tuple[int, float, float]]] = []
    for group in groups:
        distinct_rows = sorted(set(r for r, _, _ in group))
        if len(distinct_rows) >= MIN_ROW_SUPPORT_FOR_COLUMN:
            wale_columns.append(float(np.median([px for _, px, _ in group])))
            support_counts.append(len(distinct_rows))
            accepted_groups.append(group)

    # Inferred markers: an accepted column crossing a row that had no
    # direct detection near it -- the lattice's inference, kept visually
    # distinct (see LoopLatticeResult docstring).
    inferred_centers: List[Tuple[float, float]] = []
    for col_x, group in zip(wale_columns, accepted_groups):
        rows_with_support = set(r for r, _, _ in group)
        for ridx, ry in enumerate(rows_sorted):
            if ridx not in rows_with_support:
                inferred_centers.append((col_x, ry))

    wale_spacing = None
    lattice_consistency = 0.0
    if len(wale_columns) >= 2:
        sorted_cols = sorted(wale_columns)
        # N columns -> N-1 center-to-center intervals, not N -- np.diff
        # already gives exactly that, not "span / N".
        diffs = np.diff(sorted_cols)
        med = float(np.median(diffs)) if diffs.size else 0.0
        if med > 0:
            kept = diffs[(diffs >= med * 0.4) & (diffs <= med * 2.0)]
            if kept.size:
                wale_spacing = round(float(np.median(kept)), 2)
                mad = float(np.median(np.abs(kept - wale_spacing)))
                lattice_consistency = float(np.clip(1.0 - (mad / wale_spacing), 0.0, 1.0)) if wale_spacing > 0 else 0.0

    course_spacing = round(row_pitch, 2) if len(rows_sorted) >= 2 else None

    return LoopLatticeResult(
        direct_centers_px=direct_centers,
        inferred_centers_px=inferred_centers,
        wale_columns_px=wale_columns,
        column_support_counts=support_counts,
        direct_center_count=len(direct_centers),
        row_count=len(rows_sorted),
        column_count=len(wale_columns),
        lattice_consistency=round(lattice_consistency, 3),
        wale_spacing_px=wale_spacing,
        course_spacing_px=course_spacing,
        scale_used_px=round(scale_px, 2),
    )


def analyze_loop_lattice_experiment(
    image_bgr: np.ndarray,
    roi: Tuple[int, int, int, int],
    orientation: Orientation,
    course_rows_px: Optional[List[float]] = None,
) -> LoopLatticeResult:
    """
    Experimental, parallel loop-identification path (see module-level
    comment above): explicit V-shape detection constrained to bands
    around known course rows, then wale columns built from X-position
    consensus ACROSS those rows (see _build_row_banded_lattice) --
    evaluated at multiple scales seeded by the existing periodicity
    detector (used as a scale PRIOR, not the answer; the scale whose
    resulting lattice is most internally consistent wins). Completely
    independent of analyze_gauge's own prediction; callers should treat
    this as diagnostic/comparison information only, never as a
    replacement for it without deliberately deciding to do so.

    `course_rows_px` (FULL-IMAGE pixel coordinates, e.g.
    GaugeAnalysisResult.course.positions_px from a normal analyze_gauge
    call) is the "use the reliable course rows as a structural prior"
    input -- pass the EXISTING, unmodified course detector's own row
    positions here; this function only ever READS them, never adjusts
    or feeds anything back into course detection. If omitted, a coarse
    fallback estimate is computed locally (autocorrelation + peak
    detection on the course signal, the same primitives the main
    detector itself is built from) so this remains callable standalone.
    """
    if image_bgr is None or image_bgr.size == 0:
        return LoopLatticeResult(message="No image data to analyze.")

    img_h, img_w = image_bgr.shape[:2]
    x, y, w, h = roi
    x = max(0, min(int(round(x)), img_w - 1))
    y = max(0, min(int(round(y)), img_h - 1))
    w = max(0, min(int(round(w)), img_w - x))
    h = max(0, min(int(round(h)), img_h - y))
    if w < MIN_ROI_DIM_PX or h < MIN_ROI_DIM_PX:
        return LoopLatticeResult(message="Selected area is too small to analyze.")

    crop = image_bgr[y : y + h, x : x + w]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

    # Work in a canonical frame where wale spacing always varies along
    # the WORKING image's x-axis (columns) and course rows are always
    # stacked along its y-axis (rows) -- transpose once up front when
    # the fabric is rotated 90 degrees, instead of duplicating every
    # piece of row/column logic below for both axis orderings. Every
    # working-frame coordinate gets transposed back at the very end.
    wale_direction, _ = _direction_for(orientation)
    wale_along_x = wale_direction == "horizontal"
    work_gray = gray if wale_along_x else gray.T
    band_offset = y if wale_along_x else x   # ROI offset along the working frame's row (course) axis
    pos_offset = x if wale_along_x else y    # ROI offset along the working frame's column (wale) axis

    # Reuse the SAME restrained preprocessing as the main detector (mild
    # CLAHE + light Gaussian smoothing + signed Sobel) -- no additional
    # or more-aggressive preprocessing that could distort the apparent
    # loop geometry.
    _, gx, gy = _enhance_texture(work_gray)

    # Wale periodicity, computed the same way analyze_gauge computes it
    # for the "horizontal" (standard) case -- used only as a scale
    # PRIOR (see docstring), never as the answer.
    wale_signal = _project(gx, axis=0)
    p0_wale, _ = _autocorrelation_spacing(wale_signal)
    if p0_wale is None:
        return LoopLatticeResult(message="No reliable periodicity to seed a loop-scale search.")

    if course_rows_px:
        rows_local = sorted(v - band_offset for v in course_rows_px)
        rows_local = [r for r in rows_local if 0 <= r < work_gray.shape[0]]
    else:
        # Standalone fallback: the same coarse autocorrelation + peak-
        # detection primitives the main course detector itself starts
        # from (read-only reuse, not a second course "decision").
        course_signal = _project(gy, axis=1)
        p0_course, _ = _autocorrelation_spacing(course_signal)
        rows_local = _detect_peaks(course_signal, p0_course) if p0_course else []

    if len(rows_local) < 2:
        return LoopLatticeResult(message="Not enough course rows available to use as a structural search prior.")

    candidate_scales = [c for c, _ in _labeled_candidates(p0_wale, MIN_PLAUSIBLE_SPACING_PX)]
    if not candidate_scales:
        candidate_scales = [p0_wale]

    best: Optional[LoopLatticeResult] = None
    for scale in candidate_scales:
        lattice = _build_row_banded_lattice(gx, gy, rows_local, scale, work_gray.shape)
        if best is None:
            best = lattice
            continue
        # Prefer a lattice with enough accepted columns to trust a
        # spacing estimate from; among those, the more internally
        # consistent one wins. Never picked by closeness to any
        # expected/ground-truth number -- see PART 16 in the request
        # this implements.
        best_qualifies = best.column_count >= MIN_ROW_SUPPORT_FOR_COLUMN
        candidate_qualifies = lattice.column_count >= MIN_ROW_SUPPORT_FOR_COLUMN
        if candidate_qualifies and not best_qualifies:
            best = lattice
        elif candidate_qualifies == best_qualifies and lattice.lattice_consistency > best.lattice_consistency:
            best = lattice

    if best is None:
        return LoopLatticeResult(message="No loop-center candidates found at any evaluated scale.")

    def _to_full_image(px: float, py: float) -> Tuple[float, float]:
        # (px, py) are working-frame (x, y); transpose back if we
        # transposed on the way in, then add the ROI origin.
        if wale_along_x:
            return px + x, py + y
        return py + x, px + y

    best.direct_centers_px = [_to_full_image(px, py) for px, py in best.direct_centers_px]
    best.inferred_centers_px = [_to_full_image(px, py) for px, py in best.inferred_centers_px]
    # wale_columns_px are single-axis (working-frame x) values -- the
    # corresponding full-image axis is x when wale_along_x, else y.
    best.wale_columns_px = [c + pos_offset for c in best.wale_columns_px]

    if not best.wale_columns_px and not best.message:
        best.message = "No wale columns had support from enough course rows at any evaluated scale."
    return best


# --- Automatic measurement-area (ROI) proposal --------------------------
#
# Stage 1 of the multi-region workflow: BEFORE any gauge analysis runs,
# propose several candidate square regions for the user to review/edit/
# approve (see backend main.py's /propose-rois and the frontend's
# "Review Measurement Areas" step). This function only scores and selects
# candidate regions -- it never runs wale/course detection itself, and it
# has no knowledge of ground-truth values (those stay evaluation-only,
# per the project's established separation).
#
# Deliberately generic: the quality score below has no notion of "ruler"
# or "label" at all. A ruler/label/background region scores low on its
# own merits (usually low periodicity, and often low texture-consistency
# or extreme brightness), not because anything here was told to avoid it.

TARGET_ROI_INCHES = (0.75, 1.0)          # target candidate square side, min/max, in inches
ROI_PROPOSAL_MIN_REGIONS = 2             # below this, prefer relaxing the quality floor over proposing nothing
ROI_PROPOSAL_MAX_REGIONS = 6
ROI_PROPOSAL_STRIDE_FRACTION = 0.5       # candidate grid step, as a fraction of the window size
ROI_PROPOSAL_MAX_OVERLAP_IOU = 0.02      # two accepted candidates may not overlap more than this
ROI_PROPOSAL_MIN_CENTER_SPACING = 1.15   # ...nor have centers closer than this fraction of the window size
ROI_PROPOSAL_MIN_QUALITY = 0.30          # candidates below this are skipped once ROI_PROPOSAL_MIN_REGIONS is met
ROI_PROPOSAL_EDGE_MARGIN_FRACTION = 0.02 # keep candidate windows off the outer image border
ROI_PROPOSAL_LABELS = "ABCDEF"

# Quality-score component weights (sum to 1.0). Periodicity gets the
# largest weight -- "does this patch actually repeat" is the single
# strongest signal that it's genuine knit texture and not background,
# a ruler, or a label.
ROI_QUALITY_WEIGHTS = {
    "sharpness": 0.20,
    "contrast": 0.15,
    "periodicity": 0.30,
    "texture_consistency": 0.20,
    "brightness_score": 0.15,
}


@dataclass(frozen=True)
class ProposedRoi:
    """One automatically-proposed candidate measurement area, in full-image pixel coordinates."""

    x: int
    y: int
    width: int
    height: int
    label: str
    quality_score: float
    sharpness: float
    contrast: float
    periodicity: float
    texture_consistency: float
    brightness_score: float


@dataclass
class RoiProposalResult:
    success: bool
    message: str = ""
    rois: List[ProposedRoi] = field(default_factory=list)
    window_size_px: Optional[int] = None


def _roi_iou(a: dict, b: dict) -> float:
    ax1, ay1, ax2, ay2 = a["x"], a["y"], a["x"] + a["w"], a["y"] + a["h"]
    bx1, by1, bx2, by2 = b["x"], b["y"], b["x"] + b["w"], b["y"] + b["h"]
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    area_a = (ax2 - ax1) * (ay2 - ay1)
    area_b = (bx2 - bx1) * (by2 - by1)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


def _roi_center_distance(a: dict, b: dict) -> float:
    return math.hypot(
        (a["x"] + a["w"] / 2) - (b["x"] + b["w"] / 2),
        (a["y"] + a["h"] / 2) - (b["y"] + b["h"] / 2),
    )


def _too_close_to_selected(cand: dict, selected: List[dict], window_px: float) -> bool:
    for s in selected:
        if _roi_iou(cand, s) > ROI_PROPOSAL_MAX_OVERLAP_IOU:
            return True
        if _roi_center_distance(cand, s) < window_px * ROI_PROPOSAL_MIN_CENTER_SPACING:
            return True
    return False


def _texture_consistency_score(crop_f: np.ndarray, grid: int = 4) -> float:
    """
    How uniform the local contrast is across a coarse grid of sub-blocks.
    Real knit fabric has fairly even texture energy everywhere in a
    representative crop; a region straddling a fold/seam/shadow boundary,
    or a mix of fabric and background, has sub-blocks with wildly
    different local contrast.
    """
    h, w = crop_f.shape[:2]
    if h < grid * 4 or w < grid * 4:
        return 0.5  # too small to subdivide meaningfully -- neutral, not penalized
    block_h = h // grid
    block_w = w // grid
    local_stds = [
        float(crop_f[gy * block_h:(gy + 1) * block_h, gx * block_w:(gx + 1) * block_w].std())
        for gy in range(grid)
        for gx in range(grid)
    ]
    local_stds = np.array(local_stds)
    mean_std = float(local_stds.mean())
    if mean_std < 1e-6:
        return 0.0  # perfectly flat everywhere -- no texture at all, not "consistent" texture
    coefficient_of_variation = float(local_stds.std() / mean_std)
    return float(np.clip(1.0 - coefficient_of_variation, 0.0, 1.0))


def _brightness_score(mean_brightness: float) -> float:
    """1.0 within a comfortable mid-range, falling off toward 0 at black/blown-out."""
    lo, hi = 60.0, 200.0
    if lo <= mean_brightness <= hi:
        return 1.0
    if mean_brightness < lo:
        return float(np.clip(mean_brightness / lo, 0.0, 1.0))
    return float(np.clip((255.0 - mean_brightness) / (255.0 - hi), 0.0, 1.0))


def _roi_quality_score(crop_gray: np.ndarray) -> Tuple[float, dict]:
    """
    Generic image-quality score for an automatically-proposed measurement
    area candidate -- NOT the final gauge-detection confidence (that's
    computed per-approved-ROI, later, by analyze_gauge). Used only to
    rank and select candidate regions before the user ever sees them.
    """
    if crop_gray.size == 0:
        parts = dict(sharpness=0.0, contrast=0.0, periodicity=0.0, texture_consistency=0.0, brightness_score=0.0)
        return 0.0, parts

    crop_f = crop_gray.astype(np.float32)

    # Sharpness: variance of the Laplacian -- low for blur, high for
    # crisp edges. Normalized against a generous ceiling (empirically,
    # very sharp textile close-ups rarely exceed this) so no single
    # outlier crop dominates relative ranking.
    sharpness_raw = float(cv2.Laplacian(crop_gray, cv2.CV_32F).var())
    sharpness = float(np.clip(sharpness_raw / 500.0, 0.0, 1.0))

    # Local contrast: plain std-dev of intensity. Flat background or a
    # blown-out region both score low here.
    contrast = float(np.clip(float(crop_f.std()) / 50.0, 0.0, 1.0))

    texture_consistency = _texture_consistency_score(crop_f)

    # Periodicity strength: reuse the same 1D-autocorrelation primitive
    # the real wale/course detector uses, on both projections of this
    # crop. Genuine knit texture autocorrelates strongly at some lag; a
    # ruler, label, or empty background does not -- this is what lets the
    # scorer avoid those regions without ever being told what they are.
    _, gx, gy = _enhance_texture(crop_gray)
    _, strength_x = _autocorrelation_spacing(_project(gx, axis=0))
    _, strength_y = _autocorrelation_spacing(_project(gy, axis=1))
    periodicity = float(max(strength_x, strength_y))

    brightness_score = _brightness_score(float(crop_f.mean()))

    parts = dict(
        sharpness=sharpness,
        contrast=contrast,
        periodicity=periodicity,
        texture_consistency=texture_consistency,
        brightness_score=brightness_score,
    )
    score = sum(parts[k] * ROI_QUALITY_WEIGHTS[k] for k in ROI_QUALITY_WEIGHTS)
    return float(np.clip(score, 0.0, 1.0)), parts


def propose_measurement_rois(
    image_bgr: np.ndarray,
    pixels_per_mm: float,
    min_regions: int = ROI_PROPOSAL_MIN_REGIONS,
    max_regions: int = ROI_PROPOSAL_MAX_REGIONS,
) -> RoiProposalResult:
    """
    Propose several candidate square measurement areas, sized from the
    calibrated physical scale (~0.75-1.0in per side) and spread across
    the image, for the user to review/edit/approve BEFORE any gauge
    analysis runs.

    Slides a grid of candidate square windows across the image, scores
    each with a generic image-quality heuristic (see _roi_quality_score),
    then greedily selects the highest-scoring candidates subject to a
    spatial-diversity constraint (no two selections may overlap much or
    sit too close together) -- so the result naturally spreads across
    different parts of the fabric rather than clustering.

    Adapts the count to what the image actually supports: aims for
    `max_regions`, never proposes anything scoring below
    ROI_PROPOSAL_MIN_QUALITY once `min_regions` is already met, but will
    relax that floor (rather than propose nothing) if the image can't
    otherwise reach `min_regions` at all.
    """
    if image_bgr is None or image_bgr.size == 0:
        return RoiProposalResult(success=False, message="No image data to propose areas from.")
    if pixels_per_mm is None or pixels_per_mm <= 0:
        return RoiProposalResult(success=False, message="Invalid calibration scale.")

    img_h, img_w = image_bgr.shape[:2]

    mm_per_inch = 25.4
    target_in = sum(TARGET_ROI_INCHES) / 2.0  # ~0.875in midpoint
    window_px = int(round(pixels_per_mm * mm_per_inch * target_in))

    # Never bigger than ~45% of the shorter image dimension (so several
    # non-identical windows can actually fit), never smaller than the
    # real detector's own minimum usable ROI size.
    max_window = int(min(img_w, img_h) * 0.45)
    window_px = max(MIN_ROI_DIM_PX * 2, min(window_px, max_window)) if max_window > 0 else 0

    if window_px < MIN_ROI_DIM_PX or window_px > min(img_w, img_h):
        return RoiProposalResult(
            success=False,
            message="Image is too small relative to the calibrated scale to propose measurement areas.",
        )

    margin = int(round(min(img_w, img_h) * ROI_PROPOSAL_EDGE_MARGIN_FRACTION))
    stride = max(1, int(round(window_px * ROI_PROPOSAL_STRIDE_FRACTION)))

    xs = list(range(margin, max(margin + 1, img_w - window_px - margin + 1), stride))
    ys = list(range(margin, max(margin + 1, img_h - window_px - margin + 1), stride))
    if not xs:
        xs = [max(0, (img_w - window_px) // 2)]
    if not ys:
        ys = [max(0, (img_h - window_px) // 2)]

    gray_full = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

    candidates: List[dict] = []
    for cy in ys:
        for cx in xs:
            crop_gray = gray_full[cy:cy + window_px, cx:cx + window_px]
            score, parts = _roi_quality_score(crop_gray)
            candidates.append({"x": cx, "y": cy, "w": window_px, "h": window_px, "score": score, **parts})

    if not candidates:
        return RoiProposalResult(success=False, message="Could not evaluate any candidate measurement areas.")

    candidates.sort(key=lambda c: c["score"], reverse=True)

    selected: List[dict] = []
    for cand in candidates:
        if len(selected) >= max_regions:
            break
        if cand["score"] < ROI_PROPOSAL_MIN_QUALITY and len(selected) >= min_regions:
            break
        if _too_close_to_selected(cand, selected, window_px):
            continue
        selected.append(cand)

    # Didn't reach min_regions honoring the quality floor -- relax it and
    # backfill with the next-best, still-spread-out candidates rather
    # than proposing fewer than min_regions usable areas outright. Spatial
    # diversity is still enforced; only the quality floor is relaxed.
    if len(selected) < min_regions:
        already = {id(c) for c in selected}
        for cand in candidates:
            if len(selected) >= min_regions:
                break
            if id(cand) in already:
                continue
            if _too_close_to_selected(cand, selected, window_px):
                continue
            selected.append(cand)

    if not selected:
        return RoiProposalResult(
            success=False,
            message="No suitable measurement areas were found in this image.",
            window_size_px=window_px,
        )

    rois = [
        ProposedRoi(
            x=c["x"], y=c["y"], width=c["w"], height=c["h"],
            label=ROI_PROPOSAL_LABELS[i] if i < len(ROI_PROPOSAL_LABELS) else str(i + 1),
            quality_score=round(c["score"], 4),
            sharpness=round(c["sharpness"], 4),
            contrast=round(c["contrast"], 4),
            periodicity=round(c["periodicity"], 4),
            texture_consistency=round(c["texture_consistency"], 4),
            brightness_score=round(c["brightness_score"], 4),
        )
        for i, c in enumerate(selected)
    ]
    return RoiProposalResult(
        success=True,
        message=f"Proposed {len(rois)} measurement area(s).",
        rois=rois,
        window_size_px=window_px,
    )


# --- Multi-ROI independent analysis + cross-region consensus ------------
#
# Stage 2 of the multi-region workflow (see propose_measurement_rois above
# for Stage 1). Every APPROVED region is analyzed completely independently
# -- analyze_gauge() is called once per region, on that region's own
# pixels only, exactly as it always has been for a single ROI. Nothing
# here combines ROI pixels or lets one region's result influence another
# region's own detection; the only place results interact is the
# consensus step below, which runs strictly AFTER every region already
# has its own independent measurement.
#
# The final wale/course numbers are a robust, confidence-weighted median
# of the regions that agree with each other -- never a plain mean, and an
# excluded outlier's own raw measurement is never overwritten to match
# the consensus (see RoiMeasurement.wale/course, which always carries
# that region's own untouched analyze_gauge() result).

CONSENSUS_INLIER_LOG_TOLERANCE = 0.22    # ~1.25x: candidates within this log-ratio of the median agree with it
CONSENSUS_HARMONIC_LOG_TOLERANCE = 0.25  # log-ratio tolerance for recognizing a candidate as ~2x/0.5x of the median
CONSENSUS_SINGLE_REGION_FACTOR = 0.85    # confidence multiplier when only one region has a usable measurement
CONSENSUS_TIGHT_SPREAD_LOG = 0.06        # relative (log) inlier spread below which agreement counts as "tight"
CONSENSUS_LOOSE_SPREAD_LOG = 0.16        # ...below which agreement still counts for something


# --- Wale measurement: prefer counted loop columns over a raw period ----
#
# Per real-photo evidence (see the README's "Multi-region measurement"
# section): wale is the axis that keeps getting fooled by harmonic
# ambiguity in a short autocorrelation window, while the experimental
# loop-lattice detector's ACCEPTED columns -- built from real, individually
# -verified V-shape detections requiring multi-row support, not a period
# guess -- don't share that specific failure mode, because counting
# discrete, located stitches has no "is it the fundamental repeat or its
# harmonic" question to get wrong in the first place. Course keeps using
# the periodicity detector's own row positions unchanged (it hasn't shown
# this project's history of harmonic-doubling, and the loop-lattice
# detector treats course rows as a given prior, not something it
# independently counts -- see LoopLatticeResult's docstring).
#
# This is the ONE place in the whole codebase where the loop-lattice
# detector is allowed to influence a real, reported measurement -- and
# only here, only for wale, only inside the multi-region consensus. Every
# other use of analyze_loop_lattice_experiment (the single-ROI /analyze
# endpoint's loop_lattice_debug, Developer diagnostics) remains exactly
# what it always was: a parallel, comparison-only diagnostic that never
# touches analyze_gauge's own result.
WALE_COUNT_MIN_COLUMNS = 2         # need >=2 accepted columns for even one real interval
WALE_COUNT_MIN_CONFIDENCE = 0.30   # below this, the count isn't trustworthy enough to prefer over periodicity


def _wale_count_confidence(lattice: "LoopLatticeResult") -> float:
    """
    How much to trust a region's COUNTED wale spacing (median interval
    between accepted, position-verified columns) -- half from how regular
    those intervals are (lattice_consistency), half from how well-
    supported the columns themselves are (average fraction of course rows
    that directly confirmed each accepted column, out of every row
    searched). Both matter: consistent-but-thin evidence and well-
    supported-but-irregular spacing are each less trustworthy than both
    together.
    """
    if lattice.column_count < WALE_COUNT_MIN_COLUMNS or not lattice.wale_spacing_px:
        return 0.0
    if lattice.row_count > 0 and lattice.column_support_counts:
        support_ratio = (sum(lattice.column_support_counts) / len(lattice.column_support_counts)) / lattice.row_count
    else:
        support_ratio = 0.0
    return float(np.clip(0.5 * lattice.lattice_consistency + 0.5 * support_ratio, 0.0, 1.0))


def _wale_count_candidate(lattice: Optional["LoopLatticeResult"]) -> Tuple[Optional[float], float]:
    """
    Returns (spacing_px, count_confidence) from counted loop columns, or
    (None, 0.0) if this region's loop-lattice result isn't trustworthy
    enough to prefer over its own periodicity-based estimate.
    """
    if lattice is None:
        return None, 0.0
    confidence = _wale_count_confidence(lattice)
    if confidence < WALE_COUNT_MIN_CONFIDENCE:
        return None, 0.0
    return lattice.wale_spacing_px, confidence


@dataclass
class OutlierInfo:
    """
    One region's measurement that was excluded from an axis's consensus.
    Its own raw spacing_px is preserved here exactly as analyze_gauge()
    measured it -- outlier classification never rewrites a region's own
    result, only whether that result counts toward the combined value.
    """

    label: str
    spacing_px: float
    ratio_to_consensus: float
    reason: str


@dataclass
class AxisConsensusResult:
    """
    Cross-region consensus for one axis (wale or course), built from every
    approved region's own independent AxisResult for that axis. See
    _consensus_for_axis for the algorithm.
    """

    spacing_px: Optional[float]
    confidence: float
    status: str = "confident"  # "confident" | "uncertain"
    uncertain_reason: Optional[str] = None
    message: str = ""
    included_labels: List[str] = field(default_factory=list)
    excluded_labels: List[str] = field(default_factory=list)
    outliers: List[OutlierInfo] = field(default_factory=list)
    regional_median_px: Optional[float] = None
    regional_spread_px: Optional[float] = None


@dataclass
class RoiMeasurement:
    """One approved region's own, fully independent analysis result."""

    label: str
    x: int
    y: int
    width: int
    height: int
    source: str  # "auto" | "manual"
    success: bool
    message: str
    wale: AxisResult
    course: AxisResult
    quality_score: float
    quality_parts: dict
    loop_centers_px: List[Tuple[float, float]] = field(default_factory=list)
    rotation_deg: float = 0.0
    loop_lattice: Optional["LoopLatticeResult"] = None
    # Which evidence the WALE consensus candidate below actually came
    # from: "loop_count" when this region's own loop-lattice detector
    # found enough well-supported columns to COUNT a spacing directly
    # (median interval between real, position-verified stitch columns);
    # "periodicity" when it fell back to the autocorrelation-based
    # estimate (analyze_gauge's own wale.spacing_px) because loop-lattice
    # didn't produce a trustworthy result for this region. See
    # _wale_count_candidate.
    wale_source: str = "periodicity"
    wale_count_confidence: float = 0.0


@dataclass
class MultiRoiAnalysisResult:
    success: bool
    message: str
    per_roi: List[RoiMeasurement] = field(default_factory=list)
    wale: AxisResult = field(default_factory=lambda: AxisResult(spacing_px=None, positions_px=[], confidence=0.0))
    course: AxisResult = field(default_factory=lambda: AxisResult(spacing_px=None, positions_px=[], confidence=0.0))
    wale_consensus: Optional[AxisConsensusResult] = None
    course_consensus: Optional[AxisConsensusResult] = None
    primary_label: Optional[str] = None
    primary_roi_px: Optional[Tuple[int, int, int, int]] = None


def _weighted_median(values: List[float], weights: List[float]) -> float:
    """
    The value at which cumulative weight first reaches half the total --
    a robust central tendency that lets a region's own confidence and ROI
    quality matter WITHOUT ever averaging measurements together the way a
    plain mean would (a strong, confident region among weak/noisy ones
    still can't be outvoted by sheer count, but also doesn't get its exact
    value silently blended with anyone else's).
    """
    pairs = sorted(zip(values, weights), key=lambda p: p[0])
    total = sum(w for _, w in pairs)
    if total <= 0:
        vals = sorted(values)
        n = len(vals)
        mid = n // 2
        return vals[mid] if n % 2 else (vals[mid - 1] + vals[mid]) / 2.0
    cum = 0.0
    for v, w in pairs:
        cum += w
        if cum >= total / 2.0:
            return v
    return pairs[-1][0]


def _consensus_for_axis(candidates: List[dict], axis_label: str) -> AxisConsensusResult:
    """
    Robust cross-region consensus for one axis, from independently
    measured per-region candidates: [{"label","spacing_px","confidence",
    "quality_score"}, ...] (regions with no usable measurement for this
    axis are simply not included in `candidates`).

    Never a plain mean, per PART 9 of the request this implements: a
    coarse median first separates likely inliers from outliers (values
    more than CONSENSUS_INLIER_LOG_TOLERANCE off in log-space), then the
    FINAL value is a confidence/quality-weighted median of the inliers
    only. An outlier close to 2x or 0.5x the median is annotated as
    "consistent with a harmonic" in its reason -- corroborating evidence
    for a human reading the diagnostics, never the reason it was excluded
    in the first place (the tolerance check already excluded it).
    """
    if not candidates:
        return AxisConsensusResult(
            spacing_px=None, confidence=0.0,
            message=f"No region produced a usable {axis_label} measurement.",
        )

    values = [c["spacing_px"] for c in candidates]
    labels = [c["label"] for c in candidates]

    if len(candidates) == 1:
        c = candidates[0]
        return AxisConsensusResult(
            spacing_px=c["spacing_px"],
            confidence=round(c["confidence"] * CONSENSUS_SINGLE_REGION_FACTOR, 4),
            message=(
                f"Only region {c['label']} produced a usable {axis_label} measurement -- "
                "cross-region validation unavailable."
            ),
            included_labels=[c["label"]],
            regional_median_px=c["spacing_px"],
            regional_spread_px=0.0,
        )

    sorted_vals = sorted(values)
    n = len(sorted_vals)
    mid = n // 2
    initial_median = sorted_vals[mid] if n % 2 else (sorted_vals[mid - 1] + sorted_vals[mid]) / 2.0

    inliers: List[dict] = []
    outliers: List[OutlierInfo] = []
    for c in candidates:
        ratio = c["spacing_px"] / initial_median if initial_median > 0 else 1.0
        log_ratio = abs(math.log(ratio)) if ratio > 0 else float("inf")
        if log_ratio <= CONSENSUS_INLIER_LOG_TOLERANCE:
            inliers.append(c)
            continue
        if abs(math.log(ratio / 2.0)) <= CONSENSUS_HARMONIC_LOG_TOLERANCE:
            reason = (
                f"~2x the regional consensus ({initial_median:.1f}px) -- "
                "consistent with a half-loop/sub-feature harmonic, not forced to match it."
            )
        elif abs(math.log(ratio * 2.0)) <= CONSENSUS_HARMONIC_LOG_TOLERANCE:
            reason = (
                f"~0.5x the regional consensus ({initial_median:.1f}px) -- "
                "consistent with a doubled-repeat harmonic, not forced to match it."
            )
        else:
            reason = f"deviates from the regional consensus ({initial_median:.1f}px) with no clean harmonic relationship."
        outliers.append(OutlierInfo(
            label=c["label"], spacing_px=c["spacing_px"],
            ratio_to_consensus=round(ratio, 3), reason=reason,
        ))

    if not inliers:
        # Every region disagreed with every other -- no dominant cluster
        # at all. Rather than silently pick one, use the confidence-
        # weighted median of everything (still never a plain mean) and
        # mark the axis uncertain so the UI never claims a settled
        # agreement that doesn't exist.
        weights = [max(c["confidence"] * c["quality_score"], 1e-6) for c in candidates]
        return AxisConsensusResult(
            spacing_px=_weighted_median(values, weights),
            confidence=round(min(c["confidence"] for c in candidates) * 0.5, 4),
            status="uncertain",
            uncertain_reason=(
                f"No dominant cluster among {len(candidates)} regions for {axis_label} -- "
                "values disagreed too much to call."
            ),
            message=(
                f"No dominant regional consensus for {axis_label}; used the confidence-weighted "
                f"median of all {len(candidates)} regions."
            ),
            included_labels=labels,
            regional_median_px=initial_median,
            regional_spread_px=(sorted_vals[-1] - sorted_vals[0]) / 2.0,
        )

    inlier_values = [c["spacing_px"] for c in inliers]
    inlier_weights = [max(c["confidence"] * c["quality_score"], 1e-6) for c in inliers]
    final_value = _weighted_median(inlier_values, inlier_weights)

    inlier_sorted = sorted(inlier_values)
    spread = (inlier_sorted[-1] - inlier_sorted[0]) / 2.0
    relative_spread_log = abs(math.log(inlier_sorted[-1] / inlier_sorted[0])) if inlier_sorted[0] > 0 else 0.0

    base_confidence = sum(c["confidence"] * w for c, w in zip(inliers, inlier_weights)) / sum(inlier_weights)

    # Regional-agreement adjustment: tight, multi-region agreement can
    # only pull confidence UP TOWARD what the inliers already claim for
    # themselves (agreement_factor never exceeds 1.0) -- corroborating an
    # axis's own confidence, never manufacturing confidence no individual
    # region actually earned. Looser agreement, or too few inliers, pulls
    # it down instead.
    if len(inliers) >= 3 and relative_spread_log <= CONSENSUS_TIGHT_SPREAD_LOG:
        agreement_factor = 1.0
    elif len(inliers) >= 2 and relative_spread_log <= CONSENSUS_LOOSE_SPREAD_LOG:
        agreement_factor = 0.9
    elif len(inliers) >= 2:
        agreement_factor = 0.75
    else:
        agreement_factor = CONSENSUS_SINGLE_REGION_FACTOR

    confidence = round(base_confidence * agreement_factor, 4)

    status = "confident"
    uncertain_reason = None
    if outliers and len(inliers) < 2:
        status = "uncertain"
        uncertain_reason = f"Only {len(inliers)} region(s) agreed for {axis_label}; {len(outliers)} excluded as outlier(s)."
    elif relative_spread_log > CONSENSUS_LOOSE_SPREAD_LOG:
        status = "uncertain"
        uncertain_reason = f"Regions that agreed for {axis_label} still spread more than expected."

    included_labels = [c["label"] for c in inliers]
    excluded_labels = [o.label for o in outliers]
    message = (
        f"{axis_label.capitalize()} consensus from {len(inliers)} of {len(candidates)} region(s)"
        + (f"; excluded {', '.join(excluded_labels)} as outlier(s)." if excluded_labels else ".")
    )

    return AxisConsensusResult(
        spacing_px=final_value,
        confidence=confidence,
        status=status,
        uncertain_reason=uncertain_reason,
        message=message,
        included_labels=included_labels,
        excluded_labels=excluded_labels,
        outliers=outliers,
        regional_median_px=initial_median,
        regional_spread_px=spread,
    )


def analyze_multi_roi(
    image_bgr: np.ndarray,
    rois: List[dict],
    orientation: Orientation,
    structure: Structure = "unknown",
) -> MultiRoiAnalysisResult:
    """
    Analyze every approved measurement area COMPLETELY INDEPENDENTLY (each
    is just a separate analyze_gauge() call on that region's own pixels --
    no ROI's result can influence another's own detection), then combine
    the independent results into one robust, confidence-weighted-median
    consensus per axis (see _consensus_for_axis). Mirrors PARTS 8/9/10/17
    of the request this implements: independent-first, consensus-second,
    never circular.

    `rois`: [{"label","x","y","width","height","source"}, ...], in
    full-image pixel coordinates, exactly as approved on the "Review
    Measurement Areas" step (both auto-proposed and manually-added areas
    are treated identically here -- this function doesn't know or care
    which is which beyond echoing `source` back in diagnostics).

    Adapts to whatever the input supports: with a single region, this
    degenerates to that region's own result with a reduced confidence
    (cross-region validation isn't possible); with 2+, outliers are
    identified but their own raw measurement is preserved unchanged in
    per_roi, never rewritten to match the consensus.
    """
    if image_bgr is None or image_bgr.size == 0:
        return MultiRoiAnalysisResult(success=False, message="No image data to analyze.")
    if not rois:
        return MultiRoiAnalysisResult(success=False, message="No measurement areas were approved.")

    img_h, img_w = image_bgr.shape[:2]
    gray_full = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

    per_roi: List[RoiMeasurement] = []
    for spec in rois:
        x = max(0, min(int(round(spec["x"])), max(img_w - 1, 0)))
        y = max(0, min(int(round(spec["y"])), max(img_h - 1, 0)))
        w = max(0, min(int(round(spec["width"])), img_w - x))
        h = max(0, min(int(round(spec["height"])), img_h - y))
        roi_tuple = (x, y, w, h)

        # Independent analysis: the SAME single-ROI detector used before
        # multi-region review existed, called once per region, never
        # given any other region's pixels or results.
        result = analyze_gauge(image_bgr=image_bgr, roi=roi_tuple, orientation=orientation, structure=structure)

        quality_score, quality_parts = 0.0, {}
        if w > 0 and h > 0:
            quality_score, quality_parts = _roi_quality_score(gray_full[y:y + h, x:x + w])

        # A parallel, independent detector -- see analyze_loop_lattice_
        # experiment's own docstring for the search architecture. A
        # failure here must never break this region's real result; see
        # the module comment above _wale_count_candidate for the ONE
        # place this is now allowed to feed into a real measurement
        # (wale, only inside this multi-region consensus).
        loop_lattice = None
        try:
            loop_lattice = analyze_loop_lattice_experiment(
                image_bgr, roi=roi_tuple, orientation=orientation,
                course_rows_px=result.course.positions_px or None,
            )
        except Exception:
            loop_lattice = None

        count_spacing, count_confidence = _wale_count_candidate(loop_lattice)
        wale_source = "loop_count" if count_spacing is not None else "periodicity"

        per_roi.append(RoiMeasurement(
            label=spec["label"], x=x, y=y, width=w, height=h,
            source=spec.get("source", "auto"),
            success=result.success, message=result.message,
            wale=result.wale, course=result.course,
            quality_score=quality_score, quality_parts=quality_parts,
            loop_centers_px=result.loop_centers_px,
            rotation_deg=result.rotation_deg, loop_lattice=loop_lattice,
            wale_source=wale_source, wale_count_confidence=count_confidence,
        ))

    def wale_candidates() -> List[dict]:
        # Prefer each region's COUNTED spacing (median interval between
        # real, position-verified loop columns) over its periodicity
        # estimate whenever the count is trustworthy enough -- see the
        # module comment above _wale_count_candidate for why wale
        # specifically. Falls back to periodicity when loop-lattice
        # didn't produce a trustworthy result for that region, so a
        # region is never dropped just because the experimental detector
        # came up empty on it.
        out = []
        for m in per_roi:
            if m.wale_source == "loop_count":
                spacing_px = m.loop_lattice.wale_spacing_px
                confidence = m.wale_count_confidence
            else:
                spacing_px = m.wale.spacing_px
                confidence = m.wale.confidence
            if spacing_px is None:
                continue
            out.append({
                "label": m.label, "spacing_px": spacing_px,
                "confidence": confidence, "quality_score": max(m.quality_score, 0.05),
            })
        return out

    def course_candidates() -> List[dict]:
        out = []
        for m in per_roi:
            if m.course.spacing_px is None:
                continue
            # A floor on quality weight so a region with a near-zero
            # quality score can't be given literally zero say -- it was
            # still approved by the user, who may know something the
            # generic quality heuristic doesn't (see PART 20: a
            # knowledgeable user can always add/keep an area they trust).
            out.append({
                "label": m.label, "spacing_px": m.course.spacing_px,
                "confidence": m.course.confidence, "quality_score": max(m.quality_score, 0.05),
            })
        return out

    wale_consensus = _consensus_for_axis(wale_candidates(), "wale")
    course_consensus = _consensus_for_axis(course_candidates(), "course")

    # Primary region for the overlay/analyzed-area: prefer whichever
    # (in approval order) region is accepted into the MOST axes' consensus
    # -- both, if any region qualifies for both; otherwise just one axis
    # rather than falling all the way back to an unconditional "first
    # region" that could easily BE an outlier on every axis (e.g. when
    # wale's and course's inlier sets don't overlap at all, which is a
    # real, observed case -- a region excluded from both axes must never
    # become the primary/overlay region while any better-agreeing region
    # exists). Only when literally no region has a successful measurement
    # on ANY axis does this fall back to the first approved region, since
    # there's no better alternative left.
    def _included_axis_count(m: RoiMeasurement) -> int:
        return (m.label in wale_consensus.included_labels) + (m.label in course_consensus.included_labels)

    primary: Optional[RoiMeasurement] = None
    for target_count in (2, 1):
        for m in per_roi:
            if _included_axis_count(m) == target_count:
                primary = m
                break
        if primary is not None:
            break
    if primary is None:
        for m in per_roi:
            if m.wale.spacing_px is not None or m.course.spacing_px is not None:
                primary = m
                break
    if primary is None:
        primary = per_roi[0]

    # The final wale/course AxisResult keeps the PRIMARY region's own
    # positions_px (so the results overlay draws real, specific detected
    # positions rather than nothing) but its spacing/confidence/status
    # come from the cross-region CONSENSUS, not that one region's own
    # number -- exactly PART 12's "final gauge from consensus."
    final_wale = replace(
        primary.wale,
        spacing_px=wale_consensus.spacing_px,
        confidence=wale_consensus.confidence,
        message=wale_consensus.message,
        selected_reason=wale_consensus.message,
        status=wale_consensus.status,
        uncertain_reason=wale_consensus.uncertain_reason,
    )
    final_course = replace(
        primary.course,
        spacing_px=course_consensus.spacing_px,
        confidence=course_consensus.confidence,
        message=course_consensus.message,
        selected_reason=course_consensus.message,
        status=course_consensus.status,
        uncertain_reason=course_consensus.uncertain_reason,
    )

    any_axis_ok = wale_consensus.spacing_px is not None or course_consensus.spacing_px is not None
    message = (
        f"Analyzed {len(per_roi)} measurement area(s): "
        f"wale consensus from {len(wale_consensus.included_labels)}, "
        f"course consensus from {len(course_consensus.included_labels)}."
        if any_axis_ok else "No region produced a usable measurement."
    )

    return MultiRoiAnalysisResult(
        success=any_axis_ok,
        message=message,
        per_roi=per_roi,
        wale=final_wale,
        course=final_course,
        wale_consensus=wale_consensus,
        course_consensus=course_consensus,
        primary_label=primary.label,
        primary_roi_px=(primary.x, primary.y, primary.width, primary.height),
    )
