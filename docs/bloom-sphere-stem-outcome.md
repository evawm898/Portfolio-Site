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
**AND THE PANEL ROUTE SHIPPED FIRED-BUT-NOT-REQUIRED.** `--negative-control` freezes the
read-out, and route (w)'s clauses fire there on all five of its states — but the run's
COMPLETENESS CHECK is a hand-written list of flags, route (w) was not on it, and the summary
therefore printed `ALL FIFTEEN ROUTES … OBSERVED THE FAILURE` while the channel's two lines
could have been looked at by nothing at all. A route that fires and is not required is a route
that can go silent without the gate noticing. Both lines are required now (`sawChannel`,
`sawPacking`), named separately because they are two read-out lines with two owners and a fix
for one is no evidence about the other, and the summary says SIXTEEN. Found by reading the
negative control's own output rather than by a failure.

* **Panel route (w)** — **`(w)` and not `(t)`: `(t)` is session 29's ANTHER'S SEVEN, and this
  route shipped under the same letter until the sweep caught it. Two routes under one letter
  makes "route (t) passed" say nothing about which one, which is the entire point of naming
  them; c, u, w, x, y, z were free.** It asserts both places in BOTH DIRECTIONS against the builder's own
  record — the line and the control's value where there is a channel, and neither where
  there is not. The inert direction is the load-bearing one: at `stemLength` 0 there is
  no channel, no omission and no line, which is the branch that keeps every sphere row
  byte-identical, and a route that only ever drove the stem ON could not see it come
  undone. `--negative-control` freezes the read-out so neither line can appear.

## 7b. THE MERIDIAN PACKING MARGIN — told, and EXACTLY EXHAUSTED at one corner

The brief named this as a separate clamp-and-tell: *"the meridian packing margin (1.005 at
8 petals, largest stem) is a separate clamp-and-tell. Do not let it pass silently."*

**WHAT SHIPPED IS A QUANTITY WITH ONE DEFINITION, STATED WHERE IT IS COMPUTED.**
`meridianPacking()` in `bloom-geometry.js` is its one owner. The stem's footprint on the
closed sphere is the cap where the sphere's own cylindrical radius equals the stem's outer
radius, so the cap's edge stands at polar angle `π − asin(min(1, R/Rd))` and at meridian
arc `Rd ·` that, measured from the FACE pole exactly as `footRing()` measures every ring's
own `arc`. A foot lands ON its ring circle and runs INWARD by its own `overhang` — the
length it occupies along that same meridian. So

```
clearMm = (the cap edge's arc) − (the pole-most SURVIVING foot's arc)
margin  = clearMm / that foot's own overhang
```

is how many of its OWN lengths of clear meridian the base has left on the stem's side.
Below 1 the arc the stem leaves is shorter than the single foot standing next to it: the
meridian is spent, and no petal could be put back there whatever a placement law did.
**It is a length over a length**, and neither side is a row count (this project's first
durable rule).

**MEASURED, EXPORT, the shipped sphere at one turn, `petalCount` × `stemDiameter`:**

| stem Ø (mm) | 3 | 4 | 6 | 8 | 10 | 12 |
|---|---|---|---|---|---|---|
| 8 petals | 2.706 | 2.539 | 2.196 | 1.834 | 1.443 | **1.003** |
| 40 petals | 2.534 | — | 2.341 | — | — | 1.798 |
| 40 × 6 (240 feet) | 2.422 | — | 2.225 | — | — | 1.878 |

**EXACTLY EXHAUSTED at 8 petals on the widest stem — one foot's length of clear arc and no
more.** It is never tighter at higher counts, because the sphere grows with the petal count
faster than the stem's own cap does. The one state that reads **0.000** is a stem WIDER THAN
ITS OWN HEAD (12 mm on a 3-petal sphere, Rd 5.14 mm), where the cap swallows the entire
lower hemisphere; that is the bare corner, and it is told rather than refused like every
other statement about it.

**THE READ-OUT PRINTS IT TO THREE DECIMALS, and the reason is this tree's own corner:**
1.003 rounds to `1.00` at two, which is indistinguishable from exhausted on the one row
where the distinction is the whole point. There is no band and no second threshold — the
only word is EXHAUSTED, at the only place the quantity has a meaning of its own (`< 1`),
and the flag is asserted in both directions.

**THE WORD *EXHAUSTED* HAS ITS OWN CELL, because no matrix row reaches it.** The shipped
sphere's margin falls to 1.003 at the widest stem and no further, so the clause that prints
EXHAUSTED would never have been shown to print. Panel route (w) drives **4 petals on a 12 mm
stem — 0.652 with 2 of 4 built**, a real margin under one foot's length rather than the
degenerate 0 the bare corner gives. Reachable neighbours, measured: 3 petals × 12 mm reads
0.000 (2 of 3 built), 3 × 10 mm reads 0.581, 5 × 12 mm reads 1.042 and is not exhausted.

**AND IT HAS ITS OWN MUTANT.** `the-meridian-margin-reads-the-bore` takes the stem's
footprint from the BORE radius instead of the outer one — the slip that is actually
available, since the stem has two radii and the channel is about the outside of it. What
makes it the right mutant is what it does NOT move: measured in Node on the sphere-stem row,
the same 6 petals, the same 21,432 triangles, the same omitted set `[0, 1]`, and a margin of
**2.706x where the geometry has 2.196x** — a plausible larger number a reader would act on.
Every other clause in the family reads the channel's own report and stays green.

