/* ===================================================================
   bloom-combination-gate.mjs — TWO CONTROLS AT ONCE (#263)

   THE GAP THIS FILLS, and it is structural rather than an oversight.
   `buildMatrix()` VARIES ONE CONTROL AT A TIME. That is what makes a
   row attributable — a red names the control that moved — and it is
   exactly why a hazard that exists only in the PRODUCT of two settings
   is invisible to every gate in this repo by construction. Three
   separate findings have been written down and left ungated for that
   reason:

     - `petalCup` x `petalTipShape` (session 32 §18a): 1.031 mm of
       self-approach at the shipped tip shape, 0.977 at 2.50 and 0.832
       at 3.00, all on `petalCup` 1.2 — under the 1.00 mm printable gap,
       with NEITHER control alone reaching it.
     - the composition session 34 measured (`SELF_XFAIL['buckle-on-form']`
       in the wall instrument), whose own note names `cup+buckle` and
       `curl+buckle` as pairs.
     - the leaf blade against the free stem
       (`docs/bloom-leaves-outcome.md`): 0.824 / 0.289 / 0.000 mm at
       `leafAngle` 70 / 75 / 80-90, REPORTED and gated by nothing.

   WHAT IT MEASURES, AND IT IS ONE NUMBER: the NEAREST APPROACH IN
   MILLIMETRES between two surfaces that must not meet, on a predeclared
   PRODUCT GRID of two controls, against `MIN_FEATURE_MM` — this
   project's one owner of the minimum printable GAP, imported and never
   restated. A number and not a verdict, because three of the four items
   that asked for this instrument are rulings Eva makes FROM the number:
   the bell/corolla question 5 (the cup fold at 0.7 and up), §18a itself,
   and the inflorescence programme's ruling 11.

   TWO MEASURES, EACH WITH ONE OWNER, named per pair:
     self       `measureWall(grid).self` from tools/bloom-wall-thickness.mjs
                — the sheet approaching ANOTHER PART OF ITSELF. This is
                V5's own quantity, read through V5's own function: a
                second implementation here would agree with a broken one
                by being broken alongside it.
     leaf-stem  every LEAF BLADE vertex against the free stem solid,
                through the geometry's own `freeStemDistanceMm`. The
                PETIOLE is excluded by the leaf builder's OWN reported
                `petioleAxis` — it is rooted THROUGH the wall by design
                and reads exactly 0, and a clearance criterion means
                nothing between two solids that are fused (ST9's scope,
                and its remedy: name the rod, never widen the region).

   WHAT IT DOES NOT COVER, in its own header rather than in a doc:
     - `self` IS NOT THE SELF-INTERSECTION CENSUS AND DOES NOT REPLACE
       IT. It reads TOP-skin vertices against BOTTOM-skin triangles on
       the captured mid-surface, blade rows only, so a fold that brings
       two TOP faces together is outside what it can see, and so is the
       rim, the foot and the seam. `petalCup max (1.2)` is a DECLARED
       census xfail (752 pairs / 0.1268 mm) while its `self` reads 1.031
       and clears: those two numbers do not contradict each other, they
       answer different questions, and a clearing cell here is never a
       claim that the petal does not fold. X1/X2 in both STL gates own
       the census; this owns the approach.
     - ITS FLOOR SCALES WITH THE SHEET. `measureWall` excludes a +/-2
       cell neighbourhood, so a FLAT build reads ~1.25 mm at the shipping
       1.20 mm sheet rather than infinity, and the floor rises with
       `sheetThickness`. Pairs whose hazard is a thicker sheet are
       therefore poorly served by this measure and are REJECTED rather
       than declared — see docs/bloom-combination-gate.md.
     - IT READS ONE PETAL (the one `buildBloomInto` retains per
       descriptor), so it says nothing about petal-to-petal clearance.
       That is the crowding instrument's and `bloom-neighbour-gap.mjs`'s.
     - IT IS A MESH MEASUREMENT. Vertex-to-facet on a curved sheet
       under-reads by the facets' own sagitta; every figure here is the
       shipped 56 x 10 grid in EXPORT mode and must be quoted with that
       beside it (the durable mode-and-sampling rule).
     - THE BAR IS A DECLARED GUESS. Nothing in this project has ever been
       printed (§18b). That is not a reason to weaken it.

   THE CLAUSES, all five of which the must-fail exercises:
     CG0 THE GRID IS THE SHIPPED RANGE. Every declared value lies inside
         its control's registry range, and each axis's FIRST value IS
         that control's own DEFAULT — which is what makes the
         single-axis columns exist at all, and what makes a moved
         default redden this gate rather than silently re-point it.
     CG1 REACHABILITY. Every pair's grid must MOVE the measure away from
         its own (default, default) cell. A pair whose product is inert
         satisfies every other clause perfectly and tests nothing.
     CG2 THE BAR, BOTH DIRECTIONS. No cell may come within
         `MIN_FEATURE_MM` except those declared in `COMBINATION_XFAIL`; a
         declared cell that starts CLEARING is the fix landing and fails
         hard, so the entry comes off in the same commit. V5's shape, one
         level up.
     CG3 THE MAGNITUDE (#213). A declared cell must still read its
         recorded millimetres within `COMBINATION_TOLERANCE_MM`, in BOTH
         directions: a record that stops reproducing is stale whether the
         cell got worse or better, and the message says which.
     CG4 THE PRODUCT IS THE POINT, AS A BICONDITIONAL. Each pair declares
         `productOnly`. TRUE requires every single-axis cell to clear the
         bar AND some interior cell to fail — that is what makes this a
         COMBINATION gate rather than a second copy of V5. FALSE requires
         a single-axis cell to fail, which is how the one pair whose
         hazard is NOT a product stays honest about itself.
     CG5 STRAY DECLARATION. Every key in `COMBINATION_XFAIL` must name a
         cell some pair actually produces. A declaration nothing measures
         is worse than an absence.

   ITS FAMILIES ARE NOT IN THE SMOKE CENSUS, and that is the established
   pattern rather than a hole: `tools/bloom-smoke.mjs`'s CLAUSE C reads the
   assertion SITES in `tools/bloom-harness.mjs`, and CG0-CG5 live here, the
   way the wall instrument's V1-V5 and the arc's AS0-AS4 do. What polices
   them instead is `--control`, which must exercise every one.

   RUN:  node tools/bloom-combination-gate.mjs
         node tools/bloom-combination-gate.mjs --only '<regex over pair ids>'
         node tools/bloom-combination-gate.mjs --emit      the entries this tree measures
         node tools/bloom-combination-gate.mjs --control   the must-fail
   =================================================================== */

