# Bloom infill — the Voronoi salvage (discovery, Sep 17 2026)

**No repository geometry, registry or gate was touched.** Everything here is a scratch mesh
built on the shipped `petalSurface(u, v)` in EXPORT mode at DEFAULTS by an instrument that
imports `bloom-geometry.js` unchanged. The three instruments are promoted into `tools/`,
headed as instruments not wired to any gate:

- `node tools/bloom-voronoi-proto.mjs [--out <dir>] [--quick]` — the two fields (the first
  prototype and the salvage), construction B, the census, the whole-bloom mesh, `report.json`.
- `node tools/shot-bloom-voronoi.mjs --in <dir> [--quick]` — the render sheet, from those meshes.
- `tools/bloom-soft-render.mjs` — a deterministic software rasteriser and PNG writer, so a
  Node-built mesh can be looked at without a browser, a CDN or three.js.

The sheet is published as a private artifact: **https://claude.ai/artifact/XuCsnuCoqm9EugcJRMiJGX**.
Because the rasteriser is deterministic, no same-tree pixel control is owed on it and none is
claimed; the pictures are for Eva's eye and the numbers are in the captions.

Adding files under `tools/` makes the two FLOWER gates run on the PR (their `tools/**` filter);
no bloom gate keys on these files. They test flower geometry and are not evidence about this.

---

## 1. Why this session exists

The first Voronoi prototype (the earlier discovery in this same brief, never written up — §6
records its findings so a fourth session does not redo them) was rendered and Eva rejected
the look: **too angular, and the pattern never reached the tip or the base, so it floated in
the middle of the petal.** Her judgement was that it is salvageable with three changes:

1. **Rounded wall junctions** — a smooth offset curve rather than a straight polygon inset.
2. **An anisotropic metric stretched along the midrib**, with Lloyd relaxation run in that
   metric rather than the flat one.
3. **Graded cell density** — cells shrinking toward the tip and converging toward the base,
   so the pattern tapers out instead of ending on a line.

