/* bug.js — the /bug page. The panel is GENERATED from PARAM_SPEC / SECTIONS /
   WING_FIELDS in bug-geometry.js (one declaration of every control); this file
   only draws it. The preview, the SVG inset, both downloads and the wing-outline
   editor all read ONE model built by buildBug() — there is no second geometry
   path here. The editor's drag / add / delete go through the geometry module's
   own moveControlPoint / insertControlPoint / deleteControlPoint, which BLOCK
   any edit that would make the outline cross or pinch itself. */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  PARAM_SPEC, SECTIONS, WING_FIELDS, defaultParams, randomParams, normalizeParams,
  buildBug, exportStl, exportSvg, mirrorDiff, sampleOutline, resolveWingPairs,
  moveControlPoint, insertControlPoint, deleteControlPoint, controlPointsFromDense,
  designFromParams, paramsFromDesign, MAX_WING_PAIRS,
  composeOutline, moveComposed, insertComposed, deleteComposed, FloorError, specimenPose,
  editorFrame, contourLoops, CR_SAMPLES,
} from './bug-geometry.js';

/* ---------------- state ---------------- */
let params = defaultParams();
let model = null;
let editPair = 0;                 // which wing pair the editor and the pair sliders show
let selectedPoint = -1;
let designName = '';

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
let viewName = 'top';               // the page opens looking straight down (edges pass, §10)
const WING_KINDS = ['tail', ...Array.from({ length: MAX_WING_PAIRS }, (_, k) => `wing${k + 1}`), 'vein'];   // 'vein': Phase 2 ridge strips and stigma plates

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

// A pair whose drawn outline is narrower than the floor shows red in the VIEW
// too, whichever pair the editor has open: its wings take a red tint and the
// narrow runs (model.wingPairs[k].thinSegments, the builder's own) are drawn
// on top. Both are view chrome — nothing here reaches either export.
MAT.thinWing = new THREE.MeshStandardMaterial({ color: 0xe0a3a3, roughness: 0.5, metalness: 0, flatShading: true, side: THREE.FrontSide });
MAT.wingSmooth = new THREE.MeshStandardMaterial({ color: 0xc9d8d6, roughness: 0.5, metalness: 0, side: THREE.FrontSide });
MAT.thinWingSmooth = new THREE.MeshStandardMaterial({ color: 0xe0a3a3, roughness: 0.5, metalness: 0, side: THREE.FrontSide });
MAT.thinLine = new THREE.LineBasicMaterial({ color: 0xe5484d, depthTest: false, transparent: true });
function rebuildMesh() {
  for (const c of [...root.children]) { root.remove(c); c.geometry.dispose(); }
  for (const g of partGeometry(['body', 'leg', 'antenna'], false)) root.add(new THREE.Mesh(g, MAT.body));
  const thinKinds = new Set(model.floorViolations.filter((v) => v.kind !== 'vein').map((v) => `wing${v.pair + 1}`));
  const thinVeinPairs = new Set(model.floorViolations.filter((v) => v.kind === 'vein').map((v) => v.pair));
  for (const kind of WING_KINDS) {
    const parts = model.parts.filter((q) => q.kind === kind);
    parts.forEach((q, i) => {
      // a rounded edge is drawn SMOOTH (its bead is tangent to the skins, so
      // vertex normals are honest); a square-walled slab keeps flat facets
      const g = partGeometry([kind], !(params.wingEdgeRound > 0))[i];
      const red = kind === 'vein' ? thinVeinPairs.has(q.meta.pair) : thinKinds.has(kind);
      const smooth = params.wingEdgeRound > 0;
      root.add(new THREE.Mesh(g, red ? (smooth ? MAT.thinWingSmooth : MAT.thinWing) : smooth ? MAT.wingSmooth : MAT.wing));
    });
  }
  const seg = model.wingPairs.flatMap((w) => w.thinSegments || []);
  if (seg.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(seg.flat()), 3));
    const lines = new THREE.LineSegments(g, MAT.thinLine); lines.renderOrder = 10;
    root.add(lines);
  }
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
  // the Render / SVG toggle belongs to the TOP view only; leaving it ends an edit
  document.getElementById('viewToggle').hidden = name !== 'top';
  if (name !== 'top' && editing) { editing = false; selectedPoint = -1; edStatus = ''; viewModel = model; }
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
  drawMain();
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // centre the picture in the space LEFT of the control panel, not under it
  if (w > 760) camera.setViewOffset(w, h, 164, 0, w, h); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  render();
  if (model) { vbox = null; drawMain(); }
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
function makeCtrl(s, id, onInput) {
  const w = document.createElement('div');
  w.className = 'bg-ctrl' + (s.kind === 'bool' ? ' bg-bool' : '');
  if (s.kind === 'range') {
    w.innerHTML = `<label for="${id}"><span>${s.label}</span><output id="${id}-out"></output></label><input type="range" id="${id}" min="${s.min}" max="${s.max}" step="${s.step}">`;
  } else if (s.kind === 'choice') {
    w.innerHTML = `<label for="${id}"><span>${s.label}</span></label><select id="${id}">${s.options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`;
  } else {
    w.innerHTML = `<label><input type="checkbox" id="${id}"> ${s.label}</label>`;
  }
  const input = w.querySelector('input,select');
  input.addEventListener('input', () => onInput(s.kind === 'range' ? +input.value : s.kind === 'bool' ? input.checked : input.value));
  return w;
}
for (const s of PARAM_SPEC) {
  const w = makeCtrl(s, s.id, (v) => {
    params[s.id] = v;
    if (s.id === 'wingPairs') editPair = Math.min(editPair, Math.max(0, v - 1));
    writeOutputs(); applyVisibility(); drawPairUi(); scheduleBuild();   // drawPairUi re-reads each pair field's visibleWhen(spec, params)
  });
  const body = secEl[s.section].querySelector('.bg-sec-body');
  // the per-pair block sits right after the Pairs slider, before the tail section
  if (s.section === 'wings') body.insertBefore(w, body.querySelector('details'));
  else body.appendChild(w);
  ctrlEl[s.id] = w;
}

