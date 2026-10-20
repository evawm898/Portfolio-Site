# Curves-sepals — CURVE seeded from the slider shape; sepal spine and outline curves, per tier

Session of Oct 20. Eva's rulings of Oct 20 govern and are not re-litigated here:
petal tilt owns the root angle and the drawn spine is shape only; petal length is
the spine's arc length; placement stays inside Petal curl after tilt, and the sepal
twins sit in the sepal's matching section; a curve made unprintable by a later
slider is clamped and told. **New:** a switch to CURVE seeds the curve from the
slider's CURRENT shape, so the petal does not jump — the spine from the curl
sliders and the outline from the LAW outline — replacing the fixed default curves
as what a switch shows. Sepals get both curves, scope per TIER, and take the fold
limit.

The picture is `docs/img/curves-sepals.png` (`node tools/shot-bloom-curves-sepals.mjs`).

## 1. The seed

**Where it lives.** `seedSpineCurve(state, askedLengthMm, opts)` and
`seedOutlineCurve(state, askedLengthMm, askedWidthMm, opts)` in `bloom-geometry.js`
fit the FEWEST points within a tolerance in millimetres, through each curve's own
sampler — centripetal Catmull-Rom for the spine (through `spineCurveLaw`, the law
the build integrates), PCHIP for the outline (through `curveFunction`). bloom.js's
`onSeedSwitch` (a window capture `change` listener) writes the result into the
curve control **once, on an interactive switch** to CURVE, commits it to the
picked scope when the picked scope owns that curve, and tells it on the curve
control's read-out until the curve is next edited.

**Only a trusted event seeds.** The listener answers `e.isTrusted` changes whose new
value is CURVE. A design file's load, `applyConfig` in every gate, a
`__bloomScopes` record and a matrix row write values with no trusted event, so a
saved curve loads as the curve it is and never as a seed. Switching back to
SLIDER / LAW writes nothing: the sliders come back exactly as they were, and the
seeded curve is kept (hidden) for the next switch. The seed does not follow later
slider moves (a later step of Petal length leaves a seeded outline alone; route
(al) holds it and its mutant re-fits on every slider step).

**The fit is a fit, and the read-out says so.** The sentence is
`SEEDED from <the curl sliders | the law outline> on the switch — N points, within
| NOT within the 0.10 mm tolerance: it departs from it by E mm (position P mm,
direction D° — the direction weighed at one millimetre of blade per radian); a
fit, not the slider build to the bit`. Nothing claims byte identity.

Measured (Node, the shipped functions, the default 35 x 16 mm petal, EXPORT
floor):

