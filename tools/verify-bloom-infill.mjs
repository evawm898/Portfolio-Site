/* ===================================================================
   verify-bloom-infill.mjs — THE I FAMILY, THE VORONOI INFILL'S OWN GATE (S3).

     node tools/verify-bloom-infill.mjs [--quick] [--json <file>]
     node tools/verify-bloom-infill.mjs --negative-control     (REQUIRED before quoting a pass)
     node tools/verify-bloom-infill.mjs --cap-sweep [--states N]

   WHY IT IS OWED, IN THE FORM THIS PROJECT STATES IT. A cell count that
   ignores the ruled bar, a hole under `INFILL_HOLE_MM`, a relaxation that
   never runs, an achieved count that disagrees with what was built, a
   material mask that calls a hole solid, and a hole count that differs
   between the modes — ALL export watertight and as ONE CONNECTED PIECE.
   Nothing that shipped before this could see any of them: both STL gates
   measure whether the solid is closed, and a solid with the wrong number of
   holes in the wrong places is closed.

   EVERY CLAUSE'S REFERENCE HAS A DIFFERENT OWNER FROM ITS QUANTITY.

   I0 THE GUARD IS TWO STATEMENTS AND THEY AGREE. The geometry's
   `infillIsAbsent` and the registry's `infillPresent` predicate, on written-
   down states, BOTH DIRECTIONS — the androeciumEligible relation. And the
   guard is a CHOICE, which is Eva's ruling 7 and is what keeps `ALL MAX`
   uninfilled: `SWEEPABLE` filters `SLIDERS()`, so this is asserted on the
   registry row's own `kind` rather than on a comment.

   I1 THE RULED BAR IS ENFORCED ON THE OBJECT. Every hole the emitter cut is
   at least `INFILL_HOLE_MM` across, measured from the EMITTED rim loops
   through `petalSurface` DIRECTLY — the measurement reads no metric field, so
   the thing that decides the inset is not the thing that measures the hole.
   The bar is IMPORTED. S2 photographed this bar; S3 enforces it, and this is
   the clause that says so.

   I2 THE BICONDITIONAL, AND THE DROP RULE'S OWN CLAIM. A cell carries a hole
   IFF its hole clears the bar — so a cell cannot quietly keep a sub-bar hole,
   and a cell that could carry one cannot be left solid. And no INTERIOR cell
   (one the blade's own outline does not bound) survives with a capacity under
   the bar: that is the drop rule stated as a property of the result rather
   than as a description of the loop.

   I3 THE RELAXATION ACTUALLY RUNS, measured on the ARTEFACT: the cells at
   `passes: 0` differ from the shipped ones. A record saying "4 passes" over a
   loop that never moved a seed is what this refuses.

   I4 THE ACHIEVED COUNT IS THE ARTEFACT'S, AND THE INSTRUMENT IS THE GENUS.
   A hole through a sheet adds exactly one handle, so a closed petal shell
   with k holes has Euler characteristic 2 - 2k. The gate welds the emitted
   triangles by exact position, takes the component, and reads k off
   `V - E + F`. It touches no record the builder wrote. Calibrated: a PLAIN
   petal reads genus 0 — a topological sphere — on every state.
   (The genus is a number only on a CLOSED surface, so boundary edges are
   asserted 0 first; a run with a boundary edge reports the genus as invalid
   rather than as a number.)

   I5 THE MATERIAL MASK IS THE ARTEFACT'S, BOTH DIRECTIONS. Every station the
   mask calls MATERIAL has both its skin points in the emitted stream; every
   station it calls a HOLE has NEITHER. One direction alone is worth nothing:
   a mask that called everything solid passes the first, and a mask that
   called everything a hole passes the second.

   I6 THE DROP TERMINATES INSIDE THE CAP. `passesUsed < INFILL_DROP_PASSES` on
   every state, so the cap is not the thing that stopped it — and the achieved
   count at the cap equals the achieved count one pass earlier, which is the
   convergence itself rather than a claim about it.

   I7 THE TOPOLOGY IS MODE-FREE. Cells built, holes achieved and the measured
   genus are IDENTICAL live and export. How many holes a solid has is
   topology, and this project has refused a mode-dependent topology five times
   (the ladder, the seam step, the fringe's count threshold, the lobe lamina,
   the leaf's petiole ring). The plan reads `laminaHalfAt`, which is mode-free
   by construction; this is what says the construction worked.

   I8 THE FOUR S4 LEVERS REACH THE PLAN AND MOVE THE ARTEFACT (S4). Q6 first:
   every registry range, step and default is the geometry's own export, and
   the three look defaults ARE the S3 constants (the same doubles). Then the
   built default's record reads the registry's defaults back. Then each lever
   ALONE, at a non-default value, moves the EMITTED cell stream — a record
   that says "12 passes" over a plan that never read the control is what this
   refuses, and the `passes` mutant is what it caught first. And at the
   defaults the plan with the levers PASSED explicitly is bit-identical to the
   plan without them: the by-construction identity, measured.

   I9 THE BASAL BOUNDARY IS A FRACTION OF THE DERIVED TRAVEL, REBUILT. The
   floor the plan reports is `baseFloorU + frac * max(0, ROOT_BLEND_END -
   baseFloorU)` rebuilt in the gate from `ROOT_BLEND_END` (a constant with its
   own owner) and `infillFloorU` (the derived floor's own function), EXACTLY
   at 0 and at 1 and to 1 ulp between; the emitted region's lowest cell sits
   at or above it; and raising the fraction never lowers the lowest cell — the
   direction the control's name promises.

   I10 THE DENSITY LAW'S DIRECTION IS THE MEASURED ONE, AND THE DENSITY'S DEAD
   TRAVEL IS THE SWEEP'S. Eva's complaint is a claim about the along-u hole
   distribution; the control's read-out says 0 fills the tip with HOLES and
   1 with cells, so the gate asserts that at gamma 0 the top fifth of the
   default blade holds at least as many holes as at gamma 2 (measured 1 vs 0
   at density 16) — the direction, never a count. And the record's
   `densityCap` is re-derived by the gate from its own sweep of the shipped
   plan over `INFILL_DENSITY_SWEEP`: the lowest swept density reaching the
   sweep's maximum, both directions.

   I11 THE STRETCH IS THE METRIC THE CELLS ARE CUT IN, THE RELAXATION EVENS
   THE LATTICE, AND THE WALL BETWEEN HOLES IS THE RULED WALL. On the default
   blade the cells' median principal ratio at stretch 3 exceeds the ratio at
   stretch 1 (port plan §4's own measurement, on the artefact); the cells'
   area spread (coefficient of variation) at 12 passes is below the spread at
   0; and the narrowest IN-SHEET wall between two holes, read off the surface
   through `tools/bloom-infill-wall.mjs` (never the metric field), is at
   least `INFILL_WALL_MM` less the plan grid's own quantum — two rim vertices
   each moved by at most half a grid step, so the bound is DERIVED from
   `INFILL_PLAN_GRID`, not typed.

   I12 THE ROUNDNESS (the roundness-control session; Eva's ruling: the swept
   law unreparameterised, default 0.60, floor = today). Written RED FIRST
   against a tree with no control. Five clauses, and the reference of each has
   an owner the roundness code does not write:
     (a) Q6 and the gate: the registry row is the geometry's own range, step
         and default (0.60), and it is shown iff the guard is on.
     (b) THE FLOOR IS TODAY BY BRANCH: at roundness 0 every hole is, to the
         bit, the hole a patched copy of THIS tree's source draws with the
         control stood down (tools/bloom-rim-roundness-lib.mjs — read from
         disk, so a mutated module under test cannot move it).
     (c) NO SETTING IS LESS ROUND THAN TODAY, on the flat states where the
         floor is defined in surface millimetres: at every step 0..1 by 0.05
         each open hole lies INSIDE today's hole to within two plan-grid steps
         (the control clips to today's polygon and quantises), and its
         roundness (4 pi A / P^2) is at least today's.
     (d) THE ACHIEVED COUNT HOLDS AT EVERY STEP, and every open hole clears the
         ruled bar — on the flat states AND on the two curved ones, where the
         metric varies across a hole and the bar is what holds the opening
         back (without that clamp `cup 1.2 x curl 360` loses two of twelve).
     (e) THE DEFAULT IS THE RULED SHAPE: at 0.60 on the default petal the
         count and the total hole area agree with the swept law (the same
         patched copy, `openingLaw` at 0.60 x inradius) within the arc
         discretisation's own band; the per-hole proof is
         tools/bloom-roundness-law-match.mjs.
     (f) THE READ-OUT'S RECORD: rounded + at-fillet = achieved at every step
         above 0, the rounded count never falls as roundness rises, and below
         the record's own smallest onset nothing is rounded past its fillet.

   WHAT IT DOES NOT COVER, in its own header:
     - IT IS NODE-SIDE. It does not drive the page, so it inherits nothing
       about whether a row's values are REACHABLE through the UI; both STL
       gates do that.
     - THE WALL between two holes is `measureWall`'s and the combination
       gate's, through the material mask. This gate asserts the HOLE's width,
       which is the other half of ruling 3.
     - THE LOOK is nobody's clause. `node tools/shot-bloom-infill-shipped.mjs`
       is where the pattern is judged.
     - ONE SEED. The field is deterministic (`INFILL_SEED`), so every figure
       here is one seed on the states listed; the port plan's own rule about
       naming the sampling applies to this file too.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as G from '../bloom-geometry.js';
import { DEFAULTS, CONTROLS, PREDICATES, predicateDrivers, evalPredicate } from '../bloom-registry.js';
import { firstSlot } from './bloom-first-slot.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const QUICK = process.argv.includes('--quick');
const NEG = process.argv.includes('--negative-control');
const CAPSWEEP = process.argv.includes('--cap-sweep');

/* THE BAR, THE CAP AND THE WALL ARE IMPORTED. The geometry is their one
   owner; a number typed here would be a second one, and the clause would then
   measure its own consistency (the fourth durable rule). */
