# RIBS shipped: radial spoke ribbing, the third texture choice

The Nov 9 brief: ship RIBS into the generator as the third texture choice (NONE / BONE / RIBS), matching
the **October lab's** look ("ribbing — radial spokes", height 0.30 mm, feature 2.00 mm, outward), not
#541's sharp crests. This doc records what shipped, what it measured, and every place the brief was
read without a ruling. The prototype record is `docs/bloom-surface-texture-ribs.md` (#541). This
session supersedes its §2 (sharp crests, the crest-line cutter) and leaves its §10–§13 centre rounds
as the record they are (see §7, Q1).

Sheet: `docs/img/bloom-texture-ribs-shipped.png` (`node tools/shot-bloom-texture-ribs-shipped.mjs <png>`).
Figures: `docs/data/bloom-texture-ribs-shipped.json` (`node tools/bloom-texture-ribs-shipped-measure.mjs`).

## 0. The rulings this ships on

- **Third choice, one at a time.** `petalTexture` NONE / BONE / RIBS. PEBBLE and CELLULAR stay hidden
  options and build as before.
- **The profile is SOFT**: the lab's smooth wave, `f = (1 + cos(pi u)) / 2` over each period. That
  supersedes #541's sharp crests. **No crest-line cutter**: the 0.4 mm lattice carries the soft wave
  (§3), so there is nothing to cut.
- **Spacing law A is the default** (a fixed count, fanning out). **Law B** (a constant spacing, branching)
  is the "Rib spacing" choice.
- **The centre converges freely to the axis**: no collar, no thinning, no fade, no 1.6 mm floor at the hub.
  Under-resolved ribs blur into a radial hatch, as the lab's do.
- **Organs:** petals, sepals, leaves (and leaflets), and the hub top, both faces of every sheet. **The stem
  and every rod are excluded BY NAME** (stem, stamen, style, braid strands, pedicels, petioles, leaflet
  stalks). That is Eva's named exclusion, not the derived visibility or curvature rules.
- **Height:** RIBS minimum 0.3 mm (BONE keeps its 0.4), default 0.30. **UNVALIDATED for SLS**, and the
  control's help text says so.
- **Spacing default 2.0 mm.** Law A's spoke count is derived from it: `n = round(2 pi x 20 mm / s)`, the
  count that puts the ribs `s` apart **20 mm from the axis** (the default petal's mid-blade), so 63 at
  2.0 mm. That is the lab's own `K = round(2 pi 20 / lambda)`.
- **Edges:** the shipped curvature and visibility rules are kept, not special-cased (§5).
- **Coarse = full.** RIBS adds no refinement past the 0.4 mm lattice, so the live view IS the export. The
  Full detail button is not offered and the read-out says so. No fake split.
- Standing rulings: attachment B, OUTWARD only, peak-to-valley height, visible surfaces only, T5's coverage
  and owner rules, texture and infill exclusive, ships OFF as a choice, `EXPORT_TRI_CAP` (provisional
  2.0 M), and engine-agreed arithmetic only.

## 1. What shipped

**One field about the bloom axis, through BONE's one deferred relief pass.** RIBS is not a fourth relief
pass. `ribsTextureFor` returns BONE's record shape:
- a field `f(x, y)` (no z: the same ribs on every height);
- a patch mask `mp = 1` (everywhere visible);
- **no BONE v2 record** (so no full-detail build);
- BONE's own curvature default and fade.

`boneReliefPass` then runs exactly as it runs BONE: the visibility, the coverage under the feet, the
fade, the derived owner and the clearance. Under RIBS the weight loop skips the excluded organs
(`ribExcluded`).

| | law A (default) | law B |
|---|---|---|
| spokes | `n = round(2 pi 20 / s)`, fixed, fanning out (1.0 mm apart at 10 mm, 2.0 at 20, 4.5 at 45) | `4 x 2^L`; level L begins where its spacing is `s / sqrt 2` (`r = n s / (2 pi sqrt 2)`) |
| a new rib | — | grows from the flute's floor over one spacing (`RIB_EMERGE_K` 1, a smoothstep blend of the two waves) |
| the centre | 63 spokes converge on the axis | the innermost 4 converge on the axis |

**Controls** (in the Texture section, shown only under RIBS; `textureHeight` hides there):
- `ribLaw`: choice A / B, label "Rib spacing", default A.
- `ribSpacing`: 1.60–8.00 mm, step 0.05, default 2.0. The floor is four lattice edges, `4 x TEXTURE_EDGE_MM`.
- `ribHeight`: 0.30–2.50 mm, step 0.05, default 0.30. The help text says it is UNVALIDATED for SLS.

Both sliders are whole-bloom: they are added to `SCOPE_UNSCOPED`, BONE's precedent.

**Engine agreement.**
- The angle is an arithmetic `eatan2`: half-angle reductions and a series. The cosine is the shipped
  `ecos`. No `Math.atan2`, `cos`, `sin` or `pow` is used in the block, and TXR5 enforces that.
- **The field is rounded onto the 2⁻²⁰ grid** (`RIB_FIELD_QUANT`). A valley is `f` exactly 0. A lattice
  vertex that a valley passes through (the −x axis under an odd spoke count) read 0 in one engine and
  ~1e-32 in the other, so it was raised or not by a last bit. TX7 caught it as one displaced vertex of
  13,235 on the closed tube.
- The grid moves the relief by at most `H x 2⁻²¹` mm (1.2e-6 mm at 2.5 mm).

**What RIBS does NOT touch:**
- the stem: under RIBS it is not latticed at all;
- the rods: never captured (`acc.boneRods` is BONE's only);
- the hub's underside: excluded by its own normal;
- BONE, PEBBLE and CELLULAR: built bit-identically, measured in §6.

## 2. The hub centre: the lab's radial hatch, by splitting rows

The shipped T5 lattice re-meshes a closed centre fan as RINGS sized by circumference. Under 63 ribs, a
ring lattice samples a field that changes sign every 2.9° on vertices that sit OFF the spokes, so the
centre came out as moiré. The lab splits the fan by ROWS (`split: 'rows'`): its vertices lie on the fan's
own spokes, and the converging ribs read as a radial hatch. RIBS does the same: `organLatticeInto(…,
{ fanRings: false })` keeps the rows split on the hub's centre fan.

- It costs **+2,288 triangles on the stemless flat hub** (9,600 against the rings' 7,312).
- That puts the hub at **1.3547x** its conforming floor, past Q14's 1.25 bar. It is declared per row by
  value (`TEXTURE_ORGAN_BAR_XFAIL`, both directions) and never widened.
- A STEMMED hub is an annulus (the stem's hole takes the centre fan) and stays under the bar.
- **TXR9** holds the hub-top vertices near the axis on the untextured twin's spokes. Its mutant restores
  the rings and fires it (1,007 of 1,049 off the spokes).

What the centre does at the axis, measured, is in §4.

## 3. Coarse = full: what the 0.4 mm lattice carries

The soft wave needs no crest on an edge. #541's "a crest is only crisp on a mesh edge" was about the sharp
profile and does not apply. **At 63 spokes the wavelength is `2 pi r / 63`, and the lattice samples it the way the lab does:**
- beyond r = 20 mm (the outer half of a petal): at five or more 0.4 mm edges a period;
- from 8 to 20 mm: at two to five;
- inside 8 mm (a period under two edges, the hub top): under-sampled, so the ribs alias into the
  radial hatch the ruling accepts.

The lab carries the identical sampling: the same 0.4 mm rows split and the same field. That is why the
petals on the sheet read the same in both columns. **No refinement past the lattice is built**,
so `boneDetail` FULL and COARSE build the same mesh. The record says `fullIsCoarse`, the page offers no
Full detail button under RIBS, and the read-out says "The view IS the export".

## 4. Measured

All EXPORT mode, Node, from `docs/data/bloom-texture-ribs-shipped.json`; laws A and B build the same lattice,
so their counts are equal.

**Budget** (the 2.0 M `EXPORT_TRI_CAP`, provisional):

| state | triangles | % of cap | Node build | shells | open / doubled / degenerate |
|---|---|---|---|---|---|
| the default bloom | 161,200 | 8.1 % | 0.9–1.2 s | 9 | 0 / 0 / 0 |
| the umbel, head ON | 478,294 | 23.9 % | 3.5–3.6 s | 53 | 0 / 0 / 0 |
| THE MOPHEAD (depth 2's defaults) | 1,970,874 | **98.5 %** | 31–32 s | 674 | 0 / 0 / 0 |

- The default is 161,200 against BONE's coarse 158,912. The +2,288 is the hub centre's split rows (§2).
- The mophead is the corner. Its florets sit on depth 2's REDUCED lattice (6 columns), and the 0.4 mm
  texture lattice refines every floret petal past it. The texture edge cap's derivation keeps the
  mophead under 2.0 M, and nothing coarsens and nothing refuses at these defaults.
- BONE's coarse mophead is 1,762,254. No BONE mophead row ever existed, so the two clauses that could
  not read a textured mophead had never run on one (§6).

**Print** (the default bloom; the census is `tools/bloom-self-intersection.mjs`; gaps are every third
raised vertex against every OTHER part within 1 + H, on the same mesh built with nothing raised):

| law, height | within-shell pairs | cross-shell | shells | open edges | printable gaps newly closed |
|---|---|---|---|---|---|
| A, 0.3 mm | 0 | 17,570 | 9 | 0 | 0 (6,618 sampled) |
| A, 2.5 mm | 0 | 17,570 | 9 | 0 | 0 (30,291 sampled) |
| B, 0.3 mm | 0 | 17,608 | 9 | 0 | 0 (6,656 sampled) |
| B, 2.5 mm | 0 | 17,608 | 9 | 0 | 0 (30,416 sampled) |

The nearest gap reads 0.038 mm with the relief and without it: a pre-existing contact, not one the ribs
make. Cross-shell pairs are the export contract's overlapping closed shells.

**The hub centre at the axis** (the 768 hub triangles within 3 mm of it):

| law, height | degenerate (float32, at or under 1e-9 mm²) | smallest interior angle | folded (raised against unraised normal) |
|---|---|---|---|
| A, 0.3 mm | 0 | 8.34° | 0 |
| A, 2.5 mm | 0 | 2.75° | 0 |
| B, 0.3 mm | 0 | 6.28° | 0 |
| B, 2.5 mm | 0 | 1.33° | 0 |

The converging fan's slivers sharpen with the height (the spokes alternate crest and valley a few
microns apart), but none degenerates and none folds. At 2.5 mm the centre reads as a raised boss (sheet,
row 6): the wave averages 0.5 at the axis, so the hub top stands about H/2 there. That is what converging
freely builds, and it is not clamped.

**Release build in Chromium** (the page's own module, EXPORT, one build; the float32 hash against Node's):

| state | law A | law B | Node | engines agree |
|---|---|---|---|---|
| default | 0.65 s | 0.62 s | 0.8–0.9 s | yes, to the float32 |
| umbel | 2.28 s | 2.16 s | 2.7–3.0 s | yes |
| mophead | **24.6 s** | 24.3 s | 30–31 s | yes (heap 0.9 GB) |

- RIBS has no full-detail build, so this is both the release build and the export.
- The mophead's 24 s is a held slider's cost on that state: drag-light drops only the infill, and a
  mophead has none. That is the same open question the mophead's own §12b recorded for its untextured
  11–17 s.

## 5. Edges: the shipped rules, reported, not special-cased

RIBS keeps BONE's curvature mask at its default, 1 /mm (a ridge with convex curvature ≥ 1 /mm is smooth,
fading over `max(H x 15/8, e)`), and T5's visibility and coverage.
- **The bead and the nib are smooth by curvature.** The rim bead (r 0.45 mm) and the 0.10 mm apex nib are
  ridges far past 1 /mm. So every petal's margin and tip carry no rib, and the ribs fade in over the fade
  width inside the margin. That is BONE's behaviour verbatim, and the sheet shows it.
- **The hub top under the petal feet is SMOOTH**: the coverage rule. That is the octagon on the sheet, and
  the one visible difference from the lab (§7, Q1).
- **The hub's rim** is a ridge under the mask and stays smooth (the ease the fourth prototype round ruled
  is NOT carried; §7, Q1).

## 6. The gate

**TXR in both STL gates** (`tools/bloom-harness.mjs`, on every RIBS row):

| clause | what it holds |
|---|---|
| TXR0 | the record against the controls |
| TXR1 | outward only, every vertex along its own normal |
| TXR2 | the soft law, the field restated with `Math.atan2` / `Math.cos` to 1e-9 |
| TXR3 | the read-out's words |
| TXR6 | the centre converges freely: hub-top vertices inside the feet raised `H x f` with no fade, on a flat stemless-centre hub, against a `boneNoRelief` build |
| TXR7 | the named exclusion: the stem and every rod are the untextured twin's to the bit, and the hub's underside carries nothing |
| TXR8 | law A's count and law B's schedule restated |
| TXR9 | the hub centre on the fan's own spokes |

**`node tools/verify-bloom-ribs-shipped.mjs`** (Node, eight rows, both modes):
- TXR3 directed edges, TXR4 shells (ribbed never fewer than unrelieved), TXR5 the static
  no-transcendental scan, TXR10 the holder identities;
- `--negative-control`: **10 of 10 mutants behave**, each witnessed on the mutated module and each firing
  the clause it names;
- `--browser` for engine agreement.

It is spawned by `verify-bloom-defaults-bar.mjs` in both arms, so it rides in CI with no workflow edit.

**Matrix block 87** (23 rows, 1,685 → 1,708). Smoke block 87 (9 rows, `--conn`).
- Declared: the umbel's floret overlap (`INFLO_APPROACH_XFAIL`, the umbel's own class) and ten
  `TEXTURE_ORGAN_BAR_XFAIL` hub entries.
- TX11's "most moved" and TX14's identical-florets clauses do not apply to RIBS and say why: the field is
  `f(x, y)` about one axis, so two florets at one azimuth carry the same ribs by construction.
- Panel route (ao) covers the RIBS controls and read-out.

**What the export gate found on the RIBS rows, and what each became:**
- **TX7, the closed tube: 13,234 raised tube vertices in Node against 13,235 in Chromium.**
  - A seam vertex on the −y axis is `r cos(pi/2)`. The engines' `cos` puts the hub's and the ring's
    copies at −1.1e-15 and −1.1e-15 in Node (one float32, so one position) and at −1.1e-15 and
    −6.6e-15 in Chromium (two). The derived owner, keyed on float32s, took the copies together in one
    engine and apart in the other.
  - Under RIBS the owner keys on the 2⁻²⁰ mm grid instead. 0 of 377,208 positions now differ between
    the engines.
  - BONE keeps its float32 key, so its bytes hold. **The hazard is latent under BONE too**: BONE's patch
    mask leaves most such seams at s = 0, and so far no row has shown it. Recorded, not fixed.
  - TXR2 now holds a SHARED position to at most its own law (the owner takes the least of its copies'
    reliefs), and every other vertex to the law exactly. The samples carry a `shared` flag for that.
- **X2, the braid: 453 within-shell pairs, 0.1131 mm.**
  - This is the STYLE's declared by-design rod overlap: every untextured STYLE row reads 272 / 0.0796.
    The style roots through the hub and welds to it.
  - Under BONE the style is a captured rod and BONE's clearance parts it from the hub (0 pairs). RIBS
    captures no rod, by the named exclusion.
  - Declared by value in `SELF_INTERSECTION_XFAIL`. The same state with nothing raised reads 521 / 0.0572.
- **UM6 and TX1, the mophead: two clauses that had never seen a textured mophead** (no BONE mophead row
  exists).
  - UM6 counts a floret petal's emitted columns. The 0.4 mm texture lattice adds sub-columns, so it read
    21 against the reduced lattice's 6. Under a texture it now holds the declaration (6 columns, a
    2-segment bead), the emitted bead, and a count that is at least 6.
  - TX1 asked for an organ with a T3 textured panel. A floret's sheets are relieved only by the parent's
    deferred pass, which writes no panel record, so a sheet that pass raised now counts.
- **ID10, the mophead and the umbel: florets passing through each other** is each one's own declared
  class (the DOME, the UMBEL). It is declared for RIBS's copies by value in `INFLO_APPROACH_XFAIL`.

**Byte partition** (`verify-bloom-surface-bytes --movers-predicate ribs`, against a worktree of
`0458880`, both modes):

- **Predeclared from the guard predicate:** a row moves iff it builds RIBS with the infill off. That is
  20 of block 87's 23 rows, all ADDED, none with a base counterpart. The other three are holders: the
  infill row, which refuses RIBS, and the two GATED rows. Every other row is a holder too: every BONE,
  PEBBLE and CELLULAR row, and the shipping default. No row definition moved.
- **PASS over the whole 1,708-row matrix in both modes** (eight chunks, `--merge`d): 0 floats moved on
  the 1,688 holders, positionally under `Object.is`, and 20 of 20 predeclared movers moved. That is over
  2,835,623,718 export floats (315,069,302 triangles) and 84,435,812 captured-grid values.
- **The byte tool had a defect that this run found, and it is fixed.** `baseScopes` stripped a LAYER
  entry's values against `SCOPE_VALUE_IDS` alone, so it took `layerRing` and `layerPetalCount` (listed in
  `SCOPE_LAYER_VALUE_IDS`) away from the base build. Block 85's LAYER RING rows then read as 32 false
  movers. A layer entry now strips against both lists, and rows 1,616–1,707 were re-run on the fixed
  tool. The geometry was never wrong; the comparison was.