/* The per-pair block: tabs, link state, and WING_FIELDS for the selected pair. */
const pairBlock = document.createElement('div');
pairBlock.className = 'bg-pairs';
pairBlock.innerHTML = `<div class="bg-row bg-tabs" id="pairTabs"></div><p class="bg-note" id="pairNote"></p>
  <div class="bg-row" id="linkRow"><button class="bg-btn" id="linkBtn"></button></div>
  <div class="bg-ctrl bg-bool" id="tailRow"><label><input type="checkbox" id="tailToggle"> Tail — part of this outline (bottom pair only)</label></div>
  <div id="pairFields"></div>`;
secEl.wings.querySelector('.bg-sec-body').insertBefore(pairBlock, secEl.wings.querySelector('.bg-sec-body details'));
const pairFieldEl = {};
for (const f of WING_FIELDS) {
  const w = makeCtrl(f, `wf-${f.id}`, (v) => {
    const spec = editableSpec(editPair);
    if (!spec) return;
    spec[f.id] = v; writePairFields(); scheduleBuild();
  });
  pairBlock.querySelector('#pairFields').appendChild(w);
  pairFieldEl[f.id] = w;
}

function roleOf(k) { const N = params.wingPairs; return k === 0 ? 'first' : k === N - 1 ? 'last' : 'mid'; }
/* The stored spec a pair edits, or null if the pair is LINKED (interpolated). */
function editableSpec(k) {
  const role = roleOf(k);
  if (role !== 'mid') return params.wings[role];
  return params.wings.unlinked[k] || null;
}
function resolvedPair(k) { return resolveWingPairs(params)[k]; }

function drawPairUi() {
  const N = params.wingPairs;
  const tabs = document.getElementById('pairTabs');
  tabs.innerHTML = '';
  pairBlock.hidden = N === 0;
  if (N === 0) return;
  editPair = Math.min(editPair, N - 1);
  for (let k = 0; k < N; k++) {
    const b = document.createElement('button');
    const role = roleOf(k);
    const linked = role === 'mid' && !params.wings.unlinked[k];
    b.className = 'bg-btn' + (k === editPair ? ' is-on' : '') + (linked ? ' bg-linked' : '');
    b.textContent = N === 1 ? 'pair 1' : `${k + 1} ${role === 'first' ? 'first' : role === 'last' ? 'last' : linked ? 'linked' : 'drawn'}`;
    b.addEventListener('click', () => { if (editing) startEditing(k); else { editPair = k; selectedPoint = -1; drawPairUi(); drawMain(); } });
    tabs.appendChild(b);
  }
  const role = roleOf(editPair);
  const linked = role === 'mid' && !params.wings.unlinked[editPair];
  const note = document.getElementById('pairNote');
  const lb = document.getElementById('linkBtn');
  document.getElementById('linkRow').hidden = role !== 'mid';
  // TAIL: only on the BOTTOM pair (the last, or the only pair of one)
  document.getElementById('tailRow').hidden = editPair !== N - 1;
  document.getElementById('tailToggle').checked = !!params.wings.tail.on;
  if (N === 1) note.textContent = 'One pair: draw it in the outline editor.';
  else if (role === 'mid') {
    note.textContent = linked
      ? `Pair ${editPair + 1} is LINKED: its outline and every value below interpolate between the first and last pair (${(editPair / (N - 1)).toFixed(2)} of the way). Unlink to draw it by hand.`
      : `Pair ${editPair + 1} is UNLINKED: drawn by hand. Relink to interpolate it again (its drawing is discarded).`;
    lb.textContent = linked ? 'Unlink this pair' : 'Relink (interpolate)';
  } else note.textContent = `The ${role} pair is always drawn by hand; pairs between it and the ${role === 'first' ? 'last' : 'first'} interpolate unless unlinked.`;
  writePairFields();
}
document.getElementById('tailToggle').addEventListener('input', (e) => {
  // OFF drops exactly the tail group from the drawn outline; ON brings back the
  // group as last edited (it is stored, never deleted) — see composeOutline.
  params.wings.tail.on = e.target.checked;
  selectedPoint = -1; edStatus = ''; drawPairUi(); drawMain(); scheduleBuild();
});
/* Unlink a middle pair: it starts from exactly what was on screen — its
   interpolated values and curve — and is drawn by hand from then on. */
function unlinkPair(k) {
  if (params.wings.unlinked[k]) return;
  const r = resolvedPair(k);
  const K = Math.max(params.wings.first.points.length, params.wings.last.points.length);
  const spec = {}; for (const f of WING_FIELDS) spec[f.id] = r[f.id];
  spec.points = controlPointsFromDense(r.dense, K);
  params.wings.unlinked[k] = spec;
}
document.getElementById('linkBtn').addEventListener('click', () => {
  const k = editPair;
  if (params.wings.unlinked[k]) delete params.wings.unlinked[k];
  else unlinkPair(k);
  selectedPoint = -1; drawPairUi(); drawMain(); scheduleBuild();
});

function writePairFields() {
  if (!params.wingPairs) return;
  const own = editableSpec(editPair);
  const shown = own || resolvedPair(editPair);
  for (const f of WING_FIELDS) {
    const w = pairFieldEl[f.id], input = w.querySelector('input');
    input.value = shown[f.id]; input.disabled = !own;
    document.getElementById(`wf-${f.id}-out`).textContent = fmtVal(f, shown[f.id]);
    w.hidden = !!(f.visibleWhen && !f.visibleWhen(shown, params));
    w.classList.toggle('is-linked', !own);
  }
}