| state | points | error (mm) | within 0.10 |
|---|---|---|---|
| curl 0 | 2 | 0.0000 | yes |
| curl 60 | 8 | 0.0773 | yes |
| curl 120 (route (al)'s state) | 11 | 0.0990 | yes |
| curl 150 | 10 | 0.1086 | no |
| curl 270 | 10 | 0.2479 | no (drawn turned −45°) |
| curl 360 | 11 | 0.1808 | no (drawn turned −90°) |
| curl −120 | 8 | 0.1136 | no |
| curl 180, bias 0.6, start 0.3 | 11 | 0.3385 | no |
| curl 360, bias 1, start 0.5 | 12 | 2.0126 | no — see below |
| outline, the default law (tip 1.70) | 10 | 0.0990 | yes |
| outline, base 0.6 / tip 0.9 / shape 1.3 | 7 | 0.0716 | yes |
| outline, base 2 / tip 1 / shape 3, width 30 | 11 | 0.1571 | no |
| outline, base 0.4 / tip 2 / shape 0.6, width 8 | 9 | 0.0698 | yes |

A seed costs 0.1–3.6 s on this box, once per switch.

**What the error is.** Spine: the larger of the position error between the curve's
spine and the slider spine at the same arc positions, and the direction error
weighed at one millimetre of blade per radian (`SEED_TANGENT_MM`) — without the
direction term the tip's turn came out 52° where 60° was asked at a passing
position error. The spine error is reported from `spineLaw` itself, the build's
own law, never from the fitter's proxy. Outline: max(curve, root blend) against
max(LAW core, root blend), over the stretch where the core stands above
`TIP_HALF_MM` (below it the nib owns the outline in both modes).

**The 2.01 mm row is the floor, not the fitter.** A seed is never one the fold
limit or the print floor would clamp (the candidate must pass the refusal bar at
the shortest asked length the build drew); a curl concentrated at bias 1 and start
0.5 reaches the floor on the sliders, and a curve held to the floor cannot follow
it. Told on the read-out as NOT within.

**A drawn shape may be turned or shrunk to stay drawable** (the curve's box and
"in front of its root"): rotated up to the angle the read-out names, shrunk to 0.98
at most, and both are told. The law lays the first chord back along the blade, so a
rotation is never a tilt (J8's contract).

**Decisions made without a ruling.** The tolerance is **0.10 mm** (`SEED_FIT_TOL_MM`)
— a tenth of `MIN_FEATURE_MM`; the direction weight is **1 mm per radian**; the
trusted-event criterion is how "an interactive switch" is told from a load.

## 2. Sepal curves

**The twins.** `SEPAL_TWINS` gains four rows — `sepalCurlMode` / `sepalSpineCurve`
beside the curl twins, `sepalOutlineMode` / `sepalOutlineCurve` (Symmetric /
Asymmetric included) beside the shape twins — and the registry rows are generated
from the table (`sepalTwinControls`, now kind-aware: a choice gets its options, a
curve its curve spec and a validator that asks the SEPAL's own lengths). The
SLIDER / LAW pins in `sepalBladeState` are gone; the value twins map onto the petal
names verbatim (`sepalTwinValue`), so every law downstream — the fold limit, the
print floor and lift, the nib that closes the outline at exactly the asked length,
the refusals — reaches a sepal through the petal builder it already is.
`SEPAL_TWIN_BOUNDS` refuses to narrow a non-slider.

**The sepal's outline width scale reads the sepal's own width.** A drawn outline's
y are fractions of the blade's own length; the petal's ruled scale is
`petalWidth / 16` (16 mm the reference width at the petal's length). The sepal's is
`sepalOutlineWidthScale(state) = (W_s / L_s) / (16 / petalLength)` — the curve read
as drawn for the petal at the 16 mm reference, then laid across the sepal's own
length at the sepal's own width. With no own size set (`sepalLength` and
`sepalWidth` 0) it is `petalWidth / 16` by branch, the sepal the petal's curve at
`sepalScale` in both axes. A decision made without a ruling.

**Tier scoping works like a layer's.** `scopes.tiers[{tier, offsets, values}]`:
a tier's values are the four sepal value ids (`SEPAL_SCOPE_VALUE_GROUPS`:
`outline`, `spine`), validated in `tierOffsetsFor`, resolved through the ONE
resolver (`resolvePetalValues(…, groups)`, its chain extended rather than a second
one) in `sepalTierState`. An owned value REPLACES; an unowned tier inherits the
whole bloom's live; the resets are per group; an edit equal to the inherited value
is pruned. The picker (Scoping-b's `#scopeBar`) edits the picked tier's curves. The
design file reads `values` on a tier (F15); a petal value on a tier is refused by
name.

**The angle limit is drawn on the curved sepal.** `sepalTrialLamina` builds the
trial through `sepalBladeState`, so it reads the curve for free; the scan's row
count follows the outline mode (`NU_BASE` under a drawn outline). An incurved
drawn sepal asked up at 60° clamps to **0°** where the straight sepal at the same
ask stops at **21°**.

**The mirror.** A sepal has no FAN pairing and is never mirrored: a two-sided sepal
outline faces the same hand on every sepal of a tier — the petals' RADIAL
pinwheel. LEFT is F6-asym's definition (the half on the viewer's left with the
sepal seen from its upper face, base at the bottom).

## 3. Gates

- **SP14** (both STL gates): (a) each tier's curl and outline mode against the mode
  RESTATED from the controls and the row's own `@scopes` (`sepalTierValuesRestated`,
  never the resolver); (b) the spine's curve and asked length against the restated
  ones, and the emitted rows against `spineLaw` fed `restatedSpineCurve` (frame-free:
  distances from the first row, plus the sign of the turn); (c) C5's fold-limit
  clauses on the sepal's spine record; (d) the outline's width scale against the
  restated sepal scale, and each half's base half-widths against `restatedOutline`
  maxed with the foot's blend, below each half's own nib.
- SP5, SP5b and SP6 learned the curves: SP6's flatness counts a drawn spine as a
  form (the petal's `petalFormIsFlat` arm); SP5's peak and SP5b's width claims stand
  down under a drawn outline (SP14(d) owns it); SP6 and SP12 leave the value twins
  to SP14.
- **Mutants** (apex table, each witnessed on the mutated module's own sepal records):
  `a-sepal-curve-read-from-the-petals`, `a-tier-curve-leaks-to-every-tier`,
  `the-sepal-limit-drawn-on-the-slider-spine`, `the-fold-limit-skipped-for-sepals`
  — scoped to four `SEPAL CURVES:` rows (`SEPC_ROWS`). Three existing anchors were
  re-anchored onto the moved lines (`sepal-reads-the-petals-controls`,
  `tier-offsets-leak`, `a-scoped-spine-is-ignored`); all 210 anchors match once.
- **Panel route (al)** — the seed (TWENTY-NINE routes), two bloom.js mutants:
  `the seed is never written`, `the seed follows later slider moves`.
- **Design file F15** — the per-tier sepal curves round trip.

## 4. Rows, bytes, census

- Block 72, thirteen `SEPAL CURVES:` rows (1,411 → 1,424): the reflex, the S, the
  hook (clamped at the floor on a 21 mm sepal — a loaded curve, told), the
  lanceolate and the asymmetric outlines, both curves at an own 30 x 12 mm, the
  incurved sepal at its angle limit, the S x sepal cup 0.6 (the fold limit holds a
  sepal), two tiers on two outlines, two tiers on two spines, the petals on both
  curves with the sepals on their sliders, and two GATED rows. Smoke block 72 (four
  rows, `--conn`).
- `frozen/phase78` is the 1,411 rows at `31b89e7`, registered in both maps and
  proved deep-equal.
- **Census:** block 72 reads 0 within-shell pairs on all 13 rows; no entry added.
- **Byte partition** (`verify-bloom-surface-bytes --movers-predicate sepal-curve`,
  predeclared from the BASE tree's own tier record plus the controls and the row's
  scopes): BYTES_RESULT
- Cost: a curved sepal costs what a slider sepal costs (39,998 export tris at 5
  sepals; 57,510 at two tiers); the seed costs nothing at build time.

## 5. Not done

- Leaves are the next session.
- The seed's tolerance and direction weight are decisions, not rulings.
