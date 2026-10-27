/* bloom-texture-lab.js — the page for the surface-texture DISCOVERY
   prototype. Not shipped, not linked. Every geometry decision is in
   bloom-texture-lab-core.js; this file only draws A and B side by side on one
   camera and exposes `window.__lab` for tools/shot-bloom-texture-lab.mjs. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as C from './bloom-texture-lab-core.js';
import { DEFAULTS } from './bloom-registry.js';

const $ = (id) => document.getElementById(id);
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setScissorTest(true);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 5000);
camera.up.set(0, 0, 1);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = false;

function makeScene() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x0b0b0d);
  s.add(new THREE.HemisphereLight(0xffffff, 0x303038, 0.7));
  const k = new THREE.DirectionalLight(0xffffff, 1.9); k.position.set(-80, -60, 35); s.add(k); // raking, so a 0.3 mm relief reads
  const r = new THREE.DirectionalLight(0x9fb8ff, 0.5); r.position.set(60, 40, -30); s.add(r);
  return s;
}
const scenes = { A: makeScene(), B: makeScene() };
const material = new THREE.MeshStandardMaterial({ color: 0xe9e4dc, roughness: 0.62, metalness: 0.0, side: THREE.FrontSide });
const meshes = { A: null, B: null };

const ui = () => ({
  state: $('state').value, type: $('type').value, heightMm: Number($('height').value), lambda: Number($('lambda').value),
  mode: $('mode').value, edgeMm: Number($('edge').value), split: $('split').value,
  maskBeads: $('maskBeads').checked, maskHoleRims: $('maskHoleRims').checked, maskFeet: $('maskFeet').checked, maskCreases: $('maskCreases').checked,
  flat: $('flat').checked,
});
function paintValues() {
  $('heightV').textContent = `${Number($('height').value).toFixed(2)} mm`;
  $('lambdaV').textContent = `${Number($('lambda').value).toFixed(2)} mm`;
  $('edgeV').textContent = `${Number($('edge').value).toFixed(2)} mm`;
}

let soupKey = null, soup = null, prepKey = null, prep = null;
const status = (t) => { $('status').textContent = t; };
const tick = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
let building = null, lastInfo = null;

async function rebuild() {
  const o = ui(); paintValues();
  const t0 = performance.now();
  if (soupKey !== o.state) {
    status('building the shipped bloom (bloom-geometry.js, export mode)…'); await tick();
    soup = C.buildTagged({ ...DEFAULTS, ...C.DEMO_STATES[o.state] }); soupKey = o.state; prepKey = null;
  }
  const pk = `${o.state}|${o.edgeMm}|${o.split}`;
  if (prepKey !== pk) {
    status(`subdividing to ${o.edgeMm} mm edges (${o.split})…`); await tick();
    prep = C.prepare(soup, o.edgeMm, { split: o.split }); prepKey = pk;
  }
  status('displacing…'); await tick();
  const info = { shippedTris: soup.triCount, tris: prep.tri.length / 3 };
  for (const arm of ['A', 'B']) {
    let P;
    if (o.type === 'none' || o.heightMm === 0) P = prep.P;
    else P = C.displace(prep, arm, { type: o.type, lambda: o.lambda, heightMm: o.heightMm, mode: o.mode, ...o }).P;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(P), 3));
    geom.setIndex(prep.tri.length > 65535 ? new THREE.Uint32BufferAttribute(prep.tri, 1) : new THREE.Uint16BufferAttribute(prep.tri, 1));
    geom.computeVertexNormals();
    if (meshes[arm]) { scenes[arm].remove(meshes[arm]); meshes[arm].geometry.dispose(); }
    const m = new THREE.Mesh(geom, material); meshes[arm] = m; scenes[arm].add(m);
    info[arm] = { P };
  }
  material.flatShading = o.flat; material.needsUpdate = true;
  lastInfo = info;
  $('readout').textContent =
    `shipped ${info.shippedTris.toLocaleString()} tris (export)\n` +
    `subdivided ${info.tris.toLocaleString()} tris at ${o.edgeMm} mm (${o.split} split)\n` +
    `= ${(info.tris / 1.5e6 * 100).toFixed(1)}% of the 1,500,000 export budget\n` +
    `relief ${o.type} · ${o.heightMm} mm · ${o.lambda} mm · ${o.mode}\n` +
    (o.lambda < 4 * o.edgeMm ? `! feature size under 4 edges: the relief is under-sampled\n` : '');
  status(`built in ${(performance.now() - t0).toFixed(0)} ms`); dirty = true;
  if (!camSet) setView('whole');
}
let camSet = false;

function pointOfFeature(feature) {
  const f = C.FEATURES.indexOf(feature);
  for (let v = 0; v < prep.P.length / 3; v++) if (prep.vFeat[v] === f) return [prep.P[v * 3], prep.P[v * 3 + 1], prep.P[v * 3 + 2]];
  return null;
}
function pointOfOrgan(organ) {
  const o = C.ORGANS.indexOf(organ);
  for (let v = 0; v < prep.P.length / 3; v++) if (prep.vOrgan[v] === o) return [prep.P[v * 3], prep.P[v * 3 + 1], prep.P[v * 3 + 2]];
  return null;
}
/* VIEWS FRAME THE SUBJECT, not the whole bloom (a seam is two percent of a
   whole-bloom cell). Each is a target and a distance read off the mesh. */
