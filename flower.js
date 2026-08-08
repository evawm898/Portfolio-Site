/* ===================================================================
   flower.js
   Parametric 3D flower-bloom — THREE.JS RENDER LAYER

   Responsibilities (the abstract geometry lives in flower-geometry.js):
     - turn lattice struts + nodes into real tube / bead mesh geometry
     - arrange petals on a phyllotactic (golden-angle) spiral + central core
     - set up the scene, lighting, orbit controls, and render loop
     - wire the parametric sliders so any change regenerates live

   The build pipeline for one petal:
     spine + silhouette  ->  clipped-Voronoi lattice (flattened space)
       ->  map each strut onto the cupped 3D petal surface
       ->  extrude a tube along it, drop a bead at every node
       ->  place it on the spiral (angle, radius, receptacle height + lean)

   v1 scope: bloom only. No stem, no leaves, no export.
   =================================================================== */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  lerp, clamp, mulberry32,
  buildSpine, buildSilhouette, buildLattice,
  mapEdgeToSurface, mapPointToSurface, placePoint,
} from './flower-geometry.js';

const DEG = Math.PI / 180;

/* Fixed bloom constants (not exposed as sliders in v1, but grouped here so
   they are trivial to promote to controls in a later pass). */
const PETAL_LENGTH   = 2.2;    // world units, base -> tip along the spine
const BASE_RADIUS    = 0;      // spiral petals: spine starts on the axis; the
                               // base is then placed at its own spiral radius
const CUP_AMOUNT     = 0.22;   // transverse cupping (edges curl inward)
const SPINE_CURL     = 0.30;   // progressive outward bend toward the tip (rad)
const RADIAL_SEGMENTS = 6;     // tube cross-section resolution
const SEED_BASE      = 20250808;

/* Phyllotactic-spiral arrangement (replaces the old outer-ring + inner-whorl
   layout). Petal i sits at angle i*GOLDEN_ANGLE and radius spread*sqrt(i)
   (Vogel's model — the sunflower packing). */
const GOLDEN_ANGLE   = Math.PI * (3 - Math.sqrt(5));  // ~137.5°, the divergence angle
const SPREAD_LOOSE   = 0.52;   // radial spacing at min coil tightness (open, gappy spiral)
const SPREAD_TIGHT   = 0.13;   // radial spacing at max coil tightness (dense, packed spiral)
const ELEV_FACTOR    = 0.85;   // centre rise/sink at full elevation, as a fraction of the
                               // bloom radius — keeps the cone/bowl aspect natural at any tightness
const RECEPTACLE_TILT = 0.55;  // how strongly petals lean along the cone/bowl slope (0..1)
const CORE_SPREAD    = 0.14;   // stamen-cluster radius at the bloom's heart


/* ===================================================================
   1. GEOMETRY ACCUMULATOR
   Appends tubes and beads directly into flat position/normal/index arrays,
   so an entire material group becomes a single BufferGeometry with no
   thousands of throwaway objects. Keeps live slider rebuilds cheap.
   =================================================================== */