import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HERE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const IS_MAIN = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

/* THE BAND, and it is the wall instrument's own — the record's own
   rounding at three decimals, which is the precision this gate prints
   and the list records. It is NOT a printability argument: the bar for
   THAT is `MIN_FEATURE_MM`, imported below. A relative band was rejected
   for `SELF_INTERSECTION_XFAIL` because it passes a large regression on
   a large row and reddens a small one on noise (#213); the same reasoning
   applies to a distance in millimetres. */
export const COMBINATION_TOLERANCE_MM = 5e-4;

/* ------------------------------------------------------------- the pairs */

/* EVERY PAIR DECLARES WHY IT IS HERE AND WHAT CITES IT. A pair with no
   citation is a guess, and a guess costs gate time to prove nothing —
   Tiers 2 and 3 are proposed, costed and NOT shipped in
   docs/bloom-combination-gate.md, awaiting Eva's ruling.

   EACH AXIS'S FIRST VALUE IS THE CONTROL'S OWN REGISTRY DEFAULT (CG0),
   so the grid CONTAINS its own single-axis columns and the product-only
   claim costs no extra builds. */
export const PAIRS = [
  {
    id: 'cup-x-tipshape',
    label: 'petalCup x petalTipShape — the apex, cupped',
    measure: 'self',
    a: { id: 'petalCup', values: [0, 0.6, 0.9, 1.2] },
    b: { id: 'petalTipShape', values: [1.7, 2.5, 3.0] },
    productOnly: true,
    cite: 'docs/bloom-session-32-outcome.md §18a — 1.031 / 1.019 / 0.977 / 0.832 mm at n 1.20 / 2.00 / 2.50 / 3.00 on cup 1.2, reproduced here exactly',
    why: 'the cup lift and the apex taper both act at the tip: the cup brings the two margins toward each other while the superellipse takes the width out from under them',
  },
  {
    id: 'cup-x-curl',
    label: 'petalCup x petalSpineCurl — the fiddlehead, cupped',
    measure: 'self',
    a: { id: 'petalCup', values: [0, 0.6, 0.9, 1.2] },
    b: { id: 'petalSpineCurl', values: [0, 180, 270, 360] },
    productOnly: true,
    cite: "tools/bloom-wall-thickness.mjs already BUILDS this pair's cup 1.2 x curl 180 cell on every run — it is `buckle-on-form`'s own buckle-free control — and reads its wall while throwing its SELF away; the harness declares the census on the same state plus a buckle (`BUCKLE: THE COMPOSITION (cup 1.2 x curl 180)`, 2,078 pairs)",
    why: 'curl bends the spine into a hoop and cup lifts the margins across it; the curl brings distant stations of one blade together and the cup decides how much room is left between them',
  },
  {
    id: 'cup-x-buckle',
    label: 'petalCup x buckleAmp — the ruffle over a cup',
    measure: 'self',
    a: { id: 'petalCup', values: [0, 0.6, 0.9, 1.2] },
    b: { id: 'buckleAmp', values: [0, 0.2, 0.4] },
    productOnly: true,
    cite: "SELF_XFAIL['buckle-on-form'] names this pair in its own note (`cup+buckle reads 1.052`) — as a CURVATURE reading; this gate measures the SELF-APPROACH on it for the first time",
    why: "two summands of one normal displacement: `aN` at bloom-geometry.js:6071-6073 adds the cup's lift and the buckle's wave into the same offset along the same normal",
  },
  {
    id: 'curl-x-buckle',
    label: 'petalSpineCurl x buckleAmp — the ruffle on a hoop',
    measure: 'self',
    a: { id: 'petalSpineCurl', values: [0, 180, 270, 360] },
    b: { id: 'buckleAmp', values: [0, 0.2, 0.4] },
    productOnly: true,
    cite: "SELF_XFAIL['buckle-on-form'] names this pair in its own note (`curl+buckle 1.182`) — as a CURVATURE reading; this gate measures the SELF-APPROACH on it for the first time",
    why: 'the curl closes the blade on itself and the buckle spends the clearance that is left; session 34 measured that the composition has LOWER curvature than the base while the wall collapses, so no curvature bound can see it',
  },
  {
    id: 'leafangle-x-stem',
    label: 'leafAngle x stemDiameter — the blade against the stem it hangs off',
    measure: 'leaf-stem',
    base: { stemLength: 70, leafLength: 52, leafWidth: 17, leafNodes: 3 },
    a: { id: 'leafAngle', values: [35, 50, 70, 85] },
    b: { id: 'stemDiameter', values: [6, 3, 12] },
    /* FALSE, AND THAT IS THIS SESSION'S OWN MEASUREMENT RATHER THAN AN
       ADMISSION. Swept over six candidate partners (stemDiameter,
       leafLength, leafWidth, stemLength, leafNodes and leafLength x
       stemDiameter), the SECOND control moves the approach by at most
       0.002 mm: the hazard is `leafAngle`'s ALONE. So item 20 is a
       MEASUREMENT gap and not a combination gap — `LEAVES: the STEEP
       angle (85 deg ...)` is already a matrix row, and what was missing
       is that nothing in the repo measures blade-to-stem approach at
       all. It rides here because this is that instrument, and CG4's
       FALSE arm is where the finding is asserted rather than merely
       written down. */
    productOnly: false,
    cite: 'docs/bloom-leaves-outcome.md — 1.853 / 4.356 / 5.492 / 4.910 / 4.019 / 2.804 / 1.853 / 0.824 / 0.289 / 0.000 mm at leafAngle -60..90, reproduced here exactly through an instrument that shares no code with the one that produced it',
    why: "the escape length is `outerR / cos(theta)`, so a steeper angle lays the blade back along the stem; Eva's ruled 35 deg reads 4.019 mm, four times the gap",
  },
];

