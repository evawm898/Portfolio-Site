# The Voronoi infill, S3 — the builder, the guard and the material mask

S1 made the emitter conform to the surface. S2 made every length in the plan a
surface length. S3 is the one that ships: the pattern comes out of
`buildPetalInto`'s own panel loop, behind a CHOICE, with one slider, and the
shipping default does not move a byte.

Read `docs/bloom-infill-port-plan.md` §0 for Eva's seven rulings and
`docs/bloom-infill-metric-plan.md` for the metric this builds on.

![The shipping infill](img/infill-shipped.png)

`node tools/shot-bloom-infill-shipped.mjs <dir> --png docs/img/infill-shipped.png`
renders it from `buildBloomInto` in EXPORT mode, with every figure in every
caption read off the builder's own record. It is NOT `shot-bloom-infill.mjs`,
which photographs the prototype's meshes because S2 had no builder to
photograph; neither picture in that sheet's §1 is this one. The shipping petal
asks 16 and builds **17 cells, 14 holding a hole, 3 left solid**, holes
1.85–3.12 mm across with a median of 2.63.

---

## 1. What ships

| | |
|---|---|
| `petalInfill` | a CHOICE — `NONE` / `VORONOI`, default **NONE**. The guard. |
| `infillDensity` | 8–40, step 1, default **16**. Hidden AND inert at the guard. |
| section | `Infill`, a drop-down inside **Petal**, declared after `roles` and all nine of its children |
| wall | `INFILL_WALL_MM = MIN_FEATURE_MM` (1.00 mm), not a control |
| hole bar | `INFILL_HOLE_MM = 1.50` mm, not a control |
| drop passes | `INFILL_DROP_PASSES = 2`, the cap ruling 3 asks to be named |

`buildPetalInto`'s panel loop is a **two-arm choice**: with the guard off, or on
a blade the plan refuses, every panel goes through `emitPanel` exactly as
before; with the guard on and one panel, the first panel goes through
`emitInfillPanel`, which calls `emitPanel` **verbatim** on the basal sub-panel
and draws the cells above it. `trimPanels` is untouched.

**The guard is the `inflorescence` NONE shape and not the `lobeDepth` 0 shape,
which is Eva's ruling and has a structural consequence**: `SWEEPABLE` filters
`SLIDERS()`, so a CHOICE is out of the blanket sweep by construction and
`ALL MAX` never turns the infill on. Measured: `ALL MAX` reads **24,688
triangles with the guard off** on this tree, unchanged, and its declared export
refusal is untouched. The four sub-slider ids are kept out of block 1 and out of
`SWEEPABLE` through `INFILL_SUBS` / `INFILL_SUB_IDS`, the `CURL_SUBS` shape.

**Ruling 4 — the sepals are pinned off**: `sepalBladeState` sets
`petalInfill: 'NONE'`, so nothing inherits through it. Ruling 3 — density is a
REQUEST — is on screen in **both places this project tells a clamp**: the
read-out's `INFILL` line and the density control's own value read-out, each read
from the builder's record. At the ruled default the blade asks 16 and builds 14
holes in 17 cells; at 40 it builds 16.

---

## 2. Zero bytes at the guard, measured

