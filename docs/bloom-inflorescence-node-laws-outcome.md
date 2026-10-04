# Inflorescence build 2 — the node laws (outcome)

Eva's restated Oct 3 rulings (`docs/bloom-inflorescence-state-oct-2026.md`, Rulings; the
discovery's twelve, `docs/bloom-inflorescence-discovery.md`) scope build 2 to the NODE LAWS:
the pedicel-length gradient with the corymb as a derived solve, the embedded sessile root
(ruling 7), the shared node with the leaf seated below the pedicel (ruling 5), the
combination grid rebuilt with its join exclusions (ruling 1 / 11), and the 544 % corner
declared. Per-node deltas, per-floret phase, TUBE on florets, terminal flower, apex umbel,
openness, curvature, cymes and compound types are NOT touched. No `/plot`, no `/print`.

## 0. Reconciliation (main since `ae401c4`)

Two commits, both docs: #348 (`8e15f14`) and #350 (`754e3aa`), the restated rulings. The
brief agrees with them. Three findings against the brief or the state doc:

1. **The gradient needs a build per DISTINCT pedicel length.** The pedicel IS the floret's
   stem, so a length per node is a state per node — the state doc's own recorded consequence.
   Built as a memo keyed on the length (an exact double), O(distinct) ≤ nodes; the general
   per-node delta resolver is build 3's and is not here.
2. **`INFLO: 5 mm pedicels (the floor — …)` stops being true** the moment the floor opens to 0
   (sessile). The live row is relabelled `(short — the old floor, …)` with its definition
   unchanged; the frozen matrices keep the old words.
