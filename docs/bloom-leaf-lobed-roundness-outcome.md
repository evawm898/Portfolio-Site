# Leaf/stem build S4c — sinus roundness, the lobe-count yield, the lobed tooth count

Eva's four rulings on S4b (`docs/bloom-leaf-lobed-rulings-outcome.md`, the sheet
`docs/img/leaf-lobed-rulings.png`), built into the generator. Base: `main` at
`2e096bf` (S4b, #387). The sheet for this session is
**`docs/img/leaf-lobed-roundness.png`** (`node tools/shot-bloom-lobed-roundness.mjs
<png> --base <worktree of 2e096bf> --sample-head … --sample-base …`), print preview
ON, every number on it read off the build's own record.

**Two things are Eva's to rule from that sheet: the roundness default (0.12, a
proposal) and the per-lobe tooth default (3, a proposal).**

**RULED (Oct 10) — §8:** roundness 0.12 (0.18 rejected); 4 teeth a lobe at 130 rows,
unclamped (28 of 28 on the mum, 3 / 4 / 4 / 6, pinned in LF31); the dead travel
measured, told and hatched; the shoulder ledge filleted tangent. The follow-up sheet
is `docs/img/leaf-lobed-follow-up.png`.

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

## 8. Eva's rulings on S4c — the follow-up (Oct 10)

Base: `main` at `f9ebcaf`. The sheet is **`docs/img/leaf-lobed-follow-up.png`**
(`node tools/shot-bloom-lobed-follow-up.mjs <png> --base <worktree of f9ebcaf>`),
print preview ON, every number on it read off the build's own record or measured
on that tree's own outline law.

### 8.1 Ruling 1 — roundness 0.12 (0.18 rejected), recorded

`lobedRound` defaults to **0.12** in the registry and in `LOBED_ROUND_DEFAULT`,
both checked at harness load (LF31). The §7 Q1 proposal stands as ruled; 0.18 was
rejected.

### 8.2 Ruling (a) — 130 rows and 4 teeth a lobe, unclamped

Two other options were rejected: (b) a told clamp, and (c) keeping 3 a lobe.

**The ruling:** `LOBED_BLADE_ROWS` 112 → **130** and `lobedToothCount` 3 → **4**.

The rows cap was the binding cap. Teeth built on the default mum leaf, 28 asked:

| rows | built |
|---|---|
| 112 | 24 |
| 120 | 25 |
| 128 / 129 | 27 |
| **130** | **28** |

Six teeth a lobe (42 asked) would need 192 rows. It stays a told cap: the
`LOBED TEETH: max` row builds 28 of 42.

**What ships, measured in both modes:**
- **28 of 28 teeth** on the default leaf, split **3 / 4 / 4 / 6** from base to
  terminal.
- **6,916 triangles a leaf**, against 5,980: +936, +15.7 %.
- **The whorled-8 corner is 192,874 triangles, 12.9 % of the budget** (it was
  170,410, 11.4 %).
- The default bloom (no leaf) is untouched.

**Pinned (LF31), so a later change cannot move these quietly:**
- `LOBED_RULED_PINS` holds the rows, the per-lobe default, the roundness default,
  28 asked and 28 built, the split, the leaf's triangles, the saturation (0.1750 —
  re-measured by §8.6's fix; it was 0.1754),
  the corner's triangles and its budget share.
- The module refuses to load if the rows constant, the tooth default or the
  roundness default leaves its pin.
- On every matrix row at the ruled leaf, the clause checks every leaf's serration,
  the split and `leafTris`. On the corner row it checks `liveTris` and the
  percentage too.

### 8.3 "Per lobe" is an average, and the control says so

The rim law is unchanged (MODEL B: teeth evenly spaced in arc length along the
whole rim), so a lobe carries its share by length. That is why the split is
3 / 4 / 4 / 6 and not 4 / 4 / 4 / 4.

- The label is now **"Teeth per lobe (average)"**.
- The read-out says `4 a lobe ON AVERAGE along the rim, not on every lobe`.

### 8.4 Ruling 3 — the roundness's dead travel, found, told and hatched

