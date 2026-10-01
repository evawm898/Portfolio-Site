/* bug.js — the /bug page. The panel is GENERATED from PARAM_SPEC / SECTIONS
   in bug-geometry.js (one declaration of every control); this file only draws
   it. The preview, the SVG inset and both downloads all read ONE model built
   by buildBug() — there is no second geometry path here. */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  PARAM_SPEC, SECTIONS, DEFAULTS, PRESETS, presetParams, randomParams,
  buildBug, exportStl, exportSvg, mirrorDiff,
} from './bug-geometry.js';

/* ---------------- state ---------------- */
let params = presetParams('butterfly');
let model = null;
let presetName = 'butterfly';

/* ---------------- three ---------------- */
const canvas = document.getElementById('bug-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0c);
const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 5000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = false;
scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a30, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(-1, 2, 1.5); scene.add(key);
const rim = new THREE.DirectionalLight(0x9fd0d0, 0.7); rim.position.set(1.5, -0.5, -1.5); scene.add(rim);

// The model is Z-up (x right, y = head). One rotation lays it into three's Y-up.
const root = new THREE.Group();
root.rotation.x = -Math.PI / 2;
scene.add(root);
const MAT = {
  body: new THREE.MeshStandardMaterial({ color: 0xedede8, roughness: 0.62, metalness: 0 }),
  wing: new THREE.MeshStandardMaterial({ color: 0xc9d8d6, roughness: 0.5, metalness: 0, flatShading: true, side: THREE.FrontSide }),
};
let viewName = 'three';

function partGeometry(kinds, flat) {
  const P = model.positions, I = model.indices;
  const parts = model.parts.filter((q) => kinds.includes(q.kind));
  const geoms = [];
  for (const q of parts) {
    const nv = q.v1 - q.v0;
    const pos = new Float32Array(3 * nv);
    for (let i = 0; i < 3 * nv; i++) pos[i] = P[3 * q.v0 + i];
    const idx = new Uint32Array(3 * (q.t1 - q.t0));
    for (let i = 0; i < idx.length; i++) idx[i] = I[3 * q.t0 + i] - q.v0;
    let g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    if (flat) g = g.toNonIndexed();
    g.computeVertexNormals();
    geoms.push(g);
  }
  return geoms;
}

function rebuildMesh() {
  for (const c of [...root.children]) { root.remove(c); c.geometry.dispose(); }
  for (const g of partGeometry(['body', 'leg', 'antenna'], false)) root.add(new THREE.Mesh(g, MAT.body));
  for (const g of partGeometry(['wing1', 'wing2', 'tail'], true)) root.add(new THREE.Mesh(g, MAT.wing));
}

function modelBox() {
  const P = model.positions;
  const b = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity };
  for (let i = 0; i < P.length; i += 3) {
    b.x0 = Math.min(b.x0, P[i]); b.x1 = Math.max(b.x1, P[i]);
    b.y0 = Math.min(b.y0, P[i + 1]); b.y1 = Math.max(b.y1, P[i + 1]);
    b.z0 = Math.min(b.z0, P[i + 2]); b.z1 = Math.max(b.z1, P[i + 2]);
  }
  return b;
}

