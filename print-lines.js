// print-lines.js — line-art extraction and drawing for /print.
//
// No lighting model, no shaded intermediate image. The lines ARE the render:
// they are read straight off the geometry every frame, from the current camera
// and the current pose.
//
// TWO KINDS OF LINE, ONE PASS:
//   silhouette — an edge whose two adjacent faces disagree about facing the
//                camera (plus a genuine mesh boundary whose one face faces us;
//                the bundle is split at the junction, so both halves have one).
//   crease     — an edge whose two adjacent faces meet at a dihedral angle
//                sharper than the threshold, with at least one of them facing
//                the camera.
//
// WHY THIS IS A CPU PASS AND NOT A SHADER. Measured, not assumed — the numbers
// are printed live in the read-out and reproduced by the gate. The per-frame
// work splits in two, and only one half is per-frame:
//
//   * face normals and the per-edge dihedral dot are functions of GEOMETRY
//     alone. The bloom is posed by rotating a NODE, so its normals never
//     change; the stem is the only thing that deforms, and only when a bend
//     point actually moves. So the crease test costs one float compare per
//     edge per frame — the angle is already known.
//   * facing is a function of the camera, and the camera is transformed into
//     each mesh's LOCAL space instead of the geometry being transformed into
//     the world. That makes an orbit one dot product per face.
//
// Measured on the shipped bundle (78,600 triangles / 117,900 welded edges,
// Chromium, this machine): the whole extract-and-fill pass runs in ~2.4 ms at
// rest and ~2.6 ms with the pointillism buffer also being written, against a
// 16.7 ms frame budget. A GPU edge pass would buy back ~2 ms and cost the one
// thing this stage is for: the segments would live in a texture instead of in
// an array, so the gate could not count them, the dot renderer could not
// consume them, and "which creases draw" would stop being answerable outside
// a screenshot. The fork was real; the CPU side won it on the measurement.
//
// The welding and adjacency build is O(triangles) and runs ONCE per mesh at
// load (~120 ms for both halves). It is not per-frame and is not on the
// interaction path.

import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

