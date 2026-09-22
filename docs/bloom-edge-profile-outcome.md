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

## 7c. The renders

`node tools/shot-bloom-edge-profile.mjs <dir> --base <worktree>` —
`docs/img/edge-profile/`. The three cells the brief named, each a pair:

| | before | after |
|---|---|---|
| **a wide petal**, the margin at half length (`petalWidth` 30) | ![](img/edge-profile/wide-before.png) | ![](img/edge-profile/wide-after.png) |
| **a pointed apex** (`petalTipShape` 0.60, the acute floor) | ![](img/edge-profile/apex-before.png) | ![](img/edge-profile/apex-after.png) |
| **the narrowest span** (a cleft at six whorls, the bead shrunk to fit) | ![](img/edge-profile/narrow-before.png) | ![](img/edge-profile/narrow-after.png) |

**The pair shares ONE camera and that is an identity, not a promise.** The
target is a point of the captured MID-SURFACE, computed on the base tree — and
the mid-surface is byte-identical between the trees, which is exactly what
`verify-bloom-grid-bytes.mjs` proves over 242 builds. So the base tree owns a
number this session's geometry writes, and neither cell is told a camera by
the sheet. Print preview is ON in every cell, with the app's own `shownMode`
asserted `export`.

**No pixel delta is quoted for any pair** — two trees, two servers, two page
sessions. The one pixel number is the same-tree control: the wide cell on this
tree, one camera, shot twice, **1 px of 384,400**. Reported, never a bar; a
single control draw is not a floor.

**THE CAMERA DIRECTION WAS BACKWARDS IN THE FIRST DRAFT AND THE SHEET RENDERED
BLACK.** `__bloomFrame`'s `dir` is the vector FROM the target TO the camera
(the stem-plug sheet's "from below" is a negative z), so the first version put
the eye inside the solid. Recorded because a black cell is the loud failure;
the quiet one would have been a camera slightly inside a petal.

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

---

# Eva's three rulings on the shipped branch

## 10. Ruling 1 — the bead is four segments, with its own normal

> *"cap at 4 at full radius (0.5 mm), scaling down with drawn radius to a
> minimum of 3, with smooth (averaged) normals across the bead. Reason: 8
> segments puts facets at about 0.2 mm, below Nylon 12 White's ~0.35–0.4 mm
> resolvable detail."*

**The cap ships and it is the whole of the saving. The other two clauses are
unreachable, and each is blocked by something this project has already ruled
on** — reported rather than quietly implemented or quietly dropped.

**(i) The scaling never fires, because the only radius `rimSegments` is allowed
to read is a constant.** The DRAWN radius is
`min(RIM_BEAD_RADIUS_MM, tBody/2, RIM_ROOM_FRACTION * room)`, and every arm past
the first is MODE-DEPENDENT: `tBody` carries the export sheet floor and `room`
carries the tip floor (0.15 mm live against 0.80 mm export). A segment count
read off it would make the TRIANGLE COUNT mode-dependent, which both STL gates
assert against by name and which this project has refused six times. What is
left to read is the sheet through `max(t, MIN_FEATURE_MM)` — and that makes the
cap an **identity**, not a measurement: `max(t, MIN_FEATURE_MM) / 2 >=
MIN_FEATURE_MM / 2`, which *is* `RIM_BEAD_RADIUS_MM` on this tree (1.0/2 = 0.5),
so the first arm binds for every finite input and the ratio is exactly 1.
Checked over 100,001 sheet values from 0 to 10 mm plus the extremes: **K = 4 on
every one.**

**(ii) Three is not an available count at all**, and that is structural rather
than a rounding preference. The apex must be an EMITTED vertex at the profile's
own midpoint — `pts[APEX] = apex` with `APEX = K/2`, which E4 and
`verify-bloom-grid`'s clause 2a both read as an IEEE-754 identity — so K is even
or the apex is not on the profile at all. At K = 3 the tangent-angle samples sit
at 0, 60, 120 and 180 degrees and 90 is not among them, so the bead would stop
being symmetric about the mid-surface. **Four is the smallest even count at or
above the ruled minimum, and it is also the cap, so the two ends of the ruled
range meet.**

The min and the ratio are KEPT rather than deleted: they are the ruled law, they
cost nothing, and they become live the day `MIN_FEATURE_MM` drops below the
bead's diameter.

### 10a. The normals are a CHANNEL, because the viewer cannot smooth anything

`bloom.js` builds a **non-indexed** `BufferGeometry`, and `computeVertexNormals()`
on one of those is a FLAT normal per triangle — it cannot average. The three.js
remedy (`mergeVertices` then recompute) averages across EVERY shared edge, which
would round off the foot-to-blade seam and the hub and make the solid read as
wax; smoothing under a crease angle instead needs a position search over up to
four million triangles on every slider drag.

So the bead's normal is emitted where it is known, in closed form. In the
`(n̂, ŵ)` plane the profile is the ellipse `(b cos θ along n̂, aLen sin θ along ŵ)`,
whose outward normal is `(aLen cos θ, b sin θ)` — **the semi-axes swapped, and
that is the whole of it.** Two ends fall out rather than being special-cased: at
θ = 0 it is `+n̂`, which is the top skin's own normal (the bead leaves the skin
tangentially, so the two agree), and at θ = π it is `−n̂`.