function writeControls() {
  for (const s of PARAM_SPEC) {
    const input = ctrlEl[s.id].querySelector('input,select');
    if (s.kind === 'bool') input.checked = !!params[s.id]; else input.value = params[s.id];
  }
  writeOutputs(); applyVisibility(); drawPairUi();
}
function writeOutputs() {
  for (const s of PARAM_SPEC) if (s.kind === 'range') document.getElementById(`${s.id}-out`).textContent = fmtVal(s, params[s.id]);
}
function applyVisibility() {
  for (const s of PARAM_SPEC) ctrlEl[s.id].hidden = !!(s.visibleWhen && !s.visibleWhen(params));
  for (const s of [...SECTIONS].reverse()) {
    const d = secEl[s.id];
    const own = PARAM_SPEC.filter((p) => p.section === s.id).some((p) => !ctrlEl[p.id].hidden);
    const kids = SECTIONS.filter((c) => c.parent === s.id).some((c) => !secEl[c.id].hidden);
    d.hidden = !(own || kids);
  }
}

/* ---------------- randomize / reset / designs ---------------- */
let randomSeed = 1;
document.getElementById('randomBtn').addEventListener('click', () => { designName = ''; loadParams(randomParams((Date.now() ^ (randomSeed++ * 2654435761)) >>> 0)); });
document.getElementById('resetBtn').addEventListener('click', () => { designName = ''; loadParams(defaultParams()); });
/* SET SPECIMEN: one click writes the pose's slider values (forewing sweep from
   its own inner margin, every wing flat, legs tucked, antennae a V) and
   rebuilds; every value stays editable after. The pair being edited is kept. */
function setSpecimen() {
  const r = specimenPose(params), k = editPair;
  loadParams(r.params); editPair = Math.min(k, Math.max(0, params.wingPairs - 1)); drawPairUi(); drawMain();
  designMsg(r.notes.length ? `Specimen set, with notes: ${r.notes.join('; ')}.` : 'Specimen set: forewings square to the body, wings flat, legs tucked, antennae in a V. Adjust any slider after.', r.notes.length > 0);
  return r;
}
document.getElementById('specimenBtn').addEventListener('click', setSpecimen);

function loadParams(p) {
  params = normalizeParams(p);
  editPair = 0; selectedPoint = -1; editing = false; edStatus = ''; vbox = null;
  writeControls(); buildNow(true);
}

const STORE = 'parametric-bug-designs-v1';
const readStore = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; } };
const writeStore = (o) => { try { localStorage.setItem(STORE, JSON.stringify(o)); return true; } catch { return false; } };
const designMsg = (t, bad = false) => { const e = document.getElementById('designMsg'); e.textContent = t; e.classList.toggle('is-bad', bad); };
function refreshDesignList() {
  const sel = document.getElementById('designList');
  const names = Object.keys(readStore()).sort();
  sel.innerHTML = names.length ? names.map((n) => `<option>${n.replace(/</g, '&lt;')}</option>`).join('') : '<option value="">— no saved designs —</option>';
}
document.getElementById('saveDesign').addEventListener('click', () => {
  const name = document.getElementById('designName').value.trim();
  if (!name) return designMsg('Name the design first.', true);
  const st = readStore(); st[name] = designFromParams(params, name);
  if (!writeStore(st)) return designMsg('Could not save — browser storage is unavailable or full. Use Export file.', true);
  designName = name; refreshDesignList(); document.getElementById('designList').value = name;
  designMsg(`Saved “${name}” in this browser.`);
});
function applyDesign(doc, from) {
  const r = paramsFromDesign(doc);
  if (!r.ok) return designMsg(`Not loaded: ${r.reason}.`, true);
  designName = doc.name || '';
  document.getElementById('designName').value = designName;
  loadParams(r.params);
  designMsg(r.notes.length ? `Loaded ${from} with notes: ${r.notes.join('; ')}.` : `Loaded ${from}.`, r.notes.length > 0);
}
document.getElementById('loadDesign').addEventListener('click', () => {
  const name = document.getElementById('designList').value; const doc = readStore()[name];
  if (!doc) return designMsg('Nothing to load.', true);
  applyDesign(doc, `“${name}”`);
});
document.getElementById('deleteDesign').addEventListener('click', () => {
  const name = document.getElementById('designList').value; const st = readStore();
  if (!st[name]) return;
  delete st[name]; writeStore(st); refreshDesignList(); designMsg(`Deleted “${name}”.`);
});
document.getElementById('exportDesign').addEventListener('click', () => {
  const name = document.getElementById('designName').value.trim() || designName || 'bug-design';
  download(`${name.replace(/[^\w-]+/g, '-')}.bug.json`, JSON.stringify(designFromParams(params, name), null, 1), 'application/json');
});
document.getElementById('importDesign').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try { applyDesign(JSON.parse(await f.text()), `“${f.name}”`); } catch { designMsg('Not loaded: the file is not JSON.', true); }
});

/* ---------------- the on-wing outline editor (edges pass, §10) ---------------- */
/* In the TOP view the main viewport can show the SVG projection — exactly what
   Get SVG exports — instead of the 3D render. There, a click on a wing selects
   its pair for editing and the outline editor is drawn ON that wing: the RIGHT
   wing's control points, edited in place; the left wing is the model's mirror
   (its curve is drawn mirrored live while the model rebuilds). While a pair is
   edited it is DISPLAYED FLAT (buildBug's flatPair — dihedral and pitch 0 for
   the picture only), so a screen drag maps exactly onto its outline through
   editorFrame(); the parameters never change from this, and both exports are
   built from the real, tilted model. Drag / add / delete go through the
   geometry module's own move / insert / delete (tail-aware on the bottom
   pair), which BLOCK an edit that would make the outline cross or pinch. */
