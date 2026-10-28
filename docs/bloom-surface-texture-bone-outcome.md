# Bloom surface texture: BONE ships, with the T5 follow-up rulings (Oct 28)

**Status: SHIPPED, OFF.** Texture is a CHOICE that ships `NONE`, so the shipping default (24,688 triangles) does
not move a float. **Every look default is PROVISIONAL**: pore size, density, band ratio, patch coverage and the
curvature threshold are the values the field was tuned to on renders. Nothing has been printed.

This session built:
- the BONE field (Eva's rulings of Oct 23);
- the four T5 follow-up rulings of Oct 26;
- one byte partition for all of it.

**There was no prototype to port.** The brief's STEP 0 found nothing on `main`, in any open PR (#459, #230, #111)
or on any of the 27 remote branches. The field is built from the brief's spec. The reference photographs (a bird
skull, a small green ceramic figure) were attached to the brief and are **not in the repository**. The sheet
carries two labelled placeholder panels to hold them beside (question 5).

Read `bloom-geometry.js`'s BONE block (after `organT5For`) before touching any of this.

## 1. The dropdown: NONE / BONE, and PEBBLE and CELLULAR kept hidden

`TEXTURE_TYPES` is `['NONE', 'BONE', 'PEBBLE', 'CELLULAR']`. `TEXTURE_TYPES_SHOWN` is NONE and BONE, and
`TEXTURE_TYPES_HIDDEN` holds the two retired ones. The registry marks both options `hidden: true`, and the page
leaves a hidden option out of the menu unless it is the value a loaded design carries.

- **A saved design keeps its pattern and builds exactly as before.** PEBBLE and CELLULAR take T3/T5's code path
  by branch. Measured byte-identical to `a2b968c` on four states in both modes, and across the whole matrix by
  the partition (§8).
- **The T5 follow-up rulings apply under BONE only** (question 3). Under PEBBLE and CELLULAR the hub is covered
  by petal feet alone, floret petals stay in their own frame, and the first-emitter owner rule stands. Applying
  them there would move bytes on rows that load the retired patterns, which is exactly what "build exactly as
  before" forbids.
- **How many shipped rows use them:** 34 rows of the live matrix, and 125 frozen rows over 5 phases. Their
  long-term loading is question 8.

## 2. The field

One world-space field, sampled at every vertex of every part in ONE deferred pass (`boneReliefPass`) after the
whole bloom is emitted. The outward displacement along the part's own normal is

`s = w0 · mc · mp · H · f`

- **f, the network.** Two pore bands on jittered grids, each pore a sphere in world space:
  - The FINE band has the asked diameter D, and the CRATERS have `ratio × D`. Craters fill `BONE_LARGE_OCC`
    (0.45) of the asked density.
  - A pore's radius is `D/2 × [1, 1 + 0.35]`, so a pore is never smaller than asked.
  - The bands are unioned by a smooth minimum (radius 0.6 of the rim width), which is what MERGES neighbouring
    pores.
  - A rim of `0.8 ×` the fine radius rounds each lip.
  - **f is exactly 0 on a pore floor**, so the floor sits on the original sheet: outward only, never below.
- **mp, the patch mask.** Low-frequency gradient noise at a scale of 4 craters, thresholded at the
  `coverage` quantile. The quantile is measured once, over 4,096 samples (`BONE_PATCH_QUANTILES`), so 0.6 means
  60% of the surface. It is a soft band, not a cliff.
- **mc, the curvature mask.** A vertex is a RIDGE where its convex normal curvature is at least `boneCurvature`
  (1/mm by default), measured on the emitted mesh against its one-ring neighbours. The mask is faded
  geodesically over `λ = max(H × 15/8, e)`, the fade T5's rulings derived.
- **w0, the weight.**
  - On a sheet it is T3's own ramp `g`, handed to the pass by `emitPanel` and `rimProfile`.
  - On an organ (the hub, stem, tube ring, rods, carried floret organs) it is T5's escape-ray visibility, times
    not-covered, times the same geodesic fade.

**Both masks are derived; there is no per-organ list.** Curvature is read off the emitted mesh, and the patch
mask is a function of world position.

**Edges: curvature decides, with no bead mask.** The bead (0.45 mm radius) and the 0.40 mm nib curve far past
1/mm, so the mask holds both smooth by its own measure (§5).

## 3. The T5 follow-up rulings (Oct 26)

