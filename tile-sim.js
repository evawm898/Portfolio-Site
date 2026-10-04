/* tile-sim.js — rolls the two rollers onto a virtual sheet of dough, from first
   principles, and reports what they cut (tile-design-doc.md §4, §9).

   It is the gate's registration and seam instrument, and the page's "sheet"
   preview. It shares NO placement code with tile-roller.js: it takes the
   roller's SPEC (bar centrelines, pegs, teeth — each a roller angle φ and a
   height Z) and its MESH, and

     * reads the ROLLING RADIUS off the mesh (its outermost vertices: the rims
       and the blade tips, which must agree);
     * poses the roller as a rigid body — its axis horizontal along â (the
       user's handling: +Z toward +â), its start angle the feature that touches
       first — and derives the spin from the NO-SLIP condition
       v_centre + ω × (contact − centre) = 0, never from a sign convention;
     * stamps each feature where it is at the bottom: a point at roller angle φ
       and height Z lands at O + d(φ)·r̂ + Z·â, d(φ) the travel that turns it to
       the bottom (unwrapped along a polyline, every revolution included).

   Roller A starts with its pegged bar down at the sheet origin (the first
   dimple, D0). Roller B is POSED BY ENGAGEMENT: one collar tooth seated in D0.
   Everything the gate asserts — teeth in dimples, lines through corners, cells
   the shape of the tile, the pattern continuous over the seam — is read off
   these stamps against the TILE's own lattice and edges. */

import { latticeVectors, edgeDense } from './tile-geometry.js';

const TAU = Math.PI * 2;
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit2 = (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };

/* The user's handling of a roller (doc §4.6): A rolls along tB, B along tA,
   each with its +Z end on the LEFT as it rolls forward — the axis is the roll
   direction turned 90° left. An instruction about USE, restated here from the
   doc; the spin's sign is not taken from it but derived (pose, below). */
export function handling(tile, which) {
  const { tA, tB } = latticeVectors(tile);
  const r = unit2(which === 'A' ? tB : tA);
  return { roll: r, axis: [-r[1], r[0]] };
}

/* The rolling radius: the mesh's outermost vertices. Also the outermost BLADE
   vertex, which must reach it (else the blades never touch the board). */
export function radii(mesh) {
  const P = mesh.positions;
  let all = 0;
  for (let i = 0; i < P.length; i += 3) all = Math.max(all, Math.hypot(P[i], P[i + 1]));
  let blade = 0;
  for (const part of mesh.parts) {
    if (!/^bar/.test(part.name)) continue;
    for (let v = part.v0; v < part.v1; v++) blade = Math.max(blade, Math.hypot(P[3 * v], P[3 * v + 1]));
  }
  return { rolling: all, blade };
}

/* A rigid-body pose. The roller frame (X, Y, Z) maps to the world as columns
   Xw, Yw, Zw = â; the start angle φs is placed at the bottom (−ẑ). The spin
   about â per unit travel comes from no-slip at the contact, radius R. */
export function pose(hand, R, phiStart, origin) {
  const a3 = [hand.axis[0], hand.axis[1], 0], r3 = [hand.roll[0], hand.roll[1], 0];
  const e1 = [0, 0, -1], e2 = cross3(a3, e1);                 // right-handed about â: e1 × e2 = â
  // no slip: r̂ + w·(â × (−R ẑ)) = 0  =>  w = ((â × ẑ)·r̂) / R
  const w = dot3(cross3(a3, [0, 0, 1]), r3) / R;
  return { a3, r3, e1, e2, w, R, phiStart, origin, period: TAU / Math.abs(w) };
}
/* travel at which roller angle φ is at the bottom, in [0, period) */
function travelOf(P, phi) {
  // the angle ψ of φ about â from e1 (the bottom) is φ − φs; turning by w·d brings it to 0
  let d = (-(phi - P.phiStart)) / P.w;
  d %= P.period; if (d < 0) d += P.period;
  return d;
}
/* the sheet point where (φ, Z) touches, at travel d */
const landAt = (P, d, Z) => [P.origin[0] + d * P.r3[0] + Z * P.a3[0], P.origin[1] + d * P.r3[1] + Z * P.a3[1]];

/* Stamp a polyline of (φ, Z): the first vertex on its first branch, every next
   one on the branch nearest its predecessor; then every revolution copy whose
   travel range meets [d0, d1]. */
