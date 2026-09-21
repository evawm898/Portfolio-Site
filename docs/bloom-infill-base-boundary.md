# Bloom infill — where the solid base should end (Sep 17 2026)

**No repository geometry, registry or gate was touched.** Two files moved, both under `tools/`:
`bloom-voronoi-proto.mjs` gained an optional boundary target (inert at its default — measured,
below), and `shot-bloom-infill-base.mjs` is new. The salvage's field is used **as it stands**:
its metric, seeding, relaxation, grading, fillet radius, basal V and wall law are untouched, and
only `splitRow`'s target moves.

The sheet is published as a private artifact:
**https://claude.ai/artifact/CLCDBEYFeLuyhRi9dUhmyF**.

> **§2's ANSWER IS CORRECTED AND ITS MECHANISM REFUTED — see `docs/bloom-infill-base-panel.md`
> §3.** Two things measured after this doc was written: the sweep below steps about two lattice
> rows at a time and **skipped row 18 (u = 0.2857143), which reproduces BOTH roll-330 readings
> exactly**, so "u = 0.30 is already the correct floor" is one row off and the margin is not
> one lattice row; and the stated mechanism — *"the pair's far end sits between 0.2857 and
> 0.3007"* — is false, the far end being measured at u 0.267857 … 0.285714, in the same row band
> as the query. Everything else here reproduces, including all seven of the sweep's own figures
> and the 0.0017 mm on all-form-max. The caveat this doc names in its own §2 — that the wall
> instrument's twelve STATES carry no infill — is the thing that session measured: **the
> constraint does not bind on an infilled state at any boundary swept.**

Adding a file under `tools/` makes the two FLOWER gates run on the PR (their `tools/**` filter);
no bloom gate keys on these files. They test flower geometry and are not evidence about this.

---

## 0. The question, and the shape of the answer

`docs/bloom-infill-voronoi-salvage.md` starts the pattern at `ROOT_BLEND_END`, u = 0.30, and
says that leaves the basal zone untouched. Eva asked whether the line has to be that high.

**It does. u = 0.30 is already the correct floor, and the margin is one lattice row.** The shipped
boundary sits on the lowest station that preserves every located reading below it; the next
boundary down moves one, by 0.0354 mm. The finding is a measurement, not a preference, and §2
names the constraint and the number.

**A correction to the salvage doc on the way, because this project names its sampling.**
§6 of that doc records "a 2.63 mm half-width waist at u ≈ 0.05". 2.6286 mm is the half-width at
**emitted row 5** (u = 0.0535714); the waist as a property of the **outline** is **2.5820 mm at
u = 0.057939**. The row figure is right about the row and is not the waist. Both are in §3.

---

## 1. What reads the lamina below u = 0.30

Two constants sit at 0.30 and they are deliberately separate (`bloom-geometry.js:4838`):
`ROOT_BLEND_END` (`:2999`) answers *where does the foot stop flooring the width*, and
`FORM_ONSET_END` (`:4844`) answers *where has the form reached full strength*. Everything below
is stated against the first.

**The lattice.** 59 captured rows: 3 foot rows all at u = 0, then 56 blade rows.
`HELD_ROWS = floor(ROOT_BLEND_END * NU) = 16` (`bloom-geometry.js:3137`), so the held block runs
**u = 1/56 = 0.0178571 to 16/56 = 0.2857143** and the first row the ladder is free to move is
**u = 0.3007143**. The prototype's `splitRow` snaps to the nearest row to 0.30 — row 19 — so the
region starts at `uOv = 0.2857143` and **the solid base is rows 0..19, the shipped lattice to
u = 0.3007143**: every held row plus the first free ladder row.

### 1a. Reads the ROW PLAN — a hole changes nothing it measures

These read records `widthProfile`, `bladeStations`, `spineLaw` and `footRing` produce. An infill
is a *meshing* change and writes none of them.