// Deterministic per-edge hash in [0,1). Used for the stroke/dot partition and
// for dot jitter, so nothing about the stylization flickers frame to frame:
// the same edge makes the same decision every time it is drawn.
export function hash01(i) {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

// The DETAIL slider is a threshold in degrees, and it runs BACKWARDS on
// purpose: detail 0 keeps only the sharpest creases (clean), detail 100 lets
// shallow ones in (busy). One owner for that mapping, read by the app, the
// read-out and the gate.
export const DETAIL_ANGLE_DEG = [88, 6];   // detail 0 -> 88 deg, detail 100 -> 6 deg
export function detailToAngleDeg(detail) {
  const t = Math.min(1, Math.max(0, detail / 100));
  return DETAIL_ANGLE_DEG[0] + (DETAIL_ANGLE_DEG[1] - DETAIL_ANGLE_DEG[0]) * t;
}

// --- welded topology -------------------------------------------------------
// The bundle comes from an STL split, so its triangles do not share vertices.
// Adjacency has to be recovered by position, or every edge is a boundary edge
// and there are no creases at all — which is exactly what an un-welded build
// draws: the silhouette only, and a nonsense one.
class Topology {
  constructor(geometry) {
    const pos = geometry.getAttribute('position');
    const idx = geometry.index;
    const triCount = (idx ? idx.count : pos.count) / 3;

    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    const diag = bb.min.distanceTo(bb.max) || 1;
    const eps = diag * 1e-6;                 // weld grid
    const inv = 1 / eps;

    // canonical vertex ids by quantized position
    const map = new Map();
    const canon = new Int32Array(pos.count);
    const rep = [];
    for (let i = 0; i < pos.count; i++) {
      const k = `${Math.round(pos.getX(i) * inv)},${Math.round(pos.getY(i) * inv)},${Math.round(pos.getZ(i) * inv)}`;
      let c = map.get(k);
      if (c === undefined) { c = rep.length; map.set(k, c); rep.push(i); }
      canon[i] = c;
    }
    this.rep = Int32Array.from(rep);         // canonical id -> one original vertex index
    this.vertexCount = rep.length;

    // faces, in canonical ids, and the ORIGINAL indices so positions can be
    // read live from the (possibly deformed) attribute
    this.triCount = triCount;
    this.faceCanon = new Int32Array(triCount * 3);
    this.faceOrig = new Int32Array(triCount * 3);
    for (let f = 0; f < triCount; f++) {
      for (let j = 0; j < 3; j++) {
        const o = idx ? idx.getX(f * 3 + j) : f * 3 + j;
        this.faceOrig[f * 3 + j] = o;
        this.faceCanon[f * 3 + j] = canon[o];
      }
    }

    // edge -> up to two faces. A numeric key beats a string one by ~4x here.
    const V = this.vertexCount;
    const edges = new Map();
    const eA = [], eB = [], eF0 = [], eF1 = [];
    let nonManifold = 0;
    for (let f = 0; f < triCount; f++) {
      const a = this.faceCanon[f * 3], b = this.faceCanon[f * 3 + 1], c = this.faceCanon[f * 3 + 2];
      const pairs = [[a, b], [b, c], [c, a]];
      for (const [u, v] of pairs) {
        if (u === v) continue;               // degenerate after welding
        const lo = u < v ? u : v, hi = u < v ? v : u;
        const key = lo * V + hi;
        const e = edges.get(key);
        if (e === undefined) {
          edges.set(key, eA.length);
          eA.push(lo); eB.push(hi); eF0.push(f); eF1.push(-1);
        } else if (eF1[e] === -1) {
          eF1[e] = f;
        } else {
          nonManifold++;                     // >2 faces: reported, not fixed
        }
      }
    }
    this.edgeA = Int32Array.from(eA);
    this.edgeB = Int32Array.from(eB);
    this.edgeF0 = Int32Array.from(eF0);
    this.edgeF1 = Int32Array.from(eF1);
    this.edgeCount = eA.length;
    this.boundaryCount = eF1.reduce((n, v) => n + (v === -1 ? 1 : 0), 0);
    this.nonManifold = nonManifold;
  }
}

// --- per-mesh extractor ----------------------------------------------------
export class LineExtractor {
  constructor(mesh) {
    this.mesh = mesh;
    const t0 = performance.now();
    this.topo = new Topology(mesh.geometry);
    this.buildMs = performance.now() - t0;

    const F = this.topo.triCount, E = this.topo.edgeCount;
    this.faceN = new Float32Array(F * 3);
    this.faceC = new Float32Array(F * 3);
    this.facing = new Uint8Array(F);
    this.edgeDot = new Float32Array(E);      // dot(n0, n1); 2 marks a boundary
    this.out = new Float32Array(E * 6);      // segment endpoints, local space
    this.kind = new Uint8Array(E);           // 1 = silhouette, 2 = crease
    this.edgeIndex = new Int32Array(E);      // which edge each output segment is
    this.refreshGeometry();
  }

  // Face normals, centroids and the per-edge dihedral. A function of GEOMETRY
  // only — call it when the mesh deforms, never per frame.
  refreshGeometry() {
    const t0 = performance.now();
    const P = this.mesh.geometry.getAttribute('position').array;
    const { faceOrig, triCount, edgeF0, edgeF1, edgeCount } = this.topo;
    const N = this.faceN, C = this.faceC;
    for (let f = 0; f < triCount; f++) {
      const i0 = faceOrig[f * 3] * 3, i1 = faceOrig[f * 3 + 1] * 3, i2 = faceOrig[f * 3 + 2] * 3;
      const ax = P[i0], ay = P[i0 + 1], az = P[i0 + 2];
      const bx = P[i1], by = P[i1 + 1], bz = P[i1 + 2];
      const cx = P[i2], cy = P[i2 + 1], cz = P[i2 + 2];
      const ux = bx - ax, uy = by - ay, uz = bz - az;
      const vx = cx - ax, vy = cy - ay, vz = cz - az;
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      N[f * 3] = nx; N[f * 3 + 1] = ny; N[f * 3 + 2] = nz;
      C[f * 3] = (ax + bx + cx) / 3; C[f * 3 + 1] = (ay + by + cy) / 3; C[f * 3 + 2] = (az + bz + cz) / 3;
    }
    const D = this.edgeDot;
    for (let e = 0; e < edgeCount; e++) {
      const f1 = edgeF1[e];
      if (f1 < 0) { D[e] = 2; continue; }    // boundary: never a crease
      const f0 = edgeF0[e];
      D[e] = N[f0 * 3] * N[f1 * 3] + N[f0 * 3 + 1] * N[f1 * 3 + 1] + N[f0 * 3 + 2] * N[f1 * 3 + 2];
    }
    this.geometryMs = performance.now() - t0;
  }

  // Fill this.out with the visible line set for a camera at `camLocal` (the
  // camera position expressed in THIS mesh's local space — the whole point of
  // which is that an orbit never has to touch the geometry).
  extract(camLocal, creaseCos) {
    const t0 = performance.now();
    const { triCount, edgeCount, edgeA, edgeB, edgeF0, edgeF1, rep } = this.topo;
    const N = this.faceN, C = this.faceC, facing = this.facing, D = this.edgeDot;
    const cx = camLocal.x, cy = camLocal.y, cz = camLocal.z;
    for (let f = 0; f < triCount; f++) {
      const k = f * 3;
      facing[f] = (N[k] * (cx - C[k]) + N[k + 1] * (cy - C[k + 1]) + N[k + 2] * (cz - C[k + 2])) > 0 ? 1 : 0;
    }
    const P = this.mesh.geometry.getAttribute('position').array;
    const O = this.out, K = this.kind, EI = this.edgeIndex;
    let n = 0, sil = 0, cre = 0;
    for (let e = 0; e < edgeCount; e++) {
      const f1 = edgeF1[e], f0 = edgeF0[e];
      const a = facing[f0];
      let kind = 0;
      if (f1 < 0) {
        if (a) kind = 1;                                   // open boundary we can see
      } else if (a !== facing[f1]) {
        kind = 1;                                          // silhouette
      } else if (a && D[e] < creaseCos) {
        kind = 2;                                          // front-facing crease
      }
      if (!kind) continue;
      const ia = rep[edgeA[e]] * 3, ib = rep[edgeB[e]] * 3;
      const o = n * 6;
      O[o] = P[ia]; O[o + 1] = P[ia + 1]; O[o + 2] = P[ia + 2];
      O[o + 3] = P[ib]; O[o + 4] = P[ib + 1]; O[o + 5] = P[ib + 2];
      K[n] = kind; EI[n] = e;
      if (kind === 1) sil++; else cre++;
      n++;
    }
    this.segmentCount = n;
    this.silhouetteCount = sil;
    this.creaseCount = cre;
    this.extractMs = performance.now() - t0;
    return n;
  }
}

// --- drawing ---------------------------------------------------------------
// ONE extraction, TWO consumers. The pointillism slider does not run a second
// algorithm over the model: it partitions the SAME segment list, per edge, by
// that edge's own hash. At blend b an edge is drawn as dots when its hash is
// below b and as a stroke otherwise, so the transition is a real replacement
// rather than two pictures cross-faded on top of each other, and it is stable
// under orbit because the hash is on the edge, not on the frame.

const MAX_DOTS = 90000;

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2);
  g.fillStyle = '#fff'; g.fill();
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