export function stampPolyline(P, pts, d0, d1) {
  const ds = [];
  let prev = null;
  for (const [phi, Z] of pts) {
    let d = travelOf(P, phi);
    if (prev !== null) { const k = Math.round((prev - d) / P.period); d += k * P.period; }
    ds.push(d); prev = d;
  }
  const lo = Math.min(...ds), hi = Math.max(...ds);
  const out = [];
  for (let k = Math.floor((d0 - hi) / P.period) - 1; k <= Math.ceil((d1 - lo) / P.period) + 1; k++) {
    const sh = k * P.period;
    if (hi + sh < d0 || lo + sh > d1) continue;
    out.push({ rev: k, dStart: ds[0] + sh, pts: pts.map(([, Z], i) => landAt(P, ds[i] + sh, Z)) });
  }
  return out;
}
export function stampPoints(P, feats, d0, d1) {
  const out = [];
  for (const f of feats) {
    const d = travelOf(P, f.phi);
    for (let k = Math.floor((d0 - d) / P.period) - 1; k <= Math.ceil((d1 - d) / P.period) + 1; k++) {
      const dd = d + k * P.period;
      if (dd < d0 || dd > d1) continue;
      out.push({ ...f, rev: k, d: dd, at: landAt(P, dd, f.Z), height: P.R - f.rho });
    }
  }
  return out;
}

/* Roll A, then B engaged in A's track (doc §4.4, §4.6). Each roller is rolled
   over `revs` revolutions EITHER WAY of its start: A's start is arbitrary, and B,
   once a tooth is seated, may be rolled back to the sheet's edge and forward —
   at an obtuse crossing angle its slanted bars come down before the collar's
   next tooth does, so a one-way pass from the seat would miss part of a line.
   Every stamped line is labelled with its lattice row (A) or column (B), read
   off where its first corner landed; every dimple and tooth likewise. */
export function simulate(tile, built, opts = {}) {
  const { A, B } = built;
  const specA = A.spec, specB = B.spec;
  const KA = specA.K, KB = specB.K, kStar = built.spec.kStar;
  const rA = radii(A.mesh), rB = radii(B.mesh);
  const hA = handling(tile, 'A'), hB = handling(tile, 'B');
  const revs = opts.revs || 1;
  const { tA, tB } = latticeVectors(tile);
  /* The travel window: at least `revs` revolutions either way, and always the
     whole cookie block (every corner (m, k), m 0..KA, k k*..KB, by its distance
     along the roll from D0) with a revolution to spare at each end — a short
     roller (few repeats) has to turn several times to cross a long block. */
  const windowFor = (P, hand) => {
    let lo = 0, hi = 0;
    for (let m = 0; m <= KA; m++) for (let k = kStar; k <= KB; k++) {
      const s = (m * tA[0] + (k - kStar) * tB[0]) * hand.roll[0] + (m * tA[1] + (k - kStar) * tB[1]) * hand.roll[1];
      lo = Math.min(lo, s); hi = Math.max(hi, s);
    }
    return [Math.min(-(revs + 1) * P.period, lo - P.period), Math.max((revs + 1) * P.period, hi + P.period)];
  };
  // A: the pegged bar's first corner (peg m = 0) touches the sheet origin
  const peg0 = specA.pegs.find((p) => p.m === 0);
  const PA = pose(hA, rA.rolling, peg0.phi, [-peg0.Z * hA.axis[0], -peg0.Z * hA.axis[1]]);
  const wA = windowFor(PA, hA);
  const dimplesRaw = stampPoints(PA, specA.pegs, wA[0], wA[1]);
  const first = dimplesRaw.find((d) => d.m === 0 && Math.abs(d.d) < 1e-9);
  const D0 = first.at;
  const frame = { D0, kStar };
  const lab = (p) => latticeOf(tile, frame, p);
  const labelLines = (lines, corners) => lines.map((L) => { const [u, v] = lab(L.pts[corners[0]]); return { ...L, m: Math.round(u), k: Math.round(v), off: Math.hypot(u - Math.round(u), v - Math.round(v)) }; });
  const labelPts = (pts) => pts.map((q) => { const [u, v] = lab(q.at); return { ...q, lm: Math.round(u), lk: Math.round(v) }; });
  const aLines = labelLines(specA.bars.flatMap((bar, j) => stampPolyline(PA, bar, wA[0], wA[1]).map((s) => ({ ...s, bar: j }))), specA.corners);
  const dimples = labelPts(dimplesRaw);
  // B: posed by ENGAGEMENT — tooth 0 seated in D0
  const tooth0 = specB.teeth.find((t) => t.m === 0);
  const PB = pose(hB, rB.rolling, tooth0.phi, [D0[0] - tooth0.Z * hB.axis[0], D0[1] - tooth0.Z * hB.axis[1]]);
  const wB = windowFor(PB, hB);
  const bLines = labelLines(specB.bars.flatMap((bar, j) => stampPolyline(PB, bar, wB[0], wB[1]).map((s) => ({ ...s, bar: j }))), specB.corners);
  const teeth = labelPts(stampPoints(PB, specB.teeth, wB[0], wB[1]));
  return { D0, kStar, KA, KB, PA, PB, rA, rB, aLines, bLines, dimples, teeth };
}
/* the lines that bound the cookie block: A rows 0..KB, B columns 0..KA */
export const blockLines = (sim) => ({
  a: sim.aLines.filter((L) => L.m === 0 && L.k >= 0 && L.k <= sim.KB),
  b: sim.bLines.filter((L) => L.k === 0 && L.m >= 0 && L.m <= sim.KA),
});
/* the track: the dimples of A's first pass of the pegged bar (row k*, m = 0..KA) */
export const trackDimples = (sim) => sim.dimples.filter((d) => d.lk === sim.kStar && d.lm >= 0 && d.lm <= sim.KA);

