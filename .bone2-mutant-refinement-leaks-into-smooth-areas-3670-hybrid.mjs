/* ===================================================================
   bloom-texture-bone2-hybrid.js — BONE v2 round 2: THE HYBRID MESHER.
   PROTOTYPE, NOT SHIPPED. Read docs/bloom-surface-texture-bone-v2.md §13
   onward before changing anything here.

   Eva's rulings of Nov 1 (after #481):
     - pores MERGE (the references' look);
     - HYBRID meshing: pore-conforming RINGS where a pore stands apart,
       fine refinement ONLY along merge SEAMS and wall junctions, never a
       regular fine grid over a whole patch, both DERIVED from the pore
       field (no typed edge);
     - closure against the shipped 0.4 mm lattice with zero open edges.

   THE CONSTRUCTION, and why it needs no chart per organ (the thing that
   kept #481's rings in a focus window):
     1. Every pore's cut DISC on the organ (the field's own pore list, cut by
        the organ's own surface — `organDiscs`).
     2. Two discs on one skin whose OUTER rings (u = 1.15) overlap are a
        MERGED pair. Their split is the RADICAL PLANE of the two outer
        discs (a plane of the world, the same for both, so the two sides
        cannot disagree). A pore keeps a ring vertex only where it is on its
        own side of every pair's plane by at least the pair's BAND — the lip's
        drawn width at the smaller pore (`bone2WallU() x rho_min`). A ring
        that the band cuts ends on the band's edge EXACTLY (an angle bisected
        on the circle), so every kept arc is still ON its circle.
     3. A free pore keeps every ring whole: that is the "rings where a pore
        stands apart" half, and #481's 2.3%-off-its-circle half.
     4. The SEAM BAND of each merged pair is filled with points in three rows
        along the radical plane (at -h, 0, +h, h = half the band: the derived
        grid edge at the smaller pore), spaced along it at the smaller pore's
        own rim side (the rings' angular resolution). Nowhere else
        gets a fine point: that is the "refinement only along seams" half,
        and it is what B2e checks off the emitted points.
     5. Every ring vertex and seam point is carried onto the organ along its
        disc's own normal (an affine projection onto the lattice triangle it
        lands in), and every ring CHORD that crosses a lattice edge leaves a
        point ON that edge, at the parameter where the chord's projection
        meets it. Those points are registered per EDGE, once, so the two
        triangles that share an edge read the same list: closure is by
        construction, not by a repair.
     6. Each lattice triangle is then re-triangulated on its own, in its own
        plane, which is EXACT (a lattice triangle is planar): a constrained
        Delaunay triangulation (`cdtTriangle`) whose boundary is the triangle's
        three edges with their points, whose interior points are the ring
        vertices and seam points that landed in it, and whose CONSTRAINTS are
        the ring chords inside it — so a ring is a ring of edges in the output,
        whichever lattice triangles it passes through. The chart is an INTEGER
        lattice of HY_CHART_N units across the triangle, so orientation and
        in-circle are exact in doubles (|coord| <= 2^11.5: the in-circle's
        terms stay under 2^50).
     7. A lattice triangle with nothing in it is kept verbatim; a non-porous
        triangle whose edge received points is fanned from its centroid (the
        grid refiner's transition rule). So the count is exact without
        building: a triangulated polygon with b boundary and i interior points
        has b + 2i - 2 triangles (`countOnly`).

   The COARSE build (the release preview, ruling 4) is the same construction
   with every length the shipped lattice's own: ring sides 0.4 mm long (never
   under 6), only the two rings that bound the wall (the floor's edge, u 0.75,
   and the rim, u 1.0), no nested rings, no seam band. Same field, same disc
   list, so the same pores in the same places (B2f).

   ENGINE AGREEMENT: the ring angles use cos/sin (a prototype; never compared
   across engines). The CDT's decisions are exact integer predicates.
   =================================================================== */

/* every snap / merge distance: a point this close to an edge is ON it, this
   close to another point IS it. 1e-3 mm is 13% of the closest two rings ever
   come (u 0.97 / 1.0 at the smallest pore, 0.0075 mm) and 10^6 times the
   degeneracy bar's square root, so neither a ring nor a sliver is made by it */
export const HY_SNAP_MM = 1e-3;
/* the integer chart across a lattice triangle's longest edge */
export const HY_CHART_N = 2048;
/* a ring crossing a lattice edge leaves its point; a SEAM point keeps this
   fraction of its own spacing clear of every point already there */
export const HY_SEAM_CLEAR = 0.4;

/* THE LAYOUTS. `full` is #481's ring layout (the profile's breakpoints, 16
   sides) with consecutive rings STAGGERED by half a side (a constrained
   Delaunay needs no aligned strip, and staggered rings are not co-circular);
   `coarse` is every length at the lattice's own edge. */
export const HYBRID_LAYOUTS = Object.freeze({
  full: Object.freeze({ name: 'full', u: Object.freeze([0.45, 0.75, 0.9, 0.97, 1.0, 1.07, 1.15]), shelfFrom: 0.75, sides: () => 16, nestedU: Object.freeze([0.45, 0.75, 0.9, 1.0, 1.1]), nestedSides: 12, centre: true, seams: true }),
  coarse: Object.freeze({ name: 'coarse', u: Object.freeze([0.75, 1.0]), shelfFrom: 0.75, sides: (rho) => Math.max(6, Math.ceil((2 * Math.PI * rho) / 0.4)), nestedU: null, nestedSides: 0, centre: false, seams: false }),
});
export const HY_OUTER_U = 1.15;   // the outermost ring of the full layout: the overlap test's radius, in BOTH layouts (same pairs)
/* THE SEAM: each pore's rings end HY_BAND_H x h short of the crease (h the
   derived edge at the smaller pore: half the lip's drawn width there), and a
   row of seam points runs ON the crease (HY_SEAM_ROWS x h). Measured on the
   default plate (doc §14): a band of two h with rows at -h/0/+h clipped the
   outer rings off most merged pores (merged pores 9.0% off their circle,
   seam RMS 0.068 mm at H 1); one h, 1.9% / 0.054; half an h with the crease
   row alone, 1.9% / 0.036 (the shipped choice). `__hySeam` is the
   measurement's lever, never a control. */
export let HY_BAND_H = 0.5;
export let HY_SEAM_ROWS = [0];
/* how far past the other pore's outer ring a pair still clips, in bands: at
   the lens's two ends the two outer rings CROSS, so each must stop short of the
   other there (0 left 340 crossing constraints on the default bloom) */
export let HY_CLIP_REACH = 1;
export function __hySeam(band, rows, reach = HY_CLIP_REACH) { HY_BAND_H = band; HY_SEAM_ROWS = rows; HY_CLIP_REACH = reach; }

/* point kinds, recorded per new vertex (B2e reads them back against the field) */
export const HY_KIND = Object.freeze({ ring: 1, cross: 2, centre: 3, nested: 4, seam: 5, seamCross: 6, steiner: 7, junction: 8 });
/* a wall junction's patch reaches this many h from the junction point */
export const HY_JUNCTION_H = 2;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const L = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / L, a[1] / L, a[2] / L]; };

/* ============================================ the discs on one organ --- */
/* Every pore whose sphere reaches the organ's porous triangles, cut by the
   organ's own surface: the foot is the closest point of the surface to the
   sphere's centre (per skin: feet are grouped by normal and proximity, so a
   sphere that cuts both skins of a thin sheet gives two discs), the normal
   the interpolated vertex normal there, the disc the field's own `discOf`. */
