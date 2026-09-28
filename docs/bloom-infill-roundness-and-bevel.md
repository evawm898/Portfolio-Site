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
§0, *"carried from earlier passes"*). **CURRENT (Eva):** roundness gets a
control, and **the state shipping today is its FLOOR** — the least round the
cells are ever allowed to be. The range extends upward toward circular. The
port plan's line now points here. The comment above `infillFillet` in
`bloom-geometry.js` still cites the old phrase; it is left alone because this
session moves no generator byte, and is owed an edit by whichever session
builds the control.

## A. Why the rim reads as a bevel — it is geometry, and on an infilled petal it is not a bevel at all

### A1. The outer margin of an INFILLED petal is a flat 90-degree wall

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
* **The bar never eats a hole** anywhere in the range (above). What the top end
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
   fillet question (B1) settled in the same ruling.
3. **K stays 4** unless the budget is ruled on: K=6 refuses two shipped rows.
