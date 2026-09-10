/* ===================================================================
   bloom-self-intersection.mjs — DOES THE SOLID PASS THROUGH ITSELF?
   (session 35, Eva's ruling)

   WHY THIS EXISTS. Watertight means no open boundary edges. Connected means
   one region. NEITHER CATCHES A SOLID THAT PASSES THROUGH ITSELF, and that is
   the geometric condition that actually breaks a print: a slicer handed a
   self-intersecting shell has no well-defined inside, so it produces garbage
   or refuses the file. There was no such test anywhere in the gates. V5 — a
   minimum distance between the two offset skins — has been standing in for
   one, and this instrument exists to find out whether that proxy is honest.

   WHAT IT MEASURES, and the scoping decision that is the whole design.
   The export contract is "every primitive is an individually closed solid" and
   "OVERLAPPING CLOSED SHELLS ARE FINE — the slicer unions them." The bloom
   relies on that: the cleft's lobe panels reach PANEL_OVERLAP_ROWS down into
   the base panel, every stamen and style is rooted THROUGH the hub slab, and
   every petal foot sits inside the hub. A census over the whole mesh would
   therefore report thousands of intersecting pairs BY DESIGN and mean nothing.

   So the census runs WITHIN each closed shell, and cross-shell hits are
   counted separately and reported as by-design rather than as defects. That is
   the question the export contract actually poses, and it is the same question
   a folded petal poses: does THIS sheet pass through ITSELF?

   THE ADJACENCY EXCLUSION IS PER INTERSECTION POINT, NOT PER PAIR, which is
   what makes it provably unable to hide a real intersection.
   Two triangles that share a vertex meet at that vertex; two that share an edge
   meet along it. Those meetings are the topology, not a defect. A blanket
   "skip pairs that share a vertex" would also skip a pair that shares a vertex
   AND crosses somewhere else — a real fold, silently dropped. So instead:
     - every intersection POINT is computed, and
     - a point is discarded only if it IS the shared feature: equal to a shared
       vertex position, or lying on the segment between two shared vertices.
   Anything else survives and is reported. The discarded set is exactly the
   shared feature and nothing more, so no real intersection can hide in it.
   `--prove-exclusion` demonstrates this on a written-down pair that shares one
   vertex and also crosses elsewhere: the shared vertex is discarded and the
   crossing is still reported.

   THE TEST ITSELF is six segment-triangle tests per pair (each edge of A
   against B, each edge of B against A) plus a coplanar-overlap test. Any
   proper intersection of two triangles contains a point where an edge of one
   passes through the other, or the two are coplanar and overlap — so the six
   tests are complete for the non-coplanar case and the coplanar arm covers the
   rest.

   COST is bounded by a uniform grid over triangle AABBs: a pair is only tested
   if their boxes share a cell, which cannot miss an intersecting pair because
   intersecting triangles have overlapping boxes. Exact, not approximate.

   TWO DEFECTS THE FIRST FULL-MATRIX RUN FOUND (session 36), both in this
   file and neither in the geometry:
     - the pair-dedup Set OVERFLOWED (2^24 entries) on the ALL MAX row's
       636,096 triangles before returning anything — replaced by the
       canonical-cell rule, which keeps no record at all (see census());
     - the count depended on the WINDING: the segment-triangle test is not
       symmetric at the epsilon, so reversing every petal moved 40 of 624
       rows by a few pairs and flipped one verdict (4 -> 0). The corners are
       now read in coordinate order, so a surface reads the same whatever
       its winding — verified identical on both trees over 113 rows.
   The calibration did not move under either: flat 0, roll-330 18,776, curl
   360 1,008, all-form 11,056; the cup rows moved by single digits (cup 1.20
   x tip 1.70 750 -> 752, x tip 2.45 771 -> 777) and those are the figures
   the X family's xfail list carries.

   IT IS WIRED (session 36): O1/O2 (orientation) in both STL gates, X0-X2
   (this census, on the builder's doubles that X0 proves are the STL's own)
   in the export gate, with SELF_INTERSECTION_XFAIL in bloom-harness.mjs
   measured on main at ead8624. The float32 STL itself is NOT a valid input
   here: its ~2e-6 mm quantisation manufactures span-0 touches (196 on the
   flat default, all single points, none within 0.5 mm of a real site).

   RUN:  node tools/bloom-self-intersection.mjs [--states] [--negative-control]
         [--prove-exclusion] [--orientation] [--stl <file> --set k=v,...]
   =================================================================== */
