"""
HTTP routes for the ground-truth "correction" system: saving a manual
verification against a prior /analyze prediction, listing them, and
exporting the accumulated labeled dataset as CSV/JSON.

All actual persistence lives in storage/corrections_store.py — this
module only handles HTTP concerns (form parsing, validation, deriving
actual-per-inch values and percent error from the submitted fields, and
shaping responses). It never changes analysis behavior; it only records
predictions alongside human-verified ground truth.
"""
from __future__ import annotations

import json
import logging
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse, PlainTextResponse

from storage import corrections_store as store

from .image_io import ImageValidationError, decode_image, validate_upload
from .schemas import CorrectionOut, Orientation

logger = logging.getLogger("textile_gauge_reader")
router = APIRouter()

MM_PER_INCH = 25.4


def _derive_actual_per_inch(
    direct_value: Optional[float], count: Optional[int], extent_mm: Optional[float]
) -> Optional[float]:
    """
    Ground truth resolution order: an explicitly entered actual-per-inch
    value wins if present; otherwise derive it from a stitch count over
    the ROI's physical extent along that axis. Neither present -> None,
    never a fabricated number.
    """
    if direct_value is not None and direct_value > 0:
        return direct_value
    if count is not None and count > 0 and extent_mm and extent_mm > 0:
        return count / (extent_mm / MM_PER_INCH)
    return None


def _percent_error(predicted: Optional[float], actual: Optional[float]) -> Optional[float]:
    """Signed percent error of the prediction relative to ground truth (+over, -under)."""
    if predicted is None or actual is None or actual == 0:
        return None
    return round((predicted - actual) / actual * 100, 2)


def _safe_positions_json(raw: str) -> str:
    """Validate the positions payload is JSON; fall back to an empty list rather than 500ing."""
    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, list):
            raise ValueError("not a list")
        return json.dumps([float(v) for v in parsed])
    except (ValueError, TypeError):
        logger.warning("Correction save: discarding malformed positions payload")
        return "[]"


