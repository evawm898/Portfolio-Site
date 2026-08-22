// Read-only viewer for the /dress route. Loads the COMMITTED static
// exports (dress-shell.glb + dress-analysis.json) — no editing, no
// server, no write path. Orbit + shading/grid toggles only.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const CLASS_COLORS = { p213: 0xb78ce0, p370: 0x3d9a9e, p750: 0x214c6b };
const NONE_COLOR = 0x3a4143, INVALID = 0xcc2921;

const container = document.getElementById("dressViewer");
const statusEl = document.getElementById("viewerStatus");

const analysis = await (await fetch("dress/dress-analysis.json")).json();
const cells = analysis.cells;
const rings = analysis.rings, thetas = analysis.thetas;
const dtheta = analysis.meta.grid.dtheta;
const TOL = analysis.meta.tolerance_mm;

const wrap180 = d => ((d + 180) % 360 + 360) % 360 - 180;
function cellIndexOf(theta, s) {
  const nT = thetas.length - 1;
  const iT = Math.min(Math.floor((wrap180(theta) + 180) / dtheta), nT - 1);
  if (s < rings[0] || s > rings[rings.length - 1]) return -1;
  let lo = 0, hi = rings.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (rings[m] <= s) lo = m; else hi = m; }
  return lo * nT + iT;
}

// renderer
const W = () => container.clientWidth, H = () => container.clientHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(W(), H());
renderer.setClearColor(0x0c0e0e);
container.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, W() / H(), 1, 8000);
camera.position.set(680, 950, 320);
camera.up.set(0, 0, 1);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, -130);
controls.enableDamping = true;
controls.enablePan = false;
scene.add(new THREE.HemisphereLight(0xdfe8e8, 0x2c3436, 1.15));
const dir = new THREE.DirectionalLight(0xffffff, 1.3);
dir.position.set(700, 900, 900);
scene.add(dir);
new ResizeObserver(() => {
  camera.aspect = W() / H();
  camera.updateProjectionMatrix();
  renderer.setSize(W(), H());
}).observe(container);

// load the committed glTF
const gltf = await new Promise((res, rej) =>
  new GLTFLoader().load("dress/dress-shell.glb", res, undefined, rej));
scene.add(gltf.scene);

// GLTFLoader sanitizes node names (slashes are stripped), so detect roles
// structurally: shell meshes carry the _THETA_S attribute, panel nodes carry
// their extras in userData, grid nodes keep "grid" in the sanitized name.
const shellMeshes = [], gridNodes = [], panelNodes = [];
gltf.scene.traverse(o => {
  const name = (o.name || "").toLowerCase();
  if (o.isMesh && (o.geometry.getAttribute("_theta_s") || o.geometry.getAttribute("_THETA_S")))
    shellMeshes.push(o);
  else if (name.includes("grid")) gridNodes.push(o);
  if (o.userData && o.userData.panel) panelNodes.push(o);
});

// shell shading from the sidecar, via the per-vertex _THETA_S attribute
const kAbs = cells.map(c => Math.abs(c.K)).sort((a, b) => a - b);
const kScale = kAbs[Math.floor(kAbs.length * 0.95)] || 1e-6;
for (const mesh of shellMeshes) {
  const g = mesh.geometry;
  const ts = g.getAttribute("_theta_s") || g.getAttribute("_THETA_S");
  const n = g.getAttribute("position").count;
  const base = new THREE.Color(
    mesh.name.toUpperCase().includes("FRONT") ? 0xd8dcda : 0xc9cfcc);
  const modes = { plain: new Float32Array(n * 3), class: new Float32Array(n * 3),
                  gaussian: new Float32Array(n * 3) };
  for (let i = 0; i < n; i++) {
    let cls = base, gau = base;
    if (ts) {
      const ci = cellIndexOf(ts.getX(i), ts.getY(i));
      const cell = ci >= 0 ? cells[ci] : null;
      if (cell) {
        cls = new THREE.Color(cell.max_class ? CLASS_COLORS[cell.max_class] : NONE_COLOR);
        const t = Math.max(-1, Math.min(1, cell.K / kScale));
        gau = new THREE.Color().setHSL(t < 0 ? 0.55 : 0.02,
          0.75 * Math.abs(t) + 0.05, 0.62 - 0.22 * Math.abs(t));
      }
    }
    for (const [mode, c] of [["plain", base], ["class", cls], ["gaussian", gau]]) {
      modes[mode][3 * i] = c.r; modes[mode][3 * i + 1] = c.g; modes[mode][3 * i + 2] = c.b;
    }
  }
  mesh.userData.modes = modes;
  g.setAttribute("color", new THREE.BufferAttribute(modes.class, 3));
  mesh.material = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
}

// panel tinting by class / layer / standoff (from node extras)
const maxLayer = Math.max(1, ...panelNodes.map(o => o.userData.layer || 0));
function tintPanels(mode) {
  for (const node of panelNodes) {
    const d = node.userData;
    let color = new THREE.Color(CLASS_COLORS[d.class] ?? 0x888888);
    if (!d.valid) color = new THREE.Color(INVALID);
    else if (d.facet && mode === "class") {
      color = new THREE.Color(0x8a6a2f);   // FLAT FACET — flagged distinctly
    }
    else if (mode === "layer") {
      color = new THREE.Color().setHSL(0.52, 0.5, 0.25 + 0.5 * (d.layer / maxLayer));
    } else if (mode === "standoff") {
      const so = d.standoff_mm ?? 0;
      const t = Math.min(1, so / TOL);
      color = new THREE.Color().setHSL(0.33 * (1 - t), 0.65, 0.42);
    }
    const body = node.children.length ? node.children[0] : node;
    // the first primitive is the panel body; leave active/connector alone
    const target = (node.isMesh ? node : body);
    if (target.isMesh) {
      if (Array.isArray(target.material)) target.material = target.material[0];
      target.material = target.material.clone();
      target.material.color = color;
    } else if (node.isGroup) {
      const m = node.children.find(ch => ch.isMesh);
      if (m) { m.material = m.material.clone(); m.material.color = color; }
    }
  }
}

// controls wiring
let shadeMode = "class";
const btns = document.querySelectorAll("[data-shade]");
btns.forEach(b => b.addEventListener("click", () => {
  shadeMode = b.dataset.shade;
  btns.forEach(x => x.classList.toggle("is-on", x === b));
  for (const m of shellMeshes) {
    m.geometry.setAttribute("color",
      new THREE.BufferAttribute(m.userData.modes[shadeMode], 3));
    m.geometry.attributes.color.needsUpdate = true;
  }
}));
const pbtns = document.querySelectorAll("[data-ptint]");
pbtns.forEach(b => b.addEventListener("click", () => {
  pbtns.forEach(x => x.classList.toggle("is-on", x === b));
  tintPanels(b.dataset.ptint);
}));
document.getElementById("gridToggle").addEventListener("click", (e) => {
  const on = gridNodes[0] ? !gridNodes[0].visible : false;
  gridNodes.forEach(o => o.visible = on);
  e.target.classList.toggle("is-on", on);
});

tintPanels("class");
const facetTxt = (analysis.facets || []).map(f =>
  ` · FLAT FACET '${f.panel}': shell deviation max ${f.max_deviation_mm} mm`).join("");
statusEl.textContent =
  `${analysis.panels.length} panels · ${analysis.meta.cell_count} cells · ` +
  `tolerance ${TOL} mm · asymmetry worst ${analysis.asymmetry.worst_mm} mm` + facetTxt;

(function loop() {
  requestAnimationFrame(loop);
  controls.update();
  renderer.render(scene, camera);
})();
