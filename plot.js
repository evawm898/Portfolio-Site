// plot.js — /plot, the curve viewer for the bloom generator's grid export.
//
// WHAT THIS IS. The bloom's `Get grid ↓` writes a glTF whose primitives are
// LINE_STRIPs: the petal's own construction curves, one family running along
// the petal (`extras.kind === 'u'`) and one across it (`'v'`). This page reads
// them, projects them and strokes them white on black. That is the whole
// render — there is no field to design, no boundary to close and no fill to
// clip, and it should stay that way.
//
// IT IS NOT /print AND SHARES NO CODE WITH IT. /print goes mesh → silhouette →
// fill and INFERS structure from triangles: silhouette extraction, crease
// detection, the winding rule, scan directions, the infill families. None of
// that applies to a file that already contains its own curves, so none of it is
// imported here and /print is untouched by this page.
//
// THE LOOK IS ADDITIVE, WHICH DECIDES A DEFAULT. Overlapping petals brighten
// where they cross because the fragments genuinely add — per-line alpha cannot
// produce it. The consequence is that a line already drawn at full white has
// no headroom to brighten, so the single-line level is the glow control and
// ships below white (see `brightness`).
//
// The one-time event wiring happens ONCE at module load against mutable
// module-level state, the same discipline /print's loader follows: loading a
// different grid reassigns that state and the already-registered listeners
// keep working, rather than being re-bound per file.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import {
  readGridScene, selectStrips, stripsToSegments, boundsOf,
  densityToEvery, everyLabel, dimToFog, MIN_DENSITY, MAX_DENSITY,
} from './plot-grid.js';

const DEFAULT_GRID = 'assets/plot-test/bloom-grid-live.glb';

const canvas = document.getElementById('plot-canvas');
const logEl = document.getElementById('plot-log');
const drawEl = document.getElementById('plot-drawstate');
const frameEl = document.getElementById('plot-framestate');
const dropHint = document.getElementById('plot-dropzone-hint');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 1);
// NoToneMapping is the default and is load-bearing rather than incidental: it
// is what makes a single line's brightest possible pixel exactly the material
// colour, which is the calibration the additive-blending check rests on.
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 4000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.09;

// THE SOURCE IS Z-UP. glTF is Y-up, and the exporter writes the bloom's own
// Z-up coordinates into it, so the correction belongs here and is one rotation
// on the container every grid is parented to: +Z becomes +Y.
const container = new THREE.Group();
container.rotation.x = -Math.PI / 2;
scene.add(container);

// One material for both families: weight, brightness and the fog are
// properties of the drawing, not of a family.
const material = new LineMaterial({
  color: 0xffffff,
  linewidth: 1.2,
  worldUnits: false,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthTest: false,
  depthWrite: false,
});
material.fog = true;

/* ---- mutable module state — one grid at a time -------------------------- */
let strips = [];            // every LINE_STRIP in the loaded file
let gridInfo = null;        // readGridScene()'s report
let assetExtras = null;     // the export's own asset.extras (mode, units, …)
let sourceName = '';
let localBounds = null;     // bounds of every strip, in grid space
let objects = { u: null, v: null, other: null };
let lastError = '';
let fogOn = false;
let lastFrameMs = 0;
let dirty = true;
let drawn = { u: 0, v: 0, other: 0, total: 0, uLines: 0, vLines: 0 };

const ui = {
  families: document.getElementById('families'),
  uDensity: document.getElementById('uDensity'),
  vDensity: document.getElementById('vDensity'),
  weight: document.getElementById('weight'),
  brightness: document.getElementById('brightness'),
  depthDim: document.getElementById('depthDim'),
};
const out = {
  families: document.getElementById('familiesOut'),
  uDensity: document.getElementById('uDensityOut'),
  vDensity: document.getElementById('vDensityOut'),
  weight: document.getElementById('weightOut'),
  brightness: document.getElementById('brightnessOut'),
  depthDim: document.getElementById('depthDimOut'),
};

const tracks = {
  u: document.getElementById('uDensityTrack'),
  v: document.getElementById('vDensityTrack'),
};

