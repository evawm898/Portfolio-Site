# The asymmetric petal outline — F6-asym

*Session of Oct 18. Eva's rulings for this session, verbatim in substance: CURVE mode gets a
Symmetric / Asymmetric toggle; Asymmetric is two independent half-curves (left, right) about the
unchanged midrib; the edge bead and the infill are REQUIRED to work on it (no refusal path);
Asym → Sym mirrors the LEFT half onto the right, Sym → Asym starts both halves equal to the current
curve; every #417 / #418 ruling carries to each half; LEFT is defined once; every petal on RADIAL /
SPIRAL has the same hand (a pinwheel is correct). Petals only, global scope. Read
`docs/bloom-outline-curve-outcome.md` (#417), `docs/bloom-outline-curve-2-outcome.md` (#418) and
`docs/bloom-spoon-rim-turn-outcome.md` (#419) first.*

## 1. Left, defined once

**LEFT is the half on the viewer's left when the petal is seen from its upper (adaxial) face with its
base at the bottom.** In the geometry that is `v > 0` of the cross-section (`sideOfV`, the one
statement), the `+T` side of the row frame; the right-hand direction `D × N` is `−T`. In the editor
the UPPER curve is the left half and the lower the right (the caption says so in Asymmetric mode).
In the value, `points` is the left half (and the whole curve under Symmetric) and `right` the right
half — `bloom-curve.js`'s own two-sided shape, unchanged.

**Every petal of a whorl carries the same hand**, so a whorl of asymmetric petals is a pinwheel.
The FAN's mirror pairs are NOT mirrored either: the pairing there is azimuthal, the petal is the
one curve. That is a placement made without a ruling (the ruling named RADIAL and SPIRAL) and is
one branch to change if Eva wants mirror-image pairs.

**[Oct 18, F6-scope: SUPERSEDED by Eva's ruling — a FAN mirror pair is two MIRROR IMAGES: the
pair's non-canonical member draws the outline with its left and right halves swapped
(`resolvePetalOutline`, `fanSlotMirrored`). RADIAL and SPIRAL keep the pinwheel. See
`docs/bloom-outline-curve-scope-outcome.md` §2.]**

## 2. The construction

`widthProfile` stays the ONE outline owner. Under Asymmetric it builds each half as its own
`widthProfileOne(..., side)` — the #417/#418 law on that half's points (start above the root blend
or at the throat with its width pinned to the tube law there, the drawn length the slider's,
Petal width scaling both halves, the per-point print floor refused in the editor and lifted and
told in the build, teeth / lobes / fringe off) — and `twoSidedProfile` combines them. Each half
reaches `TIP_HALF_MM` and closes on its own `leafNibPlan`, which solves its start so the drawn
length is the slider's EXACTLY, so both halves end at one length on the same `APEX_END_HALF_MM`
mini-face (asserted: `twoSidedProfile` throws if the two lengths differ).

**THE COMBINED PROFILE REFUSES TO ANSWER A ONE-SIDED QUESTION.** Every single-valued method
(`halfWidthAt`, `halfWidthBaseAt`, `laminaHalfAt`, `shapeAt`, `ladderHalfAt`, `onNib`, …) THROWS on
a two-sided profile, naming `profile.side(±1)`. A reader that was missed fails loudly on the first
asymmetric build instead of drawing the left half for both — which is how every reader below was
found. Where a single number is honest (the peak for the fringe record, the cap's entry, the nib
arc's start), it is a declared max / min / mean, chosen so that EQUAL HALVES give the symmetric
number to the bit.

## 3. Every ±halfWidth site, and what each now reads

| site | what it reads now |
|---|---|
| `widthProfile` | one `widthProfileOne` per half; `twoSidedProfile` answers `side(±1)` and throws on a one-sided question |
| `outlineCurvePlan` | `side: 'right'` reads `right`, else `points` |
| `outlineCurveRefusal` | asks EACH half by the same predicate; the message names the half |
| `petalForm` — `apexScale` (the apex sweep) | one scale per half (`apexL` / `apexR`), off that half's outline |
| `petalForm` — `sectAt` | takes the half it draws (`side`): cup, cup gradient, buckle and apex sweep on that half's own width |
| `petalForm` telemetry (curvature, chord ratio) | per half; the chord ratio divides by `hL + hR` |
| `petalSurface` — `rowAt` | `twoRowAt`: `hL`/`hR`, `hbL`/`hbR`, the cup's nib scale per half, two sections, `sect(v)` takes `v > 0` left |
| `bladeStations` (the ladder) | the turning-rate measure is the MEAN of the two halves' increments, sample by sample (equal halves: the measure itself) |
| the zero-form guard residual | per half |
| `buildPetalInto` records | `profileL/R`, `profileBaseL/R`, `marginSides` (OC4), the cap as `sides.left/right` with every per-side field at the top level NULL |
| the fringe record's peak | `outline.peakHalfMm` (the wider half's) |
| `emitPanel` — the bead | the room per half: `room × 2 h_side / (hL + hR)`; the radius, the inset (`rimInsetV`), the taper distance and the clamp record per half (§5) |
| `emitPanel` — the grid | `halfWidth` (left) and `halfWidthRight`; the .glb carries `halfWidthRightMm` only when a row has one |
| `infillLamina` (new) | the one owner of "the infill's half-width at (u, y)": `y > 0` left |
| `infillMetricField` | per-side columns, the midrib column dividing by the mean width |
| `infillLatticeStep`, `infillKappaAt`, `infillLocalFrame` | the side under the point (`hY`), the narrower half (`hMin`) |
| `infillLaminaFloorU` / `infillWallFloorU` | above BOTH halves' waists / the mean half-width |
| `petalInfillPlan` | the plan in mm across the midrib, `y = v · h_side`; the basal V per half; the outline per half |
| `infillSeedField` / `infillRelax` | the mirror partner at `−y · hR/hL`; relaxation re-mirrors by the halves' ratio |
| `emitInfillPanel` | per-v plan map, per-margin ramps, the inset plan and the material mask on each half's own width |
| `bloom.js` read-out | `OUTLINE CURVE: ASYMMETRIC …` one line per half; the APEX NIB line per half |
| `bloom.js` metrics hook | `petalRingProfileSides`, `petalProfileSides`, `petalRingMarginSides` |
| `tools/bloom-sagitta.mjs` | each half on its own profile and rows; the worse half reported with its side |
| `tools/bloom-infill-wall.mjs` | each half's own lamina, read off the profile (never through `infillLamina`) |

## 4. Equal halves are the symmetric outline, to the bit

`node tools/verify-bloom-outline-asym-equal.mjs --control` builds every CURVE row of the live matrix
(56) and 19 written-down states (cup, curl, roll, twist, buckle, apex sweep, cup gradient, the infill
flat and curved, a tube, three whorls, CONTINUOUS, a sphere, sepals, width, length, head rise) with
the curve as Symmetric and as Asymmetric with `right = points`, both modes: **0 of 50,314,104 export
floats and 0 of 5,847,084 grid values differ under `Object.is`, 150 two-sided builds observed**, and
`--control` (one ULP on one right-half point) is seen.

## 5. The bead on a narrow half — found by the new clause, fixed

Eva's room rule sizes the bead from the span ACROSS the section, a fraction of two halves. On an
asymmetric outline the narrow half can be narrower than that, and its bead then reached past the
midrib: the inset pinned at the midrib and the drawn radius was not the record's. **E7** (new, the
edge gate) measures where the skin stops on each side — the chord from the boundary point to the
skin point, off the emitted vertices — against the declared radius; it fired on most asymmetric
rows on its first run (worst 0.149 mm, the FAN lateral). The fix is the same rule read per half,
`room × 2 h_side / (hL + hR)`, which is exactly the room when the halves are equal. E7 then holds
on every row run, with one bound it states: where a half's own chord to the midrib is shorter than
the radius (a narrow half under a deep cup), the inset stops at the midrib — the inset law's own
bound, the same on both halves and on symmetric petals.

