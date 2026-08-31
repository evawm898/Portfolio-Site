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
import { CONTROLS, DEFAULTS, evalPredicate, coerceValue } from './bloom-registry.js';
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

function makeInput(c) {
  if (c.kind === 'slider') {
    const input = document.createElement('input');
    input.type = 'range';
    input.min = c.min; input.max = c.max; input.step = c.step;
    return input;
  }
  if (c.kind === 'choice') {
    const sel = document.createElement('select');
    for (const o of c.options) {
      const opt = document.createElement('option');
      opt.value = o.value; opt.textContent = o.label;
      sel.append(opt);
    }
    return sel;
  }
  throw new Error(`unhandled control kind "${c.kind}" for ${c.id}`);
}

for (const c of CONTROLS) {
  const wrap = document.createElement('div');
  wrap.className = 'bl-ctrl';
  const label = document.createElement('label');
  label.htmlFor = c.id;
  label.append(c.label);
  const val = document.createElement('span');
  val.className = 'bl-val';
  label.append(val);
  const input = makeInput(c);
  input.id = c.id;
  input.value = c.default;
  wrap.append(label, input);
  panelRoot.append(wrap);
  inputs[c.id] = input; valSpans[c.id] = val; wrappers[c.id] = wrap;
}

/* Coercion is the REGISTRY's rule, imported — not re-decided here. A slider
   is a number and a choice is a string; a local `Number(...)` would turn
   centerStyle into NaN, which reads back as a legitimate-looking value and is
   how a gate ends up measuring a design other than the one it names. */
function readUI() {
  const out = {};
  for (const c of CONTROLS) out[c.id] = coerceValue(c, inputs[c.id].value);
  return out;
}
/* Harness hook: gates read the app's own state snapshot rather than keeping a
   second copy of readUI's coercion rules. */
window.__bloomUIState = () => readUI();

/* Harness hooks for the contact sheet, same doctrine as body.bl-preview: the
   tool ASKS THE APP rather than recomputing. __bloomMetrics reports the live
   build's own numbers so a caption can never disagree with the model in the
   frame; __bloomFrame drives the app's own fitCamera so the centre zoom is
   the real camera at a different radius, not a crop guessing at projection.
   Assigned after the scene exists — see below. */

/* fmt receives the control's own value AND the whole state snapshot: Tip
   taper prints the DERIVED widest point a/(a+b), which needs the other
   taper. Every other fmt ignores the second argument. A control for the
   widest point would be a second owner of a derived quantity. */