const readUI = () => ({
  families: ui.families.value,
  uDensity: +ui.uDensity.value,
  vDensity: +ui.vDensity.value,
  weight: +ui.weight.value,
  brightness: +ui.brightness.value / 100,
  depthDim: +ui.depthDim.value / 100,
});

/* ---- sizing ------------------------------------------------------------- */
function resize() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const size = new THREE.Vector2();
  renderer.getDrawingBufferSize(size);
  material.resolution.copy(size);
  dirty = true;
}
window.addEventListener('resize', resize);

/* ---- building the lines ------------------------------------------------- */
function clearObjects() {
  for (const k of Object.keys(objects)) {
    const o = objects[k];
    if (!o) continue;
    container.remove(o);
    o.geometry.dispose();
    objects[k] = null;
  }
}

function clearCurrentGrid() {
  clearObjects();
  strips = []; gridInfo = null; assetExtras = null; localBounds = null;
  deadRange = { u: MIN_DENSITY, v: MIN_DENSITY };
  drawn = { u: 0, v: 0, other: 0, total: 0, uLines: 0, vLines: 0 };
}

function buildFamily(kind, chosen) {
  const mine = chosen.filter(s => s.kind === kind);
  if (objects[kind]) {
    container.remove(objects[kind]);
    objects[kind].geometry.dispose();
    objects[kind] = null;
  }
  if (!mine.length) return { segments: 0, lines: 0 };
  const { positions, segments } = stripsToSegments(mine);
  const geom = new LineSegmentsGeometry();
  geom.setPositions(positions);
  const obj = new LineSegments2(geom, material);
  obj.name = `plot_${kind}`;
  obj.frustumCulled = false;      // two objects; culling buys nothing and a
                                  // line geometry's bounds are a nuisance
  container.add(obj);
  objects[kind] = obj;
  return { segments, lines: mine.length };
}

/* Rebuild the drawn segment buffers from the current control values. Cheap by
   construction — the whole sample grid is ~15k segments — so the density
   sliders rebuild rather than mask. */
function rebuild() {
  const s = readUI();
  const chosen = selectStrips(strips, s);
  const u = buildFamily('u', chosen);
  const v = buildFamily('v', chosen);
  const other = buildFamily('other', chosen);
  drawn = {
    u: u.segments, v: v.segments, other: other.segments,
    total: u.segments + v.segments + other.segments,
    uLines: u.lines, vLines: v.lines, otherLines: other.lines,
  };
  applyStyle();
  dirty = true;
}

function applyStyle() {
  const s = readUI();
  // Both are UNIFORM accessors on LineMaterial (`linewidth`, and `color` over
  // `uniforms.diffuse`), so neither wants `needsUpdate`: that bumps the
  // material version and sends the renderer back through program acquisition on
  // every input event of a slider drag. The one thing that genuinely changes
  // the PROGRAM here is fog appearing or going away, and updateFog() owns it.
  material.linewidth = s.weight;
  material.color.setScalar(s.brightness);
  dirty = true;
}

/* ---- the view ----------------------------------------------------------- */
function worldSphere() {
  if (!localBounds) return null;
  container.updateMatrixWorld(true);
  const c = new THREE.Vector3(...localBounds.center).applyMatrix4(container.matrixWorld);
  return { center: c, radius: Math.max(localBounds.radius, 1e-3) };
}

/* FIT THE PROJECTED EXTENT, NOT THE BOUNDING SPHERE. A bloom grid is a wide
   flat disc: its bounding sphere is set by the tip-to-tip span, so a sphere fit
   leaves most of a 16:9 frame empty above and below it. This projects every
   grid point onto the camera's own right/up/forward basis and fits the two
   half-extents against the two field-of-view angles, so the drawing fills the
   frame at any aspect ratio and from any direction. ~16k points, once per
   reset. */
