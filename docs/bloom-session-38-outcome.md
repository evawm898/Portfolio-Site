# Bloom session 38 — lobes on the petal rim

Two PRs, in order. **PR 1** is the structural prerequisite: a query that says where a
petal's rim is in space and how far along it a point sits, proved to CORRESPOND to the
boundary the exported mesh actually has, across the control space. No feature, no
visible change. **PR 2** is the lobe feature itself, cut into the outline, under the
rulings the brief carries (§B below, once it ships).

The brief named `claude/lobes-serration-status.md` and `claude/edge-treatment-findings.md`
as the rulings' record. **Neither file exists in this repository on any branch** (checked
by `git ls-tree` over every remote ref and by a filesystem search). What is here and was
read instead: the E2/E3 history in `docs/flower-rim-treatment-registration.md` (the
appendage construction, 19 / 37 / 47 detached components at `boundary === 0`), the lobe
session's upstream contract in §5 of `docs/bloom-session-32-outcome.md`, and session 37's
`petalSurface` in `docs/bloom-session-37-outcome.md`. The brief's own ruling list is
treated as binding as written.

---

## A. PR 1 — the rim arc-length query, and the correspondence proof

### A1. What shipped

`bloom-geometry.js`:

| member | what it is |
|---|---|
| `widthProfile().winnerAt(u)` | which of `shapeAt` / `rootBlend` / `tipFloor` the outline's `Math.max` returned at `u`, BY NAME, from the same three values in the same order. `Math.max` returns one of its arguments exactly, so the answer is an identity and never a tolerance. `shapeAt` now reads one loop (`shapeWinner`) that also carries the winning term's name; the same `>` on the same terms. |
| `widthProfile().slopeBreaks()` | every `u` where the winner changes, bisected to the crossover between two grid cells that name different winners, plus the CORE's own tip-law join at `uPk`. Reports the shipped outline's seams; rules nothing. |
| `petalSurface().tangentBreaks()` | the profile's breaks plus, when a form exists, the FORM ONSET at `FORM_ONSET_END` — the ramp `u / 0.30` then `1` is C0 by construction, and cup, roll and the buckle each ride it (§A4). The one place the surface declares where its own tangent breaks. |
| `petalRim(surface, samples = RIM_SAMPLES)` | per margin (`side` ±1): `sAt(u)`, `uAt(s)`, `pointAt(u)`, `length()`; the terminal mini-face's width (`tipFace.length`, and `meshLength` at NV − 1 chords); `loopLength` (up one margin, across, down the other); `breaks` and `nodesU`. |

`tools/bloom-first-slot.mjs` — the slot payload from `buildWhorlInto`'s own callback, extracted
from the off-station tool so the two instruments read one copy (the off-station tool now
imports it; its run and its control are unchanged).

`tools/verify-bloom-rim-arc.mjs` — the correspondence proof (§A2), with `--control`,
`--quick` (two states, to prove the rig) and `--json <file>` (the per-state table).

**How `s` is measured, and why it is a construction.** There is no analytic dP/du (the
spine law is a table on the curl family; the buckle differentiates in `v` only), so `s(u)`
is the chord length of a dense polyline through `at(u, side).P`: `RIM_SAMPLES` = 4096
uniform cells of `u`, with every tangent break the surface declares inserted as a node
and a GEOMETRICALLY GRADED PATCH (`RIM_GRADE_CELLS` = 4 cells either side, halved
`RIM_GRADE_DEPTH` = 32 times) replacing the uniform nodes around every break and around
the apex. `sAt(u)` appends `u` as one more node, so by the triangle inequality the reported
arc between any two `u` is never less than the straight chord between them — the property
R2 asserts exactly rather than within a tolerance.

### A2. The correspondence proof — what it asserts, and the result

Every figure names its MODE (live / export) and its SAMPLING (the query at 4096 cells plus
the graded patches; the mesh at NU = 56 stations).

| clause | what it measures | result, 64 states × 2 modes |
|---|---|---|
| **R1** the rim IS the mesh's rim | at every blade station on both margins, `pointAt(u, side)` reproduces the captured rim point under `Object.is`, and the two rim-strip vertices offset from it with the EMITTED normal are present exactly in the position stream | **14,336 station × margin comparisons, 28,672 vertices tied to the emitted stream, 0 misses** |
| **R2** the arc is never shorter than the chord | per consecutive station pair, `sAt(u₂) − sAt(u₁) ≥ |P₂ − P₁|` | min (arc − chord) over 14,080 pairs: **−2.6e-10 mm** (summation rounding; never a real shortfall) |
| **R2** the mesh's deficit | the reported blade length minus the exported rim polyline's length — the mesh's own chord shortfall at 56 stations | LIVE median 0.247%, **max 0.897%** (0.850 mm of 65.5); EXPORT median 0.358%, **max 0.750%** — both worst on `ALL FORM MAX × buckle 0.6 f 7 × petalTipShape 3.00` |
| **R3** the query's own error | lengths at 1×, 2×, 4×, 8× `RIM_SAMPLES`; the fine-end order `log₂(d₂/d₃)` must exceed 1.0; the bound is `d₁ + d₂ + d₃·2ᵖ/(2ᵖ − 1)` | fine-end orders LIVE 1.06–2.12 (median 2.02), EXPORT 1.40–2.09 (median 2.03); **bound max 4.0e-4 mm LIVE, 1.5e-4 mm EXPORT** (7.4e-6 relative), medians 9.7e-6 / 2.6e-6 mm |
| **R4** the inverse | `uAt(sAt(u)) = u` within 1e-9 on 12 probes per side; `sAt` strictly increasing | 0 misses |
| **R5** the nodes are the rim's own breaks | an INDEPENDENT detector on the rim CURVE `P(u, +1)` (bracket a jump in the central-difference tangent on a golden-offset grid, bisect, classify by one-sided tangents at 1e-6) over the six builder arms in both modes; every genuine break within 1e-5 of a query node | worst gap **6.0e-7** in `u`; every break found is declared (§A4) |
| **R6** the terminal face | curve vs the mesh's NV − 1 chords | default: 0.3000 / 0.3000 mm LIVE, 1.6000 / 1.6000 EXPORT (= 2·h(1)) |

**THE RESIDUAL BOUND, stated.** Against the exported boundary, the reported rim length
exceeds the mesh's own polyline by at most **0.90% (LIVE) / 0.75% (EXPORT)** of the rim,
worst over the sample, and that excess is the mesh's chord deficit at 56 rows (the default
petal's worst single chord is 0.078 mm at u = 0.071, the root blend — §13 of the session-32
doc's finding again). The query's OWN error at `RIM_SAMPLES` is bounded at **4.0e-4 mm
(LIVE) / 1.5e-4 mm (EXPORT)** on the worst state and below 1e-5 mm on the median, from three
measured doublings plus the geometric tail the measured order implies. Not from one sample:
64 states, both modes, listed in the tool's header — the six builder arms, every
petal-reaching slider at both ends, the exponent at 0.60 / 1.00 / 2.50 / 3.00, the tapers
that move the widest point, cup and cup gradient, roll and its taper, curl, twist, tilt, the
buckle's three at their corners, the thinnest and thickest sheet, the shortest and longest
petal, a domed hub, a sphere head, the innermost petal of six whorls at the smallest layer
size, and the two-control products (exponent × cup, exponent × buckle, cup × buckle, roll ×
buckle, all form max, all form max × buckle max × n 3.00).

**The positive control** (`--control`): R1 evaluated at `u + 1e-9` fires on every state;
R5 run on a query over the same surface DECLARING NO BREAKS fires on 12 of 12 arm × mode
builds, and the residual that costs is printed beside the declared query's — **5.1e-3 mm
without the nodes against 8.3e-6 mm with them** on the default (LIVE), 1.5e-3 against
1.1e-6 (EXPORT). Nothing else fires.

### A3. How the bound was got — three defects in the instrument, in order

