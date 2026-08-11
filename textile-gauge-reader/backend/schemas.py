"""Pydantic request/response models for the API layer."""
from __future__ import annotations

from typing import List, Literal, Optional, Tuple

from pydantic import BaseModel, Field

Unit = Literal["mm", "cm", "in"]
Orientation = Literal["vertical", "horizontal"]
Structure = Literal["jersey", "unknown"]

UNIT_TO_MM = {"mm": 1.0, "cm": 10.0, "in": 25.4}
MM_PER_INCH = 25.4


class RoiOut(BaseModel):
    x: float
    y: float
    width: float
    height: float


class AreaMm(BaseModel):
    width_mm: float
    height_mm: float


class ProposedRoiOut(BaseModel):
    """
    One automatically-proposed candidate measurement area (Stage 1 of the
    multi-region workflow — see analysis.gauge_analysis.propose_measurement_
    rois). Full-image pixel coordinates. quality_score and its components
    are a generic image-quality heuristic used only to select/rank
    candidates — NOT the final gauge-detection confidence, which is
    computed per-approved-ROI later.
    """

    x: float
    y: float
    width: float
    height: float
    label: str
    quality_score: float
    sharpness: float
    contrast: float
    periodicity: float
    texture_consistency: float
    brightness_score: float
    periodicity_consistency: float = 0.5


class ProposeRoisResponse(BaseModel):
    success: bool
    message: str = ""
    rois: List[ProposedRoiOut] = Field(default_factory=list)
    window_size_px: Optional[int] = None
    pixels_per_mm: Optional[float] = None


class CandidateOut(BaseModel):
    """
    One harmonic period candidate considered for an axis, with the
    v0.3 scoring breakdown used to judge it -- lets a human (or a future
    tuning pass) see *why* a period was picked, not just what was
    picked. See ScoringWeights in analysis/gauge_analysis.py for how
    these combine into final_score.
    """

    period_px: float
    per_inch: Optional[float] = None  # same period, converted with this request's calibration
    harmonic: str  # "0.5x" / "1x" / "2x" relative to the raw autocorrelation estimate
    fold_consistency: Optional[float] = None  # V-leg structural score; None where not computed (course axis)
    autocorr_score: Optional[float] = None  # 1D autocorrelation strength at this exact lag
    support_2d: Optional[float] = None  # 2D autocorrelation support at this lag
    structural_score: Optional[float] = None  # combined fold-consistency + loop-center pitch agreement
    patch_consensus: Optional[float] = None  # agreement with independent overlapping sub-region estimates
    harmonic_penalty: Optional[float] = None  # ambiguity vs. a 0.5x/2x relative that scored similarly
    phase_consistency: Optional[float] = None  # do repeat markers land on the same local visual feature each time?
    alternating_phase_score: Optional[float] = None  # "A B A B" signature of a half-period harmonic; penalizes evidence_score
    evidence_score: Optional[float] = None  # weighted evidence composite BEFORE the harmonic penalty -- decides `selected`
    final_score: Optional[float] = None  # evidence_score minus the harmonic penalty (confidence-facing, not selection)
    selected: bool = False


class AxisOut(BaseModel):
    spacing_px: Optional[float] = None
    spacing_mm: Optional[float] = None
    per_inch: Optional[float] = None
    positions_px: List[float] = Field(default_factory=list)
    confidence: float = 0.0
    message: str = ""
    # Detection-details diagnostics: every harmonic period candidate
    # considered (typically 0.5x/1x/2x of the coarse autocorrelation
    # estimate) and a human-readable explanation of which one was picked
    # and why — e.g. confirmed against loop-center evidence, corrected up
    # from a leg/sub-loop harmonic, or fell back with no independent
    # validation available. Lets a human confirm the detector locked onto
    # the true loop-to-loop repeat rather than a sub-feature.
    candidates_px: List[float] = Field(default_factory=list)
    selected_reason: str = ""
    candidate_details: List[CandidateOut] = Field(default_factory=list)
    # "confident" or "uncertain" -- set when the top two scored
    # candidates were too close to call. spacing_px is still the best
    # estimate even when uncertain; the UI visually flags it rather than
    # hiding it (see uncertain_reason).
    status: str = "confident"
    uncertain_reason: Optional[str] = None


