# Inflorescence build 3 — Phase A: the reach inset (#355) and the 250 mm pedicel

Session of Oct 4, 2026, on `claude/adoring-curie-p3zjlo` against `main` at `23b13bd`.
Eva's brief: "Derive the clearance from the floret's actual petal reach rather than
from the pedicel, so the default is clean. Do not add a control for it", and "Raise the
pedicel cap from 120 mm to 250 mm (my ruling, Oct 4)". **Phase A stops for her ruling;
Phase B (per-node deltas, the derived per-floret phase) is not started.**

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
BOTH modes, places it through `pedicelPlacement` at a node of depth 0, and reads
`reach` as the highest world z of any emitted vertex above that node. The top node sits

    insetNeeded = max(0, reach + (rootZ − headFloorZ) + MIN_FEATURE_MM)

below the stem's root plane, where `headFloorZ` is the stem plan's own lowest head
material (`rootZ`, the join's underside; `lowestHubZ` where a dome's rim hangs lower).
The floret's highest point then stands one printable gap under the head's lowest material
plane. `reach` is the MAX over the two modes' units, so the node is where it is in either
— topology is mode-free by construction (the stem channel's own union), not by
observation. `insetMm = max(asked, needed)`; `insetClamped` and `insetSatisfied` keep the
leaf law's biconditional shape. No constant is typed: the gap is `MIN_FEATURE_MM`, the
floor and the root plane are the stem plan's.

What it replaced: `insetNeeded = pedicelLen · sin(angle)` — the LEAF's law, inherited by
build 1, which clears the ROD and not the flower on it.

**Cost:** one extra floret unit build per raceme build (the other mode's), memoised and
reused by the builder and the shared-node leaf cap; nothing is built twice. Default
raceme: 467 ms live / 355 ms export in Node for the whole bloom.

**The reach is a plane clearance, deliberately.** It is one length read off emitted
geometry against one plane, and the shipped head's own petals never reach below that
plane — they would only under an effective tilt past a right angle, or as sepals, both
outside this subject and said so in the geometry's header.

## 2. Measured

### 2a. The shipped raceme (`stemLength 120, inflorescence RACEME`, everything else default)

| | before (`23b13bd`) | after |
|---|---|---|
| inset asked (0.16 L) | 19.200 mm | 19.200 mm |
| inset needed | 11.472 (the pedicel's rise) | **33.932** (reach 32.932 + 1.000 gap) |
| top node below the hub | 19.200 | **33.932** |
| node depths | 19.2 / 40.2 / 61.2 / 82.2 / 103.2 | 33.9 / 51.2 / 68.6 / 85.9 / 103.2 |
| internode | 21.0 mm | **17.3 mm** |
| floret-head approach (EXPORT, `bloom-inflo-approach`) | **0.000 — crossing** | **6.656 mm** |
| floret-stem | — | 8.403 |
| floret-floret | — | 2.233 |
| export triangles | 113,886 | 113,886 |

The reach reads 32.9323 in LIVE and in EXPORT alike on the default sheet. The sweep that
chose the law: dropping the top floret by 1..7 mm leaves it crossing, 8 mm reads 0.555,
**9 mm is the first clear of the 1.00 mm bar (1.461)**, 14 mm 5.993, 20 mm 11.431 — the
law lands it 14.7 mm lower than before and 6.656 mm clear, because the plane clearance is
conservative where the head's petals rise away from the hub.

### 2b. Where the two modes differ (the union's only witnesses)

| state | reach LIVE | reach EXPORT | need |
|---|---|---|---|
| default | 32.9323 | 32.9323 | 33.93 |
| sheet 0.60 | **32.0530** | **32.6769** | 33.68 |
| SPHERE head | 31.9628 | 31.9628 | 32.96 (floor = rootZ = −8.850) |
| headRise 1 (hemisphere) | 29.8257 | 29.8257 | 38.95 — the floor is the RIM, 8.13 mm under rootZ |
| floretScale 1.00 | 45.7460 | 45.7460 | 46.75 |
| petalTilt 120 | 26.2265 | 26.2265 | 27.23 |
| pedicelAngle −60 | 1.3995 | 1.3995 | 2.40 — the stem's own 19.2 stands (not clamped) |
| sessile (pedicel 0) | 21.8341 | 21.8341 | 22.83 |
| 250 mm at 35° | 164.8549 | 164.8549 | 165.85 — past 0.86 L: ONE node, told |
| 250 mm at 90° | 259.1193 | 259.1193 | 260.12 — one node |

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

Largest rachis the corymb solves level WITHOUT clamping: **192 mm** (lengths
20.0 / 77.2 / 134.4 / 191.5 / 248.7), measured by sweeping `stemLength` 60..260 at 1 mm —
beyond the stem control's own 120. On the full 120 mm rachis: **20.00 / 50.19 / 80.38 /
110.57 / 140.76 mm, unclamped, heads spanning 0.000 mm** (the old cap clamped the lowest
at 120 and the heads spanned 26.64). Under the old law the brief's 81 mm figure
reproduces as the clamp point; under the new inset the lowest pedicel is shorter at every
rachis (the span it must climb is 69.3 mm instead of 84.0), which is why 192 and not
`120 + ...`.

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

## 5. The combination grid — what moved and why

The inset moves EVERY raceme's nodes, so the whole inflorescence section of
`tools/bloom-combination-gate.mjs` was re-measured (`--emit --only '^inflo-'`, Node 22,
EXPORT):

* **`inflo-length-x-angle` CLEARS** — all seven declared cells, the shipped raceme's own
  among them, read 4.0 to 8.3 mm (20×35: 6.656, 20×60: 4.006, 20×90: 7.424, 0×35: 4.037,
  5×35: 4.029, 60×60: 8.265, 60×90: 7.424). Seven entries retired, verdict
  `single-reaches` → `clears`, the pair KEPT so a top floret touching the head is loud
  again. **This is #355 closed on the grid that found it.**
* **Two corymb cells retired**: 35°×40 mm clears at 15.000 (the search cap), 60°×40 at
  Infinity (one node — no pair).
* **Three re-recorded WORSE** (0.654 → 0.000 twice, 0.723 → 0.000) and **eleven new cells
  under the bar**, every one an edge crossing, and every one the same mechanism: **THE
  TIGHTER INTERNODE.** The top node is 33.9 mm down the shipped rachis instead of 19.2,
  the bottom node stays at 0.86 L, so the five nodes share 69.3 mm instead of 84.0 — 17.3
  mm apart against 21.0 — and florets on longer pedicels (the gradient at 2 and 3, 60 mm
  pedicels), the level heads of a corymb on a short rachis, and a 15 mm leaf two nodes
  up all reach their neighbours sooner. The node law (count gives only at the pitch
  floor) is build 2's, unchanged; neither the pitch nor the span was tuned.
* **`inflo-leaf-nodes-x-leafangle`'s base was INERT and moved.** On its 52 mm rachis the
  deeper inset leaves 10.8 mm of span, so 5 and 12 asked both collapse to the same four
  nodes at the pitch floor and CG1 refused the axis at 0.000e+0 of movement — correctly.
  The base is the shipped 120 mm rachis now (5 nodes 17.3 mm apart, 12 nodes 6.3 — the
  tightest internode the law reaches on it), a grid change inside the shipped ranges that
  restores the axis rather than manufactures a cell; one cell declared (12 × level),
  verdict `single-reaches` → `product-only`.
* **The long-pedicel-against-stem column**: `inflo-length-x-tilt` gains 250 mm. Measured: **205.197 mm at every tilt** — a 250 mm rod stands its one floret 205 mm from the rachis; the column clears and is kept as the long-pedicel witness.

**The full gate (every pair and triple, Node 22): 163 cells under the bar, 163 declared, across 25 pairs and triples, 0 strays, 0 inert mismatches — PASS; `--control`: every clause fired on a plant that names it, and the tree is green without them.** 88 s / 95 s on this box.

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
trees — changed inset, unchanged depths, HOLDERS. **Over the 68 inflorescence rows (`--only 'INFLO|NODE LAWS|REACH INSET|BARE NODES: GATED|pedicel|floret'`), both modes, 197,928,900 export floats over 21,992,100 triangles and 753,112 captured-grid values: PASS — 60 predeclared movers moved, 8 holders bit-identical under `Object.is`.** The holders are the two GATED rows, the two no-rachis/none rows, `INFLO: ONE node`, the cannot-clear row, the GATED bare-nodes raceme and the descending (−60) row, whose reach (1.40 mm) sits under the stem's own inset. FULL_PARTITION_TBD

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

## 10. Phase B — not started, and two notes for it

* Per-node deltas go through `resolveRoleOverrides`'s existing composition; a delta may
  not reach `PEDICEL_PINS` and must respect the memo-by-distinct-state (a delta per node
  is a build per node, O(N) — the cost the discovery predicted).
* The derived per-floret phase (outward from the node's radial direction): the state doc
  records that the variance phase is SHARED between the size and form fields and that a
  roll rotates the whole floret rather than the field relative to its petals; the brief's
  "report and stop rather than substitute world-fixed" applies if the frame cannot be
  expressed in `varianceWave`'s own terms.
