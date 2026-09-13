# The carnation fringe and its squared terminal — one feature

**Session of Sep 13, Eva's ruling on `docs/bloom-carnation-fringe-picture.md`.
Read `docs/bloom-squared-tip-discovery.md` §4 and §6f first — §4 is the
terminal's derivation and §6f is the mechanism — then this.**

`petalTipEnd` (PETAL SHAPE, 0–1 of the peak half-width, default 0),
`fringeCount` (Fringe, 0–10, default 0) and `fringeDepth` (Fringe, 0.05–0.50 of
the petal's own length, default 0.20).

**MODE AND SAMPLING ON EVERY FIGURE.** Widths are EXPORT unless said otherwise
and come from the builder's own fringe record, which computes on the **mode-free
lamina** (`max(shapeBaseAt, rootBlend, TIP_HALF_MM)`) and never on the
accumulator's floor — because the panel decomposition is TOPOLOGY. Census
figures are EXPORT, each state built once in Node.

---

## 1. WHY THEY ARE ONE FEATURE, and it is a branch rather than a sentence

Every tooth of a panel fringe runs to `u` = 1, and `TIP_HALF_MM` is an ABSOLUTE
constant — so without a terminal the blade is **1.600 mm across at the apex at
every petal size**, and N teeth plus N−1 gaps must meet inside it. The picture
session measured ten fingers reading as a carnation over most of their length
and then converging into one shared spike.

So the geometry refuses: **a fringe asked where the squared end does not clear
the print floor is NOT CUT** (`noRoom`), told in the read-out, and the row is
bit-identical to the same state with no fringe. `fringeCount max (10)` on the
blanket sweep is a HOLDER in the byte partition for exactly this reason, which
is the ruling showing up as a measurement.

**The threshold is `TIP_HALF_MM` and never `tipFloor`.** The floor is
mode-dependent (0.80 export / 0.15 live) and this decides whether PANELS EXIST.
Against `tipFloor` a 0.5 mm terminal would build a fringe in live and refuse one
in export — session 32's mode-dependence defect, declining to ship a fourth
time.

## 2. THE SQUARED TERMINAL — a TERM with its own domain

`petalTipEnd` is a fraction `t` of the petal's own PEAK half-width (`halfW`,
which the CORE term is normalised against), pushed onto `widthProfile`'s term
list with domain `[uPk, 1]`.

**Four things fall out of the term list that a fold into `tipFloor` would each
have needed separately:** `shapeWinner` NAMES it, so `winnerAt` reports it and
`slopeBreaks` locates its crossover for free; `lawIsActiveAt` stops claiming the
superellipse where the terminal has taken over; `shapeBaseAt` carries it, so
every form law that scales with the half-width reads the squared outline; and
the DOMAIN is where "scoped to the terminal alone" stops being intent and
becomes a property of the code.

**The domain's own edge costs nothing**, which is why there is no new seam at
`uPk`: the ceiling is `t ≤ 1`, so `Wt ≤ halfW`, and at `uPk` the CORE is exactly
`halfW` — its maximum. The terminal ARRIVES BELOW THE INCUMBENT. Measured at
`t` 0.50 and 1.00: the winner below `uPk` is TERMINAL on **0 of 7143** samples,
and **0 of 7143** samples below `uPk` move at the ceiling.

**IT REPRODUCES §6e's OWN TABLE EXACTLY** — the anchor for a patch that no
longer exists (it lived in a session scratchpad; `997c556` is docs-only and
`be03235` carried only matrix rows). End width, both modes:

| `t` | 0.00 | 0.15 | 0.35 | 0.50 | 1.00 |
|---|---|---|---|---|---|
| **measured** | 1.600 | 2.400 | 5.600 | 8.000 | 16.000 mm |
| §6e recorded | 1.600 | 2.400 | 5.600 | 8.000 | 16.000 mm |

