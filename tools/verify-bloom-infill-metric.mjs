/* ===================================================================
   verify-bloom-infill-metric.mjs — THE METRIC PLAN'S GATE (S2).

     node tools/verify-bloom-infill-metric.mjs [--quick] [--json <file>]
     node tools/verify-bloom-infill-metric.mjs --negative-control        (REQUIRED before quoting a pass)
     node tools/verify-bloom-infill-metric.mjs --partition <base-tree>

   WHAT IT IS FOR. `tools/bloom-voronoi-proto.mjs` computed its plan FLAT: the wall was
   inset by a constant PLAN distance and mapped onto the surface afterwards. On a flat
   petal that map is the identity and a 1.0 mm plan wall is 1.0 mm of material; on the
   reachable combination `petalCup` 1.2 x `petalSpineCurl` 360 it is not, and §1b of
   `docs/bloom-infill-port-plan.md` measured the wall at a QUARTER of what the plan asked
   — under the 0.3 mm horizontal wall floor, so it does not print. Eva's ruling 2. S2.

   THE QUANTITY, NAMED ONCE AND THE SAME THROUGHOUT. `wallSurfaceMm` is the minimum, over
   every EMITTED hole-rim point, of the IN-SHEET distance to the nearest point of another
   solid boundary — another hole's rim, or the petal's own outline — along a plan path
   that stays IN THE MATERIAL. In-sheet, not 3-space, and that is the whole separation
   §1b names: a compressed WALL is thin along the sheet, while a FOLD is two parts of the
   sheet that are far apart along it and close in space. Measured on `petalRoll` 330 the
   difference is not academic: a 3-space minimum reads 0.0415 mm there on a pair 8.7 mm
   apart along the sheet, which is the petal's own declared fold and not a wall at all,
   and the in-sheet measure reads that state at exactly 1.0000.

   NOMINAL 1.0 mm ON EVERY PAIR, which is what makes ONE number the whole acceptance: a
   shared wall is inset w/2 from each side and an outline edge is inset by the full w.

   M0 FIRST, AND IT ABORTS. The instruments vouch for themselves on SYNTHETIC surfaces
   whose answers are written down — a plane, a plane scaled 2x along the spine, and a
   SHEARED plane, which is the one that separates the shipped formula from the plausible
   wrong one. A harness that cannot vouch for its own measure reports whatever it happens
   to compute and is believed because it produced numbers.

   THEN SIX CLAUSES, AND EACH ONE'S REFERENCE HAS A DIFFERENT OWNER FROM ITS QUANTITY.

   M1 THE RULED WALL, IN SURFACE MILLIMETRES. The bar is `MIN_FEATURE_MM`, IMPORTED from
   `bloom-geometry.js` — Eva's ruled 1.0 mm wall, this project's one owner of the minimum
   printable gap. The measured side is read off the EMITTED rim polygons and mapped
   through `petalSurface` DIRECTLY: it reads no metric field, so the thing the emitter
   uses to build the wall is not the thing the gate uses to measure it.

   M2 THE MEASURE'S OWN SUBJECT, STATED AS A SET. Every pair M1 minimised over is
   reported with its 3-space distance and its plan distance beside the in-sheet one, and
   the winning pair's path is asserted to cross no hole — so "the wall" cannot quietly
   become "the nearest thing in space", which is the fifth durable rule applied to the
   clause this session exists for.

   M3 THE ACHIEVED COUNT (Eva's ruling 3). Cells asked, cells that kept a hole, and the
   same under the flat plan — because a wall that holds by cutting no holes at all would
   satisfy M1 and say nothing, and the only honest answer is the number.

   M4 THE FLAT GUARD, BOTH DIRECTIONS. Where the plan map is affine the field is not built
   and `{ metricPlan: true }` is the SAME DOUBLES as `{ metricPlan: false }` — asserted as
   a byte identity, not a tolerance — and the lattice residual the guard is claiming is
   asserted against a bar DERIVED from the finite difference's own conditioning. Where the
   guard does NOT hold the two must DIFFER, or the guard is on everywhere and M1 is empty.

   M5 SHELLS INTACT. Boundary edges 0, the vertex-welded shell count no worse than the
   FLAT plan's on the same state, one voxel piece at the 0.6 mm and 0.3 mm cells.

   M6 COST, against S1's own published 2,744 (the shipping default petal) and 22,124 (the
   whole bloom), flagged above +25 %.

   WHAT IT DOES NOT COVER, in its own header rather than left to be found:
     - the CELL SIZE is still laid out in the flat plan. A cell in a compressed region is
       smaller ON THE OBJECT than one in a stretched region, so it can lose its hole where
       a metric-sized cell would have kept one. M3 is what reports that; making the
       Voronoi itself metric is a look change and is S4's.
     - the in-sheet measure walks the STRAIGHT PLAN SEGMENT, which is an upper bound on
       the geodesic through the material. M2 reports the 3-space distance of the same pair
       beside it, and where the two agree the path is straight and the bound is tight; the
       largest disagreement over the sweep is printed.
     - S1's conforming-emitter claims are S1's gate's. This one does not re-assert them:
       run `node tools/verify-bloom-infill-conform.mjs` (+ `--negative-control`).
     - one seed (`SEED`), one petal, EXPORT mode, 16 cells, wall 1.0 mm. Naming the
       sampling because this project's first durable rule requires it.
     - the prototype is not the shipping emitter and this gate is not wired to CI.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import * as G from '../bloom-geometry.js';
import * as P from './bloom-voronoi-proto.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const QUICK = process.argv.includes('--quick');
const NEG = process.argv.includes('--negative-control');

/* THE SWEEP IS S1'S, PLUS THE TWO COMBINED CORNERS BY NAME. §1b's `cup 1.2 x curl 180`
   joins it because it is the state where the flat plan is WRONG BUT NOT OBVIOUSLY SO
   (0.8044 mm, above the 0.3 mm floor and below the ruled wall), which is the shape of
   defect a bar set at the floor would miss. */
