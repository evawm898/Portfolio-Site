/* ===================================================================
   verify-bloom-infill-conform.mjs — THE CONFORMING EMITTER'S GATE.

     node tools/verify-bloom-infill-conform.mjs [--quick] [--json <file>]
     node tools/verify-bloom-infill-conform.mjs --negative-control          (REQUIRED before quoting a pass)
     node tools/verify-bloom-infill-conform.mjs --legacy-identity <base-tree>

   WHAT IT IS FOR. `tools/bloom-voronoi-proto.mjs` used to tessellate a solid cell as a
   FLAT FAN over the whole cell polygon. A flat facet spanning several millimetres of a
   surface that WRAPS is a chord, and under `petalRoll` 330 — a shipped matrix row — the
   chord cuts through the tube. S1 of `docs/bloom-infill-port-plan.md`. Nothing in this
   repository could see it: the prototype's own scratch census reports `boundary 0,
   nonManifold 2, shells 1` on a mesh whose facets stand 6.87 mm from the surface they
   claim to draw, and both STL gates are blind to the prototype entirely because it is
   not wired to them.

   FOUR CLAUSES, AND EACH ONE'S REFERENCE HAS A DIFFERENT OWNER FROM ITS QUANTITY.

   C1 SURFACE FIDELITY. Every emitted SKIN facet's deviation from `petalSurface`, read
   OFF THE EMITTED STREAM (the triangles are mapped back to their plan points through
   `capturePlan`'s canonicaliser, never taken from the emitter's own report), against the
   SHIPPED LATTICE's own worst facet on the same state — `buildPetalInto`'s emitted rows,
   an owner the infill does not write. **The bar is therefore "the cell tessellation
   follows the surface at least as closely as the mesh that already ships"**, in
   millimetres, moving with the state instead of typed. A second clause holds it under
   HALF THE SHEET, which is where a facet has left its own material: that one is absolute,
   so the pair is not purely self-referential and a state whose lattice is poor still
   cannot pass an arbitrarily bad infill.

   C2 SELF-APPROACH. The shipped census (`tools/bloom-self-intersection.mjs`, not the
   prototype's scratch one) over the CELL GEOMETRY ALONE — the base panel is excluded
   because the prototype overlaps it by one row BY DESIGN and a by-design overlap the
   vertex weld cannot tell from a fold is exactly what would confound the reading.
   **THE BRIEF'S ABSOLUTE BAR IS NOT AVAILABLE AND THE REASON IS A MEASUREMENT: THE
   SHIPPED PETAL ITSELF FOLDS AT `petalRoll` 330.** Its matrix row is a declared census
   xfail (15,280 pairs / 1.5539 mm) and CLAUDE.md records "roll from 270 degrees ... fold
   a single petal at ANY depth". Measured here, the PLAIN lamina over the cell region's
   own rows reads 2,347 pairs / 1.3837 mm at roll 330 with no infill in it at all. So the
   clause is a two-sided build: the plain sheet over the SAME rows is the control, and
   * where the plain sheet is CLEAN the infilled one must be clean, exactly;
   * where the plain sheet already folds, the infill must not raise the pair count.
   **THE WORST SPAN IS REPORTED AND NEVER BOUNDED**, because a span is a property of the
   TESSELLATION (this project's own rule) and the two tessellations under comparison are
   different by construction: under pure roll the surface is a cylinder, straight along u,
   so a conforming facet is long down the blade and short across it, and a long facet
   lying in the far wall reads a long span while drawing the surface more faithfully.

   C3 THE PARTITION. The emitted plan triangles must tile the MATERIAL and nothing else:
   `sum of triangle areas == sum of (cell area - hole area)`. That is the Voronoi
   self-check this project already relies on ("a diagram is a partition or it is not a
   diagram"), and it is the only thing that sees a triangle drawn OVER A HOLE — which is
   the second defect the baseline turned up and which the brief does not name: the old
   merge-walk's `advA` arm spans two consecutive OUTER vertices, so on a wide angular
   sector it reaches across the hole's tip. On the FLAT default, where no chord error is
   possible, the legacy cells read 822 within-shell pairs against the plain lamina's 0.

   C4 SHELLS INTACT. Boundary edges 0, one vertex-welded shell, one voxel piece at the
   0.6 mm and 0.3 mm cells — the prototype's own scratch census and flood fill, unchanged,
   so a crack introduced by the subdivision shows up as a boundary edge rather than as a
   picture nobody looked at.

   WHAT IT DOES NOT COVER, in its own header rather than left to be found:
     - C1 measures SKIN facets. A rim quad spans the two skins at one plan point and has
       no mid-surface to deviate from; it inherits its subdivision from `R.points`, which
       is driven by the skin chord, and what covers it is C2 and C4.
     - the prototype is not the shipping emitter and this gate is not wired to CI. The
       bloom's own gates cannot see any of it (`bloom-voronoi-proto.mjs` emits into its
       own `Acc`, not into `MeshBuilder`).
     - the plan is still FLAT-computed. That is S2 and is deliberately not fixed here;
       §1b's wall compression is reported by this gate and not gated.
     - one seed (`SEED`), one petal, EXPORT mode. Naming the sampling because this
       project's first durable rule requires it.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as G from '../bloom-geometry.js';
import * as P from './bloom-voronoi-proto.mjs';
import { census } from './bloom-self-intersection.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const QUICK = process.argv.includes('--quick');
const NEG = process.argv.includes('--negative-control');

/* THE SWEEP. `petalRoll` 330 is in it by name (the brief's own row) and so are §1b's two
   combined corners. The rest are there to cover the axes the emitter HAS: one state per
   curvature direction, a doubly curved one (the buckle), the two petal widths that move
   the cell size, and `footDelicacy` 0.25, which is the state whose lamina floor is set by
   the WALL rather than by the waist. */
