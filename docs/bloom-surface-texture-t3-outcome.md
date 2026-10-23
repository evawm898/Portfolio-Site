# Bloom surface texture — T3: the field, the lattice and the relief in the shipped generator (Oct 22; the edge cap ruled and built Oct 23, §7)

**Status: BUILT, gated, merged behind a choice guard that ships OFF. ONE QUESTION OPEN FOR EVA — the
worst-corner cap's mechanism (§7, none picked). Three findings the brief said to stop on are reported with
renders in §5, not masked.**

Base `main` at `d60e734`, merged with `56f91f4` (#447 foot clearance, #448 frame phase 2, #441) before CI. Discovery and its rulings: `docs/bloom-surface-texture-discovery.md` §0, §8,
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
| lattice edge 0.4 mm | `TEXTURE_EDGE_MM`, a constant, never a control — **and, since Oct 23, the edge a build ASKS for: over the export budget it coarsens to the finest 0.01 mm rung that fits, never past 0.5, told (§7)** |
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

**Measured before the merge with #447**, which moves foot widths by nanometres at 16 and 40 petals on both trees
alike and no triangle count; the block-77 chunk (rows 1,275–1,524, every texture row) was re-run against a
worktree of `56f91f4` after the merge — its verdict is appended below. So every one of `main`'s 1,506 rows — `ALL MAX`, the infilled rows and the shipping default among them — is
byte-identical in both modes, and the two texture rows that build no relief hold too.

**After the merge, rows 1,275–1,524 against a worktree of `56f91f4`** (`--range 1275:1525`): PASS — all 17
predeclared movers moved, 0 floats moved on the 233 holders, positionally, under `Object.is` (3,848,880
captured-grid values). The other five chunks were not re-run against the merged base: #447 moves no triangle
count and only foot widths at 16 and 40 petals, identically on both trees.

**Frozen sweep: 0 of 74,343 frozen rows across 82 baselines name a texture id**, so every tag's bytes
reproduce by construction (the guard is a choice, a stored row without the id builds at NONE, and NONE is
main's path verbatim). `frozen/phase83` is the 1,506 rows at `56f91f4` — main's head at merge, after #447 (the foot clearance), whose
matrix is row-for-row `d60e734`'s, where this branch started — registered in both maps and proved deep-equal
against worktrees of both commits.

**The tag did not publish and is declared.** `bloom-frozen-tags` was dispatched from `main` at the merge
(`89bb3bf`, run 39878247322) and read back: 73 published and correct, 8 missing and declared, and
`frozen/phase83` refused by GitHub naming `.github/workflows/frame.yml` — #452 (/frame phase 3a) edited that
existing workflow file after `56f91f4` and merged while #451 was in CI, the phase65 shape, so the refusal
could not be declared before the dispatch. It is declared in `TAG_PUSH_XFAIL` by the follow-up; the baseline is
pinned by `FROZEN_MATRICES` / `FROZEN_BASE_COMMITS` and proved by `bloom-frozen-matrices` regardless, and
`56f91f4` is on `main`, so nothing can orphan it.

## 7. THE WORST CORNER — RULED (Oct 23): COARSEN THE EDGE, TOLD; built the same day

`node tools/bloom-texture-corner.mjs` measured three mechanisms on Oct 22 (PEBBLE at the 0.4 floor, EXPORT, the
1,500,000 budget) and none was picked; the table is kept as the record the ruling was made on:

| state | export triangles at 0.4 mm |
|---|---|
| the default | 151,792 (10.1%) |
| 40 × 1 whorl | 759,472 (50.6%) |
| 40 × 3 whorls | **1,542,832 (102.9%)** |
| 40 × 3 + 8 sepals + a 60 mm leaf on a 60 mm stem | **1,704,306 (113.6%)** |

- A. Refuse (the page did). B. Cap the head count (38 of 40 fit at 3 whorls). C. Coarsen the edge (the petals-only
  hook read 0.5 mm as the finest ladder rung that fits at 40 × 3; the ladder was 0.4 / 0.5 / 0.6 …).

**Eva's ruling (Oct 23): C, told.** *When a textured build would exceed the export budget at the 0.4 mm lattice
edge, the edge coarsens to the finest edge that fits, never coarser than 0.5 mm. The read-out shows the edge
actually used whenever it differs from 0.4 mm. If even 0.5 mm does not fit, refuse and say so. The edge is DERIVED
from the budget, never typed per state.*

### 7a. What was built

- **`buildBloomInto` is wrapped once more** (THE EDGE CAP, beside `textureFor` in `bloom-geometry.js`). A textured,
  unrefused, unpinned build goes straight into the caller's accumulator at the ruled 0.4 mm — **a build that fits
  pays nothing** — and only when that count is over `EXPORT_TRI_BUDGET` does the cap bisect the rungs of
  `TEXTURE_EDGE_GRID_MM` (0.01) between 0.4 and `TEXTURE_EDGE_CAP_MM` (0.5) with real whole-bloom trial builds
  (a count is an integer and the lattice counts fall with a coarser edge, so the finest fitting rung is what the
  bisection returns: the cap first, then halving). Past the cap the build stands at 0.5 and the export is refused
  as before, with the reason on the read-out. `textureEdgeRung(k) = (40 + k) / 100`, the correctly rounded
  decimals, so a derived 0.45 and a pinned 0.45 are one double.
- **ONE EDGE FOR THE WHOLE BLOOM.** `TEXTURE_EDGE_IN_FORCE` is the rung under trial, read by every organ through
  `textureEdgeInForce` — petals, sepals, leaves, leaflets, and every floret of an inflorescence (a nested
  `buildBloomInto` inherits it and decides nothing). The summary counts every blade whose edge differs from the
  bloom's (`edgeMismatch`, TX9 holds it at 0).
- **`cap.textureEdgeMm` is a PIN now and reaches every organ** (it was petals-only, so the corner tool's Oct 22
  whole-bloom figures at 0.5 were 1,200,466 where every organ on 0.5 reads 1,155,726). A pinned edge switches
  the derivation off; it is how the corner tool measures past the cap, how the sheet renders the refused 0.4 mm
  corner, and the route TX9 takes to rebuild the next finer rung.
- **The record**: `texture.edgeCap = { askedMm, usedMm, capMm, gridMm, budget, pinned, trials: [{edgeMm, tris}…],
  fits }`; `texture.edgeMm` and every blade's `edgeMm` are the edge used.
- **The read-out** (`textureLine`): `on a 0.41 mm lattice — COARSENED from the ruled 0.40 mm to fit the 1,500,000
  export budget (0.40 mm: 1,542,832, 0.41 mm: 1,478,672, 0.42 mm: 1,376,432, 0.45 mm: 1,154,352, 0.50 mm:
  1,038,992; the finest edge that fits, never past 0.50)`; past the cap `— EVEN 0.50 mm DOES NOT FIT (1,795,898
  tris): the export will be REFUSED`; a pinned edge says PINNED. At the ruled edge the line is what it was. The
  Feature size slider's read-out reads the SHOWN build's edge too.
- **The decision reads `acc.triangleCount` in the caller's own mode** (the ramp decision's precedent); the two
  STL gates hold `tris(live) === tris(export)` on every row, which is what makes the derived edge mode-free —
  measured on the corner: live and export both land on 0.41 with the identical five trials.
- **Cost**: the corner pays five builds (0.40, 0.50, 0.45, 0.42, 0.41 — 17.7 s in Node where one build is 4.3 s);
  every build under the budget pays its one build as before; the shipping default is untouched (151,792 at 0.4,
  one trial).

### 7b. Which states trip it (EXPORT, PEBBLE — the count reads neither the pattern nor the height)

| state | at 0.40 mm | the derived edge |
|---|---|---|
| **40 × 3 whorls** (the T3 corner) | 1,542,832 (102.9%) | **0.41 mm → 1,478,672 (98.6%)** |
| 40 × 3 + 8 sepals + a 60 mm leaf on a 60 mm stem (the whole bloom) | 1,704,306 (113.6%) | **0.43 mm → 1,455,802 (97.1%)** |
| 40 × 3 × sheet 2.4 | 1,524,752 (101.7%) | 0.41 mm → 1,440,112 (96.0%) |
| 40 × 3 + 40 sepals (one tier) on a 120 mm stem | 1,919,354 (128.0%) | 0.45 mm → 1,477,594 (98.5%) |
| 40 × 1 + 40 sepals × 4 tiers + whorled leaves (8 nodes) on 120 mm | 1,813,338 (120.9%) | 0.45 mm → 1,414,298 (94.3%) |
| 8 × 1 × petalLength 100 × width 46 + 40 sepals 120 × 30 × 4 tiers | 1,545,786 (103.1%) | 0.41 mm → 1,477,466 (98.5%) |
| 40 × 3 + whorled leaves (8 nodes) on 120 mm | 2,220,298 (148.0%) | **0.50 does not fit** (1,521,098, 101.4%) — REFUSED |
| 40 × 2 + 40 sepals + whorled leaves on 120 mm | 2,289,738 (152.6%) | 0.50 does not fit (1,618,058, 107.9%) — REFUSED |
| 40 × 3 + 40 sepals × 4 tiers + whorled leaves on 120 mm (the matrix's refusal row) | 2,594,618 (173.0%) | 0.50 does not fit (**1,795,898**, 119.7%) — REFUSED |
| UMBEL 12 florets × 12 petals × 1.00, head ON | 2,910,298 (194.0%) | 0.50 does not fit (1,973,978, 131.6%) — REFUSED |
| 40 × 3 × petalLength 100 × width 46 | 8,216,752 (547.8%) | 0.50 does not fit (5,516,272, 367.8%) — REFUSED |
| 40 × 2 whorls · 24 × 3 · CONTINUOUS 120 · FAN 20 a side × 3 · 40 × 3 × the tube · RACEME 12 × 12 × 1.00 | 82.4 / 61.8 / 77.5 / 18.1 / 89.6 / 56.2% | under the budget — the ruled 0.40 |

**No row of the 1,552-row matrix trips it**: the byte partition's predeclared mover list (the BASE tree's own
textured export count over the budget) is exactly the three rows block 79 adds. What trips it is the reachable
space — three whorls of forty, or heavy sepal and leaf complements — and from about 1.5× the budget at 0.4 mm the
0.5 mm cap no longer rescues it and the export is refused as before, said.

### 7c. The gates

- **TX9** (both STL gates, on every textured row): the record's law is the ruled one (asked 0.4, cap 0.5, grid 0.01,
  the budget); the edge used is a rung of the grid and the record's edge; every blade of every organ sits on it;
  `fits` is what the BUILDER's own tally says against the budget; the trial at the ruled edge was over the budget
  iff the edge was coarsened, and the trial at the edge used is the tally; where the edge was coarsened and fits,
  **the next finer rung does not fit — rebuilt in Node through the PIN**, a route the derivation never takes; a
  build that does not fit at the cap stands AT the cap and is a declared export refusal; the read-out names the
  edge used and never claims COARSENED at the ruled edge. TX0 now checks the ASKED edge against the ruling.
