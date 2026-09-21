# Session 36 — every petal shell wound outward, and the two checks that were built are now gates

**Status: BUILT, VERIFIED FOUR WAYS, GATED; pushed once with the docs folded in; merge on all seven verify jobs green.** The merge sha is in the final report, not here.

Eva's ruling (session 36): *fix the petal shell orientation; do not touch the root
blend — it is a separate session and its brief is below.* Both findings are session
35's (`docs/bloom-session-35-outcome.md` §8), established there from the builder
by two independent methods and not fixed there on the ruling that they are separate
defects with separate causes.

---

## 1. The defect and the fix

`emitPanel` (`bloom-geometry.js`) offsets the top skin along `+n` and, until this
session, wound every quad so that all six triangles touching a top-skin point pointed
INTO the sheet. The comment beside it — *"Top face (outward = +N side)"* — was never
checked and was false from the day the emitter was written. `buildHubInto` uses the
opposite convention, which is why the hub alone read positive.

**The fix is one shape applied to all six quad emissions in `emitPanel`:** each quad
is emitted as `(a, d, c, b)` where it was `(a, b, c, d)`. Under `MeshBuilder.quad`
that is the same two triangles as vertex sets, each with its winding reversed. The
two skins, the two side rims and the two end caps all reverse together, so the shell
stays one consistent surface — now outward. The comment says what was measured and
names the gate that checks it.

**Six gates passed on the inside-out solid and still pass on the corrected one**
(watertight, connected, manifold, degenerate-free, panel, grid): winding direction is
invisible to every one of them, which is why it survived. It mattered because the
export contract leans on a slicer UNIONING overlapping closed shells, and a union
handed a negative-volume shell can subtract it.

## 2. Verified four ways

All four on the EXPORT mesh (the object), the first two over the whole 624-row
live matrix.

**(1) Per-shell signed volume, divergence theorem** — `orientation()` in
`tools/bloom-self-intersection.mjs`, on the float32 the STL stores (which agrees
with the builder's doubles to the bit on sign, parity and total: measured on three
rows through a real browser export, 171,360 / 595,440 / 171,360 floats `Object.is`-
equal to the Node build rounded with `Math.fround`).

| | `main` at ead8624 | this tree |
|---|---|---|
| rows with an inward shell | **624 of 624** | **28 of 624** — every one a SPHERE row, its one inward shell the hub's inner sphere |
| rows with a negative total volume | 613 | **0** |
| shipping default (8 × 1) | hub +294.07, 8 petals at −515.19, total **−3,827.4** | 9 of 9 outward, total **+4,415.6** |
| Eva's 7 × 4 | 29 shells, 28 inward, **−6,465.4** | **29 of 29 outward, +7,809.4** |
| 40 petals CONTINUOUS | 41 shells, 40 inward, −20,480.5 | 41 of 41 outward, +23,421.2 |
| cup 1.20 × tip 2.45 | 8 of 9 inward, −6,497.9 | 9 of 9 outward, +7,086.1 |

**The SPHERE head's inner sphere is inward BY DESIGN and on both trees**: the hub
there is two concentric closed spheres sharing no vertex, and the inner one is the
hollow's inner face — a union subtracts it and leaves the shell of thickness t.
−1,866.1 mm³ against the outer +2,889.3 on the sphere default. The O1 baseline
declares it (exactly one inward shell under `sphereMode`, smaller than the largest
outward one) rather than pretending it away; 28 rows, one each, none anywhere else.
The first draft of the harness header claimed the two spheres were welded through
the apex fans and read as one positive shell — **that was written before it was
measured, and it was wrong**, the eighth instance of the label-naming-a-computation
defect this project has found. It lasted one hour because the full sweep ran.

**(2) The ray-parity test, agreeing shell for shell** — the second method in
`orientation()`, a ray from just outside each shell's largest facet along its own
normal. On every row the census reads clean, the two methods agree on every shell,
both trees. **Where they disagree, the shell passes through itself**: 495 shells on
62 rows on this tree (489 on 59 on `main`), every one a petal, every one on a row in
the xfail list, and NO clean row disagrees. Parity has no meaning on a
self-intersecting shell, so O2 is asserted on rows not declared self-intersecting
and reported on the rest — a scoping that was measured, not assumed.

