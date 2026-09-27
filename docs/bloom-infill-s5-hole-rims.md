# S5 — the hole rims take the edge profile

S5 of the Voronoi infill port (`docs/bloom-infill-port-plan.md` §6). Every hole
the infill cuts used to close with a **flat wall one sheet thick** — a 90-degree
cliff at both skins, round every hole, which is exactly what #278 removed from
the petal's own margin. S5 closes them with the edge profile, and gives every rim
in the generator **one owner**.

Picture: `docs/img/infill-hole-rim.png` (`node tools/shot-bloom-hole-rim.mjs
<dir> --base <worktree> --png docs/img/infill-hole-rim.png`) — a true
cross-section through one hole's rim on the base tree and on this one, the same
hole in 3D, the shipping-default petal and the whole bloom, all EXPORT mode (the
geometry print preview shows).

## 0. Eva's rulings, and what each became

| ruling | what shipped |
|---|---|
| hole rims get the bead with a SHORT taper — bead-only or ~0.3 mm, measure and say which | **bead-only**, measured (§2) |
| radius and segment count follow #278: 0.5 mm at full size, K capped at 4, smooth normals, scaling with drawn radius | #278's own `rimProfile`, `rimSegments` and closed-form bead normals, called with the hole's radius |
| narrow spans: the bead shrinks via the 0.45 × room clamp; report every location | `r = min(0.5, t/2, 0.45 × wall)` = **0.45 mm on every hole**; every clamped hole is a record on `infill.bead.clamps` and the read-out's third INFILL line says it |
| hole bar stays 1.50 mm | unchanged; I1 still measures the mid-plane aperture (§4) |

## 1. Measure first: the budget

Projected before a line of geometry was written — the rim goes from 2 triangles a
point (a flat quad) to 2K = 8 — by counting every hole-rim and outline-rim segment
`emitRim` drew on the base tree, in both modes:

| row | base (flat) | projected | **built** | of 1.5M |
|---|---|---|---|---|
| ruled defaults | 58,880 | 124,496 | **113,424** | 7.6% |
| `40 petals x 3 whorls` (the cost corner) | 712,512 | 1,332,672 | **1,162,112** | **77.5%** |
| `CONTINUOUS x 3 turns` | 121,100 | 205,388 | 178,690 | 11.9% |
| `petalTipShape 3.00` | 72,384 | 267,120 | 134,512 | 9.0% |