**The dead travel is told, never trimmed** (`stamenSpread`'s ruling): below
`TIP_HALF_MM / peakHalf` the terminal is under the print floor and delivers
nothing, and that fraction moves with the petal's width — 20.0% of the track at
`petalWidth` 8, 5.3% at 30 — so no static range is dead-free. The read-out
prints it and the panel hatches the track.

**AND IT COSTS NOTHING IN THE CENSUS.** All eight `the terminal alone` matrix
rows read **exactly 0** within-shell pairs — every value including the ceiling,
the narrowest and widest petals, both ends of the apex law — as does the blanket
`petalTipEnd max (1)` row.

## 3. THE FRINGE — N teeth, each its own panel

`trimPanels` has expressed multiple `v`-spans per row since the cleft shipped;
this reads `widthProfile`'s plan and computes nothing. `emitPanel` is untouched:
`spanAt` already received the row index and the cleft arm ignored it, so a
tapering tooth needed no change to the emitter — §6f's prediction, confirmed.

### 3a. The split is owned in physical units

`fringeDepth` is a fraction of the petal's OWN LENGTH from the tip, so the
target station is `1 − depth` **exactly** and the depth in millimetres is
`depth × length`. One owner; no row count standing for a depth.

A panel boundary IS a row, so `trimPanels` takes the **NEAREST** station — not
the first past it, which is biased by up to a whole gap — and the record reports
the residual against the row it landed in. **FR3 bounds it at half a gap.**
Measured on the shipped carnation: asked `u` 0.8000, landed 0.8001, **0.003 mm
off inside a 0.875 mm row**. (On main the same asked `u` = 0.80 landed on row
43 / 46 / 41 under three lobe settings.)

The split is clamped at `uPk` so a tooth can never reach below the petal's
widest point into the region `petalBaseTaper` owns — reachable on a spatulate
taper, where `uPk` goes to 0.833 while the deepest split asks for 0.500.

### 3b. The taper, and the defect FR4 caught

Teeth taper to points; gaps widen to match. A tooth is narrowest at its own tip
and a gap at the split, and each is set to `MIN_FEATURE_MM` where it binds.

**THE FIRST VERSION WAS RIGHT AT TWO STATIONS AND WRONG BETWEEN THEM, AND ONLY
THE NEW FAMILY SAW IT.** It set the tooth's base width from the width at the
PLANNED split and interpolated; the landed row sits up to half a gap above the
target, where the blade is narrower, so under the buckle — which moves the
ladder — the emitted gap came out **0.9910 mm against a 1.0 mm floor** (and
0.9886 on ALL FORM MAX). Both rows exported watertight, as one piece, at an
identical triangle count. FR4 is the only thing that reported it.

**What replaced it holds by construction at every station.** At any station the
teeth and gaps tile the lamina (`N·tooth + (N−1)·gap = W`), so given
`W ≥ (2N−1)·F` the admissible gap is exactly the interval `[F, (W−N·F)/(N−1)]`:
its low end puts the gaps on the floor, its high end puts the TEETH on the
floor. Sliding a linear ramp across that interval walks from one to the other,
and **both widths clear the floor at every point of it, at every station, for
any W the region contains.**

### 3c. The count ceiling is the terminal's width

Both binding constraints reduce to the same inequality applied at the fringe
region's NARROWEST station — measured, not assumed:

**`N_max = floor((W_min / MIN_FEATURE_MM + 1) / 2)`**

| `petalTipEnd` | end width | ceiling |
|---|---|---|
| 0 (no terminal) | 1.600 mm | **1** — NO ROOM |
| 0.30 | 4.800 mm | 2 |
| 0.50 | 8.000 mm | 4 |
| 0.85 | 13.600 mm | 7 |
| 1.00 | 16.000 mm | **8** |

Reproducing the arithmetic the picture session did on §6e's measured terminals.
**CLAMPED AND TOLD** — the read-out names the count asked, the count built, the
width that bound and what the end would have to be.

**ACROSS THE PETAL-SIZE RANGE** (`node tools/bloom-fringe-ceiling.mjs`), and
`--` is NO ROOM:

| `petalWidth` | t=0.00 | 0.15 | 0.30 | 0.50 | 0.70 | 0.85 | 1.00 |
|---|---|---|---|---|---|---|---|
| 8 mm | — | — | 1 | 2 | 3 | 3 | 4 |
| 12 mm | — | 1 | 2 | 3 | 4 | 5 | 6 |
| **16 mm** (shipped) | — | 1 | 2 | 4 | 6 | 7 | **8** |
| 22 mm | — | 2 | 3 | 6 | 8 | 9 | 11 |
| 30 mm | — | 2 | 5 | 8 | 11 | 13 | **15** |

Two things fall out and both are stated rather than left implicit.

**THE CEILING IS IDENTICAL IN LIVE AND EXPORT ON EVERY CELL** — zero mode
differences over the whole table, which is what "the panel decomposition is
topology" means when it is measured instead of asserted.

**`petalLength` DOES NOT MOVE IT AT ALL** — 8 at 20, 35, 45 and 60 mm — so
width is the only lever, exactly as the picture session found. What length does
move is the DEPTH, which is a fraction of it: 4.00 / 7.00 / 9.00 / 12.00 mm of
teeth at the shipped 0.20.

**AND ABOVE 16 mm THE RANGE BINDS BEFORE THE GEOMETRY DOES.**
`FRINGE_COUNT_RANGE` stops at 10 while a 22 mm petal carries 11 and a 30 mm
petal 15. That is the inverse of `stamenSpread`'s dead travel and takes the same
ruling — the range is not widened and the maximum is not adaptive — but the
read-out prints the geometry's own ceiling beside the count, so the headroom is
visible rather than silent. **Whether 10 is the right cap is Eva's**, and it is
one constant.

## 4. LOBES AND THE FRINGE ARE MUTUALLY EXCLUSIVE — the fringe wins

Both own the apex (the coverage arc is centred on it by construction), and
composing them was MEASURED to narrow **every** tooth including interior ones
nowhere near the rim — middle finger **0.5873 → 0.4599 mm at coverage 0.40** —
because a `v`-span is a fraction of the CUT half-width. A rim treatment moving
the petal's CENTRAL teeth is a coupling no control could own honestly.

**Two statements, as `perPetalEligible` already has**: the registry hides the
family (`lobesEligible`), the geometry makes it inert (`lobesEligible()` —
the lobe record is never constructed), and FR0 asserts they agree AND that no
lobe record exists on a fringed row. The read-out says which family is standing
down.

**THE PROOF IT IS REALLY INERT IS AN IDENTITY**: `FRINGE: GATED — LOBES asked
for under a fringe` reads **7288 pairs at the identical worst span** as the
same state with no lobes at all. An inert family contributes nothing a census
can see.

## 5. THE MESH — what the gates say

* **Export contract: boundary edges 0** on every one of the 31 block-31 rows.
* **Connectedness: ONE CONNECTED PIECE** at the maximum count on the maximum
  terminal, by voxel flood fill.
* **THE VERTEX-WELD SHELL COUNT IS NOT THE CONNECTEDNESS TEST, and the picture
  session's report of it was the wrong instrument.** That session cited
  `shells 9` — the plain build's own count — as evidence the overlap welds every
  finger. **The conclusion held and the evidence did not.** The count depends on
  whether a tooth's span boundary happens to land on a base column, which is a
  coincidence of N against `NV`: the export gate reads `shells=9` on the 4- and
  7-tooth rows and **57** on the 8-tooth ones, and an exact-double weld in Node
  reads 13 at N=4 where the gate's float32 weld reads 9. The gate labels the
  column **`(unrated)`** in its own output line for exactly this reason, and
  CLAUDE.md states the rule: component count is not how connectedness is
  checked here. The voxel flood fill is, and it reads **ONE CONNECTED PIECE**
  at the maximum count on the maximum terminal.
* **The census reads in the DECLARED cleft class** on every fringed row, and the
  attribution is measured: with the base panel pulled clear of the teeth, every
  count reads **exactly 0** within-shell pairs, so no tooth folds into another
  or into itself.

## 6. THE PARTITION — 30 movers / 706 holders of 736 rows

Predeclared from the BUILDER'S OWN RECORD (a row moves iff its emitted outline
or its panel decomposition actually differs), not from the control set.

