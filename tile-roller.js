/* tile-roller.js — the two cutting rollers and the handle, built from the tile.

   Pure ES module: no DOM, no three.js. Read tile-design-doc.md §3–§4 first:
   the roll directions, the circumference law and the index marks are derived
   there, and everything here implements that derivation and nothing else.

   ROLLER X (A carries the edge-A lines, B the edge-B lines) rolls along the
   OTHER lattice vector tY, so its lines are BARS across it, |tY| apart round
   its circumference (doc §3.1 — crossbars print upright, rings would not):
       r̂ = tY/|tY|, â = ẑ × r̂ (90° left of the roll),
       a sheet vector P maps to unrolled (s, z) = (P·r̂, P·â),
       circumference at the blade tip C = n·|tY|, R_tip = C / 2π,
       a bar point (s, z) sits at roller angle φ = −s / R_tip and height Z = z + Z0,
   the roller's +Z end held on the LEFT as it rolls forward. Bar j is bar 0
   turned by 2πj/n.

   Every solid is a CLOSED SHELL — the revolved body (rims, bore, cavity, the
   collar band, the orientation groove), each bar (four offset polylines zipped
   into a tube), each peg and tooth (a 45° cone) — and overlapping closed shells
   are unioned by the slicer. The roller SPEC (bar centrelines, pegs and teeth in
   (φ, Z)) is exported beside the mesh so tile-sim.js can roll it; the sim reads
   the rolling radius off the MESH, never off this file's numbers. */

import { edgeDense, latticeVectors } from './tile-geometry.js';

/* ------------------------------------------------------------------ */
/* Parameters and constants                                             */
/* ------------------------------------------------------------------ */

export const PRINT_DEFAULTS = { dough: 5, bladeHeight: 8, bladeWall: 1.2, draft: 2, cylWall: 3, pegSize: 6, bore: 8, minCookie: 8 };
export const ROLLER_DEFAULTS = { repeatsA: 5, repeatsB: 5, spanA: 4, spanB: 3 };
export const PRINT_RANGES = {
  dough: [2, 15, 0.5], bladeHeight: [4, 20, 0.5], bladeWall: [0.6, 3, 0.1], draft: [0, 10, 0.5],
  cylWall: [1.6, 8, 0.2], pegSize: [3, 12, 0.5], bore: [5, 14, 0.5], minCookie: [3, 30, 0.5],
};
export const ROLLER_RANGES = { repeatsA: [2, 12, 1], repeatsB: [2, 12, 1], spanA: [1, 8, 1], spanB: [1, 8, 1] };

export const BODY_CLEARANCE_MM = 1.5;   // blade height must exceed dough + this, or the body touches the dough
export const OVERRUN_MM = 3;            // each bar runs this far past its end corners, so its cut fully crosses the other family's outermost line
export const EMBED_MM = 0.4;            // blade roots sink this far into the body: overlapping shells, never touching faces
export const RIM_WIDTH_MM = 4;          // the rolling rim's band at the blade-tip radius (doc §3.5)
export const END_GAP_MM = 3;            // between a rim's 45° skirt and the nearest bar or collar
export const CAP_MM = 8;                // end-cap thickness = the axle's bearing length
export const PIN_CLEARANCE_MM = 0.25;   // the handle pin is this much under the bore, radially
export const PEG_TIP_MIN_MM = 0.8;      // a peg's blunt tip radius, at least
export const TOOTH_CLEARANCE_MM = 0.3;  // a tooth is the peg's cone this much smaller, and this much shorter, so it seats on the dimple's wall
export const COLLAR_CLEAR_MM = 1.5;     // the collar stands this far clear of the nearest bar, overrun included
export const BUILD_HEIGHT_MM = 250;     // a roller longer than this is flagged (common printers' build height)
export const OVERHANG_DEG = 30;         // bar segments flatter than this from horizontal (upright print) are flagged as needing support
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

/* The unrolled frame of roller X: its roll direction r̂ (along the other lattice
   vector) and its axis â = ẑ × r̂ — 90° LEFT of the roll, for both rollers, so
   (r̂, â, ẑ) is right-handed and a bar point (s, z) sits at φ = −s / R_tip
   (doc §3.2). The user holds every roller with its +Z end on the LEFT as it
   rolls forward; the bars may run toward −Z (roller A's do at θ = 90°). */
export function rollerFrame(tile, which) {
  const { tA, tB } = latticeVectors(tile);
  const tX = which === 'A' ? tA : tB, tY = which === 'A' ? tB : tA;
  const r = unit2(tY);
  const a = [-r[1], r[0]];
  return { tX, tY, r, a, toUnrolled: (P) => [dot2(P, r), dot2(P, a)] };
}

