# The umbel junction as a hub, and the stem through the head — Eva's Oct 27 rulings

**Status: BUILT, SHEET RENDERED, WAITING ON EVA for the junction's default style / amount /
length.** Base: `main` at `4beac00` (#438; #468, the page profile, was still OPEN at the time, so
it is not under this work — see §0). Branch `claude/gifted-maxwell-ut0hqs`. The sheet is
`docs/img/umbel-hubs.png` (`node tools/shot-bloom-umbel-hubs.mjs <png> --base <worktree>`).

## 0. The two rulings recorded (step 0)

- **The drag build is closed** (`docs/bloom-mophead-outcome.md` §12b: *"RULED Oct 27: Eva dragged
  the mophead on her own machine and it feels fine. The 2-florets drag build is NOT built;
  closed."*). The page-profile doc (`docs/bloom-page-profile-outcome.md`) lives on #468, which is
  still open, so its §5 carries the same sentence once that PR lands; the closure is recorded in
  the mophead doc so it does not wait on it.
- **The coin bosses are superseded** (`docs/bloom-umbel-outcome.md` §10, at its head): every umbel
  junction becomes a hub; the Oct 24 flat-underside ruling is superseded by the hub's own flare.

The prompt's premise *"main at the newest sha (after #468)"* was checked and is false: #468 is open
(it touches `bloom-geometry.js` and `bloom.js`); main's head is #438's. Built on main as it stands.

## 1. The stem through the head — a defect, reproduced first

**Eva's state** (inflorescence NONE, 8 radial petals, spread 2.00, head rise 0.35, hub CURVED at
1.60, a 60 mm stem), seen from above: a ring inside the dome at its centre.

**What pokes through, by how much, and over which range** — measured in Node on `main`'s own
geometry, EXPORT mode (LIVE reads the same; every number below is a sagitta and the mode floors
no sagitta):

