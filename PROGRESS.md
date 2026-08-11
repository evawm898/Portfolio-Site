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
