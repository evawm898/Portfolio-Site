# Bloom infill — the port, costed and ruled (discovery, Sep 22 2026)

**No code was changed, no constant moved and nothing was built.** This is a discovery pass over
what it takes to bring the Voronoi infill out of `tools/bloom-voronoi-proto.mjs` and into the
generator, plus Eva's rulings on it, taken the same day. Every figure below is either measured
this session by a read-only probe against `main` at `370521f`, or cited to the doc that measured
it. The probes are described in §8 so any of them can be re-run.

**READ §1 FIRST.** One measurement nobody had taken reorders the plan and is what ruling 2 rests
on: the flat plan does not merely draw stretched cells under curvature — on a reachable
*combination* it emits a wall a quarter of the width the plan asks for.

---

## 0. Eva's rulings (Sep 22)

Carried in from the brief and from the two rulings that closed this pass. Treat 1-7 as fixed.

| # | ruling |
|---|---|
| **1** | **THE INFILL SHIPS OFF**, density **16** when switched on. Named against `lobeDepth` 0 / `fringeCount` 0 / `inflorescence` NONE; **ruling 7 picks which of those two shapes it is.** |
| **2** | **THE ARC-LENGTH METRIC IS REQUIRED.** S2 stands. **0.118 mm on `cup 1.2 x curl 360` is below the 0.3 mm horizontal wall floor — it does not print.** |
| **3** | **SUB-BAR CELLS**: drop *all* sub-bar seeds in ONE pass, recompute, repeat to a small cap, then stop and **report the achieved count**. The cap is a constant to be chosen at build time. |
| **4** | **SEPALS ARE PINNED OFF.** The infill does not inherit through `sepalBladeState`. Turning it on for sepals is a later ruling. |
| **5** | **THE WALL IS 1.0 mm** — already ruled, closed here. |
| **6** | **THE BEAD ON A 1.0 mm WALL** is handled by #278's existing narrow-span clamp (shrink to fit, log the location). Not a new decision. |
| **7** | **THE GUARD IS A CHOICE, NOT A SLIDER** — the `inflorescence` NONE shape, **not** the `lobeDepth` 0 shape. The blanket sweep must not reach it, so **`ALL MAX` stays uninfilled**. |

Carried from earlier passes and unchanged: default **16 cells**; cells always round, the fillet a
proportion of cell scale with the short-edge clamp as a ceiling only; **every cell must retain a
hole >= 1.5 mm across after wall inset**; hole rims take the edge profile, **gated on #278**; the
controls the port carries are **density, cell relaxation, cell density law, anisotropy**.

**RULING 7'S MECHANISM IS STRUCTURAL AND NEEDS NO EXCLUSION OF ITS OWN.** `SWEEPABLE` filters
`SLIDERS()` (`tools/bloom-harness.mjs:8213`), so a CHOICE is out of the blanket sweep **by
construction** — which is exactly why CLAUDE.md can record that no non-`INFLO:` row sets
`inflorescence` at all (0 of 883) and that `ALL MAX` and `ALL MIN` are holders. The guard therefore
needs no `INFILL_GUARD` entry in that filter chain. **The four sub-sliders still do**: density,
relaxation, density law and anisotropy are sliders, hidden at the defaults because their guard is
off, which is the `CURL_SUBS` / `INFLO_SUB_IDS` shape — so `INFILL_SUB_IDS` is owed in
`SWEEPABLE`'s chain, derived from the guard rather than hand-listed. Consequence, stated so it is
checkable at S3: `ALL MAX` is a **HOLDER**, its declared 2,354,268-triangle export refusal is
untouched, and §2d's ~9.4M / ~5.5M projections are **unreachable**.

**STILL OPEN, PENDING RENDERS:** `converge`, anisotropy, and the relaxation slider's range and
default. §7 carries them with the measurements each one needs.

---

## 1. THE FLAT PLAN COMPRESSES A WALL TO A QUARTER OF ITS WIDTH, AND ONLY A PRODUCT DOES IT

The recorded position was that the arc-length-metric plan is a **look** problem — cells stretch
3.0x across the width at cup 1.2 (`docs/bloom-infill-voronoi-salvage.md` §6, §7). Nothing had
measured what the mapping does to the **wall**, which is the printable quantity. It is a
print-safety problem, and it is the reason ruling 2 exists.

