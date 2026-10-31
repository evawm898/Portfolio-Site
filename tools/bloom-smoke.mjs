/* ===================================================================
   bloom-smoke.mjs — THE NAMED SMOKE SUBSET. FOR ITERATION, NEVER FOR MERGE.

   WHAT THIS IS. A written-down, derived, auditable subset of
   buildMatrix() — a fixed subset (39 of 528 rows as of session 22) — run through the REAL export gate with
   its own `--only` flag. It exists so a session can find out in ~2 minutes
   whether it has broken something, instead of in ~44. It is ADDITIVE: it
   changes nothing about what certifies the work.

   **THE FULL MATRIX REMAINS THE MERGE CRITERION, UNCHANGED.** Both STL
   gates on every row, in CI, on the merge commit. Nothing here may be
   quoted as a pass of the matrix, and this tool prints a banner saying so
   on every run, because the gate's own summary line ("28/28 configs
   watertight") does not carry the scope of a filtered run.

   =================================================================== */

/* WHY THE EXPORT GATE AND NOT BOTH (measured, session 17).

   The two STL gates run the SAME per-row assertion set — formAssertions,
   curlAssertions (C1-C3), thicknessAssertions, junctionAssertions (J1-J9),
   zygoAssertions (Z0, Z1, Z2, Z4b, Z4c), exportFloorAssertion, applyCapability,
   shownModeAssertion, footCrowding (R1-R5). The export gate adds the edge
   census, the degenerate count and plan coverage; the connectedness gate
   adds ONE thing the export gate does not have: the voxel flood fill.

   Across sessions 7, 10, 11, B, 13, 14, 15 and 16 the charter records that
   flood fill catching NOTHING — every positive control reads "1 piece". It
   was re-measured on this head rather than inherited: session 14's P1 (the
   hub ignores the owner's dome) and P2 (feet lifted but horizontal) driven
   through the connectedness gate over this subset read 21/21 ONE CONNECTED
   PIECE on every row it measured, while J3 and J1 respectively fired on the
   export gate. So a second 83 s of flood fill buys nothing during
   iteration. It remains half the merge criterion.

   **AND THAT ARGUMENT HAS AN EXPIRY: --conn IS REQUIRED, NOT OPTIONAL, WHEN
   A SESSION INTRODUCES A NEW GEOMETRY MODE (Eva, session 17).** The reason
   the flood fill catches nothing is that J1-J9 fire first — which is a fact
   about modes whose junction assertions EXIST. A brand-new mode is exactly
   where the assertions may not model the failure yet, and the flood fill is
   the backstop for failures the assertions do not model. So: a session
   adding a placement, a junction shape, or any new geometry mode runs
   `--conn` until that mode's junction assertions are established AND have
   been shown to fire on a mutant. Then it may drop back to export-only.

   =================================================================== */

/* WHAT THIS SUBSET IS BLIND TO — read this before believing a green run.
   Not a caveat paragraph: five named holes, four of them structural.

   1. EVERY MATRIX-LEVEL CLAIM. crowdingCoverage(), curlCoverage() and the
      "some row asserts plan coverage" clause are claims about the MATRIX,
      and both gates correctly suppress them under `--only`. A flag that
      becomes stuck-on, or that stops being raised anywhere, is invisible
      here by construction.

   2. THE 471 ROWS IT DOES NOT RUN. A defect reachable only at a particular
      petalCount, a particular centre sub-control value, one of the GATED
      inertness rows, the fan's arc-limit corners, or DEPTH 4 and 5, is not
      in scope. "Not run" is unknown, never passing.

   3. BYTE MOVEMENT. This is a gate run, not a byte diff. It cannot report a
      moved row. tools/diff-bloom-bytes.mjs is untouched by it and remains
      the close-out instrument for byte identity.

   4. THE VOXEL FLOOD FILL, whenever --conn is off. See the note above:
      measured to have caught neither dome mutant, and never to have caught
      anything in this project. "Never has" is not "cannot".

   5. **WHETHER A SMOKE ROW MAKES A FAMILY FIRE. NARROWED IN SESSION 3a,
      NOT CLOSED.** The hole used to be stated as "a new assertion family
      with no smoke row, and the guard cannot see this one". Half of that is
      now checked: CLAUSE C is a biconditional between the families the
      HARNESS ASSERTS and the families the rows' `path` fields CLAIM, read
      from the assertion sites rather than from a sentence, so a family added
      and never mentioned fails the guard BY NAME and a citation naming a
      family that no longer exists fails it too. That clause found five on the
      day it was written — JS0 and JG0, which had been reported twice and
      patched by hand twice, plus C3, J2 and Z2, which nobody had reported at
      all.

      WHAT IS STILL OPEN IS THE HALF THAT MATTERS MORE, and it is the same
      argument session 17 ruled on: every family runs on every row, so "is J10
      covered?" is trivially true and tells you nothing. What you want to know
      is "can some smoke row make it FIRE", and that is the mutant table,
      which cannot be derived statically. A citation is a claim about the PATH
      a row engages — it is written by the same hand it always was, and CLAUSE
      C checks that the claim names something real, never that it is true.
      **So: RE-RUN THE MUTANT TABLE when an assertion family is added.** There
      is still no check that will do it for you. (Ruled session 17; the static
      half that DID exist was found in session 3a.)

   =================================================================== */

/* HOW THE SUBSET WAS SELECTED — the method, so it can be argued with.

   1. Enumerate the branches actually present in bloom-geometry.js:
      footRing()'s ringed / continuous / fan arms, roleForSlot,
      roleForLayer, ROLE_ALL, petalForm, spineLaw, buildHubInto's flat and
      dome arms, and every guard and floor (the four centre styles, until
      session 20 retired them).
   2. Cross that with the assertion families that need a witness.
   3. For each path take the CHEAPEST matrix row that engages it, preferring
      a row that engages several at once, and preferring pinned / GATED /
      named corners over blanket-sweep rows.
   4. Reject any row costing more than ~15 s unless nothing cheaper carries
      the path.

   Rule 4 did real work: it rejected `DOME: the INCURVE TARGET x rise 0.5`
   (50.2 s) and `DOME LEAN: EVA_CONFIG x rise 1` (80.5 s), and kept the FLAT
   incurve row (14.4 s), which is the other of only two rows in the whole
   matrix that ASSERT plan coverage.

   THE PATH -> ROW MAPPING IS THE `path` FIELD ON EVERY ENTRY BELOW. A
   subset nobody can audit is a subset nobody should trust.

   =================================================================== */

/* THE DRIFT GUARD — two clauses, both machine-checked, no escape hatch.

   The flower project's edge-treatment lesson, one level up: ONE OWNER for
   "is this station covered". Adding a matrix block later without a smoke
   row would silently narrow this instrument while every run stayed green.

   CLAUSE A — BLOCK COVERAGE. buildMatrix()'s own source is parsed for its
   `/* N. TITLE` markers and SMOKE_BLOCKS must declare exactly that set. A
   new block fails the guard BY NAME. There is deliberately no "why no row"
   field: a guard with an escape hatch is a guard that narrows quietly, and
   filling one in is easier than adding a row.

   CLAUSE B — MEMBERSHIP, VERIFIED RATHER THAN ASSERTED. Each block declares
   its FIRST row's label as an `anchor`. The guard resolves every anchor
   against the live matrix, requires the indices strictly increasing and
   starting at 0, derives each block's index range from consecutive anchors,
   and requires each of that block's smoke rows to fall INSIDE its own
   range. So a smoke row attributed to the wrong block is a red run, and a
   block that grows at its head breaks its anchor loudly.

   DERIVING THE ROW->BLOCK MAP FROM SOURCE TEXT WAS TRIED AND IS NOT SOUND:
   labels are template literals and short labels ("petalCount 3") match text
   inside other blocks. The anchor scheme is what makes membership a
   measurement instead of a claim.

   Note the block NUMBERS have gaps — 1, 4..13 and 16..21, because sessions 11
   and 13 folded the per-petal sets into block 13. A block's identity here
   is its marker, never its position.

   =================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildMatrix, ROOT } from './bloom-harness.mjs';

const HARNESS = path.join(ROOT, 'tools/bloom-harness.mjs');

/* ---------- THE SUBSET ---------------------------------------------- */