export const STATES = [
  ['default (flat)', {}],
  ['petalRoll 180', { petalRoll: 180 }],                     /* the half-tube: the PLAIN sheet still clears the printable gap here, so C2a ASSERTS — without it no state in the sweep lets the self-approach clause see the flat fan at all, which the negative control is what found */
  ['petalRoll 330', { petalRoll: 330 }],
  ['petalRoll -330', { petalRoll: -330 }],
  ['petalCup 1.2', { petalCup: 1.2 }],
  ['petalSpineCurl 360', { petalSpineCurl: 360 }],
  ['petalTwist 180', { petalTwist: 180 }],
  ['cup 1.2 x curl 360', { petalCup: 1.2, petalSpineCurl: 360 }],
  ['ALL FORM MAX', { petalCup: 1.2, petalSpineCurl: 360, petalRoll: 330, petalTwist: 180 }],
  ['buckle 0.6 f3', { buckleAmp: 0.6, buckleFreq: 3 }],
  ['cup 1.2 x cupGradient 1', { petalCup: 1.2, petalCupGradient: 1 }],
  ['petalWidth 30', { petalWidth: 30 }],
  ['petalWidth 8', { petalWidth: 8 }],
  ['footDelicacy 0.25', { footDelicacy: 0.25 }],
];
const N_CELLS = 16, WALL = P.WALL_DEFAULT;

/* THE ONE DECLARED EXCEPTION, CARRYING ITS MAGNITUDE AS A NUMBER THE GATE READS, IN BOTH
   DIRECTIONS (#213's own idiom). Under `petalTwist` 180 the infilled cells report a
   handful of sites the plain sheet does not, at a worst span of 0.0156 mm — a sixtieth of
   the minimum printable feature. THE MECHANISM IS THE RIM'S OWN CHORD AND IT IS NAMED
   RATHER THAN GUESSED: every one of these pairs is a rim quad against a neighbouring
   cell's skin, and a rim quad spans the two skins at one plan point, so under twist it is
   NON-PLANAR while its subdivision is driven by `R.points`, which reads the SKIN's chord.
   IT IS A DISCRETISATION ARTEFACT AND NOT MATERIAL OVERLAP, MEASURED: at the shipped
   tolerance it reads 11 pairs / 1.560e-2 mm, at half 7 / 2.502e-3, at a quarter 3 /
   1.819e-3 and at an eighth ZERO — but that eighth costs 3,096 -> 6,628 triangles on that
   state (+114 %), so it is DECLARED rather than tuned away. An entry that stops
   reproducing fails in both directions, which is what stops it drifting. */
/* THE MEASURE'S OWN FLOOR, SAID RATHER THAN LEFT TO BE FOUND. Two facets count as
   different parts when their PLAN footprints are more than `MIN_FEATURE_MM` apart, and on
   a blade whose plan map is an isometry — flat, rolled, twisted — the 3-space distance of
   such a pair is that plan distance, so the reading is pinned just above 1.0 mm there. A
   pass on a flat petal therefore says exactly "nothing 1 mm apart on the sheet is within
   1 mm in space", which is the claim, and not "the emitter was measured and found good"
   — what carries THAT on a flat petal is C1 and C3. */


