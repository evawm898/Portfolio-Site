// Shape editor — STATIC PAGE, three stages, one page (plus a Panels tab),
// backed by an in-browser shell/layout LIBRARY (IndexedDB via
// shape-editor-db.js). There is no server: this file, geom.js's math,
// shape-editor-yaml.js's tiny parser, shape-editor-chart.js's (theta, s)
// port, shape-editor-db.js's library, and a baked JSON snapshot are the
// whole application.
//
// STAGE 1 (Upload) -> STAGE 2 (Shape) -> STAGE 3 (Shells) -> Panels.
//
// Upload is pure input: load photos, calibrate by clicking two landmarks.
// Shape is where tracing and editing merge into one action: dragging a
// point against the calibrated backdrop IS both, live. Shells is a
// LIBRARY, not a single slot — "Save" creates a named, timestamped entry
// (with a 3D-view thumbnail); the library lists every saved shell with
// open/duplicate/rename/delete. Opening loads it into Shape; duplicating
// forks it so a variant can be explored without touching the original.
//
// LAYOUTS BELONG TO SHELLS: each shell owns its own set of named layouts
// (Panels tab). A layout is only meaningful against the (theta, s) chart
// of the shell it was placed on. Two actions are gated by a REAL,
// per-panel standoff impact report (shape-editor-chart.js's scoped port
// of shape_impact.py's seat_standoff), worst first, before proceeding:
//   - saving OVER a shell that owns layouts (their (theta, s) still
//     means something, but what it means just changed)
//   - duplicating a layout onto a DIFFERENT shell
// Nothing else is gated — tab navigation itself is free.
//
// STORAGE: the library lives in IndexedDB (thumbnails + curve sets would
// outgrow localStorage). Export/import the whole library as one JSON file
// for backup — a browser reset wipes IndexedDB same as it wipes
// localStorage, so that's the actual disaster-recovery path, not a nice-
// to-have. A one-time migration lifts the old single-slot localStorage
// save (from before the library existed) into the first library entry.
//
// LIVE vs SNAPSHOT, the one thing this page cannot blur: curve editing,
// 3D regeneration, circumference, and monotonicity are computed in this
// browser on every drag — genuinely live. The curvature/seatability sweep
// is NOT — it's baked at export time and goes stale the instant you drag;
// the snapshot block gets a "may be stale" note the moment any point moves.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { pchipFit, CompoundCoarseShell, monotonicityReport,
        coarseCircumferenceReport, compoundPerimeter, buildAdaptiveOrder,
        checkNamedFeatures, smoothPoints, necklineHeightFn } from "./shape-editor-geom.js";
import { parseShapeYaml, shapeYamlToInitialCurves } from "./shape-editor-yaml.js";
import { buildSurfaceChart, computeStandoffImpact, computeStandoffs, parsePanelClasses, parseLayoutPanels } from "./shape-editor-chart.js";
import * as db from "./shape-editor-db.js";

// -- adaptive point density ---------------------------------------------
// The flat ~31-point seed is replaced ONCE, at load, by the fewest
// adaptively-placed points meeting a target between-point residual
// against the TRUE dense generated curve (1601 points, baked by
// export_shape_editor_static.py). After that, every density-slider move
// resamples against whatever curve currently exists on screen (hand
// edits included), never against the original dense table again.
const MAX_POINTS = 40;
const MIN_POINTS = 4;
const DEFAULT_TARGET_RESIDUAL_MM = 0.7;
const FEATURE_LOST_THRESHOLD_MM = 1.5;

function computeFeatureFloor(cache, thresholdMm) {
  for (let n = MIN_POINTS; n <= cache.order.length; n++) {
    const pts = [...cache.order.slice(0, n)].sort((a, b) => a.v - b.v);
    const fit = pchipFit(pts.map(p => p.v), pts.map(p => p.y));
    if (!checkNamedFeatures(fit, cache.baseFit, thresholdMm).some(f => f.lost)) return n;
  }
  return null;
}
function buildDensityCacheFromFit(fit) {
  const built = buildAdaptiveOrder(fit, V_LO, V_HI, { maxPoints: MAX_POINTS, minResidual: 0 });
  const cache = { ...built, baseFit: fit };
  cache.floor = computeFeatureFloor(cache, FEATURE_LOST_THRESHOLD_MM);
  return cache;
}
function buildDensityCache(points) {
  const sorted = [...points].sort((a, b) => a.v - b.v);
  return buildDensityCacheFromFit(pchipFit(sorted.map(p => p.v), sorted.map(p => p.y)));
}
function firstCountMeetingResidual(cache, targetMm) {
  for (let n = 2; n <= cache.order.length; n++) {
    const r = cache.residualAtCount.get(n);
    if (r && r.max <= targetMm) return n;
  }
  return cache.order.length;
}
function applyDensityTo(cache, targetCount) {
  const n = Math.max(MIN_POINTS, Math.min(targetCount, cache.order.length));
  const newPts = cache.order.slice(0, n).map(p => ({ v: p.v, y: p.y })).sort((a, b) => a.v - b.v);
  const newFit = pchipFit(newPts.map(p => p.v), newPts.map(p => p.y));
  const residual = cache.residualAtCount.get(n) || { max: 0, rms: 0 };
  const features = checkNamedFeatures(newFit, cache.baseFit, FEATURE_LOST_THRESHOLD_MM);
  return { points: newPts, count: n, residual, features };
}
function fmtDensity(r, label, floor) {
  const lost = r.features.filter(f => f.lost);
  const floorText = floor != null
    ? `floor <b>${floor}</b> pts (all named features intact at/above this)`
    : `floor not reached within ${MAX_POINTS} pts`;
  const residualText = `between-point residual max ${r.residual.max.toFixed(2)} mm, rms ${r.residual.rms.toFixed(2)} mm`;
  if (lost.length) {
    return `<div class="featureWarn">⚠ <b>${label}: ${r.count} pts — ` +
      `LOST ${lost.map(f => f.name).join(", ")}</b> — ${floorText}</div>${residualText}`;
  }
  return `${label}: <b>${r.count}</b> pts · ${residualText} · ` +
    `<span class="ok">named features intact</span> · ${floorText}`;
}

const $ = (id) => document.getElementById(id);
const status = (msg, cls = "") => { $("status").innerHTML = `<span class="${cls}">${msg}</span>`; };

const state = await (await fetch("./assets/shape-editor-data.json")).json();
const V_LO = state.domain.v_lo, V_HI = state.domain.v_hi;
const SPLIT = state.bounds.split_theta;

// ---------------------------------------------------------------- shared canvas geometry
const PAD = 20;
function axes(canvas) {
  const CX = canvas.width / 2;
  const pxPerMm = (canvas.height - 2 * PAD) / (V_HI - V_LO);
  const yOf = (v) => canvas.height - PAD - (v - V_LO) * pxPerMm;
  const vOf = (y) => V_LO + (canvas.height - PAD - y) / pxPerMm;
  return { CX, pxPerMm, yOf, vOf };
}

// -- backdrop calibration -------------------------------------------------
const BREAST_TIP_DEFAULT_MM = 175.0;

function containFit(naturalW, naturalH, boxX, boxY, boxW, boxH) {
  const scale = Math.min(boxW / naturalW, boxH / naturalH);
  const dw = naturalW * scale, dh = naturalH * scale;
  return { dx: boxX + (boxW - dw) / 2, dy: boxY + (boxH - dh) / 2, dw, dh, scale };
}

class BackdropCalibration {
  constructor() {
    this.calibrated = false;
    this.naturalWidth = null; this.naturalHeight = null;
    this.uncalFitRect = null;
    this.waistPx = null; this.hemPx = null;
    this.mmPerPxV = null; this.mmPerPxH = null;
    this.xOriginPx = null;
    this.hRefMethod = "aspect";
    this.hRef = null;
    this.imageLabel = null;
  }
  setNaturalSize(w, h, boxX, boxY, boxW, boxH) {
    this.naturalWidth = w; this.naturalHeight = h;
    this.uncalFitRect = containFit(w, h, boxX, boxY, boxW, boxH);
    if (this.xOriginPx == null) this.xOriginPx = w / 2;
  }
  canvasToImgPx(cx, cy) {
    const r = this.uncalFitRect;
    return { x: (cx - r.dx) / r.scale, y: (cy - r.dy) / r.scale };
  }
  setVertical(waistPx, hemPx) {
    const dPx = hemPx.y - waistPx.y;
    if (dPx <= 1e-6) return false;
    this.waistPx = waistPx; this.hemPx = hemPx;
    this.mmPerPxV = (0.0 - V_LO) / dPx;
    if (this.hRefMethod === "aspect") this.mmPerPxH = this.mmPerPxV;
    this.calibrated = true;
    return true;
  }
  setHorizontalRef(leftPx, rightPx, mm) {
    const dPx = Math.abs(rightPx.x - leftPx.x);
    if (dPx <= 1e-6 || !(mm > 0)) return false;
    this.hRef = { leftPx, rightPx, mm };
    this.hRefMethod = "independent";
    this.mmPerPxH = mm / dPx;
    this.xOriginPx = (leftPx.x + rightPx.x) / 2;
    return true;
  }
  clearHorizontalRef() {
    this.hRef = null; this.hRefMethod = "aspect";
    this.mmPerPxH = this.mmPerPxV;
    if (this.naturalWidth != null) this.xOriginPx = this.naturalWidth / 2;
  }
  reset() {
    this.calibrated = false;
    this.waistPx = null; this.hemPx = null;
    this.mmPerPxV = null; this.mmPerPxH = null;
    this.hRefMethod = "aspect"; this.hRef = null;
    if (this.naturalWidth != null) this.xOriginPx = this.naturalWidth / 2;
  }
  impliedHeightMm() {
    return (this.mmPerPxV != null && this.naturalHeight != null)
      ? this.mmPerPxV * this.naturalHeight : null;
  }
  imgToReal(px, py) {
    return { vMm: 0.0 - (py - this.waistPx.y) * this.mmPerPxV,
            xMmSigned: (px - this.xOriginPx) * this.mmPerPxH };
  }
  toShapeYaml(imageRelPath) {
    return {
      calibrated: this.calibrated,
      image: imageRelPath,
      image_natural_size: this.naturalWidth != null ? [this.naturalWidth, this.naturalHeight] : null,
      waist_px: this.waistPx ? [this.waistPx.x, this.waistPx.y] : null,
      hem_px: this.hemPx ? [this.hemPx.x, this.hemPx.y] : null,
      mm_per_px_v: this.mmPerPxV, mm_per_px_h: this.mmPerPxH,
      x_origin_px: this.xOriginPx, h_ref_method: this.hRefMethod,
      h_ref: this.hRef ? { left_px: [this.hRef.leftPx.x, this.hRef.leftPx.y],
                           right_px: [this.hRef.rightPx.x, this.hRef.rightPx.y],
                           mm: this.hRef.mm } : null,
      implied_height_mm: this.impliedHeightMm(),
    };
  }
  hydrateFromYaml(c) {
    if (!c) { this.reset(); this.imageLabel = null; return; }
    this.calibrated = !!c.calibrated;
    if (c.image) this.imageLabel = c.image;
    if (Array.isArray(c.image_natural_size)) {
      this.naturalWidth = c.image_natural_size[0]; this.naturalHeight = c.image_natural_size[1];
    }
    if (Array.isArray(c.waist_px)) this.waistPx = { x: c.waist_px[0], y: c.waist_px[1] };
    if (Array.isArray(c.hem_px)) this.hemPx = { x: c.hem_px[0], y: c.hem_px[1] };
    if (typeof c.mm_per_px_v === "number") this.mmPerPxV = c.mm_per_px_v;
    if (typeof c.mm_per_px_h === "number") this.mmPerPxH = c.mm_per_px_h;
    if (typeof c.x_origin_px === "number") this.xOriginPx = c.x_origin_px;
    if (c.h_ref_method) this.hRefMethod = c.h_ref_method;
    if (c.h_ref) {
      this.hRef = {
        leftPx: { x: c.h_ref.left_px[0], y: c.h_ref.left_px[1] },
        rightPx: { x: c.h_ref.right_px[0], y: c.h_ref.right_px[1] },
        mm: c.h_ref.mm,
      };
    }
  }
}

