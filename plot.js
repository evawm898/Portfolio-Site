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
// THE STEM IS INFERRED FROM THE GRID, NOT LOADED. The bloom has no stem
// geometry to export; what it does have is 280 u-lines that all start on the
// attachment ring at z = 0. So the stem is those same lines continued
// downward, and it lives in plot-stem.js — read that file's header before
// touching any of it, in particular the three notes on droop decay, the exact
// agreement at the ring, and why the bend is gated by the funnel.
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
import {
  ringOf, stationLadder, topZoneOf, stationPlans, convergence, droopDecay,
  rotateAboutRing, stemLine, centrelineAt, maxChordSagitta, headTransform,
} from './plot-stem.js';
import {
  makeWarp, warpIsRest, gaussianWeight, nextStation, removeIndex,
} from './plot-warp.js';

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

/* SCROLL-ZOOM REPAINTED NOTHING, AND DAMPING WAS NEVER THE REASON — measured
   against three@0.161.0's own OrbitControls rather than assumed from /bloom.
   Damping is ON here (and on /bloom, at three's default 0.05), but `update()`
   only eases `sphericalDelta` and `panOffset`: the dolly `scale` is applied at
   full magnitude in one call and reset to 1, so `enableDamping` does not
   smooth zoom on EITHER page and turning it up would not have helped.

   What actually broke is the idle skip. `onMouseWheel` calls `scope.update()`
   SYNCHRONOUSLY inside the wheel handler; that call moves the camera, updates
   `lastPosition`/`lastQuaternion` and returns true to nobody. The animation
   loop's own `controls.update()` on the next frame therefore recomputes the
   same pose, compares it against the position the internal call already
   recorded, and returns FALSE — so nothing was redrawn. Measured headlessly on
   a settled page: five wheel events took the camera 95.68 -> 70.33 units while
   the framebuffer hash stayed identical across all five. The zoom only
   appeared when something else dirtied a frame (a residual orbit tick, a
   slider), which is exactly what reads as choppy.

   The fix is to take the signal from the source that has it. `change` fires
   from inside `update()` whenever the camera actually moved, wheel included,
   so it cannot be consumed before the loop sees it. The loop still skips a
   genuinely idle frame — `dirty` is only set when something moved. */
controls.addEventListener('change', () => { dirty = true; });

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
let objects = { u: null, v: null, other: null, stem: null };
let lastError = '';
let fogOn = false;
let lastFrameMs = 0;
let dirty = true;
let drawn = { u: 0, v: 0, other: 0, total: 0, uLines: 0, vLines: 0 };

/* ---- the stem's own state ------------------------------------------------
   `stemRing` is read off EVERY u-line's foot in the loaded file, not off the
   ones currently drawn: the ring is a property of the grid, and a stem that
   moved sideways when the density slider thinned the feet it was averaging
   would be a density slider that changes where the flower hangs from. */
let stemRing = null;
/* A bend point is a STATION AS A FRACTION of the stem length plus a world
   offset in grid mm. The fraction and not an absolute station, so dragging
   `length` slides the bends along with the stem instead of stranding them at
   the top of a long stalk. Ascending in `t`. THE LAST ONE IS THE ROOT and is
   an ordinary member of this list — see `removeIndex` in plot-warp.js. */
const DEFAULT_BEND_T = [1 / 3, 2 / 3, 1];
const MAX_BENDS = 8;
let bends = DEFAULT_BEND_T.map(t => ({ t, offset: [0, 0, 0] }));
let handles = [];           // one THREE.Mesh per bend, parented to `container`
let stemStrips = [];        // the built continuations, one per drawn u-line
let stemIsDrawn = false;    // the stem is the u lines continued, so no u = no stem
let viewBounds = null;      // what the drawing occupies — the grid at the current
                            // droop plus the stem; `localBounds` when neither moved
let stemStats = { lines: 0, segments: 0, stations: 0, seamMm: 0, sagittaMm: 0, rest: true };

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

/* The stem's controls are read and dispatched separately from the draw
   controls above, because they do different work: a draw control repacks the
   segment buffers from strips that already exist, and a stem control changes
   what the strips ARE. Sharing one handler would mean one of them doing the
   other's job on every input event. */
