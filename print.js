// /print — 3D viewport and posing stage.
//
// Scope of this file: load a glTF bundle, orbit around it, report the `pivot`
// node's extras, POSE the flower — drag bend points to bend the stem, hinge
// the bloom at the junction within the bundle's own declared limits — and
// STYLIZE it as live line art. No sparkles, no multiple instances — those are
// later stages and neither exists yet.
//
// The stem deformation lives in print-stem.js and the line extraction in
// print-lines.js; this file is wiring.
//
// THE STYLIZE STAGE IS NOT A MODE YOU ENTER. It is a layer over the same live
// scene: the bend handles stay draggable, the hinge sliders stay live, the
// camera keeps orbiting, and the linework is re-extracted from whatever the
// geometry currently is, every frame. Nothing here pauses, gates or resets the
// pose controls, and the gate asserts that in both directions.
//
// The lights are the SHADED preview, kept as the line-art switch's other
// position so the two can be compared; the line art itself uses no lighting
// model at all.
//
// BUNDLE SOURCE. The page opens on a hardcoded default bundle so it is never
// blank, but that default is a fallback, not the only source: a `.glb` can be
// loaded at any time via the file input or by dropping it anywhere on the
// page, parsed straight from its bytes through the same GLTFLoader path
// (`.parse()` instead of `.load(url)`). Loading a new bundle always REPLACES
// whatever is currently in the scene and resets pose state — a different
// bundle has no reason to share the old one's pivot position, rotation
// limits, or stem geometry, so nothing about the old pose is carried over.
// STYLIZE settings (line-art on/off, weight, detail, dots) are a rendering
// preference rather than a property of any one bundle, so they are the one
// thing a swap deliberately does NOT reset — see clearCurrentBundle().

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { StemRig, CONTROL_S } from './print-stem.js';
import { LineArt, detailToAngleDeg, CURATION, INTERIOR_WEIGHT_RATIO } from './print-lines.js';
import { Infill, INFILL_DIRECTIONS, LAYER_THRESHOLDS, HATCH_OFFSETS_DEG, INFILL_LIMITS,
         TONE_LEVELS, TONE_ORDER,
         toneAt, toneRadius, toneCoverage, levelThreshold } from './print-infill.js';

const DEFAULT_BUNDLE = 'assets/print-test/flower-test-bundle.glb';

const canvas = document.getElementById('print-canvas');
const debugEl = document.getElementById('print-log');
const markerToggle = document.getElementById('print-marker-toggle');
const markerBox = document.getElementById('showPivotMarker');
const poseEl = document.getElementById('print-pose');
const poseState = document.getElementById('print-posestate');
const droopIn = document.getElementById('droop');
const twistIn = document.getElementById('twist');
const droopOut = document.getElementById('droopOut');
const twistOut = document.getElementById('twistOut');
const resetBtn = document.getElementById('resetPose');
const bundleInput = document.getElementById('bundleFile');
const dropHint = document.getElementById('print-dropzone-hint');
const stylizeEl = document.getElementById('print-stylize');
const poseEmpty = document.getElementById('poseEmpty');
const stylizeEmpty = document.getElementById('stylizeEmpty');
const infillEl = document.getElementById('print-infill');
const infillEmpty = document.getElementById('infillEmpty');
const infillState = document.getElementById('print-infillstate');
const infillModeIn = document.getElementById('infillMode');
const infillSpacingIn = document.getElementById('infillSpacing');
const infillAngleIn = document.getElementById('infillAngle');
const infillDirectionIn = document.getElementById('infillDirection');
const infillAxialIn = document.getElementById('infillAxial');
const infillLayersIn = document.getElementById('infillLayers');
const infillCurvatureIn = document.getElementById('infillCurvature');
const infillReachIn = document.getElementById('infillReach');
const infillFalloffIn = document.getElementById('infillFalloff');
const infillJitterIn = document.getElementById('infillJitter');
const infillGradientIn = document.getElementById('infillGradient');
const infillVeinsIn = document.getElementById('infillVeins');
const infillVeinWidthIn = document.getElementById('infillVeinWidth');
const infillFillWeightIn = document.getElementById('infillFillWeight');
const infillModeOut = document.getElementById('infillModeOut');
const infillSpacingOut = document.getElementById('infillSpacingOut');
const infillAngleOut = document.getElementById('infillAngleOut');
const infillDirectionOut = document.getElementById('infillDirectionOut');
const infillAxialOut = document.getElementById('infillAxialOut');
const infillLayersOut = document.getElementById('infillLayersOut');
const infillCurvatureOut = document.getElementById('infillCurvatureOut');
const infillReachOut = document.getElementById('infillReachOut');
const infillFalloffOut = document.getElementById('infillFalloffOut');
const infillJitterOut = document.getElementById('infillJitterOut');
const infillGradientOut = document.getElementById('infillGradientOut');
const infillVeinsOut = document.getElementById('infillVeinsOut');
const infillVeinWidthOut = document.getElementById('infillVeinWidthOut');
const infillFillWeightOut = document.getElementById('infillFillWeightOut');
const showAnchorsBox = document.getElementById('showAnchors');
const resetAnchorsBtn = document.getElementById('resetAnchors');
const rowSpacing = infillSpacingIn.closest('.pose-row');
const rowLayers = document.getElementById('row-infillLayers');
const rowAngle = document.getElementById('row-infillAngle');
const rowAxial = document.getElementById('row-infillAxial');
const rowCurvature = document.getElementById('row-infillCurvature');
const rowGradient = document.getElementById('row-infillGradient');
const rowVeins = document.getElementById('row-infillVeins');
const rowVeinWidth = document.getElementById('row-infillVeinWidth');
const rowFillWeight = document.getElementById('row-infillFillWeight');
const infillPartsEl = document.getElementById('infillParts');
// The per-part darkness sliders, rebuilt per bundle. Kept as a list so a
// rebuild can be asserted not to have stacked a second set.
let darknessRows = [];
// The panel's own contents, hidden as a group when the panel has nothing to
// report — the PANEL itself is never hidden. `> :not(summary):not(.panel-empty)`
// is deliberately not a CSS rule: which children a panel has is markup's
// business, and a rule keyed on state would put the decision in two places.
const bodyOf = (el) => [...el.children].filter(
  c => c.tagName !== 'SUMMARY' && !c.classList.contains('panel-empty'));
const poseBody = bodyOf(poseEl);
const stylizeBody = bodyOf(stylizeEl);
const infillBody = bodyOf(infillEl);
// A panel is ALWAYS on screen and always collapsible; only its body comes and
// goes. `hidden` on the individual children, never on the <details>, so the
// summary stays clickable and the panel keeps its place in the column.
function setPanelPopulated(empty, body, populated) {
  empty.hidden = !!populated;
  body.forEach(c => { c.hidden = !populated; });
}
// Both start empty: the panels are on screen from the first paint, before any
// bundle exists, saying they have nothing yet rather than appearing later and
// reflowing the column under the pointer.
setPanelPopulated(poseEmpty, poseBody, false);
setPanelPopulated(stylizeEmpty, stylizeBody, false);
setPanelPopulated(infillEmpty, infillBody, false);
const artState = document.getElementById('print-artstate');
const lineArtBox = document.getElementById('lineArt');
const weightIn = document.getElementById('lineWeight');
const detailIn = document.getElementById('lineDetail');
const dotsIn = document.getElementById('pointillism');
const weightOut = document.getElementById('lineWeightOut');
const detailOut = document.getElementById('lineDetailOut');
const dotsOut = document.getElementById('pointillismOut');

// The sliders' min/max as authored in print.html — the fallback range for a
// bundle that declares no rotation_limits_deg of its own. Read ONCE, before
// any bundle (including the default) has had a chance to overwrite them, so
// a second bundle with no limits falls back to THIS, never to whatever the
// first bundle happened to leave behind.
const WIDGET_DEFAULT = {
  droop: [+droopIn.min, +droopIn.max],
  twist: [+twistIn.min, +twistIn.max],
};

const lines = [];
function log(html) { lines.push(html); debugEl.innerHTML = lines.join('\n'); }
function fail(msg) { log(`<span class="err">${msg}</span>`); }
const num = n => (Math.round(n * 1000) / 1000).toString();
const vec = v => Array.isArray(v) ? `[${v.map(num).join(', ')}]` : String(v);

