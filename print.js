// /print — 3D viewport scaffold.
//
// Scope of this file, deliberately: load a glTF bundle, light it just enough
// to read its shape, orbit around it, and print the `pivot` node's extras so
// we can see the metadata round-trips through GLTFLoader. No posing, no hinge
// controls, no stylization — those are later stages and none of them exist yet.
//
// The lights here are THROWAWAY preview lights. The eventual renderer is
// unlit line-art; nothing about this rig carries forward.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BUNDLE = 'assets/print-test/flower-test-bundle.glb';

const canvas = document.getElementById('print-canvas');
const debugEl = document.getElementById('print-log');
const markerToggle = document.getElementById('print-marker-toggle');
const markerBox = document.getElementById('showPivotMarker');

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

  // A handle for the headless screenshot check — no app logic reads it.
  window.__printScaffold = {
    ready: true,
    meshes, tris,
    nodeNames: named,
    pivotExtras: pivot ? pivot.userData : null,
    markerFound: !!marker,
    markerVisible: () => !!marker && marker.visible,
    markerInTree: () => { let hit = false; gltf.scene.traverse(o => { if (o === marker) hit = true; }); return hit; },
    cameraPosition: () => camera.position.toArray(),
  };
}, undefined, (err) => {
  lines.length = 0;
  fail(`failed to load ${BUNDLE}`);
  fail(String(err && err.message ? err.message : err));
  console.error('[print] GLTFLoader failed', err);
  window.__printScaffold = { ready: false, error: String(err) };
});
