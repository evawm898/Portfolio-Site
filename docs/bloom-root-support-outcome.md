# Root support — sepals and leaves take the root law; the foot clamp is derived

*Oct 21, Eva's two rulings. Base: `main` at `8403b47` (big petals, #434).*

Read [`bloom-big-petals-outcome.md`](bloom-big-petals-outcome.md) first: this session
finishes what its §3b left open (sepals pinned off, leaves never wired) and replaces
the fixed 10 mm foot clamp its §7 reported binding over 56% of the width slider.

## 1. What was ruled

1. **Sepals and leaves take the root law.** ONE law and one owner
   (`petalRootTaper` / `petalRootTaperFor`), each organ at its OWN length against the
   35 mm / 1.2 mm reference, the identity BY BRANCH at or under 35 mm.
2. **The fixed 10 mm foot clamp is replaced by a cap derived from the hub — the arc
   each foot owns at its ring.** A length from lengths, never typed; clamped and told;
   `footRing()` stays the one owner; the floors do not move.

## 2. Sepals

- **The pin is lifted.** `sepalBladeState` no longer sets `rootTaper: 'OFF'`. A sepal is
  the petal builder on a second ring, so the one law (`thicknessProfile`) reaches it
  through `petalRootTaperFor(ps, bladeAskedLengthMm(ps))` with nothing else changed —
  the seam clearance, the fold limit, the cup fold clamp, the roll floor and the rim
  bead all follow, as they do on a petal. `petalRootTaperFor` keeps the pin's READ as
  the one place an organ could be held off the law.
- **Each tier reads its own length** (`sepalAskedLengthMm(st)` on the tier's state:
  the own `sepalLength`, else the petal's × `sepalScale`).
- **The descriptor's foot height follows the root**: the foot's bottom skin passes
  through the attachment, so the ring row stands half the ROOT's thickness above it
  (half the sheet by branch at or under 35 mm).
- **The angle limit's seam step reads the sepal's root factor** (the bucket's
  `seamClearanceMm(…, rootFactor)`). Its contact test still compares laminae against
  one sheet (`t`), not each root's own thickness — **declared, not changed**: the
  contact half-thickness under a thickened root is under-counted by up to
  (τ_r − 1)·t/2 near the roots, and the drawn limit is therefore slightly permissive
  there. Recorded as the one open follow-up of this ruling.

### 2a. What "the hub thickens to match" means for a sepal — decided and measured

A sepal does not stand on the plate's rim the way a petal does: on a stemmed bloom
it stands partway down the hub-to-stem JOIN's flare (`sepalHeight`), where the
material above the attachment is the plate plus whatever the join adds. The question
was whether that flare already carries a thicker root, or whether the plate must
follow. **Measured** (`sepalHeight` 0.25 / 0.75 / 1.00, stems 6 and 12 mm, lengths
40–120 mm, 30 states): **with the plate held at the sheet, 23 of 30 states have less
material above the attachment than the sepal's own root** (at `sepalHeight` 0.75: −0.57
mm at 60 mm on the 6 mm stem, −3.43 mm at 120 mm). The flare alone does not carry it.

**Decision: the plate is held to the LONGEST BLADE IT CARRIES, sepals included** —
`hubRootTaperLengthMm` is `max(the petals' bound, every built tier's sepal length)`.
A 120 mm sepal puts a **4.961 mm** plate under the bloom (×4.134 the sheet).