### 1a. One control at a time, the flat plan is conservative

Local stretch at the emitted hole-rim points, EXPORT mode, default petal 35 x 16 mm, sheet 1.2 mm,
16 cells, wall 1.0 mm. Every figure is **>= 1.000** — cup makes walls *thicker*, and roll and twist
are isometries across the width.

| state | a 1.00 mm plan wall, across the width |
|---|---|
| default (flat) | 1.00 mm |
| `petalCup` 0.6 | 1.00 - 1.43 |
| `petalCup` 1.2 | 1.00 - 2.26 |
| `petalCup` 1.2 + `petalCupGradient` 1 | 1.00 - 3.21 |
| `petalRoll` 330 | 1.00 - 1.00 (exact) |
| `petalTwist` 180 | 1.00 - 1.00 (exact) |
| `buckleAmp` 0.6 f3 | 1.00 - 1.25 |

### 1b. Combined, it is not — and this is measured on the EMITTED geometry, not on a Jacobian

For every cell that carries a hole, the minimum **3-D** distance from a point on the hole's rim to
that cell's own outer polygon, both mapped through the shipped `petalSurface`. The plan sets it at
**0.500 mm** (each cell insets `w/2`, so the full wall between two holes is 1.0 mm).

| state | plan | **surface** | ratio |
|---|---|---|---|
| default (flat) | 0.5000 | 0.5000 | 1.000 |
| `petalCup` 1.2 **alone** | 0.5000 | 0.5000 | 1.000 |
| `petalSpineCurl` 360 **alone** | 0.5000 | 0.4998 | 1.000 |
| `petalCup` 1.2 x `petalSpineCurl` 180 | 0.5000 | 0.3551 | 0.710 |
| **`petalCup` 1.2 x `petalSpineCurl` 360** | 0.5000 | **0.1183** | **0.237** |
| **ALL FORM MAX** | 0.5000 | **0.1722** | 0.344 |

**IT IS A THIN WALL, NOT A FOLD, AND THE DISTINCTION DECIDES THE REMEDY.** The pair achieving
0.1183 mm has a *plan* distance of **0.624 mm** — it is the locally adjacent wall, compressed by
the map, rather than the sheet coming back on itself. A fold is V5's and no plan change reaches
it; a compression is the plan's, and an arc-length plan fixes it by construction because a wall
measured in surface millimetres is 1.0 mm of surface everywhere.

**AND THE MATRIX CANNOT SEE IT BY CONSTRUCTION** — `buildMatrix()` varies one control at a time,
and each of cup, curl, roll and twist reads 1.000 alone. Same class as §18a's
`cup x petalTipShape` and session 34's composition finding, arriving in a third feature. The
witness that *can* see it is the combination gate, which is why §4 adds two pairs to it.

**FLAT-ONLY WITH CURVED STATES EXCLUDED WAS COSTED AND IS NOT AVAILABLE AS WRITTEN.** The failing
predicate is a PRODUCT, and `visibleWhen` expresses conditions over single controls. An exclusion
would have to be a runtime refusal — a topology decision taken from a continuous quantity, the
class this project has refused six times — and it would be silent on exactly the states a slicer
would reject.

---

## 2. THE COST, AND THE CORRECTION THAT MOVED IT BY A FACTOR OF TWO

### 2a. Today, at the ruled defaults

EXPORT mode, default petal 35 x 16 mm, sheet 1.2 mm, **16 cells, wall 1.0 mm**, the salvage field,
8 petals:

| | triangles |
|---|---|
| plain petal (ships) | 2,356 |
| **infilled petal** | **2,392** (+36, +1.5 %) |
| plain bloom (ships) | 19,040 |
| **infilled bloom** | **19,496** (+456, **+2.4 %**) |

Composition, measured: base panel **316** · lamina **2,076** · **462 hole-rim quads** · 20
cell-outline rim quads. The field builds **17 cells, 16 with holes, 1 solid**.

### 2b. The >= 1.5 mm bar, measured — and it costs nothing at the default

