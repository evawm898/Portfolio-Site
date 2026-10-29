# Bloom P1 — where the nodes go, and leaf size along the stem

Eva's rulings of Oct 28, built. Four controls: three in **Stem** beside Nodes
(`leafNodeStart`, `leafNodeEnd`, `leafNodeSpacing`) and one in **Leaves**
(`leafSizeTaper`). At their defaults every stored row builds the doubles it
built before, in both modes (§6). Sheet: `docs/img/node-span-spacing.png`
(`node tools/shot-bloom-node-span.mjs <png>`).

## 1. The run: start and end

* `leafNodeStart` (0.05–0.95, default **0.16**) and `leafNodeEnd` (0.05–0.95,
  default **0.86**) are FRACTIONS OF THE STEM measured FROM THE HEAD, the
  flower's own `LEAF_NODE_TOP` / `LEAF_NODE_BOTTOM`. The defaults are those
  constants, so `start × L` and `end × L` are the old law's own expressions.
* **The inset clamp stays and is told.** The top node may not sit higher than
  the TOP leaf's rise (the head clearance). Where the start asks for less, the
  start is RAISED to the rise, and the slider keeps its asked value. The
  start's read-out says `RAISED to X mm: the TOP leaf rises Y mm`.
* **The pitch floor stays and is told.** It is max(sheet, `MIN_FEATURE_MM`).
  Where the run cannot hold the asked count at it, the COUNT gives, as it
  always has. The end's read-out says `k of n nodes fit`.
* **ONE node reads the span** (my proposal, no ruling). The flower's single
  node sat at 0.55, which is (0.55 − 0.16)/(0.86 − 0.16) = 0.557… of the way
  down the default run. One node stands at that same share of the asked run:
  `start + (end − start) × LEAF_NODE_SOLO_IN_SPAN`. At the defaults this is
  `LEAF_NODE_SOLO` BY BRANCH. Measured, the formula also lands on 0.55 to the
  bit at the defaults, so the branch is a guarantee rather than a correction.
  No mutant can tell the two apart (recorded, not claimed). It follows both
  ends, with no dead slider at one node.
* **A START PAST THE END is told, never swapped** (my proposal). The span is
  EMPTY, so the nodes collapse to ONE node at the end. The start's read-out
  says `START PAST END (a > b): the span is EMPTY, so the nodes collapse to
  ONE at the end, X mm (told, never swapped — the sliders keep their values)`.
  `run.inverted` is the record, and NS3 holds it both ways. Swapping silently
  was rejected: it builds a run nobody asked for and hides that the two
  sliders crossed. Refusing was rejected: it leaves the stem bare.

## 2. The spacing: a linear internode law

`leafNodeSpacing` (−1..1, default **0**, step 0.05). Internode j of k−1 has
weight `1 + c (1 − 2j/(k−2))`, where `c = spacing × 0.75`
(`LEAF_NODE_SPACING_GAIN`). The run is the cumulative sum, scaled to the span.

* **POSITIVE crowds toward the BASE**: the top internode is long and the
  lowest short.
* The end-internode ratio is `(1+|c|)/(1−|c|)`: **7 : 1 at full**.
* The law is arithmetic only (no transcendentals), so it is identical in
  every engine.
* The ends are exactly 0 and 1 (`x/W` with `W/W` = 1).
* **Spacing 0 is the old even arm's own expression BY BRANCH**:
  `top + (span × i)/(k−1)`. NS2 holds it under `Object.is`. The mutant
  `node-run-even-arm-reformed` writes `span × (i/(k−1))`. That is the same
  mathematics in another order, and it moves a node one ulp on a 60 mm stem
  with 6 nodes.
* **Hidden and inert below three nodes**: two nodes stand on the span's ends
  at any spacing.
* **The read-out names the direction plainly**: `0.80 — the nodes crowd toward
  the BASE … · the lowest internode 13.9 mm, the highest 17.6 mm`. Both
  figures come from the built depths.

