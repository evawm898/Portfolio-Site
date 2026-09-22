# The petal's edge profile — a thickness taper and a round bead on the rim

Session outcome. Read this before touching `emitPanel`, the `RIM_*` constants,
`tools/verify-bloom-edge-profile.mjs` or `SELF_INTERSECTION_XFAIL`.

## 1. What shipped

`emitPanel` closed every petal with a FLAT WALL one sheet thickness tall — on
the shipping default that is 42 mm of 90-degree cliff down each margin. It now
eases the sheet toward `RIM_FLOOR_MM` over `RIM_TAPER_MM` of **surface distance
in millimetres** and closes it with a half-round bead whose apex is placed AT
the original boundary point, so the silhouette does not move.

**One construction, not two features.** Every perimeter vertex carries a
profile: a half ellipse from the top skin's edge, out through the apex, back to
the bottom skin's. Two lengths decide it — the rim half-thickness `b`, eased by
smootherstep, and the inset `a` — and the perimeter is walked ONCE as a closed
loop, so the corners cost nothing to get right and the buried ends need no
special case: at `a = 0` the profile collapses onto the flat wall's own segment.

    r = min(RIM_BEAD_RADIUS_MM, tBody / 2, RIM_ROOM_FRACTION * room)

carries all three of Eva's rulings at once — the ruled 0.5 mm radius, "no taper
where the body is already at the floor", and the flower's own `addSlab` clamp
for a narrow span.

## 2. Cost, measured at the corner and not at the default

| row | main | branch | delta |
|---|---|---|---|
| shipping default (export) | 19,040 | 33,072 | +73.7% |
| `ALL MIN` | 7,260 | 12,522 | +72.5% |
| `ALL MAX` | 2,354,268 | **4,239,920** | +80.1% |
| `INFLO: ALL MAX` | 1,114,828 | **1,886,588** | +69.2% |

**The whole matrix was swept for budget breaches rather than the plausible
candidates checked**: 909 rows built in EXPORT mode, **exactly two over the
1,500,000 budget**, and **not one other row within 20% of it**. `ALL MAX` was
already a declared refusal and is re-recorded; **`INFLO: ALL MAX` is a NEW
refusal** and is declared with its count. The headroom everywhere else is not
marginal, which is the useful half of that sweep.

## 3. The rim is sound

