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

    // The selected edge set, kept as a GRAPH rather than as loose segments:
    // chaining needs to know which edges share a welded vertex, and the
    // topology already knows. `selA`/`selB` are canonical vertex ids.
    this.selA = new Int32Array(E);
    this.selB = new Int32Array(E);
    this.selKind = new Uint8Array(E);        // 1 = silhouette, 2 = crease

    // Chain scratch. `head`/`nxt`/`adj` are a per-vertex linked list of
    // incident selected edges; they are reset per build over the edges of the
    // kind being chained, never over the whole vertex array, so an orbit does
    // not pay for 39,110 vertices it did not select.
    const V = this.topo.vertexCount;
    this._deg = new Int32Array(V);
    this._head = new Int32Array(V).fill(-1);
    this._nxt = new Int32Array(E * 2);
    this._adj = new Int32Array(E * 2);
    this._visited = new Uint8Array(E);
    this.chainV = new Int32Array(E * 2 + 4);  // k edges make k+1 vertices
    this.chainStart = new Int32Array(E + 2);
    this.chainLen = new Int32Array(E + 2);
    this.chainCount = 0;

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
    const { triCount, edgeCount, edgeA, edgeB, edgeF0, edgeF1 } = this.topo;
    const N = this.faceN, C = this.faceC, facing = this.facing, D = this.edgeDot;
    const cx = camLocal.x, cy = camLocal.y, cz = camLocal.z;
    for (let f = 0; f < triCount; f++) {
      const k = f * 3;
      facing[f] = (N[k] * (cx - C[k]) + N[k + 1] * (cy - C[k + 1]) + N[k + 2] * (cz - C[k + 2])) > 0 ? 1 : 0;
    }
    const A = this.selA, B = this.selB, K = this.selKind;
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
      A[n] = edgeA[e]; B[n] = edgeB[e]; K[n] = kind;
      if (kind === 1) sil++; else cre++;
      n++;
    }
    this.segmentCount = n;
    this.silhouetteCount = sil;
    this.creaseCount = cre;
    this.extractMs = performance.now() - t0;
    return n;
  }

  // Walk the selected edges of ONE kind into continuous polylines.
  //
  // Silhouette and crease are chained SEPARATELY and never joined. A vertex
  // where a petal's outline meets an interior fold sits on both sets, and
  // chaining through it would hand the smoother a polyline that turns a corner
  // it should keep — and would put a contour stroke and an interior stroke in
  // one primitive, which the two-tier weight cannot then draw differently.
  //
  // Junctions are cut points. A vertex with degree != 2 ends every chain that
  // reaches it, so a three-way meeting becomes three strokes rather than one
  // arbitrary path through it; that is what stops the smoother from rounding a
  // real corner into a curve.
  buildChains(wantKind) {
    const t0 = performance.now();
    const n = this.segmentCount;
    const A = this.selA, B = this.selB, K = this.selKind;
    const deg = this._deg, head = this._head, nxt = this._nxt, adj = this._adj;
    const vis = this._visited;

    // Reset only what this kind touches. head[] is left at -1 by the walk
    // below never writing it, so one pass over this kind's endpoints is
    // enough — no O(vertices) clear per frame.
    for (let i = 0; i < n; i++) {
      if (K[i] !== wantKind) continue;
      vis[i] = 0;
      deg[A[i]] = 0; head[A[i]] = -1;
      deg[B[i]] = 0; head[B[i]] = -1;
    }
    let slot = 0;
    for (let i = 0; i < n; i++) {
      if (K[i] !== wantKind) continue;
      const a = A[i], b = B[i];
      adj[slot] = i; nxt[slot] = head[a]; head[a] = slot++; deg[a]++;
      adj[slot] = i; nxt[slot] = head[b]; head[b] = slot++; deg[b]++;
    }

    const CV = this.chainV, CS = this.chainStart, CL = this.chainLen;
    let cv = 0, nc = 0;
    const walk = (vStart, e0) => {
      const start = cv;
      CV[cv++] = vStart;
      let cur = vStart, e = e0;
      for (;;) {
        vis[e] = 1;
        const other = A[e] === cur ? B[e] : A[e];
        CV[cv++] = other;
        cur = other;
        if (deg[cur] !== 2) break;             // junction or dead end: cut here
        let next = -1;
        for (let p = head[cur]; p !== -1; p = nxt[p]) {
          if (!vis[adj[p]]) { next = adj[p]; break; }
        }
        if (next < 0) break;                   // closed the loop
        e = next;
      }
      CS[nc] = start; CL[nc] = cv - start; nc++;
    };

    // Open chains first, from every non-degree-2 vertex, so a chain that has
    // ends is walked from an end rather than from its middle.
    for (let i = 0; i < n; i++) {
      if (K[i] !== wantKind) continue;
      for (let s = 0; s < 2; s++) {
        const v = s === 0 ? A[i] : B[i];
        if (deg[v] === 2) continue;
        for (let p = head[v]; p !== -1; p = nxt[p]) {
          if (!vis[adj[p]]) walk(v, adj[p]);
        }
      }
    }
    // Whatever is left is a closed loop — every vertex on it has degree 2, so
    // no pass above could have started it.
    for (let i = 0; i < n; i++) {
      if (K[i] !== wantKind || vis[i]) continue;
      walk(A[i], i);
    }

    this.chainCount = nc;
    this.chainPoints = cv;
    this.chainMs = performance.now() - t0;
    return nc;
  }
}