No shipped row crossed the ceiling in the projection, so the build went ahead; the
built counts are under the projection because the outline edges stayed flat (§5)
and only hole-rim points were beaded. **Every infilled row, both modes, is under
the ceiling and live == export**: `node tools/verify-bloom-infill-budget.mjs`
(B0–B2, every row that engages the infill, predeclared from the guard predicate,
each built fresh — the count is that build's own, never last-good). Its must-fail
sweeps the bead at 16 segments and B1 fires on the cost corner alone.

**The shipping default** (guard off) is untouched: 24,688 triangles, byte-identical.
**The infilled default bloom** goes 58,880 → **113,424** triangles (a 5.41 MiB
binary STL, was 2.81 MiB); the infilled default petal 7,336 → 14,154 (one-petal
bloom 14,346). The cost corner is `40 x 3` at 77.5% of the budget — the row a
future per-petal feature on infilled blades must check first.

## 2. Bead-only, and why a taper does not fit

The room for a bead on a hole rim is the wall the plan lays out: **1.00 mm** (I11
measures it at 1.000000 mm on every flat cell). The clamp arm binds —
`0.45 × 1.00 = 0.45 < 0.50` — on **every hole**, so each side of a wall is spent
0.45 mm of bead and **0.10 mm of flat is left down the wall's centre**. A 0.3 mm
taper has nowhere to go: it would have to live inside that 0.10 mm (0.05 a side).
And under #278's own distance law — which measures the taper from the ORIGINAL
boundary, `d = a + arc` — any taper shorter than the inset lies inside the bead's
own footprint and is inert by construction. **Bead-only.**

What that costs, measured: the bead's reach (0.45) is less than the sheet's half
thickness (0.60 on the shipping sheet), and #278's profile law blends toward an
evenly spaced wall by `ratio = a / b` where a bead is narrower than the sheet is
thick. So the hole bead is **not a half-round**: at the shipping 1.2 mm sheet it
is 75% bead / 25% wall and leaves the skin at **32.5 degrees** (a flat wall: 90);
at the 2.4 mm sheet it is 38% bead and leaves the skin at **69.6 degrees**. That is
#278's law applied unchanged — one owner — and the section image shows the result:
a rounded, slightly pointed rim with its apex on the hole boundary. A true
half-round would need the rim THINNER than the sheet, i.e. the taper that does not
fit.

## 3. One owner

`emitRimLoop` (with `rimProfile`) was **moved verbatim** out of `emitPanel` and
both callers now close every rim through it: `emitPanel`'s own perimeter loop, and
in `emitInfillPanel` every hole rim (beaded) and every outline edge of the cell
region (flat, §5). The refactor alone is **byte-identical**: 129 rows (every
INFILL, FRINGE, CAPABILITY, SPHERE STEM and LOBES row plus the default), both
modes, positions AND bead normals under `Object.is` — 0 moved — against a worktree
of `03a1042`, before any hole geometry changed.

`node tools/verify-bloom-rim-owner.mjs` (O1–O3) reads the source: `emitRimLoop`
emits; `emitPanel` and `emitInfillPanel` call it; and no function either reaches
emits a triangle mixing a top-skin and a bottom-skin operand. Its
`--negative-control` puts S3's flat `emitRim` back for the holes (O3), makes
`emitPanel` sweep its rim inline (O2, O3), and adds a new wall helper called from
the infill arm (O3, through the reachability walk) — 3 of 3. **Declared
blindness**: the operand vocabulary is its coverage; the behavioural witness is
H1 below, which a flat wall fails whatever its variables are called.

## 4. How the hole bead is built, and what "1.50 mm across" means now

For each hole, the skin stops on a **grown ring**: every ring vertex pushed
outward along its own plan normal until the CHORD on the mid-surface from the
original boundary point is the radius — #278's own inset law (`rimInsetV` walks a
chord for the same reason: the profile's half width IS that chord). On a flat plan
the map is an isometry and the walk is skipped; on a curved one it is a bracketed
bisection with #278's own ULP slack, then `infillSnap` (the plan grid, one owner).
The annulus is triangulated against the grown ring by the existing sector /
merge-walk arms, and the rim profile at each ring point has its APEX at the same
edge parameter on the plan's own hole.

**A per-edge offset was tried first and is wrong on a curved plan**: marching each
edge's surface distance through the metric field gives adjacent edges different
plan offsets, and mitring two nearly collinear edges at different distances throws
the corner out past its neighbours — 64 reversed ring corners on ALL FORM MAX, 8
of its 17 holes refused. Per vertex, nothing is mitred: **0 flat holes on every
row of the matrix.** Where a grown ring could not be triangulated the hole would
keep its flat wall and be counted (`flatHoles`, H0) — never lose its hole.

**The 1.50 mm bar**: the apex is the plan's hole boundary and every other point of
a profile lies behind it, so **the narrowest aperture — at the mid-plane — is the
plan's hole, unchanged**; at the faces the hole is 2r = 0.90 mm wider. I1 measures
`emittedLoops`, which are the APEX loops, so it measures exactly the ruled
quantity. Measured: every I-family width is unchanged, and **ALL FORM MAX's
declared I1 hole still reads 1.4799 mm** (I1_XFAIL held to ±5e-5 in both
directions, passing) — beading did not widen the estimator gap; it cannot, since
neither estimator's subject moved. The skin loops are recorded beside them as
`emittedSkinLoops`.

**Mode-free by construction.** The radius reads the sheet through
`max(t, MIN_FEATURE_MM)/2 >= 0.50`, which never binds under the room arm, so the
grown ring — which decides the annulus's topology — is the same ring in both modes.
Measured: live == export triangle counts on every infilled row.

## 5. What is NOT done: the outline above the split is still a flat wall

The cell region's outline edges (the petal margin above the infill's split, and
the tip) go through `emitRimLoop` as its `w = 0` step profile — **the same wall
S3's `emitRim` drew, on the same corners, same diagonal, same winding, same order
(byte-identical, §3)**. Beading them needs the skin near the margin to give way to
the inset, and the cells' REFINED skin has vertices within a bead's width of the
margin that nothing moves (a refine midpoint on a ring-to-margin diagonal sits
~0.25 mm in; a 0.45 mm inset would cross it). The holes avoided that by
triangulating against the grown ring; the margin would need the same for every
cell touching the outline, plus #278's ramp from the seam and the tip's narrow
room. **The declared #278 regression on an infilled blade — the margin's cliff
above the split — therefore stands**, now with one owner, and is the next move.