function mapImgPxToCanvas(px, py, calib, yOf, xOf) {
  const { vMm, xMmSigned } = calib.imgToReal(px, py);
  return [xOf(Math.abs(xMmSigned), xMmSigned < 0 ? -1 : 1), yOf(vMm)];
}
function drawLandmarkDot(ctx, imgPx, calib, yOf, xOf, color, label) {
  if (!imgPx) return;
  const [cx, cy] = mapImgPxToCanvas(imgPx.x, imgPx.y, calib, yOf, xOf);
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = "#0c0e0e"; ctx.stroke();
  if (label) { ctx.fillStyle = color; ctx.font = "9px monospace"; ctx.fillText(label, cx + 6, cy - 6); }
}
function drawBackdrop(ctx, canvas, img, calib, yOf, xOf) {
  if (!(img.complete && img.naturalWidth)) return;
  if (!calib.uncalFitRect || calib.naturalWidth !== img.naturalWidth || calib.naturalHeight !== img.naturalHeight) {
    calib.setNaturalSize(img.naturalWidth, img.naturalHeight, PAD, PAD,
                         canvas.width - 2 * PAD, canvas.height - 2 * PAD);
  }
  ctx.save();
  if (!calib.calibrated) {
    const r = calib.uncalFitRect;
    ctx.filter = "grayscale(1)";
    ctx.globalAlpha = 0.18;
    ctx.drawImage(img, r.dx, r.dy, r.dw, r.dh);
  } else {
    const [x0, y0] = mapImgPxToCanvas(0, 0, calib, yOf, xOf);
    const [x1, y1] = mapImgPxToCanvas(img.naturalWidth, img.naturalHeight, calib, yOf, xOf);
    ctx.globalAlpha = 0.22;
    ctx.drawImage(img, Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
    ctx.globalAlpha = 1;
    drawLandmarkDot(ctx, calib.waistPx, calib, yOf, xOf, "#2fa3a3", "waist");
    drawLandmarkDot(ctx, calib.hemPx, calib, yOf, xOf, "#d98a35", "hem");
    if (calib.hRef) {
      drawLandmarkDot(ctx, calib.hRef.leftPx, calib, yOf, xOf, "#e9ecec", "L");
      drawLandmarkDot(ctx, calib.hRef.rightPx, calib, yOf, xOf, "#e9ecec", "R");
    }
  }
  ctx.restore();
}
function drawLandmarks(ctx, canvas, yOf) {
  ctx.strokeStyle = "#d98a35"; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
  for (const v of [0, 181]) {
    if (v < V_LO || v > V_HI) continue;
    const y = yOf(v);
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(canvas.width - PAD, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function defFitOf(table) {
  const zs = table.z, ys = table.y;
  return (v) => {
    if (v <= zs[0]) return ys[0];
    if (v >= zs[zs.length - 1]) return ys[ys.length - 1];
    let lo = 0, hi = zs.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (zs[m] <= v) lo = m; else hi = m; }
    const t = (v - zs[lo]) / (zs[hi] - zs[lo]);
    return ys[lo] + t * (ys[hi] - ys[lo]);
  };
}

const MARK_LAYER_COLORS = { neckline: "#d98a35", hemline: "#e05545", waist: "#8a63d9", armhole: "#4fb0e0" };
const MARK_LAYER_NAMES = Object.keys(MARK_LAYER_COLORS);

// ---------------------------------------------------------------- a(v): mirrored single curve
class CurvePane {
  constructor({ canvas, seed, defaultTable, backdrop, onLive, onDragEnd, calib, traceMode = false }) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.points = seed.map(([v, y]) => ({ v, y }));
    this.defaultTable = defaultTable;
    Object.assign(this, axes(canvas));
    const allY = [...this.points.map(p => p.y), ...defaultTable.y];
    this.yMax = Math.max(...allY) * 1.15;
    this.mmPerPxY = this.yMax / (this.CX - PAD);
    this.dragPoint = null;
    this.onLive = onLive;
    this.onDragEnd = onDragEnd;
    this.calib = calib;
    this.calibClickHandler = null;
    this.traceMode = traceMode;
    this.activeLayer = "silhouette";
    this.markLayers = { neckline: [], hemline: [], waist: [], armhole: [] };
    this.backdrop = backdrop;
    this._wire();
  }
  xOf(val, side) { return this.CX + side * val / this.mmPerPxY; }
  fit() {
    const sorted = [...this.points].sort((a, b) => a.v - b.v);
    return pchipFit(sorted.map(p => p.v), sorted.map(p => p.y));
  }
  draw() {
    const ctx = this.ctx, c = this.canvas;
    ctx.clearRect(0, 0, c.width, c.height);
    if (this.calib) drawBackdrop(ctx, c, this.backdrop, this.calib, this.yOf, this.xOf.bind(this));
    drawLandmarks(ctx, c, this.yOf);
    ctx.strokeStyle = "#2a2f2f"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(this.CX, PAD); ctx.lineTo(this.CX, c.height - PAD); ctx.stroke();
    const defFit = defFitOf(this.defaultTable);
    this._drawCurve(defFit, "#4a5252", true);
    if (this.points.length >= 2) this._drawCurve(this.fit(), "#2fa3a3", false);
    for (const p of this.points) {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(this.xOf(p.y, side), this.yOf(p.v), this.dragPoint === p ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = this.dragPoint === p ? "#e9ecec" : "#2fa3a3";
        ctx.fill();
      }
    }
    if (this.traceMode) {
      for (const key of MARK_LAYER_NAMES) {
        const color = MARK_LAYER_COLORS[key];
        for (const p of this.markLayers[key]) {
          for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(this.xOf(p.y, side), this.yOf(p.v), this.dragPoint === p ? 5 : 3, 0, Math.PI * 2);
            ctx.fillStyle = color; ctx.fill();
          }
        }
      }
    }
  }
  _drawCurve(fit, color, dashed) {
    const ctx = this.ctx, c = this.canvas;
    ctx.strokeStyle = color; ctx.lineWidth = 1.3;
    ctx.setLineDash(dashed ? [4, 3] : []);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      for (let y = PAD; y <= c.height - PAD; y++) {
        const x = this.xOf(fit(this.vOf(y)), side);
        if (y === PAD) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  _pick(mx, my) {
    let best = null, bestD2 = 8 * 8;
    const groups = [this.points];
    if (this.traceMode) for (const key of MARK_LAYER_NAMES) groups.push(this.markLayers[key]);
    for (const pts of groups) {
      for (const p of pts) {
        for (const side of [-1, 1]) {
          const dx = mx - this.xOf(p.y, side), dy = my - this.yOf(p.v);
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD2) { bestD2 = d2; best = p; }
        }
      }
    }
    return best;
  }
  _addPoint(mx, my) {
    const v = Math.max(V_LO, Math.min(V_HI, this.vOf(my)));
    const y = Math.max(15, Math.min(this.yMax, Math.abs(mx - this.CX) * this.mmPerPxY));
    const pt = { v, y };
    if (this.activeLayer === "silhouette") this.points.push(pt);
    else this.markLayers[this.activeLayer].push(pt);
    this.draw(); this.onLive?.(); this.onDragEnd?.();
  }
  _deleteNear(mx, my) {
    const hit = this._pick(mx, my);
    if (!hit) return;
    if (this.points.includes(hit)) {
      if (this.points.length <= 2) return;
      this.points = this.points.filter(p => p !== hit);
    } else {
      for (const key of MARK_LAYER_NAMES) {
        if (this.markLayers[key].includes(hit)) { this.markLayers[key] = this.markLayers[key].filter(p => p !== hit); break; }
      }
    }
    this.draw(); this.onLive?.(); this.onDragEnd?.();
  }
  _wire() {
    const c = this.canvas;
    c.addEventListener("pointerdown", (ev) => {
      const r = c.getBoundingClientRect();
      const mx = ev.clientX - r.left, my = ev.clientY - r.top;
      if (this.calibClickHandler && this.calibClickHandler(mx, my)) return;
      const hit = this._pick(mx, my);
      if (!hit) { if (this.traceMode) this._addPoint(mx, my); return; }
      this.dragPoint = hit;
      c.setPointerCapture(ev.pointerId);
    });
    c.addEventListener("pointermove", (ev) => {
      const r = c.getBoundingClientRect();
      const mx = ev.clientX - r.left;
      if (this.dragPoint) {
        const side = mx >= this.CX ? 1 : -1;
        this.dragPoint.y = Math.max(15, Math.min(this.yMax, side * (mx - this.CX) * this.mmPerPxY));
        this.draw(); this.onLive?.();
        return;
      }
      c.style.cursor = this._pick(mx, ev.clientY - r.top) ? "grab" : (this.traceMode ? "crosshair" : "default");
    });
    addEventListener("pointerup", () => {
      const wasDragging = this.dragPoint !== null;
      this.dragPoint = null; this.draw();
      if (wasDragging) this.onDragEnd?.();
    });
    if (this.traceMode) {
      c.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        const r = c.getBoundingClientRect();
        this._deleteNear(ev.clientX - r.left, ev.clientY - r.top);
      });
    }
  }
}

