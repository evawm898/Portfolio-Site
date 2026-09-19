# The combination gate — two controls at once

*Sep 19, 2026. `tools/bloom-combination-gate.mjs`, shipped with TIER 1 only. Tiers 2 and 3
are proposed, measured and costed below and are NOT built — they wait on Eva's ruling and
become a cheap expansion PR once the machinery exists.*

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

### The five clauses

| | what it asserts |
|---|---|
| **CG0** | every declared value is inside its control's registry range, and each axis starts at that control's own default |
| **CG1** | **per axis**, the control must move the measure by more than `COMBINATION_TOLERANCE_MM` somewhere on the grid. A pair whose second control cannot reach the measure is a single-axis sweep wearing a product's clothes, and it satisfies every other clause here perfectly. **The bar is the BAND and is derived rather than typed** — an `Object.is` test is satisfied by one ulp, and that is not hypothetical: `lobeDepth` moves the cup column by **2e-16 mm**, inert for every purpose and not bit-identical |
| **CG2** | no cell may come within `MIN_FEATURE_MM` except those declared in `COMBINATION_XFAIL` — **both directions**: a declared cell that starts CLEARING is the fix landing and fails hard |
| **CG3** | a declared cell must still read its recorded millimetres within `COMBINATION_TOLERANCE_MM`, **both directions** (#213) |
| **CG4** | **a biconditional on `productOnly`.** TRUE requires every single-axis cell to clear AND some interior cell to fail — that is what makes this a *combination* gate rather than a second copy of V5. FALSE requires a single-axis cell to fail |
| **CG5** | every key in `COMBINATION_XFAIL` names a cell some grid produces |

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

## 2. TIER 1 — evidenced. **SHIPPED.**

A defect measured and cited on this pair. Sorted by cost.

| pair | measure | grid | cells | **cost** | worst cell | `productOnly` | citation |
|---|---|---|---|---|---|---|---|
| `leafAngle × stemDiameter` | leaf-stem | 4 × 3 | 12 | **1.6 s** | **0.000 mm** at 85° | **FALSE** | `docs/bloom-leaves-outcome.md` |
| `petalCup × petalTipShape` | self | 4 × 3 | 12 | **2.6 s** | **0.832 mm** at 1.2 × 3.00 | TRUE | session 32 §18a |
| `petalSpineCurl × buckleAmp` | self | 4 × 3 | 12 | **3.0 s** | **0.912 mm** at 360 × 0.4 | TRUE | `SELF_XFAIL['buckle-on-form']`'s note |
| `petalCup × buckleAmp` | self | 4 × 3 | 12 | **3.1 s** | **0.963 mm** at 1.2 × 0.4 | TRUE | `SELF_XFAIL['buckle-on-form']`'s note |
| `petalCup × petalSpineCurl` | self | 4 × 4 | 16 | **3.7 s** | **0.012 mm** at 1.2 × 360 | TRUE | the wall instrument's own control cell — see below |
| | | | **64** | **14.0 s summed** | | | |

*(the cost column is each pair run alone through `--only`, two runs each, this box)*

**The whole gate measured end to end is 13.1 / 13.4 / 13.8 / 14.1 / 14.3 s (Node 22, five
runs) and 12.7 / 13.5 s (Node 20, two); the per-pair figures each pay their own 60 ms of
module load, so they sum a little high. This box, this session — a runtime from another
machine is an anecdote (the charter's rule), and the CI runner is not this box.**

Two of the five carry something worth naming.

**`petalCup × petalSpineCurl` is the finding of the session.** `tools/bloom-wall-thickness.mjs`
has BUILT the cell `petalCup 1.2 × petalSpineCurl 180` on every run since session 34 — it is
`buckle-on-form`'s own buckle-free control — read its WALL, and thrown its SELF away. It
reads **0.945 mm**. The number has been one line away from a shipped gate for five
sessions and nothing looked at it. The grid's worst cell, `cup 1.2 × curl 360`, reads
**0.012 mm**: a sheet twelve microns from touching itself, on two shipped sliders, with
both singles clear at 1.031 and 1.245.

**`leafAngle × stemDiameter` is declared `productOnly: FALSE`, and that is this session's
own measurement rather than an admission.** Swept over six candidate partners —
`stemDiameter`, `leafLength`, `leafWidth`, `stemLength`, `leafNodes`, and `leafLength ×
stemDiameter` — the second control moves the approach **by at most 0.002 mm**. The hazard
is `leafAngle`'s alone. So **item 20 is a MEASUREMENT gap, not a combination gap**:
`LEAVES: the STEEP angle (85 deg …)` is already a matrix row, built and exported on every
full gate run, and what was missing is that nothing in the repository measured
blade-to-stem approach at all. It rides here because this is that instrument, and CG4's
FALSE arm is where the finding is *asserted* rather than merely written down.

### What TIER 1 declares

**20 cells** in `COMBINATION_XFAIL` — 5 / 6 / 2 / 1 / 6 across the five pairs — each with
its magnitude as a number the gate reads, band ±5e-4 mm (the wall instrument's own — the
record's own rounding at three decimals, never a printability argument). The module REFUSES
TO LOAD on an entry with no number. Re-measurable in seconds by
`node tools/bloom-xfail-magnitudes.mjs --combination`, which reads the gate's OWN clauses
rather than restating them.

**FOUR of the twenty were published before this session** — §18a's two cells under the bar
(cup 1.2 × n 2.50 and 3.00) and the leaves doc's two on the 6 mm stem (`leafAngle` 70 and
85). **The other SIXTEEN are measured here for the first time.** The three worth naming:

* **The §18a hazard is not confined to `petalCup` 1.2.** It reaches down to **cup 0.6 at tip
  shape 3.00 (0.929 mm)**, and cup 0.9 fails at both 2.50 (0.988) and 3.00 (0.854). §18a
  measured the cup-1.2 row only.
* **Six cells of `cup × curl`**, from 0.945 mm down to **0.012**.
* **`cup 1.2 × buckleAmp 0.2` at 0.990 mm** — ten microns under the bar, which is the kind
  of cell a pair count cannot express and a distance can.

Full tables are printed by the gate itself on every run.

---

## 3. TIER 2 — shared mechanism. **PROPOSED, NOT BUILT.**

Both controls write the same thing in the source. Argued from `bloom-geometry.js`, not
from plausibility. Every cost below is **measured** by running the candidate through the
gate's own `run()`, not estimated. Sorted by cost.

`sectAt`'s return at `bloom-geometry.js:6071–6073` is the shared mechanism for most of
this tier:

```
const aN = (k === 0 ? 0 : (1 - Math.cos(k * a)) / k)              // ROLL
  + (kS === null ? cupLift(v) : cupLift(v) * kS)                  // CUP     (x APEX SWEEP)
  + (bw === null ? 0 : (kS === null ? bw(v) : bw(v) * kS));       // BUCKLE  (x APEX SWEEP)
```

Roll, cup and the buckle are three **additive summands of one normal displacement**, and
the apex sweep's `kS` **multiplies two of them**.

| pair | cells | **cost** | worst | verdict as measured | the mechanism |
|---|---|---|---|---|---|
| `buckleAmp × petalTipShape` | 9 | **1.9 s** | 0.914 | **PRODUCT-ONLY**, 2 cells | the wave and the apex taper both act where the blade has least width |
| `buckleAmp × petalApexSweep` | 9 | **2.0 s** | 1.194 | clears — nothing to gate | `kS` multiplies `bw` at :6073 |
| `petalRoll × petalRollTaper` | 12 | **2.4 s** | 0.659 | single already fails (`roll-max`) | one term, two controls |
| `petalCup × petalApexSweep` | 12 | **2.4 s** | 0.818 | **PRODUCT-ONLY**, 3 cells | `kS` multiplies `cupLift` at :6072 |
| `petalCupGradient × petalTipShape` | 12 | **2.5 s** | 0.828 | **PRODUCT-ONLY**, 5 cells | §18a's argument with the gradient in the cup's place |
| `petalCupGradient × petalSpineCurl` | 16 | **3.7 s** | 0.477 | **PRODUCT-ONLY**, 4 cells | `cAt(u, r)` is the cup's own coefficient and the gradient lives inside it |
| `petalCup × petalRoll` | 16 | **3.7 s** | 0.010 | single already fails (`roll-max`) | two summands of `aN` |
| `petalSpineCurl × petalTwist` | 16 | **3.7 s** | **0.012** | **PRODUCT-ONLY**, 7 cells | curl builds the centreline and base frame; twist rotates THAT frame about the curled length direction (the charter's own ordering argument) |
| `petalCup × petalCupGradient` | 16 | **3.8 s** | 0.754 | **PRODUCT-ONLY**, 8 cells | one term, two controls |
| | **118** | **25.9 s** | | | |

**The strongest candidate in this tier is `petalSpineCurl × petalTwist`** — 0.012 mm, seven
failing interior cells, and **both singles clear** (twist 180 reads 1.163, curl 360 reads
1.245). It is Tier 2 only because no doc cites it; the mechanism argument is as strong as
any in Tier 1.

**Two of the nine would be declared with `productOnly: FALSE`** (`cup × roll`, `roll ×
rollTaper`): `petalRoll` 330 alone already fails at 0.659 mm and is already declared as
`roll-max` in the wall instrument's `SELF_XFAIL`, so those grids would mostly re-declare a
hazard V5 already gates. **One clears entirely** (`buckle × apexSweep`) and would cost 2.0 s
a run to prove nothing — it is listed because the mechanism argument is real and a
*measured* clear is worth knowing.

---

## 4. TIER 3 — speculative. **PROPOSED, NOT BUILT.**

**These are guesses, said plainly.** No citation, no shared term — only "it seems like it
might interact". Costs measured the same way.

| pair | cells | **cost** | worst | verdict as measured |
|---|---|---|---|---|
| `leafAngle × leafToothDepth` | 12 | **1.6 s** | 0.000 | single already fails |
| `petalTipEnd × fringeCount` | 16 | **2.1 s** | 1.200 | clears |
| `petalCup × petalWidth` | 12 | **2.3 s** | 0.932 | **PRODUCT-ONLY**, 2 cells |
| `petalCup × tipThinning` | 12 | **2.3 s** | 0.924 | **PRODUCT-ONLY**, 4 cells |
| `petalCup × petalLength` | 12 | **2.3 s** | 1.012 | clears (and close — 1.012 mm at cup 1.2 × 20 mm) |
| `lobeDepth × petalSpineCurl` | 16 | **8.5 s** | 1.226 | clears |
| | **80** | **19.1 s** | | |

**`lobeDepth × petalSpineCurl` is the one to look at before buying this tier**: 8.5 s for a
grid that clears — **four times the cost of any other candidate measured**, because a lobed
build is expensive. Guesses are not all the same price.

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
| **`leafAngle` × a second leaf or stem control beyond `stemDiameter`** | measured over five partners; none moves the approach by more than 0.002 mm. The one pair that ships does so because it is the only instrument for that quantity, and it says `productOnly: FALSE`. |
| **`buckleAmp` 0.6 as a fourth column** | the amplitude CLAMP makes 0.6 float-identical to 0.4 at the default frequency 3 — measured on every cup and every curl of both grids. The top of the slider is covered by the cell below it; a fourth column would spend two builds re-measuring one state. |
| **a sepal pair** (`sepalCup × sepalSpineCurl` and the rest) | a sepal is the petal builder on a second ring, so the hazards are the petal's own — but `measureWall` here reads `m.petal.grid`. Gating the sepals wants a THIRD measure (`m.sepals`), which is its own piece of work and is not this PR's. Recorded, not built. |

---

## 6. Hosting — costed both ways, and the recommendation

**It rides in `bloom-export-watertight.yml`, before the browser install, beside the wall
instrument.** Two steps: the gate, then its must-fail.

| | its own workflow | a step in `bloom-export-watertight` (**chosen**) |
|---|---|---|
| runner time | ~1.5 min job (checkout + setup-node + 18 s + 53 s) | **+71 s** on a job that already runs 138–250 min |
| time to a GREEN signal | ~1 min | only when the whole job finishes — 138–250 min |
| time to a RED signal | ~1 min | **under a minute** — the step is fourth in the job and a failing step fails the job at once |
| what a red costs | nothing else | the matrix never runs, which is the point: three hours of Chromium on a tree that already fails a print-safety check |
| workflows a bloom PR runs | **six** | **five, unchanged** |
| needs npm / playwright | no | no — it runs BEFORE the install |

**The recommendation is the step, and the deciding argument is that a separate workflow
buys a faster GREEN and costs a slower RED.** A failing step here fails the job inside a
minute, before four minutes of Chromium and three hours of matrix; a separate workflow
would go red in parallel with a matrix run that nothing would then stop. The precedent is
explicit and already in that file three times over — the wall instrument, the arc-stability
witness and ST9's witness all ride there, for the same three reasons stated in its own
comments: the same question (print safety), Node-only, seconds.

**It goes AFTER the wall instrument** because it IMPORTS `measureWall` from it: a red there
is a red about the *measure*, and reading that first is what keeps this gate's red about
the geometry. **It goes BEFORE the npm install** because it imports the geometry, the
registry and the wall instrument and nothing else — `tools/bloom-harness.mjs` imports
`playwright-core` at module load, which is what pins ST9's witness *after* the install, and
this gate does not touch the harness.

---

## 7. Runtime, measured

| | Node 22 (this box) | Node 20 (this box) | **Node 20, the CI RUNNER** |
|---|---|---|---|
| the gate | 13.1 / 13.4 / 13.8 / 14.1 / 14.3 s | 12.7 / 13.5 s | **18 s** |
| `--control` (nine plants) | 40.5 / 40.7 s | 39.2 s | **53 s** |
| **added to a full PR** | ~55 s | | **71 s** |

**THE RUNNER COLUMN IS THE ONE THAT MATTERS AND IT IS THE ONE MEASURED LAST**, from
`bloom-export-watertight` run 35451329086's own step timings on the merge commit — 15:18:21 →
15:18:39 and 15:18:39 → 15:19:32. It is **1.3×** the session box, which is the same-state
discipline the charter asks for: both halves of a ratio taken in one state, and the state
named. The earlier columns are kept because a later session comparing a local run against
this table needs to know which box it is comparing with.

**Read from `actions_list` at the time rather than from any figure in this repository — every
constant written down for it has been superseded, so the method is the rule and the number is
not.** The ten most recent COMPLETED SUCCESSFUL `bloom-export-watertight` runs, `run_started_at`
→ `updated_at`, read on Sep 19: **138.1 / 142.9 / 173.1 / 211.7 / 222.9 / 239.2 / 246.7 / 246.9 /
247.1 / 250.1 min.** Against the median of those, **71 s is 0.5 % of the job**; against the
fastest, 0.9 %.

**This PR's own run added an eleventh reading at 249.9 min** (15:17:06 → 19:26:57), a
hair under the ceiling of the ten above. **Do not quote it, and do not add it to a constant
somewhere** — it is recorded only as one more observation that the spread is what the rule
says it is, and the rule is to read `actions_list` at the time.

**All 64 cells are bit-identical between Node 20 and Node 22** — measured, `Object.is` over
every cell, worst |delta| exactly 0. That matters because `bladeStations`' gap-bound blend
BINDS on several of these cells (0.656 on `cup 1.2 × tipShape 3`, 0.920 on the buckled
ones), and a bisection on a transcendental cumulative measure is exactly where session 38
§B10.7 found two engines disagreeing. They do not disagree here, so the ±5e-4 mm band is
not absorbing engine noise.

---

## 8. The must-fail

`node tools/bloom-combination-gate.mjs --control` — **nine legs, every one of the five
clauses, and #262's standard throughout**: each leg PLANTS its condition into a copy of the
real `PAIRS` / `COMBINATION_XFAIL` (the same objects an ordinary run reads, so no clause is
restated in the control), runs the SHIPPED `verify`, and requires the clause that names it
to be among the findings.

| leg | plants | must fire |
|---|---|---|
| 1 | an axis no longer starts at its control's default | CG0 |
| 2 | an axis swapped for `stamenCount`, provably inert for this measure | CG1 |
| 3 | a failing cell's declaration removed | CG2 |
| 4 | a CLEARING cell declared as failing | CG2 |
| 5–6 | a record stale by 0.1 mm, **each way** | CG3 |
| 7 | a `productOnly: TRUE` pair flipped to FALSE | CG4 |
| 8 | a `productOnly: FALSE` pair flipped to TRUE | CG4 |
| 9 | a declaration naming a cell no grid produces | CG5 |

**It refuses a vacuous plant** (exit 2) if the tree has no declared cell, no clearing cell,
or no pair on each side of `productOnly` — a control with nothing to plant cannot have been
wrong. **It prints the red through the gate's own output path**: the last plant is re-run
NOT quiet, so the whole table and the ordinary `FAIL` block are written verbatim and the
control's red cannot drift from a genuine one.

**It found a defect in its own gate on the first sweep.** CG1 was written as "some cell
differs from the (default, default) cell", and leg 2 reported **MISSED** — with the second
axis collapsed, the FIRST axis still moved plenty, so the clause stayed green on a pair
that was a single-axis sweep. CG1 is **per axis** now, and leg 2's plant is an axis that is
measurably inert (`stamenCount`, exactly 0 mm of move) rather than a duplicated value.

**Re-reading the fixed clause found the second half.** Per-axis with `Object.is` is
satisfied by ONE ULP, and a real control does exactly that: `lobeDepth` moves the cup column
by 2e-16 mm. The bar is `COMBINATION_TOLERANCE_MM` now — a control whose whole effect on the
measure is smaller than the band its records are held to is not reaching the measure — so no
second constant is invented. Headroom on the shipped pairs, per axis: **0.372 / 0.284**
(cup × tipShape), **1.233 / 1.020** (cup × curl), **0.257 / 0.077** (cup × buckle), **0.308 /
0.334** (curl × buckle) and **4.020 / 0.00216** (leafAngle × stemDiameter). The tightest is
`stemDiameter` at **4.3× the band**, which quantifies the same finding CG4's FALSE arm
asserts: that control barely reaches this measure at all.

Seven of the nine legs change no geometry, so they reuse the baseline's measurements — and
`verify` **REFUSES** cached rows whose pair ids or axis values disagree with the pairs
handed in, so a cached clause evaluation can never measure a different grid from the one
the plant describes. That is what takes the control from 2 m 25 s to 40 s.

---

## 9. The byte partition

**This adds a check. It does not change a shape.** `bloom-geometry.js`,
`bloom-registry.js`, `bloom.js`, `bloom.html` and `bloom.css` are **untouched** —
predeclared before a line was written and **sha256-identical** to a worktree of `937263a`
at close — so the exported stream is identical by CONSTRUCTION rather than by an argument
about arithmetic. The six files this PR does touch are
`tools/bloom-combination-gate.mjs` (new), `tools/bloom-xfail-magnitudes.mjs`,
`.github/workflows/bloom-export-watertight.yml`, this doc, `docs/bloom-state-of-play.md`
and `CLAUDE.md`.

Measured as well, because by-construction is an argument and this project prefers a
number:

* the live matrix is **860 rows on both trees, 0 rows differing in definition**;
* `node tools/verify-bloom-surface-bytes.mjs --base <worktree of 937263a>` over the whole
  matrix in both modes, positionally under `Object.is` — **PASS, 0 floats moved over
  836,485,992 export floats across 92,942,888 triangles, and 0 of 77,135,222 captured-grid
  values over 8,907 panels** — with its own `--control` shown firing BOTH clauses on a
  1e-9 perturbation.

**No frozen phase is owed**: no matrix row is added or removed, so `frozen/phase35` stays
the newest baseline and **no tag's bytes stop reproducing**.

---

## 10. Open for Eva

1. **Tier 2 — nine pairs, 118 cells, 25.9 s.** SIX are product-only failures nothing gates;
   `petalSpineCurl × petalTwist` alone reaches 0.012 mm with both singles clear. Buy all nine,
   buy the six product-only ones (**17.9 s**, 81 cells), or none.
2. **Tier 3 — six pairs, 80 cells, 19.1 s.** Two are product-only failures, three clear,
   and one (`lobeDepth × curl`) costs 8.5 s to clear. Guesses, at a measured price.
3. **The gate-time budget, on the CI runner's own figures.** Tier 1 is **71 s** including its
   must-fail (18 s of gate, 53 s of control — measured on the runner, not on the session box).
   All three tiers together would be **59.0 s of gate on the session box, so about 78 s on the
   runner**, and since the control pays one baseline plus two grid-changing plants, roughly
   three times that again — **about five minutes**, or **2.1 % of a median
   `bloom-export-watertight` run**. Still small, and no longer a rounding error, which is why
   it is a ruling rather than a default.

**And what this gate does NOT do, by instruction:** it does not fix `cup × petalTipShape`,
the leaf-against-stem approach, or the cup fold. Every one of them is now a declared
magnitude with a number beside it; whether each is accepted as a look or fixed is Eva's
ruling, and the numbers exist so it can be made.
