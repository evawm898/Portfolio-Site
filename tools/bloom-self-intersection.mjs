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

   RUN:  node tools/bloom-self-intersection.mjs [--states] [--negative-control]
         [--prove-exclusion] [--stl <file> --set k=v,...]
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
export function census(positions, { verbose = false } = {}) {
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
  const tri = (t) => [[positions[t*9],positions[t*9+1],positions[t*9+2]],
                      [positions[t*9+3],positions[t*9+4],positions[t*9+5]],
                      [positions[t*9+6],positions[t*9+7],positions[t*9+8]]];
  const seen = new Set();
  let within = 0, cross = 0, worst = 0, worstAt = null, worstPair = null, tested = 0;
  for (const L of grid.values()) {
    for (let a = 0; a < L.length; a++) for (let b = a + 1; b < L.length; b++) {
      const i = L[a], j = L[b];
      const pk = i < j ? i * nTri + j : j * nTri + i;
      if (seen.has(pk)) continue; seen.add(pk);
      /* boxes must actually overlap */
      let sep = false;
      for (let x = 0; x < 3; x++) if (hi[i*3+x] < lo[j*3+x] || hi[j*3+x] < lo[i*3+x]) { sep = true; break; }
      if (sep) continue;
      tested++;
      const T1 = tri(i), T2 = tri(j);
      const shared = [];
      for (let c = 0; c < 3; c++) for (let d = 0; d < 3; d++)
        if (vidx[i*3+c] === vidx[j*3+d]) shared.push(T1[c]);
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
      } else cross++;
    }
  }
  return { nTri, shells: shells.size, within, cross, worstSpanMm: worst, worstAt, worstPair,
           pairsTested: tested, cellMm: cell };
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
