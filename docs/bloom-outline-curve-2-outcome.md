# The outline curve's follow-ups — F6-sym-2: the width scales the curve, and CURVE works on a tube

*Session of Oct 17. Petals only. Eva's two rulings on #417's unruled calls (that doc's §3, now struck through
and marked RULED). Read `docs/bloom-outline-curve-outcome.md` first for the curve itself,
`docs/bloom-tube-outcome.md` for the ring, and CLAUDE.md's outline-curve and tube blocks.*

## 1. The rulings it carries (not re-litigated)

| Ruling | Where it lives |
|---|---|
| In CURVE mode Petal width SCALES the drawn curve's widths, multiplicatively against the slider's default; at the default the outline is #417's to the bit; lengthwise positions untouched | `outlineWidthScale(state)` = `petalWidth / OUTLINE_WIDTH_REF_MM` (16, which the registry IMPORTS as the slider's default); `outlineCurvePlan(curve, L, { scale })` multiplies every point's y — never its x — and the floor is asked of the scaled width. At 16 it is exactly 1 and the plan takes #417's expressions BY BRANCH |
| CURVE is available on tubular flowers; the curve shapes the free lobe above the throat; the tube keeps its own law below it | `tubeEligible`'s CURVE term withdrawn in both files; on a fused whorl widthProfile's CORE term is the LAW up to the throat, and the curve is its own term `OUTLINE_LOBE` from the throat to the tip |
| Kept from #417: the default curve, the 56-row count, sepals and leaves pinned LAW | unchanged |

**Eva's call, kept as given:** on a tubular flower the curve starts AT the throat with its first width pinned to
the throat's width. It holds — see §4 for what it costs at the seam's slope, which is the one thing to look at.

## 2. The design

**The throat is the DECLARED fusion height, `tubeHeight`, never the ring's top row.** The ring's top row is
decided by the blade ladder, and the ladder reads this profile; a declared station breaks the circle. On a petal
of a fused whorl (`cap.tubeLobe`, set on exactly those petals in the tube's collect and build passes, in both
modes — so a FREE inner whorl of the same bloom keeps the flat CURVE petal):

- **below the throat** the outline is the LAW — the two tapers and the tip shape over the LAW's own widest point
  `a / (a + b)`, written out in widthProfile (`tubeLaw`) because in CURVE mode `uPkRaw` is the curve's peak. The
  squared end is not part of it (it is the fringe's partner and the curve stands both down);
- **above the throat** the curve, its x laid over the lobe (`u = h + x (1 − h)`), its y scaled by the width, and
  its **first point PINNED** to the LAW's half-width at the throat — recorded as `pinned`, never refused and never
  lifted (the width is the law's, not the hand's);
- the two are SEPARATE TERMS (`CORE` to the throat, `OUTLINE_LOBE` from it), so the hand-over is a TERM_CHANGE
  `slopeBreaks` names rather than a kink hidden inside one term (§4: the slopes do not match);
- the blade's widest point is the larger of the law's below the throat and the curve's above it (it reaches the
  form laws as `halfW`, as before).

