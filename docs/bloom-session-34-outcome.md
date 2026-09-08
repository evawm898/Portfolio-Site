# Session 34 — margin buckling, part 2: the three controls, the clamp, and NU 56

Read before touching `buckleAmp` / `buckleFreq` / `buckleEnv`, `buckleAmpCap`,
`bucklePhaseForSlot`, `NU`, or `tools/bloom-wall-thickness.mjs`.

**This session stops for a ruling. Nothing is merged.**

---

## What shipped

| | |
|---|---|
| `buckleAmp` | 0–0.60 × the local half-width, step 0.01, **default 0**. Always visible. |
| `buckleFreq` | 1–7 cycles, step 1, **default 3**. Hidden and inert at amplitude 0. |
| `buckleEnv` | p 2.0–6.0, step 0.1, **default 3**. Hidden and inert at amplitude 0. |
| phase | **derived**, `slotIndex × GOLDEN_ANGLE`. Not a control. |
| `NU` | **28 → 56**, fixed, not derived. |

All three ranges are `export const` in `bloom-geometry.js` and **imported** by the
registry — Q6's discipline, so a slider wider than the law was reasoned on cannot ship
quietly.

**They are in Petal form, not a section of their own**, because that is what the buckle
is: a displacement field of the mid-surface, the same family as cup and roll.
`widthProfile` is untouched. A new top-level section would say the opposite.

**Frequency and reach are gated on amplitude** — the curl family's own shape
(`curlBias`/`curlStart` on spine curl, `petalRollTaper` on roll). Both are inert at
amplitude 0 by construction, so ungated they would ship as dead sliders.

### On "the four controls"

The brief says four; **three are exposed**. The fourth in part 1's list was the phase,
and ruling 5 makes it derived, so it is not a control. Flagged rather than silently
shipping a fourth thing nobody asked for.

---

## The byte story — a three-capture attribution

Two changes land together and a single "everything moved" number cannot say which did
it. Three trees, compared pairwise, float-level with `Object.is`:

| | |
|---|---|
| **A** | `main` at `2a97e96` |
| **B** | this head with `NU` **reverted to 28** |
| **C** | this head as it ships (`NU` 56) |

**Predeclared before measuring**: A vs B is 0 of everything; B vs C is every row.

| comparison | isolates | result |
|---|---|---|
| A vs B | **the three controls** | **0 of 101,969,280 floats differ, 0 of 1124 row-modes** |
| B vs C | **the row count** | **1124 of 1124 row-modes changed, all by array LENGTH**; +10,071,040 triangles |

Both hold. The controls at their defaults move nothing — the guard is a branch, not an
arithmetic argument. Everything that moved, `NU` moved.

**A length change and a value change are two different moves and must not share one
word.** Raising `NU` makes every array longer, so "floats that differ" over that
comparison is not a quantity — the first draft of this measurement printed `0` for it,
which was true and meaningless. It is reported as a row-count move, and no
float-for-float number is quoted for it.

**A frozen phase IS owed and is here.** `phase22Matrix()` — the 562 rows at `2a97e96`,
registered in `FROZEN_BASE_COMMITS` and `FROZEN_MATRICES`, **verified deep-equal to that
commit's own `buildMatrix()`, row for row**. It cannot be byte-re-exported from any tree
at or after this session, and that is by construction rather than a defect: session 24's
rule, **a frozen tag pins row definitions, not bytes.**

**Cost**, live · export · STL: default **19,040 · 19,040 · 930 KiB** (was 10,080 · 10,080
· 492 KiB); worst reachable (40 petals × 6 whorls) **565,632 · 565,632 · 27,619 KiB** =
**37.7% of the 1,500,000 budget** — the number part 1 costed. The field itself adds **no
triangles**; all of it is the row count.

`CURL_START_MIN = 1/NU` halves, **0.0357 → 0.0179**. That is a registry-imported bound on
`curlStart`, and it moving is part of the same predeclared move — and the reason `NU` is
fixed rather than derived from the buckle frequency.

---

