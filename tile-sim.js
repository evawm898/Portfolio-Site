/* tile-sim.js — rolls the two rollers onto a virtual sheet of dough, from first
   principles, and reports what they cut (tile-design-doc.md §4, §9).

   It is the gate's registration and seam instrument. It shares NO placement
   code with tile-roller.js: it takes the roller's SPEC (ring centrelines and
   pins, each a roller angle φ and a height Z), the roller MESHES and the
   HANDLE meshes, and

     * reads the ROLLING RADIUS off the mesh (its outermost vertices: the ring
       blades' tips, which nothing else may stand proud of);
     * reads each roller's START POSE off the meshes: the detent notch cut in
       its end faces, and on the handle the nub (which sits in the notch) and
       the sight arm's pointer — so the roller angle that is at the bottom when
       the pointer hangs straight down is notch + (pointer − nub);
     * poses the roller as a rigid body — its axis horizontal, the spin derived
       from the NO-SLIP condition v_centre + ω × (contact − centre) = 0, never
       from a sign convention;
     * stamps each feature where it is at the bottom: a point at roller angle φ
       and height Z lands at O + d(φ)·r̂ + Z·â, d(φ) the travel that turns it to
       the bottom. A RING is a closed loop on the cylinder: unwrapped along its
       own points it gains exactly one period of travel per time round (else it
       is not a ring), and its revolutions laid end to end are ONE line — the
       seam is where one revolution's last point meets the next one's first.

   Roller A starts on its detent at the dough's edge (its contact line through
   the sheet origin) and rolls forward; its pins punch pinholes. Roller B is
   POSED BY TWO POINTS: on its detent, its two pointers — one past each end, on
   its contact line — over the first pinhole from the edge and the one exactly
   the pointers' span from it. Everything the gate asserts — the pinholes, the
   lines through the corners, the pattern continuous over the seam — is read
   off these stamps against the TILE's own lattice and edges. */

import { latticeVectors, edgeDense } from './tile-geometry.js';

const TAU = Math.PI * 2;
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit2 = (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };

/* The user's handling of a roller (doc §4.6): A rolls along tA, B along tB —
   each along the direction its own lines run — each with its +Z end on the
   LEFT as it rolls forward: the axis is the roll direction turned 90° left. An
   instruction about USE, restated here from the doc; the spin's sign is not
   taken from it but derived (pose, below). */
export function handling(tile, which) {
  const { tA, tB } = latticeVectors(tile);
  const r = unit2(which === 'A' ? tA : tB);
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
    if (!/^ring/.test(part.name)) continue;
    for (let v = part.v0; v < part.v1; v++) blade = Math.max(blade, Math.hypot(P[3 * v], P[3 * v + 1]));
  }
  return { rolling: all, blade };
}

/* The detent notch on a roller's end faces, read off the body's mesh: the end
   face vertices (within 1.5 mm of an end) whose Z is not constant round their
   ring are the notch; the deepest of them lie on its centreline. Returns, per
   face, the notch's angle (circular mean of the deepest vertices) and depth —
   or null where a face has none. */
export function readNotch(mesh) {
  const body = mesh.parts.find((q) => q.name === 'body'), P = mesh.positions;
  let zlo = Infinity, zhi = -Infinity;
  for (let v = body.v0; v < body.v1; v++) { zlo = Math.min(zlo, P[3 * v + 2]); zhi = Math.max(zhi, P[3 * v + 2]); }
  const face = (end) => {
    const rings = new Map();
    for (let v = body.v0; v < body.v1; v++) {
      const z = P[3 * v + 2], depth = end === 'bottom' ? z - zlo : zhi - z;
      if (depth > 1.5) continue;
      const r = Math.hypot(P[3 * v], P[3 * v + 1]);
      const k = r.toFixed(6);
      if (!rings.has(k)) rings.set(k, []);
      rings.get(k).push([v, depth]);
    }
    let best = -1, deep = [];
    for (const vs of rings.values()) {
      const ds = vs.map((x) => x[1]), lo = Math.min(...ds), hi = Math.max(...ds);
      if (hi - lo < 1e-6) continue;                          // a ring at one height: not the notch
      for (const [v, d] of vs) { const rel = d - lo; if (rel > best + 1e-9) { best = rel; deep = [v]; } else if (Math.abs(rel - best) <= 1e-9) deep.push(v); }
    }
    if (!deep.length) return null;
    let cx = 0, cy = 0; for (const v of deep) { const a = Math.atan2(P[3 * v + 1], P[3 * v]); cx += Math.cos(a); cy += Math.sin(a); }
    return { phi: Math.atan2(cy, cx), depth: best, count: deep.length };
  };
  return { bottom: face('bottom'), top: face('top'), zlo, zhi };
}
/* The handle's geometry off its mesh: the bearing face (the highest point of
   the revolved part outside the pin), the nub's tip (the highest vertex of
   part `nub`), the pointer's tip (the vertex of part `pointer` farthest from
   the axis). */