**ST7 CHECKS IT FROM THREE OWNERS, NONE OF WHICH IS THE QUANTITY** (Eva's fourth durable
rule, and session 41's mirror of it). The cap edge is rebuilt from the HUB BUILDER's own
emitted sphere radius and the STEM BUILDER's own widest EMITTED vertex — the artefacts, not
the plan that asked for them — and the foot from `footRing()`'s own per-ring `arc` and
`overhang`. The bound is **in millimetres, the unit the quantity carries**, on each of the
three LENGTHS rather than on the ratio they form. **The bar is sized from the one input the
two routes do not share**: `Rd` reaches the hub builder as `const Rd = dome.Rd`, the same
double, but `emittedMaxR` is `hypot(R cos θ, R sin θ)` maximised over the emitted ring, which
is `R` to within about two ulps rather than exactly `R`. The cap edge's sensitivity to that is
`dArc/dR = −1/sqrt(1 − (R/Rd)²)`, which is 1.46 at the exhausted corner and 4.3 at the tightest
state where the clause still runs (it is clamped, and skipped, once the stem is as wide as its
head), so a two-ulp input error moves the arc by ~1e-14 mm. **1e-9 mm is five orders of headroom
over that and still five orders below the 0.1 mm a reader could act on.** The ratio is then asserted to BE those two
lengths, which is an identity inside the record and is **not** evidence about the
geometry — it is there so a read-out printing one number while the record holds another
cannot pass.

**THE BRIEF'S TWO FIGURES: ONE REPRODUCES TO 0.2%, THE OTHER IS A DIFFERENT QUANTITY AND IS
NOT ADOPTED.** The 8-petal figure the brief quotes is **1.005**; the definition above reads
**1.0032** — agreement to 0.25%, with the qualitative claim ("exactly exhausted") exact, and
the residual is most likely the Phase-A rig taking the cap edge through a chord where this
takes it through the arc. That is reported rather than tuned: nothing here was adjusted to
land on 1.005.

The brief's second figure — *"at 40 petals the feet already overlap on the shipped tree
(0.563), which is pre-existing and by design"* — is **not this quantity**. **Its provenance
is now known and it is EVA'S OWN, quoted forward from session 43's Phase A** (Eva, on the
ruling): it could not be reproduced here because it is a different measurement, not because
it was wrong where it came from. What follows is recorded so the real readings are on the
record and the number itself is not carried any further. It is the feet
against EACH OTHER rather than against the stem, it has no stem in it, and this session did
not identify a definition that produces it. The two closest readings that can be built from
`footRing()`'s own fields are the consecutive-ring meridian step over the mean **overhang**
(8 petals 0.632, 40 petals **0.125**) and over the mean **width** (0.370 / **0.166**);
neither is 0.563 at either count. Feet overlapping each other is the CROWDING instrument's
territory and is already told on every row (`D_max`, `D_mean`, `NN … w`), where the shipped
sphere reads `D_max 1` and `NN 1.578 w` at 8 petals and `NN 1.554 w` at 40 — no stacking at
either. **No figure was adopted that this session could not reproduce with a definition it
can state.**

**AND THE OMISSION DOES NOT MOVE IT** — measured, both directions: `NN` reads 1.5781 w at 8
petals with no stem and 1.5781 w with a 12 mm stem that takes two petals, and 1.5540 w at 40
petals with and without a 12 mm stem that takes seven. Removing feet can only ever increase
a nearest-neighbour distance, and here the closest pair survives in every case. That is
condition 2 (filter, do not renumber) showing up in a second instrument that knows nothing
about it.

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
  wrong thing would agree with itself — which is why ST9 exists. **It also carries the
  MERIDIAN PACKING MARGIN** (§7b), and that clause is the exception to the sentence
  before it: its reference is rebuilt from the hub builder's sphere, the stem builder's
  emitted vertices and `footRing()`'s rings, so it is not reading the quantity it checks.
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

**MEASURED, the whole 744-row live matrix, both modes, against a worktree of `5f9c0c7`:**

```
744 rows · 8 predeclared MOVERS · 736 predeclared HOLDERS
741,700,440 export floats compared with Object.is
CLAUSE 1  movers that did NOT move: 0
CLAUSE 1  holders that MOVED: 0
CLAUSE 2  movers where something OTHER than the omitted petals moved: 0
PASS
```

The 8 movers are the eight block-32 rows that actually build a stem on a sphere; the
ninth (`GATED — the widest stem at length 0`) is a HOLDER, which is the inert-by-branch
claim measured rather than argued. **Nothing outside block 32 moves at all** — no
`stemLength max (120)` row, no `ALL MAX`, because neither is a sphere (`hubShape` is a
CHOICE and the blanket sweep is sliders only).

**AND THE TOOL NEEDED A SECOND CONTROL, WHICH RE-READING IT FOUND RATHER THAN A FAILURE.**
`--control` perturbs a HOLDER, which exercises CLAUSE 1 — and it SKIPPED clause 2 entirely
(`if (!CONTROL)`), so the clause this whole feature is about was a log line that had never
been shown able to fail. That is this repo's own recorded lesson, verbatim: *"a control that
fires only the first leaves the second a log line"* (`verify-bloom-seam-bytes.mjs`'s
`--control-mode`, session 38). `--control-only` moves the FIRST float of a MOVER's emitted
stream — the first SURVIVING petal's first vertex, and therefore by construction not in any
omitted petal's block, which is exactly the condition-2 violation clause 2 exists to catch
(on the bare corner, where no petal survives, it lands on the hub, which is condition 3).

```
node tools/verify-bloom-sphere-stem-bytes.mjs --base <worktree> --control-only --only '^SPHERE STEM'
  9 rows · 8 predeclared MOVERS · 1 predeclared HOLDERS · 460,224 export floats
  CLAUSE 1  movers that did NOT move: 0
  CLAUSE 1  holders that MOVED: 0
  CLAUSE 2  movers where something OTHER than the omitted petals moved: 16
  CONTROL-ONLY OK — CLAUSE 2 reported 16 of 16 (mover x mode) builds where a KEPT petal had moved
```

**Clause 1 stays clean under it**, which is the separation that makes the two controls two
claims rather than one: a mover that moves is all clause 1 asks, so only clause 2 can see a
kept petal move. The run REFUSES as vacuous if the row set holds no movers at all, because a
control with nothing to perturb reports the same silence as a clause that cannot fire.

**And `--control` now says which clause it exercised**, rather than "the perturbation was
detected" — the conflation the second control exists to undo.

### 9b. THE CLASS: AN INSTRUMENT THAT INDEXES BY SLOT AND NEVER ASKS WHETHER THE SLOT WAS BUILT

**This is one defect class, not a list of incidents**, and writing it as the class is Eva's
instruction: *an instrument that indexes by slot and never asks whether the slot was built.*
Every generator here has run on the premise that the slot sequence and the built set are the
same set. They stopped being the same set the moment a petal could be omitted, and several
instruments broke at once. **Eva named four from the report** — the slot-0 residuals, the
representative petal, the crowding raster's foot count, and the solid-angle census re-emitting
petals the builder did not build. **A FIFTH is the same premise at count ZERO** (the crowding
raster reading `feet[0]` on the row that builds no petal at all), and it belongs in the class
rather than beside it. None of them is about the stem; all five are about a premise nobody had
written down because nothing had ever violated it.

**One finding below is NOT an instance and is marked as such** — ST9's first region including
the hub is a region-definition error, not a slot-index one. It is kept here because it surfaced
in the same run and because the reason it reads zero honestly is worth having in one place.