// ---------------------------------------------------------------- b(v): front (right) / back (left)
class DualCurvePane {
  constructor({ canvas, seedFront, seedBack, defaultTable, backdrop, onLive, onDragEnd, calib, traceMode = false }) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.front = seedFront.map(([v, y]) => ({ v, y }));
    this.back = seedBack.map(([v, y]) => ({ v, y }));
    this.defaultTable = defaultTable;
    Object.assign(this, axes(canvas));
    const allY = [...this.front.map(p => p.y), ...this.back.map(p => p.y), ...defaultTable.y];
    this.yMax = Math.max(...allY) * 1.15;
    this.mmPerPxY = this.yMax / (this.CX - PAD);
    this.dragPoint = null; this.dragSide = null;
    this.onLive = onLive;
    this.onDragEnd = onDragEnd;
    this.calib = calib;
    this.calibClickHandler = null;
    this.traceMode = traceMode;
    this.activeLayer = "silhouette";
    this.markLayers = { neckline: [], hemline: [], waist: [], armhole: [] };
    this.backdrop = backdrop;
    this._wire();
  }
  xOf(val, side) { return this.CX + side * val / this.mmPerPxY; }
  fitFront() {
    const s = [...this.front].sort((a, b) => a.v - b.v);
    return pchipFit(s.map(p => p.v), s.map(p => p.y));
  }
  fitBack() {
    const s = [...this.back].sort((a, b) => a.v - b.v);
    return pchipFit(s.map(p => p.v), s.map(p => p.y));
  }
  draw() {
    const ctx = this.ctx, c = this.canvas;
    ctx.clearRect(0, 0, c.width, c.height);
    if (this.calib) drawBackdrop(ctx, c, this.backdrop, this.calib, this.yOf, this.xOf.bind(this));
    drawLandmarks(ctx, c, this.yOf);
    ctx.strokeStyle = "#2a2f2f"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(this.CX, PAD); ctx.lineTo(this.CX, c.height - PAD); ctx.stroke();
    const defFit = defFitOf(this.defaultTable);
    this._drawCurve(defFit, 1, "#4a5252", true);
    this._drawCurve(defFit, -1, "#4a5252", true);
    if (this.front.length >= 2) this._drawCurve(this.fitFront(), 1, "#2fa3a3", false);
    if (this.back.length >= 2) this._drawCurve(this.fitBack(), -1, "#d98a35", false);
    for (const [pts, side, color] of [[this.front, 1, "#2fa3a3"], [this.back, -1, "#d98a35"]]) {
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(this.xOf(p.y, side), this.yOf(p.v), this.dragPoint === p ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = this.dragPoint === p ? "#e9ecec" : color;
        ctx.fill();
      }
    }
    if (this.traceMode) {
      for (const key of MARK_LAYER_NAMES) {
        const color = MARK_LAYER_COLORS[key];
        for (const p of this.markLayers[key]) {
          ctx.beginPath();
          ctx.arc(this.xOf(p.y, p.side), this.yOf(p.v), this.dragPoint === p ? 5 : 3, 0, Math.PI * 2);
          ctx.fillStyle = color; ctx.fill();
        }
      }
    }
  }
  _drawCurve(fit, side, color, dashed) {
    const ctx = this.ctx, c = this.canvas;
    ctx.strokeStyle = color; ctx.lineWidth = 1.3;
    ctx.setLineDash(dashed ? [4, 3] : []);
    ctx.beginPath();
    for (let y = PAD; y <= c.height - PAD; y++) {
      const x = this.xOf(fit(this.vOf(y)), side);
      if (y === PAD) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  _pick(mx, my) {
    let best = null, bestSide = null, bestD2 = 8 * 8;
    const groups = [[this.front, 1], [this.back, -1]];
    if (this.traceMode) for (const key of MARK_LAYER_NAMES) groups.push([this.markLayers[key], null]);
    for (const [pts, fixedSide] of groups) {
      for (const p of pts) {
        const side = fixedSide != null ? fixedSide : p.side;
        const dx = mx - this.xOf(p.y, side), dy = my - this.yOf(p.v);
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; best = p; bestSide = side; }
      }
    }
    return best ? { p: best, side: bestSide } : null;
  }
  _addPoint(mx, my) {
    const v = Math.max(V_LO, Math.min(V_HI, this.vOf(my)));
    const side = mx >= this.CX ? 1 : -1;
    const y = Math.max(15, Math.min(this.yMax, Math.abs(mx - this.CX) * this.mmPerPxY));
    if (this.activeLayer === "silhouette") {
      (side === 1 ? this.front : this.back).push({ v, y });
    } else {
      this.markLayers[this.activeLayer].push({ v, y, side });
    }
    this.draw(); this.onLive?.(); this.onDragEnd?.(side);
  }
  _deleteNear(mx, my) {
    const hit = this._pick(mx, my);
    if (!hit) return;
    const { p } = hit;
    if (this.front.includes(p)) {
      if (this.front.length <= 2) return;
      this.front = this.front.filter(q => q !== p);
    } else if (this.back.includes(p)) {
      if (this.back.length <= 2) return;
      this.back = this.back.filter(q => q !== p);
    } else {
      for (const key of MARK_LAYER_NAMES) {
        if (this.markLayers[key].includes(p)) { this.markLayers[key] = this.markLayers[key].filter(q => q !== p); break; }
      }
    }
    this.draw(); this.onLive?.(); this.onDragEnd?.();
  }
  _wire() {
    const c = this.canvas;
    c.addEventListener("pointerdown", (ev) => {
      const r = c.getBoundingClientRect();
      const mx = ev.clientX - r.left, my = ev.clientY - r.top;
      if (this.calibClickHandler && this.calibClickHandler(mx, my)) return;
      const hit = this._pick(mx, my);
      if (!hit) { if (this.traceMode) this._addPoint(mx, my); return; }
      this.dragPoint = hit.p; this.dragSide = hit.side;
      c.setPointerCapture(ev.pointerId);
    });
    c.addEventListener("pointermove", (ev) => {
      const r = c.getBoundingClientRect();
      const mx = ev.clientX - r.left;
      if (this.dragPoint) {
        this.dragPoint.y = Math.max(15, Math.min(this.yMax,
          this.dragSide * (mx - this.CX) * this.mmPerPxY));
        this.draw(); this.onLive?.();
        return;
      }
      c.style.cursor = this._pick(mx, ev.clientY - r.top) ? "grab" : (this.traceMode ? "crosshair" : "default");
    });
    addEventListener("pointerup", () => {
      const wasDragging = this.dragPoint !== null, side = this.dragSide;
      this.dragPoint = null; this.dragSide = null; this.draw();
      if (wasDragging) this.onDragEnd?.(side);
    });
    if (this.traceMode) {
      c.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        const r = c.getBoundingClientRect();
        this._deleteNear(ev.clientX - r.left, ev.clientY - r.top);
      });
    }
  }
}

// ---------------------------------------------------------------- Stage 1: reference-only pane
class ReferencePane {
  constructor({ canvas, calib, backdrop }) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    Object.assign(this, axes(canvas));
    this.yMax = 340; this.mmPerPxY = this.yMax / (this.CX - PAD);
    this.calib = calib;
    this.calibClickHandler = null;
    this.backdrop = backdrop;
    this._wire();
  }
  xOf(val, side) { return this.CX + side * val / this.mmPerPxY; }
  draw() {
    const ctx = this.ctx, c = this.canvas;
    ctx.clearRect(0, 0, c.width, c.height);
    if (this.backdrop.complete && this.backdrop.naturalWidth) {
      drawBackdrop(ctx, c, this.backdrop, this.calib, this.yOf, this.xOf.bind(this));
      drawLandmarks(ctx, c, this.yOf);
    } else {
      ctx.fillStyle = "#4a5252"; ctx.font = "11px monospace";
      ctx.fillText("no photo loaded", PAD, c.height / 2);
    }
  }
  _wire() {
    const c = this.canvas;
    c.addEventListener("pointerdown", (ev) => {
      const r = c.getBoundingClientRect();
      const mx = ev.clientX - r.left, my = ev.clientY - r.top;
      this.calibClickHandler?.(mx, my);
    });
  }
}

// Generator-seed fallback: adaptively-reduced points against the TRUE
// dense generated curve. Used only when neither a library shell nor the
// committed shape.yaml is available.
const groundTruthA = defFitOf({ z: state.seed_a_dense.z, y: state.seed_a_dense.a });
const groundTruthB = defFitOf({ z: state.seed_b_dense.z, y: state.seed_b_dense.b });
let cacheA = buildDensityCacheFromFit(groundTruthA);
let cacheBf = buildDensityCacheFromFit(groundTruthB);
let cacheBb = buildDensityCacheFromFit(groundTruthB);
const initACount = firstCountMeetingResidual(cacheA, DEFAULT_TARGET_RESIDUAL_MM);
const initBfCount = firstCountMeetingResidual(cacheBf, DEFAULT_TARGET_RESIDUAL_MM);
const initBbCount = firstCountMeetingResidual(cacheBb, DEFAULT_TARGET_RESIDUAL_MM);
const initA = applyDensityTo(cacheA, initACount);
const initBf = applyDensityTo(cacheBf, initBfCount);
const initBb = applyDensityTo(cacheBb, initBbCount);
const seedAPoints = initA.points.map(p => [p.v, p.y]);
const seedBfPoints = initBf.points.map(p => [p.v, p.y]);
const seedBbPoints = initBb.points.map(p => [p.v, p.y]);
const bakedSeedCount = state.seed_a_points.length;

// ---------------------------------------------------------------- cold-load resolution
// Priority: the last-open shell in THIS BROWSER'S library > the committed
// tools/dress-shell/shape.yaml > the generator seed. A one-time migration
// lifts the old (pre-library) single-slot localStorage save into the
// library's first entry, so nobody's prior work vanishes.
const CURRENT_SHELL_POINTER_KEY = "dress-shell:shape-editor:current-shell-id:v2";
const OLD_SAVED_SHELL_KEY = "dress-shell:shape-editor:saved-shell:v1";

async function migrateOldSingleSavedShell() {
  try {
    const raw = localStorage.getItem(OLD_SAVED_SHELL_KEY);
    if (!raw) return;
    const old = JSON.parse(raw);
    localStorage.removeItem(OLD_SAVED_SHELL_KEY);
    if (!Array.isArray(old.aPoints)) return;
    const existing = await db.listShells();
    if (existing.length) return;   // library already has content — don't clobber
    const now = new Date().toISOString();
    const shell = {
      id: db.genId(), name: old.label || "Migrated shell", createdAt: now, updatedAt: now,
      aPoints: old.aPoints, bFrontPoints: old.bFrontPoints, bBackPoints: old.bBackPoints,
      neckline: old.neckline, backdropCalibration: old.backdropCalibration || null, thumbnail: null,
    };
    await db.putShell(shell);
    localStorage.setItem(CURRENT_SHELL_POINTER_KEY, shell.id);
  } catch (e) {
    console.warn("could not migrate the old single saved shell:", e);
  }
}

async function resolveInitialShapePoints() {
  await migrateOldSingleSavedShell();
  const pointerId = localStorage.getItem(CURRENT_SHELL_POINTER_KEY);
  if (pointerId) {
    try {
      const shell = await db.getShell(pointerId);
      if (shell) {
        return { source: "library", shell, aPoints: shell.aPoints, bFrontPoints: shell.bFrontPoints,
                  bBackPoints: shell.bBackPoints, neckline: shell.neckline, generator: null,
                  backdropCalibration: shell.backdropCalibration };
      }
    } catch (e) { console.warn("could not load the pointed-to library shell:", e); }
  }
  try {
    const resp = await fetch("./tools/dress-shell/shape.yaml");
    if (resp.ok) {
      const text = await resp.text();
      const parsed = shapeYamlToInitialCurves(parseShapeYaml(text));
      return { source: "shape.yaml", aPoints: parsed.aPoints, bFrontPoints: parsed.bFrontPoints,
                bBackPoints: parsed.bBackPoints, neckline: parsed.neckline, generator: parsed.generator,
                backdropCalibration: parsed.backdropCalibration };
    }
  } catch (e) {
    console.warn("shape.yaml fetch/parse failed, falling back to generator seed:", e);
  }
  return { source: "seed", aPoints: seedAPoints, bFrontPoints: seedBfPoints, bBackPoints: seedBbPoints,
            neckline: null, generator: null, backdropCalibration: null };
}
const initialShape = await resolveInitialShapePoints();
let shapeSource = initialShape.source;
let currentShell = initialShape.source === "library"
  ? { id: initialShape.shell.id, name: initialShape.shell.name, dirty: false }
  : null;

// Per-curve "named feature currently lost" state.
const lostFeatures = { a: [], bf: [], bb: [] };
function exportBlocked() {
  return (lostFeatures.a.length || lostFeatures.bf.length || lostFeatures.bb.length) > 0
    && !$("exportOverride").checked;
}
function updateExportGuard() {
  const parts = [];
  if (lostFeatures.a.length) parts.push(`a(v): ${lostFeatures.a.join(", ")}`);
  if (lostFeatures.bf.length) parts.push(`b_front: ${lostFeatures.bf.join(", ")}`);
  if (lostFeatures.bb.length) parts.push(`b_back: ${lostFeatures.bb.join(", ")}`);
  const anyLost = parts.length > 0;
  $("exportGuard").style.display = anyLost ? "block" : "none";
  if (anyLost) {
    $("exportGuard").innerHTML = `<b class="err">⚠ named feature lost</b> at the current density — ` +
      `${parts.join(" · ")}. Saving is blocked until the density is raised (see Shape) or the override below is checked.`;
  }
  $("exportOverrideRow").style.display = anyLost ? "flex" : "none";
  if (!anyLost) $("exportOverride").checked = false;
}

// -- shared images: ONE Image per photo slot, referenced by BOTH Upload's
// reference pane and Shape's curve pane. -----------------------------------
const frontImg = new Image(); frontImg.src = "./assets/shape-editor/silhouette-front.png";
const sideImg = new Image(); sideImg.src = "./assets/shape-editor/silhouette-trace.png";
const backImg = new Image();
const topImg = new Image();

const calibFront = new BackdropCalibration();
const calibTrace = new BackdropCalibration();
const calibBack = new BackdropCalibration();
const calibTop = new BackdropCalibration();
if (initialShape.backdropCalibration) {
  calibFront.hydrateFromYaml(initialShape.backdropCalibration.front);
  calibTrace.hydrateFromYaml(initialShape.backdropCalibration.trace);
}

// -- shape-change tracking -------------------------------------------------
let shapeHandEdited = false;
function markShapeChanged() {
  shapeHandEdited = true;
  if (currentShell) currentShell.dirty = true;
  updateShellStatusPill();
}

function fitOfPoints(pts) {
  const s = [...pts].sort((a, b) => a[0] - b[0]);
  return pchipFit(s.map(p => p[0]), s.map(p => p[1]));
}

const noop = () => {};

// ---------------------------------------------------------------- Stage 2 (Shape) panes
const paneA = new CurvePane({
  canvas: $("canvasA"), seed: initialShape.aPoints,
  defaultTable: { z: state.default_a_table.z, y: state.default_a_table.a },
  backdrop: frontImg, onLive: noop, traceMode: true,
  onDragEnd: () => { cacheA = null; markShapeChanged(); }, calib: calibFront,
});
const paneB = new DualCurvePane({
  canvas: $("canvasB"), seedFront: initialShape.bFrontPoints, seedBack: initialShape.bBackPoints,
  defaultTable: { z: state.default_b_table.z, y: state.default_b_table.b },
  backdrop: sideImg, onLive: noop, traceMode: true,
  onDragEnd: (side) => { if (side === 1) cacheBf = null; else cacheBb = null; markShapeChanged(); }, calib: calibTrace,
});
paneA.onLive = paneB.onLive = () => liveUpdate();