**Consequence, stated rather than worked round:** the join's thickness is floored at
the plate (#434), so a plate thicker than the join the stem asks for makes the join
**inert** — and a sepal on an inert join stands on the RIM (the existing fallback,
told). Measured: on the 6 mm stem every sepal from **80 mm** up stands on the rim; on
the 12 mm stem from **120 mm**. Block 76's `8 sepals x 120 mm x stem 60` row is that
state.

## 3. Leaves

- **The one law at each blade's own length**: `leafBladeLaw` takes the root's length
  as a separate argument (`rootLengthMm`) **named at every call** — the simple leaf's at
  its node, each COMPOUND LEAFLET's own (`sp.L`, never the rachis's), the lobed leaf's
  through `lobedLaws` — so a wrong owner can be seen at the call site (and is two of
  the mutants). `tAt(u)` is handed to `emitPanel`, the form, the fold limit
  (`leafSpineCurveLaw`'s `tauAt`) and the curve rise.
- **The petiole carries the root (simple and lobed)**: `petioleRootFloorMm(wire, L)` —
  the petiole's DIAMETER at least the blade's root thickness (radius = wire × τ_r) — then
  `petioleClampMm` (the compound / lobed rod law, one owner): where the rooted end would
  no longer fit the stem the petiole is **CLAMPED at the stem's cap and told**. A 120 mm
  leaf on the default 6 mm stem at 35° asks 2.481 mm of radius and is clamped at **2.239
  mm** (the cap); on a 3 mm stem at **1.491 mm**; a 60 mm leaf gets its 1.050 mm.
  The lobed petiole is `max(area law, root floor)`.
- **On a raceme's shared node the petiole carries the ASKED blade's root, not the
  capped one — a declared upper bound, forced by the order.** The node offset needs the
  rod's radius before the floret cap exists (the cap is measured from the node depths
  the offset sets), so the mode-free rod the offset reads and the built petiole are both
  floored from `leafLength`, while the blade itself is built at its capped node length
  (17.43 mm of 40 asked at the defaults, where the law is the identity). The petiole is
  therefore never thinner than the blade it holds, and on these rows 0.686 mm against the
  wire's 0.600: every shared-node row asking more than 35 mm moves by the rod and the
  offset that reads it (the byte partition's first predicate missed all twelve, §6a).
- **Compound stalks STAY THE WIRE** (S3's ruling, untouched): a tapered leaflet's root
  is thicker than the rod that holds it, said on the read-out. Thickening the stalk to the
  root would push it past the rachis's own section at the stalk's root (LF17's root disc),
  which is a ruling, not a measurement.
- **The thickness readers**: the shared node offset reads the emitted blade and the rod's
  real radius (so a thicker root and petiole seat themselves); the slider arch's inset
  reads no thickness; the drawn spine's rise reads the fold limit at each substep's own
  thickness; SN4's reach is tip-based and unaffected; the leaf E2 rows read the emitted
  rims. ST9, its witness and the combination gate's leaf-stem measure name the petiole at
  its real radius through the builder's `rodAxes`.
- **Florets**: a raceme's floret is the same builder on its own state — its sepals take
  the law at their own length (an own `sepalLength` is not scaled by `floretScale`).

## 4. The foot cap

**The law.** `footRing()` places each ring by the area rule over the ASKED feet
(floored, uncapped), then caps each foot at the arc it owns on that ring:
`arc = radius × span`, span = the fan's step or 2π/n; `width = asked > arc ?
max(FOOT_MIN_WIDTH_MM, arc) : asked`. A foot inside its arc is the asked double, no
product formed — the shipping default (6.40 mm against a 6.95 mm arc) is the
expression it was. The sepal foot takes the same cap at its own ring.

**The alternative measured and refused: the fixed point.** Placing the ring by the
area rule over the CAPPED feet has a closed form: with `R₀ = s·sqrt(n·w·t/π)` and
`w = 2πR₀/n` the capped foot is `w = 4π·s²·t / n` whatever width is asked (7.54 mm at
eight petals on the shipping spread and sheet), so once the cap binds the petal-width
slider stops moving the ring OR the foot over most of its travel, and the ring depends
on the cap that depends on it. The ruling's words are "a cap derived from the
hub": the hub is placed by the asked feet and the feet are capped to their room ON it.

**Measured** (`node tools/bloom-foot-cap.mjs --base <worktree>`, EXPORT, one RADIAL
whorl, `petalWidth` 8..46 in whole mm):

| petals | cap binds (this tree) | 10 mm clamp bound (base) | width 16: built / arc | width 46: built / arc (base) | D_max (base) |
|---|---|---|---|---|---|
| 8 | 28 of 39 | 21 of 39 | 6.400 / 6.947 | 11.778 / 11.778 (10.000) | 2..2 (2..2) |
| 16 | 37 of 39 | 21 of 39 | 4.912 / 4.912 | 8.329 / 8.329 (10.000) | 2..2 (2..3) |
| 40 | 39 of 39 | 21 of 39 | 3.107 / 3.107 | 5.267 / 5.267 (10.000) | 2..2 (3..5) |

**Crowded caps lower and sparse ones higher, as ruled**: at 8 petals a 46 mm petal now
stands on an 11.8 mm foot (the old clamp held it to 10); at 40 petals the foot is the
arc, 3.1–5.3 mm, where the old clamp let a 10 mm foot overlap four of its neighbours.
**The crowding raster's D_max falls to 2 on every measured state** (the feet abut
instead of stacking). **The cap binds at the shipping width from ten petals up**
(6.40 mm against a 6.21 mm arc at ten) — every `petalCount` 10..40 row of block 1
moves, which is why the byte partition below is large.

**What the cap looks like from below** (the sheet's §3): at the cap each foot is
exactly its arc, so neighbouring feet ABUT at the ring radius instead of overlapping —
and because a foot is a straight chord across a curved arc, a small open notch is
left between neighbours just outside the hub disc (visible at 8 petals × 46 mm). The
solid is still one piece (the feet overlap the hub and each other inside it); the
notch is the honest picture of feet that no longer stack.

The read-out says it (`FOOT WIDTH CAPPED by the ring's own room …`, the asked and built
widths and the arc), and `FOOT ROOM UNDER THE FLOOR` where the arc is under 1.6 mm and
the floor wins (40 petals × 6 whorls, inner rings).

**THE CAP'S RING IS THE EXPORT FLOOR'S, IN BOTH MODES — CI FOUND THE FIRST CUT
MODE-DEPENDENT.** `INFILL: x sheetThickness 0.60` built 91,360 triangles live and
108,928 in export. The area rule places a ring from `sqrt(width × sheet)`, and the sheet
is floored to 1.00 mm at export, so on a 0.60 mm sheet the LIVE ring sits nearer the axis
(×0.775): the cap bound live where it did not in export, the feet differed, and the
infill — planned against the outline the feet set — differed in TOPOLOGY. Which feet a
print gets is the export's question and a topology may not depend on the mode (session
32's rule, a seventh time), so the arc is measured on the area rule at `max(sheet,
MIN_FEATURE_MM)` in both modes (`footCapRadiusMm` on the ring, the sphere's Rd floor at
the export thickness too). **Where the sheet is at or above the floor that IS the ring's
own radius, by branch** — every export build and every live build on a printable sheet
reads the radius it read, and only a live build on a sub-millimetre sheet whose cap binds
moves. The gates restate it from the controls (`footCapRadiusRestated`: the ring's radius
× `sqrt(floor / sheet)`, never the builder's record): FC1 and Z3 read it.

**AND A FOOT CAPPED EXACTLY AT ITS ARC MEETS A SLIT TUBE'S COLUMNS TO THE BIT — the
aligned weld, declared.** At 12 petals the cap binds (6.40 asked, 5.672 mm of arc on a
10.832 mm ring) and the slit tube's panel columns land on the capped feet's margin
vertices exactly, so the census's exact-position weld reads a petal and a tube panel as
ONE shell: 14 → 12 shells at k 1, the ray-parity half of O2 reads the merged shell
"inward" (its ray crosses the welded neighbour once), and the by-design overlap counts
as within-shell pairs — 263 / 768 / 986 / 1,457 at k 1 / 2 / 3 / 4, 2,236 at k 6, 1,457
on the SNAP row, 530 on the thin sheet. **With the cap one part in a million under the
arc every one reads clean and its base shell count** (14 / 15 / 19 shells at k 1 / 2 / 6,
0 disagreements), and the base tree reads 0 — the vertex-welded shell definition, the
sepal ALIGNED WELD and STYLE-at-272 class, not a fold. Declared by value in
`SELF_INTERSECTION_XFAIL` (which also excuses O2 on those rows), never nudged: pulling
the cap off its arc would be a typed constant standing for nothing.

## 5. Gates

- **T4 restated** (it asserted the pin): every built sepal's root and untapered rows,
  read off the FILE, against the law at its tier's own restated length; T3 counts sepal
  roots among the roots the plate must carry.
- **T5** (new): every leaf blade — simple, lobed, each compound leaflet at its own
  length — read off the file on every row clear of its rim taper (row 0 is held by the
  petiole). A compound leaf whose rachis passes 35 mm is entered even where no leaflet
  does (the state on which a leaflet reading the rachis would taper). **A blade the rim taper covers whole is a DECLARED BLINDNESS** (found by CI on the 3.5
  and 5 mm tooth-floor blades, the narrowest 3 mm leaf, the carnation's 6 mm linear leaves,
  `lobedWidth` min and a 12-tooth depth-1 blade): where even the widest row sits under
  `RIM_TAPER_MM` of either margin the rim law sets every row's thickness and the root law
  never shows bare in the file. Decided from the rim record's own distances; a blade wide
  enough to read that still yields no row stays a failure.
- **T6** (new): the petiole's rooted ring, **read off the file** (the cluster of
  `LEAF_PETIOLE_SIDES` vertices one distance from the axis in that plane), is at least
  half the restated root, or exactly at the stem's restated cap. **Its first cut read
  the radius off the harness's own clean REBUILD** and could not fire on a petiole the
  page built at the wire — the mutant table said so (fourth durable rule's mirror image:
  the measured side's owner).
- **FC1** (new, pure, `footCapClauses` — junctionAssertions carries it in both STL
  gates): each ring's foot against the cap restated from the ring's radius × the span
  restated from the controls (never the builder's `footArcMm`), the told flag both ways,
  the record's arc, and the EMITTED foot rows' half-widths. Its first name, `FC`, was
  invisible to the smoke census (it counts codes with a digit).
- **Re-derived, never relaxed**: Z3's restated foot through the cap; SP3's foot thickness
  and whorl height and SP11's tier height at the root factor; LF18 / LF26 the root-floored
  petiole; SO13's widths through the cap; panel route (j)'s foot through the cap.
- **Mutants** (`node tools/verify-bloom-root-taper.mjs --control`, each witnessed on its
  mutated module before the clause is consulted): the sepal pin restored (T4), the leaf
  reading the petal's length (T5), the leaflet reading the rachis's length (T5, on the
  default 26/30 mm leaflets of a 120 mm rachis), the petiole left at the wire (T6), the
  foot cap typed back to 10 mm (FC1) — beside #434's four. **9 of 9 fire what they
  name.** The must-fail now carries `--only=<id>`.
- **`rootTaperFactor` is memoised on the exact double** — pure, so bit-identical; owed
  because the four-tier × 40-sepal corner went 16 → 24 s a build once sepals took the law
  (15.3 s with the memo).

## 6. Matrix, census, bytes

- **Block 76** (21 rows, 1,485 → 1,506): sepals at 60 / 120 mm, on a stem, two tiers,
  at the petal's own 100 mm, GATED at 35; the simple leaf at 60 / 120, on a 3 mm stem,
  arched; the LOBED leaf; COMPOUND with 60 mm and with default leaflets; a raceme's
  leaves and sepals; width 46 at 8 / 16 / 40, width 16 at 40, the FAN, and 40 × 6 whorls.
  **Smoke block 76** (7 rows, `--conn`). The 100 mm petal's eight-sepal row in block 75
  is RELABELLED (its label said the sepals were pinned off).
- `frozen/phase82` is the **1,485 rows at `8403b47`**, registered in both maps and proved
  deep-equal.

### 6a. Bytes

**413 MOVERS / 1,093 HOLDERS over the 1,506-row live matrix in both modes, PASS — 0 floats
moved on any holder, positionally under `Object.is`, and all 413 predeclared movers moved**
(`node tools/verify-bloom-surface-bytes.mjs --base <worktree of 8403b47> --movers-predicate
root-support`, 116 chunks closed by `--merge`): **1,779,379,920 export floats over
197,708,880 triangles and 82,005,892 captured-grid values.** The 21 block-76 rows and the one
declared redefinition (block 75's eight-sepal row) are confirmed against the base matrix.

The movers are predeclared from the **BASE tree's own builder record** (`root-support` in
`PREDICATE_MOVERS`): a row moves iff some ring's asked foot exceeds the derived cap on the
base's own ring (the petal rings, every built sepal tier on its own ring), or a built sepal
or leaf blade (simple, LOBED, each leaflet) is longer than the 35 mm reference, or a
shared-node leaf asks past it.

**The predicate needed three corrections and the run is what said so — 17 rows flipped,
none of them in a chunk that had already passed:**

- **The shared-node petiole** (a raceme's leaf under every pedicel) reads the ASKED leaf
  length, not the built (capped) blade (§3). The first predicate read the built length and
  missed all twelve raceme-with-leaves movers.
- **Lower sepal tiers** sit on smaller rings than tier 1, so the cap binds on them where it
  does not on the rim tier — the first predicate checked tier 1 only (2 rows).
- **A closed tube (k 0) emits no foot rows**, so its feet are a record and move no float.
  The first predicate called its rings movers (3 rows declared to move that held).

`--list-movers <file>` was added to print the predicted set, so a predicate correction can be
diffed row by row against the previous one rather than re-run blind.

**The frozen sweep** (`--frozen-sweep`, the same predicate applied to every registered
baseline, a consequence of the partition above and never a substitute for it): **all 81
baselines carry a mover — 19,294 of 72,837 frozen rows**, from `frozen/phase2` (44 of 76) to
`frozen/phase82` (394 of 1,485). Every tag's DEFINITIONS still deep-compare; their bytes
stop reproducing on those rows, which is what a change to the foot at the shipping width is
expected to do. No baseline threw. The sweep gained `--memo <file>` (the predicate's answer per
distinct state, carried across runs) so it closes in `--frozen-only` batches inside one
foreground call each.

### 6b. Census

**26 declared magnitudes moved, every one re-recorded by value** (`node
tools/bloom-xfail-magnitudes.mjs --include-refused`, then all 25 exportable rows re-run
through the real export gate in Chromium: PASS, 25 of 25, every X1 at its new record).
Every mover is a row the foot cap binds on:

- **The FAN per-petal rows** (the foot's span is the fan's step): `ALL PER-PETAL MAX x 8/side x
  60deg` 935 → 901, and nine `petalNTilt` / seven `petalNCurl` max rows by a few pairs and a
  shallower span (e.g. `petal9Tilt` 0.5158 → 0.3858 mm, `petal8Curl` 390 → 370).
- **Two hemisphere-at-spread-0.6 rows got much WORSE — reported, not tuned around**:
  `DOME: rise 1 x RADIAL x spread min (0.6)` **272 → 1,424 pairs, 0.4983 → 0.6709 mm**, and
  `x 6 layers` **264 → 1,268, 0.4123 → 1.0124**. At spread 0.6 the ring is 2.65 mm, so the
  cap takes the foot 6.40 → 2.08 mm while the blade stays 16 mm wide: the root blend
  collapses five times faster and the blade now folds at u 0.3–0.5 too (`node
  tools/bloom-census-attribute.mjs`: base 177 root blend + 95 foot; here 858 root blend +
  212 foot + 354 blade). The ruled cap acting on the tightest ring the arrangement reaches;
  both rows were already declared (EFFECTIVE TILT PAST 90). The same family's CONTINUOUS and
  40-petal rows moved a few pairs with shallower spans.
- **The dome-lean pair, the fiddlehead, two aligned-sepal rows and `ALL MAX`** (78,222 →
  77,896, span unmoved; its refusal count 3,334,106 unmoved — XR1 green in CI).
- **Seven tube rows declared new** — the aligned weld above (§4).

**E2 (the edge-profile gate, smoke subset): four declared rim turns re-recorded** (the
LOBED rulings shoulder 28.347 → 4.574°, the LOBED drawn spine → 35.159°, the two
120 mm-sepal WING rows → 0.0201°) **and the three new block-76 smoke rows declared**: the
120 mm simple leaf on a 60 mm stem, with and without the 3 mm stem's cap, at 3.100062°
over the allowance — identical on a worktree of `8403b47`, the leaf's own tip, not the
root — and `width 46 x 40 petals` at 0.779637°, the root blend into the capped 5.267 mm
foot (base 10.000 mm, 43.483°). The three non-smoke rows over the allowance (120 mm leaf
× arch 90 at 46.93°, the 120 mm LOBED leaf at 46.45°, width 46 × 40 × 6 at 46.89°) are not
reached by CI's subset and their base readings were not taken; recorded, not declared.

### 6c. Combination gate

Re-run whole (`node tools/bloom-combination-gate.mjs`, plus `--control`). **The
sepal-self cells did not move** (a sepal's root thickens, and `measureWall` reads the
lamina's own approach, which the root's thickness does not reach on any grid cell).
**Leaf-stem moved, and every move is the root law, re-recorded by value, never widened:**

| cell | before | after | why |
|---|---|---|---|
| `leafangle-x-stem @ 70 x stem 6 / 3 / 12` | 0.821 / 0.822 / 0.821 | 0.540 / 0.541 / 0.540 | the 52 mm leaf is ×1.499 at its root (1.80 mm on the 1.20 mm sheet), and the blade's base — the near point to the stem — stands half the added thickness (0.30 mm) nearer it |
| `leafangle-x-tooth @ 70 x tooth 0.26 / 0.6 / 1` | 0.821 × 3 | 0.540 × 3 | the same state through the serration pair |
| `lobedwidth-x-leafangle @ 70 x width 34 / 10 / 40` | 0.6544 / 0.5865 / 0.6991 | 0.4071 × 3 | the 46 mm lobed leaf is ×1.318 at its root; the near point moves to the thickened base, which no lobed control reaches |

So two axes went **bit-identically inert** and are declared in `COMBINATION_INERT` at
`maxMoveMm: 0` with their numbers — `lobedwidth-x-leafangle @ lobedWidth` (3.346 / 2.214 /
0.407 / 0.000 mm at leafAngle 35 / 50 / 70 / 85 for every width) and `lobedround-x-sinus
@ lobedRound` (3.346 / 3.405 / 3.346 across the sinus for every roundness). CG7 fails the
day either reaches the measure again. No verdict changed, no pair added or retired.

## 7. Sheet

`node tools/shot-bloom-root-support.mjs <dir> --base <worktree> --png docs/img/root-support.png`
— the 120 mm sepal and leaf before (a worktree of `8403b47`, its own server) and after,
each root edge-on, and the wide petals at 8 and 40 from below; every thickness read off
the exported file, every foot the emitted foot row.

## 8. Open, for Eva

- The sepal angle limit's contact test reads one sheet, not each root (§2).
- A long sepal makes the join inert and stands on the rim (§2a) — whether that is the
  wanted look on a stemmed bloom.
- Compound stalks stay the wire under thickened leaflet roots (§3).
- Nothing has been printed; the 35 mm / 1.2 mm reference and every number above are
  comparisons against a line drawn here.
