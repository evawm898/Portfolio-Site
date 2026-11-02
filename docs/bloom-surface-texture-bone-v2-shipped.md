# BONE v2 ships — the hybrid mesher, coarse / full, and a budget allocator

Nov 2. Eva's rulings of Nov 1–2 on rounds 1 and 2 of the prototype
(`docs/bloom-surface-texture-bone-v2.md` §13–§22), built into the shipped
geometry. Read §1 for what changed for a visitor, §3 for the cap (and the one
contradiction in the brief it raises), §10 for the questions.

## 1. What ships

- **The v2 field** (`bone2Field` in `bloom-geometry.js`): merging pores, the
  smallest 0.5–1.0 mm (default 0.5), spread 1.5–3 (default 3), three
  log-spaced size bands, a superellipse cup, a rounded lip, nested pits on a
  shelf. One world field, OUTWARD only (pore floors on the sheet), under the
  curvature mask × patch field exactly as v1 (curvature decides; there is no
  nib mask). PEBBLE and CELLULAR stay hidden options and build byte-identically
  (§7); v1's BONE field is gone (its function is kept, unused, so its
  constants keep their owner).
- **Height 0.4–2.5 mm** (ruled). The control carries help text and its
  read-out a warning past 1.5 mm: *UNVALIDATED for powder removal (nothing this
  deep has been printed)* (`TEXTURE_HEIGHT_HELP`, one owner; the harness refuses
  to load if the words go).
- **Coarse / full.** The live view and every release build (the slider let go)
  are **COARSE**: the v2 field on the shipped 0.4 mm lattice, v1's exact
  triangle count. The **Full detail** button and the **STL export** run the
  **allocator** and build **FULL**: pore-conforming rings, fine rows only on the
  creases between merged pores and patches at their triple junctions (the
  hybrid of round 2), spent where it shows until the cap. A held slider keeps
  the light preview (F7). The read-out says which view is on screen and, under
  full, what share of the porous area got full detail and how many cells.
- **The ONE export cap** `EXPORT_TRI_CAP` = **2,000,000**, PROVISIONAL (§3).
  `EXPORT_TRI_BUDGET` is the same number under its old name; every reader reads
  it.

## 2. The rulings in force, and where each is

| ruling | where |
|---|---|
| attachment B, one world field | `bone2Field`, read by every part's relief (`boneReliefPass`) |
| outward only | the floor `f = 0` is the sheet; TXB1 |
| merging pores 0.5–1.5 mm, nested pits | `BONE_PORE_RANGE`, `BONE_RATIO_RANGE`, `BONE2_NEST_*` |
| the HYBRID mesher, derived, no regular fine grid | `bone2HybridOrganMesh`; TXB8, TXB9 |
| height 0.4–2.5, UNVALIDATED for powder | `TEXTURE_HEIGHT_RANGE`, `TEXTURE_HEIGHT_HELP` |
| curvature mask × patch field; curvature decides | v1's masks, unchanged |
| texture and infill exclusive; ships OFF | unchanged |
| PEBBLE / CELLULAR hidden, byte-identical | §7 |
| print target Formlabs Fuse via PreForm; cap PROVISIONAL 2.0 M | `EXPORT_TRI_CAP`, §3 |
| full where it shows, coarse elsewhere; budget decides the split | the allocator, §4 |
| "where it shows" DERIVED, never a per-organ list | `bone2Exposure`; TXB14 |
| pore positions identical in coarse and full | one field, one disc per pore; TXB12 |
| live: release coarse, Full detail button + export full, drag light | `bloom.js` |
| engine agreement on counts and float32 bytes | §6; TXB15 |

## 3. The cap: one named constant, where the number came from, and what it moves