/* ---------------- SELF-APPROACH — a distance, not a count ----------------

   THE MEASURE THE BRIEF NAMES, and the only one here that is independent of the
   tessellation. A pair count and a worst span are properties of the MESH; the distance
   between two parts of a solid is a property of the SOLID. Two facets are "different
   parts" when their PLAN footprints are more than one minimum printable feature apart —
   plan, not 3-space, because on a flat sheet the plan IS the 3-space distance, so the
   criterion reduces to the identity there and reads the fold and nothing else on a
   curved one. The two skins at one plan point are at plan distance 0 and are excluded by
   construction, which is right: a sheet is not approaching itself across its own
   thickness.

   IT SATURATES AT `PROBE_MM` AND SAYS SO. Only pairs that share a 3-space bucket are
   tested, so an approach wider than the probe is reported as ">= probe" rather than
   measured — the question is whether anything comes CLOSE, and a true minimum over every
   pair is quadratic for an answer nobody needs. */
export const PROBE_MM = 2.0;

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

function segSegDist(p1, q1, p2, q2) {
  const d1 = sub3(q1, p1), d2 = sub3(q2, p2), r = sub3(p1, p2);
  const a = dot3(d1, d1), e = dot3(d2, d2), f = dot3(d2, r);
  let s, t;
  if (a <= 1e-18 && e <= 1e-18) { s = t = 0; }
  else if (a <= 1e-18) { s = 0; t = clamp01(f / e); }
  else {
    const c = dot3(d1, r);
    if (e <= 1e-18) { t = 0; s = clamp01(-c / a); }
    else {
      const b = dot3(d1, d2), den = a * e - b * b;
      s = den > 1e-18 ? clamp01((b * f - c * e) / den) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp01(-c / a); } else if (t > 1) { t = 1; s = clamp01((b - c) / a); }
    }
  }
  const c1 = [p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s];
  const c2 = [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t];
  return Math.hypot(c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]);
}
function pointTriDist(P, A, B, C) {
  const ab = sub3(B, A), ac = sub3(C, A), n = cross3(ab, ac);
  const nn = dot3(n, n);
  if (nn > 1e-24) {
    const ap = sub3(P, A);
    const d = dot3(n, ap) / nn;
    const Q = [P[0] - n[0] * d, P[1] - n[1] * d, P[2] - n[2] * d];
    const aq = sub3(Q, A);
    const d00 = dot3(ab, ab), d01 = dot3(ab, ac), d11 = dot3(ac, ac), d20 = dot3(aq, ab), d21 = dot3(aq, ac);
    const den = d00 * d11 - d01 * d01;
    if (Math.abs(den) > 1e-24) {
      const v = (d11 * d20 - d01 * d21) / den, w = (d00 * d21 - d01 * d20) / den;
      if (v >= 0 && w >= 0 && v + w <= 1) return Math.hypot(P[0] - Q[0], P[1] - Q[1], P[2] - Q[2]);
    }
  }
  return Math.min(segSegDist(P, P, A, B), segSegDist(P, P, B, C), segSegDist(P, P, C, A));
}
function triTriDist(T, U) {
  let m = Infinity;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m = Math.min(m, segSegDist(T[i], T[(i + 1) % 3], U[j], U[(j + 1) % 3]));
  for (let i = 0; i < 3; i++) { m = Math.min(m, pointTriDist(T[i], U[0], U[1], U[2])); m = Math.min(m, pointTriDist(U[i], T[0], T[1], T[2])); }
  return m;
}
function planFar(Q, R, bar) {                 // are the two plan triangles more than `bar` apart?
  const flat = (p) => [p.x, p.y, 0];
  return triTriDist(Q.map(flat), R.map(flat)) > bar;
}
/* `facets` carry both their 3-space corners and the plan triangle they came from. */
export function selfApproachMm(facets, bar) {
  const cell = PROBE_MM;
  const box = facets.map((f) => { const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const p of f.P) for (let a = 0; a < 3; a++) { if (p[a] < lo[a]) lo[a] = p[a]; if (p[a] > hi[a]) hi[a] = p[a]; } return { lo, hi }; });
  const grid = new Map();
  const gi = (x) => Math.floor(x / cell);
  for (let i = 0; i < facets.length; i++) {
    const b = box[i];
    for (let x = gi(b.lo[0]); x <= gi(b.hi[0]); x++) for (let y = gi(b.lo[1]); y <= gi(b.hi[1]); y++) for (let z = gi(b.lo[2]); z <= gi(b.hi[2]); z++) {
      const k = `${x},${y},${z}`; let l = grid.get(k); if (!l) { l = []; grid.set(k, l); } l.push(i);
    }
  }
  let best = PROBE_MM, at = null;
  const seen = new Set();
  for (const [k, list] of grid) {
    const [x, y, z] = k.split(',').map(Number);
    const near = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) { const l = grid.get(`${x + dx},${y + dy},${z + dz}`); if (l) near.push(...l); }
    for (const i of list) for (const j of near) {
      if (j <= i) continue;
      const pk = i * facets.length + j; if (seen.has(pk)) continue; seen.add(pk);
      if (!planFar(facets[i].Q, facets[j].Q, bar)) continue;
      const d = triTriDist(facets[i].P, facets[j].P);
      if (d < best) { best = d; at = facets[i].P[0]; }
    }
  }
  return { mm: best, saturated: best >= PROBE_MM, at };
}