## Measurement 1 — the clamp is necessary and not sufficient, and the reason is not curvature

The clamp bounds the **along-margin** curvature of the field alone:
`A·h·(2πf/L)² ≤ 1/(ROLL_MIN_RADIUS_FACTOR·t)`, i.e. `A_max = L²/(h(2πf)²·R_floor)`.

**Instrument**: `measureCurvature()` in `tools/bloom-wall-thickness.mjs` — the largest
principal curvature of the **emitted** mid-surface, from a quadratic fit in a frame built
on the emitted normal. **Validated against closed form before use**: cup reads within
**4%** at gentle amplitude, degrading to 27% at maximum; roll within **4–7%** while a
stencil spans under ~50° of arc and reading curvature **high** beyond it (ratio 0.417 at
roll 240, 0.385 at roll 330). It is therefore a **lower bound on radius** where it is
biased — the conservative direction for a safety question, which is what lets its
conclusions stand.

### The composition does not fail on curvature

| state | WALL | SELF | k max | R |
|---|---|---|---|---|
| cup 1.2 + curl 180 | 0.912 | 0.971 | 1.1149 | 0.897 |
| **+ buckle A 0.20 f 3 p 3** | **0.310** | **0.299** | **1.0625** | **0.941** |
| buckle alone | 1.186 | 1.236 | 0.3074 | 3.253 |
| cup 1.2 alone + buckle | 1.052 | 0.993 | 1.0771 | 0.928 |
| curl 180 alone + buckle | 1.182 | 1.236 | 0.3097 | 3.229 |

**The composed surface is LESS curved than the base alone** (1.0625 against 1.1149) while
the wall collapses from 0.912 to 0.310. And `SELF ≈ WALL` on that row: the nearest part of
the bottom skin is as close whether or not you exclude the local neighbourhood.

**So the hazard is SELF-APPROACH, not offset inversion.** No curvature bound of any kind
can catch it, because self-approach is a *global* property of the sheet and curvature is
local. Neither ingredient alone does it — cup+buckle reads 1.052, curl+buckle 1.182; it
takes cup deepening the spoon, curl folding it round, and the buckle's wave closing the
last of the gap.

Across every base measured, the composed curvature obeyed **k_composed ≤ k_base +
k_buckle**, and exceeded `max(k_base, k_buckle)` only on roll 120 and twist 180.

### What a sufficient condition would look like

**Not a closed form.** A bound in `(A, f, p, L, t)` cannot express a distance between two
parts of a folded sheet. The sufficient condition is a **measured minimum separation
between non-adjacent parts of the emitted mid-surface** — which is exactly the `SELF`
column that already exists — floored at one sheet thickness.

That is a measurement, not a formula, which is consistent with the project's own doctrine
(*cap the OUTPUT, never an input proxy*) and inconsistent with shipping it as a clamp: a
clamp has to answer before the geometry is built. **Three options, costed, none taken
without a ruling:**

1. **Leave the clamp as it is and keep `SELF` as a flag** — the shipped state. The
   necessary condition is enforced; the sufficient one is measured and told.
2. **Make `SELF` a gate.** It would fire on `all form at maximum` too, which is a
   *pre-existing* shipped state (wall 0.004 at 56 rows), so this reddens `main` on
   geometry this session did not touch.
3. **Clamp iteratively** — build, measure `SELF`, reduce amplitude, rebuild. Costs a
   build per step and makes the control's value depend on a search.

---

## Measurement 2 — is the cap p-dependent? Yes, and it is conservative rather than unsafe

At identical amplitude and frequency, only `p` moving:

| p | clamp radius | cross-curvature (owner) | measured R | wall's own cost |
|---|---|---|---|---|
| 2 | 1.437 | 0.0750 | **3.449** | 0.014 |
| 3 | 1.437 | 0.2250 | 2.321 | 0.023 |
| 4 | 1.437 | 0.4500 | 1.792 | 0.040 |
| 5 | 1.437 | 0.7500 | 1.564 | 0.063 |
| 6 | 1.437 | 1.1250 | **1.456** | 0.090 |

