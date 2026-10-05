# Organic variance, build 3 — spacing (outcome)

This is the third of three amounts, and it closes the variance programme. The law is ruled in
`docs/bloom-organic-variance-spacing-law.md`, which also records the settlement and the
correction to the "headroom" framing. This doc records what was built and what it measured.

**Every figure names its MODE (EXPORT unless stated) and its SAMPLING.** They are reproduced by
`node tools/bloom-spacing-measure.mjs` (§A, §B, §C), `node tools/bloom-spacing-laws.mjs` (the
law), `node tools/verify-bloom-spacing.mjs` (the must-fail) and
`node tools/bloom-petal-separation.mjs --field spacing`.

## 1. What shipped

One control, `varianceSpacing`. It sits in Arrangement › Variance, ranges 0–0.9 in steps of 0.01,
and defaults to **0**, which is the guard. It reads the SHARED frequency and phase, so there are
still five controls in all (ruling 2). The range is IMPORTED from the geometry
(`VARIANCE_SPACING_RANGE`), and the harness refuses at load a maximum that is not strictly below 1.

**The law** (`spacingVarianceField`, `bloom-geometry.js`): the pitch density is `1 + A·g(θ)`,
with the same `g` the size and form fields read, and the azimuth is its integral.

| arrangement | map |
|---|---|
| ring, f ≥ 1 | `F(θ) = θ + (A/f)·sin(fθ + φ)` |
| ring, ramp (f 0) | `θ + A·D(wrap(θ − φ))`, with `D(w) = −w + w²/2π` |
| FAN | odd about the mirror plane, phase inert, span held: `F(t) = sign(t)·H·P(|t|)/P(H)` |

The map is applied INSIDE the whorl primitive (`buildWhorlInto`, as a branch on a null field). So
RADIAL, every layered whorl, SPIRAL, FAN, CONTINUOUS and the SPHERE's golden-angle sequence all
take it through one expression. The size and form fields are evaluated at the MAPPED azimuth,
because both are indexed on the emitted one. The SPHERE's stem-omission probe is handed the field
too, so each slot is probed where it will stand.

**Why it never binds — a property, not an apology.** The pitch stays positive for every A < 1, so
the azimuth map is strictly monotonic: order is preserved, and nothing can cross or coincide.
Coincidence arrives only at A = 1, which is J7's clause and the reason the maximum sits below it.

**The measurement of the property** (`tools/bloom-spacing-laws.mjs`, no geometry): over 3–40
petals × f 0–20 × every phase in 5° steps, the tightest pitch is **0.1010 of nominal**, and
**0** states cross.

Built through the real builder, the tightest emitted pitch at 0.9 (§B) is:

| petals | tightest pitch | angle |
|---|---|---|
| 3 | 0.2557 | |
| 5 | 0.1581 | |
| 8 | 0.1305 | |
| 40 | 0.1012 | 0.91° |

On the fan, the renormalisation's floor is `(1 − A)/(1 + A)`: **0.053** at A 0.9. It is reported on
the read-out and the control, and not clamped.

**Not built, on purpose:**

- **The tube** is unavailable under the field. `tubeEligible` and its registry twin gain one
  term, and the caption names it.
- **The sepals stay at their nominal azimuths** (§6).
- **A raceme's florets** now carry the derived outward phase when spacing is the only field on
  (`floretPhaseDeg`'s guard gained the spacing amount, NV2 re-derives it, and the
  floret-phase mutant was re-anchored).

## 2. The harness

**SV0–SV4 is the new family** (`spacingVarianceAssertions`, run by both STL gates through
`varianceAssertions`). Both STL gates are blind to an azimuth by construction.

| clause | what it holds |
|---|---|
| SV0 | The two statements of the guard (registry against geometry, through the page). |
| SV1 | The record. At amount 0 it holds EVERY emitted azimuth equal to the nominal law restated here, to the bit. |
| SV2 | Every emitted azimuth is the pitch law's integral, restated from the controls, over the nominal law restated from footRing's fields (1e-9 rad). |
| SV3 | The cyclic order is kept, every neighbour pair is at least the floor apart, and the fan's span is held and its map odd. |
| SV4 | One aliasing judgement across all three records. |