/* Views are framed to the bug's own box: model (x, y, z) -> three (x, z, -y). */
function setView(name) {
  viewName = name;
  document.querySelectorAll('#viewButtons button').forEach((b) => b.classList.toggle('is-on', b.dataset.view === name));
  const b = modelBox();
  const c = new THREE.Vector3((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, -(b.y0 + b.y1) / 2);
  const r = 0.5 * Math.hypot(b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0);
  const d = r / Math.sin((camera.fov * Math.PI) / 360) * 1.05;
  const dirs = {
    three: new THREE.Vector3(0.62, 0.62, 0.48),   // 3/4: from front-right, above
    top: new THREE.Vector3(0, 1, 0.0001),
    front: new THREE.Vector3(0, 0.05, -1),
    side: new THREE.Vector3(1, 0.05, 0),
  };
  const dir = dirs[name].clone().normalize();
  camera.position.copy(c).addScaledVector(dir, d);
  camera.up.set(0, name === 'top' ? 0 : 1, name === 'top' ? -1 : 0);
  controls.target.copy(c);
  camera.near = d / 50; camera.far = d * 10; camera.updateProjectionMatrix();
  controls.update();
  render();
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  render();
}
function render() { renderer.render(scene, camera); }
controls.addEventListener('change', render);
window.addEventListener('resize', resize);

/* ---------------- panel (generated) ---------------- */
const host = document.getElementById('controls');
const secEl = {};
const ctrlEl = {};
for (const s of SECTIONS) {
  const d = document.createElement('details');
  d.className = 'bg-sec'; d.dataset.sec = s.id;
  if (s.open) d.open = true;
  d.innerHTML = `<summary>${s.label}</summary><div class="bg-sec-body"></div>`;
  (s.parent ? secEl[s.parent].querySelector('.bg-sec-body') : host).appendChild(d);
  secEl[s.id] = d;
}
const fmtVal = (s, v) => (s.kind === 'range' ? `${(+v).toFixed(s.step < 0.1 ? 2 : s.step < 1 ? 1 : 0)}${s.unit && s.unit !== '°' ? ' ' + s.unit : s.unit}` : '');
for (const s of PARAM_SPEC) {
  const w = document.createElement('div');
  w.className = 'bg-ctrl' + (s.kind === 'bool' ? ' bg-bool' : '');
  if (s.kind === 'range') {
    w.innerHTML = `<label for="${s.id}"><span>${s.label}</span><output id="${s.id}-out"></output></label><input type="range" id="${s.id}" min="${s.min}" max="${s.max}" step="${s.step}">`;
  } else if (s.kind === 'choice') {
    w.innerHTML = `<label for="${s.id}"><span>${s.label}</span></label><select id="${s.id}">${s.options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`;
  } else {
    w.innerHTML = `<label><input type="checkbox" id="${s.id}"> ${s.label}</label>`;
  }
  secEl[s.section].querySelector('.bg-sec-body').appendChild(w);
  ctrlEl[s.id] = w;
  const input = w.querySelector('input,select');
  input.addEventListener('input', () => {
    params[s.id] = s.kind === 'range' ? +input.value : s.kind === 'bool' ? input.checked : input.value;
    presetName = null; markPreset(); writeOutputs(); applyVisibility(); scheduleBuild();
  });
}

function writeControls() {
  for (const s of PARAM_SPEC) {
    const input = ctrlEl[s.id].querySelector('input,select');
    if (s.kind === 'bool') input.checked = !!params[s.id]; else input.value = params[s.id];
  }
  writeOutputs(); applyVisibility();
}
function writeOutputs() {
  for (const s of PARAM_SPEC) if (s.kind === 'range') document.getElementById(`${s.id}-out`).textContent = fmtVal(s, params[s.id]);
}
function applyVisibility() {
  for (const s of PARAM_SPEC) ctrlEl[s.id].hidden = !!(s.visibleWhen && !s.visibleWhen(params));
  // a section with nothing visible inside it is hidden too (children first)
  for (const s of [...SECTIONS].reverse()) {
    const d = secEl[s.id];
    const own = PARAM_SPEC.filter((p) => p.section === s.id).some((p) => !ctrlEl[p.id].hidden);
    const kids = SECTIONS.filter((c) => c.parent === s.id).some((c) => !secEl[c.id].hidden);
    d.hidden = !(own || kids);
  }
}

const presetHost = document.getElementById('presetButtons');
for (const name of Object.keys(PRESETS)) {
  const b = document.createElement('button');
  b.className = 'bg-btn'; b.textContent = name; b.dataset.preset = name;
  b.addEventListener('click', () => loadParams(presetParams(name), name));
  presetHost.appendChild(b);
}
function markPreset() { presetHost.querySelectorAll('button').forEach((b) => b.classList.toggle('is-on', b.dataset.preset === presetName)); }
let randomSeed = 1;
document.getElementById('randomBtn').addEventListener('click', () => loadParams(randomParams((Date.now() ^ (randomSeed++ * 2654435761)) >>> 0), null));
document.getElementById('resetBtn').addEventListener('click', () => loadParams({ ...DEFAULTS }, 'butterfly'));

function loadParams(p, name) {
  params = { ...DEFAULTS, ...p };
  presetName = name;
  markPreset(); writeControls(); buildNow(true);
}

/* ---------------- build ---------------- */
let pending = 0, idleTimer = 0;
const stats = { buildMs: 0, mirror: null, cutRegions: null };
function scheduleBuild() {
  if (pending) return;
  pending = requestAnimationFrame(() => { pending = 0; buildNow(false); });
}
function buildNow(reframe) {
  const t = performance.now();
  model = buildBug(params);
  stats.buildMs = performance.now() - t;
  stats.mirror = null;
  rebuildMesh();
  if (reframe) setView(viewName); else render();
  drawSvg(false);
  writeReadout();
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { stats.mirror = mirrorDiff(model); if (cutSafeEl.checked) drawSvg(true); writeReadout(); }, 350);
}