**The merge clamp (the ruling's own question).** A swelling's profile is √2
spindles (`√2 × STEM_NODE_SPREAD_RADII × stemRadius`, the existing MERGED
report's own distance). A crowd CAN put two swellings closer than that.

* Where it would, the spacing is CLAMPED, per count, before the pitch-floor
  test. The built spacing is the LARGEST multiple of 1/4096 at or under the
  asked one that keeps every internode at `min(span/(k−1), mergeGap)`.
* That target is never tighter than the even run, so a crowd never makes a
  merge worse than spacing 0 would.
* It is told on the spacing's read-out (`CLAMPED to 0.16 …`), and the slider
  keeps its value.
* A kink-only node is a bend, and two bends closer than a spindle are two
  bends, so a kink alone is never clamped.

**Finding: on a swelling stem the clamp binds hard.** On the sheet, the
carnation (swelling 1, five nodes) clamps a 0.8 crowd to **0.16**. The rose
(swelling 0.25, four nodes) clamps it to **0.01**. Their even internodes
already sit near the merge gap. The crowd is fully reachable on any stem
without a swelling.

**Pre-existing, not clamped: a NARROW EVEN run merges swellings.** On the
carnation at 0.20..0.45 the five swellings fuse into one bulge (internodes
5.5 mm against a 13.9 mm gap). This is the state ST12(f) already reports as
MERGED, which stem session 2 ruled told-never-clamped. A narrow run reaches it
the way more nodes on the default run always could.

## 3. Leaf size along the stem

`leafSizeTaper` (−0.75..0.75, default **0**, step 0.05), in Leaves.

* **Every SIZE of a node's leaf scales by one factor, and nothing else does.**
  `leafTaperFields` is the one owner of which controls count as sizes:
  * SIMPLE: length and width;
  * LOBED: length and `lobedWidth`;
  * COMPOUND: the rachis, every leaflet's length and width, the terminal's,
    and both stalks.

  Counts, angles, the arch, the cup, tooth depth (a fraction) and every curve
  are NOT touched. A smaller leaf is the same leaf, smaller.
* **The largest leaf is always the asked one.** A positive taper takes the TOP
  leaf to `1 − τ`. A negative one takes the LOWEST to `1 + τ`. No leaf exceeds
  its sliders, and no budget corner moves.
* **Triangles per leaf are unchanged** (a fixed lattice). Measured: every taper
  row builds the untapered row's triangle count to the integer (42,110 SIMPLE,
  88,354 COMPOUND, 54,554 LOBED).
* **The scale follows the DEPTH, not the index.** It is set by the node's place
  in the run (0 at the top node, 1 at the lowest), so a crowd of nodes carries
  a crowd of similar leaves.
* **Floored uniformly** at the least scale that keeps every size on its own
  slider. A 4 mm wide leaf floors at 75%. The whole leaf is held so it keeps
  its shape, and the read-out says FLOORED per node.
* **Range ±0.75.** A quarter of the asked size is the smallest node leaf. Nothing
  measured breaks at either end: all ±0.75 rows export watertight, as one
  piece, with 0 within-shell pairs. Negative is allowed because it changes
  nothing at the top (and so nothing at the inset).
* **Counts are not re-asked; the floors and yields act per node.** Each node's
  leaf is built from its own scaled state. A smaller LOBED leaf may yield a lobe
  or a tooth, and a smaller SIMPLE leaf may yield teeth at the relief floor. The
  leaf read-out prints the yields per node.
* **The inset reads the TOP leaf's rise.** Under a positive taper the top leaf
  is the smallest, so the head clearance is read at `1 − τ`.
  * It is taken from the ASKED count.
  * Where the count then gives to one node, that node's leaf is the asked size
    and the layout is taken again at scale 1. That is two passes, never a loop.
* **The petiole, by type:**
  * COMPOUND: `wire × √n` does **not** scale. It carries n leaflets whatever
    their size.
  * LOBED: area-scaled. It **does** follow its node's smaller blade, floored at
    the wire.
  * SIMPLE: the wire, with the root-support floor following the node's own
    length past the 35 mm reference.

  Each is that type's existing law, applied to the node's own leaf.
* **Dead under a RACEME** (the pedicels own the nodes and their caps size the
  leaves), and **dead at one node**. Hidden there and inert, two statements
  (NS0).

## 4. Dead controls

Each control has a registry predicate and a geometry function, compared per row
by NS0 through the page (`m.nodeLive`):

| control | predicate | function | live when |
|---|---|---|---|
| start, end | `leafNodeRunLive` | `leafNodeRunLive` | a stem that is not a raceme's rachis carries leaves, a swelling or a kink |
| spacing | `leafNodeSpacingLive` | `leafNodeSpacingLive` | the run is live and there are ≥ 3 nodes |
| size along the stem | `leafSizeTaperLive` | `leafSizeTaperLive` | the leaves own their nodes and there are ≥ 2 |

Panel route **(ar)** holds the visibility and the read-out words. That makes
THIRTY-FIVE routes, with three mutants.

**A bare noded stem's nodes follow the run** (start, end and spacing). The run
reaches the swelling and kink stations with no leaves at all. The stem's
station law (`stemNodeStations`) reads the same depths.

## 5. The NS family (both STL gates, via `leafAssertions`)

* **NS0** — the two statements, and the raceme is inert.
* **NS1** — the plan's depths against the layout RESTATED from the controls
  (`restatedNodeLayout` in the harness, its own law, with a brute-force merge
  search). It is also checked against the EMITTED petiole roots walked back to
  the wall's mid-thickness.
* **NS2** — at the default run, the depths are the OLD law's under `Object.is`.
  So is the asked inset.
* **NS3** — `inverted` iff start > end, with one node when inverted. Also
  `spacingClamped` iff the asked crowd breaks the need, and a clamped crowd
  keeps every internode at the need.
* **NS4** — the top scale, and the inset against the TOP leaf's restated rise.
  Also each node's scale and floor, and the EMITTED blade chord ratio per node
  against the restated scale.

**The leaf family runs per node under a taper.** Every blade clause (LF6 onward,
including the compound and lobed families) restates its blade from the
CONTROLS. Under a taper, each node's leaf is built from its own scaled state.
`leafNodeViews` therefore splits the record by node (per-leaf and per-blade
arrays filtered), and the clauses run once per node:

* with the controls scaled by that node's scale, RESTATED (never the plan's
  `nodeSizes`);
