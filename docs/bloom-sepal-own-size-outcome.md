# Sepals get their own length and width — outcome (QA.1, §8A)

**Eva ruled the design (Oct 13); this document is what was built against it and what was
measured.** The discovery and the prototype sheet are `docs/bloom-sepal-own-size-proposal.md`
and `docs/img/sepal-own-size-proto.png` (draft #406, never merged). The pointer block in
`CLAUDE.md` is the summary; this is the record.

## 0. The rulings, verbatim in substance

1. Units: absolute millimetres.
2. Ranges: `sepalLength` 5–120 mm, `sepalWidth` 3–30 mm.
3. Migration: `sepalScale` stays live. The two mm rows default to 0 = "the petal's × size"
   (a BRANCH, byte-identical); a set row wins for its axis and `sepalScale` hides. No
   retirement, no `migrateTo`.
4. The read-out shows the DRAWN length beside the asked one when the tip floor shortens a
   narrow blade; the slider keeps the asked value.

And the build order: the angle limit's exclusion in millimetres FIRST, its own commit and its
own partition; the second producer of the sepal's length fixed; then the controls, the gates,
the rows, the phase.

## 1. The angle limit's exclusion is a length now (its own commit)

`laminaFromPanels` dropped the SEPAL lamina's rows at `u < ROOT_BLEND_END` — 0.30 of the
sepal's OWN length: 6.3 mm of a 21 mm sepal and 45 mm of a 150 mm one. The region the
exclusion exists for (the sepals session: "root-exit stacking … 0.022 mm at 1 mm from the
rim") is the petals' root blend at the ring, a PHYSICAL region whose extent does not grow with
the sepal. So the drawn limit READ HIGHER WITH LENGTH — +17 at 21 mm, +22 at 60, +23 at 90,
+24 at 120 and "+90, no contact in the range" at 150 × 5 mm, while the 150 mm sepals stood up
through the petals. The third durable rule, in the instrument written to protect the petals.

**What ships.** `sepalRootExclusionMm(state) = ROOT_BLEND_END × petalLength` — the outer
whorl's root blend in mm (10.5 on the shipping petals, whatever the sepal's size) — and
`laminaFromPanels(panels, { rootExclusion: { origin, mm } })` keeps every blade row (`u > 0`)
whose centre is at least that far from the sepal's own ring point (`p.base`). The petals'
laminae keep the `u` rule: their blend IS that region, on their own outline. The limit record
carries `exclusionMm`; SP8 restates it from the controls and REFUSES a record that is not the
petals' root blend; the harness's own contact test (`sepalContactCheck`) keeps the trial
sepal's rows from the SAME restated length outward, so the two instruments draw the same
object; `tools/bloom-sepal-contact.mjs`'s dense drawing follows the geometry's rule.

**The second producer.** The seam step inside `sepalAngleLimit` read
`state.petalLength * sepals.scale` — a second statement of the sepal's length, which the
own-size rows would have left reading the PETAL's. It reads `bladeAskedLengthMm(sepalBladeState(…), sepals.scale)`,
the one expression `petalSurface` reads.

**Measured on the wing (120 × 5 mm, curl +120 biased to the tip, angle 40 asked):** the limit
reads **+21** with the exclusion in mm against **+24** on the fraction (and +90 at 150 mm); the
"+40 asked" cell on the prototype sheet, which built at 24 with the sepals through the petals,
builds at 21 and clears. At 21..150 mm × 5 mm the limit is **+21 at every length**.

**The partition, predeclared from the base tree's own limit records before any byte was
compared** (`tools/scratch-sepal-own-size/partition1.mjs`, both trees, both modes, every row
with a sepal): of the live matrix's 80 rows with sepals, **6 move and 73 hold** (the SPHERE
GATED row builds none on either tree):

| row | built angle | limit | bytes |
|---|---|---|---|
| `ALL MAX` | −40 → **−38** | −40 → −38 | MOVE (the 40 sepals re-tilt by 2°) |
| `SEPALS: sepalCup max (1.2)` | −8 → **−4** | −8 → −4 | MOVE |
| `SEPALS: sepalTwist min (-180)` | −1 → **0** | −1 → 0 | MOVE |
| `SEPALS: sepalTwist max (180)` | −1 → **0** | −1 → 0 | MOVE |
| `SEPALS: sepalRollTaper max (1)` | 0 → 0 | 8 → 9 | hold (the record alone) |
| `SEPALS: sepalSpineCurl min (-180)` | 0 → 0 | 75 → 76 | hold (the record alone) |

The shipping whorl, the size rows, the crowded corners and every attachment row are unmoved
(limit 21 → 21, 24 → 24, 46 → 46). The three moved sepal rows still read **0 within-shell pairs**
(measured, EXPORT). Run again over `frozen/phase65`'s 1,302 rows the partition is the SAME four moved built angles and the same two record-only movers — its 80 sepal rows are the live matrix's 80 to the row. `ALL MAX`'s census reads **93,107 / 13.6547** and its refusal triangle count is unchanged on both trees, so neither entry moved.

The wall instrument's `sepal-form-max` V5 xfail moved **0.001 → 0.003 mm** (improved; its wall
0.002 → 0.014) — the all-max sepal's built angle moved with its limit — re-recorded in the same
commit, never widened. The combination gate's sepal cells moved with the built angle too, all re-recorded in the same commit: `sepalcurl-x-sepaltwist` 270×180 0.049 → 0.053, 360×120 0.005 → 0.002, 360×180 0.012 → 0.006; `sepalscale-x-sepalcurl` 1×360 0.887 → 0.931; and `sepalcurl-x-sepaltwist` 270×60 CLEARS (0.768 → 1.146) — its entry removed rather than kept at a magnitude the tree no longer reads.