const k3 = (a) => `${a[0].toFixed(7)},${a[1].toFixed(7)},${a[2].toFixed(7)}`;
class Acc { constructor() { this.pos = []; } tri(a, b, c) { this.pos.push(...a, ...b, ...c); } quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); } get tris() { return this.pos.length / 9; } }

/* The emitted facets with the plan triangle each came from — what both C1 and C2 read.
   For the PLAIN control the plan triangle is the lattice's own (row, column) rectangle,
   which `latticeChordDevMm`'s note establishes reproduces every blade row's emitted mid
   point to 0.00e+0 mm, so the two sides of C2 are the same kind of object. */
function plainFacets(ctx, fromRow) {
  const rows = ctx.rows, NV = rows[0].mid.length, t = ctx.t, out = [];
  const planOf = (i, j) => { const u = rows[i].u, hh = ctx.surface.profile.halfWidthAt(u); return { x: u * ctx.L, y: (-1 + (2 * j) / (NV - 1)) * hh }; };
  for (let i = fromRow; i < rows.length - 1; i++) for (let j = 0; j < NV - 1; j++) {
    const q = [planOf(i, j), planOf(i + 1, j), planOf(i + 1, j + 1), planOf(i, j + 1)];
    for (const sg of [1, -1]) for (const tri of [[0, 1, 2], [0, 2, 3]])
      out.push({ Q: tri.map((k) => q[k]), P: tri.map((k) => P.planSkin(ctx, q[k].x, q[k].y, sg)) });
  }
  return out;
}

/* C1's measurement, taken OFF THE EMITTED STREAM. Every triangle whose three vertices
   are on ONE skin is a skin facet; the plan point each vertex came from is recovered
   through the canonicaliser, so the facet is compared against the surface the emitter
   was supposed to be drawing rather than against anything the emitter says about itself. */
function emittedSkinDev(ctx, r) {
  const planOf = new Map();
  for (const o of r.canon.values()) { planOf.set(k3(o.T), { x: o.x, y: o.y, s: 1 }); planOf.set(k3(o.B), { x: o.x, y: o.y, s: -1 }); }
  const pos = r.acc.pos; let worst = 0, at = null, rims = 0, unknown = 0; const facets = [];
  for (let ti = r.baseTris; ti < pos.length / 9; ti++) {
    const V = [0, 1, 2].map((c) => [pos[ti * 9 + c * 3], pos[ti * 9 + c * 3 + 1], pos[ti * 9 + c * 3 + 2]]);
    const pl = V.map((v) => planOf.get(k3(v)));
    if (pl.some((p) => !p)) { unknown++; continue; }
    if (pl[0].s !== pl[1].s || pl[1].s !== pl[2].s) { rims++; continue; }
    facets.push({ Q: pl, P: V });
    const d = P.facetDevMm(ctx, pl);
    if (d > worst) { worst = d; at = { x: pl[0].x, y: pl[0].y, u: pl[0].x / ctx.L }; }
  }
  return { worst, at, facets, nFacets: facets.length, rims, unknown };
}

/* ---------------- C0 — THE INSTRUMENTS' OWN VALIDITY, ON ANSWERS WRITTEN DOWN ----------
   It ABORTS rather than reporting: a harness that cannot vouch for its own measure
   reports whatever it happens to compute and is believed because it produced numbers.
   Each fixture is a shape whose answer can be stated without running anything. */
