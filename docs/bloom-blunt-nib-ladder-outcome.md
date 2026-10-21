# The blunt-nib ladder fix — tried, measured, NOT shipped

*Session of Oct 21. Eva's ruling of Oct 20 scheduled it after the braid: "a nib resolution demand in the ladder, for
LAW and CURVE alike", the remedy F6-spoon named in §5–§6 of `docs/bloom-spoon-rim-turn-outcome.md`. Read that doc
first; this one answers its §6.*

## 1. The answer

**A station in the blunt end's last gap does not take the turn away, and every criterion tried makes more rows
worse than better.** Five criteria were built and measured through E2, the edge-profile gate's own clause, on the
rows F6-spoon measured plus three wide ones. The best variant leaves every pointed default unbound and folds
nothing. It eases the cupped spoon (71.99° → 51.73°), the cupped near-rectangle (89.84° → 61.89°) and the cupped
spatulate (81.33° → 75.49°). It also pushes every blunt end at **cup 0** past the allowance, where main holds
them at or under 45° (the near-rectangle 45.00° → 53.74°, the tip-2.5 spatulate 43.23° → 56.20°). It worsens the
round ends under a cup (121.44° → 142.80°, 132.42° → 161.77°).

**Main has 8 of 17 rows over the allowance and the best candidate has 13** (10 rows worse, 3 better). No criterion
tried does better than main overall (§3).

**So no geometry changed.** `bloom-geometry.js` is byte-identical to `main`, no row moved, no E2 or census
re-record is owed, and no frozen phase is owed. The candidate is committed as a patch so the measurement can be
reproduced and the code is not lost: `docs/bloom-blunt-nib-ladder-trial.patch`.

**The premise F6-spoon §6 recorded — "it is #283's declared nib × cup class, now measured as one missing station" —
is REFUTED.** The sites in §4 say why. The coarse last gap is not a missing station. It is the ramp the bead's
narrow-span clamp and the cup's lift fall down. Shorten it and the ramp gets steeper.

## 2. What was built (the trial patch)

The ruling's shape, line for line. The patch applies cleanly to `96b96e1`.

- **Through `ladderDemand`.** The nib's demand gains a `fall` spec. It carries the widest point, the arc's start,
  and the half-width functions for both halves of a two-sided outline.
- **Inside the one ladder.** `bladeStations`' shipped placement is wrapped verbatim as `ladderFor(demand)`.
  `nibFallLadder` checks the EMITTED stations against the criterion.
  - Where nothing binds, the shipped placement is returned, from the same call (pointed ends hold BY BRANCH).
  - Where something binds, the fall window becomes the demand's first sub-region in front of the arc's, and the
    ladder places it again.
  - The window grows from the nib upward only while the ladder has room, and is told `short` where it runs out.
- **The criterion is a length against a length.** No gap on the descent from the widest point may fall by more
  than `NIB_FALL_MM` of half-width. It is read on a mode-free view of the outline: the stations are bit-identical
  live and export on every trial state.
- **The window is placed by a budget, not by the turning measure.** Equal increments of the ladder's turning
  measure put the new stations on the SHOULDER, where the outline turns, and left the straight fall with one gap.
  The trial's first cut met the criterion nowhere. Each ladder sample is charged the larger of two budgets: its
  half-width change over `NIB_FALL_MM`, and its width in `u` over the gap bound. Equal increments of that budget
  meet both by construction, with the fewest stations that can.
- **The fall band keeps its placement through the gap-bound blend.** Its target is its own placement wherever that
  is admissible. Otherwise the blend pulls the band back to uniform in `u`, which is exactly the spacing the demand
  exists to undo.
- **The merges, never a choice between demands.**
  - The arc keeps its six rows and its `yieldAt` role against the gap bound.
  - Under lobes the window already spans the fall, so the periods it crosses are raised by the fall's share on top
    of the lobes' own floor. The floor is never lowered.
  - At the buckle's frequency ceiling (`ladderGapFactor(7) === 1`) no demand reaches the placer, so nothing is
    placed. The fall is measured on the uniform ladder and recorded `ceiling: true`. That is session 32's ruled
    trade, carried and not re-opened.

