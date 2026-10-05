# Inflorescence build 3 — Phase A: the reach inset (#355) and the 250 mm pedicel; Eva's three rulings; Phase B: per-node variance

Session of Oct 4, 2026, on `claude/adoring-curie-p3zjlo` against `main` at `23b13bd`.
Eva's brief: "Derive the clearance from the floret's actual petal reach rather than
from the pedicel, so the default is clean. Do not add a control for it", and "Raise the
pedicel cap from 120 mm to 250 mm (my ruling, Oct 4)". Phase A stopped for her ruling;
**§11 onward is the ruling (three decisions) and Phase B, built on `06e489c` — the
sections above describe the tree as Phase A left it and are kept as the record Eva ruled
on; where a figure of theirs has moved (the 16.4 mm internode, the 0.676 mm default,
`INFLO_OVERTOP_XFAIL`'s two rows), §12–§13 say what replaced it.**

Every figure below names its MODE and its SAMPLING. "Node 22" is this container's
`node` (v22.22.0); the browser-side numbers are from the gate's Chromium where it says so.

## 0. Reconciliation (source wins over the prompt)

`main` since `af15342` holds exactly one commit, `23b13bd` (#356, stem session 2:
`PEDICEL_PINS`, `leafNodes` under Stem, block 47, `frozen/phase51` = 1080 rows at
`af15342`). Nothing in the brief is shipped by it, nothing it shipped is superseded by the
brief, and `PEDICEL_PINS` is the one thing Phase B must respect (a per-node delta may not
reach the three pinned ids). No registry or geometry PR was open when this branch was cut
(#230 is a no-op deploy-preview snapshot, #111 a flower draft). Issue #355 is open and
unfixed and names the mechanism this session fixed.

**Three disagreements between the brief and the source, each a finding:**

1. **"The pedicel cap of 120 mm" was not a pedicel constant.** `lenCeilMm` read
   `STEM_LENGTH_RANGE[1]` — the HEAD's own stem control, 120 — while
   `PEDICEL_LENGTH_RANGE` was `[0, 60]`, so the slider stopped at 60 and the per-node
   law (gradient, corymb) clamped at 120. Raising "the cap" is therefore two numbers:
   the slider's range and the ceiling the per-node law clamps to. Both are 250 now and the
   ceiling reads the pedicel's own range (`PEDICEL_LENGTH_RANGE[1]`), never the stem's.
2. **A shipped guard forbade the ruling.** `tools/bloom-harness.mjs` threw at module
   load if `PEDICEL_LENGTH_RANGE[1] > STEM_LENGTH_RANGE[1]` ("a pedicel outside the
   stem's own range is a rod nothing has ever been proved on"). It fired the moment the
   range moved — measured, the harness refused to load at 250. It is RESTATED, not
   deleted: the pedicel's floor is the stem's, its ceiling is never narrower than the
   stem's, and the ceiling is Eva's 250 (a re-narrowed cap is caught at load). The rows
   that prove the rod are block 48's, which is the proof the old sentence asked for.
3. **`INFLO: ALL MAX` could not keep its label at the new cap.** "Every inflorescence
   control at its maximum" at 250 mm pedicels straight up builds ONE node (the floret's
   reach, 265 mm, exceeds the 120 mm rachis), 143,352 export triangles — it stops being
   the budget corner. §4 has the redefinition and the row that is the corner now.

## 1. The law

`inflorescencePlan` (bloom-geometry.js) now builds the topmost floret unit — the very
unit `buildInflorescenceInto` appends at node 0, from one memo carried on the plan — in
BOTH modes, places it through `pedicelPlacement` at a node of depth 0 **at every azimuth
the phyllotaxy produces on any asked node**, and reads `reach` as the highest world z of
any emitted vertex above that node, ceiled onto a 2^-16 mm grid. The top node sits

    insetNeeded = max(0, reach + (rootZ − headFloorZ) + MIN_FEATURE_MM)

below the stem's root plane, where `headFloorZ` is the stem plan's own lowest head
material (`rootZ`, the join's underside; `lowestHubZ` where a dome's rim hangs lower).
The floret's highest point then stands one printable gap under the head's lowest material
plane. `reach` is the MAX over the two modes' units, so the node is where it is in either
— topology is mode-free by construction (the stem channel's own union), not by
observation. `insetMm = max(asked, needed)`; `insetClamped` and `insetSatisfied` keep the
leaf law's biconditional shape. No constant is typed: the gap is `MIN_FEATURE_MM`, the
floor and the root plane are the stem plan's, and the grid (`INFLO_REACH_GRID_MM`,
2^-16 mm, CEILED so the gap survives the rounding) exists because the node COUNT is a
discrete decision on the reach and the page's V8 and Node's differ in the last bits of a
coordinate reached through trigonometry — the eighth instance of that class here.

What it replaced: `insetNeeded = pedicelLen · sin(angle)` — the LEAF's law, inherited by
build 1, which clears the ROD and not the flower on it.

**Cost:** one extra floret unit build per raceme build (the other mode's), memoised and
reused by the builder and the shared-node leaf cap; nothing is built twice. Default
raceme: ~300-750 ms a mode in Node for the whole bloom (the extra unit dominates).

**The reach is a plane clearance, deliberately.** It is one length read off emitted
geometry against one plane, and the shipped head's own petals never reach below that
plane — they would only under an effective tilt past a right angle, or as sepals, both
outside this subject and said so in the geometry's header.

## 2. Measured

### 2a. The shipped raceme (`stemLength 120, inflorescence RACEME`, everything else default)

| | before (`23b13bd`) | after |
|---|---|---|
| inset asked (0.16 L) | 19.200 mm | 19.200 mm |
| inset needed | 11.472 (the pedicel's rise) | **37.735** (reach 36.735 + 1.000 gap) |
| top node below the hub | 19.200 | **37.735** |
| node depths | 19.2 / 40.2 / 61.2 / 82.2 / 103.2 | 37.7 / 54.1 / 70.5 / 86.8 / 103.2 |
| internode | 21.0 mm | **16.4 mm** |
| floret-head approach (EXPORT, `bloom-inflo-approach`) | **0.000 — crossing** | **10.103 mm** |
| floret-floret (adjacent nodes, opposite sides) | 2.233 | **0.676 — UNDER THE 1.00 mm BAR** |
| export triangles | 113,886 | 113,886 |

The reach reads 36.7345 in LIVE and in EXPORT alike on the default sheet — 32.9323 at
azimuth 0 and 36.7345 at azimuth π (node 1's side), because the placement's roll is the
MINIMAL rotation and a floret's petal pattern lands with a different petal up at each
azimuth (§2e). The sweep that chose the law: dropping the top floret by 1..7 mm leaves it
crossing, 8 mm reads 0.555, **9 mm is the first clear of the 1.00 mm bar (1.461)**, 14 mm
5.993, 20 mm 11.431 — the law lands it 18.5 mm lower than before and 10.10 mm clear,
because the plane clearance is conservative where the head's petals rise away from the hub.

**THE FINDING FOR EVA: the default is clean against the head and under the bar against
itself.** At 16.4 mm internodes the florets one node apart, on opposite sides of the
rachis, bring their petal tips to **0.676 mm** of each other (2.233 at the old 21.0 mm).
It is one state read through three combination grids (`inflo-gradient-x-angle @ 1 x 35`,
`inflo-gradient-x-tilt @ 1 x 25`, `inflo-length-x-tilt-ff @ 20 x 25`), declared on the day
it was measured and NOT tuned: a law that kept the 21 mm internode and gave up the lowest
node instead would be a change to build 2's node law (count gives only at the pitch floor)
and wants a ruling. The two candidate rulings, with their cost: (i) keep this — the head is
clean, the florets crowd; (ii) hold the internode and shorten the count — the default
raceme becomes four nodes. Neither is pre-built.

### 2b. Where the two modes differ (the union's only witnesses)

| state | reach LIVE | reach EXPORT | need |
|---|---|---|---|
| default | 36.7345 | 36.7345 | 37.73 |
| sheet 0.60 | **35.6071** | **36.4053** | 37.41 |
| headRise 1 (hemisphere) | 33.63 | 33.63 | 42.8 — the floor is the RIM, 8.13 mm under rootZ |
| floretScale 1.00 | 51.76 | 51.76 | 52.8 |
| pedicelAngle −60 | 1.3995 | 1.3995 | 2.40 — the stem's own 19.2 stands (not clamped) |
| 100 mm at 35° | 82.62 | 82.62 | 83.6 — five nodes in the 19.6 mm left |
| 250 mm at 35° | 168.66 | 168.66 | 169.7 — past 0.86 L: ONE node, told |
| 250 mm at 90° | 259.1193 | 259.1193 | 260.12 — one node |

(The sphere, tilt-120 and sessile figures of the first cut — 31.96 / 26.23 / 21.83 at
azimuth 0 — are superseded by the azimuth-complete law and not re-tabulated; every row's
own figure is on its read-out.)

`REACH INSET: a 0.60 mm sheet` is in block 48 and the smoke subset because it is the one
row on which a reach read from one mode is visible at all.

### 2c. The budget corners (EXPORT, Node 22, against 1,500,000)

`INFLO: ALL MAX`'s family (12 nodes × whorled × 12 petals × 1.00, straight up) over the
pedicel sweep — the stem is a straight two-station tube, so the pedicel's length costs no
triangles; what moves is the NODE COUNT the deeper inset leaves room for:

| pedicel mm | 5 | 20 | 40 | 60 | 80 | 100 | 120..250 |
|---|---|---|---|---|---|---|---|
| nodes | 12 | 12 | 12 | 10 | 3 | 1 | 1 |
| tris | 1,425,468 | 1,425,468 | 1,425,468 | 1,192,356 | 376,464 | 143,352 | 143,352 |
| budget | 95.0% | 95.0% | 95.0% | 79.5% | 25.1% | 9.6% | 9.6% |

The same corner at 35° with a 40 mm leaf under every pedicel (the NODE LAWS refusal row):
1,517,196 (101.1%, REFUSED) at 5/20/40 mm; **1,144,596 (76.3%, EXPORTS) at 60 mm, nine
nodes**; 647,796 at 80; 150,996 at 100 and above. So the declared refusal at 60 mm
stopped refusing — XR1 fails hard on exactly that — and the row is redefined to 40 mm (§4).

### 2d. The corymb at the raised cap (defaults: 20 mm at 35°, corymb ON)

Largest rachis the corymb solves level WITHOUT clamping: **197 mm** (lengths
20.0 / 77.4 / 134.8 / 192.2 / 249.6), measured by sweeping `stemLength` 60..260 at 1 mm —
beyond the stem control's own 120. On the full 120 mm rachis: **20.00 / 48.53 / 77.07 /
105.60 / 134.14 mm, unclamped, heads spanning 0.000 mm** (the old cap clamped the lowest
at 120 and the heads spanned 26.64). Under the old law the brief's 81 mm figure
reproduces as the clamp point; under the new inset the lowest pedicel is shorter at every
rachis (the span it must climb is 65.5 mm instead of 84.0), which is why 197 and not
`120 + ...`.

### 2e. The azimuth finding — the smoke subset's, not reasoned

The first cut measured the reach at azimuth 0 alone. `bloom-smoke --conn` then dropped
`INFLO: WHORLED` on ID9 (d): the florets reached z = 0.4565 against a floor-less-gap of
−2.9156 — **3.37 mm into the gap with `insetSatisfied` true**. The placement's roll about
the pedicel is the MINIMAL rotation (about `z × D`), so a floret whose petals are not
symmetric about its own axis lands with a different petal UP at each azimuth, and the two
whorled florets the plan had not measured reached higher than the one it had. The law takes
the max over every azimuth the phyllotaxy produces on any asked node (two, four, or
whorled's rotating set — each one pass over the unit's vertices), which also makes the TOP
node's inset conservative for every lower node; the builder's measured side is every
placement (`floretsMaxZ`), not node 0's. On the default that moved the reach 32.93 →
36.73 (azimuth π is node 1's side), the top node 33.9 → 37.7, the corymb's lowest pedicel
140.8 → 134.1 and the internode 17.3 → 16.4 — which is what took the default's own
floret-floret approach from 2.233 to 0.676. **Every figure in this document is the
azimuth-complete law's; the first cut's are named as superseded where they appear.**

## 3. ID9 — the family, and what each clause can see

`ID9` in `inflorescenceAssertions` (both STL gates), six clauses: (a) the plan's live and
export reach against the top unit rebuilt in Node from the controls and placed at depth
0; (b) the head floor against the STEM plan's own two heights (`rootZ`, `lowestHubZ`,
both newly projected by the metrics hook — the first run threw on their absence); (c) the
law restated; (d) THE EMITTED top-node florets, read off the builder's placements and
source stream, at or below the head floor less the gap wherever the plan says the inset is
satisfied — the one clause no rebuild can stand in for; (e) the two biconditionals; (f)
mode-freeness measured — the other mode's plan rebuilt in Node carries the same node
depths to the bit. Smoke census: 136 families, ID9 claimed by block 48's rows, both
directions. Block 48 is ten rows (1089 → 1099), smoke block 48 four rows (153 over 44
blocks).

Mutants (`tools/verify-bloom-apex-mutants.mjs`, each witnessed on the MUTATED module's
own plan): `the-inset-reads-the-pedicel-again` (ID9), `the-reach-reads-one-mode` (ID9, on
the 0.60 mm row — its witness refuses a probe state whose two reaches agree),
`the-pedicel-ceiling-is-the-stems-again` (ID7, on the 250 mm row). Two rows added to the
table for them. **Run (`--only=` the three, after two anchor corrections of this session's own — the one-mode mutant's anchor moved when the reach was quantised): each fires exactly the family it names and the clean tree is silent on every row; the ceiling mutant also reddens ID4 (a 250 mm pedicel clamped to 120 changes the floret's own stem length, which ID4 reads), recorded as collateral. 88 mutants were not run — a SUBSET, never a sweep.** The clean-tree control first fired ID9 on three rows, and all three were defects in ID9 itself, found by the real export gate rather than reasoned: (e) asserted the top node equals the inset on a row whose florets cannot clear the head (the node law holds its single node at 0.86 L there — guarded on `insetSatisfied`); (d) read a unit source stream the metrics hook never projects (the builder's own `topNodeMaxZ` now); (f) asked for `Object.is` between the page's V8 and Node's on a reach reached through trigonometry and went red on depths equal to four decimals (within one engine now, the page held to the same-mode rebuild within the arithmetic's bound). The export gate on the five witness rows then read 4 of 5 reaching the results; the fifth, the hemisphere row, is X2 — the HEAD's own rise-1 fold (248 pairs at 0.4262 mm on `STEM: x a hemisphere`) plus five florets inheriting rise 1 at 220 each, 1348 — declared from birth and reproduced in Node at exactly that count.

### 3a. CI's first full run found two more defects in ID9, and one real finding under them

The pushed head `06b96b7` went red on shards 1 and 3 of `bloom-export-watertight` (run
37217876478), one dropped row each, both ID9's own clauses, and the smoke subset had no
row that could have seen either — the same shape as §2e, from the other direction.

**(e) on `INFLO: ONE node`** — "the top node sits 66 mm below the hub and the inset is
34.63". The clause asserted the top node IS the inset wherever the inset is satisfied, and
`leafNodeDepthsMm` has a separate arm for ONE node: the flower's solo station,
`LEAF_NODE_SOLO` (0.55 L = 66 mm on the 120 mm rachis), never shallower than the inset and
never past the span's end. Deeper than the law asks, which clears the head by more. The
clause is restated from the geometry's two constants (`max(solo, inset)` clamped to the
span for one node; the inset otherwise) with a second, count-free statement beside it:
no top node may ever stand shallower than the inset. `INFLO: ONE node` is a smoke row now
(block 37, 155 rows over 44 blocks).

**(d) on `NODE LAWS: gradient 3 x 12 nodes x 60 mm`** — "the florets reach z = 23.39 mm
against a head floor of −1.92 less the gap: an emitted floret stands 26.31 mm into the
gap" while `insetSatisfied` read TRUE and was right. The clause asserted every placement
clears, and the law never claimed that: the inset is the TOP unit's reach, and build 2's
gradient gives a LOWER node a LONGER pedicel — node 12's is 180 mm against the top's 60,
and at 35° it rises straight through the terminal head. The builder's own comment beside
`floretsMaxZ` said *"the law is conservative for every node"*; that was false under a
gradient and is replaced by a measurement. **Swept in Node over all 65 buildable
inflorescence rows (ALL MAX and the two refusal corners excluded), both modes agreeing to
the double: exactly two rows overtop, both gradient 3** — this one at 26.3068 mm and
`REACH INSET: gradient 3 x 100 mm` at 71.3519 mm (node 5, its ramp clamped at the 250 mm
ceiling). Every corymb row reads 0 (level heads clear exactly as the top does) and so
does every gradient-1 row, the shipping raceme included.

What ships: the builder reports `floretsMaxZByNode` beside `floretsMaxZ`; (d) is two
clauses with their subjects stated as sets — node 1's own maximum clears on every
satisfied row, unconditionally (the law's claim, the clause the mutant fires), and the
whole-placement maximum is held to `INFLO_OVERTOP_XFAIL` in BOTH directions (#213's form,
±5e-4 mm; an undeclared row must read 0, a declared one at its number, a declared row
whose plan is not satisfied is stale, and a declared label the matrix did not run fails
`ID9 coverage` beside `XR coverage`). The read-out tells it on every build where it
happens — *"A LOWER FLORET OVERTOPS THE HEAD: node 12's (180.0 mm pedicel, 3.00x the
top's) stands 26.31 mm into the gap under the head"* — and the gradient row is a smoke
row (block 46). **This is a Phase A finding for Eva beside §2a's 0.676 mm:** the gradient
at its top makes an anthela whose lower heads pass through the terminal head, and nothing
in the reach inset can reach it (insetting the top node deeper only moves the whole ramp
down with it). Not clamped: the range Eva ruled stays reachable, and whether a graded
raceme should solve its LOWER nodes' clearance as well is a node-law question, build 2's.

**The smoke subset, both gates, on the final tree: export PASS (151 of 151 reached the
results, every one watertight) and connectedness PASS (151 of 151 one piece)** — run as the
two gates on `SMOKE_REGEX` less `ALL MAX`, which on this box exceeds the 30 s settle budget
on the base tree too (47.7 s there) and is CI's. The first smoke run is what found §2e.
The panel gate passes (`--negative-control` not re-run — no route was added).

## 4. Row definitions moved (declared, never silent)

* `INFLO: ALL MAX` → `pedicelLength 250` ("ONE node of 3 florets: a 250 mm pedicel
  reaches past the rachis"), 143,352 tris. Its `EXPORT_REFUSED_XFAIL` entry was never
  for this row (it never refused).
* `NODE LAWS: ALL MAX at 35 deg x a leaf under every pedicel` → `pedicelLength 40`
  (the longest pedicel at which the corner still refuses), 1,517,196 tris, 101.1%, the
  entry's note carries the original.
* `REACH INSET: THE BUDGET CORNER` (block 48) = the old `INFLO: ALL MAX` state at 40 mm,
  1,425,468 (95.0%) — the densest raceme the controls reach, and the row a future
  per-petal feature checks first.
* Three relabels of live rows whose text stopped being true: the gradient-3 row "CLAMPED
  at the pedicel's own 120 mm ceiling" (180 mm now, under 250), the corymb-on-120 row
  "CLAMPED" (solved exactly now), and `INFLO: 60 mm pedicels (the ceiling)` (build 1's).
  `frozen/phase52` keeps all five as they were.
* **After ruling 1 (§12), two more**: `NODE LAWS: ALL MAX at 35 deg …` → "(ONE node under
  the florets' own floor — 10.1% of budget, EXPORTS; was 101.1% REFUSED at twelve nodes
  before ruling 1)", its refusal entry retired; `REACH INSET: THE BUDGET CORNER` → "(TWO
  nodes under the florets' own floor, 17.3% of budget; was 95.0% at twelve before ruling
  1)". Same control sets; the labels said a count and a budget share the floor made
  false. `frozen/phase50`–`phase52` keep the old labels.

## 5. The combination grid — what moved and why

The inset moves EVERY raceme's nodes, so the whole inflorescence section of
`tools/bloom-combination-gate.mjs` was re-measured (`--emit --only '^inflo-'`, Node 22,
EXPORT):

* **`inflo-length-x-angle` CLEARS** — all seven declared cells, the shipped raceme's own
  among them, read 4.0 to 8.3 mm at the first cut and higher again under the azimuth-complete law (the
  default's 10.10). Seven entries retired, verdict
  `single-reaches` → `clears`, the pair KEPT so a top floret touching the head is loud
  again. **This is #355 closed on the grid that found it.**
* **Two corymb cells retired**: 35°×40 mm clears at 15.000 (the search cap), 60°×40 at
  Infinity (one node — no pair).
* **Three re-recorded WORSE** (0.654 → 0.000 twice, 0.723 → 0.000), **fifteen new cells
  under the bar** — three of them the DEFAULT RACEME's own 0.676 (§2a), one state through
  three grids — and every other one an edge crossing by the same mechanism: **THE
  TIGHTER INTERNODE.** The top node is 37.7 mm down the shipped rachis instead of 19.2,
  the bottom node stays at 0.86 L, so the five nodes share 65.5 mm instead of 84.0 — 16.4
  mm apart against 21.0 — and florets on longer pedicels (the gradient at 2 and 3, 60 mm
  pedicels), the level heads of a corymb on a short rachis, and a 15 mm leaf two nodes
  up all reach their neighbours sooner. The node law (count gives only at the pitch
  floor) is build 2's, unchanged; neither the pitch nor the span was tuned.
* **`inflo-leaf-nodes-x-leafangle`'s base was INERT and moved.** On its 52 mm rachis the
  deeper inset leaves 10.8 mm of span, so 5 and 12 asked both collapse to the same four
  nodes at the pitch floor and CG1 refused the axis at 0.000e+0 of movement — correctly.
  The base is the shipped 120 mm rachis now (5 nodes 16.4 mm apart, 12 nodes 6.0 — the
  tightest internode the law reaches on it), a grid change inside the shipped ranges that
  restores the axis rather than manufactures a cell; one cell declared (12 × level),
  verdict `single-reaches` → `product-only`.
* **The long-pedicel-against-stem column**: `inflo-length-x-tilt` gains 250 mm. Measured: **205.197 mm at every tilt** — a 250 mm rod stands its one floret 205 mm from the rachis; the column clears and is kept as the long-pedicel witness.

**The full gate (every pair and triple, Node 22): 167 cells under the bar, 167 declared, across 25 pairs and triples, 0 strays, 0 inert mismatches — PASS; the inflorescence subset 41 under the bar, 41 declared; `--control`: every clause fired on a plant that names it, and the tree is green without them.**

**For Eva, as a consequence rather than a defect:** the price of a clean head is a
shorter node span. A law that kept the 21.0 mm internode and gave up the lowest node
instead (the count, not the pitch) would be a change to build 2's node law and is not
this session's to make without a ruling.

## 6. The byte partition

Predeclared from the BASE tree's own record (`verify-bloom-surface-bytes.mjs
--movers-predicate inflo-reach`): a row moves iff `base.leafNodeDepthsMm(nodesAsked, L,
max(asked, reach-law inset), 2·pedicelR)` — the reach law restated from pieces the base
tree already owns (its own `floretUnitMemo`, `pedicelPlacement`, `MIN_FEATURE_MM`, the
stem plan's heights) — differs from the base plan's depths, or a pedicel asked past the
base's 120 ceiling was clamped there. The first cut predicted on the INSET and was wrong
twice, which the tool said: `INFLO: ONE node` sits at the flower's solo 0.55 L whatever
the inset, and a raceme whose florets cannot clear the head collapses to one node on both
trees — changed inset, unchanged depths, HOLDERS. **THE WHOLE 1099-ROW MATRIX, both modes, positionally under `Object.is`: PASS — 62 predeclared movers moved, 1037 holders bit-identical, over 1,469,736,180 export floats and 163,304,020 triangles** (run against the azimuth-0 module, whose holders the azimuth fix cannot touch — it changes only raceme rows, all of which are movers). The movers re-confirmed on the FINAL module over the 69 inflorescence rows (`--only 'INFLO|NODE LAWS|REACH INSET|BARE NODES: GATED|pedicel|floret|raceme'`): **61 of 61 moved, 8 holders to the bit, 198,158,220 floats**. The holders are the two GATED rows, the no-rachis row, `INFLO: ONE node` (the flower's solo 0.55 L, whatever the inset), the cannot-clear row (one node on both trees), the GATED bare-nodes raceme and the descending (−60) row, whose reach (1.40 mm) sits under the stem's own inset. `ALL MAX` and `ALL MIN` are holders by construction (no `INFLO:` row sets `inflorescence`, and `INFLO_SUB_IDS` keeps the pedicel out of the blanket sweep) and are measured as such.

## 7. Frozen baselines

`frozen/phase52` = the 1089 rows at `23b13bd`, registered in both maps and proved
deep-equal (`--verify-frozen --phase52 --base <worktree>`: PASS, row for row). A phase is
owed because the row set changed (block 48, +10). **Which tags' bytes stop reproducing (the predicate above applied to every registered frozen matrix on the base tree, memoised on the control set): 376 of 33,512 frozen rows over 16 of 51 baselines — phase37 18 of 883, phase38–45 19 each, phase46–49 20 each, phase50 21, phase51 52 of 1080, phase52 53 of 1089; phase2–36 0 (no raceme row exists before phase37).** Every definition still deep-compares. The tag is dispatched after the merge (`bloom-frozen-tags`), and `phase52`'s base `23b13bd` is on `main` with workflow files identical to HEAD's, so it is expected to publish; it is not pre-declared in `TAG_PUSH_XFAIL`.

## 8. Files this session must not touch (predeclared) — verified by diff at close

`flower*`, `print*`, `plot*`, `scene*`, `cards*`, `weave*`, `bug*`, `frame*`, `marble*`,
`tile*`, `artist-tracker.html`, every `tools/verify-flower-*`, `bloom-grid-gltf.js`,
`bloom-geometry.js` outside `inflorescencePlan` / `PEDICEL_LENGTH_RANGE` / the memo
hand-off in `buildBloomInto`. `git status` at the first commit: `CLAUDE.md`, `bloom-geometry.js`, `bloom-registry.js`, `bloom.js`, `docs/bloom-charter.md`, five `tools/` files, and the three new files (the doc, the sheet, its tool). Nothing on the manifest moved. Inside `bloom-geometry.js` the diff is the range constant and its grid, `inflorescencePlan`'s inset block (the size block moved above it), `lenCeilMm`, `buildInflorescenceInto`'s `topNodeMaxZ`, and the memo hand-off.

## 9. The sheet

`node tools/shot-bloom-build-3.mjs docs/img/inflo-build-3-phase-a.png --base <worktree of
23b13bd>` → `docs/img/inflo-build-3-phase-a.png`: the shipped raceme BEFORE (a real build
of the base commit's module) and AFTER, whole and at the top node; the corymb on the full
120 mm stem before (clamped at 120, heads spanning 26.64 mm) and after (solved, 0.000),
at 8 nodes, and the 250 mm pedicel at 35°. Deterministic renderer, no pixel delta quoted.

## 10. Phase B — as it stood at the Phase A stop (two notes, both discharged in §15)

* Per-node deltas go through `resolveRoleOverrides`'s existing composition; a delta may
  not reach `PEDICEL_PINS` and must respect the memo-by-distinct-state (a delta per node
  is a build per node, O(N) — the cost the discovery predicted).
* The derived per-floret phase (outward from the node's radial direction): the state doc
  records that the variance phase is SHARED between the size and form fields and that a
  roll rotates the whole floret rather than the field relative to its petals; the brief's
  "report and stop rather than substitute world-fixed" applies if the frame cannot be
  expressed in `varianceWave`'s own terms.


## 11. Eva's Phase A ruling (Oct 4), verbatim in substance

1. **INTERNODE — derive the floor, lose the node.** "A shipped default does not go under
   the 1.0 mm bar … Derive the internode floor from the floret's actual reach so the
   default clears 1.0 mm, rather than hard-coding a number. One fewer floret on the
   default raceme is an acceptable price." Report the derived floor, the default's
   approach, the node count across the reachable range, and any reachable setting that
   still cannot clear the bar — declared with its mechanism, never clamped silently.
2. **OVERTOPPING — clamp it.** "The gradient caps so the lowest head does not exceed the
   terminal head's height. Build 2 left the anthela shape unexposed deliberately, and it
   is not arriving through the back door unnamed." Report the cap's cost at the extreme;
   confirm the corymb's level solve is untouched.
3. **DEFAULTS CLEAR THE BAR — a standing clause**, with a mutant that goes red when one
   does not. Built in Phase B if it fits.
Then Phase B: per-node deltas through the existing resolver, the per-floret phase derived
from each node's radial direction (outward from the axis, never world-fixed; report and
stop if the construction cannot express it). "Changes 1 and 2 are law changes, so any
mutant that went green against the old laws is stale evidence — re-run them."

## 12. Ruling 1 — the internode floor is the florets' own

### 12a. The law (`floretPitchFloorMm`, `floretPairClasses`, `bloom-geometry.js`)

The pitch floor the node law hands `leafNodeDepthsMm` was `2 · pedicelR` — the RODS' own
floor, which is why the default raceme's florets stood 0.676 mm apart with the rods clear.
It is now `pitchFloorMm = max(2·pedicelR, pitchFloretMm)`, where `pitchFloretMm` is
derived from the floret unit the builder EMITS:

* **A pair is two azimuths and a depth, `(a, b, d)`, never an azimuth DIFFERENCE.** The
  placement roll is the MINIMAL rotation, so a floret at azimuth `a` and one at `b` are
  not congruent under rotation by `b − a` — the first cut classed pairs by difference and
  derived an 11.5 mm floor against a measured 0.68 mm approach. `floretPairClasses(phyllo,
  n, dMax)` enumerates the distinct `(a, b, d)` the phyllotaxy produces over the asked
  node count (azimuths reduced mod 2π and quantised to 1e-9 rad), with `d` in node steps
  up to `dMax`.
* **The bound is a column map.** Each azimuth's placed unit is binned in xy on cells of
  `gap / INFLO_PITCH_CELLS_PER_GAP` (= 4; the constant's comment carries the trade:
  19.16 / 19.14 / 17.97 / 17.97 mm at 1 / 2 / 4 / 8 cells a gap for 0.45 / 0.47 / 0.63 /
  1.55 s of plan time, against an exact mesh crossing of 16.55), each cell holding the
  z-range of the triangles that cross it — CLIPPED to the cell through each triangle's own
  plane, because a long pedicel rod's triangles span far more z than they occupy over any
  one cell (unclipped the bound read 39.4 mm against an exact 33.1). For every cell of the
  upper floret and every cell of the lower within `gap` in xy the shift that puts them
  `sqrt(gap² − r²)` apart in z is the pair's bound; `floorMm = max over pairs of
  bound(a, b) / d`.
* **Both modes, ceiled.** The bound is taken in LIVE and EXPORT (the units differ at the
  print floor) and the larger wins, then ceiled onto `INFLO_REACH_GRID_MM` (2⁻¹⁶ mm) —
  topology is mode-free by construction, the eighth time this file has refused the
  alternative.
* **Equal pedicels only, said.** The floor is derived for the ungraded raceme. A graded or
  corymb raceme's lower florets sit on pedicels of another length and are MEASURED
  instead (ID10 (d), §12d); deriving the floor from the graded lengths would be count →
  lengths → floor → count, the fixed point the pedicel radius's own comment refuses.
* **Same-node florets are the phyllotaxy's, not the internode's.** The `d = 0` pairs
  cannot be moved apart by any pitch; the plan REPORTS whether the bound admits a
  contact there (`sameNodeMayTouch`), the read-out prints it, ID10 (c) holds it both
  ways, and a row where they do touch is declared by name (§12d).

The read-out's INTERNODE line prints the internode, the floor, which owner won (`the
FLORETS' own` with the pair and the shift, or `the RODS' own` with what the florets
asked), and the FLORETS OF ONE NODE clause when it applies.

### 12b. The default (EXPORT, Node 22, `stemLength 120, inflorescence RACEME`)

| | Phase A (`06e489c`) | ruled (this tree) |
|---|---|---|
| pitch floor | 6.00 mm (the rods') | **17.97 mm** (the florets' — the floret at 0° against the one a node below at 216°, from 17.97 mm of shift; exact mesh crossing 16.55) |
| nodes | 5 | **4** |
| internode | 16.4 mm | 23.5 mm |
| floret-to-floret (ID10 (d), the file) | 0.676 mm | **9.614 mm** |
| export triangles | 113,886 | **96,468** (6.4 % of budget) |

One fewer floret, as the ruling priced it; the floor is 1.42 mm over the exact crossing
(the column map's own conservatism: two parts just over a gap apart in xy are held to a
full gap in z), reported, not tuned away.

### 12c. The reachable range (`sweep3.mjs`, every inflorescence row of the matrix, EXPORT)

Node counts before → after, the floor and who owns it (F florets / R rods), the measured
approach (the gate's own engine), and whether a graded length was clamped:

| row | nodes | floor | approach |
|---|---|---|---|
| the shipped raceme | 5 → 4 | 17.97 F | 9.614 |
| WHORLED (3 a node) | 5 → 2 | 38.20 F | 11.502 (same-node may touch, and does not) |
| size 1.00x | 5 → 2 | 26.58 F | 8.846 |
| pedicels straight up (90°) | 5 → 4 | 22.96 F | 2.482 |
| 12 petals a floret | 5 → 4 | 19.80 F | 5.308 |
| 3 petals a floret | 5 → 4 | 17.25 F | 11.381 |
| 5 mm pedicels | 5 → 3 | 29.49 F | 10.875 |
| 60 mm pedicels | 5 → 3 | 17.97 F | 15.000 (the cap — no pair) |
| descending (−60°) | 5 → 3 | 39.64 F | 3.455 |
| 12 nodes on the 120 mm rachis | 12 → 4 | 17.97 F | 9.614 |
| x a SPHERE head | 5 → 5 | 14.29 F | 8.704 (held: the sphere floret is shorter) |
| ONE node | 1 → 1 | 6.00 R | — (the only row where the rods' floor still wins) |
| SESSILE (a spike) | 5 → 3 | 31.73 F | 6.942 |
| SESSILE x whorled x 12 nodes | 12 → 3 | 32.37 F | **0.000 — same-node crossing, DECLARED** |
| gradient 0.5 / 2 / 3 | 5 → 4 | 17.97 F | 5.192 / 4.879 / 2.043 |
| gradient 0 (the floor) | 5 → 4 | 17.97 F | **0.000 — node 3 through node 2, DECLARED** |
| gradient 3 x 12 nodes x 60 mm | 12 → 3 | 17.97 F | 8.695 (gradient CLAMPED 3 → 2.2356, §13) |
| corymb on 120 / 40 mm | 5 → 4 / 1 → 1 | 17.97 F | 9.614 / — |
| REACH INSET: gradient 3 x 100 mm | 5 → 2 | 17.98 F | 15.000 (gradient CLAMPED 3 → 1.3414) |
| LEVEL TOPS x 8 nodes | 8 → 4 | 17.97 F | 9.614 |
| a hemisphere head | 5 → 4 | 17.50 F | 6.871 |
| VARIANCE x the raceme | 5 → 3 | 23.80 F | 13.261 |

Over the 61 buildable inflorescence rows **59 clear the bar and 2 are under it, both
crossings and both declared in `INFLO_APPROACH_XFAIL` with their mechanism**: the
gradient at its floor (lower pedicels shorten to zero and node 3 walks back through node
2 — graded, outside the floor's subject) and three sessile florets of one node 120° apart
on a 6 mm rachis (the phyllotaxy's — no internode moves two florets of one node apart; the
row's own floor of 32.37 mm IS met one node apart). **Nothing is clamped silently**: the
read-out names both mechanisms where they occur and the gate holds each entry at its
number both ways (band 5e-4 mm, a declared row that starts clearing trips it).

### 12d. ID10 — the family (`inflorescenceAssertions` / `infloApproachAssertions`)

(a) the plan's declared floor is the geometry's own bound RESTATED on units the harness
rebuilds in Node per azimuth, both modes — the harness owns its copy of the enumeration,
the geometry owns the law; (b) every emitted internode is at or over the declared floor;
(c) `pitchFloorIsFlorets` and `sameNodeMayTouch` as biconditionals against that bound;
**(d) the EXPORTED FILE**: every floret block's unique vertices against the other blocks'
triangles through `triGrid` / `nearest` / `crosses` IMPORTED from
`tools/bloom-inflo-approach.mjs` (the combination gate's own engine, one owner — so this
clause and the gate's `floret-floret` measure cannot disagree about what an approach is),
the rachis join excluded by `freeStemDistanceMm` as the gate excludes it, a crossing
reading 0. Its first cut tested a `present` flag the stem projection does not carry and
RETURNED before claiming anything — the fifth durable rule inside the clause written to
apply it — and the export gate read `ok` on the gradient-0 row whose florets pass through
each other; it reads `S.tip[2]` now and fails loudly on any missing field. Rides in both
STL gates after ST9; `infloApproachCoverage` refuses a declaration the matrix never ran.
`INFLO_OVERTOP_XFAIL` is EMPTIED (the cap makes its two rows unreachable, §13) and the
list is kept so a row that overtops again is a declaration rather than a silence.

### 12g. Two corners the floor opened to ID10 (d), declared; and NV4's exact-string claim across two engines

The export subset on the final tree dropped three rows, two of them ruling 1's own doing: at twelve
nodes `REACH INSET: THE BUDGET CORNER` was a declared refusal and never censused, and `INFLO: ALL
MAX`'s single 250 mm node had never been read by ID10 (d); under the floor the corner holds two
nodes and exports, and (d) reads **0.0000 mm** on both — **three full-size twelve-petal florets of
ONE node, 120 deg apart on a 6 mm rachis, passing through each other at the node**, the sessile
spike's mechanism at the other end of the size range, which no internode can move apart
(`sameNodeMayTouch` is told on both). Declared in `INFLO_APPROACH_XFAIL` with that mechanism,
never clamped: a floret's size and petal count are the head's own two controls. The third was the
harness's: NV4 compared each placement's per-node overrides against its own restatement as JSON
strings, and on `NODE VARIANCE: x WHORLED x 8 nodes` `petalCup` read 0.7071067814675859 on the
page against 0.707106781467586 here — one ulp, Chromium's `Math.cos` against Node's at one of the
twenty-four azimuths, session 38 §B10.7's class. The clause compares each override within
`NV_OVERRIDE_ULPS` (8) of the value's own magnitude now, the length exactly and the field set
exactly; the within-page distinct-state count stays exact (one engine, one build). The
re-measurement and the NV4 mutant on the bounded clause are in §19.

### 12f. The floor's cost, and the sweep that was not free (found by the browser, fixed, bit-identical)

The export subset went red on this box twice at the harness's 30 s `settleBuild` — an
uncaught `TimeoutError` at the first row, which on a sharded CI run kills the shard and
leaves the verdict with no census — and the first reading was box contention (the partition's
heavy rows were building beside it). It was not only that. Probed row by row on the live page,
alone: `NODE LAWS: SESSILE x whorled x 12 nodes` settled in **37 s**, `NODE LAWS: ALL MAX at 35
deg …` in **188 s**, `REACH INSET: THE BUDGET CORNER` past **240 s**, `NODE VARIANCE: x WHORLED x
8 nodes` in 28 s. In Node the plan alone read 41 / 214 / 16 / 36 s, and the CPU profile put
**67 of 87 s in `boundOf`**, the per-pair sweep: the law's header said the column map "makes
every pair free", which was true of the maps (0.9 s) and false of the pairs — a whorled raceme
asks for every (a, b) over twenty-four azimuths, 564 pairs, each a walk of every upper cell
against its 81 neighbouring offsets through a `Map`.

The fix evaluates the SAME maximum over the SAME candidate set in a different order: the
`sqrt(gap² − r²)` term depends on the offset RING alone, and the neighbour maximum within a
ring is a property of the LOWER map alone — `D_r(c) = max over the ring's offsets of
lower.zmax(c + off)` — so each lower map is dilated once per ring (nine rings at four cells a
gap, dense arrays over the map's own bounding box) and a pair is one pass over the upper cells
against nine values. **Bit-identical by construction** (a maximum is order-independent and
`(x − u) + s` is monotone in `x`, so the ring's max taken before the subtraction is the same
double), and **measured** on thirteen rows in both modes against the pre-change module with the
whole plan serialised: floor, bound, `sameNodeMayTouch`, node depths and `at.where` equal under
`Object.is` — `where` is recovered for the one winning pair by the first form's own scan, which
also throws if the two forms ever disagree. Plan time: the whorled spike **41 → 2.1 s**, `ALL
MAX at 35` **213 → 10 s**, the budget corner **522 → 16 s**, `INFLO: ALL MAX` **518 → 16 s** (the two
that never settled on the page at all); on the live page the
five heaviest rows settle in **2.4 / 7.8 / 11.7 / 8.4 / 11.6 s**. What is left is the dilation
itself (15 s of the budget corner's 16 in Node) and, on the node-variance corner, the
twenty-four distinct units Phase B builds per mode (13 s of `tipLaw`), which is that feature's
own cost and is what its cost-corner row is for.

### 12e. The combination gate under the floor (`node tools/bloom-combination-gate.mjs`, EXPORT, Node 22)

The floor re-records the whole inflorescence family of `COMBINATION_XFAIL`, which Phase A had
just re-recorded for the reach inset. On the first full run after ruling 1 the gate read
**31 findings**, every one of them this ruling's: **24 declared cells CLEAR** (the shipped
raceme's own 0.676 mm through three grids reads **9.614**; every gradient-x-angle,
gradient-x-tilt, length-x-tilt-ff, leafangle-x-pedicelangle and corymb cell the reach inset
declared reads 1.003 to 15.000), **one cell IMPROVED without clearing** (the corymb's sessile
top at 60 deg, 0.000 → **0.2144** — the floor is derived for EQUAL pedicels and the corymb
lengthens the lower ones to one level, so it clears the other eight corymb cells and not this
one), **two cells are NEW under the bar** (the gradient at ZERO on both gradient grids, 0.000
— every pedicel the top's length, so node 3 passes through node 2: the floor's own declared
residual, the same state the harness holds in `INFLO_APPROACH_XFAIL`), **one axis went
INERT** (`inflo-leaf-nodes-x-leafangle`'s `floretNodes`: the floor holds five nodes on the
82 mm the inset leaves of a 120 mm rachis, so 12 asked builds the SAME five as 5 asked and
CG1 refused the axis at exactly 0.000e+0 — declared in `COMBINATION_INERT` with the number,
the `leafToothDepth` shape, so a sixth node ever fitting fails CG7 both ways), and **three
verdicts moved**: `inflo-length-x-tilt-ff` single-reaches → **clears**,
`inflo-corymb-angle-x-length` single-reaches → **product-only** (its only cell under the bar
is interior), `inflo-leaf-nodes-x-leafangle` product-only → **clears**. Declared cells
**167 → 145**; no grid was widened and no range moved. The re-recorded gate and its
`--control` are in §19.

## 13. Ruling 2 — the gradient cap

`gradientMax = floor((1 + ((dLow − dTop) + (dTop − insetNeededMm)) / (L0 · sinθ)) / grid)
· grid`: the lowest pedicel may be as long as puts its floret's reach exactly at the
terminal head's floor — the inset the reach law already derived — and no longer; floored
onto `INFLO_REACH_GRID_MM` so the capped floret sits a measurable hair under the bar rather
than on it (ID9 (d) holds every node to the bar on the emitted florets, and a cap landing
exactly on it would be decided by the last bit). Inert (Infinity) at `sinθ ≤ 0` (a level or
descending pedicel cannot overtop), at a sessile raceme and at one node. `gradientAsked`,
`gradientMax`, `gradientClamped` and `gradient` are all on the plan; the read-out's
GRADIENT line prints `GRADIENT CLAMPED at Mx (asked Nx): past it the lowest floret would
overtop the head`, the control carries `cap` so the dead travel is hatched on the track
(`stamenSpread`'s ruling), and ID7 restates the cap from the plan's own depths and inset
and holds the clamp as a biconditional.

**What it costs at the extreme** (EXPORT): `NODE LAWS: gradient 3 x 12 nodes x 60 mm` —
the row CI found overtopping by 26.31 mm — is capped **3.00 → 2.2356** (12 nodes → 3 under
the floor, so the lowest pedicel is 134.1 mm instead of 180); `REACH INSET: gradient 3 x
100 mm` is capped **3.00 → 1.3414** (its 71.35 mm overtop gone), and the matrix row that
carries the cap at its hardest is block 49's `GRADIENT CAP: gradient 3 x 100 mm straight
up on 12 nodes` (79,050 tris). Every other graded row in the matrix is under its cap and
unmoved by it (`gradient 2` → 2, `0.5` → 0.5, `gradient 3` on the 120 mm rachis → 3).
**The corymb arm is untouched**: `corymbAsked` short-circuits the clamp, the level-solve
expression is the node-laws session's character for character, and ID7 asserts the
corymb's lengths are the solve's own on every corymb row (all corymb rows read the same
lengths as on `06e489c`; the 120 mm corymb still spans 0.000 mm). The anthela shape is
thereby unreachable through the gradient, as ruled.

## 14. Ruling 3 — every shipped default clears the bar (`tools/verify-bloom-defaults-bar.mjs`)

The standing clause, built in Phase B because it fitted: **DB0** every table row is pinned
BY NAME to a `buildMatrix()` row whose control set it must equal (a renamed or re-ruled
anchor reddens the gate rather than measuring a state nobody ships); **DB1** every measure
the combination gate owns — `self` (the wall instrument's), `leaf-stem`, the five
inflorescence approaches, the in-sheet infill wall — reads at or over `MIN_FEATURE_MM`
(imported) in EXPORT on each state; **DB2** REPORTS which guard controls the table turns
on and which it does not, so the coverage is a printed list. The subject, stated as a set:
the bloom ships ONE default and NO design presets (`bloom-view-presets.js` is camera
chrome), so the table is `DEFAULTS` plus each guarded feature's RULED DEFAULTS — eight
states: the default head, the raceme, the shared-node raceme, the leaves, the infill, the
sepals, the stem with nodes, the tube. **PASS in 29 s; `--control` plants three must-fails
(a row under the bar, a stale anchor, a measure removed) and all three fire** — the first
names the shared-node row as collateral it is allowed to redden (the leaf blade's 0.876 mm
is also measured through that same state). It rides in `bloom-export-watertight.yml` after
the combination gate, Node only, before the browser. **The standing rule is in CLAUDE.md:
adding a guarded feature adds its ruled-default row here, and a default that goes under
the bar reddens CI rather than waiting for someone to go looking.**

## 15. Phase B — per-node variance, and the derived outward phase

### 15a. What ships

`nodeVariance` (Floret, 0–1, step 0.01, default **0** — the guard; hidden with no
inflorescence; out of the blanket sweep through `INFLO_SUBS`; the range imported). At
amount A each floret's curl, cup and twist move by `A · cos(az + offset_b) · half_b` over
`FORM_VARIANCE_BASES` — the head's own form-variance law at **frequency one and phase zero
ABOUT THE RACHIS**, the three bases a third of a cycle apart exactly as the head's
(`FORM_VARIANCE_OFFSET_DEG`), composed through `resolveRoleOverrides(state, [], null,
term)` with headroom scaling and the clamp, so a floret's deltas go through the resolver
every petal already goes through and nothing is a second composition law. **No per-node ×
per-petal groups**, as ruled. `floretNodeOverrides(state, plan, az)` is the ONE object: the
node term's resolved deltas plus the derived phase, or `null` when neither applies — and
`floretState` spreads it BEFORE `PEDICEL_PINS`, so a delta can never reach a pin
(`the-node-term-outranks-the-pins` is the standing mutant).

**THE PHASE IS DERIVED, NEVER A CONTROL** (`floretPhaseDeg`): the head's size and form
fields put their crest at `variancePhase`, a world-fixed angle; a floret on a pedicel
should put its crest OUTWARD — the petal facing away from the rachis. Measured on the
placement matrix, the minimal roll keeps the floret's local x̂ world-fixed (the ruling's
suspected defect was real), so the outward direction in the floret's own frame is its
node azimuth ψ = az, flipped by 180° on a DESCENDING pedicel (the floret hangs, so its
outward petal is the one facing the rachis's far side); the crest of `cos(fθ + φ)` lands at
ψ when φ = −f·ψ (the ramp at f 0 takes φ = ψ). At a LEVEL pedicel (angle 0) there is no
outward direction and the head's own phase is kept, told; with neither head field on,
nothing is written. **The construction CAN express it** — one phase per floret through the
field the head already reads — so the ruling's "report and stop" did not arise, and NV2
re-derives ψ from the placement MATRIX itself rather than from the azimuth the builder
was handed.

**One build per DISTINCT floret state**: `floretUnitMemo` keys on `(length, mode,
quantised azimuth)` and `floretNodeAzimuth` reduces the azimuth into one turn at 1e-9 rad
(the pair classes' own grid) — `leafAzimuths` hands the i-th node `i·π` and the like, and
`cos(2π + x)` is not `cos(x)` in the last bits, so the first cut keyed FIVE builds on an
alternate raceme whose nodes face two ways (two now). The default raceme at amount 1 is 4
distinct builds (the golden-angle sequence over 4 nodes); whorled x 8 nodes is the cost
corner, 24 azimuths. The read-out prints the distinct-build count on the control.

### 15b. The family

NV0 amount 0 ⇒ every unit's `nodeOverrides` null and one build per length (the guard,
both ways); NV1 the resolved deltas on every unit are the law restated from the CONTROLS
and the unit's own azimuth (never the builder's record); NV2 the phase re-derived from the
placement matrix (outward, sign-flipped on a descending pedicel, null at level); NV3 no
pin is overridden on any unit; NV4 the memo's distinct-state count equals the distinct
`(length, azimuth)` set. ID7's "one build per distinct LENGTH" became "one per distinct
STATE" and ID9 (e)'s solo arm reads the ASKED count (the floor now takes a 12-asked
raceme to 3 nodes, so the BUILT count is no longer the solo test). The coverage
instruments' R1 re-emit the florets with the per-azimuth units.

### 15c. Mutants (eight, `verify-bloom-apex-mutants.mjs`, four probe rows)

`the-internode-floor-is-the-rods-again`, `the-floor-reads-one-mode`,
`the-gradient-cap-is-dropped`, `the-node-term-is-never-formed`,
`the-node-term-outranks-the-pins`, `the-floret-phase-is-the-heads`,
`the-outward-phase-ignores-the-pedicels-sign`, `the-memo-keys-on-the-length-alone` — each
witnessed on the MUTATED module's own plan or units, never on the assertion it names.
**All eight verified on the final tree, each firing the family it names and the clean tree silent
on every probe row** — `the-internode-floor-is-the-rods-again` ID10 (with ID9), `the-floor-reads-one-mode`
ID10, `the-gradient-cap-is-dropped` ID7 and ID9, `the-node-term-is-never-formed` NV1 and NV4,
`the-node-term-outranks-the-pins` NV3, `the-floret-phase-is-the-heads` NV2, `the-outward-phase-ignores-the-pedicels-sign`
NV2, `the-memo-keys-on-the-length-alone` NV4 (ID10, ID7 and ID9 beside it, legitimately — a unit built
for the wrong azimuth is a wrong raceme). The first run was silent on three of them and the cause was in
the TABLE, not the geometry: `famsOn` captured `/^(ID\d+):/` and dropped every NV message (ST10's
two-digit-family class, one family later), and two witnesses were wrong — the dead-term witness
compared against a unit that carried the term, and the pin mutant spread the overrides BEFORE the pins
so the pins still won. The memo mutant claimed NV1 as well and NV1 is correctly blind to it (a unit per
distinct state is NV4's claim; NV1 reads the term on each unit, which a mis-keyed memo still carries), so
the claim was removed rather than the clause widened. **The two floor mutants were re-run after the
sweep's rewrite (§12f) and the memo mutant after NV4's bound (§12g): all three still fire, anchors
matching once.** The twelve pre-existing inflorescence mutants were re-run as Eva asked ("stale
evidence against the old laws"): all twelve fire the family they name on the ruled laws, the clean tree
silent.

## 16. Block 49, the smoke subset, the sheet

Block 49 is eleven `NODE VARIANCE:` rows (matrix 1089 → 1110 with Phase A's block 48): the
amount at 1 on the raceme, 0.5 over the head's form field at 0.5, x OPPOSITE (four distinct
builds), x WHORLED x 8 nodes (the cost corner), the DERIVED PHASE alone on descending
pedicels, the form field at frequency 3 with the head's phase at 90, the INERT level-pedicel
phase, x gradient 2 (a delta AND a length per node), GATED (amount 1 with no inflorescence —
a holder), INTERNODE FLOOR at full-size WHORLED florets (the floor at its widest, 38.20 mm),
and GRADIENT CAP (gradient 3 x 100 mm straight up on 12 nodes). Four are smoke rows (159
over 45 blocks; 142 families both ways under CLAUSE C).

`node tools/shot-bloom-node-variance.mjs docs/img/inflo-build-3-phase-b.png` → the sheet
Eva rules on: row 1 the raceme with node variance OFF and ON side-on on ONE camera, the
node count held at 4 so the difference is the only thing moving (ON: each floret's curl,
cup and twist by its node's azimuth, the crest outward), with a macro pair at one node;
row 2 the re-floored default raceme whole (96,468 tris, 6.4 %), and the gradient cap row.
Deterministic renderer, no pixel delta quoted.

## 17. Costs

* **Triangles against the 1,500,000 budget (EXPORT)**: the shipping default is untouched
  (24,688); the default raceme 113,886 → **96,468 (6.4 %)** by the lost node; at
  `nodeVariance` 1 on the 4-node raceme 96,468 (the deltas move no count); the sheet's
  5-node ON cell 113,886 (7.6 %). **THE BUDGET CORNERS MOVED WITH THE FLOOR, AND ONE DECLARED REFUSAL IS RETIRED** (EXPORT, Node 22, measured
  on the full builds): `INFLO: ALL MAX` is unmoved at one node, 143,352 (9.6 %; its floor
  reads 252.30 mm — past the rachis); `REACH INSET: THE BUDGET CORNER` (12 whorled x 12
  petals x 1.00 on 40 mm straight up) goes **twelve nodes → TWO under a 42.30 mm floor,
  1,425,468 → 259,908 (17.3 %)**; and `NODE LAWS: ALL MAX at 35 deg x a leaf under every
  pedicel` — the one declared RACEME refusal — goes twelve nodes → ONE under a 68.20 mm
  floor and **EXPORTS at 150,996 (10.1 %)**. A declared refusal that starts exporting is
  what XR1 fails hard on, so its `EXPORT_REFUSED_XFAIL` entry is RETIRED (kept as a
  comment with its figures) and both rows are relabelled (§4). **No single-whorl raceme
  reaches the budget any more**: the floor grows with the floret, so the count falls as
  the per-floret cost rises. The refusal path is still exercised by the head's own
  `ALL MAX` (2,354,268). Ruling 9's "one declared `INFLO: ALL MAX` refusal row" is
  therefore further from true than build 1 left it, and said so rather than manufactured.
* **Plan time**: the floor's column map costs ~0.6 s on the default raceme (the constant's
  own table), so a raceme build is ~0.8 s; with node variance on it is one floret build per
  distinct azimuth — ~2.7 s on the default at amount 1, and the whorled x 8 cost corner
  builds 24 units. Told on the control (the distinct-build count), never capped.
* **Gate time**: the defaults-bar gate 29 s plus its control, Node only.

## 18. The byte partition (`--movers-predicate inflo-build3`)

A row moves iff the BASE tree's plan and this tree's disagree on the node count, a node
depth, a pedicel length or the built gradient, or any node's azimuth carries a non-null
`floretNodeOverrides` on this tree. Stated plainly in the predicate's own comment: the
floor is a column-map bound over the floret's emitted triangles and cannot be restated
from the base tree's pieces in a line, so the PLAN side is read off both trees' declared
decisions; what the partition holds is the MESH against those declarations, both ways. The
amount at 0 returns null BY BRANCH, so every row with `nodeVariance` 0 is a holder unless
its placement moved; every row with no raceme is a holder by the first line.
**MEASURED, PASS** — `node tools/verify-bloom-surface-bytes.mjs --base <worktree of 23b13bd>
--movers-predicate inflo-build3`, the whole 1110-row matrix in both modes, run as 29 `--range`
chunks (`--json` each, `--merge` closing them; the merge REFUSES chunks that overlap or leave a
gap, which it did once — rows 1089 twice — and the set was re-tiled rather than deduplicated):
**75 of 75 predeclared movers MOVED and 0 floats moved on the 1035 holders, positionally under
`Object.is`, over 1,293,722,028 export floats / 143,746,892 triangles and 82,000,898
captured-grid values (9,448 panels).** The 75, named by block from the predicate run over the matrix on both trees: **NODE LAWS 32,
INFLO 19, REACH INSET 10, NODE VARIANCE 10**, and four single rows the raceme reaches through
another feature — `VARIANCE: x the RACEME`, and the three GATED rows (`STEM NODES`, `BARE
NODES`, `TUBE`) that build a raceme to prove something else inert. Every row with no raceme,
and every raceme row with an unmoved plan at `nodeVariance` 0 (the two inflorescence GATED
rows among them), held — the shipping default by the first line of the predicate.
The three heaviest rows (`INFLO: ALL MAX`, `NODE LAWS: ALL MAX at 35 deg …`, `REACH INSET: THE
BUDGET CORNER`) each build a ~1.4 M-triangle base tree twice and ran alone, 18 to 43 minutes
apiece on this box (43 / 18 / 43 min); a one-row chunk of a mover reports its own vacuity clause (no holder float
to compare) and the merge is where the vacuity is judged.

## 19. Gates on the final tree

__GATES__