// --- curation, smoothing, drawing ------------------------------------------
//
// THE EXTRACTION IS UNTOUCHED. Everything below is a post-process over the
// same silhouette/crease edge set: chain it, prune it, smooth it, draw it in
// two weights. The facing test, the dihedral threshold and the CPU pass are
// exactly what they were.
//
// WHY THIS EXISTS. Raw extraction hands back triangle edges, and drawing them
// as literal straight polylines reads as a faceted mesh outline rather than a
// drawn contour — at detail 0, the most conservative setting the slider has,
// this bundle still yields ~18,100 silhouette edges. Turning the detail slider
// down cannot fix it, because the problem is not crease sensitivity: it is that
// a silhouette walked edge by edge is a staircase. So the fix is downstream.
//
// The pipeline, per mesh per tier:
//   chain      connected edges become continuous polylines (LineExtractor)
//   curate     chains too short to read on screen are dropped
//   simplify   Ramer-Douglas-Peucker merges near-collinear runs into one span
//   smooth     Catmull-Rom through the retained points, resampled by span
//   draw       one of two weights, as strokes or as dots
//
// EVERY THRESHOLD IS IN SCREEN PIXELS, converted to world units at the mesh's
// own distance. That is the deliberate part: what should be pruned is what
// would be illegible, and legibility is a screen property. It means zooming
// out prunes more, which is the behaviour a drawing wants and a wireframe
// does not.

const MAX_DOTS = 60000;

// ONE OWNER for every curation number, read by the app, the read-out and the
// gate. See the PR for what this optimizes for and where it over-prunes.
export const CURATION = {
  minChainPx: 5,      // a chain shorter than this on screen is noise, not line
  minCreasePx: 16,    // INTERIOR lines are held to a much higher bar than the
                      // contour: a short silhouette fragment is usually a real
                      // petal edge seen end-on, a short crease fragment is
                      // usually one facet of a surface that is not creased
  simplifyPx: 1.1,    // RDP epsilon — below a pixel is not a shape
  smoothSpanPx: 5,    // one Catmull-Rom sample per this much retained span
  maxSubdiv: 8,
  // Laplacian pre-smoothing, in WORLD units and deliberately not in screen
  // ones: the zigzag being removed is the facet staircase, whose amplitude is
  // a property of the MESH (triangle size), not of the zoom. Measured on this
  // bundle: without it, RDP leaves the staircase intact — a zigzag whose
  // amplitude exceeds the epsilon is not collinear, so nothing collapses, and
  // the contour still turned a mean of 37 deg per join with 5,946 joins over
  // 30 deg. With it, see the PR table.
  smoothIters: 6,
  smoothLambda: 0.6,
};

