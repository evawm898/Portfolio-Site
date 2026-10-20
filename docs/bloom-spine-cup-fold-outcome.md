# The spine against its own cross-section — the fold limit (spine-cup-fold)

*Session of Oct 19–20. #423 declared a new fold on the row `SCOPED SPINE: both curves per layer x cup
0.6` (248 within-shell pairs) and attributed it to the composition, not to scoping: main folds the same
drawn S spine at cup 0.6 with no scope at all. This session diagnosed it, fixed it at its owner and
re-measured everything the fix reaches. Eva's rulings (Oct 19), not re-litigated:*

1. *The fold limit applies to BOTH drawn spine curves and the curl sliders — one function, as built.
   Tightly curled cupped petals open up; that is accepted.*
2. *No extra margin. The limit is reached when the INNER SKIN (not the mid-surface) reaches the bend's
   centre — the clearance is exactly half a sheet, not 1.25 × half a sheet, and nothing beyond it.*

The sheet is `node tools/shot-bloom-spine-cup-fold.mjs <png> --base <worktree of 3dc8ee1>` →
`docs/img/spine-cup-fold.png`.

## 1. The mechanism — an offset surface along the length

A blade is a mid-surface and two skins offset ±t/2 along its normal. Along the LENGTH, a point of the
cross-section sitting a distance `d` toward the spine's centre of curvature moves at `(1 − κ d)` times
the spine's own speed. Where `κ d > 1` it moves BACKWARDS: the sheet folds through itself. A cup lifts
the margins toward the side the blade curls to, so the cupped section REACHES toward the bend's centre;
a roll or a twist does the same by other routes. The spine law (`spineLaw`) never knew the section
existed — its only floor was one sheet thickness of radius, a property of the midrib alone.

On the drawn S at cup 0.6 (`petalLength` 35, EXPORT): at `u` 0.58 the spine bends to **2.87 mm**
while the cupped section reaches **4.32 mm** toward the centre — the margins pass the centre by 1.45 mm
and the sheet passes through itself (43 within-shell pairs on one petal; 248 on #423's scoped row).
**It is not the scoping, not the outline and not the nib**: the same composition folds unscoped on a
plain outline (344 pairs on main, #423 §4), and the curl sliders do exactly the same thing — curl 360 ×
cup 1.2 folds 886 pairs on one petal on main, curl 270 × cup 1.2 363, curl 360 × cup 0.9 561.

## 2. The limit — one table, read by the build and by the editor

`spineBendTable({ length, rows, reachAt, floorRadius, t })` (`bloom-geometry.js`) is the ONE owner.
Per spine substep (`rows × SPINE_SUBSTEPS`) it reads the section's reach toward each side of the bend —
`bendReachAt(u)`: the form's own `sectAt` in a unit frame, the twist entering as `τ = twistRad·u`,
`d = P·(sin τ, cos τ)` over the NV columns — and derives the largest curvature that side may carry:

```
limit radius = reach + t/2          (the INNER SKIN reaching the centre — Eva's ruling 2, no margin)
kLim         = 1 / limit radius      where that radius is past the floor's; Infinity otherwise
```

- `spineLaw` takes the table as `bend`: each substep's curvature is clamped at `min(floor, kLim)` on the
  side it bends toward. `bendClamped`, `floorClamped`, the worst station (`bend`: u, side, asked and
  limit radius, reach) and every applied substep (`bendApplied`) are reported. The uniform arc — which
  the floor never clamps (told `underFloor`) — IS clamped by the fold limit, and a clamped uniform arc is
  built through the general law (`generalSpine`), since it is no longer the closed-form arc.
- **Ruling 1, one function**: the curl sliders (uniform and biased/started laws) and the drawn curve
  go through the same table and the same clamp.
- **The validator asks the build's own law** (`spineBendRefusal`, called by `spineCurveRefusal` after
  the floor): a drawn curve the build would hold at the fold limit is REFUSED in the editor with the
  station, the radius asked, the reach and the radius needed — Q4.4's "refuse, never clamp" for a drag,
  with the table built from the very section on screen (the section does not depend on the spine, so a
  candidate curve meets the same table). A curve LOADED from a file, or made too tight by a later slider,
  is clamped and told, the floor's own treatment.
- **The cup is refused too.** A cup (or cup gradient) edit that would make a DRAWN spine fold is
  refused on the page: each curve petal the edit reaches re-reads its own section at the candidate cup
  (`spine.bendProbe`, petalSurface on its own ring and slot) and asks `spineBendRefusal`; the slider
  goes back and the spine editor's status says why. On the curl sliders nothing is refused — the slider
  family is clamped and told (ruling 1).
- **Told** on the read-out: the SPINE CURVE and SPINE CURL lines gain `FOLD LIMIT on N of M rings: at u
  … the petal's cross-section (its cup, roll or twist) reaches … mm toward the bend's centre, so the
  spine is built at … mm where … mm was asked`.

Zero triangles: the limit moves stations, never the lattice.

## 3. Verification of the ruled clearance — the 8× re-mesh

Eva asked that contacts at the limit be acceptable only if an 8× re-mesh reads 0 crossings. A copy of
the geometry with `NU_BASE` 56 → 448 (its imports copied with it) was censused with a crossing
classifier (a point inside both triangles more than 1e-6 mm from their edges), EXPORT, one petal:

| state | built turn | crossings at 8× |
|---|---|---|
| the S (×0.75, ×1, ×1.25) × cup −0.8 … 1.0, on the LAW and on the spoon — 30 states, 23 clamped | — | **0 on all 30** |
| curl 270 × cup 0.9 / 1.2 (clamped) | 268.3° / 243.9° | **0 / 0** |
| curl 360 × cup 0.9 / 1.2 (clamped) | 321.9° / 279.6° | **0 / 0** |
| curl −360 × cup −0.8 (clamped) | −337.6° | **0** |
| curl 270 × cup 0.9 × bias 0.5 (the general law, clamped) | 239.2° | **0** |
| curl 360 × twist 180 (the twist's reach, clamped) | 321.0° | **0** |
| curl 360 × cup 0.6 (unclamped — the limit does not bind) | 360° | 6,952 — the tip into its own foot (u 0.8–0.9 against u 0); curl 360 alone reads 2,936 with the same signature |
| curl 360 × roll 200 (clamped, 359.4°) | 359.4° | 14,858 — **roll 200 alone folds 9,354 at u 0.2–0.5** (the roll's own cross-section fold), plus the curl-360 tip-into-foot coil |

**So exactly half a sheet is enough: no larger clearance was needed and none was used.** Every crossing
left on a clamped state is a class the limit does not own — the roll's own section folding into itself,
and a full coil bringing its tip back to its foot — which Eva ruled stay declared with their reason.

## 4. What the ruling costs — the built turns (EXPORT, the shipped 35 × 16 mm petal, 56 rows)

| asked | built | radius asked → built at the worst station | one petal's pairs, main → here |
|---|---|---|---|
| drawn S × cup 0.6 | turn 9.8° drawn → −0.3° built | 2.87 → **4.92 mm** at u 0.58 (reach 4.32 + 0.60) | 43 → **0** |
| curl 360 × cup 1.2 | **279.6°** | 5.59 → 10.20 mm at u 0.36 (reach 9.60) | 886 → **0** |
| curl 270 × cup 1.2 | **243.9°** | 7.45 → 10.20 mm | 363 → **0** |
| curl 360 × cup 0.9 | **321.9°** | 5.59 → 7.80 mm (reach 7.20) | 561 → **0** |

At 1.25 × half a sheet (the proposal Eva ruled down) the S × cup 0.6 radius would have been 5.07 mm.

**The boundaries, measured on the shipped mesh** (block 71's rows sit on them): the drawn S accepts cup
0.31 and refuses 0.32 (−0.30 / −0.31 on its other bend); curl 360 is free to cup 0.62 and clamped from
0.63; at cup 1.2 the curl is free to 195° and clamped from 200°.

## 5. Where it binds in the live matrix

A Node sweep of every row in both modes (this tree's own `bendClamped` record): **62 of 1,411 rows bind**
(6 drawn-spine rows, 56 on the sliders), **0 rows bind in one mode and not the other**. Of the 1,396
rows that existed before block 71, **52 bind and 51 of them are declared self-intersectors** — the limit
lands where the census already said the sheet folds (ALL FORM MAX and its family, the ALL INNER MAX
zygomorphy rows, the per-petal max fans, ALL PETALS max, ALL MAX, the buckle composition, the infill's
metric corner, #423's two rows). The one undeclared binder is `FORM VARIANCE: x CONTINUOUS x 3 turns`
(one petal of 24, at a ratio of 1.00), which reads 0 pairs before and after.

## 6. Gates

- **C5** (`c5Clauses`, both STL gates, slider and curve arms): (a) every applied substep's limit is
  `1 / (reach + t/2)` restated from the record and past the floor; (b) the EMITTED spine's three-point
  curvature × (the emitted row's own reach on the bend side + t/2) stays at or under 1 + 0.02 —
  the reach read off the emitted rows (`rowReach`, the row's own section projected on its untwisted
  normal), never the table; (c) `bendClamped` ⇔ a limit was applied.
- **C1(d)** gained the fold refusal: refused for the fold ⇔ the build held the limit. **C1/C2's
  restatements** carry the applied limits (`bendFromRecord`). **C3**'s uniform clause reads
  `floorClamped` (the fold limit may clamp a uniform arc; the floor never does).
- **Block 71** (15 rows, matrix 1,396 → 1,411) at the boundaries; **smoke block 71** (6 rows).
- **Apex mutant table**: four new mutants, each witnessed on the mutated module and firing what it
  names — `the-fold-limit-drops-the-cup` (the reach reads the twist term only: C5),
  `the-validator-forgets-the-fold-limit` (C1), `the-fold-limit-is-not-applied` (C5, with C1),
  `the-fold-margin-measured-from-the-mid-surface` (C5) — on two scoped rows; `a-refused-drag-clamps`
  re-anchored (the floor's refusal is its own `if (worst) return` now).
- **Panel route (ak)** — TWENTY-EIGHT routes: the S at cup 0 refuses a cup of 0.6 (slider back, the
  editor naming the fold, nothing held in the build) and accepts 0.31; curl 270 × cup 1.2 on the
  sliders is clamped and the SPINE CURL line tells the builder's own radius asked and built. Two
  mutants (the cup never refused; the read-out silent).

## 7. The census, re-measured — every mover is a row the limit binds on

`node tools/bloom-xfail-magnitudes.mjs` over every declared row (Node, EXPORT, the builder's doubles):
**50 of 215 declared entries moved, all 50 rows the fold limit binds on** (0 movers anywhere else), plus `ALL MAX` (export-refused, measured through `--include-refused`: 93,107 → 74,716 pairs, span unmoved at 13.6547 mm), and
every one moved toward clean. Each re-record keeps the previous figure in its note and names its site
— the pairs carried back to the builder's own mid-surface by `node tools/bloom-census-attribute.mjs`,
band by band, on this tree and on `--root` a worktree of `3dc8ee1`:

- **19 entries REMOVED — they read 0**: #423's `SCOPED SPINE: both curves per layer x cup 0.6`, the
  `SPINE CURVE: x the form field 0.5` row, `ALL PETALS: max` and six of its siblings, the ALL INNER MAX
  zygomorphy family (`2 layers`, `3 layers` and four of its variants, the foot UPPER clamp, the cleft),
  `FAN x PER-PETAL: … ALL THIN x spread min` and `LOBES: x ZYGO 2 whorls x ALL INNER MAX`. Named with
  their last figures in the block at the head of `SELF_INTERSECTION_XFAIL`.
- **31 RE-RECORDED, smaller, each with its site and reason** (the note says which):
  - the **ALL FORM MAX family** (15 rows — FORM, THIN, claw, LAYERS, CONT, ZYGO × AFM, FAN, FAN
    per-petal × AFM, DEPTH, DOME, SPHERE, BUCKLE × AFM, TIP SHAPE 3.00, FRINGE, INFILL): the limit
    takes 25–65 % of the pairs; what remains is roll 330 folding its own section, the twist and the
    curl-360 tip coming back into its foot — **declared with that reason, as Eva ruled**;
  - the **per-petal maximum fans** (7 rows, e.g. `FAN x PER-PETAL: ALL PER-PETAL MAX x 8/side` 18,411
    → 238): what remains is the ROOT BLEND alone, worst at u 0.02 beside the foot-to-blade seam — below
    where the spine law reaches;
  - `ALL MIN` 669 → 480: the limit clears the root blend and u 0.3–0.5; the tip pairs are main's to the
    pair, band for band;
  - the **buckle composition** (880 → 855) and `BUCKLE: x ZYGO 2 whorls` (17,227 → 2,943): what remains
    is the buckle's own wave ALONG the length on the cupped curl, which the limit (the spine's curvature
    against the section's reach) cannot see — buckle × cup and buckle × curl each read 0 alone;
  - `FORM VARIANCE: x 3 whorls with innerCurl 360` 2,464 → 739: the inner whorls' coil, tip into foot;
  - the two **infill** metric-corner rows (8,728 → 488, 8,832 → 528): on the infilled sheet only — the
    plain bloom at curl 360 × cup 1.2 reads 0;
  - `DEPTH: ZYGO 6 layers x ALL INNER MAX` 32,768 → 1,400 and `TIP SHAPE: x ZYGO 2 whorls` 4,216 → 104:
    root blend, foot and tip.
  - **Two rows read worse in their SPAN alone with fewer pairs**: `CAPABILITY: claw x form max` (6,072
    → 5,840 pairs, 2.4106 → 2.4155 mm) and `INFILL: x roundness 1 x cup 1.2 x curl 360` (8,832 → 528,
    0.6586 → 0.7166 mm) — a worst span is a property of where the stations land on what is left;
    reported, not tuned.
- **2 declared from birth** (block 71): `curl 360 x cup 0.62` (1,408 / 0.5848, the limit does not bind)
  and `x cup 0.63` (1,440 / 0.5761, held to 359.8°) — the curl-360 tip-into-foot coil, the class
  `petalSpineCurl max (360)` declares at cup 0. Every other block-71 row reads 0.

**The combination gate**: 38 cells re-recorded, every one IMPROVED (the cup × curl, gradient × curl, curl
× twist, sepal cup × curl, sepal curl × twist pairs and the cup × roll × curl, curl × twist × roll and
curl × cup × twist triples) — e.g. `cup-x-curl @ cup 1.2 x curl 360` 0.000 → 0.769 mm. **No verdict
changes and no cell clears the 1.00 mm bar**: what is left under it is the same coil and roll. The sepal
cells move because a sepal is the petal builder on a second ring. **The wall instrument**: `buckle-on-form`
SELF 0.300 → 0.4186 mm and its V4 own deficit 0.565 → 0.3263 — the fold limit opens the cupped curl under
the buckle.

**The infill gate**: `I1_XFAIL['ALL FORM MAX']` (the builder's bar estimator against the on-object hole
width, 1.4749 mm) reads **1.5012 mm, over the 1.50 bar**, and is removed as the gate requires — not
because the estimator was fixed (it is still the fix), but because the fold limit holds that state's
curl-360 spine, so the curved plan is compressed less. The map stays, empty.