`EXPORT_TRI_CAP = 2_000_000` in `bloom-geometry.js`, with its provenance in
the comment: **Eva's ruling of Nov 2** — the print target is a Formlabs Fuse
through PreForm, and ~100 MB of binary STL is the size she named as safe to
load; a binary STL is 84 + 50 × triangles bytes, so 2,000,000 triangles is
100.0 MB. It is **PROVISIONAL**: the final value comes from the PreForm ladder
(§9). It replaces the 1,500,000 that stood with "slack by design" and nothing
measured under it (round 2 §17). The page's refusal message names the cap and
says it is provisional.

**THE CONTRADICTION, FLAGGED AND NOT RESOLVED BY ME.** The brief says both
*"replace the 1.5 M constant with a single named cap"* and *"PEBBLE /
CELLULAR … building byte-identically"* / *"the shipping default hold to the
bit"*. Three mechanisms besides BONE already read the budget, so one cap moves
them all:

- **the texture edge cap** (T3 §7): a PEBBLE / CELLULAR build over the budget
  at 0.4 mm coarsens its lattice edge to the finest rung that fits. With 2.0 M,
  states that coarsened now fit at a finer rung, or at 0.4. Block 79's three
  rows were measured: 40 × 3 (1,614,436 at 0.4) now FITS at 0.4; the whole
  bloom (1,802,556) fits; the declared refusal (40 sepals × 4 tiers × whorled
  leaves) now lands on 0.48 mm and EXPORTS (1,964,656).
- **the depth-2 umbel's floret clamp** (the mophead): more florets fit.
- **the tip-row ramp's budget hold** (`petalTipShape` above 2.30).

