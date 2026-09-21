# The combination gate — two controls at once

*Sep 19, 2026. `tools/bloom-combination-gate.mjs`. #263 shipped TIER 1 and costed tiers 2
and 3; #265 shipped all fifteen pairs on Eva's ruling. Her reasoning, verbatim: at 25.9 s
and 19.1 s against a 249.9-minute export gate, **runtime is not the cost — the recurring
cost is declared magnitudes, which is proportional to findings, which is what the gate is
for.** The tier tables below are kept as #263 measured them, because the shipped gate
reproduces every one of their figures and that agreement is the reason to trust the
costing method next time.*

---

## 0. The gap, stated once

`buildMatrix()` **varies one control at a time.** That is what makes a matrix row
attributable — a red names the control that moved — and it is exactly why a hazard that
exists only in the PRODUCT of two settings is invisible to every gate in this repository
**by construction**. Three findings have been written down under that heading and left
ungated:

| finding | where | measured |
|---|---|---|
| `petalCup` × `petalTipShape` self-approaches below the printable gap | `docs/bloom-session-32-outcome.md` §18a | 1.031 / 1.019 / 0.977 / 0.832 mm at n 1.20 / 2.00 / 2.50 / 3.00 on cup 1.2 |
| the composition — a buckle over a cup and a curl | `SELF_XFAIL['buckle-on-form']`, `tools/bloom-wall-thickness.mjs` | 0.254 mm, with `cup+buckle` and `curl+buckle` named in its own note |
| a leaf blade against the free stem | `docs/bloom-leaves-outcome.md` | 0.824 / 0.289 / 0.000 mm at `leafAngle` 70 / 75 / 80–90 |

Four separate items want one instrument for this: the inflorescence programme's **ruling
11** (a predeclared product grid, sized before the first build ships, and **ruling 9 does
not stand without it**), the bell/corolla discovery's **question 5** (the cup fold at 0.7
and up — a ruling Eva cannot make without numbers), the **infill's** owed wall state
(`docs/bloom-state-of-play.md` item 13), and items **20** and **21** of that same list.

---

## 1. What the gate is

**One number: the NEAREST APPROACH IN MILLIMETRES between two surfaces that must not
meet**, on a predeclared product grid of two controls, against `MIN_FEATURE_MM` — this
project's one owner of the minimum printable gap, imported and never restated. A number
and not a verdict, because three of the four items above are rulings Eva makes *from* the
number.

**Two measures, each with one owner, named per pair.**

