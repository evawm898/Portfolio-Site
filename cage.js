/* cage.js — the /cage page: the three.js view, the registry-driven panel, the
   profile editor (bloom-curve.js's value, refusal-based edits — lantern.js's
   editor, de-stated), the Render / SVG toggle and the two exports. The
   geometry is cage-geometry.js's and nothing here computes any of it. */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SECTIONS, PARAM_SPEC, PRESETS, PRESET_FIELD_IDS, PROFILE_SPEC, defaultParams, applyPreset, randomParams, buildCage, exportStl, exportSvg, PRINT_NOTE, FDM_OVERHANG_DEG } from './cage-geometry.js';
import { curveFunction, proposeEdit, nearestOnCurve, quantise, cloneCurve, curveEquals } from './bloom-curve.js';

let params = defaultParams();
let model = null;
let builds = 0;
let lastError = null;

/* ---------------- three ---------------- */
const canvas = document.getElementById('cage-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0c);
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 5000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = false;
scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a30, 1.4));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-1, 2, 1.5); scene.add(key);
const rim = new THREE.DirectionalLight(0x9fd0d0, 0.8); rim.position.set(1.5, -0.5, -1.5); scene.add(rim);
// The model is Z-up; one rotation lays it into three's Y-up (bug.js's own move).
const root = new THREE.Group();
root.rotation.x = -Math.PI / 2;
scene.add(root);
const MAT = new THREE.MeshStandardMaterial({ color: 0xb9b6ae, roughness: 0.42, metalness: 0.55, flatShading: true });
let meshObj = null;
let viewName = 'three';