function fitCamera(dirArr, margin = 1.06) {
  if (!localBounds || !strips.length) return false;
  container.updateMatrixWorld(true);
  const M = container.matrixWorld;
  const center = new THREE.Vector3(...localBounds.center).applyMatrix4(M);
  const dir = new THREE.Vector3(...dirArr);
  if (dir.lengthSq() < 1e-12) dir.set(0, 0, 1);
  dir.normalize();
  let right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir);
  if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
  right.normalize();
  const up = new THREE.Vector3().crossVectors(dir, right).normalize();

  // Separate min and max on each screen axis, not max|offset|: a symmetric
  // bound around a lopsided drawing centres the BOX and leaves the drawing
  // riding high in the frame.
  let minR = Infinity, maxR = -Infinity, minU = Infinity, maxU = -Infinity, depth = 0;
  const p = new THREE.Vector3();
  for (const s of strips) {
    for (let i = 0; i < s.count; i++) {
      p.set(s.points[i * 3], s.points[i * 3 + 1], s.points[i * 3 + 2])
        .applyMatrix4(M).sub(center);
      const r = p.dot(right), u = p.dot(up);
      if (r < minR) minR = r; if (r > maxR) maxR = r;
      if (u < minU) minU = u; if (u > maxU) maxU = u;
      depth = Math.max(depth, p.dot(dir));
    }
  }
  const hw = (maxR - minR) / 2, hh = (maxU - minU) / 2;
  const look = center.clone()
    .addScaledVector(right, (minR + maxR) / 2)
    .addScaledVector(up, (minU + maxU) / 2);
  const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const tanX = tanY * Math.max(camera.aspect, 1e-3);
  const dist = Math.max(hh / tanY, hw / tanX) * margin + depth;

  camera.position.copy(look).addScaledVector(dir, Math.max(dist, 1e-3));
  camera.near = Math.max(dist * 0.001, 0.01);
  camera.far = dist * 8;
  camera.updateProjectionMatrix();
  controls.target.copy(look);
  controls.update();
  dirty = true;
  return true;
}

// A three-quarter view: enough elevation to read the whorls apart, not so much
// that the grid flattens into a rosette.
const HOME_VIEW = [0.62, 0.46, 1];
function resetView() { fitCamera(HOME_VIEW); }

/* THE DEPTH DIM IS RE-SOLVED EVERY FRAME because it is stated relative to the
   model as the camera currently sees it: `near` is pinned at the nearest point
   of the grid and the far plane is solved so the FARTHEST point lands at
   exactly the amount asked for. Black fog under additive blending is a
   multiply — mix(rgb, black, f) — so a far line simply adds less. */
function updateFog() {
  const s = readUI();
  const sph = worldSphere();
  let fog = null;
  if (sph && s.depthDim > 0) {
    const dCenter = camera.position.distanceTo(sph.center);
    fog = dimToFog(s.depthDim, dCenter - sph.radius, dCenter + sph.radius);
  }
  if (fog) {
    if (!scene.fog) scene.fog = new THREE.Fog(0x000000, fog.near, fog.far);
    else { scene.fog.near = fog.near; scene.fog.far = fog.far; }
    scene.fog.color.setHex(0x000000);
  } else {
    scene.fog = null;
  }
  const on = !!scene.fog;
  // Three compiles USE_FOG into the program, so the material has to be told
  // when the fog appears or goes away — not when its numbers move.
  if (on !== fogOn) { fogOn = on; material.needsUpdate = true; }
  return fog;
}

function render() {
  const t0 = performance.now();
  updateFog();
  renderer.render(scene, camera);
  lastFrameMs = performance.now() - t0;
  dirty = false;
  writeFrameState();
}

renderer.setAnimationLoop(() => {
  const moved = controls.update();
  if (moved || dirty) render();
});

/* ---- read-outs ---------------------------------------------------------- */
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