* against the plan's own per-node record.

The root-support family (T5/T6) does the same. LF31's whole-build triangle
total is not stated on a per-node view, since no per-node count is recorded.

Eleven witnessed mutants in `tools/verify-bloom-apex-mutants.mjs` (the
`node-run-*` ids, scoped to six `node run:` rows):

* the start ignored;
* the end ignored;
* the spacing ignored;
* the spacing reversed;
* the even arm reformed (NS2);
* a start past the end swapped (NS3);
* the merge clamp dropped (NS3);
* the taper never reaching the leaf (NS4);
* the inset reading the asked leaf (NS4);
* the taper reading the index (NS4);
* the floor skipped (NS4).

## 6. Bytes

The partition is predeclared by `verify-bloom-surface-bytes --movers-predicate
node-run`. A row moves iff its restated layout differs from the same
restatement with the four controls at their defaults, or some node's restated
scale ≠ 1.

* **23 predeclared movers**, all block-83 rows.
* **1,613 holders**: every row of the base tree's matrix (main at `77ae7f9`,
  1,608 rows), plus block 83's INSET CLAMP row (its start is raised to where the default already was) and
  its four GATED rows.

RESULT: see §9.

## 7. Matrix, gates

* **Block 83** has 28 rows (1,608 → 1,636). Smoke block 83 has 9 rows
  (`--conn`).