export const STATES = [
  ['default (flat)', {}],
  ['petalCup 1.2', { petalCup: 1.2 }],
  ['petalSpineCurl 360', { petalSpineCurl: 360 }],
  ['petalRoll 330', { petalRoll: 330 }],
  ['petalTwist 180', { petalTwist: 180 }],
  ['cup 1.2 x curl 180', { petalCup: 1.2, petalSpineCurl: 180 }],
  ['cup 1.2 x curl 360', { petalCup: 1.2, petalSpineCurl: 360 }],
  ['ALL FORM MAX', { petalCup: 1.2, petalSpineCurl: 360, petalRoll: 330, petalTwist: 180 }],
  ['buckle 0.6 f3', { buckleAmp: 0.6, buckleFreq: 3 }],
  ['cup 1.2 x cupGradient 1', { petalCup: 1.2, petalCupGradient: 1 }],
  ['petalWidth 30', { petalWidth: 30 }],
  ['petalWidth 8', { petalWidth: 8 }],
  ['footDelicacy 0.25', { footDelicacy: 0.25 }],
];
const N_CELLS = 16, WALL = P.WALL_DEFAULT;
/* S1's own published figures, so the cost clause compares against a number with a
   different owner from this session. `docs/bloom-infill-conforming-emitter.md` §0. */
export const S1_DEFAULT_PETAL_TRIS = 2744, S1_BLOOM_TRIS = 22124;
export const RIM_STEP_MM = 0.15;              // how finely a rim is walked before the minimum is taken
export const IN_SHEET_STEPS = 32;             // subdivisions of a plan segment when its in-sheet length is measured
/* THE BAR CARRIES THE MEASURE'S OWN CONDITIONING, AND IT IS DERIVED RATHER THAN TYPED.
   `inSheetLenMm` sums IN_SHEET_STEPS chords, each a `hypot` of differences of coordinates
   of magnitude C, so the sum carries about IN_SHEET_STEPS ulp(C) of accumulation. On a
   FLAT petal the true answer is exactly the plan length and the measured one lands a few
   parts in 10^16 under it — which an exact `>=` reads as a failed wall: measured, `petalWidth 8`
   reported "1.0000 mm against the ruled 1 mm" and was red. This is the exact-equality-across-
   two-routes class this project has found four times; the slack is in the unit the quantity
   has, it is 10^9 times smaller than the smallest shortfall any mutant here produces
   (0.0045 mm), and it is 10^11 under the 0.3 mm horizontal wall floor the ruling is about. */
export const IN_SHEET_ULPS = 8;

/* ---------------- THE WALL, IN SURFACE MILLIMETRES ----------------
   It reads the EMITTED rim polygons and `petalSurface`, and no metric field. */
