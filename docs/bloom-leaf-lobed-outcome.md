# Bloom leaf/stem build S4 — the lobed (chevron) leaf

Eva's rulings of Oct 8. A third `leafType`, **LOBED**: the lab's B PINNATIFID
chevron lattice, shipped into the generator. One panel; every row is a V tilted
forward along the midrib; the lobes are bumps in the half-width and the sinuses
dips. It is a blade **outline type**, not a separate system: it goes through
`emitPanel` with S2's bead, cup and arch, on the SIMPLE petiole (the 1.2 mm wire).

Sheet: `docs/img/leaf-lobed.png` (`node tools/shot-bloom-lobed.mjs <png>`), print preview ON.

## 1. What shipped

**The controls** (all hidden and inert unless LOBED):

- A **Lobes** drop-down inside Leaves with the brief's seven controls:
  - `lobedLobes`: lobes per side, 1–6, default **3**.
  - `lobedFrom` / `lobedTo`: the lobe window, 0.02–0.40 / 0.50–0.95, default **0.08 / 0.80**.
  - `lobedSinus`: sinus depth, 0–0.90 of the envelope, default **0.62**.
  - `lobedShape`: crest exponent, 0.5–2.5, default **0.7**.
  - `lobedAngle`: lobe tilt, 0–60°, default **38**.
  - `lobedEase`: the tilt eases to 0 from this `u` to the tip, 0.50–0.95, default **0.9**.
- `lobedWidth` (Leaves, "Envelope width", default **34 mm**), the envelope's own width twin of `leafWidth`. The mum's envelope is twice the simple leaf's 17 mm, which may not move.
- `lobedToothDepth` (Serration, default **0.08**, light). Its own twin, the S3b mechanism: its own registry row, visible only under LOBED, and `lobedBladeState` maps it onto the shipped tooth law.

**What changed from the brief, reported:**