// -- Stage 1 (Upload) reference panes -------------------------------------
const stage1FrontPane = new ReferencePane({ canvas: $("canvasFrontRef"), calib: calibFront, backdrop: frontImg });
const stage1SidePane = new ReferencePane({ canvas: $("canvasSideRef"), calib: calibTrace, backdrop: sideImg });
const stage1BackPane = new ReferencePane({ canvas: $("canvasBackRef"), calib: calibBack, backdrop: backImg });
const stage1TopPane = new ReferencePane({ canvas: $("canvasTopRef"), calib: calibTop, backdrop: topImg });

frontImg.onload = () => { stage1FrontPane.draw(); paneA.draw(); };
sideImg.onload = () => { stage1SidePane.draw(); paneB.draw(); };
backImg.onload = () => { stage1BackPane.draw(); };
topImg.onload = () => { stage1TopPane.draw(); };

function wireFileInput(inputId, img, calib) {
  $(inputId).addEventListener("change", (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    calib.reset();
    calib.uncalFitRect = null;
    calib.naturalWidth = null; calib.naturalHeight = null;
    calib.imageLabel = `uploaded: ${file.name}`;
    img.src = URL.createObjectURL(file);
    status(`loaded ${file.name}`, "ok");
    updateUploadChecklist();
  });
}
wireFileInput("fileFront", frontImg, calibFront);
wireFileInput("fileSide", sideImg, calibTrace);
wireFileInput("fileBack", backImg, calibBack);
wireFileInput("fileTop", topImg, calibTop);

// ---------------------------------------------------------------- modal (confirm + prompt)
function confirmModal(html, onConfirm) {
  $("navModalText").innerHTML = html;
  $("navModalConfirm").textContent = "continue";
  $("navModalCancel").textContent = "cancel";
  $("navModal").classList.add("open");
  $("navModalConfirm").onclick = () => { $("navModal").classList.remove("open"); onConfirm(); };
  $("navModalCancel").onclick = () => { $("navModal").classList.remove("open"); };
}
function promptModal(title, defaultValue) {
  return new Promise((resolve) => {
    $("navModalText").innerHTML = `<div style="margin-bottom:8px">${title}</div>` +
      `<input type="text" id="navModalInput" class="labelInput">`;
    $("navModal").classList.add("open");
    const input = $("navModalInput");
    input.value = defaultValue || "";
    setTimeout(() => { input.focus(); input.select(); }, 0);
    $("navModalConfirm").textContent = "OK";
    $("navModalCancel").textContent = "cancel";
    const finish = (val) => { $("navModal").classList.remove("open"); resolve(val); };
    $("navModalConfirm").onclick = () => finish(input.value.trim() || defaultValue || "");
    $("navModalCancel").onclick = () => finish(null);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") { ev.preventDefault(); finish(input.value.trim() || defaultValue || ""); }
      if (ev.key === "Escape") finish(null);
    });
  });
}

// ---------------------------------------------------------------- current-shell status + tab progress
function updateShellStatusPill() {
  let text, dotClass;
  if (!currentShell) {
    text = `working from ${shapeSource === "shape.yaml" ? "committed shape.yaml" : "the generator seed"} — not saved to the library yet`;
    dotClass = "";
  } else {
    text = `<b>${currentShell.name}</b>${currentShell.dirty ? " — unsaved edits" : " — saved"}`;
    dotClass = currentShell.dirty ? "dirty" : "clean";
  }
  for (const id of ["shellStatusDot", "shellStatusDot2", "shellStatusDot3"]) {
    const el = $(id); if (el) el.className = `dot ${dotClass}`;
  }
  for (const id of ["shellStatusText", "shellStatusText2", "shellStatusText3"]) {
    const el = $(id); if (el) el.innerHTML = text;
  }
  updateTabProgress();
}
function updateTabProgress() {
  const uploadDone = calibFront.calibrated && calibTrace.calibrated && calibTop.calibrated;
  $("dotUpload")?.classList.toggle("done", uploadDone);
  $("dotShape")?.classList.toggle("done", !!currentShell || shapeHandEdited);
  $("dotShells")?.classList.toggle("done", !!currentShell);
  if (currentShell) {
    db.listLayoutsForShell(currentShell.id).then((layouts) => {
      $("dotPanels")?.classList.toggle("done", layouts.length > 0);
    }).catch(() => {});
  } else {
    $("dotPanels")?.classList.toggle("done", false);
  }
}

// ---------------------------------------------------------------- open a shell into the editor
function openShellIntoEditor(shell, sourceLabel) {
  paneA.points = shell.aPoints.map(([v, y]) => ({ v, y }));
  paneB.front = shell.bFrontPoints.map(([v, y]) => ({ v, y }));
  paneB.back = shell.bBackPoints.map(([v, y]) => ({ v, y }));
  cacheA = cacheBf = cacheBb = null;
  lostFeatures.a = lostFeatures.bf = lostFeatures.bb = [];
  calibFront.hydrateFromYaml(shell.backdropCalibration?.front);
  calibTrace.hydrateFromYaml(shell.backdropCalibration?.trace);
  applyNeckline(shell.neckline);
  shapeSource = sourceLabel;
  updateExportGuard();
  paneA.draw(); paneB.draw();
  liveUpdate();
}

$("resetToSeedBtn").onclick = () => {
  paneA.points = seedAPoints.map(([v, y]) => ({ v, y }));
  paneB.front = seedBfPoints.map(([v, y]) => ({ v, y }));
  paneB.back = seedBbPoints.map(([v, y]) => ({ v, y }));
  cacheA = cacheBf = cacheBb = null;
  lostFeatures.a = lostFeatures.bf = lostFeatures.bb = [];
  shapeSource = "seed";
  currentShell = null;
  localStorage.removeItem(CURRENT_SHELL_POINTER_KEY);
  applyNeckline(state.neckline);
  shapeHandEdited = false;
  paneA.draw(); paneB.draw(); updateExportGuard(); liveUpdate();
  updateShellStatusPill();
  status("reset to generator seed", "warn");
};

// Derived circumference reflects whatever the curve control points
// currently are — flagged loudly when the backdrop's own calibration is
// measurably off Python's fit on the same photo.
function updateCircCaveat() {
  const flags = [];
  for (const [label, calib, refKey] of [["a(v)/front", calibFront, "front"], ["b(v)/trace", calibTrace, "trace"]]) {
    const ref = state.backdrop_calibration_reference?.[refKey];
    if (calib.calibrated && ref) {
      const pct = 100 * (calib.mmPerPxV - ref.mm_per_px) / ref.mm_per_px;
      if (Math.abs(pct) > 5) flags.push(`${label} ${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`);
    }
  }
  const el = $("circCalibCaveat");
  if (!el) return;
  el.innerHTML = flags.length
    ? `<span class="warn">⚠ backdrop calibration is off from Python's own fit on the same photo ` +
      `(${flags.join(", ")}) — recalibrate the flagged backdrop(s) on Upload before trusting this table.</span>`
    : "Reflects whatever the curve control points currently are — calibrate the backdrops on Upload first.";
}

// -- calibration UI wiring (Stage 1) -------------------------------------
function setupCalibration(pane, refKey, suffix, hasHRef) {
  const calib = pane.calib;
  const statusEl = $(`calibStatus${suffix}`);
  const calibBtn = $(`calibBtn${suffix}`);
  const calibClearBtn = $(`calibClear${suffix}`);
  const hrefBtn = hasHRef ? $(`hrefBtn${suffix}`) : null;
  const hrefClearBtn = hasHRef ? $(`hrefClear${suffix}`) : null;
  const hrefMmInput = hasHRef ? $(`hrefMm${suffix}`) : null;
  const ref = state.backdrop_calibration_reference?.[refKey];

  let step = null;
  let pendingWaist = null, pendingHrefLeft = null;

  function setStatus(cls, html) {
    statusEl.className = `calibStatus ${cls}`;
    statusEl.innerHTML = html;
  }
  function refresh() {
    if (step === "waist") { setStatus("pending", "click the WAIST line (v = 0) on the image"); updateUploadChecklist(); return; }
    if (step === "hem") { setStatus("pending", `click the HEM line (v = ${V_LO.toFixed(0)} mm) on the image`); updateUploadChecklist(); return; }
    if (step === "hrefLeft") { setStatus("pending", "click the LEFT bust point on the image"); updateUploadChecklist(); return; }
    if (step === "hrefRight") { setStatus("pending", "click the RIGHT bust point on the image"); updateUploadChecklist(); return; }
    if (!calib.calibrated) {
      setStatus("uncal", "uncalibrated — backdrop is a visual reference only, not a measurement");
      updateCircCaveat(); updateUploadChecklist();
      return;
    }
    let hrefLine;
    if (calib.hRef) {
      const hvDelta = 100 * (calib.mmPerPxH - calib.mmPerPxV) / calib.mmPerPxV;
      const verdict = Math.abs(hvDelta) < 3
        ? '<span class="ok">within noise</span>'
        : '<span class="warn">large divergence — the image may be stretched/cropped non-uniformly</span>';
      hrefLine = ` · horizontal: independent ref (${calib.hRef.mm.toFixed(1)}mm) → ` +
        `<b>${calib.mmPerPxH.toFixed(3)}</b> mm/px · vs vertical: ` +
        `<b>${hvDelta > 0 ? "+" : ""}${hvDelta.toFixed(1)}%</b> — ${verdict}`;
    } else {
      hrefLine = " · horizontal: = vertical (aspect assumed intact)";
    }
    let refLine = "", deltaFlag = "";
    if (ref) {
      refLine = ` · Python's own auto-fit: <b>${ref.mm_per_px.toFixed(3)}</b> mm/px`;
      const pctOff = 100 * (calib.mmPerPxV - ref.mm_per_px) / ref.mm_per_px;
      if (Math.abs(pctOff) > 5) {
        deltaFlag = ` <span class="warn">⚠ ${pctOff > 0 ? "+" : ""}${pctOff.toFixed(0)}% off Python's own fit</span>`;
      }
    }
    const fmtPx = (p) => `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`;
    const dy = Math.abs(calib.hemPx.y - calib.waistPx.y);
    let diag = `<div class="calibDiag">your clicks — waist ${fmtPx(calib.waistPx)} px, ` +
      `hem ${fmtPx(calib.hemPx)} px → Δy = <b>${dy.toFixed(1)}</b> px`;
    if (ref) {
      const refDy = Math.abs(ref.hem_row_px - ref.waist_row_px);
      diag += `<br>Python's reference — Δy = <b>${refDy.toFixed(1)}</b> px`;
    }
    diag += "</div>";

    setStatus("cal", `calibrated — vertical <b>${calib.mmPerPxV.toFixed(3)}</b> mm/px, ` +
      `implied FULL-FRAME height <b>${calib.impliedHeightMm().toFixed(0)}</b> mm${hrefLine}${refLine}${deltaFlag}${diag}`);
    updateCircCaveat(); updateUploadChecklist();
  }
  refresh();

  pane.calibClickHandler = (mx, my) => {
    if (!step) return false;
    const imgPx = calib.canvasToImgPx(mx, my);
    if (step === "waist") { pendingWaist = imgPx; step = "hem"; refresh(); return true; }
    if (step === "hem") {
      const ok = calib.setVertical(pendingWaist, imgPx);
      step = null; pendingWaist = null;
      if (!ok) {
        setStatus("uncal", "calibration failed — the hem click must be BELOW the waist click — try again");
      } else {
        calibBtn.textContent = "recalibrate waist/hem";
        calibClearBtn.style.display = "inline-block";
        refresh();
      }
      pane.draw();
      return true;
    }
    if (step === "hrefLeft") { pendingHrefLeft = imgPx; step = "hrefRight"; refresh(); return true; }
    if (step === "hrefRight") {
      const mm = parseFloat(hrefMmInput.value) || BREAST_TIP_DEFAULT_MM;
      const ok = calib.setHorizontalRef(pendingHrefLeft, imgPx, mm);
      step = null; pendingHrefLeft = null;
      if (!ok) {
        setStatus("cal", "horizontal reference failed — the two clicks must be apart and the distance positive — try again");
      } else {
        hrefBtn.textContent = "redo horizontal reference";
        hrefClearBtn.style.display = "inline-block";
        refresh();
      }
      pane.draw();
      return true;
    }
    return false;
  };

  calibBtn.onclick = () => { step = "waist"; refresh(); };
  calibClearBtn.onclick = () => {
    calib.reset(); step = null;
    calibBtn.textContent = "calibrate waist/hem";
    calibClearBtn.style.display = "none";
    if (hasHRef) {
      hrefBtn.textContent = "add horizontal reference (breast tip distance)";
      hrefClearBtn.style.display = "none";
    }
    refresh(); pane.draw();
  };
  if (hasHRef) {
    hrefBtn.onclick = () => {
      if (!calib.calibrated) { setStatus("pending", "calibrate waist/hem first"); return; }
      step = "hrefLeft"; refresh();
    };
    hrefClearBtn.onclick = () => {
      calib.clearHorizontalRef();
      hrefBtn.textContent = "add horizontal reference (breast tip distance)";
      hrefClearBtn.style.display = "none";
      refresh(); pane.draw();
    };
  }
  if (calib.calibrated) {
    calibBtn.textContent = "recalibrate waist/hem";
    calibClearBtn.style.display = "inline-block";
    if (hasHRef && calib.hRef) { hrefBtn.textContent = "redo horizontal reference"; hrefClearBtn.style.display = "inline-block"; }
    refresh();
  }
}
setupCalibration(stage1FrontPane, "front", "Front", true);
setupCalibration(stage1SidePane, "trace", "Side", false);
setupCalibration(stage1BackPane, null, "Back", false);
setupCalibration(stage1TopPane, null, "Top", false);