class MeshAccumulator {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.idx = [];
    this.vcount = 0;
    this.min = [Infinity, Infinity, Infinity];
    this.max = [-Infinity, -Infinity, -Infinity];
  }

  _vertex(x, y, z, nx, ny, nz) {
    this.pos.push(x, y, z);
    this.nor.push(nx, ny, nz);
    if (x < this.min[0]) this.min[0] = x; if (x > this.max[0]) this.max[0] = x;
    if (y < this.min[1]) this.min[1] = y; if (y > this.max[1]) this.max[1] = y;
    if (z < this.min[2]) this.min[2] = z; if (z > this.max[2]) this.max[2] = z;
    return this.vcount++;
  }

  /* Extrude a round tube of the given radius along a 3D polyline, using a
     rotation-minimizing frame so the cross-section doesn't twist between
     segments. Points are plain {x,y,z}. */
  addTube(points, radius, radialSegments = RADIAL_SEGMENTS) {
    const n = points.length;
    if (n < 2) return;

    // ---- per-point tangents ----
    const T = new Array(n);
    for (let i = 0; i < n; i++) {
      let ax, ay, az;
      if (i === 0)            { ax = points[1].x - points[0].x;         ay = points[1].y - points[0].y;         az = points[1].z - points[0].z; }
      else if (i === n - 1)   { ax = points[i].x - points[i - 1].x;     ay = points[i].y - points[i - 1].y;     az = points[i].z - points[i - 1].z; }
      else                    { ax = points[i + 1].x - points[i - 1].x; ay = points[i + 1].y - points[i - 1].y; az = points[i + 1].z - points[i - 1].z; }
      let len = Math.hypot(ax, ay, az);
      if (len < 1e-9) { ax = 0; ay = 1; az = 0; len = 1; }
      T[i] = [ax / len, ay / len, az / len];
    }

    // ---- rotation-minimizing normals (incremental) ----
    const N = new Array(n);
    N[0] = perpendicular(T[0]);
    for (let i = 1; i < n; i++) {
      const t0 = T[i - 1], t1 = T[i];
      const cx = t0[1] * t1[2] - t0[2] * t1[1];
      const cy = t0[2] * t1[0] - t0[0] * t1[2];
      const cz = t0[0] * t1[1] - t0[1] * t1[0];
      const s = Math.hypot(cx, cy, cz);
      const prev = N[i - 1];
      if (s < 1e-6) {
        N[i] = prev.slice();
      } else {
        const axis = [cx / s, cy / s, cz / s];
        const angle = Math.atan2(s, t0[0] * t1[0] + t0[1] * t1[1] + t0[2] * t1[2]);
        let r = rodrigues(prev, axis, angle);
        // re-orthogonalize against the new tangent, then renormalize
        const d = r[0] * t1[0] + r[1] * t1[1] + r[2] * t1[2];
        r = [r[0] - t1[0] * d, r[1] - t1[1] * d, r[2] - t1[2] * d];
        const rl = Math.hypot(r[0], r[1], r[2]) || 1;
        N[i] = [r[0] / rl, r[1] / rl, r[2] / rl];
      }
    }

    // ---- emit ring vertices, remember each ring's start index ----
    const ringStart = new Array(n);
    for (let i = 0; i < n; i++) {
      const t = T[i], nrm = N[i];
      const bx = t[1] * nrm[2] - t[2] * nrm[1];
      const by = t[2] * nrm[0] - t[0] * nrm[2];
      const bz = t[0] * nrm[1] - t[1] * nrm[0];
      const P = points[i];
      ringStart[i] = this.vcount;
      for (let j = 0; j < radialSegments; j++) {
        const th = (j / radialSegments) * Math.PI * 2;
        const c = Math.cos(th), sn = Math.sin(th);
        const ox = nrm[0] * c + bx * sn;
        const oy = nrm[1] * c + by * sn;
        const oz = nrm[2] * c + bz * sn;
        this._vertex(P.x + ox * radius, P.y + oy * radius, P.z + oz * radius, ox, oy, oz);
      }
    }

    // ---- stitch quads between consecutive rings ----
    for (let i = 0; i < n - 1; i++) {
      const a0 = ringStart[i], b0 = ringStart[i + 1];
      for (let j = 0; j < radialSegments; j++) {
        const jn = (j + 1) % radialSegments;
        const a = a0 + j, b = a0 + jn, c = b0 + j, d = b0 + jn;
        this.idx.push(a, b, c, b, d, c);
      }
    }
  }

  /* A small welded bead (low-res UV sphere) that caps tube ends and reads
     as a lattice node. */
  addBead(center, radius, rings = 4, sectors = 6) {
    const start = this.vcount;
    for (let ri = 0; ri <= rings; ri++) {
      const phi = (Math.PI * ri) / rings;
      const cy = Math.cos(phi), sr = Math.sin(phi);
      for (let si = 0; si <= sectors; si++) {
        const th = (2 * Math.PI * si) / sectors;
        const nx = sr * Math.cos(th), ny = cy, nz = sr * Math.sin(th);
        this._vertex(center.x + nx * radius, center.y + ny * radius, center.z + nz * radius, nx, ny, nz);
      }
    }
    const stride = sectors + 1;
    for (let ri = 0; ri < rings; ri++) {
      for (let si = 0; si < sectors; si++) {
        const a = start + ri * stride + si;
        const b = a + 1, c = a + stride, d = c + 1;
        this.idx.push(a, b, c, b, d, c);
      }
    }
  }

  toGeometry() {
    if (this.vcount === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setIndex(new THREE.Uint32BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    return g;
  }
}

// smallest-component axis gives a stable perpendicular to t
function perpendicular(t) {
  const a = Math.abs(t[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const cx = t[1] * a[2] - t[2] * a[1];
  const cy = t[2] * a[0] - t[0] * a[2];
  const cz = t[0] * a[1] - t[1] * a[0];
  const l = Math.hypot(cx, cy, cz) || 1;
  return [cx / l, cy / l, cz / l];
}

// rotate vector v around unit axis k by angle (Rodrigues)
function rodrigues(v, k, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const dot = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
  const crx = k[1] * v[2] - k[2] * v[1];
  const cry = k[2] * v[0] - k[0] * v[2];
  const crz = k[0] * v[1] - k[1] * v[0];
  return [
    v[0] * c + crx * s + k[0] * dot * (1 - c),
    v[1] * c + cry * s + k[1] * dot * (1 - c),
    v[2] * c + crz * s + k[2] * dot * (1 - c),
  ];
}


/* ===================================================================
   2. PARAMETERS
   Raw UI values -> a resolved petal-parameter object (P) consumed by the
   geometry module. One place maps sliders to internal ranges.
   =================================================================== */

function resolveParams(ui) {
  return {
    W: ui.width,
    taper: ui.taper,
    tip: ui.tip,
    bloom: ui.bloom * DEG,
    curl: SPINE_CURL,
    L: PETAL_LENGTH,
    r0: BASE_RADIUS,
    cup: CUP_AMOUNT,
    targetSeeds: clamp(Math.round(ui.density * ui.density * 0.8), 4, 150),
    tubeRadius: lerp(0.008, 0.030, ui.tube),
  };
}

/* ===================================================================
   3. PETAL + BLOOM ASSEMBLY
   =================================================================== */

/* Build one petal's lattice directly into an accumulator, placed on the
   phyllotactic spiral: rotated to `az`, leaned by `tilt`, based at
   `radialOffset` out from the axis, and lifted by `baseHeight`. */
function buildPetalInto(acc, P, az, baseHeight, radialOffset, tilt, rng) {
  const spine = buildSpine(P);
  const outline = buildSilhouette(P);
  const lattice = buildLattice(outline, P.targetSeeds, rng);

  // struts
  for (const edge of lattice.edges) {
    const local = mapEdgeToSurface(edge, P, spine);
    const world = local.map((p) => placePoint(p, az, baseHeight, radialOffset, tilt));
    acc.addTube(world, P.tubeRadius);
  }
  // welded beads at every node (cover tube ends, read as lattice nodules)
  for (const node of lattice.nodes) {
    const local = mapPointToSurface(node, P, spine);
    const world = placePoint(local, az, baseHeight, radialOffset, tilt);
    const r = P.tubeRadius * (node.degree >= 3 ? 1.4 : 1.15);
    acc.addBead(world, r);
  }
}

/* A small central stamen cluster so the spiral's heart reads as an organic
   flower centre. `centerHeight` follows the receptacle so it stays seated in
   an elevated (cone) or depressed (bowl) middle. */
function buildCoreInto(acc, P, count, centerHeight, rng) {
  const N = Math.min(36, 12 + Math.round(count * 0.6));
  const H = 0.34;
  for (let i = 0; i < N; i++) {
    const a = rng() * Math.PI * 2;
    const rr = CORE_SPREAD * Math.sqrt(rng());
    const h = H * (0.6 + 0.4 * rng());
    const lean = 0.14 * (0.5 + rng());
    const steps = 5;
    const pts = [];
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const rad = rr + lean * t;
      const yy = h * Math.sin((t * Math.PI) / 2);
      pts.push({ x: rad * Math.cos(a), y: centerHeight + yy, z: rad * Math.sin(a) });
    }
    acc.addTube(pts, P.tubeRadius * 1.05);
    acc.addBead(pts[pts.length - 1], P.tubeRadius * 2.1);  // anther
  }
}


/* ===================================================================
   4. SCENE
   =================================================================== */

const canvas = document.getElementById('flower-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setClearColor(0x060707, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060707, 0.016);

const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 100);
camera.position.set(3, 2.4, 6);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.rotateSpeed = 0.9;
controls.zoomSpeed = 0.9;
controls.minDistance = 1.5;
controls.maxDistance = 30;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.7;

// lighting — dark Deep-Winter ground with petrol key/rim so the lace pops
scene.add(new THREE.HemisphereLight(0x2fa3a3, 0x050707, 0.55));
const keyLight = new THREE.DirectionalLight(0xeafffb, 1.0);
keyLight.position.set(4, 7, 5);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x1c6b6b, 0.75);
rimLight.position.set(-5, 3, -5);
scene.add(rimLight);
const coreGlow = new THREE.PointLight(0x2fa3a3, 0.6, 50);
coreGlow.position.set(0, 0.6, 0);
scene.add(coreGlow);

// materials — all spiral petals share one material; the core glows brighter
const matPetals = new THREE.MeshStandardMaterial({ color: 0x4fb0ab, roughness: 0.5, metalness: 0.15, emissive: 0x08211f, emissiveIntensity: 0.35 });
const matCore   = new THREE.MeshStandardMaterial({ color: 0x2fa3a3, roughness: 0.45, metalness: 0.2, emissive: 0x0c3a38, emissiveIntensity: 0.55 });

const bloomGroup = new THREE.Group();
scene.add(bloomGroup);
const meshPetals = new THREE.Mesh(new THREE.BufferGeometry(), matPetals);
const meshCore   = new THREE.Mesh(new THREE.BufferGeometry(), matCore);
bloomGroup.add(meshPetals, meshCore);

function swapGeometry(mesh, acc) {
  mesh.geometry.dispose();
  mesh.geometry = acc.toGeometry() || new THREE.BufferGeometry();
}


/* ===================================================================
   5. GENERATE (called on every parameter change)
   =================================================================== */

let hasFramed = false;

function generate() {
  const ui = readUI();
  const P = resolveParams(ui);

  const petalAcc = new MeshAccumulator();
  const coreAcc  = new MeshAccumulator();

  const count = ui.petalCount;
  const spread = lerp(SPREAD_LOOSE, SPREAD_TIGHT, ui.tightness);  // tighter coil -> smaller spacing
  const rMax = spread * Math.sqrt(Math.max(1, count - 1));
  const elev = ui.elevation;                                     // -1 (bowl) .. +1 (cone)
  const elevAmp = ELEV_FACTOR * rMax;                            // scale elevation with bloom size

  for (let i = 0; i < count; i++) {
    const az = i * GOLDEN_ANGLE;
    const r = spread * Math.sqrt(i);
    const rho = rMax > 1e-6 ? clamp(r / rMax, 0, 1) : 0;
    // raised-cosine receptacle profile: 1 at the centre, 0 at the rim
    const profile = 0.5 * (1 + Math.cos(Math.PI * rho));
    const height = elev * elevAmp * profile;
    // lean each petal along the receptacle slope (dy/dr of the height field) so
    // a raised centre reads as a cone and a sunken centre as a bowl. The bloom
    // radius cancels here, so the lean stays bounded at any coil tightness.
    const slope = -elev * ELEV_FACTOR * (Math.PI / 2) * Math.sin(Math.PI * rho);
    const tilt = RECEPTACLE_TILT * Math.atan(slope);
    buildPetalInto(petalAcc, P, az, height, r - P.r0, tilt, mulberry32(SEED_BASE + i * 131));
  }

  const centerHeight = elev * elevAmp;                           // core sits at the receptacle centre
  coreGlow.position.y = centerHeight + 0.2;
  buildCoreInto(coreAcc, P, count, centerHeight, mulberry32(SEED_BASE + 7));

  swapGeometry(meshPetals, petalAcc);
  swapGeometry(meshCore, coreAcc);

  frameCameraOnce(petalAcc, coreAcc);
  updateReadout(petalAcc, ui);
}

function frameCameraOnce(...accs) {
  if (hasFramed) return;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const a of accs) {
    if (a.vcount === 0) continue;
    for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], a.min[k]); max[k] = Math.max(max[k], a.max[k]); }
  }
  if (!isFinite(min[0])) return;
  hasFramed = true;
  const cx = (min[0] + max[0]) / 2, cy = (min[1] + max[1]) / 2, cz = (min[2] + max[2]) / 2;
  const radius = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) * 0.5 || 2;
  const dist = (radius / Math.tan((camera.fov * DEG) / 2)) * 1.6;
  controls.target.set(cx, cy, cz);
  camera.position.set(cx + dist * 0.45, cy + dist * 0.3, cz + dist * 0.85);
  camera.near = Math.max(0.05, dist * 0.02);
  camera.far = dist * 20;
  camera.updateProjectionMatrix();
  controls.update();
}