class LoopLatticeDebugOut(BaseModel):
    """
    Output of the EXPERIMENTAL, parallel V-shape loop-center lattice
    detector (see analysis.gauge_analysis.analyze_loop_lattice_experiment).
    Development/comparison information, not something a normal user needs
    to see -- the frontend only renders this in its developer-diagnostics
    mode. Never influences `wale`/`course` on the single-ROI /analyze
    response above; on /analyze-multi, this SAME per-region detection may
    also be what wale's cross-region consensus candidate came from for
    that region (see RoiMeasurementOut.wale_source) -- the field here is
    still just an echo of the detector's own output either way, not the
    thing doing the influencing.
    """

    # Direct V-shape detections vs. the lattice's own inferred/missing
    # positions -- kept as two separate lists (rather than one flagged
    # list) so the frontend can render them with genuinely different
    # markers (solid vs. hollow) without any per-point lookup.
    direct_centers_px: List[Tuple[float, float]] = Field(default_factory=list)
    inferred_centers_px: List[Tuple[float, float]] = Field(default_factory=list)
    wale_columns_px: List[float] = Field(default_factory=list)
    column_support_counts: List[int] = Field(default_factory=list)
    direct_center_count: int = 0
    row_count: int = 0
    column_count: int = 0
    lattice_consistency: float = 0.0
    wale_spacing_px: Optional[float] = None
    course_spacing_px: Optional[float] = None
    wale_per_inch: Optional[float] = None
    course_per_inch: Optional[float] = None
    scale_used_px: Optional[float] = None
    message: str = ""


class OutlierOut(BaseModel):
    """
    One region's measurement excluded from an axis's cross-region
    consensus. spacing_px/per_inch is that region's own RAW result,
    unchanged -- it is never rewritten to match the consensus value.
    """

    label: str
    spacing_px: float
    per_inch: Optional[float] = None
    ratio_to_consensus: float
    reason: str


class AxisConsensusOut(BaseModel):
    """
    Cross-region consensus diagnostics for one axis (wale or course) --
    which regions agreed, which were excluded and why, and how spread out
    the agreeing regions were. See analysis.gauge_analysis._consensus_for_
    axis. Development/"Measurement consistency" information only; the
    authoritative wale/course numbers are still AnalyzeResponse.wale/course.
    """

    included_labels: List[str] = Field(default_factory=list)
    excluded_labels: List[str] = Field(default_factory=list)
    outliers: List[OutlierOut] = Field(default_factory=list)
    regional_median_px: Optional[float] = None
    regional_median_per_inch: Optional[float] = None
    regional_spread_px: Optional[float] = None
    message: str = ""


class RoiMeasurementOut(BaseModel):
    """One approved measurement area's own, fully independent analysis."""

    label: str
    x: float
    y: float
    width: float
    height: float
    source: str  # "auto" | "manual"
    success: bool
    message: str
    wale: AxisOut = Field(default_factory=AxisOut)
    course: AxisOut = Field(default_factory=AxisOut)
    # Generic image-quality score (sharpness/contrast/texture-consistency/
    # periodicity/brightness) -- the SAME heuristic used to propose
    # candidates in Stage 1, reused here on the region's final approved
    # bounds. Distinct from wale.confidence/course.confidence, which are
    # this detector's confidence in its own measurement.
    quality_score: float = 0.0
    sharpness: Optional[float] = None
    contrast: Optional[float] = None
    periodicity: Optional[float] = None
    texture_consistency: Optional[float] = None
    brightness_score: Optional[float] = None
    periodicity_consistency: Optional[float] = None
    rotation_deg: float = 0.0
    loop_lattice_debug: Optional[LoopLatticeDebugOut] = None
    # Which evidence this region's WALE consensus candidate actually came
    # from -- "loop_count" when the loop-lattice detector found enough
    # well-supported columns to COUNT a spacing directly (median interval
    # between real, position-verified stitch columns), "periodicity" when
    # it fell back to wale.spacing_px above. See analysis.gauge_analysis's
    # module comment above _wale_count_candidate for why wale specifically.
    wale_source: str = "periodicity"
    wale_count_confidence: float = 0.0