/* ------------------------------------------------------- the declarations */

/* A CELL KEY IS `<pair id> @ <a>=<va> x <b>=<vb>`, built by `cellKey`
   below so the list and the run cannot format it two ways.

   EVERY ENTRY CARRIES ITS MAGNITUDE AS A NUMBER THE GATE READS (#213).
   The module REFUSES TO LOAD on an entry without one: a declaration with
   no number is a label, and this project has cleaned that up four times. */
export const COMBINATION_XFAIL = Object.freeze({
  /* THE §18a CELLS, AND THREE THE DOC DID NOT HAVE. §18a measured the
     hazard at `petalCup` 1.2 alone; the grid shows it reaching DOWN to
     cup 0.6 at the ceiling tip shape Eva ruled reachable. The shipped
     `petalTipShape` is 1.70, so the cup column at 1.70 IS "cup alone",
     clears at 1.031, and is also the bell/corolla question 5's own
     number. */
  'cup-x-tipshape @ petalCup=0.6 x petalTipShape=3': { mm: 0.929, note: 'NEW — the §18a hazard is not confined to cup 1.2. Measured 2026-09-19 on 937263a; cup 0.6 alone reads 1.178 and n 3.00 alone 1.203, both clear.' },
  'cup-x-tipshape @ petalCup=0.9 x petalTipShape=2.5': { mm: 0.988, note: 'NEW, and the shallowest failing cell in the gate. Measured 2026-09-19 on 937263a.' },
  'cup-x-tipshape @ petalCup=0.9 x petalTipShape=3': { mm: 0.854, note: 'NEW. Measured 2026-09-19 on 937263a.' },
  'cup-x-tipshape @ petalCup=1.2 x petalTipShape=2.5': { mm: 0.977, note: "session 32 §18a's own figure (0.977), reproduced exactly on 937263a. 2.50 is Eva's preferred LOOK, ruled reachable and not shipped as the default." },
  'cup-x-tipshape @ petalCup=1.2 x petalTipShape=3': { mm: 0.832, note: "session 32 §18a's own figure (0.832), reproduced exactly on 937263a. Monotone in n and the worst cell of this pair." },

  /* THE CUP-AND-CURL CELLS — SIX OF THEM, and this pair is the finding of
     the session. `petalCup` 1.2 x `petalSpineCurl` 180 is the state
     `tools/bloom-wall-thickness.mjs` already BUILDS on every run as
     `buckle-on-form`'s buckle-free control, reads the wall of, and
     discards the SELF of; its 0.945 mm has been available to that gate
     since session 34 and nothing looked at it. */
  'cup-x-curl @ petalCup=0.6 x petalSpineCurl=360': { mm: 0.826, note: 'measured 2026-09-19 on 937263a. Neither alone: cup 0.6 reads 1.178, curl 360 reads 1.245.' },
  'cup-x-curl @ petalCup=0.9 x petalSpineCurl=270': { mm: 0.881, note: 'measured 2026-09-19 on 937263a.' },
  'cup-x-curl @ petalCup=0.9 x petalSpineCurl=360': { mm: 0.118, note: 'measured 2026-09-19 on 937263a.' },
  'cup-x-curl @ petalCup=1.2 x petalSpineCurl=180': { mm: 0.945, note: "measured 2026-09-19 on 937263a. THE CELL THE WALL INSTRUMENT ALREADY BUILDS every run — `buckle-on-form`'s own control — and whose SELF it throws away." },
  'cup-x-curl @ petalCup=1.2 x petalSpineCurl=270': { mm: 0.193, note: 'measured 2026-09-19 on 937263a.' },
  'cup-x-curl @ petalCup=1.2 x petalSpineCurl=360': { mm: 0.012, note: 'measured 2026-09-19 on 937263a — the worst cell in the gate: a sheet twelve microns from touching itself on two shipped sliders, with both singles clear (1.031 and 1.245).' },

  /* THE BUCKLE CELLS. `buckleAmp` stops at 0.4 on these grids because the
     amplitude CLAMP makes 0.6 float-identical to 0.4 at the default
     frequency 3 — measured, on every cup and every curl of both grids —
     so the top of the slider is covered by the cell below it and a
     fourth column would cost two builds to re-measure one state. */
  'cup-x-buckle @ petalCup=1.2 x buckleAmp=0.2': { mm: 0.99, note: 'measured 2026-09-19 on 937263a.' },
  'cup-x-buckle @ petalCup=1.2 x buckleAmp=0.4': { mm: 0.963, note: "measured 2026-09-19 on 937263a. Session 34 named this pair in `buckle-on-form`'s note as a CURVATURE reading (1.052 /mm); this is its self-approach, measured for the first time." },
  'curl-x-buckle @ petalSpineCurl=360 x buckleAmp=0.4': { mm: 0.912, note: "measured 2026-09-19 on 937263a. Session 34 named this pair in `buckle-on-form`'s note as a CURVATURE reading (1.182 /mm); this is its self-approach, measured for the first time." },

  /* THE LEAF CELLS — `leafAngle`'s hazard, at every stem diameter, which
     is what CG4's FALSE arm asserts about this pair. */
  'leafangle-x-stem @ leafAngle=70 x stemDiameter=6': { mm: 0.824, note: "docs/bloom-leaves-outcome.md's own figure (0.824), reproduced exactly through an instrument that shares no code with the one that produced it." },
  'leafangle-x-stem @ leafAngle=70 x stemDiameter=3': { mm: 0.826, note: 'measured 2026-09-19 on 937263a.' },
  'leafangle-x-stem @ leafAngle=70 x stemDiameter=12': { mm: 0.822, note: "measured 2026-09-19 on 937263a — 0.002 mm from the 6 mm stem's reading, which is the whole of what the second control contributes." },
  'leafangle-x-stem @ leafAngle=85 x stemDiameter=6': { mm: 0, note: "docs/bloom-leaves-outcome.md's 80-90 deg cell: the blade reaches the stem's own surface. `LEAVES: the STEEP angle (85 deg)` is a shipped MATRIX ROW, so this hazard was reachable, built and exported on every full gate run — nothing measured it." },
  'leafangle-x-stem @ leafAngle=85 x stemDiameter=3': { mm: 0, note: 'measured 2026-09-19 on 937263a.' },
  'leafangle-x-stem @ leafAngle=85 x stemDiameter=12': { mm: 0, note: 'measured 2026-09-19 on 937263a.' },
});
for (const [k, e] of Object.entries(COMBINATION_XFAIL)) {
  if (!e || !(Number.isFinite(e.mm) && e.mm >= 0)) {
    throw new Error(`COMBINATION_XFAIL: "${k}" declares no approach in mm (${JSON.stringify(e)}) — an entry is {mm[, note]}, and a declaration without a number is a label`);
  }
}

