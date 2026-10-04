# Stem session 3 — ruling 7, the 45° florist's cut

Branch `claude/bold-wozniak-ri037d`, base `23b13bd` (main's head at the time; nothing after
it). The last of the stem work. Read `docs/bloom-stem-state-oct-2026.md` §Q3 for the costing
this was briefed from, and the charter's stem section for the rulings' settled text.

## 0. Outcome

**The stem's free end is a full 45° florist's cut, and it ships as a control defaulting ON.**
- `stemCut` (Stem, a CHOICE, `FLORIST` / `FLAT`, default `FLORIST`), hidden with the stem.
  `FLAT` is the end as it was, bit for bit.
- The angle is carried as a SLOPE and the slope is exactly 1 (§2a).
- The long point carries a flat LAND, derived from the print floor and the nozzle — the land
  is `max(MIN_FEATURE_MM, 2 × NOZZLE_MM)` = max(1.00, 0.80) = **1.00 mm** deep at the floor,
  drawn on the tube's own lattice at or beyond it (§2b).
- `stemLength` measures to the long point, which is the land itself (ruled).
- A cut HOLLOW stem ends SOLID: the plug is `D + 0.62 mm` from the long point, derived from the
  cut's own geometry and Eva's 1.5 mm wall (§2c). At 3 mm the stem is already solid and the
  cut costs no plug.
- The cut is pinned OFF on every pedicel through session 2's `PEDICEL_PINS` — one place.
- A stem shorter than its own cut is told, not cut (`cut.inertShort`); the shortest built stem
  (1 mm on 3 mm) is one.
