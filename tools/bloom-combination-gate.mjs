/* ===================================================================
   bloom-combination-gate.mjs — TWO CONTROLS AT ONCE (#263, expanded #265)

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

   THREE TIERS, AND THE TIER IS A FIELD THE GATE READS (CG6). TIER 1 is
   a defect measured and CITED on this pair; TIER 2 is a SHARED
   MECHANISM argued from `bloom-geometry.js` rather than from
   plausibility; TIER 3 is a GUESS, said plainly and flagged
   `guess: true` so it can never be read back as evidence. All fifteen
   #263 proposed ship (Eva's ruling, #265), taking the gate to TWENTY: at seconds against a four-hour export gate
   runtime is not the cost, and the recurring cost is DECLARED
   MAGNITUDES — which is proportional to findings, which is what the
   gate is for. The costings and the rejections are in
   docs/bloom-combination-gate.md.

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

   THE CLAUSES, all eight of which the must-fail exercises:
     CG0 THE GRID IS THE SHIPPED RANGE. Every declared value lies inside
         its control's registry range, and each axis's FIRST value IS
         that control's own DEFAULT — which is what makes the
         single-axis columns exist at all, and what makes a moved
         default redden this gate rather than silently re-point it.
     CG1 REACHABILITY. PER AXIS: every control must move the measure by
         more than `COMBINATION_TOLERANCE_MM` somewhere on its pair's
         grid. A pair whose second control is inert satisfies every other
         clause perfectly and tests nothing. An axis DECLARED in
         `COMBINATION_INERT` is CG7's instead — a widening and not a
         loosening, since CG7 pins the number in both directions where
         CG1 only asks for "more than the band".
     CG2 THE BAR, BOTH DIRECTIONS. No cell may come within
         `MIN_FEATURE_MM` except those declared in `COMBINATION_XFAIL`; a
         declared cell that starts CLEARING is the fix landing and fails
         hard, so the entry comes off in the same commit. V5's shape, one
         level up.
     CG3 THE MAGNITUDE (#213). A declared cell must still read its
         recorded millimetres within `COMBINATION_TOLERANCE_MM`, in BOTH
         directions: a record that stops reproducing is stale whether the
         cell got worse or better, and the message says which.
     CG4 WHAT KIND OF PAIR IT IS, AS A THREE-WAY BICONDITIONAL. Each pair
         declares a `verdict`, and the three values PARTITION the
         possibilities so that no pair can be declared in a way that
         cannot fail:
           product-only   every single-axis cell clears AND some interior
                          cell fails — the combination gate's own case,
                          and the reason this is not a second copy of V5;
           single-reaches some single-axis cell fails, i.e. one control
                          reaches the hazard alone (the matrix can see it,
                          and usually V5 already declares it);
           clears         NO cell anywhere comes within the bar.
         `clears` IS WHY THE FIELD IS NOT A BOOLEAN. #263 shipped
         `productOnly: true|false`, and a pair that clears entirely fails
         BOTH arms of a boolean: it has no single-axis failure and no
         interior one. Four of the twenty clear (the expansion's own
         measurement, and all four among the fifteen it bought), so the
         boolean had no true value for them —
         and a measured clear is worth keeping, because CG4's `clears`
         arm is what turns "this pair reaches nothing" into a claim that
         fails loudly the day it stops being true.
     CG5 STRAY DECLARATION. Every key in `COMBINATION_XFAIL` must name a
         cell some pair actually produces. A declaration nothing measures
         is worse than an absence.
     CG6 PROVENANCE. Every pair declares its `tier` and a `cite` naming
         at least one file THAT EXISTS in this tree, and a TIER 3 pair
         declares `guess: true`. A tier written as a comment is a label;
         this project has cleaned that class up four times. The
         file-exists half is the one with teeth: a citation pointing at a
         doc that is not there reads as evidence to the next reader.
     CG7 THE INERT RECORD, BOTH DIRECTIONS. Every axis declared in
         `COMBINATION_INERT` must still move the measure by exactly the
         millimetres its record states, within the band — so an axis that
         STARTS reaching the measure is a red saying "this is a real pair
         now, promote it", and a record that overstates the movement is
         stale. Plus the stray check CG5 makes for the cells. This exists
         because Eva's #265 ruling buys a pair whose second axis this
         gate's own CG1 refuses: the honest form is a measured record
         that fails in both directions, not a quiet exemption.

   ITS FAMILIES ARE NOT IN THE SMOKE CENSUS, and that is the established
   pattern rather than a hole: `tools/bloom-smoke.mjs`'s CLAUSE C reads the
   assertion SITES in `tools/bloom-harness.mjs`, and CG0-CG7 live here, the
   way the wall instrument's V1-V5 and the arc's AS0-AS4 do. What polices
   them instead is `--control`, which must exercise every one.

   RUN:  node tools/bloom-combination-gate.mjs
         node tools/bloom-combination-gate.mjs --only '<regex over pair ids>'
         node tools/bloom-combination-gate.mjs --emit      the entries this tree measures
         node tools/bloom-combination-gate.mjs --control   the must-fail
   =================================================================== */

import { measureInfillWallMm } from './bloom-infill-wall.mjs';
import { measureInfloApproachMm, SEARCH_CAP_MM as INFLO_SEARCH_CAP_MM } from './bloom-inflo-approach.mjs';
import fs from 'node:fs';
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
/* THE INFLORESCENCE'S MEASURES and the words the table prints for each. */
const INFLO_MEASURES = new Map([
  ['floret-floret', `FLORET against every OTHER floret (emitted vertices against emitted triangles, edge crossings read 0, searched to ${INFLO_SEARCH_CAP_MM} mm; the pedicel-to-rachis join inside the rachis's own solid excluded by construction)`],
  ['floret-head', `FLORET against the TERMINAL HEAD (the petals and the hub, [0, hubTriEnd); edge crossings read 0, searched to ${INFLO_SEARCH_CAP_MM} mm)`],
  ['floret-stem', 'FLORET against the FREE RACHIS (freeStemDistanceMm, the geometry\'s own; its own pedicel rod excluded by the builder\'s pedicelAxis, a SESSILE floret excluded whole — its hub IS the join)'],
  ['leaf-floret', `SUBTENDING LEAF against every FLORET, pedicel included (the shared node's own approach; the petiole-to-rachis join excluded; searched to ${INFLO_SEARCH_CAP_MM} mm)`],
  ['leaf-pedicel', `SUBTENDING LEAF against every PEDICEL ROD, its own and the nodes' below (the emitted rods as cylinders; the petiole-to-rachis join excluded; searched to ${INFLO_SEARCH_CAP_MM} mm)`],
]);

export const VERDICTS = Object.freeze(['product-only', 'single-reaches', 'clears']);

/* ------------------------------------------------------------- the pairs */

/* EVERY PAIR DECLARES ITS TIER, WHY IT IS HERE AND WHAT CITES IT (CG6).
   TIER 1 is a defect measured and cited on this very pair; TIER 2 is a
   shared mechanism argued from the source; TIER 3 is a guess and says so
   with `guess: true`. The costings, the verdicts as first measured and
   the REJECTED pairs are in docs/bloom-combination-gate.md.

   EACH AXIS'S FIRST VALUE IS THE CONTROL'S OWN REGISTRY DEFAULT (CG0),
   so the grid CONTAINS its own single-axis columns and the product-only
   claim costs no extra builds.

   THE LADDERS ARE SHARED BETWEEN PAIRS ON PURPOSE. `petalCup` is
   [0, 0.6, 0.9, 1.2] and `petalSpineCurl` [0, 180, 270, 360] wherever
   they appear, so a cell that turns up in two grids is the same state
   read twice and its two records cannot disagree. A rotation in degrees
   is laddered by its own landmarks (half turn, three-quarter turn, the
   slider's own maximum), which is why `petalRoll` is [0, 180, 270, 330]
   and not a set of even fractions — 330 is that slider's maximum and is
   `SELF_XFAIL['roll-max']`'s own state. */