// --- renderer / scene ------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x0c0e0e);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10000);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Two preview lights: a hemisphere fill so nothing reads as a black
// silhouette, and one key so curvature is legible.
scene.add(new THREE.HemisphereLight(0xdfe8e8, 0x2c3436, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(1, 1.4, 1.1);
scene.add(key);

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
resize();

// The line art is re-extracted EVERY frame, from the live camera and the live
// geometry — that is what makes an orbit and a bend-point drag both show up in
// the linework without either one having to know the other exists. `art` is
// null until the bundle loads (and null again between bundles — see
// clearCurrentBundle()).
let art = null, renderArtHook = null;
// The infill is a SECOND consumer of the same extraction, drawn as its own 2D
// overlay pass. It runs after art.update() because it reads that frame's
// silhouette, and it renders after the scene because it is ink on the paper.
let infill = null, renderInfillHook = null, infillStats = null, infillMs = 0;
let anchorMarkers = [];
// The anchor rings are UI, not model. They are kept facing the camera and at a
// constant SCREEN size, so a ring stays grabbable whether the camera is on top
// of the bloom or across the room from it, and they hide with the checkbox or
// whenever the infill itself is off — a handle for a control that is not
// running is just something else to click by accident.
function syncAnchorMarkers() {
  if (!infill || !anchorMarkers.length) return;
  const show = !!(showAnchorsBox.checked && infill.enabled && art && art.enabled);
  for (let i = 0; i < anchorMarkers.length; i++) {
    const m = anchorMarkers[i];
    m.visible = show;
    if (!show) continue;
    m.position.copy(infill.anchors[i]).applyMatrix4(art.units[i].mesh.matrixWorld);
    m.quaternion.copy(camera.quaternion);
    const dist = Math.max(camera.position.distanceTo(m.position), 1e-3);
    const wpp = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      / Math.max(canvas.clientHeight, 1);
    m.scale.setScalar(Math.max(wpp * 11, 1e-6));
  }
}
let frameStats = null, lastFrameMs = 0, frameSamples = 0, frameTotal = 0, lastReadout = 0;
renderer.setAnimationLoop(() => {
  controls.update();
  if (art) {
    const t0 = performance.now();
    frameStats = art.update(camera, [canvas.clientWidth, canvas.clientHeight], renderer.getPixelRatio());
    lastFrameMs = performance.now() - t0;
    if (frameStats) { frameTotal += lastFrameMs; frameSamples++; }
    if (infill && infill.enabled && art.enabled) {
      const t1 = performance.now();
      infillStats = infill.update(camera, [canvas.clientWidth, canvas.clientHeight], renderer.getPixelRatio());
      infillMs = performance.now() - t1;
    } else if (infill) {
      infill.update(camera, [canvas.clientWidth, canvas.clientHeight], renderer.getPixelRatio());
      infillStats = null; infillMs = 0;
    }
    if (renderArtHook && t0 - lastReadout > 160) {
      lastReadout = t0; renderArtHook(); if (renderInfillHook) renderInfillHook();
    }
  }
  syncAnchorMarkers();
  renderer.render(scene, camera);
  // The overlay is 2D and sits ON TOP of the drawing, so it renders with its
  // own orthographic camera in pixel space and must not clear what is there.
  if (infill && infill.enabled && art && art.enabled) {
    renderer.autoClear = false;
    renderer.render(infill.scene, infill.camera);
    renderer.autoClear = true;
  }
});

// ======================= CURRENT BUNDLE STATE ==============================
// Everything here describes THE BUNDLE PRESENTLY IN THE SCENE. It is mutable
// module state, reassigned wholesale on every load (default, file-input, or
// drop) — never patched in place — and read by the pose and stylize
// machinery below through closures, so that machinery is wired up exactly
// ONCE at startup and simply keeps working after a bundle swap instead of
// needing to be re-bound.
let currentRoot = null;         // the gltf.scene node currently in `scene`, or null
let pivot = null, marker = null;
let rig = null, handles = [];
let stemMesh = null;            // the CURRENT bundle's 'stem' mesh, or null — read by
                                 // repose() (art.refreshGeometry) and stemLinesRestVsBent()
let limits = null;
// RANGE and pivotOffset are never REASSIGNED (always `const`) — only their
// contents change — so the closures below that captured them at module load
// keep seeing updates without needing any re-wiring per bundle.
const RANGE = { droop: [-Infinity, Infinity], twist: [-Infinity, Infinity] };
const pivotOffset = new THREE.Vector3();
let droopDeg = 0, twistDeg = 0;

// --- pure helpers ------------------------------------------------------
// The hinge range comes from the BUNDLE, never from a constant here. The
// exporter owns the limits; a re-tune is a re-export, not a code edit.
function readLimits(extras) {
  const rl = extras && extras.rotation_limits_deg;
  const pair = (v, fb) => (Array.isArray(v) && v.length === 2 &&
    Number.isFinite(v[0]) && Number.isFinite(v[1])) ? [v[0], v[1]] : fb;
  if (!rl) return null;
  return { droop: pair(rl.droop, null), twist: pair(rl.twist, null) };
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ======================= POSE ==============================================
// Two independent axes, deliberately kept apart: the STEM is deformed
// geometry (print-stem.js rewrites vertices), the BLOOM is a node rotation
// on the pivot. Nothing in the bloom's mesh is touched.
//
// This whole section is wired up ONCE below, against the mutable state above
// — a bundle swap reassigns `rig`/`pivot`/etc. and this code picks the new
// values up on its next call, rather than being re-registered per load.

// The bloom hangs off the stem TIP, so a bent stem carries it along. Order
// is twist-then-droop about the tip frame: twist chooses which way the head
// falls, droop is how far it falls. Both are applied on top of the rotation
// the bend itself put into the tip, so the two axes compose instead of
// fighting.
function applyHinge() {
  if (!pivot) return;
  const tip = rig ? rig.tipFrame() : null;
  const q = new THREE.Quaternion();
  if (tip) {
    q.copy(tip.quaternion);
    pivot.position.copy(tip.position).add(pivotOffset);
  }
  const axisT = tip ? tip.tangent.clone() : new THREE.Vector3(0, 1, 0);
  const twistQ = new THREE.Quaternion().setFromAxisAngle(axisT, THREE.MathUtils.degToRad(twistDeg));
  // a lateral axis perpendicular to the tangent, carried through the twist
  const lat = new THREE.Vector3(1, 0, 0);
  if (Math.abs(lat.dot(axisT)) > 0.9) lat.set(0, 0, 1);
  lat.sub(axisT.clone().multiplyScalar(lat.dot(axisT))).normalize().applyQuaternion(twistQ);
  const droopQ = new THREE.Quaternion().setFromAxisAngle(lat, THREE.MathUtils.degToRad(droopDeg));
  pivot.quaternion.copy(droopQ).multiply(twistQ).multiply(q);
}

function syncHandles() { handles.forEach((h, i) => h.position.copy(rig.points[i])); }

function repose() {
  if (rig) rig.apply();
  syncHandles();
  applyHinge();
  // The stem's vertices moved, so its face normals and dihedral angles are
  // stale. The BLOOM's are not — it is posed by rotating a node — so only
  // the stem is re-read. Measured below, and printed in the read-out.
  if (art && stemMesh) art.refreshGeometry(stemMesh);
  renderPose();
}

// setPose is the ONE owner of the hinge constraint, and it clamps against the
// BUNDLE's limits rather than against the inputs' min/max attributes.
// Clamping against the attributes only re-checks what the browser already
// did to the widget — measured: writing "500" into an input with max=45
// yields "45" before any of this code runs, so a version with no clamp at all
// passed an out-of-range test that went through the slider. Every path into
// the model now goes through here, and the gate drives this function
// directly as well as through the slider.
function setPose(d, t) {
  droopDeg = clamp(Number.isFinite(d) ? d : droopDeg, RANGE.droop[0], RANGE.droop[1]);
  twistDeg = clamp(Number.isFinite(t) ? t : twistDeg, RANGE.twist[0], RANGE.twist[1]);
  droopIn.value = String(droopDeg);
  twistIn.value = String(twistDeg);
  applyHinge();
  renderPose();
}

// --- live pose read-out ------------------------------------------------
function renderPose() {
  droopOut.textContent = `${droopDeg.toFixed(1)}°`;
  twistOut.textContent = `${twistDeg.toFixed(1)}°`;
  const rows = [];
  if (rig) {
    rows.push('bend points        (Δ from rest)');
    rig.points.forEach((p, i) => {
      const d = p.clone().sub(rig.restPoints[i]);
      const tag = i === 0 ? 'root*' : (i === CONTROL_S.length - 1 ? 'tip  ' : `mid${i}`);
      rows.push(`  ${tag} s=${CONTROL_S[i].toFixed(2)}  ${vec(p.toArray())}`);
      rows.push(`        Δ ${vec(d.toArray())}${d.lengthSq() === 0 ? '  (rest)' : ''}`);
    });
    rows.push(`  * root is anchored`);
    rows.push(`stem              ${rig.isRest()
      ? `REST (residual ${rig.restResidualUlps().toFixed(2)} float32 ULP)`
      : 'BENT'}`);
  }
  rows.push(`droop             ${droopDeg.toFixed(1)}°  of [${droopIn.min}, ${droopIn.max}]${limits && limits.droop ? ' (from bundle)' : ' (NO LIMITS IN BUNDLE)'}`);
  rows.push(`twist             ${twistDeg.toFixed(1)}°  of [${twistIn.min}, ${twistIn.max}]${limits && limits.twist ? ' (from bundle)' : ' (NO LIMITS IN BUNDLE)'}`);
  if (pivot) rows.push(`pivot at          ${vec(pivot.position.toArray())}`);
  poseState.textContent = rows.join('\n');
}

// --- dragging ----------------------------------------------------------
// Raycast the handles; while one is held, OrbitControls is switched off so a
// drag cannot both bend the stem and spin the camera. Registered once, here —
// `handles`/`rig` are read fresh from the module state on every event, so a
// bundle swap needs no re-wiring.
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const hit = new THREE.Vector3();
const grabOffset = new THREE.Vector3();
let dragging = null;

function toNDC(ev) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
}

canvas.addEventListener('pointerdown', (ev) => {
  if (!rig && !anchorMarkers.some(m => m.visible)) return;
  toNDC(ev);
  ray.setFromCamera(ndc, camera);
  // Anchor rings are picked FIRST and drawn over everything, so grabbing
  // "where the dark goes" never turns into a stem bend by accident.
  const anchorPicks = anchorMarkers.length
    ? ray.intersectObjects(anchorMarkers.filter(m => m.visible), false) : [];
  const picks = anchorPicks.length ? anchorPicks
    : ray.intersectObjects(handles, false).filter(p => !p.object.userData.anchored);
  if (!picks.length) return;
  dragging = picks[0].object;
  // drag in the plane facing the camera through the handle
  dragPlane.setFromNormalAndCoplanarPoint(
    camera.getWorldDirection(new THREE.Vector3()).negate(), dragging.position);
  ray.ray.intersectPlane(dragPlane, hit);
  grabOffset.copy(dragging.position).sub(hit);
  controls.enabled = false;
  canvas.classList.add('dragging');
  canvas.setPointerCapture(ev.pointerId);
  ev.preventDefault();
});

canvas.addEventListener('pointermove', (ev) => {
  if (!dragging) return;
  toNDC(ev);
  ray.setFromCamera(ndc, camera);
  if (!ray.ray.intersectPlane(dragPlane, hit)) return;
  hit.add(grabOffset);
  if (dragging.userData.anchorIndex !== undefined) {
    // back into the part's OWN local space, which is where the anchor lives so
    // that it survives an orbit, a re-pose and a bundle swap's re-framing
    const i = dragging.userData.anchorIndex;
    const inv = new THREE.Matrix4().copy(art.units[i].mesh.matrixWorld).invert();
    infill.setAnchorLocal(i, hit.clone().applyMatrix4(inv));
    if (renderInfillHook) renderInfillHook();
  } else {
    rig.setPoint(dragging.userData.bendIndex, hit);
    repose();
  }
  ev.preventDefault();
});

function endDrag(ev) {
  if (!dragging) return;
  dragging = null;
  controls.enabled = true;
  canvas.classList.remove('dragging');
  if (ev && ev.pointerId !== undefined && canvas.hasPointerCapture(ev.pointerId))
    canvas.releasePointerCapture(ev.pointerId);
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// --- one-time control wiring ---------------------------------------------
droopIn.addEventListener('input', () => setPose(parseFloat(droopIn.value), twistDeg));
twistIn.addEventListener('input', () => setPose(droopDeg, parseFloat(twistIn.value)));

resetBtn.addEventListener('click', () => {
  if (rig) rig.resetPose();
  setPose(0, 0);
  repose();
});

// The marker toggle is wired once too; it no-ops when the current bundle has
// no marker (the per-load setup hides the row and leaves `marker` null).
markerBox.addEventListener('change', () => { if (marker) marker.visible = markerBox.checked; });

// ======================= STYLIZE ============================================
// Line art over the SAME live scene. Nothing here touches `rig`, `setPose`,
// the handles or the controls — the linework is a consumer of the pose, not
// a competitor with it.
//
// Wired up ONCE, exactly like POSE above: every function here reads `art`
// fresh from the module state, so a bundle swap (which reassigns `art` in
// onBundleLoaded/clearCurrentBundle) needs no re-registration. Each guards on
// `art` being non-null, because unlike the original single-bundle version of
// this stage, these listeners now stay attached across a swap onto a bundle
// with no stem or bloom to draw — a real reachable state now, not only a
// theoretical one.
function setStyle({ weight, detail, blend }) {
  if (!art) return;
  art.setOptions({ weight, detail, blend });
  if (weight !== undefined) weightIn.value = String(weight);
  if (detail !== undefined) detailIn.value = String(detail);
  if (blend !== undefined) dotsIn.value = String(blend);
  renderArt();
}
function readStyle() {
  if (!art) return;
  art.setOptions({
    weight: parseFloat(weightIn.value),
    detail: parseFloat(detailIn.value),
    blend: parseFloat(dotsIn.value),
  });
  renderArt();
}
weightIn.addEventListener('input', readStyle);
detailIn.addEventListener('input', readStyle);
dotsIn.addEventListener('input', readStyle);

// The switch is VIEW CHROME, in the same sense as the pivot marker: it
// decides what is drawn and nothing else. Unchecking it puts the shaded
// preview back with the pose exactly as it was.
function setLineArt(on) {
  if (!art) return;
  art.setEnabled(on);
  renderer.setClearColor(on ? 0xf2f0ea : 0x0c0e0e);
  lineArtBox.checked = on;
  renderArt();
}
lineArtBox.addEventListener('change', () => setLineArt(lineArtBox.checked));

// --- live line-art read-out -----------------------------------------
// Everything on it is MEASURED, including the timings. The CPU-vs-GPU call
// for this stage was made on these numbers, so the page that made it keeps
// reporting them rather than quoting a comment. Driven from the frame loop
// at ~6 Hz as well as on every input, because the interesting numbers
// (segment counts, milliseconds) move when the CAMERA moves and nothing
// fires an event for that.
function renderArt() {
  if (!art) { artState.textContent = ''; return; }
  weightOut.textContent = `${art.weight.toFixed(1)} px`;
  detailOut.textContent = `${art.detail.toFixed(0)}`;
  dotsOut.textContent = `${art.blend.toFixed(0)}%`;
  const rows = [];
  const topo = art.units.map(u => u.ex.topo);
  const tris = topo.reduce((a, t) => a + t.triCount, 0);
  const edges = topo.reduce((a, t) => a + t.edgeCount, 0);
  const bnd = topo.reduce((a, t) => a + t.boundaryCount, 0);
  const nm = topo.reduce((a, t) => a + t.nonManifold, 0);
  rows.push(`topology          ${tris} tri / ${edges} welded edges`);
  rows.push(`                  ${bnd} boundary, ${nm} edges with >2 faces (3rd dropped)`);
  rows.push(`build             ${art.units.map(u => u.ex.buildMs.toFixed(0)).join(' + ')} ms, ONCE at load`);
  if (!art.enabled) {
    rows.push('line art          OFF — shaded preview');
  } else {
    const st = frameStats || art.stats;
    rows.push(`crease threshold  ${art.creaseAngleDeg.toFixed(1)}° dihedral  (detail ${art.detail.toFixed(0)})`);
    if (st) {
      rows.push(`raw edges         ${st.segments}  = ${st.silhouette} silhouette + ${st.crease} crease`);
      rows.push(`chained           ${st.chains} strokes kept, ${st.dropped} dropped as too short`);
      rows.push(`                  contour ${st.contourChains} / interior ${st.interiorChains}`);
      rows.push(`simplified        ${st.ptsIn} → ${st.ptsOut} points (RDP ${CURATION.simplifyPx} px)`);
      rows.push(`curation          drop < ${CURATION.minChainPx} px contour / ${CURATION.minCreasePx} px interior`);
      rows.push(`weight            contour ${st.contourWeight.toFixed(2)} px, interior ${st.interiorWeight.toFixed(2)} px`);
      rows.push(`                  fixed ratio ${INTERIOR_WEIGHT_RATIO} — one slider scales both`);
      rows.push(`drawn as          ${st.strokes} stroke segs + ${st.dots} dots${st.truncated ? '  (TRUNCATED)' : ''}`);
      rows.push(`contour turn      mean ${st.contourTurnMean.toFixed(1)}°, ${st.contourTurnOver30}/${st.contourTurnJoins} joins over 30°`);
      rows.push(`                  (sampled 1 frame in 8 — an acos per point is not free)`);
      rows.push(`extract           ${st.extractMs.toFixed(2)} ms   chain ${st.chainMs.toFixed(2)} ms`);
      rows.push(`                  curate+smooth ${(st.frameMs - st.extractMs - st.chainMs).toFixed(2)} ms`);
      rows.push(`frame pass        ${lastFrameMs.toFixed(2)} ms of a 16.7 ms budget`);
    }
  }
  artState.textContent = rows.join('\n');
}


// ======================= INFILL ==========================================
// Authored shading inside the silhouette. It reads the SAME extraction the
// line work does — nothing here touches the surface, and no part of it knows
// what a petal is, which is why it runs unchanged on the fused bloom and on
// the stem, and would run unchanged on a leaf handed in on its own.
//
// WIRED ONCE, for the same reason STYLIZE is: `infill` is rebuilt per bundle
// (it is built over that bundle's extraction and its anchors live in those
// meshes' local space), but the controls below are registered at module load
// and read whatever `infill` currently is. A swap therefore cannot stack a
// second set of them. Every one no-ops while `infill` is null.

function readInfill() {
  const mode = infillModeIn.value;
  infill.setOptions({
    mode,
    spacing: parseFloat(infillSpacingIn.value),
    angleDeg: parseFloat(infillAngleIn.value),
    direction: infillDirectionIn.value,
    axialBias: parseFloat(infillAxialIn.value),
    layers: parseInt(infillLayersIn.value, 10),
    curvature: parseFloat(infillCurvatureIn.value),
    reach: parseFloat(infillReachIn.value),
    falloff: parseFloat(infillFalloffIn.value),
    jitter: parseFloat(infillJitterIn.value),
    gradient: parseFloat(infillGradientIn.value),
    veins: parseInt(infillVeinsIn.value, 10),
    veinWidth: parseFloat(infillVeinWidthIn.value),
    fillWeight: parseFloat(infillFillWeightIn.value),
  });
  // Only the controls that MEAN something in the chosen family are shown.
  // Layers is a cross-hatch idea, flow curvature is a line-flow one, and the
  // gradient/vein trio are tonal-fill ones; leaving any of them up would offer
  // a slider that silently does nothing. `spacing` goes the other way — the
  // tonal fill derives its row pitch from the stroke weight (see tonePitch()),
  // so the spacing slider is the one that would lie in that family.
  rowLayers.hidden = mode !== 'hatch';
  rowCurvature.hidden = mode !== 'flow';
  rowGradient.hidden = mode !== 'tone';
  rowVeins.hidden = mode !== 'tone';
  rowVeinWidth.hidden = mode !== 'tone';
  rowFillWeight.hidden = mode !== 'tone';
  rowSpacing.hidden = mode === 'tone';
  // The global angle and the axial ramp are the two halves of the direction
  // choice, and each lies in the other's mode: an angle slider that no stroke
  // obeys, or a base-to-tip ramp with no axis to run along.
  const axisMode = infillDirectionIn.value === 'axis';
  rowAngle.hidden = axisMode;
  rowAxial.hidden = !axisMode || mode === 'flow';
  // Per-part darkness is a tonal-fill idea too, and the block carries its own
  // caption, so it hides as a block rather than row by row.
  infillPartsEl.hidden = mode !== 'tone' || !darknessRows.length;
  renderInfill();
}
[infillSpacingIn, infillAngleIn, infillAxialIn, infillLayersIn, infillCurvatureIn,
 infillReachIn, infillFalloffIn, infillJitterIn,
 infillGradientIn, infillVeinsIn, infillVeinWidthIn, infillFillWeightIn].forEach(el => el.addEventListener('input', readInfill));
infillModeIn.addEventListener('change', readInfill);
infillDirectionIn.addEventListener('change', readInfill);
showAnchorsBox.addEventListener('change', () => { renderInfill(); });
resetAnchorsBtn.addEventListener('click', () => {
  infill.anchors.forEach((_, i) => infill.resetAnchor(i));
  renderInfill();
});


function renderInfill() {
  infillModeOut.textContent = '';
  infillSpacingOut.textContent = `${infill.spacing.toFixed(1)} px`;
  infillAngleOut.textContent = `${infill.angleDeg.toFixed(0)}°`;
  infillDirectionOut.textContent = '';
  infillAxialOut.textContent = `${infill.axialBias.toFixed(0)}%`;
  infillLayersOut.textContent = `${infill.layers}`;
  infillCurvatureOut.textContent = `${infill.curvature.toFixed(0)}`;
  infillReachOut.textContent = `${infill.reach.toFixed(0)}%`;
  infillFalloffOut.textContent = `${(infill.falloff / 100).toFixed(2)}`;
  infillJitterOut.textContent = `${infill.jitter.toFixed(0)}%`;
  infillGradientOut.textContent = `${infill.gradient.toFixed(0)}%`;
  infillVeinsOut.textContent = `${infill.veins} pair${infill.veins === 1 ? '' : 's'}`;
  infillVeinWidthOut.textContent = infill.veinWidth > 0 ? `${infill.veinWidth.toFixed(1)} px` : 'off';
  infillFillWeightOut.textContent = `${infill.fillWeight.toFixed(1)} px`;
  darknessRows.forEach((r) => {
    r.input.value = String(infill.darknessOf(r.index));
    r.out.textContent = `${infill.darknessOf(r.index).toFixed(0)}%`;
  });

  const rows = [];
  if (!infill.enabled) {
    rows.push('infill            OFF');
    rows.push('');
    rows.push('WHERE IS DARK     an authored ANCHOR, not a light and not a');
    rows.push('                  fixed base-to-tip rule. It starts at each');
    rows.push('                  part’s own centroid — which on a radial');
    rows.push('                  bloom is where the petals overlap, i.e. the');
    rows.push('                  botanical convention — and is then yours to');
    rows.push('                  drag. See print-infill.js for the argument.');
  } else if (!art.enabled) {
    rows.push('infill            waiting — line art is off');
  } else {
    const st = infillStats;
    const gamma = infill.falloff / 100;
    rows.push(`family            ${infill.mode === 'hatch' ? 'CROSS-HATCH'
      : infill.mode === 'tone' ? 'TONAL FILL' : 'LINE-FLOW'}`);
    if (infill.mode === 'tone') {
      rows.push(`fill              ${infill.gradient <= 0 ? 'SOLID to the outline'
        : `graded — ${infill.gradient.toFixed(0)}% of the tone field`}`);
      rows.push(`nib / row pitch   ${infill.fillWeight.toFixed(1)} px nib, rows ${infill.tonePitch().toFixed(2)} px apart`
        + `  (${TONE_LEVELS} dither levels)`);
      rows.push(`                  rows scale as 1/nib, and so does the cost.`);
      rows.push(`reserved lines    ${infill.veinWidth > 0
        ? `${infill.veinWidth.toFixed(1)} px withheld — midrib + ${infill.veins} lateral pair${infill.veins === 1 ? '' : 's'}`
        : 'OFF'}`);
      rows.push(`                  a vein is UNFILLED PAPER, never a stroke:`);
      rows.push(`                  its capsule is subtracted from each row.`);
      rows.push(`rows run at       ${infill.direction === 'axis'
        ? 'each part’s OWN axis (no shear — see below)' : `${infill.angleDeg.toFixed(0)}°`}`);
    } else if (infill.mode === 'hatch') {
      const angs = HATCH_OFFSETS_DEG.slice(0, infill.layers)
        .map(o => infill.direction === 'axis' ? `axis${o ? (o > 0 ? `+${o}` : `${o}`) : ''}°`
          : `${(infill.angleDeg + o + 360) % 180 | 0}°`).join(' / ');
      rows.push(`angles            ${angs}   (${infill.layers} layer${infill.layers > 1 ? 's' : ''})`);
      rows.push(`layer thresholds  ${LAYER_THRESHOLDS.slice(0, infill.layers).map(t => t.toFixed(2)).join(' / ')} tone`);
    } else {
      const c = infill.curvature;
      rows.push(`field             ${c > 15 ? 'CONCENTRIC about the anchor'
        : c < -15 ? 'RADIAL from the anchor' : 'straight grain'}  (${c.toFixed(0)})`);
      rows.push(`grain angle       ${infill.direction === 'axis'
        ? 'each part’s OWN axis' : `${infill.angleDeg.toFixed(0)}°`}`);
    }
    if (infill.mode !== 'tone') rows.push(`spacing           ${infill.spacing.toFixed(1)} px`);
    rows.push('');
    if (infill.direction === 'axis') {
      rows.push('DIRECTION         SHAPE AXIS — derived per part from its own');
      rows.push('                  filled region. The axis is the STRAIGHT');
      rows.push('                  principal axis, so on a part whose length');
      rows.push('                  curves it is a chord: right in the middle,');
      rows.push('                  drifting off the margin at both ends.');
      if (infill.mode === 'hatch') {
        rows.push('                  Cross-hatch shears the frame by the shape’s');
        rows.push('                  own centre line so a stroke follows the');
        rows.push('                  bend; the fill does NOT (a solid fill has');
        rows.push('                  no legible stroke direction to curve).');
      }
      rows.push(`axial ramp        ${infill.axialBias > 0
        ? `${infill.axialBias.toFixed(0)}% — coverage x (1 - ${(infill.axialBias / 100).toFixed(2)} x station)`
        : 'OFF (0%) — inert, identical to no ramp'}`);
      rows.push('                  base -> tip, min’d with the anchor’s field.');
    } else {
      rows.push(`DIRECTION         GLOBAL ${infill.angleDeg.toFixed(0)}° — one angle for the whole`);
      rows.push('                  model. The right answer for a shape with no');
      rows.push('                  meaningful long axis, which is what the');
      rows.push('                  FUSED bloom is: see “shape axis”.');
    }
    rows.push('');
    if (infill.mode === 'tone' && infill.gradient <= 0) {
      rows.push(`WHERE IS DARK     the per-part DARKNESS below. The anchor and`);
      rows.push(`                  its falloff are inert at gradient 0 — a`);
      rows.push(`                  solid fill has no ramp to place.`);
    } else {
      rows.push(`WHERE IS DARK     authored anchor, per part — no light source`);
      rows.push(`  falloff         tone = (1 - d/reach)^${gamma.toFixed(2)}`);
      rows.push(`  jitter          ±${infill.jitter.toFixed(0)}% on each line’s threshold radius`);
    }
    if (st) {
      for (const p of st.parts) {
        if (!p.ok) { rows.push(`  ${(p.name || '?').padEnd(14)} no silhouette this frame`); continue; }
        if (p.axis) {
          rows.push(`  ${(p.name || '?').padEnd(14)} axis ${p.axis.angleDeg.toFixed(0)}°`
            + `  ${p.axis.lengthPx.toFixed(0)} px long  base at `
            + `${p.axis.base.map(v => v.toFixed(0)).join(',')}  (${p.axis.basis})`
            + `  bend ${p.axis.warpDeviationPx.toFixed(1)} px / ${p.axis.warpPieces} piece${p.axis.warpPieces === 1 ? '' : 's'}`);
        } else if (infill.direction === 'axis') {
          rows.push(`  ${(p.name || '?').padEnd(14)} NO AXIS — silhouette has no extent`);
        }
        if (infill.mode === 'tone') {
          rows.push(`  ${(p.name || '?').padEnd(14)} darkness ${String(p.darkness.toFixed(0)).padStart(3)}%`
            + `  ${p.rows} rows  ${p.reservedRows} cut by a vein  ${p.segments} segs`
            + `${p.openRows ? `  ${p.openRows} CLOSED AT THE LAST CROSSING` : ''}`);
          continue;
        }
        rows.push(`  ${(p.name || '?').padEnd(14)} anchor ${p.anchorPx.map(v => v.toFixed(0)).join(',')} px`
          + `  reach ${p.reachPx.toFixed(0)} px  ${p.segments} segs`);
      }
      rows.push('');
      rows.push(`silhouette        ${st.parts.reduce((a, p) => a + p.silhouette, 0)} oriented edges (nonzero winding)`);
      rows.push(`drawn             ${st.segments} segments from ${st.seeds} `
        + `${infill.mode === 'hatch' ? 'hatch lines' : infill.mode === 'tone' ? 'fill rows' : 'seeds'}`
        + `${st.truncated ? '  (TRUNCATED)' : ''}`);
      rows.push(`infill pass       ${infillMs.toFixed(2)} ms  (line art ${lastFrameMs.toFixed(2)} ms of 16.7)`);
    }
  }
  infillState.textContent = rows.join('\n');
}

// Builds the infill for the bundle CURRENTLY in the scene, and pushes the
// panel's settings onto it so a swap does not silently reset the shading.
// Called from the STYLIZE build, because the infill is a second consumer of
// the very extraction that build creates.
function buildInfill() {
  if (!art) return;
  // and on the stem, and would run unchanged on a leaf handed in on its own.
  infill = new Infill(art, { ink: 0x14181a });
  
  // --- the anchors, as things you can grab --------------------------------
  // The anchor IS the "where is dark" decision, so it is a handle rather than
  // a number in a panel. Each part gets a ring at its own anchor, drawn on
  // top of everything (like the bend points) and dragged in the plane facing
  // the camera. It starts at the part's centroid — the botanical default —
  // and dragging it is the only way the shading moves.
  anchorMarkers = infill.anchors.map((_, i) => {
    // A FILLED disc, with the ring only as its visible edge. An annulus reads
    // better on screen but is the wrong pick target: a ray aimed at the middle
    // of a ring goes through the hole, so grabbing the anchor where it plainly
    // is would miss it. The disc is what gets picked; the ring is decoration.
    const m = new THREE.Mesh(new THREE.CircleGeometry(1.24, 32), new THREE.MeshBasicMaterial({
      color: 0xe0a03a, depthTest: false, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
    }));
    const edge = new THREE.Mesh(new THREE.RingGeometry(1, 1.24, 32), new THREE.MeshBasicMaterial({
      color: 0xe0a03a, depthTest: false, transparent: true, opacity: 0.95, side: THREE.DoubleSide,
    }));
    edge.renderOrder = 13;
    m.add(edge);
    m.renderOrder = 12;
    m.name = `infillAnchor${i}`;
    m.userData.anchorIndex = i;
    scene.add(m);
    return m;
  });
  // Sized against the part's own extent so a ring is grabbable on a stem and
  // not a dinner plate on the bloom.
  anchorMarkers.forEach((m, i) => {
    const u = art.units[i];
    u.mesh.geometry.computeBoundingBox();
    const bb = u.mesh.geometry.boundingBox;
    m.userData.radius = Math.max(bb.min.distanceTo(bb.max) * 0.035, 1e-3);
  });
  
  // --- per-part darkness, one row per part -------------------------------
  // The ONE control that makes the reference's depth expressible: its tone
  // comes from a dark shape sitting beside a light one, which no single
  // slider for the whole picture can say. Built per bundle because the parts
  // are the bundle's, and REPLACED wholesale each time — the old rows are
  // removed from the DOM, so their listeners go with them and a swap cannot
  // stack a second set. `swap/darkness-rows-do-not-stack` is the witness.
  darknessRows.forEach(r => r.row.remove());
  darknessRows = art.units.map((u, i) => {
    const row = document.createElement('div');
    row.className = 'pose-row';
    row.dataset.part = String(i);
    const id = `infillDarkness${i}`;
    const label = document.createElement('label');
    label.setAttribute('for', id);
    label.textContent = (u.mesh.name || `part ${i}`).slice(0, 7);
    const input = document.createElement('input');
    input.type = 'range'; input.id = id;
    input.min = '0'; input.max = '100'; input.step = '1';
    input.value = String(infill.darknessOf(i));
    const out = document.createElement('output');
    out.id = `${id}Out`;
    out.textContent = `${infill.darknessOf(i).toFixed(0)}%`;
    input.addEventListener('input', () => {
      if (!infill) return;
      infill.setDarkness(i, parseFloat(input.value));
      renderInfill();
    });
    row.append(label, input, out);
    infillPartsEl.append(row);
    return { index: i, row, input, out };
  });

  renderInfillHook = renderInfill;
  setPanelPopulated(infillEmpty, infillBody, true);
  readInfill();
  window.__printInfill = INFILL_HOOK;
}

// Defined once, ATTACHED per bundle — the same contract as __printLineArt, so
// "is there a bundle" is answerable the same way for both. Its accessors deref
// `infill`, so leaving it attached with nothing loaded would hand the gate an
// object that throws instead of an absence it can test.
const INFILL_HOOK = {
  setMode: (m) => { infillModeIn.value = m; infillModeIn.dispatchEvent(new Event('change')); },
  mode: () => infill.mode,
  enabled: () => infill.enabled,
  options: () => ({ spacing: infill.spacing, angleDeg: infill.angleDeg, layers: infill.layers,
    curvature: infill.curvature, reach: infill.reach, falloff: infill.falloff, jitter: infill.jitter,
    gradient: infill.gradient, veins: infill.veins, veinWidth: infill.veinWidth,
    fillWeight: infill.fillWeight, direction: infill.direction, axialBias: infill.axialBias }),

  // --- the derived direction ---------------------------------------------
  // Driven through the REAL select, so what the gate drives is what a hand
  // drives; read back off the module, which is what lets the two be compared.
  setDirection: (v) => { infillDirectionIn.value = v; infillDirectionIn.dispatchEvent(new Event('change')); },
  direction: () => infill.direction,
  directions: () => INFILL_DIRECTIONS.slice(),
  // The axis the strokes were actually run along this frame, per part, in
  // pixels — handed back rather than re-derived, for the same reason the vein
  // paths are.
  axis: (i) => {
    const a = infill.axes[i];
    if (!a) return null;
    return { angleDeg: a.angleDeg, basis: a.basis, base: a.base.slice(), tip: a.tip.slice(),
      lengthPx: a.t1 - a.t0, cx: a.cx, cy: a.cy, ex: a.ex, ey: a.ey,
      warpPieces: infill.warps[i] ? infill.warps[i].K : 1,
      warpDeviationPx: infill.warps[i] ? infill.warps[i].deviationPx : 0 };
  },
  attachmentLocal: (i) => (infill.attachments[i] ? infill.attachments[i].toArray() : null),
  attachmentPx: (i) => (infill.frames[i].hasAttach ? [infill.frames[i].atx, infill.frames[i].aty] : null),
  setWidget: (id, v) => {
    const el = { spacing: infillSpacingIn, angle: infillAngleIn, layers: infillLayersIn,
      curvature: infillCurvatureIn, reach: infillReachIn, falloff: infillFalloffIn,
      jitter: infillJitterIn, gradient: infillGradientIn, veins: infillVeinsIn,
      veinWidth: infillVeinWidthIn, fillWeight: infillFillWeightIn,
      axial: infillAxialIn }[id];
    el.value = String(v); el.dispatchEvent(new Event('input'));
  },

  // --- tonal fill --------------------------------------------------------
  // Darkness goes through the REAL slider, so what the gate drives is what a
  // hand drives. `darkness()` reads the module rather than the widget, which
  // is what lets the two be compared.
  darkness: (i) => infill.darknessOf(i),
  setDarknessWidget: (i, v) => {
    const r = darknessRows[i];
    r.input.value = String(v); r.input.dispatchEvent(new Event('input'));
  },
  darknessRowCount: () => darknessRows.length,
  darknessRowsInDom: () => infillPartsEl.querySelectorAll('.pose-row').length,
  partsBlockVisible: () => !infillPartsEl.hidden,
  tonePitch: () => infill.tonePitch(),
  toneLevels: () => TONE_LEVELS,
  toneOrder: () => TONE_ORDER.slice(),
  // The vein paths the fill actually reserved against this frame, in pixels.
  // Handed back rather than re-derived in the gate: comparing the ink to a
  // second construction of the veins would test the two constructions against
  // each other, not the reservation.
  veinPaths: (i) => infill.veinPathsFor(i),
  stats: () => infillStats,
  limits: () => ({ ...INFILL_LIMITS }),
  thresholds: () => LAYER_THRESHOLDS.slice(),
  offsets: () => HATCH_OFFSETS_DEG.slice(),
  infillText: () => infillState.textContent,
  rowVisibility: () => ({ layers: !rowLayers.hidden, curvature: !rowCurvature.hidden,
    angle: !rowAngle.hidden, axial: !rowAxial.hidden }),

  // The emitted geometry, in PIXELS, exactly as it is drawn. Everything the
  // gate asserts about clipping is measured off this rather than off a
  // screenshot: "no ink outside the outline" is a claim about coordinates,
  // and a screenshot can only ever answer it to within an anti-aliased edge.
  segments: (partIndex) => {
    const d = infill.draws[partIndex];
    const out = [];
    for (let i = 0; i < d.count; i++) {
      const o = i * 6;
      out.push([d.buf.array[o], d.buf.array[o + 1], d.buf.array[o + 3], d.buf.array[o + 4]]);
    }
    return out;
  },
  partCount: () => infill.draws.length,
  partNames: () => art.units.map(u => u.mesh.name),
  // EVERY triangle of one part, projected to pixels, front-facing only. The
  // one instrument in this file that does NOT go through the silhouette: it is
  // how the gate can ask "does the fill cover the shape" without asking the
  // outline, which is the thing under test when the outline is open. Capped,
  // because the bloom is 301,152 triangles and this is a debugging hook, not a
  // render path.
  projectedTriangles: (partIndex, cap = 20000) => {
    const u = art.units[partIndex];
    const g = u.mesh.geometry;
    const P = g.getAttribute('position').array;
    const I = g.index ? g.index.array : null;
    const triCount = I ? I.length / 3 : P.length / 9;
    if (triCount > cap) return null;
    u.mesh.updateWorldMatrix(true, false);
    const m = new THREE.Matrix4().copy(camera.projectionMatrix)
      .multiply(camera.matrixWorldInverse).multiply(u.mesh.matrixWorld);
    const M = m.elements;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const out = [];
    const p = [0, 0, 0];
    for (let f = 0; f < triCount; f++) {
      let ok = true;
      for (let j = 0; j < 3; j++) {
        const vi = (I ? I[f * 3 + j] : f * 3 + j) * 3;
        const x = P[vi], y = P[vi + 1], z = P[vi + 2];
        const cw = M[3] * x + M[7] * y + M[11] * z + M[15];
        if (cw <= 1e-6) { ok = false; break; }
        p[j] = [((M[0] * x + M[4] * y + M[8] * z + M[12]) / cw * 0.5 + 0.5) * W,
                (0.5 - (M[1] * x + M[5] * y + M[9] * z + M[13]) / cw * 0.5) * H];
      }
      if (ok) out.push([p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1]]);
    }
    return out;
  },

  // The projected silhouette of one part, oriented, as the clipper sees it.
  silhouette: (partIndex) => {
    const f = infill.frames[partIndex];
    const out = [];
    for (let i = 0; i < f.n; i++) out.push([f.x0[i], f.y0[i], f.x1[i], f.y1[i]]);
    return out;
  },
  frame: (partIndex) => {
    const f = infill.frames[partIndex];
    return { ok: f.ok, n: f.n, ax: f.ax, ay: f.ay, reach: f.reach, depth: f.depth,
      minX: f.minX, minY: f.minY, maxX: f.maxX, maxY: f.maxY };
  },
  anchorLocal: (i) => infill.anchors[i].toArray(),
  setAnchorLocal: (i, a) => { infill.anchors[i].set(a[0], a[1], a[2]); renderInfill(); },
  resetAnchors: () => { resetAnchorsBtn.click(); },
  anchorScreenPos: (i) => {
    const v = anchorMarkers[i].position.clone().project(camera);
    const r = canvas.getBoundingClientRect();
    return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - (v.y + 1) / 2) * r.height];
  },
  anchorsVisible: () => anchorMarkers.map(m => m.visible),
  // Leak witnesses across a bundle swap. The infill's draw objects live in its
  // OWN overlay scene and its anchor rings live in the main one, so a rebuild
  // that failed to tear the old one down would show up as one of these two
  // counts climbing — and nothing else on the page would notice.
  overlayObjects: () => infill.scene.children.length,
  anchorObjectsInScene: () => {
    let n = 0;
    scene.traverse(o => { if ((o.name || '').startsWith('infillAnchor')) n++; });
    return n;
  },
  // tone is a pure function and is checked as one
  toneAt, toneRadius, toneCoverage, levelThreshold,
};