function buildMeshObject() {
  if (meshObj) { root.remove(meshObj); meshObj.geometry.dispose(); meshObj = null; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(model.mesh.positions, 3));
  g.setIndex(model.mesh.indices);
  const flat = g.toNonIndexed(); g.dispose();
  flat.computeVertexNormals();
  meshObj = new THREE.Mesh(flat, MAT);
  root.add(meshObj);
}
function modelBox() {
  const P = model.mesh.positions; let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < P.length; i += 3) { x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); z0 = Math.min(z0, P[i + 2]); z1 = Math.max(z1, P[i + 2]); }
  return { x0, x1, y0, y1, z0, z1 };
}
/* Views framed to the cage's own box: model (x, y, z) -> three (x, z, -y). The door faces model -y, i.e. three +z, the front. */
function setView(name) {
  viewName = name;
  document.querySelectorAll('#viewButtons button').forEach((b) => b.classList.toggle('is-on', b.dataset.view === name));
  const b = modelBox();
  const c = new THREE.Vector3((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, -(b.y0 + b.y1) / 2);
  const r = 0.5 * Math.hypot(b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0);
  const d = r / Math.sin((camera.fov * Math.PI) / 360) * 1.08;
  const dirs = { three: new THREE.Vector3(0.55, 0.42, 0.72), front: new THREE.Vector3(0, 0.02, 1), side: new THREE.Vector3(1, 0.02, 0), top: new THREE.Vector3(0, 1, 0.0001) };
  const dir = dirs[name].clone().normalize();
  camera.position.copy(c).addScaledVector(dir, d);
  camera.up.set(0, name === 'top' ? 0 : 1, name === 'top' ? -1 : 0);
  controls.target.copy(c);
  camera.near = d / 50; camera.far = d * 10; camera.updateProjectionMatrix();
  controls.update();
  render();
}
function resize() {
  const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); render();
}
function render() { renderer.render(scene, camera); }
controls.addEventListener('change', render);
window.addEventListener('resize', resize);
document.querySelectorAll('#viewButtons button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));

/* ---------------- Render / SVG ---------------- */
let mainMode = 'render';
const svgStage = document.getElementById('svgStage');
document.querySelectorAll('#viewToggle button').forEach((b) => b.addEventListener('click', () => {
  mainMode = b.dataset.main;
  document.querySelectorAll('#viewToggle button').forEach((x) => x.classList.toggle('is-on', x === b));
  drawMain();
}));
function drawMain() {
  const svg = mainMode === 'svg';
  svgStage.hidden = !svg; document.body.classList.toggle('is-svg', svg);
  if (svg) svgStage.innerHTML = exportSvg(model).replace(/ width="[^"]*mm" height="[^"]*mm"/, '');
  render();
}

/* ---------------- panel (generated from the registry) ---------------- */
const host = document.getElementById('controls');
const secEl = {}, ctrlEl = {};
for (const s of SECTIONS) {
  const d = document.createElement('details');
  d.className = 'cg-sec'; d.dataset.sec = s.id;
  if (s.open) d.open = true;
  d.innerHTML = `<summary>${s.label}</summary><div class="cg-sec-body"></div>`;
  (s.parent ? secEl[s.parent].querySelector('.cg-sec-body') : host).appendChild(d);
  secEl[s.id] = d;
}
const fmtVal = (s, v) => (s.kind === 'range' ? `${(+v).toFixed(s.step < 0.1 ? 2 : s.step < 1 ? 1 : 0)}${s.unit ? ' ' + s.unit : ''}` : '');
function makeCtrl(s, id, onInput) {
  const w = document.createElement('div');
  w.className = 'cg-ctrl' + (s.kind === 'bool' ? ' cg-bool' : '');
  if (s.kind === 'range') w.innerHTML = `<label for="${id}"><span>${s.label}</span><output id="${id}-out"></output></label><input type="range" id="${id}" min="${s.min}" max="${s.max}" step="${s.step}">`;
  else if (s.kind === 'choice') w.innerHTML = `<label for="${id}"><span>${s.label}</span></label><select id="${id}">${s.options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`;
  else w.innerHTML = `<label><input type="checkbox" id="${id}"> ${s.label}</label>`;
  const input = w.querySelector('input,select');
  input.addEventListener('input', () => onInput(s.kind === 'range' ? +input.value : s.kind === 'bool' ? input.checked : input.value));
  return w;
}
for (const s of PARAM_SPEC) {
  const w = makeCtrl(s, s.id, (v) => {
    if (s.id === 'preset') { if (v !== 'custom') params = applyPreset(params, v); else params.preset = 'custom'; }
    else { params[s.id] = v; if (PRESET_FIELD_IDS.includes(s.id)) params.preset = 'custom'; }
    writeInputs(); scheduleBuild();
  });
  const body = secEl[s.section].querySelector('.cg-sec-body');
  const sub = [...body.children].find((c) => c.tagName === 'DETAILS');
  if (sub) body.insertBefore(w, sub); else body.appendChild(w);
  ctrlEl[s.id] = w;
}
function writeInputs() {
  for (const s of PARAM_SPEC) {
    const el = ctrlEl[s.id].querySelector('input,select');
    if (s.kind === 'bool') el.checked = !!params[s.id]; else el.value = String(params[s.id]);
    if (s.kind === 'range') document.getElementById(`${s.id}-out`).textContent = fmtVal(s, params[s.id]);
  }
  ctrlEl.preset.querySelector('option[value="custom"]').hidden = params.preset !== 'custom';
  applyVisibility();
  profileEditor.render();
}
function applyVisibility() {
  for (const s of PARAM_SPEC) ctrlEl[s.id].hidden = !!(s.visibleWhen && !s.visibleWhen(params));
  for (const s of [...SECTIONS].reverse()) {
    const d = secEl[s.id];
    const own = PARAM_SPEC.filter((p) => p.section === s.id).some((p) => !ctrlEl[p.id].hidden);
    const kids = SECTIONS.filter((c) => c.parent === s.id).some((c) => !secEl[c.id].hidden);
    d.hidden = !(own || kids || s.id === 'body');
  }
}

/* ---------------- the profile editor ----------------
   The side profile, mirrored about the axis: x of the curve is the HEIGHT
   fraction (drawn upward), y the RADIUS fraction (drawn outward both ways).
   Drag a point; double-click the curve to add one, a point to remove it. An
   edit the spec refuses leaves the value where it was and says why. */
const NS = 'http://www.w3.org/2000/svg';
const profileEditor = (() => {
  const sideHost = secEl.body.querySelector('.cg-sec-body');
  const wrap = document.createElement('div');
  const title = document.createElement('p'); title.className = 'cg-note'; title.textContent = 'Side profile — drag a point (height up, radius out); double-click the curve to add one, a point to remove it';
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'cg-profile'); svg.setAttribute('id', 'profileEditor'); svg.setAttribute('tabindex', '0');
  const status = document.createElement('p'); status.className = 'cg-curve-status'; status.id = 'profileStatus';
  wrap.append(title, svg, status);
  // after the Preset / Width / Height / Cross-section rows, before the Fine drop-down
  const sub = [...sideHost.children].find((c) => c.tagName === 'DETAILS');
  sideHost.insertBefore(wrap, sub);
  const pad = 0.08, Y = PROFILE_SPEC.y[1];
  // view: sx = ±radius, sy = 1 - height; the box runs x ∈ [-Y, Y], y ∈ [0, 1]
  svg.setAttribute('viewBox', `${-Y - pad} ${-pad - 0.45} ${2 * Y + 2 * pad} ${1 + 2 * pad + 0.45}`);
  const HANDLE = 0.028;
  let drag = null, focus = -1, refusal = null;
  const counts = { input: 0, change: 0, refused: 0 };
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
  const toVb = (cx, cy) => { const p = svg.createSVGPoint(); p.x = cx; p.y = cy; const m = svg.getScreenCTM(); return m ? p.matrixTransform(m.inverse()) : null; };
  const toClient = (xy) => { const p = svg.createSVGPoint(); p.x = xy[1]; p.y = 1 - xy[0]; return p.matrixTransform(svg.getScreenCTM()); };
  const layers = el('g', {}), marks = el('g', {});
  svg.append(layers, marks);
  function render() {
    layers.replaceChildren();
    layers.append(el('rect', { class: 'box', x: -Y, y: 0, width: 2 * Y, height: 1 }));
    layers.append(el('line', { class: 'axis', x1: 0, y1: -0.45, x2: 0, y2: 1 }));
    const f = curveFunction(params.profile.points, PROFILE_SPEC);
    const n = 64, d = [], dm = [];
    for (let k = 0; k <= n; k++) { const x = k / n, y = f(x) ?? 1; d.push(`${k ? 'L' : 'M'}${y.toFixed(4)} ${(1 - x).toFixed(4)}`); dm.push(`${k ? 'L' : 'M'}${(-y).toFixed(4)} ${(1 - x).toFixed(4)}`); }
    layers.append(el('path', { class: 'curve mirror', d: dm.join(' ') }));
    layers.append(el('path', { class: 'curve', d: d.join(' ') }));
    // the top cap, dashed, so the profile is read with the top it will carry (the geometry's own law, scaled by the controls)
    if (model && model.info.Hc > 0) {
      const rT = f(1) ?? 1, hc = model.info.Hc / params.heightMm;
      const dc = [], dcm = [];
      for (let k = 0; k <= 32; k++) { const s = k / 32, r = rT * capFrac(s), y = -s * hc; dc.push(`${k ? 'L' : 'M'}${r.toFixed(4)} ${y.toFixed(4)}`); dcm.push(`${k ? 'L' : 'M'}${(-r).toFixed(4)} ${y.toFixed(4)}`); }
      layers.append(el('path', { class: 'cap', d: dc.join(' ') })); layers.append(el('path', { class: 'cap', d: dcm.join(' ') }));
    }
    const label = (attrs, text) => { const t = el('text', { class: 'lbl', 'font-size': 0.06, ...attrs }); t.textContent = text; layers.append(t); };
    label({ x: -Y + 0.02, y: 0.98 }, 'base'); label({ x: -Y + 0.02, y: 0.07 }, 'top ring');
    const pts = params.profile.points, have = [...marks.children];
    pts.forEach((p, i) => {
      const c = have[i] || marks.appendChild(document.createElementNS(NS, 'circle'));
      const lock = i === 0 || i === pts.length - 1;
      const attrs = { class: 'pt' + (lock ? ' is-lock' : '') + (i === focus ? ' is-focus' : ''), 'data-i': i, cx: p[1], cy: 1 - p[0], r: HANDLE };
      for (const [k, v] of Object.entries(attrs)) if (c.getAttribute(k) !== String(v)) c.setAttribute(k, v);
    });
    for (let k = pts.length; k < have.length; k++) have[k].remove();
    status.textContent = refusal ? `refused — ${refusal}` : '';
  }
  const capFrac = (s) => { const sh = params.topShape; if (sh === 'dome') return Math.sqrt(Math.max(0, 1 - s * s)); if (sh === 'spire') return Math.pow(1 - s, 1.35); if (sh === 'onion') return Math.pow(Math.max(0, 1 - Math.pow(s, 2.6)), 0.55) * (1 + 0.34 * Math.sin(Math.PI * Math.pow(s, 0.85))); return 0; };
  const handleAt = (cx, cy) => { let best = null; params.profile.points.forEach((p, i) => { const q = toClient(p), dd = Math.hypot(q.x - cx, q.y - cy); if (dd <= 12 && (!best || dd < best.d)) best = { i, d: dd }; }); return best; };
  function edit(op, { during = false } = {}) {
    const r = proposeEdit(params.profile, PROFILE_SPEC, null, op);
    if (!r.accepted) { refusal = r.reason; counts.refused++; render(); return false; }
    if (r.unchanged) return true;
    refusal = null; params.profile = r.value; params.preset = 'custom';
    counts.input++; if (!during) counts.change++;
    writeInputs(); scheduleBuild();
    return true;
  }
  // quantised, NEVER clamped: a drag past the box is refused by the spec and the point stays where it was
  const q = (xy) => [quantise(xy[0]), quantise(xy[1])];
  svg.addEventListener('mousedown', (ev) => { if (ev.button === 0 && handleAt(ev.clientX, ev.clientY)) ev.preventDefault(); });
  svg.addEventListener('pointerdown', (ev) => { const h = ev.button === 0 ? handleAt(ev.clientX, ev.clientY) : null; if (!h) return; focus = h.i; drag = { i: h.i, id: ev.pointerId, moved: false }; svg.setPointerCapture(ev.pointerId); render(); });
  svg.addEventListener('pointermove', (ev) => { if (!drag || ev.pointerId !== drag.id) return; const v = toVb(ev.clientX, ev.clientY); if (!v) return; drag.moved = true; edit({ op: 'move', side: 'left', i: drag.i, xy: q([1 - v.y, Math.abs(v.x)]) }, { during: true }); });
  const endDrag = (ev) => { if (!drag || ev.pointerId !== drag.id) return; const moved = drag.moved; drag = null; if (moved) counts.change++; };
  svg.addEventListener('pointerup', endDrag); svg.addEventListener('pointercancel', endDrag);
  svg.addEventListener('dblclick', (ev) => {
    const h = handleAt(ev.clientX, ev.clientY);
    if (h) { if (h.i === 0 || h.i === params.profile.points.length - 1) return; edit({ op: 'remove', side: 'left', i: h.i }); return; }
    const v = toVb(ev.clientX, ev.clientY); if (!v) return;
    const near = nearestOnCurve(params.profile, PROFILE_SPEC, 'left', [1 - v.y, Math.abs(v.x)], [1, 1]);
    if (near && near.d < 0.08) edit({ op: 'insert', side: 'left', after: near.span, xy: q([near.at[0], near.at[1]]) });
  });
  return { render, counts, svg, edit, pointScreen: (i) => { const c = toClient(params.profile.points[i]); return [c.x, c.y]; } };
})();

