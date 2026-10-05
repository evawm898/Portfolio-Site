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

   Every solid is a CLOSED SHELL — the revolved body (bore, cavity, the
   detent notch cut in both end faces, A's orientation groove), each ring
   (four offset loops zipped into a closed tube: a torus, no end caps), each of
   A's fiducial pins — and overlapping closed shells are unioned by the
   slicer. The handle (one design per roller, two of each) is closed shells
   too: the revolved grip and axle pin, the spring tab and its nub, the sight
   arm and its pointer. The roller SPEC (ring centrelines and pins in (φ, Z),
   the start and notch angles) is exported beside the mesh so tile-sim.js can
   roll it; the sim reads the rolling radius, the notch and the handle off the
   MESHES, never off this file's numbers. */

import { edgeDense, latticeVectors } from './tile-geometry.js';

/* ------------------------------------------------------------------ */
/* Parameters and constants                                             */
/* ------------------------------------------------------------------ */

export const PRINT_DEFAULTS = { dough: 5, bladeHeight: 8, bladeWall: 1.2, draft: 2, cylWall: 3, pinSize: 3, bore: 8, minCookie: 8 };
/* round: tiles round each roller's circumference (C = round × its own pitch);
   cols / rows: the cookie sheet, cookies along edge A and along edge B —
   roller B carries cols + 1 rings, roller A rows + 1 (doc §3.3). */
export const ROLLER_DEFAULTS = { roundA: 6, roundB: 5, cols: 4, rows: 3 };
export const PRINT_RANGES = {
  dough: [2, 15, 0.5], bladeHeight: [4, 20, 0.5], bladeWall: [0.6, 3, 0.1], draft: [0, 10, 0.5],
  cylWall: [1.6, 8, 0.2], pinSize: [1.5, 6, 0.5], bore: [5, 14, 0.5], minCookie: [3, 30, 0.5],
};
export const ROLLER_RANGES = { roundA: [2, 12, 1], roundB: [2, 12, 1], cols: [1, 8, 1], rows: [1, 8, 1] };

export const BODY_CLEARANCE_MM = 1.5;   // blade height must exceed dough + this, or the body touches the dough
export const EMBED_MM = 0.4;            // blade roots sink this far into the body: overlapping shells, never touching faces
export const END_MARGIN_MM = 3;         // the body runs at least this far past the outermost blade root or pin
export const CAP_MM = 8;                // end-cap thickness = the axle's bearing length
export const PIN_CLEARANCE_MM = 0.25;   // the handle pin is this much under the bore, radially
export const PIN_NECK_CLEAR_MM = 0.5;   // a fiducial pin is its own width through the dough and this far above it, then flares 45° to the body
export const EDGE_CLEAR_MM = 2;
export const IMPOSTOR_MM = 3;          // another pair of A's pinholes within this of B's pointer span…
export const IMPOSTOR_DEG = 10;        // …and within this of its direction could be mistaken for the right pair (doc §4.2)         // a fiducial pinhole stands at least its own radius + this in from the dough's edge
export const BUILD_HEIGHT_MM = 250;     // a roller longer than this is flagged (common printers' build height)
export const LOOP_ARC_MULT = 30;        // an offset self-crossing is removed as a swallowtail only within this many offset distances of arc
export const REVOLVE_SEGMENTS = 180;    // 2° — chord error 0.004 mm on a 32 mm radius
export const CONE_SIDES = 24;
export const GROOVE = { width: 2, depth: 1 };   // roller A's orientation mark, a V ring on its +Z end face (doc §4.7)
/* The detent (doc §4.3): a V notch cut radially into each end face, 90° across,
   `depth` deep, running `halfLen` either side of the nub's radius; the handle's
   spring tab carries a 45° nub that drops into it. */
export const DETENT = { depth: 0.6, halfLen: 2, tabMin: 6 };
/* The handle (doc §4.4): a grip on the axle; a bearing boss; a spring tab with
   the nub (up, opposite the arm); the sight arm (down) ending in a pointer that
   hovers `hover` above the dough on the contact line. Both stand `gap` off the
   roller's end face, so the arm's mid-plane is gap + plateT/2 past it. */
export const HANDLE = { gripR: 13, gripL: 85, shoulderT: 5, bossClear: 2.5, gap: 0.5, plateT: 3, tabT: 1.2, tabW: 6, armW: 6, ptrLen: 5, ptrR: 1.5, ptrTip: 0.2, nubTip: 0.2, nubClear: 0.1, hover: 0.5 };

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul2 = (a, s) => [a[0] * s, a[1] * s];
const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];
const len2 = (a) => Math.hypot(a[0], a[1]);
const unit2 = (a) => { const l = len2(a) || 1; return [a[0] / l, a[1] / l]; };
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));

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

