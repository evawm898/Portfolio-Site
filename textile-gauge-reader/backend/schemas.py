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
    Development/comparison information only -- never influences `wale`/
    `course` above, and is not something a normal user needs to see; the
    frontend only renders this in its developer-diagnostics mode.
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