const hyp = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function densify(poly, step) {
  const o = [];
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length];
    const n = Math.max(1, Math.ceil(hyp(A, B) / step));
    for (let k = 0; k < n; k++) o.push({ x: A.x + (B.x - A.x) * k / n, y: A.y + (B.y - A.y) * k / n });
  }
  return o;
}
function segsCross(a, b, c, d) {
  const r1 = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x), r2 = (b.x - a.x) * (d.y - a.y) - (b.y - a.y) * (d.x - a.x);
  const s1 = (d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x), s2 = (d.x - c.x) * (b.y - c.y) - (d.y - c.y) * (b.x - c.x);
  return ((r1 > 0) !== (r2 > 0)) && ((s1 > 0) !== (s2 > 0));
}
function hitsPoly(a, b, poly) { for (let i = 0; i < poly.length; i++) if (segsCross(a, b, poly[i], poly[(i + 1) % poly.length])) return true; return false; }
/* IN THE MATERIAL: the plan path must not enter a hole. Its midpoint inside one, or the
   path crossing one's rim, both disqualify — the first catches a path lying wholly inside
   a hole, the second a path cutting a corner off one. */
function inMaterial(a, b, holes) {
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  for (const h of holes) if (P.pointInPoly(m.x, m.y, h) || hitsPoly(a, b, h)) return false;
  return true;
}
const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export function wallSurfaceMm(ctx, F, r, step = RIM_STEP_MM) {
  if (!r.holes.length) return null;
  const mid = (q) => { const u = Math.min(1, Math.max(0, q.x / ctx.L)); const hh = ctx.surface.profile.halfWidthAt(u); const v = Math.max(-1, Math.min(1, hh > 1e-9 ? q.y / hh : 0)); return ctx.surface.at(u, v).P; };
  const rim = []; r.holes.forEach((h, i) => densify(h, step).forEach((q) => rim.push({ q, P: mid(q), h: i })));
  const other = rim.concat(densify(F.outline, step).map((q) => ({ q, P: mid(q), h: -1 })));
  let best = Infinity, pair = null, crossed = 0;
  for (const a of rim) {
    const near = other.filter((b) => b.h !== a.h).map((b) => ({ b, d: hyp(a.q, b.q) })).sort((x, y) => x.d - y.d).slice(0, 40);
    for (const { b } of near) {
      if (!inMaterial(a.q, b.q, r.holes)) { crossed++; continue; }
      const s = P.inSheetLenMm(ctx, a.q, b.q, IN_SHEET_STEPS);
      if (s < best) { best = s; pair = [a, b]; }
    }
  }
  if (!pair) return null;
  return { mm: best, threeMm: d3(pair[0].P, pair[1].P), planMm: hyp(pair[0].q, pair[1].q),
    u: pair[0].q.x / ctx.L, against: pair[1].h < 0 ? 'the outline' : `hole ${pair[1].h}`,
    a: pair[0].q, b: pair[1].q, rimPoints: rim.length, crossed };
}

/* §1b'S OWN MEASURE, REPRODUCED SO THE BEFORE/AFTER IS THE SAME QUANTITY AS THE PUBLISHED
   TABLE. It is a different question from `wallSurfaceMm` and both are reported rather than
   one standing in for the other: §1b asks for the minimum 3-D distance from a hole's rim
   to THAT CELL'S OWN outer polygon — the HALF wall, nominal 0.5 mm, since each cell insets
   w/2 from a shared edge — while the acceptance above asks for the material bridge between
   two holes, nominal 1.0. `docs/bloom-infill-port-plan.md` §1b and
   `docs/bloom-infill-conforming-emitter.md` §7 are the tables this reproduces.
   REPORTED, NOT ASSERTED: the full wall is the acceptance and it subsumes this; a second
   bar at half of it would be a second owner of one ruling. */
export function halfWallSurfaceMm(ctx, F, r, step = RIM_STEP_MM) {
  if (!r.holes.length) return null;
  const mid = (q) => { const u = Math.min(1, Math.max(0, q.x / ctx.L)); const hh = ctx.surface.profile.halfWidthAt(u); const v = Math.max(-1, Math.min(1, hh > 1e-9 ? q.y / hh : 0)); return ctx.surface.at(u, v).P; };
  let best = Infinity, hi = 0;
  for (let ci = 0; ci < F.cells.length; ci++) {
    if (!r.cellOpen[ci]) continue;
    const hole = r.holes[hi++]; if (!hole) break;
    const A = densify(hole, step).map(mid), Bp = densify(F.cells[ci], step).map(mid);
    for (const a of A) for (const b of Bp) { const d = d3(a, b); if (d < best) best = d; }
  }
  return best === Infinity ? null : best;
}