const cutSafeEl = document.getElementById('cutSafe');
cutSafeEl.addEventListener('change', () => { drawSvg(cutSafeEl.checked); writeReadout(); });
function drawSvg(withCut) {
  const cut = withCut && cutSafeEl.checked;
  const out = exportSvg(model, { cutSafe: cut });
  document.getElementById('svgCard').innerHTML = out.svg;
  if (cut) stats.cutRegions = out.regions;
  document.getElementById('svgNote').textContent = cutSafeEl.checked
    ? (cut ? `Cut-safe: the union of every part — ${out.regions} connected region${out.regions === 1 ? '' : 's'}.` : 'Cut-safe: computing the union…')
    : `${out.widthMm.toFixed(1)} × ${out.heightMm.toFixed(1)} mm. Tilt changes the solid; the SVG projects it from straight above.`;
}

function writeReadout() {
  const b = modelBox();
  const n = model.triangleCount;
  const m = stats.mirror === null ? 'checking…' : stats.mirror === 0 ? '0 (exact)' : `${stats.mirror} — NOT SYMMETRIC`;
  document.getElementById('readout').innerHTML =
    `triangles <b>${n.toLocaleString()}</b>   STL <b>${((84 + 50 * n) / 1024).toFixed(0)} KiB</b>\n`
    + `size <b>${(b.x1 - b.x0).toFixed(1)} × ${(b.y1 - b.y0).toFixed(1)} × ${(b.z1 - b.z0).toFixed(1)} mm</b> (w × l × h)\n`
    + `parts <b>${model.parts.length}</b> closed shells, overlapping\n`
    + `mirror diff <b>${m}</b>\n`
    + `min feature floor <b>${params.minDiameter.toFixed(2)} mm</b> (tubes, wing thickness)\n`
    + `build <b>${stats.buildMs.toFixed(0)} ms</b>`;
}

/* ---------------- exports ---------------- */
function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const stem = () => `bug-${presetName || 'custom'}`;
document.getElementById('exportStl').addEventListener('click', () => download(`${stem()}.stl`, exportStl(model), 'model/stl'));
document.getElementById('exportSvg').addEventListener('click', () => download(`${stem()}${cutSafeEl.checked ? '-cutsafe' : ''}.svg`, exportSvg(model, { cutSafe: cutSafeEl.checked }).svg, 'image/svg+xml'));
document.getElementById('viewButtons').addEventListener('click', (e) => { const v = e.target.dataset?.view; if (v) setView(v); });

/* ---------------- test chrome (read by tools/shot-bug-sheet.mjs) ---------------- */
window.__bug = {
  setParams: (p, name = null) => loadParams(p, name),
  getParams: () => ({ ...params }),
  setView: (v) => setView(v),
  svg: (cutSafe = false) => exportSvg(model, { cutSafe }),
  stl: () => Array.from(exportStl(model)),
  triangleCount: () => model.triangleCount,
  render,
};

resize();
loadParams(params, 'butterfly');