- **Three witnessed apex mutants** (`CAP_ROWS`: the corner, the past-the-cap state, the shipped PEBBLE row):
  `the-edge-cap-is-removed` (the corner builds 1,542,832 at 0.4 and is refused), `the-edge-is-typed-at-the-cap`
  (the shipping PEBBLE default is latticed at 0.5 — 102,512 where the ruled edge builds 151,792: the default
  moves), `the-edge-coarsens-past-the-cap` (a state 0.5 cannot hold is coarsened on to 0.6 instead of refusing).
  Each witness reads the MUTATED module's own edge-cap record.
- **Block 79** (3 rows, 1,555): the corner (lands on 0.41), the whole bloom at that count (0.43), and the refusal
  past the cap, declared in `EXPORT_REFUSED_XFAIL` at 1,795,898 (XR1 holds it to the integer). Smoke block 79
  (`--conn` on the anchor). A capped row takes the refused rows' 120 s settle (`TEXTURE_CAP_ROW`), and the apex
  table's rows do too.
- **The byte partition** (`verify-bloom-surface-bytes --movers-predicate texture-edge-cap`, predeclared from the
  BASE tree's own textured export count against the budget, never this tree's record): see §7d.
- **The shipping default is unmoved**: 151,792 triangles, one trial at 0.4, the record `fits: true`, the read-out
  line character for character what it was.

