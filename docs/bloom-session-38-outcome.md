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