export function readHandle(hmesh) {
  const P = hmesh.positions, part = (n) => hmesh.parts.find((q) => q.name === n);
  const hp = part('handle'), nub = part('nub'), ptr = part('pointer');
  if (!hp || !nub || !ptr) return null;
  /* the pin's radius: the widest point of the part's top millimetre; the bearing
     face: the highest point of the part wider than the pin */
  let zTop = -Infinity; for (let v = hp.v0; v < hp.v1; v++) zTop = Math.max(zTop, P[3 * v + 2]);
  let rpin = 0; for (let v = hp.v0; v < hp.v1; v++) if (P[3 * v + 2] >= zTop - 1) rpin = Math.max(rpin, Math.hypot(P[3 * v], P[3 * v + 1]));
  let zSh = -Infinity; for (let v = hp.v0; v < hp.v1; v++) if (Math.hypot(P[3 * v], P[3 * v + 1]) > rpin + 1e-3) zSh = Math.max(zSh, P[3 * v + 2]);
  /* a tip is a small flat disk: the mean of its rim and centre is its centre */
  const meanOf = (part, key, tol) => {
    let best = -Infinity; for (let v = part.v0; v < part.v1; v++) best = Math.max(best, key(v));
    const s = [0, 0, 0]; let n = 0;
    for (let v = part.v0; v < part.v1; v++) if (key(v) >= best - tol) { s[0] += P[3 * v]; s[1] += P[3 * v + 1]; s[2] += P[3 * v + 2]; n++; }
    return s.map((x) => x / n);
  };
  const nubTip = meanOf(nub, (v) => P[3 * v + 2], 1e-9);
  const ptrTip = meanOf(ptr, (v) => Math.hypot(P[3 * v], P[3 * v + 1]), 0.25);
  return {
    zSh, rpin, nubTip, ptrTip,
    nubPhi: Math.atan2(nubTip[1], nubTip[0]), nubR: Math.hypot(nubTip[0], nubTip[1]), nubAbove: nubTip[2] - zSh,
    ptrPhi: Math.atan2(ptrTip[1], ptrTip[0]), ptrR: Math.hypot(ptrTip[0], ptrTip[1]),
    g: zSh - ptrTip[2],                                       // the pointer's distance past the roller's end face
  };
}
/* The roller angle at the bottom when the handle's nub sits in the notch and
   the pointer hangs straight down: the handle turns with the roller through
   the detent, so the pointer is at roller angle notch + (pointer − nub). */
export function startAngle(notchPhi, h) { return notchPhi + (h.ptrPhi - h.nubPhi); }

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

/* Stamp a closed RING of (φ, Z) over the travel window [d0, d1]. The ring's
   points are unwrapped along it (each on the branch nearest its
   predecessor); the travel it gains going once round, `turn`, is ONE period
   for a ring (and 0 for a blade that does not go round). Its revolutions are
   laid end to end — revolution r is the ring moved r·period — as one line,
   with the index where each revolution starts (`seams`) and of every corner. */