/* ---------------- M0 — THE INSTRUMENTS' OWN VALIDITY ----------------
   SYNTHETIC SURFACES WITH WRITTEN-DOWN ANSWERS, driven through the SHIPPED
   `planMetricField` / `kappaAt` / `surfaceOffsetPlanMm` / `inSheetLenMm` by handing them a
   context whose `surface` is a map anyone can differentiate by hand. It ABORTS. */
function fakeCtx(L, hAt, map) {
  const rowAt = (u) => ({ sect: (v) => ({ P: map(u * L, v * hAt(u)) }) });
  return { L, rows: [{ u: 0, mid: [[0, 0, 0]] }], surface: { rowAt, at: (u, v) => rowAt(u).sect(v), profile: { halfWidthAt: hAt }, form: {}, kC: 1 } };
}
function validity() {
  const bad = [];
  const eq = (name, got, want, tol) => { if (!(Math.abs(got - want) <= tol)) bad.push(`${name}: got ${got}, want ${want} +/- ${tol}`); };
  const H = () => 5;
  /* (a) THE PLANE. The map is the identity, so every kappa is 1 and an offset asked for
     0.5 comes back as 0.5. */
  {
    const c = fakeCtx(20, H, (x, y) => [x, y, 0]); const f = P.planMetricField(c);
    eq('plane: kappa across an x-running edge', P.kappaAt(f, 10, 0, 1, 0), 1, 1e-9);
    eq('plane: kappa across a y-running edge', P.kappaAt(f, 10, 0, 0, 1), 1, 1e-9);
    eq('plane: the offset for 0.5 mm of surface', P.surfaceOffsetPlanMm(f, { x: 8, y: -1 }, { x: 12, y: -1 }, 0.5), 0.5, 1e-6);
    eq('plane: the in-sheet length of a 3 mm plan segment', P.inSheetLenMm(c, { x: 8, y: 0 }, { x: 11, y: 0 }), 3, 1e-9);
  }
  /* (b) THE PLANE STRETCHED 2x ALONG THE SPINE. |dP/dx| = 2, |dP/dy| = 1, no shear, so
     det M = 4: a y-running edge (offset in x) carries kappa 2 and needs HALF the plan
     offset, and an x-running edge (offset in y) carries kappa 1 and needs all of it. */
  {
    const c = fakeCtx(20, H, (x, y) => [2 * x, y, 0]); const f = P.planMetricField(c);
    eq('stretched: kappa across a y-running edge', P.kappaAt(f, 10, 0, 0, 1), 2, 1e-9);
    eq('stretched: kappa across an x-running edge', P.kappaAt(f, 10, 0, 1, 0), 1, 1e-9);
    eq('stretched: the offset across a y-running edge', P.surfaceOffsetPlanMm(f, { x: 10, y: -2 }, { x: 10, y: 2 }, 0.5), 0.25, 1e-6);
    eq('stretched: the offset across an x-running edge', P.surfaceOffsetPlanMm(f, { x: 8, y: 0 }, { x: 12, y: 0 }, 0.5), 0.5, 1e-6);
    eq('stretched: the in-sheet length of a 3 mm plan segment along x', P.inSheetLenMm(c, { x: 8, y: 0 }, { x: 11, y: 0 }), 6, 1e-9);
  }
  /* (c) THE SHEARED PLANE, AND THIS IS THE FIXTURE THAT SEPARATES THE SHIPPED FORMULA FROM
     THE PLAUSIBLE WRONG ONE. P = (x + y, y, 0) gives E = 1, F = 1, G = 2 and det M = 1. An
     x-running edge is offset in y, and the plan perpendicular's IMAGE has length
     |J(0,1)| = sqrt(2) = 1.41421 while the true perpendicular distance in the surface is
     sqrt(det M)/|J(1,0)| = 1. An implementation that took |J n| would inset by 0.354 where
     0.5 is needed — a wall 29 % thin, silently. The two are asserted APART here, so the
     clause is about the shear rather than about the arithmetic agreeing with itself. */
  {
    const c = fakeCtx(20, H, (x, y) => [x + y, y, 0]); const f = P.planMetricField(c);
    eq('sheared: kappa across an x-running edge', P.kappaAt(f, 10, 0, 1, 0), 1, 1e-9);
    eq('sheared: kappa across a y-running edge', P.kappaAt(f, 10, 0, 0, 1), 1 / Math.SQRT2, 1e-9);
    eq('sheared: |J n| across an x-running edge, the WRONG answer', P.kappaAt(f, 10, 0, 1, 0, 'normal'), Math.SQRT2, 1e-9);
    eq('sheared: the offset across an x-running edge', P.surfaceOffsetPlanMm(f, { x: 8, y: 0 }, { x: 12, y: 0 }, 0.5), 0.5, 1e-6);
  }
  /* (d) THE WALL MEASURE ITSELF, on two written-down rims 1.0 mm apart on a plane, with a
     third rim 0.4 mm away THROUGH A HOLE so the in-material clause has something to refuse. */
  {
    const c = fakeCtx(20, H, (x, y) => [x, y, 0]);
    const sq = (cx, cy, r) => [{ x: cx - r, y: cy - r }, { x: cx + r, y: cy - r }, { x: cx + r, y: cy + r }, { x: cx - r, y: cy + r }];
    const F = { outline: sq(10, 0, 9), h: H };
    const r = { holes: [sq(10, -1.5, 0.5), sq(10, 0.5, 0.5)] };
    const w = wallSurfaceMm(c, F, r, 0.1);
    eq('the wall between two rims 1.0 mm apart', w.mm, 1.0, 1e-6);
    const r2 = { holes: [sq(10, -1.5, 0.5), sq(10, 0.5, 0.5), sq(10, -0.5, 0.1)] };
    const w2 = wallSurfaceMm(c, F, r2, 0.1);
    if (!(w2.crossed > 0)) bad.push('the in-material clause refused nothing on a fixture built to make it refuse');
    if (!(w2.mm <= 0.5 + 1e-6)) bad.push(`a third rim 0.4 mm away should be found: got ${w2.mm}`);
  }
  return bad;
}

