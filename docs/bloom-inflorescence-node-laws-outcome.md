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
754e3aa>`, the whole 1078-row matrix in both modes, positionally under `Object.is`): BYTES_LINE.
The mover set is predeclared from the BASE tree's own state, not from labels: a row moves iff the
base builds a raceme AND (it carries leaves — the shared node re-seats them — or its pedicel is 0, or
it has two or more nodes and a live gradient or corymb). Every mover is in block 46; every `INFLO:`,
`LEAVES:` and `STEM NODES:` row of earlier blocks HOLDS, including the relabelled 5 mm row.

`frozen/phase50` is the 1047 rows at `754e3aa`, registered in both maps and proved deep-equal;
block 46 (31 rows) takes the live matrix to 1078, and smoke block 46 (6 rows) to 146 rows over 42
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
