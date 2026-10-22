/* ===================================================================
   bloom-texture-lab-core.js — SURFACE TEXTURE DISCOVERY PROTOTYPE.
   NOT SHIPPED. Nothing in bloom.js, bloom-registry.js or bloom-geometry.js
   imports this file, and this file changes nothing in them: it imports the
   shipped geometry read-only, builds a bloom exactly as the generator does,
   and works on a COPY of the triangle soup the builder handed back.

   Read docs/bloom-surface-texture-discovery.md before extending it.

   TWO ATTACHMENT POINTS, BOTH BUILT HERE ON THE SAME BLOOM:

   (A) POST-PASS. One function between "the builder finished" and "the STL is
       written". It sees positions and nothing else: no organ, no feature, no
       mid-surface. Its normal is the mesh's own (area-weighted over every
       incident facet), its field is world-space. Knowledge-free by
       construction — that is what makes it one function and also what it
       cannot do.

   (B) A SHARED WORLD-SPACE FIELD SAMPLED BY EACH EMITTER. The real B lives
       inside emitPanel / emitRimLoop / emitInfillPanel / revolveInto /
       buildHubInto / buildStemInto ... and that is integration work this
       prototype does NOT do. It is EMULATED: every triangle is tagged with the
       emitter chain that produced it (read off the call stack of
       MeshBuilder.tri on a wrapped accumulator — the emitters are unchanged),
       and every sheet vertex is tied to the mid-surface the emitter itself
       recorded (`grid` on each petal and sepal record, `rowCentre` /
       `rowNormal` on each leaf). With that, B can do what only an emitter can:
       displace along the SHEET normal rather than a faceted average, and mask
       a feature (the rim bead, a Voronoi hole rim, a buried foot, a crease).
       (The discovery's B also EMBOSSED — both skins of a sheet moved together;
       ruling 2 dropped it, T1 removed it.) What the emulation does NOT do,
       and a real B would: re-evaluate the surface law at the finer lattice
       (here, as in A, new points lie on the facets' chords), and refine row
       placement through the ladder.

   SUBDIVISION, SHARED BY BOTH. The shipped lattice is far too coarse to carry
   a millimetre relief (petal columns are ~1.6 mm apart), so both arms first
   split every edge longer than `edgeMm`, by the 'rows' split (T1; its own
   header is at `subdivide`): every edge into ceil(L/e) equal segments cached
   on the welded edge, so every closed shell stays closed by construction; a
   coplanar strip quad cut as one unit; any other triangle filled by rows
   from the corner opposite its least-cut edge. Welding is on Math.fround
   positions — the float32 view the STL gates take.

   The discovery's red-green split is kept, behind `{ split: 'redgreen' }`,
   as the must-fail: it fanned the shipped stem's 55.89 x 0.39 mm slivers into
   429,378 triangles at 0.6 mm and its fans' normals read as outward "folds"
   on the bore in both arms. tools/bloom-texture-lab-quality.mjs is the check
   (TQ0-TQ3) and its --control requires red-green to FAIL it on the stem;
   discovery doc §11 has the re-measured figures.
   =================================================================== */
import * as G from './bloom-geometry.js';

/* ----------------------------------------------------------------- fields */
function hash3(x, y, z, s) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return h >>> 0;
}
const GRAD = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
function gradNoise(x, y, z, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = fade(xf), v = fade(yf), w = fade(zf);
  let acc = 0;
  for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    const g = GRAD[hash3(xi + dx, yi + dy, zi + dz, seed) % 12];
    const d = g[0] * (xf - dx) + g[1] * (yf - dy) + g[2] * (zf - dz);
    acc += d * (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
  }
  return acc; // roughly [-1, 1]
}
function worley(x, y, z, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let f1 = Infinity, f2 = Infinity;
  for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const cx = xi + dx, cy = yi + dy, cz = zi + dz;
    const h = hash3(cx, cy, cz, seed);
    const px = cx + ((h & 1023) / 1023), py = cy + (((h >>> 10) & 1023) / 1023), pz = cz + (((h >>> 20) & 1023) / 1023);
    const d = Math.hypot(px - x, py - y, pz - z);
    if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
  }
  return [f1, f2];
}

/* THE THREE RELIEF TYPES, each a scalar f(x) in [0, 1] of WORLD position (mm).
   `lambda` is the feature size in mm. 1 = the high of the relief. */
export const RELIEF_TYPES = Object.freeze(['pebble', 'cellular', 'ribbing']);
export const RIB_REF_RADIUS_MM = 20; // ribbing spacing is `lambda` at this radius from the bloom axis
export function reliefField(type, lambda, seed = 7) {
  const k = 1 / lambda;
  if (type === 'pebble') {
    return (p) => {
      const n = gradNoise(p[0] * k, p[1] * k, p[2] * k, seed) + 0.5 * gradNoise(p[0] * 2 * k, p[1] * 2 * k, p[2] * 2 * k, seed + 1);
      return Math.min(1, Math.max(0, 0.5 + 0.75 * n));
    };
  }
  if (type === 'cellular') {
    return (p) => {
      const [f1, f2] = worley(p[0] * k, p[1] * k, p[2] * k, seed);
      const e = (f2 - f1) / 0.35; // 0 on a cell wall, rising to 1 inside the cell
      return e >= 1 ? 1 : e * e * (3 - 2 * e);
    };
  }
  if (type === 'ribbing') {
    /* RADIAL SPOKES ABOUT THE BLOOM AXIS (world z). Spacing is `lambda` at
       RIB_REF_RADIUS_MM, so it tightens toward the axis — on the stem (which
       is on the axis) it reads as vertical fluting. One reading of
       "directional"; the open question is in the discovery doc. */
    const K = Math.max(1, Math.round((2 * Math.PI * RIB_REF_RADIUS_MM) / lambda));
    return (p) => 0.5 + 0.5 * Math.cos(K * Math.atan2(p[1], p[0]));
  }
  throw new Error(`unknown relief type ${type}`);
}

/* THE SIGN CONVENTION — OUTWARD ONLY (Eva's ruling 2, Oct 22: relief never
   thins a sheet). The surface only ever rises out of the solid, s in [0, H].
   The discovery also built `inward`, `centred` and B's `emboss`; they are
   removed (T1), and their measured rows stay in the discovery doc §4 as the
   record that ruled them out (docs/data/bloom-surface-texture-measure.json). */