/* The bar's centreline in the unrolled frame: K copies of the edge, corner to
   corner, plus OVERRUN_MM past each end corner along the periodic chain.
   corners[m] is the index of corner m (m = 0..K) in the returned polyline. */
export function barCenterline(tile, which, K) {
  const F = rollerFrame(tile, which);
  const d = edgeDense(tile, which);
  const t = d.t;
  const one = d.pts.map((p) => F.toUnrolled(p));
  const tu = F.toUnrolled(t);
  let Lcopy = 0;
  for (let k = 1; k < one.length; k++) Lcopy += len2(sub2(one[k], one[k - 1]));
  // copies -1 .. K, then trimmed to [Lcopy - o, (K + 1) Lcopy + o] of arc
  const pts = [];
  for (let c = -1; c <= K; c++) {
    const off = mul2(tu, c);
    for (let k = c === -1 ? 0 : 1; k < one.length; k++) pts.push(add2(one[k], off));
  }
  const cornerIdx = [];                        // corner m sits at copy boundary m
  const per = one.length - 1;
  for (let m = 0; m <= K; m++) cornerIdx.push(per * (m + 1));
  // trim by arc length
  const cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + len2(sub2(pts[k], pts[k - 1])));
  const o = Math.min(OVERRUN_MM, 0.45 * Lcopy);
  const s0 = cum[cornerIdx[0]] - o, s1 = cum[cornerIdx[K]] + o;
  const at = (s) => {
    let k = 1; while (k < cum.length - 1 && cum[k] < s) k++;
    const f = (s - cum[k - 1]) / ((cum[k] - cum[k - 1]) || 1);
    return { k, p: add2(pts[k - 1], mul2(sub2(pts[k], pts[k - 1]), f)) };
  };
  const a = at(s0), b = at(s1);
  const out = [a.p];
  for (let k = a.k; k < b.k; k++) out.push(pts[k]);
  out.push(b.p);
  const shift = a.k - 1;                        // pts index k -> out index k - shift
  const corners = cornerIdx.map((i) => i - shift);
  // drop exact duplicates the trim may leave (never a corner)
  const clean = [out[0]], remap = [0];
  for (let k = 1; k < out.length; k++) {
    if (len2(sub2(out[k], clean[clean.length - 1])) < 1e-9) { remap.push(clean.length - 1); continue; }
    remap.push(clean.length); clean.push(out[k]);
  }
  return { pts: clean, corners: corners.map((i) => remap[i]), frame: F, tu, overrun: o };
}

/* All the derived numbers for both rollers: radii, the collar row k*, the axial
   layout, the lengths and the roller-side flags. */