/* ---------------- the sweep ---------------- */
function runState(name, set, opts = {}) {
  const ctx = P.context(set);
  const F = P.fieldSalvage(ctx, N_CELLS, opts);
  const r = P.cutThrough(ctx, F, WALL, opts);
  const wall = wallSurfaceMm(ctx, F, r);
  const half = halfWallSurfaceMm(ctx, F, r);
  /* THE FLAT-PLAN CONTROL, on the SAME state, so every number has its own before. */
  const Ff = P.fieldSalvage(ctx, N_CELLS, { ...opts, metricPlan: false });
  const rf = P.cutThrough(ctx, Ff, WALL, { ...opts, metricPlan: false });
  const wallFlat = wallSurfaceMm(ctx, Ff, rf);
  const halfFlat = halfWallSurfaceMm(ctx, Ff, rf);
  const scratch = P.census(r.acc.pos), scratchFlat = P.census(rf.acc.pos);
  const flat = P.planIsFlat(ctx);
  let sameBytes = null;
  if (r.acc.pos.length === rf.acc.pos.length) { sameBytes = true; for (let i = 0; i < r.acc.pos.length; i++) if (!Object.is(r.acc.pos[i], rf.acc.pos[i])) { sameBytes = false; break; } }
  else sameBytes = false;
  return { name, ctx, F, r, wall, wallFlat, half, halfFlat, scratch, scratchFlat, flat, sameBytes,
    resid: flat ? P.flatGuardResidual(ctx) : null,
    holes: r.annular, holesFlat: rf.annular, cells: F.cells.length, tris: r.tris, trisFlat: rf.tris,
    voxel06: P.floodFill(r.acc.pos, 0.6), voxel03: QUICK ? null : P.floodFill(r.acc.pos, 0.3) };
}