export function organDiscs(P, N, tri, porous, FIELD, { hashCell = 0.6 } = {}) {
  const nT = tri.length / 3;
  const H = new Map();
  const ck = (i, j, k) => `${i},${j},${k}`;
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let t = 0; t < nT; t++) {
    if (!porous[t]) continue;
    const bl = [Infinity, Infinity, Infinity], bh = [-Infinity, -Infinity, -Infinity];
    for (let c = 0; c < 3; c++) { const v = tri[t * 3 + c]; for (let k = 0; k < 3; k++) { bl[k] = Math.min(bl[k], P[v * 3 + k]); bh[k] = Math.max(bh[k], P[v * 3 + k]); } }
    for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], bl[k]); hi[k] = Math.max(hi[k], bh[k]); }
    for (let i = Math.floor(bl[0] / hashCell); i <= Math.floor(bh[0] / hashCell); i++) for (let j = Math.floor(bl[1] / hashCell); j <= Math.floor(bh[1] / hashCell); j++) for (let k = Math.floor(bl[2] / hashCell); k <= Math.floor(bh[2] / hashCell); k++) { const key = ck(i, j, k); let L = H.get(key); if (!L) H.set(key, (L = [])); L.push(t); }
  }
  if (!Number.isFinite(lo[0])) return [];
  const near = (c, r) => { const out = new Set(); for (let i = Math.floor((c[0] - r) / hashCell); i <= Math.floor((c[0] + r) / hashCell); i++) for (let j = Math.floor((c[1] - r) / hashCell); j <= Math.floor((c[1] + r) / hashCell); j++) for (let k = Math.floor((c[2] - r) / hashCell); k <= Math.floor((c[2] + r) / hashCell); k++) { const L = H.get(ck(i, j, k)); if (L) for (const t of L) out.add(t); } return out; };
  const discs = [];
  for (const pore of FIELD.poresIn(lo, hi)) {
    const feet = [];
    for (const t of near(pore.centre, pore.S)) {
      const a = tri[t * 3], b = tri[t * 3 + 1], c = tri[t * 3 + 2];
      const A = [P[a * 3], P[a * 3 + 1], P[a * 3 + 2]], Bv = [P[b * 3], P[b * 3 + 1], P[b * 3 + 2]], C = [P[c * 3], P[c * 3 + 1], P[c * 3 + 2]];
      const q = closestOnTri(pore.centre, A, Bv, C);
      const d = Math.hypot(q.p[0] - pore.centre[0], q.p[1] - pore.centre[1], q.p[2] - pore.centre[2]);
      if (d >= pore.S) continue;
      const n = nrm([0, 1, 2].map((k) => q.l[0] * N[a * 3 + k] + q.l[1] * N[b * 3 + k] + q.l[2] * N[c * 3 + k]));
      feet.push({ t, p: q.p, n, d });
    }
    feet.sort((x, y) => x.d - y.d || x.t - y.t);
    const groups = [];
    for (const f of feet) { if (groups.some((g) => dot(g.n, f.n) > 0.5 && Math.hypot(g.p[0] - f.p[0], g.p[1] - f.p[1], g.p[2] - f.p[2]) < pore.S)) continue; groups.push(f); }
    for (const g of groups) {
      const disc = FIELD.discOf(pore, g.p, g.n);
      if (!disc || !(disc.a > 0)) continue;
      const fr = FIELD.frame(g.n);
      discs.push({ key: pore.key, sphere: pore.centre, S: pore.S, c: disc.centre, n: g.n, t1: fr.t1, t2: fr.t2, rho: disc.rho, a: disc.a, nested: disc.nested, rot: ((pore.priority >>> 0) & 1023) / 1024, foot: g.t });
    }
  }
  return discs;
}
function closestOnTri(p, a, b, c) {
  /* Ericson's closest point on a triangle, with its barycentrics */
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return { p: a, l: [1, 0, 0] };
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return { p: b, l: [0, 1, 0] };
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return { p: [a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]], l: [1 - v, v, 0] }; }
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return { p: c, l: [0, 0, 1] };
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return { p: [a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]], l: [1 - w, 0, w] }; }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); return { p: [b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])], l: [0, 1 - w, w] }; }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  return { p: [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w], l: [1 - v - w, v, w] };
}

/* ======================================= the merged pairs and their planes */
/* Two discs MERGE when their outer rings overlap on one skin. Their split is
   the field's own crease: where the two cups are at the SAME normalised
   radius, u_i = u_j (an Apollonius sphere of the world; a plane when the two
   are equal). Measured as a length: sd(x) = (u_i - u_j) / (1/rho_i + 1/rho_j)
   (the gradient's own magnitude where the two radii point apart), negative on
   i's side, the same set seen from either disc. The radical plane of the
   OUTER discs was the first cut and is wrong for unequal pores: it crosses
   the crease, and a thin wall between two barely merged pores fell between
   the two clipped ring sets (measured: 0.78 mm of relief missing at H 1.0).
   `band` is the lip's drawn width at the smaller pore. */
export const pairSd = (pr, x) => (Math.hypot(x[0] - pr.ci[0], x[1] - pr.ci[1], x[2] - pr.ci[2]) / pr.ri - Math.hypot(x[0] - pr.cj[0], x[1] - pr.cj[1], x[2] - pr.cj[2]) / pr.rj) * pr.k;
export function mergedPairs(discs, wallU) {
  const pairs = [];
  const cell = 3.5, G = new Map();
  discs.forEach((d, i) => { const k = `${Math.floor(d.c[0] / cell)},${Math.floor(d.c[1] / cell)},${Math.floor(d.c[2] / cell)}`; let L = G.get(k); if (!L) G.set(k, (L = [])); L.push(i); });
  discs.forEach((d, i) => {
    const gx = Math.floor(d.c[0] / cell), gy = Math.floor(d.c[1] / cell), gz = Math.floor(d.c[2] / cell);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const L = G.get(`${gx + a},${gy + b},${gz + c}`); if (!L) continue;
      for (const j of L) {
        if (j <= i) continue;
        const e = discs[j];
        if (dot(d.n, e.n) <= 0.5) continue;
        const v = sub(e.c, d.c), dist = Math.hypot(v[0], v[1], v[2]);
        const Ri = HY_OUTER_U * d.rho, Rj = HY_OUTER_U * e.rho;
        if (!(dist < Ri + Rj) || dist < 1e-9) continue;
        const m = [v[0] / dist, v[1] / dist, v[2] / dist];
        const h = (wallU * Math.min(d.rho, e.rho)) / 2;
        pairs.push({ i, j, m, ci: d.c, cj: e.c, ri: d.rho, rj: e.rho, k: 1 / (1 / d.rho + 1 / e.rho), h, band: HY_BAND_H * h, dist, Ri, Rj });
      }
    }
  });
  return pairs;
}

/* =========================================== THE ORGAN MESHER (hybrid) --- */
/* M: { P (flat xyz), N (flat), tri, porous (per triangle) }. discs from
   `organDiscs` (or a charted domain's own). opts: { layout, wallU,
   countOnly }. Returns, when building: { P (old + new), tri, src (per new
   vertex: its lattice triangle and barycentrics, for interpolating the
   organ's attributes), kind, nV0, stats }; when counting: { count, stats }. */