const sui = {
  stem: document.getElementById('stem'),
  stemBundle: document.getElementById('stemBundle'),
  stemJoin: document.getElementById('stemJoin'),
  stemLength: document.getElementById('stemLength'),
  stemDroop: document.getElementById('stemDroop'),
  stemNeck: document.getElementById('stemNeck'),
  stemHandles: document.getElementById('stemHandles'),
};
const sout = {
  stem: document.getElementById('stemOut'),
  stemBundle: document.getElementById('stemBundleOut'),
  stemJoin: document.getElementById('stemJoinOut'),
  stemLength: document.getElementById('stemLengthOut'),
  stemDroop: document.getElementById('stemDroopOut'),
  stemNeck: document.getElementById('stemNeckOut'),
  bend: document.getElementById('bendOut'),
};
const stemEl = document.getElementById('plot-stemstate');
const bendCountEl = document.getElementById('bendCount');
const bendAddBtn = document.getElementById('bendAdd');
const bendRemoveBtn = document.getElementById('bendRemove');

const readStem = () => {
  const deg = +sui.stemDroop.value;
  return {
    on: sui.stem.value === 'on',
    bundle: +sui.stemBundle.value,
    join: +sui.stemJoin.value,
    length: +sui.stemLength.value,
    droopDeg: deg,
    droopRad: deg * Math.PI / 180,
    neck: +sui.stemNeck.value,
    showHandles: sui.stemHandles.checked,
  };
};
// The `opts` bag plot-stem.js reads. One place builds it, so a control can
// never reach one of the two builders (the lines, the centre line) and not the
// other.
const stemOpts = st => ({ bundle: st.bundle, join: st.join, length: st.length,
                          droopRad: st.droopRad, neck: st.neck });
const stationsOf = st => bends.map(b => b.t * st.length);
// The ONE place the ladder's top zone is decided, so the lines, the camera fit
// and the chord the panel prints are all sampled the same way.
const ladderFor = st => stationLadder(st.length, topZoneOf(st.length, st.join, st.neck));
const currentWarp = st => makeWarp(stationsOf(st), bends.map(b => b.offset), st.length);

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
  strips = []; gridInfo = null; assetExtras = null; localBounds = null; viewBounds = null;
  stemRing = null; stemIsDrawn = false; stemStrips = [];
  stemStats = { lines: 0, segments: 0, stations: 0, seamMm: 0, sagittaMm: 0, rest: true };
  deadRange = { u: MIN_DENSITY, v: MIN_DENSITY };
  drawn = { u: 0, v: 0, other: 0, total: 0, uLines: 0, vLines: 0 };
}

