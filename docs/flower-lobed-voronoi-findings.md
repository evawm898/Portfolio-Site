# LOBED + VORONOI — round 2: is a cleft-aware bound viable, and which fix

**Status: MEASUREMENT ONLY. No fix written.** `flower.js`, `flower-geometry.js`,
`flower-registry.js` and every gate are byte-identical to `a671fdf`. The candidate fixes are
prototyped inside the harness (`docs/tools/diag-lobed-voronoi-options.mjs`) so they can be
costed and checked against the star-shape constraint before any of them is written into the
generator.

Round 1 (`docs/tools/diag-lobed-voronoi.mjs`) established the cause: the Voronoi clip polygon
is the envelope, so 23–30% of it is void and 27 of 42 cells at 4 lobes contain material that
does not exist. This document answers the three questions that decide the fix.

## Harness validity first

The seed sampler is a **replica** of `buildVoronoi`'s — a second copy of a producer, which is
why it lives in a throwaway harness and not in shipped code. It is verified every run against
the real builder under the same envelope clip:

| config | replica cells | real slabs | replica area | real area | ratio |
|---|---|---|---|---|---|
| SMOOTH, margin off | 48 | 48 | 2.7450 | 2.7448 | **1.000** |
| LOBED 2, margin off | 48 | 48 | 2.6683 | 2.6601 | 1.003 |
| LOBED 4, margin off | 48 | 48 | 2.6391 | 2.6342 | 1.002 |
| LOBED 7 d12, margin off | 82 | 82 | 2.6563 | 2.6559 | 1.000 |
| LOBED 4, margin ON | 42 | 42 | 2.0464 | 2.0420 | 1.002 |
| **LOBED 4, aniso 4** | 48 | 48 | 2.6391 | **20.7616** | **0.127** |

