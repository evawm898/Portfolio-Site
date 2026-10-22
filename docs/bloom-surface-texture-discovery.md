# Bloom surface texture — discovery and standalone prototype

**Status: DISCOVERY. Nothing shipped.** `bloom-geometry.js`, `bloom-registry.js`, `bloom.js`,
`bloom.html`, `bloom.css` and every gate are untouched (predeclared before a line was written,
checked by `git diff --stat origin/main` at close — §9). The prototype is new files only, none of
which any workflow names, so no CI run is triggered by this PR:

| file | what it is |
|---|---|
| `bloom-texture-lab-core.js` | the engine: tagged build, subdivision, the two arms, the fields, the measurements |
| `bloom-texture-lab.html` / `.js` | the standalone page (unlinked, `noindex`): A and B side by side on one camera |
| `tools/bloom-texture-lab-measure.mjs` | print reality: wall and gap per vertex, before and after, every arm × mode |
| `tools/bloom-texture-lab-budget.mjs` | the triangle cost, built for the demo states and projected for the cost corners |
| `tools/shot-bloom-texture-lab.mjs` | the ruling sheet → `docs/img/bloom-surface-texture.png` |
| `docs/data/bloom-surface-texture-*.json` | every number in §4 and §5, as measured |

The goal as asked: **surface relief applied as ONE layer over the whole bloom** — petals, leaves,
sepals, stamens, hub, stem — not a per-organ feature, and distinct from the Voronoi infill (no
holes through the sheet).

---

## 1. Premises checked before building

1. **"The final assembled solid" does not exist as one surface on this tree.** The export is a
   soup of individually closed shells that OVERLAP by design and are unioned by the slicer (the
   export contract). There is no outer skin to displace — a post-pass sees each shell's own
   surface, including the parts buried inside another shell. So option A, as built here, is a
   post-pass on the **triangle soup** (every shell displaced along its own mesh normal). A post-pass
   on the true union would need a boolean or a voxel/SDF re-mesh first — **costed below as A′, not
   built**, and it is the first open question (§8 Q1).
2. **The shipped lattice cannot carry a millimetre relief.** Petal columns are ~1.6 mm apart
   (`NV = 10` across a 16 mm blade), rows ~0.6 mm. A 2 mm pebble drawn on that lattice aliases into
   facet noise. **Both arms therefore refine first**; with a feature size λ, an edge of λ/4 is the
   most the prototype allows (the page warns below that).
3. **The floors.** Sheet 1.20 mm against `MIN_FEATURE_MM` 1.00 leaves **0.20 mm** of thickness
   budget on every petal, sepal, leaf, the hub plate and every 1.2 mm rod. The rim bead is
   `RIM_BEAD_RADIUS_MM` 0.5 capped at `RIM_ROOM_FRACTION` 0.45 of the room, the rim floor
   `RIM_FLOOR_MM` 1.0; the Voronoi wall `INFILL_WALL_MM` 1.0 and its hole bar 1.50 mm; the stem wall
   `STEM_MIN_WALL_MM` 1.5. All are declared guesses — **nothing in this project has been printed**.
4. **Every triangle can be attributed without touching an emitter.** Wrapping one accumulator's
   `tri` and reading its call stack names the emitter chain of every facet; measured on the four
   demo states, every triangle resolves to an organ, and all but the leaf petioles' (132 triangles,
   feature `other`) to a feature (`skin`, `bead`, `cellSkin`, `cellMargin`, `holeRim`, `rod`, `hub`,
   `stem`), and the builder's own contiguous per-instance
   ranges (`petalsAll[i].tris`, `sepals.built[i].tris`, `leafTriRange` + `leavesBuilt[i].tris`)
   with their captured mid-surfaces (`grid`, `rowCentre`/`rowNormal`) give B the sheet's own normal.

## 2. Where a whole-bloom texture could attach

### (A) post-pass on the finished geometry

**What it is.** One pure function `(positions, opts) → positions'` run after the build, before
the STL is written: refine the soup, compute area-weighted vertex normals, displace by a
world-space field. It knows nothing about organs.

**Files it would touch on integration.**
- a new pure module (`bloom-relief.js`), and **`bloom-geometry.js` at exactly one site**:
  the outermost `buildBloomInto` return. It MUST be inside the geometry module and not in
  `bloom.js`, because every Node gate rebuilds through `buildBloomInto` (X0 compares the page's STL
  against a Node rebuild of the same state) — a relief applied only in `bloom.js` would be a second
  producer of the exported bytes. And only on the **outermost** call: `buildBloomCore` re-enters
  `buildBloomInto` per floret, so a relief inside it would texture each floret before its rigid
  append and again after.
- the **tip-row budget wrapper** in `buildBloomInto` predicts triangles before the relief exists;
  the refusal (`EXPORT_TRI_BUDGET`, XR1/XR2) must count the subdivided total.
- `bloom.js`: the STL handler (`exportStl`, the budget check at `acc.triangleCount`), the live view
  (`buildGeometry`) if the screen is to show the relief, the drag-light build (F7, `DRAG_LIGHT_OVERRIDE`
  — a held slider would have to drop the relief the way it drops the infill cells), the read-out.
- `bloom-registry.js`: the controls (type, height, feature size, mode) and a guard predicate;
  `bloom-file.js` gets them as ordinary fields.
- **the captured channels go stale**: `captureGrid` (the /plot glTF and every gate that reads the
  mid-surface), `captureLamina`, `captureNormals` (the bead's closed-form shading normal) all
  describe the undisplaced sheet.

**Gates it would move, and how.** With the relief OFF by branch, nothing moves (byte-identical by
construction, the usual partition). On a row with relief:
X0 (cross-engine — the ribbing field uses `atan2`/`cos`, which are not correctly rounded;
pebble/cellular use `floor`, products and `sqrt`, which are), **X1/X2 every declared magnitude**,
O1/O2, T0–T4 (thickness read off the exported skins — relief moves it by design), **E0–E7 (the
bead apex no longer sits on the original boundary — the silhouette moves, contradicting the
edge-profile ruling; §8 Q4)**, H0–H3 and I1 (hole rims and the hole bar), TU family, ST9/ST10,
`verify-bloom-grid` clause 2 (captured points found EXACTLY among the emitted vertices — false
under A), every byte tool, V4/V5 and the combination gate's `self` measure (blind: they read the
captured grid, which A does not move), the smoke subset (needs relief rows), and CI time (a relief row is
~16× the triangles of its plain twin at 0.4 mm).