import fs from 'node:fs';
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);

/* Segment (O -> O+D) against triangle ABC. Returns the hit point or null.
   Möller-Trumbore. The barycentric and parametric windows are opened by a
   RELATIVE epsilon so a hit exactly on a shared edge is FOUND rather than
   missed — it is then discarded by the shared-feature rule, which is the one
   place an exclusion is allowed to act. */
const BEPS = 1e-9;
function segTri(O, D, A, B, C) {
  const e1 = sub(B, A), e2 = sub(C, A);
  const p = cross(D, e2);
  const det = dot(e1, p);
  /* THE PARALLEL TEST IS RELATIVE, AND AN ABSOLUTE ONE HERE IS A REAL DEFECT
     RATHER THAN A ROUNDING NICETY. `det` is a triple product with the
     dimensions of a VOLUME, so on a millimetre mesh its natural scale is
     |e1|*|p|; an exactly-parallel edge computes to ~1e-17 rather than 0, and a
     guard of `< 1e-18` lets it through with `1/det` around 1e17, which
     manufactures barycentric coordinates that land inside [0,1] by accident.
     Measured on the FLAT shipping default, where the answer must be zero: the
     absolute guard reported 27,356 within-shell intersections, every one of
     them an edge parallel to the other triangle's plane reporting a hit at its
     own start vertex. The relative guard reports 0. */
  if (Math.abs(det) <= 1e-12 * len(e1) * len(p)) return null;   // parallel; the coplanar arm covers it
  const inv = 1 / det;
  const tv = sub(O, A);
  const u = dot(tv, p) * inv;
  if (u < -BEPS || u > 1 + BEPS) return null;
  const q = cross(tv, e1);
  const v = dot(D, q) * inv;
  if (v < -BEPS || u + v > 1 + BEPS) return null;
  const t = dot(e2, q) * inv;
  if (t < -BEPS || t > 1 + BEPS) return null;
  const P = [O[0] + t * D[0], O[1] + t * D[1], O[2] + t * D[2]];
  /* VERIFY THE POINT RATHER THAN TRUST THE SOLVE. Where the edge is NEARLY
     parallel to the plane the barycentric solve is ill-conditioned and returns
     coordinates that disagree with each other: measured on the flat default,
     a pair reporting `u=1, v=0, t=0` placed the hit at the edge's start AND at
     the triangle's second corner, 0.63 mm apart, on an edge whose direction
     cosine against the plane normal was 8.5e-6. No choice of epsilon separates
     that from a real shallow crossing — but recomputing the point's own
     membership does, and it costs nothing on a well-conditioned hit. This is
     the second epsilon in this function that had to stop being a threshold and
     become a measurement. */
  return onSegment(P, O, D) && inTriangle(P, A, B, C) ? P : null;
}

const GEOM_EPS = 1e-9;      /* mm — the mesh's coordinates are exact to ~1e-15 mm */
function onSegment(P, O, D) {
  const L2 = dot(D, D);
  if (!(L2 > 0)) return false;
  const s = dot(sub(P, O), D) / L2;
  if (s < -GEOM_EPS || s > 1 + GEOM_EPS) return false;
  const f = [O[0] + s * D[0], O[1] + s * D[1], O[2] + s * D[2]];
  return Math.hypot(P[0] - f[0], P[1] - f[1], P[2] - f[2]) <= GEOM_EPS;
}
/* In-plane and inside, by AREAS: for a coplanar point the three sub-triangle
   areas sum to the whole iff the point is inside, and exceed it outside. Scale
   free, and it needs no projection axis. */
function inTriangle(P, A, B, C) {
  const n = cross(sub(B, A), sub(C, A));
  const nl = len(n);
  if (!(nl > 0)) return false;
  if (Math.abs(dot(sub(P, A), [n[0] / nl, n[1] / nl, n[2] / nl])) > GEOM_EPS) return false;
  const a0 = len(cross(sub(B, P), sub(C, P)));
  const a1 = len(cross(sub(C, P), sub(A, P)));
  const a2 = len(cross(sub(A, P), sub(B, P)));
  return (a0 + a1 + a2) / nl <= 1 + 1e-9;
}