Everything downstream reads the outline through widthProfile unchanged: the nib (`leafNibPlan` — the drawn length
is the slider's exactly on every tubular row), the edge bead, the ladder, the ring's sinus and trim spans, and the
slit petals' own outer halves (which run from the foot, so they carry the law below the throat and the curve above).

**The law's controls SHOW on a tubular CURVE flower** — base taper, tip taper and tip shape draw the tube below
the throat, and a control that moves geometry is never hidden. `outlineLawShapes` = `outlineFromLaw` OR
(`outlineFromCurve` AND `tubeAnyFused`). The squared end stays LAW-only.

**The width drag is refused through the outline's own validator.** `onWidthEdit` is a WINDOW capture listener (so
it runs before the scope view's panel capture and a refused width writes nothing anywhere): in CURVE mode it asks
`outlineCurveRefusal` with every built petal's scale moved by the candidate's change (`curveValidatorCtx`, from
each petal's own outline record — its length, scale and whether its first point is pinned), and on a refusal puts
the slider back to the width the build on screen drew, stops the event, and prints the reason on the outline
editor's status line (`showRefusal`), naming the point and the scale. The point drags use the same context, so
the slider and the editor ask one predicate. With no petal yet built from the curve (the mode just switched) it
does not refuse — the build then lifts and tells, #417's clamp-and-tell for what was not dragged.

**Saved designs reshape.** A design saved since `1bb7c35` with CURVE and a Petal width other than 16 mm loads
with its curve's widths scaled. No migration (Eva's instruction).

## 3. Found and fixed — a #417 defect in the sepal twins

`sepalTwinControls` instances the sepal's tapers and tip shape from the petal rows, and `twinPredicate` maps ids
but not refs — so under #417 the sepal twins carried the PETAL's `outlineFromLaw` and **hid whenever the petal
outline was CURVE, while the sepal (pinned LAW by `sepalBladeState`) still read every one of them**: hidden and
live. `twinPredicate` now drops the petal's outline-mode refs (`PETAL_OUTLINE_REFS`); the twins show whenever the
sepals do. Found by the matrix moving, not by a gate: extending the petal predicate gave the twins a `layerCount`
driver and the blanket sweep re-filed them into block 7. Which also needed `LAYER_SUBS` to require hidden-at-the-
defaults like every other `*_SUBS` derivation — identical on main (10 of 10) — so the LAW shape controls stay in
the blanket sweep and `ALL MAX` / `ALL MIN` are untouched. **The live matrix's definitions are identical to
main's on all 1315 common rows** (measured: 0 rows differing), plus block 66.

## 4. Measured

**The throat seam.** EXPORT, the shipped builder, one petal per state:

| State | Throat half | Hand's first point | Step | Seam turn | Narrowest row gap near the throat | Tris (CURVE / LAW twin) |
|---|---|---|---|---|---|---|
| default curve on the default tube (8 × k 0, h 0.25) | 7.391 mm | 1.750 | 0 | 58.22° | 0.0179 (uniform) | 24,672 / 24,672 |
| a lobe curve, h 0.10 | 4.105 | 3.500 | 0 | 14.10° | 0.0179 | 28,160 / 28,160 |
| a lobe curve, h 0.40, BLEND 0 | 7.953 | 3.500 | 0 | 3.07° | 0.0195 | 21,888 / 21,888 |
| a lobe curve, h 0.70 | 6.246 | 3.500 | 0 | 54.37° | 0.0179 | 35,904 / 34,848 |
| the bell (5, tilt 75, cup 0.6, h 0.40) | 7.953 | 3.500 | 0 | 3.07° | 0.0195 | 14,792 / 14,792 |
| the trumpet (5, tilt 85, 50 mm, curl −45, h 0.58) | 7.194 | 5.000 | 8.9e-16 | 50.08° | 0.0139 | 21,292 / 20,892 |
| a slit tube (6 × k 2) | 7.391 | 3.500 | 0 | 12.90° | 0.0179 | 23,880 / 23,880 |

- **No step on any state** — the pin is exact to the last bit (one ulp on the trumpet). That is the call's
  requirement, and it holds.
- **FINDING — the seam is C0, not C1, and the corner can be large.** The seam turn is the angle between the law's
  slope arriving at the throat and the PCHIP start tangent of the pinned curve leaving it. It is small where the
  hand's curve was drawn as a lobe (3°–14°) and large where a curve drawn for a WHOLE petal is laid on a lobe (the
  default curve's first point is 1.75 mm against the tube's 7.39 mm, so the pinned start falls steeply into its
  second point: 58°), or where a long tube meets a lobe that widens again (54°, 50°). The corner sits inside the
  tube's 8 mm fusion blend above the ring, where the petal's own section is still being blended in from the ring,
  so it is softened on the object; the sheet's close-ups (§6) are the evidence. **Matching the slope as well as the
  width (a Hermite start, or pinning the curve's first tangent to the law's) is the obvious next step and is NOT
  built** — it would change the curve the hand drew, and the call was the width.
