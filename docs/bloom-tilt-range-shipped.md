# The tilt range, shipped — `petalTilt` 0..120, the floor held at 0

*Sep 19, 2026. Eva's re-issued ruling on Q2 of `docs/bloom-bell-corolla-discovery.md`:
**`petalTilt` opens from 0–75 to `0..120`. The floor STAYS AT 0 — the Sep 17 `−30..120`
ruling is withdrawn. The default stays 25. The foot does not move. The seam law ships
unchanged.** This document is what that cost. It does not repeat
`docs/bloom-tilt-range-outcome.md` (#259), which is the measurement record that stopped the
first form of the ruling and is not retracted by this one; every figure it carries about the
descending fold stands, and §1 of it is the reason the floor did not move.*

**MODE AND SAMPLING, named because the durable rule asks.** Every census figure below is
EXPORT mode on the builder's own doubles, through `tools/bloom-self-intersection.mjs`'s
within-shell census — the same call chain `tools/bloom-xfail-magnitudes.mjs`'s own `measure()`
uses. Every byte figure is positional under `Object.is`, both modes, against a `git worktree`
of `0db9969` (main's head when the session opened). A pair count is a property of the
tessellation at NU 56.

---

## 0. What shipped, in one paragraph

Two literals and their restatement. `bloom-registry.js`'s `petalTilt` row goes `max: 75` to
`max: 120`; `bloom-geometry.js`'s `ROLE_OVERRIDES` carries the same bound for `labellumTilt`,
`hoodTilt` and the nine generated `petalNTilt` rows, and `tools/bloom-harness.mjs` throws at
module load if the two disagree — so the range and the clamp envelope move together because
they are one number in two files. **The seam clearance law is untouched, character for
character**: `seamClearanceMm` still saturates at its right-angle value past 90°, which is
what makes 120 a ceiling on the RANGE rather than a change of regime. The floor stays 0.

---

## 1. The live-matrix partition, against #259's prediction

**#259 PREDICTED 43 LIVE ROWS FOR THE `−30..120` ENVELOPE. THE SHIPPED `0..120` ENVELOPE
REACHES 28 OF THEM, AND THE 15 IT DOES NOT ARE EXACTLY THE ONES CLAMPED AT THE FLOOR.** That
is #259 §4(iii)'s own prediction — *"it would halve §2's BYTE cost — the rows asking a composed
−50 move only because the floor moved"* — measured rather than inherited. The split is read off
the BASE tree's own `overrideClamped` telemetry, by DIRECTION: a composed tilt above 75 was
held there and is now let through; a composed tilt below 0 is held at 0 under both envelopes,
because the floor did not move.

**THE PREDICTION HELD EVERYWHERE IT APPLIES, AND THE MAGNITUDES REPRODUCE TO THE PAIR.** #259
measured by mutating `OVERRIDE_BOUNDS` in process on one tree; this session changed the shipped
literals and compared two trees through the within-shell census. The eleven clean-to-folded rows
are the same eleven rows at the same counts and the same worst spans, to four decimals. Nothing
moved differently from the prediction; what changed is only which subset the ruling reaches.

| | #259, `−30..120` | shipped, `0..120` |
|---|---|---|
| live rows the envelope reaches | 43 | **28** |
| WORSE on the census | 18 | **17** |
| better | 10 | **10** |
| same pair count | 15 | **1** |
| clean → folded (new declarations) | 11 | **11** |
| already-declared magnitudes to re-record | 17 | **16** |
| triangle counts moved | 0 of 43 | **0 of 28** |

**THE PARTITION IS A CONFIRMED PASS OVER THE WHOLE LIVE MATRIX, BOTH MODES, POSITIONALLY UNDER
`Object.is`:** `node tools/verify-bloom-seam-bytes.mjs --base <worktree of 0db9969> --change tilt
--matrix live --expect 28/822 --added 8 --control --control-mode` reads **852 comparable rows
(+8 ADDED on the head, outside the partition), 786,865,968 floats compared, MOVED 28 / HELD 822 /
REDEFINED 2** — exactly as predeclared, in both directions. **Triangle counts are unchanged on
every row, with 0 declared exceptions**, and **the FOOT is identical on every row** (6,386,310
captured mid-surface values — point, normal, half-width, thickness, `u`), which is the claim the
foot-does-not-move half of the ruling actually needs. Both controls fire: `--control` reports a
held row perturbed by 1e-9 as MOVED, and `--control-mode` reclassifies one mode against the other
and the mode clause reports it exactly once. **The mover set is predeclared from the BASE tree's
own builder record** — a ring whose composed `petalTilt` is clamped down by the envelope there —
so the prediction's owner is not the quantity under test.

**THE TWO ROWS THAT ACCOUNT FOR THE DIFFERENCE IN THE VERDICT COLUMNS, named rather than
inferred.** #259's eighteenth WORSE row is `SLOT: ALL MIN × 2 whorls in step` (222 → 243): ALL
MIN drives every slot control to its minimum, so `labellumTilt` is −75 and the composed tilt is
25 − 75 = −50, clamped to 0 by the floor under BOTH envelopes. It is unmoved here and its
declared 222 / 0.2538 is untouched. #259's seventeenth re-record is the same row. The fourteen
remaining "same pair count" rows are floor-only in the same way and do not move a byte.

### The eleven rows that go from clean to folded — NEW declarations

Every one is a `… Tilt max (75)` row: a tilt delta at its own ceiling on a base of 25, composing
to 100, which the old envelope held at 75. **The magnitudes are #259's own, reproduced.**

| row | 0..75 (pairs / worst mm) | 0..120 |
|---|---|---|
| `SLOT: labellumTilt max (75) x 2 whorls in step` | 0 / 0.0000 | 42 / 0.4919 |
| `SLOT: hoodTilt max (75) x 2 whorls in step` | 0 / 0.0000 | 42 / 0.4919 |
| `PER-PETAL: petal1Tilt max (75) at 1/side` | 0 / 0.0000 | 42 / 0.4694 |
| `PER-PETAL: petal2Tilt max (75) at 1/side` | 0 / 0.0000 | 84 / 0.4694 |
| `PER-PETAL: petal3Tilt max (75) at 2/side` | 0 / 0.0000 | 84 / 0.3880 |
| `PER-PETAL: petal4Tilt max (75) at 3/side` | 0 / 0.0000 | 84 / 0.4038 |
| `PER-PETAL: petal5Tilt max (75) at 4/side` | 0 / 0.0000 | 84 / 0.4401 |
| `PER-PETAL: petal6Tilt max (75) at 5/side` | 0 / 0.0000 | 84 / 0.4660 |
| `PER-PETAL: petal7Tilt max (75) at 6/side` | 0 / 0.0000 | 84 / 0.4856 |
| `PER-PETAL: petal8Tilt max (75) at 7/side` | 0 / 0.0000 | 80 / 0.5012 |
| `PER-PETAL: petal9Tilt max (75) at 8/side` | 0 / 0.0000 | 80 / 0.5139 |

### The sixteen already-declared rows whose magnitude moved — RE-RECORDED

Six read WORSE and ten better. #213's list holds a declared row to its recorded count EXACTLY
and its worst span within ±5e-5 mm, so every one of these is re-recorded in the same commit with
the previous figure kept in its own note. **No band was widened.**

| row | recorded (0..75) | measured (0..120) |
|---|---|---|
| `ORCHID x the IRIS (both role axes, one bloom)` | 57 / 0.1413 | 56 / 0.1413 |
| `SLOT: ALL MAX x 2 whorls in step` | 2619 / 1.4909 | 2616 / 1.4909 |
| `SLOT: ALL MAX x 3 layers x phase 0` | 3844 / 1.4909 | 4087 / 1.4909 |
| `SLOT: ALL MAX x petalCount 3 x 2 whorls in step` | 2793 / 1.4909 | 2871 / 1.4909 |
| `SLOT: ALL MAX x petalCount 40 x 2 whorls in step` | 2599 / 1.4909 | 2614 / 1.4909 |
| `SLOT: ALL MAX x ALL FORM MAX (every clamp binds at once) x 2 whorls in step` | 19790 / 2.4700 | 19918 / 2.4700 |
| `FAN x PER-PETAL: 1/side x 170deg x petal 1 MAX (largest petal, widest spacing, fewest petals)` | 1247 / 1.4909 | 1205 / 1.4909 |
| `FAN x PER-PETAL: 1/side x 170deg x toggle OFF x petal 1 MAX (two petals, both are petal 1)` | 2494 / 1.4909 | 2410 / 1.4909 |
| `FAN x PER-PETAL: ALL PER-PETAL MAX x 8/side x 60deg (nine groups on a capped arc)` | 21233 / 1.4909 | 20349 / 1.4909 |
| `FAN x PER-PETAL: ALL PER-PETAL MAX x 1/side (one group is the whole bloom)` | 3741 / 1.4909 | 3615 / 1.4909 |
| `FAN x PER-PETAL: ALL PER-PETAL MAX x 3 layers` | 24801 / 1.4909 | 25270 / 1.4909 |
| `FAN x PER-PETAL: ALL PER-PETAL MAX x ALL THIN x spread min` | 8064 / 1.4801 | 7924 / 1.4801 |
| `FAN x PER-PETAL: ALL PER-PETAL MAX x ALL FORM MAX` | 8330 / 2.4700 | 8351 / 2.4700 |
| `CAPABILITY: cleft x FAN x toggle ON x ALL PER-PETAL MAX` | 13699 / 2.8811 | 13405 / 2.8811 |
| `ALL PETALS: max x FAN 3/side toggle ON x petal 1 max (the group, then the petal)` | 7593 / 1.4909 | 7551 / 1.4909 |
| `DOME: rise 1 x FAN 3/side x petal 1 max` | 1473 / 1.4909 | 1454 / 1.4909 |

### The one row that moves bytes and not a pair

| row | 0..75 | 0..120 |
|---|---|---|
| `FAN x PER-PETAL: the OUTERMOST group only (petal 4 at 3/side)` | 0 / 0.0000 | 0 / 0.0000 |

`FAN × PER-PETAL: the OUTERMOST group only` composes to 85 and used to be held at 75; it now
builds 85 and reads 0 pairs either way. It is a byte mover with no census consequence and no
declaration — recorded because a partition that only listed the rows whose census moved would be
a different, smaller claim.

### The fifteen rows the ruling does NOT reach, named

Read off the base tree's own `overrideClamped` telemetry by DIRECTION — `asked > got` is the
ceiling, `asked < got` the floor. **43 rows, 28 clamped DOWN, 15 clamped UP, 0 both.** The 43
is #259's own figure, reached here through the builder's record rather than through a mutated
`OVERRIDE_BOUNDS`, and the 28/15 split is what the ceiling-only ruling costs against the
withdrawn one.

```
SLOT: labellumTilt min (-75) x 2 whorls in step
SLOT: hoodTilt min (-75) x 2 whorls in step
SLOT: ALL MIN x 2 whorls in step
FAN x PER-PETAL: petal 1 extreme x toggle ON (the mirror-line petal, alone)
FAN x PER-PETAL: petal 1 extreme x toggle OFF (the same sliders now drive the INNER PAIR)
FAN x PER-PETAL: petal 1 x 3 layers x inner* (position and depth composing)
PER-PETAL: petal1Tilt min (-75) at 1/side   … through …   petal9Tilt min (-75) at 8/side
```

Each asks for a composed tilt of 25 − 75 = −50 and is held at 0 by a floor that did not move.
**`FAN × PER-PETAL: petal 1 × 3 layers × inner*` is #259's own "one declared row is unmoved"**,
and it is unmoved here for the same reason at a different envelope; `SLOT: ALL MIN × 2 whorls
in step` is its eighteenth WORSE row and keeps its declared 222 / 0.2538 untouched.

---

## 2. Block 36 — the past-90 regime the base control now reaches

Eight rows, appended after block 35, in BOTH STL gates and therefore in the flood fill as well
as the export census. What they cover is the seam clearance's own axes rather than a grid: the
clearance is `(t/2)·sin(turn)` SATURATED at its right-angle value past 90, and the first blade
row is the first lattice station strictly beyond it — so the two levers are the SHEET (which
sets `t/2`) and the BLADE LENGTH (which sets how coarse one station is in millimetres), while
the angle decides whether the window is open at all.

| row | deepest seam turn | pairs / worst mm (EXPORT) | declared? |
|---|---|---|---|
| `TILT: 76` — one step past the old ceiling | 76.0° | **0 / 0.0000** | no — X2 holds it to zero |
| `TILT: 90` — the right angle, where the law saturates | 90.0° | **0 / 0.0000** | no — X2 holds it to zero |
| `TILT: 105` — inside the window | 105.0° | 336 / 0.4016 | yes |
| `TILT: 120 × sheet 2.40` | 120.0° | 368 / 0.7434 | yes |
| `TILT: 120 × 20 × 8 mm` | 120.0° | 336 / 0.4326 | yes |
| `TILT: 120 × 3 whorls × layerTilt 0` | 120.0° | 1,008 / 0.4406 | yes |
| `TILT: 120 × CONTINUOUS × 3 turns` | 154.5° | 2,824 / 0.4820 | yes |
| `TILT: 120 × headRise 0.5` | 173.1° | 1,112 / 0.6428 | yes |
| (block 1) `petalTilt max (120)` | 120.0° | 336 / 0.4095 | yes |

**TWO OF THE EIGHT READ EXACTLY ZERO, AND THAT IS WHY THE BLOCK IS NOT A SET OF ROWS THAT ALL
HAPPEN TO BE DECLARED.** `TILT: 76` is the first newly reachable value and is still BELOW the
right angle: the old ceiling was not a boundary of the law, and this row says so. `TILT: 90` is
exactly where `seamClearanceMm` stops following `sin` and holds at `t/2`, and it reads 0 too —
the saturation is doing its job at the point it was written for. Both are held to zero by X2,
which is a claim that can fail; the other seven are held to their recorded magnitudes by X1,
which is also a claim that can fail. Neither half of the block is decoration.

**`TILT: 105` READS 336 / 0.4016, AND THAT IS THE DISCOVERY DOC'S OWN CELL — MEASURED THERE
WITH A LIFTED CLAMP AND HERE WITH A REAL ONE.** Its T1 row reads `105 † | cup 0 | 336 pairs |
0.402 mm | 1 voxel piece`, where `†` means the clamp was lifted on a scratch tree to reach an
angle the shipped control could not. This session's row reaches the same angle through the
SHIPPED slider and reads the same 336 pairs at the same 0.402 mm, in one voxel piece. §4's own
table says the same thing from the other side (`tilt 105 | shipped law | 336`). **A number
measured on a scratch tree to justify a range, reproduced on the tree that ships the range, is
the strongest form this evidence takes** — and it is why the derivation's 120 is worth pinning
rather than rounding.

**AND THE GRID GATE'S SEAM-FRAME PROBE GAINED THE NEW CEILING — ONE LITERAL, AND IT IS THE ONE
ARITHMETIC THAT CLAUSE HAD NEVER BEEN HANDED.** `verify-bloom-grid.mjs`'s clause 4b pins *the
frame step across the seam IS `petalTilt`, on a flat hub* at written-down tilts, and every one of
them was under a right angle — so the case where the two normals' dot product goes NEGATIVE had
never been exercised. It reads **exactly 120.000000** (as 0 / 25 / 75 / 90 / 105 all do, measured
before the literal was added), so the probe list is `[0, 25, 75, 120]` now. The values are
written down rather than read off the control's `max`, which is why the range change did not
move this clause on its own and why extending it is a deliberate act rather than a consequence.

**ACCEPTED BY RULING MEANS DECLARED WITH A NUMBER.** Every one of these rows exports watertight
and flood-fills as ONE connected piece — that is the invariant, and nothing here touches it. A
within-shell pair is the census's printability finding, and #213's list holds each declared row
to its recorded count EXACTLY and its worst span within ±5e-5 mm, in both directions: a row that
gets worse reddens, and a row that stops folding reddens too and its entry must come off in the
same commit.

---

## 3. The redefined rows — and the ALL MAX regression, reported rather than recorded

`petalTilt` is a SWEEPABLE slider, so opening its range REDEFINES two matrix rows rather than
moving their bytes. They have no counterpart on the base tree and are outside the partition:

* **`petalTilt max (75)` becomes `petalTilt max (120)`.** Block 1's blanket sweep writes the
  slider's own maximum into the label and the value, so the row IS the range. It reads 0 pairs
  at 75 and 336 / 0.4095 at 120, and is declared.
* **`ALL MAX` keeps its label over a different state.** Block 4 hands every SWEEPABLE slider
  its maximum at once, so this row carried `petalTilt` 75 and now carries 120 — one label over
  two states, which is the charter's own session-5 finding arriving with an instrument that
  says so (`ROW_DEF_MOVED_BY_CHANGE` in `tools/verify-bloom-seam-bytes.mjs`, which REFUSES an
  undeclared redefinition and REFUSES a declared one that turns out identical).

**`ALL MAX` GETS SUBSTANTIALLY WORSE AND IT IS A FINDING, NOT A BOOKKEEPING ENTRY.**

| | on `main` | here |
|---|---|---|
| within-shell pairs | 129,803 | **192,270** (+62,467, +48%) |
| worst span | 3.1556 mm | **3.1556 mm** (unmoved) |
| deepest ring's seam turn | 165.0° | **210.0°** |
| export triangles | 2,506,652 | **2,506,652** (unmoved) |
| export | refused (over the 1,500,000 budget) | refused, unchanged |

The row sweeps `layerTilt` to 30 over six whorls, so its deepest ring composes `120 + 5 × 30`
against `75 + 5 × 30` — 210° where it was 165°, both far past the window's 120° edge, where the
fold is topological and no station spacing clears it. **The worst SPAN does not move at all**,
which says the ruling did not make any single contact deeper; it made more of them. The
triangle count does not move either, so the export refusal and its declared 2,506,652 stand
exactly as recorded and `EXPORT_REFUSED_XFAIL` needed no edit.

**IT IS NOT TUNED AROUND AND THE ROW IS NOT TRIMMED.** "Everything at maximum" is a state this
generator refuses to export and the label has to keep meaning that (the session-13 ruling on
`ALL MAX`, and Eva's own three refusals when the fringe first breached the budget). The entry is
re-recorded at 192,270 with the previous figure in its note, and this paragraph is the naming
#213's list asks for — the list does not gate magnitude, so without it the move would pass in
silence.

---

## 4. The frozen baselines, and the phase that is owed

**A FROZEN PHASE IS OWED, AND IT IS OWED FOR THE ROW SET RATHER THAN FOR THE BYTES.**
`frozen/phase35` is **the 852 rows at `0db9969`** — main's head when this session opened —
registered in BOTH `FROZEN_MATRICES` and `FROZEN_BASE_COMMITS`, generated from that commit's own
`buildMatrix()` in a worktree rather than transcribed, and proved deep-equal by
`node tools/diff-bloom-bytes.mjs --verify-frozen --phase35 --base <worktree>` (PASS, 852 rows)
and in CI by `bloom-frozen-matrices` on every push.

It is owed because the ROW SET changed twice over: `petalTilt max (75)` became
`petalTilt max (120)`, `ALL MAX` became a different state under the same label, and block 36
appended eight rows (852 → 860). That is the session-13 and session-31 case, not the
session-23 one; **a byte move alone would owe nothing but a naming** (Eva, Sep 6).

**EVERY FROZEN MATRIX'S DEFINITIONS ARE UNTOUCHED, MEASURED RATHER THAN ASSUMED.** All 33
previously-registered matrices deep-compare identical between the two trees, row for row and in
order — they pin the literal `75` because a frozen matrix is a verbatim snapshot, which is
exactly why editing a label inside one is forbidden.

**THE SWEEP: 722 OF 17,081 FROZEN ROWS MOVE, ACROSS 28 OF THE 34 REGISTERED BASELINES**
(`node tools/verify-bloom-seam-bytes.mjs --base /tmp/bloom-base --change tilt --frozen-sweep`,
1,070 distinct states built, memoised on (control set, capability)). #259 predicted **1,072 rows
across 27 baselines** for the `-30..120` ruling; the ceiling-only ruling reaches a strict subset,
and the two figures agree with the live partition's own 28-of-43 to within a row:
**722 - 28 = 694 over the 33 baselines #259 could see, and 694 / 1,072 = 0.647 against the live
matrix's 28 / 43 = 0.651.** The 28th baseline is `frozen/phase35` itself, which did not exist
when #259 measured.

| baseline | moved / rows | | baseline | moved / rows |
|---|---|---|---|---|
| phase2..phase7 | **0** of 76 / 86 / 106 / 125 / 158 / 205 | | phase19 | 28 of 549 |
| phase8 | 2 of 246 | | phase20 | 28 of 571 |
| phase9 | 2 of 287 | | phase21 | 28 of 572 |
| phase10 | 20 of 376 | | phase22 | 28 of 562 |
| phase11 | 27 of 402 | | phase23 | 28 of 596 |
| phase12 | 27 of 434 | | phase24 | 28 of 624 |
| phase13 | 28 of 469 | | phase25 | 28 of 666 |
| phase14 | 28 of 499 | | phase26 | 28 of 674 |
| phase15 | 28 of 527 | | phase27 | 28 of 680 |
| phase16 | 28 of 481 | | phase28 | 28 of 699 |
| phase17 | 28 of 507 | | phase29 | 28 of 736 |
| phase18 | 28 of 528 | | phase30..phase35 | 28 each of 744 / 746 / 758 / 762 / 778 / 852 |

**THE RAMP AT THE BOTTOM IS THE MATRIX'S OWN HISTORY AND IS WORTH READING AS A CHECK RATHER THAN
AS NOISE.** phase2..phase7 read **exactly 0** — those matrices carry no row whose composed tilt
reaches the old ceiling at all, because the role-override block did not exist yet; the count then
climbs 2 / 2 / 20 / 27 / 27 as the SLOT rows, the per-petal rows and the ORCHID rows arrive, and
**saturates at 28 from phase13 onward and never moves again**, which is the live matrix's own
mover count reached by a sweep that shares no code with the partition. A phase whose row count
FELL (phase16's 481, phase22's 562) still reads 28, because the retirements that shrank those
matrices took no tilt row with them.

**A MOVER PREDICATE THAT READS WHAT ITS OWN CHANGE WRITES CANNOT BE EVALUATED ON THE CHANGED
TREE, AND THE SWEEP WOULD HAVE ANSWERED ZERO IN SILENCE.** `--frozen-sweep` answers "whose bytes
stop reproducing" by applying the change's mover predicate rather than byte-re-exporting all 34
baselines, and its header said it reads THIS tree's builder record — true of `seam`, `widest` and
`arc`, none of which writes `spine`. It is false of `tilt`: the predicate reads
`overrideClamped`, and this change is precisely what stops that record existing. On the head a
composed tilt of 100 is not clamped at all, so `asked > got` is FALSE and **every mover would
have reported as a holder — a sweep answering 0 on a change that moves a thousand rows, with
nothing failing.** The sweep now builds on the BASE tree for a declared set of changes and
REFUSES to run without one (`PREDICATE_READS_WHAT_THE_CHANGE_WRITES`); the refusal was seen to
fire. It is the fourth durable rule applied to a sweep rather than to an assertion — the
prediction's owner must not be the quantity under test — and it was found by asking who owns
each side before running it, which is the only thing that finds this class.

---

## 4b. What was established locally before the merge

A gate that is not green is not a merge, and "I suspect the cause" is not an establishment.
Everything below ran on this tree, in this container, before the PR was opened.

| gate / instrument | verdict |
|---|---|
| `bloom-xfail-magnitudes.mjs` (the whole list) | **297 of 297 declared magnitudes at their recorded figure**, 0 stale, 0 missing, band `pairs exactly / span ±5e-5 mm` |
| `bloom-xfail-magnitudes.mjs --include-refused --only '^ALL MAX$'` | **192,270 / 3.1556 mm**, exactly as re-recorded (the one row the main run skips, 209 s) |
| `verify-bloom-seam-bytes.mjs --change tilt --matrix live --expect 28/822 --added 8 --control --control-mode` | **PASS**, 786,865,968 floats, both controls fired |
| `verify-bloom-seam-bytes.mjs --change tilt --frozen-sweep --base <worktree>` | 722 of 17,081 rows over 28 of 34 baselines |
| `diff-bloom-bytes.mjs --verify-frozen` × **all 34** | **ALL PASS**, row for row and in order |
| `bloom-smoke.mjs --check --negative-control` | **PASS** — 101 smoke rows, **32 blocks**, 860 matrix rows, 102 families claimed in both directions |
| `verify-bloom-panel.mjs` | **PASS** |
| `verify-bloom-grid.mjs` | **PASS — 586 checks over 19 rows** (585 before; clause 4b's new probe is the one added) |
| `verify-bloom-panel.mjs --negative-control` | **PASS** — all seventeen routes observed the failure |
| `verify-bloom-grid.mjs --negative-control` | **PASS** — all seven mutations reddened the clause they named and nothing else |

**THE FROZEN CHECK NEEDED A DEEPER CLONE, AND THAT IS AN ENVIRONMENT FACT RATHER THAN A
REPOSITORY ONE — WORTH WRITING DOWN BECAUSE IT LOOKS EXACTLY LIKE THE FAILURE IT IS NOT.** This
container's clone is SHALLOW (55 commits), so 17 of the 34 base commits read as `UNREACHABLE`,
which is the same message the workflow prints for a genuinely orphaned baseline and whose
documented remedy is *fix the ref, never the check*. `git rev-parse --is-shallow-repository`
is what tells the two apart in one command. After `git fetch --unshallow` 33 resolved, and the
34th is **`frozen/phase10` at `4f39118` — the ONE base commit that is not on `main` at all**,
recovered through its published tag exactly as this project's own record says (`--no-tags` is
why it was still missing). CI uses `fetch-depth: 0` and hits neither. **No frozen tag was
pushed and none was created** — the charter's rule stands: a session registers the baseline and
stops.

---

## 5. What was NOT done, said plainly

* **The seam law is untouched.** `seamClearanceMm` and `seamLatticeStep` are character for
  character what they were, saturation past 90° included. The extension to the window's lower
  bound was costed in the discovery doc and REJECTED there; this session did not revisit it.
* **The cup bound is untouched** (the discovery doc's ruling 5). The cup's own fold is
  reachable today and out of scope: the discovery doc's T1 reads it at **757 pairs / 0.127 mm
  at tilt 0 × `petalCup` 1.2**, present at every tilt from −30 to 90 and independent of it —
  session 32 §18a's apex fold. *(The kickoff called it "the 1,097-pair cell"; that figure is
  in no doc, no list and no measurement in this repository, and 757 is what T1 records and
  what #259 §1 reproduces. Premises are hypotheses — this one was checked rather than
  repeated, and nothing rests on either number, because the bound was not touched.)*
* **The delta controls' own ranges did not move.** `labellumTilt`, `hoodTilt` and the nine
  `petalNTilt` rows stay at −75..75. The harness's dead-zone check refuses a delta WIDER than
  the clamp's usable reach (now ±120) and says nothing about a narrower one; widening them is
  a separate ruling nobody has asked for, and it would move more rows.
* **The floor stayed at 0** and the descending-seam work it was ruled against is unscheduled.
  It is the seam owner's, not a range's.
* **No sheet is owed.** The range's endpoints are photographed by nothing new; what changed is
  reachability, and the states it reaches are the ones the matrix now builds and the gates now
  census.