## 6. Gates

| gate | result |
|---|---|
| 1 one owner — `verify-bloom-rim-owner.mjs` + `--negative-control` | PASS, 3 of 3 must-fails |
| 2 no hard edge — `verify-bloom-hole-rim.mjs` (H0–H3) + `--negative-control` | PASS over 13 states x 2 modes; 4 of 4 must-fails |
| 3 budget — `verify-bloom-infill-budget.mjs` (B0–B2) + `--negative-control` | PASS; worst 1,162,112 = 77.5% |
| 4 I0–I11 — `verify-bloom-infill.mjs` + `--negative-control` | PASS over 18 states x 2 modes; **12 of 12** witnessed mutants fire as named |
| 5 byte partition — `verify-bloom-surface-bytes.mjs --movers` + `--control` | PASS, **28 moved / 924 held** over the 952-row matrix, both modes — see §8 |
| 6 frozen phase | `frozen/phase42` = the 951 rows at `03a1042`, registered in both maps |
| 7 flower untouched | `git diff 03a1042 -- 'flower*'` is empty |

**H1 IS THE BEHAVIOURAL WITNESS AND ITS SUBJECT IS THE EDGES THE RIM OWNS.** Every
edge touching a triangle in a hole-rim range the builder declares (pinned to
exactly 2K triangles a point, so a range cannot be trimmed silently), and the turn
between its two faces must stay under `min(90, profile + ring)`: the restated
profile's own worst facet turn (its closed form, #278's blended law, never read
from the builder) plus the plan hole polygon's own corner turn (a flat wall turns
there too), and never as steep as a wall. Measured worst turn **44.96 degrees** on
the default (bar 69.8; a flat wall reads 90.00 on the base tree), 45.0–52.2 on the
thin-sheet and tip-thinned states, 69.6 on the 2.4 mm sheet (bar 90).

**AND THE FIRST SUBJECT WAS WRONG, WHICH THE BASE TREE SAID.** "Every edge within
the bead's reach of a hole" read 178.7–180.0 degrees on the base tree's FLAT walls
on the four fold states (cup 1.2 x curl 360, roll 330, ALL FORM MAX, buckle 0.60
f 3): the petal's own declared folds lie within a bead's width of a hole. Those are
the census's, not the rim's. On those four the rim is laid on a surface that turns
through itself and its worst edge (128.9–178.7 degrees) is **declared in
`H1_XFAIL` with its value, held in both directions** rather than bounded.

**H3 at the ring vertices**: the chord from each apex to where its skin stops is
the law's 0.450 mm to 6e-7 mm (flat) and 3e-6 mm (ALL FORM MAX) — where the law is
applied. Between vertices the bead is interpolated along the ring and the chord
spreads by up to 0.0104 mm (flat, the ring's own polygon turn) and 0.084 mm (ALL
FORM MAX, the metric along a plan edge); **reported, not bounded**.