### 7d. The byte partition

`node tools/verify-bloom-surface-bytes.mjs --base <worktree of 908221c> --movers-predicate texture-edge-cap`, six chunks
merged, both modes:

```
MERGED 6 chunks over 1555 rows x 2 modes, predicate texture-edge-cap, base <worktree of 908221c>
partition     : 3 of 3 predeclared movers MOVED (every one must), 1552 holders compared to the bit
export stream : 1,925,286,768 floats over 213,920,752 triangles
captured grid : 82,404,596 values over 9,496 panels (live)
PASS — 0 floats moved on the 1552 holders, positionally, under Object.is; all 3 predeclared movers moved.
```

The movers are block 79's three added rows (the base tree builds them at the ruled edge, this tree on the
derived one); **every one of main's 1,552 rows holds to the bit in both modes** — the nineteen textured rows of
block 77 among them, whose first trial IS the old build. No frozen phase's bytes move (no frozen row trips the
cap: a frozen textured row is one of block 77's, all under the budget). The first chunked run was stopped at the
container's two-hour background limit after rows 0–800; the remaining rows were re-run in four smaller chunks.

### 7e. Clearance with relief over the bead — the numbers (`node tools/bloom-texture-bead.mjs`, re-run on this tree, EXPORT)

Nearest approach of a petal's BLADE (above the root blend) to its neighbour's, skin to skin, textured against
the untextured twin; and the 0.40 mm nib's own fold census (the "petal-to-nib" reading — a petal against its
own apex nib, which is where the bead's two margins meet):