function gridText() {
  const lines = [];
  if (lastError) lines.push(`<span class="err">${esc(lastError)}</span>`);
  if (!gridInfo) { lines.push('no grid loaded'); return lines.join('\n'); }
  const c = gridInfo.census;
  const x = assetExtras || {};
  lines.push(`<b>${esc(sourceName)}</b>`);
  lines.push(`mode ${esc(x.mode ?? '—')}   units ${esc(x.units ?? '—')}`);
  if (x.petalsRetained != null) {
    lines.push(`petals ${x.petalsRetained} retained · ${x.petalsBuilt} built`
      + `${x.petalsSkipped ? ` · ${x.petalsSkipped} skipped` : ''}`);
  }
  lines.push(`nodes ${gridInfo.petals} petal${gridInfo.petals === 1 ? '' : 's'}`
    + `   attachments ${gridInfo.attachments.length}`);
  lines.push(`strips ${c.strips}  (u ${c.u} · v ${c.v}`
    + (c.other ? ` · untagged ${c.other}` : '') + ')');
  lines.push(`segments ${c.segments}  (u ${c.uSegments} · v ${c.vSegments}`
    + (c.otherSegments ? ` · untagged ${c.otherSegments}` : '') + ')');
  if (c.other) {
    lines.push('<span class="warn">untagged strips carry no extras.kind and are'
      + ' always drawn</span>');
  }
  if (gridInfo.found.triangles) {
    lines.push(`<span class="warn">also in this file: ${gridInfo.found.triangles}`
      + ' triangles, which this page does not draw</span>');
  }
  if (x.gridPointsTotal != null) lines.push(`grid points ${x.gridPointsTotal}`);
  if (x.ringRadiusMm != null) lines.push(`ring radius ${(+x.ringRadiusMm).toFixed(3)} mm`);
  lines.push('source is Z-up; drawn Y-up');
  return lines.join('\n');
}

/* THE SPARSE END OF EACH DENSITY SLIDER HAS DEAD TRAVEL, AND IT IS TOLD
   RATHER THAN TRIMMED. A stride can only thin a family down to its two
   margins, and how many steps that takes depends on how many lines the file
   has per petal — 10 columns bottom out at stride 10 while 29 rows are still
   thinning at 12. So no fixed range is dead-free, an adaptive maximum would
   make the same slider position mean different things on different files, and
   what is left is to say so on the control: the read-out marks the positions
   where dragging further left changes nothing. */
/* THE SET, NOT ITS SIZE. Two different strides can keep the same NUMBER of
   lines while keeping different ones — over ten columns, stride 3 keeps
   {0,3,6,9} and stride 4 keeps {0,4,8,9}, four lines each — so a count
   comparison marks a position as dead where the picture in fact changes.
   Measured: on the shipped grid the count test called eight of the u slider's
   twelve positions dead, where only the genuinely repeated ones are. */
function selectionKey(kind, density) {
  if (!strips.length) return 0;
  const s = readUI();
  const opts = { families: 'both', uDensity: s.uDensity, vDensity: s.vDensity };
  opts[kind === 'u' ? 'uDensity' : 'vDensity'] = density;
  let h = 2166136261;
  for (const t of selectStrips(strips, opts)) {
    if (t.kind !== kind) continue;
    h = Math.imul(h ^ t.petal, 16777619) >>> 0;
    h = Math.imul(h ^ (t.index + 2), 16777619) >>> 0;
  }
  return h;
}
// True when the position one step SPARSER draws exactly the same lines — i.e.
// that step is dead travel. At the sparsest position there is no step below to
// be dead, so it is not marked.
function sparsestReached(kind, density) {
  return density > 1 && selectionKey(kind, density - 1) === selectionKey(kind, density);
}

/* THE RANGE, NAMED — the highest density from which every sparser position
   draws the same lines. `stamenSpread`'s ruling applied to a slider whose dead
   travel is at the LEFT end: the range is not narrowed and the maximum is not
   adaptive; what happens instead is that the span is hatched on the track and
   the read-out prints it. A file's own shape decides it (10 columns per petal
   bottom out well before 29 rows do), so it is recomputed per grid and not
   per frame. */
function deadUpTo(kind) {
  let d = MIN_DENSITY;
  while (d < MAX_DENSITY && sparsestReached(kind, d + 1)) d++;
  return d;
}
let deadRange = { u: MIN_DENSITY, v: MIN_DENSITY };
function applyDeadTravel() {
  for (const kind of ['u', 'v']) {
    const track = tracks[kind];
    const upTo = deadRange[kind];
    if (upTo <= MIN_DENSITY) {
      track.classList.remove('plot-track--dead');
      track.style.removeProperty('--plot-dead');
      delete track.dataset.dead;
      continue;
    }
    track.classList.add('plot-track--dead');
    track.dataset.dead = String(upTo);
    track.style.setProperty('--plot-dead',
      ((upTo - MIN_DENSITY) / (MAX_DENSITY - MIN_DENSITY)).toFixed(4));
  }
}