// ======================= BUNDLE LOADING ====================================

// Frees the GPU-side resources of whatever is currently in the scene. Not
// required for correctness within a single load, but a session that swaps in
// several multi-megabyte bundles in a row (exactly this feature's use case)
// should not quietly accumulate every one of them in GPU memory.
//
// This also catches every line-art draw object: LineArt parents its
// LineSegments2/Points children directly onto the source mesh (print-lines.js,
// `mesh.add(lines)` / `mesh.add(dots)`), so traversing `currentRoot` reaches
// them too, and disposing a material generically disposes any texture on it
// (the dot sprite included) as a side effect — no line-art-specific case
// needed here for anything that is actually IN the tree.
function disposeObject3D(root) {
  if (!root) return;
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    for (const m of mats) {
      for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); }
      m.dispose();
    }
  });
}

// Tears down everything the PREVIOUS bundle set up: removes it from the
// scene (disposing its GPU resources), removes the pose handles, resets
// every piece of pose state to neutral, and drops the line-art instance.
// Called at the start of every successful load — including the very first —
// so "swap bundles" and "start from nothing" are the same code path.
//
// STYLIZE is the one exception to "reset everything": the slider VALUES
// (weight/detail/dots) and the line-art on/off toggle are left untouched.
// They are a rendering preference, not a property of any one bundle's
// geometry — unlike pose, whose bend points and hinge angles stop meaning
// anything the moment the underlying stem or pivot changes, a "weight 3px,
// detail 60" look is exactly what someone comparing several test bundles
// wants to carry from one to the next.
function clearCurrentBundle() {
  // Only ONE of a unit's two materials (`fill` while line art is on, the
  // mesh's own `original` otherwise) is ever attached to `mesh.material` at a
  // time, so disposeObject3D's generic traversal below can only ever reach
  // one of them — the other would leak silently. Dispose both explicitly,
  // before either the mesh tree or `art` itself goes away; disposing
  // whichever one WAS already reachable a second time here is harmless.
  if (art) {
    for (const u of art.units) {
      if (u.fill) u.fill.dispose();
      if (u.original) u.original.dispose();
    }
  }
  art = null;
  renderArtHook = null;
  frameStats = null;
  setPanelPopulated(stylizeEmpty, stylizeBody, false);
  window.__printLineArt = undefined;

  // The infill is built OVER that art — its anchors live in the outgoing
  // bundle's meshes' local space and its draw objects are sized from that
  // bundle's extraction — so it goes with it. Its overlay scene is its own,
  // which is why this is a dispose() rather than a scene traversal.
  if (infill) infill.dispose();
  infill = null;
  renderInfillHook = null;
  infillStats = null;
  anchorMarkers.forEach((m) => {
    scene.remove(m);
    m.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  });
  anchorMarkers = [];
  setPanelPopulated(infillEmpty, infillBody, false);
  window.__printInfill = undefined;
  darknessRows.forEach(r => r.row.remove());
  darknessRows = [];
  infillPartsEl.hidden = true;

  if (currentRoot) { scene.remove(currentRoot); disposeObject3D(currentRoot); }
  currentRoot = null;
  handles.forEach((h) => { scene.remove(h); h.geometry.dispose(); h.material.dispose(); });
  handles = [];
  rig = null; pivot = null; marker = null; limits = null; stemMesh = null;
  droopDeg = 0; twistDeg = 0;
  RANGE.droop = [-Infinity, Infinity];
  RANGE.twist = [-Infinity, Infinity];
  pivotOffset.set(0, 0, 0);
  markerBox.checked = false;
  markerToggle.hidden = true;
  droopIn.min = String(WIDGET_DEFAULT.droop[0]); droopIn.max = String(WIDGET_DEFAULT.droop[1]);
  twistIn.min = String(WIDGET_DEFAULT.twist[0]); twistIn.max = String(WIDGET_DEFAULT.twist[1]);
  droopIn.value = '0'; twistIn.value = '0';
  setPanelPopulated(poseEmpty, poseBody, false);
}

