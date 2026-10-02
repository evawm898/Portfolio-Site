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
  composeOutline, moveComposed, insertComposed, deleteComposed, FloorError, specimenPose, anyLace, STAND_IN_NAME,
} from './bug-geometry.js';
import { parseSvg, LACE_MAX_BYTES } from './bug-lace.js';

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
let viewName = 'three';
// 'vein': Phase 2 ridge strips and stigma plates; lace / island: Phase 4's
// RIDGES plates and loose HOLES islands. An SVG-ONLY lace (svglaceN) is not
// drawn here: the 3D view shows what the STL carries.
const WING_KINDS = ['tail', ...Array.from({ length: MAX_WING_PAIRS }, (_, k) => [`wing${k + 1}`, `lace${k + 1}`, `island${k + 1}`]).flat(), 'vein'];

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
MAT.thinLine = new THREE.LineBasicMaterial({ color: 0xe5484d, depthTest: false, transparent: true });
function rebuildMesh() {
  for (const c of [...root.children]) { root.remove(c); c.geometry.dispose(); }
  for (const g of partGeometry(['body', 'leg', 'antenna'], false)) root.add(new THREE.Mesh(g, MAT.body));
  const thinKinds = new Set(model.floorViolations.filter((v) => v.kind !== 'vein').map((v) => `wing${v.pair + 1}`));
  const thinVeinPairs = new Set(model.floorViolations.filter((v) => v.kind === 'vein').map((v) => v.pair));
  for (const kind of WING_KINDS) {
    const parts = model.parts.filter((q) => q.kind === kind);
    parts.forEach((q, i) => {
      const g = partGeometry([kind], true)[i];
      const red = kind === 'vein' ? thinVeinPairs.has(q.meta.pair) : thinKinds.has(kind);
      root.add(new THREE.Mesh(g, red ? MAT.thinWing : MAT.wing));
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
function makeCtrl(s, id, onInput) {
  const w = document.createElement('div');
  w.className = 'bg-ctrl' + (s.kind === 'bool' ? ' bg-bool' : '');
  if (s.kind === 'range' && s.labels) {
    // an integer field drawn as a choice (Phase 4's lace role / warp / tiling):
    // the value is still the number, so a linked pair blends it like the rest
    w.innerHTML = `<label for="${id}"><span>${s.label}</span></label><select id="${id}">${s.labels.map((l, i) => `<option value="${s.min + i}">${l}</option>`).join('')}</select>`;
  } else if (s.kind === 'range') {
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

/* Phase 4 — the LACE IMPORT: an SVG file read as text into params.lace (so a
   saved design carries it), or the stand-in test pattern when none is loaded.
   The role, warp and placement are per pair, in the Wings block. */
const laceBlock = document.createElement('div');
laceBlock.className = 'bg-lace';
laceBlock.innerHTML = `<p class="bg-note" id="laceSource"></p>
  <div class="bg-row"><label class="bg-btn bg-file">Import lace SVG…<input type="file" id="laceFile" accept=".svg,image/svg+xml" hidden></label>
  <button class="bg-btn" id="laceStandIn">Use the stand-in</button></div>
  <p class="bg-note" id="laceMsg"></p>`;
secEl.lace.querySelector('.bg-sec-body').prepend(laceBlock);
function writeLaceSource() {
  const L = params.lace || { svg: '' }, el = document.getElementById('laceSource');
  if (!el) return;
  if (!L.svg) { el.innerHTML = `Using the <b>${STAND_IN_NAME}</b> — Eva's lace files are not loaded yet, so the look cannot be ruled on it. Set a pair's lace role in Wings.`; return; }
  const r = parseSvg(L.svg);
  el.innerHTML = r.ok ? `Using <b>${(L.name || 'imported SVG').replace(/</g, '&lt;')}</b> — ${r.counts.elements} filled / stroked element${r.counts.elements === 1 ? '' : 's'}, ${(L.svg.length / 1024).toFixed(0)} KB.${r.notes.length ? ' ' + r.notes.join('; ') + '.' : ''}` : `The loaded file was not read (${r.reason}); the stand-in is used.`;
}
document.getElementById('laceFile').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  const msg = document.getElementById('laceMsg');
  if (f.size > LACE_MAX_BYTES) { msg.textContent = `Not loaded: ${f.name} is ${(f.size / 1e6).toFixed(1)} MB; the limit is ${(LACE_MAX_BYTES / 1e6).toFixed(0)} MB.`; return; }
  const text = await f.text(), r = parseSvg(text);
  if (!r.ok) { msg.textContent = `Not loaded: ${r.reason}.`; return; }
  params.lace = { name: f.name, svg: text };
  msg.textContent = `Loaded ${f.name}.`; writeLaceSource(); scheduleBuild();
});
document.getElementById('laceStandIn').addEventListener('click', () => { params.lace = { name: '', svg: '' }; document.getElementById('laceMsg').textContent = ''; writeLaceSource(); scheduleBuild(); });

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
    spec[f.id] = v; writePairFields(); applyVisibility(); scheduleBuild();   // a lace role shows / hides the Lace section's island choice
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
  document.getElementById('editorBox').hidden = N === 0;
  if (N === 0) return;
  editPair = Math.min(editPair, N - 1);
  for (let k = 0; k < N; k++) {
    const b = document.createElement('button');
    const role = roleOf(k);
    const linked = role === 'mid' && !params.wings.unlinked[k];
    b.className = 'bg-btn' + (k === editPair ? ' is-on' : '') + (linked ? ' bg-linked' : '');
    b.textContent = N === 1 ? 'pair 1' : `${k + 1} ${role === 'first' ? 'first' : role === 'last' ? 'last' : linked ? 'linked' : 'drawn'}`;
    b.addEventListener('click', () => { editPair = k; selectedPoint = -1; drawPairUi(); drawEditor(); });
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
  selectedPoint = -1; edStatus = ''; drawPairUi(); drawEditor(); scheduleBuild();
});
document.getElementById('linkBtn').addEventListener('click', () => {
  const k = editPair;
  if (params.wings.unlinked[k]) delete params.wings.unlinked[k];
  else {
    // start from exactly what was on screen: the interpolated values and curve
    const r = resolvedPair(k);
    const K = Math.max(params.wings.first.points.length, params.wings.last.points.length);
    const spec = {}; for (const f of WING_FIELDS) spec[f.id] = r[f.id];
    spec.points = controlPointsFromDense(r.dense, K);
    params.wings.unlinked[k] = spec;
  }
  selectedPoint = -1; drawPairUi(); drawEditor(); scheduleBuild();
});

function writePairFields() {
  if (!params.wingPairs) return;
  const own = editableSpec(editPair);
  const shown = own || resolvedPair(editPair);
  for (const f of WING_FIELDS) {
    const w = pairFieldEl[f.id], input = w.querySelector('input,select');
    input.value = f.labels ? Math.round(shown[f.id]) : shown[f.id]; input.disabled = !own;
    const out = document.getElementById(`wf-${f.id}-out`); if (out) out.textContent = fmtVal(f, shown[f.id]);
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
  writeLaceSource();
}
function applyVisibility() {
  for (const s of PARAM_SPEC) ctrlEl[s.id].hidden = !!(s.visibleWhen && !s.visibleWhen(params));
  for (const s of [...SECTIONS].reverse()) {
    const d = secEl[s.id];
    // the Lace section carries the import itself, so it shows wherever veins do
    if (s.id === 'lace') { d.hidden = !(params.venation !== 'none' && params.wingPairs > 0); continue; }
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
  loadParams(r.params); editPair = Math.min(k, Math.max(0, params.wingPairs - 1)); drawPairUi(); drawEditor();
  designMsg(r.notes.length ? `Specimen set, with notes: ${r.notes.join('; ')}.` : 'Specimen set: forewings square to the body, wings flat, legs tucked, antennae in a V. Adjust any slider after.', r.notes.length > 0);
  return r;
}
document.getElementById('specimenBtn').addEventListener('click', setSpecimen);

function loadParams(p) {
  params = normalizeParams(p);
  editPair = 0; selectedPoint = -1;
  writeControls(); buildNow(true); drawEditor();
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

/* ---------------- the wing-outline editor ---------------- */
/* The RIGHT wing's outline only, drawn in its own planform frame: u (span)
   to the right, w (chord) up = toward the head. The left wing is the mirror,
   built by the model — the editor cannot break symmetry because it never
   touches the left. The frame matches tools/bug-fixtures.mjs EDITOR_VIEW. */
const VIEW = { u0: -0.08, u1: 1.28, w0: -0.9, w1: 0.46 };   // room below the wing for a tail
const ed = document.getElementById('editor');
const EW = 340, EH = 340;
const toX = (u) => ((u - VIEW.u0) / (VIEW.u1 - VIEW.u0)) * EW, toY = (w) => ((VIEW.w1 - w) / (VIEW.w1 - VIEW.w0)) * EH;
const fromXY = (x, y) => [VIEW.u0 + (x / EW) * (VIEW.u1 - VIEW.u0), VIEW.w1 - (y / EH) * (VIEW.w1 - VIEW.w0)];
const backdrop = { href: null, opacity: 0.5, scale: 1, dx: 0, dy: 0 };
let edStatus = '';

function evPoint(ev) {
  const r = ed.getBoundingClientRect();
  return fromXY(((ev.clientX - r.left) / r.width) * EW, ((ev.clientY - r.top) / r.height) * EH);
}
/* The outline the editor shows and edits: on the BOTTOM pair it is the base
   with the tail group composed in (tail points tagged); elsewhere the pair's
   own points. */
const isBottom = () => editPair === params.wingPairs - 1;
function shownOutline() {
  const own = editableSpec(editPair);
  if (!own) return null;
  return composeOutline(own.points, isBottom() ? params.wings.tail : null);
}
function drawEditor() {
  if (!params.wingPairs) return;
  const own = editableSpec(editPair);
  const shown = shownOutline();
  const dense = own ? sampleOutline(shown.points) : resolvedPair(editPair).dense;
  const path = 'M' + dense.map(([u, w]) => `${toX(u).toFixed(1)} ${toY(w).toFixed(1)}`).join('L');
  const chord = `M${toX(dense[dense.length - 1][0]).toFixed(1)} ${toY(dense[dense.length - 1][1]).toFixed(1)}L${toX(dense[0][0]).toFixed(1)} ${toY(dense[0][1]).toFixed(1)}`;
  const bw = EW * backdrop.scale, bh = EH * backdrop.scale;
  const bx = (EW - bw) / 2 + backdrop.dx * EW, by = (EH - bh) / 2 + backdrop.dy * EH;
  let h = '';
  if (backdrop.href) h += `<image href="${backdrop.href}" x="${bx}" y="${by}" width="${bw}" height="${bh}" opacity="${backdrop.opacity}" preserveAspectRatio="none"/>`;
  h += `<line class="ax" x1="${toX(0)}" y1="0" x2="${toX(0)}" y2="${EH}"/><line class="ax" x1="0" y1="${toY(0)}" x2="${EW}" y2="${toY(0)}"/>`;
  h += `<text class="axl" x="${toX(0) + 4}" y="12">body side · head ↑</text><text class="axl" x="${EW - 4}" y="${toY(0) - 4}" text-anchor="end">span →</text>`;
  h += `<path class="curve${own ? '' : ' is-linked'}" d="${path}"/><path class="chord" d="${chord}"/>`;
  // RED: where the BUILT planform (scallops and tail included) is narrower than
  // the floor — read off the model's own analysis, so it is what the STL gate sees
  const wp = model && model.wingPairs[editPair];
  if (wp && wp.thinFlags) {
    const D = wp.dense;
    let seg = '';
    for (let k = 0; k < D.length; k++) {
      const k1 = (k + 1) % D.length;
      if (wp.thinFlags[k] && wp.thinFlags[k1]) seg += `M${toX(D[k][0]).toFixed(1)} ${toY(D[k][1]).toFixed(1)}L${toX(D[k1][0]).toFixed(1)} ${toY(D[k1][1]).toFixed(1)}`;
      else if (wp.thinFlags[k]) seg += `M${(toX(D[k][0]) - 0.1).toFixed(1)} ${toY(D[k][1]).toFixed(1)}L${(toX(D[k][0]) + 0.1).toFixed(1)} ${toY(D[k][1]).toFixed(1)}`;
    }
    if (seg) h += `<path class="thin" d="${seg}"/>`;
  }
  // Phase 2: the edited pair's VEINS (and in HOLES its holes) drawn in the
  // planform frame — the model's own record scaled back to (u, w) units
  if (wp && wp.venation) {
    const V = wp.venation, L = (own || resolvedPair(editPair)).length, Sx = (own || resolvedPair(editPair)).stretch;
    const toUW = ([x, y]) => [toX(x / L).toFixed(1), toY(y / (L * Sx)).toFixed(1)];
    let d = '';
    for (const v of V.veins) if (!v.dropped) d += 'M' + v.points.map((q) => toUW(q).join(' ')).join('L');
    const thinV = wp.veinFloor && wp.veinFloor.under;
    h += `<path class="veins${thinV ? ' is-thin' : ''}" d="${d}"/>`;
    let hd = '';
    // Phase 4: a HOLES lace replaces the procedural holes with its own (and
    // its loose islands); a RIDGES lace draws its plates
    const LC = wp.lace;
    const holeSet = LC && LC.mode === 'holes' && !LC.svgOnly ? LC.regions.flatMap((R) => R.holes) : LC && LC.svgOnly ? LC.regions.flatMap((R) => R.holes) : V.cells.flatMap((c) => c.holes || []);
    for (const hole of holeSet) hd += 'M' + hole.map((q) => toUW(q).join(' ')).join('L') + 'Z';
    if (LC) for (const x of [...LC.islands, ...LC.plates]) for (const loop of [x.outer, ...x.holes]) hd += 'M' + loop.map((q) => toUW(q).join(' ')).join('L') + 'Z';
    if (hd) h += `<path class="holes" d="${hd}"/>`;
    for (const c of V.cells) if (c.role === 'stigma') h += `<path class="stigma" d="${'M' + c.points.map((q) => toUW(q).join(' ')).join('L') + 'Z'}"/>`;
  }
  if (own) shown.points.forEach(([u, w], i) => {
    const isRoot = i === 0 || i === shown.points.length - 1;
    const tail = shown.tags[i][0] === 'tail';
    h += isRoot
      ? `<rect class="pt root${i === selectedPoint ? ' is-sel' : ''}" data-i="${i}" x="${toX(u) - 5}" y="${toY(w) - 5}" width="10" height="10"/>`
      : `<circle class="pt${tail ? ' tail' : ''}${i === selectedPoint ? ' is-sel' : ''}" data-i="${i}" cx="${toX(u)}" cy="${toY(w)}" r="5.5"/>`;
  });
  ed.innerHTML = h;
  const n = own ? shown.points.length : 0;
  const nt = own ? shown.tags.filter((t) => t[0] === 'tail').length : 0;
  const thinNote = wp && wp.thin && wp.thin.thin ? ' · RED: narrower than the floor' : '';
  document.getElementById('edTitle').textContent = `Pair ${editPair + 1} outline — right wing${own ? ` · ${n} points${nt ? ` (${nt} tail)` : ''}` : ' · linked (interpolated)'}${thinNote}`;
  document.getElementById('edStatus').textContent = edStatus;
  document.getElementById('delPoint').disabled = !(own && selectedPoint > 0 && selectedPoint < n - 1);
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
function committed() { drawEditor(); scheduleBuild(); }
let drag = null;
ed.addEventListener('pointerdown', (ev) => {
  const own = editableSpec(editPair);
  if (!own) { edStatus = 'This pair is linked — Unlink it in the panel to draw it.'; drawEditor(); return; }
  const i = ev.target.dataset?.i;
  if (i === undefined) { selectedPoint = -1; drawEditor(); return; }
  selectedPoint = +i; drag = { i: +i, id: ev.pointerId };
  ed.setPointerCapture(ev.pointerId);
  edStatus = ''; drawEditor();
});
ed.addEventListener('pointermove', (ev) => {
  if (!drag || ev.pointerId !== drag.id) return;
  const r = applyEdit('move', drag.i, evPoint(ev));
  if (r.ok) { edStatus = ''; committed(); }
  else { edStatus = `Blocked: ${r.reason}.`; stats.blocked++; drawEditor(); }
});
const endDrag = (ev) => { if (drag && ev.pointerId === drag.id) drag = null; };
ed.addEventListener('pointerup', endDrag); ed.addEventListener('pointercancel', endDrag);
ed.addEventListener('dblclick', (ev) => {
  const own = editableSpec(editPair); if (!own) return;
  const r = applyEdit('insert', evPoint(ev));
  if (r.ok) { selectedPoint = r.index; edStatus = ''; committed(); }
  else { edStatus = `Blocked: ${r.reason}.`; drawEditor(); }
});
function deleteSelected() {
  const own = editableSpec(editPair); if (!own || selectedPoint < 0) return;
  const r = applyEdit('del', selectedPoint);
  if (r.ok) { selectedPoint = -1; edStatus = ''; committed(); }
  else { edStatus = `Blocked: ${r.reason}.`; drawEditor(); }
}
ed.addEventListener('contextmenu', (ev) => { const i = ev.target.dataset?.i; if (i === undefined) return; ev.preventDefault(); selectedPoint = +i; deleteSelected(); });
document.getElementById('delPoint').addEventListener('click', deleteSelected);
window.addEventListener('keydown', (ev) => { if ((ev.key === 'Delete' || ev.key === 'Backspace') && selectedPoint > 0 && document.activeElement?.tagName !== 'INPUT') deleteSelected(); });

for (const [id, k] of [['bdOpacity', 'opacity'], ['bdScale', 'scale'], ['bdX', 'dx'], ['bdY', 'dy']]) {
  document.getElementById(id).addEventListener('input', (e) => { backdrop[k] = +e.target.value; drawEditor(); });
}
document.getElementById('bdFile').addEventListener('change', (e) => {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { backdrop.href = rd.result; drawEditor(); };
  rd.readAsDataURL(f);
});
document.getElementById('bdClear').addEventListener('click', () => { backdrop.href = null; drawEditor(); });

/* ---------------- build ---------------- */
let pending = 0, idleTimer = 0;
const stats = { buildMs: 0, mirror: null, cutRegions: null, blocked: 0 };
function scheduleBuild() {
  if (pending) return;
  pending = requestAnimationFrame(() => { pending = 0; buildNow(false); });
}
function buildNow(reframe) {
  const t = performance.now();
  model = buildBug(params);
  stats.buildMs = performance.now() - t;
  // a refusal message describes the model it was shown for; once that model is
  // gone, so is the message (the readout's STL BLOCKED line stays live)
  if (!model.floorViolations.length) document.getElementById('exportMsg').textContent = '';
  stats.mirror = null;
  rebuildMesh();
  if (reframe) setView(viewName); else render();
  drawSvg(false);
  writeReadout();
  drawEditor();   // also mid-drag: the red floor highlight follows each rebuilt model
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { stats.mirror = mirrorDiff(model); if (cutSafeEl.checked) drawSvg(true); writeReadout(); }, 350);
}

const cutSafeEl = document.getElementById('cutSafe');
cutSafeEl.addEventListener('change', () => { drawSvg(cutSafeEl.checked); writeReadout(); });
function drawSvg(withCut) {
  const cut = withCut && cutSafeEl.checked;
  const out = exportSvg(model, { cutSafe: cut });
  // The PREVIEW (never the downloaded file) also carries the floor's red runs,
  // projected with the export's own frame, so a thin pair shows red here too.
  const seg = model.wingPairs.flatMap((w) => w.thinSegments || []);
  let svg = out.svg;
  if (seg.length && out.frame) {
    const { x0, y1, margin } = out.frame, X = (x) => (x - x0 + margin).toFixed(3), Y = (y) => (y1 - y + margin).toFixed(3);
    let d = ''; for (let i = 0; i + 1 < seg.length; i += 2) d += `M${X(seg[i][0])} ${Y(seg[i][1])}L${X(seg[i + 1][0])} ${Y(seg[i + 1][1])}`;
    svg = svg.replace('</svg>', `<path class="thin-preview" d="${d}" fill="none" stroke="#e5484d" stroke-width="0.9" stroke-linecap="round"/></svg>`);
  }
  document.getElementById('svgCard').innerHTML = svg;
  if (cut) stats.cutRegions = out.regions;
  document.getElementById('svgNote').textContent = cutSafeEl.checked
    ? (cut ? `Cut-safe: the union of every part — ${out.regions} connected region${out.regions === 1 ? '' : 's'}.` : 'Cut-safe: computing the union…')
    : `${out.widthMm.toFixed(1)} × ${out.heightMm.toFixed(1)} mm. Tilt changes the solid; the SVG projects it from straight above.`;
}

function writeReadout() {
  const b = modelBox();
  const n = model.triangleCount;
  const m = stats.mirror === null ? 'checking…' : stats.mirror === 0 ? '0 (exact)' : `${stats.mirror} — NOT SYMMETRIC`;
  const L = model.layout;
  document.getElementById('readout').innerHTML =
    `triangles <b>${n.toLocaleString()}</b>   STL <b>${((84 + 50 * model.stlTriangleCount) / 1024).toFixed(0)} KiB</b>\n`
    + `size <b>${(b.x1 - b.x0).toFixed(1)} × ${(b.y1 - b.y0).toFixed(1)} × ${(b.z1 - b.z0).toFixed(1)} mm</b> (w × l × h)\n`
    + (params.wingPairs > 2 ? `thorax <b>${L.Lt.toFixed(1)} mm</b> (lengthened for ${params.wingPairs} wing pairs)\n` : '')
    + `parts <b>${model.parts.length}</b> closed shells, overlapping${model.stlTriangleCount !== n ? ` (${(n - model.stlTriangleCount).toLocaleString()} triangles of SVG-only lace are not in the STL)` : ''}\n`
    + `mirror diff <b>${m}</b>\n`
    + `min feature floor <b>${params.minDiameter.toFixed(2)} mm</b> (tubes, wing thickness, drawn wing widths, vein widths)\n`
    + venationLines()
    + laceLines()
    + (model.floorViolations.length ? `STL <b class="bad">BLOCKED</b> — ${model.floorViolations.map((v) => `pair ${v.pair + 1}${v.blendedFrom ? ` (blended from ${v.blendedFrom.map((i) => i + 1).join(' and ')})` : ''} ${v.kind === 'island' ? `has ${v.count} loose lace island${v.count === 1 ? '' : 's'}` : v.kind === 'lace' ? 'lace narrower than the floor' : 'narrower than the floor'}`).join(', ')} (red in the view; Get STL says what to do)\n` : '')
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

/* Phase 4 read-out: per pair, what the lace pipeline did — the source (the
   STAND-IN said so), role, warp, holes cut, islands found and what happened
   to them, ties, plates, and the floor. */
function laceLines() {
  const rows = model.wingPairs.filter((w) => w.lace);
  if (!rows.length) return '';
  const L0 = rows[0].lace;
  const lines = [`lace <b>${L0.standIn ? STAND_IN_NAME : L0.name}</b>${params.venation === 'holes' ? ` · islands: <b>${{ unset: 'NOT CHOSEN', drop: `drop under ${params.laceDropMm2.toFixed(1)} mm²`, bridge: `bridge (ties ${Math.max(params.laceTieMm, params.minDiameter).toFixed(2)} mm)`, svg: 'SVG-ONLY' }[params.laceIslands]}</b>` : ''}`];
  for (const w of rows) {
    const L = w.lace, st = L.stats, s = L.spec, bits = [];
    bits.push(`${L.role === 'fill' ? 'FILL CELLS' : 'REPLACE VEINS'} · ${(L.mapper.warp || '').toUpperCase()} · scale ${s.laceScale.toFixed(2)}${s.laceBlend < 1 ? ` · blend ${s.laceBlend.toFixed(2)}` : ''}`);
    if (L.mode === 'holes') bits.push(`${st.holes} hole${st.holes === 1 ? '' : 's'}`, `${st.islandsFound} island${st.islandsFound === 1 ? '' : 's'}${st.dropped ? `, ${st.dropped} dropped` : ''}${st.bridged ? `, ${st.bridged} bridged` : ''}${L.keptIslands ? `, ${L.keptIslands} loose` : ''}`);
    else bits.push(`${st.plates} raised plate${st.plates === 1 ? '' : 's'}`);
    if (L.svgOnly) bits.push('<b>SVG-ONLY</b>: the 3D view and the STL carry the procedural veins');
    bits.push(L.thin.thin ? `<b class="bad">threads under the floor</b>` : 'threads ≥ the floor');
    lines.push(`  pair ${w.index + 1}: ${bits.join(' · ')} · ${st.ms} ms`);
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
  try { return { ok: true, bytes: exportStl(model) }; }
  catch (e) { if (e instanceof FloorError) return { ok: false, reason: e.message }; throw e; }
}
document.getElementById('exportStl').addEventListener('click', () => {
  const r = tryExportStl();
  const msg = document.getElementById('exportMsg');
  if (r.ok) { msg.textContent = ''; download(`${stem()}.stl`, r.bytes, 'model/stl'); }
  else msg.textContent = r.reason;
});
document.getElementById('exportSvg').addEventListener('click', () => download(`${stem()}${cutSafeEl.checked ? '-cutsafe' : ''}.svg`, exportSvg(model, { cutSafe: cutSafeEl.checked }).svg, 'image/svg+xml'));
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
  thinView: () => ({ svgRed: document.querySelectorAll('#svgCard .thin-preview').length, tinted: root.children.filter((c) => c.material === MAT.thinWing).length, redSegments: root.children.filter((c) => c.isLineSegments).reduce((n, c) => n + c.geometry.attributes.position.count / 2, 0) }),
  floor: () => ({ violations: model.floorViolations.map((v) => ({ ...v })), pairs: model.wingPairs.map((w) => ({ hasTail: w.hasTail, thin: w.thin })) }),
  venation: () => model.wingPairs.map((w) => (w.venation ? { stats: w.venation.stats, veinFloor: w.veinFloor } : null)),
  lace: () => model.wingPairs.map((w) => (w.lace ? { role: w.lace.role, mode: w.lace.mode, svgOnly: w.lace.svgOnly, standIn: w.lace.standIn, stats: w.lace.stats, thin: w.lace.thin, keptIslands: w.lace.keptIslands, ties: w.lace.ties.length } : null)),
  setLace: (name, svg) => { params.lace = { name, svg }; writeLaceSource(); buildNow(false); },
  tailPoints: () => { const s = window.__bug.getParams(); return s.wings.tail; },
  triangleCount: () => model.triangleCount,
  notes: () => model.notes.slice(),
  editPair: (k) => { editPair = k; selectedPoint = -1; drawPairUi(); drawEditor(); },
  // the screen position of control point i of the edited pair (for REAL drags)
  // index i is into the outline AS DRAWN in the editor (the tail's points
  // included on the bottom pair) — the same index a pointer drag picks up
  pointScreen: (i) => { const r = ed.getBoundingClientRect(); const p = shownOutline().points[i]; return [r.left + (toX(p[0]) / EW) * r.width, r.top + (toY(p[1]) / EH) * r.height]; },
  shownTags: () => shownOutline().tags.map((t) => t.slice()),
  shownPoints: () => shownOutline().points.map((p) => p.slice()),
  uvScreen: (u, w) => { const r = ed.getBoundingClientRect(); return [r.left + (toX(u) / EW) * r.width, r.top + (toY(w) / EH) * r.height]; },
  editorStatus: () => edStatus,
  blockedCount: () => stats.blocked,
  setBackdrop: (o) => { Object.assign(backdrop, o); drawEditor(); },
  flushBuild: () => { if (pending) { cancelAnimationFrame(pending); pending = 0; } buildNow(false); },
  render,
};

refreshDesignList();
resize();
loadParams(params);
