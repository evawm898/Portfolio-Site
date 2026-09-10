# Session 38 — the root blend: discovery only, and the brief's mechanism is not the mechanism

**Status: DISCOVERY. Nothing built, no shipped source touched, no push. Committed locally so the
measurements survive a container restart. Waiting on Eva's ruling (§7).**

The brief is `docs/bloom-session-36-outcome.md` §5: petals self-intersect at their own roots at
`layerCount >= 3`, at the shipping defaults, with no cup, no buckle and no sweep; three candidate
designs named without pre-judgement; `footRing()` owns foot placement and a blade-side correction
that re-derives a foot width is disqualified. Every figure below is the shipped census
(`tools/bloom-self-intersection.mjs`, `census()` on the builder's doubles) in **EXPORT mode**
at **NU 56 × NV 10**, on `main` at `08651ad`, unless a row says otherwise. Candidate costings were
run on **scratch copies** of `bloom-geometry.js` under the session scratchpad — the live tree was
never mutated (flower-project skill: "never mutate-and-restore the working tree").

---

## 1. The premise, checked against the code and the sites

The brief's mechanism reads: *`layerSize` shrinks the blade while the foot stays set by the hub
ring, so a short petal collapses a full-width foot across a fixed `ROOT_BLEND_END` and folds.*
Two things say otherwise.

**The foot already scales with the petal.** `footRing()`'s ringed arm:

```
authoredWidth = petalWidth * layerSize^L * 0.4 * footDelicacy
width         = clamp(authoredWidth, FOOT_MIN_WIDTH_MM = 1.6, FOOT_MAX_WIDTH_MM = 10)
```

At 7 × 4 the four rings read (radius / foot width / blade half-width / effective tilt / blade
length, mm and degrees):

| ring | radius | foot width | blade halfW | tilt (`petalTilt` 25 + `layerTilt` 12 × L) | length |
|---|---|---|---|---|---|
| 0 | 13.370 | 6.400 | 8.000 | 25 | 35.00 |
| 1 | 9.627 | 4.608 | 5.760 | 37 | 25.20 |
| 2 | 6.931 | 3.318 | 4.147 | 49 | 18.14 |
| 3 | 4.990 | 2.389 | 2.986 | 61 | 13.06 |

The foot-to-blade ratio is 0.4 on every ring and the 1.6 mm floor binds nowhere at the defaults.
There is no full-width foot to collapse. Candidates 1 and 3 of the brief describe the shipped law.

**Every site sits on the top skin at the ring radius.** Collecting the 364 sites at 7 × 4 and
reading each against its nearest ring (dr = radial distance from `ring.radius`, dz = height above
the foot plane):

| ring | sites | dr range | dz range | worst span |
|---|---|---|---|---|
| 2 | 63 | −0.018 … 0.165 | 0.600 … 0.611 | 0.1648 |
| 3 | 301 | −0.353 … 0.106 | 0.559 … 0.600 | 0.2359 |

dz = 0.600 is exactly t/2 on the 1.2 mm sheet: the TOP skin. Classifying both triangles of every
pair by region (8 × 3, 72 pairs): every pair is two SEAM quads — the quad bridging the foot's last
row to blade row 1, against the quad from row 1 to row 2 — meeting at the top-skin margin.

## 2. The mechanism: an offset-surface fold at the foot-to-blade kink

The foot's three rows are flat in the hub plane with normal +z. The first blade row leaves the
ring row at the effective tilt with normal rotated by that angle. `emitPanel` offsets both skins
by ±t/2 along each row's normal, so the TOP skin is the inside of that bend and retracts toward
the hub by `(t/2)·sin(tilt)` at the seam. When the first blade row (`petalLength · scale / NU`,
uniform below `ROOT_BLEND_END` by A7) sits closer to the ring than that retraction allows, the
bridging quad and the next quad cross. The variables are **first-row spacing, effective tilt and
sheet thickness**. The layer count is a proxy for two of them — it shrinks the spacing by
`layerSize^L` and stacks `layerTilt · L` onto the tilt — which is why it looked like the trigger.

Measured, each varying one thing from 7 × 4 (pairs):

| state | pairs | reading |
|---|---|---|
| 7 × 4 (the brief's row) | 364 | ring 2: 63, ring 3: 301 |
| `layerTilt` 0 AND `petalTilt` 0 (no kink at all) | **0** | the fold needs the bend |
| `layerTilt` 0 (every ring at 25°) | 63 | ring 3 only, span 0.014 |
| `petalTilt` 0 (rings at 0/12/24/36°) | 63 | ring 3 only |
| `layerTilt` 30 (rings at 25/55/85/115°) | 693 | all three shrunk rings |
| `sheetThickness` 2.4 | 812 | thicker sheet, larger retraction |
| `petalLength` 20 | 756 | shorter rows |
| `petalLength` 60 | 63 | longer rows |
| `layerSize` 0.90 | 49 | ring 3 only |
| 8 × 3 with `layerTilt` 0 | **0** | the brief's "3 layers" row, un-stacked |
| 8 × 3 with `layerTilt` 30 | 368 | |
| **one layer**, `petalTilt` 75, `petalLength` 20, sheet 2.4 | **376** | no layers at all |

One layer, `petalLength` × `petalTilt` at the default sheet (pairs; `layerTilt` never enters):

| tilt \ length | 20 | 24 | 28 | 32 | 36 | 40 | 50 | 60 |
|---|---|---|---|---|---|---|---|---|
| 25 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 40 | 56 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 50 | 72 | 56 | 0 | 0 | 0 | 0 | 0 | 0 |
| 60 | 72 | 56 | 56 | 0 | 0 | 0 | 0 | 0 |
| 75 | 312 | 328 | 56 | 56 | 0 | 0 | 0 | 0 |

So **"the inner layers' short petals fold at the root" is true and is not the cause** — the
read-out's `ROOT BLEND AT N LAYERS` line (session 36) describes the symptom on the matrix's rows
and stays accurate as a description; the line's implied mechanism does not.

The `footDelicacy` 0.25 figure in the brief (595) is the same defect from the other side: at 0.25
every shrunk foot clamps to the 1.6 mm floor, narrower than the blade rows that follow, and the
sites move to foot-end-against-seam pairs (77 of the 595 are `SEAM × FOOT-rim/end` on ring 3
alone, dz spanning the full −0.6 … 0.6). A foot NARROWER than the blade adds folds; it does not
relieve them.

## 3. The three candidates, costed in the same units

Same rows, same census, scratch copies of `bloom-geometry.js`:

| candidate | 8 × 3 | 7 × 4 | shipping default bytes (export / live) |
|---|---|---|---|
| **main** | 72 | 364 | — |
| 1 & 3 — foot width × 0.5 on shrunk rings | 80 | 350 | identical / identical |
| 1 & 3 — foot width × 1.5 | 72 | 364 | identical / identical |
| 1 & 3 — foot width × 3.0 | 72 | 364 | identical / identical |
| 2 — `ROOT_BLEND_END` 0.30 → 0.60 | 80 | 385 | **moved / moved** |
| 2 — `ROOT_BLEND_END` → 0.90 | 80 | 385 | moved / moved |
| 2 — `ROOT_BLEND_END` → 0.10 | 128 | 420 | moved / moved |
| (blend held flat at `footHalf` instead of decaying) | 176 | 693 | moved / moved |

- **Candidate 1 (foot width scales with reach) — DEAD, inert.** It is the shipped law, and
  scaling the shipped width by 0.5–3× moves the count by at most 8 pairs in either direction.
  Triangle cost 0. Junction: every consumer of `ring.width` would move (J1–J4 read it, the area
  rule and hub radius move with it) for no change in the count.
- **Candidate 2 (blend length scales) — DEAD, worse.** The fold is at the kink, not along the
  blend; spreading the width change over more rows makes it worse at every value tried. It also
  moves the shipping default in BOTH modes, because `ROOT_BLEND_END` sets the ladder's held-row
  count (`Math.floor(ROOT_BLEND_END * NU)`) on every row. A partition event over the whole matrix
  for a count that goes up.
- **Candidate 3 (`footRing()` gives shorter petals narrower feet outright) — DEAD.** Candidate 1
  restated in the owner's terms; the same measurement. It is the one candidate correctly placed in
  `footRing()`, and it is inert.

None of the three is disqualified on ownership. All three are disqualified by count.

## 4. What clears it, and what it costs — a fourth design the brief did not name

A floor on the FIRST BLADE STATION: the first blade row at least `k · (t/2) · tan(tilt/2)` from
the ring row, `t` the sheet thickness, `tilt` the effective tilt (`petalTilt + slot.tiltExtra +
ring.domeLean` — the builder's own `tilt`). Scratch patch on the stations array in
`buildPetalInto` after `bladeStations()`; the shipping default is byte-identical in both modes
because 35 / 56 = 0.625 mm is above `k · 0.6 · tan 12.5°` for every k below 4.7.

The k sweep (pairs):

| k | 7 × 4 | 6 layers (default) | 8 × 1 tilt 75 len 20 sheet 2.4 | 7 × 4 × `layerTilt` 30 |
|---|---|---|---|---|
| main | 364 | 1968 | 376 | 693 |
| 1.0 | 637 | 2832 | 728 | 1183 |
| 1.2 | 154 | 344 | 168 | 49 |
| 1.5 | 63 | 72 | 0 | 553 |
| **1.8** | **0** | **0** | 1 | 504 |
| 2.0 | 0 | 0 | 0 | 504 |
| 2.5 | 0 | 0 | 0 | 504 |

k = 1.8 reproduces every per-ring observation in §2 (ring 1 at 7 × 4: 0.450 mm against a floor of
0.361 — clean; ring 2: 0.324 against 0.492 — folds; `layerSize` 0.90 ring 2: 0.506 against 0.492
— clean, measured 0; ring 3 at `layerTilt` 0: 0.233 against 0.239 — the marginal 63 with span
0.014). It is not the 2D mitre distance (k = 1); the quads are twisted by the width taper across
the seam, and the extra 0.8 is measured, not derived. **k = 1.0 is WORSE than main** — see cost
(2) below for why.

At k = 2.0 across the heavier xfail rows (main → rule; boundary edges and non-manifold edges
from an exact-position edge census on the builder's doubles; triangle counts identical on every
row):

| row | pairs | worst span | boundary | non-manifold |
|---|---|---|---|---|
| LAYERS: 3 (the layered bloom at its defaults) | 72 → **0** | 0.165 → 0 | 0 → 0 | 0 → 0 |
| layerCount max (6) | 1968 → **0** | 0.550 → 0 | 0 → 0 | 0 → 0 |
| 6 layers × layerSize min (0.35) | 25,944 → **0** | 0.836 → 0 | 0 → 0 | 0 → 0 |
| LAYERS: 3 × ALL THIN | 80 → **0** | | 0 → 0 | 0 → 0 |
| LAYERS: 3 × layerSize min × ALL THIN | 1164 → **0** | | 0 → 0 | 0 → 0 |
| CONTINUOUS × 3 turns | 264 → **0** | | 0 → 0 | 0 → 0 |
| CONT: 3 turns × layerSize min × petalCount 40 | 14,108 → **0** | | 0 → 0 | 0 → 0 |
| SPHERE × 3 turns | 187 → **0** | | 0 → 0 | 0 → 0 |
| 6 layers × layerTilt max (30) | 3384 → 2085 | 0.874 → 1.003 | 0 → 0 | 0 → 0 |
| LAYERS: 3 × layerTilt max (135° effective) | 848 → 578 | | 0 → 0 | 0 → 0 |
| headRise 1 × 3 layers | 728 → 576 | | 0 → 0 | 0 → 0 |
| LAYERS: 3 × ALL FORM MAX | 79,819 → 79,602 | 2.421 → 2.421 | 0 → 0 | 0 → 0 |
| petalCup max (1.2) — an apex row | 752 → 752 | | | bytes identical |
| petalTilt max (75), one layer | 0 → 0 | | | bytes MOVED (the floor binds: 0.625 < 0.83) |
| petalLength min (20), one layer | 0 → 0 | | | bytes identical |

**The live matrix under k = 2.0** (`buildMatrix()` from `tools/bloom-harness.mjs`, 624 rows; 11
`capability` rows skipped because the scratch driver applies control sets and not a row's hook —
the session-36 lesson; both modes, `Object.is` over every emitted coordinate):

- **188 rows move, 425 hold, the shipping default holds.**
- Movers outside the layered families (the floor binding on a tall tilt with a 35 mm petal):
  `petalTilt max (75)`, `headRise max (1)`, `ALL MAX`, the two ZYGO iris rows, every `*Tilt max
  (75)` SLOT and PER-PETAL row (11), the ORCHID rows at 2 whorls in step (8), SLOT ALL MAX (4),
  `SLOT: size ×0.50`, eleven CURL incurve rows, three centre rows with Head rise, and `BUCKLE: ×
  3 whorls`.
- Of the **141 layered rows censused** (`layerCount >= 3`; ALL MAX skipped on cost): **77 go to
  0, 46 reduce, 10 unchanged or worse, 8 were clean on main.**
- No row is added, so **no frozen phase is owed**; `frozen/phase23` (596 rows at `7544796`, the
  newest baseline) would join phase17/19/21 as a tag whose definitions reproduce and whose bytes
  do not, on its share of the 188.
- Triangle cost: **zero** on every row (the row count is NU; only positions move).
- Junction: the foot rows are emitted BEFORE the stations are read, so J1–J4, the crowding raster
  and the read-out's foot lines read unchanged numbers by construction. J8 reads the root chord's
  DIRECTION and the first row's NORMAL, both invariant under a longer first chord on a straight
  spine. **The connectedness flood fill was NOT run** (a browser gate, hours over the matrix);
  the boundary-edge census above is the export contract's own test and reads 0 everywhere.

### The four costs this exposes — none of them is an argument against the direction, all of them are the work

1. **It is a LADDER-side change, not a `footRing()` one.** It reads the owner's `tilt` and the
   ring's thickness and DECLARES nothing about the foot, so it is not the class the brief
   disqualifies. But it collides with **A7** by construction (every station below
   `ROOT_BLEND_END` keeps its uniform value, a bit identity) and with the reading of
   `CURL_START_MIN = 1 / NU` as "the first blade row is one of the held ones". Both would need
   RE-DERIVING as a floor the ladder declares (`bladeStations()` taking the floor as an input and
   the harness asserting the uniform value ABOVE it), never relaxing.
2. **The scratch patch PILES rows rather than redistributing them.** Stations below the floor
   are stacked 1e-4 apart just above it. That is why k = 1.0 is worse than main (near-coincident
   rows make sliver quads that cross) and it is why some rows REGRESS at k = 2.0 — every one on
   the dome or the curl family: `DOME: the mum × rise 1` **0 → 72**, `DOME: the INCURVE TARGET ×
   rise 0.5` 7,350 → 8,641, `CURL: bias max × incurve target × rise 0.5` 6,740 → 8,834, `DEPTH:
   ZYGO 6 layers × ALL INNER MAX` 59,880 → 60,392. A built rule must redistribute the held rows
   over `[floor, ROOT_BLEND_END]` and be measured on THOSE rows first. The 0 → 72 is the row to
   put in the mutant table.
3. **It must read the export floor in BOTH modes.** The scratch patch reads `t` as the builder
   has it — `acc.floorThickness(sheetThickness)`, mode-dependent — and on a 0.6 mm sheet at 3
   layers ring 2's first station differs LIVE (0.017857, uniform) from EXPORT (0.025117, pushed).
   That is the mode-dependent ladder defect session 32 §18h named. The built rule reads
   `max(sheetThickness, MIN_FEATURE_MM)` in both modes, as `ladderHalfAt` already does.
4. **Root chord error grows where the floor binds** (fewer rows over the blend). The sagitta
   instrument (export gate, per row) is the reading to take; it was not run here. The root blend
   already holds the worst chord on the blade (session 32 §13), so this can only make that line
   larger on binding rows.

## 5. Two residual classes that are NOT this defect

The floor cannot reach them at any k, and 24 of the 138 `(… — the root blend)` xfail entries
belong to them rather than to §2:

- **Effective tilt past 90°.** `layerTilt` × depth is uncapped: 7 × 4 × `layerTilt` 30 puts ring
  3 at 115°, "135° effective", "161.25°", "225° on the sixth whorl" are all named rows. Past 90°
  the blade points back OVER the hub and passes through its own foot — sites at 7 × 4 × 30 with
  the rule: 504, all on ring 3, dz spanning 0.02 … 0.93 mm, a real geometric fold and not an
  offset artefact. Whether effective tilt is capped, told or left is a ruling nobody has made.
- **The dome's rim.** `headRise` 1 × 3 layers reads 728 on main with 264 of them on ring 0 — the
  OUTER, unshrunk ring, at the hemisphere's rim where the ring's slope is steepest — and the rule
  leaves 576 there (dr ≈ 0.6, dz ≈ 0.1). `headRise max (1)` at ONE layer is an xfail entry with
  216 pairs and no root-blend tag. Same family as the kink (a foot on a steep cap meeting a
  tilted blade) on a different surface; the flat-arm floor does not address it.

`3 × ALL FORM MAX` (79,819 → 79,602) is the form's own folds (session 36 §6) and was never this
session's.

## 6. Reproduction

Scratch scripts (not committed; described so the numbers can be re-taken):

- **Sites**: build a state through `MeshBuilder({ exportMode: true })` + `buildBloomInto`, run
  `census(positions, { collect: true })`, and for each site take `hypot(x, y) − ring.radius` and
  `z − ring.z` against the nearest ring of `built.rings`.
- **Candidates 1/3**: in a copy of `bloom-geometry.js`, multiply `width` in the ringed arm of
  `footRing()` by a factor for `L > 0`. **Candidate 2**: replace the `ROOT_BLEND_END` literal.
- **The floor**: after `const stations = bladeStations(...)` in `buildPetalInto`, clamp
  `stations[i]` to `(k · (t/2) · tan(|tilt|/2) + i·1e-4) / length` — which is the piling in cost
  (2), deliberately left as the crude form so the regressions it causes are on the record.
- **The matrix pass**: `buildMatrix()` from the harness (needs `playwright-core` installed
  `--no-save` to import), each row's `set` coerced against `DEFAULTS`' types, both trees, both
  modes, `Object.is` per coordinate; census on `layerCount >= 3` rows.

## 7. WAITING ON EVA

Nothing in the brief survives. The sole survivor is the first-station floor: a ladder change
with A7 re-derived, a real redistribution (not the pile), the export floor read in both modes,
188 movers on the live matrix, no phase owed, and 24 xfail entries re-tagged to the two residual
classes it cannot reach.

**The question:** proceed on the first-station floor, or rule on effective-tilt-past-90° first —
since that class caps what ANY root fix can claim, and the two rows the brief cites by name
("135° effective", "225° on the sixth whorl") are in it.
