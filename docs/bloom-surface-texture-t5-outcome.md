# Bloom surface texture — T5: the hub, the stem and the tube ring take the field; the plan closed (Oct 23)

**Status: BUILT, gated, behind the same choice guard (ships OFF). The rods are DEFERRED pending the BONE
sheet (Q12) and nothing about them is built. Ambiguities this build had to settle without a ruling are
listed in §8, each flagged rather than resolved by fiat.**

Base `main` at `b3163de` (#457, the edge cap). Discovery and its rulings:
`docs/bloom-surface-texture-discovery.md` §0, §8, §10–§12 (§10 now marks T4 STRUCK, T5 DONE, T6 FOLDED
in). T3: `docs/bloom-surface-texture-t3-outcome.md`. Sheet: `docs/img/bloom-texture-t5.png`
(`node tools/shot-bloom-texture-t5.mjs <dir> --png docs/img/bloom-texture-t5.png`). Every figure below
comes out of `node tools/bloom-texture-t5.mjs` (Node, EXPORT unless said) unless another tool is named.

## 0. The rulings this build carries

| ruling | where it lands |
|---|---|
| Attachment B — one shared world field sampled inside the emitters | the organs read the SAME `textureFor(state)` field as the sheets: same type, size, λ, height and the one derived edge (`TEXTURE_EDGE_IN_FORCE`); TX2 holds it (the mutant `the-tube-ring-has-its-own-field` fires it) |
| OUTWARD ONLY | `p + n · s`, `s = w · H · f(p) ≥ 0`, along each organ's own outward normal; TX10 reads every sampled normal against the emitted facet it sits on |
| peak-to-valley height, 0.4–1.5 mm | unchanged: the organs take `textureHeight`; nothing new is a control |
| Q7 — VISIBLE surfaces only, derived from the geometry | §2: escape rays from each organ vertex against the whole emitted bloom; TX11 restates it |
| Q12 — rods textured but DEFERRED | filaments, the style, anthers, pedicels, petioles and the rachis take nothing; a floret's own stem IS its pedicel, so a floret build relieves its hub and never its stem (`pedicel: true`). The read-out says so on every textured build |
| T4 STRUCK | texture and infill are exclusive (Q9), so a textured petal has no Voronoi walls; nothing built, nothing owed |
| T6 FOLDED IN | this session's sheet is the sheet on the shipped generator |
| Q15 — the bore unrefined | the stem's bore and the void's caps are tagged CAVITY by the emitter, kept exactly as shipped, never refined, never relieved; §5 |
| texture × infill exclusive, 0.4 mm edge with the derived cap, 1.25× bar, ships OFF | all unchanged and all apply to the organs: the cap's trial builds now include the organs' lattice (§4), TX4/TX10 hold the organs to 1.25× their own conforming floor |

## 1. What shipped

- **No new control.** The hub, the stem and the tube ring take the relief whenever the petals do.
- **The organ lattice** (`organLatticeInto`, `bloom-geometry.js`, THE ORGANS' RELIEF block). The hub, the
  stem and the tube ring have no row law, so each is refined ON ITS OWN SHIPPED LATTICE: every edge into
  `ceil(L / e)` equal segments (L snapped to 2^-20 mm, Q16), a coplanar strip quad cut as one unit (pairs
  across a mutual longest edge, the fourth point within 1e-9 mm of the plane, convex), a closed centre fan
  (≥ 8 spokes within 1.5× of each other — the hub's 48-sector top, a pole) re-meshed as concentric rings
  whose point counts follow each ring's own circumference (an innermost hexagon, never 48 slivers), every
  other triangle by T1's rows, zipped by the emitter's integer rule with its 1e-6 slack. Every new point
  lies ON a shipped facet.
- **THE TUBE RING IS REFINED IN ITS OWN COORDINATES, AND HERE IS HOW.** It has no row law either (§12.8
  item 20). Each ring is emitted as before through `emitTubeRings`, captured, and refined on the triangles
  its own law placed — its own (row, column) lattice, linearly between its own rows and columns. Its normal
  at every vertex is the ring law's OWN normal (`emitPanel`'s skin and `rimProfile`'s bead normals, handed
  over through `acc.normalSink` as they are emitted), never the mesh's. **164 ring vertices on the closed
  6-petal tube get no normal from the law** (the flat end walls the ring's emitter writes without a normal);
  they are left smooth and counted (`normalFallback`) — flagged in §8.
- **Counts are mode-free by construction.** A count is decided on the organ's shipped mesh in EXPORT mode:
  on an export build that is the organ itself; on a live build whose sheet the export floor raises
  (sheet < 1 mm — the hub radius follows the floored sheet), on an untextured export TWIN built for the
  purpose. `tris(live) === tris(export)` on every state measured, sheet 0.6 included.
- **The relief is deferred to the end of the build** (`organReliefPass`): the lattice is cut right after
  each organ is emitted, so every later triangle range is where it was; the displacement is written in
  place once every part exists, positions only.
- **The normal is the organ's own, per face** (`organNormalOf`): hub top/bottom ±z, rim radial, dome and
  sphere from their own centre, the join's profile normal, the stem wall's horizontal radial from its own
  axis at its own depth (the node law's axis on a noded stem), the end faces ±z, the florist's cut plane.
  A crease vertex takes the normalised sum of its faces' normals — one displacement per position, so the
  relief runs over the crease and nothing cracks.
- **Untextured is the shipped tree by branch.** `organT5For` returns null and every expression is the
  shipped one: **the shipping default is 24,688 triangles, unmoved, and its bytes are identical** (§7).

## 2. Visible (Q7) — how it is derived

**Per vertex, from the emitted geometry, never from a typed per-organ list.** A vertex is VISIBLE iff some
ray from just outside it (`q + 1e-4 mm · n`) escapes every triangle the bloom emitted — tried along the
normal turned by a fixed small tilt, then along fourteen fixed world directions (the six axes and eight
cube diagonals, rotated once so none lies on an organ's symmetry plane) wherever one leaves the surface at
more than ~17°. A point inside another part — the stem's top inside the hub, the hub's underside inside
the stem, the rim under a petal's root, the ring under a petal, the wall under a petiole — is enclosed by
that part's closed shell and no ray escapes. Ray acceptance is CLOSED (a 1e-9 barycentric slack), because a
ray down a shared edge otherwise slips between two triangles and a buried vertex reads "visible".

**What that reading decides, said plainly because one consequence is not obvious:** a face COINCIDENT with
another part's face is on the outside of the union and IS visible. **The hub's top under the petal feet is
therefore textured** — the feet sit ON the hub (coplanar skins), so the point is not enclosed. Measured
(§3b), the feet and the relieved hub still meet (nearest 0.000–0.002 mm at every height) and no printable
gap closes. This is the geometric reading of "buried"; a reading that called the hub top under a foot
buried would have to type it — flagged in §8.

**The fade.** A buried vertex takes no relief; the relief eases in from the nearest buried vertex over a
GEODESIC distance (Dijkstra over the organ's own edges, so the bore or the far side of a wall is never
"near") of `TEXTURE_CONTACT_FADE_K · H` = 2H (0.8 mm at the floor, 3.0 mm at the maximum). K = 2 keeps the
fade's own steepest ramp under 45° (the ease's peak slope is 15/8). A typed constant — flagged in §8.

**Counts on the shipped states** (EXPORT, vertices of each organ's lattice):

| state | hub shipped → lattice | hub visible / buried | stem shipped → lattice | stem visible / buried | tube shipped → lattice | tube visible / buried | file tris |
|---|---|---|---|---|---|---|---|
| PEBBLE default (no stem) | 192 → 7,312 | 3,386 / 272 | — | — | — | — | 158,912 (T3 151,792) |
| a 60 mm stem | 1,824 → 10,772 | 4,581 / 807 | 570 → 16,830 | 8,033 / 288 | — | — | 179,202 |
| solid stem (3 mm), flat end | 1,824 → 10,772 | 4,869 / 519 | 284 → 15,688 | 7,702 / 144 | — | — | 178,060 |
| widest stem (12 mm, plug), 120 mm | 1,824 → 11,060 | 3,573 / 1,959 | 570 → 63,388 | 30,640 / 960 | — | — | 226,048 |
| dome (rise 0.5) × stem | 3,456 → 15,768 | 4,792 / 3,094 | 570 → 16,830 | 8,030 / 291 | — | — | 184,198 |
| hemisphere × stem | 3,456 → 21,834 | 7,474 / 3,445 | 570 → 16,830 | 7,754 / 567 | — | — | 190,264 |
| SPHERE × stem (cavity untouched) | 6,720 → 19,036 | 7,000 / 840 | 570 → 16,446 | 7,845 / 284 | — | — | 116,042 |
| noded stem (the flower's 0.48 on 100 × 6 mm, three leaves) | 1,824 → 10,772 | 4,581 / 807 | 9,018 → 57,538 | 26,216 / 347 | — | — | 285,202 |
| the TUBE (6 of 8 fused) | 192 → 7,312 | 3,302 / 356 | — | — | 4,304 → 31,768 | 950 / 14,778 | 147,448 |
| a closed tube (6 petals, k 0) | 192 → 5,788 | 2,464 / 432 | — | — | 7,920 → 43,008 | 13,586 / 7,918 | 123,652 |
| tube on two whorls | 192 → 9,476 | 3,532 / 1,208 | — | — | 14,296 → 74,944 | 13,537 / 23,871 | 207,996 |
| sheet 0.60 × stem (decided on the twin) | 1,824 → 9,964 | 4,113 / 871 | 570 → 16,830 | 8,033 / 288 | — | — | 178,394 |
| an UMBEL, head ON | 1,824 → 10,772 | 4,553 / 835 | 570 → 16,830 | 6,388 / 1,933 | — | — | 488,514 |

On the slit tube 94 % of the ring's vertices are under the petal panels and stay smooth; what shows is
the sinuses and the exposed band. Against the conforming floor (TX10's bar, 1.25×): **hub 0.87–1.07×,
stem 0.27–0.57×, tube ring 1.222×** — every organ under the bar on every block-80 and block-77 row.

## 3. Measurements, as a function of height (they carry over to BONE)

### 3a. Leaf to stem (the combination gate's base state: stem 70 × 6 mm, a 52 × 17 mm leaf, 3 nodes)

The combination gate's `leaf-stem` measure reads the leaf blade against the stem as an ANALYTIC solid
cylinder, so it cannot see the stem's relief: it reads **0.540 mm at leafAngle 70 at every height**. The
EMITTED measure — every blade vertex against the stem's own relieved triangles, the rods named and
excluded — is the one that moves:

| leafAngle | untextured | H 0.4 | H 0.8 | H 1.2 | H 1.5 |
|---|---|---|---|---|---|
| 35 (Eva's ruled) | 3.847 | 3.505 | 3.151 | 2.797 | 2.532 |
| 70 | 0.544 (gate 0.540) | **0.252** | **0.001** | **0.010** | **0.003** |

At 35° the clearance falls by ~0.88 mm per mm of height (two reliefs facing each other, less the fade).
**At 70° the blade and the wall touch from H 0.8 up** — the 0.540 mm gap was already under
`MIN_FEATURE_MM` untextured (a declared single-reaches cell of the combination gate), so this is the same
contact deepening, not a new class; flagged in §8 because the gate's measure does not see it.

### 3b. Petal and sepal feet to the hub (per visible relieved hub vertex within 4 mm of a petal or sepal)

| state | H 0.4 | H 0.8 | H 1.2 | H 1.5 |
|---|---|---|---|---|
| default (8 petals) — narrowest open gap, before → after | 0.084 → 0.096 | 0.084 → 0.126 | 0.084 → 0.164 | 0.185 → 0.187 |
| 8 sepals on a 60 mm stem | 0.084 → 0.096 | 0.090 → 0.102 | 0.090 → 0.096 | 0.090 → 0.094 |
| 40 petals | 0.058 → 0.086 | 0.058 → 0.140 | 0.058 → 0.200 | 0.058 → 0.246 |
| a dome (rise 0.5) × stem | 0.062 → 0.077 | 0.062 → 0.068 | 0.062 → 0.064 | 0.062 → 0.063 |

**0 printable gaps (≥ 1 mm) newly closed and 0 newly touching, on every state at every height.** The feet
sit ON the hub (nearest 0.000–0.002 mm before and after). The narrowest open gap WIDENS, because the hub
relief is faded to 0 at every buried vertex — the fade keeps the relief off exactly the vertices nearest a
foot, and the petals' own relief lifts them away.

## 4. The budget — T3's §7b table re-run with the organs added (PEBBLE, EXPORT, the derived edge)

| state | T3 edge | T5 edge | T5 tris | % of budget | organs' lattice |
|---|---|---|---|---|---|
| 40 × 3 whorls | 0.41 | **0.42** | 1,442,144 | 96.1 % | hub 65,904 |
| 40 × 3 + 8 sepals + a 60 mm leaf on a 60 mm stem | 0.43 | **0.44** | 1,457,496 | 97.2 % | hub 65,292, stem 15,240 |
| 40 × 3 × sheet 2.4 | 0.41 | **0.43** | 1,432,504 | 95.5 % | hub 127,464 |
| 40 × 3 + 40 sepals on a 120 mm stem | 0.45 | **0.47** | 1,490,644 | 99.4 % | hub 60,062, stem 26,582 |
| 40 × 1 + 40 sepals × 4 tiers + whorled leaves (8) on 120 | 0.45 | 0.45 | 1,471,180 | 98.1 % | hub 31,622, stem 27,654 |
| 8 × 1 × length 100 × width 46 + 40 sepals 120 × 30 × 4 tiers | 0.41 | **0.42** | 1,446,342 | 96.4 % | hub 22,004, stem 30,290 |
| 40 × 3 + whorled leaves (8) on 120 | refused | refused at 0.50 | 1,598,930 | 106.6 % | hub 55,360, stem 24,866 |
| 40 × 2 + 40 sepals + whorled leaves on 120 | refused | refused at 0.50 | 1,680,274 | 112.0 % | hub 39,744, stem 24,866 |
| block 79's declared refusal (40 × 3 × 40 sepals × 4 tiers × whorled leaves on 120) | refused, 1,795,898 | refused, **1,873,730** | — | 124.9 % | re-recorded in `EXPORT_REFUSED_XFAIL` |

**NEWLY COARSENED: five states, each by one or two rungs (0.01–0.02 mm). NEWLY REFUSED: none.** The
shipping PEBBLE default stays on the ruled 0.4 mm in one trial (158,912 = 10.6 %). No matrix row's CAP
behaviour flips: TX9 holds on block 79's rows with the organs added.

## 5. Q15 — the bore

The bore stays unrefined: on the 6 mm hollow 60 mm stem its 142 triangles are tagged CAVITY and kept as
shipped (98 vertices). **Buried, measured by the builder's own escape test:** 240 probes on the bore's wall
away from every edge, 0 see the air — the bore is a closed cavity (the hub's top over it, the void's cap
under it). **The qualification:** of the bore's own 98 vertices, 49 read as seeing the air — 48 lie ON the
hub's top plane where the bore's top ring meets the hub's top face (a coplanar knife edge: the escape ray
grazes along the union's own top face), and 1 at the void cap's edge below it. None of this moves a float,
because a cavity face is never relieved whatever a ray says; it is the reason the bore is excluded by its
emitter's NAME rather than left to the visibility test.

## 6. Gates

- **TX10** (both STL gates, every textured row): the organs the record must carry are predicted from an
  UNTEXTURED twin (a hub unless the umbel's head is off, a stem if present, one tube ring per fused whorl);
  each organ's shipped range equals the twin's; its lattice is ≤ 1.25× its conforming floor (computed on
  the export decision mesh); visible > 0 implies displaced > 0; the page's and Node's organ ranges agree;
  and every sampled skin normal points along the emitted facet's own outward normal (dot ≥ 0.5) on a
  relief-withheld rebuild — `the-stem-normal-points-inward` and `the-hub-is-skipped` fire it.
- **TX11** (both STL gates): visibility restated — its own grid and ray cast, 26 directions plus the
  builder's 14, read off the PAGE's emitted organ mesh against a relief-withheld rebuild (capability
  `organReliefOff`). A vertex DEEPLY enclosed (it and its whole one-ring enclosed in every direction) must
  not move; a clearly exposed organ must move at least half its vertices; a record with enclosed vertices
  must declare buried ones. `a-buried-face-is-textured` fires it.
- **TX2** is unchanged and now reads the organs' skin samples too: `the-tube-ring-has-its-own-field`
  (the ring read at a different λ) fires it.
- **Block 80** (13 `TEXTURE T5:` rows, 1,568), smoke block 80 (4 rows, `--conn`); two block-77 rows
  relabelled (the whole bloom, the tube) — declared in the byte tool's `ROW_DEF_MOVED_BY_PRED`.
- **Coverage R1** (both instruments) counts the organs' lattice delta; **ST1** reads the stem's SHIPPED
  count, the lattice reported beside it (`latticeTris`).
- **The mutants**: four in `tools/verify-bloom-apex-mutants.mjs`, scoped to two T5 rows, each witnessed on
  the mutated module's own organ record. Result in §9.

## 7. Bytes

`node tools/verify-bloom-surface-bytes.mjs --base <worktree of b3163de> --movers-predicate t5-organs`,
both modes, the whole matrix, predeclared from the BASE tree's record (a row moves iff it is textured with
no infill AND the base build carries a hub, a stem, a tube ring or an inflorescence). Result in §9.

## 7b. Gate clauses re-derived for the organs (each seen red first, none loosened in what it asserts untextured)

- **TX10 / TX11 match within X0's own bar.** The page's samples and mesh come from Chromium's V8 and the
  Node rebuild from Node's; they agree to the last few bits (2.0e-15 mm worst on 462 of 65,808 hub floats).
  The first cut keyed on exact doubles and dropped 23 of 32 textured rows. A sample is matched to a lattice
  vertex, and a vertex counts as moved, against `X0_TOL_ULPS` ulp of the build's largest coordinate.
- **TX10 reads the normal per incident face**, not against the area-weighted average: a crease vertex takes
  one face's own normal, which a right-angle crease's average tilts by up to 60 degrees (the two-whorl tube).
  A normal pointed inward still fails against every face.
- **T3 (the hub plate under its roots) reads a textured plate's OUTERMOST faces within the relief height of
  the rim line.** The lattice cuts the rim wall into rows and the rim's corners are creases that move out as
  well as up, so the nearest pair on the line read one wall row (0.4 mm) wherever a sepal foot buries the
  rim. The reading can now OVER-read a textured plate by up to 2H and never under-read it — a declared
  weakening on textured rows only; untextured it is the shipped reading.
- **ST9 names the relieved hub and stem by their emitted triangle ranges** (the umbel knot's precedent) and
  finds the root ring within H; a declared blindness — it cannot see the stem's own relief pushed into the
  channel, which is TX10's subject.
- **TX8 skips a sphere whose stem channel took slot 0** — its comment already named that case; the T5
  sphere-with-a-stem row is the first to reach it.
- **ID10 builds its floret unit as the plan does** (`pedicel: true`): the plan's unit has a smooth pedicel
  (a rod, Q12), the restatement's had a relieved one, and the two floors read 17.97 against 16.92 mm.

## 7c. Found, not T5's

1. **`floretPitchFloorMm` read another azimuth's box in Chromium** — the textured raceme threw its own
   cross-check about one run in four ON `b3163de` (six in eight with T5's floret hubs), never in Node.
   Measured by recomputing both forms at the mismatch: the first dense grid of azimuth 0 carried azimuth
   π's bounding box (i0 −151 for 3) with its own z arrays intact, so the dilated bound was read at the
   wrong offset. The box loop destructured `decode()`'s returned array; reading it through two scalar
   functions (the same integers) is clean on 8 of 8 Chromium runs. Consistent with a JIT miscompile, not
   proven one. A wrong bound on a pair that does not WIN would have passed silently, so this was
   potentially moving raceme node spacing in the browser before T5 existed. A rewrite of the dilation loop
   was tried first, changed nothing (6 of 8 still threw) and was reverted.
2. **ST12 fails untextured on a 120 mm stem with 4 leaves at swelling 0.5 / kink 0.5** — the bend of nodes
   2 and 3 peaks a station gap above the node. The stem's emitted rings are bit-identical with and without
   texture, so it is the node law's (or ST12's) and not T5's; the T5 row moved onto block 41's passing
   0.48 / 100 × 6 mm state. Recorded, not fixed.
3. **CELLULAR × the hemisphere folds each petal (352 pairs)** on `b3163de` too — declared by value.

## 8. Ambiguities settled without a ruling — flagged, each Eva's to overrule

1. **The hub top under the petal feet is TEXTURED** (§2): coincident faces are outside the union, so the
   geometric reading calls it visible. The feet still meet the hub and no gap closes (§3b).
2. **The fade length is 2H**, a typed constant (K = 2 from the 45° argument), not derived from a length
   the organ owns.
3. **The relief runs over creases** (the hub's rim edge, the stem's end edge) with the summed normal,
   T3's Q4/Q5 ruling for the bead carried over to the organs' hard edges rather than fading at them.
4. **The noded stem's normal is horizontal radial** from its node-law axis at each depth, not the true
   surface normal of the swelling — the relief is outward but tilted on the spindle's flanks.
5. **Floret hubs are relieved in the floret's own frame**; their stems are pedicels (rods, deferred).
   The umbel's KNOT is untextured (a rod junction).
6. **164 tube-ring vertices with no law normal are left smooth** rather than given the mesh normal.
7. **The hub-to-stem join folds under relief from 1.0 mm (CELLULAR) / 1.2 mm (PEBBLE)** on a 6 mm stem —
   outward relief into a concave corner (0 / 0 / 3 / 98 / 40 pairs CELLULAR at 0.4 / 0.8 / 1.0 / 1.2 / 1.5;
   PEBBLE 0 / 0 / 0 / 14 / 0). Declared on the 1.5 mm row, never clamped; a derived cap (relief no deeper
   than the join's own concave radius, the fold limit's argument) is available and not built.
8. **Leaf-stem contact at 70° from H 0.8** (§3a) is not seen by the combination gate's analytic measure.
9. **Q15's "buried anyway"** is true of the bore's wall; the bore's top ring reads exposed by the escape
   test on the coplanar top plane (§5). Harmless by construction (cavity faces are never relieved).

## 9. Results of the gates, the mutants and the partition

(filled in below at the close)