const BAR = G.INFILL_HOLE_MM;
const WALL = G.INFILL_WALL_MM;
const CAP = G.INFILL_DROP_PASSES;
/* `analyzeStl`'s own bar, restated here because importing `tools/bloom-harness.mjs`
   would pull in `playwright-core` at module load and this gate needs no browser
   (the wall instrument's own reason for where it sits in CI). */
const DEGENERATE_AREA_MM2 = 1e-9;

/* THE STATES. Every axis the feature has: the density ends, the two metric
   corners S2's table is about, the widths and lengths that move the cell
   count, the tip shapes, a thin foot (where `laminaHalfAt` and `halfWidthAt`
   genuinely differ), a thick sheet, tip thinning (where the LIVE sheet reaches
   zero), a lobed blade, and the two the infill REFUSES. */
const STATES = [
  ['default', {}],
  ['density 8', { infillDensity: 8 }],
  ['density 40', { infillDensity: 40 }],
  ['petalWidth 8', { petalWidth: 8 }],
  ['petalWidth 30', { petalWidth: 30 }],
  ['petalLength 20', { petalLength: 20 }],
  ['petalLength 60', { petalLength: 60 }],
  ['cup 1.2', { petalCup: 1.2 }],
  ['cup 1.2 x curl 180', { petalCup: 1.2, petalSpineCurl: 180 }],
  ['cup 1.2 x curl 360', { petalCup: 1.2, petalSpineCurl: 360 }],
  ['ALL FORM MAX', { petalCup: 1.2, petalCupGradient: 1, petalRoll: 330, petalTwist: 180, petalSpineCurl: 360 }],
  ['roll 330', { petalRoll: 330 }],
  ['buckle 0.6 f3', { buckleAmp: 0.6, buckleFreq: 3 }],
  ['petalTipShape 3', { petalTipShape: 3 }],
  ['petalTipShape 0.6', { petalTipShape: 0.6 }],
  ['footDelicacy 0.25', { footDelicacy: 0.25 }],
  ['sheet 2.4', { sheetThickness: 2.4 }],
  ['tipThinning 0.8', { tipThinning: 0.8 }],
];
/* THE TWO REFUSALS, asserted by name: a FRINGE blade is several panels and a
   sepal is pinned off. They are states the plan must decline, which is a
   claim about the branch and not about a number. */
const REFUSERS = [
  ['fringe 4 (several panels)', { petalTipEnd: 1, fringeCount: 4 }, 'panels'],
  /* A LOBED BLADE IS REFUSED, and the measurement is in the geometry's own
     header: the cells become non-convex (10 of 15 at five lobes at depth 0.6
     against 1 of 17 on the default) and the emitted solid carries MORE
     HANDLES THAN HOLES — genus 9 against 4 achieved. I4 is what found it. */
  ['lobes 5 x 0.6 (a non-convex outline)', { lobeDepth: 0.6, lobeCount: 5 }, 'outline'],
  ['lobes 10 x 1.0 (a non-convex outline)', { lobeDepth: 1, lobeCount: 10 }, 'outline'],
];
const QUICK_RE = /default|cup 1\.2 x curl 360|density 40|tipThinning|petalWidth 8/;

/* ---------------- the artefact's own instruments ---------------- */

/* THE EMITTED SHELLS, welded BY EXACT POSITION, with the Euler characteristic
   of each. Degenerate triangles are excluded from the faces AND their edges
   from the census — a triangle with a repeated corner is not a face and its
   self-loop is not an edge — and counted, because the emitter is supposed to
   produce none. */
function shellsOf(pos) {
  const idx = new Map(); const vid = new Array(pos.length / 3);
  for (let i = 0, n = 0; i < pos.length; i += 3, n++) {
    const k = `${pos[i]},${pos[i + 1]},${pos[i + 2]}`;
    let v = idx.get(k); if (v === undefined) { v = idx.size; idx.set(k, v); }
    vid[n] = v;
  }
  const par = new Array(idx.size); for (let i = 0; i < par.length; i++) par[i] = i;
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
  const tris = []; let degenerate = 0;
  for (let t = 0; t < vid.length; t += 3) {
    const a = vid[t], b = vid[t + 1], c = vid[t + 2];
    if (a === b || b === c || c === a) { degenerate++; continue; }
    uni(a, b); uni(b, c); tris.push([a, b, c]);
  }
  const comp = new Map();
  for (const T of tris) {
    const r = find(T[0]);
    let o = comp.get(r); if (!o) { o = { V: new Set(), E: new Map(), F: 0 }; comp.set(r, o); }
    o.F++; for (const v of T) o.V.add(v);
    for (const [x, y] of [[T[0], T[1]], [T[1], T[2]], [T[2], T[0]]]) { const k = x < y ? `${x}|${y}` : `${y}|${x}`; o.E.set(k, (o.E.get(k) || 0) + 1); }
  }
  let boundary = 0;
  const out = [];
  for (const o of comp.values()) {
    for (const n of o.E.values()) if (n === 1) boundary++;
    const chi = o.V.size - o.E.size + o.F;
    out.push({ V: o.V.size, E: o.E.size, F: o.F, chi, genus: (2 - chi) / 2 });
  }
  return { shells: out.sort((a, b) => b.F - a.F), boundary, degenerate };
}

/* Point-to-triangle distance (Ericson's region test). Exact, no tolerance. */
function ptTriDist(p, a, b, c) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const d1 = ab[0] * ap[0] + ab[1] * ap[1] + ab[2] * ap[2];
  const d2 = ac[0] * ap[0] + ac[1] * ap[1] + ac[2] * ap[2];
  if (d1 <= 0 && d2 <= 0) return Math.hypot(ap[0], ap[1], ap[2]);
  const bp = [p[0] - b[0], p[1] - b[1], p[2] - b[2]];
  const d3 = ab[0] * bp[0] + ab[1] * bp[1] + ab[2] * bp[2];
  const d4 = ac[0] * bp[0] + ac[1] * bp[1] + ac[2] * bp[2];
  if (d3 >= 0 && d4 <= d3) return Math.hypot(bp[0], bp[1], bp[2]);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const t = d1 / (d1 - d3); return Math.hypot(p[0] - (a[0] + ab[0] * t), p[1] - (a[1] + ab[1] * t), p[2] - (a[2] + ab[2] * t)); }
  const cp = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
  const d5 = ab[0] * cp[0] + ab[1] * cp[1] + ab[2] * cp[2];
  const d6 = ac[0] * cp[0] + ac[1] * cp[1] + ac[2] * cp[2];
  if (d6 >= 0 && d5 <= d6) return Math.hypot(cp[0], cp[1], cp[2]);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const t = d2 / (d2 - d6); return Math.hypot(p[0] - (a[0] + ac[0] * t), p[1] - (a[1] + ac[1] * t), p[2] - (a[2] + ac[2] * t)); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const t = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return Math.hypot(p[0] - (b[0] + (c[0] - b[0]) * t), p[1] - (b[1] + (c[1] - b[1]) * t), p[2] - (b[2] + (c[2] - b[2]) * t)); }
  const den = 1 / (va + vb + vc), v1 = vb * den, w1 = vc * den;
  return Math.hypot(p[0] - (a[0] + ab[0] * v1 + ac[0] * w1), p[1] - (a[1] + ab[1] * v1 + ac[1] * w1), p[2] - (a[2] + ab[2] * v1 + ac[2] * w1));
}

/* FLOAT32 DEGENERACY, the bar both STL gates fail on, measured the way
   `analyzeStl` measures it — on the raw floats, so quantising cannot
   manufacture one. */
function degenerateFloat32(pos) {
  const f = Math.fround; let n = 0;
  for (let t = 0; t < pos.length; t += 9) {
    const ax = f(pos[t]), ay = f(pos[t + 1]), az = f(pos[t + 2]);
    const e1 = [f(pos[t + 3]) - ax, f(pos[t + 4]) - ay, f(pos[t + 5]) - az];
    const e2 = [f(pos[t + 6]) - ax, f(pos[t + 7]) - ay, f(pos[t + 8]) - az];
    const cx = e1[1] * e2[2] - e1[2] * e2[1], cy = e1[2] * e2[0] - e1[0] * e2[2], cz = e1[0] * e2[1] - e1[1] * e2[0];
    if (0.5 * Math.hypot(cx, cy, cz) <= DEGENERATE_AREA_MM2) n++;
  }
  return n;
}

/* HOW WIDE IS AN EMITTED HOLE, ON THE OBJECT — and it reads NO METRIC FIELD.
   The rim loop is a closed polyline of plan points; the gate maps each pair of
   consecutive points through `petalSurface` and measures the SURFACE polygon's
   inradius by the same bisection the builder uses on its own plan, but with
   the per-edge distance taken from the EMITTED 3-space polyline rather than
   from `infillOffsetPlanMm`. So the quantity the plan optimises and the
   quantity this asserts come from two different producers. */