- **FINDING — on a long tube the BLEND notch is drawn deeper than its own law asks, and the cause is a row count
  standing for a length (CLAUDE.md's first durable rule).** The notch's U is cut by lowering the ring's top rows by
  `depth / spacing` rows, `spacing` being the mean of the ring's top four row gaps — exact only if the rows below
  are spaced the same. On a LAW tube they nearly are; under a CURVE lobe the ladder's rows near the throat are
  denser than further down, so the same row count reaches further. Measured as midrib arc from the ring's top to
  the dipped row, 5 petals, BLEND 1, EXPORT:

  | fusion height | LAW: asked → drawn | CURVE lobe: asked → drawn |
  |---|---|---|
  | 0.40 | 2.713 → 2.719 mm (1.002) | 2.787 → 2.790 (1.001) |
  | 0.58 | 5.355 → 5.334 (0.996) | 7.009 → 8.634 (**1.232**) |
  | 0.70 | 7.372 → 7.442 (1.010) | 9.089 → 12.337 (**1.357**) |

  The asked depth itself is larger on the lobe because the curve's margin leaves the throat nearly vertically
  (lean 3.9° at 0.70 against the LAW's 25.2°), and the notch's U is tangent to the margin at its lean — that half is
  the BLEND law working. The overshoot is not. **The fix is the dip law reading the midrib's own arc length instead
  of a row count, and it is NOT taken here**: it moves every LAW tube's notch by up to 1% (the ratios above), which
  is a byte move on block 45 that Eva's partition for this session forbids (LAW rows move 0 floats). It is the first
  item of §8. **TU2 found it** — its seam probe sampled a fixed 0.6 of the ring, which assumed the notch never
  reached that deep, and at 0.70 the U's bottom is row 20.2 of 37; TU2 now samples below the drawn notch's own row
  (`R1 − depth / spacing`), which leaves every LAW state's window exactly as it was. The seam is closed below the
  notch and the solid one piece on every state (TU2, TU6).
- **The ladder does not pile at the throat**: the narrowest row gap within 0.06 of the throat is the uniform
  spacing or wider on every state but the trumpet (0.0139 against 0.0179 — rows drawn toward a 50° turn, not
  stacked; the de-dup floor is 1e-5).
- **Triangle counts equal the LAW twin's** except where the lobe moves the ladder and the ring's flare rows with
  it (h 0.70 +1,056, the trumpet +400). Both modes agree to the integer on every state.
- **Infill on a tubular CURVE petal refuses with a word — the tube's own.** The tube is pinned off under the
  Voronoi infill (`tubeEligible`), and the panel's TUBE caption says "the petals are infilled"; the petal builds as a
  free CURVE blade, bit-identical to the base tree's (a holder in §5).

**The census.** `bloom-census-sweep` over block 66 in EXPORT: **0 within-shell pairs on all 19 rows**, the bell and
trumpet LAW twins included. No xfail entry was needed.

## 5. The byte partition

Predeclared from this tree's guards (`--movers-predicate outline2`: a row moves iff CURVE AND (width scale ≠ 1 OR a
whorl actually fuses)), every row of the live matrix in both modes against a worktree of `1bb7c35`:

PARTITION-RESULT