/* ------------------------------------------------------------ the measures */

const num = (v) => (typeof v === 'number' ? String(Number(v.toPrecision(12))) : String(v));
export const cellKey = (pair, va, vb) => `${pair.id} @ ${pair.a.id}=${num(va)} x ${pair.b.id}=${num(vb)}`;

/* Distance from a point to a segment — the petiole rod's own axis, which
   is the only thing this file computes that the geometry does not
   already own. */
function segDist(p, a, b) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const L2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
  const t = L2 > 0 ? Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / L2)) : 0;
  return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t);
}

/* HOW CLOSE THE LEAF BLADE COMES TO THE FREE STEM. Every leaf the plan
   places is rebuilt into a throwaway accumulator through the SHIPPED
   `buildLeafInto` — `petalFreeStemApproachMm`'s own construction, for its
   own reason: a second producer of the blade would agree with a broken
   blade by being broken alongside it (session 43's ST2, session 41's L7).
   The rod is excluded by the builder's OWN reported `petioleAxis`, never
   by re-deriving where the petiole is from `leafPlan`.
   NAMES ITS SAMPLING: emitted VERTICES, the population the leaves
   outcome doc measured too. A chord between two cleared vertices can dip
   nearer than either by at most the mesh's own chord scale; that is a
   sub-mesh effect and it is reported rather than absorbed into the bar. */
export function measureLeafStemApproachMm(G, state, exportMode) {
  const acc = new G.MeshBuilder({ exportMode });
  const m = G.buildBloomInto(acc, state);
  if (!m.stem || !m.stem.present) return { mm: Infinity, why: 'no stem is built, so there is nothing for a blade to approach' };
  if (!m.leaf || !m.leaf.present) return { mm: Infinity, why: 'no leaf is built' };
  let best = Infinity, at = null, leaves = 0, verts = 0;
  for (let i = 0; i < m.leaf.azimuths.length; i++) {
    for (const az of m.leaf.azimuths[i]) {
      const probe = new G.MeshBuilder({ exportMode });
      const rep = G.buildLeafInto(probe, m.leaf, state, i, az);
      const ax = rep.petioleAxis;
      const P = probe.positions;
      leaves++;
      for (let j = 0; j < P.length; j += 3) {
        const p0 = P[j], p1 = P[j + 1], p2 = P[j + 2];
        /* THE ROD ITSELF, named rather than the region widened. */
        if (segDist([p0, p1, p2], ax.inner, ax.outer) <= ax.radiusMm * (1 + 1e-6)) continue;
        verts++;
        const d = G.freeStemDistanceMm(m.stem, p0, p1, p2);
        if (d < best) { best = d; at = { node: i, azDeg: (az * 180) / Math.PI }; }
      }
    }
  }
  if (!leaves) return { mm: Infinity, why: 'the plan placed no leaf' };
  if (!verts) return { mm: Infinity, why: 'every emitted vertex is the petiole rod — there is no blade to measure' };
  return { mm: best, at, leaves, verts };
}

/* ------------------------------------------------------------------ driver */

async function loadTree(root) {
  const [G, R, W] = await Promise.all([
    import(pathToFileURL(path.join(root, 'bloom-geometry.js')).href),
    import(pathToFileURL(path.join(root, 'bloom-registry.js')).href),
    import(pathToFileURL(path.join(root, 'tools', 'bloom-wall-thickness.mjs')).href),
  ]);
  return { G, R, W };
}

/* Build one cell and return its approach in mm. EXPORT mode throughout:
   the print floor is what the bar is about, and mixing modes in one table
   would make the column headings lie. */
function measureCell({ G, W }, DEFAULTS, pair, va, vb) {
  const state = { ...DEFAULTS, ...(pair.base || {}), [pair.a.id]: va, [pair.b.id]: vb };
  if (pair.measure === 'leaf-stem') return measureLeafStemApproachMm(G, state, true);
  const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
  const m = G.buildBloomInto(acc, state);
  /* A TOOL THAT CANNOT DO ITS JOB REFUSES; it never returns a passing
     number for a question it did not answer. `built.petal` is NULL where a
     slot is declared and not built — the sphere stem's omission mask is the
     first thing in this project able to produce that, and a future pair
     reaching it must see a named refusal rather than a TypeError from
     inside the wall instrument. */
  if (!m.petal || !m.petal.grid) {
    throw new Error(`combination gate: "${pair.id}" at ${pair.a.id}=${num(va)} x ${pair.b.id}=${num(vb)} built NO retained petal, so the \`self\` measure has nothing to read. A pair whose grid can empty the petal needs a different measure, not a skip.`);
  }
  const r = W.measureWall(m.petal.grid);
  return { mm: r.self, at: { u: r.selfAt[0], v: r.selfAt[1] }, rows: r.rows, columns: r.columns };
}