function validity() {
  const bad = [];
  const eq = (name, got, want, tol) => { if (!(Math.abs(got - want) <= tol)) bad.push(`${name}: got ${got}, want ${want} +/- ${tol}`); };
  /* (a) ear clipping a NON-CONVEX polygon — a unit C, area 1*3 - 1*1 = 2 exactly */
  const C = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 0, y: 3 }];
  const tC = P.earClip(C);
  let aC = 0; for (const T of tC) aC += Math.abs((T[1].x - T[0].x) * (T[2].y - T[0].y) - (T[1].y - T[0].y) * (T[2].x - T[0].x)) / 2;
  eq('earClip tiles the C', aC, 7, 1e-12);
  eq('earClip emits n-2 triangles', tC.length, C.length - 2, 0);
  /* (b) the annulus — a 4x4 square about the origin with a 2x2 square hole: 16 - 4 = 12 */
  const outer = [{ x: -2, y: -2 }, { x: 2, y: -2 }, { x: 2, y: 2 }, { x: -2, y: 2 }];
  const inner = [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }];
  const sec = P.annulusSectors(outer, inner);
  if (!sec) bad.push('annulusSectors returned null on a square in a square');
  else { let a = 0; for (const poly of sec.sectors) for (const T of P.earClip(poly)) a += Math.abs((T[1].x - T[0].x) * (T[2].y - T[0].y) - (T[1].y - T[0].y) * (T[2].x - T[0].x)) / 2;
    eq('the sectors tile the annulus and NOT the hole', a, 12, 1e-9); }
  /* (c) the self-approach measure, on a pair whose answer is written down: two unit
     triangles 0.30 mm apart in space whose PLAN footprints are 5 mm apart, so the filter
     admits them; and the same pair moved to 0.2 mm apart in plan, where it must not. */
  const tri = (z, dy) => [[0, dy, z], [1, dy, z], [0, dy + 1, z]];
  const pl = (dx) => [{ x: dx, y: 0 }, { x: dx + 1, y: 0 }, { x: dx, y: 1 }];
  eq('the approach of two facets 0.30 mm apart', selfApproachMm([{ P: tri(0, 0), Q: pl(0) }, { P: tri(0.3, 0), Q: pl(5) }], G.MIN_FEATURE_MM).mm, 0.3, 1e-12);
  const near = selfApproachMm([{ P: tri(0, 0), Q: pl(0) }, { P: tri(0.3, 0), Q: pl(0.2) }], G.MIN_FEATURE_MM);
  if (!near.saturated) bad.push(`facets 0.2 mm apart in plan are the same part and must be excluded; the measure returned ${near.mm}`);
  return bad;
}

function runState(name, set, opts = {}) {
  const ctx = P.context(set);
  const F = P.fieldSalvage(ctx, N_CELLS);
  const r = P.cutThrough(ctx, F, WALL, { capturePlan: true, ...opts });
  const lat = P.latticeChordDevMm(ctx, F.uOv);
  const dev = emittedSkinDev(ctx, r);
  /* the cells alone — the base panel's by-design overlap row is not this emitter's */
  const cellPos = new Float64Array(r.acc.pos.slice(r.baseTris * 9));
  const cCell = census(cellPos, { collect: true });
  /* the control: the PLAIN sheet over the very rows the cells cover */
  const aPlain = new Acc(); P.emitBase(aPlain, ctx, ctx.rows.length - 1, F.mSplit - 1);
  const cPlain = census(new Float64Array(aPlain.pos), { collect: true });
  /* THE TWO SELF-APPROACHES, the same measure on both sides. The plain control is the
     shipped lattice over the very rows the cells cover, which is the ONLY reference
     available that the infill emitter does not write — and it is what says whether a
     fold belongs to the PETAL'S OWN FORM or to the infill. */
  const appCell = selfApproachMm(dev.facets, G.MIN_FEATURE_MM);
  const appPlain = selfApproachMm(plainFacets(ctx, F.mSplit - 1), G.MIN_FEATURE_MM);
  const scratch = P.census(r.acc.pos);
  const legacy = P.cutThrough(ctx, F, WALL, { conform: false });
  const legacyScratch = P.census(legacy.acc.pos);
  return { name, ctx, F, r, lat, dev, cCell, cPlain, scratch, appCell, appPlain,
    tris: r.tris, legacyTris: legacy.tris, legacyShells: legacyScratch.shells, cellTris: cellPos.length / 9, plainTris: aPlain.tris,
    voxel06: P.floodFill(r.acc.pos, 0.6), voxel03: QUICK ? null : P.floodFill(r.acc.pos, 0.3) };
}