// `mine` is already filtered — the stem's strips are built rather than
// selected, so the caller decides what goes in each object.
function buildFamily(kind, mine) {
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

/* THE STEM IS BUILT FROM THE U-LINES THAT ARE ACTUALLY DRAWN. It is not a
   separate curve stroked beside them; it is their continuation, so the ones
   the density slider dropped have nothing to continue and "v only" has no stem
   at all. That coupling is deliberate and is TOLD on the panel rather than
   worked around: a stem drawn from lines that are not on screen would be a
   second, invisible line set with its own density.

   The paired return is what the seam is measured on. `head` is `chosen` mapped
   through the FULL droop; the stem's own s = 0 station is evaluated through
   the stem's law with the decay at 0. The two are different code paths on
   purpose — that is the only way a wrong decay or a wrong gate at the ring can
   show up as a number rather than as a picture nobody compares. */
function buildStem(chosen, head, st, warp) {
  if (!st.on || !stemRing) return { stems: [], seam: 0, sagitta: 0 };
  const ladder = ladderFor(st);
  const opts = stemOpts(st);
  // ONE PLAN PER STATION FOR THE WHOLE BUNDLE. The funnel's progress, the
  // droop's decayed angle and the bend's displacement are properties of the
  // STATION, not of the line passing through it, so they are computed a
  // hundred times rather than twenty-eight thousand.
  const plans = stationPlans(opts, warp, ladder);
  const stems = [];
  const foot = [0, 0, 0];
  let seam = 0;
  for (let i = 0; i < chosen.length; i++) {
    const t = chosen[i];
    if (t.kind !== 'u') continue;
    // The UNTRANSFORMED foot: the stem's law applies the rotation itself, with
    // the decay at s = 0, and feeding it an already-rotated foot would turn the
    // head twice.
    foot[0] = t.points[0]; foot[1] = t.points[1]; foot[2] = t.points[2];
    const points = stemLine(foot, stemRing, opts, plans);
    // The head's own answer for the same foot — head[i] came through
    // headTransform at the FULL angle, this came through droopDecay(0). Two
    // expressions, compared, on every drawn line, every rebuild.
    const h = head[i].points;
    seam = Math.max(seam, Math.hypot(points[0] - h[0], points[1] - h[1], points[2] - h[2]));
    stems.push({ kind: 'stem', petal: t.petal, index: -1, last: -1,
                 points, count: ladder.length, segments: ladder.length - 1 });
  }
  return { stems, seam, sagitta: maxChordSagitta(stemRing, opts, warp, ladder) };
}

/* Rebuild the drawn segment buffers from the current control values. Cheap by
   construction — the sample grid is ~15k segments and its stem another ~18k —
   so the density sliders rebuild rather than mask. */
function rebuild() {
  const s = readUI(), st = readStem();
  const chosen = selectStrips(strips, s);
  // THE HEAD TAKES THE FULL DROOP, every family of it: the v-lines' row 0 sits
  // on the same ring as the u-lines' feet, so a head transform that reached
  // only the u family would tear the grid apart at the junction. At angle 0
  // headTransform hands the SAME array back, so the shipped default draws the
  // file's own vertices and costs nothing.
  const angle = (st.on && stemRing) ? st.droopRad : 0;
  const centre = stemRing ? stemRing.center : [0, 0, 0];
  const head = chosen.map(t => {
    const p = headTransform(t.points, t.count, centre, angle);
    return p === t.points ? t : { ...t, points: p };
  });
  // ONE WARP PER REBUILD, built here and handed down: the lines, the handles
  // and the "at rest" the panel prints all have to be the same set of control
  // points, and rebuilding it three times is three chances for them not to be.
  const warp = currentWarp(st);
  const { stems, seam, sagitta } = buildStem(chosen, head, st, warp);
  stemStrips = stems;
  stemIsDrawn = stems.length > 0;
  stemStats = { lines: stems.length,
                segments: stems.reduce((a, b) => a + b.segments, 0),
                stations: stems.length ? stems[0].count : 0,
                seamMm: seam, sagittaMm: sagitta, rest: warpIsRest(warp) };

  const u = buildFamily('u', head.filter(t => t.kind === 'u'));
  const v = buildFamily('v', head.filter(t => t.kind === 'v'));
  const other = buildFamily('other', head.filter(t => t.kind === 'other'));
  buildFamily('stem', stems);
  // GRID SEGMENTS ONLY. The stem is counted on its own line, because "drawn N
  // of the file's M segments" stops meaning anything the moment it includes
  // segments the file does not contain.
  drawn = {
    u: u.segments, v: v.segments, other: other.segments,
    total: u.segments + v.segments + other.segments,
    uLines: u.lines, vLines: v.lines, otherLines: other.lines,
    stem: stemStats.segments, stemLines: stemStats.lines,
  };
  computeViewBounds();
  syncHandles();
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


/* ---- bend handles ------------------------------------------------------- */
/* UI, NOT MODEL: their own flat material with depth testing off and a high
   render order, so they sit over the ink rather than inside it, and they are
   parented to the same `container` the grid is — a handle has to live in the
   space the stem lives in or the Z-up correction would put it somewhere else.
   The ROOT gets no special treatment, which is the point: a locked root only
   makes sense for a plant in the ground, and this is a picture. */
const HANDLE_GEOM = new THREE.SphereGeometry(1, 12, 8);
const HANDLE_MAT = new THREE.MeshBasicMaterial({
  color: 0x6fb7ae, depthTest: false, depthWrite: false, transparent: true, opacity: 0.9,
});
// In grid mm, from the stem's own length, so a handle is the same size on
// screen whatever the stem is set to rather than a dot on a long stalk.
const handleRadiusFor = st => Math.max(0.9, st.length * 0.013);

function syncHandles() {
  const st = readStem();
  while (handles.length > bends.length) container.remove(handles.pop());
  while (handles.length < bends.length) {
    const h = new THREE.Mesh(HANDLE_GEOM, HANDLE_MAT);
    h.renderOrder = 10;
    h.frustumCulled = false;
    container.add(h);
    handles.push(h);
  }
  const show = st.on && st.showHandles && stemIsDrawn && !!stemRing;
  const r = handleRadiusFor(st);
  const warp = currentWarp(st), opts = stemOpts(st), q = [0, 0, 0], t = [0, 0, 0];
  handles.forEach((h, k) => {
    h.visible = show;
    h.userData.bendIndex = k;
    h.scale.setScalar(r);
    // ON the stem's own centre line, through the same law the lines went
    // through — including the droop and the funnel gate — so a handle that
    // cannot move the stem visibly does not move either.
    if (stemRing) {
      centrelineAt(stemRing, opts, warp, bends[k].t * st.length, q, t);
      h.position.set(q[0], q[1], q[2]);
    }
  });
  bendCountEl.textContent = String(bends.length);
  bendRemoveBtn.disabled = bends.length === 0;
  bendAddBtn.disabled = bends.length >= MAX_BENDS;
}

/* THE FUNNEL GATE DAMPS A HANDLE NEAR THE RING, AND THAT IS TOLD RATHER THAN
   AMPLIFIED AWAY. A bend is multiplied by `convergence(s)` so it cannot drag
   the bloom head around; a handle standing where that value is small therefore
   moves less than the pointer does. Dividing it back out exactly would send the
   stored offset to infinity as the gate goes to zero — and that offset still
   reaches every OTHER station through the gaussian tail, where the gate is 1.
   So the solve floors the divisor and the read-out prints the gate. */
const BEND_GATE_FLOOR = 0.1;

/* Place bend `k` so its handle lands under the pointer: undo this station's own
   share of the droop, subtract the station's resting position, divide by the
   gate, and subtract what every OTHER control point already contributes here —
   without that last term a handle would land under the pointer plus its
   neighbours' pull, which reads as the handle refusing to follow the mouse. */
function setBendFromWorld(k, world) {
  if (!stemRing || !bends[k]) return;
  const st = readStem();
  const sAt = bends[k].t * st.length;
  container.updateMatrixWorld(true);
  const local = world.clone().applyMatrix4(
    new THREE.Matrix4().copy(container.matrixWorld).invert());
  const un = [0, 0, 0];
  rotateAboutRing([local.x, local.y, local.z], stemRing.center,
                  -st.droopRad * droopDecay(sAt, st.neck), un);
  const base = [stemRing.center[0], stemRing.center[1], stemRing.center[2] - sAt];
  const gate = Math.max(convergence(sAt, st.join), BEND_GATE_FLOOR);
  const warp = currentWarp(st), stations = stationsOf(st);
  const others = [0, 0, 0];
  for (let j = 0; j < bends.length; j++) {
    if (j === k) continue;
    const w = gaussianWeight(sAt, stations[j], warp.points[j].sigma);
    others[0] += bends[j].offset[0] * w;
    others[1] += bends[j].offset[1] * w;
    others[2] += bends[j].offset[2] * w;
  }
  const cap = 4 * st.length;
  bends[k].offset = [0, 1, 2].map(a =>
    Math.max(-cap, Math.min(cap, (un[a] - base[a]) / gate - others[a])));
  rebuild();
  writeStemState();
  writeStemOutputs();
}

/* Raycast the handles; while one is held OrbitControls is switched off, so a
   drag cannot both bend the stem and spin the camera. Registered ONCE against
   mutable module state, like every other listener on this page, so loading a
   different grid needs no re-wiring. A pointerdown that misses every handle
   falls straight through to the orbit. */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const hitPt = new THREE.Vector3();
const grabOffset = new THREE.Vector3();
let dragging = null;

function toNDC(ev) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1,
          -((ev.clientY - r.top) / r.height) * 2 + 1);
}

