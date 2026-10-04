/* tile-roller.js — the two cutting rollers and the handle, built from the tile.

   Pure ES module: no DOM, no three.js. Read tile-design-doc.md §3–§4 first:
   the roll directions, the circumference law and the index marks are derived
   there, and everything here implements that derivation and nothing else.

   ROLLER X (A carries the edge-A lines, B the edge-B lines) carries its lines
   as RINGS — each a closed wavy blade running AROUND the circumference, like a
   jagged pizza-wheel edge wrapped round the pin — and rolls along its OWN chord
   tX, the direction its lines run (Eva's ruling, doc §3.1):
       r̂ = tX/|tX|, â = ẑ × r̂ (90° left of the roll),
       a sheet vector P maps to unrolled (s, z) = (P·r̂, P·â),
       circumference at the blade tip C = n·|tX|, R_tip = C / 2π,
       a ring point (s, z) sits at roller angle φ = −s / R_tip and height Z = z + Z0,
   the roller's +Z end held on the LEFT as it rolls forward. An X-line repeats
   along tX every |tX|, so n copies of edge X, corner to corner, close on
   themselves round the circumference: ring 0. The NEXT line of the family is
   the line moved by the other lattice vector tY, so ring j is ring 0 moved by
   j·(tY·r̂) round the roller and j·(tY·â) along it — the second is the
   perpendicular distance between neighbouring lines, |tA × tB| / |tX|.

   Every solid is a CLOSED SHELL — the revolved body (bore, cavity, B's collar
   band, A's orientation groove), each ring (four offset loops zipped into a
   closed tube: a torus, no end caps), each peg and tooth (a 45° cone) — and
   overlapping closed shells are unioned by the slicer. The roller SPEC (ring
   centrelines, pegs and teeth in (φ, Z)) is exported beside the mesh so
   tile-sim.js can roll it; the sim reads the rolling radius off the MESH,
   never off this file's numbers. */

import { edgeDense, latticeVectors } from './tile-geometry.js';

/* ------------------------------------------------------------------ */
/* Parameters and constants                                             */
/* ------------------------------------------------------------------ */

export const PRINT_DEFAULTS = { dough: 5, bladeHeight: 8, bladeWall: 1.2, draft: 2, cylWall: 3, pegSize: 6, bore: 8, minCookie: 8 };
/* round: tiles round each roller's circumference (C = round × its own pitch);
   cols / rows: the cookie sheet, cookies along edge A and along edge B —
   roller B carries cols + 1 rings, roller A rows + 1 (doc §3.3). */
export const ROLLER_DEFAULTS = { roundA: 6, roundB: 5, cols: 4, rows: 3 };
export const PRINT_RANGES = {
  dough: [2, 15, 0.5], bladeHeight: [4, 20, 0.5], bladeWall: [0.6, 3, 0.1], draft: [0, 10, 0.5],
  cylWall: [1.6, 8, 0.2], pegSize: [3, 12, 0.5], bore: [5, 14, 0.5], minCookie: [3, 30, 0.5],
};
export const ROLLER_RANGES = { roundA: [2, 12, 1], roundB: [2, 12, 1], cols: [1, 8, 1], rows: [1, 8, 1] };

export const BODY_CLEARANCE_MM = 1.5;   // blade height must exceed dough + this, or the body touches the dough
export const EMBED_MM = 0.4;            // blade roots sink this far into the body: overlapping shells, never touching faces
export const END_MARGIN_MM = 3;         // the body runs this far past the outermost blade root, peg or collar
export const CAP_MM = 8;                // end-cap thickness = the axle's bearing length
export const PIN_CLEARANCE_MM = 0.25;   // the handle pin is this much under the bore, radially
export const PEG_TIP_MIN_MM = 0.8;      // a peg's blunt tip radius, at least
export const TOOTH_CLEARANCE_MM = 0.3;  // a tooth is the peg's cone this much smaller, and this much shorter, so it seats on the dimple's wall
export const COLLAR_CLEAR_MM = 1.5;     // the collar stands this far clear of the nearest ring's root
export const BUILD_HEIGHT_MM = 250;     // a roller longer than this is flagged (common printers' build height)
export const LOOP_ARC_MULT = 30;        // an offset self-crossing is removed as a swallowtail only within this many offset distances of arc
export const REVOLVE_SEGMENTS = 180;    // 2° — chord error 0.004 mm on a 32 mm radius
export const CONE_SIDES = 24;
export const GROOVE = { width: 2, depth: 1 };   // roller A's orientation mark, a V ring on its +Z end face (doc §4.6)

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul2 = (a, s) => [a[0] * s, a[1] * s];
const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];
const len2 = (a) => Math.hypot(a[0], a[1]);
const unit2 = (a) => { const l = len2(a) || 1; return [a[0] / l, a[1] / l]; };