function holeWidthOnObjectMm(surface, loop) {
  const L = surface.length;
  const n = loop.length;
  if (n < 3) return { surfaceMm: 0, threeMm: 0, planMm: 0 };
  /* THE INCENTRE IS THE CHEBYSHEV CENTRE OF THE PLAN LOOP, found by bisecting
     "the inset by r is non-empty" — the same question the builder asks, asked
     through a SECOND implementation written here, over the loops the EMITTER
     walked rather than the polygons the plan holds. A hill climb was tried
     first and under-read by 2.8 % (1.4801 against a true 1.5230 on
     `infillDensity` 40), which is the direction that produces a false red. */
  const clipHP = (poly, a, b, c) => { const out = []; const m = poly.length; for (let i = 0; i < m; i++) { const P = poly[i], Q = poly[(i + 1) % m]; const dp = a * P.x + b * P.y + c, dq = a * Q.x + b * Q.y + c; if (dp <= 0) out.push(P); if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) { const t = dp / (dp - dq); out.push({ x: P.x + (Q.x - P.x) * t, y: P.y + (Q.y - P.y) * t }); } } return out; };
  const ccw = (poly) => { let a = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p.x * q.y - q.x * p.y; } return a < 0 ? poly.slice().reverse() : poly; };
  const inset = (d) => { const P = ccw(loop); let out = loop.slice(); for (let i = 0; i < P.length && out.length >= 3; i++) { const A = P[i], B = P[(i + 1) % P.length]; const ex = B.x - A.x, ey = B.y - A.y, l = Math.hypot(ex, ey); if (l < 1e-9) continue; const nx = ey / l, ny = -ex / l; out = clipHP(out, nx, ny, -(nx * A.x + ny * A.y) + d); } return out.length >= 3 ? out : null; };
  let lo = 1e-6, hi = 12;
  if (!inset(lo)) return { surfaceMm: 0, threeMm: 0, planMm: 0 };
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (inset(mid)) lo = mid; else hi = mid; }
  const core = inset(lo * 0.999) || [loop[0]];
  let C = { x: 0, y: 0 }; for (const q of core) { C.x += q.x / core.length; C.y += q.y / core.length; }

  const at = (q) => { const u = Math.min(1, Math.max(0, q.x / L)); const h = surface.profile.laminaHalfAt(u); const v = Math.max(-1, Math.min(1, h > 1e-9 ? q.y / h : 0)); return surface.at(u, v).P; };
  /* THE WIDTH ON THE OBJECT, AS THE PAIR IT IS. The IN-SHEET length of the
     straight plan segment from the centre to a rim point is an UPPER bound on
     the geodesic through the material; the 3-SPACE distance of the same pair
     is a LOWER bound. S2's own gate reports the same pair for the wall and
     asserts on the in-sheet one; this does the same for the hole, so the two
     halves of ruling 3 are measured in one measure. On a flat petal the two
     and the plan agree exactly. */
  const inSheet = (A, B, k = 24) => { let acc = 0, prev = at(A); for (let i = 1; i <= k; i++) { const q = at({ x: A.x + (B.x - A.x) * i / k, y: A.y + (B.y - A.y) * i / k }); acc += Math.hypot(q[0] - prev[0], q[1] - prev[1], q[2] - prev[2]); prev = q; } return acc; };
  const P3 = at(C);
  let sMin = Infinity, tMin = Infinity;
  for (let i = 0; i < n; i++) {
    /* the rim is walked at its own points AND at each edge's midpoint, so a
       minimiser between two vertices is not skipped */
    for (const q of [loop[i], { x: (loop[i].x + loop[(i + 1) % n].x) / 2, y: (loop[i].y + loop[(i + 1) % n].y) / 2 }]) {
      const s2 = inSheet(C, q); if (s2 < sMin) sMin = s2;
      const Q = at(q); const t = Math.hypot(Q[0] - P3[0], Q[1] - P3[1], Q[2] - P3[2]); if (t < tMin) tMin = t;
    }
  }
  return { surfaceMm: 2 * sMin, threeMm: 2 * tMin, planMm: 2 * lo };
}

/* ---------------- one state ---------------- */
function runState(name, set, opts = null, mode = 'export') {
  const exportMode = mode === 'export';
  const st = { ...DEFAULTS, ...set, petalInfill: 'VORONOI' };
  const acc0 = new G.MeshBuilder({ exportMode });
  const { ring, slot } = firstSlot(st, acc0);
  const cap = opts ? { infillOpts: opts.plan || undefined, infillMaskAllMaterial: !!opts.maskAllMaterial } : null;
  const a = new G.MeshBuilder({ exportMode, captureGrid: true });
  const petal = G.buildPetalInto(a, st, ring, slot, cap, true);
  /* THE PLAIN CONTROL, the same state with the guard off — the calibration for
     the genus and the reference for "the silhouette did not move". */
  const ap = new G.MeshBuilder({ exportMode, captureGrid: true });
  const plain = G.buildPetalInto(ap, { ...st, petalInfill: 'NONE' }, ring, slot, null, true);
  const surface = G.petalSurface(st, ring, slot, cap, acc0);
  /* I4's SUBJECT IS THE CELLS' OWN SHEET, NOT THE WELDED PETAL — and this is
     a correction the emitter forced rather than a convenience. The basal panel
     is a SECOND closed solid abutting the cell region along the seam; they
     share the seam's vertices AND its edges, so the welded complex is not a
     manifold surface there and its Euler characteristic is not 2 - 2g for
     anything. Measured on the shipping default it reads genus 9 against 14
     holes cut, and the shortfall is EXACTLY 5 at every density, width, length
     and form — a constant, which is the tell that what is being counted is the
     JUNCTION rather than the holes. The builder therefore declares the range
     of triangles the cells themselves emitted (`emittedTriRange`), and the
     clause measures that: adjacent cells share a wall and emit no rim between
     them, so the cells are one closed manifold sheet and read 2 - 2h exactly.
     The WELDED petal is still asked for boundary edges, which is a claim the
     junction cannot spoil. */
  const R = petal.infill && petal.infill.emittedTriRange;
  const cellPos = R ? a.positions.slice(R[0] * 9, R[1] * 9) : a.positions;
  const s = shellsOf(a.positions), sp = shellsOf(ap.positions), sc = shellsOf(cellPos);
  return { name, mode, petal, plain, surface, acc: a, accPlain: ap, shells: s, plainShells: sp, cellShells: sc,
    degen32: degenerateFloat32(a.positions), tris: a.triangleCount, plainTris: ap.triangleCount };
}

/* ---------------- the clauses ---------------- */
/* I1'S DECLARED ROWS — a record of the tree, with a number the gate reads.
   `ALL FORM MAX` (cup 1.2 + gradient 1 + roll 330 + twist 180 + curl 360) at
   the RULED DEFAULTS (density 20, relax 5, law 0.30, stretch 1.65): the
   builder keeps a hole whose on-object width reads 1.4799 mm against the
   1.50 mm bar. PRE-EXISTING, EXPOSED BY THE DENSITY LAW: the builder decides
   the bar through `infillWidthMm` on the metric field, this clause measures
   the emitted loop in-sheet from its Chebyshev centre, and the two estimators
   agree while the law is 1 — on the OLD defaults with ONLY the law moved to
   0.30 the same state reads 1.4034; with only the law put back to 1 on the new
   defaults it reads 1.5814. Measured on the ruled-defaults tree, both modes.
   The fix is the builder's bar estimator and is its own change. */
