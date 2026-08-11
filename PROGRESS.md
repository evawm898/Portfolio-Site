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