**THE TEST THAT FINDS THE NEXT ONE: for any instrument keyed on a slot index, ask what it
reads when that slot is not built — and what it reads when NONE of them is.** "It always exists" is the answer that was true until this
session and is not an argument. The four below are what that question caught; a fifth is
found by asking it, not by waiting for a red.

#### 9b(i). Four residuals were computed on slot 0 because slot 0 always existed

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

**AND ST9's FIRST REGION INCLUDED THE HUB — NOT AN INSTANCE OF THE CLASS, recorded here
because it came out of the same run.** The stem is rooted THROUGH the hub, so the
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

**AND THE CROWDING RASTER THREW RATHER THAN ASSERTING** on the one row with no feet at
all: its report is built from `feet[0]`, and the bare corner has none. It declines the
MEASUREMENT there now — after R1-R4 have run and held, since R3 compares 0 feet against 0
petals built and R4 has nothing to iterate — and the read-out says `NO FEET` rather than a
D_max of 0 nobody measured. This project's own rule, arriving in a new place: a missing
element must be a red check, never a crash.

**THE SHAPE OF ALL FIVE.** Every one of the five is an instrument that assumed a slot always
carries a petal (four at "some slot is missing", the fifth at "no slot was built"), and every
one was found by the gate rather than by reading the code. The omission is the first thing in
this generator that can make a declared slot empty, and what that costs is exactly this list —
five places that had no reason to be written any other way. **The test above is what finds the
sixth**, and it is a question to ask rather than a red to wait for.

### 9b-bis. THE MUTANT TABLE FOUND TWO REAL DEFECTS IN ST9, AND BOTH ARE EVA'S FOURTH RULE

**ST9 is the only clause here that does not read the stem channel's own report — and it
read it twice.** The sweep of the seven stem/channel mutants came back 3 clean and 4 with
findings, and the two that matter are the same defect in two places:

* **`the-stem-channel-never-fires`** — the channel computed and thrown away, so every petal
  is built and the stem passes straight through the pole-most ones. ST7 fired. **ST9 stayed
  SILENT**, because it was guarded on `if (!m.stemOmission) return bad;` — the very object
  the mutation destroys. The clause that exists to read the EXPORTED FILE returned before
  claiming anything, on the exact state it was written for.
* **`the-channel-clearance-is-typed`** — the printable gap replaced by a twentieth of a
  millimetre, so petals are kept that the stem passes 0.05 mm from. ST7 fired. **ST9 stayed
  SILENT**, because its bar was `clear = O.clearanceMm` — so the mutation shrank ST9's own
  threshold along with the geometry's and there was nothing left to exceed.

That is `seam-floor-removed` verbatim, one family later: *a clause that asks the defect
whether it fired asks nothing*. Both halves are rebuilt from owners the channel does not
write — the guard from `footRing`'s own `sphereMode` and the CONTROL's own `stemLength`, the
bar from `MIN_FEATURE_MM` restated as the law (ST7 is the clause that asserts the channel
DECLARES that gap; ST9 measures against it directly, so the two cannot move together).
**Neither defect was visible on any green run** — the whole matrix, the smoke subset and the
block-32 gate are all silent on a tree carrying both.

Two more findings, neither a defect in a clause:

* **`the-omission-renumbers`' WITNESS read a quantity the mutation cannot move.** It compared
  `slotAzimuths[0].length`, which is PRE-SIZED to the descriptor count — 8 on both trees.
  Measured at 8 petals × a 6 mm stem: the clean tree DEFINES 8 azimuths and builds 6 petals,
  the mutant defines **6** and builds **4**, with the array 8 long on both. The witness reads
  what the whorl VISITED and the builder EMITTED now.
* **`stem-present-disagrees-with-the-registry` over-claimed ST7**, and the claim was wrong
  rather than the clause blind: `stemAssertions` compares the control's length against the
  builder's own `m.stem` and **RETURNS** on a disagreement, so a geometry that refuses the
  stem outright is caught by ST1 before ST7 is reached — and there is no channel left for ST7
  to have an opinion about. ST0 and ST1 are its witnesses; ST7 is about a channel that EXISTS.

### 9b-ter. ST9 HAS A WITNESS NOW, AND IT NEEDED A PROBE STATE BEFORE IT MEANT ANYTHING

§9b-bis fixed ST9's two entanglements by RE-READING the clause. A fix that rests on a
re-reading rests on nothing that can fail, and the apex table cannot close it: it calls
`stemAssertions` and never `stemChannelAssertions`, which takes the exported STL. So
**`node tools/verify-bloom-stem-channel.mjs` (+ `--control`)** is the thing those two removed
claims were traded for.

**HOW IT RUNS ST9 WITHOUT A BROWSER.** ST9 is a PURE function of `(positions, row, m, ui)` —
`row` is unread, `m` only for `sphereMode`. So the artefact is built in Node on a MUTATED
geometry module while the clause is imported from the UNMUTATED harness: the bar
(`MIN_FEATURE_MM`) and the geometry then have **different owners**, which is precisely the
property `the-channel-clearance-is-typed` destroyed. Positions are rounded with `Math.fround`
before the clause sees them, because that is what the file stores and what `stlPositions` hands
the shipped gate — the builder's doubles are a different object.

**ONE OWNER OF THE MUTATION TEXT.** The `find`/`into` pair is **parsed out of the apex table's
source by id** rather than restated, and the run REFUSES if the id is missing, if the pair is
not a single-line literal, or if the anchor does not match `bloom-geometry.js` exactly once.
Both refusals are **seen failing** — `--table <a copy with the id renamed>` and `--table <a copy
whose find-string no longer matches>` each exit 1 with the reason named.

**AND THE PROBE STATE IS PART OF THE CLAIM — the tool reported a false negative first.**
`the-channel-clearance-is-typed` replaces the 1.00 mm bar with 0.05, so it moves **no geometry
at all** unless some petal stands BETWEEN the two. At 8 petals the omitted petals *intersect*
the stem (0.000 mm) and the nearest kept stands 6.14 mm off, so the mutation is inert there,
`built` reads 6 on both trees, and ST9's silence says nothing about ST9. That is
`bore-is-not-evas-rule` verbatim, one family later. A sweep over 160 reachable states found
**34 that separate the bars**; the three widest are the tool's rows, and the 8-petal state is
kept as a **declared INERT row where ST9 must stay silent** — the other half of the claim.