/* ---------------- build ---------------- */
let buildTimer = 0;
function scheduleBuild() { if (buildTimer) return; buildTimer = requestAnimationFrame(() => { buildTimer = 0; rebuild(); }); }
function rebuild() {
  try { model = buildCage(params); lastError = null; }
  catch (e) { lastError = e && e.message ? e.message : String(e); document.getElementById('readout').innerHTML = `<b class="bad">cannot build — ${lastError}</b>`; return; }
  builds++;
  buildMeshObject();
  writeReadout();
  if (mainMode === 'svg') drawMain(); else render();
  profileEditor.render();
}
function writeReadout() {
  const i = model.info;
  const t = document.getElementById('told'); t.textContent = model.told.length ? model.told.map((s) => `· ${s}`).join('\n') : ''; t.hidden = !model.told.length;
  const over = i.overhang.fdmSupport ? `<b class="bad">${i.overhang.deg.toFixed(0)}° from horizontal at ${i.overhang.where}</b> — under ${FDM_OVERHANG_DEG}°, so an FDM print wants support there; SLS does not` : `${i.overhang.deg.toFixed(0)}° from horizontal at ${i.overhang.where}`;
  const door = i.door ? `${i.door.shape} ${i.door.W.toFixed(0)} × ${i.door.Dh.toFixed(0)} mm, sill ${i.door.z0.toFixed(1)} mm up` : 'none';
  document.getElementById('readout').innerHTML = [
    `<b>${i.widthMm.toFixed(0)} × ${i.heightMm.toFixed(0)} mm</b> overall · ${i.triangles.toLocaleString()} triangles · ${i.parts} closed parts`,
    `bars <b>${i.barCount}</b>${i.ribCount ? ` + ${i.ribCount} dome ribs` : ''} (${i.barsEnd === 'apex' ? 'converge at the apex' : 'end at the top ring'}) · rings ${i.ringZ.length} between base and top`,
    i.collar ? `collar boss r ${i.collar.rc.toFixed(1)} mm (bead ${(i.collar.rc * 1.14).toFixed(1)}), the bars meeting it ${i.collar.pitch.toFixed(2)} mm apart at ${(100 * (1 - i.collar.sC)).toFixed(0)}% of the cap; the hanger stands on it` : 'flat top',
    `${i.shoulderZ.length ? `${i.shoulderZ.length} profile shoulder${i.shoulderZ.length > 1 ? 's' : ''} auto-ringed` : 'no profile shoulder'}${i.scallops ? ` · skirt: ${i.scallops} scallops, cusps on bars` : ''}`,
    `door ${door}`,
    `print: ${PRINT_NOTE}; shallowest wire ${over}`,
  ].join('\n');
}