/* The handle's and the detent's radii, from the bore (doc §4.3–4.4): the
   bearing boss, and how far the arm's mid-plane stands past the end face. The
   nub's radius is per roller (as far out as the end face allows, so the tab is
   long and springs). */
export function detentGeom(print) {
  const rp = print.bore / 2 - PIN_CLEARANCE_MM, rs = print.bore / 2 + HANDLE.bossClear;
  return { rp, rs, g: HANDLE.gap + HANDLE.plateT / 2 };
}
/* the nub's radius on roller R: the notch's outer end 0.5 mm inside the
   chamfer — and on A also 1 mm clear of the orientation groove */
export function notchRadius(R, which) {
  const ch = 0.6;
  return which === 'A' ? grooveRadius(R) - GROOVE.width / 2 - 1 - DETENT.halfLen : R.Rbody - ch - 0.5 - DETENT.halfLen;
}
export const grooveRadius = (R) => R.Rbody - 0.6 - 1.5;

/* lattice point (u, v) = u·tA + v·tB */
const lat = (tA, tB, u, v) => [u * tA[0] + v * tB[0], u * tA[1] + v * tB[1]];

/* All the derived numbers for both rollers: radii, the ring layout, the start
   poses, the sight fiducials, the axial layout, the lengths and the
   roller-side flags. */