function clauses(s) {
  const out = [];
  const w = s.wall;
  let maxC = 0; for (const r of s.ctx.rows) for (const Q of r.mid) for (let i = 0; i < 3; i++) maxC = Math.max(maxC, Math.abs(Q[i]));
  const slack = IN_SHEET_ULPS * IN_SHEET_STEPS * Math.pow(2, Math.floor(Math.log2(Math.max(1, maxC))) - 52);
  out.push({ id: 'M1', ok: !!w && w.mm >= G.MIN_FEATURE_MM - slack,
    msg: w ? `the wall reads ${w.mm.toFixed(6)} mm of surface against the ruled ${G.MIN_FEATURE_MM} mm less the measure's own ${slack.toExponential(2)} mm of accumulation (the flat plan reads ${s.wallFlat ? s.wallFlat.mm.toFixed(6) : 'n/a'}), at u ${w.u.toFixed(3)} against ${w.against}`
      : 'no hole was cut on this state, so the wall measure has nothing to say — M3 is what carries it' });
  out.push({ id: 'M2a', ok: !!w && P.pointInPoly((w.a.x + w.b.x) / 2, (w.a.y + w.b.y) / 2, s.F.outline),
    msg: w ? `the winning pair's path runs through the material (${w.crossed} candidate paths were refused for crossing a hole), 3-space ${w.threeMm.toFixed(4)} mm, plan ${w.planMm.toFixed(4)} mm, over ${w.rimPoints} rim points` : 'no pair' });
  out.push({ id: 'M2b', ok: true,
    msg: w ? `REPORTED, not bounded: in-sheet ${w.mm.toFixed(4)} against 3-space ${w.threeMm.toFixed(4)} (ratio ${(w.threeMm / w.mm).toFixed(4)}) — the straight plan path is an upper bound on the geodesic and the two agreeing says it is tight` : 'no pair' });
  out.push({ id: 'M2c', ok: true,
    msg: `REPORTED, §1b's OWN measure (hole rim to its own cell's outer polygon, 3-D, nominal 0.5 mm): ${s.half === null ? 'n/a' : s.half.toFixed(4)} mm against the flat plan's ${s.halfFlat === null ? 'n/a' : s.halfFlat.toFixed(4)}` });
  /* M3 IS A REPORT AND ONE ASSERTION: a wall that held by cutting no hole at all would
     satisfy M1 and mean nothing, so the count is required to be non-zero. */
  out.push({ id: 'M3', ok: s.holes > 0,
    msg: `${s.holes} of ${s.cells} cells kept a hole (the flat plan keeps ${s.holesFlat}) — Eva's ruling 3: the count is a request, not a guarantee` });
  if (s.flat) {
    out.push({ id: 'M4a', ok: s.sameBytes === true,
      msg: `the plan map is affine here, so the metric plan must be the flat plan's OWN DOUBLES: ${s.sameBytes ? 'bit-identical' : 'the streams DIFFER'}` });
    out.push({ id: 'M4b', ok: s.resid.worst <= s.resid.bar,
      msg: `the guard's own residual: worst |E-1|, |G-1|, |F| over the lattice is ${s.resid.worst.toExponential(3)} against a bar of ${s.resid.bar.toExponential(3)} derived from ulp(${s.resid.maxCoordMm.toFixed(3)} mm) over the lattice's ${(s.ctx.L / P.METRIC_NU).toFixed(4)} mm step` });
  } else {
    out.push({ id: 'M4c', ok: s.sameBytes === false,
      msg: `the plan map is NOT affine here, so the metric plan must move something: ${s.sameBytes ? 'the streams are IDENTICAL, which means the metric never ran' : 'the streams differ'}` });
  }
  out.push({ id: 'M5a', ok: s.scratch.boundary === 0, msg: `boundary edges ${s.scratch.boundary}` });
  out.push({ id: 'M5b', ok: s.scratch.shells <= s.scratchFlat.shells, msg: `vertex-welded shells ${s.scratch.shells} against the flat plan's ${s.scratchFlat.shells} on the same state` });
  out.push({ id: 'M5c', ok: s.voxel06 === 1 && (s.voxel03 === null || s.voxel03 === 1),
    msg: `voxel pieces ${s.voxel06}/${s.voxel03 === null ? 'skipped' : s.voxel03} at the 0.6 / 0.3 mm cells` });
  return out;
}

function report(results, label) {
  console.log(`\n${label}`);
  console.log('state                   | WALL surface mm  | flat plan | §1b half (flat) | holes (flat) | tris (flat)   | shells | vox');
  let fails = 0;
  for (const s of results) {
    const cl = clauses(s); const bad = cl.filter((c) => !c.ok); fails += bad.length;
    const w = s.wall;
    console.log(`${s.name.padEnd(23)} | ${(w ? w.mm.toFixed(4) : '(no hole)').padStart(16)} | ${(s.wallFlat ? s.wallFlat.mm.toFixed(4) : 'n/a').padStart(9)} | ${(s.half === null ? 'n/a' : s.half.toFixed(4)).padStart(6)} (${(s.halfFlat === null ? 'n/a' : s.halfFlat.toFixed(4)).padStart(6)}) | ${String(s.holes).padStart(5)} (${String(s.holesFlat).padStart(2)})   | ${String(s.tris).padStart(5)} (${String(s.trisFlat).padStart(5)}) | ${String(s.scratch.shells).padStart(6)} | ${s.voxel06}/${s.voxel03 ?? '-'}${bad.length ? '   <<< ' + bad.map((c) => c.id).join(',') : ''}`);
    for (const c of bad) console.log(`      ${c.id} FAILED: ${c.msg}`);
  }
  return fails;
}