export const RELIEF_MODES = Object.freeze(['outward']);
export function signedRelief(mode, f) {
  if (mode !== 'outward') throw new Error(`relief mode ${mode} is ruled out (outward only — discovery doc §0 ruling 2)`);
  return f;
}

/* ------------------------------------------------------- tagged build */
const EMITTERS = ['emitHoleRim', 'emitRimEdge', 'emitRimLoop', 'emitInfillPanel', 'emitPanel', 'emitLeafBladeInto', 'tipInto', 'revolveInto', 'rodInto'];
export const FEATURES = Object.freeze(['skin', 'bead', 'cellSkin', 'holeRim', 'cellMargin', 'rod', 'hub', 'stem', 'other']);
export const ORGANS = Object.freeze(['petal', 'sepal', 'leaf', 'tube', 'stamen', 'style', 'hub', 'stem', 'other']);
function classify(names) {
  const has = (n) => names.includes(n);
  let organ = 'other';
  if (has('buildSepalsInto') || has('buildSepalTierInto')) organ = 'sepal';
  else if (has('buildLeafInto') || has('buildCompoundLeafInto') || has('emitLeafBladeInto')) organ = 'leaf';
  else if (has('emitTubeRings')) organ = 'tube';
  else if (has('buildStamenInto')) organ = 'stamen';
  else if (has('buildStyleInto')) organ = 'style';
  else if (has('buildHubInto')) organ = 'hub';
  else if (has('buildStemInto')) organ = 'stem';
  else if (has('buildPetalInto')) organ = 'petal';
  let feature = 'other';
  if (has('emitHoleRim')) feature = 'holeRim';
  else if (has('emitRimEdge')) feature = 'cellMargin';
  else if (has('emitInfillPanel')) feature = has('emitRimLoop') ? 'cellMargin' : 'cellSkin';
  else if (has('emitRimLoop')) feature = 'bead';
  else if (has('emitPanel') || has('emitLeafBladeInto')) feature = 'skin';
  else if (has('revolveInto') || has('rodInto') || has('tipInto')) feature = 'rod';
  else if (organ === 'hub') feature = 'hub';
  else if (organ === 'stem') feature = 'stem';
  return { organ, feature };
}
const STACK_NAMES = new Set([...EMITTERS, 'buildSepalsInto', 'buildSepalTierInto', 'buildLeafInto', 'buildCompoundLeafInto', 'emitTubeRings', 'buildStamenInto', 'buildStyleInto', 'buildHubInto', 'buildStemInto', 'buildPetalInto']);

/* Build `state` exactly as the generator does (export mode by default) and
   return the soup, a per-triangle (organ, feature) tag, and the organ
   instances' own mid-surface records for B. */
export function buildTagged(state, { exportMode = true } = {}) {
  const acc = new G.MeshBuilder({ exportMode, captureGrid: true });
  const organIx = [], featIx = [];
  const origTri = acc.tri.bind(acc);
  const cache = new Map();
  const oldLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 40;
  acc.tri = function (a, b, c) {
    const names = [];
    for (const line of String(new Error().stack).split('\n')) {
      const m = line.match(/at (?:[\w$.]*\.)?([\w$]+) /);
      if (m && STACK_NAMES.has(m[1])) names.push(m[1]);
    }
    const key = names.join('>');
    let cls = cache.get(key);
    if (!cls) { cls = classify(names); cache.set(key, cls); }
    organIx.push(ORGANS.indexOf(cls.organ)); featIx.push(FEATURES.indexOf(cls.feature));
    return origTri(a, b, c);
  };
  let built;
  try { built = G.buildBloomInto(acc, state, { below: null }); }
  finally { Error.stackTraceLimit = oldLimit; }
  const triCount = acc.positions.length / 9;
  /* INSTANCES: contiguous triangle ranges the builder itself reports, each
     with the mid-surface samples its emitter recorded. */
  const instances = [];
  let at = 0;
  for (const p of built.petalsAll || []) {
    if (!p) continue;
    instances.push({ organ: 'petal', from: at, to: at + p.tris, samples: gridSamples(p.grid) });
    at += p.tris;
  }
  if (built.sepals && built.sepals.built) {
    const sTot = built.sepals.built.reduce((s, q) => s + (q ? q.tris : 0), 0);
    let s0 = triCount - sTot;
    for (const q of built.sepals.built) { if (!q) continue; instances.push({ organ: 'sepal', from: s0, to: s0 + q.tris, samples: gridSamples(q.grid) }); s0 += q.tris; }
  }
  if (built.leafTriRange && built.leavesBuilt) {
    let l0 = built.leafTriRange[0];
    for (const q of built.leavesBuilt) { if (!q) continue; instances.push({ organ: 'leaf', from: l0, to: l0 + q.tris, samples: leafSamples(q) }); l0 += q.tris; }
  }
  return { positions: acc.positions, organIx: Int8Array.from(organIx), featIx: Int8Array.from(featIx), triCount, built, instances, minThickness: acc.minThickness };
}
function gridSamples(grid) {
  const out = [];
  for (const panel of grid || []) for (const row of panel.rows || []) {
    for (let c = 0; c < row.mid.length; c++) {
      const n = row.normal[c]; if (!n) continue;
      out.push({ m: row.mid[c], n, u: row.u, foot: row.u === 0 });
    }
  }
  return out;
}
function leafSamples(q) {
  const out = [];
  for (let r = 0; r < (q.rowCentre || []).length; r++) if (q.rowCentre[r] && q.rowNormal[r]) out.push({ m: q.rowCentre[r], n: q.rowNormal[r], u: q.rowU ? q.rowU[r] : 1, foot: false, plane: true });
  return out;
}

/* ------------------------------------------------------ indexed mesh */
export function weld(soup) {
  const { positions, triCount } = soup;
  const key = new Map(); const P = []; const T = new Int32Array(triCount * 3);
  for (let i = 0; i < triCount * 3; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
    const k = `${Math.fround(x)},${Math.fround(y)},${Math.fround(z)}`;
    let id = key.get(k);
    if (id === undefined) { id = P.length / 3; key.set(k, id); P.push(x, y, z); }
    T[i] = id;
  }
  const tri = [];
  for (let t = 0; t < triCount; t++) {
    const a = T[t * 3], b = T[t * 3 + 1], c = T[t * 3 + 2];
    if (a === b || b === c || a === c) continue; // a degenerate facet carries no surface
    tri.push(a, b, c);
  }
  /* triangle -> its source triangle, for tags and instances */
  const src = []; for (let t = 0; t < triCount; t++) { const a = T[t * 3], b = T[t * 3 + 1], c = T[t * 3 + 2]; if (!(a === b || b === c || a === c)) src.push(t); }
  return { P, tri, src };
}