- **The default bloom is untouched** (`stemLength` 0 builds no stem): 24,688 triangles.
  A cut stem costs **+94 triangles** over the flat end (the cut band's `2N − 2`), at every
  diameter, in both modes.

**The six checks the brief named all keep their catch** (§4) — each shown red on the OLD
geometry, rewritten to accept a 45° face, and shown red again on the NEW geometry for the same
condition. None was loosened. The byte tool's end-face clause, whose subject was "the triangles
all at one height", is re-derived onto the cut face's own projection and a point-to-face
distance (§4f).

**Scope, measured:** 161 of 1,102 live rows move in both modes (§6); 25 of 51
frozen tags' bytes stop reproducing over 2,006 of 33,512 rows (§7); block 48 adds 13 rows
(1,089 → 1,102); `frozen/phase52` is the 1,089 rows at `23b13bd`.

## 1. Reconciliation

- **`main` had no commits after `23b13bd` when the session opened.** Nothing in the brief was already shipped. (During the session `main` gained #358, #359 and #360, none of which touches a bloom file; `23b13bd` is still an ancestor of the branch and the PR merges clean.) No cut
  code existed: both stem ends were horizontal rim-fan faces (`endFace`), as the state doc said.
- **The brief's "~114 of 1,047 live rows" is a stale denominator, not a wrong count.** 1,047 is
  `frozen/phase50`'s row count; the live matrix at `23b13bd` is 1,089. By the "stem present"
  predicate 156 of 1,089 carry a stem: the 114 the brief names, plus the 33 raceme rows #353
  added (a raceme's rachis is a stem) and 9 of session 2's block 47. On `phase50` the same
  predicate reads exactly 114 of 1,047, which is the brief's figure reproduced. By the CUT's
  own guard (stem present AND the cut made) the live count is 161 of 1,102 — §6
  has the partition. This was reported before building rather than treated as a material
  difference: the extra rows are the ones the brief's denominator predates.
- **The frozen figure is likewise a count by "stem present" over the tags that existed then.**
  Measured by the cut's own mover predicate over all 51 registered matrices: §7.
- **The remote holds 43 frozen tags, not 48**: `phase49` is declared absent in
  `TAG_PUSH_XFAIL` and the four declared refusals are absent too. The sweep is over the 51
  REGISTERED matrices, which is what `FROZEN_MATRICES` names.
- **The state doc's "decision owed — long point or short point" is ruled** (long point) and
  its "(c) measuring the 1.5 horizontally or perpendicular" is answered by the plug derivation:
  the plug is sized so the wall is 1.5 mm SQUARE TO THE FACE over the whole bore, which is the
  stricter of the two and what "the end looks solid" needs (§2c).

## 2. The derivations — what was derived from what

### 2a. The angle is a slope, and the slope is 1

`Math.tan(Math.PI / 4)` is 0.9999999999999999. A "45°" carried as a tangent of π/4 would put
every short point an ulp off the long point's own arithmetic and make the land's lattice
decision (§2b) a comparison against a bar that is not 45 at the last bit — the discrete-
decision-on-a-continuous-quantity class, which this project has refused seven times.
The ruled angle is a RISE PER MILLIMETRE OF RUN; at 45° that number is exactly 1.
`STEM_CUT_SLOPE = 1` is what the arithmetic reads; `STEM_CUT_DEG = 45` is the ruling's own
word for the read-out and the harness's messages, never used in arithmetic.

### 2b. The land — derived from the print floor and the nozzle

A 45° wedge is `d` mm thick `d` mm from its edge, so the point's last millimetre is thinner
than anything this project calls printable. Truncating the wedge at a horizontal flat of
radial width `w` leaves the point's thinnest section exactly `w`, so **the land's depth is the
thinnest horizontal section the point may have**, and that is the larger of two floors a
printed feature has to clear:
- `MIN_FEATURE_MM` = 1.00 mm, the project's minimum feature (a declared guess, unchanged);
- two nozzle widths, `2 × NOZZLE_MM` = 0.80 mm — a wall needs an outer and an inner perimeter
  to be laid at all. `NOZZLE_MM` 0.4 is the nozzle the ruling names; like every print number
  here it is an assumption, since nothing has been printed.

`STEM_CUT_LAND_MIN_MM = Math.max(MIN_FEATURE_MM, 2 * NOZZLE_MM)` — **1.00 mm, the feature floor
binding, the nozzle 0.20 mm under it.** No constant was typed. Mode-free: whether the point
exists is topology, and the export floor may not decide it (session 32).

**The drawn land is the lattice's.** The land's inner edge is the chord between two columns of
the tube's own 48-column lattice — the smallest chord at least the floor deep — never a vertex
inserted between columns. The first construction inserted the exact chord as two extra columns;
at a 4 mm stem the chord's azimuth is `acos(1/2)` = 60°, a lattice column to the last bit, so
every band carried two zero-width slivers and the degeneracy census read 24 (and 14
non-manifold). On the lattice the land is 1.00 mm at the floor and up to one column deeper:

| D (mm) | land column j | land depth (mm) | cut span (mm) | plug (mm) |
|---|---|---|---|---|
| 3 (solid) | 10 | 1.1118 | 1.8882 | — |
| 3.5 | 9 | 1.0803 | 2.4197 | 4.1213 |
| 4 | 9 | 1.2346 | 2.7654 | 4.6213 |
| 6 | 7 | 1.1737 | 4.8263 | 6.6213 |
| 8 | 6 | 1.1716 | 6.8284 | 8.6213 |
| 10 | 5 | 1.0332 | 8.9668 | 10.6213 |
| 12 | 5 | 1.2399 | 10.7601 | 12.6213 |

`span = slope × rTip × (cos(j·step) + 1)` — the long point's land edge to the short point.
The land holds `2j + 1` lattice vertices (columns −j..j) at the stem's full length; the cut
ring hangs below the ring above it, one vertex per column at `h = slope × rTip × (cosJ −
cos θ)` — with the cosine MIRRORED (`cos(min(i, N − i) × step)`), because `cos((N − j)·step)`
is not `cos(j·step)` to the bit and the first version left the land's far edge 1.8e-15 above
the land.

### 2c. The plug — `D + 0.62 mm`, from the wall and the slope

A 45° plane through a hollow stem cuts the bore in an ellipse. To keep the end solid the
void's floor must sit at least Eva's 1.5 mm from the plane MEASURED SQUARE TO IT, over the
whole bore. The plane rises `slope × 2 × rTip` from the long point to the short point, and a
wall `W` square to a plane of slope `s` is `W × sqrt(1 + s²)` vertical, less the `W × s` the
plane itself climbs over that wall's run:

`plug = 2 × rTip × s + W × (sqrt(1 + s²) − s)` = `D + 1.5 × (√2 − 1)` = **D + 0.6213 mm** at
`s = 1`, measured from the long point (`cutPlugMm`). Where there is no bore (3 mm) the plug
is 0 — the cut costs nothing there (ruled). The bar in ST10 is 1e-9 on a closed form, not a
tolerance.

**Where the bore terminates and how the junction closes:** the void's floor is a horizontal
disc of radius `boreR` at `tipZ + plug`, closed with a rim fan facing UP into the void
(`voidCapInto`); the bore's wall runs vertically from there to the root band. The floor never
touches the cut face — measured as a point-to-triangle distance from every bore vertex in the
plug window to the emitted face triangles: **2.339 mm on the straight 6 mm stem, 2.26–3.77 on
the noded ones** (§4f), against the 1.5 mm asked. With the cut OFF the plug is the flat 1.5 mm
it was, by branch.

### 2d. The tube ladder and the cut band

The tube's stations are placed over `L − span` (the straight ladder, or `stemNodeStations`
on a noded stem) and the long point `L` is appended: `stations = [...tube, L]`. The horizontal
rings stop at the short point's depth; the cut ring is built FROM the ring above it (the short
point is that ring's own vertex by reference; every other column hangs below at its `h`), so
the band between them is `2N − 2` triangles with two degenerate ones skipped by IDENTITY of
reference, never by a tolerance. The face is a land fan (columns −j..j about the long point)
plus a plane fan, `N − 2` triangles. On a noded stem each cut-ring vertex sits on ITS OWN
DEPTH's ring (the law's centre and radius there), so the face follows the kinked axis and is
only a plane where the tube is a cylinder.

## 3. Watertightness across the range

Stem-only edge census (boundary / non-manifold / degenerate / directed mismatch) at 60 mm:
3 mm solid, 3.5 mm (thinnest hollow, a 0.5 mm bore), 4 mm (the lattice-column case), 6 mm,
12 mm (widest), 100 × 6 noded at prominence 1, FLAT, and the 1 mm stem on 3 mm — **0 / 0 / 0 /
0 on every one.** Through the real gates over block 48 (13 rows): export **PASS 13/13**
(`boundary=0 degenerate=0 nonManifold=0` on every row) and connectedness **PASS 13/13**
(`components=1 stray=0`, re-read at 0.3 mm). Re-run after the last geometry edit (the knife-edge-safe face fan and the 1 mm GATED row): export **PASS 13/13**, connectedness **PASS 13/13** again.

## 4. The six checks — old red, the rewrite, new red

Every red below was produced by planting the apex table's own mutation on a tree copy served
through the harness's `stemAssertions` / `stemChannelAssertions`, so the message is the
clause's own. OLD = base `23b13bd`; NEW = this tree.

### 4a. ST1 — the triangle count predicted from the plan

**Catches:** a stem declared and not built (or built short). OLD red (`stem-declared-and-not-
built`, 60 × 6):
```
ST1: the builder emitted 0 triangles for a stem with 61.0156 mm of bore left, open at the top
and closed at the tip of 2 band(s) on 48 sides; the plan's own station list and side count ask for 476
```
**Rewrite:** `stemCountClause` predicts `wallTris = 2N(bands − 1) + (2N − 2)` and the bottom
`(N − 2) + (hasVoid ? N − 2 : 0)` under a cut, the flat expression otherwise. NEW red:
```
ST1: the builder emitted 0 triangles for a stem with 55.8943 mm of bore left, open at the top
and closed at the tip ending on a florist's cut of 3 band(s) on 48 sides; the plan's own
station list and side count ask for 570
```

### 4b. ST2 — on the axis, to the length

**Catches:** rings off the axis; the wrong length. OLD red (`stem-off-the-axis`):
```
ST2: the emitted rings' centres stand 1 mm off the axis the plan declares for them
```
**Rewrite:** the tip is the cut's long point (the land's z), the ladder identity carries
`[0, L − span, L]` (ST12 restates it); the cut ring's centre is read about its own depth. NEW
red, same mutation:
```
ST2: the emitted rings' centres stand 1 mm off the axis the plan declares for them
```
and, new, `SC3: the emitted cut ring's column 24 stands 1 mm off its own depth's ring`.

