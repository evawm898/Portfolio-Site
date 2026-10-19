# Bloom — the infill on several whorls: the seam was two doubles (Oct 19)

**Session:** infill-whorls. **Base:** `169fd5b` (#421). **Geometry change:** one line in
`petalInfillPlan` (`bloom-geometry.js`). Everything else is gates, matrix rows, records and docs.

## 1. The question and the answer

#421 measured the Voronoi infill on three RADIAL whorls, every petal on the shipping LAW, reading
**736 within-shell pairs, worst span 0.4240 mm** (321 / 0.2400 on the lopsided curve, 0 on the spoon),
and no matrix row held that product. The brief asked whether that is inter-whorl overlap made solid by
the infill, a fold within one petal, or the slicer-harmless overlap of separate petals — and to fix it at
its owner.

**It is none of the three as framed.** Every pair lies within ONE petal, between that petal's basal panel
and its own cell region, at the seam row (u 0.07–0.13). The whorls are a proxy for a SHORT petal. And
on the 3-whorl flower not one pair is a fold: each is the census reading a T-junction at the seam, where
the infill's seam carried two different doubles. One line makes it one double, and the flower — and
every row of #286 — reads 0.

## 2. The diagnosis, measured

All figures in Node, EXPORT mode, through `tools/bloom-self-intersection.mjs`'s own `census` (X2's
function), on the base tree `169fd5b` unless marked.

**(a) Where the pairs are.** Attributing both triangles of every pair to the nearest captured mid-surface
point and to the emitter's own `emittedTriRange`:

| flower | pairs | where |
|---|---|---|
| 3 whorls x infill, LAW | 736 / 0.4240 | 416 on layer 3, 320 on layer 2, **0 on layer 1** — every one basal panel vs the SAME petal's cells, base u 0.071–0.089, cells u 0.089–0.125 |
| 2 whorls x infill, LAW | 320 / 0.4240 | all layer 2 (the inner whorl), same seam |
| 1 whorl x infill | 0 | — |
| 3 whorls, infill OFF (the solid twin) | **0** | — |

So it is not inter-whorl and not between separate petals; the infill introduces it.

**(b) The whorls are a proxy.** Layer 2 is layer 1 at `layerSize` 0.72 and `layerTilt` +12°. On ONE whorl:
`petalLength` 25.2 alone reads 864 pairs, `petalWidth` 11.52 alone 0, `petalTilt` 37 alone 0. A length
sweep on one infilled whorl:

| `petalLength` | 20 | 22 | 24 | 26 | 28 | 30 | 32 | 34 | 35 (shipped) | 36 | 40 | 50 | 60 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pairs (base) | 8 | 0 | 896 | 1504 | 1600 | 1568 | 1504 | 0 | 0 | 0 | 0 | 1536 | 896 |

Non-monotone, and the shipped 35 mm is clean — which is why a one-whorl default never showed it and the
inner, shorter whorls did. Session 38's lesson (layer count standing for a shorter petal) arriving a
third time.

**(c) Most of it is not a fold.** A classifier asks of every pair whether some intersection point lies
INSIDE BOTH triangles (more than 1e-6 mm from every edge of each). Positive control: `petalRoll` 330,
the petal's own declared fold, reads **7,129** such pairs, deepest 0.273 mm.

| state | census pairs | pairs with a point inside both | deepest |
|---|---|---|---|
| 3 whorls x infill | 736 | **0** | 1.1e-9 mm |
| 1 whorl x 28 mm | 1600 | **0** | 2.6e-9 |
| 1 whorl x 32 mm | 1504 | **0** | 2.3e-9 |
| 1 whorl x 60 mm | 896 | **0** | 6.5e-10 |
| `INFILL: x buckle 0.60 f 3` | 289 | **285** | 0.0997 mm |

The worst 3-whorl pair: two triangles 0.70° apart sharing one vertex; triangle B's corner lies ON
triangle A's edge (a T-junction) and B's edge is collinear with A's. The census cannot prove
transversality along a shared line and keeps the hit, reporting the contact's LENGTH — 0.4308 mm from
B's corner to the shared margin vertex, which is the 0.4240 "span". On the 2-whorl flower **all 320 pairs
touch a T-junction**, and the T-vertices are exactly four per petal — a cell vertex inside the basal
panel's last seam edge at each margin, on each skin. The buckle row is the exception: there the seam
crossed (§3).

