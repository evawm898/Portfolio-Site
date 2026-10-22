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
  /* ---- the lit mode (phase 5): a lamp inside the star, the room dark, a wall behind it that the cuts throw their pattern onto.
     Translucent paper is faked honestly: the paper's own material takes an EMISSIVE glow (a warm colour at a share of the lamp's
     brightness — paper lit from inside glows, it does not reflect), the cuts are holes in it, and the lamp casts shadows through
     them onto the wall, with each cut material's alpha map on its DEPTH material so the holes let light through. The tissue skins
     glow in their own colour. Nothing here decides geometry. */
  const lamp = new THREE.PointLight(0xffd9a8, 0, 0, 2); lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -0.0002; lamp.shadow.radius = 2;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 1, metalness: 0 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), wallMat); wall.receiveShadow = true;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), wallMat); floor.receiveShadow = true; floor.rotation.x = -Math.PI / 2;
  const litGroup = new THREE.Group(); litGroup.add(lamp, wall, floor); litGroup.visible = false; scene.add(litGroup);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  let lit = null;   // { warmth (K), brightness, room, wallDistance }
  const kelvin = (K) => { const t = Math.min(4000, Math.max(1800, K)) / 100; const r = 255, g = Math.min(255, Math.max(0, 99.47 * Math.log(t) - 161.12)), b = t <= 19 ? 0 : Math.min(255, Math.max(0, 138.52 * Math.log(t - 10) - 305.04)); return new THREE.Color(r / 255, g / 255, b / 255); };
  function applyLit() {
    const on = !!lit;
    litGroup.visible = on;
    hemi.intensity = on ? 0.05 + 1.4 * (1 - lit.room) : 0.9; key.intensity = on ? 0.9 * (1 - lit.room) : 1.15; fill.intensity = on ? 0.3 * (1 - lit.room) : 0.45;
    const room = on ? new THREE.Color(0x05050a).lerp(new THREE.Color(0x4a4640), 1 - lit.room) : new THREE.Color(INK);
    renderer.setClearColor(room, 1);
    scene.fog = on ? new THREE.Fog(room, radius * (lit.wallDistance + 3.2), radius * (lit.wallDistance + 10)) : null;   // from the camera's own fit distance (~3.3 R) the wall sits at ~3.3 R + d, so the fog starts just past the thrown pattern   // the planes fade into the room instead of ending at an edge
    for (const m of [paperMat, wallMat, ...cutMats.values(), ...tintMats.values()]) m.needsUpdate = true;
    const glow = on ? kelvin(lit.warmth) : null;
    /* lit: the paper is lit from INSIDE, so its daylight shading goes (colour near black, the glow is the emissive). The cuts stay
       HOLES (alphaTest 0.5 on the material — the shadow pass copies the object material's alphaTest onto the distance material,
       so a material with alphaTest 0 throws a SOLID shadow; measured, 43 of 2,115 wall samples lit against 1,583 unshadowed),
       and through them the lamp lights the wall with the pattern. Folded: every value back to phase 1's. */
    paperMat.emissive = on ? glow.clone() : new THREE.Color(0); paperMat.emissiveIntensity = on ? GLOW_PAPER * lit.brightness : 0; paperMat.color.setHex(on ? 0x2a2622 : PAPER); paperMat.needsUpdate = true;
    for (const [cv, m] of cutMats) { m.emissive = on ? glow.clone() : new THREE.Color(0); m.emissiveIntensity = on ? 1.0 * lit.brightness : 0; m.emissiveMap = on ? glowFor(cv) : null; m.color.setHex(on ? 0x2a2622 : PAPER); m.needsUpdate = true; }
    for (const m of tintMats.values()) { m.emissive = on ? m.color.clone().multiply(glow) : new THREE.Color(0); m.emissiveIntensity = on ? 1.1 * lit.brightness : 0; m.opacity = on ? 0.55 : 0.82; }
    if (on) {
      wallMat.color.setHex(0x3a3632).lerp(new THREE.Color(0x8a8278), (1 - lit.room) * 0.8);
      const d = radius * lit.wallDistance;
      // inverse-square light sized so the WALL reads at any star size: irradiance at the wall is I / d², held near a constant
      lamp.color.copy(glow); lamp.intensity = lit.noLamp ? 0 : 14 * lit.brightness * d * d;   // noLamp: test chrome's mask frame (the star glows, the wall is black)
      lamp.distance = 0;
      wall.position.set(0, 0, -d); wall.scale.set(radius * 60, radius * 60, 1);
      floor.position.set(0, -radius * 2.1, 0);   // low enough that the room's corner stays under the star even with the wall close (0.8 R) floor.scale.set(radius * 60, radius * 60, 1);
      lamp.shadow.camera.near = radius * 0.05; lamp.shadow.camera.far = radius * 60;   // as far as the planes reach: wall past the shadow camera's far plane is UNSHADOWED and lit up as a hard wedge (measured at 8 R with the wall at 1.0 R) lamp.shadow.camera.updateProjectionMatrix();
    }
    for (const m of meshes) if (m.isMesh) { m.castShadow = on && !m.material.transparent; m.receiveShadow = false; }
    dirty = true;
  }
  function setLit(opts) { lit = opts ? { warmth: 2700, brightness: 1, room: 0.85, wallDistance: 1.4, ...opts } : null; if (opts && opts.noShadow !== undefined) lamp.castShadow = !opts.noShadow; applyLit(); }
  const creaseMat = new THREE.LineBasicMaterial({ color: 0x6a6a66, transparent: true, opacity: 0.55 });
  let meshes = [];
  let frames = 0, lastUser = -Infinity, radius = 300, running = false, raf = 0;
  let extra = [];   // phase 5 adds the light and the backdrop here

  function clear() { for (const m of meshes) { group.remove(m); m.geometry.dispose(); } meshes = []; }
  /* `halves` is [{ positions: Float32Array, creases: [{from, to}] }, …] in the model's own mm, z-up. */
  const texCache = new Map();   // canvas -> THREE.CanvasTexture
  const cutMats = new Map();    // canvas -> material carrying it as an alpha map
  const glowCache = new Map();  // canvas -> CanvasTexture of the GLOW map: a hole reads white, the paper a dim grey (what a lamp inside makes of a cut sheet)
  const GLOW_PAPER = 0.42;      // the paper's share of the lamp's glow against a hole's 1 — the one 'translucency' number; doc ruling 22
  function glowFor(canvas) {
    let t = glowCache.get(canvas);
    if (t) { t.needsUpdate = true; return t; }
    const cv = document.createElement('canvas'); cv.width = canvas.width; cv.height = canvas.height;
    const ctx = cv.getContext('2d');
    ctx.drawImage(canvas, 0, 0);
    const img = ctx.getImageData(0, 0, cv.width, cv.height), d = img.data, paper = Math.round(255 * GLOW_PAPER);
    for (let i = 0; i < d.length; i += 4) { const v = d[i] > 127 ? paper : 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.flipY = false;
    glowCache.set(canvas, t);
    return t;
  }
  function matFor(canvas) {
    if (!canvas) return paperMat;
    let m = cutMats.get(canvas);
    if (m) { const t = texCache.get(canvas); t.needsUpdate = true; if (lit) { m.emissiveMap = glowFor(canvas); } return m; }
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.NoColorSpace; t.flipY = false;
    texCache.set(canvas, t);
    m = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, alphaMap: t, alphaTest: 0.5, transparent: false });
    m.userData.depth = new THREE.MeshDistanceMaterial({ alphaMap: t, alphaTest: 0.5, side: THREE.DoubleSide });   // the point light's shadow pass reads a DISTANCE material; with the alpha map on it the holes throw light
    cutMats.set(canvas, m);
    if (lit) { m.emissive = kelvin(lit.warmth); m.emissiveIntensity = 1.0 * lit.brightness; m.emissiveMap = glowFor(canvas); m.needsUpdate = true; }
    if (cutMats.size > 12) { const [k] = cutMats.keys(); cutMats.get(k).dispose(); texCache.get(k).dispose(); cutMats.delete(k); texCache.delete(k); if (glowCache.has(k)) { glowCache.get(k).dispose(); glowCache.delete(k); } }
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
          const mat = matFor(textureOf(part));
          const mesh = new THREE.Mesh(g, mat);
          if (mat.userData.depth) mesh.customDistanceMaterial = mat.userData.depth;
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
    applyLit();
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
    setModel, resize, start, stop, renderOnce, fitCamera, setLit,
    lit: () => (lit ? { ...lit, lampIntensity: lamp.intensity, wallZ: wall.position.z, shadows: meshes.filter((m) => m.isMesh && m.castShadow).length, meshes: meshes.filter((m) => m.isMesh).length, withDistance: meshes.filter((m) => m.isMesh && m.customDistanceMaterial).length, emissive: paperMat.emissiveIntensity } : null),
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
