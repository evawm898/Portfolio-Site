/* lantern-view.js — the folded (and, from phase 5, the lit) 3D view of the
   lantern. The ONLY file here that imports three (lantern-design-doc.md §10):
   it is handed the geometry module's plain triangle data and draws it. Nothing
   geometric is decided here. */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const PAPER = 0xe9e4d6;
const INK = 0x0a0a0c;
const IDLE_RESUME_MS = 4000;   // the turntable resumes this long after the hand lets go

export function createFoldedView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(INK, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 20000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.1;
  controls.enablePan = false;
  const hemi = new THREE.HemisphereLight(0xfff4e6, 0x1a1a22, 0.9);
  const key = new THREE.DirectionalLight(0xffffff, 1.15); key.position.set(300, 500, 400);
  const fill = new THREE.DirectionalLight(0x9fb7c9, 0.45); fill.position.set(-400, -200, -300);
  scene.add(hemi, key, fill);
  const group = new THREE.Group();
  // the model is z-up (the rim plane is z = 0, the centre rises along +z); the view turns it so +z points at the camera's up
  group.rotation.x = -Math.PI / 2;
  scene.add(group);
  const paperMat = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, flatShading: false });
  const creaseMat = new THREE.LineBasicMaterial({ color: 0x6a6a66, transparent: true, opacity: 0.55 });
  let meshes = [];
  let frames = 0, lastUser = -Infinity, radius = 300, running = false, raf = 0;
  let extra = [];   // phase 5 adds the light and the backdrop here

  function clear() { for (const m of meshes) { group.remove(m); m.geometry.dispose(); } meshes = []; }
  /* `halves` is [{ positions: Float32Array, creases: [{from, to}] }, …] in the model's own mm, z-up. */
  const texCache = new Map();   // canvas -> THREE.CanvasTexture
  const cutMats = new Map();    // canvas -> material carrying it as an alpha map
  function matFor(canvas) {
    if (!canvas) return paperMat;
    let m = cutMats.get(canvas);
    if (m) { const t = texCache.get(canvas); t.needsUpdate = true; return m; }
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.NoColorSpace; t.flipY = false;
    texCache.set(canvas, t);
    m = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, alphaMap: t, alphaTest: 0.5, transparent: false });
    cutMats.set(canvas, m);
    if (cutMats.size > 12) { const [k] = cutMats.keys(); cutMats.get(k).dispose(); texCache.get(k).dispose(); cutMats.delete(k); texCache.delete(k); }
    return m;
  }
  /* `halves` is [{ positions, creases, parts? }, …]; with `textureOf(part)` returning a canvas (or null) the
     parts are drawn each with its own alpha-mapped material, so the cuts show as holes in the folded paper. */
  const tintMats = new Map();   // colour hex -> a translucent tissue material, drawn as a second skin just inside the paper
  function tintFor(hex) { let m = tintMats.get(hex); if (!m) { m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.95, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 0.82, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }); tintMats.set(hex, m); } return m; }
  function setModel(halves, { fit = true, bounds = null, textureOf = null, colourOf = null } = {}) {
    clear();
    let maxR = 1;
    for (const h of halves) {
      if (textureOf && h.parts) {
        for (const part of h.parts) {
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.BufferAttribute(part.positions, 3));
          g.setAttribute('uv', new THREE.BufferAttribute(part.uvs, 2));
          g.computeVertexNormals();
          const mesh = new THREE.Mesh(g, matFor(textureOf(part)));
          group.add(mesh); meshes.push(mesh);
          const tint = colourOf && colourOf(part);
          if (tint) { const back = new THREE.Mesh(g, tintFor(tint)); back.renderOrder = -1; group.add(back); meshes.push(back); }
        }
      } else {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(h.positions, 3));
        g.computeVertexNormals();
        const mesh = new THREE.Mesh(g, paperMat);
        group.add(mesh); meshes.push(mesh);
      }
      const p = h.positions;
      for (let i = 0; i < p.length; i += 3) maxR = Math.max(maxR, Math.hypot(p[i], p[i + 1], p[i + 2]));
      if (h.creases && h.creases.length) {
        const arr = new Float32Array(h.creases.length * 6);
        h.creases.forEach((c, i) => { arr.set([c.from[0], c.from[1], c.from[2], c.to[0], c.to[1], c.to[2]], i * 6); });
        const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
        const lines = new THREE.LineSegments(lg, creaseMat);
        group.add(lines); meshes.push(lines);
      }
    }
    radius = bounds || maxR;
    if (fit) fitCamera();
    dirty = true;
  }
  function fitCamera() {
    const d = radius / Math.sin((camera.fov * Math.PI) / 360) * 1.12;
    camera.position.set(d * 0.5, d * 0.68, d * 0.56);
    controls.target.set(0, 0, 0);
    camera.near = d / 100; camera.far = d * 10; camera.updateProjectionMatrix();
    controls.update();
  }
  let dirty = true;
  function resize() {
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 200;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    dirty = true;
  }
  function frame() {
    raf = running ? requestAnimationFrame(frame) : 0;
    if (!running) return;
    const idle = performance.now() - lastUser > IDLE_RESUME_MS;
    controls.autoRotate = idle;
    const moved = controls.update();
    if (moved || dirty || idle) { renderer.render(scene, camera); frames++; dirty = false; }
  }
  controls.addEventListener('start', () => { lastUser = performance.now(); });
  controls.addEventListener('change', () => { lastUser = performance.now(); dirty = true; });
  function start() { if (running) return; running = true; resize(); frame(); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  function renderOnce() { controls.update(); renderer.render(scene, camera); frames++; }
  return {
    setModel, resize, start, stop, renderOnce, fitCamera,
    get frames() { return frames; },
    get triangles() { return meshes.filter((m) => m.isMesh).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0); },
    camera: () => ({ position: camera.position.toArray(), target: controls.target.toArray() }),
    lookAt: (target, dir, dist) => { controls.target.set(...target); camera.position.set(target[0] + dir[0] * dist, target[1] + dir[1] * dist, target[2] + dir[2] * dist); lastUser = performance.now(); controls.update(); dirty = true; renderOnce(); },
    pixel: (x, y) => { const gl = renderer.getContext(); const px = new Uint8Array(4); const r = renderer.getPixelRatio(); gl.readPixels(Math.round(x * r), Math.round((canvas.height / r - y) * r), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return [...px]; },
    isRunning: () => running,
    materials: () => meshes.filter((m) => m.isMesh).map((m) => (m.material.alphaMap ? 'cut' : m.material.transparent ? 'tissue' : 'paper')),
    THREE, scene, group, renderer, controlsRef: controls,
  };
}
