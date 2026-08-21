// Shape editor — milestone 3. a(v) AND b(v) both editable; neckline
// height stays live (composes independently — see shape_editor_server.py's
// docstring); skirt/fillet scalars are shown but INERT once curves are
// active (flagged in the UI, not silently ignored). Two speeds, always
// labeled:
//   COARSE — this file's own geom.js port, every pointermove, no network.
//   FULL   — POST /api/curve on pointerup / apply-click only: the real
//            scipy PCHIP + ShellModel + build_meshes + the full
//            curvature/seatability sweep (costs real seconds — see the
//            server docstring; a request-generation guard here drops any
//            stale response that lands after a newer request started).
// Separate page from the placement editor on purpose: own server, own
// state, does not touch layout.yaml.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { pchipFit, CoarseShell, monotonicityReport, coarseCircumferenceReport } from "/geom.js";

const $ = (id) => document.getElementById(id);
const status = (msg, cls = "") => { $("status").innerHTML = `<span class="${cls}">${msg}</span>`; };

const state = await (await fetch("/api/state")).json();
const V_LO = state.domain.v_lo, V_HI = state.domain.v_hi;
let SPLIT = state.bounds.split_theta;

// ---------------------------------------------------------------- curve panes
class CurvePane {
  constructor(opts) {
    Object.assign(this, opts);   // canvas, seed, defaultTable, backdropSrc, valueLabel
    this.points = this.seed.map(([v, y]) => ({ v, y }));
    this.ctx = this.canvas.getContext("2d");
    this.PAD = 20;
    this.CX = this.canvas.width / 2;
    const allY = [...this.points.map(p => p.y), ...this.defaultTable.y];
    this.yMax = Math.max(...allY) * 1.15;
    this.pxPerMm = (this.canvas.height - 2 * this.PAD) / (V_HI - V_LO);
    this.mmPerPxY = this.yMax / (this.CX - this.PAD);
    this.dragPoint = null;
    this.backdrop = new Image();
    this.backdrop.onload = () => this.draw();
    this.backdrop.src = this.backdropSrc;
    this._wire();
  }

  yOf(v) { return this.canvas.height - this.PAD - (v - V_LO) * this.pxPerMm; }
  vOf(y) { return V_LO + (this.canvas.height - this.PAD - y) / this.pxPerMm; }
  xOf(val, side) { return this.CX + side * val / this.mmPerPxY; }

  fit() {
    const sorted = [...this.points].sort((a, b) => a.v - b.v);
    return pchipFit(sorted.map(p => p.v), sorted.map(p => p.y));
  }

