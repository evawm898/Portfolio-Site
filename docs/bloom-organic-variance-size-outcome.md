# Organic variance, build 1 of 3 — SIZE: what shipped, what was measured

The first of the three builds ruled in `docs/bloom-organic-variance-discovery.md` §9 (Eva,
Sep 17): the SIZE amount with the shared frequency and phase (ruling 2), ±50 % (ruling 3),
frequency TOLD and not capped (ruling 4), and — the condition of ruling 1 — the TOLD FLAG,
which ships in this PR on every build whatever the amount. Form and spacing are builds 2
and 3. Every figure below names its MODE and its SAMPLING; a figure that names neither is a
number nobody should quote.

## 0. What shipped

| control | section | range | default | guard |
|---|---|---|---|---|
| `varianceSize` | Variance (a drop-down inside Arrangement) | 0 – 0.50, step 0.01 | 0 | 0 is the guard: `sizeVarianceField` returns **null** and the whorl primitive branches on it |
| `varianceFrequency` | Variance | 0 – 20, step 1 | 1 | hidden AND inert at amount 0 (`variancePresent`) |
| `variancePhase` | Variance | 0 – 360°, step 5 | 0 | hidden AND inert at amount 0; INERT on a FAN, told on the control |

Three controls, not five (ruling 2). The three ranges are `export const` in
`bloom-geometry.js` (`VARIANCE_SIZE_RANGE`, `VARIANCE_FREQUENCY_RANGE`,
`VARIANCE_PHASE_RANGE`) and IMPORTED by the registry; the harness throws at module load if a
registry row carries a literal instead (Q6). `variancePresent` in the registry and
`varianceIsAbsent` in the geometry are the two statements of one guard, checked against each
other at harness load over the amount's reachable ends and per row through the page (VS0).

**The section placement is a decision made without a ruling.** The discovery doc names the
controls and not their home; the field indexes the EMITTED AZIMUTH — "one side of the flower"
is an arrangement statement — so it sits as a child of Arrangement and keeps the top level
Eva's own. One `parent` field moves it.

## 1. The law, and where it lives

`sizeVarianceField(state, fr)` in `bloom-geometry.js` is the ONE owner:

    factor = 1 + A · g(θ)
    f ≥ 1   g = cos(f · θ + φ)                 a WAVE, f cycles per turn
    f = 0   g = −1 + 2 · wrap(θ − φ) / 2π       a RAMP, its seam at the phase

with `θ` the slot's EMITTED azimuth. `buildWhorlInto` takes an optional `sizeField` and
BRANCHES on it: with no field the slot's scale is `sizeRamp(i, count)` exactly as it was, no
product formed; with one it is `sizeRamp(i, count) * sizeField.at(azimuth)`, the azimuth
being the primitive's own — never a second copy of the placement law. The factor rides on the
slot payload as `sizeFactor` (null with no field) so the builder's per-petal record reads it
back rather than dividing it out of `scale`, which would not reproduce it to the bit.