export async function run({ root = HERE, only = null, pairs = PAIRS } = {}) {
  const tree = await loadTree(root);
  const { R } = tree;
  const chosen = pairs.filter((p) => !only || only.test(p.id));
  const out = [];
  let builds = 0;
  for (const p of chosen) {
    const grid = [];
    for (const va of p.a.values) {
      const row = [];
      for (const vb of p.b.values) { row.push({ va, vb, key: cellKey(p, va, vb), ...measureCell(tree, R.DEFAULTS, p, va, vb) }); builds++; }
      grid.push(row);
    }
    out.push({ pair: p, grid });
  }
  return { tree, rows: out, builds, skipped: pairs.length - chosen.length };
}

/* THE RECORD CONTROL'S HANDLE. `perturb` swaps ONE declared magnitude for
   a wrong one so CG3 can be SEEN to fire without a geometry mutation —
   the wall instrument's own idiom, and it exists because a clause nobody
   has watched go red is a hope. */
export async function verify({ root = HERE, quiet = false, only = null, pairs = PAIRS, xfail = COMBINATION_XFAIL, cached = null } = {}) {
  const fails = [];
  const say = (...a) => { if (!quiet) console.log(...a); };
  /* A CACHED GRID IS REUSED ONLY WHERE IT IS PROVABLY THE SAME GRID. The
     must-fail plants several conditions that change no geometry (a
     declaration, a `productOnly` flag), and rebuilding 64 cells for each
     of them costs minutes to re-measure states already measured. So a
     caller may hand back a previous run's rows — and this REFUSES them
     unless the pair ids and both axes' values match value for value, so a
     cached run can never silently evaluate a clause against a different
     grid from the one the plant describes. */
  let { tree, rows, builds, skipped } = cached
    ? { ...cached, builds: 0 }
    : await run({ root, only, pairs });
  if (cached) {
    const sig = (ps) => JSON.stringify(ps.map((p) => [p.id, p.a.id, p.a.values, p.b.id, p.b.values, p.base || null]));
    if (sig(rows.map((r) => r.pair)) !== sig(pairs.filter((p) => !only || only.test(p.id)))) {
      throw new Error('verify: the cached rows were built from a different grid than the pairs handed in — a cached clause evaluation must measure the grid it describes');
    }
    /* Re-attach the caller's pair objects, so a plant on a non-geometric
       field (productOnly, cite) is the one the clauses read. */
    const byId = new Map(pairs.map((p) => [p.id, p]));
    rows = rows.map((r) => ({ ...r, pair: byId.get(r.pair.id) || r.pair }));
  }
  const { G, R } = tree;
  const BAR = G.MIN_FEATURE_MM;
  if (typeof BAR !== 'number') fails.push('CG2 bar: the geometry does not export MIN_FEATURE_MM — this gate will not invent a bar');

  say('bloom combination gate — the nearest approach in millimetres on a product of TWO controls.');
  say(`  bar ${Number(BAR).toFixed(2)} mm (MIN_FEATURE_MM, imported) · EXPORT mode · band +/-${COMBINATION_TOLERANCE_MM} mm · (x) declared, (!) UNDECLARED\n`);

  const byControl = new Map(R.CONTROLS.map((c) => [c.id, c]));
  const seenKeys = new Set();

  for (const { pair, grid } of rows) {
    /* ---------------------------------------------------- CG0 the grid */
    for (const ax of [pair.a, pair.b]) {
      const c = byControl.get(ax.id);
      if (!c) { fails.push(`CG0 grid: "${pair.id}" names ${ax.id}, which the registry does not declare`); continue; }
      if (ax.values.length < 2) fails.push(`CG0 grid: "${pair.id}" gives ${ax.id} ${ax.values.length} value(s) — an axis of one value is not an axis`);
      if (new Set(ax.values.map(num)).size !== ax.values.length) fails.push(`CG0 grid: "${pair.id}" repeats a value on ${ax.id} — a repeated cell costs a build and measures nothing`);
      if (!Object.is(ax.values[0], R.DEFAULTS[ax.id])) {
        fails.push(`CG0 grid: "${pair.id}" starts ${ax.id} at ${num(ax.values[0])} and the registry default is ${num(R.DEFAULTS[ax.id])} — the first value of an axis IS the single-axis column, so the product-only claim (CG4) would be made against a state nobody ships`);
      }
      for (const v of ax.values) {
        if (c.kind === 'slider' && !(v >= c.min && v <= c.max)) fails.push(`CG0 grid: "${pair.id}" asks ${ax.id} = ${num(v)}, outside the shipped range ${c.min}..${c.max} — a cell nobody can select is not a hazard`);
      }
    }

    const cells = grid.flat();
    for (const cell of cells) seenKeys.add(cell.key);
    const base = grid[0][0];                                            // (default, default)
    const singles = [...grid[0], ...grid.map((r) => r[0])];             // the two single-axis columns
    const interior = cells.filter((c) => !Object.is(c.va, pair.a.values[0]) && !Object.is(c.vb, pair.b.values[0]));
    const worst = cells.reduce((x, y) => (y.mm < x.mm ? y : x));
    const worstSingle = singles.reduce((x, y) => (y.mm < x.mm ? y : x));

    /* ---------------------------------------------- the table, per pair */
    say(`  ${pair.label}`);
    say(`    measure: ${pair.measure === 'self' ? 'SELF — the sheet against another part of itself (measureWall, the wall instrument\'s own)' : 'LEAF BLADE against the FREE STEM (freeStemDistanceMm, the geometry\'s own; the petiole rod excluded by the builder\'s petioleAxis)'}`);
    say('      ' + `${pair.a.id} \\ ${pair.b.id}`.padEnd(30) + pair.b.values.map((v) => (num(v) + (Object.is(v, pair.b.values[0]) ? '*' : '')).padStart(10)).join(''));
    for (let i = 0; i < grid.length; i++) {
      const lead = num(pair.a.values[i]) + (i === 0 ? '*' : '');
      say('      ' + lead.padEnd(30) + grid[i].map((c) => {
        const mark = Number.isFinite(c.mm) ? (c.mm < BAR ? (Object.prototype.hasOwnProperty.call(xfail, c.key) ? 'x' : '!') : ' ') : ' ';
        return ((Number.isFinite(c.mm) ? c.mm.toFixed(3) : '—') + mark).padStart(10);
      }).join(''));
    }
    say(`      * the control's own shipped DEFAULT, so that row and that column are the single-axis readings (CG0).`);
    say(`      worst cell ${worst.mm.toFixed(3)} mm at ${pair.a.id}=${num(worst.va)} x ${pair.b.id}=${num(worst.vb)}; worst SINGLE ${worstSingle.mm.toFixed(3)} at ${pair.a.id}=${num(worstSingle.va)} x ${pair.b.id}=${num(worstSingle.vb)}; the product costs ${(worstSingle.mm - worst.mm).toFixed(3)} mm beyond what either control reaches alone (reported, never a bar).`);
    say(`      cited: ${pair.cite}`);

    /* ------------------------------------------------ CG1 reachability.
       PER AXIS, and that is the whole point of the clause: a pair whose
       SECOND control does not reach the measure is a single-axis sweep
       wearing a product's clothes, and it satisfies every other clause
       here perfectly. A whole-grid "something moved" test cannot see it,
       because the FIRST axis moves plenty — that version of this clause
       stayed GREEN under the must-fail's own plant, which is how it was
       found.

       THE BAR IS THE BAND, AND IT IS DERIVED RATHER THAN TYPED. An
       `Object.is` test would be satisfied by ONE ULP, and that is not
       hypothetical: measured on this tree, `lobeDepth` moves the cup
       column by 2e-16 mm — inert for every purpose and not bit-identical.
       A control whose WHOLE effect on the measure is smaller than the band
       its records are held to is not reaching the measure, so
       `COMBINATION_TOLERANCE_MM` is the threshold and no second constant
       is invented. (`stamenCount` moves it by exactly 0, which is what
       makes it the must-fail's plant.) */
    const spread = (a, b) => (Number.isFinite(a) && Number.isFinite(b) ? Math.abs(a - b) : Object.is(a, b) ? 0 : Infinity);
    const movesDownColumns = Math.max(...grid.flatMap((row, i) => (i === 0 ? [0] : row.map((c, j) => spread(c.mm, grid[0][j].mm)))));
    const movesAlongRows = Math.max(...grid.flatMap((row) => row.map((c, j) => (j === 0 ? 0 : spread(c.mm, row[0].mm)))));
    for (const [ax, other, moved] of [[pair.a, pair.b, movesDownColumns], [pair.b, pair.a, movesAlongRows]]) {
      if (!(moved > COMBINATION_TOLERANCE_MM)) {
        fails.push(`CG1 reachability: "${pair.id}" moves the measure by at most ${moved.toExponential(2)} mm across the whole of ${ax.id} — under the ${COMBINATION_TOLERANCE_MM} mm band its own records are held to, so that control does not reach this measure and the pair is a ${other.id} sweep wearing a product's clothes. Every other clause about it is vacuous. Either the pair is wrong or the measure is.`);
      }
    }
    if (!Number.isFinite(base.mm) && pair.measure === 'leaf-stem') {
      fails.push(`CG1 reachability: "${pair.id}" measures nothing at its own default cell (${base.why || 'no reading'}) — its base set does not build the parts it is about`);
    }

    /* -------------------------------------------- CG2 the bar, both ways */
    for (const c of cells) {
      const declared = Object.prototype.hasOwnProperty.call(xfail, c.key);
      const under = Number.isFinite(c.mm) && c.mm < BAR;
      if (under && !declared) {
        fails.push(`CG2 bar: ${c.key} approaches to ${c.mm.toFixed(3)} mm, under the ${BAR.toFixed(2)} mm minimum printable gap, and is NOT one of the ${Object.keys(xfail).length} declared cells — a NEW combination hazard. Measure it (this gate prints the figure), declare it with its number, and name it in the outcome doc.`);
      } else if (!under && declared) {
        fails.push(`CG2 xfail: ${c.key} now clears at ${Number.isFinite(c.mm) ? c.mm.toFixed(3) : c.mm} mm and PASSES — the declared combination hazard is FIXED. Remove its COMBINATION_XFAIL entry in the same commit. (was: ${xfail[c.key].mm.toFixed(3)} mm — ${xfail[c.key].note})`);
      } else if (under && declared) {
        /* ------------------------------------- CG3 the magnitude (#213) */
        const d = c.mm - xfail[c.key].mm;
        if (Math.abs(d) > COMBINATION_TOLERANCE_MM) {
          fails.push(`CG3 magnitude: ${c.key} is declared at ${xfail[c.key].mm.toFixed(3)} mm and reads ${c.mm.toFixed(3)} (${d > 0 ? '+' : ''}${d.toFixed(4)} mm, band +/-${COMBINATION_TOLERANCE_MM}) — ${d < 0 ? 'the surfaces come CLOSER than the record says: the declared hazard got WORSE' : 'they clear more than the record says: it IMPROVED and nobody re-recorded it'}. Re-measure (--emit prints the entries this tree measures) and re-record it in the commit that moved it, naming the move in its outcome doc.`);
        }
      }
    }

    /* ------------------------ CG4 the product is the point, both ways */
    const singleFails = singles.filter((c) => Number.isFinite(c.mm) && c.mm < BAR);
    const interiorFails = interior.filter((c) => Number.isFinite(c.mm) && c.mm < BAR);
    if (pair.productOnly) {
      if (singleFails.length) {
        fails.push(`CG4 product-only: "${pair.id}" declares productOnly TRUE and its SINGLE-axis cell ${singleFails[0].key} already fails at ${singleFails[0].mm.toFixed(3)} mm — one control reaches the hazard on its own, so the matrix can see it and this pair is not what it says it is. Either the declaration is wrong or the grid has moved onto an already-failing single.`);
      }
      if (!interiorFails.length) {
        fails.push(`CG4 product-only: "${pair.id}" declares productOnly TRUE and NO interior cell fails — the product reaches nothing the singles do not, so the pair costs gate time to prove nothing. Widen the grid inside the shipped ranges, or drop the pair and say so.`);
      }
    } else if (!singleFails.length) {
      fails.push(`CG4 product-only: "${pair.id}" declares productOnly FALSE — i.e. one control reaches the hazard alone — and no single-axis cell fails. The declaration is now wrong in the direction that matters: if the hazard really is a product, the pair should say so and the finding in its note is stale.`);
    }
    say(`      CG4: productOnly ${pair.productOnly ? 'TRUE' : 'FALSE'} — ${singleFails.length} single-axis cell(s) under the bar, ${interiorFails.length} interior cell(s) under it.`);
    say('');
  }

  /* --------------------------------------------- CG5 stray declaration */
  if (!only) {
    for (const k of Object.keys(xfail)) {
      if (!seenKeys.has(k)) fails.push(`CG5 stray declaration: COMBINATION_XFAIL names "${k}", which no pair's grid produces — a declaration nothing measures is worse than an absence. Rename it, re-point the grid, or take it off.`);
    }
  }

  const nCells = rows.reduce((a, r) => a + r.grid.flat().length, 0);
  say(`  ${rows.length} pair(s), ${nCells} cells, ${builds} builds${skipped ? ` — ${skipped} pair(s) NOT run (a --only subset; no gate-level claim is made)` : ''}.`);
  if (only) say('  CG5 is NOT evaluated on a --only run: a declaration this subset does not reach is not a stray one.');
  if (fails.length) { if (!quiet) { say(''); for (const f of fails) console.error('  FAIL  ' + f); } }
  /* THE CLEAN LINE NAMES ONLY THE CLAUSES THAT RAN. On a `--only` run CG5 is
     not evaluated, and a summary claiming it is clean would be a label naming
     a computation nobody performed — this project's most repeated defect. */
  else say(only ? '\n  CG0 grid · CG1 reachability · CG2 bar · CG3 magnitude · CG4 product-only — all clean on this SUBSET; CG5 stray NOT EVALUATED.'
                : '\n  CG0 grid · CG1 reachability · CG2 bar · CG3 magnitude · CG4 product-only · CG5 stray — all clean.');
  return { fails, rows, bar: BAR };
}

