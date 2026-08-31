/* ===================================================================
   bloom.js — Parametric Bloom app. Charter: docs/bloom-charter.md.

   The registry (bloom-registry.js) is the single source of truth: this file
   GENERATES the panel DOM from it and derives inputs, readUI, DEFAULTS,
   reset, labels, listeners and visibility from the same rows. There is no
   second list of controls anywhere, and applyVisibility() is the only thing
   that hides a control wrapper.
   =================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { CONTROLS, DEFAULTS, evalPredicate } from './bloom-registry.js';
import { MeshBuilder, buildBloomInto } from './bloom-geometry.js';

/* Cap the OUTPUT, never an input proxy (flower lesson: the parameter space
   has genuine cliffs no input-space guard can see). Measured against the
   export triangle count; export refuses above this. Phase-1 geometry peaks
   near 60k export tris at petalCount 40, so the cap is slack by design —
   it exists so the refusal path is real before it is ever needed. */
const EXPORT_TRI_BUDGET = 1_500_000;

/* ---------------- panel: generated from the registry ---------------- */
const panelRoot = document.getElementById('panelControls');
const inputs = {};   // id -> input element
const valSpans = {}; // id -> read-out span
const wrappers = {}; // id -> control wrapper div

for (const c of CONTROLS) {
  if (c.kind !== 'slider') throw new Error(`unhandled control kind "${c.kind}" for ${c.id}`);
  const wrap = document.createElement('div');
  wrap.className = 'bl-ctrl';
  const label = document.createElement('label');
  label.htmlFor = c.id;
  label.append(c.label);
  const val = document.createElement('span');
  val.className = 'bl-val';
  label.append(val);
  const input = document.createElement('input');
  input.type = 'range';
  input.id = c.id;
  input.min = c.min; input.max = c.max; input.step = c.step;
  input.value = c.default;
  wrap.append(label, input);
  panelRoot.append(wrap);
  inputs[c.id] = input; valSpans[c.id] = val; wrappers[c.id] = wrap;
}

function readUI() {
  const out = {};
  for (const c of CONTROLS) out[c.id] = Number(inputs[c.id].value);
  return out;
}
/* Harness hook: gates read the app's own state snapshot rather than keeping a
   second copy of readUI's coercion rules. */
window.__bloomUIState = () => readUI();

function refreshLabels(ui) {
  for (const c of CONTROLS) valSpans[c.id].textContent = c.fmt(ui[c.id]);
}

/* The ONLY setter of a control wrapper's hidden — evaluates the registry's
   predicate against one state snapshot, so every control is decided against
   the same state. */
function applyVisibility() {
  const ui = readUI();
  for (const c of CONTROLS) wrappers[c.id].hidden = !evalPredicate(c.visibleWhen, ui);
}

document.getElementById('resetBtn').addEventListener('click', () => {
  for (const c of CONTROLS) {
    inputs[c.id].value = DEFAULTS[c.id];
    inputs[c.id].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[c.id].dispatchEvent(new Event('change', { bubbles: true }));
  }
});

/* ---------------- scene ---------------- */
const canvas = document.getElementById('bloom-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0f0e);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.autoRotate = document.getElementById('autoRotate').checked;
controls.autoRotateSpeed = 1.2;
document.getElementById('autoRotate').addEventListener('change', (e) => {
  controls.autoRotate = e.target.checked;
});
let userMoved = false;
controls.addEventListener('start', () => { userMoved = true; });

scene.add(new THREE.HemisphereLight(0xdfefe6, 0x1a221e, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(60, 40, 90);
scene.add(key);

const material = new THREE.MeshStandardMaterial({ color: 0xc9dfd2, roughness: 0.62, metalness: 0.05 });
let mesh = null;

function fitCamera(radius) {
  const d = Math.max(40, radius * 2.6);
  camera.position.set(d * 0.75, -d * 0.75, d * 0.6);
  camera.up.set(0, 0, 1);
  controls.target.set(0, 0, radius * 0.15);
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ---------------- build ---------------- */
const readout = document.getElementById('readout');
let liveTris = 0;

function buildGeometry({ exportMode }) {
  const acc = new MeshBuilder({ exportMode });
  buildBloomInto(acc, readUI(), { below: null });   // 'stem' | 'branch' | null — null is phase 1's only state
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(acc.positions, 3));
  geo.computeVertexNormals();
  return { geo, acc };
}

function regenerate() {
  const ui = readUI();
  refreshLabels(ui);
  const { geo } = buildGeometry({ exportMode: false });
  if (mesh) { mesh.geometry.dispose(); mesh.geometry = geo; }
  else { mesh = new THREE.Mesh(geo, material); scene.add(mesh); }
  liveTris = geo.getAttribute('position').count / 3;
  if (!userMoved) {
    geo.computeBoundingSphere();
    fitCamera(geo.boundingSphere.radius);
  }
  readout.textContent = `petals ${ui.petalCount} · tris (live) ${liveTris.toLocaleString('en-US')}`;
}

/* rAF-coalesced rebuild: many input events per frame, one build. */
let regenQueued = false;
function scheduleRegen() {
  if (regenQueued) return;
  regenQueued = true;
  requestAnimationFrame(() => { regenQueued = false; regenerate(); });
}

for (const c of CONTROLS) {
  inputs[c.id].addEventListener('input', () => { applyVisibility(); scheduleRegen(); });
  inputs[c.id].addEventListener('change', () => { applyVisibility(); scheduleRegen(); });
}

/* ---------------- STL export ---------------- */
document.getElementById('exportStl').addEventListener('click', () => {
  const ui = readUI();
  const { geo, acc } = buildGeometry({ exportMode: true });
  const exportTris = geo.getAttribute('position').count / 3;
  if (exportTris > EXPORT_TRI_BUDGET) {
    geo.dispose();
    readout.innerHTML = `<span class="bl-err">export refused: ${exportTris.toLocaleString('en-US')} tris (export) exceeds the ${EXPORT_TRI_BUDGET.toLocaleString('en-US')} budget</span>`;
    return;
  }
  const stl = new STLExporter().parse(new THREE.Mesh(geo, material), { binary: true });
  geo.dispose();
  const blob = new Blob([stl], { type: 'model/stl' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bloom.stl';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  /* Both counts, both LABELLED — live and export modes are not convertible
     (the export floor changes geometry), so one word never covers both. */
  readout.textContent =
    `petals ${ui.petalCount} · tris (live) ${liveTris.toLocaleString('en-US')}\n` +
    `exported bloom.stl · tris (export) ${exportTris.toLocaleString('en-US')} · min sheet ${acc.minThickness.toFixed(2)} mm`;
});

/* ---------------- go ---------------- */
applyVisibility();
regenerate();
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