const stage = document.getElementById('svgStage'), msvg = document.getElementById('mainSvg');
const edBar = document.getElementById('edBar');
const backdrop = { href: null, opacity: 0.6, scale: 1, dx: 0, dy: 0, w: 0, h: 0, cx: 0, cy: 0, aspect: 1 };
let mainMode = 'render';          // 'render' | 'svg' — the TOP view's main viewport
let editing = false;              // a pair is being edited on the wing (svg mode only)
let edStatus = '';
let viewModel = null;             // what the SVG view shows: the model, or (editing a tilted pair) its flat display twin
let vbox = null;                  // the SVG view's frame in world mm {x0, y0, x1, y1}: held while editing so the picture does not jump
const NS = 'http://www.w3.org/2000/svg';
const svgMode = () => viewName === 'top' && mainMode === 'svg';
const isBottom = () => editPair === params.wingPairs - 1;
function shownOutline() {
  const own = editableSpec(editPair);
  if (!own) return null;
  return composeOutline(own.points, isBottom() ? params.wings.tail : null);
}
const editedIsTilted = () => { const r = params.wingPairs ? resolvedPair(editPair) : null; return !!(r && (r.dihedral || r.pitch)); };
/* world mm <-> the view's own units (mm, y down) */
const toV = (x, y) => [x - vbox.x0, vbox.y1 - y];
const fromV = (X, Y) => [X + vbox.x0, vbox.y1 - Y];
function screenToWorld(ev) {
  const pt = msvg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
  const q = pt.matrixTransform(msvg.getScreenCTM().inverse());
  return fromV(q.x, q.y);
}
function worldToScreen(x, y) {
  const pt = msvg.createSVGPoint(); [pt.x, pt.y] = toV(x, y);
  const q = pt.matrixTransform(msvg.getScreenCTM());
  return [q.x, q.y];
}
const pxPerMm = () => { const m = msvg.getScreenCTM(); return m ? Math.hypot(m.a, m.b) : 1; };
/* The view's frame: the model's projected box with a margin, fitted into the
   free area left of the control panel. Recomputed when not editing; frozen
   while a pair is edited, so the point under the pointer stays put. */