function drawText() {
  const s = readUI();
  const c = gridInfo ? gridInfo.census : { u: 0, v: 0, uSegments: 0, vSegments: 0, segments: 0 };
  const uEvery = densityToEvery(s.uDensity), vEvery = densityToEvery(s.vDensity);
  const lines = [];
  // Names the RANGE, not just this position: which slider settings are the
  // same picture is what the visitor needs before dragging into them.
  const bottom = k => {
    const upTo = deadRange[k];
    if (upTo <= MIN_DENSITY) return '';
    const here = (k === 'u' ? s.uDensity : s.vDensity) <= upTo;
    return `  (density ${MIN_DENSITY}–${upTo} all draw the same lines${here ? ' — you are in it' : ''})`;
  };
  lines.push(`u  ${everyLabel(uEvery)}  ${drawn.uLines} of ${c.u} lines · ${drawn.u} segments`
    + bottom('u'));
  lines.push(`v  ${everyLabel(vEvery)}  ${drawn.vLines} of ${c.v} lines · ${drawn.v} segments`
    + bottom('v'));
  if (drawn.otherLines) lines.push(`untagged  ${drawn.otherLines} lines · ${drawn.other} segments`);
  lines.push(`drawn ${drawn.total} of ${c.segments} segments`);
  // Read from the CONTROL, not from scene.fog: the fog is re-solved during the
  // render, so a read-out that consulted it printed the PREVIOUS frame's answer
  // and a dim just switched on still said "off".
  if (s.depthDim > 0 && drawn.total > 0) {
    lines.push(`depth dim ${(s.depthDim * 100).toFixed(0)}% — the farthest line in`
      + ` the grid draws at ${((1 - s.depthDim) * 100).toFixed(0)}% of its brightness`);
  } else {
    lines.push('depth dim off — every line at full brightness');
  }
  lines.push(`additive: a single line sits at ${(s.brightness * 100).toFixed(0)}%,`
    + ` so crossings add toward white`);
  return lines.join('\n');
}

function writeGridState() { logEl.innerHTML = gridText(); }

/* CHANGE-DRIVEN, NOT PER-FRAME. Nothing in this read-out depends on the camera,
   and rebuilding it costs four selectStrips sweeps over every strip in the file
   (that is what the dead-travel marker asks). Writing it on every damped orbit
   tick would pay that for text that is identical, so it is written when a
   control moves or a grid loads. The frame time is the one live number and has
   its own line below. */
function writeDrawState() { drawEl.textContent = drawText(); }

// Written from the render, and only when the number on screen would change.
let lastFrameShown = null;
function writeFrameState() {
  const t = `${lastFrameMs.toFixed(1)} ms/frame`;
  if (t === lastFrameShown) return;
  lastFrameShown = t;
  frameEl.textContent = t;
}

function writeOutputs() {
  const s = readUI();
  out.families.textContent = s.families === 'both' ? 'u + v' : `${s.families} only`;
  out.uDensity.textContent = everyLabel(densityToEvery(s.uDensity));
  out.vDensity.textContent = everyLabel(densityToEvery(s.vDensity));
  out.weight.textContent = `${s.weight.toFixed(1)} px`;
  out.brightness.textContent = `${(s.brightness * 100).toFixed(0)}%`;
  out.depthDim.textContent = s.depthDim > 0 ? `${(s.depthDim * 100).toFixed(0)}%` : 'off';
}

/* ---- loading ------------------------------------------------------------ */
const loader = new GLTFLoader();

