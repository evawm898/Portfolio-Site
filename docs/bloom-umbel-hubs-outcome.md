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