function updateUploadChecklist() {
  const rows = [
    ["front", calibFront, true], ["side", calibTrace, true],
    ["top-down", calibTop, true], ["back", calibBack, false],
  ];
  let html = "";
  let requiredDone = 0, requiredTotal = 0;
  for (const [label, calib, required] of rows) {
    const done = calib.calibrated;
    if (required) { requiredTotal++; if (done) requiredDone++; }
    html += `<div class="${done ? "done" : "todo"}">${done ? "✓" : "○"} ${label}${required ? "" : " (optional)"}` +
      `${done ? "" : " — not calibrated"}</div>`;
  }
  const doneAll = requiredDone === requiredTotal;
  html = `<div class="${doneAll ? "done" : "todo"}"><b>${doneAll ? "Upload complete" : `${requiredDone}/${requiredTotal} required images calibrated`}</b></div>` + html;
  $("uploadChecklist").innerHTML = html;
  updateTabProgress();
}
updateUploadChecklist();

{
  const refF = state.backdrop_calibration_reference?.front;
  const refT = state.backdrop_calibration_reference?.trace;
  if (refF && refT) {
    const aspect = (wh) => wh[0] / wh[1];
    const aF = aspect(refF.original_size_px), aT = aspect(refT.original_size_px);
    const match = Math.abs(aF - aT) / aF < 0.01;
    $("imageDimsReadout").innerHTML =
      `backdrop files — front: <b>${refF.original_size_px[0]}×${refF.original_size_px[1]}</b> px ` +
      `original → resized ${refF.resized_size_px[0]}×${refF.resized_size_px[1]} px · ` +
      `trace: <b>${refT.original_size_px[0]}×${refT.original_size_px[1]}</b> px original ` +
      `→ resized ${refT.resized_size_px[0]}×${refT.resized_size_px[1]} px · ` +
      (match ? '<span class="ok">same aspect ratio</span>'
        : `<span class="warn">⚠ aspect ratios differ by ${(100 * Math.abs(aF - aT) / aF).toFixed(1)}%</span>`);
  }
}

// -- feature-line layer selector + tape measurements (Stage 2) -----------
for (const btn of document.querySelectorAll(".layerRow button[data-layer]")) {
  btn.addEventListener("click", () => {
    for (const b of document.querySelectorAll(".layerRow button[data-layer]")) b.classList.remove("active");
    btn.classList.add("active");
    paneA.activeLayer = paneB.activeLayer = btn.dataset.layer;
  });
}
const TRACE_TAPE_ANCHORS = [
  ["waist", 0.0, "tapeWaist"], ["underbust", 152.4, "tapeUnderbust"],
  ["bust", 203.2, "tapeBust"], ["above-bust", 254.0, "tapeAboveBust"],
];
function updateTraceTape() {
  if (paneA.points.length < 2 || paneB.front.length < 2 || paneB.back.length < 2) {
    $("traceTapeTable").innerHTML = "<tr><td colspan=4>need at least 2 silhouette points on a(v) and each side of b(v)</td></tr>";
    return;
  }
  const aFit = paneA.fit(), bfFit = paneB.fitFront(), bbFit = paneB.fitBack();
  let html = "<tr><th>anchor</th><th>derived</th><th>tape</th><th>Δ</th></tr>";
  for (const [label, v, inputId] of TRACE_TAPE_ANCHORS) {
    const vv = Math.max(V_LO, Math.min(V_HI, v));
    const derived = compoundPerimeter(aFit(vv), bfFit(vv), bbFit(vv));
    const tape = parseFloat($(inputId).value) || 0;
    const delta = derived - tape;
    const cls = Math.abs(delta) > 15 ? "warn" : "";
    html += `<tr><td>${label}</td><td>${derived.toFixed(1)}</td><td>${tape.toFixed(1)}</td>` +
      `<td class="${cls}">${delta.toFixed(1)}</td></tr>`;
  }
  $("traceTapeTable").innerHTML = html;
}
for (const [, , inputId] of TRACE_TAPE_ANCHORS) $(inputId).addEventListener("input", updateTraceTape);

// ---------------------------------------------------------------- 3D pane
const view = $("view");
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(view.clientWidth, view.clientHeight);
view.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0e0e);
const camera = new THREE.PerspectiveCamera(40, view.clientWidth / view.clientHeight, 1, 8000);
camera.position.set(650, 900, 350);
camera.up.set(0, 0, 1);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, (V_LO + V_HI) / 2);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xdfe8e8, 0x30383a, 1.1));
const dir = new THREE.DirectionalLight(0xffffff, 1.4);
dir.position.set(700, 900, 900);
scene.add(dir);
addEventListener("resize", () => {
  camera.aspect = view.clientWidth / view.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(view.clientWidth, view.clientHeight);
});

let shellMeshes = [];
function setMeshes(payload, color) {
  for (const m of shellMeshes) { scene.remove(m); m.geometry.dispose(); }
  shellMeshes = [];
  for (const name of ["FRONT", "BACK"]) {
    const src = payload[name];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(src.positions, 3));
    g.setIndex(new THREE.BufferAttribute(src.indices, 1));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
      color, roughness: 0.85, metalness: 0.0, side: THREE.DoubleSide }));
    scene.add(mesh);
    shellMeshes.push(mesh);
  }
}
function captureThumbnail() {
  try {
    const tc = document.createElement("canvas");
    tc.width = 160; tc.height = 120;
    const tctx = tc.getContext("2d");
    tctx.fillStyle = "#0c0e0e"; tctx.fillRect(0, 0, 160, 120);
    tctx.drawImage(renderer.domElement, 0, 0, 160, 120);
    return tc.toDataURL("image/jpeg", 0.72);
  } catch (e) {
    console.warn("thumbnail capture failed:", e);
    return null;
  }
}

// ---------------------------------------------------------------- readouts
function fmtMono(r, label) {
  const ok = r.non_increasing_waist_to_neckline;
  return `<b>${label}</b> — a(v) monotone waist→neckline: ` +
    (ok ? '<span class="ok">yes</span>'
        : `<span class="warn">no</span> — worst +${r.worst_positive_slope_mm_per_mm.toFixed(3)} mm/mm ` +
          `at v≈${r.worst_at_v.toFixed(0)}`);
}
function fmtCircTable(rows, label) {
  let html = `<tr><th colspan="5">${label}</th></tr>` +
    `<tr><th>anchor</th><th>derived</th><th>tape</th><th>Δ</th><th></th></tr>`;
  for (const r of rows) {
    const cls = Math.abs(r.delta_mm) > 15 ? "warn" : "";
    html += `<tr><td>${r.label}</td><td>${r.derived_mm.toFixed(1)}</td>` +
      `<td>${r.tape_mm.toFixed(1)}</td><td class="${cls}">${r.delta_mm.toFixed(1)}</td>` +
      `<td>${r.in_range ? "" : '<span class="warn">extrap</span>'}</td></tr>`;
  }
  return html;
}
function fmtShell(s, label, stale) {
  const df = s.class_distribution_front, db_ = s.class_distribution_back;
  const dstr = (d) => Object.entries(d).map(([k, v]) => `${k === "null" ? "none" : k}×${v}`).join(" ");
  let hemNote = "";
  if (s.hem_band_min_radius_mm != null) {
    hemNote = `<br><span class="warn">hem band min radius ` +
      `${s.hem_band_min_radius_mm.toFixed(1)} mm at θ ${s.hem_band_min_radius_at[0].toFixed(0)}° ` +
      `s ${s.hem_band_min_radius_at[1].toFixed(0)} mm — ${s.hem_singular
        ? "known superellipse singularity, not a defect" : "dome_n ≥ 2, not the singular regime"}</span>`;
  }
  const staleTag = stale
    ? `<br><span class="err">⚠ STALE — pre-edit snapshot; the curves have moved since.</span>` : "";
  return `<b>${label}</b><br>min meridional radius (outside the hem band) <b>${s.min_radius_mm?.toFixed(1) ?? "?"} mm</b>` +
    (s.min_radius_at ? ` at θ ${s.min_radius_at[0].toFixed(0)}° s ${s.min_radius_at[1].toFixed(0)} mm` : "") +
    hemNote +
    `<br>max-class front: ${dstr(df)}<br>max-class back: ${dstr(db_)}` +
    `<br>p213 area <b>${(s.p213_area_mm2 / 100).toFixed(0)} cm²</b>` +
    `<br>usable area <b>${(s.usable_area_mm2 / 100).toFixed(0)} cm²</b> / ` +
    `${(s.total_shell_area_mm2 / 100).toFixed(0)} cm² total` + staleTag;
}

$("monoReadout").innerHTML = fmtMono(monotonicityReport(paneA.fit(), V_HI), "LIVE");
$("circTable").innerHTML = fmtCircTable(
  coarseCircumferenceReport(paneA.fit(), paneB.fitFront(), paneB.fitBack(), V_LO, V_HI), "LIVE");
$("shellReadout").innerHTML = fmtShell(state.initial_shell_analysis, "SNAPSHOT (baked at export)", false);
$("baselineReadout").innerHTML = fmtShell(state.baseline_shell_analysis, "committed baseline (bust=apex, unchanged)", false);
$("armholeReadout").textContent = `${SPLIT.toFixed(2)}° (frozen from the snapshot — armhole re-solve needs Python)`;
$("modeTag").innerHTML = `<b class="ok">LIVE</b> — client-computed, cross-validated to ~1e-13mm`;

let g = initialShape.generator || state.generator;
$("genRef").innerHTML = `hem circ ${g.hem_circumference} · dome n ${g.dome_n} · ` +
  `fillet R ${g.fillet_radius} (${g.fillet_type}) · plateau θ ${g.plateau_theta_deg.toFixed(3)}° · ` +
  `plateau CF depth ${g.plateau_cf_depth_mm} mm · plateau radius ${g.plateau_radius_mm} mm`;

// ---------------------------------------------------------------- adaptive density UI
$("densityReport").innerHTML = `adaptive seed replaced the flat ${bakedSeedCount}-point baked seed: ` +
  `a(v) <b>${bakedSeedCount}→${initA.count}</b> pts · b_front <b>${bakedSeedCount}→${initBf.count}</b> pts · ` +
  `b_back <b>${bakedSeedCount}→${initBb.count}</b> pts (applies to the generator seed only).`;