3. **No other registry or geometry PR was open** when this branched (#349 bug, #230 snapshot,
   #111 flower draft).

## 1. What ships

| control | section | range | default | what it is |
|---|---|---|---|---|
| `pedicelLength` | Inflorescence | **0**–60 mm (was 5–60) | 20 | the TOPMOST node's pedicel; **0 is SESSILE** |
| `pedicelGradient` | Inflorescence | 0–3, step 0.05 | **1** (identity, by branch) | lowest pedicel / topmost, linear in mm down the rachis |
| `pedicelCorymb` | Inflorescence | OFF / ON | **OFF** | ON solves every length so every head lands on one level |

`leafNodes` and `leafPhyllotaxy` are hidden AND inert under a raceme (`leafNodesOwn`); the
gradient is hidden and inert under the corymb (`pedicelGradientLive`).

**The gradient.** `L_k = L_0 (1 + (g − 1) t_k)`, `t_k` the node's depth in MILLIMETRES over the
span the depths occupy (a length from a length), `L_0 = pedicelLength` pinned at the top so
the node the inset is derived for never moves. At `g = 1` every pedicel IS `pedicelLength`,
the same double, by branch. Above 1 the lower pedicels lengthen; past the corymb's lengths the
lower florets overtop the upper — an **anthela-like form that falls out of the ramp for free,
said and not exposed** (the brief: "if free, say so and leave unexposed"). Below 1 they shorten,
and 0 takes the lowest node sessile — a spike grading into a raceme on one slider.

**The corymb: a PLANE, not a dome, and the reason is parameters.** `L_k = L_0 + (d_k − d_0) /
sin θ` lands every floret's hub on one horizontal plane through the topmost floret's: every
head stands `L + c` along its own pedicel from its root (`c` the floret's own constant), every
pedicel leaves at one angle, the roots differ only in depth. The plane has NO free parameter; a
shallow dome needs a radius, which is a control by another name. Measured: the emitted heads
span **0.000 mm** in height on every unclamped corymb (`headSpreadMm`, read off the placement
matrices). INERT AND TOLD at an angle at or below level; the lengths are CLAMPED AND TOLD at the
pedicel's own ceiling as a stem (`STEM_LENGTH_RANGE`, 120 mm) — on the shipped 120 mm rachis
the solve asks 20/56.6/93.2/129.8/166.4 mm and the lowest two clamp, so the corymb wants a short
rachis (40 mm solves exactly). A SESSILE top carries a different hub offset (no pedicel, no join)
and misses the plane by that difference — told, and ID7 asserts the plane only where it holds.

**The sessile root (ruling 7).** At length 0 the floret is built with NO stem and its HUB roots:
the hub's underside on the axis (`hubAxisTopZ` less one sheet — extracted VERBATIM from
`stemPlan`, so the flat slab's −t/2, the inner cap's apex and the sphere's outer far pole all
come from one owner) is placed `embedMm` RADIALLY inward of the wall's mid-thickness, i.e. on
the bore, at every angle. Along the pedicel's direction it would reach `embed (1 + cos θ)`, one
wall only when level.

**The shared node (ruling 5).** On a raceme each pedicel is subtended by one leaf at the
pedicel's own node and azimuth, seated `sharedNodeOffsetMm` below it: `(r_pedicel + r_petiole +
MIN_FEATURE_MM) / min(cos θ_pedicel, cos θ_leaf)` — exact for parallel rods (their axes stand
exactly that far apart: measured 3.100 mm at the defaults), conservative otherwise, infinite (no
leaf built, told) where either rod is vertical. Every term is mode-free, so whether a leaf EXISTS
is mode-free. A leaf whose root would leave the free stem is not built and told (SN3); the kept
nodes are a prefix. The florets never move when the leaves do. What shipped before put both on
independent node laws and they landed on ONE root point (103.2 mm, azimuth 0).

## 2. The budget, checked first (as the brief asked)

`INFLO: ALL MAX` reads **1,425,468 export triangles, 95.0 %**, unchanged by every new control:
the gradient and the corymb change lengths and a stem's triangle count does not depend on its
length (1,425,468 at gradient 3, corymb ON; 1,419,720 at gradient 0; 1,356,492 sessile). **The
shared node does not push it over either, because that row's pedicels are straight up (90°) and
no shared-node offset exists there** — it seats no leaf. The SAME corner at the shipped 35° seats
a 40 mm leaf under all 36 pedicels: **1,517,196 (101.1 %)**, declared as a refusal row
(`NODE LAWS: ALL MAX at 35 deg x a leaf under every pedicel …`, `EXPORT_REFUSED_XFAIL`), never
clamped.

## 3. The families

- **ID7** — the lengths are the gradient's or the corymb's, RESTATED from the controls and the
  node depths; every placement's unit was BUILT at its node's length (read off the artefact);
  the memo is by distinct length; the corymb's heads are level, read off the emitted matrices.
- **ID8** — every sessile floret's own emitted vertices reach the stem's bore (the stem plan's
  `boreR`, an owner the inflorescence does not write).
- **SN0–SN3** — the shared node: two statements (registry `leafNodesOwn` against the geometry's
  flag and the controls); one leaf per pedicel at the pedicel's emitted azimuth; each leaf seated
  the law's offset below, read off both emitted rods, the law restated in the gate; the kept
  prefix restated from the stem's own length.
- ID1/ID4/ID5/ID6, ST9's block span and O1's floret baseline generalised per unit; LF1/LF4/LF5
  gained their shared arms.

**Positive controls, each red in a throwaway worktree (`git worktree add`) cut from the session
commit, green on the tree:** leaf seated at the pedicel's own point → **SN2**; leaf on its own
arrangement → **SN1 + LF5**; sessile hub rooted at mid-wall → **ID8** (on the level and the
solid-rachis rows); every unit built at the top length → **ID7 + ID4**; a no-room leaf kept →
**SN3**; the corymb solve's division turned into a multiply → **ID7** (both the restated law and
the measured head spread).

**And one control that stayed green, which is a finding about the law rather than a hole:**
rooting the sessile hub along the pedicel's direction instead of radially changes nothing ID8 can
see at 35°, because the tilted hub's own disc edge reaches past the bore whichever way it is
rooted (measured reach 0.48 mm against a 1.50 mm bore). Ruling 7 says "at least one wall", and
both constructions satisfy it; at 0° the two are the same point by construction. The radial root
is kept because it is exact on the root point at every angle; ID8 is right not to separate them.

## 4. The combination gate — four measures, eight pairs, the joins excluded by construction

`tools/bloom-inflo-approach.mjs` (header is the argument): floret×floret, floret×terminal head,
floret×stem, leaf×floret (pedicel included). The intended joins — a floret and its own pedicel,
the pedicel-to-rachis and petiole-to-rachis joins inside the rachis's own solid, a sessile hub in
its wall — are excluded by construction and NOT declared as failing magnitudes. An edge crossing
reads 0 (two closed solids passing through each other have a positive vertex-to-surface distance).

**91 cells, 37 under the 1.00 mm bar, all declared in `COMBINATION_XFAIL` with their mechanism.**
Every pair's verdict is SINGLE-REACHES — one control alone reaches the hazard on each — and three
of them are FINDINGS ON STATES THAT ALREADY SHIPPED:

1. **The shipped raceme's top floret passes through the terminal head's petals** (floret×head at
   20 mm / 35° reads 0, an edge crossing; brute force finds floret and head vertices 0.087 mm
   apart). The inset is derived from the PEDICEL's rise (`insetSatisfied`) and never from the
   floret's own petals, so it clears the rod and not the flower. Pre-existing in build 1.
2. **A 5 mm pedicel's floret folds its petals back onto its own rachis** at every tilt measured
   (floret×stem 0). The old floor row (`INFLO: 5 mm pedicels`) carried this unmeasured.
3. **At −60°, 60° and 90° the floret's petals reach the free rachis at every floret size.**

And the shared node's own: **at the default (parallel leaf and pedicel at 35°) the leaf BLADE
comes within 0.876 mm of the pedicel** — the rods stand exactly the law's 3.1 mm apart, but the
blade's top skin plus its cup rise 0.897 mm off the leaf's own axis where the petiole is 0.6 mm.
The law clears the RODS, as derived; whether it should clear the blade (add its cup) is put to Eva.
A 40 mm leaf runs its blade straight through the floret its pedicel carries at almost every angle.
The rest: graded lower florets reach the floret above (0.654 mm at gradient 3, 0 at 60°); sessile
florets one pitch apart overlap at the shipped tilt; level-topped corymb heads overlap side by
side at steep angles or long pedicels.

## 5. The 544 % corner — it cannot be a row, and trying it found a defect in ID4

The state doc's densest reachable state, `INFLO: ALL MAX` × `layerCount 6` (8,161,868 export
triangles, 544.1 %), was added as a refusal row with an `EXPORT_REFUSED_XFAIL` entry and run
through the real export gate. **It cannot be a row on this tree, for a reason that is #231's and
not the row's:**

1. **The page's LIVE build of that state does not settle inside the harness's 30 s `settleBuild`
   budget** (the state doc measured 18,472 ms for the live build in Node; through the page it is
   slower). Raising the budget for one row was tried, and is what got it to step 2.
2. **The refusal path builds the WHOLE export mesh before it checks the count** (#231), so the
   export click does not return until an 8.16 M-triangle build finishes: measured **9.6 min**
   locally, against the gate's 120 s click/download budget. The row times out rather than
   asserting XR1, so it would be red in CI on a tree that refuses correctly.

The fix is #231's (refuse on the LIVE count, or count before building) and it is not this session's.
The row, its xfail entry and the settle-budget opt-in were REVERTED. What stands in its place is
the 101.1 % row of §2 (`NODE LAWS: ALL MAX at 35 deg x a leaf under every pedicel`), which exercises
the same refusal path at a state the page can build in time. (A cheaper witness of THIS corner's
own mechanism exists — `INFLO: ALL MAX` × `layerCount 2`, 184.8 %, ~6 s — and is not added: it is
the same refusal path a second time.)

**And running it was not wasted: with the settle budget raised it reached the assertions and ID4
went red on a CORRECT tree** — it predicted `floretPetals` petals per floret where a floret on a
six-whorl head builds `floretPetals × layerCount` (72 against 12), because `floretState` inherits the
head's whorls by design. ID4 predicts `floretPetals × layerCount` now (FAN excluded, whose count is
its own), and its witness is a new row the page builds in seconds: `NODE LAWS: x 2 whorls (every
floret inherits the head's second whorl)`, PASS through the export gate. This defect was in build 1's
clause and no row had ever reached it, because every `INFLO:` row is a single whorl.

## 6. Bytes, frozen phase, cost

**Byte partition** (`verify-bloom-surface-bytes --movers-predicate node-laws --base <worktree of
754e3aa>`, the whole 1078-row matrix in both modes, positionally under `Object.is`): **PASS — 29 of 29
predeclared movers moved, 0 floats moved on the 1,049 holders**, over 1,396,228,860 export floats /
155,136,540 triangles and 81,673,074 captured-grid values (five chunks, `--merge`); `--control` fires
both clauses on a 1e-9 perturbation. The 2-whorl ID4 witness row is a HOLDER (no node law reaches
it — the fix is the harness's).
The mover set is predeclared from the BASE tree's own state, not from labels: a row moves iff the
base builds a raceme AND (it carries leaves — the shared node re-seats them — or its pedicel is 0, or
it has two or more nodes and a live gradient or corymb). Every mover is in block 46; every `INFLO:`,
`LEAVES:` and `STEM NODES:` row of earlier blocks HOLDS, including the relabelled 5 mm row.

`frozen/phase50` is the 1047 rows at `754e3aa`, registered in both maps and proved deep-equal;
block 46 (31 rows; 33 after the second round, §8) takes the live matrix to 1078 (1080), and smoke block 46 (6 rows) to 146 rows over 42
blocks, 134 families both ways. No workflow file is edited, so no
`TAG_PUSH_XFAIL` entry is owed.

Contact sheet: `node tools/shot-bloom-node-laws.mjs docs/img/inflorescence-node-laws.png`
(deterministic software render; no pixel delta quoted). Per-cell export triangles: raceme / corymb
113,886 (7.6 %), spike 104,306 (7.0 %), gradient 0 111,970 (7.5 %), shared node with 15 mm leaves
126,626 (8.4 %).

## 7. Gates run on the session tree

- `verify-bloom-export --only "^NODE LAWS: "` — every block-46 row reaches the results and exports
  watertight, the refusal row asserted by XR1; the older `INFLO:` / `LEAVES:` / `STEM NODES:` rows
  42 of 42 PASS.
- `verify-bloom-connectedness --only "^NODE LAWS: "` — PASS: 30 of 31 reach the results and every one
  exports as one connected body; the 31st is the declared refusal, asserted by XR1.
- `verify-bloom-panel` and its `--negative-control` — PASS, all twenty-one routes observe the failure.
- `bloom-smoke --check` and `--negative-control` — census OK, 146 rows / 42 blocks / 134 families.
- `bloom-combination-gate` and `--control` — PASS (30 pairs + 5 triples, 505 cells, 163 under the
  bar, all declared).
- `verify-bloom-apex-mutants --anchors` 85/85; `verify-bloom-stem-channel`, `verify-bloom-stem-nodes`,
  `verify-bloom-leaf-decoupled` — PASS.
- `--verify-frozen phase50` — deep-equal.

The full matrix on both STL gates, in CI, is the merge criterion.

## 8. Second round — Eva's four rulings from the sheet

The sheet was approved. Two changes were made to the code before merge; two findings are recorded and handed forward.

### 8a. Change 1 — the shared-node offset clears the leaf BLADE, not just the rods

**The law.** The perpendicular separation the two parallel axes need is now the larger of:
- the rods' term: `r_pedicel + r_petiole + MIN_FEATURE_MM`;
- the blade's term: `max over the blade of z + sqrt(R^2 - y^2)`, with `R = r_pedicel + MIN_FEATURE_MM`.

The result is divided by the steeper rod's cosine, as before.

The blade's term is read off the LEAF BUILDER's own emitted blade (`leafBladeLocalTris`), built once in an EXPORT accumulator in its own frame. The leaf has no curl and no twist, so one build serves every node, angle and azimuth. The term is maximised along every emitted EDGE by golden-section search, not at the vertices. NV = 10 is even, so no column lies on the midrib, and a vertex reading sits up to 0.5 mm low under the rod.

**The numbers, export, at the defaults:**
- The blade's rise is **3.2296 mm** over the leaf's axis, against the rods' 3.100 mm, so the **blade binds**.
- The seating offset along the stem goes **3.784 mm → 3.943 mm** (+0.158 mm).
- The worst leaf-to-own-pedicel approach goes **0.876 → 1.003 mm** on the combination gate's parallel cells (15 mm leaf). On the default raceme with a 40 mm leaf it reads **1.0000166 mm**.
- The worst cell of the leaf×pedicel pair is unchanged at **0.000** at leafAngle 35 × pedicelAngle 0, the converging rods. That cell was declared before and still is.

**THE LAW LANDS THE APPROACH ON THE BAR, SO ITS LAST BIT DECIDES WHICH SIDE.** The first cut read **0.9999999999999918 mm** against the 1.0 mm bar. The separation is therefore taken to the second step of `SHARED_NODE_GRID_MM` (2^-16 mm) above the exact value. That puts it between one and two steps over the bar (1.5–3.1e-5 mm), and never on it. One step alone can land an ulp above a grid point, which is why the margin is two. This is a stated slack with its size beside it, not a tolerance on the gate. The length cap (8b) takes the same two-step slack in the other direction.

**FROM THE OTHER SIDE — the node below.** The widened seating puts each leaf 0.158 mm closer to the node below it. A fifth approach measure, `leaf-pedicel`, was added to `tools/bloom-inflo-approach.mjs`: the leaf against every emitted pedicel rod, its own and every other node's. It exists because on a dense raceme `leaf-floret` reads 0 whatever the leaf does: the florets themselves overlap there (floret-floret 0.000).

Measured, the nearest approach of a leaf to ANOTHER node's pedicel rod, base tree → this tree:

| state | internode | before | after |
|---|---|---|---|
| defaults (5 nodes, 120 mm) | 21.000 mm | 17.938 mm | **17.808 mm** |
| 12 nodes, 60 mm | 3.648 mm | 0.777 mm | **0.647 mm** |
| 12 nodes, 40 mm | 3.275 mm | 0.166 mm | **0.037 mm** |
| **12 nodes, 52 mm — the TIGHTEST reachable internode** | **3.023 mm** (pitch floor 3.000) | **−0.248 mm** (through it) | **−0.378 mm** (through it) |

The tightest internode was found by sweeping every rachis length at 12 nodes.

**THE MECHANISM.** Alternate and opposite phyllotaxy repeat an azimuth every second node. So a leaf stands only `2 × internode − offset` above the pedicel two nodes below it, on its own azimuth. Clearing it needs about **3.86 mm** of internode: the half-sum of the two seating offsets, above and below. The node law's pitch floor is two pedicel radii, set for the pedicels against each other, so a leaf seated between them can fail it. This was pre-existing at the pitch floor (−0.248 mm on the base tree) and is 0.13 mm deeper now. Whorled racemes cross neighbouring azimuths at dense internodes on both trees (−1.04 → −1.17 mm).

**DECLARED, NOT CLAMPED.** Per Eva: *"declare that cell with its mechanism rather than clamping anything silently."* The new pair `inflo-leaf-nodes-x-leafangle` (floretNodes 5/12 × leafAngle 35/0 on a 52 mm rachis, `leaf-pedicel`) carries three declared cells at 0.000. The leafAngle 0 × pedicelAngle 35 cell of the existing pair went **0.881 → 0.723 mm**. That cell was mis-attributed before: it is a level leaf against the floret two nodes below, not the blade's own skin. It is re-recorded with that mechanism.

### 8b. Change 2 — the leaf length is capped at a flowering node

Every node of the shared arm carries a floret, so every subtending leaf is capped:
- **built = min(asked, cap)**;
- **no leaf** where the cap is under one printable feature (`MIN_FEATURE_MM`) — told, never refused;
- leaves off a raceme have no per-node list and keep the slider's full range (a branch).

The slider keeps the asked value. The read-out's `LEAF LENGTH asked … BUILT …` line says what each node built, in TUBE's snap shape.

**How the cap is derived.** The blade is treated as the PRISM of its whole emitted cross-section envelope. That is a superset of the blade, so a length that clears the prism clears the blade. The floret is the EXPORT floret unit in both modes, so whether a blade exists is mode-free. Each floret vertex inside the gap of that envelope bounds how far the blade's tip may reach along the leaf's axis. The reach then becomes a length through the petiole's own law, `L + max(0.12 L, clear) = reach`.

**WHY THE PETIOLE LAW IS IN THE SOLVE.** The first cut took the petiole from the ASKED length. A longer asked leaf then built a SHORTER blade (120 mm asked built 6.21 mm where 40 mm built 15.81) — a slider running backwards.

**The floret units are now built through one memo** (`floretUnitMemo`) before the leaves, so the cap reads the very unit the export build then appends. Building a unit earlier moves no float of it; the byte partition below holds every raceme without leaves.

**The numbers, export:**
- Default raceme with a 40 mm leaf: **17.46 mm built at all 5 nodes** (petiole 3.15 mm), approach **1.0000166 mm**. Any asked length from 17.46 to 120 builds the same.
- Gradient 2 gives a cap per pedicel length: **17.46 / 22.46 / 27.33 / 31.80 / 36.26 mm**.
- A 5 mm pedicel: **2.46 mm** blade.
- A spike (sessile florets) builds **no blade at any node**. The cap is −0.29 mm there, and 564 floret vertices stand within the gap of the petiole itself.
- A 15 mm leaf is not capped anywhere on the default raceme.
- This removes the sheet's 40 mm blade-through-the-floret frame (not re-rendered, as ruled).

**Cost.** Leaf triangles are a fixed lattice, so triangle counts are unchanged except where a node loses its blade. In LIVE mode the cap builds one EXPORT floret unit per distinct pedicel length, measured at about +250 ms on the default raceme under load (best of four runs, 696 ms against 441 ms).

### 8c. The witnesses, re-run because the law moved

**SN2 is restated onto the new law.** The blade's rise is solved in CLOSED FORM at each emitted edge's stationary point, over a Node build of the shipped leaf builder at a plan the gate writes; the geometry uses a golden-section search instead, so the two sides are different methods. The seat must lie in `[exact, exact + 3 grid steps] / cos`: strictly clear of the bar, and no further from it than the slack.

**SN4 is new** — the length cap:
- (a) the plan's per-node arithmetic, stated in the gate;
- (b) each emitted blade's reach along its own axis (`emittedReachMm`, read off the skins the builder emitted) equals the plan's petiole plus built length, to 1e-9 mm. It measures to 4e-15.

LF1, LF9 and SN1/SN3 now read the per-node lengths. A spike whose every node lost its blade stops the leaf family the way an empty shared node does.

**The mutants**, each in a throwaway worktree of the round's commit, run through the real export gate, each red on the clause it names:

| mutant | row | fires |
|---|---|---|
| leaf seated at its pedicel's own point | default shared row | **SN2** |
| leaf on its own arrangement | whorled shared row | **SN1 + LF5** |
| a no-room leaf kept | 30 mm rachis | **SN3 + SN1** |
| the offset clears only the rods (the OLD law) | default shared row | **SN2** (3.784 against [3.9426, 3.9427]) |
| **a leaf that ignores the cap** | default shared row (a flowering node) | **SN4** (reach 43.150 mm against the plan's 20.610), plus LF9 — true of it, since the clamp record follows the built length |

The clean tree passes every shared-node row.

### 8d. Combination gate — the leaf-involving pairs

**9 inflorescence pairs, 95 cells, 37 under the bar, all 37 declared** (was 8 pairs, 91 cells, 37 of 91). Of the 37:
- **3 RETIRED by change 1** — the three parallel cells of `inflo-leafangle-x-pedicelangle` (35/35, 0/0, 60/60), 0.876 → 1.003 mm;
- **1 re-recorded** — leafAngle 0 × pedicelAngle 35, 0.881 → 0.723, with the corrected mechanism;
- **3 new** — the node-below pair's cells.

Change 2 retires nothing on the gate, because the leaf pair's base leaf is 15 mm and is never capped. What it removes is the 40 mm crossing that pair's own comment records.

### 8e. Records, not built

1. **BUILD 3'S LEAD ITEM — evawm898/portfolio-site#355.** The shipped raceme's top floret passes through the terminal head's petals. `floret-head` reads 0 (an edge crossing) at 20 mm / 35°, and floret and head vertices stand 0.087 mm apart. The top inset is derived from the PEDICEL's rise and never from the floret's own petals.
2. **THE CORYMB SOLVES LEVEL ONLY ON A SHORT RACHIS — a known limitation.** `L_k = L_0 + (d_k − d_0) / sin θ` must stay inside the pedicel's own ceiling, `STEM_LENGTH_RANGE[1]` = 120 mm. So the node span must be at most `(120 − L_0) sin θ` = **(120 − 20) sin 35° = 57.4 mm** at the defaults. The default node span is 0.70 of the rachis, so the corymb solves exactly up to an **81 mm** rachis (measured: 80 mm asks 20/44.4/68.8/93.2/117.6; 85 mm already clamps). On the shipped 120 mm rachis it asks 20/56.6/93.2/129.8/166.4 mm and the lowest two clamp. **Raising the 120 mm cap is a registry bound change and needs Eva's ruling; it is NOT raised here.**
3. **#231 BLOCKS THE 544 % CORNER FROM EVER BEING A ROW** (§5). The refusal path builds the whole 8.16 M-triangle export mesh before it checks the count: 9.6 min locally against the gate's 120 s. Until #231 refuses on the LIVE count, or counts before building, `INFLO: ALL MAX` × `layerCount 6` cannot be a matrix row. Do not rediscover this at 9.6 minutes a run.

### 8f. Bytes

**The byte partition for this round** — `verify-bloom-surface-bytes --movers-predicate node-laws-2 --base <worktree of f869eff>`, the round's own base:
- coverage: the whole 1080-row matrix in both modes, run in two chunks, positionally under `Object.is`;
- result: **PASS — 12 of 12 predeclared movers moved, and 0 floats moved on the 1,068 holders**;
- volume: 1,455,741,432 export floats over 161,749,048 triangles, and 81,690,794 captured-grid values.

The movers are predeclared from the BASE tree's own leaf plan: a row moves iff the base builds at least one shared-node leaf. Every mover is in block 46. Every raceme WITHOUT leaves holds, which is the measured answer to "building the floret units before the leaves moves nothing".

The first chunk (rows 0–539) holds no mover, so the tool's vacuity guard reports it as a FAIL by design. It is a chunking artefact, and its substance is 0 floats moved on 540 holders. The tool's `--control` was not re-run this round; it is unchanged since §6, where it fired both clauses.

This **replaces §6's 29 / 1,049 for this round**: §6's partition is first-round only, against `754e3aa`. The live matrix is **1080 rows** (block 46: 31 → 33, the two SN4 witness rows).

Gates on the round's tree:
- block 46 through `verify-bloom-export` — PASS, 32 of 33, with the 101.1 % refusal asserted by XR1 (its triangle count is unmoved at 1,517,196);
- `verify-bloom-connectedness` — PASS, 32 of 33 one piece;
- the combination gate's `^inflo-` pairs — clean, 37 of 37 declared;
- `bloom-smoke --check` and `--negative-control` — OK (146 rows, 135 families).