| clause | file:line | exact u range it reads | a holed lamina there |
|---|---|---|---|
| **J1** foot frames on the plane or the cap | `bloom-harness.mjs:2922`, clauses `:2975`–`:3010` | `{0}` — the three foot rows | nothing it measures |
| **J2 / J3** containment, the foot reaching the hub | `:2934`, `:2951` | descriptors; no u | nothing |
| **J4a / J4b** hub thickness, the overlap box | `:2919`, `:2956` | descriptors; no u | nothing |
| **J8** the root chord and the root normal | `:3022` (`m.petalRingRootRows`) | `{seamStep/NU}` = **0.0178571** at the defaults — the first blade row | nothing; the record is the row plan's |
| **J9** `domeLean` and the built tilt | `:3098`, `:3108` | per ring; no u | nothing |
| **A5** the apex narrows monotonically | `:2328`, scan start `:2356` | **starts AT `ROOT_BLEND_END`**; its own comment says *"Below ROOT_BLEND_END it still must not look"* | nothing — it excludes the region by name |
| **A6** the drawn exponent | `:2399` | above `uPk` (0.538 at the defaults) | nothing |
| **A7** the held block is the uniform lattice | `:2473`–`:2474` | **0.0178571 … 0.2857143**, the 16 held stations | reads stations, not lamina — see the caveat below |
| **A7** the first blade row clears the seam | `:2566` | `{blade[0]}` = 0.0178571 | nothing |
| **A8** the widest gap against the bound | `:2592` | every station, opening at `i = 1` | nothing |
| **C1 / C2 / C3** the spine against the law | `bloom-harness.mjs:2077`, rows at `:2109` | every blade row, **0.0178571 … 1** | reads the spine centreline records |
| **L4 / L6** the lobe window | `:1475` | window inside `[ROOT_BLEND_END, uCap]` — `laminaStart` is `ROOT_BLEND_END` (`bloom-geometry.js:3839`, used at `:4134`) | nothing; the window starts at 0.30 |
| **Z6** a role never differentiates the foot | `zygoAssertions` | descriptors | nothing |
| **crowding** `D_max` / `D_mean` and R3 / R4 | `bloom-crowding.mjs:548`, `:584` | `{0}` — `p.footFrames`, three rows | nothing it measures |
| **`bloom-sagitta.mjs`** the `base` zone | `:128` `zoneOfInterval` | `u < ROOT_BLEND_END` is its **`base`** bucket; its recorded worst chord is 0.6325 mm at u = 0.049 | nothing; it reads the profile |

**The one caveat, and it is a build decision rather than a finding.** A7 loops
`Math.min(ld.held, blade.length)` (`:2474`) over `pu.filter(u => u > 0)`. If a build stopped
reporting `profileU` for rows it no longer emits, A7 would check fewer than 16 held rows
**silently** — a vacuity, not a red. If the build keeps the full row plan in `profileU` (the
natural choice, since `widthProfile` and `bladeStations` still run), A7 is unaffected at any
boundary. Nothing here settles that; it is named so the build session does.

### 1b. Reads the EMITTED MESH or the CAPTURED GRID — a hole changes what it measures

| instrument | file:line | exact u range it reads | located reading |
|---|---|---|---|
| **`measureWall`** — V1 calibration, V4 normal, **V5 self-approach (the bar)** | `bloom-wall-thickness.mjs:153`–`:154`, `r.row >= 3` | **every blade row, 0.0178571 … 1** | measured: §2 |
| **grid gate clause 2** every captured point's two skin offsets among the emitted vertices | `verify-bloom-grid.mjs:244` | every captured row, **0 … 1** | no located reading |
| **grid gate clause 3** exactly 57 kept rows, first at 0, strictly increasing, last at 1 | `:276`–`:277` | every captured row | no located reading |
| **`verify-bloom-surface-offstation.mjs`** clause A at every station, clause B **off** the ladder | `:111`, `:159`; clause B `:137` sweeps **u = 0.02 … 0.98** | every blade station, and 0.02 upward between them | no located reading |
| **`verify-bloom-rim-arc.mjs`** R1 / R2 / R3 | `:168` `rows.filter(r => r.u > 0)` | **every blade station, 0.0178571 … 1** | no located reading |
| **`bloom-neighbour-gap.mjs`** the **LAMINA** column | `:161` `lamina(q.rows, 0)` | **every row above the foot** — its BLADE column is `u >= ROOT_BLEND_END` and excludes exactly this region | measured: §2 |
| **X0 / X1 / X2** the self-intersection census | `bloom-self-intersection.mjs:202`, wired at `bloom-harness.mjs:6550` | the whole shell | the declared **EFFECTIVE TILT PAST 90** (49 rows) and **SEAM CLAMPED** (5) classes of the 261-row xfail list are foot-to-blade-seam pairs, u → 0 — below any boundary |
| **O1 / O2** orientation | `bloom-harness.mjs:5989`, `bloom-self-intersection.mjs:342` | per shell, whole mesh | none |
| **plan coverage** | `bloom-plan-coverage.mjs:22` — *"foot rows and blade rows both"* | the whole petal | none |
| **solid-angle coverage** | `bloom-solid-angle-coverage.mjs:37` — the same phrase | the whole petal | none |
| **the export gate's edge census / the flood fill** | `analyzeStl`, `verify-bloom-connectedness.mjs` | the whole mesh | none |