export const PAIRS = [
  /* ------------------------------------------------------------ TIER 1 */
  {
    id: 'cup-x-tipshape',
    tier: 1,
    label: 'petalCup x petalTipShape — the apex, cupped',
    measure: 'self',
    a: { id: 'petalCup', values: [0, 0.6, 0.9, 1.2] },
    b: { id: 'petalTipShape', values: [1.7, 2.5, 3.0] },
    verdict: 'product-only',
    cite: 'docs/bloom-session-32-outcome.md §18a — 1.031 / 1.019 / 0.977 / 0.832 mm at n 1.20 / 2.00 / 2.50 / 3.00 on cup 1.2, reproduced here exactly',
    why: 'the cup lift and the apex taper both act at the tip: the cup brings the two margins toward each other while the superellipse takes the width out from under them',
  },
  {
    id: 'cup-x-curl',
    tier: 1,
    label: 'petalCup x petalSpineCurl — the fiddlehead, cupped',
    measure: 'self',
    a: { id: 'petalCup', values: [0, 0.6, 0.9, 1.2] },
    b: { id: 'petalSpineCurl', values: [0, 180, 270, 360] },
    /* RE-DECLARED BY THE FOOT TARGETS (gate-hygiene session, Oct 6): was 'product-only'. the curl axis's own single cell (petalSpineCurl 360, the other axis at its default) reads 0.676 mm once the foot is a SELF target — the curl-360 census fold, a tip on its own foot, which `self` was blind to by definition while `measureWall` dropped the foot rows. CG4 is what said so. */
    verdict: 'single-reaches',
    cite: "tools/bloom-wall-thickness.mjs already BUILDS this pair's cup 1.2 x curl 180 cell on every run — it is `buckle-on-form`'s own buckle-free control — and reads its wall while throwing its SELF away; the harness declares the census on the same state plus a buckle (`BUCKLE: THE COMPOSITION (cup 1.2 x curl 180)`, 2,078 pairs)",
    why: 'curl bends the spine into a hoop and cup lifts the margins across it; the curl brings distant stations of one blade together and the cup decides how much room is left between them',
  },
  {
    id: 'cup-x-buckle',
    tier: 1,
    label: 'petalCup x buckleAmp — the ruffle over a cup',
    measure: 'self',
    a: { id: 'petalCup', values: [0, 0.6, 0.9, 1.2] },
    b: { id: 'buckleAmp', values: [0, 0.2, 0.4] },
    /* VERDICT RE-DECLARED BY THE APEX NIB: was PRODUCT-ONLY and both of its declared interior cells now CLEAR (1.126 and 1.114 mm against 0.990 and 0.963 on the base tree) — the nib's converging cap replaces the parallel terminal strip the cup and the buckle were closing across. CG4 partitions the three arms so no declaration is unfalsifiable, and it fired on this pair rather than letting the change pass as a magnitude move. */
    verdict: 'clears',
    cite: "SELF_XFAIL['buckle-on-form'] in tools/bloom-wall-thickness.mjs names this pair in its own note (`cup+buckle reads 1.052`) — as a CURVATURE reading; this gate measures the SELF-APPROACH on it for the first time",
    why: "two summands of one normal displacement: `aN` in `sectAt` (bloom-geometry.js) adds the cup's lift and the buckle's wave into the same offset along the same normal",
  },
  {
    id: 'curl-x-buckle',
    tier: 1,
    label: 'petalSpineCurl x buckleAmp — the ruffle on a hoop',
    measure: 'self',
    a: { id: 'petalSpineCurl', values: [0, 180, 270, 360] },
    b: { id: 'buckleAmp', values: [0, 0.2, 0.4] },
    /* RE-DECLARED BY THE FOOT TARGETS (gate-hygiene session, Oct 6): was 'product-only'. the curl axis's own single cell (petalSpineCurl 360, the other axis at its default) reads 0.676 mm once the foot is a SELF target — the curl-360 census fold, a tip on its own foot, which `self` was blind to by definition while `measureWall` dropped the foot rows. CG4 is what said so. */
    verdict: 'single-reaches',
    cite: "SELF_XFAIL['buckle-on-form'] in tools/bloom-wall-thickness.mjs names this pair in its own note (`curl+buckle 1.182`) — as a CURVATURE reading; this gate measures the SELF-APPROACH on it for the first time",
    why: 'the curl closes the blade on itself and the buckle spends the clearance that is left; session 34 measured that the composition has LOWER curvature than the base while the wall collapses, so no curvature bound can see it',
  },
  /* S4 OF THE VORONOI INFILL — THE TWO PAIRS §1 OF THE PORT PLAN NAMED, AND
     BOTH ARE INERT IN THE DENSITY, MEASURED TWO WAYS. The 0.118 mm wall was a
     PRODUCT of cup and curl on the FLAT plan; S2's metric plan made the wall
     a SURFACE length and S3 shipped it that way, so the premise the pairs
     were bought on no longer reaches a wall — and the gate measured that
     rather than declaring it:
       * on `self` (V5's own, through the material mask) the density is
         BIT-IDENTICALLY inert: 1.238 / 1.125 / 1.097 / 1.097 mm at cup 0 /
         0.6 / 0.9 / 1.2 and 1.238 / 1.234 / 1.232 / 1.230 at curl 0 / 180 /
         270 / 360, the same digits at density 8, 16, 24 and 40. `self` is the
         sheet approaching ANOTHER PART of itself, and on a cupped or curled
         blade that approach is at the margins and the tip, in material the
         wall inset keeps the cells out of. So the infill never brings the
         sheet closer to itself than the plain blade does — which is a real
         claim, kept here as COMBINATION_INERT's number failing both ways.
       * on the IN-SHEET WALL between two holes (tools/bloom-infill-wall.mjs,
         the surface read directly) the wall is 1.000000 mm on every flat
         cell to 4e-16 and ABOVE it on every curved one (1.0045 at cup 0.6 x
         curl 180, 1.0159 at cup 1.2 x curl 180, 1.0153 at cup 1.2 x curl
         360), because the plan lays the wall out at INFILL_WALL_MM by
         construction — a bar EQUAL to the design value, which a strict
         comparison turns into a knife edge (0.9999996 reads as a hazard).
         That measure is I11's, with its bound derived from the plan grid,
         and not a combination gate's.
     Every axis's first value is the control's own default (CG0). Verdict
     CLEARS on both: no cell under the bar, and the day one appears the gate
     says so. */
  {
    id: 'density-x-cup',
    tier: 1,
    label: 'infillDensity x petalCup — the cells under a cupped blade',
    measure: 'self',
    base: { petalInfill: 'VORONOI' },
    a: { id: 'infillDensity', values: [20, 8, 24, 40] },
    b: { id: 'petalCup', values: [0, 0.6, 0.9, 1.2] },
    verdict: 'clears',
    cite: 'docs/bloom-infill-port-plan.md §1 and §3 — the wall a flat plan quartered was a product of cup and curl; docs/bloom-infill-s4-outcome.md carries the grid and the two inertness measurements',
    why: 'the cup lifts the margins toward each other and the cells cut the sheet between them into walls; more cells is more walls under the same lift — and measured, the cells never bring the sheet nearer itself than the plain blade',
  },
  {
    id: 'density-x-curl',
    tier: 1,
    label: 'infillDensity x petalSpineCurl — the cells along a curled blade',
    measure: 'self',
    base: { petalInfill: 'VORONOI' },
    a: { id: 'infillDensity', values: [20, 8, 24, 40] },
    b: { id: 'petalSpineCurl', values: [0, 180, 270, 360] },
    /* RE-DECLARED BY THE FOOT TARGETS (gate-hygiene session, Oct 6): was 'clears'. the curl axis's own single cell (petalSpineCurl 360, the other axis at its default) reads 0.676 mm once the foot is a SELF target — the curl-360 census fold, a tip on its own foot, which `self` was blind to by definition while `measureWall` dropped the foot rows. CG4 is what said so. */
    verdict: 'single-reaches',
    cite: 'docs/bloom-infill-port-plan.md §1 and §3 — the wall a flat plan quartered was a product of cup and curl; docs/bloom-infill-s4-outcome.md carries the grid and the two inertness measurements',
    why: 'the curl brings distant stations of one blade together and the cells put walls at every station; the compression along the spine is what S2 measured the plan for — and measured, the cells never bring the sheet nearer itself than the plain blade',
  },
  {
    id: 'leafangle-x-stem',
    tier: 1,
    label: 'leafAngle x stemDiameter — the blade against the stem it hangs off',
    measure: 'leaf-stem',
    base: { stemLength: 70, leafLength: 52, leafWidth: 17, leafNodes: 3 },
    a: { id: 'leafAngle', values: [35, 50, 70, 85] },
    b: { id: 'stemDiameter', values: [6, 3, 12] },
    /* `single-reaches`, AND THAT IS THIS SESSION'S OWN MEASUREMENT RATHER
       THAN AN ADMISSION. Swept over six candidate partners (stemDiameter,
       leafLength, leafWidth, stemLength, leafNodes and leafLength x
       stemDiameter), the SECOND control moves the approach by at most
       0.002 mm: the hazard is `leafAngle`'s ALONE. So item 20 is a
       MEASUREMENT gap and not a combination gap — `LEAVES: the STEEP
       angle (85 deg ...)` is already a matrix row, and what was missing
       is that nothing in the repo measures blade-to-stem approach at
       all. It rides here because this is that instrument, and CG4's
       `single-reaches` arm is where the finding is asserted rather than
       merely written down. */
    verdict: 'single-reaches',
    cite: 'docs/bloom-leaves-outcome.md — 1.853 / 4.356 / 5.492 / 4.910 / 4.019 / 2.804 / 1.853 / 0.824 / 0.289 / 0.000 mm at leafAngle -60..90, reproduced here exactly through an instrument that shares no code with the one that produced it',
    why: "the escape length is `outerR / cos(theta)`, so a steeper angle lays the blade back along the stem; Eva's ruled 35 deg reads 4.019 mm, four times the gap",
  },

  /* ------------------------------------------------------------ TIER 2
     SHARED MECHANISM. `sectAt`'s return in bloom-geometry.js is the
     shared term for most of this tier — roll, cup and the buckle are
     three ADDITIVE SUMMANDS of one normal displacement `aN`, and the
     apex sweep's `kS` MULTIPLIES two of them. Cited by file and function
     rather than by line number, because a line number in a citation goes
     stale silently. */
  {
    id: 'buckle-x-tipshape',
    tier: 2,
    label: 'buckleAmp x petalTipShape — the ruffle into the apex',
    measure: 'self',
    a: { id: 'buckleAmp', values: [0, 0.2, 0.4] },
    b: { id: 'petalTipShape', values: [1.7, 2.5, 3.0] },
    /* VERDICT RE-DECLARED BY THE APEX NIB, then RE-DECLARED AGAIN BY THE APEX ROW RAMP: was PRODUCT-ONLY, then both declared interior cells CLEARED under the nib (1.081 and 1.050 mm against 0.914 and 0.925 on the base tree) — the same mechanism as cup-x-buckle above. The ramp's denser apex mesh above petalTipShape 2.30 moves `measureWall`'s SELF reading back down: three cells now read under the bar (0.951, 0.988, 0.921 mm), none of them declared before the ramp existed. CG4 partitions the three arms so no declaration is unfalsifiable, and it fired on this pair TWICE — once for the nib clearing it, now for the ramp re-opening it — rather than letting either change pass as an untracked magnitude move. */
    verdict: 'product-only',
    cite: 'docs/bloom-combination-gate.md §3 — the mechanism, costed and measured before it shipped; §18a of docs/bloom-session-32-outcome.md is the same argument with the cup in the buckle\'s place',
    why: 'the wave and the apex taper both act where the blade has least width: the buckle spends margin clearance the superellipse has already taken away',
  },
  {
    id: 'buckle-x-apexsweep',
    tier: 2,
    label: 'buckleAmp x petalApexSweep — the ruffle under the sweep',
    measure: 'self',
    a: { id: 'buckleAmp', values: [0, 0.2, 0.4] },
    b: { id: 'petalApexSweep', values: [0, 0.5, 1] },
    verdict: 'clears',
    cite: "bloom-geometry.js — `sectAt`'s `aN` multiplies the buckle's own `bw(v)` by the apex sweep's `kS`, so the two are one term rather than two; docs/bloom-combination-gate.md §3",
    why: 'a multiplied pair is the strongest mechanism argument available here and it measures CLEAR, which is worth knowing: the sweep scales the wave down rather than spending its clearance',
  },
  {
    id: 'roll-x-rolltaper',
    tier: 2,
    label: 'petalRoll x petalRollTaper — one quill, two controls',
    measure: 'self',
    a: { id: 'petalRoll', values: [0, 180, 270, 330] },
    b: { id: 'petalRollTaper', values: [0, 0.5, 1] },
    verdict: 'single-reaches',
    cite: "SELF_XFAIL['roll-max'] in tools/bloom-wall-thickness.mjs declares petalRoll 330 at 0.659 mm — the single this grid re-reads exactly; docs/bloom-combination-gate.md §3",
    why: 'one term and two controls: the taper scales the roll angle along the blade, so every cell is a state of the same quill. Measured, the taper only ever RELIEVES — the worst cell of the grid is the untapered roll',
  },
  {
    id: 'cup-x-apexsweep',
    tier: 2,
    label: 'petalCup x petalApexSweep — the cup under the sweep',
    measure: 'self',
    a: { id: 'petalCup', values: [0, 0.6, 0.9, 1.2] },
    b: { id: 'petalApexSweep', values: [0, 0.5, 1] },
    /* PRODUCT-ONLY -> CLEARS, BY THE FOLD CLAMP (this PR): its two declared cells (cup 0.9 and 1.2 x sweep 1) both clear at 1.120.
       They were 0.998 and 0.967, and both figures reproduce exactly on a worktree of 84e641d.
       No cell of this pair comes within the bar now, which is exactly what `clears` is for —
       #265's own reason for the third arm: a clearing pair earns its builds by failing loudly
       the day it stops clearing. The grid is UNCHANGED: widening it inside the shipped ranges
       to manufacture a failure would be tuning a gate to keep a verdict. */
    verdict: 'clears',
    cite: "bloom-geometry.js — `sectAt`'s `aN` multiplies `cupLift(v)` by the apex sweep's `kS`; docs/bloom-combination-gate.md §3",
    why: 'the sweep concentrates the cup where the blade is narrowest, so the same cup amplitude buys less clearance at the tip',
  },
  {
    id: 'gradient-x-tipshape',
    tier: 2,
    label: 'petalCupGradient x petalTipShape — §18a with the gradient in the cup\'s place',
    measure: 'self',
    a: { id: 'petalCupGradient', values: [0, 0.6, 0.9, 1.2] },
    b: { id: 'petalTipShape', values: [1.7, 2.5, 3.0] },
    verdict: 'product-only',
    cite: 'docs/bloom-session-32-outcome.md §18a is the argument and docs/bloom-combination-gate.md §3 is its transfer: the gradient IS a cup that grows toward the tip, which is exactly where the apex taper acts',
    why: 'session 16 measured the gradient as a distinct deformation (28% RMS off the best-fitting plain cup) and it is the one that loads the tip hardest',
  },
  {
    id: 'gradient-x-curl',
    tier: 2,
    label: 'petalCupGradient x petalSpineCurl — the fiddlehead, tip-loaded',
    measure: 'self',
    a: { id: 'petalCupGradient', values: [0, 0.6, 0.9, 1.2] },
    b: { id: 'petalSpineCurl', values: [0, 180, 270, 360] },
    /* RE-DECLARED BY THE FOOT TARGETS (gate-hygiene session, Oct 6): was 'product-only'. the curl axis's own single cell (petalSpineCurl 360, the other axis at its default) reads 0.676 mm once the foot is a SELF target — the curl-360 census fold, a tip on its own foot, which `self` was blind to by definition while `measureWall` dropped the foot rows. CG4 is what said so. */
    verdict: 'single-reaches',
    cite: "bloom-geometry.js — `cAt(u, r)` is the cup's own coefficient and the gradient lives inside it, so this is `cup-x-curl`'s mechanism with the coefficient varying along the blade; docs/bloom-combination-gate.md §3",
    why: 'the curl brings distant stations of one blade together and the gradient decides how much of the cup is spent at the stations that meet',
  },
  {
    id: 'cup-x-roll',
    tier: 2,
    label: 'petalCup x petalRoll — the cupped quill',
    measure: 'self',
    a: { id: 'petalCup', values: [0, 0.6, 0.9, 1.2] },
    b: { id: 'petalRoll', values: [0, 180, 270, 330] },
    verdict: 'single-reaches',
    cite: "bloom-geometry.js — two summands of `aN` in `sectAt`; SELF_XFAIL['roll-max'] in tools/bloom-wall-thickness.mjs already declares the roll single at 0.659 mm; docs/bloom-combination-gate.md §3",
    why: 'the roll closes the cross-section into a tube and the cup adds a second lift along the same normal, so the two margins meet sooner than either alone brings them',
  },
  {
    id: 'curl-x-twist',
    tier: 2,
    label: 'petalSpineCurl x petalTwist — the hoop, wrung',
    measure: 'self',
    a: { id: 'petalSpineCurl', values: [0, 180, 270, 360] },
    b: { id: 'petalTwist', values: [0, 60, 120, 180] },
    /* RE-DECLARED BY THE FOOT TARGETS (gate-hygiene session, Oct 6): was 'product-only'. the curl axis's own single cell (petalSpineCurl 360, the other axis at its default) reads 0.676 mm once the foot is a SELF target — the curl-360 census fold, a tip on its own foot, which `self` was blind to by definition while `measureWall` dropped the foot rows. CG4 is what said so. */
    verdict: 'single-reaches',
    cite: "bloom-geometry.js — `petalForm`'s own ordering argument: curl builds the centreline and the base frame, and twist rotates THAT frame about the curled length direction, so the twist a blade receives is a function of the curl it already carries; docs/bloom-combination-gate.md §3",
    why: 'the strongest candidate in its tier and the reason it is tier 2 rather than tier 1 is only that no doc cites it: 0.012 mm with both singles clear (twist 180 reads 1.163, curl 360 reads 1.245)',
  },
  {
    id: 'cup-x-gradient',
    tier: 2,
    label: 'petalCup x petalCupGradient — one lift, two controls',
    measure: 'self',
    a: { id: 'petalCup', values: [0, 0.6, 0.9, 1.2] },
    b: { id: 'petalCupGradient', values: [0, 0.6, 0.9, 1.2] },
    /* PRODUCT-ONLY -> CLEARS, BY THE FOLD CLAMP (this PR): all EIGHT of its declared cells clear, every one of them at 1.097.
       The identical reading is the clamp saturating: the cap makes cup 0.6/0.9/1.2 draw the same section near the tip, so the sum rule #265 measured on this pair no longer separates them.
       No cell of this pair comes within the bar now, which is exactly what `clears` is for —
       #265's own reason for the third arm: a clearing pair earns its builds by failing loudly
       the day it stops clearing. The grid is UNCHANGED: widening it inside the shipped ranges
       to manufacture a failure would be tuning a gate to keep a verdict. */
    verdict: 'clears',
    cite: "bloom-geometry.js — `cAt(u, r)` composes the two into ONE cup coefficient, so they are one term and two controls in the strictest sense available here; docs/bloom-combination-gate.md §3",
    why: 'the amplitude and its along-blade ramp compose multiplicatively at the tip, which is where the two margins are nearest to begin with',
  },
  {
    id: 'leafarch-x-angle',
    tier: 2,
    label: 'leafArch x leafAngle — the arched blade against the stem it hangs off',
    measure: 'leaf-stem',
    base: { stemLength: 70, leafLength: 52, leafWidth: 17, leafNodes: 3 },
    a: { id: 'leafArch', values: [0, 90, 180, -90] },
    b: { id: 'leafAngle', values: [35, 0, 60, 85] },
    /* NEW WITH LEAF/STEM BUILD S2. The arch is a uniform turn measured from
       the blade's own start direction. A POSITIVE arch arches the blade OVER
       and down (the carnation's recurve) — away from the stem, so at 35 and
       60 deg it moves this measure by exactly nothing (the near point stays
       the blade's base). A NEGATIVE arch curls the blade UP and inward, and
       at -90 on a leaf already at 60 deg the tip comes round onto the stem
       above its own node: 1.851 mm alone, 0.000 with the arch — a cell no
       single axis reaches. The arch is the first leaf control that moves the
       blade toward the stem from anywhere but its base. Declared at what this
       tree measures; the grid is the shipped range's ends and the ruled
       defaults, nothing tuned. */
    verdict: 'single-reaches',
    cite: "bloom-geometry.js — `leafSurface`'s arc (the petal's own `arcStep` on the leaf's frame, turn = −leafArch); docs/bloom-leaf-emitter-arch-cup-outcome.md carries the grid",
    why: 'the arch turns the blade about its own base, so the tip of a leaf curled UP (negative arch) travels toward the stem it hangs off, and a steeper leaf starts nearer it',
  },

  /* ------------------------------------------------------------ TIER 3
     GUESSES, SAID PLAINLY. No citation on the pair itself and no shared
     term — only "it seems like it might interact". Every one carries
     `guess: true` so CG6 can stop a later session reading it back as
     evidence, and every one is costed in docs/bloom-combination-gate.md
     §4. Three of the six measure CLEAR, which is the honest yield of a
     tier of guesses and is exactly what CG4's `clears` arm records. */
  {
    id: 'leafangle-x-tooth',
    tier: 3,
    guess: true,
    label: 'leafAngle x leafToothDepth — the serrated blade against the stem',
    measure: 'leaf-stem',
    base: { stemLength: 70, leafLength: 52, leafWidth: 17, leafNodes: 3 },
    a: { id: 'leafAngle', values: [35, 50, 70, 85] },
    b: { id: 'leafToothDepth', values: [0.26, 0.6, 1] },
    /* THE TOOTH AXIS IS DECLARED INERT AND CG7 HOLDS IT THERE. The
       serration moves the leaf's own geometry — its emitted vertex
       stream differs at every tooth depth — and moves this measure by
       EXACTLY 0.000e+0 at all four angles, bit-identically, because the
       nearest blade point to the stem is at the blade's BASE and the
       teeth are cut into its MARGIN. So the whole content of this pair
       is that inertness record plus four leafAngle readings that
       `leafangle-x-stem` already gates. It ships because Eva ruled
       tier 3 in full (#265) and because a measured inertness re-read on
       every run is worth more than the same sentence in a doc — but
       CG1 would refuse it, correctly, and the honest form of the
       exemption is COMBINATION_INERT's number failing in both
       directions rather than a quiet carve-out. */
    verdict: 'single-reaches',
    cite: 'docs/bloom-combination-gate.md §4 and §5 — a guess, and the measurement that answers it; docs/bloom-leaves-outcome.md carries the leafAngle readings this grid re-reads',
    why: 'a guess: that a deeper tooth reaches the stem sooner. It does not — the teeth are on the margin and the near point is at the base',
  },
  /* THE LOBED LEAF AGAINST THE STEM (leaf/stem build S4b). S4b's own probe:
     every lobed control MOVES the leaf-stem approach — the envelope width by
     up to 0.11 mm and the lobe angle by 0.07 at a 70-degree leaf, since the
     blade's base row is the envelope's and the chevron leans it along the
     midrib — so CG1 counts a lobed axis as reaching the measure, and the
     brief asks for the pair then. The hazard is leafAngle's own, exactly as
     on the SIMPLE leaf (`leafangle-x-stem`): 70 degrees reads 0.699 mm and
     85 reads 0 whatever the lobes do. The envelope's NARROW end is the
     second axis because it is the worse one (10 mm reads 0.587 at 70). */
  {
    id: 'lobedwidth-x-leafangle',
    tier: 2,
    label: 'leafAngle x lobedWidth — the lobed blade against the stem',
    measure: 'leaf-stem',
    base: { stemLength: 70, leafLength: 46, leafNodes: 3, leafType: 'LOBED' },
    a: { id: 'leafAngle', values: [35, 50, 70, 85] },
    b: { id: 'lobedWidth', values: [34, 10, 40] },
    verdict: 'single-reaches',
    cite: 'docs/bloom-leaf-lobed-rulings-outcome.md (the probe) and docs/bloom-leaf-lobed-outcome.md (the chevron leaf the pair builds)',
    why: 'the lobed envelope sets the blade base nearest the stem; the steep leaf brings it to the stem — the hazard is the angle alone',
  },
  {
    id: 'tipend-x-fringe',
    tier: 3,
    guess: true,
    label: 'petalTipEnd x fringeCount — the carnation fringe on its terminal',
    measure: 'self',
    a: { id: 'petalTipEnd', values: [0, 0.3, 0.6, 1] },
    b: { id: 'fringeCount', values: [0, 3, 6, 10] },
    verdict: 'clears',
    cite: 'docs/bloom-combination-gate.md §4 — a guess, costed and measured; the fringe and its terminal are one feature (CLAUDE.md, the carnation fringe entry) and neither ships alone',
    why: 'a guess: that a dense fringe on a wide terminal brings two teeth together. It does not — the teeth tile the terminal by construction and the measure reads the lamina between them',
  },
  {
    id: 'cup-x-width',
    tier: 3,
    guess: true,
    label: 'petalCup x petalWidth — the cup on a broad blade',
    measure: 'self',
    a: { id: 'petalCup', values: [0, 0.6, 0.9, 1.2] },
    b: { id: 'petalWidth', values: [16, 23, 30] },
    verdict: 'product-only',
    cite: 'docs/bloom-combination-gate.md §4 — a guess that measured as a product-only failure',
    why: "a guess: that a cup of the same amplitude closes further across a wider blade, since the amplitude is a fraction of the half-width and the half-width is what the two margins have to cross",
  },
  {
    id: 'cup-x-thinning',
    tier: 3,
    guess: true,
    label: 'petalCup x tipThinning — the cup on a thinned tip',
    measure: 'self',
    a: { id: 'petalCup', values: [0, 0.6, 0.9, 1.2] },
    b: { id: 'tipThinning', values: [0, 0.4, 0.8] },
    verdict: 'product-only',
    cite: 'docs/bloom-combination-gate.md §4 — a guess that measured as a product-only failure',
    why: 'a guess: that a thinner sheet at the tip leaves the two skins nearer each other exactly where the cup has already brought the margins together',
  },
  {
    id: 'cup-x-length',
    tier: 3,
    guess: true,
    label: 'petalCup x petalLength — the cup on a short blade',
    measure: 'self',
    a: { id: 'petalCup', values: [0, 0.6, 0.9, 1.2] },
    b: { id: 'petalLength', values: [35, 20, 60] },
    /* VERDICT RE-DECLARED BY THE APEX NIB: was CLEARS, and #263's own citation for it predicted this in words: 'measured CLEAR and close: 1.012 mm at cup 1.2 x a 20 mm blade, twelve microns of headroom'. The twelve microns are spent and one interior cell is now under the bar, with neither single reaching it. CG4 partitions the three arms so no declaration is unfalsifiable, and it fired on this pair rather than letting the change pass as a magnitude move. */
    /* PRODUCT-ONLY -> CLEARS, BY THE FOLD CLAMP (this PR): its one declared cell (cup 1.2 x a 20 mm blade) clears at 1.053.
       It was 0.994 — the cell the apex nib itself added, and #263 predicted before that ("twelve microns of headroom"). The clamp gives them back.
       No cell of this pair comes within the bar now, which is exactly what `clears` is for —
       #265's own reason for the third arm: a clearing pair earns its builds by failing loudly
       the day it stops clearing. The grid is UNCHANGED: widening it inside the shipped ranges
       to manufacture a failure would be tuning a gate to keep a verdict. */
    verdict: 'clears',
    cite: 'docs/bloom-combination-gate.md §4 — a guess, measured CLEAR and close: 1.012 mm at cup 1.2 x a 20 mm blade, twelve microns of headroom',
    why: 'a guess: that a short blade cups into a tighter tube. It does, and it stops just above the bar — which is why a measured clear is worth gating rather than dropping',
  },
  {
    id: 'lobedepth-x-curl',
    tier: 3,
    guess: true,
    label: 'lobeDepth x petalSpineCurl — a lobed blade, curled',
    measure: 'self',
    a: { id: 'lobeDepth', values: [0, 0.3, 0.6, 1] },
    b: { id: 'petalSpineCurl', values: [0, 180, 270, 360] },
    /* RE-DECLARED BY THE FOOT TARGETS (gate-hygiene session, Oct 6): was 'clears'. the curl axis's own single cell (petalSpineCurl 360, the other axis at its default) reads 0.676 mm once the foot is a SELF target — the curl-360 census fold, a tip on its own foot, which `self` was blind to by definition while `measureWall` dropped the foot rows. CG4 is what said so. */
    verdict: 'single-reaches',
    cite: 'docs/bloom-combination-gate.md §4 — a guess, and the most expensive one measured: a lobed build costs four times any other candidate in this tier and this grid clears',
    why: 'a guess: that a sinus cut into the margin lets the curl bring two crests together. It does not — the cut removes material from exactly the place the curl would have folded',
  },
  /* ---------------------------------------------- THE INFLORESCENCE (build 2)
     Eva's ruling 1 restated (Oct 3): "the combination grid rebuilt with its
     join exclusions". FOUR MEASURES (tools/bloom-inflo-approach.mjs, whose
     header is the argument) and EIGHT PAIRS, each on the shipped raceme (a
     120 mm rachis, RACEME) unless its `base` says otherwise:
       * THE INTENDED JOINS ARE EXCLUDED BY CONSTRUCTION, NEVER DECLARED AS A
         FAILING MAGNITUDE: a floret is never measured against its own block
         (its pedicel IS its stem — the pair is never formed), the
         pedicel-to-rachis and petiole-to-rachis joins live inside the rachis's
         own solid and are not measured there, a floret's own pedicel rod is
         named out of floret-stem by the builder's `pedicelAxis`, and a SESSILE
         floret is out of floret-stem whole (its hub IS its join).
       * KEPT AT THE NORMAL BAR, as ruled: floret x floret, floret x the
         terminal head, floret x the stem, the leaf x its pedicel (and the
         floret on it), and the GRADIENT and the SESSILE end against the PETAL
         controls that change a floret's own geometry (tilt, cup).
     The tier is 2 — a mechanism argued from the geometry (a floret IS a
     bloom built on its pedicel, so every petal control reaches it; the
     pedicel's length and angle are what put it near anything) — and the
     findings are measured, not guessed. */
  {
    id: 'inflo-gradient-x-angle',
    tier: 2,
    label: 'pedicelGradient x pedicelAngle — graded pedicels, florets against each other',
    measure: 'floret-floret',
    base: { stemLength: 120, inflorescence: 'RACEME' },
    a: { id: 'pedicelGradient', values: [1, 0, 2, 3] },
    b: { id: 'pedicelAngle', values: [35, 0, 60] },
    verdict: 'single-reaches',
    cite: 'docs/bloom-inflorescence-node-laws-outcome.md and tools/bloom-inflo-approach.mjs — the gradient changes how far each floret stands out along its pedicel, the angle how far above its node; the two decide which neighbours a floret reaches',
    why: 'a longer lower pedicel carries its floret up and out toward the node above, and the angle sets how much of that length is rise',
  },
  {
    id: 'inflo-gradient-x-tilt',
    tier: 2,
    label: 'pedicelGradient x petalTilt — graded pedicels under open florets',
    measure: 'floret-floret',
    base: { stemLength: 120, inflorescence: 'RACEME' },
    a: { id: 'pedicelGradient', values: [1, 0, 3] },
    b: { id: 'petalTilt', values: [25, 60, 90] },
    verdict: 'single-reaches',
    cite: 'docs/bloom-inflorescence-node-laws-outcome.md — every floret inherits the head\'s petal controls (ruling 10), so petalTilt opens every floret at once',
    why: 'the tilt sets how far a floret\'s petals reach back down its own pedicel and so toward the floret below',
  },
  {
    id: 'inflo-length-x-angle',
    tier: 2,
    label: 'pedicelLength x pedicelAngle — the top floret against the terminal head',
    measure: 'floret-head',
    base: { stemLength: 120, inflorescence: 'RACEME' },
    a: { id: 'pedicelLength', values: [20, 0, 5, 60] },
    b: { id: 'pedicelAngle', values: [35, 0, 60, 90] },
    /* CLEARS since build 3 (the reach inset, #355): every one of this pair's
       seven declared cells — the shipped raceme's own among them — now reads
       4.0 to 8.3 mm, because the top node is set from the floret's own petal
       reach rather than the pedicel's rise. The pair is KEPT at `clears` so the
       day a top floret touches the head again this grid says so. */
    verdict: 'clears',
    cite: 'docs/bloom-inflorescence-node-laws-outcome.md — the top inset clears the PEDICEL\'s rise (`insetSatisfied`) and not the FLORET\'s own petals, which this measures',
    why: 'the inset is derived from the pedicel\'s rise alone, so a floret whose petals reach further than its pedicel rises can still stand among the head\'s petals',
  },
  {
    id: 'inflo-length-x-tilt',
    tier: 2,
    label: 'pedicelLength x petalTilt — a floret\'s petals against its own rachis',
    measure: 'floret-stem',
    base: { stemLength: 120, inflorescence: 'RACEME' },
    /* 250 is build 3's new ceiling (Eva, Oct 4) — the long-pedicel-against-stem
       column the brief asked for; its floret stands one node down a rachis it
       out-reaches, at the far end of a 250 mm rod. */
    a: { id: 'pedicelLength', values: [20, 5, 60, 250] },
    b: { id: 'petalTilt', values: [25, 60, 90, 120] },
    verdict: 'single-reaches',
    cite: 'docs/bloom-inflorescence-node-laws-outcome.md — the builder already flags the floret against the rachis on every raceme (rachisApproachMm); this holds it to the bar on a grid',
    why: 'a short pedicel stands a floret beside its rachis, and a steep petal tilt folds its petals back toward it',
  },
  {
    id: 'inflo-scale-x-angle',
    tier: 2,
    label: 'floretScale x pedicelAngle — floret size against the rachis',
    measure: 'floret-stem',
    base: { stemLength: 120, inflorescence: 'RACEME' },
    a: { id: 'floretScale', values: [0.6, 0.2, 1] },
    b: { id: 'pedicelAngle', values: [35, -60, 0, 60, 90] },
    verdict: 'single-reaches',
    cite: 'docs/bloom-inflorescence-outcome.md — the floret-against-rachis approach swept over pedicelAngle there (0.8234 mm at 35 deg on a sphere, 8.2475 on a cap)',
    why: 'a bigger floret reaches further from its pedicel; the angle swings that reach toward or away from the rachis',
  },
  /* `petalCup` WAS TRIED FIRST AND CG1 REFUSED IT, measured: the nearest
     approach between two florets is between their OPEN petals' tips and the
     cup moves it by 2.3e-4 mm across 0..1.2 — under the band. The tilt is the
     petal control that reaches this measure. */
  {
    id: 'inflo-length-x-tilt-ff',
    tier: 2,
    label: 'pedicelLength x petalTilt — the sessile end under open florets',
    measure: 'floret-floret',
    base: { stemLength: 120, inflorescence: 'RACEME' },
    a: { id: 'pedicelLength', values: [20, 0, 60] },
    b: { id: 'petalTilt', values: [25, 60, 90] },
    /* CLEARS since build 3's ruling 1 (the florets' own internode floor):
       all four declared cells — the shipped default's 0.676, the spike's
       0.000 and both 60 mm cells — read 1.858 to 15.000 mm now. KEPT at
       `clears` so the day the sessile end crowds its neighbours again this
       grid says so. */
    verdict: 'clears',
    cite: 'docs/bloom-inflorescence-node-laws-outcome.md — a sessile floret sits ON its node, so florets one pitch apart are as close as the node law ever puts them',
    why: 'the sessile end brings every floret to its own node; the tilt sets how far its petals reach toward a neighbour',
  },
  {
    id: 'inflo-leafangle-x-pedicelangle',
    tier: 2,
    label: 'leafAngle x pedicelAngle — the subtending leaf against its pedicel and floret',
    measure: 'leaf-floret',
    /* A 15 mm LEAF, about the pedicel's own length: a longer leaf runs its
       blade through the floret its pedicel carries at every angle measured
       (40 mm reads 0.000 on eight of nine cells), which is a finding about
       leaf length and not about the two angles this pair is for. */
    base: { stemLength: 120, inflorescence: 'RACEME', leafLength: 15 },
    a: { id: 'leafAngle', values: [35, 0, 60] },
    b: { id: 'pedicelAngle', values: [35, 0, 60] },
    verdict: 'single-reaches',
    cite: 'docs/bloom-inflorescence-node-laws-outcome.md — the shared node seats the leaf by the STEEPER rod\'s cosine, exact for parallel rods and conservative otherwise; this measures what happens past the wall',
    why: 'a leaf steeper than its pedicel rises toward it; one shallower diverges; parallel ones hold their seated offset along the whole of the shorter rod',
  },
  {
    id: 'inflo-leaf-nodes-x-leafangle',
    tier: 2,
    label: 'floretNodes x leafAngle on a short rachis — the subtending leaf against the node BELOW it',
    measure: 'leaf-pedicel',
    /* THE OTHER SIDE OF THE SHARED NODE (Eva's change 1: "the leaf must still
       clear the node below it at the tightest reachable internode and at the
       pitch floor"). Build 2 set this on a 52 mm rachis, where 12 nodes gave
       the tightest internode the node law then reached (3.023 mm against the
       3.000 mm pitch floor). THE REACH INSET (build 3) MADE THAT BASE INERT:
       the top node now sits 33.9 mm down ANY rachis, so on 52 mm the span left
       is 10.8 mm and both 5 and 12 asked collapse to the SAME four nodes at the
       pitch floor — CG1 refused the axis, correctly, at 0.000e+0 of movement.
       Moved to the shipped 120 mm rachis, where 5 nodes sit 17.3 mm apart and
       12 sit 6.3 mm apart (the tightest internode the law reaches on it now);
       a grid change inside the shipped ranges that RESTORES the axis rather
       than one that manufactures a failing cell — both counts' cells are
       measured below. A 15 mm leaf, this pair's sibling's own length. */
    base: { stemLength: 120, inflorescence: 'RACEME', leafLength: 15 },
    a: { id: 'floretNodes', values: [5, 12] },
    b: { id: 'leafAngle', values: [35, 0] },
    /* Build 3 Phase A read PRODUCT-ONLY here (12 nodes x a level leaf put the
       leaf through the pedicel two nodes below). RULING 1 TOOK THE NODE AXIS
       AWAY: the florets' own floor (17.97 mm) holds 5 nodes on the 82 mm the
       reach inset leaves of a 120 mm rachis, so 12 asked collapses to the SAME
       five nodes as 5 asked and the axis moves the measure by exactly 0 —
       declared in COMBINATION_INERT with the number, the `leafToothDepth`
       shape, so the day the floor (or the ceiling) lets a sixth node in, the
       pair says the axis has come back. Both remaining cells clear (1.000 at
       35 deg — the shared node's own derived offset, AT the bar by design —
       and 3.045 level), so the verdict is CLEARS. */
    verdict: 'clears',
    cite: 'docs/bloom-inflorescence-node-laws-outcome.md — the shared node seats each leaf a derived offset below ITS OWN pedicel and nothing in that law reads the node below; the pitch floor is two pedicel radii, set for the pedicels against each other',
    why: 'two nodes down on the same azimuth (alternate and opposite repeat every second node) the leaf stands only twice the internode less its own offset above that pedicel, and a level leaf runs straight over it',
  },
  {
    id: 'inflo-corymb-angle-x-length',
    tier: 2,
    label: 'pedicelAngle x pedicelLength under the CORYMB — level-topped heads against each other',
    measure: 'floret-floret',
    /* THREE NODES ON A 60 mm RACHIS: five on 40 mm read 0.000 on every cell
       (the level heads overlap at every setting), which reaches nothing CG1
       can tell apart. */
    base: { stemLength: 60, inflorescence: 'RACEME', pedicelCorymb: 'ON', floretNodes: 3 },
    a: { id: 'pedicelAngle', values: [35, 10, 60] },
    b: { id: 'pedicelLength', values: [20, 0, 40] },
    /* PRODUCT-ONLY since build 3's ruling 1: the floor clears every
       single-axis cell (15.000 mm at the defaults) and eight of the nine; the
       one left is the INTERIOR sessile cell at 60 deg, 0.2144 mm. */
    verdict: 'product-only',
    cite: 'docs/bloom-inflorescence-node-laws-outcome.md — the corymb solve lands every head on one level, so the heads stand side by side at one height',
    why: 'level tops put every head in one plane; a shallow angle spreads them far apart in length and a steep one stacks them close',
  },

  /* ------------------------------------------- THE SEPALS (R6, Oct 9)
     Eva's ruling R6 (docs/bloom-sepal-discovery.md §6): the sepal is measured
     by nothing on `self` until these rows. A sepal is the petal builder on a
     second ring with its own twins, so the petal's own tier-1 mechanisms apply
     to it unchanged — which is the TIER 2 argument (a shared mechanism argued
     from the source), not a cited sepal defect. Measured on `sepal-self`: the
     same `measureWall(grid).self`, read on EVERY sepal the builder emitted
     (`built.sepals.built`), the smallest. The base set is the defaults bar's
     shipped whorl (`sepalCount` 5); every axis starts at the twin's own
     registry default (CG0). The ladders are the petal pairs' own, so a sepal
     cell can be set beside the petal cell for the same numbers. */
  {
    id: 'sepalcup-x-sepalcurl',
    tier: 2,
    label: 'sepalCup x sepalSpineCurl — the sepal fiddlehead, cupped',
    measure: 'sepal-self',
    base: { sepalCount: 5 },
    a: { id: 'sepalCup', values: [0, 0.6, 0.9, 1.2] },
    b: { id: 'sepalSpineCurl', values: [0, 180, 270, 360] },
    verdict: 'product-only',
    cite: "bloom-geometry.js — `sepalBladeState` maps the sepal twins onto the petal law (`SEPAL_TWINS`), so `cup-x-curl`'s mechanism is the sepal's; docs/bloom-sepal-discovery.md §1.7 and §6 (R6)",
    why: 'the petal pair `cup-x-curl` on the sepal\'s shorter blade (0.60 of the petal): the curl brings distant stations together and the cup decides the room left between them',
  },
  {
    id: 'sepalcup-x-sepalroll',
    tier: 2,
    label: 'sepalCup x sepalRoll — the sepal quill, cupped',
    measure: 'sepal-self',
    base: { sepalCount: 5 },
    a: { id: 'sepalCup', values: [0, 0.6, 0.9, 1.2] },
    /* THE ROLL LADDER STOPS AT THE SEPAL'S OWN MAXIMUM (Eva's §9.1, Oct 9):
       180, `SEPAL_TWIN_BOUNDS`. It was the petal's [0, 180, 270, 330]; 270 and
       330 are no longer reachable on a sepal, and at 180 roll ALONE clears
       (1.128 mm), so the verdict moves single-reaches -> product-only. */
    b: { id: 'sepalRoll', values: [0, 60, 120, 180] },
    verdict: 'product-only',
    cite: "bloom-geometry.js — `sepalBladeState` and `SEPAL_TWINS` (the petal's `cup-x-roll` mechanism on the sepal ring) and `SEPAL_TWIN_BOUNDS` (the sepal roll is -180..180, where roll alone clears); docs/bloom-sepal-discovery.md §6 (R6) and §10 (the narrowing)",
    why: 'two cross-width deformations of one section: the roll curls the width into a quill and the cup lifts the margins of what is left',
  },
  {
    id: 'sepalcurl-x-sepaltwist',
    tier: 2,
    label: 'sepalSpineCurl x sepalTwist — the sepal hoop, wrung',
    measure: 'sepal-self',
    base: { sepalCount: 5 },
    a: { id: 'sepalSpineCurl', values: [0, 180, 270, 360] },
    b: { id: 'sepalTwist', values: [0, 60, 120, 180] },
    verdict: 'product-only',
    cite: "bloom-geometry.js — `petalForm`'s ordering (twist rotates the curled frame), reached by the sepal through `sepalBladeState`; the petal pair `curl-x-twist`; docs/bloom-sepal-discovery.md §6 (R6)",
    why: 'the twist a blade receives is a function of the curl it already carries; the sepal\'s twist 180 alone clears the bar by 0.005 mm on the wall instrument',
  },
  {
    id: 'sepalscale-x-sepalcurl',
    tier: 2,
    label: 'sepalScale x sepalSpineCurl — the hoop on a shorter sepal',
    measure: 'sepal-self',
    base: { sepalCount: 5 },
    a: { id: 'sepalScale', values: [0.6, 0.2, 0.4, 1] },
    b: { id: 'sepalSpineCurl', values: [0, 180, 270, 360] },
    verdict: 'product-only',
    cite: "bloom-geometry.js — the whorl's `slot.scale = sepalScale` shortens the blade while the sheet thickness and the spine curvature floor stay in millimetres; docs/bloom-sepal-discovery.md §7.1 and §6 (R6)",
    why: 'a full turn on a shorter blade is a tighter hoop against the same sheet, so the size the sepal ships at decides how much curl it can carry',
  },
];

/* ------------------------------------------------------------- the triples */

/* THREE CONTROLS AT ONCE (Eva's ruling on form variance, build 2 —
   docs/bloom-organic-variance-form-outcome.md §13). The pairs-only shortlist
   cannot see a hazard that lives in the product of THREE settings, and the
   matrix varies one control at a time so it cannot either — which is how a
   fold reachable from three sliders on `main` (curl 270 x cup 1 x twist 180:
   one petal 0.076 mm from itself, 86 census pairs a petal) went undeclared
   until form variance put all three on one petal.

   EXTREMES ONLY, NOT A THREE-DIMENSIONAL LADDER: each axis is the control's
   own DEFAULT (CG0, so every face of the box is a pair grid's single-axis
   column or a pair cell already measured) and its slider MAXIMUM — and, on
   curl and cup ONLY, the one interior value the form field's own reach puts a
   petal at from the shipped default (curl +270, cup +1.0 at amount 1; the
   twist reach IS its maximum, 180). That is 3 x 3 x 2 = 18 cells. The minima
   were measured and are NOT carried: every cell with curl -180 or cup -0.8
   reads higher than the same cell at the maximum, and twist -180 reads within
   0.01 mm of +180 (a mirror twist), so they would cost builds to re-read
   states no nearer the bar.

   A CELL KEY IS `<id> @ <a>=<va> x <b>=<vb> x <c>=<vc>`, and the magnitudes
   live in COMBINATION_XFAIL beside the pairs' — one list, one discipline. */