const I1_XFAIL = Object.freeze({
  'ALL FORM MAX': { worstMm: 1.4799, note: 'builder bar estimator vs on-object width under a density law of 0.30; the ruled-defaults session' },
});
function clauses(r, plan) {
  const out = [];
  const add = (id, ok, msg) => out.push({ id, ok, msg });
  const F = r.petal.infill;
  if (!F) { add('I2', false, `${r.name}: the builder produced no infill record with the guard on`); return out; }
  if (F.refused) { add('I2', false, `${r.name}: the plan refused (${F.refused})`); return out; }

  /* I1 — every emitted hole clears the ruled bar, on the object. */
  const widths = (F.emittedLoops || []).map((h) => holeWidthOnObjectMm(r.surface, h));
  const worst = widths.length ? Math.min(...widths.map((w) => w.surfaceMm)) : 0;
  const worstThree = widths.length ? Math.min(...widths.map((w) => w.threeMm)) : 0;
  const worstPlan = widths.length ? Math.min(...widths.map((w) => w.planMm)) : 0;
  add('I1', widths.length > 0, `${r.name}: no hole was cut at all — I1 would be vacuous`);
  const xf = I1_XFAIL[r.name];
  if (xf) {
    /* A DECLARED ROW IS HELD TO ITS RECORD IN BOTH DIRECTIONS (#213's rule):
       still under the bar, and at the recorded width within the record's own
       rounding. Clearing the bar is the fix landing — take the entry off. */
    add('I1', worst < BAR - 1e-9, `${r.name}: the declared sub-bar hole now reads ${worst.toFixed(4)} mm, AT OR OVER the ruled ${BAR.toFixed(2)} — the builder's bar decision and the on-object width agree again; REMOVE its I1_XFAIL entry`);
    add('I1', Math.abs(worst - xf.worstMm) <= 5e-5, `${r.name}: the declared sub-bar hole reads ${worst.toFixed(4)} mm against its record ${xf.worstMm.toFixed(4)} — ${worst < xf.worstMm ? 'WORSE' : 'better'} than declared; a change moved it and owes a re-record`);
  } else {
    add('I1', worst >= BAR - 1e-9, `${r.name}: the narrowest EMITTED hole is ${worst.toFixed(4)} mm of material across (in-sheet), under the ruled ${BAR.toFixed(2)} mm — its 3-space chord reads ${worstThree.toFixed(4)} and its PLAN width ${worstPlan.toFixed(4)}`);
  }

  /* I2 — the biconditional, and the drop rule's own claim. */
  let wrongWay = 0;
  for (let i = 0; i < plan.cells.length; i++) {
    const cut = plan.cellOpen[i], clears = plan.widthsMm[i] >= BAR;
    if (cut !== clears) wrongWay++;
  }
  add('I2', wrongWay === 0, `${r.name}: ${wrongWay} cells where "a hole was cut" and "the hole clears the bar" disagree`);
  const touchesOutline = (c) => { for (let i = 0; i < c.length; i++) if (plan.isOutlineEdge(c[i], c[(i + 1) % c.length])) return true; return false; };
  let interiorSub = 0;
  for (let i = 0; i < plan.cells.length; i++) if (plan.capacityMm[i] < BAR && !touchesOutline(plan.cells[i])) interiorSub++;
  add('I2', interiorSub === 0, `${r.name}: ${interiorSub} INTERIOR cells survive with a capacity under the ruled bar — the drop did not redistribute them`);

  /* I4 — the achieved count is the genus of the emitted shell. */
  add('I4', r.shells.boundary === 0, `${r.name}: ${r.shells.boundary} boundary edges on the emitted petal — the genus is not a number on an open surface`);
  add('I4', r.plainShells.shells.length === 1 && r.plainShells.shells[0].genus === 0,
    `${r.name}: the PLAIN petal is not a topological sphere (${r.plainShells.shells.length} shells, genus ${r.plainShells.shells.map((x) => x.genus).join('/')}) — the calibration this clause rests on does not hold`);
  add('I4', r.cellShells.boundary === 0, `${r.name}: ${r.cellShells.boundary} boundary edges on the cells' own sheet — the genus is not a number on an open surface`);
  const g = r.cellShells.shells.reduce((a, x) => a + x.genus, 0);
  add('I4', g === F.achieved, `${r.name}: the cells' own sheet has genus ${g} and the builder reports ${F.achieved} holes achieved`);
  add('I4', r.degen32 === 0, `${r.name}: ${r.degen32} degenerate triangles at float32 — both STL gates fail on a non-zero count`);

  /* I5 — THE MATERIAL MASK IS THE ARTEFACT'S, BOTH DIRECTIONS, AND ITS
     SUBJECT IS "IS THERE MATERIAL HERE" AND NOT "DID THE EMITTER PUT A VERTEX
     HERE". The first draft of this clause asked the second question and went
     red on 254 of 406 MATERIAL stations of the shipping default, correctly:
     the cells tile the region with THEIR OWN vertices, so a lattice station
     inside a cell is on the emitted skin without being one of its corners.
     What the mask claims is that the station's skin point lies ON the emitted
     surface; what it denies is that a hole's does. So the measure is the
     DISTANCE from the station's top-skin point to the nearest emitted
     triangle, and the clause is that the two populations separate — material
     stations ON the surface, hole stations OFF it by at least the ruled bar's
     own half-width, which is the narrowest a hole may be. */
  /* I5 — THE MASK AGREES WITH THE LOOPS THE EMITTER ACTUALLY DREW, BOTH
     DIRECTIONS AND EXACTLY. `plan.emittedLoops` are the DENSIFIED rim loops
     `emitInfillPanel` walked its rim quads along, recorded on the way out —
     the artefact's own holes, not the polygons the plan holds — and the clause
     is a point-in-polygon biconditional against the mask over every station of
     the cell region.

     TWO WRONG SUBJECTS WERE TRIED FIRST AND BOTH LOOKED REASONABLE. "Are the
     station's two skin points among the emitted VERTICES" went red on 254 of
     406 material stations of the shipping default — correctly, because the
     cells tile the region with their OWN vertices and a station inside a cell
     is on the skin without being a corner of it. "Is the station's mid point
     INSIDE the emitted solid, by ray parity" is the right question and is not
     available: a MARGIN station sits exactly ON the rim wall, where parity is
     undefined, and it read 61 of 326 material stations outside on a tree with
     no defect in it. What the mask claims is which stations the emitter cut
     away, and the loops it cut are the thing to ask.

     DECLARED BLINDNESS: the emitted loops derive from the same plan polygons
     the mask does, so a hole that is wrong in BOTH is not caught here — I1
     asserts the hole's own width on the object and I4 counts the handles the
     solid actually has. */
  const loops = F.emittedLoops || [];
  const inPoly = (x, y, poly) => { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside; } return inside; };
  const Lm = r.surface.length;
  let matSeen = 0, holeSeen = 0, matOut = 0, holeIn = 0;
  add('I5', loops.length === F.achieved, `${r.name}: the emitter walked ${loops.length} hole rim loops and reports ${F.achieved} holes achieved`);
  for (const pan of r.petal.grid) for (const row of pan.rows) {
    if (row.row <= F.mSplit) continue;             // the basal sub-panel is emitPanel's own and is all material by construction
    const hh = r.surface.profile.laminaHalfAt(row.u);
    for (let j = 0; j < row.mid.length; j++) {
      const x = row.u * Lm, y = row.v[j] * hh;
      const cut = loops.some((lp) => inPoly(x, y, lp));
      if (row.material[j]) { matSeen++; if (cut) matOut++; }
      else { holeSeen++; if (!cut) holeIn++; }
    }
  }
  add('I5', matSeen > 0 && holeSeen > 0, `${r.name}: the mask calls ${matSeen} cell-region stations material and ${holeSeen} a hole — one of the two directions is vacuous`);
  add('I5', matOut === 0, `${r.name}: ${matOut} of ${matSeen} MATERIAL stations lie inside a loop the emitter cut away`);
  add('I5', holeIn === 0, `${r.name}: ${holeIn} of ${holeSeen} HOLE stations lie inside NO loop the emitter cut — the mask calls a hole what the emitter filled`);

  /* I6 — the drop terminated inside the cap. */
  add('I6', F.passesUsed < CAP, `${r.name}: the drop used all ${CAP} passes — the cap is what stopped it, not convergence`);
  return out;
}

/* ---------------- I0, I3, I7: whole-run clauses ---------------- */
function guardClauses() {
  const out = [];
  const add = (ok, msg) => out.push({ id: 'I0', ok, msg });
  const row = CONTROLS.find((c) => c.id === 'petalInfill');
  add(!!row, 'the registry declares no `petalInfill` control');
  if (row) {
    add(row.kind === 'choice', `the guard is a ${row.kind} and Eva's ruling 7 is that it is a CHOICE — a slider would be reached by the blanket sweep, and ALL MAX would be infilled`);
    add(row.default === 'NONE', `the guard ships at ${row.default} and ruling 1 is that the infill ships OFF`);
  }
  const dens = CONTROLS.find((c) => c.id === 'infillDensity');
  add(!!dens && dens.default === G.INFILL_DENSITY_DEFAULT, `the density ships at ${dens ? dens.default : '(absent)'} and ruling 1 is ${G.INFILL_DENSITY_DEFAULT}`);
  /* THE TWO STATEMENTS, BOTH DIRECTIONS. */
  const pred = PREDICATES.infillPresent;
  add(!!pred, 'the registry declares no `infillPresent` predicate');
  for (const v of ['NONE', 'VORONOI']) {
    const st = { ...DEFAULTS, petalInfill: v };
    const geom = G.infillIsAbsent(st);
    const reg = pred && pred.all.every((t) => (t.oneOf ? t.oneOf.includes(String(st[t.id])) : true));
    add(geom === !reg, `at petalInfill=${v} the geometry says absent=${geom} and the registry predicate says present=${reg}`);
  }
  /* RULING 4 — the sepals are pinned off, and this is the geometry's own
     statement rather than a sweep: `sepalBladeState` is the one place a petal
     control reaches a sepal. */
  const sep = G.sepalBladeState({ ...DEFAULTS, petalInfill: 'VORONOI' }, 20);
  add(G.infillIsAbsent(sep), `a sepal built from a state with the infill ON inherits petalInfill=${sep.petalInfill} — ruling 4 pins it off`);
  return out;
}

function relaxClause(r, plan) {
  /* I3 — measured on the ARTEFACT: the cells at `passes: 0` differ. */
  const unrelaxed = G.petalInfillPlan(r.surface, r.petal.grid[0].rows, panelOf(r.petal), { density: r.petal.infill.density, passes: 0 });
  const a = JSON.stringify(plan.cells.map((c) => c.map((q) => [+q.x.toFixed(6), +q.y.toFixed(6)])));
  const b = JSON.stringify(unrelaxed.cells.map((c) => c.map((q) => [+q.x.toFixed(6), +q.y.toFixed(6)])));
  return { id: 'I3', ok: a !== b, msg: `${r.name}: the cells at 0 relaxation passes are identical to the shipped ones — the relaxation is a record over a loop that moved nothing` };
}
function panelOf(petal) {
  const g = petal.grid[0];
  return { rowFrom: g.rowFrom, rowTo: g.rowTo, label: g.label, spanAt: () => [-1, 1] };
}

/* ---------------- the run ---------------- */
function planOf(r, opts) {
  return G.petalInfillPlan(r.surface, r.petal.grid[0].rows, panelOf(r.petal), { density: r.petal.infill.density, ...(opts && opts.plan ? opts.plan : null) });
}

/* VALIDITY FIRST, AND IT ABORTS. A tree with no infill in it must read this
   gate as a clean RED and not as a crash — a harness that dies on a missing
   export reports nothing, and "it threw" is indistinguishable from "the gate
   is blind". This is what makes the I family checkable against a worktree of
   the base commit: run there it names every export the feature owes and fails,
   which is the RED-BEFORE-THE-GEOMETRY evidence in a form somebody can re-run. */
function validity() {
  const bad = [];
  const need = ['INFILL_HOLE_MM', 'INFILL_WALL_MM', 'INFILL_DROP_PASSES', 'INFILL_DENSITY_RANGE', 'INFILL_DENSITY_DEFAULT', 'INFILL_SEED'];
  for (const k of need) if (G[k] === undefined) bad.push(`bloom-geometry.js exports no \`${k}\``);
  for (const k of ['infillIsAbsent', 'petalInfillPlan']) if (typeof G[k] !== 'function') bad.push(`bloom-geometry.js exports no \`${k}()\``);
  if (!CONTROLS.some((c) => c.id === 'petalInfill')) bad.push('bloom-registry.js declares no `petalInfill` control');
  if (!PREDICATES.infillPresent) bad.push('bloom-registry.js declares no `infillPresent` predicate');
  if (typeof (G.petalSurface({ ...DEFAULTS }, { thickness: 1 }, { index: 0 }, null, new G.MeshBuilder({})) || {}).profile?.laminaHalfAt !== 'function') {
    bad.push('widthProfile exposes no `laminaHalfAt` — the plan has no mode-free half-width to decide topology on');
  }
  return bad;
}

