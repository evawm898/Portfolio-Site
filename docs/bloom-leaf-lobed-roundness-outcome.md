# Leaf/stem build S4c — sinus roundness, the lobe-count yield, the lobed tooth count

Eva's four rulings on S4b (`docs/bloom-leaf-lobed-rulings-outcome.md`, the sheet
`docs/img/leaf-lobed-rulings.png`), built into the generator. Base: `main` at
`2e096bf` (S4b, #387). The sheet for this session is
**`docs/img/leaf-lobed-roundness.png`** (`node tools/shot-bloom-lobed-roundness.mjs
<png> --base <worktree of 2e096bf> --sample-head … --sample-base …`), print preview
ON, every number on it read off the build's own record.

**Two things are Eva's to rule from that sheet: the roundness default (0.12, a
proposal) and the per-lobe tooth default (3, a proposal).**

## 1. Ruling 1 — S4b's defaults are ACCEPTED (recorded)

`lobedSinus` 0.55, `lobedShape` 0.55, `lobedAngle` 22 and `lobedToothDepth` 0.22
stand as merged in #387. Kept: 3 lobes a side, envelope 34 mm, from/to 0.08/0.80,
ease 0.9, tip shape SHARED at 1.3. Nothing in this session moves them.

## 2. Ruling 2 — the sinus roundness (`lobedRound`)

**The control.** `lobedRound` (Leaves > Lobes, LOBED only, 0–0.50, step 0.01,
**default 0.12, proposed**). It sets each sinus's round-bottom radius to a FRACTION
OF THE LOBE PITCH, floored at S4b's print minimum:

    R = max( floor_G(roundness x pitch), R_min )

- `pitch` is the planform chord between the two crests that bound the sinus. The
  crests sit on the envelope at the built tilt (`(u L + e sin tau, e cos tau)`).
- `G` is `LOBE_RELIEF_GRID` (2^-16 mm). The asked radius is floored onto it,
  because it is a bisection target and the page's V8 and Node's must agree on it.
- `R_min` is S4b's own derived radius: the smallest disc that opens the sinus to
  `MIN_FEATURE_MM`. It is 0 where the asked V already opens.

**It is S4b's construction, not a second sinus law.** The disc is seated on the
depth line, the walls are tangent at the flank's own pitch and checked against the
fold on the rows. One fix was owed. For `R > R_min` the disc keeps the FLOOR'S seat
offset (S4b's), not the axis seat. The axis seat slides a broad disc off the bottom
and leaves a V crevice under it: the emitted concave circumradius read **0.51 mm on
a 2.81 mm disc**. Seated on the floor's offset, the emitted rows read exactly R.

**Roundness 0 is S4b by branch, measured.** 41 base-tree LOBED matrix rows were
built on both trees at roundness 0, with teeth off on both. Teeth are off because
the per-lobe count (§4) cannot reproduce a shared count of 12. Result: **40
bit-identical in both modes, over 36,254,484 floats under `Object.is`.** The one
mover is S4b's own NO ROUND BOTTOM FITS row, which ruling 3 changes by design
(5 → 3 lobes).

**The proposed default, 0.12, reads as a broad U.** On the mum leaf:

| | S4b (roundness 0) | S4c at 0.12 |
|---|---|---|
| radii (mm) | 0.50 / 0.50 / V | **1.75 / 1.23 / 1.24** |
| narrowest opening | 1.014 mm | **1.341 mm** |
| triangles per leaf | 5,980 | 5,980 |

The macro row of the sheet shows sinus 2 three times, same state and camera:

| roundness | radius | opening |
|---|---|---|
| 0 | 0.500 mm | 1.124 mm |
| 0.12 | 1.231 mm (10.26 mm pitch) | 1.341 mm |
| 0.5 | 5.13 asked, **shrunk to 1.789** | 1.383 mm |

The value was chosen from outline renders. Below about 0.08 the first sinus stays a
crevice, and above about 0.2 the lobes start to read as separate leaflets.

**DEAD TRAVEL, TOLD AND NOT TRIMMED** (the `stamenSpread` ruling). On the mum leaf
every sinus SHRINKS from about 0.30 up, and 0.30 builds the same radii as 0.50
(4.35 / 1.79 / 1.38 mm). The read-out prints the built radii and every shrink as
asked → built.

**The lattice fold is not re-opened, and the tilt cap does not move.**
- LF22 is green on every LOBED matrix row. A round bottom carries no slope the
  asked V's own rows do not (S4b's rule, unchanged).
