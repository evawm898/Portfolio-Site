# Bloom infill — how far below F the boundary goes, and where it actually lives (Sep 18 2026)

**READ §0 FIRST.** Eva's brief for this session said *"Ship it. #252 was docs and tools only; this
one changes what the generator builds."* The first job it set was to establish where the boundary
lives before changing it — and the answer to that is what decides what "ship it" can mean here.
It is stated in §0 rather than at the end, because every other section reads differently once it
is known.

---

## 0. Where the boundary lives, said before anything is changed

**IT LIVES IN A PROTOTYPE, AS AN ALIAS FOR A CONSTANT THAT BELONGS TO SOMETHING ELSE.**

```
tools/bloom-voronoi-proto.mjs    export const U0 = G.ROOT_BLEND_END;      // as it stood at 09e2aca
```

A **derived value**, and not derived from anything about the infill: `ROOT_BLEND_END` is a station
on the OUTLINE with seven other readers — `rootBlend()`'s own decay, the lobes' `laminaStart`
(`bloom-geometry.js:3839`), A5's excluded region by name, `bloom-sagitta.mjs`'s `base` bucket, and
the sepal builder's four row filters added by #243. It says where the foot's width FLOOR decays to
nothing. It is 0.30.

**AND THE INFILL IS NOT IN THE GENERATOR AT ALL.** `bloom-geometry.js`, `bloom-registry.js`,
`bloom.js` and `bloom.html` contain no infill: 0 occurrences of the word, 0 controls, 0 matrix
rows, no builder. The Voronoi infill is `tools/bloom-voronoi-proto.mjs`, whose own header says it
"changes nothing in the repository's geometry" and exists "so the look and the cost of an infill
can be ruled on BEFORE any builder is touched". The charter has petal infill on the standing board
(`docs/bloom-charter.md:24`, `:2712`).

**SO THE BRIEF'S PREMISE IS OFF BY ONE STAGE, AND THIS SESSION SAYS SO RATHER THAN SHIPPING
SOMETHING ELSE UNDER THE WORD.** There is no generator-side boundary to move. Moving the infill's
boundary by moving `ROOT_BLEND_END` would move the root blend, the lobe window, A5, the sagitta
bucket and the sepal lamina — a byte partition across two organs, for a reason none of them asked
for — which is exactly the trap #252's §4 was circling. What ships here instead is in §6: the
boundary gets **its own owner**, derived from a length the geometry already declares, and the
generator gains the one reader that owner needs. §7 costs the port, and §8 costs the control.

---

## 1. The answers, before the tables

1. **THE FLOOR IS ROW 7 AT THE SHIPPING DEFAULT — THREE ROWS BELOW F — AND IT IS THE BLADE'S OWN
   WAIST.** `halfWidthAt` is a `Math.max`, and at **u 0.0579388** the foot's width floor hands the
   outline to the core. The blade is **5.164 mm across** there, against 6.400 at the foot and
   16.000 at its widest: the narrowest section it has between the foot and the tip. Below it the
   outline **turns and widens again**, and a cell region containing that turn is measurably worse.
2. **BELOW THE FLOOR THE ANSWER REVERSES, and it reverses on the row the floor names.** At the
   defaults the bottom 45 % of the blade goes **49.6 % solid at row 7 → 62.0 % at row 6** — more
   solid, not less, which is the opposite of what lowering the boundary is for — on 292 fewer
   triangles. Three independent confirmations that it is the WAIST and not the row index: a
   CONTROL (a petal with no waist), a MOVER (`petalWidth` 30 puts the waist a row lower and the
   step follows it), and the same reversal at **four gradings including no grading at all**. §2.