canvas.addEventListener('pointerdown', ev => {
  const live = handles.filter(h => h.visible);
  if (!live.length) return;
  toNDC(ev);
  ray.setFromCamera(ndc, camera);
  const picks = ray.intersectObjects(live, false);
  if (!picks.length) return;
  dragging = picks[0].object;
  const wp = dragging.getWorldPosition(new THREE.Vector3());
  // Drag in the plane facing the camera through the handle, so the handle
  // tracks the pointer from whatever direction the model is being read.
  dragPlane.setFromNormalAndCoplanarPoint(
    camera.getWorldDirection(new THREE.Vector3()).negate(), wp);
  if (ray.ray.intersectPlane(dragPlane, hitPt)) grabOffset.copy(wp).sub(hitPt);
  else grabOffset.set(0, 0, 0);
  controls.enabled = false;
  canvas.setPointerCapture(ev.pointerId);
  ev.preventDefault();
});

canvas.addEventListener('pointermove', ev => {
  if (!dragging) return;
  toNDC(ev);
  ray.setFromCamera(ndc, camera);
  if (!ray.ray.intersectPlane(dragPlane, hitPt)) return;
  setBendFromWorld(dragging.userData.bendIndex, hitPt.clone().add(grabOffset));
  ev.preventDefault();
});

