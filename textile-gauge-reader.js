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

  const WALE_COLOR = "#2fa3a3";   // matches --petrol-bright
  const COURSE_COLOR = "#c98a4b"; // matches --tgr-course

  // --- DOM refs -----------------------------------------------------
  const stepEls = Object.fromEntries(
    [...document.querySelectorAll(".tgr-step")].map((el) => [el.dataset.step, el])
  );
  const panelEls = Object.fromEntries(
    [...document.querySelectorAll(".tgr-step-panel")].map((el) => [el.dataset.panel, el])
  );

  const viewerEmpty = document.getElementById("viewerEmpty");
  const stage = document.getElementById("stage");
  const img = document.getElementById("sourceImage");
  const canvas = document.getElementById("overlay");
  const ctx = canvas.getContext("2d");

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

  const serviceStatusEl = document.getElementById("serviceStatus");
  const serviceStatusDot = document.getElementById("serviceStatusDot");
  const serviceStatusText = document.getElementById("serviceStatusText");
  const serviceStatusRetry = document.getElementById("serviceStatusRetry");

  // --- App state ------------------------------------------------------
  const state = {
    currentStep: "upload",
    file: null,
    objectUrl: null,
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
    const rect = canvas.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  }

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
    render();
  });
  resizeObserver.observe(stage);
  window.addEventListener("resize", () => {
    syncCanvasSize();
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
    ctx.fillStyle = "rgba(47,163,163,0.1)";
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

    img.onload = () => {
      state.naturalWidth = img.naturalWidth;
      state.naturalHeight = img.naturalHeight;
      viewerEmpty.hidden = true;
      stage.hidden = false;
      // Reset any prior interaction state for a fresh image.
      state.cal = { points: [], knownDistance: null, unit: unitSelect.value, pixelsPerMm: null };
      state.roi = null;
      state.result = null;
      resetCalibrationUI();
      resetRoiUI();
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
      state.roi = normalizeRect(drag.anchor, natPt);
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
      state.roi = normalizeRect({ x: x1, y: y1 }, { x: x2, y: y2 });
    }
    updateRoiUI();
    render();
  });

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

    render();
  }

  resetBtn.addEventListener("click", () => {
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.file = null;
    state.objectUrl = null;
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
    viewerEmpty.hidden = false;
    unitSelect.value = "cm";
    document.querySelector('input[name="orientation"][value="vertical"]').checked = true;
    resetCalibrationUI();
    resetRoiUI();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    goToStep("upload");
  });

  // --- Init ---------------------------------------------------------
  goToStep("upload");
  checkServiceHealth();
})();