### 4c. ST3 — the bore and the narrowest vertex

**Catches:** a bore that is not Eva's rule; a wall under 1.5. OLD red (`bore-is-not-evas-
rule`, 60 × 3):
```
ST3: the stem's emitted bore 0.75 is not max(0, 1.5 - 1.5) = 0
ST3: the emitted stem's narrowest vertex stands at 0.7499999999999999 mm; a solid stem of
outer radius 1.5 under Eva's 1.5 mm wall asks for 1.5
```
**Rewrite:** the narrowest-vertex arm learns that a cut stem's lowest rings are the void's
floor (no inner ring below the plug) — the second of the two cases where a stem emits no
inner ring. NEW red: identical, both lines.

### 4d. ST9 — the stem channel, located in the FILE

**Catches:** a petal inside the free stem's printable gap, in the exported STL. OLD red
(`the-channel-clearance-is-typed`, on the sphere):
```
ST9: 1089 exported vertex/vertices stand inside the 1 mm printable gap of the free stem and
are not the stem's own — nearest 0.5205 mm at [0.367,-3.501,-36.135]
```
**Rewrite:** ST9 located the cylinder from three rings "at exactly outerR on three z-levels";
the tip ring is no longer at one z. Its straight arm now takes the tip as the LOWEST vertex at
`outerR` (the long point's land) and the root as the populated level above it. NEW red:
identical to the digit — the channel's free length is the same, and a cut tip at the bottom of
the solid changes which vertex is lowest, not where the channel is.

### 4e. ST10 — the tip plug

**Catches:** a hollow stem ending as a cut pipe; a plug that is not the wall. OLD red
(`the-tip-plug-is-never-built`):
```
ST10: the tip plug is 0 mm; a plug as thick as the wall is as thick as 1.5 mm
ST10: the emitted bore reaches the stem's own tip (-61.9156 against -61.9156) — the bottom is
an annulus and the stem ends as a cut pipe
```
**Rewrite** (`stemPlugClauses`): the plug restated as `2 × tipR × 1 + W(√2 − 1)` under a cut
(bar 1e-9) and the exact `W` flat; a new end-face arm — the face's projected area against the
restated cut ring's shoelace area, `N − 2` face triangles, the face's lowest vertex at the
emitted tip and its highest at `tipZ + restated span`. NEW red (`the-bore-opens-through-the-
cut-face`, 60 × 12 — the plug put back to the flat 1.5 under the cut):
```
ST10: the tip plug is 1.5 mm; under a 45-degree cut on a 12 mm tip the void's floor must stand
Eva's 1.5 mm square to the cut plane over the whole bore, which is 12.6213 mm from the long point
ST10: the lowest ring of the emitted bore stands 1.5 mm above the emitted tip; Eva's 1.5 mm
wall square to a 45-degree cut face asks for 12.6213 — the bore opens through the cut face
```
And on the FLAT control the old mutation still reads the old red (the flat arm is the
expression it was).

### 4f. The tip-plug byte clause — "the triangles all at one height"

`tools/verify-bloom-sphere-stem-bytes.mjs --change plug` defines the bottom face as the
triangles all at one height and measures its area against a closed disc. **Catches:** the plug
removed (the face reads the annulus's area). OLD red (base with the plug removed, against a
copy with the plug removed AND one void station added, so the streams differ at all):
```
the bottom face measures 21.1452 mm^2 against a closed disc's 28.1937
```
**Rewrite** (`--change cut`, `cutFaceClause`): (i) the base's end is still the flat disc;
(ii) the branch's DOWN-FACING triangles in the cut's window, within the tube's own radius about
its own ring centre, project onto the plane to the closed end's area (a polygon of `rTip` on a
straight stem; the shoelace area of the law's own cut ring on a noded one); (iii) **the
bore does not open through the face** — the distance from every bore vertex in the plug window
to the emitted face triangles, by a point-to-triangle solve, at least Eva's 1.5 mm; (iv) no
vertex at the stem's radius hangs below the face (the cut removed material and added none).
NEW red (this tree with the plug back at the flat 1.5 mm, against the base, 60 × 12):
```
a bore vertex stands 0.0553 mm from the cut face where Eva's 1.5 mm wall square to the
45-degree face asks for 1.5 — the bore opens through the cut face
```
**(iii)'s first version read SHORT on noded stems and was replaced by measurement.** It
subtracted a per-azimuth plane height from the vertex's own z, exact on a cylinder, and read
1.65–1.83 mm on the three noded `BARE NODES` rows where a point-to-triangle solve reads
**3.05 / 2.71 / 2.26**, because a bore ring's centre and the face vertex's at the same azimuth
sit at different depths of a leaning axis. The straight 6 mm stem reads 2.34. The clause is
the solve now, and it reads 0.06 on the mutant.
**And the envelope clause mis-sized a noded stem** before the cut existed to show it: it took
the tube's radius as `outerR`, and the seven `BARE NODES` rows reported their own swelling
(r 3.14–3.62 against 3) as "outside the stem". Two more corrections came off the wider sweep
over every stem block, both the tool's: the envelope is now the larger of the TWO trees' plans,
per station, of the law's radius plus the axis offset THERE (the drifts of different nodes
point different ways, so |offset| is not monotone and the tip's is not the largest — `STEM
NODES: whorled x 8` reads a ring at 12.1596 against `nodeMaxOuterR + nodeTipOffsetMm`
12.1325; and the branch re-places the tube's ladder over `L − span`, so the base's rings sit
nearer the swelling's peak); and the face clause reads ONLY the stem's own triangle block
(`[hubTriEnd, hubTriEnd + stemBuilt.tris)` on each tree) — a leaf's petiole rooted near the
tip or a pedicel on a short rachis is a down-facing triangle inside the cut's window and the
tube's radius, and the first sweep summed them into the face (`LEAVES: the STEEP angle`
113.85 against 112.77 mm²; `INFLO: 12 nodes on a 20 mm rachis` 32.24 against 28.19). And a third, the same clause again: the extent is taken over every depth a ring is DRAWN at —
the stations, the void's own, and the cut ring's `L − h(θ)` per column, which are not
stations (`STEM NODES: the longest leaf on the shortest stem` read a cut-ring vertex 1e-4 mm
past the station-sampled extent). On a straight stem with nothing near its tip every one of
these is the expression it was.

### 4g. SC0–SC3 — the new family

- **SC0** the two statements (`stemCutLive` / `stemCutAbsent`) exact complements;
- **SC1** `made` ⟺ not `inertShort` and the stem long enough; no face on an uncut stem;
- **SC2** the land and the span against the restatement from the controls (the floor from
  `MIN_FEATURE_MM` and `NOZZLE_MM`, the lattice column, the span);
- **SC3** the emitted cut ring, vertex by vertex, against `restatedCutRing` (within 1e-9) and
  the land's vertex count `2j + 1`.

`the-cut-is-flattened` (slope 0) fires SC2, SC3 and ST10 (plus ST2, ST12 and the directed
census as collateral — a zero-height band); `the-land-is-removed` (floor 0) fires SC2 and SC3
(the land holds 1 vertex against 11 on the 12 mm stem; ST10 and ST12 as collateral);
`the-bore-opens-through-the-cut-face` fires ST10 alone. §9 has the witnesses.

## 5. The must-fail per clause

`node tools/verify-bloom-stem-cut.mjs`: five records (60 × 12 wide, 3 mm solid, 6 mm FLAT,
1 mm on 3 mm short, 100 mm noded at prominence 1), 24 plants, each required to fire its OWN
clause by its own message and no other, every baseline silent, printed through the real
failure path:
```
STEM CUT MUST-FAIL: OK — every arm of SC0-SC3, ST10's two cut arms, ST1's cut band, ST12's
cut ladder and ID4's cut pin fires on its own plant, by its own message and no other, and
every baseline is silent
```
Five plants first fired two clauses and were re-chosen rather than the clauses widened: SC0
through its two sides, SC1 without an emitted ring, SC2 with a deeper land, ST12 with a
station moved 1 mm keeping the count. The "GATED 2 mm on 3 mm" row was found to be CUT (the
span at 3 mm is 1.888 < 2) and is 1 mm on 3 mm now, in the matrix and in the tool.

## 6. The byte partition

`node tools/verify-bloom-surface-bytes.mjs --base <worktree of 23b13bd> --movers-predicate
stem-cut`, the whole 1,102-row matrix in both modes, positionally under `Object.is`, run in
40-row chunks and merged. The mover predicate is the GUARD — `stemPlan(...).present &&
plan.cut.made`, read on the row's own plan — never a label.

**PASS — 161 of 161 predeclared movers MOVED and 0 floats moved on the 941 holders**,
positionally under `Object.is`, over **1,131,655,608 export floats / 125,739,512 triangles and
81,974,322 captured-grid values over 9,445 panels** (merged from 28 chunks of 40 rows, two of
which were re-run after the box's background limit killed the loop mid-chunk; every chunk's
census is in the merge). The 161 are `phase52`'s 151 plus the 10 cut rows of block 48; the
FLAT holder, the 1 mm GATED row and the FLAT x RACEME row are holders by construction and
measured as such, as are the shipping default (no stem) and every pedicel. `--control` fires BOTH
clauses on a 1e-9 perturbation of the FLAT holder (`1 of 241164 floats moved` on the export stream and
`1 of 4430 values moved` on the captured grid) — run over a range whose FIRST row is a holder, because the
control perturbs the run's first row and a perturbed MOVER is a difference the partition expects (the
first attempt, over the whole of block 48, landed on the thinnest hollow stem and reported `CONTROL DID
NOT FIRE`, which is the tool's own vacuity guard doing its job).

## 7. The frozen sweep

`node tools/verify-bloom-seam-bytes.mjs --change cut --frozen-sweep` over all 51 registered
matrices, by the same predicate:

**25 of 51 baselines carry at least one row whose bytes stop reproducing; 2,006 of 33,512
frozen rows in total** (1,301 distinct states built). `phase2`–`phase27` read 0 (no stem yet —
`phase27`, the 680 rows at the sphere-stem session's base, predates the stem), then 16 / 16 /
23 / 23 / 35 / 39 / 54 / 68 / 68 / 90 / 92 / 93 × 7 / 105 / 106 / 108 / 108 / **110 of 1,047 on
`phase50`** (the brief's "114" counted by "stem present"; the four it loses are stems too short
to carry their own cut and the GATED rows) / 143 of 1,080 on `phase51` / **151 of 1,089 on
`phase52`**. The brief's "1,666 rows across 22 of 48" was a count by "stem present" over the
tags that existed then; by the cut's own predicate over all 51 registered matrices it is 2,006
over 25. Every one of those tags' definitions is untouched — `--verify-frozen` deep-compares
row order, labels and set lists and has never compared a byte.

No phase is owed for the byte movement alone (session 24's rule); **`frozen/phase52` is owed
for the 13 added rows** and is the 1,089 rows at `23b13bd`, registered in `FROZEN_MATRICES` and
`FROZEN_BASE_COMMITS`, `--verify-frozen phase52` PASS (deep-equal).

## 8. Material and print time, reported not acted on

Per 60 mm stem, the cut end against today's flat end with its 1.5 mm plug (the wedge the cut
removes, numerically over the section; the bore filled to the plug less the wedge's share of
it):

| D | wedge removed (mm³) | bore filled (mm³) | net (mm³) | net vs the stem's own volume |
|---|---|---|---|---|
| 6 | 53.5 | 23.3 | **−30.2** | −2.4 % of 1,272 |
| 12 | 541.5 | 404.7 | **−136.8** | −4.6 % of 2,969 |

A cut stem uses LESS material than today's at every diameter — the plug fills `D − 0.88` mm of
bore but the wedge takes more off the outside; at 3 mm it is −3.8 mm³ with no plug. In PA12
(1.01 g/cm³) that is −0.03 g and −0.14 g. Print time follows the volume for the bulk; the
perimeter count is unchanged (the same 48-column wall) and the cut face adds one sloped
surface the slicer stairs at the layer height. Nothing has been printed; these are geometry.

## 9. The standing mutants and their witnesses

`tools/verify-bloom-apex-mutants.mjs` gains `the-cut-is-flattened`, `the-land-is-removed`,
`the-bore-opens-through-the-cut-face`, each witnessed on the MUTATED module's own end-face
facts (`endFaceFacts`: the land's vertex count, the face's height, the void floor against the
plane) and never on the assertion it names; the probe table gains the FLAT row so the
stem's four older mutants are exercised with the cut off as well as on.
Four older mutants were re-anchored (`stem-off-the-axis`, `the-noded-rings-stay-on-the-world-
axis`, `the-tip-plug-is-never-built`, `the-tip-plug-is-typed`) because the ring producer and
the plug expression moved; 91 anchors match exactly once.

Run through the table (`--only`, a SUBSET — never a sweep):
- `the-cut-is-flattened` names SC2, SC3, ST10 · fired SC1, SC2, SC3, ST10, ST12, ST2 — ok
  (the band collapses to zero height, so ST2's increasing-stations and ST12's ladder fire as
  collateral);
- `the-land-is-removed` names SC2, SC3 · fired SC2, SC3, ST10, ST12 — ok;
- `the-bore-opens-through-the-cut-face` names ST10 · fired ST10 — ok;
- the ten older stem mutants (`stem-declared-and-not-built`, `stem-off-the-axis`,
  `stem-runs-the-wrong-length`, `bore-is-not-evas-rule`, `hairline-root`,
  `the-tip-plug-is-never-built`, `the-tip-plug-is-typed`, `the-two-closures-are-allowed-to-
  cross`, `the-noded-rings-stay-on-the-world-axis`, `the-pedicel-pin-is-dropped`, which names ID4 and fires ID4 alone) each fire the family they
  name on the cut tree, and the clean tree is silent on every probe row including the FLAT one.

**The table itself had a defect the cut family exposed.** Its stem-family capture read
`/^(ST\d+):/` on `stemAssertions`' messages, and `stemCutClauses` pushes `SC0`–`SC3` through
the same call — so the first run reported both cut mutants `SILENT: SC2, SC3` while the same
plants fired both clauses through the harness directly (§4g's reds). That is the ST10-as-ST1
misattribution class a third time, for a family the capture could not see at all; it reads
`/^(S[TC]\d+):/` now. **A green table is exactly what a blind capture looks like**, and only
running the mutants and disbelieving a SILENT beside a red taken by hand found it.

## 10. Also run

- **Smoke census** (`bloom-smoke --check`): 154 rows over 44 blocks, 139 families both ways —
  block 48 is 5 smoke rows claiming SC0–SC3, ST1/ST10/ST9/ST12/ID4.
- **Panel gate** PASS (`stemCut` is a choice under Stem, hidden with the stem).
- **Separation** (`bloom-petal-separation.mjs`): 144 builds, 0 not one piece at 0.6 mm, 0 after
  the 0.3 mm re-read.
- **Stem-channel witness** (`verify-bloom-stem-channel.mjs` + `--control`) PASS.
- **Build order**, three processes: `verify-bloom-build-order.mjs --pass forward / reverse / shuffle --seed 7`, each its own
  process (the shuffle pass resumed from its checkpoint after the box's background limit, so it
  spans 2 process starts), then `--compare`: **PASS — 2,204 (row, mode) digests identical across
  every pass, positionally, bit for bit** (4,408 pairwise comparisons, 163,832,244 triangles /
  1,474,490,196 floats a pass, 0 builds threw).
- **Census magnitudes** (`bloom-xfail-magnitudes --only <the 167 cut rows> --include-refused`): 4 declared rows among them (`STEM: x a hemisphere` 248 / 0.4262, `SPHERE STEM: x 40 petals x 6 turns` 372 / 0.2714, `INFILL: x a SPHERE head with a stem` 544 / 0.4675, `ALL MAX` 116,847 / 15.8503 measured in Node as an export-refused row), **all 4 at their recorded magnitude** — pairs exactly, span within ±0.00005 mm. The cut moves the stem's end and the free stem's rings; no declared fold lives there, and no census re-record is owed. **That sentence was half right, and the other half cost a CI cycle — §12.** The census tool measures `SELF_INTERSECTION_XFAIL` and only PRINTS a refused row's magnitude; it never compares `EXPORT_REFUSED_XFAIL`'s triangle count, and both refused rows carry a 120 mm stem the cut now ends.
- **X2 across block 48:** silent on every row (0 within-shell pairs on all 13; none declared).
- **The byte tool's cut arm over every stem-bearing block** (`verify-bloom-sphere-stem-bytes
  --change cut --base <worktree> --only <STEM, STEM CUT, SPHERE STEM, BARE NODES, STEM NODES,
  NODE LAWS, LEAVES, INFLO, stemLength max, ALL MAX>`): **137 rows, 125 predeclared movers and
  12 holders, 7,436,592 export floats under `Object.is` — clause 1 0 / 0, clause 2 0** (the run
  is inside the stem's envelope, the base's end is the flat disc, the cut face covers the
  section, the bore stays 1.5 mm off the face, nothing hangs below it). `--control` fires
  clause 1 on 6 of 6 holders; `--control-only` fires clause 2 on 4 of 4 mover x mode builds.
  Named rows only — never a pass of the matrix; the matrix-wide claim is §6's.

## 11. What is not done, named

- `node tools/verify-bloom-stem-cut.mjs` is NOT yet in `bloom-export-watertight.yml`'s
  preflight: dispatching `phase52`'s tag must precede any workflow edit (the rule of thumb in
  CLAUDE.md), so the preflight step is a follow-up PR after the dispatch.
- The noded cut face is a ruled surface following the kinked axis, not a plane; its wall to
  the bore is MEASURED (≥ 2.26 mm) and not derived in closed form.
- `endFaceFacts`' probe states are 60 × 12 and 60 × 6; a mutation inert at those but live
  elsewhere would read "did not move" — the probe-state-is-part-of-the-claim rule.

## 12. CI caught the refusal list stale — both refused rows moved by exactly the cut's +94

`bloom-export-watertight` on `9e6cce3`, shard 7 of 8, dropped ONE row of 137 by a validity
assertion and the other 136 exported watertight with identical live/export counts:

```
  - NODE LAWS: ALL MAX at 35 deg x a leaf under every pedicel (101.1% of budget — REFUSED): XR1: the read-out refused at 1517290 tris where the declaration records 1517196 (+94) — the refused build is not the size it was declared at. Re-measure it (node tools/bloom-xfail-magnitudes.mjs --include-refused) and re-record it in the commit that moved it, naming the move in its outcome doc.; XR1: the BUILDER's own tally is 1517290 where the declaration records 1517196 — a count that differs from the refused export's is a mode-dependent topology, which no row here may have
  - row census: 137 rows attempted but 136 reached the results — dropped: NODE LAWS: ALL MAX at 35 deg x a leaf under every pedicel (101.1% of budget — REFUSED)