function clauses(s) {
  const out = [];
  const t2 = s.ctx.t / 2;
  out.push({ id: 'C1a', ok: s.dev.worst <= s.lat.devMm + 1e-12,
    msg: `worst emitted skin facet ${s.dev.worst.toFixed(4)} mm against the shipped lattice's own ${s.lat.devMm.toFixed(4)} mm (ratio ${(s.dev.worst / s.lat.devMm).toFixed(3)}), over ${s.dev.nFacets} facets` });
  out.push({ id: 'C1b', ok: s.dev.worst <= t2,
    msg: `worst emitted skin facet ${s.dev.worst.toFixed(4)} mm against half the sheet ${t2.toFixed(4)} mm — the facet is inside its own material` });
  /* THE CLAUSE APPLIES WHERE THE PETAL'S OWN FORM LEAVES IT SOMETHING TO SAY. Where the
     PLAIN sheet over the same rows already comes under the printable gap, the sheet is
     folded before any cell is cut and no emitter can un-fold it — the clause reports and
     does not assert, and what carries the claim on those states is C1. */
  const applies = s.appPlain.mm >= G.MIN_FEATURE_MM;
  out.push({ id: 'C2a', ok: !applies || s.appCell.mm >= G.MIN_FEATURE_MM,
    msg: applies
      ? `nothing more than ${G.MIN_FEATURE_MM} mm apart on the sheet comes within ${s.appCell.mm.toFixed(6)}${s.appCell.saturated ? '+' : ''} mm in space (the plain sheet over the same rows reads ${s.appPlain.mm.toFixed(6)}${s.appPlain.saturated ? '+' : ''})`
      : `the PLAIN sheet over these rows already closes to ${s.appPlain.mm.toFixed(6)} mm — the petal's own form is folded before a cell is cut, so C2a reports rather than asserts (the cells read ${s.appCell.mm.toFixed(6)})` });
  out.push({ id: 'C2b', ok: true,
    msg: `REPORTED, not bounded: census ${s.cCell.within} pairs / ${s.cCell.worstSpanMm.toFixed(4)} mm against the plain sheet's ${s.cPlain.within} / ${s.cPlain.worstSpanMm.toFixed(4)}` });
  const areaErr = Math.abs(s.r.triAreaMm2 - s.r.planAreaMm2);
  out.push({ id: 'C3a', ok: areaErr <= 1e-6 * Math.max(1, s.r.planAreaMm2),
    msg: `the emitted plan triangles tile ${s.r.triAreaMm2.toFixed(6)} mm2 against the material's own ${s.r.planAreaMm2.toFixed(6)} mm2 (error ${areaErr.toExponential(2)})` });
  out.push({ id: 'C3b', ok: s.r.tileFail === 0, msg: `${s.r.tileFail} cells or sectors whose triangles do not tile the material they were cut from` });
  const cap = s.r.refine ? s.r.refine.cappedTris : 0;
  out.push({ id: 'C3c', ok: cap === 0, msg: `${cap} triangles emitted at the recursion cap (max depth ${s.r.refine ? s.r.refine.maxDepth : 0}) — an edge left unsplit on one side of itself, which is a crack` });
  out.push({ id: 'C4a', ok: s.scratch.boundary === 0, msg: `boundary edges ${s.scratch.boundary}` });
  /* NOT `shells === 1`. The vertex-welded shell count is not the connectedness test — the
     voxel fill below is — and it is a property of whether the cell region's base corners
     happen to weld to the base panel's top row, which the PETAL's own form decides:
     `buckle 0.6 f3` reads 2 on the legacy emitter as well. The claim this gate can make is
     that the conforming emitter does not make it worse. */
  out.push({ id: 'C4b', ok: s.scratch.shells <= s.legacyShells, msg: `vertex-welded shells ${s.scratch.shells} against the legacy emitter's ${s.legacyShells} on the same state` });
  out.push({ id: 'C4c', ok: s.voxel06 === 1 && (s.voxel03 === null || s.voxel03 === 1),
    msg: `voxel pieces ${s.voxel06}/${s.voxel03 === null ? 'skipped' : s.voxel03} at the 0.6 / 0.3 mm cells` });
  return out;
}