/* ------------------------------------------------------------------ */
/* Frames and layout                                                    */
/* ------------------------------------------------------------------ */

/* The unrolled frame of roller X: its roll direction r̂ along its OWN chord tX
   and its axis â = ẑ × r̂ — 90° LEFT of the roll, for both rollers, so
   (r̂, â, ẑ) is right-handed and a ring point (s, z) sits at φ = −s / R_tip
   (doc §3.2). The user holds every roller with its +Z end on the LEFT as it
   rolls forward. tY is the other lattice vector: the step from one line of the
   family to the next. */
export function rollerFrame(tile, which) {
  const { tA, tB } = latticeVectors(tile);
  const tX = which === 'A' ? tA : tB, tY = which === 'A' ? tB : tA;
  const r = unit2(tX);
  const a = [-r[1], r[0]];
  return { tX, tY, r, a, pitch: which === 'A' ? tile.pitchA : tile.pitchB, toUnrolled: (P) => [dot2(P, r), dot2(P, a)] };
}

/* ONE period of ring 0's centreline in the unrolled frame: edge X from its
   first corner up to (not including) its second, which is the next copy's
   first. The ring is n of these, copy c moved by c·T, T = (|tX|, 0); the point
   after the last is the first moved by n·T = (C, 0) — the same point of the
   cylinder, so the ring closes on itself by construction (doc §3.2). */
export function ringPeriod(tile, which) {
  const F = rollerFrame(tile, which);
  const d = edgeDense(tile, which);
  const one = d.pts.slice(0, -1).map((p) => F.toUnrolled(p));
  return { one, T: [F.pitch, 0], frame: F };
}

/* All the derived numbers for both rollers: radii, the ring layout, the track
   column m*, the axial layout, the lengths and the roller-side flags. */