**What it leaves out, said rather than hidden:** the term along the SWEEP, which
is non-zero wherever the profile's size changes from one column to the next. It
is a shading approximation and it decides no geometry.

`MeshBuilder({ captureNormals })` is OFF by default and set by the **viewport's
build alone** — the STL writes its own per-facet normal and the grid export
writes line strips, so neither pays for the array.

Measured, rather than argued:

* **0 positions moved** with the channel on, over five states in both modes
  under `Object.is` (DEFAULTS, `petalTipShape` 0.60, the cleft at six whorls, an
  inflorescence, a sphere head with a stem).
* every emitted normal is unit to **4.4e-16**.
* across every bead-to-bead edge the two triangles' own emitted normals agree to
  within **2.1e-6 degrees** — 53% of them to the bit, the residue being the
  probe's own `fround`-keyed vertex lookup. **And that classification had to be
  PER VERTEX**: the first cut of the probe called a triangle "bead" if its three
  normals were not all equal, which catches every triangle straddling the end of
  the treatment and reported half the bead as discontinuous at 21.3 degrees.

### 10b. The cost

Whole live matrix, **909 rows, EXPORT mode, three trees**:

| | main | K = 8 | K = 4 (ships) |
|---|---|---|---|
| matrix total | 50,377,084 | 86,291,522 (+71.3%) | **64,789,898 (+28.6%)** |
| `DEFAULT` | 19,040 | 33,072 | **24,688** (+29.7% / −25.4%) |
| `ALL MIN` | 7,260 | 12,522 | **9,378** (+29.2% / −25.1%) |
| `ALL MAX` | 2,354,268 | 4,239,920 | **3,090,816** (+31.3% / −27.1%) |
| `INFLO: ALL MAX` | 1,114,828 | 1,886,588 | **1,425,468** (+27.9% / −24.4%) |

**The bead's own added triangles fall from 35.9M to 14.4M — a 60% reduction**,
more than the naive halving of K would give, because the corner fans and the
degenerate-skipping scale with it too.

**THE BLOOM HAS NO PRESETS, and that is a fact about this generator rather than
a step skipped.** `bloom-view-presets.js` is the VIEW box's dropdown — camera
position and fov, read by `presetDistance`, building no geometry and carrying no
triangle count; `flower-presets.js` belongs to the other generator, which has its
own three gates. The named matrix corners above are what stands in their place,
and `ALL MAX` is the corner this project's own rule says to measure.

**0 of 909 rows differ between live and export.**

