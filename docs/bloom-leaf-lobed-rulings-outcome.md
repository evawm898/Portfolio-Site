# Leaf/stem build S4b — the lobed-leaf rulings: outcome

Eva's three rulings of Oct 8, from `docs/img/leaf-lobed.png`, were:

1. round the sinus bottom;
2. retune the lobed defaults toward mum;
3. scale the lobed petiole by blade area.

All three are built. The base is `ee91b94` (S4, PR #385).

The sheet is `docs/img/leaf-lobed-rulings.png`, made with:

```
node tools/shot-bloom-lobed-rulings.mjs <png> --base <worktree of ee91b94> --sample-head … --sample-base …
```

Every number below names its mode and sampling. They are EXPORT, one leaf, read off the builder's own record, unless a line says otherwise.

**Two things wait on Eva.** One is the no-fit trade (§2c), which is reachable. The other is the proposed mum defaults (§3), which ship provisionally and move with one constant each.

## 1. What "opening" means — S4's measure re-derived, not built to

S4 measured the gap from a point **1 mm of margin arc up one flank** to the nearest point of the other flank. **That measure is capped at 1 mm by construction**: a chord is never longer than its arc, so on any curved bottom it reads under 1 whatever the opening is. A 2 mm-diameter half-round reads 0.964 on the emitted rows, and the sample (§2b) reads 59.1 % "under 1 mm" on this tree, exactly as on the base. Building a U to pass that measure would mean a flat bottom or a slot. So it is kept verbatim as `arcGapMm` for comparison, and the measure the round bottom is built to is new.

**THE OPENING (`lobedSinusOpeningMm`):**

1. Seat a disc of diameter `MIN_FEATURE_MM` in the sinus bottom.
2. Drop every point of either flank nearer the bottom than the disc's equator (`D/√2`). That is the disc's own bottom half.
3. The opening is the least distance between what remains of the two flanks.

Each flank is clipped at the circle segment by segment, and the distance is taken vertex-to-segment both ways, so the result is exact rather than sampled. On a V of opening angle θ it reads `√2·D·sin(θ/2)`, so its threshold equals S4's at a 90° V. The harness restates it independently (`restatedSinusOpeningMm`).

## 2. The round bottom

### 2a. The law and its owner

`lobedRoundBottoms` (bloom-geometry.js) is the one owner. The lobed lamina reads it through `chev.roundAt`, a cap on widthProfile's CORE term. It works on the asked lobed lamina at the built tilt, in the chevron's planform `(uL + h sinτ, h cosτ)`, on the rows the blade is built on. It is mode-free: the lamina is `TIP_HALF_MM`-floored, and the stations and tilt are the law's. For each sinus:

- **Needed** iff the asked V's opening on the emitted rows is under `MIN_FEATURE_MM`.
- **The U:**
  - A disc of radius R is seated with its lowest point on the depth line (`h = h_b`, **the depth untouched**), centred on the notch axis (the bisector of the flank chords one disc diameter out).
  - A floor holds `h_b` between the bottom and the disc's lowest row.
  - Each wall is tangent to the disc at the flank's own steepest pitch, steepened only as needed to clear the asked flank at the window's ends.
  - R grows from `D/2` (×1.1, then a 20-step bisection) until the opening read on the rows is ≥ D.
  - **Nothing is typed. R comes from `MIN_FEATURE_MM`, the walls from the flank.**
- **The fold** (§2d): the back wall is never steeper than the asked V's own steepest drawn row pair, nor than the continuous fold limit. The U is also checked in the lattice's discrete form, so it may not take a row pair under `LOBED_FOLD_MARGIN` unless the V's own pair already was.
- **NO FIT** (`back flank` / `front flank` / `rows` / `axis`): the V is kept and told. It is never refused.

**Told:** the read-out prints `ROUND SINUS BOTTOMS n of N sinuses WIDENED …` with each sinus's asked → built opening, and `NO ROUND BOTTOM FITS at … (told, never refused)`. The record is `leavesBuilt[i].lobed.roundBottoms`.

At the proposed defaults, 2 of 3 sinuses are rounded and the narrowest opening reads 1.014 mm. At S4's own form, sinus 2 goes from **0.794 → 1.066 mm** (R 0.50, 0.48 mm of flank taken, depth 5.95 mm untouched). S4 quoted 0.810 for that state by its arc measure.

### 2b. The sinus-gap sample — S4 against now

The tool is `tools/bloom-lobed-sinus-sample.mjs`, newly committed: S4's sampler never was. It draws 2,000 seeded uniform states over all seven lobed controls, the envelope width, the length (5–120), the tooth depth and count, and the tip shape. The same states are built on both trees.

| | under 1 mm | of |
|---|---|---|
| base tree (`ee91b94`), S4's arc measure | **58.8 %** (1,073) | 1,824 with a sinus — S4 quoted 59.7 % on its own draw |
| this tree, S4's arc measure | 59.1 % (1,073) | 1,816 — the cap, unchanged by construction |
| this tree, the opening on the asked V | 24.6 % (447) | 1,816 |
| **this tree, the opening as built** | **10.2 % (185)** | 1,816 |

1,617 sinuses needed a round bottom: 986 were built and **631 are NO FIT**. By reason: back flank 599, front flank 26, rows 5, axis 1. **Every one of the 185 states still under 1 mm carries a told NO FIT**, and the tool lists each one by state. The minimum opening as built is 0.003 mm (a NO FIT on a 5-lobe, 8 mm blade).

### 2c. THE STOP CONDITION — reachable, so WAITING ON EVA

A round bottom does not fit at the asked depth on **10.2 % of the sampled states**. Those states are short, steep and many-lobed: median length 13 mm, angle 41°, 5 lobes a side. Almost all fail on the back flank, where the wall would have to be steeper than the lattice can fold. **Shipped provisionally: the told no-fit (the V kept), like the teeth's.**

What else could yield, measured on 60 of the 185 states by stepping the one control until every sinus fits:

| yields | states recovered | median cost |
|---|---|---|
| lobe count | 57 of 60 | 2 lobes (max 5) |
| envelope width | 57 of 60 | 14 mm narrower |
| lobe angle | 30 of 60 | 20° |
| depth | — | ruled out (not measured as an option) |

### 2d. A real defect LF22 found, and its fix

On NONE FIT at S4's form, the first version's back wall ran at the flank's steepest pitch, which is exactly where the TILT CAP puts the fold limit. Every wall row then sat on the limit: the planform read 0.5000, and the emitted skin (cupped normals leaning along the midrib where the half-width falls fast) read **0.4976** against the 0.5 margin. The asked V touches that pitch at one point only, so its rows keep headroom, which is why S4 never met this.

**Fix: the back wall carries no slope the V's own rows do not.** It is bounded by the V's steepest drawn back pair. Wall rows then read 0.5091.

This is also a finding about S4: the continuous tilt cap is not sufficient for the emitted skin in general. It has headroom only because the V's steepest pitch is pointwise.

## 3. The mum defaults (proposed, Eva's to rule)

| control | S4 | proposed | why |
|---|---|---|---|
| `lobedSinus` | 0.62 | **0.55** | shallower, so the lobes read broad rather than deeply cut |
| `lobedShape` | 0.70 | **0.55** | rounder crests |
| `lobedAngle` | 38 | **22** | less forward sweep |
| `lobedToothDepth` | 0.08 | **0.22** | visible teeth: 9 at 3.56 mm relief, floor 1.00, fold cap 15.18 |
| `lobedLobes`, `lobedWidth`, from/to/ease | 3, 34, 0.08/0.80/0.9 | kept | the proportion already reads as a mum leaf |
| tip shape | shared (1.30) | **shared** | no twin needed: at 22° the tilt cap does not bind at the defaults |

SIMPLE and COMPOUND defaults (including the rose) do not move. `LEAF_WIDTH_DEFAULT` / `LEAF_TOOTH_DEPTH_DEFAULT` / `LEAF_TOOTH_COUNT_DEFAULT` are now named constants, read by the registry and by the petiole's reference. Their values are unchanged (17 / 0.26 / 9).

**OPEN: "lobes visibly toothed" is limited by the SHARED tooth count.** Nine teeth over the whole rim put about one tooth on each lobe (the teeth macro on the sheet), so the teeth read as a shoulder rather than as a toothed lobe. Truly toothed lobes need a LOBED tooth-count twin, and even then the tooth law's 10-tooth row ceiling caps them. The count is standing (shared), so this is reported rather than changed.

## 4. The lobed petiole

**THE LAW** (`lobedPetiolePlan`, the one owner): `r = wire·√(A_lobed / A_simple)`.

- It is floored at the wire and capped by `petioleRootCapMm`.
- The clamp is `petioleClampMm`, extracted verbatim from `compoundLeafPlan` and called by both plans, so there is one rod law.
- It is TOLD when clamped (asked → built).
- The rod is the SIMPLE leaf's own uniform petiole at the derived radius. No cone is needed: there is one rod, with no rachis to step down to.

**The two areas:**

- `A_lobed` is the planform area of the lobed outline **before its teeth, with its round bottoms**: the rows' own `hLobe`, through the tilted-row Jacobian `h(L cosτ + w h τ')`, on 8,192 stations.
- `A_simple` is **the SIMPLE leaf at its defaults, at the same length**, also before its teeth.
- Same length because the SIMPLE petiole is the wire at every length. A fixed reference length would thicken a long lobed petiole while a simple leaf of the same length (more area than the reference too) keeps the wire: two rules for one load.
- Teeth on neither side, so the tooth slider never reaches the petiole.
- The brief's 584 / 486 mm² were a different measure; on this outline the figures are below.

| state | A_lobed | A_simple | ratio | petiole (export) |
|---|---|---|---|---|
| proposed defaults | 781.1 | 516.4 | 1.513 | **1.476 mm** (wire 1.20) |
| S4's form | 629.0 | 516.4 | 1.218 | 1.324 |
| 40 mm envelope, no sinus | 1144.6 | 516.4 | 2.216 | 1.786 |
| 10 mm envelope | 235.3 | 516.4 | 0.456 | 1.200 (floored at the wire) |
| no sinus, 3 mm stem at 90° | 973.6 | 516.4 | 1.885 | asks 1.648, **1.500 CLAMPED** |

- **Slenderness** (`UNMEASURED — no coupon has been printed`, kept): 31.2 at the defaults, was 38.3 on the wire.
- **ST9** names the rod at its built radius through `rodAxes` (LF26(d)), never a widened region. The SPHERE row passes ST9.
- SIMPLE petioles do not move (LF18's SIMPLE arm is unchanged).

## 5. Gates

**LF20, re-derived** (seen red on the first round bottom). The declared lobed outline equals the restated asked outline outside the windows of sinuses whose asked V opens under 1 mm. Inside those windows it is never above the asked outline. **The exemption is decided from the controls, never from the `built` flag.** The first version read the flag, and the mutant table showed that a told-false record made LF20 fire first and stop the leaf before LF25 could name it.

**LF25, new:**

- (a) The told flag is the geometry: rounded iff a window row sits under the asked outline.
- (b) Need is restated, and a needed sinus is rounded XOR NO FIT.
- (c) The opening is ≥ 1 mm on the emitted rows, by the gate's own measure.
- (d) The depth is untouched.

**LF26, new:**

- (a) The reference is restated.
- (b) The area is read off the emitted rows within the trapezoid's own error. That is the larger of the two interleaved half-density sums, because one alone agreed by phase and read 4.5e-2 against a real 0.26 on six lobes.
- (c) The law and the clamp.
- (d) The rod is named at its radius.

**LF21–LF24 are green on every LOBED row.**

**Mutants (apex table, five new):**

- `the-v-bottom-is-restored`
- `the-round-bottom-is-a-constant-radius`
- `the-round-bottom-is-not-told`
- `the-lobed-petiole-is-the-wire`
- `the-petiole-is-sized-from-the-envelope-box`

Each fires the family it names, witnessed on the mutated module. Two anchors moved: `plateau-returns`, and `the-petiole-clamp-is-removed`, now in the shared clamp. The three S4 witnesses that need a cap to bind pin S4's form, as do their table rows and the two matrix rows whose labels state S4's numbers. At the mum defaults the 6 × 0.3 fold cap is 9.09 mm and binds nowhere. A `--witnesses-only` flag checks every witness in Node in seconds; it never claims a family. The full sweep is CI's.

**The other gates:**

- **Export / census / connectedness:** all 43 LOBED rows (39 + 4 new) export watertight with 0 within-shell pairs and no declaration, and are one connected piece.
- **Smoke:** block 56 is ten rows; 167 families are claimed.
- **Panel gate, defaults bar:** PASS.
- **Edge-profile E2, re-measured, never widened:**
  - Four rows read worse: the mum 26.97 → **38.23°** of excess, sinus 0.9 34.11 → 48.74°, angle 60 27.60 → 30.63°, NONE FIT 48.24 → 50.31°.
  - One reads better: 6 × 0.3, 47.17 → 45.52°.
  - Three rows are new.
  - The U's walls meet the rows more obliquely: S4's declared bead-inset class, whose fix is an `emitPanel` change and out of scope.
- **Combination gate:** no existing pair builds a LOBED leaf, so no cell moves. Lobed controls do move the leaf-stem approach (envelope width by up to 0.11 mm, lobe angle by 0.07 at a 70° leaf), so CG1 counts them. `lobedwidth-x-leafangle` (tier 2, single-reaches) is added, with 6 cells declared. The hazard is leafAngle's alone (70° reads 0.699 mm, 85° reads 0), as on the SIMPLE leaf.

## 6. Partition, phase, cost

**Byte partition** (`tools/verify-bloom-defaults-bytes.mjs --mover lobed --pair set`, which builds each tree from its own registry; both are new options):

- 1,259 rows paired by control set.
- **33 predeclared movers, from the base tree's own record (it builds a LOBED leaf), all moved.**
- **Every holder held to the bit in both modes** over 1,554,313,608 export floats and 196,221,634 captured-grid values.
- The 1e-9 control fired.
- Unpaired and named: the two LOBED rows redefined to pin S4's form, and the four new rows.

**Frozen phase:** `frozen/phase59` is the 1,261 rows at `ee91b94`, in both maps and proved deep-equal. Block 56 gains four rows and its MUM row is renamed (its label quoted the S4 numbers), giving 1,265 rows.

**Cost:**

- **5,980 triangles a lobed leaf, unchanged.** The round bottom moves the outline on a fixed lattice, and the petiole rod's sides are fixed.
- The whorled-8 cost corner stays at 170,410 (11.4 % of budget).
- A lobed build costs about 60 ms more (the round-bottom solve).

## 7. Open questions for Eva

1. **The no-fit trade** (§2c): keep the told no-fit, or let the lobe count or the width give?
2. **The mum defaults** (§3): rule them from the sheet.
3. **Toothed lobes** need a LOBED tooth-count twin: whether to open that, given that the count is standing as shared.
4. **The tilt cap's sufficiency** (§2d): the continuous cap is not sufficient for the emitted skin in general. S4 had headroom only by the V's geometry.