export function rollerLayout(tile, print, rollers) {
  const h = print.bladeHeight, td = print.dough;
  const theta = tile.angle * D2R;
  const wTip = print.bladeWall;
  const wRoot = wTip + 2 * (h + EMBED_MM) * Math.tan(print.draft * D2R);
  const out = { theta, wTip, wRoot, KA: rollers.cols, KB: rollers.rows, flags: [] };
  for (const which of ['A', 'B']) {
    const n = which === 'A' ? rollers.roundA : rollers.roundB;
    const rings = (which === 'A' ? rollers.rows : rollers.cols) + 1;
    const period = ringPeriod(tile, which), F = period.frame;
    const C = n * F.pitch, Rtip = C / TAU, Rbody = Rtip - h, Rroot = Rbody - EMBED_MM;
    const step = F.toUnrolled(F.tY);                     // ring j = ring 0 + j·step
    let z0 = Infinity, z1 = -Infinity;
    for (const [, z] of period.one) { z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const zs = [0, (rings - 1) * step[1]];
    out[which] = {
      which, n, rings, pitch: F.pitch, C, Rtip, Rbody, Rroot, period, frame: F, step, spacing: Math.abs(step[1]),
      ringZ: [z0 - wRoot / 2, z1 + wRoot / 2],             // ring 0's own axial extent, root included
      zmin: Math.min(...zs) + z0 - wRoot / 2, zmax: Math.max(...zs) + z1 + wRoot / 2,
      dTip: 2 * Rtip, dBody: 2 * Rbody,
    };
  }
  /* pegs and teeth (doc §4.3–4.4): a 45° cone whose tip stands δ into the dough;
     D = the dimple's diameter at the dough surface */
  const D = print.pegSize;
  const delta = Math.min(0.5 * td, D / 2 - PEG_TIP_MIN_MM);   // ≥ 0.7 over the ranges (dough ≥ 2, D ≥ 3)
  const pegTipR = D / 2 - delta;                          // the cone's radius at its tip
  out.peg = { D, delta, tipR: pegTipR };
  const A = out.A, B = out.B;
  A.pegTopRho = A.Rtip - td + delta;
  A.pegBase = coneBase(A.Rbody - EMBED_MM, A.pegTopRho, pegTipR, A.Rbody - print.cylWall);
  // the collar band and teeth on B
  B.bandH = Math.min(1.2, (h - td) / 2);
  B.toothTopRho = B.Rtip - td + delta - TOOTH_CLEARANCE_MM;
  B.toothTipR = Math.max(0.3, pegTipR - TOOTH_CLEARANCE_MM);
  B.toothBase = coneBase(B.Rbody + B.bandH - EMBED_MM, B.toothTopRho, B.toothTipR, B.Rbody - print.cylWall);
  B.bandW = 2 * (B.toothBase.r + B.bandH) + 1;           // its flat top runs 0.5 mm past the tooth's foot both ways
  // the flat tip needs 2·top² ≥ (tipR + top)² to sit with its rim at `top` (emitCone)
  for (const [nm, top, tr] of [['peg', A.pegTopRho, pegTipR], ['tooth', B.toothTopRho, B.toothTipR]])
    if (2 * top * top < (tr + top) * (tr + top)) out.flags.push({ id: 'pegWide', stl: true, text: `A ${D.toFixed(1)} mm ${nm} is too wide for a roller this small (its blunt tip would reach past the dough line). A smaller peg / tooth size or a larger roller. STL refused.` });
  /* m*: the track's column (doc §4.4) — the nearest column outside the block,
     on B's +Z side, whose collar clears B's nearest ring. A column's axial
     position on B is m·(tA·â_B) = −m·|tA| sin θ: positive for m < 0. */
  const colZ = (m) => B.frame.toUnrolled(mul2(B.frame.tY, m))[1];
  const collarHalf = B.bandW / 2;
  let mStar = -1;
  while (colZ(mStar) - collarHalf - COLLAR_CLEAR_MM < B.zmax && mStar > -20) mStar--;
  out.mStar = mStar;
  B.collarZu = colZ(mStar);                                // unrolled z of the collar's centre
  B.zminAll = B.zmin; B.zmaxAll = Math.max(B.zmax, B.collarZu + collarHalf);
  // A's pegs: on ring k at corner (m*, k), k = 0..rows — a slanted row across A
  A.zminAll = A.zmin; A.zmaxAll = A.zmax;
  for (let k = 0; k < A.rings; k++) {
    const z = k * A.step[1];
    A.zminAll = Math.min(A.zminAll, z - A.pegBase.r); A.zmaxAll = Math.max(A.zmaxAll, z + A.pegBase.r);
  }
  for (const R of [A, B]) {
    R.Z0 = END_MARGIN_MM - R.zminAll;
    R.L = R.Z0 + R.zmaxAll + END_MARGIN_MM;
  }
  B.collarZ = B.collarZu + B.Z0;
  // flags (doc §6)
  if (!(h > td + BODY_CLEARANCE_MM)) out.flags.push({ id: 'blade', stl: true, text: `Blade height ${h.toFixed(1)} mm must exceed the dough ${td.toFixed(1)} mm + ${BODY_CLEARANCE_MM} mm, or the roller's body presses the dough. STL refused.` });
  for (const R of [A, B]) {
    const need = print.bore / 2 + print.cylWall + EMBED_MM;
    if (R.Rbody < need) out.flags.push({ id: 'small' + R.which, stl: true, text: `Roller ${R.which} is too small: ${R.n} tiles of ${R.pitch.toFixed(1)} mm round it make a ${(2 * R.Rtip).toFixed(1)} mm roller, whose body (${(2 * R.Rbody).toFixed(1)} mm under ${h.toFixed(1)} mm blades) leaves less than one ${print.cylWall.toFixed(1)} mm wall around the ${print.bore.toFixed(1)} mm bore — it needs at least ${(2 * (need + h)).toFixed(1)} mm. More tiles round it, or a larger tile. STL refused.` });
  }
  const need = out.KA + 1 + Math.abs(mStar);
  if (A.n < need) out.flags.push({ id: 'pegRecur', text: `Roller A's pegs come round again at column ${mStar + A.n} — inside the cookie sheet (columns 0–${out.KA}): they would dimple that column's cookie corners. Give roller A at least ${need} tiles round it, or cut fewer cookies along edge A.` });
  for (const R of [A, B]) if (R.L > BUILD_HEIGHT_MM) out.flags.push({ id: 'length' + R.which, text: `Roller ${R.which} is ${R.L.toFixed(0)} mm long — longer than a common printer's ${BUILD_HEIGHT_MM} mm build height. Fewer cookies ${R.which === 'A' ? 'along edge B' : 'along edge A'}, or smaller tiles.` });
  for (const R of [A, B]) if (R.Rbody - print.cylWall - print.bore / 2 < 2 && R.Rbody >= print.bore / 2 + print.cylWall + EMBED_MM) out.flags.push({ id: 'solid' + R.which, text: `Roller ${R.which} has no room for a hollow: it prints solid around the bore (more plastic, no weaker).` });
  return out;
}
/* A 45° cone with its tip at radius `top` (tip radius tipR) and its base
   sunk so the base circle's rim stays inside radius `limit` (doc §4.3): solve
   ρ² + (tipR + top − ρ)² = limit² for the larger root. */
function coneBase(limit, top, tipR, inner = 0) {
  const c = tipR + top, disc = 2 * limit * limit - c * c;
  /* the larger root puts the base rim exactly on the limit (it is ≤ limit
     whenever c ≥ limit, which a cone standing out of its body always has).
     With no root, no 45° cone this tall fits inside a body this curved: its
     base rim, going round the roller, always clears the surface — its least
     reach is c/√2, at ρ = c/2 — so the base goes as deep as that.
     Either way the base stays in the wall, 0.3 mm above the hollow: the cone's
     sides may then show a little at the foot, ROUND the roller — vertical
     faces as printed, so no overhang — never on its underside. */
  const rho = Math.min(limit, Math.max(disc >= 0 ? (c + Math.sqrt(disc)) / 2 : c / 2, inner + 0.3));
  return { rho, r: tipR + (top - rho) };
}

/* ------------------------------------------------------------------ */
/* The SPEC — what the simulator rolls                                  */
/* ------------------------------------------------------------------ */

/* Ring j's centreline, the full circumference, in (φ, Z): n periods, copy c
   moved by c·T, then the whole ring moved by j·step. The corner of copy c is
   at index c·M. Closed: the point after the last is the first. */
function ringPoints(R, j) {
  const { one, T } = R.period, M = one.length, out = [];
  for (let c = 0; c < R.n; c++) for (let i = 0; i < M; i++) {
    const s = one[i][0] + c * T[0] + j * R.step[0], z = one[i][1] + c * T[1] + j * R.step[1];
    out.push([-s / R.Rtip, z + R.Z0]);
  }
  return out;
}
export function rollerSpec(tile, print, rollers, layout = rollerLayout(tile, print, rollers)) {
  const spec = { mStar: layout.mStar, KA: layout.KA, KB: layout.KB };
  for (const which of ['A', 'B']) {
    const R = layout[which], M = R.period.one.length;
    const rings = [];
    for (let j = 0; j < R.rings; j++) rings.push(ringPoints(R, j));
    const corners = []; for (let c = 0; c < R.n; c++) corners.push(c * M);
    spec[which] = { which, Rtip: R.Rtip, Rbody: R.Rbody, n: R.n, pitch: R.pitch, step: R.step.slice(), Z0: R.Z0, L: R.L, rings, corners };
  }
  // pegs: on A's ring k at the track corner (m*, k), k = 0..rows (doc §4.3)
  const A = layout.A, fA = A.frame;
  spec.A.pegs = [];
  for (let k = 0; k < A.rings; k++) {
    const [s, z] = fA.toUnrolled(add2(mul2(fA.tX, layout.mStar), mul2(fA.tY, k)));   // m*·tA + k·tB
    spec.A.pegs.push({ i: k, phi: -s / A.Rtip, Z: z + A.Z0, rho: A.pegTopRho });
  }
  // teeth: round B's collar, one per tile pitch, at the corners (m*, j) (doc §4.4)
  const B = layout.B, fB = B.frame;
  spec.B.teeth = [];
  for (let j = 0; j < B.n; j++) {
    const [s, z] = fB.toUnrolled(add2(mul2(fB.tY, layout.mStar), mul2(fB.tX, j)));   // m*·tA + j·tB
    spec.B.teeth.push({ i: j, phi: -s / B.Rtip, Z: z + B.Z0, rho: B.toothTopRho });
  }
  return spec;
}

/* ------------------------------------------------------------------ */
/* Mesh                                                                 */
/* ------------------------------------------------------------------ */

export class Mesh {
  constructor() { this.P = []; this.I = []; this.parts = []; this.cur = null; }
  begin(name) { this.cur = { name, v0: this.P.length / 3, t0: this.I.length / 3 }; }
  end() {
    const p = this.cur; p.v1 = this.P.length / 3; p.t1 = this.I.length / 3;
    // fix the shell's orientation by its signed volume: outward is positive
    if (signedVolume(this.P, this.I, p.t0, p.t1) < 0) for (let t = p.t0; t < p.t1; t++) { const a = this.I[3 * t + 1]; this.I[3 * t + 1] = this.I[3 * t + 2]; this.I[3 * t + 2] = a; }
    this.parts.push(p); this.cur = null; return p;
  }
  v(x, y, z) { this.P.push(x, y, z); return this.P.length / 3 - 1; }
  t(a, b, c) { if (a !== b && b !== c && a !== c) this.I.push(a, b, c); }
  get triangleCount() { return this.I.length / 3; }
  finish() { return { positions: Float64Array.from(this.P), indices: Uint32Array.from(this.I), parts: this.parts }; }
}
export function signedVolume(P, I, t0, t1) {
  let v = 0;
  for (let t = t0; t < t1; t++) {
    const a = 3 * I[3 * t], b = 3 * I[3 * t + 1], c = 3 * I[3 * t + 2];
    v += P[a] * (P[b + 1] * P[c + 2] - P[b + 2] * P[c + 1]) - P[a + 1] * (P[b] * P[c + 2] - P[b + 2] * P[c]) + P[a + 2] * (P[b] * P[c + 1] - P[b + 1] * P[c]);
  }
  return v / 6;
}

/* A closed profile in (r, z), revolved about Z. A vertex with r = 0 becomes one
   apex vertex (a fan); every other vertex a ring. */
function revolve(mesh, prof, segs = REVOLVE_SEGMENTS) {
  const rings = prof.map(([r, z]) => {
    if (r === 0) return [mesh.v(0, 0, z)];
    const ring = [];
    for (let j = 0; j < segs; j++) { const a = (TAU * j) / segs; ring.push(mesh.v(r * Math.cos(a), r * Math.sin(a), z)); }
    return ring;
  });
  for (let i = 0; i < prof.length; i++) {
    const A = rings[i], B = rings[(i + 1) % prof.length];
    if (A.length === 1 && B.length === 1) continue;
    for (let j = 0; j < segs; j++) {
      const j1 = (j + 1) % segs;
      if (A.length === 1) mesh.t(A[0], B[j], B[j1]);
      else if (B.length === 1) mesh.t(A[j], B[0], A[j1]);
      else { mesh.t(A[j], B[j], B[j1]); mesh.t(A[j], B[j1], A[j1]); }
    }
  }
}

/* The body profile (doc §3.5–3.6): the tube at the body radius with chamfered
   ends, the end caps with the bore, the cavity with a 45° ceiling; plus B's
   collar band and A's orientation groove. No rims: the rings are the rolling
   surface (§3.5). Counter-clockwise in (r, z). */
export function bodyProfile(R, print, opts = {}) {
  const { Rbody, L } = R;
  const rb = print.bore / 2, ch = 0.6, Rin = Rbody - print.cylWall;
  const p = [[rb, 0], [Rbody - ch, 0], [Rbody, ch]];
  if (opts.collar) {
    const { z, w, h } = opts.collar;
    p.push([Rbody, z - w / 2], [Rbody + h, z - w / 2 + h], [Rbody + h, z + w / 2 - h], [Rbody, z + w / 2]);
  }
  p.push([Rbody, L - ch], [Rbody - ch, L]);
  if (opts.groove) {
    const rg = (Rbody - ch + rb) / 2, gw = GROOVE.width, gd = GROOVE.depth;
    p.push([rg + gw / 2, L], [rg, L - gd], [rg - gw / 2, L]);
  }
  p.push([rb, L]);
  const roof = L - CAP_MM - (Rin - rb);
  if (Rin - rb >= 2 && roof - CAP_MM >= 2) {
    p.push([rb, L - CAP_MM], [Rin, roof], [Rin, CAP_MM], [rb, CAP_MM]);
  }
  return p;
}

/* Offset a PERIODIC polyline by d (left of travel for d > 0): one period
   `one` (M points), the point after the last being one[0] + T. Round joins on
   the outer side of a turn, both offset ends on the inner side (they cross),
   then the swallowtail loops removed — only short ones (LOOP_ARC_MULT·|d| of
   arc), so two far-apart stretches of a line that come close are never
   spliced together.
   A loop may straddle the period's start, so the raw offset of ONE period is
   laid five times (each copy the first moved by c·T, so the copies are exact
   translates and indexable) and cleaned in one pass; a point of the middle
   period that survived, and whose translate one period on survived too, is a
   SAFE cut: no removed loop contains it. The period from it to its translate
   is the answer. Returns { pts } — one period of the offset, the point after
   its last being pts[0] + T. */
export function offsetPeriodic(one, T, d) {
  const M = one.length;
  const at = (j) => (j < 0 ? sub2(one[j + M], T) : j >= M ? add2(one[j - M], T) : one[j]);
  const raw = [];
  for (let j = 0; j < M; j++) {
    const p = one[j];
    const t0 = unit2(sub2(p, at(j - 1))), t1 = unit2(sub2(at(j + 1), p));
    const n0 = [-t0[1], t0[0]], n1 = [-t1[1], t1[0]];
    const turn = cross2(t0, t1), c = dot2(t0, t1);
    if (Math.abs(turn) < 1e-12 && c > 0) { raw.push(add2(p, mul2(n1, d))); continue; }
    if (turn * d > 0) { raw.push(add2(p, mul2(n0, d)), add2(p, mul2(n1, d))); continue; }   // inner side: the ends cross
    // round join from n0 to n1 about p
    const a0 = Math.atan2(n0[1], n0[0]);
    let da = Math.atan2(n1[1], n1[0]) - a0;
    while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    const steps = Math.max(1, Math.ceil(Math.abs(da) / (15 * D2R)));
    for (let k = 0; k <= steps; k++) { const a = a0 + (da * k) / steps; raw.push(add2(p, [Math.cos(a) * d, Math.sin(a) * d])); }
  }
  const K = raw.length, all = [], index = new Map();
  for (let c = -2; c <= 2; c++) for (let e = 0; e < K; e++) { const q = [raw[e][0] + c * T[0], raw[e][1] + c * T[1]]; index.set(q, (c + 2) * K + e); all.push(q); }
  const Q = removeLoops(all, LOOP_ARC_MULT * Math.abs(d));
  const where = new Map(); Q.forEach((q, i) => { if (index.has(q)) where.set(index.get(q), i); });
  for (let e = 0; e < K; e++) {
    const a = where.get(2 * K + e), b = where.get(3 * K + e);
    if (a !== undefined && b !== undefined && b > a) return { pts: Q.slice(a, b) };
  }
  throw new Error('offsetPeriodic: no safe cut — the offset loops over a whole period');
}
function segX(p1, p2, p3, p4) {
  const d1 = cross2(sub2(p4, p3), sub2(p1, p3)), d2 = cross2(sub2(p4, p3), sub2(p2, p3));
  const d3 = cross2(sub2(p2, p1), sub2(p3, p1)), d4 = cross2(sub2(p2, p1), sub2(p4, p1));
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    const t = d1 / (d1 - d2);
    return add2(p1, mul2(sub2(p2, p1), t));
  }
  return null;
}
/* One forward pass: each new segment is tested against the recent ones (within
   maxArc of arc); a crossing truncates the polyline back to it — the loop
   between is dropped as it forms. O(n·k), k the segments within maxArc. A point
   that survives is pushed as the SAME array (offsetPeriodic finds it by that). */