function fitBox(m, keep) {
  const P = m.positions; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < P.length; i += 3) { x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); }
  const pad = 0.12 * Math.max(x1 - x0, y1 - y0, 10);
  const b = { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
  // while a pair is edited the frame is FROZEN: a frame that grew with the
  // wing would rescale the picture under the pointer mid-drag, and the drag
  // would run away from the hand (measured: a 16 px drag moved the apex 7.7 mm)
  if (keep && vbox) return vbox;
  return b;
}
function layoutStage() {
  // the free area: right of nothing, left of the control panel (and on a
  // narrow screen, the whole width above it)
  const W = window.innerWidth, H = window.innerHeight, wide = W > 760;
  const area = wide ? { l: 12, t: H > 700 ? 120 : 12, r: W - 328, b: H - (W > 1100 ? 196 : 12) } : { l: 0, t: 0, r: W, b: H * 0.54 };
  msvg.style.left = area.l + 'px'; msvg.style.top = area.t + 'px';
  msvg.style.width = (area.r - area.l) + 'px'; msvg.style.height = (area.b - area.t) + 'px';
}
function drawMain() {
  if (!svgMode()) { stage.hidden = true; edBar.hidden = true; document.body.classList.remove('is-svg'); return; }
  stage.hidden = false; edBar.hidden = false; document.body.classList.add('is-svg');
  layoutStage();
  const m = viewModel || model;
  vbox = fitBox(m, editing);
  const W = vbox.x1 - vbox.x0, H = vbox.y1 - vbox.y0;
  msvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  msvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const out = exportSvg(m, { cutSafe: cutSafeEl.checked && cutReady });
  const fr = out.frame;
  let inner = withThinPreview(out).replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const ox = fr.x0 - fr.margin - vbox.x0, oy = vbox.y1 - (fr.y1 + fr.margin);
  let h = '';
  if (backdrop.href) {
    const bw = backdrop.w * backdrop.scale, bh = bw * backdrop.aspect;
    const cx = backdrop.cx + backdrop.dx * backdrop.w, cy = backdrop.cy + backdrop.dy * backdrop.w;
    const [X, Y] = toV(cx - bw / 2, cy + bh / 2);
    h += `<image class="backdrop" href="${backdrop.href}" x="${X}" y="${Y}" width="${bw}" height="${bh}" opacity="${backdrop.opacity}" preserveAspectRatio="none"/>`;
  }
  h += `<svg class="bug${backdrop.href ? ' is-traced' : ''}" x="${ox}" y="${oy}" width="${out.widthMm}" height="${out.heightMm}" viewBox="0 0 ${out.widthMm} ${out.heightMm}" overflow="visible">${inner}</svg>`;
  // click targets: every wing's projected contour (right and left), front pair on top
  for (const part of [...m.parts].filter((q) => /^wing\d$|^tail$/.test(q.kind)).sort((a, b) => wingRank(b) - wingRank(a))) {
    const loops = contourLoopsOf(m, part);
    const d = loops.map((L) => 'M' + L.map(([x, y]) => toV(x, y).map((v) => v.toFixed(3)).join(' ')).join('L') + 'Z').join('');
    h += `<path class="wing-hit" data-pair="${part.kind === 'tail' ? params.wingPairs - 1 : +part.kind.slice(4) - 1}" d="${d}"/>`;
  }
  if (editing && params.wingPairs) h += editorMarkup();
  msvg.innerHTML = h;
  drawEdBar();
}
const wingRank = (q) => (q.kind === 'tail' ? params.wingPairs - 0.5 : +q.kind.slice(4));   // pair 1 is drawn last (on top) in the SVG
function contourLoopsOf(m, part) { return contourLoops(m, part); }
function editorMarkup() {
  const own = editableSpec(editPair);
  const F = editorFrame(params, editPair);
  if (!F) return '';
  const shown = shownOutline();
  const dense = own ? sampleOutline(shown.points) : resolvedPair(editPair).dense;
  const r = pxPerMm(), rad = 5.5 / r, sq = 5 / r;
  const path = (mirror) => 'M' + dense.map(([u, w]) => { const [x, y] = F.toWorld(u, w); return toV(mirror ? -x : x, y).map((v) => v.toFixed(3)).join(' '); }).join('L');
  const [ax, ay] = F.toWorld(...dense[dense.length - 1]), [bx, by] = F.toWorld(...dense[0]);
  const chord = `M${toV(ax, ay).join(' ')}L${toV(bx, by).join(' ')}`;
  let h = `<path class="ed-sel" d="${path(false)}Z"/>`;
  h += `<path class="ed-curve mirror" d="${path(true)}"/><path class="ed-curve${own ? '' : ' is-linked'}" d="${path(false)}"/><path class="ed-chord" d="${chord}"/>`;
  if (own) h += `<path class="ed-curve hit" id="edHit" d="${path(false)}"/>`;
  if (own) shown.points.forEach(([u, w], i) => {
    const [X, Y] = toV(...F.toWorld(u, w));
    const isRoot = i === 0 || i === shown.points.length - 1, tail = shown.tags[i][0] === 'tail';
    h += isRoot
      ? `<rect class="pt root${i === selectedPoint ? ' is-sel' : ''}" data-i="${i}" x="${X - sq}" y="${Y - sq}" width="${2 * sq}" height="${2 * sq}"/>`
      : `<circle class="pt${tail ? ' tail' : ''}${i === selectedPoint ? ' is-sel' : ''}" data-i="${i}" cx="${X}" cy="${Y}" r="${rad}"/>`;
  });
  return h;
}
function drawEdBar() {
  const N = params.wingPairs;
  const title = document.getElementById('edTitle'), unl = document.getElementById('unlinkPair');
  const own = editing && N ? editableSpec(editPair) : null;
  const linked = editing && N && !own;
  unl.hidden = !linked;
  for (const id of ['delPoint', 'edDone']) document.getElementById(id).hidden = !editing;
  document.getElementById('edTailWrap').hidden = !(editing && own && isBottom());
  document.getElementById('edTail').checked = !!(params.wings.tail && params.wings.tail.on);
  document.getElementById('edHelp').hidden = !own;
  document.getElementById('delPoint').disabled = !(own && selectedPoint > 0 && selectedPoint < shownOutline().points.length - 1);
  if (!N) title.textContent = 'No wings to edit';
  else if (!editing) title.textContent = 'Click a wing to edit its outline';
  else {
    const shown = own ? shownOutline() : null, nt = shown ? shown.tags.filter((t) => t[0] === 'tail').length : 0;
    const r = resolvedPair(editPair), flat = editedIsTilted() ? ` · shown FLAT while edited (its dihedral ${(+r.dihedral).toFixed(0)}° / pitch ${(+r.pitch).toFixed(0)}° stay in the model and the exports)` : '';
    const wp = viewModel && viewModel.wingPairs[editPair], thin = wp && wp.thin && wp.thin.thin ? ' · RED: narrower than the floor' : '';
    title.textContent = linked
      ? `Pair ${editPair + 1} is LINKED — blended from pairs 1 and ${N}. Unlink it to draw it by hand.`
      : `Editing pair ${editPair + 1} — right wing · ${shown.points.length} points${nt ? ` (${nt} tail)` : ''}${flat}${thin}`;
  }
  document.getElementById('edStatus').textContent = edStatus;
}
function startEditing(k) {
  editPair = k; selectedPoint = -1; edStatus = ''; editing = true;
  drawPairUi(); buildNow(false);
}
function stopEditing() {
  if (!editing) return;
  editing = false; selectedPoint = -1; edStatus = '';
  buildNow(false);      // the pose comes back: the view shows the real model again
}
/* One edit path for every pair: the bottom pair's edits go through the
   composed (tail-aware) operations, the rest through the plain ones. */