**Everything in 1b is affected at u = 0.30 already**, because the feature replaces the lattice
*above* the boundary whatever its value: the captured grid stops there, the rim strip stops
being at the lattice stations, and a hole is a ray path. That is the FEATURE's cost and it is the
build's to answer — §6 of the salvage doc already names two of them. Moving the boundary adds no
new class of exposure; it moves the line inside one.

**One instrument is exported and called by nothing.** `measureCurvature`
(`bloom-wall-thickness.mjs:217`) carries `uMin = 0.15`, a window that starts inside the basal
zone. Session 34's figures come from it; today it has no caller. Recorded so a session that wires
it knows its window crosses the boundary.

---

## 2. The lowest viable u, and the binding constraint

**u = 0.30 is already the correct floor.** The binding constraint is
**`measureWall`'s SELF reading on `SHIPPED roll 330`** — V5's own number on one of its three
declared `SELF_XFAIL` rows — whose two ends straddle the boundary.

The measurement. `measureWall` takes the captured grid; truncating that grid to the solid base is
exactly what a cut petal does to the capture. Row-exact boundaries, EXPORT mode, default petal:

| target u | region starts at `uOv` | solid base keeps rows 0..mSplit, i.e. u ≤ | roll 330 WALL | moved | roll 330 SELF | moved |
|---|---|---|---|---|---|---|
| **0.3000 (shipped)** | 0.2857143 | **0.3007143** | 0.6974 | **exact** | 0.6586 | **exact** |
| 0.2500 | 0.2321429 | 0.2500000 | 0.6974 | exact | 0.6941 | **+0.0354** |
| 0.2143 | 0.1964286 | 0.2142857 | 0.7010 | +0.0037 | 0.7216 | +0.0629 |
| 0.1786 | 0.1607143 | 0.1785714 | 0.7403 | +0.0429 | 1.5441 | +0.8855 |
| 0.1429 | 0.1250000 | 0.1428571 | 0.8348 | +0.1374 | 1.5441 | +0.8855 |
| 0.1071 | 0.0892857 | 0.1071429 | 0.9749 | +0.2775 | 1.5441 | +0.8855 |
| 0.0714 | 0.0535714 | 0.0714286 | 1.1172 | +0.4198 | 1.5501 | +0.8914 |

The whole blade reads WALL 0.6974 at u = 0.2143 and SELF 0.6586 at u = 0.2679. The shipped
boundary reproduces **both exactly**; the next boundary down moves SELF by 0.0354 mm, because the
pair's far end sits between 0.2857 and 0.3007. (The 1.5441 readings are the neighbourhood
exclusion, not an approach — the instrument has run out of blade.)

**Where every located reading sits**, highest first:

| u | what is there | file:line |
|---|---|---|
| 0.3007143 | the first free ladder row — the top of the solid base | `bladeStations`, `bloom-geometry.js:3276`, `held` read at `:3285` |
| **0.2857143** | the last **held** station; `HELD_ROWS` = 16 | `bloom-geometry.js:3137` |
| **0.2679** | **roll 330's SELF minimum — V5's own `SELF_XFAIL` number** | `bloom-wall-thickness.mjs:293` |
| 0.2143 | roll 330's WALL minimum | `bloom-wall-thickness.mjs:154` |
| 0.1607 | the 8-petal default's **LAMINA** nearest-neighbour approach, 0.0126 mm (its BLADE figure is 0.0299 mm at u = 0.3159) | `bloom-neighbour-gap.mjs:161` |
| 0.1071 | all-form-max's WALL minimum, 0.0036 mm | `bloom-wall-thickness.mjs:154` |
| **0.057939** | the **basal waist** — `rootBlend` hands the outline to the core; session 37's declared 44.54° tangent break, same station | `bloom-geometry.js:3833` |
| 0.0178571 | the first blade row — J8, A7's clearance clause, C3's `startFloor` | `bloom-harness.mjs:3022` |

**Two owners agree on the same number and neither was chosen for the other.** The highest located
reading strictly inside the basal zone is roll 330's SELF at u = 0.2679, and it is inside the held
block that `HELD_ROWS` owns and `A7` pins — *"the rows the root blend can reach keep their uniform
stations, exactly"*. The shipped boundary is the lowest lattice station that keeps both.

**The caveat, stated plainly rather than buried.** `bloom-wall-thickness.mjs`'s twelve STATES
carry no infill today, so V5 would meet this only once a session adds an infilled state — which it
must, because V5 is the only gate on self-approach and an infill is a self-approach feature.
`bloom-neighbour-gap.mjs` is wired to no gate at all. So the constraint binds on the instruments
as they will be used, not on a gate that is red today. It is named rather than asserted.

**And all-form-max's SELF already moves at the shipped boundary**, by 0.0017 mm, because its
partner sits at u = 0.3631 — above 0.30. That is the feature, not the boundary, and it is the
clearest single instance of the 1b point above.

---

## 3. The waist, and what the cells do at the lowest boundary

**The basal waist is at u = 0.057939 (x = 2.028 mm of 35), half-width 2.5820 mm — 5.1641 mm
across.** It is the same station three ways: the local minimum of the half-width over
`(0, ROOT_BLEND_END]`, the crossover where `rootBlend` stops winning `widthProfile`'s `Math.max`
and the core takes the outline, and session 37's declared 44.54° tangent break. **`rootBlend` owns
the outline only to there** — above it the term decays to zero at 0.30 without ever being the max
again.

**How many real holes fit across the blade there.** Outline edges take the full wall on both
margins and one wall between neighbours, every hole at least `MIN_FEATURE_MM` across, so
`k ≤ (2h − w)/(MIN + w)`:

| u | x mm | half-width mm | holes across @ 1.0 mm | @ 0.8 mm |
|---|---|---|---|---|
| 0.0179 | 0.626 | 3.0091 | 2 | 2 |
| 0.0357 | 1.250 | 2.8192 | 2 | 2 |
| **0.0579 (the waist)** | **2.028** | **2.5820** | **2** | **2** |
| 0.0714 | 2.499 | 3.1005 | 2 | 3 |
| 0.0893 | 3.126 | 3.7443 | 3 | 3 |
| 0.1250 | 4.375 | 4.8772 | 4 | 4 |
| 0.1607 | 5.625 | 5.8171 | 5 | 6 |
| 0.1964 | 6.874 | 6.5744 | 6 | 6 |
| 0.2857 | 10.000 | 7.7364 | 7 | 8 |

**And the field puts none of them there.** Counting the holes a vertical cut at the waist actually
crosses, 16 cells, eight seeds, both walls, at the two lowest boundaries:

| boundary `uOv` | wall | holes crossing the waist | open mm of the 5.164 | analytic capacity |
|---|---|---|---|---|
| 0.0536 | 1.0 | **0** (0..0) | 0.000 | 2 |
| 0.0357 | 1.0 | **0** (0..0) | 0.000 | 2 |
| 0.0536 | 0.8 | **0** (0..0) | 0.000 | 2 |
| 0.0357 | 0.8 | **0** (0..0) | 0.000 | 2 |

