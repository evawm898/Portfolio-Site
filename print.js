// /print — 3D viewport and posing stage.
//
// Scope of this file: load a glTF bundle, light it just enough to read its
// shape, orbit around it, report the `pivot` node's extras, and POSE the
// flower — drag bend points to bend the stem, hinge the bloom at the junction
// within the bundle's own declared limits. No stylization, no sparkles, no
// multiple instances — those are later stages and none of them exist yet.
//
// The stem deformation itself lives in print-stem.js; this file is wiring.
//
// The lights here are THROWAWAY preview lights. The eventual renderer is
// unlit line-art; nothing about this rig carries forward.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { StemRig, CONTROL_S } from './print-stem.js';

const BUNDLE = 'assets/print-test/flower-test-bundle.glb';

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

renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

// --- load the bundle -------------------------------------------------------
new GLTFLoader().load(BUNDLE, (gltf) => {
  scene.add(gltf.scene);

  // Frame the model rather than guessing a camera distance — the bundle's
  // units are whatever the exporter used, and this page should not care.
  const box = new THREE.Box3().setFromObject(gltf.scene);
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
  gltf.scene.traverse((o) => {
    named.push(o.name || '(unnamed)');
    if (!o.isMesh) return;
    meshes++;
    const g = o.geometry;
    tris += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
  });

  lines.length = 0;
  log(`<b>/print scaffold</b>  three r${THREE.REVISION}`);
  log(`bundle   ${BUNDLE}`);
  log(`nodes    ${named.length} — ${named.join(', ')}`);
  log(`meshes   ${meshes}   triangles ${tris}`);
  log(`bounds   ${vec(size.toArray())} (centre ${vec(center.toArray())})`);
  log('');

  // The point of this session: does the pivot node's `extras` survive the
  // loader? GLTFLoader puts glTF `extras` on Object3D.userData verbatim.
  // Names are sanitized by the loader (slashes stripped), so match loosely.
  // The bundle carries TWO nodes whose name contains "pivot" — the transform
  // node and the `pivot_marker` sphere that is its child. Match the marker
  // first and the transform node exactly, so this does not depend on the
  // order traverse() happens to visit them in.
  let pivot = null, marker = null;
  gltf.scene.traverse((o) => {
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
    markerBox.addEventListener('change', () => { marker.visible = markerBox.checked; });
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

  // ======================= POSE ==========================================
  // Two independent axes, deliberately kept apart: the STEM is deformed
  // geometry (print-stem.js rewrites vertices), the BLOOM is a node rotation
  // on the pivot. Nothing in the bloom's mesh is touched.

  const stemMesh = gltf.scene.getObjectByName('stem');
  let rig = null, handles = [], limits = null;

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
  let droopDeg = 0, twistDeg = 0;

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

  const pivotOffset = new THREE.Vector3();

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

  function syncHandles() { handles.forEach((h, i) => h.position.copy(rig.points[i])); }

  function repose() {
    if (rig) rig.apply();
    syncHandles();
    applyHinge();
    renderPose();
  }

  // --- dragging ----------------------------------------------------------
  // Raycast the handles; while one is held, OrbitControls is switched off so a
  // drag cannot both bend the stem and spin the camera.
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
    if (!rig) return;
    toNDC(ev);
    ray.setFromCamera(ndc, camera);
    const picks = ray.intersectObjects(handles, false)
      .filter(p => !p.object.userData.anchored);
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
    rig.setPoint(dragging.userData.bendIndex, hit.add(grabOffset));
    repose();
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

  // --- hinge sliders -----------------------------------------------------
  limits = readLimits(pivot ? pivot.userData : null);
  if (limits && limits.droop) { droopIn.min = limits.droop[0]; droopIn.max = limits.droop[1]; }
  if (limits && limits.twist) { twistIn.min = limits.twist[0]; twistIn.max = limits.twist[1]; }
  droopIn.value = String(clamp(0, +droopIn.min, +droopIn.max));
  twistIn.value = String(clamp(0, +twistIn.min, +twistIn.max));

  // setPose is the ONE owner of the hinge constraint, and it clamps against the
  // BUNDLE's limits rather than against the inputs' min/max attributes.
  // Clamping against the attributes only re-checks what the browser already
  // did to the widget — measured: writing "500" into an input with max=45
  // yields "45" before any of this code runs, so a version with no clamp at all
  // passed an out-of-range test that went through the slider. Every path into
  // the model now goes through here, and the gate drives this function
  // directly as well as through the slider.
  const RANGE = {
    droop: (limits && limits.droop) || [-Infinity, Infinity],
    twist: (limits && limits.twist) || [-Infinity, Infinity],
  };
  function setPose(d, t) {
    droopDeg = clamp(Number.isFinite(d) ? d : droopDeg, RANGE.droop[0], RANGE.droop[1]);
    twistDeg = clamp(Number.isFinite(t) ? t : twistDeg, RANGE.twist[0], RANGE.twist[1]);
    droopIn.value = String(droopDeg);
    twistIn.value = String(twistDeg);
    applyHinge();
    renderPose();
  }
  droopIn.addEventListener('input', () => setPose(parseFloat(droopIn.value), twistDeg));
  twistIn.addEventListener('input', () => setPose(droopDeg, parseFloat(twistIn.value)));

  resetBtn.addEventListener('click', () => {
    if (rig) rig.resetPose();
    setPose(0, 0);
    repose();
  });

  poseEl.hidden = !rig && !pivot;

  // --- live pose read-out ------------------------------------------------
  function renderPose() {
    droopOut.textContent = `${droopDeg.toFixed(1)}°`;
    twistOut.textContent = `${twistDeg.toFixed(1)}°`;
    const rows = [];
    if (rig) {
      rows.push('bend points        (\u0394 from rest)');
      rig.points.forEach((p, i) => {
        const d = p.clone().sub(rig.restPoints[i]);
        const tag = i === 0 ? 'root*' : (i === CONTROL_S.length - 1 ? 'tip  ' : `mid${i}`);
        rows.push(`  ${tag} s=${CONTROL_S[i].toFixed(2)}  ${vec(p.toArray())}`);
        rows.push(`        \u0394 ${vec(d.toArray())}${d.lengthSq() === 0 ? '  (rest)' : ''}`);
      });
      rows.push(`  * root is anchored`);
      rows.push(`stem              ${rig.isRest()
        ? `REST (residual ${rig.restResidualUlps().toFixed(2)} float32 ULP)`
        : 'BENT'}`);
    }
    rows.push(`droop             ${droopDeg.toFixed(1)}\u00b0  of [${droopIn.min}, ${droopIn.max}]${limits && limits.droop ? ' (from bundle)' : ' (NO LIMITS IN BUNDLE)'}`);
    rows.push(`twist             ${twistDeg.toFixed(1)}\u00b0  of [${twistIn.min}, ${twistIn.max}]${limits && limits.twist ? ' (from bundle)' : ' (NO LIMITS IN BUNDLE)'}`);
    if (pivot) rows.push(`pivot at          ${vec(pivot.position.toArray())}`);
    poseState.textContent = rows.join('\n');
  }
  renderPose();

  // A handle for the headless gate — no app logic reads it.
  window.__printScaffold = {
    ready: true,
    meshes, tris,
    nodeNames: named,
    pivotExtras: pivot ? pivot.userData : null,
    markerFound: !!marker,
    markerVisible: () => !!marker && marker.visible,
    markerInTree: () => { let hit = false; gltf.scene.traverse(o => { if (o === marker) hit = true; }); return hit; },
    cameraPosition: () => camera.position.toArray(),

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
      const bloom = gltf.scene.getObjectByName('bloom');
      if (!bloom) return null;
      const b = new THREE.Box3().setFromObject(bloom);
      return b.getCenter(new THREE.Vector3()).toArray();
    },
    poseText: () => poseState.textContent,
  };
}, undefined, (err) => {
  lines.length = 0;
  fail(`failed to load ${BUNDLE}`);
  fail(String(err && err.message ? err.message : err));
  console.error('[print] GLTFLoader failed', err);
  window.__printScaffold = { ready: false, error: String(err) };
});