| row | clean | `the-stem-channel-never-fires` | `the-channel-clearance-is-typed` |
|---|---|---|---|
| 40 petals × 1, stem 60 × 6 | silent, 33 built | **FIRED**, 40 built, nearest 0.0000 | **FIRED**, 34 built, nearest **0.9327** |
| 20 petals × 2, stem 60 × 7 | silent, 33 built | **FIRED**, 40 built, nearest 0.0000 | **FIRED**, 34 built, nearest **0.8686** |
| 5 petals × 1, stem 60 × 10 | silent, 3 built | **FIRED**, 5 built, nearest 0.0000 | **FIRED**, 4 built, nearest **0.7546** |
| 8 petals × 1, stem 60 × 6 (declared INERT for the second) | silent, 6 built | **FIRED**, 8 built | **silent**, 6 built |

**THE NEAREST-INTRUDER FIGURES CORROBORATE THE SWEEP THROUGH AN INSTRUMENT THAT SHARES NO CODE
WITH IT**: 0.9327 / 0.8686 / 0.7546 against the sweep's predicted 0.932 / 0.868 / 0.755, where
the sweep reads the builder's own `approach` record and ST9 reads the emitted positions.

`--control` swaps the clearance mutation's replacement for its own find-string — an edit that
applies and changes nothing — and the run must FAIL. It does, with three findings, one per
separating row.

**IT RIDES IN `bloom-export-watertight.yml`, AFTER THE npm INSTALL AND BEFORE THE BROWSER**,
for exactly the reasons the wall instrument rides there at all: the same question, Node-only,
fifteen seconds, and a gate a developer has to remember to run is not a safety net.
**IT DOES NOT SIT BESIDE THE WALL INSTRUMENT, AND THAT IS NOT A PREFERENCE**: it imports
`stemChannelAssertions` from `tools/bloom-harness.mjs`, which imports `playwright-core` at
MODULE LOAD (line 43), so placed any earlier it dies on a missing module and reads red for a
reason that has nothing to do with the channel. The wall instrument can go first because it
imports the harness NOT AT ALL — that is what buys it the position, not the fact that it needs
no browser, and the first draft of this wiring got that wrong. Duplicating ST9 into the tool to
avoid the import is the one thing it must not do: the clause under test would stop being the
clause that ships. ST9 rides in BOTH STL gates on every
sphere-stem row, so a clause that has silently stopped being able to fire makes those gates
green on a broken channel — which is the whole failure this tool exists to make impossible.
The bloom gate count is unchanged at five. `tools/verify-bloom-apex-mutants.mjs` is
deliberately NOT in that workflow's path filter even though this step parses it: a stale
anchor there is a REFUSAL at run time, caught whenever the gate runs for any other reason, and
a session that edits the mutant table has essentially always edited the geometry or the
harness too — listing it would put a three-hour gate behind every mutant-table edit for
coverage that is already there.

**WHAT IT STILL DOES NOT COVER**, stated rather than implied: it runs ST9 on the BUILDER's
emitted stream rounded to float32, not on a file that came out of the app's own export handler,
so an export path that dropped or reordered triangles between the accumulator and the download
is outside it — that is `stemChannelAssertions`' own home in both STL gates, where it rides on
every row.

### 9b-quater. THE FIRST IMAGE WAS FRAMED ON A QUANTITY READ FROM THE BUILD, AND IT WAS STILL THE WRONG OWNER

`shot-bloom-sphere-stem.mjs` framed each cell at `Rd * 1.55` — the head's own sphere radius,
**read from the build rather than typed**, which is the discipline this project asks for and
is exactly why the mistake was not obvious. It is still the wrong owner: the blades radiate
well past `Rd`, so every petal fell outside the picture. **The pole was in frame and THE
OMISSION WAS NOT** — the one thing the image exists to show.

The fix is the row's own STEMLESS build's `maxDimMm`, halved: what the bloom actually
occupies, asked of the build that has no stem in it so the frame cannot move when the stem
does.

**THE CLASS, and it is the one Eva named:** *the same class as measuring an arc's direction
instead of its extent.* Reading a number off the artefact is necessary and not sufficient —
the question is whether that number is the quantity the claim is about. "Derived, not typed"
and "derived from the RIGHT length" are two different bars, and this project's own
mode-and-sampling rule is the first half of the same sentence.

### 9c. The matrix, the census and the gates