| head rise | 3 mm stem | 6 mm stem | 12 mm stem |
|---|---|---|---|
| 0 (flat) | 0 | 0 | 0 |
| 0.10 | 0.025 | 0.100 | 0.399 |
| 0.35 (Eva's) | 0.076 | **0.308** | 1.272 |
| 0.60 | 0.106 | 0.432 | 1.857 |
| 1.00 | 0.120 | 0.489 | **2.151** |

(mm of the stem's rim above the cap's outer skin at the stem's own radius; 576 of the stem's
vertices on Eva's state.) **Hub style, amount and length move none of it** — 24 of 24
style × amount × length combinations read the same figure at every rise × diameter — because none
of them moves where the stem's top ring is laid.

**The mechanism.** `stemPlan` roots the stem THROUGH the head to `topZ`, the outer cap's APEX, and
`buildStemInto` lays the stem's top as a flat disc of the stem's full radius at that height. A disc
at the apex stands above a sphere everywhere but the axis, by the cap's sagitta at the disc's
radius: `(Rd + t/2) − sqrt((Rd + t/2)² − outerR²)`. On a flat hub the slab's top face IS a plane
and the disc lies in it, which is why the defect is a cap's alone.

**A second half, independent of the disc** (found by the sweep, not the screenshot): the stem's
ROOT ring — its first station, at `rootZ`, the join's underside ON THE AXIS — is laid at the
stem's full radius too, and where the join is thinner than the cap's curvature over that radius it
ALSO stands above the skin: `rise 0.35 × a 12 mm stem × amount 0` reads 0.072 mm over at r = 6 on
`main` with the top disc already lowered.

**The fix, at its owner (`stemPlan`).**
- `domedTop` — a cap (not a sphere) wider than its stem, with the head present. The stem's top
  rim ring is laid ON the cap's MID-surface at the stem's radius, `centreZ + sqrt(Rd² − outerR²)`
  (`stemTopZ`): half the hub's sheet under the outer skin, half above the inner, inside the wall at
  every rise and diameter by construction. A hollow stem's bore opens at the mid-surface at the
  bore's radius (`stemTopInnerZ`), so the open top annulus is a band of that sphere's own chord.
  The stem is still rooted THROUGH the head: its wall crosses the whole join under the rim.
- The join's reach is FLOORED at the mid-surface's sag under the stem plus half a sheet
  (`capReachMin`), so `rootZ` is at least half a sheet under the rim ring and the root ring is
  inside the join at the stem's own radius. A length from two lengths; binds only on a thin join
  under a wide stem on a steep cap; told (`FLOORED`); under the cap's apex clamp everywhere a head
  is wider than a sheet or two.
- BY BRANCH: a flat hub keeps the slab's top face, a sphere its reserved pole, a head not wider
  than its stem the apex (#236's corner, the root band's). `topZ` and `rootZ` keep their meaning
  (the head's apex and the join's underside on the axis); `hubAxisTopZ`, the florets' sessile face,
  the inflorescence inset — untouched.

**After:** 0 stem vertices above the skin on every state of the sweep in both modes; Eva's state
reads 0.603 mm UNDER the skin at r = 3 (the sheet's caption), the worst corner 0.689 under.
Triangle counts unmoved on every row (no ring added: the top annulus is the same band on a
different height; the solid stem's rim fan the same fan).

**The clause: ST13** (`stemTopClauses`, run by both STL gates beside ST9 on the EXPORTED file).
Three owners, none the stem plan: the builder's own stream ranges (`triRanges` on the metrics
hook — which triangles are the join's and the stem's), the HUB BUILDER's emitted dome (mid radius,
centre, thickness) and the CONTROL's stem radius. (a) every stem and join vertex within the hub's
radius lies at or under the outer skin; (b) the stem's top rim — its highest ring at the control's
radius — lies ON the cap's mid-sphere (a flat hub: the slab's top face); (c) the stem's range names
what it claims (vertices at the control's radius). ST4 keeps its subject, the SLAB (on a domed top
its `emittedTop − rootZ` is the reach less the sag and half a sheet; it asserts half a sheet
there); ST10's band clause is restated on a domed top (the bore's ring and the rim differ by the
sphere's own chord drop between the two radii, restated from the dome and the two radii); ST5's
`hubShapeExpected` restates the floor. **Mutants:** `the-stem-top-is-laid-at-the-apex` (the
defect restored — ST13, ST10) and `the-join-reach-floor-is-dropped` (ST13, ST5), each witnessed on
the mutated module's own build.

**Rows:** block 82's six `STEM TOP:` rows (Eva's state; rise 1 × 12 mm; rise 0.35 × 12 mm ×
amount 0, the floor; rise 0.6 × a 3 mm solid stem × Hub length 40, the apex clamp above the floor;
a 12 mm stem under a SPHERE, a holder by branch; rise 0.5 × 8 sepals × 30 stamens × a style —
ST13 beside the parts that legitimately rise above the skin). Three are smoke rows.

**Byte partition predicate** (`verify-bloom-surface-bytes --movers-predicate stem-top`): a row
moves iff the BASE tree builds a stem on an open cap wider than it with the head present — the
cap's sagitta at the stem's radius is never 0, so every such row moves. Measured in §5.

## 2. The umbel junction as a hub — the hub-to-stem join run in reverse

**What stays.** The BAND: `h` and `R` from the root-disc law and the 90° crossing margin, UM1's and
UM2's subject, unchanged to the ulp. Its flat top is the shallow cap the pedicels leave from.

**What is new.** The FLARE under it (`umbelBoss`'s `flare`), from the band's rim down to the
incoming rod — the stem with the head off, the stem passing through with it on, the RAY at a
mophead's ray tip — at the rod's own radius. The head's join reversed: there the plate is on top
and the flare runs from the plate's underside out at the blend radius in to the stem; here the band
is the plate and the flare runs from its rim down to the rod. The SAME three controls drive it
(`hubStyle`, `hubShapeAmount`, `hubLength` — one owner, no longer inert on an umbel), the same
style curves map x (0 at the rim, 1 at the rod) to depth: GOBLET the constant-stress
`sqrt(ln(R/r)/ln(R/rodR))`, ANGLED the cone `x`, CURVED the smoothstep. Amount folded once into the
reach as `stemPlan` folds it into `axisDepth`; amount 0 is the band alone — the Oct 24 coin — BY
BRANCH (192 triangles, the same bytes).

**The reach, AUTO — the one placement made WITHOUT a ruling.** The head's join derives its reach
from the stem's section modulus against the PLATE, floored at the plate's own thickness. Reversed,
the plate is a band two root discs tall, and that law asks for NOTHING: the mophead's ray tips read
3.82 mm of band against a 0.87 mm rod, so a section-modulus auto would leave every umbel a coin at
the default — the state Eva ruled against. The auto reach here is GEOMETRIC: the flare is as deep as
it is wide (`R − rodR`), a mean slope of 45°. `hubLength` above 0 replaces it with that many mm of
total height, floored at the band; amount multiplies the swell above the band as it multiplies the
head's.

**Derived, all of it.** The foot meets the rod `gap/2` inside its wall (`rodR = outerR − 0.5`, the
coned boss's own `rF`; never ON the rod's cylinder — the weld), closing on a flat disc across the
rod. The ROOM: the flare may not reach the rod's far end (the stem's cut, a ray's end), so its depth
is clamped at the rod's length less the band, a gap and the cut's span — from MODE-FREE lengths
(the asked stem length, the plan's mode-free inset, the cut's span from the tip radius), so whether
a flare EXISTS is the same in both modes by construction; CLAMPED and NO ROOM told. Every root disc
stays strictly inside the band (above the flare by its own half gap); the 90° crossing margin is the
band's and stands. **A ray tip scales with ITS ray**: a sub-umbel's rod is its ray (`subUmbelState`
sets `stemDiameter` to twice the head plan's pedicel radius), so nothing of the stem reaches it.
SLS: the flare's concave underside needs no support.

**The lattice:** `UMBEL_FLARE_RINGS = 8` rings at equal x between the band's foot and the rod, a
constant of the drawing; a junction is `2N(2 + K)` = 960 triangles with a flare, 192 without,
mode-free (`umbelBossTris(flare)`; the mophead's budget clamp reads it).

**Measured (EXPORT = LIVE on every row).**

| | band tall × across | flare (GOBLET auto) | rod | junction tris | bloom tris |
|---|---|---|---|---|---|
| spider lily, 6 florets, head off | 3.46 × 10.72 | 2.86 mm | 6.00 (stem) | 960 (was 192) | 106,038 (was 105,270) |
| 12 florets at 90° × CURVED | — | 7.23 | 6.00 | 960 | 210,546 |
| head ON on a domed head × ANGLED | 3.46 × 13.72 | 4.36 | 6.00 | 960 | 143,782 |
| a 3 mm stem (the room) | 3.46 × 10.72 | **0.27, CLAMPED from 2.86** | 6.00 | 960 | 105,944 |
| the mophead, stem-top junction | 2.93 × 18.75 | 6.88 | 6.00 | 960 | 1,251,978 (was 1,241,994) |
| the mophead, a RAY TIP | 3.82 × 17.48 | 7.74 | **3.00 (the ray)** | 960 each | — |
| amount 2 × Hub length 20 | 3.46 × 10.72 | 33.09 (2 × (20 − 3.46)) | 6.00 | 960 | 106,038 |

The mophead at its ruled defaults stays under the budget (83.5%); the clamp corner re-prices itself
from the measured unit (UM7).

**The panel.** The three Hub controls' read-outs say, on an umbel, `shapes the UMBEL JUNCTION(S)
(the stem-top knot [and every ray tip]) — the head is OFF, so that is all it shapes` (or `as well as
the head's own hub`) — `umbelJunctionNote` in the registry. The build read-out carries `UMBEL
JUNCTION a HUB · band … · FLARE <style> <amount>x, <swell> mm from the band's foot down to the <rod>
… auto / Hub length / CLAMPED` and, on a mophead, `RAY TIP JUNCTION …` for the sub-umbel.

**Gates.** UM1 restates the flare from the controls (`umbelFlareExpected`: the reach law written
again in the harness, the room from the asked stem length and the plan's inset, the rod from the
control's radius) and holds the emitted junction to it — the band's foot, the flare's foot, every
emitted flare ring on the styled profile, the ring count, the rod met half a gap inside its wall
(`umbelFlareClauses`); UM8 the same on every ray tip at the RAY's radius and room. The Oct 24
flat-underside clause stood where the flare clauses now stand. **Mutants:**
`the-junction-ignores-the-hub-controls` (UM1, UM8), `a-root-disc-on-the-junctions-face` (UM1,
UM2), `the-ray-junction-reads-the-stems-radius` (UM8); `the-boss-underside-cones-again`
re-anchored onto the flare's foot and witnessed on the coin (amount 0).

**Rows:** block 82's eleven `UMBEL HUB:` rows (each style at the spider lily's defaults; amount 0;
amount 2 × Hub length 20; 12 at 90° × CURVED; the 3 mm stem; the head ON on a DOMED head × ANGLED —
both rulings on one row; the mophead at each style and at a Hub length). Matrix 1,588 → 1,605;
smoke block 82 (six rows, `--conn`); 343 smoke rows over 78 blocks, 225 families both ways.

## 3. For Eva — the sheet, and the default

`docs/img/umbel-hubs.png`: §1's two states BEFORE / AFTER from above (the ring), as a cutaway
(the stem's top in section against the cap's wall) and side-on; the spider lily and the mophead
BEFORE (the coin) / AFTER (the hub) side-on, from below and close on the junction (the ray tip on
the mophead, one ray drawn alone); each Hub style at the defaults on both. Every caption carries
the measured dimensions and the triangle count off the build it shows.

**The question:** the junction's default **style / amount / length**. Today's shipping defaults are
the head's (GOBLET, 1.00, auto) and the junction takes them; the AUTO reach is as deep as the flare
is wide (a 45° mean slope) — a placement, not a ruling. On the spider lily that is a 2.86 mm flare
under a 3.46 mm band on a 6 mm stem; on a mophead ray tip 7.74 mm under a 3.82 mm band on a 3 mm
ray (the band is the disc-holding law's and is wide — 17.5 mm across for twelve sub-pedicels — so
the flare under it is long). Alternatives are one constant each: a shallower auto (half the width),
or a section-modulus auto (which reads inert on every umbel today, measured).

## 4. Gates run on this tree (local)

Every run on this box, `CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium`, block 82 through `--only '^(STEM TOP|UMBEL HUB)'`:

- **Export gate**: 17 of 17 rows reached the results, 17 watertight, `tris(live) === tris(export)` on every one; 1,716 s.
  One declared self-intersector, held by X1 at its magnitude: `STEM TOP: rise 1 x a 12 mm stem` reads **248 / 0.4262**,
  which is `headRise max (1)`'s own hemisphere fold to the digit (the stem and the join touch no petal) — declared with
  that cause, not the fix's. **The first run dropped eleven rows and none was geometry**: the ten umbel rows by ID10 (d)
  (every umbel's florets stand 0.0000 mm apart by construction and are declared in `INFLO_APPROACH_XFAIL`; the junction
  moves no floret, so block 82's rows carry the same declaration), and that fold.
- **Connectedness gate**: 17 of 17 one connected piece; 1,326 s.
- **Panel gate**: PASS (the three Hub controls' junction words, the umbel head toggle, the mophead depth defaults).
- **Smoke census** (`node tools/bloom-smoke.mjs --check`): 343 smoke rows over 78 blocks of 1,605 rows, every family
  claimed both ways; ST13 and the junction rows claimed by block 82's six smoke rows (`--conn`).
- **Apex mutant table**, 260 anchors matching exactly once. Run: `the-junction-ignores-the-hub-controls` (UM1, UM8),
  `a-root-disc-on-the-junctions-face` (UM1, UM2), `the-ray-junction-reads-the-stems-radius` (UM8, and ID2 / ID9 / UM2
  as collateral), `the-boss-underside-cones-again` (re-witnessed on amount 0), `hairline-root`, `the-stem-normal-points-inward`
  (re-anchored), `the-stem-top-is-laid-at-the-apex` (ST10) and `the-join-reach-floor-is-dropped` (ST4, ST5, and ST11) — each
  firing what it names, silent on the clean tree. **ST13 cannot fire in that table**: it reads the EXPORTED file by the
  builder's own stream ranges and the table calls `stemAssertions` only (ST9's precedent). Its witness is
  `node tools/verify-bloom-stem-channel.mjs`, section 2b: the two stem-top mutations run by id in Node on Eva's state and
  the 12 mm × amount 0 state, ST13 silent on the clean tree and firing on both (0.3076 / 1.2724 mm over the skin under the
  apex-laid top, 0.0724 under the dropped floor); `--control` (the replacement is the find-string) stays silent on it.
- Not run locally: the full matrix on either STL gate (CI's), the other 252 mutants (a subset says so in its banner).

## 5. Bytes

`node tools/verify-bloom-surface-bytes.mjs --base <worktree of 4beac00> --movers-predicate umbel-hubs`, the whole
1,605-row live matrix in both modes, in three `--range` chunks merged (`--merge`):

- **69 movers / 1,536 holders — PASS: 0 floats moved on any holder, positionally under `Object.is`, every predeclared
  mover moved**, over 1,992,525,660 export floats (221,391,740 triangles) and 82,702,544 captured-grid values.
- The predicate is read off the BASE tree's own records: a row moves iff the base builds a stem rooted through an open
  cap wider than it with the head present (`stem-top` — the cap's sagitta at the stem's radius is never 0, so every such
  row moves), OR the base builds an umbel knot AND the junction's flare is built there by `umbelBoss`'s own branch (Hub
  amount > 0, a flare width, room under the band for a swell). **The first predicate named every umbel row a mover and the
  run refused it**: `UMBEL HUB: amount 0 — the band alone` holds to the bit in both modes, which is the Oct 24 coin by
  branch and is what the row exists to measure. The predicate reads the branch now.
- The movers outside block 82 (block 82 adds 17 rows): `ALL MAX` (a 120 mm stem on a domed head), the two `STEM: x a
  domed head / hemisphere` rows, the sepal-height and sepal-tier dome rows, the sessile domed floret head, the hemisphere
  reach-inset row, and every `UMBEL:` / `MOPHEAD:` row that builds a flare — the umbel knot has a GOBLET flare at the
  shipping Hub defaults on all of them.
- A frozen phase IS owed (1,588 → 1,605, block 82): `frozen/phase89` at the merge base, registered after Eva's ruling.
  Every one of the 88 older baselines' DEFINITIONS reproduces; the bytes of every baseline carrying a domed head with a
  stem, or an umbel, stop reproducing on those rows (the stem-top sagitta and the flare), named here rather than owed as
  a phase.


## 6. The converging knot (Oct 27, Eva's ruling on §3's sheet) — SUPERSEDES §2's band

**RULED Oct 27: the umbel junction is a converging knot sized from the incoming rod; the
band and the root-disc ring are retired; Hub controls default CURVED 0.50.**

Eva, from the ray-tip comparison: the band is replaced by a CONVERGING KNOT, as real umbels
do it — spider lily, agapanthus, allium: the pedicels leave a small swollen point barely wider
than the stem, bases crowded and merged; no disc, no flat top, no 90° edge. Four parts, every
length derived (`umbelKnot` and `umbelRootLaw` in `bloom-geometry.js`; the header carries the
law in full):

1. **The pedicels converge.** Each rod's line crosses the BASE PLANE (the rod's end with the
   head off, the umbel's depth with it on) at `rhoB` — the pedicel's own radius head off, one
   gap off the stem's wall head on (a 90° pedicel rises parallel to a stem that runs on) —
   and continues straight inward, at its own angle, to the point of its line nearest the
   centre: `extendMm = rhoB cos a`. The rod is built that much longer than the asked pedicel,
   so the floret stands where the asked length puts it (the memo's key stays the asked
   length; the ID family's "the pedicel IS the floret's stem" clauses add the extension,
   restated from the controls).
2. **The roots overlap and share no vertex.** Overlapping closed shells are the export
   contract. Two root rings centred on one point — every rod at 0°, every mirror pair at any
   angle — share vertices exactly (the weld class), so the i-th root is staggered along its own
   line by `(i − (n−1)/2 + 1/4)` steps of **`2π rP / UMBEL_BOSS_SECTORS`** — one lattice step of a
   ring of the PEDICEL's radius on the KNOT's sector count. 0.196 mm on a 1.5 mm pedicel; a floret
   moves by under a step. **The quarter step is a measurement, not a choice**
   (`UMBEL_ROOT_STAGGER_OFFSET`): the first cut staggered symmetrically about the nearest point,
   which puts roots `i` and `j` at mirror distances whenever `i + j = n − 1` — and at 0° an
   OPPOSITE pair (`j = i + n/2`) lies on one line through the centre, so the pair that is both
   (`(1, 4)` of six) rooted on the SAME point and the vertex weld read its two rings as one shell:
   **`MOPHEAD: rays at 0 deg` read 1,652 within-shell pairs, worst 0.196 mm (the stagger's own
   step), 0 on the base tree**, found by the umbel census sweep and not by UM2, whose
   distinct-ends clause asked the rod ENDS and these two ends coincide to the bit. A quarter
   step off centre makes `i + j = n − 3/2` unsolvable in integers, so no two roots are mirror
   images at any count or angle; the row reads 0, and UM2's distinct-ends clause has its witness
   in `the-roots-share-a-vertex` (probed at 0°, where the stagger is the only thing between the
   roots and one point).
3. **The knot is a dome, sized from the rod and from what holds the roots.** A hemisphere of
   radius `Rk` about a centre `lift` under the base plane. Every root disc's rim (sampled at
   720) is either ROD-HELD (half a gap inside the rod's wall — a 6 mm stem is hollow, so its
   wall is the 1.5 mm annulus) or must be half a gap above the equator and half a gap inside
   the dome: `lift` is the least drop that does the first, `Rk` the least radius that does the
   second AND holds the rod's own end rim (`hypot(outerR, lift)` head off, `outerR` head on)
   half a gap inside. No bisection, no count in it (the count enters only through the
   stagger's span). **The first cut put the lowest root point EXACTLY on the equator plane —
   on the flat underside at amount 0, and against the dome by its last bit at any amount —
   and the Node run of UM2 caught it before any gate** (one point 49 nm under the equator,
   not inside anything); the half gap above the equator is the fix.
4. **The flare is the Hub's, from the equator into the rod**, the three controls as §2 had
   them, from `Rk` down to `rodR = outerR − gap/2`, auto reach as deep as wide, clamped to the
   rod's room below the centre. **Default CURVED 0.50, auto** (`HUB_STYLE_DEFAULT`,
   `HUB_SHAPE_AMOUNT_DEFAULT`).

**The crossing** is marched then bisected from each root centre along its own line to where
it leaves the union of the dome, the flare and the rod (`umbelKnotInside`), and the plan
reports the least (ID2's half-feature floor holds it).

### 6a. Measured (EXPORT, this tree with the quarter-step stagger, the ruled defaults; `knot` is the dome's diameter)

| state | rod | knot | × rod | lift | binds | flare CURVED 0.50 | crossing |
|---|---|---|---|---|---|---|---|
| spider lily 6 @ 35° (the default) | 6.00 | 9.13 | 1.52 | 2.74 | the rod's end | 1.03 | 2.33 |
| 2 @ −60° | 6.00 | 9.77 | 1.63 | 0.70 | the roots | 1.19 | 2.96 |
| 2 @ 35° | 6.00 | 10.00 | 1.67 | 3.35 | the rod's end | 1.25 | 2.77 |
| 2 @ 90° | 6.00 | 9.63 | 1.60 | 0.71 | the roots | 1.16 | 3.54 |
| 6 @ −60° | 6.00 | 8.15 | 1.36 | 0.98 | the roots | 0.79 | 3.31 |
| 6 @ 90° | 6.00 | 7.69 | 1.28 | 1.04 | the roots | 0.67 | 2.06 |
| 12 @ −60° | 6.00 | 9.59 | 1.60 | 1.49 | the roots | 1.15 | 2.72 |
| 12 @ 35° | 6.00 | 9.60 | 1.60 | 3.08 | the rod's end | 1.15 | 1.71 |
| 12 @ 90° | 6.00 | 9.02 | 1.50 | 1.63 | the roots | 1.01 | 1.59 |
| 6 @ 35°, head ON | 6.00 | 8.09 | 1.35 | 4.40 | the roots | 0.77 | 1.06 |
| 6 @ 35° on a 12 mm stem | 12.00 | 15.61 | 1.30 | 4.16 | the rod's end | 1.15 | 4.43 |
| mophead, the stem-top knot (12 rays @ 50°) | 6.00 | 9.58 | 1.60 | 3.07 | the rod's end | 1.15 | 1.34 |
| mophead, a ray tip (12 florets @ 20° on a 3 mm ray) | 3.00 | 8.67 | **2.89** | 2.50 | the roots | 1.67 | 2.04 |

Eva expected 1.3–1.5× the rod: the lily reads 1.28–1.66 across the whole grid, the count
moving it by at most the stagger's span. **The two-floret rows read LARGER than the twelve
(10.0 against 9.6 at 35°) and that is the stagger, not the count**: with two roots the
stagger is ±half a step (less the quarter) about the nearest point, with twelve ±5.5 — but the
two-floret lily is the one where the lift binds through the rod's end (`hypot(3, 3.35)`),
because two rods at 35° off a 1.5 mm circle carry their root discs' 1.23 mm vertical extent
lower. **The mophead ray tip is 2.88× its ray** because the floor pedicel (1.5 mm) is as thick
as the ray it leaves (1.5 mm) and twelve of them root in it; the 17.48 mm ring is gone (8.67).
The band's "FLARE 7.74 trumpet" the comparison sheet was about reads 1.66 mm at the ruled
0.50.

**The shoulder.** The dome's equator is vertical and the CURVED smoothstep leaves it
HORIZONTAL (and ANGLED a cone's slope), so both meet the dome with the head's own shoulder;
GOBLET's constant-stress law has a vertical tangent at the rim and leaves the dome tangent —
the onion. At the ruled 0.50 all three draw a shallow dish under the dome (the sheet's last
row). Said here, not smoothed: a tangent CURVED is a different style law.

**The Hub defaults.** Ruling 3 names the Hub controls' default and the three controls are
ONE owner for the head's join and the umbel's knot, so CURVED 0.50 is the head's join default
too: on the 1,605-row matrix **353 stemmed rows** build a head join active at the old default
with neither control named (every `STEM:` row, `stemLength max`, `ALL MAX` among them) and
move with the default — a partition the knot alone would not have. Flagged on the sheet for
Eva's confirmation before the PR; GOBLET 1.00 stays the slider position that reproduces the
pre-Oct-27 head join.

**Gates.** UM1 restates the whole knot from the controls (`umbelKnotExpected`: the base
circle, the extension, the stagger, the hold, the lift, the radius, the flare profile) and
holds the EMITTED knot to it (the equator's radius, every dome ring on the sphere, every
flare ring on the profile, the two poles); UM2 holds every pedicel's emitted rod END to its
own converging root and its root disc half a gap inside the union of the dome, the flare and
the rod, and refuses two roots at one point; UM3 reads the base plane as the equator plus the
restated lift; UM8 is UM1+UM2 on the ray tip in the sub-umbel's frame, off the ray's own
radius and bore. Mutants (the apex table): `the-roots-share-a-vertex` (the stagger dropped —
witnessed on the EMITTED stream: florets 0 and 3 share vertex positions),
`the-knot-is-sized-from-the-floret-count` (the ring restored: 6 → 12 florets grows the knot),
`a-root-disc-on-the-junctions-face` (the hold's half gap dropped — witnessed on the EMITTED knot:
UM2's hold test reads the emitted equator, radius and flare rings, never the restatement, since
a knot emitted half a gap too high leaves a disc ON its underside that a restated knot would
hold; `umbelKnotEmittedInside`), `the-knot-radius-is-typed`,
and `the-umbel-pedicel-roots-off-the-junction` / `the-junction-ignores-the-hub-controls` /
`the-ray-junction-reads-the-stems-radius` re-anchored. §4 and §5 above describe the BAND tree
(`7c9d33d`); the knot's own gates and bytes follow Eva's ruling on the sheet.

## 7. The gentle swelling (Oct 28, Eva's ruling on §6's sheet) — SUPERSEDES §6's knot

**RULED Oct 28 (1): the knot is "still too much". The umbel junction is a GENTLE SWELLING:
the incoming rod (the stem, or a ray on a mophead) widens slowly over about 10–20 mm to about
1.2× its width and the pedicels leave its top — a taper, not a dome; no equator edge
anywhere. The stem node's swelling law is REUSED for the profile. The pedicels still converge,
their roots buried strictly inside solid with the quarter-step stagger; the roots go DEEPER,
and the length and width that hold them are derived.**

**RULED Oct 28 (2): CURVED 0.50 is the head's hub-to-stem default TOO — one owner, one
default.** (It had been set so in §6 with the question flagged; the ruling closes it. The
~353 stemmed rows it moves, `ALL MAX` included, are predeclared from the BASE tree's record
through `verify-bloom-surface-bytes --movers-predicate umbel-swelling` against a worktree of
`main`; the census and combination magnitudes are re-recorded by value and the defaults bar's
pins updated — §8 below carries that partition's state.)

### 7a. One swelling law — the stem node's spindle, reused

`umbelSwelling` / `umbelRootLaw` / `umbelSwellBody` in `bloom-geometry.js` (the header carries
the law in full); the dome, the flare, `umbelFlareDepthAt`, `umbelKnotInside` and the
`UMBEL_DOME_RINGS` / `UMBEL_FLARE_RINGS` lattice are gone.

1. **The profile IS `stemNodeRadiusMm`** — the stem node's Gaussian spindle, a half-width of
   `STEM_NODE_SPREAD_RADII × outerR` (3.2738 radii, the flower's own) — with ONE node AT THE
   BASE PLANE: `R(z) = outerR (1 + k exp(−(z/w)²))`. It fits exactly: a node at the rod's end
   is the spindle's lower half, and on a 6 mm stem `w` is 9.82 mm, so the body is drawn to
   `2w` = **19.64 mm** — inside Eva's 10–20 (9.82 mm on a 3 mm ray). It is called, not copied
   (`umbelSwellRadiusMm` hands the node law a one-node record), so there is one swelling law.
   Head OFF the rod ENDS at the base plane and the body closes on a FLAT TOP (the pedicels
   leave its top; the top rim is the rod's own cut edge, and there is no edge below it); head
   ON the stem runs through and the body is the whole spindle, both ways. Below `2w` (e⁻⁴,
   0.4 % of the swell) the body steps INSIDE the rod's wall on a 45° chamfer to
   `rodR = outerR − gap/2`, so no face lies on the wall.
2. **The Hub controls shape it.** `hubShapeAmount` is the WIDTH: `k = UMBEL_SWELL_PER_AMOUNT
   (0.4) × amount`, so the ruled 0.50 is **1.20×**. `hubLength` is the REACH: 0 = auto (the
   spindle's own `2w`), above 0 that length (`w = length/2`). **`hubStyle` is INERT on a
   Gaussian** and is HIDDEN with the head off (`hubStyleLive` in the registry: `stemPresent
   ∧ headPresent`); with the head on it still shapes the head's own join and the control's
   read-out says the swelling does not read it. UM1 asserts the hide.
3. **The roots go deeper.** Each rod's line crosses the base plane at `rhoB` (head off `rP`,
   head on `outerR + rP + gap` — §6's law, kept), continues inward to the nearest point
   (`extendMm = rhoB cos a`) and then **`deepenMm` further along its own line** — the least
   depth on a 2⁻⁸ mm grid that buries every root disc (720 rim samples) half a gap inside the
   body, the rod's wall, and (head off) under the top face. The quarter-step stagger is kept
   verbatim (an opposite pair at 0° rooted on one point welded `MOPHEAD: rays at 0 deg`).
4. **The width is derived where the asked one cannot hold the roots** — raised by bisection
   to the least width (2⁻⁸ grid) at which some depth buries them; reported as FORCED with the
   asked and reached widths (the mophead ray tip, §7b).
5. **Where depth cannot hold them at the asked width, the top RISES instead if that is the
   NARROWER way** (two placements made without a ruling): "deeper" is along the rod's own
   line toward the body — inward where a pedicel rises, OUTWARD past the base point where it
   droops (inward goes up, out of a head-off rod; the root then sits under the plane and the
   rod leaves the body's side). Each way is solved at the least width that holds it and the
   narrower wins, a tie to the depth (Eva's target is the width, ~1.2×; her first order the
   depth): a head-off body may then be taller by `riseMm`, the least top height under which
   every rim point sits half a gap, the roots pulled back along the line only as far as that
   needs (`heldBy: 'rise'`, told). The room the rod leaves below its end bounds the body in the
   hold as in the drawing (`reachClamped`, told).
6. **The crossing** is measured as before, root to surface along the rod's line.

### 7b. Measured (EXPORT, the ruled defaults; width is the spindle's peak diameter, length its reach below the base plane)

| state | rod | pedicel | width | × rod | length | roots | crossing |
|---|---|---|---|---|---|---|---|
| spider lily 6 @ 35° (the default) | 6.00 | 3.00 | 7.20 | 1.200 | 19.64 | 2.23 deeper | 3.02 |
| 2 @ −60° | 6.00 | 4.24 | 7.20 | 1.200 | 19.64 | top raised 3.42 (roots pulled 0.88 up the line) | 4.75 |
| 2 @ 35° | 6.00 | 4.24 | 7.20 | 1.200 | 19.64 | 2.23 deeper | 3.90 |
| 2 @ 90° | 6.00 | 4.24 | 9.49 | **1.582, forced** | 19.64 | top raised 0.57 | 0.50 |
| 6 @ −60° | 6.00 | 3.00 | 7.20 | 1.200 | 19.64 | top raised 2.37 | 4.36 |
| 6 @ 90° | 6.00 | 3.00 | 7.20 | 1.200 | 19.64 | 0.95 deeper | 0.50 |
| 12 @ −60° | 6.00 | 3.00 | 7.20 | 1.200 | 19.64 | top raised 2.88 | 3.78 |
| 12 @ 35° | 6.00 | 3.00 | 7.20 | 1.200 | 19.64 | top raised 1.62 (by depth alone it needs 1.379×) | 2.75 |
| 12 @ 90° | 6.00 | 3.00 | 7.20 | 1.200 | 19.64 | 1.53 deeper | 0.50 |
| 6 @ 35°, head ON | 6.00 | 3.00 | 7.20 | 1.200 | 19.64 either side | 0.01 deeper | 1.74 |
| 6 @ 35°, amount 0 | 6.00 | 3.00 | 6.28 | **1.047, forced** from 1.00 | 19.64 | 2.23 deeper | 3.02 |
| 6 @ 35°, Hub length 10 | 6.00 | 3.00 | 7.20 | 1.200 | 10.00 | 2.23 deeper | 3.02 |
| 6 @ 35° on a 3 mm stem (room 1 mm) | 6.00 | 3.00 | 8.13 | **1.355, forced** | 1.00, CLAMPED | top raised 2.57 | 1.63 |
| mophead, the stem top (12 rays @ 50°) | 6.00 | 3.00 | 7.20 | 1.200 | 19.64 | 1.98 deeper | 1.91 |
| mophead ray tip, 12 @ 20° (the default) | 3.00 | 3.00 | 4.90 | **1.633, forced** | 9.82 | top raised 1.78 | 1.38 |
| ray tip 2 @ −60° / 35° / 90° | 3.00 | 3.00 | 4.37 / 4.35 / 7.01 | 1.46 / 1.45 / 2.34, forced | 9.82 | raised 3.98 / 1.06 / 0.55 | 4.25 / 1.99 / 0.50 |
| ray tip 6 @ −60° / 35° / 90° | 3.00 | 3.00 | 4.62 / 4.75 / 7.05 | 1.54 / 1.58 / 2.35, forced | 9.82 | raised 4.32 / 1.28 / 0.95 | 4.07 / 1.84 / 0.50 |
| ray tip 12 @ −60° / 35° / 90° | 3.00 | 3.00 | 5.21 / 5.59 / 7.22 | 1.74 / 1.86 / 2.41, forced | 9.82 | raised 4.72 / 1.62 / 1.53 | 3.81 / 1.73 / 0.50 |

**The lily reaches 1.20× over 19.6 mm at eight of the nine grid cells and at every shipped
umbel row.** The one forced cell is two florets at 90°: the area rule gives two pedicels of
4.24 mm, and a horizontal root disc of that radius spans 8.5 mm across the axis (1.58×).
Three cells hold by a raised top rather than by depth: the drooping −60° column (inward is
up), and twelve at 35°, where the stagger's 2.4 mm span along the line runs the deepest roots
out through the far side before the shallowest is under the top — by depth alone that cell
needs 1.379×, and the 1.62 mm rise is the narrower way. **A mophead ray tip cannot get near
1.2×, as Eva allowed for: a 1.5 mm pedicel off a 1.5 mm ray needs 1.63× at the default (12
florets at 20°, the top raised 1.78 mm) and 1.45–2.4× across the grid; it gets what holds the
roots and the read-out and the sheet say FORCED.** The knot read 2.89× on the same tip (8.67
mm); the default tip is 4.90 mm now. A 3 mm stem (a declared row) has 1 mm of room under its
end, so its body is cut there and the roots held by a 2.57 mm rise at 1.36×, told.

Cost: 1,728 tris a stem-top swelling (18 rings × 48 × 2) against the knot's 1,920 and the
band's 960; 2,016 a ray tip; the lily 106,806 in all (knot 106,998), the mophead 1,265,418.
The hold is allocation-free (three flat arrays, a rigid shift per depth); a plan costs what
the knot's did (the first cut rebuilt the rim per step and took nine seconds on a forced tip).

### 7c. Gates

UM1/UM8 restate the spindle from the controls (`umbelSwellingExpected` in the harness: the law
written again — the Gaussian on `STEM_NODE_SPREAD_RADII`, the 0.4 per amount and the 2 w as
literals, the same depth/width/rise search), every emitted ring against it at its own height,
the top, the bottom, the chamfer at `rodR`, the forced flag both ways, the style hidden with
the head off; UM2/UM8 hold every root disc half a gap inside the EMITTED body (the chords
between the emitted rings, the emitted top) and the rod's wall, the rod ends at the restated
root (nearest point + deepening + stagger); UM3 the base plane on the stem's emitted top (head
off) or on the stem (head on); UM4 the body's emitted bottom clear of the cut. ID4/ID9/ID10
restate the extension through the same expectation. Mutants re-pointed: the roots off the
junction (the extension dropped — the mean root depth 0), the swelling ignoring Hub amount,
the roots unstaggered, `the-roots-are-not-deepened` (the depth search gone — every head-off
umbel rises instead), the half gap dropped from the hold, the ray tip reading the stem's
radius, `the-swelling-width-is-typed` (the width search gone — the ray tip's roots stand out
through the skin), the umbel on the cut end. The byte predicate is `umbel-swelling` (= the
knot's: every base umbel row, every stem-top mover, every head join active at the base's own
GOBLET 1.00 default).

**Run (Oct 28, after `2fe539d`):** `verify-bloom-export --only 'UMBEL SWELLING'` **11 of 11**
reached the results and exported watertight (the amount-2 row declared in
`INFLO_APPROACH_XFAIL` at its 0.0000 mm floret contact, as every other six-floret umbel is);
`verify-bloom-connectedness --only 'UMBEL SWELLING'` **11 of 11** one connected body; the panel
gate PASS. **The mutant table's unscoped control found one of the harness's own:** on
`surface texture T5 — PEBBLE x an UMBEL, head ON` (a 60 mm stem under a head) UM1 read 35
expected rings against 29 emitted — the restatement drew the body to the SEARCH's room (an upper
bound, the inset depth unknown to it) where the placed body clamps to the EXACT room. The
expectation takes a draw room now (`roomDrawMm`, `a9d91a3`); the search's room is unchanged,
so no depth or width moved. (The first reading of that fire, booked against the lily's default
row, was wrong — a `--rows` run on that row alone was silent, and the instrumented run put the
fire on the textured row.)

### 7d. The sheet (`docs/img/umbel-hubs.png`, `node tools/shot-bloom-umbel-hubs.mjs <png> --base <band worktree 7c9d33d> --knot <knot worktree d08153e>`)

Three columns — BAND (Oct 27 am) | KNOT (Oct 27 pm) | SWELLING (Oct 28) — for the spider lily
and the mophead side-on, from below and at the junction, a mophead ray tip alone side-on, and
the head-only bloom on a 60 mm stem at GOBLET 1.00 beside CURVED 0.50 (the new head default)
side-on and from below; dimensions in every caption.