The last row does not validate, and the reason is a finding of its own — see
[Anisotropy](#separate-finding-anisotropy-breaks-the-tiling-property). **Every option figure
below is at `anisotropy = 1`**; the aniso rows in the raw JSON are indicative only.

## 1. A cleft-aware inner bound is viable

Built as the marching-squares level set of `petalMask(x, y/f) · f − ribRadius(u)`, where
`f = marginFlareFactor(u)` (identity when continuous margin is off) — the same construction
`maskContours` already uses, at a threshold instead of at zero.

| | today (`ribMarginPolyline`) | level-set bound |
|---|---|---|
| max vertical crossings, 2 / 4 / 7 lobes | 2 / 2 / 2 | **4 / 8 / 14** |
| interior that is void, 2 / 4 / 7 lobes | 18.5% / 22.3% / 23.7% | **0.09% / 0.10% / 0.12%** |
| loops returned | 1 | 1 (never fragments) |

**It reproduces today's bound where today's bound is correct.** On a smooth petal, per-u-bin
max |y| against `ribMarginPolyline`: mean **0.105 mm**, max **0.298 mm** (margin off); mean
0.133 mm, max 0.454 mm (margin on, areas 2.1645 vs 2.1645).

That is not zero, and the reason matters: **`petalMask` is not a distance field.**
`|∇petalMask|` measured over the material — mean 1.10–1.24, min 0.04, max 1.68. A level set of
a non-unit-gradient field is not an exact offset, so the inset distance is only approximately
`ribRadius`. The 0.3–0.45 mm gap is that error plus grid resolution. It sits under the quality
gate's 1.5 mm `marginGap` threshold, but it is a real shift and it is not byte-identical.

### Blast radius

`ribMarginPolyline` has two consumers, and only one of them is Voronoi:

- `buildVoronoi`'s cell clip (`flower-geometry.js:2586`)
- `terminateEdges`' capture target for veins / bone / spacecol under MEET and LOOP
  (`flower.js:1269`), mirrored in `verify-geometry-quality.mjs:380`

Redefining `ribMarginPolyline` in place would move vein termination by up to ~0.45 mm on
**every** petal, smooth ones included, for a defect that is Voronoi's. **Recommendation: add a
new cleft-aware producer beside it and point `buildVoronoi` at that; migrate `terminateEdges`
as a separate change with its own before/after.** Same reasoning as `ribPath` exposing two
views rather than one being made to serve both.

### What the quality gate would say: nothing

`verify-geometry-quality`'s registration metric compares infill points to `ribInnerEdge(u)` —
the scalar envelope — binned by u and taking max |y| per bin. Measured for every option:
overshoot ≤ 0.03 mm, undershoot ≤ 0.01 mm, against thresholds of 3 mm and 2 mm.

So the fix will not trip the gate. The same fact says the gate **cannot see this defect and
never could**: the outermost lobe still reaches the rib in every u-bin, so a sheet spanning
every sinus registers perfectly. A gate is needed for the property that actually fails.

## 2. Which fix — per-lobe partition, and material-aware adjacency is refuted

LOBED, 4 lobes, `cleftDepth 0.55`, density 7, continuous margin ON — the shipped default:

| option | cells | Σ verts | area / bound | not star-shaped | cells crossing void | mean perimeter in void |
|---|---|---|---|---|---|---|
| **today** | 42 | 714 | **1.44** | 7 | 27 | **32.5%** |
| cleft-aware clip only | 41 | 1538 | 1.00 | 11 | 8 | 9.8% |
| material-aware adjacency | 41 | 10518 | **7.29** | 27 | 18 | 12.6% |
| **per-lobe partition** | 38 | 1502 | **1.00** | 9 | **6** | **2.1%** |

`area / bound` is the tiling test: a Voronoi diagram partitions its domain, so total cell area
should equal the bound's area. Today's 1.44 is the void being covered. 

**Material-aware adjacency does not work, and the measurement is unambiguous: 7.29.** The
cells overlap sevenfold (2.63–7.29× at every lobe count, 116–256 vertices per cell against
today's 17). Filtering a seed's neighbour list destroys the property that makes a Voronoi
diagram a partition — a seed whose cross-sinus neighbours are removed has nothing bounding it
in that direction, so its cell runs through the shared base and into other lobes. It is not a
lighter version of partitioning; it produces overlapping cells, and it triples the star-shape
violations while doing it. The predicate is as cheap as you expected; the consequence is not.

**Per-lobe partition is the only option that both tiles and clears the void** — 2.1% mean
perimeter in void against 9.8% for clip-only and 32.5% today, at 1.00 area/bound. It holds at
every lobe count (7 lobes: 1.6% mean, 10 of 82 cells, vs 28.0% and 51 of 82 today).

## 3. The star-shape constraint is already violated today

You named it as the deciding constraint. Measured — centroid inside the cell, and every
boundary vertex reachable from it without leaving the cell:

| config | today | clip only | adjacency | partition |
|---|---|---|---|---|
| SMOOTH, margin off | **0** / 48 | 0 | 0 | 0 |
| SMOOTH, margin **ON** | **2** / 44 | 0 | 0 | 0 |
| LOBED 2, margin off | 2 / 48 | 4 | 10 | 3 |
| LOBED 4, margin ON | **7** / 42 | 11 | 27 | **9** |
| LOBED 7 d12 | 2 / 82 | 24 | 34 | 8 |

**Two of forty-four cells on a plain round petal, today, in shipped code.** The flare makes the
bound non-convex near the foot, and a cell clipped to a non-convex bound need not be star-shaped.
`cellAnnulus`'s assumption is not a line the fix would cross — it is already crossed.

So the constraint cannot be "keep every cell star-shaped", because no option achieves that and
neither does the status quo. It has to be: **make it an assertion, and fix `cellAnnulus`.**
Whichever adjacency strategy ships, per-lobe partition included, would otherwise ship 9 of 38
cells whose annulus is built on rays that leave the cell. That is the print-safety work, and it
is separable from and prior to the clip work.

## 4. Cost, as a number

Real page, LOBED 4 lobes, margin ON, 4 petals:

| density | 3 | 5 | 7 | 9 | 12 |
|---|---|---|---|---|---|
| triangles | 135,864 | 161,264 | 183,364 | 206,164 | 241,164 |
| seeds | 22 | 34 | 48 | 62 | 82 |

Linear fit: **1,755 triangles per cell**, non-infill base **97,254**. So at density 7 the
Voronoi infill is **86,110 triangles — 47% of the model.**

I cannot separate the per-cell fixed cost from the per-vertex cost, because vertices-per-cell
is nearly constant across densities today. So the projection is a **bracket between two
models, both built from measured quantities**, not a point:

| | cells | Σ verts | tris ∝ cells | tris ∝ Σ verts | total |
|---|---|---|---|---|---|
| today | 42 | 714 | — | — | 183,364 |
| partition, full-resolution bound (1322 verts) | 38 | 1502 | 175,000 (−5%) | 278,000 (+52%) | **175k – 278k** |
| partition, bound simplified to 0.25 mm (40 verts) | 38 | 220 | 175,000 (−5%) | 124,000 (−32%) | **124k – 175k** |

The vertex cost is inherited boundary detail, and the codebase already has the answer for it —
`simplifyPath`, the Douglas-Peucker pass that keeps the rim's triangle count down. Applied to
the bound at 0.25 mm it collapses 1322 vertices to **40** while the bound's void content stays
at 0.06%, and cell vertices drop below today's.

Its cost is fidelity: mean perimeter in void goes 2.1% → 4.6%, void-crossing cells 6 → 11. At
0.5 mm tolerance that degrades to 7.6% and 14 cells — too far. **0.25 mm is the setting.**

**Recommendation: per-lobe partition against a 0.25 mm-simplified cleft-aware bound. Expected
total 124k–175k triangles against today's 183,364 — the fix is very likely cheaper than the
defect it removes.** A point number requires building it.

## The basal region

`uFloor = 1 − cleftDepth = 0.45`, so 45% of the petal is one undivided region joined to every
lobe. The partition prototype splits it as `{base: x ≤ uFloor·L}` plus one region per lobe, and
that straight cut at u = 0.45 is a real seam, not an artefact of the prototype: seeds distribute
24 base / 11 / 7 / 3 / 3 at 4 lobes, 50 base / 3–8 per lobe at 7. Half the seeds are in the base
region. Whatever ships needs a deliberate answer for how cells cross u = 0.45 — the numbers above
are with the naive straight cut, and its void performance is already the best of the options, but
the seam has not been evaluated visually.

## Separate finding: anisotropy breaks the tiling property

At `voronoiAniso 4` the **real** builder's slabs sum to **20.76 u² of outer area on a 2.64 u²
petal** — the cells overlap roughly eightfold. At `aniso 1` they sum to 2.63, a clean tiling.

`voronoiCell` clips each seed by a bisector computed under **that seed's own** metric, and with
per-seed flow metrics two neighbours no longer agree on where their shared edge is, so the
half-planes are not reciprocal and the diagram stops being a partition. This is independent of
clefts and needs its own check, including on a smooth petal, which this harness has not run.
Not part of this fix.

## Comments to correct in whatever PR fixes this

1. `flower.js:1251` — "Voronoi slabs already clip to the lobed silhouette, so they are left
   untouched." False; it is the reason for the `P.infillType !== 'voronoi'` exclusion.
2. `flower-geometry.js:762` — reading `outerAt` "keeps the scalar bound every infill clips to
   and the polyline the rim is lofted along the same curve." True on a smooth petal. On a cleft
   petal the rim is lofted along `.loop` and the bound is its envelope: related, not the same.
