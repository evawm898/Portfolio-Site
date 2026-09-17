# Parametric Bloom — inflorescence discovery

*Sep 17, 2026. Discovery only: what the bloom would need to build inflorescences (many
flower heads on a branching axis) and how the registry, panel and dropdowns it already has
could carry them. Nothing is built. Read `docs/bloom-charter.md` first; every measurement
here names its MODE and its SAMPLING (the session-32 rule), every claim about the code cites
a file and line on `main` at `f64f3bc` (#242 merged), and every premise in the kickoff
prompt was checked against source rather than inherited. Eva's ruling of Sep 17 stands:
nothing here routes through `/plot` or `/print`; where a mechanism there looks reusable it
gets one line and no more.*

**What was measured, and on what.** Triangle counts are the accumulator's own
(`MeshBuilder.triangleCount`, `bloom-geometry.js:786`), live and export both, built in Node
from `bloom-registry.js`'s `DEFAULTS` plus a named set. Build times are the median of five
warm builds on this container (a two-vCPU box, one run); they are anecdotes about this
machine state, never constants, and are quoted only as ratios between rows built in the same
run. CI durations are read off `actions_list` at the time of writing, per the rule in
`CLAUDE.md`. Volumes are the divergence-theorem sum over every emitted closed shell in
EXPORT mode — an UPPER bound on the union, because overlapping shells are counted twice at
the feet and the hub.

---

## 0. The answer in one paragraph

The bloom has every *ingredient* of an inflorescence at one scale below where it needs it,
and none of the *orchestration*. Nodes along an axis with a pitch floor exist
(`leafNodeDepthsMm`, `bloom-geometry.js:8398`); three phyllotaxies exist for those nodes
(`leafAzimuths`, `:8389`) and four placements exist for a whorl (`buildWhorlInto`, `:2832`); a
rod rooted at an angle in a tube wall exists (the leaf's petiole, `buildLeafInto`, `:8541`);
a rod on a surface normal carrying a tip exists (the stamen, `rodInto`, `:8961`); a swollen
receptacle with florets placed on it by an equal-area spiral exists twice (the CONTINUOUS
head on a cap or sphere, `footRing`'s continuous arm, and the androecium's Vogel disc,
`:2493`); per-depth size and tilt ramps exist (`layerSize`, `layerTilt`); and a per-instance
override resolver with an identity guard exists (`resolveRoleOverrides`, `:1633`). What does
not exist is a second flower: `buildBloomInto` (`:9159`) builds exactly one head, at the
world origin, on the world z-axis, with no transform argument, and throws on the `below`
value that was reserved for this (`:9163`). Nothing in the bloom recurses, nothing measures
openness, and the stem is straight by ruling (`stemStations` returns `[0, length]`,
`:7493`). So the work is: make the head a placeable instance (Q2), give the stem's node law
a second content (a pedicel with a head, or a branch), and decide who owns the capitulum
(Q4). The hypothesis's "one recursive axis rule with presets" survives as a description of
the *racemose* family; it does not survive as a description of what a capitulum is, of what
"sessile" is, or of the panel it would need, and those corrections are §1.

---

## 1. Where the prompt's account was wrong, checked against source

Listed first, because each one changes an answer below. "Wrong" means the source says
otherwise on `main` at `f64f3bc`; the prompt's claims were hypotheses and were treated as
such.

| # | The prompt said | The source says | Where |
|---|---|---|---|
| 1 | "the Standard/Advanced split" | **There is no tier split in the bloom.** 125 of 125 rows carry `tier: 'standard'`; `bloom.js` never reads `tier`; no Advanced toggle exists. The flower's tier gate (`tools/verify-tier-visibility.mjs`) names the bloom zero times. Hiding is `visibleWhen` plus nested `<details>`, and nothing else. | `bloom-registry.js` (every row), `bloom.js:272-312` |
| 2 | "the 28-row smoke subset" | **89 rows of 778**, across 30 declared blocks, computed at load. The tool's own header still says "39 of 528" — stale prose over a live guard. | `tools/bloom-smoke.mjs:5`, `:936-955` |
| 3 | "#236 (the reachable two-piece export when `hubR < outerR`) — does it get worse" | **#236 is CLOSED by #242**, merged this morning: the zero-volume join shell is no longer built where the head is not wider than the stem, and the solid root band is generalised to cap and flat heads. The `CLAUDE.md` block that says "#236 STAYS FILED, OPEN AND UNTOUCHED" is stale as of `f64f3bc`. | `bloom-geometry.js:7592-7610`, commit `f64f3bc` |
| 4 | "how `centerStyle` … gate[s] sub-controls" | `centerStyle` is **retired** (`RETIRED_IDS[0]`, session 20). The live exemplars of an enum gating sub-controls are `placement` (gates 74 of 125 controls), `hubShape` (23), `gynoecium` (9), and the numeric guards `stemLength ≥ 1` (14), `leafLength ≥ 1` (9), `stamenCount ≥ 1` (11). | `bloom-registry.js:114`, `:2192`, `:2124`, `:2896`, `:332`, `:341` |
| 5 | "full sphere" as a placement mode | SPHERE is a value of `hubShape`, shown only under `placement: CONTINUOUS`; the four placements are RADIAL / SPIRAL / CONTINUOUS / FAN. | `bloom-registry.js:2124-2134`, `bloom-geometry.js:182` |
| 6 | "any bud/offshoot builder" | **None in the bloom** — zero hits for bud / maturity / aperture / unfurl in `bloom-geometry.js` and `bloom-registry.js`. The flower has one (`buildBudInto`, `flower.js:1879`), and it is the only place in either generator that instances a whole head. | see Q1 |
| 7 | "`axisLength` — 0 collapses to umbel/head" | It collapses to an **umbel** (every node at one depth — the leaf node law already does exactly this when its span is 0, `bloom-geometry.js:8409-8418`). A **head** is not a zero-length axis; it is a swollen receptacle surface with sessile florets, which the bloom already builds as the CONTINUOUS head on a cap or sphere. Two objects under one parameter. | Q3 row 2, Q4 |
| 8 | "`pedicelLength` — 0 = sessile" | A rod rooted in a wall has a length **floor** (`petioleLenMm = max(0.12 × L, clearMm)`, `bloom-geometry.js:8457`) because it must clear the wall it roots in. Sessile is a *topology* (the head's hub interpenetrating the axis), not a length of 0. | Q3 row 4, Q6 |
| 9 | "bell-type articulation … already flagged as the gate for wisteria" | No hinge exists and none is needed as a separate thing: a head placed by a FRAME (Q2) has its articulation for free. What blocks catkin/wisteria is the **axis curve** — the stem is straight by ruling and has no centreline abstraction at all. | Q9 |
| 10 | "13 parameters per level … 13 × 3 sliders" | Four of the thirteen are choices (phyllotaxis, terminal flower, lateral content, bracts), so a level is **9 sliders + 4 choices**, and two of the nine are gradients that already exist as ramps. | Q3, Q5 |
| 11 | "prove it in /plot first" (withdrawn by Eva) | Nothing here reads `/plot` for design. One mechanism there is worth one line and is given it in Q6 (a placed instance compared against its origin build as an array identity). | — |
| 12 | Not in the prompt, found on the way: | **PR #243 (sepals, part 1) is open and in flight** on `claude/great-ptolemy-a96x2l`, base `f64f3bc`, draft, 19 files. It is the first second-whorl instancing of `buildPetalInto` and it carries the instancing census that half of Q2 needs (§1 of its outcome doc: every `state.<name>` read in the petal builder is of a parameter, none of a global). It also grows the matrix to 845 rows and freezes `phase34`. The `CLAUDE.md` line "Sepals and base ornament … Untouched" is stale on that branch. **One registry PR in flight at a time**: any inflorescence build session must wait for #243 to merge or be closed. This discovery is docs-only and does not collide. | PR #243, `docs/bloom-sepals-outcome.md` §1 on that branch |

---

## Q1 — Inventory: what already branches, multiplies or attaches

One line each. "As-is" means the function serves an inflorescence with a different caller
and no change; "with extension" names the change; "not at all" says why.

| Thing | Where | What it is | Reusable? |
|---|---|---|---|
| `below: 'stem' \| 'branch' \| null` | `bloom-geometry.js:9159-9163`; callers `bloom.js:590`, `:2221` (both `null`) | The reserved hook. Validated, then **thrown on** for anything but `null`. The only producer of `'branch'` anywhere is the flower's bud (`flower.js:1925`), and its only consumer is a truthiness test on the trunk depth (`flower.js:2206`). | **With extension** — one line (`:9163`) stops throwing; what it should *do* is Q6's question (a head on a pedicel is `below: 'branch'`). |
| The stem (#225, #235, #238, #242) | `stemPlan` `:7514`, `buildStemInto` `:8052`, `stemStations` `:7493` | One straight tube on the world axis, rooted THROUGH the hub slab to `topZ`, hollow above the 3 mm floor with a 1.5 mm wall, both bore ends closed, a derived join (`stemJoinThickness` `:7365`) shaped by three controls (#242). Stations are `[0, L]` — no centreline. | **As-is for the RACHIS of a simple type** (it is the axis). **Not at all for a pedicel or a curved axis**: every ring is `[r cos θ, r sin θ, z]` about `x = y = 0` (`:8066`) and `freeStemDistanceMm` reads `hypot(x, y)` (`:7854`). A pedicel needs a frame. |
| The leaf's petiole | `leafPlan` `:8419`, `buildLeafInto` `:8541-8580` | A 12-gon rod rooted at the stem wall's mid-thickness (`rootR = (boreR + outerR)/2`, `:8454`), leaving at `leafAngle` from horizontal, crossing the wall annulus (`crossesSolidMm`, `:8587-8597`), carrying a blade on its own frame. | **As-is for a PEDICEL** — it is a rod rooted in a tube wall at an angle and a node depth; the thing on its end changes from a blade to a head. |
| Node placement | `leafNodeDepthsMm(n, lengthMm, insetMm, pitchFloorMm)` `:8398` | Nodes in mm down an axis, a top inset, a bottom fraction, a pitch floor of two petiole radii; the count gives when the span is short; span 0 collapses every node onto one point (told, never refused). | **As-is for RACEME nodes** and, at span 0, for an **umbel's single node**. Extension: the top inset is derived from the LEAF's rise (`:8433-8437`); a flower's inset is a different length. |
| Phyllotaxis | `leafAzimuths(phyllo, i)` `:8389` — alternate (180° flip), opposite (decussate), whorled (3 at 120°, turning 45° a node) | The flower's three laws ported verbatim, with the standing warning that the flower's stem bends at `k × GOLDEN_ANGLE` while its leaves flip 180°. | **As-is** for alternate / opposite. **With extension** for whorled(k): the whorl is fixed at three. The petal whorl's `buildWhorlInto` already does whorled(k) as RADIAL with `count k` — so whorled(k) at a node is one whorl primitive call, not a new law. **Registration rule**: there are already two owners of "azimuth of the i-th organ" (`buildWhorlInto:2847-2849` and `leafAzimuths`); an inflorescence must read ONE, never write a third. |
| The whorl primitive | `buildWhorlInto({count, radius, height, sizeRamp, angleRamp, phase, blade, placement, fan})` `:2832` | Slots on a circle about the z-axis: RADIAL even, SPIRAL/CONTINUOUS golden angle, FAN a symmetric arc. Per-slot `scale` and `tiltExtra` ramps. The `blade` callback receives `{index, azimuth, radius, z, scale, tiltExtra}` — cylindrical coordinates, no position. | **As-is for every "several organs about one axis" question** (a whorl of pedicels at a node, an umbel's rays, a whorled inflorescence node). Its `height` argument has carried a literal 0 since session 1 and is what a node depth would fill. |
| Layers / depth | `layerCount` (1–6), `layerSize` (0.35–0.90 per depth), `layerTilt` (0–30° per depth), `layerPhase`; `MAX_LAYERS` `:121` | Whorls stacked inward as instances of the primitive with a real-valued depth `λ` under CONTINUOUS. | **As-is as the shape of `scaleFalloff` and the angle gradient** (a ramp keyed on an index). Not a node axis: depth stacks whorls on ONE hub; nodes stand along a rachis. |
| The CONTINUOUS head on a cap or SPHERE | `footRing`'s continuous arm, `phiAt` `:1817`, `surfaceAt` `:2135`, `sphereMode` `:182` | One equal-area golden-angle sequence over a curved receptacle, every foot on the surface with its normal; the hub as a shell. The mum (120 florets at spread 0.60) and the incurve target are this. | **This IS a capitulum, one level down** — the ray "petals" of a mum are florets botanically. Q4. |
| The androecium's Vogel disc | `stamenLayout: DISC`, `r_i = sqrt(inner² + (i+½)(R² − inner²)/N)` at the golden angle `:2493`, placed through `buildWhorlInto` with `placement: 'SPIRAL'` `:9388` | Rods on a surface normal, tips on the rods, equal-area annuli with an inner limit. | **As-is as a DISC-FLORET law** (a head's disc florets are exactly this: rods with tips on a receptacle). The rod is `rodInto` (`:8961`) with `spineLaw` at tilt 0. |
| The gynoecium | `buildStyleInto` `:9099`; descriptor count 1, radius 0, on the axis at `surfaceAt(0)` | One organ on the axis at the apex. | **As-is as the shape of a TERMINAL FLOWER's seat** — the "one thing on the axis" descriptor kind. |
| Roles and per-petal overrides | `ROLE_OVERRIDES` `:1175`, `resolveRoleOverrides` `:1633`, `petalStateFor` `:1691` (identity guard), registry generator for 9 groups `bloom-registry.js:2715-2766` | A table of (role, base control, override control, law delta/mul, bounds), walked in table order, clamped once, skipping identities so a zero delta is bit-identical by object identity. | **As-is as the mechanism for per-flower variation** (openness, scale per node) — a "node role" is one more row family. The flower's `buildBudInto` builds its head from a spread substate (`flower.js:1894-1904`), and #243's sepal does the same (`sepalBladeState`). |
| Sepals (#243, in flight) | `buildSepalsInto` → `buildPetalInto` on `fr.sepals` (branch `claude/great-ptolemy-a96x2l`) | The petal builder on a second ring with a second parameter set. | Its **instancing census** is the half of Q2 that concerns state reads. Not on `main` yet. |
| The flower's side bud | `buildBudBranchInto` `flower.js:1840`, `buildBudInto` `:1879`, `appendTransformed` `:1006`/`:1949`, `floorScale` `:1907` | A Bézier offshoot tube welded with a bead, and at its tip a WHOLE HEAD built from a modified UI into a separate accumulator, downscaled 0.42 with the export floor pre-divided, and merged by one rigid matrix. Recursion is capped at ONE by forcing the bud's own stem and bud to `'none'`. | **The precedent, not code to port** (charter: port the machinery, not the geometry). It answers Q2's "what would it take": a substate, a second accumulator, a transform, a floor scale, a recursion cap. `MeshBuilder` has none of `appendTransformed`, `addTube`, `addBead` or `floorScale`. |

**Nothing in the bloom recurses**, and nothing keys a builder on a position other than a
scalar azimuth about the world axis (`petalSurface` `:6093-6096`, `:6220`; `rodInto`
`:8963-8966`; `buildHubInto` apexes at literal `[0, 0, z]` `:8795`, `:8834`, `:8864`,
`:8895`). Also established: `bloom-geometry.js` has **zero module-level mutable state**
(no `let`/`var` at top level), so re-entrancy is not a problem — the file is already pure in
`(state, acc)`.

---

## Q2 — Can a whole head be instanced?

**It is a pure function of `(state, acc)` and it is origin-locked.** `buildBloomInto(acc,
state, {below, capability})` (`:9159`) reads no global; the app's module-level `let`s
(`bloom.js:356-569`) are telemetry written AFTER the build (`bloom.js:591-620`), never read
by it. The two `stemPlan` calls per build (`:8743` inside `buildHubInto`, `:9258` in the
orchestrator) are the same pure function on the same inputs. But there is no transform
argument, no position and no orientation: the hub is centred on `[0, 0, 0]` with the axis
`+z`, every petal frame is `[cos θ, sin θ, 0]` about that axis, and the stem's own clause
ST2 asserts its rings are centred on the world axis (`emittedAxisOffset`, `:8076-8095`).

**What it would take, two routes:**

* **(A) Build each head at the origin into its OWN `MeshBuilder`, then append it under a
  rigid transform.** The flower's exact pattern (`flower.js:1907-1949`). Needs one new
  method on `MeshBuilder` (append with a 3×4 matrix, folding the transformed triangles into
  `positions`, `lo`/`hi` and `minThickness`), and the orchestration in a new top-level
  builder above `buildBloomInto`. Every existing builder is untouched. The terminal head at
  the identity transform is byte-identical by construction (the same call on the same
  input); every other head moves by rotation arithmetic, which is expected and is its own
  rows. **Scale must never come through the transform**: the export floor is applied at
  build (`floorThickness`, `:756`), so a downscaled head would carry a floored sheet scaled
  below the floor — the flower needed `floorScale` for exactly this. A floret should be
  smaller by its *parameters* (petal count, length, width, spread), never by the matrix.
* **(B) Thread a frame through every builder.** Touches at least the ten origin sites named
  above plus `stemPlan`/`buildStemInto`/`freeStemDistanceMm`/`buildLeafInto`. More code,
  more byte risk on the shipped head, and it buys nothing (A) does not, except avoiding one
  copy of the triangle floats per head. Not recommended.

**What (A) does not solve:** the metrics hook. `__bloomMetrics()` (`bloom.js:1723-2204`, 90
keys) describes ONE head — `petals`, `rings`, `slotAzimuths`, `petalRingSpine`,
`hubBuilt`, `stem`, `leaf` are all singular. Every one of the 92 assertion families reads
it. So instancing owes a per-instance record (`instances[k].{…}` with today's shape) plus a
rule for which instance the single-head keys describe (the terminal head, or the first
built — the "representative" ruling of the sphere-stem session, one level up). That is the
largest single cost in this whole programme and it is a harness cost, not a geometry cost.

**Measured, one head, this box, Node, median of five warm builds** (the row named
"DEFAULTS" is the shipping configuration; the mum and the incurve target are the two
densest shipped states in the matrix; the bloom has no presets — `docs/bloom-charter.md`
"Presets: Eva authors them herself" — so the densest *shipped state* is a matrix row):

| state | mode | tris | STL | build | petals | hub R | extent |
|---|---|---|---|---|---|---|---|
| DEFAULTS (8 radial, 1 whorl) | live / export | 19,040 / 19,040 | 930 KiB | 101 / 94 ms | 8 | 8.845 mm | 81.6 mm |
| the MUM (CONTINUOUS 40/turn × 3, spread 0.60, 60 mm blades) | live / export | 282,912 | 13.5 MiB | 1,371 / 1,360 ms | 120 | 3.63 / 4.69 mm | 114 / 116 mm |
| the INCURVE TARGET (rise 0.50, curl 150) | live / export | 286,176 | 13.6 MiB | 4,663 / 4,667 ms | 120 | 9.69 / 12.51 mm | 20.7 / 26.6 mm |
| RADIAL 40 × 6 whorls (240 petals, flat) | live / export | 565,632 | 27.0 MiB | 2,774 / 2,755 ms | 240 | 34.99 mm | 133.9 mm |
| the SPHERE head (CONTINUOUS 40 × 3, SPHERE) | live / export | 289,440 | 13.8 MiB | 1,391 / 1,379 ms | 120 | 27.37 mm | 89.8 mm |
| DEFAULTS + 60 mm stem + 3 leaves | live / export | 28,792 | 1.4 MiB | 148 / 147 ms | 8 | 8.845 mm | 81.6 mm |

The count is `petals × 2,356 + hub` (192 flat / 3,456 cap / 6,720 sphere) plus the stem
and leaves; it depends on no shape control (fixed `NU = 56` rows × `NV = 10` columns per
petal). Note the incurve target is 3.4× the mum's build time at the same petal count: the
spine integration under curl 150 (`SPINE_SUBSTEPS = 32`, `:5469`) is the cost, not the
triangles.

**Projected, by multiplication (no overhead, no rachis, no pedicels), against the
1,500,000 export budget** (`bloom.js:23`):

| heads | DEFAULTS (19,040) | floret 5 × 20 × 8 mm (11,972) | floret 3 × 20 × 8 mm (7,260) | the mum (282,912) |
|---|---|---|---|---|
| 12 | 228k · 11 MiB · ~1.2 s | 144k · ~0.7 s | 87k · ~0.4 s | 3.4M **refused** |
| 50 | 952k (63%) · 46 MiB · ~5 s | 599k (40%) · ~3 s | 363k (24%) · ~1.8 s | refused |
| 150 | 2.86M **refused** | 1.80M **refused** | 1.09M (73%) · ~5 s | refused |

Three conclusions. **(i) A raceme of default heads is not a raceme**: a default head is
81.6 mm across, so twelve of them on a 120 mm stem is a bouquet; the sizes that read as an
inflorescence are the floret rows, 39–45 mm across. **(ii) A reduced floret build is
needed above ~78 default heads or ~125 five-petal florets, and the only lever that does
not touch a ruled constant is the petal count** — a floret at 3 petals is 7,260 triangles.
Reducing rows per petal is NOT available: `NU = 56` is fixed by ruling because
`CURL_START_MIN = 1 / NU` is imported by the registry as a curl slider's bound
(`:5477`; session 33/34), so a per-instance row count is the trap those sessions named.
Dropping stamens, style and the lobe/fringe/buckle families costs nothing because they are
absent by default. **(iii) Build time, not the budget, is what makes a live page unusable
first**: every slider drag rebuilds everything (`regenerate` → `buildGeometry` →
`buildBloomInto` once, `bloom.js:1432-1440`), so 50 florets is ~3–5 s per drag and 12
incurve heads is ~56 s. `/plot` learned the same lesson and rebuilds one instance per
change — one line, not a route.

---

## Q3 — The thirteen parameters against shipped machinery

"Same maths one level up" is flagged in the last column. Verdicts: REUSE (call it),
EXTEND (one change named), NEW (nothing there).

| # | Parameter | Petal-scale / stem-scale equivalent today | Verdict | Same maths one level up? |
|---|---|---|---|---|
| 1 | `nodeCount` | `leafNodes` (1–8) placed by `leafNodeDepthsMm` `:8398`; `petalCount` (3–40) for organs about one node | **REUSE** the node law; **EXTEND** its ceiling (8 is a leaf count) | Yes — nodes along a length with a pitch floor, count giving first. |
| 2 | `axisLength` | `stemLength` (0–120 mm, `:7331`) | **REUSE.** At 0 the node law collapses to one point (`:8409-8418`) = an UMBEL. A HEAD is a different object (Q4), not this at 0. | Yes for the rachis. **Hypothesis conflates umbel and head.** |
| 3 | `phyllotaxis` | `leafAzimuths` alternate/opposite/whorled(3) `:8389`; `buildWhorlInto` RADIAL/SPIRAL/FAN `:2847-2849` | **REUSE**; **EXTEND** whorled to whorled(k) by calling the whorl primitive at the node. Must read ONE of the two existing azimuth owners. | Yes — `SPIRAL` IS spiral(golden) at a node; RADIAL k IS whorled(k). |
| 4 | `pedicelLength` | No flower equivalent. The petiole (`petioleLenMm`, derived `:8457`) and the filament (`stamenLength` 5–40 mm, `bloom-registry.js:2840`) are rods with things on the end. | **NEW control, REUSE the rod** (`rodInto` `:8961` or the petiole ring `:8560-8575`). **0 ≠ sessile**: a rod in a wall has a floor (`clearMm`); sessile is the head's hub rooted IN the rachis wall — a topology, its own root law (Q6). | Rod machinery yes; the floor is new. |
| 5 | `pedicelGradient` | `sizeRamp(i, count)` / `layerSize` — a per-index ramp; nothing solves for a target | **REUSE** the ramp shape; the CORYMB "level tops" is a **derived** law `L_i = (z_top − z_i)/sin(angle_i)` — derive, don't expose (one derived value, no slider). | Yes — the ramp argument the primitive already takes. |
| 6 | `branchAngle` + gradient | `leafAngle` (−60..90° from horizontal, `bloom-registry.js:3008`) for a rod; `petalTilt` + `layerTilt` for a tilt plus a per-depth gradient | **REUSE** both patterns (`tilt + tiltExtra ramp`) | Yes — `petalTilt + λ·layerTilt` is exactly angle + gradient. |
| 7 | `terminalFlower` | The gynoecium: one organ on the axis at the apex (count 1, radius 0, `surfaceAt(0)`) `:9099`; the sphere's face pole | **NEW choice, REUSE the seat** (the on-axis descriptor kind). | Yes — "one thing on the axis" exists. |
| 8 | `lateralContent` (flower / recurse) | Nothing recurses. The flower's bud recurses ONE level with a forced-none substate (`flower.js:1894-1904`). | **NEW.** `below: 'branch'` (`:9159`) is the reserved seam. Recursion cap: the `MAX_LAYERS` precedent (a constant plus registry twin plus gate rows). | No — this is the orchestration that does not exist. |
| 9 | `scaleFalloff` | `layerSize` per depth (0.35–0.90), `slot.scale` through the whorl primitive; #243 scales a sepal the same way | **REUSE** verbatim (a per-node scale is `slot.scale`). | Yes. |
| 10 | `maturation` → openness | **None.** No bud, no openness parameter. Composed today from `petalTilt` (0–75), `petalSpineCurl`, `petalCup`, `layerTilt`. | **NEW** (Q8): a pose law + a per-node ramp through the override resolver. | Partly — the resolver is the mechanism; the pose is not. |
| 11 | `axisSwelling` (capitulum, spadix) | `headRise` (cap), `hubShape: SPHERE`, `hubLength`/`hubShapeAmount` (the join's swell, #242); `footRing`'s dome with `surfaceAt` | **REUSE — it already IS the head** (Q4). | Yes, exactly. |
| 12 | `droop` | **None on the stem** (`stemStations` `[0, L]`, "curvature is where a pitch law is owed", `:7488-7492`). The flower has `stemCenterline` (`flower.js:1788`) with a bend and per-node golden-angle drift — and a recorded disagreement with its own leaf azimuths. | **NEW** (Q9). | No. |
| 13 | `bracts` | A leaf at a node (`buildLeafInto` at `(node, azimuth)`); no spathe (needs surface self-closure) | **REUSE** the leaf builder with a bract substate at the pedicel's node; spathe out of scope (confirmed). | Yes — a bract is a leaf with a different size law. |
| C1 | cyme side (same / alternating) | `leafAzimuths` alternate (180° flip) IS "alternating"; the two mirror involutions (`MIRROR_THROUGH_SLOT` / `_GAP`, `:1297`) are the vocabulary for pairing | **REUSE** the alternation vocabulary; **NEW** the sympodial re-rooting. | Partly. |
| C2 | cyme plane (rotating / flat) | Nothing — needs an axis frame that turns per node (the flower's `k × GOLDEN_ANGLE` kink is the rotating case, with the recorded warning) | **NEW.** | No. |
| K1 | compound `depth` (cap 3?) | `MAX_LAYERS = 6` is the precedent for a capped count with a registry twin | **NEW** with the same shape; the cap is budget-bound (Q2). | Pattern yes. |
| K2 | `depthGradient` (Weberling panicle) | `layerSize` / `layerTilt` λ-ramps | **REUSE** the ramp; per-level tables are Q5's generator. | Yes. |

**Where the hypothesis is redundant:** `axisSwelling` and the head are one object (row 11 =
Q4). **Where it is missing something:** a **root law for a sessile head** (row 4) and a
**recursion cap with a budget argument** (row K1) — neither is a parameter, both are
structural. **Where it is wrong:** rows 2 and 4 above.

---

## Q4 — The capitulum overlap, laid out and not resolved

**They are the same object.** The bloom's CONTINUOUS head is: a receptacle surface (flat
slab, spherical cap at `headRise`, or a full sphere) with N organs placed on it by an
equal-area golden-angle sequence, each on the surface with the surface's normal, shrinking
and tilting inward by depth. Botanically that is a capitulum whose organs are florets. The
mum row (120 "petals") and the 240-foot sphere are capitula already — the word the registry
uses is "petal" and the object is a floret. The androecium's Vogel disc is the same law with
rods instead of blades (disc florets). So "a capitulum of flowers" as an inflorescence
preset would build, one level up, exactly what `footRing`'s continuous arm builds one level
down, with each slot holding a *head* (a floret with its own hub, petals and centre)
instead of a *petal*.

**Three ownerships, each with its cost:**

* **(a) The HEAD owns it.** A capitulum is `placement: CONTINUOUS` (cap or sphere) with a
  new *slot content*: each ring descriptor seats a floret head instead of a petal. No
  inflorescence level is involved; `axisLength` is not a thing. Reuses `surfaceAt`,
  `phiAt`, the omission mask, S1–S4, the crowding raster and both coverage instruments
  unchanged (they read descriptors). **Cost:** the floret is a head instanced ON a surface
  (Q2's route A per slot), and 120 florets at 7,260 triangles is 871k — under budget, but
  the mum's petal count becomes the floret count. **Registration:** one owner of "organs
  on a receptacle" — `footRing`. The ray/disc distinction (ray florets with a blade, disc
  florets as rods) is then the head's two descriptor kinds already (petal rings and the
  androecium), which is a striking fit.
* **(b) The INFLORESCENCE owns it.** Level 0 with `axisLength` 0 and `axisSwelling` = the
  receptacle; florets are lateral content on a swollen node. Reuses nothing of the sphere
  machinery and re-derives the equal-area law, the pole reservation and the stem channel
  one level up — a second producer of every one of them. **Cost:** the registration rule
  broken by construction, and a capitulum that cannot be the mum.
* **(c) Both routes reachable.** A "capitulum" preset in the inflorescence dropdown that
  writes `placement: CONTINUOUS` plus a floret slot content. That is (a) with a second door,
  and it is fine only if the dropdown WRITES values rather than owning a law (Q5).

**What is genuinely open and is Eva's:** whether the mum is "a flower with 120 petals" or
"an inflorescence of 120 florets" — because that decides whether the CENTER section
(androecium/gynoecium) belongs to the head (one centre, as today) or to each floret (120
centres, at +560 triangles a stamen). Today the head has one centre and the florets have
none; a true capitulum has one per floret and no centre on the receptacle. The
recommendation is (a) — the head owns it — with a floret slot content as the mechanism and
the per-floret centre as a later value; it keeps one owner of the receptacle and needs no
second law. Recorded for the ruling, not decided.

---

## Q5 — The panel and the dropdowns

**What is there** (`bloom-registry.js`): 125 controls (118 sliders, 7 choices, 0
checkboxes), 30 sections nested to three levels, one accordion, one hiding mechanism
(`visibleWhen`, 17 named predicates + inline ones), two control-less containers (`petal`,
`center`), one derived section label, generated rows in two places (per-petal 4 × 9
`:2715-2766`; tips 7 × 2 through `tipControls` `:1259`), and **no tiers, no saved designs,
no schema, no URL state** (`RETIRED_IDS` carry `schema: null` for that reason, `:99-106`).
The largest enum gate is `placement` (74 of 125 controls). New parts get new sections
(charter, "ROOM TO GROW").

**Where it lives — two costed alternatives and one rejected:**

* **A — a new top-level `Inflorescence` section**, after Stem, holding one choice
  `inflorescence` (NONE default) that gates everything below it — the `stemLength ≥ 1` /
  `gynoecium` pattern. Per-level controls are generated from one descriptor table
  (`LEVEL_DESCRIPTORS × LEVEL_INSTANCES`, the tip pattern that makes "the levels cannot
  drift" a property of the file) into nested sections `Level 1..3` that hide when depth is
  below k (the `petalN` sections' pattern: hidden iff every control is hidden). **Cost:**
  one section, 3 nested, 9 sliders + 4 choices per level = 39 rows generated, one
  predicate family (`levelPresent(k)`), `verifySections` untouched (route (s) already
  accepts three levels). **Byte identity:** NONE is a branch guard (`domeIsFlat`'s shape),
  so the full matrix is 0 moved by construction, PROVIDED the new sliders are kept out of
  the blanket sweep and `ALL MAX` as `INFLO_SUBS` — the exact `STEM_SUBS` derivation
  (`tools/bloom-harness.mjs:6764`), which keeps `ALL MAX` from becoming N heads of
  everything-at-maximum (it already refuses at 2.4M; N× that is a matrix row that runs
  for minutes to refuse).
* **C — the Stem owns it.** The rachis IS `stemLength`; the nodes ARE the leaf node law;
  a node's content becomes a choice `leaf | flower | branch`. Stem > Nodes > (Leaves |
  Flowers | Branches). **Cost:** it reuses the most and it re-homes Leaves under a new
  parent (a presentation move, nothing persisted — `section` is never persisted); but a
  leaf and a flower at one node have different insets, angles and phyllotaxies, so "the
  node law" becomes two laws under one section, and an umbel (span 0) is a stem state
  nobody would look for under Stem. Cheaper geometry, worse panel.
* **B (rejected in one line)** — folding levels into Arrangement's `layerCount`: depth
  stacks whorls on one hub and nodes stand along an axis; one control, two meanings, the
  `petalCount`-under-FAN label lie the fan session refused.

**Presets — dropdown that WRITES values vs. type enum that GATES:**

* A **type enum that gates** is right where the type changes the LAW (racemose vs cymose;
  simple vs compound; terminal flower or not) — exactly as `placement` is a law, not a
  value set. Those are three choices per level, and they are in the thirteen already.
* A **preset dropdown that writes slider values** ("raceme", "corymb", "umbel") cannot be
  a registry row: one control id is one value, so a row whose value sets other rows is the
  role-SELECTOR the charter recorded and rejected (a second source of truth for those
  values). The flower's presets are a DELTA over DEFAULTS applied through the normal path;
  the bloom has no `applyDesign`, but it has the harness's `applyConfig` shape (real events
  per control) and the panel's own reset button as view chrome. So a preset is a **button
  outside the registry** that writes sliders through real events — invisible to `readUI`,
  `DEFAULTS` and every gate, like `#printPreview`. **What it does to saved designs:
  nothing today, because nothing persists.** The day something does, a preset NAME must
  not be a persisted key (the `petal2Cup`-across-the-toggle note): persist the values, and
  let the read-out name the nearest type by matching them — derive, don't expose.
* A type enum whose values are only parameter sets (the hypothesis's "presets over one
  rule") would be a second owner of `pedicelLength` etc. and is refused on the
  registration rule.

**Per-level without 39 visible sliders:** there are no tiers to hide them behind, so the
answer is structural — sections `Level 2` and `Level 3` are hidden until depth reaches
them, and within a level the choices gate the sliders that do not apply (`pedicelGradient`
hidden when pedicel length is 0; cyme controls hidden under RACEMOSE). Introducing a
Standard/Advanced tier to the bloom is a new mechanism (the flower's), a fourth hiding
route beside predicates, sections and the accordion; not recommended for this.

**Per-flower editing and roles against "every flower in this inflorescence":** the roles
machinery is per-slot within one head. An inflorescence adds a *node* axis. The clean
statement is the fan's own: **all flowers share the head's controls; per-node deltas ride
on them** (`allCurl`'s "the group, then the petal" precedence, `:1181-1182`), through the
same resolver with one more role family (`NODE_k`). Openness per node (Q8) is the first
such delta. Editing one flower's petal 3 is per-node × per-petal and is NOT proposed —
that is 9 groups × N nodes of sections.

**The byte-identity argument, stated:** with `inflorescence: NONE` the orchestrator takes
the pre-inflorescence path verbatim (one `buildBloomInto` at the origin, no append), so the
full 778-row matrix — and #243's 845 — is 0 moved by construction, measurable with the
`--movers` shape of `verify-bloom-surface-bytes.mjs`. The sub-controls join `INFLO_SUBS`;
`ALL MAX` is unchanged; a named `INFLO: ALL MAX` row is owed and will be a declared refusal
(`EXPORT_REFUSED_XFAIL`'s second entry).

---

## Q6 — Connectedness

**How a pedicel joins a rachis at an arbitrary angle and node: the petiole already does
it.** `buildLeafInto` roots a 12-gon rod at the wall's mid-thickness (`rootR = (boreR +
outerR)/2`), at node depth `z = rootZ − nodeDepth` and azimuth `az`, leaving at angle `th`
(`:8543-8548`), and reports the solid it crosses (`crossesSolidMm`, `:8587-8597`, the
wall's `2 × STEM_MIN_WALL_MM = 3.00 mm` on every hollow diameter). Phase A of the leaf
sessions measured the trap: a rod rooted ON THE AXIS detaches above 75° because the escape
length runs away as `outerR / cos θ`; the wall's mid-thickness gets more embedded as the
angle steepens. A pedicel is that rod with a head where the blade is.

**How the head joins the pedicel: the stem already does it, mirrored.** The stem roots
THROUGH the hub slab to its top face (`topZ`, `:7591`), so the union is a solid annulus.
A head on a pedicel is the same relation seen from the pedicel: the pedicel's tip must
reach `topZ` of the head's hub, in the head's frame. #225's derived join
(`stemJoinThickness`, `:7365`) generalises unchanged and is INERT for a thin pedicel:
at the 3 mm floor `joinT = max(hubT, (√3/2)·√(1.5⁴ − 0)/1.5) = max(1.20, 1.299) = 1.30 mm` — the same
1.299 the sphere-stem session measured as the thinnest stem's ask — so a floret hub
thickens by a tenth of a millimetre under it, told, 0 new controls. **#236 does not get worse; it is
closed and moot at the floor**: a 3 mm pedicel is SOLID (`bore = max(0, 1.5 − 1.5) = 0`,
`:7333`), so there is no bore for a narrow head to stand inside, and #242's "join inert
where the head is not wider than the stem" already handles a 3-petal floret at spread
0.60 (hub radius 1.15 mm against a 1.5 mm pedicel radius). Above the floor a hollow
pedicel (4 mm+) on a narrow floret is the root-band case, closed by #242 on cap and flat
heads.

**Sessile (spike, head)**: a head whose hub sits IN the rachis wall has no precedent; the
nearest is the petiole's embed (`embedMm = wall/2`) — the rule would be "the hub slab
interpenetrates the rachis by at least one wall", a NEW root law with its own clause.

**Which assertions extend, which are new.** The roster is 92 families
(`tools/bloom-smoke.mjs:798-807` defines the census; the owners are in
`tools/bloom-harness.mjs`). Per instance, once the metrics hook is per-instance:

| family | today | under instancing |
|---|---|---|
| J1–J9 (`junctionAssertions` `:2823`, ~30 clause sites) | one head's feet on one hub | **extend unchanged per head** — every clause is over radii, thicknesses and foot frames in the head's own frame; none reads a world position (the fan session established this by grep). |
| S1–S4 | the sphere head | per head, unchanged |
| ST0–ST11 (`stemAssertions` `:4847`) | ONE stem on the WORLD axis | **ST2's axis-offset and ST9's cylinder region are world-axis statements** (`:8076-8095`, `freeStemDistanceMm`); the RACHIS keeps them, a PEDICEL needs them restated in the pedicel's frame — 2 clauses rewritten, the rest per rod. |
| LF0–LF9 (`leafAssertions` `:5505`) | petiole in the wall | **the pedicel's template**: LF3 (crosses the wall), LF4 (inset biconditional), LF5 (node spacing), LF8 (directed edges) port with a rename; ~4 clauses. |
| X0–X2, O1–O2, XR1–XR2, R1 (three instruments) | the whole export | unchanged (they read the file) — but R1's part census must learn every instanced part or it fires on the first raceme, as it did on the first stem and the first leaf. |
| Z1–Z9, L0–L8, FR0–FR5, A2–A8, C1–C3, JS0–JS7, JG0–JG6 | per head | per head, unchanged, IF the hook is per-instance |

**New families, estimated (names illustrative):** IN0 present iff declared, two statements
per level (JS0's shape); IN1 node count and depths against the node law (LF5's); IN2 the
pedicel roots THROUGH the rachis wall AND the head's hub roots THROUGH the pedicel's tip,
both read off the builder's emitted rings (LF3 + ST4 per instance); IN3 every head's frame
equals its pedicel's tip frame — the hinge as an identity; IN4 the instance tally (heads
emitted = declared − culled, the builder's own count, R1's reason); IN5 a placed head is the
origin head under its transform to the float (an array identity, not a tolerance — `/plot`'s
`placeStrips` returns the same records at the identity, one line); IN6 the culling mask in
both directions (ST7's biconditional); IN7 the terminal flower iff declared; IN8 the depth
cap and the budget refusal. **About 9 families and 25–30 clauses**, against ~8 restated
clauses in ST and LF. The per-instance metrics hook is the prerequisite for all of it and
is not counted here.

**What the voxel gate can and cannot see, carried forward:** it counts detached bodies and
is blind to a free end (a pedicel attached at one end only reads one piece); J3's
"joined to nothing" and IN2 are what see a head standing on a pedicel that does not reach
its hub. A green flood fill on a raceme endorses nothing about the joins.

---

## Q7 — Collision and culling

**The sphere-stem filter generalises to flower-vs-axis and is already a mask.**
`stemOmission` (`:7908`) omits a slot if the petal the SHIPPED builder emits comes within
`MIN_FEATURE_MM` of the free stem's solid in EITHER mode (a union, so the set is
mode-free — topology may not depend on mode, refused four times before). It is a **mask
over the slot sequence, not a renumbering**: the whorl primitive runs every slot, `azOf`
records every azimuth, `petals` keeps a `null` where nothing was built (`:9288-9296`).
So "nothing re-placed" holds by construction and ST8 asserts it against a stemless build
on the same page. For an inflorescence, "the flower would pass through the rachis" is the
same test with the rachis as the cylinder (`freeStemDistanceMm` in the rachis frame);
"the pedicel would pass through the rachis" is LF3's crossing measure with the sign
flipped.

**Flower-against-flower is a different instrument and there is none.** The cheapest
pairwise measures that exist are all-pairs nearest (`stamenNearest`, `:9397-9398`, on
root and apex points — O(N²) on points, fine at hundreds) and the exact triangle census
(`tools/bloom-self-intersection.mjs`, 387 ms at 19k triangles, counting cross-shell
overlaps separately — 4,720 on the flat default). Dense spikes, dichasia and compound
umbels will overlap by design (the export contract permits cross-shell overlap) and the
question is only whether the LOOK is wanted; a cull between heads is a policy, and the
precedent says: **told, never refused** for a raceme (a slot masked and counted, the
read-out saying so), and NOT culled at all inside a cyme, because a dichasium's pairing is
a bijection (Z4b's shape) and removing one member of a pair breaks the claim the cyme is
built on.

**Cost, measured on the sphere:** two extra petal builds per slot per mode — the default
sphere 90 → ~270 ms, the 240-foot sphere 2.85 → 7.7 s (`:7900-7906`). Per head in a
raceme that is a full head build per candidate; a cheap reach envelope (the head's
bounding sphere against the rachis cylinder) is the costed-not-built remedy from the
sphere-stem doc and would be needed before culling runs on every rebuild.

---

## Q8 — Openness

**There is no bud-to-open parameter in the bloom.** Zero hits for bud / maturity /
aperture / unfurl in the geometry and the registry; `open`/`closed` mean the accordion and
closed solids. What a closed flower would be composed of today: `petalTilt` (0–75°,
`bloom-registry.js:1841`, the rigid frame at u = 0), `petalSpineCurl` (−180..360, the
rate), `petalCup`, `layerTilt`. The flower's bud is a hand-tuned tuple (`flower.js:1891-1892`:
tight = `{bloom 12, tightness 0.88, elevation 0.32, curl −0.5, cup ≥ 0.45}`), not a scalar.

**Two things stand in the way, one ruled and one measured.** `petalTilt` stops at 75 and a
closed bud wants the blade past vertical; the foot-to-blade seam law reverses past a right
angle (48 rows are in the xfail list as EFFECTIVE TILT PAST 90, session 38), and #243 has
just found the builder folds at its own seam on a blade turned DOWN past about −55°. So a
bud pose lives in the two regions the seam owner has not served. **Whether the tilt range
should reach past 90 at all is already a ruling Eva was asked for** (session 38); the bud
needs the answer.

**What it would take:** (1) a pose law — one scalar `openness` in [0, 1] mapping to a
tuple (tilt, curl, cup) ruled from a SHEET, the flower's tight/early poses as the
starting point; (2) applying it per node through the override resolver as one more role
family (`NODE_k` deltas on the three bases, clamped once, identity-guarded so openness 1
is bit-identical); (3) a ramp law per type — acropetal (buds at the tip: raceme, spike,
corymb) / basipetal (cyme) / divergent (a head, from the rim inward) — which is a
per-node index into (1). **Is it a prerequisite?** For BUILDING any axis, no. For the
determinate/indeterminate DISTINCTION, yes: a raceme and a dichasium with the same node
geometry and every flower open look alike; maturation order is the only visible
difference the prompt names, and the code confirms nothing else differs. It is its own
session (the pose, from a sheet) plus a small second one (the ramp), schedulable after
instancing.

---

## Q9 — Droop and hanging flowers

**Confirmed absent.** The stem is straight by ruling: `stemStations(lengthMm)` returns
`[0, lengthMm]` (`:7493`) and its header says curvature "is where a pitch law is owed"
and is out of scope. There is no centreline object on the bloom's stem at all; the flower's
`stemCenterline` (`flower.js:1788`, a 48-point polyline with an eased bend and a
golden-angle per-node drift) is the precedent, along with the recorded defect that its
bends and its leaf azimuths disagree — the note at `bloom-geometry.js:8385-8388` says do
not reproduce it. The only articulated joint in the bloom is the leaf's angle from the
wall (`leafAngle`), and the only "droop" word is that control's read-out.

**The hinge is not the gate.** A head placed by a frame (Q2, route A) has its orientation
relative to its pedicel for free — the frame is the pedicel's tip frame rotated by a
hinge angle, one number, IN3's identity. What blocks catkin and wisteria is (i) the AXIS
curve — a centreline with tangent frames, a pitch law for the tube's stations, the join
at a curved root — and (ii) gravity-consistent pedicel angles along a curved axis (an
angle measured from the axis tangent, the leaf's law generalised). So: **catkin and
wisteria presets are blocked on an axis-curvature session, not on articulation.** A
pendulous raceme on a STRAIGHT axis pointing down is reachable the day instancing lands
(the transform is the whole of it) and is the honest first picture of a hanging type.

---

## Q10 — The print floor

**Said once: nothing in this project has ever been printed.** `MIN_FEATURE_MM` 1.0, the
1.2 mm sheet, `STEM_MIN_WALL_MM` 1.5 and the 3 mm stem floor are declared guesses.
Everything below is a comparison against lines we drew ourselves.

**The numbers, EXPORT mode, sum of closed shells (an upper bound on the union):**

| object | volume | mass at PA12 ~1.01 g/cm³ | across |
|---|---|---|---|
| DEFAULTS head | 4,416 mm³ | ~4.5 g | 81.6 mm |
| floret 5 × 20 × 8 mm | 829 mm³ | ~0.84 g | 44.9 mm |
| floret 3 × 20 × 8 mm | 492 mm³ | ~0.50 g | 39.3 mm |
| floret 5 × 20 × 8, sheet 0.60 (floors to 1.0) | 675 mm³ | ~0.68 g | 44.0 mm |
| the mum | 23,505 mm³ | ~23.7 g | 116 mm |
| a 60 × 6 mm stem alone | 1,438 mm³ | ~1.5 g | — |

**Pedicel against load, rough:** a 3 mm solid PA12 rod 30 mm long carrying 0.84 g at its
tip sees a root bending moment of `0.84e-3 × 9.81 × 0.030 = 2.5e-4 N·m` over a section
modulus `π r³/4 = 2.65e-9 m³` — about **90 kPa**, three orders under PA12's tensile
strength. Static strength is not the question; a cantilevered 3 mm rod's L/d (10 at 30 mm,
20 at 60 mm) and what a print bed and a post-processing brush do to it are, and no coupon
exists. At the petiole's 1.2 mm the leaf already prints L/d 100 as `UNMEASURED`.

**Which presets are printable at a sensible size (SLS dyed PA12 caps at 180 mm on the
shortest axis; the max dimension is the only size that matters):**

| type | at 3 mm pedicels, florets ~40 mm | verdict |
|---|---|---|
| spike, head, fascicle | sessile / sub-mm pedicels, mass on the axis; a 30-floret spike at 5 mm pitch is 150 mm tall | **printable in principle**; the axis carries the load |
| raceme, botryoid, corymb | 10–40 mm pedicels at 3 mm, 0.5–0.9 g each | printable as a static object; **handling risk at the pedicels**, unmeasured |
| umbel, compound umbel | 20–40 mm rays from ONE node, 5–15 of them; compound: rays of rays | the node is a star of 3 mm rods — **the worst root** here, and a compound umbel's second-order rays would be under the 3 mm floor if scaled |
| cymes | short internodes, few flowers | printable; sympodial roots are joins of 3 mm rods at angles |
| panicle, thyrse | depth 2–3, 30–100 florets, 150–250 mm | at the 3 mm floor the second-order axes are the same diameter as the pedicels: no taper below the floor is possible, so a panicle prints as a uniform 3 mm scaffold |
| catkin, wisteria | pendulous | pedicels in tension if printed hanging, but printed geometry has no "hanging" — a droop is a bend, and a bent 3 mm rod is the cantilever above |

**The one structural constraint the floor produces:** the area rule (`r_parent² = Σ
r_child²`) is the project's own junction law, and at the 3 mm floor it cannot be obeyed
downward — every pedicel is already at the floor, so a rachis feeding N pedicels wants
`3√N` mm and a compound axis wants more. A panicle at three levels with 3 mm tips is
9 mm at the trunk for nine second-order axes. **That is derivable from the floor and is
the number to design against**, not a control.

---

## Q11 — Gates

**How rows would enter.** A new numbered block in `buildMatrix()`
(`tools/bloom-harness.mjs:6771`), written with the `/* N. TITLE` banner the smoke census
parses (`tools/bloom-smoke.mjs:843-856` — block 27 shipped invisible to it once; `1b`,
`5b`, `5c` still are) and a smoke block naming its rows and families; the new sliders
enter block 1's min/max sweep AUTOMATICALLY unless kept out as `INFLO_SUBS` (the
`STEM_SUBS` derivation, `:6764`), which they must be or `ALL MAX` inherits every one of
them at maximum on a 240-petal head. The drift guard (`fullStateDrift`, `:755`) needs only
registry rows — it walks `CONTROLS`; an inflorescence preset BUTTON is invisible to it, so
a row that names a preset must SET the values it implies (the "a row that NAMES a state
SETS it" rule). The per-instance metrics hook is what the assertion families need before
any row can pass — see Q6.

**The missing combination gate, plainly.** The matrix varies one control at a time from
DEFAULTS and is blind to two-control interactions by construction (`cup × petalTipShape`,
session 32 §18a; `leafAngle × sphere`; the buckle's composition). An inflorescence IS a
combination: node count × pedicel length × angle × depth × floret size decides whether
heads collide, whether a pedicel clears its neighbour, whether the whole thing fits the
budget. A one-at-a-time sweep of thirteen controls would pass every row and say nothing
about the raceme anyone would build. What is owed is the predeclared combination grid the
charter records as schedulable: a small named product (three node counts × three pedicel
lengths × two angles × two florets, say) through the export gate and the census, as rows,
with `--only` for iteration. It is the first feature here for which the combination gate
is the MAIN gate rather than a footnote.

**Cost per row, estimated from measured parts.** CI today, `bloom-export-watertight`, read
off `actions_list` on Sep 17: the last seven completed runs took 169.6 (push, `main`),
221.5, 220.6, 220.8, 225.5, 231.6 and 208.5 min on 762–778 rows — about **17 s a row**,
dominated by browser and harness overhead, not triangles. `bloom-connectedness`: 104.3
(`main`), 135.4, 134.8, and 117.1 min on #243's 845 rows. A 50-head row of default heads:
two builds of ~5 s each in the page (live and export), a 952k-triangle STL of **46.5
MiB** through `STLExporter`, `analyzeStl`'s edge census on 2.9M edges, the self-intersection
census (387 ms at 19k triangles, superlinear in cross-shell pairs — untested at this
scale), the crowding raster and both coverage instruments (which assume ONE hub and would
have to run per instance or be labelled skips). Estimate **1–3 min a row** against 17 s,
i.e. twenty such rows add 40–60 min to a gate already at 220. The connectedness voxel grid
is not the problem: a 12-head raceme at ~100 × 100 × 260 mm is 12M cells at 0.6 mm against
the 448M ceiling (`tools/verify-bloom-connectedness.mjs:133`, `:170`); a 50-floret spike
at 60 × 60 × 250 mm is 4M. **Artifact size per row at 50 default heads: 46.5 MiB held in
memory per row; a 150-head row is a declared refusal** (2.86M > 1.5M) and would be
`EXPORT_REFUSED_XFAIL`'s second entry, running for minutes to refuse (#231's cost — the
handler builds before it checks the budget).

**And the CI durations are the widening rule's seventh data point in as many sessions**:
size any wait off `actions_list`, never off a figure here.

---

## Q12 — Grouping by what must be built, and sizing

| group | types | prerequisites | new controls | new assertions | sessions |
|---|---|---|---|---|---|
| **0 — instancing + the floret** | (none visible; a raceme of identical heads is the acceptance picture) | #243 merged or closed; `below: 'branch'` un-thrown; `MeshBuilder` append-with-transform; per-instance metrics hook; the smoke/census plumbing | `inflorescence` NONE/RACEMOSE; `nodeCount`, `axisLength` (= the rachis's `stemLength`), `pedicelLength`, `branchAngle`, phyllotaxis (READ from `leafAzimuths`), scale; one `Level 1` section | IN0, IN1, IN2, IN3, IN4, IN5 + the ST/LF restatements; `INFLO_SUBS`; a declared `INFLO: ALL MAX` refusal; a predeclared partition (0 moved at NONE) | **1, large** (the hook is most of it) |
| **A — axis-0** | umbel, fascicle; (head → Q4) | group 0 | `pedicelGradient` (a ramp), whorled(k) at the node | IN1 at span 0; the star-of-rods root (a J4-like overlap box per pedicel at one node) | 1 |
| **B — one rachis** | raceme (done in 0), spike (sessile root law), corymb (the level-tops solve, derived), botryoid (`terminalFlower`) | group 0; the seam owner's answer on tilt past 90 is NOT needed here | `terminalFlower`; a sessile root law (no control: pedicel 0 = embed the hub) | IN7; the sessile embed clause | 1–2 |
| **C — cymes** | monochasium (helicoid / scorpioid via side × plane), dichasium | group 0 + recursion (depth ≥ 2 by definition) + the openness ramp for the distinction to be visible | `lateralContent` recurse, cyme `side`, cyme `plane`, `depth` | IN8 (depth cap + budget); the pairing bijection (Z4b's shape) | 2 |
| **D — compound at depth 2–3** | compound umbel, panicle, thyrse (raceme of cymes), heads-in-a-corymb (needs Q4) | C's recursion; per-level generator (Q5) | `Level 2/3` sections, `depthGradient` | IN8 per level; the combination grid | 1–2 |
| **Openness** (own line, any time after 0) | the determinate / indeterminate look | a bud POSE ruled from a sheet; the tilt-past-90 ruling | `openness` + a per-node ramp through the resolver | a NODE role family through Z2's shape | 1–2 |
| **Blocked** | catkin, wisteria (axis curve + gravity angles); spadix's spathe; heads-of-heads until Q4 is ruled | an axis-curvature session (centreline, pitch law, curved root, the leaf-azimuth warning honoured) | — | — | 1 (the curve) + then B's |
| **Out of scope, confirmed** | spathe, cyathium, fig (surface self-closure: no wrapping primitive exists — the only closed surface is the hub's sphere and a leaf is a blade with cup 0.35 and roll 0 forced, `:8531`; a spathe as a rolled leaf is one override in `leafBladeState` but closure is self-contact, which is a fold by the census's own definition); grass spikelets (glume/lemma vocabulary, none of it here); cauliflory (a placement on old wood, not a shape) | | | | — |

**Where the first build session should stop:** group 0 with ONE picture — a raceme of N
identical floret heads (3–5 petals, 20 × 8 mm) on a straight 120 mm rachis, pedicels at
one angle, nodes by the leaf's own law, alternate phyllotaxis, no openness, no droop,
`inflorescence: NONE` bit-identical on the whole matrix. It is the smallest thing that
forces the three decisions that decide the rest (instancing route, panel home, floret
definition), it produces a sheet Eva can rule from, and it lands the per-instance hook
that every later group needs. Everything in the hypothesis's parameter list past that
point is a ramp, a choice, or a recursion on top of it. **Honest total to "just about
every type" minus the blocked and out-of-scope ones: 8–11 sessions**, on the project's own
sizing record (session 19's 2.7× miss; the leaf's three sessions for nine controls).

---

## The parameter-mapping table, compact

| hypothesis parameter | owner today | verdict |
|---|---|---|
| nodeCount | `leafNodeDepthsMm` (`:8398`) | reuse, raise the ceiling |
| axisLength | `stemLength` | reuse; 0 = umbel, NOT head |
| phyllotaxis | `leafAzimuths` (`:8389`) / `buildWhorlInto` (`:2847`) | reuse ONE owner; whorled(k) via the whorl primitive |
| pedicelLength | petiole rod (`:8560`) / `rodInto` (`:8961`) | new control, old rod; floor, not 0, and sessile is a root law |
| pedicelGradient | `sizeRamp` | reuse the ramp; corymb solve derived |
| branchAngle + gradient | `leafAngle`; `petalTilt + λ·layerTilt` | reuse |
| terminalFlower | the gynoecium's on-axis seat (`:9099`) | new choice, old seat |
| lateralContent | nothing; `below: 'branch'` reserved (`:9159`) | new — the orchestration |
| scaleFalloff | `layerSize` / `slot.scale` | reuse |
| maturation | nothing | new — pose + ramp (Q8) |
| axisSwelling | `headRise` / SPHERE / `hubLength` (#242) | reuse — it is the head (Q4) |
| droop | nothing; stem straight by ruling (`:7493`) | new — axis curve (Q9) |
| bracts | `buildLeafInto` at a node | reuse with a bract substate |
| cyme side / plane | mirror involutions (`:1297`), `alternate` | reuse the vocabulary; new sympodial frame |
| compound depth / gradient | `MAX_LAYERS` pattern; λ-ramps | new cap, reused ramp |

---

## Ranked questions for Eva

Lead with the two that decide the rest.

1. **Q4 — who owns the capitulum?** (a) the HEAD: a floret is a slot content of the
   CONTINUOUS head on a cap or sphere, `footRing` stays the one owner of organs on a
   receptacle (recommended); (b) the inflorescence: level 0 with axis length 0 and a
   swelling, re-deriving the sphere machinery one level up; (c) both, via a preset that
   writes `placement: CONTINUOUS`. And the corollary: is the mum "a flower with 120
   petals" or "120 florets" — one centre or 120?
2. **Q5 — where the panel puts it.** (A) a new `Inflorescence` section after Stem with a
   LAW enum (NONE / RACEMOSE / CYMOSE / …) gating generated `Level k` sections
   (recommended); (C) inside Stem as a node content (`leaf | flower | branch`). And:
   presets as a BUTTON outside the registry that writes sliders (recommended; a registry
   row cannot write other rows), never a type enum that is a value set.
3. **Q2 — the instancing route.** (A) build each head at the origin into its own
   accumulator and append under a rigid transform, scale through parameters never the
   matrix (recommended); (B) thread a frame through every builder.
4. **The floret.** Accept that a floret is a head at 3–5 petals and 20 × 8 mm (7,260–11,972
   triangles) with NU untouched — or rule a per-instance row count as a second ruled
   exception to "derive, don't expose" with the `CURL_START_MIN` coupling stated.
5. **The stop for the first build session:** group 0 plus one raceme of identical florets,
   as above, after #243 lands.
6. **Openness (Q8):** rule a bud POSE from a sheet before any maturation ramp is built; and
   whether `petalTilt` is to reach past 90° at all (the session-38 question, now
   load-bearing for the bud).
7. **Sessile means embedded:** a spike's or head's floret hub rooted IN the rachis wall by
   at least one wall thickness, a root law with no control — accept, or ask for a
   pedicel-length floor instead.
8. **Droop (Q9):** an axis-curvature session of its own (centreline, pitch law, curved
   root), scheduled before any catkin or wisteria preset; the hinge needs nothing.
9. **`ALL MAX` policy:** keep every inflorescence sub-control out of the blanket sweep and
   out of `ALL MAX` (the `STEM_SUBS` shape), and carry one declared `INFLO: ALL MAX`
   refusal row — or rule otherwise.
10. **Per-flower editing:** all flowers share the head's controls with per-node deltas
    through the resolver (recommended); per-node × per-petal groups are NOT proposed.
11. **The combination gate (Q11):** a predeclared product grid through the export gate and
    the census as this feature's main gate, sized before group 0 ships — or the
    one-at-a-time matrix alone, with its blindness stated.
12. **Cyme controls per level:** side × plane as two choices per level, or one combined
    choice of the four named forms (helicoid / scorpioid / drepanium / rhipidium).

*Measurement scripts for this doc lived in the session scratchpad and are not committed;
every figure above can be reproduced from `bloom-registry.js`'s `DEFAULTS` plus the named
sets through `buildBloomInto` in Node, as `tools/bloom-wall-thickness.mjs` does.*