### 10c. `INFLO: ALL MAX` is no longer a refusal

At eight segments it was a NEW refusal and was declared. At four it builds
**1,425,468 — 95.0% of the 1,500,000 budget, under it** — so it exports, and XR2
would fail on a declaration that stayed. Its entry is **withdrawn**, and the
withdrawal is recorded in the block's own header rather than leaving the list
one row shorter with no explanation. It is now the closest any row comes to the
bar; the re-swept matrix puts the next highest at 46%.

### 10d. The gate runtime, projected

Measured on this branch at K = 8: `bloom-export-watertight` **5 h 32 m** (matrix
step 5 h 26 m) and `bloom-connectedness` **3 h 20 m** — **27.7 minutes of
headroom under the 6-hour job timeout**, which was the real risk.

Fitting `t = a + b·T` through main's recent cluster (CLAUDE.md's own last five
successes, 214.8–221.4 min, median 218 at T = 50.38M) and this branch's measured
332 min at T = 86.29M gives b = 3.18 min per million triangles and a = 58 min,
so at T = 64.79M:

| | K = 8, measured | K = 4, projected |
|---|---|---|
| `bloom-export-watertight` | 332 min | **~264 min (4 h 24 m)** |
| `bloom-connectedness` | 200 min | **~153 min (2 h 33 m)** |
| headroom under the 6 h timeout | 27.7 min | **~96 min** |

**The projection carries the spread of the number it is fitted through**, and
that spread is wide by this project's own record: at main's historic low of
151.8 min the same fit gives 225 min instead of 264. So read it as *roughly four
and a quarter hours, with the timeout no longer close* — and **size the actual
wait off `actions_list`'s own recent completed runs at the time**, which is the
rule CLAUDE.md states and which no figure here replaces.

### 10e. E2's typed 30-degree bar was in conflict with this ruling

A half round sampled at K segments turns **180/K** between adjacent facets BY
CONSTRUCTION — that is exactly what the tangent-angle sampling buys, and it is
the bead drawing itself rather than an edge the treatment added. At K = 4 that
is 45 degrees, so **a typed 30 forbids the count Eva ruled**; the two rulings
cannot both be satisfied by a constant. The later one, which states its reason,
governs.

The bar is now the bead's own resolution, read through `RIM_BEAD_SEGMENTS`. **It
is STRICTER than the number it replaces wherever the old one applied** — at
K = 8 it is 22.5 against 30, and the shipped tree measured 21.50 there — so the
derivation would have held on the geometry it replaces as well as on this one.
That is the test that says it is a re-derivation rather than a bar fitted to the
data in hand. The SHADING half of the old bar's job is answered by the other
half of the same ruling: the bead now carries its own smooth normal, so a facet
edge is no longer something the eye can find.

**Four rows exceed it and are DECLARED with their magnitudes** (#213's idiom, in
degrees), because the SURFACE itself turns faster than the outline's PLAN turn
can see:

| row | excess over 45° | why |
|---|---|---|
| `BUCKLE: the default frequency at a strong amplitude (0.30 x, f 3)` | **6.236137** | the wave curves the margin OUT OF PLANE; raw 60.05°, outline 8.81° |
| `TIP SHAPE: 0.60 x the thickest sheet (2.40 …)` | **0.005430** | the taper runs 2.40 → 1.00 mm over `RIM_TAPER_MM`, so the profile's own half-thickness changes along the sweep and the quad is not planar |
| `FRINGE: THE CARNATION — 7 teeth …` | **0.000168** | a tooth's terminal; the frame rotates a hair between adjacent columns |
| `FRINGE: GATED — LOBES asked for under a fringe …` | **0.000168** | the same fringe |

Both directions, band 5e-5 deg (#213's own 5e-5, in the unit this quantity
carries, eight orders above the float floor of an angle taken from two unit
normals and well inside the smallest excess declared). Plus a clause that fails
on a declaration naming a row the gate never ran — the combination gate's CG5,
one instrument later.