/* THE SHARED-FEATURE RULE. `shared` is the list of positions the two triangles
   have in common (by exact index after welding). A point is the shared feature
   iff it equals one of them, or lies on the segment joining two of them. */
const PT_EPS = 1e-9;
function isSharedFeature(P, shared) {
  for (const S of shared) if (Math.hypot(P[0] - S[0], P[1] - S[1], P[2] - S[2]) <= PT_EPS) return true;
  for (let a = 0; a < shared.length; a++) for (let b = a + 1; b < shared.length; b++) {
    const A = shared[a], B = shared[b];
    const AB = sub(B, A), AP = sub(P, A);
    const L2 = dot(AB, AB);
    if (!(L2 > 0)) continue;
    const s = dot(AP, AB) / L2;
    if (s < -PT_EPS || s > 1 + PT_EPS) continue;
    const foot = [A[0] + s * AB[0], A[1] + s * AB[1], A[2] + s * AB[2]];
    if (Math.hypot(P[0] - foot[0], P[1] - foot[1], P[2] - foot[2]) <= PT_EPS) return true;
  }
  return false;
}

/* Coplanar overlap: the two triangles lie in one plane and share interior
   area. Projected to the plane's dominant axes and tested by the separating
   axis theorem, with a shared edge or vertex NOT counting as overlap. */
function coplanarOverlap(T1, T2) {
  const n = cross(sub(T1[1], T1[0]), sub(T1[2], T1[0]));
  const nl = len(n);
  if (!(nl > 0)) return false;
  const N = [n[0] / nl, n[1] / nl, n[2] / nl];
  for (const P of T2) if (Math.abs(dot(sub(P, T1[0]), N)) > 1e-9) return false;
  const ax = Math.abs(N[0]) > Math.abs(N[1])
    ? (Math.abs(N[0]) > Math.abs(N[2]) ? 0 : 2)
    : (Math.abs(N[1]) > Math.abs(N[2]) ? 1 : 2);
  const i0 = (ax + 1) % 3, i1 = (ax + 2) % 3;
  const p = (T) => T.map((P) => [P[i0], P[i1]]);
  const A = p(T1), B = p(T2);
  const sep = (P, Q) => {
    for (let i = 0; i < 3; i++) {
      const e = [P[(i + 1) % 3][0] - P[i][0], P[(i + 1) % 3][1] - P[i][1]];
      const ax2 = [-e[1], e[0]];
      let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
      for (const v of P) { const d = v[0] * ax2[0] + v[1] * ax2[1]; aMin = Math.min(aMin, d); aMax = Math.max(aMax, d); }
      for (const v of Q) { const d = v[0] * ax2[0] + v[1] * ax2[1]; bMin = Math.min(bMin, d); bMax = Math.max(bMax, d); }
      if (aMax <= bMin + 1e-12 || bMax <= aMin + 1e-12) return true;
    }
    return false;
  };
  return !sep(A, B) && !sep(B, A);
}