- Every change made to `bloom-geometry.js` after that run started sits inside a `T.ribs` branch (the
  owner key, the shared flag), so no holder's bytes can depend on it.

**`frozen/phase96`** is the 1,685 rows at `0458880`, registered in both maps.

## 7. Ambiguities, flagged and not resolved

1. **Q1 — the hub top under the feet (the main one).** The brief says keep the shipped visibility and
   coverage rules. The lab ribs the hub top over the petal feet to its rim, and the prototype's third and
   fourth rounds (Nov 9: "starburst, reaching the edge"; the rim easing off) ruled that. Shipped follows
   the brief: smooth under the feet, the octagon. **The two cannot both hold.** Ribbing under the feet is
   the coverage rule switched off for RIBS (the prototype measured it clean at the default; ribbing the
   feet's own skin folded and was withdrawn).
2. **The screenshot's 5.75 mm against the brief's 2.0 mm.** The screenshot Eva sent shows feature size
   5.75 mm (22 spokes). The brief says 2.0. Shipped 2.0, and the sheet shows both.
3. **A separate `ribHeight` control** (0.30–2.50) beside BONE's `textureHeight` (0.40–2.50): a decision
   without a ruling. One control with a per-choice floor is the alternative.
4. **The hub rows cost +2,288 triangles and sit at 1.3547x the conforming floor**, past Q14's 1.25 bar,
   declared (§2).
5. **The closed tube's ring is ribbed.** It is in neither the organ list nor the exclusion list. It is a
   sheet-like ring on the T5 path, so it takes the field.
6. **The spacing range (1.6–8.0, step 0.05) and the 20 mm reference radius are proposals.**
7. **The field's 2⁻²⁰ grid** (§1) is engine agreement, not a look decision.
8. **The defaults bar carries no RIBS row**: BONE's precedent (both ship OFF). The RIBS gate is spawned
   there instead.
9. **Florets at one azimuth are identical under RIBS by construction** (TX14 exempted, said).
10. **The curvature mask at 1 /mm smooths the bead and the nib** (§5). Reported, not special-cased.

## Reproduce

```
node tools/verify-bloom-ribs-shipped.mjs [--negative-control] [--browser]
node tools/verify-bloom-export.mjs --only '^RIBS:'
node tools/verify-bloom-surface-bytes.mjs --base <worktree of 0458880> --movers-predicate ribs
node --max-old-space-size=12000 tools/bloom-texture-ribs-shipped-measure.mjs
node tools/shot-bloom-texture-ribs-shipped.mjs docs/img/bloom-texture-ribs-shipped.png
```