**One defect of the trial's own was found and fixed before any figure here was taken.** On a tip-3.0 end the arc
is 2e-5 of `u` against a ladder sample of 8.75e-5. So the window's last station rounded UP onto `u = 1`, above the
arc's rows, and the ladder came out non-monotone. The census read 1,808–1,944 within-shell pairs on three
spatulate states. The window's end is floored onto the samples now. After the fix every trial state reads
**0 pairs, 0 inward shells and the same triangle count as main** (§5). Recorded because "the demand creates a fold"
was this session's first reading and it was wrong.

## 3. The measurement (`node tools/bloom-blunt-nib-ladder.mjs`, EXPORT, degrees E2 adds; allowance 45)

Run it to regenerate every figure. It copies this tree, applies the patch, runs the gate's own E2 on main and on
each criterion side by side, and prints the trial's own record and the census on both trees. 1 min 52 s, no
browser. The criteria:

- **law 0.8** — the ladder's own view of the LAW, where the nib's flank is flat by construction.
- **drawn 0.8, drawn 1.0, drawn 1.6** — the DRAWN outline, the flank included.

| row | main | law 0.8 | drawn 0.8 | drawn 1.0 | drawn 1.6 |
|---|---|---|---|---|---|
| spoon x cup 0 | 44.53 | 45.02 | 45.90 | 45.70 | 44.53 |
| spoon x cup 0.6 | **71.99** | 68.51 | **47.08** | 51.73 | 72.05 |
| near-rectangle x cup 0 | 45.00 | 52.61 | 54.14 | 53.74 | 45.00 |
| near-rectangle x cup 0.6 | **89.84** | 89.42 | 61.12 | 61.89 | 91.69 |
| LAW spatulate 1.7 x cup 0 | 43.23 | 46.04 | 52.31 | 51.05 | 43.47 |
| LAW spatulate 1.7 x cup 0.6 | **81.33** | 101.93 | 62.52 | 75.49 | 101.60 |
| LAW spatulate 2.5 x cup 0 | 43.23 | 57.07 | 57.60 | 56.20 | 52.71 |
| LAW spatulate 2.5 x cup 0.6 | 121.44 | 147.84 | 142.83 | 142.80 | 146.27 |
| LAW spatulate 3.0 x cup 0 | 44.87 | 53.85 | 53.50 | 52.84 | 53.49 |
| LAW spatulate 3.0 x cup 0.6 | 132.42 | 162.98 | 161.91 | 161.77 | 161.55 |
| default curve x cup 0 | 43.59 | 43.59 | 43.62 | 43.59 | 43.59 |
| default curve x cup 0.6 | 43.47 | 43.47 | **56.16** | 43.47 | 43.47 |
| LAW default x cup 0 | 43.69 | 43.69 | 43.69 | 43.69 | 43.69 |
| LAW default x cup 0.6 | 43.50 | 43.50 | **69.67** | 43.50 | 43.50 |
| spoon x width 30 | 49.20 | 56.40 | 57.30 | 57.36 | 56.48 |
| LAW spatulate 3.0 x width 30 | 47.87 | 50.38 | 50.23 | 50.23 | 48.95 |
| LAW default x width 30 | 42.25 | 42.27 | 46.73 | 45.56 | 42.75 |
| **over 45** | **8** | 12 | 15 | 13 | 10 |
| **worse than main / better** | – | 10 / 2 | 12 / 3 | 10 / 3 | 11 / 0 |

How to read the table:

- **The pointed defaults decide the criterion's floor.**
  - On the drawn outline, their last gap falls 0.839 mm (default curve) and 0.924 mm (LAW default). So a criterion
    under 0.924 binds the shipping petal and moves it: drawn 0.8 takes the LAW default at cup 0.6 from 43.50° to
    69.67°.
  - On the law, the flank is invisible, and the defaults fall 0.740 / 0.466 mm.
  - **1.0 mm on the drawn outline is the smallest criterion that leaves both unbound.** It is the candidate the rest
    of this doc and the sheet use. It still binds on the wide LAW default (`width 30`, 42.25° → 45.56°).
