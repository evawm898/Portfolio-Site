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

### AND "SPARE CAPACITY" COULD NOT BE MEASURED WHERE IT WAS BEING MEASURED — CI caught it, A8, on two rows

The clamp above is the right idea against the wrong floor. `ladderDemand()`
subtracted the LOBES' resolution floor from `ladderWindowCapacity`; the gap
bound asks each BAND of the blend target for `width / cap` rows of its own,
and that floor was not in the arithmetic. Nothing local can see the
difference, because the two floors agree on almost every lobed row.

**`bloom-connectedness` FAILED on `0606ace` with 0 rows not one piece** — the
flood fill was clean on all 918 rows that reached the results, and #220's row
census named the two that were DROPPED by a validity assertion:

| row | widest gap | bound |
|---|---|---|
| `LOBES: x petalTipShape 0.60` | **1.5829 ×** uniform | 1.4000 |
| `LOBES: x petalTipShape 3.00` | **1.4159 ×** | 1.4000 |

Reproduced in Node to four decimals, **identical in both modes**, with
`blend = 0.000000` on both. On a worktree of the base commit the same two rows
read 1.4000 and 1.3999 at blends of 0.089 and 0.920 — **at** the bound. So it
is this change's, and it is the arc.

**The mechanism, on `petalTipShape 0.60`.** The window gets 27 rows for
`u` 0.4289 → 1. The merged demand splits it three ways, and the third band is
the arc — 0.0054 wide. The placer's largest-remainder pass hands out
**14 / 7 / 6**, so the two lobe periods carry target gaps of

* 0.3679 / 14 = 0.02628 → **1.471 ×** uniform
* 0.1979 / 7  = 0.02898 → **1.623 ×** uniform

against a cap of 0.025. The blend target is uniform WITHIN EACH BAND, so
`mix(0)` IS that target: no blend is admissible, the bisection converges to 0,
and **the emitted ladder is the over-cap target itself.**

**THE CLAMP CANNOT BE FINISHED WHERE IT STARTS, and that is the finding rather
than the bug.** What `ladderDemand()` can see is `ladderWindowCapacity` — the
rows the window COULD hold, 34 here. What the window GETS is
`max(baseW, the demand)` held at that capacity, and `baseW` is the base
measure's own share of the blade: 27, and it does not exist until `cum` does.
Measured against the capacity the spare read 20 and the clamp never bound.

**What ships.** `bladeStations` now owns the region counts (`regionsFor`) and
the blend target (`targetFor`) as two functions rather than two inline
expressions, and finishes the clamp against the target the bound is actually
decided on: *while the ladder would be inadmissible and the arc holds more
than one row, the arc gives one back.* `ladderDemand()` keeps its own clamp and
adds `yieldAt`, which names the band that may lose rows — nothing else yields,
because the lobes' floor is session 38's ruled resolution floor read through
session 41's per-shape table while the arc's count is reported and
deliberately not asserted. It bottoms out at ONE row, which is what the
buckle's frequency ceiling already hands it.

**IT CANNOT FIRE ON A ROW THAT WAS GOING TO PASS, by an inequality rather than
by observation.** Band *b* of the PLACED ladder spans the same `u`-interval
with the same count as band *b* of the target, so its widest gap is at least
the target's average: `widest(out) ≥ widest(target)`, and a placement inside
the bound therefore has a target inside it too.

**Measured over the live matrix — 920 rows, both modes, every layer, 2,484
rings: 4 move, and they are the four that were red.**

| ring | widest before | after | blend | sub-regions |
|---|---|---|---|---|
| `x petalTipShape 0.60` E / L | 1.5829 × | **1.4000 ×** | 0 → 0.1343 | 14/7/6 → **16/8/3** |
| `x petalTipShape 3.00` E / L | 1.4159 × | **1.4000 ×** | 0 → 0.2180 | 17/9/6 → **18/9/5** |

The two modes agree on both rows, which is the mode-free property row
placement has to have. **Neither row's triangle count moves (24,688 on both
trees) and neither row's census moves** — 0 within-shell pairs, 4,544 and
4,144 cross-shell, worst span 0, measured on a worktree of `0606ace` and on
this tree by `node tools/bloom-census-sweep.mjs --only`. Nothing is owed to
`SELF_INTERSECTION_XFAIL`.

**And the arc's own count is where it is told**: the read-out's APEX NIB line
reads the rows past the law's crossing off the EMITTED stations, never off the
demand, so a yield is already in the sentence it prints.

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

## 6d. THE EXCLUSION WAS 35x TOO WIDE AND HID §18a's OWN HAZARD — CI caught it

**This is the most important thing in this document.** §6b's exclusion was
written as "the last SHEET THICKNESS of blade" — a length derived from a
length, which is the right instinct and the wrong length. On the shipped
1.2 mm sheet over a 35 mm blade that is **`u >= 0.9657`**, while the nib on
`petalTipShape` 3.00 begins at **`u 0.99943`**. Thirty-five times too wide.

**WHAT SAT IN THE GAP WAS SESSION 32 §18a's OWN RECORDED FINDING.** Measured,
both trees, by an instrument that knows nothing about the nib:

| | base tree `2464d50` | this tree, WIDE exclusion | this tree, NIB-ONLY |
|---|---|---|---|
| `petalCup 1.2 x petalTipShape 3.00` | **0.8315 at u 0.9858** | **1.5999** | **0.7543 at u 0.9850** |
| `petalCup 1.2 x petalTipShape 2.50` | 0.9765 at u 0.9879 | 1.5848 | 0.8643 at u 0.9851 |
| `petalCup 1.2` alone | 1.0310 at u 1.0000 | 1.3551 | 1.0662 at u 0.9830 |

The hazard is at **the same site**, and under the nib it is slightly **WORSE**,
not fixed. Under the wide exclusion the combination gate reported **five
declared `COMBINATION_XFAIL` cells as CLEARED** and the natural next step
would have been to delete their entries — shipping a PR that claimed to have
fixed Eva's own §18a finding by not looking at it.

**IT IS THE FIFTH DURABLE RULE AT THE SCALE OF A WHOLE GATE:** a clause that
carves out a subject the failure it doubts is not in cannot fail. What caught
it is **CG2's "a declared hazard that starts passing TRIPS the gate rather
than passing silently"** — #213's own bidirectional rule, in CI, on the first
run of this PR, three minutes in. No green local run would ever have said so.

**THE REGION IS THE NIB AND EXACTLY THE NIB NOW** — `u >= nibFromU`, read off
the builder's own `tipCap.apex`, with `wedgeLenMm` removed from the signature
and from both callers so there is no typed length left in it at all. Above it
the two margins converge to a 0.10 mm mini-face by design; below it the
outline is the law and the two-skin model handles it as it always did.

### What the narrowed measure then cost, all of it declared

* **53 `COMBINATION_XFAIL` magnitudes re-recorded** (#213's ordinary
  obligation), each entry keeping its previous figure in its own note.
* **9 cells genuinely CLEAR and their entries are REMOVED** — `cup-x-buckle`
  and `buckle-x-tipshape` clear entirely, and their CG4 verdicts are
  re-declared PRODUCT-ONLY -> CLEARS. The nib replaces the parallel terminal
  strip those products were closing across.
* **5 cells are NEW under the bar and are declared with both trees' readings**:
  `cup-x-tipshape @ 0.6 x 2.5` (1.026 -> 0.970), `gradient-x-tipshape @ 0.6 x
  2.5` (1.024 -> 0.971), `cup-x-thinning @ 0.6 x 0.4` and `x 0.8` (1.023 ->
  0.960), `cup-x-length @ 1.2 x 20` (1.012 -> 0.994). **Every one was within
  0.026 mm of the bar on the base tree**, and they are the §18a family
  reaching one step further down the cup column rather than a new hazard.
  **#263 predicted the last of them in words**: its own citation reads
  *"measured CLEAR and close: 1.012 mm at cup 1.2 x a 20 mm blade, twelve
  microns of headroom."* The twelve microns are spent.
