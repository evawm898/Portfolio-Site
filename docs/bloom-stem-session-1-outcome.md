# Stem session 1 — rulings 5 and 6, Oct 4, 2026

*Built on `main` at `c97d149`. Source brief: `docs/bloom-stem-state-oct-2026.md`, which
supersedes the session prompt's own notes. Measurements are Node builds through the shipped
geometry. Each figure names its mode; the stem's axis law is mode-free, and every tip figure
below reads the same in LIVE and EXPORT.*

## 0. Outcome

- **Rulings 5, 6 and 7 are recorded in the charter** (new section "The stem — rulings 5, 6 and
  7"). Until this PR none of them was written anywhere in the repo.
- **Ruling 5 ships, and it is byte-inert:**
  - `STEM_MIN_WALL_MM`'s comment now declares that the wall is measured HORIZONTALLY.
  - Two geometry comments that called the perpendicular figure Eva's open question are
    corrected.
  - The read-out no longer says "Eva's to rule".
- **Ruling 6 is NOT built. Both of the brief's stop conditions fired on the kink-direction
  law** (§2). Nothing of ruling 6 is in this PR, so no frozen phase is owed and no workflow
  file is touched.
- **Ruling 7 was not attempted**, as instructed.

## 1. Reconciliation

- **`main` has no commits after `c97d149`**, so nothing in the brief is already shipped.
- **Every figure in the brief that I checked against source holds:**
  - the two predicate sites (`bloom-geometry.js:12377`, `bloom-registry.js:407`);
  - 1 live row and 1 row in each of `phase46`–`phase49` for the gate un-gating alone;
  - the 2.84 mm and 3.06 mm tips (re-measured in §4).
- **One thing in the brief conflicts with a recorded rule.** `stemNodeLaw`'s header and
  CLAUDE.md both carry an instruction dating from the leaf session: the flower's
  leaves-flip-180°, bends-turn-golden-angle disagreement "must not be reproduced when
  curvature arrives". A golden-angle kink on a LEAFED stem reproduces exactly that
  disagreement.

## 2. Why ruling 6 stopped: the golden angle on a leafed stem

A bare stem has no first leaf, so it needs a new kink direction. If the golden angle also
replaces "away from the first leaf" on LEAFED stems, the result is below.

Tip offset in mm. "moved" is how far the tip's position moves, not how its length changes.
Two phases are shown: `k·GA` is the flower's own phase, and `π + k·GA` keeps node 0's
direction where it is today.

| row (block 41) | nodes | today | k·GA: tip, moved | π+k·GA: tip, moved |
|---|---|---|---|---|
| 0.48 on 100 × 6, 3 alternate | 3 | 2.599 | 3.054, **5.52** | 3.054, 1.30 |
| 0.48 on 100 × 3 (solid) | 3 | 2.841 | 2.981, 5.73 | 2.981, 1.05 |
| 0.01, first step | 3 | 0.054 | 0.064, 0.12 | 0.064, 0.03 |
| prominence 1.00 | 3 | 5.414 | 6.364, 11.50 | 6.364, 2.71 |
| thinnest bore, 120 × 4 | 3 | 7.644 | 8.221, **15.59** | 8.221, 2.99 |
| widest bore, 12 mm | 3 | 2.186 | 3.219, 5.20 | 3.219, 1.79 |
| opposite × 5 | 5 | 3.260 | 2.964, 6.17 | 2.964, 0.86 |
| whorled × 8 | 8 | **7.876** | **3.303**, 10.38 | 3.303, 6.17 |
| × SPHERE | 3 | 1.340 | 1.769, 3.01 | 1.769, 0.89 |
| longest leaf, shortest stem | 1 | 0.008 | 0.008, 0.02 | 0.008, 0.00 |
| thin sheet, short stem | 7 | 0.110 | 0.118, 0.23 | 0.118, 0.04 |

**The per-node directions, before and after:**

- **3 alternate:** 180 / 0 / 180 today. Under `k·GA` they become 0 / 137.5 / 275.
- **Whorled × 8:** today's 45° steady turn becomes the golden spiral, which halves the whorled
  stem's lean (7.88 to 3.30 mm).

**The scope:**

- the kink change moves **11 more live rows and 44 more frozen rows** (11 in each of
  `phase46`–`phase49`);
- that is on top of the 1 + 4 the brief scoped, with all counts taken by predicate over each
  row's coerced control set;
- the kinks stop avoiding the leaves on every leafed stem.

**What is not a defect:**

- On the default alternate stem, golden kinks bring the tip CLOSER to the flower's ~3.3 mm
  (3.05 against 2.60).
- With 25 mm leaves on 3 mm they give 3.288, which is the flower's figure.

That is the case FOR the change, and it is Eva's to weigh.

**The two shapes it can take:**

- **(A) Golden everywhere.** One law. 12 live rows and 48 frozen rows move. It overturns the
  recorded leaves/bends rule.
- **(B) Golden only where a node has no leaf.** Leafed stems keep "away from the first leaf".
  1 live row and 4 frozen rows move, as scoped.
  - The cost is two direction laws keyed on whether a leaf exists.
  - Adding leaves to a bare stem already moves its nodes (the inset), so a direction change
    rides on a change that happens anyway.

## 3. Bare-stem node placement, derived but not built

- **Today's no-leaf layout is already a function of length, and it is the flower's own.**
  `leafNodeLayout` with no leaf has rise 0, so the inset is `0.16 L` and nodes spread evenly
  to `0.86 L`. That is exactly `flower.js` `stemNodeParams`' `lerp(0.16, 0.86)`. On 100 mm it
  gives 16 / 51 / 86.
- **What the flower figures add is a SPACING FLOOR, derived from the node law's own Gaussian.**
  - Two swellings of half-width `w` sum to a single bump (one maximum, not two) exactly when
    their separation is ≤ `√2·w`.
  - With `w` = 3.2738 R, nodes closer than **4.63 R** stop reading as separate joints.
  - The bend peaks 0.818 w below its node, so that floor also keeps each bend's peak clear of
    the next node's swelling.
- **Where it binds:**

  | stem | max nodes under a `√2·w` floor (span 0.70 L) |
  |---|---|
  | 6 mm × 100 mm | 6 |
  | 3 mm × 100 mm | 11 |
  | 6 mm × 40 mm | 3 |
  | 12 mm × 12 mm | 1 |

- **It is not proposed for this session, because it is not leaf-free.** One count governs
  nodes and leaves, so a floor that clamps the node count clamps the leaves too.
  - Two shipped leafed rows already sit under it:
    - whorled × 8: 12.00 mm spacing against 13.89;
    - "a thin sheet on a short stem": 1.15 mm against 13.89, seven swellings merged into one.
  - Both would move.
  - It belongs with the decision in §2, not ahead of it.

## 4. The two reported law differences

**(i) Spindle and ramp scaled by stem RADIUS (shipped) or by stem LENGTH (the flower's
`0.055 L`, `0.12 L`).** These are the block-41 rows, EXPORT. "Stations" are the noded
placer's.

| row | spindle R / L-scaled | tip R / L | stations R / L |
|---|---|---|---|
| 100 × 6 | 9.82 / 5.50 mm (1.83 R) | 2.599 / 2.841 | 49 / 56 |
| 100 × 3 | 4.91 / 5.50 (3.67 R) | 2.841 / 2.841 | 61 / 61 |
| 100 × 12 | 19.64 / 5.50 (0.92 R) | 2.186 / 2.841 | 26 / 53 |
| opposite × 5 | 9.82 / 5.50 | 3.260 / 3.456 | 48 / 76 |
| whorled × 8, 120 × 6 | 9.82 / 6.60 | 7.876 / 7.827 | 59 / 80 |
| × SPHERE, 70 × 6 | 9.82 / 3.85 (1.28 R) | 1.340 / 1.684 | 33 / 53 |
| 20 × 6 | 9.82 / **1.10 (0.37 R)** | 0.008 / 0.175 | 10 / 18 |
| 12 × 6 | 9.82 / **0.66 (0.22 R)** | 0.110 / 0.319 | 17 / 53 |

**What adopting the length scaling would do:**

- **What it moves:** every noded row, 11 live (all of block 41 but the two GATED rows) and
  44 frozen.
- **What it costs in triangles:** stations rise everywhere except at 3 mm, up to ×3.1 on the
  12 mm short stem. The stem is 48 sectors × 2 walls, so each station is roughly 190
  triangles on a hollow stem.
- **What it fixes:** it makes every tip the length law's. That is mostly not the spindle: once
  every ramp has finished, the tip is `slope · Σ(L − s_k)`, which does not depend on the ramp.
  - 100 × 3 reads 2.841 under BOTH scalings.
  - The 6 mm shortfall (2.599) is the last node's 21.4 mm ramp running off the end of a
    100 mm stem.
- **What it breaks:** on short stems it is #296's mistake again. A 0.66 mm spindle on a 6 mm
  stem is a bead, not a joint, which is the reason #301 ported a ratio of the radius in the
  first place.

**(ii) The tips, after this session's changes** (none of which touch the axis). Both modes
read the same:

| stem | leaves | tip | nodes at (mm) |
|---|---|---|---|
| 3 mm × 100 mm, 0.48 | 40 mm | **2.8410 mm** | 22.94 / 54.47 / 86.00 |
| 3 mm × 100 mm, 0.48 | 25 mm | **3.0576 mm** | 16.00 / 51.00 / 86.00 |

Under (A) above they would read 2.981 and 3.288.

## 5. Ruling 5's proof

`node tools/verify-bloom-surface-bytes.mjs --base <worktree of c97d149>`, the full matrix in
both modes, in 29 foreground chunks merged with `--merge`.

- **Rows:** 1,047 rows, all holders.
- **Export floats:** 0 of **1,343,515,284** moved, over 149,279,476 triangles, positionally
  under `Object.is`.
- **Captured-grid values:** 0 of **81,318,668** moved.
- **The merge's one finding:** "VACUOUS: no mover", which is the claim itself. The tool is
  built for partitions that predeclare movers, and an inert change has none.
- **The control:** `--control` fires BOTH clauses (one export float, one grid value, 1e-9).
- **REDEFINED 0:** `tools/bloom-harness.mjs` is untouched, so the matrix is identical by
  construction.
- **No frozen phase is owed.**