function removeLoops(pts, maxArc) {
  const out = [pts[0]], cum = [0];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    let again = true;
    while (again) {
      again = false;
      const last = out.length - 1;
      for (let j = last - 2; j >= 0; j--) {
        if (cum[last] - cum[j + 1] > maxArc) break;
        const x = segX(out[j], out[j + 1], out[last], p);
        if (x) { out.length = j + 1; cum.length = j + 1; out.push(x); cum.push(cum[j] + len2(sub2(x, out[j]))); again = true; break; }
      }
    }
    const q = out[out.length - 1], l = len2(sub2(p, q));
    if (l > 1e-5) { out.push(p); cum.push(cum[cum.length - 1] + l); }   // 1e-5: closer points would weld in the float32 STL
  }
  return out;
}

/* Zip two polylines running the same way into a strip, by normalized arc length. */
function zip(mesh, P, Q) {
  const cum = (L) => { const c = [0]; for (let k = 1; k < L.length; k++) c.push(c[k - 1] + Math.hypot(L[k].x - L[k - 1].x, L[k].y - L[k - 1].y, L[k].z - L[k - 1].z)); const T = c[c.length - 1] || 1; return c.map((v) => v / T); };
  const cp = cum(P), cq = cum(Q);
  let i = 0, j = 0;
  while (i < P.length - 1 || j < Q.length - 1) {
    const advP = j === Q.length - 1 || (i < P.length - 1 && cp[i + 1] <= cq[j + 1]);
    if (advP) { mesh.t(P[i].id, P[i + 1].id, Q[j].id); i++; }
    else { mesh.t(P[i].id, Q[j + 1].id, Q[j].id); j++; }
  }
}
/* Zip two CLOSED loops running the same way: Q is started at its point nearest
   P's start, and both are closed by repeating their first vertex — the same
   vertex id, so the strip closes on itself with no seam vertex. */