## 11. Ruling 3 — the bead does not fold at a pointed apex

> *"the after-render shows a dark notch at the tip of a torpedo-shaped petal
> (lower ring) and a sliver near an upper-right pointed tip. Determine whether
> the bead folds or self-intersects at pointed apexes. Measure it from the
> exported mesh; don't judge it from shading."*

**Measured from the emitted mesh on BOTH trees, and the answer is no on every
instrument.** Every site is located against the petal's own TIP read off the
builder's captured mid-surface, so "at the apex" is the builder's answer and not
the session's.

| | `petalTipShape` 0.60 | cleft × 6 whorls | DEFAULTS | `petalTipShape` 3.00 |
|---|---|---|---|---|
| within-shell census sites within 2 mm of a tip | **0** | **0** | **0** | **0** |
| unmatched DIRECTED edges (an inside-out facet) | **0** | **0** | **0** | **0** |
| triangles at or under the gate's own degeneracy bar (1e-9 mm²) | **0** | **0** | **0** | **0** |
| hairpins (> 150°) within 2 mm of a tip | **0** | **0** | **0** | **0** |

The census was also run on `petalTipShape` 0.60 × the thinnest sheet, × 60 mm
long, and on the cleft at one whorl: **0 sites near a tip on all seven states.**

**The one thing that looked like a finding was the probe's own bar.** At a
threshold of 5e-5 mm² the cleft-at-six-whorls state showed 64 near-tip "slivers"
where main showed none — but the gate's own `DEGENERATE_AREA_MM2` is **1e-9**,
four orders below that, and at the project's own bar the count is **0**. The
smallest facet there is 3.99e-5 mm²: a small triangle on a finely subdivided
bead, not a degenerate one.

**The 174.27° hairpin on the cleft state is MAIN'S OWN** — the identical value
at the identical distance on both trees, 3.20 mm from a tip, with main carrying
72 of them and the branch 88. Pre-existing, and not at an apex.

**And near-tip facet turns are strictly BETTER than main's**, which is the
measurement that settles it (turns over 60°, within 2 mm of a tip, export):

| | main | K = 8 | K = 4 |
|---|---|---|---|
| `petalTipShape` 0.60 | 224 (150 of them 90–120°) | 96 | **32** |
| DEFAULTS | 344 (168 at 90–120°) | 72 | **32** |
| `petalTipShape` 3.00 | 184 (96 at 90–120°) | 16 | **0** |
| cleft × 6 whorls | 12,800 (7,216 at 90–120°) | 7,368 | **6,736** |

Main's worst near-tip turn is **exactly 90.00°** — the flat wall meeting the
skin, which is what the treatment exists to remove.

### 11a. So what was in the render

