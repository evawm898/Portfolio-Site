# Bloom — the leaf-to-stem instrument: the combination gate reads the emitted stem (Oct 25)

**Status: SHIPPED as an instrument change only. `bloom-geometry.js`, `bloom-registry.js`, `bloom.js`,
`bloom.html` and `bloom.css` are untouched, so no geometry moves.** Eva's ruling 7 of Oct 25 on T5's
ambiguity 8 (`docs/bloom-surface-texture-t5-outcome.md` §3a and §8): *the leaf-to-stem contact at a 70°
leaf angle is invisible to the combination gate — find why and make the gate see it, textured and
untextured.*

## 1. Why the old measure could not see it

`measureLeafStemApproachMm` (the combination gate's `leaf-stem` measure, also read by the defaults bar)
did three things, and each was checked rather than assumed:

| | what it did | measured on the gate's base state (stem 70 × 6 mm, a 52 × 17 mm leaf, 3 nodes, EXPORT) |
|---|---|---|
| (1) the STEM | every blade vertex against `freeStemDistanceMm` — the plan's ANALYTIC solid cylinder | blind to anything the builder does to the stem's surface: at leafAngle 70 it read **0.5404 mm at every `textureHeight` 0.4 … 1.5**, while T5's emitted measure reads 0.252 at H 0.4 and the blade and the relieved wall meet from H 0.8 |
| (2) the LEAF | each leaf REBUILT into a throwaway accumulator outside the bloom's build | agrees with the bloom's emitted leaf to the bit on every state measured (0 of 3 × 24,872 × 9 floats differ, textured; 0 of 3 × 3,044 × 9 untextured) — but only because nothing in the bloom's leaf loop moves a leaf after `buildLeafInto` returns. A leaf moved there is not the leaf it looked at (the plant, §3) |
| (3) the SAMPLING | blade VERTICES only | a facet passing through the stem with its corners outside reads positive |

So the answer to "sampling, a pair exclusion, or a frame issue" is: **a second producer on BOTH sides**
(the analytic stem, the rebuilt leaf) plus vertex-only sampling. The rod exclusion (the petiole, named by
the builder's own `rodAxes`) was not the defect and is kept.

## 2. What replaces it

ONE export build, its own stream. The stem is the triangles the builder emitted for it (T5's lattice
range when the organs are textured, `[hubTriEnd, stemTriEnd)` otherwise); each leaf is its own emitted
block (`leavesBuilt[*].triStart / tris`). A blade vertex reads its distance to the nearest STEM TRIANGLE
(`tools/bloom-inflo-approach.mjs`'s `triGrid` / `nearest`, the inflorescence measures' one engine), 0 if
it lies inside the free stem's solid, and the reading is 0 if any blade EDGE crosses a stem triangle
(`crosses`). Both halves are reported (`inside`, `crossing`). Rods are excluded by name, as before. The
old function is kept as `measureLeafStemAnalyticMm`, used only by the must-fail.

| leafAngle | H | analytic (old) | emitted (new) | crossing |
|---|---|---|---|---|
| 35 | untextured | 3.8463 | 3.8468 | no |
| 35 | 0.4 | 3.8463 | 3.5053 | no |
| 35 | 0.8 | 3.8463 | 3.1508 | no |
| 35 | 1.5 | 3.8463 | 2.5316 | no |
| 70 | untextured | 0.5404 | 0.5439 | no |
| 70 | 0.4 | 0.5404 | **0.2518** | no |
| 70 | 0.8 | 0.5404 | **0.0000** | **yes** |
| 70 | 1.5 | 0.5404 | **0.0000** | **yes** |
| 85 | any | 0.0000 | 0.0000 | yes (and inside) |

Untextured the new measure reads a hair FARTHER (0.5439 against 0.5404): the emitted stem is a 48-gon
inscribed in the cylinder. That is the artefact, not the plan.

## 3. The plant — RED on the new instrument, invisible on the old (the must-fail)

`node tools/bloom-combination-gate.mjs --control` (which CI already runs) gained one leg. It writes a
COPY of `bloom-geometry.js` whose bloom build moves every leaf it has just emitted 1 mm toward the stem's
axis (the leaf's recorded rod axes with it, so the rods stay named), measures both instruments on the
70° base state, and requires the new one RED and the old one to read exactly the clean double:

```
  ok   leaf-stem: a leaf pushed 1 mm into the stem at 70 deg         RED on the emitted measure, invisible on the analytic one
         witness: the planted bloom's leaf moved 1.000 mm · NEW measure clean 0.5439 mm -> planted 0.0000 mm (crossing true, inside true) · OLD measure clean 0.5404 -> planted 0.5404 mm (INVISIBLE — the same double)
```

The witness is read on the MUTATED module's own bloom build (its leaf block moved 1.000 mm), never on
either measure. The copy's anchor is refused unless it matches exactly once.

## 4. What the gate now sees, and what was re-recorded

- **A new tier-1 pair, `leafangle-x-textureheight`** (leafAngle 35/50/70/85 × textureHeight
  0.4/0.8/1.2/1.5 on PEBBLE): 8 cells under the bar, all declared by value — 0.252 at 70°/H 0.4, a
  CROSSING (0) at 70° from H 0.8, and 0 at 85° at every height. `single-reaches` (the angle reaches the
  bar at the floor height alone). 35° falls 3.505 → 2.532 mm and never reaches the bar.
- **Nine declared cells re-recorded, every one IMPROVED by the inscribed polygon**: `leafangle-x-stem`
  and `leafangle-x-tooth` at 70° 0.540/0.541 → 0.544; `lobedwidth-x-leafangle` at 70° 0.4071 → 0.411. No
  cell that cleared went under the bar; no declared cell started clearing.
- **`leafangle-x-stem @ stemDiameter` is now declared INERT** (CG7, 0 mm): on the emitted 48-gon the
  blade's nearest point is the vertical edge through the polygon's vertex at the leaf's azimuth, a line,
  so 3 / 6 / 12 mm read the same 3.847 / 2.574 / 0.544 / 0.000 mm to 6.66e-16. The analytic cylinder's
  0.0013 mm of spread was the cylinder's curvature, not the stem's. CG1 said so; the declaration carries
  the number.
- The defaults bar (`verify-bloom-defaults-bar.mjs`, which reads this measure) passes on all ten
  shipped states; the leaves at the ruled 35° read 3.847 mm.
- `tools/bloom-texture-t5.mjs` (A) now prints the analytic, the gate's and T5's vertex-only figures side
  by side.

## 5. Ambiguities flagged, not resolved

1. **The contact at 70° on a textured stem is a real interpenetration on the shipped geometry** (the
   stem's relief passing through the blade from H 0.8). This PR declares it by value and fixes nothing
   (the brief). Whether the relief should fade where a blade comes near the stem — or the leaf angle be
   clamped — is a geometry ruling for a later session.
2. **The rachis of a compound leaf and the floret pedicels** are still measured by their own families
   (`floret-stem` reads `freeStemDistanceMm`, the analytic rachis). The same blindness to a relieved
   rachis applies there in principle; the rachis is a rod (Q12, deferred) and a floret build's stem is a
   pedicel, so nothing relieves them today. Not changed.

## 6. Byte partition

No geometry file changed (sha256-identical to `main` at `2000b1b`), so every exported float is
identical by construction. The gate, the defaults bar and the T5 tool are the only files that moved.