**The pattern has room to converge and it is not cut off — it converges above the waist on its
own.** The field's basal V reaches `CONVERGE_FRACTION × L` = 3.500 mm up the margins from `xB`, and
at every boundary tested the waist is inside that reach: at `uOv` 0.0357 the V runs from x = 1.25
on the midrib to x = 4.75 at the margins, and the waist at x = 2.03 is inside it. The lowest hole
lands at u ≈ 0.066 (median over eight seeds), 0.008 above the waist.

**The boundary sweep, 16 cells, eight seeds each.** Median with the range in brackets:

| `uOv` | xB mm | wall | real holes | median hole mm | wall fraction | lowest hole u | tris | census |
|---|---|---|---|---|---|---|---|---|
| 0.2857 | 10.00 | 1.0 | 14 (10–14) | 2.23 | **61 %** | 0.3120 | 2708 | 0/2/1, 1/1 ×8 |
| 0.2321 | 8.13 | 1.0 | 15 (13–16) | 2.18 | 59 % | 0.2587 | 2636 | 0/2/1, 1/1 ×8 |
| 0.1964 | 6.88 | 1.0 | 15 (13–16) | 2.22 | 57 % | 0.2232 | 2580 | 0/2/1, 1/1 ×8 |
| 0.1607 | 5.63 | 1.0 | 16 (14–16) | 2.28 | 56 % | 0.1880 | 2656 | 0/2/1, 1/1 ×8 |
| 0.1250 | 4.38 | 1.0 | 16 (14–16) | 2.33 | 56 % | 0.1532 | 2628 | 0/2/1, 1/1 ×8 |
| 0.0893 | 3.13 | 1.0 | 16 (14–16) | 2.25 | 56 % | 0.1195 | 2504 | 0/2/1, 1/1 ×8 |
| 0.0536 | 1.88 | 1.0 | 14 (12–14) | 2.37 | 58 % | 0.0838 | 2228 | 0/2/1, 1/1 ×8 |
| 0.0357 | 1.25 | 1.0 | 14 (12–14) | 2.47 | 56 % | 0.0655 | 2152 | 0/2/1, 1/1 ×8 |
| 0.2857 | 10.00 | 0.8 | 14 (14–16) | 2.42 | **53 %** | 0.3120 | 2752 | 0/2/1, 1/1 ×8 |
| 0.2321 | 8.13 | 0.8 | 15 (14–16) | 2.39 | 51 % | 0.2587 | 2744 | 0/2/1, 1/1 ×8 |
| 0.1964 | 6.88 | 0.8 | 15 (14–16) | 2.46 | 50 % | 0.2232 | 2660 | 0/2/1, 1/1 ×8 |
| 0.1607 | 5.63 | 0.8 | 16 (14–16) | 2.49 | 49 % | 0.1880 | 2704 | 0/2/1, 1/1 ×8 |
| 0.1250 | 4.38 | 0.8 | 16 (14–16) | 2.52 | 48 % | 0.1532 | 2652 | 0/2/1, 1/1 ×8 |
| 0.0893 | 3.13 | 0.8 | 16 (14–16) | 2.42 | 49 % | 0.1195 | 2548 | 0/2/1, 1/1 ×8 |
| 0.0536 | 1.88 | 0.8 | 14 (12–14) | 2.57 | 52 % | 0.0846 | 2252 | 0/2/1, 1/1 ×8 |
| 0.0357 | 1.25 | 0.8 | 14 (12–14) | 2.55 | 50 % | 0.0662 | 2172 | 0/2/1, 1/1 ×8 |

**Boundary edges 0, one vertex-welded shell, one voxel piece at 0.6 mm and at 0.3 mm on every
boundary, every seed, both walls.** The two non-manifold edges are the overlap row shared with the
base panel — the cleft weld's own signature, unrated here as it is in the gates.

Three things the sweep says that were not predicted:

* **Lowering the boundary makes the pattern LIGHTER, not heavier.** Wall fraction falls 61 % → 56 %
  at a 1.0 mm wall and 53 % → 48–50 % at 0.8. §4 of the salvage doc records grading's cost as the
  wall fraction rising; more room to grade into takes some of it back.