| state | H | PEBBLE neighbour | CELLULAR neighbour | untextured | nib fold (PEBBLE / CELLULAR) |
|---|---|---|---|---|---|
| the default (8 × 35 × 16) | 0.4 | 0.000 mm (crossing, r 16.3 z 3.7) | 0.000 mm | 0.000 mm (the accepted −1.17 mm crossing) | 0 / 0 within-shell pairs |
| | 1.5 | 0.000 mm (r 18.1 z 5.2) | 0.000 mm | 0.000 mm | **19 pairs / 0.5011 mm** / 0 |
| the narrowest petal (width 8) | 0.4 | **2.621 mm** (r 11.6 z 2.3) | **2.554 mm** | > 3 mm (3.293) | 0 / 0 |
| | 1.5 | **0.740 mm** (r 12.2 z 2.4) | **0.521 mm** | > 3 mm | 0 / 0 |

Read: the default's blades already pass through each other (variance build 1's accepted look), so the relief
creates no crossing there at either height; on the narrowest petal, where the blades are clear by 3.293 mm, the
relief at 0.4 costs 0.67–0.74 mm of it and at 1.5 takes the gap under the 1.00 mm printable gap (0.740 PEBBLE,
0.521 CELLULAR) without closing it. The nib folds only at PEBBLE 1.5 (19 pairs, 0.5011 mm deep), unchanged from
Oct 22 — none of these states is near the budget, so the cap does not touch them.

## 8. Reproduce

```
npm i --no-save three@0.161.0 playwright-core
node tools/verify-bloom-export.mjs --only '^TEXTURE'            # TX in the browser, 19 rows
node tools/verify-bloom-apex-mutants.mjs --rows='^surface texture' --only=<the five ids>
node tools/verify-bloom-panel.mjs --negative-control             # route (ao) among THIRTY-TWO
node tools/bloom-texture-bead.mjs --json <f>                      # §5, Node, ~6 min
node tools/bloom-texture-corner.mjs --json <f>                    # §7, Node — prints the shipped derivation beside the pinned ladder
node tools/verify-bloom-export.mjs --only '^TEXTURE CAP'           # TX9 + XR1 on block 79 (each row ~10 min: five whole-bloom builds)
node tools/verify-bloom-apex-mutants.mjs --only=the-edge-cap-is-removed,the-edge-is-typed-at-the-cap,the-edge-coarsens-past-the-cap
node tools/verify-bloom-surface-bytes.mjs --base <worktree of 908221c> --movers-predicate texture-edge-cap --range a:b --json <chunk> … --merge <chunks>
node tools/shot-bloom-texture-t3.mjs <dir> --png docs/img/bloom-texture-t3.png --bead <f> --corner <f>
node tools/verify-bloom-surface-bytes.mjs --base <worktree of d60e734> --movers-predicate texture --range a:b --json <chunk> … --merge <chunks>
```