export function hybridOrganMesh(M, discs, opts) {
  const L = opts.layout, wallU = opts.wallU, countOnly = !!opts.countOnly;
  const { P, tri, porous } = M;
  const nV0 = P.length / 3, nT = tri.length / 3;
  const stats = { discs: discs.length, pairs: 0, free: 0, merged: 0, arcs: 0, ringPts: 0, crossPts: 0, seamPts: 0, seamCross: 0, aborted: 0, cdtTris: 0, keptTris: 0, fanTris: 0, consFail: 0, steiner: 0, seamDropped: 0 };
  /* ---- topology ---- */
  const edgeIdx = new Map();
  const EA = [], EB = [], ET0 = [], ET1 = [], EPTS = [];   // edge endpoints (a < b), adjacent triangles, points
  const triE = new Int32Array(nT * 3);
  const ek = (a, b) => (a < b ? a * 4294967296 + b : b * 4294967296 + a);
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) {
    const a = tri[t * 3 + k], b = tri[t * 3 + (k + 1) % 3];
    const key = ek(a, b);
    let e = edgeIdx.get(key);
    if (e === undefined) { e = EA.length; edgeIdx.set(key, e); EA.push(Math.min(a, b)); EB.push(Math.max(a, b)); ET0.push(t); ET1.push(-1); EPTS.push(null); }
    else ET1[e] = t;
    triE[t * 3 + k] = e;
  }
  const V = (v) => [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]];
  const faceN = new Float64Array(nT * 3), maxEdge = new Float64Array(nT), snapT = new Float64Array(nT);
  for (let t = 0; t < nT; t++) {
    const A = V(tri[t * 3]), Bv = V(tri[t * 3 + 1]), C = V(tri[t * 3 + 2]);
    const f = nrm(crs(sub(Bv, A), sub(C, A)));
    faceN[t * 3] = f[0]; faceN[t * 3 + 1] = f[1]; faceN[t * 3 + 2] = f[2];
    maxEdge[t] = Math.max(Math.hypot(...sub(Bv, A)), Math.hypot(...sub(C, Bv)), Math.hypot(...sub(A, C)));
    snapT[t] = Math.max(HY_SNAP_MM, (3 * maxEdge[t]) / HY_CHART_N);
  }
  const edgeSnap = (e) => Math.max(snapT[ET0[e]], ET1[e] >= 0 ? snapT[ET1[e]] : 0);
  const reMesh = (t) => t >= 0 && !!porous[t];
  /* spatial hash of every triangle (the walk crosses non-porous ones too) */
  const cell = 0.6, H = new Map();
  const ck = (i, j, k) => `${i},${j},${k}`;
  for (let t = 0; t < nT; t++) {
    const bl = [Infinity, Infinity, Infinity], bh = [-Infinity, -Infinity, -Infinity];
    for (let c = 0; c < 3; c++) { const v = tri[t * 3 + c]; for (let k = 0; k < 3; k++) { bl[k] = Math.min(bl[k], P[v * 3 + k]); bh[k] = Math.max(bh[k], P[v * 3 + k]); } }
    for (let i = Math.floor(bl[0] / cell); i <= Math.floor(bh[0] / cell); i++) for (let j = Math.floor(bl[1] / cell); j <= Math.floor(bh[1] / cell); j++) for (let k = Math.floor(bl[2] / cell); k <= Math.floor(bh[2] / cell); k++) { const key = ck(i, j, k); let Ls = H.get(key); if (!Ls) H.set(key, (Ls = [])); Ls.push(t); }
  }
  const trisNear = (c, r) => { const out = new Set(); for (let i = Math.floor((c[0] - r) / cell); i <= Math.floor((c[0] + r) / cell); i++) for (let j = Math.floor((c[1] - r) / cell); j <= Math.floor((c[1] + r) / cell); j++) for (let k = Math.floor((c[2] - r) / cell); k <= Math.floor((c[2] + r) / cell); k++) { const Ls = H.get(ck(i, j, k)); if (Ls) for (const t of Ls) out.add(t); } return out; };

  /* ---- the point store (new vertices) ---- */
  const NP = [], srcT = [], srcB = [], kind = [];
  const interior = new Map();   // t -> [ids]
  const cons = new Map();       // t -> [[a, b], ...]
  const posOf = (id) => (id < nV0 ? V(id) : [NP[(id - nV0) * 3], NP[(id - nV0) * 3 + 1], NP[(id - nV0) * 3 + 2]]);
  const attach = [];   // per new point: the lattice triangles it belongs to (one inside, two on an edge)
  const ptDisc = [];   // per new point: the disc whose ring or seam made it (-1 none) — the diagnosis of a failed constraint
  let curDisc = -1;
  const newPt = (x, t, l, k, at = null) => { const id = nV0 + kind.length; NP.push(x[0], x[1], x[2]); srcT.push(t); srcB.push(l[0], l[1], l[2]); kind.push(k); attach.push(at || [t]); ptDisc.push(curDisc); return id; };
  const isSeamKind = (k) => k === HY_KIND.seam || k === HY_KIND.seamCross || k === HY_KIND.junction;
  /* a point ON edge e at parameter s from its lower vertex */
  const regEdge = (e, s, k, clear = 0) => {
    const a = EA[e], b = EB[e], A = V(a), Bv = V(b);
    const len = Math.hypot(Bv[0] - A[0], Bv[1] - A[1], Bv[2] - A[2]);
    const sn = edgeSnap(e);
    if (s * len < Math.max(sn, clear)) return clear && s * len >= sn ? -1 : a;
    if ((1 - s) * len < Math.max(sn, clear)) return clear && (1 - s) * len >= sn ? -1 : b;
    let L = EPTS[e];
    if (!L) EPTS[e] = L = [];
    for (const q of L) { const d = Math.abs(q.s - s) * len; if (d < sn) return q.id; if (clear && d < clear) return -1; }
    const x = [A[0] + s * (Bv[0] - A[0]), A[1] + s * (Bv[1] - A[1]), A[2] + s * (Bv[2] - A[2])];
    /* its source triangle (for attributes): either neighbour, the barycentrics on the shared edge */
    const t = reMesh(ET0[e]) || ET1[e] < 0 ? ET0[e] : ET1[e];
    const l = [0, 0, 0];
    for (let c = 0; c < 3; c++) { const v = tri[t * 3 + c]; if (v === a) l[c] = 1 - s; else if (v === b) l[c] = s; }
    const id = newPt(x, t, l, k, ET1[e] >= 0 ? [ET0[e], ET1[e]] : [ET0[e]]);
    L.push({ s, id, k });
    return id;
  };
  /* a point IN triangle t with barycentrics l (snapped onto an edge or a
     corner within the triangle's snap distance) */
  const regIn = (t, l, k, clear = 0) => {
    const c3 = [tri[t * 3], tri[t * 3 + 1], tri[t * 3 + 2]], Cs = c3.map(V);
    const x = [0, 1, 2].map((q) => l[0] * Cs[0][q] + l[1] * Cs[1][q] + l[2] * Cs[2][q]);
    const area2 = Math.hypot(...crs(sub(Cs[1], Cs[0]), sub(Cs[2], Cs[0])));
    const sn = snapT[t];
    /* distance to the edge opposite corner q is l[q] x its altitude */
    const dist = [0, 1, 2].map((q) => { const e1 = Cs[(q + 1) % 3], e2 = Cs[(q + 2) % 3]; const len = Math.hypot(...sub(e2, e1)); return (l[q] * area2) / (len || 1); });
    const small = [0, 1, 2].filter((q) => dist[q] < sn);
    if (small.length >= 2) { const q = [0, 1, 2].find((z) => !small.includes(z)); return clear ? -1 : c3[q]; }
    if (small.length === 1) {
      const q = small[0], ca = (q + 1) % 3, cb = (q + 2) % 3;   // the edge from corner ca to cb (triE index ca)
      const e = triE[t * 3 + ca], sAB = l[cb] / (l[ca] + l[cb]);
      const s = c3[ca] === EA[e] ? sAB : 1 - sAB;
      return regEdge(e, s, k === HY_KIND.seam || k === HY_KIND.junction ? HY_KIND.seamCross : k === HY_KIND.ring || k === HY_KIND.nested ? HY_KIND.cross : k, clear);
    }
    let Ls = interior.get(t);
    if (!Ls) interior.set(t, (Ls = []));
    for (const id of Ls) { const q = posOf(id); const d = Math.hypot(q[0] - x[0], q[1] - x[1], q[2] - x[2]); if (d < sn) return id; if (clear && d < clear) return -1; }
    if (clear) {
      for (let c = 0; c < 3; c++) { if (Math.hypot(...sub(Cs[c], x)) < clear) return -1; const pl = EPTS[triE[t * 3 + c]]; if (pl) for (const q of pl) { const p2 = posOf(q.id); if (Math.hypot(p2[0] - x[0], p2[1] - x[1], p2[2] - x[2]) < clear) return -1; } }
    }
    const id = newPt(x, t, l, k);
    Ls.push(id);
    return id;
  };
  const addCons = (t, a, b) => { if (a === b || a < 0 || b < 0 || !reMesh(t)) return; let Ls = cons.get(t); if (!Ls) cons.set(t, (Ls = [])); Ls.push([a, b]); };

  /* ---- pairs ---- */
  const pairs = mergedPairs(discs, wallU);
  stats.pairs = pairs.length;
  const pairsOf = discs.map(() => []);
  for (const pr of pairs) { pairsOf[pr.i].push({ pr, sign: 1 }); pairsOf[pr.j].push({ pr, sign: -1 }); }
  discs.forEach((d, i) => { if (pairsOf[i].length) stats.merged++; else stats.free++; });
  /* the signed margin of x on disc i's side of every one of its planes
     (negative = kept): max over its pairs of (sd + band), sd oriented toward
     the neighbour */
  /* a pair clips only INSIDE the other pore's outer disc: past its outer ring
     the other cup is the plateau and there is no crease to keep clear of
     (clipping there opened a gap in the lip at the lens's ends, where neither
     a ring nor a seam row reached: 0.36 mm of relief missing at H 1.0) */
  const clipOf = (i, x) => { let g = -Infinity; for (const { pr, sign } of pairsOf[i]) { const o = sign > 0 ? pr.cj : pr.ci, ro = sign > 0 ? pr.Rj : pr.Ri; if (Math.hypot(x[0] - o[0], x[1] - o[1], x[2] - o[2]) >= ro + HY_CLIP_REACH * pr.band) continue; const sd = sign * pairSd(pr, x); g = Math.max(g, sd + pr.band); } return g; };

  /* ---- one disc's chart, the location of a point, the walk ---- */
  const chartOf = (d) => {
    const near = trisNear(d.c, HY_OUTER_U * d.rho + 0.8);
    const front = new Set();
    for (const t of near) if (faceN[t * 3] * d.n[0] + faceN[t * 3 + 1] * d.n[1] + faceN[t * 3 + 2] * d.n[2] >= 0.3) front.add(t);
    const cv = new Map();
    const cxy = (v) => { let q = cv.get(v); if (!q) { const x = sub(V(v), d.c); q = [dot(x, d.t1), dot(x, d.t2)]; cv.set(v, q); } return q; };
    const bary = (t, x, y) => {
      const A = cxy(tri[t * 3]), Bq = cxy(tri[t * 3 + 1]), C = cxy(tri[t * 3 + 2]);
      const det = (Bq[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (Bq[1] - A[1]);
      if (!(Math.abs(det) > 1e-18)) return null;
      const l1 = ((Bq[0] - x) * (C[1] - y) - (C[0] - x) * (Bq[1] - y)) / det, l2 = ((C[0] - x) * (A[1] - y) - (A[0] - x) * (C[1] - y)) / det;
      return [l1, l2, 1 - l1 - l2];
    };
    const inside = (l) => l && l[0] >= -1e-12 && l[1] >= -1e-12 && l[2] >= -1e-12;
    const locate = (x, y, hint = -1) => {
      if (hint >= 0 && front.has(hint)) { const l = bary(hint, x, y); if (inside(l)) return { t: hint, l }; }
      for (const t of front) { const l = bary(t, x, y); if (inside(l)) return { t, l }; }
      return null;
    };
    /* the walk from (x0,y0) in t0 to (x1,y1): its edge crossings and the end triangle */
    const walk = (t0, x0, y0, x1, y1) => {
      const out = [];
      let cur = t0, prevE = -1, sPrev = 0;
      for (let step = 0; step < 80; step++) {
        const l = bary(cur, x1, y1);
        if (inside(l)) return { crossings: out, t: cur, l };
        let best = null;
        for (let k = 0; k < 3; k++) {
          const e = triE[cur * 3 + k];
          if (e === prevE) continue;
          const A = cxy(EA[e]), Bq = cxy(EB[e]);
          const rx = x1 - x0, ry = y1 - y0, ex = Bq[0] - A[0], ey = Bq[1] - A[1];
          const den = rx * ey - ry * ex;
          if (Math.abs(den) < 1e-18) continue;
          const wx = A[0] - x0, wy = A[1] - y0;
          const s = (wx * ey - wy * ex) / den, u = (wx * ry - wy * rx) / den;
          if (s > sPrev - 1e-12 && s <= 1 + 1e-12 && u >= -1e-12 && u <= 1 + 1e-12 && (!best || s < best.s)) best = { e, s, u: Math.min(1, Math.max(0, u)) };
        }
        if (!best) return { crossings: out, t: -1, aborted: 'noexit' };
        const next = ET0[best.e] === cur ? ET1[best.e] : ET0[best.e];
        out.push({ e: best.e, u: best.u, from: cur, to: next });
        if (next < 0 || !front.has(next)) return { crossings: out, t: -1, aborted: next < 0 ? 'border' : 'leaves' };
        cur = next; prevE = best.e; sPrev = best.s;
      }
      return { crossings: out, t: -1, aborted: 'steps' };
    };
    /* the SURFACE point under a chart point (the projection along the disc's
       normal onto the lattice triangle it lands in): every clip is judged
       there, so two discs with different normals judge the same point */
    let lastT = -1;
    const surf = (x, y, fallback) => {
      const at = locate(x, y, lastT);
      if (!at) return fallback;
      lastT = at.t;
      const a = tri[at.t * 3], b = tri[at.t * 3 + 1], c = tri[at.t * 3 + 2];
      return [0, 1, 2].map((k) => at.l[0] * P[a * 3 + k] + at.l[1] * P[b * 3 + k] + at.l[2] * P[c * 3 + k]);
    };
    return { locate, walk, bary, inside, surf };
  };

  /* ---- an arc (a polyline of points on the disc's plane, in its chart), walked
     and registered. `closed`: the last point joins the first. `constrain`:
     its chords are constraints (rings) or not (seam rows). */
  const runArc = (ch, pts, closed, k, constrain, clear = 0, drop = null) => {
    const kx = k === HY_KIND.seam ? HY_KIND.seamCross : HY_KIND.cross;
    let prev = null;   // { id, t (the triangle the next sub-segment starts in), x, y }
    const first = { done: false };
    const visit = (x, y, hint) => {
      const at = ch.locate(x, y, hint);
      if (!at) return null;
      return at;
    };
    const ids = [];
    let at0 = null;
    const seq = closed ? [...pts, pts[0]] : pts;
    for (let i = 0; i < seq.length; i++) {
      const [x, y, x3] = seq[i];
      let at;
      if (prev && prev.t >= 0) {
        const W = ch.walk(prev.t, prev.x, prev.y, x, y);
        let cur = { id: prev.id, t: prev.t };
        for (const c of W.crossings) {
          const s = c.u, e = c.e;
          const pa = EA[e];
          /* u is from the edge's corner in walk order (EA -> EB as stored), so s is from EA */
          void pa;
          let id = -1;
          if (reMesh(c.from) || reMesh(c.to)) {
            const xq = posOf(EA[e]), xb = posOf(EB[e]);
            const xm = [xq[0] + s * (xb[0] - xq[0]), xq[1] + s * (xb[1] - xq[1]), xq[2] + s * (xb[2] - xq[2])];
            if (!drop || !drop(xm)) id = regEdge(e, s, kx, clear);
          }
          if (constrain && cur.id >= 0 && id >= 0) addCons(c.from, cur.id, id);
          cur = { id, t: c.to };
        }
        if (W.aborted) { stats.aborted++; stats['abort_' + W.aborted] = (stats['abort_' + W.aborted] || 0) + 1; at = visit(x, y, -1); prev = null; if (!at) { continue; } }
        else {
          at = { t: W.t, l: W.l };
          const id = reMesh(at.t) && (!drop || !drop(x3)) ? regIn(at.t, at.l, k, clear) : -1;
          if (constrain && cur.id >= 0 && id >= 0) addCons(at.t, cur.id, id);
          prev = { id, t: at.t, x, y };
          ids.push(id);
          continue;
        }
      } else at = visit(x, y, at0 ? at0.t : -1);
      if (!at) { prev = null; continue; }
      if (!at0) at0 = at;
      const id = reMesh(at.t) && (!drop || !drop(x3)) ? regIn(at.t, at.l, k, clear) : -1;
      prev = { id, t: at.t, x, y };
      ids.push(id);
    }
    void first;
    return ids;
  };

  /* ---- every disc's rings ---- */
  const charts = discs.map((d) => chartOf(d));
  discs.forEach((d, i) => {
    curDisc = i;
    const ch = charts[i];
    const to3 = (x, y) => [d.c[0] + x * d.t1[0] + y * d.t2[0], d.c[1] + x * d.t1[1] + y * d.t2[1], d.c[2] + x * d.t1[2] + y * d.t2[2]];
    /* the clip: the disc's own planes, plus (for a nested pit) the radical
       lines against the pore's other nested pits, which overlap as often as
       not (measured: every two-pit pore on the default plate) */
    const ringArcs = (cx, cy, r, sides, phase, extra = null) => {
      const th = (q) => phase + (2 * Math.PI * q) / sides;
      const at = (a) => { const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); return [x, y, ch.surf(x, y, to3(x, y))]; };
      const clip = (p) => Math.max(clipOf(i, p[2]), extra ? extra(p[0], p[1]) : -Infinity);
      const keep = [];
      for (let q = 0; q < sides; q++) keep.push(clip(at(th(q))) < 0);
      /* a chord between two kept vertices is kept only if it stays on the
         pore's side too: the larger pore's kept region is the OUTSIDE of the
         crease (an Apollonius sphere wraps the smaller pore), which is not
         convex, so a chord between two kept vertices can cut into the smaller
         pore's arcs (measured: 1,146 failed constraints on the default bloom,
         every one two discs' arcs) */
      const chordOK = (q) => { const a0 = th(q), a1 = th(q + 1), x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1); for (const f of [0.25, 0.5, 0.75]) { const x = x0 + f * (x1 - x0), y = y0 + f * (y1 - y0); if (!(clip([x, y, ch.surf(x, y, to3(x, y))]) < 0)) return false; } return true; };
      const link = [];
      for (let q = 0; q < sides; q++) { const a = keep[q], b = keep[(q + 1) % sides]; link.push(a && b ? (chordOK(q) ? 'full' : 'none') : a ? 'cutA' : b ? 'cutB' : 'none'); }
      if (link.every((k) => k === 'full')) return [{ closed: true, pts: Array.from({ length: sides }, (_, q) => at(th(q))) }];
      if (!keep.some(Boolean)) return [];
      /* the arc's end ON the circle where the binding band edge is met */
      const edgeAt = (aIn, aOut) => { let lo = aIn, hi = aOut; for (let it = 0; it < 40; it++) { const m = (lo + hi) / 2; if (clip(at(m)) < 0) lo = m; else hi = m; } return at(lo); };
      const arcs = [];
      let cur = null;
      const flush = () => { if (cur && cur.length) arcs.push({ closed: false, pts: cur }); cur = null; };
      const start = link.findIndex((k) => k !== 'full');
      for (let k = 0; k < sides; k++) {
        const j = (start + k) % sides, st = link[j];
        if (st === 'full') { if (!cur) cur = [at(th(j))]; cur.push(at(th(j + 1))); }
        else if (st === 'cutA') { if (!cur) cur = [at(th(j))]; cur.push(edgeAt(th(j), th(j + 1))); flush(); }
        else if (st === 'cutB') { flush(); cur = [edgeAt(th(j + 1), th(j)), at(th(j + 1))]; }
        else { if (!cur && keep[j]) cur = [at(th(j))]; flush(); }
      }
      flush();
      return arcs;
    };
    const shelved = d.nested && d.nested.length && L.nestedU;
    const sides = L.sides(d.rho);
    L.u.forEach((u, ri) => {
      if (shelved && u < L.shelfFrom) return;
      const phase = 2 * Math.PI * (d.rot + (ri % 2) * 0.5) / sides;
      for (const arc of ringArcs(0, 0, u * d.rho, sides, phase)) { runArc(ch, arc.pts, arc.closed, HY_KIND.ring, true); stats.arcs++; }
    });
    if (L.centre && !shelved) { const x3 = d.c; if (clipOf(i, x3) < 0) runArc(ch, [[0, 0, x3]], false, HY_KIND.centre, false); }
    if (shelved) d.nested.forEach((q, qi) => {
      /* the nested pit's offset is in the field's frame at the disc's normal, which IS this disc's frame */
      const cx = q.ox, cy = q.oy;
      const Ro = L.nestedU[L.nestedU.length - 1];
      const others = d.nested.filter((o, oi) => oi !== qi && Math.hypot(o.ox - cx, o.oy - cy) < Ro * (o.R + q.R));
      const extra = others.length ? (x, y) => { let g = -Infinity; for (const o of others) { const dx = o.ox - cx, dy = o.oy - cy, dd = Math.hypot(dx, dy) || 1e-12, Ra = Ro * q.R, Rb = Ro * o.R; const rad = (dd * dd + Ra * Ra - Rb * Rb) / (2 * dd); const sdv = ((x - cx) * dx + (y - cy) * dy) / dd - rad; g = Math.max(g, sdv + wallU * Math.min(q.R, o.R)); } return g; } : null;
      L.nestedU.forEach((u, ri) => {
        const phase = 2 * Math.PI * (d.rot + (ri % 2) * 0.5) / L.nestedSides;
        for (const arc of ringArcs(cx, cy, u * q.R, L.nestedSides, phase, extra)) { runArc(ch, arc.pts, arc.closed, HY_KIND.nested, true); stats.arcs++; }
      });
      const x3 = to3(cx, cy); if (clipOf(i, x3) < 0 && !(extra && extra(cx, cy) >= 0)) runArc(ch, [[cx, cy, x3]], false, HY_KIND.centre, false);
    });
  });

  /* ---- the seam bands ---- */
  /* a point a THIRD disc keeps (inside its outer disc and on its side of all
     its planes) is that disc's, and a seam point there is dropped */
  const keptByOtherSet = (x, own, margin) => {
    const cand = new Set(); for (const o of own) for (const { pr } of pairsOf[o]) cand.add(pr.i === o ? pr.j : pr.i);
    for (const k of cand) {
      if (own.includes(k)) continue;
      const d = discs[k]; const dx = x[0] - d.c[0], dy = x[1] - d.c[1], dz = x[2] - d.c[2];
      const R = HY_OUTER_U * d.rho + margin;
      if (dx * dx + dy * dy + dz * dz > R * R) continue;
      if (clipOf(k, x) < margin) return true;
    }
    return false;
  };
  const keptByOther = (x, i, j, margin) => {
    /* a third disc whose outer disc reaches the seam overlaps i's or j's, so
       it is one of their own merged neighbours */
    const cand = new Set(); for (const { pr } of pairsOf[i]) cand.add(pr.i === i ? pr.j : pr.i); for (const { pr } of pairsOf[j]) cand.add(pr.i === j ? pr.j : pr.i);
    for (const k of cand) {
      if (k === i || k === j) continue;
      const d = discs[k]; const dx = x[0] - d.c[0], dy = x[1] - d.c[1], dz = x[2] - d.c[2];
      const R = HY_OUTER_U * d.rho + margin;
      if (dx * dx + dy * dy + dz * dz > R * R) continue;
      if (Math.abs(dx * d.n[0] + dy * d.n[1] + dz * d.n[2]) > R) continue;
      if (clipOf(k, x) < margin) return true;
    }
    return false;
  };
  if (L.seams) for (const pr of pairs) {
    const d = discs[pr.i], ch = charts[pr.i];
    const h = pr.h;
    /* the crease in disc i's chart: a row at sd = r is found by Newton along
       sd's own gradient from points spaced along the line through the crease
       across the centres (the radical direction) */
    const g1 = dot(d.t1, pr.m), g2 = dot(d.t2, pr.m), gg = g1 * g1 + g2 * g2;
    if (!(gg > 0.25)) continue;   // the centres' line is nearly normal to the disc: no seam across it
    const to3s = (x, y) => [d.c[0] + x * d.t1[0] + y * d.t2[0], d.c[1] + x * d.t1[1] + y * d.t2[1], d.c[2] + x * d.t1[2] + y * d.t2[2]];
    const sdAt = (x, y) => pairSd(pr, to3s(x, y));
    const onRow = (x, y, r) => {
      for (let it = 0; it < 8; it++) {
        const e = 1e-6, f = sdAt(x, y) - r, fx = (sdAt(x + e, y) - sdAt(x - e, y)) / (2 * e), fy = (sdAt(x, y + e) - sdAt(x, y - e)) / (2 * e), gq = fx * fx + fy * fy;
        if (!(gq > 0)) return null;
        x -= (f * fx) / gq; y -= (f * fy) / gq;
        if (Math.abs(f) < 1e-9) break;
      }
      return [x, y];
    };
    /* the crease crosses the centres' line where u_i = u_j: at t = rho_i/(rho_i + rho_j) of the way */
    const cjx = dot(sub(discs[pr.j].c, d.c), d.t1), cjy = dot(sub(discs[pr.j].c, d.c), d.t2);
    const tC = d.rho / (d.rho + discs[pr.j].rho);
    const sd0x = tC * cjx, sd0y = tC * cjy;
    const wx = -g2 / Math.sqrt(gg), wy = g1 / Math.sqrt(gg);
    const near3 = (x) => keptByOther(x, pr.i, pr.j, h * 0.5);
    for (const r of HY_SEAM_ROWS.map((q) => q * h)) {
      const px = sd0x, py = sd0y;
      const pts = [];
      /* along the seam, the RIM'S OWN SIDE at the smaller pore (the rings'
         angular resolution); across it, three rows h apart (h half the lip's
         drawn width there, the derived grid edge) */
      const rmin = Math.min(d.rho, discs[pr.j].rho), step = (2 * Math.PI * rmin) / L.sides(rmin), Lr = pr.Ri;
      for (let s = -Lr; s <= Lr + 1e-12; s += step) {
        const q = onRow(px + s * wx, py + s * wy, r);
        if (!q) continue;
        const [x, y] = q;
        const x3 = to3s(x, y);
        const ci = discs[pr.i].c, cj = discs[pr.j].c;
        const di = Math.hypot(x3[0] - ci[0], x3[1] - ci[1], x3[2] - ci[2]), dj = Math.hypot(x3[0] - cj[0], x3[1] - cj[1], x3[2] - cj[2]);
        if (di < pr.Ri && dj < pr.Rj) pts.push([x, y, x3]);
        else if (pts.length) { runArc(ch, pts.splice(0), false, HY_KIND.seam, false, HY_SEAM_CLEAR * h, near3); }
      }
      if (pts.length) runArc(ch, pts, false, HY_KIND.seam, false, HY_SEAM_CLEAR * h, near3);
    }
  }
  /* ---- the wall junctions: where three mutually merged pores meet, the
     creases end in a wall's sharp end (the field's three-way smooth minimum).
     The junction is the point where the three normalised radii are EQUAL,
     found by Gauss-Newton in disc i's chart; a patch of points at the derived
     edge h (the smallest pore's) is laid within HY_JUNCTION_H x h of it. */
  if (L.seams) {
    const nb = discs.map(() => new Set());
    for (const pr of pairs) { nb[pr.i].add(pr.j); nb[pr.j].add(pr.i); }
    for (let i = 0; i < discs.length; i++) for (const j of nb[i]) { if (j <= i) continue; for (const k of nb[j]) {
      if (k <= j || !nb[i].has(k)) continue;
      const D3 = [discs[i], discs[j], discs[k]], d = D3[0], ch = charts[i];
      const to3s = (x, y) => [d.c[0] + x * d.t1[0] + y * d.t2[0], d.c[1] + x * d.t1[1] + y * d.t2[1], d.c[2] + x * d.t1[2] + y * d.t2[2]];
      const uOf = (q, x3) => Math.hypot(x3[0] - q.c[0], x3[1] - q.c[1], x3[2] - q.c[2]) / q.rho;
      const fn = (x, y) => { const x3 = to3s(x, y), a = uOf(D3[0], x3); return [a - uOf(D3[1], x3), a - uOf(D3[2], x3)]; };
      /* start at the radius-weighted centroid */
      const W = D3.reduce((s2, q) => s2 + q.rho, 0);
      let x = 0, y = 0; for (const q of D3) { const v = sub(q.c, d.c); x += (dot(v, d.t1) * q.rho) / W; y += (dot(v, d.t2) * q.rho) / W; }
      let ok = false;
      for (let it = 0; it < 20; it++) {
        const f = fn(x, y), e = 1e-6, fx = fn(x + e, y), fy = fn(x, y + e);
        const J = [[(fx[0] - f[0]) / e, (fy[0] - f[0]) / e], [(fx[1] - f[1]) / e, (fy[1] - f[1]) / e]];
        const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
        if (!(Math.abs(det) > 1e-12)) break;
        const dx = (f[0] * J[1][1] - f[1] * J[0][1]) / det, dy = (J[0][0] * f[1] - J[1][0] * f[0]) / det;
        x -= dx; y -= dy;
        if (Math.hypot(dx, dy) < 1e-9) { ok = true; break; }
      }
      if (!ok) continue;
      const x3 = to3s(x, y);
      if (D3.some((q) => uOf(q, x3) >= HY_OUTER_U)) continue;   // the three outer discs do not share the point
      const h = (wallU * Math.min(...D3.map((q) => q.rho))) / 2, R = HY_JUNCTION_H * h;
      const near3 = (p3) => { for (let z = 0; z < discs.length; z++) { if (z === i || z === j || z === k) continue; } return keptByOtherSet(p3, [i, j, k], h * 0.5); };
      const pts = [];
      const hy = h * Math.sqrt(3) / 2;
      for (let r = -Math.ceil(R / hy), rr = 0; r <= Math.ceil(R / hy); r++, rr++) for (let c = -Math.ceil(R / h) - 1; c <= Math.ceil(R / h) + 1; c++) {
        const px = x + (c + (r & 1) * 0.5) * h, py = y + r * hy;
        if (Math.hypot(px - x, py - y) > R) continue;
        /* a junction point is a MERGE's: inside at least two of the three
           outer discs (one lens), never on a pore's plateau beyond them */
        const p3 = to3s(px, py);
        if (D3.filter((q) => Math.hypot(p3[0] - q.c[0], p3[1] - q.c[1], p3[2] - q.c[2]) < HY_OUTER_U * q.rho).length < 2) continue;
        pts.push([px, py, p3]);
      }
      for (const q of pts) runArc(ch, [q], false, HY_KIND.junction, false, HY_SEAM_CLEAR * h, near3);
      stats.junctions = (stats.junctions || 0) + 1;
    } }
  }
  stats.ringPts = 0; stats.crossPts = 0; stats.seamPts = 0; stats.seamCross = 0;
  for (const k of kind) { if (k === HY_KIND.junction) stats.junctionPts = (stats.junctionPts || 0) + 1; else if (k === HY_KIND.seam) stats.seamPts++; else if (k === HY_KIND.seamCross) stats.seamCross++; else if (k === HY_KIND.cross) stats.crossPts++; else if (k === HY_KIND.ring || k === HY_KIND.nested || k === HY_KIND.centre) stats.ringPts++; }

  /* ---- per triangle: count or triangulate ---- */
  const outTri = [];
  let count = 0;
  const loopOf = (t) => {
    /* the boundary loop: corner 0, edge 0's points, corner 1, ... (corner k to k+1) */
    const loop = [], side = [];
    for (let k = 0; k < 3; k++) {
      const a = tri[t * 3 + k], b = tri[t * 3 + (k + 1) % 3], e = triE[t * 3 + k];
      loop.push(a); side.push((1 << k) | (1 << ((k + 2) % 3)));
      const pl = EPTS[e];
      if (pl && pl.length) {
        const sorted = pl.slice().sort((p, q) => p.s - q.s);
        const fwd = a === EA[e];
        for (const q of fwd ? sorted : sorted.reverse()) { loop.push(q.id); side.push(1 << k); }
      }
    }
    return { loop, side };
  };
  for (let t = 0; t < nT; t++) {
    const { loop, side } = loopOf(t);
    const ins = reMesh(t) ? (interior.get(t) || []) : [];
    if (loop.length === 3 && !ins.length) { count++; stats.keptTris++; if (!countOnly) outTri.push(tri[t * 3], tri[t * 3 + 1], tri[t * 3 + 2]); continue; }
    if (!reMesh(t)) {
      /* a transition: the centroid fan over the boundary points */
      count += loop.length; stats.fanTris += loop.length;
      if (!countOnly) {
        const g = newPt([0, 1, 2].map((q) => (P[tri[t * 3] * 3 + q] + P[tri[t * 3 + 1] * 3 + q] + P[tri[t * 3 + 2] * 3 + q]) / 3), t, [1 / 3, 1 / 3, 1 / 3], HY_KIND.steiner);
        for (let q = 0; q < loop.length; q++) outTri.push(loop[q], loop[(q + 1) % loop.length], g);
      }
      continue;
    }
    const ni = ins.length || 1;
    if (!ins.length) stats.steiner++;
    count += loop.length + 2 * ni - 2;
    stats.cdtTris += loop.length + 2 * ni - 2;
    if (countOnly) continue;
    let pts = ins;
    if (!ins.length) { const g = newPt([0, 1, 2].map((q) => (P[tri[t * 3] * 3 + q] + P[tri[t * 3 + 1] * 3 + q] + P[tri[t * 3 + 2] * 3 + q]) / 3), t, [1 / 3, 1 / 3, 1 / 3], HY_KIND.steiner); pts = [g]; }
    const R = cdtInLatticeTriangle(posOf, loop, side, pts, cons.get(t) || [], [V(tri[t * 3]), V(tri[t * 3 + 1]), V(tri[t * 3 + 2])], maxEdge[t]);
    stats.consFail += R.fail;
    if (R.fail && opts.debug) { (stats.failSites = stats.failSites || []).push({ t, failed: R.failed.map(([a, b]) => ({ a, b, da: a >= nV0 ? ptDisc[a - nV0] : -1, db: b >= nV0 ? ptDisc[b - nV0] : -1, ka: a >= nV0 ? kind[a - nV0] : 0, kb: b >= nV0 ? kind[b - nV0] : 0 })), blockers: R.blockers.map(([a, b]) => ({ da: a >= nV0 ? ptDisc[a - nV0] : -1, db: b >= nV0 ? ptDisc[b - nV0] : -1, ka: a >= nV0 ? kind[a - nV0] : 0, kb: b >= nV0 ? kind[b - nV0] : 0 })), pos: R.failed.concat(R.blockers).flat().map(posOf), pairs: pairs.filter((pr) => R.failed.concat(R.blockers).flat().some((id) => id >= nV0 && (ptDisc[id - nV0] === pr.i || ptDisc[id - nV0] === pr.j))).map((pr) => ({ i: pr.i, j: pr.j, sd: R.failed.concat(R.blockers).flat().map((id) => pairSd(pr, posOf(id))), band: pr.band })) }); }
    for (const q of R.tris) outTri.push(q);
    if (R.tris.length / 3 !== loop.length + 2 * pts.length - 2) stats.countMismatch = (stats.countMismatch || 0) + 1;
  }
  stats.count = count;
  if (countOnly) return { count, stats };
  return { P: Array.from(P).concat(NP), tri: outTri, src: { t: srcT, b: srcB }, kind, attach, nV0, stats, pairs, discs };
}