- **The tip shape is SHARED, not twinned** (`leafTipShape`, 1.30). A LOBED twin at 1.5 put the default mum under its own tilt cap (38 → 37.41°, the ease condition binding at u 0.934); at the shared 1.30 the default is unclamped.
- **Tooth count and crest/notch shape are shared** (the brief's own rule).
- **Serrate skew is excluded** (the brief).

**The envelope** is the simple leaf's law on the lobed blade's own tapers (`LOBED_BASE_TAPER` 0.6, `LOBED_TIP_TAPER` 1.25, the lab B-mum's). The lobe factor is `1 − sinus·(1 − crest^shape)` over the window. The tilt is `tau·ease(u)`.

**The stations: 112 rows, fixed** (`LOBED_BLADE_ROWS = 2·NU_BASE`), laid by `lobedStations`:

- The tip stretch past the lobe window sits on **the simple leaf's own stations** (`i/56`, the same doubles).
- Every row left over goes uniformly to `[0, that station]`, which is finer than a uniform 1/111 at every reachable `lobedTo`.
- See §5 for why. The triangle count never moves: **5,980 a leaf** in both modes (SIMPLE: 3,044).

**The surface** is the simple leaf's cup law on the **envelope** half-width, with each chevron point laid in the arch frame at its own station along the midrib.

**The teeth** are the shipped MODEL B lobe-cut law on the lobed outline, stationed along the chevron rim.

**The petiole** runs on into the blade by the first row's V depth plus one row, so the V's outer columns stand on the rod. LF24 checks this.

## 2. The rulings as built

**The tooth fold clamp: CLAMP + READ-OUT.**

- The fold law is restated from the ruling: the innermost cell (the columns either side of the V apex, `v = ±1/(NV−1)`) must advance along the midrib.
- The relief cap (`lobedReliefFoldCapMm`) is a continuum condition on 8,192 samples, with a declared slack `LOBED_FOLD_MARGIN = 0.5` (the inner cells keep at least half the midrib's advance).
- The slider keeps the asked value. The record carries asked (`reliefFlooredMm`), cap (`foldCapMm`), built and `foldClamped`. The read-out says "CLAMPED: asked X mm, built at the fold cap Y mm".

**The S2 floor still applies.** Where the cap is under the 1 mm floor **no tooth is cut**: NO ROOM `'fold cap'`, told as "lobe teeth: NONE FIT — the fold cap is X mm, under the 1.00 mm floor".

**The TILT cap — a decision made without a ruling.** The chevron's own fold condition also binds on the **tilt**, and sinus clamping is forbidden. So the tilt is clamped instead:

- It is the largest tilt under which every row keeps both conditions:
  - the inner one, with the margin;
  - the outer one, `L cos tau + h tau' > 0`, where the tilt eases out.
- It is told on the read-out.
- One term reverses it.

**The sinus gap is reported, never clamped.** It is the in-plane opening across a sinus at 1 mm of margin arc from its bottom, plus how far along the margin the opening stays under 1 mm. It is measured on the lobed outline before the teeth and printed on the sinus control.

**The raceme pins LOBED to SIMPLE**, in the same one place as COMPOUND (`SHARED_NODE_LEAF_PINS`). This is a decision made without a ruling, one term to reverse. The shared node's seating and floret cap were measured on the simple blade.

## 3. The partition (SIMPLE and COMPOUND byte-identical)

`verify-bloom-surface-bytes --base <89b2292> --movers-predicate lobed`, run in 25 chunks and merged:

- **35 movers / 1,226 holders over the 1,261-row matrix, both modes.**
- **0 floats moved on the holders**, positionally under `Object.is`, over **1,525,338,612 export floats** and **83,737,924 captured-grid values**.
- All 35 predeclared movers moved.
- The predicate is this tree's own leaf plan: a LOBED blade actually built, after the raceme's pin. The base tree has no LOBED.
- The holders include all 1,222 base rows. They also include the four block-56 arms that build no chevron: the raceme pin and the three GATED rows.

**The /plot grid .glb is byte-identical on all 78 LOBED row-modes** (24,461,844 bytes): the export names no leaf. The holders' captured grids are covered above.

**`frozen/phase58`** is the 1,222 rows at `89b2292`, registered in both maps and deep-equal to that commit's `buildMatrix()`.

## 4. Cost

| state | tris (live = export) | file |
|---|---|---|
| one lobed leaf | **5,980** (SIMPLE 3,044) | — |
| the MUM headline (4 lobed leaves, 8 petals, stem) | 50,810 | 2,481 KiB |
| **cost corner**: whorled x 8 nodes (24 lobed leaves) x arch 180 x cup 1.2 | **170,410 = 11.4 % of the 1.5 M budget** | 8,321 KiB |

This is under the brief's 50 % threshold, so no ask was owed.

## 5. The floor/fold conflict map

**Uniform over the whole lobed control space**: 2,000 samples of all seven lobed controls plus envelope width, length, tooth depth, tooth count and tip shape, EXPORT, one leaf.

| | share |
|---|---|
| the TILT cap binds | **18.0 %** (359 of 2,000) |
| the TOOTH fold clamp binds (teeth on, some fit) | **9.3 %** (184 of 1,985) |
| **NONE FIT** (the fold cap under the 1 mm floor) | **6.5 %** (130 of 1,985) |

**At the extreme corners** (1,728 corners): the tilt cap binds on 720, the tooth clamp on 341, none-fit on 290.

**0 inverted planform cells.** The smallest is 8.5e-4 mm². The inner cells' advance over 2,592 extreme states is ≥ **0.5008** against the declared 0.5.

**The defaults bind nothing**: tilt 38.00° built of 38 asked; 9 teeth at 1.30 mm against a fold cap of 10.18.

**The tip shape is where the tilt cap bites hardest.** At the shared tip shape's extremes the tilt cap takes most of the chevron:

| tip shape | built tilt |
|---|---|
| 0.6 | **6.58°** of 38 |
| 3.0 | **16.88°** of 38 |

The steep tip convergence meets the ease, so the outer condition binds.

**The lab's C2 fold (40 teeth at depth 0.5) is not reachable on this tree**, for two independent reasons:

- the tooth slider tops out at 12;
- the shipped tooth law's resolution floor builds at most **10** teeth on the 112-row blade whatever is asked.

With the 0.5 margin, removing the tooth clamp does not invert a cell on any buildable state. The clamp sits at half the inverting relief. So the clamp-removal mutant is witnessed where it is reachable: 6 lobes at tooth depth 0.3, where the inner cells' advance drops to **0.379** under the declared 0.5 (the clean tree reads 0.513). LF22 reads that off the emitted lattice. The **tilt** cap's removal does reach a true inverted cell (lobe angle 60).

## 6. The sinus gaps (reported, not decided — Eva's question)

Over the uniform sample, **59.7 %** of lobed states with a sinus have a gap under 1 mm (1,084 of 1,816). The median is 0.988 mm, p10 0.627, minimum 0.039. **The proposed default reads 0.810 mm**: all three sinuses are under the floor, with 1.196 mm of margin fused.

Per block-56 row, EXPORT, one leaf, from the builder's own record:

| row | narrowest gap (mm) | sinuses under 1 mm | max fused (mm) | tilt built (deg) | teeth (count at relief mm) | tris |
|---|---|---|---|---|---|---|
| the MUM — alternate 137.5 x 4 nodes, the proposed defaults (3 lobes a  | 0.810 | 3 of 3 | 1.196 | 38.00 | 9 at 1.30 | 5980 |
| the shipped lobed defaults (a 46 mm blade, 34 mm envelope, 3 alternate | 0.810 | 3 of 3 | 1.196 | 38.00 | 9 at 1.30 | 5980 |
| lobedLobes min (1 a side) | 1.005 | 0 of 1 | 0.994 | 38.00 | 9 at 1.30 | 5980 |
| lobedLobes max (6 a side) | 0.544 | 6 of 6 | 2.289 | 38.00 | 9 at 1.30 | 5980 |
| lobedFrom min (0.02) | 0.798 | 3 of 3 | 1.268 | 38.00 | 9 at 1.30 | 5980 |
| lobedFrom max (0.4) | 0.637 | 3 of 3 | 1.879 | 38.00 | 9 at 1.30 | 5980 |
| lobedTo min (0.5) | 0.608 | 3 of 3 | 1.982 | 38.00 | 9 at 1.30 | 5980 |
| lobedTo max (0.95) | 0.863 | 2 of 3 | 1.172 | 38.00 | 9 at 1.30 | 5980 |
| lobedSinus min (0 — the envelope, no sinus) | — | 0 of 3 | 0.000 | 38.00 | 9 at 1.30 | 5980 |
| lobedSinus max (0.9 — the narrowest sinus gaps) | 0.789 | 3 of 3 | 1.374 | 38.00 | 9 at 1.30 | 5980 |
| lobedShape min (0.5 — sharp crests) | 0.632 | 3 of 3 | 1.623 | 38.00 | 9 at 1.30 | 5980 |
| lobedShape max (2.5 — rounded crests) | 0.907 | 1 of 3 | 1.113 | 38.00 | 9 at 1.30 | 5980 |
| lobedAngle min (0 — the rows square to the midrib, no chevron) | 0.945 | 2 of 3 | 1.062 | 0.00 | 9 at 1.30 | 5980 |
| lobedAngle max (60 — the TILT CAP binds, built under asked) | 0.784 | 3 of 3 | 1.263 | 46.73 (cap) | 9 at 1.30 | 5980 |
| lobedEase min (0.5) | 0.818 | 3 of 3 | 1.189 | 38.00 | 9 at 1.30 | 5980 |
| lobedEase max (0.95) | 0.810 | 3 of 3 | 1.196 | 38.00 | 9 at 1.30 | 5980 |
| lobedWidth min (3) | 1.006 | 0 of 3 | 0.993 | 38.00 | no room | 5980 |
| lobedWidth max (40) | 0.790 | 3 of 3 | 1.245 | 38.00 | 9 at 1.54 | 5980 |
| lobedToothDepth 0 (the lobes entire) | 0.810 | 3 of 3 | 1.196 | 38.00 | none | 5980 |
| lobedToothDepth max (1 — the FOLD CLAMP binds: asked against built) | 0.810 | 3 of 3 | 1.196 | 38.00 | 9 at 10.18 (clamped from 16.20) | 5980 |
| NONE FIT — 6 lobes x sinus 0.9 x depth 0.3 x 12 teeth (the fold cap un | 0.465 | 6 of 6 | 3.085 | 34.22 (cap) | NONE FIT (cap 0.68) | 5980 |
| 6 lobes x tooth depth 0.3 (the fold clamp binds hardest — 4.86 mm aske | 0.544 | 6 of 6 | 2.289 | 38.00 | 9 at 2.22 (clamped from 4.86) | 5980 |
| a 10 mm envelope (the tooth count GIVES at the 1 mm floor) | 1.007 | 0 of 3 | 0.998 | 38.00 | 8 at 1.00 | 5980 |
| leafTipShape min (0.6 — the tip law is shared with SIMPLE) | 0.938 | 2 of 3 | 1.073 | 6.58 (cap) | 6 at 1.30 | 5980 |
| leafTipShape max (3) | 0.936 | 2 of 3 | 1.071 | 16.88 (cap) | 9 at 1.30 | 5980 |
| arch 180 | 0.810 | 3 of 3 | 1.196 | 38.00 | 9 at 1.30 | 5980 |
| arch -90 | 0.810 | 3 of 3 | 1.196 | 38.00 | 9 at 1.30 | 5980 |
| cup 1.2 | 0.810 | 3 of 3 | 1.196 | 38.00 | 9 at 1.30 | 5980 |
| cup -0.8 | 0.810 | 3 of 3 | 1.196 | 38.00 | 9 at 1.30 | 5980 |
| sheetThickness 2.4 | 0.810 | 3 of 3 | 1.196 | 38.00 | 9 at 1.30 | 5980 |
| sheetThickness 0.6 (the export floor) | 0.810 | 3 of 3 | 1.196 | 38.00 | 9 at 1.30 | 5980 |
| leafAngle 85 (steep) | 0.810 | 3 of 3 | 1.196 | 38.00 | 9 at 1.30 | 5980 |
| leafAngle -60 (drooping) | 0.810 | 3 of 3 | 1.196 | 38.00 | 9 at 1.30 | 5980 |
| a SPHERE head with a stem (ST9 excuses the petiole by name) | 0.810 | 3 of 3 | 1.196 | 38.00 | 9 at 1.30 | 5980 |
| whorled x 8 nodes x arch 180 x cup 1.2 (24 lobed leaves — the cost cor | 0.810 | 3 of 3 | 1.196 | 38.00 | 9 at 1.30 | 5980 |
| under a raceme's shared node (PINNED to SIMPLE, and told) | — | — | — | not lobed |
| GATED — SIMPLE with every lobed control at an extreme (hidden AND iner | — | — | — | not lobed |
| GATED — COMPOUND with every lobed control at an extreme (hidden AND in | — | — | — | not lobed |
| GATED — LOBED and every lobed control at an extreme with length 0 (hid | — | — | — | not lobed |

**Do not clamp sinus depth: that is unruled.** What would open the default's gaps, measured on block 56:

- lobe shape 2.5: 0.907 mm;
- lobe angle 0: 0.945 mm;
- one lobe a side: 1.005 mm;
- a 10 mm envelope: 1.007 mm.

## 7. Gates

**LF19–LF24, each seen red on its own mutant first** (`tools/verify-bloom-apex-mutants.mjs`). Every chevron defect below exports watertight, one piece, at the identical triangle count.

- **LF19**: the type in both statements; inertness unless LOBED.
- **LF20**: the outline against the lobed envelope restated from the controls; the station law restated from `lobedTo`; the built lobe count (sinuses counted on the emitted outline over the restated envelope) against the control.
- **LF21**: the lean of every emitted row read off the skin lattice against the eased tilt; the tilt clamp as a biconditional.
- **LF22**:
  - no inverted planform skin cell;
  - the inner cells' advance ≥ `LOBED_FOLD_MARGIN`, read off the emitted lattice. That is the fold bar restated from the lattice, not from the cap record.
- **LF23**: the fold clamp and the none-fit case as biconditionals against the restated floored ask.
- **LF24**: the petiole's run into the V.
- **LF9 / LF11 / LF12 / LF14** read the lobed station law and the pin.

**Nine mutants**, each firing what it names:

- `the-lobed-type-is-ignored` and `the-lobed-controls-leak-into-the-simple-leaf` → LF19.
- `a-lobe-is-dropped` → LF20.
- `the-rows-do-not-lean` → LF21.
- `the-tilt-cap-is-removed` → LF22.
- `the-tooth-fold-clamp-is-removed` → LF22 and LF23.
- `the-fold-clamp-is-not-told` and `no-tooth-fits-and-teeth-are-cut-anyway` → LF23.
- `the-petiole-stops-at-the-chevron-apex-row` → LF24.

Two pre-existing mutants were re-anchored where `widthProfile` gained the chevron branch: `plateau-returns` and `relief-target-is-not-the-widest-half-width`. Both are re-run and fire. LF22 now records and lets LF23 still read the leaf; it had masked it.

**Block 56** has 39 rows: the mum anchor, both ends of every control, the tilt cap, the fold clamp, none-fit, the count giving, pose and sheet extremes, a SPHERE head, the raceme pin, the whorled 8-node cost corner and three GATED arms. **Smoke block 56** has 7 rows. The census reads 199 rows over 52 blocks, 165 families both ways.

**Results on block 56:**

| gate | result |
|---|---|
| export | 39 of 39 watertight, 0 within-shell self-intersection, LF8 directed edges 0 |
| connectedness | 39 of 39 one piece |
| panel | PASS; the Lobes section is witnessed by the sinuses the builder measured; negative control: all 22 routes |
| defaults bar | the lobed leaf's shipped defaults added, leaf-stem 3.47 mm; control 3 of 3 |
| combination | clean |

**No LOBED pair was added to the combination gate. CG1 refused it**: on `lobedSinus × lobedAngle` at a 70° leaf, the sinus moves the leaf-stem measure by **exactly 0** (the nearest point is the blade's base). The lobe angle moves it 0.022 mm. That leaf's 0.575 mm approach is the existing single-axis `leafAngle` hazard.

## 8. Two findings the gates made, and what was done

**(a) The tip bead folded at uniform 112 rows.**

- Seen as X2 on `lobedWidth max (40)`: 15 pairs at the tip corner.
- At a row gap half the simple leaf's, the tip's last row segment is the size of the bead.
- Over 972 extreme corners the census folded on **268** at uniform 1/111 against **87** at 1/55.
- The station law above fixes it: no block-56 row folds.
- **139 of 972 extreme corners still fold at the tip.** Every one has tilt > 0 on a steeply converging round tip (tip 3, `lobedTo` 0.95, width 40, angle 60). The tilted rows there meet a margin running back toward the base nearly along the rows. None of them is a matrix row.
- Cup 0 removes all of them.
- Reported, not gated further.

**(b) E2 (the edge-profile gate) — one class, pre-existing in the S2 leaf bead.**

- The bottom-skin-to-bead seam turns past the 45° allowance on a **wide, cupped** blade.
- On the SIMPLE leaf, whose bytes this session does not move:

  | SIMPLE leaf | seam turn |
  |---|---|
  | 17 mm (its own width) | 42.22° |
  | 34 mm | **51.61°** |
  | 34 mm × cup 1.2 | **82.83°** |

  These are reachable on `main` and carried by no smoke row.
- The lobed blade's 34 mm envelope starts in that class: the degenerate chevron (no tilt, sinus or teeth) reads 52.53°.
- On every lobe flank the rows meet the margin obliquely, `sin alpha = L cos tau / |d margin/du|`, about 12° on the default's flanks, so the bead's cross-section across the margin is narrower and the seam turns harder.
- Making the bead's inset follow the margin's normal is a change to `emitPanel`'s rim law for every blade, not this session's.
- Declared on the five block-56 **smoke** rows (the gate's own row set) at the measured magnitude, never widened. Every block-56 row's figure (`--only '^LOBED: '`):

| row | adds (deg) | face-to-face | outline |
|---|---|---|---|
| the MUM — alternate 137.5 x 4 nodes, the proposed defaults (3 lobes a si | 71.97 | 73.87 | 1.90 |
| the shipped lobed defaults (a 46 mm blade, 34 mm envelope, 3 alternate n | 74.06 | 76.74 | 2.68 |
| lobedLobes min (1 a side) | 54.27 | 55.61 | 1.33 |
| lobedLobes max (6 a side) | 90.07 | 93.55 | 3.48 |
| lobedFrom min (0.02) | 70.42 | 72.62 | 2.20 |
| lobedFrom max (0.4) | 74.15 | 76.72 | 2.57 |
| lobedTo min (0.5) | 75.24 | 77.30 | 2.07 |
| lobedTo max (0.95) | 65.51 | 67.90 | 2.40 |
| lobedSinus min (0 — the envelope, no sinus) | 54.73 | 56.16 | 1.44 |
| lobedSinus max (0.9 — the narrowest sinus gaps) | 79.11 | 81.63 | 2.52 |
| lobedShape min (0.5 — sharp crests) | 71.10 | 73.29 | 2.18 |
| lobedShape max (2.5 — rounded crests) | 88.58 | 91.65 | 3.06 |
| lobedAngle min (0 — the rows square to the midrib, no chevron) | 65.13 | 68.29 | 3.16 |
| lobedAngle max (60 — the TILT CAP binds, built under asked) | 72.60 | 74.82 | 2.23 |
| lobedEase min (0.5) | 75.01 | 77.11 | 2.10 |
| lobedEase max (0.95) | 74.03 | 76.70 | 2.68 |
| lobedWidth max (40) | 81.02 | 83.33 | 2.30 |
| lobedToothDepth 0 (the lobes entire) | 68.88 | 70.67 | 1.79 |
| lobedToothDepth max (1 — the FOLD CLAMP binds: asked against built) | 88.67 | 93.02 | 4.35 |
| NONE FIT — 6 lobes x sinus 0.9 x depth 0.3 x 12 teeth (the fold cap unde | 93.24 | 96.90 | 3.67 |
| 6 lobes x tooth depth 0.3 (the fold clamp binds hardest — 4.86 mm asked, | 92.17 | 96.01 | 3.84 |
| leafTipShape min (0.6 — the tip law is shared with SIMPLE) | 58.72 | 67.97 | 9.26 |
| leafTipShape max (3) | 76.93 | 85.46 | 8.53 |
| arch 180 | 67.33 | 70.55 | 3.22 |
| arch -90 | 84.00 | 88.05 | 4.05 |
| cup 1.2 | 114.38 | 118.90 | 4.52 |
| cup -0.8 | 100.60 | 104.44 | 3.84 |
| sheetThickness 0.6 (the export floor) | 86.01 | 88.26 | 2.26 |
| leafAngle 85 (steep) | 74.06 | 76.74 | 2.68 |
| leafAngle -60 (drooping) | 74.06 | 76.74 | 2.68 |
| a SPHERE head with a stem (ST9 excuses the petiole by name) | 74.06 | 76.74 | 2.68 |
| whorled x 8 nodes x arch 180 x cup 1.2 (24 lobed leaves — the cost corne | 85.61 | 89.73 | 4.12 |

## 9. Open questions for Eva

1. **The mum defaults** (the sheet's first row): 3 lobes a side, window 0.08–0.80, sinus 0.62, shape 0.7, tilt 38 easing from 0.9, envelope 34 mm, lobe tooth depth 0.08.
   - **The tooth COUNT is shared with SIMPLE (9 over the whole rim)**, so the teeth land one per lobe flank near the crests and read as the lobes' points. The lab B-mum carries the same 9.
   - Finer teeth would need more than the 10 the tooth law can build on 112 rows.
2. **The sinus-gap question**: 59.7 % of lobed states and the default itself (0.810 mm) open under 1 mm. Clamp, ignore or re-default? §6 has the numbers.
3. **The E2 bead class on wide cupped blades** (SIMPLE included): accept, or schedule a margin-normal bead inset for `emitPanel`?
4. **The tilt cap at the tip-shape extremes** (6.58° at tip 0.6) leaves almost no chevron. Accept, or give LOBED its own tip-shape range?
5. **The petiole**: the lobed blade is **584 mm²** on the 1.2 mm wire against the simple leaf's **486** (1.2x), slenderness 38.3 against 43.3. Flagged, not changed (ruling).
6. **The raceme pin of LOBED to SIMPLE** and **the tilt cap itself** are decisions made without a ruling, each one term to reverse.
