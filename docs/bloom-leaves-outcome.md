# Leaves on the bloom's stem — PHASE B, the build

Phase A is `docs/bloom-leaf-phase-a.md`; its measurements are what this is
built on and are not re-derived here. Eva ruled the leaf angle at **35°** and
approved the two decisions Phase A's findings forced: **the node bands are
dropped**, and **leaves carry their own four serration controls**.

## The shape of it

* **`leafPlan()` is the one owner** of where leaves are and what they are made
  of. It reads the STEM's plan for the three lengths it needs — `boreR`,
  `outerR`, `rootZ` — and computes none of them.
* **`buildLeafInto()`** emits one leaf: a petiole rod rooted in the stem's
  wall, and a blade on the petiole's own frame.
* **Nine controls**: `leafLength` / `leafWidth` in absolute mm (ruling 5),
  `leafAngle` (default 35, ruling 7), `leafNodes`, `leafPhyllotaxy`, and four
  serration rows in a nested drop-down.
* **`leafLength` 0 is the guard** (ruling 6): `leafPlan` returns
  `present: false`, the loop does not run, and the row is the pre-leaf
  expression term for term. Measured: the shipping default is **19,040
  triangles**, exactly what it was.

## The three substitutions, and they are inert

Phase A's A1 named them; this ships them, each as one term added to an
existing condition, and no shipped cap sets any of the keys:

| # | what | where |
|---|---|---|
| 1 | `cap.petiole` stands the foot-continuity floor down | `widthProfile`'s `rootBlend` |
| 2 | `laminaStart` replaces `ROOT_BLEND_END` as the lobe window's lower bound | the lobes block |
| 3 | `cap.rowCapacity` replaces the ladder's own capacity in the count cap | the lobes block |

**Measured against a worktree of `main`: 0 of 64,016 emitted half-widths moved
across 8 states × 2 modes, and every lobe record is identical.**

## The petiole roots in the wall

Phase A's §5, shipped. `rootR = (boreR + outerR) / 2`, derived from two lengths
`stemPlan` already owns. **No node bands**: they solve nothing about
attachment, and taking them would split the bore into N+1 cavities, moving
O1's declared inward-shell count and ST1's triangle prediction.

The builder reports the **solid span each petiole actually crosses**, computed
from its own emitted axis. At the shipped 6 mm stem and 35° that is 1.67 mm;
the `wall / cos(θ)` law means it only grows as the angle steepens, which is
what makes the steep angle safe here where an axis-rooted petiole detaches.

## Cup is fixed and twist is zero — a decision, not a reading

Ruling 3 says the blade cups and twists because the flower forced its blades
flat and they read as paper cutouts. Eva approved **nine** controls and cup and
twist are not among them, so a leaf reading `petalCup` would couple two organs
— the same coupling the serration split exists to avoid — and a tenth control
would exceed what was approved. `LEAF_CUP` is the one constant and a control is
one registry row the day it is wanted. **Flagged, because it is the one place
this build does less than ruling 3's literal words.**

## LF0–LF7, written before the geometry and SEEN RED

Two reds are on the record, both in the commit that added the family:

1. **The census, static.** `bloom-smoke --check` reported all eight families
   "asserted in `tools/bloom-harness.mjs` and claimed by NO smoke row".
2. **At runtime**, against a page whose builder answered nothing — on three
   rows including the hollow-stem one and the gated one: `LF0: the metrics hook
   reports no leafAbsent …` and `LF1: the metrics hook reports no leaf key at
   all …`.

**What both STL gates are blind to, which is why the family is owed.** Each of
these exports watertight AND as one connected piece: a leaf declared and never
built; a petiole rooted **on the axis of a hollow stem** (Phase A measured it
still reading ONE PIECE, because a radial rod crosses the wall annulus on its
way out); a leaf whose **azimuths** are wrong (nothing in this project measures
an azimuth except J7, Z4b and Z8, none of which looks at a leaf); a leaf
reading the **petal's** serration controls; and a node inset that puts the top
leaf inside the head.

### LF4 caught a real defect in the geometry it was written for

A 120 mm leaf on a 20 mm stem needs 68.8 mm of inset from a 17.2 mm span, so
the top saturated at the bottom and **every node collapsed onto one point** —
three leaves stacked in one place. Found by the clause, before any picture.

The fix is clamp-and-tell in two parts, and it changed the clause too:

* The node span is divided at a **pitch floor of two petiole radii**, and the
  **count** is what gives — clamped and told, never refused.
* **LF4 now asserts a BICONDITIONAL**, not clearance outright. A leaf through
  the head is *legal geometry* (overlapping closed shells are the export
  contract), so the clause asks that the plan's `insetSatisfied` claim and the
  emitted node depth AGREE. Asserting clearance would have fired on a state the
  geometry is entitled to build.

### LF8 is the other one, and both STL gates are blind to it