- every LAW row, every CURVE row at 16 mm (all of #417's block 65), the GATED row, and the infill × tube × CURVE
  row (the tube refused, a free blade on both trees) hold to the bit;
- the movers are the CURVE rows of block 66 that scale or fuse — exactly as the predicate predeclares.

`verify-bloom-surface-bytes.mjs` gained the `outline2` predicate.

## 6. The gates

- **OC3 (new):** the plan's width scale against the ring's own Petal width over the ruled 16 mm
  (`OUTLINE_WIDTH_REF_RULED_MM`, restated, with the registry default asserted against it at harness load); a
  throat recorded iff the restated tube plan fuses this whorl (the registry's predicate and the ruled snap), at the
  CONTROL's fusion height; the pinned first point equal to the LAW restated from the ring's own tapers and tip
  shape at the throat (1e-9 mm). Both STL gates are blind to all of it.
- **OC1 / OC2 / AN1 / AN2** restate the scaled, throat-laid curve from the control's points through the one PCHIP
  (`restatedOutline(ctl, L, { scale, throat })`) — below the throat the restated LAW, above it the curve.
- **`verify-bloom-tube.mjs`** gained seven CURVE states (h 0.10 / 0.40 / 0.70 × BLEND 0 / 1, a slit, the bell, a
  22 mm petal) and a TU0 eligibility row: TU2–TU6 (seams closed below h, slits open, coincident area, mode parity,
  watertight and one piece) on a CURVE lobe. **PASS — TU0-TU6 hold over 50 states × both modes (113 s)**, after TU2's window was corrected to sample below the drawn notch (the finding in §4).
- **Five mutants**, each witnessed on the mutated module's own petal record, scoped to four F6-sym-2 rows of the
  apex table:

  | mutant | names | fired |
  |---|---|---|
  | `the-outline-width-scale-is-ignored` | OC3, OC1 | AN1, OC1, OC2, OC3 |
  | `the-width-scale-moves-the-positions` | OC1 | AN1, OC1, OC2 |
  | `the-curve-starts-below-the-throat` | OC1 | AN1, OC1, OC2 |
  | `the-throat-width-is-not-pinned` | OC3 | OC1, OC3 |
  | `the-validator-and-the-build-disagree-on-the-scaled-floor` | OC2 | OC2 |

  Run as a SUBSET (`--only=` these five plus the three #417 outline mutants and `plateau-returns`, 8 of 188 — not a
  sweep): the clean tree is silent on every row, and every mutant fires every family it names.

  Two #417 anchors moved with the change and were re-anchored (`the-outline-curve-is-ignored`, the validator floor
  mutant), as was `plateau-returns`; `--anchors` reads 188 of 188.

## 7. Matrix, smoke, frozen phase

- **Block 66 is nineteen rows** (1315 → 1334): the default curve at 8, 24 and 30 mm; the spoon at 30; a width set in
  LAW before the curve (lifted and told, never a refused drag); and on a tube — the default curve on the default
  tube, a lobe curve at h 0.10 and 0.70, at h 0.40 with BLEND 0, a slit (6 × k 2), the spoon as a waisted lobe, a
  22 mm petal (scale and throat together), base taper 2 below the throat, three whorls with only the first fused,
  the BELL and the TRUMPET each with its LAW twin, and the infill (the tube refuses).
- **Smoke block 66 is six rows**; `--check` reads 252 rows over 62 blocks, 185 families both ways.
- **`frozen/phase72` is the 1315 rows at `1bb7c35`**, generated from that commit's own `buildMatrix()`, registered
  in both maps and proved deep-equal (`--verify-frozen --phase72`: PASS).

## 8. Not done, and named

- **The notch's depth in rows** (§4): the dip law should read the midrib's arc length, not `depth / spacing`. Its
  own session, because it moves every LAW tube's notch (up to 1% on block 45) — a byte partition of its own.
- **The seam's slope** (§4). A width pin is C0; a slope pin is the follow-up if the corner reads on the object.
- **The sepal contact scan** draws the sepal angle limit against FREE petals on a tubular bloom — the tube's own
  pre-existing state (`docs/bloom-tube-outcome.md`), now with the curve on the lobe the scan does not see either.
- **Scoped widths:** the width drag's refusal moves every built petal's scale by the candidate's change, so a layer
  that OWNS its width (Q3.5) is asked about a change it will not take — conservative (it can refuse a drag that
  would not have reached a narrow owned layer), never permissive.
- **Two-sided outlines, per-scope outlines, sepals and leaves** remain their sessions (Q6.5, Q6.7).

The sheet is `node tools/shot-bloom-outline-curve-2.mjs <dir> --png docs/img/outline-curve-2.png`: one curve at
8 / 16 / 24 mm on one camera; the bell and the trumpet each beside its LAW twin, top and profile, with the editor;
and the throat seam close up on both. Print preview on; J, C, AN and OC asserted before every shutter; no pixel
delta is quoted.
