"""Pydantic request/response models for the API layer."""
from __future__ import annotations

from typing import List, Literal, Optional, Tuple

from pydantic import BaseModel, Field

Unit = Literal["mm", "cm", "in"]
Orientation = Literal["vertical", "horizontal"]

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


class CandidateOut(BaseModel):
    """
    One harmonic period candidate considered for an axis, with the
    evidence used to judge it -- lets a human (or a future tuning pass)
    see *why* a period was picked, not just what was picked.
    """

    period_px: float
    per_inch: Optional[float] = None  # same period, converted with this request's calibration
    harmonic: str  # "0.5x" / "1x" / "2x" relative to the raw autocorrelation estimate
    fold_consistency: Optional[float] = None  # structural score; None where not computed (course axis)
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


class AnalyzeResponse(BaseModel):
    success: bool
    message: str
    pixels_per_mm: Optional[float] = None
    roi: Optional[RoiOut] = None
    analyzed_area_px: Optional[RoiOut] = None
    analyzed_area_mm: Optional[AreaMm] = None
    orientation: Optional[Orientation] = None
    wale: AxisOut = Field(default_factory=AxisOut)
    course: AxisOut = Field(default_factory=AxisOut)
    algorithm_version: Optional[str] = None
    # Approximate 2D knit-loop-center points (full-image pixel
    # coordinates) for the optional "show loop centers" diagnostic
    # overlay — lets a human visually confirm what the detector is
    # treating as one complete loop, not just trust the final numbers.
    loop_centers_px: List[Tuple[float, float]] = Field(default_factory=list)


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
    wale_percent_error: Optional[float] = None
    course_percent_error: Optional[float] = None
    algorithm_version: str
    image_saved: bool = False
