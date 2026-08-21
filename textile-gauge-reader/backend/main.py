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

import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from analysis import ALGORITHM_VERSION, analyze_gauge, analyze_multi_roi, propose_measurement_rois
from analysis.gauge_analysis import Orientation as AnalysisOrientation
from analysis.gauge_analysis import (
    analyze_loop_lattice_experiment,
    count_repeats_by_template_match,
    detect_ruler_calibration,
)
from storage import corrections_store

from .corrections_api import router as corrections_router
from .image_io import MAX_UPLOAD_BYTES, ImageValidationError, decode_image, validate_upload
from .schemas import (
    MM_PER_INCH,
    UNIT_TO_MM,
    AnalyzeResponse,
    AreaMm,
    AxisConsensusOut,
    AxisOut,
    CandidateOut,
    LoopLatticeDebugOut,
    MultiRoiDebugOut,
    Orientation,
    OutlierOut,
    ProposedRoiOut,
    ProposeRoisResponse,
    RepeatMatchOut,
    RoiMeasurementOut,
    RoiOut,
    RulerCalibrationOut,
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
    title="Automatic Textile Gauge Reader",
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
                template_match_score=getattr(d, "template_match_score", None),
                evidence_score=getattr(d, "evidence_score", None),
                final_score=getattr(d, "final_score", None),
                selected=d.selected,
            )
            for d in getattr(axis, "candidate_details", [])
        ],
        status=getattr(axis, "status", "confident"),
        uncertain_reason=getattr(axis, "uncertain_reason", None),
    )


def _loop_lattice_to_out(lattice, pixels_per_mm: float) -> LoopLatticeDebugOut:
    """Shared by /analyze and /analyze-multi (once per region, in the latter)."""
    return LoopLatticeDebugOut(
        direct_centers_px=lattice.direct_centers_px,
        inferred_centers_px=lattice.inferred_centers_px,
        wale_columns_px=lattice.wale_columns_px,
        column_support_counts=lattice.column_support_counts,
        direct_center_count=lattice.direct_center_count,
        row_count=lattice.row_count,
        column_count=lattice.column_count,
        lattice_consistency=lattice.lattice_consistency,
        wale_spacing_px=lattice.wale_spacing_px,
        course_spacing_px=lattice.course_spacing_px,
        wale_per_inch=(
            _period_px_to_per_inch(lattice.wale_spacing_px, pixels_per_mm) if lattice.wale_spacing_px else None
        ),
        course_per_inch=(
            _period_px_to_per_inch(lattice.course_spacing_px, pixels_per_mm) if lattice.course_spacing_px else None
        ),
        scale_used_px=lattice.scale_used_px,
        message=lattice.message,
    )


def _axis_consensus_to_out(consensus, pixels_per_mm: float) -> AxisConsensusOut:
    return AxisConsensusOut(
        included_labels=consensus.included_labels,
        excluded_labels=consensus.excluded_labels,
        outliers=[
            OutlierOut(
                label=o.label,
                spacing_px=o.spacing_px,
                per_inch=_period_px_to_per_inch(o.spacing_px, pixels_per_mm),
                ratio_to_consensus=o.ratio_to_consensus,
                reason=o.reason,
            )
            for o in consensus.outliers
        ],
        regional_median_px=consensus.regional_median_px,
        regional_median_per_inch=(
            _period_px_to_per_inch(consensus.regional_median_px, pixels_per_mm)
            if consensus.regional_median_px else None
        ),
        regional_spread_px=consensus.regional_spread_px,
        message=consensus.message,
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

    # Experimental, parallel loop-lattice detector (see analysis.gauge_
    # analysis.analyze_loop_lattice_experiment) -- development/comparison
    # diagnostic only, never allowed to affect the real `wale`/`course`
    # response above. Wrapped defensively: a failure here must never
    # break the actual analysis result.
    loop_lattice_out: Optional[LoopLatticeDebugOut] = None
    try:
        # "Use the reliable course rows as a structural prior": pass the
        # EXISTING, frozen course detector's own row positions straight
        # through -- this experiment only ever reads them, never adjusts
        # course detection itself.
        lattice = analyze_loop_lattice_experiment(
            image, roi=roi, orientation=orientation,  # type: ignore[arg-type]
            course_rows_px=result.course.positions_px or None,
        )
        loop_lattice_out = _loop_lattice_to_out(lattice, pixels_per_mm)
    except Exception:  # pragma: no cover - defensive: experimental path, never fatal
        logger.exception("Loop-lattice experiment raised an unexpected exception")
        loop_lattice_out = None

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
        loop_lattice_debug=loop_lattice_out,
    )
    return JSONResponse(status_code=200, content=response.model_dump())