function setView(name) {
  const box = new THREE.Box3().setFromArray(prep.P);
  const c = box.getCenter(new THREE.Vector3()), R = box.getSize(new THREE.Vector3()).length() / 2;
  let target = c, dist = R * 2.6, dir = new THREE.Vector3(0.55, -0.75, 0.62).normalize();
  if (name === 'hub') { target = new THREE.Vector3(0, 0, 0); dist = 30; dir = new THREE.Vector3(0.45, -0.6, 0.66).normalize(); }
  if (name === 'tip') {
    let best = null, bd = -1; // the farthest petal vertex from the axis
    for (let v = 0; v < prep.P.length / 3; v++) if (C.ORGANS[prep.vOrgan[v]] === 'petal') { const d = Math.hypot(prep.P[v * 3], prep.P[v * 3 + 1]); if (d > bd) { bd = d; best = v; } }
    const tp = new THREE.Vector3(prep.P[best * 3], prep.P[best * 3 + 1], prep.P[best * 3 + 2]);
    /* frame the last ~10 mm of that petal: the mean of its vertices within 8 mm */
    const acc = new THREE.Vector3(); let n = 0;
    for (let v = 0; v < prep.P.length / 3; v++) { const q = new THREE.Vector3(prep.P[v * 3], prep.P[v * 3 + 1], prep.P[v * 3 + 2]); if (q.distanceTo(tp) < 8) { acc.add(q); n++; } }
    target = acc.multiplyScalar(1 / n); dist = 19;
    const radial = new THREE.Vector3(tp.x, tp.y, 0).normalize();
    dir = new THREE.Vector3(0, 0, 1).addScaledVector(radial, -0.15).addScaledVector(new THREE.Vector3(-radial.y, radial.x, 0), 0.25).normalize();
  }
  if (name === 'hole') { const p = pointOfFeature('holeRim'); if (p) { target = new THREE.Vector3(...p); dist = 14; dir = new THREE.Vector3(0.2, -0.2, 1).normalize(); } }
  if (name === 'stem') { target = new THREE.Vector3(0, 0, -6); dist = 55; dir = new THREE.Vector3(0.7, -0.6, -0.2).normalize(); }
  if (name === 'ring') {
    /* the ring's own extent: its vertices' box, seen from the side and a little above */
    const o = C.ORGANS.indexOf('tube'), bx = new THREE.Box3();
    for (let v = 0; v < prep.P.length / 3; v++) if (prep.vOrgan[v] === o) bx.expandByPoint(new THREE.Vector3(prep.P[v * 3], prep.P[v * 3 + 1], prep.P[v * 3 + 2]));
    if (!bx.isEmpty()) { target = bx.getCenter(new THREE.Vector3()); const r = bx.getSize(new THREE.Vector3()).length() / 2; dist = r * 1.9; dir = new THREE.Vector3(1, -0.35, 0.55).normalize(); }
  }
  camera.position.copy(target).addScaledVector(dir, dist);
  controls.target.copy(target); controls.update(); camSet = true; dirty = true;
}