- **The baseline falls reproduce F6-spoon's own table exactly** through an instrument that shares no code with
  it: the spoon 2.220 mm, the near-rectangle 2.844 and the LAW spatulate 2.424 against §2 there, and the defaults
  0.839 / 0.924.
- **No criterion clears the class, and no criterion is monotone in its effect.**
  - The finest (drawn 0.8) is the best on the cupped spoon (47.08°) and the worst on the shipping petal.
  - The coarsest (1.6) leaves the cupped rows where they were or worse.
  - Every criterion worsens the round ends under a cup.

## 4. Where the turn goes, and why a station cannot take it away

Read the sites with `tools/bloom-spoon-rim-turn.mjs` under the trial's knobs (`NIBX=drawn NIBD=1.0`).
**At cup 0 every blunt end turns at the NEW last gap before the nib, whose upper station now sits at h ≈ 1.04 mm**:

| row | main | trial | site under the trial |
|---|---|---|---|
| spoon x cup 0 | 44.53 | 45.70 | row 51/58, h 1.044 mm, last gap before the nib |
| near-rectangle x cup 0 | 45.00 | 53.74 | row 51/58, h 1.040 mm, last gap before the nib |
| LAW spatulate 1.7 x cup 0 | 43.23 | 51.05 | row 51/58, h 1.041 mm, last gap before the nib |
| LAW default x width 30 | 42.27 | 45.56 | row 51/58, h 1.024 mm, last gap before the nib |

On main, the same blunt end's last gap runs from h 2.4–3.0 mm to the arc over about 2.3 mm of plan length. The
trial shortens it to about 0.9 mm (on the spoon: 0.26 mm along, 0.84 mm of half-width).

What changes across that one gap does not get smaller with it. The bead's room arm (#278's `0.45 x room`) still
collapses from a full 0.50 mm bead to the nib's clamped one (0.18 mm at the arc's start). The cup's lift (`c x h`,
scaled down onto the nib) falls with it.

**So the gap is the RAMP those two fall down, and a shorter gap is a steeper ramp.** A pointed end reads under 44°
with the same collapse because its last gap is about 1.2 mm of plan. Main's blunt end reads ≤ 45° at cup 0 because
its last gap is LONG. Under a cup the long gap's out-of-plane drop is what turns, and the trial trades it for a
steeper in-plane collapse. That trade is the table.

This is a measured pattern over these states, not a law fitted to them. It says the lever is not the ladder's: what
turns is the bead's clamp and the cup's lift approaching the nib. **The ruling's other named criterion — "the gap
in mm against the nib's own scale" — cannot discriminate either.** On main the last gap's along-length is
0.55–0.66 mm on the blunt ends and 0.55–0.79 mm on the pointed ones (F6-spoon §2's table). A criterion on it binds
both or neither.

## 5. The printed consequence and the modes (the candidate, drawn 1.0)

- **Mode-free:** the stations are bit-identical live and export on all 17 states, and the trial's record (binds,
  worst fall) agrees in both modes.
- **Census and orientation:** 0 within-shell pairs and 0 inward shells on all 17 states on BOTH trees. The
  triangle count is identical to main's on every state (24,688; 36,336 at tip 2.5; 47,984 at tip 3.0).
- **The candidate is SHORT on two wide states** (`spoon x width 30`, `LAW spatulate 3.0 x width 30`). The window
  ran out of room, and the worst fall left there is 2.305 / 3.042 mm.

So what the candidate would ship is a crease trade with no solid at risk either way. The table is the argument
against shipping it, not a print-safety one.

## 6. What it would have moved (sizing, the base tree's own record)