**(3) `node tools/bloom-self-intersection.mjs --orientation`** — the unit cube reads
**+1.0000** wound outward and **−1.0000** reversed, both methods agreeing on both;
the four bloom configurations above all read 0 inward; the positive control that
reverses every triangle of the shipping default moves the verdict 0 → 9 of 9 inward
and +4,415.6 → −4,415.6 mm³.

**(4) A re-export of Eva's own configuration**, `petalCount 7 layerCount 4`, through
the real page and the real Get STL click: **29 of 29 shells outward, total
+7,809.4 mm³** where `main` reads −6,465.4. And `node tools/verify-bloom-export.mjs
--only "^DEFAULT"` through the wired gate: 9 of 9 outward, methods agree, 0
within-shell pairs, X0 identical.

## 3. The byte question — what is invariant and what changed

**Do not claim "0 floats moved" — it is false.** Reversing a winding moves no vertex,
but it changes the order of the three vertices within each facet and flips the facet
normal three's `STLExporter` derives from that order, so the float stream and the STL
bytes differ on every row with a petal. What is true is narrower and was MEASURED,
not argued, by `node tools/verify-bloom-winding-bytes.mjs --base <worktree of
ead8624>` over the full live matrix, both modes:

| claim | measured |
|---|---|
| the triangle COUNT is unchanged on every row-mode | 1,248 of 1,248 |
| every triangle has exactly one base triangle with the same UNORDERED vertex set | 72,666,576 of 72,666,576 |
| every coordinate inside a matched pair is `Object.is`-equal | 653,999,184 of 653,999,184 |
| every shell that is NOT a petal is IDENTICAL IN ORDER, float for float | 9,234 shells (hub, rods, anthers, style, lobes) |
| every petal shell is wholly REVERSED — each triangle the base's with `(a,b,c) → (a,c,b)` up to rotation | 29,492 shells = the builder's own petal tally on every row |
| a reversed triangle sits within ONE emission slot of where the base emitted it | 69,483,152 of 69,483,152 (the two triangles of a quad swap slots under `(a,d,c,b)`) |
| each triangle's divergence term is the EXACT negation of the base's | to the bit |
| per-shell volume MAGNITUDE | equal to **2.39e-14 relative** — summation order only |
| the base tree's inward shells are exactly its petals (plus the sphere's inner face) | 1,248 of 1,248 |

**The volume magnitude is NOT equal to the bit, and the first version of the tool
asserted that it was.** The shell total is a sum whose ORDER changed when the quad's
triangles swapped slots, so it agrees to summation rounding (4e-16 on the shipping
default). The per-triangle terms negate exactly in IEEE-754 and that IS asserted.
Recorded so nobody re-asserts the bit claim. `--control` perturbs one coordinate by
1e-9 and the multiset match fails on it; a run in which no shell was reversed refuses
to pass as vacuous.

**Is a frozen phase owed?** No, and it was checked rather than assumed:
`FROZEN_MATRICES` hold ROW DEFINITIONS — labels and control sets — and
`--verify-frozen` has never compared a byte (CLAUDE.md, session 24). No row was
added or moved, so every frozen definition reproduces. What DOES change is that the
STL byte hash of every frozen baseline moves on every row with a petal — all of
them — so **every frozen tag from phase2 to phase23 joins phase17, phase19 and
phase21 as a tag whose definitions reproduce and whose BYTES do not**; unlike those
three, the surface under the bytes is unchanged, and the winding tool above is the
instrument that says so where `diff-bloom-bytes.mjs`'s ordered hash cannot.

## 4. Two gates landed, and a defect in the instrument on the way

**The O family (O1, O2) in BOTH STL gates; the X family (X0, X1, X2) in the export
gate** — `orientationAssertions` / `selfIntersectionAssertions` in
`tools/bloom-harness.mjs`, read per row from the row's own STL, both workflows' path
filters carrying `tools/bloom-self-intersection.mjs`. The smoke census claims all
five (O1/O2/X2 on the default row, X1 on the roll clamp, X0 on the cleft
capability); 53 families asserted, 53 claimed, negative control passing.