/* ---------------- THE PARTITION ----------------
   Two claims, and they are not the same claim. `{ metricPlan: false }` must be the BASE
   TREE's stream bit-identically — that is what licenses the must-fail running through the
   shipped function and what keeps every figure the companion tools published valid. And
   the metric plan's own movers must be EXACTLY the states the guard refuses, in both
   directions, predeclared from the guard predicate rather than from a list of labels. */
async function partition(baseDir) {
  const B = await import(pathToFileURL(path.resolve(baseDir, 'tools/bloom-voronoi-proto.mjs')).href);
  const SEEDS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => P.SEED + i * 131);
  let floats = 0, diffs = 0, lenDiff = 0, states = 0;
  for (const [, set] of STATES) for (const wall of [1.0, 0.8]) for (const seed of SEEDS) {
    const ch = P.context(set), cb = B.context(set);
    const a = P.cutThrough(ch, P.fieldSalvage(ch, N_CELLS, { seed, metricPlan: false }), wall).acc.pos;
    const b = B.cutThrough(cb, B.fieldSalvage(cb, N_CELLS, { seed }), wall).acc.pos;
    states++;
    if (a.length !== b.length) { lenDiff++; continue; }
    floats += a.length; for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) diffs++;
  }
  console.log(`FLAT-PLAN IDENTITY: ${diffs} of ${floats.toLocaleString('en-US')} floats differ and ${lenDiff} streams differ in LENGTH, over ${states} states (${STATES.length} forms x 2 walls x ${SEEDS.length} seeds), head { metricPlan: false } against ${baseDir}, Object.is.`);
  let movers = 0, holders = 0, wrong = 0;
  console.log('\nstate                   | guard | predicted | measured | floats moved');
  for (const [n, set] of STATES) {
    const ch = P.context(set), cb = B.context(set);
    const a = P.cutThrough(ch, P.fieldSalvage(ch, N_CELLS), 1.0).acc.pos;
    const b = B.cutThrough(cb, B.fieldSalvage(cb, N_CELLS), 1.0).acc.pos;
    const flat = P.planIsFlat(ch);
    let moved = a.length !== b.length ? 'length' : 0;
    if (moved !== 'length') { moved = 0; for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) moved++; }
    const didMove = moved === 'length' || moved > 0;
    if (flat) holders++; else movers++;
    const ok = flat !== didMove;
    if (!ok) wrong++;
    console.log(`${n.padEnd(23)} | ${(flat ? 'FLAT' : 'curved').padEnd(6)}| ${(flat ? 'HOLDER' : 'MOVER').padEnd(9)} | ${(didMove ? 'moved' : 'held').padEnd(8)} | ${moved === 'length' ? 'the stream LENGTH moved' : moved + '/' + a.length}${ok ? '' : '   <<< WRONG'}`);
  }
  console.log(`\n${movers} MOVERS / ${holders} HOLDERS, predeclared from the guard predicate; ${wrong} states disagree with it.`);
  const ok = diffs === 0 && lenDiff === 0 && wrong === 0;
  console.log(ok ? 'PASS' : 'FAIL');
  if (!ok) process.exitCode = 1;
}

