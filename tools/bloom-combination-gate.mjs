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
    verdict: 'product-only',
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
    verdict: 'product-only',
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
    verdict: 'product-only',
    cite: "SELF_XFAIL['buckle-on-form'] in tools/bloom-wall-thickness.mjs names this pair in its own note (`curl+buckle 1.182`) — as a CURVATURE reading; this gate measures the SELF-APPROACH on it for the first time",
    why: 'the curl closes the blade on itself and the buckle spends the clearance that is left; session 34 measured that the composition has LOWER curvature than the base while the wall collapses, so no curvature bound can see it',
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
    verdict: 'product-only',
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
    verdict: 'product-only',
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
    verdict: 'product-only',
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
    verdict: 'product-only',
    cite: "bloom-geometry.js — `cAt(u, r)` composes the two into ONE cup coefficient, so they are one term and two controls in the strictest sense available here; docs/bloom-combination-gate.md §3",
    why: 'the amplitude and its along-blade ramp compose multiplicatively at the tip, which is where the two margins are nearest to begin with',
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
    verdict: 'clears',
    cite: 'docs/bloom-combination-gate.md §4 — a guess, and the most expensive one measured: a lobed build costs four times any other candidate in this tier and this grid clears',
    why: 'a guess: that a sinus cut into the margin lets the curl bring two crests together. It does not — the cut removes material from exactly the place the curl would have folded',
  },
];

/* ------------------------------------------------------- the declarations */

/* A CELL KEY IS `<pair id> @ <a>=<va> x <b>=<vb>`, built by `cellKey`
   below so the list and the run cannot format it two ways.

   EVERY ENTRY CARRIES ITS MAGNITUDE AS A NUMBER THE GATE READS (#213).
   The module REFUSES TO LOAD on an entry without one: a declaration with
   no number is a label, and this project has cleaned that up four times. */
