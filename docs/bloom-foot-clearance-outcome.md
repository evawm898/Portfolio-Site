# The foot clearance — a capped foot no longer lands exactly on its arc

*Oct 22, Eva's ruling on #435. Base: `main` at `5ed2ee6` (root support, #435, merged as `905c196`).*

Read [`bloom-root-support-outcome.md`](bloom-root-support-outcome.md) §4 first: this session
replaces its "a foot capped EXACTLY at its arc meets a slit tube's columns to the bit — the
aligned weld, declared … never nudged".

## 1. What was ruled

> The foot cap must not land exactly on the arc. Remove the shared vertex, don't declare the
> pairs. The cap stays derived from the ring's room, but a foot's edge must never coincide with a
> neighbour's edge or a tube column; derive the clearance from what the weld actually needs;
> mode-free; rows where the cap does not bind hold by branch.

The precedent is the leaf petiole's half step (CLAUDE.md, "THE PETIOLE RING IS OFFSET A HALF
STEP") and the tube's sinus knots "half a column inside the margins" (TU4): a coincident vertex is
removed, never declared.

## 2. Diagnosis first — every pair attributed

`node tools/bloom-weld-attribute.mjs --only <regex> [--root <tree>]` (new, committed) builds a row
in EXPORT mode, runs the shipped census with `collect`, and tags EVERY triangle with the part that
EMITTED it — the tube rings' own `triFrom`/`triTo`, and each petal's and sepal's new `triRange`
(a telemetry field on the petal record, `[first, end)` of its triangles in the accumulator's
stream; it moves no byte). A within-shell pair whose two triangles were emitted as two DIFFERENT
parts is a **WELD** — two closed surfaces that are one census shell only because a vertex
coincides; a pair inside ONE part is a **FOLD**. It also counts the coincident positions by the
parts that meet there.

**The first cut tagged by primitive (edge-connected components) and by nearest captured lamina,
and both were wrong in a way worth recording**: on `TUBE: 12 petals x k 6` neighbouring petals
coincide along whole EDGES, so they are one edge-connected primitive and every pair read as a
fold; and a nearest-lamina label gives a foot corner to whichever petal's lattice point is nearer,
which is the neighbour's half the time. Only the emitter can tell two coincident surfaces apart.

**On `main` (`5ed2ee6`), EXPORT, the shipped lattice:**

| row | within | WELD | FOLD | coincident positions (doubles) |
|---|---|---|---|---|
| `TUBE: 12 petals x k 1 (1 panel)` | 263 | 263 (petal x tube) | 0 | 2 petal/tube |
| `TUBE: 12 petals x k 2 (2 panels)` | 768 | 768 (petal x tube) | 0 | 6 petal/tube |
| `TUBE: 12 petals x k 3 (3 panels)` | 986 | 986 (petal x tube) | 0 | 8 petal/tube |
| `TUBE: 12 petals x k 4 (4 panels)` | 1,457 | 1,457 (petal x tube) | 0 | 14 petal/tube |
| `TUBE: SNAP: asked 5 at 12 petals (builds 4)` | 1,457 | 1,457 (petal x tube) | 0 | 14 petal/tube |
| `TUBE: THIN SHEET 0.6 x k 2 x fusion height 0.4` | 530 | 530 (petal x tube) | 0 | 6 petal/tube |
| `TUBE: 12 petals x k 6 (6 panels)` | 2,236 | 2,236 (petal x petal) | 0 | 8 petal/petal |
| `DOME: rise 1 x RADIAL x spread min (0.6)` | 1,424 | 1,048 (petal x petal) | **376** (238 root blend + 138 foot) | 4 petal/petal |
| `DOME: rise 1 x 6 layers x spread min` | 1,268 | 932 (petal x petal) | **336** (247 root blend + 89 foot) | 3 petal/petal |

On the pre-#435 tree (`8403b47`) every tube row reads 0, and the two hemisphere rows read 272
(177 root blend + 95 foot) and 264 (134 + 130 foot), all FOLD.

**THE MECHANISM, one cause, two routes.** A foot capped EXACTLY at its arc (`r x span`) has its
margins at exactly the half-step azimuth, where its neighbour's margins are: the two feet abut with
a gap of zero. Wherever the across-direction is laid on a circle about the axis, both neighbours
then evaluate the same circle at the same angle and emit the SAME DOUBLE:

- **the slit tube** (k 1-4, SNAP, thin sheet): the zero gap leaves the sinus uncut (`W` is 0, under
  the bead bar), and the uncut branch of `between()` puts a tube column AT the sinus centre — which
  IS the margin when the gap is zero. The tube's own "half a sinus column inside the margins" rule
  scales with the gap and is zero there.
- **every petal an edge petal** (k 6, two petals a panel): each edge petal's open half is blended
  onto the ring curve (`tubeLobeHook`), so two neighbours' margins are `curve(the half-step angle)`.
- **the hemisphere's equator** (spread 0.6, rise 1): the rim ring sits on the equator, the foot's
  across-row is a great circle there, and two neighbours' corners land on it at the same azimuth.