/* SUBDIVISION TO A MAXIMUM EDGE LENGTH. Two splits, one interface; `attrs`
   is an optional list of per-vertex attribute arrays new points interpolate.

   'rows' (THE SHIPPED SPLIT, T1). Every edge is cut into n = ceil(L / e)
   EQUAL segments, n a pure function of the unordered edge, and the points are
   computed from the LOWER vertex id and cached on the edge key — so the two
   triangles sharing an edge share the very same vertices and every closed
   shell stays closed by construction, not by a matching rule. A triangle is
   then filled by ROWS: its apex is the corner opposite the edge with the
   fewest segments (ties: the shorter edge), K = the larger of the two side
   counts, row k runs between the two sides' own points k/K of the way down
   (a side with fewer points gives consecutive rows a shared end), each row
   is cut to the same ceil(L / e) law, and consecutive rows are ZIPPED along
   the shorter diagonal. Every emitted triangle is wound as its source; an
   index-degenerate one (where two rows share an end) is skipped, which is
   exact, since its two equal edges cancel. A COPLANAR STRIP QUAD — two
   triangles sharing their mutual longest edge, convex, both rails at least as
   long as either end (`quadPairs`) — is cut as ONE unit, rows running across
   it between its two long sides, and its diagonal is never cut. That is what
   the shipped stem's walls need: each 55.89 x 0.39 mm (outer) / 0.20 mm (bore)
   wall quad cut as two separate triangles still leaves each sliver's apex
   with vertices 0.014 mm apart whose mesh normals differ by 3.75 degrees, and
   outward relief crossed them (measured: 119 bore "folds" at 0.6 mm in both
   arms, where red-green read 4,058; as quads, 0).

   'redgreen' (THE DISCOVERY'S SPLIT, KEPT AS THE MUST-FAIL). A triangle with
   1/2/3 edges over the limit splits into 2/3/4 by midpoints, repeated. It is
   conforming too, but bisecting a long sliver along its one long side makes
   fans of near-degenerate triangles: 570 stem triangles -> 429,378 at 0.6 mm
   against an ideal of ~9,621. tools/bloom-texture-lab-quality.mjs requires
   this split to FAIL the triangle-quality check on the stem. */
export const SPLITS = Object.freeze(['rows', 'redgreen']);
export function subdivide(mesh, edgeMm, attrs = [], { split = 'rows', canPair = null } = {}) {
  if (split === 'redgreen') return subdivideRedGreen(mesh, edgeMm, attrs);
  if (split !== 'rows') throw new Error(`unknown split ${split}`);
  return subdivideRows(mesh, edgeMm, attrs, canPair);
}
function subdivideRows(mesh, edgeMm, attrs, canPair) {
  const P = mesh.P.slice();
  attrs = attrs.map((a) => a.slice());
  const e2 = edgeMm * edgeMm;
  const segs = (i, j) => { const d = dist2(P, i, j); return d <= e2 ? 1 : Math.ceil(Math.sqrt(d) / edgeMm); };
  const addPoint = (i, j, t) => {
    const id = P.length / 3;
    P.push(P[i * 3] + (P[j * 3] - P[i * 3]) * t, P[i * 3 + 1] + (P[j * 3 + 1] - P[i * 3 + 1]) * t, P[i * 3 + 2] + (P[j * 3 + 2] - P[i * 3 + 2]) * t);
    for (const a of attrs) a.push(lerpAttr(a[i], a[j], t));
    return id;
  };
  /* the points of an edge, from `i` to `j` inclusive; built once from the lower id */
  const edgeCache = new Map();
  const edgePts = (i, j) => {
    const lo = i < j ? i : j, hi = i < j ? j : i, k = lo * 4294967296 + hi;
    let pts = edgeCache.get(k);
    if (!pts) {
      const n = segs(lo, hi);
      pts = [lo];
      for (let s = 1; s < n; s++) pts.push(addPoint(lo, hi, s / n));
      pts.push(hi);
      edgeCache.set(k, pts);
    }
    return i === lo ? pts : pts.slice().reverse();
  };
  const tri = [], src = [], pairs = [];
  const nT = mesh.tri.length / 3;
  const pairOf = quadPairs(mesh, P, e2, segs, canPair);
  for (let t = 0; t < nT; t++) {
    const a = mesh.tri[t * 3], b = mesh.tri[t * 3 + 1], c = mesh.tri[t * 3 + 2], s = mesh.src[t];
    if (pairOf[t] >= 0) {
      const u = pairOf[t];
      if (u < t) continue; // emitted with its partner
      pairs.push([s, mesh.src[u]]);
      splitQuad(t, u, s);
      continue;
    }
    const ab = edgePts(a, b), bc = edgePts(b, c), ca = edgePts(c, a);
    if (ab.length === 2 && bc.length === 2 && ca.length === 2) { tri.push(a, b, c); src.push(s); continue; }
    const n0 = faceNormal(P, a, b, c);
    /* the apex is opposite the edge with the fewest segments */
    const cand = [[bc, a, b, c, dist2(P, b, c)], [ca, b, c, a, dist2(P, c, a)], [ab, c, a, b, dist2(P, a, b)]];
    cand.sort((x, y) => (x[0].length - y[0].length) || (x[4] - y[4]));
    const [base, A, B, Cc] = cand[0];
    const sB = edgePts(A, B), sC = edgePts(A, Cc);
    const n1 = sB.length - 1, n2 = sC.length - 1, K = Math.max(n1, n2);
    let prev = [A];
    for (let k = 1; k <= K; k++) {
      let row;
      if (k === K) row = base; // B .. C, the edge's own points
      else {
        const L = sB[Math.round(k * n1 / K)], R = sC[Math.round(k * n2 / K)];
        const m = segs(L, R);
        row = [L];
        for (let q = 1; q < m; q++) row.push(addPoint(L, R, q / m));
        row.push(R);
      }
      zipRows(P, prev, row, n0, tri, src, s);
      prev = row;
    }
  }
  /* A PAIRED QUAD is cut as one unit: its loop is j -> p -> i -> q (t = i j p
     wound i->j, u = j i q), the two opposite sides with MORE segments are the
     rails, rows run between them from one short side to the other, and the
     shared diagonal — which no other triangle uses — is never cut, so no
     point is put on it. The rows lie in the quad's plane, so every new point
     is still on the shipped facets. */
  function splitQuad(t, u, s) {
    const T = [mesh.tri[t * 3], mesh.tri[t * 3 + 1], mesh.tri[t * 3 + 2]];
    const U = [mesh.tri[u * 3], mesh.tri[u * 3 + 1], mesh.tri[u * 3 + 2]];
    let r = 0; while (U.includes(T[(r + 2) % 3])) r++;          // T[r]->T[r+1] is the shared edge
    const i = T[r], j = T[(r + 1) % 3], p = T[(r + 2) % 3], q = U.find((x) => x !== i && x !== j);
    const n0 = faceNormal(P, i, j, p);
    const loop = railLoop([j, p, i, q], segs);
    const [v0, v1, v2, v3] = loop;
    const rA = edgePts(v0, v1), rB = edgePts(v3, v2);
    const n1 = rA.length - 1, n2 = rB.length - 1, K = Math.max(n1, n2);
    let prev = edgePts(v0, v3);
    for (let k = 1; k <= K; k++) {
      let row;
      if (k === K) row = edgePts(v1, v2);
      else {
        const L = rA[Math.round(k * n1 / K)], R = rB[Math.round(k * n2 / K)];
        const m = segs(L, R);
        row = [L];
        for (let w = 1; w < m; w++) row.push(addPoint(L, R, w / m));
        row.push(R);
      }
      zipRows(P, prev, row, n0, tri, src, s);
      prev = row;
    }
  }
  return { P, tri, src, attrs, pairs };
}
/* Two shipped triangles may be cut as one quad only if they carry the same
   organ and feature tag and belong to the same organ instance (B reads its
   mid-surface per instance). */
