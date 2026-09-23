# The apex nib — the petal ends on a rounded point, not a flat face

*Eva's rulings, the apex-nib session. Five rounds of sheets: option (a) and
option (b) rejected, YELLOW rejected, RED ruled, RED+ at a 0.40 mm face ruled,
and then the **FULL ROUND** nib ruled from the last sheet ("go with full
round"). Option (c) — the read-out — approved and shipped in this PR.*

Read this before touching `apexNibPlan`, `widthProfile`'s reparameterisation,
`ladderDemand`, the `APEX_*` constants or the AN family.

---

## 1. The defect, measured

`halfWidthAt(u)` is `max(the tip law, the root blend, the print floor)`, and
the superellipse tip law reaches **exactly 0 at u = 1**. So wherever the law
fell under the floor, the outline ran PARALLEL at that floor to the end, and
**every petal finished on a flat face two floors across — 1.6000 mm in EXPORT,
0.3000 mm live — whatever exponent `petalTipShape` was asked for.**

It is **not a regression**. Session 32's cap DEMOTION squared the tip, and
that demotion was right: through the old cap the drawn exponent SATURATES
(asked 3.00 draws 2.0403), so the six named tip states Eva ruled were not all
reachable. What the demotion left behind is this stub, and this is the session
that closes it.

**The stub's share of the length is a WIDTH question, not a length one.** The
outline meets the floor where `(W/2)·f(u) = TIP_HALF_MM`, so the fraction of
the blade the stub occupies is invariant in `petalLength` — the same finding
the leaf tip-shape session recorded from the other side. The lever is the
petal's WIDTH and the exponent.

---

## 2. What ships

`apexNibPlan(shapeBaseAt, rootBlend, uPk, lengthMm, petiole)` in
`bloom-geometry.js` is the ONE owner. Given the mode-free lamina it:

1. bisects for `uLaw`, where the law meets `TIP_HALF_MM`;
2. reads the flank's one-sided tangent there, Richardson-extrapolated from two
   steps;
3. runs a **straight flank on that tangent** down to `APEX_HALF_MM`;
4. closes with a **circular arc centred ON THE AXIS and tangent to both
   flanks** — `r = APEX_HALF_MM·√(1+m²)` puts the tangent points exactly on
   the corners of the old flat face;
5. terminates on a mini-face `2 × APEX_END_HALF_MM` = **0.10 mm** across.

```
APEX_HALF_MM      = 0.20   // the 0.40 mm face Eva ruled
APEX_END_HALF_MM  = 0.05   // the mini-face the arc closes on
APEX_ARC_ROWS     = 6      // the resolution demand the arc asks the ladder for
```

**`TIP_HALF_MM` and `MIN_FEATURE_MM` DO NOT MOVE.** The 0.40 mm face is an
**authored exception below the minimum feature**, ruled deliberately, on a
generator where **nothing has ever been printed** — the same standing caveat
every floor here carries (§18b of the session-32 doc).

**THE MINI-FACE IS NOT A CONVENIENCE.** A true apex collapses NV columns onto
one edge: session 5's `domeInto` produced **48 degenerate triangles and 49
non-manifold edges** from a ring 6.1e-17 across. A3 exists for it and AN3
restates it.

### The measured law, EXPORT, the shipping 35 × 16 mm petal

| n | uLaw | flank slope (mm/mm) | cap (mm) | arc (mm) | arc radius (mm) | drawn / asked | Δ |
|---|---|---|---|---|---|---|---|
| 0.60 | 0.75409 | 0.1717 | 3.6577 | 0.1623 | 0.2029 | 30.051 / 35.00 | **−4.949** |
| 0.80 | 0.87527 | 0.2342 | 2.7140 | 0.1524 | 0.2054 | 33.349 / 35.00 | −1.651 |
| 1.00 | 0.93571 | 0.3556 | 1.8227 | 0.1352 | 0.2123 | 34.573 / 35.00 | −0.427 |
| 1.20 | 0.96602 | 0.5574 | 1.1883 | 0.1120 | 0.2290 | 34.999 / 35.00 | −0.001 |
| 1.40 | 0.98161 | 0.8828 | 0.7651 | 0.0855 | 0.2668 | 35.122 / 35.00 | **+0.122** |
| **1.70 (shipped)** | 0.99242 | 1.7673 | 0.3891 | 0.0496 | 0.4061 | 35.124 / 35.00 | **+0.124** |
| 2.00 | 0.99678 | 3.5375 | 0.1956 | 0.0260 | 0.7352 | 35.083 / 35.00 | +0.083 |
| 2.50 | 0.99919 | 11.2102 | 0.0619 | 0.0083 | 2.2509 | 35.033 / 35.00 | +0.033 |
| 3.00 | 0.99979 | 35.0536 | 0.0198 | 0.0027 | 7.0136 | 35.012 / 35.00 | +0.012 |

The flank's slope spans a factor of **204** over the range, and the arc's
radius and the cap's length both follow it.

**ZERO TRIANGLES ADDED.** The shipping default is **24,688 triangles and
1,205.55 KiB in both modes** — the counts main has. The nib is a boundary
change on a fixed row-and-column lattice.

---

## 3. `petalLength` is the ASKED length, and the overshoot is reported

Eva's ruling. The control keeps its meaning; the blade is drawn to wherever
the cap closes. That is **shorter** at low exponents (8.59 mm of law given up
at tip shape 0.60 on a 60 mm blade) and **LONGER** above about n 1.20 — the
crossover is between 1.20 (−0.001 mm) and 1.40 (+0.122 mm), and the maximum
overshoot on the shipping petal is **+0.124 mm at the shipped n 1.70**.

**ACCEPTED AND REPORTED**, per Eva's ruling. The read-out's APEX NIB line
prints the drawn length against the asked one with its sign, on every build.

Everything downstream of `widthProfile` takes the DRAWN length — the seam's
lattice step, the form's frame, the spine, the stations. The cap is applied
EARLY in `widthProfile`, so the lobe and fringe blocks see the capped outline
and the drawn length, and `toLaw(v) = v·drawn/asked` is the one place the two
parameterisations are related.

---

## 4. Three inert cases, declared and named

`apexNibPlan` returns an inert record carrying `why`:

| `why` | ring-modes over the whole matrix, both modes |
|---|---|
| `a squared terminal holds the outline above the floor` (#229's fringe terminal) | 76 |
| `the blade never clears the print floor` (an inner whorl) | 18 |
| `the law arrives with no slope to carry on` | **0 — unreachable** |
| `no length` / a leaf (`cap.petiole`) | excluded by declaration |

Swept over **2,452 ring-modes** of the full 920-row matrix in both modes.
`APEX NIB: MIXED — 6 layers x layerSize min` is the row that carries BOTH
states in one bloom: three rings with a nib, three whose blade never clears
the floor.

**A LEAF IS EXCLUDED BY DECLARATION, NOT BY OVERSIGHT.** `buildLeafInto` floors
at `TIP_HALF_MM` in both modes, so a leaf has the identical 1.60 mm stub — at
tip shape 0.60 it is 21.3% of the leaf. `leafLength` is a different control
with its own read-out, its own LF family and its own declared magnitudes, so
that is a second partition and a second ruling. **Scheduled, not taken.**

---

## 5. The ladder had to be told, and that is where two defects were found

The arc is **0.0496 mm on the shipping default against a 0.60 mm median row
gap — 0.084 of one.** `ladderHalfAt` floors on `TIP_HALF_MM` by construction
(the nib's constants must never reach row placement), so the ladder's own
turning measure sees a flat floor where the arc is and would put no rows
there. `ladderDemand()` asks for `APEX_ARC_ROWS = 6`, through session 38's
resolution-demand mechanism — the ladder stays the ONE place rows are placed.

**The arc's demand is MERGED into the lobes', never chosen between.** Under
MODEL B the lobe window runs to u = 1, so the arc sits inside the last period;
returning the lobes' demand alone left the nib **1 row of 6**. The arc becomes
the window's last sub-region — exactly what the per-period split mechanism is
for — **and it takes the window's SPARE capacity and no more**, because the
lobe COUNT was itself derived against that capacity and asking for six extra
rows made the placer trim its largest sub-regions: measured on `lobeDepth
1.00 x 10`, the ladder placed 7 stations in a period whose demand is 9, and
**L6 caught it**.

### THE BLEND'S TARGET DID NOT KNOW ABOUT SUB-REGIONS — a pre-existing gap the nib made visible

The gap-bound blend's target was **three** bands: the stretch, the WHOLE
window, the tip. Its own comment already stated the rule it was breaking —
*"the target is uniform WITHIN EACH REGION … so row i lies in the same region
in both lists and the mix cannot leave it"* — and the window's sub-regions
were simply not among the regions it was told about. Harmless while every
sub-region is a lobe period of comparable width; **not harmless the moment one
of them is the apex arc**: measured on `lobeDepth 0.30 x 3`, the ladder PLACED
6 stations across the 0.0014-wide arc and the blend left **ONE** there,
spreading the other five back over half the blade. With no splits the new
bands are the three they replace term for term, so every unlobed row is
bit-identical.

### AT THE BUCKLE'S FREQUENCY CEILING THE ARC GETS ONE ROW, AND THAT IS THE RULED TRADE

`ladderGapFactor(7)` is exactly 1 — 56 rows over 7 cycles is 8 per cycle with
no slack — so no demand is placed at all and any row handed to the arc comes
off the wave's own bar. Session 32 ruled that trade for the apex already ("at
the ceiling the apex keeps today's faceting"), and `APEX NIB: x the buckle at
its frequency ceiling` is the matrix row that carries it.

**Measured, EXPORT, rows past the law's crossing / on the arc:**

| state | past the crossing | on the arc |
|---|---|---|
| the shipping default | 7 | 6 |
| n 0.60 | 11 | 6 |
| n 3.00 | 7 | 6 |
| buckle 0.30 at f 3 | 7 | 6 |
| **buckle 0.60 at f 7 (the ceiling)** | **1** | **1** |
| lobes 0.30 × 3 | 7 | 6 |
| **lobes 1.00 × 10 (the window is full)** | 2 | **1** |

**AN3 REPORTS THE COUNT AND DOES NOT ASSERT IT**, for that reason; the
read-out's APEX NIB line prints it per build.

---

## 6. A SECOND `laminaHalf`, and an arc table stationed on the wrong length

Two defects inside the LOBES block, both found by the gate and both the same
class this project keeps naming.

* **A SECOND PRODUCER OF THE LAMINA.** The lobes block carried its own
  `max(shapeBaseAt, rootBlend, TIP_HALF_MM)` — the same expression as the
  shared one, which is exactly why nobody noticed, until the nib took
  ownership of its own floor and the local restatement read **0.80 mm where
  the outline is 0.05**. The per-period relief guard then handed a tooth more
  material than the blade has: L5 reported a period's relief at **3.0775 mm
  against a headroom of 3.09e-3**, and the apex half-width went to **0.0000**
  on `lobeDepth 0.30 × 3`.
* **THE ARC TABLE MIXED TWO PARAMETERISATIONS.** `rimArcTable` was handed
  `[u * length, laminaHalf(u)]` — `laminaHalf` is a function of the DRAWN `u`
  and `length` is the ASKED one. Measurable rather than theoretical: L4
  re-measured the margin at **26.3258 mm against the record's 26.2440**, the
  drawn/asked ratio to four figures.

**L4's own lamina was a third restatement** and is now the profile's
`laminaHalfAt`. What keeps L4 a measurement of the tree rather than of its own
consistency is its **chord integrator over 65,536 uniform samples** against
the geometry's graded `rimArcTable`, and that is untouched.

---

## 6b. The wall instrument's two-skin model is inadequate at a converging tip

`measureWall` reconstructs two skins offset ±t/2 from the captured MID-SURFACE
grid. That has been an approximation at every margin since the edge profile
shipped (#278) — the emitted solid closes its rim with a half-round BEAD, not
with two skins meeting at a cliff — and it costs nothing while the margins are
far apart.

**The nib converges the blade to a 0.10 mm mini-face, so the two reconstructed
skins approach each other there BY CONSTRUCTION.** Measured before any
exclusion existed: five states reported a NEW self-approach and four a
normal-offset cost, and **every one of them sat at u = 1.00**.

**WHAT SAYS IT IS THE MODEL AND NOT THE SOLID**: the census — which reads the
REAL emitted triangles, bead and all — reads **exactly 0 within-shell pairs**
on those same buckled states on this tree.

So the exclusion is NAMED, not widened (ST9's remedy, one instrument later),
and **its extent is the last SHEET THICKNESS of blade, derived from a length
and not from a row count**: two skins offset ±t/2 from a converging
mid-surface must approach within the last `t`, because that is exactly where
the outline's own width falls below the offset. **Two narrower rules were
tried and measured inadequate** — stopping at the law's crossing, and at the
crossing plus one row — because the pair this exists for is the tip's top skin
(row 55, u 1.0000) against the bottom skin at **row 48, u 0.9824**: seven
lattice rows apart and 0.62 mm apart on the blade. The combination gate passes
the same argument, because `self` is the wall instrument's quantity through
its function.

**FOUR DECLARED MAGNITUDES MOVED AND ARE RE-RECORDED** (#213's rule, both
directions, previous figures kept in each note):

| record | was | now | site | reading |
|---|---|---|---|---|
| V5 `roll-max` | 0.659 | 0.658 | u 0.21 | nowhere near the tip — the reparameterisation moving every station |
| V5 `form-max` | 0.042 | **0.008** | u 0.11 | WORSE, at the base of the blade, same site; a near-contact this tight moves with the stations |
| V5 `buckle-on-form` | 0.254 | 0.300 | u 0.29 | IMPROVED, same site, same cause |
| V4 `buckle-on-form` | 0.607 | 0.565 | — | IMPROVED |

V4 is fully clean after the exclusion (worst own contribution 0.090 mm against
a 0.12 mm bar), and V5 reports **no NEW self-approach** — only the three
declared ones at their new magnitudes. `--negative-control` passes: all
mutants behave.

## 6c. The tangent is a double cancellation, and it is quantised

`slope` is `|2·s2 − s1|`: each `s` is a difference quotient of the lamina — a
difference of two ~0.8 mm values agreeing to ~2e-4 mm — and then a difference
of two ~1.77 mm/mm values agreeing to ~5e-3. Six digits gone, so the relative
error is of order **1e-10**, and the lamina is transcendental, so **the two V8s
this project runs on do not agree on it**.

X0 caught it: **12 floats of `DOME LEAN: EVA_CONFIG flat` differing by
2.98e-8 mm**, six orders above X0's own derived bar, on a row that passes on
the base commit. **Sixth instance of the discrete-decision-on-a-continuous-
quantity class here**, and the remedy is the one session 42 and session 38
already used: a POWER-OF-TWO GRID, not a tolerance, because the noise feeds
discrete decisions downstream (`cumAt`'s `Math.round` turns a last-bit
difference in `arcU` into a whole ladder sample). `APEX_GRID = 2^-20` is
3,600× the measured noise and 1e-6 of the quantities themselves; it moves the
drawn outline by ~3e-7 mm, four orders under the live mesh floor. `slope` and
`arcU` are floored onto it, and AN1 restates the grid because a rebuild that
skipped it compares a quantised number against an unquantised one — which is
what it did the first time it ran.

## 7. The re-derivations

Eva's ruling: *"C1/A2 re-derived onto the builder's reported length and
terminal; A6 re-derived."* Nine clauses moved, each seen RED first.

| clause | what it read | what it reads now |
|---|---|---|
| **C1** | the spine's length against `petalLength × scale` | the DRAWN length, **plus** a second clause: where the nib is INERT the drawn length is the asked one EXACTLY — the half with an owner the cap does not write. C1 says in its own message that AN2 owns whether the drawn length is right |
| **A2** | last row vs terminal | unchanged — `capTerminalHalf` now reports the nib's own end |
| **A4** | `max(petalTipEnd × peak, the mode floor)` | **three** things may set the terminal now; the guard deciding which arm applies is RESTATED in the gate (`nibWantedFrom`) and never read from the cap |
| **A6** | fits in the tree's own `u` over rows above `uPk` | fits in **LAW space** (`u × drawn/asked`) and **stops at the crossing** — Eva's "only where the law is above the print floor" |
| **FR2** | the same terminal expression as A4 | the same nib arm |
| **VS2** | the blade's built length vs nominal × scale | the **asked** length, which is the quantity the size FIELD produces |
| **SP5** | a sepal's built length vs `petalLength × sepalScale` | the asked length — a sepal is the petal builder on a second ring and cuts its own nib |
| **L4/L5/L3** | their own lamina restatement | the profile's `laminaHalfAt` |
| **L6** | `h(1) >= the mode floor` | `>= the blade's own terminal`, which is the nib's mini-face where the nib closes it |

**A6 IS THE ONE THAT WOULD HAVE BEEN SILENTLY WRONG.** The nib's flank and arc
are strictly falling, so they sail straight through A6's "still falling"
filter: fitting through them reads **1.7532 for an asked 1.70, 0.7358 for 0.60
and 0.9173 for 0.80** — A6 firing on a tree whose law is exactly right. Same
bug class as integrating a turning measure through a kink and as fitting
through the print floor; **the fifth instance here.**

---

## 8. AN0–AN3, the new family

Both STL gates are **blind to all of it**, and that is a measurement rather
than a caution: a nib at the wrong arc radius, joined at a corner rather than
a tangent, carried on the wrong slope or run to a length that is not the law's
crossing ALL leave a single-valued, strictly falling outline on a fixed
lattice — watertight, one connected piece, zero degenerate triangles, the same
triangle count. The census cannot see them either. **A6 cannot**, because its
subject stops at the crossing by construction.

* **AN0** — the nib is drawn exactly where the law says, **three ways**: the
  restated guard, the plan's own flag, and the **emitted last row**, which is
  under the mode's flat face iff a nib closed the blade. Plus `why` is null iff
  active, plus a ring reporting the unreachable slope guard is a FINDING.
* **AN1** — the flank IS the law's own one-sided tangent at its print-floor
  crossing, and the arc's radius, centre and tangent point follow from it. The
  law is rebuilt in the gate from the REGISTRY's `petalTipShape`, the cap's
  declared peak (which A6 separately pins) and the asked length.
* **AN2** — the drawn length, rebuilt end to end: bisect the law for the
  crossing, run the flank to `APEX_HALF_MM`, close the arc to
  `APEX_END_HALF_MM`. This is the clause C1's length statement defers to.
* **AN3** — the EMITTED outline is the nib that was declared: every row above
  the crossing on the flank-then-arc curve, the last row ON the mini-face,
  never zero.

**DECLARED BLINDNESS:** the three `APEX_*` constants are IMPORTED (ST3's
precedent, which imports Eva's 1.5 mm stem wall). They are the DECLARATION;
what AN1 and AN2 check is the five numbers the plan DERIVES from them. A
mutation of the constants themselves moves both sides of every clause together
and this family cannot see it. The shipped picture is what can.

### The mutants

Six, in `tools/verify-bloom-apex-mutants.mjs`, each witnessed on the PLAN the
MUTATED module derives rather than on the assertion it names:
`the-nib-is-never-cut`, `the-squared-terminal-no-longer-stands-the-nib-down`,
`the-flank-is-not-the-laws-tangent`, `the-arc-is-not-tangent-to-the-flank`,
`the-law-is-cut-above-its-own-crossing`, `the-nib-ends-on-the-print-floor`.
A row was added for the guard's other arm (`petalTipEnd 0.30`) — without it the
squared-terminal mutation is a no-op on every row in the file, which is
`seam-reads-the-live-sheet`'s lesson and `bore-is-not-evas-rule`'s.

---

## 9. The matrix, the census and the two declared rows

Block 39 is eleven rows (matrix 909 → 920); the smoke subset gains five
(111 → 116, 34 → 35 blocks), and the family census reads **119 families, all
119 claimed, both directions.**

**TWO NEW ROWS ARE DECLARED SELF-INTERSECTORS AND NEITHER FOLD IS THE NIB'S**,
measured on both trees rather than argued. Both compose TWO controls, which
`buildMatrix()` does nowhere else — it varies one at a time, which is what
makes a row attributable — so neither state had ever been censused.

| row | branch | base (`2464d50`) | reading |
|---|---|---|---|
| `APEX NIB: MIXED — 6 layers x layerSize min` | 10232 / 0.2421 mm | **10232 / 0.2421 mm** | identical to the pair and to four decimals at an identical 146,400 triangles — the six-deep whorl's own fold, and a COMPOSITION (`layerCount 6` alone reads 0, `layerSize 0.35` alone reads 0) |
| `APEX NIB: x cup 1.2 x roll 330` | 6616 / 0.7742 mm | 6344 / 0.7107 mm | pre-existing in kind; the nib moves the magnitude by +272 pairs and +0.064 mm. Both singles fold alone and both are already declared rows; the combination gate names `petalCup × petalRoll` as the widest failing region it has |

---

## 10. What is NOT done, and is named rather than left to be found

* **THE LEAF'S IDENTICAL STUB.** Excluded by declaration (§4); its own
  partition and its own ruling.
* **`ALL MAX` CANNOT BE RUN LOCALLY ON THIS BOX.** It builds 3,090,816
  triangles in **47.7 s** here against the harness's 30 s settle timeout —
  and **46.3 s on a worktree of the base commit**, so it is the box and not
  this change. Verified in CI only.
* **THE COUPON PLAN GAINS A 0.40 mm TIP.** Eva's ruling. The parked cantilever
  coupon is where every floor in this project stops being a line we drew
  ourselves; the nib's face is now one of them.