**The orientation baseline is ONE DECLARATION, not an xfail list**: `inward === 0`,
or exactly one under `sphereMode`. Before this fix the honest baseline was "the hub
outward, every petal inward", and the fix is what trips that form — which is what
makes a baseline a gate rather than a record.

**The self-intersection xfail list is 318 rows of 624, measured on `main` at
ead8624, each named individually** in `SELF_INTERSECTION_XFAIL` with its pair count
and worst span: 138 rows at three layers or more (the root blend, §5) and 180 at one
or two (the form's own apex folds — cup, cup gradient, roll, curl 360, buckle — and
the three families below). A listed row that starts reading 0 fails X1 HARD; an
unlisted row that starts reading pairs fails X2; an entry naming a row the matrix
no longer has fails the matrix-level clause. **Two things in that list are not
petal defects and are recorded here so they are not mistaken for them:**

* **34 rows read exactly 272 pairs, and they are every row with a STYLE.** The style
  is rooted THROUGH the hub slab on the axis, where it shares the hub's apex vertex,
  so the census's vertex-welded "shell" fuses rod and hub into one and counts the
  rod's passage through the slab — a by-design overlap the export contract allows —
  as within-shell. Every site sits at z ∈ [−0.60, 0.60], the slab's own thickness.
  Stamens are rooted through the same slab off-axis, share no vertex with it, and
  read 0. That is a limitation of the census's shell definition (vertex-connected),
  not of the style, and it is written in the family's header.
* **The stigma's and the anther's lobes**: `ANTHER: 6 lobes at 90°` reads 619 and
  `STAMENS: 6 × the APEX CORNER` 45,539 — lobes sharing a tip vertex are one shell
  and their mutual overlap counts. Same class.
* **Every CLEFT row (9 of them, 4,629 pairs on the bare cleft)**: the cleft's lobe
  panels reach `PANEL_OVERLAP_ROWS` down into the base panel BY DESIGN and share its
  vertices, so the three panels are one shell and their designed overlap counts. The
  claw reads 0. **The first sweep missed this**: it applied each row's control set
  and not its `capability` hook, so the cleft rows were measured WITHOUT their cleft
  and the smoke run's export gate went red on `CAPABILITY: cleft` as a NEW
  self-intersection — the gate finding what the instrument that fed it had skipped.
  The eleven capability rows were re-measured on both trees with the capability
  applied (identical, both trees) and the table regenerated: 315 → 318 rows.

**X0 is new and is why the census reads the builder's doubles rather than the
file's float32.** Measured: on the flat shipping default the census reads **0** on
the doubles and **196** on the float32 STL — all 196 single-point touches of span 0,
none within 0.5 mm of any real site, manufactured by ~2e-6 mm of quantisation
against epsilons written for a mesh exact to ~1e-15 mm; on 7 × 4 it reads 671
against the real 364. Loosening the epsilons to the float32 grain would be this
instrument's third "epsilon that should have been a measurement". So X0 rebuilds the
row from the page's OWN read-back state with the row's capability and requires
`Math.fround` of every double to equal the STL's float at every index — the file is
then provably the build the census reads, and orientation stays on the file itself.

**Two defects in the census, both found by the first full-matrix run** (it had only
ever been run on 17 hand-picked states):
* its pair-dedup `Set` overflowed JavaScript's 2²⁴ limit on `ALL MAX` (636,096
  triangles) before returning anything — replaced by the canonical-cell rule, which
  keeps no record at all;
* **its count depended on the WINDING**: the segment–triangle test is not symmetric
  at the epsilon, so reversing every petal moved 40 of 624 rows by a few pairs and
  flipped one verdict (`ORCHID × ALL THIN × spread min`, 4 → 0) — which would have
  tripped X1 on a row nothing had fixed. Corners are now read in coordinate order
  (sorting by welded index was tried first and is itself stream-order dependent:
  29 rows still moved), and the census is identical on both trees over the 113-row
  check subset. **Calibration did not move under either change**: flat 0, roll-330
  18,776, curl-360 1,008, all-form 11,056; the cup rows moved by single digits
  (cup 1.20 × tip 1.70: 750 → 752; × 2.45: 771 → 777), and session 35's §7.4
  figures should be read with that.

