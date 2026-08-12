# Bodice panel placement tool

Places rigid panels on the bodice front, which — unlike the skirt cone — is
**doubly curved** at the bust and cannot be flattened. The surface is modeled
as a curvature field and panels are placed only where curvature permits.

## Status

- **Phase 1 (this directory now): curvature model + zone classification.**
  Awaiting zone validation before placement logic is written.
- Phase 2 (pending): panel placement, active-area symmetry about CF,
  downward tail routing to the waist bus, coverage report.

## Run

```
node bodice-placement/run-zones.mjs [--tol mm] [--measurements file.json]
```

Prints the model checks and the zone table, and writes
`bodice-placement/output/bodice-zones.svg` (front elevation, zones shaded by
the largest size class that fits).

## Method

1. **Surface**: front half-torso loft — half-elliptical cross-sections
   (width:depth 1.35) through waist/underbust/chest girths, plus two bust
   prominences displaced along the section normal. The prominence amplitude is
   solved so the **tape girth** (convex hull of the section — a tape bridges
   the sternum hollow) matches the bust measurement; the base loft is
   iteratively corrected so underbust/waist tape girths match too, and the
   displaced apex lands at ±apexSeparation/2.
2. **Curvature**: principal curvatures k1, k2 per grid node via the first and
   second fundamental forms (finite differences). The operator self-tests
   against an analytic cylinder and sphere on every run. R = 1/max(|k1|,|k2|).
3. **Chord rule**: max span = √(8·R·tol), default tol 2 mm.
   Doubly curved cells cap the panel's largest dimension; single-curved /
   planar cells cap only the width (panels may run tall). Cells where the
   smallest class doesn't fit are EXCLUDED (bust apexes).
4. **Zones**: connected regions of "largest class that fits", 3×3 majority
   smoothing (mirror-symmetric tie-break), regions < 20 cm² merged into their
   dominant neighbor. Since merging can absorb tighter cells, each zone
   reports `fit%` — the share of its area where the class truly fits
   per-cell; placement must re-validate per cell.

## Conventions

- Coordinates in mm: x lateral (0 = center front, **+x = wearer's left**),
  y vertical (0 = waist), z outward.
- The SVG elevation is drawn as seen by an observer facing the wearer
  (wearer's right appears on the left).

## Shared file: `panels.yaml` (repo root)

Panel size classes are read from `../panels.yaml`, which is **shared with the
skirt tool and append-only** — add new classes at the end, never modify or
reorder existing entries. See the contract header in that file.

## Isolation

This directory is the bodice tool's only footprint besides `panels.yaml`.
Nothing under the skirt tool's directories is read or written.
