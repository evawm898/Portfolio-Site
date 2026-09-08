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
   zygoAssertions (Z1-Z9), exportFloorAssertion, applyCapability,
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
        path: 'the shipping state; every guard OFF at once — petalFormIsFlat, domeIsFlat, thicknessIsUniform, curlIsUniform, one whorl, RADIAL, the bare apex (the centre rig is retired, session 20)' },
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
    ],
  },
  {
    n: 5,
    anchor: 'FORM: QUILL (roll alone, toward a tube)',
    rows: [
      { label: 'FORM: FIDDLEHEAD (spine curl alone)',
        path: 'uniform spine curl — the closed-form arc branch, C2\'s only witness (the integrator\'s own validity), and C3\'s UNIFORM arm: the shipped arc is never clamped and must never report the floor binding' },
      { label: 'FORM: ROLL CLAMP (roll max x narrowest petal)',
        path: 'cross-section roll and the roll curvature floor, saturating and told' },
      { label: 'THIN: ALL THIN × spread min',
        path: 'the thickness layer, the export feature-size floor diverging from live, and the foot-hub overlap box at its worst reachable corner' },
      { label: 'APEX: broad end (max) — the cap now converges to it, it does not square off',
        path: 'the unconditional cap at its widest terminal: A1 (the cap never widens), A2 (the last emitted row IS the terminus), A3 (never a true apex) and A4 (the terminal rebuilt from the state and the mode floor) all read a NON-default terminal here, which is what makes this the row that would catch a cap that only works at the identity' },
      { label: 'APEX: a ROUNDED TRUNCATE — the poppy, and the state no shipped control could reach',
        path: 'both apex controls off their identities at once: A6 (the cap built at the exponent the effective state asks for — the only witness for a shape silently held at 1, which passes A1-A5 on every row) and A5 (the apex narrows monotonically — the retired TIP_PLATEAU\'s waist, which both STL gates are blind to)' },
      { label: 'APEX: SPATULATE — narrow base (taper 3/0.6, widest at 0.83) × broad end',
        path: 'A5 on the silhouette that most nearly reproduces the retired term\'s shape by legitimate means: the widest point at a/(a+b) = 0.833 with a broad terminal, which must narrow monotonically where the retired construction waisted and widened back out' },
    ],
  },
  {
    n: 6,
    anchor: 'CAPABILITY: claw (non-monotone width)',
    rows: [
      { label: 'CAPABILITY: cleft (two-span domain)',
        path: 'the trim domain with two spans per row — the panel-per-span construction, reached only through window.__bloomCapability' },
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
        path: 'layer roles (roleForLayer) — Z1, Z2, Z3 and Z6, one role spanning more than one whorl (spelled out: written as a range, this line named Z1 and Z3 and hid Z2 from every reader and from the census)' },
    ],
  },
  {
    n: 12,
    anchor: 'SLOT: labellumSize min (0.5) x 2 whorls in step',
    rows: [
      { label: 'ORCHID: the labellum and the hood (the flower has a face) x 2 whorls in step',
        path: 'slot roles and the mirror plane (roleForSlot) — Z4a, Z4b and Z5\'s conditional collapse' },
    ],
  },
  {
    n: 13,
    anchor: 'FAN: defaults (3/side, a mirror-line petal, 45deg)',
    rows: [
      { label: 'FAN x PER-PETAL: petal 1 extreme x toggle OFF (the same sliders now drive the INNER PAIR)',
        path: 'the FAN arm and the per-petal orbits on the fixed-point-free involution — J7 (the arc and the notch), Z7, Z8, Z9' },
    ],
  },
  {
    n: 16,
    anchor: 'ALL PETALS: max (curl +360, cup +1.20, tip +0.60)',
    rows: [
      { label: 'ALL PETALS: max x every base at max (curl 360+360, cup 1.2+1.2, tip 0.6+0.6 — every clamp binds)',
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