**Shading, and the ruling's own other half fixes it.** `bloom.js` builds a
non-indexed buffer, so every triangle rendered with its own FLAT normal: an
8-segment bead steps 22.5° a facet at about 0.2 mm, which is a rosette of
discrete shading bands wrapping a pointed tip over roughly a millimetre of
screen. Measured as the Lambert jump across each near-tip edge under one fixed
light, `petalTipShape` 0.60: main 154 edges over a 0.20 jump at a 0.963 mm mean
facet; K = 8 **490 edges at 0.464 mm**; K = 4 367 at 0.770 mm. Three times
main's count at half its facet size is what reads as stippling — and **on the
bead those edges now carry no jump at all**, because the normal is continuous
across them (§10a's 2.1e-6 degrees).

The images are re-rendered at four segments with the bead's own normals:
`docs/img/edge-profile/`.

**No geometry change was made for this ruling, because the measurements say
there is no defect to fix.** That is the finding, not an omission.

## 12. What is deliberately NOT done here

**`SELF_INTERSECTION_XFAIL` is not re-measured.** The tessellation moved with
the segment count, so declared magnitudes have moved: a nine-row subset run
already reads three rows with new pairs, all at **worst span 0.0000 mm** — the
knife-edge class this project documents, where a census triangle grazes a crease
and the count is decided by where the stations land (`TIP SHAPE: 0.60 x a far-out
widest point` 14 pairs, `TIP SHAPE: 0.60 x the thickest sheet` 2, `SPHERE STEM:
the default sphere at the shipped stem` 2).

Eva's ruling 2: *"do NOT declare the 108 rows here. A separate session is fixing
the census instrument as its own PR. Do not touch the census code in this
branch."* So the list is re-measured **once**, at rebase time, against the
instrument that will actually run it — re-recording now would bake in numbers
the census fix changes again.

## 13. The negative control found two holes, and neither was visible on a green run

`node tools/verify-bloom-edge-profile.mjs --control` is required before quoting
a pass from a changed harness, and it earned its keep twice here.

**(i) The new stray-declaration clause misfired in the control itself.** It was
keyed on `!ONLY`, and the control runs five hand-picked rows with no `--only`
flag in sight — so every mutation reported E2 on the four declared rows the
subset does not carry, and four of five mutations read FAIL for a reason that
had nothing to do with the mutation. `runRows` takes a `fullSet` argument now
and the caller says which run it is.

**(ii) E5's only mutant went UNREACHABLE, and that is arithmetic rather than
luck.** `the-segment-count-reads-the-live-sheet` strips the mode-free floor out
of `rimSegments`; at eight segments that took `sheetThickness` 0.60 to six live
against eight export and fired E5. At four, `min(4, max(3, raw))` rounded up to
even is **4 for every raw**, so no input to that function can move K at all —
the mutation still applies, still changes the radius, and changes no count.
`bore-is-not-evas-rule`'s lesson (a mutation is invisible wherever the law it
replaces happens to agree with it), arriving because a later ruling collapsed
the law's range to a point; session 32's retired lerp mutations, one gate later.

It is replaced by the defect `RIM_TIP_ROWS`' own header warns about in so many
words — *"a `drop rows until the gap clears the radius` rule would be this
project's sixth discrete decision on a continuous quantity"* — which reads the
emitted half-width, which carries the TIP FLOOR (0.15 mm live against 0.80 mm
export), so the two modes drop different numbers of rows. A plausible defect
rather than an injected one, and it fires E5.

**And E2's new magnitude clause had no mutant at all.** The control's regex
names `FRINGE: THE CARNATION` and `.slice(0, 5)` took five earlier matches, so
the two clauses holding a declared row to its recorded excess were exercised by
nothing while the run reported 5 of 5. **Found by asking which messages the
control actually printed, not by a failure.** The control now REFUSES unless a
row carrying an `E2_TURN_XFAIL` label is in its set, and appends one if not;
with `BUCKLE: 0.30 x, f 3` present, `the-flat-wall-is-restored` moves its excess
to 53.591109 deg and the clause fires.

`the-rim-floor-is-lowered-to-0.4` legitimately reddens E2 as well — a smaller
bead radius is a different surface, so that row's excess moves 6.236137 →
6.526126 deg. **Named as collateral rather than loosening the clause.**

## 14. Local gates on this tree

* `node tools/verify-bloom-edge-profile.mjs` — **PASS**, 110 rows, 645,428
  treated profiles, 4 of 4 declared surface-turn rows seen.
* `node tools/verify-bloom-edge-profile.mjs --control` — **PASS**, 5 of 5
  mutations redden exactly the clauses they name.
* `node tools/verify-bloom-grid.mjs` — **PASS**, 736 checks over 19 rows.
* `node tools/verify-bloom-panel.mjs` — **PASS**.

Not run locally and not claimed: the full matrix on either STL gate, and
`bloom-smoke --conn`, which exceeds the foreground budget this container
allows. The merge criterion is the full matrix in CI, after the rebase.