/* ------------------------------------------------------------------ census */
export function census(positions, { verbose = false, collect = false } = {}) {
  const nTri = positions.length / 9;
  /* WELD BY EXACT POSITION. The builder emits shared corners from the same
     computation, so exact equality is the right key — a distance-based weld
     would be a tolerance where none is needed. */
  const key = new Map(); const vidx = new Int32Array(nTri * 3); const verts = [];
  for (let t = 0; t < nTri; t++) for (let c = 0; c < 3; c++) {
    const o = t * 9 + c * 3;
    const k = `${positions[o]},${positions[o + 1]},${positions[o + 2]}`;
    let id = key.get(k);
    if (id === undefined) { id = verts.length; verts.push([positions[o], positions[o + 1], positions[o + 2]]); key.set(k, id); }
    vidx[t * 3 + c] = id;
  }
  /* SHELLS: connected components over shared VERTICES (a shared vertex is
     enough to make two triangles one primitive for this purpose). */
  const parent = new Int32Array(nTri).map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[b] = a; };
  const byVert = new Map();
  for (let t = 0; t < nTri; t++) for (let c = 0; c < 3; c++) {
    const v = vidx[t * 3 + c];
    if (byVert.has(v)) uni(byVert.get(v), t); else byVert.set(v, t);
  }
  const shell = new Int32Array(nTri);
  for (let t = 0; t < nTri; t++) shell[t] = find(t);
  const shells = new Set(); for (let t = 0; t < nTri; t++) shells.add(shell[t]);

  /* AABBs and a uniform grid. A pair is tested iff their boxes share a cell,
     which cannot miss an intersecting pair: intersecting triangles have
     overlapping boxes, so they share at least one cell. */
  const lo = new Float64Array(nTri * 3), hi = new Float64Array(nTri * 3);
  let gmin = [Infinity, Infinity, Infinity], gmax = [-Infinity, -Infinity, -Infinity], edgeSum = 0;
  for (let t = 0; t < nTri; t++) for (let a = 0; a < 3; a++) {
    let mn = Infinity, mx = -Infinity;
    for (let c = 0; c < 3; c++) { const v = positions[t * 9 + c * 3 + a]; mn = Math.min(mn, v); mx = Math.max(mx, v); }
    lo[t * 3 + a] = mn; hi[t * 3 + a] = mx;
    gmin[a] = Math.min(gmin[a], mn); gmax[a] = Math.max(gmax[a], mx);
    edgeSum += mx - mn;
  }
  const cell = Math.max((edgeSum / (nTri * 3)) * 2, 1e-6);
  const gi = (x, a) => Math.floor((x - gmin[a]) / cell);
  const grid = new Map();
  for (let t = 0; t < nTri; t++) {
    for (let x = gi(lo[t * 3], 0); x <= gi(hi[t * 3], 0); x++)
      for (let y = gi(lo[t * 3 + 1], 1); y <= gi(hi[t * 3 + 1], 1); y++)
        for (let z = gi(lo[t * 3 + 2], 2); z <= gi(hi[t * 3 + 2], 2); z++) {
          const k = `${x},${y},${z}`;
          let L = grid.get(k); if (!L) { L = []; grid.set(k, L); } L.push(t);
        }
  }
  /* THE TRIANGLE IS READ AS A VERTEX SET, IN A CANONICAL ORDER (session 36).
     The segment-triangle test is not symmetric at the epsilon: an edge run
     P -> Q and the same edge run Q -> P can disagree on a grazing hit, so a
     census that read the emitted corner order depended on the WINDING —
     measured when the petal winding was reversed: 40 of 624 matrix rows
     moved by a few pairs and one row's verdict flipped (4 -> 0). A surface
     does not change when its winding does, so the corners are ordered by
     welded vertex index before any test, and the count is winding-invariant
     by construction. The recalibrated figures are in the CLI's own banner. */
  const tri = (t) => {
    /* by COORDINATE, lexicographically — not by welded index, which is a
       first-occurrence number and therefore itself a function of stream
       order (measured: sorting by index left 29 of 113 rows differing
       between the two windings). */
    const cs = [0, 1, 2].map((k) => [positions[t*9+k*3], positions[t*9+k*3+1], positions[t*9+k*3+2]]);
    return cs.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  };
  let within = 0, cross = 0, worst = 0, worstAt = null, worstPair = null, tested = 0;
  const sites = [];
  /* A PAIR IS TESTED IN EXACTLY ONE CELL — the cell holding the minimum
     corner of the two boxes' OVERLAP — so no record of tested pairs is kept.
     The first version kept a Set of pair keys and it OVERFLOWED (a JS Set
     holds at most 2^24 entries) on the matrix's ALL MAX row, 636,096
     triangles, before any answer came back; session 36 found it the first
     time the census was run over the whole matrix. The overlap's min corner
     lies in a cell both boxes cover, so every overlapping pair is still
     tested once, and a pair whose boxes do not overlap is skipped here as
     before. */
  for (const [ck, L] of grid) {
    const [cx, cy, cz] = ck.split(',').map(Number);
    for (let a = 0; a < L.length; a++) for (let b = a + 1; b < L.length; b++) {
      const i = L[a], j = L[b];
      /* boxes must actually overlap, and this must be the overlap's own cell */
      let sep = false;
      for (let x = 0; x < 3; x++) if (hi[i*3+x] < lo[j*3+x] || hi[j*3+x] < lo[i*3+x]) { sep = true; break; }
      if (sep) continue;
      if (gi(Math.max(lo[i*3], lo[j*3]), 0) !== cx || gi(Math.max(lo[i*3+1], lo[j*3+1]), 1) !== cy || gi(Math.max(lo[i*3+2], lo[j*3+2]), 2) !== cz) continue;
      tested++;
      const T1 = tri(i), T2 = tri(j);
      const shared = [];
      for (let c = 0; c < 3; c++) for (let d = 0; d < 3; d++)
        if (vidx[i*3+c] === vidx[j*3+d]) shared.push([positions[i*9+c*3], positions[i*9+c*3+1], positions[i*9+c*3+2]]);
      const pts = [];
      for (let c = 0; c < 3; c++) {
        const P = segTri(T1[c], sub(T1[(c+1)%3], T1[c]), T2[0], T2[1], T2[2]);
        if (P) pts.push(P);
        const Q = segTri(T2[c], sub(T2[(c+1)%3], T2[c]), T1[0], T1[1], T1[2]);
        if (Q) pts.push(Q);
      }
      let real = pts.filter((P) => !isSharedFeature(P, shared));
      let hit = real.length > 0;
      /* the coplanar arm — only where no shared feature could explain it */
      if (!hit && shared.length < 2 && coplanarOverlap(T1, T2)) { hit = true; real = [T1[0]]; }
      if (!hit) continue;
      if (shell[i] === shell[j]) {
        within++;
        /* depth: the longest span among surviving points, a mm figure */
        let span = 0, at = real[0];
        for (let m = 0; m < real.length; m++) for (let n2 = m + 1; n2 < real.length; n2++) {
          const d = Math.hypot(real[m][0]-real[n2][0], real[m][1]-real[n2][1], real[m][2]-real[n2][2]);
          if (d > span) { span = d; at = real[m]; }
        }
        if (span >= worst) { worst = span; worstAt = at; worstPair = [i, j]; }
        if (collect) sites.push({ at, span, pair: [i, j], shell: shell[i] });
      } else cross++;
    }
  }
  return { nTri, shells: shells.size, within, cross, worstSpanMm: worst, worstAt, worstPair,
           pairsTested: tested, cellMm: cell, sites };
}

