// Shape editor — milestone 3. a(v) shared; b(v) splits into independently
// draggable b_front(v)/b_back(v) on one canvas (compound half-ellipse
// sections, see shape_state.CompoundShapeCurves). Neckline stays live.
// Skirt/fillet/bust-apex scalars are GENERATORS, not live controls: they
// seed control points (replacing the current ones), never bind. Two
// speeds, always labeled:
//   COARSE — this file's own geom.js port, every pointermove, no network.
//   FULL   — POST /api/curve on pointerup / apply-click only: the real
//            scipy PCHIP + CompoundShellModel + build_meshes + the full
//            curvature/seatability sweep (costs real seconds — see the
//            server docstring; a request-generation guard here drops any
//            stale response that lands after a newer request started).
// Separate page from the placement editor on purpose: own server, own
// state, does not touch layout.yaml.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { pchipFit, CompoundCoarseShell, monotonicityReport,
        coarseCircumferenceReport } from "/geom.js";

const $ = (id) => document.getElementById(id);
const status = (msg, cls = "") => { $("status").innerHTML = `<span class="${cls}">${msg}</span>`; };

const state = await (await fetch("/api/state")).json();
const V_LO = state.domain.v_lo, V_HI = state.domain.v_hi;
let SPLIT = state.bounds.split_theta;

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
  constructor({ canvas, seed, defaultTable, backdropSrc, onLive, onCommit }) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.points = seed.map(([v, y]) => ({ v, y }));
    this.defaultTable = defaultTable;
    Object.assign(this, axes(canvas));
    const allY = [...this.points.map(p => p.y), ...defaultTable.y];
    this.yMax = Math.max(...allY) * 1.15;
    this.mmPerPxY = this.yMax / (this.CX - PAD);
    this.dragPoint = null;
    this.onLive = onLive; this.onCommit = onCommit;
    this.backdrop = loadBackdrop(backdropSrc, () => this.draw());
    this._wire();
  }

  setPoints(pts) {
    this.points = pts.map(([v, y]) => ({ v, y }));
    this.draw();
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
      if (!this.dragPoint) return;
      this.dragPoint = null; this.draw(); this.onCommit();
    });
  }
}

// ---------------------------------------------------------------- b(v): front (right) / back (left)
class DualCurvePane {
  constructor({ canvas, seedFront, seedBack, defaultTable, backdropSrc, onLive, onCommit }) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.front = seedFront.map(([v, y]) => ({ v, y }));
    this.back = seedBack.map(([v, y]) => ({ v, y }));
    this.defaultTable = defaultTable;
    Object.assign(this, axes(canvas));
    const allY = [...this.front.map(p => p.y), ...this.back.map(p => p.y), ...defaultTable.y];
    this.yMax = Math.max(...allY) * 1.15;
    this.mmPerPxY = this.yMax / (this.CX - PAD);
    this.dragPoint = null; this.dragSide = null;
    this.onLive = onLive; this.onCommit = onCommit;
    this.backdrop = loadBackdrop(backdropSrc, () => this.draw());
    this._wire();
  }

  setPoints(front, back) {
    this.front = front.map(([v, y]) => ({ v, y }));
    this.back = back.map(([v, y]) => ({ v, y }));
    this.draw();
  }

  xOf(val, side) { return this.CX + side * val / this.mmPerPxY; }   // +1 = front (right), -1 = back (left)
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
        // side is FIXED to whichever curve this point belongs to — front
        // stays right, back stays left, regardless of where the cursor
        // wanders (unlike a(v), the two sides are not interchangeable)
        this.dragPoint.y = Math.max(15, Math.min(this.yMax,
          this.dragSide * (mx - this.CX) * this.mmPerPxY));
        this.draw(); this.onLive();
        return;
      }
      c.style.cursor = this._pick(mx, ev.clientY - r.top) ? "grab" : "default";
    });
    addEventListener("pointerup", () => {
      if (!this.dragPoint) return;
      this.dragPoint = null; this.dragSide = null; this.draw(); this.onCommit();
    });
  }
}