`slot.scale` already reaches `petalSurface` as `length = ps.petalLength * slot.scale` and
`halfW = ps.petalWidth * slot.scale / 2` (the inner whorls' own route), so nothing new touches
the blade. This is route (a) of the discovery's §1 — "a per-slot size ramp handed to the
primitive, the CONTINUOUS arm's own shape" — and not the override table, whose rows are
per-ROLE.

**The stem channel probes each slot at the size the field gives it**: `stemOmission` takes the
same `sizeField`, so on a SPHERE with a stem the petal measured for omission is the petal
built. `buildBloomInto` asks the field once, before the mask.

**Sepals are untouched in this build**: `buildSepalsInto`'s whorl is handed no field (§9).

## 2. Position per placement — and the FAN is even, measured

Factor rows at ±50 %, phase 30°, EXPORT, read off `built.variance.factors` (the same doubles
LIVE — the field reads azimuths, and azimuths are mode-free):

| placement | f | n | slots' factors |
|---|---|---|---|
| RADIAL 8 | 1 | 8 | 1.433 1.129 0.750 0.517 0.567 0.871 1.250 1.483 |
| RADIAL 8 | 0 (ramp) | 8 | 1.417 0.542 0.667 0.792 0.917 1.042 1.167 1.292 — the seam at 30° |
| RADIAL 8 | 5 | 8 | 1.433 0.871 0.750 1.483 0.567 1.129 1.250 0.517 — ALIASED (5 > 4) |
| FAN 7 (3/side + centre) | 1 | 7 | 1.500 1.354 1.000 0.646 **0.646 1.000 1.354** — mirror pairs equal to the bit; phase inert |
| FAN 7 | 0 (ramp) | 7 | 0.500 0.833 1.167 1.500 1.500 1.167 0.833 — plane-outward |
| CONTINUOUS 8 | 2 | 8 | 1.433 1.287 0.617 0.646 1.321 1.410 0.751 0.546 — the golden-angle azimuth |
| SPIRAL 8 | 3 | 8 | 1.433 1.065 0.646 0.504 0.751 1.192 1.483 1.396 |

On a FAN `θ` is the UNSIGNED angle from the mirror plane (a fan ring's phase is exactly 0, so
the emitted azimuth IS that angle, signed), the wave is `cos(f · |θ|)` with the phase inert,
and the ramp runs plane-outward over the fan's own derived half-span. The fan builds each
mirror pair as `+m` and `−m` from one magnitude, `Math.abs` of an exact negation is the same
double, so the two factors are EQUAL TO THE BIT — VS3 asserts that on every pair and refuses
to pass on a fan with none. Z4a / Z4b / Z8 / J7 stay as they are. On CONTINUOUS / SPHERE the
polar sequence, the equal-area law and the stem channel are untouched (§1).

## 3. Frequency is told, not capped

A wave needs more than two slots a cycle to draw as a wave. The threshold is the
arrangement's own sampling: `n / 2` on a ring of n slots (the whole `sequenceLength` under
CONTINUOUS — the golden-angle sequence has no uniform pitch, so the bar is its MEAN density,
said as such) and `π / step` on a fan, whose pitch is its own derived step. `aliased` is
exactly `f > 0 && f > nyquist`; `f = nyquist` (4 cycles on 8 slots) is AT the bar and draws
as the alternating sign, which is the last thing the lattice can draw. The read-out's SIZE
VARIANCE line and the frequency control's own value both print `ALIASED … reads as SCATTER
(told, not capped)`, from the builder's record; the range is not narrowed, and 20 cycles on
3 petals builds.

## 4. Amount 0 is a null record — the byte partition

PREDECLARED FROM THE GUARD, not from labels: a row moves iff `varianceIsAbsent(state)` is
false. Over the 908-row live matrix that is **23 movers / 885 holders**, and the label regex
`^VARIANCE: (?!GATED)|^varianceSize max|^ALL MAX$` reproduces the guard's set in both
directions (0 guard-not-regex, 0 regex-not-guard, measured). `ALL MAX` is a mover because
the amount is a visible slider and the blanket sweep hands it 0.50 (the sepal-count
precedent); `ALL MIN` and the two GATED rows are holders by the guard; the two sub-controls
are out of the sweep through the derived `VARIANCE_SUBS`.

`node tools/verify-bloom-surface-bytes.mjs --base <worktree of f1fbdf9> --movers '<regex>'`, the
908-row matrix as it stood before the fringe row was added, both modes:

    partition     : 23 of 23 rows named by --movers MOVED (every one must), 885 holders compared to the bit
    export stream : 863,686,368 floats over 95,965,152 triangles, 908 rows x 2 modes
    captured grid : 77,685,464 values over 9,001 panels (live)
    PASS — 0 floats moved on the 885 holders, positionally, under Object.is; all 23 predeclared movers moved.

**So 24 movers / 885 holders over the 909-row matrix**: the 24th mover (`VARIANCE: x the FRINGE
at 10 teeth`, added after the full run — §6) was measured in a two-row run beside the default
(PASS, the row moved and the default held), and the guard predicate names it a mover too. The
tool's `--control` fires BOTH clauses on a 1e-9 perturbation (`DEFAULT (live): 1 of 171360
floats moved … grid — 1 of 4430 values moved`) with a mover and a holder present. **The
shipping default is held BY BRANCH**: at amount 0 the primitive forms no product, and 0 of its
171,360 export floats moved in either mode. **The two GATED rows are holders** (hidden AND
inert, measured, not asserted), and **`ALL MIN` is a holder** by the guard.

## 5. The told flag

Ruling 1's condition. `neighbourFlag(built)` runs AFTER every solid is emitted (it can move no
byte), on every recorded build, and its record is `built.neighbour` → `__bloomMetrics().neighbour`
→ the read-out's NEIGHBOURS line. Three numbers, three owners, three samplings:

- **tightest pitch** — the smallest azimuth gap between neighbouring slots of one whorl, off
  the EMITTED azimuths, against the whorl's nominal (`2π / n`; the fan's own step, with the
  notch left out). Size variance moves no azimuth, so it reads 1.000× on every row here; it is
  the family's flag and build 3 is what moves it.
- **nearest feet** — `nearestFeet`, MOVED from `tools/bloom-crowding.mjs` into the geometry so
  the page and the gate read ONE function (the crowding tool re-exports it and its `readFeet`
  now calls the geometry's `footList`): centre to centre over ALL pairs of feet, in mean foot
  widths.
- **nearest petal approach** — the smallest mid-surface distance between any two petals over
  ALL pairs, on the builder's own 56 × 10 lamina above `ROOT_BLEND_END` (the root exit is the
  crowding raster's region; `tools/bloom-neighbour-gap.mjs` draws the same line), less the
  sheet, so a negative number is the skins passing through each other. The geometry's own
  `closestOnTriangle` with a row-strip prune.

**On the shipping default, LIVE and EXPORT alike (the sheet is above the print floor):**

    NEIGHBOURS (live, told, never clamped): tightest pitch 45.00° = 1.000x the nominal 45.00° ·
    nearest feet 5.42 mm centre to centre = 0.846 foot widths (0/6 ~ 0/7) ·
    nearest petal approach -1.170 mm skin to skin — SKINS PASS THROUGH EACH OTHER by 1.170 mm
    (laminae 0.030 mm apart less the 1.20 mm sheet, petals 0 and 7 at r 20.5 z 4.7;
    all 28 pairs of 8 on the builder's lattice above u 0.30)

Both figures are the discovery doc's own (§2b's 0.846 = 5.42 / 6.40; §2's −1.170 blade skin
gap) reached through a different implementation on the same lattice, and VS5 pins the
default's skin gap to `tools/bloom-neighbour-gap.mjs`'s −1.1701 within the record's rounding
so the restatement cannot drift off the instrument. At ±50 % the approach goes −1.170 →
−1.134 mm (petals 0 and 1, the enlarged neighbours); on the continuous mum (40 × 3) it reads
−0.946 mm between TURNS (petals 107 and 115), which is the case that decided the sampling:
azimuth-ADJACENT pairs read 4.42 mm on the same build at amount 0 where all pairs read 0.56,
so adjacent-only would tell a clearance the object does not have on exactly the arrangements
that crowd. `the-told-flag-skips-half-the-pairs` is that defect as a mutant.

**Cost (Node, EXPORT, all pairs, measured with the prune):** DEFAULTS 8 petals 4 ms on top of a
~90 ms build; the 120-petal continuous mum 215 ms on a 1.2 s build; RADIAL 40 × 6 (240
petals, 565,632 tris) 390 ms on a 2.5 s build. Before the prune the mum read 3.6 s, which is
why it is a row-strip search in ascending box distance rather than a flat loop. The lamina is
now captured on every petal build (`captureLamina` unconditional in `buildBloomInto`; the
capture moves no byte — `verify-bloom-grid`'s clause 1 — and the partition measures it).

**What it does NOT print:** the crowding raster's D_max (`stackDepth`), which imports the
harness and stays the gates' instrument, printed on every gate row as before. Nothing here is
a gate and nothing here is read by the geometry.

## 6. The harness

- **VS0–VS5** (`varianceAssertions`, in both STL gates after the inflorescence family): the two
  statements; the record (null iff amount 0; its factors the LAW RESTATED from the controls
  and the emitted azimuths through `sizeFactorRestated`, bounded at 1e-9 because the page's V8
  and Node's need not agree on a cosine's last bit); the factor REACHED the blade (`slot.scale
  === ringScale * sizeFactor` and `length === nominalLength * slot.scale`, exact, both the
  builder's own products read back); the fan even, not vacuously; aliasing both ways; and the
  told flag on every row with the default's cross-instrument pin.
- **C1 / J8 read one restated factor.** `spineInputsFor` rebuilt the representative petal's
  length as `effective petalLength × ring.scale`; under the field that petal was built at the
  ring's scale times its slot factor, and C1 went red on every variance row (`length 52.5,
  the applied petalLength x scale gives 35`) — the gate doing its job on a quantity that now
  has a per-slot owner. It reads `× sizeFactorRestated(m, ui, q.azimuth)` now — the field
  restated from the controls and the ROOT ROW's emitted azimuth, never the builder's factor
  record, which is what VS1/VS2 test — and it is exactly the pre-variance product at amount 0.
  VS1 reads the same one statement. **Z2 and Z6 are untouched and were checked**: Z2 reads the
  representative petal's applied OVERRIDES (the field is not an override) and Z6 compares
  DESCRIPTOR scales across a whorl, which the field never writes (it acts on the slot).
- **`petalSlotSizes`** joins the metrics hook — every emitted petal's slot scale, factor,
  descriptor scale, built length and nominal length — beside `variance` (the field's record,
  one factor row per whorl parallel to `slotAzimuths`) and `neighbour`.
- **Matrix block 38**, 23 rows (the sizes on 3 / 8 / 40 petals, the ramp, 2 and 4 cycles, the
  aliased corner, two phases, SPIRAL, two FAN rows, CONTINUOUS × 3 turns, a SPHERE with a
  stem, 3 whorls, the IRIS, sepals, the raceme, cup 1.2, the buckle, the first step 0.05, and
  two GATED rows); the blanket sweep adds `varianceSize min / max`. Live matrix 883 → 908.
- **Smoke block 38**, five rows (`--check` reads 34 blocks, 110 rows, 115 families).
- **Panel gate route (y)** — three edits (the header entry, the block, the negative control's
  two flags `sawVariance` / `sawNeighbour`; the banner says EIGHTEEN) and the Variance
  section's WITNESS (`petalSlotSizes[0].scale` / `neighbour.blade.skinGapMm`, two numbers the
  slider cannot write). **And the accordion clause learned a remembered child**: Arrangement is
  the one section that ships open and is therefore walked LAST, and it now has a child; the
  walk had opened Variance inside it, a sibling's click shut Arrangement with Variance
  remembered (the `<details>` memory the clause's own paragraph accepts), and the final re-open
  showed both. A2 now admits a DESCENDANT that was raw-open before the click; siblings stay
  exclusive.
- **`frozen/phase37`** is the 883 rows at `f1fbdf9`, registered in BOTH maps and proved
  deep-equal (`--verify-frozen --phase37 --base <worktree>`: PASS). Owed because the row set
  changed, and ONE row definition moves: `ALL MAX` carries `varianceSize 0.5` here.
  **`ALL MAX` moves twice.** Its census entry is RE-RECORDED, 192,270 / 3.1556 → **196,142 /
  5.7609** (+3,872 pairs and a fold 2.6 mm deeper: the 1.5× petals at the deepest ring, whose
  effective tilt is already past 90 — `node tools/bloom-xfail-magnitudes.mjs --include-refused
  --only '^ALL MAX$'`, Node 22). **And its refusal entry moves, 2,506,652 → 2,354,268 triangles,
  which the smoke subset's XR1 found and the field's own premise did not predict**: a size factor
  moves vertices on a fixed lattice EXCEPT where another feature derives a COUNT from a width —
  the fringe's tooth ceiling is `W ≥ (2N−1)·MIN_FEATURE_MM` at the terminal, so the 0.5× petals cut
  fewer teeth (per petal 10/9/8/…/1 where the unvaried row cut 10/8/6/4/3 per whorl, measured in
  Node on both amounts), −152,384 triangles. Mode-free, as the fringe's rule is (XR1's builder tally
  agrees with the refused count). Block 38 gained `VARIANCE: x the FRINGE at 10 teeth` for it.
  Three block-38 rows are declared where their base rows are clean or lighter: cup 1.2 → 794 /
  0.3210, margin buckling 0.30 → 4 / 0.0188, and the IRIS at 2 whorls a span-0 knife edge of 3
  (session 42's class). Every figure is the export gate's own census on this tree (Chromium).

## 7. Mutants and must-fails

Seven mutants in `tools/verify-bloom-apex-mutants.mjs`, each witnessed on the MUTATED module's
own slot payloads and builder record at a state where the mutation must separate the two trees,
never on the clause it names. Run as one subset (`--only=` the seven; a subset, never a sweep —
59 of 66 were not run here) with the clean tree SILENT on every row:

| mutant | what it breaks | names | fired |
|---|---|---|---|
| `size-field-never-reaches-the-blade` | the factor is recorded on the slot and the blade gets the descriptor's scale | VS2 | VS2 |
| `amount-0-is-not-the-identity` | the guard bypassed: a 1e-9 amount at 0, every slot moved by a hair | VS1 | VS1, and L5 beside it (the page's lobe record against a Node rebuild the mutation does not reach — a true statement about a mutant that moves every station by 1e-9) |
| `fan-field-is-not-even` | the ring's signed wave on a fan | VS1, VS3 | VS1, VS3 |
| `aliasing-is-never-told` | ruling 4's flag deleted | VS4 | VS4 |
| `the-told-flag-forgets-the-sheet` | the lamina distance printed as the skin gap | VS5 | VS5 |
| `the-told-flag-skips-half-the-pairs` | index-adjacent pairs only — the discovery's wrong sampling | VS5 | VS5 |
| `the-guard-moves-off-zero` | the geometry's guard at 0.1 while the registry's is at 0 | VS0, VS1 | VS0, VS1 |

**The first witness was wrong on its first run and the table said so**: it demanded every slot's
factor off 1, and a 1-cycle wave at phase 0 hands the slot at 90° `1 + 0.5·cos(π/2)`, which is
EXACTLY 1 (6e-17 of amplitude is under an ulp) — so it reported "the behaviour did not move" on a
mutant whose slots plainly read scale 1.000 against factors 1.5 / 1.354 / … It asks for SOME
factor off 1 and EVERY scale at its descriptor's now. **The neuter control**
(`--neuter=fan-field-is-not-even`) reports `the edit applied but the BEHAVIOUR did not move —
mirror pairs unequal on 0 of 3 on the mutant and 0 of 3 on the clean tree`, which is the witness
refusing an edit that changes nothing. **The fan witness probes at phase 90 on purpose**: cos is
even at phase 0, so a witness there separates nothing (`bore-is-not-evas-rule`'s lesson).

**The other must-fails**, each run and each seen to fire: the panel gate's `--negative-control`
closes with **ALL EIGHTEEN ROUTES** observing the failure (route (y)'s two flags among them, the
frozen read-out leaving the SIZE VARIANCE line absent and the NEIGHBOURS numbers stale);
`bloom-smoke --check --negative-control` fires both directions; `verify-bloom-grid
--negative-control` — every mutation reddened the clause it named and nothing else;
`bloom-wall-thickness --negative-control`, `verify-bloom-arc-stability --negative-control` and
`bloom-combination-gate --control` all green on the current tree; and the byte tool's `--control`
fires BOTH clauses on a 1e-9 perturbation with a mover and a holder in the set (§4).

## 8. What the field does under instancing — measured, not changed

`floretState` spreads the whole state (`{ ...state, inflorescence: 'NONE', … }`), so the three
controls carry into the floret unit, which is ONE `buildBloomInto` call built once and
appended N times. Measured on the shipping raceme at ±50 %, f 1, phase 0, EXPORT:

    head factors (8 slots)     1.500 1.354 1.000 0.646 0.500 0.646 1.000 1.354
    floret unit (5 slots)      1.500 1.155 0.595 0.595 1.155     n 5, not aliased
    florets placed 5 — one unit appended N times (identical triangle blocks)
    same raceme at amount 0    unit.variance null, 90,588 tris both ways

So every floret carries the SAME factor set on its own five azimuths, and its largest petal
is slot 0 — azimuth 0 IN THE FLORET'S OWN FRAME — on every floret. Each floret's frame is
rotated rigidly with its pedicel, whose azimuth the phyllotaxy sets per node, so in WORLD
terms the large petal points a different way on each node: "every floret varying the same
direction" is true in the floret frame and false in the world frame. Whether that is right is
Eva's — a per-floret phase would be ruling 10's second half (a per-node delta, a build per
distinct state) and is not built. The unit's record (`inflorescenceBuilt.unit.variance` and
`.neighbour`) is exposed so the doc's statement can be read off the builder.

## 9. Sepals — costed, not built

Ruling 5 gives the sepals their own amounts, frequency and phase, defaulting to the petals'.
Sepal SIZE variance alone would cost: three registry rows (`sepalVarianceSize` /
`sepalVarianceFrequency` / `sepalVariancePhase`) with the two sub-controls gated on the sepal
amount AND `sepalsPresent`, a second `sizeVarianceField` call on `fr.sepals.ring` handed to
`buildSepalsInto`'s LIST whorl (the primitive already takes the field on that arm), the
sepal angle scan re-drawn per sepal (today it scans one sepal per congruent neighbourhood
— under a per-slot size every neighbourhood is distinct, so the 0.23–0.65 s scan scales with
the count: the discovery doc's §8 warning), a `sepalVariance` record and SP-family clauses
for it, ~8 matrix rows and a smoke row, and a frozen phase. The "defaulting to the petals'"
half is a registry question: a default that FOLLOWS another control is not something the
registry expresses today (defaults are literals), so it is either a `follow: 'varianceFrequency'`
mechanism or a read-out saying "as the petals'" with the value copied by hand. **It belongs in
its own PR**, after build 3 has settled what the shared frequency and phase mean for spacing —
a sepal frequency that defaults to a petal frequency whose meaning is still moving would be
ruled twice.

## 10. The combination gate

The gate's rejection of arrangement controls STILL HOLDS for a per-slot size field, for the
reason the inflorescence session found: `self` is `measureWall` on ONE petal and cannot see
where a neighbour stands, so CG1 would refuse `varianceSize` as inert for that measure (its
own petal's wall does not change with its neighbour's size). What a size × anything pair WOULD
want is a second measure — the neighbour approach this PR builds (`neighbourFlag`'s blade
reading) — with its own bar, and that bar is not `MIN_FEATURE_MM` as a printable-gap
requirement: ruling 1 makes interpenetration on the default an accepted look, so a
`neighbour` measure in the gate would declare the shipping default itself. So: no pair added;
what would have to change is the MEASURE and the BAR, not the row list.

## 11. Findings

- **C1's reconstruction had a second owner the moment a slot had its own size** (§6). The
  representative petal's length was `control × descriptor scale`; with a per-slot factor that
  is a claim about the ring and not the petal. Fixed by restating the field from other owners.
- **The accordion clause met its first start-open section with a child** (§6).
- **Adjacent-by-azimuth is the wrong sampling for the approach** (§5): 4.42 mm against 0.56 on
  the mum. The flag reads all pairs and says so on the line.
- **`verify-bloom-grid`'s clause 1b went red on the first cut**, which had put every build's
  panels on `p.grid`; `grid` keeps meaning "captured iff asked" and the builder's own consumers
  read `p.lamina`. The sepal scan (SP8) and `tools/bloom-sepal-contact.mjs` moved with it.
- **The coverage instruments re-emit the whorl** and had to be handed the field; under it a
  slot is not slot 0 rotated, so R3 bit-matches each slot against `petalsAll`.
- **The size field composes with a form the petal has already spent**: three block-38 rows
  fold where their base rows are clean or lighter (§6's three declared entries), session 34's
  composition class one control later.

## 12. What was run before the one push

Locally, on this tree: the export gate on the DEFAULT, every block-38 row and `ALL MAX`
(PASS — 23 of 23, then 1 of 1 on the added fringe row, and `ALL MAX` refusing at its declared
2,354,268); the smoke subset with `--conn` (109 of 109 surviving rows watertight AND one
connected piece on the first pass, the one drop being `ALL MAX`'s stale count — re-recorded —
and a clean pass on the corrected tree); the panel gate and its negative control (EIGHTEEN
routes); the grid gate and its negative control; the smoke census and its negative control;
the wall instrument, arc stability and the combination gate, each with its control; the
stem-channel witness; the seven-mutant subset and the neuter control; the frozen census
(`--verify-frozen --phase37`, deep-equal); and the byte partition of §4. The full-matrix gates
run in CI on the pushed head, and the merge message carries their durations read off
`actions_list` at the time — never a figure from a doc.