function zipClosed(mesh, P, Q) {
  let best = Infinity, k0 = 0;
  for (let k = 0; k < Q.length; k++) { const e = Math.hypot(Q[k].x - P[0].x, Q[k].y - P[0].y, Q[k].z - P[0].z); if (e < best) { best = e; k0 = k; } }
  const Qr = [...Q.slice(k0), ...Q.slice(0, k0)];
  zip(mesh, [...P, P[0]], [...Qr, Qr[0]]);
}

/* One ring's geometry, built once and emitted rings times, moved (doc §3.4):
   the period offset ±w/2 at the tip radius in the tip's own unrolled metric,
   and ±w_root/2 at the root radius in the ROOT's (arc lengths shrink by
   R_root/R_tip there, which changes angles), each laid n times round. */
function ringGeometry(R, layout) {
  const k = R.Rroot / R.Rtip;
  const { one, T } = R.period;
  const root = one.map(([s, z]) => [s * k, z]), Troot = [T[0] * k, 0];
  const loop = (pts, Tp, rho, scale) => {
    const out = [];
    for (let c = 0; c < R.n; c++) for (const [s, z] of pts) out.push({ phi: -((s + c * Tp[0]) / scale) / R.Rtip, Z: z + c * Tp[1] + R.Z0, rho });
    return out;
  };
  return {
    Lt: loop(offsetPeriodic(one, T, layout.wTip / 2).pts, T, R.Rtip, 1),
    Rt: loop(offsetPeriodic(one, T, -layout.wTip / 2).pts, T, R.Rtip, 1),
    Lr: loop(offsetPeriodic(root, Troot, layout.wRoot / 2).pts, Troot, R.Rroot, k),
    Rr: loop(offsetPeriodic(root, Troot, -layout.wRoot / 2).pts, Troot, R.Rroot, k),
  };
}
/* Ring j: ring 0's tube turned by −step_s/R_tip and moved step_z along the
   axis — four closed loops zipped into four closed strips: a torus. */
