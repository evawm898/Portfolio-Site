# Bloom surface texture — T3: the field, the lattice and the relief in the shipped generator (Oct 22)

**Status: BUILT, gated, merged behind a choice guard that ships OFF. ONE QUESTION OPEN FOR EVA — the
worst-corner cap's mechanism (§7, none picked). Three findings the brief said to stop on are reported with
renders in §5, not masked.**

Base `main` at `d60e734`. Discovery and its rulings: `docs/bloom-surface-texture-discovery.md` §0, §8,
§10–§12. Sheet: `docs/img/bloom-texture-t3.png` (`node tools/shot-bloom-texture-t3.mjs <dir> --png …
--bead <json> --corner <json>`).

## 0. The rulings this build carries, each with where it lands

| ruling | where |
|---|---|
| Attachment B — one world-space field sampled inside the emitters | `textureField()` is evaluated in `emitPanel` at every skin sample and every bead apex sample (`bloom-geometry.js`, the SURFACE TEXTURE block) |
| OUTWARD ONLY | `p + n · g · H · f(p)` on each skin along its own normal, the bead apex along the bead's own outward direction; the sheet is never thinner than `t` (TX1, TX5) |
| Q2 height is PEAK-TO-VALLEY | the field spans [0, 1]; `H` is how far the relief stands proud (TX3's T-band `[w, w + 2H]`) |
| Q13 height minimum 0.4 mm, UNVALIDATED | `TEXTURE_HEIGHT_RANGE = [0.4, 1.5]`, default = the floor; the panel says "unvalidated — nothing printed" |
| Q14 lattice bar 1.25× the conforming floor | `TEXTURE_LATTICE_BAR`, TX4 on every organ's lattice skin against its untextured twin's floor; one declared breach (§4) |
| lattice edge 0.4 mm | `TEXTURE_EDGE_MM`, a constant, never a control |
| Q9 texture and Voronoi infill EXCLUSIVE — greyed, not switched; both on told | registry `enabledWhen` on both controls (an ON control is never greyed); `textureFor` refuses with the word `infill`; `bloom-file.js` reports the conflict; TX6; panel route (ao); F2 |
| Q4/Q5 relief OVER the rim bead | the bead profile carries `g` and is displaced (TX5); the outline moves out by up to H on a textured petal and not at all on an untextured one |
| Q6 no ribbing | `TEXTURE_TYPES = NONE / PEBBLE / CELLULAR` |
| ships OFF as a CHOICE guard; `ALL MAX` untextured | `petalTexture` is a choice, so `SWEEPABLE` never reaches it; the two sliders are `TEXTURE_SUBS`, out of the blanket sweep; `ALL MAX` reads its 3,334,106-triangle refusal unmoved |
| light while dragging, full on release and export | F7's `dragLight` path: a held texture slider builds the untextured petal, release and export build the relief |
| hub, stem, rods, tube ring OUT (T5) | the read-out says so on every textured build; the sheet's §5 cell shows it |
| /plot has no say | nothing in `/plot` was touched; the grid .glb records body thickness as before |

**No doc contradicted the OFF-by-choice-guard ruling.** The discovery's §10 "off by branch" is this.

## 1. What shipped

- **Three controls** in a `Texture` drop-down inside Petal, after Tube: `petalTexture` (NONE / PEBBLE /
  CELLULAR), `textureHeight` (0.4–1.5 mm, step 0.05, default 0.4), `textureSize` (1.6–12 mm, step 0.1,
  default 4; the floor is four lattice edges). The sliders are hidden and inert at NONE.
- **The field** (`textureField`): PEBBLE is two octaves of gradient noise, CELLULAR the Worley F2 − F1
  distance, both from `Math.floor`, `Math.imul`, products and `Math.sqrt` only — the engine-agreed subset
  (X0 compares Chromium's STL against Node's rebuild at 8 ulp, and `sin`/`cos`/`atan2`/`hypot` are not
  correctly rounded across engines). TX2 reads the field restated in the harness against the builder's own
  skin samples: worst 2.8e-17.
- **The lattice** (T2 ported): sub-rows through the organ's own `rowAt(u)`, sub-columns through the row's own
  `sect(v)`, every per-row decision taken on the shipped rows, zip-triangulated between rows of unequal
  column count. **The lattice reaches only where `g > 0`** — the buried end ramp gates it. The first cut
  sub-divided the foot rows too, put a vertex at `v = 0` exactly on the hub's rim vertex, and WELDED every
  petal to the hub (vertex-welded shells 9 → 2, 5,808 within-shell pairs on every textured row at z −0.60).
  The relief is also `g`-scaled, so nothing is displaced where the lattice is not refined.
- **Which sheets**: petals, sepals (the petal builder on a second ring), simple and compound leaves (every
  leaflet in the one field, at its own frame), florets (each in its own frame). A LOBED leaf is declared OUT
  (its chevron lattice has no `(u, v)` row law) and the read-out says `1 leaf refused (lobed)`. Under a
  tube the ring stays out and the free lobes are textured.
- **Cost**: the default at PEBBLE 0.4 is **151,792** export triangles against 24,688 untextured (TX4
  reads the petal lattice at 1.033× the untextured twin's conforming floor; the read-out prints the builder's own
  estimate, 1.147×, which is a different owner and runs 0.1–0.2 above TX4's on every state measured); the whole bloom with 8 sepals, a stem and a leaf 313,138. The
  corner is §7.

## 2. The gates

- **TX0–TX8** in `tools/bloom-harness.mjs`, run by both STL gates after `tubeAssertions`: TX0 the two
  statements and the ranges; TX1 outward only (`p1 = p0 + s·n`, `s ∈ [0, g·H]`); TX2 the field restated;
  TX3 the thickness band `[w, w + 2H]` (T1/T2/T4/T5 re-derived — the root reads `min(d, w)`); TX4 the
  lattice bar per organ from the untextured twin's floor over each blade's `triStart`/`tris` range; TX5 the
  bead apex `s = g·H·F(apex)`; TX6 exclusivity both ways and the refusal word; TX7 the Node rebuild's counts;
  TX8 the lattice on the surface (every sub-row point reproduced by `petalSurface.at(u, v)`; skipped on
  scoped rows and under a tube's `tubeLobe` cap, said).
- **Harness load-time**: `textureIsAbsent` against `PREDICATES.texturePresent`; the ranges against the
  registry; the `enabledWhen` of both controls restated (each greyed iff the other is ON; both ON greys
  neither).
- **Five witnessed apex mutants** (`node tools/verify-bloom-apex-mutants.mjs --rows='^surface texture'`,
  anchors 231/231): `the-relief-goes-inward` (TX1), `the-bead-is-left-flat` (TX5),
  `the-field-is-sampled-per-organ` (TX2 — the witness reads the LEAF's samples, since a sepal is the petal
  builder and shares its frame), `the-lattice-leaves-the-surface` (TX8 — a lerped sub-row `sect`),
  `the-exclusivity-is-dropped` (TX6 — the witness is the record's own word; an infilled petal structurally
  carries no relief to displace).
- **Panel route (ao)** (THIRTY-TWO routes): default hidden; PEBBLE on; CELLULAR 1.5; BOTH ON neither greyed
  and the read-out's NOT BUILT line; infill alone greys the texture and the read-out names the infill; the
  guard off with the sliders at their maxima leaves no record. Two bloom.js mutants (the greying dropped,
  the texture line dropped) and the section's geometry witness (the petal organ's `reliefMaxMm` / `skinTris`).
- **Block 77** — 19 `TEXTURE:` rows (matrix 1,506 → 1,525), smoke block 77 (5 rows, `--conn`); `bloom-smoke
  --check`: 315 rows over 73 blocks, 207 families both ways.
- **Edge profile**: a relieved part is carved out of the E family BY NAME (`isRelieved`, with the note `E
  SKIPPED N RELIEVED part(s)`) — E measures the shipped bead's taper and radius, which the relief moves by
  design; the untextured parts of a textured row are still measured. One E2 entry on the LOBED-leaf row
  (the lobed leaf's own 77.89° turn, 32.887927° over, untextured and pre-existing in kind).
- **Scopes**: the two texture sliders are `SCOPE_UNSCOPED` (one world field — a scoped height would make
  two petals' reliefs disagree where they meet; `bloom-file.js` refuses an offset on them by name); SO0
  restates the list; SO12 PASS (13 clauses). **Design file**: F2 expects the Q9 conflict note exactly where
  the row's own state has both on; PASS (12 clauses). **Drag preview**: PASS.
- **Byte partition** (`verify-bloom-surface-bytes --movers-predicate texture`, both modes, the whole 1,525-row
  matrix in six chunks against a worktree of `d60e734`): the predicate is "textured and NOT infilled"
  (19 added rows declared in `ROW_DEF_MOVED_BY_PRED.texture`); see §6 for the closed figures.

**Two owners of "× floor", named.** TX4 counts a blade's textured skin AND rim against the untextured TWIN's
conforming floor (the gate's number, the one declared). The read-out prints the BUILDER's own estimate — its skin
against a floor it computes on its own rows — which is 1.147× on the default where TX4 reads 1.033×, and 1.808×
on cup 1.2 where TX4 reads 1.596×; it says so in the line. The twin sweep (`tx4-sweep.mjs`, the scratch tool
recorded in the harness header): default 1.033, curl 180 1.034, roll 330 1.056, length 100 1.087, twist 180 1.102,
cup 0.6 × curl 90 1.240, width 46 1.347, cup 1.2 × curl 180 1.577, cup 1.2 1.596; width 8 0.873 and tip 3.00 0.774
(a lattice can read UNDER 1 because the twin's floor is a sum of per-span ceilings and the lattice's cells are not).

## 3. Declared, with mechanism

- **`SELF_INTERSECTION_XFAIL`** — two relief folds, each 0 pairs untextured and 0 with the lattice alone:
  - `TEXTURE: CELLULAR x a COMPOUND leaf` — **59 / 0.1963 mm**, the CELLULAR relief at the leaflets' free
    bases (the bead at a beaded base end, both skins standing proud into the stalk's root).
  - `TEXTURE: PEBBLE x cup 1.2 x curl 180` — **147 / 0.0918 mm**, the relief closing the already-near
    margins of a cupped, curled tip. Both browser-confirmed exact (X1).
- **`TEXTURE_BAR_XFAIL`** — the same cup × curl row's petal lattice reads **1.577×** its conforming floor
  against the 1.25 bar (held ±0.005 both ways). The lattice's column factor is ROW-UNIFORM (one `⌈dmax/e⌉`
  per row) while a curled, cupped row's columns differ in length by 2–3×, so the short spans are
  over-refined; the class is cup 1.2 alone 1.596, width 46 1.347, cup 0.6 × curl 90 1.240. A per-span column
  count would meet the bar and is a new decision on lengths (costed, not built — §12.8 item 18 of the
  discovery doc in the shipped tree).
- **`E2_TURN_XFAIL`** — `TEXTURE: PEBBLE x a LOBED leaf`: 32.887927° over, the untextured lobed leaf's own.

## 4. Decisions made without a ruling (each reversible, named so Eva can overrule)

1. The section sits after Tube, inside Petal (one `parent` field).
2. The height DEFAULT is the floor itself (ruling 3's "never a default that assumes it prints").
3. A LOBED leaf is out (no row law); told, never silently smooth.
4. Florets are textured in their own frame (the memo builds one unit; the field is world-space in the
   floret's frame, so two florets at different azimuths carry the same relief — the Variance build's own
   measured finding, a per-floret phase is its second half).
5. Under BOTH ON the texture is the one refused (the infill was there first; a saved design keeps both
   values and the read-out says which is built).
6. TX4's twin is the same state at `petalTexture NONE`, and the bar is per ORGAN (every blade of that organ
   summed), not per blade.
7. The texture sliders are unscoped (one world field).
8. The row-uniform lattice over the bar on the curled row is DECLARED rather than fixed (a per-span count
   is a lengths decision).
9. The two relief folds are declared by value rather than clamped; the class (a relief on margins already
   within 2H of each other) has no mask that is not a second owner of the margin.

## 5. Measured before shipping — the bead, the outline, the neighbours (`node tools/bloom-texture-bead.mjs`)

Five states × two patterns × the floor and the maximum, EXPORT, read off the builder's own skin and apex
samples and the emitted triangles (census within / cross, the apex displacement, the nearest neighbour blade
ABOVE the ring — the feet and the root blend overlap by design, the accepted look):

| state | pattern × H | within-shell (untextured) | worst mm | apex moves max / mean | neighbour blade mm (untextured) |
|---|---|---|---|---|---|
| default 8 × 35 × 16 | PEBBLE 0.4 | 0 (0) | — | 0.361 / 0.186 | 0.000 (0.000) |
| | PEBBLE 1.5 | 0 (0) | — | 1.355 / 0.697 | 0.000 (0.000) |
| | CELLULAR 0.4 | 0 (0) | — | 0.400 / 0.160 | 0.000 (0.000) |
| | CELLULAR 1.5 | 0 (0) | — | 1.500 / 0.600 | 0.000 (0.000) |
| width 8 (narrowest) | PEBBLE 0.4 / 1.5 | 0 / 0 | — | 0.400 / 1.500 | 2.621 / 0.740 (3.293) |
| | CELLULAR 0.4 / 1.5 | 0 / 0 | — | 0.400 / 1.500 | 2.554 / 0.521 (3.293) |
| the 0.40 mm nib (tip 0.60) | PEBBLE 0.4 | 0 (0) | — | 0.318 / 0.157 | 0.001 (0.001) |
| | **PEBBLE 1.5** | **19 (0)** | **0.5011** | 1.192 / 0.591 | 0.000 (0.001) |
| | CELLULAR 0.4 / 1.5 | 0 / 0 | — | 0.400 / 1.500 | 0.000 (0.001) |
| cup 1.2 × curl 180 | PEBBLE 0.4 | 147 (0) — declared | 0.0918 | 0.400 / 0.238 | 0.000 (0.000) |
| | **PEBBLE 1.5** | **1,588 (0)** | **0.2727** | 1.500 / 0.891 | 0.000 (0.000) |
| | CELLULAR 0.4 | 0 (0) | — | 0.400 / 0.203 | 0.000 (0.000) |
| | **CELLULAR 1.5** | **1,298 (0)** | **0.2975** | 1.500 / 0.762 | 0.000 (0.000) |
| 40 petals, one whorl | all four | 0 (0) | — | 0.400 / 1.500 | 0.000 (0.000) |

**Read as the brief asked:**
- **The outline moves by up to H on every textured petal** — the apex displacement is `g·H·f`, and `f`
  reaches 1 somewhere on every blade but the PEBBLE default (0.361 of 0.4, 1.355 of 1.5: the noise's
  clamp is rarely hit at the apex). That is the Q4/Q5 ruling as geometry; an untextured petal's outline is
  untouched (the partition holds it).
- **The default's neighbour clearance is 0.000 textured AND untextured**: the shipping default's blades
  already pass through each other (the Variance build's "SKINS PASS THROUGH EACH OTHER", −1.17 mm), so the
  texture creates no crossing there. On the narrowest petal, where the blades ARE clear (3.293 mm), the
  relief at 1.5 takes the gap to 0.740 (PEBBLE) / 0.521 (CELLULAR) — still clear of each other, under the
  1.00 mm printable gap.
- **Three states FOLD at the maximum height and are reported, not masked** (the brief's stop condition):
  - the 0.40 mm nib at PEBBLE 1.5 (**19 / 0.5011 mm**): a face 0.40 mm across whose two margins each stand
    proud by up to 1.5 mm meet. CELLULAR there reads 0 (its field is 0 on every cell wall). The matrix row
    carries the CELLULAR variant; the PEBBLE variant is §3 of the sheet, rendered.
  - cup 1.2 × curl 180 at 1.5, both patterns (1,588 / 0.2727 and 1,298 / 0.2975): the same mechanism as
    the declared 0.4 mm PEBBLE row, deeper. Not a matrix row (adding one mid-partition would have untiled
    the running byte comparison; it is one line in block 77 if Eva wants it declared).
  - **At the DEFAULT HEIGHT (0.4 mm) nothing the tool measured folds except the declared cup × curl row.**

## 6. The byte partition and the frozen sweep

Predeclared from the base tree's own state (textured and not infilled): **17 movers (block 77's 19 rows less BOTH
ON, whose texture is refused, and GATED, whose guard is NONE) / 1,508 holders**, both modes, six chunks of 255 rows
against a worktree of `d60e734`, merged:

```
MERGED 6 chunks over 1525 rows x 2 modes, predicate texture, base /tmp/base
partition     : 17 of 17 predeclared movers MOVED (every one must), 1508 holders compared to the bit
export stream : 1,804,052,448 floats over 200,450,272 triangles
captured grid : 82,174,232 values over 9,470 panels (live)
PASS — 0 floats moved on the 1508 holders, positionally, under Object.is; all 17 predeclared movers moved.
```

So every one of `main`'s 1,506 rows — `ALL MAX`, the infilled rows and the shipping default among them — is
byte-identical in both modes, and the two texture rows that build no relief hold too.

**Frozen sweep: 0 of 74,343 frozen rows across 82 baselines name a texture id**, so every tag's bytes
reproduce by construction (the guard is a choice, a stored row without the id builds at NONE, and NONE is
main's path verbatim). `frozen/phase83` is the 1,506 rows at `d60e734` (the matrix grew), registered in
both maps and proved deep-equal against a worktree of the base.

## 7. THE WORST CORNER — the cap's options, measured; NONE PICKED (Eva's question)

`node tools/bloom-texture-corner.mjs` (PEBBLE at the 0.4 floor, EXPORT, the 1,500,000 budget):

| state | export triangles |
|---|---|
| the default | 151,792 (10.1%) |
| 40 × 1 whorl | 759,472 (50.6%) |
| 40 × 3 whorls | **1,542,832 (102.9%)** |
| 40 × 3 + 8 sepals + a 60 mm leaf on a 60 mm stem | **1,704,306 (113.6%)** |

- **A. Refuse.** The page already does: the export handler refuses above the budget with the count (XR1's
  own path). Cost: a textured 40 × 3 head cannot be exported at any height or size. Nothing else moves.
- **B. Cap the head count a texture may be built on.** 1 whorl: 40 fits (50.6%); 2 whorls: 40 fits
  (82.4%); 3 whorls: **38 fits (97.7%), 39 does not (100.3%)**. Cost: a slider position that builds
  untextured and tells; the cap depends on the sheet, the length and the width (the lattice edge is a
  length), so it is a derived number per build, not a constant.
- **C. Coarsen the lattice edge where the count would breach.** 40 × 3 at 0.4 / 0.5 / 0.6 / 0.7 / 0.8 /
  1.0 / 1.2 mm: 102.9 / 69.3 / 58.0 / 45.7 / 41.0 / 30.1 / 28.4%. **The finest edge that fits is 0.5 mm.**
  Cost: the 0.4 mm edge ruling is given up on the corner, the 1.5 mm relief there is drawn on a coarser
  lattice than anywhere else, and the 1.25× bar's floor moves with the edge.

The sheet's §6 carries the same tables. **This is the brief's step 6 and is where the session stops.**

## 8. Reproduce

```
npm i --no-save three@0.161.0 playwright-core
node tools/verify-bloom-export.mjs --only '^TEXTURE'            # TX in the browser, 19 rows
node tools/verify-bloom-apex-mutants.mjs --rows='^surface texture' --only=<the five ids>
node tools/verify-bloom-panel.mjs --negative-control             # route (ao) among THIRTY-TWO
node tools/bloom-texture-bead.mjs --json <f>                      # §5, Node, ~6 min
node tools/bloom-texture-corner.mjs --json <f>                    # §7, Node
node tools/shot-bloom-texture-t3.mjs <dir> --png docs/img/bloom-texture-t3.png --bead <f> --corner <f>
node tools/verify-bloom-surface-bytes.mjs --base <worktree of d60e734> --movers-predicate texture --range a:b --json <chunk> … --merge <chunks>
```