// TWO TIERS, ONE SLIDER, A FIXED RATIO. The interior weight is not a control.
// The ratio between contour and interior is what makes the picture read as a
// drawing rather than as a wireframe, so it belongs to the STYLE, not to the
// artwork; and an independent interior slider makes the one state that stops
// reading as line art — interior heavier than contour — reachable by accident.
// One weight scales the whole drawing, the way a pen size does. Promoting this
// to a second slider is one line here plus a registry row, the day it is
// wanted. Reported live in the read-out so it is never a hidden number.
export const INTERIOR_WEIGHT_RATIO = 0.45;

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

// Ramer-Douglas-Peucker, iterative. Recursion depth on a 10,000-point
// silhouette chain is not a thing to find out about in production.
function rdp(P, m, eps2, keep, stack) {
  keep.fill(0, 0, m);
  keep[0] = 1; keep[m - 1] = 1;
  let sp = 0;
  stack[sp++] = 0; stack[sp++] = m - 1;
  while (sp > 0) {
    const j = stack[--sp], i = stack[--sp];
    if (j <= i + 1) continue;
    const ax = P[i * 3], ay = P[i * 3 + 1], az = P[i * 3 + 2];
    const bx = P[j * 3], by = P[j * 3 + 1], bz = P[j * 3 + 2];
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const uu = ux * ux + uy * uy + uz * uz;
    let best = -1, bestD = 0;
    for (let k = i + 1; k < j; k++) {
      const wx = P[k * 3] - ax, wy = P[k * 3 + 1] - ay, wz = P[k * 3 + 2] - az;
      let d2;
      if (uu < 1e-20) {
        d2 = wx * wx + wy * wy + wz * wz;
      } else {
        const t = (wx * ux + wy * uy + wz * uz) / uu;
        const tc = t < 0 ? 0 : (t > 1 ? 1 : t);
        const dx = wx - ux * tc, dy = wy - uy * tc, dz = wz - uz * tc;
        d2 = dx * dx + dy * dy + dz * dz;
      }
      if (d2 > bestD) { bestD = d2; best = k; }
    }
    if (best > 0 && bestD > eps2) {
      keep[best] = 1;
      stack[sp++] = i; stack[sp++] = best;
      stack[sp++] = best; stack[sp++] = j;
    }
  }
}

// Laplacian smoothing along a chain. Endpoints are pinned on an open chain so
// a contour does not creep away from the junction it meets; a closed loop
// wraps instead.
// PING-PONGED, not copied. Six iterations of copy-back was the single
// largest cost in the post-process when it was measured per phase; reading
// from one buffer and writing the other costs nothing extra and the even
// iteration count lands the result back in P.
function laplacian(P, m, closed, iters, lambda, tmp) {
  if (m < 3) return;
  const h = lambda * 0.5;
  const n2 = iters & 1 ? iters + 1 : iters;      // keep it even
  let src = P, dst = tmp;
  for (let it = 0; it < n2; it++) {
    for (let k = 0; k < m; k++) {
      let a, b;
      if (closed) {
        const n = m - 1;
        a = ((k - 1) % n + n) % n; b = (k + 1) % n;
      } else if (k === 0 || k === m - 1) {
        dst[k * 3] = src[k * 3]; dst[k * 3 + 1] = src[k * 3 + 1]; dst[k * 3 + 2] = src[k * 3 + 2];
        continue;
      } else { a = k - 1; b = k + 1; }
      const o = k * 3, oa = a * 3, ob = b * 3;
      dst[o]     = src[o]     + h * (src[oa]     + src[ob]     - 2 * src[o]);
      dst[o + 1] = src[o + 1] + h * (src[oa + 1] + src[ob + 1] - 2 * src[o + 1]);
      dst[o + 2] = src[o + 2] + h * (src[oa + 2] + src[ob + 2] - 2 * src[o + 2]);
    }
    const t = src; src = dst; dst = t;
  }
}