function endDrag(ev) {
  if (!dragging) return;
  dragging = null;
  controls.enabled = true;
  if (ev && ev.pointerId !== undefined && canvas.hasPointerCapture(ev.pointerId)) {
    canvas.releasePointerCapture(ev.pointerId);
  }
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

/* ---- adding, removing and resting bend points --------------------------- */
function addBend() {
  if (bends.length >= MAX_BENDS) return false;
  const st = readStem();
  const at = nextStation(stationsOf(st), st.length);
  bends.push({ t: st.length > 0 ? at / st.length : 1, offset: [0, 0, 0] });
  bends.sort((a, b) => a.t - b.t);
  afterBendChange();
  return true;
}
function removeBend() {
  const i = removeIndex(bends.length);
  if (i < 0) return false;
  bends.splice(i, 1);
  afterBendChange();
  return true;
}
// "reset" rests the points it has; it does not restore the default THREE,
// because the count is a choice the artist made and the offsets are the thing
// that goes wrong.
function restBends() {
  for (const b of bends) b.offset = [0, 0, 0];
  afterBendChange();
}
function afterBendChange() { rebuild(); writeStemOutputs(); writeStemState(); writeDrawState(); }

/* ---- the view ----------------------------------------------------------- */
function worldSphere() {
  if (!viewBounds) return null;
  container.updateMatrixWorld(true);
  const c = new THREE.Vector3(...viewBounds.center).applyMatrix4(container.matrixWorld);
  return { center: c, radius: Math.max(viewBounds.radius, 1e-3) };
}

/* FIT THE PROJECTED EXTENT, NOT THE BOUNDING SPHERE. A bloom grid is a wide
   flat disc: its bounding sphere is set by the tip-to-tip span, so a sphere fit
   leaves most of a 16:9 frame empty above and below it. This projects every
   grid point onto the camera's own right/up/forward basis and fits the two
   half-extents against the two field-of-view angles, so the drawing fills the
   frame at any aspect ratio and from any direction. ~16k points, once per
   reset. */
/* WHAT THE DRAWING OCCUPIES — one walker, read by the camera fit and by the
   depth dim's own sphere, so the frame and the fade can never disagree about
   where the picture is. It walks EVERY strip in the file (at the current
   droop) rather than the ones the density sliders kept, so thinning the grid
   does not re-frame it, and then the stem strips that are actually drawn. */
function eachDrawnPoint(fn) {
  const st = readStem();
  const angle = (st.on && stemRing) ? st.droopRad : 0;
  const c = stemRing ? stemRing.center : [0, 0, 0];
  const p = [0, 0, 0], q = [0, 0, 0];
  for (const s of strips) {
    for (let i = 0; i < s.count; i++) {
      p[0] = s.points[i * 3]; p[1] = s.points[i * 3 + 1]; p[2] = s.points[i * 3 + 2];
      rotateAboutRing(p, c, angle, q);
      fn(q[0], q[1], q[2]);
    }
  }
  for (const s of stemStrips) {
    for (let i = 0; i < s.count; i++) fn(s.points[i * 3], s.points[i * 3 + 1], s.points[i * 3 + 2]);
  }
}

/* The sphere the depth dim is solved against. When nothing has moved the
   drawing IS the file, so this is `localBounds` verbatim and the fade is
   exactly the one /plot shipped; once the head is drooped or a stem hangs
   below it, the sphere has to be recomputed or the stem's far end would be
   clamped past the fog's far plane and go black. Recomputed on REBUILD, never
   per frame — the fog itself is re-solved per frame against the live camera,
   but what it is solved around is a property of the drawing. */
function computeViewBounds() {
  const st = readStem();
  const moved = stemIsDrawn || (st.on && stemRing && st.droopRad !== 0);
  if (!moved) { viewBounds = localBounds; return; }
  // TWO WALKS AND NO ARRAY. Collecting the points to measure the radius in a
  // second pass meant a 135,000-element JS array per rebuild, and cost 6.6 ms
  // of a 13.5 ms rebuild — more than building the stem. Walking twice is
  // measured at a third of that and allocates nothing.
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let n = 0;
  eachDrawnPoint((x, y, z) => {
    n++;
    if (x < min[0]) min[0] = x; if (x > max[0]) max[0] = x;
    if (y < min[1]) min[1] = y; if (y > max[1]) max[1] = y;
    if (z < min[2]) min[2] = z; if (z > max[2]) max[2] = z;
  });
  if (!n) { viewBounds = localBounds; return; }
  const center = [0, 1, 2].map(a => (min[a] + max[a]) / 2);
  let r = 0;
  eachDrawnPoint((x, y, z) => {
    const d = Math.hypot(x - center[0], y - center[1], z - center[2]);
    if (d > r) r = d;
  });
  viewBounds = { min, max, center, radius: r };
}

function fitCamera(dirArr, margin = 1.06) {
  if (!viewBounds || !strips.length) return false;
  container.updateMatrixWorld(true);
  const M = container.matrixWorld;
  const center = new THREE.Vector3(...viewBounds.center).applyMatrix4(M);
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
  eachDrawnPoint((x, y, z) => {
    p.set(x, y, z).applyMatrix4(M).sub(center);
    const r = p.dot(right), u = p.dot(up);
    if (r < minR) minR = r; if (r > maxR) maxR = r;
    if (u < minU) minU = u; if (u > maxU) maxU = u;
    depth = Math.max(depth, p.dot(dir));
  });
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

// Counts frames actually PAINTED, which is the only way to see the idle skip
// from outside: the wheel fix works by dirtying a frame, and a page that simply
// rendered every tick would satisfy it while giving up the skip.
let renderCount = 0;
function render() {
  renderCount++;
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
  // The stem's own count belongs on its own panel, but "how much is on screen"
  // is a DRAW question, so the total says where the rest of it is rather than
  // leaving the two panels quietly disagreeing.
  if (drawn.stem) {
    lines.push(`plus ${drawn.stem} inferred stem segments — see STEM`);
  }
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


/* THE STEM'S READ-OUT SAYS WHAT THE LAW IS DOING, WITH NUMBERS — the discipline
   /print's fan settled on. Two of these lines are self-reports the page could
   not otherwise make: SEAM is the measured largest gap between the head's own
   answer for a foot and the stem's, over every drawn line, and CHORD is how far
   the eased station ladder cuts the corner. Neither is a sentence claiming a
   property; both are the property, measured, on the settings in front of you. */
function stemText() {
  const st = readStem();
  const lines = [];
  if (!st.on) return 'stem off — the grid is drawn as the file wrote it';
  if (!stemRing) return 'no stem — this file has no u-lines to hang one from';

  const nf = n => n.toLocaleString('en-US');
  const mm = n => `${n.toFixed(2)} mm`;
  if (!stemIsDrawn) {
    lines.push('<span class="warn">no stem drawn — the stem IS the u lines'
      + ' continued, and no u line is on screen</span>');
  }
  lines.push(`${stemStats.lines} of ${gridInfo ? gridInfo.census.u : 0} u-lines continued`
    + ` · ${nf(stemStats.segments)} stem segments beside the grid's ${nf(drawn.total)}`);
  lines.push(`ring   centre (${stemRing.center.map(v => v.toFixed(2)).join(', ')})`
    + ` · ${stemRing.count} feet, ${mm(stemRing.rMin)}–${mm(stemRing.rMax)} out`);
  lines.push(`funnel  ${mm(stemRing.rMin)}–${mm(stemRing.rMax)} gathers to`
    + ` ${mm(st.bundle)} over ${mm(st.join)} — the taper is the gather, one number`);
  if (st.join >= st.length) {
    lines.push('<span class="warn">the funnel is longer than the stem — the lines'
      + ' never finish gathering</span>');
  }
  if (st.droopDeg === 0) {
    lines.push(`droop   0° — the head sits upright, and the ${st.neck} mm neck is inert`);
  } else {
    lines.push(`droop   head ${st.droopDeg}° · the stem carries ${st.droopDeg}° at the`
      + ` ring and 0° by ${mm(st.neck)} down`);
    if (st.neck >= st.length) {
      lines.push('<span class="warn">the neck is longer than the stem — the droop never'
        + ' washes out and the whole stalk leans</span>');
    }
  }
  lines.push(`seam    head and stem agree at the ring to ${stemStats.seamMm.toExponential(1)}`
    + ` mm, over ${stemStats.lines} lines`);
  lines.push(`chord   the ${stemStats.stations}-station ladder — uniform, packed over`
    + ` the top ${mm(topZoneOf(st.length, st.join, st.neck))} — cuts the corner by at`
    + ` most ${stemStats.sagittaMm.toFixed(3)} mm`);

  if (!bends.length) {
    lines.push('bends   none — the stem runs straight from the funnel to the root');
  } else {
    const stations = stationsOf(st);
    const warp = currentWarp(st);
    const at = stations.map(v => v.toFixed(0)).join(' / ');
    const sig = warp.points.map(p => p.sigma.toFixed(0)).join(' / ');
    lines.push(`bends   ${bends.length} at ${at} mm · gaussian sigma ${sig} mm`
      + ` (${stemStats.rest ? 'all at rest' : 'displaced'})`);
    // Conditional, because "the last one is the root" is a fact about where
    // this set happens to end and not a law: `remove` keeps the extremes, so it
    // holds today, and a sentence that asserted it would quietly go wrong the
    // day something places a point short of the end.
    const lastT = bends[bends.length - 1].t;
    lines.push(lastT >= 1
      ? `        the last one at ${stations[stations.length - 1].toFixed(0)} mm IS`
        + ' the root, and moves like any other'
      : `        nothing sits at the root — the lowest is at`
        + ` ${stations[stations.length - 1].toFixed(0)} of ${st.length} mm`);
    const gates = stations.map(v => convergence(v, st.join));
    if (gates.some(g => g < 0.999)) {
      lines.push(`<span class="warn">        gate ${gates.map(g => g.toFixed(2)).join(' / ')}`
        + ' — a bend inside the funnel is damped so it cannot drag the head</span>');
    }
  }
  return lines.join('\n');
}

function writeStemState() { stemEl.innerHTML = stemText(); }

function writeStemOutputs() {
  const st = readStem();
  sout.stem.textContent = st.on
    ? (stemIsDrawn ? `${stemStats.segments.toLocaleString('en-US')} seg` : 'no u lines')
    : 'off';
  sout.stemBundle.textContent = `${st.bundle.toFixed(2)} mm`;
  sout.stemJoin.textContent = `${st.join.toFixed(1)} mm`;
  sout.stemLength.textContent = `${st.length} mm`;
  sout.stemDroop.textContent = `${st.droopDeg}°`;
  sout.stemNeck.textContent = `${st.neck} mm`;
  sout.bend.textContent = !bends.length ? 'none'
    : stemStats.rest ? 'at rest' : 'bent';
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
  // THE RING IS READ OFF EVERY U-LINE FOOT IN THE FILE, not off the ones the
  // density sliders kept: it is a property of the grid, and a stem that moved
  // sideways when the slider thinned the feet it averages would make the
  // density control decide where the flower hangs from.
  stemRing = ringOf(strips.filter(t => t.kind === 'u')
                          .map(t => [t.points[0], t.points[1], t.points[2]]));
  lastError = '';
  deadRange = { u: deadUpTo('u'), v: deadUpTo('v') };
  applyDeadTravel();
  rebuild();
  resetView();
  writeGridState();
  writeDrawState();
  writeStemState();
  writeStemOutputs();
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
    // The stem is the u lines continued, so `families` and `u density` change
    // it as surely as any stem control does — including to nothing.
    writeStemState();
    writeStemOutputs();
  });
}
/* The stem's controls get their own dispatch: every one of them changes what
   the strips ARE, so all six go through the same rebuild — there is no cheap
   arm here the way `weight` and `brightness` are cheap arms on the draw side. */
for (const el of Object.values(sui)) {
  el.addEventListener('input', () => {
    rebuild();
    writeStemOutputs();
    writeStemState();
    writeDrawState();
  });
}
bendAddBtn.addEventListener('click', addBend);
bendRemoveBtn.addEventListener('click', removeBend);
document.getElementById('bendReset').addEventListener('click', restBends);

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

  /* ---- the stem ---------------------------------------------------------
     Everything here is a READ of state the page already computed, except
     `dragBend`, which exists for the same reason /print's `handleScreenPos()`
     does: a gate cannot drag a handle it cannot find on screen. Nothing here
     sets a bend directly — a check that wrote an offset in would be testing
     its own arithmetic rather than the page's. */
  stem: () => readStem(),
  stemInfo: () => ({
    drawn: stemIsDrawn,
    lines: stemStats.lines,
    segments: stemStats.segments,
    rows: stemStats.stations,
    seamMm: stemStats.seamMm,
    sagittaMm: stemStats.sagittaMm,
    rest: stemStats.rest,
    ring: stemRing ? { center: stemRing.center.slice(), rMin: stemRing.rMin,
                       rMax: stemRing.rMax, zMin: stemRing.zMin, zMax: stemRing.zMax,
                       count: stemRing.count } : null,
  }),
  // One stem line's points, in grid space — what a decay or a bend is measured
  // on. Index is into the stem strips in the order they were built.
  stemLine: i => (stemStrips[i] ? Array.from(stemStrips[i].points) : null),
  stemLineCount: () => stemStrips.length,
  // The corresponding head strip's FOOT, through the head's own transform: the
  // other half of the seam, so a check can measure the join itself rather than
  // trust the page's own number for it.
  stemFeet: () => stemStrips.map(t => [t.points[0], t.points[1], t.points[2]]),
  headFeet: () => {
    const st = readStem();
    const angle = (st.on && stemRing) ? st.droopRad : 0;
    const c = stemRing ? stemRing.center : [0, 0, 0];
    const out = [];
    for (const t of selectStrips(strips, readUI())) {
      if (t.kind !== 'u') continue;
      const h = headTransform(t.points.subarray(0, 3), 1, c, angle);
      out.push([h[0], h[1], h[2]]);
    }
    return out;
  },
  bends: () => bends.map((b, i) => ({ t: b.t, offset: b.offset.slice(),
    station: b.t * readStem().length,
    sigma: currentWarp(readStem()).points[i].sigma })),
  handleCount: () => handles.length,
  handleVisible: k => !!(handles[k] && handles[k].visible),
  // Screen coordinates in CSS pixels, for a real pointer drag.
  handleScreenPos: k => {
    if (!handles[k]) return null;
    container.updateMatrixWorld(true);
    const v = handles[k].getWorldPosition(new THREE.Vector3()).project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: r.left + (v.x * 0.5 + 0.5) * r.width,
             y: r.top + (-v.y * 0.5 + 0.5) * r.height };
  },
  handleWorld: k => (handles[k]
    ? handles[k].getWorldPosition(new THREE.Vector3()).toArray() : null),
  stemText: () => stemEl.textContent,
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
  renderCount: () => renderCount,
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
  controlsEnabled: () => controls.enabled,
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
writeStemOutputs();
writeGridState();
writeDrawState();
writeStemState();
syncHandles();
loadDefault();
