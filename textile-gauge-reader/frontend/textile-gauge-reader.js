/**
 * AI Textile Gauge Reader — frontend controller (experimental lab page).
 *
 * Pure UI/interaction code: image upload, two-point calibration, ROI
 * selection, orientation choice, calling the analysis API, and drawing
 * results. No image analysis happens here — everything is delegated to
 * the FastAPI backend, which delegates the actual computer vision to its
 * `analysis` package.
 *
 * THIS COPY (backend/frontend/) is served BY the backend itself --
 * `uvicorn backend.main:app` mounts this directory at "/" for local
 * full-stack development, same-origin, no CORS needed. It must stay a
 * byte-for-byte mirror of the root-level production copy (`../../
 * textile-gauge-reader.{html,js,css}`, served separately from the
 * portfolio site) except for API_BASE_URL below -- copy the other files
 * over wholesale on every change rather than hand-editing this one, or
 * the two silently drift apart (this file only exists because they once
 * already had: this whole copy sat unsynced since the very first version
 * of the app, so visiting the backend's own root URL served a stale,
 * pre-multi-region UI with none of the later fixes, while looking enough
 * like the real thing to cause real confusion about which result to
 * trust).
 *
 * All interaction state (calibration points, ROI, detected positions)
 * is stored in ORIGINAL IMAGE PIXEL coordinates ("natural" coordinates).
 * Screen/display coordinates are derived from that on every render, so
 * the overlay stays registered to the image regardless of how the
 * browser has scaled it (window resize, different screen sizes, etc).
 */
