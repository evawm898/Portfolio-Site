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

### And the defect was MODE-DEPENDENT, which is worse than arbitrary

The sweep above names its mode and its sampling, because the rule requires it and
because the answer moves. Sampling: every azimuth of a 1-degree sweep, 360 states,
one whorl node, counting a leaf as welded if its petiole and blade share **any**
vertex exactly.

| sheet | mode | floored `t` | `petioleR` | welded, pre-fix | welded, shipped |
|---|---|---|---|---|---|
| 1.20 | LIVE | 1.200 | 0.600 | **325** of 360 | **0** |
| 1.20 | EXPORT | 1.200 | 0.600 | **325** of 360 | **0** |
| 0.60 | LIVE | 0.600 | 0.300 | **340** of 360 | **0** |
| 0.60 | EXPORT | 1.000 | 0.500 | **324** of 360 | **0** |

At the shipping sheet the two modes agree, because 1.20 is above `MIN_FEATURE_MM`
and `floorThickness` returns it unchanged. **At 0.60 they do not** — the export
floor takes `t` to 1.000 and `petioleR` with it — so on the pre-fix tree **whether
a leaf was one shell or two differed between LIVE and EXPORT on 16 of 360
azimuths.** Which shells a solid has is topology, and this project has refused a
mode-dependent topology four times before (session 32's ladder, 38's seam step, the
fringe's count threshold, 42's lamina). The half step reads **0 in both modes at
both sheets**, so it removes the mode-dependence as well as the weld — measured,
not argued from the fact that both quantities come from one `floorThickness` call.

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

## And CI named a FOURTH, in another family's clause — ST9

`bloom-connectedness` went **RED in CI** on `cca9464` with **0 rows not one
piece**: the flood fill was clean on all 756 rows that reached the results,
every one of the twelve leaf rows read `components=1 stray=0`, and what failed
was **one row DROPPED by a validity assertion**.

```
connectedness: HARNESS INVALID — 2 validity assertion(s) failed. No result above is trustworthy.
  - LEAVES: x a SPHERE with a stem (the channel and the leaves on one head): ST9: 198
    exported vertex/vertices stand inside the 1 mm printable gap of the free stem and
    are not the stem's own — nearest 0.0000 mm at [1.547,0.58,-34.964]. The channel is
    not clear in the file that will be printed.
  - row census: 758 rows attempted but 756 reached the results — dropped: LEAVES: x a
    SPHERE with a stem (the channel and the leaves on one head)
```

**Two assertions, ONE root**: ST9 fired, which drops the row, and #220's row
census then reported the drop. That census is the reason this was diagnosable
from the summary line rather than from a hunt — it names the dropped row and
the clause that dropped it, and the verdict says *"Nothing above is a pass"*
where the old headline would have divided by the survivors and read 756/756.

### It is the R1 lesson in a clause nobody thought to check

ST9 is the sphere-stem session's: it reads the EXPORTED STL and asks whether
anything stands inside the free stem's printable gap that is not the stem's
own. Its purpose is to doubt the **petal-omission mask** — to catch a petal the
mask failed to remove — and it reads none of the channel's own report, which is
what makes it worth having beside ST7.

**A leaf is the third part ever to live in that region, and it is there by
design.** The petiole is rooted THROUGH the stem's wall, so it stands *inside*
the free stem's outer cylinder; ST9's distance is to the solid cylinder, so
every embedded vertex reads **exactly 0**. The nearest one is at
`[1.547, 0.58, −34.964]`, i.e. radius **1.652 mm** — which is
`rootR − petioleR = 2.25 − 0.60` to the bit: the petiole's inner skin at the
wall's mid-thickness, exactly where the geometry puts it.

This is the same class the leaf work had already hit once and fixed: *"a NEW
part that emits and is absent here makes R1 fire at once."* Both coverage
instruments were taught the leaves; **ST9 was not, because nobody looks for a
clause in another family that reasons about a region.** The two parts that
already lived below the hub are *both* already declared exempt from it — the
stem's own vertices, which stand at `outerR` or `boreR` exactly, and the hub's
own outer surface — so the exemption is a pattern the clause already had, not a
new kind of concession.

**Attributed by part, and the attribution is what settles it:** of the 198,
**198 are a petiole's own and 0 are anything else.** So the channel was clear
of petals on the row ST9 dropped, and a clearance criterion means nothing
between two solids that are *fused* — which is what ST9's own scope sentence
already says about the root band inside the hub, and what this project measured
on a flat head, where all eight feet read 0.000 mm from the free stem because a
foot's bottom skin is coplanar with the hub's underside.