/* ===================================================================
   6. RENDER LOOP + RESIZE
   =================================================================== */

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  // Compare against the actual drawing-buffer size (CSS px x pixelRatio).
  // Comparing canvas.width (buffer px) to clientWidth (CSS px) would be true
  // every frame on HiDPI displays and re-run setSize needlessly each frame.
  const pr = renderer.getPixelRatio();
  if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (document.hidden) return;
  resize();
  controls.update();
  renderer.render(scene, camera);
}


/* ===================================================================
   7. UI WIRING
   =================================================================== */

const inputs = {
  petalCount: document.getElementById('petalCount'),
  width: document.getElementById('width'),
  taper: document.getElementById('taper'),
  tip: document.getElementById('tip'),
  bloom: document.getElementById('bloom'),
  tube: document.getElementById('tube'),
  density: document.getElementById('density'),
  tightness: document.getElementById('tightness'),
  elevation: document.getElementById('elevation'),
  autoRotate: document.getElementById('autoRotate'),
};

function readUI() {
  return {
    petalCount: parseInt(inputs.petalCount.value, 10),
    width: parseFloat(inputs.width.value),
    taper: parseFloat(inputs.taper.value),
    tip: parseFloat(inputs.tip.value),
    bloom: parseFloat(inputs.bloom.value),
    tube: parseFloat(inputs.tube.value),
    density: parseInt(inputs.density.value, 10),
    tightness: parseFloat(inputs.tightness.value),
    elevation: parseFloat(inputs.elevation.value),
    autoRotate: inputs.autoRotate.checked,
  };
}

