// Shape editor — STATIC PAGE. There is no server: this file, geom.js's
// math, and a baked JSON snapshot are the whole application. See
// shape-editor-geom.js's header for why that's now trustworthy (cross-
// validated against shell.py to ~1e-13mm) and export_shape_editor_static.py
// for how the snapshot is built.
//
// LIVE vs SNAPSHOT, the one thing this page cannot blur: curve editing,
// 3D regeneration, circumference, and monotonicity are computed in this
// browser on every drag — genuinely live. The curvature/seatability sweep
// (min radius, max-seatable-class, seatable area) is NOT — it's baked at
// export time (grid.py/curvature.py need Python) and goes stale the
// instant you drag. This file never lets the two look the same: the
// snapshot block gets a "may be stale" banner the moment any point moves.
//
// Persistence: there's no backend to save shape.yaml to. "Export" builds
// the identical canonical YAML text shape_state.dump_shape() would (same
// repr()-float convention) and offers it as a download / copy — send it
// back to have it committed as tools/dress-shell/shape.yaml.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { pchipFit, CompoundCoarseShell, monotonicityReport,
        coarseCircumferenceReport, buildAdaptiveOrder, checkNamedFeatures,
        smoothPoints, necklineHeightFn } from "./shape-editor-geom.js";

// -- adaptive point density ---------------------------------------------
// "Too many control points" — the flat ~31-point seed is replaced ONCE,
// at load, by the fewest adaptively-placed points meeting a target
// between-point residual against the TRUE dense generated curve (1601
// points, baked by export_shape_editor_static.py — see seed_a_dense/
// seed_b_dense). After that one-time replacement, EVERY subsequent
// density-slider move resamples against whatever curve currently exists
// on screen (hand edits included), never against the original dense
// table again — "resample, don't redistribute," per the standing
// instruction. A slider session (mousedown to mouseup on the <input>)
// reuses one stable adaptive order so scrubbing back and forth within it
// is lossless; only a real hand edit on the canvas (or a smoothing pass)
// invalidates the cache and forces the next slider move to rebuild from
// the edited curve.
//
// A named feature going missing is a DIFFERENT CATEGORY of event than a
// fit getting slightly worse — a residual number can't stand in for it.
// Every cache also records its "floor": the smallest point count (over
// the same adaptive order) at which no named feature reads lost, so the
// UI can show where that line is instead of it being found by scrubbing
// past it. Crossing it is flagged loudly (not styled the same as the
// residual line) and blocks export until an explicit override is set.
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
  return null;   // not reached within MAX_POINTS
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
  const residualText = `between-point residual (vs the curve this was resampled from) ` +
    `max ${r.residual.max.toFixed(2)} mm, rms ${r.residual.rms.toFixed(2)} mm`;
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
function loadBackdrop(src, onload) {
  const img = new Image();
  img.onload = onload;
  img.src = src;
  return img;
}

