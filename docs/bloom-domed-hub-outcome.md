# The domed hub, session 14 — what was predicted, what was measured, and what broke on the way to green

Session 14 built `headRise`, the whorl primitive's `height` argument completed: the
junction slab bent into a spherical cap through the rim, every foot landing on it with
its normal, the shell following the feet, the designed centre seated on the apex. PR #146,
merged on Eva's ruling from the sheet (Sep 4): the incurve reads; the hovering button is
a phase-2 centre question, not a blocker. The charter's session-14 entry carries the
design and the doctrine; this document carries the three things a later session will
want as numbers rather than as prose — the pre-registered crowding table, the two
mechanism defects found while closing, and the rim-versus-peak finding with both of its
data points.

Everything below is the EXPORT reading (the artefact), on the surface of the cap where
the feet actually lie, registered against a real STL of each row (crowding R1).

## The crowding table — pre-registered, then measured

The prediction rule was the whole-annulus surface-to-plan area ratio: take the flat
reading, divide by the ratio of the cap's area over the feet's annulus to the annulus's
plan area. Predictions for the first four rows were written to a file before the surface
raster ran; the incurve target's prediction was written after those four had been
measured and before the shipped instrument measured that config — stated, because it is
a weaker pre-registration than the other four.

| configuration | flat D_max / D_mean | predicted at rise 0.5 | measured at rise 0.5 | predicted at rise 1.0 | measured at rise 1.0 |
|---|---|---|---|---|---|
| Eva's mum (120 continuous, spread 0.60, feet floored) | 11 / 4.97 | 9 / 3.94 | **10 / 4.11** | 5 / 2.44 | **9 / 3.14** |
| shipping default (8 petals, spread 2.00) | 2 / 1.12 | 1 / 0.82 | 2 / 1.11 | 1 / 0.45 | 1 / 1.01 |
| the session-7 layered bloom (40/turn × 3, spread 1.55) | 5 / 2.53 | 4 / 2.01 | 5 / 2.10 | 2 / 1.23 | 4 / 1.69 |
| the depth cell (3 × 0.90 × tilt 12) | 3 / 1.62 | 2 / 1.23 | 3 / 1.38 | 1 / 0.71 | 2 / 1.06 |
| the incurve target (40/turn × 3, spread 1.60, length 20, tilt 75, curl 150, ALL THIN feet) | 6 / 2.47 | 5 / 1.89 | **5 / 2.06** | — | — |

The rule over-stated the relief on every row, in the same direction, and the reason is
the standing note below. The mum is relieved and not fixed: 11 → 10 at rise 0.5, 11 → 9
at a hemisphere, against a rule that said 5. Still over-subscribed at 120 florets, which
is the honest result and was stated as the expected one before the build. The incurve
target's D_max landed exactly; its D_mean missed by 8%.

The surface raster that produced the measured column was validated before it was trusted
with a dome: at rise 0 it reproduces the shipped flat raster to the bit, D_max and D_mean
alike, on five configurations.

## Two mechanism defects found while closing

Both were found by the export gate refusing rows, both were fixed on the mechanism and
not on the tolerance, and both are recorded because the fix that was NOT taken is the one
a later session would reach for first.

### 1. A plan raster cannot converge at a vertical rim

The crowding instrument's R5 validity assertion requires D_mean to agree within 0.5%
between a raster and one at twice its cell. On every hemisphere row (rise 1.00) the plan
raster failed it: 1.0335 against 1.0407 on the default, 1.0485 against 1.0554 on the fan,
1.1300 against 1.1376 on the spiral — 0.7% apart, consistently, across ten rows.