function adopt(gltf, name) {
  const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
  if (!root) throw new Error('this glTF has no scene');
  root.updateMatrixWorld(true);
  const info = readGridScene(root);
  if (!info.strips.length) {
    const f = info.found;
    const found = [];
    if (f.triangles) found.push(`${f.triangles} triangles in ${f.meshes} mesh${f.meshes === 1 ? '' : 'es'}`);
    if (f.lineSegments) found.push(`${f.lineSegments} LINES primitives`);
    if (f.lineLoops) found.push(`${f.lineLoops} LINE_LOOP primitives`);
    if (f.points) found.push(`${f.points} POINTS primitives`);
    throw new Error(`${name}: no LINE_STRIP primitives — found `
      + `${found.length ? found.join(', ') : 'nothing drawable'}. `
      + 'This looks like a mesh glTF, not a bloom grid export.');
  }
  // Only past the last throw is the displayed grid replaced. A file that
  // cannot be read leaves what is on screen alone.
  clearCurrentGrid();
  strips = info.strips;
  gridInfo = info;
  assetExtras = (gltf.parser && gltf.parser.json && gltf.parser.json.asset
                 && gltf.parser.json.asset.extras) || null;
  sourceName = name;
  localBounds = boundsOf(strips);
  lastError = '';
  deadRange = { u: deadUpTo('u'), v: deadUpTo('v') };
  applyDeadTravel();
  rebuild();
  resetView();
  writeGridState();
  writeDrawState();
}

/* GLTFLoader.parse() CALLED DIRECTLY DOES NOT CATCH ITS OWN EXCEPTIONS —
   garbage bytes, non-JSON text and an empty buffer all throw synchronously out
   of it rather than reaching the error callback that `.load()` swallows
   internally. Both the throw and the callback are handled here for that
   reason, and a failure never blanks the viewport. */
function parseGridBytes(buffer, name) {
  return new Promise((resolve, reject) => {
    try {
      loader.parse(buffer, '', gltf => {
        try { adopt(gltf, name); resolve(true); } catch (e) { reject(e); }
      }, e => reject(e));
    } catch (e) { reject(e); }
  });
}

async function loadFile(file) {
  try {
    const buf = await file.arrayBuffer();
    await parseGridBytes(buf, file.name);
  } catch (e) {
    lastError = String((e && e.message) || e);
    writeGridState();
  }
}

let readyResolve;
const ready = new Promise(r => { readyResolve = r; });

function loadDefault() {
  loader.load(DEFAULT_GRID, gltf => {
    try { adopt(gltf, DEFAULT_GRID.split('/').pop()); }
    catch (e) { lastError = String((e && e.message) || e); writeGridState(); }
    readyResolve(true);
  }, undefined, err => {
    lastError = `could not load ${DEFAULT_GRID}: ${(err && err.message) || err}`;
    writeGridState();
    readyResolve(false);
  });
}

/* ---- one-time wiring ---------------------------------------------------- */
for (const [id, el] of Object.entries(ui)) {
  el.addEventListener('input', () => {
    writeOutputs();
    if (id === 'weight' || id === 'brightness') applyStyle();
    else if (id === 'depthDim') dirty = true;
    else rebuild();
    writeDrawState();
  });
}
document.getElementById('resetView').addEventListener('click', resetView);

document.getElementById('gridFile').addEventListener('change', ev => {
  const f = ev.target.files && ev.target.files[0];
  if (f) loadFile(f);
});

let dragDepth = 0;
window.addEventListener('dragenter', ev => {
  ev.preventDefault(); dragDepth++; dropHint.hidden = false;
});
window.addEventListener('dragover', ev => { ev.preventDefault(); });
window.addEventListener('dragleave', ev => {
  ev.preventDefault(); dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) dropHint.hidden = true;
});
window.addEventListener('drop', ev => {
  ev.preventDefault(); dragDepth = 0; dropHint.hidden = true;
  const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
  if (f) loadFile(f);
});
canvas.addEventListener('pointerdown', () => canvas.classList.add('dragging'));
window.addEventListener('pointerup', () => canvas.classList.remove('dragging'));

/* ---- test chrome -------------------------------------------------------- */
/* There is no in-page control that puts the camera anywhere in particular, and
   a measurement of "the far lines are dimmer" needs one — the same spirit as
   /print's `__printScaffold.setView()`. Everything else here is a read of
   state the page already computed. */