export class LineArt {
  // `meshes` are the source meshes; each gets its own extractor and its own
  // draw objects, PARENTED TO THE MESH, so everything stays in that mesh's
  // local space and the bloom's hinge rotation is carried by the scene graph
  // instead of by re-transforming 78,600 triangles.
  constructor(meshes, opts = {}) {
    this.ink = new THREE.Color(opts.ink !== undefined ? opts.ink : 0x14181a);
    this.paper = new THREE.Color(opts.paper !== undefined ? opts.paper : 0xf2f0ea);
    this.weight = 1.6;
    this.detail = 45;
    this.blend = 0;
    this.enabled = false;
    this._dotTex = dotTexture();
    this.units = [];

    for (const mesh of meshes) {
      const ex = new LineExtractor(mesh);
      const cap = ex.topo.edgeCount;

      // One instanced buffer at full capacity, allocated once. setPositions()
      // would allocate a new one and recompute a bounding box every frame.
      const geo = new LineSegmentsGeometry();
      const buf = new THREE.InstancedInterleavedBuffer(new Float32Array(cap * 6), 6, 1);
      geo.setAttribute('instanceStart', new THREE.InterleavedBufferAttribute(buf, 3, 0));
      geo.setAttribute('instanceEnd', new THREE.InterleavedBufferAttribute(buf, 3, 3));
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
      const mat = new LineMaterial({ color: this.ink.getHex(), linewidth: this.weight, transparent: true });
      const lines = new LineSegments2(geo, mat);
      lines.frustumCulled = false;
      lines.renderOrder = 5;
      lines.name = `lineart_strokes_${mesh.name || 'mesh'}`;
      mesh.add(lines);

      const dotGeo = new THREE.BufferGeometry();
      const dotBuf = new THREE.BufferAttribute(new Float32Array(MAX_DOTS * 3), 3);
      dotBuf.setUsage(THREE.DynamicDrawUsage);
      dotGeo.setAttribute('position', dotBuf);
      dotGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
      const dotMat = new THREE.PointsMaterial({
        color: this.ink.getHex(), size: 3, sizeAttenuation: false,
        map: this._dotTex, transparent: true, alphaTest: 0.4, depthWrite: false,
      });
      const dots = new THREE.Points(dotGeo, dotMat);
      dots.frustumCulled = false;
      dots.renderOrder = 6;
      dots.name = `lineart_dots_${mesh.name || 'mesh'}`;
      mesh.add(dots);

      // The occluding fill. Flat paper, no lighting model at all — its only
      // job is to write depth so a line on the far side of the flower is
      // hidden by the near side. polygonOffset pushes it back so the lines,
      // which sit exactly ON it, are not z-fought away.
      const fill = new THREE.MeshBasicMaterial({
        color: this.paper.getHex(), polygonOffset: true,
        polygonOffsetFactor: 1.2, polygonOffsetUnits: 1.2,
      });

      this.units.push({ mesh, ex, lines, mat, buf, dots, dotMat, dotGeo, dotBuf, fill,
        original: mesh.material, dotCount: 0 });
    }
    this.setEnabled(false);
  }