/* ---------------- exports ---------------- */
function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0); }
document.getElementById('exportStl').addEventListener('click', () => download('cage.stl', new Blob([exportStl(model)], { type: 'model/stl' })));
document.getElementById('exportSvg').addEventListener('click', () => download('cage.svg', new Blob([exportSvg(model)], { type: 'image/svg+xml' })));

/* ---------------- randomize / reset ---------------- */
let randomSeed = 1;
document.getElementById('randomBtn').addEventListener('click', () => { params = randomParams((Date.now() ^ (randomSeed++ * 2654435761)) >>> 0); writeInputs(); rebuild(); });
document.getElementById('resetBtn').addEventListener('click', () => { params = defaultParams(); writeInputs(); rebuild(); });

/* ---------------- test chrome ---------------- */
window.__cage = {
  getParams: () => JSON.parse(JSON.stringify(params)),
  setParams: (p) => { params = { ...params, ...JSON.parse(JSON.stringify(p)) }; if (p.profile) params.profile = cloneCurve(p.profile); writeInputs(); rebuild(); return builds; },
  setPreset: (id) => { params = applyPreset(params, id); writeInputs(); rebuild(); return builds; },
  info: () => (model ? JSON.parse(JSON.stringify({ ...model.info, told: model.told })) : null),
  stlBytes: () => Array.from(exportStl(model)),
  svgText: () => exportSvg(model),
  builds: () => builds, lastError: () => lastError, mainMode: () => mainMode, viewName: () => viewName,
  editor: profileEditor, setView, curveEquals,
};

/* ---------------- boot ---------------- */
writeInputs();
rebuild();
resize();
setView('three');
