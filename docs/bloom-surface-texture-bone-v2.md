# Bloom surface texture — BONE v2: finer, rounder, deeper pores (prototype, Nov 1; round 2, Nov 2)

> **Round 2 (Nov 2) is §13 onward, and it is what the rulings of Nov 1 asked for:** the HYBRID mesher (rings
> where a pore stands apart, fine points only along merge seams and wall junctions), the COARSE / FULL split
> of the live view, the investigation of what the 1.5 M export cap protects, and the nib. It is a prototype
> and a sheet (`docs/img/bloom-texture-bone-v2b.png`); **no shipped file changed**, and the cap did not move.
> §21 carries §11's questions forward under the rulings. Round 1 (§1–§12) is kept as it was written.

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
- **The edge the grid LANDS on is quantised.** Bisection halves the shipped lattice's ~0.4 mm edges, so an edge
  target `e` lands near `0.4 / 2^k`, the first halving at or under `e`:
  - the derived 0.0265 mm (a 0.5 mm pore) lands on ~0.025;
  - so does 0.0397 (a 0.75 mm pore) — the same density;
  - 0.053 (1.0 mm) lands on ~0.05.
  - A grid whose density followed the edge continuously would have to resample the lattice, not bisect it.

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

**Two more mesher defects, found by the sheet.** The sheet's first render showed the hard-core window on the real
petal with shards and 7 open edges. Both causes are fixed, and every plate, roundness and budget figure in this doc
is from the run after them.

- **The network fill was a regular hex lattice, so every fill point's six neighbours were ON ONE CIRCLE.**
  - Bowyer–Watson with floating-point predicates decides a cavity there by the last bit. Measured on that window:
    171 of 1,943 triangles not Delaunay, and 6 of the hole's 92 lattice edges lost, though no point lay inside
    their diametral circles.
  - The comment's "no four points co-circular" was true of the staggered rings and false of the fill.
  - Each fill point is now moved by a deterministic jitter of ≤ 2% of the spacing. Result: 0 violations, 0 lost
    edges.
- **The fill and the ringed pores kept only half a fill spacing (0.125 mm) off the hole**, under half the 0.4 mm
  lattice edge they must preserve. They now keep half the longest hole edge, the Gabriel condition.
- An enlarged super-triangle (2000×, from 20×) was tried first, on the textbook hull-edge diagnosis. It changed
  nothing measurable, and is kept because it is harmless.

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

**Measured, this tree:** clean PASS on B2a–B2d.
- B2a: 0 vertices below the sheet, and all 22 deepest points sit at exactly 0.
- B2b: 45,874 smooth-interior triangles, none missing from the 2,856,784-triangle grid build.
- B2c: the edge is 0.02649 / 0.05298 mm at 0.5 / 1.0 mm pores, matching the restatement.
- B2d: the rings run 2.25% off the circle at 32 segments; the grid 1.16% at 255.

`--control`: 4 of 4 mutants fire the clause they name.

| mutant | its witness | what the gate reads |
|---|---|---|
| leaking refinement | 64 extra triangles | B2b |
| pore floor below the sheet | −0.436 | B2a |
| typed edge | 0.05 / 0.05 mm | B2c |
| grid-aligned pores | 0.478 apart | B2d: rings 17.3%, grid 22.0% off the circle |

## 8. The budget, and how the cap would have to apply

`--section bloom`, EXPORT, the 1,500,000 budget. v2 counts are exact for the grid (the bisection counted on edge
lengths, never built), and the rings are ESTIMATED (§6):