  setEnabled(on) {
    this.enabled = !!on;
    for (const u of this.units) {
      u.mesh.material = on ? u.fill : u.original;
      u.lines.visible = on;
      u.dots.visible = on;
    }
  }

  setOptions({ weight, detail, blend }) {
    if (weight !== undefined) this.weight = weight;
    if (detail !== undefined) this.detail = detail;
    if (blend !== undefined) this.blend = blend;
  }

  get creaseAngleDeg() { return detailToAngleDeg(this.detail); }

  // Call after a mesh DEFORMS. Pass the mesh so a bend-point drag re-reads the
  // stem's 26,200 triangles and not the bloom's 52,400, which did not move —
  // the bloom is posed by rotating a node, and a rotation cannot change a
  // dihedral angle or a face normal expressed in the bloom's own local space.
  refreshGeometry(mesh) {
    let ms = 0;
    for (const u of this.units) {
      if (mesh && u.mesh !== mesh) continue;
      u.ex.refreshGeometry(); ms += u.ex.geometryMs;
    }
    this.geometryMs = ms;
  }

  // One frame. `sizePx` is the canvas size in CSS pixels; `pixelRatio` scales
  // the point size, which the GL layer specifies in DEVICE pixels while the
  // line material specifies its width in the same units as `resolution`.
  update(camera, sizePx, pixelRatio = 1) {
    if (!this.enabled) return null;
    const t0 = performance.now();
    const creaseCos = Math.cos(THREE.MathUtils.degToRad(this.creaseAngleDeg));
    const b = Math.min(1, Math.max(0, this.blend / 100));

    const camWorld = camera.getWorldPosition(new THREE.Vector3());
    const inv = new THREE.Matrix4();
    const camLocal = new THREE.Vector3();

    // Screen-space dot spacing, converted to world units at the model's own
    // distance, so the scatter reads the same density at any zoom.
    let segments = 0, sil = 0, cre = 0, dots = 0, extractMs = 0;
    const spacingPx = Math.max(2.2, this.weight * 2.0);
    const centre = new THREE.Vector3();

    for (const u of this.units) {
      u.mesh.updateWorldMatrix(true, false);
      inv.copy(u.mesh.matrixWorld).invert();
      camLocal.copy(camWorld).applyMatrix4(inv);

      const n = u.ex.extract(camLocal, creaseCos);
      extractMs += u.ex.extractMs;
      sil += u.ex.silhouetteCount; cre += u.ex.creaseCount;

      const src = u.ex.out, EI = u.ex.edgeIndex;
      const dst = u.buf.array, dotArr = u.dotBuf.array;

      // world units per screen pixel, at the mesh's own centre
      u.mesh.getWorldPosition(centre);
      const dist = Math.max(camWorld.distanceTo(centre), 1e-3);
      const wpp = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.max(sizePx[1], 1);
      const spacing = Math.max(spacingPx * wpp, 1e-4);
      // lateral scatter direction: perpendicular to the segment ON SCREEN,
      // so the dots spray off the line rather than sliding along it
      const view = camLocal.clone().normalize();

      let sn = 0, dn = 0;
      for (let i = 0; i < n; i++) {
        const o = i * 6;
        if (hash01(EI[i]) >= b) {
          const q = sn * 6;
          dst[q] = src[o]; dst[q + 1] = src[o + 1]; dst[q + 2] = src[o + 2];
          dst[q + 3] = src[o + 3]; dst[q + 4] = src[o + 4]; dst[q + 5] = src[o + 5];
          sn++;
          continue;
        }
        // dotted: sample along the SAME segment
        const ax = src[o], ay = src[o + 1], az = src[o + 2];
        const dx = src[o + 3] - ax, dy = src[o + 4] - ay, dz = src[o + 5] - az;
        const len = Math.hypot(dx, dy, dz);
        const steps = Math.max(1, Math.min(24, Math.round(len / spacing)));
        // screen-lateral axis for this segment
        let lx = dy * view.z - dz * view.y, ly = dz * view.x - dx * view.z, lz = dx * view.y - dy * view.x;
        const ll = Math.hypot(lx, ly, lz) || 1;
        lx /= ll; ly /= ll; lz /= ll;
        for (let k = 0; k < steps && dn < MAX_DOTS; k++) {
          const h = hash01(EI[i] * 31 + k);
          const t = (k + 0.15 + 0.7 * h) / steps;
          const j = (hash01(EI[i] * 17 + k * 7) - 0.5) * spacing * 0.9;
          const p = dn * 3;
          dotArr[p] = ax + dx * t + lx * j;
          dotArr[p + 1] = ay + dy * t + ly * j;
          dotArr[p + 2] = az + dz * t + lz * j;
          dn++;
        }
      }

      u.buf.needsUpdate = true;
      u.lines.geometry.instanceCount = sn;
      u.dotBuf.needsUpdate = true;
      u.dotGeo.setDrawRange(0, dn);
      u.dotCount = dn;

      u.mat.linewidth = this.weight;
      u.mat.resolution.set(sizePx[0], sizePx[1]);
      u.dotMat.size = Math.max(1, this.weight * 1.7 * pixelRatio);
      segments += n; dots += dn;
    }

    this.stats = {
      segments, silhouette: sil, crease: cre, dots,
      strokes: this.units.reduce((a, u) => a + u.lines.geometry.instanceCount, 0),
      extractMs, frameMs: performance.now() - t0,
      creaseAngleDeg: this.creaseAngleDeg,
    };
    return this.stats;
  }
}