/* -------------------------------------------------------- the must-fail */

/* `--control` IS THE MUST-FAIL AND IT EXERCISES EVERY ONE OF THE FIVE
   CLAUSES, because #262 found that the clause named in its own brief was
   not the clause that had changed. Each leg PLANTS its condition into a
   COPY of the real `PAIRS` / `COMBINATION_XFAIL` — the same objects the
   gate reads on an ordinary run, so nothing about the clause is restated
   here — runs the SHIPPED `verify`, and requires exactly the named
   clause to be among the findings and nothing else to fire.

   IT REFUSES A VACUOUS PLANT: a tree with no declared cell, or no failing
   cell, or no clearing cell, has nothing to plant and a control with
   nothing to plant cannot have been wrong.

   AND IT PRINTS THE RED THROUGH THE SAME PATH A REAL FAILURE TAKES: the
   last leg is re-run NOT quiet, so the gate's ordinary table and its own
   `FAIL` block are written verbatim. A control that renders its own red
   is a control whose red can drift from the genuine one. */
async function control({ root = HERE } = {}) {
  const baseRun = await run({ root });
  const { fails: baseFails, rows, bar } = await verify({ root, quiet: true, cached: baseRun });
  if (baseFails.length) {
    console.error(`  FAIL  the shipped tree is not green (${baseFails.length} finding(s)) — no planted result can be read against it`);
    for (const f of baseFails) console.error('        ' + f);
    return 1;
  }
  console.log('  baseline: the shipped tree is green, so every red below is the plant\'s.\n');

  const allCells = rows.flatMap((r) => r.grid.flat());
  const failing = allCells.find((c) => Number.isFinite(c.mm) && c.mm < bar && COMBINATION_XFAIL[c.key]);
  const clearing = allCells.find((c) => Number.isFinite(c.mm) && c.mm >= bar && !COMBINATION_XFAIL[c.key]);
  const why = [];
  if (!failing) why.push('no cell is both under the bar and declared, so neither the CG2 removal nor the CG3 record legs have anything to plant');
  if (!clearing) why.push('no cell clears the bar undeclared, so the CG2 "declared but clearing" leg has nothing to plant');
  if (!PAIRS.some((p) => p.productOnly) || !PAIRS.some((p) => !p.productOnly)) why.push('PAIRS does not carry both a productOnly TRUE and a productOnly FALSE pair, so CG4 can only be exercised in one direction');
  if (why.length) { console.error(`REFUSED (vacuous control): ${why.join('; ')}.`); return 2; }

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const flip = (id) => PAIRS.map((p) => (p.id === id ? { ...clone(p), productOnly: !p.productOnly } : p));
  const strayKey = 'cup-x-tipshape @ petalCup=99 x petalTipShape=99';
  const trueArm = PAIRS.find((p) => p.productOnly), falseArm = PAIRS.find((p) => !p.productOnly);
  /* CG0's plant moves an axis's FIRST value off the registry default, which
     is the edit that would silently re-point every single-axis column. */
  const cg0 = PAIRS.map((p) => (p.id === trueArm.id ? { ...clone(p), a: { ...p.a, values: [p.a.values[1], ...p.a.values.slice(1)] } } : p));
  /* CG1's plant swaps one axis for a control that is PROVABLY INERT for
     this measure — `stamenCount`, a different part entirely, measured
     bit-identical on the cup column at 0, 60 and 120 stamens. It starts at
     its own registry default and lies inside its range, so CG0 stays
     silent and the leg isolates CG1. CG4 fires beside it, honestly: an
     inert axis means no interior cell fails, which is the same finding
     seen from the other side. */
  const cg1 = PAIRS.map((p) => (p.id === trueArm.id ? { ...clone(p), b: { id: 'stamenCount', values: [0, 60] } } : p));
  const without = (k) => { const o = { ...COMBINATION_XFAIL }; delete o[k]; return o; };

  /* `rebuilds: true` marks the two legs whose plant changes the GRID and
     therefore cannot reuse the baseline's measurements. Every other plant
     changes a declaration or a flag, which moves no geometry. */
  const legs = [
    ['CG0 an axis no longer starts at its control\'s default', { pairs: cg0 }, 'CG0', true],
    ['CG1 an axis cannot reach the measure at all', { pairs: cg1 }, 'CG1', true],
    ['CG2 a failing cell\'s declaration is removed', { xfail: without(failing.key) }, 'CG2'],
    ['CG2 a CLEARING cell is declared as failing', { xfail: { ...COMBINATION_XFAIL, [clearing.key]: { mm: 0.5, note: 'CONTROL' } } }, 'CG2'],
    ['CG3 a record is stale, the cell reads WORSE', { xfail: { ...COMBINATION_XFAIL, [failing.key]: { ...COMBINATION_XFAIL[failing.key], mm: COMBINATION_XFAIL[failing.key].mm + 0.1 } } }, 'CG3'],
    ['CG3 a record is stale, the cell reads BETTER', { xfail: { ...COMBINATION_XFAIL, [failing.key]: { ...COMBINATION_XFAIL[failing.key], mm: Math.max(0, COMBINATION_XFAIL[failing.key].mm - 0.1) } } }, 'CG3'],
    [`CG4 "${trueArm.id}" flips productOnly TRUE -> FALSE`, { pairs: flip(trueArm.id) }, 'CG4'],
    [`CG4 "${falseArm.id}" flips productOnly FALSE -> TRUE`, { pairs: flip(falseArm.id) }, 'CG4'],
    ['CG5 a declaration names a cell no grid produces', { xfail: { ...COMBINATION_XFAIL, [strayKey]: { mm: 0.5, note: 'CONTROL' } } }, 'CG5'],
  ];

  let bad = 0, last = null;
  for (const [name, plant, want, rebuilds] of legs) {
    const { fails } = await verify({ root, quiet: true, ...plant, cached: rebuilds ? null : baseRun });
    const hit = fails.filter((f) => f.startsWith(want));
    const other = fails.filter((f) => !f.startsWith(want));
    const ok = hit.length > 0;
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(56)} fired ${hit.length} ${want} clause(s)${other.length ? `, and ${other.length} other (named below as collateral)` : ''}`);
    for (const f of hit) console.log(`         ${f.slice(0, 190)}`);
    for (const f of other) console.log(`         collateral: ${f.slice(0, 140)}`);
    if (!ok) console.error(`         MISSED: ${want} stayed green under a plant that names it — that clause is not measuring the tree`);
    last = plant;
  }

  /* THE RED, THROUGH THE GATE'S OWN PRINTER. Everything above reads the
     findings as strings; this writes the whole run — the table, the
     per-pair lines and the FAIL block — exactly as a genuine failure
     would, so the two cannot drift. */
  console.log('\n  --- the last plant, re-run through the gate\'s own output path (this is the red a real failure prints) ---\n');
  await verify({ root, quiet: false, ...last, cached: baseRun });
  return bad;
}

/* ----------------------------------------------------------------- the CLI */

if (IS_MAIN) {
  const argv = process.argv.slice(2);
  const arg = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
  const only = arg('--only') ? new RegExp(arg('--only')) : null;
  if (argv.includes('--control')) {
    console.log('combination gate — the must-fail. Each leg plants ONE condition into a copy of the');
    console.log('real PAIRS / COMBINATION_XFAIL and requires the clause that names it to fire.\n');
    const bad = await control({});
    if (bad === 2) process.exit(2);
    console.log(bad ? `\ncontrol: FAIL — ${bad} leg(s) did not fire the clause they name`
                    : '\ncontrol: every clause fired on a plant that names it, and the tree is green without them.');
    process.exit(bad ? 1 : 0);
  } else if (argv.includes('--emit')) {
    const { rows, bar } = await verify({ quiet: true, only });
    console.log("/* the cells this tree measures under the bar — copy deliberately, name every mover in the outcome doc */");
    for (const { pair, grid } of rows) {
      for (const c of grid.flat()) {
        if (!(Number.isFinite(c.mm) && c.mm < bar)) continue;
        const was = COMBINATION_XFAIL[c.key];
        console.log(`  ${JSON.stringify(c.key)}: { mm: ${Number(c.mm.toFixed(3))}${was ? `, note: ${JSON.stringify(was.note)}` : ''} },${was && Math.abs(was.mm - c.mm) > COMBINATION_TOLERANCE_MM ? `   // MOVED from ${was.mm}` : ''}`);
      }
    }
    process.exit(0);
  } else {
    const { fails } = await verify({ only });
    process.exit(fails.length ? 1 : 0);
  }
}