| state | v1 (shipped) | porous area | grid derived | grid 0.1 mm | grid 0.05 mm | rings, merging | rings-lean | rings, hard-core |
|---|---|---|---|---|---|---|---|---|
| the default | 158,912 (10.6%) | 4,424 mm² | 39.7 M (2,649%) | 2.81 M (188%) | 11.1 M (737%) | 0.94 M (**63%**) | 0.59 M (39%) | 0.64 M (43%) |
| whole bloom | 289,008 (19.3%) | 6,956 | 59.4 M | 4.26 M (284%) | 16.6 M | 1.51 M (**101%**) | 0.95 M (63%) | 1.04 M (69%) |
| Voronoi infill | 108,928 (refused, untextured) | 0 | — | — | — | — | — | — |
| closed tube | 143,376 (9.6%) | 5,021 | 43.8 M | 3.10 M (207%) | 12.0 M | 1.06 M (71%) | 0.66 M (44%) | 0.72 M (48%) |
| umbel, head ON | 530,634 (35.4%) | 11,350 | 95.2 M | 7.05 M (470%) | 27.3 M | 2.50 M (**167%**) | 1.58 M (106%) | 1.72 M (115%) |
| 40 × 3 whorls | 1,442,144 (96.1%, @0.42) | 35,386 | 313 M | 22.9 M (1,525%) | 89.3 M | 7.71 M (**514%**) | 4.86 M (324%) | 5.28 M (352%) |
| the mophead (depth 2) | 1,240,446 (82.7%) | 20,737 | 179 M | 13.4 M (890%) | 50.7 M | 4.80 M (**320%**) | 3.13 M (209%) | 3.38 M (225%) |

The grid at 0.1 mm BUILT on the default is **2,856,784** triangles. That is 42,125 over the count:
- the transition fans, which the count leaves out on purpose;
- less the 15 triangles the coincidence rule withdraws (§10).

**What it says.**

- **The derived grid is out of reach everywhere** (26× to 209× the budget).
- **The 0.1 mm grid is over on every state with a texture, the default included.**
- **The rings fit the default, the tube and (lean) the whole bloom, and nothing larger.**
- **The cap as ruled cannot reach this.** It coarsens the LATTICE edge 0.4 → 0.5 (a 36% saving on the lattice). But
  the lattice is 159 k of the default's 0.94 M and 1.44 M of the 40 × 3 corner's 7.71 M: **the cost is the pores',
  and the cap has no lever on them.**
- What a cap on the pores could coarsen is question 3. **The brief says to STOP and ask rather than pick, and this
  prototype stops there.**

## 9. Build time

Node (this box): the default under v1 1.2 s; v2 field on the lattice 1.1 s; grid 0.1 mm 6.5 s (5.5 s of it the
refinement and the field).

**In the browser** (`node tools/bloom-texture-bone2-browser.mjs`, headless Chromium, the geometry build only):

Run alone on the box, ms, geometry build only. **Preview** is the held-slider build (untextured);
**v1** is the shipped BONE on release. The rings are ESTIMATED: the v2-lattice build plus the porous area × the
rings' measured browser cost (0.845 ms/mm² merging, 0.403 hard-core, on the plate).

| state, mode | preview | v1 | v2 field on lattice | v2 grid 0.1 mm | v2 rings, merging (est.) | v2 rings, hard-core (est.) |
|---|---|---|---|---|---|---|
| default, EXPORT | 61 | 711 | 1,149 | **11,464** (2.86 M tris) | **4,885** | 2,932 |
| default, LIVE | 49 | 705 | 843 | 15,964 | 4,580 | 2,627 |
| umbel, head ON, EXPORT | 488 | 3,743 | 4,280 | — | 13,866 | 8,856 |
| mophead, EXPORT | 1,549 | 28,961 | 31,102 | — | 48,608 | 39,458 |

The grid was not built on the umbel or the mophead (7.05 M and 13.4 M triangles at 0.1 mm, past the budget, §8).
An earlier run of the same tool with other work on the box read 8.6 s for the default's grid; the figures above are
the uncontended run.

- The held-slider preview is untouched: the page drops the texture while a slider is held
  (`DRAG_LIGHT_OVERRIDE`).
- What moves is the build on RELEASE. On the default it goes from v1's 0.7 s to ~4.9 s on the rings (estimate) and
  11.5 s on the 0.1 mm grid. On the mophead, v1 is ALREADY 29 s on release and the rings add ~20 s. The costs:
  - the field evaluates 81–100 candidates a vertex across three bands;
  - the refinement allocates in JS arrays;
  - the rings run a Delaunay per patch.