Three existing clauses were restated rather than loosened:

- **J7's minimum separation** on a fan is now `min(step × (1 − A)/(1 + A), notch)`. The amount is
  read off the control, a different owner from the field's own floor record.
- **VS5's "a RADIAL whorl reads exactly 1.000x"** holds when the spacing field is absent. With it
  present, VS5 asserts the told pitch is not under the law's floor.
- **SP4's reference** is the petals' NOMINAL azimuths under the field, because the sepals stay at
  nominal. At amount 0 these are the same doubles. The first block run found this: SP4 went red on
  `SPACING VARIANCE: 0.9 x SEPALS`, sepal 0 at 22.5° against the moved petals' midpoint 40.7°.

**Must-fail, one per clause** (`node tools/verify-bloom-spacing.mjs`). Each plant is put into a
copy of a real Node-built record and run through the SHIPPED clause function. **5 of 5 fire
exactly their own clause, and every clean control is silent.**

| clause | plant |
|---|---|
| SV0 | the guard answer flipped |
| SV1 | one azimuth moved by a single ulp at amount 0 |
| SV2 | one azimuth moved by 1e-6 rad at 0.9 |
| SV3 | controls, record and azimuths all agreeing at an amount PAST the maximum (1.2), where only the order clause can see the negative pitch |
| SV4 | `aliased` flipped |

**The standing mutants** (`tools/verify-bloom-apex-mutants.mjs`; subset run, 3 of 104 — not a sweep):

| mutant | names | fired | note |
|---|---|---|---|
| `spacing-amount-0-is-not-the-identity` | SV1 | SV1, plus ID9 and ID10 | Collateral: every floret azimuth moves by ~1e-9 rad and the reach moves with it. |
| `spacing-is-a-direct-azimuth-offset` | SV2, SV3 | SV2, SV3 | The ruled-out circular version. It crosses past n/2. |
| `aliasing-is-never-told` | VS4, FV4, SV4 | VS4, FV4, SV4 | Re-named to include SV4. |

The clean tree is silent on every row.

**AND THE TABLE COULD NOT SEE THE NEW FAMILY ON ITS FIRST RUN:** its variance regex was
`/^(VS\d+|FV\d+):/`, so every SV message was dropped, and both spacing mutants read SILENT. This
is CLAUDE.md's prefix-attribution class (ST10 read as ST1), arriving as a regex that did not know a
family existed. The regex is now `/^(VS\d+|FV\d+|SV\d+):/`.

## 3. The instruments with the field on (§A)

EXPORT. The columns are:

- **pitch**: the told flag's tightest emitted pitch over nominal.
- **blade**: the told flag's nearest skin-to-skin approach on the 56 × 10 lamina above
  ROOT_BLEND_END. Negative means the skins cross.
- **feet**: the nearest feet, in foot widths.
- **D_max**: the crowding raster's deepest stack. CROWDED is 11 or more.
- **X2**: within-shell census pairs.
- **cross**: petal-against-petal crossing pairs outside the hub. This is cross-shell, which the
  export contract permits and **no gate reads**.

| petals | state | pitch | blade (mm) | feet | D_max | X2 | cross |
|---|---|---|---|---|---|---|---|
| 8 | amount 0 | 1.000 (45.00°) | −1.194 | 0.846 (5.42 mm) | 2 | 0 | 992 |
| 8 | 0.9 f 1, phase 0 and 90 | 0.190 (8.54°) | −1.199 | 0.165 (1.05 mm) | 4 | 0 | 4,509 |
| 8 | 0.9 f 5 (past n/2), phase 0 and 90 | 0.609 (27.39°) | −1.184 | 0.524 (3.35 mm) | 2 | 0 | 1,926 |
| 40 | amount 0 | 1.000 (9.00°) | −1.199 | 0.388 (2.48 mm) | 4 | 0 | 63,800 |
| 40 | 0.9 f 1, phase 0 / 90 | 0.104 (0.93°) | −1.200 | 0.040 (0.26 mm) | **14** | 0 | 121,793 / 121,794 |
| 40 | 0.9 f 21 (past n/2), phase 0 | 0.458 (4.12°) | −1.200 | 0.178 (1.14 mm) | 4 | 0 | 63,030 |