The constraints carried in from the first discovery and not re-derived: the plan is computed
flat and mapped through `(u, v)` (exact on the flat default; the arc-length-metric plan is the
build's); outline edges are inset by the full wall; the solid basal zone starts at
`ROOT_BLEND_END`; fringe and cleft excluded; lobes clip by construction because cells are cut
against `halfWidthAt`; construction B (one shell, cells tiling both skins).

## 2. What was built

**The salvage field**, per petal, in the flat plan `(x = u·L, y = v·h(u))` above the basal
zone (one row of overlap into the base panel, the fringe's own weld):

| element | what shipped in the prototype | constant |
|---|---|---|
| metric | `d² = (Δx/a)² + Δy²`, a stretched along the midrib; cells cut in that metric | `ANISO = 2.2` |
| seeding | farthest-candidate, scored by the graded spacing, mirrored about the midrib, 30 % of the seeds ON the midrib (the flower's own axial law) so the apex and the base each get one axial cell | `AXIS_SHARE = 0.3` |
| relaxation | Lloyd, **4 passes, in the anisotropic metric, density-weighted** (the centroid of each cell under `ρ = 1/spacing²`, so the grading survives the relaxation) | `LLOYD_PASSES = 4` |
| grading | spacing ∝ `halfWidth(x)^1.0` toward the tip; ×0.75 at the base rising to ×1 over the first 30 % of the length | `TIP_GAMMA = 1.0`, `BASE_NARROWING = 0.75` |
| the basal V | holes are CLIPPED (not masked) to `x ≥ xB + 0.10·L·(|y|/h_B)^1.5`, a convex region, so the solid zone reaches higher at the margins and the pattern tapers into the base along the midrib | `CONVERGE_FRACTION = 0.10` |
| rounding | every hole corner filleted at 0.8 mm, the radius reduced where an edge is too short to carry it, 5 arc points a corner | `FILLET_MM = 0.8` |
| walls | shared walls inset w/2 from each side; **outline edges inset the full w**; the region's own base edge (over the panel's overlap row) w/2 | `WALL 1.0 / 0.8` |

The first prototype's field is kept beside it as `fieldLegacy` — isotropic, uniform, plain
Lloyd in the flat metric, straight inset — so every comparison is the same tool on the same
petal with only the field changed.

## 3. The numbers — every rendered state

Default petal 35 × 16 mm, sheet 1.20 mm, EXPORT mode; plain petal 2,356 triangles. `real`
is a hole at least `MIN_FEATURE_MM` (1.0 mm) across at its narrowest. `cap floor` is the
outline alone: the last station where a 1.0 mm hole fits between two walls, plus the wall
across the tip. Anisotropy is the median principal-axis ratio of the cells whose centroid lies
at u 0.45–0.75, with the mean |cos| of that axis to the midrib beside it.

| field | N | wall mm | cells | holes / solid | real | hole min / median / max mm | wall fraction | cap built / floor mm | aniso mid-blade | tris | boundary | non-manifold | shells | voxel 0.6 / 0.3 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| first | 10 | 1.0 | 10 | 8 / 2 | 8 | 3.35 / 3.68 / 4.09 | 44 % | 6.66 / 1.79 | 1.13 (0.58) | 1,048 | 0 | 2 | 1 | 1 / 1 |
| **salvage** | 10 | 1.0 | 11 | 10 / 1 | 8 | 0.94 / 2.56 / 3.32 | 56 % | 3.33 / 1.79 | 2.22 (1.00) | 2,140 | 0 | 2 | 1 | 1 / 1 |
| first | 16 | 1.0 | 16 | 14 / 2 | 14 | 2.01 / 2.61 / 3.30 | 47 % | 5.28 / 1.79 | 1.48 (0.87) | 1,244 | 0 | 2 | 1 | 1 / 1 |
| **salvage** | 16 | 1.0 | 17 | 14 / 3 | 13 | 0.90 / 2.12 / 4.00 | 60 % | 2.36 / 1.79 | 1.91 (0.99) | 2,564 | 0 | 2 | 1 | 1 / 1 |
| first | 24 | 1.0 | 24 | 22 / 2 | 22 | 1.51 / 2.04 / 2.77 | 55 % | 5.44 / 1.79 | 1.34 (0.78) | 1,464 | 0 | 2 | 1 | 1 / 1 |
| **salvage** | 24 | 1.0 | 25 | 22 / 3 | 21 | 0.99 / 1.31 / 2.70 | 65 % | 2.39 / 1.79 | 2.14 (0.99) | 3,952 | 0 | 2 | 1 | 1 / 1 |
| first | 10 | 0.8 | 10 | 8 / 2 | 8 | 3.54 / 3.88 / 4.28 | 39 % | 6.54 / 1.41 | 1.13 (0.58) | 1,048 | 0 | 2 | 1 | 1 / 1 |
| **salvage** | 10 | 0.8 | 11 | 10 / 1 | 10 | 1.22 / 2.76 / 3.52 | 49 % | 3.08 / 1.41 | 2.22 (1.00) | 2,140 | 0 | 2 | 1 | 1 / 1 |
| first | 16 | 0.8 | 16 | 14 / 2 | 14 | 2.20 / 2.81 / 3.48 | 40 % | 5.17 / 1.41 | 1.48 (0.87) | 1,244 | 0 | 2 | 1 | 1 / 1 |
| **salvage** | 16 | 0.8 | 17 | 16 / 1 | 14 | 0.69 / 2.32 / 4.20 | 53 % | 1.68 / 1.41 | 1.91 (0.99) | 2,812 | 0 | 2 | 1 | 1 / 1 |
| first | 24 | 0.8 | 24 | 22 / 2 | 22 | 1.70 / 2.23 / 2.96 | 47 % | 5.30 / 1.41 | 1.34 (0.78) | 1,472 | 0 | 2 | 1 | 1 / 1 |
| **salvage** | 24 | 0.8 | 25 | 22 / 3 | 22 | 1.17 / 1.46 / 2.91 | 57 % | 2.29 / 1.41 | 2.14 (0.99) | 4,000 | 0 | 2 | 1 | 1 / 1 |

**Boundary edges 0, one vertex-welded shell and one voxel piece at 0.6 mm and at 0.3 mm on
every rendered state, both fields, both walls.** The two non-manifold edges on every row are
the overlap row shared with the base panel — the cleft weld's own signature, unrated here as
it is in the gates.

Whole bloom, 8 petals at 16 cells, wall 1.0 mm, each petal from its own seed, plus the hub:

| bloom | tris | boundary | voxel pieces |
|---|---|---|---|
| plain (ships) | 19,040 | — | — |
| first prototype | 10,076 | 0 | 1 |
| **salvage** | 21,844 | 0 | 1 |

## 4. Did each change do what it was meant to?

**1. Rounded junctions — yes, and it is the change that costs triangles.** No hole on any
salvaged row carries a hard vertex: every inset corner is an arc (0.8 mm where the edges allow
it, less where an edge is shorter than the tangent length). The wall junctions read as rounded
Ys on the sheet's macros. The price is 5 arc points per corner: the salvaged petal is
**2,564 triangles at 16 cells against the first prototype's 1,244**, and the whole bloom
**21,844 against the plain bloom's 19,040** — roughly the plain petal's own cost, no longer
below it. It made nothing worse.

**2. The anisotropic metric — yes at mid-blade, and the premise about relaxation is half
right.** Median principal ratio of the mid-blade cells, first prototype → salvage:
**1.13 → 2.22 at 10 cells, 1.48 → 1.91 at 16, 1.34 → 2.14 at 24**, and the long axis now lies
along the midrib on every row (|cos| 0.99–1.00 against 0.58–0.87). Four Lloyd passes,
density-weighted, in the anisotropic metric. The controls, measured at 16 cells (the
`METRIC CONTROLS` line of the tool):

| seeding / relaxation / cells cut in | ratio |
|---|---|
| anisotropic / anisotropic / anisotropic — shipped | 1.91 |
| anisotropic / **flat** / anisotropic | 1.79 |
| anisotropic / flat / **flat** | 1.28 |
| anisotropic / none / anisotropic | 2.84 |
| anisotropic / anisotropic / **flat** | 1.10 |

So the **metric the cells are CUT in is what carries the anisotropy**; relaxing in the flat
metric does not undo it while the cells are still cut anisotropically (1.79), and the collapse
toward hexagons Eva named happens when the cells are cut flat too (1.28, or 1.10 with the
relaxation anisotropic). What relaxation itself does is EVEN the lattice, at the cost of some
elongation (2.84 unrelaxed → 1.91 after four passes) — more passes would lower it further,
which is why four and not twelve. The first sheet was angular because its cells were cut in
the flat metric with straight insets, not because of where its seeds were relaxed.

**3. Graded density — yes at both ends, and it is the change that makes the pattern heavier.**
The solid apex cap falls from **5.3–6.7 mm to 2.4–3.3 mm** at a 1.0 mm wall (floor 1.79 from
the outline), and to **1.7–3.1 mm at 0.8** (floor 1.41); the tip macro shows the cells shrinking
into the cap, the basal macro shows the holes tapering into the V. **What it costs, said
plainly: the median hole shrinks and the wall fraction rises** — at 16 cells the median hole
goes 2.61 → 2.12 mm and the lamina goes 47 % → 60 % wall; at 24 cells 2.04 → 1.31 mm and
55 % → 65 %. At 24 cells and a 1.0 mm wall the salvaged petal is two-thirds wall with a median
hole a third over the print floor, which is heavier than the first prototype at the same
count. The 0.8 mm wall buys back most of it (53 % / 2.32 mm at 16 cells; 57 % / 1.46 at 24).
**On the default petal the salvaged pattern reads best at 16 cells; 24 is past what a 16 mm
petal can carry at a printable wall.**

**Smallest achievable solid apex cap.** Built: 2.36 mm at 16 cells / 1.0 mm, 1.68 mm at 16 /
0.8 mm — against outline floors of 1.79 and 1.41. The 0.8 mm figure sits under its floor
because the topmost hole there is one of the three under 1.0 mm across (min 0.69); the cap
a REAL hole can reach is bounded by the floor, and 16 cells at a 1.0 mm wall lands 0.57 mm
above it.

## 5. What the whole-bloom cells show, and what is Eva's

The salvaged bloom from above has cells elongated down every petal, rounded holes, and a
pattern that runs from a short solid cap to a tapering base; the three-quarter view reads the
holes as see-through against the far petals. The first prototype beside it is the doily: round
cells, every one touching the margin, floating mid-petal.

Eva must rule on: whether the salvaged 16-cell petal at a 1.0 mm wall (60 % wall, median hole
2.1 mm) is the look, or the 0.8 mm wall (53 %, 2.3 mm) is worth its thinner rib on an unprinted
floor; whether the basal V (0.10 of the length at the margins) converges enough or should
reach further; and the anisotropy — 2.2 asked, 1.9–2.2 achieved at mid-blade after relaxation,
which the sheet shows and which a higher `ANISO` or fewer passes would raise.

## 6. The first discovery, recorded (it had no doc)

- **The triangle budget is not the constraint; the print floor is.** A bloom-native cut-through
  petal (construction B) costs 1,048–2,116 triangles at 10–44 cells against the plain petal's
  2,356; the flower's 37,830-per-petal figure (session 37) is the flower's emitter, not a
  Voronoi on a sheet. Relief on a densified lattice costs 11,036 (112 × 24) to 41,036
  (168 × 60) per petal and draws diagonal walls as staircases; a conforming relief emitter
  would be ~30 triangles a cell and is a new emitter.
- **Print floors on the default petal** (lamina above u 0.30 is 295 mm² of 407): at a 1.0 mm
  wall 14 real holes at 16 cells (median 2.5 mm), 22 at 24 (2.0), 38 at 44 (1.3), collapsing at
  60. The two apex cells are solid at every density. The flower's density 7 (44 cells) needs
  the 45 × 22 mm petal. Below ~24 cells every cell touches the margin.
- **Domain.** Lobes and serration cut the half-width; `halfWidthAt` is the outline, one panel,
  v ∈ [−1, 1] — lobes and Voronoi are compatible by construction. Fringe (7 panels) and cleft
  (3) are the only true v-splits.
- **Curvature.** Flat-plan → surface stretch: roll and curl exactly 1.000; twist 1.21; buckle
  1.71; cup 1.2 3.02; cup + gradient 5.31; all-form-max min 0.916. Walls never thin below the
  floor except 0.92 mm at the all-max corner; cells stretch across the width under cup.
- **The foot.** Three foot rows, 16 held root-blend rows to u 0.30, a 2.63 mm half-width waist
  at u ≈ 0.05; the basal zone is 27 % of the blade's plan area and is exactly what J1–J4, A7,
  the crowding raster and the seam clearance read. Starting the Voronoi at `ROOT_BLEND_END`
  leaves all of it untouched.
  **THE WAIST FIGURE NAMES A ROW, NOT THE OUTLINE, and the boundary session corrected it:**
  2.6286 mm is the half-width at emitted **row 5** (u = 0.0535714); the waist as a property of the
  outline is **2.5820 mm at u = 0.057939**, which is the same station as `rootBlend` handing the
  width to the core and as session 37's declared 44.54 degree tangent break. The enumeration this
  bullet gestures at is done by line, and the boundary is measured against it, in
  `docs/bloom-infill-base-boundary.md` — which finds that 0.30 is already the correct floor.
- **Margin rib.** The tiling construction leaves a half-wall lip along the outline by itself,
  so a rib is not a precondition for the invariant; it is a precondition for the print floor,
  which is why outline edges are inset by the full wall now. 0 orphan wall segments at 10–44
  cells on the default.
- **Gates.** The self-intersection census evaluates a holed shell as it is; what it cannot
  tell apart is the base-panel overlap from a fold, so a cut petal joins the cleft rows' class
  or gets an epsilon weld. The captured grid stops at the basal zone, so `/plot` and the wall
  instrument lose the lamina on a cut petal. Sepals are not built in the bloom; the leaf has
  its own lattice emitter, so nothing reaches it for free.

## 7. Recorded, not built

- The arc-length-metric plan (one line in the plan mapping) — the build's, so a cupped petal's
  cells are not stretched 3× across.
- A per-cell wall-width taper (thinner walls toward the tip, the rib-hierarchy rule) — the
  wall is one number here.
- The lobed-outline row — compatible by construction and not rendered.
- The whole-bloom mesh is one seed per slot; a bloom with per-petal seeds is what a build would
  ship, and the seed's ownership (slot index, as the buckle's phase) is the build's ruling.