@router.post("/corrections", response_model=CorrectionOut)
async def save_correction(
    roi_x: float = Form(...),
    roi_y: float = Form(...),
    roi_width_px: float = Form(...),
    roi_height_px: float = Form(...),
    roi_width_mm: float = Form(...),
    roi_height_mm: float = Form(...),
    pixels_per_mm: float = Form(...),
    orientation: Orientation = Form(...),
    predicted_wale_spacing_px: Optional[float] = Form(None),
    predicted_course_spacing_px: Optional[float] = Form(None),
    predicted_wale_spacing_mm: Optional[float] = Form(None),
    predicted_course_spacing_mm: Optional[float] = Form(None),
    predicted_wales_per_inch: Optional[float] = Form(None),
    predicted_courses_per_inch: Optional[float] = Form(None),
    predicted_wale_confidence: float = Form(0.0),
    predicted_course_confidence: float = Form(0.0),
    detected_wale_positions: str = Form("[]"),
    detected_course_positions: str = Form("[]"),
    actual_wale_count: Optional[int] = Form(None),
    actual_course_count: Optional[int] = Form(None),
    actual_wales_per_inch: Optional[float] = Form(None),
    actual_courses_per_inch: Optional[float] = Form(None),
    calibration_correct: bool = Form(True),
    orientation_correct: bool = Form(True),
    algorithm_version: str = Form("unknown"),
    image_filename: Optional[str] = Form(None),
    image_size_bytes: Optional[int] = Form(None),
    image_sha256: Optional[str] = Form(None),
    save_image: bool = Form(False),
    file: Optional[UploadFile] = File(None),
) -> JSONResponse:
    # The ROI extent relevant to each axis depends on which way the wales
    # run — same mapping used when drawing the overlay: wale spacing is
    # measured across the axis perpendicular to the wale direction.
    if orientation == "vertical":
        wale_extent_mm, course_extent_mm = roi_width_mm, roi_height_mm
    else:
        wale_extent_mm, course_extent_mm = roi_height_mm, roi_width_mm

    resolved_actual_wpi = _derive_actual_per_inch(actual_wales_per_inch, actual_wale_count, wale_extent_mm)
    resolved_actual_cpi = _derive_actual_per_inch(actual_courses_per_inch, actual_course_count, course_extent_mm)

    wale_err = _percent_error(predicted_wales_per_inch, resolved_actual_wpi)
    course_err = _percent_error(predicted_courses_per_inch, resolved_actual_cpi)

    sample_id = store.CorrectionRecord.new_id()

    image_saved = False
    image_path = None
    if save_image and file is not None:
        try:
            data = await file.read()
            validate_upload(file.content_type, len(data))
            decode_image(data)  # sanity check before persisting anything
            image_path = store.save_image(sample_id, file.filename or "upload", data)
            image_saved = True
        except ImageValidationError as exc:
            # Opting into image save failing shouldn't block saving the
            # (more important) numeric ground-truth record.
            logger.warning("Correction image not saved: %s", exc)

    record = store.CorrectionRecord(
        id=sample_id,
        created_at=store.CorrectionRecord.now_iso(),
        image_filename=image_filename,
        image_size_bytes=image_size_bytes,
        image_sha256=image_sha256,
        roi_x=roi_x,
        roi_y=roi_y,
        roi_width_px=roi_width_px,
        roi_height_px=roi_height_px,
        roi_width_mm=roi_width_mm,
        roi_height_mm=roi_height_mm,
        pixels_per_mm=pixels_per_mm,
        orientation=orientation,
        predicted_wale_spacing_px=predicted_wale_spacing_px,
        predicted_course_spacing_px=predicted_course_spacing_px,
        predicted_wale_spacing_mm=predicted_wale_spacing_mm,
        predicted_course_spacing_mm=predicted_course_spacing_mm,
        predicted_wales_per_inch=predicted_wales_per_inch,
        predicted_courses_per_inch=predicted_courses_per_inch,
        predicted_wale_confidence=predicted_wale_confidence,
        predicted_course_confidence=predicted_course_confidence,
        detected_wale_positions_json=_safe_positions_json(detected_wale_positions),
        detected_course_positions_json=_safe_positions_json(detected_course_positions),
        actual_wale_count=actual_wale_count,
        actual_course_count=actual_course_count,
        actual_wales_per_inch=resolved_actual_wpi,
        actual_courses_per_inch=resolved_actual_cpi,
        wale_percent_error=wale_err,
        course_percent_error=course_err,
        calibration_correct=calibration_correct,
        orientation_correct=orientation_correct,
        algorithm_version=algorithm_version,
        image_saved=image_saved,
        image_path=image_path,
    )
    store.save_correction(record)

    return JSONResponse(
        status_code=201,
        content=CorrectionOut(
            id=record.id,
            created_at=record.created_at,
            predicted_wales_per_inch=predicted_wales_per_inch,
            predicted_courses_per_inch=predicted_courses_per_inch,
            actual_wales_per_inch=resolved_actual_wpi,
            actual_courses_per_inch=resolved_actual_cpi,
            wale_percent_error=wale_err,
            course_percent_error=course_err,
            algorithm_version=algorithm_version,
            image_saved=image_saved,
        ).model_dump(),
    )


@router.get("/corrections")
def list_corrections_endpoint() -> JSONResponse:
    """Internal listing endpoint — same data as export.json, without download headers."""
    records = [r.to_dict() for r in store.list_corrections()]
    return JSONResponse(content=records)


@router.get("/corrections/export.json")
def export_json_endpoint() -> PlainTextResponse:
    body = store.export_json()
    return PlainTextResponse(
        content=body,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=textile_gauge_corrections.json"},
    )


@router.get("/corrections/export.csv")
def export_csv_endpoint() -> PlainTextResponse:
    body = store.export_csv()
    return PlainTextResponse(
        content=body,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=textile_gauge_corrections.csv"},
    )