**(d) The root.** `petalInfillPlan` set `xB = rows[mSplit].u * L` — the RAW station — while the outline's
seam columns, which every cell inherits, are `gq(rows[mSplit].u * L)` on the plan grid. Measured, the seam's
x minus `xB`, over nine lengths:

| `petalLength` | 24 | 28 | 32 | 34 | 35 | 36 | 40 | 50 | 60 |
|---|---|---|---|---|---|---|---|---|---|
| seam x − xB (mm) | −4.7e-8 | −3.7e-7 | −3.2e-7 | +1.8e-8 | +4.2e-7 | +1.9e-8 | +2.9e-7 | −4.3e-7 | −7.8e-8 |
| pairs | 896 | 1600 | 1504 | 0 | 0 | 0 | 0 | 1536 | 896 |

**Never within the 1e-9 bar, and the SIGN decides the fold** — every negative residue folds, every
positive one is clean. Every seam test compares against `xB` on that bar:
- the planner's `snapSeam` (`|q.x − xB| > 1e-9` → not a seam point) — S3's own fix for exactly these
  T-junctions ("108 span-0 tangencies") — **never fired** after the outline was put on the plan grid;
- the emitter's `onSeam` (`|q.x − plan.xB| < 1e-9`) — false everywhere, so the seam's edges were
  refined (`wants`) and rimmed (`emitRimEdge`, beaded) as if they were MARGIN;
- the margin ramp's `!(x > plan.xB)` — zero or not by the sign of the residue.

One boundary, two doubles: this project's registration rule, and the eighth/ninth "discrete decision on a
continuous quantity" class arriving through a quantiser added after the code that relied on equality.
Why exactly the positive sign escapes was not traced further: under the fix both arms are gone.

## 3. The fix, and the census

```js
const xB = infillSnap(rows[mSplit].u * L, infillTieSlack(L));   // the seam's own double
```

The same expression the outline's seam columns use, so every consumer (`snapSeam`, `onSeam`, the ramp,
the seed field, the basal V) reads one value. LAW rows without the infill cannot move (the plan is not
built); §6 measures it.