export function pairPredicate(soup) {
  const inst = new Int32Array(soup.triCount).fill(-1);
  soup.instances.forEach((it, k) => { for (let t = it.from; t < it.to; t++) inst[t] = k; });
  return (a, b) => soup.organIx[a] === soup.organIx[b] && soup.featIx[a] === soup.featIx[b] && inst[a] === inst[b];
}
/* QUAD PAIRS. Two triangles are cut as one quad when the edge they share is
   the LONGEST edge of both, no other triangle uses it, it needs cutting, the
   four points are coplanar (the fourth within PAIR_PLANE_MM of the others'
   plane — every point a row puts down then lies on a shipped facet), the quad
   is convex, and `canPair` (the caller's tags) agrees. The shipped stem's
   walls are exactly such quads: 55.89 x 0.39 mm (outer) and 0.20 mm (bore).
   Cut as two triangles, each sliver's apex holds vertices 0.014 mm apart
   with mesh normals 3.75 degrees apart — the diagonal's points beside the
   axial edge's — and outward relief along those normals crosses one over the
   other (measured: 119 bore "folds" at 0.6 mm in BOTH arms). */
const PAIR_PLANE_MM = 1e-9;
/* the rotation of a quad loop [v0 v1 v2 v3] whose rails (v0 -> v1, v3 -> v2)
   are the opposite pair with the larger SHORTER side */
function railLoop(L, segs) {
  const a = Math.min(segs(L[0], L[1]), segs(L[3], L[2])), b = Math.min(segs(L[1], L[2]), segs(L[0], L[3]));
  return b > a ? [L[1], L[2], L[3], L[0]] : L;
}
function quadPairs(mesh, P, e2, segs, canPair) {
  const nT = mesh.tri.length / 3, pairOf = new Int32Array(nT).fill(-1);
  const ek = (i, j) => (i < j ? i * 4294967296 + j : j * 4294967296 + i);
  const use = new Map();
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) {
    const key = ek(mesh.tri[t * 3 + k], mesh.tri[t * 3 + (k + 1) % 3]);
    const l = use.get(key); if (l) l.push(t); else use.set(key, [t]);
  }
  const longest = (t) => {
    let best = -1, bk = 0;
    for (let k = 0; k < 3; k++) { const i = mesh.tri[t * 3 + k], j = mesh.tri[t * 3 + (k + 1) % 3], d = dist2(P, i, j); if (d > best) { best = d; bk = ek(i, j); } }
    return [bk, best];
  };
  for (let t = 0; t < nT; t++) {
    if (pairOf[t] >= 0) continue;
    const [kt, dt] = longest(t);
    if (dt <= e2) continue;
    const users = use.get(kt);
    if (users.length !== 2) continue;
    const u = users[0] === t ? users[1] : users[0];
    if (pairOf[u] >= 0 || longest(u)[0] !== kt) continue;
    if (canPair && !canPair(mesh.src[t], mesh.src[u])) continue;
    const T = [mesh.tri[t * 3], mesh.tri[t * 3 + 1], mesh.tri[t * 3 + 2]];
    const q = [mesh.tri[u * 3], mesh.tri[u * 3 + 1], mesh.tri[u * 3 + 2]].find((x) => !T.includes(x));
    if (q === undefined) continue;
    let r = 0; while ([mesh.tri[u * 3], mesh.tri[u * 3 + 1], mesh.tri[u * 3 + 2]].includes(T[(r + 2) % 3])) r++;
    const i = T[r], j = T[(r + 1) % 3], p = T[(r + 2) % 3];
    const [nx, ny, nz] = faceNormal(P, i, j, p);
    const off = (P[q * 3] - P[i * 3]) * nx + (P[q * 3 + 1] - P[i * 3 + 1]) * ny + (P[q * 3 + 2] - P[i * 3 + 2]) * nz;
    if (Math.abs(off) > PAIR_PLANE_MM) continue;
    /* convex: every corner of j -> p -> i -> q turns the same way about the normal */
    const L = [j, p, i, q];
    let convex = true;
    for (let k = 0; k < 4 && convex; k++) {
      const A = L[k], B = L[(k + 1) % 4], Cq = L[(k + 2) % 4];
      const ux = P[B * 3] - P[A * 3], uy = P[B * 3 + 1] - P[A * 3 + 1], uz = P[B * 3 + 2] - P[A * 3 + 2];
      const vx = P[Cq * 3] - P[B * 3], vy = P[Cq * 3 + 1] - P[B * 3 + 1], vz = P[Cq * 3 + 2] - P[B * 3 + 2];
      if ((uy * vz - uz * vy) * nx + (uz * vx - ux * vz) * ny + (ux * vy - uy * vx) * nz <= 0) convex = false;
    }
    if (!convex) continue;
    /* a STRIP only: both rails at least as long, in segments, as either end.
       Two fan triangles off a hub's centre share a radial spoke and make a
       coplanar convex kite whose "rails" are a spoke and a rim chord — rows
       between those converge on the chord, a fan, which is the defect. */
    const [w0, w1, w2, w3] = railLoop(L, segs);
    if (Math.min(segs(w0, w1), segs(w3, w2)) < Math.max(segs(w0, w3), segs(w1, w2))) continue;
    pairOf[t] = u; pairOf[u] = t;
  }
  return pairOf;
}
/* fill the strip between two chains whose first points lie on one side of
   the triangle and last points on the other (ends may coincide) */