function render() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) renderer.setSize(w, h, false);
  camera.aspect = (w / 2) / h; camera.updateProjectionMatrix();
  for (const [i, arm] of [[0, 'A'], [1, 'B']]) {
    renderer.setViewport(i * w / 2, 0, w / 2, h); renderer.setScissor(i * w / 2, 0, w / 2, h);
    renderer.render(scenes[arm], camera);
  }
}
/* RENDER ON DEMAND: two copies of a subdivided whole bloom are millions of
   triangles, and a continuous loop in software GL never lets a frame settle. */
let dirty = true;
controls.addEventListener('change', () => { dirty = true; });
window.addEventListener('resize', () => { dirty = true; });
function loop() { if (dirty) { dirty = false; render(); } requestAnimationFrame(loop); }

async function measure() {
  if (!prep || !lastInfo) return;
  status('measuring walls and gaps (every 9th vertex)…'); await tick();
  const base = C.wallAndGap(prep, prep.P, { every: 9, tMax: 2.5 });
  const lines = [];
  for (const arm of ['A', 'B']) {
    const a = C.wallAndGap(prep, lastInfo[arm].P, { every: 9, tMax: 2.5 });
    const by = {};
    base.idx.forEach((v, i) => {
      const f = C.ORGANS[prep.vOrgan[v]] === 'tube' ? 'tubeRing' : C.FEATURES[prep.vFeat[v]];
      const o = by[f] || (by[f] = { n: 0, newly: 0, holeBar: 0 });
      if (base.wall[i] < 2.5) { o.n++; if (base.wall[i] >= 1 && a.wall[i] < 1) o.newly++; }
      if (f === 'holeRim' && base.gap[i] < 2.5 && base.gap[i] >= 1.5 && a.gap[i] < 1.5) o.holeBar++;
    });
    lines.push(`${arm}: ` + Object.entries(by).map(([f, o]) => `${f} ${o.newly}/${o.n} newly<1.0${f === 'holeRim' ? `, hole bar ${o.holeBar}` : ''}`).join(' · '));
  }
  $('readout').textContent += '\n' + lines.join('\n');
  status('measured');
}

for (const id of ['state', 'type', 'height', 'lambda', 'mode', 'split', 'edge', 'maskBeads', 'maskHoleRims', 'maskFeet', 'maskCreases', 'flat']) {
  $(id).addEventListener(id === 'height' || id === 'lambda' || id === 'edge' ? 'change' : 'input', () => { building = rebuild(); });
  if (id === 'height' || id === 'lambda' || id === 'edge') $(id).addEventListener('input', paintValues);
}
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
$('measure').addEventListener('click', measure);

window.__lab = {
  async set(opts) {
    for (const [k, v] of Object.entries(opts)) { const el = $(k); if (!el) throw new Error(`no control ${k}`); if (el.type === 'checkbox') el.checked = !!v; else el.value = String(v); }
    building = rebuild(); await building; render(); dirty = false;
  },
  view(name) { setView(name); render(); dirty = false; },
  info() { return { tris: lastInfo && lastInfo.tris, shippedTris: lastInfo && lastInfo.shippedTris }; },
  ready: null,
};
paintValues();
window.__lab.ready = (building = rebuild());
loop();