const noop = () => {};
const paneA = new CurvePane({
  canvas: $("canvasA"), seed: state.seed_a_points,
  defaultTable: { z: state.default_a_table.z, y: state.default_a_table.a },
  backdropSrc: "/silhouette-front.png", onLive: noop, onCommit: noop,
});
const paneB = new DualCurvePane({
  canvas: $("canvasB"), seedFront: state.seed_bf_points, seedBack: state.seed_bb_points,
  defaultTable: { z: state.default_b_table.z, y: state.default_b_table.b },
  backdropSrc: "/silhouette-trace.png", onLive: noop, onCommit: noop,
});
paneA.onLive = paneB.onLive = () => coarseUpdate();
paneA.onCommit = paneB.onCommit = () => fullUpdate();

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
    const pos = src.positions instanceof Float32Array ? src.positions : Float32Array.from(src.positions);
    const idx = src.indices instanceof Uint32Array ? src.indices : Uint32Array.from(src.indices);
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
      color, roughness: 0.85, metalness: 0.0, side: THREE.DoubleSide }));
    scene.add(mesh);
    shellMeshes.push(mesh);
  }
}
setMeshes(state.mesh, 0xc9cfcc);

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
function fmtShell(s, base) {
  const df = s.class_distribution_front, db = s.class_distribution_back;
  const dstr = (d) => Object.entries(d).map(([k, v]) => `${k === "null" ? "none" : k}×${v}`).join(" ");
  return `min meridional radius <b>${s.min_radius_mm?.toFixed(1) ?? "?"} mm</b>` +
    (s.min_radius_at ? ` at θ ${s.min_radius_at[0].toFixed(0)}° s ${s.min_radius_at[1].toFixed(0)} mm` : "") +
    `<br>max-class front: ${dstr(df)}<br>max-class back: ${dstr(db)}` +
    `<br>p213 area <b>${(s.p213_area_mm2 / 100).toFixed(0)} cm²</b>` +
    (base ? ` (Δ ${((s.p213_area_mm2 - base.p213_area_mm2) / 100).toFixed(0)} cm² vs committed)` : "") +
    `<br>usable area <b>${(s.usable_area_mm2 / 100).toFixed(0)} cm²</b> / ` +
    `${(s.total_shell_area_mm2 / 100).toFixed(0)} cm² total`;
}
function fmtResidual(r) {
  if (!r) return "";
  return `<span class="${r.a_max_mm > 2 || r.b_max_mm > 2 ? "warn" : "ok"}">` +
    `fit residual BETWEEN control points (not at them) vs the analytic source: ` +
    `a max ${r.a_max_mm.toFixed(2)} / rms ${r.a_rms_mm.toFixed(2)} mm, ` +
    `b max ${r.b_max_mm.toFixed(2)} / rms ${r.b_rms_mm.toFixed(2)} mm ` +
    `(${r.n_probe_points} probe points)</span>`;
}

$("monoReadout").innerHTML = fmtMono(state.readout.monotonicity, "FULL (initial, server)");
$("circTable").innerHTML = fmtCircTable(state.readout.circumference, "FULL (initial)");
$("shellReadout").innerHTML = fmtShell(state.readout.shell, null);
$("devReadout").innerHTML = "";
$("armholeReadout").textContent = `${SPLIT.toFixed(2)}°`;
$("modeTag").innerHTML = `<b class="ok">FULL</b> — matches committed shell exactly`;
if (state.readout.generator_residual) {
  $("generatorStatus").innerHTML = "seeded at startup — " + fmtResidual(state.readout.generator_residual);
}

// neckline inputs, seeded from server state
if (state.neckline) {
  const n = state.neckline;
  $("nCf").value = n.cf_height; $("nPeak").value = n.peak_height;
  $("nSide").value = n.side_height; $("nCb").value = n.cb_height;
  $("nPeakTheta").value = n.peak_theta; $("nBow").value = n.rise_bow;
  $("nDecay").value = n.decay_rate; $("nCorner").checked = n.cf_corner;
}
function neckBody() {
  return { cf_height: parseFloat($("nCf").value), peak_height: parseFloat($("nPeak").value),
          side_height: parseFloat($("nSide").value), cb_height: parseFloat($("nCb").value),
          peak_theta: parseFloat($("nPeakTheta").value), rise_bow: parseFloat($("nBow").value),
          decay_rate: parseFloat($("nDecay").value), cf_corner: $("nCorner").checked };
}

// generator inputs, seeded from server state
const g = state.generator;
$("gHem").value = g.hem_circumference; $("gDomeN").value = g.dome_n;
$("gFilletR").value = g.fillet_radius; $("gFilletType").value = g.fillet_type;
$("gApexTheta").value = g.apex_theta_deg; $("gApexAmp").value = g.apex_amplitude_mm;
$("gApexR").value = g.apex_radius_mm;
function generatorBody() {
  return { hem_circumference: parseFloat($("gHem").value), dome_n: parseFloat($("gDomeN").value),
          fillet_radius: parseFloat($("gFilletR").value), fillet_type: $("gFilletType").value,
          apex_theta_deg: parseFloat($("gApexTheta").value),
          apex_amplitude_mm: parseFloat($("gApexAmp").value),
          apex_radius_mm: parseFloat($("gApexR").value) };
}