At 8 petals, phase 0 and 90 read identically because an 8-fold whorl rotated by the phase is the
same whorl.

**Triangle counts never move** (24,688 at 8 petals, 122,672 at 40).

**AGAINST THE ACCEPTED FIGURES.** The ruling accepted a look at an 8-petal overlap of −1.170 mm
(now −1.1944, VS5's pin) and 1,504 crossing pairs.

- **The overlap figure does not move materially:** −1.194 → −1.199 mm at the limit. The skin-gap
  measure saturates at minus one sheet, where the mid-surfaces meet.
- **The crossing census does move materially:** 992 → **4,509 pairs (4.5×)** at 8 petals, and
  63,800 → 121,793 at 40.
- **The 1,504 is not a baseline.** It is the discovery's one-off census, no gate reads it, and
  this tree's own default reads **992** for the same quantity.
- **The 40-petal whorl crosses the crowding flag** at the limit: D_max 4 → **14**, CROWDED.
- **On counts the ruling did not cover, spacing CREATES crossings that were not there.** At 3
  petals the blade approach goes from **+17.104 mm to −1.199 mm**; at 5 petals, from +5.689 to
  −1.200 (§B).

So the ruling rests on figures that hold for the overlap, and not for the crossing census, the
crowding flag or the low counts. Reported, not clamped.

## 4. The closest approach the 0.9 maximum permits (§B)

Swept over f 0–20 × phase 0–345° in 15° steps, EXPORT, through the real builder:

| petals | tightest pitch | nearest feet | drawn blade | at amount 0 |
|---|---|---|---|---|
| 3 | 0.2557 (30.68°) | 0.358 foot widths (2.29 mm) | −1.199 mm | blade +17.104, feet 1.173 |
| 5 | 0.1581 (11.38°) | 0.173 (1.11 mm) | −1.200 | blade +5.689, feet 1.027 |
| 8 | 0.1305 (5.87°) | 0.113 (0.72 mm) | −1.200 | blade −1.194, feet 0.846 |
| 40 | 0.1012 (0.91°) | **0.039 (0.25 mm)** | −1.200 | blade −1.199, feet 0.388 |

The nearest a user can come to duplicate geometry is **a tenth of a pitch: 0.91° and feet
0.25 mm apart centre to centre at 40 petals.** The angular floor `1 − A = 0.100` is the bound
those figures approach.

## 5. The four pair hazards (§C) — on hold, reported only

Each pair's worst cell over its declared grid, through the combination gate's own measure, with
the field off against 0.9 at f 1 / f 5 and phase 0 / 90:

| pair | worst cell, field off | with the field on |
|---|---|---|
| curl × twist | **0.007 mm** | 0.007 mm at all four settings |
| cup × roll | **0.002 mm** | 0.002 mm at all four |
| cup × petalTipShape | **0.743 mm** | 0.743 mm at all four |
| leafAngle × stem | **0.000 mm** | 0.000 mm at all four |

The prediction is confirmed by measurement: spacing rotates each petal rigidly and does not reach
a petal against itself or the leaf against the stem. Nothing was accepted, clamped, declared or
widened.

## 6. The sepals — out of scope, for their own session

**Following the circle map.** The sepals would take `F` too, so `sepalPhase 0.5` would stay
interleaved between the GRADED petals. That is the "re-derive from the graded azimuths" option the
discovery named.

- **What it looks like:** the calyx bunches and spreads with the corolla.
- **What it costs:**
  - one call: hand the sepal LIST arm the mapped azimuths;
  - SP4 restated against the emitted petals again;
  - the drawn angle limit re-run on distinct neighbourhoods (the scan already keys on relative
    azimuth since build 2);
  - a sepal row in the byte partition.

**Staying at nominal (what ships).** The calyx stays evenly spaced while the corolla grades, so at
a high amount a sepal can sit directly behind a petal instead of in its gap. That is visible face-on
as a sepal showing on one side and hidden on the other. It costs nothing, and SP4 reads the
nominal petal azimuths.

**Ruling 5's own wish** (sepals with their OWN amount, frequency and phase, defaulting to the
petals') is a third option on top of either: one `SEPAL_TWINS`-style instance of the five
controls.

## 7. Verification

**Each instrument:**

- **The byte partition:** `node tools/verify-bloom-surface-bytes.mjs --base <worktree of 1740881>
  --movers-predicate variance-spacing`, in four `--range` chunks merged. See §8.
- **X2 across block 51:** the export gate on the block. Every row free of within-shell
  self-intersection; see §8 for the final run.
- **Separation:** `tools/bloom-petal-separation.mjs --field spacing`. **144 builds (128 with the
  field on), every one ONE connected piece at 0.6 mm**, and no base's export triangle count moves
  with the amount (0 of 16).
- **Build order:** `tools/verify-bloom-build-order.mjs`, three processes (forward, reverse, shuffle
  seed 7) over the variance subset (`--only '^(SPACING VARIANCE|FORM VARIANCE|VARIANCE|DEFAULT|
  varianceSpacing|varianceSize|varianceForm|NODE VARIANCE)'`, 80 rows × 2 modes, 160 builds a pass).
  **PASS: every digest identical, bit for bit.** This is a SUBSET, not the whole matrix.

**The matrix:**

- **Block 51** is appended as the final block: 19 rows.
- The blanket sweep adds `varianceSpacing min/max`, so **1,123 → 1,144 rows**.
- The smoke block is 51, with 5 rows: **169 smoke rows over 47 blocks, 151 families**, with SV0–SV4
  claimed both ways.

**The frozen phase:** **`frozen/phase53` is the 1,123 rows at `1740881`.** It is registered in both
maps and `--verify-frozen phase53` reads PASS deep-equal. No workflow file is edited by this PR, so
the tag's base workflow files equal `main` HEAD's at dispatch, and it is not pre-declared in
`TAG_PUSH_XFAIL`.

## 8. Close-out figures

**Amount 0 is byte-inert, measured over the whole matrix in both modes.**

- Command: `node tools/verify-bloom-surface-bytes.mjs --base <worktree of 1740881>
  --movers-predicate variance-spacing`, run in four `--range` chunks (0:290, 290:580, 580:870,
  870:1144) and closed with `--merge`.
- **PASS.** 20 of 20 predeclared movers moved, and **0 floats moved on the 1,124 holders**,
  positionally, under `Object.is`.
- Coverage: 1,371,519,000 export floats over 152,391,000 triangles, and 82,362,502
  captured-grid values over 9,517 panels.

The movers are predeclared from the GUARD FUNCTION (`varianceSpacingIsAbsent`), never from
labels. They are:

- the 18 block-51 rows that set an amount;
- `varianceSpacing max (0.9)`;
- **`ALL MAX`**, which the blanket sweep hands 0.90.

The holders are:

- every one of `main`'s other 1,122 rows;
- `varianceSpacing min (0)`;
- block 51's GATED row, which holds frequency and phase at their maxima with every amount 0.

**`--control` fires both clauses.** On rows 100:104, which hold one mover, a 1e-9 perturbation
is reported once in the export stream and once in the captured grid. On a range with no mover
the tool also refuses the run as VACUOUS.

**`ALL MAX` moves, and both of its records were re-recorded with the old figure kept in the
note:**

- **Census:** 116,847 pairs / 15.8503 mm → **93,107 / 13.6547**. It improves.
- **Export refusal:** 3,090,910 → **2,716,406 triangles**, in both modes. It is still refused,
  at 181.1 % of the 1,500,000 budget. The same 240 petals are built and none is omitted.
- **Why the triangle count falls.** The size field reads each slot's EMITTED azimuth. The
  pitch-density law gathers slots where the shared wave is negative, so more petals stand at
  the small end of the size wave. The fringe's width rule then cuts them fewer teeth.
- **Read this as a property of the shared wave, not a defect.** With one frequency and one
  phase, the crowded petals are the small ones.

**Gates run locally on the branch:**

- The export gate over block 51 and the sweep rows: 21/21 PASS, X2 free on all 21.
- Connectedness: 21/21 PASS, one piece.
- The panel gate: PASS.
- `--verify-frozen phase53`: PASS, deep-equal.
- The apex mutant table over the three spacing mutants: each fires its own SV clause.
- `tools/verify-bloom-spacing.mjs`: five plants, each firing exactly its own clause, with the
  clean records silent.

The full matrix is CI's, and it is the merge criterion.

## 9. CI found a tie in the sepal contact rule (`f982aca`)

The first full CI run on `c2990a8` dropped `ALL MAX` from both long gates' shard 0, on
**SP8**: *"one step above the limit (-36°) the harness's own contact test finds NO clip in
either mode."* Every other job was green.

**What happened.** The geometry's sepal scan and the harness's independent contact test
both found the same nearest point: sepal 39 against petal 237, **2.359 mm against a
2.4 mm sheet**. That point lies on an **interior edge** that two facets share. Both tests
then decided "above or below" against **one facet's own normal**. At that crease the two
faces disagree: one reads the point **−2.06 mm below**, the other **+0.09 mm above**. Each
test took whichever facet it reached first (grid order against triangle order).

The spacing field put `ALL MAX`'s petals on the tie. The rule itself was ill-posed before
this build.

**The fix: one tie-free quantity, read by two independent routes.** Both tests now read
the side against the **emitted normal interpolated at the nearest point**. On a shared
edge, both facets interpolate the same two endpoint normals. The geometry computes it with
dot-product barycentrics, the harness with area ratios.

An "above if ANY tied facet says so" rule was tried first, in the harness only, and
**rejected**. It read a clip at the built angle on `FORM VARIANCE: x SEPALS`, which passes
on `main`. It also found one at `ALL MAX`'s built angle.

**Measured:**

- **Limits.** The limit moves on **1 of the 80** live-matrix rows with sepals: `ALL MAX`,
  −37° to **−40°**. That row is already this build's predeclared mover, so the byte
  partition's mover set is unchanged. No other row calls the scan.
- **`ALL MAX`'s records are unmoved.** Census **93,107 / 13.6547 mm** (`bloom-xfail-magnitudes
  --include-refused`); export refusal **2,716,406** triangles, live and export alike.
- **SP8 on the other 79 sepal rows.** Its two halves (no clip at the built angle; a clip
  one step above) agree on all 79 in Node.
- **Export gate in the browser.** **73/73** sepal rows pass (`verify-bloom-export --only`).
- **Mutants.** `sepal-angle-clamp-removed` and `sepal-limit-drawn-at-the-rim` still fire
  SP8, and the clean tree is silent.

**Frozen bytes, named.** The new rule also moves the **spacing-0** `ALL MAX` state from
−37° to −40°. That state is `frozen/phase53`'s own `ALL MAX` row, so **phase53's bytes stop
reproducing on that one row**; its definitions are unchanged. `ALL MAX` also carries 40
sepals in phase35 through phase52, so those rows may move the same way. They are
predicted, not measured.

**Recorded, not changed.** The harness test still treats a facet DIAGONAL between two
boundary vertices as boundary. It is more lenient there than the geometry's per-edge flag.
It moved nothing on any row measured here.