$("densityA").min = String(MIN_POINTS); $("densityA").max = String(MAX_POINTS); $("densityA").value = String(paneA.points.length);
$("densityAVal").textContent = String(paneA.points.length);
$("densityAReadout").innerHTML = "move the slider to resample the CURRENT a(v) curve at a new point count.";
$("densityBf").min = String(MIN_POINTS); $("densityBf").max = String(MAX_POINTS); $("densityBf").value = String(paneB.front.length);
$("densityBfVal").textContent = String(paneB.front.length);
$("densityBfReadout").innerHTML = "move the slider to resample the CURRENT b_front curve at a new point count.";
$("densityBb").min = String(MIN_POINTS); $("densityBb").max = String(MAX_POINTS); $("densityBb").value = String(paneB.back.length);
$("densityBbVal").textContent = String(paneB.back.length);
$("densityBbReadout").innerHTML = "move the slider to resample the CURRENT b_back curve at a new point count.";
updateExportGuard();

$("densityA").addEventListener("input", (ev) => {
  if (!cacheA) cacheA = buildDensityCache(paneA.points);
  const r = applyDensityTo(cacheA, parseInt(ev.target.value, 10));
  paneA.points = r.points;
  $("densityAVal").textContent = String(r.count);
  $("densityAReadout").innerHTML = fmtDensity(r, "a(v)", cacheA.floor);
  lostFeatures.a = r.features.filter(f => f.lost).map(f => f.name);
  updateExportGuard(); markShapeChanged();
  paneA.draw(); liveUpdate();
});
$("densityBf").addEventListener("input", (ev) => {
  if (!cacheBf) cacheBf = buildDensityCache(paneB.front);
  const r = applyDensityTo(cacheBf, parseInt(ev.target.value, 10));
  paneB.front = r.points;
  $("densityBfVal").textContent = String(r.count);
  $("densityBfReadout").innerHTML = fmtDensity(r, "b_front", cacheBf.floor);
  lostFeatures.bf = r.features.filter(f => f.lost).map(f => f.name);
  updateExportGuard(); markShapeChanged();
  paneB.draw(); liveUpdate();
});
$("densityBb").addEventListener("input", (ev) => {
  if (!cacheBb) cacheBb = buildDensityCache(paneB.back);
  const r = applyDensityTo(cacheBb, parseInt(ev.target.value, 10));
  paneB.back = r.points;
  $("densityBbVal").textContent = String(r.count);
  $("densityBbReadout").innerHTML = fmtDensity(r, "b_back", cacheBb.floor);
  lostFeatures.bb = r.features.filter(f => f.lost).map(f => f.name);
  updateExportGuard(); markShapeChanged();
  paneB.draw(); liveUpdate();
});

// ---------------------------------------------------------------- smoothing
function smoothAmountPasses() {
  return [parseFloat($("smoothAmount").value) || 0, parseInt($("smoothPasses").value, 10) || 1];
}
function featuresAfterSmooth(points, groundTruth) {
  const sorted = [...points].sort((a, b) => a.v - b.v);
  const fit = pchipFit(sorted.map(p => p.v), sorted.map(p => p.y));
  return checkNamedFeatures(fit, groundTruth, FEATURE_LOST_THRESHOLD_MM).filter(f => f.lost).map(f => f.name);
}
$("smoothA").onclick = () => {
  const [amt, passes] = smoothAmountPasses();
  paneA.points = smoothPoints(paneA.points, amt, passes);
  cacheA = null;
  lostFeatures.a = featuresAfterSmooth(paneA.points, groundTruthA);
  updateExportGuard(); markShapeChanged();
  paneA.draw(); liveUpdate();
  status("smoothed a(v)", "ok");
};
$("smoothBf").onclick = () => {
  const [amt, passes] = smoothAmountPasses();
  paneB.front = smoothPoints(paneB.front, amt, passes);
  cacheBf = null;
  lostFeatures.bf = featuresAfterSmooth(paneB.front, groundTruthB);
  updateExportGuard(); markShapeChanged();
  paneB.draw(); liveUpdate();
  status("smoothed b_front", "ok");
};
$("smoothBb").onclick = () => {
  const [amt, passes] = smoothAmountPasses();
  paneB.back = smoothPoints(paneB.back, amt, passes);
  cacheBb = null;
  lostFeatures.bb = featuresAfterSmooth(paneB.back, groundTruthB);
  updateExportGuard(); markShapeChanged();
  paneB.draw(); liveUpdate();
  status("smoothed b_back", "ok");
};

// -- neckline: mutable, since opening a different library shell can swap it
let n, necklineFn;
function applyNeckline(necklineObj) {
  n = necklineObj || state.neckline;
  necklineFn = necklineHeightFn(n);
  $("neckRef").innerHTML = `CF ${n.cf_height} · peak ${n.peak_height} · side ${n.side_height} · ` +
    `CB ${n.cb_height} · peak θ ${n.peak_theta}° · bow ${n.rise_bow} · decay ${n.decay_rate} · ` +
    `${n.cf_corner ? "corner" : "smooth apex"} · trimmed live in the 3D view, heights not yet draggable`;
}
applyNeckline(initialShape.neckline);

function liveUpdate() {
  const aFit = paneA.fit(), bfFit = paneB.fitFront(), bbFit = paneB.fitBack();
  $("monoReadout").innerHTML = fmtMono(monotonicityReport(aFit, V_HI), "LIVE");
  const circRows = coarseCircumferenceReport(aFit, bfFit, bbFit, V_LO, V_HI);
  $("circTable").innerHTML = fmtCircTable(circRows, "LIVE");
  const shell = new CompoundCoarseShell(aFit, bfFit, bbFit, V_LO, V_HI, SPLIT);
  setMeshes(shell.buildMeshes(48, 64, necklineFn), 0xc9cfcc);
  $("shellReadout").innerHTML = fmtShell(state.initial_shell_analysis, "SNAPSHOT (baked at export)", true);
  updateTraceTape();
  $("exportMonoReadout").innerHTML = fmtMono(monotonicityReport(aFit, V_HI), "LIVE");
  $("exportCircTable").innerHTML = fmtCircTable(circRows, "LIVE");
  $("exportShellReadout").innerHTML = fmtShell(state.initial_shell_analysis, "SNAPSHOT (baked at export)", true);
  status("live", "ok");
}

{
  const shell = new CompoundCoarseShell(paneA.fit(), paneB.fitFront(), paneB.fitBack(), V_LO, V_HI, SPLIT);
  setMeshes(shell.buildMeshes(48, 64, necklineFn), 0xc9cfcc);
}
$("exportMonoReadout").innerHTML = $("monoReadout").innerHTML;
$("exportCircTable").innerHTML = $("circTable").innerHTML;
$("exportShellReadout").innerHTML = $("shellReadout").innerHTML;

// ---------------------------------------------------------------- Stage 3: Shells (save + library)
function updateExportSummary() {
  const calibSummary = (label, calib) => `${label}: ${calib.calibrated
    ? `<span class="ok">calibrated</span> (${calib.imageLabel || "default asset"})`
    : '<span class="warn">not calibrated</span>'}`;
  $("exportSummary").innerHTML =
    `points: a(v) <b>${paneA.points.length}</b> · b_front <b>${paneB.front.length}</b> · b_back <b>${paneB.back.length}</b><br>` +
    `${calibSummary("front backdrop", calibFront)} · ${calibSummary("side backdrop", calibTrace)}<br>` +
    `neckline: CF ${n.cf_height} · peak ${n.peak_height} · CB ${n.cb_height}`;
}

// ---------------------------------------------------------------- export text (shape.yaml)
function yamlFloat(x) { return String(x); }
function yamlPx(px) { return `[${yamlFloat(px[0])}, ${yamlFloat(px[1])}]`; }
function dumpCalibrationYaml(lines, calibration) {
  const names = Object.keys(calibration);
  lines.push(names.length ? "backdrop_calibration:" : "backdrop_calibration: {}");
  for (const name of ["front", "trace"]) {
    const c = calibration[name];
    if (!c) continue;
    lines.push(`  ${name}:`);
    lines.push(`    calibrated: ${c.calibrated ? "true" : "false"}`);
    if (c.image != null) lines.push(`    image: ${c.image}`);
    if (c.image_natural_size != null)
      lines.push(`    image_natural_size: [${c.image_natural_size[0]}, ${c.image_natural_size[1]}]`);
    if (c.waist_px != null) lines.push(`    waist_px: ${yamlPx(c.waist_px)}`);
    if (c.hem_px != null) lines.push(`    hem_px: ${yamlPx(c.hem_px)}`);
    if (c.mm_per_px_v != null) lines.push(`    mm_per_px_v: ${yamlFloat(c.mm_per_px_v)}`);
    if (c.mm_per_px_h != null) lines.push(`    mm_per_px_h: ${yamlFloat(c.mm_per_px_h)}`);
    if (c.x_origin_px != null) lines.push(`    x_origin_px: ${yamlFloat(c.x_origin_px)}`);
    if (c.h_ref_method != null) lines.push(`    h_ref_method: ${c.h_ref_method}`);
    if (c.h_ref != null) {
      lines.push("    h_ref:");
      lines.push(`      left_px: ${yamlPx(c.h_ref.left_px)}`);
      lines.push(`      right_px: ${yamlPx(c.h_ref.right_px)}`);
      lines.push(`      mm: ${yamlFloat(c.h_ref.mm)}`);
    }
    if (c.implied_height_mm != null) lines.push(`    implied_height_mm: ${yamlFloat(c.implied_height_mm)}`);
  }
}
function currentCalibrationYaml() {
  return {
    front: calibFront.toShapeYaml(calibFront.imageLabel || "assets/shape-editor/silhouette-front.png"),
    trace: calibTrace.toShapeYaml(calibTrace.imageLabel || "assets/shape-editor/silhouette-trace.png"),
  };
}
function dumpShapeYaml() {
  const lines = [
    "# shape.yaml — dress shape editor state (milestone 3).",
    "# Auto-generated by the static shape editor; hand-edit only if you know",
    "# the format. Lossless round-trip: save(load(x)) == x.",
    "", "version: 1", "a_points:",
  ];
  for (const p of paneA.points) lines.push(`  - [${yamlFloat(p.v)}, ${yamlFloat(p.y)}]`);
  lines.push("b_front_points:");
  for (const p of paneB.front) lines.push(`  - [${yamlFloat(p.v)}, ${yamlFloat(p.y)}]`);
  lines.push("b_back_points:");
  for (const p of paneB.back) lines.push(`  - [${yamlFloat(p.v)}, ${yamlFloat(p.y)}]`);
  lines.push("neckline:");
  for (const [k, v] of Object.entries(n))
    lines.push(`  ${k}: ${typeof v === "boolean" ? v : yamlFloat(v)}`);
  lines.push("generator:");
  for (const [k, v] of Object.entries(g))
    lines.push(`  ${k}: ${typeof v === "string" ? v : yamlFloat(v)}`);
  dumpCalibrationYaml(lines, currentCalibrationYaml());
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------- impact machinery (shared)
let impactClasses = null, impactPanels = null;
async function ensureImpactData() {
  if (impactClasses && impactPanels) return;
  try {
    const [classesText, layoutText] = await Promise.all([
      fetch("./tools/dress-shell/panels.yaml").then(r => r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))),
      fetch("./tools/dress-shell/layout.yaml").then(r => r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))),
    ]);
    impactClasses = parsePanelClasses(classesText);
    impactPanels = parseLayoutPanels(layoutText);
  } catch (e) {
    console.warn("could not load panels.yaml/layout.yaml for the impact report:", e);
    impactClasses = null; impactPanels = null;
  }
}
function buildStandoffImpactHtml(oldChart, newChart, panels, contextLabel) {
  const results = computeStandoffImpact(oldChart, newChart, impactClasses, panels);
  const flagged = results.filter(r => r.error || r.regressed || !r.nowWithinTolerance);
  let body;
  if (flagged.length === 0) {
    body = '<span class="ok">no panels affected — standoff essentially unchanged.</span>';
  } else {
    let rows = "";
    for (const r of flagged) {
      if (r.error) { rows += `<tr><td>${r.id}</td><td colspan=3 class="err">${r.error}</td></tr>`; continue; }
      const tag = r.regressed ? '<span class="err">REGRESSED</span>' : '<span class="warn">still exceeds</span>';
      const delta = r.deltaMm != null ? `${r.deltaMm >= 0 ? "+" : ""}${r.deltaMm.toFixed(2)}` : "—";
      rows += `<tr><td>${r.id}</td><td>${r.oldStandoffMm.toFixed(2)}→${r.newStandoffMm.toFixed(2)} mm</td><td>Δ${delta} mm</td><td>${tag}</td></tr>`;
    }
    body = `<table><tr><th>panel</th><th>standoff</th><th>Δ</th><th></th></tr>${rows}</table>`;
  }
  return `${contextLabel}:<br><br>${body}<br><br><div class="legend" style="padding:0">worst first · tolerance 2.0 mm · ` +
    `standoff only — connector/outline legality, mirror-twin validity, and the layering DAG still need the Python ` +
    `shape_impact.py machinery, not ported here.</div><br>Continue?`;
}
async function buildShellOverwriteImpactHtml(oldChart, newChart, layouts, shellName) {
  await ensureImpactData();
  if (!impactClasses) {
    return `Saving over "${shellName}" will change the shell that ${layouts.length} layout(s) depend on. ` +
      `Could not load panels.yaml — proceeding will NOT re-check them. Continue?`;
  }
  let sections = "";
  for (const layout of layouts) {
    const results = computeStandoffImpact(oldChart, newChart, impactClasses, layout.panels);
    const flagged = results.filter(r => r.error || r.regressed || !r.nowWithinTolerance);
    sections += `<h3 style="margin:10px 0 2px;color:var(--dim)">${layout.name}</h3>`;
    if (flagged.length === 0) {
      sections += '<span class="ok">no panels affected</span>';
    } else {
      let rows = "";
      for (const r of flagged) {
        if (r.error) { rows += `<tr><td>${r.id}</td><td colspan=3 class="err">${r.error}</td></tr>`; continue; }
        const tag = r.regressed ? '<span class="err">REGRESSED</span>' : '<span class="warn">still exceeds</span>';
        const delta = r.deltaMm != null ? `${r.deltaMm >= 0 ? "+" : ""}${r.deltaMm.toFixed(2)}` : "—";
        rows += `<tr><td>${r.id}</td><td>${r.oldStandoffMm.toFixed(2)}→${r.newStandoffMm.toFixed(2)} mm</td><td>Δ${delta} mm</td><td>${tag}</td></tr>`;
      }
      sections += `<table><tr><th>panel</th><th>standoff</th><th>Δ</th><th></th></tr>${rows}</table>`;
    }
  }
  return `Saving over "${shellName}" — ${layouts.length} layout(s) depend on this shell's (θ, s):` +
    `${sections}<div class="legend" style="padding:6px 0 0">worst first · tolerance 2.0 mm.</div><br>Continue?`;
}

