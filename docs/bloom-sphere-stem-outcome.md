# The sphere's stem — omitting the petals the stem would pass through

**The ruling this is built on** (Eva, following session 43's Phase A): *PETALS WHOSE
GEOMETRY WOULD COLLIDE WITH THE STEM ARE NOT BUILT.* The sphere's sequence, its
equal-area law, its golden angle and its existing one-step reservation all stay exactly
as they are. Nothing is re-placed.

Session 43 shipped the stem on the hub and left SPHERE refusing one, with a TODO naming
this ruling. This is that PR.

---

## 1. What was already measured, and is not re-derived here

Session 43's Phase A (§4 of `docs/bloom-session-43-outcome.md`) measured the mechanism
Eva rejected and the one she ruled for. Carried forward, not re-taken:

* Blades reach the axis at **exactly 0.00 mm** clear radius at the far pole, and 0.46 to
  2.79 mm below it. A stem cannot pass at any parameter value.
* Growing `dome.reserved` **does not work**: it moves FEET, not BLADES. Going from no
  stem to ANY stem costs 46–51°, and going from a 3 mm stem to a 12 mm one a further
  5–8 — so the reservation cannot be derived from the stem radius, which was the
  premise. `S3` clause (b) forbids the bald cap by name. **Do not revisit it.**
* Omitting the nearest petals clears it: **2 of 8 gives 7.614 mm, 6 of 40 gives 3.933
  mm.** This session's rig reproduces both exactly (§2), through a different
  instrument, which is the corroboration worth having.
* The JOIN itself is the easiest in the generator — the far-pole surface already points
  downward. The channel was the only problem.

## 2. The rig, and it reproduces session 43's numbers

`petalFreeStemApproachMm(state, ring, slot, cap, plan, exportMode)` in
`bloom-geometry.js` builds ONE petal — with the SHIPPED builder, into a throwaway
accumulator — and measures the minimum distance from any emitted vertex to the stem
solid. Nothing re-derives a petal's surface: a second producer would agree with a broken
surface by being broken alongside it (session 43's ST2, session 41's L7). The geometry
does not depend on accumulator STATE (`floorThickness` returns a pure function of its
argument), so a petal built into a probe is the same petal, float for float.

MODE: both. SAMPLING: every emitted vertex of every slot.

| state | stem | omitted | nearest KEPT |
|---|---|---|---|
| sphere, 8 petals (the shipping sphere) | 3 mm | 2 (slots 0–1) | 6.137 mm |
| " | 6 mm | 2 (slots 0–1) | 4.645 mm |
| " | 12 mm | 2 (slots 0–1) | 1.677 mm |
| sphere, 40 × 1 | 3 mm | 6 (slots 0–5) | 2.433 mm |
| " | 6 mm | 7 (slots 0–6) | 4.061 mm |
| " | 12 mm | 7 (slots 0–6) | 1.061 mm |
| sphere, 40 × 6 (240 feet) | 3 mm | 18 | 1.548 mm |
| " | 6 mm | 19 | 1.134 mm |
| " | 12 mm | 22 | 1.229 mm |

Session 43 measured the CLEAR RADIUS below the pole; this measures the distance to the
stem SOLID, which is the clear radius less the stem's own radius. **6 of 40 at a 3 mm
stem reads 2.433 mm here and 2.433 + 1.500 = 3.933 mm there — the same number to four
decimals, from an instrument that shares no code with it.**

## 3. The five conditions, and how each is met

**(1) NOT BUILT, IN BOTH MODES.** The set is the union of the two modes' colliding sets,
so it is the same set in both by the symmetry of a union — LIVE and EXPORT show the same
flower — and every petal that IS built clears the stem in the mode it was built in, which
is what makes ST7's and ST9's claims unconditional. Which petals EXIST is topology, and
this project has refused a mode-dependent topology four times before (session 32's
ladder, session 38's seam step, the fringe's count threshold, session 42's lamina).

**(2) FILTER, DO NOT RENUMBER.** `buildWhorlInto` still runs every slot 0..K−1 and still
hands each one the azimuth its own index earns. The omission is a membership test inside
the `blade` callback; `petals` keeps ONE ENTRY PER DESCRIPTOR with a null where none was
built, so the four index-matched metrics arrays (`petalRingSpine`, `petalRingRootRows`,
`petalRingFootFrames`, `petalRingApplied` — J1's, Z2's and Z6's own inputs) still line up
with `fr.rings`. **ST8 is the witness**, against a STEMLESS build of the same state on
the same page.

**(3) THE HUB IS SIZED FROM THE REQUESTED COUNT.** `footRing()`'s area rule runs before
any of this and never sees the omission — by construction, not by care. ST6 and ST8 both
assert the hub radius and thickness are identical to the stemless build's.

**(4) THE CRITERION IS THE PETAL'S GEOMETRY.** Every emitted vertex of the whole petal,
foot rows and blade rows alike — not the foot, and not a proxy.

**(5) THE CRITERION IS THE STEM'S ACTUAL SOLID.** A cylinder of the stem's own radius
running from the hub's underside to the tip, so a petal well below the pole does not
collide with a short stem. **At `stemLength` 0 there is no stem, so `stemOmission`
returns null and nothing is omitted** — the feature is inert by branch, and every sphere
row that shipped before this session is bit-identical.

## 4. Three decisions the ruling did not make, and the measurements behind them

### 4a. THE SOLID TESTED IS THE *FREE* STEM, never the root band above it

The stem is rooted THROUGH the hub, so its top band is inside the hub's material — where
the design already puts the stem and the flower in the same place on purpose, exactly as
every stamen and the style do. Including it reports a by-design overlap as a collision.

### 4b. THE CHANNEL IS THE SPHERE'S AND ONLY THE SPHERE'S, and that is measured

On a flat or cap head the stem leaves the hub's UNDERSIDE and every foot sits on the
opposite face. Measured on this tree, a flat head with the widest stem: **all 8 feet read
0.000 mm from the free stem**, because a foot's bottom skin is COPLANAR with the hub's
underside, which is exactly where the free stem begins. The measure is degenerate there
by construction, and a criterion applied there would empty an ordinary bloom. On a sphere
the stem leaves a POLE THE SEQUENCE RUNS THROUGH, and footRing's own law sends every
blade toward that pole.

### 4c. THE CLEARANCE IS `MIN_FEATURE_MM`, DERIVED FROM A LENGTH

`STEM_PETAL_CLEARANCE_MM = MIN_FEATURE_MM` — this project's one owner of the MINIMUM
PRINTABLE GAP, the bar V5 holds self-approach at. A petal nearer than that to the stem
leaves a gap no process can make. It is a DECLARED GUESS like every floor in this file
(§18b of the session-32 doc: nothing here has ever been printed), and it is not weakened
for being one.

## 5. The hub-to-stem join is INERT on a sphere, BY DECLARATION, and told

`stemJoinThickness` equates the stem's section modulus with a **PLATE's** per-circumference
one. A closed spherical shell is not a plate — it carries a root hole in membrane rather
than in bending — and `buildHubInto`'s sphere arm emits a wall of exactly `t` all the way
round and reads no join at all. So `stemPlan` returns `joinT = hubT` there and declares
`joinReason: 'shell'`; the read-out says *"INERT — the head is a closed SPHERE, whose wall
is 1.20 mm all the way round; the join is DERIVED for a PLATE and a shell carries a root
hole differently, so it is not applied here (told, not silent)"*. A plan declaring a
thickening nobody builds would be describing geometry that does not exist, and *"a 12 mm
stem asks for no more than the hub's own 1.20 mm"* — the pre-existing inert sentence — is
false of a 12 mm stem. Deriving a shell join is its own session.

**AND THIS IS THE FIRST ROW IN THIS PROJECT EVER TO REACH ST5's INERT ARM.** The thinnest
stem on the shipping sheet already asks for 1.299 mm against the hub's 1.200, so every row
that has ever carried a stem carried an ACTIVE join — and the harness's expected blend
radius for an inert join was `outerR` while the builder reports 0, which would have fired
on the first inert row anyone built. Corrected in the same commit, with the reason.

## 6. A BARE HEAD IS REACHABLE, AND IT IS TOLD RATHER THAN REFUSED

A 12 mm stem on the smallest sphere takes every petal: **3 asked, 0 built** at
`petalCount` 3 × `spread` 0.6. The bloom is a sphere on a stick. That follows
`stemJoinBlendRadius`'s own precedent — *"a stem at or past the hub's own radius makes
the whole hub the join, which is told rather than refused"* — and the read-out says
`NOTHING IS LEFT — this stem is wider than the head has room for, told rather than
refused.` It is a matrix row (block 32), so every family indexed by descriptor is
exercised with ZERO petals built.

## 7. CLAMPED AND TOLD, on the control and in the read-out

* **On the control**: `petalCount`'s own read-out reads `40 asked — 33 BUILT, 7 not (the
  stem passes through them; see STEM CHANNEL)`. The count is the OWNER's (the builder's
  `stemOmission` record, which joins the `shown` record beside the buckle's clamp, the
  lobes' two caps and the fringe's ceiling — the same mechanism, for the same reason).
* **In the read-out**: a `STEM CHANNEL` line under `STEM` names the built and asked
  counts, the slots as RUNS, the clearance, the fact that the sequence is untouched, and
  the nearest petal that was kept. With no stem it is absent; with a stem and nothing
  omitted it says so with the headroom.
* **The ARRANGEMENT line** carries the two counts too, because a bloom reporting
  "petals 240" while 218 are on it would be the panel's own headline lying.

## 8. What is asserted, and what each clause cannot see

* **ST0 is RE-DERIVED, not relaxed.** It used to read the ELIGIBILITY predicate — *may
  this state have a stem* — and nothing refuses one any more, so `stemEligible` is
  retired on BOTH sides (it is a predicate, not a control id, so `RETIRED_IDS` does not
  apply). What is left is the PRESENCE relation, which at `stemLength` 0 is the retired
  clause term for term: the registry hides the DIAMETER exactly where the geometry builds
  no stem.
* **ST7 — the omission is the stem's own, in both directions.** Every omitted slot
  collides in at least one mode; every built slot clears the printable gap in BOTH; the
  omitted set IS the union of the two per-mode lists; the clearance is `MIN_FEATURE_MM`;
  the counts add up. *It reads the channel's own report*, so a criterion measuring the
  wrong thing would agree with itself — which is why ST9 exists.
* **ST8 — it is a MASK.** Against a STEMLESS build of the same state: every slot keeps
  its azimuth, every SURVIVING petal keeps its foot digest at its own slot index, the
  descriptor count is unchanged, the hub is unchanged, and the nulls are EXACTLY the
  declared set in both directions. A bloom whose petals all moved one place round passes
  every STL check ever written here; this is the only thing that could say so.
* **ST9 — the channel is clear in the file that will be printed.** It reads the EXPORTED
  STL: no vertex lies within the printable gap of the free stem except the stem's own,
  which stand at its outer or bore radius exactly. The cylinder is found in the FILE and
  the CONTROLS — `buildStemInto` emits three rings at the outer radius, and the free stem
  is the one running `stemLength` below the middle of them — never in the plan, and the
  clause refuses to claim anything if that identity does not hold.

**DECLARED BLINDNESS, stated rather than left to be found.** Nothing asserts that the
region tested is the FREE stem rather than the whole one: a criterion that included the
root band would omit MORE petals, and ST7 (which reads the criterion's own approaches),
ST8 (which compares survivors) and ST9 (which only asks whether a kept petal is in the
channel) would all stay green. That choice is pinned by the measurement in §4b and by
this paragraph, not by a clause.

**AND THE SUB-MESH CHORD.** The criterion and ST9 both measure emitted VERTICES. A chord
between two cleared vertices can dip nearer than either — distance to a convex set is
convex along a segment — by at most the mesh's own chord scale. They share the population,
so they cannot disagree; the bound is named rather than absorbed into the bar.

## 9. Verification

### 9a. The byte partition, predeclared from the builder's own record

`node tools/verify-bloom-sphere-stem-bytes.mjs --base <worktree> [--control] [--only re]`

**A row moves iff the builder reports a stem channel on it** — a stem present on a
sphere, which is the only thing on this branch that can move a byte — rather than from
the control set (session 41's discipline).

**CLAUSE 2 IS THE ONE THIS FEATURE IS ABOUT**, and it is the strongest claim available:
on every mover, the branch's stream must be EXACTLY the base's with the omitted petals'
triangle blocks deleted and the stem's own triangles appended after the hub, float for
float under `Object.is`. If any SURVIVING petal moved, the omission renumbered or
re-placed something; if the HUB moved, it was sized from the survivors. The blocks are
located from the BASE tree's own per-petal triangle counts, built one at a time on its
own module through its own whorl primitive, and the tool REFUSES rather than guesses if
those counts do not add up to the stream it is slicing.

### 9b. FOUR RESIDUALS WERE COMPUTED ON SLOT 0 BECAUSE SLOT 0 ALWAYS EXISTED

`buildPetalInto` carries four one-petal checks — the flat-form guard residual, the
uniform-thickness guard residual, the curl integrator's residual and the flat-dome frame
residual — and every one of them was gated on `slot.index === 0`. They are checks of a
LAW rather than of a petal, and slot 0 was simply the petal that was always there.

**On a sphere the stem takes the pole-most slots, and slot 0 is the FIRST to go.** So all
four went absent, and the form and thickness families reported their guard residual as
NOT MEASURED on rows that were perfectly well built. `representative` is the fix — the
caller names the first slot actually built, and `undefined` keeps `slot.index === 0` for
every caller that does not, so nothing moves anywhere else. Telemetry only; the byte
partition is what says so.

**THE GATE NAMED IT EXACTLY, WHICH IS #220 EARNING ITS KEEP.** The summary line read
`9 attempted · 1 reached the results · 8 DROPPED by a validity assertion — NOT a pass`,
the row census named all eight, and the block above named the clause. Before #220 that
run's tail would have read `1/1 watertight`.

**AND ST9's FIRST REGION INCLUDED THE HUB.** The stem is rooted THROUGH the hub, so the
two share their boundary by construction, and on a sphere the hub's own far-pole apex sits
at EXACTLY `rootZ`, on the axis — distance 0 from the channel. Measured: 288 to 1488
vertices on every sphere-stem row, all of them the hub's south apex fan and the ring just
above it. The region excludes the hub's own outer surface now, derived from the file and
one other clause's owner: on a sphere `footRing` puts the centre at exactly 0 (S4 is what
says so), so the outer surface is a sphere of radius `-rootZ` and "below the hub" at plan
radius r is `z < -sqrt(Rout² - r²)`. **That is the clause finding a real property of the
solid rather than a defect — and it is the only reason to trust it when it reads zero.**

**AND THE CROWDING RASTER COUNTED FEET THAT WERE NOT BUILT.** `readFeet` builds its foot
list from `footRing()`'s rings — all K of them — while `crowding R3` compares that list
against the builder's own `petalsBuilt`, and `R4` wants a representative petal per
descriptor. Both fire on every sphere with a stem. The list is filtered by the builder's
own omitted set now, which is also the correct measurement: a foot that was never built is
not on the base, so counting it would report crowding that is not there.

**AND THE SOLID-ANGLE CENSUS EMITTED THE PETALS THE BUILDER DID NOT.** R1 exists because
that instrument counts the parts through a THIRD accumulator that EMITS, so it sees the
builder's own orchestration — and the omission is part of the orchestration. Unmasked it
read `solid R1: petals-only (18848) + hub-only (6720) + centre-only (576) = 26144, but a
whole-bloom build has 21432`, `solid R2: captured 8 petals but builtFull.petalsBuilt is 6`,
and an `solid R3` for every omitted slot. It reads the builder's own omitted set now. **The
PLAN raster needed nothing** — it returns on a sphere before a petal is built, which is
session 18's own labelled skip doing a second job.

**THE SHAPE OF ALL FOUR.** Every one is an instrument that assumed a slot always carries a
petal, and every one was found by the gate rather than by reading the code. The omission is
the first thing in this generator that can make a declared slot empty, and what that costs
is exactly this list — four places that had no reason to be written any other way.

### 9c. The matrix, the census and the gates

* **The live matrix goes 736 -> 744.** Nine rows added (block 32), one removed (block 30's
  `STEM: GATED — SPHERE`, which is no longer gated). **`frozen/phase29` is the 736 rows at
  `5f9c0c7`**, registered in BOTH `FROZEN_MATRICES` and `FROZEN_BASE_COMMITS`, and
  `--verify-frozen --phase29` is deep-equal to that commit's own `buildMatrix()`, row for
  row. (It went red first: the snapshot was written from `{label, set}` and dropped the
  eleven rows' `capability` field — the check doing its job in 24 seconds.)
* **Smoke census: 28 matrix blocks** (the block count rose, which is session 34's trap
  avoided) **and 80 families, both directions**, ST7/ST8/ST9 among them.
* **The self-intersection census on all nine block-32 rows, EXPORT:** eight read exactly
  **0** within-shell pairs. The ninth — the 240-foot head — reads **199 pairs, worst span
  0.2394 mm at (0.13, 2.72, 33.21)**, and that is **the HEAD's fold at the FACE pole, not
  the stem's**: the identical state at `stemLength` 0 reads the same 199 pairs at the same
  point, and so does a worktree of main with and without a stem asked for. Four readings,
  one number. Declared in `SELF_INTERSECTION_XFAIL` with that tag. The far pole, which is
  where the stem is, is clean on every row.
* **`ALL MAX` IS UNMOVED, AND THAT TOOK A DELIBERATE DERIVATION.** Retiring `stemEligible`
  took `stemDiameter` out of `PLACEMENT_SUBS` (its predicate no longer reaches `placement`
  through `sphereMode`), which would have let block 1 sweep it at length 0 — a row naming
  a control that did nothing, #124's trap from a SEVENTH direction — and let the blanket
  corners hand it 12 mm, moving `ALL MAX` as a SIDE EFFECT of retiring a predicate.
  `STEM_SUB_IDS` is the CURL_SUBS derivation applied to it: a slider hidden at DEFAULTS
  because its GUARD is at 0. Measured: `ALL MAX` carries the identical control set on both
  trees and builds **2,412,512 triangles in both modes on both**, so its declared
  export-refusal entry stands unchanged.
* **THE FEATURE REMOVES TRIANGLES.** The default sphere goes 25,568 -> 21,432 with a
  60 x 6 mm stem (six petals instead of eight, plus 576 stem triangles); the 240-foot head
  goes 572,160 -> 527,972.

### 9d. Cost, measured and reported

The channel costs **two petal builds per slot, on a sphere with a stem, and nothing at all
anywhere else** — the branch is the guard. Measured on this tree, EXPORT:

| | whole bloom, no stem | with the channel |
|---|---|---|
| the default sphere (8 petals) | 90 ms | ~240 ms |
| 40 x 1 | 422 ms | ~1.0 s |
| 40 x 6 (240 feet) | 2.85 s | 7.4 s |

Two ways to halve it are costed and deliberately not built in a PR this size: absorbing
the matching-mode probe into the real accumulator (which needs a `MeshBuilder` that can
take another's positions), and a cheap reach envelope that skips petals nowhere near the
pole. **And the union has not yet had to do anything**: swept over 456 reachable states
(6 petal counts x 4 sheet thicknesses x 19 diameters) the two modes omit the SAME set
every time. It is still the right construction — the boundary is a slider position away,
and an assertion that can fail is worse than a construction that cannot — but a session
that removes it owes this measurement again.

## 10. What this session did NOT do

* **It did not grow `dome.reserved`, touch S3, or change the equal-area placement law.**
  Session 43 Phase A measured that mechanism and it does not work; §1 carries the numbers.
* **It did not renumber a slot**, change the hub, the hub-to-stem join's derivation, the
  stem's controls or its bore rule, or move `STEM_MIN_WALL_MM`, `MIN_FEATURE_MM` or
  `SHEET_THICKNESS_MM`.
* **It did not derive a hub-to-stem join for a SHELL.** That is a different derivation —
  membrane rather than plate bending — and it is its own session. Today the join is inert
  on a sphere and the read-out says why.
* **It did not build stem curvature, droop, nodes, taper or branches.**
* **It did not touch the fringe, the cut law, the coverage arc, the demand table,
  `bladeStations`, the ladder's ownership, `HELD_ROWS`, `CURL_START_MIN` or `trimPanels`.**