/* ====================== THE CONSTRAINED DELAUNAY OF ONE LATTICE TRIANGLE --- */
/* posOf(id) -> 3D; loop: the boundary ids CCW (as the organ winds the
   triangle), side: per loop entry, the bitmask of the lattice sides it lies
   on; ins: interior ids; consIds: [[a, b]] chords; C: the three corners;
   returns { tris: global ids, CCW as the triangle, fail }. */
export function cdtInLatticeTriangle(posOf, loop, side, ins, consIds, C, maxEdge) {
  /* the integer chart: corner 0 at the origin, corner 1 on +x, corner 2 at +y */
  const e1 = nrm(sub(C[1], C[0]));
  const nT = nrm(crs(sub(C[1], C[0]), sub(C[2], C[0])));
  const e2 = crs(nT, e1);
  const S = HY_CHART_N / maxEdge;
  const ids = loop.concat(ins);
  const X = new Float64Array(ids.length), Y = new Float64Array(ids.length);
  ids.forEach((id, i) => { const q = sub(posOf(id), C[0]); X[i] = Math.round(dot(q, e1) * S); Y[i] = Math.round(dot(q, e2) * S); });
  const sideOf = new Int32Array(ids.length);
  for (let i = 0; i < loop.length; i++) sideOf[i] = side[i];
  const loc = new Map(); ids.forEach((id, i) => { if (!loc.has(id)) loc.set(id, i); });
  const cons = [];
  for (const [a, b] of consIds) { const ia = loc.get(a), ib = loc.get(b); if (ia === undefined || ib === undefined || ia === ib) continue; if (sideOf[ia] & sideOf[ib]) continue; cons.push([ia, ib]); }
  const R = cdt2(X, Y, loop.length, sideOf, cons);
  return { tris: R.tris.map((i) => ids[i]), fail: R.fail, failed: R.failed.map(([a, b]) => [ids[a], ids[b]]), blockers: R.blockers.map(([a, b]) => [ids[a], ids[b]]) };
}

