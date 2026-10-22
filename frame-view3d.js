/* frame-view3d.js — the relief view. Draws the STL's OWN positions and
   indices (frame-relief.js's buildRelief output; no second geometry) under
   ONE directional light at the registry's LIGHT, with auto-rotate OFF.
   Loaded on demand by frame.js the first time the Relief view is chosen, so
   the drawing view never depends on the CDN. Colour and roughness are
   presentation; nothing here is read by an export. */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LIGHT } from './frame-registry.js';

export function createViewer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0c);
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 5000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.autoRotate = false;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1e, 0.55));
  // the one fixed light: the registry's LIGHT (model x right, y up, z toward
  // the viewer — the same frame the relief is built in)
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(LIGHT[0], LIGHT[1], LIGHT[2]).multiplyScalar(1000);
  scene.add(key);
  const material = new THREE.MeshStandardMaterial({ color: 0xe6e3dc, roughness: 0.78, metalness: 0, side: THREE.FrontSide });
  let mesh = null, box = null;

  function setMesh(relief) {
    if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(relief.positions), 3));
    g.setIndex(new THREE.BufferAttribute(relief.indices.length > 65535 ? Uint32Array.from(relief.indices) : Uint16Array.from(relief.indices), 1));
    g.computeVertexNormals();
    mesh = new THREE.Mesh(g, material);
    scene.add(mesh);
    g.computeBoundingBox(); box = g.boundingBox;
  }
  /* The default camera: three-quarter from front-right, above, framed on the
     relief's own box. A caller may pin any camera (the sheet's close-ups). */
  function frame(view = null) {
    if (!box) return;
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const r = view?.radius ?? Math.max(size.x, size.y) * 0.62 / Math.tan(camera.fov * Math.PI / 360);
    const dir = new THREE.Vector3(...(view?.dir || [0.35, 0.25, 1])).normalize();
    const target = view?.target ? new THREE.Vector3(...view.target) : c;
    camera.position.copy(target).addScaledVector(dir, r);
    camera.near = r / 100; camera.far = r * 10; camera.updateProjectionMatrix();
    controls.target.copy(target); controls.update();
  }
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function render() { controls.update(); renderer.render(scene, camera); }
  /* Test chrome: the fraction of the canvas that is not the clear colour,
     read straight out of the GL framebuffer. */
  function ink() {
    const gl = renderer.getContext();
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let n = 0;
    for (let i = 0; i < px.length; i += 4) if (Math.abs(px[i] - 10) + Math.abs(px[i + 1] - 10) + Math.abs(px[i + 2] - 12) > 24) n++;
    return n / (w * h);
  }
  return { setMesh, frame, resize, render, ink, controls, camera };
}