function applyEdit(op, ...args) {
  const own = editableSpec(editPair);
  if (isBottom()) {
    const f = { move: moveComposed, insert: insertComposed, del: deleteComposed }[op];
    const r = f(own.points, params.wings.tail, ...args);
    if (r.ok) { own.points = r.base; params.wings.tail = r.tail; }
    return r;
  }
  const f = { move: moveControlPoint, insert: insertControlPoint, del: deleteControlPoint }[op];
  const r = f(own.points, ...args);
  if (r.ok) own.points = r.points;
  return r;
}
const outlinePointAt = (ev) => editorFrame(params, editPair).fromWorld(...screenToWorld(ev));
function committed() { drawMain(); scheduleBuild(); }
let drag = null;
msvg.addEventListener('pointerdown', (ev) => {
  const i = ev.target.dataset?.i;
  if (editing && i !== undefined && editableSpec(editPair)) {
    selectedPoint = +i; drag = { i: +i, id: ev.pointerId };
    msvg.setPointerCapture(ev.pointerId);
    edStatus = ''; drawMain(); return;
  }
  if (editing && ev.target.id === 'edHit') return;          // a double-click on the curve adds a point
  const pair = ev.target.dataset?.pair;
  if (pair !== undefined) { if (!editing || +pair !== editPair) startEditing(+pair); return; }
  if (editing) stopEditing();                                // a click on bare paper ends the edit
});
msvg.addEventListener('pointermove', (ev) => {
  if (!drag || ev.pointerId !== drag.id) return;
  const r = applyEdit('move', drag.i, outlinePointAt(ev));
  if (r.ok) { edStatus = ''; committed(); }
  else { edStatus = `Blocked: ${r.reason}.`; stats.blocked++; drawEdBar(); }
});
const endDrag = (ev) => { if (drag && ev.pointerId === drag.id) drag = null; };
msvg.addEventListener('pointerup', endDrag); msvg.addEventListener('pointercancel', endDrag);
msvg.addEventListener('dblclick', (ev) => {
  if (!editing) return;
  const own = editableSpec(editPair); if (!own) return;
  const r = applyEdit('insert', outlinePointAt(ev));
  if (r.ok) { selectedPoint = r.index; edStatus = ''; committed(); }
  else { edStatus = `Blocked: ${r.reason}.`; drawEdBar(); }
});
function deleteSelected() {
  const own = editableSpec(editPair); if (!editing || !own || selectedPoint < 0) return;
  const r = applyEdit('del', selectedPoint);
  if (r.ok) { selectedPoint = -1; edStatus = ''; committed(); }
  else { edStatus = `Blocked: ${r.reason}.`; drawEdBar(); }
}
msvg.addEventListener('contextmenu', (ev) => { const i = ev.target.dataset?.i; if (i === undefined || !editing) return; ev.preventDefault(); selectedPoint = +i; deleteSelected(); });
document.getElementById('delPoint').addEventListener('click', deleteSelected);
document.getElementById('edDone').addEventListener('click', stopEditing);
document.getElementById('unlinkPair').addEventListener('click', () => { unlinkPair(editPair); startEditing(editPair); });
document.getElementById('edTail').addEventListener('input', (e) => { params.wings.tail.on = e.target.checked; selectedPoint = -1; edStatus = ''; drawPairUi(); scheduleBuild(); });
window.addEventListener('keydown', (ev) => {
  if (document.activeElement?.tagName === 'INPUT') return;
  if ((ev.key === 'Delete' || ev.key === 'Backspace') && selectedPoint > 0) deleteSelected();
  if (ev.key === 'Escape') stopEditing();
});
document.getElementById('viewToggle').addEventListener('click', (e) => {
  const v = e.target.dataset?.main; if (!v) return;
  mainMode = v;
  document.querySelectorAll('#viewToggle button').forEach((b) => b.classList.toggle('is-on', b.dataset.main === v));
  if (v !== 'svg') stopEditing();
  vbox = null; buildNow(false);
});

/* The REFERENCE BACKDROP: an image behind the whole bug in the SVG view, to
   trace over. It is placed in WORLD millimetres (centred on the bug, as wide as
   the bug when loaded), so it stays put while the outline is edited; scale and
   offset are relative to that size. It is a tracing aid: never saved, never
   exported. */
for (const [id, k] of [['bdOpacity', 'opacity'], ['bdScale', 'scale'], ['bdX', 'dx'], ['bdY', 'dy']]) {
  document.getElementById(id).addEventListener('input', (e) => { backdrop[k] = +e.target.value; drawMain(); });
}
function placeBackdrop(href, aspect) {
  const P = model.positions; let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < P.length; i += 3) { x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); }
  Object.assign(backdrop, { href, aspect, w: x1 - x0, cx: 0, cy: (y0 + y1) / 2 });
  drawMain();
}
document.getElementById('bdFile').addEventListener('change', (e) => {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { const img = new Image(); img.onload = () => placeBackdrop(rd.result, img.naturalHeight / img.naturalWidth || 1); img.src = rd.result; };
  rd.readAsDataURL(f);
});
document.getElementById('bdClear').addEventListener('click', () => { backdrop.href = null; drawMain(); });

/* ---------------- build ---------------- */
let pending = 0, idleTimer = 0;
const stats = { buildMs: 0, mirror: null, cutRegions: null, blocked: 0 };
function scheduleBuild() {
  if (pending) return;
  pending = requestAnimationFrame(() => { pending = 0; buildNow(false); });
}
/* ONE model for the 3D view, the readout and both exports. While a TILTED pair
   is edited on the SVG view, the view shows its flat display twin (built with
   buildBug's flatPair) and the real model is rebuilt when the hand rests — and
   always before an export (realModel()). */
let modelStale = false;
function realModel() { if (modelStale) { model = buildBug(params); modelStale = false; rebuildMesh(); } return model; }
function buildNow(reframe) {
  const t = performance.now();
  const flat = editing && svgMode() && editedIsTilted();
  if (flat) { viewModel = buildBug(params, { flatPair: editPair }); modelStale = true; if (!model) model = viewModel; }
  else { model = buildBug(params); viewModel = model; modelStale = false; }
  stats.buildMs = performance.now() - t;
  // a refusal message describes the model it was shown for; once that model is
  // gone, so is the message (the readout's STL BLOCKED line stays live)
  if (!flat && !model.floorViolations.length) document.getElementById('exportMsg').textContent = '';
  stats.mirror = null; cutReady = false;
  if (!flat) rebuildMesh();
  if (reframe) setView(viewName); else { render(); drawMain(); }
  writeSvgNote();
  writeReadout();
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (modelStale) { realModel(); render(); }
    stats.mirror = mirrorDiff(model);
    if (cutSafeEl.checked) { cutReady = true; drawMain(); }
    writeSvgNote(); writeReadout();
  }, 350);
}

const cutSafeEl = document.getElementById('cutSafe');
let cutReady = false;     // the cut-safe union is a raster pass: computed when the hand rests
cutSafeEl.addEventListener('change', () => { cutReady = cutSafeEl.checked; drawMain(); writeSvgNote(); writeReadout(); });
/* The VIEW (never the downloaded file) also carries the floor's red runs,
   projected with the export's own frame, so a thin pair shows red there too. */