export const COMBINATION_XFAIL = Object.freeze({
  /* ================================================== TIER 1 (#263) */

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
     #263. `petalCup` 1.2 x `petalSpineCurl` 180 is the state
     `tools/bloom-wall-thickness.mjs` already BUILDS on every run as
     `buckle-on-form`'s buckle-free control, reads the wall of, and
     discards the SELF of; its 0.945 mm has been available to that gate
     since session 34 and nothing looked at it. */
  'cup-x-curl @ petalCup=0.6 x petalSpineCurl=360': { mm: 0.826, note: 'measured 2026-09-19 on 937263a. Neither alone: cup 0.6 reads 1.178, curl 360 reads 1.245.' },
  'cup-x-curl @ petalCup=0.9 x petalSpineCurl=270': { mm: 0.881, note: 'measured 2026-09-19 on 937263a.' },
  'cup-x-curl @ petalCup=0.9 x petalSpineCurl=360': { mm: 0.118, note: 'measured 2026-09-19 on 937263a.' },
  'cup-x-curl @ petalCup=1.2 x petalSpineCurl=180': { mm: 0.945, note: "measured 2026-09-19 on 937263a. THE CELL THE WALL INSTRUMENT ALREADY BUILDS every run — `buckle-on-form`'s own control — and whose SELF it throws away." },
  'cup-x-curl @ petalCup=1.2 x petalSpineCurl=270': { mm: 0.193, note: 'measured 2026-09-19 on 937263a.' },
  'cup-x-curl @ petalCup=1.2 x petalSpineCurl=360': { mm: 0.012, note: 'measured 2026-09-19 on 937263a — the worst cell in TIER 1: a sheet twelve microns from touching itself on two shipped sliders, with both singles clear (1.031 and 1.245).' },

  /* THE BUCKLE CELLS. `buckleAmp` stops at 0.4 on these grids because the
     amplitude CLAMP makes 0.6 float-identical to 0.4 at the default
     frequency 3 — measured, on every cup and every curl of both grids —
     so the top of the slider is covered by the cell below it and a
     fourth column would cost two builds to re-measure one state. */
  'cup-x-buckle @ petalCup=1.2 x buckleAmp=0.2': { mm: 0.99, note: 'measured 2026-09-19 on 937263a.' },
  'cup-x-buckle @ petalCup=1.2 x buckleAmp=0.4': { mm: 0.963, note: "measured 2026-09-19 on 937263a. Session 34 named this pair in `buckle-on-form`'s note as a CURVATURE reading (1.052 /mm); this is its self-approach, measured for the first time." },
  'curl-x-buckle @ petalSpineCurl=360 x buckleAmp=0.4': { mm: 0.912, note: "measured 2026-09-19 on 937263a. Session 34 named this pair in `buckle-on-form`'s note as a CURVATURE reading (1.182 /mm); this is its self-approach, measured for the first time." },

  /* THE LEAF CELLS — `leafAngle`'s hazard, at every stem diameter, which
     is what CG4's `single-reaches` arm asserts about this pair. */
  'leafangle-x-stem @ leafAngle=70 x stemDiameter=6': { mm: 0.824, note: "docs/bloom-leaves-outcome.md's own figure (0.824), reproduced exactly through an instrument that shares no code with the one that produced it." },
  'leafangle-x-stem @ leafAngle=70 x stemDiameter=3': { mm: 0.826, note: 'measured 2026-09-19 on 937263a.' },
  'leafangle-x-stem @ leafAngle=70 x stemDiameter=12': { mm: 0.822, note: "measured 2026-09-19 on 937263a — 0.002 mm from the 6 mm stem's reading, which is the whole of what the second control contributes." },
  'leafangle-x-stem @ leafAngle=85 x stemDiameter=6': { mm: 0, note: "docs/bloom-leaves-outcome.md's 80-90 deg cell: the blade reaches the stem's own surface. `LEAVES: the STEEP angle (85 deg)` is a shipped MATRIX ROW, so this hazard was reachable, built and exported on every full gate run — nothing measured it." },
  'leafangle-x-stem @ leafAngle=85 x stemDiameter=3': { mm: 0, note: 'measured 2026-09-19 on 937263a.' },
  'leafangle-x-stem @ leafAngle=85 x stemDiameter=12': { mm: 0, note: 'measured 2026-09-19 on 937263a.' },

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
  'buckle-x-tipshape @ buckleAmp=0.2 x petalTipShape=3': { mm: 0.914, note: 'the worst cell of this pair; buckleAmp 0.4 reads 0.925, BETTER, because the amplitude clamp binds. Measured 2026-09-19 on c29a8b5; the singles read 1.203 (n 3.00) and 1.220 (amp 0.4), both clear.' },
  'buckle-x-tipshape @ buckleAmp=0.4 x petalTipShape=3': { mm: 0.925, note: 'measured 2026-09-19 on c29a8b5.' },

  /* THE QUILL. `petalRoll` 330 alone is `SELF_XFAIL['roll-max']` and
     reads 0.659 there too — the SAME state declared in two lists by two
     instruments, agreeing to the third decimal, which is the strongest
     cross-check either record has. The taper only ever RELIEVES on this
     grid: every tapered cell clears more than the untapered roll beneath
     it, so the pair's worst cell is a single. */
  'roll-x-rolltaper @ petalRoll=270 x petalRollTaper=0': { mm: 0.718, note: 'a SINGLE-axis cell (taper at its default 0) — the roll reaches this alone. Measured 2026-09-19 on c29a8b5.' },
  'roll-x-rolltaper @ petalRoll=270 x petalRollTaper=0.5': { mm: 0.777, note: 'measured 2026-09-19 on c29a8b5 — the taper RELIEVES.' },
  'roll-x-rolltaper @ petalRoll=270 x petalRollTaper=1': { mm: 0.836, note: 'measured 2026-09-19 on c29a8b5 — the taper RELIEVES.' },
  'roll-x-rolltaper @ petalRoll=330 x petalRollTaper=0': { mm: 0.659, note: "a SINGLE-axis cell, and it is SELF_XFAIL['roll-max']'s own state and own number (0.659) reached through a second instrument. Measured 2026-09-19 on c29a8b5." },
  'roll-x-rolltaper @ petalRoll=330 x petalRollTaper=0.5': { mm: 0.714, note: 'measured 2026-09-19 on c29a8b5 — the taper RELIEVES.' },
  'roll-x-rolltaper @ petalRoll=330 x petalRollTaper=1': { mm: 0.771, note: 'measured 2026-09-19 on c29a8b5 — the taper RELIEVES.' },

  /* THE CUP UNDER THE SWEEP — `kS` multiplying `cupLift` in `sectAt`,
     measured. Both singles clear (cup 1.2 reads 1.031, sweep 1 reads
     1.246 — the sweep alone moves this measure by nothing at all at
     cup 0). */
  'cup-x-apexsweep @ petalCup=0.9 x petalApexSweep=1': { mm: 0.936, note: 'measured 2026-09-19 on c29a8b5.' },
  'cup-x-apexsweep @ petalCup=1.2 x petalApexSweep=0.5': { mm: 0.909, note: 'measured 2026-09-19 on c29a8b5.' },
  'cup-x-apexsweep @ petalCup=1.2 x petalApexSweep=1': { mm: 0.818, note: 'measured 2026-09-19 on c29a8b5 — the worst cell of this pair, 0.213 mm beyond what the cup reaches alone.' },

  /* THE GRADIENT INTO THE APEX, AND THE FINDING IS HOW CLOSELY IT TRACKS
     §18a. Cell for cell against `cup-x-tipshape` at the same numbers:
     0.928/0.929, 0.985/0.988, 0.850/0.854, 0.974/0.977, 0.828/0.832 —
     five cells, all within 0.004 mm, and the SAME five cells fail. The
     cup and its along-blade ramp are interchangeable for this hazard at
     these amplitudes, which is a statement about the hazard rather than
     about either control. */
  'gradient-x-tipshape @ petalCupGradient=0.6 x petalTipShape=3': { mm: 0.928, note: "measured 2026-09-19 on c29a8b5; `cup-x-tipshape`'s own cell at the same numbers reads 0.929." },
  'gradient-x-tipshape @ petalCupGradient=0.9 x petalTipShape=2.5': { mm: 0.985, note: 'measured 2026-09-19 on c29a8b5; the cup reads 0.988 at the same numbers.' },
  'gradient-x-tipshape @ petalCupGradient=0.9 x petalTipShape=3': { mm: 0.85, note: 'measured 2026-09-19 on c29a8b5; the cup reads 0.854.' },
  'gradient-x-tipshape @ petalCupGradient=1.2 x petalTipShape=2.5': { mm: 0.974, note: 'measured 2026-09-19 on c29a8b5; the cup reads 0.977.' },
  'gradient-x-tipshape @ petalCupGradient=1.2 x petalTipShape=3': { mm: 0.828, note: 'measured 2026-09-19 on c29a8b5 — the worst cell of this pair; the cup reads 0.832 at the same numbers.' },

  /* THE FIDDLEHEAD, TIP-LOADED. Worse than `cup-x-curl` at three of its
     four failing cells (0.818 against 0.826, 0.678 against 0.881 — the
     gradient loads the stations the curl brings together). */
  'gradient-x-curl @ petalCupGradient=0.6 x petalSpineCurl=360': { mm: 0.818, note: 'measured 2026-09-19 on c29a8b5; the plain cup at the same numbers reads 0.826.' },
  'gradient-x-curl @ petalCupGradient=0.9 x petalSpineCurl=360': { mm: 0.678, note: 'measured 2026-09-19 on c29a8b5; the plain cup reads 0.118 — this one the gradient is KINDER to.' },
  'gradient-x-curl @ petalCupGradient=1.2 x petalSpineCurl=270': { mm: 0.994, note: 'measured 2026-09-19 on c29a8b5 — six microns under the bar.' },
  'gradient-x-curl @ petalCupGradient=1.2 x petalSpineCurl=360': { mm: 0.477, note: 'measured 2026-09-19 on c29a8b5 — the worst cell of this pair.' },

  /* THE CUPPED QUILL — ELEVEN CELLS, TWO OF THEM SINGLES, and the widest
     failing region in the gate. `petalRoll` 270 and 330 fail at cup 0,
     which is why the verdict is `single-reaches`: the matrix and V5 can
     both see the roll alone. What they cannot see is the interior — the
     cup takes 0.659 mm down to 0.010. */
  'cup-x-roll @ petalCup=0 x petalRoll=270': { mm: 0.718, note: 'a SINGLE-axis cell (cup at its default 0). Measured 2026-09-19 on c29a8b5.' },
  'cup-x-roll @ petalCup=0 x petalRoll=330': { mm: 0.659, note: "a SINGLE-axis cell, and SELF_XFAIL['roll-max']'s own 0.659 for the third time in this file. Measured 2026-09-19 on c29a8b5." },
  'cup-x-roll @ petalCup=0.6 x petalRoll=180': { mm: 0.424, note: 'measured 2026-09-19 on c29a8b5; roll 180 alone reads 1.128 and cup 0.6 alone 1.178 — both clear.' },
  'cup-x-roll @ petalCup=0.6 x petalRoll=270': { mm: 0.034, note: 'measured 2026-09-19 on c29a8b5.' },
  'cup-x-roll @ petalCup=0.6 x petalRoll=330': { mm: 0.032, note: 'measured 2026-09-19 on c29a8b5.' },
  'cup-x-roll @ petalCup=0.9 x petalRoll=180': { mm: 0.253, note: 'measured 2026-09-19 on c29a8b5.' },
  'cup-x-roll @ petalCup=0.9 x petalRoll=270': { mm: 0.012, note: 'measured 2026-09-19 on c29a8b5.' },
  'cup-x-roll @ petalCup=0.9 x petalRoll=330': { mm: 0.085, note: 'measured 2026-09-19 on c29a8b5 — NOT monotone in the roll: 270 reads nearer than 330 at this cup.' },
  'cup-x-roll @ petalCup=1.2 x petalRoll=180': { mm: 0.164, note: 'measured 2026-09-19 on c29a8b5.' },
  'cup-x-roll @ petalCup=1.2 x petalRoll=270': { mm: 0.072, note: 'measured 2026-09-19 on c29a8b5.' },
  'cup-x-roll @ petalCup=1.2 x petalRoll=330': { mm: 0.01, note: 'measured 2026-09-19 on c29a8b5 — the worst cell of this pair and the joint-worst in the gate, ten microns.' },

  /* THE HOOP, WRUNG — TIER 2'S HEADLINE. 0.012 mm with BOTH singles
     clear (twist 180 reads 1.163, curl 360 reads 1.245): the same
     magnitude as TIER 1's worst cell, on a pair no doc had cited. Not
     monotone in the twist at curl 360 — 120 deg reads nearer than 180 —
     because past a certain wring the blade passes THROUGH the region it
     was approaching rather than settling in it. */
  'curl-x-twist @ petalSpineCurl=180 x petalTwist=120': { mm: 0.975, note: 'measured 2026-09-19 on c29a8b5.' },
  'curl-x-twist @ petalSpineCurl=180 x petalTwist=180': { mm: 0.62, note: 'measured 2026-09-19 on c29a8b5.' },
  'curl-x-twist @ petalSpineCurl=270 x petalTwist=120': { mm: 0.411, note: 'measured 2026-09-19 on c29a8b5.' },
  'curl-x-twist @ petalSpineCurl=270 x petalTwist=180': { mm: 0.105, note: 'measured 2026-09-19 on c29a8b5.' },
  'curl-x-twist @ petalSpineCurl=360 x petalTwist=60': { mm: 0.615, note: 'measured 2026-09-19 on c29a8b5.' },
  'curl-x-twist @ petalSpineCurl=360 x petalTwist=120': { mm: 0.012, note: "measured 2026-09-19 on c29a8b5 — this tier's worst cell, and the same twelve microns TIER 1's `cup 1.2 x curl 360` reads. Both singles clear: twist 180 reads 1.163 and curl 360 reads 1.245." },
  'curl-x-twist @ petalSpineCurl=360 x petalTwist=180': { mm: 0.025, note: 'measured 2026-09-19 on c29a8b5 — NOT monotone: 120 deg of twist reads nearer than 180.' },

  /* ONE LIFT, TWO CONTROLS — AND THE MEASURE DEPENDS ON THEIR SUM. Read
     the eight declared cells as (cup + gradient): 1.5 reads 0.938 twice,
     1.8 reads 0.862 three times, 2.1 reads 0.801 twice, 2.4 reads 0.754.
     Every cell on an anti-diagonal is the same number to the third
     decimal, which is `cAt(u, r)` composing the two into one coefficient
     showing up as a measured symmetry rather than as a reading of the
     source. */
  'cup-x-gradient @ petalCup=0.6 x petalCupGradient=0.9': { mm: 0.938, note: 'measured 2026-09-19 on c29a8b5; the cup+gradient sum is 1.5, and the other 1.5 cell reads 0.938 too.' },
  'cup-x-gradient @ petalCup=0.6 x petalCupGradient=1.2': { mm: 0.862, note: 'measured 2026-09-19 on c29a8b5; sum 1.8.' },
  'cup-x-gradient @ petalCup=0.9 x petalCupGradient=0.6': { mm: 0.938, note: 'measured 2026-09-19 on c29a8b5; sum 1.5.' },
  'cup-x-gradient @ petalCup=0.9 x petalCupGradient=0.9': { mm: 0.862, note: 'measured 2026-09-19 on c29a8b5; sum 1.8.' },
  'cup-x-gradient @ petalCup=0.9 x petalCupGradient=1.2': { mm: 0.801, note: 'measured 2026-09-19 on c29a8b5; sum 2.1.' },
  'cup-x-gradient @ petalCup=1.2 x petalCupGradient=0.6': { mm: 0.862, note: 'measured 2026-09-19 on c29a8b5; sum 1.8.' },
  'cup-x-gradient @ petalCup=1.2 x petalCupGradient=0.9': { mm: 0.801, note: 'measured 2026-09-19 on c29a8b5; sum 2.1.' },
  'cup-x-gradient @ petalCup=1.2 x petalCupGradient=1.2': { mm: 0.754, note: 'measured 2026-09-19 on c29a8b5 — the worst cell of this pair; sum 2.4, the only cell at it.' },

  /* ================================================== TIER 3 (#265) */

  /* THE SERRATED BLADE AGAINST THE STEM. All three tooth depths read the
     SAME number at every angle — bit-identically, which is what
     COMBINATION_INERT declares — so these six are `leafangle-x-stem`'s
     own two failing angles re-read three times each. They are declared
     because CG2 declares every cell under the bar and an undeclared one
     is a red; what they are worth is the inertness record above them. */
  'leafangle-x-tooth @ leafAngle=70 x leafToothDepth=0.26': { mm: 0.824, note: "a SINGLE-axis cell, and the same state `leafangle-x-stem @ leafAngle=70 x stemDiameter=6` declares at the same 0.824. Measured 2026-09-19 on c29a8b5." },
  'leafangle-x-tooth @ leafAngle=70 x leafToothDepth=0.6': { mm: 0.824, note: 'measured 2026-09-19 on c29a8b5 — bit-identical to the cell above it; the teeth do not reach this measure.' },
  'leafangle-x-tooth @ leafAngle=70 x leafToothDepth=1': { mm: 0.824, note: 'measured 2026-09-19 on c29a8b5 — bit-identical to the two cells above it.' },
  'leafangle-x-tooth @ leafAngle=85 x leafToothDepth=0.26': { mm: 0, note: 'a SINGLE-axis cell: the blade reaches the stem surface at 85 deg whatever the teeth do. Measured 2026-09-19 on c29a8b5.' },
  'leafangle-x-tooth @ leafAngle=85 x leafToothDepth=0.6': { mm: 0, note: 'measured 2026-09-19 on c29a8b5.' },
  'leafangle-x-tooth @ leafAngle=85 x leafToothDepth=1': { mm: 0, note: 'measured 2026-09-19 on c29a8b5.' },

  /* THE CUP ON A BROAD BLADE — a guess that paid. Both singles clear
     (width 30 alone reads 1.219), and the cup's own 1.031 at the default
     width falls to 0.932 at the widest. */
  'cup-x-width @ petalCup=0.9 x petalWidth=30': { mm: 0.954, note: 'measured 2026-09-19 on c29a8b5; petalWidth 30 alone reads 1.219 and cup 0.9 alone 1.138, both clear.' },
  'cup-x-width @ petalCup=1.2 x petalWidth=30': { mm: 0.932, note: 'measured 2026-09-19 on c29a8b5 — the worst cell of this pair.' },

  /* THE CUP ON A THINNED TIP — a guess that paid, and the second control
     SATURATES AGAINST THE PRINT FLOOR: 0.4 and 0.8 read the same number
     at every cup, because in EXPORT mode `tipThinning` 0.4 has already
     taken the tip to the 1.00 mm floor and there is nothing left for 0.8
     to take. The axis still reaches the measure (0.191 mm from its own
     default column), so this is saturation and not inertness — the
     distinction COMBINATION_INERT exists to keep. */
  'cup-x-thinning @ petalCup=0.9 x tipThinning=0.4': { mm: 0.984, note: 'measured 2026-09-19 on c29a8b5.' },
  'cup-x-thinning @ petalCup=0.9 x tipThinning=0.8': { mm: 0.984, note: 'measured 2026-09-19 on c29a8b5 — identical to 0.4: the export floor has already bound.' },
  'cup-x-thinning @ petalCup=1.2 x tipThinning=0.4': { mm: 0.924, note: 'measured 2026-09-19 on c29a8b5 — the worst cell of this pair.' },
  'cup-x-thinning @ petalCup=1.2 x tipThinning=0.8': { mm: 0.924, note: 'measured 2026-09-19 on c29a8b5 — identical to 0.4: the export floor has already bound.' },
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
export async function verify({ root = HERE, quiet = false, only = null, pairs = PAIRS, xfail = COMBINATION_XFAIL, inert = COMBINATION_INERT, cached = null } = {}) {
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
  let { tree, rows, builds, skipped } = cached
    ? { ...cached, builds: 0 }
    : await run({ root, only, pairs });
  if (cached) {
    const sig = (ps) => JSON.stringify(ps.map((p) => [p.id, p.a.id, p.a.values, p.b.id, p.b.values, p.base || null]));
    if (sig(rows.map((r) => r.pair)) !== sig(pairs.filter((p) => !only || only.test(p.id)))) {
      throw new Error('verify: the cached rows were built from a different grid than the pairs handed in — a cached clause evaluation must measure the grid it describes');
    }
    /* Re-attach the caller's pair objects, so a plant on a non-geometric
       field (verdict, cite, tier) is the one the clauses read. */
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

  const nCells = rows.reduce((a, r) => a + r.grid.flat().length, 0);
  const byTier = [1, 2, 3].map((t) => `${rows.filter((r) => r.pair.tier === t).length} tier-${t}`).join(' · ');
  say(`  ${rows.length} pair(s) (${byTier}), ${nCells} cells, ${builds} builds${skipped ? ` — ${skipped} pair(s) NOT run (a --only subset; no gate-level claim is made)` : ''}.`);
  /* THE DECLARED TOTAL IS PRINTED BECAUSE A NUMBER NOBODY PRINTS IS A NUMBER
     NOBODY WATCHES — and because a doc quoting it can then be checked against
     a run rather than against the last reader's arithmetic. #265 shipped
     "eleven pairs" in four places against a real sixteen, caught by counting
     the shipped list rather than by any clause. It is counted from the cells
     THIS RUN measured, never from `Object.keys(xfail).length`: on a `--only`
     run the second number describes a list the run did not reach. */
  const under = rows.flatMap((r) => r.grid.flat().filter((c) => Number.isFinite(c.mm) && c.mm < BAR));
  const decd = under.filter((c) => Object.prototype.hasOwnProperty.call(xfail, c.key));
  const nPairs = new Set(decd.map((c) => c.key.split(' @ ')[0])).size;
  /* BOTH NUMBERS, because they are two facts and a summary that printed only
     the second would be a label where CG2 does the work: on a clean tree they
     are equal, and where they are not the gate has already failed and this
     line says by how much. */
  say(`  ${under.length} cell(s) under the bar, ${decd.length} of them declared, across ${nPairs} pair(s)${under.length === decd.length ? '' : ` — ${under.length - decd.length} UNDECLARED, see CG2`}.`);
  if (only) say('  CG5 / CG7-stray are NOT evaluated on a --only run: a declaration this subset does not reach is not a stray one.');
  if (fails.length) { if (!quiet) { say(''); for (const f of fails) console.error('  FAIL  ' + f); } }
  /* THE CLEAN LINE NAMES ONLY THE CLAUSES THAT RAN. On a `--only` run CG5 is
     not evaluated, and a summary claiming it is clean would be a label naming
     a computation nobody performed — this project's most repeated defect. */
  else say(only ? '\n  CG0 grid · CG1 reachability · CG2 bar · CG3 magnitude · CG4 verdict · CG6 provenance · CG7 inert — all clean on this SUBSET; CG5 / CG7-stray NOT EVALUATED.'
                : '\n  CG0 grid · CG1 reachability · CG2 bar · CG3 magnitude · CG4 verdict · CG5 stray · CG6 provenance · CG7 inert — all clean.');
  return { fails, rows, bar: BAR };
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
  const arm = (v) => PAIRS.find((p) => p.verdict === v);
  const inertPairId = Object.keys(COMBINATION_INERT)[0]?.split(' @ ')[0];
  const why = [];
  if (!failing) why.push('no cell is both under the bar and declared, so neither the CG2 removal nor the CG3 record legs have anything to plant');
  if (!clearing) why.push('no cell clears the bar undeclared, so the CG2 "declared but clearing" leg has nothing to plant');
  for (const v of VERDICTS) if (!arm(v)) why.push(`PAIRS carries no pair with verdict "${v}", so CG4 cannot be exercised on that arm`);
  if (!inertPairId || !PAIRS.some((p) => p.id === inertPairId)) why.push('COMBINATION_INERT names no axis of any shipped pair, so the CG7 legs have nothing to plant');
  if (why.length) { console.error(`REFUSED (vacuous control): ${why.join('; ')}.`); return 2; }

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
  const inertKeyReal = Object.keys(COMBINATION_INERT)[0];
  /* CG7's "it started moving" plant declares a control that MOVES the
     measure as inert — the direction that matters, because an axis whose
     inertness has expired is a pair that has quietly become real. */
  const movingAxis = `${prod.id} @ ${prod.b.id}`;

  const legs = [
    ['CG0 an axis no longer starts at its control\'s default', { pairs: cg0, only: new RegExp(`^${prod.id}$`) }, 'CG0', true],
    ['CG1 an axis cannot reach the measure at all', { pairs: cg1, only: new RegExp(`^${prod.id}$`) }, 'CG1', true],
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
    [`CG6 a TIER 3 pair stops declaring itself a guess`, { pairs: patch(PAIRS.find((p) => p.tier === 3).id, (p) => { delete p.guess; return p; }) }, 'CG6'],
    [`CG6 "${prod.id}" cites a file that does not exist`, { pairs: patch(prod.id, (p) => ({ ...p, cite: 'docs/bloom-this-doc-was-never-written.md — the argument' })) }, 'CG6'],
    ['CG7 an axis that MOVES the measure is declared inert', { inert: { ...COMBINATION_INERT, [movingAxis]: { maxMoveMm: 0, note: 'CONTROL' } } }, 'CG7'],
    ['CG7 the inert record overstates the movement', { inert: { ...COMBINATION_INERT, [inertKeyReal]: { ...COMBINATION_INERT[inertKeyReal], maxMoveMm: 0.5 } } }, 'CG7'],
    ['CG7 an inert declaration names no pair\'s axis', { inert: { ...COMBINATION_INERT, [strayInert]: { maxMoveMm: 0, note: 'CONTROL' } } }, 'CG7'],
  ];

  let bad = 0, last = null;
  for (const [name, plant, want, rebuilds] of legs) {
    const { fails } = await verify({ root, quiet: true, ...plant, cached: rebuilds ? null : baseRun });
    const hit = fails.filter((f) => f.startsWith(want));
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

/* ----------------------------------------------------------------- the CLI */

if (IS_MAIN) {
  const argv = process.argv.slice(2);
  const arg = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
  const only = arg('--only') ? new RegExp(arg('--only')) : null;
  if (argv.includes('--control')) {
    console.log('combination gate — the must-fail. Each leg plants ONE condition into a copy of the');
    console.log('real PAIRS / COMBINATION_XFAIL / COMBINATION_INERT and requires the clause that names it to fire.\n');
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