* **`cup-x-length`'s verdict goes CLEARS -> PRODUCT-ONLY** for that reason.
* The gate closes at **74 cells under the bar, 74 declared, across 15 pairs**,
  and its `--control` passes: *every clause fired on a plant that names it.*

### A V4 xfail, and its mechanism is the ladder rather than the sheet

`buckle A=0.30 x f=3 x p=6` was **the worst asserted state before this change
and already close: 0.108 mm of the buckle's own wall cost against a 0.12 mm
bar** on the base tree. Here it reads **0.142** — same site (u 0.98, |v| 0.56),
18% past a bar it had 10% of headroom under.

**THE MECHANISM IS MEASURED, NOT INFERRED.** The nib asks `ladderDemand()` for
six stations across an arc 0.05 mm long, so the stations just BELOW the nib
move apart: the two gaps bracketing u 0.98 read **0.4191 and 0.3338 mm on the
base tree and 0.5715 and 0.5670 mm here** — 1.4x and 1.7x coarser — while the
arc's own six sit 0.0073 to 0.0088 mm apart. `trueNormalRows` builds the
buckled normal as a cross product against the NEIGHBOURING ROWS, so it is a
LATTICE quantity, and coarser rows give a worse normal. **It is session 32's
own apex/buckle trade arriving in a second instrument.** Declared with its
magnitude (#213), the bar not widened and `APEX_ARC_ROWS` not trimmed to make
a gate green. **What would settle mesh against geometry is a refinement pair
on this state**, which this instrument has no mode for and which
`buckle-on-form` got by hand — scheduled, not taken.

### And two instrument defects the re-record surfaced

**(i) THE COMBINATION GATE'S `--root` WAS NEVER PARSED.** `run()`, `verify()`
and `control()` have all taken a `root` since #263, and #265's doc describes
the flag as the control on the MEASURED side — *"measure ANOTHER tree's
geometry against THIS tree's list"* — but the CLI read `--only` and
`--control` and nothing else, so **`--root <worktree>` silently measured THIS
tree and reported it as the other one's.** That is the worst shape an
instrument defect takes: it answers plausibly, about the wrong thing.
**Caught by disbelief rather than by a clause** — a base-tree run came back
with the BRANCH's own figures to the third decimal (the flat default's self at
1.238 where the base tree's own gate reads 1.246). Fixed, and the run now
prints which tree the geometry came from; with it working, `--root` reproduces
the base tree's grid exactly (1.246 / 1.178 / 1.023 / 0.984 / 0.924 on
`cup-x-thinning`, to the third decimal).

**(ii) THE V4 RECORD CONTROL PERTURBED EVERY XFAIL ROW WHILE ASSERTING THAT
EXACTLY ONE CLAUSE FIRES.** That was the same thing while exactly one row
carried a V4 xfail; the moment this session declared a second it fired two and
the control FAILED on a tree that is right. It names its row now, the way its
`selfXfail` sibling already did, and refuses a name that carries no xfail.
**A control whose expectation is hard-wired to a count the tree can change is
the same shape as a clause whose subject silently moves** — and it is the
third instance in this session, after AN0's guard and AN3's.

---

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

## 7b. What the nib did to the sepals (Eva's ask)

**EVERY SEPAL GETS THE NIB, AND THERE IS NO SECOND OWNER.** A sepal is the
petal builder on a second ring: `sepalBladeState` hands `buildPetalInto` the
sepal's own substate and `widthProfile` calls `apexNibPlan` on it exactly as it
does for a petal. Nothing about the sepal is exempted and nothing about the
sepal is special-cased — which is the reason to measure it rather than to
assert it, because a feature that reached the petal and not the sepal would
draw a perfectly plausible flower with two different apexes on it.

**IT GAINS PROPORTIONALLY MORE THAN THE PETAL, AND THAT IS THE WIDTH QUESTION
AGAIN.** §1's finding is that the stub's share is decided by where
`(W/2)·f(u)` meets `TIP_HALF_MM`, so a blade that is scaled DOWN meets the
floor sooner and spends more of itself flat. `sepalScale` scales both the
length and the width, so a sepal is exactly that blade. Measured, EXPORT, at
the shipping defaults with `sepalCount` 8 (`sepalScale` 0.60 × `petalLength`
35 = 21 mm asked):

| | asked | `uLaw` | flat stub TODAY | slope | cap | arc | radius | drawn | overshoot |
|---|---|---|---|---|---|---|---|---|---|
| petal | 35.000 | 0.9924 | 0.266 mm (0.76%) | 1.7673 | 0.3891 mm | 0.0496 | 0.4061 | 35.124 | +0.124 (+0.35%) |
| **sepal, shipped 0.60** | 21.000 | 0.9818 | 0.382 mm (1.82%) | 1.2215 | 0.5586 mm | 0.0674 | 0.3157 | 21.177 | **+0.177 (+0.84%)** |
| sepal at scale 0.20 | 7.000 | 0.8749 | 0.876 mm (**12.5%**) | 0.4964 | 1.3270 mm | 0.1183 | 0.2233 | 7.451 | **+0.451 (+6.4%)** |
| sepal at scale 1.00 | 35.000 | 0.9924 | 0.266 mm | 1.7673 | 0.3891 mm | 0.0496 | 0.4061 | 35.124 | +0.124 |

Three things fall out and each is a check on the law rather than a
coincidence. The cap is the stub PLUS the overshoot to the double (0.382 +
0.177 = 0.559; 0.876 + 0.451 = 1.327; 0.266 + 0.124 = 0.390), which is what
says the cap replaces the flat and does not sit beside it. **At `sepalScale`
1.00 the sepal's nib is the petal's to every digit**, which is the
"the sepal foot IS the petal foot" identity arriving at the other end of the
blade. And the smallest sepal is where the feature is worth the most: 12.5% of
a 7 mm blade was a 1.60 mm flat face, and the same shape now ends on 0.10 mm.

**THE ANGLE LIMIT DOES NOT MOVE, AND NEITHER DOES A TRIANGLE COUNT.** The
sepal's limit is DRAWN — a 1-degree scan of the sepal's own lamina against
every petal's, in both modes — so a longer drawn blade could in principle
reach a petal sooner. Measured on both trees over six states covering the
phase, the whole scale range, a cupped corolla and the crowded corner:

| state | limit, TODAY | limit, FULL ROUND | contact | triangles |
|---|---|---|---|---|
| `sepalCount` 8 (shipped) | 21° | 21° | 22° crossing | 49,184 both |
| + `sepalPhase` 0 (aligned) | 24° | 24° | 25° coincident | 49,184 both |
| + `sepalScale` 1.00 | 21° | 21° | 22° crossing | 49,184 both |
| + `sepalScale` 0.20 | 90° | 90° | none | 49,184 both |
| + `petalCup` 1.2 | 31° | 31° | 32° above | 49,184 both |
| 40 × 40 × size 1 × ALIGNED × 90 asked | 22° clamped | 22° clamped | 23° crossing | 245,152 both |

**0 of 6 disagree.** 0.177 mm on a 21 mm blade is not enough to move the
scan's own 1-degree step, and the nib adds no lattice row to the sepal any
more than it does to a petal — the cap re-parameterises the rows it already
had, so the count is a re-triangulation of nothing. **SP5 is the one sepal
clause that had to move**, and it moved for the same reason C1 did: it read a
sepal's BUILT length against `petalLength × sepalScale`, which is the ASKED
length, so it fired on every sepal row the moment the drawn length overshot.
It reads `askedLength` now, which the builder reports beside the drawn one.

**WHAT THIS IS BLIND TO, declared:** the limit table is a LIMIT comparison, not
a census — it says the scan lands on the same degree, not that no pair moved.
The census's own answer for the sepal rows is in §9b, where **nine of the
thirteen `SEPALS:` entries** re-record with the rest and four hold.

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