**The clamp's own radius is 1.437 mm at every p** — flat, because `|v|^p` is exactly 1 at
the margin, so `p` is invisible to the along-margin bound by construction. The real
tightest radius moves **3.449 → 1.456 mm**, a factor of 2.4, and the wall cost moves by
**6.4×**. The across-width curvature at the margin is `A·p(p−1)/h` — 2, 6, 30 at p = 2, 3,
6.

**But every clamped build clears the floor at every p** — the decisive test:

| ask | built | clamp R | measured R | |
|---|---|---|---|---|
| A 0.60 f 3 p 2 | 0.3591 | 1.200 | 2.890 | clear |
| A 0.60 f 3 p 6 | 0.3591 | 1.200 | **1.227** | clear |
| A 0.60 f 5 p 6 | 0.1293 | 1.200 | 4.464 | clear |
| A 0.60 f 7 p 6 | 0.0660 | 1.200 | 8.226 | clear |

The tightest corner is f 3 p 6 at **1.227 mm against a 1.200 mm floor** — and since the
instrument reads curvature *high* where it is biased, the true radius is larger still, so
the conclusion holds under its own known bias.

**Reading: the cap does not need to be a function of `p` for safety. It is
over-conservative at low `p`** — at p 2 the geometry would carry about **2.4× the
amplitude** the cap allows. Making it p-dependent is a **capability** change, not a safety
fix. Not adjusted; Eva's to rule.

---

## The dead-control sweep — `node tools/bloom-wall-thickness.mjs --controls`

Real shipped ranges, counted against the **shown** build (the `stamenSpread` precedent).

| control | range | steps | dead | first dead |
|---|---|---|---|---|
| Margin buckle | 0–0.6 | 61 | **24** | 0.37 |
| Buckle frequency | 1–7 | 7 | 0 | — |
| Buckle reach | 2–6 | 41 | 0 | — |

**Amplitude's dead travel is a function of frequency, because the cap is** — one number
understates it badly:

| f | cap | live steps | dead | |
|---|---|---|---|---|
| 1 | 3.232 | 60 | 0 | 0% |
| 2 | 0.808 | 60 | 0 | 0% |
| 3 | 0.359 | 36 | 24 | 40% |
| 4 | 0.202 | 21 | 39 | 65% |
| 5 | 0.129 | 13 | 47 | 78% |
| 6 | 0.090 | 9 | 51 | 85% |
| 7 | 0.066 | 7 | 53 | **88%** |

Told in the read-out (`CLAMPED`, the cap, the built fold) and marked on the track via the
row's `cap`. **The range is not narrowed and the max is not adaptive** — the `stamenSpread`
ruling. But 88% dead at the top frequency is a large number and is Eva's to look at.

**The cross condition holds**: frequency and reach are **inert** at amplitude 0 (measured
float-identical, not merely hidden) and **live** everywhere they are shown. No control's
default sits where another goes inert.

---

## The wall instrument's markers, re-measured at 56 rows

- **The `f = 7` report marker is GONE.** At 28 rows it sat at 4.0 rows/cycle and was
  reported with that as its stated reason, predicting recovery under refinement. At 56 it
  is 8.0 rows/cycle and costs 0.030 mm against a 0.12 bar. The prediction was the reason
  for the marker; the prediction came true; the marker is off and the row is **asserted**.
  Six asserted states now.
- **The composition xfail still fails, and got worse exactly as predicted** — own
  contribution **0.438 mm at 28 rows → 0.602 at 56**, against its own recorded prediction
  of 0.635 at 84. Its text now carries the self-approach finding.
- Since the frequency ceiling is exactly `NU / ROWS_PER_CYCLE_MIN`, **no reachable state
  is below the resolution bar** and no row carries that marker any more.

---

## The sheet — `node tools/shot-bloom-buckle.mjs <dir> [--quick]`

Seven rows: the two references side by side with their cross terms, the `p` axis alone at
fixed amplitude and frequency, amplitude, frequency, the clamp from both sides of one
asked value, the per-slot phase at 3/8/20/40 petals, and the composition beside the
identity control.