**The saturation point is measured, not assumed.** Every sinus has a **largest
smooth radius** (`radiusFitMm`): the largest radius whose round bottom still fits,
meaning:
- both walls meet their flanks inside the half-period;
- both shoulders are filleted tangent (§8.5);
- the opening is held.

It is bisected over a **fixed bracket** — the print minimum up to 0.5 × the pitch —
floored onto `LOBE_RELIEF_GRID`. Because the bracket is fixed, the answer does not
depend on the roundness asked. Every roundness at or above `radiusFitMm / pitch`
therefore builds that sinus **bit-identically**, so the dead travel is exactly dead
and not merely close.

The leaf's `saturatesAt` is the largest over its sinuses; null means it never
saturates inside the range.

| leaf | saturates at | dead from (slider step) |
|---|---|---|
| **the ruled mum** | **0.1750** (0.1754 before §8.6) | **0.18** |
| S4's form (sinus 0.62, shape 0.70, angle 38) | 0.1388 (0.1391 before §8.6) | 0.14 |
| the base tree's mum (`f9ebcaf`) | — | 0.30, unmarked |

Eva's "about 0.2" was close for the mum. **On the base tree the travel above 0.30
moved nothing and carried no mark**, and route (ac) reads red there.

**How it is told** (the `stamenSpread` precedent):
- The registry row declares `cap` from the shown build's own `saturatesAt`.
- `applyCaps` draws the tick and hatches the dead travel.
- The read-out says `saturates at X` below it, and `SATURATED — from X up …` on a
  dead step.
- The range is not narrowed, and the maximum is not adaptive.

**Panel route (ac)**, the twenty-third route:
- It finds the first dead step by REBUILDING the leaf at slider steps and comparing
  the emitted half-widths exactly. It never reads the record.
- It requires the mark both ways, at exactly that step, on the mum and on S4's
  form.
- Under `--negative-control` it re-serves the registry twice with the cap MUTATED:
  - **halved** — the hatch lands on live travel;
  - **removed** — the dead travel is left unhatched.
- **Each mutant fails by its own sentence. All twenty-three routes observed their
  failure.**

**Across 500 uniform states at roundness 0.12** (the S4c sampler):

| what the slider does | leaves |
|---|---|
| no sinus to round | 6 |
| no dead travel | 76 (unchanged by §8.6) |
| dead part-way (saturating between 0.029 and 0.459, median 0.160) | 82 (median 0.163 before §8.6) |
| **entirely dead (saturating at 0)** | **336** (unchanged by §8.6) |

The 336 are mostly leaves whose sinuses are all BROAD (the asked V already opens
past 1 mm): no radius of that size builds with smooth shoulders, so the roundness
has nothing to do there. The whole track is hatched and the read-out says so.

**That is a behaviour change against the base tree, and Eva should see it.**
- Over 300 sampled states at 0.12, the base tree rounded **151** broad sinuses that
  this tree leaves at their asked shape.
- On the base tree, **150 of those 151** had cornered shoulders: worst turn per
  sinus median **23.6°**, p90 105°, max 144°.
- That is the ledge class of §8.5. So leaving them alone is ruling 4 applied, not a
  loss: the asked broad sinus is already printable.
- 41 broad sinuses are rounded on both trees, 1 on this tree only. At 0.3 the base
  tree rounds 471 broad sinuses and this tree 47.
- Re-checked after §8.6 with a second classifier over the same 300 states: it
  reads the SAME counts on the commits before and after the fix (151 on main only,
  0 on this tree only, 33 on both; at 0.3, 419 / 0 / 43), so §8.6 does not move
  this finding.

### 8.5 Ruling 4 — the ledge was the shoulder corner, and it is filleted

**The cause, measured.** S4b's round bottom is a U: a straight wall, the disc, a
straight wall. Each wall ran at the flank's own pitch and met the asked flank at a
**corner**. On the default leaf at 0.12, sinus 2 (teeth off, so the join is the
only feature), the turn there is:
- **−48.98°** at the back shoulder;
- **−17.27°** at the front shoulder.

