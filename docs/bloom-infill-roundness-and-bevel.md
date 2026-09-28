# The infill's rim bevel and the roundness control — measured, nothing built

A measurement session: **no generator file moved.** `bloom-geometry.js`,
`bloom-registry.js`, `bloom.js`, `bloom.html` and every `flower*` file are
byte-identical to `0993c6e`. Every figure below comes from a committed tool:

| tool | what it is |
|---|---|
| `tools/bloom-rim-roundness-lib.mjs` | a PATCHED COPY of `bloom-geometry.js` written outside the repo, with two knobs (`RIM_BEAD_SEGMENTS`, and the one line in `petalInfillPlan` that fillets a hole); every anchor must match exactly once or it refuses. Plane sections of the emitted mesh, and the roundness law under test |
| `node tools/shot-bloom-rim-bevel.mjs <dir>` | → `docs/img/infill-rim-bevel.png`: three rims × {K=4 flat, K=4 smooth, K=6 smooth, K=8 smooth}, one camera per row, plus true cross-sections |
| `node tools/shot-bloom-infill-roundness.mjs <dir>` | → `docs/img/infill-roundness-sweep.png` and the §2 table: roundness 0 → 1 on the default petal and the whole bloom, achieved count in every caption |

`tools/bloom-soft-render.mjs` gained an optional per-vertex-normal channel;
its flat path is byte-identical to `0993c6e` (same camera, same bloom, 360,000
bytes compared, `Buffer.compare === 0`).

All geometry below is EXPORT mode (what print preview shows) unless it says
LIVE. The shipping default (`petalInfill: NONE`) is touched by neither half.

## 0. The ruling this session carried, and the one it supersedes

**SUPERSEDED:** "cells are always round, no control at all" (the port plan's
§0, *"carried from earlier passes"*). **CURRENT (Eva) — AND NOW BUILT, see §G:** roundness gets a
control, and **the state shipping today is its FLOOR** — the least round the
cells are ever allowed to be. The range extends upward toward circular. The
port plan's line now points here. The comment above `infillFillet` in
`bloom-geometry.js` cited the old phrase; the roundness-control session (§G)
edited it.

## A. Why the rim reads as a bevel — it is geometry, and on an infilled petal it is not a bevel at all

### A1. The outer margin of an INFILLED petal is a flat 90-degree wall

> **FIXED by the margin-bead session — `docs/bloom-infill-margin-bead.md`.** The table below is the state before it.

Cross-sections of the emitted mesh at 95 stations along the margin (`u` 0.04 →
0.98), one default petal:

| petal | stations with a flat wall | stations with the bead |
|---|---|---|
| plain (guard off) | **0** | 95 |
| **infilled** | **91** (u 0.08 → 0.98) | 4 (the basal panel below the split) |

Identical in LIVE and EXPORT. At `u` 0.55 the infilled margin is a wall
**1.200 mm** tall meeting both skins at **90.00°** — the section in row 2 of
`infill-rim-bevel.png` is a box. That is the "90° angle at the petal edge": it
is S5's own declared regression (`docs/bloom-infill-s5-hole-rims.md` §5 —
*"the outline above the split is still a flat wall"*), and on the default it
covers **96% of the margin**. No segment count and no shading can soften it,
because there is no curve there to resolve: every column of row 2 is the same
box.

### A1b. Where there IS a bead, what it is