export function rollerLayout(tile, print, rollers) {
  const h = print.bladeHeight, td = print.dough;
  const theta = tile.angle * D2R;
  const wTip = print.bladeWall;
  const wRootAt = (depth) => wTip + 2 * depth * Math.tan(print.draft * D2R);
  const out = { theta, wTip, wRoot: wRootAt(h + EMBED_MM), flags: [] };
  for (const which of ['A', 'B']) {
    const n = which === 'A' ? rollers.repeatsA : rollers.repeatsB;
    const K = which === 'A' ? rollers.spanA : rollers.spanB;
    const pitchRoll = which === 'A' ? tile.pitchB : tile.pitchA;
    const C = n * pitchRoll, Rtip = C / TAU, Rbody = Rtip - h, Rroot = Rbody - EMBED_MM;
    const bar = barCenterline(tile, which, K);
    let zmin = Infinity, zmax = -Infinity;
    for (const [, z] of bar.pts) { zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); }
    const half = out.wRoot / 2;
    out[which] = { which, n, K, pitchRoll, C, Rtip, Rbody, Rroot, bar, zmin: zmin - half, zmax: zmax + half, dTip: 2 * Rtip, dBody: 2 * Rbody };
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
  B.bandW = 2 * B.toothBase.r + 1;
  // the flat tip needs 2·top² ≥ (tipR + top)² to sit with its rim at `top` (emitCone)
  for (const [nm, top, tr] of [['peg', A.pegTopRho, pegTipR], ['tooth', B.toothTopRho, B.toothTipR]])
    if (2 * top * top < (tr + top) * (tr + top)) out.flags.push({ id: 'pegWide', stl: true, text: `A ${D.toFixed(1)} mm ${nm} is too wide for a roller this small (its blunt tip would reach past the dough line). A smaller peg / tooth size or a larger roller. STL refused.` });
  // A's z-extent includes its pegs on bar 0's corners
  const fA = A.bar.frame;
  for (let m = 0; m <= A.K; m++) {
    const z = fA.toUnrolled(mul2(fA.tX, m))[1];
    A.zmin = Math.min(A.zmin, z - A.pegBase.r); A.zmax = Math.max(A.zmax, z + A.pegBase.r);
  }
  // k*: the nearest row below the bars whose collar clears them (doc §4.4)
  const rowZ = dot2(B.bar.frame.tX, B.bar.frame.a);    // a row's axial pitch on B: tB·â_B = pitchB·sin θ > 0
  const collarHalf = B.bandW / 2;
  let kStar = -1;
  while ((kStar * rowZ) + collarHalf + COLLAR_CLEAR_MM > B.zmin && kStar > -20) kStar--;
  out.kStar = kStar;
  B.collarZu = kStar * rowZ;                            // unrolled z of the collar's centre
  B.zminAll = Math.min(B.zmin, B.collarZu - collarHalf);
  A.zminAll = A.zmin;
  for (const R of [A, B]) {
    const start = RIM_WIDTH_MM + (R.Rtip - R.Rbody) + END_GAP_MM;
    R.Z0 = start - R.zminAll;
    R.L = R.Z0 + R.zmax + END_GAP_MM + (R.Rtip - R.Rbody) + RIM_WIDTH_MM;
  }
  B.collarZ = B.collarZu + B.Z0;
  // flags (doc §6)
  if (!(h > td + BODY_CLEARANCE_MM)) out.flags.push({ id: 'blade', stl: true, text: `Blade height ${h.toFixed(1)} mm must exceed the dough ${td.toFixed(1)} mm + ${BODY_CLEARANCE_MM} mm, or the roller's body presses the dough. STL refused.` });
  for (const R of [A, B]) {
    const need = print.bore / 2 + print.cylWall + EMBED_MM;
    if (R.Rbody < need) out.flags.push({ id: 'small' + R.which, stl: true, text: `Roller ${R.which} is too small: ${R.n} repeats of ${R.pitchRoll.toFixed(1)} mm make a ${(2 * R.Rtip).toFixed(1)} mm roller, whose body (${(2 * R.Rbody).toFixed(1)} mm under ${h.toFixed(1)} mm blades) leaves less than one ${print.cylWall.toFixed(1)} mm wall around the ${print.bore.toFixed(1)} mm bore — it needs at least ${(2 * (need + h)).toFixed(1)} mm. More repeats, or a larger tile. STL refused.` });
  }
  const need = B.K + 1 + Math.abs(kStar);
  if (A.n < need) out.flags.push({ id: 'pegRecur', text: `Roller A's pegged bar comes round again at row ${kStar + A.n} — inside the cookie block (rows 0–${B.K}): it would dimple that row's cookie corners. Give roller A at least ${need} repeats, or roller B fewer rows.` });
  for (const R of [A, B]) if (R.L > BUILD_HEIGHT_MM) out.flags.push({ id: 'length' + R.which, text: `Roller ${R.which} is ${R.L.toFixed(0)} mm long — longer than a common printer's ${BUILD_HEIGHT_MM} mm build height. Fewer tiles across it, or smaller tiles.` });
  for (const R of [A, B]) {
    const o = overhangShare(R.bar.pts);
    R.overhang = o;
    if (o.share > 0.005) out.flags.push({ id: 'overhang' + R.which, text: `${(100 * o.share).toFixed(1)}% of roller ${R.which}'s blade runs flatter than ${OVERHANG_DEG}° from horizontal as printed upright — it will want support there.` });
  }
  for (const R of [A, B]) if (R.Rbody - print.cylWall - print.bore / 2 < 2 && R.Rbody >= print.bore / 2 + print.cylWall + EMBED_MM) out.flags.push({ id: 'solid' + R.which, text: `Roller ${R.which} has no room for a hollow: it prints solid around the bore (more plastic, no weaker).` });
  return out;
}
/* A 45° cone with its tip at radius `top` (tip radius tipR) and its base
   sunk so the base circle's rim stays inside radius `limit` (doc §5): solve
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
/* the share of the bar's length whose direction is flatter than OVERHANG_DEG
   from the circumferential (horizontal, printed upright) direction */
export function overhangShare(pts) {
  let flat = 0, all = 0;
  const lim = Math.tan(OVERHANG_DEG * D2R);
  for (let k = 1; k < pts.length; k++) {
    const ds = pts[k][0] - pts[k - 1][0], dz = pts[k][1] - pts[k - 1][1];
    const l = Math.hypot(ds, dz);
    all += l;
    if (Math.abs(dz) < lim * Math.abs(ds)) flat += l;
  }
  return { share: all ? flat / all : 0, flatMm: flat, totalMm: all };
}