So a saved PEBBLE / CELLULAR design that was over 1.5 M builds differently
now (finer). Every design under 1.5 M — every one the matrix holds but the
redefined block-79 rows — is byte-identical, and the byte partition proves
it (§7). I applied the single cap (the brief's first sentence is the ruling it
names; the second is about the retired patterns' LAW, which is untouched) and
**ask** (question 1) whether the old patterns should keep their own 1.5 M.

**Block 79 is redefined** so its rows still exercise the three arms at 2.0 M,
each measured in Node, EXPORT:

| row | at 0.4 mm | lands on |
|---|---|---|
| PEBBLE 40 × 3 on a 50 mm petal | 2,036,036 | 0.41 mm, 1,970,596 |
| the whole bloom 40 × 3 + **40** sepals + leaf | 2,104,092 | 0.42 mm, 1,899,024 |
| 40 × 3 on 60 × 24 mm petals | 3,006,104 | 0.50, 2,224,952 — REFUSED (`EXPORT_REFUSED_XFAIL`) |

## 3b. Two folds the prototype's mesher made, and what clears them

The census was run on the FULL export of every BONE row before anything was
declared. On the prototype's mesher as ported, three classes folded where the
COARSE build of the same state reads 0:

| class | pairs, worst span | mechanism |
|---|---|---|
| every row with a 60 mm stem | 12, 0.107 mm | a ring point 2.2 µm from a lattice-edge crossing (just over the 1 µm snap) left a SLIVER; the relief flipped it |
| the default bloom | 2, span 0 | the same sliver class on a petal (tangencies) |
| the rods and the bead at `boneCurvature` max | 163, 0.220 mm | refined triangles on strongly curved parts flipped |

**The mechanism is one**: the full points lie on each lattice triangle's
PLANE, but are displaced along the organ's own interpolated NORMALS, which tilt
off that plane on a curved organ (a 6 mm stem, a 1.2 mm rod, a 0.45 mm bead);
the relief at a pore's lip changes by up to H × the profile's slope over a few
microns, and the tilt turns that into a lateral shift that flips a sliver or a
small triangle. On a relief that is a height field over the triangle's plane no
emitted triangle can face against that plane — so one that does is a fold.

**Two changes, both derived:**

1. `BONE2_HY_SNAP_MM` 1e-3 → **3e-3 mm**: 40 % of the closest two rings ever
   come (0.0075 mm at the smallest pore), the seam clearance's own fraction, so
   no ring merges into another. It alone takes the stem rows 12 → 0.
2. **The fold check** in `bone2BuildFull`'s withdrawal loop: any emitted
   triangle whose displaced normal faces against its source lattice
   triangle's face normal sends that lattice triangle back to COARSE (a
   transition fan's flip, the refined triangles round it), and the run is
   re-meshed — the loop the cross-part coincidence withdrawal already ran.
   Measured, full export: the curvature-max stamens 163 → **0** (11,154 lattice
   triangles withdrawn, 4 flips left that the census does not see as a
   contact), the default 2 → **0** (1,009 withdrawn), the 60 mm stem → **0**.
   **TXB16** holds it (the full build's census at most the coarse build's) and
   `the-fold-check-is-removed` is its mutant, witnessed on `full-rods` (15
   pairs at 0.025 mm without the check at a 500 k cap).

The cost is time (a withdrawal re-meshes that organ's run) and a little
share; §8 has the figures.

## 4. "Where it shows": the measure, ranked, rendered

The brief asks the measure to be proposed, rendered and ranked. **The measure
is EXPOSURE**: for each CELL (one organ's porous triangles whose centroids
share a cube of 2 × the largest pore — 3 mm at the defaults), the share of a
hemisphere of viewing directions above the bloom (32 directions on a Fibonacci
spiral about +z, each weighted by cos to the cell's own face normal) along
which a ray from the cell escapes every part of the bloom — T5's own escape
test on the UNRELIEVED stream. A face looking up and out reads high; a face
under a petal, between the feet, or facing the stem reads low; nothing names
an organ (TXB14 restates it from each cell's own sample, and the
typed-organ-list mutant must fire).

Why this and not the alternatives I considered:

- **plain visibility (escape in any direction)** — the underside of an
  outer petal escapes downward and would rank as high as its top; the bloom is
  looked at from above and the side, which is what the +z hemisphere says;
- **area × curvature** — would buy detail where the field is most deformed,
  not where it is seen;
- **a fixed camera** — would rank one view; a print is turned in the hand.

The cells are ranked by exposure (ties by key, engine-agreed) and bought
highest first at their exact marginal price (the hybrid's own per-lattice-
triangle count, the transition fans included), then built; up to four passes
give back what a build's count overran. The heat-map is cell A of the sheet.

**Ranking by organ** (EXPORT, Node, the full build's own cell list; mean
exposure is area-weighted over the organ's porous cells, the full share is the
fraction of that area the cap bought full detail for):

| state | organ | cells | porous area | mean exposure | full share |
|---|---|---|---|---|---|
| the default | hub (top, not under a foot) | 31 | 147 mm² | 0.243 | 52.4 % |
| the default | petals | 721 | 4,277 mm² | 0.224 | 88.5 % |
| the whole bloom | petals | 721 | 4,277 mm² | 0.210 | 46.2 % |
| the whole bloom | stem | 86 | 819 mm² | 0.185 | 59.4 % |
| the whole bloom | petiole | 25 | 67 mm² | 0.177 | 48.8 % |
| the whole bloom | leaf | 457 | 2,120 mm² | 0.150 | 43.6 % |
| the whole bloom | hub | 31 | 116 mm² | 0.121 | 29.7 % |
| the whole bloom | sepals | 218 | 773 mm² | **0.041** | **3.6 %** |

The ranking is what the measure says, not a list: the sepals, under the petals
and facing down, come last and get almost nothing; the stem, seen from the
side, outranks the leaf, whose underside faces away. The default's hub ranks
first by MEAN and is half full because its cells are few and mixed — the open
ring between the feet reads high, the ring right under the petal roots low. The
cells are bought one by one by their OWN exposure, so an organ's mean is a
summary, never the decision.

## 5. The page

- `#boneFullDetail` ("Full detail") sits beside Get grid, shown only under BONE.
  A click builds FULL once; any control change returns to COARSE.
- The BONE read-out: `TEXTURE BONE v2: FULL DETAIL — N tris, x% of the cap
  (provisional); full pores on y% of the porous area (k of m cells, ranked by
  exposure …), the rest COARSE …` or `COARSE PREVIEW — …`.
- The STL export is FULL (the export builds `boneDetail: 'full'`).

## 6. Engine agreement

Round 2 measured Node and Chromium disagreeing on the full build's count (84
triangles on the default, 6,214 on the umbel) through `Math.cos` / `Math.sin`.
The shipped field and mesher use arithmetic-only `esincos`, `ecbrt`, `elog`,
`eexp`, `epow`, `elen` (TXB15 refuses `Math.cos(`, `Math.sin(` … in the BONE v2
block), and every input the mesher and the ranking decide on is snapped to
2⁻²⁰ mm (`BONE2_QUANT`), so a decision never sits on a last bit.
`node tools/bloom-texture-bone-v2-browser.mjs` builds each state in both engines
and compares the count and an FNV hash of every float32: §8.

## 7. Gates

- **TXB0–TXB7** (v1's) re-pointed at v2: the ranges, the help text, the detail
  on the record, the restated field (`bone2FieldRestated` in the harness,
  `Math.*` on purpose — a different owner from the engine-agreed geometry).
- **TXB8–TXB15** (`boneFullClauses`, run on two FULL rows by
  `tools/verify-bloom-bone.mjs`, spawned by the defaults bar in the export
  preflight; TXB13 also on every BONE row's exported FILE in both STL gates):
  - TXB8 refinement only inside the patches (restated from the masks);
  - TXB9 the hybrid structure — rings at their pores, crease rows on the
    restated crease, junction patches at triple junctions;
  - TXB10 the full / coarse boundary fanned: 0 unmatched or doubled directed
    edges in the file;
  - TXB11 no position carried by two parts;
  - TXB12 coarse and full share every pore centre (every disc a pore of the
    restated field);
  - TXB13 under the cap, the cells ranked by exposure, the count predicted
    conservatively, the base equal to the coarse build;
  - TXB14 exposure restated from each cell's own sample;
  - TXB15 the construction engine-agreed.
- **Seven new mutants**, each witnessed on the mutated module (the cap
  ignored, exposure from a typed organ list, the boundary not fanned,
  refinement leaking out of the patches, the junction patch covering the
  pores, a disc moved off its pore, `Math.cos` / `Math.sin` restored). All
  thirteen BONE mutants fire their named clause; the clean tree is silent on
  every row including both FULL rows.
- **Matrix**: block 82's rows take v2's ranges (four redefined, two GATED rows'
  extremes); block 79 redefined (§3). No row added. `frozen/phase93` = the 1,653
  rows at `986fd96`, deep-equal (`--verify-frozen`).
- **Byte partition** (`verify-bloom-surface-bytes --movers-predicate bone-v2`,
  predeclared from the BASE tree's own records, both modes, the whole 1,653-row
  matrix against a worktree of `986fd96`, 28 chunks merged): **PASS — 20 of 20
  predeclared movers moved, 0 floats moved on the 1,633 holders**, over
  2,360,454,516 export floats (262 M triangles) and 83,179,338 captured-grid
  values. The movers are the 18 BONE rows that build BONE and the two
  redefined block-79 rows that coarsen; the refused block-79 row stands at
  0.5 mm on both trees and holds. **Every PEBBLE / CELLULAR row, every umbel
  and mophead row (the depth-2 clamp included) and the shipping default hold to
  the bit** — so in the matrix the cap moved nothing but block 79; question 1
  is about saved designs over 1.5 M, which the matrix does not hold.

## 8. Measurements

From `docs/data/bloom-texture-bone-v2-shipped.json`
(`node tools/bloom-texture-bone-v2-measure.mjs`) and
`docs/data/bloom-texture-bone-v2-browser.json`
(`node tools/bloom-texture-bone-v2-browser.mjs`). EXPORT, Node 22, this box
(4 cores, shared with the byte partition while measured: the times are upper
bounds, not CI's).

### 8a. Budget: triangles / MB of binary STL / % of the 2.0 M cap

| state | COARSE | FULL | full-detail share of the porous area | cells full / all | full build |
|---|---|---|---|---|---|
| the default | 158,912 · 7.9 MB · 7.9 % | **1,978,546 · 98.9 MB · 98.9 %** | **87.3 %** | 664 / 752 | 114 s |
| the whole bloom (stem, leaf, 5 sepals, 12 stamens, style) | 289,008 · 14.5 MB · 14.5 % | 1,958,496 · 97.9 MB · 97.9 % | 51.2 % | 681 / 1,279 | 178 s |
| the umbel, head ON | 530,634 · 26.5 MB · 26.5 % | 1,983,462 · 99.2 MB · 99.2 % | 26.1 % | 612 / 2,332 | 157 s |
| the mophead (depth 2's defaults) | 1,762,254 · 88.1 MB · 88.1 % | 1,994,016 · 99.7 MB · 99.7 % | **1.7 %** | 138 / 7,991 | 190 s |
| 40 × 3 whorls | 1,614,436 · 80.7 MB · 80.7 % | 1,992,750 · 99.6 MB · 99.6 % | 2.2 % | 174 / 7,182 | 150 s |

Every FULL build: 0 open and 0 doubled directed edges, 0 degenerate
triangles on the float32s, the coarse build's shell count. The default's
all-full count is 2,257,476 — over the cap, so the allocator binds even on the
plain bloom. The mophead and 40 × 3 spend almost the whole cap on their COARSE
lattice (88 % / 81 %), so the allocator can buy little: the read-out says so.


### 8b. Engines, time and heap (Node 22 / the page's own module in Chromium)

| state | detail | triangles | AGREE (count + float32 hash) | Node | Chromium | Chromium heap at the end |
|---|---|---|---|---|---|---|
| default | coarse | 158,912 | yes `f11217d4` | 3.1 s | 2.1 s | 0.08 GB |
| default | full | 1,978,546 | yes `146ed032` | 131 s | 90 s | 0.90 GB |
| umbel | coarse | 530,634 | yes `bd2d4f52` | 11 s | 8 s | 0.27 GB |
| umbel | full | 1,983,462 | yes `4a8fe00d` | 179 s | 152 s | 2.01 GB |
| mophead | coarse | 1,762,254 | yes `1119c8a8` | 95 s | 81 s | 0.87 GB |
| mophead | full | 1,994,016 | yes `13598152` | 188 s | 134 s | 1.75 GB |

**Round 2's mophead crash is gone** (it ran out of memory generating 11.7 M
triangles; the allocator now stops at the cap). The heap is what the page holds
at the END of the build, with the result referenced — the build is synchronous,
so nothing can sample it during; it is a floor on the peak, not the peak. The
full build's TIME is the cost of the fold check's re-mesh passes and the
exposure rays, on a box shared with the byte partition: an upper bound, and
question §21 C (an optimisation session) stands.

### 8c. Walls between adjacent pores (the shipped field, mid-height)

| state | adjacent pairs | merged at mid-height | walls: thinnest / median / p90 / thickest | under 0.7 mm |
|---|---|---|---|---|
| the ruled defaults (0.5 mm, spread 3, density 0.9) | 395 | 222 | 0.006 / 0.278 / 0.583 / 0.884 mm | **166 of 173 (96 %)** |
| smallest pores 1.0 mm | 144 | 83 | 0.008 / 0.588 / 1.281 / 1.748 mm | 34 of 61 (56 %) |
| spread 1.5 | 1,643 | 1,094 | 0.002 / 0.136 / 0.302 / 0.442 mm | 549 of 549 (100 %) |
| density 0.2 | 16 | 4 | 0.162 / 0.352 / 0.424 / 0.526 mm | 12 of 12 (100 %) |

Almost every wall the merging field leaves is under 0.7 mm at the ruled
defaults — a wall is what is left between two pores that nearly merge, so it is
thin by construction. Question 2 proposes a rule; none is built.

### 8d. Print: the FULL default at the two ends of the height range

`--section print`, EXPORT, the default bloom, FULL detail under the 2.0 M cap.
"Closed gaps" compares each sampled vertex's nearest OTHER part before and
after the relief, on the SAME mesh (the `boneNoRelief` lever writes the stream
undisplaced with every decision taken on the relieved build), every 20th
triangle.

| height | triangles | shells | open / doubled / degenerate | within-shell pairs (folds) | cross-shell pairs | sampled vertices | printable gaps newly closed | newly touching |
|---|---|---|---|---|---|---|---|---|
| 0.4 mm | 1,978,546 | 9 | 0 / 0 / 0 | **0** | 17,010 | 20,770 | 1 | 0 |
| 2.5 mm | 1,986,076 | 9 | 0 / 0 / 0 | **0** | 17,012 | 64,102 | 0 | 0 |

The full build folds nothing at either end (the fold check, §3b); the
cross-shell pairs are the petals' and the hub's by-design overlaps, the export
contract's own. The two counts differ because the allocator decides per height
(a taller relief costs the same lattice but moves which cells fold back to
coarse). **The gap sweep is a SAMPLE** — every 20th triangle; the first run at
every 3rd did not finish in 30 minutes — so "1 newly closed at 0.4 mm" is a
sampled count, not the bloom's. Round 2's prototype found one sampled gap
closing at 2.5 mm; on the shipped build it is the other way round, and both
are single samples. The 2.5 mm relief remains **UNVALIDATED for powder
removal** (the help text says so).

### 8e. Roundness: full against coarse

On round 2's own plate (`tools/bloom-texture-bone2-plate.mjs`, an 8 x 8 mm
window, H 1.0, the merging field; each pore's drawn mid-wall against its true
circle over the outline it owns), with a `shipped` method that runs
`bloom-geometry.js`'s own `bone2HybridOrganMesh` — the 3 um snap included —
beside the prototype it was ported from:

| domain | mesh | triangles / mm² | FREE pores: median off round | MERGED pores: median / p90 / max |
|---|---|---|---|---|
| flat plate | lattice (= COARSE) | 13 | 28.8 % (n 1) | 17.7 / 24.6 / 24.6 % (n 9) |
| flat plate | prototype hybrid | 430 | 2.19 % (n 1) | 1.90 / 1.92 / 2.86 % (n 25) |
| flat plate | **SHIPPED hybrid (FULL)** | 423 | **1.90 %** (n 1) | **1.90 / 1.93 / 2.86 %** (n 25) |
| 6 mm cylinder | lattice (= COARSE) | 13 | 27.1 % (n 2) | 20.1 / 24.4 / 24.4 % (n 9) |
| 6 mm cylinder | prototype hybrid | 398 | 3.76 % (n 2) | 2.13 / 3.23 / 3.99 % (n 29) |
| 6 mm cylinder | **SHIPPED hybrid (FULL)** | 393 | **3.76 %** (n 2) | **2.13 / 3.23 / 3.99 %** (n 29) |

The port matches the prototype everywhere it was measured; the coarser snap
costs 7 triangles a mm² on the plate and moves no merged-pore figure. The COARSE
build draws a pore 18–29 % off round, which is what the allocator spends the
cap to replace where it shows.

**The per-bloom instrument (`--section round`) measured NOTHING and is not
quoted:** on the default's FULL build it counted 0 of 220 isolated refined
pores on both meshes. Every level crossing it found lay 6–11 pore radii from
the disc it was measuring — the neighbours' walls — because the merging field
leaves almost no pore isolated at mid-height, and the isolation test (centre
distance against 1.15 × the two radii) does not see the field's lips. It is
left in the tool, marked broken, rather than tuned until it reports a number.

## 9. The PreForm ladder

`node tools/bloom-preform-ladder.mjs <dir> --design default|umbel --caps …`
builds ONE design at a ladder of caps — only the cap varies (the allocator's
`boneFullCapTris` lever, nothing else) — and writes binary STLs named with their
triangle count and size. **They are committed nowhere** (the brief). Each rung's
census on the written float32s is printed beside it.

| design | cap asked | file | triangles | MB | full share | shells / open / degenerate |
|---|---|---|---|---|---|---|
| default | 1.5 M | `bloom-bone-v2-default-1484338tris-74.2MB.stl` | 1,484,338 | 74.2 | 62.8 % | 9 / 0 / 0 |
| default | 2.0 M | `bloom-bone-v2-default-1978546tris-98.9MB.stl` | 1,978,546 | 98.9 | 87.3 % | 9 / 0 / 0 |
| default | 3.0 M (its ceiling) | `bloom-bone-v2-default-2232724tris-111.6MB.stl` | 2,232,724 | 111.6 | 100 % | 9 / 0 / 0 |

| umbel, head ON, 60 mm stem | 3.0 M | `bloom-bone-v2-umbel-2968138tris-148.4MB.stl` | 2,968,138 | 148.4 | 43.5 % | 53 / 0 / 0 |
| umbel, head ON, 60 mm stem | 4.5 M | `bloom-bone-v2-umbel-4449542tris-222.5MB.stl` | 4,449,542 | 222.5 | 70.5 % | 53 / 0 / 0 |
| umbel, head ON, 60 mm stem | 6.0 M | `bloom-bone-v2-umbel-5931524tris-296.6MB.stl` | 5,931,524 | 296.6 | — (see below) | 53 / 0 / 0 |

Every rung: 0 doubled directed edges as well. **The default bloom cannot reach
3.0 / 4.5 / 6.0 M by the cap**: with every porous cell full it is 2.23 M (the
fold check gives back a little of the 2.26 M all-full count). The upper rungs
therefore come from the umbel (head ON, 60 mm stem) — a second design, and
question 3. The 6.0 M rung's census first threw (a JS `Map` holds ~16.7 M
entries and that file has 17.8 M directed edges); the census is on sorted typed
arrays now and `--census <file.stl>` re-reads a written file, which is how its
row was taken — so its full share was not recorded (the cap binds there: the
umbel's all-full count is ~6.2 M). Build times on this box: 3.8 / 5.4 / ~8 min.

**Where they are:** the six STLs were handed to Eva as session attachments
(the session's own file delivery), not committed and not on the deploy
preview. A release asset needs a tool this session does not have, and the
deploy preview serves only what is committed, so `/tmp-preform/` would have
meant committing 852 MB — which the brief forbids. To regenerate any rung:
`node tools/bloom-preform-ladder.mjs <dir> --design default|umbel --caps <n>`.

## 10. Questions for Eva

**1. THE CAP AND THE RETIRED PATTERNS (the contradiction, §3).** One named
cap moves every reader of the old budget, so PEBBLE / CELLULAR designs that
were over 1.5 M build at a finer lattice edge now (and the umbel's depth-2
clamp and the tip-row ramp move with it); everything under 1.5 M is
byte-identical. Options:
- (a) keep ONE cap for everything (what this PR does);
- (b) BONE reads `EXPORT_TRI_CAP` 2.0 M and every older reader keeps a
  `LEGACY_TRI_BUDGET` 1.5 M — two numbers, both named, and the retired patterns
  hold to the bit everywhere;
- (c) keep one cap and accept the old patterns' over-budget designs moving,
  but restore block 79's old states as rows too (they then read as fitting).

**2. A MINIMUM WALL (§11.6 / question F, re-asked with numbers, §8).** Walls
between merging pores on the shipped field: see §8's wall table and the count
under 0.7 mm. Proposed, NOT built: a rule on the field — two pores whose
mid-height wall would be under a minimum *w* either MERGE (the wall is dropped:
one wider pore) or the smaller is NOT ADMITTED. Options: (a) merge below *w*;
(b) drop the smaller below *w*; (c) no rule (thin walls are a look, and SLS
resolves ~0.35–0.4 mm). If (a) or (b), what *w* — 0.7 mm, or the 1.0 mm
`MIN_FEATURE_MM`?

**3. THE LADDER'S UPPER RUNGS (§9).** The default bloom's full build saturates
at its all-full count (~2.3 M), so 3.0 / 4.5 / 6.0 M cannot be reached by the
cap alone on that design. I used the umbel (head ON, 60 mm stem) for the upper
rungs, the cap still the only thing varied on it. Options: (a) fine; (b) a
different design for the upper rungs (name it); (c) only the default's rungs.

**4. WHERE THE LADDER LIVES (§9).** Neither offered route works without
breaking a rule: GitHub release assets need an upload API this session does not
have (and `gh` is search-only here), and a Netlify deploy-preview page needs the
STLs committed to the branch, which the brief forbids. What I did: §9.

**5. THE FOLD CHECK (§3b).** It sends a lattice triangle back to coarse where
the full mesh would fold, which lowers the full-detail share on strongly curved
parts (the rods and beads at `boneCurvature` max: 11,154 triangles back to
coarse). Options: (a) accept; (b) a later session lays the full points on the
organ's own curved surface (a chart per organ — round 2's question D) so the
check rarely binds.

**6. "WHERE IT SHOWS" (§4).** Exposure over the +z hemisphere, cos-weighted,
escape rays. Options: (a) accept; (b) the whole sphere (the bloom turned in the
hand); (c) a named viewing direction (front, top).

**§21 of round 2, carried forward:**
- **A the cap** — answered by the Nov 2 ruling (2.0 M provisional, the ladder
  decides); question 1 is what it moved.
- **B the coarse look** — RULED (coarse where it does not show). Nothing open.
- **C the full build's time** — measured in §8; open: (a) accept, (b) an
  optimisation session (the re-mesh after a withdrawal re-meshes the organ's
  whole run; a worker).
- **D the closure's cost** — unchanged (lattice-edge crossings); tied to 5(b).
- **E nested pits** — open, unchanged (§11.5's options).
- **F a printable wall** — question 2.
- **G the controls** — the provisional ranges shipped (smallest pore 0.5–1.0,
  default 0.5; spread 1.5–3, default 3; density default 0.9; height 0.4–2.5,
  default 0.4). Confirm or name others.
- **H the fade at height** — open, unchanged (§11.9's options).
- **I the engines** — ANSWERED: arithmetic-only construction, counts and bytes
  agree (§6, §8).

## 11. What is NOT done, named

- **The final cap.** 2.0 M is provisional until the ladder is printed through
  PreForm (§9).
- **The full build's time** is not optimised: a fold-check withdrawal re-meshes
  the whole run of that organ; 90–150 s in Chromium for the states measured.
  The page builds FULL only on the button and the export.
- **A minimum wall** (question 2) is proposed, not built.
- **The full points stay on the lattice planes** (no chart per organ); the fold
  check is what makes that safe, at the cost of the full share on strongly
  curved parts (question 5).
- **Nested pits and the fade at height** are unchanged (§21 E, H).
- **The heap figures are a floor** on the peak (§8b).
- **The prototype modules** (`bloom-texture-bone2*.js`, the round-1/2 tools)
  stay as the reference and are not imported by anything shipped.