The census over **every matrix row that turns the infill on** (43 at the base, and block 69's six), both
trees. **Calibration first: all 22 declarations on those rows reproduce EXACTLY on `169fd5b`.** Then:

- **17 entries REMOVED** — every one reads 0 here: `petalWidth 8` (384), `petalWidth 30` (1248 / 1.1442),
  `footDelicacy 0.25` (832 / 0.4333), `petalTipShape 3.00` (1344 / 0.5399), `CONTINUOUS x 3 turns`
  (1040 / 0.4428), `a SPHERE head with a stem` (544 / 0.4675), `40 petals x 3 whorls` (3684 / 0.4276),
  `petalLength 20` (8), `petalLength 60 x density 40` (320), `density 8` (3), `density law 2` (2),
  `stretch 3` (5), `relaxation 0` (4), `solid base 1` (22), `the four at their far ends` (18),
  `sheetThickness 0.60` (6), and `SCOPED OUTLINE: the mixed flower x the Voronoi infill` (1).
  Every #286 row is among them, so **#286's mechanism (a facet crossing under `toLaw`) was not what the
  census saw.**
- **4 RE-RECORDED**, previous figure kept in each note: `buckle 0.60 f 3` 289 / 0.2139 → **3 / 0.1501**
  (the 285 real seam crossings gone; three cell-vs-cell pairs at mid-blade, 1.2 µm deep, the conformance
  limit the entry already names), `cup 1.2 x curl 360` 8776 → 8728, `ALL FORM MAX` 18624 → 18472,
  `roll 330` 31056 → 31080 (worst spans unmoved — the petal's own folds). `roundness 1 x cup 1.2 x curl
  360` reads its declared 8832 / 0.6586 unchanged.
- **0 undeclared rows read a pair.** `SELF_INTERSECTION_XFAIL`: **231 → 214** entries.

## 4. What else moved

- **Triangles:** most infilled rows LOSE a few hundred (the seam's edges are no longer split): the
  3-whorl flower 225,472 → 224,384, the shipping infilled default 109,104 → 108,928, the cost corner
  `INFILL: x 40 petals x 3 whorls` **1,126,592 → 1,121,152 (74.7% of budget)**. A few GAIN, because the
  snap now fires and moves a basal cell's bottom edge onto a lattice column, which can lift its capacity
  over the bar: `petalLength 24` 75,920 → 82,960 (13 → 15 holes), `the four at their far ends` 66,512 →
  74,128 (10 → 12).
- **The pattern:** HOLES_TBD
- **The default bloom (no infill): 24,688, unmoved.**

## 5. Problem 2 — the panel's visibility under a pick: the premise was stale

#421's §8 listed "the lobe / fringe / taper VISIBILITY follows the global mode, not the picked scope's"
as not done. **Measured on `169fd5b`, it is false.** All twelve controls whose predicate reads
`petalOutlineMode` (the tapers, tip shape, squared end, fringe and lobes — all scopeable) are judged in
`applyVisibility` on `viewUi`, whose `scopeEffective` already resolves the scope's outline through
`resolvePetalOutline`. Driven through the real page: whole bloom LAW with layer 2 owning CURVE hides all
twelve on the layer-2 pick and shows them on layer 1; the reverse case mirrors it; a FAN pair and a SPIRAL
turn behave the same; the inheriting scope follows the whole bloom live; the sections derive with them.

So the deliverable is the WITNESS, which nothing had: **panel route (ai)** — the outline-gated controls
found by `predicateDrivers` (never listed), the expected visibility restated from the scope record the page
reports through the registry's own `evalPredicate` (never the page's resolver), three arrangements x both
directions x owning and inheriting, and non-vacuous by construction (the two picks must disagree). Two
mutants, each by its own sentence: *visibility reads the whole bloom's outline mode* and *visibility
ignores the pick*. The banner says TWENTY-SIX routes.

## 6. Gates, rows, bytes

- **I13 (the infill gate): THE SEAM IS ONE BOUNDARY** — (a) every outline point on the seam row has
  x === `plan.xB` (`Object.is`; the outline's own `gq` is the reference), and (b) the census reads 0 pairs
  between the basal panel and the cell region on nine seam states (35/24/28/32/60 mm, petalWidth 30,
  footDelicacy 0.25, tipShape 3, the buckle). The subject is the seam's pairs; a cell-vs-cell fold is the
  petal's own and declared. Mutant `the-seam-is-the-raw-station` restores the raw station in a copy of the
  module (with `bloom-curve.js` beside it): I13_NC_TBD
- **Block 69** (six rows, 1,374 → 1,380): RADIAL x 2 and 3 whorls x infill on the LAW, x 3 on the lopsided
  curve, x 2 on the diamond, and one whorl at 28 and 24 mm — reading **320 / 736 / 321 / 352 / 1600 / 896
  pairs on `169fd5b` and 0 here**. With the fix reverted they are what X2 fires on; the scoped mixed flower
  is block 68's own row (declaration removed). **Smoke block 69** (two rows, `--conn`): 270 rows over 65
  blocks, 187 families both ways.
- **`frozen/phase75`** = the 1,374 rows at `169fd5b`, registered in both maps, `--verify-frozen` PASS.
- **Byte partition:** BYTES_TBD
- GATES_TBD

## 7. Sheet

`node tools/shot-bloom-infill-whorls.mjs <png> --base <worktree of 169fd5b>` → `docs/img/infill-whorls.png`:
the 3-whorl flower BEFORE (736 sites circled — a ring at the inner whorls' roots) and AFTER (0), the seam
macro with the cells tinted, the 2-whorl twin, and a section through the hub with the sites on the kept
half. EXPORT geometry (the print preview's mesh), deterministic software render, no pixel delta quoted.

## 8. Not done, and named

- The positive-residue arm (why 34–40 mm escaped on the raw station) was not traced; the fix removes both.
- #286's three owed doc edits (§12 of the apex-nib doc's "four" → "five", the links) are not this PR's;
  the issue's rows all read 0 now and the PR closes it.
- The census's coplanar-pair hole (`shared.length < 2`) is untouched; this fix removed the T-junctions it
  was misreading rather than teaching the census about them.