class MultiRoiDebugOut(BaseModel):
    """
    Full multi-region diagnostics: every approved area's own independent
    result, plus the cross-region consensus that produced the top-level
    wale/course. Kept out of the normal Results view (see the frontend's
    small "Measurement consistency" summary and Developer diagnostics'
    per-region selector) -- this is the complete picture behind them.
    """

    per_roi: List[RoiMeasurementOut] = Field(default_factory=list)
    wale_consensus: AxisConsensusOut = Field(default_factory=AxisConsensusOut)
    course_consensus: AxisConsensusOut = Field(default_factory=AxisConsensusOut)
    primary_label: Optional[str] = None


class AnalyzeResponse(BaseModel):
    success: bool
    message: str
    pixels_per_mm: Optional[float] = None
    roi: Optional[RoiOut] = None
    analyzed_area_px: Optional[RoiOut] = None
    analyzed_area_mm: Optional[AreaMm] = None
    orientation: Optional[Orientation] = None
    structure: Optional[str] = None
    wale: AxisOut = Field(default_factory=AxisOut)
    course: AxisOut = Field(default_factory=AxisOut)
    algorithm_version: Optional[str] = None
    # Approximate 2D knit-loop-center points (full-image pixel
    # coordinates) for the optional "show loop centers" diagnostic
    # overlay — lets a human visually confirm what the detector is
    # treating as one complete loop, not just trust the final numbers.
    loop_centers_px: List[Tuple[float, float]] = Field(default_factory=list)
    # Small-angle tilt correction applied before analysis, in degrees
    # (see analysis.gauge_analysis._normalize_rotation). 0.0 if none was
    # applied/needed. Purely diagnostic -- overlays are always in
    # original-image coordinates regardless of this value.
    rotation_deg: float = 0.0
    # Experimental parallel loop-lattice detector's output, for
    # development comparison only -- see LoopLatticeDebugOut. None if it
    # couldn't run (e.g. no periodicity to seed a scale search) or the
    # request failed before reaching it.
    loop_lattice_debug: Optional[LoopLatticeDebugOut] = None
    # Multi-region diagnostics -- present only when this response came
    # from /analyze-multi (the "Review Measurement Areas" flow). None for
    # the legacy single-ROI /analyze path.
    multi_roi: Optional[MultiRoiDebugOut] = None


class RepeatMatchOut(BaseModel):
    """
    Result of a user-anchored repeat count (see analysis.gauge_analysis.
    count_repeats_by_template_match / POST /count-repeats) -- the user
    marks two points spanning ONE confirmed wale or course repeat, and
    this reports how many real occurrences of that exact patch were
    found across the measurement area via normalized cross-correlation,
    and the resulting spacing. An optional, independent evidence source
    alongside automatic detection, not a replacement for it -- see the
    module comment above count_repeats_by_template_match for why this
    sidesteps the harmonic-ambiguity failure mode (a texture periodic at
    the wrong frequency, e.g. yarn ply twist) that every purely
    automatic detection path in this app has hit on some real photo.
    """

    success: bool
    message: str = ""
    spacing_px: Optional[float] = None
    spacing_mm: Optional[float] = None
    per_inch: Optional[float] = None
    match_count: int = 0
    match_positions_px: List[float] = Field(default_factory=list)
    match_scores: List[float] = Field(default_factory=list)
    confidence: float = 0.0
    template_width_px: float = 0.0
    template_height_px: float = 0.0
    seed_period_px: float = 0.0


class ErrorResponse(BaseModel):
    success: bool = False
    message: str


class CorrectionOut(BaseModel):
    """
    What the frontend needs to render the "Predicted -> Actual" comparison
    right after a correction is saved. The full record (ROI, calibration,
    detected positions, etc.) is persisted server-side regardless — this
    is just the display-relevant subset.
    """

    success: bool = True
    id: str
    created_at: str
    predicted_wales_per_inch: Optional[float] = None
    predicted_courses_per_inch: Optional[float] = None
    actual_wales_per_inch: Optional[float] = None
    actual_courses_per_inch: Optional[float] = None
    wale_absolute_error: Optional[float] = None  # predicted - actual, in wales/inch
    course_absolute_error: Optional[float] = None  # predicted - actual, in courses/inch
    wale_percent_error: Optional[float] = None
    course_percent_error: Optional[float] = None
    algorithm_version: str
    image_saved: bool = False