Hole widths (twice the inradius, the prototype's own measure) at 16 cells / wall 1.0, sorted:

```
0.92  0.94  0.96 | 1.52  1.75  1.79  2.12  2.12  2.23  2.47  2.47  2.48  2.48  2.58  2.72  3.13
```

**13 of 16 clear 1.5 mm**, so the achieved count at the ruled default is **13 of 16 asked** — which
is exactly why ruling 3 requires the UI to report it. **The distribution is BIMODAL here**: nothing
lands between 0.96 and 1.52, so on the default petal the ruled 1.5 mm bar selects the *same
thirteen holes* a 1.0 mm bar would. It bites at higher density — at 24 cells, 17 holes clear
1.0 mm and only **9** clear 1.5.

**RULING 3'S CAP IS LOAD-BEARING AND THE REASON IS IN THIS TABLE.** Dropping the three sub-bar
seeds recomputes the diagram, which moves every neighbouring cell — and a cell that was at 1.52
can fall under the bar on the next pass. The iteration is not monotone, so it needs a cap and a
report rather than a fixed point. What the cap should be is a build-time measurement: sweep it and
report where the achieved count stops moving.

### 2c. Under #278 — CORRECTED, and the superseded figure is kept

**THE FIRST REPORT OF THIS SESSION DERIVED THE PER-QUAD RIM COST FROM `RIM_BEAD_SEGMENTS = 8` AND
WAS WRONG BY A FACTOR OF TWO.** It read #278's published default of **33,072** triangles and got
**~15.1 triangles per perimeter quad**, projecting an infilled bloom at ~73,000-77,000. Eva's
correction: the constant was **capped at 4** and the shipped default is **24,688**, which is
**~7.27 tris/quad**. Both figures are kept so the correction is legible.

The decomposition is verified against the shipped tree rather than fitted — with `NR = 59` rows
(3 feet + 56 blade) and `NV = 10`, a plain petal is `2 x 58 x 9 x 2 = 2,088` skin triangles plus
`134` perimeter quads, and `2,088 + 268 = 2,356` and `8 x 2,356 + 192 = 19,040` reproduce `main`
exactly.

| | per quad | infilled petal | infilled bloom |
|---|---|---|---|
| `main`, flat wall | 2.00 | 2,392 | 19,496 |
| ~~#278 at K = 8 (WITHDRAWN)~~ | ~~15.09~~ | ~~9,120~~ | ~~73,154~~ |
| **#278 at K = 4 (shipped)** | **7.27** | **~5,101** | **~40,998** |
| … at the K = 4 ceiling (8.00) | 8.00 | 5,476 | 44,000 |

**So: roughly 41,000-44,000 triangles for the shipping default bloom with the infill switched on**,
against **24,688** for #278's plain bloom and **19,040** today. That is **2.7 % of the 1,500,000
budget**. The multiplier over the same tree is **1.67x**, where the withdrawn figure said 2.22x.

**AN INFILLED PETAL IS OVERWHELMINGLY RIM, which is why the bead's segment count dominates its
cost**: 482 perimeter quads against a plain petal's 134.

**THESE ARE PROJECTIONS AND S3'S FIRST COMMIT OWES THEM MEASURED.** The two features have never
been built together, and the pushed head of #278 (`17cff3a`) still carries
`RIM_BEAD_SEGMENTS = 8` — so the 24,688 figure is real but is not on that branch yet, and this
table should be re-derived against whatever tree actually merges.

### 2d. Which shipped states cross the budget

**Under ruling 1 plus `INFILL_SUBS`: none.** The only infilled rows are block 39's, all at small
petal counts, and the highest lands well under 100,000 triangles.

`ALL MAX` is the corner to watch and **ruling 7 keeps it uninfilled**: the guard is a CHOICE, which
`SWEEPABLE` cannot reach because it filters `SLIDERS()`. So the two projections above are
unreachable through the matrix, `ALL MAX` is a HOLDER in the byte partition, and its declared
2,354,268-triangle export refusal does not move. **It is a construction, not an assertion** — the
thing to check at S3 is that the four sub-sliders are in `INFILL_SUB_IDS`, since those *are*
sliders and the sweep does reach a slider that is merely hidden.

---

## 3. THE INTEGRATION PATH

**THE PROTOTYPE EMITS BESIDE THE SHIPPED MESH IN THE MOST LITERAL WAY AVAILABLE.** `cutThrough`
builds into its own `Acc` class, and `emitBase` is a hand-written second copy of `emitPanel`'s
lattice-and-rim loop. Neither touches `MeshBuilder`.

| file | what changes |
|---|---|
| `bloom-geometry.js` `buildPetalInto` (`:7098`), panel loop (`:7215-7227`) | the one edit — `for (const panel of panels) emitPanel(...)` becomes a two-arm choice |
| `bloom-geometry.js` `emitPanel` (`:7793`) | **not modified for the cells**; **one refactor for the rims** (below) |
| `bloom-geometry.js` — new | `petalInfillPlan(...)` (the field) and `emitInfillPanel(...)` (the sibling emitter) |
| `bloom-geometry.js` `MeshBuilder` (`:714`) | the **material mask** on the captured grid (below) |
| `bloom-registry.js` | four rows + `DEFAULTS` keys + a section + `INFILL_SUBS` |
| `bloom.js` | the read-out line, including **the achieved count** ruling 3 requires |

**`emitPanel` IS A SIBLING PATH, NOT A MODIFICATION — WITH ONE EXCEPTION THAT IS NOT OPTIONAL.**
The blade's cells are a different tessellation of the same rows, so the cell arm is a genuine
sibling: `trimPanels` is untouched, the base panel below the floor still goes through `emitPanel`
verbatim, and **at the guard the petal takes today's path by branch**, which is what makes
"0 bytes moved" a construction rather than a measurement.

The exception is the rim. Under the ruling that hole rims take the edge profile, #278's bead
machinery has to be callable from the cell arm — **and today it is not**. Read on the branch: the
profile loop is built inside `emitPanel` as `(row, column)` index pairs into that panel's own
arrays (`loop.push([rowFrom, j])`, `RUN`, `isRunStart`), so it can only describe a **lattice
boundary**. A hole rim is an arbitrary filleted polygon in the plan. **So `emitPanel` gets one
modification: the profile emission is extracted into a shared `emitRimLoop(acc, loop, opts)`
taking a closed list of `{P, n, tBody, room}` samples**, called by `emitPanel` for its own
boundary and by the cell arm for every hole. Duplicating it would be a second owner of the bead.

**THE GRID CONTRACT IS THE LOAD-BEARING HALF, AND IT IS THE FIFTH DURABLE RULE WAITING TO HAPPEN.**
`captureGrid` has seven readers and `captureLamina` four; among them `bloom-wall-thickness.mjs`'s
`measureWall` (V1-V5) and, through its import, **the whole combination gate (CG0-CG7)**, plus
`/plot`'s `bloom-grid-gltf.js` and `verify-bloom-grid.mjs`. `emitPanel` writes the grid row by row;
an infilled blade has no rows to write.

The tempting fix — keep sweeping `row.sect(v)` over the full `NV` columns and capture the rectangle
as today — **is exactly the trap**: `measureWall` would report a 1.20 mm sheet *at a hole*, and V5
would be green on infilled rows because its subject excludes the thing it doubts. **The honest form
is a per-`(row, column)` material mask captured beside `mid` / `normal`, with `measureWall` reading
it**, so a hole is absent from the measurement rather than measured as solid. `/plot`'s exporter
takes the same mask and stops drawing lines across holes.

**SEPALS ARE PINNED OFF (ruling 4), AND THE MECHANISM IS ONE LINE IN THE RIGHT PLACE.** A sepal is
the petal builder on a second ring, so an infill control read through `petalStateFor` would be
inherited by every sepal for free. `sepalBladeState` already zeroes the rim family
(`petalTipEnd`, `fringeCount`, `lobeDepth`); the infill's guard joins that list. The witness is
`verify-bloom-sepal-decoupled.mjs`, which already sweeps petal-side control values and asserts
0 sepal floats move — the infill's guard is one more value in its sweep.

---

## 4. CELL RELAXATION

**A BLOOM EQUIVALENT DOES EXIST — WHAT DOES NOT EXIST IS A BLOOM CONTROL.** `fieldSalvage` already
runs Lloyd: `LLOYD_PASSES = 4`, density-weighted (the centroid under `rho = 1/spacing^2`, so the
grading survives relaxation), **in the anisotropic metric**. The flower's is `voronoiLloyd`, 0-20,
default 8. So "build relaxation" is really "promote a constant to a slider and choose its range".

**Measured on this tree**, N16 / wall 1.0, median principal ratio of the mid-blade cells:

| seeding / relaxation / cells cut in | ratio |
|---|---|
| aniso / aniso / aniso — the prototype | **2.03** |
| aniso / **flat** / aniso | 1.80 |
| aniso / flat / **flat** | 1.49 |
| aniso / **none** / aniso | 2.50 |
| aniso / aniso / **flat** | 1.50 |

So relaxation **evens the lattice at the cost of elongation** (2.50 unrelaxed -> 2.03 at four
passes), and the anisotropy is carried by the metric the cells are **cut** in, not by where the
seeds relax. The relaxation slider and the anisotropy slider therefore trade against each other,
which is why §6 ships them together rather than one at a time.

**THE FLOWER'S IMPLEMENTATION IS NOT PORTABLE, AND THE REASON IS STRUCTURAL.** `buildVoronoi` reads
`buildSilhouette(P, 72)`, `petalHalfWidth(u, P)`, `cleftConfig(P)`, `getPetalFields(P)` (the Laplace
flow field, for the per-seed `T`-metric), `ribMarginPolyline(P)`, `buildPartition(P, cleftCfg)` and
`ribClipPolygon` — every one a flower petal object.

**What IS portable is two lessons already paid for there**, both of which the bloom field needs the
day a cleft or a lobe is in scope: **one snapshot per pass** (`fullSeeds()` per seed turns a Jacobi
pass into half Gauss-Seidel — 1.1e-14 of drift, measured, and a change to relaxation nothing asked
for), and **the clip polygon must be the material, not the envelope** (the flower found seeds
relaxing into removed material on an odd lobe count that had placed none there). Port the lessons,
not the code.

---

## 5. GATES, MATRIX AND CI

### 5a. Gates

| gate | why | new work |
|---|---|---|
| `verify-bloom-export.mjs` | a holed shell is still a closed shell | block 39 rows; **X1/X2 declarations** — a cell's facets are new census subjects |
| `verify-bloom-connectedness.mjs` | a cell whose walls are all under the floor could detach | block 39 rows |
| `bloom-wall-thickness.mjs` (V1-V5) | **blind today** — `measureWall` reads a grid an infilled blade does not write | the material mask (§3); an infilled row among its twelve |
| `bloom-combination-gate.mjs` (CG0-CG7) | imports `measureWall`; §1 says the hazard is a product | **two new pairs**, tier 1, cited to §1 |
| `verify-bloom-grid.mjs` | clause 2 wants every captured point's two skin vertices in the emitted stream — false at a hole | re-derive onto the mask, as #278 re-derived it onto the offset law |
| `verify-bloom-sepal-decoupled.mjs` | ruling 4 | the guard joins its swept values |
| `verify-bloom-panel.mjs` | four new controls | one route (the nineteenth) — **banner, header entry and the `--negative-control` flag list: three edits, not one** |
| `bloom-smoke.mjs` | CLAUSE C's biconditional over assertion sites | block 39 must raise the **block count**; the I family must be claimed by a row |
| `verify-bloom-apex-mutants.mjs` | a new family needs the table re-run | ~6 infill mutants, witnessed on the mutated module |
| `bloom-xfail-magnitudes.mjs` | new declared magnitudes | re-measure |
| **new** `verify-bloom-infill.mjs` | both STL gates are blind to a wrong **field** | I0-I7 + `--negative-control` |
| **new** `verify-bloom-infill-bytes.mjs` | the guard | the byte partition |

**WHY THE NEW FAMILY IS OWED, IN THE FORM THIS PROJECT STATES IT:** a cell count that ignores the
ruled bar, a hole under 1.5 mm, a relaxation that never runs, an achieved count that disagrees with
what was built, and a sepal that inherited the infill — **all export watertight and as one connected
piece**. Nothing that ships today can see any of them.

### 5b. Matrix

**Block 39 at ~14-18 rows** (the four controls' extremes, the achieved-count corner, a lobed row,
a cleft/fringe exclusion row, §1's two metric corners, a sphere row, a per-petal-variance row) plus
**the blanket sweep's 8** (a minimum and a maximum row per new slider) = **~22-26 rows**, taking
the live matrix from 909 to roughly 935. Smoke gains ~3 rows, `--conn` required while the junction
claims are established. A frozen phase is owed, because the row set changes.

### 5c. CI — RE-DERIVED AT K = 4, AND THE ANSWER CHANGES

Read off `actions_list` at the time of writing (`bloom-export-watertight.yml`, ten most recent
**successful** runs, `run_started_at -> updated_at`):

> **212.6 / 219.7 / 223.0 / 249.8 / 254.2 / 254.3 / 254.4 / 255.5 / 269.2 / 274.6 min** — median
> ~254, over 909 rows.

**And #278's own run is the number that matters.** Run `35694103006`, step 14 (the matrix) ran
06:23:09 -> 11:49:04 = **325.9 min**; the job total was **332.3 min**, against the **360-minute**
job limit. It did not time out — it went red on X2 — so the full matrix genuinely completed in
that time. `bloom-connectedness` went **116.9 min** on `main` to **200.6 min** on #278's head.

Fitting `T(x) = C + S*x` on those two points, with `x` the relative triangle load against `main`:

| | x | export gate | connectedness |
|---|---|---|---|
| `main` | 1.000 | 254 min (median) | 116.9 min |
| ~~#278 at K = 8~~ | ~~1.737~~ | ~~325.9 min~~ | ~~200.6 min~~ |
| **#278 at K = 4** | **1.297** | **~283 min** | **~151 min** |
| **+ block 39 (~24 rows)** | | **~293 min** | **~157 min** |

**So the export gate lands near 293 minutes against a 360-minute limit — about 67 minutes of
headroom.** The first report of this session said "~340-345 min, not comfortable"; at K = 4 it is
comfortable, at the same confidence level.

**THAT CONFIDENCE LEVEL IS LOW AND THE MODEL SAYS SO ITSELF.** It is a two-point extrapolation; the
254 is a median over a 62-minute spread, so the constant carries that spread; the relative load on
the DEFAULT petal is not the relative load over the whole matrix, since rows differ in their rim
fraction; and the connectedness fit returns `C = 3.3 min` of per-row overhead, which is
*implausibly small* and is the clearest sign the two-point model is not to be leaned on.
**This file's own rule applies to its own table: size a CI wait off `actions_list` on the
workflow's own recent completed runs, read at the time — never off a figure written down here.**
The honest number comes from #278's next run at K = 4.

**THE INFILL'S OWN FIELD IS NOT THE COST.** Measured: **15.0 ms per petal** at N16 (field 9.5 ms +
cut 5.5 ms), 18.8 ms at N40. Even a 240-petal head is ~4 s of CPU per build. The cost is triangles.

---

## 6. THE SESSION PLAN (accepted, Sep 22)

Each session is one mechanism. The dependency chain was **#279 -> #278 -> S3**, because #278 was
blocked on X2 and #279 fixes it. **#279 MERGED AS `8f5e209` WHILE THIS DOC WAS BEING WRITTEN**, so
the first link is closed: by its own measurement, #278's head goes from **109 of 191 covered rows
firing X2 to 3**, and those three are the span-0 tangency class it already declares as real folds.
**The live chain is therefore #278 -> S3**, and #278 needs a base merge to pick the fix up.
Neither that change nor the census rule it carries moves any figure here: the prototype and
`bloom-infill-lamina-floor.mjs` import `bloom-self-intersection.mjs` **not at all** — the
0.0009 mm below is a self-APPROACH through the wall instrument's own measure and the prototype's
scratch census, checked rather than assumed.

**S1 · THE CONFORMING EMITTER.** *Prototype only. No gate dependency.* **FIRST.** **DONE —
`docs/bloom-infill-conforming-emitter.md`.** The worst emitted facet on `petalRoll` 330 goes
2.4990 -> 0.4317 mm against the shipped lattice's own 0.5730, and the baseline turned up a second
defect this paragraph does not name: the merge-walk covered its own hole (822 within-shell pairs
on the FLAT default, against the plain lamina's 0). The gate is
`node tools/verify-bloom-infill-conform.mjs` (+ `--negative-control`). **S2's own question is
answered there: subdivision moves the wall compression NEITHER WAY** — §1b's plan wall and the
emitted rim-to-rim wall are identical on both emitters at every state, so ruling 2 stands.
`cutThrough` tessellates a solid cell as a **flat fan** over the whole cell polygon, and a flat fan
across a surface that wraps is a chord: under `petalRoll` 330 — a shipped matrix row — a cell's own
facet cuts through the tube and self-approach reads **0.0009 mm**. A shipped solid that
self-intersects on a matrix row is disqualifying under this project's own invariant. Replace the fan
with a subdivision that follows the surface; prove it with the census reading 0 on roll 330 and on
§1's combined corners.
**Why first:** nothing gates it — and **every number anyone would measure before it moves when the
tessellation changes**. The triangle count, the census, the wall width and the achieved hole count
are all properties of the tessellation, so measuring cost or ruling on a look before S1 is measuring
a state that will not ship. That is the `LADDER_ARC_SHARE` lesson, which cost a session's
justification when live figures from a scratch tree were quoted as the shipped tree's.

**S2 · THE ARC-LENGTH PLAN.** *Prototype only. Gated on S1.* Ruling 2. **DONE —
`docs/bloom-infill-metric-plan.md`.** The plan built in surface distance rather than flat, and
**it is a LOCAL METRIC and not an arc-length reparameterisation**: the midrib is already
arc-length (|dP/dx| reads EXACTLY 1.0000 at v = 0 on every state), the cup lifts the sheet
toward the curl's own centre of curvature (R = 5.5704 mm at curl 360 on the shipping blade),
and the compression varies ACROSS the width at one station — 0.55 at one margin and 1.45 at the
other — so no plan coordinate system can make the map an isometry. What ships is
`kappa(t) = sqrt(det M) / sqrt(t^T M t)` read from a per-petal lattice, with the wall inset, the
fillet radius and the hole bar all asking it for their answer in surface millimetres.
**Acceptance, §1b's table re-run in §1b's own measure**: `cup 1.2 x curl 360` **0.1108 ->
0.5050**, ALL FORM MAX **0.1879 -> 0.5037**, `cup 1.2 x curl 180` **0.3501 -> 0.5025**, against
its nominal 0.5 — and in the session's own IN-SHEET wall (nominal 1.0, the material bridge
between two holes) 0.3050 -> 1.0130, 0.7218 -> 1.0017 and 0.8097 -> 1.0133. **The ruled wall
HOLDS on all thirteen states and does not merely improve.** The gate is
`node tools/verify-bloom-infill-metric.mjs` (+ `--negative-control`); the sheet is
`node tools/shot-bloom-infill.mjs <dir>`. **Cost on the shipping default is ZERO BY BRANCH** —
`planIsFlat` (no form, straight spine) makes the map affine and the field is not built — and the
worst state is +11.3 %, which is a STRETCH giving a cell back its hole. **What S2 did NOT do:
the CELL SIZE is still laid out in the flat plan**, so on a compressed state a cell is smaller
on the object and can lose its hole (`cup 1.2 x curl 360` keeps 10 of 16); that is ruling 3's
achieved count, reported, and making the Voronoi itself metric is a look change and S4's.

**S3 · THE BUILDER, THE GUARD AND THE MATERIAL MASK.** *Gated on #278 and S2.* The big one.
The sibling emission arm; `petalInfillPlan` and `emitInfillPanel`; **one** control (density, guard at
off, ruling 1); the material mask with `measureWall`, the combination gate and `/plot` taught to read
it; the **I family** written and seen red before the geometry exists; block 39; the mutant table
re-run; the byte partition proving 0 moved at the guard; the frozen phase; the achieved-count
read-out (ruling 3); the sepal pin (ruling 4).

**S4 · THE THREE REMAINING CONTROLS.** *Gated on S3.*
Relaxation, cell density law and anisotropy **together**, because §4 measured that relaxation and
anisotropy trade against each other and shipping one at a time would mean ruling on the same look
twice. Plus `INFILL_SUBS`, the panel route, the dead-travel telling on density
(`stamenSpread`'s ruling) and the two combination-gate pairs from §1.

**S5 · HOLE RIMS TAKE THE EDGE PROFILE.** *Gated on #278 and S3.*
Extract `emitRimLoop` from `emitPanel`; call it for every hole. This is the session that spends
§2c's triangles; it moves every infilled byte and wants its own partition and its own sheet.
*Foldable into S3 if #278 has landed comfortably by then.*

**S6 · THE SHEET AND THE REMAINING RULINGS.** *Gated on S4.*
`tools/shot-bloom-infill.mjs` — the shape square, the density sweep with achieved counts in every
caption, the metric on/off pair on `cup x curl`, per-row same-tree controls. This is where §7's
remaining questions get answered from images. *Rendering can begin earlier on the prototype; what
waits for S4 is rendering the thing that ships.*

---

## 7. STILL OPEN

**CLOSED SINCE THIS SECTION WAS WRITTEN:** this pass's question 1 asked whether the guard is a
slider or a choice, on the ground that ruling 1's three precedents are two different shapes. **Eva
ruled it a CHOICE** — see ruling 7 and the mechanism note in §0. The remaining items are unchanged;
1-3 are the ones pending renders.

**1. `converge` — the basal V.** *Pending renders.* 0.025 keeps almost all of 0.000's lightness with
a real stagger; 0.050 buys a millimetre of stagger for five points of basal wall; the prototype's
0.100 is the heaviest of the three and the only one with two millimetres of taper
(`docs/bloom-infill-basal-grading.md` §2, §6).

**2. Anisotropy — default and range.** *Pending renders.* 2.2 asked, **2.03 achieved** at four passes
on this tree; the flower's control is 1-4, default 1.

**3. The relaxation slider — range and default.** *Pending renders.* The flower's is 0-20 default 8;
the prototype is fixed at 4. Coupled to (3) by §4's table, so both want ruling from one sheet.

**4. Ruling 3's cap** — a constant to be chosen at build time, from a sweep of where the achieved
count stops moving. Recorded here so it is not typed.

**5. Carried, not re-opened:** the base's cell size (`baseNarrow` 0.75 / 1.00 / 1.50,
`docs/bloom-infill-basal-grading.md` §6 item 2); `baseReach` and `tipGamma`, never swept; fringe and
cleft, excluded by earlier ruling; lobes, compatible by construction and never rendered with cells.

**6. Pre-existing and not this plan's to fix, but it makes it more expensive:** #231 — the export
refusal costs a **full build** before it returns nothing (120.4 s on `ALL MAX` before #278). Worth
its own PR before S3 if the CI headroom in §5c matters.

---

## 8. HOW TO REPRODUCE EVERY FIGURE HERE

All read-only, on `main` at `370521f`, EXPORT mode unless stated, default petal 35 x 16 mm,
sheet 1.2 mm, the salvage field, `SEED = 7`. No repository file was changed to take any of them.

| § | what | how |
|---|---|---|
| 2a, 2b | petal / bloom triangles, hole widths, cell counts | `node tools/bloom-voronoi-proto.mjs --quick`; the hole widths are `2 * inradiusConvex(hole)` over `cutThrough(...).holes` |
| 2a | the 462 / 20 rim-quad census | count `hole.length` per hole, and the cell edges flagged by `F.isOutlineEdge` |
| 2c | the decomposition | `NR = 59`, `NV = 10`; `2*(NR-1)*(NV-1)*2` skins + `2*(NR-1) + 2*(NV-1)` perimeter quads reproduces 2,356 / 19,040 exactly |
| 1a | the stretch table | finite differences of `ctx.surface.at(u, v)` at the emitted hole-rim points |
| 1b | **the wall table** | densify each hole rim and its cell polygon, map both through `petalSurface`, take the minimum 3-D distance; report the *plan* distance of the same pair to separate a thin wall from a fold |
| 4 | the metric controls | `fieldSalvage(ctx, 16, { relaxMetric, cellMetric, passes })`, printed by the prototype's own `METRIC CONTROLS` line |
| 5c | the run times | `actions_list` on `bloom-export-watertight.yml` / `bloom-connectedness.yml`, `run_started_at -> updated_at`, completed runs only |
| 5c | 15.0 ms/petal | 12 repeats of `fieldSalvage` + `cutThrough`, `process.hrtime.bigint` |

**NAMING THE SAMPLING, because this file's own rule requires it:** every cell-count, hole-width and
triangle figure above is **one seed** (`SEED = 7`) on **one petal**, in **EXPORT** mode. The basal
grading doc sweeps eight seeds and finds real seed-to-seed spread in the basal band; none of the
figures here should be quoted as a population.
