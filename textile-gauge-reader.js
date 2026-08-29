/**
 * Automatic Textile Gauge Reader — frontend controller (experimental lab page).
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

  const WALE_COLOR = "#0f7d7d";   // matches --petrol-bright -- calibration points/line and the
                                   // wale-axis result overlay/diagnostics only; NOT measurement boxes
  const COURSE_COLOR = "#a56b2e"; // matches --tgr-course -- course-axis result overlay/diagnostics only

  // Measurement-area (ROI) boxes specifically -- deliberately separate
  // constants from WALE_COLOR/COURSE_COLOR above, which stay teal/rust for
  // calibration points and the wale/course result lines. Black reads
  // clearly against typical (light-to-mid) fabric; the light outline pass
  // (see strokeRoiBox) is what keeps it visible against dark yarn, where a
  // plain black stroke alone would disappear.
  const ROI_BOX_COLOR = "#0a0a0a";
  const ROI_BOX_OUTLINE = "rgba(255,255,255,0.9)";
  // Auto-proposed vs. manually-added boxes used to be told apart by their
  // own stroke color (teal vs. rust); now that both are black for
  // contrast, that distinction moves to a small corner accent dot instead
  // (see roiAccentColor/drawRoiAccentDot) -- reusing the same two hues so
  // the meaning ("teal-ish = auto", "rust = manual") carries over.
  const ROI_ACCENT_AUTO = WALE_COLOR;
  const ROI_ACCENT_MANUAL = COURSE_COLOR;

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 8;
  const WHEEL_ZOOM_SENSITIVITY = 0.01; // ctrl+wheel (trackpad pinch) -- deltaY there is already small/scaled
  // A real mouse wheel's deltaY is much coarser per event (commonly ~100
  // in Chrome's default delta mode) than a trackpad-pinch's ctrl+wheel
  // deltaY, so it needs its own, much smaller sensitivity constant --
  // reusing WHEEL_ZOOM_SENSITIVITY here would turn one wheel notch into
  // a ~63% zoom jump. Tuned for roughly a 10-15% zoom change per notch.
  const MOUSE_WHEEL_ZOOM_SENSITIVITY = 0.0016;
  // Threshold for looksLikeMouseWheelDelta() below -- comfortably above
  // ordinary trackpad micro-scroll deltas, comfortably below a typical
  // wheel notch's magnitude (~100).
  const MOUSE_WHEEL_MIN_DELTA = 20;

  // Calibration: assumed click-placement error (screen/source-image px --
  // treated as natural-image px here, same as every other stored
  // coordinate) and the error-fraction threshold above which the short-
  // span hint shows. Expressed as a ratio (error / span) rather than a
  // fixed pixel span so it stays correct at any image resolution: a
  // 300px span and a 3000px span at 10x the megapixel count carry the
  // same relative click-error risk.
  const CAL_ASSUMED_CLICK_ERROR_PX = 3;
  const CAL_SHORT_SPAN_ERROR_THRESHOLD = 0.01; // ~1%
  const CAL_UNIT_STORAGE_KEY = "tgr_calibration_unit";

  function loadDefaultCalUnit() {
    try {
      const saved = localStorage.getItem(CAL_UNIT_STORAGE_KEY);
      return saved === "in" || saved === "cm" ? saved : "cm";
    } catch {
      return "cm"; // localStorage can throw in private-browsing/sandboxed contexts -- never fatal here
    }
  }
  function saveDefaultCalUnit(unit) {
    try {
      localStorage.setItem(CAL_UNIT_STORAGE_KEY, unit);
    } catch {
      // Purely a convenience (remembering the last-used unit for next time) -- never required.
    }
  }

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

  const gridBoxControls = document.getElementById("gridBoxControls");
  const gridBoxToggleBtn = document.getElementById("gridBoxToggleBtn");
  const gridBoxUnitBtn = document.getElementById("gridBoxUnitBtn");
  const gridBoxPanel = document.getElementById("gridBoxPanel");
  const gridWaleCountInput = document.getElementById("gridWaleCount");
  const gridCourseCountInput = document.getElementById("gridCourseCount");
  const gridBoxSaveBtn = document.getElementById("gridBoxSaveBtn");
  const gridBoxStatus = document.getElementById("gridBoxStatus");
  const gridBoxError = document.getElementById("gridBoxError");

  const panelEl = document.getElementById("panel");
  const panelToggle = document.getElementById("panelToggle");
  const appEl = document.querySelector(".tgr-app");

  const fileInput = document.getElementById("fileInput");
  const dropzone = document.getElementById("dropzone");
  const uploadError = document.getElementById("uploadError");

  const calStatus = document.getElementById("calStatus");
  const calAutoHint = document.getElementById("calAutoHint");
  const calPopup = document.getElementById("calPopup");
  const knownDistanceInput = document.getElementById("knownDistance");
  const unitSelect = document.getElementById("unitSelect");
  const ppmPreview = document.getElementById("ppmPreview");
  const calSpanHint = document.getElementById("calSpanHint");
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

  // User-anchored repeat counting ("Verify by counting a repeat")
  const repeatCountPanel = document.getElementById("repeatCountPanel");
  const markRepeatBtn = document.getElementById("markRepeatBtn");
  const cancelRepeatMarkBtn = document.getElementById("cancelRepeatMarkBtn");
  const repeatMarkStatus = document.getElementById("repeatMarkStatus");
  const repeatMatchResult = document.getElementById("repeatMatchResult");

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
      draggingIndex: null, // 0 or 1 while a calibration point is being dragged, else null
    },
    calAutoDetectPending: false, // true while a /detect-ruler request for the CURRENT image is in flight --
                                  // guards against a late response overwriting points the user has since
                                  // started marking manually, or landing on a since-replaced image
    calAutoDetected: false, // true once auto-detected points are showing, still awaiting the user's own confirm
    gridBox: {
      visible: false, // the draggable to-scale (1in/1cm) counting box -- see gridBoxSpec/updateGridBoxUI.
                       // Available once currentPixelsPerMm() is non-null (i.e. after Confirm
                       // Calibration), but deliberately usable on EVERY step from calibration onward,
                       // including before analysis -- counting before seeing the tool's own answer
                       // is the whole point (an uncontaminated ground-truth label).
      unit: "in", // "in" | "cm" -- side length is DERIVED live from currentPixelsPerMm() + this,
                  // never stored as a raw pixel value, so it stays exactly to scale across
                  // recalibration too, not just pan/zoom (see gridBoxSpec).
      x: null, // natural coords, top-left corner; null until first shown (see ensureGridBoxPosition)
      y: null,
      dragging: false,
      dragOffset: null, // {dx, dy} from the pointer to state.gridBox.{x,y} at drag start, in natural px
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
    pinchActive: false, // true from the moment a second touch lands until either lifts --
                         // see the "Touch: two-finger pinch" block below. Every other
                         // pointerdown handler on the canvas checks this and bails, so a
                         // second finger landing can never also start a new ROI/calibration/
                         // grid-box drag on top of the pinch.
    orientation: "vertical",
    structure: "unknown",
    result: null,
    showMeasurementAreas: false, // "Show measurement areas" toggle -- all approved ROI outlines, results step
    selectedDiagnosticRoiLabel: null, // which region's own detail is shown in Developer diagnostics' per-region panel
    repeatMark: {
      active: false, // true while armed -- next canvas drag draws the repeat-cell box
      dragging: false, // true mid-drag, between pointerdown and pointerup
      anchor: null, // {x,y} natural coords, drag start corner
      box: null, // {x,y,width,height} natural coords -- one full repeat cell (one wale-to-wale span, one course-to-course span), cleared once a match request fires
    },
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
    updateGridBoxUI(); // grid box only becomes available once calibration is confirmed; see state.gridBox's comment for why it also spans steps
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

  // Distinguishes a real mouse wheel from a trackpad's two-finger scroll,
  // both of which arrive as plain "wheel" events with no other signal to
  // tell them apart. A trackpad's scroll is continuous, sub-pixel-capable
  // motion -- deltaX is usually nonzero even when scrolling "mostly
  // vertically" (real fingers rarely move in a perfectly straight line),
  // and deltaY arrives as many small, often-fractional values per
  // gesture. A mouse wheel has no horizontal axis at all (deltaX === 0)
  // and reports deltaY as one coarse, whole-number "notch" per click --
  // commonly ~100 in Chrome's default delta mode, though the exact notch
  // size varies by mouse/OS/browser, which is why this checks "large
  // whole number" (MOUSE_WHEEL_MIN_DELTA) rather than hardcoding 100
  // exactly. This is a heuristic, not a real device signal -- if it
  // proves unreliable for some mouse/trackpad combination in practice,
  // the fix is an explicit user-facing toggle, not a guess refinement.
  function looksLikeMouseWheelDelta(evt) {
    if (evt.deltaX !== 0) return false;
    if (!Number.isInteger(evt.deltaY)) return false;
    return Math.abs(evt.deltaY) >= MOUSE_WHEEL_MIN_DELTA;
  }

  function onViewerWheel(evt) {
    if (!state.naturalWidth) return;
    evt.preventDefault();

    if (evt.shiftKey) {
      // Manual override: always pan, regardless of what device this
      // looks like -- the escape hatch for whenever the heuristic below
      // guesses wrong.
      state.view.panX -= evt.deltaX;
      state.view.panY -= evt.deltaY;
      clampPan();
      applyViewTransform();
      return;
    }

    if (evt.ctrlKey) {
      // Pinch-to-zoom on trackpads is synthesized by the browser as wheel
      // events with ctrlKey set -- always zoom, never guess here.
      const factor = Math.exp(-evt.deltaY * WHEEL_ZOOM_SENSITIVITY);
      zoomBy(factor, evt.clientX, evt.clientY);
      return;
    }

    if (looksLikeMouseWheelDelta(evt)) {
      // An un-modified real mouse wheel -- cursor-anchored zoom. A mouse
      // has no equivalent to a trackpad's two-finger pan swipe, so its
      // wheel notches are the zoom gesture instead (drag still pans).
      const factor = Math.exp(-evt.deltaY * MOUSE_WHEEL_ZOOM_SENSITIVITY);
      zoomBy(factor, evt.clientX, evt.clientY);
    } else {
      // Trackpad two-finger scroll (or anything not confidently
      // classified as a mouse wheel) -- pan, matching how a trackpad's
      // plain scroll gesture is treated everywhere else on the page.
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
    // Marking a repeat anchor point is a plain left-click on the results
    // step too -- same reservation roi/calibrate already get below.
    if (state.repeatMark.active) return false;
    if (state.currentStep === "roi" || state.currentStep === "calibrate") return false;
    // The grid box is draggable on every step it's available in, which
    // includes the steps (orientation/analyze/results) where a plain drag
    // otherwise pans -- reserve the gesture the same way roi/calibrate
    // already do, but only when the click actually starts on the box
    // itself, so panning elsewhere on those steps is unaffected.
    if (state.gridBox.visible) {
      const spec = gridBoxSpec();
      if (spec) {
        ensureGridBoxPosition(spec);
        if (pointInGridBoxDisplay(eventToDisplayPoint(evt), spec)) return false;
      }
    }
    return true;
  }

  canvas.addEventListener("pointerdown", (evt) => {
    if (state.pinchActive) return; // a second touch just landed -- see the pinch block below
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

  // --- Touch: two-finger pinch-to-zoom + two-finger pan -------------------
  //
  // A single touch already works today: PointerEvent.button is 0 for a
  // touch's primary contact exactly like a mouse left-click, so every
  // existing pointerdown/pointermove handler above and below (pan-drag,
  // ROI create/move/resize, calibration point placement, grid-box drag)
  // already treats one finger the same as a mouse. What's genuinely
  // missing is a SECOND simultaneous touch -- nothing turns that into a
  // pinch gesture -- and `.tgr-viewer__stage { touch-action: none }` (needed
  // so the browser's own native pinch/scroll doesn't fight this custom
  // viewer) means without handling it ourselves, touch users get no zoom
  // gesture at all.
  //
  // Listens on #viewer (an ancestor of #canvas) in the CAPTURE phase
  // specifically so this always runs before any of the canvas's own
  // pointerdown listeners see the event -- capture vs. bubble only
  // affects ordering between listeners on DIFFERENT elements in the
  // event's path, not between multiple listeners on the same target, so
  // putting this on canvas itself would not reliably run first. Running
  // first is what lets cancelSinglePointerDrags() below undo whatever the
  // FIRST finger's own (single-touch) pointerdown already started, in the
  // same event where the second finger lands, before that second
  // pointerdown's own bubble-phase handlers (gated on state.pinchActive)
  // get a chance to react to it.
  const activeTouches = new Map(); // pointerId -> {x, y} client coords, touch pointers only
  let pinch = null; // {ids: [idA, idB], lastDist, lastMid: {x, y}} while exactly 2 touches are down

  function touchDist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function touchMid(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function cancelSinglePointerDrags(pointerId) {
    if (state.panDrag && state.panDrag.pointerId === pointerId) {
      if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
      state.panDrag = null;
      canvas.classList.remove("is-panning");
    }
    if (state.roiDrag) {
      if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
      // Drop a stray near-zero "create" box the first finger barely started
      // -- same threshold endRoiDrag uses for a genuine pointerup, so a
      // pinch that interrupts an about-to-be-drawn box doesn't leave a
      // phantom sliver behind.
      if (state.roiDrag.mode === "create") {
        const roi = state.rois.find((r) => r.id === state.roiDrag.roiId);
        if (roi && (roi.width < 4 || roi.height < 4)) {
          state.rois = state.rois.filter((r) => r.id !== roi.id);
          state.selectedRoiId = state.rois.length ? state.rois[state.rois.length - 1].id : null;
        }
      }
      state.roiDrag = null;
      updateRoiUI();
    }
    if (state.gridBox.dragging) {
      if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
      state.gridBox.dragging = false;
    }
    if (state.repeatMark.dragging) {
      if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
      state.repeatMark.dragging = false;
      state.repeatMark.box = null;
    }
  }

  viewer.addEventListener(
    "pointerdown",
    (evt) => {
      if (evt.pointerType !== "touch") return;
      activeTouches.set(evt.pointerId, { x: evt.clientX, y: evt.clientY });
      if (activeTouches.size === 2 && state.naturalWidth) {
        const [idA, idB] = [...activeTouches.keys()];
        state.pinchActive = true;
        cancelSinglePointerDrags(idA);
        cancelSinglePointerDrags(idB);
        const a = activeTouches.get(idA);
        const b = activeTouches.get(idB);
        pinch = { ids: [idA, idB], lastDist: touchDist(a, b), lastMid: touchMid(a, b) };
        render();
      }
    },
    { capture: true }
  );

  viewer.addEventListener(
    "pointermove",
    (evt) => {
      if (evt.pointerType !== "touch" || !activeTouches.has(evt.pointerId)) return;
      activeTouches.set(evt.pointerId, { x: evt.clientX, y: evt.clientY });
      if (!pinch || !pinch.ids.includes(evt.pointerId)) return;
      evt.preventDefault();
      const a = activeTouches.get(pinch.ids[0]);
      const b = activeTouches.get(pinch.ids[1]);
      const dist = touchDist(a, b);
      const mid = touchMid(a, b);
      if (pinch.lastDist > 0 && dist > 0) {
        zoomBy(dist / pinch.lastDist, mid.x, mid.y); // spreading/pinching the fingers apart -> zoom
      }
      // Fingers translating together (not just spreading) -> pan by the
      // same amount their shared midpoint moved.
      state.view.panX += mid.x - pinch.lastMid.x;
      state.view.panY += mid.y - pinch.lastMid.y;
      clampPan();
      applyViewTransform();
      pinch.lastDist = dist;
      pinch.lastMid = mid;
    },
    { capture: true }
  );

  function endTouch(evt) {
    if (evt.pointerType !== "touch") return;
    activeTouches.delete(evt.pointerId);
    if (pinch && pinch.ids.includes(evt.pointerId)) {
      pinch = null;
      state.pinchActive = false;
    }
    if (canvas.hasPointerCapture(evt.pointerId)) canvas.releasePointerCapture(evt.pointerId);
  }
  viewer.addEventListener("pointerup", endTouch, { capture: true });
  viewer.addEventListener("pointercancel", endTouch, { capture: true });

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

    // The calibration popup lives outside the calibrate step's own
    // <section data-panel="calibrate"> (it needs to float over the
    // canvas, position: fixed, tracking the two points -- see
    // positionCalPopup), so unlike that section it is NOT automatically
    // hidden by goToStep()'s panel.hidden toggling and needs its own
    // explicit visibility rule here, every render.
    calPopup.hidden = state.currentStep !== "calibrate" || state.cal.points.length < 2;

    if (state.currentStep === "calibrate") {
      drawCalibration();
      positionCalPopup(); // keep the distance-entry popup pinned to the points under pan/zoom/resize
    } else if (state.currentStep === "roi") {
      drawRoi(true);
    } else if (state.currentStep === "orientation" || state.currentStep === "analyze") {
      drawRoi(false);
    } else if (state.currentStep === "results") {
      drawRoi(false);
      drawResultOverlay();
      drawRepeatMarkBox();
    }
    // Drawn last (on top of everything else) on whichever step it's
    // available in -- see updateGridBoxUI / gridBoxControls.
    drawGridBox();
    positionGridBoxPanel();
  }

  function drawRepeatMarkBox() {
    const box = state.repeatMark.box;
    if (!box || box.width <= 0 || box.height <= 0) return;
    const tl = naturalToDisplay({ x: box.x, y: box.y });
    const br = naturalToDisplay({ x: box.x + box.width, y: box.y + box.height });
    ctx.save();
    ctx.strokeStyle = "#565e60";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    ctx.restore();
    // Small ticks on the midpoints of each edge, colored by which axis
    // that edge's span maps to (see repeatBoxAnchorPoints) -- a quick
    // visual hint that the box's WIDTH becomes one repeat measurement
    // and its HEIGHT becomes the other, not just a generic selection.
    const anchors = repeatBoxAnchorPoints(box);
    ctx.lineWidth = 3;
    [["wale", WALE_COLOR], ["course", COURSE_COLOR]].forEach(([axis, color]) => {
      const [a, b] = anchors[axis].map(naturalToDisplay);
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
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
      const isDragging = state.cal.draggingIndex === i;
      const r = isDragging ? 7 : 5;
      // White ring first -- both a drag affordance (points are draggable
      // once placed, unlike a plain click target) and contrast insurance
      // against a busy/dark background near the point.
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = WALE_COLOR;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
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

  // The only remaining visual difference between an auto-proposed and a
  // manually-added measurement box, now that the box itself is always
  // black -- see ROI_ACCENT_AUTO/ROI_ACCENT_MANUAL above.
  function roiAccentColor(roi) {
    return roi.source === "manual" ? ROI_ACCENT_MANUAL : ROI_ACCENT_AUTO;
  }

  // Stroke a measurement-area rect in near-black with a thin light outline
  // underneath it, so the box stays visible against dark fabric -- a plain
  // black stroke alone can disappear against dark yarn the way the old
  // teal one didn't, but black alone is the ask, so the outline (not a
  // different color) is what carries the dark-fabric case.
  function strokeRoiBox(x, y, w, h, lineWidth, dashed) {
    ctx.setLineDash(dashed ? [5, 4] : []);
    ctx.strokeStyle = ROI_BOX_OUTLINE;
    ctx.lineWidth = lineWidth + 1.5;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = ROI_BOX_COLOR;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  }

  // Small filled+outlined dot at an explicit (cx, cy) display point,
  // colored by source (auto vs. manual) -- see roiAccentColor. Callers
  // place it on the box's right edge, clear of the top-left label chip
  // and the four corner resize handles.
  function drawRoiAccentDot(cx, cy, roi) {
    ctx.fillStyle = roiAccentColor(roi);
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
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

    strokeRoiBox(tl.x, tl.y, w, h, 2, !editable);
    ctx.fillStyle = "rgba(10,10,10,0.12)";
    ctx.fillRect(tl.x, tl.y, w, h);

    if (editable) {
      const handles = roiHandles(state.roi);
      ctx.fillStyle = ROI_BOX_COLOR;
      for (const key of ["tl", "tr", "bl", "br"]) {
        const p = handles[key];
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x - 5, p.y - 5, 10, 10);
        ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
      }
    }
  }

  // Draws every candidate measurement area on the review step: a subtle
  // dashed outline + label chip for each, a solid outline + resize
  // handles for whichever one is currently selected. Every box is black
  // (see strokeRoiBox) -- auto-proposed vs. manually-added is now told
  // apart by a small corner accent dot instead (see roiAccentColor), not
  // by the box's own stroke color.
  function drawAllRois() {
    for (const r of state.rois) {
      const isSelected = r.id === state.selectedRoiId;
      const tl = naturalToDisplay({ x: r.x, y: r.y });
      const w = r.width * getScale();
      const h = r.height * getScale();

      strokeRoiBox(tl.x, tl.y, w, h, isSelected ? 2.5 : 1.5, !isSelected);
      ctx.fillStyle = isSelected ? "rgba(10,10,10,0.18)" : "rgba(10,10,10,0.08)";
      ctx.fillRect(tl.x, tl.y, w, h);

      ctx.font = "bold 12px monospace";
      const padding = 4;
      const metrics = ctx.measureText(r.label);
      ctx.fillStyle = ROI_BOX_COLOR;
      ctx.fillRect(tl.x, tl.y, metrics.width + padding * 2, 16);
      ctx.fillStyle = "#e9ecec";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(r.label, tl.x + padding, tl.y + 8);

      drawRoiAccentDot(tl.x + w, tl.y + h / 2, r); // right-edge midpoint -- clear of the label chip and corner handles

      if (isSelected) {
        const handles = roiHandles(r);
        for (const key of ["tl", "tr", "bl", "br"]) {
          const p = handles[key];
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1;
          ctx.strokeRect(p.x - 5, p.y - 5, 10, 10);
          ctx.fillStyle = ROI_BOX_COLOR;
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

    // Developer diagnostics' "Inspect region" selector picks one region
    // to explain -- draw THAT region's own wale/course lines (not just
    // the primary/overlay region's), so switching regions always shows
    // how each one was actually measured, not just whichever happens to
    // be primary. Falls back to the primary/legacy single-region result
    // when there's no multi-region breakdown to select from.
    const mr = result.multi_roi;
    const selected =
      mr && mr.per_roi && mr.per_roi.length
        ? mr.per_roi.find((m) => m.label === state.selectedDiagnosticRoiLabel) ||
          mr.per_roi.find((m) => m.label === mr.primary_label) ||
          mr.per_roi[0]
        : null;

    if (selected) {
      const selTop = naturalToDisplay({ x: selected.x, y: selected.y });
      const selBottom = naturalToDisplay({ x: selected.x + selected.width, y: selected.y + selected.height });
      drawAxisLines(selected.wale.positions_px, waleIsVertical, WALE_COLOR, selTop, selBottom);
      drawAxisLines(selected.course.positions_px, !waleIsVertical, COURSE_COLOR, selTop, selBottom);
    } else {
      drawAxisLines(result.wale.positions_px, waleIsVertical, WALE_COLOR, roiTop, roiBottom);
      drawAxisLines(result.course.positions_px, !waleIsVertical, COURSE_COLOR, roiTop, roiBottom);
    }

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
      const d = selected ? selected.loop_lattice_debug : result.loop_lattice_debug;
      const dRoiTop = selected ? naturalToDisplay({ x: selected.x, y: selected.y }) : roiTop;
      const dRoiBottom = selected
        ? naturalToDisplay({ x: selected.x + selected.width, y: selected.y + selected.height })
        : roiBottom;
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
      ctx.globalAlpha = 0.55;
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = ROI_BOX_OUTLINE;
      ctx.lineWidth = (isPrimary ? 1.5 : 1) + 1.5;
      ctx.strokeRect(tl.x, tl.y, w, h);
      ctx.strokeStyle = ROI_BOX_COLOR;
      ctx.lineWidth = isPrimary ? 1.5 : 1;
      ctx.strokeRect(tl.x, tl.y, w, h);
      ctx.restore();
      // Label as black text with a light outline (strokeText underneath,
      // same treatment as the box itself) so it stays legible directly on
      // dark fabric with no background chip behind it here.
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = ROI_BOX_OUTLINE;
      ctx.strokeText(roi.label, tl.x + 3, tl.y + 2);
      ctx.fillStyle = ROI_BOX_COLOR;
      ctx.fillText(roi.label, tl.x + 3, tl.y + 2);
      drawRoiAccentDot(tl.x + w, tl.y + h / 2, roi);
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
      state.cal = { points: [], knownDistance: null, unit: unitSelect.value, pixelsPerMm: null, draggingIndex: null };
      state.calAutoDetectPending = false;
      state.calAutoDetected = false;
      state.gridBox = { visible: false, unit: state.gridBox.unit, x: null, y: null, dragging: false, dragOffset: null };
      state.roi = null;
      state.result = null;
      state.showMeasurementAreas = false;
      state.selectedDiagnosticRoiLabel = null;
      resetCalibrationUI();
      resetRoiUI();
      resetView();
      syncCanvasSize();
      goToStep("calibrate");
      detectRulerCalibration();
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
    calAutoHint.hidden = true;
    calAutoHint.textContent = "";
    calPopup.hidden = true;
    calSpanHint.hidden = true;
  }

  function calibrationSpanPx() {
    if (state.cal.points.length !== 2) return null;
    return Math.hypot(
      state.cal.points[1].x - state.cal.points[0].x,
      state.cal.points[1].y - state.cal.points[0].y
    );
  }

  // Short-span hint: click-placement error is a roughly FIXED number of
  // pixels regardless of how far apart the two points are, so its effect
  // on the resulting px/inch is a ratio (error / span) -- a hint text
  // threshold expressed that way stays equally valid on a 500px photo
  // and a 5000px one, unlike a fixed "warn under 200px" rule would.
  function updateSpanHint() {
    const span = calibrationSpanPx();
    if (span === null || span <= 0) {
      calSpanHint.hidden = true;
      return;
    }
    const errorFraction = CAL_ASSUMED_CLICK_ERROR_PX / span;
    if (errorFraction <= CAL_SHORT_SPAN_ERROR_THRESHOLD) {
      calSpanHint.hidden = true;
      return;
    }
    calSpanHint.textContent =
      `Short span (${span.toFixed(0)}px) -- a ${CAL_ASSUMED_CLICK_ERROR_PX}px click error here is ` +
      `≈${(errorFraction * 100).toFixed(1)}% of the calibration. A longer span (e.g. spanning more of a ` +
      `ruler) is more accurate.`;
    calSpanHint.hidden = false;
  }

  function updateCalibrationUI() {
    if (state.cal.points.length < 2) {
      calStatus.textContent =
        state.cal.points.length === 0 ? "Click the first point." : "Click the second point.";
      calConfirmBtn.disabled = true;
      calPopup.hidden = true;
      return;
    }
    calStatus.textContent = "Enter the known distance in the popup, then confirm (you can still drag either point).";
    calPopup.hidden = false;
    positionCalPopup();
    updateSpanHint();
    updatePpmPreview();
  }

  function updatePpmPreview() {
    const known = parseFloat(knownDistanceInput.value);
    const span = calibrationSpanPx();
    if (span !== null && known > 0) {
      const unitToMm = { cm: 10, in: 25.4 };
      const mm = known * unitToMm[unitSelect.value];
      const ppm = span / mm;
      const perInch = ppm * 25.4;
      ppmPreview.textContent = `≈ ${perInch.toFixed(1)} px/inch  (${ppm.toFixed(3)} px/mm)`;
      calConfirmBtn.disabled = false;
    } else {
      ppmPreview.textContent = "";
      calConfirmBtn.disabled = true;
    }
  }

  knownDistanceInput.addEventListener("input", updatePpmPreview);
  unitSelect.addEventListener("change", () => {
    saveDefaultCalUnit(unitSelect.value);
    updatePpmPreview();
  });

  // Keeps the popup visually anchored to the calibration points' midpoint
  // under pan/zoom/window-resize -- called from render() while on the
  // calibrate step, same as every other overlay that tracks image
  // coordinates. Uses the canvas's own live bounding rect (already
  // reflecting the current pan/zoom CSS transform) the same way
  // eventToDisplayPoint()'s inverse does, so this needs no separate
  // transform math of its own.
  function positionCalPopup() {
    if (state.cal.points.length < 2 || calPopup.hidden) return;
    const rect = canvas.getBoundingClientRect();
    const zoom = state.view.zoom || 1;
    const mid = {
      x: (state.cal.points[0].x + state.cal.points[1].x) / 2,
      y: (state.cal.points[0].y + state.cal.points[1].y) / 2,
    };
    const dispMid = naturalToDisplay(mid);
    calPopup.style.left = `${rect.left + dispMid.x * zoom}px`;
    calPopup.style.top = `${rect.top + dispMid.y * zoom}px`;
  }

  // Automatic ruler calibration detection (see backend /detect-ruler,
  // which wraps analysis.gauge_analysis.detect_ruler_calibration). Runs
  // as soon as an image is uploaded, BEFORE the user clicks anything, and
  // -- if it finds a plausible ruler -- pre-fills the two calibration
  // points, known distance, and unit as a SUGGESTION only: the Confirm
  // Calibration button still requires the user's own click (same as
  // every other value on this step, auto-filled or not), and clicking
  // "Redo Points" or marking a point manually always wins over a
  // still-in-flight or already-applied auto-detection. Best-effort only
  // -- any failure here just leaves manual calibration exactly as it
  // already was, with no error shown (this is a convenience, not a
  // required step).
  async function detectRulerCalibration() {
    if (!CONFIG.API_BASE_URL) return;
    const forFile = state.file;
    state.calAutoDetectPending = true;

    let data;
    try {
      const fd = new FormData();
      fd.append("file", forFile);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
      let res;
      try {
        res = await fetch(`${CONFIG.API_BASE_URL}/detect-ruler`, {
          method: "POST",
          body: fd,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      data = await res.json();
      if (!res.ok || !data.success) return;
    } catch {
      return;
    } finally {
      // Only this request's own "in flight" claim is cleared here -- if
      // the user already took over manually, they've already flipped
      // this back to false themselves, and the check below still catches it.
      if (state.file === forFile) state.calAutoDetectPending = false;
    }

    // The image may have changed, or the user may already be calibrating
    // manually, since this request went out -- never overwrite either.
    if (state.file !== forFile || state.cal.points.length > 0) return;

    state.cal.points = [
      { x: data.point1_px[0], y: data.point1_px[1] },
      { x: data.point2_px[0], y: data.point2_px[1] },
    ];
    knownDistanceInput.value = data.suggested_distance;
    unitSelect.value = data.suggested_unit;
    state.calAutoDetected = true;

    const confidencePct = Math.round((data.confidence || 0) * 100);
    const spanDesc =
      data.major_tick_count >= 2
        ? `${data.suggested_distance} ${data.suggested_unit} between two numbered tick marks`
        : "a short span of ruler tick marks";
    calAutoHint.textContent =
      `Auto-detected from a ruler in your photo (${spanDesc}, ~${confidencePct}% confidence). ` +
      `Review the two points and known distance below, then confirm — or click "Redo Points" to mark manually.`;
    calAutoHint.hidden = false;

    updateCalibrationUI();
    render();
  }

  calRedoBtn.addEventListener("click", () => {
    state.cal.points = [];
    state.cal.draggingIndex = null;
    state.calAutoDetectPending = false; // user is taking over manually -- don't let a late auto-detect response overwrite this
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

  // --- Grid box: a draggable, to-scale counting square -----------------
  //
  // A movable, physically-proportioned (1in or 1cm, toggleable) square
  // drawn over the photo once calibration is confirmed
  // (currentPixelsPerMm() is only non-null AFTER that click -- see
  // calConfirmBtn's handler -- which is what "available only after
  // calibration" means here). Every length here is exact: computed from
  // currentPixelsPerMm() so the side really does match the calibrated
  // scale, same as every other overlay measurement in this file.
  const GRID_BOX_UNIT_MM = { in: 25.4, cm: 10 };

  function gridBoxSpec() {
    const ppm = currentPixelsPerMm();
    if (!ppm) return null;
    return { ppm, sidePx: GRID_BOX_UNIT_MM[state.gridBox.unit] * ppm };
  }

  function ensureGridBoxPosition(spec) {
    if (state.gridBox.x !== null && state.gridBox.y !== null) return;
    const cx = state.naturalWidth / 2 + spec.sidePx * 0.6;
    const cy = state.naturalHeight / 2 + spec.sidePx * 0.6;
    state.gridBox.x = clamp(cx - spec.sidePx / 2, 0, Math.max(0, state.naturalWidth - spec.sidePx));
    state.gridBox.y = clamp(cy - spec.sidePx / 2, 0, Math.max(0, state.naturalHeight - spec.sidePx));
  }

  function pointInGridBoxDisplay(displayPt, spec) {
    const origin = naturalToDisplay({ x: state.gridBox.x, y: state.gridBox.y });
    const sideDisplay = spec.sidePx * getScale();
    return (
      displayPt.x >= origin.x && displayPt.x <= origin.x + sideDisplay &&
      displayPt.y >= origin.y && displayPt.y <= origin.y + sideDisplay
    );
  }

  const GRID_BOX_COLOR = "#c04fd6"; // violet -- distinct from every other overlay color in this file

  function drawGridBox() {
    if (!state.gridBox.visible) return;
    const spec = gridBoxSpec();
    if (!spec) return;
    ensureGridBoxPosition(spec);

    const s = getScale();
    const origin = naturalToDisplay({ x: state.gridBox.x, y: state.gridBox.y });
    const side = spec.sidePx * s;

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.9)"; // light outline pass first, same dark-fabric-contrast
    ctx.lineWidth = 3.5;                       // treatment as the measurement boxes (see strokeRoiBox)
    ctx.strokeRect(origin.x, origin.y, side, side);
    ctx.strokeStyle = GRID_BOX_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(origin.x, origin.y, side, side);
    ctx.fillStyle = "rgba(192,79,214,0.08)";
    ctx.fillRect(origin.x, origin.y, side, side);
    ctx.restore();

    ctx.font = "bold 11px monospace";
    ctx.fillStyle = GRID_BOX_COLOR;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(`1 ${state.gridBox.unit}`, origin.x + 3, origin.y - 3);
  }

  function updateGridBoxUI() {
    const available = currentPixelsPerMm() !== null;
    gridBoxControls.hidden = !available;
    if (!available) state.gridBox.visible = false;
    gridBoxToggleBtn.classList.toggle("is-active", state.gridBox.visible);
    gridBoxToggleBtn.setAttribute("aria-pressed", String(state.gridBox.visible));
    gridBoxUnitBtn.hidden = !state.gridBox.visible;
    gridBoxUnitBtn.textContent = `1 ${state.gridBox.unit}`;
    gridBoxPanel.hidden = !state.gridBox.visible;
    if (state.gridBox.visible) {
      positionGridBoxPanel();
      updateGridBoxSaveButton();
    }
  }

  gridBoxToggleBtn.addEventListener("click", () => {
    state.gridBox.visible = !state.gridBox.visible;
    if (!state.gridBox.visible) {
      gridBoxStatus.hidden = true;
      gridBoxError.hidden = true;
    }
    updateGridBoxUI();
    render();
  });

  gridBoxUnitBtn.addEventListener("click", () => {
    state.gridBox.unit = state.gridBox.unit === "in" ? "cm" : "in";
    // Re-anchor at the same CENTER point under the new side length, rather
    // than keeping the top-left corner fixed -- switching units shouldn't
    // make the box visually jump off in one direction.
    const spec = gridBoxSpec();
    if (spec && state.gridBox.x !== null) {
      const oldSide = GRID_BOX_UNIT_MM[state.gridBox.unit === "in" ? "cm" : "in"] * spec.ppm;
      const cx = state.gridBox.x + oldSide / 2;
      const cy = state.gridBox.y + oldSide / 2;
      state.gridBox.x = clamp(cx - spec.sidePx / 2, 0, Math.max(0, state.naturalWidth - spec.sidePx));
      state.gridBox.y = clamp(cy - spec.sidePx / 2, 0, Math.max(0, state.naturalHeight - spec.sidePx));
    }
    updateGridBoxUI();
    render();
  });

  // Mirrors positionCalPopup() -- see its comment for why the canvas's own
  // live bounding rect is enough to convert a natural-coordinate anchor
  // into an on-screen position with no separate pan/zoom transform math.
  function positionGridBoxPanel() {
    if (!state.gridBox.visible || gridBoxPanel.hidden) return;
    const spec = gridBoxSpec();
    if (!spec) return;
    const rect = canvas.getBoundingClientRect();
    const zoom = state.view.zoom || 1;
    const anchor = { x: state.gridBox.x + GRID_BOX_UNIT_MM[state.gridBox.unit] * spec.ppm / 2, y: state.gridBox.y + GRID_BOX_UNIT_MM[state.gridBox.unit] * spec.ppm };
    const disp = naturalToDisplay(anchor);
    gridBoxPanel.style.left = `${rect.left + disp.x * zoom}px`;
    gridBoxPanel.style.top = `${rect.top + disp.y * zoom}px`;
  }

  function updateGridBoxSaveButton() {
    const waleCount = parseInt(gridWaleCountInput.value, 10);
    const courseCount = parseInt(gridCourseCountInput.value, 10);
    gridBoxSaveBtn.disabled = !((waleCount > 0 || courseCount > 0) && currentPixelsPerMm() !== null);
  }
  gridWaleCountInput.addEventListener("input", updateGridBoxSaveButton);
  gridCourseCountInput.addEventListener("input", updateGridBoxSaveButton);

  gridBoxSaveBtn.addEventListener("click", async () => {
    const spec = gridBoxSpec();
    if (!spec || state.gridBox.x === null) return;
    const waleCount = parseInt(gridWaleCountInput.value, 10);
    const courseCount = parseInt(gridCourseCountInput.value, 10);
    if (!(waleCount > 0) && !(courseCount > 0)) return;

    gridBoxError.hidden = true;
    gridBoxStatus.hidden = false;
    gridBoxStatus.textContent = "Saving…";
    gridBoxSaveBtn.disabled = true;

    try {
      if (!CONFIG.API_BASE_URL) {
        throw new Error("Analysis service is not configured yet, so ground truth can't be saved.");
      }
      const sideMm = GRID_BOX_UNIT_MM[state.gridBox.unit];
      const fd = new FormData();
      fd.append("roi_x", state.gridBox.x);
      fd.append("roi_y", state.gridBox.y);
      fd.append("roi_width_px", spec.sidePx);
      fd.append("roi_height_px", spec.sidePx);
      fd.append("roi_width_mm", sideMm);
      fd.append("roi_height_mm", sideMm);
      fd.append("pixels_per_mm", spec.ppm);
      fd.append("orientation", state.orientation);
      // Deliberately NO predicted_* fields -- this is a standalone,
      // human-counted ground-truth observation against the image and
      // calibration, not a correction against any one analyzed ROI's
      // prediction (the grid box is usually positioned somewhere the
      // automatic detector never analyzed at all, and -- per the whole
      // point of making the box available before Analyze -- may well be
      // recorded before any prediction exists yet).
      if (waleCount > 0) fd.append("actual_wale_count", waleCount);
      if (courseCount > 0) fd.append("actual_course_count", courseCount);
      fd.append("calibration_correct", true);
      fd.append("orientation_correct", true);
      fd.append("algorithm_version", "grid-box-manual-count");

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
      fd.append("save_image", false); // no image-save consent checkbox on this compact panel -- never opt in implicitly

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
        throw new Error(data.message || `Could not save ground truth (HTTP ${res.status}).`);
      }

      gridBoxStatus.textContent = `Saved (sample ${data.id.slice(0, 8)}…).`;
      gridWaleCountInput.value = "";
      gridCourseCountInput.value = "";
    } catch (err) {
      gridBoxStatus.hidden = true;
      if (err && err.name === "AbortError") {
        gridBoxError.textContent = "Saving timed out. Try again shortly.";
      } else if (err instanceof TypeError) {
        gridBoxError.textContent = "Could not reach the analysis service to save this.";
      } else {
        gridBoxError.textContent = (err && err.message) || "Could not save. Please try again.";
      }
      gridBoxError.hidden = false;
    } finally {
      updateGridBoxSaveButton();
    }
  });

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
    if (state.pinchActive) return; // a second touch just landed -- see the pinch block above

    // The grid box (if visible) sits on top of every other interaction on
    // every step it's available in -- hit-test it first so dragging it
    // never gets shadowed by whatever the current step would otherwise
    // do with this same click.
    if (state.gridBox.visible) {
      const spec = gridBoxSpec();
      if (spec) {
        ensureGridBoxPosition(spec);
        const dispPt = eventToDisplayPoint(evt);
        if (pointInGridBoxDisplay(dispPt, spec)) {
          const natPt = displayToNatural(dispPt);
          state.gridBox.dragging = true;
          state.gridBox.dragOffset = { dx: natPt.x - state.gridBox.x, dy: natPt.y - state.gridBox.y };
          canvas.setPointerCapture(evt.pointerId);
          render();
          return;
        }
      }
    }

    if (state.currentStep === "results" && state.repeatMark.active) {
      const pt = displayToNatural(eventToDisplayPoint(evt));
      state.repeatMark.dragging = true;
      state.repeatMark.anchor = pt;
      state.repeatMark.box = { x: pt.x, y: pt.y, width: 0, height: 0 };
      canvas.setPointerCapture(evt.pointerId);
      repeatMarkStatus.textContent = "Drag to the diagonally opposite corner of the same repeat cell, then release.";
      render();
      return;
    }

    if (state.currentStep === "calibrate") {
      if (state.cal.points.length === 2) {
        // Both points already placed -- hit-test for a drag instead of
        // ignoring the click outright, so either point can be nudged
        // (with the popup's px/inch updating live) without needing
        // "Redo Points" to start over.
        const dispPt = eventToDisplayPoint(evt);
        for (let i = 0; i < 2; i++) {
          const p = naturalToDisplay(state.cal.points[i]);
          if (Math.hypot(dispPt.x - p.x, dispPt.y - p.y) <= HANDLE_HIT_RADIUS) {
            state.cal.draggingIndex = i;
            canvas.setPointerCapture(evt.pointerId);
            render();
            return;
          }
        }
        return; // missed both points -- ignored, same as the old "must Redo first" behavior
      }
      state.calAutoDetectPending = false; // user is marking manually -- don't let a late auto-detect response overwrite this
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

  const MIN_REPEAT_BOX_PX = 8; // a drag smaller than this in either dimension is treated as an accidental click, not a real box

  canvas.addEventListener("pointermove", (evt) => {
    if (state.currentStep !== "results" || !state.repeatMark.dragging) return;
    const pt = displayToNatural(eventToDisplayPoint(evt));
    state.repeatMark.box = normalizeRect(state.repeatMark.anchor, pt);
    render();
  });

  canvas.addEventListener("pointerup", (evt) => {
    if (state.currentStep !== "results" || !state.repeatMark.dragging) return;
    if (canvas.hasPointerCapture(evt.pointerId)) canvas.releasePointerCapture(evt.pointerId);
    state.repeatMark.dragging = false;
    const box = state.repeatMark.box;
    if (!box || box.width < MIN_REPEAT_BOX_PX || box.height < MIN_REPEAT_BOX_PX) {
      repeatMarkStatus.textContent = "That box was too small -- drag a larger one spanning one full repeat cell.";
      state.repeatMark.box = null;
      render();
      return;
    }
    performRepeatMatch();
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

  // Grid box drag -- unlike the roi/repeat-mark drags above, this isn't
  // gated to one currentStep, since the box stays available (and
  // draggable) across roi/orientation/analyze/results once calibration
  // is confirmed.
  canvas.addEventListener("pointermove", (evt) => {
    if (!state.gridBox.dragging) return;
    const spec = gridBoxSpec();
    if (!spec) {
      state.gridBox.dragging = false;
      return;
    }
    const natPt = displayToNatural(eventToDisplayPoint(evt));
    state.gridBox.x = clamp(natPt.x - state.gridBox.dragOffset.dx, 0, Math.max(0, state.naturalWidth - spec.sidePx));
    state.gridBox.y = clamp(natPt.y - state.gridBox.dragOffset.dy, 0, Math.max(0, state.naturalHeight - spec.sidePx));
    render();
  });
  function endGridBoxDrag(evt) {
    if (!state.gridBox.dragging) return;
    if (canvas.hasPointerCapture(evt.pointerId)) canvas.releasePointerCapture(evt.pointerId);
    state.gridBox.dragging = false;
  }
  canvas.addEventListener("pointerup", endGridBoxDrag);
  canvas.addEventListener("pointercancel", endGridBoxDrag);

  // Calibration point drag -- see the calibrate-step pointerdown branch
  // above for the hit-test that starts this.
  canvas.addEventListener("pointermove", (evt) => {
    if (state.cal.draggingIndex === null) return;
    const pt = displayToNatural(eventToDisplayPoint(evt));
    state.cal.points[state.cal.draggingIndex] = pt;
    updateCalibrationUI(); // live px/inch + span hint as the point moves
    render();
  });
  function endCalDrag(evt) {
    if (state.cal.draggingIndex === null) return;
    if (canvas.hasPointerCapture(evt.pointerId)) canvas.releasePointerCapture(evt.pointerId);
    state.cal.draggingIndex = null;
    render();
  }
  canvas.addEventListener("pointerup", endCalDrag);
  canvas.addEventListener("pointercancel", endCalDrag);

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

    // "Verify by counting a repeat" is an optional, secondary check --
    // real material for a normal user only when the automatic result is
    // already flagged uncertain. Surfacing it unconditionally on every
    // result (even a confident one) invited exactly the wrong reading if
    // it ever failed on its own (e.g. a transient backend issue): a
    // failure in this OPTIONAL cross-check looked like the primary
    // detection itself was broken. Hidden entirely otherwise; still
    // collapsed by default even when shown, so using it is still opt-in.
    if (level === "Low") {
      resultsWarning.textContent = "Low confidence — try “Verify by counting a repeat” below to double-check.";
      resultsWarning.hidden = false;
      repeatCountPanel.hidden = false;
    } else {
      resultsWarning.hidden = true;
      repeatCountPanel.hidden = true;
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
    resetRepeatMarkUI();
    repeatMatchResult.innerHTML = "";
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

  // --- Verify by counting a repeat (user-anchored template match) --------
  //
  // Independent of automatic wale/course detection: the user marks two
  // points on the SAME feature of two adjacent repeats, and the backend
  // (POST /count-repeats, see analysis.gauge_analysis.count_repeats_by_
  // template_match) counts real occurrences of that exact patch across
  // the whole photo via normalized cross-correlation. Never fed back into
  // the automatic result -- shown alongside it as a second opinion the
  // user can compare against, same spirit as the loop-lattice debug view.

  // A repeat-cell box's width spans one wale-to-wale repeat and its
  // height spans one course-to-course repeat, but WHICH image axis (x or
  // y) that corresponds to depends on orientation -- wales are vertical
  // columns whose SPACING is measured horizontally, courses are
  // horizontal rows whose spacing is measured vertically (see the
  // backend's _direction_for docstring; this mirrors it exactly so the
  // two count-repeats calls below measure the same thing the backend
  // itself would call "wale" and "course"). Returns anchor point PAIRS
  // (not periods) since /count-repeats takes two points spanning one
  // repeat, same contract count_repeats_by_template_match always has.
  function repeatBoxAnchorPoints(box) {
    const midX = box.x + box.width / 2;
    const midY = box.y + box.height / 2;
    const horizontalPair = [{ x: box.x, y: midY }, { x: box.x + box.width, y: midY }];
    const verticalPair = [{ x: midX, y: box.y }, { x: midX, y: box.y + box.height }];
    const waleDir = state.orientation === "vertical" ? "horizontal" : "vertical";
    return {
      wale: waleDir === "horizontal" ? horizontalPair : verticalPair,
      course: waleDir === "horizontal" ? verticalPair : horizontalPair,
    };
  }

  function resetRepeatMarkUI() {
    state.repeatMark = { active: false, dragging: false, anchor: null, box: null };
    cancelRepeatMarkBtn.hidden = true;
    repeatMarkStatus.hidden = true;
    markRepeatBtn.disabled = false;
  }

  function armRepeatMark() {
    state.repeatMark = { active: true, dragging: false, anchor: null, box: null };
    cancelRepeatMarkBtn.hidden = false;
    markRepeatBtn.disabled = true;
    repeatMarkStatus.hidden = false;
    repeatMarkStatus.textContent = "Drag a box around one full repeat cell -- corner to the same corner on the diagonally adjacent stitch.";
    render();
  }

  markRepeatBtn.addEventListener("click", armRepeatMark);
  cancelRepeatMarkBtn.addEventListener("click", () => {
    resetRepeatMarkUI();
    render();
  });

  async function fetchRepeatCount(axis, anchorStart, anchorEnd, ppm) {
    const fd = new FormData();
    fd.append("file", state.file);
    fd.append("roi_x", 0);
    fd.append("roi_y", 0);
    fd.append("roi_width", state.naturalWidth);
    fd.append("roi_height", state.naturalHeight);
    fd.append("anchor_start_x", anchorStart.x);
    fd.append("anchor_start_y", anchorStart.y);
    fd.append("anchor_end_x", anchorEnd.x);
    fd.append("anchor_end_y", anchorEnd.y);
    fd.append("orientation", state.orientation);
    fd.append("axis", axis);
    fd.append("pixels_per_mm", ppm);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/count-repeats`, {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned an unexpected response (HTTP ${res.status}).`);
      }
      if (!res.ok) {
        throw new Error(data.message || `Counting repeats failed (HTTP ${res.status}).`);
      }
      return { axis, data };
    } catch (err) {
      return { axis, error: err.message || String(err) };
    } finally {
      clearTimeout(timer);
    }
  }

  async function performRepeatMatch() {
    const box = state.repeatMark.box;
    const ppm = currentPixelsPerMm();
    repeatMarkStatus.textContent = "Counting repeats…";

    if (!CONFIG.API_BASE_URL || !ppm) {
      repeatMarkStatus.textContent = "Analysis service not configured.";
      resetRepeatMarkUI();
      render();
      return;
    }

    const anchors = repeatBoxAnchorPoints(box);
    const [waleResult, courseResult] = await Promise.all([
      fetchRepeatCount("wale", anchors.wale[0], anchors.wale[1], ppm),
      fetchRepeatCount("course", anchors.course[0], anchors.course[1], ppm),
    ]);
    renderRepeatMatchResults(waleResult, courseResult);

    resetRepeatMarkUI();
    render();
  }

  function repeatMatchResultCard(result) {
    const label = result.axis === "course" ? "Courses" : "Wales";
    const color = result.axis === "course" ? COURSE_COLOR : WALE_COLOR;
    if (result.error) {
      return `<p class="tgr-error">${escapeHtml(label)}: ${escapeHtml(result.error)}</p>`;
    }
    const { data } = result;
    if (!data.success) {
      return `<p class="tgr-hint">${escapeHtml(label)}: ${escapeHtml(data.message || "No matches found.")}</p>`;
    }
    const perInch = data.per_inch != null ? data.per_inch.toFixed(2) : "—";
    return `
      <div class="tgr-result-card" style="border-color:${color}">
        <div class="tgr-result-card__label">${escapeHtml(label)} / inch (counted)</div>
        <div class="tgr-result-card__value" style="color:${color}">${perInch}</div>
        <div class="tgr-result-card__sub">${data.match_count} repeats matched · ${(data.confidence * 100).toFixed(0)}% confidence</div>
      </div>
      <p class="tgr-hint">${escapeHtml(data.message || "")}</p>
    `;
  }

  function renderRepeatMatchResults(waleResult, courseResult) {
    repeatMatchResult.innerHTML = `
      <div class="tgr-repeat-result-row">
        <div>${repeatMatchResultCard(waleResult)}</div>
        <div>${repeatMatchResultCard(courseResult)}</div>
      </div>
    `;
  }

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
    render(); // the canvas overlay (wale/course lines, loop-lattice columns) is per-selected-region too
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
              ${scoreRow("Template-match confirmation", d.template_match_score)}
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
    state.cal = { points: [], knownDistance: null, unit: loadDefaultCalUnit(), pixelsPerMm: null, draggingIndex: null };
    state.calAutoDetectPending = false;
    state.calAutoDetected = false;
    state.gridBox = { visible: false, unit: "in", x: null, y: null, dragging: false, dragOffset: null };
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
  unitSelect.value = loadDefaultCalUnit();
  goToStep("upload");
  checkServiceHealth();
  setupExportLinks();
})();
