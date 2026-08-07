"""
FastAPI application: serves the static frontend and exposes the
/analyze API. All actual image-processing logic lives in the
`analysis` package — this file only handles HTTP concerns (validation,
request parsing, translating results to JSON).

Uploaded images are processed entirely in memory and are never written
to disk.
"""
from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from analysis import analyze_gauge
from analysis.gauge_analysis import Orientation as AnalysisOrientation

from .image_io import ImageValidationError, decode_image, validate_upload
from .schemas import (
    MM_PER_INCH,
    UNIT_TO_MM,
    AnalyzeResponse,
    AreaMm,
    AxisOut,
    Orientation,
    RoiOut,
    Unit,
)

logger = logging.getLogger("textile_gauge_reader")

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(
    title="AI Textile Gauge Reader",
    description="Estimate knitted-textile gauge (wales/inch, courses/inch) from a photograph.",
    version="0.1.0",
)

# Permissive CORS for local development (frontend is served from the same
# origin in normal use, but this keeps `uvicorn --reload` + separate dev
# servers convenient without any auth surface to worry about).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


def _axis_to_out(axis, pixels_per_mm: float) -> AxisOut:
    spacing_mm = None
    per_inch = None
    if axis.spacing_px is not None and pixels_per_mm > 0:
        spacing_mm = axis.spacing_px / pixels_per_mm
        if spacing_mm > 0:
            per_inch = MM_PER_INCH / spacing_mm
    return AxisOut(
        spacing_px=axis.spacing_px,
        spacing_mm=round(spacing_mm, 4) if spacing_mm is not None else None,
        per_inch=round(per_inch, 3) if per_inch is not None else None,
        positions_px=axis.positions_px,
        confidence=axis.confidence,
        message=axis.message,
    )


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    file: UploadFile = File(...),
    roi_x: float = Form(...),
    roi_y: float = Form(...),
    roi_width: float = Form(...),
    roi_height: float = Form(...),
    cal_x1: float = Form(...),
    cal_y1: float = Form(...),
    cal_x2: float = Form(...),
    cal_y2: float = Form(...),
    known_distance: float = Form(...),
    unit: Unit = Form(...),
    orientation: Orientation = Form(...),
) -> JSONResponse:
    # --- Validate + decode upload (in memory only, never persisted) -----
    try:
        data = await file.read()
        validate_upload(file.content_type, len(data))
        image = decode_image(data)
    except ImageValidationError as exc:
        return JSONResponse(
            status_code=400,
            content=AnalyzeResponse(success=False, message=str(exc)).model_dump(),
        )

    img_h, img_w = image.shape[:2]

    # --- Validate calibration -------------------------------------------
    if known_distance <= 0:
        return JSONResponse(
            status_code=400,
            content=AnalyzeResponse(
                success=False, message="Known calibration distance must be greater than zero."
            ).model_dump(),
        )

    cal_pixel_dist = ((cal_x2 - cal_x1) ** 2 + (cal_y2 - cal_y1) ** 2) ** 0.5
    if cal_pixel_dist < 2:
        return JSONResponse(
            status_code=400,
            content=AnalyzeResponse(
                success=False,
                message="Calibration points are too close together. Please pick two distinct points.",
            ).model_dump(),
        )

    known_distance_mm = known_distance * UNIT_TO_MM[unit]
    pixels_per_mm = cal_pixel_dist / known_distance_mm
    if pixels_per_mm <= 0:
        return JSONResponse(
            status_code=400,
            content=AnalyzeResponse(
                success=False, message="Could not compute a valid scale from calibration."
            ).model_dump(),
        )

    # --- Validate ROI ------------------------------------------------------
    roi = (round(roi_x), round(roi_y), round(roi_width), round(roi_height))
    if roi[2] <= 0 or roi[3] <= 0:
        return JSONResponse(
            status_code=400,
            content=AnalyzeResponse(
                success=False, message="Selected measurement area is invalid."
            ).model_dump(),
        )
    if roi_x < 0 or roi_y < 0 or roi_x + roi_width > img_w or roi_y + roi_height > img_h:
        return JSONResponse(
            status_code=400,
            content=AnalyzeResponse(
                success=False,
                message="Selected measurement area falls outside the image bounds.",
            ).model_dump(),
        )

    # --- Run analysis --------------------------------------------------
    try:
        result = analyze_gauge(
            image_bgr=image,
            roi=roi,
            orientation=orientation,  # type: ignore[arg-type]  # Literal-compatible str
        )
    except Exception:  # pragma: no cover - defensive: never fabricate a result
        logger.exception("Analysis raised an unexpected exception")
        return JSONResponse(
            status_code=500,
            content=AnalyzeResponse(
                success=False, message="Analysis failed unexpectedly. Please try again."
            ).model_dump(),
        )

    if not result.success:
        return JSONResponse(
            status_code=200,
            content=AnalyzeResponse(success=False, message=result.message).model_dump(),
        )

    response = AnalyzeResponse(
        success=True,
        message=result.message,
        pixels_per_mm=round(pixels_per_mm, 6),
        roi=RoiOut(x=roi[0], y=roi[1], width=roi[2], height=roi[3]),
        analyzed_area_px=RoiOut(
            x=roi[0], y=roi[1], width=result.roi_width_px, height=result.roi_height_px
        ),
        analyzed_area_mm=AreaMm(
            width_mm=round(result.roi_width_px / pixels_per_mm, 3),
            height_mm=round(result.roi_height_px / pixels_per_mm, 3),
        ),
        orientation=orientation,
        wale=_axis_to_out(result.wale, pixels_per_mm),
        course=_axis_to_out(result.course, pixels_per_mm),
    )
    return JSONResponse(status_code=200, content=response.model_dump())


# --- Static frontend ----------------------------------------------------
# Mounted last / at the root so it acts as a catch-all without shadowing
# the API routes registered above (Starlette matches routes in the order
# they were added).
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
