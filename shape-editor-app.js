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
        coarseCircumferenceReport, buildAdaptiveOrder, minimumPointsForResidual,
        checkNamedFeatures, smoothPoints } from "./shape-editor-geom.js";

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
const MAX_POINTS = 40;
const MIN_POINTS = 4;
const DEFAULT_TARGET_RESIDUAL_MM = 0.7;
const FEATURE_LOST_THRESHOLD_MM = 1.5;

function buildDensityCache(points) {
  const sorted = [...points].sort((a, b) => a.v - b.v);
  const baseFit = pchipFit(sorted.map(p => p.v), sorted.map(p => p.y));
  const built = buildAdaptiveOrder(baseFit, V_LO, V_HI, { maxPoints: MAX_POINTS, minResidual: 0 });
  return { ...built, baseFit };
}
function applyDensityTo(cache, targetCount) {
  const n = Math.max(MIN_POINTS, Math.min(targetCount, cache.order.length));
  const newPts = cache.order.slice(0, n).map(p => ({ v: p.v, y: p.y })).sort((a, b) => a.v - b.v);
  const newFit = pchipFit(newPts.map(p => p.v), newPts.map(p => p.y));
  const residual = cache.residualAtCount.get(n) || { max: 0, rms: 0 };
  const features = checkNamedFeatures(newFit, cache.baseFit, FEATURE_LOST_THRESHOLD_MM);
  return { points: newPts, count: n, residual, features };
}
function fmtDensity(r, label) {
  const lost = r.features.filter(f => f.lost);
  const featStr = lost.length
    ? `<span class="warn">lost: ${lost.map(f => f.name).join(", ")}</span>`
    : (r.features.length ? '<span class="ok">named features intact</span>' : "");
  return `${label}: <b>${r.count}</b> pts · between-point residual (vs the curve before this resample) ` +
    `max <b>${r.residual.max.toFixed(2)}</b> mm, rms <b>${r.residual.rms.toFixed(2)}</b> mm · ${featStr}`;
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
function drawBackdrop(ctx, canvas, img) {
  if (!(img.complete && img.naturalWidth)) return;
  ctx.globalAlpha = 0.16;
  ctx.drawImage(img, PAD, PAD, canvas.width - 2 * PAD, canvas.height - 2 * PAD);
  ctx.globalAlpha = 1;
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
  constructor({ canvas, seed, defaultTable, backdropSrc, onLive, onDragEnd }) {
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
    drawBackdrop(ctx, c, this.backdrop);
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
      const hit = this._pick(ev.clientX - r.left, ev.clientY - r.top);
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
  constructor({ canvas, seedFront, seedBack, defaultTable, backdropSrc, onLive, onDragEnd }) {
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
    drawBackdrop(ctx, c, this.backdrop);
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
      const hit = this._pick(ev.clientX - r.left, ev.clientY - r.top);
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
// again (see the adaptive-density block above).
const groundTruthA = defFitOf({ z: state.seed_a_dense.z, y: state.seed_a_dense.a });
const groundTruthB = defFitOf({ z: state.seed_b_dense.z, y: state.seed_b_dense.b });
const initA = minimumPointsForResidual(groundTruthA, V_LO, V_HI, DEFAULT_TARGET_RESIDUAL_MM, { maxPoints: MAX_POINTS });
const initBf = minimumPointsForResidual(groundTruthB, V_LO, V_HI, DEFAULT_TARGET_RESIDUAL_MM, { maxPoints: MAX_POINTS });
const initBb = minimumPointsForResidual(groundTruthB, V_LO, V_HI, DEFAULT_TARGET_RESIDUAL_MM, { maxPoints: MAX_POINTS });
const seedAPoints = initA.points.map(p => [p.v, p.y]);
const seedBfPoints = initBf.points.map(p => [p.v, p.y]);
const seedBbPoints = initBb.points.map(p => [p.v, p.y]);
const bakedSeedCount = state.seed_a_points.length;

let cacheA = null, cacheBf = null, cacheBb = null;

const noop = () => {};
const paneA = new CurvePane({
  canvas: $("canvasA"), seed: seedAPoints,
  defaultTable: { z: state.default_a_table.z, y: state.default_a_table.a },
  backdropSrc: "./assets/shape-editor/silhouette-front.png", onLive: noop,
  onDragEnd: () => { cacheA = null; },
});
const paneB = new DualCurvePane({
  canvas: $("canvasB"), seedFront: seedBfPoints, seedBack: seedBbPoints,
  defaultTable: { z: state.default_b_table.z, y: state.default_b_table.b },
  backdropSrc: "./assets/shape-editor/silhouette-trace.png", onLive: noop,
  onDragEnd: (side) => { if (side === 1) cacheBf = null; else cacheBb = null; },
});
paneA.onLive = paneB.onLive = () => liveUpdate();

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

function fmtInitDensity(label, r) {
  return `${label}: <b>${r.count}</b> pts · seeded at ≤${DEFAULT_TARGET_RESIDUAL_MM}mm target ` +
    `(max ${r.residual.max.toFixed(2)}mm, rms ${r.residual.rms.toFixed(2)}mm vs the true generated curve)`;
}
$("densityA").min = String(MIN_POINTS); $("densityA").max = String(MAX_POINTS); $("densityA").value = String(initA.count);
$("densityAVal").textContent = String(initA.count);
$("densityAReadout").innerHTML = fmtInitDensity("a(v)", initA);
$("densityBf").min = String(MIN_POINTS); $("densityBf").max = String(MAX_POINTS); $("densityBf").value = String(initBf.count);
$("densityBfVal").textContent = String(initBf.count);
$("densityBfReadout").innerHTML = fmtInitDensity("b_front", initBf);
$("densityBb").min = String(MIN_POINTS); $("densityBb").max = String(MAX_POINTS); $("densityBb").value = String(initBb.count);
$("densityBbVal").textContent = String(initBb.count);
$("densityBbReadout").innerHTML = fmtInitDensity("b_back", initBb);

$("densityA").addEventListener("input", (ev) => {
  if (!cacheA) cacheA = buildDensityCache(paneA.points);
  const r = applyDensityTo(cacheA, parseInt(ev.target.value, 10));
  paneA.points = r.points;
  $("densityAVal").textContent = String(r.count);
  $("densityAReadout").innerHTML = fmtDensity(r, "a(v)");
  paneA.draw(); liveUpdate();
});
$("densityBf").addEventListener("input", (ev) => {
  if (!cacheBf) cacheBf = buildDensityCache(paneB.front);
  const r = applyDensityTo(cacheBf, parseInt(ev.target.value, 10));
  paneB.front = r.points;
  $("densityBfVal").textContent = String(r.count);
  $("densityBfReadout").innerHTML = fmtDensity(r, "b_front");
  paneB.draw(); liveUpdate();
});
$("densityBb").addEventListener("input", (ev) => {
  if (!cacheBb) cacheBb = buildDensityCache(paneB.back);
  const r = applyDensityTo(cacheBb, parseInt(ev.target.value, 10));
  paneB.back = r.points;
  $("densityBbVal").textContent = String(r.count);
  $("densityBbReadout").innerHTML = fmtDensity(r, "b_back");
  paneB.draw(); liveUpdate();
});

// ---------------------------------------------------------------- smoothing (control-point cleanup)
function smoothAmountPasses() {
  return [parseFloat($("smoothAmount").value) || 0, parseInt($("smoothPasses").value, 10) || 1];
}
$("smoothA").onclick = () => {
  const [amt, passes] = smoothAmountPasses();
  paneA.points = smoothPoints(paneA.points, amt, passes);
  cacheA = null;
  paneA.draw(); liveUpdate();
  status("smoothed a(v)", "ok");
};
$("smoothBf").onclick = () => {
  const [amt, passes] = smoothAmountPasses();
  paneB.front = smoothPoints(paneB.front, amt, passes);
  cacheBf = null;
  paneB.draw(); liveUpdate();
  status("smoothed b_front", "ok");
};
$("smoothBb").onclick = () => {
  const [amt, passes] = smoothAmountPasses();
  paneB.back = smoothPoints(paneB.back, amt, passes);
  cacheBb = null;
  paneB.draw(); liveUpdate();
  status("smoothed b_back", "ok");
};

// neckline: display only (rebuilding the neckline surface needs Python
// too, in this first cut) — shown for reference, not editable live yet.
const n = state.neckline;
$("neckRef").innerHTML = `CF ${n.cf_height} · peak ${n.peak_height} · side ${n.side_height} · ` +
  `CB ${n.cb_height} · peak θ ${n.peak_theta}° · bow ${n.rise_bow} · decay ${n.decay_rate} · ` +
  `${n.cf_corner ? "corner" : "smooth apex"}`;

function liveUpdate() {
  edited = true;
  const aFit = paneA.fit(), bfFit = paneB.fitFront(), bbFit = paneB.fitBack();
  $("monoReadout").innerHTML = fmtMono(monotonicityReport(aFit, V_HI), "LIVE");
  $("circTable").innerHTML = fmtCircTable(
    coarseCircumferenceReport(aFit, bfFit, bbFit, V_LO, V_HI), "LIVE");
  const shell = new CompoundCoarseShell(aFit, bfFit, bbFit, V_LO, V_HI, SPLIT);
  setMeshes(shell.buildMeshes(), 0xc9cfcc);
  $("shellReadout").innerHTML = fmtShell(state.initial_shell_analysis, "SNAPSHOT (baked at export)", true);
  status("live", "ok");
}

// initial mesh
{
  const shell = new CompoundCoarseShell(paneA.fit(), paneB.fitFront(), paneB.fitBack(), V_LO, V_HI, SPLIT);
  setMeshes(shell.buildMeshes(), 0xc9cfcc);
}

// ---------------------------------------------------------------- export (no server to save to)
function yamlFloat(x) {
  // matches Python's repr(float(x)) closely enough for round-trip:
  // shortest string that reparses to the same float64. JS's default
  // Number->String already does this (ECMA-262 uses the same
  // shortest-round-trip algorithm Python's repr does since 3.1).
  return String(x);
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
  return lines.join("\n") + "\n";
}

$("exportBtn").onclick = () => {
  const text = dumpShapeYaml();
  const blob = new Blob([text], { type: "text/yaml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "shape.yaml";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  $("exportArea").value = text;
  $("exportArea").style.display = "block";
  $("exportStatus").innerHTML = '<span class="ok">downloaded shape.yaml — send it back to have it committed ' +
    "as tools/dress-shell/shape.yaml, or copy the text below</span>";
};
$("copyBtn").onclick = async () => {
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