// A load that fails — a file that isn't valid glTF at all, or any other
// GLTFLoader error — is reported visibly and otherwise CHANGES NOTHING: the
// currently displayed bundle (if any) stays exactly as it was, so a bad drop
// cannot blank the viewport or lose whatever pose the user had. This is why
// clearCurrentBundle() is only ever called from a SUCCESSFUL load, never from
// this path.
function onBundleFailed(err, label) {
  const msg = String(err && err.message ? err.message : err);
  console.error('[print] failed to load', label, err);
  if (lines.length) log('');
  fail(`failed to load "${label}"`);
  fail(msg);
  if (window.__printScaffold) window.__printScaffold.lastLoadError = `${label}: ${msg}`;
  else window.__printScaffold = { ready: false, error: msg, lastLoadError: `${label}: ${msg}` };
}

// The one place a parsed gltf becomes the on-screen bundle — reached from the
// default fetch-based load AND from every file-input/drop load. Mirrors the
// original single-bundle setup almost exactly; the only new work is
// clearCurrentBundle() up front and reading the bundle's own limits (or the
// widget defaults) instead of leaving stale slider bounds from whatever
// loaded before.
function onBundleLoaded(gltf, label) {
  clearCurrentBundle();
  currentRoot = gltf.scene;
  scene.add(currentRoot);

  // Frame the model rather than guessing a camera distance — the bundle's
  // units are whatever the exporter used, and this page should not care.
  const box = new THREE.Box3().setFromObject(currentRoot);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.length() / 2, 1e-3);
  const dist = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.position.copy(center).add(new THREE.Vector3(0.55, 0.45, 1).normalize().multiplyScalar(dist * 1.25));
  camera.near = dist / 100;
  camera.far = dist * 100;
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.update();

  let meshes = 0, tris = 0;
  const named = [];
  currentRoot.traverse((o) => {
    named.push(o.name || '(unnamed)');
    if (!o.isMesh) return;
    meshes++;
    const g = o.geometry;
    tris += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
  });

  lines.length = 0;
  log(`<b>/print scaffold</b>  three r${THREE.REVISION}`);
  log(`bundle   ${label}`);
  log(`nodes    ${named.length} — ${named.join(', ')}`);
  log(`meshes   ${meshes}   triangles ${tris}`);
  log(`bounds   ${vec(size.toArray())} (centre ${vec(center.toArray())})`);
  log('');

  // The point of the session that started this file: does the pivot node's
  // `extras` survive the loader? GLTFLoader puts glTF `extras` on
  // Object3D.userData verbatim. Names are sanitized by the loader (slashes
  // stripped), so match loosely. The bundle carries TWO nodes whose name
  // contains "pivot" — the transform node and the `pivot_marker` sphere that
  // is its child. Match the marker first and the transform node exactly, so
  // this does not depend on the order traverse() happens to visit them in.
  currentRoot.traverse((o) => {
    const n = (o.name || '').toLowerCase();
    if (!n.includes('pivot')) return;
    if (n.includes('marker')) { if (!marker) marker = o; }
    else if (!pivot) pivot = o;
  });

  // The marker is the exporter's own diagnostic sphere sitting at the
  // junction, not scene content — hidden by default, with view chrome to
  // bring it back. Hiding is `visible`, never a removal: it stays in the
  // tree so the node counts and the extras above still describe the bundle
  // as shipped rather than as displayed.
  if (marker) {
    marker.visible = false;
    markerBox.checked = false;
    markerToggle.hidden = false;
  }

  if (!pivot) {
    fail('pivot   NOT FOUND — no node whose name contains "pivot"');
  } else {
    const x = pivot.userData || {};
    log(`<b>pivot node</b>  "${pivot.name}"  at ${vec(pivot.position.toArray())}`);
    log(`  children            ${pivot.children.map(c => (c.name || '(unnamed)') + (c === marker ? ' (hidden)' : '')).join(', ') || '(none)'}`);
    if (!Object.keys(x).length) {
      fail('  extras  EMPTY — the node exists but carried no extras through the loader');
    } else {
      // Printed STRUCTURALLY, not against an assumed shape. This session's
      // only claim is that the metadata round-trips; the exporter owns the
      // schema, and a debug panel that hardcoded one would quietly report
      // "(absent)" the first time that schema moved.
      log('  extras');
      (function dump(v, indent) {
        for (const [k, val] of Object.entries(v)) {
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            log(`${indent}${k}`);
            dump(val, indent + '  ');
          } else if (typeof val === 'string') {
            log(`${indent}${k.padEnd(20 - indent.length + 4)} ${val}`);
          } else {
            log(`${indent}${k.padEnd(20 - indent.length + 4)} ${vec(val)}`);
          }
        }
      })(x, '    ');
    }
  }

  // Also on the console, as asked.
  console.log('[print] pivot node:', pivot);
  console.log('[print] pivot extras (userData):', pivot ? pivot.userData : null);

  stemMesh = currentRoot.getObjectByName('stem');

  if (stemMesh) {
    rig = new StemRig(stemMesh);
    // keep the pivot's original offset from the stem tip, so the bloom sits
    // where the exporter put it rather than snapped onto the centreline
    if (pivot) pivotOffset.copy(pivot.position).sub(rig.restTip());

    // Draggable handles. The root (index 0) is anchored and rendered dimmer;
    // it is in the list so the anchor is visible, not so it can be moved.
    const hr = Math.max(rig.coreRadius * 2.2, rig.length * 0.016);
    const geo = new THREE.SphereGeometry(hr, 20, 14);
    handles = CONTROL_S.map((sVal, i) => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x4a5654 : 0x6fb7ae, depthTest: false, transparent: true,
        opacity: i === 0 ? 0.75 : 0.95,
      }));
      m.renderOrder = 10;
      m.name = `bendPoint${i}`;
      m.userData.bendIndex = i;
      m.userData.anchored = i === 0;
      m.position.copy(rig.points[i]);
      scene.add(m);
      return m;
    });

    rig.apply();
    applyHinge();
  }

  // --- hinge sliders -----------------------------------------------------
  // The hinge range comes from THIS bundle, or the widget's own HTML-declared
  // defaults if it declares none — never from whatever the PREVIOUS bundle
  // left in the min/max attributes. clearCurrentBundle() already reset them;
  // this only overrides them where the new bundle actually says something.
  limits = readLimits(pivot ? pivot.userData : null);
  if (limits && limits.droop) { droopIn.min = limits.droop[0]; droopIn.max = limits.droop[1]; }
  if (limits && limits.twist) { twistIn.min = limits.twist[0]; twistIn.max = limits.twist[1]; }
  RANGE.droop = (limits && limits.droop) || [-Infinity, Infinity];
  RANGE.twist = (limits && limits.twist) || [-Infinity, Infinity];
  droopIn.value = String(clamp(0, +droopIn.min, +droopIn.max));
  twistIn.value = String(clamp(0, +twistIn.min, +twistIn.max));

  setPanelPopulated(poseEmpty, poseBody, !!(rig || pivot));
  renderPose();

  // ======================= STYLIZE =======================================
  // Line art over the SAME live scene, on THIS bundle's own stem/bloom
  // meshes. The controls themselves (setStyle/readStyle/setLineArt/renderArt,
  // and the four listeners) are wired up ONCE, above — this block only
  // creates a fresh LineArt for the new geometry and re-applies whatever the
  // sliders currently say, exactly as a real user touching them would.

  // EVERY drawable mesh in the bundle, not a hardcoded stem+bloom pair.
  // The first bundle had exactly two parts, so naming them was indistinguish-
  // able from finding them; `bloom-stem-leaf-bundle.glb` has a leaf as its own
  // node and mesh, and under the old list it was in the scene, posed with the
  // stem, and drawn by nothing. The only exclusion is the exporter's own
  // diagnostic marker, which is not artwork — it is matched by name here for
  // the same reason it is matched by name above, and it is hidden anyway.
  //
  // Traversal order is the bundle's own node order, so the two-part bundle
  // still yields exactly [stem, bloom] and every part index in the gates and
  // the sheets keeps meaning what it meant.
  const artMeshes = [];
  currentRoot.traverse((o) => {
    if (!o.isMesh || o === marker) return;
    if ((o.name || '').toLowerCase().includes('marker')) return;
    artMeshes.push(o);
  });
  if (artMeshes.length) {
    art = new LineArt(artMeshes, { ink: 0x14181a, paper: 0xf2f0ea });
    setPanelPopulated(stylizeEmpty, stylizeBody, true);

    // The handles are UI, not model: they keep their own flat material and
    // stay on top of the paper so the pose is still grabbable while stylized.
    // Explicitly restated here because the line art repaints everything else.
    handles.forEach(h => { h.material.depthTest = false; });

    art.setOptions({
      weight: parseFloat(weightIn.value),
      detail: parseFloat(detailIn.value),
      blend: parseFloat(dotsIn.value),
    });
    setLineArt(lineArtBox.checked);

    renderArtHook = renderArt;
    renderArt();

    window.__printLineArt = {
      setLineArt, setStyle,
      enabled: () => art.enabled,
      style: () => ({ weight: art.weight, detail: art.detail, blend: art.blend }),
      creaseAngleDeg: () => art.creaseAngleDeg,
      detailToAngleDeg,
      stats: () => art.stats,
      topology: () => art.units.map(u => ({
        name: u.mesh.name, tris: u.ex.topo.triCount, verts: u.ex.topo.vertexCount,
        edges: u.ex.topo.edgeCount, boundary: u.ex.topo.boundaryCount,
        nonManifold: u.ex.topo.nonManifold, buildMs: u.ex.buildMs,
        geometryMs: u.ex.geometryMs, extractMs: u.ex.extractMs,
        silhouette: u.ex.silhouetteCount, crease: u.ex.creaseCount,
        segments: u.ex.segmentCount,
      })),
      perf: () => ({ lastFrameMs, meanFrameMs: frameSamples ? frameTotal / frameSamples : 0, frames: frameSamples }),
      resetPerf: () => { frameTotal = 0; frameSamples = 0; },
      // per TIER now: [contour, interior] for each mesh
      materialWidth: () => art.units.map(u => u.tiers.map(t => t.mat.linewidth)),
      dotSize: () => art.units.map(u => u.tiers.map(t => t.dotMat.size)),
      strokeInstances: () => art.units.map(u => u.tiers.map(t => t.lines.geometry.instanceCount)),
      dotInstances: () => art.units.map(u => u.tiers.map(t => t.dotGeo.drawRange.count)),
      curation: () => ({ ...CURATION, interiorWeightRatio: INTERIOR_WEIGHT_RATIO }),
      // Curation is a CONSTANT in the shipped page, not a control — the panel
      // has the three sliders the stage is specified to have. This reaches
      // past that so the contact sheet can photograph the trade-off and the
      // gate can drive it, without inventing a fourth slider to do it.
      setCuration: (o) => { Object.assign(CURATION, o); },
      measureTurnsNow: () => { art._forceTurns = true; },
      skipped: () => !!art.skipped,
      // Two identical updates in ONE tick. The second must be skipped, because
      // nothing changed between them. Waiting for the camera to go still and
      // watching for a skip does NOT work in this harness and was measured not
      // to: headless runs at ~2 fps, so OrbitControls' damping is still moving
      // the view by ~17 px per poll six seconds after a drag. This asks the
      // question the skip actually answers.
      skipRepeat: () => {
        const size = [canvas.clientWidth, canvas.clientHeight], pr = renderer.getPixelRatio();
        art.update(camera, size, pr); const first = !!art.skipped;
        art.update(camera, size, pr); const second = !!art.skipped;
        // ...and a pose change must un-skip it
        if (rig) { rig.setPoint(2, rig.points[2].clone().addScalar(3)); repose(); }
        art.update(camera, size, pr); const afterPose = !!art.skipped;
        if (rig) { rig.setPoint(2, rig.points[2].clone().addScalar(-3)); repose(); }
        art.update(camera, size, pr);
        return { first, second, afterPose };
      },
      // The maximum turn angle between consecutive drawn segments, over the
      // contour tier. This is the SHAPE claim: a faceted staircase turns hard
      // and often, a smoothed contour does not. Read off the emitted buffer,
      // not off the smoother's intentions.
      contourTurnAngles: () => {
        const out = [];
        for (const u of art.units) {
          const t = u.tiers.find(x => x.kind === 1);
          const A = t.buf.array, n = t.lines.geometry.instanceCount;
          let prev = null, worst = 0, sum = 0, cnt = 0, over30 = 0;
          for (let i = 0; i < n; i++) {
            const o = i * 6;
            const dx = A[o+3]-A[o], dy = A[o+4]-A[o+1], dz = A[o+5]-A[o+2];
            const l = Math.hypot(dx, dy, dz);
            if (l < 1e-9) { prev = null; continue; }
            const d = [dx/l, dy/l, dz/l];
            // consecutive only when this segment starts where the last ended
            const joined = prev && Math.abs(A[o]-prev.ex) < 1e-6
              && Math.abs(A[o+1]-prev.ey) < 1e-6 && Math.abs(A[o+2]-prev.ez) < 1e-6;
            if (joined) {
              const c = Math.max(-1, Math.min(1, d[0]*prev.d[0] + d[1]*prev.d[1] + d[2]*prev.d[2]));
              const ang = Math.acos(c) * 180 / Math.PI;
              worst = Math.max(worst, ang); sum += ang; cnt++;
              if (ang > 30) over30++;
            }
            prev = { d, ex: A[o+3], ey: A[o+4], ez: A[o+5] };
          }
          out.push({ mesh: u.mesh.name, joins: cnt, maxTurnDeg: worst,
                     meanTurnDeg: cnt ? sum / cnt : 0, over30 });
        }
        return out;
      },
      artText: () => artState.textContent,
      // The stem's line set at rest and at the CURRENT bend, both extracted at
      // the SAME camera inside one tick. The gate needs this because "the
      // camera did not move" is not observable here: headless runs on software
      // GL at ~2 fps, so OrbitControls' damping has a ~4 second half-life and a
      // drag that MISSES a handle falls through to the orbit and changes the
      // silhouette all by itself. Comparing rest against bent at one camera
      // removes the camera from the question entirely. The bend is restored
      // before this returns, and the caller is handed the restored count so it
      // can say so.
      stemLinesRestVsBent: () => {
        if (!rig || !art) return null;
        const u = art.units.find(x => x.mesh === stemMesh);
        if (!u) return null;
        const size = [canvas.clientWidth, canvas.clientHeight], pr = renderer.getPixelRatio();
        const saved = rig.points.map(p => p.clone());
        art.update(camera, size, pr);
        const bent = u.ex.segmentCount;
        rig.resetPose(); repose();
        art.update(camera, size, pr);
        const rest = u.ex.segmentCount;
        saved.forEach((p, i) => { if (i) rig.setPoint(i, p); });
        repose();
        art.update(camera, size, pr);
        return { bent, rest, restored: u.ex.segmentCount };
      },
      // the widget path and the model path, kept apart for the same reason the
      // pose stage keeps them apart
      setWeightWidget: (v) => { weightIn.value = String(v); weightIn.dispatchEvent(new Event('input')); },
      setDetailWidget: (v) => { detailIn.value = String(v); detailIn.dispatchEvent(new Event('input')); },
      setDotsWidget: (v) => { dotsIn.value = String(v); dotsIn.dispatchEvent(new Event('input')); },
    };

    buildInfill();
  }

  // A handle for the headless gate — no app logic reads it.
  window.__printScaffold = {
    ready: true,
    source: label,
    lastLoadError: null,
    meshes, tris,
    nodeNames: named,
    pivotExtras: pivot ? pivot.userData : null,
    markerFound: !!marker,
    markerVisible: () => !!marker && marker.visible,
    markerInTree: () => { let hit = false; currentRoot.traverse(o => { if (o === marker) hit = true; }); return hit; },
    cameraPosition: () => camera.position.toArray(),
    // Test chrome, in the same spirit as handleScreenPos() and stemBBox()
    // below: there is no in-page control that puts the camera anywhere in
    // particular — orbit and dolly belong to the hand — and a gate looking at
    // ONE part of a multi-part bundle needs it at a usable size on screen.
    // Driving OrbitControls' damping to a chosen pose headlessly is not
    // something this harness can land, so it is placed directly.
    // The named part's own GEOMETRY, in world space. Deliberately not
    // Box3.setFromObject(): the line art parents its LineSegments2 onto the
    // source mesh, and those carry a placeholder bounding volume around the
    // origin, so setFromObject reported a leaf stretching from the leaf to
    // (0,0,0) — measured, and it framed the camera on nothing.
    partBox: (name) => {
      const o = currentRoot && currentRoot.getObjectByName(name);
      if (!o || !o.isMesh) return null;
      o.updateWorldMatrix(true, false);
      o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      return { min: b.min.toArray(), max: b.max.toArray() };
    },
    setView: (pos, target) => {
      camera.position.set(pos[0], pos[1], pos[2]);
      controls.target.set(target[0], target[1], target[2]);
      controls.update();
    },

    // pose surface
    hasRig: !!rig,
    stemVertexCount: rig ? rig.pos.count : 0,
    axisCleanSlabs: rig ? rig.axisCleanSlabs : 0,
    controlS: CONTROL_S.slice(),
    handleScreenPos: (i) => {
      const v = handles[i].position.clone().project(camera);
      const r = canvas.getBoundingClientRect();
      return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - (v.y + 1) / 2) * r.height];
    },
    bendPoints: () => rig ? rig.points.map(p => p.toArray()) : [],
    isRest: () => !rig || rig.isRest(),
    restResidual: () => rig ? rig.restResidual() : 0,
    restResidualUlps: () => rig ? rig.restResidualUlps() : 0,
    axisOffsets: () => rig ? rig.axisOffsets() : [],
    stemBBox: () => {
      rig.mesh.geometry.computeBoundingBox();
      const b = rig.mesh.geometry.boundingBox;
      return [b.min.toArray(), b.max.toArray()];
    },
    stemVertex: (i) => [rig.pos.array[i*3], rig.pos.array[i*3+1], rig.pos.array[i*3+2]],
    // leaf witness: the vertex furthest from the stem axis, i.e. a leaf tip.
    // If a future change ever re-lofts the stem, this count collapses.
    leafVertexCount: () => {
      if (!rig) return 0;
      let n = 0;
      for (let i = 0; i < rig.pos.count; i++) {
        const a = rig.ba[i], b = rig.bb_[i];
        if (Math.hypot(a, b) > rig.coreRadius * 3) n++;
      }
      return n;
    },
    droop: () => droopDeg,
    twist: () => twistDeg,
    limits: () => ({ droop: [+droopIn.min, +droopIn.max], twist: [+twistIn.min, +twistIn.max] }),
    limitsFromBundle: () => !!(limits && limits.droop && limits.twist),
    // two DISTINCT paths on purpose: through the widget, and straight at the
    // model. The widget path is clamped by the browser before this code sees
    // it, so only the second one actually exercises the constraint.
    setDroop: (v) => { droopIn.value = String(v); droopIn.dispatchEvent(new Event('input')); },
    setTwist: (v) => { twistIn.value = String(v); twistIn.dispatchEvent(new Event('input')); },
    forcePose: (d, t) => setPose(d, t),
    // likewise for the root anchor: the pointer handler refuses to pick it AND
    // the rig refuses to move it. This reaches past the first to test the second.
    forceRootMove: () => {
      if (!rig) return false;
      const before = rig.points[0].clone();
      rig.setPoint(0, new THREE.Vector3(before.x + 50, before.y + 50, before.z + 50));
      const moved = !rig.points[0].equals(before);
      repose();
      return moved;
    },
    bloomQuaternion: () => pivot ? pivot.quaternion.toArray() : null,
    bloomWorldCentroid: () => {
      const bloom = currentRoot.getObjectByName('bloom');
      if (!bloom) return null;
      const b = new THREE.Box3().setFromObject(bloom);
      return b.getCenter(new THREE.Vector3()).toArray();
    },
    poseText: () => poseState.textContent,
  };
}