This reads `main`'s builder record, EXPORT, over the 1,457-row live matrix. It takes the base outline
(`profileBase`, both halves on a two-sided petal, so a lobe's notch is not counted as a fall) against the
emitted `profileU`, over every built petal and sepal. It builds 1,455 rows; the two export-refused `ALL MAX` rows
are skipped, and 0 rows error.

The count is the rows whose worst one-gap fall on the descent into the nib exceeds the criterion — the rows a
shipped demand would have moved:

| criterion | rows that bind |
|---|---|
| 0.8 mm (the nib's own entry scale) | **1,327 of 1,455**, the shipping default among them (0.924) |
| **1.0 mm (the candidate)** | **164** |
| 1.6 mm | 58 |

The worst falls on main:

- 4.274 mm — `the spoon x petalWidth 30`
- 4.236 — `TIP SHAPE: 3.00 x the longest, widest petal`
- 3.206 — the far-out widest point at tip 3.00
- 2.844 — the near-rectangle
- 2.220 — every spoon row

The nearest any row comes to 1.0 is 4.3e-3 mm, so the candidate's binding decision has no knife edge on this
matrix. The tool for this is in the session scratchpad and is not committed; a demand that does not ship has no
predicate to keep.

**A criterion at the nib's own entry scale would move nearly the whole matrix.** The shipping petal's descent
already falls 0.924 mm in one gap, which is part of why the drawn-outline criterion cannot go below that figure
without moving the default (§3).

## 7. Not done, and named

- **No byte moved, so no partition, no E2 or census re-record, and no frozen phase.** Nothing is owed and nothing
  was dispatched. `frozen/phase80` stays the newest baseline.
- **No mutants were committed.** The three the brief named — the demand ignored, read from a row count, taking
  rows the lobes are owed — test a demand that does not ship. They are written into the patch's own structure
  (`nibFallLadder`'s record, `mergeNibFall`'s floor) for whoever picks it up.
- **No matrix row was added.** The blunt shapes at cup 0.6 are already smoke rows (the spoon, both declared) or
  are F6-spoon's measured states, and the trial ships nothing for a row to witness.
- **WHAT THE SHEET SHOWS THAT THE COUNT DOES NOT — said so the ruling is made from both.**
  - In the three CUPPED cells the trial's tip reads ROUNDER. The pinched "beak" F6-spoon photographed softens into
    a curved end, and that is real: E2 falls 72 → 52, 90 → 62 and 81 → 75 there.
  - In the cup-0 control a NEW bright facet appears at the last gap before the nib, the steeper ramp of §4. It is
    44.53 → 45.70 on the spoon and far worse on the near-rectangle (45.00 → 53.74), which is not on the sheet.
  - The round LAW ends (tip 2.5 and 3.0) under a cup get worse by 20–30 degrees and are not on the sheet either.
  - So the picture of the spoon at cup 0.6 alone would argue FOR the trial, and the table argues against it.
- **The sheet is `docs/img/blunt-nib-ladder-trial.png`** (`node tools/shot-bloom-blunt-nib-trial.mjs <dir> --png
  <file>`): F6-spoon's own sheet run on main and on the patched copy, each from its own server, with the E2 of the
  tree that drew it on every caption. It is deliberately NOT `spoon-rim-turn-fixed.png`, because nothing was
  fixed. `docs/img/spoon-rim-turn.png` stays where it is.
- **The two levers the measurement points at are not built and need a ruling:**
  - **(a) The cup's nib scale.** `cupScale = hb / TIP_HALF_MM` ties the lift to the half-width, so on a blunt end
    the lift falls with the cliff. It could be faded over a LENGTH approaching the nib instead.
  - **(b) The bead's profile on a steep outline.** The profile is laid across the ROW, which is ALONG the outline
    where the outline is near-vertical, and its room arm collapses with the nib's width. It could be laid on the
    outline's own in-plane normal.
  - Either is its own session with its own byte partition. Which one, or neither — the class stays declared, as
    #283 and F6-spoon left it — is Eva's.