1. **The hub is smooth wherever a foot covers it, top AND underside.** The cover is the list of the emitted
   PETAL and SEPAL triangle ranges (`textureVertexCoveredAny`). The test is T5's own segment test, along each
   vertex's facet normal, so a down-facing hub vertex under a foot is covered exactly as an up-facing one is.
   On the stemmed default, 2,057 hub vertices are covered, 992 of them facing down.
2. **Sepal feet count.** With 8 sepals at the join's top, the sepal range covers 234 more hub vertices than the
   petals alone.
   - **Found: at the SHIPPED `sepalHeight` 0.75 on a 6 mm stem, the sepal feet cover no hub vertex at all.**
     They stand on the join below the plate, so there is nothing for them to cover.
   - Block 82 carries both rows, and TX12's sepal arm is witnessed on the join-top one.
3. **Floret petals take the one world layer.** A floret build defers its sheets, its organs and its own floret
   organs to the parent pass, which relieves them after the inflorescence append has carried them through each
   placement's M. **Two florets of one unit now differ**: their petals sample different world positions.
   - **No state newly coarsens or refuses**, because the relief moves vertices and never a count. BONE adds
     triangles only through the rods and the pedicels that take the field (§6).
4. **A derived owner for shared positions.** A position several copies share is keyed on the STL's own
   float32s, because what the census and a slicer see is the float32 file.
   - **The value:** copies are relieved only if every copy would be relieved and their normals agree
     (`dot ≥ 1 − 1e-9`). They then take the minimum of the copies' displacements; otherwise every copy takes 0.
     The answer is a function of the SET of copies, so emitter order cannot move it.
   - **The clearance:** where the copies belong to DIFFERENT closed organs, the organs are put in a canonical
     order (name, vertex count, first vertex — never the emission order). The k-th organ's copies then move k
     steps of `2⁻²⁰ ×` the position's own magnitude further out: eight float32 steps, X0's 8 and the foot
     clearance's. This keeps the two organs apart in the file.
     - It is skipped where an organ leaves the edge through the position OPEN (one face), because that is one
       surface split across two records, and parting it would crack the shell. No shipped organ does; the
       gate's two-sheet fixture does.
     - **Why it exists, measured on the closed tube:** T5's refinement lands 5 positions on both the hub's top
       and the tube ring's foot row (two of them equal only in float32). Outside a patch BONE gives both copies 0,
       so the file welds the two shells (8 → 7) and the census reads their by-design overlap as 10,208
       within-shell pairs, every one hub × tube.
     - The same weld was behind the stamens' 77 pairs at the curvature maximum and the braid's O2
       disagreement. With the clearance all three read 0 pairs, 8 / 37 / 25 shells, and watertight.
     - T5's first-emitter rule hid this only because PEBBLE relieves every vertex.
   - Choosing between this rule and T5's first-emitter rule is question 4.

## 4. Resolution: the smallest pore that reads, and the floor

A pore is drawn by the lattice's own vertices.

- **Pit-exists criterion:** a pit EXISTS once a lattice vertex lands inside its floor, `D ≥ √½ · e / (½ − 0.8/4)`.
  That gives **0.94 mm at a 0.4 mm edge and 1.18 mm at 0.5**.
- **Reads-round criterion:** a pore READS ROUND once its rim spans at least two lattice edges, `D ≥ 4e / 0.8`.
  That gives **2.0 mm at 0.4 and 2.5 mm at 0.5**.

Rendered at the 0.4 mm edge:
- the prototype spec's 1.6 mm pore draws faceted;
- 2.0 mm reads round;
- 2.4 mm is clean.

**Proposed floor, UNVALIDATED: 2.0 mm**, the reads-round figure at 0.4. It is `BONE_PORE_FLOOR_MM`, derived
from `TEXTURE_EDGE_MM` and rounded up onto the slider's 0.05 step. It is the pore-size slider's minimum, and so
the default (question 9).

**Where the edge cap coarsens a build to 0.5 mm, a 2.0 mm pore no longer reads round.** The read-out says so on
that build, beside the edge words; it does not refuse.

## 5. The bead and the 0.40 mm nib

