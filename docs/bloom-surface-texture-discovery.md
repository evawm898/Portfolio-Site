# Bloom surface texture — discovery and standalone prototype

**Status: DISCOVERY, RULED (§0). Merged as reference — the prototype page, this doc and the sheet. Nothing shipped.**

**[Oct 22, T3: SHIPPED into `bloom-geometry.js` behind a choice guard — `docs/bloom-surface-texture-t3-outcome.md`. §12.8's items: 18 is RULED (1.25×) and one row is declared over it; 19 is moot (texture and infill are exclusive, Q9); 20 stays (the tube ring is out, T5); 21's foot and seam gap are gated on `g > 0` by measurement, buckled petals and tube-lobe rows are refined through the organ's own `rowAt`, florets in their own frame; 22 is discharged by the port.]**
**T1 DONE (Oct 22, §11): the prototype's split is fixed and the prototype re-measured, outward only. Every
stem figure in §4, §5 and §7 before §11 was the red-green split's and is replaced there; prototype files only,
still nothing shipped.**
**T2 DONE (Oct 22, §12): B's own lattice — sub-rows and sub-columns on the true surface for petals, sepals and
leaves, the ladder unmoved to the bit, checked by TX0–TX4 with a must-fail, counted against the conforming
floor (Q14), engine-agreed (Q16), and B re-measured: it still thins nothing. A patched copy of the geometry;
prototype files only, still nothing shipped.** `bloom-geometry.js`, `bloom-registry.js`, `bloom.js`,
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
| `tools/bloom-texture-lab-quality.mjs` | **T1:** triangle quality per organ and the TQ check, with its must-fail (§11.1) |
| `docs/data/bloom-surface-texture-*-t1.json` | **T1:** the quality, the outward re-measure and the budget on the fixed split (§11) |
| `docs/img/bloom-surface-texture-t1-stem.png` | **T1:** the stem before / after the split fix, one camera |
| `bloom-texture-lab-lattice.js` | **T2:** B's own lattice, a runtime-patched copy of `bloom-geometry.js` (§12.1) |
| `tools/bloom-texture-lab-lattice.mjs` | **T2:** TX0–TX4, `--control`, `--browser` (engine agreement), `--budget` (§12.2–12.5) |
| `docs/data/bloom-surface-texture-*-t2*.json` | **T2:** the TX runs, parity, budget and the outward re-measure on the lattice (§12) |

## 0. Eva's rulings (Oct 22, on #436)

| # | ruling |
|---|---|
| **1** | **ATTACHMENT: B** — one shared world-space field sampled INSIDE the emitters. A and A′ are not built; A′'s costing stays in this doc (§8 Q1) and is PARKED. |
| **2** | **DISPLACEMENT: OUTWARD ONLY. Relief never thins a sheet.** Centred, inward and emboss are dropped; Q11 is moot. Their rows in §4 stay as the measured record that ruled them out, not as options. |
| **3** | **No coupon before integration.** Relief height is ruled FROM RENDERS, so height ships as a CONTROL WITH A FLOOR — never a hardcoded default that assumes it prints. |
| **4** | **VISIBILITY: a light preview while dragging, the full relief on release and in the export** — the always-on print preview's pattern (F7, `dragLight`). Never rebuilt live on every drag. |
| **5** | **/plot is a downstream consumer and gets no say in bloom decisions.** It is out of the collision list. |

The plan these rulings set is §10.

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
- **the captured channels go stale**: `captureGrid` (every gate that reads the mid-surface), `captureLamina`, `captureNormals` (the bead's closed-form shading normal) all
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
drag build.

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
skins read one value; non-sheet surfaces fall back to centred). **[T1: ruling 2 left `outward` only;
the page, the core and the tools no longer offer the other three. Their rows below are the record.]**

**How B is emulated, stated plainly.** B is not inside the emitters. It is the same refined mesh as
A with three things A cannot have: (i) on a sheet skin the direction is the captured mid-surface
normal (signed to the skin), (ii) masks — bead, hole rim, buried foot (captured rows with u = 0),
and any vertex where two facets differ by more than 50° — faded over 0.6 mm of edge distance,
(iii) emboss. What the emulation does NOT do that a real B would: put the new points on the
surface instead of the chords, and texture the tube ring and the leaf petiole with their own
normal (neither has a captured mid-surface here, so B treats them as A does).

## 4. Print reality — SLS PA12

`node tools/bloom-texture-lab-measure.mjs --resume --out docs/data/bloom-surface-texture-measure.json`
(Node only; every figure below is in that JSON). **[T1: every table in this section was measured on the
discovery's RED-GREEN split. Its stem column is invalid — §7.6 — and is struck below; the outward rows
are re-measured on the fixed split in §11.3, beside these.]** **Mode and sampling, named:** EXPORT geometry,
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

**The stem column is struck: it measured the red-green split, not the relief (§7.6).** Re-measured on the
fixed split (§11.3): outward relief newly thins **0** stem samples and folds **0**, in both arms, at 0.6 mm
and at 0.4 mm. The gap column's total includes the struck stem's and the rods' red-green figures (§11.3).

| relief | H | arm | mode | skin: newly < 1.0 · thin p99 · folds | bead: newly < 1.0 · thin p99 · folds | rod: newly < 1.0 · thin p99 · folds | hub: newly < 1.0 · thin p99 · folds | stem: newly < 1.0 · thin p99 · folds | gap newly < 1.0 (all) | hole bar newly < 1.5 |
|---|---|---|---|---|---|---|---|---|---|---|
| pebble | 0.3 | A | outward | 4 (0.0%) · -0.052 · 16 | 13 (0.4%) · -0.047 · 13 | 0 (0.0%) · -0.037 · 0 | 0 (0.0%) · -0.014 · 0 | ~~4058 (9.6%) · 1.499 · 4058~~ invalid (§7.6; §11.3) | 1168 | — |
| pebble | 0.3 | A | inward | 15827 (85.7%) · 0.589 · 146 | 2206 (68.3%) · 2.169 · 109 | 3443 (67.6%) · 1.138 · 58 | 291 (36.3%) · 0.617 · 1 | ~~3378 (8.0%) · 1.508 · 2628~~ invalid (§7.6; mode ruled out, not re-measured) | 163 | — |
| pebble | 0.3 | A | centred | 1738 (9.4%) · 0.249 · 25 | 538 (16.7%) · 0.421 · 13 | 357 (7.0%) · 0.233 · 0 | 2 (0.2%) · 0.243 · 0 | ~~1231 (2.9%) · 1.500 · 1231~~ invalid (§7.6; mode ruled out, not re-measured) | 331 | — |
| pebble | 0.3 | B | outward | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.037 · 0 | 0 (0.0%) · -0.014 · 0 | ~~4052 (9.6%) · 1.499 · 4052~~ invalid (§7.6; §11.3) | 1101 | — |
| pebble | 0.3 | B | inward | 14860 (80.5%) · 0.538 · 0 | 1157 (35.8%) · 0.783 · 0 | 3390 (66.6%) · 1.138 · 58 | 267 (33.3%) · 0.839 · 0 | ~~3376 (8.0%) · 1.508 · 2628~~ invalid (§7.6; mode ruled out, not re-measured) | 155 | — |
| pebble | 0.3 | B | centred | 1528 (8.3%) · 0.239 · 0 | 121 (3.7%) · 0.298 · 0 | 336 (6.6%) · 0.231 · 0 | 2 (0.2%) · 0.243 · 0 | ~~1231 (2.9%) · 1.500 · 1231~~ invalid (§7.6; mode ruled out, not re-measured) | 304 | — |
| pebble | 0.3 | B | emboss | 165 (0.9%) · 0.103 · 0 | 140 (4.3%) · 0.293 · 0 | 336 (6.6%) · 0.231 · 0 | 2 (0.2%) · 0.243 · 0 | ~~1231 (2.9%) · 1.500 · 1231~~ invalid (§7.6; mode ruled out, not re-measured) | 308 | — |

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

**[T1: this table is the RED-GREEN split's and is the record. Every figure on it moved with the split
fix, and the two corners are BUILT now rather than projected — §11.4. The stem rows and the
"whole bloom without the stem's blow-up" row are superseded there.]**

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
| — of which the STEM (the split's sliver defect, §7.6) — **T1: 20,244 and 30,580, §11.4** | 570 | 1,732 | ~~429,378~~ | ~~1,274,322~~ | — | — |
| — whole bloom WITHOUT the stem's blow-up — **T1 builds the whole bloom: 204,440 (13.6 %) and 355,766 (23.7 %), §11.4** | | | ~~294,312 (19.6 %)~~ | ~~647,410 (43.2 %)~~ | — | — |
| — ideal | | | 82,900 | 186,500 | 331,600 | 477,500 |
| Voronoi infill | 108,928 | 6,712 | 264,452 (17.6 %) | 557,248 (37.1 %) | 892,522 (59.5 %) | — |
| tube | 24,672 | 8,695 | 183,130 (12.2 %) | 440,256 (29.4 %) | 718,776 (47.9 %) | — |
| `INFILL: x 40 petals x 3 whorls` (the shipped cost corner, 74.7 % plain) — PROJECTED | 1,121,152 | 75,989 | 1,560,105 (104 %) | 3,872,783 (258 %) | 6,133,263 (409 %) | 8,028,049 (535 %) |
| — ideal | | | 422,000 | 950,000 (63 %) | 1,689,000 (113 %) | |
| whole bloom × 40 × 3 — PROJECTED | 401,956 | 89,191 | 1,831,142 (122 %) | 4,545,601 (303 %) | 7,198,793 (480 %) | 9,422,761 (628 %) |
| — ideal | | | 495,500 | 1,114,900 (74 %) | 1,982,000 (132 %) | |

**The whole bloom's breach is the prototype's, not the relief's** — **confirmed by T1: the fixed split
builds it at 355,766 triangles at 0.4 mm, 23.7 % of the budget (§11.4).** At 0.4 mm the stem alone was
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
   by up to H. *(The stem rows read otherwise and were INVALID — item 6. **T1: the stem re-measures at 0
newly thinned and 0 folds in both arms, and the whole bloom's newly-closed gaps are 328 (B, 0.6 mm), of
which 220 are rods, not 1,101 / 904 — those counts were the red-green split's too. §11.3.**)*
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
6. **THE STEM ROWS WERE INVALID AS PRINT EVIDENCE — THEY MEASURED THE PROTOTYPE'S SPLIT. [T1: FIXED and
   re-measured — §11. The edge-count split alone took the bore's folds from 4,058 to 119, and the rest
   were the same defect one level down (each wall quad cut as two slivers); cut as quads, 0. The paragraph
   below is the discovery's diagnosis, kept as written.]** Outward-only
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
   0.4 mm (§5). **[T1: the fixed split takes ~0.15 s and multiplies it 7.4× (183,168), §11.4.]** The emulated B paid the same split as A; a real B would refine its own lattice in
   (u, v) at ~1/4 of the count and put the new points on the surface rather than the chords.
10. **The relief is visible at 0.3 mm with a 2 mm feature under raking light and close to invisible
    at a whole-bloom distance** (sheet §4). Whether it RESOLVES in PA12 at that scale is not
    knowable from this repository (§8 Q10).

## 8. Open questions for Eva — five RULED (Oct 22), eight still open

Every one of these is a contradiction or an ambiguity the session found and did NOT resolve. The
ruled ones keep their text so the ruling can be read against what it answered.

1. **RULED — B (§0 ruling 1). A′ PARKED.** *The question was:* which "final assembled solid"? The
   export is overlapping closed shells unioned by the slicer; there is no one outer surface. (A) as
   built textures every shell's own surface, buried parts included. **A′'s costing, kept as the record
   of the parked option:** a true union first (voxel/SDF re-mesh or a mesh boolean), then one
   displacement of the outer skin — the seams would vanish and nothing buried would be textured, but it
   re-meshes the whole bloom (every gate that reads emitted structure — rows, beads, the captured grid
   — loses its subject), and at a 0.1 mm voxel (a tenth of the 1.0 mm sheet, so a 0.3 mm relief is three
   voxels deep) the default bloom's measured 81.4 × 81.4 × 15.7 mm box is ~104 M voxels before the
   marching-cubes surface, whose triangle count is that of a 0.1 mm lattice over the whole area (the
   default's 7,919 mm² at 2A/e² is ~1.6 M — over the export budget on the shipping default alone).
2. **OPEN — what does "relief height" measure?** Built as PEAK-TO-VALLEY H: the field spans
   [0, H], so under outward-only H is also the most any surface rises. The alternative is the MEAN
   rise (H/2 for a symmetric field such as the pebble), which is closer to what a viewer reads as
   "how raised". It decides what the control's number means on the panel and the units of its floor
   (Q13). **Blocks T3.**
3. **RULED — OUTWARD ONLY; relief never thins a sheet (§0 ruling 2).** *The question was:* does the
   relief count against the 1.0 mm floor? On the shipped 1.20 mm sheet there is 0.20 mm of budget:
   measured in §4, `inward` breaks the floor at any height ≥ 0.1 mm and `centred` at 0.2 mm.
4. **OPEN — the edge-profile ruling says the bead's apex stays ON the original boundary; the
   silhouette does not move.** Outward relief on a bead moves the silhouette out by up to H at every
   rim. Which wins at the rim: "one layer covering everything" or the ruled rim? Until ruled, T3
   ships the bead UNRELIEVED (the ruled rim holds by construction) with the fade law of §10 T3.
   **Blocks the bead half of T3, not T3.**
5. **OPEN — should the relief reach the Voronoi hole rims and the tube ring?** Measured: on a 1.0 mm
   Voronoi wall a 0.6 mm fade from both rims leaves only the wall's MIDLINE at full relief, so masked
   relief becomes a sharp ridge along every wall (sheet §2, the masked hole cell). With the rims
   textured, outward relief narrows the 1.50 mm hole bar (§4: 286 hole-rim samples, 1.2 %, through A;
   B was not measured with the rims unmasked). T4 costs both remedies (§10). **Blocks T4.**
6. **OPEN — "directional ribbing": directional relative to what?** Built as radial spokes about the
   bloom axis (one world field; it converges to a moiré at the hub centre and becomes vertical fluting
   on the stem). The alternatives: a fixed world direction (parallel corrugation across the whole
   bloom), or along each organ's own length (veins — but that is a PER-ORGAN field in each organ's own
   (u, v), which contradicts "one layer, one shared field"). **Blocks the ribbing value of T3's choice
   control; pebble and cellular do not wait for it.**
7. **OPEN — buried surfaces** — the petal feet inside the hub, the stem's root band, every overlap the
   export contract relies on. A bump on a buried face within H of the visible surface would poke
   through it (reasoned, NOT measured — no instrument here counts it; T5 owes the instrument). On the
   flat default the feet's skins are COPLANAR with the hub's faces, take the same field value along the
   same normal and stay coplanar. Texture buried faces, or not? **Blocks T5's hub half.**
8. **RULED — a light preview while dragging, the full relief on release and in the export (§0 ruling
   4),** the always-on print preview's pattern. *The question was:* live view or print only? Drawing
   the subdivided mesh costs the default 24,688 → 403,616 triangles at 0.4 mm through the prototype's
   split (T2's lattice lowers that, §5).
9. **OPEN — the triangle budget.** The shipped infill cost corner (74.7 % of the budget plain)
   projects to 258 % at a 0.4 mm edge through a post-pass split and ~63 % through an ideal lattice;
   the whole-bloom demo state read 128 % at 0.4 mm in the prototype, but 1.27 M of that was the
   prototype's own stem defect (§7.6). **[T1: on the fixed split the whole bloom is 23.7 % at 0.4 mm, and
   the infill corner, BUILT, is 239 % — §11.4.]** B's own-coordinate lattice (T2) is the
   ruled route toward the ideal; what stays open is what happens at the corners even then: a
   feature-size floor (λ sets the edge, so the refinement is bounded by the floor), a higher budget,
   or relief refused above the budget the way the export already refuses (XR1). **Blocks T2's
   acceptance bar.**
10. **RULED — no coupon before integration (§0 ruling 3).** Height is ruled from renders and ships as
    a control with a floor. *The question was:* is a coupon owed first? The edge-profile ruling put SLS
    Nylon 12 White's resolvable detail at ~0.35–0.4 mm; that figure is the only reference this repo has
    for the floor and is a declared guess.
11. **MOOT — emboss is dropped (§0 ruling 2).** *The question was:* is a sheet that bends, carrying
    the mirror relief underneath, wanted?
12. **OPEN — stamens and the style are 1.2 mm rods** (one sheet, floored with it). Under outward-only
    nothing thins them, but relief thickens a filament the slenderness line already reports and closes
    the gaps between them (904 of the whole bloom's 1,101 newly-closed gaps were rods on the red-green
    split, §7.1; **T1: 220 of 328 at 0.6 mm and 244 of 428 at 0.4 mm, B, §11.3**). Texture the
    rods, or exempt them? **Blocks T5's rod half.**
13. **OPEN, NEW (from ruling 3) — the height control's FLOOR: what value, and in what units?** Ruling 3
    says the height ships with a floor and never a default that assumes it prints, and names no number.
    The candidates this repo can cite are all guesses: ~0.35–0.4 mm (the edge-profile ruling's SLS
    resolvable detail), `MIN_FEATURE_MM` 1.0 (a gap/wall floor, not a height), or a fraction of the
    feature size. Whether the floor is the slider's MINIMUM (so 0 is not reachable and NONE is the
    choice control's job) or a told threshold below which the relief is marked "may not print" is part of
    the question. **Blocks T3.**

## 9. Reproduce, and what was not touched

```
npm i --no-save three@0.161.0            # the page and the sheet serve three from node_modules
# T1 (§11), Node only, each in the FOREGROUND:
node tools/bloom-texture-lab-quality.mjs --out docs/data/bloom-surface-texture-quality-t1.json   # ~1 min; exits 1 on a TQ failure
node tools/bloom-texture-lab-quality.mjs --control                                              # ~1 min; the must-fail, 9 legs
timeout 560 node tools/bloom-texture-lab-measure.mjs --resume --out docs/data/bloom-surface-texture-measure-t1.json  # ~3 min; repeat until "done (complete)"
node --max-old-space-size=12000 tools/bloom-texture-lab-budget.mjs --out docs/data/bloom-surface-texture-budget-t1.json  # ~3 min, the corners built
node tools/shot-bloom-texture-lab.mjs <dir> --png <file>                                        # ~2 min, Chromium
```

**The discovery's own JSONs (`-measure.json`, `-budget.json`) are its record and are not re-run**: they
were measured on the red-green split and in four modes, and the tools no longer make either (the
measure tool takes `--split redgreen` for the split; the modes are gone). Nor is
`docs/img/bloom-surface-texture.png` re-rendered: it is the sheet Eva ruled on, red-green split, all
four modes, and its §3 section can no longer be reproduced by design.

**WHY THE LONG RUNS ARE CHUNKED — THE ACCOUNT, HELD HERE AND ONLY HERE.** The discovery session ran the
§4 sweep (about 60 minutes on the red-green split) once as a single unchunked process; a container
restart killed it about 40 minutes in and every row it had measured was lost with it. The measure tool's
`--resume` (the JSON is rewritten after every run with `complete: false`, and a resumed run skips what is
already in it) and the foreground `timeout 560` chunks are the answer, and Eva made that discipline a rule
for every texture session (§10, (iii)). On the fixed split the whole T1 re-measure is about three minutes
and fits one chunk; the discipline stands regardless.

The page itself: serve the repo root and open `/bloom-texture-lab.html` (it is reachable on the
deploy preview and on production, unlinked and `noindex`).

**Predeclared untouched, and verified by `git diff --stat origin/main...HEAD` — on the discovery PR
(#436) and again on T1's:** `bloom-geometry.js`,
`bloom-registry.js`, `bloom.js`, `bloom.html`, `bloom.css`, `bloom-file.js`, `bloom-curve.js`,
`bloom-grid-gltf.js`, every `tools/verify-*`, `tools/bloom-harness.mjs`, every workflow. The
discovery PR added files only; T1 edits only the prototype's own files and adds one tool, its data and
one image. **No workflow's path filter names any of them**, so the PR starts no Actions run —
Netlify's checks are the only ones it gets, and no gate certifies anything here.

**No matrix row, no frozen phase, no byte moved** — the generator was not changed.

**Instrument honesty.** The two lengths in §4 are per-vertex rays, not a medial-axis thickness;
the first cut cast them along the DISPLACED normal and reported outward-only relief (which cannot
thin anything) thinning a skin by 0.909 mm — the relief's own slope tilting the ray across the
sheet. Both now cast along the shipped surface's normal from the old and the new point. A capped
baseline (no material within 2.5 mm along an in-plane bead normal) is excluded from "newly under",
because a ray newly grazing a neighbouring bump there is not a thinning. The wall cannot see a
thinning between sampled vertices, and the sampling is every 5th vertex.

## 10. B's session plan (proposed, Oct 22 — for ruling)

The Voronoi port's shape (`docs/bloom-infill-port-plan.md` §6): each session is one mechanism,
prototype-first where the numbers would otherwise be measured on a state that will not ship. Every
session **(i)** touches no shipped file it does not name, **(ii)** proves the guard byte-identical
(relief NONE moves 0 floats over the whole matrix in both modes — `verify-bloom-surface-bytes`'
partition, movers predeclared from the BASE tree's record), and **(iii) runs every long measurement
in the FOREGROUND, chunked and checkpointed (`--resume`), with no background waiter and no scheduled
check-in** (Eva, Oct 22; the run it answers — killed by a container restart — is accounted for in §9). The new
gate family is **TX** (free; checked against every assertion prefix in `tools/`), written and seen red
before the geometry it guards, each clause with a must-fail.

**T1 · THE SPLIT, FIXED; THE PROTOTYPE RE-MEASURED.** **[DONE Oct 22 — §11. The bore reads 0 outward
folds; the 1.5×-at-0.6 mm count bar is unreachable by any split of the shipped stem (§11.6) and is met at
0.4 mm; the must-fail is the quality check's `--control` (red-green FAILS it on the stem) and the
measure tool's `--split redgreen`, which brings the 4,058 folds back. It also needed a second step the plan
did not name — coplanar strip quads cut as one unit (§11.1). Four questions it raises for T2/T5 are §11.7.]**
*Prototype only. No gate dependency. No open question blocks it.* **FIRST**, for the infill S1's reason: every number below it — the stem rows, the
rods, the budget — is a property of the split and moves when the split is fixed. Builds: the
**edge-count-aware split** for the stem-sliver defect (§7.6) — each edge into ⌈L/e⌉ equal segments, the
count a pure function of the unordered edge so two triangles sharing it agree, and the triangle filled
by a pattern that takes three per-edge counts (no red-green fan), with a must-fail that restores the fan
and requires the stem fold count back; the prototype page and tools cut to the ruled modes (outward
only; centred / inward / emboss removed, their §4 rows kept as the record); the §4 outward rows and the
§5 budget re-measured, the stem column valid for the first time. **Gates moved: none** (no shipped file).
*Acceptance:* the stem at a 0.6 mm edge within 1.5× of its ideal 9,621 triangles, and 0 outward folds on
the bore.

**T2 · B'S OWN-COORDINATE LATTICE (the budget item).** **[DONE Oct 22 as a PROTOTYPE — §12. The brief said
prototype only, so it is a patched copy and not shipped geometry (§12.8 item 22); TX0–TX4 as below plus a
must-fail; the count bar is the conforming floor (Q14).]** *Shipped geometry, no relief yet. Gated on T1.
Blocked by Q9 for its acceptance bar.* `emitPanel` evaluates SUB-ROWS and SUB-COLUMNS between the ladder's
stations through the existing front door, `petalSurface(...).rowAt(u).sect(v)` (session 37's evaluator),
so new points lie ON the surface and the ladder — `bladeStations`, `NU`, `CURL_START_MIN`, A7/A8, the
nib's arc rows, the lobe demand — does not move: refinement is a factor on the panel, never a station.
Off by branch (factor 1 is the shipped emission, the same doubles). Reachable only through a capability
hook in T2 — no control exists until T3 needs it. The leaf builders (`leafSurface`) and the tube rings
(`emitTubeRings` → `emitPanel` with `periodic`) take the same sub-lattice; the rim (`emitRimLoop`) takes
the refined perimeter as its profile count. **Gates moved:** none at factor 1 (byte partition); at a
factor > 1 every gate that reads EMITTED ROWS (C1, A6, AN3, L, FR, OC0–OC5, SP5b, LF, E, the grid gate's
clause 2) is taught that a refined panel reports its ladder rows and its sub-rows as two channels — the
grid capture keeps the ladder's rows (the captured mid-surface is the ladder's, decided here rather than
left implicit). **TX0–TX2:** sub-points lie on the surface (restated through `petalSurface`, not read
from the emitter), the shared edges between panels and between a panel and its rim agree exactly, and the
triangle count is within a declared factor of 2A/e². *Acceptance (pending Q9):* ~~the default bloom near
99,000 triangles at 0.4 mm where the prototype's split made 403,616;~~ **[STRUCK by Q14, Oct 22 — 2A/e² is
not reachable by a refinement that keeps the shipped edges (§11.7 item 14); the bar is the conforming floor,
derived per organ. §12.7.]** the infill cost corner's figure
reported against the budget, refused or floored per Q9.

**T3 · THE FIELD, THE GUARD, AND OUTWARD RELIEF ON SHEETS.** *Gated on T2. Blocked by Q2 and Q13; the
ribbing value by Q6; the bead half by Q4.* The big one. Builds: **one field module**, pure, world-space,
deterministic across engines (X0 compares Chromium's STL against a Node rebuild at an 8-ulp bar, and
`atan2`/`cos` are not correctly rounded — so the field is built from products, `floor`, `sqrt` and an
integer hash, or quantised onto a grid the way `infillSnap` is); the controls in the registry — a CHOICE
guard (NONE / PEBBLE / CELLULAR [/ RIBBING per Q6]; a CHOICE so the blanket sweep cannot reach it and
`ALL MAX` stays untextured, the infill's precedent), a **height slider whose minimum is the floor of
Q13** (ruling 3: no default that assumes it prints), a feature-size slider whose minimum is tied to
T2's lattice (λ ≥ 4e); **outward relief on the skins of petals, sepals, leaves and the tube ring**,
displaced along the emitter's own sheet normal off the mid-surface it already holds (`emitPanel`'s
`P ± n·t/2` becomes `P ± n·(t/2 + s⁺)`, s⁺ ≥ 0 on the outward side of each skin only); the bead
unrelieved and the skin's relief faded to 0 over a length from the bead's own room (not the prototype's
typed 0.6 mm) until Q4 is ruled; **ruling 4's visibility**: the drag-light build drops the relief
(`DRAG_LIGHT_OVERRIDE` gains the guard), the release and the export build it, gated by the existing D
family. **Gates moved:** X1/X2 on every relief row (a new matrix block, re-recorded, never a widened
band); T0–T4 restated so the exported skin is at least the sheet everywhere (**TX3: relief never thins
— the outward-only ruling as a clause**, measured on the exported file against the shipped thickness
law); the grid gate's clause 2 re-derived to mid ± n·(t/2 + s⁺) with s⁺ restated from the controls; E
unchanged by construction while the bead is unrelieved (and asserted unchanged); panel route, design-file
fields, D family, defaults-bar row for the ruled default; byte partition (0 at the guard); a frozen phase
(rows added); smoke block. **TX4:** the field restated in the harness (a second statement, on purpose —
JS8's precedent) against the emitted displacement.

**T4 · VORONOI WALLS — THE MIDLINE RIDGE.** *Gated on T3. Blocked by Q5.* The sheet's §2 masked-hole cell and Q5's finding: a fade
from both rims on a 1.0 mm wall leaves only the midline at full relief, which draws as a sharp ridge
along every wall. Outward-only rules out cutting into the wall, so the two remedies are costed here for
the ruling and one is built: **(a) the wall's own WIDTH sets the relief** — the amplitude scales by
`clamp((halfWall − beadRoom) / fadeLength, 0, 1)`, read from the infill plan's own wall width (one
owner), so a 1.0 mm wall carries ~0 and a broad cell carries the full relief: no ridge because no
relief; or **(b) the rims take the relief too** — the wall is textured edge to edge with no fade, so no
ridge; but outward relief on a hole rim narrows the aperture, so the PLAN's hole bar must be held at
1.50 mm + 2H for the emitted aperture to keep 1.50 (a plan change; ruling 3 of the infill counts holes
achieved, so the achieved count falls). Plus the margin bead of the infill outline (Q4's answer carries
over). **Gates moved:** the I family (I1's hole bar read on the RELIEVED loops; I11's wall), H0–H3, MB,
the infill byte partition, the infill budget B family. **TX5:** no relief ridge — the relief's own
second difference across a wall is bounded, measured on emitted vertices.

**T5 · HUB, STEM AND RODS — THE NO-MID-SURFACE FALLBACK.** *Gated on T3. The hub half blocked by Q7; the
rod half by Q12.* The prototype had no captured mid-surface for these and fell back to A's mesh normal
(§3); a real B gives each emitter its own analytic normal: the hub's slab faces ±z and its rim radial,
the dome and sphere arms their sphere's normal, the join its own profile normal, the stem's outer wall
radial (the BORE is not visible and is never relieved), the cut face its plane, rods and petioles and the
rachis radial from their own axis (`rodInto`'s frame), anthers and stigma from `tipInto`'s outline.
**Hard edges** (the hub's rim, every buried end wall, the stem's cut and plug): the relief fades to 0
at an edge over a length the emitter owns — the halo the sheet shows in §1 — or runs to the edge on a
face that has no neighbour to shed into; which, per face class, is a look ruling from the sheet.
**Buried faces** per Q7, with the instrument Q7 says is missing: a poke-through count (a relieved
buried vertex outside the enclosing shell, by ray parity against that shell). **Gates moved:** J1–J9
(hub), ST family (ST3/ST10 on the outer wall only), JS/JG (rods read emitted rings — re-derived to the
relieved radius), LF (petiole, rachis), both coverage instruments' R1, the crowding raster (feet on the
hub surface), the combination gate's `leaf-stem` and the floret measures (gaps close by up to 2H — the
outward-only cost, §7.1). **TX6:** each fallback's direction restated from the part's own axis or
surface, not from the mesh.

**T6 · THE SHEET AND THE REMAINING RULINGS.** *Gated on T5.* `tools/shot-bloom-texture-lab.mjs`
rebuilt on the shipped generator: the type square, a height sweep starting AT the floor with the
floor's status in every caption, seams between every organ pair, the Voronoi walls under T4's remedy,
the budget corners with their triangle counts and refusals. Rendering may start on the prototype
earlier; what waits for T5 is rendering the thing that ships.

**What stays open after the plan, named:** the relief's interaction with self-intersection on folded
states (X2 reads the census, and a relieved fold may read deeper — re-records, not a new class);
the cross-shell gaps outward relief closes (§7.1: 904 rod pairs on the whole bloom), which are
over-connection and not a print failure under the crowding ruling, but are the combination gate's
subject the day a pair names them.

## 11. T1 — the split fixed, the prototype re-measured (Oct 22)

**Prototype files only.** `bloom-texture-lab-core.js`, the page (`bloom-texture-lab.html` / `.js`), the
three tools and one new one (`tools/bloom-texture-lab-quality.mjs`), their data
(`docs/data/bloom-surface-texture-*-t1.json`) and one image. No shipped file, no gate, no workflow; the
PR starts no Actions run. T2 is not started. **Mode and sampling, named, for every figure below:** EXPORT
geometry; the split named per figure; the wall/gap rays as §4 (every 5th vertex of the subdivided mesh, so
the populations differ between splits and SHARES compare where raw counts do not); outward relief only.

### 11.1 The split, and the check that holds it

**The 'rows' split** (`subdivide`'s header has the law): every edge into ⌈L/e⌉ equal segments, the points
cached on the welded edge so neighbours share them by construction; a **coplanar strip quad** — two
triangles sharing their mutual longest edge, coplanar to 1e-9 mm, convex, both rails at least as long in
segments as either end — cut as ONE unit, rows across it between its long sides, its diagonal never cut;
any other triangle filled by rows from the corner opposite its least-cut edge, consecutive rows zipped on
the shorter diagonal. ~0.15 s on the default at 0.4 mm, where red-green took 3.6 s.

**It took two steps, and the first was not enough — measured.** The edge-count split alone (every
triangle cut on its own; `--no-pairs` reproduces it) took the stem's outward bore "folds" at 0.6 mm from
**4,058 / 4,052 (A / B) to 119 / 119**, and 205 / 204 at 0.4 mm — 3.3 % of the stem's samples, every one
on the bore at r = 1.500 mm, normal pointing at the axis. Located: each 55.89 × 0.20 mm bore quad cut as two
slivers leaves, near each sliver's apex, a diagonal point and an axial-edge point **0.014 mm apart** whose
area-weighted normals differ by **3.75°** (one lies inside a facet column, the other on its edge), and a
0.16 mm outward push along those normals crosses one over the other. That is still the split. Cut as
quads, the bore reads **0**.

**The check is `node tools/bloom-texture-lab-quality.mjs`** (prototype instrument, not a gate; no CI).
Two references, neither read off the split under test: the IDEAL 2A/e² and the conforming FLOOR
Σ max(n_ab + n_bc + n_ca − 2, 2A/e²) over the shipped triangles (the least a split that keeps every
shipped edge can emit; a paired quad drops its diagonal, which is why 'rows' can read under 1× of it).

| clause | asserts, on the 'rows' split, every state, 0.6 and 0.4 mm |
|---|---|
| **TQ0** | 0 boundary edges in INDEX space, and every non-manifold edge on shipped triangles already non-manifold (the infill's 224 coincident-sheet edges propagate into their rows by construction: 607 at 0.6, 835 at 0.4, 0 new) |
| **TQ1** | every organ within **2.0×** its floor — 'rows' reads 0.52–1.37×, red-green 11.06× / 21.94× on the stem; the bar sits between the two distributions |
| **TQ2** | no fans: per shipped region, the sub-1° pieces at most what its OWN corners force (2·⌈1°/α⌉ per corner); a cap (altitude under e·tan 1°) may be thin throughout, up to 2× its polygon floor; a coplanar strip quad is ONE region and its four corners are judged, so a stem wall quad forces none. The quads are RESTATED in the tool, not read from the split — a split that stopped pairing would otherwise hand over the grouping that excuses it |
| **TQ3** | each shipped triangle's (or paired quad's) pieces sum to its area to 1e-9 and face its way |

**`--control` — 10 of 10 behave:** 'rows' passes at both edges; **red-green FAILS TQ1 and TQ2 on the stem**
at both edges (11.06× / 21.94× its floor, 96 fanning quads, 40.8 % / 32.8 % of the stem under 1°); four
mutants of 'rows', each built in a copy of the core with its anchor checked to match exactly once, fail
what they name — `the-base-row-is-recut` → TQ0 (102,774 boundary edges), `quads-are-cut-as-two-triangles`
→ TQ2 on the stem (T1's intermediate), `the-quad-rows-fan-from-one-corner` → TQ2 on the stem,
`apex-at-the-long-edge` → TQ2. **A first mutant that only dropped the edge cache was INERT and was
replaced**: the points are computed from the lower vertex id either way, so the copies were bit-identical
and welded into one — dropping the cache is harmless, and the mutant named a defect it did not make.
**And the fold half of the plan's must-fail holds too**: `--split redgreen --only whole@0.6` reproduces
the discovery's 4,058 / 4,052 stem folds to the integer through the T1 tool.

### 11.2 Triangle quality per organ, red-green → rows

Smallest angle and aspect (Lmax²/2A; 1.155 equilateral) per organ. **Read the counts beside the
percentiles**: on petals and sepals the p1 angle FALLS (12.52° → 7.63° on the default petal at 0.4 mm) while
the count of triangles under 5° falls too (1,024 → 928) — 'rows' emits half as many triangles, so the
shipped mesh's own thin facets (bead strips, edges already under e, which no split touches) weigh twice as
much in a percentile. The stem is the defect and reads **0 under 1° on 'rows' at both edges** (175,104 and
417,792 on red-green). Data: `docs/data/bloom-surface-texture-quality-t1.json`.

**default** (shipped 24,688)

| organ | edge | tris red-green → rows | × ideal | min angle p1 / p5 / p50 (°) | aspect p99 | under 1° | under 5° |
|---|---|---|---|---|---|---|---|
| petal | 0.6 | 150,688 → **98,800** | 3.68 → 2.42 | 7.35 / 20.93 / 31.5 → 5.95 / 19.93 / 37.78 | 8.3 → 10.6 | 432 → 400 | 928 → 896 |
| hub | 0.6 | 11,904 → **4,608** | 3.85 → 1.49 | 7.37 / 7.37 / 14.87 → 7.37 / 14.39 / 36.68 | 7.9 → 7.9 | 0 → 0 | 0 → 0 |
| petal | 0.4 | 359,072 → **173,568** | 3.9 → 1.89 | 12.52 / 21.8 / 33.59 → 7.63 / 22.02 / 41.84 | 5.1 → 7.7 | 528 → 432 | 1,024 → 928 |
| hub | 0.4 | 44,544 → **9,600** | 6.4 → 1.38 | 7.37 / 7.37 / 14.87 → 7.5 / 21.89 / 39.54 | 7.9 → 7.9 | 0 → 0 | 0 → 0 |

**whole** (shipped 59,012)

| organ | edge | tris red-green → rows | × ideal | min angle p1 / p5 / p50 (°) | aspect p99 | under 1° | under 5° |
|---|---|---|---|---|---|---|---|
| petal | 0.6 | 150,688 → **98,800** | 3.68 → 2.42 | 7.35 / 20.93 / 31.5 → 5.95 / 19.93 / 37.78 | 8.3 → 10.6 | 432 → 400 | 928 → 896 |
| hub | 0.6 | 10,464 → **4,992** | 3.34 → 1.6 | 7.37 / 7.37 / 29.27 → 7.37 / 14.39 / 38.88 | 7.9 → 7.9 | 0 → 0 | 0 → 0 |
| stem | 0.6 | 429,378 → **20,244** | 44.63 → 2.1 | 0.2 / 0.4 / 1.61 → 5.84 / 18.26 / 31.14 | 284.9 → 10.5 | 175,104 → 0 | 375,060 → 163 |
| leaf | 0.6 | 48,766 → **33,894** | 4.33 → 3.01 | 4.08 / 8.43 / 29.93 → 4.28 / 13.56 / 34.39 | 14.1 → 13.6 | 180 → 168 | 1,035 → 444 |
| stamen | 0.6 | 46,224 → **15,680** | 6.37 → 2.16 | 11.64 / 16.52 / 25.14 → 26.67 / 29.66 / 41.67 | 6.5 → 2.9 | 0 → 0 | 0 → 0 |
| style | 0.6 | 5,440 → **1,860** | 5.33 → 1.82 | 11.64 / 11.64 / 23.28 → 26.67 / 27.4 / 35.45 | 5.1 → 2.9 | 0 → 0 | 0 → 0 |
| sepal | 0.6 | 32,730 → **28,970** | 3.37 → 2.99 | 1.95 / 9.89 / 34.8 → 1.89 / 8.94 / 35.74 | 29.7 → 30.6 | 270 → 250 | 590 → 570 |
| petal | 0.4 | 359,072 → **173,568** | 3.9 → 1.89 | 12.52 / 21.8 / 33.59 → 7.63 / 22.02 / 41.84 | 5.1 → 7.7 | 528 → 432 | 1,024 → 928 |
| hub | 0.4 | 35,136 → **12,000** | 4.99 → 1.7 | 7.37 / 7.37 / 24.81 → 7.5 / 23.9 / 38.93 | 7.9 → 7.7 | 0 → 0 | 0 → 0 |
| stem | 0.4 | 1,274,322 → **30,580** | 58.87 → 1.41 | 0.2 / 0.4 / 1.63 → 7.99 / 26.17 / 37.81 | 284.9 → 7.8 | 417,792 → 0 | 1,043,135 → 174 |
| leaf | 0.4 | 100,632 → **59,748** | 3.97 → 2.36 | 4.08 / 11.66 / 30 → 6.11 / 15.62 / 37.71 | 14.1 → 10 | 195 → 174 | 1,629 → 447 |
| stamen | 0.4 | 60,960 → **24,000** | 3.73 → 1.47 | 11.64 / 11.64 / 32.91 → 26.67 / 38.9 / 40.12 | 5.1 → 3 | 0 → 0 | 0 → 0 |
| style | 0.4 | 11,480 → **3,200** | 5 → 1.39 | 11.64 / 11.64 / 26.7 → 26.67 / 38.9 / 43.51 | 8.4 → 2.9 | 0 → 0 | 0 → 0 |
| sepal | 0.4 | 80,130 → **52,670** | 3.67 → 2.41 | 6.47 / 19.78 / 34.93 → 3.91 / 18.1 / 39.41 | 9.5 → 14.7 | 270 → 250 | 590 → 570 |

**infill** (shipped 108,928)

| organ | edge | tris red-green → rows | × ideal | min angle p1 / p5 / p50 (°) | aspect p99 | under 1° | under 5° |
|---|---|---|---|---|---|---|---|
| petal | 0.6 | 252,548 → **197,680** | 7.39 → 5.78 | 0.22 / 1.12 / 15.65 → 0.22 / 1.38 / 17.85 | 284.7 → 281.8 | 11,296 → 6,736 | 64,728 → 38,424 |
| hub | 0.6 | 11,904 → **4,608** | 3.85 → 1.49 | 7.37 / 7.37 / 14.87 → 7.37 / 14.39 / 36.68 | 7.9 → 7.9 | 0 → 0 | 0 → 0 |
| petal | 0.4 | 512,704 → **348,496** | 6.66 → 4.53 | 0.2 / 1.2 / 17.79 → 0.23 / 1.51 / 19.18 | 299.8 → 259.1 | 21,616 → 11,016 | 121,912 → 59,816 |
| hub | 0.4 | 44,544 → **9,600** | 6.4 → 1.38 | 7.37 / 7.37 / 14.87 → 7.5 / 21.89 / 39.54 | 7.9 → 7.9 | 0 → 0 | 0 → 0 |

**tube** (shipped 24,672)

| organ | edge | tris red-green → rows | × ideal | min angle p1 / p5 / p50 (°) | aspect p99 | under 1° | under 5° |
|---|---|---|---|---|---|---|---|
| petal | 0.6 | 129,626 → **84,586** | 3.67 → 2.4 | 6.67 / 21.13 / 31.42 → 4.22 / 17.95 / 39.33 | 9.1 → 14.4 | 432 → 400 | 928 → 896 |
| hub | 0.6 | 11,904 → **4,608** | 3.85 → 1.49 | 7.37 / 7.37 / 14.87 → 7.37 / 14.39 / 36.68 | 7.9 → 7.9 | 0 → 0 | 0 → 0 |
| tube | 0.6 | 41,600 → **22,016** | 4.19 → 2.22 | 2.16 / 8.62 / 28.71 → 2.17 / 21.75 / 34.93 | 26.5 → 26.4 | 0 → 0 | 1,920 → 576 |
| petal | 0.4 | 314,176 → **152,644** | 3.96 → 1.92 | 11.25 / 21.94 / 33.3 → 7.35 / 21.73 / 41.33 | 5.5 → 8.3 | 528 → 432 | 1,024 → 928 |
| hub | 0.4 | 44,544 → **9,600** | 6.4 → 1.38 | 7.37 / 7.37 / 14.87 → 7.5 / 21.89 / 39.54 | 7.9 → 7.9 | 0 → 0 | 0 → 0 |
| tube | 0.4 | 81,536 → **36,256** | 3.65 → 1.62 | 2.16 / 4.32 / 31.11 → 4.32 / 10.81 / 42.67 | 26.5 → 13.3 | 0 → 0 | 4,736 → 576 |

### 11.3 Print reality, outward only — re-measured beside §4

`node tools/bloom-texture-lab-measure.mjs` (data `docs/data/bloom-surface-texture-measure-t1.json`), the
§4 columns (newly < 1.0 mm with its share of the class's finite-baseline samples · thinning p99 ·
folds). The red-green rows are §4's, unchanged; **rows** is T1. The whole bloom is measured at §4's own
0.6 mm / 2.5 mm so it compares like for like, and **also at 0.4 mm / 2.0 mm for the first time** (below the
tables). Every displaced mesh: 0 boundary edges.

#### default — shipped 24,688 · red-green 403,616 → rows 183,168 at 0.4 mm, feature 2 mm

| relief | H | arm | split | skin: newly < 1.0 · thin p99 · folds | bead: newly < 1.0 · thin p99 · folds | hub: newly < 1.0 · thin p99 · folds | gap newly < 1.0 (all) | hole bar newly < 1.5 |
|---|---|---|---|---|---|---|---|---|
| pebble | 0.1 | A | red-green | 0 (0.0%) · -0.0227 · 1 | 0 (0.0%) · -0.0269 · 0 | 0 (0.0%) · -0.0141 · 0 | 13 | — |
| pebble | 0.1 | A | **rows** | 0 (0.0%) · -0.0237 · 0 | 0 (0.0%) · -0.0232 · 0 | 0 (0.0%) · -0.0076 · 0 | 2 | — |
| pebble | 0.1 | B | red-green | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.0109 · 0 | 7 | — |
| pebble | 0.1 | B | **rows** | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.0065 · 0 | 0 | — |
| pebble | 0.2 | A | red-green | 0 (0.0%) · -0.0453 · 3 | 0 (0.0%) · -0.0475 · 0 | 0 (0.0%) · -0.0281 · 0 | 19 | — |
| pebble | 0.2 | A | **rows** | 0 (0.0%) · -0.0474 · 0 | 0 (0.0%) · -0.0462 · 0 | 0 (0.0%) · -0.0152 · 0 | 5 | — |
| pebble | 0.2 | B | red-green | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.0217 · 0 | 7 | — |
| pebble | 0.2 | B | **rows** | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.0131 · 0 | 1 | — |
| pebble | 0.3 | A | red-green | 1 (0.0%) · -0.0678 · 4 | 0 (0.0%) · -0.051 · 0 | 0 (0.0%) · -0.0422 · 0 | 26 | — |
| pebble | 0.3 | A | **rows** | 2 (0.0%) · -0.0711 · 2 | 0 (0.0%) · -0.0614 · 0 | 0 (0.0%) · -0.0227 · 0 | 8 | — |
| pebble | 0.3 | B | red-green | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.0326 · 0 | 7 | — |
| pebble | 0.3 | B | **rows** | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.0196 · 0 | 4 | — |
| pebble | 0.5 | A | red-green | 7 (0.0%) · -0.1107 · 11 | 1 (0.0%) · -0.054 · 0 | 0 (0.0%) · -0.0703 · 0 | 40 | — |
| pebble | 0.5 | A | **rows** | 7 (0.1%) · -0.1171 · 7 | 1 (0.0%) · -0.0711 · 0 | 0 (0.0%) · -0.0379 · 0 | 18 | — |
| pebble | 0.5 | B | red-green | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.0543 · 0 | 12 | — |
| pebble | 0.5 | B | **rows** | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.0326 · 0 | 6 | — |
| cellular | 0.3 | A | red-green | 9 (0.0%) · -0.0086 · 12 | 0 (0.0%) · -0.0198 · 0 | 0 (0.0%) · -0.0059 · 0 | 35 | — |
| cellular | 0.3 | A | **rows** | 6 (0.0%) · -0.0093 · 6 | 0 (0.0%) · -0.013 · 0 | 0 (0.0%) · -0.0069 · 0 | 19 | — |
| cellular | 0.3 | B | red-green | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.005 · 0 | 12 | — |
| cellular | 0.3 | B | **rows** | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.0067 · 0 | 9 | — |
| ribbing | 0.3 | A | red-green | 3 (0.0%) · -0.0011 · 7 | 0 (0.0%) · -0.018 · 0 | 0 (0.0%) · 0 · 0 | 27 | — |
| ribbing | 0.3 | A | **rows** | 1 (0.0%) · -0.0011 · 1 | 0 (0.0%) · -0.0132 · 0 | 0 (0.0%) · 0 · 0 | 12 | — |
| ribbing | 0.3 | B | red-green | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 7 | — |
| ribbing | 0.3 | B | **rows** | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 4 | — |

#### whole@0.6 — shipped 59,012 · red-green 723,690 → rows 204,440 at 0.6 mm, feature 2.5 mm

| relief | H | arm | split | skin: newly < 1.0 · thin p99 · folds | bead: newly < 1.0 · thin p99 · folds | rod: newly < 1.0 · thin p99 · folds | hub: newly < 1.0 · thin p99 · folds | stem: newly < 1.0 · thin p99 · folds | gap newly < 1.0 (all) | hole bar newly < 1.5 |
|---|---|---|---|---|---|---|---|---|---|---|
| pebble | 0.3 | A | red-green | 4 (0.0%) · -0.0524 · 16 | 13 (0.4%) · -0.0466 · 13 | 0 (0.0%) · -0.037 · 0 | 0 (0.0%) · -0.0143 · 0 | 4058 (9.6%) · 1.4994 · 4058 | 1168 | — |
| pebble | 0.3 | A | **rows** | 3 (0.0%) · -0.0506 · 12 | 13 (0.4%) · -0.0486 · 13 | 0 (0.0%) · -0.037 · 0 | 0 (0.0%) · -0.0132 · 0 | 0 (0.0%) · -0.0811 · 0 | 370 | — |
| pebble | 0.3 | B | red-green | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.037 · 0 | 0 (0.0%) · -0.0143 · 0 | 4052 (9.6%) · 1.4994 · 4052 | 1101 | — |
| pebble | 0.3 | B | **rows** | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.037 · 0 | 0 (0.0%) · -0.0132 · 0 | 0 (0.0%) · -0.076 · 0 | 328 | — |

#### infill — shipped 108,928 · red-green 557,248 → rows 358,096 at 0.4 mm, feature 2 mm

| relief | H | arm | split | skin: newly < 1.0 · thin p99 · folds | bead: newly < 1.0 · thin p99 · folds | holeRim: newly < 1.0 · thin p99 · folds | hub: newly < 1.0 · thin p99 · folds | gap newly < 1.0 (all) | hole bar newly < 1.5 |
|---|---|---|---|---|---|---|---|---|---|
| pebble | 0.3 | A | red-green | 344 (1.6%) · 1.1934 · 303 | 115 (2.1%) · 1.1549 · 48 | 625 (2.8%) · 1.4244 · 667 | 0 (0.0%) · -0.0422 · 0 | 173 | 286 |
| pebble | 0.3 | A | **rows** | 36 (0.3%) · -0.0653 · 15 | 100 (2.7%) · 1.2636 · 46 | 600 (3.2%) · 1.4787 · 651 | 0 (0.0%) · -0.0613 · 0 | 141 | 263 |
| pebble | 0.3 | B | red-green | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.0298 · 0 | 8 | 0 |
| pebble | 0.3 | B | **rows** | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · 0 · 0 | 0 (0.0%) · -0.0489 · 0 | 6 | 0 |

#### tube — shipped 24,672 · red-green 440,256 → rows 198,500 at 0.4 mm, feature 2 mm

| relief | H | arm | split | skin: newly < 1.0 · thin p99 · folds | bead: newly < 1.0 · thin p99 · folds | hub: newly < 1.0 · thin p99 · folds | tubeRing: newly < 1.0 · thin p99 · folds | gap newly < 1.0 (all) | hole bar newly < 1.5 |
|---|---|---|---|---|---|---|---|---|---|
| pebble | 0.3 | A | red-green | 1 (0.0%) · -0.0713 · 6 | 0 (0.0%) · -0.054 · 0 | 0 (0.0%) · -0.0457 · 0 | 0 (0.0%) · -0.0429 · 0 | 22 | — |
| pebble | 0.3 | A | **rows** | 1 (0.0%) · -0.0723 · 1 | 0 (0.0%) · -0.0707 · 0 | 0 (0.0%) · -0.0227 · 0 | 0 (0.0%) · -0.0478 · 0 | 9 | — |
| pebble | 0.3 | B | red-green | 0 (0.0%) · -0.052 · 0 | 0 (0.0%) · -0.0051 · 0 | 0 (0.0%) · -0.0323 · 0 | 0 (0.0%) · 0 · 0 | 3 | — |
| pebble | 0.3 | B | **rows** | 0 (0.0%) · -0.0541 · 0 | 0 (0.0%) · -0.0055 · 0 | 0 (0.0%) · -0.0196 · 0 | 0 (0.0%) · 0 · 0 | 1 | — |

**The whole bloom at 0.4 mm, 2.0 mm feature, pebble 0.3 mm outward (new; 355,766 triangles):**
A — skin 3 newly / 12 folds, bead 10 / 10, rod / hub / **stem 0 / 0**; B — **0 newly and 0 folds on every
class**; newly-closed gaps 484 (A) and 428 (B), of which rods 253 and 244. Baseline walls under 1.0 before
any relief, as §4 reports them: stem 11 of 3,058 samples (min 0.055 mm — the florist's cut point and
land, thin by design).

### 11.4 Budget at 0.4 mm — the whole bloom and the corners, built

`node --max-old-space-size=12000 tools/bloom-texture-lab-budget.mjs` (data
`docs/data/bloom-surface-texture-budget-t1.json`), 'rows' split, against the 1,500,000 export budget.
**The two cost corners are BUILT now** (§5 projected them from the default's density).

| state | shipped | e = 0.6 | **e = 0.4** | e = 0.3 | e = 0.25 | ideal at 0.4 |
|---|---|---|---|---|---|---|
| default (8 petals + hub) | 24,688 | 103,408 (6.9 %) | **183,168 (12.2 %)** | 290,416 (19.4 %) | 399,808 (26.7 %) | 98,993 |
| whole bloom | 59,012 | 204,440 (13.6 %) | **355,766 (23.7 %)** | 590,390 (39.4 %) | 791,992 (52.8 %) | 186,519 |
| — of which the stem | 570 | 20,244 | **30,580** | 60,512 | 73,138 | 21,648 |
| Voronoi infill | 108,928 | 202,288 (13.5 %) | **358,096 (23.9 %)** | 535,088 (35.7 %) | 638,432 (42.6 %) | 83,903 |
| tube | 24,672 | 111,210 (7.4 %) | **198,500 (13.2 %)** | 316,912 (21.1 %) | 431,056 (28.7 %) | 108,691 |
| `INFILL: x 40 petals x 3 whorls` (74.7 % plain) — BUILT | 1,121,152 | 2,039,050 (135.9 %) | **3,587,358 (239.2 %)** | 5,448,028 (363.2 %) | 6,576,650 (438.4 %) | 949,864 (63.3 %) |
| whole bloom × 40 × 3 — BUILT | 401,956 | 1,234,000 (82.3 %) | **2,167,718 (144.5 %)** | 3,509,494 (234.0 %) | 4,770,984 (318.1 %) | 1,114,883 (74.3 %) |

Per organ, the whole bloom at 0.4 mm: petals 173,568 · sepals 52,670 · leaves 59,748 · stamens 24,000 ·
style 3,200 · hub 12,000 · **stem 30,580** (red-green: 359,072 · 80,130 · 100,632 · 60,960 · 11,480 ·
35,136 · 1,274,322).

**What it says, restated.** At 0.4 mm the default and the whole bloom fit with room through a split of
the soup; the infill and the whole bloom at the 40 × 3 corner do not, even built rather than projected —
the infill corner at 0.6 mm is already 136 %. The projection over-stated the whole-bloom corner by 2.1×
(4.55 M projected, 2.17 M built) and the infill corner by 8 % (3.87 M / 3.59 M) — the projection was
the red-green split's density, which the stem's fans had inflated. Q9 stands, at these numbers.

### 11.5 What changed and what held

| earlier figure (discovery, red-green) | T1 (rows) | |
|---|---|---|
| §4/§7.6 whole bloom, stem: outward folds 4,058 (A) / 4,052 (B), 9.6 % | **0 / 0** at 0.6 mm; 0 / 0 at 0.4 mm | **REPLACED** — the invalid figure |
| §5 stem triangles 429,378 (0.6) / 1,274,322 (0.4) | 20,244 / 30,580 | **CHANGED** |
| §5 whole bloom 723,690 (48.2 %) / 1,921,732 (128.1 %) | 204,440 (13.6 %) / **355,766 (23.7 %)** | **CHANGED** |
| §5 "whole bloom without the stem's blow-up" 294,312 / 647,410 | superseded by the build above | **CHANGED** |
| §5 default 403,616 (26.9 %) at 0.4 | 183,168 (12.2 %) | **CHANGED** |
| §5 infill 557,248 (37.1 %) / tube 440,256 (29.4 %) at 0.4 | 358,096 (23.9 %) / 198,500 (13.2 %) | **CHANGED** |
| §5 corners PROJECTED 3,872,783 (258 %) / 4,545,601 (303 %) at 0.4 | BUILT 3,587,358 (239.2 %) / 2,167,718 (144.5 %) | **CHANGED** (and now builds) |
| §5 "the prototype's split is 3.7–10.3× the ideal lattice" | 1.38–5.78× per organ (the top is the infill petal: its shipped mesh alone is 108,736 triangles, 3.18× the 0.6 mm ideal before any split) | **CHANGED** |
| §7.1 B outward: 0 newly < 1.0 and 0 folds on every class | 0 and 0 on every class, every state, the stem included | **HELD** (now true of the stem too) |
| §7.1 whole bloom newly-closed gaps 1,101 (B), 904 of them rods | 328, 220 rods (0.6 mm); 428, 244 rods (0.4 mm) | **CHANGED** — the red-green split's rods are slivers too |
| §7.1 default gaps B 7 / 7 / 7 / 12 at H 0.1–0.5 | 0 / 1 / 4 / 6 | **CHANGED** (smaller) |
| §7.5 A on the infill outward: hole rims 625 newly (2.8 %), 667 folds, 286 under the hole bar | 600 (3.2 %), 651 folds, 263 under the hole bar | **HELD** — A breaks the infill's hole rims, the arm's not the split's |
| §7.5 A on the infill outward: cell skins 344 newly (1.6 %), 303 folds, thinning p99 1.19 mm | **36 (0.3 %), 15 folds, p99 −0.065** | **CHANGED** — most of the cell-skin damage was the split |
| §7.7 A outward skin folds on the default, 1 / 3 / 4 / 11 at H 0.1–0.5 | 0 / 0 / 2 / 7 | **HELD in kind**, smaller |
| §4 tube outward, every class | B 0 / 0; A 1 newly, 1 fold (was 6) | **HELD** |
| §4 inward / centred / emboss rows; the rods' 58 inward folds (§7.6) | not re-measured — the modes are ruled out | **WITHDRAWN** as options, kept as the record |
| §6 the ruling sheet `docs/img/bloom-surface-texture.png` | not re-rendered (it is what was ruled on); `docs/img/bloom-surface-texture-t1-stem.png` is the stem before / after on one camera | **HELD** as the record |

### 11.6 Acceptance, as §10 wrote it

- **0 outward folds on the bore: MET** — 0 in both arms at 0.6 and 0.4 mm.
- **The stem at a 0.6 mm edge within 1.5× of its ideal 9,621: NOT MET, AND NOT REACHABLE BY ANY SPLIT OF
  THE SHIPPED STEM.** 'rows' reads 20,244 (2.10×). The stem's circumference is 48 sectors — 0.39 mm on the
  outer wall, 0.20 mm on the bore — already finer than 0.6 mm, and a split can only add vertices: the two
  walls alone need 2 × 48 × 2 × 94 = 18,048 triangles (1.88×) at 94 rows. At 0.4 mm the same law reads
  30,580, **1.41× the ideal 21,648 — within the bar.** Recorded as found, not tuned to.

### 11.7 Open questions T1 raises for T2–T6 (written down, not acted on)

14. **OPEN — T2's acceptance bar is stated against 2A/e², which a refinement of the shipped lattice does
    not reach.** T2 hopes for "the default near 99,000 at 0.4 mm"; 'rows' — conforming, no fans, the
    quads paired — reads 183,168 (1.85×). The ⌈L/e⌉ rounding is the cause and a T2 sub-lattice has it too:
    a 1.6 mm column goes to 4 × 0.4 and a 0.6 mm row to 2 × 0.3, so a cell is 0.4 × 0.3 mm against the
    ideal's 0.4 × 0.4. Should T2's bar be a ratio of the ideal (which ratio?), or the conforming floor TQ1
    already uses? **Joins Q9; blocks T2's acceptance.** **[RULED Oct 22: the conforming floor, derived, never a
    typed ratio of 2A/e². Whether "the floor" means ≤ 1.0× or TQ1's 2.0× is item 18 — §12.3, §12.8.]**
15. **OPEN — does B refine the stem's BORE at all, and in whose coordinates does T5 refine the stem?**
    §10 T5 says the bore is never relieved. Then B need not refine it, which would roughly halve the
    stem's cost (bore and outer wall each 48 × 94 × 2 at 0.6 mm), and the same holds for every buried face
    Q7 decides to leave plain. Separately: the quad pairing that fixed the bore here applies only to
    COPLANAR quads; a noded stem's wall quads are not coplanar, so a split of its emitted triangles would
    bring the 0.014 mm sliver-apex crossing back. T5 refining the stem in its own (s, θ) — the way T2 refines
    a panel in its own (u, v) — would not have it. **Shapes T5's stem half and the budget (Q9).** **[T2 (§12.4):
    the stem stays on T1's split, 20,242 / 30,580 at 0.6 / 0.4 mm, the bore 44 % of it; the bore was not
    refined for T2. Still open.]**
16. **OPEN — the split's discrete decisions are not cross-engine.** The page (Chromium) and Node build the
    same whole-bloom soup (59,012 triangles both) and subdivide it to **204,432 vs 204,440** ('rows', 0.6
    mm) and **723,686 vs 723,690** (red-green); the default agrees exactly (183,168). Not diagnosed further:
    ⌈L/e⌉ on an edge length, the float32 weld and the pairing's 1e-9 coplanarity are all decisions on last
    bits. Inside an emitter (T2) the triangle count must agree between Chromium and Node exactly (X0
    rebuilds the page's STL in Node), so a sub-lattice count has to come from quantities both engines agree
    on — integers, or values quantised onto a grid the way `infillSnap` does. **A T2 design constraint.**
    **[T2 (§12.5): DIAGNOSED — stamen rod edges exactly 0.6 mm long, ⌈L/e⌉ deciding on the last bit; T2's
    counts are decided on lengths snapped to 2⁻²⁰ mm and agree in both engines on all 12 rows.]**
17. **NOTED, not a question — the float32 census reads non-manifold edges the index census does not.**
    Overlapping closed shells (the feet in the hub, the tube ring on the hub) can have split points of two
    DIFFERENT shells land on one float32 position, which the STL gates' census reads as a shared edge with
    four triangles: 60 on the default at 0.6 mm, 0 at 0.4, every shell index-clean. It is the export
    contract's overlap, not an open shell, and it moves with the edge target. Any TX gate that counts
    non-manifold edges on a relieved mesh needs to know which census it is reading.

## 12. T2 — B's own lattice (Oct 22)

**Prototype only.** Two new files beside T1's — `bloom-texture-lab-lattice.js` (the lattice, a
runtime-patched COPY of `bloom-geometry.js`) and `tools/bloom-texture-lab-lattice.mjs` (the TX check, its
must-fail, the engine comparison and the budget) — two prototype files edited (`bloom-texture-lab-core.js`,
`tools/bloom-texture-lab-measure.mjs`) and their data (`docs/data/bloom-surface-texture-*-t2*.json`). **No
shipped file, no gate, no matrix row, no frozen phase, no workflow** (§12.9). Rulings in force: attachment B,
outward only, no coupon, relief on release and in the export only, /plot has no say, and **Q14 (Oct 22):
T2's triangle bar is the CONFORMING FLOOR**, TQ1's — the least a split that keeps every shipped edge can
emit, Σ max(n_ab + n_bc + n_ca − 2, 2A/e²) over the shipped triangles — derived, never a typed ratio of 2A/e².
**Mode and sampling, named, for every figure below:** EXPORT geometry; the lattice for petals, sepals and
leaves and T1's 'rows' split (snapped — §12.5) for everything else; edge targets 0.6 and 0.4 mm; the
wall/gap rays as §4 and §11.3 (every 5th vertex of the subdivided mesh — §12.6 shows where that sampling
misleads); outward relief only.

### 12.1 What the lattice is

**A patched copy, never an edit.** `bloom-texture-lab-lattice.js` reads `bloom-geometry.js`' text, applies
anchored edits (each must match exactly once, or it refuses), and imports the result (a temp file in Node, a
Blob URL in the browser). `emitPanel` becomes a dispatcher: OFF it calls `emitPanelShipped`, which is the
shipped function's text verbatim (TX0 holds that to the float); ON, for the accumulator the lattice was
switched on for, it calls `emitPanelLattice`.

**Sub-rows and sub-columns, evaluated on the surface.** Between two ladder stations the lattice inserts
sub-rows at uniform u through the organ's own row law — `petalSurface(...).rowAt(u)` for petals and sepals
(a sepal IS the petal builder on its ring), `leafSurface`'s `rowAt(u)` for leaves and leaflets — and
across a row it inserts sub-columns through the row's own `sect(v)`. So every new point sits on the true
surface, and **the shipped ladder never moves**: every ladder row and every shipped column is evaluated
exactly as the shipped emitter evaluates it (TX1). The counts are integers decided on snapped lengths:
m sub-rows = ⌈snap(d_max)/e⌉ over the row pair's chords, raised until every consecutive pair of the placed
chain is within e (a leaf's tooth sinus lies between two rows and needed it), and c sub-columns per row from
its own longest column gap. **Every per-row quantity the skin depends on** — the bead's room, the margin arc
`sM`, the buried-end ramp `g`, the radius, the inset, the taper distance — **is decided on the shipped rows
and columns and read interpolated on the sub-points**, which is what keeps the shipped skin vertices
bit-identical (the `the-margin-arc-is-read-on-the-lattice` mutant is that rule broken). Rows of different
column counts are zipped by the integer parameter rule, taking the shorter diagonal where the two candidate
edges differ by more than `ZIP_SLACK_MM` (1e-6): a tooth flank read a 1.80e edge without it.

**What is not refined in u, and why — each one a decision made without a ruling (§12.8):**
- a petal's FOOT rows and the seam gap (the foot-to-blade clearance law is a fold guard; a sub-row inside it
  is a row the law never cleared) — columns only;
- a BUCKLED petal (`trueNormalRows`' normal is a lattice quantity against the NEIGHBOURING rows, so a
  sub-row changes the shipped rows' normals) — columns only;
- a tube-lobe row reshaped by the tube (`sect !== ownSect`) — columns only;
- the TUBE RING (`periodic` / `thinAt` panels) — refused to the lattice, so it takes T1's split: it has no
  row law to evaluate (`emitTubeRings` hands `emitPanel` rows it built itself);
- the throwaway accumulators (the sepal angle scan's trial builds, the inflorescence's floret units) — the
  lattice is switched on for ONE accumulator, so a floret is drawn unrefined into a lattice bloom. No demo
  state has an inflorescence; the corner does not either.

**The infill's cell region** goes through its own refiner (`emitInfillPanel`'s longest-edge bisection in
the plan, points through `surface.at`) with its threshold capped at min(the lattice's longest edge, e).
That is the shipped mechanism at a smaller bar, not a lattice, and §12.3 shows what it costs.

**The grid capture keeps the ladder's rows** (TX1(b)) — §10's "decided here rather than left implicit".

### 12.2 TX0–TX4, and the must-fail

`node tools/bloom-texture-lab-lattice.mjs` — the TQ check extended to the lattice. Every state, 0.6 and 0.4
mm, all PASS; data `docs/data/bloom-surface-texture-lattice-t2-{default,whole,infill,tube}.json`.

| clause | asserts | reference (owner) |
|---|---|---|
| **TX0** | the patched copy with the lattice OFF emits the shipped stream, every float positionally under `Object.is` | the shipped module's own build |
| **TX1** | (a) every vertex of every shipped ladder-face triangle of a petal, sepal or leaf is in the lattice emission as the same doubles; (b) every organ instance's captured ladder samples identical | the shipped module's own build |
| **TX2** | every lattice skin vertex is its row law's own point (recomputed in the tool through the shipped row object or the organ's `rowAt(u)`, to the bit); sub-row u strictly between its neighbours; columns strictly increasing in v | the organ's row law, called from the tool |
| **TX3** | 0 boundary edges in index space, no non-manifold edge the shipped soup did not have, 0 unmatched DIRECTED edges on the lattice's own triangles | — |
| **TX4** | each organ's lattice triangles ≤ **2.0×** the conforming floor of the shipped panel triangles they replace (TQ1's bar); the strict ≤ 1.0× reported beside it (§12.3) | the floor, from the shipped triangles |

Checked to the bit: 38,256 (default 0.6) to 69,504 (default 0.4) skin vertices per state on TX2; 9,120 /
18,120 ladder-face vertices on TX1(a). **The chord a sub-point would have been on stands 0.099 mm off the
surface on the default petal at 0.6 mm, 0.135 at 0.4** — what the lattice resolves that a split cannot.

**`--control` — 9 of 9 behave** (on the whole bloom at 0.6 mm, plus a curled control state, curl 180 × cup
0.6 with leaves): the clean tree passes; `a-shipped-row-moves` (every ladder row re-evaluated 1e-9 of u
up) → TX1, 17,280 of 18,120 vertices missing; `sub-rows-on-flat-chords` → TX2, 23,987 of 60,934 off the row
law, and on the curled state 24,992 of 51,536 with the chord **0.101 mm** off the surface (so it is not
firing on rounding); `sub-columns-on-flat-chords` → TX2; `the-margin-arc-is-read-on-the-lattice` → TX1 (235
ladder vertices); `the-grid-captures-the-lattice` → TX1(b); `the-zip-winds-the-bottom-skin-backwards` → TX3
(83,944 unmatched directed edges); `the-off-path-moves` → TX0. The two the ruling named — a lattice that
moves a shipped row, a lattice on flat chords instead of the surface — are the first three.

**What TX does not cover, named.** TQ2 (no fans) and TQ3 (pieces sum to the shipped triangle's area) are
T1's and are not restated: TQ3 is false BY DESIGN on a lattice whose points leave the shipped chords, and
fans are reported (under-1° counts, §12.3) rather than asserted per region.

### 12.3 Against the conforming floor (Q14), per organ, per state

The lattice's own triangles against the floor of the shipped panel triangles they replace; the hub, stem,
rods and tube ring are T1's split and are shown against their own floor for completeness. **Node and
Chromium agree on every figure here** (§12.5).

| state | organ | e | shipped | **lattice** | floor | **× floor** | T1 rows | quality: min-angle p1 / p50 · <1° · <5° (T1 rows) |
|---|---|---|---|---|---|---|---|---|
| default | petal | 0.6 | 24,496 | **87,376** | 98,960 | **0.88** | 98,800 | 5.95 / 41.5 · 144 · 640 (5.95 / 37.8 · 400 · 896) |
| default | petal | 0.4 | 24,496 | **152,464** | 146,625 | **1.04** | 173,568 | 7.53 / 44.0 · 144 · 928 (7.63 / 41.8 · 432 · 928) |
| whole | petal | 0.6 / 0.4 | as default | 87,376 / 152,464 | | 0.88 / 1.04 | 98,800 / 173,568 | |
| whole | leaf | 0.6 | 9,132 | **32,004** (+744 petiole) | 33,288 | **0.96** | 33,894 | 4.03 / 39.7 · 72 · 357 (4.28 / 34.4 · 168 · 444) |
| whole | leaf | 0.4 | 9,132 | **55,476** (+1,044) | 49,434 | **1.12** | 59,748 | 6.31 / 42.7 · 72 · 372 (6.11 / 37.7 · 174 · 447) |
| whole | sepal | 0.6 | 15,310 | **21,690** | 31,250 | **0.69** | 28,970 | 1.89 / 40.0 · 90 · 590 (1.89 / 35.7 · 250 · 570) |
| whole | sepal | 0.4 | 15,310 | **47,250** | 54,290 | **0.87** | 52,670 | 3.70 / 41.5 · 0 · 590 (3.91 / 39.4 · 250 · 570) |
| infill | petal | 0.6 | 108,736 | **213,104** | 208,592 | **1.02** | 197,680 | 0.19 / 13.0 · 10,592 · 60,264 (0.22 / 17.9 · 6,736 · 38,424) |
| infill | petal | 0.4 | 108,736 | **310,800** | 352,945 | **0.88** | 348,496 | 0.07 / 12.0 · 19,520 · 90,024 (0.23 / 19.2 · 11,016 · 59,816) |
| tube | petal | 0.6 | 20,256 | **58,464** | 81,642 | **0.72** | 84,586 | 4.22 / 42.0 · 144 · 640 (4.22 / 39.3 · 400 · 896) |
| tube | petal | 0.4 | 20,256 | **100,672** | 123,018 | **0.82** | 152,644 | 5.95 / 41.9 · 144 · 928 (7.35 / 41.3 · 432 · 928) |

T1's split on the rest, same states: hub 4,608 / 9,600 (default), 4,992 / 12,000 (whole); stem 20,242 /
30,580; stamens 16,080 / 24,000; style 1,900 / 3,200; tube ring 22,016 / 36,256 — at 0.6 / 0.4 mm.

**Under 1.0× the floor is possible and is not a contradiction**: the floor is per shipped TRIANGLE, and a
lattice cell spans two of them — the quad's diagonal is never cut, the same reason T1's paired quads read
under 1×. **Edge lengths:** every refined face's longest edge is within **1.27e** (p99 1.09–1.23e); the
exempt faces — the foot rows and the seam gap left unrefined in u — keep edges up to **1.80 mm**, which B
masks (`maskFeet`) and which T3 must not relieve unmasked.

**THE STRICT READING OF Q14 IS MISSED ON THREE ROWS, AND THE CAUSE IS STRUCTURAL.** Against TQ1's 2.0× bar
every organ passes (worst 1.12×). Against the floor itself (≤ 1.0×): the petal at 0.4 mm (1.04×), the leaf at
0.4 mm (1.12×) and the infill petal at 0.6 mm (1.02×) are over. A lattice cell's count is a PRODUCT of two
ceilings — ⌈row gap / e⌉ × ⌈column gap / e⌉ — where the floor is a SUM of per-edge segment counts on each
shipped triangle; where both directions round up at once the product overshoots the polygon count. Which of
the two Q14 means is **question 18** (§12.8). **The infill's cell region is WORSE than T1** at 0.6 mm
(213,104 against 197,680) and on quality at both edges (19,520 triangles under 1° at 0.4 mm against T1's
11,016): the shipped refiner's plan-space bisection at a smaller bar makes slivers where T1's rows did not —
**question 19**.

### 12.4 Budget — the four states and the two corners

`node tools/bloom-texture-lab-lattice.mjs --budget` (data `docs/data/bloom-surface-texture-budget-t2.json`),
against the 1,500,000 export budget, beside T1's split **re-measured on this tree**
(`docs/data/bloom-surface-texture-budget-t1-on-t2-tree.json`). **Over budget is reported, not failed: Q9 is
open** and T2 only reports it.

| state | shipped | T1 rows 0.6 | **T2 0.6** | T1 rows 0.4 | **T2 0.4** |
|---|---|---|---|---|---|
| default | 24,688 | 103,408 (6.9 %) | **91,984 (6.1 %)** | 183,168 (12.2 %) | **162,064 (10.8 %)** |
| whole bloom | 59,012 | 204,440 (13.6 %) | **185,028 (12.3 %)** | 355,766 (23.7 %) | **326,014 (21.7 %)** |
| Voronoi infill | 108,928 | 202,288 (13.5 %) | **217,712 (14.5 %)** | 358,096 (23.9 %) | **320,400 (21.4 %)** |
| tube | 24,672 | 111,210 (7.4 %) | **85,088 (5.7 %)** | 198,500 (13.2 %) | **146,528 (9.8 %)** |
| `INFILL: x 40 petals x 3 whorls` | 1,035,632 (69.0 %) | 1,866,764 (124.5 %) | **1,880,512 (125.4 %)** | 3,301,322 (220.1 %) | **2,940,832 (196.1 %)** |
| whole bloom × 40 × 3 | 401,956 (26.8 %) | 1,200,440 (80.0 %) | **1,001,892 (66.8 %)** | 2,121,698 (141.4 %) | **1,795,890 (119.7 %)** |

**§11.4's infill corner is stale on this tree and is not compared against.** It read 1,121,152 shipped and
3,587,358 at 0.4 mm; #435 (root support, merged after T1) caps the foot at its ring's own arc and moved the
corner to 1,035,632 shipped, so T1 re-measured here reads 3,301,322. Every T1 figure in this section is the
re-measurement.

**What it says.** The lattice saves 10–26 % against T1's split on every state at 0.4 mm and on all but the
infill at 0.6 mm; the infill corner is over the budget at both edges either way (125 % / 196 %), the whole
corner fits at 0.6 mm (66.8 %) and not at 0.4 mm (119.7 %). Q9 stands, at these numbers.

**The stem (Q15).** It stays on T1's split — T2 does not refine it — and costs **20,242 at 0.6 mm and 30,580
at 0.4 mm** (0.52× / 0.53× its floor). Of that, the BORE is **9,024 / 13,440** (44.6 % / 43.9 %), the outer
wall 9,912 / 14,974 and the two ends 1,308 / 2,166 (classified by face normal on T1's split; the shipped
stem is 286 outer, 96 bore, 188 end triangles). A stem whose bore is left at its shipped 96 would be about
**11,300 / 17,200** — an estimate, not a build: the bore and the end annuli share edges, and leaving one
unrefined is T5's construction to make (Q15 is still open on whether to).

### 12.5 Engine agreement (Q16)

`node tools/bloom-texture-lab-lattice.mjs --browser` (data `docs/data/bloom-surface-texture-lattice-t2-
parity.json`; Chromium 141.0.7390.37 through Playwright against Node 22): **every count agrees, organ by
organ, on all 12 rows** — the four states and both corners at 0.6 and 0.4 mm, the lattice's own triangles
and T1's split of the rest. Each discrete decision records its margin from its threshold, and the smallest
are far above the ~1e-13 mm the engines disagree by: row ≥ 8.7e-5 mm, column ≥ 4.7e-4, infill bisection ≥
1.4e-5, snapped ceilings ≥ 2.7e-11, diagonal ties exactly the 1e-6 slack.

**Q16 diagnosed — T1's split on the stamen rods, and fixed for T2's use only.** With T1's split unchanged,
the whole bloom at 0.6 mm read **15,680 stamen triangles in Node and 15,672 in Chromium**: the stamen rod's
edges are 0.6 mm long to the last bits, and L/e came out 1.0000000000000004 in one engine and
0.99999999999999967 in the other, so ⌈L/e⌉ was 2 in one and 1 in the other. `subdivide` now takes an
opt-in `snap` (edge lengths onto `SNAP_GRID_MM` = 2⁻²⁰ mm before the ceiling, the `infillSnap` precedent),
and T2's split of the rest uses it — which is why T2's stamens read 16,080 where T1's read 15,680. **T1's
default is unchanged** (its tools reproduce §11 exactly; re-run at close), so §11.7's 204,432 / 204,440 stays
true of T1 and is now explained.

### 12.6 Print reality on the lattice — outward relief re-measured

`node tools/bloom-texture-lab-measure.mjs --lattice` (data `docs/data/bloom-surface-texture-measure-t2.json`),
§11.3's columns, totals over every class at pebble 0.3 mm (the default's other rows likewise):

| state | mesh T1 → T2 | arm | newly < 1.0 (T1 → T2) | folds (T1 → T2) | gaps newly < 1.0 (T1 → T2) | hole bar newly < 1.5 |
|---|---|---|---|---|---|---|
| default 0.4 | 183,168 → 162,064 | A | 2 → **0** | 2 → **0** | 8 → 11 | — |
| | | **B** | 0 → **0** | 0 → **0** | 4 → 5 | — |
| whole 0.6 | 204,440 → 185,028 | A | 16 → 15 | 25 → 15 | 370 → 345 | — |
| | | **B** | 0 → **0** | 0 → **0** | 328 → 316 | — |
| whole 0.4 | 355,766 → 326,014 | A | 13 → 11 | 22 → 11 | 484 → 589 | — |
| | | **B** | 0 → **0** | 0 → **0** | 428 → 555 | — |
| infill 0.4 | 358,096 → 320,400 | A | 736 → 1,304 | 712 → 848 | 141 → 81 | 263 → 238 |
| | | **B** | 0 → **0** | 0 → **0** | 6 → 6 | 0 → 0 |
| tube 0.4 | 198,500 → 146,528 | A | 1 → 0 | 1 → 0 | 9 → 0 | — |
| | | **B** | 0 → **0** | 0 → **0** | 1 → 0 | — |

**B STILL THINS NOTHING** — 0 newly under 1.0 mm and 0 folds on every class of every state, on the default
at every height and relief type (H 0.1–0.5 pebble, cellular, ribbing), with B's direction on every lattice
vertex the EXACT sheet normal the lattice evaluated it from (69,518 such vertices on the default at 0.4 mm,
115,266 on the whole bloom), not the nearest ladder sample. Every displaced mesh: 0 boundary edges.

**The whole bloom's closed gaps at 0.4 mm (428 → 555) are a SAMPLING artefact, not the lattice — measured.**
The rays sample every 5th vertex of the subdivided mesh, and the two meshes number their vertices
differently, so the 2,731 rod samples are different vertices (finite-gap rays 749 on T1, 933 on T2). Over
EVERY rod vertex (13,656 in both meshes — the rods are T1's split in both) the count is **1,311 on T1 and
1,314 on T2**. Durable rule 1 in this tool: a per-vertex count off a 1-in-5 sample is not comparable across
two meshes; the shares are.

**A on the infill is worse on the lattice** (cell skins 36 → 877 newly under 1.0 mm): A's averaged mesh
normal over the cell region's bisection slivers (§12.3) — A is not the ruled arm, recorded and not pursued.
**The infill's float32 census reads 80 non-manifold edges on the lattice against 224 shipped and 2,456 on
T1's split**; all 80 lie on shipped coincident-sheet edges (cell margin against cell margin, checked
segment by segment, worst distance 0); the 144 shipped cell-margin-against-cell-skin coincidences are gone
because the cell skin is refined at points the margin wall is not. 0 new. **The tube at 0.6 mm reads 96
float32 non-manifold edges** on the lattice, 0 in index space — §11.7 item 17's overlap census, at a new
edge target.

**A measurement defect found on the way, and fixed in the instrument.** The first lattice re-measure read
317 of 927 hub samples "thinned" at H 0.1 mm, every one by exactly its own displacement: the measure's
float32 weld put lattice foot vertices and the hub's split points on one key and merged all 9 shells into
1, so the hub's inward ray found the buried foot as its own material. `weld` now takes `groups` (weld only
within an organ instance), on by default for the lattice; on T1's split it changes nothing (the same 9
shells, the same vertex arrays, verified), so the T1 rows remain comparable.

### 12.7 §10's T2 bar, struck (Q14)

§10 wrote T2's acceptance as *"the default bloom near 99,000 triangles at 0.4 mm"* — 2A/e² for the default.
**Struck by Q14 (Oct 22):** no refinement that keeps the shipped edges can reach 2A/e² (the ⌈L/e⌉ rounding,
§11.7 item 14), so the bar is the conforming floor, derived per organ from the shipped triangles. Measured:
the default reads **162,064** at 0.4 mm against a floor of 146,625 for its petals (1.04×) plus the hub on
T1's split.

### 12.8 Open questions T2 raises (written down, not acted on)

18. **OPEN — Q14's floor: strict (≤ 1.0×) or TQ1's 2.0× bar?** The lattice passes 2.0× everywhere (worst
    1.12×) and misses 1.0× on three rows (§12.3) because a lattice cell is a product of two ceilings and the
    floor a sum. TX4 asserts 2.0× and reports the strict reading. Meeting 1.0× everywhere would need
    sub-column counts chosen jointly across a row pair (or fewer than ⌈gap/e⌉ where a neighbour already
    under-runs), which is a new decision on lengths.
19. **OPEN — the infill's cell region.** Its shipped refiner, at a smaller bar, is worse than T1's split at
    0.6 mm on count (1.02× vs 0.95×) and at both edges on quality (19,520 triangles under 1° at 0.4 mm
    against 11,016). The cells have no (u, v) row law to sub-sample; giving them one is T4's (the Voronoi
    walls) or a ruling that the cell region keeps T1's split.