That is the ledge Eva saw. **It is not a tooth.** It is on the lobed outline before
any tooth is cut, at the place the cut meets the flank.

**The fix: a tangent fillet at each shoulder.** `lobedRoundBottoms`' `shoulder()`
fits a circle tangent to both the wall line and the flank:
- It works in the leaf's own (along, across) mm plane. The chevron tilt is affine
  there, so a join that is C1 there is C1 on the planform.
- Its radius is the round bottom's own R, or the largest that fits, solved by
  bisection.
- Where even a small fillet cannot fit, the shoulder keeps its corner and the
  record says why:
  - `disc` — the flank already lies under the wall at the disc tangent;
  - `crest` — the wall lies under the flank at the crest;
  - `no room`.

**A radius FITS only where both shoulders carry a fillet of at least
`min(R, MIN_FEATURE_MM/2, the print minimum's own fillet on that side)`.** A larger
radius that would pinch a shoulder sharper than that gives, in the ruled order. So
the shoulders stay tangent wherever a larger radius is built.

**After, same leaf, same sinus**, turn measured with one-sided tangents 1e-6 of the
blade apart:
- back shoulder: **−0.008°** at the flank end, **−0.017°** at the wall end;
- front shoulder: **−0.00°** and **−0.005°**;
- where the back corner was (u 0.3337): **−0.024°**.

**LF30 is the clause:**
- (a) It measures the turn at BOTH ends of every filleted shoulder on a Node rebuild
  of the law, against a bar of 0.1°.
- An unfilleted shoulder must carry its reason.
- (b) The page's own rows inside each fillet must equal the law to 1e-9.
- (c) The page's shoulder records must equal the rebuild's.
- Over the matrix: **620 joins on 52 rows, worst 0.0028°**, with no told corner on
  any row (the gate's own count, before §8.6). Re-measured in Node over every row
  that builds a lobed leaf after §8.6: **666 joins on 54 rows, worst 0.0024°**
  (the same instrument reads 666 / 54 / 0.0028° on the commit before).

**Mutant `the-shoulder-is-a-corner-again`** puts the wall-meets-flank corner back.
- It fires LF30.
- Its witness, on the mutated module's own default leaf, reads more than 5° at
  `cornerU`, against under 1° clean.

Block 58 carries a told corner (`disc`, 5 lobes on a 58 mm blade at lobe shape
1.5). Across 500 sampled states at 0.12:
- **652 of 680 shoulders are tangent** (448 of them gave);
- **28 are told corners** (20 `disc`, 8 `no room`).
- (Before §8.6: 653 tangent, 450 gave, 27 corners, 20 `disc` / 7 `no room` —
  reproduced exactly by the same sampler on that commit.)

**What is left, and why it is not fixed.** At the very bottom of the sinus, the
seat offset meets the floor clamp in a step **14.6 µm long**:
- two turns of −67° and +58° at the 1e-6 scale;
- identical on both trees.

It is far below print resolution (a layer is about 100 µm, Nylon 12's resolvable
detail about 350–400 µm). Fixing it would be a second change to the floor law and
would move S4b bytes. It is reported and photographed on the sheet.

**The cost:** the shoulders take the outline from about 65 to **83 ms** (500 states,
export). The fit search probes a bar rather than solving every fillet in full. The
triangle count is unchanged, because the lattice is fixed. §8.6's wider stencil takes it to **99 ms** (81 ms on the commit before,
the same 500 states in the same run).

### 8.6 The page and Node built different fillets — fixed at the cause; two tip folds declared

**Found by the export gate run locally on the LOBED rows before CI** (64 rows):
11 rows dropped on validity, for two separate reasons.

**1. The fillet's slope amplified last-bit noise.** X0 read 36–72 float32 values
per row where the page's STL and the Node rebuild of the page's own state differ,
and LF30(b) read the page's fillet rows 1.3e-9 mm off the law on three rows.
- The lamina itself agrees across the two engines to **7e-15** (measured, 2,001
  samples on the mum). The transcendentals are not correctly rounded, so Chromium's
  V8 and Node's differ in the last bit.