@app.post("/propose-rois", response_model=ProposeRoisResponse)
async def propose_rois(
    file: UploadFile = File(...),
    cal_x1: float = Form(...),
    cal_y1: float = Form(...),
    cal_x2: float = Form(...),
    cal_y2: float = Form(...),
    known_distance: float = Form(...),
    unit: Unit = Form(...),
) -> JSONResponse:
    """
    Stage 1 of the multi-region workflow: given an uploaded image and its
    calibration, propose several candidate square measurement areas for
    the user to review/edit/approve in the "Review Measurement Areas"
    step -- BEFORE any gauge analysis runs. See analysis.gauge_analysis.
    propose_measurement_rois for the selection/scoring logic.
    """
    try:
        data = await file.read()
        validate_upload(file.content_type, len(data))
        image = decode_image(data)
    except ImageValidationError as exc:
        return JSONResponse(
            status_code=400,
            content=ProposeRoisResponse(success=False, message=str(exc)).model_dump(),
        )

    if known_distance <= 0:
        return JSONResponse(
            status_code=400,
            content=ProposeRoisResponse(
                success=False, message="Known calibration distance must be greater than zero."
            ).model_dump(),
        )

    cal_pixel_dist = ((cal_x2 - cal_x1) ** 2 + (cal_y2 - cal_y1) ** 2) ** 0.5
    if cal_pixel_dist < 2:
        return JSONResponse(
            status_code=400,
            content=ProposeRoisResponse(
                success=False,
                message="Calibration points are too close together. Please pick two distinct points.",
            ).model_dump(),
        )

    known_distance_mm = known_distance * UNIT_TO_MM[unit]
    pixels_per_mm = cal_pixel_dist / known_distance_mm
    if pixels_per_mm <= 0:
        return JSONResponse(
            status_code=400,
            content=ProposeRoisResponse(
                success=False, message="Could not compute a valid scale from calibration."
            ).model_dump(),
        )

    try:
        proposal = propose_measurement_rois(image_bgr=image, pixels_per_mm=pixels_per_mm)
    except Exception:  # pragma: no cover - defensive: never fabricate a result
        logger.exception("ROI proposal raised an unexpected exception")
        return JSONResponse(
            status_code=500,
            content=ProposeRoisResponse(
                success=False, message="Proposing measurement areas failed unexpectedly. Please try again."
            ).model_dump(),
        )

    response = ProposeRoisResponse(
        success=proposal.success,
        message=proposal.message,
        rois=[
            ProposedRoiOut(
                x=r.x, y=r.y, width=r.width, height=r.height, label=r.label,
                quality_score=r.quality_score, sharpness=r.sharpness, contrast=r.contrast,
                periodicity=r.periodicity, texture_consistency=r.texture_consistency,
                brightness_score=r.brightness_score, periodicity_consistency=r.periodicity_consistency,
            )
            for r in proposal.rois
        ],
        window_size_px=proposal.window_size_px,
        pixels_per_mm=round(pixels_per_mm, 6),
    )
    # success=False here means "valid request, but no suitable areas found"
    # (e.g. a tiny or extremely uniform image) -- not a request error, so
    # this is still a 200; the frontend shows proposal.message and offers
    # the manual "Add Measurement Area" fallback.
    return JSONResponse(status_code=200, content=response.model_dump())


@app.post("/detect-ruler", response_model=RulerCalibrationOut)
async def detect_ruler(file: UploadFile = File(...)) -> JSONResponse:
    """
    Runs BEFORE any calibration exists -- unlike every other endpoint in
    this file, this one needs nothing but the raw uploaded image. See
    analysis.gauge_analysis.detect_ruler_calibration for the detection
    logic and its module-level design rationale. The frontend uses a
    success result to PRE-FILL the Calibrate Scale step's two points,
    known-distance, and unit -- never to skip the user's own confirm/
    override step, same as /propose-rois pre-fills but never auto-
    approves measurement areas.
    """
    try:
        data = await file.read()
        validate_upload(file.content_type, len(data))
        image = decode_image(data)
    except ImageValidationError as exc:
        return JSONResponse(status_code=400, content=RulerCalibrationOut(success=False, message=str(exc)).model_dump())

    try:
        result = detect_ruler_calibration(image)
    except Exception:  # pragma: no cover - defensive: never fabricate a result
        logger.exception("Ruler calibration detection raised an unexpected exception")
        return JSONResponse(
            status_code=500,
            content=RulerCalibrationOut(
                success=False, message="Ruler detection failed unexpectedly. Please calibrate manually."
            ).model_dump(),
        )

    response = RulerCalibrationOut(
        success=result.success,
        message=result.message,
        point1_px=result.point1_px,
        point2_px=result.point2_px,
        suggested_distance=result.suggested_distance,
        suggested_unit=result.suggested_unit,
        minor_tick_spacing_px=result.minor_tick_spacing_px,
        major_tick_count=result.major_tick_count,
        confidence=result.confidence,
    )
    # success=False here means "no plausible ruler found" -- not a
    # request error, same convention as /propose-rois and /count-repeats:
    # still a 200, and the frontend just leaves manual calibration as-is.
    return JSONResponse(status_code=200, content=response.model_dump())