export const TRIPLE_VERDICTS = Object.freeze(['triple-only', 'pair-reaches', 'clears']);
export const TRIPLES = [
  {
    id: 'curl-x-cup-x-twist',
    tier: 1,
    label: 'petalSpineCurl x petalCup x petalTwist — the three form variance moves together',
    measure: 'self',
    axes: [
      { id: 'petalSpineCurl', values: [0, 270, 360] },
      { id: 'petalCup', values: [0, 1, 1.2] },
      { id: 'petalTwist', values: [0, 180] },
    ],
    /* PAIR-REACHES, and that is the honest verdict rather than the hoped-for
       one: two of the three faces (cup-x-curl, curl-x-twist) already fail at
       these values and are declared on their own pairs. What the triple adds
       is the INTERIOR cell at the field's own reach, which reads under every
       face at the same values — printed per run as what the third control
       costs, never a bar. */
    verdict: 'pair-reaches',
    cite: 'docs/bloom-organic-variance-form-outcome.md §4 — the single-g form field put curl 270, cup 1 and twist 180 on one petal: 0.076 mm self-approach, 86 within-shell census pairs a petal at 0.8771 mm worst span, the same fold the three sliders reach together (688 = 8 x 86)',
    why: "curl bends the spine into a hoop, cup lifts the margins across it and twist wrings the frame the cup is lifted in — `petalForm`'s own ordering composes all three on one blade, and every pair of them is already a declared hazard",
  },
  /* THE FOUR TRIPLES EVA BOUGHT FROM THE SHORTLIST (the headroom PR —
     docs/bloom-organic-variance-form-outcome.md §21), against the SETTLED
     law. Under headroom scaling the field's reach from the shipped default is
     +270 / -180 on curl, +1.0 / -0.8 on cup and +/-180 on twist — so on the
     FORM axes the minima ARE the field's downward reach, and they were
     measured on a probe grid rather than assumed: a minimum is CARRIED only
     where some cell with it reads worse than the same cell at the maximum AND
     under the bar (a minimum that only ever reads clear, or only ever reads
     better than its maximum, costs builds to re-read states no nearer the
     bar), iterated to a fixed point because dropping one axis's minimum can
     remove the only cell another axis's minimum was worse at. The probe
     tables are in §21. */
  {
    id: 'cup-x-roll-x-curl',
    tier: 2,
    label: 'petalCup x petalRoll x petalSpineCurl — the cupped quill, bent into a hoop',
    measure: 'self',
    axes: [
      /* EVERY MINIMUM CARRIED: cup -0.8 x roll 330 reads 0.012 against cup
         1.2's 0.107; roll -330 x cup 1 reads 0.0003 against +330's 0.041;
         curl -180 x roll -330 reads 0.901 against curl 360's 1.176. */
      { id: 'petalCup', values: [0, -0.8, 1, 1.2] },
      { id: 'petalRoll', values: [0, -330, 330] },
      { id: 'petalSpineCurl', values: [0, -180, 270, 360] },
    ],
    verdict: 'pair-reaches',
    cite: 'docs/bloom-organic-variance-form-outcome.md §17 — the shortlist: roll closes the cross-section into a tube, cup lifts its margins, and curl bends the tube into a hoop along the spine; cup-x-roll is a declared pair',
    why: 'the most obvious third on the shortlist: every face it adds is the curl, and the curl brings distant stations of the quill together',
  },
  {
    id: 'curl-x-twist-x-roll',
    tier: 2,
    label: 'petalSpineCurl x petalTwist x petalRoll — the hoop, wrung, with its section rolled',
    measure: 'self',
    axes: [
      /* curl -180 and roll -330 DROPPED at the fixed point (the only cell
         curl -180 was worse at is roll -330, which never reads worse than
         +330); twist -180 CARRIED — 0.587 against +180's 0.610 at curl 270 x
         roll 330, both under the bar. */
      { id: 'petalSpineCurl', values: [0, 270, 360] },
      { id: 'petalTwist', values: [0, -180, 180] },
      { id: 'petalRoll', values: [0, 330] },
    ],
    verdict: 'pair-reaches',
    cite: 'docs/bloom-organic-variance-form-outcome.md §17 — the shortlist: roll acts in the cross-section twist wrings, on the blade curl has already bent; curl-x-twist is a declared pair',
    why: 'the second third for curl x twist beside cup (the tier-1 triple): the roll is the other operation in the cross-section',
  },
  {
    id: 'cup-x-tipshape-x-width',
    tier: 2,
    label: 'petalCup x petalTipShape x petalWidth — the cup across a broad, held tip',
    measure: 'self',
    axes: [
      /* EVERY MINIMUM DROPPED: cup -0.8, tip shape 0.60 and width 8 each read
         worse than their maximum somewhere, but never under the bar there. */
      { id: 'petalCup', values: [0, 1, 1.2] },
      { id: 'petalTipShape', values: [1.7, 3] },
      { id: 'petalWidth', values: [16, 30] },
    ],
    verdict: 'pair-reaches',
    /* WIDTH, NOT TIP THINNING — both are declared PRODUCT-ONLY with cup, and
       width is the one that acts on the SAME quantity the other two do: the
       cup's amplitude is a fraction of the half-width, the tip shape decides
       how long the half-width is HELD toward the tip, and the width scales it
       — three controls composing through one variable, which is what a triple
       hazard is. Tip thinning acts on the sheet's THICKNESS, orthogonal to
       that, and in EXPORT it saturates at the 1.00 mm floor by 0.4, so half of
       its axis would be dead travel (#265's own cup-x-thinning note). */
    cite: 'docs/bloom-organic-variance-form-outcome.md §17 — the shortlist: cup x tip shape x width is two product-only pairs (cup-x-width, cup-x-tipshape) sharing a control and a region',
    why: 'the tip shape holds the half-width toward the tip, the width scales it, and the cup is a fraction of it — so all three write the distance the two margins have to cross',
  },
  {
    id: 'layers-x-curl-x-innercurl',
    tier: 1,
    label: 'layerCount x petalSpineCurl x innerCurl — the composed base state; its fold is guarded by matrix row block 44, NOT by this cell',
    /* `self-every`, NOT `self`: `innerCurl` never reaches ring 0, so on the
       representative petal it would be inert by construction (see
       measureState). */
    measure: 'self-every',
    axes: [
      /* The DEFAULT (CG0), the slider MAXIMUM, the field's reach on curl
         (+270 from the shipped default), and the composed state's own values
         (3 whorls, curl 180) — the one candidate with a measured fold behind
         it, so it is measured rather than bracketed. EVERY MINIMUM DROPPED:
         on the 45-cell probe no cell of this grid comes within the bar, so no
         minimum can read worse there. */
      { id: 'layerCount', values: [1, 3, 6] },
      { id: 'petalSpineCurl', values: [0, 180, 270, 360] },
      { id: 'innerCurl', values: [0, 360] },
    ],
    /* THIS TRIPLE COULD NOT SEE THE COMPOSED STATE'S FOLD, AND NOW IT CAN
       (Eva's ruling on the headroom follow-up, docs/bloom-organic-variance-form-
       outcome.md §22; the foot made a target by the gate-hygiene session, Oct 6,
       docs/bloom-gate-hygiene-outcome.md). The census reads 1,968 within-shell
       pairs / 0.4218 mm on 3 whorls x curl 180 x innerCurl 360, every pair inside
       ONE inner-whorl petal, its tip (u 0.7-1.0) coiling back into ITS OWN FOOT.
       `measureWall` used to drop the foot rows (`r.row >= footRows`), so
       `self-every` read a CLEARING 1.222 mm there — blind BY DEFINITION, the fifth
       durable rule. The foot is a SELF target now, and the same cell reads
       0.199 mm at u 0.856: declared, held both ways by CG2/CG3, and the verdict
       moved clears -> pair-reaches because the curl-360 single reaches the bar on
       its own (0.676). Block 44 (`COMPOSED: 3 whorls x curl 180 x innerCurl 360`)
       is KEPT and still guards the census pair count through X1 in the export
       gate; whether it is redundant now is Eva's to rule. Still declared
       blindness: `self` is the two-skin MODEL's approach, never a fold depth or a
       pair count, so this cell says "a tip comes within 0.199 mm of its own foot"
       and X1 says "and it passes through it 1,968 times". */
    /* RE-DECLARED BY THE FOOT TARGETS (gate-hygiene session, Oct 6): was 'clears'. a SINGLE-axis cell (layerCount 1 x petalSpineCurl 360 x innerCurl 0) reads 0.676 mm and the composed state's own cell 0.199 once the foot is a SELF target — the class this triple was declared blind to is visible now. CG4 is what said so. */
    verdict: 'pair-reaches',
    cite: 'docs/bloom-organic-variance-form-outcome.md §17 and §22 — the composed base state folds at 1,968 pairs / 0.4218 mm with NO field; §22 attributes every pair to a petal\'s tip in its own foot, which `self` excludes, and names block 44 as the guard',
    why: 'a role row composes curl 180 + innerCurl 360 to 540 on every inner whorl and the clamp puts it at 360 — the declared curl-360 fold on two whorls of three, a state the matrix cannot see because it varies one control at a time',
  },
];
export const tripleKey = (t, vals) => `${t.id} @ ${t.axes.map((ax, i) => `${ax.id}=${num(vals[i])}`).join(' x ')}`;

/* ------------------------------------------------------- the declarations */

/* A CELL KEY IS `<pair id> @ <a>=<va> x <b>=<vb>`, built by `cellKey`
   below so the list and the run cannot format it two ways.

   EVERY ENTRY CARRIES ITS MAGNITUDE AS A NUMBER THE GATE READS (#213).
   The module REFUSES TO LOAD on an entry without one: a declaration with
   no number is a label, and this project has cleaned that up four times. */