At rise 1 the outermost ring stands on a vertical wall. Its foot's plan footprint is a
line, and the cap's area per unit of plan area near the rim goes like one over the square
root of the distance to it. That integral is finite, but a raster sampling it converges
like the square root of the cell, and halving the cell moves the answer by about a factor
of √2 in that strip — which is never inside 0.5%. Two drafts tried to make a plan raster
do it: weighting each occupied cell by the relief at its centre (which also printed a rim
relief of 1.3e151x, a large finite number wearing a factor's clothes), then by the exact
cap area between the cell's inner and outer radii. Neither converged, because the
sampling lattice was wrong, not the weight.

The fix is the surface raster: cells in the cap's own coordinates, arc from the apex along
the meridian and azimuth, with each cell's area `ds · r(s) · dθ` exact and regular
everywhere, the rim included. Membership is the same exact test the plan pass uses,
evaluated at the cell's plan point; only the lattice changed, which is what R5 compares.
Every hemisphere row then converges at 0.012–0.162%, and D_max is unchanged on every row.
The relief at a vertical rim now prints as "vertical", never as a number.

A second, smaller defect of the same kind sat beside it: at rise exactly 1 the cap's
radius was `(2 R0²) / (2 R0)`, which rounds a ULP either side of R0 and puts the rim
ring's height at the square root of a rounding residue — a 2e-7 mm "height" that made
R4's arc position of the rim row disagree with the owner's by 4e-9 on the two-whorl
orchid. The cap radius is now R0 exactly at rise 1, written so rather than computed.

What was NOT done: widening R5's 0.5%, or exempting hemisphere rows. A validity check
loosened to pass is a log line.

### 2. The J8 chord clause compared angles without wrapping

J8 is the root-continuity assertion this session added: the spine's first chord leaves
the ring row in the foot's own meridian plane at tilt plus half the curl of that row. Its
first draft compared `atan2(up, along)` against the expected angle directly. On the
shipped row `DEPTH: 6 layers × layerTilt max × petalTilt max` the sixth whorl's effective
tilt is 225°, which `atan2` returns as −135°; the fifth whorl's 195° comes back as −165°.
The clause fired on a correct build.

The fix is to compare modulo a full turn: `atan2(sin(Δ), cos(Δ))` of the difference,
against the same 1e-9. What was NOT done: capping the effective tilt, or scoping the
clause to tilts under 180° — the 225° state is a shipped, photographed extreme, and an
assertion that excused it would have excused the un-rotated blade there too.

J8's chord clause itself exists because of an earlier silence: its first form checked
only the root NORMAL on flat-form rows, and the un-rotated-blade mutant passed the curled
incurve target — the acceptance configuration — with nothing firing. The chord of a
circular arc leaves at the mean of its start and end angles exactly, and the centreline is
curl's alone, so the chord clause holds on every row, curled or not.

## Standing note — the relief sits at the rim, the crowding at the peak

Why the area-ratio rule over-predicts, stated so the next session reading a clean
whole-annulus ratio does not take it for relief where the feet are:

The cap's surface-to-plan factor is `1 / cos(slope)`. It is 1 at the apex and largest at
the rim, where the slope is steepest. A tight bloom's feet stack at the INNER rings, where
the cap is nearly flat. So the whole-annulus ratio — which is what the prediction rule
divided by — is dominated by surface the feet do not use.

Two data points, both from the instrument's own local relief at the D_max location:

| configuration | whole-annulus ratio at the rise measured | local relief at the D_max point | relief at the rim | D_max, flat → domed |
|---|---|---|---|---|
| Eva's mum, hemisphere (rise 1.00) | 2.04× | **1.11×** at r 2.07 mm on a 4.69 mm hub | vertical | 11 → 9 |
| Eva's mum, rise 0.50 | 1.26× | 1.08× at r 2.24 mm | 1.67× | 11 → 10 |
| the incurve target, rise 0.50 | 1.30× | **1.20×** at r 8.65 mm on a 12.51 mm hub | 1.67× | 6 → 5 |

The read-out's HEAD RISE line prints the surface-to-plan ratio over the feet AND the
local relief at the rim and at the innermost ring, from `footRing()`'s own per-ring
`relief`; the crowding line prints the relief at the D_max point beside the rim's. Where
the flags live, because it is the same kind of fact: a number a visitor cannot set that
decides what the dome did.

The corollary for the next session that wants the mum's base clean: the dome is not the
instrument for it. The relief where the mum stacks is 1.1×, and no rise reachable by this
control changes that, because the apex is flat by construction. What would move the inner
rings' stacking is the tangential packing — forty floored feet on a 15 mm circumference —
which is a count, a foot-width or a spread question, not a height one.