function withThinPreview(out) {
  const m = viewModel || model;
  const seg = m.wingPairs.flatMap((w) => w.thinSegments || []);
  let svg = out.svg;
  if (seg.length && out.frame) {
    const { x0, y1, margin } = out.frame, X = (x) => (x - x0 + margin).toFixed(3), Y = (y) => (y1 - y + margin).toFixed(3);
    let d = ''; for (let i = 0; i + 1 < seg.length; i += 2) d += `M${X(seg[i][0])} ${Y(seg[i][1])}L${X(seg[i + 1][0])} ${Y(seg[i + 1][1])}`;
    svg = svg.replace('</svg>', `<path class="thin-preview" d="${d}" fill="none" stroke="#e5484d" stroke-width="0.9" stroke-linecap="round"/></svg>`);
  }
  return svg;
}
function writeSvgNote() {
  const out = exportSvg(model, { cutSafe: false });
  const cutNote = cutSafeEl.checked ? (cutReady ? (() => { const r = exportSvg(model, { cutSafe: true }).regions; stats.cutRegions = r; return ` Cut-safe: the union of every part — ${r} connected region${r === 1 ? '' : 's'}.`; })() : ' Cut-safe: computing the union…') : '';
  document.getElementById('svgNote').textContent = `SVG ${out.widthMm.toFixed(1)} × ${out.heightMm.toFixed(1)} mm — Top → SVG shows exactly the file Get SVG writes.${cutNote}`;
}

function writeReadout() {
  const b = modelBox();
  const n = model.triangleCount;
  const m = stats.mirror === null ? 'checking…' : stats.mirror === 0 ? '0 (exact)' : `${stats.mirror} — NOT SYMMETRIC`;
  const L = model.layout;
  document.getElementById('readout').innerHTML =
    `triangles <b>${n.toLocaleString()}</b>   STL <b>${((84 + 50 * n) / 1024).toFixed(0)} KiB</b>\n`
    + `size <b>${(b.x1 - b.x0).toFixed(1)} × ${(b.y1 - b.y0).toFixed(1)} × ${(b.z1 - b.z0).toFixed(1)} mm</b> (w × l × h)\n`
    + (params.wingPairs > 2 ? `thorax <b>${L.Lt.toFixed(1)} mm</b> (lengthened for ${params.wingPairs} wing pairs)\n` : '')
    + `parts <b>${model.parts.length}</b> closed shells, overlapping\n`
    + `mirror diff <b>${m}</b>\n`
    + `min feature floor <b>${params.minDiameter.toFixed(2)} mm</b> (tubes, wing thickness, drawn wing widths, vein widths)\n`
    + venationLines()
    + (model.floorViolations.length ? `STL <b class="bad">BLOCKED</b> — ${model.floorViolations.map((v) => `pair ${v.pair + 1}${v.blendedFrom ? ` (blended from ${v.blendedFrom.map((i) => i + 1).join(' and ')})` : ''} narrower than the floor`).join(', ')} (red in the view; Get STL says what to widen)\n` : '')
    + (model.notes.length ? `notes <b>${model.notes.join('; ')}</b>\n` : '')
    + `build <b>${stats.buildMs.toFixed(0)} ms</b>`;
}

/* Phase 2 read-out: per pair, what the venation record holds — cells, veins,
   holes cut / merged / kept solid against the smallest-hole threshold, the
   discal cell and the pterostigma, and the vein floor. */
function venationLines() {
  if (params.venation === 'none' || !params.wingPairs) return '';
  const lines = [`venation <b>${params.venation.toUpperCase()}</b>${params.venation === 'holes' ? ` · smallest hole ${params.minDiameter <= params.minCellMm ? '' : ''}<b>${params.minCellMm.toFixed(1)} mm</b> across (smaller cells merge with a neighbour)` : ` · ridge height <b>${params.ridgeHeight.toFixed(2)} mm</b>`}`];
  for (const w of model.wingPairs) {
    const V = w.venation; if (!V) continue;
    const st = V.stats;
    const parts = [`${st.cells} cells from ${st.mainMade} veins${st.crossMade ? ` + ${st.crossMade} cross-veins` : ''}`];
    if (params.venation === 'holes') parts.push(`${st.holes} hole${st.holes === 1 ? '' : 's'} cut${st.merged ? `, ${st.merged} small cell${st.merged === 1 ? '' : 's'} merged` : ''}${st.solidCells ? `, ${st.solidCells} solid` : ''}`);
    if (st.discal) parts.push('discal cell'); if (st.stigma) parts.push('pterostigma'); if (st.tailTargeted) parts.push('a vein runs into the tail');
    const dr = st.dropped.main + st.dropped.cross + st.dropped.discal + st.dropped.stigma;
    if (dr) parts.push(`${dr} vein${dr === 1 ? '' : 's'} could not be routed and ${dr === 1 ? 'was' : 'were'} dropped`);
    const vf = w.veinFloor;
    const floor = vf ? (vf.under ? `<b class="bad">veins ${vf.veinMin.toFixed(2)} mm${Number.isFinite(vf.border) ? ` / border ${vf.border.toFixed(2)} mm` : ''} — UNDER the floor</b>` : `veins ≥ ${vf.veinMin.toFixed(2)} mm`) : '';
    lines.push(`  pair ${w.index + 1}: ${parts.join(' · ')}${floor ? ' · ' + floor : ''}`);
  }
  return lines.join('\n') + '\n';
}