Measured on the default petal in EXPORT (the sheet's cell 3): **0 of the 1,776 lattice corners within 1.2 mm of
the apex are raised, the most by 0.0000 mm.** The bead's half-round and the nib's arc curve past the 1/mm threshold
over their whole width, and the geodesic fade (0.75 mm) carries the smooth band onto the flank. **Both clear by
curvature alone, so no bead mask was added.**

The curvature mask holds 11,000 of the default petal's 75,816 vertices smooth as ridges, mostly the rim beads.
The patch mask holds 23,411 more outside every patch. 7,051 vertices sit exactly on a pore floor, and 33,874 are
raised, up to the full 0.400 mm.

## 6. Rods (Q12)

Rods take the field under the same mask, with no rod list. Each rod is captured as a group:
- if every one of its vertices is a ridge, it stays smooth and is told on the read-out;
- otherwise it is latticed through T5's `organLatticeInto`, with its builder's own radial normals.

When the sheet floor binds, the decision is made on the export twin's copy, so live and export carry the same
count.

At the default curvature threshold (1/mm), EXPORT:

| part | radius | at the default | tightest curvature |
|---|---|---|---|
| stamens (filament + anther) | 0.6 mm rod, 0.96 mm anther | **SMOOTH**, all 12 | 1.04/mm |
| style | 0.6 mm | **SMOOTH** | 1.04/mm |
| braid strands | 0.6 mm | **SMOOTH**, all 6 | 1.04/mm |
| compound leaflet stalks | 0.6 mm | **SMOOTH**, all 12 | 1.67/mm |
| compound petiole + rachis | 2.68 → 1.2 mm | porous: 1,414 of 6,996 raised; 420 → 13,980 tris | 0.75/mm |
| simple petiole (60 mm leaf at 70°) | 1.2 mm | latticed, 1 of 598 raised; 44 → 1,192 tris | 0.95/mm |
| pedicels (floret stems, umbel) | ≥ 1.5 mm | porous: 8,836 of 18,276 raised | — |
| the umbel's boss | — | smooth; it is not an organ | — |

- **So at the default, the 1.2 mm rods, the braid and the leaflet stalks are SMOOTH**, held by the mask at its
  own threshold. The simple petiole is latticed and takes almost nothing.
- **At `boneCurvature` 4 (the maximum) the rods are relieved:** **5,554 stamen vertices raised, 166,592 → 185,904 tris** on 12 stamens and the style; the braid (6 strands)
raises 3,810, at 186,684 tris.
- Whether the rods should take the field at the default is question 6.

## 7. Gates

**TXB0–TXB7 in both STL gates** (`textureAssertions` under BONE; TX2/TX5 stand down, TX8 reads `latticeSamples`):
- **TXB0** — the controls against the record. The field and the patch arithmetic are restated in the harness;
  the constants are imported, as declarations.
- **TXB1** — outward only. Every sampled pore floor's displacement is exactly 0, never negative, and every
  cleared shared position moved a whole number of the derived steps outward (restated).
- **TXB2** — the network and the patch, restated at every sampled vertex.
- **TXB3** — the curvature mask: a ridge takes 0, and the sample is not vacuous.
- **TXB5** — the pore floor, restated from the edge.
- **TXB6** — the derived owner, re-run with two emitters swapped on the Node rebuild (rows under 600k tris).
- **TXB7** — the read-out's words.

**The other T5 families under BONE:**
- TX12 gains its sepal arm and the underside count.
- TX14 holds the floret world frame: two copies of one unit differ, and the withheld rebuild is the control.
- TX11's clear-face clause stands down under BONE, because a covered face is no longer the T5 rule's.

**`node tools/verify-bloom-bone.mjs`**: six mutants of the geometry, each witnessed on the MUTATED module and
judged by the clean harness (the root-taper shape). It is spawned by `verify-bloom-defaults-bar.mjs` in both of
its arms, so it rides in CI with no workflow edit.

| mutant | witness | fires |
|---|---|---|
| `pores-sunk-below-the-sheet` | a pore-floor sample with s < 0 | TXB1 |
| `a-typed-mask-list` | stamens relieved at the default | TXB3 |
| `a-covered-underside-is-textured` | a down-facing covered vertex raised | TX12 |
| `a-sepal-foot-is-ignored` | covered count falls by the sepal share (234) | TX12 |
| `floret-petals-in-their-own-frame` | two floret copies identical | TX14 |
| `emitter-order-moves-texture` | the fixture's reversed order differs (first-wins) | TXB6 |

- The last uses a FIXTURE: two 11 × 11 sheets sharing an edge, relieved in both orders. No real row has a
  relieved shared position.
- Its control reorders two real emitters (the style before the stamens) and compares the triangle MULTISET.
- The clean arm passes; `--control` fires all six.

**Panel route (ao)** follows BONE:
- the dropdown offers NONE and BONE and keeps a loaded PEBBLE / CELLULAR;
- the five BONE sliders show only under BONE, and `textureSize` only under the retired two;
- the read-out line is checked.

**Matrix and smoke:**
- **Block 82 is 20 rows** (1,588 → 1,608).
- **Smoke block 82 is 7 rows**, claiming TXB0/1/2/3/5/6/7, TX12, TX7, TX10, TX14, TX6, TX0 and TX2.
- **`frozen/phase89` is the 1,588 rows at `a2b968c`**, registered in both maps.

## 8. The byte partition

`verify-bloom-surface-bytes --movers-predicate bone`, predeclared from the BASE record: a row moves iff it asks
for BONE without infill. Infill refuses the texture, so infill + BONE holds.

**PASS over the whole 1,608-row matrix in both modes, against a worktree of `a2b968c`.**
- **17 of 17 predeclared movers moved:** block 82's 20 rows, less the infill refusal and the two GATED rows,
  which hold as predicted.
- **1,591 holders, 0 floats moved**, positionally under `Object.is`, over 2,274,168,348 export floats and
  82,833,794 captured-grid values. That includes:
  - the shipping default;
  - all 34 rows that load the hidden PEBBLE / CELLULAR, which hold to the bit.
- Run in three chunks and closed by `--merge`. `--control` perturbs one coordinate by 1e-9 and fails both
  clauses (the export stream and the captured grid).
- **The chunks ran on the tree before the clearance (§3.4) landed.** That change runs only inside the BONE pass,
  so it cannot reach a holder, and the 20 BONE rows were re-measured after it by the browser export gate.
- **No frozen row names BONE**, so no frozen tag's bytes stop reproducing.
- `frozen/phase89` is owed because the matrix grew by block 82.

## 9. Cost

EXPORT triangles, the edge the cap used, PEBBLE against BONE:

| state | PEBBLE (retired) | BONE |
|---|---|---|
| the default | 158,912 @ 0.40 | 158,912 @ 0.40 |
| a 60 mm stem | 179,202 @ 0.40 | 179,202 @ 0.40 |
| 8 sepals × stem | 253,938 @ 0.40 | 253,938 @ 0.40 |
| 12 stamens + style | 166,592 @ 0.40 | 166,592 @ 0.40 (rods smooth) |
| compound leaf × stem | 448,026 @ 0.40 | 461,586 @ 0.40 |
| umbel, head ON | 486,498 @ 0.40 | 521,322 @ 0.40 |
| raceme on 120 mm | 398,338 @ 0.40 | 421,554 @ 0.40 |
| 40 × 3 whorls | 1,442,144 @ 0.42 | 1,442,144 @ 0.42 |
| the mophead (depth 2) | 1,295,262 @ 0.40 | **1,445,862 @ 0.40 (96.4% of budget)** |

**No state newly refuses, and none coarsens further than PEBBLE.** The mophead comes closest: it fits at 0.40 with
3.6% to spare, against PEBBLE's 13.6%.

- **BONE adds triangles only through the rods and pedicels that take the field.** The sheets' and organs'
  lattice is T5's, unchanged.
- **BONE builds are slower** (the deferred pass, the curvature and geodesic passes, the shared-position map):
  the default is ~2.0 s against PEBBLE's ~1.4 s in Node on this box.
  - `BONE: x 40 petals x 3 whorls` is 57–59 s a build in Node under load. It carries the edge cap's 120 s settle
    (`TEXTURE_CAP_ROW`), and its cap trials skip the relief and relieve only the picked build.
  - **The mophead (depth 2) is ~90 s a build in Node under BONE, against PEBBLE's ~14 s**: BONE relieves the
    nested floret organs PEBBLE skips (§11), and the pass's string-keyed maps scale with them. No matrix row
    builds a BONE mophead.
  - Question 10.

## 10. Questions for Eva

1. **What "smooth" means on a ridge.** Today it is the original sheet (s = 0), so ridges and pore floors sit at
   one height and the network stands above both. Options: (a) keep it; (b) a raised plateau on ridges, so the
   network reads as sunk into the ridges.
2. **Sheets and the Q7 escape rays.** A sheet takes T3's ramp and no escape ray, as T3 shipped, so a petal face
   under another petal is still textured. Options: (a) keep it (T3's ruling); (b) run the escape ray on sheets
   too (much more cost on big blooms).
3. **The T5 follow-ups apply under BONE only**, so the retired patterns build as before. Options: (a) keep it;
   (b) apply them to PEBBLE and CELLULAR too, which moves bytes on up to 34 live rows and on frozen ones.
4. **The owner rule.** Options: (a) the derived set rule shipped here — relieve only if all copies agree, take the
   min, and part two closed organs' copies by a derived 8-float32-step clearance in a canonical organ order;
   (b) T5's first-emitter rule, which is order-dependent and, under BONE, cannot part two copies that both take 0.
5. **The reference photographs.** They are not in the repository, so the sheet has two placeholder panels.
   Options: (a) commit crops to `docs/img/`; (b) keep holding them beside the sheet.
6. **The rods at the default curvature are smooth** (stamens, style, braid, leaflet stalks). Options: (a) keep
   it (the mask's own answer); (b) lower the default threshold to under 1.04/mm, which relieves them and costs
   triangles; (c) leave the default and let the slider reach them, as it does at 4.
7. **The umbel's boss is smooth**, because it is not an organ. Options: (a) keep it; (b) make it an organ so the
   field reaches it.
8. **The retired patterns' long-term loading.** Options: (a) keep them hidden and building forever; (b) migrate a
   loaded PEBBLE / CELLULAR to BONE, told, which is a byte move on 34 live rows; (c) refuse them, told.
9. **The default pore is 2.0 mm, not the spec's 1.6.** The spec asked for the prototype values as defaults and
   for the pore floor as the slider's minimum, and the derived floor (2.0, reads-round at 0.4) is above 1.6. The
   floor won and the conflict is yours. Options: (a) keep 2.0; (b) define the floor by the pit-exists figure
   (0.94) so 1.6 is reachable and faceted; (c) refine the lattice under BONE.
10. **Cost.** BONE builds are 1.4–2× PEBBLE's in time at the same triangle count, the 40 × 3 corner runs close
    to the browser's 120 s settle on a slow box, and a BONE mophead is ~90 s a build against PEBBLE's ~14 s. Options: (a) accept it; (b) optimise the pass (its hot paths are
    string-keyed maps and GC, profiled) in its own session.

## 11. Found

- **The first browser run of block 82 dropped 7 rows on four defects, every one invisible to Node runs on
  the smoke rows:**
  - the weld above (the tube's X2, the stamens' X2, the braid's O2), fixed by the clearance;
  - coverage R1 not counting a latticed rod's own triangles, fixed in both coverage instruments;
  - and the umbel's by-design floret overlap, which this row now declares by value as every umbel row does.
  The closed tube joined smoke block 82 as the clearance's witness.

- **TXB2 dropped all 17 relieved BONE rows in the browser and passed every Node run.** A vertex with no ridge within
  reach carries `ridgeDistMm: Infinity`, and the page's record reaches the gate through JSON, which writes Infinity
  as `null`; the clause read `null` as a distance of 0 and so called every such vertex a ridge. It now reads
  `null` as "no ridge within reach". No geometry changed — the record was right and the reading was wrong. A
  record field that can be non-finite is a JSON hazard on every gate that reads the page; TX13 already skipped a
  non-finite fade distance for this reason.

- **At the shipped `sepalHeight` 0.75 on a 6 mm stem, the sepal feet cover no hub vertex** (§3.2).
- **The mophead (depth 2) under the retired PEBBLE:** under PEBBLE a sub-umbel's OWN floret organs are never deferred to the top pass (`t5Finish` defers a
pedicel build's organs but not its florets'). So at depth 2 the inner florets' hubs and pedicels and the rays are
never relieved: the PEBBLE mophead's only organ record is the main stem.

BONE carries them. Measured on the mophead in EXPORT: floret stems 59,554 of 190,512 vertices raised, floret hubs
9,588 of 113,700, floret petals 165,126 of 418,800. That costs 150,600 triangles and the build time (§9).

This is pre-existing and is NOT fixed under PEBBLE, because fixing it there would move the retired pattern's bytes.

Sheet: `node tools/shot-bloom-texture-bone.mjs docs/img/bloom-texture-bone-shipped.png [--json <file>]`.