3. **`HELD_ROWS` / `A7` DOES NOT BIND AT ANY BOUNDARY, AND #252's RECOMMENDED OPTION 2 IS REFUTED
   BY EVA'S OWN RULING.** The infill places no station, and the only route it could take is
   MUTATING the rows it was handed: the field was run at all 17 boundaries and the builder's
   stations compared afterwards against a FRESH build — **0 of 59 moved under `Object.is`**.
   And option 2 — "the boundary is the last held station" — lands on **row 18,
   eight rows ABOVE the cell Eva picked**, at 25.49 % panel where she approved 8.83 %. It cannot
   be the answer to a ruling that asked for LOWER. §3.
4. **NOTHING ELSE BINDS DOWN TO THE ARITHMETIC FLOOR.** Boundary edges 0, one voxel piece at
   0.6 mm and at 0.3 mm, on every row from 19 down to 3, every seed, both walls; and **0 of 1,536
   masked-lattice readings come closer to the petal than the plain petal does**, which extends
   #252's §3c from row 5 to row 3. §1, §4.
5. **A SECOND FLOOR EXISTS AND THE MUST-FAIL IS WHAT FOUND IT.** On a petal whose FOOT is narrower
   than two wall insets the waist vanishes and a width floor binds instead. It was not predicted:
   `--control`'s K2 fired on the petal that was supposed to be the control. **And on that petal the
   ROOT_BLEND term hands the outline to a DIFFERENT term** — to `TIP_FLOOR` at u ≈ 0 rather than to
   the `CORE` — so "the waist" is what the floor is where the foot OWNS the outline and is not a
   sentence true of every petal. K1 asserts both shapes. §2c.
6. **THE FLOOR IS READ MODE-FREE, AND THAT NEEDED A GENERATOR CHANGE.** `profile.slopeBreaks()`
   floors on the accumulator's own `tipFloor` and **disagrees live/export on a reachable state**
   (`footDelicacy` 0.25: u 0.015720245 live, 0 export). Which rows carry the solid panel is
   TOPOLOGY. §5, §6.

---

## 2. The floor, and the mechanism

### 2a. The sweep below F

Eva's own grading on every row (`converge` 0.050, `baseNarrow` 1.50), eight seeds, wall 1.0 mm.
`cells from` is where the field starts — one row of overlap below the panel's top — and it is the
row that has to clear the floor. Full table, both walls, in the tool's own output.

