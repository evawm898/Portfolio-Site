# The outline curve — F6-sym: a drawn symmetric petal outline

*Session of Oct 17. Feature map §5 and §11 (Q6.1 – Q6.4, Q6.7). Petals only, symmetric mode, one global
curve. Two-sided (asymmetric), per-scope outlines, sepals and leaves are later sessions. Read
`docs/bloom-curve-editor.md` for the widget and the value, `docs/bloom-spine-curve-outcome.md` for the
wiring this follows, and CLAUDE.md's `widthProfile`, apex nib and edge profile blocks.*

## 1. The rulings it carries (not re-litigated)

| Ruling | Where it lives |
|---|---|
| The outline mode is a CHOICE: LAW (today, default, byte-identical by branch) or CURVE | `petalOutlineMode` (registry, a CHOICE, so it is out of the blanket sweep and `ALL MAX` is untouched); `outlineIsCurve(state)` in the geometry |
| CURVE replaces the ENTIRE boundary law, both width and apex shape | the CORE term's CURVE arm in `widthProfile`; `petalBaseTaper`, `petalTipShape`, `petalTipTaper` and `petalTipEnd` are hidden (`outlineFromLaw`) and inert (the arm reads none of them) |
| Teeth, lobes and fringe are disabled and hidden in CURVE | `fringeEngaged` and `lobesEligible` both gain `!outlineIsCurve(state)`, in the geometry and the registry (the two statements); `fringeCount` hidden |
| The curve starts ABOVE the root blend; the foot and root blend stay the hub's (Q6.2) | the root blend is still its own term, `max`-ed under the curve exactly as today |
| The curve shapes the outline down to the 1.6 mm tip width (`TIP_HALF_MM`); the existing round nib closes it (Q6.3 / Q6.4) | the last point is held at (1, 0); the nib takes over at the curve's crossing of `TIP_HALF_MM` |
| Points are fractions of the length; the drawn length ALWAYS equals the length slider (Q6.1) | the nib is `leafNibPlan`, which SOLVES its start so the blade ends at exactly the asked length (`toLaw` is the identity) |
| Symmetric = one half-curve mirrored about the midrib | the spec's `modes: ['symmetric']`; the half-width is the curve, and both margins read it |

## 2. The design — a term inside `widthProfile`, never a second owner

**The curve is the CORE term's CURVE arm.** `widthProfile`'s term list keeps its shape: CORE, STALK,
TERMINAL, then `shapeWinnerRaw` / `shapeBaseRaw`. With `outlineIsCurve(state)` (and the part not a petiole,
chevron or stalk — leaves, sepals and the leaf chevron never reach it), CORE's `at` is
`outlinePlan.halfAtMm(u)`, the peak `uPk` is the curve's argmax, the TERMINAL is zeroed and the fringe
block returns null. Everything downstream reads the curved outline through `widthProfile` unchanged:

- the nib
- the edge bead (`rimInsetV`, `emitRimLoop`)
- the ladder (`bladeStations`' turning measure)
- the rim arc table and the lamina
- the infill
- the form laws (cup, buckle, apex sweep), which read the drawn half-width

**The evaluator is the editor's own PCHIP, exposed as a function.** `bloom-curve.js` gained
`curveFunction(points, spec)`, the exact Fritsch-Carlson evaluator. It is valid on monotone-x specs only,
returns null outside the x range and the exact y at a control point. `samplePchip` was refactored to share
its tangents and its Hermite step (`pchipTangents`, `pchipHermite`). **The sampler's output is
bit-identical to `main`**, measured over 2,000 seeded point sets (same hash). The evaluator agrees with the
sampler to 1.8e-13 at the sampler's own stations. CLAUDE.md's rule that consumers call `curveSamples`, never
the law, still holds: `curveFunction` is the law's owner, in the same file.

**The nib is the leaf's construction, and that is what makes the length exact.** `apexNibPlan`, the
petal's, reparameterises the length and overshoots it by up to +0.124 mm (its read-out says so).
`leafNibPlan` solves its start so the blade ends at exactly `petalLength`, which is ruling Q6.1 to the
letter. It runs in its three regimes:

- FLOOR: a told corner where the curve's slope cannot reach the nib's arc tangentially
- TANGENT: C1
- STEEP: a round end

The record carries `regime`, `kinkDeg`, `startHalfMm` and `uCross`. **On all five sheet shapes the regime is
FLOOR**, and the corners are: default 4.34°, tail 0.34°, spoon 2.34°, rect 1.75°, diamond 4.79° — under the
45° the edge gate allows, and under the leaf's measured 24–27° worst.

**The width floor is one predicate on one set of doubles.** `outlineCurvePlan(curve, L)` is the one owner
of which points the build draws:

- the last point is held at y = 0
- every other point with `y·L ≤ TIP_HALF_MM` is lifted to `(TIP_HALF_MM + OUTLINE_LIFT_MM) / L`
  (`OUTLINE_LIFT_MM` = 2⁻¹⁰ mm, exact in IEEE-754)
- each lift is recorded with its asked and built width

`outlineCurveRefusal(curve, state, askedLengthsMm)` is the editor's validator and is that very predicate:
it refuses exactly what the build would lift, at every asked length the build on screen drew (the spine
curve's `ctx.askedLengthsMm`, unchanged). A loaded curve, or one a later slider made too narrow, is lifted
and TOLD on the OUTLINE CURVE read-out line (Q4.4's clamp-and-tell for what was not dragged). PCHIP is
shape-preserving, so between two points that clear the floor it cannot dip under the lower of them, and
the curve crosses the floor exactly once, in its last span: the run-out the nib owns. OC2 asserts that a
curve the validator accepts is never lifted.

## 3. Decisions made without a ruling

Each is reversible and named so it can be overruled.

1. **`petalWidth` stays visible in CURVE mode and sets the FOOT only** (the foot width through
   `footDelicacy`, the ring through the area rule). Its read-out says so. The blade's width is the curve's.
   Hiding it would have made the foot unreachable; making the curve set the foot would have contradicted
   Q6.2. *Undo:* the `petalWidth` row's fmt.
2. **The tube is unavailable in CURVE mode** (`tubeEligible` gains `outlineFromLaw`). Its sinus law reads
   the LAW's apex. Wiring it to a drawn outline is the tube's own change. *Undo:* one predicate term in two
   files.
3. **`NU` is `NU_BASE` (56) in CURVE mode.** The apex row ramp (`bladeRowsFor`) keys on `petalTipShape`,
   which is inert here. A curved apex is placed by the turning ladder like any other stretch.
4. **The default curve is the shipping LAW petal read off at six stations**: `[0, 0.05]`, `[0.15, 0.16]`,
   `[0.36, 0.2286]`, `[0.7, 0.178]`, `[0.9, 0.1]`, `[1, 0]`. Switching the mode on therefore reshapes the
   default petal by a hair, not a jump.
5. **The spec's y box is 0 to 0.5 of the length** (a blade as wide as it is long), with 2 to 12 points.
6. **Sepals and leaves are pinned LAW** (`sepalBladeState`, `leafBladeState`, and the sepal contact
   scan's state). Q6.7 rules that they get outlines too; that is their session's work, and pinning them
   keeps a petal outline from reaching them by inheritance.

## 4. Measured

**Every CURVE build is 24,688 triangles in both modes, the shipping default's count to the integer**, at a
drawn length of exactly the asked length (35.000 on the default; AN2 and C1 hold it to 1e-9 on every
block-65 row).

**Infill works on a curved outline, including the waisted, non-convex spoon.** No refusal word was needed.
Holes / solid cells at the ruled defaults:

| Shape | Holes | Solid |
|---|---|---|
| default | 15 | 5 |
| long tail | 4 | 16 |
| spoon | 10 | 10 |
| near-rectangle | 17 | 3 |
| sharp diamond | 10 | 10 |

The tail's long narrow run is where the 1.50 mm hole bar refuses holes: the ruled achieved-count behaviour,
not a failure. The two infill rows of block 65 export watertight with 0 degenerate triangles and 0
within-shell pairs.

**The ladder places rows by turning, and a sharp curve gets them.** Apex chord error, EXPORT, 56 rows,
against a uniform ladder at the same count (`node tools/bloom-outline-curve-measure.mjs`):

| Shape | Turning ladder | Uniform |
|---|---|---|
| default | 0.0166 mm | 0.0418 |
| long tail | 0.0031 | 0.0875 |
| spoon | 0.0383 | 0.0355 |
| near-rectangle | 0.1031 | 0.1218 |
| sharp diamond | 0.0150 | 0.0806 |

**The spoon is the one shape where the ladder is not better at the apex** (0.0028 mm worse). Its blunt
round tip carries little turning compared with its waist, so the ladder spends rows at the waist. The
difference is under a hundredth of the print floor.

**FINDING — the diamond's crest is where the gap bound limits the ladder.** The diamond's widest point is
a crest of about 0.67 mm radius at u 0.449. The worst chord turn is 36.25° there. Station gaps at the crest
are about 0.015 against a uniform 0.0179: the ladder concentrates, but only so far, because the blend
lands at 0.336 under `LADDER_MAX_GAP_FACTOR` 1.40. Middle-zone chord error reads 0.0407 mm against 0.0570
uniform. This is session 39's typed constant doing a third job (after the blend bound and the lobes'
reserve), and the same caveat applies: if that arm is ever re-derived, retake this measurement.

**Export gate over block 65:** 16 of 16 rows reach the results, watertight, degenerate 0, and **0
within-shell self-intersection pairs on every row**. No xfail entry was needed. Sagitta worst 0.1654 mm,
on the tail at u 0.028. That is the root blend, as everywhere else, not the curve. By zone: base 0.1654,
middle 0.0407, apex 0.1031.

## 5. The gates

**OC0–OC2 are the new family, and both STL gates are blind to all of it.** A curve ignored, a curve applied
to the foot, a law shape drawn instead, or a refused point built: each exports watertight, as one
piece, at the same triangle count.

- **OC0**: the record against the CONTROL, in both directions.
  - the ladder is `BLADE_ROWS`
  - the last ring builds no lobe and no fringe (fringe tipEnd 0, count 0)
  - the built points equal the control's own
- **OC1**: the IDENTITY. `petalRingProfileBase` (the emitted half-widths before cut and floor) equals
  `max(the curve restated from the CONTROL's points through bloom-curve.js's own PCHIP, the root blend
  footHalf·(1 − u/ROOT_BLEND_END))` within 1e-9 mm, up to the nib's crossing. Both terms are restated in
  the harness (`restatedOutline`). The reference's owner is the control and the editor's sampler; the
  measured side is the builder's emitted array. It requires at least three rows, one of them under the root
  blend, so it is never vacuous. **Measured worst difference: 0.**
- **OC2**: the refusal against a restated bar; lifted iff refused; an accepted curve never lifted; the
  declared peak against the restatement.
- **AN1 / AN2 gain a CURVE arm**: the drawn length is the asked length within 1e-9, and `leafNibPlan`
  rebuilt on the restated law agrees field for field. **C1** asserts the same length in its own family.
  **A4** reads the terminal as 0, **FR2** the fringe as unasked, and **A5 / A6**, which are statements about
  the superellipse, are skipped in CURVE with the reason.

**Five mutants, each witnessed on the mutated module's own emitted outline** (`verify-bloom-apex-mutants.mjs`,
scoped to two outline rows by `for:`):

| Mutant | Named | Fired |
|---|---|---|
| `the-outline-curve-is-ignored` | OC1 | OC1 (+AN1, AN3) |
| `teeth-still-cut-in-curve-mode` | OC0 | OC0 (+L1) |
| `the-outline-curve-reaches-the-foot` | OC1 | OC1 |
| `the-outline-length-is-not-fitted` | AN2, C1 | AN2, C1 (+AN1, OC1) |
| `the-outline-validator-and-the-build-disagree-on-the-floor` | OC2 | OC2 |

The clean control is silent on both rows. `--anchors` reads 183 of 183 and every anchor matches once.

Two existing anchors were moved by this change and re-anchored: `plateau-returns` (apex table) and
`nu-sticky` (`verify-bloom-build-order.mjs`). A sweep of every tool's anchors against this tree found no
other moved or doubled anchor. The outline refusal spells its null check `worst === null` for that reason:
`if (!worst) return null;` is the spine mutant's anchor and would have matched twice.

**The design file** carries the curve as a field like any other control (F0's census: 173 table rows over
173 registry controls). **F9** asserts the round trip: a spoon in CURVE mode round-trips verbatim with no
note, and an out-of-order outline is refused whole and told.

## 6. The byte partition

Predeclared from the build's own predicate (`--movers-predicate outline`: a row moves iff
`outlineIsCurve`). Measured over the whole live matrix in both modes against a worktree of `8d8fba1`:

**PASS — 15 MOVED / 1,300 HELD over the 1,315-row live matrix, in both modes, positionally under
`Object.is`.** 0 floats moved on any holder, over 1,612,173,924 export floats (179,130,436 triangles) and
79,417,516 captured-grid values. Every one of the 15 predeclared movers moved.

- **The 15 movers are block 65's CURVE rows**, exactly as the predicate predeclares.
- **The 1,300 holders are all 1,299 of main's rows, plus block 65's GATED row** (LAW mode with a spoon
  stored, so the curve is hidden and inert). That row reads bit-identical to the default through the base
  tree, whose geometry has never heard of the field.
- So every LAW row moves 0 floats in both modes. The partition was run as three range shards closed by
  `--merge`.

`verify-bloom-surface-bytes.mjs` gained two things, both needed before it could build this matrix at all:

- the predicate
- the `@scopes` handling the role retirement made owing: it now skips `SCOPES_SET_ID` in `stateOf` and
  hands the build `rowScopesForBuild(row)`

Without the second, every row carrying scopes would have built without them, silently.

## 7. Matrix, smoke, frozen phase

- **Block 65 is sixteen rows**, taking the matrix from 1,299 to 1,315. Shapes:
  - the default curve, the long tail, the spoon, the near-rectangle and the sharp diamond
  - the hidden law family set, and a loaded under-floor curve (lifted and told)
  - the tail at three whorls
  - the default curve at 20 mm and at 60 mm
  - the default curve and the spoon under infill
  - the spoon under cup 0.6
  - the diamond under CONTINUOUS × 3 turns
  - the tail with five sepals (pinned LAW)
  - and the GATED row: LAW mode with a spoon stored, bit-identical to the default
- **Smoke block 65 is five rows** (246 rows over 61 blocks; the family census holds both ways, 184
  families).
- **`frozen/phase71` is the 1,299 rows at `8d8fba1`**, generated from a worktree of that commit. It is
  registered in both maps and proved deep-equal (`--verify-frozen --phase71`). It is 71 because phase70
  is the role retirement's.

## 8. Not done, and named

- **Two-sided outlines, per-scope outlines, and outlines on sepals and leaves** (Q6.5, Q6.7): the
  following sessions. The spec's `modes` lists `symmetric` only, because a mode a spec lists is a mode a
  hand can reach.
- **`bloom-curve.js` is in no workflow's path filter** (the curve editor session recorded this, and
  workflows were off-limits here too). A change to it alone runs no gate.

The sheet is `node tools/shot-bloom-outline-curve.mjs <dir> --png docs/img/outline-curve.png`. It shows:

- the long tail, the spoon, the near-rectangle and the sharp diamond, each beside the nearest LAW petal,
  print preview on, top and profile
- the editor
- two infill cells

The junction, curl and nib families are asserted before every shutter. No pixel delta is quoted.
