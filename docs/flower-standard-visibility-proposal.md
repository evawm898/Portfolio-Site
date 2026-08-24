# Standard tier — one adjustment behind every Standard choice

**Status: PROPOSAL. Nothing in this branch changes the panel.** No registry edit, no tier
change, no `visibleWhen` change, no section move. `flower-registry.js`, `flower.js` and every
gate are byte-identical to `a671fdf`. The only files added are this document, a generated
mock of the proposed panel, and the two read-only instruments that produced them.

Mock: **[`flower-standard-panel-mock.html`](./flower-standard-panel-mock.html)** — the
Standard panel at defaults and under each of the thirteen choices, generated from
`flower-registry.js` with the proposal applied in memory.

---

## The thirteen

Read the columns as: what to promote · why it is the one · the runner-up and why not · does it
already carry a gate that limits it to this choice.

**"Impact"** is a fixed-camera pixel difference at 560×560 against that choice's own default
render — the control driven to whichever end of its range moves the most pixels. Never a
bounding box: forty-eight controls here measure 0.000 mm of envelope change and forty-six of
them change the flower completely. Method and raw numbers in [Measurement](#measurement).

| # | Choice | Promote | Impact | Why it is the one | Runner-up (impact) | Why not | Already gated? |
|---|---|---|---|---|---|---|---|
| 1 | `bloomType` **FAN** | `bilPerSide` — Petals per side | 3.04% | It is the petal-count slider, asked in FAN's own terms. Standard offers "Number of petals" for SPIRAL and ROSETTE and takes it away for FAN; this gives it back. | `bilSpacing` — Petal spacing (3.63%) | Measured marginally higher, but it sets how wide the fan opens, not how much fan there is. Pixel diff under-rewards *removing* petals — `bilPerSide` at 1 deletes two thirds of the mesh (106,072 → 37,064 tris) and can only score on the pixels it vacates. | ✅ `{bloomType: bilateral}` |
| 2 | `infillType` **STRANDS** | `strandCount` — Strand count | 3.20% | How many strands there are is what a strand pattern *is*: 4 sparse ribs or 44 combed fibres. | `strandCurvature` (2.44%) | Curvature restyles strands you cannot yet count. Reach for the number first. | ✅ `{infillType: strands}` |
| 3 | `infillType` **LATTICE** | `boneWidth` — Bone width | 5.45% | The largest single impact in the whole sweep for a lace control. It moves the lattice from hairline tracery to a heavy cast grille without changing the topology. | `boneCount` (2.68%) | Half the impact and it costs mesh — 46,296 → 85,576 tris at max, against `boneWidth`'s zero. | ✅ `{infillType: bone}` |
| 4 | `infillType` **GROWTH** | `spaceDensity` — Source density | 1.63% | How much growth fills the blade. The one parameter in the group whose whole range is safe to hand a visitor. | `spaceBirth` — Birth distance (2.56%) | **Measured highest and rejected deliberately.** Birth/kill/step are the documented cliff: birth .055/kill .040 gives 7M tris, .060/.045 gives 4M, and exactly between them .0575/.0425 gives **26.8M**. A discontinuity sitting between two stable neighbours means no guard rail can exist in principle. That slider does not belong one drag away in Standard. | ✅ `{infillType: spacecol}` |
| 5 | `tipStyle` **TOOTHED** | `tipLength` — → "Amount" | 0.87% | It is already the wired branch: `EDGE_AMOUNT` in `flower.js` maps `jagged → tipLength` and relabels it "Amount". Only the tier assignment defeats it. This is issue #66's fix, unchanged. | `tipRegion` (1.10%) | Nominally highest, but the whole group spans 0.77–1.10% — indistinguishable at this resolution. Picking it would mean editing `flower.js`'s slot map for a 0.23 pp difference. | ⚠️ **No — needs `standardVisibleWhen`.** Its `visibleWhen` covers `jagged` *and* `ruffled`, and RUFFLED's Amount slot is `edgeNoise`. Without `{tipStyle: [jagged]}` in Standard, RUFFLED would show two Amount sliders. **This is the only row with extra work.** |
| 6 | `tipStyle` **SCALLOPED** | `scallopHeight` — → "Amount" | 0.46% | Same mechanism, `scallop → scallopHeight`. Issue #66's fix, unchanged. | `scallopCount` (0.49%) | A dead heat (0.03 pp). The slot map already names height; count is a second wave. | ✅ `{tipStyle: scallop}` — #66 also writes a `standardVisibleWhen`, which here is identical to the `visibleWhen` and therefore optional. |
| 7 | `centerArch` **CLASSIC** | `centerLength` — Length | 1.02% | 2.4× the next control. It is the difference between a flush eye and stamens standing proud of the petals — the silhouette of the centre, not its detail. | `centerType` (0.43%) | It is a *picker* (STAMENS / PISTIL / NONE). Promoting a select creates a new Standard choice, which under this rule then owes adjustments of its own. Promote sliders. | ✅ `{centerArch: classic}` (and `centerType ∈ stamens\|pistil`, already declared) |
| 8 | `centerArch` **DENSE CLUSTER** | `denseStamenLength` — Stamen length | 0.52% | Depth of the fuzz is what a dense cluster reads as; count changes the tone of it, length changes its shape. | `denseStamenCount` (0.35%) | Two thirds the impact, and 80 stamens already reads as "dense" — the slider mostly trades render cost for texture. | ✅ `{centerArch: dense}` |
| 9 | `centerArch` **DISC** | `discSize` — Disc size | 0.89% | How much of the bloom is eye. A daisy and a rudbeckia differ here first. | `discHeight` (0.77%) | Close, but height reads as a profile nuance from most angles; size reads from directly above, which is the default camera and the print's face. | ✅ `{centerArch: disc}` |
| 10 | `centerArch` **PETALOID FILL** | `fillOuterSize` — Outer fill size | 3.94% | Sets whether the fill is a tight boss or a second bloom inside the first. Highest impact of any centre control by 4×. | `fillInnerSize` (3.15%) | Genuinely close. It shapes the gradient *within* the fill, which only becomes legible once the outer size is right. Order matters: outer first. | ✅ `{centerArch: petaloid}` |
| 11 | `sepalsType` **SEPALS** | `sepalSize` — Sepal size **and** `sepalCount` — Sepal count | 1.01% / 1.87% | **The one row that gets two — see [Where one is not enough](#where-one-is-not-enough).** Size decides whether sepals are a green collar or long straps framing the bloom; count decides whether they read as a calyx or a whorl. Neither substitutes for the other. | `sepalStyle` (1.09%) | A picker (MODIFIED LEAF / SOLID), so promoting it propagates the obligation — see row 7. | ✅ both `{sepalsType ≠ none}` |
| 12–13c | `leafType` **COMPOUND / LOBED / OVAL / NARROW** | `leafSize` — Leaf size | 8.87–11.97% | Largest impact measured anywhere in this sweep. Leaves at 0.2× are punctuation and at 3× they outweigh the bloom. **One promotion closes all four rows** — `leafSize` is gated on `leafType ≠ none`, not on a specific leaf. | `leafPhyllotaxy` (7.73–8.90%) | Also a picker, and it costs mesh (119,434 → 197,446 tris at WHORLED) against `leafSize`'s zero at 3×. | ✅ `{stemType ≠ none} ∧ {leafType ≠ none}` |

**Thirteen choices, thirteen promoted controls, one new predicate.** Twelve of the thirteen
promotions are `tier:"standard"` and nothing else; only `tipLength` needs a
`standardVisibleWhen`, and issue #66 already specifies it verbatim.

---

## The whole-panel view

### Section splits — today → proposed

| Section | Standard today | Proposed | Δ | What lands there |
|---|---|---|---|---|
| **Form** | 7 / 62 | **8** / 62 | +1 | `bilPerSide` |
| **Lace** | 3 / 29 | **6** / 29 | +3 | `strandCount`, `boneWidth`, `spaceDensity` |
| **Edge** | 4 / 11 | **6** / 11 | +2 | `tipLength`, `scallopHeight` |
| **Base** | 4 / 62 | **11** / 62 | **+7** | `centerLength`, `denseStamenLength`, `discSize`, `fillOuterSize`, `sepalSize`, `sepalCount`, `leafSize` |
| **Make** | 2 / 3 | **2** / 3 | 0 | — |
| **Total** | **20 / 167** | **33 / 167** | **+13** | 12% → 20% of the panel |

Base grows most, as expected — it absorbs the four centre styles, sepals and leaves. It goes
from 4 controls to 11 (**+175%**) and from a fifth of the Standard roster to a third. Its
Advanced denominator is unchanged at 62, so Base moves from exposing 6% of itself to 18%.

### What a visitor actually sees at once

The roster grows by 13; the screen does not. Because every promotion is gated to its own
choice, only one of the thirteen is ever on screen at a time — plus `centerLength`, which is
visible at defaults because CLASSIC is the default centre.

| Panel | Visible today | Visible proposed |
|---|---|---|
| Defaults | 18 | 19 |
| FAN | **16** | 18 |
| STRANDS / LATTICE / GROWTH | **16** | 18 |
| TOOTHED / SCALLOPED | 18 | 20 |
| Any centre style | 18 | 19 |
| SEPALS | 18 | 21 |
| Stem + leaves | 19 | 21 |

The FAN and pattern rows are the clearest statement of the problem. **Picking FAN today
removes two controls (`petalCount`, `tightness`) and adds none. Picking STRANDS, LATTICE or
GROWTH removes two (`density`, `softness`) and adds none.** The panel gets *smaller* the
moment you make the most structural choice on it — four of the eight Standard pickers punish
you for using them.

### Where one is not enough

Only **sepals**. Sixteen controls are gated behind it and one adjustment cannot carry them,
but not for the reason the count suggests — **nine of those sixteen are the shared junction
cluster** (`bundleTightness`, `flareRate`, `absorption`, `buttonSize`, `gatherHeight`,
`blendSmoothness`, `receptacleDepth`, `convergenceTightness`, `receptProfile`), which appear
under STEM as well and are plumbing by the project's own rule: *the junction is derived, never
exposed*. None of them is a candidate. The sepal-specific set visible at defaults is seven.

Within those seven, size and count are orthogonal in a way the others are not: `sepalSize`
alone gives you one calyx at different scales; `sepalCount` alone gives you the same calyx
with more of it. Together they span the range from a five-point rose calyx to a twenty-four
strap aster involucre. That is the floor being a floor, not a quota — every other row is
genuinely served by one.

### Two promotions that are not on the thirteen

Marked separately so they can be taken or left without touching the rest.

**E1 — `stemLength` (Stem length), Base. Impact 6.18%.**
`stemType/stem` is not in the thirteen because it has one Standard control behind it:
`leafType`. But `leafType` is a **picker**, not an adjustment. Under the rule as Eva stated
it — *at least one Standard control that adjusts it* — STEM has zero adjustments and is
arguably a fourteenth row. `stemLength` is the obvious adjustment (6.18% at defaults, third
highest in the whole sweep) and it is already gated `{stemType ≠ none}`.
**This is a ruling, not an implementation detail: does a picker satisfy the rule?** If yes,
STEM is fine and E1 is optional. If no, E1 is mandatory and the thirteen are fourteen.
*(The runner-up, `stemBudMode` at 6.33%, is another picker and costs 80,428 → 133,908 tris.)*

**E2 — `petalCup` (Petal cup), Form. Impact 3.44%.**
Fails the rule for a different reason. `petalShape` is a Standard picker and, per #69, gates
nothing — so it never appears in a predicate sweep. It is a macro over thirteen silhouette
params, of which exactly **one** (`tip`) is Standard, and that one sits in Edge. So the
picker's own section offers no way to adjust what it picked. `petalCup` is the control a
stranger reaches for — cupped spoon to flat to reflexed — it is ungated (so it would show
unconditionally, which is correct here: it applies to every shape), and it costs **zero**
triangles across its full range.
*Not proposed: `layerCount`, which measured highest at defaults (3.88%) and multiplies the
mesh 5.5× — 71,036 → 387,294 tris. That is a bloat lever, not a Standard control.*

---

## Measurement

### Deriving the thirteen

The premise for this session listed thirteen zero-Standard choices. Re-derived independently
by an `evalPredicate` sweep over `flower-registry.js` against `DEFAULTS`: for each Standard
select, for each of its options, count the controls that are visible under that option and
hidden under at least one sibling option, then count how many of those carry
`tier:"standard"`.

**The premise is confirmed exactly** — all thirteen, all counts:

```
bloomType/bilateral   21 gated,  0 standard
infillType/strands     5 gated,  0 standard
infillType/bone        7 gated,  0 standard
infillType/spacecol    9 gated,  0 standard
tipStyle/jagged        4 gated,  0 standard
tipStyle/scallop       2 gated,  0 standard
centerArch/classic     6 gated,  0 standard
centerArch/dense       4 gated,  0 standard
centerArch/disc        4 gated,  0 standard
centerArch/petaloid    5 gated,  0 standard
sepalsType/sepals     16 gated,  0 standard
leafType/compound      2 gated,  0 standard
leafType/lobed         2 gated,  0 standard
leafType/oval          2 gated,  0 standard
leafType/narrow        2 gated,  0 standard
```

The section splits check out too: Form 7/62, Lace 3/29, Edge 4/11, Base 4/62, Make 2/3 —
20 of 167, where 167 counts `petalShape` (`uiOnly`, so absent from the 166 wired controls the
gates iterate).

Both masking traps reproduced as warned: `leafType`'s rows read empty unless `stemType` is set
to `stem` first, and `petalShape` drives no predicate at all.

Choices with **zero** gated controls are not gaps and are not in the thirteen — nothing to
promote: `tipStyle/clean`, `sepalsType/none`, `stemType/none`, `leafType/none`, and all three
`process` options. `tipStyle/ruffled` is the working case (`edgeNoise`, `tier:"standard"` with
`standardVisibleWhen` naming RUFFLED) and is the shape every row above copies.

### Ranking within each choice

Headless Chromium, canvas at 560×560, camera frozen (auto-rotate off, no refit between shots).
For each choice: render its default, then drive every gated control to each end of its range
(both non-default options for a select, the flipped state for a checkbox), re-render, and count
pixels whose summed RGB distance exceeds 18. Score = the control's best result, as a percentage
of canvas pixels. Every value is read back after being set; a value the UI rewrites would
measure a different design from the one it names.

Absolute percentages are small because the flower occupies a minority of a square canvas and
most of these controls touch one part of it. **Only the ranking within a choice is meaningful
— never compare across choices.**

Known limits of this instrument, stated rather than discovered later:

- **One camera.** Sepals and the junction sit largely behind the bloom from the default view,
  so every number in the sepals block is understated relative to what a visitor turning the
  model would see. Ranking within the block is still sound; the magnitudes are not.
- **Removal scores low.** A control that deletes geometry can only score on the pixels it
  vacates. This is why `bilPerSide` (−65% of the mesh) scores below `bilSpacing`.
- **Ties are ties.** The four TOOTHED controls span 0.77–1.10% and the two SCALLOPED controls
  differ by 0.03 pp. Those rows were decided by the existing `EDGE_AMOUNT` slot map and by
  issue #66, not by the measurement.
- **Small magnitudes are not reproducible to the decimal.** The sweep was run in chunks, and
  the camera carries over between choices within a chunk, so a low-scoring row's baseline is
  not identical run to run. Re-measured standalone, SCALLOPED reads 1.04% / 1.04% rather than
  0.49% / 0.46% — the tie is stable, the absolute value is not. Treat anything below ~1.5% as
  a rank, not a quantity. The rows the proposal actually turns on (`leafSize` 11.97%,
  `boneWidth` 5.45%, `fillOuterSize` 3.94%, `strandCount` 3.20%) win by margins far outside
  that noise.

### Triangle cost of the proposed set

Reported because any geometry-adjacent change here owes numbers. Ten of the thirteen promoted
controls change **zero** triangles across their full range — they are shape, not mass:

| Promoted | Tris at that choice's default | At the measured extreme |
|---|---|---|
| `boneWidth` | 46,296 | 46,296 (0%) |
| `tipLength` | 75,788 | 75,788 (0%) |
| `scallopHeight` | 75,004 | 75,004 (0%) |
| `centerLength` | 71,036 | 71,036 (0%) |
| `denseStamenLength` | 74,636 | 74,636 (0%) |
| `discSize` | 70,732 | 70,732 (0%) |
| `fillOuterSize` | 116,076 | 116,076 (0%) |
| `leafSize` | 119,434 | 119,434 (0%) |
| `bilPerSide` | 106,072 | 37,064 (−65%) |
| `spaceDensity` | 90,106 | 46,276 (−49%) |
| `sepalSize` | 97,780 | 100,928 (+3%) |
| `strandCount` | 33,248 | 58,208 (+75%) |
| `sepalCount` | 97,780 | 177,620 (**+82%**) |

Only `strandCount` and `sepalCount` add meaningful mesh, and both are count sliders whose top
end a visitor chooses deliberately. Every runner-up rejected above was equal or worse:
`boneCount` +85%, `leafPhyllotaxy` +65%, `spaceBirth` sits on the 26.8M cliff.

### One comment checked

`flower.js`'s `EDGE_AMOUNT` map and its surrounding comment claim the Standard Edge slot is a
pure 1:1 relabel with no proxy state, covering all three styles. Verified against the code, not
taken on trust: `updateEdgeAmount()` relabels `tipLength`/`scallopHeight`/`edgeNoise` and does
nothing else, and `applyVisibility()` is the only thing that sets `hidden`. The comment is
accurate. Rows 5 and 6 therefore cost a tier assignment and one predicate — no `flower.js`
change at all.

---

## What is deliberately not here

- **No target size.** Standard lands at 33 of 167 if every row is taken, 34 or 35 with the
  extras. That number falls out of the list above; it was not chosen first.
- **No section restructuring.** Base at 11 controls is the largest section in Standard by a
  wide margin, and the four centre-style adjustments plus sepals plus leaves are a plausible
  argument for splitting it. That is a different proposal.
- **No fixes to open issues.** #66 is quoted as the fix for rows 5 and 6 and left open. #68
  (dead `shoulder` values) and #70 (no gate proves the panel reacts to a predicate) are
  untouched — though #70 is worth noting here: nothing currently proves a promoted control
  would actually appear when its choice is picked, only that the declaration says it should.
- **No demotions.** Per the ruling: always promote an adjustment, never remove the choice.
  FAN stays in Standard.

## If this is approved

Order the work so each step is separately verifiable:

1. Rows 5 and 6 alone — they are issue #66 and land as its fix.
2. The remaining eleven promotions as one registry edit (twelve `tier` fields, one
   `standardVisibleWhen`).
3. Re-run `verify-registry-sync` and `verify-tier-visibility`; diff `dump-visibility.mjs`
   against a pre-change dump — visibility in **Advanced** must be byte-identical, and the
   Standard column must differ in exactly the thirteen expected places and nowhere else.
4. `shot-panel-matrix.mjs` as the eyes on the same claim — the dump proves the declarations,
   the contact sheet proves the panel reacts to them.

## Reproducing this document

Both instruments live beside it and are read-only — they never write to the registry:

```
node docs/tools/proposal-impact-sweep.mjs [choice ...]   # ranking, writes $IMPACT_OUT
node docs/tools/proposal-panel-mock.mjs proposal.json out.html
```

`npm i --no-save three@0.161.0 playwright-core playwright` first. The sweep takes roughly nine
minutes for the full set of choices and is chunkable by argument.