- None of it is optimised; the prototype measures and does not tune (question 8).

## 10. Print reality

`--section print`, EXPORT, the default bloom, at H 0.4 and at the 2.5 mm maximum. The census is
`tools/bloom-self-intersection.mjs`'s, run on every build.

| build | H 0.4: tris / within-shell pairs / shells | H 2.5 |
|---|---|---|
| v1 (shipped) | 158,912 / 0 / 9 | 158,912 / 0 / 9 |
| v2 field on the lattice | 158,912 / 0 / 9 | 158,912 / 0 / 9 |
| v2 grid 0.1 mm | 2,856,784 / **0** / 9 | 2,856,784 / **0** / 9 |

- **No relief fold at either height, on either mesh.**
- **THE GRID WELDED THE BLOOM ON ITS FIRST BUILD, AND THE CENSUS IS WHAT SAID SO.**
  - First run: 9 → 7 shells and 4,492 within-shell pairs at a 0.433 mm "span". The count was identical at
    H 0.4 and 2.5, so it was topology, not relief.
  - Attributed by emitter, it came to FIVE positions: refined vertices landing EXACTLY on the hub's rim points at
    the 45° petals (6.2541, 6.2541, ±0.6). That welded three petals to the hub.
  - The junction rule (no refinement on a position two organs already share) was not enough, because a midpoint
    can land on a position only ONE other organ has.
  - The refiner therefore checks every new vertex against every other organ's float32 keys, withdraws the porous
    triangles that produced a coincident one, and refines again. **15 triangles withdrawn, 0 shared positions,
    9 shells.**
  - This is v1's own clearance finding (§3.4 of its doc), arriving through refinement. A shipping refiner owes
    the same rule and a gate for it.
- **Printable gaps:** 21,367 relieved vertices sampled near another part. **0 gaps newly close and 0 newly
  touch**, at 0.4 and at 2.5. The nearest textured approach is 0.171 / 0.160 mm, the same pairs that sit that
  close untextured.
- **THE NIB, AND A CORRECTION TO v1 §5.** Of 1,776 lattice vertices within 1.2 mm of a petal apex:

  | | relief > 0.05 mm | nearest such relief to the apex | largest |
  |---|---|---|---|
  | H 0.4 | 88 | 0.70 mm | 0.399 mm |
  | H 2.5 | 7 | 1.19 mm | 0.098 mm |

  - The rest are fade tails under 0.05 mm (685 / 754).
  - So under v2 the curvature mask does NOT keep the whole nib smooth; the fade does more at height (4.69 mm at
    2.5).
  - v1 read 0 there because its patches are 20 mm across against v2's 6 mm, and the 1.2 mm nib fell between them.
  - **v1 §5's "the nib is smooth by curvature alone" is therefore true of v1's patch scale, not of the law.**
    A shipping session states the nib's clearance explicitly.

- **Walls between pores are thin**, measured on the field at mid-height between adjacent fully admitted pores
  (default pores):
  - **merging:** the thinnest 0.006 mm, 10th percentile 0.046, median 0.27;
  - **hard-core:** the wall at the rim never under `0.2 ×` the summed radii; thinnest 0.17 mm, 10th percentile
    0.17, median 0.36 on the default pores.
  - These are a re-run with the pairing restricted to true neighbours (`d < 1.6 × (R1 + R2)`). The first pass
    paired far pores and read 0.018 / 0.034 / 0.13.
  - Both are far below the ~0.35–0.4 mm SLS resolves, and far below `MIN_FEATURE_MM` 1.0 (a declared guess).
  - **A 2.5 mm relief standing on a 0.05–0.3 mm wall** is a printability question for Eva (question 6), not a number to
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
6. **A PRINTABLE WALL.** The walls are 0.006–0.27 mm (merging, thinnest to median). Options: (a) keep the look and let the print decide;
   (b) a wall floor (e.g. 0.4 mm), which spaces the pores out.