* **The live matrix goes 736 -> 744.** Nine rows added (block 32), one removed (block 30's
  `STEM: GATED — SPHERE`, which is no longer gated). **`frozen/phase29` is the 736 rows at
  `5f9c0c7`**, registered in BOTH `FROZEN_MATRICES` and `FROZEN_BASE_COMMITS`, and
  `--verify-frozen --phase29` is deep-equal to that commit's own `buildMatrix()`, row for
  row. (It went red first: the snapshot was written from `{label, set}` and dropped the
  eleven rows' `capability` field — the check doing its job in 24 seconds.)
* **AND `frozen/phase29` COULD NOT BE PUBLISHED FROM THIS SESSION — one attempt, measured,
  read back off the REMOTE rather than off the exit code.** The tag was created locally at
  `5f9c0c7` (confirmed on `origin/main` by `git branch -r --contains`, so the baseline is a
  commit on `main` and not a branch head, which is the charter's rule) and
  `git push origin refs/tags/frozen/phase29` — one explicit refspec, no `--tags`, no
  `--force` — returned a flat **HTTP 403** (`RPC failed; send-pack: unexpected disconnect`),
  with `git ls-remote --tags origin 'refs/tags/frozen/phase29'` coming back EMPTY. Three
  independent observations of that refusal now stand and **this one closes the workflow
  divergence reading from the OTHER side**: session 41's case changed no `.github/workflows`
  file at all and was refused, and this branch DOES change one
  (`bloom-export-watertight.yml`) and is refused identically. So the refusal is insensitive
  to that condition in BOTH directions. **That is still not a replacement mechanism** —
  what actually refuses remains unestablished, and the charter's instruction not to engineer
  around a successor condition stands.
* **THE ROUTE THAT WORKS IS `bloom-frozen-tags`, AND ITS RIGHT MOMENT IS AFTER THE MERGE, NOT
  NOW.** That workflow is `workflow_dispatch`-only, is already on the default branch (so it
  is dispatchable), and runs `tools/publish-frozen-tags.sh` on a runner, which has neither
  this environment's limit. It was deliberately NOT dispatched here, for two reasons that are
  about correctness rather than caution. **(i)** Dispatched on this BRANCH it would pin a
  baseline `main`'s own harness does not register — a tag whose matrix exists nowhere on the
  default branch, which is the wrong half of the census's own
  "a base commit with no matrix is a phase nobody wrote". **(ii)** The script publishes the
  WHOLE declared set through `git push origin --tags` and refuses a partial one by design, and
  the remote today carries **eighteen** `frozen/*` tags — phase2 through phase20, phase5
  absent — so **phases 21 through 29 are ALL unpublished**. Publishing eight other sessions'
  missing baselines is strictly protective and is not this PR's to decide. One dispatch from
  `main` after this merges closes the whole gap at once.
* **NONE OF THAT IS LOAD-BEARING, so do not re-litigate it.** `5f9c0c7` is on `main`, `main`
  is never force-pushed here, so the commit cannot be orphaned and phase29's definitions stay
  replayable without the tag; the load-bearing half is the REGISTRATION, which is done in both
  maps and is what `bloom-frozen-matrices` proves green on this head.
* **TWO FROZEN TAGS' BYTES NO LONGER REPRODUCE — ONE ROW EACH, NAMED, and it is the
  OMISSION's rather than the band's.** This project's rule is that a frozen tag pins row
  DEFINITIONS and never bytes, and that a session which moves frozen bytes must say which tag
  and how many rows. Measured over **all 28 registered frozen matrices** by asking `footRing`
  + `stemPlan` of every row in both modes which could possibly move (a stem present on a
  sphere, or a band), then byte-comparing exactly those against a worktree of `5f9c0c7`:

  | tag | rows | rows whose bytes move |
  |---|---|---|
  | `frozen/phase2` .. `frozen/phase27` | 76 .. 680 | **0** |
  | **`frozen/phase28`** (699 rows at `994aea4`) | 699 | **1** |
  | **`frozen/phase29`** (736 rows at `5f9c0c7`) | 736 | **1** |

  It is the SAME row in both: `STEM: GATED — SPHERE with a stem asked for`, which was gated
  when those snapshots were taken and is not gated now — it builds a stem and loses the petals
  the channel omits, **63,264 → 52,060 triangles** in both modes. That is the ruling working,
  not a regression; it is also exactly why the row was removed from the LIVE matrix. **Their
  definitions still deep-compare**, which is what `bloom-frozen-matrices` proves. phase28 and
  phase29 join phase17, phase19, phase21, phase23 and phase24 in the
  definitions-reproduce-bytes-do-not class.

  **THE BAND MOVES NO FROZEN ROW AT ALL** — no frozen matrix carries a sphere whose head is
  inside its bore, which the same sweep shows by finding one candidate rather than two.

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

## 9e. ~~BLOCKING~~ RULED AND FIXED: A HEAD THAT FITS INSIDE THE STEM'S BORE EXPORTED AS TWO SOLIDS

> **RESOLVED by Eva's ruling — THE SOLID ROOT BAND. See §10 for what was built, the
> measurement that narrowed it, and the acceptance test. This section is kept as the
> diagnosis it was, unedited, because the ruling was made on it.**

**`node tools/bloom-smoke.mjs --conn` is RED, and it is a hard-invariant failure rather
than a flag.** `SPHERE STEM: THE BARE CORNER` exports watertight (boundary 0) and as
**2 connected pieces** — 3 at a 0.3 mm cell, 0.82% of surface detached.

**IT IS NOT THE OMISSION'S.** Decomposed into vertex-welded shells:

| shell | tris | z | r max | area |
|---|---|---|---|---|
| outer sphere | 3,360 | [−1.800, 1.800] | 1.800 | 0.97% |
| inner sphere | 3,360 | [−0.600, 0.600] | 0.600 | 0.11% |
| stem | 576 | [−61.800, −0.600] | 6.000 | 98.92% |

The stem is HOLLOW with a **4.5 mm bore** (Eva's `max(0, r − 1.5)` at the 12 mm maximum) and
the whole head has an outer radius of **1.8 mm**. The head sits entirely inside the bore; the
tube's material is the annulus 4.5 ≤ r ≤ 6 and the two never touch. The 2-vs-3 component count
is the two concentric spheres merging at the coarser cell, which is the gate's own re-read.

**THE CONDITION, measured across the reachable range:**

```
    headOuterRadius < stemBoreRadius        i.e.   Rd + t/2 < max(0, stemDiameter/2 − 1.5)
```

| state | head outer R | bore | built / asked | disjoint |
|---|---|---|---|---|
| bare corner, 12 mm stem | 1.800 | 4.50 | 0 / 3 | **yes** |
| 8 petals, w 8, spread 0.6, 12 mm | 2.350 | 4.50 | 2 / 8 | **yes** |
| 12 petals, w 8, spread 0.6, 12 mm | 2.736 | 4.50 | 3 / 12 | **yes** |
| 20 petals, w 8, spread 0.6, 12 mm | 3.350 | 4.50 | 6 / 20 | **yes** |
| 3 petals, default width, 12 mm | 5.738 | 4.50 | 2 / 3 | no |
| same tiny head, 6 mm stem | 1.800 | 1.50 | 1 / 3 | no |
| 40 petals, default, 12 mm | 18.896 | 4.50 | 33 / 40 | no |

**It happens with 2, 3 and 6 petals SURVIVING**, so it is a property of the STEM ON A SPHERE
and not of the channel. Equivalently `stemDiameter > 2·headOuterRadius + 2·STEM_MIN_WALL_MM`,
so with the 12 mm maximum **every head under 4.5 mm of outer radius can be disconnected by a
wide enough stem**, and every head at or above it is safe at any setting. The bare corner is
simply where the matrix landed on the region.

**IT IS NEWLY REACHABLE BECAUSE THIS PR GIVES SPHERE A STEM AT ALL** — on `main` SPHERE
refuses one, so no state in the region existed. **That claim is about THE SPHERE and only the
sphere: §9e-bis below is a SECOND, different `>1 piece` failure, on a CAP, pre-existing on
`main`, measured identically on both trees.** The two share a root and not a symptom; do not
read either table as evidence about the other.

**NOTHING WAS DONE ABOUT IT, ON PURPOSE.** The brief's scope list forbids changing the stem's
bore rule or its controls, and says in as many words: *"If you believe something outside this
list must change for the omission to work, STOP and say so with the measurement that shows it.
Do not do it."* The print-safety invariant says the same thing from the other side. The three
answers all decide something that is Eva's:

1. **A SOLID ROOT BAND on a sphere.** The band that roots THROUGH the head would carry no
   bore, so its top cap is a full disc that always crosses the head's material. It does not
   touch Eva's 1.5 mm wall, which governs the FREE stem — a cantilever tube on a long lever —
   and it is how the joint would actually be printed. It adds material and moves bytes on
   every sphere-stem row.
2. **REFUSE the stem where the head fits inside its bore**, clamped and told, the way every
   other corner here is. It makes a reachable control combination inert, which this project
   normally tells rather than refuses.
3. **Narrow `stemDiameter` against the head.** Rejected on sight for the reason
   `stamenSpread`'s ruling gives: an adaptive maximum makes one slider position mean
   different things on different states.

**Option 1 is the one this session would recommend** — it is the only one that keeps every
reachable state buildable and does not make a control lie — but it is a geometry change that
was not asked for, so it is recorded rather than built.

### 9e-bis. AND A SECOND, DIFFERENT `>1 piece` FAILURE IS PRE-EXISTING ON `main` — THE JOIN EMITS A FLAT SHELL WHEN THE HUB IS NARROWER THAN THE STEM

**The two must not be conflated, and this one was found by refusing to accept the first
one's story without measuring it.** §9e above asserted the head "never touches the tube".
Checked, on the CAP states that reach the same region: the nearest HEAD vertex to the tube's
material reads **0.000 mm, at r = 4.60, z = −0.28** — inside the annulus, inside the stem's
z range. The head DOES touch the tube there and the flood fill still says two pieces, so the
mechanism is not the one the shell table suggested and the detached part had to be **named**
rather than reasoned about.

**IT IS A FLAT SHELL AT A SINGLE z.** Per-component bounding boxes, world mm, the gate's own
0.6 mm cell, `main` at `5f9c0c7`:

| state | pieces | the detached one |
|---|---|---|
| `DEFAULTS + spread 0.6 + stem 120 × 12` | **2** | 79 cells (0.15%), r 0.24–2.98, **z −3.70 … −3.70** |
| `3 petals + spread/width/delicacy min + stem 120 × 12` | **2** | 12 cells (0.03%), r 0.29–1.10, **z −3.70 … −3.70** |

Both survive the gate's own re-read at half the cell (still 2 at 0.3 mm), so neither is a
rasterisation artefact. z = −3.696 is exactly `hubT/2 − joinT` — **the hub-to-stem join's own
underside** — and the shell is 1,680 triangles with every vertex at that one z. A closed
surface all of whose vertices share a z encloses zero volume: it is a zero-thickness surface,
not a solid.

**THE CONDITION IS ONE COMPARISON, PREDICTED THEN MEASURED, EXACT ON 8 OF 8 STATES:**

```
    hubR < stemOuterRadius           ( = stemDiameter / 2 )
```

which is `hubThicknessAt`'s own early return — `if (!(hubR > outerR)) return joinT;`
(`bloom-geometry.js:7367`), the branch that gives a hub narrower than the stem the full join
thickness uniformly instead of a blend.

| state | hubR | outerR | predicted | measured |
|---|---|---|---|---|
| spread min, stem 5 mm | 2.653 | 2.50 | ok | ok |
| spread min, stem 6 mm | 2.653 | 3.00 | FLAT | **FLAT**, 1,680 t at z −1.916 |
| spread min, stem 12 mm | 2.653 | 6.00 | FLAT | **FLAT**, 1,680 t at z −3.696 |
| DEFAULTS, stem 12 mm | 8.845 | 6.00 | ok | ok |
| DEFAULTS, the shipped stem 60 × 6 | 8.845 | 3.00 | ok | ok |
| DEFAULTS, no stem (the shipping default) | 8.845 | 0.00 | ok | ok |
| `footDelicacy` min, stem 12 mm | 4.422 | 6.00 | FLAT | **FLAT**, 1,680 t at z −3.696 |
| `footDelicacy` min, stem 8 mm | 4.422 | 4.00 | ok | ok |

**THE FLAT SHELL APPEARS FROM 6 mm — THE SHIPPED DEFAULT DIAMETER — AND DETACHES ONLY ABOVE
THE HUB.** It is held onto the rest of the model by nothing but intersecting the stem's WALL,
so while the wall passes under the hub's radius the flood fill reads one piece and the defect
is invisible; a wide enough stem moves the wall outside the hub's radius and the disc floats
free. That is why `spread min × 6 mm` reads ONE piece with the flat shell present and
`spread min × 12 mm` reads TWO.

**IT IS INVISIBLE TO THE MATRIX BY CONSTRUCTION**, the same sentence §18a already carries for
`cup × petalTipShape`: the matrix varies ONE control from DEFAULTS, `stemLength`'s default is
0, and reaching the failure needs a non-default `spread` (or `footDelicacy`) AND a stem AND a
wide one. Each of its three controls reads ONE PIECE alone — `spread` min with no stem, `spread`
min with the 6 mm stem, and DEFAULTS with the 12 mm stem are all one piece.

**IDENTICAL ON BOTH TREES, ROW FOR ROW** — every number above reproduces on this branch, which
is the strongest available statement that it is pre-existing and none of this session's.

**SO THE TWO FAILURES SHARE A ROOT AND NOT A SYMPTOM.** Both are *a hub narrower than the
stem's outer radius*. On a CAP the join is active and the symptom is a detached zero-thickness
disc; on a SPHERE the join is INERT by declaration (§5), so no disc arises and the symptom is
the whole head floating inside the bore with nothing left to bridge. §9e's *"newly reachable
because this PR gives SPHERE a stem at all"* stands **for the sphere case only**: on `main`
SPHERE refuses a stem, so that state did not exist — while the CAP case above has been shipping
and is not this PR's to fix.

**WHAT THAT CHANGES FOR THE RULING.** Option 1 (a solid root band on a sphere) answers the
sphere case and does nothing for the CAP one, which is a separate fix in `buildHubInto`'s join
arm. Both are the join's or the stem's, both are on the brief's DO-NOT list, and the CAP one is
**filed as #236** rather than fixed here — which also gives the connectedness gate's own xfail
policy (*"If one is ever added it must cite a tracked issue"*) an issue to cite, if that is the
route Eva takes.

`node $S/floodmain.mjs`, `whichpiece.mjs` and `disc.mjs` are the three probes; the flood fill in
the first is lifted verbatim from `tools/verify-bloom-connectedness.mjs` because **the
vertex-weld shell count is not the connectedness test** — this repo's own recorded rule, and
the first pass of this investigation used the weld and would have got the mechanism wrong.

## 10. THE SOLID ROOT BAND — EVA'S RULING, BUILT

**The ruling:** *close the bore where the head is.* Refusing the stem takes a reachable
flower away; narrowing `stemDiameter` against the head makes one control silently eat
another's range (`stamenSpread`'s adaptive-maximum ruling). The geometry has a direct
answer, so it is the one taken.

### 10a. THE EXTENT IS DERIVED FROM THE HEAD'S OWN GEOMETRY, IN MILLIMETRES

Two lengths, both already owned by `stemPlan` and neither typed:

```
headOuterMm  = dome.Rd + hubT/2          the head's greatest cylindrical radius
lowestHubZ   (already derived per head shape, for hiddenMm)
solidBandMm  = topZ - max(tipZ, lowestHubZ)      when the condition binds, else 0
```

The band runs from the face the stem is rooted through DOWN to whichever comes first, the
head's lowest material or the stem's own tip. **On a sphere `lowestHubZ` is `rootZ` by the
plan's own derivation**, so the band is the wall's own thickness and nothing is invented for
it. On the bare corner: 1.2000 mm, `topZ −0.7919 → −1.9919`.

### 10b. IT IS THE CLOSED SHELL'S CASE, AND THAT WAS MEASURED RATHER THAN SCOPED

The first cut applied the condition to any head. **`headOuterMm < boreR` is reachable on a
CAP too — 291 of 4,608 swept states, hub radii down to 0.812 mm against bores to 4.500 — and
on every one of them the band fixed NOTHING:**

| CAP state (3 petals, width 4, spread 0.6) | components, base | components, with the band |
|---|---|---|
| 12 mm stem (bore 4.50) | 2 @ 0.6 mm · 2 @ 0.3 | **2 · 2, identical** |
| 9 mm stem (bore 3.00) | 2 · 2 | **2 · 2, identical** |
| 6 mm stem (bore 1.50) | 1 · 2 | **1 · 2, identical** |

Because the head was never the detached part there. Decomposed, the stray piece on the CAP
case is **12 voxels lying at the single height z = −3.696**, and `hubT/2 − joinT` is
−3.6962 — it is **#236's flat zero-volume join shell**, not the head, which sits in the main
body spanning r 0.29..33.19.

**Why the two differ, and it is the distinction `joinReason` already draws:** on a CAP or a
flat hub the stem is rooted THROUGH the head's own slab and the join thickens that slab
around the axis, so head and stem share material whatever the bore does. On a closed shell
the stem leaves a POLE, the head is a thin skin at `headOuterMm`, and the whole of it can
stand inside the bore with nothing bridging the two. So `headInsideBore` carries
`sphere &&`, and firing it on a CAP would have moved bytes for no benefit **and would have
been SEEN** — there a narrow hub leaves the bore's mouth open to the sky.

### 10c. THE ACCEPTANCE TEST, AT BOTH CELLS AND IN BOTH MODES

| | cell 0.6 mm | cell 0.3 mm |
|---|---|---|
| LIVE | **components=1, stray=0** | **components=1, stray=0** |
| EXPORT | **components=1, stray=0** | **components=1, stray=0** |

**The probe is calibrated**: the same raster on a worktree of `7513472` reads
`components=2 stray=0.00821` at 0.6 mm and `3` at 0.3 — reproducing CI's own figures for that
row exactly, which is what makes the pass mean something. The gate itself agrees:
`node tools/verify-bloom-connectedness.mjs --only 'SPHERE STEM'` is **PASS, 9 of 9**, and the
other eight rows' triangle counts are unchanged to the integer.

### 10d. IT IS VISIBLE, AND THAT IS REPORTED RATHER THAN ACCEPTED QUIETLY

Eva's constraint 4 was *"the band is inside the stem; if it is visible from outside in any
state, the derivation has overshot — say so rather than accepting it."* **It is visible, and
this section is the saying so.**

The first version of this work asserted the opposite, in a code comment and in this doc: the
band adds material inside the tube, so nothing outside changes. That is right about the outer
wall and the stem's length, and **wrong about the top face**. Measured on the bare corner:

| | |
|---|---|
| head's whole silhouette | **1.992 mm** of radius |
| stem's outer radius | 6.000 mm |
| the face the band closes | r 0..**4.500** (the bore) |
| of it, outside the head entirely | r 1.992..4.500 — **51.15 of 63.62 mm², 80.4%** |

Where before there was an open bore to look down, from directly above.

**AND THE CLAUSE WRITTEN TO CHECK IT COULD NOT HAVE SEEN IT.** CLAUSE 2 identifies the stem's
"outer wall" as triangles with all three vertices at `outerR` **and not all at one height** —
which excludes precisely the top face. The measured side was scoped so the claim could not
fail. That is this project's most-recorded defect class, committed here in the clause written
for the claim, and caught by re-reading the diff rather than by any run.

**IT IS THE CONDITION THAT IS VISIBLE, NOT THE EXTENT, AND THAT IS PROVABLE RATHER THAN
MEASURED ON ONE ROW.** A band exists iff `headOuterMm < boreR`, and `boreR = outerR − 1.5` is
always less than `outerR` — so **a band implies a head narrower than the TUBE**, i.e. a head
that could never have covered the stem's top face. On exactly the rows where the band exists,
that face is exposed with it and without it; what a viewer directly above sees change is a
**hole becoming a disc**. The band's LENGTH is the head's own wall and nothing more, and no
shorter one is available: the head sits at the TOP of the bore, so any closure that reaches it
sits where the head is, and there the closure is necessarily wider than the head. A disc
covering only the part under the head (r ≤ 1.828 at that height) would not reach the tube's
wall — a second detached piece, fixing nothing.

**So this is flagged for Eva rather than absorbed.** The alternative is not a tighter
derivation; it is a different ruling (refuse the stem on such a head, or narrow `stemDiameter`
against it — the two she rejected). If a plugged bore reads wrong to the eye on the bare
corner, that is the ruling to revisit, and this section is here so it can be.

**What CLAUSE 2 does still carry, stated as the narrower claim it is:** the stem's outer
cylinder is bit-identical between trees, and every differing float lies inside the stem's own
envelope — so the band did not reach the head, a petal or the hub. That is worth having. It is
not a claim of invisibility.

### 10e. ST1 CAUGHT THE FIRST CUT, WHICH IS THE CLAUSE EARNING ITS KEEP

The band changes the stem's emission, and ST1 predicts the triangle count from the PLAN's own
stations and sides:

```
ST1: the builder emitted 476 triangles for a hollow stem of 2 band(s) on 48 sides;
     the plan's own station list and side count ask for 576
```

That is the clause this session had already strengthened — it used to ask only about a stem
that should NOT exist, and `stem-declared-and-not-built` fired nothing against it. ST1 now
carries three arms, because the band is a third emission and not a tweak of the hollow one:
with the bore closed the top face is a full DISC rather than an annulus, the inner wall runs
only over the void, and the void gains a ceiling. Both new discs are RIM fans (cost `N − 2`,
not `N`) — a centre fan would put a vertex on the axis and weld to the hub's own apex, the
measured defect the solid arm already carries.

### 10f. AND THE VOID'S LADDER COMES FROM THE PLACER, NOT FROM A COMPARISON

`solidBandZ` lands exactly on a station for a SPHERE and between two for a CAP, so filtering
the outer tube's stations by `z < solidBandZ` would decide by the last bit whether a station
an ulp away is kept — and a kept one an ulp from the band's edge is a **degenerate quad**, not
merely a different ladder. The void asks `stemStations` for its own length instead. **SIXTH**
instance of the discrete-decision-on-a-continuous-quantity class this project records (session
42's Model B was the fifth and named itself so), and the first one caught before it shipped
rather than after.

### 10f-bis. COST, AND NO FROZEN PHASE IS OWED BY THE BAND

**No row is added or removed** — the band fires on a row the matrix already ran — so
`frozen/phase29` (the 736 rows at `5f9c0c7`) is still the baseline this PR owes and the band
adds no second one. Its byte effect is one row of the live matrix (§10g), and no frozen matrix
names a sphere row with a head inside its bore, so **no tag's bytes stop reproducing because of
it.**

| row | triangles before | after |
|---|---|---|
| `SPHERE STEM: THE BARE CORNER` | 7,296 | **7,196** |
| every other `SPHERE STEM:` row | 21,432 / 21,140 / 85,044 / 527,972 / 25,568 | **unchanged to the integer** |

**The count FALLS, and the arithmetic is ST1's own** — the STEM's own triangles go **576 → 476**
on that row (N = 48 sides, 2 bands):

| | hollow arm | band arm |
|---|---|---|
| full-length walls | `4N·bands` = 384 | `2N·bands` = 192 (one wall) |
| void wall + bottom annulus | — | `4N` = 192 |
| top + bottom annuli | `4N` = 192 | — |
| two RIM fans (top disc, void ceiling) | — | `2(N−2)` = 92 |
| **total** | **576** | **476** |

**RIM fans, never centre fans**, and that is not a saving but a defect avoided: a centre fan
puts a vertex at `[0, 0, z]`, which on a SOLID stem is the hub's own top-fan apex to the double
— the two shells then WELD and a by-design overlap of two coplanar discs becomes a
within-shell self-intersection. Measured earlier in this session on the solid arm: **528 pairs
on the 3 mm row, 0 on every hollow one** (a bore leaves no axis vertex to share). The band is
the second place that would have arrived.

### 10g. THE BYTE PARTITION — INERT BY BRANCH, MEASURED OVER THE WHOLE MATRIX

Eva's constraint 2 was *"predeclare it that way and confirm it; if a normal-sized head moves a
float, the derivation is wrong."*

`node tools/verify-bloom-sphere-stem-bytes.mjs --base <worktree of 7513472> --change band`

| | |
|---|---|
| rows | **744**, both modes |
| predeclared MOVERS | **1** |
| predeclared HOLDERS | **743** |
| export floats compared with `Object.is` | **754,658,352** |
| CLAUSE 1 — movers that did NOT move | **0** |
| CLAUSE 1 — holders that MOVED | **0** |
| CLAUSE 2 — movers where the outer wall moved, or anything outside the stem did | **0** |

**PASS.** The single mover is `SPHERE STEM: THE BARE CORNER`. Every other row in the matrix —
including the eight other `SPHERE STEM:` rows, `ALL MAX`, and every CAP row that sets a wide
stem — is bit-identical. **No normal-sized head moves a float**, which is the derivation
answering for itself rather than a comment claiming it does.

**THE MOVERS ARE PREDECLARED FROM `stemPlan`'S OWN RECORD** (`solidBandMm > 0`), never from the
control set — session 41's discipline, and the same owner the omission's partition uses. A row
that merely sets an extreme `stemDiameter` on an ordinary head is correctly a HOLDER.

**BOTH CLAUSES ARE SHOWN ABLE TO FAIL, because one control would have left the other a log
line** (this file's own `--control-mode` lesson):

| control | what it perturbs | what fired |
|---|---|---|
| `--control` | one coordinate of every HOLDER by 1e-9 | CLAUSE 1 on **8 of 8** narrowed holders |
| `--control-only` | the first float of a MOVER's stream (here the hub's, the bare corner building no petals) | CLAUSE 2 on **2 of 2** (mover x mode) builds |

**Its declared asymmetry, named rather than left to be noticed:** `--control-only` exercises
clause 2's *envelope* half. Its *wall* half cannot be reached by perturbing the emitted stream
at all — a wall triangle can only move if the band's own ladder reaches the tube, and that
violates the envelope half first. The tool's header says so.

## 11. What this session did NOT do

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
* **It did not make the meridian packing margin gate anything.** It is telemetry, on this
  project's standing rule that a metric consumed as a geometric input becomes a target
  (the `headRise` ruling). Nothing is refused, nothing is clamped, and `depthBuilt`-style
  "asked vs built" does not arise: the margin describes the base the placement law already
  produced.
* **It did not take the feet-against-each-other packing off the CROWDING instrument.**
  That is a different quantity from this one, it has no stem in it, it is pre-existing and
  by design, and it is already told on every row (`D_max`, `D_mean`, `NN … w`). §7b records
  what the two closest readings of it measure and that neither reproduces the brief's
  0.563, rather than adopting a figure with no definition behind it.
* **IT FIXED ONE OF THE TWO `>1 piece` FAILURES AND DELIBERATELY LEFT THE OTHER.** §9e's is
  the sphere's, was ruled on, and is §10; **§9e-bis's is `main`'s, stays filed as #236, and was
  NOT chased here** — Eva's instruction was to check whether the band closed it and report
  either way, which §10b does: a CAP's component count is identical with the band and without,
  because the stray piece is #236's flat join shell and not the head. It is a fix in
  `buildHubInto`'s join arm and it wants its own PR. **Recorded plainly: `main` today ships a
  reachable state that violates the one-connected-solid invariant.**
* **It did not add an xfail to the connectedness gate.** That gate has an xfail POLICY in its
  own header (*"If one is ever added it must cite a tracked issue, PASS while the defect
  persists, and FAIL HARD the moment the row exports as one piece"*) and NO xfail MECHANISM:
  `ok: v.comps === 1` consults nothing. Building one is a decision about a HARD invariant —
  connectedness, unlike self-intersection, is not a flag here — so it is Eva's, and #236 now
  exists for such an entry to cite if that is the route she takes.
