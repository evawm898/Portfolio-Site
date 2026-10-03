# The stem — where it stands, Oct 3, 2026

*A docs-only reconciliation on `main` at `754e3aa`. Nothing is built here. The bloom files
(`bloom-geometry.js`, `bloom-registry.js`, `bloom.js`) are unchanged since `bf1e4ee` (#339).
Every claim about code cites a file and line on that tree. Measurements are built in Node from
`bloom-registry.js`'s `DEFAULTS` plus the named set, through the shipped `buildBloomInto`, in
**EXPORT mode** unless a figure says otherwise. Matrix and frozen-row counts come from the
harness's own `buildMatrix()` and `FROZEN_MATRICES`.*

*Governing documents, which this file supersedes in no part: `docs/bloom-stem-form-discovery.md`
(#296), `docs/bloom-stem-taper-laws.md` (#298), `docs/bloom-flower-stem-comparison.md` (#299),
`docs/bloom-stem-nodes-outcome.md` (#301), and the charter's "The stem's nodes" entry
(`docs/bloom-charter.md:6328`).*

---

## 0. The answer in one paragraph

**One stem build has landed since the stem-look work began: #301 (`8c1ea07`, Sep 28), node
prominence.** Everything else in late September was discovery (#296, #298, #299, all docs only)
or a side fix (#304, the `NU` pin). Of the seven rulings in the brief, **two are discharged in
code (3, 4), two hold only vacuously because the thing they govern was never built (1, 2), and
three are untouched (5, 6, 7). Rulings 5, 6 and 7 are not recorded anywhere in this repository**
— not in a doc, not in the charter, not in a comment — and on ruling 6 the code does the
opposite (nodes require leaves). That is why the viewer shows a plain cylinder with a flat end:
at the defaults a stem has `stemNodeProminence` 0, and with no leaves the node control is not
even shown; and there is no end cut at all. No taper, no curvature and no cut exist in code.

---

## 1. Where the brief and source disagree

| # | The brief said | Source says | Where |
|---|---|---|---|
| 1 | Stem PRs are "#292/#297/#301" or "#296/#298/#299/#301" | **The second list is right; #292 and #297 are INFILL PRs** (hole rims; the margin bead). The full late-September stem list is #296, #298, #299, #301, plus #304 for the `NU` pin. #348/#350's inflorescence doc already made this correction (`docs/bloom-inflorescence-state-oct-2026.md:60`). | `git log`, §Q1 |
| 2 | "One PR merged" | **Four stem PRs merged in that window**, but three were docs only. **One merged with code**: #301. | §Q1 |
| 3 | Ruling 6: nodes are decoupled from leaves | **The code couples them.** `stemNodesAbsent` returns true whenever `leafIsAbsent(state)` (`bloom-geometry.js:12377-12379`); the registry twin requires `leafPresent` (`bloom-registry.js:407`). #301 recorded this as "decided without a ruling" (`docs/bloom-stem-nodes-outcome.md` §4.1; charter `:6335`). **The ruling that overturns it is not recorded in the repo.** | §Q2, §Q3 |
| 4 | Ruling 7: a 45° florist's cut, then ruled the shipped default | **No cut exists, and the ruling is not recorded anywhere in the repo.** Both stem ends are horizontal rim-fan faces (`endFace`, `bloom-geometry.js:13315`). | §Q3 |
| 5 | Ruling 5: the wall rule is measured horizontally, declared in the constant's comment | **Not declared.** `STEM_MIN_WALL_MM`'s comment (`bloom-geometry.js:12105-12125`) says nothing about direction. The read-out still prints "1.5 mm horizontally — reported, Eva's to rule" (`bloom.js:1761-1762`). | §Q2 |
| 6 | "every saved design with a stem" moves under a default cut | **The bloom has no saved-design format.** `bloom.js` holds no `localStorage`, hash state, or design import/export; only the flower (`flower-presets.js`, `migrateDesign`) and `/plot` do. What a default cut moves is **matrix rows and frozen tags**. | §Q3 |
| 7 | "SLENDER-BLOOM-3 (3 mm, L/D 33)" | **That label does not exist in the repo.** It is read here as `stemDiameter` 3 at L/D ≈ 33, i.e. `stemLength` 100 (L/D 33.3) or 99 (exactly 33). The nearest matrix row is block 41's `STEM NODES: 0.48 on Eva's approved 3 mm stem` (`tools/bloom-harness.mjs:11557`). | §Q4 |
| 8 | (#299 §3) "a curl on the pedicel has an owner in `rodInto`" | **The pedicel is not a rod.** `floretState` sets the floret's `stemLength` and `stemDiameter` (`bloom-geometry.js:15035-15048`), so the pedicel is built by `buildStemInto`. `rodInto` (`:14207`) serves only the stamens and the style. A curved pedicel is **stem curvature**, not a rod curl. | §Q5c |
| 9 | (registry comment) "NODE COUNT IS ITS OWN CONTROL, so a stem can carry nodes with no leaves" | **Stale since it was written.** `leafNodes` is gated on `leafPresent` (`bloom-registry.js:3647`), so a leafless stem has no visible node count. The comment dates from #240 (`3f664be`). | §Q3 |

---

## Q1 — What shipped

### Every stem PR, by number

| PR | sha | date | title | code? |
|---|---|---|---|---|
| #225 | `4c5423b` | 09-13 | Bloom session 43: the stem on the hub, and the hub-to-stem join derived from it | yes |
| #235 | `41d7a87` | 09-14 | the sphere's stem, the petals it would pass through, and the solid root band | yes |
| #238 | `1fd0af5` | 09-14 | the stem's tip plug — the bore is an interval, closed at both ends | yes |
| #240 | `3f664be` | 09-15 | Leaves on the bloom's stem — the petiole roots in the wall | yes |
| #242 | `f64f3bc` | 09-17 | the hub's shape — GOBLET / ANGLED / CURVED, and #236 closed | yes |
| **#296** | `2a6ce59` | 09-27 | stem form discovery (taper, nodes, cross-section, curvature order) | **docs only** |
| **#298** | `38a4893` | 09-28 | Bloom stem: taper laws discovery | **docs only** |
| **#299** | `21ddbbd` | 09-28 | Bloom stem: the flower's stem read from source, against the bloom's | **docs only** |
| **#301** | `8c1ea07` | 09-28 | Bloom stem: the flower's node swelling and kink as one control, shipped off | **yes — the only stem code since Sep 17** |
| #304 | `eab84b2` | 09-29 | pin the leaf, rod and sepal scan to their own row counts | side fix (leaf blade, rods) |

The four in bold are the "four sessions in late September". Nothing touching the stem's geometry
has merged since #301; the later geometry commits (#304, form variance, #339 TUBE) do not reach
`stemPlan` or `buildStemInto`.

### The registry rows, from source

| id | section | kind | range | default | gate (`visibleWhen`) | line |
|---|---|---|---|---|---|---|
| `stemLength` | `stem` | slider | 0–120 mm, step 1 (`STEM_LENGTH_RANGE`) | **0** (no stem) | never gated (`{ all: [] }`) | `bloom-registry.js:3533` |
| `stemDiameter` | `stem` | slider | 3–12 mm, step 0.5 (`STEM_DIAMETER_RANGE`) | 6 | `stemPresent` | `:3550` |
| `stemNodeProminence` | `stem` | slider | 0–1, step 0.01 (`STEM_NODE_PROMINENCE_RANGE`) | **0** | `stemNodesEligible` = `leafPresent ∧ ¬inflorescencePresent` | `:3565`, predicate `:407` |
| `hubStyle` | `hub` | choice | GOBLET / ANGLED / CURVED | GOBLET | `stemPresent` | `:3582` |
| `hubShapeAmount` | `hub` | slider | 0–2, step 0.05 | 1 | `stemPresent` | `:3591` |
| `hubLength` | `hub` | slider | 0–40 mm, step 0.5 (0 = auto) | 0 | `stemPresent` | `:3600` |

Ranges are imported from the geometry (`bloom-geometry.js:12125-12127`, `:12246-12248`,
`:12343`). The leaves (`leafLength`, `leafWidth`, `leafAngle`, `leafNodes`, `leafPhyllotaxy`,
`leafTipShape`, and the four serration rows, `bloom-registry.js:3615-3724`) sit in the stem's
sub-tree, but they are leaf controls.

**Panel shape:** `Stem` (`stemLength`, `stemDiameter`, `stemNodeProminence`) › `Hub` (three) ·
`Leaves` (six) › `Serration` (four) (`bloom-registry.js:1031-1042`). `stemNodeProminence` is
**not visible** on a stem without leaves.

### Every law, derived or exposed

| law | derived / exposed | owner |
|---|---|---|
| length, diameter at the flower | exposed | `stemLength`, `stemDiameter`; `outerR = stemDiameter / 2` (`bloom-geometry.js:12568`) |
| bore | **derived**, Eva's rule `max(0, r − 1.5)` | `stemBoreRadius` (`:12128`) |
| hub-to-stem join thickness and blend | derived (section modulus) | `stemJoinThickness`, `hubJoinThicknessAt`; shape exposed via the three hub controls |
| solid root band (head inside the bore) | derived | `stemPlan`, `headInsideBore` / `solidBandMm` |
| tip plug | derived: `STEM_MIN_WALL_MM` long wherever there is a bore | `:12821` |
| end faces | **fixed: horizontal, rim fans** | `endFace` (`:13315`), called at `:13397` |
| station ladder | derived: `[0, L]` straight; equal-chord-error placer when noded | `stemStations` (`:12288`), `stemNodeStations` (`:12502`) |
| node depths | derived: **the leaves' nodes** | `leafNodeLayout` (`:12396`) |
| node swelling + kink | **one exposed control**, the law's constants are the flower's | `stemNodeLaw` (`:12424`) |
| kink direction | derived: away from each node's first leaf | `stemNodeLaw`, `leafAzimuths(...)[0] + π` |
| wall square to the leaning axis | **reported only** (`nodeWallPerpMm`) | `stemPlan` (`:12854-12882`) |
| taper | **does not exist** | — |
| curvature (beyond the node kink) | **does not exist** | — |
| end cut | **does not exist** | — |

---

## Q2 — Ruling by ruling

| # | ruling | status | proof |
|---|---|---|---|
| 1 | `stemDiameter` is the diameter AT THE FLOWER; the stem widens toward its free end | **Partly honoured.** The naming half holds: `outerR = stemDiameter / 2` is the radius where the stem leaves the hub and the join, the root band and the meridian packing read it. **The widening half is not built**, because no taper exists. The ruling's text is recorded in `docs/bloom-stem-taper-laws.md:12-17`. | `bloom-geometry.js:12568`; `stemStations` `:12288` returns `[0, L]` |
| 2 | Taper ships OFF — ratio 1.0, byte-identical, opt-in | **Holds vacuously.** There is no taper control to be off. Recorded at `docs/bloom-stem-taper-laws.md:16-17`. No law was ever chosen: #298 asked "which law", #299 then recommended taper "afterwards, if at all", and nothing was built. | no `taper` id in `bloom-registry.js`; `bloom-geometry.js:12288` |
| 3 | The flower's taper is NOT adopted | **Discharged.** `stemNodeRadiusMm` is `outerR · (1 + swell·Σ…)` with no length term, and the straight stem is a cylinder. Recorded in `docs/bloom-stem-nodes-outcome.md:11`. | `bloom-geometry.js:12448-12452`; `8c1ea07` |
| 4 | The kink and the swelling are ONE control | **Discharged.** `stemNodeProminence` drives both `swell` (0.6·prom) and `slope` (0.13·prom). | `bloom-registry.js:3565`; `bloom-geometry.js:12424-12446`; `8c1ea07` |
| 5 | The 1.5 mm wall is measured HORIZONTALLY, declared in the constant's own comment | **Untouched, and not recorded.** The comment does not say "horizontal". The read-out still calls it "Eva's to rule" (`bloom.js:1762`), and the state of play lists it open as A17. Geometry already measures it horizontally, so **discharging it is a comment and a read-out string, 0 bytes**. | `bloom-geometry.js:12105-12125`; `bloom.js:1761-1762`; `docs/bloom-state-of-play-oct-2026.md:403` |
| 6 | Nodes are DECOUPLED from leaves; a bare stem carries nodes | **Untouched, and contradicted.** Nodes are leaf-gated in both statements. | `bloom-geometry.js:12377-12379`; `bloom-registry.js:407` |
| 7 | A full 45° florist's cut on the stem end, the object not standing accepted; the cut IS the shipped default | **Untouched, and not recorded.** | no cut code; `endFace` `:13315` |

**Rulings 5, 6 and 7 must be recorded on `main` before they are built.** Otherwise the build
session is the first place they are written down, which is exactly how this confusion arose.
This document records them as rulings stated in the brief, dated Oct 3.

---

## Q3 — The two unbuilt rulings, costed

### Ruling 6 — nodes on a bare stem

**It does not exist.** With `leafLength` 0 and `stemNodeProminence` 1, the node control is
hidden and inert. The gating expression is:

```js
// bloom-geometry.js:12377
export function stemNodesAbsent(state) {
  return !Number(state.stemNodeProminence) || stemIsAbsent(state) || leafIsAbsent(state) || !inflorescenceIsAbsent(state);
}
// bloom-registry.js:407
stemNodesEligible: { all: [{ ref: 'leafPresent' }, { not: { ref: 'inflorescencePresent' } }] },
```

Measured: `100 × 6 mm, no leaves, prominence 1` builds 26,796 tris, 2 stations, `nodeLaw`
null. That is identical to a stem with no prominence at all.

**What ungating costs.** Dropping `leafIsAbsent` from one expression and `leafPresent` from
the other is two terms. **That alone is not the build**, for four reasons:

- **There is no visible node count on a bare stem.** Node depths come from `leafNodeLayout`,
  which reads `leafNodes` and `leafPhyllotaxy`. Both are hidden without leaves
  (`bloom-registry.js:3647`, `:3648`). A bare stem would carry the hidden default, 3 nodes,
  alternate, which no control on screen reaches. So the node count, and with it the kink
  direction, must surface under Stem. Either `leafNodes` / `leafPhyllotaxy` move up and gate
  on `stemPresent`, or a stem-own node count is added.
  - Moving them keeps one owner of node depths, which is #301's reason for the coupling.
  - With no leaves, the inset term `leafLength · sin(leafAngle)` is 0, so the nodes sit at
    `LEAF_NODE_TOP · L`. That is the flower's own 0.16, and on a 100 mm stem it puts them at
    16 / 51 / 86 mm, exactly the flower's.
- **Florets would grow nodes.** `floretState` pins `leafLength: 0` and `inflorescence:
  'NONE'` (`bloom-geometry.js:15040-15041`). Today that is what keeps nodes off every
  pedicel, as a side effect of the leaf gate. Once ungated, a floret inherits the head's
  `stemNodeProminence` and every pedicel kinks. **`floretState` must pin
  `stemNodeProminence: 0`**, or Eva rules that pedicels get nodes.
- **The gate's reference reads the leaf.** `restatedStemNodes` returns null without a leaf
  record and takes its depths and azimuths from `leaf.nodeDepthsMm` / `leaf.azimuths`
  (`tools/bloom-harness.mjs:5835-5843`). A leafless arm needs a reference from another owner:
  the controls restated through the node-layout law, never `stemNodeLaw` (the fourth durable
  rule).
  - ST12(b)'s message names leaves (`:5940`).
  - `bloom.js`'s `stemNodesLine` says "NODES n at the leaves" (`:1757`).
  - The verify tool's baseline `verify-bloom-stem-nodes.mjs:50` and the apex mutant rows are
    built with leaves.
- **The GATED row stops being gated.** `STEM NODES: GATED — prominence 1 with no leaves`
  (`tools/bloom-harness.mjs:11567`) becomes a mover, and its label becomes false. A
  replacement GATED row (prominence 1 under a raceme already exists at `:11568`) and new rows
  for leafless nodes change the row set.

**Byte partition, measured over the matrix:**

- **live:** 1 of 1,047 rows moves, the GATED row above. 61 live rows carry a stem with no
  leaves and no raceme; every other one is at prominence 0 and holds by branch.
- **frozen:** the same row, in `phase46`–`phase49`, 4 rows across 48 registered phases. Those
  four tags' bytes stop reproducing on one row each.
- **`ALL MAX` holds.** `stemNodeProminence` stays in `STEM_SUBS` because its predicate still
  reads `stemLength`, so the blanket sweep never hands it a value.

**A frozen phase IS owed**, because the row set changes (relabel plus new rows). The phase is
pre-declared in `TAG_PUSH_XFAIL` only if the PR edits a workflow file.

**Size: half a session.** The predicate, the panel move, the floret pin, the leafless
reference, about four new rows, the partition, the phase.

### Ruling 7 — the 45° florist's cut

**It does not exist.** Both ends are horizontal faces built by `endFace`. The bottom face is
the tip plug's solid disc on a hollow stem, or a rim-fan cap on a solid one.

**The construction it needs.** Keep the 48 sectors. Instead of ending every generator at one
z, end each on the cut plane, so the last band's lower ring becomes a tilted ellipse. The
outer wall's triangle count is unchanged. What changes is the end face, which `endFace`
builds as horizontal.

At 45° the cut spans an axial length of **D** (3–12 mm), measured from the long point to the
short point. The face is an ellipse with semi-axes R and R√2.

**Decision owed:** does `stemLength` measure to the long point or to the short one?

**(a) The 1.00 mm floor.** A flat end has no thin feature. A 45° cut on a solid stem ends at
the long point in a **wedge** whose thickness at distance d from the edge is d·tan 45° = d.
So the **last 1.00 mm of the point is thinner than `MIN_FEATURE_MM`**.

- **Options:** truncate the point to a small flat, the apex nib's mini-face precedent, e.g. a
  1.00 mm land; or accept the sliver as an authored exception, as the 0.40 mm nib face was.
- **The truncation must be the same in both modes.** Whether the point exists is topology,
  and the export floor may not decide it (session 32's rule). So the floor here is
  `MIN_FEATURE_MM`, a constant, never `floorThickness`.
- Print preview changes nothing else on the stem. Every stem dimension is already ≥ 3 mm.

**(b) The bore.** A 45° plane through a hollow stem cuts the bore in an ellipse 2b × 2b√2
(e.g. 3 × 4.24 mm on the 6 mm stem). That collides with the tip-plug ruling (#238: the
bottom "looks solid").

To keep it closed, the void must stop at least `STEM_MIN_WALL_MM` short of the plane over the
whole bore disc. Measured perpendicular to the plane, the void's bottom must sit at least
`R − b − 1.5·√2` above the short point, i.e. **0.62 mm above the short point at every hollow
diameter** (R − b is 1.5 by Eva's rule). So the solid end runs from the long point to
D + 0.62 mm:

| `stemDiameter` | 6 mm | 12 mm |
|---|---|---|
| solid end, from the long point | 6.62 mm | 12.62 mm |
| tip plug today | 1.5 mm | 1.5 mm |

This is a derived length. It is not a new constant.

Eva's choices:

- **plug past the cut** (the end looks solid, per #238);
- **open ellipse** (overturns #238 on cut stems);
- measuring the 1.5 horizontally or perpendicular to the face: ruling 5 says horizontally,
  and on a 45° face the perpendicular wall over the bore is thinner by cos 45°.

**(c) As the default, it moves bytes on every row with a stem.**

- **live:** 114 of 1,047 rows.
- **frozen:** 1,666 of 30,296 rows across 22 of 48 phases, so 22 tags' bytes stop
  reproducing.
- **not "saved designs":** the bloom has none (§1 row 6).
- **the shipping default holds:** `stemLength` 0 builds no stem.
- **24 raceme rows need a decision:** `floretState` spreads the head's state, so the cut
  reaches every pedicel unless pinned. A pedicel's free end is the end rooted through the
  rachis wall, so a cut there changes the root embed that ID2 asserts. **Pin it off on
  florets.**

**What it breaks in the gates:**

- **ST10** reads the bottom face's area in closed form (`πR²`). It becomes the ellipse's
  `πR²√2`, or the plug's.
- **ST1** predicts the triangle count from the plan.
- **ST2** asserts the length, and the long or short point must be declared.
- **ST3** asserts the narrowest vertex.
- **ST9** locates the stem by its rings at exactly `outerR` on three z-levels. The tip ring is
  no longer at one z.
- **The byte tool's bottom-face clause (#238) defines the face as "the triangles all at one
  height", and a 45° face is at no one height.** That is the fifth durable rule's exact
  shape: the clause would define its subject to exclude the cut face. It must be re-derived,
  not loosened.
- **The noded arm:** the plane is taken against the local axis, which leans up to 6.0°.
- **New family:** the cut's plane, angle and land, restated from the controls, with a
  must-fail per arm.

**Triangles:** about +0 on the walls. The ellipse cap is 48 sectors, about what the disc cap
costs today, plus whatever the plug's extra void ring needs.

**Size: one session.**

---

## Q4 — What the stem looks like today, measured

EXPORT unless marked. Every row has three alternate 40 mm leaves at the leaf defaults, because
without leaves the node control does nothing (Q3).

| | shipped default | 100 × 6, prom 0 | **100 × 6, prom 0.48** | 100 × 3 (L/D 33.3), prom 0 | **100 × 3, prom 0.48** | 99 × 3 (L/D 33), prom 0.48 |
|---|---|---|---|---|---|---|
| stem built | **none** (`stemLength` 0) | cylinder, flat end | noded | solid cylinder | noded, solid | noded, solid |
| node count | — | 0 (law null) | 3 at 22.94 / 54.47 / 86.00 mm | 0 | 3 at 22.94 / 54.47 / 86.00 | 3 at 22.94 / 54.04 / 85.14 |
| swelling, % of radius | — | 0 | **+28.80%** (emitted peak, every node) | 0 | **+28.80%** | +28.80% |
| spindle (Gaussian half-width) | — | — | 9.821 mm = **3.2738 R** | — | 4.911 mm = **3.2738 R** | same |
| kink a node | — | — | **3.571°** | — | **3.571°** | 3.571° |
| bend peak below its node | — | — | 8.036 mm = **0.8182 of the spindle** | — | 4.018 mm = **0.8182** | same |
| tip off straight | — | 0 | **2.599 mm** | 0 | **2.841 mm** | 2.805 mm |
| worst lean | — | 0 | 6.011° | 0 | 6.011° | 6.011° |
| stem stations | — | 2 | 49 | 2 | 61 | 61 |
| whole bloom, tris | 24,688 | 34,440 | 43,368 | 34,248 | 39,912 | 39,912 |

**Against the flower** (+28.8% at 0.48, spindle ≈3.3 stem radii, ≈3.6° a node, tip ≈3.3 mm
off over 100 mm, bend peak 0.818 of the spindle below its node):

| quantity | does the bloom match? | why |
|---|---|---|
| swelling +28.8% | **exactly** | same law |
| ≈3.6° a node | **exactly** (3.571°) | same law |
| bend peak 0.818 | **exactly** (0.8182) | same law |
| spindle ≈3.3 radii | **exactly** (3.2738) | **law difference.** The bloom ports the spindle as a ratio of the stem radius; the flower holds it at 0.055 of the length. Equal at the flower's own 3.36 mm top. At 6 mm the bloom's spindle is 9.8 mm against the flower's 5.5 mm on a 100 mm stem, so a 6 mm bloom stem's nodes are about twice as long. At 3 mm they are 4.9 mm, nearly the flower's. |
| tip ≈3.3 mm | **no: 2.60 (6 mm), 2.84 (3 mm)** | Three causes. |

The three causes of the tip shortfall:

- **Settings.** The bloom's nodes are the leaves'. With 40 mm leaves at 35° the top inset is
  the leaf's rise (40·sin 35° = 22.94 mm), not the flower's 16. With 25 mm leaves the nodes
  land on the flower's 16 / 51 / 86 and the tip reads 3.058 mm at 3 mm and 2.815 mm at 6 mm.
- **Law.** The ramp scales with R, not L: 21.4 mm at 6 mm, so the last node's turn runs past
  the end of a 100 mm stem.
- **Law, deliberately.** The kink turns away from each node's first leaf, not at the golden
  angle (#301 §4.3).

---

## Q5 — The three open items, framed for a ruling

### (a) The 3 mm bore question

It arises **only if a taper is built.** Today no question arises:

- **Nodes:** the bore is taken at the control radius and does not follow the swelling, so a
  3 mm noded stem stays solid (measured: `nodeWallPerpMm` null, bore 0).
- **No taper exists.**

With a widening taper and the bore following Eva's rule, the void appears where
`r(s) > 1.5` and starts at a point: a degenerate apex and a knife edge (#298 §6).

| option | what it does |
|---|---|
| **A. solidity from the flower radius** | A stem solid at the flower stays solid all the way down. One predicate, no apex. It is heavier on a widened 3 mm stem, and a 3.0 vs 3.5 mm slider step then flips the whole stem hollow or solid. |
| **B. bore follows, with a minimum void** | The void starts only where `r(s) − 1.5 ≥ b_min` (e.g. `MIN_FEATURE_MM / 2`), and the bore steps from 0 to `b_min` there. That is a discrete decision on a continuous quantity, with its own knife edge (seventh-instance class), and a visible ledge inside. |
| **C. bore constant, taken at the top** | `bore = max(0, R_top − 1.5)` all the way down, #296's "bore constant": 0 at 3 mm, so solid. It is the strongest and heaviest option (×2.59 mass at ratio 2.0 on a 5 mm top), and the wall thickens downward, which overrides "1.5 everywhere it is hollow". |
| **D. don't decide yet** | The question cannot arise until a taper ships. If taper stays off (ruling 2) and no law is picked, this can wait. |

### (b) Triangle cost

**Still the figure:** 9,404 stem triangles at 100 × 6, prominence 0.48, three leaves, EXPORT.
That is 43,368 − 34,440 + 476, reproduced to the integer. It is 5,948 at 3 mm. The flower's
1,568 is 16 sectors × 49 fixed stations, solid. The bloom pays 3× for 48 sectors and 2× for
the bore ring.

Reductions that would not re-facet the visible surface. The first two are **estimates, not
measurements**:

1. **Fewer stations on the bore.** The bore ring has constant radius. It does not follow the
   swelling, so it needs stations only where the axis bends, not across the swelling. Giving
   the void its own placer, over the axis curvature alone, should drop a large share of the 49
   bore rings. Estimate: about −25% of the stem. The bore is not visible.
2. **A looser chord tolerance, paired with the smooth-shading channel.** The placer holds the
   ring's own sagitta, `R(1 − cos π/48)`, which is strict. Doubling it cuts stations by about
   √2 (about −29%). Live faceting could be hidden by the bead's smoothed-normal channel
   (`captureNormals`); the export is unaffected by shading. Visibility needs a sheet.
3. **Recorded and rejected by #301 §8:** 16 sectors (re-facets at prominence 0.01, and the hub
   join's 48-sector seam stops meeting); the flower's fixed 49 stations (on a 3 mm stem the
   spindle gets about 2 rows, so the phasing is drawn by chance).

### (c) The side bud

**Still mostly true, with one correction.**

- **What already builds:** `RACEME` at `floretNodes` 1, `floretPetals` 5, `floretScale`
  0.42, `pedicelLength` 50. At one node the area rule gives the pedicel the rachis's own
  radius; the flower's offshoot is 0.75 of it.
- **The closed-bud pose** is still unbuilt: inflorescence ruling 6, deferred, no
  maturation or bud code (`docs/bloom-inflorescence-state-oct-2026.md:169`).
- **The curved offshoot is stem curvature, not a rod curl** (§1 row 8). The pedicel is the
  floret's own stem, so curving it means the floret's stem bending, which is the curvature
  session's work.
  - #301's axis offset is the nearest existing machinery, and it is switched off on florets
    (`leafLength: 0` pin) and under a raceme (`stemNodesEligible`).
- **One more constraint since #299:** inflorescence ruling 2 (Oct 3) puts the node laws in
  inflorescence build 2 and per-node deltas in build 3. A bud is a one-node raceme, so it
  rides on that programme rather than on the stem's.

---

## Q6 — The next build session, scoped

**Two PRs, ruling 6 first.**

**Why 6 first:**

- **Footprint.** It is small: 1 live row, 4 frozen rows, half a session. Ruling 7 moves 114
  live rows and 22 frozen tags.
- **What it fixes.** It fixes half of what Eva sees: a bare stem stops being a straight
  cylinder.
- **Clean attribution.** Mixing them would put a one-row partition inside a 114-row one,
  where its movers cannot be told apart.

**Session 1: decouple nodes, and record the rulings.**

- **Contains:**
  - **Rulings 5, 6 and 7, recorded in the charter's stem entry.**
  - **Ruling 5's comment**, plus the read-out string that stops saying "Eva's to rule". This
    is 0 bytes.
  - **Ruling 6:**
    - the two predicate terms;
    - the node count and arrangement surfaced under Stem, owner kept as `leafNodeLayout`;
    - `floretState` pins `stemNodeProminence: 0`;
    - a leafless arm for `restatedStemNodes`, whose reference comes from the controls;
    - ST12 and read-out messages that do not say "leaves";
    - the GATED row replaced, plus about three leafless rows (alternate, opposite, a short
      stem) and one smoke row;
    - mutants: the leaf gate restored, and the floret pin removed;
    - a byte partition predeclared from `stemNodesAbsent`;
    - a frozen phase.
- **Stops at:** a bare stem with nodes, at prominence 0 by default. **The default does not
  move.**
- **Does not attempt:** the cut, taper, curvature, the bore-tilt `1/cos` (ruling 5 says
  horizontal, so it is closed by ruling, not by geometry), the triangle reduction, or rachis
  nodes.

**Session 2: the 45° cut, as the default.**

- **Contains:**
  - the tilted end construction;
  - the plug derived past the cut;
  - the 1.00 mm land at the point, mode-free;
  - the length convention (long point or short point);
  - the floret pin;
  - ST1 / ST2 / ST3 / ST9 / ST10 re-derived;
  - the #238 byte-tool face clause re-derived;
  - a new cut family with must-fails;
  - the 114-row partition predeclared from `stemIsAbsent`;
  - the frozen-sweep naming of the 22 tags;
  - a contact sheet of the end at 3 / 6 / 12 mm, hollow and solid, from three angles.
- **Does not attempt:** a cut-angle control (the ruling says a full 45°, so it is a constant),
  or making the object stand.
- **If it grows:** ship the cut at a 45° constant with the plug, and leave the land as an
  authored exception, the 0.40 mm-nib precedent, if Eva prefers that to truncation.

**Neither session touches** taper (no law ruled), curvature, the cross-section, `/plot` or
`/print`.

---

## Ranked questions for Eva

1. **Ruling 7, the bore.** Should a 45° cut through a hollow stem end SOLID, with the plug
   derived to run 0.62 mm past the cut's short point (about D + 0.6 mm of solid end), or show
   the bore as an open ellipse, overturning #238 on cut stems?
2. **Ruling 7, the length.** Does `stemLength` measure to the cut's long point or to its short
   point? And at the long point, a 1.00 mm land (truncated) or a knife edge accepted as an
   authored exception?
3. **Ruling 6, the count.** On a bare stem, do the existing `leafNodes` / `leafPhyllotaxy`
   move up to Stem (one owner, recommended), or does the stem get its own node count?
4. **Florets.** Pin both nodes and the cut OFF on every pedicel (recommended), or let pedicels
   inherit them?
5. **Ruling 6 / 7 order.** Nodes first (smaller, recommended), or the cut first because the
   flat end is the more visible half?
6. **The 3 mm bore** (Q5a) can wait until a taper law is ruled. Confirm it waits.
7. **Triangle cost** (Q5b). Is a measurement session for the bore-only placer and the looser
   tolerance wanted, or is 9,404 acceptable?

---

## How this was measured

- **Builds:** in Node, from `DEFAULTS` plus the named set, through the shipped
  `buildBloomInto`, reading the stem record's own `nodeLaw`, `stations`, `nodeTipOffsetMm`
  and `nodeTiltMaxDeg`. The emitted swelling is `stemNodeRadiusMm` at each node's own depth.
  Scratch scripts sit outside the repo. Nothing was rendered, so no pixel figure is quoted.
- **Matrix counts:** the harness's own `buildMatrix()` (1,047 rows) and `FROZEN_MATRICES`
  (48 phases, 30,296 rows), with each row's set coerced over `DEFAULTS`.
  - The ruling-6 mover predicate: stem present, no leaf, no raceme, prominence ≠ 0. That is
    `stemNodesAbsent` with the leaf term removed.
  - Ruling 7's: stem present.
  - Both are predicates over the control set, not byte comparisons. A build session still
    owes the real partition.
- **The plug length** (Q3b) is closed-form geometry, not a build.
- **Not measured:** any cut geometry, the bore-placer saving, the looser-tolerance saving,
  any combination-gate cell, and anything printed. Nothing in this project has been printed.
