# Bloom surface texture — BONE v2: finer, rounder, deeper pores (prototype, Nov 1)

**Status: PROTOTYPE AND SHEET, NOT SHIPPED. WAITING ON EVA.** No shipped file changed: `bloom-geometry.js`,
`bloom-registry.js`, `bloom.js`, `bloom.html` and every gate are byte-identical to `main` at `2cc6d56`. So no byte
partition was owed and none was run, and no frozen phase is owed. The prototype is
`bloom-texture-bone2.js`, a runtime-patched COPY of the shipped geometry (the T2 lattice lab's discipline: six
anchored edits, each refused if it does not match exactly once).

It stops here for two rulings the brief reserves for Eva, plus a budget question the brief says to STOP on:

- **The meshing comparison.** Rings against the grid. The answer turned out to depend on a second choice the
  brief did not name: whether pores MERGE (§5).
- **How the budget cap applies.** v2 at the ruled pore size is over the 1.5 M export budget on most states with
  either mesher. The cap ruling (coarsen the lattice edge 0.4 → 0.5) cannot help, because the pores'
  refinement is what costs (§8).

Read `docs/bloom-surface-texture-bone-outcome.md` (v1) first. Everything v1 ruled stands unless this doc says
the prototype departs from it.

## 1. The references (described, not committed)

Eva attached four photographs to the brief. They are not in the repository: it is public, and at least one is a
stock photo.

1. **An amber, back-lit sheet of bone-like foam, seen square on.** Dense round pores, roughly 0.5–1.5 mm at hand
   scale. They are packed close, separated by thin pale walls, and merged here and there. Many pore floors hold
   one or two smaller, DARKER pits, about a quarter to a third of the pore's width.