/* ===================================================================
   ORIENTATION — is each closed shell wound OUTWARD?

   WHY IT MATTERS BEYOND TIDINESS. The export contract leans on a slicer
   UNIONING overlapping closed shells. A union handed a NEGATIVE-volume shell
   can treat it as a SUBTRACTION, so the petals would carve into the hub rather
   than joining it. And nothing else here can see it: watertight, connected,
   manifold, winding-consistent and degenerate-free ALL pass on an inside-out
   solid. Euler characteristic passes too.

   TWO INDEPENDENT METHODS, because one of them alone is a convention:
     - the DIVERGENCE THEOREM signed volume, (1/6) sum v0 . (v1 x v2), which is
       positive for an outward-wound closed shell;
     - a RAY-PARITY test fired from just outside each shell's largest facet
       along that facet's own normal: if the normal is outward the launch point
       is outside the shell and the ray crosses an EVEN number of faces.
   They are reported together and a disagreement is itself a failure — that is
   what stops the check from being a restatement of one convention.
   =================================================================== */
export function orientation(positions) {
  const nTri = positions.length / 9;
  const key = new Map(), vidx = new Int32Array(nTri * 3);
  for (let t = 0; t < nTri; t++) for (let c = 0; c < 3; c++) {
    const o = t * 9 + c * 3;
    const k = `${positions[o]},${positions[o + 1]},${positions[o + 2]}`;
    let id = key.get(k); if (id === undefined) { id = key.size; key.set(k, id); }
    vidx[t * 3 + c] = id;
  }
  const par = new Int32Array(nTri).map((_, i) => i);
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par[b] = a; };
  const bv = new Map();
  for (let t = 0; t < nTri; t++) for (let c = 0; c < 3; c++) {
    const v = vidx[t * 3 + c];
    if (bv.has(v)) uni(bv.get(v), t); else bv.set(v, t);
  }
  const groups = new Map();
  for (let t = 0; t < nTri; t++) { const r = find(t); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(t); }
  const tri = (t) => [[positions[t*9],positions[t*9+1],positions[t*9+2]],
                      [positions[t*9+3],positions[t*9+4],positions[t*9+5]],
                      [positions[t*9+6],positions[t*9+7],positions[t*9+8]]];
  const out = [];
  for (const ids of groups.values()) {
    let V = 0;
    for (const t of ids) { const [a, b, c] = tri(t);
      V += (a[0]*(b[1]*c[2]-b[2]*c[1]) + a[1]*(b[2]*c[0]-b[0]*c[2]) + a[2]*(b[0]*c[1]-b[1]*c[0])) / 6; }
    /* the ray-parity second opinion, from the largest facet */
    let best = ids[0], bA = -1;
    for (const t of ids) { const [a,b,c] = tri(t);
      const u = sub(b,a), v = sub(c,a); const A = len(cross(u,v)) / 2;
      if (A > bA) { bA = A; best = t; } }
    const [a,b,c] = tri(best);
    let N = cross(sub(b,a), sub(c,a)); const L = len(N); N = [N[0]/L, N[1]/L, N[2]/L];
    const ctr = [0,1,2].map((i) => (a[i]+b[i]+c[i])/3);
    const O = [0,1,2].map((i) => ctr[i] + N[i] * 1e-4);
    let hits = 0;
    for (const t of ids) { if (t === best) continue;
      const [A2,B2,C2] = tri(t);
      const e1 = sub(B2,A2), e2 = sub(C2,A2), p = cross(N, e2), det = dot(e1, p);
      if (Math.abs(det) <= 1e-12 * len(e1) * len(p)) continue;
      const inv = 1/det, tv = sub(O, A2);
      const uu = dot(tv,p)*inv; if (uu < 0 || uu > 1) continue;
      const q = cross(tv, e1); const vv = dot(N,q)*inv; if (vv < 0 || uu+vv > 1) continue;
      if (dot(e2,q)*inv > 1e-7) hits++;
    }
    out.push({ tris: ids.length, volumeMm3: V, rayCrossings: hits,
               outwardByVolume: V > 0, outwardByRay: hits % 2 === 0 });
  }
  out.sort((x, y) => y.tris - x.tris);
  return { shells: out.length, inward: out.filter((s) => !s.outwardByVolume).length,
           disagreements: out.filter((s) => s.outwardByVolume !== s.outwardByRay).length,
           totalVolumeMm3: out.reduce((a, s) => a + s.volumeMm3, 0), perShell: out };
}

