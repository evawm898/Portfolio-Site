# Leaf/stem build S5 — the leaf tip and the broad sinuses

Eva's rulings of Oct 10 on `docs/img/leaf-lobed-follow-up.png`, built into the
generator. Base: `main` at `d6d2ab4` (S4c's follow-up, #394). The sheet for this
session is **`docs/img/leaf-tip-broad-sinus.png`**
(`node tools/shot-bloom-leaf-tip-broad-sinus.mjs <png> --base <worktree of d6d2ab4>
--numbers <json>`), print preview ON, every number on it read off the build's own
record.

Two jobs, one PR:

1. **The leaf tip.** Every leaf ended on the beaded 1.60 mm stub — a narrow neck and a
   bulb. Now the tip closes on the petal's own nib: a smooth point, rounded only as
   much as the print minimum and the bead need. Where a tooth would land in the
   converging tip, the tip gives it up.
2. **Broad sinuses are rounded too.** A sinus whose asked V already opens gets a fillet
   at the V point, so the roundness slider is live on it. Narrow sinuses keep their U
   bottom exactly as built.

**The pinned constraint holds, unmoved to the digit:** the ruled default mum builds
**28 of 28 teeth (3 / 4 / 4 / 6) at 6,916 tris a leaf**. Its sinuses are narrow and
none is filleted. Its round bottoms read **1.74578857 / 1.23121643 / 1.24281311 mm**
and it **saturates at 0.17501800050969543**, identical to the base tree. LF31 is
untouched. One number moves, and only below the gate's resolution: the lobed
petiole, by 7e-6 mm (§1.5).

---

## 1. Job 1 — the leaf tip

### 1.1 What made the nib, and where

**One law, three types.** SIMPLE leaves, COMPOUND leaflets and LOBED blades all
end through `widthProfile`, whose outline was
`max(law, root blend, TIP_HALF_MM)`. The superellipse tip law reaches exactly 0 at
`u = 1`. So wherever the law fell under the 0.80 mm floor, the outline ran **parallel
at the floor to the end**. Every leaf therefore finished on a 1.60 mm stub. The rim
bead (S2) then closed that stub on a half-round, which is the bulb.

**The neck is the law meeting the floor at a corner.** The outline falls along the
law, flattens abruptly onto the stub (the "neck") and then rounds out (the "bulb").
The petal had exactly this until the apex-nib session (#283). That session excluded
leaves by declaration and parked their case in its §11 backlog. This session closes
that item.

### 1.2 The fix: `leafNibPlan`, the petal's construction with its start solved

The petal's `apexNibPlan` bisects for the law's crossing of `TIP_HALF_MM`. From there
it runs a straight flank on the law's own tangent down to `APEX_HALF_MM` (0.20), then
an arc centred on the axis to the 0.10 mm mini-face. The petal **keeps the law's
length** (Eva's petal ruling): the blade is drawn to wherever the arc closes, so its
drawn length differs from the asked length.

**A leaf may not do that.** Every reparameterisation that changes the drawn length
moved the mum's saturation (0.17502 → 0.17512, outside LF31's ±5e-5). So
**`leafNibPlan` solves the START instead**: where on the law the flank leaves it, so
the arc closes exactly at `leafLength`. The outline below the floor crossing is
bit-identical to the base. There are three regimes, and each is told on the
read-out:

| regime | where the flank leaves the law | joint |
|---|---|---|
| **TANGENT** | at a station PAST the floor crossing, under the floor, on the law's own tangent | C1 |
| **FLOOR** (low exponents, ≲ 1.2) | at the crossing itself, on a slope SHALLOWER than the law's | a told corner, `kinkDeg` |
| **STEEP** (round law ends, n ≳ 2.5) | where the law reaches `APEX_HALF_MM`, on a steeper slope | a told corner |

Over a 90-blade sweep per type (tip 0.6–3.0 × width 3 / 17 / 40 × length 6 / 46 /
120, EXPORT):

| type | floor | tangent | steep | rises past the peak | ends off the face | worst corner |
|---|---|---|---|---|---|---|
| SIMPLE | 41 | 29 | 20 | 0 | 0 | 24.07° (tip 0.6, 3 × 6 mm) |
| COMPOUND | 40 | 30 | 20 | 0 | 0 | 26.69° (same corner) |
| LOBED | 41 | 30 | 19 | 0 | 0 | 21.62° (same corner) |

The largest corners all sit on the smallest, narrowest, most acute blade. At 46 mm
they read 4–7°.

**The nib owns everything from the floor crossing on.** In the TANGENT and STEEP
regimes, the stretch between the crossing and the flank's start is the law itself,
under the floor. If the plan handed back `null` there, the mode's floor would win and
step the outline down at the flank's start; that was measured, and is why the plan
returns the law. **The last row is the face, by branch.** On a round law's
near-vertical end, the solved slope reaches the thousands and the circle evaluated at
`L` read 0.05000002.

**One owner for the crossing: `nibCrossing`.** The two guards (a blade that never
clears the floor; a squared terminal holding it above) and the bisection were written
twice, once per plan. That was a second producer of one boundary, and the mutant
table's anchors on those lines matched twice and **disarmed three petal mutants**
(§9b(i) of the seam session's doc; this is the same class). Both plans now read one
function. The petal's bytes are unmoved, as measured by the partition (§4).

### 1.3 No tooth cuts the nib; the tip gives a tooth up

`leafHalfAt` draws the BASE outline wherever the nib owns the row, so no notch is ever
cut into the converging tip. Before S5 the floor under every drawn row did this by
accident. The nib takes the floor away, and a leaflet whose tooth period ran past the
crossing then had its tip dug to 0.05 mm (measured on the compound row of block 59).

**The tip gives a tooth up through the count.** The lobe machinery's relief-floor
yield already gives up teeth whose sinus lacks 1 mm of material. In the nib zone that
headroom is 0, so a sinus landing in the converging tip is given up. The record
carries `tipYield { given, atU }` when the first failing sinus lies past the widest
point. The read-out tells it the way the other yields are told, appending to the
teeth line: *"the converging TIP gave the first up (its notch at u … has no … mm of
material where the blade closes on its nib; a tooth there would fold)"*. The slider
keeps the asked value, and asked against built is printed. Over the corner sweeps
(§2), the tip gave a tooth up on **36 of 243 SIMPLE, 42 of 243 COMPOUND and 180 of
972 LOBED** corners.

**The nib's cup is the petal's.** The cup lift scales by `hb / TIP_HALF_MM` on the
nib (the petal's `cupScale`), so a cupped leaf does not fold its own nib.

### 1.4 The two former fold rows were never a tooth's

#394 declared two tip folds in `SELF_INTERSECTION_XFAIL`, attributing them to the 4
teeth a lobe:

- `LOBED: lobedEase max (0.95)`: 18 pairs, 0.0026 mm
- `LOBED YIELD: 6 lobes asked on a 12 mm blade (6 -> 2)`: 21 pairs, 0.0892 mm

**Measured on the base tree with the teeth OFF (`lobedToothDepth` 0), both fold
identically**: 18 pairs / 0.0026 and 21 / 0.0892. So the folds were the beaded stub
at the 130-row stationing, and no tooth was involved. On this tree **both read 0
pairs with every tooth still built** (28 of 28 and 20 of 20, 6,916 tris), with teeth
on and off. Both entries are off the list and X2 now holds them at 0.

**What this means for the ruling.** "Where a tooth would fold in the converging tip,
the tip gives that tooth up" is built (§1.3) and is told. It is not what cleared these
two rows. The nib cleared them, and the reason is a measurement, not a reading. The
yield has a row of its own in block 59 (`LEAF TIP: the tip gives its tooth up`).

### 1.5 The stations: three arc rows, the count fixed

A leaf runs no ladder, so its row count is fixed and every row the arc takes, another
stretch gives. `LEAF_ARC_ROWS = 3` (not the petal's six). With six, the lobed base
stretch gives six rows and two 60-degree corners fold IN THE LOBE WINDOW (46 and 132
pairs; 0 on the base tree). With three, no corner folds that did not fold on the base.

- **SIMPLE and leaflets:** the first `RIM_TIP_ROWS` stations stay the pre-S5 doubles,
  so a leaflet's beaded base and its stalk do not move. The rest spread evenly over
  `[RIM_TIP_ROWS / nu, arcU]`, then 3 arc rows. Taking the arc's rows from the tip end
  instead coarsens exactly where the bead folds.
- **LOBED:** the tip stretch keeps its `i / LEAF_BLADE_ROWS` spacing short of the arc,
  and the UNIFORM stretch below pays. Measured against the tip stretch paying, on the
  972-corner sweep: tip-paid reads 7 corners worse than base (a coarser tip stretch
  next to a nib folds a wide 60° chevron, up to 136 pairs); uniform-paid reads 1 worse
  and 43 better.
- **The cost is mid-blade re-faceting.** Every station of the blade moves by a fraction
  of a gap. That moves the lobed petiole by 7e-6 mm (the area law reads the outline at
  the round bottoms, which sit 3e-7 mm off where they were), and it moves the edge
  profile's E2 readings mid-blade in both directions (§3.3). None of the E2 movement is
  at the nib.

---

## 2. The tip census — before and after

`node tools/bloom-lobed-tip-corners.mjs` (new; `--grid simple|compound`, `--root`,
`--part`, `--merge`). S4 reported "139 of 972 corners folded at the lobed tip" from a
script that was never committed, so its grid could not be recovered. This instrument
is **reconstructed** and its numbers are its own, never S4's. The grid is 3^5 × 2^2
on the axes the S4 doc names: tip shape, `lobedTo`, envelope width, chevron angle and
cup at their ends and default; `lobedEase` and `lobedLobes` at their ends. Mode is
EXPORT, one leaf on a bare 90 mm stem, censused over **that leaf's own triangles**. A
pair is "at the tip" past `lobedTo` (LOBED), in the last 10 % (SIMPLE), or within
2 mm of a leaflet end (COMPOUND).

| grid | corners | folded anywhere, base → S5 | at the tip, base → S5 |
|---|---|---|---|
| LOBED | 972 | **50 → 20** | **46 → 16** |
| SIMPLE | 243 | 6 → **0** | 6 → **0** |
| COMPOUND | 243 | 13 → **0** | 13 → **0** |

**LOBED: 43 corners better, 1 worse.** The worse corner is 0 → 4 pairs at a narrow
sinus mid-blade (u 0.75), because the stations moved. The 16 tip folds that remain
all have a **60° chevron**, most with cup 1.2. They fold identically with the teeth
off, so they belong to the chevron-and-cup class (S4c §8.6), not to a tooth and not
to the nib.

---

## 3. Job 2 — broad sinuses are filleted

### 3.1 The law

A **broad** sinus is one whose asked V already opens: S4b's opening is at least
`MIN_FEATURE_MM`, so the U bottom never applied. It now gets a **fillet**:
- **The shape:** a circle in the empty notch, tangent to both arms, in the leaf's own
  (along, across) plane.
- **The radius:** `R = lobedRound × pitch` on the relief grid, **shrunk** to the
  largest that fits with tangent joins, **floored** at the print minimum's half disc
  (0.5 mm). The fit is a bisection on a FIXED bracket, so every roundness above it
  builds bit-identically.
- **Where it takes:** the fillet is a FLOOR on the lobed outline's CORE term (`chev.fillAt`).
  That is a branch, so a leaf with no fillet builds bit-identically.
- **The fold check** runs on the drawn rows (S4b's own condition, the larger of row
  and fillet).
- **Exact tangency:** the front tangency is refined exactly (`nearestExact`). The joins
  turn ≤ 0.00017° against the 0.1° bar.

**Narrow sinuses keep the U exactly as built.** The branch is on the sinus's own
`need`, so a narrow sinus never reaches the fillet code (§4: the narrow-sinus bytes
hold).

**Told, never silent:**
- `SHRUNK` and `FLOORED` are told, as is `NO FILLET FITS` (where not even the 0.5 mm
  fillet fits).
- A fillet that fits but touches no drawn row is told **already round**. Every
  roundness then builds the same V, so its saturation is 0 and the slider is dead
  there by construction.

### 3.2 The slider is live on broad sinuses — the sampler

`node tools/bloom-lobed-sinus-sample.mjs --n 500 --set lobedRound=0.12` is S4c's
500-state sampler. It reproduces S4c's own base figures.

| at roundness 0.12, 500 leaves | base (`d6d2ab4`) | S5 |
|---|---|---|
| no sinus | 51 | 54 |
| slider live along its whole travel | 31 | **291** |
| dead part-way | 82 | 44 |
| **ENTIRELY DEAD** | **336** | **111** |

**Why the 111 remain dead — three no-room classes, nothing else:**

| class | leaves | why |
|---|---|---|
| narrow sinuses only | 31 | the U saturates at its print minimum (S4c's mechanism; by ruling, untouched) |
| a broad sinus with no room | 20 | not even the 0.5 mm floor fillet fits with tangent joins (told `NO FILLET FITS`) |
| already round | 60 | the sinus is rounder than the largest fillet that fits, so the fillet touches no drawn row |

On the base tree **243 of the 336 dead leaves carried only broad sinuses**. That is
the class this ruling exists for, and it is gone.

**The mum does not move.** Its sinuses are narrow (S4b's mum form), so none is
filleted. Its radii and saturation read the base tree's to every digit.

### 3.3 The hatch follows the new fit

`saturatesAt` reads the fillet's own fit (`radiusFitMm / pitch`) on a broad sinus. The
registry `cap` and `applyCaps` hatch the dead travel from there. Block 59's
`BROAD SINUS: roundness 0.49 / 0.50` rows sit either side of a fillet that saturates
at **0.4928**. Panel route (ac) holds the hatch both ways (the panel gate, §5).

---

## 4. The byte partition

`node tools/verify-bloom-surface-bytes.mjs --base <tree> --movers-predicate <name>`,
both modes, positionally under `Object.is`, run in resumable `--range` chunks and
closed with `--merge`.

- **Job 1 (`leaf-tip`, against `d6d2ab4`).** A row moves iff the BASE tree builds at
  least one leaf on it (its own plan chain, after the raceme's pin and the flowering
  node's cap). Every leafless row must hold to the bit, including every petal row: the
  petal's nib reads `nibCrossing` through a refactor. **PASS: 187 of 187 predeclared movers moved (SIMPLE 76, COMPOUND 47, LOBED 64 — each counted by the base tree's own plan type) and 0 floats moved on the 1,109 holders**, over 1,587,100,788 export floats / 176,344,532 triangles and 84,048,024 captured-grid values, the whole 1,296-row matrix in both modes.
- **Job 2 (`broad-fillet`, against the head with the fillet branch stripped).** A row
  moves iff this tree fillets a broad sinus on it. Every other row holds to the bit,
  narrow-sinus lobed leaves included. **PASS: 10 of 10 predeclared movers moved and 0 floats moved on the 1,286 holders** — among them **54 of the 64 lobed rows**, every one whose sinuses are narrow or whose broad fillet touches no drawn row (the mum included). The ten movers: the four block-59 `BROAD SINUS` rows, `LOBED: lobedLobes min`, `lobedShape max`, `a 10 mm envelope`, `leafTipShape min`, `LOBED ROUNDNESS: 0.5 x one lobe a side` and S4c's told shoulder corner. Over the same 1,587,100,788 floats and 84,048,024 grid values, both modes.

---

## 5. Gates

**New clauses, each seen red first and each with a mutant witnessed on the mutated
module** (`tools/verify-bloom-apex-mutants.mjs`):

| clause | asserts | mutant |
|---|---|---|
| **LF32** | from the RESTATED widest point (the blade type's two taper declarations, never the widest row) the base outline never rises; under the print floor every row is strictly narrower than the one before | `the-leaf-nib-bulges` |
| **LF33** | wherever the base outline is under the floor, the drawn row equals the base row exactly: no notch in the nib | `a-tooth-cuts-the-nib` |
| **LF34** | a broad sinus carries a fillet and a narrow one never does; the fillet follows its radius law; both joins are tangent; the drawn rows are the fillet | `the-broad-fillet-is-a-chord`, `the-broad-fillet-is-told-and-not-drawn` |

**LF32's first version started at the widest ROW, and a big enough bulb IS the widest
row.** The mutant (a 293 mm swell) went silent. The clause and its witness both start
at the restated widest point now. For a lobed blade, whose crests rise past the
widest point by design, the no-rise half starts at the first row under the floor.
This is the fifth durable rule (a clause whose subject excludes the thing it doubts),
caught by the mutant table.

**Re-derived onto the nib, not relaxed:**

| clause | what changed |
|---|---|
| LF9 | the fit stops at the crossing; the clamp record is a nib record; the last row is the face |
| LF11, LF12 | stations restated from the nib's own `arcU`; the cup's nib scale restated |
| LF16 | a leaflet's stations restated from its own nib record, now projected through `__bloomMetrics` |
| LF20 | nib rows skipped for the lobe comparison; a broad window ADDS where a narrow one cuts |
| LF26 | the reference and the measured rows both floored at the print floor, as the area law reads them. Seen red on the mutant table's yielding-count row: 370.333 against 369.415 mm², band 0.504 |
| LF27 | a broad sinus's floor is the fillet's 0.5 mm, not 0 |

**Mutant table: 9 run, all fire what they name, and the clean control is silent on
all 68 rows.**
- The 4 new mutants above.
- 5 re-anchored after `nibCrossing` and the fillet branch moved their find-strings:
  `plateau-returns`, `the-nib-is-never-cut`,
  `the-squared-terminal-no-longer-stands-the-nib-down`,
  `the-law-is-cut-above-its-own-crossing` and `leaf-clamp-record-lies`.
- New flag, `--why`: the table names families, never rows, so the clean control's
  LF26 on one row of 68 had to be found by hand; it now prints each leaf message beside
  its row.

**Edge profile, E2 (`verify-bloom-edge-profile.mjs`).** Run over all 190 leaf rows on
both trees (new `--all-fails` flag; the gate stopped at 40):
- **Base fails 52 of them, head 95.** Most are rows outside the smoke subset, failing
  on base too. CI runs the smoke subset.
- **No E2 site is at the nib.** Every one is mid-blade (u 0.15–0.90), where the arc
  rows re-space the stations (§1.5). They move in both directions: the round-tip LOBED
  row goes 41.7 → 2.7°, the 5 mm-pedicel shared node 37.1 → 7.1°, and the mum
  32.9 → 39.6°.
- **On the smoke subset, 19 declared entries moved and are RE-RECORDED with the before
  figure; 9 are new.** The new ones:
  - five shared-node leaves (+1.66°), mid-blade;
  - the 6-lobes-on-12-mm row (+74.47°). It is **measured for the first time**: E2
    exempts declared self-intersectors and this row was one until the nib cleared it;
  - two block-59 rows in the nib's FLAT FLANK on acute blades (+1.55° / +3.43°), the
    narrow-span clamp class;
  - the broad-fillet row (+17.43°), whose unfilleted state reads 46.02° on base.
- **Nothing was widened. E2 on the smoke subset: PASS.**

**Also run locally:**
- **Export gate:** 13 leaf rows and every block-59 row PASS.
- **Defaults bar:** PASS (10 states).
- **Combination gate:** the 8 leaf and LOBED pairs clean, every declared magnitude
  reproduced (CG3).
- **`bloom-smoke --check`:** 214 rows / 55 blocks / 175 families, LF32–LF34 claimed.

**Matrix.**
- Block 59, ten rows:
  - two nib regimes (SIMPLE tip 0.60 FLOOR, tip 3.00 STEEP);
  - the compound leaflet tooth at the tip;
  - the tip yield;
  - LOBED at `lobedTo` 0.95;
  - broad sinus at 0.12, 0 and 0.5;
  - broad sinus at 0.49 / 0.50 on a fillet that saturates at 0.4928.
- Smoke block 59. The live matrix is 1,296.
- **`frozen/phase63` is the 1,286 rows at `d6d2ab4`**, registered in both maps.

---

## 6. Open

- **The FLOOR regime's told corner** (24–27° on a 3 mm × 6 mm leaf at tip shape 0.60;
  4–7° at 46 mm). It is the nib leaving the law at the floor crossing on a shallower
  slope, because the flank cannot leave later and still close at `leafLength`. A
  softer joint would need the leaf's length to move, which Eva's pin forbids.
- **The 60 "already round" leaves.** Their sinuses are rounder than any fillet that
  fits, so the slider has nothing to add. They are told, not refused.
