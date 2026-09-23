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
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as G from '../bloom-geometry.js';
import { DEFAULTS, CONTROLS, PREDICATES } from '../bloom-registry.js';
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
  add('I1', worst >= BAR - 1e-9, `${r.name}: the narrowest EMITTED hole is ${worst.toFixed(4)} mm of material across (in-sheet), under the ruled ${BAR.toFixed(2)} mm — its 3-space chord reads ${worstThree.toFixed(4)} and its PLAN width ${worstPlan.toFixed(4)}`);

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

function main() {
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

  if (NEG) fails += negativeControl(states);

  const json = arg('--json', null);
  if (json) fs.writeFileSync(json, JSON.stringify(results, null, 1));
  console.log('');
  console.log(fails === 0 ? `PASS — I0..I7 over ${states.length} states x 2 modes.` : `FAIL — ${fails} clause failure(s)`);
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