async function main() {
  const base = arg('--partition', null);
  if (base) { await partition(base); return; }
  const v = validity();
  if (v.length) { console.log('HARNESS INVALID — no result below is trustworthy:'); for (const m of v) console.log('  ' + m); process.exitCode = 1; return; }
  console.log('M0 the instruments vouch for themselves on written-down surfaces: a plane, a plane stretched 2x along the spine, and a SHEARED plane where the shipped formula reads 1.000 and the plausible wrong one reads 1.414; and the wall measure reads a written-down 1.0 mm and refuses a path that crosses a hole.');
  const states = QUICK ? STATES.filter(([n]) => /default|cup 1.2 x curl 360|ALL FORM MAX|petalWidth 8/.test(n)) : STATES;
  const results = states.map(([n, s]) => runState(n, s));
  let fails = report(results, `THE METRIC PLAN — one seed, one petal, EXPORT mode, ${N_CELLS} cells, wall ${WALL} mm. The quantity is the IN-SHEET wall: the minimum over every emitted hole-rim point of the distance THROUGH THE MATERIAL to the nearest other solid boundary.`);

  const d = results[0];
  const bloom = P.wholeBloom('salvage', N_CELLS, WALL);
  const petalPct = 100 * (d.tris - S1_DEFAULT_PETAL_TRIS) / S1_DEFAULT_PETAL_TRIS;
  const bloomPct = 100 * (bloom.tris - S1_BLOOM_TRIS) / S1_BLOOM_TRIS;
  console.log(`\nM6 COST, against S1's own published figures: the shipping default petal ${S1_DEFAULT_PETAL_TRIS} -> ${d.tris} (${petalPct >= 0 ? '+' : ''}${petalPct.toFixed(1)} %); whole bloom ${S1_BLOOM_TRIS} -> ${bloom.tris} (${bloomPct >= 0 ? '+' : ''}${bloomPct.toFixed(1)} %), ${bloom.petals} petals + hub ${bloom.hubTris}.`);
  const costOk = petalPct <= 25 && bloomPct <= 25;
  if (!costOk) { console.log('   **FLAGGED**: the metric plan costs more than +25 % on the shipping default.'); fails++; }
  else console.log('   Under the +25 % the brief asks to be flagged.');
  for (const s of results) {
    const pct = 100 * (s.tris - s.trisFlat) / s.trisFlat;
    console.log(`   ${s.name.padEnd(23)} flat ${String(s.trisFlat).padStart(5)} -> metric ${String(s.tris).padStart(5)} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)} %)`);
  }

  if (NEG) {
    console.log('\n--- NEGATIVE CONTROL: four mutations, each naming the clauses it must redden ---');
    /* THE LISTS ARE MEASURED, NOT PREDICTED, and two of them were wrong the first time
       they were run. `the-flat-plan-is-restored` names M1 and M4c and NOT M4a: on a state
       the guard already refuses the metric, restoring the flat plan changes nothing, which
       is the guard working rather than the clause failing. */
    const legs = [
      { id: 'the-flat-plan-is-restored', opts: { metricPlan: false }, breaks: ['M1', 'M4c'] },
      { id: 'the-shear-is-dropped', opts: { kappaMode: 'normal' }, breaks: ['M1'] },
      { id: 'the-edge-is-sampled-at-six-fixed-points', opts: { metricSamples: 5 }, breaks: ['M1'] },
      { id: 'the-guard-is-ignored', opts: { metricNoGuard: true }, breaks: ['M4a'] },
    ];
    for (const leg of legs) {
      const rs = states.map(([n, s]) => runState(n, s, leg.opts));
      const fired = new Set();
      for (const s of rs) for (const c of clauses(s)) if (!c.ok) fired.add(c.id);
      const missed = leg.breaks.filter((b) => !fired.has(b));
      console.log(`${leg.id.padEnd(38)} fired ${[...fired].sort().join(',') || '(nothing)'} — ${missed.length ? 'MISSED ' + missed.join(',') : 'every clause it names went red'}`);
      if (missed.length) fails++;
    }
  }

  const json = arg('--json', null);
  if (json) fs.writeFileSync(json, JSON.stringify(results.map((s) => ({ name: s.name, wall: s.wall ? s.wall.mm : null, wallThree: s.wall ? s.wall.threeMm : null, wallFlat: s.wallFlat ? s.wallFlat.mm : null, half: s.half, halfFlat: s.halfFlat, holes: s.holes, holesFlat: s.holesFlat, cells: s.cells, tris: s.tris, trisFlat: s.trisFlat, flat: s.flat, boundary: s.scratch.boundary, shells: s.scratch.shells, voxel06: s.voxel06, voxel03: s.voxel03 })), null, 1));
  console.log(`\n${fails === 0 ? 'PASS' : `FAIL — ${fails} clause failure(s)`}`);
  if (fails) process.exitCode = 1;
}
/* RUN ONLY WHEN INVOKED DIRECTLY. `wallSurfaceMm` is the session's one acceptance measure
   and `tools/shot-bloom-infill.mjs` imports it rather than restating it: a sheet that
   quoted a wall figure of its own would be a second producer of the number this gate is
   about, which is this project's most repeated defect. */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