export const COMBINATION_XFAIL = Object.freeze({
  /* ================================================== TIER 1 (#263) */

  /* ===== FIVE CELLS THE APEX NIB TAKES UNDER THE BAR, EVERY ONE OF THEM
     WITHIN 0.026 mm OF IT ON THE BASE TREE. They are not a new hazard: they
     are the §18a family reaching one step further down the cup column,
     because the nib replaces the blade's parallel terminal strip with a
     converging cap and the two margins come together sooner. Each carries
     the base tree's own reading beside this tree's, measured through
     `--root <worktree>` — which had to be FIXED to measure anything at all
     (the CLI never parsed it; see the flag's own comment). */
  // 'cup-x-tipshape @ petalCup=0.6 x petalTipShape=2.5' and
  // 'gradient-x-tipshape @ petalCupGradient=0.6 x petalTipShape=2.5' REMOVED
  // BY THE APEX ROW RAMP: both cleared (1.004 mm and 1.005 mm respectively,
  // measured on this PR's own tree, Node 22) — the ramp's denser apex mesh
  // near petalTipShape 2.30-2.70 moves `measureWall`'s SELF reading for
  // exactly the reason recorded on the surviving cells of these two pairs
  // (a finer sampling near the tip changes the discrete self-approach
  // figure it reports). Both were previously declared at 0.988 mm and
  // 0.991 mm (the fold-clamp figures). #213: a declared cell that starts
  // clearing is removed in the same commit that moved it, never left
  // standing on a stale magnitude.
  'cup-x-thinning @ petalCup=0.6 x tipThinning=0.4': { mm: 0.947, note: "NEW WITH THE APEX NIB: 1.023 mm on a worktree of 2464d50, 0.960 here. The same cup column one step down, on the thinned tip rather than the tip shape. — RE-RECORDED BY THE FOLD CLAMP: was 0.96 mm. The fold clamp is the mover and it is the ONLY one: every figure above reproduces EXACTLY on a worktree of 84e641d, the commit before the clamp's first owner. `cupScale` holds the section's curvature across the nib at the value it already had at the entry, and the cap `|c| <= hb / (FOLD_CLAMP_MARGIN * t)` binds on the converging stretch BELOW the nib too — which the wall instrument's `nibFromU` exclusion does not exclude — so the rows just under the entry take a different normal (`trueNormalRows` crosses against its NEIGHBOURS). Measured on the merged tree, Node 22." },
  'cup-x-thinning @ petalCup=0.6 x tipThinning=0.8': { mm: 0.947, note: "NEW WITH THE APEX NIB: 1.023 mm on a worktree of 2464d50, 0.960 here. Identical to the 0.4 cell because tipThinning SATURATES against the export print floor above 0.4 — #265's own note, unchanged by the nib. — RE-RECORDED BY THE FOLD CLAMP: was 0.96 mm. The fold clamp is the mover and it is the ONLY one: every figure above reproduces EXACTLY on a worktree of 84e641d, the commit before the clamp's first owner. `cupScale` holds the section's curvature across the nib at the value it already had at the entry, and the cap `|c| <= hb / (FOLD_CLAMP_MARGIN * t)` binds on the converging stretch BELOW the nib too — which the wall instrument's `nibFromU` exclusion does not exclude — so the rows just under the entry take a different normal (`trueNormalRows` crosses against its NEIGHBOURS). Measured on the merged tree, Node 22." },
  /* REMOVED BY THE FOLD CLAMP (1 cell of cup-x-length): 'petalCup=1.2 x petalLength=20' was declared at 0.994 and now clears at 1.053.
     The clamp RELIEVES the cup at the tip, which is what it is for, and CG2 fails hard on a
     declared hazard that starts passing rather than letting it pass silently — that is what
     reported these. Pre-clamp figures reproduce exactly on a worktree of 84e641d. */


  /* THE §18a CELLS, AND THREE THE DOC DID NOT HAVE. §18a measured the
     hazard at `petalCup` 1.2 alone; the grid shows it reaching DOWN to
     cup 0.6 at the ceiling tip shape Eva ruled reachable. The shipped
     `petalTipShape` is 1.70, so the cup column at 1.70 IS "cup alone",
     clears at 1.031, and is also the bell/corolla question 5's own
     number. */
  'cup-x-tipshape @ petalCup=0.6 x petalTipShape=3': { mm: 0.922, note: "NEW — the §18a hazard is not confined to cup 1.2. Measured 2026-09-19 on 937263a; cup 0.6 alone reads 1.178 and n 3.00 alone 1.203, both clear. — RE-RECORDED BY THE APEX NIB: was 0.929 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE FOLD CLAMP: was 0.89 mm. The fold clamp is the mover and it is the ONLY one: every figure above reproduces EXACTLY on a worktree of 84e641d, the commit before the clamp's first owner. `cupScale` holds the section's curvature across the nib at the value it already had at the entry, and the cap `|c| <= hb / (FOLD_CLAMP_MARGIN * t)` binds on the converging stretch BELOW the nib too — which the wall instrument's `nibFromU` exclusion does not exclude — so the rows just under the entry take a different normal (`trueNormalRows` crosses against its NEIGHBOURS). Measured on the merged tree, Node 22. — RE-RECORDED BY THE APEX ROW RAMP: was 0.912 mm. The ramp raises the blade's row count (NU) above petalTipShape 2.30, budget-permitting, so every cell in this pair's n=2.5/3.0 columns is measured on a DENSER apex mesh than before; `measureWall`'s SELF reading is taken from the emitted rows, so a finer sampling near the tip changes the discrete self-approach figure it reports. Every cell in this pair and in gradient-x-tipshape moved the same direction (more clearance), consistent with one mechanism. Measured on this PR's own tree, Node 22." },
  'cup-x-tipshape @ petalCup=0.9 x petalTipShape=2.5': { mm: 0.921, note: "NEW, and the shallowest failing cell in the gate. Measured 2026-09-19 on 937263a. — RE-RECORDED BY THE APEX NIB: was 0.988 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE FOLD CLAMP: was 0.901 mm. The fold clamp is the mover and it is the ONLY one: every figure above reproduces EXACTLY on a worktree of 84e641d, the commit before the clamp's first owner. `cupScale` holds the section's curvature across the nib at the value it already had at the entry, and the cap `|c| <= hb / (FOLD_CLAMP_MARGIN * t)` binds on the converging stretch BELOW the nib too — which the wall instrument's `nibFromU` exclusion does not exclude — so the rows just under the entry take a different normal (`trueNormalRows` crosses against its NEIGHBOURS). Measured on the merged tree, Node 22. — RE-RECORDED BY THE APEX ROW RAMP: was 0.896 mm. The ramp raises the blade's row count (NU) above petalTipShape 2.30, budget-permitting, so every cell in this pair's n=2.5/3.0 columns is measured on a DENSER apex mesh than before; `measureWall`'s SELF reading is taken from the emitted rows, so a finer sampling near the tip changes the discrete self-approach figure it reports. Every cell in this pair and in gradient-x-tipshape moved the same direction (more clearance), consistent with one mechanism. Measured on this PR's own tree, Node 22." },
  'cup-x-tipshape @ petalCup=0.9 x petalTipShape=3': { mm: 0.816, note: 'NEW. Measured 2026-09-19 on 937263a. — RE-RECORDED BY THE APEX NIB: was 0.854 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE APEX ROW RAMP: was 0.801 mm. The ramp raises the blade\'s row count (NU) above petalTipShape 2.30, budget-permitting, so every cell in this pair\'s n=2.5/3.0 columns is measured on a DENSER apex mesh than before; `measureWall`\'s SELF reading is taken from the emitted rows, so a finer sampling near the tip changes the discrete self-approach figure it reports. Every cell in this pair and in gradient-x-tipshape moved the same direction (more clearance), consistent with one mechanism. Measured on this PR\'s own tree, Node 22.' },
  'cup-x-tipshape @ petalCup=1.2 x petalTipShape=2.5': { mm: 0.861, note: "session 32 §18a's own figure (0.977), reproduced exactly on 937263a. 2.50 is Eva's preferred LOOK, ruled reachable and not shipped as the default. — RE-RECORDED BY THE APEX NIB: was 0.977 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE FOLD CLAMP: was 0.864 mm. The fold clamp is the mover and it is the ONLY one: every figure above reproduces EXACTLY on a worktree of 84e641d, the commit before the clamp's first owner. `cupScale` holds the section's curvature across the nib at the value it already had at the entry, and the cap `|c| <= hb / (FOLD_CLAMP_MARGIN * t)` binds on the converging stretch BELOW the nib too — which the wall instrument's `nibFromU` exclusion does not exclude — so the rows just under the entry take a different normal (`trueNormalRows` crosses against its NEIGHBOURS). Measured on the merged tree, Node 22. — RE-RECORDED BY THE APEX ROW RAMP: was 0.833 mm. The ramp raises the blade's row count (NU) above petalTipShape 2.30, budget-permitting, so every cell in this pair's n=2.5/3.0 columns is measured on a DENSER apex mesh than before; `measureWall`'s SELF reading is taken from the emitted rows, so a finer sampling near the tip changes the discrete self-approach figure it reports. Every cell in this pair and in gradient-x-tipshape moved the same direction (more clearance), consistent with one mechanism. Measured on this PR's own tree, Node 22." },
  'cup-x-tipshape @ petalCup=1.2 x petalTipShape=3': { mm: 0.743, note: "session 32 §18a's own figure (0.832), reproduced exactly on 937263a. Monotone in n and the worst cell of this pair. — RE-RECORDED BY THE APEX NIB: was 0.832 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE FOLD CLAMP: was 0.754 mm. The fold clamp is the mover and it is the ONLY one: every figure above reproduces EXACTLY on a worktree of 84e641d, the commit before the clamp's first owner. `cupScale` holds the section's curvature across the nib at the value it already had at the entry, and the cap `|c| <= hb / (FOLD_CLAMP_MARGIN * t)` binds on the converging stretch BELOW the nib too — which the wall instrument's `nibFromU` exclusion does not exclude — so the rows just under the entry take a different normal (`trueNormalRows` crosses against its NEIGHBOURS). Measured on the merged tree, Node 22. — RE-RECORDED BY THE APEX ROW RAMP: was 0.727 mm. The ramp raises the blade's row count (NU) above petalTipShape 2.30, budget-permitting, so every cell in this pair's n=2.5/3.0 columns is measured on a DENSER apex mesh than before; `measureWall`'s SELF reading is taken from the emitted rows, so a finer sampling near the tip changes the discrete self-approach figure it reports. Every cell in this pair and in gradient-x-tipshape moved the same direction (more clearance), consistent with one mechanism. Measured on this PR's own tree, Node 22." },
  // NEW — buckle-x-tipshape's own hazard, first crossing the bar with the
  // apex row ramp's denser tip mesh. Measured on this PR's own tree, Node 22.
  'buckle-x-tipshape @ buckleAmp=0.2 x petalTipShape=3': { mm: 0.951, note: "NEW WITH THE APEX ROW RAMP. Neither buckleAmp 0.2 alone nor petalTipShape 3.00 alone reaches the bar; the ramp's denser mesh above petalTipShape 2.30 is what lets the buckle's own margin wave and the apex's finer sampling compose into a measured self-approach. Measured on this PR's own tree, Node 22." },
  'buckle-x-tipshape @ buckleAmp=0.4 x petalTipShape=2.5': { mm: 0.988, note: "NEW WITH THE APEX ROW RAMP. Measured on this PR's own tree, Node 22." },
  'buckle-x-tipshape @ buckleAmp=0.4 x petalTipShape=3': { mm: 0.921, note: "NEW WITH THE APEX ROW RAMP — the worst cell of this pair so far. Measured on this PR's own tree, Node 22." },

  /* THE CUP-AND-CURL CELLS — SIX OF THEM, and this pair is the finding of
     #263. `petalCup` 1.2 x `petalSpineCurl` 180 is the state
     `tools/bloom-wall-thickness.mjs` already BUILDS on every run as
     `buckle-on-form`'s buckle-free control, reads the wall of, and
     discards the SELF of; its 0.945 mm has been available to that gate
     since session 34 and nothing looked at it. */
  /* REMOVED BY THE APEX NIB: 'cup-x-curl @ petalCup=0.6 x petalSpineCurl=360' was declared at 0.826 mm and now CLEARS at 1.024. CG2 fails hard on a declared hazard that starts passing, which is what reported this. */
  'cup-x-curl @ petalCup=0.9 x petalSpineCurl=270': { mm: 0.902, note: 'measured 2026-09-19 on 937263a. — RE-RECORDED BY THE APEX NIB: was 0.881 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },
  'cup-x-curl @ petalCup=0.9 x petalSpineCurl=360': { mm: 0.115, note: 'measured 2026-09-19 on 937263a. — RE-RECORDED BY THE APEX NIB: was 0.118 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },
  'cup-x-curl @ petalCup=1.2 x petalSpineCurl=180': { mm: 0.980, note: "measured 2026-09-19 on 937263a. THE CELL THE WALL INSTRUMENT ALREADY BUILDS every run — `buckle-on-form`'s own control — and whose SELF it throws away. — RE-RECORDED BY THE APEX NIB: was 0.945 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22." },
  'cup-x-curl @ petalCup=1.2 x petalSpineCurl=270': { mm: 0.182, note: 'measured 2026-09-19 on 937263a. — RE-RECORDED BY THE APEX NIB: was 0.193 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },
  'cup-x-curl @ petalCup=1.2 x petalSpineCurl=360': { mm: 0.000, note: 'measured 2026-09-19 on 937263a — the worst cell in TIER 1: a sheet twelve microns from touching itself on two shipped sliders, with both singles clear (1.031 and 1.245). — RE-RECORDED BY THE APEX NIB: was 0.012 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },

  /* THE BUCKLE CELLS. `buckleAmp` stops at 0.4 on these grids because the
     amplitude CLAMP makes 0.6 float-identical to 0.4 at the default
     frequency 3 — measured, on every cup and every curl of both grids —
     so the top of the slider is covered by the cell below it and a
     fourth column would cost two builds to re-measure one state. */
  /* REMOVED BY THE APEX NIB: 'cup-x-buckle @ petalCup=1.2 x buckleAmp=0.2' was declared at 0.99 mm and now CLEARS at 1.126. CG2 fails hard on a declared hazard that starts passing, which is what reported this. */
  /* REMOVED BY THE APEX NIB: 'cup-x-buckle @ petalCup=1.2 x buckleAmp=0.4' was declared at 0.963 mm and now CLEARS at 1.114. CG2 fails hard on a declared hazard that starts passing, which is what reported this. */
  'curl-x-buckle @ petalSpineCurl=360 x buckleAmp=0.4': { mm: 0.55, note: "measured 2026-09-19 on 937263a. Session 34 named this pair in `buckle-on-form`'s note as a CURVATURE reading (1.182 /mm); this is its self-approach, measured for the first time. — RE-RECORDED BY THE APEX NIB: was 0.912 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE FOOT TARGETS (gate-hygiene, Oct 6): was 0.852 mm, now 0.55 mm. `measureWall` used to drop the foot rows, so a tip coiling back onto its OWN FOOT was invisible to `self`; the foot now joins as a SELF target (never a query, never inside the seam window, so `wall` is unchanged by construction). The worst site is now at u 0.910, the curl's tip against its own foot. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },

  /* THE LEAF CELLS — `leafAngle`'s hazard, at every stem diameter, which
     is what CG4's `single-reaches` arm asserts about this pair. */
  'leafangle-x-stem @ leafAngle=70 x stemDiameter=6': { mm: 0.821, note: "docs/bloom-leaves-outcome.md's own figure (0.824), reproduced exactly through an instrument that shares no code with the one that produced it. RE-RECORDED 0.824 -> 0.821 by leaf/stem build S2: the leaf's margin closes on the bead now, and the near point to the stem is at the blade's base margin, where the bead's profile replaces the flat wall's corner." },
  'leafangle-x-stem @ leafAngle=70 x stemDiameter=3': { mm: 0.822, note: 'measured 2026-09-19 on 937263a. RE-RECORDED 0.826 -> 0.822 by S2 (the bead at the base margin).' },
  'leafangle-x-stem @ leafAngle=70 x stemDiameter=12': { mm: 0.821, note: "measured 2026-09-19 on 937263a — 0.002 mm from the 6 mm stem's reading, which is the whole of what the second control contributes. RE-RECORDED 0.822 -> 0.821 by S2 (the bead at the base margin)." },
  'leafangle-x-stem @ leafAngle=85 x stemDiameter=6': { mm: 0, note: "docs/bloom-leaves-outcome.md's 80-90 deg cell: the blade reaches the stem's own surface. `LEAVES: the STEEP angle (85 deg)` is a shipped MATRIX ROW, so this hazard was reachable, built and exported on every full gate run — nothing measured it." },
  'leafangle-x-stem @ leafAngle=85 x stemDiameter=3': { mm: 0, note: 'measured 2026-09-19 on 937263a.' },
  'leafangle-x-stem @ leafAngle=85 x stemDiameter=12': { mm: 0, note: 'measured 2026-09-19 on 937263a.' },
  /* leafarch-x-angle (leaf/stem build S2): the arch's own grid. Four cells are
     the 85 deg column, which the angle reaches alone; ONE is the product. */
  'leafarch-x-angle @ leafArch=0 x leafAngle=85': { mm: 0, note: 'a SINGLE-axis cell — the 85 deg blade reaches the stem with no arch at all (`leafangle-x-stem @ leafAngle=85` declares the same state). Measured on the S2 tree.' },
  'leafarch-x-angle @ leafArch=90 x leafAngle=85': { mm: 0, note: 'the angle\'s own hazard under an over-arch; the arch moves nothing toward the stem from 85 deg. Measured on the S2 tree.' },
  'leafarch-x-angle @ leafArch=180 x leafAngle=85': { mm: 0, note: 'as the cell above, at the arch\'s maximum. Measured on the S2 tree.' },
  'leafarch-x-angle @ leafArch=-90 x leafAngle=60': { mm: 0, note: 'THE PRODUCT: 60 deg alone reads 1.851 mm and -90 alone (at 35 deg) 4.018; together the up-curled tip comes round onto the stem above its own node. No single axis reaches it. Measured on the S2 tree.' },
  'leafarch-x-angle @ leafArch=-90 x leafAngle=85': { mm: 0, note: 'the angle\'s own hazard, curled. Measured on the S2 tree.' },

  /* ================================================== TIER 2 (#265)
     Every entry below was produced by `--emit` on this tree at c29a8b5
     and pasted deliberately. The per-pair notes carry what the table
     alone does not say. */

  /* THE RUFFLE INTO THE APEX — and it is NOT monotone in the amplitude,
     which is the amplitude CLAMP showing up in a distance. 0.4 reads
     BETTER than 0.2 because at the default frequency 3 the clamp holds
     the built amplitude well below the asked one, and the wave the clamp
     leaves is a different wave rather than a shallower one. A pair count
     cannot express that; a distance can. */
  /* REMOVED BY THE APEX NIB: 'buckle-x-tipshape @ buckleAmp=0.2 x petalTipShape=3' was declared at 0.914 mm and now CLEARS at 1.081. CG2 fails hard on a declared hazard that starts passing, which is what reported this. */
  /* REMOVED BY THE APEX NIB: 'buckle-x-tipshape @ buckleAmp=0.4 x petalTipShape=3' was declared at 0.925 mm and now CLEARS at 1.050. CG2 fails hard on a declared hazard that starts passing, which is what reported this. */

  /* THE QUILL. `petalRoll` 330 alone is `SELF_XFAIL['roll-max']` and
     reads 0.659 there too — the SAME state declared in two lists by two
     instruments, agreeing to the third decimal, which is the strongest
     cross-check either record has. The taper only ever RELIEVES on this
     grid: every tapered cell clears more than the untapered roll beneath
     it, so the pair's worst cell is a single. */
  'roll-x-rolltaper @ petalRoll=270 x petalRollTaper=0': { mm: 0.717, note: 'a SINGLE-axis cell (taper at its default 0) — the roll reaches this alone. Measured 2026-09-19 on c29a8b5. — RE-RECORDED BY THE APEX NIB: was 0.718 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },
  'roll-x-rolltaper @ petalRoll=270 x petalRollTaper=0.5': { mm: 0.778, note: 'measured 2026-09-19 on c29a8b5 — the taper RELIEVES. — RE-RECORDED BY THE APEX NIB: was 0.777 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },
  'roll-x-rolltaper @ petalRoll=270 x petalRollTaper=1': { mm: 0.835, note: 'measured 2026-09-19 on c29a8b5 — the taper RELIEVES. — RE-RECORDED BY THE APEX NIB: was 0.836 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },
  'roll-x-rolltaper @ petalRoll=330 x petalRollTaper=0': { mm: 0.658, note: "a SINGLE-axis cell, and it is SELF_XFAIL['roll-max']'s own state and own number (0.659) reached through a second instrument. Measured 2026-09-19 on c29a8b5. — RE-RECORDED BY THE APEX NIB: was 0.659 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22." },
  'roll-x-rolltaper @ petalRoll=330 x petalRollTaper=0.5': { mm: 0.714, note: 'measured 2026-09-19 on c29a8b5 — the taper RELIEVES.' },
  'roll-x-rolltaper @ petalRoll=330 x petalRollTaper=1': { mm: 0.770, note: 'measured 2026-09-19 on c29a8b5 — the taper RELIEVES. — RE-RECORDED BY THE APEX NIB: was 0.771 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },

  /* THE CUP UNDER THE SWEEP — `kS` multiplying `cupLift` in `sectAt`,
     measured. Both singles clear (cup 1.2 reads 1.031, sweep 1 reads
     1.246 — the sweep alone moves this measure by nothing at all at
     cup 0). */
  /* REMOVED BY THE FOLD CLAMP (2 cells of cup-x-apexsweep): 'petalCup=0.9 x petalApexSweep=1' was declared at 0.998 and now clears at 1.120; 'petalCup=1.2 x petalApexSweep=1' was declared at 0.967 and now clears at 1.120.
     The clamp RELIEVES the cup at the tip, which is what it is for, and CG2 fails hard on a
     declared hazard that starts passing rather than letting it pass silently — that is what
     reported these. Pre-clamp figures reproduce exactly on a worktree of 84e641d. */
  /* REMOVED BY THE APEX NIB: 'cup-x-apexsweep @ petalCup=1.2 x petalApexSweep=0.5' was declared at 0.909 mm and now CLEARS at 1.011. CG2 fails hard on a declared hazard that starts passing, which is what reported this. */

  /* THE GRADIENT INTO THE APEX, AND THE FINDING IS HOW CLOSELY IT TRACKS
     §18a. Cell for cell against `cup-x-tipshape` at the same numbers:
     0.928/0.929, 0.985/0.988, 0.850/0.854, 0.974/0.977, 0.828/0.832 —
     five cells, all within 0.004 mm, and the SAME five cells fail. The
     cup and its along-blade ramp are interchangeable for this hazard at
     these amplitudes, which is a statement about the hazard rather than
     about either control. */
  'gradient-x-tipshape @ petalCupGradient=0.6 x petalTipShape=3': { mm: 0.922, note: "measured 2026-09-19 on c29a8b5; `cup-x-tipshape`'s own cell at the same numbers reads 0.929. — RE-RECORDED BY THE APEX NIB: was 0.928 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE FOLD CLAMP: was 0.892 mm. The fold clamp is the mover and it is the ONLY one: every figure above reproduces EXACTLY on a worktree of 84e641d, the commit before the clamp's first owner. `cupScale` holds the section's curvature across the nib at the value it already had at the entry, and the cap `|c| <= hb / (FOLD_CLAMP_MARGIN * t)` binds on the converging stretch BELOW the nib too — which the wall instrument's `nibFromU` exclusion does not exclude — so the rows just under the entry take a different normal (`trueNormalRows` crosses against its NEIGHBOURS). Measured on the merged tree, Node 22. — RE-RECORDED BY THE APEX ROW RAMP: was 0.916 mm. The ramp raises the blade's row count (NU) above petalTipShape 2.30, budget-permitting, so every cell in this pair's n=2.5/3.0 columns is measured on a DENSER apex mesh than before; `measureWall`'s SELF reading is taken from the emitted rows, so a finer sampling near the tip changes the discrete self-approach figure it reports. Every cell in this pair and in cup-x-tipshape moved the same direction (more clearance), consistent with one mechanism. Measured on this PR's own tree, Node 22." },
  'gradient-x-tipshape @ petalCupGradient=0.9 x petalTipShape=2.5': { mm: 0.921, note: "measured 2026-09-19 on c29a8b5; the cup reads 0.988 at the same numbers. — RE-RECORDED BY THE APEX NIB: was 0.985 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE FOLD CLAMP: was 0.901 mm. The fold clamp is the mover and it is the ONLY one: every figure above reproduces EXACTLY on a worktree of 84e641d, the commit before the clamp's first owner. `cupScale` holds the section's curvature across the nib at the value it already had at the entry, and the cap `|c| <= hb / (FOLD_CLAMP_MARGIN * t)` binds on the converging stretch BELOW the nib too — which the wall instrument's `nibFromU` exclusion does not exclude — so the rows just under the entry take a different normal (`trueNormalRows` crosses against its NEIGHBOURS). Measured on the merged tree, Node 22. — RE-RECORDED BY THE APEX ROW RAMP: was 0.9 mm. The ramp raises the blade's row count (NU) above petalTipShape 2.30, budget-permitting, so every cell in this pair's n=2.5/3.0 columns is measured on a DENSER apex mesh than before; `measureWall`'s SELF reading is taken from the emitted rows, so a finer sampling near the tip changes the discrete self-approach figure it reports. Every cell in this pair and in cup-x-tipshape moved the same direction (more clearance), consistent with one mechanism. Measured on this PR's own tree, Node 22." },
  'gradient-x-tipshape @ petalCupGradient=0.9 x petalTipShape=3': { mm: 0.816, note: "measured 2026-09-19 on c29a8b5; the cup reads 0.854. — RE-RECORDED BY THE APEX NIB: was 0.850 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE FOLD CLAMP: was 0.802 mm. The fold clamp is the mover and it is the ONLY one: every figure above reproduces EXACTLY on a worktree of 84e641d, the commit before the clamp's first owner. `cupScale` holds the section's curvature across the nib at the value it already had at the entry, and the cap `|c| <= hb / (FOLD_CLAMP_MARGIN * t)` binds on the converging stretch BELOW the nib too — which the wall instrument's `nibFromU` exclusion does not exclude — so the rows just under the entry take a different normal (`trueNormalRows` crosses against its NEIGHBOURS). Measured on the merged tree, Node 22. — RE-RECORDED BY THE APEX ROW RAMP: was 0.805 mm. The ramp raises the blade's row count (NU) above petalTipShape 2.30, budget-permitting, so every cell in this pair's n=2.5/3.0 columns is measured on a DENSER apex mesh than before; `measureWall`'s SELF reading is taken from the emitted rows, so a finer sampling near the tip changes the discrete self-approach figure it reports. Every cell in this pair and in cup-x-tipshape moved the same direction (more clearance), consistent with one mechanism. Measured on this PR's own tree, Node 22." },
  'gradient-x-tipshape @ petalCupGradient=1.2 x petalTipShape=2.5': { mm: 0.861, note: "measured 2026-09-19 on c29a8b5; the cup reads 0.977. — RE-RECORDED BY THE APEX NIB: was 0.974 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE FOLD CLAMP: was 0.864 mm. The fold clamp is the mover and it is the ONLY one: every figure above reproduces EXACTLY on a worktree of 84e641d, the commit before the clamp's first owner. `cupScale` holds the section's curvature across the nib at the value it already had at the entry, and the cap `|c| <= hb / (FOLD_CLAMP_MARGIN * t)` binds on the converging stretch BELOW the nib too — which the wall instrument's `nibFromU` exclusion does not exclude — so the rows just under the entry take a different normal (`trueNormalRows` crosses against its NEIGHBOURS). Measured on the merged tree, Node 22. — RE-RECORDED BY THE APEX ROW RAMP: was 0.836 mm. The ramp raises the blade's row count (NU) above petalTipShape 2.30, budget-permitting, so every cell in this pair's n=2.5/3.0 columns is measured on a DENSER apex mesh than before; `measureWall`'s SELF reading is taken from the emitted rows, so a finer sampling near the tip changes the discrete self-approach figure it reports. Every cell in this pair and in cup-x-tipshape moved the same direction (more clearance), consistent with one mechanism. Measured on this PR's own tree, Node 22." },
  'gradient-x-tipshape @ petalCupGradient=1.2 x petalTipShape=3': { mm: 0.742, note: "measured 2026-09-19 on c29a8b5 — the worst cell of this pair; the cup reads 0.832 at the same numbers. — RE-RECORDED BY THE APEX NIB: was 0.828 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE FOLD CLAMP: was 0.754 mm. The fold clamp is the mover and it is the ONLY one: every figure above reproduces EXACTLY on a worktree of 84e641d, the commit before the clamp's first owner. `cupScale` holds the section's curvature across the nib at the value it already had at the entry, and the cap `|c| <= hb / (FOLD_CLAMP_MARGIN * t)` binds on the converging stretch BELOW the nib too — which the wall instrument's `nibFromU` exclusion does not exclude — so the rows just under the entry take a different normal (`trueNormalRows` crosses against its NEIGHBOURS). Measured on the merged tree, Node 22. — RE-RECORDED BY THE APEX ROW RAMP: was 0.73 mm. The ramp raises the blade's row count (NU) above petalTipShape 2.30, budget-permitting, so every cell in this pair's n=2.5/3.0 columns is measured on a DENSER apex mesh than before; `measureWall`'s SELF reading is taken from the emitted rows, so a finer sampling near the tip changes the discrete self-approach figure it reports. Every cell in this pair and in cup-x-tipshape moved the same direction (more clearance), consistent with one mechanism. Measured on this PR's own tree, Node 22." },

  /* THE FIDDLEHEAD, TIP-LOADED. Worse than `cup-x-curl` at three of its
     four failing cells (0.818 against 0.826, 0.678 against 0.881 — the
     gradient loads the stations the curl brings together). */
  /* REMOVED BY THE APEX NIB: 'gradient-x-curl @ petalCupGradient=0.6 x petalSpineCurl=360' was declared at 0.818 mm and now CLEARS at 1.056. CG2 fails hard on a declared hazard that starts passing, which is what reported this. */
  /* REMOVED BY THE FOLD CLAMP (1 cell of gradient-x-curl): 'petalCupGradient=0.9 x petalSpineCurl=360' was declared at 0.899 and now clears at 1.058.
     The clamp RELIEVES the cup at the tip, which is what it is for, and CG2 fails hard on a
     declared hazard that starts passing rather than letting it pass silently — that is what
     reported these. Pre-clamp figures reproduce exactly on a worktree of 84e641d. */
  /* REMOVED BY THE APEX NIB: 'gradient-x-curl @ petalCupGradient=1.2 x petalSpineCurl=270' was declared at 0.994 mm and now CLEARS at 1.023. CG2 fails hard on a declared hazard that starts passing, which is what reported this. */
  'gradient-x-curl @ petalCupGradient=1.2 x petalSpineCurl=360': { mm: 0.499, note: 'measured 2026-09-19 on c29a8b5 — the worst cell of this pair. — RE-RECORDED BY THE APEX NIB: was 0.477 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },

  /* THE CUPPED QUILL — ELEVEN CELLS, TWO OF THEM SINGLES, and the widest
     failing region in the gate. `petalRoll` 270 and 330 fail at cup 0,
     which is why the verdict is `single-reaches`: the matrix and V5 can
     both see the roll alone. What they cannot see is the interior — the
     cup takes 0.659 mm down to 0.010. */
  'cup-x-roll @ petalCup=0 x petalRoll=270': { mm: 0.717, note: 'a SINGLE-axis cell (cup at its default 0). Measured 2026-09-19 on c29a8b5. — RE-RECORDED BY THE APEX NIB: was 0.718 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },
  'cup-x-roll @ petalCup=0 x petalRoll=330': { mm: 0.658, note: "a SINGLE-axis cell, and SELF_XFAIL['roll-max']'s own 0.659 for the third time in this file. Measured 2026-09-19 on c29a8b5. — RE-RECORDED BY THE APEX NIB: was 0.659 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22." },
  'cup-x-roll @ petalCup=0.6 x petalRoll=180': { mm: 0.424, note: 'measured 2026-09-19 on c29a8b5; roll 180 alone reads 1.128 and cup 0.6 alone 1.178 — both clear.' },
  'cup-x-roll @ petalCup=0.6 x petalRoll=270': { mm: 0.002, note: 'measured 2026-09-19 on c29a8b5. — RE-RECORDED BY THE APEX NIB: was 0.034 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },
  'cup-x-roll @ petalCup=0.6 x petalRoll=330': { mm: 0.024, note: 'measured 2026-09-19 on c29a8b5. — RE-RECORDED BY THE APEX NIB: was 0.032 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },
  'cup-x-roll @ petalCup=0.9 x petalRoll=180': { mm: 0.253, note: 'measured 2026-09-19 on c29a8b5.' },
  'cup-x-roll @ petalCup=0.9 x petalRoll=270': { mm: 0.023, note: 'measured 2026-09-19 on c29a8b5. — RE-RECORDED BY THE APEX NIB: was 0.012 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },
  'cup-x-roll @ petalCup=0.9 x petalRoll=330': { mm: 0.004, note: 'measured 2026-09-19 on c29a8b5 — NOT monotone in the roll: 270 reads nearer than 330 at this cup. — RE-RECORDED BY THE APEX NIB: was 0.085 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },
  'cup-x-roll @ petalCup=1.2 x petalRoll=180': { mm: 0.164, note: 'measured 2026-09-19 on c29a8b5.' },
  'cup-x-roll @ petalCup=1.2 x petalRoll=270': { mm: 0.023, note: 'measured 2026-09-19 on c29a8b5. — RE-RECORDED BY THE APEX NIB: was 0.072 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },
  'cup-x-roll @ petalCup=1.2 x petalRoll=330': { mm: 0.107, note: 'measured 2026-09-19 on c29a8b5 — the worst cell of this pair and the joint-worst in the gate, ten microns. — RE-RECORDED BY THE APEX NIB: was 0.010 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },

  /* THE HOOP, WRUNG — TIER 2'S HEADLINE. 0.012 mm with BOTH singles
     clear (twist 180 reads 1.163, curl 360 reads 1.245): the same
     magnitude as TIER 1's worst cell, on a pair no doc had cited. Not
     monotone in the twist at curl 360 — 120 deg reads nearer than 180 —
     because past a certain wring the blade passes THROUGH the region it
     was approaching rather than settling in it. */
  /* REMOVED BY THE APEX NIB: 'curl-x-twist @ petalSpineCurl=180 x petalTwist=120' was declared at 0.975 mm and now CLEARS at 1.123. CG2 fails hard on a declared hazard that starts passing, which is what reported this. */
  'curl-x-twist @ petalSpineCurl=180 x petalTwist=180': { mm: 0.811, note: 'measured 2026-09-19 on c29a8b5. — RE-RECORDED BY THE APEX NIB: was 0.620 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },
  'curl-x-twist @ petalSpineCurl=270 x petalTwist=120': { mm: 0.448, note: 'measured 2026-09-19 on c29a8b5. — RE-RECORDED BY THE APEX NIB: was 0.411 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },
  'curl-x-twist @ petalSpineCurl=270 x petalTwist=180': { mm: 0.275, note: 'measured 2026-09-19 on c29a8b5. — RE-RECORDED BY THE APEX NIB: was 0.105 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },
  'curl-x-twist @ petalSpineCurl=360 x petalTwist=60': { mm: 0.04, note: 'measured 2026-09-19 on c29a8b5. — RE-RECORDED BY THE APEX NIB: was 0.615 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE FOOT TARGETS (gate-hygiene, Oct 6): was 0.933 mm, now 0.04 mm. `measureWall` used to drop the foot rows, so a tip coiling back onto its OWN FOOT was invisible to `self`; the foot now joins as a SELF target (never a query, never inside the seam window, so `wall` is unchanged by construction). The worst site is now at u 0.983, the curl\'s tip against its own foot. Measured on main\'s geometry at 7af97f4, Node 22, EXPORT.' },
  'curl-x-twist @ petalSpineCurl=360 x petalTwist=120': { mm: 0.006, note: "measured 2026-09-19 on c29a8b5 — this tier's worst cell, and the same twelve microns TIER 1's `cup 1.2 x curl 360` reads. Both singles clear: twist 180 reads 1.163 and curl 360 reads 1.245. — RE-RECORDED BY THE APEX NIB: was 0.012 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE FOOT TARGETS (gate-hygiene, Oct 6): was 0.053 mm, now 0.006 mm. `measureWall` used to drop the foot rows, so a tip coiling back onto its OWN FOOT was invisible to `self`; the foot now joins as a SELF target (never a query, never inside the seam window, so `wall` is unchanged by construction). The worst site is now at u 0.983, the curl's tip against its own foot. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  'curl-x-twist @ petalSpineCurl=360 x petalTwist=180': { mm: 0.007, note: 'measured 2026-09-19 on c29a8b5 — NOT monotone: 120 deg of twist reads nearer than 180. — RE-RECORDED BY THE APEX NIB: was 0.025 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument\'s own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22.' },

  /* ONE LIFT, TWO CONTROLS — AND THE MEASURE DEPENDS ON THEIR SUM. Read
     the eight declared cells as (cup + gradient): 1.5 reads 0.938 twice,
     1.8 reads 0.862 three times, 2.1 reads 0.801 twice, 2.4 reads 0.754.
     Every cell on an anti-diagonal is the same number to the third
     decimal, which is `cAt(u, r)` composing the two into one coefficient
     showing up as a measured symmetry rather than as a reading of the
     source. */
  /* REMOVED BY THE FOLD CLAMP (8 cells of cup-x-gradient): 'petalCup=0.6 x petalCupGradient=0.9' was declared at 1 and now clears at 1.097; 'petalCup=0.6 x petalCupGradient=1.2' was declared at 0.944 and now clears at 1.097; 'petalCup=0.9 x petalCupGradient=0.6' was declared at 0.999 and now clears at 1.097; 'petalCup=0.9 x petalCupGradient=0.9' was declared at 0.943 and now clears at 1.097; 'petalCup=0.9 x petalCupGradient=1.2' was declared at 0.897 and now clears at 1.097; 'petalCup=1.2 x petalCupGradient=0.6' was declared at 0.943 and now clears at 1.097; 'petalCup=1.2 x petalCupGradient=0.9' was declared at 0.897 and now clears at 1.097; 'petalCup=1.2 x petalCupGradient=1.2' was declared at 0.858 and now clears at 1.097.
     The clamp RELIEVES the cup at the tip, which is what it is for, and CG2 fails hard on a
     declared hazard that starts passing rather than letting it pass silently — that is what
     reported these. Pre-clamp figures reproduce exactly on a worktree of 84e641d. */

  /* ================================================== TIER 3 (#265) */

  /* THE SERRATED BLADE AGAINST THE STEM. All three tooth depths read the
     SAME number at every angle — bit-identically, which is what
     COMBINATION_INERT declares — so these six are `leafangle-x-stem`'s
     own two failing angles re-read three times each. They are declared
     because CG2 declares every cell under the bar and an undeclared one
     is a red; what they are worth is the inertness record above them. */
  'leafangle-x-tooth @ leafAngle=70 x leafToothDepth=0.26': { mm: 0.821, note: "a SINGLE-axis cell, and the same state `leafangle-x-stem @ leafAngle=70 x stemDiameter=6` declares at the same figure. Measured 2026-09-19 on c29a8b5 at 0.824; RE-RECORDED 0.821 by S2 (the bead at the base margin)." },
  'leafangle-x-tooth @ leafAngle=70 x leafToothDepth=0.6': { mm: 0.821, note: 'measured 2026-09-19 on c29a8b5 — bit-identical to the cell above it; the teeth do not reach this measure. RE-RECORDED 0.824 -> 0.821 by S2.' },
  'leafangle-x-tooth @ leafAngle=70 x leafToothDepth=1': { mm: 0.821, note: 'measured 2026-09-19 on c29a8b5 — bit-identical to the two cells above it. RE-RECORDED 0.824 -> 0.821 by S2.' },
  'leafangle-x-tooth @ leafAngle=85 x leafToothDepth=0.26': { mm: 0, note: 'a SINGLE-axis cell: the blade reaches the stem surface at 85 deg whatever the teeth do. Measured 2026-09-19 on c29a8b5.' },
  'leafangle-x-tooth @ leafAngle=85 x leafToothDepth=0.6': { mm: 0, note: 'measured 2026-09-19 on c29a8b5.' },
  'leafangle-x-tooth @ leafAngle=85 x leafToothDepth=1': { mm: 0, note: 'measured 2026-09-19 on c29a8b5.' },

  /* THE CUP ON A BROAD BLADE — a guess that paid. Both singles clear
     (width 30 alone reads 1.219), and the cup's own 1.031 at the default
     width falls to 0.932 at the widest. */
  'cup-x-width @ petalCup=0.9 x petalWidth=30': { mm: 0.942, note: "measured 2026-09-19 on c29a8b5; petalWidth 30 alone reads 1.219 and cup 0.9 alone 1.138, both clear. — RE-RECORDED BY THE APEX NIB: was 0.954 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE FOLD CLAMP: was 0.947 mm. The fold clamp is the mover and it is the ONLY one: every figure above reproduces EXACTLY on a worktree of 84e641d, the commit before the clamp's first owner. `cupScale` holds the section's curvature across the nib at the value it already had at the entry, and the cap `|c| <= hb / (FOLD_CLAMP_MARGIN * t)` binds on the converging stretch BELOW the nib too — which the wall instrument's `nibFromU` exclusion does not exclude — so the rows just under the entry take a different normal (`trueNormalRows` crosses against its NEIGHBOURS). Measured on the merged tree, Node 22." },
  'cup-x-width @ petalCup=1.2 x petalWidth=23': { mm: 0.981, note: "NEW WITH THE FOLD CLAMP, and it is the twelve-microns story a second time: 1.0002 mm on a worktree of 84e641d (the commit before the clamp), 0.9814 here — two tenths of a micron of headroom spent. The fold clamp is the mover and it is the ONLY one: every figure above reproduces EXACTLY on a worktree of 84e641d, the commit before the clamp's first owner. `cupScale` holds the section's curvature across the nib at the value it already had at the entry, and the cap `|c| <= hb / (FOLD_CLAMP_MARGIN * t)` binds on the converging stretch BELOW the nib too — which the wall instrument's `nibFromU` exclusion does not exclude — so the rows just under the entry take a different normal (`trueNormalRows` crosses against its NEIGHBOURS). Measured on the merged tree, Node 22." },
  'cup-x-width @ petalCup=1.2 x petalWidth=30': { mm: 0.884, note: "measured 2026-09-19 on c29a8b5 — the worst cell of this pair. — RE-RECORDED BY THE APEX NIB: was 0.932 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE FOLD CLAMP: was 0.916 mm. The fold clamp is the mover and it is the ONLY one: every figure above reproduces EXACTLY on a worktree of 84e641d, the commit before the clamp's first owner. `cupScale` holds the section's curvature across the nib at the value it already had at the entry, and the cap `|c| <= hb / (FOLD_CLAMP_MARGIN * t)` binds on the converging stretch BELOW the nib too — which the wall instrument's `nibFromU` exclusion does not exclude — so the rows just under the entry take a different normal (`trueNormalRows` crosses against its NEIGHBOURS). Measured on the merged tree, Node 22." },

  /* THE CUP ON A THINNED TIP — a guess that paid, and the second control
     SATURATES AGAINST THE PRINT FLOOR: 0.4 and 0.8 read the same number
     at every cup, because in EXPORT mode `tipThinning` 0.4 has already
     taken the tip to the 1.00 mm floor and there is nothing left for 0.8
     to take. The axis still reaches the measure (0.191 mm from its own
     default column), so this is saturation and not inertness — the
     distinction COMBINATION_INERT exists to keep. */
  'cup-x-thinning @ petalCup=0.9 x tipThinning=0.4': { mm: 0.922, note: "measured 2026-09-19 on c29a8b5. — RE-RECORDED BY THE APEX NIB: was 0.984 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE FOLD CLAMP: was 0.938 mm. The fold clamp is the mover and it is the ONLY one: every figure above reproduces EXACTLY on a worktree of 84e641d, the commit before the clamp's first owner. `cupScale` holds the section's curvature across the nib at the value it already had at the entry, and the cap `|c| <= hb / (FOLD_CLAMP_MARGIN * t)` binds on the converging stretch BELOW the nib too — which the wall instrument's `nibFromU` exclusion does not exclude — so the rows just under the entry take a different normal (`trueNormalRows` crosses against its NEIGHBOURS). Measured on the merged tree, Node 22." },
  'cup-x-thinning @ petalCup=0.9 x tipThinning=0.8': { mm: 0.922, note: "measured 2026-09-19 on c29a8b5 — identical to 0.4: the export floor has already bound. — RE-RECORDED BY THE APEX NIB: was 0.984 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE FOLD CLAMP: was 0.938 mm. The fold clamp is the mover and it is the ONLY one: every figure above reproduces EXACTLY on a worktree of 84e641d, the commit before the clamp's first owner. `cupScale` holds the section's curvature across the nib at the value it already had at the entry, and the cap `|c| <= hb / (FOLD_CLAMP_MARGIN * t)` binds on the converging stretch BELOW the nib too — which the wall instrument's `nibFromU` exclusion does not exclude — so the rows just under the entry take a different normal (`trueNormalRows` crosses against its NEIGHBOURS). Measured on the merged tree, Node 22." },
  'cup-x-thinning @ petalCup=1.2 x tipThinning=0.4': { mm: 0.922, note: "measured 2026-09-19 on c29a8b5 — the worst cell of this pair. — RE-RECORDED BY THE APEX NIB: was 0.924 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE FOLD CLAMP: was 0.931 mm. The fold clamp is the mover and it is the ONLY one: every figure above reproduces EXACTLY on a worktree of 84e641d, the commit before the clamp's first owner. `cupScale` holds the section's curvature across the nib at the value it already had at the entry, and the cap `|c| <= hb / (FOLD_CLAMP_MARGIN * t)` binds on the converging stretch BELOW the nib too — which the wall instrument's `nibFromU` exclusion does not exclude — so the rows just under the entry take a different normal (`trueNormalRows` crosses against its NEIGHBOURS). Measured on the merged tree, Node 22." },
  'cup-x-thinning @ petalCup=1.2 x tipThinning=0.8': { mm: 0.922, note: "measured 2026-09-19 on c29a8b5 — identical to 0.4: the export floor has already bound. — RE-RECORDED BY THE APEX NIB: was 0.924 mm. The nib truncates the law at the print floor and closes it on a flank and an arc, so every station near the tip sits at a different physical place and the drawn blade is up to +0.124 mm longer; the wall instrument's own exclusion is the NIB and exactly the nib (see `nibFromU`), so this is the geometry outside it. Measured on the apex-nib tree, Node 22. — RE-RECORDED BY THE FOLD CLAMP: was 0.931 mm. The fold clamp is the mover and it is the ONLY one: every figure above reproduces EXACTLY on a worktree of 84e641d, the commit before the clamp's first owner. `cupScale` holds the section's curvature across the nib at the value it already had at the entry, and the cap `|c| <= hb / (FOLD_CLAMP_MARGIN * t)` binds on the converging stretch BELOW the nib too — which the wall instrument's `nibFromU` exclusion does not exclude — so the rows just under the entry take a different normal (`trueNormalRows` crosses against its NEIGHBOURS). Measured on the merged tree, Node 22." },
  /* THE TRIPLE curl-x-cup-x-twist (form variance build 2, Eva's ruling 2) — measured on this tree, Node 22, EXPORT. */
  'curl-x-cup-x-twist @ petalSpineCurl=270 x petalCup=0 x petalTwist=180': { mm: 0.275, note: "the same state as a declared PAIR cell, read again on the triple's face (the ladders are shared on purpose) — curl-x-twist @ petalSpineCurl=270 x petalTwist=180" },
  'curl-x-cup-x-twist @ petalSpineCurl=270 x petalCup=1 x petalTwist=0': { mm: 0.791, note: "a FACE of the triple: curl 270 x cup 1 with twist at its default — cup 1 is the form field's own reach from the default, off the cup-x-curl pair's ladder, so this face cell is new to the gate" },
  'curl-x-cup-x-twist @ petalSpineCurl=270 x petalCup=1 x petalTwist=180': { mm: 0.076, note: "THE TRIPLE'S OWN CELL — the state the single-g form field put on its crest petal at amount 1 (docs/bloom-organic-variance-form-outcome.md §4): 0.076 mm here against its NEAREST FACE at the same values, curl 270 x twist 180, 0.275 — the third control costs 0.199 mm. The census reads 688 within-shell pairs, worst span 0.8771 mm, on the same state (8 petals x 86): that 0.8771 is a FOLD DEPTH and this 0.076 a NEAREST APPROACH, two quantities of one fold, not a disagreement" },
  'curl-x-cup-x-twist @ petalSpineCurl=270 x petalCup=1.2 x petalTwist=0': { mm: 0.182, note: "a FACE: the cup-x-curl pair's own cell at cup 1.2 x curl 270, read again" },
  'curl-x-cup-x-twist @ petalSpineCurl=270 x petalCup=1.2 x petalTwist=180': { mm: 0.227, note: 'an all-three cell at the slider maxima of cup and twist — it reads FARTHER than its nearest face (0.182, twist back at 0), so at these values the third control relieves rather than adds; cup is not monotone here' },
  'curl-x-cup-x-twist @ petalSpineCurl=360 x petalCup=0 x petalTwist=180': { mm: 0.007, note: "the same state as a declared PAIR cell, read again on the triple's face (the ladders are shared on purpose) — curl-x-twist @ petalSpineCurl=360 x petalTwist=180" },
  'curl-x-cup-x-twist @ petalSpineCurl=360 x petalCup=1 x petalTwist=0': { mm: 0.052, note: 'a FACE: curl 360 x cup 1 with twist at its default — off the cup-x-curl ladder, new to the gate' },
  'curl-x-cup-x-twist @ petalSpineCurl=360 x petalCup=1 x petalTwist=180': { mm: 0.065, note: 'an all-three cell: 0.065 against its nearest face (curl 360 x twist 180, 0.007) — the third control relieves here' },
  'curl-x-cup-x-twist @ petalSpineCurl=360 x petalCup=1.2 x petalTwist=0': { mm: 0, note: "a FACE: the cup-x-curl pair's own worst cell, cup 1.2 x curl 360, read again — 0.0002 mm, recorded at the gate's three decimals" },
  'curl-x-cup-x-twist @ petalSpineCurl=360 x petalCup=1.2 x petalTwist=180': { mm: 0.014, note: "the all-three corner at every slider maximum: 0.014 against its nearest face (cup 1.2 x curl 360, 0.000) — the corner is not the worst cell, which is why the triple carries the field's interior reach and not only its corners" },

  /* ===== cup-x-roll-x-curl (the headroom PR, §21) */
  "cup-x-roll-x-curl @ petalCup=0 x petalRoll=-330 x petalSpineCurl=-180": { mm: 0.901, note: "a FACE of the triple (petalRoll x petalSpineCurl moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "cup-x-roll-x-curl @ petalCup=0 x petalRoll=330 x petalSpineCurl=0": { mm: 0.658, note: "a SINGLE-axis cell (petalRoll alone) \u2014 the matrix and the wall instrument can see it; declared because the triple's grid produces the key. Measured on the headroom PR's tree" },
  "cup-x-roll-x-curl @ petalCup=0 x petalRoll=330 x petalSpineCurl=-180": { mm: 0.66, note: "a FACE of the triple (petalRoll x petalSpineCurl moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "cup-x-roll-x-curl @ petalCup=0 x petalRoll=330 x petalSpineCurl=270": { mm: 0.544, note: "a FACE of the triple (petalRoll x petalSpineCurl moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "cup-x-roll-x-curl @ petalCup=0 x petalRoll=330 x petalSpineCurl=360": { mm: 0.436, note: "a FACE of the triple (petalRoll x petalSpineCurl moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "cup-x-roll-x-curl @ petalCup=-0.8 x petalRoll=-330 x petalSpineCurl=0": { mm: 0.08, note: "a FACE of the triple (petalCup x petalRoll moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "cup-x-roll-x-curl @ petalCup=-0.8 x petalRoll=-330 x petalSpineCurl=-180": { mm: 0.079, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs 0.001 mm against its nearest face (petalCup=-0.8 x petalRoll=-330 x petalSpineCurl=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "cup-x-roll-x-curl @ petalCup=-0.8 x petalRoll=-330 x petalSpineCurl=270": { mm: 0.08, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs -0.000 mm against its nearest face (petalCup=-0.8 x petalRoll=-330 x petalSpineCurl=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "cup-x-roll-x-curl @ petalCup=-0.8 x petalRoll=-330 x petalSpineCurl=360": { mm: 0.035, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs -0.000 mm against its nearest face (petalCup=-0.8 x petalRoll=-330 x petalSpineCurl=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721) — RE-RECORDED BY THE FOOT TARGETS (gate-hygiene, Oct 6): was 0.08 mm, now 0.035 mm. `measureWall` used to drop the foot rows, so a tip coiling back onto its OWN FOOT was invisible to `self`; the foot now joins as a SELF target (never a query, never inside the seam window, so `wall` is unchanged by construction). The worst site is now at u 0.946, the curl's tip against its own foot. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "cup-x-roll-x-curl @ petalCup=-0.8 x petalRoll=330 x petalSpineCurl=0": { mm: 0.012, note: "a FACE of the triple (petalCup x petalRoll moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "cup-x-roll-x-curl @ petalCup=-0.8 x petalRoll=330 x petalSpineCurl=-180": { mm: 0.012, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs -0.000 mm against its nearest face (petalCup=-0.8 x petalRoll=330 x petalSpineCurl=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "cup-x-roll-x-curl @ petalCup=-0.8 x petalRoll=330 x petalSpineCurl=270": { mm: 0.012, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs 0.000 mm against its nearest face (petalCup=-0.8 x petalRoll=330 x petalSpineCurl=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "cup-x-roll-x-curl @ petalCup=-0.8 x petalRoll=330 x petalSpineCurl=360": { mm: 0.012, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs 0.000 mm against its nearest face (petalCup=-0.8 x petalRoll=330 x petalSpineCurl=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "cup-x-roll-x-curl @ petalCup=1 x petalRoll=0 x petalSpineCurl=270": { mm: 0.791, note: "a FACE of the triple (petalCup x petalSpineCurl moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "cup-x-roll-x-curl @ petalCup=1 x petalRoll=0 x petalSpineCurl=360": { mm: 0.052, note: "a FACE of the triple (petalCup x petalSpineCurl moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "cup-x-roll-x-curl @ petalCup=1 x petalRoll=-330 x petalSpineCurl=0": { mm: 0.0, note: "a FACE of the triple (petalCup x petalRoll moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "cup-x-roll-x-curl @ petalCup=1 x petalRoll=-330 x petalSpineCurl=-180": { mm: 0.0, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs 0.000 mm against its nearest face (petalCup=1 x petalRoll=-330 x petalSpineCurl=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "cup-x-roll-x-curl @ petalCup=1 x petalRoll=-330 x petalSpineCurl=270": { mm: 0.0, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs -0.000 mm against its nearest face (petalCup=1 x petalRoll=-330 x petalSpineCurl=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "cup-x-roll-x-curl @ petalCup=1 x petalRoll=-330 x petalSpineCurl=360": { mm: 0.0, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs -0.000 mm against its nearest face (petalCup=1 x petalRoll=-330 x petalSpineCurl=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "cup-x-roll-x-curl @ petalCup=1 x petalRoll=330 x petalSpineCurl=0": { mm: 0.041, note: "a FACE of the triple (petalCup x petalRoll moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "cup-x-roll-x-curl @ petalCup=1 x petalRoll=330 x petalSpineCurl=-180": { mm: 0.042, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs -0.001 mm against its nearest face (petalCup=1 x petalRoll=330 x petalSpineCurl=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "cup-x-roll-x-curl @ petalCup=1 x petalRoll=330 x petalSpineCurl=270": { mm: 0.002, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs 0.038 mm against its nearest face (petalCup=1 x petalRoll=330 x petalSpineCurl=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "cup-x-roll-x-curl @ petalCup=1 x petalRoll=330 x petalSpineCurl=360": { mm: 0.004, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs 0.037 mm against its nearest face (petalCup=1 x petalRoll=330 x petalSpineCurl=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "cup-x-roll-x-curl @ petalCup=1.2 x petalRoll=0 x petalSpineCurl=270": { mm: 0.182, note: "a FACE of the triple (petalCup x petalSpineCurl moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "cup-x-roll-x-curl @ petalCup=1.2 x petalRoll=0 x petalSpineCurl=360": { mm: 0.0, note: "a FACE of the triple (petalCup x petalSpineCurl moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "cup-x-roll-x-curl @ petalCup=1.2 x petalRoll=-330 x petalSpineCurl=0": { mm: 0.001, note: "a FACE of the triple (petalCup x petalRoll moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "cup-x-roll-x-curl @ petalCup=1.2 x petalRoll=-330 x petalSpineCurl=-180": { mm: 0.001, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs -0.000 mm against its nearest face (petalCup=1.2 x petalRoll=-330 x petalSpineCurl=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "cup-x-roll-x-curl @ petalCup=1.2 x petalRoll=-330 x petalSpineCurl=270": { mm: 0.001, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs 0.000 mm against its nearest face (petalCup=1.2 x petalRoll=-330 x petalSpineCurl=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "cup-x-roll-x-curl @ petalCup=1.2 x petalRoll=-330 x petalSpineCurl=360": { mm: 0.001, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs -0.001 mm against its nearest face (petalCup=1.2 x petalRoll=0 x petalSpineCurl=360) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "cup-x-roll-x-curl @ petalCup=1.2 x petalRoll=330 x petalSpineCurl=0": { mm: 0.107, note: "a FACE of the triple (petalCup x petalRoll moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "cup-x-roll-x-curl @ petalCup=1.2 x petalRoll=330 x petalSpineCurl=-180": { mm: 0.108, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs -0.002 mm against its nearest face (petalCup=1.2 x petalRoll=330 x petalSpineCurl=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "cup-x-roll-x-curl @ petalCup=1.2 x petalRoll=330 x petalSpineCurl=270": { mm: 0.001, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs 0.105 mm against its nearest face (petalCup=1.2 x petalRoll=330 x petalSpineCurl=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "cup-x-roll-x-curl @ petalCup=1.2 x petalRoll=330 x petalSpineCurl=360": { mm: 0.005, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs -0.004 mm against its nearest face (petalCup=1.2 x petalRoll=0 x petalSpineCurl=360) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },

  /* ===== curl-x-twist-x-roll (the headroom PR, §21) */
  "curl-x-twist-x-roll @ petalSpineCurl=0 x petalTwist=0 x petalRoll=330": { mm: 0.658, note: "a SINGLE-axis cell (petalRoll alone) \u2014 the matrix and the wall instrument can see it; declared because the triple's grid produces the key. Measured on the headroom PR's tree" },
  "curl-x-twist-x-roll @ petalSpineCurl=0 x petalTwist=-180 x petalRoll=330": { mm: 0.66, note: "a FACE of the triple (petalTwist x petalRoll moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "curl-x-twist-x-roll @ petalSpineCurl=0 x petalTwist=180 x petalRoll=330": { mm: 0.654, note: "a FACE of the triple (petalTwist x petalRoll moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "curl-x-twist-x-roll @ petalSpineCurl=270 x petalTwist=0 x petalRoll=330": { mm: 0.544, note: "a FACE of the triple (petalSpineCurl x petalRoll moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "curl-x-twist-x-roll @ petalSpineCurl=270 x petalTwist=-180 x petalRoll=0": { mm: 0.275, note: "a FACE of the triple (petalSpineCurl x petalTwist moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "curl-x-twist-x-roll @ petalSpineCurl=270 x petalTwist=-180 x petalRoll=330": { mm: 0.587, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs -0.312 mm against its nearest face (petalSpineCurl=270 x petalTwist=-180 x petalRoll=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "curl-x-twist-x-roll @ petalSpineCurl=270 x petalTwist=180 x petalRoll=0": { mm: 0.275, note: "a FACE of the triple (petalSpineCurl x petalTwist moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "curl-x-twist-x-roll @ petalSpineCurl=270 x petalTwist=180 x petalRoll=330": { mm: 0.61, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs -0.334 mm against its nearest face (petalSpineCurl=270 x petalTwist=180 x petalRoll=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "curl-x-twist-x-roll @ petalSpineCurl=360 x petalTwist=0 x petalRoll=330": { mm: 0.436, note: "a FACE of the triple (petalSpineCurl x petalRoll moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "curl-x-twist-x-roll @ petalSpineCurl=360 x petalTwist=-180 x petalRoll=0": { mm: 0.008, note: "a FACE of the triple (petalSpineCurl x petalTwist moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree — RE-RECORDED BY THE FOOT TARGETS (gate-hygiene, Oct 6): was 0.01 mm, now 0.008 mm. `measureWall` used to drop the foot rows, so a tip coiling back onto its OWN FOOT was invisible to `self`; the foot now joins as a SELF target (never a query, never inside the seam window, so `wall` is unchanged by construction). The worst site is now at u 0.898, the curl's tip against its own foot. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "curl-x-twist-x-roll @ petalSpineCurl=360 x petalTwist=-180 x petalRoll=330": { mm: 0.19, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs -0.459 mm against its nearest face (petalSpineCurl=360 x petalTwist=-180 x petalRoll=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721) — RE-RECORDED BY THE FOOT TARGETS (gate-hygiene, Oct 6): was 0.469 mm, now 0.19 mm. `measureWall` used to drop the foot rows, so a tip coiling back onto its OWN FOOT was invisible to `self`; the foot now joins as a SELF target (never a query, never inside the seam window, so `wall` is unchanged by construction). The worst site is now at u 0.983, the curl's tip against its own foot. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "curl-x-twist-x-roll @ petalSpineCurl=360 x petalTwist=180 x petalRoll=0": { mm: 0.007, note: "a FACE of the triple (petalSpineCurl x petalTwist moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "curl-x-twist-x-roll @ petalSpineCurl=360 x petalTwist=180 x petalRoll=330": { mm: 0.19, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs -0.520 mm against its nearest face (petalSpineCurl=360 x petalTwist=180 x petalRoll=0) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721) — RE-RECORDED BY THE FOOT TARGETS (gate-hygiene, Oct 6): was 0.527 mm, now 0.19 mm. `measureWall` used to drop the foot rows, so a tip coiling back onto its OWN FOOT was invisible to `self`; the foot now joins as a SELF target (never a query, never inside the seam window, so `wall` is unchanged by construction). The worst site is now at u 0.983, the curl's tip against its own foot. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },

  /* ===== cup-x-tipshape-x-width (the headroom PR, §21) */
  "cup-x-tipshape-x-width @ petalCup=1 x petalTipShape=1.7 x petalWidth=30": { mm: 0.92, note: "a FACE of the triple (petalCup x petalWidth moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "cup-x-tipshape-x-width @ petalCup=1 x petalTipShape=3 x petalWidth=16": { mm: 0.788, note: "a FACE of the triple (petalCup x petalTipShape moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "cup-x-tipshape-x-width @ petalCup=1 x petalTipShape=3 x petalWidth=30": { mm: 0.457, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs 0.331 mm against its nearest face (petalCup=1 x petalTipShape=3 x petalWidth=16) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },
  "cup-x-tipshape-x-width @ petalCup=1.2 x petalTipShape=1.7 x petalWidth=30": { mm: 0.884, note: "a FACE of the triple (petalCup x petalWidth moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "cup-x-tipshape-x-width @ petalCup=1.2 x petalTipShape=3 x petalWidth=16": { mm: 0.743, note: "a FACE of the triple (petalCup x petalTipShape moved, the third axis at its default) \u2014 the same state a pair would measure; declared here because the triple produces the key. Measured on the headroom PR's tree" },
  "cup-x-tipshape-x-width @ petalCup=1.2 x petalTipShape=3 x petalWidth=30": { mm: 0.39, note: "THE TRIPLE'S OWN CELL, all three axes off their defaults: the third control costs 0.352 mm against its nearest face (petalCup=1.2 x petalTipShape=3 x petalWidth=16) \u2014 reported, never a bar. Measured by the gate on the headroom PR's tree, EXPORT, Node 22 (docs/bloom-organic-variance-form-outcome.md \u00a721)" },

  /* ===== None (the headroom PR, §21) */
  /* ---------------------------------------- THE INFLORESCENCE (build 2)
     Measured by `--emit` on the node-laws tree. Every 0.000 here is an EDGE
     CROSSING — the two parts pass through each other — and every positive
     number a vertex-to-surface approach. The intended joins (a floret and its
     own pedicel, a pedicel or petiole in the rachis's own solid, a sessile
     hub in its wall) are excluded by construction and are NOT here. */
  'inflo-length-x-tilt @ pedicelLength=5 x petalTilt=25': { mm: 0, note: "a 5 mm pedicel stands its floret beside the rachis and the floret's own petals reach back onto it (floret-stem, the floret's own rod excluded) — at every tilt measured, so the length alone reaches it" + ' — measured on the node-laws tree (754e3aa + this session), Node 22, EXPORT, emitted vertices against emitted triangles.' },
  'inflo-length-x-tilt @ pedicelLength=5 x petalTilt=60': { mm: 0, note: "a 5 mm pedicel stands its floret beside the rachis and the floret's own petals reach back onto it (floret-stem, the floret's own rod excluded) — at every tilt measured, so the length alone reaches it" + ' — measured on the node-laws tree (754e3aa + this session), Node 22, EXPORT, emitted vertices against emitted triangles.' },
  'inflo-length-x-tilt @ pedicelLength=5 x petalTilt=90': { mm: 0, note: "a 5 mm pedicel stands its floret beside the rachis and the floret's own petals reach back onto it (floret-stem, the floret's own rod excluded) — at every tilt measured, so the length alone reaches it" + ' — measured on the node-laws tree (754e3aa + this session), Node 22, EXPORT, emitted vertices against emitted triangles.' },
  'inflo-length-x-tilt @ pedicelLength=5 x petalTilt=120': { mm: 0, note: "a 5 mm pedicel stands its floret beside the rachis and the floret's own petals reach back onto it (floret-stem, the floret's own rod excluded) — at every tilt measured, so the length alone reaches it" + ' — measured on the node-laws tree (754e3aa + this session), Node 22, EXPORT, emitted vertices against emitted triangles.' },
  'inflo-scale-x-angle @ floretScale=0.6 x pedicelAngle=-60': { mm: 0, note: "at -60, 60 and 90 deg the floret's petals reach the free rachis at every size measured — the angle alone does it (a rod near the rachis's own direction carries its floret's disc across it)" + ' — measured on the node-laws tree (754e3aa + this session), Node 22, EXPORT, emitted vertices against emitted triangles.' },
  'inflo-scale-x-angle @ floretScale=0.6 x pedicelAngle=60': { mm: 0, note: "at -60, 60 and 90 deg the floret's petals reach the free rachis at every size measured — the angle alone does it (a rod near the rachis's own direction carries its floret's disc across it)" + ' — measured on the node-laws tree (754e3aa + this session), Node 22, EXPORT, emitted vertices against emitted triangles.' },
  'inflo-scale-x-angle @ floretScale=0.6 x pedicelAngle=90': { mm: 0, note: "at -60, 60 and 90 deg the floret's petals reach the free rachis at every size measured — the angle alone does it (a rod near the rachis's own direction carries its floret's disc across it)" + ' — measured on the node-laws tree (754e3aa + this session), Node 22, EXPORT, emitted vertices against emitted triangles.' },
  'inflo-scale-x-angle @ floretScale=0.2 x pedicelAngle=-60': { mm: 0, note: "at -60, 60 and 90 deg the floret's petals reach the free rachis at every size measured — the angle alone does it (a rod near the rachis's own direction carries its floret's disc across it)" + ' — measured on the node-laws tree (754e3aa + this session), Node 22, EXPORT, emitted vertices against emitted triangles.' },
  'inflo-scale-x-angle @ floretScale=0.2 x pedicelAngle=60': { mm: 0, note: "at -60, 60 and 90 deg the floret's petals reach the free rachis at every size measured — the angle alone does it (a rod near the rachis's own direction carries its floret's disc across it)" + ' — measured on the node-laws tree (754e3aa + this session), Node 22, EXPORT, emitted vertices against emitted triangles.' },
  'inflo-scale-x-angle @ floretScale=0.2 x pedicelAngle=90': { mm: 0, note: "at -60, 60 and 90 deg the floret's petals reach the free rachis at every size measured — the angle alone does it (a rod near the rachis's own direction carries its floret's disc across it)" + ' — measured on the node-laws tree (754e3aa + this session), Node 22, EXPORT, emitted vertices against emitted triangles.' },
  'inflo-scale-x-angle @ floretScale=1 x pedicelAngle=-60': { mm: 0, note: "at -60, 60 and 90 deg the floret's petals reach the free rachis at every size measured — the angle alone does it (a rod near the rachis's own direction carries its floret's disc across it)" + ' — measured on the node-laws tree (754e3aa + this session), Node 22, EXPORT, emitted vertices against emitted triangles.' },
  'inflo-scale-x-angle @ floretScale=1 x pedicelAngle=60': { mm: 0, note: "at -60, 60 and 90 deg the floret's petals reach the free rachis at every size measured — the angle alone does it (a rod near the rachis's own direction carries its floret's disc across it)" + ' — measured on the node-laws tree (754e3aa + this session), Node 22, EXPORT, emitted vertices against emitted triangles.' },
  'inflo-scale-x-angle @ floretScale=1 x pedicelAngle=90': { mm: 0, note: "at -60, 60 and 90 deg the floret's petals reach the free rachis at every size measured — the angle alone does it (a rod near the rachis's own direction carries its floret's disc across it)" + ' — measured on the node-laws tree (754e3aa + this session), Node 22, EXPORT, emitted vertices against emitted triangles.' },
  'inflo-leafangle-x-pedicelangle @ leafAngle=35 x pedicelAngle=0': { mm: 0, note: 'the leaf crosses its pedicel or the floret it carries — the two rods converge (the leaf steeper) or the leaf is longer than the floret is far out (an edge crossing)' + ' — measured on the node-laws tree (754e3aa + this session), Node 22, EXPORT, emitted vertices against emitted triangles.' },
  /* THE DEFAULT RACEME'S OWN FLORET-FLORET APPROACH (build 3) — one state, three grids, one number. */
  /* BUILD 3 — THE REACH INSET'S OWN CELLS (14 new, 3 re-recorded above, 9
     retired: all seven of `inflo-length-x-angle`, which CLEARS, and the two
     corymb cells at 40 mm). Every 0.000 is an edge crossing. */
  /* BUILD 3, RULING 1 — THE FLORETS' OWN INTERNODE FLOOR RE-RECORDS THIS WHOLE
     FAMILY. The floor (17.97 mm on the default raceme against the 16.4 mm the
     reach inset left) spreads every node pair past the florets' own emitted
     reach, so TWENTY-FOUR declared cells CLEAR and are REMOVED here (the
     shipped raceme's own 0.676 mm through three grids reads 9.614 mm; every
     gradient, length, leaf-angle and corymb cell the reach inset declared
     reads 1.003 to 15.000). What the floor cannot clear is declared below with
     its mechanism (Eva: declare, never clamp): the gradient at ZERO on both
     gradient grids — the single-axis cell on each — and the corymb's sessile
     cell at 60 deg (re-recorded above). `inflo-length-x-tilt-ff` CLEARS and
     `inflo-leaf-nodes-x-leafangle` loses its node axis to the floor (see
     COMBINATION_INERT). Verdicts moved: length-x-tilt-ff single-reaches ->
     clears, corymb single-reaches -> product-only, leaf-nodes product-only ->
     clears. The same cells at 0.000 are the harness's INFLO_APPROACH_XFAIL row
     `NODE LAWS: gradient 0 (every pedicel the top's)`, one state read twice. */
  'inflo-gradient-x-angle @ pedicelGradient=0 x pedicelAngle=35': { mm: 0, note: 'THE GRADIENT AT ZERO — every pedicel the TOP pedicel\'s length, so the lowest floret stands on a rod no longer than the one above it: node 3 passes through node 2 (an edge crossing). The floor is derived for EQUAL pedicels and the gradient at 0 is exactly that case, so this is the floor\'s own declared residual, not a product: the single-axis cell of this grid (the shipped 35 deg), and the only cell of the pair under the bar — the harness declares the same state in INFLO_APPROACH_XFAIL with the mechanism' + ' — measured by build 3 (ruling 1), Node 22, EXPORT, emitted vertices against emitted triangles.' },
  'inflo-gradient-x-tilt @ pedicelGradient=0 x petalTilt=25': { mm: 0, note: 'the same gradient-0 state through the gradient-x-tilt grid — see inflo-gradient-x-angle @ 0 x 35; at tilt 60 and 90 the same gradient clears (4.538 and 8.769 mm), so the single-axis cell is the only one under the bar' },
  /* THE NODE BELOW (Eva's change 1, the other side of the widened seating) —
     the `leaf-pedicel` measure, the leaf against every emitted pedicel rod.
     All three are the PEDICEL TWO NODES BELOW on the leaf's own azimuth: the
     leaf stands `2 x internode - offset` above it, and the node law's pitch
     floor (two pedicel radii) was set for the pedicels against each other,
     never for a leaf seated between them. Declared, never clamped (Eva:
     "declare that cell with its mechanism rather than clamping anything
     silently"). The same state on the pre-change tree reads -0.248 mm
     (interpenetrating) at 12 nodes; the wider seating takes it to -0.378. */
  'inflo-leafangle-x-pedicelangle @ leafAngle=60 x pedicelAngle=35': { mm: 0, note: 'the leaf crosses its pedicel or the floret it carries — the two rods converge (the leaf steeper) or the leaf is longer than the floret is far out (an edge crossing)' + ' — measured on the node-laws tree (754e3aa + this session), Node 22, EXPORT, emitted vertices against emitted triangles.' },
  'inflo-leafangle-x-pedicelangle @ leafAngle=60 x pedicelAngle=0': { mm: 0, note: 'the leaf crosses its pedicel or the floret it carries — the two rods converge (the leaf steeper) or the leaf is longer than the floret is far out (an edge crossing)' + ' — measured on the node-laws tree (754e3aa + this session), Node 22, EXPORT, emitted vertices against emitted triangles.' },
  'inflo-corymb-angle-x-length @ pedicelAngle=60 x pedicelLength=0': { mm: 0.2144, note: 'RE-RECORDED by build 3 ruling 1 (the florets\' own internode floor): read 0.000 (an edge crossing) through builds 2 and 3 Phase A; under the floor the three level-topped heads on a 60 mm rachis stand 0.2144 mm apart — the ONE corymb cell still under the bar, an INTERIOR cell (the sessile top at 60 deg), so the pair is PRODUCT-ONLY now. The floor is derived for EQUAL pedicels and the corymb lengthens the lower ones to one level, which is why the floor clears the other eight cells and not this one' + ' — measured by build 3 (ruling 1), Node 22, EXPORT, emitted vertices against emitted triangles.' },
  /* ===== THE FOOT JOINS THE MEASURE (gate-hygiene session, Oct 6) — 34 cells
     that cleared while `measureWall` dropped the foot rows and read under the bar
     once the foot is a SELF target. Every one is a tip coiling onto its own foot:
     `petalSpineCurl` 360 alone reads 1.230 -> 0.676 mm at u 0.932 (the curl-360
     census fold, 920 pairs, already a declared matrix row), and on the inner
     whorls the composed state (block 44) reads 1.222 -> 0.199 at u 0.856. The
     geometry did not move; the instrument stopped excluding the failure it
     doubts (the fifth durable rule). */
  "cup-x-curl @ petalCup=0 x petalSpineCurl=360": { mm: 0.676, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.23 mm (clear) while `measureWall` dropped the foot rows, now 0.676 mm at u 0.932. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT. TRUE CAUSE (Eva's ruling, Oct 6): petalSpineCurl 360 ALONE reaches this — every other axis of this cell is at its default, so it is not this pair's or triple's hazard. The single-control guard is SELF_XFAIL['curl-max'] in tools/bloom-wall-thickness.mjs; this entry stays because the number appears here and removing it would redden CG2." },
  "cup-x-curl @ petalCup=0.6 x petalSpineCurl=360": { mm: 0.692, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.024 mm (clear) while `measureWall` dropped the foot rows, now 0.692 mm at u 0.932. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "curl-x-buckle @ petalSpineCurl=360 x buckleAmp=0": { mm: 0.676, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.23 mm (clear) while `measureWall` dropped the foot rows, now 0.676 mm at u 0.932. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT. TRUE CAUSE (Eva's ruling, Oct 6): petalSpineCurl 360 ALONE reaches this — every other axis of this cell is at its default, so it is not this pair's or triple's hazard. The single-control guard is SELF_XFAIL['curl-max'] in tools/bloom-wall-thickness.mjs; this entry stays because the number appears here and removing it would redden CG2." },
  "curl-x-buckle @ petalSpineCurl=360 x buckleAmp=0.2": { mm: 0.644, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.061 mm (clear) while `measureWall` dropped the foot rows, now 0.644 mm at u 0.910. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "density-x-curl @ infillDensity=20 x petalSpineCurl=360": { mm: 0.676, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.23 mm (clear) while `measureWall` dropped the foot rows, now 0.676 mm at u 0.932. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT. TRUE CAUSE (Eva's ruling, Oct 6): petalSpineCurl 360 ALONE reaches this — every other axis of this cell is at its default, so it is not this pair's or triple's hazard. The single-control guard is SELF_XFAIL['curl-max'] in tools/bloom-wall-thickness.mjs; this entry stays because the number appears here and removing it would redden CG2." },
  "density-x-curl @ infillDensity=8 x petalSpineCurl=360": { mm: 0.676, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.23 mm (clear) while `measureWall` dropped the foot rows, now 0.676 mm at u 0.932. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "density-x-curl @ infillDensity=24 x petalSpineCurl=360": { mm: 0.676, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.23 mm (clear) while `measureWall` dropped the foot rows, now 0.676 mm at u 0.932. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "density-x-curl @ infillDensity=40 x petalSpineCurl=360": { mm: 0.676, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.23 mm (clear) while `measureWall` dropped the foot rows, now 0.676 mm at u 0.932. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "gradient-x-curl @ petalCupGradient=0 x petalSpineCurl=360": { mm: 0.676, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.23 mm (clear) while `measureWall` dropped the foot rows, now 0.676 mm at u 0.932. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT. TRUE CAUSE (Eva's ruling, Oct 6): petalSpineCurl 360 ALONE reaches this — every other axis of this cell is at its default, so it is not this pair's or triple's hazard. The single-control guard is SELF_XFAIL['curl-max'] in tools/bloom-wall-thickness.mjs; this entry stays because the number appears here and removing it would redden CG2." },
  "gradient-x-curl @ petalCupGradient=0.6 x petalSpineCurl=360": { mm: 0.691, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.123 mm (clear) while `measureWall` dropped the foot rows, now 0.691 mm at u 0.932. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "gradient-x-curl @ petalCupGradient=0.9 x petalSpineCurl=360": { mm: 0.695, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.058 mm (clear) while `measureWall` dropped the foot rows, now 0.695 mm at u 0.932. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "curl-x-twist @ petalSpineCurl=360 x petalTwist=0": { mm: 0.676, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.23 mm (clear) while `measureWall` dropped the foot rows, now 0.676 mm at u 0.932. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT. TRUE CAUSE (Eva's ruling, Oct 6): petalSpineCurl 360 ALONE reaches this — every other axis of this cell is at its default, so it is not this pair's or triple's hazard. The single-control guard is SELF_XFAIL['curl-max'] in tools/bloom-wall-thickness.mjs; this entry stays because the number appears here and removing it would redden CG2." },
  "lobedwidth-x-leafangle @ leafAngle=70 x lobedWidth=34": { mm: 0.6991, note: "leafAngle 70 ALONE reaches this (the SIMPLE leaf's own `leafangle-x-stem` reads the same class); the lobed envelope moves it by at most 0.11 mm. NEW with S4b's lobed pair, measured on this tree, Node 22, EXPORT." },
  "lobedwidth-x-leafangle @ leafAngle=70 x lobedWidth=10": { mm: 0.5865, note: "leafAngle 70 ALONE reaches this (the SIMPLE leaf's own `leafangle-x-stem` reads the same class); the lobed envelope moves it by at most 0.11 mm. NEW with S4b's lobed pair, measured on this tree, Node 22, EXPORT." },
  "lobedwidth-x-leafangle @ leafAngle=70 x lobedWidth=40": { mm: 0.6991, note: "leafAngle 70 ALONE reaches this (the SIMPLE leaf's own `leafangle-x-stem` reads the same class); the lobed envelope moves it by at most 0.11 mm. NEW with S4b's lobed pair, measured on this tree, Node 22, EXPORT." },
  "lobedwidth-x-leafangle @ leafAngle=85 x lobedWidth=34": { mm: 0.0, note: "leafAngle 85 ALONE reaches this (the SIMPLE leaf's own `leafangle-x-stem` reads the same class); the lobed envelope moves it by at most 0.11 mm. NEW with S4b's lobed pair, measured on this tree, Node 22, EXPORT." },
  "lobedwidth-x-leafangle @ leafAngle=85 x lobedWidth=10": { mm: 0.0, note: "leafAngle 85 ALONE reaches this (the SIMPLE leaf's own `leafangle-x-stem` reads the same class); the lobed envelope moves it by at most 0.11 mm. NEW with S4b's lobed pair, measured on this tree, Node 22, EXPORT." },
  "lobedwidth-x-leafangle @ leafAngle=85 x lobedWidth=40": { mm: 0.0, note: "leafAngle 85 ALONE reaches this (the SIMPLE leaf's own `leafangle-x-stem` reads the same class); the lobed envelope moves it by at most 0.11 mm. NEW with S4b's lobed pair, measured on this tree, Node 22, EXPORT." },
  "lobedepth-x-curl @ lobeDepth=0 x petalSpineCurl=360": { mm: 0.676, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.23 mm (clear) while `measureWall` dropped the foot rows, now 0.676 mm at u 0.932. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT. TRUE CAUSE (Eva's ruling, Oct 6): petalSpineCurl 360 ALONE reaches this — every other axis of this cell is at its default, so it is not this pair's or triple's hazard. The single-control guard is SELF_XFAIL['curl-max'] in tools/bloom-wall-thickness.mjs; this entry stays because the number appears here and removing it would redden CG2." },
  "lobedepth-x-curl @ lobeDepth=0.3 x petalSpineCurl=360": { mm: 0.676, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.221 mm (clear) while `measureWall` dropped the foot rows, now 0.676 mm at u 0.932. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "lobedepth-x-curl @ lobeDepth=0.6 x petalSpineCurl=360": { mm: 0.677, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.221 mm (clear) while `measureWall` dropped the foot rows, now 0.677 mm at u 0.933. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "lobedepth-x-curl @ lobeDepth=1 x petalSpineCurl=360": { mm: 0.677, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.22 mm (clear) while `measureWall` dropped the foot rows, now 0.677 mm at u 0.933. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "curl-x-cup-x-twist @ petalSpineCurl=360 x petalCup=0 x petalTwist=0": { mm: 0.676, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.23 mm (clear) while `measureWall` dropped the foot rows, now 0.676 mm at u 0.932. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT. TRUE CAUSE (Eva's ruling, Oct 6): petalSpineCurl 360 ALONE reaches this — every other axis of this cell is at its default, so it is not this pair's or triple's hazard. The single-control guard is SELF_XFAIL['curl-max'] in tools/bloom-wall-thickness.mjs; this entry stays because the number appears here and removing it would redden CG2." },
  "cup-x-roll-x-curl @ petalCup=0 x petalRoll=0 x petalSpineCurl=360": { mm: 0.676, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.23 mm (clear) while `measureWall` dropped the foot rows, now 0.676 mm at u 0.932. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT. TRUE CAUSE (Eva's ruling, Oct 6): petalSpineCurl 360 ALONE reaches this — every other axis of this cell is at its default, so it is not this pair's or triple's hazard. The single-control guard is SELF_XFAIL['curl-max'] in tools/bloom-wall-thickness.mjs; this entry stays because the number appears here and removing it would redden CG2." },
  "cup-x-roll-x-curl @ petalCup=0 x petalRoll=-330 x petalSpineCurl=360": { mm: 0.128, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.176 mm (clear) while `measureWall` dropped the foot rows, now 0.128 mm at u 0.898. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "cup-x-roll-x-curl @ petalCup=-0.8 x petalRoll=0 x petalSpineCurl=360": { mm: 0.04, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.239 mm (clear) while `measureWall` dropped the foot rows, now 0.04 mm at u 0.946. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "curl-x-twist-x-roll @ petalSpineCurl=360 x petalTwist=0 x petalRoll=0": { mm: 0.676, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.23 mm (clear) while `measureWall` dropped the foot rows, now 0.676 mm at u 0.932. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT. TRUE CAUSE (Eva's ruling, Oct 6): petalSpineCurl 360 ALONE reaches this — every other axis of this cell is at its default, so it is not this pair's or triple's hazard. The single-control guard is SELF_XFAIL['curl-max'] in tools/bloom-wall-thickness.mjs; this entry stays because the number appears here and removing it would redden CG2." },
  "layers-x-curl-x-innercurl @ layerCount=1 x petalSpineCurl=360 x innerCurl=0": { mm: 0.676, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.23 mm (clear) while `measureWall` dropped the foot rows, now 0.676 mm at u 0.932. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT. TRUE CAUSE (Eva's ruling, Oct 6): petalSpineCurl 360 ALONE reaches this — every other axis of this cell is at its default, so it is not this pair's or triple's hazard. The single-control guard is SELF_XFAIL['curl-max'] in tools/bloom-wall-thickness.mjs; this entry stays because the number appears here and removing it would redden CG2." },
  "layers-x-curl-x-innercurl @ layerCount=1 x petalSpineCurl=360 x innerCurl=360": { mm: 0.676, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.23 mm (clear) while `measureWall` dropped the foot rows, now 0.676 mm at u 0.932. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "layers-x-curl-x-innercurl @ layerCount=3 x petalSpineCurl=0 x innerCurl=360": { mm: 0.199, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.222 mm (clear) while `measureWall` dropped the foot rows, now 0.199 mm at u 0.856. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "layers-x-curl-x-innercurl @ layerCount=3 x petalSpineCurl=180 x innerCurl=360": { mm: 0.199, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.222 mm (clear) while `measureWall` dropped the foot rows, now 0.199 mm at u 0.856. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "layers-x-curl-x-innercurl @ layerCount=3 x petalSpineCurl=270 x innerCurl=360": { mm: 0.199, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.222 mm (clear) while `measureWall` dropped the foot rows, now 0.199 mm at u 0.856. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "layers-x-curl-x-innercurl @ layerCount=3 x petalSpineCurl=360 x innerCurl=0": { mm: 0.199, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.222 mm (clear) while `measureWall` dropped the foot rows, now 0.199 mm at u 0.856. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "layers-x-curl-x-innercurl @ layerCount=3 x petalSpineCurl=360 x innerCurl=360": { mm: 0.199, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.222 mm (clear) while `measureWall` dropped the foot rows, now 0.199 mm at u 0.856. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "layers-x-curl-x-innercurl @ layerCount=6 x petalSpineCurl=0 x innerCurl=360": { mm: 0.104, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.213 mm (clear) while `measureWall` dropped the foot rows, now 0.104 mm at u 0.803. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "layers-x-curl-x-innercurl @ layerCount=6 x petalSpineCurl=180 x innerCurl=360": { mm: 0.104, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.213 mm (clear) while `measureWall` dropped the foot rows, now 0.104 mm at u 0.803. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "layers-x-curl-x-innercurl @ layerCount=6 x petalSpineCurl=270 x innerCurl=0": { mm: 0.865, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.216 mm (clear) while `measureWall` dropped the foot rows, now 0.865 mm at u 0.802. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "layers-x-curl-x-innercurl @ layerCount=6 x petalSpineCurl=270 x innerCurl=360": { mm: 0.104, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.213 mm (clear) while `measureWall` dropped the foot rows, now 0.104 mm at u 0.803. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "layers-x-curl-x-innercurl @ layerCount=6 x petalSpineCurl=360 x innerCurl=0": { mm: 0.104, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.213 mm (clear) while `measureWall` dropped the foot rows, now 0.104 mm at u 0.803. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  "layers-x-curl-x-innercurl @ layerCount=6 x petalSpineCurl=360 x innerCurl=360": { mm: 0.104, note: "NEW UNDER THE BAR BY THE FOOT TARGETS (gate-hygiene, Oct 6): read 1.213 mm (clear) while `measureWall` dropped the foot rows, now 0.104 mm at u 0.803. Nothing in the geometry moved (0 floats, the byte partition in docs/bloom-gate-hygiene-outcome.md); the instrument can now see a tip coiling onto its own foot, which is the curl-360 census fold (`petalSpineCurl max (360)`, declared in SELF_INTERSECTION_XFAIL) and, on the inner whorls, block 44's composed state. Measured on main's geometry at 7af97f4, Node 22, EXPORT." },
  /* ===== THE SEPAL PAIRS (R6, Oct 9): 26 cells under the bar, found the day
     the sepal was first measured on `self`. Declared with their numbers so the
     gate stays a gate (CG2/CG3 both ways); NOT fixed and NOT tuned around —
     docs/bloom-sepal-discovery.md §9 lists them as questions for Eva. */
  'sepalcup-x-sepalcurl @ sepalCup=0.9 x sepalSpineCurl=270': { mm: 0.972, note: "NEW (R6, Oct 9): the petal's cup x curl mechanism on the sepal's shorter blade; neither single axis reaches the bar (cup 1.2 alone 1.152, curl 360 alone 1.218). Measured on main at 2e096bf, Node 22. A question for Eva, not fixed. RULED (Eva, Oct 9, §9.4): kept declared, the treatment the petal's own recorded pairs carry (the petal `cup-x-curl` cells in this list, held both ways by CG3; docs/bloom-combination-gate.md). Unmoved by §9.1, which narrows only the roll." },
  'sepalcup-x-sepalcurl @ sepalCup=0.9 x sepalSpineCurl=360': { mm: 0.135, note: "NEW (R6, Oct 9): the petal's cup x curl mechanism on the sepal's shorter blade; neither single axis reaches the bar (cup 1.2 alone 1.152, curl 360 alone 1.218). Measured on main at 2e096bf, Node 22. A question for Eva, not fixed. RULED (Eva, Oct 9, §9.4): kept declared, the treatment the petal's own recorded pairs carry (the petal `cup-x-curl` cells in this list, held both ways by CG3; docs/bloom-combination-gate.md). Unmoved by §9.1, which narrows only the roll." },
  'sepalcup-x-sepalcurl @ sepalCup=1.2 x sepalSpineCurl=270': { mm: 0.403, note: "NEW (R6, Oct 9): the petal's cup x curl mechanism on the sepal's shorter blade; neither single axis reaches the bar (cup 1.2 alone 1.152, curl 360 alone 1.218). Measured on main at 2e096bf, Node 22. A question for Eva, not fixed. RULED (Eva, Oct 9, §9.4): kept declared, the treatment the petal's own recorded pairs carry (the petal `cup-x-curl` cells in this list, held both ways by CG3; docs/bloom-combination-gate.md). Unmoved by §9.1, which narrows only the roll." },
  'sepalcup-x-sepalcurl @ sepalCup=1.2 x sepalSpineCurl=360': { mm: 0.008, note: "NEW (R6, Oct 9): the petal's cup x curl mechanism on the sepal's shorter blade; neither single axis reaches the bar (cup 1.2 alone 1.152, curl 360 alone 1.218). Measured on main at 2e096bf, Node 22. A question for Eva, not fixed. RULED (Eva, Oct 9, §9.4): kept declared, the treatment the petal's own recorded pairs carry (the petal `cup-x-curl` cells in this list, held both ways by CG3; docs/bloom-combination-gate.md). Unmoved by §9.1, which narrows only the roll." },
  'sepalcup-x-sepalroll @ sepalCup=0.6 x sepalRoll=180': { mm: 0.422, note: "the cup x roll mechanism on the sepal ring, re-measured at the NARROWED sepal roll (Eva's §9.1, Oct 9: the sepal roll is -180..180, where roll ALONE clears at 1.128 mm). Under the bar only where the cup is 0.6 or more AND the roll at its 180 maximum — the same magnitude this cell carried before the narrowing; the eight cells at roll 270 and 330 (worst 0.009 mm) are gone with the range. KEPT DECLARED by Eva's §9.4 ruling — the petal's own recorded pairs' treatment: a declared magnitude, held both ways by CG3. Measured on the branch over 2415048, Node 22." },
  'sepalcup-x-sepalroll @ sepalCup=0.9 x sepalRoll=180': { mm: 0.25, note: "the cup x roll mechanism on the sepal ring, re-measured at the NARROWED sepal roll (Eva's §9.1, Oct 9: the sepal roll is -180..180, where roll ALONE clears at 1.128 mm). Under the bar only where the cup is 0.6 or more AND the roll at its 180 maximum — the same magnitude this cell carried before the narrowing; the eight cells at roll 270 and 330 (worst 0.009 mm) are gone with the range. KEPT DECLARED by Eva's §9.4 ruling — the petal's own recorded pairs' treatment: a declared magnitude, held both ways by CG3. Measured on the branch over 2415048, Node 22." },
  'sepalcup-x-sepalroll @ sepalCup=1.2 x sepalRoll=180': { mm: 0.162, note: "the cup x roll mechanism on the sepal ring, re-measured at the NARROWED sepal roll (Eva's §9.1, Oct 9: the sepal roll is -180..180, where roll ALONE clears at 1.128 mm). Under the bar only where the cup is 0.6 or more AND the roll at its 180 maximum — the same magnitude this cell carried before the narrowing; the eight cells at roll 270 and 330 (worst 0.009 mm) are gone with the range. KEPT DECLARED by Eva's §9.4 ruling — the petal's own recorded pairs' treatment: a declared magnitude, held both ways by CG3. Measured on the branch over 2415048, Node 22." },
  'sepalcurl-x-sepaltwist @ sepalSpineCurl=180 x sepalTwist=60': { mm: 0.957, note: "NEW (R6, Oct 9): the petal's curl x twist mechanism on the sepal; twist 180 alone clears by 0.005 mm (1.005) and curl 360 alone reads 1.218. Measured on main at 2e096bf, Node 22. A question for Eva, not fixed. RULED (Eva, Oct 9, §9.4): kept declared, the treatment the petal's own recorded pairs carry (the petal `curl-x-twist` cells in this list, held both ways by CG3; docs/bloom-combination-gate.md). Unmoved by §9.1, which narrows only the roll." },
  'sepalcurl-x-sepaltwist @ sepalSpineCurl=180 x sepalTwist=120': { mm: 0.834, note: "NEW (R6, Oct 9): the petal's curl x twist mechanism on the sepal; twist 180 alone clears by 0.005 mm (1.005) and curl 360 alone reads 1.218. Measured on main at 2e096bf, Node 22. A question for Eva, not fixed. RULED (Eva, Oct 9, §9.4): kept declared, the treatment the petal's own recorded pairs carry (the petal `curl-x-twist` cells in this list, held both ways by CG3; docs/bloom-combination-gate.md). Unmoved by §9.1, which narrows only the roll." },
  'sepalcurl-x-sepaltwist @ sepalSpineCurl=180 x sepalTwist=180': { mm: 0.511, note: "NEW (R6, Oct 9): the petal's curl x twist mechanism on the sepal; twist 180 alone clears by 0.005 mm (1.005) and curl 360 alone reads 1.218. Measured on main at 2e096bf, Node 22. A question for Eva, not fixed. RULED (Eva, Oct 9, §9.4): kept declared, the treatment the petal's own recorded pairs carry (the petal `curl-x-twist` cells in this list, held both ways by CG3; docs/bloom-combination-gate.md). Unmoved by §9.1, which narrows only the roll." },
  'sepalcurl-x-sepaltwist @ sepalSpineCurl=270 x sepalTwist=60': { mm: 0.768, note: "NEW (R6, Oct 9): the petal's curl x twist mechanism on the sepal; twist 180 alone clears by 0.005 mm (1.005) and curl 360 alone reads 1.218. Measured on main at 2e096bf, Node 22. A question for Eva, not fixed. RULED (Eva, Oct 9, §9.4): kept declared, the treatment the petal's own recorded pairs carry (the petal `curl-x-twist` cells in this list, held both ways by CG3; docs/bloom-combination-gate.md). Unmoved by §9.1, which narrows only the roll." },
  'sepalcurl-x-sepaltwist @ sepalSpineCurl=270 x sepalTwist=120': { mm: 0.42, note: "NEW (R6, Oct 9): the petal's curl x twist mechanism on the sepal; twist 180 alone clears by 0.005 mm (1.005) and curl 360 alone reads 1.218. Measured on main at 2e096bf, Node 22. A question for Eva, not fixed. RULED (Eva, Oct 9, §9.4): kept declared, the treatment the petal's own recorded pairs carry (the petal `curl-x-twist` cells in this list, held both ways by CG3; docs/bloom-combination-gate.md). Unmoved by §9.1, which narrows only the roll." },
  'sepalcurl-x-sepaltwist @ sepalSpineCurl=270 x sepalTwist=180': { mm: 0.049, note: "NEW (R6, Oct 9): the petal's curl x twist mechanism on the sepal; twist 180 alone clears by 0.005 mm (1.005) and curl 360 alone reads 1.218. Measured on main at 2e096bf, Node 22. A question for Eva, not fixed. RULED (Eva, Oct 9, §9.4): kept declared, the treatment the petal's own recorded pairs carry (the petal `curl-x-twist` cells in this list, held both ways by CG3; docs/bloom-combination-gate.md). Unmoved by §9.1, which narrows only the roll." },
  'sepalcurl-x-sepaltwist @ sepalSpineCurl=360 x sepalTwist=60': { mm: 0.004, note: "NEW (R6, Oct 9): the petal's curl x twist mechanism on the sepal; twist 180 alone clears by 0.005 mm (1.005) and curl 360 alone reads 1.218. Measured on main at 2e096bf, Node 22. A question for Eva, not fixed. RULED (Eva, Oct 9, §9.4): kept declared, the treatment the petal's own recorded pairs carry (the petal `curl-x-twist` cells in this list, held both ways by CG3; docs/bloom-combination-gate.md). Unmoved by §9.1, which narrows only the roll." },
  'sepalcurl-x-sepaltwist @ sepalSpineCurl=360 x sepalTwist=120': { mm: 0.005, note: "NEW (R6, Oct 9): the petal's curl x twist mechanism on the sepal; twist 180 alone clears by 0.005 mm (1.005) and curl 360 alone reads 1.218. Measured on main at 2e096bf, Node 22. A question for Eva, not fixed. RULED (Eva, Oct 9, §9.4): kept declared, the treatment the petal's own recorded pairs carry (the petal `curl-x-twist` cells in this list, held both ways by CG3; docs/bloom-combination-gate.md). Unmoved by §9.1, which narrows only the roll." },
  'sepalcurl-x-sepaltwist @ sepalSpineCurl=360 x sepalTwist=180': { mm: 0.012, note: "NEW (R6, Oct 9): the petal's curl x twist mechanism on the sepal; twist 180 alone clears by 0.005 mm (1.005) and curl 360 alone reads 1.218. Measured on main at 2e096bf, Node 22. A question for Eva, not fixed. RULED (Eva, Oct 9, §9.4): kept declared, the treatment the petal's own recorded pairs carry (the petal `curl-x-twist` cells in this list, held both ways by CG3; docs/bloom-combination-gate.md). Unmoved by §9.1, which narrows only the roll." },
  'sepalscale-x-sepalcurl @ sepalScale=1 x sepalSpineCurl=270': { mm: 0.887, note: 'NEW (R6, Oct 9): a sepal as long as the petal (size 1.00) curled 270 or more comes within 0.887 mm of itself; the shipped 0.60 clears at every curl (1.218 at 360). Measured on main at 2e096bf, Node 22. A question for Eva, not fixed. RULED A KNOWN EXCEPTION (Eva, Oct 9, §9.4): size 1.00 x curl 270 or more at 0.887 mm is recorded as an exception, not a defect to fix; the declaration and the both-ways hold of CG3 stand. Unmoved by §9.1.' },
  'sepalscale-x-sepalcurl @ sepalScale=1 x sepalSpineCurl=360': { mm: 0.887, note: 'NEW (R6, Oct 9): a sepal as long as the petal (size 1.00) curled 270 or more comes within 0.887 mm of itself; the shipped 0.60 clears at every curl (1.218 at 360). Measured on main at 2e096bf, Node 22. A question for Eva, not fixed. RULED A KNOWN EXCEPTION (Eva, Oct 9, §9.4): size 1.00 x curl 270 or more at 0.887 mm is recorded as an exception, not a defect to fix; the declaration and the both-ways hold of CG3 stand. Unmoved by §9.1.' },
});
for (const [k, e] of Object.entries(COMBINATION_XFAIL)) {
  if (!e || !(Number.isFinite(e.mm) && e.mm >= 0)) {
    throw new Error(`COMBINATION_XFAIL: "${k}" declares no approach in mm (${JSON.stringify(e)}) — an entry is {mm[, note]}, and a declaration without a number is a label`);
  }
}

/* AN AXIS MEASURED INERT, WITH ITS NUMBER (CG7). The key is
   `<pair id> @ <axis control id>`. An entry means: this control moves
   this pair's measure by AT MOST `maxMoveMm`, anywhere on the grid —
   and CG7 holds that in BOTH directions, so an axis that starts
   reaching the measure is a red saying the pair has become a real
   product pair, and a record that overstates is stale.

   WHY THIS LIST EXISTS AT ALL, rather than the pair simply being
   dropped: CG1 refuses an inert axis, correctly, and it is right to go
   on refusing an UNDECLARED one. What CG1 cannot express is "this was
   measured, it is exactly zero, and the day it stops being zero somebody
   should hear about it". That is an xfail, and this project has one
   shape for an xfail: a number the gate reads, failing both ways. */
export const COMBINATION_INERT = Object.freeze({
  /* S4 — the infill's density is bit-identically inert for `self` on both
     of its pairs; the header of `density-x-cup` has the two measurements. */
  'density-x-cup @ infillDensity': {
    maxMoveMm: 0,
    note: "the cells never reach the margins or the tip (the wall inset keeps INFILL_WALL_MM of sheet inside the outline), and `self` is the sheet against another part of itself, whose nearest approach on a cupped blade is exactly there — so the density moves it by exactly 0.000e+0 at every cup, bit-identically. Measured 2026-09-26 on this tree; the in-sheet wall between holes is the measure that sees the density and it is I11's.",
  },
  'density-x-curl @ infillDensity': {
    maxMoveMm: 0,
    note: "as `density-x-cup @ infillDensity`: 1.238 / 1.234 / 1.232 / 1.230 mm at curl 0 / 180 / 270 / 360 at density 8, 16, 24 and 40 alike. Measured 2026-09-26 on this tree; re-run 2026-09-27 at the ruled defaults (the grid now starts at density 20), CG7 still reads exactly 0.",
  },
  /* BUILD 3, RULING 1 — the florets' own internode floor holds FIVE nodes on
     the 82 mm the reach inset leaves of the shipped 120 mm rachis (floor
     17.97 mm; a sixth would need 89.9), so `floretNodes` 12 builds the SAME
     five nodes as 5 and the pair's node axis is bit-identically inert — the
     measure reads 1.000 / 3.045 mm at both counts. Declared with the number
     rather than the pair widened or dropped: the day a longer rachis base, a
     smaller floret or a lower floor lets a sixth node in, CG7 fails both ways
     and the axis is a real axis again. */
  'inflo-leaf-nodes-x-leafangle @ floretNodes': {
    maxMoveMm: 0,
    note: "the florets' own internode floor (17.97 mm on this raceme) caps the count at five on the span the reach inset leaves, so 5 and 12 asked build one layout and the measure moves by exactly 0.000e+0 mm — measured by build 3 (ruling 1), Node 22, EXPORT.",
  },
  'leafangle-x-tooth @ leafToothDepth': {
    maxMoveMm: 0,
    note: "the teeth are cut into the leaf's MARGIN and the nearest blade point to the stem is at its BASE, so the serration moves this measure by exactly 0.000e+0 at all four angles — bit-identically, not merely under the band. The leaf's own emitted vertex stream DOES move with the tooth depth, so the control is wired and reaching the leaf; it does not reach this measure. Measured 2026-09-19 on c29a8b5.",
  },
});
for (const [k, e] of Object.entries(COMBINATION_INERT)) {
  if (!e || !(Number.isFinite(e.maxMoveMm) && e.maxMoveMm >= 0)) {
    throw new Error(`COMBINATION_INERT: "${k}" declares no movement in mm (${JSON.stringify(e)}) — an entry is {maxMoveMm[, note]}, and a declaration without a number is a label`);
  }
}

/* ------------------------------------------------------------ the measures */

const num = (v) => (typeof v === 'number' ? String(Number(v.toPrecision(12))) : String(v));
export const cellKey = (pair, va, vb) => `${pair.id} @ ${pair.a.id}=${num(va)} x ${pair.b.id}=${num(vb)}`;
export const inertKey = (pair, axis) => `${pair.id} @ ${axis.id}`;

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
   The rod is excluded by the builder's OWN reported `rodAxes` (on a simple
   leaf, its one `petioleAxis`; S3 adds a compound leaf's rachis and
   stalks), never by re-deriving where the petiole is from `leafPlan`.
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
    if (m.leaf.nodeLengthsMm && !(m.leaf.nodeLengthsMm[i] > 0)) continue;   // the cap left no blade (the plan says so)
    for (const az of m.leaf.azimuths[i]) {
      const probe = new G.MeshBuilder({ exportMode });
      const rep = G.buildLeafInto(probe, m.leaf, state, i, az);
      /* EVERY ROD THE LEAF EMITTED (S3): a compound leaf's rachis segments
         and leaflet stalks beside its petiole, read off the builder's own
         `rodAxes`; on a simple leaf that list IS `[petioleAxis]`, and a
         `--root` tree that predates it falls back to exactly that. */
      const axes = Array.isArray(rep.rodAxes) ? rep.rodAxes : [rep.petioleAxis];
      const P = probe.positions;
      leaves++;
      for (let j = 0; j < P.length; j += 3) {
        const p0 = P[j], p1 = P[j + 1], p2 = P[j + 2];
        /* THE RODS THEMSELVES, named rather than the region widened. */
        if (axes.some((ax) => (G.rodAxisExcessMm ? G.rodAxisExcessMm(ax, p0, p1, p2) : segDist([p0, p1, p2], ax.inner, ax.outer) - ax.radiusMm) <= ax.radiusMm * 1e-6)) continue;
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
function measureCell(tree, DEFAULTS, pair, va, vb, wallOpts = {}) {
  return measureState(tree, DEFAULTS, pair, { ...DEFAULTS, ...(pair.base || {}), [pair.a.id]: va, [pair.b.id]: vb }, `${pair.a.id}=${num(va)} x ${pair.b.id}=${num(vb)}`, wallOpts);
}
/* `wallOpts` exists for ONE caller: the control's foot leg, which hands
   `measureWall` `{ footTargets: false }` — the instrument as it was before the
   gate-hygiene session — and requires the declared foot cells to go red. The
   shipped run never passes it. */
function measureState({ G, W, R }, DEFAULTS, pair, state, where, wallOpts = {}) {
  if (pair.measure === 'leaf-stem') return measureLeafStemApproachMm(G, state, true);
  /* THE INFILL'S OWN MEASURE — the in-sheet wall between two holes on the
     SHIPPED plan (tools/bloom-infill-wall.mjs), because `self` is
     bit-identically inert in the density (its header has the numbers). */
  if (pair.measure === 'infill-wall') return measureInfillWallMm(G, R.DEFAULTS, state);
  /* THE INFLORESCENCE'S FOUR (the node-laws session) — tools/bloom-inflo-
     approach.mjs, whose header names the joins it excludes by construction
     and why. */
  if (INFLO_MEASURES.has(pair.measure)) return measureInfloApproachMm(G, state, pair.measure);
  const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
  const m = G.buildBloomInto(acc, state);
  /* `sepal-self` — THE SAME `self`, ON EVERY SEPAL THE BUILDER EMITTED (Eva's
     ruling R6, Oct 9). `self` reads `built.petal`, the representative PETAL,
     which is never a sepal, so on a sepal twin it is INERT by construction and
     CG1 would refuse the axis for reading nothing; the control's sepal leg is
     exactly that rebuild. A cell that builds no sepal REFUSES. */
  if (pair.measure === 'sepal-self') {
    const built = m.sepals && m.sepals.built ? m.sepals.built.filter((p) => p && p.grid) : [];
    if (!built.length) throw new Error(`combination gate: "${pair.id}" at ${where} built NO sepal with a grid, so \`sepal-self\` has nothing to read.`);
    let best = { mm: Infinity };
    built.forEach((p, i) => {
      const ap = p.tipCap && p.tipCap.apex;
      const nibFromU = ap && ap.active && ap.drawnLengthMm > 0 ? ap.xLawMm / ap.drawnLengthMm : null;
      const r = W.measureWall(p.grid, { nibFromU, ...wallOpts });
      if (r.self < best.mm) best = { mm: r.self, at: { u: r.selfAt[0], v: r.selfAt[1], sepal: i }, rows: r.rows, columns: r.columns };
    });
    return { ...best, sepals: built.length };
  }
  /* `self-every` — THE SAME `self`, ON EVERY PETAL THE BUILDER EMITTED
     (`petalsAll`, each with its own captured grid), and the smallest of them.
     `self` reads ONE petal (`built.petal`, the representative of ring 0),
     which is right wherever every petal is that petal and blind wherever a
     role row makes the whorls differ: `innerCurl` never reaches ring 0, so
     on `self` it would be INERT by construction and CG1 would refuse the
     axis for reading nothing — the composed state's own fold would be
     invisible to the measure asked to find it. Used by the composed-state
     triple only; its cost is one `measureWall` per petal. */
  if (pair.measure === 'self-every') {
    let best = { mm: Infinity };
    let n = 0;
    for (const p of m.petalsAll) {
      if (!p || !p.grid) continue;
      n++;
      const ap = p.tipCap && p.tipCap.apex;
      const nibFromU = ap && ap.active && ap.drawnLengthMm > 0 ? ap.xLawMm / ap.drawnLengthMm : null;
      const r = W.measureWall(p.grid, { nibFromU, ...wallOpts });
      if (r.self < best.mm) best = { mm: r.self, at: { u: r.selfAt[0], v: r.selfAt[1], whorl: p.whorl, slot: p.slotIndex }, rows: r.rows, columns: r.columns };
    }
    if (!n) throw new Error(`combination gate: "${pair.id}" at ${where} built NO petal with a grid, so \`self-every\` has nothing to read.`);
    return { ...best, petals: n };
  }
  /* A TOOL THAT CANNOT DO ITS JOB REFUSES; it never returns a passing
     number for a question it did not answer. `built.petal` is NULL where a
     slot is declared and not built — the sphere stem's omission mask is the
     first thing in this project able to produce that, and a future pair
     reaching it must see a named refusal rather than a TypeError from
     inside the wall instrument. */
  if (!m.petal || !m.petal.grid) {
    throw new Error(`combination gate: "${pair.id}" at ${where} built NO retained petal, so the \`self\` measure has nothing to read. A pair whose grid can empty the petal needs a different measure, not a skip.`);
  }
  /* THE SAME NAMED EXCLUSION THE WALL INSTRUMENT PASSES (the apex-nib
     session): `self` is ITS quantity through ITS function, so this must hand
     it the same argument or the two owners of one measure would disagree —
     which is the whole reason this gate imports `measureWall` rather than
     carrying a second implementation. `measureWall`'s own header says why the
     region is excluded and what owns it instead. */
  const ap = m.petal.tipCap && m.petal.tipCap.apex;
  const nibFromU = ap && ap.active && ap.drawnLengthMm > 0 ? ap.xLawMm / ap.drawnLengthMm : null;
  const r = W.measureWall(m.petal.grid, { nibFromU, ...wallOpts });
  return { mm: r.self, at: { u: r.selfAt[0], v: r.selfAt[1] }, rows: r.rows, columns: r.columns };
}

export async function run({ root = HERE, only = null, pairs = PAIRS, triples = TRIPLES, wallOpts = {} } = {}) {
  const tree = await loadTree(root);
  const { R } = tree;
  const chosen = pairs.filter((p) => !only || only.test(p.id));
  const out = [];
  let builds = 0;
  const tripleRows = [];
  for (const t of triples.filter((x) => !only || only.test(x.id))) {
    const cells = [];
    const walk = (i, vals) => {
      if (i === t.axes.length) {
        const state = { ...R.DEFAULTS, ...(t.base || {}) };
        t.axes.forEach((ax, k) => { state[ax.id] = vals[k]; });
        cells.push({ vals, key: tripleKey(t, vals), ...measureState(tree, R.DEFAULTS, t, state, vals.map((v, k) => `${t.axes[k].id}=${num(v)}`).join(' x '), wallOpts) });
        builds++;
        return;
      }
      for (const v of t.axes[i].values) walk(i + 1, [...vals, v]);
    };
    walk(0, []);
    tripleRows.push({ triple: t, cells });
  }
  for (const p of chosen) {
    const grid = [];
    for (const va of p.a.values) {
      const row = [];
      for (const vb of p.b.values) { row.push({ va, vb, key: cellKey(p, va, vb), ...measureCell(tree, R.DEFAULTS, p, va, vb, wallOpts) }); builds++; }
      grid.push(row);
    }
    out.push({ pair: p, grid });
  }
  return { tree, rows: out, tripleRows, builds, skipped: pairs.length - chosen.length };
}

/* THE RECORD CONTROL'S HANDLE. `perturb` swaps ONE declared magnitude for
   a wrong one so CG3 can be SEEN to fire without a geometry mutation —
   the wall instrument's own idiom, and it exists because a clause nobody
   has watched go red is a hope. */
export async function verify({ root = HERE, quiet = false, only = null, pairs = PAIRS, triples = TRIPLES, xfail = COMBINATION_XFAIL, inert = COMBINATION_INERT, cached = null, wallOpts = {} } = {}) {
  const fails = [];
  const say = (...a) => { if (!quiet) console.log(...a); };
  /* A CACHED GRID IS REUSED ONLY WHERE IT IS PROVABLY THE SAME GRID. The
     must-fail plants several conditions that change no geometry (a
     declaration, a `verdict` value), and rebuilding 262 cells for each
     of them costs minutes to re-measure states already measured. So a
     caller may hand back a previous run's rows — and this REFUSES them
     unless the pair ids and both axes' values match value for value, so a
     cached run can never silently evaluate a clause against a different
     grid from the one the plant describes. */
  let { tree, rows, tripleRows, builds, skipped } = cached
    ? { ...cached, builds: 0 }
    : await run({ root, only, pairs, triples, wallOpts });
  if (cached) {
    const sig = (ps) => JSON.stringify(ps.map((p) => [p.id, p.a.id, p.a.values, p.b.id, p.b.values, p.base || null]));
    if (sig(rows.map((r) => r.pair)) !== sig(pairs.filter((p) => !only || only.test(p.id)))) {
      throw new Error('verify: the cached rows were built from a different grid than the pairs handed in — a cached clause evaluation must measure the grid it describes');
    }
    /* Re-attach the caller's pair objects, so a plant on a non-geometric
       field (verdict, cite, tier) is the one the clauses read. */
    const byId = new Map(pairs.map((p) => [p.id, p]));
    rows = rows.map((r) => ({ ...r, pair: byId.get(r.pair.id) || r.pair }));
    const tsig = (ts) => JSON.stringify(ts.map((t) => [t.id, t.measure, t.axes.map((a) => [a.id, a.values]), t.base || null]));
    if (tsig((tripleRows || []).map((r) => r.triple)) !== tsig(triples.filter((t) => !only || only.test(t.id)))) {
      throw new Error('verify: the cached triple cells were built from a different grid than the triples handed in');
    }
    const tById = new Map(triples.map((t) => [t.id, t]));
    tripleRows = (tripleRows || []).map((r) => ({ ...r, triple: tById.get(r.triple.id) || r.triple }));
  }
  const { G, R } = tree;
  const BAR = G.MIN_FEATURE_MM;
  if (typeof BAR !== 'number') fails.push('CG2 bar: the geometry does not export MIN_FEATURE_MM — this gate will not invent a bar');

  say('bloom combination gate — the nearest approach in millimetres on a product of TWO controls.');
  say(`  bar ${Number(BAR).toFixed(2)} mm (MIN_FEATURE_MM, imported) · EXPORT mode · band +/-${COMBINATION_TOLERANCE_MM} mm · (x) declared, (!) UNDECLARED\n`);

  const byControl = new Map(R.CONTROLS.map((c) => [c.id, c]));
  const seenKeys = new Set();
  const seenInertKeys = new Set();

  for (const { pair, grid } of rows) {
    /* ---------------------------------------------------- CG0 the grid */
    for (const ax of [pair.a, pair.b]) {
      const c = byControl.get(ax.id);
      if (!c) { fails.push(`CG0 grid: "${pair.id}" names ${ax.id}, which the registry does not declare`); continue; }
      if (ax.values.length < 2) fails.push(`CG0 grid: "${pair.id}" gives ${ax.id} ${ax.values.length} value(s) — an axis of one value is not an axis`);
      if (new Set(ax.values.map(num)).size !== ax.values.length) fails.push(`CG0 grid: "${pair.id}" repeats a value on ${ax.id} — a repeated cell costs a build and measures nothing`);
      if (!Object.is(ax.values[0], R.DEFAULTS[ax.id])) {
        fails.push(`CG0 grid: "${pair.id}" starts ${ax.id} at ${num(ax.values[0])} and the registry default is ${num(R.DEFAULTS[ax.id])} — the first value of an axis IS the single-axis column, so the verdict (CG4) would be made against a state nobody ships`);
      }
      for (const v of ax.values) {
        if (c.kind === 'slider' && !(v >= c.min && v <= c.max)) fails.push(`CG0 grid: "${pair.id}" asks ${ax.id} = ${num(v)}, outside the shipped range ${c.min}..${c.max} — a cell nobody can select is not a hazard`);
      }
    }

    /* ------------------------------------------------- CG6 provenance.
       A TIER WRITTEN AS A COMMENT IS A LABEL. The file-exists half is the
       one with teeth: a citation pointing at a doc that is not there
       reads as evidence to the next reader, which is this project's most
       repeated defect wearing a footnote. */
    if (!(pair.tier === 1 || pair.tier === 2 || pair.tier === 3)) {
      fails.push(`CG6 provenance: "${pair.id}" declares tier ${JSON.stringify(pair.tier)} — every pair states which evidence class it is in (1 cited defect, 2 shared mechanism, 3 guess), because the three are bought on different arguments and a later session must be able to tell them apart`);
    }
    if (pair.tier === 3 && pair.guess !== true) {
      fails.push(`CG6 provenance: "${pair.id}" is TIER 3 and does not declare \`guess: true\` — a guess that does not say so is read back as evidence by the next session, which is exactly how a tier-3 hunch becomes a cited fact`);
    }
    if (pair.tier !== 3 && pair.guess === true) {
      fails.push(`CG6 provenance: "${pair.id}" declares \`guess: true\` and is TIER ${pair.tier} — tiers 1 and 2 are bought on a citation and on a shared mechanism respectively, so a guess flag there is one of the two being wrong`);
    }
    if (typeof pair.cite !== 'string' || !pair.cite.trim()) {
      fails.push(`CG6 provenance: "${pair.id}" carries no citation — every pair says what put it here`);
    } else {
      /* RESOLVED AGAINST `HERE`, NEVER AGAINST `root`. `root` is where the
         GEOMETRY comes from — `bloom-xfail-magnitudes.mjs --root <worktree>`
         measures another tree's geometry against THIS tree's list — and a
         citation is part of the list. Checking it against `root` would make
         this clause fire on an older worktree for the entirely uninteresting
         reason that the doc had not been written yet. */
      const named = (pair.cite.match(/[\w./-]+\.(?:md|mjs|js|yml)/g) || []);
      const found = named.filter((f) => fs.existsSync(path.join(HERE, f)));
      if (!found.length) {
        fails.push(`CG6 provenance: "${pair.id}" cites ${named.length ? named.join(', ') + ' — none of which exists in this tree' : 'no file at all'}. A citation naming a file that is not there reads as evidence and is not; name the doc or the source that carries the argument.`);
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
    say(`  [tier ${pair.tier}${pair.guess ? ', a GUESS' : ''}] ${pair.label}`);
    say(`    measure: ${pair.measure === 'sepal-self' ? 'SEPAL SELF — every sepal\'s sheet against another part of itself (measureWall on each emitted sepal grid, the smallest)' : pair.measure === 'self' ? 'SELF — the sheet against another part of itself (measureWall, the wall instrument\'s own)' : pair.measure === 'infill-wall' ? 'THE IN-SHEET WALL between two holes on the shipped plan (bloom-infill-wall.mjs; the surface read directly, never the metric field)' : INFLO_MEASURES.has(pair.measure) ? INFLO_MEASURES.get(pair.measure) : 'LEAF BLADE against the FREE STEM (freeStemDistanceMm, the geometry\'s own; the petiole rod excluded by the builder\'s petioleAxis)'}`);
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
       makes it the must-fail's plant.)

       AN AXIS DECLARED IN `COMBINATION_INERT` IS CG7'S INSTEAD. That is a
       widening rather than a loosening: CG7 pins the number in BOTH
       directions where CG1 only asks for "more than the band", so a
       declared-inert axis is held to a strictly stronger statement. The
       must-fail's CG1 leg plants an UNDECLARED inert axis and must still
       fire, and a second leg removes the declaration and requires CG1 to
       take it back. */
    const spread = (a, b) => (Number.isFinite(a) && Number.isFinite(b) ? Math.abs(a - b) : Object.is(a, b) ? 0 : Infinity);
    const movesDownColumns = Math.max(...grid.flatMap((row, i) => (i === 0 ? [0] : row.map((c, j) => spread(c.mm, grid[0][j].mm)))));
    const movesAlongRows = Math.max(...grid.flatMap((row) => row.map((c, j) => (j === 0 ? 0 : spread(c.mm, row[0].mm)))));
    for (const [ax, other, moved] of [[pair.a, pair.b, movesDownColumns], [pair.b, pair.a, movesAlongRows]]) {
      const ik = inertKey(pair, ax);
      const declaredInert = Object.prototype.hasOwnProperty.call(inert, ik);
      if (declaredInert) {
        seenInertKeys.add(ik);
        /* ------------------------------ CG7 the inert record, both ways */
        const d = moved - inert[ik].maxMoveMm;
        if (Math.abs(d) > COMBINATION_TOLERANCE_MM) {
          fails.push(`CG7 inert: ${ik} is declared to move the measure by at most ${inert[ik].maxMoveMm.toFixed(3)} mm and moves it by ${moved.toExponential(3)} (${d > 0 ? '+' : ''}${d.toFixed(4)} mm, band +/-${COMBINATION_TOLERANCE_MM}) — ${d > 0 ? `that control now REACHES this measure, so "${pair.id}" has become a real product pair: take the entry off, let CG1 have it back, and declare whatever cells fail` : 'the record overstates the movement and is stale'}. Re-measure and re-record it in the commit that moved it, naming the move in its outcome doc.`);
        } else {
          say(`      CG7: ${ax.id} is DECLARED INERT for this measure and still is — moves it by ${moved.toExponential(3)} mm against a recorded ${inert[ik].maxMoveMm.toFixed(3)} (band +/-${COMBINATION_TOLERANCE_MM}). ${inert[ik].note}`);
        }
      } else if (!(moved > COMBINATION_TOLERANCE_MM)) {
        fails.push(`CG1 reachability: "${pair.id}" moves the measure by at most ${moved.toExponential(2)} mm across the whole of ${ax.id} — under the ${COMBINATION_TOLERANCE_MM} mm band its own records are held to, so that control does not reach this measure and the pair is a ${other.id} sweep wearing a product's clothes. Every other clause about it is vacuous. Either the pair is wrong, or the measure is, or the inertness is a finding and belongs in COMBINATION_INERT with its number.`);
      }
    }
    if (!Number.isFinite(base.mm) && (pair.measure === 'leaf-stem' || pair.measure === 'infill-wall' || INFLO_MEASURES.has(pair.measure))) {
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

    /* ------------------ CG4 what kind of pair it is, three ways, each a
       biconditional. The three values PARTITION the possibilities, so no
       declaration is unfalsifiable: `clears` fails if anything fails,
       `product-only` fails if a single fails OR if nothing interior does,
       `single-reaches` fails if no single does — and note that it says
       nothing about the interior ON PURPOSE, because a control that
       reaches the bar alone may also compose (`cup-x-roll` does: two
       singles and nine interior cells). #263's boolean had no true value
       for a pair that clears entirely, which four of the twenty do. */
    const singleFails = singles.filter((c) => Number.isFinite(c.mm) && c.mm < BAR);
    const interiorFails = interior.filter((c) => Number.isFinite(c.mm) && c.mm < BAR);
    if (!VERDICTS.includes(pair.verdict)) {
      fails.push(`CG4 verdict: "${pair.id}" declares verdict ${JSON.stringify(pair.verdict)}, which is not one of ${VERDICTS.join(' / ')} — the three partition the possibilities, and a fourth value would be a pair nothing can contradict`);
    } else if (pair.verdict === 'clears') {
      if (singleFails.length || interiorFails.length) {
        const first = (singleFails[0] || interiorFails[0]);
        fails.push(`CG4 clears: "${pair.id}" declares CLEARS and ${singleFails.length + interiorFails.length} cell(s) come within the bar — first ${first.key} at ${first.mm.toFixed(3)} mm. A measured clear that has stopped clearing is a NEW hazard on a pair nobody was watching, which is the whole reason a clearing pair is kept in the gate rather than dropped.`);
      }
    } else if (pair.verdict === 'product-only') {
      if (singleFails.length) {
        fails.push(`CG4 product-only: "${pair.id}" declares PRODUCT-ONLY and its SINGLE-axis cell ${singleFails[0].key} already fails at ${singleFails[0].mm.toFixed(3)} mm — one control reaches the hazard on its own, so the matrix can see it and this pair is not what it says it is. Either the declaration is wrong (single-reaches) or the grid has moved onto an already-failing single.`);
      }
      if (!interiorFails.length) {
        fails.push(`CG4 product-only: "${pair.id}" declares PRODUCT-ONLY and NO interior cell fails — the product reaches nothing the singles do not. Widen the grid inside the shipped ranges, or declare it CLEARS and say so.`);
      }
    } else if (pair.verdict === 'single-reaches') {
      if (!singleFails.length) {
        fails.push(`CG4 single-reaches: "${pair.id}" declares SINGLE-REACHES — i.e. one control reaches the hazard alone — and no single-axis cell fails. The declaration is now wrong in the direction that matters: if the hazard really is a product, the pair should say so, and the finding in its note is stale.`);
      }
    }
    say(`      CG4: verdict ${pair.verdict.toUpperCase()} — ${singleFails.length} single-axis cell(s) under the bar, ${interiorFails.length} interior cell(s) under it.`);
    say('');
  }

  /* ----------------------------------------------------------- THE TRIPLES.
     The same clauses as the pairs, generalised by one axis, and the same
     COMBINATION_XFAIL list — CG0 the grid, CG1 per axis, CG2/CG3 the bar and
     the magnitude both ways, CG4 a three-way verdict, CG6 provenance. The
     verdict partitions the possibilities as the pairs' does: `clears` fails
     if any cell is under the bar; `pair-reaches` requires a cell with at most
     TWO axes off their defaults under the bar; `triple-only` requires none
     of those and some all-three cell under it. */
  for (const { triple: t, cells } of (tripleRows || [])) {
    for (const ax of t.axes) {
      const c = byControl.get(ax.id);
      if (!c) { fails.push(`CG0 grid: "${t.id}" names ${ax.id}, which the registry does not declare`); continue; }
      if (ax.values.length < 2) fails.push(`CG0 grid: "${t.id}" gives ${ax.id} ${ax.values.length} value(s) — an axis of one value is not an axis`);
      if (new Set(ax.values.map(num)).size !== ax.values.length) fails.push(`CG0 grid: "${t.id}" repeats a value on ${ax.id}`);
      if (!Object.is(ax.values[0], R.DEFAULTS[ax.id])) fails.push(`CG0 grid: "${t.id}" starts ${ax.id} at ${num(ax.values[0])} and the registry default is ${num(R.DEFAULTS[ax.id])} — the first value of an axis IS the face the pairs already hold`);
      for (const v of ax.values) if (c.kind === 'slider' && !(v >= c.min && v <= c.max)) fails.push(`CG0 grid: "${t.id}" asks ${ax.id} = ${num(v)}, outside the shipped range ${c.min}..${c.max}`);
    }
    if (!(t.tier === 1 || t.tier === 2 || t.tier === 3)) fails.push(`CG6 provenance: "${t.id}" declares tier ${JSON.stringify(t.tier)}`);
    if ((t.tier === 3) !== (t.guess === true)) fails.push(`CG6 provenance: "${t.id}" is tier ${t.tier} and ${t.guess ? 'declares' : 'does not declare'} \`guess: true\` — a guess says so, and only a guess does`);
    const named = (typeof t.cite === 'string' ? t.cite.match(/[\w./-]+\.(?:md|mjs|js|yml)/g) : null) || [];
    if (!named.some((f) => fs.existsSync(path.join(HERE, f)))) fails.push(`CG6 provenance: "${t.id}" cites ${named.length ? named.join(', ') + ' — none of which exists in this tree' : 'no file at all'}`);

    for (const c of cells) seenKeys.add(c.key);
    const offCount = (c) => c.vals.filter((v, i) => !Object.is(v, t.axes[i].values[0])).length;
    const lookup = new Map(cells.map((c) => [c.vals.map(num).join('|'), c]));
    const at = (vals) => lookup.get(vals.map(num).join('|'));
    const worst = cells.reduce((x, y) => (y.mm < x.mm ? y : x));
    say(`  [tier ${t.tier}${t.guess ? ', a GUESS' : ''}] ${t.label}  (a TRIPLE — ${cells.length} cells, the extremes of each axis)`);
    say(t.measure === 'self-every'
      ? `    measure: SELF on EVERY petal — the smallest over all petals emitted (measureWall, the wall instrument's own), because a role row makes the whorls differ`
      : `    measure: SELF — the sheet against another part of itself (measureWall, the wall instrument's own)`);
    for (const c of cells) {
      const under = Number.isFinite(c.mm) && c.mm < BAR;
      const mark = under ? (Object.prototype.hasOwnProperty.call(xfail, c.key) ? 'x' : '!') : ' ';
      /* WHAT THE THIRD CONTROL COSTS: on an all-three cell, the cell against
         the NEAREST of its three faces at the same values (each face the
         same cell with one axis back at its default). Reported, never a bar. */
      let cost = '';
      if (offCount(c) === t.axes.length) {
        const faces = t.axes.map((ax, i) => at(c.vals.map((v, k) => (k === i ? ax.values[0] : v))));
        const nearest = faces.reduce((x, y) => (y.mm < x.mm ? y : x));
        cost = `   the third control costs ${(nearest.mm - c.mm).toFixed(3)} mm against its nearest face (${nearest.key.split(' @ ')[1]})`;
      }
      say(`      ${c.key.split(' @ ')[1].padEnd(58)} ${(Number.isFinite(c.mm) ? c.mm.toFixed(3) : '—').padStart(8)}${mark}${cost}`);
    }
    say(`      worst cell ${worst.mm.toFixed(3)} mm at ${worst.key.split(' @ ')[1]}.`);
    say(`      cited: ${t.cite}`);
    /* CG1 per axis: the largest change in the measure when THIS axis alone
       moves off its default, over every setting of the other two. */
    t.axes.forEach((ax, i) => {
      let moved = 0;
      for (const c of cells) {
        if (Object.is(c.vals[i], ax.values[0])) continue;
        const f = at(c.vals.map((v, k) => (k === i ? ax.values[0] : v)));
        if (f && Number.isFinite(f.mm) && Number.isFinite(c.mm)) moved = Math.max(moved, Math.abs(c.mm - f.mm));
      }
      if (!(moved > COMBINATION_TOLERANCE_MM)) fails.push(`CG1 reachability: "${t.id}" moves the measure by at most ${moved.toExponential(2)} mm across the whole of ${ax.id} — that control does not reach this measure and the triple is a pair wearing a third axis`);
    });
    for (const c of cells) {
      const declared = Object.prototype.hasOwnProperty.call(xfail, c.key);
      const under = Number.isFinite(c.mm) && c.mm < BAR;
      if (under && !declared) fails.push(`CG2 bar: ${c.key} approaches to ${c.mm.toFixed(3)} mm, under the ${BAR.toFixed(2)} mm minimum printable gap, and is NOT declared — a NEW combination hazard. Measure it, declare it with its number, and name it in the outcome doc.`);
      else if (!under && declared) fails.push(`CG2 xfail: ${c.key} now clears at ${Number.isFinite(c.mm) ? c.mm.toFixed(3) : c.mm} mm and PASSES — the declared hazard is FIXED. Remove its COMBINATION_XFAIL entry in the same commit. (was: ${xfail[c.key].mm.toFixed(3)} mm)`);
      else if (under && declared) {
        const d = c.mm - xfail[c.key].mm;
        if (Math.abs(d) > COMBINATION_TOLERANCE_MM) fails.push(`CG3 magnitude: ${c.key} is declared at ${xfail[c.key].mm.toFixed(3)} mm and reads ${c.mm.toFixed(3)} (${d > 0 ? '+' : ''}${d.toFixed(4)} mm, band +/-${COMBINATION_TOLERANCE_MM}) — ${d < 0 ? 'the declared hazard got WORSE' : 'it IMPROVED and nobody re-recorded it'}. Re-measure and re-record it in the commit that moved it.`);
      }
    }
    const lowFails = cells.filter((c) => offCount(c) < t.axes.length && Number.isFinite(c.mm) && c.mm < BAR);
    const allFails = cells.filter((c) => offCount(c) === t.axes.length && Number.isFinite(c.mm) && c.mm < BAR);
    if (!TRIPLE_VERDICTS.includes(t.verdict)) fails.push(`CG4 verdict: "${t.id}" declares verdict ${JSON.stringify(t.verdict)}, which is not one of ${TRIPLE_VERDICTS.join(' / ')}`);
    else if (t.verdict === 'clears' && (lowFails.length || allFails.length)) fails.push(`CG4 clears: "${t.id}" declares CLEARS and ${lowFails.length + allFails.length} cell(s) come within the bar — first ${(lowFails[0] || allFails[0]).key}`);
    else if (t.verdict === 'pair-reaches' && !lowFails.length) fails.push(`CG4 pair-reaches: "${t.id}" declares PAIR-REACHES and no cell with two or fewer axes off their defaults fails — the hazard is the triple's alone, so it is TRIPLE-ONLY, or it clears`);
    else if (t.verdict === 'triple-only') {
      if (lowFails.length) fails.push(`CG4 triple-only: "${t.id}" declares TRIPLE-ONLY and ${lowFails[0].key} fails with at most two axes moved — a pair reaches the hazard, and the pair gate can see it`);
      if (!allFails.length) fails.push(`CG4 triple-only: "${t.id}" declares TRIPLE-ONLY and no all-three cell fails`);
    }
    say(`      CG4: verdict ${t.verdict.toUpperCase()} — ${lowFails.length} cell(s) with two or fewer axes moved under the bar, ${allFails.length} all-three cell(s) under it.`);
    say('');
  }

  /* ---------------------------- CG5 / CG7 stray declarations. A record
     nothing measures is worse than an absence, in both lists. */
  if (!only) {
    for (const k of Object.keys(xfail)) {
      if (!seenKeys.has(k)) fails.push(`CG5 stray declaration: COMBINATION_XFAIL names "${k}", which no pair's grid produces — a declaration nothing measures is worse than an absence. Rename it, re-point the grid, or take it off.`);
    }
    for (const k of Object.keys(inert)) {
      if (!seenInertKeys.has(k)) fails.push(`CG7 stray inert: COMBINATION_INERT names "${k}", which is no pair's axis — a declared inertness nothing measures is a permanent exemption for a control nobody is watching, which is worse than an absence.`);
    }
  }

  const nTripleCells = (tripleRows || []).reduce((a, r) => a + r.cells.length, 0);
  const nCells = rows.reduce((a, r) => a + r.grid.flat().length, 0) + nTripleCells;
  const byTier = [1, 2, 3].map((t) => `${rows.filter((r) => r.pair.tier === t).length} tier-${t}`).join(' · ');
  say(`  ${rows.length} pair(s) (${byTier}) and ${(tripleRows || []).length} triple(s), ${nCells} cells (${nTripleCells} of them the triples'), ${builds} builds${skipped ? ` — ${skipped} pair(s) NOT run (a --only subset; no gate-level claim is made)` : ''}.`);
  /* THE DECLARED TOTAL IS PRINTED BECAUSE A NUMBER NOBODY PRINTS IS A NUMBER
     NOBODY WATCHES — and because a doc quoting it can then be checked against
     a run rather than against the last reader's arithmetic. #265 shipped
     "eleven pairs" in four places against a real sixteen, caught by counting
     the shipped list rather than by any clause. It is counted from the cells
     THIS RUN measured, never from `Object.keys(xfail).length`: on a `--only`
     run the second number describes a list the run did not reach. */
  const under = [...rows.flatMap((r) => r.grid.flat()), ...(tripleRows || []).flatMap((r) => r.cells)].filter((c) => Number.isFinite(c.mm) && c.mm < BAR);
  const decd = under.filter((c) => Object.prototype.hasOwnProperty.call(xfail, c.key));
  const nPairs = new Set(decd.map((c) => c.key.split(' @ ')[0])).size;
  /* BOTH NUMBERS, because they are two facts and a summary that printed only
     the second would be a label where CG2 does the work: on a clean tree they
     are equal, and where they are not the gate has already failed and this
     line says by how much. */
  say(`  ${under.length} cell(s) under the bar, ${decd.length} of them declared, across ${nPairs} pair(s) and triple(s)${under.length === decd.length ? '' : ` — ${under.length - decd.length} UNDECLARED, see CG2`}.`);
  if (only) say('  CG5 / CG7-stray are NOT evaluated on a --only run: a declaration this subset does not reach is not a stray one.');
  if (fails.length) { if (!quiet) { say(''); for (const f of fails) console.error('  FAIL  ' + f); } }
  /* THE CLEAN LINE NAMES ONLY THE CLAUSES THAT RAN. On a `--only` run CG5 is
     not evaluated, and a summary claiming it is clean would be a label naming
     a computation nobody performed — this project's most repeated defect. */
  else say(only ? '\n  CG0 grid · CG1 reachability · CG2 bar · CG3 magnitude · CG4 verdict · CG6 provenance · CG7 inert — all clean on this SUBSET; CG5 / CG7-stray NOT EVALUATED.'
                : '\n  CG0 grid · CG1 reachability · CG2 bar · CG3 magnitude · CG4 verdict · CG5 stray · CG6 provenance · CG7 inert — all clean.');
  return { fails, rows, tripleRows, bar: BAR };
}

/* -------------------------------------------------------- the must-fail */

/* `--control` IS THE MUST-FAIL AND IT EXERCISES EVERY ONE OF THE EIGHT
   CLAUSES, because #262 found that the clause named in its own brief was
   not the clause that had changed. Each leg PLANTS its condition into a
   COPY of the real `PAIRS` / `COMBINATION_XFAIL` / `COMBINATION_INERT` —
   the same objects the gate reads on an ordinary run, so nothing about
   the clause is restated here — runs the SHIPPED `verify`, and requires
   the named clause to be among the findings.

   IT REFUSES A VACUOUS PLANT: a tree with no declared cell, or no failing
   cell, or no clearing cell, or no pair on each of the three verdict
   arms, or no declared inert axis, has nothing to plant, and a control
   with nothing to plant cannot have been wrong.

   AND IT PRINTS THE RED THROUGH THE SAME PATH A REAL FAILURE TAKES: the
   last leg is re-run NOT quiet, so the gate's ordinary table and its own
   `FAIL` block are written verbatim. A control that renders its own red
   is a control whose red can drift from the genuine one.

   THE TWO GRID-CHANGING LEGS ARE SCOPED WITH `only` TO THE ONE PAIR THEY
   PLANT INTO. They cannot reuse the baseline's measurements (the plant
   moves the grid), and rebuilding all 262 cells for each would cost
   minutes to re-measure states already measured; `only` rebuilds the
   twelve or sixteen cells the plant actually describes. Every other
   plant changes a declaration or a flag, which moves no geometry. */
/* THE CONTROL'S WITNESSES, BY NAME (gate-hygiene session, Oct 6). Every leg
   below used to pick its witness by FIRST MATCH of a property other
   declarations can change — the first declared cell under the bar, the first
   pair with each verdict, the first inert key, the first tier-3 pair, each
   triple's first declared failing cell. A declaration added or re-ordered then
   silently re-points the leg at a different row, which still fires and so
   reads green: the edge-profile control drifted exactly that way and nobody
   noticed for a session. THE SAME SESSION THAT NAMED THESE MEASURED IT
   HAPPENING HERE: flipping six verdicts for the foot targets moved the
   `single-reaches` arm from `leafangle-x-stem` to `cup-x-curl` and the
   `cup-x-roll-x-curl` triple's failing cell to a curl-360 single, with every
   leg still green. So each witness is the one `main` ran with at 7af97f4,
   named, and the control REFUSES (exit 2) if a name goes missing or stops
   having the property its leg needs. Moving one is an edit to this table,
   which a reviewer sees. */
export const CONTROL_WITNESSES = Object.freeze({
  failing: 'cup-x-tipshape @ petalCup=0.6 x petalTipShape=3',          // declared AND under the bar
  clearing: 'cup-x-tipshape @ petalCup=0 x petalTipShape=1.7',         // clears the bar AND undeclared
  'product-only': 'cup-x-tipshape',
  'single-reaches': 'leafangle-x-stem',
  clears: 'cup-x-buckle',
  inert: 'density-x-cup @ infillDensity',                              // a COMBINATION_INERT key
  tier3: 'leafangle-x-tooth',                                          // a tier-3 pair (declares `guess`)
  /* each triple's declared failing cell (a triple that declares CLEARS has none) */
  triples: Object.freeze({
    'curl-x-cup-x-twist': 'curl-x-cup-x-twist @ petalSpineCurl=270 x petalCup=0 x petalTwist=180',
    'cup-x-roll-x-curl': 'cup-x-roll-x-curl @ petalCup=0 x petalRoll=-330 x petalSpineCurl=-180',
    'curl-x-twist-x-roll': 'curl-x-twist-x-roll @ petalSpineCurl=0 x petalTwist=0 x petalRoll=330',
    'cup-x-tipshape-x-width': 'cup-x-tipshape-x-width @ petalCup=1 x petalTipShape=1.7 x petalWidth=30',
    /* NEW with the foot targets: the composed state's OWN cell, block 44's
       state, the reason this triple exists */
    'layers-x-curl-x-innercurl': 'layers-x-curl-x-innercurl @ layerCount=3 x petalSpineCurl=180 x innerCurl=360',
  }),
});
/* The checks each named witness must pass before any leg runs. Returns the
   list of reasons it cannot serve; empty means every name resolves. */
export function controlWitnessProblems({ cells, tripleCells, bar, pairs = PAIRS, triples = TRIPLES, xfail = COMBINATION_XFAIL, inert = COMBINATION_INERT, W = CONTROL_WITNESSES }) {
  const why = [];
  const cellBy = new Map(cells.map((c) => [c.key, c]));
  const f = cellBy.get(W.failing);
  if (!f) why.push(`the named failing witness "${W.failing}" is no cell of any shipped pair`);
  else if (!(Number.isFinite(f.mm) && f.mm < bar && xfail[f.key])) why.push(`the named failing witness "${W.failing}" is no longer both under the bar and declared (reads ${f.mm})`);
  const c = cellBy.get(W.clearing);
  if (!c) why.push(`the named clearing witness "${W.clearing}" is no cell of any shipped pair`);
  else if (!(Number.isFinite(c.mm) && c.mm >= bar && !xfail[c.key])) why.push(`the named clearing witness "${W.clearing}" no longer clears the bar undeclared (reads ${c.mm})`);
  for (const v of VERDICTS) {
    const p = pairs.find((q) => q.id === W[v]);
    if (!p) why.push(`the named "${v}" witness "${W[v]}" is no shipped pair`);
    else if (p.verdict !== v) why.push(`the named "${v}" witness "${W[v]}" now declares "${p.verdict}"`);
  }
  if (!Object.prototype.hasOwnProperty.call(inert, W.inert)) why.push(`the named inert witness "${W.inert}" is not a COMBINATION_INERT key`);
  else if (!pairs.some((p) => p.id === W.inert.split(' @ ')[0])) why.push(`the named inert witness "${W.inert}" names no shipped pair`);
  const t3 = pairs.find((q) => q.id === W.tier3);
  if (!t3 || t3.tier !== 3) why.push(`the named tier-3 witness "${W.tier3}" is ${t3 ? `tier ${t3.tier}` : 'no shipped pair'}`);
  for (const t of triples) {
    const name = W.triples[t.id];
    if (t.verdict === 'clears') { if (name) why.push(`triple "${t.id}" declares CLEARS and still names a failing witness "${name}"`); continue; }
    if (!name) { why.push(`triple "${t.id}" declares ${t.verdict} and names no failing witness in CONTROL_WITNESSES.triples`); continue; }
    const tc = (tripleCells.get(t.id) || []).find((x) => x.key === name);
    if (!tc) why.push(`triple "${t.id}"'s named failing witness "${name}" is no cell of it`);
    else if (!(Number.isFinite(tc.mm) && tc.mm < bar && xfail[tc.key])) why.push(`triple "${t.id}"'s named failing witness "${name}" is no longer both under the bar and declared (reads ${tc.mm})`);
  }
  for (const id of Object.keys(W.triples)) if (!triples.some((t) => t.id === id)) why.push(`CONTROL_WITNESSES.triples names "${id}", which is no shipped triple`);
  return why;
}
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
  const tripleCells = new Map((baseRun.tripleRows || []).map((r) => [r.triple.id, r.cells]));
  const why = controlWitnessProblems({ cells: allCells, tripleCells, bar });
  if (why.length) { console.error(`REFUSED (a named control witness cannot serve): ${why.join('; ')}.`); return 2; }
  /* AND THE GUARD ITSELF MUST BE SEEN TO FIRE: each kind of loss — a name
     that no longer resolves, a name whose row lost its property — planted
     into a COPY of the table, each required to produce a reason naming it. */
  {
    const W0 = CONTROL_WITNESSES;
    const guardLegs = [
      ['a failing witness renamed to a cell no pair produces', { ...W0, failing: 'cup-x-tipshape @ petalCup=99 x petalTipShape=99' }, {}, 'failing witness'],
      ['the failing witness loses its declaration', W0, { xfail: (() => { const o = { ...COMBINATION_XFAIL }; delete o[W0.failing]; return o; })() }, 'failing witness'],
      ['a verdict arm names a pair that no longer declares it', { ...W0, clears: W0['product-only'] }, {}, '"clears" witness'],
      ['a triple witness names a cell that clears', { ...W0, triples: { ...W0.triples, 'layers-x-curl-x-innercurl': 'layers-x-curl-x-innercurl @ layerCount=1 x petalSpineCurl=0 x innerCurl=0' } }, {}, 'layers-x-curl-x-innercurl'],
    ];
    let gbad = 0;
    for (const [name, W, extra, must] of guardLegs) {
      const got = controlWitnessProblems({ cells: allCells, tripleCells, bar, W, ...extra });
      const ok = got.some((r) => r.includes(must));
      if (!ok) gbad++;
      console.log(`  ${ok ? 'ok  ' : 'FAIL'} witness guard: ${name.padEnd(56)} ${ok ? 'REFUSED — ' + got.find((r) => r.includes(must)).slice(0, 120) : 'did NOT refuse'}`);
    }
    if (gbad) { console.error(`  MISSED: the witness guard stayed silent on ${gbad} planted loss(es) — a named witness could go missing unseen`); return gbad; }
    console.log('');
  }
  const byKey = new Map(allCells.map((c) => [c.key, c]));
  const failing = byKey.get(CONTROL_WITNESSES.failing), clearing = byKey.get(CONTROL_WITNESSES.clearing);
  const arm = (v) => PAIRS.find((p) => p.id === CONTROL_WITNESSES[v]);
  console.log(`  witnesses (named, CONTROL_WITNESSES): failing "${failing.key}" · clearing "${clearing.key}" · arms ${VERDICTS.map((v) => `${v}=${arm(v).id}`).join(', ')} · inert "${CONTROL_WITNESSES.inert}" · tier-3 "${CONTROL_WITNESSES.tier3}"\n`);

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const asVerdict = (id, v) => PAIRS.map((p) => (p.id === id ? { ...clone(p), verdict: v } : p));
  const patch = (id, f) => PAIRS.map((p) => (p.id === id ? f({ ...clone(p) }) : p));
  const strayKey = 'cup-x-tipshape @ petalCup=99 x petalTipShape=99';
  const strayInert = 'cup-x-tipshape @ sheetThickness';
  const prod = arm('product-only'), single = arm('single-reaches'), clears = arm('clears');
  /* CG0's plant moves an axis's FIRST value off the registry default, which
     is the edit that would silently re-point every single-axis column. */
  const cg0 = patch(prod.id, (p) => ({ ...p, a: { ...p.a, values: [p.a.values[1], ...p.a.values.slice(1)] } }));
  /* CG1's plant swaps one axis for a control that is PROVABLY INERT for
     this measure — `stamenCount`, a different part entirely, measured
     bit-identical on the cup column at 0, 60 and 120 stamens. It starts at
     its own registry default and lies inside its range, so CG0 stays
     silent and the leg isolates CG1. CG4 fires beside it, honestly: an
     inert axis means no interior cell fails, which is the same finding
     seen from the other side. */
  const cg1 = patch(prod.id, (p) => ({ ...p, b: { id: 'stamenCount', values: [0, 60] } }));
  const without = (k) => { const o = { ...COMBINATION_XFAIL }; delete o[k]; return o; };
  const withoutInert = (k) => { const o = { ...COMBINATION_INERT }; delete o[k]; return o; };
  const inertKeyReal = CONTROL_WITNESSES.inert;
  /* CG7's "it started moving" plant declares a control that MOVES the
     measure as inert — the direction that matters, because an axis whose
     inertness has expired is a pair that has quietly become real. */
  const movingAxis = `${prod.id} @ ${prod.b.id}`;

  const legs = [
    ['CG0 an axis no longer starts at its control\'s default', { pairs: cg0, only: new RegExp(`^${prod.id}$`) }, 'CG0', true],
    ['CG1 an axis cannot reach the measure at all', { pairs: cg1, only: new RegExp(`^${prod.id}$`) }, 'CG1', true],
    /* THE FOOT LEG ON A PAIR (gate-hygiene session, Oct 6), the triple's own
       twin below: the instrument with the foot dropped must leave the curl-360
       single cleared, which CG2 reports on its declared cell by name. */
    ['CG2 "cup-x-curl" measured with the FOOT DROPPED again (measureWall footTargets: false)', { wallOpts: { footTargets: false }, only: /^cup-x-curl$/ }, 'CG2', true, 'cup-x-curl'],
    ['CG1 the declared inertness is removed', { inert: withoutInert(inertKeyReal) }, 'CG1'],
    ['CG2 a failing cell\'s declaration is removed', { xfail: without(failing.key) }, 'CG2'],
    ['CG2 a CLEARING cell is declared as failing', { xfail: { ...COMBINATION_XFAIL, [clearing.key]: { mm: 0.5, note: 'CONTROL' } } }, 'CG2'],
    ['CG3 a record is stale, the cell reads WORSE', { xfail: { ...COMBINATION_XFAIL, [failing.key]: { ...COMBINATION_XFAIL[failing.key], mm: COMBINATION_XFAIL[failing.key].mm + 0.1 } } }, 'CG3'],
    ['CG3 a record is stale, the cell reads BETTER', { xfail: { ...COMBINATION_XFAIL, [failing.key]: { ...COMBINATION_XFAIL[failing.key], mm: Math.max(0, COMBINATION_XFAIL[failing.key].mm - 0.1) } } }, 'CG3'],
    [`CG4 "${prod.id}" product-only -> clears`, { pairs: asVerdict(prod.id, 'clears') }, 'CG4'],
    [`CG4 "${prod.id}" product-only -> single-reaches`, { pairs: asVerdict(prod.id, 'single-reaches') }, 'CG4'],
    [`CG4 "${single.id}" single-reaches -> product-only`, { pairs: asVerdict(single.id, 'product-only') }, 'CG4'],
    [`CG4 "${clears.id}" clears -> product-only`, { pairs: asVerdict(clears.id, 'product-only') }, 'CG4'],
    [`CG4 "${prod.id}" declares a verdict that is not one of the three`, { pairs: asVerdict(prod.id, 'mostly-fine') }, 'CG4'],
    ['CG5 a declaration names a cell no grid produces', { xfail: { ...COMBINATION_XFAIL, [strayKey]: { mm: 0.5, note: 'CONTROL' } } }, 'CG5'],
    [`CG6 "${prod.id}" declares no tier`, { pairs: patch(prod.id, (p) => { delete p.tier; return p; }) }, 'CG6'],
    [`CG6 a TIER 3 pair stops declaring itself a guess`, { pairs: patch(CONTROL_WITNESSES.tier3, (p) => { delete p.guess; return p; }) }, 'CG6'],
    [`CG6 "${prod.id}" cites a file that does not exist`, { pairs: patch(prod.id, (p) => ({ ...p, cite: 'docs/bloom-this-doc-was-never-written.md — the argument' })) }, 'CG6'],
    ['CG7 an axis that MOVES the measure is declared inert', { inert: { ...COMBINATION_INERT, [movingAxis]: { maxMoveMm: 0, note: 'CONTROL' } } }, 'CG7'],
    ['CG7 the inert record overstates the movement', { inert: { ...COMBINATION_INERT, [inertKeyReal]: { ...COMBINATION_INERT[inertKeyReal], maxMoveMm: 0.5 } } }, 'CG7'],
    ['CG7 an inert declaration names no pair\'s axis', { inert: { ...COMBINATION_INERT, [strayInert]: { maxMoveMm: 0, note: 'CONTROL' } } }, 'CG7'],
  ];

  /* THE TRIPLES' LEGS — PER TRIPLE, each firing on ITS OWN witness (the
     headroom PR, §21): a finding counts only if it NAMES that triple, so a
     plant into one triple cannot be passed by a red from another. Every
     triple with a declared cell under the bar gets the CG2 removal and both
     CG3 records; every triple gets the two CG4 flips its own verdict does not
     allow; the first keeps the CG0 plant; and the composed-state triple gets
     the one rebuild that is its reason to exist — its measure put back to
     `self` on the representative petal, where `innerCurl` never reaches, so
     CG1 must refuse that axis. */
  /* THE SEPAL PAIRS' LEG (R6, Oct 9): one sepal pair rebuilt with its measure
     put back to `self` — the representative PETAL, which no sepal twin reaches —
     so CG1 must refuse BOTH axes as inert. That is the blindness the defaults
     bar carried until R6, stated as a must-fail of this gate's own clause. */
  const sepalPair = PAIRS.find((p) => p.measure === 'sepal-self');
  if (!sepalPair) { console.error('REFUSED (vacuous control): no pair uses `sepal-self`, so its CG1 witness has nothing to plant.'); return 2; }
  legs.push([`CG1: "${sepalPair.id}" measured on the representative PETAL (the blindness R6 fixed)`, { pairs: PAIRS.map((p) => (p.id === sepalPair.id ? { ...clone(p), measure: 'self' } : p)), only: new RegExp(`^${sepalPair.id}$`) }, 'CG1', true, sepalPair.id]);

  const tRows = baseRun.tripleRows || [];
  if (!tRows.length) { console.error('REFUSED (vacuous control): TRIPLES carries no triple, so its clauses have nothing to plant.'); return 2; }
  const flips = { 'pair-reaches': ['triple-only', 'clears'], 'triple-only': ['pair-reaches', 'clears'], clears: ['pair-reaches', 'triple-only'] };
  for (const [ti, { triple: T, cells }] of tRows.entries()) {
    const tAs = (v) => TRIPLES.map((t) => (t.id === T.id ? { ...clone(t), verdict: v } : t));
    /* named, checked above by controlWitnessProblems */
    const tFail = CONTROL_WITNESSES.triples[T.id] ? cells.find((c) => c.key === CONTROL_WITNESSES.triples[T.id]) : null;
    if (tFail) legs.push(
      [`CG2 triple: "${T.id}" loses a failing cell's declaration`, { xfail: without(tFail.key) }, 'CG2', false, T.id],
      [`CG3 triple: "${T.id}" record is stale, the cell reads WORSE`, { xfail: { ...COMBINATION_XFAIL, [tFail.key]: { ...COMBINATION_XFAIL[tFail.key], mm: COMBINATION_XFAIL[tFail.key].mm + 0.1 } } }, 'CG3', false, T.id],
      [`CG3 triple: "${T.id}" record is stale, the cell reads BETTER`, { xfail: { ...COMBINATION_XFAIL, [tFail.key]: { ...COMBINATION_XFAIL[tFail.key], mm: Math.max(0, COMBINATION_XFAIL[tFail.key].mm - 0.1) } } }, 'CG3', false, T.id],
    );
    for (const v of flips[T.verdict] || []) legs.push([`CG4 triple: "${T.id}" ${T.verdict} -> ${v}`, { triples: tAs(v) }, 'CG4', false, T.id]);
    if (ti === 0) legs.push([`CG0 triple: "${T.id}" an axis no longer starts at its default`, { triples: TRIPLES.map((t) => (t.id === T.id ? { ...clone(t), axes: t.axes.map((a, i) => (i === 2 ? { ...a, values: [a.values[1], 90] } : a)) } : t)), only: new RegExp(`^${T.id}$`) }, 'CG0', true, T.id]);
    if (T.measure === 'self-every') {
      /* THE FOOT LEG (gate-hygiene session, Oct 6): the instrument as it was —
         `measureWall` dropping the foot rows — must leave this triple's
         declared foot cells CLEARING, which CG2 reports by name. Without it the
         foot targets are a claim nobody has seen fail. */
      legs.push([`CG2 triple: "${T.id}" measured with the FOOT DROPPED again (measureWall footTargets: false)`, { wallOpts: { footTargets: false }, only: new RegExp(`^${T.id}$`) }, 'CG2', true, T.id]);
      legs.push([`CG1 triple: "${T.id}" measured on the representative petal alone`, { triples: TRIPLES.map((t) => (t.id === T.id ? { ...clone(t), measure: 'self' } : t)), only: new RegExp(`^${T.id}$`) }, 'CG1', true, T.id]);
    }
  }
  if (!tRows.some((r) => r.triple.measure === 'self-every')) { console.error('REFUSED (vacuous control): no triple uses `self-every`, so its CG1 witness has nothing to plant.'); return 2; }

  let bad = 0, last = null;
  for (const [name, plant, want, rebuilds, mustName] of legs) {
    const { fails } = await verify({ root, quiet: true, ...plant, cached: rebuilds ? null : baseRun });
    const hit = fails.filter((f) => f.startsWith(want) && (!mustName || f.includes(mustName)));
    const other = fails.filter((f) => !f.startsWith(want));
    const ok = hit.length > 0;
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(62)} fired ${hit.length} ${want} clause(s)${other.length ? `, and ${other.length} other (named below as collateral)` : ''}`);
    for (const f of hit) console.log(`         ${f.slice(0, 190)}`);
    for (const f of other) console.log(`         collateral: ${f.slice(0, 140)}`);
    if (!ok) console.error(`         MISSED: ${want} stayed green under a plant that names it — that clause is not measuring the tree`);
    if (!plant.only) last = plant;
  }

  /* THE RED, THROUGH THE GATE'S OWN PRINTER. Everything above reads the
     findings as strings; this writes the whole run — the table, the
     per-pair lines and the FAIL block — exactly as a genuine failure
     would, so the two cannot drift. */
  console.log('\n  --- the last plant, re-run through the gate\'s own output path (this is the red a real failure prints) ---\n');
  await verify({ root, quiet: false, ...last, cached: baseRun });
  return bad;
}

/* THE DRAIN IS FOR CONSISTENCY WITH THE TWO STL GATES, AND THE DIAGNOSIS THAT
   PROMPTED IT WAS WRONG — recorded that way round on purpose. The apex-nib
   session read a capture of this gate that held the header and TWELVE `FAIL`
   lines where the run had thirty-five, and reached for #220's finding
   (`process.exit()` does not flush a block-buffered stdout; both STL gates
   carry `flushAndExit` for it). MEASURED, IT IS NOT THAT: the same red tree
   with a bare `process.exit()` prints all 280 lines through a pipe and exits
   1, byte-identical to writing to a file, at 39,837 bytes. The twelve lines
   that survived were lines 269-280 — the LAST twelve — which is a `tail`, and
   a pipe that loses data loses the END, never the beginning. The truncation
   was in how the run was captured, not in this gate.
   So this exists because the two STL gates drain and this one should read the
   same, and because #220 measured a real loss at 200,001 lines; it does NOT
   exist because a loss was ever observed here. If you are here because a
   report came back short: check the capture first. */
async function flushAndExit(code) {
  for (const st of [process.stdout, process.stderr]) {
    if (st.writableLength) await new Promise((res) => st.write('', res));
  }
  process.exit(code);
}

/* ----------------------------------------------------------------- the CLI */

if (IS_MAIN) {
  const argv = process.argv.slice(2);
  const arg = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
  const only = arg('--only') ? new RegExp(arg('--only')) : null;
  /* `--root` IS READ HERE, AND IT WAS NOT (found by the apex-nib session).
     `run()`, `verify()` and `control()` have all taken a `root` since #263 and
     the doc describes the flag as the control on the MEASURED side — "measure
     ANOTHER tree's geometry against THIS tree's list" — but the CLI never
     parsed it, so `--root <worktree>` silently measured THIS tree and reported
     it as the other one's. It is the worst shape an instrument defect can
     take: a flag that answers plausibly and answers about the wrong thing.
     Caught by disbelief rather than by a clause — a base-tree run came back
     with the BRANCH's own figures to the third decimal (the flat default's
     self at 1.238 where the base tree's own gate reads 1.246). */
  const root = arg('--root') ? path.resolve(arg('--root')) : HERE;
  if (root !== HERE) console.log(`geometry, registry and the wall instrument from ${root}; the list, the clauses and the grid are this tree's`);
  if (argv.includes('--control')) {
    console.log('combination gate — the must-fail. Each leg plants ONE condition into a copy of the');
    console.log('real PAIRS / COMBINATION_XFAIL / COMBINATION_INERT and requires the clause that names it to fire.\n');
    const bad = await control({ root });
    if (bad === 2) await flushAndExit(2);
    console.log(bad ? `\ncontrol: FAIL — ${bad} leg(s) did not fire the clause they name`
                    : '\ncontrol: every clause fired on a plant that names it, and the tree is green without them.');
    await flushAndExit(bad ? 1 : 0);
  } else if (argv.includes('--emit')) {
    const { rows, tripleRows, bar } = await verify({ root, quiet: true, only });
    console.log("/* the cells this tree measures under the bar — copy deliberately, name every mover in the outcome doc */");
    for (const { pair, grid } of [...rows, ...(tripleRows || []).map((r) => ({ pair: r.triple, grid: [r.cells] }))]) {
      for (const c of grid.flat()) {
        if (!(Number.isFinite(c.mm) && c.mm < bar)) continue;
        const was = COMBINATION_XFAIL[c.key];
        console.log(`  ${JSON.stringify(c.key)}: { mm: ${Number(c.mm.toFixed(3))}${was ? `, note: ${JSON.stringify(was.note)}` : ''} },${was && Math.abs(was.mm - c.mm) > COMBINATION_TOLERANCE_MM ? `   // MOVED from ${was.mm}` : ''}`);
      }
    }
    await flushAndExit(0);
  } else {
    const { fails } = await verify({ root, only });
    await flushAndExit(fails.length ? 1 : 0);
  }
}
