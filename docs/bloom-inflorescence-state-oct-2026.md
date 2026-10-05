# Inflorescence — where it stands, Oct 3, 2026

*A docs-only reconciliation on `main` at `bf1e4ee`/`f8fc4f2` (the bloom files are unchanged
since `bf1e4ee`, #339). Nothing is built here. Every claim about code cites a file and line
on that tree. Triangle counts come from the accumulator's own `MeshBuilder.triangleCount`,
built in Node from `bloom-registry.js`'s `DEFAULTS` plus the named set. Unless a figure says
otherwise it is **EXPORT mode on one ordinary container**. Build times are single runs on
that box. They are anecdotes and should be read only against each other.*

*The governing documents are `docs/bloom-inflorescence-discovery.md` (Eva's twelve rulings,
Sep 17, `7acccd9` / #247) and `docs/bloom-inflorescence-outcome.md` (the one build session).
This file supersedes neither. It records which ruling the tree honours and which it does not.*

**[Oct 5 docs sweep: a dated snapshot, kept as written. Since it was taken, build 2 (#353) opened
`PEDICEL_LENGTH_RANGE` to `[0, 60]` with 0 the sessile root, and build 3 (#357) to `[0, 250]`;
the `5–60 mm` and "floors at 5 mm" below describe `bf1e4ee`, not `main`.]**

---

## 0. The answer in one paragraph

**Exactly one inflorescence build session has happened.** It is #272 (`f1fbdf9`, Sep 20):
instancing plus one raceme of identical florets. No inflorescence feature has merged since.
Five later PRs changed how a raceme behaves without adding to it:

- #273: the size variance carries into every floret;
- #278: the edge bead raised the raceme's cost;
- #289: the apex row budget is decided over the whole composite plant;
- #301: stem nodes are inert under a raceme;
- #339: the TUBE is unavailable on a raceme, and a floret pins every whorl FREE.

What the bloom can draw today is **a straight rachis carrying 1–36 identical florets, crowned
by the head**, with three phyllotaxies, one pedicel length and one pedicel angle. Because the
head is always built at the top, every raceme it draws is a raceme with a terminal flower.
Botanically that is closer to a botryoid. **An indeterminate raceme, a spike, an umbel, a
corymb, every cyme, every compound type and every drooping axis are unreachable.**

Of the twelve rulings:

| status | rulings |
|---|---|
| discharged | 1, 3, 5 |
| honoured as a deferral | 6 |
| partly honoured | 2, 4, 9, 10 |
| untouched | 7, 8, 12 |
| not honoured | 11 |

**Ruling 9 was explicitly conditional on ruling 11, so it currently stands without its
condition.**

---

## 1. Where the brief was wrong, checked against source

The brief was written from project docs that cannot see the repository. Source wins, and each
disagreement below is a finding.

| # | The brief said | Source says | Where |
|---|---|---|---|
| 1 | "a build session seems to have happened" | **Exactly one.** It is #272 `f1fbdf9`. No inflorescence feature has merged since. Five later PRs changed raceme behaviour as a side effect (§0). | `git log 7acccd9..HEAD` |
| 2 | "Negative tilt … the ruling was −30..120" | **That was a bell/corolla ruling, not an inflorescence one**: Q2 of `docs/bloom-bell-corolla-discovery.md`. **Eva withdrew it herself on Sep 19.** The floor stays at 0, because the descending seam folds from −8° on six whorls (#259 §1). The registry reads `min: 0, max: 120, default: 25`, and nothing has changed it since #261. | `bloom-registry.js:2292`; `docs/bloom-tilt-range-shipped.md:3-6` |
| 3 | "`INFLO: ALL MAX` … the declared refusal row" | **The row exists and it does not refuse**, so it has no refusal entry. It read 74.3% of budget at #272. **Today it reads 95.0%** (1,425,468 of 1,500,000) after the edge bead (#278), with **74,532 triangles of headroom.** | `tools/bloom-harness.mjs:11325`; `EXPORT_REFUSED_XFAIL` at `:8394` holds `ALL MAX` only |
| 4 | "Which pairs involving an inflorescence control are in the predeclared grid" | **None.** No pair and no triple names any of the seven ids. #272 measured two candidate grids and declined them, arguing that `MIN_FEATURE_MM` is the wrong bar for a floret touching its own rachis. | `tools/bloom-combination-gate.mjs` (0 matches); outcome §7 |
| 5 | "the stem work in #292/#297/#301" | **#292 and #297 are INFILL PRs**: hole rims and the margin bead. The stem work is #296 (form discovery), #298 (taper laws, docs only), #299 (the flower's stem read against the bloom's, docs only), #301 (nodes, code) and #304 (the NU pin, which covers the leaf and the rod). **No taper and no curvature are built.** `stemStations` still returns `[0, lengthMm]`. | `bloom-geometry.js:12288` |
| 6 | "TUBE … approved Oct 1 to build into the generator" | **It is built and shipped**: #339 `bf1e4ee`, Oct 1. A raceme and a tube cannot be combined in either direction (§Q7). | `bloom-registry.js:430`; `bloom-geometry.js:15039` |
| 7 | "Per-floret phase … on my list" (as if it were an inflorescence ruling) | It comes from **organic variance**, not from the twelve rulings. The size-variance outcome measured that every floret carries the same factor set in its own frame (§8 there). The charter files the question under ruling 10's second half. The question itself is stated in §Q6 below. | `docs/bloom-organic-variance-size-outcome.md:257-275`; charter `:1813` |
| 8 | Ruling 2's "generated `Level k` sections", "RACEMOSE" | **Authored plainly, not generated.** The sections are `inflorescence` with a child `floret`, not `Level 1`. The source comment cites session 27: a generator with one instance cannot show that the levels do not drift. The enum value is **`RACEME`**, not `RACEMOSE`. | `bloom-registry.js:1043-1059`, `:3745-3749` |

---

## Q1 — What ships today

**Inflorescence-related PRs merged since `7acccd9`:**

| PR | sha | title | inflorescence content |
|---|---|---|---|
| **#272** | `f1fbdf9` | bloom: the inflorescence — instancing and one raceme | **the build session** |
| #273 | `370521f` | organic variance, build 1 of 3 — the size field | the field carries into florets, the same factor set on every floret (outcome §8) |
| #278 | `2464d50` | the petal's edge profile | the rim bead raised the cost; `INFLO: ALL MAX` went 1,114,828 → 1,425,468 |
| #289 | `4f3d31b` | petal apex — budget-capped row ramp | the apex row budget is decided once, over the whole composite plant, and nested floret builds pass through (`buildBloomInto` re-entrancy) |
| #301 | `8c1ea07` | stem nodes, shipped off | `stemNodesEligible` excludes a raceme: nodes are hidden and inert under one, decided without a ruling |
| #304 | `eab84b2` | pin the leaf, rod and sepal scan to their own row counts | stamens and the style (the rod) inside every floret now read `NU_BASE` |
| #339 | `bf1e4ee` | Bloom TUBE: ship corolla fusion | `tubeEligible` excludes a raceme, and `floretState` pins every whorl FREE (Eva's ruling) |

Docs that touch it: #302 (the state of play, `0488d2b`) and #303 (build order, `a4dc836`). #303
measured that the head is a pure function of `(state, acc)` across builds, which is what Route
A depends on. It also found that `NU` leaks within one build; #304 fixed that.

**The build session, from source.**

**Registry rows.** All seven carry `role: 'inflorescence'`. All six sub-controls take
`visibleWhen: { ref: 'inflorescencePresent' }`. Every range is imported from the geometry,
`bloom-geometry.js:14858-14884`.

| id | section | kind | range | default | gate |
|---|---|---|---|---|---|
| `inflorescence` | `inflorescence` | choice | `NONE` / `RACEME` | `NONE` | `stemPresent` (`stemLength` ≥ 1) |
| `floretNodes` | `inflorescence` | slider | 1–12, step 1 | 5 | `inflorescencePresent` |
| `floretPhyllotaxy` | `inflorescence` | choice | `alternate` / `opposite` / `whorled` | `alternate` | same |
| `pedicelLength` | `inflorescence` | slider | 5–60 mm, step 1 | 20 | same |
| `pedicelAngle` | `inflorescence` | slider | −60..90°, step 1 | 35 | same |
| `floretPetals` | `floret` | slider | 3–12, step 1 | 5 | same |
| `floretScale` | `floret` | slider | 0.20–1.00, step 0.05 | 0.60 | same |

`inflorescencePresent` is `stemLength ≥ 1 ∧ inflorescence ∈ {RACEME}` (`bloom-registry.js:348`).
`stemLength` defaults to 0, so **the whole section is invisible on the shipping default until a
stem is drawn.**

**Panel shape.** In declared order, the top-level sections run:

> Arrangement · Petal · Head · Center · Sepals · Stem (> Hub, Leaves > Serration) ·
> **Inflorescence (> Floret)** · Part thickness

Inflorescence is a top-level section after Stem, with one authored child, Floret
(`bloom-registry.js:1058-1059`).

**Laws, each either derived or exposed:**

| law | how it is set | owner |
|---|---|---|
| node placement | derived | `leafNodeDepthsMm`, with the pitch floor at two pedicel radii and the count giving way. Clamped and told. |
| phyllotaxis | exposed as a choice | `leafAzimuths` |
| pedicel radius | **derived, never a control** | the area rule read downward, `r_rachis/√N`, on the **asked** count, floored at `STEM_DIAMETER_RANGE[0]/2` and told. On the 6 mm rachis it reads 1.50 mm, the floor, from five florets up. |
| pedicel root and embed | derived | `rodWallRootMm` / `rodWallEmbedMm`, rooted at the wall's mid-thickness |
| placement | derived | `pedicelPlacement`: a rigid 3×4 matrix, Rodrigues by angle, the minimal roll about the pedicel (not a control, by stated design) |
| floret | derived | `floretState`: the head's whole state spread, then `inflorescence: NONE`, `leafLength: 0`, the petal count, the scaled length and width, `stemLength` = pedicel, `stemDiameter` = 2·pedicelR, every tube whorl FREE (`bloom-geometry.js:15035-15048`) |
| instancing | derived | one floret build, `MeshBuilder.appendTransformed` N times. O(1) in the node count. |
| top inset | derived | the top node is pushed down to clear the head. When it cannot, that is told and never refused. |

**Assertions added.** There are seven families, ID0–ID6 (`tools/bloom-harness.mjs`, from
`:7437`), with **48 assertion sites**:

| family | sites | what it asserts |
|---|---|---|
| ID0 | 2 | the registry's and the geometry's statements of presence |
| ID1 | 10 | the counts, and that the append neither drops nor doubles a block |
| ID2 | 14 | the rachis wall, the root in the wall, the crossing solid at ≥ `MIN_FEATURE_MM/2`, the area-rule radius, the pitch floor, the clamp flag |
| ID3 | 4 | the placement is rigid (orthonormal, determinant 1) |
| ID4 | 14 | the recursion is capped, there is no floret leaf, petals and size, the floret's own stem channel |
| ID5 | 2 | each floret block lands where its declared translation says |
| ID6 | 2 | each floret faces along its pedicel |

There are also changes in other families:

- **O1** counts its inward baseline per file, as `inwardOf(head) + N·inwardOf(floret)`.
- **ST9** excuses pedicel rods and reports the floret's body instead of gating it.
- **R1** in both coverage instruments now builds the florets.

**The connectedness gate itself was not changed.** It ran over the block: 23/23 rows one piece
at #272.

**The matrix.** Block 37 holds 23 `INFLO:` rows (`tools/bloom-harness.mjs:11237-11331`),
unchanged since #272. Two more rows elsewhere name a raceme as a GATED state:

- `STEM NODES: GATED — prominence 1 under a raceme`, at `:11568`;
- the TUBE's `GATED — an inflorescence`, at `:11696`.

`tools/bloom-smoke.mjs` carries 4 smoke rows from the block. `frozen/phase36` is the 860 rows at
`3ed45df`. There is **no** inflorescence entry in `SELF_INTERSECTION_XFAIL`, so every `INFLO:`
row reads 0 within-shell pairs.

---

## Q2 — The twelve rulings, one row each

| # | ruling (Sep 17) | status | proof |
|---|---|---|---|
| 1 | The head owns the capitulum: one centre, and no floret disc assembled by the inflorescence | **Discharged** | No inflorescence code builds a disc. `floretState` builds a whole bloom per floret. The mum is still `placement: CONTINUOUS` on the head (`bloom-geometry.js:15035`). |
| 2 | A new top-level `Inflorescence` section; a law enum defaulting to NONE gating generated `Level k` sections; presets as a button | **Partly honoured** | The section is top-level and after Stem, and the enum defaults to NONE (`bloom-registry.js:1058`, `:3745`). **The levels are authored, not generated**: a single `floret` child, with the reason given at `:1050-1056`. **No preset button exists**, which is correct, since ruling 5 excludes presets. |
| 3 | Route A: build at the origin, append under a rigid transform, size by parameters and never by matrix scale | **Discharged** | `buildInflorescenceInto` / `appendTransformed` (`bloom-geometry.js:15117`). ID3 asserts the rotation is rigid and det = 1. The `the-placement-carries-a-scale` mutant fires ID3. |
| 4 | The floret is a petal-count reduction, `NU` stays fixed, and there is no second exception | **Partly honoured, and partly superseded** | `floretPetals` 3–12 exists, and there is no floret row-count control. **But #289 later made `NU` per petal** (it ramps 56 → 112 for `petalTipShape` 2.30–2.70, Eva's own authored band), and **a floret inherits `petalTipShape`**. So a floret's rows follow the head's ramp, budget-capped over the whole composite plant (`bloom-geometry.js`, `buildBloomInto` re-entrancy). Ruling 4's "NU fixed" was true at NU 56 and is now true *of the floret as a separate lever* only. |
| 5 | The first session stops at instancing plus one raceme, after #243, with no presets | **Discharged** | #243 merged `eb2aaa7` (Sep 17), and #272 merged `f1fbdf9` (Sep 20). The scope matches outcome §3/§7. |
| 6 | Openness is deferred to the bell/corolla session's bud-pose sheet | **Honoured as a deferral, still open** | No maturation or bud code exists. The bud-pose sheet has not been rendered (state of play `docs/bloom-state-of-play-oct-2026.md:427`, B4 open). #339 shipped the TUBE, but neither the bud pose nor a maturation ramp. |
| 7 | Sessile means embedded: a root law with no control | **Untouched** | `PEDICEL_LENGTH_RANGE` floors at 5 mm (`bloom-geometry.js:14883`). Nothing embeds a floret hub into the rachis. |
| 8 | Droop is its own axis-curvature session, after the bell work | **Untouched** | `stemStations` returns `[0, L]` (`bloom-geometry.js:12288`). #301's node kink is a per-node axis offset with horizontal rings, not a centreline, and it is inert under a raceme. |
| 9 | Sub-controls stay out of the blanket sweep, with one declared `INFLO: ALL MAX` refusal row, **conditional on 11** | **Partly honoured; its condition is unmet** | `INFLO_SUB_IDS` keeps all six out of `SWEEPABLE` (`tools/bloom-harness.mjs:9260`, `:9294`). The choice is out by construction. The `INFLO: ALL MAX` row exists (`:11325`) **and is not a refusal**, at 95.0% of budget. **Ruling 11 is not honoured, so by its own wording ruling 9 does not stand.** |
| 10 | Shared head controls plus per-node deltas through the resolver; no per-node × per-petal groups | **Partly honoured** | Shared head controls: yes, via `floretState`'s spread. **Per-node deltas: not built.** Every floret is one identical stream. |
| 11 | **The combination gate is this feature's main gate**: a predeclared product grid, sized *before the first build ships* | **Not honoured — the code contradicts the ruling** | `tools/bloom-combination-gate.mjs` names no inflorescence control. #272 measured two candidate grids (`pedicelAngle × hubShape` and `pedicelAngle × pedicelLength`: both `single-reaches`, 11 of 16 cells under the bar). It then declined to add them, arguing that `MIN_FEATURE_MM` is the wrong bar for over-connection (outcome §7). That argument may well be right, **but it substituted a session's judgement for a ruling that made the grid a prerequisite. The disagreement was recorded in the outcome doc rather than put to Eva.** The state of play files it as B25 (open). |
| 12 | Cymes as side × plane, two choices per level | **Untouched** | No cyme code exists. |

**Contradictions to flag:**

- **Ruling 11** is not honoured, with a reason recorded but no ruling.
- **Ruling 9** is therefore unconditioned.
- **Ruling 4** is overtaken by #289's NU ramp. That is a later ruling of Eva's, so it is
  supersession, not defiance.

---

## Q3 — Three reconciliations

**(a) Negative tilt.** The registry value is `petalTilt` `min: 0, max: 120, step: 1,
default: 25` (`bloom-registry.js:2292`). The negative half is absent. **No later PR took it**:
`git log 622d4a7..HEAD -G"id: 'petalTilt'"` is empty. The −30 floor was Eva's Sep 17 ruling
on the BELL discovery, and **she withdrew it on Sep 19** (`docs/bloom-tilt-range-shipped.md:3-6`).
It is not an inflorescence ruling. `pedicelAngle` reaches −60 on its own range, so descending
florets are reachable without it.

**(b) `INFLO: ALL MAX` and the sweep.**

- **The row exists** (`tools/bloom-harness.mjs:11325`): 12 nodes, whorled, 12 petals,
  size 1.00, a 60 mm pedicel at 90°.
- **It does not refuse.** It reads 1,425,468 triangles, which is 95.0% of 1,500,000. That
  measurement was taken here and agrees with the edge-profile record in `CLAUDE.md`.
- **It has no `EXPORT_REFUSED_XFAIL` entry**, and correctly so.
- **The sub-controls are genuinely out of the blanket sweep.** `INFLO_SUBS` is derived from
  predicate drivers (`:9260`) and subtracted from `SWEEPABLE` (`:9294`). #272 measured that
  0 of 883 non-`INFLO:` rows set `inflorescence`, so `ALL MAX` is a holder by construction.
- **So ruling 9's first half is honoured, its declared refusal does not exist because nothing
  refuses, and its condition (ruling 11) is unmet.**
- **74,532 triangles of headroom** means almost any per-floret cost added later will turn
  this row into the refusal ruling 9 anticipated.

**(c) The combination gate's inflorescence coverage.**

- **Pairs involving an inflorescence control: 0. Triples: 0.**
- The gate holds **22 pairs (7 tier-1, 9 tier-2, 6 tier-3) and 5 triples, 414 cells (120 of
  them the triples'), 126 under the bar and all 126 declared**. Measured by a full local run
  of `node tools/bloom-combination-gate.mjs` on this tree, exit 0.
- The two grids #272 measured and declined:
  - `pedicelAngle × hubShape`: 4 × 2, 11 of 16 cells under the bar on the measure it built;
  - `pedicelAngle × pedicelLength`: 4 × 4.

  The measure was floret-against-rachis through `freeStemDistanceMm`. Both grids are absent.
- **What adding them needs is a new BAR.** `MIN_FEATURE_MM` is a gap bar, and a floret fused
  to its rachis is over-connection, not a gap. The gate's machinery is not the obstacle.

---

## Q4 — What build 1 can be made to look like

The common setting below is `stemLength 120, inflorescence RACEME`. Everything else is a shipped
default unless named. **The head always stands at the top.** No control removes it, so every
picture below is crowned by a terminal flower.

**Reachable:**

| type | settings | note |
|---|---|---|
| **Raceme with a terminal flower** (the shipped picture) | defaults: 5 nodes, alternate, 5-petal florets at 0.60×, 20 mm pedicels at 35° | 5 florets at depths 19.2 / 40.2 / 61.2 / 82.2 / 103.2 mm. 113,886 triangles. |
| **Botryoid** (the terminal flower the same as the laterals) | `floretPetals 8, floretScale 1.00` | The florets then match the head except for leaves. This is the closest thing to an honest named type the tree reaches. |
| **Decussate raceme** | `floretPhyllotaxy opposite` | |
| **Whorled raceme** | `floretPhyllotaxy whorled` | 3 florets a node |
| **Solitary lateral flower** | `floretNodes 1` | |
| **A raceme of nodding florets on an upright axis** | `pedicelAngle −30..−60` | The florets hang below their nodes. On a CAP head the nearest approach is 11.39 mm at −30 and 0.000 at −60 (outcome §4(iv)). |

**Reachable but ugly:**

| target | settings | why it is a stand-in |
|---|---|---|
| **"Spike"** | `pedicelLength 5` | The florets sit against the rachis at 0.000 mm approach (outcome §7 table). This is not ruling 7's embedded root, so the florets touch rather than grow from the axis. |
| **"Umbel" / fascicle** | `floretNodes 1, floretPhyllotaxy whorled, pedicelAngle 60–90` | Three rays from ONE node, but that node is pushed below the head (66.0 mm down, measured), not at the apex. The head occupies the top, and only 3 rays are reachable. |
| **"Pyramidal" raceme** | none | Scale cannot vary per node, so every floret is the same size. Not reachable even ugly. |

**Unreachable:**

| family | types |
|---|---|
| no terminal flower | indeterminate raceme |
| no sessile root law | true spike |
| no node at the apex, no pedicel gradient | true umbel, corymb |
| no recursion | every cyme (helicoid, scorpioid, drepanium, rhipidium, dichasium), compound umbel, panicle, thyrse |
| no axis curvature | catkin, wisteria, any drooping axis |
| no wrapping primitive | spadix with spathe |
| the head's by ruling 1, not an arrangement | capitulum |

**Plainly: build 1 draws one raceme of identical florets topped by the head, in three
phyllotaxies, and nothing else.** The 0.20–0.57× stretch of `floretScale` is dead travel on
the shipping head: it is told on the control and the range is not narrowed.

---

## Q5 — Measured cost at the current state

EXPORT, this container, one run each. Live counts are identical on every row.

| state | export tris | of 1,500,000 | build ms (export) |
|---|---|---|---|
| one head, the shipped default | 24,688 | 1.6% | 245 |
| the shipped inflorescence: defaults + `stemLength 120, RACEME` | 113,886 | 7.6% | 314–446 |
| the same, 12 nodes whorled (36 five-petal florets) | 653,844 | 43.6% | 1,786 |
| **`INFLO: ALL MAX`** (the matrix's corner) | **1,425,468** | **95.0%** | 2,912 |
| `INFLO: ALL MAX` × `layerCount 2` | 2,772,748 | 184.8% — **refused** | 6,236 |
| `INFLO: ALL MAX` × Voronoi infill | 6,068,348 | 404.6% — **refused** | 12,534 |
| **densest reachable found: `INFLO: ALL MAX` × `layerCount 6`** | **8,161,868** | **544.1% — refused** | ~10,000–17,000 (live builds it: 18,472) |

**Two findings follow:**

- **The shipped inflorescence default costs 4.6× the shipped head.**
- **The matrix's `INFLO: ALL MAX` is not the reachable corner.** A floret inherits
  `layerCount`, infill, sepals and the centre, so the true corner is about 5.7× the row the
  matrix calls ALL MAX.
  - The app refuses the export there. That is `EXPORT_TRI_BUDGET`, and the refusal path is real.
  - **No matrix row exercises the refusal for an inflorescence.**
  - **The live view still builds 8.16 M triangles in ~18 s on this box**: the #231 cost, one
    level up.

`petalTipShape 3.00` on top of the six-layer corner adds nothing, because #289's budget cap
holds the ramp for the whole composite.

**Export-gate time for an inflorescence row.** No gate prints a per-row time, so there is no
CI figure to quote. The only recorded timings are #272's local ones:

- `verify-bloom-connectedness --only "^INFLO: (?!ALL MAX)"`: 22 rows in 210 s;
- `INFLO: ALL MAX` alone in 77 s, at 1.11 M triangles. It is now 1.43 M.

Size any CI wait from `actions_list`, as `CLAUDE.md` requires.

---

## Q6 — The two items on the queue, framed for a ruling

### Per-floret phase

**The question.** The organic-variance size field, and the form field since build 2, rides into
every floret through `floretState`'s spread. The floret unit is built once, so **every floret
carries the identical factor pattern in its own frame**. Measured at ±50%, f 1, phase 0, its
five slots read 1.500 / 1.155 / 0.595 / 0.595 / 1.155 (size outcome §8).

Each floret's frame is the minimal rotation onto its pedicel, which the phyllotaxy sets per
node. So in WORLD terms the large petal points a different way on every floret, and that
direction is a side effect of `pedicelPlacement`'s roll rather than anything chosen. **The
question is whether that world direction should be decided, and by what.**

**The options, and what each does to the geometry:**

| | option | what it means | geometry | cost | open point |
|---|---|---|---|---|---|
| **A** | Leave it (today) | Identical in the floret frame, incidental in the world | — | O(1), nothing to build | **The variance looks the same on every floret**, which reads as a stamp |
| **B** | A derived roll about the pedicel | Choose the roll so slot 0's direction is fixed in the world (e.g. always away from the rachis, or always toward −z) | A rigid rotation, so **still O(1) builds**. ID3 is untouched. | No control, consistent with `pedicelPlacement`'s "never a control" note | The floret's pedicel is a 48-sector tube, so a roll moves its facets. That is invisible and harmless. |
| **C** | A per-floret PHASE offset | A delta per node (e.g. the shared `variancePhase` plus k × some increment), so the pattern moves *relative to the petals* | Ruling 10's second half: per-node deltas. Each distinct phase is a distinct floret build. | **O(distinct phases) ≤ N = 36**. The unit at `INFLO: ALL MAX` is ~40,000 triangles and builds in ~0.08 s here, so ~3 s more per build at the corner, and **no triangle change** | Needs the per-node delta machinery that does not exist yet |

B and C differ visibly only where the floret is not radially symmetric, which is exactly when
a field is on. **B is what "the same direction on every floret" would mean. C is what "each
floret varies differently" would mean.**

### Axis curvature

**What the Sep 17 discovery said.** One session for the centreline, a pitch law, and the
restated families. The bell discovery's Q5 enumerates every straight-axis site:

- the stem's rings and bore;
- `freeStemDistanceMm`;
- the omission mask and ST9's cylinder;
- ST2;
- the root band and tip plug as z intervals;
- the leaf root along a world azimuth at `rootZ − depth`;
- the meridian packing;
- the hub's apex fans.

**What the stem work since then changed.** Only #301 shipped code, and it lowered the cost
modestly:

- **The distance half is partly paid.** `freeStemDistanceMm` already dispatches to
  `nodedStemDistanceMm` (`bloom-geometry.js:12954-12971`). That is an exact distance to a stem
  whose ring centres move. It is a union of horizontal discs, not a swept tube, so it is
  correct only while rings stay horizontal.
- **A chord-error station placer exists** in `stemNodeStations`. Its density is
  `√(κ/8ε)` over the axis curvature, with stations on a 2⁻¹² mm grid. A curvature session can
  feed it a curvature term rather than invent a pitch law, which is #296's
  "demand on the placer" recommendation.
- **The flower's golden-angle versus 180° trap is already honoured once.** The kink turns away
  from each node's first leaf.

What #301 did **not** change:

- rings are still horizontal, so nothing builds in a local frame;
- `stemStations` is unchanged;
- the leaf root and the floret root are still at a world azimuth on a straight axis
  (`pedicelPlacement` uses `plan.rootZ − nodeDepth`, `bloom-geometry.js:15076-15078`);
- nodes are **inert under a raceme**, so the only off-axis stem machinery is switched off
  exactly where droop would be wanted.

**For the inflorescence specifically**, curvature also has to re-derive `pedicelPlacement`'s
frame (the node's tangent rather than +z) and ID2's "root inside the wall at z" clause. Those
two are new since Sep 17 and were not in the bell discovery's list.

**Revised size: still one session, slightly smaller on the distance side and slightly larger
on the inflorescence side.** Taper (#298) is still unbuilt. #296 recommended
taper → curvature → nodes, and nodes have already shipped before both. **Writing curvature now
means restating #301's node law on the curved frame. That is a real cost the Sep 17 estimate
did not carry.**

---

## Q7 — What the TUBE changes

**Today: nothing reaches the inflorescence, and they exclude each other in both directions.**

- **The head cannot be a tube on a raceme.** `tubeEligible` contains
  `{ not: { ref: 'inflorescencePresent' } }` (`bloom-registry.js:430`). The geometry states
  the same rule, and TU0 checks the two statements against each other.
- **A floret never inherits a tube.** `floretState` sets every `tubeLayerN` to `TUBE_K_MAX`,
  which is FREE (`bloom-geometry.js:15039`). The reason given is that a floret's petal count
  is its own, so a stored `k` need not divide it (`docs/bloom-corolla-fusion-discovery.md:474`).

**Which types it would unlock combined with an axis**, if the exclusions were lifted:

- **Bell-flowered racemes**: campanula, lily-of-the-valley, foxglove. These are a fused
  corolla on each pedicel.
- **Pendent bells**: these also need a negative `pedicelAngle`, which is reachable.
- **A wisteria or bluebell look**, which additionally needs droop.

None needs a new inflorescence type. **They need the tube to instance.**

**Does a tube head instance the same way as a sheet head under ruling 3?** Structurally yes:

- the tube is built inside `buildBloomInto`;
- the floret is one `buildBloomInto` call;
- `appendTransformed` is rigid.

Three things block it:

1. **The `k` snap.** `tubeSnap` takes the nearest divisor of n. A floret's `floretPetals`
   differs from the head's `petalCount`, so one stored `tubeLayer1` value means a different `k`,
   or no valid `k`, on the floret. **Ruling the floret's own tube** (a floret `k` of its own,
   or "FREE / TUBE only" on florets) is a precondition.
2. **The budget.** A tube adds to the per-petal cost. At 95.0% on `INFLO: ALL MAX`, a tube on
   every floret would very likely make that row the refusal ruling 9 anticipated. Not
   measured, because the code refuses the state.
3. **The exclusion list.** `tubeEligible` also excludes variance, infill and SPHERE. A floret
   inherits all three, so the floret's eligibility must be evaluated on the floret's own state,
   not the head's.

**Conflict with the pedicel join: none found by reading.**

- The tube is a ring on the petal whorl above the hub.
- The pedicel join is the floret's own hub-to-stem join below it, plus the rod in the rachis
  wall.
- The two do not share a surface.

The one interaction to measure, not argue, is ST9 and the floret's body: a fused bell is a
solid, so it closes the gap at negative angles. That approach is reported and not gated (§Q3c).

---

## Q8 — The next build session, scoped

### Recommendation: inflorescence build 2 is "per-node deltas, and the two laws that need them"

**In scope:**

1. **The per-node delta machinery** (ruling 10's second half):
   - the floret build memoised by its *distinct* state, so it is O(distinct) rather than O(N);
   - a per-node record;
   - `buildInflorescenceInto` looping over states rather than placements.

   Every later group needs this, including corymb, the openness ramp and per-floret phase
   option C.
2. **A pedicel-length gradient** (a ramp, derived, `layerSize`'s pattern), with **the corymb
   as a derived level-tops solve**, not a control. The pedicel is the floret's own stem, so a
   length gradient is *by construction* a per-node delta. That is why it cannot come before (1).
3. **The sessile root law** (ruling 7): at the pedicel floor the floret hub embeds into the
   rachis wall by one wall thickness. It is a root law with no control. Its clause is an ID2
   extension asserting the embed.
4. **Ruling 11 paid, or put to Eva explicitly.** Build 2 multiplies per-floret states. So
   either:
   - a combination-gate measure with an inflorescence-appropriate BAR (an approach bar for
     *unintended* fusion, or a per-floret clearance); or
   - Eva's ruling that the gate's role passes to something else.

   It should not be a third session's judgement.

**Unlocks:** spike (true, embedded), corymb, and a raceme with graded pedicels (the
"pyramidal" look). Per-floret phase option C becomes buildable as a one-row follow-on.

**Needs from the code lock:**

- **One registry PR in flight.** No other open PR touches `bloom-registry.js` or
  `bloom-geometry.js` today. The open PRs are #230, a no-op snapshot, and #111, a flower draft.
- A **frozen phase**, because the block grows.
- **`TAG_PUSH_XFAIL` in the same PR** if the session edits any workflow file.

**Does not attempt:**

- a terminal-flower choice;
- the umbel at the apex;
- cymes and recursion;
- openness and the bud pose;
- curvature or droop;
- the TUBE on florets;
- florets in the grid `.glb`;
- presets.

**It must check `INFLO: ALL MAX` first, not last.** A pedicel gradient moves no triangles, but
a scale gradient would. The row has 74,532 triangles of headroom, so the session should expect
to declare ruling 9's refusal entry and say so up front.

### After it, honestly

The sizes below follow the discovery's own record, which has missed by up to 2.7× before.

| session | content | sessions |
|---|---|---|
| **3** | Terminal flower and axis-0. A `terminalFlower` choice: head or no head, where no head means a capped rachis tip. **This is what an indeterminate raceme and an apex umbel or fascicle actually need.** Plus `whorled(k)` at one node and a ray gradient. | 1 |
| **4** | Bell/corolla prerequisites (external). The bud-pose sheet, then the openness ramp through the per-node delta machinery. | 1 (+ the bell session's sheet) |
| **5** | Axis curvature and droop (ruling 8). Restates #301's nodes, `pedicelPlacement`'s frame and ID2, and unlocks catkin and wisteria. | 1 |
| **6–7** | Cymes (ruling 12): recursion, side × plane. | 2 |
| **8–9** | Compound at depth 2–3: panicle, compound umbel, thyrse, generated `Level k` sections (ruling 2's unfinished half), a depth cap and budget arithmetic at the corner. | 1–2 |
| **any time** | The TUBE on florets: a floret `k` ruling, plus budget. | 1 (not in the 8–10 programme count) |
| **any time** | Florets in the grid `.glb` (`bloom-grid-gltf.js`). | ≤ 1 |

**Remaining in the programme after build 2: 6–8 sessions.** That is the discovery's 8–10,
less the one shipped, less build 2. It excludes the TUBE-on-florets and grid sessions.

---

## Ranked questions for Eva

1. **Ruling 11.** #272 did not add an inflorescence grid, and argued that `MIN_FEATURE_MM` is
   the wrong bar for a floret touching its own rachis. Options:
   - **(a)** accept that, and rule what bar an inflorescence pair should use instead;
   - **(b)** require the grid anyway, with 11-of-16 declared magnitudes;
   - **(c)** retire ruling 11's prerequisite status, and with it ruling 9's condition.
2. **Build 2's scope.** Per-node deltas plus pedicel gradient (corymb) plus the sessile root
   (spike), as recommended. Or terminal flower and axis-0 first, which is cheaper but leaves
   the delta machinery for later.
3. **Per-floret phase.** Option A (leave it), B (a derived world-fixed roll, O(1)) or C (a
   per-node phase delta, needs build 2).
4. **TUBE on florets.** Whether a floret may fuse at all, and if so whether it gets its own
   `k` or "FREE / TUBE" only.
5. **Leaves on a raceme.** A leaf and a floret can root at the same node. On the shipping
   raceme with three 40 mm leaves, leaf node 3 and floret node 5 both sit at 103.2 mm and
   azimuth 0. That is a matrix row (`STEM NODES: GATED`), census-clean as separate shells, so
   it is a look rather than a print defect. Should the two node laws share, or exclude, one
   another?
6. **Ruling 4 under #289.** Confirm that a floret following the head's apex ramp (budget-capped
   over the composite plant) is what was meant, or pin floret rows to `NU_BASE` as #304 did
   for the leaf.

*Measurement scripts lived in the session scratchpad. Every figure reproduces from
`DEFAULTS` plus the named set through `buildBloomInto` in Node, `new MeshBuilder({ exportMode })`.*

---

## Rulings (Eva, Oct 3, 2026 — on the six questions above, plus one she raised)

Each is a RULING. Where it departs from this doc's recommendation, the departure is named
rather than edited around. They are recorded here verbatim in substance. The "Findings
against the rulings" notes after them were checked against source in the same session. They
are hypotheses for the build session to confirm, not amendments to the rulings.

1. **Ruling 11 is accepted narrowly. The grid stays.**
   - **The intended joins are exempt by construction:** a floret against its own pedicel, and
     a pedicel against the rachis. The connectedness families (ID0–ID6) already test them,
     so no gap bar applies.
   - They are **excluded with that reason recorded, and they are NOT xfail rows.**
   - **Everything else stays in the grid at the normal bar (`MIN_FEATURE_MM`):**
     - floret against floret;
     - floret against the terminal head;
     - floret against the stem;
     - leaf against pedicel (ruling 5: adjacent, not joined).
   - **Ruling 11 is not retired, and ruling 9 keeps its condition.**
   - *Against the doc:* none of options (a)–(c) was taken as offered. This is (a) for the
     intended joins and (b) for everything else.

2. **Build 2 is the node laws, not per-node deltas.**
   - This reorders the recommendation of §Q8.
   - **Reason:** ruling 5 adds a join to prove, and that belongs with the other root-law work.
     Per-node deltas are a resolver change and get their own PR.
   - Eva referred to two follow-on prompts. **They were not included in the message that
     carried these rulings**, so this record does not restate them.

3. **Per-floret phase is derived and aimed outward from the axis.**
   - Each floret's form-variance phase is fixed relative to its own node's RADIAL direction,
     not to the world.
   - **No new control.**
   - If the code cannot express a per-node frame, that is a finding to report. It is never a
     reason to fall back to world-fixed without asking.
   - *Against the doc:* this is neither A, B nor C as written. It is B's O(1) mechanism aimed
     at a node-relative direction rather than a world-fixed one.

4. **The TUBE on florets is allowed, later.**
   - Florets may be fused bells, each snapping its own slit count by the existing snap rule
     (`tubeSnap`, nearest divisor, ties down), with the built-count readout.
   - **Not build 2.** It needs budget headroom first, with `INFLO: ALL MAX` at 95.0%.
   - Recorded now so the build order carries it. **This is what foxglove and campanula need.**

5. **Leaves and florets share a node, with the leaf seated below.**
   - This is Eva's ruling, **against the recommendation.**
   - Each pedicel is subtended by a leaf below it at the same node, offset by a DERIVED amount.
   - **The pedicel owns the node's azimuth.**
   - **Two consequences, both binding:**
     - **(a)** the leaf-to-rachis and pedicel-to-rachis roots at one node are a NEW JOIN. It
       must be proved, with its own assertion family.
     - **(b)** leaf-against-pedicel clearance stays in the combination grid at the normal bar,
       because the two parts are adjacent rather than joined.
   - The existing **leaf-against-stem 0.000 mm at 85°** reading
     (`docs/bloom-leaves-outcome.md`) is the warning.

6. **Ruling 4 stands: florets inherit the apex row ramp.**
   - The ramp exists so the apex geometry resolves, not for decoration.
   - Pinning risks reintroducing folds at the nib.
   - **Petal count stays the only cost lever**, which is what ruling 4 said originally.
   - *Against the doc:* §Q2's "partly superseded" reading of ruling 4 is withdrawn. #289's
     ramp is consistent with ruling 4, not an exception to it.

7. **Raised by Eva from this doc's findings, not asked: the 544% corner gets declared.**
   - **The gap:** the reachable 8.16 M-triangle state (`INFLO: ALL MAX` × `layerCount 6`,
     florets inheriting layers and infill) has no matrix row. Nothing tests that the app's
     export refusal fires there.
   - **Build 2 adds a row that asserts the refusal, or states why it cannot.**
   - **A refusal that nothing witnesses is not a safeguard.**

### Findings against the rulings, checked against source

**Ruling 1.** The grid has no measure for most of the ruled parts.

- `tools/bloom-combination-gate.mjs` has three measures: `self` (24 uses), `self-every` (1)
  and `leaf-stem` (2).
- **floret–floret, floret–head and leaf–pedicel need new measures.**
- floret–stem can reuse `leaf-stem`'s owner, `freeStemDistanceMm`, which #272's own
  report already calls.
- **The exclusions need a declared mechanism.** Neither `COMBINATION_XFAIL` nor
  `COMBINATION_INERT` means "a join, excluded by construction". A third declaration, or a
  per-measure exclusion of the joined parts' own blocks (ST9's "name the rod" remedy), has to
  be designed and given a must-fail.

**Ruling 3 is expressible.**

- `pedicelPlacement` already forms each node's radial direction,
  `R = [cos az, sin az, 0]` (`bloom-geometry.js:15080`).
- Its roll about the pedicel is the minimal rotation, so a derived roll aiming the floret's
  phase origin at `R` is a rigid change and keeps the build O(1).

Two questions the build session must answer, not assume:

- **(i) The phase is shared.** `variancePhase` (`bloom-registry.js:3008`) drives BOTH the size
  field and the form field. Fixing "the form-variance phase" per floret therefore moves the
  size field with it. The ruling names form; whether size follows is unruled.
- **(ii) A roll moves more than the field.** It rotates the whole floret, petals included, not
  the field relative to the petals. These agree only while the floret is otherwise rotationally
  symmetric. A per-floret phase that moves the field RELATIVE to the petals needs the per-node
  delta machinery that ruling 2 defers.

**Ruling 5: two node laws, one node.**

- **Two counts exist today.** `leafNodes` (`bloom-registry.js:3641`) and `floretNodes` are
  independent counts on independent pitch floors. On the shipping raceme with three leaves they
  coincide only by accident, at 103.2 mm.
- **One count must own the node** under the ruling. Whether `leafNodes` is hidden under a
  raceme, or retired into `floretNodes`, is a registry decision with a partition.
- **The node count is ruled, the depths are not.** The leaf's derived offset below the pedicel
  must clear the pitch floor of both rods.

**Ruling 7: the witness exists, but the cost is the risk.**

- **What already exists.** `exportRefusalAssertion` (XR1/XR2) is the existing witness, so a
  declared refusal is one `EXPORT_REFUSED_XFAIL` entry plus a matrix row. The ruling is
  expressible.
- **The cost.** The state builds 8,161,868 triangles in 18.5 s LIVE on this box (§Q5), and
  the page builds it twice: live, then export on the click. Compare the existing `ALL MAX`
  refusal, which builds 3,090,816 triangles. `CLAUDE.md` records that row taking 47.7 s and
  timing out the harness's 30 s settle locally.
- **The likely "why it cannot".** A row at 2.6× that count may not settle inside the
  harness's own timeout on a CI runner. The build session should measure that before
  committing the row, and if it fails, state it as the reason, as the ruling allows.

### Q12 restated under these rulings

The build order for the inflorescence programme, revised:

| order | session | content |
|---|---|---|
| **2** | **node laws** | the sessile root law (ruling 7 of Sep 17); the leaf-below-pedicel shared node and its new join family (ruling 5); per-floret phase aimed outward (ruling 3); the combination grid rebuilt per ruling 1 with its join exclusions; the 544% refusal row (ruling 7) |
| 3 | per-node deltas | the resolver change; the pedicel-length gradient and the derived corymb ride on it |
| 4 | terminal flower and axis-0 | indeterminate raceme, apex umbel / fascicle |
| — | TUBE on florets | ruling 4 of this list; after budget headroom exists |
| — | openness, droop, cymes, compound | as in §Q8, unchanged |

---

## Rulings, as restated by Eva (Oct 3, second message). These SUPERSEDE the section above.

Eva restated all seven rulings when she closed this round, and the restatement **governs**.
Where it differs from the "Rulings (Eva, Oct 3, 2026)" section above, this one wins and the
difference is named. The difference that matters is **ruling 2: what build 2 contains.**

1. **Ruling 11 is accepted narrowly.** The intended join (floret to its own pedicel, pedicel to
   rachis) is **excluded by construction**, with that reason recorded. It is **not** declared as
   an xfail magnitude, because the connectedness families (ID0–ID6) already test it. **Every
   other pair stays in the grid at the normal bar:** floret×floret, floret×terminal head,
   floret×stem and leaf×pedicel. **Ruling 11 is not retired; ruling 9 keeps its condition.**
2. **Build 2 is the node laws:** the pedicel-length gradient, the embedded sessile root, the
   shared-node seating from ruling 5, and the grid pairs those introduce. **Per-node deltas and
   per-floret phase move to build 3.**
   - **This contradicts this doc's own recommendation** (§Q8: per-node deltas first, with the
     gradient riding on them).
   - It also corrects the section above. That section put the pedicel gradient in build 3 and
     per-floret phase in build 2; **this ruling puts the gradient in build 2 and the phase in
     build 3.**
3. **Per-floret phase is derived, fixed to each node's radial direction** (outward from the
   axis), not to the world. **No new control.** If a per-node frame cannot be expressed, that
   is reported rather than substituted with world-fixed. It is build 3's (ruling 2).
4. **The TUBE on florets is allowed in principle and built in a later session.** Each floret
   snaps its own slit count by the existing snap rule, with the built-count readout. **Not
   build 2.**
5. **Leaves and florets share a node**, with the leaf seated below the pedicel by a DERIVED
   offset and the pedicel owning the azimuth.
   - **This contradicts this doc's own recommendation** (§"Ranked questions" item 5 offered
     sharing or exclusion as open; the ruling takes sharing with the leaf below).
   - The shared node is a **new join, proved with its own assertion family.**
   - **Leaf-against-pedicel clearance stays in the combination grid at the normal bar.**
6. **Ruling 4: florets inherit the head's apex row ramp.** Petal count remains the only cost
   lever.
7. **The reachable 8.16 M-triangle corner gets a declared row** that asserts the export refusal
   fires, **in build 2, or with a stated reason it cannot.**

**One recorded consequence, from source rather than new discovery.** The pedicel is the
floret's own stem: `floretState` sets `stemLength` to the pedicel length,
`bloom-geometry.js:15035-15048`. So a pedicel-length gradient gives florets at different nodes
different STATES, and that cannot be one build appended N times. Build 2's gradient therefore
needs a build per distinct pedicel length. That is the core of what "per-node deltas" was going
to provide. The build-2 session should say how it does this without building the per-node delta
resolver that ruling 2 defers.

### What ruling 11's narrow exemption means for the grid #272 sized

Source: the two tables in `docs/bloom-inflorescence-outcome.md` §7, EXPORT, a 120 mm rachis,
read as published. No cell was re-measured. Bar: `MIN_FEATURE_MM` = 1.000 mm.

**What #272's measure was.** The nearest approach of any floret vertex **not on its own
pedicel rod** to the free rachis's solid, through `freeStemDistanceMm`.

- The intended join's rod was **already** excluded by name.
- So **every cell is a floret×STEM reading**, and floret×stem is one of the pairs ruling 1
  keeps at the normal bar.

**The 16 cells: `pedicelAngle` {35, −60, 60, 90} × `pedicelLength` {20, 5, 40, 60}, CAP head.**

| | excluded by construction | stay | under the bar (stay) |
|---|---|---|---|
| **16** | **0** | **16** | **9** |

The 9 under the bar:

- 35° × 5 mm (0.000);
- −60° × 20 and × 5 (0.000, 0.000);
- 60° × 20 and × 5 (0.000, 0.000);
- 90° at all four lengths (0.000 each).

**The companion grid, `pedicelAngle` × `hubShape` {CAP, SPHERE}, is 8 cells, not 16:**

| | excluded | stay | under the bar |
|---|---|---|---|
| **8** | **0** | **8** | **7** |

The 7 under the bar:

- CAP at −60 / 60 / 90 (0.000);
- SPHERE at 35° (0.823) and at −60 / 60 / 90 (0.000).

**The count the exemption leaves:** 24 cells across both grids, **0 excluded, 24 stay, 16 under
the bar.** The exemption moves no cell, because #272's measure had already applied it.

**The correction this forces.** Outcome §7 says "11 of 16 cells are under the bar on each", and
this doc's §Q2 row 11 and §Q3(c) repeated it. **Its own tables give 9 of 16 and 7 of 8.** The
"11 of 16" figure is withdrawn here. The earlier lines stand as written, so the correction is
legible.

**What remains open for build 2: attribution by part.**

- **The 0.000 cells at 5 mm and at 90°** may be the floret's own hub-to-stem join thickening
  touching the rachis. That would be part of the intended join, which ruling 1 excludes.
- **Or** they may be petals reaching the rachis, which stay at the bar.
- The published tables cannot say which, so **the build-2 session must attribute those cells by
  part before declaring any of them.**
