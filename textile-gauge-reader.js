/**
 * AI Textile Gauge Reader — frontend controller (experimental lab page).
 *
 * Pure UI/interaction code: image upload, two-point calibration, ROI
 * selection, orientation choice, calling the analysis API, and drawing
 * results. No image analysis happens here — everything is delegated to
 * the FastAPI backend (deployed separately, e.g. on Render), which
 * delegates the actual computer vision to its `analysis` package.
 *
 * This page is served as static files from the portfolio site (e.g.
 * GitHub Pages / Netlify), which cannot run the Python backend itself.
 * The backend lives at a different origin, configured below. Upload,
 * calibration, ROI selection, and overlay drawing all work with zero
 * backend involvement — only the "Analyze" step needs the API.
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
  // Set this to your deployed FastAPI backend's base URL, with no
  // trailing slash, e.g.:
  //   API_BASE_URL: "https://textile-gauge-reader-api.onrender.com"
  //
  // Leave it as an empty string until the backend is deployed. The page
  // still loads and every step up through ROI/orientation selection
  // still works — only "Analyze" will show a clear "service not
  // configured" message instead of trying (and failing) to call it.
  // -------------------------------------------------------------------
  const CONFIG = {
    API_BASE_URL: "https://textile-gauge-reader-api.onrender.com",
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
  const roiClearBtn = document.getElementById("roiClear");
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
  const detectionDetailsContent = document.getElementById("detectionDetailsContent");

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
    roi: null, // {x, y, width, height} in natural coords
    roiDrag: null, // active drag interaction descriptor
    view: { zoom: 1, panX: 0, panY: 0 }, // image viewer pan/zoom, in display (unscaled) px
    panDrag: null, // active viewer-pan drag descriptor
    orientation: "vertical",
    result: null,
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
      drawLoopCenters(result.loop_centers_px);
    }
  }

  function drawLoopCenters(centers) {
    ctx.fillStyle = "#e9ecec";
    ctx.globalAlpha = 0.85;
    for (const [cx, cy] of centers) {
      const p = naturalToDisplay({ x: cx, y: cy });
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
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

  calConfirmBtn.addEventListener("click", () => {
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
  });

  // --- Step 3: ROI --------------------------------------------------

  function resetRoiUI() {
    roiStatus.textContent = "Draw a rectangle on the image.";
    roiConfirmBtn.disabled = true;
  }

  function updateRoiUI() {
    if (!state.roi) {
      roiStatus.textContent = "Draw a rectangle on the image.";
      roiConfirmBtn.disabled = true;
      return;
    }
    const big = state.roi.width >= MIN_ROI_NATURAL_PX && state.roi.height >= MIN_ROI_NATURAL_PX;
    roiStatus.textContent = big
      ? `Area: ${Math.round(state.roi.width)} × ${Math.round(state.roi.height)} px. Drag handles to adjust, or confirm.`
      : `Area too small — minimum ${MIN_ROI_NATURAL_PX}×${MIN_ROI_NATURAL_PX}px.`;
    roiConfirmBtn.disabled = !big;
  }

  roiClearBtn.addEventListener("click", () => {
    state.roi = null;
    resetRoiUI();
    render();
  });

  roiConfirmBtn.addEventListener("click", () => goToStep("orientation"));

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

      if (state.roi) {
        const handle = hitTestHandle(dispPt, state.roi);
        if (handle) {
          state.roiDrag = { mode: "resize", handle, startRoi: { ...state.roi } };
          return;
        }
        if (pointInRoiDisplay(dispPt, state.roi)) {
          state.roiDrag = {
            mode: "move",
            startNatural: displayToNatural(dispPt),
            startRoi: { ...state.roi },
          };
          return;
        }
      }
      // Start a brand-new rectangle.
      const startNatural = displayToNatural(dispPt);
      state.roiDrag = { mode: "create", anchor: startNatural };
      state.roi = { x: startNatural.x, y: startNatural.y, width: 0, height: 0 };
    }
  });

  canvas.addEventListener("pointermove", (evt) => {
    if (state.currentStep !== "roi" || !state.roiDrag) return;
    const dispPt = eventToDisplayPoint(evt);
    const natPt = displayToNatural(dispPt);
    const drag = state.roiDrag;

    if (drag.mode === "create") {
      let target = natPt;
      if (evt.shiftKey) {
        target = squareSnappedPoint(drag.anchor, natPt);
      }
      state.roi = normalizeRect(drag.anchor, target);
    } else if (drag.mode === "move") {
      const dx = natPt.x - drag.startNatural.x;
      const dy = natPt.y - drag.startNatural.y;
      const w = drag.startRoi.width;
      const h = drag.startRoi.height;
      state.roi = {
        x: clamp(drag.startRoi.x + dx, 0, state.naturalWidth - w),
        y: clamp(drag.startRoi.y + dy, 0, state.naturalHeight - h),
        width: w,
        height: h,
      };
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

      state.roi = normalizeRect({ x: x1, y: y1 }, { x: x2, y: y2 });
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
    state.roiDrag = null;
    updateRoiUI();
  }
  canvas.addEventListener("pointerup", endRoiDrag);
  canvas.addEventListener("pointercancel", endRoiDrag);

  // --- Step 4: Orientation -----------------------------------------------

  document.querySelectorAll('input[name="orientation"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (e.target.checked) state.orientation = e.target.value;
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
    const roiMmW = (state.roi.width / ppm).toFixed(1);
    const roiMmH = (state.roi.height / ppm).toFixed(1);

    const rows = [
      ["File", state.file.name],
      ["Image size", `${state.naturalWidth} × ${state.naturalHeight} px`],
      ["Calibration", `${state.cal.knownDistance} ${state.cal.unit} (${pxDist.toFixed(1)} px)`],
      ["Scale", `${ppm.toFixed(3)} px/mm`],
      [
        "Measurement area",
        `${Math.round(state.roi.width)}×${Math.round(state.roi.height)} px (${roiMmW}×${roiMmH} mm)`,
      ],
      ["Wale orientation", state.orientation === "vertical" ? "Vertical ↕" : "Horizontal ↔"],
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
      fd.append("roi_x", state.roi.x);
      fd.append("roi_y", state.roi.y);
      fd.append("roi_width", state.roi.width);
      fd.append("roi_height", state.roi.height);
      fd.append("cal_x1", state.cal.points[0].x);
      fd.append("cal_y1", state.cal.points[0].y);
      fd.append("cal_x2", state.cal.points[1].x);
      fd.append("cal_y2", state.cal.points[1].y);
      fd.append("known_distance", state.cal.knownDistance);
      fd.append("unit", state.cal.unit);
      fd.append("orientation", state.orientation);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
      let res;
      try {
        res = await fetch(`${CONFIG.API_BASE_URL}/analyze`, {
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

  function axisCard(label, axis, color) {
    if (axis.spacing_px == null) {
      return `
        <div class="tgr-result-card">
          <div class="tgr-result-card__label">${label}</div>
          <div class="tgr-result-card__value" style="color:${color}">—</div>
          <div class="tgr-result-card__sub">Not reliably detected${axis.message ? ": " + escapeHtml(axis.message) : ""}</div>
        </div>`;
    }
    return `
      <div class="tgr-result-card">
        <div class="tgr-result-card__label">${label} spacing</div>
        <div class="tgr-result-card__value" style="color:${color}">${axis.spacing_mm.toFixed(2)} mm</div>
        <div class="tgr-result-card__sub">${axis.spacing_px.toFixed(1)} px &middot; ${axis.positions_px.length} detected</div>
        <div class="tgr-confidence-bar"><div class="tgr-confidence-bar__fill ${confidenceClass(axis.confidence)}" style="width:${Math.round(axis.confidence * 100)}%"></div></div>
        <div class="tgr-result-card__sub">Confidence: ${Math.round(axis.confidence * 100)}%</div>
      </div>`;
  }

  function renderResults() {
    const r = state.result;
    const wpi = r.wale.per_inch != null ? r.wale.per_inch.toFixed(2) : "—";
    const cpi = r.course.per_inch != null ? r.course.per_inch.toFixed(2) : "—";

    let html = `
      <div class="tgr-result-card tgr-result-card--primary">
        <div class="tgr-result-card__block">
          <div class="tgr-result-card__label">Wales / inch</div>
          <div class="tgr-result-card__value" style="color:${WALE_COLOR}">${wpi}</div>
        </div>
        <div class="tgr-result-card__block">
          <div class="tgr-result-card__label">Courses / inch</div>
          <div class="tgr-result-card__value" style="color:${COURSE_COLOR}">${cpi}</div>
        </div>
      </div>`;
    html += axisCard("Wale", r.wale, WALE_COLOR);
    html += axisCard("Course", r.course, COURSE_COLOR);
    html += `
      <div class="tgr-result-card">
        <div class="tgr-result-card__label">Scale</div>
        <div class="tgr-result-card__value" style="font-size:1.05rem">${r.pixels_per_mm.toFixed(3)} px/mm</div>
      </div>
      <div class="tgr-result-card">
        <div class="tgr-result-card__label">Analyzed area</div>
        <div class="tgr-result-card__value" style="font-size:1.05rem">${r.analyzed_area_mm.width_mm.toFixed(1)} × ${r.analyzed_area_mm.height_mm.toFixed(1)} mm</div>
        <div class="tgr-result-card__sub">${r.analyzed_area_px.width} × ${r.analyzed_area_px.height} px</div>
      </div>`;

    resultsGrid.innerHTML = html;

    if (r.wale.spacing_px == null || r.course.spacing_px == null) {
      resultsWarning.textContent =
        "One or more axes could not be reliably measured. Try a larger, flatter, more evenly lit area of fabric, or re-check your ROI selection.";
      resultsWarning.hidden = false;
    } else {
      resultsWarning.hidden = true;
    }

    renderDetectionDetails(r);
    initVerifySection(r);
    render();
  }

  // --- Detection Details (harmonic-candidate diagnostics) ----------------

  function detectionAxisBlock(label, axis) {
    const details = axis.candidate_details || [];
    let candidatesHtml;
    if (details.length) {
      // Rich per-candidate diagnostics: period, harmonic relationship to
      // the raw autocorrelation estimate, normalized wales(or courses)/in
      // at this request's calibration, and (wale axis only, currently)
      // the fold-consistency structural score that distinguishes a
      // complete-loop repeat from a leg/sub-feature. `selected` comes
      // straight from the backend's own decision, not a fuzzy re-match.
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
    const corrected = (axis.selected_reason || "").includes("corrected");
    return `
      <div class="tgr-debug-axis">
        <div class="tgr-debug-axis__title">${escapeHtml(label)} period candidates</div>
        <div class="tgr-debug-axis__candidates">${candidatesHtml || "<span class=\"tgr-debug-candidate\">none</span>"}</div>
        <div class="tgr-debug-axis__reason${corrected ? " is-corrected" : ""}">${escapeHtml(axis.selected_reason || "—")}</div>
      </div>`;
  }

  function renderDetectionDetails(result) {
    detectionDetailsContent.innerHTML =
      detectionAxisBlock("Wale", result.wale) + detectionAxisBlock("Course", result.course);
  }

  showLoopCentersCheck.addEventListener("change", () => render());

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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    goToStep("upload");
  });

  // --- Init ---------------------------------------------------------
  goToStep("upload");
  checkServiceHealth();
  setupExportLinks();
})();