### The fix names the PETIOLE and does not widen the REGION

That distinction is the fifth durable rule doing its work. **A region wide
enough to hold a petiole is wide enough to hold a petal**, so a clause that
excused the stem's whole interior could not fail on a petal driven straight
through it — green forever, in scope, and empty. What ships instead is the
rod's own axis SEGMENT, one petiole radius wide:

* **The axis is the one the BUILDER emitted** — the two petiole rings' own
  centroids, reported as `petioleAxis` beside `emittedRootR` and for its
  reason. Re-deriving it here from `leafPlan`'s `rootR` and `angleDeg` would be
  a second producer of it, and a rod emitted somewhere other than where the
  plan says is session 43's ST2 measured firing nothing.
* **Its owner is the LEAF builder, which is not the quantity under test.** ST9
  is about the stem channel and still reads none of its report, so the fourth
  durable rule is satisfied: the reference and the measured side have different
  owners.
* **The slack is the file's own float32 quantisation** (the same `TOL` the radii
  use), because the rod's vertices stand at *exactly* `radiusMm` from that axis.
* **A row with no leaves has no rods** and every expression is the pre-leaf one
  verbatim — measured silent on every sphere-stem row that shipped before this
  session.

Three measurements, and the second is the one that makes it a fix rather than a
carve:

| | |
|---|---|
| **the dropped row** | ST9 **silent**; 198 excused, **0 intruders** |
| **the exemption is LOAD-BEARING** | with the rods emptied ST9 reports **198** again on that row, **1584** on a 24-leaf whorl — so the exemption is what moved the answer and nothing else did |
| **it cannot swallow a petal** | one synthetic vertex 0.4 mm outside the wall, mid-free-stem, at an azimuth no rod occupies → ST9 **FIRES**, `nearest 0.4000 mm`, on every row tried |

### And the sweep found a real printability finding that is NOT the channel's

Swept over head shape × leaf angle × stem diameter, ST9's `other` count — a
vertex that is neither the stem's, the hub's, nor a petiole's — is **0 on all
35 states**, so the omission mask is clear everywhere on that grid. What *does*
appear above 60° is the leaf's **BLADE**, which is not excused and should not
be. Measured as a pure geometric quantity with no ST9 in it — the nearest
approach of any blade vertex to the free stem's solid:

| `leafAngle` | −60 | −30 | 0 | 20 | **35** | 50 | 60 | **70** | 75 | 80–90 |
|---|---|---|---|---|---|---|---|---|---|---|
| nearest approach, mm | 1.853 | 4.356 | 5.492 | 4.910 | **4.019** | 2.804 | 1.853 | **0.824** | 0.289 | 0.000 |

**Identical on a CAP and on a SPHERE to four decimals, and identical in LIVE
and EXPORT** — so it is a property of the leaf against the stem and has nothing
to do with spheres or with the channel; ST9 merely happens to be the only thing
that looks there. **From `leafAngle` 70° up the blade approaches the stem below
`MIN_FEATURE_MM`**, the top fifth of a −60…90 range. **Eva's ruled 35° reads
4.019 mm — four times the printable gap** — and the drooping end is clear at
1.853.

**Reported, not solved, and not gated**, which is the treatment this project
gives §18a's `cup × petalTipShape` (1.031 → 0.832 mm) and session 34's
composition finding: two controls both pushed, no closed form in either alone,
neither control alone doing it, and **the matrix varies one control at a time
so it is invisible to it by construction.** Narrowing `leafAngle` would remove
states nothing has ruled against, on the strength of a threshold that is itself
a declared guess (§18b — nothing in this project has ever been printed). The
one thing done about it is that **ST9's message now says what it cannot tell
apart**: where a build has leaves it names that only their petioles are
excused, so *"the channel is not clear"* does not send a reader looking for a
petal that is not there.

### The subset was blind to it, and that is the lesson worth keeping

`bloom-smoke --conn` was **clean locally on all seven of its leaf rows** before
this reached CI. The subset covered phyllotaxy, the bore, the angle, the inset,
the serration and both guards — every axis the feature has — and **not the one
axis that reaches another family's clause.** Block 33's anchor is the
`alternate` row on a CAP head, where ST9 returns before claiming anything.

So `LEAVES: x a SPHERE with a stem` is **in the subset now** (85 rows, 29
blocks, 90 families all claimed both directions). The X2 defect earlier in this
session was caught by a subset row that was there *for a different reason*; this
one was missed because no row was there for this reason at all. **A subset earns
its keep by covering the axes a feature HAS — including the axis that is another
family's region.**

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