// live numeric read-outs next to each slider
function refreshLabels() {
  setLabel('petalCount', inputs.petalCount.value);
  setLabel('width', (+inputs.width.value).toFixed(2));
  setLabel('taper', (+inputs.taper.value).toFixed(2));
  setLabel('tip', (+inputs.tip.value).toFixed(2));
  setLabel('bloom', inputs.bloom.value + '°');
  setLabel('tube', (+inputs.tube.value).toFixed(2));
  setLabel('density', inputs.density.value);
  setLabel('tightness', (+inputs.tightness.value).toFixed(2));
  const e = +inputs.elevation.value;
  setLabel('elevation', (e > 0 ? '+' : '') + e.toFixed(2));
}
function setLabel(id, text) {
  const el = document.querySelector(`[data-value="${id}"]`);
  if (el) el.textContent = text;
}

function updateReadout(petalAcc, ui) {
  const coreIdx = meshCore.geometry.index ? meshCore.geometry.index.count : 0;
  const tris = Math.round((petalAcc.idx.length + coreIdx) / 3);
  const el = document.getElementById('readout');
  if (!el) return;
  const petals = `${ui.petalCount} petal${ui.petalCount === 1 ? '' : 's'}`;
  el.textContent = `${petals} · spiral · ~${tris.toLocaleString()} tris`;
}