1. **The ORDER test found a kink the profile did not own.** The first two-state run
   converged at first order on FORMED and BUCKLED (0.81–1.03) with every profile seam
   already a node. The rim has a tangent break at u = 0.30 from the FORM layer's onset ramp
   (§A4). `petalSurface().tangentBreaks()` now declares it; the profile could not.
2. **A fixed-width graded patch made the order unreadable.** The superellipse arrives at the
   apex with a vertical tangent above n = 1 and leaves the widest point vertically below it,
   and a uniform cell containing such a point is cut by one chord however fine the grid
   (measured: order 1.25 on the all-form-max corner, LIVE, with the seams in place). A
   geometric patch of fixed width cured the residual and broke the instrument: uniform nodes
   interleaving a fixed geometric set differently at every density read order 1.06 on n 0.60
   at residuals of 4e-6 mm. The patch now scales with the cell (4 cells either side), so
   doubling `samples` halves the whole patch and the ladder is self-similar under refinement.
   Wider patches (16, 64, 256 cells) were measured and are worse at every state.
3. **The endpoints must be unconditional.** With the tip seam inside the apex's patch, u = 1
   was filtered out with the uniform nodes; the last node came back 1 − 2⁻³²·span and
   `sAt(1)` overshot the length by 8e-12, which `uAt` correctly refused.

And one correction to what the instrument may assert: **the convergence order is not a
witness for the seam nodes.** A kink cut by chords produces erratic differences (its
position inside a cell changes with every density), so at the fine end a seam-less ladder
can read any order — measured 2.50 on the default export with no seam nodes at all. R3
asserts only that the tail converges (fine-end order > 1.0, where a kink reads ≤ 1) and
computes the bound; R5's independent detector carries the seam claim, and the control strips
the declared breaks rather than the nodes.

**Orders below 2 are genuine and steady, not defects:** the n ≠ 1 apex power laws converge
at 1.40 (n 0.60), 1.43 (n 0.60 × cup 1.2), 1.65–1.72 (n 3.00 × cup) under the graded patch,
in both modes, unchanged out to 32k cells; the LIVE floor's steeper apex (0.15 mm against
0.8) is pre-asymptotic at 4096 on every formed state and reaches 2.0 by 16k. The bound
formula takes the measured order, so both are inside it.

### A4. Findings recorded, not ruled

**(a) THE FORM ONSET IS A TANGENT BREAK OF THE SHIPPED SHEET, AND NOBODY HAD NAMED IT.**
Session 37 measured the outline's two C0 seams on `halfWidthAt` (u = 0.057939 and
0.999562). The rim-curve detector finds a third, at `FORM_ONSET_END` = 0.30, on every cupped,
rolled or buckled petal, at every v ≠ 0 — the ramp `u / 0.30` then `1` is C0, and the
deformation it ramps arrives with a slope that stops dead. One-sided tangents at the margin
(v = +1 / −1), e = 1e-6, identical in both modes because the ramp is mode-free:

| state | angle at v = +1 | at v = −1 | \|dP/du\| ratio |
|---|---|---|---|
| FORMED (cup 0.6, curl 120, roll 90, twist 45) | **24.18°** | **54.98°** | 0.43 / 0.55 |
| cup 1.2 | 35.91° | 35.91° | 0.69 |
| roll 330 | 35.22° | 35.22° | 0.72 |
| cup 0.3 | 12.28° | 12.28° | 0.97 |
| buckle 0.5, f 3 | 5.93° | 5.93° | 0.90 |
| buckle 0.6, f 7 | 2.01° | 2.01° | 1.01 |

Curl and twist are smooth there (a curvature jump costs nothing), so a flat, curled or
twisted petal has no break at 0.30. Whether this crease is visible on the preview or the
print, and whether the ramp should become a smootherstep, is Eva's: a smoothed ramp moves
every formed row's bytes — a partition event with a frozen phase, not a fix to fold into a
lobe PR. Recorded here so the next session does not find it again.

**(b) THE TIP SEAM MOVES WITH THE MODE.** The brief's u = 0.999562 is the LIVE figure (the
0.15 mm mesh floor). The OBJECT's seam — where the superellipse meets the 0.8 mm print floor
— is at **u = 0.992424** on the default taper at n 1.70, and at 0.754092 for n 0.60, 0.999786
for n 3.00 (export). A lobe treatment reading "where the apex begins" must ask the profile
in the mode it is building for; `slopeBreaks()` answers per accumulator.

**(c) SEAM ANGLES DEPEND ON WHERE ACROSS THE BLADE THEY ARE READ.** Session 37's 44.54° and
73.73° were at v = 0.6. At the margin (v = +1) the same two seams read **65.50° and 80.13°**
(LIVE), 65.50° and 60.50° (EXPORT). Both sets are correct; the half-width's slope jump
enters dP/du multiplied by v.

**(d) THE TWO MARGINS ARE NOT THE SAME LENGTH UNDER CURL + TWIST.** A twisted frame on a
curled spine puts one margin on the outside of the bend for more of the length: FORMED reads
33.01 / 37.59 mm (+1 / −1, LIVE) and all-form-max 66.35 / 58.39; the corner state 74.29 /
66.20 — **8.09 mm apart**. The query keeps the sides separate for this reason; a lobe laid
out at even `s` on one margin lands at a different `u` on the other, and PR 2 has to say
which margin's `s` it uses or lay out each margin on its own.

**(e) ON A DOMED HUB THE BLADE'S RIM STARTS OFF THE FOOT'S EDGE.** `pointAt(0, side)` is the
row plan at u = 0 (a chord across); the emitted ring row on a dome is an arc across
(session 20's foot law). The margin points differ by **0.509 mm at headRise 0.6, 0.577 at
1.0, 0.360 on the sphere head**, and by exactly 0 on every flat build. Reported, not ruled,
and not this PR's — it is the dome/tilt junction's own geometry between the last foot row
and the first blade row.

**(f) THE INNERMOST PETAL OF SIX WHORLS AT LAYER SIZE 0.4 HAS A 0.36 mm RIM IN EXPORT** (0.93
live) — the query works there (bound at fp noise) and it is the same reachable state the
depth ruling already records as under the floor.

**(g) COST.** 3–40 ms per petal at 4096 cells (the 40 is the first call's JIT), ~4,300
`at()` evaluations per margin. PR 2 calls this per petal; at 240 feet that is seconds per
rebuild, so PR 2 will size `samples` from R3's table rather than take the default.

### A5. What the query is blind to

The FOOT's edges (s < 0, the three rows at u = 0, footRing()'s); a cleft's inner edges (a
capability petal has more boundary than two margins — the tool refuses multi-panel petals);
any state the sample does not name. It describes the rim of the surface `petalSurface`
evaluates; whether that rim is the right shape is a picture's question.

### A6. Gates run on this tree

- `node tools/verify-bloom-rim-arc.mjs` — PASS, §A2; `--control` — fires as stated; `--quick` proves the rig on two states.
- `node tools/verify-bloom-surface-offstation.mjs` and `--control` — unchanged results (the import moved, the twenty lines did not).
- `node tools/bloom-wall-thickness.mjs` and `--negative-control` — clean (V1–V5, two tracked xfails still failing as expected).
- `node tools/bloom-smoke.mjs` — 58/58 configs watertight, 609 s, SMOKE: clean; `--check` — 58 rows over 24 blocks, 53 families both directions.
- `node tools/verify-bloom-surface-bytes.mjs --base <worktree of 59c0657>` — the full matrix, both modes, `Object.is`, positional: see the close below.

No frozen phase is owed: no row was added and no byte moved. Adding two tools under
`tools/` makes both FLOWER gates run on this PR; they test flower geometry, not this.

### A7. The close — bytes

`node tools/verify-bloom-surface-bytes.mjs --base <worktree of 59c0657>` (main's head, the
base of this branch), the full matrix, both modes, `Object.is`, positional:

```
export stream : 657,202,320 floats over 73,022,480 triangles, 624 rows x 2 modes
captured grid : 70,781,790 values over 8,055 panels (live)
PASS — 0 floats moved, positionally, under Object.is.
```

Stated honestly: that run's module was loaded before the last edits inside `petalRim`
(the graded patch and its endpoints), which is not on the build path — `buildPetalInto`
reads `petalSurface` and never the rim — and the six-row subset re-run on the final tree
passes identically, with `--control` firing both clauses. `widthProfile`'s one change on
the build path (`shapeAt` reading the winner loop) is the same `>` on the same terms in
the same order, and the full run above is what says so.

**No frozen phase owed** (no row added, no byte moved). PR 2 owes `frozen/phase24` at this
PR's merge commit, because block 29 adds rows.

## B. PR 2 — lobes on the petal rim

Two passes, and the second supersedes the first where they disagree. B1–B9 describe the
feature as first built and measured (the ruled 2–8 / 10 ceiling, rows placed by the
petal's curvature alone); Eva looked at its sheet and ruled the lobes a staircase and the
tip-shape control inert to the eye, and amended the ruling: the turning-rate ladder stays
the ONE place rows are placed, but it accepts a RESOLUTION DEMAND from the rim feature and
satisfies it. B10 is that amendment, built, with the four things it asked for. The section
numbers of the first pass are kept so the trail reads in order; where a first-pass number
is no longer the shipped one it is marked *(superseded — B10)*.

### B1. What shipped

Four controls in a **Lobes** drop-down inside Petal shape (`bloom-registry.js`, section
`lobes`, parent `shape`, collapsed at first load):

| control | id | range · step · default | what it is |
|---|---|---|---|
| Lobe depth | `lobeDepth` | 0–1 · 0.01 · **0** | the fraction of the BASE half-width cut away at a sinus — the guard: hidden and inert at 0 (`lobesEngaged`, the buckle's own gating) |
| Lobes | `lobeCount` | 2–10 · 1 · 6 | the count asked; built = min(asked, the ladder's capacity for the window over the samples-per-lobe floor, what the pitch floor allows) — B10 |
| Coverage | `lobeCoverage` | 0.10–1.00 · 0.05 · 0.80 | the fraction of the rim between the root blend's end and the tip cap the lobes occupy, as ARC LENGTH along the base outline, taken from the tip end |
| Lobe tip shape | `lobeTipShape` | 0.50–2.00 · 0.05 · 1.00 | its own control, at the lobe's scale: the cut is `depth · ((1 − cos 2πf)/2)^q` — 0.50 a pointed lobe, 1.00 the raised cosine, 2.00 flat-topped with a narrow sinus. Never `petalTipShape`. |

**The cut is CUT IN, never built out** (ruling 1): `widthProfile()` stays the one owner of
the outline; inside the window the half-width is `base · (1 − cut(u))`, outside it the base's
own closure — a branch, not a multiplication by 1, so the two GATED rows are bit-identical to
the default (measured, both modes: 0 of 342,720 floats). Nothing is appended to the boundary;
the petal's two rim strips are the same two strips. The window's ends are crests, so the cut
is continuous where it meets the base.

**The stations are arc length on the lamina, not `u`.** `rimArcTable()` — the engine PR 1
built for `petalRim`, extracted verbatim — is run on the base outline in the `(u · length,
halfWidth)` plane with the profile's own declared breaks as nodes (1024 cells; within ~2e-4 mm
of the 4096-cell limit on the default, three orders under the pitch floor). The region is the
arc from `ROOT_BLEND_END` to `uCap`, the window is `coverage × region` from the tip end, the
pitch is `window / count`, and every crest and sinus is placed by `uAt(s)`. So the pitch is
millimetres of rim, and the pitch floor — `max(sheet thickness, MIN_FEATURE_MM)`, derived
from a length — clamps it as a length (ruling: displayed, marked CLAMPED, never an input
proxy). On the default 35 × 24 mm petal at coverage 0.80: region 17.84 mm, window 14.27 mm.

**The cut leaves the surface alone.** Every form law that scales with the half-width — cup,
the cup gradient, the buckle, the apex sweep — reads the BASE width `hb` on a lobed row
(`petalForm.sectAt(…, h, u, hb)`, `halfWidthBaseAt`), so a sinus is a narrower sample of the
same sheet rather than a differently curved one. This was not the first construction: the
first cut let the buckle read the cut width, and lobes × buckle 0.30 f 3 then censused **63
within-shell pairs, worst 0.258 mm, one at every sinus** — the ruffle's amplitude stepping
with the cut and the two skins wedging. The rule is recorded in `sectAt`'s header.

**The depth cap, derived and told.** `1 − TIP_HALF_MM / min over the sinuses of the base
half-width`: the depth at which the deepest sinus reaches the print floor's half-width, the
same 1.60 mm span the apex face keeps — derived per build (0.871 at two lobes on the
default), and above it the floor holds the width and the travel is dead: "1.00 asked → 0.87×
built (CLAMPED)", deepest sinus exactly 1.600 mm across. Below the cap **the outline is
single-valued by construction** (ruling 6): the cut is a multiplier in (0, 1) on a positive
half-width, one span per `u`, and a split petal is unreachable. Both caps are drawn on the
sliders by `applyCaps()` and printed in the read-out with the pitch beside its floor, the
rows per lobe beside the stations in the window and the demand, and the deepest sinus as
built. The count cap of the first pass — `floor(coverage × 39 / 4)`, reproducing the ruled
8 / 10 — is *superseded — B10*.

**Nothing derived became an input.** The per-build record (`profile.lobes`, on the builder's
return as `petal.lobes` with the ladder's `rowsInWindow` / `rowsPerLobe` added) is telemetry:
the registry's `fmt`s and the app's read-out line print it, `__bloomMetrics().petalLobes`
exposes it, and no geometry reads it back — except the ladder, which reads the DEMAND (B10),
which is the amendment's point.

### B2. The gates — red first, then green

**RED FIRST** (commit `e3af401` on the scratch branch, the rows and the L family with the
outline uncut): both STL gates failed every lobed row of block 29 on
`L1: a lobed row reports NO lobe telemetry — the cut is not built`, and the two GATED rows
passed — the rows were proven able to fire before the feature existed.

**THE L FAMILY** (`lobeAssertions()` in `tools/bloom-harness.mjs`, in BOTH STL gates,
`LOBE_SCOPE` printed on every row):

- L0 — the registry's `PREDICATES.lobesEngaged` and the geometry's `lobesEngaged()` agree
  on this row's state (checked at harness load over every step of the depth slider too).
- L1 — telemetry present iff engaged, both directions; NO ROOM names its cause (`region` —
  `uCap ≤ ROOT_BLEND_END`; `rows` — the capacity under one lobe; `pitch` — the window under
  the floor), consistently with the profile, and nothing is cut.
- L2 — the outline is the base's to the bit outside the window and strictly narrower inside
  it (4,001 stations, the profile rebuilt from the state).
- L3 — the number of local minima of `h/hb` on a dense ladder equals the count built (0 at
  depth 0); the record's floor is `LOBE_SAMPLES_PER_LOBE` (or the capability's); its
  capacity is `ladderWindowCapacity(u0, u1, f)` re-derived; built = min(asked, capacity /
  floor, pitch cap), ≥ 1; the slider's cap is min of the two; `clampedBy` names the binding
  cap and only when one binds.
- L4 — the region and the window re-measured as the base outline's 2D arc at 65,536 chords
  agree with the record within 1e-2 mm; the window is coverage × region; pitch = window /
  count; the floor is `max(ring.thickness, MIN_FEATURE_MM)`; the pitch is never under it.
- L5 — the depth cap is `1 − TIP_HALF_MM / min base half-width over the emitted sinuses`,
  built = min(asked, cap), clamped iff asked > cap, and the deepest sinus as built is ≥ the
  floor's half-width.
- L6 — the window's bounds are the record's; the crests at both ends are `Object.is` the
  window's ends; `rowsInWindow` counts the builder's own `profileU`; **the demand was met**
  (`rowsInWindow ≥ count × floor`) and not exceeded past the capacity plus the boundary
  station at u0; every sinus lies within half a period of an emitted station.

A5 (the apex mutant family) skips stations inside the window and A6 fits the apex above
`max(uPk, windowU[1])` — both read `petalLobes.windowU` from the metrics rather than a
constant; `tipCap.peakHalf` is `halfWidthBaseAt(uPk)`, because the lobed value at the widest
point read a drawn exponent of 1.766 where 1.70 was asked (A6 red on a clean tree, found by
the gate). **A8 — the ladder's own gap bound (1.40 × uniform) — is what caught the first
demand implementation** (B10).

**MATRIX BLOCK 29** — 34 rows, relabelled in B10 to what each now is: the first live step
(0.01); 2 at the default coverage (the whole reachable count); 8 asked and 10 asked at the
default coverage and 10 asked at coverage 1 (each CLAMPED to 2, told); coverage min (ONE
lobe); the depth cap; tip shape 0.50 / 2.00; × cup 0.40 / 1.2; × buckle 0.30 f 3 / 0.60 f 7;
× roll 330; × curl 360; × twist 180; × the 20 mm petal at coverage 1 (the rows cap binds);
NO ROOM by the pitch floor (20 mm at coverage 0.10); ONE lobe by both caps (20 mm, sheet
2.40, coverage 0.40); × sheet 2.40 / 0.60; × `petalTipShape` 0.60 / 3.00; × the far-out
widest point; × 3 whorls; × CONTINUOUS × 3 turns; × SPHERE; × FAN; × the whole centre; ×
ZYGO 2 whorls × ALL INNER MAX; × petalCount 40; × the domed hub; two GATED rows. Plus the
eight generated `min/max` rows for the four controls. The live matrix is 666 rows (624 + 8 +
34). `node tools/bloom-smoke.mjs --check --negative-control`: 62 rows over 25 blocks of 666,
60 families claimed both directions (block 29's smoke rows cite L0–L6).

**GREEN, on the branch's final geometry** (every figure names its mode; the ladder's last-bit
fix of B10.7 is in every run below):
- **Export gate on every lobe row** (`--only '^LOBES: |^lobe'`, 42 rows): 42/42 watertight,
  identical live and export triangle counts, no degenerate triangles, every shell outward, X0
  byte-identical to the Node rebuild on every row; 32 free of within-shell self-intersection
  and 10 declared (X1 asserting each still fails) — 41 in one run and the renamed cup 0.40 row
  in a second after its declaration (B4).
- **Connectedness on every lobe row**: 42/42 one piece, 246 s, with the half-cell re-read
  (B10.5).
- **Apex mutant table**: 9 of 9 mutants applied and fired the family each names (the
  `ladder-eats-the-base` anchor re-pinned to the comment above it — `ladderWindowCapacity` and
  `ladderOutsideMinima` now carry the same `held` line, and the table's own guard reported the
  bare line matching 3×).
- **Smoke**: `--check --negative-control` 62 rows over 25 blocks of 666, 60 families claimed
  both ways, the JS5 → JS99 control firing both directions; `--conn` 62/62 one piece, 356 s,
  the export subset clean.
- **Panel gate** PASS (every control declared once, rendered once, reachable from a collapsed
  section) and `--negative-control` PASS — 2,534 deliberate breaks caught, all fifteen routes
  and session 23's four clauses.
- **Grid gate** 585 checks over 19 rows PASS; `--negative-control` seven mutations, each
  reddening exactly the clause it names.
- **Rim-arc correspondence** (`--quick`) PASS: the query is the exported mesh's own rim at every
  station; worst mesh deficit 0.347 % LIVE / 0.520 % EXPORT; worst query bound 2.31e-5 mm LIVE /
  1.61e-5 mm EXPORT.
- **Off-station surface gate** with `--control` PASS; **wall thickness** V1–V5 clean, the
  composition xfail still failing as expected.
- **Composition hand check**: 11 rows both sides, every plain row main declares reproducing
  main's count and worst span exactly (B4).
- **`--verify-frozen --phase24 --base ../main`**: 624 rows deep-equal to `59c0657`'s own
  `buildMatrix()`.
The full matrix on both STL gates, in CI, is the merge criterion. **SIZE THAT WAIT OFF THE
WORKFLOW'S OWN RUNS**: `bloom-export-watertight` completed in 3 h 11 min, 3 h 21 min and
3 h 14 min on its last three green runs (167–169, sessions 36–37, `actions_list`) — the
pointer's 111 min is two sessions stale, and PR 1's own run was sized off it and reported
"still running" for an hour past the figure.

**A SECOND "SESSION 38" IS OPEN BESIDE THIS ONE** (#210, the foot-to-blade seam clearance,
another session, draft, waiting on Eva's ruling). It writes `docs/bloom-session-38-outcome.md`
under the same name, moves the HELD rows of `bladeStations` (`(m + i)/NU`, a seam floor) and
re-derives A7 in the apex mutant table — the same regions §B10 and §B10.7 touch. Whichever
of the two lands second owes a real merge of `bladeStations`, the mutant table, the CLAUDE.md
pointer and this file's name; recorded here so neither session re-derives the other's law.

### B3. Cost (whole-bloom build, median of 15, this box — first pass, six lobes)

| | plain | 6 lobes | 8 lobes | 6 lobes × 40 petals | plain × 40 |
|---|---|---|---|---|---|
| LIVE | 65.7 ms | 139.1 | 133.0 | 667.2 | 318.9 |
| EXPORT | 61.8 ms | 133.5 | 133.0 | 647.5 | 320.1 |

A lobed petal costs about twice a plain one: the 1024-cell arc table per petal, the crest
and sinus solves, and the cut evaluated at every ladder sample. Zero triangles added on
every row (19,040 at the default, 930 KiB) — the cut moves vertices, never topology.

### B4. The census verdict, and the hand checks named

The self-intersection census is the verdict (ruling), and `node
tools/bloom-lobe-composition.mjs` is the named hand check for lobes × cup and lobes × buckle
and every other block-29 row over a fold main declares: each row built twice — as the matrix
runs it and with the lobes off — EXPORT mode, the builder's doubles, the census's own
sites; the plain rows that main declares by name must reproduce main's count and worst span
EXACTLY (they do: the cup, the curl, the roll, the dome, the buckle row), which is what
anchors the comparison to main rather than to a moved base. The table is the FINAL tree's
(B10: two lobes at 11 stations a lobe on the region-partitioned ladder).

| row (lobed at 0.30 ×, two lobes) | lobed pairs · worst | plain pairs · worst | lobed site → nearest plain site (max · p95 · median) | sites inside the window, lobed / plain |
|---|---|---|---|---|
| × cup 0.40 | 3 · 0.0000 | 2 · 0.0000 | 39.76 · 2.34 · 2.34 (other petals — see below) | 0 of 3 / 1 of 2 |
| × cup 1.2 | 722 · 0.2891 | 752 · 0.1268 | 4.14 · 0.07 · 0.00 | 5 of 722 / 5 of 752 |
| × buckle 0.30 f 3 | **0** | 8 · 0.0104 | — | 0 of 0 / 0 of 8 |
| × roll 330 | 18,072 · 1.6072 | 18,776 · 1.3837 | 0.70 · 0.42 · 0.16 | 11,477 of 18,072 / 10,743 of 18,776 |
| × curl 360 | 816 · 0.6999 | 1,008 · 0.5233 | 0.22 · 0.13 · 0.00 | 0 / 0 |
| × 3 whorls | 72 · 0.1648 | 72 · 0.1648 | 0.000 | 0 / 0 |
| × CONTINUOUS × 3 turns | 264 · 0.3324 | 264 · 0.3324 | 0.000 | 0 / 0 |
| × the whole centre | 272 · 0.0796 | 272 · 0.0796 | 0.000 | 0 / 0 |
| × ZYGO 2 whorls × inner max | 12,264 · 0.7032 | 9,312 · 0.6466 | 0.55 · 0.11 · 0.02 | 6,223 of 12,264 / 1,996 of 9,312 |
| × the domed hub | 216 · 0.4176 | 216 · 0.4176 | 0.000 | 0 / 0 |
| 20 mm petal × sheet 2.40 × coverage 0.40 (ONE lobe by both caps) | 72 · 0.1755 | 72 · 0.1755 | 0.000 | 0 / 0 |

Read it this way. **A pair count is a property of the tessellation**: the lobed ladder
places the same 56 rows differently, so the same fold sampled by different triangles reads a
different number of pairs (ZYGO 32 % more, curl 19 % fewer, and cup 1.2 went 729 → 722 when
the ladder's last-bit fix of B10.7 moved one station) and a different worst span. What
separates "the same fold" from "a new one" is WHERE the sites are, and every site on every
lobed row lies within 0.70 mm of a site on the plain row (cup 1.2's one far site at 4.14 mm
is the tip fold's own tessellation moving with the ladder, p95 0.07; cup 0.40's three
span-0 touches are the paragraph below) — 0.000 mm on the four
rows whose pairs are the root blend's or the stigma's, which the cut never reaches. The
distance is REPORTED, never bounded: the cut moves the outline by up to depth × half-width at
a sinus and the ladder moves every station above the root blend, so a bar set from these
numbers would be a tolerance that passes the data in hand. The gate's claim is X1's — every
declared row still self-intersects — and the nine `SELF_INTERSECTION_XFAIL` entries carry
both counts, measured on the branch (the plain rows are main's geometry by B6).

**AND ONE FOLD IS THE SHEET'S, NOT THE LOBE'S — found by X2 on the final tree, not
declared in advance.** The pitch-floor row's short thick petal (20 mm at a 2.40 mm sheet,
coverage 0.40, its one lobe cut) came back with 72 within-shell pairs, worst span 0.1755 mm,
"a NEW self-intersection, not one of the 326 declared on main". Rebuilt on a worktree of
`59c0657` with the lobe controls at their defaults — EXPORT mode, the builder's doubles, the
census's own sites — main's own 20 mm petal at a 2.40 mm sheet reads **72 pairs, 0.1755 mm**;
the lobed row reads 72 / 0.1755 with every site within 0.000 mm of a plain one; the 20 mm
petal at the default sheet reads 0 and the default petal at a 2.40 mm sheet reads 0. It is
the root blend of a short petal under a thick sheet (session 35's class: the foot is set by
the hub ring while the blade shrinks), reached because the pitch-floor row is the one place
the matrix puts a thick sheet on a short petal — the matrix varies one control at a time, so
no row on main names the state and the 326 could not have carried it. It is in the XFAIL
list by name with both counts, and in the composition tool's rows.

**THE TWO HAIRLINE ROWS, on the final ladder: the buckle row reads CLEAN lobed, the cup row
reads THREE OF ITS OWN.** Cup 0.40's touches are span-0 contacts of the offset skin near the
FORM-ONSET CREASE (`u` 0.30, the tangent break §A4 recorded) — contacts at whichever stations
land against a creased sheet's skins, 0.600 mm off the mid-surface, never a fold. The cup
alone carries 2, at `u` 0.347 and 0.406 on petals 0 and 7 (`v` +1.00, the margin). The lobed
row read 7 on the first ladder, **0** on the demand ladder's first form (the reading B5 and
the first version of this paragraph carried — "the lobed stations miss them"), and **3** on
the ladder as it ships after B10.7's fix moved one station: `u` 0.331 / 0.354 / 0.378 on
petals 0, 1 and 5 (`v` ±0.78 and −1.00), every one BELOW the window's 0.402 and none within
2.3 mm of a plain site — different petals, the same crease. A count that goes 7 → 0 → 3 as
stations move by one sample is the definition of a sampling coincidence, and X2 admits only 0
or a declaration; the row is declared with both counts and its sites, and X1 will say when a
ladder change lands 0 there again (the entry comes off in that commit). The buckle row's 8
hairline pairs at the tip are missed by the lobed stations (0 pairs) and it is not declared.
**Twist 180 and buckle 0.60 f 7 read 0 with and without lobes**, and every single-control row
of block 29 reads 0 and is gated by X2.

### B5. Findings of the first pass — recorded, and now ruled on

**(a) THE RULED CEILING DRAWS TEETH AT 56 ROWS** *(superseded by the amendment — B10, where
the same finding is the floor).* The first ceiling reproduced Eva's 8 / 10 as
`floor(coverage × 39 / 4)`, a count standing for a spacing: the ladder put 24 of the 39 free
stations in the default window at 8 lobes and 25 at 6, so the emitted rows per lobe were 3.00
and 3.83, and the sheet showed three lobes at 8.3 rows per lobe drawing as lobes, six at 4.2 as
teeth, eight at 3.0 as a sawtooth. The sagitta read 0.5586 mm LIVE (56 chords) on eight lobes
against the root blend's 0.1293.

**(b) THE COUNT FLOOR OF TWO UNDERCUT THE PITCH FLOOR** *(superseded — B10: the pitch cap
clamps the count all the way down, to NO ROOM, told).*

**(c) THE FORM-ONSET CREASE HAS A CENSUS SIGNATURE.** Span-0 touches at `u` 0.30–0.41 on a
cupped sheet — 2 at cup 0.40 with no lobes — are the first time §A4's tangent break has
reached the census. Its fix is the form onset's own (a ramp with a continuous slope at
`FORM_ONSET_END`), not this session's, and it moves every formed row's bytes.

**(d) THE FIRST CUT MOVED THE RUFFLE, AND THE FIX IS A RULE.** B1: form laws read the base
width. The lobes × buckle hand check is what found it (63 pairs at every sinus → 0 at the
tip on the final tree), which is the reason the brief asked for it by name.

### B6. The close — bytes, the partition and the frozen phase

`node tools/verify-bloom-surface-bytes.mjs --base <worktree of 59c0657> --movers '^LOBES: |^lobeDepth max'`
— the tool gained a predeclared PARTITION: every row named by `--movers` must move (at least
one float, in at least one mode — a mover that holds is a feature that did nothing, refused
as vacuous) and every other row must hold to the bit, both modes, export stream and captured
grid, `Object.is`, positional. The movers are the block-29 rows that build a cut and the
generated `lobeDepth max (1)`; the holders are main's 624 rows, the GATED rows, the NO ROOM
row and the six generated rows whose guard is off. Proven on four rows first (the real
partition PASS; a holder named as a mover FAIL; `--control` exactly two findings), then the
full matrix:

`node tools/verify-bloom-surface-bytes.mjs --base ../main --movers '^LOBES: (?!NO ROOM|GATED)|^lobeDepth max|^ALL MAX'`
— 666 rows × 2 modes, every export float and every captured-grid value, `Object.is`, against a
worktree of `59c0657`. **THE FIRST RUN'S PREDECLARATION WAS SHORT BY ONE ROW, AND THE
INSTRUMENT SAID SO**: with `^ALL MAX` left off the regex it reported `32 of 32 rows named by
--movers MOVED, 634 holders compared to the bit` and then **FAILED on `ALL MAX` in both modes**
— 3,538,080 of 5,724,864 floats and 14,568 of 26,574 grid values moved, first at triangle 612
— because the row that takes EVERY control's maximum takes `lobeDepth`'s too, so it is a lobed
row on this tree and a plain one on main. A row that sweeps every control is a mover of any
control a feature adds; the omission was the predeclaration's, not the tree's, and the tool
refused to close over it. The second run, with `ALL MAX` named, **PASSES with the partition exactly as predeclared: 33 of
33 movers MOVED, 633 holders held to the bit** — 676,084,392 export floats over 75,120,488
triangles and 71,587,868 captured-grid values over 8,146 panels, 666 rows × 2 modes, `Object.is`,
positionally (movers counted in the floats only where their lengths agree). The holders are
main's 624 rows less `ALL MAX`, plus the NO ROOM row, the two GATED rows and the seven generated
min/max rows that leave `lobeDepth` at 0 — every one of them the plain ladder to the bit, which
is B10.7's "only under a demand" clause measured rather than argued. `frozen/phase24` (the 624
rows at `59c0657`) deep-compares; a phase IS owed by the 42 rows block 29 and the generated rows
add, and phase24 is that baseline.

**`frozen/phase24` is the 624 rows at `59c0657`** — main's head before this session's two
PRs, a commit on `main`; PR 1 added no row and moved no float against it, so the same
definitions and bytes stand at its merge commit, and this is the commit both PRs were
measured against. Owed because block 29 grows the matrix. Generated from that commit's own
`buildMatrix()`, registered in `FROZEN_BASE_COMMITS` and `FROZEN_MATRICES` (the harness
throws at module load if the two disagree), and `node tools/diff-bloom-bytes.mjs
--verify-frozen --phase24 --base <worktree of 59c0657>` reads `PASS — phase24Matrix() is
deep-equal to the base commit's own buildMatrix(), row for row` (624 against 624). No frozen
tag's bytes stop reproducing: the plain rows hold to the bit. §A7's note that PR 2 would
freeze at PR 1's merge commit is superseded by this, for the reason given.

### B7. The sheet — withdrawn

`tools/shot-bloom-lobes.mjs` rendered the first pass's space with print preview ON; Eva
ruled from its cells (B10) and stopped it, and it is not in the tree: every cell it would
render at the old ceiling is a staircase, and the amendment's deliverable is seven images,
not a sheet (B10.4). A sheet of the lobe space as it now is — two lobes, the depth from zero
to the cap, the tip shape, the coverage — is owed after the ruling, not before it.

### B8. Decisions made without a ruling — each with its undo

1. **`coverage` is the id `lobeCoverage`** (the ruling keeps the NAME; the id carries the
   family prefix every other lobe control has). *Undo:* a rename is a retirement.
2. **The window is taken from the TIP end** and its ends are crests. A base-end window would
   put sinuses against the root blend. *Undo:* `sStart` in the lobes block.
3. **The cut scales the half-width toward the midrib** (a sinus is the same sheet, narrower)
   rather than displacing the rim along its normal. That is what keeps the outline
   single-valued by construction and the form laws on the base width. *Undo:* the whole
   construction; do not.
4. **The feature ships OFF** (depth 0) and the demonstration's working depth is 0.30. *Undo:*
   `lobeDepth`'s default — a partition event.
5. **`LOBE_CREST` ladder nodes only below tip shape 0.75**, where the crest is a tangent
   break of the law; above it the crest is smooth. *Undo:* the threshold in `slopeBreaks`.
6. **Cup 0.40 and buckle 0.30 f 3 stay in the matrix as clean rows** rather than being moved
   to compositions that fold: both are the hand checks the brief named, and each is now a
   witness that a lobed ladder can miss a plain row's hairline contacts.
7. **The demonstration's below-floor states go through the CAPABILITY hook**
   (`lobeSamplesPerLobe`, `lobeExactDemand`), the non-shipping mechanism CLAW and CLEFT use,
   because no control reaches under the floor and that is the point. *Undo:* two fields in
   the lobes block.

### B9. Ball (first pass) — superseded by B10.6

### B10. The ruling amendment — the resolution demand, built

Eva's verdict on the first sheet: the lobes are a staircase and LOBE TIP SHAPE 1.00 / 0.50 /
0.00 are visually indistinguishable — the control is inert to the eye. The cause was found
and mis-filed as a fact about six lobes; it is a sampling floor, the same failure as f 7 at
NU 28 in the buckling work. The amendment: the turning-rate ladder remains the ONE place
rows are placed; it no longer places them from petal curvature alone; it accepts a
resolution demand from the rim feature and satisfies it; no second row placer, no station
inserted behind the ladder's back. Four things, in order.

**B10.1 — THE SAMPLES-PER-LOBE FLOOR, DERIVED.** `node tools/bloom-lobe-resolution.mjs`.
One period of the law at the demonstration's own depth and pitch, its polyline through `n`
stations placed as the LADDER places them (turning plus the 0.70 arc share, ends on crests),
with a uniform placement beside it as the control the ladder is not. Two clauses: **(i)**
every tip shape's BROAD feature — the round sinus of 0.50, the flat crest of 2.00, either of
1.00's, each band the region where the cut is within a tenth of its extreme — spans at least
two station gaps, so it is drawn as a bend and not a corner (the first draft counted stations
inside the band and stepped 3, 2, 3, 2 with parity; the ratio does not); **(ii)** every pair is
drawn further apart than either drawing's own chord error while keeping half the laws' true
separation. The first draft of the instrument had only clause (ii), a HEIGHT comparison, and
passed at `n` 4 — which the sheet had already refuted: four points per period differ in
vertex heights without differing in shape. The bands, from the law's closed form, as
fractions of the period: 0.50 crest 0.064 / sinus 0.287; 1.00 crest 0.205 / sinus 0.205;
2.00 crest 0.380 / sinus 0.145.

| n | ladder: band / widest gap in it (0.50 / 1.00 / 2.00) | chord error (mm) | separation (mm) | (i) | (ii) |
|---|---|---|---|---|---|
| 4 | 0.92 / 0.82 / 1.27 | 0.168 / 0.171 / 0.282 | 0.294 / 0.282 / 0.473 | no | yes |
| 8 | 1.83 / 1.74 / 2.13 | 0.048 / 0.051 / 0.059 | 0.372 / 0.357 / 0.728 | no | yes |
| 10 | 2.24 / **1.91** / 2.49 | 0.030 / 0.031 / 0.045 | 0.379 / 0.405 / 0.735 | no | yes |
| **11** | 2.44 / 2.20 / 2.66 | 0.026 / 0.030 / 0.038 | 0.394 / 0.406 / 0.746 | **yes** | yes |
| 12 | 2.65 / 2.28 / 2.82 | 0.021 / 0.024 / 0.031 | 0.399 / 0.398 / 0.753 | yes | yes |

**The floor is 11 stations per lobe under the ladder's placement, 10 under a uniform one**
(`LOBE_SAMPLES_PER_LOBE = 11`). The ladder's rows land on the SHOULDERS, where the outline
turns, and leave the round bands' centres the widest gaps, and the binding shape is the
default 1.00, whose crest and sinus bands are the narrowest broad feature in the range: the
range's ENDS alone are distinguishable from `n` 10 under the ladder, and it is 1.00's own
roundness that needs the eleventh. NAME THE SAMPLING: stations per lobe PERIOD, scale-free by
construction; the demand it sets is a COUNT of rows in the window. Ten is the buckle's own
bar plus two; eight is what the three-lobe cell had, and it was not picked. **The
demonstration** is `node tools/shot-bloom-lobe-floor.mjs <dir>` — the range's ends at 11
exactly, at 10 exactly, and at 4 (the first sheet's condition), macro, print preview ON,
through the capability hook. **Rendered on the final tree (print preview ON on every cell,
`shownMode` asserted "export"; same-tree control 3 px on the first cell, reported never a
floor), and READ:**

| cell | stations in the window (demand) | what the eye gets |
|---|---|---|
| `floor-11-q050` / `q100` / `q200` | 23 / 23 / 23 (22) | three shapes: a pointed crest over a round sinus; round both; a flat crest over a narrower sinus |
| `floor-10-q050` / `q100` / `q200` | 21 / 21 / 21 (20) | **the ends still read apart** — 0.50's point and 2.00's flat top are plain; 1.00 against 11's 1.00 is the same picture to the eye |
| `floor-04-q050` / `q100` / `q200` | 9 / 9 / 9 (8) | polygons: 0.50's sinus is a V of two chords, 2.00's crest a trapezoid; the three still differ, as polygons differ |
| `six-04-q050` / `q100` / `q200` | 25 / 25 / 25 (24) | the sheet Eva ruled on, reproduced: a sawtooth, a sawtooth, a crenellation |

**THE DEMONSTRATION EVA ASKED FOR — "obviously different at the derived count, not one step
below" — IS NOT WHAT THE MEASUREMENT GIVES, and this is said plainly rather than shown
selectively.** The derived floor is the count at which the DEFAULT shape's own broad bands are
drawn as bends (clause (i) at 1.00 reads 1.91 gaps at 10 and 2.20 at 11), and the eye
confirms the ends distinguish well below it: at 10 the pair 0.50 / 2.00 is as plain as at 11,
and the eleventh station buys 1.00's roundness, which at this crop is not a difference the
eye reports. The count at which the ENDS stop reading apart lies between 4 and 10, so the
tool renders 8 and 6 as well (`floor-08-*`, `floor-06-*`) for Eva to rule on by eye, with
what each floor would buy in lobes beside it (B10.2's capacities, 27 at the default coverage
and 31 at maximum). **Read, with the others:** at **8** (17 stations in the window) the three
shapes still read apart, and every one is FACETED — 1.00's crest is a run of flats, 2.00's
shoulders are chords, 0.50's sinus has lost its roundness; at **6** (13 stations) 1.00 is a
hexagon and 2.00 a crenellation with faceted shoulders — polygons that still differ from each
other, as polygons do; at **4** the sawtooth. So the eye's ladder is: 11 round, 10 the same
picture as 11, 8 faceted, 6 polygonal, 4 a staircase. The derived 11 is where the DEFAULT
shape is round; 10 is indistinguishable from it at this crop; the ends never merge above 4.

| floor (stations a lobe) | rows cap at coverage 0.80 | at 1.00 | clause (i) on the default shape |
|---|---|---|---|
| 11 (derived, shipped) | 2 | 2 | holds (2.20 gaps) |
| 10 | 2 | 3 | fails at 1.00 (1.91) |
| 8 | 3 | 3 | fails at every shape (1.74–2.13) |
| 6 | 4 | 5 | fails |
| 4 (the first sheet) | 6 | 7 | fails — the sawtooth |

A lower floor is one constant (`LOBE_SAMPLES_PER_LOBE`) and re-measures the count rows of
block 29 (their labels carry the capacities) and nothing else; the ladder, the capacity and the
caps are all derived from it.

**B10.2 — THE CONSEQUENCE FOR THE COUNT, stated plainly.** The demand is `count × 11` rows
in the window; the ladder can place at most its CAPACITY there — its free rows (39) less
what its own gap bound (1.40 × uniform, or uniform at the buckle's frequency cap) needs
outside the window: `ceil(stretch / gap)` rows between the last held row and `u0`, and
`ceil(tip / gap)` between `u1` and the apex (`ladderWindowCapacity`). The count is the least
of asked, capacity / 11 and the pitch floor's own cap; under one of either it is NO ROOM,
told, nothing cut. On the default petal:

| coverage | window (u) | capacity (rows) | rows cap | pitch cap (floor 1.20) | **built** |
|---|---|---|---|---|---|
| 0.80 (default) | 0.402–0.800 | 27 | 2 | 11 | **2** |
| 1.00 | 0.300–0.800 | 31 | 2 | 14 | **2** |
| 0.10 | 0.752–0.800 | 13 | 1 | 1 | **1** |
| 0.80 under buckle f 7 (the ladder uniform by the buckle's rule; capacity = uniform's own window rows) | 0.402–0.800 | 22 | 2 | 11 | **2** |
| 0.80 at `petalTipShape` 0.60 (uCap 0.646) | 0.364–0.646 | 21 | 1 | 9 | **1** |
| 20 mm petal, 1.00 | 0.300–0.800 | 31 | 2 | 8 | **2** |
| 20 mm petal, 0.10 | — | 13 | 1 | **0** | **NO ROOM (pitch)** |
| 20 mm petal, sheet 2.40, 0.40 | 0.611–0.800 | 19 | 1 | 1 | **1** |

**THE TRUE REACHABLE RANGE WHERE BOTH HOLD IS TWO LOBES — at the default coverage and at
maximum, on every petal length the range offers — and ONE where the window is short (coverage 0.10, or `petalTipShape` 0.60's
short cap region), and NONE on a short petal at low coverage.** Not 2–8, not 10 at
maximum. That is a finding, not a failure: the 56-row ladder holds 27–31 rows above the root
blend and under the apex once its own bound is paid, and a lobe drawn as a shape costs 11 of
them. Three lobes at maximum coverage would need 33 rows against 31: the tip keeps 8 under
the 1.40 bound, so three lobes are one constant away (`LADDER_MAX_GAP_FACTOR` 2.0 gives the
tip 6 and the window 33) — a change to a buckle-protecting bound that every buckle row would
re-measure, and it is not made here. The rows cap binds before the pitch cap on every
reachable state (a pitch cap strictly below the rows cap needs a window under 2.4 mm inside
a capacity of 22, which no petal length in the range produces); `clampedBy: 'pitch'` is
therefore reachable only as NO ROOM, and block 29 carries that row.

**HOW THE LADDER SATISFIES THE DEMAND, in its own measure.** `profile.ladderDemand()` hands
`bladeStations()` `{ u0, u1, stations }` (null on a plain petal and under NO ROOM, so the
plain path is today's to the bit — the partition, B6). With a demand the ladder decides the
three REGION COUNTS first — the window gets what the base measure would give it, raised to
the demand and held at the capacity (or exactly the demand under the demonstration's
capability); the rest is split between the stretch below and the tip above by the base
measure's own masses, each raised to the minimum the gap bound needs — and then places each
region's rows at equal increments of the SAME cumulative measure over that region. One
placer, one measure, partitioned. **The first implementation was a multiplicative factor on
the window's increments solved by bisection, and A8 caught it**: with the window's rows
pulled in, the blend that enforces the gap bound targeted the global uniform ladder, which
pulls rows back out of the window; blending region-wise with the measure's own stretch/tip
split instead left the stretch two rows and its gaps at 1.62 × uniform — infeasible whatever
the blend. The region counts decide feasibility before placement, the blend target is
uniform within each region with THOSE counts, and A8 reads exactly 1.400 on every lobed row
(measured; 1.295 on the plain default, unchanged).

**B10.3 — THE APEX, as measured, not as intended.** `probe-apex` on the final tree, both
modes, two lobes at 0.30 ×, and the six-lobe triptych Eva saw reproduced through the
capability (4 stations a lobe):

| | tip shape | window end `u1` | cut AT `u1` | last sinus | outline slope below / above `u1` | turn at the join | stations above `u1` |
|---|---|---|---|---|---|---|---|
| two lobes | 0.50 | 0.8000 = uCap | 0.00e+0 (4.9e-4 just below) | 0.703 | +0.349 / −0.374 | **−39.7°** | 10 |
| two lobes | 1.00 | 0.8000 | 0.00e+0 (8.1e-7) | 0.703 | −0.374 / −0.374 | 0.00° | 10 |
| two lobes | 2.00 | 0.8000 | 0.00e+0 (2.2e-12) | 0.703 | −0.374 / −0.374 | 0.00° | 9 |
| six (the triptych) | 0.50 | 0.8000 | 0.00e+0 (1.5e-3) | — | +1.794 / −0.374 | **−81.4°** | 10 |
| six | 1.00 / 2.00 | 0.8000 | 0.00e+0 | — | −0.374 / −0.374 | 0.0° | 10 / 9 |

Identical in LIVE and EXPORT (the ladder and the window are mode-free). **Who owns the apex:
`petalTipShape`, untouched.** The window ends exactly at `uCap` on a crest where the cut is
exactly 0 (the branch, not a multiplication), and `(uCap, 1]` is the base outline's own —
the apex law over `[widest point, 1]` with the print-floor clamp, 9–10 stations of it. What
Eva saw in the pointed panel is the JOIN: the pointed law's crest is a corner (`|sin πf|` has
a finite slope at its zeros — `π · depth · h / pitch`), so at tip shape 0.50 the last tooth's
flank meets the apex taper at 81° on the triptych's 2.38 mm pitch (40° at two lobes' 7.14 mm)
and reads as running into the apex; at 1.00 and 2.00 the crest's derivative is zero and the
join is tangent-continuous, so the teeth stop short. The options, costed and NOT taken:
(a) leave it — the corner belongs to the pointed law and appears only at its floor; raising
the range's floor from 0.50 to 0.55 makes every reachable crest tangent to the base (one
constant, zero bytes on every other state); (b) end the window on a SINUS so the apex is a
crest — a second owner of the apex region (`uCap`'s entry width would move with the lobes,
A6's fit and the sagitta with it), refused by §5's contract; (c) feather the last lobe into
the tip cap — a third region with its own law, the L2 identity outside the window lost. Not
fixed, as instructed.

**B10.4 — ONE CELL, the triptych at a count the floor permits.** `tools/shot-bloom-lobe-floor.mjs`
also renders `trip-q050 / trip-q100 / trip-q200`: tip shape 0.50 / 1.00 / 2.00 on the
SHIPPING tree, two lobes at 0.30 ×, macro, print preview ON, the same-tree control on the
first cell — **rendered on the final tree, its own same-tree control 2 px** (the triptych's
first cell shot twice; reported, never a floor):

| cell | stations in the window (demand 22) | read |
|---|---|---|
| `trip-q050` | 25 | pointed crests over round sinuses — the crest reads as a point, and its flank meets the base outline at the window's ends as B10.3 measured |
| `trip-q100` | 27 | round crests, round sinuses, a wave |
| `trip-q200` | 28 | flat-topped crests over narrower sinuses — a crenellation drawn as bends, not steps |

The shipping ladder hands the window MORE than the demand here (25–28 against 22): the base
measure's own turning puts more rows in the lobed stretch than 2 × 11, and the ladder keeps
the larger of the two by construction (B10.2, "raised to the demand"). Three images and one
control, in `lobe-floor/`; read them beside `six-04-*`, which is the staircase they replace.

**B10.5 — What else the amendment moved.** The connectedness gate gained the flower gate's
recorded rule: a row that reads more than one component at 0.6 mm is re-read at 0.3 mm
before it is called detached, and the refinement is printed on the row. Found on `LOBES: x
buckle 0.30 f 3` under the demand: ONE cell holding ONE 0.15 mm² tip triangle that shares
vertices with ten neighbours in a watertight mesh read as a second component at 0.6 mm and as
one piece at 0.55, 0.5, 0.45, 0.4 and 0.3 — a rasterisation artefact of the quarter-cell
sampler, not a gap. A row still in pieces at the finer cell fails as before, and every other
row's cost and verdict are what they were.

**B10.7 — THE LADDER'S PLACEMENT RODE ON THE LAST BIT, AND X0 CAUGHT IT.** The export gate
on the final tree refused three lobed rows as "not this state's build": the page's STL and
the harness's Node rebuild of the page's own read-back state disagreed — `x the far-out
widest point` at 2,880 of 171,360 floats (first at triangle 1,620, 0.0021 mm apart),
`x CONTINUOUS x 3 turns` from float 69,447, `x SPHERE` at 28,014 of 569,376 (first at
triangle 17,140). Node builds the same state identically twice, live then export, in either
order; so the two ENGINES differ — Node 22.22.2 is V8 12.4, the gate's Chromium 141 is V8
14.1 — and a trace of every decision the ladder makes, taken in both (`__ladderTrace`, a
temporary hook, removed), put the difference where it lives: the cumulative measure the
ladder places against is a sum over its samples of turning and arc, transcendental at every
term, and its total on one petal reads 23.32174358567136 in the page against
23.321743585672174 in Node — **8.1e-13 apart, a few hundred ulps accumulated**, on every
petal of every lobed row. That is harmless until a DISCRETE decision sits on it, and the
demand put two there. **(a) The region's last station was asked for at `cA + (cB - cA)`**,
which is `cB` give or take an ulp — and under a demand `cB` is one of the measure's own
samples (`cumAt` snaps the window's ends to the grid), so the search landed ON that sample
in one engine and one past it in the other: a whole ladder sample, measured **5.5e-4 in `u`
at station 19** of the continuous row's live ladder (0.30835 against 0.30890). With no
demand `cB` is the total and the answer is the top sample either way, overwritten by
`out[NU - 1] = 1`. **(b) The gap-bound blend is a bisection run to 2^-60**, handing back
the largest admissible blend to its last bit — a bit that is a function of the low bits of
every sample; the far-out row's station 20 differed by exactly one ulp in the page. Under a
demand the blend is the NORMAL case (the window's rows are raised past the base measure's,
the outside gaps widen to the bound on most lobed petals), where on the plain ladder it
binds rarely. The fix, in `bladeStations`: the last station of a region is asked for at
`cB` itself; and under a demand the blend is floored to a grid of 1/4096 — still admissible
(the widest gap is monotone in the blend) and unmoved by an ulp unless the exact boundary
sits within an ulp of a grid line. **Only under a demand**: the plain path keeps main's
placement to the bit by construction, which is the partition's holder claim (B6). After it:
**0 of 171,360 / 0 of 510,624 / 0 of 569,376 floats differ** between the page's export and
the Node rebuild on the three rows, and the trace reads identical region counts, identical
search landings and an identical blend on all 24 petals of the continuous row, with the
measure itself still 8.1e-13 apart underneath. What remains engine-dependent is an ulp: the
blend's target bands read the window's `u0` / `u1`, whose last bit comes from the rim table,
so one lobed station can differ by an ulp between engines — below `fround`, invisible to X0,
reported. **NAME THE CLASS**: a placement decided by a strict comparison of two values that
are equal by construction is a placement decided by the last bit — the fourth instance of
"a discrete decision on a continuous quantity" here, after the turning integrated through a
kink, the fit through the print floor and the stale harness row. The plain ladder's own
bisection carries the same exposure wherever its bound binds; main's X0 passes over the
whole matrix in CI, so nothing sits on it today, and it is recorded rather than moved —
measured, not assumed: on the live matrix without its lobe rows (613 rows, both modes, Node)
the bound BINDS on **348 of 1,226 row-modes** — `petalWidth` min, `petalTipShape` 0.60 and
3.00, `buckleAmp` max, `layerCount` 6, the rose among them — each reading exactly 1.400 ×
uniform, so each hands back a blend decided at 2^-60. None has tripped X0 because a station
moved by one ulp rounds to the same float32 all but once in 2^29; that is a hazard below the
gate's resolution, not a defect in it, and flooring the plain blend too would move 348
row-modes of bytes — a partition event of its own, not this PR's.

**B10.6 — Ball.** WAITING ON EVA — one ruling with three parts, all from the images in
`lobe-floor/`: **(1) the floor's level** — 11 is what the derivation gives (the default shape's
bands drawn as bends) and the eye confirms the range's ENDS distinguish below it; the 8 and 6
cells are rendered so the floor can be ruled by eye against what each buys (3 lobes at 8, 4–5
at 6, against 2 at 11) — the shipped constant stays 11 until ruled; **(2) the reachable count**
— two lobes on the default petal at every coverage under the shipped floor (B10.2), and whether
the tip's 1.40 bound may give up two rows for a third at maximum coverage; **(3) the apex join
at tip shape 0.50** (B10.3 — option (a), the range's floor to 0.55, is one constant and zero
bytes elsewhere). The triptych (B10.4) is the one cell asked for, at two lobes, with its own
control.