const cr = (p0, p1, p2, p3, t) => {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};

export class LineArt {
  // `meshes` are the source meshes; each gets its own extractor and its own
  // draw objects, PARENTED TO THE MESH, so everything stays in that mesh's
  // local space and the bloom's hinge rotation is carried by the scene graph
  // instead of by re-transforming 78,480 triangles.
  constructor(meshes, opts = {}) {
    this.ink = new THREE.Color(opts.ink !== undefined ? opts.ink : 0x14181a);
    this.paper = new THREE.Color(opts.paper !== undefined ? opts.paper : 0xf2f0ea);
    this.weight = 2.2;
    this.detail = 45;
    this.blend = 0;
    this.enabled = false;
    this._dotTex = dotTexture();
    this.units = [];

    for (const mesh of meshes) {
      const ex = new LineExtractor(mesh);
      const cap = ex.topo.edgeCount;
      const tiers = [1, 2].map((kind) => {
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
        lines.renderOrder = kind === 1 ? 6 : 5;   // contour over interior
        lines.name = `lineart_${kind === 1 ? 'contour' : 'interior'}_${mesh.name || 'mesh'}`;
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
        dots.renderOrder = kind === 1 ? 8 : 7;
        dots.name = `lineart_dots_${kind === 1 ? 'contour' : 'interior'}_${mesh.name || 'mesh'}`;
        mesh.add(dots);
        return { kind, geo, buf, mat, lines, dotGeo, dotBuf, dotMat, dots, cap,
                 strokes: 0, dots_: 0, chains: 0, dropped: 0, ptsIn: 0, ptsOut: 0,
                 turnMax: 0, turnMean: 0, turnOver30: 0, turnJoins: 0 };
      });

      // The occluding fill. Flat paper, no lighting model at all — its only
      // job is to write depth so a line on the far side of the flower is
      // hidden by the near side. polygonOffset pushes it back so the lines,
      // which sit exactly ON it, are not z-fought away.
      const fill = new THREE.MeshBasicMaterial({
        color: this.paper.getHex(), polygonOffset: true,
        polygonOffsetFactor: 1.2, polygonOffsetUnits: 1.2,
      });

      // chain scratch, sized to the worst case one chain can reach
      const P = new Float32Array((cap + 2) * 3);
      this.units.push({ mesh, ex, tiers, fill, original: mesh.material,
        scratchP: P, scratchKeep: new Uint8Array(cap + 2),
        scratchStack: new Int32Array((cap + 2) * 2),
        scratchIdx: new Int32Array(cap + 2),
        scratchSm: new Float32Array((cap + 2) * 3 * 2),
        scratchTmp: new Float32Array((cap + 2) * 3) });
    }
    this.setEnabled(false);
  }

  setEnabled(on) {
    this.enabled = !!on;
    for (const u of this.units) {
      u.mesh.material = on ? u.fill : u.original;
      for (const t of u.tiers) { t.lines.visible = on; t.dots.visible = on; }
    }
  }

  setOptions({ weight, detail, blend }) {
    if (weight !== undefined) this.weight = weight;
    if (detail !== undefined) this.detail = detail;
    if (blend !== undefined) this.blend = blend;
  }

  get creaseAngleDeg() { return detailToAngleDeg(this.detail); }
  get contourWeight() { return this.weight; }
  get interiorWeight() { return this.weight * INTERIOR_WEIGHT_RATIO; }

  // Call after a mesh DEFORMS. Pass the mesh so a bend-point drag re-reads the
  // stem's 4,824 triangles and not the bloom's 73,656, which did not move —
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