**RUN, AND ALL SIX BEHAVE**: *"each selected family fires on a mutation that
names it, and is silent on the clean tree"* — AN0 on `the-nib-is-never-cut`
(which also reddens A4, L3-L6, L8 and SP8) and on
`the-squared-terminal-no-longer-stands-the-nib-down` (AN0 alone), AN1 on
`the-flank-is-not-the-laws-tangent` and `the-arc-is-not-tangent-to-the-flank`,
AN1+AN2 on `the-law-is-cut-above-its-own-crossing`, AN3 on
`the-nib-ends-on-the-print-floor`. Reported as a SUBSET (6 of 72), never as a
sweep.

**THE ANCHOR PRE-CHECK EARNED ITS KEEP IMMEDIATELY**: `§6c` added `gridFloor`
to `slope` AFTER `the-flank-is-not-the-laws-tangent` was written, so its
`find` matched **0 times** and the pre-check refused the run before any mutant
executed — which is exactly why it runs over ALL 72 rather than the selected
ones. Re-anchored onto the quantised form, with the grid KEPT on both sides,
because a mutation that dropped the quantisation too would be testing two
things and AN1 could not say which.

**AND ONE WITNESS WAS ASKING A NARROWER QUESTION THAN ITS MUTATION, WHICH IS A
FINDING ABOUT THE GEOMETRY.** `the-squared-terminal-no-longer-stands-the-nib-down`
reported *"the edit applied but the BEHAVIOUR did not move"* on a live
mutation. It had asked whether the nib becomes ACTIVE; it does not. On a 0.30
squared terminal at the default width the terminal is 2.40 mm and the outline
is CONSTANT over `[uPk, 1]`, so with that guard removed the bisection finds no
crossing, `uLaw` lands on 1, the one-sided tangent there is 0 and **the NEXT
guard refuses — for the wrong reason.** So the squared-terminal guard is
load-bearing for the REASON rather than for the outcome on that row, and what
catches its removal is AN0's clause that a ring reporting *"the law arrives
with no slope to carry on"* is a FINDING (§4: that guard fires on no row of
the shipped matrix). The witness compares the plan's `why` as well as its
`active` now.

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

## 9b. The declared census magnitudes, re-recorded

The nib truncates the law at the print floor and closes it on a tangent flank
and an arc, so the outline moves on **every row whose blade clears that
floor** — which is nearly all of them. `node tools/bloom-xfail-magnitudes.mjs
--emit` re-measured the list, and the result is the ordinary #213 obligation
at an unusual scale:

| | count |
|---|---|
| re-recorded, previous figures kept in each note | **153** |
| — reading WORSE | 74 |
| — reading better | 65 |
| — span moved, pair count unchanged | 17 |
| unmoved | 76 |
| **removed** (now read ZERO) | **3** |
| **added** (NEW with the nib) | **2** |
| carried forward unmeasured (`ALL MAX`, export-refused) | 1 |