// ---------------------------------------------------------------- Save (creates or updates a library entry)
async function saveCurrentShell() {
  if (exportBlocked()) {
    $("exportStatus").innerHTML = '<span class="err">save blocked — a named feature is lost at the ' +
      "current density (see Shape); raise the density or check the override</span>";
    return;
  }
  if (!currentShell) {
    const defaultName = `Shell ${new Date().toLocaleString()}`;
    const name = await promptModal("Name this shell", defaultName);
    if (name == null) return;
    const now = new Date().toISOString();
    const shell = {
      id: db.genId(), name, createdAt: now, updatedAt: now,
      aPoints: paneA.points.map(p => [p.v, p.y]),
      bFrontPoints: paneB.front.map(p => [p.v, p.y]),
      bBackPoints: paneB.back.map(p => [p.v, p.y]),
      neckline: { ...n },
      backdropCalibration: currentCalibrationYaml(),
      thumbnail: captureThumbnail(),
    };
    await db.putShell(shell);
    currentShell = { id: shell.id, name: shell.name, dirty: false };
    localStorage.setItem(CURRENT_SHELL_POINTER_KEY, shell.id);
    shapeSource = "library";
    $("exportStatus").innerHTML = `<span class="ok">✓ saved as "${shell.name}"</span>`;
  } else if (!currentShell.dirty) {
    $("exportStatus").innerHTML = '<span class="dim">no changes to save</span>';
    return;
  } else {
    const owningLayouts = await db.listLayoutsForShell(currentShell.id);
    const doOverwrite = async () => {
      const shell = await db.getShell(currentShell.id);
      shell.aPoints = paneA.points.map(p => [p.v, p.y]);
      shell.bFrontPoints = paneB.front.map(p => [p.v, p.y]);
      shell.bBackPoints = paneB.back.map(p => [p.v, p.y]);
      shell.neckline = { ...n };
      shell.backdropCalibration = currentCalibrationYaml();
      shell.thumbnail = captureThumbnail();
      shell.updatedAt = new Date().toISOString();
      await db.putShell(shell);
      currentShell.dirty = false;
      $("exportStatus").innerHTML = `<span class="ok">✓ saved "${shell.name}"</span>` +
        (owningLayouts.length ? ` — re-checked ${owningLayouts.length} layout(s) on this shell.` : "");
      updateShellStatusPill();
      await renderShellLibrary();
      await updateStorageUsage();
    };
    if (owningLayouts.length === 0) {
      await doOverwrite();
    } else {
      const oldShell = await db.getShell(currentShell.id);
      const oldChart = buildSurfaceChart(
        fitOfPoints(oldShell.aPoints), fitOfPoints(oldShell.bFrontPoints), fitOfPoints(oldShell.bBackPoints),
        V_LO, V_HI, SPLIT, necklineHeightFn(oldShell.neckline));
      const newChart = buildSurfaceChart(paneA.fit(), paneB.fitFront(), paneB.fitBack(), V_LO, V_HI, SPLIT, necklineFn);
      const html = await buildShellOverwriteImpactHtml(oldChart, newChart, owningLayouts, oldShell.name);
      confirmModal(html, doOverwrite);
      return;
    }
  }
  updateShellStatusPill();
  await renderShellLibrary();
  await updateStorageUsage();
}
$("saveShellBtn").onclick = saveCurrentShell;
$("saveShellBtnShape").onclick = saveCurrentShell;
$("exportOverride").addEventListener("change", updateExportGuard);

// ---------------------------------------------------------------- shell library UI
async function renderShellLibrary() {
  const shells = await db.listShells();
  const el = $("shellLibraryList");
  if (!shells.length) {
    el.innerHTML = '<div class="legend">no saved shells yet — Save above to create the first one.</div>';
    return;
  }
  el.innerHTML = shells.map((s) => {
    const isCurrent = currentShell && currentShell.id === s.id;
    return `<div class="libRow ${isCurrent ? "current" : ""}">
      <img class="libThumb" src="${s.thumbnail || ""}" alt="">
      <div class="libInfo">
        <div class="libName">${s.name}${isCurrent ? ' <span class="ok">· current</span>' : ""}</div>
        <div class="libMeta">saved ${new Date(s.updatedAt).toLocaleString()}</div>
      </div>
      <div class="libActions">
        <button data-act="open" data-id="${s.id}">open</button>
        <button data-act="dup" data-id="${s.id}">duplicate</button>
        <button data-act="rename" data-id="${s.id}">rename</button>
        <button data-act="del" data-id="${s.id}">delete</button>
      </div>
    </div>`;
  }).join("");
}
async function openShellById(id) {
  const shell = await db.getShell(id);
  if (!shell) return;
  openShellIntoEditor(shell, "library");
  currentShell = { id: shell.id, name: shell.name, dirty: false };
  localStorage.setItem(CURRENT_SHELL_POINTER_KEY, shell.id);
  updateShellStatusPill();
  await renderShellLibrary();
  goToTab("shape");
}
async function duplicateShell(id) {
  const src = await db.getShell(id);
  if (!src) return;
  const name = await promptModal("Duplicate shell", `${src.name} copy`);
  if (name == null) return;
  const now = new Date().toISOString();
  const copy = { ...src, id: db.genId(), name, createdAt: now, updatedAt: now };
  await db.putShell(copy);
  openShellIntoEditor(copy, "library");
  currentShell = { id: copy.id, name: copy.name, dirty: false };
  localStorage.setItem(CURRENT_SHELL_POINTER_KEY, copy.id);
  updateShellStatusPill();
  await renderShellLibrary();
  await updateStorageUsage();
  goToTab("shape");
}
async function renameShell(id) {
  const shell = await db.getShell(id);
  if (!shell) return;
  const name = await promptModal("Rename shell", shell.name);
  if (name == null) return;
  shell.name = name; shell.updatedAt = new Date().toISOString();
  await db.putShell(shell);
  if (currentShell && currentShell.id === id) { currentShell.name = name; updateShellStatusPill(); }
  await renderShellLibrary();
}
async function deleteShellWithConfirm(id) {
  const shell = await db.getShell(id);
  if (!shell) return;
  const layouts = await db.listLayoutsForShell(id);
  const msg = `Delete shell "${shell.name}"${layouts.length ? ` and its ${layouts.length} layout(s)` : ""}? This cannot be undone.`;
  confirmModal(msg, async () => {
    await db.deleteShell(id);
    if (currentShell && currentShell.id === id) {
      currentShell = null;
      localStorage.removeItem(CURRENT_SHELL_POINTER_KEY);
      updateShellStatusPill();
    }
    await renderShellLibrary();
    await updateStorageUsage();
    await renderShellLayoutList();
  });
}
$("shellLibraryList").addEventListener("click", async (ev) => {
  const btn = ev.target.closest("button[data-act]");
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.act === "open") await openShellById(id);
  else if (btn.dataset.act === "dup") await duplicateShell(id);
  else if (btn.dataset.act === "rename") await renameShell(id);
  else if (btn.dataset.act === "del") await deleteShellWithConfirm(id);
});