So #435's own attribution of the two hemisphere rows ("the blade now folds at u 0.3-0.5 as well …
858 root blend + 212 foot + 354 blade") was a nearest-lamina carry-back that could not see which
petal a triangle came from: 1,048 and 932 of those pairs were welds between neighbours. **The
genuine folds — 376 and 336 — are root blend and foot only, 0 blade**, up from 272 / 264 on the
uncapped tree: the narrower capped foot (6.40 -> 2.08 mm on the single whorl) collapses the root
blend faster. They are real, they stay declared, and that is their stated cause now.

## 3. The fix

`footCapMm(radiusMm, spanRad) = radiusMm * (spanRad - FOOT_CAP_CLEARANCE_RAD)`, with
`FOOT_CAP_CLEARANCE_RAD = 2^-19` rad, is the ONE owner of the capped width; `footRing()` reads it
for every petal ring and every sepal tier. The arc stays in the record (`footArcMm`) and the cap
sits beside it (`footCapMm`).

**Why 2^-19 rad, and why it is not a typed epsilon.** The weld is EXACT EQUALITY of positions, and
the positions a print gets are the STL's float32s, so two vertices are distinct for every reader
(the census on the builder's doubles, a slicer on the file) only if they differ by whole float32
steps of the coordinate they were differenced from. A float32 step at magnitude r is at most
r x 2^-23. A cap at `r x (span - 2^-19)` opens a gap of r x 2^-19 between neighbouring margins,
so each margin stands **r x 2^-20 = eight float32 steps of the ring's own radius** from the
half-step azimuth — and the tube's uncut knot, at the gap's centre, eight steps from each margin.
Eight is the count X0 already derived for a cancellation residue (`X0_TOL_ULPS`). Because the
clearance is an ANGLE, the separation scales with the radius at every foot row: a row nearer the
axis is nearer by the same factor its float32 step is smaller.

What it is NOT, and the two alternatives the ruling offered:

- **Half a column of the foot's own lattice** (the tube's / petiole's own offset): ~0.3 mm a side
  at the 12-petal ring, a visible notch between feet that the ruling did not ask for and that would
  move the D_max and every capped foot by ~5%. The tube's half-sinus-column rule cannot be borrowed
  either — it is a fraction of the gap, and the gap is what is zero.
- **A printable gap (`MIN_FEATURE_MM`, or the sheet)**: a slit under the minimum feature fuses in
  print, so any sub-millimetre gap is physically invisible; a millimetre slit between every pair of
  capped feet would be a geometry change, not a clearance. The clearance exists for the census and
  the file, not for the object.

**Mode-free by construction**: it reads only the cap's ring (`footCapRadiusMm`, the export floor's
in both modes — #435's own mode finding) and the span, so which shells a solid has is the same in
live and export. **By branch where the cap does not bind**: a foot inside its cap is the asked
double, no product formed; a foot the 1.6 mm floor wins keeps 1.6 mm (it overruns its arc either
way, so its corners pass their neighbour's rather than meeting it).

### How tiny — the foot widths, the default `petalWidth` 16

| petals | `main` (arc, capped?) | here | change | per side |
|---|---|---|---|---|
| 8 | 6.400000000 (arc 6.946572, no) | 6.400000000 | **0** — the cap does not bind | 0 |
| 16 | 4.911968198 (arc, capped) | 4.911944341 | −2.3858e-5 mm (4.86 ppm) | 1.19e-5 mm |
| 40 | 3.106601460 (arc, capped) | 3.106563738 | −3.7722e-5 mm (12.1 ppm) | 1.89e-5 mm |

Live and export identical; **triangle counts identical** (24,688 / 49,184 / 122,672 in both modes).
At the 12-petal tube ring (10.832 mm) the foot goes 5.671852 -> 5.671832 mm (−20.7 nm).

## 4. Measured after

`node tools/bloom-weld-attribute.mjs`, this tree: **every tube row reads 0 pairs with its base
shell count back** (k 1 / 2 / 3 / 4 / 6 / SNAP / thin: 14 / 15 / 16 / 17 / 19 / 17 / 11), 0
coincident positions. The hemisphere rows read **376 / 0.2475 mm** and **336 / 0.2905 mm**, every
pair a FOLD, 0 coincident positions.

## 5. Gates

- **FC2** (new, `footVertexClauses` in `tools/bloom-harness.mjs`, run by the export gate beside
  X0): no vertex position of the EXPORTED FILE (its own float32s, which X0 has just proved are this
  build) is carried by two parts — petal x petal, petal x tube, sepal x sepal — each triangle tagged
  by the stream range of the part that emitted it (the rebuild X0 compared against). A sepal on a
  petal is NOT flagged: that is the ALIGNED WELD the sepal block declares (a sepal on its own
  petal's slot at phase 0), not a neighbour. Swept in Node over every exportable live row: **0 rows
  fire on this tree; on `main` it fires on EXACTLY the nine rows above and on no other** (8 to 32
  coincident float32 positions each — the file's float32s collapse more than the doubles do).
  Smoke row `TUBE: 12 petals x k 6 (6 panels)` claims it (census: 200 families, both directions).
- **FC1** restates the clearance (`FOOT_CAP_CLEARANCE_RAD_RULED = 2 x 8 x 2^-23`, the derivation,
  never imported — the harness refuses to load if the geometry's constant moved) through
  `footCapRestated`, which every foot restatement reads (FC1, Z3, SP3, SO13, panel route (j)), and
  checks the record's `footCapMm` against it.
- **The mutant** `the-foot-cap-lands-on-the-arc` (in `node tools/verify-bloom-root-taper.mjs
  --control`): `footCapMm` back to `radius x span`, witnessed on the mutated module (the k 6 tube's
  capped foot reads its whole arc) before any clause is consulted; it fires **FC1 and FC2**. Two new
  FC probes (`TUBE: 12 petals x k 6`, `DOME: rise 1 x RADIAL x spread min (0.6)`), each asked to
  bind. `the-foot-cap-is-typed-back-to-10-mm` was re-anchored (this change moved its line).
  **10 of 10 fire what they name.**

## 6. Census, bytes, frozen

**Census.** Seven `SELF_INTERSECTION_XFAIL` entries REMOVED (the seven tube rows, read 0); five
re-recorded by value with the old figure in each note:

| row | was | now |
|---|---|---|
| `DOME: rise 1 x RADIAL x spread min (0.6)` | 1,424 / 0.6709 | **376 / 0.2475** (the weld half gone) |
| `DOME: rise 1 x 6 layers x spread min …` | 1,268 / 1.0124 | **336 / 0.2905** (the weld half gone) |
| `PER-PETAL: petal3Tilt max (75) at 2/side` | 98 / 0.3110 | 98 / 0.3109 |
| `PER-PETAL: petal8Curl max (360) at 7/side` | 370 / 0.5695 | 370 / 0.5694 |
| `SEPALS: on a FAN with no mirror-line petal (4 sepals, aligned)` | 2,539 / 1.2256 | 2,633 / 1.2256 |

The last is the ALIGNED WELD class (every pair petal x sepal on both trees, 22 coincident positions
here against 32): a sepal capped a clearance inside its arc lands differently on its petal's
lattice, a tessellation reading of a by-design overlap the ruling does not reach. The census over
**all 247 mover rows** in Node: 0 undeclared rows read pairs; of the 32 declared rows among them 27 are at their old record and 5 are the re-records above (the 7 tube rows, no longer declared, read 0). `node
tools/bloom-xfail-magnitudes.mjs --only …`: 5 of 5 at their records. **Browser-confirmed**: `node
tools/verify-bloom-export.mjs --only <the 12 rows>` — PASS, 12 of 12 reached and watertight, the
7 tube rows free of within-shell pairs, the 5 declared rows each at its recorded magnitude, FC2
silent.

**Bytes.** `node tools/verify-bloom-surface-bytes.mjs --base <worktree of 5ed2ee6>
--movers-predicate foot-clearance` (53 `--range` chunks, closed by `--merge`): **247 of 247
predeclared movers moved, 0 floats moved on the 1,259 holders**, positionally under `Object.is`,
both modes — 1,801,647,360 export floats over 200,183,040 triangles and 82,005,892 captured-grid
values. The movers are predeclared from the **BASE tree's own record**: a ring moves iff the width
the new law restates from its asked foot, cap ring and span differs from the width the base BUILT
(the cap binds above the floor); every built sepal tier on its own ring and step; a raceme's floret
state; a ring with no built petal and a closed tube's (k 0) record-only feet skipped (root support's
own measured exclusions).

**Frozen sweep** (`--frozen-sweep`, the same predicate, a consequence of the partition): **all 81
baselines carry a mover — 14,930 of 72,837 frozen rows**, `frozen/phase2` 40 of 76 to
`frozen/phase82` 240 of 1,485; none threw. Every tag's definitions still deep-compare; their bytes
stop reproducing on those rows. `--memo` now also checkpoints every 30 s inside a baseline: a
~950-row phase outlasted a foreground call and a memo written only between baselines never
advanced (measured, two of four workers closed 0 phases in 570 s). **No row was added or removed,
so no frozen phase is owed.**

**Other gates, run on this tree:** `verify-bloom-root-taper` (clean 18 probes, `--control` 10 of
10); the combination gate (CG0–CG7 clean, 258 cells under the bar, all declared, none moved); the
wall instrument (V1–V5 clean); the defaults bar (PASS); `verify-bloom-scopes` (13 clauses PASS);
the edge-profile gate over the 27 smoke rows that move (E0–E7 PASS); the connectedness gate over
those rows and the nine (35 of 35 one piece); `bloom-smoke --check`.

## 7. Open, for Eva

- The ALIGNED sepal weld (a sepal on its own petal's slot at phase 0) is the same class of
  coincidence and is still declared by value on its rows; the ruling's subject was a foot against a
  NEIGHBOURING foot or a tube column, so it was not touched.
- The two hemisphere-at-spread-0.6 rows still fold — 376 and 336 pairs, root blend and foot — and
  that is the ruled cap acting on a 2.65 mm ring, as #435 reported; only the weld half was not.