| measure | what it reads | owner |
|---|---|---|
| `self` | the sheet approaching ANOTHER PART OF ITSELF | `measureWall(grid).self` in `tools/bloom-wall-thickness.mjs` — V5's own quantity through V5's own function |
| `leaf-stem` | every LEAF BLADE vertex against the free stem solid | the geometry's own `freeStemDistanceMm`; the petiole rod excluded by the leaf builder's own reported `petioleAxis` (ST9's precedent — name the rod, never widen the region) |

**Every grid's FIRST value on each axis is that control's own registry DEFAULT**, asserted
by CG0. That is not tidiness: it makes the grid CONTAIN its own two single-axis columns, so
the product-only claim costs no extra builds and a moved default reddens this gate rather
than silently re-pointing it.

**THE LADDERS ARE SHARED BETWEEN PAIRS ON PURPOSE.** `petalCup` is `[0, 0.6, 0.9, 1.2]` and
`petalSpineCurl` is `[0, 180, 270, 360]` wherever either appears, so a cell that turns up in
two grids is the same state read twice and its two records cannot disagree. A rotation in
degrees is laddered by its own landmarks — half turn, three-quarter turn, the slider's own
maximum — which is why `petalRoll` is `[0, 180, 270, 330]` rather than a set of even
fractions: 330 is that slider's maximum and is `SELF_XFAIL['roll-max']`'s own state.

### The eight clauses

| | what it asserts |
|---|---|
| **CG0** | every declared value is inside its control's registry range, and each axis starts at that control's own default |
| **CG1** | **per axis**, the control must move the measure by more than `COMBINATION_TOLERANCE_MM` somewhere on the grid. A pair whose second control cannot reach the measure is a single-axis sweep wearing a product's clothes, and it satisfies every other clause here perfectly. **The bar is the BAND and is derived rather than typed** — an `Object.is` test is satisfied by one ulp, and that is not hypothetical: `lobeDepth` moves the cup column by **2e-16 mm**, inert for every purpose and not bit-identical. An axis DECLARED in `COMBINATION_INERT` is CG7's instead |
| **CG2** | no cell may come within `MIN_FEATURE_MM` except those declared in `COMBINATION_XFAIL` — **both directions**: a declared cell that starts CLEARING is the fix landing and fails hard |
| **CG3** | a declared cell must still read its recorded millimetres within `COMBINATION_TOLERANCE_MM`, **both directions** (#213) |
| **CG4** | **a three-way biconditional on `verdict`** — see below |
| **CG5** | every key in `COMBINATION_XFAIL` names a cell some grid produces |
| **CG6** | **provenance.** Every pair declares its `tier`, and a `cite` naming at least one file that EXISTS in this tree, and `guess: true` **iff** the tier is 3 — both directions, because a guess flag on a tier-1 or tier-2 pair means one of the two is wrong. Resolved against the gate's own tree and never against `--root`, which is where the GEOMETRY comes from |
| **CG7** | **the inert record, both directions.** Every axis in `COMBINATION_INERT` must still move the measure by exactly the millimetres its record states. Plus the stray check CG5 makes for cells |

### `verdict` is three-valued, and that is the clause the expansion forced

#263 shipped `productOnly: true | false`. **A pair that clears entirely fails BOTH arms of
a boolean** — it has no single-axis failure (so `false` is wrong) and no interior one (so
`true` is wrong). **Four of the twenty clear** — `buckle-x-apexsweep`, `tipend-x-fringe`,
`cup-x-length` and `lobedepth-x-curl`, every one of them a pair #265 bought, where all five
of #263's own reach the bar. #263's tables predicted it and nothing could express it until
the field had a third value. So:

| verdict | what it requires |
|---|---|
| `product-only` | every single-axis cell clears AND some interior cell fails — the combination gate's own case, and the reason this is not a second copy of V5 |
| `single-reaches` | some single-axis cell fails: one control reaches the hazard alone, so the matrix can see it and V5 usually already declares it. **It says nothing about the interior, on purpose** — a control that reaches the bar alone may also compose, and `petalCup × petalRoll` does: two singles and nine interior cells |
| `clears` | NO cell anywhere comes within the bar |

The three **partition** the possibilities — no cell fails · no single fails but some interior
does · some single fails — so exactly one is satisfiable on any grid and no declaration is
unfalsifiable. That is what makes keeping a clearing pair worth its builds: `clears` is a
claim that fails loudly the day a pair nobody was watching stops clearing.

### What it is blind to, said here and in the tool's own header

* **`self` is NOT the self-intersection census and does not replace it.** It reads
  TOP-skin vertices against BOTTOM-skin triangles on the captured mid-surface, blade rows
  only — so a fold bringing two TOP faces together is outside it, and so are the rim, the
  foot and the seam. **`petalCup max (1.2)` is a declared census xfail (752 pairs /
  0.1268 mm) while its `self` reads 1.031 and clears.** Those two numbers do not
  contradict each other and a clearing cell here is never a claim that the petal does not
  fold. X1/X2 own the census; this owns the approach.
* **Its floor scales with the sheet.** The ±2-cell neighbourhood exclusion makes a flat
  build read ~1.25 mm at the shipping 1.20 mm sheet, and higher at 2.40. See the
  rejections.
* **It reads ONE petal** — petal-to-petal clearance is the crowding raster's and
  `bloom-neighbour-gap.mjs`'s.
* **It is a mesh measurement**, the shipped 56 × 10 grid, EXPORT mode. Every figure below
  carries that (the durable mode-and-sampling rule).
* **The bar is a declared guess** — §18b. That is not a reason to weaken it.

---

## 2. TIER 1 — evidenced. **SHIPPED (#263).**

A defect measured and cited on this pair. Sorted by cost.

| pair | measure | grid | cells | **cost** | worst cell | verdict | citation |
|---|---|---|---|---|---|---|---|
| `leafAngle × stemDiameter` | leaf-stem | 4 × 3 | 12 | **1.6 s** | **0.000 mm** at 85° | **single-reaches** | `docs/bloom-leaves-outcome.md` |
| `petalCup × petalTipShape` | self | 4 × 3 | 12 | **2.6 s** | **0.832 mm** at 1.2 × 3.00 | product-only | session 32 §18a |
| `petalSpineCurl × buckleAmp` | self | 4 × 3 | 12 | **3.0 s** | **0.912 mm** at 360 × 0.4 | product-only | `SELF_XFAIL['buckle-on-form']`'s note |
| `petalCup × buckleAmp` | self | 4 × 3 | 12 | **3.1 s** | **0.963 mm** at 1.2 × 0.4 | product-only | `SELF_XFAIL['buckle-on-form']`'s note |
| `petalCup × petalSpineCurl` | self | 4 × 4 | 16 | **3.7 s** | **0.012 mm** at 1.2 × 360 | product-only | the wall instrument's own control cell — see below |
| | | | **64** | **14.0 s summed** | | | |

*(the cost column is each pair run alone through `--only`, two runs each, #263's box)*

**These five declare 20 cells** — 6 · 5 · 1 · 2 · 6 in table order — so with tier 2's 46 and
tier 3's 12 the gate's total is **78 across sixteen of the twenty pairs**, and that sum is
checkable against a run rather than against this sentence: the gate prints both totals.

Two of the five carry something worth naming.

**`petalCup × petalSpineCurl` is the finding of #263.** `tools/bloom-wall-thickness.mjs`
has BUILT the cell `petalCup 1.2 × petalSpineCurl 180` on every run since session 34 — it is
`buckle-on-form`'s own buckle-free control — read its WALL, and thrown its SELF away. It
reads **0.945 mm**. The number has been one line away from a shipped gate for five
sessions and nothing looked at it. The grid's worst cell, `cup 1.2 × curl 360`, reads
**0.012 mm**: a sheet twelve microns from touching itself, on two shipped sliders, with
both singles clear at 1.031 and 1.245.

**`leafAngle × stemDiameter` is declared `single-reaches`, and that is #263's own
measurement rather than an admission.** Swept over six candidate partners —
`stemDiameter`, `leafLength`, `leafWidth`, `stemLength`, `leafNodes`, and `leafLength ×
stemDiameter` — the second control moves the approach **by at most 0.002 mm**. The hazard
is `leafAngle`'s alone. So **item 20 is a MEASUREMENT gap, not a combination gap**:
`LEAVES: the STEEP angle (85 deg …)` is already a matrix row, built and exported on every
full gate run, and what was missing is that nothing in the repository measured
blade-to-stem approach at all. It rides here because this is that instrument, and CG4's
`single-reaches` arm is where the finding is *asserted* rather than merely written down.

### What TIER 1 declares

**20 cells** in `COMBINATION_XFAIL` — 5 / 6 / 2 / 1 / 6 across the five pairs — each with
its magnitude as a number the gate reads, band ±5e-4 mm (the wall instrument's own — the
record's own rounding at three decimals, never a printability argument). The module REFUSES
TO LOAD on an entry with no number. Re-measurable by
`node tools/bloom-xfail-magnitudes.mjs --combination --only '^$'`, which reads the gate's OWN
clauses rather than restating them. (**The `--only '^$'` is not decoration**: `--combination`
ADDS a section rather than scoping the run, so without it the tool sweeps all 261
self-intersection rows first. #263's doc said "in seconds" and that was the section's cost,
not the invocation's.)

**FOUR of the twenty were published before #263** — §18a's two cells under the bar
(cup 1.2 × n 2.50 and 3.00) and the leaves doc's two on the 6 mm stem (`leafAngle` 70 and
85). **The other SIXTEEN were measured there for the first time.** The three worth naming:

* **The §18a hazard is not confined to `petalCup` 1.2.** It reaches down to **cup 0.6 at tip
  shape 3.00 (0.929 mm)**, and cup 0.9 fails at both 2.50 (0.988) and 3.00 (0.854). §18a
  measured the cup-1.2 row only.
* **Six cells of `cup × curl`**, from 0.945 mm down to **0.012**.
* **`cup 1.2 × buckleAmp 0.2` at 0.990 mm** — ten microns under the bar, which is the kind
  of cell a pair count cannot express and a distance can.

---

## 3. TIER 2 — shared mechanism. **SHIPPED (#265).**

Both controls write the same thing in the source. Argued from `bloom-geometry.js`, not
from plausibility. Every cost below is **measured** by running the candidate through the
gate's own `run()`, not estimated. Sorted by cost.

`sectAt`'s return in `bloom-geometry.js` is the shared mechanism for most of this tier:

```
const aN = (k === 0 ? 0 : (1 - Math.cos(k * a)) / k)              // ROLL
  + (kS === null ? cupLift(v) : cupLift(v) * kS)                  // CUP     (x APEX SWEEP)
  + (bw === null ? 0 : (kS === null ? bw(v) : bw(v) * kS));       // BUCKLE  (x APEX SWEEP)
```

Roll, cup and the buckle are three **additive summands of one normal displacement**, and
the apex sweep's `kS` **multiplies two of them**. (Cited by file and function rather than by
line number — #263 cited `:6071–6073` and a line number in a citation goes stale silently.)

| pair | cells | **cost** | worst | verdict | declared | the mechanism |
|---|---|---|---|---|---|---|
| `buckleAmp × petalTipShape` | 9 | **1.9 s** | 0.914 | product-only | 2 | the wave and the apex taper both act where the blade has least width |
| `buckleAmp × petalApexSweep` | 9 | **2.0 s** | 1.194 | **clears** | 0 | `kS` multiplies `bw` in `sectAt` |
| `petalRoll × petalRollTaper` | 12 | **2.4 s** | 0.659 | single-reaches | 6 | one term, two controls |
| `petalCup × petalApexSweep` | 12 | **2.4 s** | 0.818 | product-only | 3 | `kS` multiplies `cupLift` in `sectAt` |
| `petalCupGradient × petalTipShape` | 12 | **2.5 s** | 0.828 | product-only | 5 | §18a's argument with the gradient in the cup's place |
| `petalCupGradient × petalSpineCurl` | 16 | **3.7 s** | 0.477 | product-only | 4 | `cAt(u, r)` is the cup's own coefficient and the gradient lives inside it |
| `petalCup × petalRoll` | 16 | **3.7 s** | 0.010 | single-reaches | 11 | two summands of `aN` |
| `petalSpineCurl × petalTwist` | 16 | **3.7 s** | **0.012** | product-only | 7 | curl builds the centreline and base frame; twist rotates THAT frame about the curled length direction (the charter's own ordering argument) |
| `petalCup × petalCupGradient` | 16 | **3.8 s** | 0.754 | product-only | 8 | one term, two controls |
| | **118** | **25.9 s** | | | **46** | |

*(the cost column is #263's box, measuring the candidates through `run()`; the `declared`
column is what the shipped gate writes into `COMBINATION_XFAIL`)*

**Every `worst` and every declared-cell count in that table is what the shipped gate
measures**, cell for cell. That is the reproduction check that matters: #263 produced those
figures from candidate grids it did not commit, and #265 rebuilt the grids from the ladders
above and got the same numbers, which is what says the grids are the ones Eva ruled on.

**The strongest pair in this tier is `petalSpineCurl × petalTwist`** — 0.012 mm, seven
failing interior cells, and **both singles clear** (twist 180 reads 1.163, curl 360 reads
1.245). It is Tier 2 only because no doc cites it; the mechanism argument is as strong as
any in Tier 1, and it reaches the same twelve microns Tier 1's worst cell does.

### Four things this tier measured that were not in #263's table

* **THE MEASURE DEPENDS ON THE SUM OF THE CUP AND ITS GRADIENT.** Read `cup-x-gradient`'s
  eight declared cells as `cup + gradient`: **1.5 reads 0.938 twice, 1.8 reads 0.862 three
  times, 2.1 reads 0.801 twice, 2.4 reads 0.754.** Every cell on an anti-diagonal is the
  same number to the third decimal. That is `cAt(u, r)` composing the two into one
  coefficient, showing up as a measured symmetry rather than as a reading of the source.
* **THE GRADIENT REPRODUCES §18a ALMOST EXACTLY.** `gradient-x-tipshape` against
  `cup-x-tipshape` at the same numbers: 0.928/0.929, 0.985/0.988, 0.850/0.854, 0.974/0.977,
  0.828/0.832 — five cells, all within **0.004 mm**, and the SAME five cells fail. The cup
  and its along-blade ramp are interchangeable for this hazard at these amplitudes, which is
  a statement about the hazard rather than about either control.
* **`roll-max`'s 0.659 mm IS DECLARED THREE TIMES IN THIS FILE AND ONCE IN THE WALL
  INSTRUMENT, and all four agree.** `petalRoll` 330 with no other control engaged is
  `SELF_XFAIL['roll-max']`, and it is a single-axis cell of both `roll-x-rolltaper` and
  `cup-x-roll`. Four records of one state, by two instruments, to the third decimal — which
  is the strongest cross-check either list has.
* **TWO PAIRS ARE NOT MONOTONE IN THEIR SECOND CONTROL, and a pair count could not say so.**
  `buckle-x-tipshape` reads **0.914 at amplitude 0.2 and 0.925 at 0.4** — the amplitude CLAMP
  binding, so the deeper ruffle is a different wave rather than a bigger one. `curl-x-twist`
  reads **0.012 at 120° of twist and 0.025 at 180°**. Both are the kind of thing a distance
  reports and a count cannot.

**Two of the nine are declared `single-reaches`** (`cup × roll`, `roll × rollTaper`):
`petalRoll` 330 alone already fails at 0.659 mm and is already declared as `roll-max` in the
wall instrument's `SELF_XFAIL`, so those grids mostly re-declare a hazard V5 already gates.
What they add is the interior: **`cup × roll` takes 0.659 mm down to 0.010** across eleven
failing cells, the widest failing region in the gate. **One clears entirely**
(`buckle × apexSweep`) and costs 2.0 s a run to prove it — listed because the mechanism
argument is real and a *measured* clear is worth knowing, and now asserted by CG4's `clears`
arm rather than merely written down.

---

## 4. TIER 3 — speculative. **SHIPPED (#265).**

**These were guesses, said plainly**, and they still say so: every tier-3 pair carries
`guess: true` and CG6 fails the gate if one stops. No citation, no shared term — only "it
seems like it might interact". Costs measured the same way.

| pair | cells | **cost** | worst | verdict | declared |
|---|---|---|---|---|---|
| `leafAngle × leafToothDepth` | 12 | **1.6 s** | 0.000 | single-reaches | 6 |
| `petalTipEnd × fringeCount` | 16 | **2.1 s** | 1.200 | **clears** | 0 |
| `petalCup × petalWidth` | 12 | **2.3 s** | 0.932 | product-only | 2 |
| `petalCup × tipThinning` | 12 | **2.3 s** | 0.924 | product-only | 4 |
| `petalCup × petalLength` | 12 | **2.3 s** | 1.012 | **clears** | 0 |
| `lobeDepth × petalSpineCurl` | 16 | **8.5 s** | 1.226 | **clears** | 0 |
| | **80** | **19.1 s** | | | **12** |

*(cost: #263's box, as above)*

**Three of the six clear**, which is the honest yield of a tier of guesses and is exactly
what CG4's `clears` arm is for. `petalCup × petalLength` clears by **twelve microns** —
1.012 mm at cup 1.2 on a 20 mm blade — which is the best argument in the doc for keeping a
clearing pair in the gate rather than dropping it.

**`lobeDepth × petalSpineCurl` is the one to look at before buying a tier like this again**:
8.5 s for a grid that clears — **four times the cost of any other candidate measured** —
because a lobed build is expensive. Guesses are not all the same price.

### `leafToothDepth` is bit-identically inert, and that is what CG7 exists for

**`leafAngle × leafToothDepth` is the one pair in the ruling that this gate's own CG1
refuses**, and #263 could not have known: the tier tables were produced by the gate's
`run()`, which MEASURES, and never by `verify()`, which runs the clauses. So CG1 and CG4
were never evaluated on any tier-2 or tier-3 candidate.

Measured on this tree, full precision, all four angles, through the gate's own
`measureLeafStemApproachMm`:

| leafAngle | tooth 0.26 | tooth 0.6 | tooth 1 | max abs delta |
|---|---|---|---|---|
| 35 | 4.0191867045865646 | 4.0191867045865646 | 4.0191867045865646 | **0.000e+0** |
| 50 | 2.8035739753118678 | 2.8035739753118678 | 2.8035739753118678 | **0.000e+0** |
| 70 | 0.82373909718786775 | 0.82373909718786775 | 0.82373909718786775 | **0.000e+0** |
| 85 | 0.0000000000000000 | 0.0000000000000000 | 0.0000000000000000 | **0.000e+0** |

Not "under the band" — **bit-identical**. The reason is geometric and is worth stating,
because it is the same reason a future leaf/stem pair will fail the same way: **the teeth
are cut into the leaf's MARGIN and the nearest blade point to the stem is at the blade's
BASE.** The control is wired and reaching the leaf — its emitted vertex stream differs at
every tooth depth (checksum −249516.867 at 0.26 against −245875.089 at 1) — it just does not
reach this measure.

**So the whole content of this pair is the inertness record plus four `leafAngle` readings
`leafangle-x-stem` already gates**, and six of its twelve cells are declared duplicates of
states Tier 1 declares. It ships because Eva ruled tier 3 in full and because a measured
inertness re-read on every run is worth more than the same sentence in a doc — but the
honest form of the exemption is `COMBINATION_INERT`'s number **failing in both directions**,
not a quiet carve-out. CG7 holds it: the day `leafToothDepth` starts reaching this measure,
the gate says *"that control now REACHES this measure, so `leafangle-x-tooth` has become a
real product pair: take the entry off, let CG1 have it back, and declare whatever cells
fail."*

**Whether that trade is worth twelve builds a run is Eva's, and it is the one place the
ruling could not be executed as written.** The alternative is one line: move the pair into
§5 below, where its measurement already belongs by §5's own rule, and drop the twelve
builds. Nothing else in the fifteen is affected either way.

### `tipThinning` SATURATES, and that is not the same thing as inert

Worth keeping the two apart, because they look identical in a table. `cup-x-thinning` reads
the SAME number at thinning 0.4 and 0.8 at every cup — because in EXPORT mode 0.4 has
already taken the tip to the 1.00 mm print floor and there is nothing left for 0.8 to take.
But the axis moves the measure by **0.191 mm** from its own default column, so it reaches
this measure and CG1 is satisfied. `COMBINATION_INERT` is for a control that never reaches
it at all; a saturating control is an ordinary one whose top end is covered by the cell
below it (the same argument that stops `buckleAmp` at 0.4).

---

## 5. REJECTED, and why — the rejections are as much the finding as the list

A control pair that cannot physically reach each other costs gate time to prove nothing.
Each of these was measured, not reasoned about.

| rejected | why |
|---|---|
| **`petalTilt` × anything, for `self`** | tilt rotates the blade RIGIDLY about its foot, so every within-blade distance is invariant. Measured: 0.000 mm delta across the whole cup grid at tilt 25 / 75 / 120. The bell doc's cup-fold-at-tilt-75 table is the CENSUS's, and that doc itself says the cup fold is *"independent of the tilt"*. |
| **any arrangement control** (`petalCount`, `spread`, `layerCount`, `layerSize`, `placement`) **× a petal-form control** | `self` reads ONE petal's own captured grid, so petal-to-petal crowding is invisible to it by construction. That is the crowding raster's question and `bloom-neighbour-gap.mjs`'s, not this one. |
| **`sheetThickness` × anything, for `self`** | **the measure's own floor scales with the sheet.** Measured: `petalCup × sheetThickness` has its worst cell at the DEFAULT 1.20 mm — a thicker sheet reads BETTER while the geometry gets worse, because the ±2-cell exclusion distance grows with the offset. A pair here would be measuring the instrument. |
| **a stamen / style / anther control × a petal control** | different parts. Measured bit-identical: `stamenCount` 0 / 60 / 120 moves `self` by exactly zero on the cup column. (This is precisely why it is the CG1 plant in the must-fail.) |
| **`leafAngle` × a second leaf or stem control beyond `stemDiameter`** | measured over five partners; none moves the approach by more than 0.002 mm. The one pair that ships does so because it is the only instrument for that quantity, and it says `single-reaches`. **`leafToothDepth` belongs in this row by that rule and is shipped in tier 3 instead, by ruling** — it moves the approach by exactly **0.000e+0**, bit-identically, at every angle. See §4. |
| **`buckleAmp` 0.6 as a fourth column** | the amplitude CLAMP makes 0.6 float-identical to 0.4 at the default frequency 3 — measured on every cup and every curl of both grids. The top of the slider is covered by the cell below it; a fourth column would spend two builds re-measuring one state. |
| **a sepal pair** (`sepalCup × sepalSpineCurl` and the rest) | a sepal is the petal builder on a second ring, so the hazards are the petal's own — but `measureWall` here reads `m.petal.grid`. Gating the sepals wants a THIRD measure (`m.sepals`), which is its own piece of work and is not this PR's. Recorded, not built. |

---

## 6. Hosting — costed both ways, and the recommendation

**It rides in `bloom-export-watertight.yml`, before the browser install, beside the wall
instrument.** Two steps: the gate, then its must-fail.

| | its own workflow | a step in `bloom-export-watertight` (**chosen**) |
|---|---|---|
| runner time | ~1.5 min job (checkout + setup-node + the two steps) | **the two steps** on a job that already runs 138–250 min |
| time to a GREEN signal | ~1 min | only when the whole job finishes — 138–250 min |
| time to a RED signal | ~1 min | **under three minutes** — the step is third in the job and a failing step fails the job at once |
| what a red costs | nothing else | the matrix never runs, which is the point: hours of Chromium on a tree that already fails a print-safety check |
| workflows a bloom PR runs | **six** | **five, unchanged** |
| needs npm / playwright | no | no — it runs BEFORE the install |

**The recommendation is the step, and the deciding argument is that a separate workflow
buys a faster GREEN and costs a slower RED.** A failing step here fails the job in minutes,
before four minutes of Chromium and hours of matrix; a separate workflow would go red in
parallel with a matrix run that nothing would then stop. The precedent is explicit and
already in that file three times over — the wall instrument, the arc-stability witness and
ST9's witness all ride there, for the same three reasons stated in its own comments: the
same question (print safety), Node-only, seconds.

**It goes AFTER the wall instrument** because it IMPORTS `measureWall` from it: a red there
is a red about the *measure*, and reading that first is what keeps this gate's red about
the geometry. **It goes BEFORE the npm install** because it imports the geometry, the
registry and the wall instrument and nothing else — `tools/bloom-harness.mjs` imports
`playwright-core` at module load, which is what pins ST9's witness *after* the install, and
this gate does not touch the harness.

---

## 7. Runtime, measured

**THE RATIO #263 ESTABLISHED DOES NOT TRANSFER, AND THE REASON IS THE RULE RATHER THAN A
SURPRISE.** #263 measured the CI runner at **1.3× its session box**. That ratio is
runner ÷ *that* box, and this session ran on a different machine: the SAME tier-1 code
#263's box ran in 13.1–14.3 s takes **20.0–20.3 s here**. The charter's rule — *take both
sides of a ratio in the same state, and say which box they came from* — is exactly what
stops 1.3× being carried forward into a wrong number. So it was re-derived, against the one
code state both machines have measured.

### This box (Node 22), the whole fifteen-pair set

| | run 1 | run 2 | median |
|---|---|---|---|
| the gate (262 cells, 20 pairs) | 88.10 s | 87.83 s | **87.97 s** |
| `--control` (nineteen legs) | 95.94 s | 94.75 s | **95.34 s** |
| TIER 1 alone, the 64 cells #263 shipped | 20.06 s | 20.22 s | **20.14 s** |

*(idle box, two passes each, `--only` scoping the tier-1 row to #263's five pairs. The
spread across passes is 0.27 s on the gate and 1.19 s on the control, so these are
measurements rather than single draws.)*

**TWO RATIOS COME OUT OF THAT TABLE AND ONLY ONE OF THEM IS ABOUT SIZE.**

**The gate is 4.37x its own tier-1 subset** (87.97 / 20.14) against **4.09x the cells**
(262 / 64) — very nearly linear in cells, with the small excess being the fixed per-run
module load.

**The control is 1.08 BASELINES on this tree and was 2.9 on #263's** (95.34 / 87.97 here;
53 / 18 on the runner there). **That is a change of STRUCTURE, not of magnitude**, and it
is the independent corroboration of §8's claim about the two grid-changing legs: seventeen
of nineteen legs reuse the baseline's measurements, and the two that cannot are `--only`-
scoped to the single pair they plant into, so the whole must-fail costs one baseline plus
about seven seconds. #263's own §10 projected "about three baselines" for all three tiers
on the unscoped design, and that projection is what the scoping retired.

**`--control` DOES NOT HONOUR `--only`** — it calls `control({})` unscoped — so a
"tier-1 control" is not measurable through the shipped CLI, and on inspection it is not
even well defined: the nineteen legs plant into pairs across all three tiers. The control
row above is therefore the whole must-fail on both trees, and the ratio that carries
forward is the BASELINE MULTIPLE rather than a cell count.

### The runner

The definitive figure is **this PR's own `bloom-export-watertight` step timings**, read from
the run that gated the merge, and it is in §11. Until it existed, the projection was built
from ratios whose two halves come from the SAME machine, applied to the runner's own
measured tier-1 figures — never from this box's absolute seconds, which is the error the
withdrawn 1.3x embodies:

| | runner, TIER 1 (#263, measured) | expanded, PROJECTED | basis |
|---|---|---|---|
| the gate | 18 s | **~79 s** | x4.37, this box's own full/tier-1 ratio |
| `--control` | 53 s | **~85 s** | x1.08 baselines, this box's own control/gate ratio |
| both steps | 71 s | **~164 s** | |

So the expansion is projected to add **~93 s** to a job whose matrix step runs for hours —
**about 1.1% of a ~250-minute run, against 0.5% before**. That is the arithmetic behind
Eva's ruling that runtime is not the cost, carried out on the shipped set rather than on
the candidates.

**THE PROJECTION IS NOT THE CLAIM AND IS SUPERSEDED BY §11'S MEASUREMENT.** It is recorded
because a projection that is never checked against the thing it predicts is how a constant
becomes folklore here.

**Read the job's total from `actions_list` at the time rather than from any figure in this
repository — every constant written down for it has been superseded, so the method is the
rule and the number is not.** The ten most recent COMPLETED SUCCESSFUL
`bloom-export-watertight` runs, `run_started_at` → `updated_at`, read on Sep 19 by #263:
**138.1 / 142.9 / 173.1 / 211.7 / 222.9 / 239.2 / 246.7 / 246.9 / 247.1 / 250.1 min**, and
#263's own run added an eleventh at 249.9.

**All 262 cells are bit-identical between Node 20 (CI's) and Node 22**, `Object.is` over
every cell of all twenty pairs, worst |delta| **exactly 0** — and the gate itself runs
green under both. #263 measured that over TIER 1's 64 and #265 extends it to the whole
grid, which was owed rather than optional: `bladeStations`' gap-bound blend BINDS on several
of these cells (0.656 on `cup 1.2 × tipShape 3`, 0.920 on the buckled ones), and a bisection
on a transcendental cumulative measure is exactly where session 38 §B10.7 found two engines
disagreeing. They do not disagree here, so the ±5e-4 mm band is not absorbing engine noise
on one cell of the 262, and a CG3 red in CI cannot be an engine artefact.

---

## 8. The must-fail

`node tools/bloom-combination-gate.mjs --control` — **nineteen legs, every one of the eight
clauses, and #262's standard throughout**: each leg PLANTS its condition into a copy of the
real `PAIRS` / `COMBINATION_XFAIL` / `COMBINATION_INERT` (the same objects an ordinary run
reads, so no clause is restated in the control), runs the SHIPPED `verify`, and requires the
clause that names it to be among the findings.

| leg | plants | must fire |
|---|---|---|
| 1 | an axis no longer starts at its control's default | CG0 |
| 2 | an axis swapped for `stamenCount`, provably inert for this measure | CG1 |
| 3 | **the declared inertness is removed** | CG1 |
| 4 | a failing cell's declaration removed | CG2 |
| 5 | a CLEARING cell declared as failing | CG2 |
| 6–7 | a record stale by 0.1 mm, **each way** | CG3 |
| 8 | a `product-only` pair declared `clears` | CG4 |
| 9 | a `product-only` pair declared `single-reaches` | CG4 |
| 10 | a `single-reaches` pair declared `product-only` | CG4 |
| 11 | a `clears` pair declared `product-only` | CG4 |
| 12 | a verdict that is not one of the three | CG4 |
| 13 | a declaration naming a cell no grid produces | CG5 |
| 14 | a pair declaring no tier | CG6 |
| 15 | a tier-3 pair that stops declaring itself a guess | CG6 |
| 16 | a pair citing a file that does not exist | CG6 |
| 17 | **an axis that MOVES the measure declared inert** | CG7 |
| 18 | **the inert record overstating the movement** | CG7 |
| 19 | an inert declaration naming no pair's axis | CG7 |

**Legs 8–11 cover all four arms of CG4's switch**, which is what a three-valued biconditional
costs and is the reason the count went from nine legs to nineteen. **Leg 3 is the one that
makes the CG1 carve-out honest**: remove the `COMBINATION_INERT` entry and CG1 takes the axis
straight back, which is what says the exemption is a declaration and not a hole.

**It refuses a vacuous plant** (exit 2) if the tree has no declared cell, no clearing cell,
no pair on **each of the three verdict arms**, or no declared inert axis — a control with
nothing to plant cannot have been wrong. **It prints the red through the gate's own output
path**: the last plant is re-run NOT quiet, so the whole table and the ordinary `FAIL` block
are written verbatim and the control's red cannot drift from a genuine one.

**THE TWO GRID-CHANGING LEGS ARE SCOPED WITH `--only` TO THE PAIR THEY PLANT INTO.** They
cannot reuse the baseline's measurements, and rebuilding all 262 cells for each would cost
minutes to re-measure states already measured; scoped, they rebuild the twelve or sixteen
cells the plant actually describes. **That is why the control costs roughly one baseline
rather than #263's projected three** — its own §10 estimated "about five minutes" for all
three tiers' control on that reasoning, and the measured figure is in §11.

**#263's control found a defect in its own gate on the first sweep,** and the finding stands:
CG1 was written as "some cell differs from the (default, default) cell", and leg 2 reported
**MISSED** — with the second axis collapsed, the FIRST axis still moved plenty, so the clause
stayed green on a pair that was a single-axis sweep. CG1 is **per axis** now. Re-reading the
fixed clause found the second half: per-axis with `Object.is` is satisfied by ONE ULP, and a
real control does exactly that (`lobeDepth` moves the cup column by 2e-16 mm), so the bar is
`COMBINATION_TOLERANCE_MM`.

Seven of #263's nine legs changed no geometry and reused the baseline's measurements; the
same holds for seventeen of nineteen here — and `verify` **REFUSES** cached rows whose pair
ids or axis values disagree with the pairs handed in, so a cached clause evaluation can never
measure a different grid from the one the plant describes.

---

## 9. The byte partition

**This adds a check. It does not change a shape.** `bloom-geometry.js`,
`bloom-registry.js`, `bloom.js`, `bloom.html` and `bloom.css` are **untouched** —
predeclared before a line was written and **sha256-identical** to a worktree of the base
commit at close — so the exported stream is identical by CONSTRUCTION rather than by an
argument about arithmetic.

**Measured as well, because by-construction is an argument and this project prefers a
number.** `node tools/verify-bloom-surface-bytes.mjs --base <worktree of c29a8b5>`, the whole
860-row live matrix in both modes, positionally under `Object.is`:

| | |
|---|---|
| export stream | **836,485,992 floats** over 92,942,888 triangles, 860 rows x 2 modes |
| captured grid | **77,135,222 values** over 8,907 panels (live) |
| verdict | **PASS — 0 floats moved** |
| wall clock | 63.3 min on this box (21:16:10 → 22:19:29 UTC) |

**BOTH CLAUSES ARE SHOWN ABLE TO FAIL, and that is the half worth checking** — a control
firing only clause 1 leaves clause 2 a log line, which is this repo's own recorded lesson
about single-clause controls. `--control --rows 6` perturbs one coordinate by 1e-9 and the
run exits 1 with **two** findings, one per clause:

```
FAIL — 2 finding(s):
  DEFAULT (live): 1 of 171360 floats moved, first at index 0 (tri 0):
      5.306790136879714 against 5.306790135879714
  DEFAULT (live): grid — 1 of 4430 values moved, first at 2: 1e-9 against 0
```

`--rows` scopes the control deliberately: its job is to show the clauses CAN fire, not to
re-measure a matrix the full run has already closed over.

**No frozen phase is owed**: no matrix row is added or removed, so `frozen/phase35` stays
the newest baseline and **no tag's bytes stop reproducing**.

---

## 10. What #263 left open, and what is open now

#263's §10 asked three questions and **Eva answered all three: buy Tier 2 in full, buy
Tier 3 in full, and runtime is not the cost.** Both tiers are shipped. What is open after
this:

1. **`leafAngle × leafToothDepth` is the one pair whose second axis this gate's own CG1
   refuses** — §4. It ships with the inertness declared and re-measured every run; the
   alternative is one line moving it to §5. **Eva's, and the only part of her ruling that
   could not be executed as written.**
2. **The sepal measure** (§5's last row) is still the one rejection that is a piece of work
   rather than a fact: `measureWall` reads `m.petal.grid`, so a sepal pair wants a third
   measure. Recorded, not built.
3. **What this gate does NOT do, by instruction:** it does not fix `cup × petalTipShape`,
   the leaf-against-stem approach, or the cup fold. Every one of them is a declared magnitude
   with a number beside it; whether each is accepted as a look or fixed is Eva's ruling, and
   the numbers exist so it can be made. **78 cells across sixteen pairs** are under the bar;
   the gate marks each one `x` in its own table and prints both totals in its summary, counted
   from the cells THAT RUN measured rather than from the length of the list — so a `--only`
   subset reports its own subset and a doc quoting the figure can be checked against a run.

---

## 11. The close (#265)

*Every figure here is this session's own box unless it says the runner.*

**WHAT SHIPPED.** All fifteen pairs #263 proposed, taking the gate from 5 pairs to 20:
**5 tier-1 · 9 tier-2 · 6 tier-3, 262 cells, 78 declared cells across sixteen pairs**, and
three clauses the expansion forced (CG4 three-valued, CG6 provenance, CG7 the inert record).

**THE GRIDS ARE THE ONES EVA RULED ON.** #263 costed its candidates through `run()` and
committed none of them, so the ladders were reconstructed and then checked against a table a
different session wrote on a different box: every `worst` figure and every failing-cell count
in both tier tables reproduces exactly — 0.914/2, 1.194/clears, 0.659, 0.818/3, 0.828/5,
0.477/4, 0.010, 0.012/7, 0.754/8, 0.000, 1.200, 0.932/2, 0.924/4, 1.012, 1.226.

**THE MEASUREMENTS.**

| | |
|---|---|
| the gate | **87.97 s** median (88.10 / 87.83), CG0-CG7 clean |
| `--control` | **95.34 s** median (95.94 / 94.75), **19 of 19 legs fired**, exit 0 |
| `bloom-xfail-magnitudes --combination --only '^$'` | **78 ok, 0 stale** |
| Node 20 (CI's) vs Node 22 | **262 of 262 cells `Object.is`-equal**, worst \|delta\| exactly 0 |
| byte partition | **PASS — 0 floats moved** over 836,485,992 export floats / 92,942,888 triangles and 77,135,222 captured-grid values, 860 rows x 2 modes |
| frozen phase | **none owed**; no row added or removed, `frozen/phase35` stays the newest baseline, no tag's bytes stop reproducing |

**THE RUNNER'S OWN FIGURE REPLACES §7's PROJECTION ONCE THE GATE HAS RUN**, read from this
PR's `bloom-export-watertight` step timings. The projection was ~79 s for the gate and ~85 s
for the control.

**AND A COUNT THAT LIVED ONLY IN PROSE HAD ALREADY DRIFTED BEFORE ANYONE READ IT.** This
session wrote "78 declared cells across ELEVEN pairs" into four documents; the shipped list
declares across **sixteen**. No clause was wrong — CG2, CG3 and CG5 each hold every
individual declaration in both directions, and none of them has an opinion about how many
pairs carry one. **Counting the shipped list is what found it**, and two further
restatements fell to the same method: "262 cells over all FIFTEEN pairs" (it is twenty — the
sentence contradicted itself) and a per-pair tier-1 breakdown written in the wrong row order.
The remedy is this project's own rule from `/plot`: **a number nobody prints is a number
nobody watches.** The gate prints `N cell(s) under the bar, M of them declared, across K
pair(s)` on every run, counted from the cells THAT RUN measured rather than from the length
of the list, so a `--only` subset reports its own subset and a doc quoting the figure can be
checked against a run.