@app.post("/analyze-multi", response_model=AnalyzeResponse)
async def analyze_multi(
    file: UploadFile = File(...),
    rois_json: str = Form(...),
    cal_x1: float = Form(...),
    cal_y1: float = Form(...),
    cal_x2: float = Form(...),
    cal_y2: float = Form(...),
    known_distance: float = Form(...),
    unit: Unit = Form(...),
    orientation: Orientation = Form(...),
    structure: Structure = Form("unknown"),
) -> JSONResponse:
    """
    Stage 2 of the multi-region workflow: analyze every approved
    measurement area completely independently, then combine them into a
    robust cross-region consensus -- see analysis.gauge_analysis.
    analyze_multi_roi. Returns the SAME response shape as /analyze
    (wale/course/roi/analyzed_area_*), so the normal Results view needs
    no changes; `multi_roi` carries the additional per-region + consensus
    diagnostics for the "Measurement consistency" summary and Developer
    diagnostics' per-region selector.

    `rois_json`: a JSON array of {label, x, y, width, height, source},
    in full-image pixel coordinates, exactly as approved on the "Review
    Measurement Areas" step.
    """
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

    # --- Parse + validate measurement areas ------------------------------
    try:
        rois_raw = json.loads(rois_json)
    except (TypeError, ValueError):
        return JSONResponse(
            status_code=400,
            content=AnalyzeResponse(success=False, message="Could not parse measurement areas.").model_dump(),
        )
    if not isinstance(rois_raw, list) or not rois_raw:
        return JSONResponse(
            status_code=400,
            content=AnalyzeResponse(success=False, message="At least one measurement area is required.").model_dump(),
        )

    rois: list[dict] = []
    for i, item in enumerate(rois_raw):
        try:
            label = str(item.get("label") or chr(ord("A") + i))
            x = float(item["x"])
            y = float(item["y"])
            width = float(item["width"])
            height = float(item["height"])
            source = str(item.get("source", "auto"))
        except (AttributeError, KeyError, TypeError, ValueError):
            return JSONResponse(
                status_code=400,
                content=AnalyzeResponse(success=False, message="One or more measurement areas were malformed.").model_dump(),
            )
        if width <= 0 or height <= 0 or x < 0 or y < 0 or x + width > img_w or y + height > img_h:
            return JSONResponse(
                status_code=400,
                content=AnalyzeResponse(
                    success=False, message=f"Measurement area {label} falls outside the image bounds."
                ).model_dump(),
            )
        rois.append({"label": label, "x": x, "y": y, "width": width, "height": height, "source": source})

    # --- Validate calibration (identical to /analyze) --------------------
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

    # --- Run independent-per-region analysis + consensus -----------------
    try:
        result = analyze_multi_roi(
            image_bgr=image, rois=rois,
            orientation=orientation,  # type: ignore[arg-type]
            structure=structure,  # type: ignore[arg-type]
        )
    except Exception:  # pragma: no cover - defensive: never fabricate a result
        logger.exception("Multi-ROI analysis raised an unexpected exception")
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

    primary_x, primary_y, primary_w, primary_h = result.primary_roi_px
    primary_measurement = next(
        (m for m in result.per_roi if m.label == result.primary_label), result.per_roi[0]
    )

    per_roi_out = [
        RoiMeasurementOut(
            label=m.label, x=m.x, y=m.y, width=m.width, height=m.height, source=m.source,
            success=m.success, message=m.message,
            wale=_axis_to_out(m.wale, pixels_per_mm),
            course=_axis_to_out(m.course, pixels_per_mm),
            quality_score=m.quality_score,
            sharpness=m.quality_parts.get("sharpness"),
            contrast=m.quality_parts.get("contrast"),
            periodicity=m.quality_parts.get("periodicity"),
            texture_consistency=m.quality_parts.get("texture_consistency"),
            brightness_score=m.quality_parts.get("brightness_score"),
            periodicity_consistency=m.quality_parts.get("periodicity_consistency"),
            rotation_deg=m.rotation_deg,
            loop_lattice_debug=_loop_lattice_to_out(m.loop_lattice, pixels_per_mm) if m.loop_lattice else None,
            wale_source=m.wale_source,
            wale_count_confidence=m.wale_count_confidence,
        )
        for m in result.per_roi
    ]
    primary_loop_lattice_out = next(
        (r.loop_lattice_debug for r in per_roi_out if r.label == result.primary_label), None
    )

    response = AnalyzeResponse(
        success=True,
        message=result.message,
        pixels_per_mm=round(pixels_per_mm, 6),
        roi=RoiOut(x=primary_x, y=primary_y, width=primary_w, height=primary_h),
        analyzed_area_px=RoiOut(x=primary_x, y=primary_y, width=primary_w, height=primary_h),
        analyzed_area_mm=AreaMm(
            width_mm=round(primary_w / pixels_per_mm, 3),
            height_mm=round(primary_h / pixels_per_mm, 3),
        ),
        orientation=orientation,
        structure=structure,
        wale=_axis_to_out(result.wale, pixels_per_mm),
        course=_axis_to_out(result.course, pixels_per_mm),
        algorithm_version=ALGORITHM_VERSION,
        loop_centers_px=primary_measurement.loop_centers_px,
        rotation_deg=primary_measurement.rotation_deg,
        loop_lattice_debug=primary_loop_lattice_out,
        multi_roi=MultiRoiDebugOut(
            per_roi=per_roi_out,
            wale_consensus=_axis_consensus_to_out(result.wale_consensus, pixels_per_mm),
            course_consensus=_axis_consensus_to_out(result.course_consensus, pixels_per_mm),
            primary_label=result.primary_label,
        ),
    )
    return JSONResponse(status_code=200, content=response.model_dump())