function coarseUpdate() {
  const aFit = paneA.fit(), bfFit = paneB.fitFront(), bbFit = paneB.fitBack();
  const rep = monotonicityReport(aFit, V_HI);
  $("monoReadout").innerHTML = fmtMono(rep, "COARSE (live, client)");
  $("circTable").innerHTML = fmtCircTable(
    coarseCircumferenceReport(aFit, bfFit, bbFit, V_LO, V_HI), "COARSE (live)");
  const shell = new CompoundCoarseShell(aFit, bfFit, bbFit, V_LO, V_HI, SPLIT);
  setMeshes(shell.buildMeshes(), 0x3d9a9e);
  $("modeTag").innerHTML = `<b class="warn">COARSE</b> — client preview, low-res curvature/seating not computed`;
}

let reqGen = 0;
async function fullUpdate() {
  const myGen = ++reqGen;
  status("resolving on server (full)… full curvature/seatability sweep, ~10-15 s");
  try {
    const r = await fetch("/api/curve", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        a_points: paneA.points.map(p => [p.v, p.y]),
        b_front_points: paneB.front.map(p => [p.v, p.y]),
        b_back_points: paneB.back.map(p => [p.v, p.y]),
        neckline: neckBody(),
      }) });
    const data = await r.json();
    if (myGen !== reqGen) return;   // a newer request superseded this one
    if (!r.ok) { status(`server: ${data.error}`, "err"); return; }
    setMeshes(data.mesh, 0xc9cfcc);
    SPLIT = data.split_theta;
    $("armholeReadout").textContent = `${SPLIT.toFixed(2)}°`;
    $("monoReadout").innerHTML = fmtMono(data.readout.monotonicity, "FULL (server-verified)");
    $("circTable").innerHTML = fmtCircTable(data.readout.circumference, "FULL (server-verified)");
    $("shellReadout").innerHTML = fmtShell(data.readout.shell, state.readout.shell);
    const d = data.deviation_from_committed_mm;
    $("devReadout").innerHTML = `deviation from committed at control points: ` +
      `a max ${d.a_max.toFixed(2)} / rms ${d.a_rms.toFixed(2)} mm, ` +
      `b_front max ${d.b_front_max.toFixed(2)} / rms ${d.b_front_rms.toFixed(2)} mm, ` +
      `b_back max ${d.b_back_max.toFixed(2)} / rms ${d.b_back_rms.toFixed(2)} mm`;
    $("modeTag").innerHTML = `<b class="ok">FULL</b> — server-verified`;
    status("ready", "ok");
  } catch (e) {
    if (myGen !== reqGen) return;
    status(`server resolve failed: ${e}`, "err");
  }
}

$("applyBtn").onclick = fullUpdate;

$("generateBtn").onclick = async () => {
  $("generatorStatus").innerHTML = "generating…";
  try {
    const r = await fetch("/api/generate", { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(generatorBody()) });
    const data = await r.json();
    if (!r.ok) { $("generatorStatus").innerHTML = `<span class="err">${data.error}</span>`; return; }
    paneA.setPoints(data.a_points);
    paneB.setPoints(data.b_front_points, data.b_back_points);
    $("generatorStatus").innerHTML = fmtResidual(data.residual_between_control_points);
    coarseUpdate();
    fullUpdate();
  } catch (e) {
    $("generatorStatus").innerHTML = `<span class="err">generate failed: ${e}</span>`;
  }
};

$("saveBtn").onclick = async () => {
  $("saveStatus").innerHTML = "saving…";
  try {
    const r = await fetch("/api/shape", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        a_points: paneA.points.map(p => [p.v, p.y]),
        b_front_points: paneB.front.map(p => [p.v, p.y]),
        b_back_points: paneB.back.map(p => [p.v, p.y]),
        neckline: neckBody(), generator: generatorBody(),
      }) });
    const data = await r.json();
    if (!r.ok) { $("saveStatus").innerHTML = `<span class="err">${data.error}</span>`; return; }
    $("saveStatus").innerHTML = `<span class="ok">saved ${data.path} (${data.bytes} bytes) — ` +
      `the placement editor picks this up on its next restart</span>`;
  } catch (e) {
    $("saveStatus").innerHTML = `<span class="err">save failed: ${e}</span>`;
  }
};

paneA.draw();
paneB.draw();
status(`ready — v ∈ [${V_LO.toFixed(0)}, ${V_HI.toFixed(0)}] mm · ` +
       `${paneA.points.length} a(v) points, ${paneB.front.length} b_front / ` +
       `${paneB.back.length} b_back points (v fixed, drag value)`);
(function loop() {
  requestAnimationFrame(loop);
  controls.update();
  renderer.render(scene, camera);
})();