function emitRing(mesh, g, R, j, name) {
  mesh.begin(name);
  const dphi = -(j * R.step[0]) / R.Rtip, dZ = j * R.step[1];
  const place = (L) => L.map((p) => { const a = p.phi + dphi, x = p.rho * Math.cos(a), y = p.rho * Math.sin(a), z = p.Z + dZ; return { id: mesh.v(x, y, z), x, y, z }; });
  const Lt = place(g.Lt), Rt = place(g.Rt), Rr = place(g.Rr), Lr = place(g.Lr);
  zipClosed(mesh, Lt, Rt); zipClosed(mesh, Rt, Rr); zipClosed(mesh, Rr, Lr); zipClosed(mesh, Lr, Lt);
  return mesh.end();
}
/* A 45° cone standing radially at (φ, Z): base at radius base.rho (radius
   base.r), tip at radius topRho (radius tipR). */
function emitCone(mesh, phi, Z, base, topRho, tipR, name) {
  mesh.begin(name);
  const er = [Math.cos(phi), Math.sin(phi), 0], et = [-Math.sin(phi), Math.cos(phi), 0];
  const ring = (rho, r) => {
    const ids = [];
    for (let k = 0; k < CONE_SIDES; k++) {
      const a = (TAU * k) / CONE_SIDES, u = Math.cos(a) * r, w = Math.sin(a) * r;
      ids.push(mesh.v(er[0] * rho + et[0] * u, er[1] * rho + et[1] * u, Z + w));
    }
    return ids;
  };
  /* the flat tip disk sits where its RIM, not its centre, reaches topRho — the
     45° side's own solution with the limit at the top — so the cone's furthest
     point from the axis is exactly topRho and the dimple exactly δ deep */
  const tip = coneBase(topRho, topRho, tipR);
  const b = ring(base.rho, base.r), t = ring(tip.rho, tip.r);
  const cb = mesh.v(er[0] * base.rho, er[1] * base.rho, Z), ct = mesh.v(er[0] * tip.rho, er[1] * tip.rho, Z);
  for (let k = 0; k < CONE_SIDES; k++) {
    const k1 = (k + 1) % CONE_SIDES;
    mesh.t(b[k], b[k1], t[k1]); mesh.t(b[k], t[k1], t[k]);
    mesh.t(cb, b[k1], b[k]); mesh.t(ct, t[k], t[k1]);
  }
  return mesh.end();
}