`node tools/verify-bloom-infill-bytes.mjs --base <worktree>` — **PASS: 15
HOLDERS × 2 modes over 21,322,224 export floats and 3,299,136 captured-grid
values positionally under `Object.is`, 0 moved**, with the material mask
asserted in a clause of its own (a holder's every station is material) because
the mask is a NEW channel the base tree does not have and a two-clause
comparison would have reported it as movement. Three predeclared MOVERS must
move. Both controls fire: `--control` perturbs a holder and reports on all three
clauses, `--control-only` fills a mover's mask in and reports on the mask clause
alone.

---

## 3. THE MATERIAL MASK, and the tempting fix that was not taken

Every captured grid row carries `material[]` beside `mid` and `normal` — one
boolean per column, true where the emitter drew skin. `measureWall` REFUSES a
row with no mask, skips a non-material query point, and builds a bottom-skin
quad only where all four corners are material.

The brief names the fix not to take: sweep the full `NV` columns and capture the
rectangle as today. It is tempting because it needs no new channel, and it would
make `measureWall` report a **1.20 mm wall AT A HOLE**.

**AND THE DIRECTION OF THE DAMAGE IS THE OPPOSITE OF WHAT THE BRIEF SAID, WHICH
IS MEASURED RATHER THAN ARGUED.** The brief's reason — carried verbatim into
this section's own first draft, into `emitInfillPanel`'s header and into
`measureWall`'s refusal message — was that a full rectangle makes **V5 green**
on an infilled row. *It does not, and it cannot.* Both of `measureWall`'s
numbers are MINIMA over material query points against material target quads, so
a full rectangle only ADDS points and targets, and a minimum can only fall; a
phantom station inside a hole reads the sheet thickness, which is the largest
reading available and can never become the `wall` minimum. Measured over ten
states — the shipping default, densities 8 / 16 / 40, `cup 1.2 × curl 360`, ALL
FORM MAX, `roll 330` and `buckle 0.6 f3`, with and without the guard:

| | honest mask | full rectangle |
|---|---|---|
| `wall`, all ten states | — | **identical** |
| `self`, nine of ten | — | **identical** |
| `self` on `petalRoll` 330 | **0.6925 mm** | **0.6586 mm** — *tighter* |

So the mask is right for a **different reason**, and the hazard it removes is a
false POSITIVE rather than a false pass. What a full rectangle costs is (i)
V5's SUBJECT, which would assert *"the sheet is at least a millimetre here"*
over stations with no sheet at all — 188 of 372 cell-region stations on the
shipping default — and (ii) the `self` figure, which would be an approach to
skin that is not there, wrong by **0.0339 mm on a row the matrix ships**, in the
strict direction, so a future infilled row could be reddened by a fold that does
not exist. A recorded magnitude that is a phantom is folklore.

**THE FIGURES ARE REPRODUCIBLE, NOT REMEMBERED**: `node
tools/bloom-wall-thickness.mjs --mask-control` builds each state ONCE and
measures it under both masks, prints the table above verbatim, REFUSES a
vacuous run (no state carrying a hole means the two masks are one mask — 7 of
10 do), and **exits 1 if `self` ever moves UP**, which is the direction the
derivation says is unreachable. A committed instrument, because this project
has already had a figure from an uncommitted script fail to reproduce.

**THE DIRECTION THAT *DOES* MAKE V5 GREEN IS THE OTHER ONE**, and the geometry
already has a comment about it: a mask calling MATERIAL a hole makes
`measureWall` SKIP a wall that is really there, and that is reachable — through
an untiled cell, which is why `plan.cellOpen[ci] = false` is set in the
merge-walk's fallback (§8). The brief's instinct named a real hazard and
attached it to the wrong half; both halves are now stated where they live.

Four readers were taught it, and the second exists because of the third:

* `tools/bloom-wall-thickness.mjs` — the wall instrument, and through it the
  whole combination gate.
* `tools/verify-bloom-grid.mjs` — `walkGrid` skips masked-out columns and
  **clause 2f** is new: the mask is present on every captured row, excludes
  nothing on a row with no infill and something on a row with one. Two new
  rows carry it. **Clause 10** is new beside it and asks the same question of
  the ARTEFACT — see below.
* `bloom-grid-gltf.js` keeps recording **BODY** thickness, unchanged — the grid
  describes the mid-surface, and a hole is not a change to it — and now
  **carries the mask**, one string per row and one character per column,
  indexed exactly as the `u` / `halfWidthMm` / `thicknessMm` arrays beside it.
  Absence is REFUSED rather than read as all-material, which is `measureWall`'s
  own rule: measured, `emitPanel` writes a mask on **384 panels and 12,992 rows
  over both modes** across the default, three densities, cleft, fringe, both
  refusals, sepals, continuous and cup x curl — 0 missing, 0 ragged.
* `/plot` — **NOT DONE HERE, and this is the one build item that leaves the
  session incomplete.** See §3b.

PASS, **915 checks over 21 rows** (851 before clause 10), 9 must-fails.

### 3b. Why the mask rides as telemetry and the line-splitting is /plot's

The brief asked that "/plot's exporter takes the same mask and stops drawing
lines across holes". The mask is now in the file and the splitting is not done,
deliberately, and both halves of that are worth stating.

**THE MEASUREMENT FIRST, because it says the requirement is real.** On the
shipping default with the guard on, **1,504 of 4,560 grid stations are holes**;
**64 of 80 u-lines and 320 of 456 v-lines** run through one. With the guard off
it is **0 and 0**. Live and export agree exactly. So `/plot` today would draw
sixty-four lines the length of a petal that is not there.

**THE OBVIOUS FIX IS WRONG FROM HERE, AND SILENTLY.** Cutting each `LINE_STRIP`
into its runs of material would make a hole a gap in the file and need no new
field. But `/plot` stations a u-line **positionally** — point *i* of a strip is
row *i* of that panel's declared `u` ladder, matched by label (`plot-petal.js`'s
own rule, and `verify-bloom-grid`'s clause 3 exists to pin it). A split run
carries no way to say where it started, so every point past the first hole would
come back mis-stationed, and `/plot` would not refuse it — its refusal path
fires on a strip the file never PLACED, not on one placed wrongly. A bend
dragged on such a petal would land in the wrong place, which is exactly the
class of defect a line drawing is the worst place to notice.

**SO THE PRIMITIVES ARE UNTOUCHED AND THE MASK RIDES BESIDE THEM.** Nothing
`/plot` reads today moves: no primitive changes, no existing `extras` field
changes, and the two families still count `cols` and `rows` per panel, which
clause 5 pins. `/plot` is therefore provably unchanged by this PR, and the data
it needs to stop drawing across holes is in the file.

**AND THE SPLIT ITSELF IS A ONE-CONDITION EXTENSION IN /plot's OWN EXPORTER**,
where there is already a split rule to extend — `plot-export.js`'s stated law is
"A STRIP IS SPLIT ONLY WHERE THE PROJECTION HAS NOTHING TO SAY", splits are
counted and reported, and "a run of ONE point is not a path" is already its
convention. Adding "…or where the panel's mask says hole" is that rule gaining a
second clause.

**WHY IT IS NOT IN THIS PR.** `/plot` is covered by `tools/verify-plot.mjs`,
which is **not in CI** (every workflow here is path-filtered to `flower*` /
`bloom*`) and whose negative control is **51 mutants at roughly six minutes
each** — over four hours, hand-run, and this repo's own rule is to run the
mutants covering the code a session changed. That is a session, not a clause,
and the brief's own gate list names five gates, none of them `/plot`'s. Doing it
blind — changing `/plot` and quoting a base pass without the sweep — is the one
move that would be worse than leaving it.

**WHAT THE NEXT SESSION INHERITS:** the file carries `extras.panels[].material`;
the split condition is one more arm of `plot-export.js`'s existing rule; the
witness is `tools/verify-plot.mjs` plus a mutant that restores the unsplit
strip; and the number to reproduce is 64 of 80 u-lines on the infilled default.
**One thing it must do first:** `assets/plot-test/bloom-grid-live.glb`, the
sample `/plot` and its gate load, was exported before the mask existed and
carries none — so it needs re-exporting, or every `/plot` check would exercise
the absent-mask path rather than the split.

### 3c. The .glb moved on purpose, and the partition says exactly how

`tools/verify-bloom-grid-bytes.mjs` exists to say "the /plot grid export does
not move", byte for byte against another tree. This change moves it, so the
tool learned the partition that change is entitled to and **nothing wider** —
`--change mask`, on the `verify-bloom-seam-bytes.mjs` shape, with the default
(no `--change`) still making the strict claim for every other change.

Measured, `--base <worktree of 55ca84c> --change mask`, **244 builds over 122
rows in both modes: PASS.**

* **Clause 1 — the geometry did not move.** The BIN chunk is byte-identical on
  **every one of the 244**. That is the half that matters to `/plot`: it draws
  the mid-surface, and a telemetry key cannot reach a position.
* **Clause 2 — the JSON moved only by the declared key.** Byte-identical once
  the **6,938** `material` keys are stripped, both sides renormalised through
  one parse/stringify — and the bound that introduces is turned into a measured
  fact rather than left as prose: the run FAILS if the base tree's own JSON does
  not round-trip to itself byte for byte, so on that side the normalisation is
  provably the identity.
* **Clause 2a — and the state echo grew by exactly the registry delta.** The
  file echoes the whole control set at `asset.extras.state`, so ADDING a
  registry key moves those bytes on every row for a reason that is not about the
  grid. It is compared as an OBJECT — every shared key must carry an equal
  value — and **the permitted additions are read out of the two trees'
  `DEFAULTS`** rather than typed, so a control whose default moved, or a key
  nobody declared, is a finding. Measured delta: **added `petalInfill`,
  `infillDensity`; removed none.** This component is the PR's own control, not
  the mask's, and it would have fired on any session that adds a slider.

**BOTH CLAUSES ARE SHOWN ABLE TO FAIL, and the second control exists because
the first cannot reach clause 2** — this repo's own `--control-mode` lesson, one
tool later. `--control` perturbs a captured mid-surface value by 1e-3 mm, which
lands in BIN and fires **clause 1 on 244 of 244**; `--control-only` perturbs
`halfWidth`, which is carried in the JSON as `halfWidthMm` and nowhere else, so
it fires **clause 2 on 244 of 244 while clause 1 sees 0** — which is the whole
point, and is what says the two controls are two claims rather than one claim
run twice. A `--change` run with nothing to strip REFUSES as vacuous,
because there clause 2 is the unchanged whole-file comparison wearing a new name.

**AND THE GATE'S HEADER NOW ENUMERATES CLAUSES 9 AND 10.** Clause 9 shipped with
the retention change and was never added to the list of what the gate checks —
the panel gate's route (t) hazard, in another file: a clause nobody has written
down can go silent without the gate noticing. Both are listed now.

---

## 4. The seam — 346 pairs, and three cuts to get to 0

The basal panel and the cell region meet at the split row. The first cut had the
region start one row BELOW the split while the basal panel ran to it, so the two
overlapped by a whole lattice strip; and because the outline's seam vertices are
the lattice's own doubles, the two shells WELD and the census reads a by-design
overlap as a within-shell fold. **346 pairs on the shipping default, every one
at rows `mSplit-1` and `mSplit`.**

1. **The seam columns.** The outline walks back across the split row through the
   lattice's own columns — the clause the terminal face already had, at the
   other end. Without them the basal panel's top edge is ten points and the
   cells' bottom edge is one segment containing eight of them: 252 span-0.0000
   T-junctions.
2. **The snap.** A Voronoi bisector crossing the seam puts a cell vertex
   wherever it likes. The lattice owns that boundary and the cells read it:
   a cell vertex on the seam snaps to the nearest lattice column. 108 → 0.
3. **The region starts AT the split row.** Shortening the basal panel instead
   was tried and made `emitPanel` draw a panel one row shorter, which produced a
   collinear-on-float32 triangle per petal at its own top edge — degenerate
   geometry in code this feature does not own.

`wants()` never subdivides a segment both of whose ends are on the seam: it is a
lattice edge, drawn unsubdivided on the other side.

---

## 5. THE SPLIT IS DECIDED IN THE PLAN, because the surface is the mode's

S1's conformance rule asked `chordDev(A,B) > tolMm` — how far the facet edge
stands from the surface. `surface.at` places a point through the MODE's own
half-width (floored at `TIP_HALF_MM`, 0.15 mm live and 0.80 export) and `skinAt`
offsets it by the mode's own floored sheet, so the **triangle count moved
between the modes on 13 of 13 states measured** — the shipping default by 40,
`petalWidth` 30 by 232, `petalCup` 1.2 by −764. The export gate fails that
outright: *the export floor is meant to change geometry and never topology.*
Sixth refusal of a mode-dependent topology in `bloom-geometry.js`.

What replaces it is the **lattice's own longest plan edge** over the same region
(`latMaxEdge`, from `rows[i].u` and `laminaHalfAt`, both mode-free): every
emitted edge is at most as long, in the plan, as the coarsest edge the shipped
mesh already draws there. **0 of 13 states move now.** `tolMm` is no longer the
decision; it is the claim, and the gate is where it belongs.

It costs triangles: the shipping default petal goes 4,612 → 6,596 (+43%).

---

## 6. THE PLAN LIVES ON A POWER-OF-TWO GRID, and X0 is why

The fillet is an arc — `Math.sin`, `Math.cos`, `Math.atan2`, none of them
required to be correctly rounded and none implemented identically in Node's V8
and the gate's Chromium. Nothing downstream is a tolerance: the hole's width
against the ruled 1.50 mm bar, the edge length against the lattice's longest, a
bisector against a wall. A last-bit difference on either side of one of those is
a different cell.

**X0 measured it**: the exported STL against a rebuild of the page's own state
in Node read **39,328 triangles against 36,064** on `INFILL: x density 8`, and
**681,952 against 716,352** at forty petals over three whorls; `footDelicacy`
0.25 held its count with a vertex **0.93 mm** away.

Replacing `Math.hypot` with `Math.sqrt(dx*dx+dy*dy)` (`infillLen`) and skipping
`Math.pow` at `INFILL_TIP_GAMMA === 1` is right and is kept — and it **moved
none of those numbers**, which is what pointed at the trigonometry.
`INFILL_PLAN_GRID = 2^-20` mm quantises the cell polygons, the capacity insets
and the filleted holes: three orders under what the census resolves, eight
orders over what the engines differ by. **Node and Chromium agree to the digit
on every declared pair count, and every triangle count above is fixed and stayed
fixed.**

**THE SENTENCE THAT STOOD HERE SAID "X0 IS SILENT ON ALL SIX ROWS" AND IT WAS
TRUE OF SIX ROWS.** The full matrix has twenty-two, and on three of them X0 was
not silent. See §6b — the grid moved the knife edge and did not remove it.

---

## 6b. A GRID DOES NOT REMOVE A KNIFE EDGE — IT MOVES IT, AND AMPLIFIES WHAT IS LEFT

`bloom-export-watertight` run **107397090596** (head `cdccd6d`, 299.9 min)
failed with **931 rows attempted, 927 reaching the results**. The four missing
lines were three X0 drops and the X1 coverage clause naming two of them:

| row | floats differing | worst \|d\| | X0's bar on that row |
|---|---|---|---|
| `INFILL: x density 40` | 80 | 9.5367e-7 mm | 7.251e-14 mm (8 ULP of 40.819) |
| `INFILL: x CONTINUOUS x 3 turns` | 15 | 9.5367e-7 mm | 7.872e-14 mm (8 ULP of 44.317) |
| `INFILL: x a SPHERE head with a stem` | 15 | 9.5367e-7 mm | 1.223e-13 mm (8 ULP of 68.850) |

**9.5367e-7 mm is exactly 2^-20 — one step of `INFILL_PLAN_GRID`** — and it is
the SAME ABSOLUTE quantum on all three rows while being 4 / 2 / 1 float32 ULP at
their magnitudes 3.465 / 6.587 / 12.090. That is what says a grid step rather
than float32 rounding, and it is 10^7 times the bar.

**THE MECHANISM IS A TIE, AND THE TIES ARE SYSTEMATIC RATHER THAN RANDOM.**
`Math.round(t)` decides at every half step. §6 predicted a straddle would be "a
1e-7 event per coordinate", which is the right arithmetic for a value drawn at
random and the wrong model for these: **the midpoint of two GRID values is an
odd multiple of G/2 BY IDENTITY**, and a clip, a bisector and the refiner's own
edge split all produce one. Measured by tapping the quantiser over every one of
the twenty-two `INFILL:` rows in EXPORT mode — **994,532 quantised values, of
which 923 sit EXACTLY on a tie and 1,670 within one ULP of the scale of one,
0.168 %.** Four orders above chance.

**THE REMEDY IS A SLACK DERIVED FROM THE QUANTITY'S OWN CONDITIONING, NOT A
SECOND GRID.** A value within `slack` *below* a tie is treated as being AT it,
so both engines round it up and neither reads the last bit. Two steps in the
derivation, and neither is fitted:

* `v / INFILL_PLAN_GRID` is an **exact** operation — the grid is a power of two
  — so `t` carries exactly `v`'s own error and the slack can be quoted in steps.
* `v` is a plan coordinate reached by **differencing** quantities of order `L`,
  so its error is ULP OF THE SCALE and never of its own magnitude. That is X0's
  own ruling (`X0_TOL_ULPS`: *"that many ULP of the BUILD'S OWN LARGEST
  \|COORDINATE\| — the magnitude the value was differenced FROM, never its
  own"*), applied one module over. `INFILL_TIE_ULPS` **is** X0's 8, and the
  source says so beside it.

`infillSnap(v, slack)` is the one owner; `gq` (the outline) and `infillQuant`
(the cells, the capacity insets, the filleted holes) both call it. At slack 0 it
is `Math.round` term for term, negatives included, and it reads `t - Math.floor(t)`
rather than `t + slack` because at `t ~ 4e7` one ULP is 7.45e-9 and the slack
would be quantised onto it before it was ever used.

**IT SITS IN A MEASURED EMPTY BAND — the only thing that makes it a bar rather
than a tuned constant.** Distance from a tie, in ULP of the scale, over the same
994,532 values:

| distance | count |
|---|---|
| 0 (exactly on a tie) | 923 |
| < 1 ULP | 1,670 (cumulative) |
| **1 .. 100 ULP** | **0** |
| 100 .. 1,000 ULP | 16 |
| > 1,000 ULP | 992,846 |

The new boundary sits at 8 ULP, inside that empty band. **After the change, 0
values of 994,532 lie within 1 ULP of the new boundary and the nearest is 7.600
ULP away** — against a cross-engine divergence this repo has measured at **0.03
ULP of the build's own scale** (`CLAUDE.md`, the X0 block), so the realised
headroom is ~250x. `--quick` reproduces none of this; the tap is on the whole
block.

**WHAT IT COSTS, measured against `cdccd6d` over all twenty-two rows in EXPORT:
8 rows move, 14 hold, and NO triangle count moves on any row.** The worst
coordinate move is **9.6399e-7 mm** — one grid step plus the map's own slope —
and the three REFUSED/GATED rows are bit-identical because the quantiser is
never called there (q = 0), which is the guard partition measured rather than
argued. `verify-bloom-infill-bytes.mjs --base <main>` still reads **0 floats and
0 captured-grid values moved over 15 holders x 2 modes**.

**EIGHTH INSTANCE OF A DISCRETE DECISION ON A CONTINUOUS QUANTITY IN THIS
PROJECT, AND THE FIRST WHOSE SUBJECT IS THE SEVENTH'S OWN REMEDY.** The grid is
right and it is not the whole move: it makes the TOPOLOGY agree and leaves the
COORDINATE on a coin flip, which is a smaller failure wearing the same clothes.

**AND IT IS NOT LOCALLY REPRODUCIBLE, WHICH IS WHY THE FIX HAD TO BE BY
CONSTRUCTION.** `node tools/verify-bloom-export.mjs --only '<the three>'` reads
**PASS, 3 of 3** on `cdccd6d` against this container's own Chromium: the
divergence is between CI's V8 and Node's, and this box's browser is not CI's.
So "the local run passes" is not evidence about this class in either direction,
and what is offered instead is the population at risk going from 1,670 values
within one ULP of a decision to **zero**, with the derivation above and the
empty band underneath it.

---

## 7. Degeneracy — four fixes, and one that had to be undone

`analyzeStl` counts a triangle at or under `DEGENERATE_AREA_MM2` on **float32**,
and the export gate fails on a non-zero count.

* **A collinear triangle cannot be dropped.** It was, and it opened the shell:
  its three corners are distinct, so its three EDGES are real and the census
  counts them — **8 and 48 boundary edges on two rows**. Reverted.
* `infillEarClip` **retries from each starting vertex** until it returns a
  triangulation with no flat triangle. A rotation is a different triangulation
  of the same polygon with the same area and the same boundary.
* `infillFan` — the fallback — **picks an apex** the same way.
* The merge-walk and the sector walk are both **rejected if any of their
  triangles is flat**, and the merge-walk is additionally area-validated (see
  §8).
* **Flatness is measured in the PLAN, on float32.** Measuring it on the EMITTED
  corners is what `analyzeStl` does and it was written that way first — and the
  export gate refused it, correctly, because the emitted point goes through the
  mode's sheet and the mode's tip floor: `INFILL: x CONTINUOUS x 3 turns` came
  out 131,692 live against 131,004 export. What the plan test gives up is stated
  rather than hidden — a plan triangle that clears the bar can still draw a
  facet that does not — and the gate's own degeneracy clause reads **0 on all
  twenty-two block-39 rows in both modes**.

---

## 8. The merge-walk drew skin over its own hole

Its `advA` step spans two consecutive OUTER vertices, so on a wide angular
sector the triangle reaches across the hole — **S1's own second defect, in the
shipping emitter's last resort**. It draws surface where there is no material,
which is a fold rather than a crack, so no boundary-edge or degeneracy clause
can see it: the census read **182 pairs at `infillDensity` 8 and 112 at
`petalWidth` 8, worst span 1.1374 mm**, on states whose plain petal reads 0.

Where no arm can tile the annulus **the cell keeps its material**. A solid cell
is an outcome ruling 3 already has and already reports; `plan.achieved` and
`plan.solid` are corrected so the count on screen is the count the artefact
carries, and `cellOpen` is cleared so the MASK does not call a solid cell a
hole. Bridging the hole to the outer ring and ear-clipping the result is the
tessellation that would keep it; it is S4's, beside the non-convex cell it
shares a cause with.

---

## 9. The census — ten declared of twenty-two, twelve at exactly 0

Every entry carries its PLAIN control, because *the infill folded it* and *the
petal was already folded and now has more triangles* are two findings and only a
two-sided build tells them apart.

| row | infilled | plain | class |
|---|---|---|---|
| `x cup 1.2 x spine curl 360` | 11,384 / 0.9269 | 8,184 / 0.9263 | the petal's own fold |
| `x ALL FORM MAX` | 14,601 / 1.8477 | 10,632 / 1.7679 | the petal's own fold |
| `x roll 330` | 34,856 / 1.2263 | 15,280 / 1.5539 | the petal's own fold — **span falls** |
| `x petalWidth 8` | 1,408 / 0.4160 | 0 | conformance |
| `x petalWidth 30` | 720 / 1.2731 | 0 | conformance |
| `x footDelicacy 0.25` | 1,408 / 0.5350 | 0 | conformance |
| `x buckle 0.60 f 3` | 802 / 1.2266 | 0 | conformance |
| `x 40 petals x 3 whorls` | 6,720 / 0.5985 | 0 | petals overlapping, welded |
| `x CONTINUOUS x 3 turns` | 1,114 / 1.2000 | 0 | turns overlapping, welded |
| `x a SPHERE head with a stem` | 683 / 1.2000 | 0 | poles overlapping, welded |

**Twelve rows read exactly 0** — the shipping defaults, BOTH ends of the density
range, the short blade and the long one at the densest pattern, the thick sheet,
the thin tip, the sharpest apex, the sepals and all three guard and refusal
rows — so the block is not a set of rows that all happen to be declared, and X2
holds every one of those twelve to zero.

The three "conformance" rows are the cost of sizing cell facets from the lattice
rather than from the surface (§5). **Halving and thirding `INFILL_EDGE_SHARE`
moved none of those counts**, so it is the lattice's own step and not the
tolerance. The last three have a worst span of exactly the sheet thickness,
which is a top skin meeting a bottom skin rather than a sheet folding.

---

## 10. O2's parity ray needed no change, and the first cut of this PR made one

**WITHDRAWN, and the withdrawn reading is kept here so the correction is
checkable.** This PR first carried an edit to `tools/bloom-self-intersection.mjs`:
`orientation()` fires its second-opinion ray from one facet's centroid stepped
1e-4 mm along its own normal, on the premise that the step leaves the solid, and
on a sheet that COILS the premise fails — `petalCup` 1.2 × `petalSpineCurl` 360
passes within 0.0002 mm of itself, so the step lands inside the neighbouring turn
and the parity is counted from a point in the material. The edit marked such a
shell `parityUndefined` and took it out of `disagreements`.

**It was dead code by the time it shipped, and only `CA5` made anyone look.**
`verify-bloom-census-adjacency.mjs --scope` refuses a PR that changes the census
tool and also moves geometry — its allowlist says in as many words that *"the
scope this gate exists to hold is GEOMETRY: no `bloom-geometry.js`, no
`bloom.js`, no `bloom-registry.js`, no `flower.*`"* — and this PR moves all
three. The honest move is not to widen the allowlist but to ask whether the
census tool needs changing at all. **Measured, `orientation()` reverted to
`main`'s, export mode, every one of block 39's 22 rows:**

| | rows |
|---|---|
| `disagreements === 0` | 20 of 22 |
| disagree, and DECLARED in `SELF_INTERSECTION_XFAIL` | 2 (`x cup 1.2 x spine curl 360` at 8 of 9 shells, `x ALL FORM MAX` at 8 of 9) |
| disagree and NOT declared — what O2 fires on | **0** |

O2's clause is already guarded on `SELF_INTERSECTION_XFAIL_HAS(row.label)`, and
both disagreeing rows are in that list with their pair counts (§9), so the
existing guard covers them and the new field excused nothing that was not already
excused. What the edit would have shipped is a *standing* exemption for any future
shell whose ray start happens to sit near another sheet — strictly weaker than a
declaration with a number, on a clause nobody was asking to relax.

**The order matters and is the lesson.** The edit was written while the infill's
holes had removed those rows' census pairs, which is a state that existed for a
few hours; once the two rows earned their `SELF_INTERSECTION_XFAIL` entries the
edit had nothing left to do, and nothing went red to say so. A fix can stop being
needed, and the thing that found this one was a scope guard firing for a
completely different reason.

## 11. Cost

Export mode, whole bloom, measured on this tree:

| state | triangles | % of the 1,500,000 budget |
|---|---|---|
| shipping default, guard OFF | 24,688 | 1.6 % |
| shipping default, guard ON | 53,536 | 3.6 % |
| guard ON at density 40 | 46,848 | 3.1 % |
| 40 petals × 3 whorls, guard OFF | 367,632 | 24.5 % |
| **40 petals × 3 whorls, guard ON** | **726,752** | **48.5 %** |
| `ALL MAX` (a CHOICE away, uninfilled) | 24,688 | unchanged |

The infilled default is **2.17×** the plain one. `docs/bloom-infill-port-plan.md`
projected ~41,000 triangles before S3 measured the mode-free subdivision the
gate forced; the honest figure is 53,536 and the projection is superseded.

**The corner that matters is `INFILL: x 40 petals x 3 whorls`, at 48.5 % of
budget** — this feature's own `ALL MAX`, and the row a future per-petal feature
should check first.

**AND THAT ROW'S FIGURE WENT STALE INSIDE THIS PR, WHICH IS WORTH RECORDING
RATHER THAN QUIETLY CORRECTING.** It was published here and in `CLAUDE.md` as
723,520 / 48.2 %; the mode-free subdivision landed after it was written and
nothing re-measured. The figure above is measured on this tree AND on `cdccd6d`
— identical on both, so it is not the tie fix's — and the other five rows of the
table reproduce exactly. A count is a property of the tessellation and every
change to the emitter moves it; this repo's own rule about a published figure
that has stopped reproducing applies to a number inside one's own PR.

---

## 11b. The edge-profile gate — one declaration owed, three claims corrected

`verify-bloom-edge-profile.mjs` is not in CI and was not in this session's
brief; it was run because it draws its rows from `SMOKE_LABELS`, which block 39
is now in. It found two things and they are different in kind.

**OWED BY THIS PR — E2's subject is EMPTY on an infilled blade, and that is a
regression against #278.** `emitInfillPanel` calls `emitPanel` on the BASAL
sub-panel alone, so the thickness taper and the half-round bead run around that
panel's own perimeter and nowhere else; above the split the cells close with
`emitRim`, a flat wall from top skin to bottom skin. Eva's S3 ruling is that
HOLE rims stay flat walls and the bead is S5's — this emitter extends that to
the blade's OUTER margin, which the ruling did not name. So over the treated
region an infilled blade gives back the 90-degree cliff one sheet thick that
#278 exists to remove. Measured, the ruled defaults: `0` edges in E2's window
and `144` skipped as the foot-to-blade seam's own ramp, because the basal
panel's apexes all sit inside `RIM_TAPER_MM` of it.

It is DECLARED, per PART and never per row. A row-level skip would have taken
the SEPALS out with it on `INFILL: x sepals 8` — they are pinned uninfilled by
ruling 4 and carry **2,192 edges** of real beaded subject, which the narrowed
clause now measures and passes. `emitRimLoop` is the hook the brief already
asks these loops to be kept for.

**NOT THIS PR'S — the control was failing 3 of 6 on `main`, and the claim was
what was wrong.** Three mutations name `E6` and do not fire it. Established
two-sidedly: the same command on a worktree of `55ca84c` reports the same three
with the same `MISSED E6`, and this branch's cramped row is byte-identical to
main's by the byte partition. The header's blanket — *"EVERY rim mutation below
also reddens E6"* — was asserted once over six mutations rather than measured on
each, and `every-clamp-is-logged` sets a RECORD and moves no vertex, so that one
could never have been true. The three claims are NARROWED, which is strictly
stronger here: a clause a mutation does not name going red is still a failure,
so the day one of them starts moving E6 the control says so by name. After:
**6 of 6, each firing exactly what it claims.**

---

## 12. What is NOT done, named rather than left to be discovered

* **The lobe refusal.** A lobed blade's notches make the cells non-convex and
  the emitted solid carries more handles than holes (genus 9 against 4 cut).
  It is a REFUSAL with a word, not a silent pass, and making the two compose
  wants a cell construction that does not assume a convex region — S4's.
* **The cell SIZE is still flat** (S2's own recorded gap): a compressed state
  keeps fewer holes because the plan refuses to cut where a 1.00 mm wall does
  not fit. Making the Voronoi itself metric is S4's, beside the relaxation and
  anisotropy rulings.
* **`INFILL_DEGENERATE_AREA_MM2` is a deliberate duplication** of the harness's
  `DEGENERATE_AREA_MM2`, with its owner named in the source. The geometry may
  not import from `tools/`, and an emitter that cannot know the bar it must
  clear is worse.
* **The mutant table does not name an I clause.** `verify-bloom-infill.mjs`
  carries its own six must-fails and every one fires; the apex table was not
  extended. Recorded as a gap rather than claimed closed.
* **`ALL MAX` times out `settleBuild`'s 30 s budget on this container, on the
  BASE tree as well** (33.6 s at 55ca84c, 34.5 s here) — a property of the box,
  not of the branch, and the reason the local smoke run is quoted without it.
