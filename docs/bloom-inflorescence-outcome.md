# Inflorescence, session 1 — instancing and one raceme

Eva's twelve rulings are in `docs/bloom-inflorescence-discovery.md` and they govern.
This is what the first session built against them, what it measured, and the EIGHT
things it found that nobody had asked about.

Scope, from ruling 5: **instancing, plus one raceme of identical florets. Nothing
else.** No presets (ruling 10), no compound levels, no cymes, no depth beyond 1, no
maturation ramp, no bud pose (ruling 6), no droop, no axis curvature (ruling 8), and
the capitulum untouched (ruling 1).

---

## 1. Phase A — the head IS a pure function, so nothing stopped

The brief's stop condition was *"if the head is not a pure function of definition and
transform, STOP and report the cost."* It is one, and the audit is the evidence rather
than the assurance:

* **`bloom-geometry.js` holds no module-level mutable state.** Every `let` at module
  scope is `const`; the four `last*` variables live in `bloom.js` and are written
  AFTER a build returns, so they are a record of the last build and never an input to
  the next one.
* **`buildBloomInto(acc, state, capability)` reads `state` and `capability` and
  writes `acc`.** It calls `footRing`, `stemPlan`, `leafPlan`, `sepalBladeState` and
  the builders; every one of them takes its state as an argument.
* **It IS origin-locked** — the hub is centred on `[0, 0, 0]`, the stem runs down the
  world axis, `footRing`'s rings are concentric about it, and `stemOmission` reasons
  about the world z axis by name. That is what Route A exists for: the head is built at
  the origin into its own accumulator and appended under a rigid transform, so nothing
  in it needs to learn where it stands.

**One finding against the discovery.** It expected `below: 'branch'` to be needed for a
head that hangs off an axis. `below` is VALIDATED by `buildBloomInto` and read nowhere
else on this tree — `grep` finds one write and no consumer — so a third value would be
a name with no meaning. The floret passes `below: null` and the throw is left as it is.

## 2. The cost, measured before anything was built

One head, both modes, on this box. `build` is the accumulator pass alone.

| state | live tris | export tris | STL KiB | build live/export ms | petals | max dim mm |
|---|---|---|---|---|---|---|
| DEFAULTS (8 radial, 1 whorl) | 19,040 | 19,040 | 929.8 | 70 / 79 | 8 | 81.6 |
| the MUM (CONT 40/turn x 3, spread 0.60) | 282,912 | 282,912 | 13,814.1 | 1085 / 988 | 120 | 116.0 |
| the INCURVE TARGET (flat) | 282,912 | 282,912 | 13,814.1 | 3341 / 3362 | 120 | 26.6 |
| the INCURVE SPHERE | 289,440 | 289,440 | 14,132.9 | 3363 / 3177 | 120 | 45.9 |
| RADIAL 40 x 6 whorls (240 petals) | 565,632 | 565,632 | 27,618.8 | 2102 / 2127 | 240 | 133.9 |
| DEFAULTS + 60 mm stem + 3 leaves | 28,792 | 28,792 | 1,405.9 | 105 / 103 | 8 | 81.6 |
| floret 5 x 20 x 8 mm | 11,972 | 11,972 | 584.7 | 44 / 42 | 5 | 44.9 |
| floret 3 x 20 x 8 mm | 7,260 | 7,260 | 354.6 | 25 / 26 | 3 | 39.3 |
| floret 3 x 20 x 8 + a 20 mm pedicel-as-stem | 9,176 | 9,176 | 448.1 | 26 / 24 | 3 | 39.3 |

Projected by multiplication (heads alone, no rachis, no pedicels), against the
1,500,000-triangle `EXPORT_TRI_BUDGET`:

| heads | DEFAULTS | floret 5 | floret 3 | the MUM |
|---|---|---|---|---|
| 12 | 228k (15%) · 11 MiB | 144k (10%) · 7 MiB | 87k (6%) · 4 MiB | 3,395k **REFUSED** |
| 50 | 952k (63%) · 45 MiB | 599k (40%) · 29 MiB | 363k (24%) · 17 MiB | 14,146k **REFUSED** |
| 150 | 2,856k **REFUSED** | 1,796k **REFUSED** | 1,089k (73%) · 52 MiB | 42,437k **REFUSED** |