/* Build roller A or B. Returns { mesh, spec, layout, R }. */
export function buildRoller(tile, print, rollers, which, layout = rollerLayout(tile, print, rollers)) {
  const R = layout[which];
  const mesh = new Mesh();
  mesh.begin('body');
  const opts = which === 'B' ? { collar: { z: R.collarZ, w: R.bandW, h: R.bandH } } : { groove: true };
  revolve(mesh, bodyProfile(R, print, opts));
  mesh.end();
  const g = ringGeometry(R, layout);
  for (let j = 0; j < R.rings; j++) emitRing(mesh, g, R, j, `ring${j}`);
  const spec = rollerSpec(tile, print, rollers, layout);
  if (which === 'A') for (const pg of spec.A.pegs) emitCone(mesh, pg.phi, pg.Z, R.pegBase, R.pegTopRho, layout.peg.tipR, `peg${pg.i}`);
  else for (const th of spec.B.teeth) emitCone(mesh, th.phi, th.Z, R.toothBase, R.toothTopRho, R.toothTipR, `tooth${th.i}`);
  return { mesh: mesh.finish(), spec: spec[which], fullSpec: spec, layout, R };
}

/* The handle (doc §3.6): grip, 45° taper, shoulder, pin. Grip end down. */
export const HANDLE = { gripR: 13, gripL: 85, shoulderR: 9, shoulderT: 3 };
export function handleProfile(print) {
  const rp = print.bore / 2 - PIN_CLEARANCE_MM, { gripR, gripL, shoulderR, shoulderT } = HANDLE;
  const zTaper = gripL + (gripR - shoulderR), zSh = zTaper + shoulderT, zPin = zSh + CAP_MM + 3;
  return [[0, 0], [gripR - 1.5, 0], [gripR, 1.5], [gripR, gripL], [shoulderR, zTaper], [shoulderR, zSh], [rp, zSh], [rp, zPin - 0.8], [rp - 0.8, zPin], [0, zPin]];
}
export function buildHandle(print) {
  const mesh = new Mesh();
  mesh.begin('handle');
  revolve(mesh, handleProfile(print), 96);
  mesh.end();
  return { mesh: mesh.finish() };
}

