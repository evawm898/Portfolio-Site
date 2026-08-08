"""
FastAPI application: exposes the /analyze API (and, for local
full-stack development, also serves the bundled static frontend in
../frontend). All actual image-processing logic lives in the
`analysis` package — this file only handles HTTP concerns (validation,
request parsing, translating results to JSON).

In production this backend is deployed standalone (e.g. on Render) and
called from a separately-hosted static frontend (the portfolio site),
so CORS is configurable via the ALLOWED_ORIGINS environment variable —
see the module-level comment below.

Uploaded images are processed entirely in memory and are never written
to disk.
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from analysis import ALGORITHM_VERSION, analyze_gauge
from analysis.gauge_analysis import Orientation as AnalysisOrientation
from storage import corrections_store

from .corrections_api import router as corrections_router
from .image_io import MAX_UPLOAD_BYTES, ImageValidationError, decode_image, validate_upload
from .schemas import (
    MM_PER_INCH,
    UNIT_TO_MM,
    AnalyzeResponse,
    AreaMm,
    AxisOut,
    CandidateOut,
    Orientation,
    RoiOut,
    Structure,
    Unit,
)

logger = logging.getLogger("textile_gauge_reader")

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"


@asynccontextmanager
async def _lifespan(_app: FastAPI):
    # Deliberately not called at module import time: importing this module
    # (e.g. from tooling or a test suite) shouldn't have disk side effects.
    # (Table creation itself is also guaranteed on every DB connection in
    # storage/corrections_store.py, so this isn't the only thing standing
    # between a fresh checkout and a working /corrections endpoint — but
    # doing it once up front means the first request isn't the one paying
    # for it.)
    corrections_store.init_db()
    yield


app = FastAPI(
    title="AI Textile Gauge Reader",
    description="Estimate knitted-textile gauge (wales/inch, courses/inch) from a photograph.",
    version="0.1.0",
    lifespan=_lifespan,
)

# --- CORS -----------------------------------------------------------
# ALLOWED_ORIGINS is a comma-separated list of origins allowed to call
# this API from the browser, e.g.:
#   ALLOWED_ORIGINS=https://evamaskalenko.com,https://eva-maskalenko.netlify.app
# Defaults to "*" (any origin) so local development and first deploys
# work out of the box. There are no cookies/credentials involved, so a
# wildcard is safe here — tighten it once the frontend's real domain is
# known by setting the env var on Render.
_origins_env = os.environ.get("ALLOWED_ORIGINS", "*").strip()
_allow_origins = ["*"] if _origins_env == "*" else [o.strip() for o in _origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ground-truth correction system: /corrections (save), /corrections
# (list), /corrections/export.{csv,json}. See backend/corrections_api.py
# and storage/corrections_store.py.
app.include_router(corrections_router)

# --- Request size guard ------------------------------------------------
# Belt-and-suspenders alongside the in-route upload-size validation:
# reject oversized requests by Content-Length before we spend any effort
# parsing the multipart body.
_MAX_REQUEST_BYTES = MAX_UPLOAD_BYTES + 1024 * 1024  # allow ~1MB of multipart/form overhead


@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            if int(content_length) > _MAX_REQUEST_BYTES:
                return JSONResponse(
                    status_code=413,
                    content={"success": False, "message": "Request body is too large."},
                )
        except ValueError:
            pass
    return await call_next(request)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/health")
def health_legacy() -> dict:
    """Kept for backward compatibility with the original local-dev frontend."""
    return {"status": "ok"}


def _period_px_to_per_inch(period_px: float, pixels_per_mm: float) -> Optional[float]:
    if pixels_per_mm <= 0:
        return None
    spacing_mm = period_px / pixels_per_mm
    if spacing_mm <= 0:
        return None
    return round(MM_PER_INCH / spacing_mm, 3)


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
        candidates_px=axis.candidates_px,
        selected_reason=axis.selected_reason,
        candidate_details=[
            CandidateOut(
                period_px=d.period_px,
                per_inch=_period_px_to_per_inch(d.period_px, pixels_per_mm),
                harmonic=d.harmonic,
                fold_consistency=d.fold_consistency,
                autocorr_score=getattr(d, "autocorr_score", None),
                support_2d=getattr(d, "support_2d", None),
                structural_score=getattr(d, "structural_score", None),
                patch_consensus=getattr(d, "patch_consensus", None),
                harmonic_penalty=getattr(d, "harmonic_penalty", None),
                phase_consistency=getattr(d, "phase_consistency", None),
                alternating_phase_score=getattr(d, "alternating_phase_score", None),
                evidence_score=getattr(d, "evidence_score", None),
                final_score=getattr(d, "final_score", None),
                selected=d.selected,
            )
            for d in getattr(axis, "candidate_details", [])
        ],
        status=getattr(axis, "status", "confident"),
        uncertain_reason=getattr(axis, "uncertain_reason", None),
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
    structure: Structure = Form("unknown"),
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
            structure=structure,  # type: ignore[arg-type]  # Literal-compatible str
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
        structure=structure,
        wale=_axis_to_out(result.wale, pixels_per_mm),
        course=_axis_to_out(result.course, pixels_per_mm),
        algorithm_version=ALGORITHM_VERSION,
        loop_centers_px=result.loop_centers_px,
        rotation_deg=result.rotation_deg,
    )
    return JSONResponse(status_code=200, content=response.model_dump())


# --- Static frontend (local full-stack dev only) -----------------------
# The production frontend is the standalone page on the portfolio site
# (textile-gauge-reader.html + .css + .js at the repo root), which calls
# this API cross-origin. This mount just keeps `uvicorn backend.main:app`
# useful for local development without a separate static server. Mounted
# last / at the root so it acts as a catch-all without shadowing the API
# routes registered above (Starlette matches routes in the order they
# were added). Guarded in case a deployment doesn't include the
# frontend/ directory.
if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