@app.post("/count-repeats", response_model=RepeatMatchOut)
async def count_repeats(
    file: UploadFile = File(...),
    roi_x: float = Form(...),
    roi_y: float = Form(...),
    roi_width: float = Form(...),
    roi_height: float = Form(...),
    anchor_start_x: float = Form(...),
    anchor_start_y: float = Form(...),
    anchor_end_x: float = Form(...),
    anchor_end_y: float = Form(...),
    orientation: Orientation = Form(...),
    axis: str = Form(...),
    pixels_per_mm: float = Form(...),
) -> JSONResponse:
    """
    User-anchored repeat counting (see analysis.gauge_analysis.
    count_repeats_by_template_match). Optional, independent evidence
    source: the user marks two points spanning ONE confirmed wale or
    course repeat, and this counts real occurrences of that exact patch
    across the measurement area via normalized cross-correlation, rather
    than inferring periodicity from generic frequency content the way
    every automatic detection path in this app does. Never overwrites or
    feeds into automatic detection -- this is a separate, human-in-the-
    loop measurement the frontend shows alongside the automatic result,
    same spirit as the loop-lattice debug view being comparison-only.
    """
    try:
        data = await file.read()
        validate_upload(file.content_type, len(data))
        image = decode_image(data)
    except ImageValidationError as exc:
        return JSONResponse(status_code=400, content=RepeatMatchOut(success=False, message=str(exc)).model_dump())

    if axis not in ("wale", "course"):
        return JSONResponse(
            status_code=400,
            content=RepeatMatchOut(success=False, message="axis must be 'wale' or 'course'.").model_dump(),
        )
    if pixels_per_mm <= 0:
        return JSONResponse(
            status_code=400,
            content=RepeatMatchOut(success=False, message="Invalid calibration scale.").model_dump(),
        )

    try:
        result = count_repeats_by_template_match(
            image_bgr=image,
            roi=(roi_x, roi_y, roi_width, roi_height),
            anchor_start=(anchor_start_x, anchor_start_y),
            anchor_end=(anchor_end_x, anchor_end_y),
            orientation=orientation,
            axis=axis,  # type: ignore[arg-type]  -- validated above
        )
    except Exception:  # pragma: no cover - defensive: never fabricate a result
        logger.exception("Repeat counting raised an unexpected exception")
        return JSONResponse(
            status_code=500,
            content=RepeatMatchOut(
                success=False, message="Counting repeats failed unexpectedly. Please try again."
            ).model_dump(),
        )

    spacing_mm = result.spacing_px / pixels_per_mm if result.spacing_px else None
    per_inch = MM_PER_INCH / spacing_mm if spacing_mm else None
    response = RepeatMatchOut(
        success=result.success,
        message=result.message,
        spacing_px=result.spacing_px,
        spacing_mm=round(spacing_mm, 4) if spacing_mm is not None else None,
        per_inch=round(per_inch, 3) if per_inch is not None else None,
        match_count=result.match_count,
        match_positions_px=result.match_positions_px,
        match_scores=result.match_scores,
        confidence=result.confidence,
        template_width_px=result.template_width_px,
        template_height_px=result.template_height_px,
        seed_period_px=result.seed_period_px,
    )
    # success=False here can mean either a request-shaped-fine-but-no-
    # matches-found result (e.g. a poorly chosen anchor) or a too-small
    # region -- still a 200, same convention as /propose-rois: the
    # frontend shows result.message and lets the user try different
    # anchor points, rather than treating it as a request error.
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