```

The second line is #220's row census reporting the drop, not a second defect. The first is
XR1 doing exactly what #213 built it for: a declared magnitude that stops reproducing reddens
in BOTH directions, and here the row got 94 triangles BIGGER.

**Measured, both trees, both modes** (a throwaway script building each row through
`buildBloomInto` and counting `positions.length / 9`; the base is a worktree of `23b13bd`):

| row | base, export | base, live | this tree, export | this tree, live |
|---|---|---|---|---|
| `ALL MAX` | 3,090,816 | 3,090,816 | **3,090,910** | **3,090,910** |
| `NODE LAWS: ALL MAX at 35 deg x a leaf under every pedicel` | 1,517,196 | 1,517,196 | **1,517,290** | **1,517,290** |

+94 on each, which is the cut's own cost on a single stem (§8: the cut band's `2N − 2`
plus the land and plane fans' `N − 2` each, less the flat annulus — +94 at every diameter).
Both rows carry a 120 mm stem — `ALL MAX` through the blanket sweep's `stemLength` maximum,
the NODE LAWS corner through its raceme's rachis — and `stemCut` ships FLORIST, so the cut
reaches them. The 36 pedicels on the NODE LAWS row move nothing: they are pinned FLAT through
`PEDICEL_PINS`. Live and export agree on both, so XR1's second clause (the
mode-dependent-topology one) is satisfied by the geometry and was only firing because the
declaration was the base tree's number.

**Why no local run said so.** §10 reports the four declared census rows among the 167 cut rows
"at their recorded magnitude", `ALL MAX` among them — and that is TRUE of the self-intersection
list. `bloom-xfail-magnitudes --include-refused` builds the refused row, censuses it and prints
its pair count; it never reads `EXPORT_REFUSED_XFAIL.tris`, so a refused row whose triangle
count moved is invisible to it, and the NODE LAWS row is not in the census list at all and is
simply not built. The byte partition (§6) counted both rows as movers, correctly, and the
export gate's `--only` runs were over block 48. **The only instrument that compares the refused
count is XR1 in the two STL gates, and `ALL MAX` cannot complete a local settle on this box**
(§10), so the first time either declaration was read against this tree was in CI. The lesson
is the class CLAUDE.md already names for census magnitudes, arriving on the OTHER list: a
change that touches every stem owes a re-measurement of every declared row that has one,
and "the census reproduces" is a claim about one list.

**Re-recorded in the same commit**, both entries carrying the previous figure in their note,
exactly as the gate's own message asks; nothing widened, nothing skipped. `ALL MAX`'s shard
had not reported when this was found and will have failed identically on `9e6cce3` — this
re-record is the fix for both. `bloom-xfail-magnitudes` gaining a refused-count comparison
would make this catchable locally and is one clause; it is recorded here rather than added
to a PR already carrying one gate cycle.

