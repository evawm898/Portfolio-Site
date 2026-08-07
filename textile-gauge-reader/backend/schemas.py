"""Pydantic request/response models for the API layer."""
from __future__ import annotations

from typing import List, Literal, Optional

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


class AxisOut(BaseModel):
    spacing_px: Optional[float] = None
    spacing_mm: Optional[float] = None
    per_inch: Optional[float] = None
    positions_px: List[float] = Field(default_factory=list)
    confidence: float = 0.0
    message: str = ""


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