function refreshLabels(ui) {
  for (const c of CONTROLS) valSpans[c.id].textContent = c.fmt(ui[c.id], ui);
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

/* THE ONE OWNER of "frame a sphere of this radius". The automatic fit and the
   contact sheet's centre zoom are the same operation at two radii, so they are
   the same function; a screenshot tool re-deriving the projection would be a
   second copy of the camera rule, which is this project's most repeated
   defect wearing a lens. `lift` raises the orbit target off the origin — the
   whole-bloom view looks slightly up into the whorl, a centre crop looks
   straight at the hub plane. */
function fitCamera(radius, lift = 0.15, at = null, dir = null) {
  /* The axis-framing path is byte-for-byte the original: a single-petal crop
     is a NEW capability, and widening a signature must never move the shot
     every existing sheet was taken with. The 40 mm distance floor belongs to
     that path only — it keeps a tiny bloom from being framed absurdly close,
     and it would otherwise stop a petal crop ever getting close enough to
     read an outline. */
  if (!at) {
    const d = Math.max(40, radius * 2.6);
    camera.position.set(d * 0.75, -d * 0.75, d * 0.6);
    camera.up.set(0, 0, 1);
    controls.target.set(0, 0, radius * lift);
    return;
  }
  /* Targeted framing, optionally along a given view direction. A SILHOUETTE
     is an outline, and an outline seen at three-quarters is foreshortened —
     so the silhouette sheet asks to look down the petal's own normal, which
     the builder reports. The direction is normalised here so `radius` means
     the same distance whichever way the camera is pointing. */
  const d = radius * 2.6;
  const v = dir || [0.75, -0.75, 0.6];
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  camera.position.set(at[0] + (v[0] / n) * d, at[1] + (v[1] / n) * d, at[2] + (v[2] / n) * d);
  camera.up.set(0, 0, 1);
  controls.target.set(at[0], at[1], at[2]);
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
let liveSummary = '';

let lastRing = { radius: 0, derivedRadius: 0 };
let lastCenter = { style: 'NONE', tris: 0 };
let lastPetal = null;
let lastTris = 0, lastMaxDim = 0, lastFitRadius = 0;

/* THE NON-SHIPPING PETAL-MODEL OVERRIDE. null in every reachable state:
   there is no registry row, no DOM input, and no listener that writes it —
   window.__bloomCapability (below) is the only writer, and only the gates
   and the contact sheet call it. It exists so "architected for claw and
   cleft" is a thing the gates BUILD and MEASURE rather than a sentence in a
   header. Because it is not a control, the gates' whole-state read-back is
   unaffected: their fullStateDrift still compares every registry control
   against DEFAULTS + set, and this is invisible to it — which is why the
   capability rows carry their OWN read-back assertion. */
let capability = null;

function buildGeometry({ exportMode }) {
  const acc = new MeshBuilder({ exportMode });
  const built = buildBloomInto(acc, readUI(), { below: null, capability });   // 'stem' | 'branch' | null — null is phase 1's only state
  if (!exportMode) { lastRing = built.ring; lastCenter = built.center; lastPetal = built.petal; lastTris = acc.triangleCount; lastMaxDim = acc.maxDimensionMm; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(acc.positions, 3));
  geo.computeVertexNormals();
  return { geo, acc };
}

/* The readout's one-line summary. Every number carries its MODE, because live
   and export are different geometry and not convertible.

   MAX DIM is reported, never enforced. Reachable states cross process caps —
   dyed PA12 tops out near 180 mm on the shortest axis, standard white goes
   much larger, and SLS nests in any orientation so the only question is
   whether the box fits. Which cap applies is the user's call at order time,
   so this is a number at the slider, not a clamp and not a refusal. (The one
   thing this generator DOES refuse is triangle count, because that is a
   property of the file rather than of somebody's process.) */
function summarise(ui, acc, mode) {
  const tris = acc.triangleCount.toLocaleString('en-US');
  const dim = acc.maxDimensionMm.toFixed(1);
  /* The capability appears in the readout for the same reason every other
     value does: the contact sheet and the gates assert the app REACTED
     through the real UI route, and a state they cannot see in the readout is
     a state they cannot confirm was built. */
  return `petals ${ui.petalCount} · spread ${Number(ui.spread).toFixed(2)}x · center ${ui.centerStyle.toLowerCase()}`
       + (capability ? ` · capability ${capability.label}` : '') + `\n`
       + `tris (${mode}) ${tris} · max dim (${mode}) ${dim} mm`;
}

function regenerate() {
  const ui = readUI();
  refreshLabels(ui);
  const { geo, acc } = buildGeometry({ exportMode: false });
  if (mesh) { mesh.geometry.dispose(); mesh.geometry = geo; }
  else { mesh = new THREE.Mesh(geo, material); scene.add(mesh); }
  /* The bounding SPHERE is the framing quantity (the accumulator's bounding
     BOX is the print-size quantity — two different jobs, kept apart). It is
     computed on every rebuild, not only when the camera is free, so a shot
     tool can ASK the app for the radius its own automatic fit would use
     instead of inventing a proxy from the bounding box. */
  geo.computeBoundingSphere();
  lastFitRadius = geo.boundingSphere.radius;
  if (!userMoved) fitCamera(lastFitRadius);
  liveSummary = summarise(ui, acc, 'live');
  readout.textContent = liveSummary;
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
  const exportTris = acc.triangleCount;   // the accumulator owns the count, in both modes
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
  readout.textContent = `${liveSummary}\n`
    + `exported bloom.stl · ${summarise(ui, acc, 'export').split('\n')[1]} · min sheet ${acc.minThickness.toFixed(2)} mm`;
});

/* Contact-sheet hooks (see the note beside __bloomUIState). __bloomFrame sets
   userMoved so the next rebuild's automatic refit does not silently undo the
   framing the tool just asked for — a screenshot of a camera that moved back
   is exactly the class of instrument error that padded the flower's pixel
   diffs for months. */
window.__bloomMetrics = () => ({
  ringRadius: lastRing.radius,
  derivedRadius: lastRing.derivedRadius,
  centerStyle: lastCenter.style,
  centerTris: lastCenter.tris,
  liveTris: lastTris,
  maxDimMm: lastMaxDim,
  fitRadius: lastFitRadius,
  capability: capability ? capability.label : null,
  /* THE PETAL'S OWN MEASUREMENTS, from the builder that made it. The
     capability assertions and the single-petal framing read these rather
     than re-deriving a profile or a projection — a consumer inventing its
     own copy of a boundary is this project's most repeated defect.

     SCOPE, stated here and repeated in the gates' own output: `profile` and
     `tipSpans` are the APP'S evaluation of the width profile and the trim
     domain, not a measurement of the exported STL. Watertightness and
     connectedness are measured on the export; the structural claims are
     measured here. */
  petalProfile: lastPetal ? lastPetal.profile : null,
  petalFootRows: lastPetal ? lastPetal.footRows : null,
  petalPanels: lastPetal ? lastPetal.panels : null,
  petalTipSpans: lastPetal ? lastPetal.tipSpans : null,
  petalMid: lastPetal ? lastPetal.mid : null,
  petalTip: lastPetal ? lastPetal.tip : null,
  petalNormal: lastPetal ? lastPetal.normal : null,
});
window.__bloomFrame = (radius, lift = 0.15, at = null, dir = null) => { userMoved = true; fitCamera(radius, lift, at, dir); };

/* THE ONLY WRITER of `capability`. Rebuilds synchronously rather than
   through the rAF coalescer so a caller can read __bloomMetrics back on the
   next line and get the design it just asked for. Pass null to clear. */
window.__bloomCapability = (spec) => { capability = spec || null; regenerate(); return capability; };

/* ---------------- go ---------------- */
applyVisibility();
regenerate();
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