// -- backdrop calibration -------------------------------------------------
// Uncalibrated, a backdrop's px-to-mm scale is unknown — dragging a point
// onto its silhouette edge is a visual match, not a measurement. Two
// clicked landmarks (waist v=0, hem v=V_LO=-381 — the SAME waist->hem=
// 381mm reference silhouette.py's own extract_from_image already uses to
// fit these exact images server-side, see WAIST_TO_HEM_MM there) solve
// the vertical mm/px scale directly. Horizontal defaults to the vertical
// scale (assumes the image's aspect ratio survived whatever cropping it
// went through — flagged as an ASSUMPTION, not silently trusted) and can
// be overridden by an independent reference: breast tip distance
// (175mm — the dress-shell reference body's own measured value, already
// the basis of the committed plateau bust's 87.5mm half-width), which is
// horizontal only in the FRONT view.
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
    this.uncalFitRect = null;      // stable click-capture frame, calibration-independent
    this.waistPx = null; this.hemPx = null;     // natural image px
    this.mmPerPxV = null; this.mmPerPxH = null;
    this.xOriginPx = null;
    this.hRefMethod = "aspect";    // "aspect" | "independent"
    this.hRef = null;              // { leftPx, rightPx, mm }
  }
  setNaturalSize(w, h, boxX, boxY, boxW, boxH) {
    this.naturalWidth = w; this.naturalHeight = h;
    this.uncalFitRect = containFit(w, h, boxX, boxY, boxW, boxH);
    if (this.xOriginPx == null) this.xOriginPx = w / 2;   // default until measured
  }
  canvasToImgPx(cx, cy) {
    const r = this.uncalFitRect;
    return { x: (cx - r.dx) / r.scale, y: (cy - r.dy) / r.scale };
  }
  setVertical(waistPx, hemPx) {
    const dPx = hemPx.y - waistPx.y;
    if (dPx <= 1e-6) return false;   // hem must click BELOW waist in the image
    this.waistPx = waistPx; this.hemPx = hemPx;
    this.mmPerPxV = (0.0 - V_LO) / dPx;   // waist v=0, hem v=V_LO(=-381)
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
  // natural image px -> real (v_mm, signed lateral mm from the v-axis)
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

// Uncalibrated: contain-fit (preserves the image's own aspect ratio —
// the OLD behavior stretched non-uniformly to fill a box of a different
// aspect, which distorted the traced silhouette independent of any
// calibration issue), greyed out, low alpha — unmistakably "not a
// measurement". Calibrated: re-registered through the SAME yOf/xOf the
// curve points use, so it now shares one real-world mm coordinate system
// with the curve — a dragged point onto this backdrop's edge is a
// measurement. Landmark dots mark what was actually clicked.
function drawBackdrop(ctx, canvas, img, calib, yOf, xOf) {
  if (!(img.complete && img.naturalWidth)) return;
  if (!calib.uncalFitRect) {
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

// ---------------------------------------------------------------- a(v): mirrored single curve
class CurvePane {
  constructor({ canvas, seed, defaultTable, backdropSrc, onLive, onDragEnd, calib }) {
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
    this.calibClickHandler = null;   // set by setupCalibration() below
    this.backdrop = loadBackdrop(backdropSrc, () => this.draw());
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
    drawBackdrop(ctx, c, this.backdrop, this.calib, this.yOf, this.xOf.bind(this));
    drawLandmarks(ctx, c, this.yOf);
    ctx.strokeStyle = "#2a2f2f"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(this.CX, PAD); ctx.lineTo(this.CX, c.height - PAD); ctx.stroke();
    const defFit = defFitOf(this.defaultTable);
    this._drawCurve(defFit, "#4a5252", true);
    this._drawCurve(this.fit(), "#2fa3a3", false);
    for (const p of this.points) {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(this.xOf(p.y, side), this.yOf(p.v), this.dragPoint === p ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = this.dragPoint === p ? "#e9ecec" : "#2fa3a3";
        ctx.fill();
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
    for (const p of this.points) {
      for (const side of [-1, 1]) {
        const dx = mx - this.xOf(p.y, side), dy = my - this.yOf(p.v);
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; best = p; }
      }
    }
    return best;
  }
  _wire() {
    const c = this.canvas;
    c.addEventListener("pointerdown", (ev) => {
      const r = c.getBoundingClientRect();
      const mx = ev.clientX - r.left, my = ev.clientY - r.top;
      if (this.calibClickHandler && this.calibClickHandler(mx, my)) return;
      const hit = this._pick(mx, my);
      if (!hit) return;
      this.dragPoint = hit;
      c.setPointerCapture(ev.pointerId);
    });
    c.addEventListener("pointermove", (ev) => {
      const r = c.getBoundingClientRect();
      const mx = ev.clientX - r.left;
      if (this.dragPoint) {
        const side = mx >= this.CX ? 1 : -1;
        this.dragPoint.y = Math.max(15, Math.min(this.yMax, side * (mx - this.CX) * this.mmPerPxY));
        this.draw(); this.onLive();
        return;
      }
      c.style.cursor = this._pick(mx, ev.clientY - r.top) ? "grab" : "default";
    });
    addEventListener("pointerup", () => {
      const wasDragging = this.dragPoint !== null;
      this.dragPoint = null; this.draw();
      if (wasDragging) this.onDragEnd?.();
    });
  }
}

// ---------------------------------------------------------------- b(v): front (right) / back (left)
class DualCurvePane {
  constructor({ canvas, seedFront, seedBack, defaultTable, backdropSrc, onLive, onDragEnd, calib }) {
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
    this.calibClickHandler = null;   // set by setupCalibration() below
    this.backdrop = loadBackdrop(backdropSrc, () => this.draw());
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
    drawBackdrop(ctx, c, this.backdrop, this.calib, this.yOf, this.xOf.bind(this));
    drawLandmarks(ctx, c, this.yOf);
    ctx.strokeStyle = "#2a2f2f"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(this.CX, PAD); ctx.lineTo(this.CX, c.height - PAD); ctx.stroke();
    const defFit = defFitOf(this.defaultTable);
    this._drawCurve(defFit, 1, "#4a5252", true);
    this._drawCurve(defFit, -1, "#4a5252", true);
    this._drawCurve(this.fitFront(), 1, "#2fa3a3", false);
    this._drawCurve(this.fitBack(), -1, "#d98a35", false);
    for (const [pts, side, color] of [[this.front, 1, "#2fa3a3"], [this.back, -1, "#d98a35"]]) {
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(this.xOf(p.y, side), this.yOf(p.v), this.dragPoint === p ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = this.dragPoint === p ? "#e9ecec" : color;
        ctx.fill();
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
    for (const [pts, side] of [[this.front, 1], [this.back, -1]]) {
      for (const p of pts) {
        const dx = mx - this.xOf(p.y, side), dy = my - this.yOf(p.v);
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; best = p; bestSide = side; }
      }
    }
    return best ? { p: best, side: bestSide } : null;
  }
  _wire() {
    const c = this.canvas;
    c.addEventListener("pointerdown", (ev) => {
      const r = c.getBoundingClientRect();
      const mx = ev.clientX - r.left, my = ev.clientY - r.top;
      if (this.calibClickHandler && this.calibClickHandler(mx, my)) return;
      const hit = this._pick(mx, my);
      if (!hit) return;
      this.dragPoint = hit.p; this.dragSide = hit.side;
      c.setPointerCapture(ev.pointerId);
    });
    c.addEventListener("pointermove", (ev) => {
      const r = c.getBoundingClientRect();
      const mx = ev.clientX - r.left;
      if (this.dragPoint) {
        this.dragPoint.y = Math.max(15, Math.min(this.yMax,
          this.dragSide * (mx - this.CX) * this.mmPerPxY));
        this.draw(); this.onLive();
        return;
      }
      c.style.cursor = this._pick(mx, ev.clientY - r.top) ? "grab" : "default";
    });
    addEventListener("pointerup", () => {
      const wasDragging = this.dragPoint !== null, side = this.dragSide;
      this.dragPoint = null; this.dragSide = null; this.draw();
      if (wasDragging) this.onDragEnd?.(side);
    });
  }
}

// Replace the flat ~31-point baked seed with the fewest adaptively-placed
// points that meet DEFAULT_TARGET_RESIDUAL_MM against the TRUE dense
// generated curve (seed_a_dense/seed_b_dense, 1601 points) — a one-time
// operation, done once here at load. Every later density-slider move
// resamples against whatever's on screen, never against this dense table
// again (see the adaptive-density block above). The initial caches are
// built directly from the dense ground truth (not from a PCHIP-through-
// the-seed reconstruction of it), so the reported floor and residual at
// load are against the true curve, not an already-lossy stand-in.
const groundTruthA = defFitOf({ z: state.seed_a_dense.z, y: state.seed_a_dense.a });
const groundTruthB = defFitOf({ z: state.seed_b_dense.z, y: state.seed_b_dense.b });
let cacheA = buildDensityCacheFromFit(groundTruthA);
let cacheBf = buildDensityCacheFromFit(groundTruthB);
let cacheBb = buildDensityCacheFromFit(groundTruthB);   // separate object — front/back diverge on edits
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

// Per-curve "named feature currently lost" state — set by a density
// resample or a smoothing pass (the two actions that can silently erase
// a feature), never by a hand-drag (an intentional edit is out of scope
// for this guard). Drives both the loud on-page warning and the export
// block below.
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
      `${parts.join(" · ")}. Export is blocked until the density is raised (see the floor under each ` +
      `slider) or the override below is checked.`;
  }
  $("exportOverrideRow").style.display = anyLost ? "flex" : "none";
  if (!anyLost) $("exportOverride").checked = false;
}

const noop = () => {};
const calibFront = new BackdropCalibration();
const calibTrace = new BackdropCalibration();
const paneA = new CurvePane({
  canvas: $("canvasA"), seed: seedAPoints,
  defaultTable: { z: state.default_a_table.z, y: state.default_a_table.a },
  backdropSrc: "./assets/shape-editor/silhouette-front.png", onLive: noop,
  onDragEnd: () => { cacheA = null; }, calib: calibFront,
});
const paneB = new DualCurvePane({
  canvas: $("canvasB"), seedFront: seedBfPoints, seedBack: seedBbPoints,
  defaultTable: { z: state.default_b_table.z, y: state.default_b_table.b },
  backdropSrc: "./assets/shape-editor/silhouette-trace.png", onLive: noop,
  onDragEnd: (side) => { if (side === 1) cacheBf = null; else cacheBb = null; }, calib: calibTrace,
});
paneA.onLive = paneB.onLive = () => liveUpdate();

// -- calibration UI wiring -------------------------------------------------
function setupCalibration(pane, refKey, suffix, hasHRef) {
  const calib = pane.calib;
  const statusEl = $(`calibStatus${suffix}`);
  const calibBtn = $(`calibBtn${suffix}`);
  const calibClearBtn = $(`calibClear${suffix}`);
  const hrefBtn = hasHRef ? $(`hrefBtn${suffix}`) : null;
  const hrefClearBtn = hasHRef ? $(`hrefClear${suffix}`) : null;
  const hrefMmInput = hasHRef ? $(`hrefMm${suffix}`) : null;
  const ref = state.backdrop_calibration_reference?.[refKey];

  let step = null;   // null | "waist" | "hem" | "hrefLeft" | "hrefRight"
  let pendingWaist = null, pendingHrefLeft = null;

  function setStatus(cls, html) {
    statusEl.className = `calibStatus ${cls}`;
    statusEl.innerHTML = html;
  }
  function refresh() {
    if (step === "waist") { setStatus("pending", "click the WAIST line (v = 0) on the image"); return; }
    if (step === "hem") { setStatus("pending", `click the HEM line (v = ${V_LO.toFixed(0)} mm) on the image`); return; }
    if (step === "hrefLeft") { setStatus("pending", "click the LEFT bust point on the image"); return; }
    if (step === "hrefRight") { setStatus("pending", "click the RIGHT bust point on the image"); return; }
    if (!calib.calibrated) {
      setStatus("uncal", "uncalibrated — backdrop is a visual reference only, not a measurement");
      return;
    }
    const hrefLine = calib.hRef
      ? ` · horizontal: independent ref (${calib.hRef.mm.toFixed(1)}mm) → <b>${calib.mmPerPxH.toFixed(3)}</b> mm/px`
      : " · horizontal: = vertical (aspect assumed intact)";
    // Python's own extract_from_image already fits THIS same photo
    // (silhouette.WAIST_TO_HEM_MM = 381, same convention) — mm/px is
    // directly comparable to that fit and is the real cross-check.
    // Python's OWN "implied height" is a DIFFERENT quantity, though — the
    // top-to-bottom extent of the auto-detected silhouette component, not
    // the full image frame — so it's reported but deliberately NOT
    // compared to this tool's full-frame number below (they measure
    // different spans and disagreeing is expected, not a red flag).
    let refLine = "", deltaFlag = "";
    if (ref) {
      refLine = ` · Python's own auto-fit on this image: <b>${ref.mm_per_px.toFixed(3)}</b> mm/px ` +
        `(cross-check — compare to the mm/px above, NOT the height below: Python's own "implied ` +
        `height" of ${ref.implied_total_height_mm.toFixed(0)} mm measures only the detected ` +
        `silhouette's own top-to-bottom extent, not the full frame)`;
      const pctOff = 100 * (calib.mmPerPxV - ref.mm_per_px) / ref.mm_per_px;
      if (Math.abs(pctOff) > 5) {
        deltaFlag = ` <span class="warn">⚠ ${pctOff > 0 ? "+" : ""}${pctOff.toFixed(0)}% off Python's ` +
          `own fit on this same image — check the clicks, or the image may be cropped/scaled ` +
          `differently than what Python fit against</span>`;
      }
    }
    setStatus("cal", `calibrated — vertical <b>${calib.mmPerPxV.toFixed(3)}</b> mm/px, ` +
      `implied FULL-FRAME height <b>${calib.impliedHeightMm().toFixed(0)}</b> mm (top-to-bottom of the ` +
      `whole image, not just the garment — a badly cropped/stretched image shows up here as an ` +
      `unreasonable number)${hrefLine}${refLine}${deltaFlag}`);
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
        setStatus("uncal", "calibration failed — the hem click must be BELOW the waist click in the " +
          "image (check the order/positions) — click “calibrate waist/hem” to try again");
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
        setStatus("cal", "horizontal reference failed — the two clicks must be apart and the " +
          "distance positive — try again");
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
}
setupCalibration(paneA, "front", "A", true);
setupCalibration(paneB, "trace", "B", false);

// ---------------------------------------------------------------- 3D pane
const view = $("view");
const renderer = new THREE.WebGLRenderer({ antialias: true });
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
  const df = s.class_distribution_front, db = s.class_distribution_back;
  const dstr = (d) => Object.entries(d).map(([k, v]) => `${k === "null" ? "none" : k}×${v}`).join(" ");
  let hemNote = "";
  if (s.hem_band_min_radius_mm != null) {
    hemNote = `<br><span class="warn">hem band (≤${s.hem_band_mm} mm from the hem edge) min radius ` +
      `${s.hem_band_min_radius_mm.toFixed(1)} mm at θ ${s.hem_band_min_radius_at[0].toFixed(0)}° ` +
      `s ${s.hem_band_min_radius_at[1].toFixed(0)} mm — ${s.hem_singular
        ? "known superellipse singularity (dome_n < 2, r'' diverges as u→0), not a defect"
        : "dome_n ≥ 2, not the singular regime"}</span>`;
  }
  const staleTag = stale
    ? `<br><span class="err">⚠ STALE — this is the pre-edit snapshot; the curves have moved since. ` +
      `Curvature/seatability need Python — ask to regenerate + republish for a fresh number.</span>` : "";
  return `<b>${label}</b><br>min meridional radius (outside the hem band) <b>${s.min_radius_mm?.toFixed(1) ?? "?"} mm</b>` +
    (s.min_radius_at ? ` at θ ${s.min_radius_at[0].toFixed(0)}° s ${s.min_radius_at[1].toFixed(0)} mm` : "") +
    hemNote +
    `<br>max-class front: ${dstr(df)}<br>max-class back: ${dstr(db)}` +
    `<br>p213 area <b>${(s.p213_area_mm2 / 100).toFixed(0)} cm²</b>` +
    `<br>usable area <b>${(s.usable_area_mm2 / 100).toFixed(0)} cm²</b> / ` +
    `${(s.total_shell_area_mm2 / 100).toFixed(0)} cm² total` + staleTag;
}

let edited = false;
$("monoReadout").innerHTML = fmtMono(monotonicityReport(paneA.fit(), V_HI), "LIVE");
$("circTable").innerHTML = fmtCircTable(
  coarseCircumferenceReport(paneA.fit(), paneB.fitFront(), paneB.fitBack(), V_LO, V_HI), "LIVE");
$("shellReadout").innerHTML = fmtShell(state.initial_shell_analysis, "SNAPSHOT (baked at export)", false);
$("baselineReadout").innerHTML = fmtShell(state.baseline_shell_analysis, "committed baseline (bust=apex, unchanged)", false);
$("armholeReadout").textContent = `${SPLIT.toFixed(2)}° (frozen from the snapshot — armhole re-solve needs Python)`;
$("modeTag").innerHTML = `<b class="ok">LIVE</b> — client-computed, cross-validated to ~1e-13mm`;

// generator: REFERENCE ONLY on this page — no Python here to re-solve
// the fillet/bump-field construction live. Regenerating means asking for
// a fresh export_shape_editor_static.py run + republish.
const g = state.generator;
$("genRef").innerHTML = `hem circ ${g.hem_circumference} · dome n ${g.dome_n} · ` +
  `fillet R ${g.fillet_radius} (${g.fillet_type}) · plateau θ ${g.plateau_theta_deg.toFixed(3)}° · ` +
  `plateau CF depth ${g.plateau_cf_depth_mm} mm · plateau radius ${g.plateau_radius_mm} mm`;

// ---------------------------------------------------------------- adaptive density UI
$("densityReport").innerHTML = `adaptive seed replaced the flat ${bakedSeedCount}-point baked seed: ` +
  `a(v) <b>${bakedSeedCount}→${initA.count}</b> pts · b_front <b>${bakedSeedCount}→${initBf.count}</b> pts · ` +
  `b_back <b>${bakedSeedCount}→${initBb.count}</b> pts (≤${DEFAULT_TARGET_RESIDUAL_MM}mm target, sampled ` +
  `between control points against the true generated curve, never just at knots).`;

$("densityA").min = String(MIN_POINTS); $("densityA").max = String(MAX_POINTS); $("densityA").value = String(initA.count);
$("densityAVal").textContent = String(initA.count);
$("densityAReadout").innerHTML = fmtDensity(initA, "a(v)", cacheA.floor);
lostFeatures.a = initA.features.filter(f => f.lost).map(f => f.name);
$("densityBf").min = String(MIN_POINTS); $("densityBf").max = String(MAX_POINTS); $("densityBf").value = String(initBf.count);
$("densityBfVal").textContent = String(initBf.count);
$("densityBfReadout").innerHTML = fmtDensity(initBf, "b_front", cacheBf.floor);
lostFeatures.bf = initBf.features.filter(f => f.lost).map(f => f.name);
$("densityBb").min = String(MIN_POINTS); $("densityBb").max = String(MAX_POINTS); $("densityBb").value = String(initBb.count);
$("densityBbVal").textContent = String(initBb.count);
$("densityBbReadout").innerHTML = fmtDensity(initBb, "b_back", cacheBb.floor);
lostFeatures.bb = initBb.features.filter(f => f.lost).map(f => f.name);
updateExportGuard();

$("densityA").addEventListener("input", (ev) => {
  if (!cacheA) cacheA = buildDensityCache(paneA.points);
  const r = applyDensityTo(cacheA, parseInt(ev.target.value, 10));
  paneA.points = r.points;
  $("densityAVal").textContent = String(r.count);
  $("densityAReadout").innerHTML = fmtDensity(r, "a(v)", cacheA.floor);
  lostFeatures.a = r.features.filter(f => f.lost).map(f => f.name);
  updateExportGuard();
  paneA.draw(); liveUpdate();
});
$("densityBf").addEventListener("input", (ev) => {
  if (!cacheBf) cacheBf = buildDensityCache(paneB.front);
  const r = applyDensityTo(cacheBf, parseInt(ev.target.value, 10));
  paneB.front = r.points;
  $("densityBfVal").textContent = String(r.count);
  $("densityBfReadout").innerHTML = fmtDensity(r, "b_front", cacheBf.floor);
  lostFeatures.bf = r.features.filter(f => f.lost).map(f => f.name);
  updateExportGuard();
  paneB.draw(); liveUpdate();
});
$("densityBb").addEventListener("input", (ev) => {
  if (!cacheBb) cacheBb = buildDensityCache(paneB.back);
  const r = applyDensityTo(cacheBb, parseInt(ev.target.value, 10));
  paneB.back = r.points;
  $("densityBbVal").textContent = String(r.count);
  $("densityBbReadout").innerHTML = fmtDensity(r, "b_back", cacheBb.floor);
  lostFeatures.bb = r.features.filter(f => f.lost).map(f => f.name);
  updateExportGuard();
  paneB.draw(); liveUpdate();
});

// ---------------------------------------------------------------- smoothing (control-point cleanup)
// Smoothing is checked against the TRUE dense ground truth (not "the
// curve before this smoothing pass" the way resampling is) — the point
// of smoothing is removing trace noise while staying close to the real
// shape, so the real shape is the right reference for whether a feature
// survived it.
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
  updateExportGuard();
  paneA.draw(); liveUpdate();
  status("smoothed a(v)", "ok");
};
$("smoothBf").onclick = () => {
  const [amt, passes] = smoothAmountPasses();
  paneB.front = smoothPoints(paneB.front, amt, passes);
  cacheBf = null;
  lostFeatures.bf = featuresAfterSmooth(paneB.front, groundTruthB);
  updateExportGuard();
  paneB.draw(); liveUpdate();
  status("smoothed b_front", "ok");
};
$("smoothBb").onclick = () => {
  const [amt, passes] = smoothAmountPasses();
  paneB.back = smoothPoints(paneB.back, amt, passes);
  cacheBb = null;
  lostFeatures.bb = featuresAfterSmooth(paneB.back, groundTruthB);
  updateExportGuard();
  paneB.draw(); liveUpdate();
  status("smoothed b_back", "ok");
};

// neckline: heights are still reference-only (not draggable in this
// first cut — rebuilding the neckline SHAPE needs Python), but the trim
// itself is applied to the 3D view: it's a known function of theta, so
// clipping the mesh to it is a clip, not a solve. Faithful port of
// neckline.NecklineV3.height (validated to ~1e-11mm, see geom.js).
const n = state.neckline;
$("neckRef").innerHTML = `CF ${n.cf_height} · peak ${n.peak_height} · side ${n.side_height} · ` +
  `CB ${n.cb_height} · peak θ ${n.peak_theta}° · bow ${n.rise_bow} · decay ${n.decay_rate} · ` +
  `${n.cf_corner ? "corner" : "smooth apex"} · trimmed live in the 3D view below, heights not yet draggable`;
const necklineFn = necklineHeightFn(n);

function liveUpdate() {
  edited = true;
  const aFit = paneA.fit(), bfFit = paneB.fitFront(), bbFit = paneB.fitBack();
  $("monoReadout").innerHTML = fmtMono(monotonicityReport(aFit, V_HI), "LIVE");
  $("circTable").innerHTML = fmtCircTable(
    coarseCircumferenceReport(aFit, bfFit, bbFit, V_LO, V_HI), "LIVE");
  const shell = new CompoundCoarseShell(aFit, bfFit, bbFit, V_LO, V_HI, SPLIT);
  setMeshes(shell.buildMeshes(48, 64, necklineFn), 0xc9cfcc);
  $("shellReadout").innerHTML = fmtShell(state.initial_shell_analysis, "SNAPSHOT (baked at export)", true);
  status("live", "ok");
}

// initial mesh
{
  const shell = new CompoundCoarseShell(paneA.fit(), paneB.fitFront(), paneB.fitBack(), V_LO, V_HI, SPLIT);
  setMeshes(shell.buildMeshes(48, 64, necklineFn), 0xc9cfcc);
}

// ---------------------------------------------------------------- export (no server to save to)
function yamlFloat(x) {
  // matches Python's repr(float(x)) closely enough for round-trip:
  // shortest string that reparses to the same float64. JS's default
  // Number->String already does this (ECMA-262 uses the same
  // shortest-round-trip algorithm Python's repr does since 3.1).
  return String(x);
}
// Mirrors shape_state.py's _dump_calibration exactly — same field order
// (_CALIB_FIELDS), same nesting, same skip-if-null convention — so the
// exported text matches what Python's dump_shape() would produce for the
// same data (see that module's _CALIB_BACKDROPS/_CALIB_FIELDS).
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
  dumpCalibrationYaml(lines, {
    front: calibFront.toShapeYaml("assets/shape-editor/silhouette-front.png"),
    trace: calibTrace.toShapeYaml("assets/shape-editor/silhouette-trace.png"),
  });
  return lines.join("\n") + "\n";
}

$("exportOverride").addEventListener("change", updateExportGuard);

$("exportBtn").onclick = () => {
  if (exportBlocked()) {
    $("exportStatus").innerHTML = '<span class="err">export blocked — a named feature is lost at the ' +
      "current density (see the warning above); raise the density or check the override</span>";
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
  $("exportStatus").innerHTML = overridden
    ? '<span class="warn">downloaded shape.yaml WITH a named feature lost (override used) — ' +
      "send it back to have it committed as tools/dress-shell/shape.yaml, or copy the text below</span>"
    : '<span class="ok">downloaded shape.yaml — send it back to have it committed ' +
      "as tools/dress-shell/shape.yaml, or copy the text below</span>";
};
$("copyBtn").onclick = async () => {
  if (exportBlocked()) {
    $("exportStatus").innerHTML = '<span class="err">copy blocked — a named feature is lost at the ' +
      "current density (see the warning above); raise the density or check the override</span>";
    return;
  }
  const text = dumpShapeYaml();
  try {
    await navigator.clipboard.writeText(text);
    $("exportStatus").innerHTML = '<span class="ok">copied to clipboard</span>';
  } catch {
    $("exportArea").value = text;
    $("exportArea").style.display = "block";
    $("exportStatus").innerHTML = '<span class="warn">clipboard blocked — select the text below</span>';
  }
};

paneA.draw();
paneB.draw();
status(`ready — v ∈ [${V_LO.toFixed(0)}, ${V_HI.toFixed(0)}] mm · ` +
       `${paneA.points.length} a(v) points, ${paneB.front.length} b_front / ` +
       `${paneB.back.length} b_back points (v fixed, drag value) · fully client-side, no server`);
(function loop() {
  requestAnimationFrame(loop);
  controls.update();
  renderer.render(scene, camera);
})();
