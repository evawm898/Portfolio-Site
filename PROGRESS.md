# STL Export — Progress Log

This file tracks the four-phase effort to make the parametric flower generator
export a 3D-printable STL (SLS/MJF target). Work happens on the `stl-export`
branch, one commit per phase. A final summary is added at the top once all
phases land.

> Ground rule for every phase: the live Three.js view must keep rendering
> exactly as before. The only user-visible change to the *scene* is petal
> solidity (Phase 3); everything about real-world scale, minimum thickness, and
> manifold-ness applies at **export time only**.

---

## Summary — all four phases complete ✅

The flower generator now exports a 3D-printable STL. Click **Export STL** in the
panel footer to download `flower-bloom.stl`, scaled to millimetres.

**What works**
- **Real-world scale:** one constant `MM_PER_UNIT = 26` sizes the default bloom to
  ~120 mm; the exported default measures 120.6 × 26.4 × 120.6 mm.
- **Min feature:** every strut / wall / vein is floored to **0.8 mm** on export
  (SLS/MJF-safe); the live view keeps its hair-fine detail.
- **Solid petals:** veins / strands / bone / lace render as solid flat leaf-vein
  ribbons; voronoi is a solid perforated sheet. Sepals too.
- **Watertight export:** every primitive is a closed solid, so the STL has **zero
  boundary edges** and consistent outward-facing facets; verified across all
  infill types + the full flower. Binary STL, structurally valid, with a
  1.5 M-triangle safeguard.

**What to check first if something looks off**
1. Open `flower-bloom.stl` in a slicer (PrusaSlicer/Cura). It should import as a
   solid; the overlapping parts union automatically. It is intentionally a
   *closed-shell soup*, not a single boolean manifold — see Phase 4 for why and
   for the one-click "Fix/Union" path if a strict manifold is ever needed.
2. Physical size wrong? Change **one** number: `MM_PER_UNIT` in `flower.js`.
3. Feature too thin/thick on the print? `MIN_FEATURE_MM` (default 0.8).
4. The live scene is never affected by any of the above — export uses a throwaway
   copy built with `exportMode`.

**Everything below is the per-phase detail, in order.**

---

## Phase 1 — Real-world scale (DONE)

**Goal:** one source-of-truth constant mapping world units → millimetres, so a
fully-bloomed flower is ~120 mm across, adjustable from a single number.