/* ---------------- exports ---------------- */
function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const stem = () => `bug-${(designName || 'custom').replace(/[^\w-]+/g, '-')}`;
function tryExportStl() {
  try { return { ok: true, bytes: exportStl(realModel()) }; }
  catch (e) { if (e instanceof FloorError) return { ok: false, reason: e.message }; throw e; }
}
document.getElementById('exportStl').addEventListener('click', () => {
  const r = tryExportStl();
  const msg = document.getElementById('exportMsg');
  if (r.ok) { msg.textContent = ''; download(`${stem()}.stl`, r.bytes, 'model/stl'); }
  else msg.textContent = r.reason;
});
document.getElementById('exportSvg').addEventListener('click', () => download(`${stem()}${cutSafeEl.checked ? '-cutsafe' : ''}.svg`, exportSvg(realModel(), { cutSafe: cutSafeEl.checked }).svg, 'image/svg+xml'));
document.getElementById('viewButtons').addEventListener('click', (e) => { const v = e.target.dataset?.view; if (v) setView(v); });

/* ---------------- test chrome (read by tools/shot-bug-sheet.mjs) ---------------- */
window.__bug = {
  setParams: (p) => loadParams(p),
  specimen: () => setSpecimen().notes,
  getParams: () => JSON.parse(JSON.stringify(params)),
  setView: (v) => setView(v),
  // a close-up for the contact sheet: target and direction in MODEL mm (x right, y head, z up)
  lookAt: (t, d, dist) => {
    const c = new THREE.Vector3(t[0], t[2], -t[1]), dir = new THREE.Vector3(d[0], d[2], -d[1]).normalize();
    camera.position.copy(c).addScaledVector(dir, dist); camera.up.set(0, 1, 0); controls.target.copy(c);
    camera.near = dist / 50; camera.far = dist * 20; camera.updateProjectionMatrix(); controls.update(); render();
  },
  svg: (cutSafe = false) => exportSvg(model, { cutSafe }),
  stl: () => Array.from(exportStl(model, { allowBelowFloor: true })),   // the sheet compares bytes; the page's own button refuses
  tryStl: () => { const r = tryExportStl(); return r.ok ? { ok: true, bytes: r.bytes.length } : r; },
  thinView: () => ({ svgRed: document.querySelectorAll('#mainSvg .thin-preview').length, tinted: root.children.filter((c) => c.material === MAT.thinWing || c.material === MAT.thinWingSmooth).length, redSegments: root.children.filter((c) => c.isLineSegments).reduce((n, c) => n + c.geometry.attributes.position.count / 2, 0) }),
  floor: () => ({ violations: model.floorViolations.map((v) => ({ ...v })), pairs: model.wingPairs.map((w) => ({ hasTail: w.hasTail, thin: w.thin })) }),
  venation: () => model.wingPairs.map((w) => (w.venation ? { stats: w.venation.stats, veinFloor: w.veinFloor } : null)),
  tailPoints: () => { const s = window.__bug.getParams(); return s.wings.tail; },
  triangleCount: () => model.triangleCount,
  notes: () => model.notes.slice(),
  editPair: (k) => { editPair = k; selectedPoint = -1; drawPairUi(); drawMain(); },
  // the on-wing editor (Top view, SVG mode)
  setMain: (v) => document.querySelector(`#viewToggle button[data-main="${v}"]`).click(),
  mainMode: () => mainMode,
  editing: () => (editing ? editPair : -1),
  startEditing: (k) => startEditing(k),
  stopEditing: () => stopEditing(),
  // the screen position of control point i of the edited pair (for REAL
  // drags), on the wing in the SVG view; index i is into the outline AS DRAWN
  // (the tail's points included on the bottom pair)
  pointScreen: (i) => { const p = shownOutline().points[i]; return worldToScreen(...editorFrame(params, editPair).toWorld(p[0], p[1])); },
  uvScreen: (u, w) => worldToScreen(...editorFrame(params, editPair).toWorld(u, w)),
  worldScreen: (x, y) => worldToScreen(x, y),
  screenWorld: (cx, cy) => screenToWorld({ clientX: cx, clientY: cy }),
  shownTags: () => shownOutline().tags.map((t) => t.slice()),
  shownPoints: () => shownOutline().points.map((p) => p.slice()),
  // the EMITTED bead apex of control point i of the edited pair, in the view
  // model (the flat display while editing): where the wing actually is
  apexWorld: (i) => {
    const m = viewModel || model, part = m.parts.find((q) => q.kind === `wing${editPair + 1}` && q.side === 'R');
    const n = part.meta.planform.length, idx = n - 1 - (i * CR_SAMPLES + 1), r = part.meta.bead ? part.meta.bead.rings.find((x) => x.i === idx) : null;
    const v = r ? r.ids[part.meta.bead.K / 2] : part.v0 + idx; return [m.positions[3 * v], m.positions[3 * v + 1]];
  },
  wingScreen: (k, side = 'R') => { const m = viewModel || model, part = m.parts.find((q) => q.kind === `wing${k + 1}` && q.side === side); const L = contourLoops(m, part).reduce((a, l) => (l.length > a.length ? l : a)); let cx = 0, cy = 0; for (const [x, y] of L) { cx += x; cy += y; } return worldToScreen(cx / L.length, cy / L.length); },
  viewIsFlat: () => !!(viewModel && viewModel !== model),
  editorStatus: () => edStatus,
  editorTitle: () => document.getElementById('edTitle').textContent,
  blockedCount: () => stats.blocked,
  setBackdrop: (o) => { Object.assign(backdrop, o); drawMain(); },
  backdrop: () => ({ ...backdrop, href: !!backdrop.href }),
  flushBuild: () => { if (pending) { cancelAnimationFrame(pending); pending = 0; } buildNow(false); },
  render,
};

refreshDesignList();
resize();
loadParams(params);
