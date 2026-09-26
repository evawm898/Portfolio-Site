# The Voronoi infill, S4 — the remaining controls

*Session outcome. Branch from `main` at `4f3d31b` (the prompt named `8bb8685`; `main` had
moved by two merges, and the branch is from the head that was actually there).*

Read `docs/bloom-infill-port-plan.md` §2, §4 and §6 for what this session was asked to build,
`docs/bloom-infill-lamina-floor.md` §8 for the basal boundary control it was asked to unblock,
and `docs/bloom-infill-builder.md` for S3, which everything here sits on.

## 0. What ships

| control | id | range | default | what it is |
|---|---|---|---|---|
| Relaxation | `infillRelax` | 0–12, step 1 | **4** (`INFILL_LLOYD_PASSES`) | Lloyd passes, in the stretched metric, one snapshot per pass |
| Density law | `infillLaw` | 0–2, step 0.05 | **1.00** (`INFILL_TIP_GAMMA`) | cells shrink toward the tip as width^g |
| Stretch | `infillAniso` | 1–3, step 0.05 | **2.20** (`INFILL_ANISO`) | the metric's stretch along the midrib |
| Solid base | `infillBase` | 0–1, step 0.05 | **0** | a FRACTION of the travel from the derived floor up to `ROOT_BLEND_END` |

All four sit in the Infill drop-down inside Petal, hidden AND inert at the guard
(`infillPresent`), out of the blanket sweep through `INFILL_SUBS` (derived from that predicate,
never listed — so the four are out of block 1 and out of `SWEEPABLE` the day they exist), and
their ranges, steps and defaults are IMPORTED from the geometry (Q6, I8 asserts it).

**The three look defaults are the S3 constants THEMSELVES — the same doubles** — and the
basal fraction at 0 hands back the derived floor by a BRANCH (`baseFrac > 0 && baseTravel > 0
? … : baseFloorU`), never `floor + 0 * travel`. So a build at the defaults forms exactly the
expressions S3 shipped, and I8(d) measures it: the plan with the four levers passed explicitly
at their defaults is bit-identical to the plan built without them.