## 6. The rim turn (E2), against the spoon's declared numbers

Five asymmetric rows read over the 45° allowance (EXPORT, E2's own clause). Each was measured
against its two SYMMETRIC TWINS (each half mirrored), through the same clause:

| row | asymmetric | left twin | right twin |
|---|---|---|---|
| lopsided × cup 0.6 | 46.06 | (under) | 46.06 |
| lateral × cup 1.2 | 46.96 | 47.26 | 52.27 |
| lopsided × buckle 0.3 | 54.72 | 53.10 | 55.08 |
| lopsided × roll 200 | 48.97 | 50.79 | 52.39 |
| lopsided × apex sweep 0.8 × cup 0.6 | 46.06 | (under) | 46.06 |

**Every asymmetric excess is at or below the worse of its twins** — the asymmetric petal adds no turn
its halves do not already have; it is the blunt-nib-under-a-cup class #419 declared on the spoon
(71.99° there), on a narrow half. The one SMOKE row over the allowance, `ASYM OUTLINE: the lateral x
cup 1.2`, is declared in `E2_TURN_XFAIL` at 1.961139 with its site (row 52/59, u 0.9954, the left
half on the nib, a clamped bead). The allowance is not raised.

## 7. The gates

- **OC0–OC3 and AN0–AN3 run once per half** on a two-sided ring, each half restated from the
  CONTROL's own points (`points` / `right`) through the one PCHIP evaluator (`restatedOutline` via
  `outlineHalfOf`) against that half's emitted half-widths; across the halves OC0 holds the mode's
  two statements, AN2 one drawn length, AN0 the combined nib as the AND of the halves'. OC2's
  validator answer is the curve's (both halves), its lift each half's own.
