// Shape editor — milestone 3 vertical slice. a(v) only: drag a control
// point, the 3D shell regenerates, readouts update. Two speeds, always
// labeled (see the dress-shell skill's live-readout requirement):
//   COARSE — this file's own geom.js port, every pointermove, no network.
//   FULL   — POST /api/curve to shape_editor_server.py on pointerup only,
//            the real scipy PCHIP + ShellModel + build_meshes.
// Separate page from the placement editor on purpose (milestone 3 !=
// milestone 2): own server, own state, does not touch layout.yaml.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { pchipFit, CoarseShell, monotonicityReport } from "/geom.js";

const $ = (id) => document.getElementById(id);
const status = (msg, cls = "") => { $("status").innerHTML = `<span class="${cls}">${msg}</span>`; };

const state = await (await fetch("/api/state")).json();
const V_LO = state.domain.v_lo, V_HI = state.domain.v_hi;
const SPLIT = state.bounds.split_theta;

// authored control points: [v, a_mm], v FIXED (only a drags) — this slice
// deliberately doesn't support adding/removing/moving points horizontally;
// that's part of "the rest", gated on this loop first
let points = state.seed_points.map(([v, a]) => ({ v, a }));
const defaultA = new Map(state.default_a_table.z.map((z, i) => [z, state.default_a_table.a[i]]));

// ---------------------------------------------------------------- 2D curve pane
const canvas = $("curveCanvas");
const ctx = canvas.getContext("2d");
const PAD = 20, CX = canvas.width / 2;
const A_MAX = Math.max(...points.map(p => p.a), ...state.default_a_table.a) * 1.15;
const pxPerMm = (canvas.height - 2 * PAD) / (V_HI - V_LO);
const mmPerPxA = A_MAX / (CX - PAD);
const yOf = (v) => canvas.height - PAD - (v - V_LO) * pxPerMm;   // v_hi at top
const vOf = (y) => V_LO + (canvas.height - PAD - y) / pxPerMm;
const xOf = (a, side) => CX + side * a / mmPerPxA;

function curveFit(pts) {
  const sorted = [...pts].sort((a, b) => a.v - b.v);
  return pchipFit(sorted.map(p => p.v), sorted.map(p => p.a));
}

function drawCurve(fit, color, dashed) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash(dashed ? [4, 3] : []);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    for (let y = PAD; y <= canvas.height - PAD; y++) {
      const v = vOf(y), a = fit(v);
      const x = xOf(a, side);
      if (y === PAD) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function redrawCurve(fit) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // landmark lines: waist (v=0), bust apex (v=181, if in range)
  ctx.strokeStyle = "#d98a35"; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
  for (const v of [0, 181]) {
    if (v < V_LO || v > V_HI) continue;
    const y = yOf(v);
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(canvas.width - PAD, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#2a2f2f"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(CX, PAD); ctx.lineTo(CX, canvas.height - PAD); ctx.stroke();

  const defFit = (v) => {
    const zs = state.default_a_table.z, as = state.default_a_table.a;
    let lo = 0, hi = zs.length - 1;
    if (v <= zs[0]) return as[0];
    if (v >= zs[hi]) return as[hi];
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (zs[m] <= v) lo = m; else hi = m; }
    const t = (v - zs[lo]) / (zs[hi] - zs[lo]);
    return as[lo] + t * (as[hi] - as[lo]);
  };
  drawCurve(defFit, "#4a5252", true);
  drawCurve(fit, "#2fa3a3", false);

  for (const p of points) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(xOf(p.a, side), yOf(p.v), side === dragSide && p === dragPoint ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = p === dragPoint ? "#e9ecec" : "#2fa3a3";
      ctx.fill();
    }
  }
}

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
setMeshes(state.mesh, 0xc9cfcc);   // initial: the real committed mesh, exact

// ---------------------------------------------------------------- readouts
function fmtReadout(r, label, cls) {
  const ok = r.non_increasing_waist_to_neckline;
  return `<b>${label}</b> — a(v) monotone waist→neckline: ` +
    (ok ? '<span class="ok">yes</span>'
        : `<span class="warn">no</span> — worst +${r.worst_positive_slope_mm_per_mm.toFixed(3)} mm/mm ` +
          `at v≈${r.worst_at_v.toFixed(0)}`);
}
$("coarseReadout").innerHTML = fmtReadout(state.readout, "FULL (initial, server)");
$("fullReadout").innerHTML = "";
$("modeTag").innerHTML = `<b class="ok">FULL</b> — matches committed shell exactly`;

let dragPoint = null, dragSide = 1, dragging = false;

function pickPoint(mx, my) {
  for (const p of points) {
    for (const side of [-1, 1]) {
      const dx = mx - xOf(p.a, side), dy = my - yOf(p.v);
      if (dx * dx + dy * dy < 8 * 8) return { p, side };
    }
  }
  return null;
}

let coarseTimer = null;
function coarseUpdate() {
  const fit = curveFit(points);
  redrawCurve(fit);
  const rep = monotonicityReport(fit, V_HI);
  $("coarseReadout").innerHTML = fmtReadout(rep, "COARSE (live, client)");
  const shell = new CoarseShell(fit, state.b_table, SPLIT);
  setMeshes(shell.buildMeshes(), 0x3d9a9e);
  $("modeTag").innerHTML = `<b class="warn">COARSE</b> — client preview, low-res, not authoritative`;
}

async function fullUpdate() {
  status("resolving on server (full)…");
  try {
    const r = await fetch("/api/curve", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: points.map(p => [p.v, p.a]) }) });
    const data = await r.json();
    if (!r.ok) { status(`server: ${data.error}`, "err"); return; }
    setMeshes(data.mesh, 0xc9cfcc);
    $("fullReadout").innerHTML = fmtReadout(data.readout, "FULL (server-verified)") +
      `<br><span class="kv" style="padding:0">deviation from committed a(v) at control points: ` +
      `max ${data.deviation_from_committed_mm.max.toFixed(2)} mm, ` +
      `rms ${data.deviation_from_committed_mm.rms.toFixed(2)} mm</span>`;
    $("modeTag").innerHTML = `<b class="ok">FULL</b> — server-verified`;
    status("ready", "ok");
  } catch (e) {
    status(`server resolve failed: ${e}`, "err");
  }
}

canvas.addEventListener("pointerdown", (ev) => {
  const rect = canvas.getBoundingClientRect();
  const mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
  const hit = pickPoint(mx, my);
  if (!hit) return;
  dragPoint = hit.p; dragSide = hit.side; dragging = true;
  canvas.setPointerCapture(ev.pointerId);
});
canvas.addEventListener("pointermove", (ev) => {
  const rect = canvas.getBoundingClientRect();
  const mx = ev.clientX - rect.left;
  if (dragging && dragPoint) {
    const a = Math.max(15, Math.min(A_MAX, dragSide * (mx - CX) * mmPerPxA));
    dragPoint.a = a;
    clearTimeout(coarseTimer);
    coarseUpdate();   // every frame — no debounce, this IS the live pass
    return;
  }
  const hit = pickPoint(mx, ev.clientY - rect.top);
  canvas.style.cursor = hit ? "grab" : "default";
});
addEventListener("pointerup", () => {
  if (!dragging) return;
  dragging = false;
  fullUpdate();
});

redrawCurve(curveFit(points));
status(`ready — v ∈ [${V_LO.toFixed(0)}, ${V_HI.toFixed(0)}] mm · ${points.length} control points (v fixed, drag a)`);
(function loop() {
  requestAnimationFrame(loop);
  controls.update();
  renderer.render(scene, camera);
})();