20. **OPEN — the tube ring has no row law.** `emitTubeRings` builds its rows itself and hands them to
    `emitPanel` as `periodic`; T2 leaves it on T1's split. A ring evaluator (the `petalSurface` shape for the
    tube) is T3's to build if the tube ring is relieved (Q5).
21. **OPEN — what is NOT refined in u: the petal foot and seam gap, buckled petals, tube-lobe rows,
    florets.** Each is a decision made without a ruling (§12.1) and each keeps edges up to 1.80 mm.
    Florets matter only once an inflorescence is textured.
22. **NOTED — §10 called T2 "shipped geometry"; the brief said prototype only.** The brief was followed: the
    lattice lives in a patched copy, so §10's "Off by branch … the byte partition" and its gates-moved list
    apply to the session that ports it into `bloom-geometry.js`, not to this one. Not resolved here.

### 12.9 Reproduce, and what was not touched

```
npm i --no-save three@0.161.0 playwright-core      # --browser serves the page's own module graph
node tools/bloom-texture-lab-lattice.mjs --out <json> --only default            # TX0–TX4, one state at a time
node tools/bloom-texture-lab-lattice.mjs --control                              # the must-fail, 9 legs, under 10 min
node tools/bloom-texture-lab-lattice.mjs --browser --out docs/data/bloom-surface-texture-lattice-t2-parity.json --resume
node --max-old-space-size=12000 tools/bloom-texture-lab-lattice.mjs --budget --resume --out docs/data/bloom-surface-texture-budget-t2.json
timeout 590 node tools/bloom-texture-lab-measure.mjs --lattice --resume --only <state> --out docs/data/bloom-surface-texture-measure-t2.json
```

Every long run in the FOREGROUND, one state at a time under `timeout`, with `--resume` (the corners take
~4.5 min at 0.4 mm). **Predeclared untouched and verified by `git diff --stat origin/main...HEAD` at close:**
every shipped bloom file, every gate, every workflow, the matrix and the frozen phases. **No workflow's path
filter names any file this PR changes**, so it starts no Actions run.