**Where the budget bites, in heads:** DEFAULTS 78 · floret 5 125 · floret 3 206 · the
MUM **5**.

**SO A REDUCED FLORET IS NEEDED AND RULING 4 IS SUFFICIENT — measured, not assumed.**
A raceme of MUM heads is unbuildable past five, and a raceme of DEFAULT heads past 78;
the petal-count reduction ruling 4 names takes a floret to 11,972 triangles at five
petals and 7,260 at three, with `NU` untouched. The node ceiling this session ships is
12 nodes x 3 a node = **36 florets**, which the floret-5 column clears with room. What a
floret DROPS is nothing beyond its petal count: it is the shipped `buildBloomInto` with
six state overrides and inherits every other control from the head (ruling 10).

**AND THE PEDICEL IS THE FLORET'S OWN STEM, WHICH IS THE ARCHITECTURAL FINDING OF
PHASE A.** A floret with a pedicel is ONE `buildBloomInto` call, not a head plus a rod:
`floretState` sets `stemLength` to the pedicel's length and `stemDiameter` to twice its
derived radius, and the shipped stem builder does the rest. So the only NEW join in the
whole feature is pedicel-tip-to-rachis-wall, which is the LEAF PETIOLE's problem
already solved (`rodWallRootMm`, `rodWallCrossingMm`) — and `buildHubInto`'s
hub-to-stem join generalises with nothing added, because it is the floret's own head
joining the floret's own stem at the origin, in the floret's own frame.