7. **THE CONTROLS PROPOSED.** Smallest pore 0.5–1.0 mm (default 0.5), spread 1.5–3 (default 3), height 0.4–2.5,
   density default 0.9.
8. **THE RELEASE BUILD.** On the default in the browser: ~4.9 s for the rings (estimate) and 11.5 s for the 0.1 mm grid, against v1's 0.7 s. The mophead goes from v1's 29 s to ~49 s. The drag preview is unchanged.
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

---

# Round 2 (Nov 2): the hybrid mesh, the budget's real limit, and the live/full split

## 13. The rulings this round builds on (Nov 1, after #481)

- **Packing: pores MERGE** (the references' look). Walled-only packing and per-part layout are dropped.
- **Meshing: HYBRID.** Pore-conforming rings where a pore stands apart; fine refinement ONLY along merge seams and wall
  junctions; never a regular fine grid over whole patches; both derived from the pore field, no typed edge.
- **Depth:** the height's maximum is **2.5 mm** (depth up to ~3.4× the diameter at the smallest pores),
  **UNVALIDATED for powder removal** — said here (§18) and in the slider's help text (`B2_HEIGHT_HELP` in the
  prototype, the words a shipping registry row carries).
- **Live view:** release builds COARSE pores (v1-weight cost); a "full detail" button and the export build the FULL
  pores; dragging keeps the light preview; the button's state and the read-out say which is shown (§15).
- **Budget:** find out what the 1.5 M cap protects before anyone moves it (§17). The cap did not move.
- **Nib:** curvature decides; report it with renders; no nib mask (§18).

**No shipped file changed.** `bloom-geometry.js`, `bloom-registry.js`, `bloom.js`, `bloom.html` and every gate are
byte-identical to `main` at `b596994`. The prototype is three files: `bloom-texture-bone2.js` (round 1's field and
refiners, plus the hook's round-2 modes), `bloom-texture-bone2-hybrid.js` (the hybrid mesher, new) and the tools.

## 14. The hybrid mesher (`bloom-texture-bone2-hybrid.js`)

**Why it needs no chart per organ.** Round 1's rings ran in a focus window because they needed a near-isometric
2D chart (§6). The hybrid instead re-triangulates EACH LATTICE TRIANGLE on its own. A lattice triangle is planar, so
its own plane is an exact chart. Closure against the 0.4 mm lattice is by construction, not by a repair: every
point on a lattice edge is registered once per EDGE, and both triangles that share the edge read the same list.

**The construction**, in order:

1. **The discs.** Every pore of the field, cut by the organ's own surface (`organDiscs`): the foot is the closest
   point of the surface to the sphere's centre (grouped per skin, so a sphere cutting both skins of a thin petal
   gives two discs); the normal is the interpolated vertex normal there; the disc is the field's own `discOf`.
   One generator, two readers, as in round 1.
2. **Free and merged.** Two discs on one skin whose OUTER rings (u = 1.15) overlap are a merged pair.
3. **The crease.** The split of a pair is the field's own crease, where the two cups sit at the SAME normalised
   radius (`u_i = u_j`, an Apollonius sphere of the world). It is measured as a length:
   `sd(x) = (u_i − u_j) / (1/ρ_i + 1/ρ_j)`, negative on i's side. That is the same set seen from either disc, so
   the two sides cannot disagree.
4. **The rings.** Every pore lays #481's ring layout (the profile's breakpoints u 0.45 / 0.75 / 0.9 / 0.97 / 1.0
   / 1.07 / 1.15, 16 sides), with consecutive rings staggered by half a side and each pore at its own hashed
   rotation. A ring vertex is KEPT only where it is on its own side of every pair's crease by at least the pair's
   band.
   - The band is half the DERIVED EDGE `h`, where `h` is half the lip's drawn width at the smaller pore (round
     1's grid edge, read at the pair's own smaller pore).
   - A cut arc ends ON its circle, at an angle bisected to the band's edge.
   - The clip is judged at the arc's point ON THE SURFACE, so two discs with different normals judge the same
     point.
   - **A free pore keeps every ring whole.**