## 2. The controls

`sepalLength` (0..120, step 1, default 0) and `sepalWidth` (0..30, step 0.5, default 0) in
`Sepals`, after `Sepal size`. OWN ROWS, NOT TWINS: `sepalTwinControls()` copies the petal's
own range and `SEPAL_TWIN_BOUNDS` may only narrow it, so a twin could never pass 60 mm or go
under 8 mm — and `SEPAL_TWINS` never held size (its own comment excludes it; nothing hidden
existed). `SEPAL_SUBS` (visible only with sepals present), so neither enters the blanket sweep
and `ALL MAX`'s definition is untouched (1307 → 1316 rows, all nine in block 61).

- **0 is the sentinel** ("the petal's × size"); 1..4 mm / 1..2 mm are FLOORED to the ruled
  5 / 3 and told. `sepalOwnSize(state)` is the ONE owner of both.
- `sepalBladeState` writes `bladeLengthMm` / `bladeWidthMm` onto the substate (null when
  following); `bladeAskedLengthMm(ps, slotScale)` / `bladeAskedWidthMm` are the one place
  either becomes the blade's asked size — read by `petalSurface` and the angle scan alike.
  A petal never carries the field, so its expression is the one it was.
- **The foot follows the width's owner**: `footScale = own width / petalWidth` once the width
  is set, else `sepalScale` — so a hidden multiplier never reaches the foot of a sepal whose
  width it no longer sets.
- `sepalScale` hides under `PREDICATES.sepalScaleLive` exactly where the geometry's
  `sepalScaleInert` says it moves nothing (both set); SP0b holds the two statements against a
  third (the harness's restatement).
- The read-out: `size: the sepal's OWN 120 x 5 mm (the multiplier is inert and hidden)`,
  the floor told, and `(120.0 mm asked, DRAWN 89.1 mm — the tip floor shortens a narrow
  blade)` on the SEPALS line and on the length control's own line (ruling 4). At tip shape
  0.60 a 5 mm blade draws three quarters of its asked length (the stub's share is a width
  question).

## 3. The gates

- **SP0b** the multiplier's two statements. **SP3** the foot restated with the width-ratio arm.
  **SP5** the size law restated from the controls (own ?? petal × size, floored) against the
  asked record and the descriptor's own record. **SP5b** THE EMITTED BLADE, never the record: a
  Node rebuild of the page's state, the sepal's captured mid-surface read at its outermost
  columns (v = ±1, so a flat row's chord IS the width — exact at the widest row within one
  ladder row of the peak) and along its centre line (at least half the asked length, never
  past it by more than 1 % + 0.5 mm; wide by the apex nib's own shortfall on purpose — the
  clause's subject is a 120 mm record on a 21 mm blade). **SP8** restates the exclusion and
  honours a row's `sepalLimitMaxDeg` pin.
- The design file picks the two rows up through `CONTROL_FIELDS` (F2: 1316 of 1316 rows
  round-trip); the panel gate's route (ad) likewise.
- Two apex mutants, each witnessed on the MUTATED module: `sepal-own-length-ignored` (the
  substate drops the length — SP5 / SP5b) and `sepal-root-exclusion-is-a-fraction-again`
  (the `u` rule restored in `sepalTrialLamina` — SP8's pin on the WING-at-40 row, which the
  table gained beside the WING itself). Run as a subset (`--only=sepal-own-length-ignored,sepal-root-exclusion-is-a-fraction-again`), each fires the family it names and the clean tree is silent on every row; the full table was not re-swept.
- `verify-bloom-sepal-decoupled`: 322 petal-side values × 2 modes, 0 sepal floats moved
  (`petalLength` / `petalWidth` stay declared shared — the size a following sepal is a fraction of).

## 4. The rows and the byte partition

Block 61, nine rows: the WING; length min / max; width min / max; both set at size 0.20 (the
multiplier inert); under the floors; the WING asked UP at 40 with the limit PINNED at or under
22; GATED. Smoke block 61 holds five of them. `node tools/verify-bloom-surface-bytes.mjs --base <worktree of 34ed00d> --movers '^SEPAL SIZE: (?!GATED)|^ALL MAX$|^SEPALS: sepalCup max \(1\.2\)$|^SEPALS: sepalTwist (min|max)'` over the whole 1,316-row matrix in both modes: BYTES_RESULT.

## 5. Frozen phase

The row set changed (1307 → 1316), so a phase is owed: `frozen/phase66` is the **1,307 rows at `34ed00d`** (main's head before block 61; main's newest phase was re-read as phase65 immediately before registering), registered in `FROZEN_MATRICES` and `FROZEN_BASE_COMMITS` and proved deep-equal by `--verify-frozen`. The tag's dispatch and read-back are recorded in the PR's close.

## 6. Reproduce

```
node tools/scratch-sepal-own-size/partition1.mjs live|phase65     # step 1's partition (base worktree at ./base)
node tools/verify-bloom-surface-bytes.mjs --base <worktree of 34ed00d> --movers '^SEPAL SIZE: (?!GATED)|^ALL MAX$|^SEPALS: sepalCup max \(1\.2\)$|^SEPALS: sepalTwist (min|max)'
node tools/verify-bloom-export.mjs --only 'SEPAL SIZE'
node tools/verify-bloom-apex-mutants.mjs --only=sepal-own-length-ignored,sepal-root-exclusion-is-a-fraction-again --rows='WING|shipping default'
node tools/bloom-xfail-magnitudes.mjs --include-refused --only '^ALL MAX$'
node tools/scratch-sepal-own-size/sheet.mjs docs/img/sepal-own-size.png
```