export function rollerLayout(tile, print, rollers) {
  const h = print.bladeHeight, td = print.dough;
  const theta = tile.angle * D2R;
  const wTip = print.bladeWall;
  const wRoot = wTip + 2 * (h + EMBED_MM) * Math.tan(print.draft * D2R);
  const out = { theta, wTip, wRoot, KA: rollers.cols, KB: rollers.rows, flags: [] };
  const { tA, tB } = latticeVectors(tile);
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
  const A = out.A, B = out.B;
  const dg = detentGeom(print);
  out.detent = dg;
  const pinR = print.pinSize / 2;

  /* THE SIGHT FIDUCIALS (doc §4.2). B's handles carry a pointer each, g past
     each end face, on B's contact line — the straight line, along B's axis,
     where it touches the sheet. Placed at its start pose with both pointers on
     A's pinholes, B is fixed. A pointer cannot stand over a point under the
     roller, so the pointers sit past the ends, at the axial positions of B's
     virtual columns −j and cols + j: z'(u) = −u·|tA| sin θ from ring 0, j the
     fewest whole columns that leave every blade root END_MARGIN inside the
     faces. On B's contact line those two points are (u, v) with
     v(cols + j) − v(−j) = −(cols + 2j)·ρ, ρ = |tA| cos θ / |tB|: the line is
     square to tB. At 90° ρ = 0 and both are corners of row 0, on A's first
     ring; otherwise one is a corner (the higher, at a whole row inside the
     sheet's rows) and the other is a post between A's rings, in the side
     border — S = (cols + 2j)|ρ| rows lower. */
  const s = B.spacing;                                   // |tA| sin θ: B's ring spacing = one column, axially
  const jTop0 = Math.max(1, Math.ceil((B.ringZ[1] + END_MARGIN_MM + dg.g) / s - 1e-9));
  const jBot0 = Math.max(1, Math.ceil((dg.g + END_MARGIN_MM - B.ringZ[0]) / s - 1e-9));
  const rho = Math.abs(Math.cos(theta)) < 1e-12 ? 0 : (tile.pitchA * Math.cos(theta)) / tile.pitchB;
  const sOf = (u, v) => u * tile.pitchA + v * tile.pitchB * Math.cos(theta);
  const fA = A.frame;
  /* one candidate placement of the fiducials: jT columns past B's +Z end,
     jB past its −Z end */
  const plan = (jT, jB) => {
    const S = (rollers.cols + jT + jB) * Math.abs(rho);
    let vHi, vLo;
    if (S < 1e-9) { vHi = 0; vLo = 0; }
    else if (S <= rollers.rows + 1e-9) { vHi = Math.ceil(S - 1e-9); vLo = vHi - S; }
    else { vLo = 0; vHi = S; }
    const uLo = -jT, uHi = rollers.cols + jB;
    const vAt = rho > 0 ? [vHi, vLo] : rho < 0 ? [vLo, vHi] : [0, 0];
    const pts = [[uLo, vAt[0]], [uHi, vAt[1]]];
    const keyPts = [[0, 0], [rollers.cols, 0], [0, rollers.rows], [rollers.cols, rollers.rows], ...pts];
    const sMin = Math.min(...keyPts.map(([u, v]) => sOf(u, v))), sMax = Math.max(...keyPts.map(([u, v]) => sOf(u, v)));
    const a0 = Math.floor((sMin - pinR - EDGE_CLEAR_MM) / tile.pitchA + 1e-9);
    const rollEnd = sMax + pinR + EDGE_CLEAR_MM - a0 * tile.pitchA;
    const pins = [];
    for (const [u, v] of pts) {
      const [ps, pz] = fA.toUnrolled(sub2(lat(tA, tB, u, v), lat(tA, tB, a0, 0)));
      const sm = ((ps % A.C) + A.C) % A.C;
      /* two fiducials a whole revolution apart are ONE pin: it lays the second
         on its next time round (the default design: n_A = cols + 2j) */
      if (pins.some((p) => Math.abs(wrapPi(TAU * (p.s - sm) / A.C)) * A.Rtip < 1e-6 && Math.abs(p.z - pz) < 1e-6)) continue;
      pins.push({ i: pins.length, u, v, s: sm, z: pz });
    }
    /* every pinhole A lays rolling forward from the edge: each pin at u + k·n_A */
    const holes = [];
    for (const p of pins) for (let k = -20; k <= 20; k++) {
      const u = p.u + k * A.n, sk = sOf(u, p.v) - a0 * tile.pitchA;
      if (sk >= -1e-9 && sk <= rollEnd + 1e-9) holes.push({ u, v: p.v, at: lat(tA, tB, u, p.v) });
    }
    /* an IMPOSTOR: another pair of pinholes a person could take for B's —
       within IMPOSTOR_MM of the pointers' span and IMPOSTOR_DEG of their
       direction — that is not the true pair moved whole revolutions of A
       (which registers B exactly, a revolution along) */
    const P1 = lat(tA, tB, ...pts[0]), P2 = lat(tA, tB, ...pts[1]);
    const span = len2(sub2(P2, P1)), dir = Math.atan2(P2[1] - P1[1], P2[0] - P1[0]);
    const shift = (h, [u, v]) => (Math.abs(h.v - v) < 1e-9 && Math.abs((h.u - u) / A.n - Math.round((h.u - u) / A.n)) < 1e-9 ? Math.round((h.u - u) / A.n) : null);
    let impostor = null;
    for (const X of holes) { for (const Y of holes) {
      if (X === Y) continue;
      const d = sub2(Y.at, X.at), l = len2(d);
      if (Math.abs(l - span) > IMPOSTOR_MM || Math.abs(wrapPi(Math.atan2(d[1], d[0]) - dir)) > IMPOSTOR_DEG * D2R) continue;
      const kx = shift(X, pts[0]), ky = shift(Y, pts[1]);
      if (kx !== null && kx === ky) continue;
      impostor = { X, Y, off: l - span }; break;
    } if (impostor) break; }
    return { jT, jB, S, pts, a0, rollEnd, pins, holes, span, impostor };
  };
  let best = null;
  for (let extra = 0; extra <= 4 && !best; extra++) for (let x = 0; x <= extra; x++) {
    const p = plan(jTop0 + x, jBot0 + extra - x);
    if (!p.impostor) { best = p; break; }
  }
  const impostorLeft = !best;
  if (!best) best = plan(jTop0, jBot0);
  const { jT, jB, S } = best;
  out.sight = { j: Math.max(jT, jB), jT, jB, rho, S, pts: best.pts, g: dg.g, holes: best.holes, impostor: best.impostor };

  /* B: its start angle puts its contact line through both fiducials (s' of
     either: they agree — the line is square to tB); its notch is opposite. Its
     faces stand g inside the two pointers: Z0 puts column cols + jB's pointer
     at Z = −g. */
  const sB = best.pts[0][0] * tile.pitchA * Math.cos(theta) + best.pts[0][1] * tile.pitchB;
  B.startPhi = -sB / B.Rtip;
  B.notchPhi = B.startPhi + Math.PI;
  B.Z0 = (rollers.cols + jB) * s - dg.g;
  B.L = (rollers.cols + jT + jB) * s - 2 * dg.g;
  B.zminAll = -B.Z0; B.zmaxAll = B.L - B.Z0;

  /* A: it defines the frame and needs no fiducial of its own. It starts on its
     detent at the dough's edge with ring 0's copy-0 corner on the contact line
     (φ = 0): that corner is column a0, the first whole column behind every
     cookie corner and both fiducials by one pin radius + EDGE_CLEAR_MM. Its
     pins sit at the sight fiducials in its unrolled frame. */
  A.a0 = best.a0; A.startPhi = 0; A.notchPhi = Math.PI;
  A.rollEnd = best.rollEnd;
  A.pins = best.pins;
  /* the pin: its own width through the dough and PIN_NECK_CLEAR_MM above it,
     its flat tip set where its RIM reaches the blade-tip radius (flush: it
     must not lift the roller off the board, and the blades already reach the
     board through the dough); then a 45° flare down to the body */
  const tipRho = Math.sqrt(A.Rtip * A.Rtip - pinR * pinR);
  const neck = Math.max(A.Rtip - td - PIN_NECK_CLEAR_MM, A.Rbody + 0.2);
  A.pin = { r: pinR, tipRho, neck, base: coneBase(A.Rbody - EMBED_MM, neck, pinR, A.Rbody - print.cylWall) };
  A.zminAll = A.zmin; A.zmaxAll = A.zmax;
  for (const p of A.pins) { A.zminAll = Math.min(A.zminAll, p.z - A.pin.base.r); A.zmaxAll = Math.max(A.zmaxAll, p.z + A.pin.base.r); }
  A.Z0 = END_MARGIN_MM - A.zminAll;
  A.L = A.Z0 + A.zmaxAll + END_MARGIN_MM;
  if (impostorLeft) out.flags.push({ id: 'impostor', text: `Roller A lays a second pair of pinholes ${Math.abs(best.impostor.off).toFixed(2)} mm off roller B's pointer span — easy to take for the right pair. Change roller A's tiles round, or the crossing angle slightly.` });

  for (const R of [A, B]) {
    R.notchR = notchRadius(R, R.which);
    R.ptrR = R.Rtip - td - HANDLE.hover;                  // the pointer hovers just above the dough
  }

  // flags (doc §6)
  if (!(h > td + BODY_CLEARANCE_MM)) out.flags.push({ id: 'blade', stl: true, text: `Blade height ${h.toFixed(1)} mm must exceed the dough ${td.toFixed(1)} mm + ${BODY_CLEARANCE_MM} mm, or the roller's body presses the dough. STL refused.` });
  for (const R of [A, B]) {
    const need = print.bore / 2 + print.cylWall + EMBED_MM;
    if (R.Rbody < need) out.flags.push({ id: 'small' + R.which, stl: true, text: `Roller ${R.which} is too small: ${R.n} tiles of ${R.pitch.toFixed(1)} mm round it make a ${(2 * R.Rtip).toFixed(1)} mm roller, whose body (${(2 * R.Rbody).toFixed(1)} mm under ${h.toFixed(1)} mm blades) leaves less than one ${print.cylWall.toFixed(1)} mm wall around the ${print.bore.toFixed(1)} mm bore — it needs at least ${(2 * (need + h)).toFixed(1)} mm. More tiles round it, or a larger tile. STL refused.` });
    else if (R.notchR - DETENT.halfLen < dg.rs + 1 || R.notchR - dg.rs < DETENT.tabMin) {
      const needBody = R.Rbody + (dg.rs + Math.max(1 + DETENT.halfLen, DETENT.tabMin) - R.notchR);
      out.flags.push({ id: 'detent' + R.which, stl: true, text: `Roller ${R.which}'s end face has no room for the start detent: its handle's spring tab needs the notch at least ${(dg.rs + Math.max(1 + DETENT.halfLen, DETENT.tabMin)).toFixed(1)} mm out from the axle, and the face reaches ${(R.notchR).toFixed(1)}. It needs a body at least ${(2 * needBody).toFixed(1)} mm across — more tiles round it, or a larger tile. STL refused.` });
    }
  }
  /* A sight fiducial that is a post (not on a corner) comes round again every
     n_A columns; if that lands inside the cookie sheet it punches a hole in a
     cookie. A corner pin comes round on a corner, which costs nothing. */
  const posts = A.pins.filter((p) => Math.abs(p.v - Math.round(p.v)) > 1e-9);
  const inside = (u, v) => u >= -1e-9 && u <= rollers.cols + 1e-9 && v >= -1e-9 && v <= rollers.rows + 1e-9;
  const recurs = (nA) => {
    const hits = [];
    for (const p of posts) for (let k = -12; k <= 12; k++) {
      if (!k) continue;
      const u = p.u + k * nA, sk = sOf(u, p.v) - A.a0 * tile.pitchA;
      if (sk < -1e-9 || sk > A.rollEnd + 1e-9) continue;
      if (inside(u, p.v)) hits.push(u);
    }
    return hits;
  };
  const hit = recurs(A.n);
  if (hit.length) {
    let need = A.n; while (recurs(need).length && need < 60) need++;
    out.flags.push({ id: 'pinRecur', text: `Roller A's fiducial post (between its rings, ${(posts[0].v).toFixed(2)} rows up) comes round again at column ${hit[0]} — inside the cookie sheet (columns 0–${rollers.cols}): it would punch a hole in a cookie there. Give roller A at least ${need} tiles round it, or cut fewer cookies along edge A.` });
  }
  for (const R of [A, B]) if (R.L > BUILD_HEIGHT_MM) out.flags.push({ id: 'length' + R.which, text: `Roller ${R.which} is ${R.L.toFixed(0)} mm long — longer than a common printer's ${BUILD_HEIGHT_MM} mm build height. Fewer cookies ${R.which === 'A' ? 'along edge B' : 'along edge A'}, or smaller tiles.` });
  for (const R of [A, B]) if (R.Rbody - print.cylWall - print.bore / 2 < 2 && R.Rbody >= print.bore / 2 + print.cylWall + EMBED_MM) out.flags.push({ id: 'solid' + R.which, text: `Roller ${R.which} has no room for a hollow: it prints solid around the bore (more plastic, no weaker).` });
  return out;
}
/* A 45° cone with its tip at radius `top` (tip radius tipR) and its base
   sunk so the base circle's rim stays inside radius `limit`: solve
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

/* How far off a corner can land when B's pointers are placed within e mm of
   their pinholes (doc §4.6). The placement is the least-squares rigid one: the
   pointers' midpoint on the holes' midpoint, the axis along them. Each pointer
   is swept round a circle of radius e (16 directions each, every pair); the
   answer is the worst distance any cookie corner moves. Ideal geometry only —
   the gate measures the same thing through the simulator. */