| row | panel to u | cells from | vs floor | panel % | **bottom 45 % solid** | open mm² | cells with no hole | tris |
|---|---|---|---|---|---|---|---|---|
| 19 (the prototype's) | 0.3007143 | 0.2857143 | above | 27.50 | 75.1 | 48.60 | 2 | 2730 |
| 14 | 0.2142857 | 0.1964286 | above | 16.44 | 62.4 | 73.20 | 2 | 2572 |
| 11 | 0.1607143 | 0.1428571 | above | 10.55 | 54.3 | 89.12 | 2 | 2544 |
| **10 — F, Eva's cell** | **0.1428571** | **0.1250000** | above | **8.83** | **54.3** | 89.06 | 2 | 2460 |
| 9 | 0.1250000 | 0.1071429 | above | **7.25** | **53.2** | 91.11 | 2 | 2436 |
| 8 | 0.1071429 | 0.0892857 | above | **5.84** | **52.1** | 93.39 | 1.5 | 2408 |
| **7 — THE FLOOR** | **0.0892857** | **0.0714286** | above | **4.60** | **49.6** | 98.24 | **1** | 2496 |
| 6 | 0.0714286 | 0.0535714 | **BELOW** | 3.54 | **62.0** | 74.04 | **3** | 2204 |
| 5 | 0.0535714 | 0.0357143 | **BELOW** | 2.69 | 59.4 | 79.19 | 2.5 | 2184 |
| 4 | 0.0357143 | 0.0178571 | **BELOW** | 1.85 | 57.7 | 82.32 | 2.5 | 2110 |
| 3 | 0.0178571 | 0.0000000 | **BELOW** | 0.95 | 56.7 | 84.43 | 2 | 2022 |

At wall 0.8 the same rows read **49.2 % at F, 47.6 / 46.1 at rows 9 and 8, 43.5 % at the floor**,
and **57.7 % one row below it** — the same reversal on the same row, and at the floor no cell is
left without a hole at all (0 of 17 against 1 at wall 1.0).

**THE ARITHMETIC FLOOR IS ROW 3 AND IT IS NOT GEOMETRY.** Row 2 and below throw: the three
overhanging feet all carry `u = 0`, so `splitRow` snaps a target at or below the third of them to
row 0 and `rows[mSplit - 1]` is undefined. Reported as what it is.

**AND ROW 3 IS A TOPOLOGY CHANGE, not merely a small panel.** There the base panel is the three
feet alone, with no blade row for its overlap to weld to: the vertex-welded shell count goes
**1 → 2 on every state measured** and the overlap weld's two non-manifold edges disappear. The
voxel flood fill still reads one piece — it is the authority and it never binds anywhere on this
sweep — but the panel has stopped being a panel. The split is floored one row past the feet for
that reason, which is exactly what the seam-shifted corner already builds.

### 2b. Why the waist, and not a round number

**EXTENDING THE REGION BELOW THE WAIST BUYS NOTHING WHERE IT EXTENDS AND COSTS SOMETHING ABOVE.**
Measured on the default, both halves:

* **Open area below the waist station: 0.000 mm² at every boundary from row 19 to row 6**, 0.238 at
  row 5, 1.45 at row 4, 2.31 at row 3. The field cuts essentially no hole down there at any
  boundary, so the extra region is not pattern.
* **Open area ABOVE the waist FALLS when the region crosses it**: 193.33 → 169.57 mm² from row 7 to
  row 6. The cells that reach down into the sliver lose their holes — **cells carrying no hole at
  all go 1 → 3 of 17** — and that is a loss taken on the blade, not at the base.

**THREE CONFIRMATIONS THAT IT IS THE WAIST.**

| | waist u | floor row | largest step in the band | first row below the floor |
|---|---|---|---|---|
| **DEFAULTS** | 0.0579388 | 7 | row 6, **+12.4 points** | 6 — **the same row** |
| **CONTROL — `footDelicacy` 0.25** (no waist) | 0.0000000 | 5 (the WALL floor) | row 4, **+19.7 points** | 4 — **the same row** |
| **MOVER — `petalWidth` 30** (waist lower) | 0.0492008 | 6 | row 5, **+16.6 points** | 5 — **the same row** |

And it is not the grading: the same reversal at the same row at `converge` 0.050 × `baseNarrow`
1.50, at 0.000 × 1.50, at the prototype's own 0.100 × 0.75, and **at no basal grading at all**
(`converge` 0, `baseNarrow` 1.00: 50.8 % at row 7 → **63.9 %** at row 6).

**WHAT THIS DOES NOT CLAIM.** The waist is the PETAL's and the control and the mover pin it there.
How much a DIFFERENT field would lose at the same crossing is not measured, and a field that cut
usable holes below the waist would move the floor. What would not move is the section: 5.164 mm
across on a 1.2 mm sheet is **6.20 mm²**, against 7.68 at the foot and 19.20 at the peak, and that
is a property of the outline whatever is cut into it.

### 2c. The second floor, which the must-fail found

`--control`'s K2 was written with `footDelicacy` 0.25 as the control for *"no waist, therefore no
reversal"*. **It fired.** That petal reverses too — and it turned out to have a different floor.

Its foot is **1.600 mm across**, narrower than two 1.0 mm wall insets. The outline edges of a cell
are inset by the FULL wall from each side (the established constraint — a half-wall lip along the
margin is under the print floor), so the hole available across the region's base edge is
`2·(h(xB) − wall)` and it must clear `MIN_FEATURE_MM`. On that petal that is not satisfied until
**u 0.0322266**, which is row 5; the waist alone would have started the region at row 4, where no
hole can exist at all.

So the floor is **`max(waist, wall floor)`** — two lengths, each with its own owner, neither a row
count. Swept over eighteen states, **the wall floor binds on exactly the thin-footed ones**
(`footDelicacy` 0.25, and `petalWidth` 8 × `footDelicacy` 0.25 where it moves the row from 4 to 7);
everywhere else it reads 0 and the waist decides. **It was not predicted and is recorded as found
by the control rather than by a reading of the code.**

**AND ON THAT PETAL THE FLOOR IS NOT THE OPTIMUM — REPORTED, NOT TUNED.** Its sweep reads 48.0 % at
row 7 and 52.9 % at its floor (row 5), so shipping "as low as the floor allows" costs **4.9 points
of bottom-45 solid** there. At the shipping default the floor and the optimum are the same row. The
alternative — making the boundary the ARGMIN of a measured field statistic — is refused on this
project's own `headRise` ruling: *a metric consumed as a geometric input becomes a target.*

---

## 3. The `HELD_ROWS` / `A7` collision — bounded, and option 2 refuted

**THE INFILL PLACES NO STATION, SO A7 CANNOT FAIL AT ANY BOUNDARY.** A7 is about where
`bladeStations` puts the ladder; the infill reads the builder's own captured rows and cuts holes in
the lamina above a row index.

**WHAT THE CLAUSE CAN ACTUALLY CATCH IS SAID RATHER THAN LEFT TO BE READ AS STRONGER.** The
boundary is not a state field, so it cannot reach `bladeStations` by any route; the ONE way the
infill could move the ladder is by MUTATING the rows the builder handed it. So a FRESH build
supplies the reference — an owner the field does not write — the field is run at all 17 boundaries
on the shared context, and the context's stations are compared afterwards: **0 of 59 moved, under
`Object.is`**. K4 runs that same shipped clause against a reference bent by one ULP and requires it
to report 1.

So the answer to *"how far below F can the boundary go without touching `HELD_ROWS` / A7"* is
**all the way to the floor. It does not bind anywhere.**

**AND #252's RECOMMENDED OPTION 2 IS DEAD, BY EVA'S OWN RULING RATHER THAN BY A MEASUREMENT.** Its
proposal was that the infill's boundary read `HELD_ROWS` — `(seamStep + HELD_ROWS − 1) / NU`, the
last held station. At the shipping default that is **u 0.2857143, row 18, panel 25.49 % of the
blade**. Eva ruled row 10 (8.83 %) the best cell on the sheet and asked for lower. Option 2 is
**eight rows above it**. A recommendation made before that ruling cannot survive it, and this is
recorded so the next session does not re-derive it: **option 2 was right about the DEFECT (a
boundary snapped against a fixed 0.30 whatever `seamStep` is) and wrong about the REMEDY.**

**WHAT REPLACES IT IS OPTION 3 WITH A FOURTH OWNER — and it is available only because this session
measured the waist.** #252's option 3 was "they are two boundaries and both stay, named apart", and
it left the infill picking one of the two EXPLICITLY. The measurement says neither is right: the
infill's boundary is neither the outline's `ROOT_BLEND_END` nor the ladder's `HELD_ROWS` but the
lamina's own floor, which is a third length with a third owner. `ROOT_BLEND_END` keeps the outline,
`HELD_ROWS` keeps the lattice, and the infill stops reading either.

**OPTION 1 IS UNTOUCHED AND IS STILL THE LADDER'S.** Whether `HELD_ROWS` should be derived from
`ROOT_BLEND_END` in every state is a separate ruling that moves shipped bytes across two organs; it
got no cheaper and no dearer here, and nothing in this session depends on it.

---

## 4. The self-approach, extended below F

#252's §3c measured the shipped 56 × 10 lattice — the very grid `measureWall` reads — masked by the
holes, from row 19 down to row 5, and found 0 of 120 rows reading closer than the plain petal. That
is re-run at every boundary down to **row 3**, both walls, eight seeds, all twelve wall states:

> **0 of 1,536 (state × wall × boundary × seed) readings come closer to the petal than the plain
> petal does.** 1,311 read exactly equal and 225 read above.

Compared against **the rule's own plain reading per state**, not against `measureWall`, on the two
states where the two rules differ (`twist-max`, `form-max`) — #252's §3c characterises that
difference and V1 asserts the identity where they agree. It is a theorem before it is a
measurement: the infilled solid's material is a SUBSET of the plain solid's, so every self-approach
is monotonically non-decreasing under an infill.

**THE BLINDNESS IS INHERITED AND UNCHANGED: the hole RIMS are sampled by nothing.** No lattice
station sits on a rim. That is the shipped instrument's own blindness to anything off its grid, and
closing it still needs either an emitter that subdivides its cells or a rim-aware sampler. Neither
is this session's.

---

## 5. The mode, and why the floor is not read off `slopeBreaks`

**`profile.slopeBreaks()` IS MODE-DEPENDENT AND IT IS RIGHT TO BE.** It reports the seams of the
outline a given MODE draws, and it floors on `tipFloor` — `TIP_CAP_HALF_MM` (0.15) live,
`TIP_HALF_MM` (0.8) at export. On a petal whose FOOT is narrower than the print floor the two modes
therefore name a different term at the base: measured on `footDelicacy` 0.25, the `ROOT_BLEND →
CORE` handover reads **u 0.015720245 LIVE and 0 EXPORT**.

**WHICH ROWS CARRY THE SOLID PANEL IS TOPOLOGY**, and this project has refused a mode-dependent
topology five times (session 32's ladder, 38's seam step, the fringe's count threshold, 42's
lamina, the sphere stem's omission mask). So the floor reads `laminaSlopeBreaks`, which floors on
`TIP_HALF_MM` in both modes. Measured over nineteen reachable states:

> **`laminaSlopeBreaks` differs live/export on 0 of 19. `slopeBreaks` differs on 1.**

---

## 6. What shipped

### 6a. `bloom-geometry.js` — one reader, and the reason it is in the generator

`profile.laminaSlopeBreaks(grid = 4096)` — `breaksOf(laminaWinner, grid)`, beside the existing
`slopeBreaks`. **`laminaWinner` already existed**: session 42 built it for the lobe arc table and
read it through `breaksOf` there, and this exposes the same expression under a name an outside
reader can ask for.

**IT IS IN THE GENERATOR SO NOBODY RE-DERIVES IT.** The alternative is a second producer of the
outline's term handover sitting outside `widthProfile`, which is the defect this file has refused
since session 32. `slopeBreaks` also gains the paragraph naming its own mode-dependence, with the
measured state.

**0 BYTES MOVE, and it is measured rather than argued** — `node
tools/verify-bloom-surface-bytes.mjs --base <worktree of 09e2aca>`: every export float and every
captured-grid value, positionally, under `Object.is`, over the full 852-row live matrix in both
modes. Nothing in the generator calls the new method, and nothing enumerates the profile's keys
(checked). **No matrix row is added or removed, so NO FROZEN PHASE IS OWED** — `frozen/phase34` (the
778 rows at `f64f3bc`) stays the newest baseline and no tag's bytes stop reproducing.

### 6b. `tools/bloom-voronoi-proto.mjs` — the boundary's own owner

| | |
|---|---|
| `U0` | **retired as the default**, kept exported under its own name because #250/#251/#252 quote it, with the paragraph saying why it was never the infill's |
| `laminaFloorU(ctx)` | the WAIST — `laminaSlopeBreaks`'s `from: 'ROOT_BLEND'` station |
| `wallFloorU(ctx, wall)` | the width floor — scanned UPWARD from the waist, because `h` is not monotone below it |
| `basalFloorU(ctx, wall)` | the stricter of the two |
| `basalSplit(ctx, opts, wall)` | an explicit `u0` snaps as before; with none, **the floor** |
| `footRows(ctx)` | counted off the rows at `u = 0` rather than typed, because `bloom-infill-base-panel.mjs` already holds a 3 and a second copy is the duplicate-expression defect |

**THE SPLIT IS NOT A NEAREST-SNAP AND THAT IS MEASURED, NOT ASSERTED.** The region starts one row
BELOW the split, so the row that must clear the floor is the OVERLAP row. Snapping to the nearest
station lands on the wrong side of it: at the defaults a nearest-snap to the waist gives **row 5,
whose cells start at u 0.0357143 — 0.022 below the floor**, which is the one thing the floor exists
to prevent. `floorRow` is the LOWEST row whose own overlap row clears the floor.

**THE SHIPPED BOUNDARY IS NOW ROW 7 (u 0.0892857) AT THE DEFAULTS**, derived per state: row 6 on
`petalWidth` 30, row 5 on `footDelicacy` 0.25, row 4 on the seam-shifted `petalTilt` 75 ×
`petalLength` 20 × `sheetThickness` 2.40 corner, where the ladder leaves no blade row below the
waist at all. **There is no constant to be wrong.**

### 6c. The three tools whose published figures were pinned to the old default

`bloom-basal-grading.mjs` (#251), `shot-bloom-basal-grading.mjs` (#251's sheet, whose own lede says
the boundary is FIXED at `ROOT_BLEND_END`) and `bloom-infill-base-panel.mjs`'s `--inert` control now
pass `u0: P.U0` **explicitly**, so the dependency is visible rather than a default. Verified:

* `node tools/bloom-basal-grading.mjs --inert <worktree of 09e2aca>` — **0 of 394,848 floats
  differ**, with its own control firing (2,736 triangles against 2,564).
* `node tools/bloom-infill-base-panel.mjs --control` — **PASS**, all four claims behaving, C2
  reporting its own published 112 of 560 and C3 reproducing #250's seven rows.

### 6d. The new instrument and its must-fail

`node tools/bloom-infill-lamina-floor.mjs [--json <file>] [--quick]`, and
`node tools/bloom-infill-lamina-floor.mjs --control` — **four clauses, every one seen to fire**:

| | what it claims | how it is shown able to fail |
|---|---|---|
| **K1** | the declaration IS the outline, ON BOTH SHAPES — a waist where the foot owns the outline, and NO waist where it hands to the print floor | the bar is the SEARCH's own step (1.50e-6 in u, 5.94e-5 mm of outline), not a typed epsilon; the same test REJECTS the tip's own break |
| **K2a** | the floor row's overlap row clears the floor and the row below does not | the half-widths are printed on both sides, on three petals |
| **K2b** | every row below the floor reads MORE solid in the bottom 45 % | a strict comparison, no threshold; the reference is the field's emitted holes, which neither floor writes |
| **K2c** | the floor is load-bearing IN THE ANSWER | move it down one row and K2b must break — **it fires on 2 of 3 petals, and the third is explained by a MEASURED monotone curve rather than excused** |
| **K3** | the split is the floor's row and a nearest-snap would land below it | both rows and both stations printed |
| **K4** | the ladder comparison can report a difference | the SHIPPED clause is run twice — 0 moved against a fresh build, 1 against a reference bent by ONE ULP (+5.55e-17) at station 20 |

**K2c IS WHERE THE SUBJECT HAD TO BE NAMED.** On `footDelicacy` 0.25 the bottom-45 curve degrades
MONOTONICALLY below the floor, so no row is distinguishable by K2b there and a control that claimed
otherwise would be this file's own "cannot fail" defect in reverse. Monotonicity is **measured** in
the clause and reported, and K2a is what carries the floor on that petal.

### 6e. The sheet

`node tools/shot-bloom-lamina-floor.mjs [--out <dir>] [--quick]` — **F first, and every cell read
against it**, then rows 9, 8, THE FLOOR (7), and **one row PAST the floor**, which is the cell the
floor refuses and is on the sheet so the floor is a reason rather than a rule. Both walls, the petal
alone, the base close, and the whole bloom from above and three-quarter with the plain bloom as the
control. Every caption carries the panel's share and the bottom-45 % solid in #252's units, and the
delta against F. No pixel delta is quoted: the rasteriser is deterministic.

Published as a private artifact: **https://claude.ai/artifact/HUEqChDfpnYnyFQgpnYQCp**

---

## 7. The structural figures, and the cost of the port

### 7a. The structural figures Eva asked for, on every new cell

Stated once, not acted on. **A petal is a cantilever and the base carries the peak bending
moment**, so the solid basal panel is load-bearing rather than decorative. Nothing here is clamped
on structural grounds and no conclusion above rests on them.

**THE BRIEF ASKED FOR THEM IN THE READ-OUT AND THE SHEET, AND THERE IS NO READ-OUT.** The sheet
carries them on every caption; the app has no infill to report, so there is no panel line to put
them in. The instrument prints them as its own **§1b** — a named block rather than two columns
among fifteen — and that is where a reader of the measurement finds them. Said, rather than
quietly substituting one for the other.

Every row is at **Eva's own grading** (`converge` 0.050, `baseNarrow` 1.50), so only the boundary
varies down the column.

| | panel % of the blade | bottom 45 % solid (wall 1.0) | bottom 45 % solid (wall 0.8) |
|---|---|---|---|
| the boundary the prototype shipped (row 19) | 27.50 | 75.1 | 72.9 |
| **F — the cell Eva approved (row 10)** | **8.83** | **54.3** | **49.2** |
| row 9 | 7.25 | 53.2 | 47.6 |
| row 8 | 5.84 | 52.1 | 46.1 |
| **THE FLOOR (row 7)** | **4.60** | **49.6** | **43.5** |
| *(row 6 — refused)* | *3.54* | *62.0* | *57.7* |

**THE BRIEF'S 27.5 % / 84.0 % PAIR IS THE SAME BOUNDARY AT A DIFFERENT GRADING** — #252 measured
84.0 % at the prototype's own `converge` 0.100 × `baseNarrow` 0.75. At Eva's grading that boundary
reads **75.1 %**, and the 8.9 points between them are the grading's, not the boundary's. The column
above is one grading throughout so that the boundary is the only thing moving in it.

**AND THE SECTION AT THE WAIST, because it is the mechanism and not a flourish:** 5.164 mm across on
a 1.2 mm sheet is **6.20 mm²**, against 7.68 mm² at the foot and 19.20 mm² at the peak. The floor
keeps the pattern off the thinnest section the blade has. That is a consequence of where the floor
falls, not a reason it was put there. **Nothing in this project has ever been printed.**

### 7b. What the whole bloom costs

| | tris | against plain |
|---|---|---|
| plain bloom (what ships) | 19,040 | — |
| the prototype as it shipped, wall 1.0 | 21,824 | +2,784 |
| F, wall 1.0 | 19,808 | +768 |
| **THE FLOOR, wall 1.0** | **20,016** | **+976 (+5.1 %)** |
| THE FLOOR, wall 0.8 | 19,872 | +832 |

Boundary edges 0 and one voxel piece at 0.6 mm and at 0.3 mm on every one.

### 7c. Why the port is not this session's, with the measured reason

**IT IS NOT THE TRIANGLE COST.** CLAUDE.md prices a Voronoi port at 37,830 triangles a petal from
the FLOWER's own emitter; this construction is **2,496 a petal at the floor against a plain 2,356**,
because construction B emits one shell whose skins are tiled by annuli rather than ring points. The
budget is not the blocker.

**THE BLOCKER IS THE EMITTER, and the prototype's own header states it as a measurement.**
`cutThrough` tessellates a solid cell as a flat FAN over the whole cell polygon, and a flat fan
across a surface that wraps is a CHORD: under `petalRoll` 330 — a near-closed quill, and a shipped
matrix row — a cell's own facet cuts through the tube and a self-approach measured on those facets
reads **0.0009 mm**. **A shipped solid that self-intersects on a matrix row is disqualifying under
this project's own invariant**, and a build's emitter would have to subdivide. Three more, each
already recorded: the plan is FLAT-computed (3.0× cell stretch across the width at cup 1.2), fringe
and cleft are excluded by ruling, and lobes clip by construction and are not exercised.

So the port is a feature with a builder, registry rows, two new gate families, matrix rows, mutants,
a byte partition, a frozen phase and a sheet — and it needs the emitter question answered first. It
is **recorded, costed and not started**.

---

## 8. If Eva should be able to move it herself — the control, costed

**SHE SHOULD, AND IT CANNOT SHIP BEFORE THE INFILL DOES**: a registry row for a feature the
generator does not build would be a control that moves nothing. Costed for the day the port lands.

**WHAT IT WOULD BE.** Not a `u` station — the floor is state-dependent, so a slider in `u` would
mean different things on different petals and would reach under the floor on some of them. It is a
**fraction of the travel between the floor and `ROOT_BLEND_END`**: `0` the floor, `1` the outline's
own blend station, the shipped default **0** (Eva ruled for as low as it goes). One row of
`bloom-registry.js`, hidden AND inert when the infill is off — the curl family's own gating.

**WHAT IT COSTS, in this project's own units:**

* **one registry row** plus its `DEFAULTS` key and a `fmt` that prints the panel's share of the
  blade at the chosen value, because that is the number Eva is judging;
* **two matrix rows** — the blanket slider sweep adds a minimum and a maximum row per new slider,
  and `ALL MAX` takes its maximum, so the worst reachable corner must be re-measured with it (the
  infill REMOVES material, so the direction is favourable, but `ALL MAX` is already a declared
  export refusal and `XR1` asserts its exact triangle count, which would move);
* **one panel-gate route** — the control must be asserted to APPEAR as well as to hide;
* **the dead travel is TOLD, never trimmed** — `stamenSpread`'s ruling: the range is not narrowed
  and the maximum is not adaptive, the floor's own position is drawn as a tick on the track and the
  read-out prints it. On the seam-shifted corner the travel is short and on `footDelicacy` 0.25 the
  floor is two rows above the optimum, so there is real dead travel to declare;
* **one frozen phase**, because the matrix grows.

**AND A DEFAULT IS NOT A STRUCTURE.** Whichever value ships, the range reaches the floor and reaches
`ROOT_BLEND_END`, and moving the default later is one constant.

---

## 9. Recorded, not built

* **`bloom-wall-thickness.mjs` STILL CARRIES NO INFILLED STATE.** #250 recorded it, #252 measured
  around it, and this session measured further around it. V5 is the only gate on self-approach and
  the state itself is the build's.
* **The hole RIMS are unsampled by anything.** §4.
* **The floor is not the optimum on a thin-footed petal** — 4.9 points of bottom-45 solid on
  `footDelicacy` 0.25. Reported in §2c, not tuned around, and the argmin alternative is refused on
  the `headRise` ruling.
* **`N` is fixed at 16.** Every trade here is at a fixed cell count, so a boundary that opens more
  lamina takes cells from nowhere — they spread. Letting `N` rise with the lamina is a different
  experiment and would move the floor's cost.
* **The `HELD_ROWS` question itself (option 1) is the ladder's** and is unchanged by this session.
* **`bloom-infill-base-panel.mjs` holds its own `FOOT_ROWS = 3`** and the prototype now counts the
  feet off the rows. Two answers to one question, one of them typed; the typed one is #252's and
  was left alone rather than edited under a session that is not about it.