export const SMOKE_BLOCKS = [
  {
    n: 1,
    anchor: 'DEFAULT (the shipping configuration)',
    rows: [
      { label: 'DEFAULT (the shipping configuration)',
        path: 'the shipping state; every guard OFF at once — petalFormIsFlat, domeIsFlat, thicknessIsUniform, curlIsUniform, one whorl, RADIAL, the bare apex (the centre rig is retired, session 20); O1 (every shell wound outward — the petal shells were inside-out until session 36) and O2 (volume sign and ray parity agree) on the nine-shell default, and X2 (exactly zero within-shell intersecting pairs) on the census\'s own calibration state' },
      /* THE TWIST'S OWN MAXIMUM IS HERE FOR THE EDGE-PROFILE GATE, whose
         default row set IS this subset (one owner of "interesting rows"): it
         adds 45.307323 deg of rim-surface turn on `main`, over E2's 45 deg
         allowance by 0.307 deg, and CI never ran it because no smoke row
         carried a twisted blade (docs/bloom-organic-variance-form-outcome.md
         §18, §20). Declared there with its magnitude, so a twist that turns the
         rim further, or stops turning it, reddens that gate. */
      { label: 'petalTwist max (180)',
        path: 'the blanket sweep\'s twist maximum — the petal\'s own surface rotated out of plane along its length, the class the form-variance field reaches per petal; the edge-profile gate\'s default subset reads it through this row' },
    ],
  },
  /* Blocks 2 and 3 — the centre rig's style x spread and sub-control sweeps —
     were retired with the rig in session 20; the block numbers keep their
     gap, as 14, 15 and 22 already do. */
  {
    n: 4,
    anchor: 'ALL MIN',
    rows: [
      { label: 'ALL MIN',
        path: 'the blanket minimum corner — the bare bloom the flower shipped in seven pieces for months; every row is bare now, and this is the one where the feet cross the axis' },
      /* THE BLANKET MAXIMUM IS THE ONLY ROW THAT ENGAGES XR1, so the subset
         has to carry it or the family has no witness short of the full matrix.
         It is also the most expensive row here — the refusal costs a full
         export-mode build (~120 s) before it returns nothing — and that is the
         honest price of the family having a witness at all. */
      { label: 'ALL MAX',
        path: 'the blanket MAXIMUM corner, and the one configuration this generator REFUSES to export — XR1 (declared in EXPORT_REFUSED_XFAIL: the export is refused, the reason is the TRIANGLE BUDGET specifically, and the count reported exceeds the budget, cross-checked against the builder\'s own tally through a different owner) and XR2 in its silent direction on every other row of this subset (an undeclared row must produce a file). The refusal is asserted rather than skipped, so a row that ever starts exporting fails as hard as one that refuses wrongly' },
    ],
  },
  {
    n: 5,
    anchor: 'FORM: QUILL (roll alone, toward a tube)',
    rows: [
      { label: 'FORM: FIDDLEHEAD (spine curl alone)',
        path: 'uniform spine curl — the closed-form arc branch, C2\'s only witness (the integrator\'s own validity), and C3\'s UNIFORM arm: the shipped arc is never clamped and must never report the floor binding' },
      { label: 'FORM: ROLL CLAMP (roll max x narrowest petal)',
        path: 'cross-section roll and the roll curvature floor, saturating and told; X1 — this row is declared self-intersecting on main at ead8624 (roll 330 folds the blade into a near-closed quill, the census\'s own positive control) and must STILL read pairs, so the fix landing trips the gate' },
      { label: 'THIN: ALL THIN × spread min',
        path: 'the thickness layer, the export feature-size floor diverging from live, and the foot-hub overlap box at its worst reachable corner' },
      { label: 'APEX: the cap entry at the 0.80 clamp (taper 0.60 — the widest entry)',
        path: 'the unconditional cap entered by the FRACTION rule rather than the crossing: A2 (the last emitted row IS the terminus), A3 (never a true apex), A4 (the terminal is the mode floor and nothing else) and A6 (the capped rows are collinear) all read the widest cap this matrix reaches' },
      { label: 'APEX: the cap entry from the crossing (taper 4 — the earliest entry)',
        path: 'the other cap-entry rule — the crossing at twice the print floor, which is what picks uCap on a steep falling limb; the same four clauses on a cap that starts at u 0.59 rather than 0.80, so a cap that only works at one entry rule cannot pass both rows' },
      { label: 'APEX: the narrowest petal (the terminal is the whole tip)',
        path: 'A5 (the apex narrows monotonically — the retired TIP_PLATEAU\'s waist, which BOTH STL gates are blind to) on the petal where the mode floor is the largest fraction of the blade, and A4 where live and export floors differ most' },
    ],
  },
  {
    n: 6,
    anchor: 'CAPABILITY: claw (non-monotone width)',
    rows: [
      { label: 'CAPABILITY: cleft (two-span domain)',
        path: 'the trim domain with two spans per row — the panel-per-span construction, reached only through window.__bloomCapability; X0 — the census reads the builder\'s doubles rebuilt from the page\'s own state WITH this row\'s capability, and X0 requires their float32 rounding to equal the STL float for float, which a rebuild that forgot the capability would break' },
    ],
  },
  {
    n: 7,
    anchor: 'SPIRAL x petalCount 3 (below the legibility flag)',
    rows: [
      { label: 'SPIRAL x defaults',
        path: 'the SPIRAL placement arm and the low-count legibility flag' },
    ],
  },
  {
    n: 8,
    anchor: '6 layers x layerSize min (0.35)',
    rows: [
      { label: '6 layers x layerSize min (0.35)',
        path: 'the layer sub-control sweep at the deepest reachable whorl — a blade narrower than its own root; J2 (containment) over six rings, where layerSize < 1 makes radius_L <= R0 a consequence of the model rather than an identity' },
    ],
  },
  {
    n: 9,
    anchor: 'LAYERS: 3 x spread min',
    rows: [
      { label: 'LAYERS: 3 x ALL THIN x spread min',
        path: 'RADIAL layers — J1-J4 at the thinnest junction the matrix reaches (the wrong-hub mutation\'s region)' },
    ],
  },
  {
    n: 10,
    anchor: 'CONTINUOUS x petalCount 3 x 3 turns (9 in sequence)',
    rows: [
      { label: 'CONTINUOUS x 3 turns',
        path: 'the CONTINUOUS arm — the non-integer layer index, J5 (there are no layers) and J6 (the quantizer identity)' },
    ],
  },
  {
    n: 11,
    anchor: 'ZYGO: THE IRIS (falls curl down, standards rise)',
    rows: [
      { label: 'ZYGO: 3 layers x ALL INNER MAX (one role over two whorls)',
        path: 'a stored INNER design loaded through the role migration (Q3.4) — two per-layer offsets with scopeLayers ON: Z0 (no role field survives), Z1 (one descriptor per whorl) and Z2 (each inner layer is built with exactly the offset the row names, restated from its own @scopes entry)' },
    ],
  },
  {
    n: 12,
    anchor: 'ORCHID x the IRIS (both role axes, one bloom)',
    rows: [
      { label: 'ORCHID x the IRIS (both role axes, one bloom)',
        path: 'the RADIAL labellum and hood DROPPED by ruling while the INNER half beside them migrates to a per-layer offset — Z0 and Z2 (the inner layer carries exactly the migrated offset and nothing of the orchid)' },
    ],
  },
  {
    n: 13,
    anchor: 'FAN: defaults (3/side, a mirror-line petal, 45deg)',
    rows: [
      { label: 'FAN x PER-PETAL: petal 1 extreme x toggle OFF (the same sliders now drive the INNER PAIR)',
        path: 'the FAN arm and a per-PAIR scope on the fixed-point-free involution (a stored per-petal design, migrated) — J7 (the arc and the notch), Z4b (one plane from the emitted azimuths), Z4c (a mirror pair is ONE scope: both members built from one state) and Z2 (the inner pair carries the migrated offset)' },
    ],
  },
  {
    n: 16,
    anchor: 'ALL PETALS: max (curl +360, cup +1.20, tip +0.60)',
    rows: [
      { label: 'ALL PETALS: max x every base at max (curl 360+360, cup 1.2+1.2 — every clamp binds)',
        path: 'the one-whorl all-petals group (ROLE_ALL) with every composition clamp binding at once' },
    ],
  },
  {
    n: 17,
    anchor: 'CROWDING: the mum run — 120 CONTINUOUS x spread min x feet floored (ruled BAD, Eva Sep 3)',
    rows: [
      { label: 'CROWDING: the mum run — 120 CONTINUOUS x spread min x feet floored (ruled BAD, Eva Sep 3)',
        path: 'the crowding flag RAISED — the only ruled-BAD configuration, D_max >= 11 (the flag\'s other direction is every other row here)' },
    ],
  },
  {
    n: 18,
    anchor: 'DEPTH: 4 layers x RADIAL x spread min (0.6)',
    rows: [
      { label: 'DEPTH: 6 layers x ALL THIN x spread min (feet across the axis on every ring)',
        path: 'depth beyond three, with footRing()\'s underFootFloor and crossesAxis telemetry flags both raised' },
    ],
  },
  {
    n: 19,
    anchor: 'DOME: rise 1 x RADIAL x spread min (0.6)',
    rows: [
      { label: 'DOME: rise 0.5 x petalCount 8 (the default count)',
        path: 'headRise: the cap, the shell, the rigidly rotated blade frame and domeLean — J1, J3, J8, J9' },
      { label: 'DOME: GATED — rise 0 pinned (must be bit-identical to the default: the guard)',
        path: 'the dome GUARD — domeIsFlat() must reproduce the pre-dome expression, domeGuardResidual exactly 0' },
      { label: 'DOME: the APEX CORNER — ALL MIN x sheet 2.40 x spread min x rise 1 (the floor binds, CLAMPED to 0.25)',
        path: 'the apex-radius floor, the one reachable corner where the rise saturates and the read-out says CLAMPED' },
      { label: 'DOME: the INCURVE TARGET, flat (40/turn x 3, spread 1.60, length 20, tilt 75, curl 150, ALL THIN feet) · curl family pinned at identity, COVERAGE ASSERTED',
        path: 'plan coverage ASSERTED — one of only two rows in the matrix that assert it (the rise-0.5 twin costs 50.2 s and is deliberately out)' },
    ],
  },
  {
    n: 20,
    anchor: 'DOME LEAN: EVA_CONFIG flat (the headRise-independent baseline the lean must not touch)',
    rows: [
      { label: 'DOME LEAN: EVA_CONFIG flat (the headRise-independent baseline the lean must not touch)',
        path: 'the dome-lean block\'s flat baseline. NOTE, honestly: this row is FLAT, so domeLean is 0 on it — the domeLean LAW\'s witness in this subset is block 19\'s rise-0.5 row, not this one. It is here because its two domed siblings cost 80.5 s and because the guard has no escape hatch, which is deliberate' },
    ],
  },
  {
    n: 21,
    anchor: 'CURL: bias max x incurve target x rise 0.5 (documented: re-opens 16.0% of the crown, tips 5-11 mm out)',
    rows: [
      { label: 'CURL: FIDDLEHEAD x start 0.5 (SELF-CONTACT: the tip lands on its own mid-blade)',
        path: 'curl START engaged — spineLaw()\'s table rather than the arc, the spine floor, and the SELF-CONTACT flag raised' },
      { label: 'CURL: FIDDLEHEAD x bias max (a crozier winds inside itself: no self-contact)',
        path: 'curl BIAS engaged — the turn redistributed toward the tip; C3\'s NON-UNIFORM arm, where the spine floor is applied rather than told (underFloor, clamped and the turn built against the turn asked)' },
      { label: 'TAPER: QUILL x taper max (roll clamp; opens toward the tip)',
        path: 'the roll-taper envelope along the length' },
      { label: 'GRADIENT: cup gradient max x cup max x widest petal (the metric reaches 2.6 at the tip)',
        path: 'cup gradient composing onto cup, at the widest reachable petal' },
    ],
  },
  {
    n: 22,
    anchor: 'SPHERE: defaults (8 per turn x 1 turn — eight feet on a sphere)',
    /* DERIVED BY THE HEADER'S OWN METHOD (session 18): the branches the mode
       adds are footRing()'s sphere arm (the polar key, the equal-area step,
       the reserved-pole telemetry), buildHubInto's closed-sphere arm, the
       lean-0 frame, the apex floor's sphere arm, and the hidden-and-inert
       paths in both directions. THE FAMILIES ARE NOT ENUMERATED HERE
       (session 3a): every `S` family the harness asserts is claimed by a
       row's `path` below, and CLAUSE C checks that biconditional against the
       harness's own assertion sites — this sentence used to read "S1-S4",
       which happened to be complete while both its siblings had gone stale,
       and a hand-written list that is right today is the same object as one
       that is wrong tomorrow. What stays prose is the CLAUSES OF OTHER
       families this block also carries — J5's sphere arm, J6's null clause,
       J9's lean-0 clause, crowding's (s, theta) raster with its far-pole
       clause, and the loud coverage skip — because those families are
       witnessed elsewhere and a clause is not a family. Cheapest row per path; the GATED inertness rows are pinned
       states, preferred over sweep rows; the 240-foot row and the mum sphere
       are out (they carry no path the incurve sphere does not, and cost
       more). The incurve sphere is the one row over ~15 s kept, because
       nothing cheaper reaches a dense pole where the (s, theta) raster's
       fine pass and R5 are actually exercised. */
    rows: [
      { label: 'SPHERE: defaults (8 per turn x 1 turn — eight feet on a sphere)',
        path: 'the sphere arm at its cheapest — S1 (equal-area, pole to pole), S2 (the closed hub, 6,720 tris), S3 (the reserved pole), J5\'s polar-angle arm, J6 nulled, J9 lean 0, the coverage skip' },
      { label: 'SPHERE: the INCURVE sliders (40/turn x 3, spread 1.60, length 20, tilt 75, curl 150, ALL THIN feet) — the sheet\'s headline',
        path: 'a dense pole: the (s, theta) raster and its fine pass, R4 on 120 far-side feet, R5 convergence, C1 on the lean-0 frame under curl' },
      { label: 'SPHERE: the APEX CORNER — ALL MIN x sheet 2.40 x spread min (the sphere held at one sheet, CLAMPED)',
        path: 'the apex floor\'s sphere arm — Rd held above R0, CLAMPED, told; S4\'s clamp clause' },
      { label: 'SPHERE: 6 turns x layerSize min (the 0.18 mm blade at the face pole)',
        path: 'THE CRAMPED PETAL, and the only row in this subset whose corner-fan outline segments fall under RIM_CORNER_MIN_MM. Before that gate it emitted 56 degenerate triangles in EXPORT and 118 in LIVE, and the export gate RATES degenerate triangles — so this row is what makes a regression of the rim sliver defect visible to a local run instead of only to a three-hour matrix. It is here for coverage of an axis, not of a family: every family it touches is claimed by the rows above, and NO row in this subset carried a degenerate triangle before it' },
      { label: 'SPHERE: GATED — Head rise 1 under SPHERE (hidden and inert; bit-identical to the sphere at rise 0)',
        path: 'S4 — headRise hidden AND inert under SPHERE (the bit-identity itself is the byte diff\'s; this row proves the guard and the DOME clause on the state)' },
      { label: 'SPHERE: GATED — SPHERE stored under RADIAL (hidden and inert; bit-identical to the default)',
        path: 'the other direction — a stored SPHERE under a ringed placement builds the cap; sphereMode false in both statements, no closed hub, no reserved-pole telemetry' },
    ],
  },
  {
    n: 23,
    anchor: 'STAMENS: 6 on a RING (the six-stamen candidate)',
    /* DERIVED BY THE HEADER'S OWN METHOD (session 21): the branches the part
       adds are footRing()'s androecium map (RING / DISC, the area rule and
       its hub clamp, the annulus flag), buildStamenInto's rod and tip,
       spineLaw() at tilt 0 with a curl, the root on the CAP's normal, and
       the hidden-and-inert path under SPHERE. THE FAMILIES ARE NO LONGER
       WRITTEN DOWN HERE (session 3a): every `JS` family the harness asserts
       is claimed by a row's `path` below, and CLAUSE C checks that
       biconditional against the harness's own assertion sites. This sentence
       used to read "JS1-JS6", which was short by one from the day JS0
       shipped — a range names its ends and hides everything between, so a
       reader auditing this block against the harness could only see the
       omission by counting. JS6 arrived in session 26 with the tip
       primitive; every row here carries it, and the mutant table was re-run
       rather than assumed, per hole 5 above. Cheapest row per path.

       WHAT THIS BLOCK IS BLIND TO AFTER SESSION 24, stated rather than
       assumed: the two rows above carry JS5's DISC and RING arms, but NOT
       its NO-ROOM corner — the disc inside its own inner limit, which is the
       live matrix's `STAMENS: 1 stamen on the DISC` row and is not in the
       subset. A mutation that only breaks the no-room clamp passes here. */
    rows: [
      { label: 'STAMENS: 6 on a RING (the six-stamen candidate)',
        path: 'the RING layout at the six-stamen candidate — JS1 (flat normal), JS2 (containment, the radial law), JS3 (the root cylinder), JS4 (six free ends at the fixed count, and the apex one radius past the floored band), JS5\'s RING arm (innerUsed and noRoom NULL, the stamens still at R), JS6 (the tip frame is the Rodrigues identity; the outline is exactly 1)' },
      { label: 'STAMENS: 120 DISC x Head rise 0.5 (the tips fan out with the normals)',
        path: 'the DISC layout at the count ceiling, CLAMPED at the hub, 86 roots in the petal-root annulus, on a CAP — JS1 on the cap\'s normal, JS5\'s annulus law and equal-area clause, the two distance flags' },
      { label: 'STAMENS: 6 x curl max (180) — bent in over the centre',
        path: 'spineLaw() at tilt 0 with a curl engaged — the filament off its normal beyond the outer face while the root stays on it' },
      /* F1.2 (Oct 12): the length variance and the 120 mm ceiling — JS8's
         restated length law against the emitted rods on a varied ring, and
         the CLAMPED arm at the new ceiling. */
      { label: 'STAMENS: 6 x length variance 0.5 (random per stamen, seeded from the index)',
        path: 'the length variance engaged on the six-stamen ring — JS8 (each rod\'s outer-root-to-tip chord against the length law restated from the controls and the stamen index, the per-stamen clamp flags, the built extremes and SLENDERNESS as the longest filament\'s)' },
      { label: 'STAMENS: 6 x length max (120) x variance max (1) — the ceiling CLAMPS the long draws, told',
        path: 'the 120 mm ceiling with the variance at its maximum — JS8\'s CLAMPED arm in both directions (the draws past 120 built AT the ceiling and counted, the rest unclamped and not counted) and the ceiling itself pinned at Eva\'s fixed 120' },
      /* F1.3a: the independent coil — JS9's restated helix against the
         emitted rings on the shipping coil, and the floor's TURNS clamp. */
      { label: 'STAMENS: 6 x COILED (independent, r 1.5 mm x 3 turns) — the lily-like coil',
        path: 'the independent coil at its defaults — JS9 (the two statements of a built coil; every free station on the helix restated from the controls and the stamen index about the closed-form base arc; the rod end and the anther axis on the restated END TANGENT; the end ring vector read off the emitted last ring; SLENDERNESS as the longest coiled arc) and JS4 at the coil\'s station count' },
      { label: 'STAMENS: 6 x COILED x turns max (12) — the curvature floor CLAMPS the turns, told',
        path: 'the coil at the turns ceiling on a 20 mm filament — JS9\'s CLAMPED arm (the turns the floor admits, bisected on the exact curvature restated in the gate, counted both ways) and the restated coil holding one sheet thickness of radius' },
      { label: 'STAMENS: GATED — every control at MAXIMUM under SPHERE (hidden and inert; bit-identical to the bare sphere)',
        path: 'the other direction — hidden AND inert under SPHERE: no descriptor, no stamen emitted, no free end tallied, and JS0 in its ABSENT arm (the registry\'s androeciumEligible against the geometry\'s on this state, the owner declaring none while every control is at maximum, and the distance flags reading absent)' },
    ],
  },
  {
    n: 24,
    anchor: 'GYNOECIUM: a style on the bare apex (the four states — style only)',
    /* DERIVED BY THE HEADER'S OWN METHOD (session 22): the branches the part
       adds are footRing()'s gynoecium map (the apex record, the wider-than-
       the-hub corner, the annulus flag), rodInto on the axis, the trifid's
       three pills, spineLaw() at tilt 0 with a curl on the style, and the
       hidden-and-inert path under SPHERE for the WHOLE centre. THE FAMILIES
       ARE NO LONGER WRITTEN DOWN HERE (session 3a): every `JG` family the
       harness asserts is claimed by a row's `path` below, and CLAUSE C checks
       that biconditional against the harness's own assertion sites. This
       sentence used to read "JG1-JG5" and was short by JG0, the same way
       block 23's was short by JS0 — the two were patched by hand in the same
       sessions and went stale in the same sessions. JG5 arrived in session 26
       with the tip primitive; the trifid is where the tip frame is not the
       identity, so these rows are its only witness in the subset.
       Cheapest row per path; the four-state matrix's "both present" row is
       the second. */
    rows: [
      { label: 'GYNOECIUM: a style on the bare apex (the four states — style only)',
        path: 'the style alone — JG1 (the root exactly on the axis, the normal exactly +z, through the full slab), JG2, JG3 (the root cylinder), JG4 (960 triangles, the trifid law on the emitted lobes), JG5 (the tip frame is the Rodrigues image; the outline is the law and exactly 1)' },
      { label: 'GYNOECIUM: style x 6 stamens on a RING (the four states — both present)',
        path: 'both parts present — the two descriptors from one owner on one row, JS0 JS1 JS2 JS3 JS4 JS5 JS6 and JG0 JG1 JG2 JG3 JG4 JG5 together in their PRESENT arms, the centre accumulator counting both in the coverage instruments\' R1' },
      { label: 'GYNOECIUM: style x 6 x filament curl max (180) — the filaments cross the axis the style stands on',
        path: 'spineLaw() with a curl on the filaments while the style stands on the axis they cross — the interaction the sheet is for; the rod helper on both parts' },
      { label: 'GYNOECIUM: GATED — the WHOLE centre at MAXIMUM under SPHERE (both parts hidden and inert; bit-identical to the bare sphere)',
        path: 'the other direction for BOTH parts — hidden AND inert under SPHERE: no descriptor of either kind, nothing emitted, and JS0 and JG0 together in their ABSENT arms (both two-statement guards on one state)' },
    ],
  },
  {
    n: 25,
    anchor: 'ANTHER: 6 stamens at the shipped pill (the tip block\'s own control row)',
    /* DERIVED BY THE HEADER'S OWN METHOD (session 29): the branches the
       anther's seven add are the two proportions read from controls rather
       than constants, tipPinchFloor's three arms (no clamp / clamped /
       the whole tip under the floor), tipSides' two arms (a circle on the
       rod's lattice, a shaped outline on its own), the blend at a
       roundedness below 1, and buildStamenInto's lump loop above one. Every
       `JS` family is claimed by a row's `path` and CLAUSE C checks the
       biconditional; JS7 is this block's own and every row here carries it.

       WHAT THIS BLOCK IS BLIND TO, stated rather than assumed: the
       COINCIDENT corner (two lobes at a spread of 0) and the LEANING corner
       (one lobe at a spread above 0) are live-matrix rows and are not in the
       subset, so a mutation that only breaks `lumpsCoincident` or that
       silences the spread at a count of one passes here. So does anything
       that only shows at 120 stamens — the cost corner is a full-matrix row.
       And SIZE is not swept here at all: the elongation row below carries the
       two-proportion rebuild, and a defect reachable only through `size` (the
       under-the-floor corner is its own live row) would pass. Cheapest row
       per path.

       THE ELONGATION ROW IS HERE BECAUSE THE SUBSET WAS MEASURED BLIND, not
       because it looked owed: block 25's first four rows all sit at the two
       shipping proportions, and session 21's `not the fixed proportion`
       clause in JS4 — which session 29 retires into JS7 — failed four
       live-matrix rows while every smoke row stayed green. Found by running
       the block through the export gate. */
    rows: [
      { label: 'ANTHER: a TRIANGLE (3 points, pinch 1.00 — the polygon, roundedness 0)',
        path: 'the outline OFF the circle at the shape Eva named — JS7 (the descriptor is the seven controls, the two proportions rebuilt from the slab, the lattice law and its multiple-of-2n property at 12 sides for 3 points, the waist clear of the floor) and JS6 on a tip whose factors are NOT all 1, with JS4\'s census on the tip\'s own lattice' },
      { label: 'ANTHER: the WAIST FLOOR binding (pinch max 7.00 at roundedness 0 — CLAMPED, told)',
        path: 'tipPinchFloor\'s CLAMPED arm — JS7\'s restated closed form against the owner\'s, the built pinch BELOW the asked (a cap), pinchFloored true and underFloor false, and the emitted waist at the 0.50 mm floor' },
      { label: 'ANTHER: elongation min (1.00) — A SPHERE, the band floored',
        path: 'the two PROPORTIONS off their constants — JS7 rebuilding diameter and length from the SLAB and the two controls (the clause session 21 pinned to ANTHER_DIAMETER_FACTOR, retired into it), and JS4\'s per-lobe apex reach on a band the elongation floor is holding open' },
      { label: 'ANTHER: 3 lobes at 40° — the trifid\'s own law on an anther',
        path: 'buildStamenInto\'s lump loop above one — three tips at a whole turn apart on the anther, JS6 per lobe at its own azimuth (the frame is the Rodrigues image, NOT the identity), JS4\'s per-lobe apex reach along each lobe\'s own axis and the census at three lumps' },
      { label: 'ANTHER: INERT — the points and the pinch at their extremes with roundedness 1 (bit-identical to the shipped pill)',
        path: 'the other direction — hidden AND INERT at a roundedness of exactly 1: JS7 evaluates both laws at the opposite corner of both controls and requires an identical answer (the lattice is the rod\'s own and every factor is Object.is 1), which is the shipping anther\'s whole byte-identity argument' },
    ],
  },

  {
    n: 26,
    anchor: 'STIGMA: a style at the shipped trifid x 6 stamens (the tip block\'s own control row)',
    /* DERIVED BY THE HEADER'S OWN METHOD (session 30): the branches the
       stigma's seven add are tipDescriptor()'s SECOND call (the same owner on
       the style's diameter — a prefix crossed, a field read from the wrong
       instance), buildStyleInto's lump loop at a count that is not three and
       at a spread of 0 (the trifid's own coincident corner), and JG4's
       count-and-aim clauses now read from the descriptor rather than from
       constants. JG6 is this block's own and every row here carries it.

       WHAT THIS BLOCK IS BLIND TO, stated: the two proportions off their
       constants (size / elongation are live-matrix rows here — block 25's
       elongation row carries the two-proportion rebuild on the OTHER tip
       through the same function, which is the generator's argument and not
       a substitute for a stigma row), the lattice extremes, the LEANING
       corner, the 120-anther cushion and the fat style. Cheapest row per
       path; the FAMILY row is here because it is the one state where both
       instances are shaped at once. */
    rows: [
      { label: 'STIGMA: a TRIANGLE (3 points, pinch 1.00 — the polygon, roundedness 0)',
        path: 'the outline OFF the circle on the STIGMA — JG6 (the descriptor is the seven stigma controls, the two proportions rebuilt from the slab, the lattice law at 12 sides for 3 points, the waist clear of the floor) and JG5 on lobes whose factors are NOT all 1, with JG4\'s census on the lobes\' own lattice' },
      { label: 'STIGMA: the WAIST FLOOR binding (pinch max 7.00 at roundedness 0 — CLAMPED, told)',
        path: 'tipPinchFloor\'s CLAMPED arm on the stigma\'s lobe — JG6\'s restated closed form against the owner\'s, the built pinch BELOW the asked (a cap), pinchFloored true and underFloor false' },
      { label: 'STIGMA: ONE lobe at 0° — a pill on the style (the anther\'s own default shape)',
        path: 'buildStyleInto\'s lump loop at a count of ONE — JG4 with no azimuth step to ask about and the apex clause on a single lobe, JG5 at the Rodrigues identity (spread 0), JG6 holding the count and the aim to the controls' },
      { label: 'STIGMA: COINCIDENT — 3 lobes at a spread of 0 (duplicate geometry, told, never refused)',
        path: 'the trifid\'s own coincident corner — JG4\'s shared-apex biconditional in its COINCIDENT direction, JG6\'s lumpsCoincident flag both ways' },
      { label: 'STIGMA: the NEAREST REACHABLE TO THE CIRCLE (pinch min 0.05 at roundedness 0 — every factor 0.983, none exactly 1, on the 16-side lattice; the singular exponent sits one step below)',
        path: 'the pinch\'s MINIMUM, one step above the singular exponent — JG5\'s every-factor-1 clause with NO exemption (session 31) on factors that are 0.983 at the diagonals, JG6 on the descriptor at the bottom of the range' },
      { label: 'STIGMA: THE FAMILY — the same seven on both tips (3-point polygons at pinch 1, roundedness 0, on six anthers and the trifid)',
        path: 'both instances shaped at once — tipDescriptor() called twice on one state, JS7 and JG6 together in their OFF-THE-CIRCLE arms, JS6 and JG5 on factors that are not all 1, the two lattices each 12 sides; the pair the sheet puts in front of Eva' },
      { label: 'STIGMA: INERT — the points and the pinch at their extremes with roundedness 1 (bit-identical to the shipped trifid)',
        path: 'the other direction — hidden AND INERT at a roundedness of exactly 1 on the stigma: JG6 evaluates both laws at the opposite corner of both controls and requires an identical answer, the trifid\'s whole byte-identity argument for the pinch default (session 31: the same exponent as the old 1.00, exactly)' },
    ],
  },
  {
    n: 27,
    anchor: 'BUCKLE: the default frequency at a strong amplitude (0.30 x, f 3)',
    /* DERIVED BY THE HEADER'S OWN METHOD (session 34): the branches margin
       buckling adds are `buckleIsFlat` joining `petalFormIsFlat` (so the
       field is CONSTRUCTED at all), `buckleLaw`'s amplitude clamp, and the
       true-surface-normal branch in buildPetalInto that replaces the
       cross-section normal on blade rows. Every one of those needs a row
       with a NON-ZERO amplitude; a row that only sets frequency or reach is
       inert by construction and exercises none of them.

       WHY THIS BLOCK EXISTS AT ALL, recorded because it is the finding:
       block 27 originally shipped with a decorative "BLOCK 27 ---" banner
       instead of the "27. TITLE" marker CLAUSE A parses, so the block was
       INVISIBLE to the census, no row was demanded, and the smoke subset
       silently never built a buckled petal. A FORM_IDS defect that made
       every buckle row read as a flat row then reached CI and failed 23
       validity assertions on the connectedness gate. The clamped row is the
       anchor because the clamp is the one branch a gentle amplitude misses.

       WHAT THIS BLOCK IS BLIND TO, stated rather than assumed: the two
       reference looks (iris at low p, rose at high p) and the reach axis are
       live-matrix rows only, the per-slot phase has no witness here at a
       single petal count, and the COMPOSITION xfail is the wall
       instrument's rather than this subset's. Cheapest row per path. */
    rows: [
      { label: 'BUCKLE: the default frequency at a strong amplitude (0.30 x, f 3)',
        path: 'the field CONSTRUCTED and CLAMPED at once — buckleIsFlat joins petalFormIsFlat so petalForm() is built, buckleLaw clamps 0.30 against its own f-dependent cap, and the blade rows take the true surface normal rather than the cross-section one. It is also the row that makes FORM_IDS honest: a harness that does not count buckleAmp as a form control reads this as a FLAT row reporting form telemetry' },
      { label: 'BUCKLE: GATED — frequency and reach at MAXIMUM with amplitude 0 (hidden and inert; bit-identical to the default)',
        path: 'the OTHER direction, and the one that fails if buckleFreq or buckleEnv are ever added to FORM_IDS: both at their extremes with no amplitude is a FLAT row and must build one, so the guard must short-circuit and the telemetry must be absent' },
    ],
  },
  {
    n: 28,
    anchor: 'TIP SHAPE: 0.60 x the thickest sheet (2.40 — the floor doubles and binds early)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this block adds are the
       superellipse arm of `tipLaw` (u > uPk), the DEMOTED cap — which is now
       just the print floor inside widthProfile's `max`, so it needs a row
       where that floor actually binds over a large share of the apex — and
       `bladeStations`, whose two identities are the held rows and the gap
       bound. The bound has two arms, unbounded and buckle-derived, and the
       second only exists at a non-zero amplitude.

       WHY THE ANCHOR IS THE THICKEST SHEET rather than a bare exponent
       sweep: at the default sheet the floor owns one row of twenty-five, so a
       row that merely moves the exponent exercises the law and leaves the
       clamp arm effectively untested. At 2.40 mm the floor doubles and takes
       a real share of the apex, which is the state that separates "the cap is
       a print floor" from "the cap is a shape" — the distinction the whole
       demotion rests on.

       WHAT THIS BLOCK IS BLIND TO, stated rather than assumed: five of Eva's
       six named states are live-matrix rows only; so are the far-out widest
       point (where the OLD cap made the exponent inert), SPHERE, and the
       cleft margin. The redistribution's own before/after — the apex chord
       error against a uniform ladder — is not reachable from a single tree at
       all and belongs to the byte diff and the sheet. Cheapest row per path. */
    rows: [
      { label: 'TIP SHAPE: 0.60 x the thickest sheet (2.40 — the floor doubles and binds early)',
        path: 'the DEMOTED cap doing its one job — the print floor is the only thing setting the terminal, and it binds over a large share of the apex, so A4 reads the floor and A6 must still recover the asked exponent by fitting on the ACTIVE BRANCH only. A6 fitted through the floor instead reads 0.6080 for an asked 0.60, which is the defect this row exists to catch' },
      { label: 'LADDER x BUCKLE: f 7 — the ceiling, where the gap bound collapses the ladder to uniform',
        path: 'the ladder\'s buckle-derived arm at the one frequency with no slack: A8 requires the stations to be exactly uniform there, since 56 rows over 7 cycles is the bar exactly, and A7 requires the held rows below ROOT_BLEND_END to be the uniform ones whatever the bound did' },
      { label: 'TIP SHAPE: 3.00 x ALL FORM MAX (the ladder under every deformation at once)',
        path: 'the ladder\'s UNBOUNDED arm redistributing hardest, under every form deformation at once — A7 for the held rows and the strictly-increasing stations (two rows at one station is a zero-length panel), A6 for the exponent surviving cup, curl, roll and twist' },
    ],
  },
  {
    n: 29,
    anchor: 'LOBES: the first live step (depth 0.01)',
    /* DERIVED BY THE HEADER'S OWN METHOD (session 38): the branches lobes add
       are `lobesEngaged` (the outline's cut is CONSTRUCTED at all), the
       window and its stationing on the base outline's arc, the two caps
       (the ruled count ceiling and the pitch floor; the depth cap at the
       print floor) each in its binding and non-binding direction, and the
       GATED plain petal. Cheapest row per path.
       WHAT THIS BLOCK IS BLIND TO, stated rather than assumed: the
       compositions (cup, buckle, roll, curl, twist), every placement but
       RADIAL, the centre, the apex law's ends and the tip-shape axis are
       live-matrix rows only; the census verdict on the folds declared on
       main is the export gate's X family on the full matrix. */
    rows: [
      { label: 'LOBES: 10 asked at the default coverage — CLAMPED to 6, told',
        path: 'the cut CONSTRUCTED and the ROWS CAP binding at once (the ladder\'s capacity over the per-period demand, L6 asserting every PERIOD served and not merely the window total) — L0 (the predicate and the guard agree), L1 (a lobed row reports the cut), L2 (cut in, never out: the outline at or below the base everywhere and identical below the treated arc), L3 (the sinuses the law puts on THIS margin, countBuilt the least of asked / the ladder\'s / the pitch cap, CLAMPED by the rows and told), L4 (the rim as ONE curve — the margin arc plus half the terminal face, re-measured on the mode-free lamina, the treated arc coverage of it and the pitch the whole arc over the periods), L5 (the per-period relief guard NOT binding at 0.30, every tooth on the margin at the asked relief, the print floor kept at every sinus), L6 (the crest at the arc\'s base end exact, the terminal face never collapsed, every sinus reached by a station within its OWN period), L8 (the apex is an EVEN count\'s flat notch, and the outline over [uCap, 1] is NOT the plain petal\'s — the identity session 40 established for MODEL A, negated)' },
      { label: 'LOBES: DEPTH 1.00 at maximum coverage over 5 teeth — SIX of the six periods relief-limited, the residual fade measured at its worst',
        path: 'L5 in its BINDING direction — every period\'s relief limited by its own sinus\'s headroom rather than by one global clamp, the depth NOT clamped (depthBuilt is what was asked), the print floor kept at every sinus on the mode-free lamina, and `depthClamped` the biconditional against the saturation depth; L8 with an ODD count, so a CREST sits at the apex and `apexReliefMm` is null' },
      { label: 'LOBES: NO ROOM by the pitch floor (20 mm petal, sheet 2.40, coverage 0.10 — a 3.5 mm treated arc under a 2.40 mm pitch floor holds no period; nothing cut, told)',
        path: 'the PITCH FLOOR as the cause of NO ROOM — L3\'s noRoom branch naming the pitch (the treated arc under max(sheet, MIN_FEATURE_MM) holds no period while the rows cap would allow three), L2 the outline identical to the base everywhere, L1 the record present and telling; the one direction the count cap has that the rows cap does not exercise, and the clause that MODEL A\'s \'region\' cause is unreachable' },
      { label: 'LOBES: GATED — count, coverage and BOTH shapes at MAXIMUM with depth 0 (hidden and inert; bit-identical to the default)',
        path: 'the OTHER direction — L0 and L1 on a plain petal: depth 0 with every sub-control at its extreme builds no cut and reports no record; the row the byte tool proves bit-identical to the default' },
      /* THE SHAPE AXIS (session 41). L7 is measured on the EMITTED outline,
         so the row has to be one where BOTH of its measurements run: the
         notch needs an UNCLAMPED depth (a clamped one holds the sinus on the
         print floor, where the removed material is the floor's rather than
         the law's) and the crest needs an INTERIOR crest, which exists only
         from two lobes up. The triangle wave is the cheapest such row AND
         the one the shipped one-exponent family could not draw at all. */
      { label: 'LOBES: the TRIANGLE wave (crest 1.00, notch 1.00 — both acute, the serrate margin; g(r) = r to the bit)',
        path: 'THE TWO SHAPE EXPONENTS — L7 in both of its measurements at once, on a row with an unclamped depth and interior crests: the local power of the removed material (hb - h) at a ternary-searched crest is the page\'s own lobeCrestShape and at a sinus its lobeNotchShape, so a build whose two controls are swapped, coupled or served by one expression fails here and nowhere else; and L3\'s demand clause with the SHAPE-dependent floor away from its ceiling (a triangle wave asks 3 stations a lobe, not 11), which is the one path on which the count cap is not the ruled constant\'s' },
    ],
  },
  {
    n: 30,
    anchor: 'STEM: the shipped middle (60 mm x 6 mm, hollow, a 1.5 mm wall)',
    /* DERIVED BY THE HEADER'S OWN METHOD (session 43): the branches a stem adds
       are `stemIsAbsent` (whether a stem is CONSTRUCTED at all), Eva's bore rule
       in BOTH of its arms (solid at the 3 mm floor, hollow above it), the
       hub-to-stem join ACTIVE and INERT, and the domed head, where the
       attachment face is high inside the bowl so the visible length differs from
       the total. Cheapest row per path.
       WHAT THIS BLOCK IS BLIND TO, stated rather than assumed: SPHERE (which
       is block 32's — on a sphere the stem decides which petals are built, and
       that is its own claim), every placement but RADIAL, the widest hub, and
       the centre rooted through the same slab. */
    rows: [
      { label: 'STEM: the shipped middle (60 mm x 6 mm, hollow, a 1.5 mm wall)',
        path: 'a stem CONSTRUCTED with the join ACTIVE and the bore OPEN at once — ST0 (the registry\'s stemPresent and the geometry\'s stemIsAbsent are exact complements, and the builder declares a stem iff the state asks for one), ST1 (built iff declared), ST2 (on the axis, running down, the length the control asked for, and the placer\'s stations in MILLIMETRES OF ARC from the hub), ST3 (Eva\'s bore rule on the EMITTED radii, wall exactly 1.5), ST4 (rooted THROUGH the slab, never a hairline), ST5 (the hub\'s emitted underside IS the join\'s declared law, and the hub\'s own thickness beyond the blend radius), ST6 (the petal-to-hub junction untouched, against a stemless build of the same state), ST10 (the bore is CLOSED at BOTH ends — the tip plug is Eva\'s own wall thickness measured off the EMITTED rings, and the void the two closures leave is emitted iff the plan leaves one)' },
      { label: 'STEM: SOLID at the floor (3 mm OD — the bore closes, Eva\'s rule)',
        path: 'the OTHER arm of the bore rule — ST3 with bore 0, the capped-cylinder branch whose cap must be fanned from a RIM vertex and never from the axis (a centre fan shares the hub\'s own apex vertex EXACTLY, welds the two shells and turns a by-design overlap into a within-shell self-intersection: measured 528 pairs before the fix, 0 after), and ST5 with the join barely active at 1.299 mm over the hub\'s 1.200' },
      { label: 'STEM: x a domed head (rise 0.50 — part of the stem is inside the bowl)',
        path: 'the CAP arm of the join, where the hub\'s underside is a curved plate and its emitted thickness is a DIFFERENCE of two radii rather than the law\'s own value — ST5\'s ULP bound in the unit the quantity carries, which an exact equality got wrong on the first domed row it ever saw; and the two lengths differing, which is the whole reason the read-out prints both' },
      { label: 'STEM: GATED — diameter at MAXIMUM with length 0 (hidden and inert; bit-identical to the default)',
        path: 'the OTHER direction — ST0 and ST1 on a stemless bloom: the diameter at its extreme builds no stem and leaves the join INERT, so the hub takes its pre-stem expression verbatim; the row the byte tool proves bit-identical to the default' },
    ],
  },
  {
    n: 31,
    anchor: 'FRINGE: THE CARNATION — 7 teeth on a 0.50 terminal at the shipped depth',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this family adds are the
       TERMINAL term (pushed onto the term list or not), the fringe's own panel
       decomposition (one 'full' span or N+1 panels), the COUNT CLAMP in both
       of its arms, NO ROOM (a fringe asked with no terminal to carry it), and
       the lobe family going inert under a fringe. Cheapest row per path.
       WHAT THIS BLOCK IS BLIND TO, stated rather than assumed: every placement
       but RADIAL, the form controls (cup, roll, curl, the buckle) over a
       fringe, multiple whorls, and the extreme sheets — all of which are live
       matrix rows and none of which is in the subset. */
    rows: [
      { label: 'FRINGE: THE CARNATION — 7 teeth on a 0.50 terminal at the shipped depth',
        path: 'the feature CONSTRUCTED, both halves at once — FR0 (the registry\'s fringeEligible and the geometry\'s agree, and the builder declares a fringe iff the state asks for one), FR1 (built iff declared: N+1 panels and N spans at the petal\'s END, from the builder\'s own tally), FR2 (the terminal is a TERM with its own domain, it never wins below uPk, and the emitted half-width at u=1 IS the terminal), FR3 (the split is owned in PHYSICAL units — the target station is 1 - fringeDepth and the landed station is within half a row gap of it), FR4 (every tooth and every gap clears MIN_FEATURE_MM at the station where it is narrowest), FR5 (the count ceiling is the TERMINAL\'s width and the clamp is a biconditional)' },
      { label: 'FRINGE: CLAMPED — 10 teeth asked on a terminal that cannot carry them (0.30; told, never refused)',
        path: 'the CLAMP\'s live arm — FR5 with countAsked above countBuilt and the reason named, on the terminal that is barely clear of its own dead travel; the row where the ceiling binds hardest without the petal changing size' },
      { label: 'FRINGE: NO ROOM — a fringe asked with no terminal at all (no end to cut teeth into; told, and bit-identical to the default)',
        path: 'the NO ROOM arm — a fringe asked where the blade converges to 2 x TIP_HALF_MM, which is the state the picture session measured as unbuildable at any count; FR1 must refuse it in BOTH directions (not built when the end is under the mode-free floor, and never built when it is above), name the cause, and leave the petal a single span' },
      { label: 'FRINGE: GATED — LOBES asked for under a fringe (hidden AND inert, by ruling — the fringe wins)',
        path: 'the mutual exclusion in the direction that can silently fail — the lobe family at MAXIMUM under a live fringe must contribute NOTHING, so L0\'s own record is absent and the emitted outline is the fringe\'s alone; the defect this catches is a lobe cut still narrowing every finger, which no count and no span check can see' },
      { label: 'FRINGE: GATED — the terminal at 0 with the fringe at MAXIMUM (no terminal, so no fringe; bit-identical to the default)',
        path: 'the OTHER direction — both guards at once on a bloom that must be the shipping default to the bit: the terminal term is not pushed and trimPanels returns the single \'full\' span, so FR0 and FR1 read absent and the byte tool proves the row unmoved' },
    ],
  },
  {
    n: 32,
    anchor: 'SPHERE STEM: the default sphere at the shipped stem (60 mm x 6 mm)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this family adds are the
       channel EXISTING at all (a sphere with a stem) or not (any other head, or
       no stem), the mask firing on SOME slots and on ALL of them, and the
       sphere's own arms of `stemPlan` (the stem leaving the RESERVED pole, and
       the join INERT on a shell — which is also the first row in this project
       ever to reach ST5's inert arm). Cheapest row per path.
       WHAT THIS BLOCK IS BLIND TO, stated rather than assumed: the 240-foot
       head (the most petals the channel ever sorts — a live matrix row and the
       most expensive one in it), the longest stem, the thinnest sheet (where
       the two modes measure different geometry and the mode-free union is the
       only thing that could be doing work), and every form control over a
       sphere. All are live matrix rows and none is in the subset. */
    rows: [
      { label: 'SPHERE STEM: the default sphere at the shipped stem (60 mm x 6 mm)',
        path: 'the channel CONSTRUCTED — ST7 (the omission is the stem\'s own in BOTH directions: every slot NOT built collides in at least one mode, every slot built clears the printable gap in both, the clearance IS MIN_FEATURE_MM and the counts add up), ST8 (it is a MASK: against a STEMLESS build of the same state every slot keeps its azimuth and every SURVIVING petal keeps its foot, and the hub is the size the ASKED-FOR count made it), ST9 (and the EXPORTED FILE carries nothing but the stem inside the channel), beside ST0-ST6 on the sphere\'s own arms of the plan — the stem leaving the RESERVED pole and the join INERT on a shell, which is ST5\'s inert arm reached for the first time' },
      { label: 'SPHERE STEM: THE BARE CORNER — a 12 mm stem on the smallest sphere takes every petal (told, not refused)',
        path: 'the mask at its limit — every slot omitted, so the bloom is a head on a stick: ST7 and ST8 must hold with ZERO petals built (the per-slot foot digests are all null and all declared), and every family indexed by descriptor must skip the declared set rather than report a missing record. TOLD, never refused — the stemJoinBlendRadius precedent, and the read-out says so' },
      { label: 'SPHERE STEM: THE TWO CLOSURES MEET — a 1 mm stem on the bare corner (solid throughout, told)',
        path: 'the CROSSOVER — ST10 in the direction a green run cannot show: the root band and the tip plug are each derived from a length, so across a short enough stem they MEET and no bore survives. The builder must emit NO inner ring at all (the narrowest emitted radius is the tube\'s own), the plan must say so, and the two must agree in BOTH directions — a builder keeping a sliver of bore where the law leaves none, or dropping one where it does, is this clause\'s and nothing else\'s. It is also the one row where a HOLLOW stem takes the solid arm, so the two arms are proved to be one geometry rather than two that resemble each other' },
      { label: 'SPHERE STEM: GATED — the widest stem at length 0 on a sphere (bit-identical to an untouched sphere)',
        path: 'the OTHER direction — the guard: no stem, so no channel, so nothing omitted. ST7 must read the channel ABSENT rather than as a passing "0 omitted", and the byte tool proves the row bit-identical to a sphere with the stem controls never touched — which is what makes every sphere row that shipped before this session unmoved' },
    ],
  },
  {
    n: 33,
    anchor: 'LEAVES: alternate x 3 nodes at the ruled 35 deg',
    /* LEAVES ON THE STEM. Both STL gates are blind to this whole family by
       construction, which is why LF0-LF7 exist at all: a leaf DECLARED and
       never built adds no boundary edge and detaches nothing; a petiole rooted
       ON THE AXIS of a hollow stem still reads ONE PIECE (measured in Phase A
       — a radial rod crosses the wall annulus on its way out), so the flood
       fill cannot tell it from the wall-rooted one that ships; and nothing in
       this project measures an AZIMUTH except J7, Z4b and Z8, none of which
       looks at a leaf. The subset takes the three arrangements, both ends of
       the attachment question (the widest bore and the solid floor), the steep
       angle Phase A measured detaching, and both directions of both guards. */
    rows: [
      { label: 'LEAVES: alternate x 3 nodes at the ruled 35 deg',
        path: 'the shipping arrangement at Eva\'s own ruled angle — LF0 (the registry hides the leaf sub-controls exactly where the geometry builds nothing, and a green run must not endorse one without the other), LF1 (the plan\'s azimuth list predicts the count and the builder\'s tally is the other owner), LF4 (the nodes are strictly apart, inset from both ends, and the top one clears the head iff the plan claims it does), LF5 (one leaf a node, which nothing else here can see), LF6 (the blade carries no foot — the root blend is stood down and the outline stops reading ring.width at all) and LF7 (the serration is the LEAF\'s own values, not the petal\'s). LF8 rides here too: the shell is CONSISTENTLY WOUND, read from the builder\'s own DIRECTED-edge census — both STL gates key theirs on a SORTED pair, so a face wound the wrong way still counts as a matched edge and still exports watertight, which is exactly how this builder shipped its first cut with 134 unmatched directed edges a leaf' },
      { label: 'LEAVES: whorled x 8 nodes (24 leaves — the most the controls reach)',
        path: 'the count ceiling — LF5 on a THREE-leaf whorl, where the per-node spacing and not just the per-node count is the claim: 120 degrees apart, asserted against the LAW restated in the gate rather than imported from the geometry it is checking. Also the worst leaf triangle count the controls reach, and the densest node packing, so LF4\'s pitch floor is exercised' },
      { label: 'LEAVES: on a HOLLOW stem at the widest bore (12 mm — the petiole crosses 1.5 mm of wall)',
        path: 'THE STATE THE FLOWER\'S GATES COULD NEVER REACH — LF2 (every petiole roots INSIDE the wall, read off the builder\'s own emitted ring centroid and never the plan beside it) and LF3 (and it crosses real solid on its way out). A petiole in the bore is in VOID, and both STL gates read the result as one piece regardless' },
      { label: 'LEAVES: the STEEP angle (85 deg — axis-rooted this DETACHES; wall-rooted it does not)',
        path: 'THE REACHABLE FAILURE, and the reason the petiole roots in the wall rather than on the axis: the escape length for an axis-rooted petiole is outerR/cos(theta), which runs away as the angle steepens, and Phase A measured TWO COMPONENTS at 75 and 85 degrees. LF3 is what holds it — the wall-rooted petiole only gets MORE embedded here, and the clause reads the crossing the builder actually made' },
      { label: 'LEAVES: the LONGEST leaf on the SHORTEST stem (the head cannot be cleared; the node count gives)',
        path: 'the corner where the geometry cannot do what was asked — a 120 mm leaf needs more inset than a 20 mm stem has, so no node position clears the head. LF4 in the direction a green run cannot show: TOLD, never refused (overlapping closed shells are the export contract, so a leaf through the head is legal geometry), the plan\'s `insetSatisfied` claim and the emitted node depth must agree, and the node COUNT is what gives at the pitch floor rather than every node collapsing onto one point — which is the defect LF4 caught before this geometry existed' },
      { label: 'LEAVES: serration OFF (an entire margin — the guard, inert)',
        path: 'the edge guard\'s inert arm — LF7 in the direction that silently fails: depth 0 must cut NO teeth rather than reporting a passing count, and the four shape rows are hidden AND inert' },
      { label: 'LEAVES: x a SPHERE with a stem (the channel and the leaves on one head)',
        path: 'THE COMPOSITION, and it is in this subset because leaving it out cost a CI cycle. ST9 — another family\'s clause, which enters only on a SPHERE with a stem — reads the EXPORTED FILE and asks whether anything stands in the free stem\'s printable gap that is not the stem\'s own. A leaf is the THIRD part ever to live in that region and its petiole is rooted THROUGH the wall by design, so it reads distance EXACTLY 0 and ST9 dropped this row: 198 vertices, every one a petiole\'s, 0 anything else. The subset could not see it because block 33\'s anchor is the `alternate` row on a CAP head, where ST9 returns before claiming anything — so a subset covering phyllotaxy, bore, angle, inset, serration and both guards was still blind to the one axis that reaches another family. A subset earns its keep by covering the axes a feature HAS, not the failures somebody predicted' },
      { label: 'LEAVES: tip shape ACUTE (0.60 — the floor; the 1.6 mm terminal stub is at its longest)',
        path: 'THE TIP SHAPE, at the end where the finding bites — LF9 in all three clauses: the exponent the plan declares is the LEAF\'s own control (a), the exponent read back off the half-widths the blade was actually built from is the same one (b — the measured side is the artefact, session 41\'s L7), and the terminal-clamp record the read-out prints is a biconditional against those rows (c): the outline meets the 2 x TIP_HALF_MM floor where the builder says it does, in BOTH modes, and the stub is LONGEST here because an acute superellipse hugs the floor — 21.3% of a 17 mm blade\'s length at 0.60 against 2.1% at the shipped 1.30. The subset takes this end and not the round one because a mutation pinning the exponent at the old constant reads 1.30 against 0.60 here and 1.30 against 3.00 there, and the acute end is where the clamp clause has the most rows to be wrong about' },
      { label: 'LEAVES: GATED — length 0 with every other leaf control at maximum',
        path: 'the OTHER direction — the feature guard (ruling 6): every leaf control at its maximum with the length at 0 builds NOTHING. LF1 must read the builder\'s "none" rather than a missing key, LF0\'s two statements must still be complements, and the byte tool proves the row bit-identical to a stem with the leaf controls never touched' },
    ],
  },
  {
    n: 34,
    anchor: 'HUB: CURVED at MAX amount x MAX length',
    /* THE HUB'S SHAPE — a NEW geometry mode, so --conn is REQUIRED here (the
       header's own rule): a styled swelling underside and, on #236's corner, a
       fill instead of a funnel, are exactly where the junction assertions may
       not model the failure yet and the flood fill is the only witness. The
       three rows: a styled swell at its deepest (the profile that would fold if
       a style curve were wrong), a #236 corner (a hub narrower than its stem —
       ONE PIECE where main exports two, the fix, which only the flood fill
       sees), and the GATED inertness row (length 0 with every hub control at
       maximum, bit-identical to the default). The byte-exact default is block
       30's 'shipped middle' and is not repeated. */
    rows: [
      { label: 'HUB: CURVED at MAX amount x MAX length',
        path: 'the deepest reachable styled swell — ST11 on the emitted underside (the profile is the style/amount/reach the plan declares, read off the hub builder\'s own samples), and the row where a wrong style curve or a non-monotone profile would fold the funnel or self-intersect it; --conn confirms the deep swell still leaves one connected piece' },
      { label: 'HUB: #236 — the narrow hub on a CAP head (rise 0.5), the shape #236 was filed on',
        path: 'THE #236 FIX, and only the flood fill sees it — a hub NARROWER than the stem exported as TWO pieces on main (the flat zero-volume join shell plus a head sitting in the bore). ST11 asserts no flat shell is emitted (the join is inert where the head is not wider than the stem) and the head embeds in the stem\'s solid root band; the connectedness gate is the witness that the result is one piece, which is why this row is in the subset with --conn' },
      { label: 'HUB: GATED — length 0 with style/amount/length at MAXIMUM (hidden and inert; bit-identical to the default)',
        path: 'the inertness direction — every hub control at its maximum with the stem length 0 builds no hub at all, so ST11 must read the join absent and the byte tool proves the row bit-identical to the shipped default; the hub controls are STEM_SUBS, so the blanket sweep never reaches them either' },
    ],
  },
  {
    n: 35,
    anchor: "SEPALS: the shipped whorl (5 of 8, interleaved, size 0.60, angle 0)",
    /* SEPALS, PART 1 — a NEW geometry mode (a second whorl on the rim, emitted
       by the petal builder against a second parameter set), so --conn is
       REQUIRED here: the sepal feet are buried in the same slab as the petal
       feet and the flood fill is the only witness that the whorl is one piece
       with the hub at the crowded corner. Six rows: the shipped whorl, the
       aligned weld, the clamped angle, a fan (the LIST arm), the crowded
       ANGLED corner (with a stem, --conn), the shipped attachment on the default stem and the inverted-extent fallback, and the two guards. */
    rows: [
      { label: "SEPALS: the shipped whorl (5 of 8, interleaved, size 0.60, angle 0)",
        path: "the whorl at its defaults — SP0 (the registry hides the sepal sub-controls exactly where the geometry builds nothing), SP1 (declared and emitted, the tally the builder's own), SP2 (the ceiling is the outer whorl the builder placed), SP3 (every sepal ring row sits on the outer whorl's own emitted rim, the foot the descriptor's and inside the print floors), SP4 (the interleaved default lands mid-way between petal 0 and petal 1, read off the petals' own emitted azimuths), SP5 (length and peak half-width are the petal's times the size), SP6 (every blade built from the SEPAL's own twins, no role reaching it) and SP8 (the built angle is min(asked, limit), the root frame carries it, and the harness's own contact test finds the built angle clear in both modes and the step above the limit clipping)" },
      { label: "SEPALS: height 0.75 (the shipped default) on the default stem — 60 x 6, GOBLET auto (the foot 0.33 mm below the head)",
        path: "THE ATTACHMENT on the hub's flare — SP3's HUB arm: the mode decided from the stem record's own stem end against the hub builder's head end, the height the law restated, the point between the bracketing rings of the EMITTED underside, every ring row t/2 above it with its bottom skin through it; SP8 with the limit re-drawn at the attachment (the harness's own contact test at the built angle and one step above)" },
      { label: "SEPALS: height on a DOME with a stem (rise 0.5 — the bowl holds the stem end above the join's rim, the extent INVERTED: at the rim, told)",
        path: "THE FALLBACK told — SP3's RIM arm on a stem whose join is active but whose head is a bowl: the extent's sign decides the mode as a biconditional, the record names the inversion, and the ring row is the outer whorl's own" },
      { label: "SEPALS: ALIGNED at size 1.00 (the sepal foot IS the petal foot — welded by construction)",
        path: "the weld the census reads: X1 — this row is declared self-intersecting (the two whorls share a foot lattice bit for bit and the fork's crotch is then counted within-shell) and must STILL read pairs; SP3 with the foot at the petal's own width; SP8 where the limit is the petal tilt less one step (coincident at 25)" },
      { label: "SEPALS: angle 90 asked — CLAMPED at the drawn limit (the last angle clear of the petals)",
        path: "THE CLAMP in the direction that matters — SP8: 90 asked, the limit drawn on the built rows, the built angle the limit, the flag a biconditional, and the harness's own rebuild finding the step above the limit clipping a petal" },
      { label: "SEPALS: on a FAN (5 sepals on 7 slots, interleaved)",
        path: "the LIST arm of the whorl primitive — SP2 (the ceiling is the fan's derived slot count), SP4 (the fan's lattice shifted by the phase, the count nearest the mirror line, and whether the set is mirror-symmetric is declared)" },
      { label: "SEPALS: THE CROWDED CORNER on ANGLED",
        path: "THE CROWDED CORNER — 40 petals x 40 sepals x size 1 x aligned x 90 asked on a stem, the forty feet 20 mm down an ANGLED cone's side (SP3's HUB arm on the cone: chord = tangent): --conn is the witness that the whorl, the flare and the hub are one piece there; X1/X2 the verdict — 0 pairs, the rim weld gone with the foot off the petal foot's lattice; SP8 the clamp at 40 congruent neighbourhoods" },
      { label: "SEPALS: GATED — count 0 with every sepal control at MAXIMUM (hidden and inert; bit-identical to the default)",
        path: "the GUARD — SP7: every sepal control at its maximum with the count at 0 builds nothing, SP1 reads the builder's none rather than a missing key, and the byte tool proves the row bit-identical to the default" },
      { label: "SEPALS: GATED — asked under SPHERE (8 asked on a closed head: none built, UNAVAILABLE told)",
        path: "the REFUSAL — SP9: a closed head has no underside ring, so sepals asked there build nothing and the read-out says UNAVAILABLE; SP0's two statements must still be complements" },
    ],
  },
  {
    n: 36, title: 'the tilt range past a right angle',
    anchor: 'TILT: 76 (one step past the old ceiling, still under the right angle)',
    /* THREE ROWS, AND THE AXES ARE THE SEAM CLEARANCE'S OWN. The clearance is
       (t/2) sin(turn) saturated past 90, and the first blade row is the first
       LATTICE station strictly beyond it — so the two levers are the SHEET and
       the BLADE LENGTH, and the angle decides whether the window is open. 90
       is where the law saturates; 120 x the shortest blade is the coarsest
       lattice station at the closing point; 120 x three whorls puts EVERY
       whorl past the right angle rather than only the innermost, which is the
       one shape the pre-ruling matrix could not produce from the base control.
       The 76 and 105 rows and the dome are in the full matrix and not here: a
       subset covers the AXES a feature has, and the sheet, the length and the
       depth are those axes. */
    rows: [
      { label: "TILT: 90 (the right angle — where the clearance law saturates)",
        path: "the saturation itself — A7 (the held block starts at the first lattice station strictly beyond seamClearanceMm, and the clearance is held at its right-angle value there rather than falling away with sin) and A8 (the emitted widest gap under the blend's bound)" },
      { label: "TILT: 120 x 20 x 8 mm (the shortest blade — the coarsest lattice station)",
        path: "the LATTICE arm of the seam floor — A7's seam step on a 20 mm blade, where one station is 0.36 mm rather than 0.62 and the clearance is the same t/2; C1 rebuilds the spine from other owners at a tilt the base control could not reach before" },
      { label: "TILT: 120 x 3 whorls x layerTilt 0 (every whorl past the right angle, not only the innermost)",
        path: "the DEPTH arm — J1/J8 (every foot still in the hub plane with the ring's own cross-section, and the spine's first chord leaving at tilt plus half the row's curl) on three whorls all past 90, the shape a tilt STEP on an inner whorl cannot make; X1/X2 the verdict on the folds the ruling accepts" },
    ],
  },
  {
    n: 37, title: 'the inflorescence — one raceme of identical florets',
    anchor: 'INFLO: the raceme (5 nodes x 1, 5-petal florets on 20 mm pedicels)',
    /* FOUR ROWS, AND THE AXES ARE THE ONES THE FEATURE HAS — not the failures
       anybody predicted. The leaf session's own lesson, paid for twice: its
       subset covered phyllotaxy, the bore, the angle, the inset, the serration
       and both guards and STILL missed the one axis that reaches another
       family's clause, because no row was there for that reason.

       So: the SHIPPING raceme (the anchor, and the only row where all seven
       ID clauses run on a state anyone would build); the GATED row, because
       hidden-and-not-inert is invisible to every STL property and the two-arm
       guard is what the whole byte claim rests on; the SPHERE, because that is
       this feature's cross-family axis — the main head's stem channel and the
       florets share one rachis, and ST7/ST8/ST9 reason about a region the
       pedicels now live in; and the WHORLED corner, because three pedicels at
       one node is the densest placement and the only one where the pitch floor
       and the area rule bind together.

       WHAT IS NOT HERE AND WHY: the clamps (size, count, inset) are one-line
       biconditionals that fire in Node on any row, and the full matrix carries
       them by name; ALL MAX is 1.1 M triangles and is the full gate's. */
    rows: [
      { label: "INFLO: the raceme (5 nodes x 1, 5-petal florets on 20 mm pedicels)",
        path: "the shipping raceme — ID0 (the registry's predicate against the geometry's guard), ID1 (the plan's azimuth list against the builder's tally and the triangle delta), ID2 (every pedicel rooted in the rachis WALL and crossing solid, with the area-rule diameter rebuilt from the stem's own radius), ID3 (every placement matrix orthonormal with determinant +1), ID4 (the six keys floretState overrides, the recursion capped at inflorescence NONE), ID5 (every placed head is the unit under its own matrix, residual exactly 0), ID6 (each head's axis IS its pedicel's direction and it stands at the rod's far end)" },
      { label: "INFLO: GATED — every control at MAXIMUM with the type NONE (hidden AND inert)",
        path: "the GUARD, in the arm the byte claim rests on — ID0 and ID1's inertness clauses in both directions (no record, no triangles, with every inflorescence control at its maximum), which is the only thing that can see a hidden control that still builds" },
      { label: "INFLO: x a SPHERE head (the stem channel and the florets on one rachis)",
        path: "the CROSS-FAMILY axis — ST7/ST8/ST9 (the stem channel's criterion, the mask against a stemless build, and the exported file's own clearance) on a rachis that now also carries pedicels, beside ID2's crossing and S1-S4 on the main head; the leaf session's ST9 defect is exactly this shape and was found by a row that was there for a different reason" },
      { label: "INFLO: WHORLED (three at 120 deg a node)",
        path: "the DENSEST placement — ID1's per-node count against the phyllotaxy law, ID2's pitch floor (two pedicel radii) and the area rule binding together at three pedicels a node, ID6 on three azimuths that share one node depth" },
      /* ONE NODE is its own arm of the node law (`LEAF_NODE_SOLO`, the
         flower's 0.55 L, deeper than the inset) and CI found ID9 (e) red on
         it with no smoke row to see it first: the count floor is an axis. */
      { label: "INFLO: ONE node (the count floor — a solitary lateral flower)",
        path: "the COUNT FLOOR — ID9 (e)'s one-node arm (the top node at the solo station, never shallower than the inset), ID1 at a count of 1, ID2's crossing on a single pedicel" },
    ],
  },
  {
    n: 38, title: 'organic variance, build 1 — the size field and the told flag',
    anchor: 'VARIANCE: size ±50% (1 cycle round the shipping whorl, phase 0)',
    /* FIVE ROWS, ON THE AXES THE FEATURE HAS. The shipping wave (the anchor,
       where VS0-VS5 all run on a state anyone would build, and VS5's told
       flag reads the default's own crossing at a new number); the GATED row,
       because hidden-and-not-inert is invisible to every STL property and the
       guard's other arm is what the whole byte claim rests on; the FAN,
       because evenness about the mirror plane is the one property that keeps
       Z4a/Z4b/Z8/J7 true and VS3 is its only witness; the SPHERE with a stem,
       because that is the cross-family axis — the stem channel probes each
       slot at the size the field gave it, and ST7/ST8/ST9 reason about petals
       whose sizes now differ; and the ALIASED corner, because ruling 4 is a
       flag that must fire rather than a cap, and VS4's biconditional needs a
       row on its other arm. */
    rows: [
      { label: "VARIANCE: size ±50% (1 cycle round the shipping whorl, phase 0)",
        path: "the shipping wave — VS0 (the registry's variancePresent against the geometry's guard, through the page), VS1 (the record is the controls' own and every factor is the law restated from the controls and the EMITTED azimuths), VS2 (the factor reached the blade: slot scale = ring scale x factor and length = nominal x scale, exact), VS4 (not aliased at 1 cycle on 8 slots), VS5 (the told flag: pitch exactly 1.000x on a RADIAL whorl, feet, the all-pairs blade approach)" },
      { label: "VARIANCE: GATED — frequency and phase at MAXIMUM with the amount 0 (hidden AND inert)",
        path: "the GUARD's other arm — VS0 and VS1's inertness clauses (no record, no factor on any slot, every slot's scale its descriptor's own) with the frequency and phase at their extremes, which is the only thing that can see a hidden control that still moves a petal" },
      { label: "VARIANCE: x FAN, phase 90 (even about the mirror line — the phase is INERT)",
        path: "the FAN — VS3 (every mirror pair carries the same factor to the bit, not vacuously) and VS1's phaseInert arm, beside Z4b/Z4c and J7 which an uneven field would break" },
      { label: "VARIANCE: x a SPHERE with a stem (the channel probes each slot at its OWN size)",
        path: "the CROSS-FAMILY axis — ST7/ST8/ST9 (the stem channel's criterion, the mask against a stemless build, the exported file's own clearance) on petals whose sizes the field moved, beside S1-S4 and VS1's golden-angle azimuth on the sphere's sequence" },
      { label: "VARIANCE: 20 cycles on 8 slots (ALIASED — scatter, told and not capped)",
        path: "the TOLD frequency — VS4's aliased arm (f above n/2 must be flagged, never capped) and VS1's law on a wave the lattice cannot draw" },
    ],
  },
  {
    n: 39, title: 'the Voronoi infill — the builder, the guard and the material mask',
    anchor: 'INFILL: the ruled defaults (20 cells, 5 Lloyd passes, law 0.30, stretch 1.65, a 1.00 mm wall, a 1.50 mm hole bar)',
    /* FIVE ROWS, ON THE AXES THE FEATURE HAS, AND THE LESSON THE LEAF SESSION
       PAID FOR IS WHY THE LAST TWO ARE HERE. A subset earns its keep by
       covering the axes a feature has — INCLUDING the axis that is another
       family's region. The anchor is the ruled default, where the whole
       construction runs on a state anyone would build; the GATED row is the
       guard's other arm, and hidden-and-not-inert is invisible to every STL
       property; the METRIC corner is the one state where a flat plan emits a
       quarter of the wall it asks for, and it is also where six of sixteen
       cells correctly LOSE their holes, so the achieved count is exercised
       rather than assumed; the SPHERE WITH A STEM is the cross-family axis
       (ST7/ST8/ST9 reason about a channel through a blade that now has holes
       in it, and J1-J9 about a foot whose panel is a sub-panel); and the
       FRINGE is the REFUSAL, which is a branch no number can show. */
    rows: [
      { label: "INFILL: the ruled defaults (20 cells, 5 Lloyd passes, law 0.30, stretch 1.65, a 1.00 mm wall, a 1.50 mm hole bar)",
        path: "the shipping state of the feature — the two-arm panel loop with `emitPanel` on the basal sub-panel and the cells above it, the material mask on every captured row (which `measureWall` and through it the whole combination gate read), and the watertight and connectedness invariants on a blade with fourteen holes in it" },
      { label: "INFILL: GATED — the density at its MAXIMUM with the guard OFF (hidden AND inert)",
        path: "the GUARD's other arm — the density at 40 with `petalInfill` NONE must build the SHIPPING DEFAULT bit for bit, which is the whole of ruling 1 and is the only thing that can see a hidden control that still cuts a hole" },
      { label: "INFILL: x cup 1.2 x spine curl 360 (S2's metric corner — the wall a flat plan quartered)",
        path: "the METRIC corner — the one reachable state where a flat plan emits 0.118 mm of material where it asked for 0.500, and where the achieved count is 10 of 16 rather than 16, so ruling 2 and ruling 3 are both exercised on one row" },
      { label: "INFILL: x a SPHERE head with a stem",
        path: "the CROSS-FAMILY axis — ST7/ST8/ST9 (the stem channel's criterion, the mask against a stemless build and the exported file's own clearance) on petals that are now perforated, beside S1-S4 and the junction families on a foot whose panel is a SUB-panel of the blade's" },
      /* S4 — the four remaining controls at their FAR ENDS on one row, because
         the matrix varies one control at a time and this composition is the
         state it cannot see; it is also the only subset row where the density
         law's tip-filling direction, the basal boundary's top and a twelve-pass
         relaxation in a 3x metric all reach the I family at once. */
      { label: "INFILL: x the four at their far ends (relaxation 12 x law 0 x stretch 3 x base 1)",
        path: "S4's FOUR CONTROLS composed — relaxation, density law, stretch and the basal boundary each at its far end (I8-I11 in verify-bloom-infill.mjs; here the export and flood-fill gates on a blade whose cells start at ROOT_BLEND_END and whose tip holds holes)" },
      /* THE ROUNDNESS at its ceiling on the curved plan, where the metric
         varies across a hole and the ruled bar holds the opening back — the
         one axis of the new control the export and flood-fill gates can reach
         (the default 0.60 rides on every other infilled row). */
      { label: "INFILL: x roundness 1 x cup 1.2 x curl 360 (the bar holds the opening back on a curved plan)",
        path: "THE ROUNDNESS CONTROL at its ceiling on a curved plan — every hole opened toward its inscribed circle in the surface's local frame, the bar clamping the opening where the metric varies across a hole (I12 in verify-bloom-infill.mjs; here the export and flood-fill gates on the opened rims)" },
      { label: "INFILL: REFUSED — a FRINGE owns the same region (several panels)",
        path: "the REFUSAL — a blade that is several panels takes today's path entirely, and the mesh must be bit-identical to the same state with the guard off; a branch is not something a triangle count can show" },
    ],
  },
  {
    n: 40, title: "the apex nib — the law's own tangent and a rounded point",
    anchor: 'APEX NIB: tip shape 0.60 x 60 mm (the shallowest flank on the longest blade \u2014 8.59 mm of law given up)',
    /* FIVE ROWS, ON THE AXES THE NIB HAS — and one of them is here because a
       subset earns its keep by covering the axes a feature has, which is the
       leaf session's lesson arriving in the block written the same week.
       The SHALLOWEST flank (where the truncation is largest and the law gives
       up 8.59 mm of blade); the STEEPEST (where the arc is three microns and
       the cap is twenty, i.e. where an off-by-one in the ladder's demand
       shows); BOTH inert arms, which is what makes AN0 a biconditional rather
       than a one-sided claim — the squared terminal on one row and, on the
       MIXED row, a single bloom carrying three nibbed rings and three whose
       blade never clears the print floor at all; and the LOBE cut, whose
       per-period relief guard reads at a sinus and would otherwise drive the
       nib's own half-width through zero.
       THE MIXED ROW IS THE ONE THAT COULD NOT BE LEFT OUT: every clause here
       that reads ring 0 and stops, and the read-out line that names ring 0's
       length as the bloom's, are correct on all four of the others. */
    rows: [
      { label: 'APEX NIB: tip shape 0.60 x 60 mm (the shallowest flank on the longest blade \u2014 8.59 mm of law given up)',
        path: "the SHALLOWEST flank — AN0 (the restated guard against the plan's flag and the emitted last row), AN1 (the flank carried on at the law's own one-sided tangent at its print-floor crossing, and the arc's radius and centre from that tangent), AN2 (the drawn length rebuilt end to end from the crossing plus the cap the constants imply — here 8.59 mm SHORT of the slider), AN3 (every emitted row above the crossing on the declared flank-then-arc curve, the last one ON the mini-face)" },
      { label: 'APEX NIB: tip shape 3.00 x 20 mm (the steepest flank on the shortest \u2014 a 0.003 mm arc)',
        path: "the STEEPEST flank — AN1 at a slope of 35 mm/mm against 0.17 at the other end, a factor of 204, where the cap is 0.020 mm and the arc 0.003; AN2's OVERSHOOT arm (the cap carries the blade PAST the slider, accepted and reported); AN3 where the ladder's resolution demand for the arc is the only thing putting rows on a feature three microns long" },
      { label: 'APEX NIB: INERT \u2014 a squared terminal holds the outline above the print floor',
        path: "the INERT arm — AN0's biconditional in its other direction, where the nib declares which guard refused and the blade must still end on petalTipEnd's own face, with the drawn length exactly the asked one (an inert cap may not move the length)" },
      { label: 'APEX NIB: MIXED \u2014 6 layers x layerSize min (three rings nibbed, three whose blade never clears the floor)',
        path: "the MIXED bloom — AN0's second inert reason (an inner whorl whose peak is at the print floor) on three rings of one bloom while three others carry a nib, which is the only row where a clause reading ring 0 and stopping says something false; AN1/AN2 per ring on three different crossings" },
      { label: 'APEX NIB: x LOBES 1.00 x 10 (the per-period relief against the nib\u2019s own floor)',
        path: "the LOBE cut composed with the nib — the per-period relief guard reads at a SINUS, so a period whose sinus sits on the law can carry a relief the nib has no room for; AN3 on an outline that is the cut one, beside L0-L8" },
    ],
  },
  {
    n: 41, title: "the stem's nodes — the flower's swelling and kink, one control",
    anchor: "STEM NODES: the flower's 0.48 on 100 x 6 mm, three alternate leaves",
    /* FOUR ROWS, ON THE AXES THE NODES HAVE: the flower's own setting on a
       HOLLOW stem (every restated clause at once — the void's own ladder, the
       tip plug's disc at a swollen radius, the petiole on a displaced axis);
       Eva's approved SOLID 3 mm stem, where the no-void arm is the one the
       noded rings go through; the SPHERE, which is the only place ST9 and
       ST7's meridian margin speak and the channel measures a kinked stem; and
       a GATED row, because a two-statement clause needs the state where the
       statement bites — prominence at its maximum with nothing to node. */
    rows: [
      { label: "STEM NODES: the flower's 0.48 on 100 x 6 mm, three alternate leaves",
        path: "the flower's own setting on a HOLLOW stem — ST12 (the two statements, the emitted rings' centres and radii against the flower's law restated over the leaves' nodes, and the PHASING: each bend peaks just below its node inside the swelling), ST1 (the count from the plan's own outer and void ladders), ST2 (the tip at the law's offset), ST3 (the widest ring the law's swelling), ST10 (the tip plug's disc at the swollen tip radius), LF2 (the petiole on the displaced axis)" },
      { label: "STEM NODES: 0.48 on Eva's approved 3 mm stem (SOLID — no bore)",
        path: "the SOLID arm — ST12 and ST1 through the no-void arm, ST3's narrowest vertex on the outer ring, ST10's bottom disc at the swollen tip radius" },
      { label: 'STEM NODES: x a SPHERE with a stem (the channel against a noded stem)',
        path: "the SPHERE — ST7 (the omission criterion and the meridian margin at the root's own radius), ST8, ST9 (the channel located in the FILE by the restated law and measured with the harness's own distance), ST12 on a stem leaving a pole" },
      { label: 'STEM NODES: GATED — prominence 1 under a raceme (hidden AND inert)',
        path: "the GUARD — ST12's two statements where they can disagree (prominence at its maximum under a raceme, where the head's nodes are inert) and prominence-0's identity at the plan (no law, no noded rings, `stemStations`' own two stations). It replaces the no-leaves GATED row, which ruling 6 (stem session 2) turned into a mover" },
    ],
  },
  {
    n: 42, title: "the NU coupling's witness — leaves under petals whose rows ramp",
    anchor: 'LEAVES: x petalTipShape 3.00 (the petals ramp their rows; the leaf keeps its own)',
    /* ONE ROW, BECAUSE THE BLOCK IS ONE ROW: the only state where a leaf
       reading the petals' ramped NU and a leaf reading its own 56 disagree.
       At any tip shape under 2.30 the two are the same number and LF10 cannot
       fire, which is why no earlier leaf row could have seen #303's finding. */
    rows: [
      { label: 'LEAVES: x petalTipShape 3.00 (the petals ramp their rows; the leaf keeps its own)',
        path: 'THE NU COUPLING (#303\'s finding, fixed) — LF10: the petals ramp to 112 rows above petalTipShape 2.70 and the leaf, which has no apex ramp, must stay on its own 56, read off the builder\'s per-row record against BLADE_ROWS (the static row count, a different owner). Before the fix the leaf read the LAST PETAL\'s NU and doubled to 5,012 triangles a leaf while exporting watertight and one piece, and no matrix row reached it because the matrix varies one control at a time — so this subset carries the one row that does' },
    ],
  },
  {
    n: 43, title: 'organic variance, build 2 — the form field',
    anchor: 'FORM VARIANCE: amount 1 (1 cycle round the shipping whorl, phase 0)',
    rows: [
      { label: 'FORM VARIANCE: amount 1 (1 cycle round the shipping whorl, phase 0)',
        path: "the LAW — FV0 (the registry's varianceFormPresent against the geometry's guard through the page), FV1 (every petal's term restated from the controls and its emitted azimuth), FV2 (the clamped role composition plus the term scaled by the headroom on its own side is what the blade was built with) and FV4 (one aliasing judgement for the shared wave)" },
      { label: 'FORM VARIANCE: x FAN, phase 90 (even about the mirror line — the phase is INERT)',
        path: 'the FAN — FV3 (mirror petals carry identical terms, not vacuously), beside Z4b/Z4c and J7' },
      { label: 'FORM VARIANCE: x 3 whorls with innerCurl 360 on curl 180 (the ONE clamp — past 360 before the slot term)',
        path: "FV2's HEADROOM arm — the inner whorls' group curl is past 360 before the slot term, so the room is read from the CLAMPED composition; reading it from the unclamped 540 flips the field's sign on every inner whorl" },
      { label: 'FORM VARIANCE: 20 cycles on 8 slots (ALIASED — scatter, told and not capped)',
        path: "the TOLD frequency on the form field — FV4's aliased arm and FV1's law on a wave the lattice cannot draw" },
    ],
  },  {
    n: 44, title: 'the composed base state — the census as a guard the combination gate cannot be',
    anchor: 'COMPOSED: 3 whorls x curl 180 x innerCurl 360 (each inner petal coils its tip into its own foot — the census is the guard, `self` cannot see it)',
    rows: [
      { label: 'COMPOSED: 3 whorls x curl 180 x innerCurl 360 (each inner petal coils its tip into its own foot — the census is the guard, `self` cannot see it)',
        path: "X1 on a state declared from birth at 1,968 pairs / 0.4218 mm — each inner-whorl petal's tip coiling back into its own foot, which the combination gate's `self` excludes by definition (measureWall drops the foot rows); this row is what the gate's layers-x-curl-x-innercurl cell points at" },
    ],
  },
  {
    n: 45, title: 'the TUBE — corolla fusion',
    anchor: 'TUBE: 8 petals x k 0 (one closed ring)',
    rows: [
      { label: 'TUBE: 8 petals x k 0 (one closed ring)',
        path: "the ruled defaults fused — TU0 (the registry's tubeEligible against the geometry's own answer through the page) and TU1 (the built k against the snap restated from the ruling); the ring through every midrib at h 0.25 with BLEND 1's flare, trimmed under every petal, exported watertight and one piece" },
      { label: 'TUBE: 8 petals x k 2 (2 panels)',
        path: "a SLIT ring — TU1 at k 2; the edge petals keep their own outer half from the foot to the tip, and the two panels are two closed shells the census must not read as one" },
      { label: 'TUBE: SNAP: asked 3 at 8 petals (builds 2, the tie goes down)',
        path: "the SNAP through the real UI — the slider reads back the ASKED 3 and TU1 holds the BUILT 2 to the ruling's tie-goes-down" },
      { label: 'TUBE: THIN SHEET 0.6 x 7 petals x k 0 x fusion height 0.4 (the modes split at the bead bar)',
        path: "MUST FIX 2's row — the live sinus 0.144 mm and the export one 0.908 against the 0.50 mm bead bar; the notch decision reads both modes, so tris(live) === tris(export) here, which both STL gates assert" },
      { label: 'TUBE: k 0 x tilt 105 (the ring folds as the petal does past a right angle)',
        path: "a DECLARED fold — X1 holds it to 318 pairs / 0.3800 mm in both directions" },
      { label: 'TUBE: 12 petals x k 6 (6 panels)',
        path: "FC2 on a CAPPED foot: at 12 petals the cap binds (6.40 asked, 5.67 mm of arc) and every petal is a slit's edge petal whose open half is blended onto the ring curve, so a cap ON the arc puts two neighbours' margins and the tube's column on one double — the clause reads the exported file's own float32s and requires no two parts to carry one position (the foot-clearance ruling, Oct 22); X2 holds the row at 0 pairs" },
      { label: 'TUBE: GATED — the buckle (unavailable, inert)',
        path: "TU0's other arm — a ring asked where the ruling makes it unavailable: the geometry reports unavailable, no ring is built" },
    ],
  },
  {
    n: 46, title: 'the inflorescence node laws — gradient, corymb, sessile, shared node',
    anchor: 'NODE LAWS: gradient 0 (the floor — the lowest node SESSILE, a spike grading into a raceme)',
    /* ONE ROW PER LAW AND ONE PER JOIN, on the axes the session has: the
       gradient with a sessile end (ID7's ramp and ID8's embed on one rachis,
       several distinct floret builds), the CORYMB solved exactly (ID7's plane,
       measured off the emitted heads), the SPIKE (ID8 at every node), the
       SHARED NODE (SN0-SN3 with every pedicel subtended), the shared node's
       no-room tail (SN3's told omission), and the GATED leaf controls (SN0's
       other arm: the leaf's own Nodes and Arrangement inert under a raceme). */
    rows: [
      { label: 'NODE LAWS: CORYMB on a 40 mm rachis (level tops, solved exactly)',
        path: "the CORYMB — ID7 (the lengths restated from the controls as the plane solve, every placement built from the unit at its own node's length, the memo by DISTINCT length, and the heads' heights read off the emitted placement matrices to one level), with ID1/ID5/ID6 per unit" },
      /* THE GRADIENT AT ITS CEILING was the one state where a LOWER node
         outreached the top one the inset was derived from; CI found ID9 (d)
         red on it with no smoke row to see it first. Since ruling 2 the
         GRADIENT CAP (ID7) stops the ramp there: asked 3, built 2.24. */
      { label: 'NODE LAWS: gradient 3 x 12 nodes x 60 mm (was CLAMPED at the old 120 mm ceiling — the lowest pedicel 180 mm now, under the 250 cap)',
        path: "the GRADIENT CAP (ID7's gradientMax, restated from the inset's own law and the node depths — asked 3.00, CLAMPED at 2.24 where the lowest floret would overtop the head), ID9 (d)'s every-node arm reading at or under the bar on the capped ramp with INFLO_OVERTOP_XFAIL empty; ID10's floor over three nodes" },
      { label: 'NODE LAWS: gradient 0 (the floor — the lowest node SESSILE, a spike grading into a raceme)',
        path: "the GRADIENT to its floor — ID7's ramp in millimetres down the rachis, four distinct floret builds, and ID8 on the one sessile node (the floret's own emitted vertices reaching the stem's bore) beside three stalked ones; ID4 per unit (a stem exactly where the length is non-zero); ID10 (d) on a DECLARED row — INFLO_APPROACH_XFAIL's one entry, where node 3 passes THROUGH node 2 (a crossing, 0.0000 mm, held both ways by the file's own float32 through the combination gate's engine)" },
      { label: 'NODE LAWS: SESSILE — a true spike (the floret hub rooted one wall deep)',
        path: "the SPIKE — ID8 at every node (rooted radially to the bore at 35 deg, not along the pedicel), ID2's crossing NULL exactly where every node is sessile, ID4 on a stemless unit" },
      { label: 'NODE LAWS: SHARED NODE — a raceme with a leaf under every pedicel',
        path: "the SHARED NODE — SN0 (the registry's leafNodesOwn against the geometry's flag and the controls), SN1 (one leaf per pedicel, at the pedicel's emitted azimuth), SN2 (each leaf seated the law's offset below its pedicel, read off both emitted rods), SN3 (the kept prefix restated from the stem's length), SN4 (every flowering node CAPS its 40 mm leaf at 17.46 mm, the emitted blade reach read against the plan's petiole plus built length); LF1/LF4/LF5 in their shared arms" },
      { label: 'NODE LAWS: SHARED NODE x a 30 mm rachis (the lowest pedicel carries none, told)',
        path: "SN3's OMISSION — the lowest pedicel's leaf would run off the stem's end, so it is not built and the record tells it; SN1 pairs the kept leaves with the first four pedicels" },
      { label: "NODE LAWS: GATED — the leaf's own 8 nodes and whorled under a raceme (hidden AND inert)",
        path: "SN0's other arm — the leaf's own Nodes and Arrangement at values that would build 24 leaves on their own law, hidden AND inert under the raceme: LF5 reads the FLORET's arrangement and SN1 holds one leaf per pedicel" },
    ],
  },
  {
    n: 47, title: 'bare-stem nodes — nodes decoupled from leaves (ruling 6)',
    anchor: "BARE NODES: the flower's 0.48 on 100 x 6 mm, three nodes, golden angle",
    /* THREE ROWS: the golden-angle law on a hollow bare stem, the MERGED
       report (told, never clamped), and the raceme, where the head's nodes are
       inert and ID4 carries the PEDICEL PIN on every floret's own stem. */
    rows: [
      { label: "BARE NODES: the flower's 0.48 on 100 x 6 mm, three nodes, golden angle",
        path: "ST12 on a BARE stem — the two statements with no leaf term, the emitted rings against the node law restated from the CONTROLS (the flower's 0.16/0.86 layout, the golden angle written as pi(3 - sqrt 5)), the phasing, and (e)'s other half: a bare stem reports no leaf record; ST1/ST2/ST3/ST10 restated onto it" },
      { label: 'BARE NODES: eight nodes on 24 mm (SWELLINGS MERGED — told, not clamped)',
        path: "ST12(f) — the plan's `mergedPairs` against the restated gaps and sqrt(2) spindles, both directions; the count is NOT clamped, so ST12(c) still holds all eight nodes to the law" },
      { label: 'BARE NODES: GATED — prominence 1 under a raceme (head inert; every PEDICEL pinned straight)',
        path: "ID4's PEDICEL PIN — the floret state carries stemNodeSwelling 0 and stemNodeKink 0 and the floret's own stem is a two-station tube with no node law, though the head asks for both at 1 and a pedicel is a bare stem the ungated law would otherwise node" },
    ],
  },
  {
    n: 48, title: "the florist's cut (ruling 7)",
    anchor: 'STEM CUT: the widest stem (12 mm) — the longest cut and the longest plug',
    /* FIVE ROWS: the widest cut (every SC clause on a hollow stem, ST10's
       re-derived end face and plug), the control OFF (SC0's other arm, and
       ST10's flat arm as it was), a cut on a noded stem (SC3's noded arm —
       the ring follows the kinked axis), a SPHERE (ST9 locating a cut tip),
       and the raceme (ID4's pin on every pedicel). */
    rows: [
      { label: 'STEM CUT: the widest stem (12 mm) — the longest cut and the longest plug',
        path: "SC0 the two statements, SC1 made-iff-longer-than-the-cut, SC2 the land on the lattice from the print floor and the nozzle, SC3 the emitted cut ring vertex by vertex against the 45-degree plane restated from the controls; ST1 on the cut band (2N - 2) and the cut face (N - 2), ST10 on the face's projected area and the plug 2 rTip + W(sqrt 2 - 1) square to the face" },
      { label: 'STEM CUT: FLAT — the control OFF (the end as before the cut; a holder)',
        path: "SC0's other arm (the control OFF, the geometry absent) and SC1's 'no cut face on a FLAT end'; ST1 and ST10 on their flat arms, as before the cut" },
      { label: 'STEM CUT: x bare NODES at prominence 1 on 12 mm (the tip leans; the face follows the kinked axis)',
        path: "SC3's noded arm — every cut vertex on ITS OWN depth's ring, the node law restated at that depth; ST12 on the horizontal rings alone (the cut ring is not one); ST3's extremes over the horizontal rings" },
      { label: 'STEM CUT: x a SPHERE with an 8 mm stem (ST9 locates the cut tip)',
        path: "ST9 re-derived: the tip is the LOWEST vertex at the stem's radius (the land) and the root the populated level the control's length above it; ST7/ST8 on a cut stem's channel" },
      { label: 'STEM CUT: x the RACEME on an 8 mm rachis (the rachis is cut; every PEDICEL pinned flat)',
        path: "ID4's PEDICEL PIN for ruling 7 — the floret state carries stemCut FLAT and the floret's own stem reports no cut and emits no cut face, though the rachis is cut; SC0-SC3 on the rachis" },
    ],
  },
  {
    n: 49, title: 'the reach inset and the 250 mm pedicel (inflorescence build 3, Phase A — #355)',
    anchor: 'REACH INSET: 250 mm pedicels at the shipped 35 deg (the new ceiling — the reach passes the rachis, ONE node, told)',
    /* FOUR ROWS: the ceiling at the shipped angle (ID7's clamp law at 250 and
       the reach EXCEEDING the rachis — one node, the unsatisfied arm), the
       corymb on the full rachis the old cap clamped, the sheet whose two modes'
       reach DIFFER (the union is the only thing a one-mode mutant can be seen
       on), and the descending pedicel where the stem's own inset stands. */
    rows: [
      { label: 'REACH INSET: 250 mm pedicels at the shipped 35 deg (the new ceiling — the reach passes the rachis, ONE node, told)',
        path: "ID9 — the top node's inset restated from the floret BUILDER's own emitted vertices placed at depth 0 in BOTH modes plus the printable gap, (a)-(c); the reach (164.9 mm) exceeds the 0.86 L node span so `insetSatisfied` is FALSE and (e)'s biconditional holds on that arm; ID7's ceiling at the pedicel's own 250 (unclamped); ID1's node count at 1" },
      { label: 'REACH INSET: LEVEL TOPS x 8 nodes on the full 120 mm rachis (solved exactly — the lowest pedicel 134.3 mm, past the old 120 cap)',
        path: 'ID7 — the corymb solve on the full rachis, UNCLAMPED at the 250 mm ceiling where the 120 cap clamped the lowest three, every head at one height measured off the placements; ID9 (d) the emitted top-node florets under the head floor less the gap' },
      { label: 'REACH INSET: a 0.60 mm sheet (the LIVE and EXPORT reach differ — the union decides the node)',
        path: "ID9 (a) both modes' reach restated and (f) the other mode's node depths bit-identical — the only row where a reach read from ONE mode would place the node differently, so `the-reach-reads-one-mode` is visible here and nowhere else" },
      { label: "REACH INSET: descending (-60 deg): the reach is under the node and the stem's own inset stands (not clamped)",
        path: "ID9 (e) `insetClamped` FALSE — the floret's reach is below its node so the stem's own 0.16 L inset stands, the biconditional's other arm; ID1, ID2 at a descending pedicel" },
    ],
  },
  {
    n: 50, title: 'per-node variation and the derived floret phase (inflorescence build 3, Phase B)',
    anchor: 'NODE VARIANCE: amount 1 on the raceme (each floret\'s curl, cup and twist by its node\'s azimuth — two distinct builds)',
    /* FOUR ROWS: the amount alone (NV1's restated term through the resolver,
       NV4's one build per distinct state — two on an alternate raceme), the
       amount under the head's field (NV2's derived phase read off the
       placement matrix, the head's slot field composing on the moved base),
       the LEVEL pedicel (NV2's inert arm — the one state the derivation has
       no answer for, the head's phase standing), and the GATED row (NV0's
       other arm, NV4's single build). */
    rows: [
      { label: 'NODE VARIANCE: amount 1 on the raceme (each floret\'s curl, cup and twist by its node\'s azimuth — two distinct builds)',
        path: "NV0 (the control against the geometry's nodeVarianceIsAbsent through the page), NV1 (each unit's curl, cup and twist ARE the head's composed with the node term restated from the controls — amount x cos(azimuth + the restated 120-degree offsets) x the registry's half-span — through the shipped resolver), NV3 (the pins hold on every unit), NV4 (two units for two distinct states on an alternate raceme, every placement appending its own azimuth's); ID10's floor taken over the per-azimuth units" },
      { label: 'NODE VARIANCE: 0.5 x the form field 0.5 (the head\'s slot field composing on the moved base; the phase DERIVED outward)',
        path: "NV2 (each unit's variancePhase re-derived from its own PLACEMENT MATRIX — the outward direction's floret azimuth, the crest put there at the shared frequency — never the head's phase), NV1 under a field (the slot term composing on the moved base inside the floret), FV1/FV2 inside every floret; ID9 (a)'s reach over per-azimuth units" },
      { label: 'NODE VARIANCE: the derived phase at a LEVEL pedicel (INERT, told — the outward direction is the floret\'s own axis)',
        path: "NV2's INERT arm — at a level pedicel the outward direction projects to nothing in the petal plane, so the floret keeps the head's own phase (asserted equal, not merely finite); NV4's single build (no node term, one state)" },
      { label: 'NODE VARIANCE: GATED — amount 1 with NO inflorescence (hidden AND inert)',
        path: "NV0's other arm — the control at 1 with no raceme is hidden by the registry and forms no term in the geometry; ID0 on the absent plan" },
    ],
  },
  {
    n: 51, title: 'organic variance, build 3 — the spacing field',
    anchor: 'SPACING VARIANCE: 0.9, the ruled maximum (1 cycle, phase 0)',
    /* FIVE ROWS: the law at the ruled maximum (SV0-SV2, SV3's order and floor
       on a ring, SV4), the aliased wave (SV3's floor where neighbouring slots
       read opposite crests, SV4's aliased arm), the FAN (SV3's held span and
       odd map, J7 beside it), the layered whorls (SV2's restated layer phase
       and SV3 per whorl), and the GATED row (SV1's amount-0 arm — every
       azimuth the nominal law to the bit). */
    rows: [
      { label: 'SPACING VARIANCE: 0.9, the ruled maximum (1 cycle, phase 0)',
        path: "the LAW — SV0 (the registry's varianceSpacingPresent against the geometry's guard through the page), SV1 (the record and its floor 1 - A), SV2 (every emitted azimuth is the pitch law's integral restated from the controls over the nominal law restated from footRing's fields), SV3 (the cyclic order kept and every neighbour pair at least the floor apart) and SV4 (one aliasing judgement)" },
      { label: 'SPACING VARIANCE: 0.9 at 5 cycles on 8 slots (ALIASED past n/2 — scatter, told and not capped)',
        path: "SV3 where neighbouring slots read near-opposite crests — the pitch law still keeps every pair at least 1 - A apart, which a DIRECT offset (the circular reading) does not — and SV4's aliased arm" },
      { label: 'SPACING VARIANCE: 0.9 x FAN, phase 90 (even about the mirror line, the phase INERT, the span held by renormalising)',
        path: "the FAN — SV2's renormalised map, SV3's held span (the outermost slots exactly at the nominal outermost azimuths) and odd map (mirror slots exact negations), the floor (1 - A) / (1 + A); J7 and Z4b beside it" },
      { label: 'SPACING VARIANCE: 0.9 x 3 whorls at layer offset 0.5 (one circle map — the whorls keep their mutual order)',
        path: "SV2 with the layer phase restated per whorl and SV3 per whorl; VS5's told pitch under the floor" },
      { label: 'SPACING VARIANCE: GATED — frequency and phase at MAXIMUM with every amount 0 (hidden AND inert)',
        path: "SV1's AMOUNT-0 arm — every emitted azimuth is the nominal law restated here, to the bit, and SV0's other direction" },
    ],
  },
  {
    n: 52, title: 'the node split and the alternate divergence (Oct 6)',
    anchor: 'NODE SPLIT: the CARNATION — opposite (decussate) x 4 nodes, swelling 1, no kink',
    /* FOUR ROWS: the two references by name — the rose (kink only on a
       137.5 spiral: ST12's bend arm alone and (c) holding the absent swelling
       at R, LF5's node-to-node turn at the divergence) and the carnation
       (swelling only, decussate: ST12's swelling arm alone and (c) holding the
       absent kink on the axis) — the halves APART with both non-zero (the
       coupled-halves mutant's only row), and the divergence's GATED arm under
       OPPOSITE (LF5's turn restated without it: the hidden slider inert). */
    rows: [
      { label: 'NODE SPLIT: the ROSE — alternate at 137.5 x 4 nodes, kink 0.8 (~6 deg), no swelling',
        path: "ST12 with the KINK alone — the two statements reading either half, (c) every ring's centre on the kinked law and every radius exactly R, (d)'s bend arm and NOT its swelling arm; LF5's node-to-node turn at (137.5 / 180) pi restated from the divergence control, so the kink follows each leaf round the spiral" },
      { label: 'NODE SPLIT: the CARNATION — opposite (decussate) x 4 nodes, swelling 1, no kink',
        path: "ST12 with the SWELLING alone — (c) every ring's centre on the world axis and every radius on the swelling, (d)'s swelling arm and NOT its bend arm, (f)'s merge report; LF5's opposite turn (pi/2 a node) with the divergence inert" },
      { label: 'NODE SPLIT: the halves APART — swelling 0.3 x kink 1 on three alternate leaves',
        path: "ST12 where a law reading the wrong half differs from the right one — (c) holds the swelling at 0.3 and the kink at 1 on every ring, which the halves-equal rows of blocks 41/47/48 cannot tell apart" },
      { label: 'DIVERGENCE: GATED — 90 under OPPOSITE (hidden AND inert)',
        path: "LF5's node-to-node turn restated WITHOUT the divergence on an opposite stem — the hidden slider at its floor must move no leaf; the registry's leafDivergenceLive is false here" },
    ],
  },
  {
    n: 53, title: 'the leaf through emitPanel, the arch, the cup and the tooth floor (Oct 6, S2)',
    anchor: "LEAF POSE: the CARNATION — opposite (decussate) x 4 nodes, swelling 1, arched linear leaves (60 x 6 mm, arch 90, cup 0.6, entire)",
    /* FIVE ROWS: the carnation (the headline — LF11's arc on four decussate
       nodes over a swollen stem, LF12's cup at 0.6, an entire margin), the arch
       at its maximum with the cup at its maximum (LF11's arc at 180 and LF12's
       FOLD CLAMP binding at the stub), the upward arch that rises above its
       chord (LF4's restated rise — the inset must read the arc), the relief
       floor GIVING the count on a narrow blade (LF13's cause biconditional and
       its sinus reliefs), and the shallow depth FLOORED up (LF13's built
       relief). Every block-33 leaf row already in this subset is an emitter
       mover, so the bead and E1-E6 on a leaf rim are exercised there. */
    rows: [
      { label: "LEAF POSE: the CARNATION — opposite (decussate) x 4 nodes, swelling 1, arched linear leaves (60 x 6 mm, arch 90, cup 0.6, entire)",
        path: "LF11's arc restated from the controls on eight leaves over four decussate nodes of a SWOLLEN stem (the petiole's emitted ring is the arc's start, the node offset included); LF12's lift at cup 0.6; LF7/LF13 inert at depth 0; ST12's swelling arm beside the leaves" },
      { label: 'LEAF POSE: arch 180 x cup 1.2 (both at their maxima)',
        path: "LF11 at the arch's maximum (the centreline and the frame normal both on the arc) and LF12 with the FOLD CLAMP restated — the cup is clamped where the blade narrows to its stub, read back off the margin lift" },
      { label: 'LEAF POSE: arch -30 (an upward arch rising HIGHER than its chord — LF4 restates the arc)',
        path: "LF4's inset biconditional against the ARC's rise (higher than L sin theta by the mean value theorem) restated from the controls, and LF11 with the arch negative" },
      { label: 'TOOTH FLOOR: a 5 mm blade (the count GIVES — 9 asked, fewer fit a 1 mm notch)',
        path: "LF13 — the count clamped by the relief floor as a biconditional, every margin notch at or over 1.00 mm in the record AND in the outline, the relief FLOORED up; LF7's re-derived arm (teeth are still cut)" },
      { label: 'TOOTH FLOOR: a 3.5 mm blade (NO ROOM — the widest point has 0.95 mm over the print floor)',
        path: "LF13's necessary condition (no tooth where even the widest point has under 1.00 mm of headroom over the print floor) and LF7's re-derived NO ROOM arm" },
    ],
  },
  {
    n: 54, title: 'the compound leaf (Oct 7, S3)',
    anchor: 'COMPOUND: the ROSE — alternate 137.5 x 4 nodes, kink 0.8, swelling 0.25, the retuned defaults (2 pairs + a larger terminal, ovate, entire), arch 10, cup 0.28',
    /* NINE ROWS: the rose (every compound clause on the reference, over a
       kinked 137.5 spiral), one pair (the layout's degenerate arm — first and
       last coincide), both stalks at 0 (a leaflet base ON the rachis — LF16's
       base-on-its-stalk with no stalk), the thick sheet (LF17: the rod law
       restated with the wire floor binding at a radius no typed constant
       carries), the rachis arched over (LF11's compound branch — the arc is
       the RACHIS's, the leaflets ride it unarched), a SPHERE head (ST9 must
       excuse the rachis and the stalks by name or a leaf near the pole reads
       as a petal in the channel), the raceme's shared node (LF14's pin arm —
       the plan says SIMPLE and says it was pinned), and the two GATED arms
       (LF14's inertness — SIMPLE with every hidden leaflet control at an
       extreme, and no leaf at all). */
    rows: [
      { label: 'COMPOUND: the ROSE — alternate 137.5 x 4 nodes, kink 0.8, swelling 0.25, the retuned defaults (2 pairs + a larger terminal, ovate, entire), arch 10, cup 0.28',
        path: "LF14's two statements and the plan against the layout restated from the controls; LF15's count and build order (four laterals then the terminal, every leaflet a blade); LF16's bases on their stalks and the stalks on the rachis at the restated stations; LF17's rods (the thicker petiole, its cone, the wire rachis and stalks); LF18's petiole law under its cap with the rooted end inside a kinked stem; LF11's compound arc from the rachis base found by position; LF7/LF9/LF10/LF12/LF13 on every leaflet on their OWN depth and tip; ST12's kink beside the leaves" },
      { label: 'COMPOUND: leafletPairs min (1 — first and last coincide, basal ratio inert)',
        path: "LF14's layout at one pair (the station is `first` and the ratio 1 — the hidden basal and last controls inert) and LF15's three-blade count" },
      { label: 'COMPOUND: leafletStalk min (0 — sessile laterals on the rachis)',
        path: "LF16 with a ZERO stalk — the leaflet's free base row stands on the rachis itself, the embed carried by the blade" },
      { label: 'COMPOUND: sheetThickness 2.4 (the wire 2.40 mm; the petiole asks 5.37 and the stem holds 4.48 — CLAMPED)',
        path: "LF17 at a sheet where the wire is 1.2 mm in radius — the rachis and stalks restated as the wire, never a typed 0.6; LF18's clamp binding on the shipped stem" },
      { label: 'COMPOUND: arch 180 (the RACHIS arcs over; the leaflets ride it, unarched)',
        path: "LF11's compound branch — the rachis rings on the arc restated from the controls, the tip ring present, the turn built against the turn asked; LF16's stalk roots on the arced rachis" },
      { label: 'COMPOUND: a SPHERE head with a stem (ST9 excuses the thicker petiole, the rachis and stalks by name)',
        path: "ST9 with a compound leaf beside a sphere's free stem — every rod the leaf emitted is excused on its own axis at its own radius (LF18's third arm), a blade vertex is not" },
      { label: "COMPOUND: under a raceme's shared node (PINNED to SIMPLE, and told)",
        path: "LF14's pin arm — the registry hides the type at a shared node, the plan reports SIMPLE and typePinned; SN0-SN4 on a simple blade" },
      { label: 'COMPOUND: GATED — SIMPLE with every leaflet control at an extreme (hidden AND inert)',
        path: "LF14's SIMPLE arm — the plan carries no compound layout, no leaf emits a compound tree and every blade is a simple blade while every hidden leaflet control sits at an extreme; LF7/LF9/LF10 on the simple blade as it always was" },
      { label: 'COMPOUND: GATED — the type and every leaflet control at an extreme with length 0 (hidden AND inert)',
        path: "LF14's inertness — no leaf is built, so no compound plan, no leaflet and no rod is reported; LF0's absent arm" },
    ],
  },
  {
    n: 55, title: 'the compound retune (Oct 7, Eva on #380)',
    anchor: 'COMPOUND RETUNE: leaflet serration ON (leafletToothDepth 0.12, 12 fine teeth, tip and notch 1.6 — the 1 mm floor applies)',
    /* FIVE ROWS: the clamp binding on the thinnest stem (LF18's law under its
       cap, the rooted end held inside a solid stem); the cap UNDER the wire
       (no cone — LF17's other arm, LF18's one-direction clause); the leaflets'
       serration switched back ON through their own depth (LF7/LF13 on the
       leaflets' own control, the 1 mm floor); and the twin controls' two
       GATED arms (each pair's simple half hidden and inert under COMPOUND,
       its leaflet half under SIMPLE). */
    rows: [
      { label: 'COMPOUND RETUNE: the petiole CLAMPED on the 3 mm solid stem (4 pairs ask 3.60 mm; the stem holds 2.98)',
        path: "LF18 — the petiole asked by the area rule read upward, CAPPED by where the rooted end fits the stem, the record's asked/cap/built/clamped restated from the controls and the stem plan, the emitted root ring inside the stem; LF17's petiole rings at the clamped radius and the cone at 45 degrees" },
      { label: 'COMPOUND RETUNE: sheet 2.4 x leafAngle 85 (the 1.64 mm cap is UNDER the 2.40 mm wire — the petiole stays the wire, no cone)',
        path: "LF17's no-cone arm (the rachis base is ring 1) and LF18's thickens = false, its rooted-end clause in its one direction (the wire over the cap stands proud, told)" },
      { label: 'COMPOUND RETUNE: leaflet serration ON (leafletToothDepth 0.12, 12 fine teeth, tip and notch 1.6 — the 1 mm floor applies)',
        path: "LF7 and LF13 on the leaflets' OWN depth control — teeth cut on every leaflet, each relief floored at 1.00 mm, the count giving where a sinus lacks the material" },
      { label: "COMPOUND RETUNE: GATED — COMPOUND with the simple leaf's tooth depth 1 and tip 3 (hidden AND inert under COMPOUND)",
        path: "LF7/LF9 restated from the LEAFLETS' controls while the simple leaf's depth and tip sit at an extreme — hidden and inert under COMPOUND" },
      { label: "COMPOUND RETUNE: GATED — SIMPLE with the leaflets' tooth depth 1 and tip 0.6 (hidden AND inert under SIMPLE)",
        path: "LF18's SIMPLE arm (the petiole is the wire) and LF7/LF9 on the simple blade while the leaflets' own depth and tip sit at an extreme — hidden and inert under SIMPLE" },
    ],
  },
  {
    n: 56, title: 'the lobed (chevron) leaf (Oct 8, leaf/stem build S4)',
    anchor: 'LOBED: the MUM — alternate 137.5 x 4 nodes at the lobed defaults, arch 25',
    /* TEN ROWS: the mum (every LOBED family on the shipped look, arched);
       the TILT cap binding; the TOOTH fold clamp binding hardest; the NONE-FIT
       case; the narrowest sinuses (rounded); S4's own form (two V's rounded,
       S4b); a NO ROUND BOTTOM FITS (S4b); the lobed petiole CLAMPED (S4b);
       the raceme's pin; and the GATED arm where a SIMPLE leaf carries every
       lobed control at an extreme. */
    rows: [
      { label: 'LOBED: the MUM — alternate 137.5 x 4 nodes at the lobed defaults, arch 25',
        path: "LF19 (the type in both statements, the law the controls restate), LF20 (the lobed outline, the station law, the built lobe count against the control's), LF21 (the lean read off the emitted skin at the eased tilt), LF22 (no inverted skin cell, the inner cells' advance over the fold margin), LF23 (the teeth floored, unclamped), LF24 (the petiole's run into the V), LF25 (the round bottoms on the shipped sinuses), LF26 (the area-scaled petiole) on an arched lobed blade; LF9/LF11/LF12 on the lobed stations; LF31 (the ruled tooth default pinned — 28 asked and 28 built on every leaf, 3 / 4 / 4 / 6, 6,916 triangles a leaf, the roundness saturating at 0.1750)" },
      { label: 'LOBED: lobedAngle max (60 — the TILT CAP binds, built under asked)',
        path: "LF21's tilt biconditional (built under asked, clamped told) and LF22 at the cap — the outer cells where the tilt eases out keep a positive area" },
      { label: 'LOBED: 6 lobes x tooth depth 0.3, 1 tooth a lobe (the fold clamp binds — 4.86 mm asked, built at the 1.71 mm cap)',
        path: "LF23's fold clamp (asked against built, the told flag a biconditional) and LF22's fold margin read off the lattice at the cap" },
      { label: 'LOBED: NONE FIT — 6 lobes x sinus 0.9 x depth 0.3, 3 teeth a lobe (39 asked: the fold cap 0.08 mm, under the 1 mm floor; no teeth, told)',
        path: "LF23's none-fit arm — the cap under the floor, no tooth cut, NO ROOM 'fold cap'" },
      { label: 'LOBED: lobedSinus max (0.9 — the narrowest sinus gaps)',
        path: "LF20 on the deepest sinuses and LF25 there — every needed sinus ROUNDED to a 1 mm opening read off the emitted rows, the depth untouched, the told flag a biconditional" },
      { label: "LOBED: S4's form (sinus 0.62, shape 0.70, angle 38, teeth 0.08 — two V's under 1 mm, both ROUNDED, told)",
        path: "LF25 on S4's own V's (the asked openings 0.852 / 0.794 mm restated, both rounded, the third sinus untouched) and LF26 (the area law on S4's blade)" },
      { label: 'LOBED: THE LOBE COUNT YIELDS — 5 lobes asked on a 36 mm blade at 30 deg, 3 built (no round bottom fits even at the print minimum at 5 or 4; told)',
        path: "LF28's yield arm (5 -> 4 -> 3, each attempt's no-fit sinuses recorded and restated, built under asked, told) and LF25 on the three built sinuses, every one rounded" },
      { label: 'LOBED: the petiole CLAMPED — no sinus on a 3 mm stem at 90 deg (asks 0.82 mm, the rooted end holds 0.75)',
        path: "LF26's clamp (the area law's ask against the stem's cap, told) and the rod excused at its built radius" },
      { label: "LOBED: under a raceme's shared node (PINNED to SIMPLE, and told)",
        path: "LF14's pin arm for a LOBED ask — the plan reports SIMPLE, typePinned and typeAsked LOBED; LF19's inert arm" },
      { label: 'LOBED: GATED — SIMPLE with every lobed control at an extreme (hidden AND inert)',
        path: "LF19's SIMPLE arm — no chevron law in the plan and none emitted while every hidden lobed control sits at an extreme" },
    ],
  },
  {
    n: 57, title: 'the sinus roundness, the lobe-count yield and the lobed tooth count (Oct 9, leaf/stem build S4c)',
    anchor: 'LOBED ROUNDNESS: max (0.5 — SATURATED from 0.18: every sinus at its largest smooth radius, told and hatched)',
    /* SEVEN ROWS: the roundness at its maximum (every sinus's radius shrinks,
       told) and on S4's form; the count yielding to the print minimum; the
       RESIDUAL (no count fits, the V kept, told); the per-lobe tooth count at
       its maximum (the rows cap) and at an even count; and the gated arm where
       a SIMPLE leaf carries the two new controls at their maxima. */
    rows: [
      { label: 'LOBED ROUNDNESS: max (0.5 — SATURATED from 0.18: every sinus at its largest smooth radius, told and hatched)',
        path: "LF27 (the radius restated from the pitch and the print minimum, read off the emitted rows on the declared disc, the shrink a biconditional with its told flag) and LF25 on every rounded sinus" },
      { label: 'LOBED ROUNDNESS: 0.3 x S4\'s form (the radius shrinks at all three sinuses)',
        path: "LF27's shrink at a sinus that NEEDS a round bottom and at one that does not — the asked radius, the built one, the floor between" },
      { label: 'LOBED YIELD: 6 lobes asked on a 12 mm blade (the count gives 6 -> 2, where the print minimum fits; told)',
        path: "LF28's yield order (the radius at its minimum first, the count only where even that does not fit), the attempts restated, LF20 on the built count" },
      { label: 'LOBED YIELD: the RESIDUAL — 3 lobes on a 24 mm blade over a 5.5 mm window at 58 deg (no count fits; the V kept, told)',
        path: "LF28's residual arm — every count down to one has a sinus no bottom fits, the asked count built with its V's kept and told, LF25's NO FIT arm" },
      { label: 'LOBED TEETH: max (6 a lobe — 42 asked, the ROWS cap builds 28 at 130 rows, told)',
        path: "LF29 (the per-lobe count over the built lobes, the rim's ask, every declared margin tooth drawn on an emitted row, the per-lobe tally summing to the built count, the rows cap told)" },
      { label: 'LOBED TEETH: 2 a lobe (14 — an even count: the apex notch on the terminal face)',
        path: "LF29 at an even rim count — the apex notch on the face cuts nothing and is no margin tooth" },
      { label: 'LOBED TEETH: GATED — SIMPLE with the roundness and the lobed tooth count at their maxima (hidden AND inert)',
        path: "LF19's SIMPLE arm with the two new controls at an extreme — neither shown, neither read" },
    ],
  },
  {
    n: 58, title: 'the ruled tooth default, the roundness dead travel and the tangent shoulders (Oct 9, the S4c follow-up)',
    anchor: 'LOBED RULINGS: 3 a lobe (S4c\'s proposal, ruled against — 21 over the rim, 2 / 3 / 3 / 5)',
    /* TWO ROWS: the first dead step of the roundness on the ruled leaf
       (SATURATED, every shoulder filleted) and a told shoulder corner (the
       disc meets the flank). LF31's pins ride on block 56's MUM row, which
       builds the ruled default leaf. */
    rows: [
      { label: 'LOBED RULINGS: roundness 0.18 (the first DEAD step — SATURATED, the same leaf as 0.5; told and hatched)',
        path: "LF30 (every shoulder of every rounded sinus filleted and tangent on the law, the page's rows on the law's fillet, the page's shoulder record the law's) and LF27 at the largest smooth radius" },
      { label: 'LOBED RULINGS: a told shoulder CORNER — the disc meets the flank (5 lobes on a 58 mm blade at lobe shape 1.5)',
        path: "LF30's told-corner arm — a shoulder with no fillet carries its reason (the disc meets the flank), and the filleted ones beside it stay tangent" },
    ],
  },
  {
    n: 59, title: 'the leaf tip and the broad sinus (Oct 10, S5)',
    anchor: 'LEAF TIP: SIMPLE at tip shape 0.60 — the nib\'s FLOOR regime (the flank shallower than the outline, a told corner)',
    /* FOUR ROWS: the nib's corner regime on a simple leaf, a leaflet tooth
       that would have cut the nib, the tip giving its tooth up, and the
       broad fillet. LF32 rides on every nibbed blade in the subset (every
       leaf row), LF34 on every lobed one. */
    rows: [
      { label: 'LEAF TIP: COMPOUND, a leaflet tooth reaching the converging tip (leaflet tip 0.80, width 40, depth 0.1 — no notch inside the nib)',
        path: 'LF33 (no row under the print floor carries a cut — the tooth whose period runs past the crossing gives that part up) and LF32 on every leaflet' },
      { label: 'LEAF TIP: the tip gives its tooth up (SIMPLE, width 10, 12 teeth at depth 1, tip 0.60 — the first given up at the tip, told)',
        path: 'LF13 (the relief-floor count, its cause a biconditional) with the tip yield told beside it, LF32 in the FLOOR regime' },
      { label: 'BROAD SINUS: filleted at roundness 0.12 (lobe shape 2.5 — every sinus broad)',
        path: "LF34 (a broad sinus's fillet tangent to both arms on the law, the page's rows on the law's fillet, the record the law's, the radius law) and LF20's ADD window" },
    ],
  },
  {
    n: 60, title: 'the tip gives up the pair that necks it (Oct 11, S5b)',
    anchor: 'TIP NECK: SIMPLE, the default leaf alone (its terminal notch cuts 77% of the way to the midrib — the pair given up, told)',
    /* THREE ROWS: two pairs given (the walk applies again one pair down), the
       bar raised to the body's own teeth (nothing given: the deep-serration
       arm), and the rose's toothed leaflets. LF35 rides on every toothed
       leaf blade in the subset; these are the rows that exercise its arms. */
    rows: [
      { label: 'TIP NECK: two pairs given up (SIMPLE depth 0.5 x 9 teeth — 77% and 68%; the third pair, 48%, stops the walk)',
        path: "LF35 (the record's two give-ups past the bar and the third under it, both margins at relief 0, the teeth drawn restated; the kept notch on the emitted rows under the bar) and LF13 with the given pairs exempt" },
      { label: 'TIP NECK: the body parts the blade as deeply (SIMPLE depth 0.8 x 9 — the body 80%, the tip 77%: no neck, nothing given)',
        path: "LF35's BODY arm — the bar is the body's own deepest tooth, read on the rows as well as in the record, and a tip parted no deeper keeps its teeth" },
      { label: 'TIP NECK: the ROSE, its leaflets toothed at 0.26 (each leaflet gives its terminal pair up)',
        path: 'LF35 on every leaflet (each its own blade, its own body and bar) and LF16' },
      { label: 'ALREADY ROUND: every broad sinus rounder than the largest fillet its arms take (5 lobes, shape 2.1, sinus 0.17 — the roundness slider dead along its whole travel, told plainly)',
        path: "LF36 (each sinus told already round: the law's own bottom radius against the largest fillet, and that fillet adding under a relief-grid step anywhere on the law) and LF34's branch" },
    ],
  },
  {
    n: 61, title: "the sepal's own length and width (Oct 13, QA.1)",
    anchor: "SEPAL SIZE: the WING — 120 x 5 mm, angle -10, curl +120 biased to the tip, tapers 3 / 4, tip 0.60 (the sepals three times the 35 mm petals' length)",
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this block adds are
       the own-size arm of `bladeAskedLengthMm` / `bladeAskedWidthMm` (a set
       row wins), the foot's width-ratio arm, the floor on a sub-floor value,
       the multiplier's inert state, and the ROOT EXCLUSION IN MILLIMETRES
       on a sepal long enough to tell it from the old fraction (the pinned
       row). The anchor is the wing: both own rows set on a curled,
       near-horizontal blade three times the petals' length. Cheapest row per
       path; the gated row is bit-identical to the default by branch. */
    rows: [
      { label: "SEPAL SIZE: the WING — 120 x 5 mm, angle -10, curl +120 biased to the tip, tapers 3 / 4, tip 0.60 (the sepals three times the 35 mm petals' length)",
        path: "SP0b (the multiplier hidden exactly where both own rows are set — the registry's sepalScaleLive, the geometry's own.scaleInert and the harness's restatement agreeing), SP3 (the foot x own width / petal width x breadth), SP5 (the size law restated from the controls against the asked record) and SP5b (the EMITTED blade: the outer-column chord at the widest row at or under the law's width, the centre line at least half the asked length), SP8 (the limit record's exclusion is the petals' root blend in mm)" },
      { label: "SEPAL SIZE: 120 x 5 mm asked UP at 40 — the limit drawn with the root exclusion in MILLIMETRES (pinned at or under 22; a fraction of the sepal's length read +24 here)",
        path: "SP8's pin: the drawn limit on a long sepal at or under 22 degrees, and the harness's own contact test — its trial sepal keeping every blade row from the restated mm exclusion outward — finding the built angle clear and the step above clipping" },
      { label: "SEPAL SIZE: width max (30 mm — wider than the petal; the foot follows the width ratio and clamps at its ceiling, told)",
        path: "SP3's width-ratio arm with the foot cap binding (the arc each sepal foot owns at its ring — clamped, told), SP5b's flat-blade EXACT width (a sepal wider than its petal, the length still the petal's x size)" },
      { label: "SEPAL SIZE: under the floors (2 mm long, 1 mm wide asked — FLOORED at 5 x 3, told)",
        path: "SP5's floored arm (both flags, the floored sizes in the record and on the emitted blade)" },
      { label: "SEPAL SIZE: GATED — count 0 with both set (hidden and inert; bit-identical to the default)",
        path: "SP0 / SP0b with no sepals (the multiplier's predicate false on a count of 0, the geometry building nothing) and SP7" },
    ],
  },
  {
    n: 62, title: 'the spine curve (Oct 15, F3-global)',
    anchor: 'SPINE CURVE: a HOOKED tip (the spine doubles back — not a function of x)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this block adds are
       spineLaw's curve arm (the hook, where the shape is not a function of x
       and the sampler's 2D arm is what draws it), the clamp on a curve a file
       loaded under the floor (the refusal and the clamp as one decision, told),
       the inert slider family, and the GATED row's branch (SLIDER mode with a
       curve stored, bit-identical to the default). The anchor is the hook:
       the one shape the slider family cannot draw. */
    rows: [
      { label: 'SPINE CURVE: a HOOKED tip (the spine doubles back — not a function of x)',
        path: "C1's curve arm (the mode's two statements, the hidden family inert in the record, curve -> curvature restated from the control's points against the emitted rows, the validator accepting and the build not clamping), J8 (the root chord at the tilt — the drawn curve's start laid along the blade), the self-contact flag" },
      { label: 'SPINE CURVE: a LOADED curve UNDER the floor (a file can hold one — CLAMPED and told; the editor refuses such a drag)',
        path: "C1's refusal clause (the validator REFUSES at this length, the build CLAMPS, and in export the two agree), the SPINE CURVE read-out's CLAMPED clause" },
      { label: 'SPINE CURVE: the hidden slider family set (curl 150, bias 1, start 0.5, all-curl 90 — INERT; bit-identical to the default-curve row)',
        path: "C1's inertness clause (curl, bias and start handed to the law read 0) and the restated law landing on the emitted rows while the hidden family holds non-zero values" },
      { label: 'SPINE CURVE: GATED — SLIDER mode with a hooked curve stored (hidden and inert; bit-identical to the default)',
        path: "C1's slider arm on a straight petal (the mode's two statements both SLIDER; the curve stored and read by nothing), petalFormIsFlat and FORM_IDS agreeing the row is flat" },
    ],
  },
  {
    n: 63, title: 'the sepal tiers (Oct 15, F1.1a)',
    anchor: 'SEPAL TIERS: three tiers on a 40 mm GOBLET hub — the LANTERN frame (5 sepals a tier, at 0.75 / 0.50 / 0.25 of the join)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this block adds are
       footRing's tier loop (the height law, the ordering clamp, the NO ROOM
       drop, the inert arm with no stem), sepalAngleLimit's upper-tier sites
       (the contact clamp against a tier above) and buildSepalsInto's tier
       loop. The anchor is the lantern frame — three tiers at the height law's
       own stations, nothing clamped; the contact row is where a lower tier is
       clamped against the tier above rather than the petals, which is the
       clamp SP13's own contact test exists for. --conn is REQUIRED (a new
       geometry mode: whorls attached partway down the join, below the first). */
    conn: true,
    rows: [
      { label: 'SEPAL TIERS: three tiers on a 40 mm GOBLET hub — the LANTERN frame (5 sepals a tier, at 0.75 / 0.50 / 0.25 of the join)',
        path: "SP10 (the two statements, three asked and three built), SP11 (each tier's station the height law's — 0.75 / 0.50 / 0.25 — unclamped, its foot rows on its own attachment one sheet below the tier above), SP12 (every tier built from the whole-bloom sepal values, sepals within a tier matching, the phase law per tier); --conn is the witness that three whorls down the flare are one piece with it" },
      { label: 'SEPAL TIERS: three tiers asked UP at 60 on a 10 mm hub — tiers 2 and 3 CLAMPED against the tier above (the contact clamp)',
        path: "SP13 (tiers 2 and 3 CLAMPED against the tier above: the arithmetic, and the harness's own contact test clear at the built angle and clipping one step above the limit), SP12 (the tilt each tier was built at is its own clamp's)" },
      { label: 'SEPAL TIERS: four tiers on a 6 mm hub at the THICK sheet (2.40 mm) — the gap a LENGTH: tiers 2 and 3 order-clamped 2.40 mm apart, tier 4 NO ROOM',
        path: 'SP11 (the ORDER clamp as a biconditional against the tier above less one sheet restated from the sheet thickness — 2.40 mm, a length — and NO ROOM as a biconditional, told), SP10 (three built of four, the fourth told)' },
      { label: 'SEPAL TIERS: two tiers on the DEFAULT join (1.32 mm) — tier 2 has NO ROOM under the one-sheet gap, not built and told',
        path: 'SP11 (NO ROOM on the shipping join: the second tier\'s clamped station under the stem end, not built, the reason on the record), SP10 (one built of two)' },
      { label: 'SEPAL TIERS: three tiers on a DOME (rise 0.5) with a 60 mm stem — the extent INVERTED, tiers past the first inert and told',
        path: "SP10's rim arm (tier 1 at the rim with its reason, tiers 2 and 3 inert and told with it) — the stem present, so the control shows and the geometry still builds one" },
      { label: 'SEPAL TIERS: GATED — four tiers asked with NO stem (hidden and inert; bit-identical to the one-tier whorl)',
        path: "SP10's two statements (the registry hides the tier count exactly where the geometry builds nothing below the first), and the byte tool's partition (a holder)" },
    ],
  },
  {
    n: 64, title: 'per-layer values on a spiral; an owned width drives its foot and ring (Oct 16)',
    anchor: 'PER-LAYER: RADIAL x 3 layers — layer 2 owns a 12 mm width, layer 1 a 14 mm one (the foot and the ring follow; layer 1\'s ring stays the rim)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this block adds are
       footRing's owned-width arm (the foot from its own width, the ring at
       R0 x own / petalWidth; past 1 the hub grows to it), `layerOwnedValues`, and
       scopeOffsetsFor's per-layer gate under SPIRAL. The anchor owns widths on
       two layers (ring 1 foot-only, ring 2 foot and ring); the spiral row is
       the gate's only SPIRAL row with a live layer entry; the held-at-the-rim
       row is the clamp's arm. --conn is REQUIRED (a ring placed by a new law). */
    conn: true,
    rows: [
      { label: 'PER-LAYER: RADIAL x 3 layers — layer 2 owns a 12 mm width, layer 1 a 14 mm one (the foot and the ring follow; layer 1\'s ring stays the rim)',
        path: "Z3 (each ring's foot width and each deeper ring's radius restated from the controls and the row's entries — ring 2 at R0 x 12/16, ring 1 at the rim with its own 14 mm foot), Z2 (the width offsets reach those whorls' blades), J2/J3 (the ring inside the hub disc, its foot reaching it); --conn is the witness that a ring placed by the owned width is one piece with the hub" },
      { label: 'PER-LAYER: SPIRAL x 3 turns — turn 2 owns its width, turn 3 its length and tilt (no foot, no ring)',
        path: "Z2 (a SPIRAL's layer entries reach its turns' blades, Oct 16), Z3 (turn 2's foot and ring from its own width; turn 3's on the ramp although it owns length and tilt), C1 (turn 3's blade at its own length)" },
      { label: 'PER-LAYER: RADIAL x 4 layers — layer 4 asks a width past the outer whorl\'s (the HUB GROWS to its ring, told)',
        path: "Z3's growth arm (the hub grows to the widest owned ring, hubGrowth a biconditional against own / petalWidth > 1, the hub's radius restated), J2 (the identity moves to that ring, ring 0 strictly inside)" },
      { label: 'PER-LAYER: GATED — CONTINUOUS x 3 turns with per-layer ON and a layer record (kept and inert)',
        path: "Z2's inert arm (no descriptor carries a scope term under CONTINUOUS), and the byte tool's partition (a holder)" },
    ],
  },
  {
    n: 65, title: 'the outline curve (Oct 17, F6-sym)',
    anchor: 'OUTLINE CURVE: a SPOON on a claw (spatulate — narrow, then wide near the tip: a waisted, non-convex blade)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this block adds are
       widthProfile's CURVE arm (the CORE term read off the drawn half-curve,
       the squared end, the lobes and the fringe standing down), the fitted nib
       (`leafNibPlan` on a petal, so the drawn length is the slider's), the
       LIFT of a point a file loaded under the floor (the refusal and the lift
       one decision), the base row count in CURVE mode, and the GATED row's
       branch (LAW mode with a curve stored). The anchor is the spoon: the one
       shape the law cannot draw at all (a waist, then a wide end). --conn is
       REQUIRED (a new outline law). */
    conn: true,
    rows: [
      { label: 'OUTLINE CURVE: a SPOON on a claw (spatulate — narrow, then wide near the tip: a waisted, non-convex blade)',
        path: "OC1 (every row below the nib on the curve restated from the control's points, the foot's own blend under it), OC0 (the mode's two statements, the base row count, no lobe or fringe record), OC2 (accepted and not lifted), AN1/AN2's curve arm (the fitted nib rebuilt on the restated curve, the drawn length the slider's exactly), C1 (the spine at the asked length), A4 (the terminal the nib's face); --conn is the witness that a drawn outline is one piece" },
      { label: 'OUTLINE CURVE: a LOADED curve with a point UNDER the print floor (a file can hold one — LIFTED and told; the editor refuses such a drag)',
        path: "OC2's refusal arm (the validator REFUSES at this length, the build LIFTS exactly the refused point, the bar restated), OC1 on the lifted curve, the OUTLINE CURVE read-out's LIFTED clause" },
      { label: 'OUTLINE CURVE: the hidden law family set (tip shape 3, tapers 3 / 4, squared end 1, lobes 0.3, fringe 4 — INERT; bit-identical to the default-curve row)',
        path: "OC0's inert arm (no lobe or fringe record, the base row count although the tip shape asks the apex ramp), A4's terminal with the squared end inert, L0 / FR0's two statements standing the rim family down" },
      { label: 'OUTLINE CURVE: the spoon x the Voronoi infill (cells on a waisted, non-convex blade)',
        path: "the infill family on a drawn outline (I0-I12 over the curve's own lamina), OC1 under the cells' basal panel" },
      { label: 'OUTLINE CURVE: GATED — LAW mode with a spoon stored (hidden and inert; bit-identical to the default)',
        path: "OC0's LAW arm (the mode's two statements both LAW; the curve stored and read by nothing), A5 / A6 on the law, and the byte tool's partition (a holder)" },
      /* F6-spoon (Oct 18, docs/bloom-spoon-rim-turn-outcome.md): in the subset
         so the edge-profile gate's E2 HOLDS its declared turn — E2 draws from
         this subset and refuses a declaration naming a row it did not run. */
      { label: 'OUTLINE CURVE: the spoon x cup 0.6 (the form laws read the drawn half-width)',
        path: "E2's declared magnitude (71.99 deg at the first nib-arc row — the blunt end's last ladder gap under a cup, the LAW spatulate's class), OC1/OC2 under a cup, AN1/AN2's curve arm, the form laws reading the drawn half-width" },
    ],
  },
  {
    n: 66, title: 'the outline curve\'s follow-ups — width scales the curve, CURVE on a tube (Oct 17, F6-sym-2)',
    anchor: 'OUTLINE CURVE 2: the default curve x petalWidth 24 (the widths x1.5, the positions unmoved)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this block adds are the
       plan's WIDTH SCALE (every point's y times the Petal width over 16, a
       branch at 16), the THROAT arm (on a fused whorl the curve laid over the
       lobe, its first point pinned to the tube law's half-width, the law's own
       CORE term below the throat and an OUTLINE_LOBE term above it), and the
       tube's eligibility no longer refusing a CURVE petal. The anchor is the
       first row (a block's range starts at its anchor), the width scale's plain case; the bell, a ring with a tilt past 70 and a cup, carries the throat.
       --conn is REQUIRED (the throat seam is new geometry). */
    conn: true,
    rows: [
      { label: 'OUTLINE CURVE 2: the BELL with a drawn lobe',
        path: "OC3 (the throat at the control's fusion height, the first point pinned to the tube law restated from the ring's own tapers and tip shape, the scale 1), OC1 (below the throat the restated LAW, above it the restated curve laid over the lobe), OC2, AN1/AN2's curve arm on the lobe, TU0/TU1 (the tube available under CURVE); --conn witnesses the throat seam is one piece" },
      { label: 'OUTLINE CURVE 2: the default curve x petalWidth 24 (the widths x1.5, the positions unmoved)',
        path: "OC3's scale arm (1.5 from the ring's own width over the ruled 16 mm), OC1 on the scaled curve (the widths scaled, the stations not), OC2's peak at the scaled width" },
      { label: 'OUTLINE CURVE 2: petalWidth 10 set in LAW, then the long tail (its narrow run under the floor at 0.625x — LIFTED and told, never a refused drag)',
        path: "OC2's refusal arm at a SCALED width (the validator and the build refuse and lift the same scaled points), OC3's scale arm below 1" },
      { label: 'OUTLINE CURVE 2: TUBE — a lobe curve x 6 petals x k 2 (slit — the edge petals keep their outer halves from the foot)',
        path: "OC1 on a slit whorl (the edge petals' own outer halves read the law below the throat and the curve above), TU0/TU1 on a slit k" },
      { label: 'OUTLINE CURVE 2: TUBE — a lobe curve x 3 whorls, only the first fused (k 0 / FREE / FREE)',
        path: "OC3's free arm (the inner whorls carry NO throat; the outer one does), OC1 per ring on both arms" },
      { label: 'OUTLINE CURVE 2: the TRUMPET with a drawn lobe',
        path: "OC3 at the long fusion height (0.58), OC1 with a curl reaching the blend, AN2 (the drawn length is the slider's on the lobe)" },
      /* F6-spoon (Oct 18, docs/bloom-spoon-rim-turn-outcome.md): E2 holds its
         declared turn here, as above. */
      { label: 'OUTLINE CURVE 2: the spoon x petalWidth 30',
        path: "E2's declared magnitude (49.20 deg on the spatulate head's steep fall into the nib, x1.875), OC3's scale arm at the widest, OC1 on a scaled waisted curve" },
    ],
  },
  {
    n: 67, title: 'the asymmetric outline — two half-curves about the midrib (Oct 18, F6-asym)',
    anchor: 'ASYM OUTLINE: EQUAL halves (two-sided, left = right — bit-identical to the symmetric default-curve row)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this block adds are the
       TWO-SIDED PROFILE (each half its own widthProfile, answering per side),
       the per-side section (each half's cup, buckle and apex sweep on its own
       width), the ladder's AVERAGED measure, the per-side cap and nib (OC0-OC3
       and AN0-AN3 run once a half), and the infill on two half-widths (the
       plan in mm across the midrib, the seeds mirrored by the halves' ratio,
       the metric field per side). The anchor is the equal-halves row, the
       identity case; the lateral carries the narrowest half, the pinwheel the
       whole-flower handedness, the tube the throat on each half.
       --conn is REQUIRED (the per-side bead and infill are new geometry). */
    conn: true,
    rows: [
      { label: 'ASYM OUTLINE: EQUAL halves (two-sided, left = right — bit-identical to the symmetric default-curve row)',
        path: "OC0's two-sided arm (the control's mode against the cap's, both halves' points), OC1 per half (each restated from its own points), AN0-AN3 per half, the halves' one drawn length" },
      { label: 'ASYM OUTLINE: a LOPSIDED blade (the right half narrower)',
        path: "OC4 (the handedness on the emitted margins — the left half on the viewer's left, N x D, each flat margin at its own half's width), OC1/OC2 per half on two different curves (each half's own peak and widest point), AN1/AN2 per half (each half's own nib on its own law), AN3 per half on the emitted rows" },
      { label: 'ASYM OUTLINE: the lateral x cup 1.2 (the fold clamp on each half)',
        path: "the form laws on each half's own width (the fold clamp reading the narrow half's radius), OC1 under a cup, E2 on the narrow half's bead" },
      { label: 'ASYM OUTLINE: a periwinkle-like PINWHEEL x 5 petals (every petal the same hand)',
        path: "OC4 per ring (every petal of the whorl the same hand), OC1 per ring per half on a pinwheel, J/C on a two-sided petal, the shipping arrangement with every petal one hand" },
      { label: 'ASYM OUTLINE: the lateral x the Voronoi infill (cells on a one-sided blade)',
        path: "the infill family (I0-I12) on two half-widths — the plan in mm across the midrib, the seeds mirrored by the halves' ratio, the bead on every hole and on both margins" },
      { label: 'ASYM OUTLINE: the pinwheel x TUBE (each half pinned to the throat)',
        path: "OC3 per half (each half's first point pinned to the tube law at the throat), TU0/TU1 under an asymmetric lobe; --conn witnesses the throat seam on both halves" },
      { label: 'ASYM OUTLINE: a LOADED curve with its RIGHT half under the print floor (lifted and told)',
        path: "OC2's refusal arm on ONE half (the validator refuses the curve, the right half lifts its own points and the left lifts none)" },
      { label: 'ASYM OUTLINE: GATED — LAW mode with an asymmetric curve stored (hidden and inert; bit-identical to the default)',
        path: "OC0's LAW arm with a two-sided curve stored (no cap is two-sided), the byte tool's partition (a holder)" },
    ],
  },
  {
    n: 68, title: 'the outline under scoping, and the FAN pairs as mirror images (Oct 18, F6-scope)',
    anchor: 'SCOPED OUTLINE: a MIXED flower — RADIAL x 3 layers, layer 1 on the LAW, layer 2 owns the spoon, layer 3 the lopsided asymmetric curve',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this block adds are
       the scope's OWNED outline VALUES (mode and curve, replacing what the
       petal inherits — resolvePetalOutline's values arm, now resolvePetalValues), the FAN MIRROR (the
       non-canonical member's halves swapped — its mirrored arm), and every
       per-ring and per-petal reader of the outline handed the petal's own
       effective outline instead of the global control (OC0-OC4, AN, C1, A2,
       FR2 restated per ring through outlineRestated, and OC5 per petal). The
       anchor is the mixed flower, where all three layer states sit together;
       the SPIRAL row carries the per-turn arm, the FAN pair row the mirror,
       the orchid x infill row the mirror under the cell plan, and the GATED
       row the inert-by-toggle branch. --conn is REQUIRED (a mirrored partner
       is new geometry at every pair). */
    conn: true,
    rows: [
      { label: 'SCOPED OUTLINE: a MIXED flower — RADIAL x 3 layers, layer 1 on the LAW, layer 2 owns the spoon, layer 3 the lopsided asymmetric curve',
        path: "OC0-OC4 per ring against the outline restated from the row's own scopes (LAW, symmetric CURVE and two-sided CURVE in one flower), OC5's mode and sidedness per petal, AN per ring on its own curve" },
      { label: 'SCOPED OUTLINE: the mixed flower x the Voronoi infill (each petal\'s cells on its own outline)',
        path: "the infill family (I0-I12) on three outlines in one flower — each petal plans its cells on its own outline; X1 holds its one declared span-0 root-blend tangency" },
      { label: 'SCOPED OUTLINE: SPIRAL x 2 turns on two different curves (turn 1 the rectangle, turn 2 the diamond)',
        path: "the per-turn arm (a turn is a layer scope on SPIRAL), OC0/OC1 per turn on two different owned curves, OC5 per petal" },
      { label: 'SCOPED OUTLINE: FAN — pair 2 owns the lopsided curve on a LAW fan (its partner mirrored)',
        path: "OC5(c): the partner's emitted half-widths are the canonical member's with the halves swapped, exactly; OC4's handedness per member; a petal-scope owned value on a fan" },
      { label: 'SCOPED OUTLINE: FAN orchid x 2 layers — mirrored asymmetric laterals x the Voronoi infill',
        path: "the mirror under the cell plan (the partner plans on the swapped halves), coverage R1 with the re-emitted whorl handed each slot's mirror flag (fanSlotMirrored), I0-I12" },
      { label: 'SCOPED OUTLINE: GATED — a layer owning a curve with per-layer values OFF (kept and inert; the whole bloom draws)',
        path: "OC0/OC5 with an owned value kept and inert (scopeLayers OFF), the byte tool's partition (a holder)" },
    ],
  },
  {
    n: 69, title: 'the infill on several whorls, and the length they stand for (Oct 19, infill-whorls)',
    anchor: 'INFILL WHORLS: RADIAL x 3 whorls x the Voronoi infill on the LAW (#421\'s 736-pair flower)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branch this block exercises is
       the infill's SEAM on a short petal — the plan's `xB` as the seam's own
       double, so `snapSeam`, the emitter's `onSeam` and the margin ramp agree
       with the outline's seam columns. The anchor is the three-whorl flower
       (#421's 736 pairs on main, every inner whorl a shorter petal); the
       28 mm row is the same seam on ONE whorl (1,600 pairs on main), which is
       what says the whorls were a proxy. X2 is the witness (0 pairs, no
       declaration) and --conn is REQUIRED (the seam is where the basal panel
       and the cells meet). */
    conn: true,
    rows: [
      { label: 'INFILL WHORLS: RADIAL x 3 whorls x the Voronoi infill on the LAW (#421\'s 736-pair flower)',
        path: "X2 on the seam of three whorls of infilled petals (0 pairs; 736 on main), I0-I12 per petal, coverage R1 over 24 infilled petals" },
      { label: 'INFILL WHORLS: ONE whorl x petalLength 28 x the infill (the length the whorls stand for)',
        path: "X2 on one short infilled petal's seam (0 pairs; 1,600 on main, where the quantisation residue had the other sign)" },
    ],
  },
  {
    n: 70, title: 'the spine curve under scoping (Oct 19, F3-scope)',
    anchor: 'SCOPED SPINE: BOTH CURVES per layer — layer 1 LAW on the sliders, layer 2 the spoon on the S, layer 3 the lopsided on the incurve',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this block adds are the
       scope's OWNED spine VALUES (the curl mode and the spine curve, through
       the one resolver's values arm beside the outline's), every per-ring
       reader of the spine handed the ring's own (C1 and J8 through
       ringSpineRestated), and the per-petal census (C4: the mode and curve
       per petal, the spine planar in the midrib plane, a FAN pair one spine).
       The anchor is the both-curves flower, where a SLIDER layer, two CURVE
       layers and three outlines sit together; the SPIRAL row carries the
       per-turn arm, the FAN row the pair's shared spine, the infill row the
       cells on a scoped spine, and the GATED row the inert-by-toggle branch.
       --conn is REQUIRED (a scoped spine bends a whole layer's blades). */
    conn: true,
    rows: [
      { label: 'SCOPED SPINE: BOTH CURVES per layer — layer 1 LAW on the sliders, layer 2 the spoon on the S, layer 3 the lopsided on the incurve',
        path: "C1/C2/C3 per ring on its own spine (the slider arm on layer 1, the curve arm on layers 2 and 3, restated from the row's scopes), C4 per petal, OC0-OC5 on the same flower's per-layer outlines — the two values resolved through one chain" },
      { label: 'SCOPED SPINE: both curves per layer x the Voronoi infill (each petal\'s cells on its own outline and spine)',
        path: "the infill family (I0-I12) on petals bent by three different spines and cut by three outlines, C4 per petal, coverage R1" },
      { label: 'SCOPED SPINE: SPIRAL x 2 turns on two different spines (turn 1 the reflex, turn 2 the incurve)',
        path: "the per-turn arm (a turn is a layer scope on SPIRAL), C1 per turn on two different owned spines, J8's root chord on each" },
      { label: 'SCOPED SPINE: FAN — pair 2 owns the incurve on a slider fan (its partner the SAME spine, unflipped)',
        path: "C4(d): the partner's emitted spine in its own midrib plane is the canonical member's to 1e-9 mm, with the same law (no flip — the spine is planar); a petal-scope owned spine on a fan" },
      { label: 'SCOPED SPINE: the hook owned by the inner layer of three (CLAMPED there and told; the outer layers on the default curve)',
        path: "C1(d) on a scoped curve the validator refuses at its own layer's length (clamped <=> refused in EXPORT, the build's own record), the outer layers accepted and unclamped" },
      { label: 'SCOPED SPINE: GATED — a layer owning a drawn spine with per-layer values OFF (kept and inert; the whole bloom on the sliders)',
        path: "C1/C4 with an owned spine kept and inert (scopeLayers OFF), the byte tool's partition (a holder)" },
    ],
  },
  {
    n: 71, title: 'the fold limit (spine-cup-fold, Oct 20)',
    anchor: 'SPINE FOLD: the S x cup 0.31 (just valid — the largest cup the drawn S accepts)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branch this block adds is the
       FOLD LIMIT in spineLaw (a substep's curvature held where the cupped,
       rolled or twisted section's reach toward the bend's centre plus half a
       sheet — the inner skin — would pass it), read by BOTH the build and the
       spine-curve validator through one table. The anchor is the block's first row, the
       S at cup 0.31 (the last valid cup); #423's own fold (the drawn S x cup
       0.6, refused and built at the limit) is beside it; the cup 0.32 row
       is the first REFUSED cup, 0.31 the last valid one; the slider rows carry
       the uniform and the general (biased) arms; curl 195 x cup 1.2 is the
       just-valid slider state. --conn is REQUIRED (the limit re-bends a blade). */
    conn: true,
    rows: [
      { label: 'SPINE FOLD: the S x cup 0.6 (the fold #423 declared — held at the inner skin\'s limit, told)',
        path: "C5 (the applied limit restated from the emitted rows' reach plus half a sheet; the emitted curvature x reach under 1), C1(d) the fold refusal <=> the clamp, X2 (0 pairs; 248 on main)" },
      { label: 'SPINE FOLD: the S x cup 0.31 (just valid — the largest cup the drawn S accepts)',
        path: "C1(d) accepted and unclamped one cup step under the refusal, C5(c) no limit applied" },
      { label: 'SPINE FOLD: the S x cup 0.32 (the first cup refused — a loaded state, built at the limit and told)',
        path: "C1(d) refused for the fold and built clamped, C5 at the first binding cup" },
      { label: 'SPINE FOLD: curl 270 x cup 1.2 (clamped — the coil opens, told)',
        path: "C3 on the uniform arc the limit reaches (the floor never does), C5 on the slider arm, X2 (0 pairs; 363 on main)" },
      { label: 'SPINE FOLD: curl 360 x cup 0.9 x curl bias 0.5 (the general arm, clamped)',
        path: "C1/C2 on the general law with the limit applied per substep, C5" },
      { label: 'SPINE FOLD: curl 195 x cup 1.2 (just valid at the widest cup)',
        path: "C5(c) the limit inert one curl step under it, C3 unclamped" },
    ],
  },
  {
    n: 72, title: 'the sepal\'s own curves (curves-sepals, Oct 20)',
    anchor: 'SEPAL CURVES: 5 sepals on a drawn REFLEXED spine (sepal Curl from CURVE — the sepal slider family hidden and inert)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branch this block adds is the
       sepal's four VALUE twins reaching the petal builder through
       `sepalBladeState` (the pins to SLIDER / LAW removed), a tier owning them
       through `tierOffsetsFor` / `sepalTierState` (the one resolver), and the
       angle scan drawing its limit on the curved trial lamina. The anchor is
       the block's first row (the reflexed spine); the asymmetric outline, the
       two tiers on two curves, and the curved sepal at its angle limit are the
       brief's four smoke rows. --conn is REQUIRED (a curve re-bends and
       re-draws every sepal blade). */
    conn: true,
    rows: [
      { label: 'SEPAL CURVES: 5 sepals on an ASYMMETRIC outline (two halves; every sepal the same hand — the pinwheel)',
        path: "SP14(a)/(d) per half: the outline mode two ways and the emitted half-widths against the curve restated at the sepal's own width scale, SP6/SP12 skipping the value twins" },
      { label: 'SEPAL CURVES: two tiers on two outlines — tier 1 the lanceolate, tier 2 the rounded on the reflexed spine (a 40 mm GOBLET hub)',
        path: "SP14 per tier against the row's own tier values (a curve that leaks to another tier fires), SP10-SP13 on two tiers" },
      { label: 'SEPAL CURVES: an INCURVED sepal asked up at 60 — the angle limit DRAWN ON THE CURVED LAMINA (clamped to 0; the straight sepal stops at 21)',
        path: "SP8 the harness's own contact test on the curved sepal at the built angle and one step above, SP14(b) the incurve on the emitted rows" },
    ],
  },
  {
    n: 73, title: 'the leaf\'s own curves (curves-leaves, Oct 20)',
    anchor: 'LEAF CURVES: a drawn DROOPING spine (leaf Curl from CURVE — the bend a positive Arch makes; the Arch hidden and inert)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branch this block adds is the
       leaf's six curve twins reaching the petal laws through
       `leafBladeState` / `leafletBladeState` (the pins to SLIDER / LAW
       removed), the leaf's own spine arm in `leafSurface` / `lobedSurface` /
       the rachis, and the readers of the curved leaf (the inset, the shared
       node's offset and cap, SN4's arc reach). The anchor is the block's
       first row; the brief's smoke rows are the asymmetric toothed blade, the
       compound rose on a drawn rachis with the shared leaflet curve, the
       raceme's shared-node leaf and the steep 85 deg leaf. --conn is REQUIRED
       (a curve re-bends and re-draws every leaf blade). */
    conn: true,
    rows: [
      { label: 'LEAF CURVES: an ASYMMETRIC TOOTHED oak-ish blade on a drawn spine (teeth cut into each drawn half)',
        path: "LF37 the modes two ways, the spine restated from the control's points and the outline per half at the leaf's own width scale, LF13/LF33/LF35 per half on the drawn outline" },
      { label: 'LEAF CURVES: the COMPOUND rose on a drawn rachis, one leaflet curve shared by every leaflet (the terminal at its own size), toothed',
        path: "LF37 the rachis on the drawn curve and every leaflet's outline at its own scale (the terminal's 0.969), LF11 the rachis, LF17 the taper by the curved rachis's arc length" },
      { label: 'LEAF CURVES: a raceme\'s shared-node leaf on a drawn spine (the offset and the cap read the CURVED blade)',
        path: "SN4 the emitted blade's reach along the drawn spine against the cap, LF37 the spine" },
      { label: 'LEAF CURVES: the STEEP 85 deg leaf on a drawn spine',
        path: "LF4 the inset against the drawn spine's rise restated from the control, LF37, ST9 on the curved blade" },
      /* the two rows E2_TURN_XFAIL declares (the edge gate draws from this
         subset, so a declaration on a row outside it is one nothing evaluates) */
      { label: 'LEAF CURVES: the FOLD LIMIT — a tight UPWARD curl drawn on a cup 1.2 leaf (held at the inner skin\'s limit, told)',
        path: "LF37(c) the fold limit off the EMITTED rows (curvature x reach + t/2 within the bar, clamped iff applied), E2 the cupped bead's declared turn" },
      { label: 'LEAF CURVES: the LOBED blade on a drawn spine, an outline curve STORED (the lobed blade keeps its own law — the outline mode inert, told)',
        path: "LF37(a) the outline mode inert on the lobed blade (its record null), LF21 the chevron's lean footed on the drawn spine, E2 the lobed bead's declared turn" },
    ],
  },  {
    n: 74, title: 'the braid (the braid session, Oct 21)',
    anchor: 'BRAID: 6 on a ring — one bundle',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branch this block adds is
       `coilLaw`'s BRAIDED arm (the gather onto the bundle's axis and the
       twist about it, an offset about the bundle's own spineLaw centreline
       through the one emitter `rodInto`), the per-strand clamps (the gather,
       the turns, the fold limit) and the strand scopes. The anchor is the
       block's six-stamen row; the subset adds the clamps, the bundle curled,
       the hemisphere and a strand scope. --conn is REQUIRED (a braid's
       strands meet the hub at their own roots and cross one another). */
    conn: true,
    rows: [
      { label: 'BRAID: 6 x turns max (12) — the curvature floor CLAMPS the turns, told',
        path: "JS9's braid arm — the turns the floor admits on the twist's exact curvature, restated in the gate and counted both ways — and JS4 at the strand's station count" },
      { label: 'BRAID: 6 x radius max (10) x length min (5) — too short to gather, the strands lean and do not wind (told)',
        path: "JS9 the gather CLAMPED (the largest fraction the floor admits, the turns 0) restated from the controls, JS8 the per-strand chord" },
      { label: 'BRAID: 6 x radius max (10) x curl 180 — the FOLD LIMIT clamps the lay radius (told)',
        path: "JS9 the lay radius at 1/k - t restated, every free station on the restated braid about the CURLED bundle axis, the anther on the end tangent" },
      { label: 'BRAID: 6 on a hemisphere (rise 1)',
        path: "JS9 the gather from roots on the dome onto the axis at the apex, JS1/JS3 the roots through the slab on the cap's normal" },
      { label: 'BRAID STRANDS: strand 4 laid wider (+1.5 mm) and strand 6 with 2 more turns',
        path: "JS9 per strand from the row's own @scopes (the strand's radius and turns restated, clamped to the registry's bounds), JS4 the strand's own station count" },
    ],
  },  {
    n: 75, title: 'big petals (Oct 21)',
    anchor: 'BIG PETALS: 60 mm (root x1.750 the sheet, 2.10 mm)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branch this block adds is the
       ROOT TAPER — `petalRootTaper`'s factor in `thicknessProfile` (the law's
       second factor beside the tip thinning), read by the seam, the fold
       clamp, the roll floor and the fold limit, and the HUB following the
       longest blade. The anchor is the block's 60 mm row; the subset adds the
       100 mm petal, the cupped and curled blades, the stem (the join's floor
       is the thickened hub), the sepals (pinned off) and the size field (the
       hub's bound). --conn is REQUIRED (a thicker root and a thicker hub are a
       new junction overlap). */
    conn: true,
    rows: [
      { label: 'BIG PETALS: 100 mm (root x3.236, 3.88 mm — the 15 cm bloom at tilt 25)',
        path: "T0 the record restated through the other integrator (the factor and the taper's end), T1 the ROOT read off the file, T2 the untapered blade rows at their own stations, T3 the hub against the thickest root, J4 the hub restated, A7 the seam on half the root" },
      { label: 'BIG PETALS: 100 mm x cup 1.2 (the fold clamp reads each row\'s own thickness)',
        path: "T1/T2 on a cupped blade (the locators on the cupped mid-surface), the roll and cup floors against the root, X1/X2 the census" },
      { label: 'BIG PETALS: 100 mm x curl 360 (the fold limit at each substep\'s own thickness)',
        path: "C5 the fold limit's half sheet at each substep's own station under the taper, restated; C1 the spine on the drawn length" },
      { label: 'BIG PETALS: 100 mm x stem 60 x 6 (the join floor is the thickened hub)',
        path: "ST4/ST5 the stem rooted through the THICKENED hub and the join floored at it, T3 the hub, J4 the hub restated" },
      { label: 'BIG PETALS: 100 mm x 8 sepals (each sepal its own 60 mm root — root support lifted the pin)',
        path: "T4 every sepal's root read off the file at the law of its own 60 mm length (root support lifted the pin), SP-family attachment on the thicker plate" },
      { label: 'BIG PETALS: 60 mm x size variance 0.5 (the hub reads the largest factor)',
        path: "T0 per ring on the size field's own factor, J4 the hub at the restated bound (petalLength x (1 + amount)), T3 the hub at least as thick as every root in the file" },
      { label: 'BIG PETALS: GATED — 35 mm x sheet 2.40 x tip thinning 0.5 (at the reference the law is the identity)',
        path: "T0 the branch identity (no ring declares a taper at the reference), J4 the hub the sheet to the bit" },
    ],
  },  {
    n: 76, title: 'root support (Oct 21)',
    anchor: 'ROOT SUPPORT: 8 sepals x 60 mm (root x1.750 at the sepal\'s own length)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this block adds are the
       root law on the SEPAL (the pin lifted; the hub held to the longest sepal
       root, the descriptor's foot height on the thickened root), on the LEAF
       blade (simple, lobed, every compound leaflet at its own length) with the
       petiole carrying the root, and the DERIVED FOOT CAP (the arc each foot
       owns at its ring). The subset adds the 120 mm sepal on a stem (the join
       goes inert — the rim fallback), two tiers at their own length, the
       simple leaf on a 6 and a 3 mm stem (the petiole capped), the compound
       leaf with long and default leaflets, and the cap binding at 40 petals.
       --conn is REQUIRED (a thicker sepal root, a thicker petiole and a capped
       foot are each a junction overlap of their own). */
    conn: true,
    rows: [
      { label: 'ROOT SUPPORT: 8 sepals x 120 mm x stem 60 (the join goes inert — the sepals stand on the rim)',
        path: "T4 the sepal's root off the file at the law of its own 120 mm length, T3 the hub carrying the sepal root, SP3 the attachment's rim fallback with the thicker foot, ST5 the join inert against the thickened plate" },
      { label: 'ROOT SUPPORT: 2 sepal tiers x 60 mm x stem 120 x 12 (each tier its own length)',
        path: "T4 per tier at the tier's own restated length, SP10-SP13 the tiers down the join, SP3 each tier's foot at its own root" },
      { label: 'ROOT SUPPORT: simple leaf 120 mm x stem 60 (the petiole carries the root)',
        path: "T5 the blade's untapered rows off the file at its own 120 mm length, T6 the petiole's ring off the file (CLAMPED at the stem, told), LF18 the root-floored petiole restated, ST9 the rod named at its real radius" },
      { label: 'ROOT SUPPORT: simple leaf 120 mm x stem 60 x 3 mm (the stem caps the petiole — told)',
        path: "T6 the petiole at the stem's own cap, LF18 the clamp told, LF4 the inset on the arch-free blade" },
      { label: 'ROOT SUPPORT: COMPOUND 120 mm rachis x 60 mm leaflets (each leaflet its own length)',
        path: "T5 every leaflet at its OWN length (never the rachis's), LF17 the rachis taper unchanged, LF18 the stalks the wire" },
      { label: 'ROOT SUPPORT: COMPOUND 120 mm rachis x the default leaflets (the rachis is not the leaflet)',
        path: "T5 entered on the rachis past the reference, every leaflet read at the sheet (the identity)" },
      { label: 'ROOT SUPPORT: width 46 x 40 petals',
        path: "FC1 the foot cap restated from the ring's radius x 2 pi / n and the asked foot, the told flag both ways, the emitted foot rows at the capped width; Z3 the ring's foot restated through the cap; J4 the floors" },
    ],
  },
  {
    n: 77, title: 'surface texture T3 (Oct 22)',
    anchor: 'TEXTURE: PEBBLE at the shipped height (0.4 mm) and size (4 mm)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this block adds are the
       lattice (sub-rows and sub-columns through the organ's own surface),
       the outward relief on both skins and over the bead, the shared
       world-space field on every sheet (petal, sepal, leaf, a floret), the
       refusals (the LOBED leaf, the infill — BOTH ON), and the choice guard.
       The subset adds the other pattern at the height ceiling (the bead
       close-up the clearance tool measures), the whole bloom (three organs
       under one field, the hub / stem / rods untextured), the tube (the ring
       untextured beside textured lobes), BOTH ON and the GATED holder.
       --conn is REQUIRED (a relieved bead is a junction overlap of its own on
       every petal, and the tube's untextured ring meets textured lobes). */
    conn: true,
    rows: [
      { label: 'TEXTURE: CELLULAR x textureHeight max (1.5)',
        path: 'TX1 the relief at the height ceiling outward on both skins, TX2 the Worley field restated at the builder\'s samples, TX5 the bead relieved along its own w, TX4 the petal lattice under the 1.25x bar, T1/T2 the file in [w, w + 2H]' },
      { label: 'TEXTURE: the WHOLE BLOOM — 8 sepals, a stem, a simple leaf (the hub and stem textured since T5, the rods smooth)',
        path: 'TX2 one world field on petal, sepal and leaf samples, TX4 per organ against its own untextured twin, TX7 the three organs\' lattice counts engine-agreed, T4/T5 the sepal and leaf files in the band, ST9 the stem untextured' },
      { label: 'TEXTURE: PEBBLE x the TUBE (6 of 8 fused — the lobes and, since T5, the ring textured)',
        path: 'TX4 the textured lobes against the twin, TU0/TU1 the ring built untextured beside them, TX8 the representative lobe on its surface' },
      { label: 'TEXTURE: BOTH ON — the VORONOI infill wins, the texture is REFUSED and told (Q9)',
        path: 'TX6 refused with the word infill, nothing displaced, the read-out NOT BUILT; I0-I13 the infill built as before' },
      { label: 'TEXTURE: GATED — the two sliders at their maxima under NONE (the choice guard holds the bytes)',
        path: 'TX0 the two statements under the guard, no record; the byte partition holds the row' },
      /* THE LOBED LEAF IS A SMOKE ROW BECAUSE THE EDGE GATE DRAWS FROM THIS LIST:
         its E2_TURN_XFAIL entry (the untextured lobed leaf's own turn) is a
         declaration nothing evaluates unless the row is here — the plain
         gate said so, in the local preflight, before CI could. */
      { label: 'TEXTURE: PEBBLE x a LOBED leaf (the blade declared OUT — refused, told)',
        path: 'TX0 the leaf refused by name (lobed) and told, the petals relieved beside it; E2 the untextured lobed leaf\'s own declared turn, LF19-LF24 the chevron lattice unmoved' },
    ],
  },
  {
    n: 78, title: 'the umbel (Oct 22)',
    anchor: 'UMBEL: 2 florets, head OFF',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this block adds are the
       UMBEL arm of the inflorescence plan (one node, N evenly spread pedicels
       through the whorl primitive), the derived JUNCTION KNOT the pedicels root
       in, and the HEAD TOGGLE (OFF builds no head and the stem ends at the
       knot; ON keeps the head and roots the umbel below it by the reach law).
       The subset covers the count's two ends, both head states, the angle's
       two extremes (90: every pedicel parallel, the ring's one-gap spacing is
       what keeps them apart; -60: descending onto the stem), the sessile
       floret on the knot, the spider lily, and the GATED umbel controls under
       a raceme. --conn is REQUIRED: the knot is the only join here, and every
       pedicel reaching it is the connectedness claim. */
    conn: true,
    rows: [
      { label: 'UMBEL: 2 florets, head OFF',
        path: "UM1 the knot restated from two pedicels (the area rule's own 4.24 mm, the ring one gap apart), UM2 both roots in the emitted knot at 0 and 180 deg, UM3 the knot on the stem's emitted top end, UM4 the florist's cut on the stem's FREE end with the knot clear of it, UM0 no head emitted" },
      { label: 'UMBEL: 12 florets, head ON',
        path: "UM1 the knot at twelve floored pedicels, UM2 twelve roots at 30 deg, UM3 the knot on the stem below the head and the florets one gap under its floor, UM0 the head built, ID1 the knot's triangles in the tally, ID9 (e) the umbel's node at the reach law's depth" },
      { label: 'UMBEL: 12 florets at 90 deg, head OFF (twelve parallel pedicels, one gap apart)',
        path: "UM2 twelve parallel pedicels rooted on the one-gap ring, ID10 (d) the florets of one node measured and declared, ST9 every pedicel excused by name" },
      { label: 'UMBEL: 6 florets at -60 deg, head ON',
        path: "UM2 descending pedicels rooted in the knot, UM3 the knot on the stem under the head, ID10 (d) florets against the stem" },
      { label: 'UMBEL: SESSILE — pedicel 0 (the florets\' hubs on the knot)',
        path: "UM2 every sessile floret's rooted point inside the knot, ID2 the crossing null where every node is sessile" },
      { label: 'UMBEL: THE SPIDER LILY — 6 florets, head OFF, recurved narrow petals, buckled margin, long upturned stamens',
        path: "UM0 the head's stamens not emitted (the florets carry them), UM1/UM2 the knot and the six roots, JS4 the head emits no stamen, X1/X2 the census on recurved buckled florets" },
      { label: 'UMBEL: x leaves (the stem\'s OWN node law — the shared node is the raceme\'s)',
        path: "LF0/SN0 the leaves on the stem's own node law under an umbel (the shared node is the raceme's), UM3 the knot above them" },
      { label: 'UMBEL: GATED — the umbel controls at their extremes under a RACEME (hidden AND inert)',
        path: "UM0 the head's two statements on a raceme (the head present), ID1 the raceme's nodes untouched by the umbel's count" },
    ],
  },
  {
    n: 79, title: 'the texture edge cap (Oct 23)',
    anchor: 'TEXTURE CAP: PEBBLE x 40 petals x 3 whorls (1,542,832 tris at 0.40 mm — the edge coarsens to the finest rung that fits)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this block adds are the
       budget-derived lattice edge (the bisection between the ruled 0.4 and the
       0.5 cap on real trial builds) and the refusal past the cap. The anchor
       is the corner the ruling is about (lands on 0.41); the subset adds the
       state even 0.5 cannot hold (the declared refusal — XR1 and TX9 on it).
       --conn is REQUIRED for the anchor: a 1.48 M-triangle textured head is
       the heaviest junction the flood fill reads. */
    conn: true,
    rows: [
      { label: 'TEXTURE CAP: past 0.50 mm — 40 x 3 x 40 sepals x 4 tiers x whorled leaves on a 120 mm stem (REFUSED at the cap, told)',
        path: "TX9 the build standing at the cap with fits false against the builder's tally, the read-out saying DOES NOT FIT, XR1 the declared refusal at its count" },
    ],
  },
  {
    n: 80, title: 'surface texture T5 — the hub, the stem and the tube ring (Oct 23)',
    anchor: 'TEXTURE T5: PEBBLE x a 60 mm stem (the hub top, the stem wall, the florist\'s cut)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this block adds are the
       organ lattice (strip quads, re-meshed centre fans, rows), the export
       decision twin (a thin sheet live), the tube ring refined in its own
       coordinates, and the escape-ray visibility with its geodesic fade. The
       anchor is the shipped stem under the shipped hub; the subset adds the
       sphere (its cavity), the closed tube, the thin sheet and the noded stem.
       --conn is REQUIRED: the relief must not open a gap where the hub meets
       the stem (the buried faces stay put — TX11 — and the voxel fill is the
       witness that the union still reads one piece). */
    conn: true,
    rows: [
      { label: 'TEXTURE T5: PEBBLE x the SPHERE head x a stem (its cavity untouched)',
        path: "TX10 the sphere hub's lattice with its inner sphere left as shipped, TX11 the cavity and the stem's root enclosed and unmoved" },
      { label: 'TEXTURE T5: PEBBLE x a closed tube (6 petals, k 0 — the ring refined in its own coordinates)',
        path: "TX10 the ring's own lattice and its own law's normals, TX11 the ring under the petals buried, TX2 the one field on the ring" },
      { label: 'TEXTURE T5: PEBBLE x sheetThickness 0.60 x a stem (the counts decided on the export twin)',
        path: "TX10 the floor taken on the export twin, TX7 the counts live = export, TX11 visibility on the thin hub" },
      { label: "TEXTURE T5: PEBBLE x a noded stem (the flower's 0.48 on 100 x 6 mm, three leaves)",
        path: "TX10 the noded wall's radial normal from its own axis, TX11 the petiole roots buried, ST9 the petioles excused by name" },
      /* Eva's rulings of Oct 25 (the T5 follow-ups): the hub top under the
         petal feet stays smooth (TX12), the fade width is derived (TX13), and
         floret hubs are relieved in the WORLD frame, one shared layer (TX14) */
      { label: 'TEXTURE T5: PEBBLE x a dome (headRise 0.5) x a stem',
        path: "TX12 the cap under the feet covered and unmoved, TX13 the fade width derived from the height and the edge" },
      { label: "TEXTURE T5: PEBBLE x an UMBEL, head ON (the florets' hubs textured, their pedicels smooth)",
        path: "TX14 six floret hubs sampling the one world field (no two the same copy), TX12 each floret hub under its own feet covered" },
    ],
  },
  {
    n: 81, title: 'the mophead — a compound umbel, depth 2 (Oct 24)',
    anchor: 'MOPHEAD: 2 rays x depth 2\'s ruled defaults (12 round four-petal florets a sub-umbel at the floor)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this block adds are the
       compound arm of the inflorescence plan (rays rooted on the main boss,
       each ending in a headless SUB-UMBEL built once and appended per ray),
       the depth-2 floret's FLOOR (derived from the body criterion), the
       REDUCED LATTICE (6 columns, a 2-segment bead) by branch on those florets
       alone, and the BUDGET CLAMP (florets a ray reduced from one floret's
       exact cost). The anchor is two rays (the count's low end); the subset adds the
       dome at the floor, the clamp corner (asked past the budget, built under it), the head ON (the head on the full lattice beside the
       reduced florets) and the GATED depth control under a depth-1 umbel.
       --conn is REQUIRED: every floret roots on a sub-boss on a ray on the
       main boss, and the voxel fill reads all of it — though UM8 is the
       rooting's own witness (the flood fill cannot see a floret rooted in
       nothing when the florets touch each other). */
    conn: true,
    rows: [
      { label: 'MOPHEAD: THE CLAMP CORNER — 12 x 12 florets x 12 petals at 0.60x (asked 3.1 M tris, clamped to the budget, told)',
        path: "UM7 asked 144 florets against the clamp's built count, the bloom's own triangles the record's exact prediction under the budget, the floret priced off the emitted unit, no larger count a ray would have fit; UM6 the reduced lattice on twelve-petal florets; UM8 every built floret rooted in its sub-boss" },
      { label: 'MOPHEAD: THE MOPHEAD — 12 rays x 12 round four-petal florets at the FLORET FLOOR, 12 mm pedicels at 20 deg',
        path: "UM6 the reduced lattice read off the emitted rim of a round four-petal floret at the floor, UM8 144 floret roots each inside its own sub-boss and twelve sub-bosses on their rays, UM9 the floored size restated, UM7 the build under the budget unclamped" },
      { label: 'MOPHEAD: 2 rays x depth 2\'s ruled defaults (12 round four-petal florets a sub-umbel at the floor)',
        path: "UM1 the main boss restated on two rays at their own angle, UM5 the depth's two statements and the ray's headless depth-1 sub-umbel, UM8 two sub-bosses on their rays and twelve roots, UM9 the floor restated from a probe floret's emitted rows, ID1/ID6/ID7 the rays read as the outer pedicels, ID4 the second level's floret identity" },
      { label: 'MOPHEAD: x the head ON (the boss on the stem below it, the reach inset)',
        path: "UM6 the head's petals on the full 10-column, 4-segment lattice while the florets carry 6 / 2, UM0 the head built, UM3 the main boss under the head" },
      { label: 'MOPHEAD: GATED — the depth and the rays at their extremes under depth 1 (hidden AND inert)',
        path: "UM5 the registry and the geometry agree the umbel is NOT compound, and the head petals on the full lattice" },
    ],
  },
  {
    n: 82, title: 'the BONE texture — the one world field under a curvature and a patch mask (Oct 28)',
    anchor: 'BONE: the ruled defaults (the provisional look: 2.0 mm pores, craters 2.5x, 60% in patches, smooth past 1/mm)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this block adds are the
       deferred pass over every part (`boneReliefPass`), the sheets' capture,
       the rods' capture and their curvature decision (on the export twin when
       the floor binds), the hub's cover over the petal AND sepal feet, the
       floret sheets carried into the parent's pass, and the derived owner. The
       anchor is the ruled defaults (the sheets and the hub, the underside
       under the coplanar feet covered); the subset adds the sepals at the
       join's top, the rods relieved at the curvature maximum, the thin sheet
       (the rods decided on the twin), the umbel's florets, the infill refusal
       and a GATED row. --conn is REQUIRED: the relief must not open a gap at
       any join, and the voxel fill is that witness. */
    conn: true,
    rows: [
      { label: 'BONE: x 8 sepals at the join\'s top (their feet cover the hub: the Oct 26 ruling)',
        path: "TX12 the hub under the SEPAL feet as under the petal feet covered and unmoved, TXB2 the law on the sepal sheets, TXB0 the controls" },
      { label: 'BONE: x 12 stamens and the style x boneCurvature max (the rods take the field)',
        path: "TXB7 every rod latticed below the curvature control and none left smooth, TXB2 the one law on the rods, TXB1 outward with the pore floors on the rod's own surface" },
      { label: 'BONE: x 12 stamens and the style (1.2 mm rods: smooth by the curvature mask)',
        path: "TXB7 the rods ridge at every vertex left as shipped and told on the read-out, TXB3 the bead and rims as ridges" },
      { label: 'BONE: x sheetThickness 0.60 x a stem x stamens (every count, the rods\' included, decided on the export twin)',
        path: "TX7 the counts live = export with the rods decided on the export twin, TX10 the organs' floor on the twin" },
      { label: 'BONE: x an UMBEL, head ON (floret petals and hubs in the world frame, the pedicels porous)',
        path: "TXB5 no two florets carry the same relief and the floret petals reach the parent's one pass, TX14 the floret hubs in the world frame, TXB6 the pass reversed the same bloom" },
      { label: 'BONE: x a closed tube (6 petals, k 0)',
        path: "TXB1 the clearance at the hub and the tube ring's shared positions restated (the two shells kept apart in the file — X2 is the witness), TX10 the tube ring's lattice" },
      { label: 'BONE: x the VORONOI infill (refused with the word infill, told)',
        path: "TX6 the texture refused with the word infill and told on the read-out" },
      { label: 'BONE: GATED — the five at their extremes under the retired PEBBLE (hidden AND inert; a saved PEBBLE design builds as before)',
        path: "TX0 the registry and the guard agree, TX2 the retired field restated (BONE's five reach nothing)" },
    ],
  },
  {
    n: 83, title: 'where the nodes go and leaf size along the stem (Bloom P1, Oct 28)',
    anchor: 'NODE RUN: the widest run, 0.05 .. 0.95, under a DROOPING leaf (-30 deg: the start is not raised)',
    /* DERIVED BY THE HEADER'S OWN METHOD: the branches this block adds are the
       run's own law (a start / end other than the defaults, and the solo
       station in a moved span), the UNEVEN arm of the spacing (the linear
       internode law, the count given at the pitch floor), the spacing's MERGE
       clamp, the inverted span, the per-node leaf of a size taper (the builder
       applying a node's own size, on each leaf type), the TOP leaf's inset,
       and the dead side under a raceme. --conn is REQUIRED: every leaf roots
       in the wall at a depth this block moves, and a petiole off its node is a
       detached shell the export gate reads as watertight. */
    conn: true,
    rows: [
      { label: 'NODE RUN: crowded toward the BASE, spacing 0.80 x 6 nodes',
        path: "NS1 six depths on the linear internode law against the restated run and each leaf's emitted root, NS0 the three statements live, NS2 not on the default run, LF4 the inset from the top leaf, ST12 none (no node amount)" },
      { label: 'NODE RUN: a narrow run HIGH on the stem, 0.20 .. 0.40 (the inset raises its start)',
        path: "NS1 the span's own end and the inset clamp raising its start, LF4 the clamp told as a biconditional" },
      { label: 'NODE RUN: START PAST END, 0.70 .. 0.40 x 4 nodes (one node at the end, told — never swapped)',
        path: "NS3 the inverted span told as a biconditional, one node at the end, NS1 that node's depth" },
      { label: "NODE RUN: the spacing's MERGE CLAMP — swelling 0.6 x spacing 1.00 x 7 nodes (CLAMPED at the joint's sqrt(2) half-widths)",
        path: "NS3 the spacing's merge clamp told and every internode at the need, NS1 the clamped spacing restated by a downward search, ST12 the swellings on the emitted stem at the restated nodes" },
      { label: 'NODE RUN: a BARE noded stem — kink 0.5 on a run 0.30 .. 0.90, spacing -0.6 x 5 nodes',
        path: "ST12 a bare stem's kinked rings on the moved, crowded run restated from the controls, NS0 the run live with no leaves" },
      { label: 'NODE RUN: LEAF TAPER 0.5 — COMPOUND (the whole tree scales; the leaflet count does not)',
        path: "NS4 each node's scale restated and every leaflet's and the rachis's emitted chord in the ratio of the scales, the inset at the top leaf, LF14-LF18 per node on the node's own restated controls" },
      { label: 'NODE RUN: LEAF TAPER 0.5 — LOBED (the envelope scales; the lobes and teeth yield per node)',
        path: "NS4 the lobed blade's emitted chord per node, LF19-LF31 per node on the node's own restated envelope" },
      { label: 'NODE RUN: LEAF TAPER 0.75 FLOORED — a 4 mm wide leaf (its width floor holds it at 75%)',
        path: "NS4 the floor restated from the registry's own slider minima and every node at it" },
      { label: 'NODE RUN: GATED — the run, the spacing and the taper under a RACEME (dead: hidden AND inert)',
        path: "NS0 the three statements dead and the plan's run the default, no per-node size, SN0-SN4 the shared node unmoved" },
    ],
  },
];

/* ---------- THE GUARD ------------------------------------------------ */

/* ---------- THE FAMILY ROSTER, READ OUT OF THE ASSERTIONS -------------

   WHY THIS EXISTS. Three blocks below used to name "the families that need a
   witness" as a hand-written sentence — `S1-S4`, `JS1-JS6`, `JG1-JG5`. Two of
   the three were short by one (JS0 and JG0), reported twice and patched by
   hand twice, and the session that added JS6 and JG5 had to remember to edit
   prose in a file it was not otherwise touching. A gate header that
   ENUMERATES something must read it from the thing it enumerates; that is
   this project's own registration rule, and a comment is exactly the copy
   that drifts.

   IT IS NOT COSMETIC. Session 26's elongation floor shipped with no anther
   witness named anywhere, and a stale roster is how that happens again: the
   family exists, every row runs it, and nothing says which row is meant to
   make it fire.

   WHAT A "FAMILY CODE" IS: the tag an assertion pushes ahead of its message —
   `bad.push(`J2: ring ...`)`. The scan is deliberately narrow: an assertion
   SITE, never a mention. A code named in a comment (`J1-J9`, `S4 above`) is
   prose and is not a family; a code named in a `path` field below is a CLAIM
   about a row, checked AGAINST this roster rather than joining it.

   THE INDIRECTIONS IT MUST KNOW ABOUT are `tipClauses(tag, ...)` — session
   26's shared tip clauses — and `tipSevenClauses(tag, ...)` (session 30, the
   descriptor-against-controls statement JS7 and JG6 share); both push under
   a tag their CALLER names. JG5, JS7 and JG6 are pushed nowhere else, so a
   scan that saw only `bad.push` would report them as families the smoke file
   invents. Any future helper of that shape is one more alternative in the
   pattern.

   ===================================================================
   WHAT THIS CENSUS DOES NOT COVER, in its own header, because two of the
   three reasons are correctness rather than scope:

   1. THE `R` NAMESPACE IS OUT, BY NAME. R codes are not the harness's; they
      belong to bloom-crowding.mjs, bloom-plan-coverage.mjs and
      bloom-solid-angle-coverage.mjs, and all THREE own an R1 — the tag is
      qualified in the message (`crowding R1:`, `coverage R1:`, `solid R1:`)
      and the `path` fields above cite a bare `R1`, which names no one
      instrument. Folding them in means qualifying every citation, and it is
      not free: it is recorded here rather than half-done.

   2. AND `R0` IN A `path` IS USUALLY NOT AN ASSERTION AT ALL. "Rd held above
      R0" is the DOME's radius against RING ZERO's — the geometry's own
      notation, in the same string. A claim scanner that took every
      `[A-Z]\d` token would demand a family for it. So claims are read only
      under a prefix the harness actually asserts.

   3. WHETHER A ROW MAKES A FAMILY FIRE. Unchanged, and still hole 5 in this
      file's header: every family runs on every row, so citation is a claim
      about the PATH a
      row engages, not evidence the assertion can catch anything on it. Only
      the mutant table says that, and it cannot be derived. What this census
      buys is narrower and was the actual failure: a family that NOTHING
      claims, and a claim naming a family that does not exist.
   =================================================================== */
const FAMILY_SITE = /bad\.push\(\s*[`'"]([A-Z]{1,3}\d+[a-z]?)\s*:/g;
/* Two helpers of that shape now (session 30 added `tipSevenClauses`, JS7's
   statement shared with JG6): each pushes under the tag its CALLER names. */
const FAMILY_TAGGED = /tip(?:Seven)?Clauses\(\s*[`'"]([A-Z]{1,3}\d+[a-z]?)[`'"]/g;

/* THROWS if the harness cannot be read, or if the scan comes back empty — a
   roster short a whole file, or an assertion shape that moved, must never
   read as a smaller set of families to account for. Takes its source so the
   negative control can hand it a mutated one. */
export function assertionFamilies(src = fs.readFileSync(HARNESS, 'utf8')) {
  const out = new Set();
  for (const re of [FAMILY_SITE, FAMILY_TAGGED]) {
    re.lastIndex = 0;
    for (const m of src.matchAll(re)) out.add(m[1]);
  }
  if (!out.size) throw new Error('bloom-smoke: the family roster came back EMPTY — the assertion shape moved and this census is measuring nothing');
  return out;
}

export const familyPrefix = (code) => code.match(/^[A-Z]+/)[0];

/* Every family code a block CLAIMS, read from its rows' `path` fields, under
   a prefix the roster actually has (see note 2 above). RANGES ARE NOT
   EXPANDED AND MUST NOT BE WRITTEN: `Z1-Z3` names Z1 and Z3 and hides Z2,
   which is how Z2 came to be claimed by a range and cited by nothing. Spell
   them out. */
const CLAIM_CODE = /\b([A-Z]{1,3}\d+[a-z]?)\b/g;
export function familiesClaimed(blocks = SMOKE_BLOCKS, roster = assertionFamilies()) {
  const prefixes = new Set([...roster].map(familyPrefix));
  const out = new Map(); // code -> [{ n, label }]
  for (const b of blocks) {
    for (const r of b.rows) {
      CLAIM_CODE.lastIndex = 0;
      for (const m of String(r.path).matchAll(CLAIM_CODE)) {
        if (!prefixes.has(familyPrefix(m[1]))) continue;
        if (!out.has(m[1])) out.set(m[1], []);
        out.get(m[1]).push({ n: b.n, label: r.label });
      }
    }
  }
  return out;
}

/* buildMatrix()'s own block markers, read from the harness source. ONE
   owner: the frozen-matrices CI job calls this function, it does not
   restate the check. */
export function matrixBlockMarkers(src = fs.readFileSync(HARNESS, 'utf8')) {
  const lines = src.split('\n');
  const from = lines.findIndex((l) => l.includes('export function buildMatrix'));
  const to = lines.findIndex((l, i) => i > from && /^export function phase9Matrix/.test(l));
  if (from < 0 || to < 0) throw new Error('bloom-smoke: cannot locate buildMatrix() in the harness source — the guard cannot read the block markers');
  const out = [];
  for (let i = from; i < to; i++) {
    const m = lines[i].match(/^ {2}\/\* (\d+)\. (.*)$/);
    if (m) out.push({ n: Number(m[1]), title: m[2].replace(/\s+\*\/\s*$/, '').trim().slice(0, 70) });
  }
  return out;
}

/* THROWS on any failure. Every message names the block or the row, because
   a guard that says "coverage changed" sends a reader to the wrong place. */
export function assertSmokeCoverage(matrix = buildMatrix()) {
  const bad = [];
  const markers = matrixBlockMarkers();
  const declared = new Set(SMOKE_BLOCKS.map((b) => b.n));
  const present = new Set(markers.map((m) => m.n));

  /* CLAUSE A — every block in the matrix has at least one smoke row. */
  for (const m of markers) {
    if (!declared.has(m.n)) {
      bad.push(`DRIFT: matrix block ${m.n} (${m.title}) has NO smoke row. Add one to SMOKE_BLOCKS with its path, or the subset has silently narrowed. There is no "why no row" field on purpose.`);
    }
  }
  for (const b of SMOKE_BLOCKS) {
    if (!present.has(b.n)) bad.push(`DRIFT: SMOKE_BLOCKS declares block ${b.n}, which buildMatrix() no longer has. A removed block is a removed claim — delete the entry deliberately.`);
  }

  /* CLAUSE B — anchors resolve, are ordered, and each smoke row is inside
     its own block's range. */
  const idxOf = new Map();
  matrix.forEach((r, i) => { if (!idxOf.has(r.label)) idxOf.set(r.label, i); });

  const ordered = SMOKE_BLOCKS.filter((b) => present.has(b.n)).slice().sort((a, b) => a.n - b.n);
  const anchors = [];
  for (const b of ordered) {
    const i = idxOf.get(b.anchor);
    if (i === undefined) {
      bad.push(`DRIFT: block ${b.n}'s anchor row is not in the matrix any more: "${b.anchor}". The anchor is the block's FIRST row — re-read buildMatrix() and update it.`);
    }
    anchors.push({ n: b.n, i });
  }
  if (anchors.every((a) => a.i !== undefined)) {
    if (anchors.length && anchors[0].i !== 0) bad.push(`DRIFT: block ${anchors[0].n}'s anchor sits at row ${anchors[0].i}, not row 0 — the first declared block must start the matrix.`);
    for (let k = 1; k < anchors.length; k++) {
      if (!(anchors[k].i > anchors[k - 1].i)) bad.push(`DRIFT: anchors out of order — block ${anchors[k].n} at row ${anchors[k].i} does not follow block ${anchors[k - 1].n} at row ${anchors[k - 1].i}. Block ranges cannot be derived.`);
    }
    for (let k = 0; k < ordered.length; k++) {
      const lo = anchors[k].i, hi = k + 1 < anchors.length ? anchors[k + 1].i : matrix.length;
      for (const r of ordered[k].rows) {
        const i = idxOf.get(r.label);
        if (i === undefined) { bad.push(`DRIFT: smoke row not in the matrix: "${r.label}" (declared for block ${ordered[k].n}). A renamed row is a row this subset stopped covering.`); continue; }
        if (i < lo || i >= hi) bad.push(`DRIFT: smoke row "${r.label}" sits at matrix row ${i}, outside block ${ordered[k].n}'s range [${lo}, ${hi}) — it is declared for a block it is not in.`);
      }
    }
  }

  /* CLAUSE C — THE FAMILY CENSUS, A BICONDITIONAL (session 3a). Both
     directions, because they are different failures with different causes:

       C1  every family the harness ASSERTS is claimed by some row's `path`.
           This is the one that was failing: JS0 and JG0 were asserted and
           named nowhere, because the sentence that enumerated them was
           written by hand as a RANGE. It also caught C3, J2 and Z2, which
           nobody had reported at all — Z2 because `Z1-Z3` in a path reads as
           two codes and hides the middle one.
       C2  every family a `path` CLAIMS is one the harness has. A renamed or
           deleted family leaves its citations standing, and a citation that
           names nothing is a subset claiming coverage it lost.

     NO ESCAPE HATCH, on clause A's own precedent: there is no "this family
     needs no row" field. A family the subset genuinely cannot witness is a
     hole, and naming it in a row's `path` beside the row that comes nearest
     is the honest record of that — not a suppression flag nobody re-reads. */
  const roster = assertionFamilies();
  const claimed = familiesClaimed(SMOKE_BLOCKS, roster);
  for (const code of [...roster].sort()) {
    if (!claimed.has(code)) {
      bad.push(`DRIFT: assertion family ${code} is asserted in tools/bloom-harness.mjs and claimed by NO smoke row. Name it in the \`path\` of the row that engages it — and spell it out: a range like "${familyPrefix(code)}1-${familyPrefix(code)}9" names two codes and hides the rest.`);
    }
  }
  for (const [code, where] of [...claimed].sort()) {
    if (!roster.has(code)) {
      bad.push(`DRIFT: smoke row "${where[0].label}" (block ${where[0].n}) claims assertion family ${code}, which tools/bloom-harness.mjs does not assert. A renamed family leaves its citation behind, and a citation naming nothing is coverage this subset no longer has.`);
    }
  }

  if (bad.length) throw new Error(`bloom-smoke: the smoke subset no longer covers the matrix.\n  ${bad.join('\n  ')}`);
  return { blocks: markers.length, rows: SMOKE_BLOCKS.reduce((n, b) => n + b.rows.length, 0), matrixRows: matrix.length,
           families: roster.size, claimed: claimed.size };
}

/* THE GUARD RUNS AT MODULE LOAD, on verifySections()'s own precedent: every
   consumer gets it checked for free and nobody has to remember to call it. */
const COVERAGE = assertSmokeCoverage();

export const SMOKE_LABELS = SMOKE_BLOCKS.flatMap((b) => b.rows.map((r) => r.label));

/* The gates take a regex over the LABEL. Escaped, anchored, exact — a
   loose pattern silently runs the wrong rows, which is how a subset stops
   being the subset it names. */
export const SMOKE_REGEX = `^(?:${SMOKE_LABELS.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`;

/* ---------- CLI ------------------------------------------------------ */

function banner(withConn) {
  console.log('=================================================================');
  console.log(`SMOKE SUBSET — ${COVERAGE.rows} of ${COVERAGE.matrixRows} rows, ${COVERAGE.blocks} matrix blocks covered.`);
  console.log(`${COVERAGE.families} assertion families in the harness, all ${COVERAGE.claimed} claimed by a row (read from the assertion sites, never written down).`);
  console.log('FOR ITERATION, NOT FOR MERGE. This is NOT a pass of the matrix.');
  console.log(`Gates: export${withConn ? ' + connectedness' : ' ONLY (--conn adds the flood fill; REQUIRED for a new geometry mode)'}`);
  console.log('Blind to: every matrix-level claim, the rows it does not run, byte');
  console.log('movement, and — the half the census CANNOT check — whether any of');
  console.log('these rows makes a family FIRE. Re-run the mutant table when an');
  console.log('assertion family is added. See this file\'s header, hole 5.');
  console.log('=================================================================\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes('--check')) {
    console.log(`bloom-smoke: coverage OK — ${COVERAGE.rows} smoke rows over ${COVERAGE.blocks} matrix blocks of ${COVERAGE.matrixRows} rows.`);
    console.log(`bloom-smoke: family census OK — ${COVERAGE.families} families asserted in tools/bloom-harness.mjs, ${COVERAGE.claimed} claimed by a row's path, both directions: ${[...assertionFamilies()].sort().join(' ')}`);
    if (argv.includes('--negative-control')) {
      /* THE GUARD'S OWN POSITIVE CONTROL. CLAUSE C reads a roster out of the
         harness source, so the honest mutation is to the SOURCE it reads: an
         assertion family renamed to one nothing claims. Both directions must
         fire from one mutation — the old code becomes uncited, the new one is
         claimed by nothing — which is exactly the pair of failures the clause
         exists for. A guard whose message is never seen is a guard nobody can
         trust; this prints it. */
      const mutated = fs.readFileSync(HARNESS, 'utf8').split('`JS5:').join('`JS99:').split("'JS5:").join("'JS99:");
      const before = assertionFamilies();
      const after = assertionFamilies(mutated);
      if (after.has('JS5') || !after.has('JS99')) {
        console.error('NEGATIVE CONTROL: the mutation did not apply — JS5 is still in the roster, or JS99 is not. The assertion shape moved and this control is measuring nothing.');
        process.exit(1);
      }
      const claimed = familiesClaimed(SMOKE_BLOCKS, after);
      const orphaned = [...after].filter((c) => !claimed.has(c));
      const dangling = [...claimed.keys()].filter((c) => !after.has(c));
      if (!orphaned.includes('JS99') || !dangling.includes('JS5')) {
        console.error(`NEGATIVE CONTROL: FAILED — renaming JS5 to JS99 left the census silent. Uncited: [${orphaned.join(' ')}]; claimed-but-absent: [${dangling.join(' ')}]. Both must name the rename.`);
        process.exit(1);
      }
      console.log(`bloom-smoke: NEGATIVE CONTROL PASS — with JS5 renamed to JS99 in the harness source, the census reports JS99 asserted and claimed by nothing, and JS5 claimed by ${claimed.get('JS5').length} row(s) and asserted by nothing. ${before.size} families before, ${after.size} after.`);
    }
    process.exit(0);
  }
  if (argv.includes('--list')) {
    banner(false);
    for (const b of SMOKE_BLOCKS) for (const r of b.rows) console.log(`  block ${String(b.n).padStart(2)}  ${r.label}\n            ^ ${r.path}\n`);
    process.exit(0);
  }
  const withConn = argv.includes('--conn');
  banner(withConn);
  const gates = ['tools/verify-bloom-export.mjs', ...(withConn ? ['tools/verify-bloom-connectedness.mjs'] : [])];
  let failed = false;
  for (const g of gates) {
    const t = Date.now();
    const r = spawnSync(process.execPath, [g, '--only', SMOKE_REGEX], { cwd: ROOT, stdio: 'inherit' });
    console.log(`\n^ ${g} on the smoke subset: ${Math.round((Date.now() - t) / 1000)}s\n`);
    if (r.status !== 0) failed = true;
  }
  console.log(failed
    ? 'SMOKE: FAILED — fix it, then run the full matrix before quoting anything.'
    : `SMOKE: clean. This is NOT a matrix pass — the full ${buildMatrix().length} rows on both gates, in CI, is the merge criterion.`);
  process.exit(failed ? 1 : 0);
}