The two side rims shared a winding and so did the two end rims — but each pair
faces opposite directions, so every leaf shell shipped **134 duplicated and 134
unmatched DIRECTED edges**.

**Neither STL gate can see this.** `analyzeStl`'s edge census keys on a SORTED
vertex pair, so an edge traversed twice *the same way* counts as a matched pair
and boundary-edge = 0 still holds; the flood fill, the degeneracy census and
the self-intersection census are blind for the same reason, because the faces
are all in the right *places*. A signed-volume check is not sensitive enough
either — a thin sheet's rim is a rounding error against its blade, and the
volume agreed to 15% with a flipped rim in place.

What did notice was **O2**, reporting its two orientation methods *disagreeing*
on 4 of 38 shells on the 24-leaf row. That is the right alarm and the wrong
resolution: it names the instrument, not the defect. **LF8** reads the
builder's own directed-edge census and names it — the stem's ST10 precedent,
for the same stated reason: a fix without a witness is folklore. 0 after.

### And the leaf's outline is decoupled structurally, not asserted

`leafBladeState` spreads the whole control set so every field the two laws read
is defined, then overrides every one that could carry a petal's value into a
leaf — so a leaf cannot change shape when a petal slider moves. **`sheetThickness`
is the declared exception**: it is the MATERIAL, and a leaf on a different
sheet from the petals it grows with would be two materials in one print.

The override list is the claim, and a list goes stale, so it is checked as an
IDENTITY: `node tools/verify-bloom-leaf-decoupled.mjs` sweeps every petal-side
control across its own registry range and requires not one emitted leaf float
to move. **199 control values × 2 modes, 0 moved**; `--control` neuters one
override in a real mutated module copy and the sweep finds it.

> Two corrections that run forced, both recorded because each looked right.
> `headRise` moved 7,644 leaf floats and it is **right** to — doming the head
> moves the hub's underside, which moves the stem's root, which moves every
> node hanging off it. Subtracting the node base afterwards was the first fix
> and was *also* wrong: it reintroduces its own rounding on a large z and left
> 6,597 floats "moved" on a leaf whose shape had not changed. Pinning the
> node's height before the build is the exact one.

## The census is the verdict, and it named a third defect

`bloom-smoke --conn` came back with **X2 on `LEAVES: whorled x 8 nodes`:
3180 within-shell intersecting pairs, worst span 0.3076 mm** — a new
self-intersection, not one of the 261 declared.

**Attributed by part, every one of them is a leaf's own PETIOLE against its own
BLADE.** That is the by-design overlap of a rod with the blade it holds, which
the export contract permits as a *cross-shell* overlap and which reads as a fold
only once the two shells have been welded into one. The table, at one whorl node:

| leaves built | shells | within | cross |
|---|---|---|---|
| 1 (azimuth 0)      | 2 | 0   | 192 |
| 2 (0, 120)         | 3 | 159 | — |
| 3 (0, 120, 240)    | 4 | 318 | — |

Each extra leaf adds **one** shell where it should add two, so the petiole and
the blade of leaves 1 and 2 are one shell and those of leaf 0 are not.

### The mechanism is measured, and it is exact

`petioleR` is `t / 2` — **the same double** as the blade's own skin offset,
because both come from `acc.floorThickness(sheetThickness)` — and the petiole
ring's binormal axis *is* the blade's normal at `u = 0`. So the ring vertex at
`sin a = 1` lands on `C + N·t/2`, the blade's base-row centre column, **to the
bit**. Counted directly: **0 exactly-shared vertices at azimuth 0, exactly 2 at
120°, exactly 2 at 240°.**

Two shared vertices weld the rod into the blade, and the classification moves
from cross to within on geometry that has not changed at all.

### It is the norm, not a coincidence — which is what decided the remedy

Swept over 360 azimuths at one degree: **325 weld and 35 do not.** `alternate`
(0, 180) and `opposite` (0, 90, 180, 270) sit entirely on the clear 9.7% at
every node; `whorled` does not.

So a `SELF_INTERSECTION_XFAIL` entry was **declined**. Its count would be a
function of which azimuths a phyllotaxy happens to land on — and #213 does not
gate magnitude, so the entry would absorb a real fold on that row in silence. An
xfail is a declaration somebody can check; this one would not have been.

**The fix removes the vertex rather than declaring the pairs.** Session 43's stem
cap is the precedent — a centre fan sharing the hub's apex vertex, made a rim fan
— and `NV = 10`'s reasoning is the same idea one solid later: the binormal axis
is exactly where the rod is **tangent** to the blade's skin, so the lattice
should straddle it rather than put a vertex on it. The ring starts a **half
step** round, `(i + 0.5)` of its own `sides`, derived from the ring's own step
and never typed.

### After

* **0 of 360 azimuths weld.**
* **All twelve block-33 rows read 0 within-shell pairs**, worst span 0.0000 mm,
  `directedMismatch` 0, in export mode.