// Parses bytes straight into a scene graph — no fetch, no URL. GLTFLoader's
// own `.load()` wraps its internal `.parse()` call in a try/catch and routes
// anything it throws to the error callback (verified against three@0.161.0);
// `.parse()` called directly does NOT do that for us, so this wrapper does it
// instead. Measured, not assumed: feeding raw garbage bytes to `.parse()`
// throws SYNCHRONOUSLY (a JSON.parse SyntaxError) rather than reaching
// onError, for both "not glTF at all" and "empty file" — exactly the
// "throwing an unhandled error into the console" failure this session is
// required to avoid.
function parseGltfBytes(arrayBuffer, onLoad, onError) {
  try {
    new GLTFLoader().parse(arrayBuffer, '', onLoad, onError);
  } catch (e) {
    onError(e);
  }
}

async function loadBundleFromFile(file) {
  if (!file) return;
  let bytes;
  try {
    bytes = await file.arrayBuffer();
  } catch (e) {
    onBundleFailed(e, file.name);
    return;
  }
  parseGltfBytes(bytes,
    (gltf) => onBundleLoaded(gltf, file.name),
    (err) => onBundleFailed(err, file.name));
}

// --- file input ------------------------------------------------------------
bundleInput.addEventListener('change', () => {
  const file = bundleInput.files && bundleInput.files[0];
  // Clear the input so choosing the SAME filename again still fires 'change'.
  bundleInput.value = '';
  loadBundleFromFile(file);
});