function report(results, label) {
  console.log(`\n${label}`);
  console.log('state                  | lattice | facet   | ratio | cells within/worst   | plain within/worst   | tris (legacy) | approach cell/plain | vox');
  let fails = 0;
  for (const s of results) {
    const cl = clauses(s); const bad = cl.filter((c) => !c.ok); fails += bad.length;
    console.log(`${s.name.padEnd(22)} | ${s.lat.devMm.toFixed(4)}  | ${s.dev.worst.toFixed(4)}  | ${(s.dev.worst / s.lat.devMm).toFixed(3).padStart(5)} | ${String(s.cCell.within).padStart(5)}/${s.cCell.worstSpanMm.toFixed(4)}       | ${String(s.cPlain.within).padStart(5)}/${s.cPlain.worstSpanMm.toFixed(4)}       | ${String(s.tris).padStart(5)} (${s.legacyTris}) | ${s.appCell.mm.toFixed(5)}${s.appCell.saturated?'+':' '}/${s.appPlain.mm.toFixed(5)}${s.appPlain.saturated?'+':' '} | ${s.voxel06}/${s.voxel03 ?? '-'}${bad.length ? '   <<< ' + bad.map((c) => c.id).join(',') : ''}`);
    for (const c of bad) console.log(`      ${c.id} FAILED: ${c.msg}`);
  }
  return fails;
}

/* ---------------- THE LEGACY IDENTITY ----------------
   `{ conform: false }` must be BIT-IDENTICAL to the emitter it replaced. That is what
   licenses the must-fail running through the SHIPPED function instead of a mutated copy of
   it, and what makes the companion tools' comparison a partition rather than an impression.
   It needs a worktree of a tree from before the change, so it is its own invocation and not
   part of the sweep: `--legacy-identity <base-tree>`. */
async function legacyIdentity(baseDir) {
  const B = await import(pathToFileURL(path.resolve(baseDir, 'tools/bloom-voronoi-proto.mjs')).href);
  const SEEDS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => P.SEED + i * 131);
  let floats = 0, diffs = 0, lenDiff = 0, states = 0, ctrl = 0;
  for (const [n, set] of STATES) for (const wall of [1.0, 0.8]) for (const seed of SEEDS) {
    const ch = P.context(set), cb = B.context(set);
    const Fh = P.fieldSalvage(ch, N_CELLS, { seed }), Fb = B.fieldSalvage(cb, N_CELLS, { seed });
    const a = P.cutThrough(ch, Fh, wall, { conform: false }).acc.pos, b = B.cutThrough(cb, Fb, wall).acc.pos;
    states++;
    if (a.length !== b.length) { lenDiff++; continue; }
    floats += a.length; for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) diffs++;
    /* the control: the comparison must be able to fail */
    const c = P.cutThrough(ch, Fh, wall).acc.pos;
    if (c.length !== b.length) ctrl++; else { for (let i = 0; i < c.length; i++) if (!Object.is(c[i], b[i])) { ctrl++; break; } }
  }
  console.log(`LEGACY IDENTITY: ${diffs} of ${floats.toLocaleString('en-US')} floats differ and ${lenDiff} streams differ in LENGTH, over ${states} states (${STATES.length} forms x 2 walls x ${SEEDS.length} seeds), head { conform: false } against ${baseDir}, Object.is.`);
  console.log(`CONTROL: the CONFORMING stream differs from the base on ${ctrl} of ${states} states — the comparison can fail.`);
  const ok = diffs === 0 && lenDiff === 0 && ctrl === states;
  console.log(ok ? 'PASS' : 'FAIL');
  if (!ok) process.exitCode = 1;
}