* `frozen/phase90` is the 1,608 rows at `77ae7f9` (main's head, after the
  BONE texture, #470). BONE merged first and took block 82 and `phase89`.
  This session's first `phase89`, at `1acc0fb`, was row for row BONE's, so it
  is dropped.
* **The combination gate gains the measure `leaf-leaf`.** It reads a leaf's
  BLADE against the blades of every OTHER node, with the rods excluded by the
  builder's own `rodAxes`. It is the first instrument here for leaves
  approaching each other. It comes with four pairs:
  * `nodespacing-x-nodes` — CLEARS (3.686 mm at 8 nodes, alternate);
  * `nodespacing-x-taper` — CLEARS (6.775);
  * `nodespacing-x-phyllotaxy` — PRODUCT-ONLY: **WHORLED × a full crowd reads
    0.750 mm**, the two cells declared;
  * `leafsizetaper-x-angle` (leaf-stem) — SINGLE-REACHES: **a 25% leaf at
    60° reads 0.311 mm** (its petiole is a fraction of its own length, so its
    blade starts nearer the stem — the law any 10 mm leaf at 60° obeys), the
    85° cells the angle's own.

  Declared by value, never clamped.

## 8. Findings flagged mid-session

1. **`shown.stem` was never set**, so the florist's cut control's detail
   read-out (it reads `shown.stem.cut`) never printed. Fixed: `shown.stem` is
   the built stem.
2. **The apex mutant table never captured SN** (leafAssertions pushes SN0–SN4,
   and the capture read `LF\d+` alone — the ST10-as-ST1 class). It captures
   `LF|NS|SN` now.
3. **This refactor disarmed `the-inset-reads-the-slider-arch`** (its anchor was
   the old inset line). The table's anchor pre-check found it, and it is
   re-anchored onto the scale-1 rise expression.
4. **The harness's node restatement ignored a DRAWN spine's own rise.** LF4
   already took the builder's spine record. `restatedNodeLayout` now takes it,
   and NS1 and LF4 hand it over. Without it, two LEAF CURVES rows read 0.26 and
   0.00035 mm off.
5. **WHORLED leaves under a full crowd come within 0.750 mm** of their
   neighbour's blade. This is declared, and it is Eva's to judge.
6. **A small tapered leaf at a steep angle** stands its blade base nearer the
   stem (0.311 mm at 25% and 60°). This is the existing short-leaf law,
   declared.
7. **The merge clamp binds hard on swelling stems** (§2). A narrow even run
   still merges swellings, the existing ST12(f) told state.
8. **The rose's NARROW run (0.20..0.45) builds ONE node.** The compound tree
   rises 44.2 mm against a 45 mm end, so the inset leaves no span. That is the
   law, told on the start's read-out.

## 9. Verification (measured)

Measured on this branch after merging `main` at `77ae7f9` (the BONE texture),
against a worktree of that commit.

- **Bytes** (`verify-bloom-surface-bytes --movers-predicate node-run`, both
  modes, in chunks): rows 0..1635 — every holder at **0 floats** under
  `Object.is`, and the block-83 chunk reads **all 23 predeclared movers moved,
  0 floats on its 5 holders**. The first half alone was 1,044,051,228 export
  floats and 71,382,604 grid values.
- **Export** (`verify-bloom-export --only '^NODE RUN:'`): 28 of 28 watertight,
  0 within-shell pairs, every shell outward.
- **Connectedness** (`--only '^NODE RUN:'`): 28 of 28 one connected body.
- **Panel gate** `--negative-control`: ALL THIRTY-FIVE ROUTES observed their
  failure, route (ar)'s three mutants included.
- **Design file** (`--no-browser`): 1,636 of 1,636 live rows round-trip.
- **Combination gate**: the four new pairs read as declared (above).
- **Edge profile (E2) — three smoke rows over the allowance, and none is the
  taper's.** CI's first run reddened `LEAF TAPER 0.5 — COMPOUND` (50.584074 deg),
  `— LOBED` (78.699198) and `0.75 FLOORED` (48.599123). Each tapered row was
  rebuilt as UNTAPERED twins, one per node scale (`leafTaperState`, taper 0),
  and each turn is a twin's to ten digits: the COMPOUND's is the half-size leaf
  (twin at 0.5; the full-size compound reads 43.69), the LOBED's is the ASKED
  leaf (twin at 1.0 — the class `LOBED TEETH: max` already declares at
  33.699198 over), the floored row's is the asked 40 x 4 mm leaf (twin at 1.0).
  Declared in `E2_TURN_XFAIL` with those values. The two `-0.5` rows (not smoke
  rows, so CI's E2 never reads them, and the stray-declaration clause refuses a
  declaration it cannot evaluate) read the same two leaves locally, 50.584074 and
  78.699198. **I did not run E2 on the smoke subset before the first push, as the
  brief asked; CI caught it.**
- **Apex mutants**: the eleven `node-run-*` witnesses all move on the mutated
  module; the full sweep is CI's (`bloom-apex-mutants.yml`, twelve shards).