**What it collides with.** Nothing open on GitHub (the only open PRs are #230 and #111). The
collisions are with code merged this month that is still being worked: the budget wrapper, the inflorescence re-entrancy, the F7
drag build, the grid glTF consumers (/plot).

### (B) a shared world-space field sampled inside each emitter

**What it is.** One field `f(x)` owned by one module, sampled by every emitter at the moment it
offsets a point: `emitPanel` displaces the two skins off the mid-surface it already holds,
`rimProfile`/`emitRimLoop` decide what the bead does, `emitInfillPanel` the cell skins and hole
rims, `revolveInto`/`rodInto`/`tipInto` the rods and tips, `buildHubInto` each hub arm,
`buildStemInto` the tube, bore, cut face and plug, the leaf builders their blades, petioles and
rachises. Each emitter knows its own normal, which surfaces are buried, which are a bead.

**Files it would touch.** `bloom-geometry.js` throughout: `emitPanel` (the hottest function in
the file — every leaf, outline-curve, big-petal, infill-margin and tube session of the last month
went through it), `rimProfile`/`emitRimLoop`, `emitInfillPanel` (+ `emitHoleRim`, `emitRimEdge`),
`emitTubeRings`, `revolveInto`, `rodInto`, `tipInto`, `buildHubInto` (four arms), `buildStemInto`
(five arms), `emitLeafBladeInto`, `buildLeafInto`, `buildCompoundLeafInto`. And **the lattice**: B
needs the same refinement A does, and doing it natively means sub-rows and sub-columns inside each
panel. The ROW ladder must not move (`bladeStations`, `NU`, `CURL_START_MIN = 1/NU`, the buckle's
frequency cap, A7/A8, the apex nib's `APEX_ARC_ROWS`, the lobe demand — a long series of rulings sit
on the row count), so sub-rows would be evaluated BETWEEN ladder stations through the existing front
door `petalSurface(...).rowAt(u).sect(v)` — which is session 37's evaluator, built for exactly
"evaluable at any (u, v)". That is the one structural gift on this tree: B can put new points ON
the surface, where A can only put them on chords.

**Gates it would move.** Everything A moves, plus the ones that read EMITTED ROWS against a
restated law (C1, A6, AN3, the L family, FR, OC0–OC5, SP5b, LF families), which would see
sub-rows they do not expect unless the refinement is reported as its own channel. The grid
capture would need a decision: capture the refined lattice or keep the ladder's.

**What it collides with.** Every live owner listed above. B is a many-session integration.

### What the two arms can and cannot do

Rows 2–5 and 7 are measured on the prototype (§4, §7); rows 1 and 6 are the integration's shape.

| | A (post-pass) | B (emitter field) |
|---|---|---|
| one owner, one site | yes | one field, ~20 call sites |
| displacement direction | faceted mesh normal; averaged across a hard edge it points DIAGONALLY and sheds the corner | the sheet's own normal (emulated); rods radial and a hard edge known (a real B — the emulation uses the mesh normal off the sheets) |
| can leave a feature alone (bead, hole rim, buried foot, crease) | no | yes |
| emboss — both skins move together, thickness unchanged | no (it cannot tell top skin from bottom) | yes |
| new points lie on | the facets' chords | the surface (through `petalSurface`), in a real B |
| triangle cost at a given edge | the red-green split of an arbitrary soup: slivers, 4.1× the ideal on the default at 0.4 mm (§5) | its own lattice refined in (u, v): near the ideal 2A/e² |
| seams between organs | continuous in VALUE (one world field) but each shell's relief continues under the other; buried faces are textured | the same field, and buried faces can be left alone |

## 3. The prototype

`bloom-texture-lab.html` builds the bloom with the shipped `buildBloomInto` (export mode),
tags every triangle, refines to the edge on the slider (red-green, midpoints keyed on the welded
edge, so every closed shell stays closed — **0 boundary edges on the displaced mesh in every run
of §4, both arms**, and the non-manifold count the subdivided baseline carries, except A on the
infill, §7.5), then draws A on the left and B on the right on one
camera. Four demo states (each `DEFAULTS` plus a written-down delta in `DEMO_STATES`): the shipped
default (8 petals + hub), a whole bloom (stem 60 mm, 3 leaves, 5 sepals, 12 stamens, the style),
the Voronoi infill at its ruled defaults, and the tube (layer 1 fused).

**Three relief types**, each a scalar field of WORLD position in [0, 1]:
`pebble` (2-octave gradient noise at the feature size), `cellular` (Worley F2−F1: raised cells,
grooved boundaries), `ribbing` (radial spokes about the bloom axis — spacing = the feature size at
20 mm radius; on the stem it reads as vertical fluting; one reading of "directional", §8 Q6).
**Height H is peak-to-valley** (§8 Q2). **Modes:** `outward` (s ∈ [0, H], only ever rises out of
the solid), `inward` (s ∈ [−H, 0]), `centred` (s ∈ [−H/2, H/2]), and B-only `emboss` (both skins of
a sheet move along the SHEET normal by H·(f − ½), the field sampled on the mid-surface so the two
skins read one value; non-sheet surfaces fall back to centred).

**How B is emulated, stated plainly.** B is not inside the emitters. It is the same refined mesh as
A with three things A cannot have: (i) on a sheet skin the direction is the captured mid-surface
normal (signed to the skin), (ii) masks — bead, hole rim, buried foot (captured rows with u = 0),
and any vertex where two facets differ by more than 50° — faded over 0.6 mm of edge distance,
(iii) emboss. What the emulation does NOT do that a real B would: put the new points on the
surface instead of the chords, and texture the tube ring and the leaf petiole with their own
normal (neither has a captured mid-surface here, so B treats them as A does).

## 4. Print reality — SLS PA12

`node tools/bloom-texture-lab-measure.mjs --resume --out docs/data/bloom-surface-texture-measure.json`
(Node only; every figure below is in that JSON). **Mode and sampling, named:** EXPORT geometry,
subdivided to a 0.4 mm edge (the whole bloom at 0.6 mm and a 2.5 mm feature: at 0.4 mm it is 1.92 M triangles and a run does
not fit a measurement chunk; **its stem column is invalid, §7.6**), feature size
2.0 mm, every 5th vertex sampled, rays capped at 2.5 mm; B with all four masks on, fade 0.6 mm.

Per sampled vertex, two lengths on the displaced mesh against the same vertex undisplaced:
**WALL** — along the shipped inward normal to the vertex's own shell (floor `MIN_FEATURE_MM` 1.00);
**GAP** — along the outward normal to anything (floor 1.00; on a Voronoi hole rim, the hole bar
1.50). Columns: **newly < 1.0** = at or over the floor before, under it after (count and share of
the class's finite-baseline samples); **thin p99** = the 99th percentile of (wall before − wall
after), negative = thickened; **folds** = a wall that was ≥ 0.5 mm and reads under 0.05 mm after —
the displaced surface passing through itself. Baselines name what is ALREADY under 1.0 along a
normal (a bead's flank, the tube ring trimmed to half thickness under each petal by design) —
those are not counted as "newly".

Classes: **skin** (petal/sepal/leaf skins and infill cell skins), **bead** (rim beads and the infill
margin bead), **holeRim** (the Voronoi hole beads), **rod** (stamens, style, anthers, stigma),
**hub**, **stem**, **tubeRing**. Every displaced mesh in every row has **0 boundary edges**; the
non-manifold column equals the subdivided baseline everywhere except A on the infill (§7.5).

#### default — shipped 24,688 tris, 403,616 after the split

Baseline (no relief): skin min wall 0.696 (34/30835 under 1.0) · bead min wall 0.978 (251/5075 under 1.0) · hub min wall 1.200 (0/4456 under 1.0)

| relief | H | arm | mode | skin: newly < 1.0 · thin p99 · folds | bead: newly < 1.0 · thin p99 · folds | hub: newly < 1.0 · thin p99 · folds | gap newly < 1.0 (all) | hole bar newly < 1.5 |
|---|---|---|---|---|---|---|---|---|
| pebble | 0.1 | A | outward | 0 (0.0%) · -0.023 · 1 | 0 (0.0%) · -0.027 · 0 | 0 (0.0%) · -0.014 · 0 | 13 | — |
| pebble | 0.1 | A | inward | 4554 (14.8%) · 0.181 · 53 | 1260 (33.7%) · 1.881 · 40 | 3 (0.1%) · 0.186 · 0 | 21 | — |
| pebble | 0.1 | A | centred | 380 (1.2%) · 0.078 · 7 | 123 (3.3%) · 0.134 · 10 | 0 (0.0%) · 0.086 · 0 | 12 | — |
| pebble | 0.1 | B | outward | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.011 · 0 | 7 | — |
| pebble | 0.1 | B | inward | 3952 (12.8%) · 0.175 · 0 | 62 (1.7%) · 0.269 · 0 | 4 (0.1%) · 0.186 · 0 | 0 | — |
| pebble | 0.1 | B | centred | 86 (0.3%) · 0.074 · 0 | 1 (0.0%) · 0.115 · 0 | 0 (0.0%) · 0.086 · 0 | 0 | — |
| pebble | 0.1 | B | emboss | 1 (0.0%) · 0.004 · 0 | 6 (0.2%) · 0.119 · 0 | 0 (0.0%) · 0.086 · 0 | 0 | — |
| pebble | 0.2 | A | outward | 0 (0.0%) · -0.045 · 3 | 0 (0.0%) · -0.048 · 0 | 0 (0.0%) · -0.028 · 0 | 19 | — |
| pebble | 0.2 | A | inward | 18721 (60.7%) · 0.365 · 85 | 1783 (47.8%) · 2.216 · 86 | 2037 (48.7%) · 0.375 · 0 | 50 | — |
| pebble | 0.2 | A | centred | 1081 (3.5%) · 0.158 · 22 | 315 (8.4%) · 0.321 · 14 | 2 (0.0%) · 0.172 · 0 | 13 | — |
| pebble | 0.2 | B | outward | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.022 · 0 | 7 | — |
| pebble | 0.2 | B | inward | 17434 (56.5%) · 0.349 · 0 | 607 (16.3%) · 0.545 · 0 | 1882 (44.9%) · 0.372 · 0 | 14 | — |
| pebble | 0.2 | B | centred | 733 (2.4%) · 0.149 · 0 | 17 (0.5%) · 0.237 · 0 | 2 (0.0%) · 0.172 · 0 | 1 | — |
| pebble | 0.2 | B | emboss | 7 (0.0%) · 0.009 · 0 | 23 (0.6%) · 0.243 · 0 | 2 (0.0%) · 0.172 · 0 | 3 | — |
| pebble | 0.3 | A | outward | 1 (0.0%) · -0.068 · 4 | 0 (0.0%) · -0.051 · 0 | 0 (0.0%) · -0.042 · 0 | 26 | — |
| pebble | 0.3 | A | inward | 26452 (85.8%) · 0.550 · 99 | 2248 (60.2%) · 2.236 · 230 | 3435 (82.0%) · 0.584 · 0 | 102 | — |
| pebble | 0.3 | A | centred | 2326 (7.5%) · 0.239 · 35 | 455 (12.2%) · 1.471 · 29 | 186 (4.4%) · 0.258 · 0 | 27 | — |
| pebble | 0.3 | B | outward | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.033 · 0 | 7 | — |
| pebble | 0.3 | B | inward | 24428 (79.2%) · 0.524 · 0 | 1039 (27.8%) · 0.818 · 0 | 3200 (76.4%) · 0.558 · 0 | 36 | — |
| pebble | 0.3 | B | centred | 1923 (6.2%) · 0.224 · 0 | 75 (2.0%) · 0.340 · 0 | 180 (4.3%) · 0.258 · 0 | 6 | — |
| pebble | 0.3 | B | emboss | 10 (0.0%) · 0.013 · 0 | 89 (2.4%) · 0.367 · 0 | 180 (4.3%) · 0.258 · 0 | 5 | — |
| pebble | 0.5 | A | outward | 7 (0.0%) · -0.111 · 11 | 1 (0.0%) · -0.054 · 0 | 0 (0.0%) · -0.070 · 0 | 40 | — |
| pebble | 0.5 | A | inward | 29603 (96.0%) · 0.921 · 122 | 2952 (79.1%) · 2.341 · 549 | 4025 (96.1%) · 1.189 · 23 | 167 | — |
| pebble | 0.5 | A | centred | 5442 (17.6%) · 0.404 · 50 | 650 (17.4%) · 2.002 · 57 | 678 (16.2%) · 0.436 · 0 | 55 | — |
| pebble | 0.5 | B | outward | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.054 · 0 | 12 | — |
| pebble | 0.5 | B | inward | 27382 (88.8%) · 0.875 · 0 | 1816 (48.6%) · 1.264 · 0 | 3892 (93.0%) · 0.977 · 0 | 56 | — |
| pebble | 0.5 | B | centred | 4898 (15.9%) · 0.372 · 0 | 235 (6.3%) · 0.560 · 0 | 643 (15.4%) · 0.430 · 0 | 12 | — |
| pebble | 0.5 | B | emboss | 23 (0.1%) · 0.022 · 0 | 230 (6.2%) · 0.614 · 0 | 643 (15.4%) · 0.430 · 0 | 14 | — |
| cellular | 0.3 | A | outward | 9 (0.0%) · -0.009 · 12 | 0 (0.0%) · -0.020 · 0 | 0 (0.0%) · -0.006 · 0 | 35 | — |
| cellular | 0.3 | A | inward | 24561 (79.7%) · 0.598 · 59 | 2239 (60.0%) · 2.296 · 316 | 3130 (74.8%) · 1.144 · 17 | 128 | — |
| cellular | 0.3 | A | centred | 6166 (20.0%) · 0.293 · 48 | 639 (17.1%) · 1.576 · 30 | 586 (14.0%) · 0.295 · 0 | 41 | — |
| cellular | 0.3 | B | outward | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.005 · 0 | 12 | — |
| cellular | 0.3 | B | inward | 22685 (73.6%) · 0.592 · 0 | 1038 (27.8%) · 0.935 · 0 | 2941 (70.2%) · 0.638 · 0 | 50 | — |
| cellular | 0.3 | B | centred | 5598 (18.2%) · 0.291 · 0 | 332 (8.9%) · 0.441 · 0 | 548 (13.1%) · 0.293 · 0 | 11 | — |
| cellular | 0.3 | B | emboss | 35 (0.1%) · 0.036 · 0 | 362 (9.7%) · 0.466 · 0 | 548 (13.1%) · 0.293 · 0 | 15 | — |
| ribbing | 0.3 | A | outward | 3 (0.0%) · -0.001 · 7 | 0 (0.0%) · -0.018 · 0 | 0 (0.0%) · 0 · 0 | 27 | — |
| ribbing | 0.3 | A | inward | 20183 (65.5%) · 0.600 · 99 | 2150 (57.6%) · 2.270 · 400 | 2497 (59.6%) · 1.156 · 16 | 112 | — |
| ribbing | 0.3 | A | centred | 9382 (30.4%) · 0.299 · 39 | 673 (18.0%) · 1.732 · 41 | 1145 (27.3%) · 0.300 · 0 | 32 | — |
| ribbing | 0.3 | B | outward | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 7 | — |
| ribbing | 0.3 | B | inward | 18559 (60.2%) · 0.599 · 0 | 1036 (27.7%) · 0.953 · 0 | 2394 (57.2%) · 0.600 · 0 | 44 | — |
| ribbing | 0.3 | B | centred | 8638 (28.0%) · 0.299 · 0 | 315 (8.4%) · 0.450 · 0 | 1076 (25.7%) · 0.300 · 0 | 8 | — |
| ribbing | 0.3 | B | emboss | 23 (0.1%) · 0.028 · 0 | 295 (7.9%) · 0.451 · 0 | 1076 (25.7%) · 0.300 · 0 | 10 | — |

#### whole — shipped 59,012 tris, 723,690 after the split

Baseline (no relief): skin min wall 0.572 (67/18463 under 1.0) · bead min wall 0.767 (8/4548 under 1.0) · rod min wall 1.141 (0/5177 under 1.0) · hub min wall 1.200 (0/1049 under 1.0) · stem min wall 0.326 (12/42938 under 1.0) · other min wall 1.159 (0/214 under 1.0)

| relief | H | arm | mode | skin: newly < 1.0 · thin p99 · folds | bead: newly < 1.0 · thin p99 · folds | rod: newly < 1.0 · thin p99 · folds | hub: newly < 1.0 · thin p99 · folds | stem: newly < 1.0 · thin p99 · folds | gap newly < 1.0 (all) | hole bar newly < 1.5 |
|---|---|---|---|---|---|---|---|---|---|---|
| pebble | 0.3 | A | outward | 4 (0.0%) · -0.052 · 16 | 13 (0.4%) · -0.047 · 13 | 0 (0.0%) · -0.037 · 0 | 0 (0.0%) · -0.014 · 0 | 4058 (9.6%) · 1.499 · 4058 | 1168 | — |
| pebble | 0.3 | A | inward | 15827 (85.7%) · 0.589 · 146 | 2206 (68.3%) · 2.169 · 109 | 3443 (67.6%) · 1.138 · 58 | 291 (36.3%) · 0.617 · 1 | 3378 (8.0%) · 1.508 · 2628 | 163 | — |
| pebble | 0.3 | A | centred | 1738 (9.4%) · 0.249 · 25 | 538 (16.7%) · 0.421 · 13 | 357 (7.0%) · 0.233 · 0 | 2 (0.2%) · 0.243 · 0 | 1231 (2.9%) · 1.500 · 1231 | 331 | — |
| pebble | 0.3 | B | outward | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.037 · 0 | 0 (0.0%) · -0.014 · 0 | 4052 (9.6%) · 1.499 · 4052 | 1101 | — |
| pebble | 0.3 | B | inward | 14860 (80.5%) · 0.538 · 0 | 1157 (35.8%) · 0.783 · 0 | 3390 (66.6%) · 1.138 · 58 | 267 (33.3%) · 0.839 · 0 | 3376 (8.0%) · 1.508 · 2628 | 155 | — |
| pebble | 0.3 | B | centred | 1528 (8.3%) · 0.239 · 0 | 121 (3.7%) · 0.298 · 0 | 336 (6.6%) · 0.231 · 0 | 2 (0.2%) · 0.243 · 0 | 1231 (2.9%) · 1.500 · 1231 | 304 | — |
| pebble | 0.3 | B | emboss | 165 (0.9%) · 0.103 · 0 | 140 (4.3%) · 0.293 · 0 | 336 (6.6%) · 0.231 · 0 | 2 (0.2%) · 0.243 · 0 | 1231 (2.9%) · 1.500 · 1231 | 308 | — |

#### infill — shipped 108,928 tris, 557,248 after the split

Baseline (no relief): skin min wall 1.086 (0/21563 under 1.0) · bead min wall 0.183 (1574/6498 under 1.0) · holeRim min wall 0.894 (6948/22986 under 1.0) · hub min wall 1.200 (0/4455 under 1.0)

| relief | H | arm | mode | skin: newly < 1.0 · thin p99 · folds | bead: newly < 1.0 · thin p99 · folds | holeRim: newly < 1.0 · thin p99 · folds | hub: newly < 1.0 · thin p99 · folds | gap newly < 1.0 (all) | hole bar newly < 1.5 |
|---|---|---|---|---|---|---|---|---|---|
| pebble | 0.3 | A | outward | 344 (1.6%) · 1.193 · 303 | 115 (2.1%) · 1.155 · 48 | 625 (2.8%) · 1.424 · 667 | 0 (0.0%) · -0.042 · 0 | 173 | 286 (1.2%) |
| pebble | 0.3 | A | inward | 18137 (84.1%) · 1.199 · 3683 | 2542 (45.6%) · 2.079 · 495 | 9560 (42.6%) · 1.288 · 2304 | 3431 (82.0%) · 0.579 · 0 | 130 | 0 (0.0%) |
| pebble | 0.3 | A | centred | 1052 (4.9%) · 1.196 · 501 | 550 (9.9%) · 1.290 · 86 | 1930 (8.6%) · 1.093 · 635 | 190 (4.5%) · 0.258 · 0 | 61 | 51 (0.2%) |
| pebble | 0.3 | B | outward | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.030 · 0 | 8 | 0 (0.0%) |
| pebble | 0.3 | B | inward | 5404 (25.1%) · 0.453 · 0 | 10 (0.2%) · 0.429 · 0 | 136 (0.6%) · 0.910 · 201 | 3193 (76.3%) · 0.558 · 0 | 16 | 0 (0.0%) |
| pebble | 0.3 | B | centred | 98 (0.5%) · 0.166 · 0 | 2 (0.0%) · 0.114 · 0 | 5 (0.0%) · 0.104 · 14 | 184 (4.4%) · 0.258 · 0 | 4 | 0 (0.0%) |
| pebble | 0.3 | B | emboss | 0 (0.0%) · 0.003 · 0 | 1 (0.0%) · 0.119 · 0 | 11 (0.0%) · 0.093 · 24 | 184 (4.4%) · 0.258 · 0 | 5 | 0 (0.0%) |

#### tube — shipped 24,672 tris, 440,256 after the split

Baseline (no relief): skin min wall 0.696 (33/26631 under 1.0) · bead min wall 0.969 (271/4790 under 1.0) · hub min wall 1.200 (0/4455 under 1.0) · tubeRing min wall 0.118 (2827/8154 under 1.0)

| relief | H | arm | mode | skin: newly < 1.0 · thin p99 · folds | bead: newly < 1.0 · thin p99 · folds | hub: newly < 1.0 · thin p99 · folds | tubeRing: newly < 1.0 · thin p99 · folds | gap newly < 1.0 (all) | hole bar newly < 1.5 |
|---|---|---|---|---|---|---|---|---|---|
| pebble | 0.3 | A | outward | 1 (0.0%) · -0.071 · 6 | 0 (0.0%) · -0.054 · 0 | 0 (0.0%) · -0.046 · 0 | 0 (0.0%) · -0.043 · 0 | 22 | — |
| pebble | 0.3 | A | inward | 22769 (85.5%) · 0.547 · 104 | 2230 (62.3%) · 2.191 · 193 | 3434 (82.0%) · 0.576 · 0 | 4289 (53.7%) · 0.598 · 60 | 552 | — |
| pebble | 0.3 | A | centred | 1892 (7.1%) · 0.232 · 35 | 482 (13.5%) · 0.454 · 21 | 192 (4.6%) · 0.254 · 0 | 199 (2.5%) · 0.302 · 13 | 166 | — |
| pebble | 0.3 | B | outward | 0 (0.0%) · -0.052 · 0 | 0 (0.0%) · -0.005 · 0 | 0 (0.0%) · -0.032 · 0 | 0 (0.0%) · 0 · 0 | 3 | — |
| pebble | 0.3 | B | inward | 22531 (84.6%) · 0.525 · 0 | 1097 (30.7%) · 0.791 · 0 | 3197 (76.4%) · 0.554 · 0 | 4104 (51.4%) · 0.540 · 5 | 421 | — |
| pebble | 0.3 | B | centred | 1646 (6.2%) · 0.225 · 0 | 78 (2.2%) · 0.339 · 0 | 186 (4.4%) · 0.254 · 0 | 185 (2.3%) · 0.237 · 0 | 53 | — |
| pebble | 0.3 | B | emboss | 10 (0.0%) · 0.016 · 0 | 94 (2.6%) · 0.387 · 0 | 186 (4.4%) · 0.254 · 0 | 185 (2.3%) · 0.237 · 0 | 44 | — |


## 5. Triangle budget

`node tools/bloom-texture-lab-budget.mjs` (EXPORT mode; data in
`docs/data/bloom-surface-texture-budget.json`). **Built** = the prototype's red-green split, run.
**Ideal** = 2·area/e², the count of a regular lattice of edge e over the same area — what an
emitter-native refinement (B, sub-rows through `petalSurface`) would approach; it is an
arithmetic bound, not a build. **Projected** = the corner's own area at the DEFAULT bloom's built
density — a lower bound, because the whole bloom's density came out 2.5× the default's (the
stem's 56 mm slivers, §7.6), and it is labelled as a projection, never a build.

| state | shipped tris | area mm² | e = 0.6 | e = 0.4 | e = 0.3 | e = 0.25 |
|---|---|---|---|---|---|---|
| default (8 petals + hub) | 24,688 | 7,919 | 162,592 (10.8 %) | **403,616 (26.9 %)** | 639,200 (42.6 %) | 836,672 (55.8 %) |
| — ideal 2A/e² | | | 44,000 | 99,000 | 176,000 | 253,000 |
| whole bloom | 59,012 | 14,921 | 723,690 (48.2 %) | **1,921,732 (128.1 %)** | 2,660,164 (177.3 %) | — |
| — of which the STEM (the split's sliver defect, §7.6) | 570 | 1,732 | 429,378 | 1,274,322 | — | — |
| — whole bloom WITHOUT the stem's blow-up | | | 294,312 (19.6 %) | 647,410 (43.2 %) | — | — |
| — ideal | | | 82,900 | 186,500 | 331,600 | 477,500 |
| Voronoi infill | 108,928 | 6,712 | 264,452 (17.6 %) | 557,248 (37.1 %) | 892,522 (59.5 %) | — |
| tube | 24,672 | 8,695 | 183,130 (12.2 %) | 440,256 (29.4 %) | 718,776 (47.9 %) | — |
| `INFILL: x 40 petals x 3 whorls` (the shipped cost corner, 74.7 % plain) — PROJECTED | 1,121,152 | 75,989 | 1,560,105 (104 %) | 3,872,783 (258 %) | 6,133,263 (409 %) | 8,028,049 (535 %) |
| — ideal | | | 422,000 | 950,000 (63 %) | 1,689,000 (113 %) | |
| whole bloom × 40 × 3 — PROJECTED | 401,956 | 89,191 | 1,831,142 (122 %) | 4,545,601 (303 %) | 7,198,793 (480 %) | 9,422,761 (628 %) |
| — ideal | | | 495,500 | 1,114,900 (74 %) | 1,982,000 (132 %) | |

**The whole bloom's breach is the prototype's, not the relief's.** At 0.4 mm the stem alone is
1,274,322 of its 1,921,732 triangles against an ideal of 21,648 — the sliver defect of §7.6.
Per organ at 0.4 mm, built (ideal): petals 359,072 (92,034) · sepals 80,130 (21,835) · leaves
100,632 (25,332) · stamens 60,960 (16,333) · style 11,480 (2,297) · hub 35,136 (7,040).

**What it says.** Any relief at a 2 mm feature size (edge ≤ 0.5 mm) costs the default bloom
16× its triangles through a post-pass split, and **the prototype's split is 3.7–10.3× the ideal
lattice** — the cost of refining an arbitrary soup (A) rather than a known lattice (B). The
budget's two shipped corners break at any edge under 0.6 mm through A; through an ideal B lattice
they survive to ~0.4 mm. Live view (§8 Q8) pays the same on every rebuild.

## 6. The ruling sheet

`docs/img/bloom-surface-texture.png` — `node tools/shot-bloom-texture-lab.mjs <dir> --png
docs/img/bloom-surface-texture.png`. Every cell is the page's own split view: **A left, B right,
one camera, one frame**, so no pixel delta is needed and none is quoted. Twenty cells in five
sections:

1. **Seams between organs** — the hub with the feet in it, relief and its no-relief control; the
   whole bloom at the hub-to-stem join (stem, sepals, stamens) and whole. *Read:* both arms are
   continuous across organs (one world field). A textures the hub's rim corner along an averaged
   diagonal normal; B leaves a smooth 0.6 mm halo at every hard edge (the crease fade) — that halo
   is the visible price of B's masks. The no-relief control shows the feet's coplanar z-fight seam
   lines; both arms erase them (coplanar faces get the same displacement).
2. **Relief on / off at beads and cell holes** — petal tip none / B masked / B unmasked; Voronoi
   rims none / B masked / B unmasked. *Read:* A's silhouette goes lumpy (the bead moves); B masked
   keeps the shipped silhouette. On the 1.0 mm Voronoi walls B's masked relief collapses into a
   sharp midline ridge (§8 Q5).
3. **Outward-only vs centred**, plus inward and emboss, petal tip.
4. **The three relief types** on the whole default bloom, and cellular close up. Ribbing converges
   to a moiré at the hub centre (§8 Q6).
5. **The tube ring**, none and pebble (B has no captured mid-surface for the ring here and treats
   it as A does).

## 7. Findings

1. **Outward-only through B is the only combination that newly thins nothing.** Across every state
   and every relief type at 0.3 mm (and at 0.5 mm on the default), B outward reads **0 newly under
   1.0 mm** on skins, beads, hole rims, rods, the hub and the tube ring, and **0 folds**. What it
   costs instead is GAPS and SILHOUETTE: it adds material, so it closes gaps between organs (7–12
   samples on the default at 0.1–0.5 mm; 1,101 on the whole bloom, of which 904 are rods — the 12
   stamens and the style standing within a millimetre of each other — and 94 skins, not located further) and, on any surface it is not masked from, moves the silhouette out
   by up to H. *(The stem rows read otherwise and are INVALID — item 6.)*
2. **Inward breaks the 1.0 mm floor on most of every sheet at any height worth seeing.** With a
   1.20 mm sheet the budget is 0.20 mm: at H = 0.1 mm inward, 12.8–14.8 % of skin samples go under
   the floor; at 0.2 mm 57–61 %; at 0.3 mm 79–86 %. The hub plate and every 1.2 mm rod go the same
   way (rods 67 % at 0.3 mm). Inward is not printable on the shipped sheet without thickening it
   (§8 Q3).
3. **Centred costs 0.3–1.2 % of skin at 0.1 mm, 2.4–3.5 % at 0.2, 6–9 % at 0.3, 16–18 % at 0.5**
   (pebble; the other types are worse at 0.3 mm — cellular 18–20 %, ribbing 28–30 %, because their
   fields sit at their extremes over more of the surface). Thinning p99 is ~0.75–0.8 H for
   centred and ~1.8 H for inward, in both arms — the two skins of a 1.2 mm sheet sample nearly the
   same value of a 2 mm field, so the wall moves by nearly twice the one-sided depth (the bound is 2H).
4. **Emboss (B only) is the one sheet mode that keeps the thickness**: 0–0.1 % of skin samples
   newly under at every height and type on the default, the infill and the tube (10 of 30,835 on the
   default at 0.3 mm; thinning p99 0.003–0.036 mm — the residue of projecting each skin vertex onto
   the nearest captured mid-surface sample), but **0.9 % (165 of 18,463, p99 0.10 mm) on the whole
   bloom** — not isolated; the leaves there carry only a per-ROW centre and normal (§3), so their
   projection is the coarsest, and that is the first place to look. What it
   does not cover is everything without a captured mid-surface — the hub, the beads' own fallback,
   the rods, the tube ring — which take centred, and those carry the losses (hub 4.4 % at 0.3 mm).
5. **A breaks the infilled petal even outward-only.** On the Voronoi infill, A outward at 0.3 mm
   puts 625 hole-rim samples (2.8 %) and 344 cell-skin samples (1.6 %) newly under 1.0 mm, 286 hole
   rims (1.2 %) newly under the 1.50 mm hole bar, and **1,018 folds** — the averaged normals at the
   hole-rim beads converge, so the bead's outward displacement crosses the neighbouring skin. A also
   pulls apart the by-design coincident shells the shipped infill carries (224 non-manifold edges
   shipped, 2,624 after the split; A leaves 896–914, B leaves all 2,624 — the coincidence is
   preserved only by an arm that gives coincident points one displacement). B outward reads 0 / 0 /
   0 there. **On the infill, A is not an option at any height this session measured.**
6. **THE STEM ROWS ARE INVALID AS PRINT EVIDENCE — THEY MEASURE THE PROTOTYPE'S SPLIT.** Outward-only
   relief "folds" 9.6 % of stem samples in BOTH arms (4,058 A, 4,052 B), every one located on the
   BORE wall (r = 1.500 mm on the 6 mm stem). Outward relief cannot thin a wall, and the two arms
   agree, which is the tell: the cause is shared. It is the split. A straight tube is exact at two
   stations, so the shipped stem is 570 triangles with edges up to 55.89 mm; red-green bisection of
   those slivers makes **429,378 triangles at a 0.6 mm edge where a regular lattice needs 9,621
   (45×)**, with area/longest-edge² down to 1.8e-3 at the 1st percentile, and the vertex normals of
   those fans are what the relief is displaced along. The fix is an edge-count-aware split (each
   long edge into ⌈L/e⌉ equal segments, shared edges agreeing) or B's own lattice; neither is built.
   **The same caution covers every count where A and B read the same**: the rods' 58 inward folds
   in both arms are not isolated either. A difference BETWEEN the arms is the arm; an agreement may
   be the split.
7. **A folds the rim bead under any inward or centred relief; B with the bead masked never does.**
   Default, pebble 0.3 mm: A inward 230 bead folds, A centred 29, A outward 0; B 0 in every mode.
   The bead is a half-round of radius 0.45 mm whose averaged mesh normals converge; any inward
   displacement along them crosses itself. A also folds a few skin samples even outward-only (1–11 per
   run on the default); the one located (H 0.1) is at the apex nib, where the 0.10 mm mini-face is
   narrower than the relief. The rest were not located individually.
8. **Seams between organs are continuous in both arms, because the field is one world field.**
   Coplanar overlaps (the feet in the hub on the flat default) stay coplanar — both arms erase the
   shipped z-fight seam lines. What differs at a seam is the EDGE: A sheds every hard corner along a
   diagonal averaged normal (the hub's rim, every buried end wall); B's crease fade leaves a smooth
   0.6 mm halo at every hard edge (sheet §1). Neither arm can see where one shell's surface vanishes
   into another, so neither fades the relief at an organ boundary — that would need the union (A′).
9. **The lattice is the cost, not the field.** Displacing the default's 202 k vertices is
   85 ms (A) and 361 ms (B, with its mask distances) in Node; the split is 3.6 s and multiplies the triangle count 16× on the default at
   0.4 mm (§5). The emulated B paid the same split as A; a real B would refine its own lattice in
   (u, v) at ~1/4 of the count and put the new points on the surface rather than the chords.
10. **The relief is visible at 0.3 mm with a 2 mm feature under raking light and close to invisible
    at a whole-bloom distance** (sheet §4). Whether it RESOLVES in PA12 at that scale is not
    knowable from this repository (§8 Q10).

## 8. Open questions for Eva

Every one of these is a contradiction or an ambiguity the session found and did NOT resolve.

1. **Which "final assembled solid"?** The export is overlapping closed shells unioned by the slicer;
   there is no one outer surface. (A) as built textures every shell's own surface, buried parts
   included. (A′) — a true union first (voxel/SDF re-mesh or a mesh boolean), then one displacement
   of the outer skin — would make the seams vanish and textures nothing buried, but it re-meshes the
   whole bloom (every gate that reads emitted structure — rows, beads, the captured grid — loses its
   subject) and at a 0.1 mm voxel (a tenth of the 1.0 mm sheet, so a 0.3 mm relief is three voxels
   deep) the default bloom's measured 81.4 × 81.4 × 15.7 mm box is ~104 M voxels. Not built. Did you mean A or A′?
2. **What does "relief height" measure?** Built as PEAK-TO-VALLEY H (the field spans [0, H]).
   Amplitude (±H) would double every thinning figure in §4.
3. **Does the relief count against the 1.0 mm floor, or does the sheet thicken to make room?** On
   the shipped 1.20 mm sheet there is 0.20 mm of budget: measured in §4, `inward` breaks the floor at
   any height ≥ 0.1 mm and `centred` at 0.2 mm. The alternatives are (a) outward-only, (b) relief
   rides on a sheet thickened by H (every T-family gate and the root taper move), (c) emboss (B only),
   (d) accept sub-floor valleys as "texture, not wall" — which is a new printing claim nothing here
   can back.
4. **The edge-profile ruling says the bead's apex stays ON the original boundary — the silhouette
   does not move.** A whole-bloom relief that covers the beads (A cannot avoid it) moves the
   silhouette by up to H at every rim. Which wins: "one layer covering everything" or the ruled rim?
5. **Should the relief reach the beads, the Voronoi hole rims and the tube ring at all?** B can
   leave them alone; the sheet shows both. Measured: on a 1.0 mm Voronoi wall a 0.6 mm fade from
   both rims leaves only the wall's MIDLINE at full relief, so B's masked relief becomes a sharp
   ridge along every wall (sheet §2, the masked hole cell). With the rims textured, outward relief
   narrows the 1.50 mm hole bar (§4). One of those has to give on an infilled bloom.
6. **"Directional ribbing" — directional relative to what?** Built as radial spokes about the
   bloom axis (one world field; it converges to a moiré at the hub centre and becomes vertical
   fluting on the stem). The alternatives: a fixed world direction (parallel corrugation across the
   whole bloom), or along each organ's own length (veins — but that is a PER-ORGAN field in each
   organ's own (u, v), which contradicts "one layer, one shared field", and only B can do it).
7. **Buried surfaces** — the petal feet inside the hub, the stem's root band, every overlap the
   export contract relies on. A textures them (it cannot tell). A bump on a buried face within H of
   the visible surface would poke through it (reasoned, NOT measured — no instrument here counts it).
   On the flat default the feet's skins are COPLANAR with the hub's faces, take the same field value
   along the same normal and stay coplanar (the no-relief control shows their z-fight seam lines;
   both arms erase them). Texture buried faces, or not?
8. **Live view or print only?** Showing the relief on screen means drawing the subdivided mesh on
   every rebuild (the default goes 24,688 → 403,616 triangles at 0.4 mm), and the F7 drag build
   would have to drop it as it drops the infill cells.
9. **The triangle budget.** The shipped infill cost corner (74.7 % of the budget plain) projects
   to 258 % at a 0.4 mm edge through a post-pass split and ~63 % through an ideal lattice; the whole-bloom demo state reads 128 % at 0.4 mm in the prototype, but 1.27 M of that
   is the prototype's own stem defect (§7.6) — without it, 43 %. Options: a feature-size floor (the relief's λ sets the edge), an
   emitter-native lattice (B) near the ideal 2A/e², a higher budget, or relief only on some organs —
   which contradicts the ask.
10. **Feature size against print resolution.** The edge-profile ruling put SLS Nylon 12 White's
    resolvable detail at ~0.35–0.4 mm. A relief whose height or feature is under that may simply
    not print, and nothing here has been printed. Is a coupon (the parked cantilever coupon, plus a
    relief strip) owed before any of this is ruled?
11. **Emboss is B's best print number and it is not "surface texture" in the usual sense**: the
    sheet bends, so the underside carries the mirror relief. Is that wanted?
12. **Stamens and the style are 1.2 mm rods** (one sheet, floored with it): any inward relief takes
    them under the floor and outward relief thickens a filament the slenderness line already reports.
    Exempt the rods?

## 9. Reproduce, and what was not touched

```
npm i --no-save three@0.161.0            # the page and the sheet serve three from node_modules
node tools/bloom-texture-lab-measure.mjs --out docs/data/bloom-surface-texture-measure.json   # ~60 min, Node only
node tools/bloom-texture-lab-budget.mjs  --out docs/data/bloom-surface-texture-budget.json    # ~3 min
node tools/shot-bloom-texture-lab.mjs <dir> --png docs/img/bloom-surface-texture.png         # ~2 min, Chromium
```

The page itself: serve the repo root and open `/bloom-texture-lab.html` (it is reachable on the
deploy preview and on production, unlinked and `noindex`).

**Predeclared untouched, and verified by `git diff --stat origin/main...HEAD`:** `bloom-geometry.js`,
`bloom-registry.js`, `bloom.js`, `bloom.html`, `bloom.css`, `bloom-file.js`, `bloom-curve.js`,
`bloom-grid-gltf.js`, every `tools/verify-*`, `tools/bloom-harness.mjs`, every workflow. The PR adds
files only. **No workflow's path filter names any of them**, so the PR starts no Actions run —
Netlify's checks are the only ones it gets, and no gate certifies anything here.

**No matrix row, no frozen phase, no byte moved** — the generator was not changed.

**Instrument honesty.** The two lengths in §4 are per-vertex rays, not a medial-axis thickness;
the first cut cast them along the DISPLACED normal and reported outward-only relief (which cannot
thin anything) thinning a skin by 0.909 mm — the relief's own slope tilting the ray across the
sheet. Both now cast along the shipped surface's normal from the old and the new point. A capped
baseline (no material within 2.5 mm along an in-plane bead normal) is excluded from "newly under",
because a ray newly grazing a neighbouring bump there is not a thinning. The wall cannot see a
thinning between sampled vertices, and the sampling is every 5th vertex.