* **Shells are exactly 2 per leaf**: 3 leaves → 16, 10 leaves → 30, 24 leaves →
  58, `GATED` (no leaf) → 10.
* **Triangle counts are unchanged to the integer.** A ring rotation is not a
  lattice change, and the serration is unmoved — still 0 / 9 / 10 teeth built at
  depth 0 / 0.26 / 1.00, the 10 being the cut law's own ceiling, clamped and told.

### The witness is the row that found it

The fix does not get a clause of its own, and it does not need one: **X2 on
`LEAVES: whorled x 8 nodes` is already the witness**, and it rides in the export
gate and in the smoke subset both. A shell count in the harness would be a second
producer of the vertex weld — the one thing the census owns — so the census stays
the owner and the row stays in the subset.

**It was caught by the subset only because that row is in it for a different
reason.** Block 33's anchor is `LEAVES: alternate x 3 nodes`, whose azimuths (0,
180) sit on the clear 9.7%; had the subset carried the anchor alone it would have
been silent. The whorled row is there for **LF5**'s per-node *spacing* claim —
120° apart on a three-leaf whorl — and it caught a defect nobody was looking for.
An iteration subset earns its keep by covering the axes a feature has, not the
failures somebody predicted.

> **And R1 fired on five leaf rows, exactly as its own comment predicted.** Both
> coverage instruments count the parts through a third accumulator that EMITS,
> so *"a NEW part that emits and is absent here makes R1 fire at once, which is
> what it did the first time a stem was built, on this exact clause."* The leaves
> are the second time it has caught a new part. Both tools now build them from
> `leafPlan`'s own record; R1 still sees only the ORCHESTRATION of parts and
> never a defect inside a builder, which is the declared blindness in both
> headers and is unchanged.

## The partition, the phase and the block

* **Matrix block 33, twelve rows.** Measured against main: **746 → 758, +12,
  −0**, and `ALL MAX` carries **no** leaf control (the family is hidden at
  DEFAULTS, so the blanket sweep never reaches it) — asserted by the byte tool
  rather than assumed, session 38's lesson.
* **`bloom-smoke --check` block count rose 28 → 29.** A green census that does
  not mention the new block is not a pass.
* **`frozen/phase31` is the 746 rows at `1fd0af5`**, registered in BOTH maps
  and proved deep-equal by `--verify-frozen`. *(The generator's first cut
  dropped the `capability` field and `--verify-frozen` went red on it — that
  check doing its job.)*
* **`tools/verify-bloom-leaf-bytes.mjs`** predeclares the partition from the
  **builder's own record** — a row moves iff `leafPlan` comes back present —
  and carries two controls, because its two clauses need two: `--control`
  perturbs a HOLDER and fires clause 1, `--control-only` perturbs a MOVER's
  shared prefix and fires clause 2.

  **Its own one-sided guard caught a third defect, in the tool itself.** The
  **GATED** row built on main and threw on the branch, and 52 further row-modes
  threw on both. One cause: **a matrix row's values are STRINGS and the
  geometry's guards are truthiness tests on numbers — `!'0'` is false**, so a
  zero-length leaf was built and a string reached arithmetic that wanted a
  number. The page never hits it (`readUI` hands back numbers) and the registry
  predicate is number-safe, so **LF0's two-statement clause is what would catch
  it there**; what needed fixing was the tool, which now uses the same coercion
  `verify-bloom-seam-bytes.mjs` does. **After it: 0 excluded, 0 one-sided.**

### The measured partition

```
758 rows x 2 modes, 759,870,288 base floats, Object.is
  11 MOVERS / 747 HOLDERS, predeclared from the builder's own record
  clause 1  movers that failed to move: 0 · holders that moved: 0
  clause 2  movers where anything but the leaves moved: 0
```

The 11 are exactly the block-33 rows that **build a leaf**. The twelfth —
`LEAVES: GATED` — is a **HOLDER**, which is ruling 6's guard proved by bytes
rather than argued. And there are **0 movers outside block 33**: `ALL MAX` and
every other row in the matrix is bit-identical, so the feature reaches nothing
it was not asked to.

> The first run predeclared **12/746** and was wrong for the same string-vs-number
> reason: `movesByRecord` asked the builder, the builder was handed `'0'`, and
> the GATED row counted as a mover. The predeclaration reading the builder's
> record is what makes that visible — a list of control names would have said
> 12 and stayed saying 12.

## Cost

2,548 triangles a leaf, fixed — the lattice does not vary with size. The worst
the controls reach is 24 leaves (whorled × 8 nodes) = **61,152**, and leaves are
not per-petal, so they are not multiplied by a 240-petal head. The shipping
default is unchanged at 19,040.

## Reported, not solved

The cantilever. The worst lever the controls reach is a 120 mm leaf on the
petiole's derived 1.2 mm diameter — **L/d = 100** — and the read-out prints
it on every leafed build, joining the stamens' and style's line verbatim:
**UNMEASURED — no coupon has been printed.** Clamp and tell, never refuse.