2. **A grey-white leavened foam (a starter's surface), at a slant.** Cup-shaped pits, about as deep as wide, with
   steep walls and rounded lips. Mostly separate pores, with some merged into lobed clusters, and some smaller pits
   inside larger ones.
3. *(the brief's third)* treated with 1 and 2: deep round cups with thin rounded walls.
4. **An open, see-through foam.** Mood only, ruled: **no through-holes.**

What the sheet should be held against: pores read as ROUND CUPS, not squares; walls between them are THIN and
ROUNDED; floors are in shadow; nested specks sit inside the floors.

## 2. The v2 field (`bone2Field`)

One world-space field (attachment B), outward only, every floor on the original sheet. It is built from
products, `floor`, an integer hash, `sqrt`, `cbrt` and division only, the shipped field's own engine-agreed
discipline.

- **The pores are SPHERES of the world**, drawn in three log-spaced size bands between the smallest pore `D` and
  `spread × D`, one candidate a cell per band.
  - A surface meets a sphere in a disc of radius `ρ = sqrt(S² − d²)`, where `d` is the centre's distance from the
    surface along the query's own normal. The cup is laid on that disc, so a pore is cup-shaped however a surface
    cuts it.
  - A cut is a full pore while `ρ ≥ 0.85 S`, fades shallower down to `0.70 S`, and below that is no pore. So no
    surface carries a sliver pit under the ruled size. The sphere radii are drawn so a fully admitted disc is at
    least `D` across.
- **The cup (`bone2Cup`) is a superellipse** `1 − (1 − u³)^(1/3)` in the disc's own radius `u = r/ρ`: a flat
  floor and a wall vertical at the rim. Past the rim it is carried on up at slope 3.5, so a polynomial smooth
  minimum (radius 0.5 of the relief) against the network's top ROUNDS THE LIP instead of leaving a knife edge.
  - The lip-rounded wall climbs from 20% to 80% of the relief over **0.212 of the radius** (`bone2WallU`). That
    is the "steeper walls" of the ruling, about a quarter of v1's rim width (0.8 of the fine pore's radius).
- **Depth.** A fully admitted pore's deepest point is ON the original sheet (`F = 0`, exactly); the network
  stands at `H`.
- **Nested pits.** With chance 0.55, a pore whose 0.32-of-its-width pit would be at least **0.25 mm** carries one
  or two.
  - Its floor is then a SHELF at 0.4 of its depth, and the pits go the rest of the way to the sheet. So nested
    pits are deeper than the floor they sit in, never below the sheet.
  - 0.25 mm is **UNVALIDATED**, under the ~0.35–0.4 mm SLS resolvable detail the edge-profile ruling quotes.
    Question 5.
- **Packing — two, measured, and the choice is question 2:**
  - **`overlap` (the prototype's default).** Candidates may overlap and merge where they meet, which is v1's
    ruling. **42–45% of a flat surface reads as pore** (F < 0.5), close to the references; **79% of adjacent pairs
    are merged** at mid-height.
  - **`hardcore`.** A candidate keeps its radius only if no surviving candidate of higher priority comes within
    `1.2 ×` their summed radii. Otherwise it SHRINKS to fit, and dies under the smallest size (random sequential
    packing, decided locally by recursion up a hash priority: no order, no state).
    - Disjoint balls cut every surface in disjoint discs, so there is a wall between every two pores: the
      references' thin walls, and the condition the rings need (§5).
    - **But a 3D sphere packing covers only about 12–18% of a surface** (a plane section's area fraction is the
      packing's volume fraction, and random packing with a wall jams far below the references' ~40–50%). Shrinking
      to fit raised it only from 13% to 15%. Per-surface packing would fill it but leaves attachment B.

**Every look constant is PROVISIONAL**, tuned on renders; none decides a count. The proposed controls (§9 and
question 7) are: smallest pore 0.5–1.0 mm, default 0.5; spread 1.5–3, default 3 (so the default draws the
ruled 0.5–1.5 mm); height 0.4–2.5; density default 0.9. **The slider minimum is 0.5 mm as ruled — UNVALIDATED:
a blind pit this small may trap SLS powder** (it belongs in the slider's help text when it ships).

## 3. Depth and the height's maximum

Measured on the emitted plate meshes (drawn depth over drawn mid-wall diameter, the default 0.5–1.5 mm pores):

| H | depth / diameter, median (range) |
|---|---|
| 0.4 (the default) | 0.55 (0.31–0.76) |
| 1.0 | 1.37 (0.77–1.90) |
| 2.5 | 3.43 (1.92–4.76) |

**"Depth comparable to diameter" is reached at H ≈ 0.7 mm for the median default pore, and at H = 1.5 for the
largest (1.5 mm).** So the value that ruling DERIVES for the ruled pores is **1.5 mm** — the depth at which the
largest pore is as deep as it is wide. That is the v1 maximum.

The prototype carries the ruling's ~2.5 because the brief says so. At 2.5, every default pore is 1.9–4.8× as deep
as wide: a 0.5 mm pore becomes a 2.5 mm blind well.

Taken the other way, 2.5 derives only for pores up to 2.5 mm, which the ranges proposed here never draw. This is
question 4, with the options there.

## 4. Resolution: the derived edge, and refinement only inside the patches

**The grid's edge is DERIVED from the profile and the pore size, never typed** (`bone2GridEdgeMm`). It is half
the lip's drawn width at the smallest pore: v1's own "the rim spans at least two edges", applied to the steeper
v2 wall. That is **0.0265 mm at a 0.5 mm pore and 0.0530 at 1.0**, linear in the pore. Restated independently in
the gate (B2c).

**THE GRID REFINER (`gridRefine`) is longest-edge bisection, conforming by construction:**

- an edge is split iff it belongs to a porous triangle and is longer than the edge target, at its MIDPOINT,
  memoised on its two vertex ids;
- an edge longer than the target stays the longest edge of some descendant of every triangle carrying it, so it
  is always split, and always at its midpoint, whichever triangle reaches it first;
- a non-porous triangle that carries a split edge is fanned from its centroid (a transition fan) and refined
  nowhere else.

**A porous triangle is one with a corner whose mask (visibility × curvature × patch) is > 0**, the shipped pass's
own masks, read where the pass reads them. B2b measures this on the default bloom: **every one of the 45,874
lattice triangles that touch no porous triangle reappears verbatim in the grid build.**

The rings have no edge: their radii are the profile's own breakpoints, and their sides a fixed count (§5).

## 5. The meshing comparison — the brief's hypothesis, tested

`node tools/bloom-texture-bone2-measure.mjs --section plate,round` (data `docs/data/bloom-texture-bone-v2.json`).
The same field and the same 10 × 10 mm window, meshed five ways, everything measured on the EMITTED triangles:

- **lattice** — the v2 field on the shipped 0.4 mm lattice (v1's mesh, no refinement): the control;
- **grid** — refined to the derived edge;
- **grid 0.1** — refined to 0.1 mm, which costs about what the rings cost;
- **rings** — every pore in its own rings: 7 rings at the profile's breakpoints (u 0.45 / 0.75 / 0.9 / 0.97 / 1.0
  / 1.07 / 1.15), 16 sides, a 16-gon's sagitta being 1.9% of its radius;
- **rings-lean** — 5 rings, 12 sides.

Roundness is the drawn MID-WALL outline (the level half way between the floor and the top, contoured off the
emitted heights) against its true circle, per pore, over the stretch of outline that pore owns (no neighbour
within reach). It is reported as the median, with the largest beside it.

**On a flat plate, default pores (0.5–1.5 mm), H 1.0:**

| mesh | packing | tris / mm² | edges a circumference | off its circle (median / max) | smallest pore that reads round (≤ 5%) |
|---|---|---|---|---|---|
| lattice (v1's) | merging | 13 | 18 | 15.8% / 17.3% | ~4 mm (never inside the ruled range) |
| grid, derived 0.026 mm | merging | **5,516** | 255 | **1.2%** / 1.9% | all |
| grid 0.1 mm | merging | 341 | 68 | 7.0% / 11.7% | 1.5 mm |
| **rings** | merging | **199** | 51 | 9.0% / 14.3% | — |
| rings-lean | merging | 118 | 40 | 12.1% / 24.7% | — |
| grid 0.1 mm | hard-core | 341 | 56 | 9.5% / 12.1% | 1.5 mm |
| **rings** | **hard-core** | **130** | 32 | **2.3%** / 2.3% | **0.5 mm (every size)** |
| rings-lean | hard-core | 81 | 24 | 4.9% / 5.3% | 0.5 mm |

The 6 mm cylinder (a cupped petal's curvature) agrees: rings, hard-core, 102/mm² at 2.2%; merging, 180/mm² at 4.2%.

**What it says.**

- **Where a pore stands alone, the hypothesis holds decisively.** Its rings draw it round at every size, 2.3% off
  its circle, at 130 triangles a mm². The grid needs **42× the triangles for that** (5,516/mm² at its derived
  edge). At a comparable count (0.1 mm, 341/mm²) the grid is 9.5% off, and reads round only from 1.5 mm up. The
  wireframe cells of the sheet show why: a ring's vertices lie ON the wall, and a grid's only cross it.
- **Where pores MERGE, the rings lose most of that.** A merged pair has no single centre. Each pore keeps only the
  rings inside its own POWER CELL, the radical lines of its outer disc against every overlapping neighbour's.
  - Two kept rings in disjoint convex cells cannot meet, so each is still a loop whose circumcircle is empty, and
    the network's Delaunay holds its edges.
  - The saddle between them is filled at the pore's own side length.
  - On the merging field 79% of adjacent pairs are merged, and the rings come out **9.0% off at 199/mm², worse than
    the grid at 0.1 mm (7.0% at 341/mm²)**.
- **So the meshing choice and the packing choice are one decision** — question 1 with question 2.

**A defect found and fixed before the numbers.** The rings were first triangulated by Delaunay alone. A wall ring
is a few hundredths of the radius from the next and a side a third of it, so the empty-circle test joined rings
PAST the wall, and big pores read 5–15% off-round. The pore's own rings are now STRUCTURED strips (aligned sides,
one diagonal), and only the network and a nested pore's floor are Delaunay-filled.

## 6. The rings on the real bloom — a window, and what porting them takes

The grid runs on every organ in the relief pass: `bone2Hook({ mode: 'grid' })` refines each organ's welded mesh
after the shipped pass has decided its masks and its derived owner.

The rings need a near-isometric 2D chart. In the prototype they run in a FOCUS WINDOW on one organ:

- the window's triangles are cut out;
- the hole is re-meshed in the tangent plane at its centre (`ringsWindowOrgan`), keeping the hole's own boundary
  vertices so the patch closes against the shipped lattice (0 open edges on every sheet cell);
- each new point is carried onto the surface through the cut triangle it projects into.

The sheet's petal cells are that window, 4.5 mm across, on petal 0. **The whole-bloom rings figures in §8 are
therefore ESTIMATES**: the organ's porous area × the plate's measured density.

**Porting the rings to every organ is its own session.** It needs:

- a chart per organ: the sheets have one (their row law `rowAt(u)` and `sect(v)`), the hub and stem a polar or
  cylindrical one, a rod `(s, θ)`;
- a constrained triangulation at the organ's seams;
- the derived owner applied to the patches.

## 7. The gate: `node tools/verify-bloom-bone2.mjs` (B2a–B2d), with `--control`

Not in CI: the prototype is not shipped. Each clause is the one a shipping session ports into TXB.

- **B2a — outward only, floors on the sheet.** No emitted vertex is below the sheet, and the deepest point of every
  fully admitted pore (a plain pore's centre, a shelved pore's nested pit centres) is EXACTLY 0. Lands in TXB1.
- **B2b — refinement only where the masks are > 0.** Every lattice triangle that touches no porous triangle (masks
  read out per corner by the shipped `boneMaskOut` channel) reappears verbatim in the grid build. Lands beside TX10.
- **B2c — the edge is derived.** The gate restates the cup and the lip's smooth minimum and bisects the lip's
  20–80% width itself. The edge must be half of it at the smallest pore and halve with it. Lands in TXB5.
- **B2d — pores are round.** The rings on the hard-core field and the derived grid on the merging one, ≤ 5% off
  their circle, the rings with ≥ 24 segments. Lands as a new TXB clause.

**`--control`: four mutants of a COPY of the module.** Every anchor is checked before any runs. Each has a
WITNESS, a direct call on the mutated module proving its behaviour moved, run before any clause is consulted:

| mutant | witness | fires |
|---|---|---|
| `refinement-leaks-into-smooth-areas` | a smooth triangle emits more than its closing fan | B2b |
| `a-pore-floor-below-the-sheet` | the field at a pore centre reads < 0 | B2a |
| `a-typed-refinement-edge` | the edge is the same at 0.5 and 1.0 mm pores | B2c |
| `pores-revert-to-grid-aligned` | the field on a pore's axis and diagonal differ (an L∞ radius) | B2d |

RESULT_CONTROL

## 8. The budget, and how the cap would have to apply

`--section bloom`, EXPORT, the 1,500,000 budget. v2 counts are exact for the grid (the bisection counted on edge
lengths, never built), and the rings are ESTIMATED (§6):

| state | v1 (shipped) | porous area | grid derived | grid 0.1 mm | grid 0.05 mm | rings, merging | rings-lean | rings, hard-core |
|---|---|---|---|---|---|---|---|---|
| the default | 158,912 (10.6%) | 4,424 mm² | 39.7 M (2,649%) | 2.81 M (188%) | 11.1 M (737%) | 0.94 M (**63%**) | 0.59 M (39%) | 0.64 M (43%) |
| whole bloom | 289,008 (19.3%) | 6,956 | 59.4 M | 4.26 M (284%) | 16.6 M | 1.51 M (**101%**) | 0.95 M (63%) | 1.04 M (69%) |
| Voronoi infill | 108,928 (refused, untextured) | 0 | — | — | — | — | — | — |
| closed tube | 143,376 (9.6%) | 5,021 | 43.8 M | 3.10 M (207%) | 12.0 M | 1.06 M (71%) | 0.66 M (44%) | 0.72 M (48%) |
| umbel, head ON | 530,634 (35.4%) | 11,350 | 95.2 M | 7.05 M (470%) | 27.3 M | 2.49 M (**166%**) | 1.58 M (106%) | 1.72 M (115%) |
| 40 × 3 whorls | 1,442,144 (96.1%, @0.42) | 35,386 | 313 M | 22.9 M (1,525%) | 89.3 M | 7.69 M (**513%**) | 4.85 M (324%) | 5.28 M (352%) |
| the mophead (depth 2) | 1,240,446 (82.7%) | 20,737 | 179 M | 13.4 M (890%) | 50.7 M | 4.79 M (**319%**) | 3.13 M (209%) | 3.38 M (225%) |

The grid at 0.1 mm BUILT on the default is **2,857,886** triangles. That is 43,227 over the count, the transition
fans, which the count leaves out on purpose.

**What it says.**

- **The derived grid is out of reach everywhere** (26× to 209× the budget).
- **The 0.1 mm grid is over on every state with a texture, the default included.**
- **The rings fit the default, the tube and (lean) the whole bloom, and nothing larger.**
- **The cap as ruled cannot reach this.** It coarsens the LATTICE edge 0.4 → 0.5 (a 36% saving on the lattice). But
  the lattice is 159 k of the default's 0.94 M and 1.44 M of the 40 × 3 corner's 7.69 M: **the cost is the pores',
  and the cap has no lever on them.**
- What a cap on the pores could coarsen is question 3. **The brief says to STOP and ask rather than pick, and this
  prototype stops there.**

## 9. Build time

Node (this box): the default under v1 1.2 s; v2 field on the lattice 1.1 s; grid 0.1 mm 6.5 s (5.5 s of it the
refinement and the field).

**In the browser** (`node tools/bloom-texture-bone2-browser.mjs`, headless Chromium, the geometry build only):

RESULT_BROWSER

- The held-slider preview is untouched: the page drops the texture while a slider is held
  (`DRAG_LIGHT_OVERRIDE`).
- What moves is the build on RELEASE. On the default it goes from v1's ~1 s to ~9 s, grid or rings, because:
  - the field evaluates 81–100 candidates a vertex across three bands;
  - the refinement allocates in JS arrays;
  - the rings run a Delaunay per patch.
- None of it is optimised; the prototype measures and does not tune (question 8).

## 10. Print reality

RESULT_PRINT

- **Walls between pores are thin**, measured on the field at mid-height between adjacent fully admitted pores
  (default pores):
  - **merging:** the thinnest 0.018 mm, 10th percentile 0.034, median 0.13;
  - **hard-core:** the wall at the rim never under `0.2 ×` the summed radii, ≥ 0.17 mm on the default pores.
  - Both are far below the ~0.35–0.4 mm SLS resolves, and far below `MIN_FEATURE_MM` 1.0 (a declared guess).
  - **A 2.5 mm relief standing on a 0.13 mm wall** is a printability question for Eva (question 6), not a number to
    tune.

## 11. Questions for Eva

1. **THE MESHING.** (a) **Rings** (pore-conforming): round at every size for ~130 triangles a mm², 42× cheaper than
   a grid of the same roundness — but only where pores stand apart, and they need a chart per organ to port (§6).
   (b) **Grid**: works on any packing and any organ unchanged, but costs 1.7–42× the rings for the same roundness
   and fits no textured state at a round-enough edge. (c) **Hybrid**: rings where a pore stands alone, the grid in
   merged clusters.
2. **MERGING OR WALLS.** (a) **Merging** (v1's ruling; 42–45% of the surface porous, close to the references). The
   rings then lose their edge (§5). (b) **A wall between every two pores** (hard-core): rings round everywhere,
   but a 3D sphere packing covers only ~15% of a surface. (c) **Pores laid per organ surface** (a 2D packing in the
   organ's own chart): dense AND walled, but it departs from attachment B's one world field; two parts that touch
   would not share pores.
3. **THE BUDGET AND THE CAP (the brief's STOP).** v2 is over the budget on most states (§8), and coarsening the
   lattice edge does not reach the cost. Options: (a) **coarsen the pores' own resolution** (16 → 12 → 8 ring
   sides, or a coarser grid edge), told, refuse past a floor; (b) **raise the smallest pore on a big bloom,
   derived from the budget**, told; (c) **thin the coverage** on a big bloom, told; (d) **refuse the export** past
   the budget, as the 0.5 mm rung does now; (e) **raise the budget**.
4. **THE HEIGHT'S MAXIMUM.** "Depth comparable to diameter" derives **1.5 mm** for the ruled pores (the largest is
   as deep as wide), not 2.5. At 2.5 every default pore is 1.9–4.8× as deep as wide. Options: (a) **2.5 as ruled**;
   (b) **1.5, derived**; (c) **depth per pore ∝ its own width** (a 0.5 mm pore 0.5 deep at any height; small pores'
   floors then stand above the sheet).
5. **THE NESTED PITS.** 0.25 mm minimum (under SLS's ~0.35–0.4), 0.32 of the pore, a shelf at 0.4 of the depth.
   Options: (a) keep; (b) raise the minimum to 0.35 mm (only pores ≥ 1.1 mm carry them); (c) drop the shelf
   (nested pits only where the pore's floor stands above the sheet).
6. **A PRINTABLE WALL.** The walls are 0.02–0.13 mm (merging). Options: (a) keep the look and let the print decide;
   (b) a wall floor (e.g. 0.4 mm), which spaces the pores out.
7. **THE CONTROLS PROPOSED.** Smallest pore 0.5–1.0 mm (default 0.5), spread 1.5–3 (default 3), height 0.4–2.5,
   density default 0.9.
8. **THE RELEASE BUILD.** ~9 s on the default in the browser, against v1's ~1 s; the drag preview is unchanged.
   Options: (a) accept; (b) an optimisation session (cache the pore lists per cell, typed arrays in the refiner,
   the build in a worker) before shipping.
9. **THE FADE AT HEIGHT.** v1's derived fade `max(H × 15/8, e)` is **4.69 mm at 2.5**, so a tall relief leaves only
   the middle of a 16 mm petal porous. Options: (a) keep the derived fade; (b) cap it.

## 12. What is NOT done, named

- Nothing ships: no registry row, no control, no panel route, no TXB extension in the harness, no byte partition.
  The shipping session builds those on Eva's rulings, porting B2a–B2d (§7).
- The rings run on charted patches only (§6); their whole-bloom figures are estimates.
- The derived grid is never built on a whole bloom (it would be 39.7 M triangles on the default); its counts are
  exact counts of the bisection.
- PEBBLE / CELLULAR and v1 BONE are untouched; the prototype's patched copy with the hook OFF is v1 to the byte.

## Tools

- `bloom-texture-bone2.js` — the field, the refiners and the patched copy (prototype).
- `node tools/bloom-texture-bone2-plate.mjs` — one patch, every mesh, the instruments.
- `node tools/bloom-texture-bone2-measure.mjs` — every number here (`--section plate,round,bloom,print`).
- `node tools/bloom-texture-bone2-browser.mjs` — the browser timings.
- `node tools/verify-bloom-bone2.mjs [--control]` — B2a–B2d.
- `node tools/shot-bloom-texture-bone2.mjs docs/img/bloom-texture-bone-v2.png` — the sheet.