  draw() {
    const ctx = this.ctx, c = this.canvas;
    ctx.clearRect(0, 0, c.width, c.height);
    if (this.backdrop.complete && this.backdrop.naturalWidth) {
      ctx.globalAlpha = 0.16;
      ctx.drawImage(this.backdrop, this.PAD, this.PAD,
                    c.width - 2 * this.PAD, c.height - 2 * this.PAD);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = "#d98a35"; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
    for (const v of [0, 181]) {
      if (v < V_LO || v > V_HI) continue;
      const y = this.yOf(v);
      ctx.beginPath(); ctx.moveTo(this.PAD, y); ctx.lineTo(c.width - this.PAD, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#2a2f2f"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(this.CX, this.PAD); ctx.lineTo(this.CX, c.height - this.PAD); ctx.stroke();

    const defFit = (v) => {
      const zs = this.defaultTable.z, ys = this.defaultTable.y;
      if (v <= zs[0]) return ys[0];
      if (v >= zs[zs.length - 1]) return ys[ys.length - 1];
      let lo = 0, hi = zs.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (zs[m] <= v) lo = m; else hi = m; }
      const t = (v - zs[lo]) / (zs[hi] - zs[lo]);
      return ys[lo] + t * (ys[hi] - ys[lo]);
    };
    this._drawCurve(defFit, "#4a5252", true);
    this._drawCurve(this.fit(), "#2fa3a3", false);

    for (const p of this.points) {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(this.xOf(p.y, side), this.yOf(p.v),
               (this.dragPoint === p) ? 5 : 3, 0, Math.PI * 2);
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
      for (let y = this.PAD; y <= c.height - this.PAD; y++) {
        const val = fit(this.vOf(y));
        const x = this.xOf(val, side);
        if (y === this.PAD) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  _pick(mx, my) {
    // NEAREST within radius, not first-within-radius: at the seed
    // density needed for curve fidelity (see shape_editor_server.py's
    // _SEED_V_INTERIOR comment), adjacent handles near the bust ramp
    // can be only a few px apart, so "first found" silently grabbed the
    // wrong point — caught by a headless drag test landing 6mm off target.
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
        this.draw();
        this.onLive();
        return;
      }
      c.style.cursor = this._pick(mx, ev.clientY - r.top) ? "grab" : "default";
    });
    addEventListener("pointerup", () => {
      if (!this.dragPoint) return;
      this.dragPoint = null;
      this.draw();
      this.onCommit();
    });
  }
}

const noop = () => {};
const paneA = new CurvePane({
  canvas: $("canvasA"), seed: state.seed_a_points,
  defaultTable: { z: state.default_a_table.z, y: state.default_a_table.a },
  backdropSrc: "/silhouette-front.png", onLive: noop, onCommit: noop,
});
const paneB = new CurvePane({
  canvas: $("canvasB"), seed: state.seed_b_points,
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
    const cls = Math.abs(r.delta_mm ?? (r.derived_mm - r.tape_mm)) > 15 ? "warn" : "";
    html += `<tr><td>${r.label}</td><td>${r.derived_mm.toFixed(1)}</td>` +
      `<td>${r.tape_mm.toFixed(1)}</td><td class="${cls}">${(r.derived_mm - r.tape_mm).toFixed(1)}</td>` +
      `<td>${(r.in_range ?? r.in_trace_range) ? "" : '<span class="warn">extrap</span>'}</td></tr>`;
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

$("monoReadout").innerHTML = fmtMono(state.readout.monotonicity, "FULL (initial, server)");
$("circTable").innerHTML = fmtCircTable(state.readout.circumference, "FULL (initial)");
$("shellReadout").innerHTML = fmtShell(state.readout.shell, null);
$("devReadout").innerHTML = "";
$("armholeReadout").textContent = `${SPLIT.toFixed(2)}°`;
$("modeTag").innerHTML = `<b class="ok">FULL</b> — matches committed shell exactly`;

// neckline / skirt-fillet inputs, seeded from server state
if (state.neckline) {
  const n = state.neckline;
  $("nCf").value = n.cf_height; $("nPeak").value = n.peak_height;
  $("nSide").value = n.side_height; $("nCb").value = n.cb_height;
  $("nPeakTheta").value = n.peak_theta; $("nBow").value = n.rise_bow;
  $("nDecay").value = n.decay_rate; $("nCorner").checked = n.cf_corner;
}
if (state.skirt_fillet) {
  const sf = state.skirt_fillet;
  $("sHem").value = sf.hem_circumference; $("sDomeN").value = sf.dome_n;
  if (sf.fillet_radius != null) $("sFilletR").value = sf.fillet_radius;
  if (sf.fillet_type != null) $("sFilletType").value = sf.fillet_type;
}

function neckBody() {
  return { cf_height: parseFloat($("nCf").value), peak_height: parseFloat($("nPeak").value),
          side_height: parseFloat($("nSide").value), cb_height: parseFloat($("nCb").value),
          peak_theta: parseFloat($("nPeakTheta").value), rise_bow: parseFloat($("nBow").value),
          decay_rate: parseFloat($("nDecay").value), cf_corner: $("nCorner").checked };
}

function coarseUpdate() {
  const aFit = paneA.fit(), bFit = paneB.fit();
  const rep = monotonicityReport(aFit, V_HI);
  $("monoReadout").innerHTML = fmtMono(rep, "COARSE (live, client)");
  $("circTable").innerHTML = fmtCircTable(coarseCircumferenceReport(aFit, bFit, V_LO, V_HI), "COARSE (live)");
  const shell = new CoarseShell(aFit, bFit, V_LO, V_HI, SPLIT);
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
        b_points: paneB.points.map(p => [p.v, p.y]),
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
      `b max ${d.b_max.toFixed(2)} / rms ${d.b_rms.toFixed(2)} mm` +
      (data.inert_fields_ignored.length
        ? `<br><span class="warn">ignored (inert): ${data.inert_fields_ignored.join(", ")}</span>` : "");
    $("modeTag").innerHTML = `<b class="ok">FULL</b> — server-verified`;
    status("ready", "ok");
  } catch (e) {
    if (myGen !== reqGen) return;
    status(`server resolve failed: ${e}`, "err");
  }
}

$("applyBtn").onclick = fullUpdate;

$("saveBtn").onclick = async () => {
  $("saveStatus").innerHTML = "saving…";
  try {
    const r = await fetch("/api/shape", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        a_points: paneA.points.map(p => [p.v, p.y]),
        b_points: paneB.points.map(p => [p.v, p.y]),
        neckline: neckBody(),
        skirt_fillet: {
          hem_circumference: parseFloat($("sHem").value),
          dome_n: parseFloat($("sDomeN").value),
        },
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
       `${paneA.points.length} a(v) points, ${paneB.points.length} b(v) points (v fixed, drag value)`);
(function loop() {
  requestAnimationFrame(loop);
  controls.update();
  renderer.render(scene, camera);
})();