/* the CDT core, in exact integer coordinates. 0..nb-1 the boundary loop CCW
   (never flipped), nb.. interior points (inserted by Lawson), cons local
   pairs (recovered by Sloan's flips). A triangle whose three vertices share a
   lattice side is never made (it would be a zero-area sliver ON an edge). */
export function cdt2(X, Y, nb, sideOf, cons) {
  const n = X.length;
  const orient = (a, b, c) => (X[b] - X[a]) * (Y[c] - Y[a]) - (Y[b] - Y[a]) * (X[c] - X[a]);
  const inCirc = (a, b, c, d) => { const adx = X[a] - X[d], ady = Y[a] - Y[d], bdx = X[b] - X[d], bdy = Y[b] - Y[d], cdx = X[c] - X[d], cdy = Y[c] - Y[d]; return (adx * adx + ady * ady) * (bdx * cdy - cdx * bdy) - (bdx * bdx + bdy * bdy) * (adx * cdy - cdx * ady) + (cdx * cdx + cdy * cdy) * (adx * bdy - bdx * ady); };
  const T = [];           // [a, b, c] or null
  const E = new Map();    // directed edge a*65536+b -> triangle
  const dk = (a, b) => a * 65536 + b;
  const uk = (a, b) => (a < b ? a * 65536 + b : b * 65536 + a);
  const locked = new Set();
  for (let i = 0; i < nb; i++) locked.add(uk(i, (i + 1) % nb));
  const add = (a, b, c) => { const t = T.length; T.push([a, b, c]); E.set(dk(a, b), t); E.set(dk(b, c), t); E.set(dk(c, a), t); return t; };
  const del = (t) => { const [a, b, c] = T[t]; if (E.get(dk(a, b)) === t) E.delete(dk(a, b)); if (E.get(dk(b, c)) === t) E.delete(dk(b, c)); if (E.get(dk(c, a)) === t) E.delete(dk(c, a)); T[t] = null; };
  const sameSide = (a, b, c) => (sideOf[a] & sideOf[b] & sideOf[c]) !== 0;
  const third = (t, a, b) => { const q = T[t]; for (const v of q) if (v !== a && v !== b) return v; return -1; };
  /* flip edge (a, b): triangles (a, b, c) and (b, a, d) -> (a, d, c), (d, b, c) */
  const canFlip = (a, b) => {
    const t1 = E.get(dk(a, b)), t2 = E.get(dk(b, a));
    if (t1 === undefined || t2 === undefined) return null;
    const c = third(t1, a, b), d = third(t2, b, a);
    if (orient(a, d, c) <= 0 || orient(d, b, c) <= 0) return null;
    if (sameSide(a, d, c) || sameSide(d, b, c)) return null;
    return { t1, t2, c, d };
  };
  const flip = (a, b, f) => { del(f.t1); del(f.t2); add(a, f.d, f.c); add(f.d, b, f.c); };
  const legalize = (stack) => {
    let guard = 0;
    while (stack.length && guard++ < 200000) {
      const [a, b] = stack.pop();
      if (locked.has(uk(a, b))) continue;
      const t1 = E.get(dk(a, b)), t2 = E.get(dk(b, a));
      if (t1 === undefined || t2 === undefined) continue;
      const c = third(t1, a, b), d = third(t2, b, a);
      if (!(inCirc(a, b, c, d) > 0)) continue;
      const f = canFlip(a, b);
      if (!f) continue;
      flip(a, b, f);
      stack.push([a, f.d], [f.d, b], [b, f.c], [f.c, a]);
    }
  };
  /* the initial fan from the first interior point */
  const g = nb;
  for (let i = 0; i < nb; i++) add(g, i, (i + 1) % nb);
  const st0 = []; for (let i = 0; i < nb; i++) st0.push([g, i]);
  legalize(st0);
  for (let p = nb + 1; p < n; p++) {
    let found = -1, onEdge = -1;
    for (let t = 0; t < T.length; t++) {
      const q = T[t]; if (!q) continue;
      const o1 = orient(q[0], q[1], p), o2 = orient(q[1], q[2], p), o3 = orient(q[2], q[0], p);
      if (o1 >= 0 && o2 >= 0 && o3 >= 0) { found = t; onEdge = o1 === 0 ? 0 : o2 === 0 ? 1 : o3 === 0 ? 2 : -1; break; }
    }
    if (found < 0) continue;   // outside (cannot happen for a point inside the triangle)
    const [a, b, c] = T[found];
    if (onEdge < 0) { del(found); add(a, b, p); add(b, c, p); add(c, a, p); legalize([[a, b], [b, c], [c, a]]); continue; }
    const [u, v, w] = onEdge === 0 ? [a, b, c] : onEdge === 1 ? [b, c, a] : [c, a, b];
    const t2 = E.get(dk(v, u));
    if (t2 === undefined || locked.has(uk(u, v))) { del(found); add(v, w, p); add(w, u, p); legalize([[v, w], [w, u]]); continue; }
    const x = third(t2, v, u);
    del(found); del(t2);
    add(v, w, p); add(w, u, p); add(u, x, p); add(x, v, p);
    legalize([[v, w], [w, u], [u, x], [x, v]]);
  }
  /* the constraints, by flips */
  let fail = 0;
  const failed = [], blockers = [];
  const crosses = (u, v, x, y) => { if (x === u || x === v || y === u || y === v) return false; const o1 = orient(u, v, x), o2 = orient(u, v, y), o3 = orient(x, y, u), o4 = orient(x, y, v); return ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0)); };
  const queue = [...cons];
  let qguard = 0;
  while (queue.length && qguard++ < 20000) {
    const [u, v] = queue.shift();
    if (E.has(dk(u, v)) || E.has(dk(v, u))) { locked.add(uk(u, v)); continue; }
    /* a vertex ON the segment splits the constraint */
    let mid = -1;
    for (let w = 0; w < n; w++) { if (w === u || w === v || orient(u, v, w) !== 0) continue; const dx = X[v] - X[u], dy = Y[v] - Y[u], s = (X[w] - X[u]) * dx + (Y[w] - Y[u]) * dy; if (s > 0 && s < dx * dx + dy * dy) { mid = w; break; } }
    if (mid >= 0) { queue.push([u, mid], [mid, v]); continue; }
    const cross = [];
    for (const [key] of E) { const a = Math.floor(key / 65536), b = key % 65536; if (a < b && crosses(u, v, a, b)) cross.push([a, b]); }
    if (cross.some(([a, b]) => locked.has(uk(a, b)))) { fail++; failed.push([u, v]); blockers.push(cross.find(([a, b]) => locked.has(uk(a, b)))); if (cdt2.why) { const blk = cross.find(([a, b]) => locked.has(uk(a, b))); const bnd = blk[0] < nb && blk[1] < nb && (Math.abs(blk[0] - blk[1]) === 1 || Math.abs(blk[0] - blk[1]) === nb - 1); const key = (bnd ? 'boundary' : 'constraint') + (u < nb ? '-uB' : '-uI') + (v < nb ? '-vB' : '-vI'); cdt2.why[key] = (cdt2.why[key] || 0) + 1; } continue; }
    let guard = 0;
    while (cross.length && guard++ < 5000) {
      const [a, b] = cross.shift();
      if (!E.has(dk(a, b)) && !E.has(dk(b, a))) continue;
      const aa = E.has(dk(a, b)) ? a : b, bb = aa === a ? b : a;
      const f = canFlip(aa, bb);
      if (!f) { cross.push([a, b]); continue; }
      flip(aa, bb, f);
      if (crosses(u, v, f.c, f.d)) cross.push([f.c, f.d]);
    }
    if (E.has(dk(u, v)) || E.has(dk(v, u))) locked.add(uk(u, v)); else { fail++; if (cdt2.why) cdt2.why.flips = (cdt2.why.flips || 0) + 1; }
  }
  /* restore Delaunay about the constraints */
  const st = []; for (const [key] of E) { const a = Math.floor(key / 65536), b = key % 65536; if (a < b) st.push([a, b]); }
  legalize(st);
  const tris = [];
  for (const q of T) if (q) tris.push(q[0], q[1], q[2]);
  return { tris, fail, failed, blockers };
}