/* --------------------------------------------------------------- the build */
export function meshFor(set, exportMode = true) {
  const acc = new G.MeshBuilder({ exportMode });
  G.buildBloomInto(acc, { ...DEFAULTS, ...set });
  return acc.positions;
}

/* ----------------------------------------------------------------- the CLI */
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const t0 = Date.now();

  if (argv.includes('--prove-exclusion')) {
    /* THE EXCLUSION CANNOT HIDE A REAL INTERSECTION, shown on a written-down
       pair: two triangles sharing exactly ONE vertex, arranged so they also
       cross elsewhere. The shared vertex is discarded; the crossing survives. */
    const A = [[0,0,0],[4,0,0],[0,4,0]];
    const B = [[0,0,0],[2,1,-2],[2,1,2]];       // shares the origin, and stabs A's interior
    const pos = new Float64Array([...A.flat(), ...B.flat()]);
    const r = census(pos);
    const okShared = (() => { /* the same pair with the crossing removed reads clean */
      const B2 = [[0,0,0],[6,-2,1],[6,-3,2]];
      const p2 = new Float64Array([...A.flat(), ...B2.flat()]);
      return census(p2).within;
    })();
    console.log('PROVE-EXCLUSION — two triangles sharing exactly one vertex:');
    console.log(`  crossing elsewhere : within-shell hits ${r.within} (must be 1)   span ${r.worstSpanMm.toFixed(4)} mm`);
    console.log(`  touching only at the shared vertex : ${okShared} (must be 0)`);
    const pass = r.within === 1 && okShared === 0;
    console.log(pass ? '  PASS — the shared vertex is discarded and a real crossing is not.'
                     : '  FAIL');
    process.exit(pass ? 0 : 1);
  }

  if (argv.includes('--orientation')) {
    /* CALIBRATION FIRST, on a shell whose answer is written down: a unit CUBE
       wound outward must read POSITIVE, and the SAME cube with every triangle
       reversed must read NEGATIVE. A check that cannot tell those apart is not
       measuring orientation. */
    const cube = (flip) => {
      const v = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
      const f = [[0,3,2],[0,2,1],[4,5,6],[4,6,7],[0,1,5],[0,5,4],
                 [1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]];
      const P = [];
      for (const t of f) { const o = flip ? [t[0],t[2],t[1]] : t;
        for (const i of o) P.push(...v[i]); }
      return new Float64Array(P);
    };
    const good = orientation(cube(false)), bad = orientation(cube(true));
    const okCal = good.perShell[0].volumeMm3 > 0 && bad.perShell[0].volumeMm3 < 0
      && good.disagreements === 0 && bad.disagreements === 0;
    console.log('CALIBRATION — a unit cube whose answer is written down:');
    console.log(`  wound outward : volume ${good.perShell[0].volumeMm3.toFixed(4)} (must be +1)  ray ${good.perShell[0].rayCrossings} (even)  -> ${good.perShell[0].outwardByVolume ? 'OUTWARD' : 'inward'}`);
    console.log(`  wound reversed: volume ${bad.perShell[0].volumeMm3.toFixed(4)} (must be -1)  ray ${bad.perShell[0].rayCrossings} (odd)   -> ${bad.perShell[0].outwardByVolume ? 'outward' : 'INWARD'}`);
    console.log(`  the two methods disagree on ${good.disagreements + bad.disagreements} shells (must be 0)`);
    console.log(`  ${okCal ? 'PASS' : 'FAIL'} — the check can tell an outward shell from a reversed one.\n`);
    if (!okCal) process.exit(1);

    console.log('THE BLOOM — per-shell orientation of the emitted EXPORT mesh:');
    console.log('  configuration                          shells   INWARD   disagree   total volume');
    let anyInward = false;
    for (const [label, set] of [
      ['the shipping default (8 petals x 1)', {}],
      ['7 petals x 4 layers', { petalCount: 7, layerCount: 4 }],
      ['cup 1.20 x tip 2.45', { petalCup: 1.2, petalTipShape: 2.45 }],
      ['40 petals CONTINUOUS', { petalArrangement: 'continuous', petalCount: 40 }],
    ]) {
      const r = orientation(meshFor(set));
      if (r.inward) anyInward = true;
      console.log(`  ${label.padEnd(38)} ${String(r.shells).padStart(6)}   ${String(r.inward).padStart(6)}   ${String(r.disagreements).padStart(8)}   ${r.totalVolumeMm3.toFixed(1).padStart(10)} mm^3`);
    }
    /* THE POSITIVE CONTROL THAT MUST FAIL: reverse every triangle of a real
       bloom export and require the verdict to move. */
    const P0 = meshFor({});
    const flipped = new Float64Array(P0.length);
    for (let t = 0; t < P0.length / 9; t++) {
      for (let k = 0; k < 3; k++) flipped[t*9+k] = P0[t*9+k];
      for (let k = 0; k < 3; k++) flipped[t*9+3+k] = P0[t*9+6+k];
      for (let k = 0; k < 3; k++) flipped[t*9+6+k] = P0[t*9+3+k];
    }
    const a = orientation(P0), b = orientation(flipped);
    console.log(`\n  POSITIVE CONTROL — every triangle of the shipping default reversed:`);
    console.log(`    as built  ${a.inward} of ${a.shells} shells inward, total ${a.totalVolumeMm3.toFixed(1)} mm^3`);
    console.log(`    reversed  ${b.inward} of ${b.shells} shells inward, total ${b.totalVolumeMm3.toFixed(1)} mm^3`);
    const moved = a.inward !== b.inward && Math.sign(a.totalVolumeMm3) !== Math.sign(b.totalVolumeMm3);
    console.log(`    ${moved ? 'PASS — the verdict moves, so the check is live.' : 'FAIL — reversing the mesh changed nothing.'}`);
    console.log(`\n  ${anyInward ? 'INWARD SHELLS PRESENT — see docs/bloom-session-35-outcome.md section 8.' : 'all shells outward.'}`);
    process.exit(moved ? 0 : 1);
  }

  const STATES = [
    ['flat — the shipping default (CALIBRATION: must be 0)', {}],
    ['roll 330 — the fold (POSITIVE CONTROL: must be > 0)', { petalRoll: 330 }],
    ['--- shipped states V5 reds on ---', null],
    ['cup 1.20 x tip 2.45  (V5 0.994)', { petalCup: 1.2, petalTipShape: 2.45 }],
    ['cup 1.20 x tip 3.00  (V5 0.832)', { petalCup: 1.2, petalTipShape: 3 }],
    ['cup 1.20 x tip 1.80  (V4 reds, V5 ok)', { petalCup: 1.2, petalTipShape: 1.8 }],
    ['cup 1.20 x tip 1.70  (the SHIPPING tip shape)', { petalCup: 1.2, petalTipShape: 1.7 }],
    ['--- the swept states ---', null],
    ['cup 1.2 x tip 1.80 x sweep 1.00  (V5 1.031 -> 0.733)', { petalCup: 1.2, petalTipShape: 1.8, petalApexSweep: 1 }],
    ['cup 1.2 x tip 2.45 x sweep 1.00  (V5 0.994 -> 0.482)', { petalCup: 1.2, petalTipShape: 2.45, petalApexSweep: 1 }],
    ['cup 1.2 x tip 3.00 x sweep 1.00  (the max reach)', { petalCup: 1.2, petalTipShape: 3, petalApexSweep: 1 }],
    ['--- the rest of the family ---', null],
    ['buckle at the clamp (A 0.60, f 3)', { buckleAmp: 0.6, buckleFreq: 3 }],
    ['buckle at the frequency ceiling (A 0.60, f 7)', { buckleAmp: 0.6, buckleFreq: 7 }],
    ['buckle over cup 1.2 + curl 180 (the wall xfail)', { buckleAmp: 0.2, buckleFreq: 3, petalCup: 1.2, petalSpineCurl: 180 }],
    ['roll 330 + cup 1.2', { petalRoll: 330, petalCup: 1.2 }],
    ['curl 360 (the spine extreme)', { petalSpineCurl: 360 }],
    ['twist 180', { petalTwist: 180 }],
    ['ALL FORM AT MAXIMUM (the V5 xfail)', { petalCup: 1.2, petalRoll: 330, petalTwist: 180, petalSpineCurl: 360, petalCupGradient: 1.2 }],
  ];
  console.log('THE SELF-INTERSECTION CENSUS — does an individually closed solid pass through itself?');
  console.log('EXPORT mesh, 56 blade rows x 10 columns. WITHIN-shell pairs are the verdict;');
  console.log('CROSS-shell pairs are overlapping closed solids, which the export contract allows.\n');
  console.log('  state                                                    tris  shells   WITHIN  cross   worst span   verdict');
  const results = [];
  for (const [label, set] of STATES) {
    if (set === null) { console.log(`  ${label}`); continue; }
    const p = meshFor(set);
    const r = census(p);
    results.push([label, r]);
    const sound = r.within === 0;
    console.log(`  ${label.padEnd(52)} ${String(r.nTri).padStart(6)}  ${String(r.shells).padStart(6)}`
      + `   ${String(r.within).padStart(6)} ${String(r.cross).padStart(6)}`
      + `   ${r.within ? r.worstSpanMm.toFixed(4) + ' mm' : '        —'}`
      + `   ${sound ? 'SOUND' : 'SELF-INTERSECTS'}`
      + (r.within && r.worstAt ? `  at (${r.worstAt.map((x) => x.toFixed(2)).join(', ')})` : ''));
  }
  console.log(`\n  ${((Date.now() - t0) / 1000).toFixed(1)}s total`);

  const flat = results.find(([l]) => l.startsWith('flat'));
  const fold = results.find(([l]) => l.startsWith('roll 330 —'));
  console.log('\n  CALIBRATION');
  console.log(`    flat build            ${flat[1].within} within-shell pairs   ${flat[1].within === 0 ? 'PASS — exactly zero' : 'FAIL'}`);
  console.log(`    roll 330 (the fold)   ${fold[1].within} within-shell pairs   ${fold[1].within > 0 ? 'PASS — detected' : 'FAIL — a known fold was not detected'}`);
  if (flat[1].within !== 0 || fold[1].within === 0) process.exit(1);
}