- The tilt cap is computed on the ASKED lamina, which roundness does not touch, so
  the cap binds exactly where it did. This was measured on the tilt-cap row:
  29.90° of excess, against S4b's 30.63, and the same built tilt.
- The tooth relief floor and the fold cap are unchanged.

## 3. Ruling 3 — on no fit, the lobe count yields

**The order, as ruled.**
1. **Stage 1:** where the asked radius does not fit, the RADIUS SHRINKS toward
   `R_min`. It is the largest fitting radius: bisected, floored onto the grid, and
   told as asked → built.
2. **Stage 2:** only where even `R_min` does not fit (S4b's NO FIT) is the COUNT
   tried one lobe fewer a side. The whole law is re-derived at that count, with its
   own periods, tilt cap and round bottoms at the same roundness, down to one lobe.
   The first count where every sinus fits is built.
3. **The residual:** where no count fits, the asked count stands with S4b's told V.

`lobedOutline` owns this. It is mode-free (every input is the `TIP_HALF_MM`-floored
lamina), and the record carries `lobeYield = {asked, built, yielded, residual,
attempts}`.

**How often each stage binds.** Sample: `tools/bloom-lobed-sinus-sample.mjs`, 2,000
uniform states, the same seeds as S4b. 1,811 of them carry a sinus at the default
roundness.

| | S4b (base, measured) | S4c, roundness 0.12 | S4c, roundness 0 |
|---|---|---|---|
| stage 1 binds (radius shrinks) | — | **58 states (3.2 %), 62 sinuses** | 0 |
| stage 2 binds (count yields) | — | **214 states (11.8 %)** | 214 |
| lobes given up (count of states) | — | 1: 80, 2: 70, 3: 44, 4: 12, 5: 8 | same |
| residual (no count fits, V told) | — | **17 states (0.9 %), 60 sinuses** | 17 |
| a sinus under 1 mm | 236 (13.0 %), 855 sinuses | **17 (0.9 %), all told** | 17 |

Five more states yield to a count whose outline has no sinus left (the envelope
rises through the last one), so 219 states yield in all. Those five carry no slit
and no opening to measure. The yield and residual numbers do not depend on the
roundness: the yield is decided by `R_min`, which roundness never lowers.

**S4b's published 10.2 % (185 states, 631 sinuses) does not reproduce on its own
merged tree.** It reads **13.0 % (236, 855)** through the same committed sampler.
S4b's figure predates its own §2d back-wall fix. Reported, not re-litigated.

**The 17 residuals — the cause, measured.** Every one fails on the BACK FLANK:
- The lobe window is only **1.0–5.7 mm of midrib** (median 1.9 mm), on leaves 5 to
  24 mm long.
- Even at one lobe, the back half-period is 0.5–2.8 mm. The back wall cannot climb
  from a 1 mm disc to its flank inside the fold-limited slope.
- By contrast, the states the yield fixed have windows of 1.74–37.3 mm (median
  7.3).

What the build does there: the asked count, S4b's V kept, NO FIT told on the
read-out. LF25 (the NO FIT arm) and LF28 (the residual arm) assert that. A smaller
count cannot help when one lobe already does not fit. The two levers that would
help are both out of scope: a longer window (the blade's own `from`/`to`), and a
sinus depth clamp, which the brief rules out. The residual is the sheet's cell 14:
**3 lobes on a 24 mm blade over a 5.52 mm window at 58°, narrowest opening 0.260
mm, 3 sinuses told.** The brief named S4b's own trial ("3 of 60 states the lobe
count did not fix"); that trial's state list was not committed, so the residual
here is measured on the re-run sample instead, all 17 states named by the
committed sampler's own `residual` flag.

## 4. Ruling 4 — the lobed tooth count (`lobedToothCount`)

**The semantics: TEETH PER LOBE, over the BUILT lobes.** The count asked of the
shared tooth law is `perLobe x (2 n + 1)`: `n` lobes a side on both margins plus
the terminal, counted after the yield.
- **Default 3, proposed:** 21 teeth on the mum (S4b's shared count put 12 there,
  about one a lobe).
- Range 1–6, a twin of `leafToothCount` by the S3b mechanism: its own registry row,
  shown only under LOBED.
- `leafToothCount` is hidden AND inert under LOBED. That is checked as two
  statements at harness load, and `LOBED TEETH: the SHARED count at its maximum
  under LOBED` is a matrix row.

Tooth SHAPE (crest/notch) stays shared and serrate skew stays excluded. SIMPLE and
COMPOUND counts and defaults do not move (the byte partition, §5).

**Why per lobe:**
- It is the quantity the eye reads on a lobed leaf: a lobe with three teeth.
- It keeps the meaning when the lobe count changes. Three a lobe on 3 lobes and on
  6 lobes look alike, while a whole-rim count of 21 would leave a 6-lobe blade with
  about 1.6 a lobe.
- Under the yield it follows the BUILT count, so a yielded blade is not over-toothed.

**What "per lobe" is, plainly: an average.** The rim law is MODEL B's, unchanged,
so the teeth are evenly spaced in ARC LENGTH along the whole rim, and each lobe
carries its share by length. The record's `teethPerLobe` tallies the drawn teeth
lobe by lobe (base to terminal):

| teeth a lobe | rim count | per lobe |
|---|---|---|
| 3 (mum default) | 21 | 2 / 3 / 3 / 5 |
| 1 | 7 | 0 / 2 / 1 / 1 |
| 2 | 14 | 1 / 3 / 1 / 4 |
| 6 | 42 asked, 24 built (the ROWS cap, told) | 3 / 3 / 3 / 6 |

Exactly N teeth on every lobe would need a per-lobe rim law, which this session did
not build. It is §7 Q2.

**The floor and the fold cap still apply.** The 1 mm relief floor, the fold cap
(the NONE FIT row: 39 asked, cap 0.08 mm, under the floor, no teeth, told) and the
rows cap all bind as before. Where teeth do not fit, fewer are built and the
read-out says why.

**One new cap, and why it was owed.** A lobed blade stations its rows uniformly in
`u` (`lobedStations`), while the teeth are even in ARC LENGTH. Near the tip the
outline turns, so the last period can be narrower than one row gap. Its tooth then
falls between two rows: declared, and never drawn. LF29(d) found **15 such states**
in the 2,000-state sample, every one a margin tooth in u 0.983–1.000 at a large tip
shape. The count now also gives until every declared margin period holds a station
strictly inside it, told as `rows`. It is a BRANCH: only a caller handing its
stations declares it, so SIMPLE and COMPOUND are untouched by construction (§5).

## 5. The partition, the cost, the re-records

**Byte partition**: `node tools/verify-bloom-defaults-bytes.mjs --base <worktree of
2e096bf> --mover lobed --pair set`, 32 shards, merged.
- **PASS. 36 predeclared MOVERS / 1,226 HOLDERS over 1,262 paired rows, both
  modes.** 1,556,730,972 export floats and 196,434,226 captured-grid values.
- Every mover moved and every holder held to the bit: every SIMPLE, COMPOUND and
  leafless row.
- The movers are predeclared from the BASE tree's own record (a built LOBED leaf).
  Every LOBED row moves, through the roundness, the tooth count or both.
- 3 base and 20 head rows are unpaired: the three relabelled or redefined rows and
  block 57.

**Roundness 0 identity**: 40 of 41 base LOBED rows bit-identical with teeth off
(§2).

**Cost**: unchanged on both trees.
- **5,980 triangles per lobed leaf** (the lattice is fixed).
- The whorled-8 cost corner: **170,410 triangles, 11.4 % of the 1,500,000 budget**,
  in live and export (about 8.5 MB of STL).
- The default bloom (no leaf) is untouched.

**Matrix**:
- Block 57 adds 17 rows (`LOBED ROUNDNESS:`, `LOBED YIELD:`, `LOBED TEETH:`),
  including two GATED rows (SIMPLE, COMPOUND).
- Three block-56 rows are relabelled or redefined:
  - the NONE FIT row and the fold-clamp row now ask their teeth through the LOBED
    count (3 a lobe and 1 a lobe);
  - S4b's NO ROUND BOTTOM FITS row is now **THE LOBE COUNT YIELDS — 5 asked, 3
    built, at 30°**.
- Live matrix 1,265 → 1,282. **`frozen/phase60` is the 1,265 rows at `2e096bf`**,
  registered in both maps and proved deep-equal (`--verify-frozen --phase60`). No
  workflow file is edited, so no `TAG_PUSH_XFAIL` entry is owed.
- Smoke block 57 has 7 rows; the census reads 209 rows over 53 blocks.

**Why the yield row is at 30° and not S4b's 40° — A PRE-EXISTING S4b DEFECT, FOUND
HERE.** At 40° the 3-lobe tilt sits exactly on its cap, and S4b's own round-bottom
back wall then crosses LF22 by 2e-4: the innermost cells advance **0.4998** of the
midrib against the declared 0.5, at rows 52–53. Identical on the base tree with 3
lobes asked directly, at roundness 0 and with no teeth. The back wall carries the
V's steepest pitch along its whole length, and on a tilt-capped blade that pitch IS
the fold limit, so the skin's varying bead inset takes it 2e-4 over. At 30° the
same yield (5 → 4 → 3) happens with the tilt uncapped, and the row reads clean.
**Recorded, not fixed**: the fix is S4b's wall law (a slope strictly inside the
fold limit) and moves S4b bytes. §7 Q4.

**E2 re-records** (`E2_TURN_XFAIL`, the bead class S4 declared; never widened). The
smoke LOBED rows were re-measured on this tree:

| row | was (S4b) | now |
|---|---|---|
| the MUM | 38.227 | **41.772** |
| sinus max | 48.743 | **70.119** |
| angle max | 30.631 | **29.902** (improved) |
| S4's form | 29.003 | **30.119** |
| petiole CLAMPED | 13.372 | **24.185** (no sinus: the move is the 21 teeth against 12) |
| NONE FIT (relabelled) | 50.306 | **50.178** |
| fold clamp (relabelled, 1 a lobe) | 45.518 | **47.328** |
| the yield (redefined) | 68.803 (as NO FIT, 40°) | **48.996** |

Six block-57 smoke rows are declared new, at 35.3–49.8. `verify-bloom-edge-profile`
reads PASS on the smoke LOBED rows.

**Combination gate**:
- `lobedwidth-x-leafangle @ 70 x 34` moves **0.6991 → 0.6544 mm**, re-recorded,
  WORSE. The shipped roundness widens the first sinus, which sits near the base the
  stem approaches. `leafAngle` 70 alone reaches this class.
- **New pair `lobedround-x-sinus`** (tier 2, `leaf-stem`). CG1 says the roundness
  reaches the measure: 0.045 mm at sinus 0.55. At the shipped 35° the grid
  **CLEARS** (worst 3.455 mm), so the verdict is `clears`. At 70° every cell is
  under the bar from the angle alone (0.586–0.699).

## 6. Gates

New clauses, each seen red on a mutant first and witnessed on the MUTATED module:

- **LF27**, the radius:
  - the record's roundness is the control;
  - the pitch is restated from the crests at 1e-7 relative, and the asked radius
    within one grid step;
  - `R_min >= D/2` iff the sinus needs it;
  - shrunk and floored are biconditionals, and `radius = max(asked, R_min)` unless
    shrunk;
  - the emitted rows lie ON the declared disc, read in the bottom's own tilt frame
    (no row inside it, every cut row inside the arc on it).
- **LF28**, the yield:
  - the ask is the control, and `1 <= built <= asked`;
  - `yielded` is a biconditional;
  - the attempts run in order (a count is given up only on a NO FIT, the first that
    fits is built), and a residual means every count down to one failed;
  - a yield must be EARNED, restated from the asked count's own outline;
  - the page's yield equals Node's rebuild.
- **LF29**, the tooth count:
  - teeth a lobe is the control, and the rim's ask is `per x (2 built + 1)` on the
    record, the plan and the serration;
  - fewer built iff told;
  - every declared margin tooth holds a cut emitted row inside its period;
  - the per-lobe tally sums to the built count.
- **Inertness:** two statements each for the two new controls at harness load, and
  GATED rows under SIMPLE and COMPOUND.

**Re-derived, seen red first, never loosened:**
- **LF20**: the minima are counted against the BUILT count.
- **LF25(a)**: a sinus that opens is rounded only where the roundness asks; at
  roundness 0 it is S4b's law.
- **LF25's depth clause**: its reference was an 8,192-sample minimum, which reads
  HIGH by the step squared, so it fired at the sixth decimal on five sampled
  states. It is now refined by a ternary search; the 1e-9 bar is unchanged.

**Mutants** (`tools/verify-bloom-apex-mutants.mjs`), each firing the clause it
names on the LOBED rows:
- `the-roundness-is-ignored` → LF27
- `the-radius-is-typed` → LF27
- `the-count-yields-before-the-radius-shrinks` → LF28
- `the-count-never-yields` → LF28
- `the-lobed-tooth-count-reads-the-shared-one` → LF29
- `the-teeth-per-lobe-span-the-whole-rim` → LF29

Fourteen S4/S4b lobed mutants were re-run and fire. Four had their witnesses
re-pinned, never their clauses:
- S4b's three round-bottom mutants are witnessed at roundness 0.
- The tilt-cap witness is at 2 teeth a lobe (at 21 teeth the unclamped 60° folds no
  cell on that form).
- `a-lobe-is-dropped` reads the declared count, since the mutated law now yields.
- The constant-radius mutant was re-anchored.

The table gained `--rows=<regex>`, a ROW SUBSET flag that says so on its last line.
CI's sharded sweep is the full pass.

**Local runs (subsets, the merge criterion is CI's full matrix):**
- export watertight: **61 of 61 LOBED rows PASS** (the yield row at 30°, re-run
  alone);
- connectedness: **17 of 17 smoke LOBED rows, one piece**;
- smoke `--check` OK;
- panel gate PASS;
- defaults bar PASS;
- edge profile PASS on the smoke LOBED rows;
- LF8 directed edges: 0 on every row run.

**Off-matrix findings in S4b's own clauses, reported, not this session's.** The
2,000-state sample was run through LF19–LF29 in Node, and S4b's clauses fire on
uniformly sampled states that are not matrix rows:
- LF20 on 16 states (the same 16 on the base tree);
- LF22 on 7 (14 on the base);
- LF26 on 10, the area law against the trapezoid, at 0.01–0.12 mm² (11 on the base).

Nothing new class-wise. Their state lists are in the session scratch, not committed.

## 7. Open questions

1. **The roundness default (0.12)** — Eva's, from the sheet's macro and sweep rows.
2. **The per-lobe tooth default (3)**, and whether "per lobe" should mean an exact
   count on every lobe. That would need a per-lobe rim law; today it is an average
   along the rim (2 / 3 / 3 / 5 on the mum).
3. The residual (0.9 %): accept the told V, or give the user a lever (a longer lobe
   window is the only one that helps).
4. S4b's tilt-capped back wall (LF22 at 0.4998 against 0.5; §5): fix the wall law,
   at an S4b byte cost.