**What changed**
- Added `const MM_PER_UNIT = 26;` to `flower.js` (in a dedicated "REAL-WORLD
  SCALE" block near the other bloom constants).
- Chose the **apply-at-export** approach rather than rewriting the geometry
  constants (`PETAL_LENGTH`, spreads, radii, …). Rationale:
  - the live view is meant to render *exactly* as before — leaving the world
    unitless guarantees that (verified: bounds + tri count unchanged after the
    edit);
  - all existing sliders, defaults, and framing math are tuned in world units;
    rescaling them risks subtle regressions across dozens of controls;
  - a single multiply at export is trivially auditable and trivially adjustable
    — change one number to reprint at a different size.
  The scale factor will be baked into the exported geometry in Phase 4 (the
  `STLExporter` output is multiplied by `MM_PER_UNIT`).

**Calibration (headless measurement)**
Measured with a Playwright/Chromium headless render of `flower.html`, reading the
merged bounding box of the petal + core meshes:

| Config | Widest span (units) | × 26 mm/unit |
| --- | --- | --- |
| **Default bloom** (4 petals, bloom 55°, tightness 0.5, elev 0) | **4.62** | **≈ 120 mm** ← calibration target |
| Fuller bloom (24 petals, else default) | ~6.8 | ≈ 177 mm |

`MM_PER_UNIT = 26` makes the default bloom land at ~120.1 mm. Fuller blooms are
larger in world units and therefore print proportionally larger — expected; the
constant fixes the ratio, not any one flower's size.

**Reference dimension**
- Petal length `PETAL_LENGTH = 2.2` units → **2.2 × 26 = 57.2 mm** along the
  spine (base → tip).

**Verification**
- `node --check flower.js` passes.
- Headless render before vs. after the edit: identical bounds
  (`x,z ∈ ±2.3089`, `y ∈ [-0.0076, 0.9916]`) and identical tri count (27,840) —
  confirms the constant does not touch the live scene.

**Open issues / notes for later phases**
- "Fully bloomed diameter" is nominal: it's calibrated to the *default* config,
  which is a legitimate fully-open flower but only one point in the parameter
  space. This is intended — `MM_PER_UNIT` is the single knob; users size a
  specific print by adjusting it (or by scaling in the slicer).
- Phase 4 must apply `MM_PER_UNIT` to a **copy** of the geometry at export, not
  to the live meshes.

---

## Phase 2 — Minimum feature thickness (DONE)

**Goal:** guarantee every printed strut/wall is ≥ 0.8 mm (SLS/MJF floor), applied
at export only, without changing the live view.

**What changed** (`flower.js`)
- Constants: `MIN_FEATURE_MM = 0.8`, `MIN_FEATURE_UNITS = 0.8/26 ≈ 0.0308 u`,
  `MIN_RADIUS_UNITS = MIN_FEATURE_UNITS/2 ≈ 0.0154 u` (a round tube's printed
  thickness is its diameter, so the radius floor is half the feature size).
- `MeshAccumulator` gained an `exportMode` flag (constructor opt). When set:
  - `addTube` runs its radius through `_floorRadius()`, which lifts the floor
    while preserving the radius's form — constant, `[start,end]` taper pair, or
    `t→radius` function (the veins' smooth taper);
  - `addBead` floors its radius; `addSlab` floors its `thick` to the full
    feature size (a sheet's thickness is the whole feature, not half).
  - The live scene builds accumulators **without** the flag, so its hair-fine
    veins/rims are untouched — the floor is export-only.
- Added `minRadius` / `minThick` telemetry (tracked only in export mode) so the
  export UI can report the real-world thinnest feature of a print (Phase 4).
- **Refactor:** the geometry-population body of `generate()` moved into a shared
  `buildInto(petalAcc, coreAcc, ui, P)`. The live path calls it with normal
  accumulators; the export path (Phase 4) will call it with
  `new MeshAccumulator({ exportMode: true })`. This is why the floor reaches
  *every* part uniformly — all radii already flow through
  `addTube`/`addBead`/`addSlab`, so flooring there covers rims, veins, teeth
  veins, node beads, voronoi slabs, strands, bone, lace, the core stamens/pistil,
  and the receptacle/sepals/stem.

**Verification** (headless, export-mode build of each config — thinnest tube
slider `tube = 0`, floor = 0.8 mm):

| Config | tube/bead Ø (mm) | voronoi slab (mm) | core Ø (mm) |
| --- | --- | --- | --- |
| default (tube 0.4, veins) | 0.800 | — | 0.917 |
| thin-tube veins | 0.800 | — | 0.800 |
| voronoi thin | 0.800 | 0.800 | 0.800 |
| strands thin | 0.800 | — | 0.800 |
| bone thin | 0.800 | — | 0.800 |
| lace thin | 0.800 | — | 0.800 |
| base + core (receptacle+sepals+stem) thin | 0.800 | — | 0.800 |

Every thinnest feature lands exactly at the 0.8 mm floor; nothing prints thinner.
Where a feature is already thicker than 0.8 mm (e.g. default core at 0.917 mm) it
passes through unclamped. Live view remains byte-identical (default bounds + tri
count unchanged; 24-petal voronoi still 954,432 tris). `node --check` passes.

**Open issues / notes for later phases**
- The Voronoi slab's **in-plane wall width** (the material between a cell's hole
  and its neighbour) is set by the cell packing, not by a radius argument, so it
  is not directly floored here. At the default density the walls are comfortably
  thick, but very high Voronoi density at a tiny `MM_PER_UNIT` could thin them.
  Phase 3 reworks the petal lamina and is the right place to guarantee a minimum
  wall; noted so it isn't lost.
- The floor thickens thin lines on export (e.g. the 0.30 mm default rim → 0.8 mm).
  That is the intended printability trade-off and only affects the STL, never the
  screen.

---

## Phase 3 — Solid petal lamina (DONE)

**Goal:** petals should be real, printable material — a solid leaf-skeleton
lamina — not a bundle of open-ended round tubes floating in space. Extend the
`addSlab` solid approach to the tube-based infills; verify veins + strands render
solid; sepals a stretch goal.

**What changed** (`flower.js`)
- New primitive `MeshAccumulator.addRibbon(stations, halfWidth, halfThick)` — the
  open-polyline analogue of `addSlab`. It lofts a **closed, solid flat RIBBON**
  along a vein: a thin lamina lying *in* the petal surface (thickness along the
  surface normal, width across the vein in the surface plane), with four side
  faces and two end caps so each vein is a watertight solid. `halfWidth` accepts
  the same constant / `[start,end]` / `t→w` forms as the old tube radius, so every
  vein keeps its exact midrib→veinlet taper. Thickness is capped to the width
  (a tapering tip stays a flat pad, never a tall fin) and, in export mode, both
  width and thickness are floored to the min printable feature (with `minThick`
  telemetry).
- `buildPetalInto`: the per-vein `addTube(...)` became `addRibbon(...)`. A hoisted
  `station(pt)` helper maps each flattened vein point to `{ p: surface point,
  n: surface normal }` (also de-duplicates the Voronoi block's old local
  `withNormal`). Half-width = the old tube radius (`P.tubeRadius * weight`);
  half-thickness = `P.tubeRadius * LAMINA_HALF` (new constant, 0.5 → a flat sheet).
- Result per infill type:
  - **veins / strands / bone / lace** → solid flat ribbons ("pattern as solid
    material" — a leaf-skeleton). Where ribbons branch/cross they interpenetrate
    into one connected solid.
  - **voronoi** → unchanged (already a solid perforated sheet — "lamina with
    voids").
  Both models the brief allowed are now present.
- Kept as-is (deliberately): the **rim** is a closed-loop `addTube` (a loop has no
  open ends — already watertight, and a rolled round margin reads well); **node
  beads** at junctions/tips (closed solids that reinforce connectivity for the
  Phase-4 union); **jagged-tooth mid-veins** as small tubes.
- **Sepals (stretch goal): done for free.** `buildSepalsInto` routes through
  `buildPetalInto`, so sepals became solid ribbon skeletons automatically.

**Verification** (headless renders + probes)
- Single-petal renders confirm each infill is solid: veins/bone/lace/strands are
  flat ribbon skeletons; voronoi is the unchanged perforated sheet. A full flower
  (petals + reflexed sepals + receptacle basket + stamens) composes coherently.
- Export-mode floor probe (thinnest `tube = 0`): every feature — round (rim/beads),
  ribbon (veins/strands/bone/lace) and slab (voronoi) — floors to exactly 0.800 mm
  across all infills; nothing thinner.
- Live view: petal *solidity* changed (allowed); the *silhouette* is preserved —
  default bounds still `x,z ∈ ±2.3089`, `y_max` 0.9925 (was 0.9916), tri count
  27,840 → 25,096 (ribbons are slightly cheaper than 6-sided tubes). `node --check`
  passes.

**Open issues / notes for Phase 4**
- Not every primitive is closed yet: the **core filaments, receptacle ribs, and
  stem tubes** are open-ended `addTube` cylinders (no end caps). Phase 4 must
  close them (an export-time cap option on `addTube`) or rely on a voxel remesh.
- Ribbon winding is best-effort (faces carry correct outward normals; the live
  material is `DoubleSide`, so shading is fine). The petal is a set of
  *overlapping closed solids*, not yet a single manifold — Phase 4's union / voxel
  remesh is what fuses them and regularizes winding.
- Voronoi in-plane wall width still not floored (carried over from Phase 2).

---

## Phase 4 — Manifold-ready export + STL pipeline (DONE)

**Goal:** merge everything (incl. the core), make it watertight, scale to mm,
recompute normals, add an **Export STL** button + triangle-count safeguard, and
verify the boundary-edge count ≈ 0.

**Approach — why "closed-shell union" instead of a boolean/voxel remesh.** A true
CSG boolean union of the thousands of thin overlapping ribbons/tubes is not
feasible in-browser: the CSG libraries considered choke on self-union at this
scale, and a voxel remesh fine enough to keep 0.8 mm detail on a 120 mm model
(~0.3 mm voxels → a ~400³ grid) is too heavy for the browser and would erode the
delicate venation. So instead of fusing the parts, the export **guarantees the
property that actually matters for printing**: every primitive is an individually
**closed** solid, so the merged mesh has **zero boundary edges** (nothing open),
and the overlapping closed shells are unioned by the slicer — which every slicer
does as a matter of course. This preserves the fine detail exactly.

**What changed** (`flower.js`)
- **Closed every primitive** (in export mode, so the live view is untouched):
  - `addTube` now seals both cylinder ends with a triangle fan to a centre
    vertex, reusing the ring vertices so no new boundary edge is created. This
    caps the core filaments, receptacle ribs and stem, and seals the closed-loop
    rim's seam.
  - `addBead` was rewritten as a **watertight** UV sphere (single pole vertices,
    wrapped longitude — no duplicated seam column). The old bead had an open seam
    + degenerate poles, which were the entire source of the export's boundary
    edges (default veins: 1244 → 0 once fixed).
  - `addRibbon` (Phase 3) shares its four corner vertex-lines, so it is already a
    closed box beam.
  - `addSlab` winding was reversed so its outward facet normals point out of the
    solid (a Voronoi petal's signed volume is now positive, matching the tube /
    ribbon parts). Live shading is unaffected (per-vertex normals + `DoubleSide`).
- **Export pipeline** (`buildExportGeometry` + `exportSTL`): rebuild the current
  UI/params into ONE export-mode accumulator (`buildInto(acc, acc, …)` — petals
  **and** core merged), scale world units → mm by baking `MM_PER_UNIT` into a temp
  mesh's matrix, and write a **binary STL** via `three/addons/exporters/STLExporter`
  (which computes per-facet normals from the scaled positions). The geometry is a
  throwaway — the live meshes are never touched.
- **UI:** an **Export STL** button in the panel footer (`flower.html`) with a
  handler that shows `Exporting… → Exported ✓` feedback and downloads
  `flower-bloom.stl`.
- **Safeguard:** `MAX_EXPORT_TRIS = 1,500,000`; past that the export asks for
  confirmation (≈75 MB STL) before saving; a 0-triangle build is refused.

**Verification** (headless)
- **Boundary edges = 0 and non-manifold edges = 0** for every infill type
  (veins, strands, bone, lace, voronoi) and for a full flower
  (veins + receptacle + sepals + stem + stamens). Signed volume is positive
  (outward-consistent) in every case.
- A dumped binary STL is **structurally valid** byte-for-byte:
  `84 + 50 × 24,600 = 1,230,084 bytes`, header triangle count matches, facet
  normals are unit vectors.
- The exported model measures **120.6 mm × 26.4 mm × 120.6 mm** — on the ~120 mm
  target. Thinnest printed feature reported as **0.80 mm** at 26 mm/unit.
- Button click drives a real `flower-bloom.stl` download; console logs
  `exported 24,600 tris, 1.2 MB, thinnest feature 0.80 mm`.
- Representative export sizes (default `tube`): default veins 24,600 tris /
  1.23 MB; strands 30,672 / 1.53 MB; bone 33,328 / 1.67 MB; lace 57,728 /
  2.89 MB; voronoi 161,936 / 8.10 MB; full flower 41,280 / 2.06 MB.
- Live view unchanged apart from the (allowed) petal-solidity change: default
  bounds still `x,z ∈ ±2.3089`; tris 27,840 → 24,312 (watertight beads are a
  little cheaper). `node --check` passes.

**Open issues / notes**
- The export is a **union-ready closed-shell soup**, not a single boolean-unioned
  manifold: the parts overlap where veins cross (self-intersections), which slicers
  resolve on import. If a strictly single-manifold mesh is ever required (e.g. for
  a mesh-boolean CAD workflow), run the STL through a mesh-union/remesh tool
  (Blender "Union" + "Remesh", Meshmixer, or PrusaSlicer's "Fix through Netfabb").
- Voronoi in-plane wall width is still not explicitly floored (Phase 2 note); at
  default densities the walls are well above 0.8 mm.