function zipRows(P, L, R, n0, tri, src, s) {
  const emit = (x, y, z) => {
    if (x === y || y === z || x === z) return;
    const f = faceNormal(P, x, y, z);
    if (f[0] * n0[0] + f[1] * n0[1] + f[2] * n0[2] < 0) tri.push(x, z, y); else tri.push(x, y, z);
    src.push(s);
  };
  let i = 0, j = 0;
  const a = L.length - 1, b = R.length - 1;
  while (i < a || j < b) {
    const advL = j === b || (i < a && dist2(P, L[i + 1], R[j]) <= dist2(P, L[i], R[j + 1]));
    if (advL) { emit(L[i], L[i + 1], R[j]); i++; } else { emit(L[i], R[j + 1], R[j]); j++; }
  }
}
function lerpAttr(x, y, t) {
  if (x == null || y == null) return x == null ? y : x;
  if (typeof x === 'number') return x + (y - x) * t;
  if (Array.isArray(x)) return x.map((v, i) => v + (y[i] - v) * t);
  const o = {};
  for (const k of Object.keys(x)) o[k] = typeof x[k] === 'boolean' ? (x[k] || y[k]) : Array.isArray(x[k]) ? x[k].map((v, i) => v + (y[k][i] - v) * t) : x[k] + (y[k] - x[k]) * t;
  return o;
}
function subdivideRedGreen(mesh, edgeMm, attrs = []) {
  let { P, tri, src } = mesh;
  P = P.slice(); tri = tri.slice(); src = src.slice();
  attrs = attrs.map((a) => a.slice());
  const e2 = edgeMm * edgeMm;
  for (let pass = 0; pass < 24; pass++) {
    const mid = new Map();
    const nV = P.length / 3;
    const ek = (i, j) => (i < j ? i * 4294967296 + j : j * 4294967296 + i);
    const midOf = (i, j) => {
      const k = ek(i, j); let m = mid.get(k);
      if (m !== undefined) return m;
      const dx = P[i * 3] - P[j * 3], dy = P[i * 3 + 1] - P[j * 3 + 1], dz = P[i * 3 + 2] - P[j * 3 + 2];
      if (dx * dx + dy * dy + dz * dz <= e2) { mid.set(k, -1); return -1; }
      m = P.length / 3;
      P.push((P[i * 3] + P[j * 3]) / 2, (P[i * 3 + 1] + P[j * 3 + 1]) / 2, (P[i * 3 + 2] + P[j * 3 + 2]) / 2);
      for (const a of attrs) a.push(avgAttr(a[i], a[j]));
      mid.set(k, m); return m;
    };
    const out = [], outSrc = [];
    let changed = false;
    for (let t = 0; t < tri.length / 3; t++) {
      const a = tri[t * 3], b = tri[t * 3 + 1], c = tri[t * 3 + 2];
      const ab = midOf(a, b), bc = midOf(b, c), ca = midOf(c, a);
      const s = src[t];
      const push = (x, y, z) => { out.push(x, y, z); outSrc.push(s); };
      const n = (ab >= 0) + (bc >= 0) + (ca >= 0);
      if (n === 0) { push(a, b, c); continue; }
      changed = true;
      if (n === 3) { push(a, ab, ca); push(ab, b, bc); push(ca, bc, c); push(ab, bc, ca); continue; }
      if (n === 1) {
        if (ab >= 0) { push(a, ab, c); push(ab, b, c); }
        else if (bc >= 0) { push(a, b, bc); push(a, bc, c); }
        else { push(a, b, ca); push(ca, b, c); }
        continue;
      }
      /* two marked: rotate so the UNMARKED edge is (c, a) */
      let v = [a, b, c], m = [ab, bc, ca];
      while (m[2] >= 0) { v = [v[1], v[2], v[0]]; m = [m[1], m[2], m[0]]; }
      const [A, B, C] = v, [mAB, mBC] = m;
      push(mAB, B, mBC);
      /* quad A, mAB, mBC, C — the shorter diagonal */
      const d1 = dist2(P, A, mBC), d2 = dist2(P, mAB, C);
      if (d1 <= d2) { push(A, mAB, mBC); push(A, mBC, C); } else { push(A, mAB, C); push(mAB, mBC, C); }
    }
    tri = out; src = outSrc;
    if (!changed) break;
  }
  return { P, tri, src, attrs };
}
function avgAttr(x, y) {
  if (x == null || y == null) return x == null ? y : x;
  if (typeof x === 'number') return (x + y) / 2;
  if (Array.isArray(x)) return x.map((v, i) => (v + y[i]) / 2);
  const o = {};
  for (const k of Object.keys(x)) o[k] = typeof x[k] === 'boolean' ? (x[k] || y[k]) : Array.isArray(x[k]) ? x[k].map((v, i) => (v + y[k][i]) / 2) : (x[k] + y[k]) / 2;
  return o;
}
function dist2(P, i, j) { const dx = P[i * 3] - P[j * 3], dy = P[i * 3 + 1] - P[j * 3 + 1], dz = P[i * 3 + 2] - P[j * 3 + 2]; return dx * dx + dy * dy + dz * dz; }

export function vertexNormals(P, tri) {
  const N = new Float64Array(P.length);
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t] * 3, b = tri[t + 1] * 3, c = tri[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; // area-weighted
    for (const i of [a, b, c]) { N[i] += nx; N[i + 1] += ny; N[i + 2] += nz; }
  }
  for (let i = 0; i < N.length; i += 3) { const L = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= L; N[i + 1] /= L; N[i + 2] /= L; }
  return N;
}
function faceNormal(P, a, b, c) {
  a *= 3; b *= 3; c *= 3;
  const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
  const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const L = Math.hypot(nx, ny, nz) || 1;
  return [nx / L, ny / L, nz / L, L / 2];
}

/* --------------------------------------------------- the two arms */
/* Prepare once per (state, edge): weld, assign B's mid-surface attribute to
   every original vertex, subdivide. Both arms then displace the SAME mesh, so
   any difference between them is the arm and never the lattice. */