async function main() {
  const v = validity();
  if (v.length) {
    console.log('HARNESS INVALID — the tree does not carry the infill, so nothing below could be trustworthy:');
    for (const m of v) console.log('  ' + m);
    console.log('FAIL');
    process.exitCode = 1;
    return;
  }
  if (CAPSWEEP) return capSweep();
  const states = QUICK ? STATES.filter(([n]) => QUICK_RE.test(n)) : STATES;
  const results = [];
  let fails = 0;
  const say = (c) => { if (!c.ok) { fails++; console.log(`  FAIL ${c.id}: ${c.msg}`); } };

  console.log(`THE VORONOI INFILL — ${states.length} states, ONE SEED (${G.INFILL_SEED}), density from the state, wall ${WALL.toFixed(2)} mm, ruled hole bar ${BAR.toFixed(2)} mm, drop cap ${CAP}.`);
  console.log('');
  for (const c of guardClauses()) say(c);

  console.log('state                      mode    cells  holes  solid  pass  genus  narrowest  widest   tris (plain -> infilled)');
  for (const [name, set] of states) {
    for (const mode of ['export', 'live']) {
      const r = runState(name, set, null, mode);
      const plan = planOf(r, null);
      const cs = clauses(r, plan);
      for (const c of cs) say(c);
      if (mode === 'export') say(relaxClause(r, plan));
      const F = r.petal.infill;
      const ws = (F.emittedLoops || []).map((h) => holeWidthOnObjectMm(r.surface, h).surfaceMm).sort((a, b) => a - b);
      console.log(`${name.padEnd(26)} ${mode.padEnd(7)} ${String(F.cells).padStart(5)}  ${String(F.achieved).padStart(5)}  ${String(F.solid).padStart(5)}  ${String(F.passesUsed).padStart(4)}  ${String(r.cellShells.shells.reduce((a, x) => a + x.genus, 0)).padStart(5)}  ${(ws[0] ?? 0).toFixed(3).padStart(9)}  ${(ws[ws.length - 1] ?? 0).toFixed(3).padStart(6)}   ${String(r.plainTris).padStart(6)} -> ${String(r.tris).padStart(6)}`);
      results.push({ name, mode, cells: F.cells, achieved: F.achieved, solid: F.solid, passes: F.passesUsed, genus: r.cellShells.shells.reduce((a, x) => a + x.genus, 0), tris: r.tris, plainTris: r.plainTris, narrowestMm: ws[0] ?? 0 });
    }
  }

  /* I7 — the topology is mode-free. */
  console.log('');
  let modeDiff = 0;
  for (const [name] of states) {
    const e = results.find((x) => x.name === name && x.mode === 'export');
    const l = results.find((x) => x.name === name && x.mode === 'live');
    if (!e || !l) continue;
    if (e.cells !== l.cells || e.achieved !== l.achieved || e.genus !== l.genus) {
      modeDiff++;
      console.log(`  FAIL I7: ${name}: export ${e.cells} cells / ${e.achieved} holes / genus ${e.genus} against live ${l.cells} / ${l.achieved} / ${l.genus}`);
      fails++;
    }
  }
  console.log(`I7 the topology is mode-free: ${states.length - modeDiff} of ${states.length} states identical live and export (cells, holes achieved and the measured genus).`);

  /* S4 — I8..I11, on the shipped module. */
  for (const c of s4Clauses(G, null)) say(c);
  /* THE ROUNDNESS — I12. */
  { const cs = await i12Clauses(G, QUICK); for (const c of cs) say(c); console.log(`I12 the roundness: ${cs.filter((c) => c.ok).length} of ${cs.length} checks green (floor by branch, containment and roundness against today, count and bar at every step, the ruled default, the record).`); }

  /* The two refusals, by name. */
  for (const [name, set, why] of REFUSERS) {
    const st = { ...DEFAULTS, ...set, petalInfill: 'VORONOI' };
    const acc = new G.MeshBuilder({ exportMode: true });
    const { ring, slot } = firstSlot(st, acc);
    const a = new G.MeshBuilder({ exportMode: true, captureGrid: true });
    const p = G.buildPetalInto(a, st, ring, slot, null, true);
    const ap = new G.MeshBuilder({ exportMode: true });
    G.buildPetalInto(ap, { ...st, petalInfill: 'NONE' }, ring, slot, null, true);
    const same = a.positions.length === ap.positions.length && a.positions.every((v, i) => Object.is(v, ap.positions[i]));
    const got = p.infill ? p.infill.refused : 'no record';
    const ok = got === why && same;
    if (!ok) { fails++; console.log(`  FAIL I2: ${name}: the plan says "${got}" (wanted "${why}") and the mesh is ${same ? 'identical to' : 'NOT identical to'} the same state with the guard off`); }
    else console.log(`I2 refusal: ${name} — "${why}", and the mesh is bit-identical to the same state with the guard off.`);
  }

  if (NEG) { fails += negativeControl(states); fails += await s4NegativeControl(); }

  const json = arg('--json', null);
  if (json) fs.writeFileSync(json, JSON.stringify(results, null, 1));
  console.log('');
  console.log(fails === 0 ? `PASS — I0..I12 over ${states.length} states x 2 modes.` : `FAIL — ${fails} clause failure(s)`);
  if (fails) process.exitCode = 1;
}

/* ---------------- the negative control ---------------- */
/* EVERY MUTATION RUNS THROUGH THE SHIPPED FUNCTION rather than a mutated copy
   of it — the capability hook carries the lever and no control reaches it, so
   the clause the control exercises is the clause that ships (S1's
   `{ conform: false }` precedent and S2's four levers).

   THE LISTS ARE MEASURED, NOT PREDICTED. */
function negativeControl(states) {
  console.log('');
  console.log('--- NEGATIVE CONTROL: six mutations, each naming the clauses it must redden ---');
  const legs = [
    { id: 'the-ruled-bar-is-ignored', opts: { plan: { holeBarMm: 0.6 } }, breaks: ['I1'] },
    { id: 'the-drop-never-runs', opts: { plan: { dropPasses: 0 } }, breaks: ['I2'] },
    { id: 'the-drop-eats-the-outline', opts: { plan: { dropRule: 'all' } }, breaks: ['I6'] },
    { id: 'the-relaxation-never-runs', opts: { plan: { passes: 0 } }, breaks: ['I3'] },
    { id: 'the-metric-is-dropped', opts: { plan: { metricPlan: false } }, breaks: ['I1'] },
    { id: 'the-mask-is-all-material', opts: { maskAllMaterial: true }, breaks: ['I5'] },
  ];
  let fails = 0;
  for (const leg of legs) {
    const fired = new Set();
    for (const [name, set] of states) {
      let r;
      try { r = runState(name, set, leg.opts, 'export'); } catch (e) { fired.add('threw'); continue; }
      const plan = planOf(r, leg.opts);
      for (const c of clauses(r, plan)) if (!c.ok) fired.add(c.id);
      if (leg.opts.plan && leg.opts.plan.passes === 0) {
        /* I3's own comparison is against `passes: 0`, so under THIS mutation the
           shipped plan IS the unrelaxed one and the clause must fire. */
        const rc = relaxClause(r, plan); if (!rc.ok) fired.add('I3');
      }
    }
    const missed = leg.breaks.filter((b) => !fired.has(b));
    console.log(`${leg.id.padEnd(32)} fired ${[...fired].sort().join(',') || '(nothing)'} — ${missed.length ? 'MISSED ' + missed.join(',') : 'every clause it names went red'}`);
    if (missed.length) fails++;
  }
  return fails;
}

/* ---------------- S4: I8..I11 ---------------- */
/* EVERY CLAUSE HERE TAKES THE MODULE AS AN ARGUMENT, so the negative control
   can hand it a MUTATED COPY of bloom-geometry.js and the clause measures the
   mutated artefact rather than the shipped one — session 41's L7 lesson: a
   clause with both halves on the unmutated module cannot fire. */