**Two instrument findings, both measured:**

- **The settle criterion "two consecutive identical frames" fires spuriously on the first
  capture after a page load.** Measured: the first settle declared itself done after 27
  iterations and its frame was **27,982 px** from where the same cell sits once genuinely
  at rest; every capture after that is 1 px. The fix is a **warm-up settle** before the
  first capture plus **three** consecutive identical frames. With it, both proved rows'
  same-tree controls read **0 px** (they read 28,893 and 64,621 before).
- **The identity claim moved off pixels onto the geometry.** An exact-zero *pixel*
  identity is not available — two draws of one cell settle 1 px apart — so asserting it
  would be asserting the instrument's own noise. The claim is now `Object.is` over the
  emitted positions: **0 of 171,360 floats differ** between the default and the GATED
  state. The pixel figure is reported beside the row's control and never used as a bar.

---

## Two checks the negative control repaired — both were mine

**V3 went vacuous the moment the controls shipped, and then was blind to the mutant that
replaced it.** Until this session the buckle's keys were undeclared, so "present at zero"
versus "absent" was a real distinction and V3 asked it. With registry rows `DEFAULTS`
always supplies them and that comparison compares a state with itself. Re-pointed at the
GATED claim — frequency and reach at their extremes with amplitude 0, float-identical to
the default — **and that was still not enough**: a guard that engages the field at
amplitude 0 moves the default *and* the gated state equally, so a same-tree comparison
cannot see it, and the replacement mutant sailed through. That is `/print`'s own recorded
lesson (`global/is-unchanged-by-the-new-mode` is blind to a mutation that breaks both
sides) arriving in the bloom. **V3 is two clauses now**: the predicate asserted directly as
a biconditional over nine (frequency, reach) pairs — flat at amplitude 0, live above it —
plus the geometric identity. The mutant fires on the first.

**The grid gate hardcoded `NU_EXPECTED = 28` under a comment reading "read back from the
emitted rows below, never assumed".** It was assumed; it was a literal; and it went red
(76 of 528 checks) the moment `NU` moved. Fixed at the source — `BLADE_ROWS` is exported
from the geometry and imported there, with a loud throw if it ever stops being exported —
rather than by editing the number, because editing the number would have left the false
comment standing. A label naming a computation nobody performed, in a gate, is this
project's most repeated defect and this is one more instance of it.

**And the range-import claim was one too.** Three comments in this session's own code said
the harness fails at module load if the registry's imported ranges became literals — a
check that did not exist when the comment was written. It exists now (`BUCKLE_EXPECTED` in
`tools/bloom-harness.mjs`), it covers the ranges, the defaults and the section, it asserts
the frequency ceiling is `BLADE_ROWS / BUCKLE_ROWS_PER_CYCLE_MIN` exactly, and **all four
of its clauses were fired on mutated registries before being trusted.**

## Verification

- byte attribution — **A vs B 0 / 101,969,280; B vs C 1124 of 1124 by length**
- `--verify-frozen --phase22` — **PASS**, deep-equal to `2a97e96`'s own `buildMatrix()`
- `verify-bloom-panel.mjs` — **PASS**
- `bloom-wall-thickness.mjs` — green, 6 asserted states, 1 tracked xfail
- `--negative-control` — five mutants, all behaving
- `--controls` — the sweep above
- smoke, grid gate, census — see the close

Live matrix **562 → 596** (block 27's 28 rows plus 2 sweep rows for each new slider).

---

## What is NOT done

- The clamp is **not** made p-dependent and `SELF` is **not** made a gate — both wait on
  the ruling above.
- The composition xfail stands and must go on failing until it genuinely passes.
- The two pre-existing defects recorded in session 33 (roll 330's faceted wall,
  all-form-max diverging) are untouched, per instruction. All-form-max now reads **0.004
  mm** at 56 rows, diverging further, consistent with its being real geometry.
- Nothing is merged.