export function prepare(soup, edgeMm, { split = 'rows', pairs = true } = {}) {
  const base = weld(soup);
  const nV = base.P.length / 3;
  /* per original vertex: the mid-surface sample of the instance it belongs to */
  const midAttr = new Array(nV).fill(null);
  const triOfInst = new Int32Array(soup.triCount).fill(-1);
  soup.instances.forEach((inst, k) => { for (let t = inst.from; t < inst.to; t++) triOfInst[t] = k; });
  const vInst = new Int32Array(nV).fill(-1);
  for (let t = 0; t < base.tri.length / 3; t++) {
    const k = triOfInst[base.src[t]]; if (k < 0) continue;
    for (let j = 0; j < 3; j++) vInst[base.tri[t * 3 + j]] = k;
  }
  const hashes = soup.instances.map((inst) => sampleHash(inst.samples));
  for (let v = 0; v < nV; v++) {
    const k = vInst[v]; if (k < 0) continue;
    const p = [base.P[v * 3], base.P[v * 3 + 1], base.P[v * 3 + 2]];
    const s = nearestSample(hashes[k], p, 4.0);
    if (!s) continue;
    const n = s.n;
    /* the vertex projected onto its sheet's mid-surface (tangent plane of the
       nearest sample): top and bottom skins land on the same point (the
       discovery's emboss sampled the field there; outward relief reads the
       sheet normal off it) */
    const d = (p[0] - s.m[0]) * n[0] + (p[1] - s.m[1]) * n[1] + (p[2] - s.m[2]) * n[2];
    midAttr[v] = { m: [p[0] - d * n[0], p[1] - d * n[1], p[2] - d * n[2]], n: [n[0], n[1], n[2]], foot: s.foot };
  }
  /* pairs: false cuts every triangle alone — the T1 intermediate, kept so §11's 119-fold figure reproduces */
  const sub = subdivide(base, edgeMm, [midAttr], { split, canPair: pairs ? pairPredicate(soup) : () => false });
  const mid = sub.attrs[0];
  for (const a of mid) if (a) { const L = Math.hypot(a.n[0], a.n[1], a.n[2]) || 1; a.n[0] /= L; a.n[1] /= L; a.n[2] /= L; }
  const triOrgan = new Int8Array(sub.tri.length / 3), triFeat = new Int8Array(sub.tri.length / 3);
  for (let t = 0; t < triOrgan.length; t++) { triOrgan[t] = soup.organIx[sub.src[t]]; triFeat[t] = soup.featIx[sub.src[t]]; }
  const prep = { P: sub.P, tri: sub.tri, src: sub.src, mid, triOrgan, triFeat, edgeMm, split, baseTris: base.tri.length / 3 };
  prep.N = vertexNormals(prep.P, prep.tri);
  prep.vFeat = vertexFeature(prep);
  prep.shell = shells(prep);
  prep.crease = creaseVertices(prep, 50);
  return prep;
}
function sampleHash(samples) {
  const cell = 2.0, map = new Map();
  for (const s of samples) {
    const k = `${Math.floor(s.m[0] / cell)},${Math.floor(s.m[1] / cell)},${Math.floor(s.m[2] / cell)}`;
    (map.get(k) || map.set(k, []).get(k)).push(s);
  }
  return { cell, map };
}
function nearestSample(h, p, rMax) {
  const { cell, map } = h; const r = Math.ceil(rMax / cell);
  const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell), cz = Math.floor(p[2] / cell);
  let best = null, bd = rMax * rMax;
  for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
    const list = map.get(`${cx + dx},${cy + dy},${cz + dz}`); if (!list) continue;
    for (const s of list) { const d = (s.m[0] - p[0]) ** 2 + (s.m[1] - p[1]) ** 2 + (s.m[2] - p[2]) ** 2; if (d < bd) { bd = d; best = s; } }
  }
  return best;
}
/* a vertex's feature: the one that "matters most" among its facets — a rim or
   hole bead outranks a skin, so a skin vertex on the bead's seam counts as
   the bead's */