**Cost, measured on a loaded four-core box**: orientation is milliseconds; the census
is 42 s on ALL MAX and **808 s on `DEPTH: 6 turns × layerSize min × petalCount 40`**
(565,632 triangles, 152,182 pairs), two rows over a minute, **41.6 minutes over the
whole matrix** — which is why the X family rides in the export gate only, the
print-safety workflow the wall instrument already rides in, rather than doubling
that on the flood-fill gate for the same answer. The export gate's four most recent
runs on this matrix took 125–134 min; expect ~150–170.

## 5. THE ROOT BLEND — a scheduled session, with its measurements attached

**Not fixed here, by ruling.** Recorded so the session that takes it starts from the
numbers rather than re-deriving them.

**The defect.** At `layerCount >= 3` the inner layers' petals cross THEMSELVES at the
root — a within-shell self-intersection, measured by `tools/bloom-self-intersection.mjs`
on the exported geometry, at the shipping defaults, with no cup, no buckle and no
sweep. Petal-against-petal crowding is a different quantity (`tools/bloom-crowding.mjs`
flags it) and is not this.

**The trigger is the layer count and nothing else** (session 35 §8.2, export mode, 56 × 10):

| petals × layers | within-shell pairs | at the root (z ≤ 3 mm) | at the tip |
|---|---|---|---|
| 8 × 1, 7 × 1, **40 × 1** | 0 | 0 | 0 |
| 8 × 2, 7 × 2 | 0 | 0 | 0 |
| 8 × 3 | 72 | 72 | 0 |
| 3 × 4 / 7 × 4 / 8 × 4 / 12 × 4 | 162 / 364 / 416 / 624 | all | 0 |

**It is the short petals.** At 7 × 4, grouping the 364 sites by shell and sizing each
shell by the radius its faces reach:

| petal reach | affected | pairs per petal |
|---|---|---|
| 11.9 mm (innermost layer) | 7 of 7 | 43 |
| 19.3 mm | 7 of 7 | 9 |
| 30.1 mm | 0 of 7 | — |
| 45.4 mm (outermost) | 0 of 7 | — |

**The mechanism**, read off the sizes: `layerSize` shrinks the BLADE while the FOOT
stays set by the hub ring, so a short petal has to collapse a full-width foot into a
short blade across a fixed `ROOT_BLEND_END` — and past some shrinkage the blend folds
through itself. Consistent with the controls: `layerSize` 0.90 takes 364 → **49**,
`petalTilt` 0 → **63**, and **`footDelicacy` 0.25 → 595** — a shipped control makes it
dramatically worse, which is why it belongs in this brief.

**The row list, measured on `main` at `ead8624` this session** (§4): every matrix row
that self-intersects at three or more layers is named individually in
`SELF_INTERSECTION_XFAIL` (`tools/bloom-harness.mjs`) with its pair count and worst
span. When the fix lands those rows go to 0 and X1 fails HARD on each until its entry
is removed — that is the fix announcing itself, and the list is the session's own
acceptance test.

**The design question that session has to answer, stated without pre-judging it.**
Three candidates, and they are not the same change:

1. **Should foot width scale with petal reach?** A shorter petal gets a narrower foot,
   so the blend collapses less. It moves the foot ring's area rule (`r_ring² = Σ r_foot²`)
   and therefore the hub radius on every multi-layer row.
2. **Should the blend LENGTH scale instead?** Keep the foot, let `ROOT_BLEND_END` grow
   with the collapse ratio so the same width change is spread over more of a short
   blade. It moves no ring and changes only where the blend ends on the shrunk whorls
   — but a longer blend on an 11.9 mm petal is a large fraction of the blade.
3. **Should `footRing()` give shorter petals narrower feet outright** — a per-ring foot
   width as a property of the descriptor, decided where the feet are placed?