import { pathToFileURL } from 'node:url';
import { infillPlanFor, infillWallSurfaceMm } from './bloom-infill-wall.mjs';
const S4_DEFAULT = {};
import * as RL from './bloom-rim-roundness-lib.mjs';
let FLOOR_VARIANT = null;
async function floorVariant() { if (!FLOOR_VARIANT) { FLOOR_VARIANT = await RL.loadVariant({ K: 4, law: true }); globalThis.__holeLaw = (Pl, fr, infillFillet) => infillFillet(Pl, fr); } return FLOOR_VARIANT; }
function roundnessQ(h) { let per = 0; for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length]; per += Math.hypot(b.x - a.x, b.y - a.y); } return per > 0 ? (4 * Math.PI * polyArea(h)) / (per * per) : 0; }
function ccwPoly(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; } return s < 0 ? p.slice().reverse() : p; }
function outsideBy(q, poly) { let worst = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const L = Math.hypot(b.x - a.x, b.y - a.y); if (L < 1e-12) continue; const cr = ((b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x)) / L; if (-cr > worst) worst = -cr; } return worst; }
const I12_FLAT = [['default', {}], ['petalWidth 8', { petalWidth: 8 }], ['petalWidth 30', { petalWidth: 30 }], ['density 40', { infillDensity: 40 }]];
const I12_CURVED = [['cup 1.2 x curl 360', { petalCup: 1.2, petalSpineCurl: 360 }], ['ALL FORM MAX', { petalCup: 1.2, petalCupGradient: 1, petalRoll: 330, petalTwist: 180, petalSpineCurl: 360 }]];
export async function i12Clauses(M, quick = false) {
  const out = []; const add = (id, ok, msg) => out.push({ id, ok, msg });
  const r = CONTROLS.find((c) => c.id === 'infillRound');
  /* (a) */
  add('I12', !!r && r.min === M.INFILL_ROUND_RANGE?.[0] && r.max === M.INFILL_ROUND_RANGE?.[1] && r.step === M.INFILL_ROUND_STEP && Object.is(r.default, M.INFILL_ROUND_DEFAULT) && r.default === 0.6,
    `the registry's infillRound (${r ? `${r.min}..${r.max} step ${r.step}, default ${r.default}` : 'absent'}) is not the geometry's export (${M.INFILL_ROUND_RANGE} step ${M.INFILL_ROUND_STEP}, default ${M.INFILL_ROUND_DEFAULT}) at Eva's ruled 0.60`);
  if (r) add('I12', predicateDrivers(r.visibleWhen).has('petalInfill') && !evalPredicate(r.visibleWhen, { ...DEFAULTS, petalInfill: 'NONE' }) && evalPredicate(r.visibleWhen, { ...DEFAULTS, petalInfill: 'VORONOI' }), 'infillRound is not shown iff the guard is on');
  const V = await floorVariant();
  const planM = (set, round) => s4Plan(M, { ...set, infillRound: round }, { round }).plan;
  const openH = (P) => P.holes.map((h, i) => (h && P.cellOpen[i] ? h : null));
  /* CONTAINMENT IS EXACT UP TO QUANTISATION: the control clips every opened
     hole to today's polygon, and the result is quantised onto the plan grid —
     so no vertex may stand more than one grid step outside it. (Without the
     clip the finer trace bulges out by up to the five-chord trace's own
     sagitta, 3.9e-2 mm, which is what the clip's mutant measures.) */
  const band = 2 * M.INFILL_PLAN_GRID;
  const steps = quick ? [0, 0.05, 0.2, 0.3, 0.6, 1] : Array.from({ length: 21 }, (_, k) => k / 20);
  for (const [name, set] of [...I12_FLAT, ...I12_CURVED]) {
    const flat = I12_FLAT.some(([n]) => n === name);
    const P0 = planM(set, 0);
    /* (b) the floor by branch, against the patched copy with the control stood down. */
    if (flat || name === 'cup 1.2 x curl 360') {
      const ref = RL.planFor(V, DEFAULTS, set).plan;
      const H0 = openH(P0), HR = openH(ref);
      const same = H0.length === HR.length && H0.every((h, i) => (!h && !HR[i]) || (h && HR[i] && h.length === HR[i].length && h.every((q, k) => Object.is(q.x, HR[i][k].x) && Object.is(q.y, HR[i][k].y))));
      add('I12', same, `${name}: at roundness 0 the holes are NOT today's to the bit (the patched copy with the control stood down) — the floor is not the shipped state`);
    }
    let lastRounded = -1;
    for (const st of steps) {
      const P = st === 0 ? P0 : planM(set, st);
      /* (d) */
      add('I12', P.achieved === P0.achieved, `${name}: roundness ${st.toFixed(2)} achieves ${P.achieved} holes against ${P0.achieved} at the floor — the count must hold at every step`);
      const under = P.widthsMm.filter((w, i) => P.cellOpen[i] && w < M.INFILL_HOLE_MM).length;
      add('I12', under === 0, `${name}: roundness ${st.toFixed(2)} leaves ${under} open hole(s) under the ${M.INFILL_HOLE_MM} mm bar`);
      /* (c) */
      if (flat && st > 0) {
        let worstOut = 0, lessRound = 0;
        const H = openH(P), H0 = openH(P0);
        for (let i = 0; i < H.length; i++) { if (!H[i] || !H0[i]) continue; const F = ccwPoly(H0[i]); for (const q of H[i]) worstOut = Math.max(worstOut, outsideBy(q, F)); if (roundnessQ(H[i]) < roundnessQ(H0[i]) - 1e-9) lessRound++; }
        add('I12', worstOut <= band, `${name}: at roundness ${st.toFixed(2)} a hole reaches ${worstOut.toExponential(3)} mm OUTSIDE today's hole (band ${band.toExponential(3)}) — the opening grew a hole past the floor`);
        add('I12', lessRound === 0, `${name}: at roundness ${st.toFixed(2)}, ${lessRound} hole(s) are LESS round than today's — the floor is not enforced`);
      }
      /* (f) */
      const R = P.roundShape;
      if (st > 0 && R) {
        add('I12', R.rounded + R.atFillet === P.achieved, `${name}: roundness ${st.toFixed(2)}: the record says ${R.rounded} rounded + ${R.atFillet} at the fillet against ${P.achieved} achieved`);
        add('I12', R.rounded >= lastRounded, `${name}: the rounded count FELL to ${R.rounded} at roundness ${st.toFixed(2)} from ${lastRounded}`);
        if (R.onsetMin !== null && st < R.onsetMin) add('I12', R.rounded === 0, `${name}: at roundness ${st.toFixed(2)}, below the smallest onset ${R.onsetMin.toFixed(3)}, the record calls ${R.rounded} hole(s) rounded past their fillet`);
        lastRounded = R.rounded;
      }
    }
  }
  /* (e) the default is the ruled shape. */
  {
    globalThis.__holeLaw = (Pl, fr, infillFillet, infillInset) => RL.openingLaw(infillFillet(Pl, fr, 20), 0.6 * RL.inradiusOf(infillFillet(Pl, fr), infillInset), infillInset);
    const ref = RL.planFor(V, DEFAULTS, {}).plan;
    delete globalThis.__holeLaw; globalThis.__holeLaw = (Pl, fr, infillFillet) => infillFillet(Pl, fr);
    const got = planM({}, 0.6);
    /* AGAINST TODAY AS WELL AS AGAINST THE SWEEP, which is what makes it a
       claim. Run against the BASE tree (no control, every hole today's) this
       clause first shipped as a per-hole Hausdorff inside the discretisations'
       own band — and it PASSED there: opening a hexagonal corner from 0.8 mm to
       0.6 x the inradius moves the boundary by ~0.04 mm, inside the same band.
       So the reference is a PAIR of owners — the swept law at 0.60 and today's
       floor, both off the patched copy — and the shipped default must sit at
       least TEN TIMES closer to the swept shape than today's does, in total
       hole area AND in median roundness (on the default: floor 179.08 mm2 /
       0.8177, swept 170.75 / 0.8468). The per-hole proof is
       tools/bloom-roundness-law-match.mjs. */
    const floor = RL.planFor(V, DEFAULTS, {}).plan;
    const tot = (P) => openH(P).filter(Boolean).reduce((a, h) => a + polyArea(h), 0);
    const medQ = (P) => median(openH(P).filter(Boolean).map(roundnessQ));
    const gapA = Math.abs(tot(floor) - tot(ref)), gapQ = Math.abs(medQ(floor) - medQ(ref));
    const dA = Math.abs(tot(got) - tot(ref)), dQ = Math.abs(medQ(got) - medQ(ref));
    add('I12', got.achieved === ref.achieved && gapA > 0 && gapQ > 0 && dA <= gapA / 10 && dQ <= gapQ / 10,
      `the default at 0.60 draws ${got.achieved} holes / ${tot(got).toFixed(2)} mm2 / median roundness ${medQ(got).toFixed(4)} against the swept law's ${ref.achieved} / ${tot(ref).toFixed(2)} / ${medQ(ref).toFixed(4)} and today's ${tot(floor).toFixed(2)} / ${medQ(floor).toFixed(4)} — it must sit ten times closer to the ruled shape than today's does (area ${dA.toFixed(3)} against ${(gapA / 10).toFixed(3)}, roundness ${dQ.toExponential(2)} against ${(gapQ / 10).toExponential(2)})`);
  }
  return out;
}
function s4Plan(M, set, opts = null) { return infillPlanFor(M, DEFAULTS, set, true, opts); }
function cellsKey(plan) { return JSON.stringify((plan.cells || []).map((c) => c.map((q) => [q.x, q.y]))); }
function principalRatio(poly) {
  let mx = 0, my = 0; for (const q of poly) { mx += q.x; my += q.y; } mx /= poly.length; my /= poly.length;
  let sxx = 0, sxy = 0, syy = 0; for (const q of poly) { const dx = q.x - mx, dy = q.y - my; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
  const tr = sxx + syy, det = sxx * syy - sxy * sxy; const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
  const l1 = tr / 2 + disc, l2 = tr / 2 - disc; return l2 > 1e-12 ? Math.sqrt(l1 / l2) : Infinity;
}
function median(a) { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; }
function polyArea(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; } return Math.abs(s) / 2; }
export function s4Clauses(M, only) {
  const out = [];
  const add = (id, ok, msg) => { if (!only || only.has(id)) out.push({ id, ok, msg }); };
  const row = (id) => CONTROLS.find((c) => c.id === id);
  /* I8 (a) — Q6: every range, step and default is the geometry's export, and
     the three look defaults ARE the S3 constants. */
  const q6 = [
    ['infillRelax', M.INFILL_RELAX_RANGE, 1, M.INFILL_RELAX_DEFAULT, M.INFILL_LLOYD_PASSES],
    ['infillLaw', M.INFILL_LAW_RANGE, M.INFILL_LAW_STEP, M.INFILL_LAW_DEFAULT, M.INFILL_TIP_GAMMA],
    ['infillAniso', M.INFILL_ANISO_RANGE, M.INFILL_ANISO_STEP, M.INFILL_ANISO_DEFAULT, M.INFILL_ANISO],
    ['infillBase', M.INFILL_BASE_RANGE, M.INFILL_BASE_STEP, M.INFILL_BASE_DEFAULT, 0],
  ];
  for (const [id, range, step, dflt, constant] of q6) {
    const r = row(id);
    add('I8', !!r, `the registry declares no \`${id}\``);
    if (!r) continue;
    add('I8', r.min === range[0] && r.max === range[1] && r.step === step && Object.is(r.default, dflt), `${id}: the registry row (${r.min}..${r.max} step ${r.step}, default ${r.default}) is not the geometry's own export (${range[0]}..${range[1]} step ${step}, default ${dflt}) — Q6`);
    add('I8', Object.is(dflt, constant), `${id}: its default ${dflt} is not the S3 constant ${constant} as the SAME double — a build at the defaults would form a different expression from the one S3 shipped`);
    /* GATED ON THE GUARD, READ AS WHAT THE PREDICATE DOES rather than as its
       shape: hidden with the guard off, and (every lever but the parked one)
       SHOWN with it on. The solid base is PARKED — hidden at every state —
       and the clause asserts that too, both ways, because a parked control
       that quietly reappeared and one that quietly stopped existing are the
       two failures parking can have. */
    const onState = { ...DEFAULTS, petalInfill: 'VORONOI' }, offState = { ...DEFAULTS, petalInfill: 'NONE' };
    const parked = id === 'infillBase';
    add('I8', !!r.visibleWhen && predicateDrivers(r.visibleWhen).has('petalInfill') && !evalPredicate(r.visibleWhen, offState), `${id} is not gated on \`infillPresent\` — it would be visible with the guard off`);
    add('I8', !!r.visibleWhen && evalPredicate(r.visibleWhen, onState) === !parked, parked ? `${id} is VISIBLE with the guard on — it is parked (Eva, the ruled-defaults session) and must stay hidden at every state` : `${id} is hidden with the guard ON — it would never appear`);
  }
  /* I8 (b) — the built default's record reads the registry defaults back. */
  const base = s4Plan(M, S4_DEFAULT);
  const F = base.petal.infill;
  add('I8', F && F.passes === DEFAULTS.infillRelax && F.gamma === DEFAULTS.infillLaw && F.aniso === DEFAULTS.infillAniso && F.baseFrac === DEFAULTS.infillBase,
    `the built default's record reads passes ${F && F.passes} / gamma ${F && F.gamma} / aniso ${F && F.aniso} / base ${F && F.baseFrac} against the registry's ${DEFAULTS.infillRelax} / ${DEFAULTS.infillLaw} / ${DEFAULTS.infillAniso} / ${DEFAULTS.infillBase}`);
  /* I8 (c) — each lever ALONE moves the emitted cell stream. Read off the
     EMITTED positions inside the cells' own triangle range, not the plan. */
  const streamOf = (r) => { const R = r.petal.infill && r.petal.infill.emittedTriRange; return R ? r.acc.positions.slice(R[0] * 9, R[1] * 9) : r.acc.positions; };
  const same = (a, b) => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const s0 = streamOf(base);
  for (const [id, value] of [['infillRelax', 12], ['infillLaw', 0], ['infillAniso', 1], ['infillBase', 0.5]]) {
    const r = s4Plan(M, { [id]: value });
    add('I8', !same(s0, streamOf(r)), `${id} at ${value} emits the SAME cell stream as the default (${s0.length} floats) — the control does not reach the plan`);
  }
  /* I8 (d) — the by-construction identity: the levers passed explicitly at
     their defaults reproduce the plan built without them, to the bit. */
  const explicit = s4Plan(M, S4_DEFAULT, { passes: M.INFILL_LLOYD_PASSES, gamma: M.INFILL_TIP_GAMMA, aniso: M.INFILL_ANISO, baseFrac: 0 });
  add('I8', same(s0, streamOf(explicit)), 'the plan with the four levers passed explicitly at their defaults is NOT bit-identical to the plan built without them');
  /* I9 — the basal boundary rebuilt from ROOT_BLEND_END and infillFloorU. */
  const floor0 = M.infillFloorU(base.surface);
  const travel = Math.max(0, M.ROOT_BLEND_END - floor0);
  add('I9', travel > 0, `the default blade has no basal travel (floor ${floor0.toFixed(4)} against ROOT_BLEND_END ${M.ROOT_BLEND_END}) — I9's subject is empty here and the gate cannot vouch for the control`);
  let lastLow = -Infinity;
  for (const frac of [0, 0.5, 1]) {
    const r = s4Plan(M, { infillBase: frac });
    const P = r.plan;
    const want = frac === 0 ? floor0 : frac === 1 ? M.ROOT_BLEND_END : floor0 + frac * travel;
    const okF = frac === 0 || frac === 1 ? P.floorU === want : Math.abs(P.floorU - want) <= 2 * Number.EPSILON * Math.max(1, want);
    add('I9', okF, `infillBase ${frac}: the plan's floor ${P.floorU} is not ${want} rebuilt from ROOT_BLEND_END ${M.ROOT_BLEND_END} and the derived floor ${floor0}${frac === 0 || frac === 1 ? ' (EXACTLY, a branch)' : ''}`);
    add('I9', P.baseFloorU === floor0 && P.baseTravel === travel, `infillBase ${frac}: the record's baseFloorU ${P.baseFloorU} / baseTravel ${P.baseTravel} disagree with ${floor0} / ${travel}`);
    if (!P.refused) {
      const low = Math.min(...P.cellU);
      add('I9', low >= P.floorU - 1e-12, `infillBase ${frac}: the lowest cell centroid u ${low.toFixed(4)} sits below the floor ${P.floorU.toFixed(4)}`);
      add('I9', low >= lastLow, `infillBase ${frac}: raising the fraction LOWERED the lowest cell (u ${low.toFixed(4)} after ${lastLow.toFixed(4)})`);
      lastLow = low;
      /* The seam row is the first row at or above the floor, re-read from the rows. */
      const rows = r.petal.grid[0].rows;
      const m = P.mSplit;
      add('I9', rows[m - 1].u >= P.floorU - 1e-12 && (m - 2 < 0 || rows[m - 2].u < P.floorU - 1e-12 || rows[m - 2].u === 0), `infillBase ${frac}: the split row ${m} (u ${rows[m - 1].u.toFixed(4)}, below it ${rows[m - 2] ? rows[m - 2].u.toFixed(4) : '-'}) is not the first blade row at or above the floor ${P.floorU.toFixed(4)}`);
    }
  }
  /* I10 — the law's direction, and the density cap re-derived. */
  /* STRICT, AND AT DENSITY 24 RATHER THAN THE DEFAULT 16 — the mutant table
     said why: at 16 the top fifth reads ONE hole at law 0 and ONE at law 2
     (one seed, this state), so a `>=` passed a law the plan never read. At 24
     it reads 4 against 1 and the highest hole u 0.94 against 0.85, both
     strict; the clause names its sampling because the count is one seed's. */
  const topFifth = (P) => (P.holeU || []).filter((u) => u >= 0.8).length;
  const topU = (P) => Math.max(...(P.holeU || [0]));
  const g0 = s4Plan(M, { infillLaw: 0, infillDensity: 24 }).plan, g2 = s4Plan(M, { infillLaw: 2, infillDensity: 24 }).plan;
  add('I10', !g0.refused && !g2.refused && topFifth(g0) > topFifth(g2) && topU(g0) > topU(g2), `density law 0 puts ${topFifth(g0)} holes in the top fifth of the default blade at density 24 (highest u ${topU(g0).toFixed(3)}) against ${topFifth(g2)} (u ${topU(g2).toFixed(3)}) at law 2 — the read-out claims 0 fills the tip with holes and 2 with cells, and both must be STRICT`);
  {
    const rec = base.petal.infill;
    const sweep = M.INFILL_DENSITY_SWEEP.map((d) => { const P = s4Plan(M, { infillDensity: d }).plan; return { density: d, achieved: P.refused ? 0 : P.achieved }; });
    const best = Math.max(...sweep.map((x) => x.achieved));
    const cap = sweep.find((x) => x.achieved === best).density;
    add('I10', rec && rec.densityCap === cap && rec.densityBest === best, `the record's density cap ${rec && rec.densityCap} (best ${rec && rec.densityBest}) is not the gate's own sweep: ${sweep.map((x) => `${x.density}:${x.achieved}`).join(' ')} -> cap ${cap}, best ${best}`);
    add('I10', rec && Array.isArray(rec.densitySweep) && rec.densitySweep.length === sweep.length && rec.densitySweep.every((x, i) => x.density === sweep[i].density && x.achieved === sweep[i].achieved), 'the record\'s density sweep does not reproduce the gate\'s');
    const dens = row('infillDensity');
    add('I10', dens && typeof dens.cap === 'function' && dens.cap({ infill: rec }) === (cap < M.INFILL_DENSITY_RANGE[1] ? cap : null), `the density control's cap reads ${dens && typeof dens.cap === 'function' ? dens.cap({ infill: rec }) : '(no cap)'} against the record's ${cap}`);
  }
  /* I11 — the stretch, the relaxation, the wall. */
  const a1 = s4Plan(M, { infillAniso: 1 }).plan, a3 = s4Plan(M, { infillAniso: 3 }).plan;
  const r1 = median(a1.cells.map(principalRatio)), r3 = median(a3.cells.map(principalRatio));
  add('I11', r3 > r1, `the cells' median principal ratio at stretch 3 (${r3.toFixed(3)}) does not exceed the ratio at stretch 1 (${r1.toFixed(3)}) — the stretch is not the metric the cells are cut in`);
  const cv = (P) => { const A = P.cells.map(polyArea); const m = A.reduce((s, x) => s + x, 0) / A.length; return Math.sqrt(A.reduce((s, x) => s + (x - m) ** 2, 0) / A.length) / m; };
  const p0 = s4Plan(M, { infillRelax: 0 }).plan, p12 = s4Plan(M, { infillRelax: 12 }).plan;
  add('I11', cv(p12) < cv(p0), `twelve Lloyd passes leave the cell areas MORE uneven (cv ${cv(p12).toFixed(3)}) than none (${cv(p0).toFixed(3)}) — the relaxation does not even the lattice`);
  const wallBar = M.INFILL_WALL_MM - 2 * M.INFILL_PLAN_GRID;
  for (const [n, set] of [['default', {}], ['density 40', { infillDensity: 40 }], ['cup 1.2 x curl 360', { petalCup: 1.2, petalSpineCurl: 360 }], ['the four at their far ends', { infillRelax: 12, infillLaw: 0, infillAniso: 3, infillBase: 1 }]]) {
    const r = s4Plan(M, set);
    const w = infillWallSurfaceMm(r.surface, r.plan);
    add('I11', !!w && w.mm >= wallBar, `${n}: the narrowest in-sheet wall between holes reads ${w ? w.mm.toFixed(6) : 'none'} mm against INFILL_WALL_MM ${M.INFILL_WALL_MM} less two grid quanta (${wallBar.toFixed(6)})`);
  }
  return out;
}
/* THE S4 MUTATIONS RUN ON A COPY OF THE MODULE. Each names its clauses and
   carries a WITNESS — a direct reading on the MUTATED module's own record
   proving the intended behaviour moved, taken before the clauses are
   consulted and deliberately not the assertion it names. The anchor must
   match EXACTLY ONCE (a refactor disarms a mutant by moving it or by making it
   match twice). */