// coalesce rapid slider input into one rebuild per frame
let pending = false;
function scheduleRegen() {
  if (pending) return;
  pending = true;
  setBuilding(true);
  // Double rAF: let the "building…" state paint for one frame before the
  // synchronous rebuild blocks the main thread and then clears it.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      pending = false;
      generate();
      setBuilding(false);
    });
  });
}
function setBuilding(on) {
  const el = document.getElementById('building');
  if (el) el.classList.toggle('is-on', on);
}

// bind: geometry sliders regenerate; toggles that don't affect geometry don't
['petalCount', 'width', 'taper', 'tip', 'bloom', 'tube', 'density', 'tightness', 'elevation'].forEach((k) => {
  inputs[k].addEventListener('input', () => { refreshLabels(); scheduleRegen(); });
});
inputs.autoRotate.addEventListener('change', () => { controls.autoRotate = inputs.autoRotate.checked; });

const resetBtn = document.getElementById('reset');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    const d = DEFAULTS;
    inputs.petalCount.value = d.petalCount;
    inputs.width.value = d.width;
    inputs.taper.value = d.taper;
    inputs.tip.value = d.tip;
    inputs.bloom.value = d.bloom;
    inputs.tube.value = d.tube;
    inputs.density.value = d.density;
    inputs.tightness.value = d.tightness;
    inputs.elevation.value = d.elevation;
    inputs.autoRotate.checked = d.autoRotate;
    controls.autoRotate = d.autoRotate;
    refreshLabels();
    scheduleRegen();
  });
}

const DEFAULTS = {
  petalCount: 21, width: 0.9, taper: 0.35, tip: 0.5,
  bloom: 55, tube: 0.4, density: 7, tightness: 0.5, elevation: 0, autoRotate: true,
};


/* ===================================================================
   8. BOOT
   =================================================================== */

controls.autoRotate = inputs.autoRotate.checked;
refreshLabels();
generate();
animate();
