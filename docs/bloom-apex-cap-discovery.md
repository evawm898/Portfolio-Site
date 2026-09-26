# Petal apex end-cap — discovery, and why it is shelved

Eva's ruling on this investigation: **FULL ROUND is shelved. No geometry change ships from
this document.** It is kept because the two candidates, the single-parameter family and the
blend mechanism are real work, worth a permanent record, and worth not re-deriving the next
time the apex facet comes up. Read `docs/bloom-apex-nib-outcome.md` first for the shipped nib
this investigation started from.

## The complaint

At high `petalTipShape` (n gtrsim 2), the shipped apex nib construction produces a visibly
small, angular facet at the tip instead of a smooth round end. The nib closes the tapering
blade with a tangent-circle arc down to a fixed tiny width (`APEX_HALF_MM = 0.2mm`,
`APEX_END_HALF_MM = 0.05mm` terminal strip) — a construction sized for a POINTED outline,
which n < 2 draws. Above n = 2 the law itself stops converging to a point (the superellipse's
own osculating radius at the true apex is 0 for n < 2, finite at n = 2, and diverges — the
law goes flat — for n > 2), so forcing the SAME tiny fixed-width nib onto an outline that no
longer wants to converge produces a visibly disproportionate small point sitting on top of an
otherwise broad, flat-topped shape.

## Two candidates were prototyped, both throwaway, both discarded

**SOFT-CORNERED BLUNT** (the law's own squarish front, shoulders filleted, no nib) — dropped
outright. It produces real mesh defects above n approx 2.20 (2,592 degenerate triangles, 304
non-manifold edges on Eva's petal), and the physical room for its fillet construction
collapses from 0.32mm to 0.06mm as n rises from 2.15 to 3.00, while the fillet's own natural
extent needs 4-60x more room than that. Not debugged further, per Eva's ruling.

**FULL ROUND** (a circular cap tangent to the law, centred on axis, radius on the order of
the local half-width) — the surviving candidate, refined over three rounds:

- **The single-parameter family.** `apexPlanY0(shapeBaseAt, rootBlend, uPk, lengthMm,
  petiole, y0Target)` generalises the shipped nib's tangent-circle construction onto ONE
  parameter — `y0Target`, the tangent circle's own defining height — rather than two separate
  curve constructions blended point by point. The shipped nib is `y0Target = APEX_HALF_MM`
  (0.20mm); FULL ROUND is `y0Target = TIP_HALF_MM` (0.80mm), at which point the flank
  disappears entirely (`xFaceMm === xLawMm`) and the cap is a pure tangent circle off the law.
- **The blend is one parameter interpolated, not two curves merged.** `y0Target` ramps
  linearly from `APEX_HALF_MM` to `TIP_HALF_MM` across `n in (2.00, 2.20]`, through the SAME
  `apexPlanY0` construction at every point in between — so every intermediate state is a
  genuine member of the tangent-circle family, never an interpolation of two different curve
  outputs. Verified bit-identical to shipped at and below n = 2.00 (0 of 222,192 floats differ
  on Eva's petal, at n = 1.70/1.90/1.95/2.00), and continuous with no dip in drawn length or
  cap radius across the whole band (checked at 0.01 and 1e-4 resolution; the only change at
  the n = 2.00 boundary is a rate change from zero slope to positive slope — C0 continuous,
  C1 not claimed).
- **Row demand.** The cap's own row count is requested via `ladderDemand()` and rendered at
  the measured-adequate 12-row demand (up from the shipped 6) in every round-2/3 render.

## Why neither candidate fixed the look

1. **By eye, FULL ROUND still reads as more polygonal than shipped at n = 2.50/3.00**, with a
   distinct bright facet at the apex — Eva's own read of the round-2 sheet, confirmed again
   after the 12-row/single-parameter fix in round 3.
2. **The widened turn-angle metric (round 3) found the real defect lives outside the cap
   entirely.** Measuring the maximum per-segment turn over the WHOLE shoulder-to-apex turn
   (`[uPk, 1]`, not just the last few millimetres) on Eva's petal:

   ```
   n=1.70  SHIPPED 11.59deg  |  FULL-ROUND 11.59deg   (bit-identical, below the band)
   n=2.00  SHIPPED 10.61deg  |  FULL-ROUND 10.61deg
   n=2.25  SHIPPED 17.16deg  |  FULL-ROUND 18.30deg
   n=2.50  SHIPPED 23.46deg  |  FULL-ROUND 24.77deg
   n=3.00  SHIPPED 32.15deg  |  FULL-ROUND 33.95deg
   ```

   The worst single segment sits 0.09-1.6mm back from the tip, inside the ordinary
   superellipse law, well before either construction's own arc/flank begins — and FULL ROUND
   is not better there; it is measurably worse through most of the band. Neither candidate
   touches the law or the row ladder outside the tiny cap region, so neither could have fixed
   this even in principle. This finding reopened the investigation into the row ladder itself
   (NU, the gap bound, the demand mechanism) as a separate, ongoing line of work — not part of
   this document, and not yet ruled on.
3. **The "bright notch" is a third, separate defect, pre-existing on shipped and inherited
   unchanged by FULL ROUND.** Every petal's last row is floored at a fixed
   `APEX_END_HALF_MM = 0.05mm` half-width in BOTH constructions, at every n tested — round 2's
   and round 3's two candidates only ever changed the FLANK approaching that terminal strip,
   never the strip itself. Confirmed under silhouette-first (near-matte) lighting on both
   trees, so it is real geometry, not a specular artifact of the shipped shiny material.

## Disposition

FULL ROUND, SOFT-CORNERED BLUNT, and the single-parameter blend mechanism are recorded here
and are NOT shipped. `bloom-geometry.js` on this branch is byte-identical to `main` at this
commit — every throwaway prototype lived in a scratch git worktree, never in this tree.