/* THE ROUNDNESS MUTATIONS (I12), the same shape: a copy of the module, an
   anchor that must match once, a witness on the MUTATED module's own record. */
const I12_MUTANTS = [
  { id: 'the-roundness-is-not-read', from: 'const round = Math.max(INFILL_ROUND_RANGE[0], Math.min(INFILL_ROUND_RANGE[1], Number(opts.round ?? INFILL_ROUND_DEFAULT)));', to: 'const round = INFILL_ROUND_DEFAULT;', breaks: ['I12'],
    witness: (M) => s4Plan(M, { infillRound: 0 }).plan.round !== 0 },
  { id: 'the-opening-only-erodes', from: 'const oT = infillOpen(fineT, r);', to: 'const oT = infillInset(fineT, r);', breaks: ['I12'],
    witness: (M) => s4Plan(M, { infillRound: 0.6 }).plan.roundShape.rounded === 0 },
  { id: 'the-hole-is-not-clipped-to-today', from: 'o = infillClipHalfPlane(o, nx, ny, -(nx * A.x + ny * A.y)); } return o; };', to: 'o = o; } return o; };', breaks: ['I12'],
    witness: (M) => { const P0 = s4Plan(M, { infillRound: 0 }).plan, P = s4Plan(M, { infillRound: 0.3 }).plan; let w = 0; for (let i = 0; i < P.holes.length; i++) if (P.cellOpen[i] && P0.cellOpen[i]) { const F = ccwPoly(P0.holes[i]); for (const q of P.holes[i]) w = Math.max(w, outsideBy(q, F)); } return w > 1e-4; } },
  { id: 'the-roundness-floor-is-not-decided', from: '      if (h && infillRoundness(h) < infillRoundness(q)) h = null;\n', to: '', breaks: ['I12'],
    witness: (M) => { const P0 = s4Plan(M, { infillRound: 0 }).plan; return [0.05, 0.2].some((st) => { const P = s4Plan(M, { infillRound: st }).plan; return P.holes.some((h, i) => h && P.cellOpen[i] && roundnessQ(h) < roundnessQ(P0.holes[i]) - 1e-9); }); } },
  { id: 'the-bar-does-not-hold-the-opening-back', from: 'if (h && widthOf(q, c) >= bar && widthOf(h, c) < bar) {', to: 'if (false) {', breaks: ['I12'],
    witness: (M) => { const set = { petalCup: 1.2, petalSpineCurl: 360 }; return s4Plan(M, { ...set, infillRound: 1 }).plan.achieved < s4Plan(M, { ...set, infillRound: 0 }).plan.achieved; } },
  { id: 'the-record-calls-every-hole-rounded', from: 'rounded: Ru > rrMax, held });', to: 'rounded: true, held });', breaks: ['I12'],
    witness: (M) => { const P = s4Plan(M, { infillRound: 0.6 }).plan; return P.roundShape.rounded === P.achieved; } },
];
const S4_MUTANTS = [
  { id: 'the-relaxation-count-is-not-read', from: 'const passes = opts.passes ?? INFILL_LLOYD_PASSES;', to: 'const passes = INFILL_LLOYD_PASSES;', breaks: ['I8'],
    witness: (M) => s4Plan(M, { infillRelax: 12 }).plan.passes !== 12 },
  { id: 'the-law-is-not-read', from: 'const gamma = opts.gamma ?? INFILL_TIP_GAMMA;', to: 'const gamma = INFILL_TIP_GAMMA;', breaks: ['I8', 'I10'],
    witness: (M) => s4Plan(M, { infillLaw: 0 }).plan.gamma !== 0 },
  { id: 'the-stretch-is-not-read', from: 'const aniso = opts.aniso ?? INFILL_ANISO;', to: 'const aniso = INFILL_ANISO;', breaks: ['I8', 'I11'],
    witness: (M) => s4Plan(M, { infillAniso: 1 }).plan.aniso !== 1 },
  { id: 'the-base-is-not-read', from: 'const baseFrac = opts.baseFrac ?? INFILL_BASE_DEFAULT;', to: 'const baseFrac = INFILL_BASE_DEFAULT;', breaks: ['I8', 'I9'],
    witness: (M) => s4Plan(M, { infillBase: 0.5 }).plan.baseFrac !== 0.5 },
  { id: 'the-base-is-a-station-not-a-fraction', from: 'const floorU = baseFrac > 0 && baseTravel > 0 ? baseFloorU + baseFrac * baseTravel : baseFloorU;', to: 'const floorU = baseFrac > 0 ? baseFrac : baseFloorU;', breaks: ['I9'],
    witness: (M) => { const P = s4Plan(M, { infillBase: 0.5 }).plan; return Math.abs(P.floorU - 0.5) < 1e-12; } },
  { id: 'the-density-cap-is-the-asked-density', from: "infill = { ...infill, densitySweep: sweep, densityCap: at ? at.density : null, densityBest: best };", to: "infill = { ...infill, densitySweep: sweep, densityCap: infill.density, densityBest: best };", breaks: ['I10'],
    witness: (M) => s4Plan(M, { infillDensity: 40 }).petal.infill.densityCap === 40 },
];
async function s4NegativeControl() {
  console.log('');
  console.log('--- S4 NEGATIVE CONTROL: six mutations of a COPY of bloom-geometry.js, each with a witness on the mutated module ---');
  const here = path.dirname(fileURLToPath(import.meta.url));
  const src = fs.readFileSync(path.join(here, '..', 'bloom-geometry.js'), 'utf8');
  let fails = 0;
  for (const m of S4_MUTANTS) {
    const n = src.split(m.from).length - 1;
    if (n !== 1) { console.log(`${m.id.padEnd(40)} REFUSED — the anchor matches ${n} times, not once; the mutant is DISARMED`); fails++; continue; }
  }
  if (fails) return fails;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-s4-mutant-'));
  for (const m of S4_MUTANTS) {
    const file = path.join(dir, `${m.id}.js`);
    fs.writeFileSync(file, src.replace(m.from, m.to));
    const M = await import(pathToFileURL(file).href);
    let witness = false; try { witness = !!m.witness(M); } catch (e) { witness = false; }
    const fired = new Set();
    try { for (const c of s4Clauses(M, null)) if (!c.ok) fired.add(c.id); } catch (e) { fired.add('threw'); }
    const missed = m.breaks.filter((b) => !fired.has(b));
    const bad = !witness || missed.length;
    if (bad) fails++;
    console.log(`${m.id.padEnd(40)} witness ${witness ? 'MOVED' : 'DID NOT MOVE'} · fired ${[...fired].sort().join(',') || '(nothing)'} — ${missed.length ? 'MISSED ' + missed.join(',') : 'every clause it names went red'}`);
  }
  console.log(fails ? `S4 NEGATIVE CONTROL: FAIL — ${fails} mutant(s) did not behave` : 'S4 NEGATIVE CONTROL: every mutant witnessed and every named clause red.');
  /* I12 — the roundness mutants, every anchor checked before any runs. */
  console.log('');
  console.log(`--- I12 NEGATIVE CONTROL: ${I12_MUTANTS.length} mutations of a COPY of bloom-geometry.js, each with a witness on the mutated module ---`);
  let f12 = 0;
  for (const m of I12_MUTANTS) { const n = src.split(m.from).length - 1; if (n !== 1) { console.log(`${m.id.padEnd(40)} REFUSED — the anchor matches ${n} times, not once; the mutant is DISARMED`); f12++; } }
  if (!f12) for (const m of I12_MUTANTS) {
    const file = path.join(dir, `${m.id}.js`);
    fs.writeFileSync(file, src.replace(m.from, m.to));
    const M = await import(pathToFileURL(file).href);
    let witness = false; try { witness = !!m.witness(M); } catch (e) { witness = false; }
    const fired = new Set();
    try { for (const c of await i12Clauses(M, true)) if (!c.ok) fired.add(c.id); } catch (e) { fired.add('threw'); }
    const missed = m.breaks.filter((b) => !fired.has(b));
    if (!witness || missed.length) f12++;
    console.log(`${m.id.padEnd(40)} witness ${witness ? 'MOVED' : 'DID NOT MOVE'} · fired ${[...fired].sort().join(',') || '(nothing)'} — ${missed.length ? 'MISSED ' + missed.join(',') : 'every clause it names went red'}`);
  }
  console.log(f12 ? `I12 NEGATIVE CONTROL: FAIL — ${f12} mutant(s) did not behave` : 'I12 NEGATIVE CONTROL: every mutant witnessed and every named clause red.');
  return fails + f12;
}