**`footRing()` owns foot placement and that ownership is not to be worked around from
the blade side.** Whatever is chosen is `footRing()`'s to declare and `buildPetalInto`'s
to read — never a blade-side correction that re-derives a foot width the owner did not
declare (the registration rule, and every registration bug in this project's history).
J1–J4, the crowding raster, the read-out's foot lines and both frozen-baseline
comparisons all read the owner's numbers, so a change there is a partition event with a
predeclared mover list.

**Instruments the session inherits:** the X family in both STL gates (the acceptance
test), `node tools/bloom-self-intersection.mjs --stl <file>` for a single export, the
sagitta report on every export-gate row (the root blend already holds the worst chord
error on the blade at every exponent, session 32 §13), and `tools/bloom-crowding.mjs`
for the base it must not make worse.

## 6. RECORDED FOR EVA — the workaround that exists today

**A bloom of ONE or TWO layers exports free of self-intersection at any petal count,
with cup and buckle anywhere in range.** Measured, not inferred: the `petalCount` sweep 3..40 at one layer reads
**0 pairs on every row**, and so do 8 × 2 and 7 × 2. **But the ruling's clause "with
cup and buckle anywhere in range" is NOT what the census reads, and the read-out
says what it reads instead.** 145 one-layer rows self-intersect on `main`, every one
of them a FORM state or a cleft, and the sweeps that locate the edges (8 × 1, export, pairs):

| control | clean | folds |
|---|---|---|
| `petalCup` | −0.2 … 0.3 (0 pairs) | ±0.4 (2–4), 0.6 (6), **0.7 (135)**, 0.8 (380), 1.2 (752); −0.6 (13), −0.7 (134), −0.8 (384) |
| `petalCupGradient` | −0.4 … 0.4 | ±0.8 (360), 1.2 (720) |
| `buckleAmp` (f 3, p 3) | 0 … 0.2 | 0.3 and up (8 — the apex); at f 1 0.6 reads 225, f 2 85, f ≥ 4 0 |
| `petalRoll` | 0 … 180 | 270 (11,200), 300 (15,456), 330 (18,776) |
| `petalSpineCurl` | −180 … 270 | 360 (1,008) |
| `petalTwist`, `petalTipShape`, `petalApexSweep` | whole range | — |

Depth adds the ROOT fold; the form's own APEX folds (session 35 §7.4) are there at
any depth, two layers included (cup 1.2 × 2 layers: 1,528). So the honest sentence,
which is the one on the read-out: **one or two layers export free of
self-intersection at any petal count AT THE DEFAULT FORM, and what still folds a
single petal is its form — cup beyond about −0.2..0.3, buckle from 0.3×, roll from
270°, curl 360° — not the depth.** Measurement beats the ruling's phrasing here, and
the skill says to say so plainly.

It is printed where the layer count is set — the read-out's `ROOT BLEND AT N LAYERS`
line appears at three layers and up, says that the inner layers' short petals fold at
the root, and says on the same line that one or two layers export clean. The panel gate's
route (v) asserts the line in both directions. At one or two layers the line is absent,
which is the workaround stated by silence, and the sentence above is the one to keep.

## 7. What is NOT done

- **The root blend.** §5.
- **The apex self-intersection under cup** (session 35 §7.4: 752 pairs at the shipped
  tip shape with cup 1.20) is in the xfail list by row, not fixed — the combination gate
  session 32 §18a recorded is still the schedulable item.
- **V5's re-scope to a minimum-gap assertion** (session 35 §7.7) — proposed, not done.
- **A slicer has still never been handed a file.** §7.8 of session 35 stands: that
  reading outranks every instrument here.

---

**Verification record for this head.** `bloom-self-intersection.mjs` (calibration
unchanged) and `--prove-exclusion` and `--orientation`; `bloom-wall-thickness.mjs`
and its `--negative-control`; `verify-bloom-apex-mutants.mjs`; `verify-bloom-grid.mjs`
(585 checks / 19 rows); `verify-bloom-panel.mjs` with route (v); `bloom-smoke.mjs
--check` and `--check --negative-control` (53 families); `bloom-smoke.mjs --conn`;
`verify-bloom-winding-bytes.mjs --base <ead8624>` full matrix and `--control`; the
export gate on the default row through the browser. The full matrix on both STL
gates runs in CI on this push, which is the merge criterion.