const FEAT_RANK = { holeRim: 6, cellMargin: 5, bead: 4, rod: 3, stem: 2, hub: 2, cellSkin: 1, skin: 1, other: 0 };
function vertexFeature(prep) {
  const nV = prep.P.length / 3, out = new Int8Array(nV).fill(FEATURES.indexOf('other')), org = new Int8Array(nV).fill(ORGANS.indexOf('other'));
  const rank = new Int8Array(nV).fill(-1);
  for (let t = 0; t < prep.tri.length / 3; t++) {
    const f = prep.triFeat[t], r = FEAT_RANK[FEATURES[f]];
    for (let j = 0; j < 3; j++) { const v = prep.tri[t * 3 + j]; if (r > rank[v]) { rank[v] = r; out[v] = f; org[v] = prep.triOrgan[t]; } }
  }
  prep.vOrgan = org;
  return out;
}
function shells(prep) {
  const nV = prep.P.length / 3, par = new Int32Array(nV); for (let i = 0; i < nV; i++) par[i] = i;
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < prep.tri.length; t += 3) { const a = find(prep.tri[t]), b = find(prep.tri[t + 1]), c = find(prep.tri[t + 2]); par[b] = a; par[find(c)] = a; }
  const out = new Int32Array(nV); for (let i = 0; i < nV; i++) out[i] = find(i);
  return out;
}
/* a crease vertex: two of its facets disagree by more than `deg` */
function creaseVertices(prep, deg) {
  const nV = prep.P.length / 3, cos = Math.cos(deg * Math.PI / 180);
  const first = new Array(nV).fill(null), crease = new Uint8Array(nV);
  for (let t = 0; t < prep.tri.length / 3; t++) {
    const [nx, ny, nz] = faceNormal(prep.P, prep.tri[t * 3], prep.tri[t * 3 + 1], prep.tri[t * 3 + 2]);
    for (let j = 0; j < 3; j++) {
      const v = prep.tri[t * 3 + j];
      if (!first[v]) { first[v] = [[nx, ny, nz]]; continue; }
      if (crease[v]) continue;
      for (const q of first[v]) if (q[0] * nx + q[1] * ny + q[2] * nz < cos) { crease[v] = 1; break; }
      if (!crease[v] && first[v].length < 6) first[v].push([nx, ny, nz]);
    }
  }
  return crease;
}
/* geodesic distance (along edges) from a seed set, truncated at rMax */
function edgeDistance(prep, seeds, rMax) {
  const nV = prep.P.length / 3, adj = prep.adj || (prep.adj = adjacency(prep));
  const d = new Float64Array(nV).fill(Infinity);
  const heap = [];
  const pushH = (v, dv) => { heap.push([dv, v]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const popH = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  for (let v = 0; v < nV; v++) if (seeds[v]) { d[v] = 0; pushH(v, 0); }
  while (heap.length) {
    const [dv, v] = popH(); if (dv > d[v] || dv > rMax) continue;
    for (const w of adj[v]) { const nd = dv + Math.sqrt(dist2(prep.P, v, w)); if (nd < d[w] && nd <= rMax) { d[w] = nd; pushH(w, nd); } }
  }
  return d;
}
function adjacency(prep) {
  const nV = prep.P.length / 3, adj = Array.from({ length: nV }, () => []);
  for (let t = 0; t < prep.tri.length; t += 3) for (let j = 0; j < 3; j++) { const a = prep.tri[t + j], b = prep.tri[t + (j + 1) % 3]; if (!adj[a].includes(b)) adj[a].push(b); if (!adj[b].includes(a)) adj[b].push(a); }
  return adj;
}

/* THE DISPLACEMENT. Returns new positions (Float64Array) and the per-vertex
   displacement along its normal, for both arms.
   opts: { type, lambda, heightMm, mode ('outward', the only ruled mode), seed,
           // B only:
           maskBeads, maskHoleRims, maskFeet, maskCreases, fadeMm } */
export function displace(prep, arm, opts) {
  const f = reliefField(opts.type, opts.lambda, opts.seed ?? 7);
  const H = opts.heightMm;
  const nV = prep.P.length / 3;
  const out = new Float64Array(prep.P);
  const amount = new Float64Array(nV);
  let mask = null;
  if (arm === 'B') {
    const seeds = new Uint8Array(nV);
    const fb = FEATURES.indexOf('bead'), fh = FEATURES.indexOf('holeRim'), fm = FEATURES.indexOf('cellMargin');
    for (let v = 0; v < nV; v++) {
      const ft = prep.vFeat[v];
      if (opts.maskBeads && (ft === fb || ft === fm)) seeds[v] = 1;
      if (opts.maskHoleRims && ft === fh) seeds[v] = 1;
      if (opts.maskFeet && prep.mid[v] && prep.mid[v].foot) seeds[v] = 1;
      if (opts.maskCreases && prep.crease[v]) seeds[v] = 1;
    }
    const R = opts.fadeMm ?? 0.6;
    const d = edgeDistance(prep, seeds, R);
    mask = new Float64Array(nV);
    for (let v = 0; v < nV; v++) { const x = Math.min(1, d[v] / R); mask[v] = x * x * (3 - 2 * x); }
  }
  for (let v = 0; v < nV; v++) {
    const p = [prep.P[v * 3], prep.P[v * 3 + 1], prep.P[v * 3 + 2]];
    let dir = [prep.N[v * 3], prep.N[v * 3 + 1], prep.N[v * 3 + 2]];
    let s;
    if (arm === 'A') {
      s = H * signedRelief(opts.mode, f(p));
    } else {
      const m = prep.mid[v];
      if (m && (prep.vFeat[v] === FEATURES.indexOf('skin') || prep.vFeat[v] === FEATURES.indexOf('cellSkin'))) {
        /* the analytic sheet normal, signed to this skin's outward side */
        const sg = Math.sign(dir[0] * m.n[0] + dir[1] * m.n[1] + dir[2] * m.n[2]) || 1;
        dir = [sg * m.n[0], sg * m.n[1], sg * m.n[2]];
      }
      s = H * signedRelief(opts.mode, f(p)) * mask[v];
    }
    amount[v] = s;
    out[v * 3] += s * dir[0]; out[v * 3 + 1] += s * dir[1]; out[v * 3 + 2] += s * dir[2];
  }
  return { P: out, amount };
}

/* ------------------------------------------------------- measurement */
/* A uniform grid over triangles for ray queries. */
export function triGrid(P, tri, cell = 0.75) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[i + k]); hi[k] = Math.max(hi[k], P[i + k]); }
  const dims = [0, 1, 2].map((k) => Math.max(1, Math.ceil((hi[k] - lo[k]) / cell) + 1));
  const cells = new Map();
  for (let t = 0; t < tri.length / 3; t++) {
    const a = tri[t * 3] * 3, b = tri[t * 3 + 1] * 3, c = tri[t * 3 + 2] * 3;
    const mn = [0, 1, 2].map((k) => Math.floor((Math.min(P[a + k], P[b + k], P[c + k]) - lo[k]) / cell));
    const mx = [0, 1, 2].map((k) => Math.floor((Math.max(P[a + k], P[b + k], P[c + k]) - lo[k]) / cell));
    for (let x = mn[0]; x <= mx[0]; x++) for (let y = mn[1]; y <= mx[1]; y++) for (let z = mn[2]; z <= mx[2]; z++) {
      const k = (x * dims[1] + y) * dims[2] + z; let l = cells.get(k); if (!l) cells.set(k, l = []); l.push(t);
    }
  }
  return { P, tri, lo, cell, dims, cells };
}
/* nearest hit along a ray within tMax, triangles filtered by `accept(t)` */
export function rayHit(g, o, d, tMax, accept) {
  const { P, tri, lo, cell, dims, cells } = g;
  let best = tMax, stamp = new Set();
  const steps = Math.ceil(tMax / (cell * 0.5)) + 1;
  for (let s = 0; s <= steps; s++) {
    const tt = Math.min(tMax, s * cell * 0.5);
    const cx = Math.floor((o[0] + d[0] * tt - lo[0]) / cell), cy = Math.floor((o[1] + d[1] * tt - lo[1]) / cell), cz = Math.floor((o[2] + d[2] * tt - lo[2]) / cell);
    if (tt > best + cell) break;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const x = cx + dx, y = cy + dy, z = cz + dz;
      if (x < 0 || y < 0 || z < 0 || x >= dims[0] || y >= dims[1] || z >= dims[2]) continue;
      const l = cells.get((x * dims[1] + y) * dims[2] + z); if (!l) continue;
      for (const t of l) {
        if (stamp.has(t)) continue; stamp.add(t);
        if (!accept(t)) continue;
        const h = rayTri(P, tri[t * 3], tri[t * 3 + 1], tri[t * 3 + 2], o, d);
        if (h > 1e-5 && h < best) best = h;
      }
    }
  }
  return best;
}
function rayTri(P, ia, ib, ic, o, d) {
  const a = ia * 3, b = ib * 3, c = ic * 3;
  const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
  const p = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
  const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
  if (Math.abs(det) < 1e-14) return Infinity;
  const inv = 1 / det, tv = [o[0] - P[a], o[1] - P[a + 1], o[2] - P[a + 2]];
  const u = (tv[0] * p[0] + tv[1] * p[1] + tv[2] * p[2]) * inv; if (u < -1e-9 || u > 1 + 1e-9) return Infinity;
  const q = [tv[1] * e1[2] - tv[2] * e1[1], tv[2] * e1[0] - tv[0] * e1[2], tv[0] * e1[1] - tv[1] * e1[0]];
  const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) * inv; if (v < -1e-9 || u + v > 1 + 1e-9) return Infinity;
  return (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv;
}
/* WALL THICKNESS along the inward normal, against the vertex's OWN shell, and
   the OUTWARD GAP to anything at all — the two quantities relief can move
   below a floor. Sampled at `every`-th vertex. Returns per-sampled-vertex
   arrays. TMAX caps both: a value of TMAX means "at least TMAX". */