/* ---------------- --cap-sweep ---------------- */
/* WHERE `INFILL_DROP_PASSES` COMES FROM, so the constant is a measurement
   somebody can re-run rather than a number written down once. */
function capSweep() {
  const N = Number(arg('--states', String(STATES.length)));
  const densities = [8, 12, 16, 20, 24, 28, 32, 36, 40];
  console.log(`RULING 3'S CAP — the achieved count at every cap from 0 to 5, over ${Math.min(N, STATES.length)} states x ${densities.length} densities.`);
  let worst = 0, losses = 0, pairs = 0;
  for (const [name, set] of STATES.slice(0, N)) {
    const st = { ...DEFAULTS, ...set };
    const acc = new G.MeshBuilder({ exportMode: true });
    const { ring, slot } = firstSlot(st, acc);
    const surface = G.petalSurface(st, ring, slot, null, acc);
    const a = new G.MeshBuilder({ exportMode: true, captureGrid: true });
    const p = G.buildPetalInto(a, st, ring, slot, null, true);
    const panel = panelOf(p);
    const marks = [];
    for (const d of densities) {
      const seq = [];
      for (let c = 0; c <= 5; c++) seq.push(G.petalInfillPlan(surface, p.grid[0].rows, panel, { density: d, dropPasses: c }).achieved);
      let stable = seq.length - 1;
      while (stable > 0 && seq[stable - 1] === seq[seq.length - 1]) stable--;
      if (stable > worst) worst = stable;
      if (seq.some((v, i) => i > 0 && v < seq[i - 1])) losses++;
      pairs++;
      marks.push(`${d}:${seq[0]}→${seq[seq.length - 1]}`);
    }
    console.log(`${name.padEnd(24)} converged@${worst}  ${marks.join(' ')}`);
  }
  console.log(`\nover ${pairs} (state, density) pairs: the achieved count converges after ${worst} pass(es); ${losses} pairs where any pass LOST a hole.`);
  console.log(`INFILL_DROP_PASSES is ${CAP}${CAP > worst ? ' — the measurement plus one, so the cap is not what stops it' : ' — AT OR UNDER the measured convergence, which is a finding'}`);
  if (CAP <= worst || losses > 0) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