* **Movers outside block 31: exactly 2** — `petalTipEnd max (1)` and **`ALL
  MAX`**, session 38's own lesson that a row sweeping every control is a mover
  of any control a feature adds.
* **Block-31 rows that HOLD: exactly 3** — the two GATED guards and NO ROOM.
* The matrix grew **699 → 736**: block 31's 31 rows plus the **six the blanket
  slider sweep adds on its own** for three new sliders. Session 41's lesson that
  the sweep grows by itself and the count must be checked.

**The guards are BRANCHES, not arithmetic coincidences**: at `petalTipEnd` 0 the
term is not pushed onto the list at all, and at `fringeCount` 0 the plan is null
and `trimPanels` returns the single `'full'` span. 0 of 20001 profile samples
differ in either mode.

**`frozen/phase28` is the 699 rows at `994aea4`**, registered in BOTH
`FROZEN_BASE_COMMITS` and `FROZEN_MATRICES` (session 32's lesson — an
unregistered matrix is verified by nothing and there is no row to go red), and
verified deep-equal to the base commit's own `buildMatrix()`.

**`ALL MAX` was re-measured and it IMPROVED**: 135,969 / 4.7312 mm →
**130,004 / 3.1556 mm**, because it now sweeps the fringe and the fringe wins
over the lobe family, so the lobe cut that row used to carry is no longer built.
That entry has gone stale once already (session 42 found it), and the list does
not gate magnitude (#213), so only a deliberate re-measurement catches it.

## 7. A4 IS RE-DERIVED, NOT RELAXED

A4 read *"the terminal is the mode floor and nothing else — the apex has no
control since session 32"*. The squared end IS that control, so the clause now
states the law the geometry has: `max(petalTipEnd × peakHalf, mode floor)`. **At
`petalTipEnd` 0 it is the old clause term for term**, so every row that
satisfied it still does. Its reference is rebuilt from the ROW's own declared
value — an owner the cap does not write (the fourth durable rule).

## 8. FR0–FR5 IS THE NEW FAMILY, AND BOTH GATES ARE BLIND WITHOUT IT

Each tooth is its own closed panel overlapping the base, so a fringe with the
wrong count, the wrong taper, the wrong split row, teeth under the printable
floor, or a terminal that is not the one the control asked for **all export
watertight with zero boundary edges and all export as one connected piece**.
Measured: the shipping default, a 4-tooth fringe and a 10-tooth fringe are
indistinguishable to both gates on every criterion either applies.

FR4 has already earned its place — see §3b.

## 9. ONE HOLE FOUND IN THE SMOKE CENSUS ITSELF, recorded rather than fixed

Clause C drops a claimed family whose whole PREFIX is absent from the roster
(`familiesClaimed` filters on `prefixes.has(...)`), so the FR0–FR5 the new smoke
rows cite were silently uncounted until the first FR assertion existed. It
catches `JS99` — a bad code under a live prefix — and cannot catch a wholly new
one. Narrow, and the same shape as Z2 being hidden by a range.

## 10. WHAT THIS DOES NOT SETTLE

**Nothing in this project has ever been printed.** `MIN_FEATURE_MM` = 1.0 is a
declared guess (§18b), so every "clears the floor" figure above is a comparison
against a line we drew ourselves — including the count ceiling, which is that
constant divided into a width.

**Whether the shipped defaults are right is Eva's, from the
image.** Both controls default to OFF, so the shipping bloom is unchanged; what
the range should be centred on is a ruling and not a measurement.

**The teeth are straight-sided.** The taper is linear in the fringe's own
length, which draws Eva's zigzag. A curved tooth (concave, convex) is one more
law in `widthsAtU` and is not built.

**Cup and the buckle bring teeth into each other** — the picture session
measured 2,280 pairs against a plain petal's 752 under cup 1.2 with the base
pulled clear. Both rows are declared with their counts, reported rather than
tuned around.

**THE TEETH ARE POINTED ONLY WHERE THERE IS SLACK, and that is an identity of
the floor rather than a choice.** A count sitting ON its own ceiling has every
tooth and every gap already at `MIN_FEATURE_MM`, so there is nothing left for a
taper to spend and the teeth come out SQUARE. Below the ceiling they come to
points: at 4 teeth on the ceiling terminal the tooth runs 3.25 mm at the split
to 1.00 mm at the tip. Square teeth are what a maximum count costs, and the
contact sheet shows both.

---

## Instruments

* `node tools/shot-bloom-fringe.mjs <dir>` — `docs/img/carnation-fringe-shipped.png`.
  Every cell is reachable by a hand on a slider; the mutation the picture
  session carried is gone.
* `node tools/verify-bloom-export.mjs --only '^FRINGE:'` and
  `node tools/verify-bloom-connectedness.mjs` — FR0–FR5 ride in both.
* `node tools/bloom-self-intersection.mjs`'s `census()` — every pair count.