export function wallAndGap(prep, P, { every = 1, tMax = 3, onlyFeatures = null, normals = prep.N } = {}) {
  /* THE RAY IS CAST ALONG THE UNDISPLACED NORMAL from the displaced point.
     The relief tilts the displaced surface's own normal by its slope, and a
     ray tilted across a 1.2 mm sheet reads a different chord of it: measured
     first that way, OUTWARD-only relief — which cannot thin anything — read
     0.909 mm of thinning. Casting along the shipped surface's normal from both
     the old and the new point makes before/after one ray direction, so what
     moves is the displacement and nothing else. */
  const N = normals;
  const g = triGrid(P, prep.tri);
  const triShell = new Int32Array(prep.tri.length / 3);
  for (let t = 0; t < triShell.length; t++) triShell[t] = prep.shell[prep.tri[t * 3]];
  const inc = new Map(); // vertex -> its own facets (excluded from its own rays)
  for (let t = 0; t < prep.tri.length / 3; t++) for (let j = 0; j < 3; j++) { const v = prep.tri[t * 3 + j]; let l = inc.get(v); if (!l) inc.set(v, l = []); l.push(t); }
  const idx = [], wall = [], gap = [];
  const nV = P.length / 3;
  for (let v = 0; v < nV; v += every) {
    if (onlyFeatures && !onlyFeatures.has(prep.vFeat[v])) continue;
    const own = new Set(inc.get(v) || []);
    const o = [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]], n = [N[v * 3], N[v * 3 + 1], N[v * 3 + 2]];
    const sh = prep.shell[v];
    const wIn = rayHit(g, o, [-n[0], -n[1], -n[2]], tMax, (t) => !own.has(t) && triShell[t] === sh);
    const gOut = rayHit(g, o, n, tMax, (t) => !own.has(t));
    idx.push(v); wall.push(wIn); gap.push(gOut);
  }
  return { idx, wall, gap };
}

/* ------------------------------------------------------ export helpers */
export function toSoup(P, tri) {
  const out = new Float32Array(tri.length * 3);
  for (let i = 0; i < tri.length; i++) { const v = tri[i] * 3; out[i * 3] = P[v]; out[i * 3 + 1] = P[v + 1]; out[i * 3 + 2] = P[v + 2]; }
  return out;
}
/* boundary / non-manifold census on the displaced mesh (float32 keys, the
   STL gates' own view) */
export function edgeCensus(P, tri) {
  const key = new Map(); const vid = (v) => { const k = `${Math.fround(P[v * 3])},${Math.fround(P[v * 3 + 1])},${Math.fround(P[v * 3 + 2])}`; let i = key.get(k); if (i === undefined) key.set(k, i = key.size); return i; };
  const ids = tri.map(vid);
  const e = new Map();
  for (let t = 0; t < ids.length; t += 3) for (let j = 0; j < 3; j++) { const a = ids[t + j], b = ids[t + (j + 1) % 3]; const k = a < b ? a * 1e7 + b : b * 1e7 + a; e.set(k, (e.get(k) || 0) + 1); }
  let boundary = 0, nonManifold = 0; for (const c of e.values()) { if (c === 1) boundary++; else if (c > 2) nonManifold++; }
  return { boundary, nonManifold };
}
export function surfaceArea(P, tri) {
  let A = 0; for (let t = 0; t < tri.length; t += 3) A += faceNormal(P, tri[t], tri[t + 1], tri[t + 2])[3];
  return A;
}

/* ------------------------------------------------------ demo states */
/* The states the page and the tools offer. Each is DEFAULTS plus a written-
   down delta, so the page can never drift from the generator's defaults. */
export const DEMO_STATES = Object.freeze({
  default: {},
  whole: { stemLength: 60, leafLength: 30, sepalCount: 5, stamenCount: 12, gynoecium: 'STYLE' },
  infill: { petalInfill: 'VORONOI' },
  tube: { tubeLayer1: 0 },
});

/* ------------------------------------------------- triangle quality */
/* Per triangle: the smallest interior angle (degrees) and the aspect
   Lmax^2 / (2 area) — the longest edge over the altitude onto it (2/sqrt(3)
   = 1.155 for an equilateral, unbounded for a sliver). Degenerate (zero-area)
   triangles read minAngle 0 and aspect Infinity. */
export function triangleQuality(P, tri) {
  const n = tri.length / 3, minAngle = new Float64Array(n), aspect = new Float64Array(n);
  for (let t = 0; t < n; t++) {
    const a = tri[t * 3], b = tri[t * 3 + 1], c = tri[t * 3 + 2];
    const la = dist2(P, b, c), lb = dist2(P, c, a), lc = dist2(P, a, b);
    const area = faceNormal(P, a, b, c)[3];
    const Lmax = Math.max(la, lb, lc);
    if (!(area > 0)) { minAngle[t] = 0; aspect[t] = Infinity; continue; }
    /* the smallest angle is opposite the shortest edge; sin = 2A / (product of the two others) */
    const sorted = [la, lb, lc].sort((x, y) => x - y);
    const sinMin = (2 * area) / Math.sqrt(sorted[1] * sorted[2]);
    minAngle[t] = Math.asin(Math.min(1, sinMin)) * 180 / Math.PI;
    aspect[t] = Lmax / (2 * area);
  }
  return { minAngle, aspect };
}