* boundary edges **0**, degenerate triangles **0**, **directed**-edge census
  **0 unmatched** on every smoke row; signed volume positive (+4,188.53 mm³
  against main's +4,415.57 — the bead removes material at the rim).
* the worst turn the treatment **adds** near a rim is **21.50°** against a 30°
  allowance.
* the `/plot` grid glTF is **byte-identical to main over 242 builds**.
* `git diff origin/main --stat -- 'flower*'` is empty.

**The directed census is new and it caught the rim wound inside-out** — 2,112
unmatched directed edges and a volume of −455.58 mm³ while boundary and
non-manifold both read 0. `analyzeStl`'s census keys on a SORTED pair, so it is
undirected and structurally blind to this; ST10's stem-plug finding, one solid
later.

## 4. Where the rim goes under the floor, and by how much

Eva's ruling: on a narrow span the bead shrinks to fit and the rim may dip below
1.0 mm, and every such location is reported with its measured thickness. Read
off the BUILDER's own clamp record over the whole matrix:

* **21 rows of 909** carry at least one clamped location; **39,308 locations**
  in total.
* **thinnest rim anywhere: 0.5990 mm**, on `CAPABILITY: cleft x 6 layers`, where
  the span is 0.660 mm and the body is 1.200 mm.
* only **three** rows go below 0.8 mm and all three are cleft rows
  (0.5990 / 0.6286 / 0.7018 mm); **none goes below 0.5 mm**.

## 5. Three of the brief's premises are contradicted by measurement

1. **"A preset that crosses the live triangle ceiling silently keeps its
   last-good mesh."** The bloom has no live ceiling, no last-good-mesh retention
   and no presets — those are the flower's. What the bloom has is an EXPORT
   budget with a loud refusal path (`EXPORT_TRI_BUDGET`, XR1/XR2).
2. **"Segment count scales with drawn bead radius, 8 down to 3."** Unreachable
   once the count is mode-free. `rimSegments` reads
   `max(sheetMm, MIN_FEATURE_MM)`, because a count derived from the LIVE sheet
   differs live/export at `sheetThickness` 0.60 (6 against 8) and how many
   triangles a shell has is topology. Session 32's mode-dependence refusal, a
   sixth time.
3. **"The narrowest reachable panel span is 1.0000 mm."** Measured **0.660 mm**
   in export and 0.124 mm live — a cleft lobe tip.

## 6. The self-intersection census, re-baselined

`node tools/bloom-xfail-magnitudes.mjs --emit` on the branch, against a worktree
of `main`. Of the 302 entries the list carried:

| | rows |
|---|---|
| HELD exactly (pairs and span) | 38 |
| pair count UP | 134 |
| pair count DOWN | 73 |
| read ZERO — genuinely clean | 37 |
| read ZERO — **re-categorised** | 19 |

302 → 246 entries, then **+3 for the real new folds** (§7) = **249**.
Total declared within-shell pairs **1,565,794 → 1,252,860**.

**The 56 zeros split in two and the split is measured, not assumed.** 37 are
rows whose shell decomposition is unchanged on both trees and whose pairs
genuinely went (the largest was 724). The other **19 are every multi-panel row**
— every FRINGE row, every CLEFT row, and `TIP SHAPE: 3.00 x a cleft margin` —
and they did not stop overlapping. The census finds shells by VERTEX WELDING,
and the bead closes each panel with its own boundary, so a tooth panel and the
base panel it overlaps BY DESIGN are two shells here where they were one on
main:

    FRINGE: THE CARNATION   shells 13 -> 41    within 7,288 -> 0    cross 5,992 -> 15,464
    FRINGE: x 40 petals     shells 45 -> 201   within 40,759 -> 0   cross 129,568 -> 197,152
    CAPABILITY: cleft x 6 layers  shells 49 -> 145  within 27,990 -> 0  cross 29,872 -> 67,984

**205,930 of the 312,934 within-shell pairs the list loses are that
re-categorisation and not a repair.** What it costs, said plainly: a tooth
folding through its own BASE panel would now be cross-shell and invisible to
this census. A panel folding through ITSELF is still caught.

## 7. Three rows the edge profile genuinely folds — and 114 that it does not

Every undeclared row was censused on both trees (604 built, 3 over the tool's
triangle cap). **111 read 0 on main and non-zero here**, and they separate
cleanly by the one quantity that is physical, the worst span:

**Three carry real depth and are declared:**

| row | pairs | worst span |
|---|---|---|
| `VARIANCE: size ±50% x 40 petals` | 66 | **0.8187 mm** |
| `DOME: the mum x rise 1 — a hemisphere` | 208 | 0.1658 mm |
| `BUCKLE: THE IRIS look` | 8 | 0.0554 mm |

All three hold the same shell count on both trees, so none is a
re-categorisation. That is the feature's real printability cost: three rows of
604.

**The other 108 are the census, not the geometry, and they are NOT declared.**
Worst span over all of them **2.5583e-9 mm**; 100 read exactly 0, and
**not one is above 1e-6 mm** — measured AFTER the X0 fix of §7b, which took six
rows off this list and left no undeclared row with any real depth at all. Measured on
every sampled pair: the two triangles **share exactly one vertex**, and the
point the census reports as an intersection sits **1.04e-9 to 3.07e-9 mm** from
that shared vertex. `isSharedFeature` discards a point that IS the shared
feature using an **absolute `PT_EPS` of 1e-9 mm** — on coordinates of 20–40 mm,
where one ulp is 6e-15 and the segment-triangle solve's own conditioning
delivers about 1e-9. The bar is the solve's error, and the bead decides which
side of it a vertex falls on, because the treatment puts many more near-tangent
facets around one vertex than the flat wall did. The file's own header says the
HIT test uses a RELATIVE epsilon; the DISCARD test does not.

**THE OBVIOUS FIX IS A WEAKENING, AND THAT WAS MEASURED RATHER THAN ASSUMED.**
Scaling the discard bar by the coordinate magnitude takes 113 of the 117 to zero
(measured before the X0 fix) — **and it takes `VARIANCE: size ±50% x 40 petals`
with them, whose 0.8187 mm fold is real.** It also moves **7 of 40** of main's own declared rows
(`petalCup min (-0.8)` 384 → 360, `petalCup max (1.2)` 752 → 720). So it is not
a correction; do not reach for it. The remedy is the one the census's SECOND
epsilon defect already took — **verify the point rather than widen a
tolerance** — and it is its own piece of work with its own calibration.

**Until that lands, X2 reddens those 108 rows and this PR cannot be green.**
That is the one thing outstanding.

## 7b. X0: the inset bisection's tie was decided by the last bit

**Found by running the browser smoke subset, and invisible to every Node-only
instrument by construction** — in Node the page's build and the rebuild share
one call chain and the difference is exactly 0. CI reported X0 on two rows;
the local `bloom-smoke --conn` reproduced both, at **1.87e-4 mm** and
**9.06e-6 mm** between the exported STL and the builder's own doubles. Those
are not last-bit differences.

`rimInsetV` walks in from the margin to where the chord from the edge point is
`want`, by twelve halvings. **On a flat cross-section `rimDist` is LINEAR in
`v`, and `want` is `g * r` with `r` usually exactly `RIM_BEAD_RADIUS_MM`** — so
the target lands on a DYADIC point of a linear function and the comparison is
an **exact tie**. Measured over the matrix: **102 of 909 rows carry a
comparison with `d === want` to the bit**, at halving 2 or 3, where the bracket
is still a quarter or an eighth of the span. Both rows CI named are in that
set. A tie decided by `<` is decided by the last bit of `sect(mid).P`, the
frame runs transcendentals, and V8 versions disagree there — so the page's
Chromium and Node take different branches and the inset moves by a quarter
bracket.

**The first instrument conflated two things and had to be corrected**: it
counted the buried case, where `want` is 0, `d < 0` is false at every halving
and both engines return the same thing. Excluding it left the real population.

The bar now carries a slack **derived from the quantity's own conditioning, in
the unit the quantity has** — `d` is a hypot of coordinate differences, so its
error is a few ulp of the COORDINATE magnitude (~30 mm), not of `want`
(~0.5 mm). `RIM_INSET_TOL_ULPS = 8`. **Verified in the browser: both rows now
read `X0-identical to the STL` and the export gate passes on them**, and the
declared one still meets its recorded magnitude.

**It moves bytes and the partition is declared: 105 of 909 rows move, 804 hold
bit-identical, 0 triangle counts move, worst 1.953e-3 mm** over 776,623,698
floats compared positionally under `Object.is`. Two microns. The movement is
inherent rather than a badly-sized slack: after an exact tie on a linear `d`,
the later halvings land on dyadic points too, so several comparisons per row
sit within a few ulp of the bar and any slack robust to an engine ulp flips
some of them. **Seventh instance of the discrete-decision-on-a-continuous-
quantity class in this project; do not write an eighth.**

**It also moved the census, which is why it had to land before the list was
final**: six rows came off the new-fold list, and three declared magnitudes
improved — `DOME: the mum x rise 1` 210 -> 208, `GYNOECIUM: style x the mum`
and `STIGMA: a shaped stigma x the mum` 275 -> 272 each. Re-recorded, and the
tool's verdict on the whole list is that every declared magnitude reproduces.

## 8. Gates

New: `tools/verify-bloom-edge-profile.mjs` (E0–E5, five must-fails) and
`tools/verify-bloom-grid-bytes.mjs`. Four existing gates were **re-derived onto
the new offset law rather than loosened**: `verify-bloom-grid` clause 2 (now
2a–2e), the stem channel's ST9 witness, `verify-bloom-surface-offstation`'s
clause A and `verify-bloom-rim-arc`'s R1.

**`verify-bloom-grid`'s negative control found two things after the geometry
settled**, both recorded in that file: `the-bead-apex-is-recomputed`'s anchor
was disarmed by the flat-profile branch landing between the two statements it
matched as one line (the anchor pre-check refused the whole run before any
mutant executed, which is the survivable half of a refactor disarming a mutant);
and `grid-stores-the-row-normal` legitimately reddens the widened 2a, because
2a's second half reconstructs `P ± n·t/2` and therefore reads the stored normal
— 112 of 1072 points, all at `row 0 u = 0`, and only on the three rows where the
row normal and the per-column normal actually differ. The claim was widened, the
clause was not loosened.

## 9. Frozen phase

**None owed.** No matrix row is added or removed by this change (909 rows on
both trees), so `frozen/phase37` stays the newest baseline. Every frozen tag's
BYTES stop reproducing on every row with a petal, which is expected of a change
that re-triangulates every perimeter and is named here rather than in the list.