export function stampRing(P, pts, d0, d1, corners = []) {
  const ds = [];
  let prev = null;
  for (const [phi] of pts) {
    let d = travelOf(P, phi);
    if (prev !== null) d += Math.round((prev - d) / P.period) * P.period;
    ds.push(d); prev = d;
  }
  let dEnd = travelOf(P, pts[0][0]);                       // the ring's first point again, closing the loop
  dEnd += Math.round((prev - dEnd) / P.period) * P.period;
  const turn = dEnd - ds[0];                                  // a whole number of periods: +1 for a ring
  const lo = Math.min(...ds), hi = Math.max(...ds);
  const r0 = Math.floor((d0 - hi) / P.period) - 1, r1 = Math.ceil((d1 - lo) / P.period) + 1;
  const isCorner = new Set(corners);
  const out = [], cornerAt = [], seams = [];
  for (let r = r0; r <= r1; r++) {
    const sh = r * P.period;
    seams.push(out.length);
    for (let i = 0; i < pts.length; i++) { if (isCorner.has(i)) cornerAt.push(out.length); out.push(landAt(P, ds[i] + sh, pts[i][1])); }
  }
  out.push(landAt(P, ds[0] + (r1 + 1) * P.period, pts[0][1]));
  return { pts: out, corners: cornerAt, seams, revs: r1 - r0 + 1, turn };
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

/* Roll A from the dough's edge, then place B by two points on A's pinholes
   and roll it (doc §4). Every ring is stamped over `revs` revolutions EITHER
   WAY of its start (and always across the whole sheet with a revolution to
   spare), because a ring cuts wherever its roller runs; A's pins are stamped
   only where A really runs — forward from the edge, across everything
   (spec.A.rollEnd travel, which the gate checks covers the sheet). Every
   stamped line is labelled with its lattice row (A) or column (B), read off
   where its corners landed.
   opts.perturb = [δ1, δ2]: B's two pointers placed δ off their pinholes (the
   least-squares rigid placement: the pointers' midpoint on the holes'
   midpoint, the axis along them). */
export function simulate(tile, built, opts = {}) {
  const { A, B, HA, HB } = built;
  const specA = A.spec, specB = B.spec;
  const { KA, KB } = built.spec;
  const rA = radii(A.mesh), rB = radii(B.mesh);
  const hA = handling(tile, 'A'), hB = handling(tile, 'B');
  const revs = opts.revs || 1;
  const { tA, tB } = latticeVectors(tile);
  const pre = opts.pre || {};
  const nA = pre.nA || readNotch(A.mesh), nB = pre.nB || readNotch(B.mesh), gA = pre.gA || readHandle(HA.mesh), gB = pre.gB || readHandle(HB.mesh);
  if (!nA.bottom || !nB.bottom || !gA || !gB) return { error: 'no detent notch or handle to pose from' };
  const phiA = startAngle(nA.bottom.phi, gA), phiB = startAngle(nB.bottom.phi, gB);
  // A: its start contact line through the sheet origin
  const PA = pose(hA, rA.rolling, phiA, [0, 0]);
  const wide = (P, lo, hi) => [Math.min(-(revs + 1) * P.period, lo - P.period), Math.max((revs + 1) * P.period, hi + P.period)];
    /* the lattice: ring 0's first corner on or past the edge is column a0 (the
     design's start column), row 0 — A defines the frame */
  const ring0 = stampRing(PA, specA.rings[0], 0, PA.period, specA.corners);
  const firstCorner = ring0.corners.map((c) => ring0.pts[c]).map((p) => [p, p[0] * hA.roll[0] + p[1] * hA.roll[1]]).filter(([, d]) => d > -1e-9).sort((x, y) => x[1] - y[1])[0][0];
  const a0 = built.spec.a0;
  const D0 = [firstCorner[0] - a0 * tA[0], firstCorner[1] - a0 * tA[1]];
  const frame = { D0 };
  const lab = (p) => latticeOf(tile, frame, p);
  const along = (p, hand) => p[0] * hand.roll[0] + p[1] * hand.roll[1];
  // everything the user rolls over: the sheet's corners, by distance along A's roll from the edge
  const sheetCorners = []; for (let m = 0; m <= KA; m++) for (let k = 0; k <= KB; k++) sheetCorners.push(cornerOf(tile, frame, m, k));
  const sA = sheetCorners.map((p) => along(p, hA));
  const wA = wide(PA, Math.min(...sA), Math.max(...sA));
  const rollEnd = built.layout.A.rollEnd;
  const pinholes = labelPts(lab, stampPoints(PA, specA.pins || [], 0, rollEnd));
  const labelLine = (L, fam) => {
    let off = 0; const us = [], vs = [];
    for (const c of L.corners) { const [u, v] = lab(L.pts[c]); us.push(u); vs.push(v); off = Math.max(off, Math.hypot(u - Math.round(u), v - Math.round(v))); }
    const al = fam === 'A' ? vs : us;
    const id = Math.round(al[0]);
    const mixed = al.some((x) => Math.round(x) !== id);
    return { ...L, k: fam === 'A' ? id : null, m: fam === 'B' ? id : null, off, mixed, span: fam === 'A' ? [Math.min(...us), Math.max(...us)] : [Math.min(...vs), Math.max(...vs)] };
  };
  const aLines = opts.cornersOnly ? [] : specA.rings.map((ring, j) => ({ ...labelLine(stampRing(PA, ring, wA[0], wA[1], specA.corners), 'A'), ring: j }));
  /* B: two-point placement. Its pointers stand g past each end face on its
     contact line: at roller Z = −g and Z = L + g (L the body's length, g off
     the handle mesh). The span between them, off the meshes: */
  const zLo = nB.zlo - gB.g, zHi = nB.zhi + gB.g, span = zHi - zLo;
  /* the first pinhole from the edge, and the pinhole exactly the span from it
     whose roll direction (the pair's axis turned right) is along edge B */
  const byEdge = pinholes.slice().sort((p, q) => along(p.at, hA) - along(q.at, hA));
  let pair = null;
  for (const Q of byEdge) {
    for (const P of byEdge) {
      if (P === Q) continue;
      const ax = [Q.at[0] - P.at[0], Q.at[1] - P.at[1]], dl = Math.hypot(ax[0], ax[1]);
      if (Math.abs(dl - span) > 0.05) continue;
      const roll = [ax[1] / dl, -ax[0] / dl];
      if (roll[0] * hB.roll[0] + roll[1] * hB.roll[1] < Math.cos(Math.PI / 6)) continue;
      pair = { P, Q, residual: dl - span }; break;
    }
    if (pair) break;
  }
  const base = { D0, KA, KB, PA, rA, rB, aLines, pinholes, a0, phiA, phiB, notch: { A: nA, B: nB }, handle: { A: gA, B: gB }, span, zLo, zHi, rollEnd, frame };
  if (!pair) return { ...base, error: `no pair of pinholes ${span.toFixed(3)} mm apart along edge B for B's pointers`, bLines: [] };
  const dP = (opts.perturb && opts.perturb[0]) || [0, 0], dQ = (opts.perturb && opts.perturb[1]) || [0, 0];
  const Pp = [pair.P.at[0] + dP[0], pair.P.at[1] + dP[1]], Qp = [pair.Q.at[0] + dQ[0], pair.Q.at[1] + dQ[1]];
  const ax = unit2([Qp[0] - Pp[0], Qp[1] - Pp[1]]);
  const handB = { axis: ax, roll: [ax[1], -ax[0]] };
  const M = [(Pp[0] + Qp[0]) / 2, (Pp[1] + Qp[1]) / 2], zm = (zLo + zHi) / 2;
  const PB = pose(handB, rB.rolling, phiB, [M[0] - zm * ax[0], M[1] - zm * ax[1]]);
  const sB = sheetCorners.map((p) => along(p, handB));
  const wB = wide(PB, Math.min(...sB) - along(M, handB), Math.max(...sB) - along(M, handB));
  if (opts.cornersOnly) {
    const pts = []; for (const ring of specB.rings) for (const c of specB.corners) pts.push({ phi: ring[c][0], Z: ring[c][1], rho: rB.rolling });
    return { ...base, pair, PB, bCorners: stampPoints(PB, pts, wB[0], wB[1]).map((q) => q.at) };
  }
  const bLines = specB.rings.map((ring, j) => ({ ...labelLine(stampRing(PB, ring, wB[0], wB[1], specB.corners), 'B'), ring: j }));
  return { ...base, pair, PB, bLines };
}
function labelPts(lab, pts) { return pts.map((q) => { const [u, v] = lab(q.at); return { ...q, u, v }; }); }
/* the lines that bound the cookie sheet: A rows 0..KB, B columns 0..KA */
export const blockLines = (sim) => ({
  a: sim.aLines.filter((L) => L.k >= 0 && L.k <= sim.KB),
  b: sim.bLines.filter((L) => L.m >= 0 && L.m <= sim.KA),
});

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
/* the lattice corner (m, k) — D0 is corner (0, 0) */
export function cornerOf(tile, sim, m, k) {
  const { tA, tB } = latticeVectors(tile);
  return [sim.D0[0] + m * tA[0] + k * tB[0], sim.D0[1] + m * tA[1] + k * tB[1]];
}
/* lattice coordinates (u, v) of a sheet point */
export function latticeOf(tile, sim, p) {
  const { tA, tB } = latticeVectors(tile);
  const x = p[0] - sim.D0[0], y = p[1] - sim.D0[1];
  const det = tA[0] * tB[1] - tA[1] * tB[0];
  return [(x * tB[1] - y * tB[0]) / det, (tA[0] * y - tA[1] * x) / det];
}
/* The ideal line of a family through corner (m, k), copies c0..c1 along it. */
export function idealLine(tile, sim, which, m, k, c0, c1) {
  const d = edgeDense(tile, which);
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