/* ---------------- what the stamps say ---------------- */

function segDist(p, a, b) {
  const ab = [b[0] - a[0], b[1] - a[1]], L2 = ab[0] * ab[0] + ab[1] * ab[1] || 1e-30;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2));
  return Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1]);
}
export function polyDist(p, poly) {
  let best = Infinity;
  for (let k = 0; k + 1 < poly.length; k++) best = Math.min(best, segDist(p, poly[k], poly[k + 1]));
  return best;
}
/* the lattice corner (m, k) — row k counted from the cookie block's first
   line; D0 is corner (0, k*) */
export function cornerOf(tile, sim, m, k) {
  const { tA, tB } = latticeVectors(tile);
  const kk = k - sim.kStar;
  return [sim.D0[0] + m * tA[0] + kk * tB[0], sim.D0[1] + m * tA[1] + kk * tB[1]];
}
/* lattice coordinates of a sheet point relative to D0 (row counted as above) */
export function latticeOf(tile, sim, p) {
  const { tA, tB } = latticeVectors(tile);
  const x = p[0] - sim.D0[0], y = p[1] - sim.D0[1];
  const det = tA[0] * tB[1] - tA[1] * tB[0];
  return [(x * tB[1] - y * tB[0]) / det, (tA[0] * y - tA[1] * x) / det + sim.kStar];
}
/* The ideal line of a family through corner (m, k), copies c0..c1 along it. */
export function idealLine(tile, sim, which, m, k, c0, c1) {
  const d = edgeDense(tile, which);
  const { tA, tB } = latticeVectors(tile);
  const t = which === 'A' ? tA : tB;
  const out = [];
  for (let c = c0; c <= c1; c++) {
    const base = which === 'A' ? cornerOf(tile, sim, m + c, k) : cornerOf(tile, sim, m, k + c);
    for (let i = c === c0 ? 0 : 1; i < d.pts.length; i++) out.push([base[0] + d.pts[i][0], base[1] + d.pts[i][1]]);
  }
  return out;
}

/* All A-line / B-line contacts closer than tol: closest points of every segment
   pair (a grid keeps it quick), clustered. */
export function contacts(aLines, bLines, tol) {
  const cell = 2;
  const grid = new Map();
  const key = (i, j) => i * 1000003 + j;
  bLines.forEach((L, li) => {
    for (let k = 0; k + 1 < L.pts.length; k++) {
      const a = L.pts[k], b = L.pts[k + 1];
      const i0 = Math.floor(Math.min(a[0], b[0]) / cell), i1 = Math.floor(Math.max(a[0], b[0]) / cell);
      const j0 = Math.floor(Math.min(a[1], b[1]) / cell), j1 = Math.floor(Math.max(a[1], b[1]) / cell);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const kk = key(i, j); if (!grid.has(kk)) grid.set(kk, []); grid.get(kk).push([li, k]); }
    }
  });
  const pts = [];
  for (const L of aLines) {
    for (let k = 0; k + 1 < L.pts.length; k++) {
      const a = L.pts[k], b = L.pts[k + 1];
      const i0 = Math.floor((Math.min(a[0], b[0]) - tol) / cell), i1 = Math.floor((Math.max(a[0], b[0]) + tol) / cell);
      const j0 = Math.floor((Math.min(a[1], b[1]) - tol) / cell), j1 = Math.floor((Math.max(a[1], b[1]) + tol) / cell);
      const seen = new Set();
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (const [li, sk] of grid.get(key(i, j)) || []) {
        const id = li * 1e6 + sk; if (seen.has(id)) continue; seen.add(id);
        const c = bLines[li].pts[sk], e = bLines[li].pts[sk + 1];
        const x = closest(a, b, c, e);
        if (x.d < tol) pts.push(x.p);
      }
    }
  }
  const clusters = [];
  for (const p of pts) {
    const c = clusters.find((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 10 * tol);
    if (!c) clusters.push(p);
  }
  return clusters;
}
/* closest points of segments ab and cd: 0 distance at a crossing */
function closest(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) > 1e-18) {
    const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return { d: 0, p: [a[0] + t * r[0], a[1] + t * r[1]] };
  }
  let best = { d: Infinity, p: null };
  for (const [p, q0, q1] of [[a, c, d], [b, c, d], [c, a, b], [d, a, b]]) {
    const dd = segDist(p, q0, q1);
    if (dd < best.d) best = { d: dd, p };
  }
  return best;
}