5. **The seams.** Along each merged pair's crease, one row of points ON the crease (`sd = 0`), spaced at the
   smaller pore's own rim side (the rings' angular resolution), inside the pair's lens only.
6. **The wall junctions.** Where three mutually merged pores' outer discs share the point of equal normalised
   radius (solved by Gauss–Newton), a patch of points at spacing `h` within `2h` of it. This is the field's
   three-way wall end, which the rows alone drew as a blunt stub.
7. **Carrying onto the surface.** Every point is carried onto the organ along its disc's normal (an affine
   projection onto the lattice triangle it lands in). Every ring CHORD that crosses a lattice edge leaves a point
   ON that edge, at the parameter where the chord's projection meets it (a walk through the triangles in the
   disc's chart).
8. **One constrained Delaunay per lattice triangle** (`cdtInLatticeTriangle`).
   - The triangle's own three edges, with their points, are the boundary.
   - The ring vertices and seam points that landed in it are the interior.
   - The ring chords inside it are the CONSTRAINTS, so a ring is a ring of edges in the output whichever
     triangles it crosses.
   - The chart is an integer lattice of 2,048 units across the triangle's longest edge, so orientation and
     in-circle are exact in doubles.
   - A lattice triangle with nothing in it is kept verbatim. A non-porous triangle whose edge received points is
     fanned from its centroid (round 1's transition rule).
9. **The count is exact without building.** A triangulated polygon with b boundary and i interior points has
   b + 2i − 2 triangles. Measured on the default bloom: count 2,310,010, built 2,310,010.

**The coincidence rule of #481 is kept.** A new vertex whose float32 key another organ also emits withdraws the
lattice triangles it belongs to, and that organ is re-meshed (at most six passes). On the default bloom it
withdrew nothing: the hybrid's points sit at ring crossings, never at the midpoints that welded round 1's grid. A
planted fixture proves the rule still acts (B2e4, §20). **The jittered fill of #481 has no counterpart:** the
hybrid lays no fill lattice; its only regular points are the junction patches, which are jittered by
construction (the hashed pore rotations).

**Measured choices (the plate, the merging field, H 1.0; `__hySeam` is the measurement's lever, never a control):**

| band (in h) | rows (in h) | tris/mm² | merged pores off their circle (median / p90) | seam error RMS / max (mm) |
|---|---|---|---|---|
| 2 | −1, 0, +1 | 353 | 9.0% / 17.7% | 0.068 / 0.706 |
| 1 | 0 | 376 | 1.9% / 1.9% | 0.054 / 0.647 |
| 1 | −0.5, 0, +0.5 | 420 | 1.9% / 2.2% | 0.050 / 0.647 |
| **0.5** | **0** | 410 → **432** with the junctions | **1.9% / 1.9%** | **0.034 / 0.362** |

**Four defects found before the numbers, each by measuring:**

- **The split was first the radical plane of the two OUTER discs.** That plane crosses the crease for unequal
  pores, and a thin wall between two barely merged pores fell between the two clipped ring sets: 0.78 mm of relief
  missing at H 1.0, seen on a rendered wireframe. The crease (equal u) replaced it.
- **A band of two lip widths clipped the outer rings off most merged pores** (9.0% off their circle; a wireframe
  showed one ring a pore left). Half an `h` keeps them.
- **The outer rings of a merged pair CROSS at the lens's two ends**, where the two outer circles meet. Clipping
  only inside the other pore's outer disc left 1,146 crossing constraints on the default bloom. A pair now clips
  one band past the other's outer ring: 11 left, recorded (`consFail`), with no open edge from them (§18).
- **Two nested pits in one floor overlap as often as not** (every two-pit pore on the default plate), and their
  rings crossed. They clip at their own crease too.

## 15. Coarse and full

**FULL** is the hybrid on every organ (the export and the "full detail" button).

**COARSE** (the release preview) is **the v2 field on the shipped lattice**: no point is added, so its cost is v1's
to the triangle (158,912 on the default, exactly v1's count). Its pores are the full build's pores, one field drawn
at the lattice's vertices.

**The derivation.** "v1-weight" means the shipped lattice's own triangles, and the only build that adds none is the
field sampled at the lattice. Its price is the look v1 was criticised for: pores drawn at 0.4 mm edges, 17–28% off
their circle (§16).

**The alternative, measured and NOT chosen:** coarse RINGS at the lattice's own edge (sides 0.4 mm long, never under
6; only the floor-edge and rim rings; no seams).

- They are 3.5× v1's count on the default (557,656, 37% of the budget) and took 12 s in Node, against 1.1 s.
- They are 14% off the circle against the lattice's 18%: barely rounder, for 3.5× the cost and 10× the time.
- Question 3 of §21 asks whether a cheaper-looking coarse is wanted at that price.

**The same pores.** Coarse and full read one field and one disc list. B2f holds that on a bloom window: the
coarse build's disc list (`discs: true`) and the full build's are the same pores at the same centres, to the bit.

**The button and the read-out** are the shipping session's (no page here). What they must say is ruled:

- the button names which build is on screen ("coarse preview" / "full detail");
- the read-out prints the shown build's triangle count beside its name.

The prototype's `bone2Bloom` modes are `'coarse'` and `'hybrid'`, and the browser times are §19.

## 20. The gate: B2 extended (`node tools/verify-bloom-bone2.mjs [--control]`)

Still local only: the prototype is not shipped and nothing here is in CI. B2a–B2c are round 1's. The new
clauses RESTATE what the hybrid claims, from the discs (the field's own pores) and the restated profile, never from
the mesher's own pairs:

- **B2d (extended)** — the hybrid on the MERGING plate. Free and merged pores alike must be within 5% of their
  circle (median), with at least 24 segments a circumference.
- **B2e1 — no regular grid in a patch interior.** Every fine point (seam row, seam crossing, junction patch) must lie
  within one `h` of a restated crease, or within `(HY_JUNCTION_H + 0.5) h` of a restated triple junction (equal
  radii, solved in the gate).
- **B2e2 — seams only where pores merge.** Every fine point must lie inside a restated merged lens (plus one `h`),
  and no free pore's outer disc may hold one.
- **B2e3 — zero open edges.** On a bloom window (the default bloom, every organ's triangles within 3 mm of petal 0's
  most porous spot), every directed edge of the emitted file (float32 keys) must be matched by its reverse, none
  doubled. The exact count must equal the built count.
- **B2e4 — no cross-part coincident vertex.** It is checked in two places:
  - on the bloom window, no float32 position may be emitted by two organs;
  - on a PLANTED fixture, a second organ is given a vertex exactly on one the hybrid emits in the first organ. The
    rule must withdraw (≥ 1 triangle) and leave none shared.
  - The planted fixture is owed: on the default bloom the hybrid withdraws nothing, so without it the clause would be
    vacuous.
- **B2f — coarse and full are the same pores.** On the bloom window, the coarse build's disc list and the full
  build's must be the same pores at the same centres, to the bit.

**The first clean run found the mesher's own defect, not the clause's.** Five junction-patch points sat outside
every merged lens: a patch centred at a lens end reached past the outer discs onto a pore's plateau. A junction
point is now kept only inside at least two of its three outer discs (one lens).

## 21. Questions for Eva — §11 carried forward under the rulings, and the new ones

**§11 under the rulings:**

- **§11.1 meshing** — RULED (hybrid) and BUILT. Its consequence is question A.
- **§11.2 packing** — RULED (merging). Nothing open.
- **§11.3 the budget and the cap** — re-asked as **question A**, with the investigation it asked for (§17).
- **§11.4 the height's maximum** — RULED 2.5 mm. The UNVALIDATED note is in §18 and in `B2_HEIGHT_HELP`.
- **§11.5 nested pits** — still open, unchanged. **Question E.**
- **§11.6 a printable wall** — still open. The walls are the field's and the hybrid does not change them (§18).
  **Question F.**
- **§11.7 the controls** — still open: smallest pore 0.5–1.0 mm (default 0.5), spread 1.5–3 (default 3), height
  0.4–2.5 (ruled), density default 0.9. **Question G.**
- **§11.8 the release build** — answered in kind by ruling 4 (release builds COARSE). What is left is how long FULL
  may take. **Question C.**
- **§11.9 the fade at height** — still open, unchanged. **Question H.**

**The questions:**

- **A. THE CAP (the brief's STOP).** §17 measures what the 1.5 M cap could protect.
  - **(a)** It derives from nothing measured: its own comment says it is "slack by design … so the refusal path is
    real before it is ever needed".
  - **(b)** The browser's real ceiling is far above it (§17).
  - **(c)** No print-service upload limit is recorded anywhere in the repository.
  - So the only limit that could reasonably bind is an external one. **Which print service will these be ordered
    from, and what STL size (or triangle count) does it accept?** Options:
    - (i) give the service and its limit, and the cap is derived from it (triangles = MB / 50 bytes);
    - (ii) keep 1.5 M and make the full build fit it (coarsen the pores' resolution past the budget, told);
    - (iii) set the cap at the browser's measured ceiling less a margin.
- **B. THE COARSE LOOK.** Coarse is the v2 field on the lattice: v1's exact cost, and pores drawn 17–28% off their
  circle (§16). Options:
  - (a) keep it;
  - (b) coarse rings at the lattice's own edge: 3.5× v1's count, 12 s in Node against 1.1 s, still 14% off;
  - (c) no coarse at all — release builds full when it fits the budget.
- **C. THE FULL BUILD'S TIME** (§19). Options:
  - (a) accept;
  - (b) an optimisation session before shipping: the walk's point location, the per-disc charts, typed arrays,
    a worker. None of it is optimised here.
- **D. THE CLOSURE'S COST.** Points ON lattice edges (the ring chords' crossings) are about a third of the hybrid's
  new points (§16). A chart per organ (the sheets' own row law) would remove them, but it is the porting work round
  1 named. Options:
  - (a) accept the cost;
  - (b) a charting session (sheets first).
- **E. NESTED PITS** — §11.5's options, unchanged.
- **F. A PRINTABLE WALL** — §11.6's options, unchanged; the walls are now drawn closely, so a thin one prints as thin.
- **G. THE CONTROLS** — §11.7's proposal, height ruled.
- **H. THE FADE AT HEIGHT** — §11.9's options, unchanged.

**Ambiguities in the brief, read one way and said so:**

1. "Budget % … under hybrid, coarse and full": the FULL build IS the hybrid, so the table has two v2 columns —
   coarse and full (hybrid) — plus v1 and the coarse-rings alternative.
2. "Roundness (merged and free pores)": a merged pore is measured over the outline it OWNS (no neighbour's lip within
   reach), counted when that is at least a quarter of its circumference. A free pore is one with no overlapping
   neighbour. On the merging field free pores are rare (262 of 8,598 discs on the default bloom), so the free medians
   rest on one or two pores per window.
3. "Seams refined only where pores merge" was read with the junction patches as part of the seams (the ruling's
   "wall junctions").

## 22. What is NOT done, named

- Nothing ships: no registry row, no control, no "full detail" button, no read-out line, no TXB clause, no byte
  partition.
- The hybrid is not optimised (§19), and its full build exceeds the budget on every state measured (§17).
- 11 constraint recoveries fail on the default bloom (two arcs crossing at a lens end). They cost a ring segment's
  roundness there and nothing in closure (B2e3).
- The census reads **5 within-shell contacts, every one of span exactly 0** (tangencies) on the default at H 0.4.
  They come from points just over the 1e-3 mm snap. Not chased.
- One pore in the petal window reads 25.5% off in EVERY mesh alike: its lattice triangles are refined by none of
  them (the window's facing test or the junction rule). Recorded, not chased.