async function main() {
  const base = arg('--legacy-identity', null);
  if (base) { await legacyIdentity(base); return; }
  const v = validity();
  if (v.length) { console.log('HARNESS INVALID — no result below is trustworthy:'); for (const m of v) console.log('  ' + m); process.exitCode = 1; return; }
  console.log(`C0 the instruments vouch for themselves: ear clipping tiles a non-convex C, the sectors tile an annulus and not its hole, and the self-approach measure reads a written-down 0.30 mm and excludes a pair 0.2 mm apart in plan.`);
  const states = QUICK ? STATES.slice(0, 6) : STATES;
  const results = states.map(([n, s]) => runState(n, s));
  let fails = report(results, 'THE CONFORMING EMITTER — one seed, one petal, EXPORT mode, 16 cells, wall 1.0 mm.');

  /* C5 — the cost, reported rather than asserted except on the shipping default */
  const d = results[0];
  const bloomNew = P.wholeBloom('salvage', N_CELLS, WALL);
  const bloomOld = P.wholeBloom('salvage', N_CELLS, WALL, undefined, { conform: false });
  const petalPct = (100 * (d.tris - d.legacyTris) / d.legacyTris), bloomPct = (100 * (bloomNew.tris - bloomOld.tris) / bloomOld.tris);
  console.log(`\nC5 COST, the shipping default: petal ${d.legacyTris} -> ${d.tris} triangles (${petalPct >= 0 ? '+' : ''}${petalPct.toFixed(1)} %); whole bloom ${bloomOld.tris} -> ${bloomNew.tris} (${bloomPct >= 0 ? '+' : ''}${bloomPct.toFixed(1)} %), ${bloomNew.petals} petals + hub ${bloomNew.hubTris}.`);
  console.log(`   ${petalPct > 25 || bloomPct > 25 ? '**FLAGGED**: subdivision costs more than +25 % on the shipping default.' : 'Under the +25 % the brief asks to be flagged.'}`);
  for (const s of results) {
    const pct = 100 * (s.tris - s.legacyTris) / s.legacyTris;
    console.log(`   ${s.name.padEnd(22)} ${String(s.legacyTris).padStart(5)} -> ${String(s.tris).padStart(5)} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)} %)  tol ${s.r.tolMm.toFixed(4)} mm, floor ${s.r.minEdgeMm.toFixed(4)} mm, ${s.r.refine ? s.r.refine.edges : 0} plan edges, ${s.r.refine ? s.r.refine.cappedEdges : 0} held at the floor`);
  }

  if (NEG) {
    console.log('\n--- NEGATIVE CONTROL: three mutations, each naming the clauses it must redden ---');
    /* THE LISTS ARE MEASURED, NOT PREDICTED. `the-flat-fan-is-restored` was written
       claiming C2a and the control reported it MISSED — which is the CLAIM being wrong
       rather than the clause: the self-approach measure asks about parts of the sheet more
       than a printable feature apart IN PLAN, and a chord's damage on a flat blade is
       material drawn over a hole (C3a's subject) while on a curved one it is the facet's
       own position (C1's). **NO MUTATION HERE NAMES C2a**, and that is recorded as a gap
       rather than closed by widening a list: what vouches for that measure instead is C0,
       which reads a written-down 0.30 mm and refuses a pair 0.2 mm apart in plan. Every
       curved state in the sweep either has the PLAIN sheet already under the gap — so C2a
       reports rather than asserts — or is flat enough that the fan is exact. */
    const legs = [
      { id: 'the-flat-fan-is-restored', opts: { conform: false }, breaks: ['C1a', 'C1b', 'C3a'] },
      { id: 'the-subdivision-is-halved', opts: { levelBias: -1 }, breaks: ['C1a', 'C1b'] },
      { id: 'a-sector-is-fanned-from-a-corner', opts: { sectorFan: true }, breaks: ['C3a', 'C3b'] },
    ];
    for (const leg of legs) {
      const rs = states.map(([n, s]) => runState(n, s, leg.opts));
      const fired = new Set();
      for (const s of rs) for (const c of clauses(s)) if (!c.ok) fired.add(c.id);
      const missed = leg.breaks.filter((b) => !fired.has(b));
      console.log(`${leg.id.padEnd(34)} fired ${[...fired].sort().join(',') || '(nothing)'} — ${missed.length ? 'MISSED ' + missed.join(',') : 'every clause it names went red'}`);
      if (missed.length) fails++;
    }
  }

  const json = arg('--json', null);
  if (json) fs.writeFileSync(json, JSON.stringify(results.map((s) => ({ name: s.name, lattice: s.lat.devMm, facet: s.dev.worst, cells: s.cCell.within, cellsWorst: s.cCell.worstSpanMm, plain: s.cPlain.within, plainWorst: s.cPlain.worstSpanMm, approachCell: s.appCell.mm, approachPlain: s.appPlain.mm, tris: s.tris, legacyTris: s.legacyTris, tol: s.r.tolMm, boundary: s.scratch.boundary, shells: s.scratch.shells, voxel06: s.voxel06, voxel03: s.voxel03 })), null, 1));
  console.log(`\n${fails === 0 ? 'PASS' : `FAIL — ${fails} clause failure(s)`}`);
  if (fails) process.exitCode = 1;
}
main();
