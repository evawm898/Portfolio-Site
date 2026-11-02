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

**Ranking by organ (default, mean exposure of its cells):** see §8.

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
  predeclared from the BASE tree's own records, both modes, the whole matrix):
  §8.

## 8. Measurements

(filled from `docs/data/bloom-texture-bone-v2-shipped.json` and
`docs/data/bloom-texture-bone-v2-browser.json`)

## 9. The PreForm ladder

## 10. Questions for Eva

## 11. What is NOT done, named