  // Chain -> curate -> simplify -> smooth -> fill this tier's buffers.
  _drawTier(u, tier, wpp, blend, view, measureTurns) {
    const ex = u.ex;
    ex.buildChains(tier.kind);
    const { chainV, chainStart, chainLen, chainCount } = ex;
    const rep = ex.topo.rep;
    const MP = u.mesh.geometry.getAttribute('position').array;
    const P = u.scratchP, keep = u.scratchKeep, stack = u.scratchStack;
    const idx = u.scratchIdx, sm = u.scratchSm, tmp = u.scratchTmp;
    const dst = tier.buf.array, dotArr = tier.dotBuf.array;

    const minLen = (tier.kind === 1 ? CURATION.minChainPx : CURATION.minCreasePx) * wpp;
    const eps2 = (CURATION.simplifyPx * wpp) ** 2;
    const spanW = CURATION.smoothSpanPx * wpp;
    const dotSpacing = Math.max(Math.max(2.2, this.weight * 2.0) * wpp, 1e-4);

    let sn = 0, dn = 0, kept = 0, dropped = 0, ptsIn = 0, ptsOut = 0;
    let turnMax = 0, turnSum = 0, turnN = 0, turnOver = 0;
    for (let c = 0; c < chainCount; c++) {
      const s0 = chainStart[c], m = chainLen[c];
      if (m < 2) { dropped++; continue; }

      // gather, and measure the chain while gathering
      let len = 0;
      for (let k = 0; k < m; k++) {
        const o = rep[chainV[s0 + k]] * 3;
        P[k * 3] = MP[o]; P[k * 3 + 1] = MP[o + 1]; P[k * 3 + 2] = MP[o + 2];
        if (k) {
          const dx = P[k*3] - P[(k-1)*3], dy = P[k*3+1] - P[(k-1)*3+1], dz = P[k*3+2] - P[(k-1)*3+2];
          len += Math.sqrt(dx*dx + dy*dy + dz*dz);
        }
      }
      // CURATION, step one: too short on screen to read as a line.
      if (len < minLen) { dropped++; continue; }
      ptsIn += m;

      const closed = chainV[s0] === chainV[s0 + m - 1];

      // SMOOTH, step one: kill the facet staircase BEFORE simplifying. RDP
      // cannot do this on its own — a zigzag is not near-collinear, so nothing
      // collapses and the staircase survives into the curve.
      laplacian(P, m, closed, CURATION.smoothIters, CURATION.smoothLambda, tmp);

      // CURATION, step two: near-collinear runs collapse into one span.
      rdp(P, m, eps2, keep, stack);
      let K = 0;
      for (let k = 0; k < m; k++) if (keep[k]) idx[K++] = k;
      if (K < 2) { dropped++; continue; }
      ptsOut += K;
      kept++;

      const wrap = closed && K > 3, last = K - 1, per = K - 1;

      // SMOOTH, step two: Catmull-Rom through the retained points. The corners
      // RDP kept are the ones the curve rounds; the ones it dropped never
      // existed.
      let smN = 0;
      for (let q = 0; q < K - 1; q++) {
        let qa = q - 1, qb = q + 2;
        if (wrap) { qa = ((qa % per) + per) % per; qb = qb % per; }
        else { qa = qa < 0 ? 0 : qa; qb = qb > last ? last : qb; }
        const i0 = idx[qa] * 3, i1 = idx[q] * 3, i2 = idx[q + 1] * 3, i3 = idx[qb] * 3;
        const sx = P[i2] - P[i1], sy = P[i2+1] - P[i1+1], sz = P[i2+2] - P[i1+2];
        const span = Math.sqrt(sx * sx + sy * sy + sz * sz);
        const S = Math.max(1, Math.min(CURATION.maxSubdiv, Math.round(span / spanW)));
        for (let k = (q === 0 ? 0 : 1); k <= S; k++) {
          const t = k / S;
          const o = smN * 3;
          sm[o]     = cr(P[i0],     P[i1],     P[i2],     P[i3],     t);
          sm[o + 1] = cr(P[i0 + 1], P[i1 + 1], P[i2 + 1], P[i3 + 1], t);
          sm[o + 2] = cr(P[i0 + 2], P[i1 + 2], P[i2 + 2], P[i3 + 2], t);
          smN++;
        }
      }
      if (smN < 2) { dropped++; kept--; continue; }

      // How hard does the finished stroke turn? SAMPLED every 8th frame, not
      // every one: it is a read-out and a gate instrument, not something the
      // picture needs, and an acos per drawn point is ~0.6 ms of the budget it
      // is reporting on. Measured HERE, per chain, on
      // the points about to be drawn — never across the emitted buffer, where
      // the end of one chain and the start of the next share a junction
      // position and read as one enormous fake turn. (Measured that way first:
      // it reported a 180 deg max on every run, which was two strokes meeting
      // at a corner, not a facet.)
      if (measureTurns) for (let k = 1; k + 1 < smN; k++) {
        const a = (k - 1) * 3, b = k * 3, c2 = (k + 1) * 3;
        const ux = sm[b] - sm[a], uy = sm[b+1] - sm[a+1], uz = sm[b+2] - sm[a+2];
        const vx = sm[c2] - sm[b], vy = sm[c2+1] - sm[b+1], vz = sm[c2+2] - sm[b+2];
        const lu = Math.sqrt(ux*ux + uy*uy + uz*uz), lv = Math.sqrt(vx*vx + vy*vy + vz*vz);
        if (lu < 1e-9 || lv < 1e-9) continue;
        let cs = (ux*vx + uy*vy + uz*vz) / (lu * lv);
        cs = cs < -1 ? -1 : (cs > 1 ? 1 : cs);
        const ang = Math.acos(cs) * 180 / Math.PI;
        if (ang > turnMax) turnMax = ang;
        turnSum += ang; turnN++;
        if (ang > 30) turnOver++;
      }

      // ONE extraction, TWO consumers — now partitioned per CHAIN rather than
      // per edge, because the chain is what the post-process produces. The
      // hash is on the chain's first welded vertex id, which is a property of
      // the geometry, so a chain does not flicker between stroke and dots as
      // the camera moves.
      if (hash01(chainV[s0]) >= blend) {
        for (let k = 0; k + 1 < smN && sn < tier.cap; k++) {
          const o = sn * 6, a = k * 3, b = (k + 1) * 3;
          dst[o] = sm[a]; dst[o + 1] = sm[a + 1]; dst[o + 2] = sm[a + 2];
          dst[o + 3] = sm[b]; dst[o + 4] = sm[b + 1]; dst[o + 5] = sm[b + 2];
          sn++;
        }
      } else {
        // dots along the SAME smoothed polyline, walked at a constant screen
        // spacing rather than one per sample, so density does not track the
        // subdivision the smoother happened to choose
        let carry = 0;
        for (let k = 0; k + 1 < smN && dn < MAX_DOTS; k++) {
          const a = k * 3, b = (k + 1) * 3;
          let dx = sm[b] - sm[a], dy = sm[b + 1] - sm[a + 1], dz = sm[b + 2] - sm[a + 2];
          const segLen = Math.hypot(dx, dy, dz) || 1e-9;
          let lx = dy * view.z - dz * view.y, ly = dz * view.x - dx * view.z, lz = dx * view.y - dy * view.x;
          const ll = Math.hypot(lx, ly, lz) || 1;
          lx /= ll; ly /= ll; lz /= ll;
          for (let d = carry; d < segLen && dn < MAX_DOTS; d += dotSpacing) {
            const t = d / segLen;
            const h = hash01(chainV[s0] * 31 + dn);
            const j = (h - 0.5) * dotSpacing * 0.9;
            const o = dn * 3;
            dotArr[o]     = sm[a]     + dx * t + lx * j;
            dotArr[o + 1] = sm[a + 1] + dy * t + ly * j;
            dotArr[o + 2] = sm[a + 2] + dz * t + lz * j;
            dn++;
            carry = d + dotSpacing - segLen;
          }
          if (carry < 0) carry = 0;
        }
      }
    }

    tier.buf.needsUpdate = true;
    tier.lines.geometry.instanceCount = sn;
    tier.dotBuf.needsUpdate = true;
    tier.dotGeo.setDrawRange(0, dn);
    tier.strokes = sn; tier.dots_ = dn;
    tier.chains = kept; tier.dropped = dropped;
    tier.ptsIn = ptsIn; tier.ptsOut = ptsOut;
    if (measureTurns) {
      tier.turnMax = turnMax; tier.turnMean = turnN ? turnSum / turnN : 0;
      tier.turnOver30 = turnOver; tier.turnJoins = turnN;
    }
    tier.truncated = sn >= tier.cap;
    return ex.chainMs;
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
    const centre = new THREE.Vector3();

    const measureTurns = (this._turnTick = (this._turnTick || 0) + 1) % 8 === 1;
    let sil = 0, cre = 0, extractMs = 0, chainMs = 0;
    let strokes = 0, dots = 0, chains = 0, dropped = 0, ptsIn = 0, ptsOut = 0;
    let truncated = false;

    for (const u of this.units) {
      u.mesh.updateWorldMatrix(true, false);
      inv.copy(u.mesh.matrixWorld).invert();
      camLocal.copy(camWorld).applyMatrix4(inv);

      u.ex.extract(camLocal, creaseCos);
      extractMs += u.ex.extractMs;
      sil += u.ex.silhouetteCount; cre += u.ex.creaseCount;

      // world units per screen pixel, at the mesh's own centre
      u.mesh.getWorldPosition(centre);
      const dist = Math.max(camWorld.distanceTo(centre), 1e-3);
      const wpp = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.max(sizePx[1], 1);
      const view = camLocal.clone().normalize();

      for (const tier of u.tiers) {
        chainMs += this._drawTier(u, tier, wpp, b, view, measureTurns);
        tier.mat.linewidth = tier.kind === 1 ? this.contourWeight : this.interiorWeight;
        tier.mat.resolution.set(sizePx[0], sizePx[1]);
        tier.dotMat.size = Math.max(1, (tier.kind === 1 ? this.contourWeight : this.interiorWeight) * 1.7 * pixelRatio);
        strokes += tier.strokes; dots += tier.dots_;
        chains += tier.chains; dropped += tier.dropped;
        ptsIn += tier.ptsIn; ptsOut += tier.ptsOut;
        truncated = truncated || tier.truncated;
      }
    }

    const tierSum = (k, f) => this.units.reduce((a, u) => a + f(u.tiers.find(t => t.kind === k)), 0);
    this.stats = {
      segments: sil + cre, silhouette: sil, crease: cre,
      chains, dropped, ptsIn, ptsOut,
      strokes, dots, truncated,
      contourStrokes: tierSum(1, t => t.strokes), interiorStrokes: tierSum(2, t => t.strokes),
      contourChains: tierSum(1, t => t.chains), interiorChains: tierSum(2, t => t.chains),
      contourDots: tierSum(1, t => t.dots_), interiorDots: tierSum(2, t => t.dots_),
      contourWeight: this.contourWeight, interiorWeight: this.interiorWeight,
      contourTurnMax: Math.max(...this.units.map(u => u.tiers.find(t => t.kind === 1).turnMax)),
      contourTurnMean: tierSum(1, t => t.turnMean * t.turnJoins) / Math.max(tierSum(1, t => t.turnJoins), 1),
      contourTurnOver30: tierSum(1, t => t.turnOver30),
      contourTurnJoins: tierSum(1, t => t.turnJoins),
      extractMs, chainMs, frameMs: performance.now() - t0,
      creaseAngleDeg: this.creaseAngleDeg,
    };
    return this.stats;
  }
}