// --- drag-and-drop, anywhere on the page -----------------------------------
// Gated on `dataTransfer.types` containing "Files", which browsers populate
// during dragenter/dragover before the files themselves are readable (those
// arrive only at drop) — so a drag of anything else (page text, a link) is
// left alone rather than hijacked. `dragDepth` counts nested enter/leave
// pairs, because a dragleave fires when the pointer crosses onto a CHILD
// element (the debug or pose panel) and not just when it leaves the window;
// a plain boolean would flicker the hint off mid-drag.
let dragDepth = 0;
function hasFiles(ev) {
  const types = ev.dataTransfer && ev.dataTransfer.types;
  return !!types && Array.prototype.includes.call(types, 'Files');
}
window.addEventListener('dragenter', (ev) => {
  if (!hasFiles(ev)) return;
  ev.preventDefault();
  dragDepth++;
  dropHint.hidden = false;
});
window.addEventListener('dragover', (ev) => {
  if (!hasFiles(ev)) return;
  ev.preventDefault(); // required for 'drop' to fire at all
  ev.dataTransfer.dropEffect = 'copy';
});
window.addEventListener('dragleave', (ev) => {
  if (!hasFiles(ev)) return;
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) dropHint.hidden = true;
});
window.addEventListener('drop', (ev) => {
  if (!hasFiles(ev)) return;
  ev.preventDefault();
  dragDepth = 0;
  dropHint.hidden = true;
  const files = ev.dataTransfer.files;
  if (!files || !files.length) return;
  // Only the first file is ever loaded — a dropped SECOND file would just be
  // replaced again a moment later by the debug panel's own rebuild, so the
  // "which one" note goes to the console rather than a panel line that
  // success immediately erases.
  if (files.length > 1) console.log(`[print] ${files.length} files dropped — using "${files[0].name}"`);
  loadBundleFromFile(files[0]);
});

// --- the default bundle, loaded once at startup ----------------------------
// A normal fetch-based load, so the page is never blank on first paint. It is
// a fallback, not the only source — anything above can replace it.
new GLTFLoader().load(DEFAULT_BUNDLE,
  (gltf) => onBundleLoaded(gltf, DEFAULT_BUNDLE),
  undefined,
  (err) => onBundleFailed(err, DEFAULT_BUNDLE));