**Relaxation promotes a constant to a control and builds no new mechanism.** `infillRelax`
already computed every cell from ONE snapshot of the seeds and then mapped (a Jacobi pass, not
half Gauss–Seidel — the flower's paid-for lesson, already honoured here), and its clip polygon
is `outline`: the lamina above the split, which is the MATERIAL the cells are cut from (the
basal V takes holes, not material). Both lessons were checked against the code rather than
ported; nothing was re-derived.

**The read-out gains a second INFILL line** — where the holes are along the blade (by fifths
of the drawn length, base to tip, from the builder's own `holeU`), the four levers as the plan
READ them, the basal travel (or DEAD, where the derived floor already sits at
`ROOT_BLEND_END`), and the density's measured dead travel.

## 1. Eva's complaint, diagnosed: confirmed, and the cause is two causes

*"The tip and base stay solid and the holes bunch in the middle."* Measured on the shipping
default petal (35 × 16 mm, sheet 1.2, EXPORT, one seed), holes / cells per tenth of the blade,
base → tip, at the ruled 1.50 mm bar:

| density | cells | holes | tenths (holes/cells) | holes span u |
|---|---|---|---|---|
| 8 | 8 | 8 | 0/0 1/1 2/2 0/0 0/0 2/2 0/0 0/0 2/2 1/1 | 0.18–0.99 |
| 12 | 12 | 11 | 0/0 1/1 2/2 0/0 3/3 0/0 0/0 3/3 0/0 2/3 | 0.14–0.90 |
| **16** | 17 | 14 | 0/0 **1/3** 0/0 3/3 2/2 3/3 0/0 3/3 0/0 **2/3** | 0.13–0.91 |
| 20 | 20 | 19 | 0/0 3/3 1/1 4/4 1/1 2/2 3/3 3/3 0/0 2/3 | 0.11–0.93 |
| 24 | 24 | 16 | 0/0 **0/5** 3/3 2/2 1/1 5/5 0/0 3/5 0/0 2/3 | 0.27–0.91 |
| 32 | 28 | 16 | 0/0 **0/3** 3/5 3/3 3/3 0/2 2/2 2/2 3/3 **0/5** | 0.24–0.82 |
| 40 | 32 | 16 | 0/0 **0/5** 1/3 3/5 3/3 3/5 1/1 2/2 3/3 **0/5** | 0.24–0.82 |

**Confirmed, and it gets worse with density.** At 16 the base tenth (u 0.1–0.2) holds one hole
in three cells and the tip tenth two in three; from 24 up the base tenth reads 0 of 5 and from
32 up the tip tenth 0 of 5. The first tenth (u < 0.1) holds no cell at any density.

**The tip half of the diagnosis is right**: cells scale with the blade's width (`INFILL_TIP_GAMMA`
1 — spacing ∝ h(u)), so at the tip the seeder packs cells the bar cannot fit a hole into; their
CAPACITY reads 0.26–1.06 mm against a 1.50 bar at density 40, and ruling 3's drop only removes
the interior ones (the outline-bounded cells are kept solid by the drop rule, for the reasons
S3's header measures). **The base half is NOT the density law**: the base tenth is empty of holes
at every gamma (0/5 at density 24 for gamma 0 through 2). What takes the base is `INFILL_BASE_NARROW`
(0.75 — cells at the base are three quarters of the mid-blade spacing) and the basal V
(`INFILL_CONVERGE` 0.10 × L up the margins), neither of which is a control, plus the fact that
the first cell region starts at the derived floor u 0.058 and the V clips every hole under a
converging line above it.

**The counterintuitive direction is verified, and the read-out says it the way it measures.**
The law's own description ("0 keeps cells one size and crowds the tip, 1 shrinks them with the
blade so the count stays even") is right about the CELLS and backwards about the HOLES: at
density 16, law 0 puts holes in every one of its 17 cells with the highest at u 0.92, law 1 in
14 with the highest at 0.87, law 2 in 12 at 0.84. At density 24 the top fifth holds 4 holes at
law 0 against 1 at law 2 (I10, strict). **Shrinking the cells is what pushes the tip under the
bar; one size is what fills the tip with holes.** The control's `fmt` names 1 "the tip's cells
fall under the hole bar" and 0 "each big enough to keep its hole".

**The bar's cost, per density, so Eva can revisit it.** Holes clearing 1.5 mm against 1.0 mm on
the default petal (the prompt's "17 clear 1.0 and 9 clear 1.5 at 24 cells" was the PROTOTYPE at
S2; the shipped builder reads differently, because the drop-and-recompute redistributes area):

| asked | at 1.50 mm | at 1.00 mm |
|---|---|---|
| 8 | 8 | 8 |
| 12 | 11 | 12 |
| 16 | 14 | 15 |
| 20 | 19 | 19 |
| 24 | 16 | 22 |
| 32 | 16 | 24 |
| 40 | 16 | 26 |

At the ruled default the bar costs one hole; from 24 up it costs six to ten, and at 1.0 mm the
base tenth comes back (3/5 at 24 and 40). Reported, not changed — the bar is Eva's ruling.

## 2. The sweeps — this is what Eva rules from

`docs/img/infill-s4-{density,relax,law,aniso,base}.png` (`node tools/shot-bloom-infill-s4.mjs
<dir> --png-dir docs/img`): each control across its range, the default petal face on above the
whole bloom, with the achieved count and the along-u fifths baked into every cell. The full sheet
with the long captions is the tool's `index.html`. Every number below is the builder's record.

**The question each answers is "does it fill the tip and base, or move holes around the middle."**

| control | value | cells / holes | fifths base→tip | holes span u |
|---|---|---|---|---|
| density | 8 | 8 / 8 | 0 3 2 2 1 | 0.25–0.93 |
| | 16 (default) | 17 / 14 | 1 3 5 3 2 | 0.15–0.87 |
| | 20 | 20 / 19 | 3 5 3 6 2 | 0.14–0.90 |
| | 24 | 24 / 16 | 0 5 6 3 2 | 0.27–0.89 |
| | 40 | 32 / 16 | 0 4 6 4 2 | 0.24–0.81 |
| relaxation | 0 | 17 / **9** | **0 3 3 3 0** | **0.27–0.77** |
| | 1 | 17 / 14 | 1 3 5 3 2 | 0.14–0.88 |
| | 4 (default) | 17 / 14 | 1 3 5 3 2 | 0.15–0.87 |
| | 12 | 17 / **16** | **3 5 3 3 2** | 0.16–0.87 |
| density law | 0 | 17 / **17** | 1 5 4 6 **1** | 0.17–**0.92** |
| | 0.5 | 17 / 17 | 3 3 5 3 3 | 0.18–0.93 |
| | 1 (default) | 17 / 14 | 1 3 5 3 2 | 0.15–0.87 |
| | 2 | 17 / 12 | 3 3 2 3 1 | 0.17–0.84 |
| stretch | 1.0 | 17 / 16 | 3 3 3 5 2 | 0.14–0.90 |
| | 2.2 (default) | 17 / 14 | 1 3 5 3 2 | 0.15–0.87 |
| | 3.0 | 17 / 14 | 1 5 3 3 2 | 0.16–0.88 |
| solid base | 0 (default) | 17 / 14 | 1 3 5 3 2 | 0.15–0.87 |
| | 0.5 | 16 / 13 | 0 3 5 5 0 | 0.31–0.79 |
| | 1.0 | 16 / 13 | 0 0 5 6 2 | 0.41–0.84 |

What the pictures say, read off them rather than argued:

* **RELAXATION IS THE LEVER FOR BOTH ENDS on this seeder, and 0 is the complaint itself**: at
  no passes the holes live in u 0.27–0.77 with NONE in the base or tip fifth — the seeder's raw
  layout is exactly "bunched in the middle". Four passes (the default) recover a hole at each
  end; twelve put three in the base fifth and take the count 14 → 16. Every pass evens the
  lattice (I11 measures the cell-area spread falling), and even cells are cells that clear the
  bar.
* **THE DENSITY LAW IS THE LEVER FOR THE TIP**, in the direction §1 measured: 0 puts a hole in
  every cell and reaches u 0.92; 2 leaves the last fifth with one hole and five solid cells. It
  does nothing for the base, whose one hole is the V's.
* **THE STRETCH MOVES HOLES AROUND THE MIDDLE** — 14 to 16 holes, no monotone effect on either
  end, and a layout that reshuffles (§3). It is a look control, not a fill control.
* **THE SOLID BASE ONLY RAISES THE FLOOR** (that is what it is for — Eva ruled "as low as it
  goes" as the default): 0.5 starts the cells at u 0.179 and 1.0 at 0.300, the base fifth reads
  0 from 0.25 up, and the hole count falls 14 → 13. It is the lever for how far down the base
  the holes reach, and DOWN is already where they are; the control's range is above the default.
* **THE DENSITY does not fill either end** above 20: from 24 up the base fifth is 0 and the
  count stops at 16 (the dead travel §7 tells).

**No default is moved by this session.** The pictures are for Eva's ruling; the defaults are
S3's constants and the byte partition (§6) depends on that.

## 3. The anisotropy trap: the seeder reshuffles everywhere, so the range is told, not clamped

Swept at 0.02 from 1.00 to 3.00 on the default petal with the relaxation OFF (the seeder alone),
a reshuffle counted as a cell centroid moving more than 1.5 mm between neighbouring steps or the
cell count changing:

| density | reshuffles at | typical step |
|---|---|---|
| 16 | 1.08 1.16 1.34 1.94 2.14 2.30 2.36 2.46 (8 of 100) | 0.29 mm |
| 24 | 1.34 1.36 1.40 2.74 2.82 2.84 2.98 (7 of 100) | 0.31 mm |

The prompt's "past ~2.3" (13 → 16 holes between 2.3 and 2.4 on an earlier tree) is one of these
and not a threshold: the seeder picks each seed by a GREEDY farthest-point score in the stretched
metric, and a greedy choice is discontinuous in the metric at scattered values across the whole
range. **There is no ceiling to clamp under, so the control says plainly that it reshuffles at
some steps** (its `fmt`, on every value). The range is 1–3.

## 4. The combination gate: both pairs are INERT in the density, measured two ways

The prompt bought `infillDensity × petalCup` and `infillDensity × petalSpineCurl` as tier 1 on
the ground that "the cup-times-curl product is what produced the 0.118 mm wall". **That premise
is a snapshot of the FLAT plan; S2 made every wall a surface length and S3 shipped it that way,
and the gate measured what is left rather than declaring it:**

* On `self` (V5's own measure, through the material mask) the density is **bit-identically
  inert** — 1.238 / 1.125 / 1.097 / 1.097 mm at cup 0 / 0.6 / 0.9 / 1.2 and 1.238 / 1.234 /
  1.232 / 1.230 at curl 0 / 180 / 270 / 360, the same digits at density 8, 16, 24 and 40.
  `self` is the sheet approaching ANOTHER PART of itself; on a cupped or curled blade that is at
  the margins and the tip, in material the wall inset keeps the cells out of. CG1 refused both
  pairs on the first run, correctly.
* On the **in-sheet wall between two holes** — a new one-owner measure,
  `tools/bloom-infill-wall.mjs`, S2's `wallSurfaceMm` restated on the SHIPPED plan with the
  surface read directly and never the metric field — the wall is **1.000000 mm on every flat cell
  (to 4e-16) and above it on every curved one**: 1.0045 at cup 0.6 × curl 180, 1.0159 at cup 1.2 ×
  curl 180, 1.0153 at cup 1.2 × curl 360 (S2's prototype read 1.0119 there). The plan lays the wall
  out at `INFILL_WALL_MM` by construction, so a bar EQUAL to the design value is a knife edge: a
  strict `<` flagged 16 cells reading 0.9999996 (the plan grid's own quantum — worst deficit
  3.9e-7 against a grid of 9.5e-7). That measure is I11's, with its bound DERIVED from
  `INFILL_PLAN_GRID` (two rim vertices, each moved at most half a step), and not a combination
  gate's.

So both pairs ship on `self` with verdict **CLEARS** (no cell under the bar, the day one appears
the gate fires) and `infillDensity` declared in `COMBINATION_INERT` at exactly 0 on each — the
`leafToothDepth` form: a number failing in both directions, so the day the density starts reaching
`self` the pair becomes a real product pair. The gate reads 22 pairs, 294 cells; the two grids
are in the gate's own table. **The real claim the pairs carry is a good one: the cells never bring
the sheet closer to itself than the plain blade does, at any density under any cup or curl.**

## 5. The gates

* **I8–I11** in `tools/verify-bloom-infill.mjs`, written before the geometry read the controls
  and seen red (the not-read mutants are the RED-FIRST evidence, since the plan without the
  levers is exactly the mutated copy). Every clause takes the module as an argument, and the S4
  negative control runs SIX mutations of a COPY of `bloom-geometry.js`, each with a WITNESS on the
  mutated module's own record: `the-relaxation-count-is-not-read`, `the-law-is-not-read`,
  `the-stretch-is-not-read`, `the-base-is-not-read`, `the-base-is-a-station-not-a-fraction`,
  `the-density-cap-is-the-asked-density`. **The table found a defect in I10 on its first run**:
  written as `>=` at the default density, it passed a law the plan never read, because at 16 the
  top fifth reads ONE hole at law 0 and ONE at law 2 (one seed). It is strict, at density 24
  (4 against 1, highest u 0.94 against 0.85), and names its sampling.
* **Panel route (u)** in `tools/verify-bloom-panel.mjs` — the banner (TWENTY), the header entry
  and the negative control's flag (`sawLevers`), three edits: the four controls asserted to
  APPEAR as well as to hide, the second INFILL line held to the builder's four values, the base
  control's "cells start at u" to the builder's floor, and the density cap mark present iff the
  builder's cap sits under the ceiling and AT it.
* **Combination gate**: the two pairs, CG0–CG7 clean on the subset; the full gate is CI's.
* **Byte partition**: `verify-bloom-surface-bytes --base <worktree of 4f3d31b> --movers
  '^INFILL: x (relaxation|density law|stretch|solid base|the four)'` over the whole 951-row
  matrix in both modes — see §6.
* **ALL MAX**: proved rather than asserted — `buildMatrix()`'s `ALL MAX` row sets 37 controls
  and NO infill id (`petalInfill` NONE, the four S4 ids absent), and it builds **3,090,816
  export triangles on this tree and 3,090,816 on a worktree of `4f3d31b`**, the first petal's
  infill record `null` on both.
* **flower-untouched**: predeclared, and `git diff --stat 4f3d31b..HEAD -- 'flower*'` is empty at
  close.

## 6. The byte partition: 8 movers / 943 holders, PASS

`node tools/verify-bloom-surface-bytes.mjs --base <worktree of 4f3d31b> --movers '^INFILL: x
(relaxation|density law|stretch|solid base|the four)'` over the whole 951-row live matrix in both
modes, positionally under `Object.is`:

* **1,222,742,268 export floats over 135,860,252 triangles and 80,075,016 captured-grid values.**
* **0 floats moved on the 943 holders** — every row of `main`'s 942 (the two S4 GATED rows are
  holders by construction, and so are all twenty-two S3 `INFILL:` rows, which is the "0 moved
  on any row where the new controls sit at their defaults" claim measured rather than argued) —
  and **all 8 predeclared movers moved**. `--control` perturbs one float by 1e-9 and fires.
* The mover set is predeclared from the labels; the guard predicate cannot name it (every mover
  and every S3 row has the guard ON), so what makes a row a mover here is a NON-DEFAULT value of
  one of the four controls, and the eight are exactly block 39's new non-GATED rows.

**`frozen/phase40` is the 942 rows at `4f3d31b`**, registered in `FROZEN_MATRICES` and
`FROZEN_BASE_COMMITS` and proved deep-equal (`diff-bloom-bytes --verify-frozen --phase40`).
No older tag's bytes stop reproducing: the partition above holds every row of `main` to the bit.

## 7. The density's dead travel, told

There is no closed form for how many holes a blade can hold and the achieved count is NOT
monotone in the asked density (19 at 20, 16 at 24, above), so the telling is a MEASUREMENT:
the builder sweeps the plan at `INFILL_DENSITY_SWEEP` (8, 12, …, 40 — every fourth step, the
ends included) on the REPRESENTATIVE petal only (8–19 ms a plan, once a build), and `densityCap`
is the lowest swept density reaching the sweep's own maximum. The density control draws it as a
tick on the track with the travel above hatched (`applyCaps`, `stamenSpread`'s mechanism), its
`fmt` prints it with the sampling named, the read-out's second INFILL line repeats it, and I10
re-derives it from the gate's own sweep in both directions. On the shipping default it reads
**most holes (19) reached by 20 cells asked**, so the travel from 20 to 40 is dead there. The
range is not narrowed and the maximum is not adaptive.

## 8. Not done, named

* **The base-narrowing law and the basal V are still constants** (`INFILL_BASE_NARROW` 0.75,
  `INFILL_BASE_REACH` 0.30, `INFILL_CONVERGE` 0.10). §1 measured that THEY, not the density law,
  are what keeps the base tenth empty at every density from 24 up, and the solid-base control can
  only move the floor UP. If Eva wants holes lower than the derived floor allows, that is a
  fifth control on `INFILL_BASE_NARROW` (or the V's reach) and its own partition — one registry
  row, on this session's plumbing.
* **The stretch reshuffles mid-drag** and is told rather than fixed; a continuous seeder is a
  different seeder.
* **A lobed blade is still refused**; the cell size is still laid out in the flat plan (S2's
  gap); no default moved.