* **The lowest hole tracks the boundary exactly** — 0.3120 down to 0.0655 — so nothing is
  clipped off; the V simply starts lower.
* **At the shipped boundary the lowest hole is at u = 0.3120, above the last solid row at
  u = 0.3007.** The solid zone is one full row deeper than the boundary claims.

**One census anomaly, recorded rather than smoothed.** A single draw at `uOv` 0.0357 with N scaled
to 21 (holding the cell SIZE rather than the count) read 0 boundary / **10 non-manifold / 2
shells**, voxel still 1/1 at both cells. It does not reproduce at N = 16 on any of eight seeds. The
vertex-weld shell count is not the connectedness test (this project's own rule) and the flood fill
says one piece, so it is a weld artifact of one layout, not a disconnection — but it is the only
reading on this sheet outside 0/2/1 and it is at the lowest boundary.

---

## 4. The structural note, said once

**The base is where a cantilevered petal's bending moment is highest, so removing material there
is structurally the worst place for it.** Nothing in this project has ever been printed, so that
sentence is a statement about beams and not a measurement of this object; it is recorded, not
solved, and it is not what §2's answer rests on.

---

## 5. The sheet

`node tools/shot-bloom-infill-base.mjs [--out <dir>] [--quick]` →
**https://claude.ai/artifact/CLCDBEYFeLuyhRi9dUhmyF**

Three boundaries — the shipped one, one step lower (where V5's reading first moves), and the waist
— at 16 cells, both walls, the petal alone and close on the base, plus the whole bloom from above
and three-quarter against the plain bloom. Every caption prints the boundary the tool **built**,
not the one asked for, because the split is a row index and a target between two stations snaps to
one. No pixel delta is quoted: the rasteriser is deterministic, so no same-tree control is owed and
none is claimed. **The proportion is Eva's to judge by eye.**

Whole-bloom triangle counts, 16 cells a petal, wall 1.0 mm: plain **19,040**; the shipped boundary
**21,844**; the waist boundary **17,572** — below the plain bloom, because the pattern reaching
further down removes more material than its rims add back.

---

## 6. What moved, and the proof it is inert

`tools/bloom-voronoi-proto.mjs`: `splitRow(ctx, target = U0)` takes a target; `fieldLegacy` gained
an `opts`, `fieldSalvage`'s existing `opts` gained `u0`, and `wholeBloom` passes one through. The
default is `U0` — what every prior call made.

**INERT AT THE DEFAULT: 0 of 226,152 floats differ** over all twelve rendered states (two fields ×
three counts × two walls), head against a `git worktree` of `cf6e985`, compared with `Object.is`.
The positive control: `u0: 0.15` gives 23,652 floats against the default's 23,076 and `uOv` 0.1250
against 0.2857 — the option is reached, so the comparison can fail. And the shipped `--quick` run
reproduces the salvage doc's own table row for row, including its five metric controls
(1.91 / 1.79 / 1.28 / 2.84 / 1.10).

---

## 7. Recorded, not built

* **A7's `Math.min(held, blade.length)` degrades silently.** If a build stops reporting `profileU`
  for rows it no longer emits, A7 checks fewer held rows and says nothing. One clause — *the
  reported station list must still carry `held` blade rows* — closes it, and it belongs to whoever
  wires the infill, not here.
* **`measureCurvature`'s `uMin = 0.15`** starts inside the basal zone and the function has no
  caller. A session that wires it owes that window a look.
* **The wall instrument needs an infilled state** the day the infill ships, or V5 — the only gate
  on self-approach — never meets the feature that is most likely to produce one.
* **The neighbour-gap LAMINA column is the only instrument that reads the basal lamina and reports
  a number for it**, and it is wired to no gate. Its 8-petal default reading (0.0126 mm at
  u = 0.1607, against 0.0299 mm at u = 0.3159 for the blade) is what a boundary below 0.16 would
  stop being able to take.
* **The 0.8 mm wall is the lighter pattern at every boundary** (48–53 % against 56–61 %), on an
  unprinted floor. That trade is §5 of the salvage doc's and is unchanged by anything here.
