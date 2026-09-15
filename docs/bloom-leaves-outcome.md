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

  **Its own one-sided guard caught a third defect, in the tool itself.** 52
  row-modes throw identically on BOTH trees — this tool drives
  `buildBloomInto` directly and applies no `capability` hook, which is the
  page's to apply — and those carry no information about the partition, so
  they are excluded and COUNTED. A row that throws on **one** tree is a real
  regression, and one did: the **GATED** row built on main and threw on the
  branch, because **a matrix row's values are STRINGS and the geometry's guards
  are truthiness tests on numbers — `!'0'` is false.** The page never hits it
  (`readUI` hands back numbers) and the registry predicate is number-safe, so
  **LF0's two-statement clause would have caught it there**; what needed fixing
  was the tool, which now uses the same coercion `verify-bloom-seam-bytes.mjs`
  does.

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