/* Binary STL, millimetres. Refused (throws) when a flag refuses the design
   (doc §6) unless allowRefused — the gate and the sheet use that to look at a
   refused design. */
export class RefusedError extends Error {}
export function exportStl(model, label, opts = {}) {
  if (opts.layout && opts.layout.flags.some((f) => f.stl) && !opts.allowRefused) throw new RefusedError(opts.layout.flags.filter((f) => f.stl).map((f) => f.text).join(' '));
  const P = model.positions, I = model.indices, n = I.length / 3;
  const buf = new ArrayBuffer(84 + 50 * n), dv = new DataView(buf);
  const header = `Tessellation roller ${label} - eva-maskalenko.com/tile - mm`;
  for (let i = 0; i < 80; i++) dv.setUint8(i, i < header.length ? header.charCodeAt(i) & 0x7f : 32);
  dv.setUint32(80, n, true);
  let o = 84;
  for (let t = 0; t < n; t++) {
    const a = 3 * I[3 * t], b = 3 * I[3 * t + 1], c = 3 * I[3 * t + 2];
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
    const l = Math.hypot(nx, ny, nz) || 1;
    dv.setFloat32(o, nx / l, true); dv.setFloat32(o + 4, ny / l, true); dv.setFloat32(o + 8, nz / l, true); o += 12;
    for (const v of [a, b, c]) { dv.setFloat32(o, P[v], true); dv.setFloat32(o + 4, P[v + 1], true); dv.setFloat32(o + 8, P[v + 2], true); o += 12; }
    dv.setUint16(o, 0, true); o += 2;
  }
  return new Uint8Array(buf);
}

/* Everything the page needs, in one call. */
export function buildAll(tile, print, rollers) {
  const layout = rollerLayout(tile, print, rollers);
  const A = buildRoller(tile, print, rollers, 'A', layout);
  const B = buildRoller(tile, print, rollers, 'B', layout);
  const H = buildHandle(print);
  return { layout, A, B, H, spec: A.fullSpec };
}