**ONE BUILD, N APPENDS.** `buildInflorescenceInto` builds the floret unit ONCE into a
sub-accumulator and appends that one stream under N rigid transforms, so build time is
**O(1) in the node count**, not O(N). That is ruling 5's "identical florets" cashed as a
cost rather than only as a look, and it is why per-node deltas (ruling 10's second half)
are a later session: they would make this a build per distinct state.

## 3. What shipped

**`inflorescence`** (Inflorescence section, NONE / RACEME, default NONE) with six
sub-controls in a nested **Floret** section, all hidden AND inert at NONE and on a bloom
with no rachis:

| control | range | default | what it is |
|---|---|---|---|
| `floretNodes` | 1–12 | 5 | nodes down the rachis; CLAMPED by the pitch floor and told |
| `floretPhyllotaxy` | alternate / opposite / whorled | alternate | the LEAF's own three, through `leafAzimuths` |
| `floretPetals` | 3–12 | 5 | ruling 4's petal-count reduction, `NU` fixed |
| `floretScale` | 0.20–1.00 | 0.60 | a MULTIPLIER on the head's own two petal sliders |
| `pedicelLength` | 5–60 mm | 20 | the floret's own `stemLength` |
| `pedicelAngle` | −60..90 deg | 35 | from the rachis, the leaf's own convention |

**NOTHING IS A SECOND OWNER.** The node placement is `leafNodeDepthsMm`, the
phyllotaxis is `leafAzimuths`, the rod's root radius and embed are `rodWallRootMm` /
`rodWallEmbedMm`, the crossing is `rodWallCrossingMm`, the petal ranges the floret's
size clamps into are `OVERRIDE_BOUNDS`, and the printable gap is `MIN_FEATURE_MM`. The
one thing this session adds to the geometry's vocabulary is
`MeshBuilder.appendTransformed(other, M)`. The rachis distance is
`freeStemDistanceMm`'s — its first cut wrote that function out again, which is the same
duplicate-expression defect `rodWallRootMm` had just been extracted to fix, in the same
file on the same day, and it was found by reading the diff against the combination
gate's own `leaf-stem` measure rather than by a failure.

**THE PEDICEL'S RADIUS IS DERIVED AND IS NOT A CONTROL** — the area rule read downward,
`r_rachis / sqrt(N)`, floored at `STEM_DIAMETER_RANGE[0] / 2` and TOLD. On the shipping
6 mm rachis the floor binds from five florets up; at two it is 4.24 mm.

## 4. The eight findings

### (i) The area rule reads the ASKED count, because the built one is a fixed point

ID2 first rebuilt the pedicel radius from the BUILT floret count and went red on two
rows. It is circular: the pitch floor is `2 * pedicelR`, so a radius derived from the
count that floor produces is **count -> radius -> floor -> count**. That is the feedback
the `headRise` ruling refuses ("a metric consumed as a geometric input becomes a
target") and the reason session 32's per-state ladder gate was withdrawn. The ASKED
count is also conservative in the right direction: fewer built than asked gives THINNER
pedicels off the same rachis, never thicker. ID2 rebuilds it from the CONTROLS.

### (ii) A floret is a bloom, so its own stem channel fires inside it

On a SPHERE head the floret is a SPHERE head too, and the sphere-stem session's omission
mask takes the petals its own pedicel would pass through: **4 petals of 5 asked**,
measured. ID4's first clause demanded all five and went red. Widening it to a `<=` is the
vacuous repair; the shipped clause predicts the asked count LESS the floret's own
channel's tally, read from `stemOmission()`'s record, with the channel's EXISTENCE
asserted as a biconditional against `sphereMode` on the head's own controls.

This is the class `CLAUDE.md` already names — *an instrument that indexes by slot and
never asks whether the slot was built* — arriving one part later.

### (iii) O1's declared inward count is over the FILE, and a raceme puts N blooms in it

`INFLO: x a SPHERE head` read **6 of 47 shells wound INWARD against a declared baseline
of 1**. Correct geometry: the head's inner sphere plus five florets' own. The baseline is
now `inwardOf(head) + count * inwardOf(floret)`, with `inwardOf` written ONCE and applied
twice, and the floret's record read from the BUILDER. The cavity clause was also
re-stated as *some* inward shell is the bore's prism rather than the NEAREST one: with N
florets the inward population gains N candidates and a nearest-by-volume match can be
dragged onto one of them.

### (iv) ST9 — the pedicels are rods and are excused; the floret's BODY is reported

`INFLO: x a SPHERE head` read **1554 exported vertices inside the rachis's printable
gap**. A pedicel is rooted THROUGH the rachis wall by design (ID2 asserts it crosses
solid), exactly as a petiole is, so it reads distance 0 and is excused on the axis its
OWN builder emitted, one rod radius wide — the fifth durable rule, and the leaves' own
measured precedent. ONE list and ONE test now serve both rod families. That took 1554 to
**144**.

The remaining 144 are the FLORET'S OWN BODY, at **0.8234 mm**, and they are REPORTED
rather than gated. ST9's subject is the stem CHANNEL — a region the design says must be
EMPTY — and a floret hangs BESIDE the rachis on its own pedicel; two parts of one solid
fusing is OVER-connection, which is the crowding ruling's own grounds (Eva, Sep 3): it
adds no boundary edge and splits no flood fill. The declared floret blocks are CHECKED
where they are used — disjoint, in range, and totalling the builder's own tally — so a
block range that swallowed the head cannot silence the clause, and a head petal driven
into the channel is outside every block by construction.

**Swept, as a pure geometric quantity with no ST9 in it** (nearest approach of any floret
vertex that is not on its own pedicel rod, to the free rachis's solid):

| pedicelAngle | SPHERE head, live \| export | CAP head (the default), live \| export |
|---|---|---|
| −60 | 0.0000 \| 0.0000 | 0.0000 \| 0.0000 |
| −30 | 1.3326 \| 1.1345 | 11.3903 \| 11.3906 |
| 0 | 3.5189 \| 3.2733 | 18.5015 \| 18.5015 |
| 25 | 1.7331 \| 1.4731 | 14.3624 \| 14.3624 |
| **35 (shipped)** | **0.9230 \| 0.8234** | **8.2472 \| 8.2475** |
| 45 | 0.0544 \| 0.0544 | — |
| 60 / 75 / 90 | 0.0000 | 0.0000 |

A SPHERE floret's petals radiate back toward the rachis and a CAP's do not — a factor of
ten at the same state. The read-out carries the number on every build with an
inflorescence and says when it is under the printable gap.

### (v) The mode rule caught a clause written minutes earlier

The first version of ST9's floret report compared the BUILDER's flag against the FILE and
went red: **0.9230 mm against 0.8234**. `__bloomMetrics()` reports the LIVE build and the
STL is the EXPORT one. This project's first durable rule, inside a clause from the same
hour. The honest repair is not a tolerance — the difference is the TIP print floor
(0.15 mm live, 0.80 export) closing the gap by an amount no closed form in the sheet
thickness predicts — so the comparison is DROPPED and the blindness declared: the flag
serves the read-out, this serves the file, and neither claims to be the other.

### (vi) `floretScale`'s dead travel, told and not trimmed

The size is a multiplier clamped into each petal slider's own range, so on the shipping
35 x 16 mm head the LENGTH stops moving below **0.571x** and the WIDTH below **0.500x** —
about a third of the travel drawing one floret. No static range is dead-free (the
releasing scale is a property of the HEAD's two sliders) and an adaptive minimum would
make one slider position mean different shapes on different heads, so the range is
UNCHANGED and the number is printed on the control — `stamenSpread`'s ruling, with the
carnation terminal's low-end case: the dead stretch is at the BOTTOM of the track, so NO
HATCH is drawn. `sizeDeadBelow` is the plan's, and ID4 pins it twice — against the ranges
and the head's own sliders, and as a biconditional against the clamp beside it.

### (vii) A second producer, found by the mutant table's anchor scan

`const rootR = (stem.boreR + stem.outerR) / 2` existed in `leafPlan` and, the day the
pedicel arrived, in `inflorescencePlan` — so the ID2 mutant's anchor **matched twice**,
mutated the LEAF's and said nothing about the pedicel it names. That is §9b(i) of the
seam session verbatim, and the anchor pre-check is what caught it before any mutant ran.
Fixed by giving the expression one owner (`rodWallRootMm` / `rodWallEmbedMm`), never by
narrowing the string.

**AND A PRE-EXISTING MUTANT WAS DISARMED ON `main`.** `sepal-height-ignored`'s
find-string read `stemEnd.z + frac * extentMm` where the shipped expression reads
`zStemEnd + frac * extentMm` — **0 matches on BOTH trees**, so it had never applied and
no run had said so. Re-anchored here.

### (viii) The ID5 witness took three attempts, and every failure was an envelope being blind

`the-append-drops-the-translation` drops `M[3]` from `appendTransformed`, so every floret
is built at x = 0 however far off the axis its pedicel reaches. The mutation applies, the
export is watertight, one piece, and the triangle count and STL byte length are identical —
which is the whole argument for ID5. Its WITNESS is what was hard:

1. **`maxDimensionMm` reads 137.251 on both trees.** It is the LARGEST of the three
   extents, and on a raceme that is the RACHIS — 120 mm down z, which no placement defect
   can move.
2. **The whole bloom's X extent reads 81.638 on both trees.** The HEAD is 81.6 mm across
   and florets on 20 mm pedicels reach less than that, so the collapse is inside the
   envelope.
3. **"The block lands at zero" is the wrong bar** — it reads 2.9029 where the clean block
   reads 21.4942, because only the OFFSET is dropped and the rotated unit keeps its own
   centroid.

The shipped witness reads the first placed block's centroid out of the emitted stream at
the offset the BUILDER declared, and compares it against the clean block's centroid LESS
that placement's own declared translation — an exact identity, with the translation
required to be more than a millimetre so the probe state is not vacuous. **An envelope is
the natural thing to reach for and it was blind twice**; a witness has to probe the thing
the mutation acts on, which here is where a block LANDS.

**And `the-placement-carries-a-scale` legitimately reddens ID6 as well as ID3** — a scale
on the rotation also scales the axis the head is facing along — which the table prints as
collateral rather than treating as a failure.

## 5. R1 fired on the new part, for the third time

Both coverage instruments' R1 counts the parts through a third accumulator that EMITS.
It fired the first time a stem was built, again for the leaves, and again here:
`coverage R1: petals-only + hub-only + centre-only = 21148, but a normal whole-bloom
build has 90588`. Both instruments build the florets from `inflorescencePlan`'s own
record now. Its own comment predicted this; that is the clause working.

## 6. The verification

**All 23 `INFLO:` rows PASS the export gate**, in four chunks: 9 + 8 + 5 + 1, every one
watertight with boundary = 0, degenerate = 0, and identical live and export triangle
counts.

| row | export tris | KiB |
|---|---|---|
| the raceme (5 florets) | 90,588 | 4,423 |
| ONE node | 35,228 | 1,720 |
| 12 nodes | 187,804 | 9,170 |
| OPPOSITE (10 florets) | 160,028 | 7,814 |
| WHORLED (15 florets) | 229,468 | 11,205 |
| 3 petals a floret | 67,028 | 3,273 |
| 12 petals a floret | 173,048 | 8,450 |
| x SEPALS | 161,268 | 7,874 |
| x a full CENTRE | 116,508 | 5,689 |
| x a SPHERE head | 110,540 | 5,398 |
| **ALL MAX (36 florets)** | **1,114,828** | **54,435** |
| GATED (type NONE) | 21,148 | 1,033 |
| GATED (no rachis) | 19,040 | 930 |

**`INFLO: ALL MAX` DOES NOT REFUSE — 1,114,828 of the 1,500,000 budget, 74.3%. THE ROW
EXISTS AND THE `EXPORT_REFUSED_XFAIL` ENTRY DOES NOT, AND THAT IS A DISAGREEMENT WITH
RULING 9 RATHER THAN A SHORTFALL.** Ruling 9 asks for the sub-controls out of the blanket
sweep "with one declared `INFLO: ALL MAX` refusal row". The ROW is built and is in the
matrix — 12 nodes x whorled x 12 petals x size 1.00 x a 60 mm pedicel straight up, the
corner the sweep no longer reaches — and it simply does not breach: 36 florets at 30,380
triangles each plus the head. So there is nothing to declare, and nothing was manufactured:
widening a range until a row refuses would be tuning a control to exercise a gate, which is
the `ALL MAX` ruling's own refusal (#230) read the other way round. The ceiling is
**REPORTED with its headroom** and the day a later session raises the node cap or a
per-node delta lands, that row is where it will breach and the entry is one line.

**THE MUTANT TABLE PASSES ON ALL SEVEN, and the clean tree is silent on every row:**

```
ANCHORS: 59 mutants, 59 matching their find-string exactly once
CONTROL (unmutated tree): the family must be SILENT on every row
  fired: (none)
      names ID0 · fired ID0   ok
      names ID1 · fired ID1   ok
      names ID2 · fired ID2   ok
      names ID3 · fired ID3, ID6   ok
      names ID4 · fired ID4   ok
      names ID5 · fired ID5   ok
      names ID6 · fired ID6   ok
APEX MUTANT TABLE (SUBSET of 7/59): each selected family fires on a mutation that
names it, and is silent on the clean tree. THIS IS NOT A SWEEP — 52 mutants were
not run.
```

Every mutation is a real edit to `bloom-geometry.js` served in flight, every witness is a
direct call on the MUTATED module and is deliberately not the assertion the mutant names,
and every one of the seven exports **watertight, as one connected piece, at the triangle
count its own row predicts** — which is the argument for the family existing at all.
`the-placement-carries-a-scale` reddens ID6 as well as ID3, printed as collateral.

**AND EVERY ONE OF THEM IS ONE CONNECTED PIECE — the invariant, measured on the voxel
flood fill rather than argued from the joins:** `verify-bloom-connectedness --only
"^INFLO: (?!ALL MAX)"` reads **22 attempted · 22 reached the results · 22 are ONE
connected piece**, every row `components=1 stray=0 boundary=0`, in 210 s — and
`INFLO: ALL MAX` separately, at **1,114,828 triangles, `components=1 stray=0
boundary=0`**, in 77 s. **All 23 rows: watertight AND one piece.**

**The smoke census is green and the block count rose**: 105 smoke rows over **33** matrix
blocks of 883 rows, and **109 families asserted, 109 claimed, both directions** — ID0
through ID6 among them.

**THE PANEL GATE REFUSED BOTH NEW SECTIONS ON ITS FIRST RUN, AND WAS RIGHT TO:** *section
"inflorescence" ships collapsed but names no geometry witness in WITNESS — the reactivity
assertion for it would be vacuous*, and the same for "floret". Each now names one, through
a number the control cannot write directly — the table's own discipline. **The
inflorescence's value is the range FLOOR, 1, and that is measured rather than tidy:** the
area rule is already below its print minimum at the shipping five nodes (6 mm / 2 /
sqrt(5) = 1.34 against 1.50), so going UP reads `pedicelR` 1.5000 twice and half the
witness would be a number printed twice; at one node it is 3.0000 and both halves move.
The floret's is the UNIT's own triangle count — 13,888 at five petals, 9,176 at three.

## 7. What is NOT built, and why

* **No presets.** Ruling 10 makes a preset a button that writes slider values, never a
  registry row; ruling 5 puts it out of this session either way.
* **No per-node deltas.** Ruling 10's second half. It would make the build a build per
  distinct state and give up the O(1) above; it is the natural next session.
* **The GRID export writes the head at the origin only.** A raceme's florets are not in
  the `.glb`, and the read-out says so on every build with an inflorescence. Closing it is
  `bloom-grid-gltf.js`'s own change.
* **No combination-gate row, and the rejection holds for a SECOND reason once heads are
  instanced — measured, not argued.** Two things were asked: whether the gate's rejection
  of arrangement controls survives instancing, and if not, what would have to change.

  **(1) `self` still cannot see it.** The gate's headline measure is `measureWall(grid).self`
  on ONE petal, and an inflorescence control moves where a whole HEAD stands. CG1 would
  refuse such a pair as inert exactly as it refused `leafToothDepth`.

  **(2) The measure a floret pair WOULD want exists, was built and was swept — and it
  fails the gate's own BAR rather than the geometry.** The quantity is §4(iv)'s
  floret-against-rachis approach; the builder computes it through `freeStemDistanceMm`,
  the same owner the gate's `leaf-stem` measure calls, with the pedicel rod excluded on
  the axis the builder emitted. Two candidate grids, EXPORT, on a 120 mm rachis:

  | `pedicelAngle` | CAP head | SPHERE head | | `pedicelLength` 20 | 5 | 40 | 60 |
  |---|---|---|---|---|---|---|---|
  | **35 (default)** | 8.248 | **0.823** | | 8.248 | **0.000** | 24.630 | 41.013 |
  | −60 | **0.000** | **0.000** | | **0.000** | **0.000** | 1.998 | 11.998 |
  | 60 | **0.000** | **0.000** | | **0.000** | **0.000** | 1.998 | 11.998 |
  | 90 | **0.000** | **0.000** | | **0.000** | **0.000** | **0.000** | **0.000** |

  Both grids are `single-reaches` — the hazard is `pedicelAngle` ALONE (and
  `pedicelLength` alone at 5 mm) — and **11 of 16 cells are under the bar on each.**
  Carrying either would mean declaring eleven `COMBINATION_XFAIL` magnitudes, which is
  precisely the recurring cost Eva's #265 ruling names, **for a thing this project already
  rules a FLAG**: `MIN_FEATURE_MM` is the minimum printable GAP, and a floret touching its
  own rachis is OVER-connection — the crowding ruling's own grounds, and the same
  reasoning that keeps the floret's body out of ST9's count.

  **So what would have to change is the BAR, not the row list**, and no pair is added. A
  gate that declares eleven magnitudes against a bar that does not apply to them says
  nothing, and the number is TOLD on every build instead.