(() => {
  "use strict";

  // -------------------------------------------------------------------
  // CONFIGURATION — the one place the backend API URL is defined.
  //
  // Empty string: this copy is served BY the backend (same origin), so
  // API calls need no base URL at all. The production copy at the repo
  // root sets this to the deployed backend's full URL instead, since it
  // runs on a different origin (the portfolio site).
  // -------------------------------------------------------------------
  const CONFIG = {
    API_BASE_URL: "",
  };

  const STEPS = ["upload", "calibrate", "roi", "orientation", "analyze", "results"];
  const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const MIN_ROI_NATURAL_PX = 40;
  const HANDLE_HIT_RADIUS = 10; // display px
  const HEALTH_CHECK_TIMEOUT_MS = 10000; // per-attempt; Render free tier can be slow even once awake
  const HEALTH_CHECK_RETRY_DELAYS_MS = [4000, 8000, 15000, 20000]; // backoff while the service cold-starts
  const ANALYZE_TIMEOUT_MS = 75000; // generous: free-tier hosts can cold-start slowly

  const WALE_COLOR = "#0f7d7d";   // matches --petrol-bright
  const COURSE_COLOR = "#a56b2e"; // matches --tgr-course

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 8;
  const WHEEL_ZOOM_SENSITIVITY = 0.01;

  // --- DOM refs -----------------------------------------------------
  const stepEls = Object.fromEntries(
    [...document.querySelectorAll(".tgr-step")].map((el) => [el.dataset.step, el])
  );
  const panelEls = Object.fromEntries(
    [...document.querySelectorAll(".tgr-step-panel")].map((el) => [el.dataset.panel, el])
  );

  const viewer = document.getElementById("viewer");
  const viewerEmpty = document.getElementById("viewerEmpty");
  const stage = document.getElementById("stage");
  const img = document.getElementById("sourceImage");
  const canvas = document.getElementById("overlay");
  const ctx = canvas.getContext("2d");

  const zoomControls = document.getElementById("zoomControls");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomResetBtn = document.getElementById("zoomResetBtn");
  const zoomLevelEl = document.getElementById("zoomLevel");

  const panelEl = document.getElementById("panel");
  const panelToggle = document.getElementById("panelToggle");
  const appEl = document.querySelector(".tgr-app");

  const fileInput = document.getElementById("fileInput");
  const dropzone = document.getElementById("dropzone");
  const uploadError = document.getElementById("uploadError");

  const calStatus = document.getElementById("calStatus");
  const knownDistanceInput = document.getElementById("knownDistance");
  const unitSelect = document.getElementById("unitSelect");
  const ppmPreview = document.getElementById("ppmPreview");
  const calRedoBtn = document.getElementById("calRedo");
  const calConfirmBtn = document.getElementById("calConfirm");
  const calError = document.getElementById("calError");

  const roiStatus = document.getElementById("roiStatus");
  const roiError = document.getElementById("roiError");
  const roiList = document.getElementById("roiList");
  const roiAddModeBtn = document.getElementById("roiAddMode");
  const roiDeleteSelectedBtn = document.getElementById("roiDeleteSelected");
  const roiResetBtn = document.getElementById("roiReset");
  const roiConfirmBtn = document.getElementById("roiConfirm");

  const orientationConfirmBtn = document.getElementById("orientationConfirm");

  const analyzeSummary = document.getElementById("analyzeSummary");
  const analyzeBackBtn = document.getElementById("analyzeBack");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const analyzeStatus = document.getElementById("analyzeStatus");
  const analyzeError = document.getElementById("analyzeError");

  const resultsGrid = document.getElementById("resultsGrid");
  const resultsWarning = document.getElementById("resultsWarning");
  const resetBtn = document.getElementById("resetBtn");
  const showLoopCentersCheck = document.getElementById("showLoopCentersCheck");
  const showVShapeLoopsCheck = document.getElementById("showVShapeLoopsCheck");
  const loopLatticeComparison = document.getElementById("loopLatticeComparison");
  const detectionDetailsContent = document.getElementById("detectionDetailsContent");

  // Multi-region diagnostics (Stage 2)
  const measurementConsistencyPanel = document.getElementById("measurementConsistencyPanel");
  const measurementConsistencyContent = document.getElementById("measurementConsistencyContent");
  const showMeasurementAreasRow = document.getElementById("showMeasurementAreasRow");
  const showMeasurementAreasCheck = document.getElementById("showMeasurementAreasCheck");
  const roiDiagSelectRow = document.getElementById("roiDiagSelectRow");
  const roiDiagSelect = document.getElementById("roiDiagSelect");
  const roiDiagContent = document.getElementById("roiDiagContent");

  const serviceStatusEl = document.getElementById("serviceStatus");
  const serviceStatusDot = document.getElementById("serviceStatusDot");
  const serviceStatusText = document.getElementById("serviceStatusText");
  const serviceStatusRetry = document.getElementById("serviceStatusRetry");

  // Verify Measurement / ground-truth correction
  const verifyPredictedSummary = document.getElementById("verifyPredictedSummary");
  const actualWpiInput = document.getElementById("actualWpi");
  const actualCpiInput = document.getElementById("actualCpi");
  const actualWaleCountInput = document.getElementById("actualWaleCount");
  const actualCourseCountInput = document.getElementById("actualCourseCount");
  const roiCountHint = document.getElementById("roiCountHint");
  const calCorrectCheck = document.getElementById("calCorrectCheck");
  const orientationCorrectCheck = document.getElementById("orientationCorrectCheck");
  const saveImageCheck = document.getElementById("saveImageCheck");
  const saveCorrectionBtn = document.getElementById("saveCorrectionBtn");
  const correctionStatus = document.getElementById("correctionStatus");
  const correctionError = document.getElementById("correctionError");
  const correctionComparison = document.getElementById("correctionComparison");
  const correctionExportRow = document.getElementById("correctionExportRow");
  const exportCsvLink = document.getElementById("exportCsvLink");
  const exportJsonLink = document.getElementById("exportJsonLink");

  // --- App state ------------------------------------------------------
  const state = {
    currentStep: "upload",
    file: null,
    objectUrl: null,
    imageHashPromise: null, // SHA-256 of the uploaded file, computed client-side so we can
                             // identify a sample later without ever uploading/storing the image
    naturalWidth: 0,
    naturalHeight: 0,
    cal: {
      points: [], // [{x,y}] in natural coords, max 2
      knownDistance: null,
      unit: "cm",
      pixelsPerMm: null,
    },
    roi: null, // {x, y, width, height} in natural coords -- the PRIMARY approved measurement
               // area, derived from rois[0] on approval. Multi-region independent analysis is
               // a later stage, not yet built; the existing single-ROI /analyze call downstream
               // (orientation/analyze/results steps) still reads this exactly as before.
    rois: [], // [{id, label, x, y, width, height, source: "auto"|"manual"}] in natural coords --
              // all measurement areas shown/edited on the "Review Measurement Areas" step.
    proposedRois: [], // snapshot of the last auto-proposal, so "Reset to Proposed" doesn't need a re-fetch
    selectedRoiId: null,
    roiAddMode: false, // true while "Add Measurement Area" is armed -- next drag draws a new box
    roiDrag: null, // active drag interaction descriptor: {mode: "create"|"move"|"resize", roiId, ...}
    view: { zoom: 1, panX: 0, panY: 0 }, // image viewer pan/zoom, in display (unscaled) px
    panDrag: null, // active viewer-pan drag descriptor
    orientation: "vertical",
    structure: "unknown",
    result: null,
    showMeasurementAreas: false, // "Show measurement areas" toggle -- all approved ROI outlines, results step
    selectedDiagnosticRoiLabel: null, // which region's own detail is shown in Developer diagnostics' per-region panel
    serviceOnline: null, // null = unknown/not configured, true/false once checked
  };

  // --- Backend service status -------------------------------------------

  function setServiceStatus(mode, text) {
    serviceStatusEl.classList.remove("is-online", "is-offline", "is-checking");
    if (mode) serviceStatusEl.classList.add(`is-${mode}`);
    serviceStatusText.textContent = text;
    serviceStatusRetry.hidden = mode !== "offline";
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function pingHealthOnce() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/health`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } finally {
      clearTimeout(timer);
    }
  }

  // Bumped on every call to checkServiceHealth() so a fresh check (e.g. the
  // user clicking Retry) supersedes any still-waiting automatic retry loop
  // instead of the two racing to update the status pill.
  let healthCheckGeneration = 0;

  async function checkServiceHealth() {
    if (!CONFIG.API_BASE_URL) {
      state.serviceOnline = false;
      setServiceStatus(
        "",
        "Analysis service not configured yet — upload, calibration, and area selection still work."
      );
      return;
    }

    const generation = ++healthCheckGeneration;
    setServiceStatus("checking", "Checking analysis service…");

    // Render's free tier can take up to ~60s to wake a sleeping instance.
    // Rather than declaring "unavailable" after one quick timeout (which
    // would be wrong almost every time the service has been idle), retry
    // with backoff and keep the status pill showing a clear "waking up"
    // state — never a bare failure — until we've given it a fair chance.
    const totalAttempts = HEALTH_CHECK_RETRY_DELAYS_MS.length + 1;
    for (let attempt = 0; attempt < totalAttempts; attempt++) {
      if (generation !== healthCheckGeneration) return; // superseded by a newer check

      try {
        await pingHealthOnce();
        if (generation !== healthCheckGeneration) return;
        state.serviceOnline = true;
        setServiceStatus("online", "Analysis service is online.");
        return;
      } catch (err) {
        const isLastAttempt = attempt === totalAttempts - 1;
        if (generation !== healthCheckGeneration) return;

        if (isLastAttempt) {
          state.serviceOnline = false;
          setServiceStatus(
            "offline",
            "Analysis service is still unavailable after waiting for a possible cold start — it may genuinely be down. Try Retry, or try again shortly."
          );
          return;
        }

        const delay = HEALTH_CHECK_RETRY_DELAYS_MS[attempt];
        setServiceStatus(
          "checking",
          `Waking up analysis service (Render free-tier cold start can take up to a minute)… retrying in ${Math.round(delay / 1000)}s.`
        );
        await sleep(delay);
      }
    }
  }

  serviceStatusRetry.addEventListener("click", checkServiceHealth);

  // --- Step navigation --------------------------------------------------

  function goToStep(step) {
    state.currentStep = step;
    for (const s of STEPS) {
      const panel = panelEls[s];
      if (panel) panel.hidden = s !== step;
      const chip = stepEls[s];
      if (!chip) continue;
      chip.classList.toggle("is-active", s === step);
      chip.classList.toggle("is-done", STEPS.indexOf(s) < STEPS.indexOf(step));
    }
    updateZoomUI(); // pan-cursor affordance depends on the step (roi/calibrate reserve plain drag)
    updateRoiAddModeUI(); // add-mode crosshair cursor only applies while actually on the roi step
    render();
  }

  // --- Coordinate transforms -------------------------------------------

  function getScale() {
    if (!state.naturalWidth) return 1;
    return img.clientWidth / state.naturalWidth;
  }

  function naturalToDisplay(pt) {
    const s = getScale();
    return { x: pt.x * s, y: pt.y * s };
  }

  function displayToNatural(pt) {
    const s = getScale() || 1;
    return {
      x: clamp(pt.x / s, 0, state.naturalWidth),
      y: clamp(pt.y / s, 0, state.naturalHeight),
    };
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function eventToDisplayPoint(evt) {
    // canvas.getBoundingClientRect() reflects the CSS transform applied by
    // applyViewTransform() below (pan + zoom), so dividing back out by the
    // current zoom recovers the same "display px" space naturalToDisplay/
    // displayToNatural already work in — everything downstream (ROI drag,
    // calibration clicks, overlay drawing) needs no zoom-awareness at all.
    const rect = canvas.getBoundingClientRect();
    const zoom = state.view.zoom || 1;
    return { x: (evt.clientX - rect.left) / zoom, y: (evt.clientY - rect.top) / zoom };
  }

  // --- Viewer pan / zoom --------------------------------------------------
  //
  // Implemented as a single CSS transform (translate then scale, in that
  // order, with transform-origin pinned to 0 0) on #stage — the element
  // that already wraps both the image and the overlay canvas, so they
  // always move and scale together with zero extra bookkeeping. Only the
  // *rendered* pixels move; img.clientWidth (what getScale()/
  // naturalToDisplay/displayToNatural are built on) never changes, so
  // every other coordinate transform in this file is entirely unaware
  // zoom exists.

  function applyViewTransform() {
    stage.style.transform = `translate(${state.view.panX}px, ${state.view.panY}px) scale(${state.view.zoom})`;
    updateZoomUI();
  }

  function updateZoomUI() {
    zoomLevelEl.textContent = `${Math.round(state.view.zoom * 100)}%`;
    zoomOutBtn.disabled = state.view.zoom <= MIN_ZOOM + 1e-6;
    zoomInBtn.disabled = state.view.zoom >= MAX_ZOOM - 1e-6;
    const pannable = state.view.zoom > MIN_ZOOM + 1e-6;
    canvas.classList.toggle("is-pannable", pannable && state.currentStep !== "calibrate" && state.currentStep !== "roi");
  }

  function clampPan() {
    // Generous bound, recomputed fresh every call (so it's automatically
    // correct across zoom changes, image loads, and viewer resizes,
    // since img.clientWidth/Height already reflect all three): exactly
    // enough that ANY point in the image -- not just "some point stays
    // visible somewhere," but literally the leftmost/rightmost/top/
    // bottom-most pixel -- can be panned all the way to the viewer's
    // center at the current zoom level. #stage sits flex-centered in
    // #viewer at pan=0, so its rendered edges start equidistant from
    // center by exactly half its own on-screen size; reaching the
    // center from either edge takes a shift of that same half-size, in
    // either direction. That's the whole bound: no separate viewport
    // term needed, and it scales naturally with the image's own
    // displayed size at any zoom rather than a fixed pixel allowance.
    if (!state.naturalWidth) return;
    const z = state.view.zoom;
    const maxPanX = (img.clientWidth * z) / 2;
    const maxPanY = (img.clientHeight * z) / 2;
    state.view.panX = clamp(state.view.panX, -maxPanX, maxPanX);
    state.view.panY = clamp(state.view.panY, -maxPanY, maxPanY);
  }

  // Zoom by `factor`, keeping the content under (clientX, clientY) — or the
  // viewer's own center, if omitted — visually fixed on screen.
  function zoomBy(factor, clientX, clientY) {
    if (!state.naturalWidth) return;
    const rect = canvas.getBoundingClientRect();
    let cx = clientX;
    let cy = clientY;
    if (cx == null || cy == null) {
      // Default to the viewer's own stable (untransformed) center, not
      // the canvas's -- the canvas moves with the current pan/zoom
      // transform, and its rendered center always corresponds to the
      // same fixed content-space point (the image's own natural
      // center), regardless of how far you've panned. Using that as the
      // zoom-button anchor would silently drift the pan on every click
      // once you're no longer centered. Anchoring on the viewer's
      // center instead keeps whatever is *currently* centered in the
      // viewport centered as you zoom via the buttons.
      const viewerRect = viewer.getBoundingClientRect();
      cx = viewerRect.left + viewerRect.width / 2;
      cy = viewerRect.top + viewerRect.height / 2;
    }
    const oldZoom = state.view.zoom;
    const contentX = (cx - rect.left) / oldZoom;
    const contentY = (cy - rect.top) / oldZoom;
    const newZoom = clamp(oldZoom * factor, MIN_ZOOM, MAX_ZOOM);
    if (newZoom === oldZoom) return;
    state.view.panX += (oldZoom - newZoom) * contentX;
    state.view.panY += (oldZoom - newZoom) * contentY;
    state.view.zoom = newZoom;
    clampPan();
    applyViewTransform();
  }

  function resetView() {
    state.view = { zoom: 1, panX: 0, panY: 0 };
    applyViewTransform();
  }

  function onViewerWheel(evt) {
    if (!state.naturalWidth) return;
    evt.preventDefault();
    if (evt.ctrlKey) {
      // Pinch-to-zoom on trackpads is synthesized by the browser as wheel
      // events with ctrlKey set; a plain Ctrl+scroll does the same thing
      // intentionally, matching the common zoom convention elsewhere.
      const factor = Math.exp(-evt.deltaY * WHEEL_ZOOM_SENSITIVITY);
      zoomBy(factor, evt.clientX, evt.clientY);
    } else {
      // Plain two-finger scroll (or a mouse wheel) pans instead, matching
      // how map/image viewers usually treat an un-modified scroll gesture.
      state.view.panX -= evt.deltaX;
      state.view.panY -= evt.deltaY;
      clampPan();
      applyViewTransform();
    }
  }
  viewer.addEventListener("wheel", onViewerWheel, { passive: false });

  zoomInBtn.addEventListener("click", () => zoomBy(1.4));
  zoomOutBtn.addEventListener("click", () => zoomBy(1 / 1.4));
  zoomResetBtn.addEventListener("click", resetView);

  // Click-drag panning. On the "roi"/"calibrate" steps, plain left-drag
  // already means something (draw/move/resize a rectangle, or place a
  // calibration point), so panning there is gated behind a modifier
  // (middle-click, or Alt+left-click) to avoid stealing that gesture.
  // On every other step, a plain left-drag pans directly -- that's the
  // step where you're actually inspecting the image/results, and "the
  // image should be positionable" applies most directly there.
  function isPanTrigger(evt) {
    if (evt.button === 1) return true; // middle-click always pans
    if (evt.button !== 0) return false;
    if (evt.altKey) return true; // Alt+left-drag always pans
    return state.currentStep !== "roi" && state.currentStep !== "calibrate";
  }

  canvas.addEventListener("pointerdown", (evt) => {
    if (!isPanTrigger(evt)) return;
    evt.preventDefault();
    canvas.setPointerCapture(evt.pointerId);
    state.panDrag = { pointerId: evt.pointerId, lastX: evt.clientX, lastY: evt.clientY };
    canvas.classList.add("is-panning");
  });
  canvas.addEventListener("pointermove", (evt) => {
    if (!state.panDrag || evt.pointerId !== state.panDrag.pointerId) return;
    const dx = evt.clientX - state.panDrag.lastX;
    const dy = evt.clientY - state.panDrag.lastY;
    state.panDrag.lastX = evt.clientX;
    state.panDrag.lastY = evt.clientY;
    state.view.panX += dx;
    state.view.panY += dy;
    clampPan();
    applyViewTransform();
  });
  function endPanDrag(evt) {
    if (!state.panDrag || evt.pointerId !== state.panDrag.pointerId) return;
    if (canvas.hasPointerCapture(evt.pointerId)) canvas.releasePointerCapture(evt.pointerId);
    state.panDrag = null;
    canvas.classList.remove("is-panning");
  }
  canvas.addEventListener("pointerup", endPanDrag);
  canvas.addEventListener("pointercancel", endPanDrag);

  // --- Collapsible results panel ------------------------------------------

  let panelCollapsed = false;
  panelToggle.addEventListener("click", () => {
    panelCollapsed = !panelCollapsed;
    appEl.classList.toggle("is-panel-collapsed", panelCollapsed);
    panelToggle.textContent = panelCollapsed ? "›" : "‹"; // › / ‹
    panelToggle.setAttribute("aria-label", panelCollapsed ? "Expand panel" : "Collapse panel");
    panelToggle.setAttribute("aria-expanded", String(!panelCollapsed));
    // The viewer's available width changes as the panel collapses/expands;
    // the ResizeObserver on #stage picks that up too, but nudge it
    // immediately (and again after the CSS transition finishes) so the
    // overlay doesn't lag a frame behind during the animation.
    requestAnimationFrame(() => {
      syncCanvasSize();
      clampPan();
      render();
    });
    appEl.addEventListener(
      "transitionend",
      () => {
        syncCanvasSize();
        clampPan();
        render();
      },
      { once: true }
    );
  });

  // --- Canvas sizing / resize handling -----------------------------------

  function syncCanvasSize() {
    const dpr = window.devicePixelRatio || 1;
    const w = img.clientWidth;
    const h = img.clientHeight;
    if (w === 0 || h === 0) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const resizeObserver = new ResizeObserver(() => {
    syncCanvasSize();
    clampPan();
    render();
  });
  resizeObserver.observe(stage);
  window.addEventListener("resize", () => {
    syncCanvasSize();
    clampPan();
    render();
  });

  // --- Rendering ----------------------------------------------------

  function render() {
    if (!state.naturalWidth) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.currentStep === "calibrate") {
      drawCalibration();
    } else if (state.currentStep === "roi") {
      drawRoi(true);
    } else if (state.currentStep === "orientation" || state.currentStep === "analyze") {
      drawRoi(false);
    } else if (state.currentStep === "results") {
      drawRoi(false);
      drawResultOverlay();
    }
  }

  function drawCalibration() {
    const pts = state.cal.points.map(naturalToDisplay);
    if (pts.length === 2) {
      ctx.strokeStyle = WALE_COLOR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.stroke();

      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const pxDist = Math.hypot(
        state.cal.points[1].x - state.cal.points[0].x,
        state.cal.points[1].y - state.cal.points[0].y
      );
      drawLabel(`${pxDist.toFixed(1)} px`, midX + 8, midY - 8);
    }
    pts.forEach((p, i) => {
      ctx.fillStyle = WALE_COLOR;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#060707";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(i === 0 ? "A" : "B", p.x, p.y);
    });
  }

  function drawLabel(text, x, y) {
    ctx.font = "12px monospace";
    const padding = 4;
    const metrics = ctx.measureText(text);
    ctx.fillStyle = "rgba(6,7,7,0.88)";
    ctx.fillRect(x - padding, y - 12, metrics.width + padding * 2, 16);
    ctx.fillStyle = "#e9ecec";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y - 4);
  }

  function roiSwatchColor(roi) {
    return roi.source === "manual" ? COURSE_COLOR : WALE_COLOR;
  }

  function roiHandles(rect) {
    const tl = naturalToDisplay({ x: rect.x, y: rect.y });
    const br = naturalToDisplay({ x: rect.x + rect.width, y: rect.y + rect.height });
    return {
      tl,
      tr: { x: br.x, y: tl.y },
      bl: { x: tl.x, y: br.y },
      br,
    };
  }

  function drawRoi(editable) {
    // On the "Review Measurement Areas" step itself, draw every candidate
    // box (labeled, selected one editable) -- see drawAllRois. Every
    // other step that still shows a rectangle (orientation/analyze/
    // results) shows only the single approved PRIMARY area (state.roi),
    // read-only, exactly as before multi-ROI review existed.
    if (state.currentStep === "roi") {
      drawAllRois();
      return;
    }
    if (!state.roi) return;
    const tl = naturalToDisplay({ x: state.roi.x, y: state.roi.y });
    const w = state.roi.width * getScale();
    const h = state.roi.height * getScale();

    ctx.strokeStyle = WALE_COLOR;
    ctx.lineWidth = 2;
    ctx.setLineDash(editable ? [] : [6, 4]);
    ctx.strokeRect(tl.x, tl.y, w, h);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(15,125,125,0.1)";
    ctx.fillRect(tl.x, tl.y, w, h);

    if (editable) {
      const handles = roiHandles(state.roi);
      ctx.fillStyle = WALE_COLOR;
      for (const key of ["tl", "tr", "bl", "br"]) {
        const p = handles[key];
        ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
      }
    }
  }

  // Draws every candidate measurement area on the review step: a subtle
  // dashed outline + label chip for each, a solid outline + resize
  // handles for whichever one is currently selected. Manually-added areas
  // get the course color instead of the wale color so they're visually
  // distinguishable from auto-proposed ones at a glance (also reflected
  // in the list below the image).
  function drawAllRois() {
    for (const r of state.rois) {
      const isSelected = r.id === state.selectedRoiId;
      const color = roiSwatchColor(r);
      const tl = naturalToDisplay({ x: r.x, y: r.y });
      const w = r.width * getScale();
      const h = r.height * getScale();

      ctx.strokeStyle = color;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.setLineDash(isSelected ? [] : [5, 4]);
      ctx.strokeRect(tl.x, tl.y, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = isSelected ? "rgba(15,125,125,0.16)" : "rgba(15,125,125,0.06)";
      ctx.fillRect(tl.x, tl.y, w, h);

      ctx.font = "bold 12px monospace";
      const padding = 4;
      const metrics = ctx.measureText(r.label);
      ctx.fillStyle = color;
      ctx.fillRect(tl.x, tl.y, metrics.width + padding * 2, 16);
      ctx.fillStyle = "#060707";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(r.label, tl.x + padding, tl.y + 8);

      if (isSelected) {
        const handles = roiHandles(r);
        ctx.fillStyle = color;
        for (const key of ["tl", "tr", "bl", "br"]) {
          const p = handles[key];
          ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
        }
      }
    }
  }

  function drawResultOverlay() {
    const result = state.result;
    if (!result || !state.roi) return;
    const roiTop = naturalToDisplay({ x: state.roi.x, y: state.roi.y });
    const roiBottom = naturalToDisplay({
      x: state.roi.x + state.roi.width,
      y: state.roi.y + state.roi.height,
    });

    const waleIsVertical = state.orientation === "vertical";

    drawAxisLines(result.wale.positions_px, waleIsVertical, WALE_COLOR, roiTop, roiBottom);
    drawAxisLines(result.course.positions_px, !waleIsVertical, COURSE_COLOR, roiTop, roiBottom);

    if (showLoopCentersCheck.checked && result.loop_centers_px && result.loop_centers_px.length) {
      drawLoopCenters(result.loop_centers_px, "#e9ecec");
    }

    // "Show detected loops": the currently SELECTED region's own
    // loop-lattice experiment result (see Developer diagnostics' per-
    // region selector), drawn within THAT region's own bounds -- not
    // necessarily the primary/overlay region above. Falls back to the
    // top-level (primary) loop_lattice_debug when there's no multi-region
    // diagnostics at all (a legacy single-region result).
    if (showVShapeLoopsCheck.checked) {
      const mr = result.multi_roi;
      let d = result.loop_lattice_debug;
      let dRoiTop = roiTop;
      let dRoiBottom = roiBottom;
      if (mr && mr.per_roi && mr.per_roi.length) {
        const m = mr.per_roi.find((x) => x.label === state.selectedDiagnosticRoiLabel) || mr.per_roi[0];
        d = m.loop_lattice_debug;
        dRoiTop = naturalToDisplay({ x: m.x, y: m.y });
        dRoiBottom = naturalToDisplay({ x: m.x + m.width, y: m.y + m.height });
      }
      if (d) {
        // Inferred wale columns first (so points draw on top of the lines).
        if (d.wale_columns_px && d.wale_columns_px.length) {
          drawAxisLines(d.wale_columns_px, waleIsVertical, "#e0b830", dRoiTop, dRoiBottom);
        }
        if (d.direct_centers_px && d.direct_centers_px.length) {
          drawLoopCenters(d.direct_centers_px, "#4fd67a");
        }
        if (d.inferred_centers_px && d.inferred_centers_px.length) {
          drawHollowCenters(d.inferred_centers_px, "#ff9f43");
        }
      }
    }

    if (state.showMeasurementAreas) {
      drawApprovedAreaOutlines();
    }
  }

  // "Show measurement areas" toggle: every approved area's outline, drawn
  // subtly (dashed, low alpha, no fill/handles) so the user can see which
  // parts of the fabric contributed to the result without the display
  // becoming as busy as the review step's fully-editable view.
  function drawApprovedAreaOutlines() {
    for (const roi of state.rois) {
      const tl = naturalToDisplay({ x: roi.x, y: roi.y });
      const w = roi.width * getScale();
      const h = roi.height * getScale();
      const isPrimary =
        state.roi &&
        roi.x === state.roi.x && roi.y === state.roi.y &&
        roi.width === state.roi.width && roi.height === state.roi.height;
      ctx.save();
      ctx.strokeStyle = roiSwatchColor(roi);
      ctx.lineWidth = isPrimary ? 1.5 : 1;
      ctx.globalAlpha = 0.55;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(tl.x, tl.y, w, h);
      ctx.restore();
      ctx.font = "10px monospace";
      ctx.fillStyle = roiSwatchColor(roi);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(roi.label, tl.x + 3, tl.y + 2);
    }
  }

  function drawLoopCenters(centers, color) {
    ctx.fillStyle = color || "#e9ecec";
    ctx.globalAlpha = 0.85;
    for (const [cx, cy] of centers) {
      const p = naturalToDisplay({ x: cx, y: cy });
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Hollow markers -- the lattice's INFERRED/missing loop positions (a
  // column crossing a course row with no direct V-shape detection near
  // it), kept visually distinct from real, individually-measured
  // detections (drawLoopCenters' solid dots) so the two are never
  // confused: "the CV actually saw a loop here" vs. "the lattice
  // predicts a loop should exist here."
  function drawHollowCenters(centers, color) {
    ctx.strokeStyle = color || "#ff9f43";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.85;
    for (const [cx, cy] of centers) {
      const p = naturalToDisplay({ x: cx, y: cy });
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawAxisLines(positions, isVertical, color, roiTop, roiBottom) {
    if (!positions || positions.length === 0) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.9;
    for (const pos of positions) {
      ctx.beginPath();
      if (isVertical) {
        const dispX = pos * getScale();
        ctx.moveTo(dispX, roiTop.y);
        ctx.lineTo(dispX, roiBottom.y);
      } else {
        const dispY = pos * getScale();
        ctx.moveTo(roiTop.x, dispY);
        ctx.lineTo(roiBottom.x, dispY);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  async function computeFileHash(file) {
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // --- Step 1: Upload ---------------------------------------------------

  function handleFile(file) {
    uploadError.hidden = true;
    if (!ALLOWED_TYPES.includes(file.type)) {
      showUploadError("Unsupported file type. Please upload a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      showUploadError(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max 15 MB.`
      );
      return;
    }

    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = URL.createObjectURL(file);
    state.file = file;
    // Compute a content hash in the background so a later ground-truth
    // correction can identify this exact sample without ever uploading or
    // storing the image itself. Non-blocking: only awaited at save time.
    state.imageHashPromise = computeFileHash(file).catch(() => null);

    img.onload = () => {
      state.naturalWidth = img.naturalWidth;
      state.naturalHeight = img.naturalHeight;
      viewerEmpty.hidden = true;
      stage.hidden = false;
      zoomControls.hidden = false;
      // Reset any prior interaction state for a fresh image.
      state.cal = { points: [], knownDistance: null, unit: unitSelect.value, pixelsPerMm: null };
      state.roi = null;
      state.result = null;
      state.showMeasurementAreas = false;
      state.selectedDiagnosticRoiLabel = null;
      resetCalibrationUI();
      resetRoiUI();
      resetView();
      syncCanvasSize();
      goToStep("calibrate");
    };
    img.src = state.objectUrl;
  }

  function showUploadError(msg) {
    uploadError.textContent = msg;
    uploadError.hidden = false;
  }

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
  });

  ["dragover", "dragenter"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    })
  );
  ["dragleave", "dragend"].forEach((evt) =>
    dropzone.addEventListener(evt, () => dropzone.classList.remove("is-dragover"))
  );
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("is-dragover");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  // --- Step 2: Calibrate -------------------------------------------------

  function resetCalibrationUI() {
    calStatus.textContent = "Click the first point.";
    calConfirmBtn.disabled = true;
    ppmPreview.textContent = "";
    calError.hidden = true;
    knownDistanceInput.value = "";
  }

  function updateCalibrationUI() {
    if (state.cal.points.length < 2) {
      calStatus.textContent =
        state.cal.points.length === 0 ? "Click the first point." : "Click the second point.";
      calConfirmBtn.disabled = true;
      ppmPreview.textContent = "";
      return;
    }
    calStatus.textContent = "Enter the known distance between the two points, then confirm.";
    updatePpmPreview();
  }

  function updatePpmPreview() {
    const known = parseFloat(knownDistanceInput.value);
    if (state.cal.points.length === 2 && known > 0) {
      const pxDist = Math.hypot(
        state.cal.points[1].x - state.cal.points[0].x,
        state.cal.points[1].y - state.cal.points[0].y
      );
      const unitToMm = { mm: 1, cm: 10, in: 25.4 };
      const mm = known * unitToMm[unitSelect.value];
      const ppm = pxDist / mm;
      ppmPreview.textContent = `≈ ${ppm.toFixed(3)} px/mm`;
      calConfirmBtn.disabled = false;
    } else {
      ppmPreview.textContent = "";
      calConfirmBtn.disabled = true;
    }
  }

  knownDistanceInput.addEventListener("input", updatePpmPreview);
  unitSelect.addEventListener("change", updatePpmPreview);

  calRedoBtn.addEventListener("click", () => {
    state.cal.points = [];
    resetCalibrationUI();
    render();
  });

  calConfirmBtn.addEventListener("click", async () => {
    const known = parseFloat(knownDistanceInput.value);
    if (state.cal.points.length !== 2 || !(known > 0)) {
      calError.textContent = "Please click two points and enter a positive known distance.";
      calError.hidden = false;
      return;
    }
    calError.hidden = true;
    state.cal.knownDistance = known;
    state.cal.unit = unitSelect.value;
    goToStep("roi");
    await proposeMeasurementAreas();
  });

  // --- Step 3: Review Measurement Areas -----------------------------
  //
  // After calibration, the system proposes several candidate square
  // measurement areas (see backend /propose-rois, which wraps analysis.
  // gauge_analysis.propose_measurement_rois) and STOPS here so the user
  // can review, edit, add, or remove areas before anything is analyzed.
  // Approving carries the areas forward as state.rois; state.roi (the
  // single legacy field the rest of the app still reads) is set to the
  // first approved area on approval -- multi-region independent analysis
  // is a later stage, not yet built.

  let roiIdCounter = 0;
  function nextRoiId() {
    roiIdCounter += 1;
    return `roi-${roiIdCounter}`;
  }

  const ROI_LABELS = "ABCDEFGHIJ";
  function nextRoiLabel() {
    const used = new Set(state.rois.map((r) => r.label));
    for (const ch of ROI_LABELS) {
      if (!used.has(ch)) return ch;
    }
    return String(state.rois.length + 1);
  }

  function resetRoiUI() {
    state.rois = [];
    state.proposedRois = [];
    state.selectedRoiId = null;
    state.roiAddMode = false;
    roiStatus.textContent = "Draw a rectangle on the image.";
    roiError.hidden = true;
    roiConfirmBtn.disabled = true;
    roiDeleteSelectedBtn.disabled = true;
    updateRoiAddModeUI();
    renderRoiList();
  }

  function updateRoiAddModeUI() {
    roiAddModeBtn.classList.toggle("is-active", state.roiAddMode);
    roiAddModeBtn.textContent = state.roiAddMode ? "Cancel Add" : "Add Measurement Area";
    canvas.classList.toggle("is-roi-add-mode", state.roiAddMode && state.currentStep === "roi");
  }

  function currentPixelsPerMm() {
    if (state.cal.points.length !== 2 || !(state.cal.knownDistance > 0)) return null;
    const unitToMm = { mm: 1, cm: 10, in: 25.4 };
    const pxDist = Math.hypot(
      state.cal.points[1].x - state.cal.points[0].x,
      state.cal.points[1].y - state.cal.points[0].y
    );
    const mm = state.cal.knownDistance * unitToMm[state.cal.unit];
    return mm > 0 ? pxDist / mm : null;
  }

  function renderRoiList() {
    if (!state.rois.length) {
      roiList.innerHTML =
        '<li class="tgr-roi-list__empty">No measurement areas yet — proposals will appear here, or use "Add Measurement Area".</li>';
      return;
    }
    const ppm = currentPixelsPerMm();
    roiList.innerHTML = state.rois
      .map((r) => {
        const tooSmall = r.width < MIN_ROI_NATURAL_PX || r.height < MIN_ROI_NATURAL_PX;
        const sizeText = ppm
          ? `${(r.width / ppm / 25.4).toFixed(2)} × ${(r.height / ppm / 25.4).toFixed(2)} in`
          : `${Math.round(r.width)} × ${Math.round(r.height)} px`;
        const kindText = r.source === "manual" ? "Manual area" : "Proposed area";
        return `
          <li class="tgr-roi-list__item${r.id === state.selectedRoiId ? " is-selected" : ""}${r.source === "manual" ? " is-manual" : ""}" data-roi-id="${r.id}">
            <span class="tgr-roi-list__swatch">${escapeHtml(r.label)}</span>
            <span class="tgr-roi-list__meta">
              <span>${kindText}${tooSmall ? " — too small" : ""}</span>
              <span>${sizeText}</span>
            </span>
            <button type="button" class="tgr-roi-list__remove" data-remove-roi-id="${r.id}" aria-label="Remove area ${escapeHtml(r.label)}">&times;</button>
          </li>`;
      })
      .join("");
  }

  function selectRoi(id) {
    state.selectedRoiId = id;
    updateRoiUI();
    render();
  }

  function removeRoi(id) {
    state.rois = state.rois.filter((r) => r.id !== id);
    if (state.selectedRoiId === id) {
      state.selectedRoiId = state.rois.length ? state.rois[state.rois.length - 1].id : null;
    }
    updateRoiUI();
    render();
  }

  roiList.addEventListener("click", (e) => {
    const removeBtn = e.target.closest("[data-remove-roi-id]");
    if (removeBtn) {
      removeRoi(removeBtn.dataset.removeRoiId);
      return;
    }
    const item = e.target.closest("[data-roi-id]");
    if (item) selectRoi(item.dataset.roiId);
  });

  function updateRoiUI() {
    const count = state.rois.length;
    const tooSmall = state.rois.filter((r) => r.width < MIN_ROI_NATURAL_PX || r.height < MIN_ROI_NATURAL_PX);
    if (count === 0) {
      roiStatus.textContent = state.roiAddMode
        ? "Draw a rectangle on the image to add a measurement area."
        : "No measurement areas yet.";
    } else if (tooSmall.length) {
      roiStatus.textContent = `${tooSmall.map((r) => r.label).join(", ")} too small — minimum ${MIN_ROI_NATURAL_PX}×${MIN_ROI_NATURAL_PX}px.`;
    } else {
      roiStatus.textContent = `${count} measurement area${count === 1 ? "" : "s"} — review, then approve.`;
    }
    roiConfirmBtn.disabled = count === 0 || tooSmall.length > 0;
    roiDeleteSelectedBtn.disabled = !state.selectedRoiId;
    renderRoiList();
  }

  // Calls the backend to propose candidate measurement areas from the
  // calibrated scale. On any failure (service not configured/unreachable,
  // or the image genuinely has no suitable areas), falls back to leaving
  // area selection entirely manual -- "computer proposes, human reviews,
  // computer measures," never "computer removes human control," so a
  // failed proposal is a degraded starting point, not a dead end.
  async function proposeMeasurementAreas() {
    state.rois = [];
    state.proposedRois = [];
    state.selectedRoiId = null;
    roiError.hidden = true;
    updateRoiUI();
    render();

    if (!CONFIG.API_BASE_URL) {
      roiStatus.textContent = "Analysis service not configured — add a measurement area manually below.";
      state.roiAddMode = true;
      updateRoiAddModeUI();
      return;
    }

    roiStatus.textContent = "Proposing measurement areas…";

    try {
      const fd = new FormData();
      fd.append("file", state.file);
      fd.append("cal_x1", state.cal.points[0].x);
      fd.append("cal_y1", state.cal.points[0].y);
      fd.append("cal_x2", state.cal.points[1].x);
      fd.append("cal_y2", state.cal.points[1].y);
      fd.append("known_distance", state.cal.knownDistance);
      fd.append("unit", state.cal.unit);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
      let res;
      try {
        res = await fetch(`${CONFIG.API_BASE_URL}/propose-rois`, {
          method: "POST",
          body: fd,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned an unexpected response (HTTP ${res.status}).`);
      }
      if (!res.ok) {
        throw new Error(data.message || `Proposing measurement areas failed (HTTP ${res.status}).`);
      }

      const proposed = (data.rois || []).map((r) => ({
        id: nextRoiId(),
        label: r.label,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        source: "auto",
        qualityScore: r.quality_score,
      }));

      if (!proposed.length) {
        roiStatus.textContent = data.message || "No suitable measurement areas were found automatically.";
        roiError.textContent = "Add a measurement area manually below.";
        roiError.hidden = false;
        state.roiAddMode = true;
        updateRoiAddModeUI();
        return;
      }

      state.proposedRois = proposed.map((r) => ({ ...r }));
      state.rois = proposed;
      state.selectedRoiId = proposed[0].id;
      updateRoiUI();
      render();
    } catch (err) {
      if (err && err.name === "AbortError") {
        roiStatus.textContent = "Proposing measurement areas timed out.";
      } else if (err instanceof TypeError) {
        roiStatus.textContent = "Could not reach the analysis service to propose measurement areas.";
      } else {
        roiStatus.textContent = (err && err.message) || "Could not propose measurement areas.";
      }
      roiError.textContent = "You can still add a measurement area manually below.";
      roiError.hidden = false;
      state.roiAddMode = true;
      updateRoiAddModeUI();
      updateRoiUI();
      render();
    }
  }

  roiAddModeBtn.addEventListener("click", () => {
    state.roiAddMode = !state.roiAddMode;
    updateRoiAddModeUI();
  });

  roiDeleteSelectedBtn.addEventListener("click", () => {
    if (state.selectedRoiId) removeRoi(state.selectedRoiId);
  });

  roiResetBtn.addEventListener("click", () => {
    state.rois = state.proposedRois.map((r) => ({ ...r }));
    state.selectedRoiId = state.rois.length ? state.rois[0].id : null;
    state.roiAddMode = false;
    roiError.hidden = true;
    updateRoiAddModeUI();
    updateRoiUI();
    render();
  });

  roiConfirmBtn.addEventListener("click", () => {
    if (!state.rois.length) return;
    // Stage 1: the multi-region independent-analysis/consensus pipeline
    // is a later stage, not yet built. The existing single-ROI /analyze
    // call downstream still needs exactly one ROI -- use the first
    // approved area as that primary region, preserving the entire
    // orientation/analyze/results flow unchanged.
    const primary = state.rois[0];
    state.roi = { x: primary.x, y: primary.y, width: primary.width, height: primary.height };
    goToStep("orientation");
  });

  function normalizeRect(a, b) {
    return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      width: Math.abs(a.x - b.x),
      height: Math.abs(a.y - b.y),
    };
  }

  function hitTestHandle(displayPt, rect) {
    const handles = roiHandles(rect);
    for (const [key, p] of Object.entries(handles)) {
      if (Math.hypot(displayPt.x - p.x, displayPt.y - p.y) <= HANDLE_HIT_RADIUS) return key;
    }
    return null;
  }

  function pointInRoiDisplay(displayPt, rect) {
    const tl = naturalToDisplay({ x: rect.x, y: rect.y });
    const w = rect.width * getScale();
    const h = rect.height * getScale();
    return (
      displayPt.x >= tl.x && displayPt.x <= tl.x + w && displayPt.y >= tl.y && displayPt.y <= tl.y + h
    );
  }

  // --- Pointer interaction (calibration clicks + ROI drag) --------------

  canvas.addEventListener("pointerdown", (evt) => {
    if (state.panDrag) return; // the viewer-pan listener above already claimed this gesture

    if (state.currentStep === "calibrate") {
      if (state.cal.points.length >= 2) return; // must Redo first
      const pt = displayToNatural(eventToDisplayPoint(evt));
      state.cal.points.push(pt);
      updateCalibrationUI();
      render();
      return;
    }

    if (state.currentStep === "roi") {
      const dispPt = eventToDisplayPoint(evt);
      canvas.setPointerCapture(evt.pointerId);

      if (!state.roiAddMode) {
        // Only the currently-selected box exposes resize handles (drawAllRois
        // only draws them for it), so only it needs to be handle-tested.
        const selected = state.rois.find((r) => r.id === state.selectedRoiId);
        if (selected) {
          const handle = hitTestHandle(dispPt, selected);
          if (handle) {
            state.roiDrag = { mode: "resize", roiId: selected.id, handle, startRoi: { ...selected } };
            return;
          }
        }
        // Hit-test bodies topmost-first (later in the array = drawn last =
        // visually on top) so overlapping boxes pick the one the user
        // actually clicked on.
        for (let i = state.rois.length - 1; i >= 0; i--) {
          const r = state.rois[i];
          if (pointInRoiDisplay(dispPt, r)) {
            state.selectedRoiId = r.id;
            state.roiDrag = {
              mode: "move",
              roiId: r.id,
              startNatural: displayToNatural(dispPt),
              startRoi: { ...r },
            };
            updateRoiUI();
            render();
            return;
          }
        }
        // Clicked empty space -- just deselect, don't start drawing (that
        // requires "Add Measurement Area" to be armed, so an accidental
        // click on the image can't silently create a stray box).
        state.selectedRoiId = null;
        updateRoiUI();
        render();
        return;
      }

      // Add mode: start drawing a brand-new labeled rectangle.
      const startNatural = displayToNatural(dispPt);
      const newRoi = {
        id: nextRoiId(),
        label: nextRoiLabel(),
        x: startNatural.x,
        y: startNatural.y,
        width: 0,
        height: 0,
        source: "manual",
      };
      state.rois.push(newRoi);
      state.selectedRoiId = newRoi.id;
      state.roiDrag = { mode: "create", roiId: newRoi.id, anchor: startNatural };
    }
  });

  canvas.addEventListener("pointermove", (evt) => {
    if (state.currentStep !== "roi" || !state.roiDrag) return;
    const dispPt = eventToDisplayPoint(evt);
    const natPt = displayToNatural(dispPt);
    const drag = state.roiDrag;
    const roi = state.rois.find((r) => r.id === drag.roiId);
    if (!roi) {
      state.roiDrag = null;
      return;
    }

    if (drag.mode === "create") {
      let target = natPt;
      if (evt.shiftKey) {
        target = squareSnappedPoint(drag.anchor, natPt);
      }
      Object.assign(roi, normalizeRect(drag.anchor, target));
    } else if (drag.mode === "move") {
      const dx = natPt.x - drag.startNatural.x;
      const dy = natPt.y - drag.startNatural.y;
      const w = drag.startRoi.width;
      const h = drag.startRoi.height;
      roi.x = clamp(drag.startRoi.x + dx, 0, state.naturalWidth - w);
      roi.y = clamp(drag.startRoi.y + dy, 0, state.naturalHeight - h);
      roi.width = w;
      roi.height = h;
    } else if (drag.mode === "resize") {
      const r = drag.startRoi;
      let x1 = r.x,
        y1 = r.y,
        x2 = r.x + r.width,
        y2 = r.y + r.height;
      if (drag.handle.includes("l")) x1 = natPt.x;
      if (drag.handle.includes("r")) x2 = natPt.x;
      if (drag.handle.includes("t")) y1 = natPt.y;
      if (drag.handle.includes("b")) y2 = natPt.y;

      if (evt.shiftKey) {
        // Anchor at the corner OPPOSITE the one being dragged, and force
        // the dragged corner to the same distance on both axes (clamped to
        // whatever room is actually available toward the image edge) so
        // the area stays square instead of just constraining afterward.
        const fixedX = drag.handle.includes("l") ? x2 : x1;
        const fixedY = drag.handle.includes("t") ? y2 : y1;
        const movingX = drag.handle.includes("l") ? x1 : x2;
        const movingY = drag.handle.includes("t") ? y1 : y2;
        const snapped = squareSnappedPoint({ x: fixedX, y: fixedY }, { x: movingX, y: movingY });
        if (drag.handle.includes("l")) x1 = snapped.x;
        else x2 = snapped.x;
        if (drag.handle.includes("t")) y1 = snapped.y;
        else y2 = snapped.y;
      }

      Object.assign(roi, normalizeRect({ x: x1, y: y1 }, { x: x2, y: y2 }));
    }
    updateRoiUI();
    render();
  });

  // Given a fixed anchor point and the raw (mouse-driven) opposite point,
  // return the opposite point adjusted so |dx| == |dy| (a square), using
  // whichever delta is larger and clamping to how much room is actually
  // available toward the image edge in that direction — so the square
  // never gets silently cropped back into a non-square by the ROI's own
  // later clamping.
  function squareSnappedPoint(anchor, raw) {
    const dx = raw.x - anchor.x;
    const dy = raw.y - anchor.y;
    const maxXSide = dx >= 0 ? state.naturalWidth - anchor.x : anchor.x;
    const maxYSide = dy >= 0 ? state.naturalHeight - anchor.y : anchor.y;
    const side = Math.min(Math.max(Math.abs(dx), Math.abs(dy)), maxXSide, maxYSide);
    return {
      x: anchor.x + Math.sign(dx || 1) * side,
      y: anchor.y + Math.sign(dy || 1) * side,
    };
  }

  function endRoiDrag(evt) {
    if (state.roiDrag && canvas.hasPointerCapture(evt.pointerId)) {
      canvas.releasePointerCapture(evt.pointerId);
    }
    if (state.roiDrag && state.roiDrag.mode === "create") {
      // Drop a stray/near-zero-size box (e.g. a single click with no
      // drag), and exit add-mode automatically after drawing one box --
      // matches the single-ROI step's old behavior of ending the
      // gesture on pointerup, extended to "one box per Add click."
      const roi = state.rois.find((r) => r.id === state.roiDrag.roiId);
      if (roi && (roi.width < 4 || roi.height < 4)) {
        state.rois = state.rois.filter((r) => r.id !== roi.id);
        state.selectedRoiId = state.rois.length ? state.rois[state.rois.length - 1].id : null;
      }
      state.roiAddMode = false;
      updateRoiAddModeUI();
    }
    state.roiDrag = null;
    updateRoiUI();
    render();
  }
  canvas.addEventListener("pointerup", endRoiDrag);
  canvas.addEventListener("pointercancel", endRoiDrag);

  // --- Step 4: Orientation -----------------------------------------------

  document.querySelectorAll('input[name="orientation"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (e.target.checked) state.orientation = e.target.value;
    });
  });

  document.querySelectorAll('input[name="structure"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (e.target.checked) state.structure = e.target.value;
    });
  });

  orientationConfirmBtn.addEventListener("click", () => {
    buildAnalyzeSummary();
    goToStep("analyze");
  });

  // --- Step 5: Analyze -------------------------------------------------

  function buildAnalyzeSummary() {
    const unitToMm = { mm: 1, cm: 10, in: 25.4 };
    const pxDist = Math.hypot(
      state.cal.points[1].x - state.cal.points[0].x,
      state.cal.points[1].y - state.cal.points[0].y
    );
    const mm = state.cal.knownDistance * unitToMm[state.cal.unit];
    const ppm = pxDist / mm;
    const regionCount = state.rois.length;
    const areaLabels = state.rois.map((r) => r.label).join(", ");

    const rows = [
      ["File", state.file.name],
      ["Image size", `${state.naturalWidth} × ${state.naturalHeight} px`],
      ["Calibration", `${state.cal.knownDistance} ${state.cal.unit} (${pxDist.toFixed(1)} px)`],
      ["Scale", `${ppm.toFixed(3)} px/mm`],
      [
        "Measurement areas",
        `${regionCount} region${regionCount === 1 ? "" : "s"} (${areaLabels})`,
      ],
      ["Wale orientation", state.orientation === "vertical" ? "Vertical ↕" : "Horizontal ↔"],
      ["Structure", state.structure === "jersey" ? "Jersey / Single Knit" : "Unknown"],
    ];
    analyzeSummary.innerHTML = rows
      .map(([k, v]) => `<li><span>${escapeHtml(k)}</span><span>${escapeHtml(String(v))}</span></li>`)
      .join("");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  analyzeBackBtn.addEventListener("click", () => goToStep("orientation"));

  analyzeBtn.addEventListener("click", async () => {
    analyzeError.hidden = true;

    if (!CONFIG.API_BASE_URL) {
      analyzeError.textContent =
        "Analysis service is not configured yet. The backend hasn't been deployed/linked to this page — " +
        "everything up through orientation selection works, but there's nothing to send the image to.";
      analyzeError.hidden = false;
      return;
    }

    analyzeStatus.hidden = false;
    analyzeStatus.textContent = "Analyzing…";
    analyzeBtn.disabled = true;

    try {
      const fd = new FormData();
      fd.append("file", state.file);
      // Every approved measurement area, in full-image pixel coordinates
      // -- the backend analyzes each one COMPLETELY INDEPENDENTLY (see
      // analyze_multi_roi) and returns a robust cross-region consensus
      // as wale/course below; state.roi is updated afterward to whichever
      // approved area the backend used as the primary/overlay region.
      fd.append(
        "rois_json",
        JSON.stringify(
          state.rois.map((r) => ({
            label: r.label,
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            source: r.source,
          }))
        )
      );
      fd.append("cal_x1", state.cal.points[0].x);
      fd.append("cal_y1", state.cal.points[0].y);
      fd.append("cal_x2", state.cal.points[1].x);
      fd.append("cal_y2", state.cal.points[1].y);
      fd.append("known_distance", state.cal.knownDistance);
      fd.append("unit", state.cal.unit);
      fd.append("orientation", state.orientation);
      fd.append("structure", state.structure);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
      let res;
      try {
        res = await fetch(`${CONFIG.API_BASE_URL}/analyze-multi`, {
          method: "POST",
          body: fd,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned an unexpected response (HTTP ${res.status}).`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || `Analysis failed (HTTP ${res.status}).`);
      }

      state.result = data;
      // The backend picks one approved area as the "primary" region (the
      // first one accepted into both axes' consensus) and echoes its
      // bounds back as `roi` -- align state.roi to it so every existing
      // overlay/verify-measurement calculation (built around a single
      // ROI) keeps working unchanged, now pointed at a real, specifically
      // measured region rather than an arbitrary placeholder.
      if (data.roi) {
        state.roi = { x: data.roi.x, y: data.roi.y, width: data.roi.width, height: data.roi.height };
      }
      state.selectedDiagnosticRoiLabel = data.multi_roi && data.multi_roi.primary_label;
      analyzeStatus.hidden = true;
      renderResults();
      goToStep("results");
    } catch (err) {
      analyzeStatus.hidden = true;
      if (err && err.name === "AbortError") {
        analyzeError.textContent =
          "The analysis service took too long to respond and the request was cancelled. " +
          "Free-tier hosts can be slow to wake up from a cold start — try again in ~30-60 seconds.";
      } else if (err instanceof TypeError) {
        // fetch() throws a bare TypeError for network failures / CORS rejections —
        // this is the "service unavailable" case the task calls out explicitly.
        analyzeError.textContent =
          "Could not reach the analysis service. It may be offline, waking up from a cold start, " +
          "or blocking requests from this page (CORS). Try the Retry button above, or try again shortly.";
      } else {
        analyzeError.textContent = (err && err.message) || "Analysis failed. Please try again.";
      }
      analyzeError.hidden = false;
    } finally {
      analyzeBtn.disabled = false;
    }
  });

  // --- Step 6: Results -------------------------------------------------

  function confidenceClass(c) {
    if (c < 0.4) return "is-low";
    if (c < 0.7) return "is-mid";
    return "";
  }

  // Single overall confidence word for the simplified results view --
  // the weaker of the two axes decides it, and an axis explicitly
  // flagged "uncertain" (see the backend's harmonic-ambiguity / low-
  // confidence-floor logic) always forces "Low", even if the raw
  // percentage alone would round up to "Medium". Detailed per-axis
  // confidence/percentages/reasons remain available in Developer
  // diagnostics -- this is deliberately the ONE number/word a normal
  // user needs.
  function overallConfidence(r) {
    if (r.wale.spacing_px == null || r.course.spacing_px == null) {
      return { level: "Low", value: 0 };
    }
    const value = Math.min(r.wale.confidence ?? 0, r.course.confidence ?? 0);
    const forcedLow = r.wale.status === "uncertain" || r.course.status === "uncertain";
    let level;
    if (forcedLow || value < 0.4) level = "Low";
    else if (value < 0.7) level = "Medium";
    else level = "High";
    return { level, value };
  }

  // Simplified primary number -- just the label and value. No per-axis
  // "uncertain" styling here anymore; the single Confidence card below
  // (plus the one-line message when it's Low) is the only confidence
  // signal a normal user sees. Detailed per-axis confidence, spacing in
  // px, detected-position counts, and uncertain reasons move to
  // Developer diagnostics (see axisDiagnosticsCard).
  function primaryBlock(label, value, color) {
    return `
      <div class="tgr-result-card__block">
        <div class="tgr-result-card__label">${label}</div>
        <div class="tgr-result-card__value" style="color:${color}">${value}</div>
      </div>`;
  }

  function confidenceCard(level) {
    return `
      <div class="tgr-result-card tgr-confidence-card">
        <div class="tgr-result-card__label">Confidence</div>
        <div class="tgr-confidence-word tgr-confidence-word--${level.toLowerCase()}">${escapeHtml(level)}</div>
      </div>`;
  }

  function secondaryMeasurementsCard(r) {
    const waleMm = r.wale.spacing_mm != null ? `${r.wale.spacing_mm.toFixed(2)} mm` : "—";
    const courseMm = r.course.spacing_mm != null ? `${r.course.spacing_mm.toFixed(2)} mm` : "—";
    return `
      <div class="tgr-result-card tgr-secondary-card">
        <div class="tgr-secondary-row"><span>Wale spacing</span><span>${waleMm}</span></div>
        <div class="tgr-secondary-row"><span>Course spacing</span><span>${courseMm}</span></div>
      </div>`;
  }

  // Full per-axis technical detail (confidence %, spacing in px,
  // detected-position count, uncertain reason) -- moved out of the
  // normal Results view into Developer diagnostics. Same information
  // as before, just no longer front-and-center for a normal user.
  function axisDiagnosticsCard(label, axis, color) {
    if (axis.spacing_px == null) {
      return `
        <div class="tgr-result-card">
          <div class="tgr-result-card__label">${label}</div>
          <div class="tgr-result-card__value" style="color:${color}">—</div>
          <div class="tgr-result-card__sub">Not reliably detected${axis.message ? ": " + escapeHtml(axis.message) : ""}</div>
        </div>`;
    }
    const uncertain = axis.status === "uncertain";
    return `
      <div class="tgr-result-card${uncertain ? " tgr-result-card--uncertain" : ""}">
        <div class="tgr-result-card__label">${label} spacing</div>
        <div class="tgr-result-card__value" style="color:${color}">${axis.spacing_mm.toFixed(2)} mm</div>
        <div class="tgr-result-card__sub">${axis.spacing_px.toFixed(1)} px &middot; ${axis.positions_px.length} detected</div>
        <div class="tgr-confidence-bar"><div class="tgr-confidence-bar__fill ${confidenceClass(axis.confidence)}" style="width:${Math.round(axis.confidence * 100)}%"></div></div>
        <div class="tgr-result-card__sub">Confidence: ${uncertain ? "Low — Uncertain" : `${Math.round(axis.confidence * 100)}%`}</div>
        ${uncertain ? `<div class="tgr-uncertain-badge">⚠ ${escapeHtml(axis.uncertain_reason || "Manual verification recommended.")}</div>` : ""}
      </div>`;
  }

  function renderResults() {
    const r = state.result;
    const wpi = r.wale.per_inch != null ? r.wale.per_inch.toFixed(2) : "—";
    const cpi = r.course.per_inch != null ? r.course.per_inch.toFixed(2) : "—";
    const { level } = overallConfidence(r);

    // Normal-user-facing Results: WALES/IN, COURSES/IN, one Confidence
    // word, and optional secondary spacing-in-mm -- no harmonic/scoring
    // terminology. See Developer diagnostics for everything else.
    let html = `
      <div class="tgr-result-card tgr-result-card--primary">
        ${primaryBlock("Wales / inch", wpi, WALE_COLOR)}
        ${primaryBlock("Courses / inch", cpi, COURSE_COLOR)}
      </div>`;
    html += confidenceCard(level);
    html += secondaryMeasurementsCard(r);

    resultsGrid.innerHTML = html;

    if (level === "Low") {
      resultsWarning.textContent = "Low confidence — verify the detected loops.";
      resultsWarning.hidden = false;
    } else {
      resultsWarning.hidden = true;
    }

    const axisDiagnosticsContent = document.getElementById("axisDiagnosticsContent");
    if (axisDiagnosticsContent) {
      axisDiagnosticsContent.innerHTML =
        `<div class="tgr-results-grid">` +
        axisDiagnosticsCard("Wale", r.wale, WALE_COLOR) +
        axisDiagnosticsCard("Course", r.course, COURSE_COLOR) +
        `<div class="tgr-result-card">
          <div class="tgr-result-card__label">Scale</div>
          <div class="tgr-result-card__value" style="font-size:1.05rem">${r.pixels_per_mm.toFixed(3)} px/mm</div>
        </div>
        <div class="tgr-result-card">
          <div class="tgr-result-card__label">Analyzed area</div>
          <div class="tgr-result-card__value" style="font-size:1.05rem">${r.analyzed_area_mm.width_mm.toFixed(1)} × ${r.analyzed_area_mm.height_mm.toFixed(1)} mm</div>
          <div class="tgr-result-card__sub">${r.analyzed_area_px.width} × ${r.analyzed_area_px.height} px</div>
        </div>` +
        `</div>`;
    }

    renderDetectionDetails(r);
    renderLoopLatticeComparison(r);
    renderMeasurementConsistency(r);
    renderRoiDiagSelector(r);
    initVerifySection(r);
    render();
  }

  // --- Multi-region diagnostics (Stage 2) ---------------------------------

  // Small, normal-results-visible summary of the cross-region consensus --
  // deliberately NOT the full per-region breakdown (that's Developer
  // diagnostics' per-region selector below). Hidden entirely for a legacy/
  // single-region result (r.multi_roi is only present from /analyze-multi).
  function renderMeasurementConsistency(r) {
    const mr = r.multi_roi;
    if (!mr || !mr.per_roi || mr.per_roi.length < 2) {
      measurementConsistencyPanel.hidden = true;
      showMeasurementAreasRow.hidden = !mr; // still offer the outline toggle for a single region
      return;
    }
    measurementConsistencyPanel.hidden = false;
    showMeasurementAreasRow.hidden = false;

    const regionCount = mr.per_roi.length;
    const row = (label, value) => `<div class="tgr-consistency-row"><span>${escapeHtml(label)}</span><span>${escapeHtml(String(value))}</span></div>`;
    const agreedText = (consensus) =>
      `${consensus.included_labels.length} of ${regionCount} agreed` +
      (consensus.excluded_labels.length ? ` — ${consensus.excluded_labels.length} excluded as outlier${consensus.excluded_labels.length === 1 ? "" : "s"}` : "");

    let html = "";
    html += row("Regions analyzed", regionCount);
    html += row("Wale agreement", agreedText(mr.wale_consensus));
    html += row("Course agreement", agreedText(mr.course_consensus));

    const outlierLines = [];
    for (const o of mr.wale_consensus.outliers) {
      outlierLines.push(`Wale ${o.label}: ${o.per_inch != null ? o.per_inch.toFixed(2) : "—"}/in — ${o.reason}`);
    }
    for (const o of mr.course_consensus.outliers) {
      outlierLines.push(`Course ${o.label}: ${o.per_inch != null ? o.per_inch.toFixed(2) : "—"}/in — ${o.reason}`);
    }
    const outlierHtml = outlierLines.map((line) => `<div class="tgr-consistency-outlier">⚠ ${escapeHtml(line)}</div>`).join("");

    measurementConsistencyContent.innerHTML = html + outlierHtml;
  }

  showMeasurementAreasCheck.addEventListener("change", () => {
    state.showMeasurementAreas = showMeasurementAreasCheck.checked;
    render();
  });

  // Developer diagnostics: let a region be inspected individually --
  // its own detected loop centers, inferred wale columns/course rows
  // (from that region's own loop-lattice experiment), WPI/CPI,
  // confidence, and whether it was included/excluded from consensus.
  function renderRoiDiagSelector(r) {
    const mr = r.multi_roi;
    if (!mr || !mr.per_roi || !mr.per_roi.length) {
      roiDiagSelectRow.hidden = true;
      roiDiagContent.innerHTML = "";
      return;
    }
    roiDiagSelectRow.hidden = false;
    const current = state.selectedDiagnosticRoiLabel;
    const hasCurrent = mr.per_roi.some((m) => m.label === current);
    if (!hasCurrent) state.selectedDiagnosticRoiLabel = mr.per_roi[0].label;

    roiDiagSelect.innerHTML = mr.per_roi
      .map((m) => `<option value="${escapeHtml(m.label)}"${m.label === state.selectedDiagnosticRoiLabel ? " selected" : ""}>Region ${escapeHtml(m.label)}${m.source === "manual" ? " (manual)" : ""}</option>`)
      .join("");

    renderRoiDiagContent(r);
  }

  function roiDiagTag(label, included) {
    return `<span class="tgr-roi-diag-card__tag ${included ? "is-included" : "is-excluded"}">${included ? "included" : "excluded"}</span>`;
  }

  function renderRoiDiagContent(r) {
    const mr = r.multi_roi;
    if (!mr) return;
    const m = mr.per_roi.find((x) => x.label === state.selectedDiagnosticRoiLabel);
    if (!m) {
      roiDiagContent.innerHTML = "";
      return;
    }
    const waleIncluded = mr.wale_consensus.included_labels.includes(m.label);
    const courseIncluded = mr.course_consensus.included_labels.includes(m.label);
    const waleWpi = m.wale.per_inch != null ? m.wale.per_inch.toFixed(2) : "—";
    const courseCpi = m.course.per_inch != null ? m.course.per_inch.toFixed(2) : "—";
    const d = m.loop_lattice_debug;
    const isCounted = m.wale_source === "loop_count";
    // What actually fed the wale consensus for this region: its counted
    // spacing (from the loop-lattice detector's own accepted columns)
    // when trustworthy, its periodicity estimate otherwise -- see the
    // module comment above _wale_count_candidate in gauge_analysis.py.
    const waleUsedWpi = isCounted && d && d.wale_per_inch != null ? d.wale_per_inch.toFixed(2) : waleWpi;

    roiDiagContent.innerHTML = `
      <div class="tgr-roi-diag-card">
        <div class="tgr-roi-diag-card__row"><span>Source</span><span>${m.source === "manual" ? "Manual" : "Auto-proposed"}</span></div>
        <div class="tgr-roi-diag-card__row"><span>Wale ${roiDiagTag("", waleIncluded)}</span><span>${waleUsedWpi}/in &middot; ${Math.round(m.wale.confidence * 100)}%</span></div>
        <div class="tgr-roi-diag-card__row"><span>Wale evidence used</span><span>${isCounted ? `counted (${d ? d.column_count : "?"} columns)` : "periodicity"}</span></div>
        ${isCounted ? "" : `<div class="tgr-roi-diag-card__row"><span>Periodicity estimate</span><span>${waleWpi}/in</span></div>`}
        <div class="tgr-roi-diag-card__row"><span>Course ${roiDiagTag("", courseIncluded)}</span><span>${courseCpi}/in &middot; ${Math.round(m.course.confidence * 100)}%</span></div>
        <div class="tgr-roi-diag-card__row"><span>ROI quality</span><span>${(m.quality_score * 100).toFixed(0)}%</span></div>
        ${d ? `<div class="tgr-roi-diag-card__row"><span>Loop-lattice detections</span><span>${d.direct_center_count} direct &middot; ${d.column_count} columns</span></div>` : ""}
      </div>`;
    render(); // re-draw the results overlay so it reflects the newly selected region
  }

  roiDiagSelect.addEventListener("change", () => {
    state.selectedDiagnosticRoiLabel = roiDiagSelect.value;
    renderRoiDiagContent(state.result);
  });

  // --- Detection Details (harmonic-candidate diagnostics) ----------------

  function scoreRow(labelText, value) {
    if (value == null) return "";
    return `<div class="tgr-debug-score-row"><span>${escapeHtml(labelText)}</span><span>${value.toFixed(2)}</span></div>`;
  }

  function detectionAxisBlock(label, axis) {
    const details = axis.candidate_details || [];
    let candidatesHtml;
    if (details.length && details[0].final_score != null) {
      // v0.3: full per-candidate scoring breakdown -- period, normalized
      // per-inch value, every evidence component that fed the combined
      // score, and the harmonic relationship to the raw autocorrelation
      // estimate. `selected` comes straight from the backend's own
      // decision, not a fuzzy re-match.
      candidatesHtml = details
        .map((d) => {
          const perInch = d.per_inch != null ? `${d.per_inch.toFixed(2)}/in` : "—";
          return `
            <div class="tgr-debug-candidate-card${d.selected ? " is-selected" : ""}">
              <div class="tgr-debug-candidate-card__head">
                <span class="tgr-debug-candidate-card__px">${d.period_px.toFixed(1)}px</span>
                <span class="tgr-debug-candidate-card__perinch">${escapeHtml(perInch)}</span>
                <span class="tgr-debug-candidate-card__harmonic">${escapeHtml(d.harmonic)}</span>
              </div>
              ${scoreRow("Autocorrelation", d.autocorr_score)}
              ${scoreRow("2D support", d.support_2d)}
              ${scoreRow("Structural score", d.structural_score)}
              ${scoreRow("Regional consensus", d.patch_consensus)}
              ${scoreRow("Phase consistency", d.phase_consistency)}
              ${scoreRow("Alternating phase", d.alternating_phase_score != null ? -d.alternating_phase_score : null)}
              <div class="tgr-debug-score-row tgr-debug-score-row--final"><span>Evidence score (decides winner)</span><span>${d.evidence_score != null ? d.evidence_score.toFixed(2) : "—"}</span></div>
              ${scoreRow("Harmonic penalty", d.harmonic_penalty != null ? -d.harmonic_penalty : null)}
              <div class="tgr-debug-score-row"><span>Final score (confidence-adjusted)</span><span>${d.final_score.toFixed(2)}</span></div>
              ${d.selected ? '<div class="tgr-debug-candidate-card__selected-tag">SELECTED</div>' : ""}
            </div>`;
        })
        .join("");
    } else if (details.length) {
      // Older-style candidate (e.g. fold-consistency-only path with no
      // v0.3 breakdown) -- compact single-line rendering.
      candidatesHtml = details
        .map((d) => {
          const perInch = d.per_inch != null ? `${d.per_inch.toFixed(2)}/in` : "";
          const fold = d.fold_consistency != null ? `fold ${d.fold_consistency.toFixed(2)}` : "";
          const meta = [d.harmonic, perInch, fold].filter(Boolean).join(" · ");
          return (
            `<span class="tgr-debug-candidate${d.selected ? " is-selected" : ""}">` +
            `<span class="tgr-debug-candidate__px">${d.period_px.toFixed(1)}px</span>` +
            `<span class="tgr-debug-candidate__meta">${escapeHtml(meta)}</span>` +
            `</span>`
          );
        })
        .join("");
    } else {
      // Fallback for a response without candidate_details (shouldn't
      // normally happen, but keeps this panel working defensively).
      candidatesHtml = (axis.candidates_px || [])
        .map((c) => {
          const isSelected = axis.spacing_px != null && Math.abs(c - axis.spacing_px) < Math.max(0.5, axis.spacing_px * 0.15);
          return `<span class="tgr-debug-candidate${isSelected ? " is-selected" : ""}"><span class="tgr-debug-candidate__px">${c.toFixed(1)}px</span></span>`;
        })
        .join("");
    }
    const corrected = (axis.selected_reason || "").includes("corrected") || (axis.selected_reason || "").includes("Selected");
    const uncertain = axis.status === "uncertain";
    const statusTag = uncertain ? '<span class="tgr-debug-axis__status is-uncertain">UNCERTAIN</span>' : "";
    // Surfaced here too (not just the results card above) per the request
    // that Detection Details never let an ambiguous call read as settled
    // -- "Harmonic ambiguity detected" plus whichever periods are
    // actually competing, not a claim that the system resolved something
    // it didn't.
    const ambiguityHtml = uncertain
      ? `<div class="tgr-debug-axis__ambiguity">⚠ Harmonic ambiguity detected — ${escapeHtml(axis.uncertain_reason || "top candidates scored nearly as well as each other; manual verification recommended.")}</div>`
      : "";
    return `
      <div class="tgr-debug-axis">
        <div class="tgr-debug-axis__title">${escapeHtml(label)} period candidates ${statusTag}</div>
        <div class="tgr-debug-axis__candidates">${candidatesHtml || "<span class=\"tgr-debug-candidate\">none</span>"}</div>
        ${ambiguityHtml}
        <div class="tgr-debug-axis__reason${corrected ? " is-corrected" : ""}">${escapeHtml(axis.selected_reason || "—")}</div>
      </div>`;
  }

  function renderDetectionDetails(result) {
    let html = "";
    if (result.rotation_deg && Math.abs(result.rotation_deg) > 0.01) {
      html += `<div class="tgr-debug-rotation">Tilt correction applied before period estimation: ${result.rotation_deg > 0 ? "+" : ""}${result.rotation_deg.toFixed(1)}&deg; (overlay positions stay in the original, unrotated image).</div>`;
    }
    html += detectionAxisBlock("Wale", result.wale) + detectionAxisBlock("Course", result.course);
    detectionDetailsContent.innerHTML = html;
  }

  // Experimental V-shape loop-center lattice, run alongside (never
  // instead of) the current gauge detector -- see loop_lattice_debug in
  // the /analyze response. Development-only comparison: does an
  // independent, explicit "find complete loops" detector agree with the
  // periodicity-based prediction above? Not used to decide anything --
  // just shown side by side.
  function renderLoopLatticeComparison(result) {
    const d = result.loop_lattice_debug;
    if (!d) {
      loopLatticeComparison.innerHTML = "";
      return;
    }
    const row = (label, value) => `<div class="tgr-verify__predicted-row"><span>${escapeHtml(label)}</span><span>${value}</span></div>`;
    const fmt = (v, digits, suffix) => (v == null ? "—" : `${v.toFixed(digits)}${suffix || ""}`);
    loopLatticeComparison.innerHTML = `
      <div class="tgr-debug-axis">
        <div class="tgr-debug-axis__title">Loop-center lattice experiment</div>
        <p class="tgr-hint">
          An explicit V-shape loop detector (paired diagonal gradients converging
          at a point), searched only in bands around the EXISTING course rows
          (used as a structural prior, never modified) -- wale columns need
          direct evidence from multiple rows to be accepted, not just one.
          Shown for development comparison only, it does not influence the
          results above. Enable "Show detected loops" for green = directly
          detected loop, hollow orange = a column's inferred/missing position,
          gold vertical line = an accepted wale column.
        </p>
        ${row("Direct loop detections", d.direct_center_count)}
        ${row("Course rows used as prior", d.row_count)}
        ${row("Accepted wale columns", d.column_count)}
        ${row("Column row-support (min..max)", d.column_support_counts && d.column_support_counts.length ? `${Math.min(...d.column_support_counts)}..${Math.max(...d.column_support_counts)} of ${d.row_count}` : "—")}
        ${row("Lattice consistency", fmt(d.lattice_consistency, 2))}
        ${row("Loop-lattice wale spacing", fmt(d.wale_spacing_px, 1, " px"))}
        ${row("Loop-lattice wales/in", fmt(d.wale_per_inch, 2))}
        ${row("Current-detector wales/in", fmt(result.wale.per_inch, 2))}
        ${row("Current-detector courses/in", fmt(result.course.per_inch, 2))}
      </div>`;
  }

  showLoopCentersCheck.addEventListener("change", () => render());
  showVShapeLoopsCheck.addEventListener("change", () => render());

  // --- Verify Measurement (ground-truth correction) ---------------------

  function initVerifySection(result) {
    const rows = [
      ["Predicted wales/in", result.wale.per_inch != null ? result.wale.per_inch.toFixed(2) : "—"],
      ["Predicted courses/in", result.course.per_inch != null ? result.course.per_inch.toFixed(2) : "—"],
      ["Wale spacing", result.wale.spacing_mm != null ? `${result.wale.spacing_mm.toFixed(2)} mm` : "—"],
      ["Course spacing", result.course.spacing_mm != null ? `${result.course.spacing_mm.toFixed(2)} mm` : "—"],
      ["Wale confidence", `${Math.round(result.wale.confidence * 100)}%`],
      ["Course confidence", `${Math.round(result.course.confidence * 100)}%`],
    ];
    verifyPredictedSummary.innerHTML = rows
      .map(
        ([k, v]) =>
          `<div class="tgr-verify__predicted-row"><span>${escapeHtml(k)}</span><span>${escapeHtml(v)}</span></div>`
      )
      .join("");

    actualWpiInput.value = "";
    actualCpiInput.value = "";
    actualWaleCountInput.value = "";
    actualCourseCountInput.value = "";
    roiCountHint.textContent = "";
    calCorrectCheck.checked = true;
    orientationCorrectCheck.checked = true;
    saveImageCheck.checked = false;
    correctionError.hidden = true;
    correctionStatus.hidden = true;
    correctionComparison.hidden = true;
    correctionComparison.innerHTML = "";
    updateSaveCorrectionButton();
  }

  function getRoiExtentsMm() {
    if (!state.result || !state.result.analyzed_area_mm) return null;
    const { width_mm, height_mm } = state.result.analyzed_area_mm;
    return state.orientation === "vertical"
      ? { waleExtentMm: width_mm, courseExtentMm: height_mm }
      : { waleExtentMm: height_mm, courseExtentMm: width_mm };
  }

  function derivePerInchFromCount(count, extentMm) {
    if (!(count > 0) || !(extentMm > 0)) return null;
    return count / (extentMm / 25.4);
  }

  function handleRoiCountInput() {
    const extents = getRoiExtentsMm();
    if (!extents) return;
    const waleCount = parseInt(actualWaleCountInput.value, 10);
    const courseCount = parseInt(actualCourseCountInput.value, 10);
    const hints = [];

    if (waleCount > 0) {
      const derived = derivePerInchFromCount(waleCount, extents.waleExtentMm);
      if (derived != null) {
        actualWpiInput.value = derived.toFixed(3);
        hints.push(`${waleCount} wales / ${extents.waleExtentMm.toFixed(1)}mm ≈ ${derived.toFixed(2)}/in`);
      }
    }
    if (courseCount > 0) {
      const derived = derivePerInchFromCount(courseCount, extents.courseExtentMm);
      if (derived != null) {
        actualCpiInput.value = derived.toFixed(3);
        hints.push(`${courseCount} courses / ${extents.courseExtentMm.toFixed(1)}mm ≈ ${derived.toFixed(2)}/in`);
      }
    }
    roiCountHint.textContent = hints.join("  ·  ");
    updateSaveCorrectionButton();
  }

  function updateSaveCorrectionButton() {
    const wpi = parseFloat(actualWpiInput.value);
    const cpi = parseFloat(actualCpiInput.value);
    saveCorrectionBtn.disabled = !(wpi > 0 && cpi > 0);
  }

  actualWaleCountInput.addEventListener("input", handleRoiCountInput);
  actualCourseCountInput.addEventListener("input", handleRoiCountInput);
  actualWpiInput.addEventListener("input", updateSaveCorrectionButton);
  actualCpiInput.addEventListener("input", updateSaveCorrectionButton);

  function deltaClass(pct) {
    const a = Math.abs(pct);
    if (a < 10) return "is-good";
    if (a < 25) return "is-mid";
    return "is-bad";
  }

  function comparisonRow(label, predicted, actual, pctError) {
    if (predicted == null || actual == null) return "";
    const deltaHtml =
      pctError != null
        ? `<span class="tgr-comparison__delta ${deltaClass(pctError)}">(${pctError > 0 ? "+" : ""}${pctError.toFixed(1)}%)</span>`
        : "";
    return `
      <div class="tgr-comparison__row">
        <span class="tgr-comparison__label">${escapeHtml(label)}</span>
        <span class="tgr-comparison__values">${predicted.toFixed(2)} → ${actual.toFixed(2)} ${deltaHtml}</span>
      </div>`;
  }

  function renderCorrectionComparison(data) {
    const rows =
      comparisonRow("Wales/in", data.predicted_wales_per_inch, data.actual_wales_per_inch, data.wale_percent_error) +
      comparisonRow(
        "Courses/in",
        data.predicted_courses_per_inch,
        data.actual_courses_per_inch,
        data.course_percent_error
      );
    correctionComparison.innerHTML = `
      <div class="tgr-comparison__title">Predicted → Actual</div>
      ${rows}
      <div class="tgr-comparison__id">Sample ID: ${escapeHtml(data.id)}${data.image_saved ? " · image saved" : ""}</div>`;
    correctionComparison.hidden = false;
  }

  saveCorrectionBtn.addEventListener("click", async () => {
    if (!state.result || !state.roi) return;
    correctionError.hidden = true;
    correctionComparison.hidden = true;
    correctionStatus.hidden = false;
    correctionStatus.textContent = "Saving…";
    saveCorrectionBtn.disabled = true;

    try {
      if (!CONFIG.API_BASE_URL) {
        throw new Error("Analysis service is not configured yet, so corrections can't be saved.");
      }

      const r = state.result;
      const fd = new FormData();
      fd.append("roi_x", state.roi.x);
      fd.append("roi_y", state.roi.y);
      fd.append("roi_width_px", state.roi.width);
      fd.append("roi_height_px", state.roi.height);
      fd.append("roi_width_mm", r.analyzed_area_mm.width_mm);
      fd.append("roi_height_mm", r.analyzed_area_mm.height_mm);
      fd.append("pixels_per_mm", r.pixels_per_mm);
      fd.append("orientation", state.orientation);
      if (r.wale.spacing_px != null) fd.append("predicted_wale_spacing_px", r.wale.spacing_px);
      if (r.course.spacing_px != null) fd.append("predicted_course_spacing_px", r.course.spacing_px);
      if (r.wale.spacing_mm != null) fd.append("predicted_wale_spacing_mm", r.wale.spacing_mm);
      if (r.course.spacing_mm != null) fd.append("predicted_course_spacing_mm", r.course.spacing_mm);
      if (r.wale.per_inch != null) fd.append("predicted_wales_per_inch", r.wale.per_inch);
      if (r.course.per_inch != null) fd.append("predicted_courses_per_inch", r.course.per_inch);
      fd.append("predicted_wale_confidence", r.wale.confidence);
      fd.append("predicted_course_confidence", r.course.confidence);
      fd.append("detected_wale_positions", JSON.stringify(r.wale.positions_px || []));
      fd.append("detected_course_positions", JSON.stringify(r.course.positions_px || []));

      const waleCount = parseInt(actualWaleCountInput.value, 10);
      const courseCount = parseInt(actualCourseCountInput.value, 10);
      if (waleCount > 0) fd.append("actual_wale_count", waleCount);
      if (courseCount > 0) fd.append("actual_course_count", courseCount);

      const wpi = parseFloat(actualWpiInput.value);
      const cpi = parseFloat(actualCpiInput.value);
      if (!(wpi > 0) || !(cpi > 0)) {
        throw new Error("Enter actual wales/in and courses/in (directly or via stitch counts) before saving.");
      }
      fd.append("actual_wales_per_inch", wpi);
      fd.append("actual_courses_per_inch", cpi);

      fd.append("calibration_correct", calCorrectCheck.checked);
      fd.append("orientation_correct", orientationCorrectCheck.checked);
      fd.append("algorithm_version", r.algorithm_version || "unknown");

      if (state.file) {
        fd.append("image_filename", state.file.name);
        fd.append("image_size_bytes", state.file.size);
      }
      let hash = null;
      try {
        hash = state.imageHashPromise ? await state.imageHashPromise : null;
      } catch {
        hash = null;
      }
      if (hash) fd.append("image_sha256", hash);

      const saveImg = saveImageCheck.checked;
      fd.append("save_image", saveImg);
      if (saveImg && state.file) {
        fd.append("file", state.file);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
      let res;
      try {
        res = await fetch(`${CONFIG.API_BASE_URL}/corrections`, {
          method: "POST",
          body: fd,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned an unexpected response (HTTP ${res.status}).`);
      }
      if (!res.ok || data.success === false) {
        throw new Error(data.message || `Could not save correction (HTTP ${res.status}).`);
      }

      correctionStatus.hidden = true;
      renderCorrectionComparison(data);
    } catch (err) {
      correctionStatus.hidden = true;
      if (err && err.name === "AbortError") {
        correctionError.textContent =
          "Saving timed out. The analysis service may be waking up from a cold start — try again shortly.";
      } else if (err instanceof TypeError) {
        correctionError.textContent =
          "Could not reach the analysis service to save this correction. Try again shortly.";
      } else {
        correctionError.textContent = (err && err.message) || "Could not save correction. Please try again.";
      }
      correctionError.hidden = false;
    } finally {
      updateSaveCorrectionButton();
    }
  });

  function setupExportLinks() {
    if (!CONFIG.API_BASE_URL) {
      correctionExportRow.hidden = true;
      return;
    }
    exportCsvLink.href = `${CONFIG.API_BASE_URL}/corrections/export.csv`;
    exportJsonLink.href = `${CONFIG.API_BASE_URL}/corrections/export.json`;
    correctionExportRow.hidden = false;
  }

  resetBtn.addEventListener("click", () => {
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.file = null;
    state.objectUrl = null;
    state.imageHashPromise = null;
    state.naturalWidth = 0;
    state.naturalHeight = 0;
    state.cal = { points: [], knownDistance: null, unit: "cm", pixelsPerMm: null };
    state.roi = null;
    state.roiDrag = null;
    state.orientation = "vertical";
    state.result = null;
    state.showMeasurementAreas = false;
    state.selectedDiagnosticRoiLabel = null;

    fileInput.value = "";
    img.src = "";
    stage.hidden = true;
    zoomControls.hidden = true;
    resetView();
    viewerEmpty.hidden = false;
    unitSelect.value = "cm";
    document.querySelector('input[name="orientation"][value="vertical"]').checked = true;
    resetCalibrationUI();
    resetRoiUI();
    verifyPredictedSummary.innerHTML = "";
    correctionComparison.hidden = true;
    correctionComparison.innerHTML = "";
    correctionError.hidden = true;
    correctionStatus.hidden = true;
    detectionDetailsContent.innerHTML = "";
    showLoopCentersCheck.checked = false;
    showVShapeLoopsCheck.checked = false;
    loopLatticeComparison.innerHTML = "";
    measurementConsistencyPanel.hidden = true;
    measurementConsistencyContent.innerHTML = "";
    showMeasurementAreasRow.hidden = true;
    showMeasurementAreasCheck.checked = false;
    roiDiagSelectRow.hidden = true;
    roiDiagSelect.innerHTML = "";
    roiDiagContent.innerHTML = "";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    goToStep("upload");
  });

  // --- Init ---------------------------------------------------------
  goToStep("upload");
  checkServiceHealth();
  setupExportLinks();
})();
