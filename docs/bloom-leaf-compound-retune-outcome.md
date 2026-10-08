# The compound retune: rose-toward leaflets, their own teeth and tip, a thicker petiole

Eva's rulings on the compound leaf, from the deploy preview of #380 (Oct 7). Base: `main` at
`2792504` (#380's squash). Sheet: `docs/img/leaf-compound-rose.png`, made by
`node tools/shot-bloom-leaf-compound-rose.mjs <out.png> --base <worktree of 2792504>`.

**The defaults in §1 are RULED (Eva, Oct 8, from `docs/img/leaf-compound-rose.png`): they stand as
merged in #381 (`13e8c80`), and the leaflets keep the shared `leafCup`.** They were proposed in #381
and are recorded here as ruled (§1). The other two rulings were carried out as written.

## 0. What was asked, and what this PR does

| ruling | what shipped |
|---|---|
| 1. Retune the compound defaults toward rose | New compound-only defaults (§1), shown against #380's on the sheet's second row. No SIMPLE default moved (measured, §5). **Ruled Oct 8: they stand.** |
| 2. Serration off on compound leaflets | Twin controls: the leaflets have their own tooth depth (default 0) and tip shape (§2). The simple leaf's two are hidden and inert under COMPOUND. |
| 3. A thicker compound petiole | The area rule read upward, capped where the rooted end still fits inside the stem, clamped and told (§3). The rachis and stalks stay at the wire. |
| Partition | Predeclared from the base tree's record: 44 movers moved, 1,178 holders held at 0 floats in both modes (§5). |
| Clause and mutant | LF18, the petiole law and its clamp, plus eight mutants (§6). |
| Frozen phase | `frozen/phase57` = the 1,210 rows at `2792504` (§8). |
| Housekeeping | #380's escaped co-author line is added to CLAUDE.md's list of known-wrong squash messages. History is not rewritten. |

## 1. Ruling 1: the rose defaults (proposed in #381, RULED Oct 8)

**RULED (Eva, Oct 8, from `docs/img/leaf-compound-rose.png`): the proposed rose defaults STAND as
merged in #381** — laterals 26 × 17 mm, terminal 30 × 19 mm, ovate, leaflet tip 1.60, no teeth.
**The leaflets keep the shared `leafCup` default (`LEAF_CUP`, 0.35); there is no leaflet cup
twin.** Nothing in the generator moves for this ruling: the table below is what `main` already
ships at `13e8c80`, and the cup is already shared — `leafletBladeState` spreads `leafBladeState`,
which reads `state.leafCup`, and the Cup control is visible under either leaf type.

#380's leaflets read as holly. Three things did that, and only one of them was the leaflets' own:

- **The teeth.** The leaflets read the SIMPLE leaf's tooth depth (0.26), so every leaflet was cut.
- **The tip.** They read the SIMPLE leaf's tip shape (1.30, "today's pointed petal").
- **The size.** The leaflets were small against the 40 mm rachis (laterals 20 × 12 mm).

The proposal, compound only:

| control / constant | #380 (2792504) | proposed | what it does |
|---|---|---|---|
| `leafletLength` | 20 | **26** mm | lateral leaflets larger against the rachis |
| `leafletWidth` | 12 | **17** mm | ovate rather than lanceolate |
| `leafletTerminalLength` | 23 | **30** mm | the terminal a little larger than the laterals |
| `leafletTerminalWidth` | 14 | **19** mm | |
| `leafletToothDepth` (new) | (0.26, the simple leaf's) | **0** | serration off (§2) |
| `leafletTipShape` (new) | (1.30, the simple leaf's) | **1.60** | rounded to acute: between today's pointed petal (≈1.20) and the true ellipse (2.00) |
| `LEAFLET_BASE_TAPER` / `LEAFLET_TIP_TAPER` (new constants) | (0.85 / 1.15, the simple leaf's) | **0.60 / 0.90** | widest point at 0.40 of the length (0.39 drawn), ovate |
| `leafletPairs`, basal ratio, stalks, angle | 2, 0.8, 2.5 / 7 mm, 62° | unchanged | 2 lateral pairs and a terminal, as ruled |

**The tapers are constants, not controls.** The simple leaf's tapers are constants too
(`LEAF_BASE_TAPER` / `LEAF_TIP_TAPER`), so the leaflets get their own pair in the same form.

**The size of the change, measured off the builder's own leaflet rows** (sheet row 2, last cell):

- Terminal leaflet: 23 × 14 mm, widest at 0.43 L → 30 × 19 mm, widest at 0.39 L.
- The default one-node compound leaf: 5 leaflets at 21×14, 21×14, 26×17, 26×17, 30×19 mm (the
  basal pair at the 0.8 ratio). It was 16×10, 16×10, 20×12, 20×12, 23×14.

The ruling's words, checked against the sheet:

- *Ovate.* Widest below the middle (0.39 L), a round base.
- *Rounded-to-acute tip.* 1.60.
- *Two lateral pairs plus a terminal, the terminal a little larger.* 30 × 19 against the top pair's 26 × 17.
- *Leaflets large relative to the rachis.* The terminal alone is three quarters of the 40 mm rachis.

**Ruled as proposed (Oct 8).** Every value above is still one constant, should a later ruling move
one.

**Found while recording the ruling, not fixed here (this PR is docs only):** the Cup control's
read-out quotes the margin lift at the widest point as `cup × leafWidth / 2`, and `leafWidth` is
hidden under COMPOUND. At the defaults it equals the lateral leaflets' width (17 mm), so the 2.97 mm
it prints is right for the top lateral pair by coincidence. The terminal (19 mm) lifts 3.32 mm and
the basal pair (13.6 mm) 2.38 mm, and the figure does not follow `leafletWidth` when that slider
moves. Making the read-out name the leaflets' own widths under COMPOUND is a read-out change of its
own.

## 2. Ruling 2: serration off on compound leaflets — the mechanism is TWIN CONTROLS

#380's leaflets read the simple leaf's `leafToothDepth` and `leafTipShape`. So the ruling's own
condition applied ("if compound leaflets read the simple leaf's tooth controls, give compound its
own"), and they now have their own.

- **`leafletToothDepth`** (Serration section, 0–1, **default 0**) and **`leafletTipShape`**
  (Leaflets section, 0.60–3.00, **default 1.60**). Both are visible only under COMPOUND
  (`visibleWhen: leafCompound`).
- The simple leaf's **`leafToothDepth`** and **`leafTipShape`** are now visible only under SIMPLE
  (`leafSimpleBlade`). Their defaults (0.26 and 1.30) do not move.
- **`leafletBladeState()`** in `bloom-geometry.js` is the one owner of what a leaflet reads. It
  overrides `lobeDepth`, `petalTipShape` and the two tapers onto the simple leaf's state.
- **The tooth COUNT and the crest and notch SHAPES stay shared.** They describe the shape of a
  tooth and only matter once a depth is above 0. Their defaults are not under ruling, and a twin
  for each would be three more controls for nothing.
- **The 1 mm floor applies unchanged** (`cap.toothReliefFloorMm`). On the sheet's
  "serration ON" cell (depth 0.12, 12 teeth) the floor bound on 4 of 5 leaflets and the counts
  gave 12 → 10. At depth 1 nothing floored and 9 teeth were built a leaflet.
- **Each twin is inert where it is hidden, and that is MEASURED in both directions:**
  - A COMPOUND leaf with the simple controls at their extremes (tooth 1, tip 3) is byte-identical
    to the same leaf at the simple defaults: **0 of 1,315,080 floats moved**, both modes.
  - A SIMPLE leaf with the leaflet controls at their extremes is a HOLDER in the byte partition
    (§5): 0 floats moved against #380.
- `leafToothed` (the predicate behind the serration sub-controls) is now an OR of the two
  guarded depths, so the tooth count, crest and notch show whenever the visible depth is above 0.

## 3. Ruling 3: the thicker compound petiole

> **SUPERSEDED IN PART BY S3c (Eva, Oct 8; `docs/bloom-leaf-rachis-taper-outcome.md`).** The
> petiole's law, its cap and its clamp below stand. The 45° cone and "the rachis and the stalks stay
> the wire" do not: the brief was wrong, not the build, and the rachis now tapers by load from the
> built petiole to the wire at the terminal. The stalks stay the wire. Kept as written so the
> reversal is legible.

### 3a. The law and its owner

- **Asked:** `r = wire × sqrt(N)` — the area rule read UPWARD. The petiole carries N leaflets, each
  on a wire of radius `wire`, so its section is the sum of theirs. **Owner:
  `compoundPetioleRadiusMm(wireR, count)`.** The wire is the leaf's own petiole rule (half the
  floored sheet, 0.60 mm at the shipped sheet).
- **Asked diameters at the shipped sheet:** 3 leaflets **2.08 mm**, 5 (the default) **2.68**,
  7 **3.17**, 9 **3.60**.
- **Built:** `max(wire, min(asked, cap))`. **Owner: `compoundLeafPlan`**, which reports
  `petiole: { askedMm, capMm, radiusMm, clamped, thickens, coneMm }`.
- **Shape:** full radius to a **45° cone** of length `radius − wire`, ending at the rachis base. A
  flat step would put a shoulder facing back along the rod.
- **The rachis and the stalks stay the wire** (`compoundRodRadiusMm(wireR)` returns the wire,
  ruled). Mutant `the-rachis-thickens-with-the-petiole` holds that.
- **`thickens` is mode-free.** It compares the cap against the wire floored at
  `MIN_FEATURE_MM` (`leafNodePitchFloorMm(sheet) / 2`). The cap is never under 0.75 mm, so both
  modes emit the same rings, and the cone ring is the only triangle change (§7).

### 3b. The cap the stem puts on it

The petiole still roots through the stem wall, as every leaf does: its rooted end is a disc square
to the rod, centred `rootR − embed · cos θ` from the axis. **`petioleRootCapMm(wall, θ)`** is the
largest radius whose disc still fits inside the stem's outer cylinder. It is solved in closed form,
in two cases:

- **The disc's top rim binds:** `r = sqrt(Ro² − (rEnd/c)²)`, valid when that `r ≥ rEnd·s/c²`.
- **Otherwise, the disc's far edge binds:** `r = (Ro − rEnd)/|s|`.

`c` and `s` are `|cos θ|` and `|sin θ|`; `Ro` is the stem's outer radius.

**Measured caps, as DIAMETERS (the record holds radii), by stem diameter and leaf angle:**

| stem | 0° | 20° | **35° (ruled)** | 50° | 70° | 85° | 90° |
|---|---|---|---|---|---|---|---|
| 3 mm (solid) | 3.00 | 3.00 | **2.98** | 2.88 | 2.14 | 1.64 | 1.50 |
| 3.5 mm | 3.46 | 3.44 | 3.37 | 3.11 | 2.14 | 1.64 | 1.50 |
| **4 mm** (as the ruling named it) | 3.87 | 3.83 | **3.69** | 3.21 | 2.14 | 1.64 | 1.50 |
| **6 mm (the shipped stem default)** | 5.20 | 5.02 | **4.48** | 3.22 | 2.14 | 1.64 | 1.50 |
| 8 mm | 6.24 | 5.89 | 4.75 | 3.22 | 2.14 | 1.64 | 1.50 |
| **12 mm (hollow)** | 7.94 | 7.10 | **4.76** | 3.22 | 2.14 | 1.64 | 1.50 |

Reading the table against the three stems the ruling named:

- **The ruling said "default 4 mm". The shipped `stemDiameter` default is 6 mm.** Both are
  measured. The sheet's join macro is at 4 mm, as asked, with a 6 mm section beside it.
- **At the ruled 35°, the default five leaflets (2.68 mm asked) fit every stem from 3 mm up.** The
  3 mm solid stem holds 2.98. Four pairs (3.60 asked) CLAMP on the 3 mm and 3.5 mm stems, to 2.98
  and 3.37.
- **The cap falls with the angle and stops depending on the stem past about 50°.** From 70° up the
  tilted disc meets the wall at the same place on every stem: 2.14 mm at 70°, **1.50 at 90°**. So a
  steep compound leaf clamps on any stem.
- **On the 12 mm hollow stem the wall is the thin 1.5 mm one.** The cap there (4.76) is about the
  same as on 8 mm, because the rooted end sits at the wall's mid-thickness, far from the axis.

### 3c. Told, never refused

The read-out's PETIOLE line has three forms (`bloom.js`, `compoundLine`):

- **Under the cap:**
  `PETIOLE 2.68 mm across — the area rule read UP over 5 leaflets asks 2.68 mm (the 1.20 mm wire x sqrt 5), under the 4.48 mm this stem holds with the rooted end inside it at 35° · a 45° cone of 0.74 mm steps it down to the rachis`
- **Clamped:**
  `…; CLAMPED to 2.98 mm, the most this stem holds with the rooted end inside it at 35° (asked 3.60 -> built 2.98, told, never refused)`
- **Cap under the wire:**
  `…; this stem holds only 1.64 mm with the rooted end inside it at 85°, UNDER the wire, so the petiole stays the wire (asked 5.37 -> built 2.40, told, never refused)`

The SLENDERNESS line names the petiole and the rachis separately, and keeps
`UNMEASURED — no coupon has been printed` verbatim. The RODS line says the rachis and stalks are
the wire floor, ruled.

### 3d. Two findings, both told rather than fixed

- **The rooted end can stand PROUD when the cap is under the wire.** At sheet 2.40 × 85° the cap
  is 1.64 mm and the petiole stays the 2.40 mm wire. Its rooted end then reaches **0.354 mm past
  the stem's outer surface.** This is pre-existing: a SIMPLE leaf's own petiole does the same at
  this sheet and angle, because both are the wire. The read-out tells it ("its rooted end stands …
  PROUD of the stem"). LF18(b) asserts the end inside the stem only where the built radius is at
  or under the cap. The sheet's row 4 shows the section.
- **The cap reads the stem straight.** At a leaning node (`stemNodeKink`) the stem's axis is
  displaced, and the cap formula does not model the lean. The reach is MEASURED about the
  displaced axis, and on the block-55 row (kink 1, four pairs, 50°, 3.5 mm) the end stays inside.
  Declared in that row's label.

### 3e. ST9 covers the thicker petiole by name

ST9 excuses the builder's own `rodAxes` by name, and each rod is its own axis segment at its own
emitted radius:

- `part: 'petiole'` at the built radius, then the cone;
- `'rachis'` at the wire;
- `'stalk k'` at the wire.

The region is never widened. Mutant `the-rod-exemption-is-widened` reports every rod at twice its
radius, and LF18(c) fires on it. ST9's own witness (`verify-bloom-stem-channel.mjs --control`)
passes, and the compound SPHERE row is silent.

## 4. Red first: the clauses this ruling changed

Each of these went RED on the new geometry before it was re-derived (the run is
`red1-old-clauses.txt` in the session's scratchpad). None was loosened. Each now restates the law
from an owner the builder does not write.

| clause | red on the new tree | re-derived to |
|---|---|---|
| LF7 | "the leaf's serration depth reads 0 where the LEAF's own control says 0.26" | reads the page's own `leafletToothDepth` under COMPOUND, `leafToothDepth` under SIMPLE |
| LF9 | "reads back a tip exponent of 1.546021 … where the LEAF's own control says 1.3" | reads `leafletTipShape` and the leaflet tapers under COMPOUND |
| LF11 | "the rachis is 1.200e-3 mm off the arc … at leaf 0 ring 1" | finds the rachis base BY POSITION (the ring at `petioleAxis.outer`); the cone ring is not on the arc |
| LF13 | "blade 0 carries no serration record at tooth depth 0.26" | the leaflet's own depth decides whether a record is owed |
| LF17 | "a rod's emitted radius is 7.416e-1 mm off the derived law" | the petiole's rings at the built radius, the cone ring `built − wire` short of the base, every rachis and stalk ring at the wire |

## 5. The byte partition: predeclared from the base tree's record

`node tools/verify-bloom-surface-bytes.mjs --base <worktree of 2792504> --movers-predicate compound-retune`
was run over the whole 1,222-row live matrix, in both modes. It ran in twenty `--range` chunks
merged with `--merge`, which refuses chunks that do not tile the matrix.

**The predicate (new, in the tool's `PREDICATE_MOVERS`).** A row moves iff the BASE tree's own
`leafPlan` builds a compound leaf: `compound` non-null with a leaf placed. It is evaluated through
the base's own `footRing` → `stemPlan` → `inflorescencePlan` chain, so the raceme's shared-node pin
is the base's decision.

```
MERGED 20 chunks over 1222 rows x 2 modes, predicate compound-retune
partition     : 44 of 44 predeclared movers MOVED (every one must), 1178 holders compared to the bit
export stream : 1,452,281,796 floats over 161,364,644 triangles
captured grid : 83,348,080 values over 9,600 panels (live)
PASS — 0 floats moved on the 1178 holders, positionally, under Object.is; all 44 predeclared movers moved.
```

- **44 movers.** These are #380's 33 compound rows plus the 11 compound rows of block 55.
- **1,178 holders.** Every SIMPLE row, every leafless row, every raceme row, and four special rows:
  - the compound ask PINNED to SIMPLE under a raceme;
  - #380's GATED row, which has leaf length 0;
  - block 55's GATED SIMPLE row, carrying the leaflet controls at their extremes;
  - the non-compound rest.
- **`--control` fires both clauses** (the export stream and the captured grid) on a holder.
- **The /plot grid export cannot move**: it names no leaf.

## 6. LF18 and the mutants

**LF18 — the petiole law and its clamp** (in both STL gates through `leafAssertions`):

- **(a) The record against a restatement.** `restatedPetiole` rebuilds the law from the controls
  with different expressions from the geometry's: `sqrt(N · wire²)`, and the cap through
  `q = rootR/c − embed`, `sqrt((Ro − q)(Ro + q))` or `embed(1 + c)/s`. The record must match it:
  asked, cap, built, thickens, clamped.
- **(b) The rooted end inside the stem.** The emitted root ring's reach from the (displaced) axis is
  at most `Ro` — one direction, wherever the built radius is at or under the cap (§3d).
- **(c) Every rod named, at its own radius.** Each `rodAxes` entry's radius is the built radius
  for `'petiole'` and the wire otherwise, and a petiole must be named.
- **The SIMPLE arm.** A simple leaf's petiole is the wire.

**Mutants** in `tools/verify-bloom-apex-mutants.mjs` (126 anchors, each matching exactly once).
Each was run, fired what it names, and left the clean tree silent:

| mutant | names | fired |
|---|---|---|
| `the-petiole-is-the-wire` | LF17, LF18 | LF17, LF18 |
| `the-petiole-clamp-is-removed` | LF17, LF18 | LF17, LF18 |
| `the-petiole-cap-is-the-outer-radius` | LF17, LF18 | LF17, LF18 |
| `the-petiole-steps-down-flat` | LF17 | LF17 |
| `the-rachis-thickens-with-the-petiole` | LF17, LF18 | LF17, LF18 |
| `the-rod-exemption-is-widened` | LF18 | LF18 |
| `the-leaflets-read-the-simple-tooth-depth` | LF7, LF13 | LF7, LF13 |
| `the-leaflets-read-the-simple-tip` | LF9 | LF9 |
| `the-rods-are-typed` (re-anchored) | LF17, LF18 | LF17, LF18 |
| `the-leaf-type-is-ignored` (re-anchored) | LF14 | LF14, LF7, LF9, LF11, LF12 |
| `the-leaflet-base-is-buried` | LF16 | LF16 |

- **`the-rod-floor-is-removed` is RETIRED.** The rachis no longer reads the area rule downward, so
  there is no floor left to remove.
- **The clamp mutants are witnessed on their own state** (`CLAMP_WIT`: a 3 mm stem at 70°, four
  pairs ask 3.60 mm, the rooted end fits 2.14). The default compound leaf never clamps at 35°, so a
  removed clamp would be invisible there.

## 7. Cost

**+24 triangles a compound leaf** — the cone's one ring — whenever the petiole thickens. Live and
export are identical. Measured on both trees:

| state | 2792504 | this PR | of budget |
|---|---|---|---|
| one default compound leaf (the leaf alone) | 15,366 | 15,390 | |
| the default one-node compound bloom | 42,256 | 42,280 | 2.8% |
| the rose (4 leaves) | 104,770 | 104,770 | 7.0% |
| 4 pairs on the 3 mm stem, 3 nodes | 109,588 | 109,660 | 7.3% |
| the compound corner: whorled × 8, 4 pairs, 12 mm stem | 690,010 | 690,586 | 46.0% |

- **The rose's count does not move, and that is not "nothing changed".** The larger leaflets raise
  the leaf's rise, so the inset puts the nodes deeper. The stem gives up 96 triangles of its station
  ladder, and the four cones add 96.
- **The shipping default is 24,688, untouched.** It has no stem, so no leaf.

## 8. Gates run locally, and frozen/phase57

| gate | result |
|---|---|
| export gate, every COMPOUND and COMPOUND RETUNE row (48) | PASS: watertight, 0 within-shell self-intersection pairs, orientation clean |
| connectedness, the same 48 rows | PASS: one piece each |
| byte partition (§5) | PASS, with `--control` |
| combination gate | PASS: 529 cells, 184 under the bar, all declared, CG0–CG7 clean; no cell moved |
| defaults bar | PASS: the compound leaf at its defaults reads leaf-stem 8.0690 mm |
| defaults bar `--control` | PASS: 3 of 3 must-fails |
| edge-profile gate | PASS: E0–E6 clean |
| edge-profile `--control` | PASS: 7 of 7 must-fails |
| grid gate | PASS: 915 checks over 21 rows |
| stem channel and its `--control` | PASS |
| leaf decoupling | PASS: 288 petal-side values × 2 modes, 0 leaf floats moved |
| panel gate | PASS |
| smoke census `--check` | 192 rows over 51 blocks, 159 families both ways |
| apex mutant subset (the 11 above) | PASS |

**`frozen/phase57` is the 1,210 rows at `2792504`**, registered in `FROZEN_BASE_COMMITS` and
`FROZEN_MATRICES`. `--verify-frozen --phase57` is deep-equal to that commit's own `buildMatrix()`.

A phase is owed because the row set changed in two ways:

- **Block 55 appends 12 rows** (1,210 → 1,222).
- **Seven block-54 rows are redefined.** The rose loses its tooth fields and is relabelled, and six
  labels now say what the retune changed. The sets of those six are unchanged.

`2792504`'s workflow files are `main`'s, and this PR edits none, so the tag can publish when it is
dispatched after the merge.

## 9. What is Eva's

- **Nothing from this PR.** The rose defaults (§1) were ruled on Oct 8: they stand as merged, and
  the leaflets keep the shared `leafCup` with no twin. The Cup read-out's width under COMPOUND (§1)
  is recorded, not scheduled.
- **Out of scope, as ruled:** the chevron (S4), stipules, the leaf apex nib, serrate skew,
  per-leaflet arch, the tooth floor itself, and the SIMPLE defaults.