window.__plot = {
  ready,
  state: () => readUI(),
  census: () => (gridInfo ? gridInfo.census : null),
  found: () => (gridInfo ? gridInfo.found : null),
  petals: () => (gridInfo ? gridInfo.petals : 0),
  drawn: () => ({ ...drawn }),
  selectionKey: (kind, density) => selectionKey(kind, density),
  sparsestReached: (kind, density) => sparsestReached(kind, density),
  deadRange: () => ({ ...deadRange }),
  trackMark: kind => ({
    hatched: tracks[kind].classList.contains('plot-track--dead'),
    upTo: tracks[kind].dataset.dead ? +tracks[kind].dataset.dead : null,
    fraction: tracks[kind].style.getPropertyValue('--plot-dead') || null,
  }),
  error: () => lastError,
  source: () => sourceName,
  assetExtras: () => assetExtras,
  frameMs: () => lastFrameMs,
  gridText: () => logEl.textContent,
  drawText: () => drawEl.textContent,
  frameText: () => frameEl.textContent,
  materialInfo: () => ({
    blending: material.blending,
    additive: material.blending === THREE.AdditiveBlending,
    linewidth: material.linewidth,
    color: material.color.getHex(),
    colorLinear: material.color.r,
    depthTest: material.depthTest,
    fogEnabled: material.fog,
  }),
  fogInfo: () => (scene.fog ? { near: scene.fog.near, far: scene.fog.far,
                                color: scene.fog.color.getHex() } : null),
  // Every attachment marker's world position AFTER the Z-up correction. The
  // bloom's attachment ring is flat, so on a correctly oriented grid these all
  // share one Y.
  attachmentsWorld: () => {
    container.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    return gridInfo ? gridInfo.attachments.map(a => {
      v.set(a.world[0], a.world[1], a.world[2]).applyMatrix4(container.matrixWorld);
      return [v.x, v.y, v.z];
    }) : [];
  },
  cameraInfo: () => ({
    position: camera.position.toArray(),
    target: controls.target.toArray(),
    distance: camera.position.distanceTo(controls.target),
  }),
  setView: (dir, margin = 1.06) => fitCamera(dir, margin),
  renderNow: () => { dirty = true; render(); return lastFrameMs; },
  // OrbitControls runs with damping, whose easing has a multi-second half-life
  // under software GL — so "the view has stopped moving" is not something a
  // fixed wait can establish. Advancing `update()` until it reports no motion
  // is, and it is what makes a pixel measurement here repeatable.
  settle: (limit = 600) => {
    let n = 0;
    while (n < limit && controls.update()) n++;
    dirty = true; render();
    return n;
  },
  // Reads the ACTUAL rendered framebuffer, straight after a render and before
  // the browser composites, so nothing here is a screenshot of DOM chrome and
  // no panel rectangle has to be excluded. Returns summaries rather than the
  // buffer: a 256-bin histogram of each pixel's brightest channel, the ink
  // count, the total and a hash of the whole buffer.
  readPixels: () => {
    dirty = true; render();
    const gl = renderer.getContext();
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const hist = new Array(256).fill(0);
    let ink = 0, max = 0, sum = 0, hash = 2166136261;
    for (let i = 0; i < buf.length; i += 4) {
      const m = Math.max(buf[i], buf[i + 1], buf[i + 2]);
      hist[m]++; sum += m;
      if (m > 8) ink++;
      if (m > max) max = m;
      hash = (Math.imul(hash ^ m, 16777619)) >>> 0;
    }
    return { w, h, ink, max, sum, hist, hash };
  },
  // The view depths the depth dim is solved between, from the app's own sphere
  // and the live camera — so the gate can check the shipped fog against the
  // arithmetic instead of eyeballing a gradient.
  depthRange: () => {
    const s = worldSphere();
    if (!s) return null;
    const d = camera.position.distanceTo(s.center);
    return { near: d - s.radius, far: d + s.radius, radius: s.radius };
  },
};

/* ---- go ----------------------------------------------------------------- */
resize();
writeOutputs();
writeGridState();
writeDrawState();
loadDefault();