export function sightTolerance(tile, layout, e, dirs = 16) {
  const { tA, tB } = latticeVectors(tile);
  const [P0, Q0] = layout.sight.pts.map(([u, v]) => lat(tA, tB, u, v));   // P0 at column −j (B's +Z end), Q0 at cols + j
  const M = mul2(add2(P0, Q0), 0.5), a0 = Math.atan2(Q0[1] - P0[1], Q0[0] - P0[0]);
  const corners = [];
  for (let m = 0; m <= layout.KA; m++) for (let k = 0; k <= layout.KB; k++) corners.push(lat(tA, tB, m, k));
  let worst = 0;
  for (let i = 0; i < dirs; i++) for (let k = 0; k < dirs; k++) {
    const dp = [e * Math.cos((TAU * i) / dirs), e * Math.sin((TAU * i) / dirs)], dq = [e * Math.cos((TAU * k) / dirs), e * Math.sin((TAU * k) / dirs)];
    const P = add2(P0, dp), Q = add2(Q0, dq);
    const M2 = mul2(add2(P, Q), 0.5), da = wrapPi(Math.atan2(Q[1] - P[1], Q[0] - P[0]) - a0);
    const c = Math.cos(da), sn = Math.sin(da);
    for (const p of corners) {
      const d = sub2(p, M), q = add2(M2, [c * d[0] - sn * d[1], sn * d[0] + c * d[1]]);
      worst = Math.max(worst, len2(sub2(q, p)));
    }
  }
  return worst;
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
  const spec = { KA: layout.KA, KB: layout.KB, sight: layout.sight, a0: layout.A.a0 };
  for (const which of ['A', 'B']) {
    const R = layout[which], M = R.period.one.length;
    const rings = [];
    for (let j = 0; j < R.rings; j++) rings.push(ringPoints(R, j));
    const corners = []; for (let c = 0; c < R.n; c++) corners.push(c * M);
    spec[which] = { which, Rtip: R.Rtip, Rbody: R.Rbody, n: R.n, pitch: R.pitch, step: R.step.slice(), Z0: R.Z0, L: R.L, rings, corners, startPhi: R.startPhi, notchPhi: R.notchPhi };
  }
  // A's pins: at the two sight fiducials (doc §4.2)
  const A = layout.A;
  spec.A.pins = A.pins.map((p) => ({ i: p.i, u: p.u, v: p.v, phi: -p.s / A.Rtip, Z: p.z + A.Z0, rho: A.Rtip }));
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

/* A closed profile in (r, z), revolved about Z at the given angles (default
   uniform). A vertex with r = 0 becomes one apex vertex (a fan); every other
   vertex a ring. `disp(vertex, angle)` moves a vertex along Z (the detent
   notches); a profile vertex may carry a third entry naming its face. */
function revolve(mesh, prof, segs = REVOLVE_SEGMENTS, disp = null) {
  const angles = Array.isArray(segs) ? segs : Array.from({ length: segs }, (_, j) => (TAU * j) / segs);
  const N = angles.length;
  const rings = prof.map((pv) => {
    const [r, z] = pv;
    if (r === 0) return [mesh.v(0, 0, z)];
    return angles.map((a) => mesh.v(r * Math.cos(a), r * Math.sin(a), z + (disp ? disp(pv, a) : 0)));
  });
  for (let i = 0; i < prof.length; i++) {
    const A = rings[i], B = rings[(i + 1) % prof.length];
    if (A.length === 1 && B.length === 1) continue;
    for (let j = 0; j < N; j++) {
      const j1 = (j + 1) % N;
      if (A.length === 1) mesh.t(A[0], B[j], B[j1]);
      else if (B.length === 1) mesh.t(A[j], B[0], A[j1]);
      else { mesh.t(A[j], B[j], B[j1]); mesh.t(A[j], B[j1], A[j1]); }
    }
  }
}

/* The body profile (doc §3.5–3.6): the tube at the body radius with chamfered
   ends, the end caps with the bore, the cavity with a 45° ceiling; A's
   orientation groove on its +Z end face. Both end faces carry extra vertices at
   the detent notch's four radii (doc §4.3), tagged with their face, so the
   revolve can cut the notch exactly. No rims: the rings are the rolling
   surface (§3.5). Counter-clockwise in (r, z). */
export function bodyProfile(R, print, opts = {}) {
  const { Rbody, L } = R;
  const rb = print.bore / 2, ch = 0.6, Rin = Rbody - print.cylWall;
  const nr = opts.notchR, d = DETENT.depth, hl = DETENT.halfLen;
  const radii = nr ? [nr - hl, nr - hl + d, nr + hl - d, nr + hl].filter((r) => r > rb + 1e-6 && r < Rbody - ch - 1e-6) : [];
  const p = [[rb, 0, 'bottom']];
  for (const r of radii) p.push([r, 0, 'bottom']);
  p.push([Rbody - ch, 0], [Rbody, ch], [Rbody, L - ch], [Rbody - ch, L, 'top']);
  if (opts.groove) {
    const rg = grooveRadius(R), gw = GROOVE.width, gd = GROOVE.depth;
    p.push([rg + gw / 2, L, 'top'], [rg, L - gd], [rg - gw / 2, L, 'top']);
  }
  for (const r of radii.slice().reverse()) p.push([r, L, 'top']);
  p.push([rb, L, 'top']);
  const roof = L - CAP_MM - (Rin - rb);
  if (Rin - rb >= 2 && roof - CAP_MM >= 2) {
    p.push([rb, L - CAP_MM], [Rin, roof], [Rin, CAP_MM], [rb, CAP_MM]);
  }
  return p;
}
/* The detent notch on an end face (doc §4.3): a V whose depth is DETENT.depth
   at its centreline (angle notchPhi) and falls linearly to 0 at ±depth/notchR
   radians — so it is 90° across, and exactly 2·depth wide, at the nub's radius
   — tapering to 0 over one depth at its two radial ends. Piecewise linear in
   both, so the profile's notch radii and the revolve's notch angles carry it
   exactly. Returns the Z displacement (into the body) of a face vertex. */
export function notchDepth(r, a, notchR, notchPhi) {
  const d = DETENT.depth, hl = DETENT.halfLen, aw = d / notchR;
  const ang = Math.max(0, 1 - Math.abs(wrapPi(a - notchPhi)) / aw);
  const rad = Math.max(0, Math.min(1, (r - (notchR - hl)) / d, ((notchR + hl) - r) / d));
  return d * ang * rad;
}
/* the revolve's angles: uniform, plus the notch's centreline and its two
   shoulders (a uniform angle within a fifth of a step of one is dropped) */
function bodyAngles(notchPhi, notchR) {
  const step = TAU / REVOLVE_SEGMENTS, aw = DETENT.depth / notchR;
  const extra = [notchPhi, notchPhi - aw, notchPhi + aw].map((a) => ((a % TAU) + TAU) % TAU);
  const base = [];
  for (let j = 0; j < REVOLVE_SEGMENTS; j++) {
    const a = j * step;
    if (extra.every((e) => Math.abs(wrapPi(a - e)) > 0.2 * step)) base.push(a);
  }
  return [...base, ...extra].sort((x, y) => x - y);
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
/* A closed solid of revolution about the axis through `c` along unit `ax`
   (perpendicular units u, w): stations [t, r] along the axis from c, each a
   CONE_SIDES-gon ring (r > 0) — capped by a centre fan at each end. */
function emitStack(mesh, c, ax, u, w, stations, name) {
  mesh.begin(name);
  const ring = ([tt, r]) => {
    const ids = [];
    for (let k = 0; k < CONE_SIDES; k++) {
      const a = (TAU * k) / CONE_SIDES, cu = Math.cos(a) * r, cw = Math.sin(a) * r;
      ids.push(mesh.v(c[0] + ax[0] * tt + u[0] * cu + w[0] * cw, c[1] + ax[1] * tt + u[1] * cu + w[1] * cw, c[2] + ax[2] * tt + u[2] * cu + w[2] * cw));
    }
    return ids;
  };
  const rings = stations.map(ring);
  const end = (tt) => mesh.v(c[0] + ax[0] * tt, c[1] + ax[1] * tt, c[2] + ax[2] * tt);
  const c0 = end(stations[0][0]), c1 = end(stations[stations.length - 1][0]);
  for (let k = 0; k < CONE_SIDES; k++) {
    const k1 = (k + 1) % CONE_SIDES;
    mesh.t(c0, rings[0][k1], rings[0][k]);
    for (let i = 0; i + 1 < rings.length; i++) { const a = rings[i], b = rings[i + 1]; mesh.t(a[k], a[k1], b[k1]); mesh.t(a[k], b[k1], b[k]); }
    mesh.t(c1, rings[rings.length - 1][k], rings[rings.length - 1][k1]);
  }
  return mesh.end();
}
/* A fiducial pin standing radially on roller A at (φ, Z) (doc §4.2): its 45°
   flare from the base sunk in the body up to the neck, then its own width
   through the dough to the flat tip, whose rim is at the blade-tip radius. */
function emitPin(mesh, phi, Z, pin, name) {
  const er = [Math.cos(phi), Math.sin(phi), 0], et = [-Math.sin(phi), Math.cos(phi), 0];
  return emitStack(mesh, [0, 0, Z], er, et, [0, 0, 1], [[pin.base.rho, pin.base.r], [pin.neck, pin.r], [pin.tipRho, pin.r]], name);
}
/* An axis-aligned box, a closed shell. */
function emitBox(mesh, [x0, x1], [y0, y1], [z0, z1], name) {
  mesh.begin(name);
  const v = [];
  for (const z of [z0, z1]) for (const y of [y0, y1]) for (const x of [x0, x1]) v.push(mesh.v(x, y, z));
  const q = (a, b, c, d) => { mesh.t(v[a], v[b], v[c]); mesh.t(v[a], v[c], v[d]); };
  q(0, 2, 3, 1); q(4, 5, 7, 6); q(0, 1, 5, 4); q(2, 6, 7, 3); q(0, 4, 6, 2); q(1, 3, 7, 5);
  return mesh.end();
}

/* Build roller A or B. Returns { mesh, spec, layout, R }. */
export function buildRoller(tile, print, rollers, which, layout = rollerLayout(tile, print, rollers)) {
  const R = layout[which];
  const mesh = new Mesh();
  mesh.begin('body');
  const opts = { notchR: R.notchR, groove: which === 'A' };
  revolve(mesh, bodyProfile(R, print, opts), bodyAngles(R.notchPhi, R.notchR), (pv, a) => {
    if (!pv[2]) return 0;
    const dz = notchDepth(pv[0], a, R.notchR, R.notchPhi);
    return pv[2] === 'bottom' ? dz : -dz;
  });
  mesh.end();
  const g = ringGeometry(R, layout);
  for (let j = 0; j < R.rings; j++) emitRing(mesh, g, R, j, `ring${j}`);
  const spec = rollerSpec(tile, print, rollers, layout);
  if (which === 'A') for (const pn of spec.A.pins) emitPin(mesh, pn.phi, pn.Z, R.pin, `pin${pn.i}`);
  return { mesh: mesh.finish(), spec: spec[which], fullSpec: spec, layout, R };
}

/* The handle (doc §4.4), one design for both ends of a roller — mirror
   symmetric about its x = 0 plane, so turned end for end it is the same part —
   and the same for both rollers but for the arm's length (each roller's
   pointer must reach its own contact line). Built in its own frame: axis z,
   grip end down at z = 0, the bearing face (the boss's top, against the
   roller's end face) at z = zSh, the axle pin above it. The spring tab runs
   along +y with the nub on its tip at the notch radius; the sight arm runs
   along −y to a pointer whose tip hovers just above the dough when the arm
   hangs straight down. Returns { mesh, geom }. */
export function handleGeometry(print, layout, which) {
  const dg = layout.detent, R = layout[which], H = HANDLE;
  const { rp, rs } = dg;
  const zTaper = H.gripL + (H.gripR - rs), zSh = zTaper + H.shoulderT, zPin = zSh + CAP_MM + 3;
  const profile = [[0, 0], [H.gripR - 1.5, 0], [H.gripR, 1.5], [H.gripR, H.gripL], [rs, zTaper], [rs, zSh], [rp, zSh], [rp, zPin - 0.8], [rp - 0.8, zPin], [0, zPin]];
  const zFace = zSh - H.gap;                                    // the tab's and arm's roller-facing side
  const nubBase = zFace - 0.2, nubTop = zSh + DETENT.depth - H.nubClear;
  return { profile, zSh, zFace, zMid: zFace - H.plateT / 2, rs, rp, notchR: R.notchR, ptrR: R.ptrR, nubBase, nubTop };
}
export function buildHandle(print, layout, which = 'A') {
  const hg = handleGeometry(print, layout, which), H = HANDLE;
  const mesh = new Mesh();
  mesh.begin('handle');
  revolve(mesh, hg.profile, 96);
  mesh.end();
  // the spring tab, up (+y), with the nub on its roller-facing side at the notch radius
  emitBox(mesh, [-H.tabW / 2, H.tabW / 2], [hg.rs - 0.5, hg.notchR + H.tabW / 2], [hg.zFace - H.tabT, hg.zFace], 'tab');
  emitStack(mesh, [0, hg.notchR, hg.nubBase], [0, 0, 1], [1, 0, 0], [0, 1, 0], [[0, H.nubTip + (hg.nubTop - hg.nubBase)], [hg.nubTop - hg.nubBase, H.nubTip]], 'nub');
  // the sight arm, down (−y), and its pointer
  const ptrBase = hg.ptrR - H.ptrLen;
  emitBox(mesh, [-H.armW / 2, H.armW / 2], [-(ptrBase + 0.5), -(hg.rs - 0.5)], [hg.zFace - H.plateT, hg.zFace], 'arm');
  emitStack(mesh, [0, -ptrBase, hg.zMid], [0, -1, 0], [1, 0, 0], [0, 0, 1], [[-0.5, H.ptrR], [0, H.ptrR], [H.ptrLen, H.ptrTip]], 'pointer');
  return { mesh: mesh.finish(), geom: hg };
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
  const HA = buildHandle(print, layout, 'A'), HB = buildHandle(print, layout, 'B');
  return { layout, A, B, HA, HB, spec: A.fullSpec };
}