/* ------------------------------------------------------------------ */
/* The SPEC — what the simulator rolls                                  */
/* ------------------------------------------------------------------ */

export function rollerSpec(tile, print, rollers, layout = rollerLayout(tile, print, rollers)) {
  const spec = {};
  for (const which of ['A', 'B']) {
    const R = layout[which];
    const toRoller = ([s, z]) => [-s / R.Rtip, z + R.Z0];
    const base = R.bar.pts.map(toRoller);
    const bars = [];
    for (let j = 0; j < R.n; j++) {
      const dphi = (TAU * j) / R.n;
      bars.push(base.map(([phi, Z]) => [phi - dphi, Z]));
    }
    spec[which] = { which, Rtip: R.Rtip, Rbody: R.Rbody, n: R.n, K: R.K, pitchRoll: R.pitchRoll, Z0: R.Z0, L: R.L, bars, corners: R.bar.corners.slice() };
  }
  // pegs: on bar 0 of A, at its corners m = 0..K_A (doc §4.3)
  const A = layout.A, fA = A.bar.frame;
  spec.A.pegs = [];
  for (let m = 0; m <= A.K; m++) {
    const [s, z] = fA.toUnrolled(mul2(fA.tX, m));
    spec.A.pegs.push({ m, phi: -s / A.Rtip, Z: z + A.Z0, rho: A.pegTopRho });
  }
  // teeth: one per bar of B, on row k* (doc §4.4)
  const B = layout.B, fB = B.bar.frame;
  spec.B.teeth = [];
  for (let m = 0; m < B.n; m++) {
    const P = add2(mul2(fB.tY, m), mul2(fB.tX, layout.kStar));      // m·tA + k*·tB  (for B, tY = tA, tX = tB)
    const [s, z] = fB.toUnrolled(P);
    spec.B.teeth.push({ m, phi: -s / B.Rtip, Z: z + B.Z0, rho: B.toothTopRho });
  }
  spec.kStar = layout.kStar;
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

/* The body profile (doc §3.5–3.6): rims at the tip radius with 45° skirts, the
   tube, the end caps with the bore, the cavity with a 45° ceiling; plus B's
   collar band and A's orientation groove. Counter-clockwise in (r, z). */
export function bodyProfile(R, print, opts = {}) {
  const { Rtip, Rbody, L } = R;
  const rb = print.bore / 2, ch = 0.6, sk = Rtip - Rbody, Rin = Rbody - print.cylWall;
  const p = [[rb, 0], [Rtip - ch, 0], [Rtip, ch], [Rtip, RIM_WIDTH_MM], [Rbody, RIM_WIDTH_MM + sk]];
  if (opts.collar) {
    const { z, w, h } = opts.collar;
    p.push([Rbody, z - w / 2], [Rbody + h, z - w / 2 + h], [Rbody + h, z + w / 2 - h], [Rbody, z + w / 2]);
  }
  p.push([Rbody, L - RIM_WIDTH_MM - sk], [Rtip, L - RIM_WIDTH_MM], [Rtip, L - ch], [Rtip - ch, L]);
  if (opts.groove) {
    const rg = (Rtip + rb + 5) / 2, gw = GROOVE.width, gd = GROOVE.depth;
    p.push([rg + gw / 2, L], [rg, L - gd], [rg - gw / 2, L]);
  }
  p.push([rb, L]);
  const roof = L - CAP_MM - (Rin - rb);
  if (Rin - rb >= 2 && roof - CAP_MM >= 2) {
    p.push([rb, L - CAP_MM], [Rin, roof], [Rin, CAP_MM], [rb, CAP_MM]);
  }
  return p;
}

/* Offset an OPEN polyline by d (left of travel for d > 0): round joins on the
   outer side of a turn, both offset ends on the inner side (they cross), then
   the swallowtail loops removed — only short ones (LOOP_ARC_MULT·|d| of arc), so
   two far-apart stretches of a line that come close are never spliced
   together. Returns { pts, kept } (kept = unremoved long-range crossings). */
export function offsetOpen(poly, d) {
  const n = poly.length;
  const tan = [], nrm = [];
  for (let i = 0; i + 1 < n; i++) { const t = unit2(sub2(poly[i + 1], poly[i])); tan.push(t); nrm.push([-t[1], t[0]]); }
  const out = [add2(poly[0], mul2(nrm[0], d))];
  for (let i = 1; i < n - 1; i++) {
    const t0 = tan[i - 1], t1 = tan[i], n0 = nrm[i - 1], n1 = nrm[i];
    const turn = cross2(t0, t1), c = dot2(t0, t1);
    if (Math.abs(turn) < 1e-12 && c > 0) { out.push(add2(poly[i], mul2(n1, d))); continue; }
    const inner = turn * d > 0;
    if (inner) { out.push(add2(poly[i], mul2(n0, d)), add2(poly[i], mul2(n1, d))); continue; }
    // round join from n0 to n1 about poly[i]
    const a0 = Math.atan2(n0[1], n0[0]);
    let da = Math.atan2(n1[1], n1[0]) - a0;
    while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    const steps = Math.max(1, Math.ceil(Math.abs(da) / (15 * D2R)));
    for (let k = 0; k <= steps; k++) { const a = a0 + (da * k) / steps; out.push(add2(poly[i], [Math.cos(a) * d, Math.sin(a) * d])); }
  }
  out.push(add2(poly[n - 1], mul2(nrm[n - 2], d)));
  return removeLoops(out, LOOP_ARC_MULT * Math.abs(d));
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
   between is dropped as it forms. O(n·k), k the segments within maxArc. */
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
  return { pts: out, kept: 0 };
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

/* One bar as a closed tube (doc §3.4): the centreline offset ±w/2 at the tip
   radius in the tip's own unrolled metric, and ±w_root/2 at the root radius in
   the ROOT's (arc lengths shrink by R_root/R_tip there, which changes angles),
   zipped into four strips, two end caps. Built once, emitted n times turned. */
function barGeometry(R, layout) {
  const k = R.Rroot / R.Rtip;
  const cen = R.bar.pts;
  const tipL = offsetOpen(cen, layout.wTip / 2), tipR = offsetOpen(cen, -layout.wTip / 2);
  const root = cen.map(([s, z]) => [s * k, z]);
  const rootL = offsetOpen(root, layout.wRoot / 2), rootR = offsetOpen(root, -layout.wRoot / 2);
  const toCyl = (pts, rho, scale) => pts.pts.map(([s, z]) => ({ phi: -(s / scale) / R.Rtip, Z: z + R.Z0, rho }));
  return {
    Lt: toCyl(tipL, R.Rtip, 1), Rt: toCyl(tipR, R.Rtip, 1),
    Lr: toCyl(rootL, R.Rroot, k), Rr: toCyl(rootR, R.Rroot, k),
    kept: tipL.kept + tipR.kept + rootL.kept + rootR.kept,
  };
}
function emitBar(mesh, g, dphi, name) {
  mesh.begin(name);
  const place = (L) => L.map((p) => ({ id: mesh.v(p.rho * Math.cos(p.phi - dphi), p.rho * Math.sin(p.phi - dphi), p.Z), x: p.rho * Math.cos(p.phi - dphi), y: p.rho * Math.sin(p.phi - dphi), z: p.Z }));
  const Lt = place(g.Lt), Rt = place(g.Rt), Rr = place(g.Rr), Lr = place(g.Lr);
  zip(mesh, Lt, Rt); zip(mesh, Rt, Rr); zip(mesh, Rr, Lr); zip(mesh, Lr, Lt);
  const s = 0, e = (L) => L.length - 1;
  mesh.t(Lt[s].id, Rt[s].id, Rr[s].id); mesh.t(Lt[s].id, Rr[s].id, Lr[s].id);
  mesh.t(Lt[e(Lt)].id, Lr[e(Lr)].id, Rr[e(Rr)].id); mesh.t(Lt[e(Lt)].id, Rr[e(Rr)].id, Rt[e(Rt)].id);
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
  const g = barGeometry(R, layout);
  for (let j = 0; j < R.n; j++) emitBar(mesh, g, (TAU * j) / R.n, `bar${j}`);
  const spec = rollerSpec(tile, print, rollers, layout);
  if (which === 'A') for (const pg of spec.A.pegs) emitCone(mesh, pg.phi, pg.Z, R.pegBase, R.pegTopRho, layout.peg.tipR, `peg${pg.m}`);
  else for (const th of spec.B.teeth) emitCone(mesh, th.phi, th.Z, R.toothBase, R.toothTopRho, R.toothTipR, `tooth${th.m}`);
  return { mesh: mesh.finish(), spec: spec[which], fullSpec: spec, layout, R, loopsKept: g.kept };
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

/* Binary STL, millimetres. Refused (throws) when the blade cannot clear the
   dough (doc §6.3) unless allowBelowFloor — the gate and the sheet use that to
   look at a refused design. */
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