async function updateStorageUsage() {
  const est = await db.estimateUsage();
  const fmtMB = (bytes) => (bytes / (1024 * 1024)).toFixed(1);
  $("storageUsage").textContent = est
    ? `library using ~${fmtMB(est.usage)} MB of ~${fmtMB(est.quota)} MB available (browser estimate, includes other site data)`
    : "storage estimate not available in this browser";
}
$("exportLibraryBtn").onclick = async () => {
  const data = await db.exportLibrary();
  const text = JSON.stringify(data, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `dress-shell-library-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  $("libraryIOStatus").innerHTML = `<span class="ok">✓ exported ${data.shells.length} shell(s), ${data.layouts.length} layout(s).</span>`;
};
$("importLibraryInput").addEventListener("change", async (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const result = await db.importLibrary(data);
    $("libraryIOStatus").innerHTML = `<span class="ok">✓ imported ${result.shells} shell(s), ${result.layouts} layout(s).</span>`;
    await renderShellLibrary();
    await updateStorageUsage();
    await renderShellLayoutList();
  } catch (e) {
    $("libraryIOStatus").innerHTML = `<span class="err">import failed: ${e.message}</span>`;
  }
  ev.target.value = "";
});

// -- quiet secondary: getting a shell into the repo. Separate concern. ----
$("exportBtn").onclick = () => {
  if (exportBlocked()) {
    $("exportStatus").innerHTML = '<span class="err">blocked — a named feature is lost at the ' +
      "current density (see Shape); raise the density or check the override</span>";
    return;
  }
  const overridden = lostFeatures.a.length || lostFeatures.bf.length || lostFeatures.bb.length;
  const text = dumpShapeYaml();
  const blob = new Blob([text], { type: "text/yaml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "shape.yaml";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  $("exportArea").value = text;
  $("exportArea").style.display = "block";
  $("exportStatus").innerHTML = (overridden
    ? '<span class="warn">downloaded shape.yaml WITH a named feature lost (override used).</span> '
    : '<span class="ok">downloaded shape.yaml.</span> ') +
    "This does not save the shell to the library — use “Save” above for that.";
};
$("copyBtn").onclick = async () => {
  if (exportBlocked()) {
    $("exportStatus").innerHTML = '<span class="err">blocked — a named feature is lost at the ' +
      "current density (see Shape); raise the density or check the override</span>";
    return;
  }
  const text = dumpShapeYaml();
  try {
    await navigator.clipboard.writeText(text);
    $("exportStatus").innerHTML = '<span class="ok">✓ copied shape.yaml to clipboard.</span> Paste it into your ' +
      "Claude Code conversation and ask it to commit as tools/dress-shell/shape.yaml. This does not save the " +
      "shell to the library — use “Save” above for that.";
  } catch {
    $("exportArea").value = text;
    $("exportArea").style.display = "block";
    $("exportStatus").innerHTML = '<span class="warn">clipboard blocked — select the text below and copy it. ' +
      "This does not save the shell to the library — use “Save” above for that.</span>";
  }
};

// ---------------------------------------------------------------- Panels tab
function summarizeLayoutYaml(text) {
  const panels = [];
  let cur = null;
  for (const line of text.split("\n")) {
    const idMatch = line.match(/^\s*-\s*id:\s*(.+)$/);
    if (idMatch) { if (cur) panels.push(cur); cur = { id: idMatch[1].trim() }; continue; }
    if (!cur) continue;
    const kv = line.match(/^\s*([a-z_]+):\s*(.+)$/);
    if (kv) cur[kv[1]] = kv[2].trim();
  }
  if (cur) panels.push(cur);
  return panels;
}
let layoutYamlText = null;
let displayPanels = [];
let committedShapeChart = null;
async function ensureCommittedShapeChart() {
  if (committedShapeChart) return committedShapeChart;
  try {
    const resp = await fetch("./tools/dress-shell/shape.yaml");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const parsed = shapeYamlToInitialCurves(parseShapeYaml(await resp.text()));
    committedShapeChart = buildSurfaceChart(
      fitOfPoints(parsed.aPoints), fitOfPoints(parsed.bFrontPoints), fitOfPoints(parsed.bBackPoints),
      V_LO, V_HI, SPLIT, necklineHeightFn(parsed.neckline || state.neckline));
  } catch (e) {
    console.warn("could not build a chart for the committed shape.yaml:", e);
    committedShapeChart = null;
  }
  return committedShapeChart;
}
(async () => {
  try {
    const resp = await fetch("./tools/dress-shell/layout.yaml");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    layoutYamlText = await resp.text();
    displayPanels = summarizeLayoutYaml(layoutYamlText);
    $("layoutStatus").innerHTML = `<span class="ok">loaded tools/dress-shell/layout.yaml</span> — ${displayPanels.length} committed panels.`;
    $("layoutArea").value = layoutYamlText;
    $("layoutPanelList").innerHTML = displayPanels.map(p =>
      `${p.id} — class ${p.class ?? "?"} · θ ${p.theta ?? "?"}° · s ${p.s ?? "?"}mm · ` +
      `layer ${p.layer ?? "?"} · mirrored ${p.mirrored ?? "?"}`).join("<br>");
  } catch (e) {
    $("layoutStatus").innerHTML = `<span class="err">could not load tools/dress-shell/layout.yaml (${e.message})</span>`;
  }
})();
$("copyLayoutBtn").onclick = async () => {
  if (!layoutYamlText) { $("layoutCopyStatus").innerHTML = '<span class="err">layout.yaml has not loaded yet</span>'; return; }
  try {
    await navigator.clipboard.writeText(layoutYamlText);
    $("layoutCopyStatus").innerHTML = '<span class="ok">✓ copied to clipboard</span> — the committed file verbatim.';
  } catch {
    $("layoutArea").style.display = "block";
    $("layoutCopyStatus").innerHTML = '<span class="warn">clipboard blocked — select the text above and copy it</span>';
  }
};
$("importCommittedLayoutBtn").onclick = async () => {
  if (!currentShell) { $("layoutCopyStatus").innerHTML = '<span class="err">open or save a shell first (Shells tab)</span>'; return; }
  await ensureImpactData();
  if (!impactClasses || !impactPanels || !impactPanels.length) {
    $("layoutCopyStatus").innerHTML = '<span class="err">could not load panels.yaml/layout.yaml</span>'; return;
  }
  const oldChart = await ensureCommittedShapeChart();
  const newChart = buildSurfaceChart(paneA.fit(), paneB.fitFront(), paneB.fitBack(), V_LO, V_HI, SPLIT, necklineFn);
  const html = oldChart
    ? buildStandoffImpactHtml(oldChart, newChart, impactPanels, `Duplicating the committed layout.yaml onto "${currentShell.name}"`)
    : `Duplicating the committed layout.yaml onto "${currentShell.name}" — could not build a chart for the ` +
      "committed shape.yaml to compare against. Continue?";
  confirmModal(html, async () => {
    const name = await promptModal("Name this layout", "from committed layout.yaml");
    if (name == null) return;
    const now = new Date().toISOString();
    await db.putLayout({ id: db.genId(), shellId: currentShell.id, name, panels: impactPanels, createdAt: now, updatedAt: now });
    await renderShellLayoutList(); updateTabProgress();
    $("layoutCopyStatus").innerHTML = `<span class="ok">✓ added layout "${name}"</span>`;
  });
};

async function renderShellLayoutList() {
  const el = $("shellLayoutList");
  if (!currentShell) {
    el.innerHTML = '<div class="legend">no shell open — open or save one on the Shells tab first.</div>';
    return;
  }
  const layouts = await db.listLayoutsForShell(currentShell.id);
  if (!layouts.length) {
    el.innerHTML = '<div class="legend">no layouts on this shell yet — duplicate the committed layout.yaml below onto it to start one.</div>';
    return;
  }
  await ensureImpactData();
  const shells = await db.listShells();
  const otherShells = shells.filter(s => s.id !== currentShell.id);
  const chart = buildSurfaceChart(paneA.fit(), paneB.fitFront(), paneB.fitBack(), V_LO, V_HI, SPLIT, necklineFn);
  el.innerHTML = layouts.map((l) => {
    let standoffHtml = "";
    if (impactClasses) {
      const results = computeStandoffs(chart, impactClasses, l.panels);
      const worst = results[0];
      if (worst) {
        const so = Number.isFinite(worst.standoffMm) ? `${worst.standoffMm.toFixed(2)} mm` : "off-shell";
        standoffHtml = ` · worst standoff <b>${so}</b> (${worst.id})`;
      }
    }
    const otherOptions = otherShells.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
    return `<div class="layoutRow">
      <div class="name">${l.name}</div>
      <div class="meta">${l.panels.length} panels · updated ${new Date(l.updatedAt).toLocaleString()}${standoffHtml}</div>
      <div class="row" style="padding:4px 0 0">
        <button class="miniBtn" data-act="viewLayout" data-id="${l.id}">view standoff table</button>
        <button class="miniBtn" data-act="dupLayout" data-id="${l.id}">duplicate here</button>
        <button class="miniBtn" data-act="renameLayout" data-id="${l.id}">rename</button>
        <button class="miniBtn" data-act="delLayout" data-id="${l.id}">delete</button>
        ${otherShells.length ? `<select class="miniSelect" data-dup-target="${l.id}"><option value="">duplicate to shell…</option>${otherOptions}</select>` : ""}
      </div>
      <div id="layoutTable-${l.id}"></div>
    </div>`;
  }).join("");
}
$("shellLayoutList").addEventListener("click", async (ev) => {
  const btn = ev.target.closest("button[data-act]");
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.act === "viewLayout") {
    const layout = await db.getLayout(id);
    await ensureImpactData();
    const chart = buildSurfaceChart(paneA.fit(), paneB.fitFront(), paneB.fitBack(), V_LO, V_HI, SPLIT, necklineFn);
    const results = impactClasses ? computeStandoffs(chart, impactClasses, layout.panels) : [];
    const rows = results.map(r => r.error
      ? `<tr><td>${r.id}</td><td colspan=2 class="err">${r.error}</td></tr>`
      : `<tr><td>${r.id}</td><td>${Number.isFinite(r.standoffMm) ? r.standoffMm.toFixed(2) + " mm" : "off-shell"}</td>` +
        `<td>${r.withinTolerance ? '<span class="ok">fits</span>' : '<span class="warn">exceeds</span>'}</td></tr>`
    ).join("");
    $(`layoutTable-${id}`).innerHTML = rows ? `<table><tr><th>panel</th><th>standoff</th><th></th></tr>${rows}</table>` : "";
  } else if (btn.dataset.act === "dupLayout") {
    const layout = await db.getLayout(id);
    const name = await promptModal("Duplicate layout (same shell)", `${layout.name} copy`);
    if (name == null) return;
    const now = new Date().toISOString();
    await db.putLayout({ ...layout, id: db.genId(), name, createdAt: now, updatedAt: now });
    await renderShellLayoutList(); updateTabProgress();
  } else if (btn.dataset.act === "renameLayout") {
    const layout = await db.getLayout(id);
    const name = await promptModal("Rename layout", layout.name);
    if (name == null) return;
    layout.name = name; layout.updatedAt = new Date().toISOString();
    await db.putLayout(layout);
    await renderShellLayoutList();
  } else if (btn.dataset.act === "delLayout") {
    const layout = await db.getLayout(id);
    confirmModal(`Delete layout "${layout.name}"? This cannot be undone.`, async () => {
      await db.deleteLayout(id);
      await renderShellLayoutList(); updateTabProgress();
    });
  }
});
$("shellLayoutList").addEventListener("change", async (ev) => {
  const sel = ev.target.closest("select[data-dup-target]");
  if (!sel || !sel.value) return;
  const layoutId = sel.dataset.dupTarget;
  const targetShellId = sel.value;
  sel.value = "";
  const layout = await db.getLayout(layoutId);
  const sourceShell = await db.getShell(layout.shellId);
  const targetShell = await db.getShell(targetShellId);
  await ensureImpactData();
  const sourceChart = buildSurfaceChart(
    fitOfPoints(sourceShell.aPoints), fitOfPoints(sourceShell.bFrontPoints), fitOfPoints(sourceShell.bBackPoints),
    V_LO, V_HI, SPLIT, necklineHeightFn(sourceShell.neckline));
  const targetChart = buildSurfaceChart(
    fitOfPoints(targetShell.aPoints), fitOfPoints(targetShell.bFrontPoints), fitOfPoints(targetShell.bBackPoints),
    V_LO, V_HI, SPLIT, necklineHeightFn(targetShell.neckline));
  const html = impactClasses
    ? buildStandoffImpactHtml(sourceChart, targetChart, layout.panels, `Duplicating "${layout.name}" from "${sourceShell.name}" onto "${targetShell.name}"`)
    : `Duplicating "${layout.name}" onto "${targetShell.name}" — could not load panels.yaml. Continue?`;
  confirmModal(html, async () => {
    const name = await promptModal("Name this layout on the target shell", `${layout.name} (on ${targetShell.name})`);
    if (name == null) return;
    const now = new Date().toISOString();
    await db.putLayout({ id: db.genId(), shellId: targetShellId, name, panels: layout.panels, createdAt: now, updatedAt: now });
    if (currentShell && currentShell.id === targetShellId) await renderShellLayoutList();
  });
});

// ---------------------------------------------------------------- tab navigation (free — no gate)
const TAB_NAMES = ["upload", "shape", "export", "place"];
let currentTab = "shape";
function setTabVisible(tab) {
  for (const t of TAB_NAMES) $(`tab-${t}`).classList.toggle("current", t === tab);
  for (const btn of document.querySelectorAll(".tabBtn")) btn.classList.toggle("current", btn.dataset.tab === tab);
}
async function goToTab(tab) {
  if (tab === currentTab) return;
  currentTab = tab;
  setTabVisible(tab);
  if (tab === "export") { updateExportSummary(); await renderShellLibrary(); await updateStorageUsage(); }
  if (tab === "place") { await renderShellLayoutList(); }
  updateShellStatusPill();
}
for (const btn of document.querySelectorAll(".tabBtn")) {
  btn.addEventListener("click", () => { goToTab(btn.dataset.tab); });
}
setTabVisible(currentTab);
updateShellStatusPill();

paneA.draw();
paneB.draw();
stage1FrontPane.draw();
stage1SidePane.draw();
stage1BackPane.draw();
stage1TopPane.draw();
updateTraceTape();
status(`ready — v ∈ [${V_LO.toFixed(0)}, ${V_HI.toFixed(0)}] mm · ` +
       `${paneA.points.length} a(v) points, ${paneB.front.length} b_front / ` +
       `${paneB.back.length} b_back points (v fixed, drag value) · fully client-side, no server`);
(function loop() {
  requestAnimationFrame(loop);
  controls.update();
  renderer.render(scene, camera);
})();