**THE THREE REMOVALS ARE A FIX, AND THEIR OWN NOTES SAID SO.** All three were
introduced by the PETAL EDGE PROFILE (#278) and all three folded *"ONE PETAL
AGAINST ITSELF at its own TIP — u 0.982..1.000"*, which is precisely the
stretch of blade the nib replaces. X1 fails hard on a declared row that starts
passing, which is what distinguishes a fix landing from a record going quietly
stale.

**THE TWO ADDITIONS ARE THE NIB'S OWN, measured on both trees**: `ORCHID: the
labellum and the hood x 2 whorls in step` and `FAN x PER-PETAL: petal 1
extreme x toggle OFF` each read **0 pairs on a worktree of the base commit at
an identical triangle count**, and 0.024 mm of span here — a sixth of the live
mesh floor, a fortieth of the print floor, both at the tip, both on states
where a petal already stands close to its neighbour's.

**AND THE CONFIRMATION RUN FOUND THAT BOTH OF THEM WERE RECORDED WRONG, WHICH
IS THE BEST THING IN THIS SECTION.** This project's own rule is that *a
re-record measured in Node is not confirmed until the browser agrees*, so all
158 affected rows were re-run through `verify-bloom-export.mjs --only`:
**6,684 s, 158 attempted, 156 reaching the results and passing X1 at their
re-recorded magnitudes, and 2 DROPPED** — exactly the two rows above.

The block declaring them said *"THE FIGURES ARE CHROMIUM'S, NOT NODE'S ... the
two engines disagree by one pair and by three (Node reads 218 and 354 where
the gate reads 219 and 351)"*, and they were recorded at **219 and 351** on the
strength of it. **Chromium reads 354 and 218 — which is what Node reads.** The
two engines AGREE; nothing in this session ever recorded a run measuring 219 or
351, so it was a reading with no measurement behind it, and it is WITHDRAWN in
the list's own block rather than quietly corrected. Re-recorded at 354 and 218,
re-checked in Node (2 of 2 at their records) and **re-run through the real gate:
PASS, 2 of 2 watertight, X1 silent on both.**

**WHY IT MATTERS THAT THIS WAS CAUGHT RATHER THAN SHIPPED:** X1's band on pairs
is EXACTLY 0, so a declared figure that is not the tree's reddens CI on a tree
that is RIGHT — the same damage as a stale record and harder to read, because
the message says the geometry moved. The sepal session's withdrawn 104,563 is
the same class: *a figure from a run nobody kept is not a measurement.*

**`--emit` EMITTED INVALID JAVASCRIPT FOR EIGHT LABELS, and that is a defect
in the tool rather than in the list.** It took `JSON.stringify`'s double
quotes and swapped them for single ones, which is correct until a label
contains an APOSTROPHE — and eight do (*"the sheet's headline"*, *"the fan's
full-disc hub"*, *"the anther's own default shape"*). The one thing that flag
exists for — *"copy deliberately"* — silently could not be done for those
rows, and a session doing it would have pasted a syntax error into the
harness. Fixed here.

**VS5's CROSS-INSTRUMENT PIN MOVED**, −1.1701 → −1.1944 mm, measured by the
same instrument on the same lattice. The closest approach is at **u 0.323 on
both trees** — mid-blade, nowhere near the tip — so what moved is where the
stations land, not what the petals do to each other.

## 9c. The five worst movers: where each one sits, and why it moved (Eva's ask)

Measured with `node tools/bloom-census-attribute.mjs`, which carries every
within-shell pair the census collects back to the nearest point of the
BUILDER'S OWN captured mid-surface and names the region of the blade it lands
in — the nib's boundary read off each petal's own `tipCap.apex` rather than
restated. Run on both trees. EXPORT mode, the builder's doubles, 56 × 10 per
panel at NU 56; a pair count is a property of the tessellation.

The five worst by ABSOLUTE pair increase, with the ratio and span leaders
beside them because "worst" means three different things:

| row | base | this tree | worst pair sits | in the nib |
|---|---|---|---|---|
| `6 layers x innerCup min (-0.8)` | 297 / 0.2054 | **6542 / 0.2917** | **NIB**, petal 23, u 0.9710, v −0.333 | **6479 of 6542** |
| `6 layers x innerCup max (1.2)` | 3240 / 0.2835 | **8896 / 0.2967** | blade, petal 9, u 0.9776 | 5805 of 8896 |
| `ALL PETALS: max x petalCount 40 x ALL THIN x spread min` | 37560 / 0.4428 | **40080 / 0.4392** | blade, petal 23, **u 0.6809** | 4317 of 40080 |
| `GRADIENT: cup gradient max x cup max x widest petal` | 160 / 0.1371 | **2416 / 0.3788** | **NIB**, petal 7, u 0.9995 | **2394 of 2416** |
| `ZYGO: cup clamp binds` | 160 / 0.1264 | **2144 / 0.3904** | blade, petal 6, u 0.9830 | 1565 of 2144 |
| *(worst by RATIO)* `BUCKLE: over a cupped blade (cup 1.2)` | 48 / 0.1612 | **1887 / 0.4974** — **×39.3** | **NIB**, petal 6, u 0.9986 | **1771 of 1887** |
| *(worst by SPAN)* `petalCup max (1.2)` | 80 / **0.0239** | 1088 / **0.3904** | blade, petal 6, u 0.9830 | 821 of 1088 |

**EVERY ONE OF THE SEVEN IS A CUP ROW, AND THAT IS THE FINDING RATHER THAN A
COINCIDENCE.** Four of the seven put EVERY pair they have, on both trees, in
the top tenth of the blade; a fifth adds 793 pairs in u 0.8–0.9 and none below
it. The band histograms are in the run's own output and the tool prints them
precisely so the two trees can be diffed on a quantity that means the same
thing on a tree with no nib.

**THE MECHANISM IS ONE MECHANISM AND IT IS THE FEATURE DOING WHAT IT WAS BUILT
TO DO.** Today the last stretch of every blade is a PARALLEL STRIP two print
floors across — the two margins running side by side at a constant 1.60 mm.
A cup curls those margins toward each other; over a constant-width strip they
hold a constant separation, and on `petalCup max` they were only just clear
(**80 pairs at 0.0239 mm**, a sixth of the live mesh floor). The nib CONVERGES
that strip from 1.60 mm to 0.10 mm over 0.39 mm of cap, so it brings the two
margins together BY CONSTRUCTION — and a cup already curling them inward now
closes them. **That is the outline moving, at exactly the station the nib
moved it**, and it is the same sentence for all seven.

**NOTHING IS UNEXPLAINED BY THE OUTLINE MOVING — AND ONE ROW NEEDED TWO
EXPLANATIONS, WHICH IS THE PART WORTH FLAGGING.** `ALL PETALS: max x
petalCount 40 x ALL THIN x spread min` is the only one of the seven whose worst
pair is not near the tip and the only one whose **span FELL** (0.4428 →
0.4392). Its +2520 is a NET of two movements in opposite directions:

| band | base | this tree | |
|---|---|---|---|
| u 0.9–1.0 | 4714 | **8331** | **+3617** — the mechanism above |
| every band below it | 32846 | **31749** | **−1097** |

The −1097 is the RE-PARAMETERISATION, which is the outline moving in the
SECOND way this change moves it: `petalLength` is the ASKED length, the drawn
blade is +0.124 mm longer at the shipped exponent, so every station sits at a
slightly different physical place and a fold whose pair count is a property of
the tessellation re-counts. The row's own worst pair says so plainly: **u
0.6809 here against u 0.6803 on the base, same petal, same margin (v −1.000),
0.0006 of `u` apart** — the same fold re-stationed, not a new one, which is
also why its span fell rather than rose.

**SO THE HONEST STATEMENT IS THAT THE OUTLINE MOVES IN TWO PLACES AND BOTH ARE
THIS CHANGE'S**: the cap, at the tip, which accounts for every row above; and
every station's physical place, through the drawn length, which accounts for
the movements below the tip on the one row that has them. **0 of the seven need
a third explanation.**

**THE CARRY-BACK IS SOUND AND ITS OWN NUMBER SAYS SO:** `off-lamina` is 0 on
all seven rows on both trees — every collected pair landed on a petal's
mid-surface — and the reported distances run **0.077 to 0.527 mm**, which is
half a sheet on the states whose sheet is 1.2 mm and half a thin one on
`ALL THIN`. A site on an emitted skin sits `t/2` from the mid-surface by
construction, so that is the healthy reading and not a tolerance.

---

## 9d. The confirmation sheet, with the sepal cell (Eva's ask)

`node tools/shot-bloom-apex-nib.mjs <dir> <base-tree>` — two columns, TODAY
from a worktree of `2464d50` and FULL ROUND from this tree, five rows, every
cell in PRINT PREVIEW, **one camera per row shared by both columns**, centred
between the two tips and widened from the measured gap so the truncation (or
the overshoot) is in the same frame as the shape. **No pixel delta is quoted
anywhere** — two trees, two servers, two page sessions — and every number on
the sheet is read off the builder's own emitted outline.

| row | face TODAY → FULL ROUND | parallel run TODAY → | drawn / asked | triangles |
|---|---|---|---|---|
| **A** the shipping default | 1.6000 → **0.1000 mm** | 0.180 → 0.003 mm | 35.124 / 35.00 | 24,688 both |
| **B** 35×16, tip shape **0.60** | 1.6000 → **0.1000** | **8.253** → 0.013 | **30.051** / 35.00 | 24,688 both |
| **C** tip shape **3.00** | 1.6000 → **0.1000** | 0.121 → 0.000 | 35.012 / 35.00 | 24,688 both |
| **D SEPALS**, the shipped whorl | 1.6000 → **0.1000** | 0.210 → 0.006 | 21.177 / 21.00 | 49,184 both |
| **E** a lobed rim (0.30 × 3) | 1.6000 → **0.1000** | 0.272 → 0.003 | 35.124 / 35.00 | 24,688 both |

**THE SEPAL CELL IS THE ONE THAT COULD NOT BE ARGUED, ONLY SHOWN**, and it is
framed FROM ABOVE because `sepalAngle` 0 lays the blade in the hub's own plane
and a face-on camera is straight down. TODAY the sepal converges and then
sticks out a blunt rectangular stub with a flat end; FULL ROUND closes it on a
point. Nothing about the sepal is special-cased to make that happen — it is
the petal builder on a second ring reading its own substate.

**ROW B IS THE DEFECT AT ITS WORST**: 8.253 mm of the blade — 23.6% of it — was
outline running PARALLEL at the print floor, and the drawn blade is 4.95 mm
shorter than the slider asks because the law's own crossing is that far in.
**ROW C IS THE OTHER END**: at tip shape 3.00 the flank is so steep the whole
cap is 0.02 mm and the arc 0.003, and the drawn length moves +0.012 mm.
**THE TRIANGLE COUNT IS IDENTICAL ON EVERY PAIR**, which is the zero-triangle
claim shown per row rather than stated once.

---

## 9e. The byte partition — 877 moved / 32 held, PASS

`node tools/verify-bloom-seam-bytes.mjs --base <worktree of 2464d50> --change
nib --matrix live --added 11 --control --control-mode`:

> **live matrix, change "nib": 909 comparable rows (+11 ADDED on the head,
> outside the partition), both modes, 1,145,824,416 floats compared
> positionally under `Object.is`**
> **MOVED 877   HELD 32   REDEFINED 0**
> the MOVER SET is exactly as the base tree's builder record predeclares it,
> **in both directions**
> triangle counts unchanged on every row but the 12 declared
> the FOOT is identical on every row: **6,580,602 captured foot values**
> **PASS**

**MEASURED ON `0606ace`, AND THE ARC'S YIELD (§5) DOES NOT DISTURB IT.** That
fix moves the stations on two rows which are already in the 877, and moves
nothing anywhere else — 4 of 2,484 rings over the whole matrix in both modes —
so the mover set, the holder set and the REDEFINED count are the same three
answers. The float total is unchanged too, because it is a function of the
triangle counts and neither row's moves (24,688 on both trees). Verified on
this head as its own claim by
`node tools/verify-bloom-surface-bytes.mjs --base <worktree of 0606ace>
--movers 'petalTipShape (0\.60|3\.00)' --control`, which is the tighter
statement: those two rows move and **every other row in the matrix holds to
the bit**.

`nib` is the FOURTH change to ride in that tool and the first that is neither
a ladder change nor inert at the defaults. The predicate is the nib's own
guard restated over two numbers the BASE tree reports — a blade whose peak
clears the print floor with no squared terminal holding it above — with the
floor IMPORTED (`TIP_HALF_MM`) and checked equal on the two trees, and both
`petalsAll` and `sepals.built` read, because a sepal cuts its own nib.

**THE 32 HOLDERS ARE ONE CLASS AND A HALF, AND EVERY ONE IS EXPLAINED.**
Thirty-one have a SQUARED TERMINAL holding the outline above the print floor
— all 29 `FRINGE:` rows, `petalTipEnd max (1)` and `VARIANCE: x the FRINGE`
— which is #229's guard and the inert-by-branch claim measured rather than
argued. The other two are `SPHERE STEM: THE BARE CORNER` and `SPHERE STEM: THE
TWO CLOSURES MEET`, where a 12 mm stem on the smallest sphere takes **every**
petal, so there is no blade for a nib to cut. **`ALL MAX` is a MOVER** —
through its forty sepals, never its petals (§10).

**THE TWELVE TRIANGLE-COUNT MOVERS ARE DECLARED AND ARE TWO MECHANISMS**, and
the table is IDENTICAL in both modes on every one of them, which is the
mode-free-topology claim showing up where it would break first:

* **Seven are `trimPanels()`** — a cleft splits the blade at a ROW INDEX, so
  any ladder change moves the split. This change reaches more cleft rows than
  `seam` (1) or `widest` (3) did, because the arc's resolution demand applies
  on EVERY nibbed row rather than only where a floor or a bound binds.
* **Five are the RIM BEAD'S OWN DEGENERACY SKIPPING**, which is worth naming
  because it is not the ladder. Those rows carry a bead PIVOT of **3.5e-4 mm**
  at the blade's terminal corner on the base tree — measured on `BUCKLE: f min
  (1)`: **0.00035 against the shipping default's 0.28387** — so the rim strip
  there is degenerate and `emitPanel` skips it, which is why their counts sit
  **48 BELOW** the default's 24,688 on the base and ON it here. The nib's
  converging cap gives that corner a real width, the strip is drawn, and the 48
  come back. #278's own *"count-safe by branch"* floor, seen from the other
  side.

**AND THE TOOL OWED A DECLARATION IT DID NOT HAVE.** Its shipping-default
clause read *"every ladder change here holds it by construction and the
stations must be bit-identical"* — true of `seam`, `widest`, `arc` and `tilt`,
and FALSE of this one, which is a BOUNDARY change that is ACTIVE at the
defaults. A clause asserting otherwise asserts that nothing may ever ship that
moves the shipping bloom. It is a table now (`DEFAULT_HOLDS_BY_CHANGE`), each
change carrying the REASON its default holds, and `nib` declaring `null` for
"it moves by design" — **with the converse asserted too**: a `nib` run whose
default did NOT move is a finding, because it would mean the change does not
reach the shipping bloom at all.

**BOTH CONTROLS FIRED**: `--control` perturbs a HOLDER by 1e-9 and it is
reported MOVED (*"the held class can fail"*), and `--control-mode` reclassifies
the default and the mode clause reports it exactly once.

---

## 9f. THE 36 UNDECLARED ROWS — ONE MECHANISM, AND THEY AWAIT A RULING

The export gate dropped **38 rows of 920**: 2 on A8 (§5, fixed) and **36 on X2,
"a NEW self-intersection, not one of the 232 declared"**. X2 rides in the
EXPORT gate only, which is why `bloom-connectedness` saw two drops and this
saw thirty-eight.

**WHY THE PR'S OWN RE-RECORD DID NOT CATCH THEM.** `bloom-xfail-magnitudes.mjs`
sweeps the rows that are DECLARED and re-records what moved; a row with no
entry is not in its subject. The instrument that answers "which rows are
non-zero" is `bloom-census-sweep.mjs` over the whole matrix, and it had been
run only over the moved subsets. **A magnitude re-record is not a census.**

### Identified, and confirmed in the browser rather than inferred

`node tools/bloom-census-sweep.mjs --shard i/4` over all 920 rows on THIS tree
(after the A8 fix, because a ladder move moves the census) finds **exactly 36
undeclared non-zero rows** — the same 36 the gate dropped, no more and no
fewer. `node tools/verify-bloom-export.mjs --only <those 36>` then measured
them in Chromium: **36 of 36 agree with Node on the pair count to the integer
and on the worst span to four decimals.** Nothing here rests on a Node-only
reading.

### All 36 read EXACTLY ZERO on main's geometry, at an identical triangle count

Measured with `--geom <worktree of 2464d50> --harness .`, so the matrix and the
control sets are this branch's and only the geometry is main's: **36 of 36 read
0 pairs / 0.0000 mm there, and every one has the same triangle count on both
trees.** These are folds the nib introduces, not folds it made worse.

### The mechanism is ONE mechanism and it is §9c's

`node tools/bloom-census-attribute.mjs` carries every collected pair back to the
nearest point of the builder's own captured mid-surface and names the region:

> **17,908 of 18,497 pairs (96.8%) are IN THE NIB. 29 of the 36 rows are 100%
> nib; the other 7 have a remainder in the blade immediately below its entry
> (6 to 235 pairs). Every row's pairs lie in the band u 0.9–1.0, and the worst
> pair sits at a MARGIN (v = ±1.000) on every row but two.**

That is §9c's sentence, arriving on rows that had no entry: the last stretch of
every blade used to be a PARALLEL STRIP two print floors across, the nib
converges it from 1.60 mm to 0.10 mm, and a blade whose margins are already
curling toward each other closes them. **What every one of the 36 has in common
is a CUP** — `petalCup`, `petalCupGradient`, `allCup`, `labellumCup`,
`hoodCup`, the nine `petalNCup`, `sepalCup`, `sepalCupGradient`, ORCHID (which
is cup and curl deltas), `FORM: REFLEXED`, and the IRIS. There is no second
class.

**AND BOTH SIGNS OF CUP DO IT**, which the §9c note did not say: `petalCup min
(-0.8)` (912 pairs) and `petalCupGradient min (-0.8)` (912) fold as readily as
`petalCupGradient max (1.2)` (1,088). A reflexed blade curls its margins the
other way and the converging nib closes them on the other side.

### The worst ten, measured

| row | main | branch | worst span | in the nib |
|---|---|---|---|---|
| `VARIANCE: x the IRIS at 2 whorls` | 0 | **1,522** | 0.4193 mm | 100% |
| `petalCupGradient max (1.2)` | 0 | 1,088 | 0.3363 | 78.4% |
| `LOBES: x cup 1.2` | 0 | 1,056 | 0.1610 | 78.7% |
| `SEPALS: angle 90 on a CUPPED corolla` | 0 | 920 | 0.0267 | 100% |
| `petalCup min (-0.8)` | 0 | 912 | 0.0505 | 100% |
| `petalCupGradient min (-0.8)` | 0 | 912 | 0.0481 | 100% |
| `FORM: REFLEXED` | 0 | 912 | 0.0490 | 100% |
| `ALL PETALS: min` | 0 | 912 | 0.0490 | 100% |
| `GRADIENT: cup gradient max x ALL THIN x spread min` | 0 | 904 | 0.4069 | 93.9% |
| `SEPALS: sepalCup min (-0.8)` | 0 | 600 | 0.3699 | 92.7% |

### NOTHING IS DECLARED, AND TWO OF EVA'S INSTRUCTIONS ARE WHY

**`LOBES: x cup 1.2` is labelled *"over a fold declared on main — must not gain
a new one"* and it gains one: 0 -> 1,056 pairs, 831 of them in the nib and 225
in the blade just below, worst at u 0.9986 on a margin.** Eva's instruction is
explicit — do NOT declare it, report it with its mechanism and stop. That is
this section.

**The three SEPALS cup rows ARE the §9c mechanism and not something else**, which
was the other thing asked: `sepalCup min` is 556 nib + 44 blade with its worst
pair at u 0.9968 v -1.000 on SEPAL 3 (a sepal is the petal builder on a second
ring, so it cuts its own nib and meets its own converging tip);
`sepalCupGradient min` is 560 + 15 at u 0.9968 v -1.000 on sepal 4; and
`SEPALS: angle 90 on a CUPPED corolla` is 920 of 920 in the nib — that one is
the COROLLA's own petals, not the sepals, and the sepal angle is not in it.

The remaining 32 are the same class and are not declared either, because the
class is one ruling rather than thirty-two.

---

## 9g. THE CUP AT THE NIB — the hypothesis is REFUTED, the mechanism is measured, and a fix is prototyped

Eva's ruling on §9f named a hypothesis to test first: that the cup deformation
reads `halfWidthBaseAt` — the PRE-NIB width — so that inside the nib it curls
the margins as if the blade were still full width.

**IT IS REFUTED, AND IT IS AN IDENTITY RATHER THAN A CLOSE CALL.** `shapeAt`
IS `shapeBaseAt` whenever there are no lobes (`bloom-geometry.js`'s own
`const shapeAt = (lobes === null || lobes.noRoom) ? shapeBaseAt : …`), and
`halfWidthBaseAt` carries the nib's floor branch exactly as `halfWidthAt`
does. Measured on the emitted rows of `petalCup min (-0.8)`, EXPORT:
`hb === h` reads **true on every row of the blade including every row of the
nib** — the same double, not merely the same value. **The cup reads the DRAWN
half-width, which is what it should read.**

**WHAT ACTUALLY FOLDS IS THE CURVATURE, AND IT IS THE SAME TERM.** `sectAt`'s
cup lift is `c·a²/hb` with `a = h·v`, so the mid-surface cross-section leaves
the midrib with curvature `2c/hb` and radius `hb/(2c)`. A sheet is that
surface offset by ±t/2, and **an offset surface inverts wherever the offset
exceeds the radius**. The radius is therefore proportional to the half-width,
and the nib draws the half-width down to `APEX_END_HALF_MM` = 0.05 mm. So:

| `petalCup min (-0.8)`, EXPORT | u | h (mm) | R = hb/2c (mm) | R / (t/2) |
|---|---|---|---|---|
| on the law | 0.982963 | 1.12434 | 0.70271 | 1.1712 |
| nib, first row | 0.998577 | 0.20070 | 0.12544 | **0.2091** |
| nib, last row | 1.000000 | 0.05000 | 0.03125 | **0.0521** |

against a half-thickness of 0.6000 mm — **five to nineteen times inside the
fold condition.** Main never reached it because main's outline STOPPED at the
0.80 mm floor: the same row on a worktree of `2464d50` reads 0.9956 and 0.8333
at its last two rows, i.e. only just inside, and reads **0 census pairs**.

So Eva's conclusion was right and her mechanism was not: **the cup is the
thing folding, and the lever she proposed is the correct one** — but "scaled
by the drawn half-width" is a no-op, because that is already what happens.

### The prototype

`cupScale` in `rowAt`, passed to `sectAt` as a seventh argument defaulting to
the exact double 1 (so every other caller and every row off the nib is
bit-identical — `x * 1` is exact in IEEE-754):

    const cupScale = profile.onNib(u) ? hb / TIP_HALF_MM : 1;

**IT IS DERIVED FROM TWO LENGTHS AND HAS NO SHAPE OF ITS OWN.** The nib's
entry is BY CONSTRUCTION the station where the law crosses `TIP_HALF_MM`, so
the factor is exactly 1 there and the blade below the entry is untouched to
the bit — Eva's constraint, met structurally rather than by a tolerance. Above
it the curvature is `2·(c·hb/T)/hb` = `2c/T`, **constant across the whole
nib at the value it already had at the entry**: measured, `petalCup min` reads
R/(t/2) = 0.8333 on every nib row, which is main's own last-row figure to four
decimals.

**IT READS `hb`, NOT `h`, AND THE FIRST CUT READ `h`.** On a lobed row the
drawn width oscillates with the lobe period, so a scale built on `h` would
step the cup's amplitude at every sinus and the true-normal offset would turn
each step into a wedge — session 38's own buckle finding arriving in the cup
one feature later. Measured over all 36 rows the two forms are identical to
the integer, so nothing on this matrix distinguishes them; `hb` is kept
because it is the rule every other law in `sectAt` obeys, and that is stated
rather than claimed to have been measured.

### What it clears, and what it does not

**30 of 36 clear to exactly 0 within-shell pairs; total 18,497 → 2,185 (−88%).**
Six remain:

| pre-fix | post-fix | worst span | row |
|---|---|---|---|
| 1,088 | 288 | 0.3363 → 0.5850 | `petalCupGradient max (1.2)` |
| 904 | 80 | 0.4069 → 0.3699 | `GRADIENT: cup gradient max x ALL THIN x spread min` |
| 600 | 71 | 0.3699 → 0.2060 | `SEPALS: sepalCup min (-0.8)` |
| 592 | 44 | 0.3684 → 0.2385 | `SLOT: ALL MIN x 2 whorls in step` |
| 343 | 14 | 0.2842 → 0.4649 | `FAN x PER-PETAL: petal 1 x 3 layers x inner*` |
| **1,056** | **1,688** | 0.1610 → 0.1601 | **`LOBES: x cup 1.2`** — WORSE |

**THE RESIDUE IS IN THE BLADE BELOW THE NIB ENTRY, WHICH THE FIX IS SCOPED
NOT TO TOUCH.** Attributed on the fixed tree: `SEPALS: sepalCup min` is
71 of 71 in the BLADE at u 0.9728 against a nib entry at 0.9889;
`petalCupGradient max` is 220 blade / 68 nib; `FAN x PER-PETAL` is 9 / 5. And
the reason is the same law read one station lower — on `petalCupGradient max`
the row at u 0.982963 already reads **R/(t/2) = 0.7943 on the law itself**,
with no nib involved, and on `LOBES: x cup 1.2` the rows at u 0.9784 and
0.9863 read 0.9254 and 0.6634. Under Eva's constraint those are unreachable by
construction.

**AND IT IS NOT THE ARC'S SIX ROWS — that was tested and refuted.** The rows
just below the nib ARE about twice as far apart on the branch as on main
(0.5157 / 0.4706 / 0.4276 / 0.3867 mm against 0.2531 / 0.2062 / 0.1625 /
0.3594), which is the V4 xfail's own mechanism and the obvious suspect. But
cutting `APEX_ARC_ROWS` from 6 to 1 on a scratch tree makes every one of the
six **worse**, not better — 288 → 1,720, 80 → 1,616, 71 → 1,055, 44 → 449,
14 → 543 — so fewer rows near the tip is the wrong direction and the arc's
demand is not the cause.

### What the fix costs

* **ZERO TRIANGLES**, measured on both trees in both modes: the shipping
  default 24,688, row C 24,688, `petalCup min` 24,688, `SEPALS: sepalCup min`
  39,998, `LOBES: x cup 1.2` 24,688 — identical to the integer either side.
  It is a boundary-free surface change on a fixed lattice.
* **THE EXPORT CENSUS IS CLEAN ON EVERY ROW THAT REACHES IT**: the gate run on
  nine affected rows reads `boundary=0 degenerate=0 nonManifold=0` with
  `tris(live) === tris(export)` on all three that pass, and drops exactly the
  six survivors on X2.
* **NOTHING VISIBLE.** `docs/img/cup-at-the-nib.png` (`node
  tools/shot-bloom-cup-nib.mjs <dir> --nofix <worktree>`) is Eva's three rows
  against two columns, print preview on, tip close-ups: the nib, the section
  edge on, and the last quarter of the blade. The two columns are
  indistinguishable at every cell, which is what a change confined to the last
  1.1% of the blade should look like. **The sepal cell's frame is the
  PETAL's** — the camera is aimed at the builder's `petalTip`, which has no
  sepal equivalent — so that row's evidence is its census, not its picture,
  and the sheet says so on its own face.

### The byte partition — RUN, AND IT DID NOT CLOSE; THE PREDICATE IS WRONG IN BOTH DIRECTIONS

Predeclared from the BASE tree as *a row moves iff some built petal or sepal
has a nib AND a non-zero cup coefficient on it*: **98 movers / 822 holders.**
Run over a 190-row subset (all 98 movers plus every ninth holder, 92 of them,
so the sample walks the whole matrix rather than one block of it):
`verify-bloom-surface-bytes --base <worktree of the pre-fix head>` reads
**204,206,148 export floats over 22,689,572 triangles and 15,175,518
captured-grid values, and FAILS with 14 findings** — **96 of 98 declared
movers moved.**

**THE FAILURE IS THE PREDICATE'S, NOT THE FIX'S, AND IT BREAKS BOTH WAYS.**

* **Three HOLDERS moved** — `SLOT: labellumCup min (-0.8) x 2 whorls in step`,
  `SLOT: hoodCup max (1.2) x 2 whorls in step` and `SLOT: ALL MAX x 2 whorls
  in step`, 6,732 / 6,846 / 13,788 floats of 442,656 in both modes. **Cause
  established exactly**: on the first of those the per-petal `p.form.cup`
  record reads **0 on all sixteen petals** although the labellum's own cup is
  -0.8 — the SLOT ROLE OVERRIDE does not reach the record the predicate read.
  The predicate asked a record that is not the quantity under test, which is
  the fourth durable rule turning up in a predeclaration instead of in a
  clause. Those three are legitimate movers wrongly called holders.
* **Two declared MOVERS held to the bit** — `DOME: the INCURVE TARGET, flat`
  and `x rise 0.5`. **Cause NOT established.** A probe says 120 of 120 petals
  on that row carry both a nib and a non-zero cup, so "no nib" and "no cup"
  are both ruled out; what is not ruled out is that `profileU` and the
  parameterisation `onNib` takes are not the same `u` (`toLaw(v) = v * drawn /
  asked` is where the two meet), so the probe's station count may not be
  `onNib`'s question. Recorded as an open thread rather than guessed at.

**So the partition is NOT closed and is not claimed to be.** What it does
establish is that the fix moves the rows it is meant to move (96 of 98) and
that 89 of 92 sampled holders are bit-identical. The predicate has to be
rebuilt to read the EMITTED stations — whether any station of any built part
has `cupScale !== 1` — rather than the plan, and re-run over the full 920
rows, before this could merge.


### NOTHING IS DECLARED

Per Eva's instruction, no `SELF_INTERSECTION_XFAIL` entry is added or moved by
this section, and `LOBES: x cup 1.2` — the row labelled *"must not gain a new
one"* — is reported rather than declared. It gains one either way: 1,056
pre-fix and 1,688 post-fix, against **0 on main's geometry at an identical
triangle count**.

## 9h. THE FOLD CLAMP, AND EVA'S FOUR RULINGS

### The four rulings, in the order they were made

1. **The arc's yield ships as measured** (§5's subsection) — the apex arc gives
   a row back to the lobe periods while the ladder would be inadmissible.
2. **The cup scale on the nib ships as prototyped** (§9g) — `cupScale =
   onNib(u) ? hb / TIP_HALF_MM : 1`, exactly 1 at the nib's entry.
3. **The fold clamp ships at margin 1.25**, with the 24 touched rows that read
   0 on main an accepted cost, and the `CUP CLAMPED` read-out line part of it.
4. **`LOBES: x cup 1.2` is split out** to issue #285 and declared as an
   authored exception at 1,104 pairs / 0.1095 mm.

### The clamp

`|c| <= hb / (FOLD_CLAMP_MARGIN * t)`, so the mid-surface's radius of
curvature never falls below `margin * t/2` and the sheet always has an offset
surface. **The margin is 1.25 and the argument is the inner skin**: at
`margin * t/2` the inner skin's own radius is `(margin - 1) * t/2`, so it
keeps `1 - 1/margin` of the mid-surface's spacing — a fifth at 1.25, where a
margin of exactly 1 leaves it at a cusp and a margin of 2 (`R >= t`) binds on
six of main's own last eight stations.

**BIT-IDENTITY IS BY BRANCH, NOT BY AN ARITHMETIC MIN**, which is the same
kind of argument as the nib factor being exactly 1 at its entry: where the cap
does not bind, `Math.abs(cRaw) <= cCap ? cRaw : ...` evaluates to `cRaw`
ITSELF, the same double, with no multiplication to round. The shipping default
and a gentle cup report `not clamped`.

**IT IS TOLD.** `cupClampLine` prints `CUP CLAMPED at u ..., asked radius X,
drawn Y` in the `(CLAMPED)` discipline the roll floor and the spine curl
already use, over every built petal AND every built sepal.

**FIVE OF THE SIX SURVIVORS CLEAR TO EXACTLY 0**, at every margin from 1.00 to
1.50 (totals 1,360 / 1,288 / 1,104 / 1,024 — the residue is one row at every
value). Triangle counts are identical on every row in both modes. The clamp
touches **102 of 920 rows**, asked radii 0.167 to 1.394 mm; of the 91 of them
measured on main's geometry, **67 already fold on main and 24 read 0** — those
24 are the accepted cost.

### AND THE THING THAT BLOCKED IT WAS MY OWN PROBE, IN BOTH DIRECTIONS, WITH ONE CAUSE

The byte partition failed with three holders that moved and two declared
movers that held, and §9g recorded the second as *not established*. Both are
the same defect and it is not in the geometry:

**A MATRIX ROW'S VALUES ARE STRINGS AND THE GEOMETRY'S GUARDS ARE TRUTHINESS
TESTS ON NUMBERS.** `bloom-census-sweep`'s `stateOf` coerces each value by its
control's own kind; my predicate assigned `row.set`'s raw strings. This file
has carried that trap since the leaf session and I walked into it anyway.

* **The three SLOT holders that moved.** With a STRING cup,
  `petalFormIsFlat` holds and **no form is built at all**, so `p.form` came
  back null on all sixteen petals and the predicate saw nothing. Coerced, the
  same row has **4 petals with a form, a nib, a non-zero cup, and the clamp
  binding on all four** — a genuine mover of both changes.
* **The two DOME INCURVE movers that held.** `(f.cup ?? 0) !== 0` against a
  string `'0'` is **`'0' !== 0`, which is TRUE**, so every row whose cup was a
  string zero was falsely declared a mover. Coerced, those rows have 120
  petals with a form and a nib and `cup != 0` on **zero** of them. They were
  never movers, and the tool was right to fail the run.

**The lesson is not "coerce the state"** — it is that a predeclaration is a
measurement like any other, and a predicate built on a state the geometry
would never build measures nothing. The rebuilt predicate reads what the
BUILDER reports on the state the SWEEP builds: **117 movers / 803 holders**
against the broken 98 / 822, with 21 rows added and exactly the 2 DOME rows
removed.

### `LOBES: x cup 1.2` — split to #285

Declared at **1,104 pairs / 0.1095 mm**. It is the one row the clamp cannot
reach, and the measurements that say why are in the entry's own note and in
the issue: the closing arc's ALONG-u radius falls to **0.216 / 0.178 / 0.638
of t/2** at v −0.111 / −0.333 / −1.000 on the last station, which is the other
principal curvature; the nib puts its last seven stations inside **0.05 mm** of
blade at gaps of 0.007–0.009 mm against main's 0.163–0.406; the pair count is
**non-monotone in the cup's nib amplitude** and is WORST with the cup removed
entirely (1,856 against the unscaled 1,056); and `APEX_ARC_ROWS` 6 -> 1 makes
every affected row worse. **Main's 0 on that row is a tessellation coincidence
rather than health** — `petalCup max (1.2)` alone reads 80 pairs / 0.0239 mm on
main, while the lobes alone read 0 on every tree.

The hypothesis recorded for that session to TEST rather than adopt is Eva's:
**the nib is narrower in plan than the sheet is thick**, so the fix may be a
tip THICKNESS taper rather than a respacing of stations.

The sheet is `node tools/shot-bloom-fold-clamp.mjs <dir> --cuponly <worktree>`
-> `docs/img/fold-clamp.png`; §9g's is
`node tools/shot-bloom-cup-nib.mjs <dir> --nofix <worktree>` ->
`docs/img/cup-at-the-nib.png`.


## 10. What is NOT done, and is named rather than left to be found

* **THE LEAF'S IDENTICAL STUB — a backlog entry, §11.**
* **`ALL MAX` CANNOT BE RUN LOCALLY ON THIS BOX, AND IT RUNS TO COMPLETION IN
  CI — CONFIRMED, NOT ASSUMED.** It builds 3,090,816 triangles in **47.7 s**
  here against the harness's 30 s settle timeout, and **46.3 s on a worktree
  of the base commit**, so it is the box and not this change.
  **WHAT CI DOES WITH IT**, read off the base commit's own run of this gate
  (`bloom-export-watertight` run 35833638574 on `2464d50`, 07:48 → 12:37,
  289 min, conclusion success), verbatim from its last line:
  > `export gate: PASS — 908 of 909 attempted configs reached the results and
  > every one exports watertight; 1 config(s) the generator REFUSED on its own
  > triangle budget, declared and asserted by XR1 (named above) rather than
  > skipped.`
  So the row is **attempted, built, and asserted**: the one config that does
  not reach the results is `ALL MAX`, and it does not reach them because the
  generator REFUSES to export it on the triangle budget — which XR1 asserts in
  both directions (a declared row that started exporting fails as hard as one
  that refuses wrongly). It is not dropped and it is not skipped; #220's
  headline is what makes those three states distinguishable in the report at
  all. **The same line is checked on this PR's own run before merging.**
  Its `EXPORT_REFUSED_XFAIL` entry — 3,090,816 triangles — is unchanged, which
  is the count this tree builds to the integer: the nib adds no triangles.
  **AND `ALL MAX` IS A DECLARED MOVER OF THIS CHANGE, THROUGH ITS SEPALS AND
  NOT ITS PETALS — which is session 38's own lesson arriving by an unobvious
  route.** Block 1 sweeps every `SWEEPABLE` slider to its maximum, so that row
  carries `petalTipEnd` 1: a squared terminal at the full peak width, which is
  precisely the nib's third guard, so **every PETAL on it is INERT** and the
  read-out prints the inert arm. Its forty SEPALS are not: `sepalBladeState`
  sets `petalTipEnd: 0` by declaration (the rim family is the sepal part 2's),
  so each sepal's terminal is the mode floor and each cuts its own nib. The
  byte partition's predicate catches it for that reason and not by luck — it
  reads `petalsAll` AND `sepals.built`, and a row that sweeps every control is
  a mover of any control a feature adds. **It is also why the census entry
  could move**: what would move it is the sepals, not the petals.
  **Its `SELF_INTERSECTION_XFAIL` entry IS MEASURED AND IS UNMOVED** —
  `node tools/bloom-xfail-magnitudes.mjs --include-refused --only '^ALL MAX$'`
  reads **107,485 pairs / 10.1332 mm against a declared 107,485 / 10.1332**, in
  311 s on a 3.1-million-triangle build. It was going to be carried forward
  unmeasured and that would have been wrong: the sweep skips an export-refused
  row because no STL exists for X1 to read, so NOTHING would have caught a move
  — and this row IS a mover of this change through its forty sepals. It reads
  the same anyway, which is a negative result and is worth more than the
  assumption it replaces.
* **THE COUPON PLAN GAINS A 0.40 mm TIP.** Eva's ruling. The parked cantilever
  coupon is where every floor in this project stops being a line we drew
  ourselves; the nib's face is now one of them.

---

## 11. BACKLOG: the leaf's tip carries the same stub, untouched

`apexNibPlan` refuses a leaf by declaration — `cap.petiole` is the leaf's own
flag and the only thing that sets it. This is what that costs, what held it,
and what closing it would take.

### What it looks like today

`buildLeafInto` floors the blade at `TIP_HALF_MM` in BOTH modes (the constant,
not the accumulator's floor — so live and export agree), and the leaf's tip law
is the same superellipse. **Every leaf therefore ends on a flat face 1.60 mm
across at every value of `leafTipShape`**, exactly as every petal did before
this PR. The figures are already measured, in
`docs/bloom-leaf-tip-shape-outcome.md`:

| `leafTipShape` | share of the length that is the stub | mm at 12 / 52 / 120 mm long |
|---|---|---|
| 0.60 (acute) | **21.28%** | 2.55 / 11.07 / 25.54 |
| 1.30 (the shipped leaf) | 2.06% | 0.25 / 1.07 / 2.47 |
| 3.00 (flat) | 0.02% | 0.00 / 0.01 / 0.02 |

**The share is invariant in the LENGTH** — the outline meets the floor where
`(W/2)·f(u) = 0.8 mm`, a width equation — so a longer leaf does not dilute it;
at width 3 mm an acute leaf spends **49.2%** of itself on the stub. **And a
pointier exponent makes the stub LONGER, not sharper**: an acute superellipse
hugs the axis over the last stretch, so `leafTipShape` moves the SHOULDER while
the END stays 1.60 mm. That is the same sentence this PR's §1 writes about the
petal, one control over.

### Why it was held

Not for effort — the refusal is one line. Three reasons, in order:

1. **`leafLength` would stop meaning the drawn length, and that is a RULING.**
   Eva ruled it for `petalLength` explicitly ("petalLength = asked length");
   a leaf is a different control with its own read-out line, its own LF family
   and its own declared magnitudes, and nobody has ruled the same thing for it.
2. **The byte partition and the census re-record would span two features.**
   This PR moved 153 declared magnitudes and every row whose blade clears the
   print floor; adding the leaves would put block 33's rows in the same
   partition with no way to attribute a mover to one change or the other.
   A partition that cannot attribute is not a partition.
3. **The leaf's own tip has a control this session did not rule on.** The
   nib's flank is the law's tangent; on a leaf that law is `leafTipShape`'s,
   and whether an acute leaf should come to a 0.10 mm point or keep a visible
   terminal is an aesthetic question about a different organ.

### What closing it would take

* **Geometry**: remove the `petiole` guard; decide whether the leaf reads the
  same `APEX_HALF_MM` / `APEX_END_HALF_MM` or gets its own pair. The nib's
  plan is already mode-free and `buildLeafInto` already floors on the
  constant, so the two agree on which mode decides nothing.
* **LF9** needs A6's own re-derivation: its load-bearing clause reads the
  exponent back off the emitted half-widths, and the nib's flank and arc are
  strictly falling, so a fit that runs through them reads a different exponent
  from the one asked. That is the defect this PR measured at **1.7532 for an
  asked 1.70** on the petal, and it would read the same way on a leaf.
* **LF4** is a biconditional against the plan's own `insetSatisfied`, which is
  a function of the leaf's LENGTH: a truncated leaf clears the head at node
  insets that do not clear one today, so the clause's two sides both move.
* **The read-out**: the leaf's `tipClamp` line says the stub's share and which
  lever moves it. With a nib there is no stub, so the line says something
  else — an APEX NIB line of the leaf's own, or nothing.
* **The cantilever figure**: the worst lever is a 120 mm leaf on the derived
  1.2 mm petiole, `L/d = 100`, printed on every leafed build. A truncated leaf
  is shorter, so that number moves. It is `UNMEASURED — no coupon has been
  printed` either way.
* **A partition and a frozen phase** if the row set moves, and a census
  re-record for block 33's twelve rows.
* **What it would NOT touch**, checked rather than assumed: the petiole's own
  weld at the leaf's BASE (the half-step ring offset), ST9's petiole
  exemption (the rod's axis, not the blade), and the combination gate's
  `leaf-stem` measure, whose nearest blade point to the stem is at the base.