- The shoulder solve read the flank's slope by a central difference with a
  **1e-7 step**. That divides the noise by 1e-7 of the leaf, so the fillet centre
  moved by up to **2.5e-10 mm** and the outline by **2.8e-9 mm** between the
  engines. That was enough to put a float32 on the other side of a rounding
  boundary.
- And every fillet that GIVES (the largest that fits) lands its flank tangent ON
  THE CREST — 4e-7 in u from it on the shipped leaf. At a crest whose local power
  is under 1, the slope is unbounded, so no stencil there is stable.

**The fix (two parts, in `lobedRoundBottoms`):**
- **The slope is a fourth-order central difference at the widest step the flank
  allows.** The step is a fraction of the half-period (`LOBED_SLOPE_STEPS_PER_HALF`
  = 64) and never more than an eighth of the distance to the nearest KINK the
  lamina has. The kinks are the law's crests and sinuses plus the envelope's own
  declared tangent breaks (`laminaSlopeBreaks`). One break, the widest point under
  a tip shape below 1, sits 7e-4 in u from a shoulder on the told-corner row; a
  stencil across it read 2.7° off.
- **A fillet's flank tangent stands clear of the crest** by `half /
  LOBED_CREST_CLEAR_PER_HALF` (1024: a sixteenth of a stencil step). A fillet is
  tangent to the FLANK; at a cusp crest it would be tangent to nothing two engines
  agree on.
- Rejected, both measured: an ADAPTIVE step (halve until two stencils agree)
  ends small on most rows and put the outline's noise back to 1e-10; a step that
  ignores the kinks reads 2.7° at the widest point.

**Measured across the two engines** (the same `lobedOutline`, in the page's
Chromium and in Node, 59 LOBED rows, 4,001 outline samples each), with the
shipped leaf's saturation and the edge-profile gate's E2 on the mum beside it:

| clearance | shoulder records | outline | float32 straddles | mum saturates at | mum E2 face turn |
|---|---|---|---|---|---|
| none (before) | 2.5e-10 | 2.8e-9 | 3 of 236,059 | 0.1754 | 82.0° |
| one stencil step | 5.6e-14 | 2.4e-12 | 0 | 0.1687 | — |
| a quarter step | 1.7e-13 | 5.8e-12 | 0 | 0.1737 | 99.7° |
| **a sixteenth (shipped)** | **1.3e-12** | **1.5e-11** | **0** | **0.1750** | **82.1°** |
| a sixty-fourth | 8.9e-13 | 7.7e-11 | 0 | 0.1753 | — |

**Why a sixteenth and not a quarter, found by E2 and not by the noise probe:**
the clearance leaves a stub of raw flank between the crest and the fillet. At a
quarter step that stub is ~0.02 mm on the shipped leaf, far shorter than the
0.45 mm bead, and the bead over it turned the mum's worst face 99.7°, where it
was 82.0°. At a sixteenth it reads 82.1°. The noise is ten times the quarter
step's and still gives 0 straddles. The local export gate on the 64 LOBED rows
is the confirmation (§8.7).

**What it moves** (all on LOBED leaves; the code is reachable only through
`lobedOutline`):
- The shipped leaf's saturation goes **0.1754 → 0.1750** and S4's form's
  0.1391 → 0.1388. The live/dead structure of the slider is unchanged (0.17 live,
  0.18 dead on the mum; 0.14 the first dead step on S4's form).
- The fillets that gave are a hair smaller. The shoulders stay tangent: worst
  **0.0024°** (§8.5).
- `LOBED_RULED_PINS.saturatesAt` is re-measured to 0.1750. That pin is this
  session's own measured addition, not one of Eva's ruled numbers (28 / 28,
  3 / 4 / 4 / 6, 6,916, 192,874 and 12.9 % are unmoved).
- Eleven E2 records on LOBED smoke rows moved by at most 0.26° and are
  re-recorded with the figure before them (`E2_TURN_XFAIL`, never widened).
- The sampled figures in §8.4 and §8.5 are re-measured, with the before figures
  beside them.

**2. Two rows fold at the leaf tip with 4 teeth a lobe.** X2 read new
within-shell pairs on two rows that read 0 on main:

| row | pairs · worst span |
|---|---|
| `LOBED: lobedEase max (0.95)` | 18 · 0.0026 mm |
| `LOBED YIELD: 6 lobes asked on a 12 mm blade (6 -> 2)` | 21 · 0.0892 mm |

- **Every pair is at the leaf tip**, where the half-width is ~1.1–1.2 mm, on every
  leaf.
- **It is the TOOTH COUNT.** The same rows read the same pairs on this tree with
  the rows put back to 112, and the same pairs on main's geometry with only the
  tooth default set to 4. A fourth tooth a lobe reaches into the converging tip.
- It is the lobed TIP, which S4 already records folding on 139 of 972 extreme
  corners with no matrix row; these are the first matrix rows to reach it.
- **Declared in `SELF_INTERSECTION_XFAIL` with these numbers, not clamped**: the
  ruling is 4 a lobe UNCLAMPED. Eva's to rule whether the tip should give a tooth.
- The 6 → 2 yield row's E2 record comes OFF `E2_TURN_XFAIL`: E2 exempts a declared
  self-intersector, and a record nothing evaluates fails the full run.
- **The census over all 60 rows that build a lobed leaf** (`bloom-census-sweep`,
  Node, EXPORT) reads 0 on every undeclared row and every declared row at its
  record.

### 8.7 Verification

- **Byte partition:** `verify-bloom-defaults-bytes --base <worktree of f9ebcaf>
  --mover lobed --pair set`, 6 shards, merged. **PASS:**
  - **54 of 54 predeclared LOBED movers moved; every holder held**;
  - 1,573,218,072 export floats and 197,851,506 captured-grid values, both modes;
  - the one holder "red" is the `--control`'s own 1e-9 perturbation of DEFAULT;
  - **no non-LOBED row moved**;
  - 4 head rows are unpaired: block 58.
- **Combination gate**, both LOBED pairs:
  - CG3 clean, so every declared magnitude reproduces and nothing is re-recorded;
  - `lobedround-x-sinus` still CLEARS (worst 3.514 mm, was 3.455);
  - `lobedwidth-x-leafangle` reads 0.654 mm at 70 × 34, unmoved.
- **Defaults bar: PASS** (10 shipped states).
- **Panel gate:** PASS, and its `--negative-control` observes all twenty-three
  routes.
- **E2 re-records** (`E2_TURN_XFAIL`, never widened). The 16 LOBED smoke rows were
  re-measured, because the teeth moved, and again after §8.6 (a dash: unmoved by it):

| row | E2 turn (excess) | before §8.6 |
|---|---|---|
| the mum | 32.876 | 32.720 |
| sinus max | 64.837 | 64.971 |
| angle max | 23.137 | 23.105 |
| NONE FIT | 53.575 | — |
| 6 lobes / 1 tooth | 45.584 | 45.588 |
| S4's form | 26.924 | 26.696 |
| the yield | 45.557 | — |
| petiole clamped | 2.507 | — |
| roundness max | 37.320 | 37.432 |
| 0.3 × S4 | 32.034 | 32.293 |
| yield 6 → 2 | OFF the list (a declared self-intersector now; E2 exempts it) | 64.891 |
| residual | 20.913 | 20.913 |
| teeth 2 | 51.829 | 51.821 |
| teeth max | 33.699 | 33.549 |
| rulings 0.18 | 37.320 | 37.432 |
| rulings corner | 28.346 | — |

- **No frozen phase is owed.**
  - The base matrix at `f9ebcaf` is `frozen/phase62` row-for-row, already published.
  - Block 58 adds four rows (1,282 → 1,286), and the three relabelled block-57 rows
    are live-matrix labels only.
  - No workflow file is edited, so `TAG_PUSH_XFAIL` stays as it is.
- **Matrix:**
  - Block 58 adds 4 rows: 3 a lobe, roundness 0.17, roundness 0.18, the told corner.
  - Three block-57 labels are restated to the ruled numbers.
  - Smoke block 58 has 2 rows.