**`verify-bloom-edge-profile.mjs` (not in CI) reports 9 E2 findings, and they are `main`'s:** the
base tree reads the IDENTICAL nine lines (diffed) — ORCHID x 2 whorls, FAN x PER-PETAL, the GRADIENT
corner, the buckle and tip-shape records gone stale, LADDER x BUCKLE f 7, and two APEX NIB rows — every
one a PLAIN petal, whose bytes this PR does not move. Recorded, not fixed here. Its infill rows still
report E2 SKIPPED with the reason that remains true: the outer margin above the split is a flat wall.
`verify-bloom-infill-bytes.mjs` REFUSES by design on this base (it needs a base without `petalInfill`;
it is S3's guard instrument) — the full-matrix byte partition carries this PR's claim instead.

## 7. The census — no new fold on any undeclared row

Both trees, every INFILL row, EXPORT, the builder's doubles
(`tools/bloom-census-sweep.mjs --only '^INFILL'`):

* **Every undeclared row reads 0 on both trees** — the ruled defaults, density 40,
  sheet 2.40, tipThinning, sepals, relaxation 12, law 0, stretch 1. The bead adds
  no fold anywhere.
* **Re-recorded, both directions, previous figure in each note**: cup x curl 360
  8,776 → 8,840 (span unmoved 1.3380); **ALL FORM MAX 21,704 / 1.7460 → 17,984 /
  1.6701**; **roll 330 40,280 / 1.1736 → 39,048 / 0.9912**; petalWidth 30 1,056 /
  1.1442 → 1,056 / 0.0000; footDelicacy 0.25 800 → 832 (span unmoved); **buckle
  3,422 / 0.9883 → 3,118 / 0.6018**; 40 x 3 3,684 → 3,681 (span unmoved);
  CONTINUOUS 948 / 0.5049 → 928 / 0.5092; solid base 18 → 13.
* **Removed**: `density law 2` (4 → 0).
* **The sphere-with-stem trap, checked**: its declared 0.4270 mm fold is
  **unmoved** and the count falls 476 → 472. Beading does not make it worse.
* **One regression, and it is not a fold**: `petalTipShape 3.00` 1,056 / 0.0000 →
  1,088 / 0.5399. All 1,088 pairs are the basal panel's buried end wall against the
  cell region AT THE SEAM (attributed by the builder's own triangle ranges — none
  touches a hole rim), and the two worst are a cell skin triangle whose EDGE lies
  along the end wall's top edge, a pre-existing T-junction there. The census cannot
  prove transversality along a shared line, keeps the hit, and reports the
  contact's LENGTH (0.55 mm between the two seam vertices). On the base tree the
  same contact read as span-0 points; the grown ring moved which annulus triangle
  carries that edge. Grown rings stay 0.61 mm clear of the seam on that row.
* **New row, new declaration**: `INFILL: x sheetThickness 0.60` reads 6 / 0.0000 —
  and the same control set reads 6 / 0.0000 on the base tree with flat walls, so it
  is the thin sheet's own tangency class.

## 8. Matrix, frozen phase, byte partition

Block 39 gains one row — `INFILL: x sheetThickness 0.60 (the hole bead where the
LIVE sheet is thinner than the bead is wide)` — so the live matrix is 952 rows and
**`frozen/phase42` is owed**: the 951 rows at `03a1042`, registered in
`FROZEN_BASE_COMMITS` and `FROZEN_MATRICES`, generated from that commit's own
`buildMatrix()` (deep-equal by construction; CI's frozen job proves it).

**Byte partition, predeclared from the base tree's own builder record**: a row
moves iff some petal on the BASE tree cut at least one hole (`infill.built` and a
non-empty `emittedLoops`) — 28 rows, exactly the regex `^INFILL: (?!REFUSED|GATED)`;
every other row holds.

**MEASURED, PASS**: `verify-bloom-surface-bytes --base <worktree of 03a1042>`
over all 952 rows in both modes, run as eleven `--only` chunks (the whole-matrix
run does not survive a turn boundary in this container, and one chunk is bounded
at ~9 minutes) whose regexes were checked to cover every row exactly once. **All 28
predeclared movers moved; 0 floats moved on any of the 924 holders**, positionally
under `Object.is` — ~1.19e9 export floats on the non-INFILL rows alone — with the
four REFUSED / GATED `INFILL:` rows among the holders and `ALL MAX` held.
`--control` fired both clauses (export stream and captured grid) on its 1e-9
perturbation. The new `sheetThickness 0.60` row has no base counterpart and is
counted with the movers.

**Frozen tags whose bytes stop reproducing**: every frozen matrix that carries an
infilled row — `frozen/phase40` (the S3 block-39 rows), `frozen/phase41` and
`frozen/phase42` — on exactly their guard-on INFILL rows that cut a hole. Their
definitions still deep-compare.

## 9. Read-out

A third INFILL line: `INFILL hole rims: a 0.45 mm half-round bead on 20 of 20
holes · CLAMPED from 0.50 mm by the 1.00 mm wall on 20 holes, 0.10 mm of flat left
down each wall · the aperture is the ruled hole at the mid-plane and 0.90 mm wider
at the faces`. Flat holes, if any, are counted on it. It is presentation of the
builder's record; no panel route asserts it (the panel gate's INFILL regexes read
the first two lines and are unaffected).