- **OC4 (new) — the handedness on the emitted margins.** LEFT rebuilt from two owners the outline
  does not write — the run of the emitted spine centres (D) and the row's normal (N) — as `N × D`;
  the section the panel is emitted through must leave the midrib toward it at `v = +0.1` and away at
  `v = −0.1` on every row where both halves have width, and on a flat row each margin stands at its
  own half's width. Only OC4 sees the halves drawn on the wrong sides: every width record is right.
- **E7 (new)** — §5.
- **I11 gains an asymmetric state** (the lateral), its wall measured on each half's own lamina.
- **FR2** and the A-family's A2–A4 read each half's cap; `nibActive` is the AND of the halves.
- **F11** (design file): an Asymmetric curve round-trips verbatim with both halves; a #417-shaped
  Symmetric file loads clean and unchanged; a right half outside the box is refused whole and told.

**Mutants, each witnessed on the MUTATED module's own record:**

| mutant | where | fires |
|---|---|---|
| the right half is the left mirrored | apex table | OC0, OC1 (and AN1, OC2) |
| the halves are swapped | apex table | OC4 |
| the right nib reads the left width | apex table | AN3 |
| a flat section reads one half-width (a ±halfWidth site left symmetric) | apex table | OC4 |
| the bead follows one side only | edge gate `--control` | E7 (and E2, true of it) |
| the infill tiles a mirrored outline | infill gate `--negative-control` | I11 |
| Asym → Sym copying the right half | panel gate route (af), pre-existing (`bloom-curve.js`'s `switchMode`) | route (af) |

## 8. Matrix, smoke, frozen phase, bytes

- **Block 67, 25 rows** (1,334 → 1,359): equal halves, lopsided, the orchid lateral, near-symmetric,
  the pinwheel ×5, the form laws per half (cup, the fold clamp, buckle, roll, curl × twist, apex
  sweep), the infill ×3, width, length, three whorls, SPIRAL, CONTINUOUS, FAN, a sphere, a TUBE, a
  loaded right half under the floor, sepals (pinned LAW) and the GATED row. **Smoke block 67, 8 rows**
  (262 rows over 63 blocks).
- **`frozen/phase73` is the 1,334 rows at `f663973`**, registered in both maps and proved deep-equal.
- **The byte partition** (`verify-bloom-surface-bytes --movers-predicate asym`, predeclared from the
  CONTROL's value: a row moves iff it is CURVE with a two-sided curve whose right half differs from
  its left — the base tree reads only `points`): see §9.

## 9. Measured

- **Byte partition** — `node tools/verify-bloom-surface-bytes.mjs --base <worktree of f663973>
  --movers-predicate asym`, the whole 1,359-row matrix in both modes, closed in 140 chunks through the
  tool's own `--merge`: **PASS — 23 of 23 predeclared movers moved and 0 floats moved on the 1,336
  holders**, positionally under `Object.is`, over **1,637,363,988 export floats (181,929,332 triangles)
  and 80,094,516 captured-grid values**. The 23 are block 67 less its EQUAL and GATED rows; every LAW
  row and every Symmetric CURVE row holds. `--control` fires both clauses.
- **Equal halves** (§4): 75 CURVE states, 0 of 50,314,104 export floats and 0 of 5,847,084 grid values.
- **The export gate over block 67** (`verify-bloom-export.mjs --only '^ASYM OUTLINE'`): **25 of 25
  watertight, 0 degenerate, live = export triangle counts on all 25, 0 within-shell self-intersection
  pairs on all 25** (no new fold; the census is the verdict), every shell outward (O1/O2).
- **Cost: zero triangles.** Every asymmetric single-whorl row reads 24,688 (the default's own count);
  the infill rows 63,520–74,720 against the symmetric infill's own range. Two halves are a boundary
  change on the fixed row-and-column lattice.
- **The edge gate** (E0–E7) over block 67 and the reference rows: E7 clean after §5's fix; E2 as §6.
- **The infill gate** (I0–I12, `--negative-control`): PASS, the asymmetric wall state included; the
  mirrored-outline mutant fires I11 with its witness moved.
- **The apex table** (the four asymmetric mutants over the two asymmetric rows, a SUBSET): each fires
  the family it names and the clean tree is silent on both rows.
- **The design-file gate** (`--no-browser`): F11 and F12 PASS.

## 10. Not done, and named

- Per-scope asymmetric outlines, sepals and leaves (later sessions, by the brief). **[Oct 18: per-scope outlines built by F6-scope; sepals and leaves are the next session.]**
- Mirror-image FAN pairs (§1) — a placement made without a ruling. **[Oct 18: RULED and built by F6-scope.]**