| rim | drawn bead r | half rim thickness | shape |
|---|---|---|---|
| plain petal, outer margin | 0.500 | 0.504 (tapered 1.20 → 1.0076) | a full half-round; K=4 turns 20.0 / 44.8 / 44.5 / 44.8 / 20.0°, facets 0.385 mm |
| infilled petal, hole rim | 0.450 (the 0.45 × 1.00 mm wall clamp) | 0.600 (no taper on a hole) | NOT a half-round: 75% ellipse / 25% wall (#278's blend). Leaves the skin at **31.5°**, 36.1°, **45.0° apex**; 0.10 mm of flat skin between the two beads on each face of a 1.00 mm wall |
| hole rim, sheet 2.40 | 0.450 | 1.200 | 38% bead: **68.7°** off the skin, then nearly straight to a 40.3° apex — reads as a wall with a pointed nose |

So on the outer margin of a plain petal there is no flat between the beads
(the taper brings the rim to 1.0 mm, exactly twice the radius); on a hole there
is 0.10 mm, and the profile is pointed rather than round because the bead is
narrower than the sheet is thick.

### A2. Segment count

| K | facet width (r 0.5) | turn per facet | hole-rim apex turn |
|---|---|---|---|
| **4 (shipped)** | 0.383 mm | 45° | 45.0° |
| 6 | 0.259 mm | 30° | 32.1° |
| 8 | 0.195 mm | 22.5° | 24.8° |

Measured off the emitted section, matching the closed forms `2r sin(90°/K)`
and `180°/K`. With smooth normals on (A3) the K=4 plain-petal rim already reads
as round in `infill-rim-bevel.png` row 1; K is not what Eva is seeing.

### A3. Shading — it is ON in both views, so this is not a zero-byte fix

Measured in the real page (Chromium, the shipped `bloom.js` with one read-only
hook appended), triangles whose vertex normals depart from their face normal by
more than 1°:

| view | default | infilled default |
|---|---|---|
| LIVE | 17,824 of 24,688 | 108,912 of 113,424 |
| PRINT PREVIEW | 8,160 of 24,688 | 79,584 of 113,424 |

LIVE uses three's `toCreasedNormals` at 60° (every 45° bead facet is smoothed);
PRINT PREVIEW uses the builder's closed-form bead normals (`captureNormals`) —
**note bloom.js's comment there says print preview "stays flat"; the code hands
three.js the bead normals, and that is what the page does.** Neither view can
soften the infilled margin: a flat wall's two 90° edges are a crease in LIVE
(over 60°) and carry flat normals in PRINT PREVIEW (a wall profile returns
`ns: null`).

**Side finding, not diagnosed:** in print preview 1,872 triangles on the
default (20.1 mm²) carry a vertex normal more than 60° off their own face —
worst 89.6°. A shading artefact at most; recorded so it is not rediscovered.

**Cause, ranked:** (1) GEOMETRY — the infilled margin is a wall; (2) geometry —
the hole bead is a pointed 75% ellipse leaving the skin at 31.5°, because the
0.45 mm bead is narrower than the 0.60 half-sheet; (3) K — real but already
hidden by smoothing; (4) shading — already on.

## B. What roundness costs

### B1. The proportional fillet never shipped

`drawnOf` fillets every hole corner at **`INFILL_FILLET_MM` = 0.8 mm of
surface** (a plan function on a curved plan), clamped so the tangent length
cannot pass **0.45 × the shorter adjacent edge**. S3's brief ruled a fillet
proportional to cell scale; the tree has the absolute one. On the default the
clamp binds on **55 of 164 corners (33.5%)**, drawing radii down to
**0.022 mm** — effectively sharp. Hole roundness (isoperimetric 4πA/P², 1 = a
circle, 0.785 = a square) runs **0.531 – 0.982, median 0.818**: today's cells
are rounded polygons, square-ish on average. On `cup 1.2 × curl 360` the clamp
binds on 53.8%.

### B2. The law measured, and the sweep

Roundness `s ∈ [0, 1]` OPENS each shipped hole by `s ×` its own inradius
(erode, then dilate: the union of every disc of that radius that fits). `s = 0`
returns today's polygon **by branch**, so the floor is the shipped state
exactly; `s = 1` is the inscribed circle. Default petal and whole bloom, EXPORT,
ruled defaults:

| s | holes | width min / med (mm) | solid | hole area | min wall | junction solid Ø min / med | roundness min / med | tris petal | bloom | 40 × 3 |
|---|---|---|---|---|---|---|---|---|---|---|
| **0 (today)** | **20/20** | 1.545 / 2.726 | 53.8% | 179.1 mm² | 1.0000 | 1.055 / 1.174 | 0.531 / 0.818 | 14,346 | 113,424 | 1,162,112 (77.5%) |
| 0.25 | 20/20 | 1.545 / 2.726 | 53.9% | 178.9 | 1.0000 | 1.057 / 1.172 | 0.550 / 0.818 | 14,302 | 113,072 | 1,147,472 |
| 0.50 | 20/20 | 1.545 / 2.726 | 54.8% | 175.3 | 1.0000 | 1.057 / 1.172 | 0.654 / 0.818 | 14,058 | 111,120 | 1,124,512 |
| 0.60 | 20/20 | 1.545 / 2.726 | 56.0% | 170.7 | 1.0000 | 1.059 / 1.174 | 0.710 / 0.847 | 13,636 | 107,744 | 1,105,952 |
| 0.70 | 20/20 | 1.545 / 2.726 | 58.0% | 162.8 | 1.0000 | 1.065 / 1.178 | 0.769 / 0.883 | 13,470 | 106,416 | 1,095,872 |
| 0.80 | 20/20 | 1.545 / 2.726 | 61.0% | 151.4 | 1.0000 | 1.072 / 1.188 | 0.816 / 0.923 | 13,432 | 106,112 | 1,089,392 |
| 0.90 | 20/20 | 1.543 / 2.726 | 64.9% | 136.1 | 1.0000 | 1.075 / 1.247 | 0.848 / 0.956 | 13,408 | 105,920 | 1,091,872 |
| 0.95 | 20/20 | 1.543 / 2.726 | 67.7% | 125.2 | 1.0000 | 1.078 / 1.279 | 0.928 / 0.980 | 13,402 | 105,872 | 1,089,792 |
| **1 (circle)** | **20/20** | 1.539 / 2.718 | **74.4%** | **99.2** | 1.0000 | 1.202 / 1.600 | 0.997 / 0.997 | 12,768 | 100,800 | 1,045,712 (69.7%) |

LIVE == EXPORT triangle counts at every step. "Junction solid Ø" is the
largest hole-free disc centred on each interior Voronoi vertex (26 of them);
"min wall" is `tools/bloom-infill-wall.mjs`'s in-sheet wall.

**THE ACHIEVED COUNT DOES NOT FALL, AND THAT IS A PROPERTY OF THE LAW, NOT
LUCK.** The brief's trap ("rounder holes lose area, so the count falls") holds
for area — **179 → 99 mm², −45%** — and not for the count, because the ruled
1.50 mm bar is an INSCRIBED WIDTH and an opening never removes a hole's
largest inscribed disc. The only width movement is the polygonised circle
(40 segments) reading `cos(4.5°)` narrow: **1.545 → 1.539 mm** on the smallest
hole, still clear of the bar. A law that rounded by *shrinking* (e.g. a circle
of equal area) would lose holes; this one cannot.

### B3. Where it stops being useful — at both ends

* **THE BOTTOM HALF IS DEAD TRAVEL.** From 0 to 0.5 the median roundness does
  not move (0.818) and the area moves 2%: `s × inradius` stays below the 0.8 mm
  fillet already on most corners, so only the clamped corners change. The
  picture confirms it — the first three columns of the sheet are one drawing.
  A shipped control should map its floor to the fillet, e.g.
  `R = r_c + s (r_in − r_c)` per corner, so the first step of travel does
  something. Measured on this law, not on that one.
* **THE TOP IS STEEP, NOT FLAT.** 0.95 → 1.0 takes the area 125 → 99 mm² in
  one step: the eroded core collapses to a point as `R → r_in`. There is no
  plateau past which travel does nothing (1.0 is the circle and the end of the
  range), but the last 5% of travel does as much as the previous 40%.
* **The bar never eats a hole** anywhere in the range (on the FLAT default —
  on a curved plan it can, and the shipped control clamps against it; §G) (above). What the top end
  costs is open area — the solid fraction rises 53.8% → 74.4% — which is
  material, weight and the lace look, not printability. The junctions only
  thicken (min 1.055 → 1.202 mm).

### B4. The I1 xfail, the stretch edge

* **`ALL FORM MAX`'s I1 xfail (1.4799 mm) was not re-measured** because nothing
  was built and I1 reads the emitted mesh. By B2's argument its plan width
  cannot fall under this law; the session that builds it re-measures and
  re-declares at whatever the tree reads, in both directions.
* **Stretch** re-checked on this tree, unchanged: 18 holes to 1.585, **20 from
  1.586**, 20 at 1.60 / 1.65 / 1.70 / 1.75. No default was touched, so 1.65
  stays as ruled; 1.70 is still the nearest value two clear steps from the edge.

## C. The shared budget — K is where it breaks, not roundness

EXPORT triangles, built:

| row | K=4 | K=6 | K=8 |
|---|---|---|---|
| shipping default | 24,688 | 28,880 | 33,072 |
| infilled default bloom | 113,424 | 153,200 | 192,976 |
| `INFILL: x 40 petals x 3 whorls` | 1,162,112 (77.5%) | **1,516,352 (101.1%)** | **1,870,592 (124.7%)** |
| `INFLO: ALL MAX` (no infill) | 1,425,468 (95.0%) | **1,656,028 (110.4%)** | **1,886,588 (125.8%)** |

With roundness at its ceiling the corner at K=6 falls to 1,318,832 (87.9%) and
at K=8 is still 1,591,952 (106.1%) — but the floor is today's state, so any K
above 4 over-runs on the corner at `s = 0`, and `INFLO: ALL MAX` over-runs at
any roundness because it carries no infill at all. **Per the brief, STOP:
raising K is a budget ruling, not a build.** It is also not the fix (A).

Roundness alone at K=4 is cost-NEUTRAL to CHEAPER: the corner goes 77.5% →
69.7% at the circle, because a circle carries fewer rim points (984 → 740 on the
default petal) than a filleted polygon.

The fix A points at — beading the outer margin above the split — was projected
by S5 at **124,496** (default) and **1,332,672 = 88.8%** (corner) at K=4; with
roundness in the range that stays under the ceiling. That projection is S5's,
not re-measured here.

**Slowest shard:** on `main`'s own run of `0993c6e` (36357727401) shard 6 took
47.6 min (46.9 min matrix step), the run 48.3 min. Roundness at K=4 moves only
the infilled rows' triangle counts, downward; this project has measured per-row
overhead, not triangle count, dominating gate time, so the projection is
**unchanged at ~48 min** — read `actions_list` at the time rather than this
figure.

## D. What the sheets show

* `docs/img/infill-rim-bevel.png` — rows: plain margin / infilled margin /
  hole rim; columns: true section, K=4 flat, K=4 smooth, K=6 smooth, K=8
  smooth, same camera per row. Row 2 is the finding.
* `docs/img/infill-roundness-sweep.png` — nine steps, petal face-on and the
  whole bloom, print-preview geometry and shading, achieved count and triangle
  count in every caption. Column 0 is today (the before), column 8 the circle
  (the after); the shipping default is guard-off and unchanged by both.

## E. What would come next, in order — each a ruling first

1. **Bead the infilled outer margin above the split** (S5 §5's named next
   move). This is what Eva is seeing. Budget: S5's projection, under the ceiling.
2. **Roundness as a control**, floor = today, with the floor mapped to the
   existing fillet so the bottom of the travel is live (B3), and the proportional
   fillet question (B1) settled in the same ruling. **DONE — §G: the swept law
   unreparameterised (§F refuted the reparameterisation), and B1's
   proportional fillet RETIRED.**
3. **K stays 4** unless the budget is ruled on: K=6 refuses two shipped rows.

## F. Ruling 3 cannot be met by the recommended reparameterisation (the roundness-control session, measured, nothing built)

Eva ruled the control's default to be **the shape labelled ROUNDNESS 0.60** on
`infill-roundness-sweep.png`, and asked that the control be reparameterised as
§B3 recommended (floor mapped to the existing fillet, so the whole travel is
live) with the default then set to whichever new value reproduces that shape
— and to stop if none does. **None does.** `node tools/bloom-roundness-law-match.mjs`,
EXPORT, ruled defaults, the default petal:

* **The ruled shape is a SPLIT.** Under the swept law (`R = s × inradius`) a
  hole's fillet corners first move at `s = fillet / inradius` — on the default
  that onset runs **0.469 to 1.036, median 0.587**. So at 0.60, **9 of the 20
  holes are still today's hole at every unclamped corner and 11 are rounded**:
  the smaller holes have not started, the larger ones have.
* **A law whose floor is the fillet moves every hole at its first step, so it
  cannot produce that split at any value.** Measured over `t` 0 → 0.40 in 0.01
  steps (`R = a + t (rIn − a)`, `a` = the hole's largest fillet radius, capped
  at its inradius): the worst single hole differs from the ruled one by
  **53.8% of its area and 1.51 mm Hausdorff at every t**, and the TOTAL hole
  area never gets back to the ruled 170.75 mm² (163.69 at t = 0, falling from
  there). The median roundness crosses the ruled 0.8468 near t 0.08, which is
  exactly the "pick the nearer one" answer the ruling forbids — the holes are
  different holes.
* **The one family that reproduces it exactly is the swept law itself** (or an
  affine rescale of its `s`), because the split is keyed on each hole's own
  inradius. That family's travel below the smallest onset (0.469 here) moves
  only the clamped corners (area 179.1 → 175.3 mm² by 0.50, median roundness
  fixed) — the dead half §B3 named. The dead half and the ruled shape come
  from the same property; removing one removes the other.

The choice is Eva's; the options are in the session report.

## G. The roundness control ships (the roundness-control session — Eva's ruling on §F)

**RULING (Eva), recorded as she gave it because it inverts this doc's own §B3
recommendation and must not be re-litigated:** OPTION 1 — ship the swept law
as it is, 0 to 1, **default exactly 0.60**.

* **The dead-looking travel is the law being honest.** Below the point where
  `s × inradius` passes a hole's existing 0.8 mm fillet there is nothing to
  round; a slider that says "these corners are already rounder than you asked"
  is correct, not broken.
* **The threshold is per hole and per petal** (0.469 to 1.036 across the
  default's twenty), so it is **TOLD PER BUILD in the read-out and never baked
  into the range** — the stamen-spread and carnation-terminal precedent.
* **Option 2 (a fixed 0.47 floor offset) is REJECTED:** 0.47 was measured on
  one petal and the onsets move with petal shape, so it would clip real travel
  on a narrow petal and leave dead travel on a wide one.

**THE SECOND RULING IT IMPLIES, recorded explicitly:** the ruled 0.60 shape is
a SPLIT — 9 of 20 holes at today's corners, 11 rounded — and that split exists
only because the fillet is an ABSOLUTE 0.8 mm. **The earlier ruling "the fillet
becomes a fixed proportion of cell scale rather than an absolute 0.8 mm, short-
edge clamp as a ceiling only" was never implemented and is now RETIRED**: a
proportional fillet rounds every hole together from the first step and
destroys the shape Eva ruled. It is struck in `docs/bloom-infill-port-plan.md`
with this reason, and the header of `INFILL_ROUND_*` in `bloom-geometry.js` and
the registry row say the split is a property of the absolute fillet.

### G1. What ships

`infillRound` (Infill, a slider 0–1 step 0.05, **default 0.60**; range, step and
default IMPORTED from the geometry — Q6). Hidden AND inert at the guard, out of
`SWEEPABLE` and block 1 through the derived `INFILL_SUBS` (a slider hidden at
DEFAULTS behind `infillPresent`), so `ALL MAX` stays uninfilled. K stays 4.

The law, in `petalInfillPlan`'s `drawnOf`, one hole at a time:

1. **Roundness 0 is today's hole BY BRANCH** — the shipped fillet's own
   polygon, the same doubles; nothing below runs.
2. Otherwise the hole is the **opening** of the fillet traced at 20 segments an
   arc (the sweep's own construction) at `R = s × inradius` (the inradius of
   today's hole; capped at 0.999 of the fine polygon's), and the dilation's
   arcs are cut by BISECTING unit normals — `+`, `/` and `Math.sqrt` only, the
   cosine a literal — and decimated at the sweep's own 9-degree step, so **no
   discrete decision rests on trigonometry** (the `rimSameP` / `infillSnap`
   class this feature has now been bitten by four times).
3. **It is CLIPPED TO TODAY'S HOLE**, so the floor is structural: the control
   only ever removes material from the hole that shipped. This was forced by
   measurement: without it the finer trace bulges OUTSIDE the shipped
   five-chord trace by up to its sagitta (3.9e-2 mm) and drew holes up to
   **1.7e-4 LESS round** (isoperimetric) than today's at roundness 0.05–0.20 —
   the tracing, not the law. The vertices the clip leaves on today's chords
   are pruned where they sit within `INFILL_ROUND_FLAT_MM` = 0.8 mm × (1 − cos
   5°) = 3.05e-3 mm of the chord through their neighbours.
4. **The floor is also a DECISION**: where the pruned result is even slightly
   less round than today's, today's hole is kept.
5. **On a curved plan the opening is done in the surface's own local frame**
   (the Cholesky factor of the first fundamental form at the hole's centroid,
   snapped to 2^-30), and **the ruled bar holds it back**: a plan circle on a
   compressed sheet is a narrower ellipse on the object, and measured, the
   swept plan-space law took `cup 1.2 × curl 360` from 12 holes to **10** from
   roundness 0.90 and `ALL FORM MAX` from 17 to **16** at 1.00. In the local
   frame the loss was halved and not removed (the metric varies across a
   hole), so where the floor hole clears 1.50 mm and the opened one does not,
   the radius is bisected (eight halvings) to the largest that keeps the bar,
   and the hole is counted as HELD. **The achieved count now holds at every
   step of the whole range on all six states measured, flat and curved.** (What
   can fall on a curved plan is the count of holes rounded PAST their fillet —
   a held hole may sit under its fillet again: `ALL FORM MAX` 13 → 12 at 0.70,
   `cup 1.2 × curl 360` 7 → 5 at 0.75. The read-out says how many were held.) On
   the flat default the frame is the identity and the clamp never binds.

The read-out (the control's own value line) tells the ACHIEVED shape from the
builder's record: median roundness, hole area, solid fraction, how many holes
are rounded past their fillet and how many are still at it, and the per-build
onset range below which only clamped corners move. `__bloomMetrics().infill`
carries `round` and `roundShape`.

### G2. The default is the ruled shape — measured, hole for hole

`node tools/bloom-roundness-law-match.mjs` (the shipped control against the
swept law at 0.60, run on a patched copy of THIS tree with the control stood
down — a different owner; per-hole bands DERIVED from the two discretisations,
nothing typed):

| state | holes (swept) | hole area mm² (swept) | median roundness (swept) | worst per-hole area | worst per-hole Hausdorff |
|---|---|---|---|---|---|
| **default** | **20/20 (20/20)** | **170.67 (170.75)** | **0.8467 (0.8468)** | 0.43% | 0.0135 mm |
| petalWidth 8 | 8/20 (8/20) | 39.17 (39.21) | 0.7619 (0.7618) | 0.17% | 0.0069 mm |
| petalWidth 30 | 20/20 (20/20) | 388.48 (388.53) | 0.8709 (0.8709) | 0.27% | 0.0151 mm |
| density 40 | 22/36 (22/36) | 116.14 (116.37) | 0.8577 (0.8579) | 0.69% | 0.0130 mm |
| cup 1.2 × curl 360 | 12/20 (12/20) | 97.40 (97.48) | 0.8884 (0.8996) | — | — (opened in the surface frame, differs by design) |

Every flat-plan hole within its own band; the residual is the arcs'
discretisation (and, at unrounded corners, today's five-chord trace kept where
the sweep drew the same arc at twenty) — 0.0135 mm against Nylon's ~0.35 mm
resolvable detail. **The split reproduces exactly: 11 rounded / 9 at the
fillet.**

### G3. In the terms Eva has been ruling in (EXPORT, default petal)

| roundness | holes | rounded / at fillet | hole area | solid | median roundness | tris petal | infilled bloom | 40 × 3 |
|---|---|---|---|---|---|---|---|---|
| 0 (the floor) | 20/20 | — | **179.1 mm²** | **53.8%** | 0.818 | 14,978 | 118,480 | 1,226,912 (81.8%) |
| 0.10 | 20/20 | 0 / 20 | 179.0 | 53.9% | 0.818 | 12,370 | 97,616 | 1,046,112 (69.7%) |
| 0.30 | 20/20 | 0 / 20 | 178.4 | 54.0% | 0.818 | 13,198 | 104,240 | 1,071,552 (71.4%) |
| 0.50 | 20/20 | 1 / 19 | 175.1 | 54.8% | 0.818 | 13,738 | 108,560 | 1,109,312 (74.0%) |
| **0.60 (DEFAULT)** | **20/20** | **11 / 9** | **170.7 mm²** | **56.0%** | **0.847** | **13,806** | **109,104** | **1,126,592 (75.1%)** |
| 1 (the circle) | 20/20 | 18 / 2 | **99.3 mm²** | **74.4%** | 0.998 | 13,550 | 107,056 | 1,119,152 (74.6%) |

(The full eleven-step table is `roundness-sweep.json` beside the sheet.) Every
row keeps all twenty holes; no hole falls under the 1.50 mm bar anywhere in the
range. Two holes stay "at the fillet" even at 1.00 — their onset is 1.036, the
0.8 mm fillet already rounder than their own inradius allows.

**THE BUDGET FALLS, and the reason is worth knowing: the prune.** Once any
roundness is asked, every hole's ring is re-drawn from the opening, and the
vertices that lie within 3 µm of a straight chord are dropped — which is why
roundness 0.10, where no fillet corner moves, already costs 17% FEWER
triangles on the petal than the floor. At the default the cost corner
`INFILL: x 40 petals x 3 whorls` goes **1,226,912 (81.8%) → 1,126,592 (75.1%)**,
leaving **373,408 triangles (24.9%) of headroom** under the 1,500,000 budget.

### G4. What moved (the gates' own figures are in the PR)

* **Byte partition, predeclared from the BASE tree's own record** (a row moves
  iff the base tree builds infill cells on it AND this tree's control set asks
  roundness > 0): **31 movers / 926 holders** over the 957-row matrix — #297's
  29 plus the two new roundness-1 rows; `INFILL: x roundness 0` is a HOLDER (the
  floor by branch), as are the REFUSED and GATED rows.
* **Census (#213: re-recorded, never widened): 11 entries re-recorded, 2 added,
  0 removed**, every one on an INFILL row, the previous figure kept in each
  note. Eight read more pairs and one fewer; every worst span but two is
  unmoved to four decimals (`CONTINUOUS x 3 turns` shallower, 0.5092 →
  0.4428; `a SPHERE head with a stem` deeper, 0.427 → 0.4675). The two new
  entries are `density law 2` (two span-0 tangencies on the whole bloom, 0 on
  one petal) and the new `roundness 1 x cup 1.2 x curl 360` row (the petal's
  own declared fold at an identical worst span).
* **I12** (the roundness family, `verify-bloom-infill.mjs`), written red first
  — against the base tree it reads 2 of 120 RED (the registry row against a
  geometry with no export, and the ruled-default clause: that tree's holes are
  today's, 179.08 mm² / 0.8177 against the swept 170.75 / 0.8468) — and six
  mutants, each witnessed on the mutated module. **The mutant table found two
  clauses of its own that could not see what they claimed**: (e) first asked
  per-hole Hausdorff inside the discretisations' band and PASSED on the base
  tree (opening a hexagonal corner from 0.8 mm to 0.6 × the inradius moves the
  boundary ~0.04 mm, inside the band), so it now holds the default ten times
  closer to the swept shape than today's is, in area and in median roundness;
  and the containment band was the fillet's own sagitta, which the clip mutant
  sat inside — it is two plan-grid steps now, because the control clips.
* **I1's `ALL FORM MAX` xfail is RE-DECLARED 1.4799 → 1.4749 mm** (worse), not
  widened: the bar clamp reads the same builder estimator the xfail is about.
* **H1 and MB1 fold records re-recorded** (hole-rim: 179.56/129.14/178.67/151.87
  → 160.43/134.23/179.79/110.97°; margin: 89.18/113.14/31.26 → 89.96/111.91/36.20°,
  roll 330 unmoved) — every one a PLAIN-petal fold state, live = export.
* **Panel route (aa)** — every single letter is taken.
* **`frozen/phase44`** is the 953 rows at `38a4893`, registered in both maps and
  `--verify-frozen` deep-equal. No workflow file moves in this PR, so no
  `TAG_PUSH_XFAIL` entry is owed.
* The sheet: `node tools/shot-bloom-infill-roundness-shipped.mjs <dir>` →
  **`docs/img/infill-roundness-shipped.png`** (the sweep 0 → 1 on the shipped
  control, default marked) and **`docs/img/infill-roundness-default.png`**
  (the infilled petal and whole bloom at the ruled defaults, print preview).
  `docs/img/infill-roundness-sweep.png` stays put — it predates #297 and records
  the measurement pass.
