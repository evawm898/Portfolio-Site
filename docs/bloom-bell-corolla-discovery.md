# Parametric Bloom — bell, nodding and corolla discovery

*Sep 17, 2026. Discovery only: what bell-type and nodding flowers need, how far the shipped
controls already get, and what a fused corolla would cost. Nothing is built. Read
`docs/bloom-charter.md` first; every measurement here names its MODE and its SAMPLING (the
session-32 rule), every claim about the code cites `main` at `7ebfb7f` (#244 merged), and every
premise in the kickoff prompt was checked against source or a measurement before it was used.
Nothing here routes through `/plot` or `/print`. No registry, geometry or gate file was touched;
`git diff --stat` against `main` is this one file.*

**What was measured, and on what.** Every state was built by the SHIPPED `buildBloomInto` in
EXPORT mode in Node from `bloom-registry.js`'s `DEFAULTS` plus a named set, on the builder's own
doubles. The self-intersection figures are the X family's own census
(`tools/bloom-self-intersection.mjs`, within-shell pairs and worst span). The connectedness
figures are the connectedness gate's own `voxelComponents` at its 0.6 mm cell with the 0.3 mm
re-read on any multi-component reading (copied verbatim into a scratch script; the gate's file
runs its matrix on import). Seam turn, seam step and the clamp flag are read off each petal's
`bladeLadder` record; the blade's elevation, tip landing and throat off `spine.rows`; the margin
span off `petalSurface(...).rowAt(u).sect(±1)` for slot 0 at `u` 0.5 and 0.98, as a multiple of
the slot pitch. **Calibration:** the two shipped incurve rows reproduce `main`'s own declared
census numbers exactly — 9,944 pairs / 0.3709 mm at rise 0.5 and 510 flat — so the Node state
mapping is the page's. **The pictures** are real pages (the harness's `openBloom` /
`applyConfig` / `fullStateDrift` / `stillFrame`, print preview ON, the mode read back from the
app, three consecutive byte-identical frames before a capture) and are held for Eva's eye at
<https://claude.ai/artifact/JVKzSFBFmuQGmfSnrPVr8a> — 31 cells, side-on and from below the
mouth, **the head's axis pointing DOWN in every frame** (the camera's `up` is −z; nothing in the
geometry is rotated). No pixel delta is quoted anywhere. Tilts outside the shipped 0..75 were
built by the same geometry module (it does not clamp; the slider's range is the only clamp) and
rendered from a scratch worktree whose only change is that range; every such cell and row is
labelled NON-SHIPPING. Measurement scripts lived in the session scratchpad and are not committed.

---

## 0. The answer in one paragraph

**A hanging bell is not a new form for this generator; it is the closed tulip Eva kept, hung
up.** The nod is a rigid rotation of the whole head, so in the head's own frame a campanula is
`petalTilt` near 90 with `petalCup` about 0.6 and the mouth flared by a negative spine curl —
and at the shipped maximum of 75° the head already reads as a lobed bell from the side and a
five-lobed bluebell at five petals (sheet rows A–C). What the shipped range cannot reach is the
URN (a mouth narrower than the tube, `petalTilt` past 90) and the CYLINDER (exactly 90), and the
thing that limits the bell is not the tilt clamp but the CUP: from 0.7 up every petal folds at
its own apex (139 pairs at 0.7, 758 at 1.2, the session-32 §18a class), at every tilt alike.
**The tilt ruling is now a derivation and not a hunch:** the seam law's "past a right angle no
spacing satisfies it" is true past 120° and false between 90° and 120°, where the first blade
row has a WINDOW to sit in, `a(1+|cos θ|)/sin θ ≤ s₁ ≤ a sin θ/|cos θ|`, closing at exactly
|cos θ| = ½ — which is the crossover PR #210 measured at 115–123° and left unexplained. A scratch
tree carrying the window's lower bound clears every flat fold from 93° to 115° (336 → 0) and
does nothing past 120°, 22 of 22 rows landing where the closed form said. **The fused corolla is
one new primitive, not two routes:** a closed-ring panel (the petal panel made periodic across
the width, with a per-column top extent for the lobes), of which "a lathe" is the axisymmetric
special case; it dissolves the lathe/sheet question, reaches bilabiate where a lathe cannot, and
keeps every petal control meaningful above a fusion row. **Nodding on a single head with a
straight stem is orientation, not geometry** (the 180° hinge is the same STL); what makes a nod
visible is the pedicel's crook, which is the axis-curvature session (Q5). Build order: the tilt
ruling with the window law (small), then the closed-ring panel, then the centreline; the nod
follows the centreline for free.

---

## 1. Where the prompt's framing was wrong, checked against source or measurement

| # | The prompt said | What is true | Where |
|---|---|---|---|
| 1 | "A nodding head lives in the effective-tilt-past-90° regime permanently" | **No.** The nod is a rigid rotation of the whole head. In the head's own frame a hanging bell is a CUP — tilt ≤ 90 — the tulip form Eva kept at cup 1.20 on Aug 31. Tilt past 90 in the head frame is the URN (a constricted mouth: heather, lily-of-the-valley) and, with the head nodded, the reflexed CYCLAMEN — not the bell. | §2, sheet rows A and F |
| 2 | "the clearance inequality reverses past 90° … no spacing satisfies it" (inherited from PR #210) | **True past 120°, false between 90° and 120°.** A window exists and closes at exactly 120°; PR #210's measured crossover of 115–123° is that closing. Measured on a scratch tree, 22 of 22 rows as predicted. | §4, Q1 |
| 3 | "if the clamp stops short of 90° say so and sweep to the clamp" | The clamp is 75° on `petalTilt` (`bloom-registry.js:1841`). **75–90 is reachable today on an inner whorl** (`layerTilt` up to 30° a whorl) and the seam turn past 90 is reachable on any domed head without the blade aiming past 90 at all (`domeLean` adds the cap's slope to the seam turn and holds the global aim). The fold-free bell range is bounded by CUP (≤ 0.6), not by tilt. | §3, T5, T6 |
| 4 | "The hinge is free once heads take a frame (Q2/Q9)" | **There is no frame yet** — `buildBloomInto` is origin-locked (`bloom-geometry.js:9159`, the inflorescence doc's own Q2). A hinge on a STRAIGHT rod is either unobservable (180°: the same object) or a kink at the root (an obliquely rooted rod, the petiole's shape). The nod that reads right is the pedicel's curve, so Q4 depends on Q5 for a single head. | Q4 |
| 5 | "Corolla form … blocked on surface self-closure (absence #5), the largest hole in the model" | A CLOSED corolla by overlap already ships: at tilt 75 the margins of neighbouring petals cross by 1.80× the slot pitch mid-blade and the tube is open only at the lobes (0.21× at the mouth). What self-closure buys is a seamless wall and a throat. The honest primitive is a closed-ring panel — not topology surgery on the petal sheet, and not a lathe. | Q2 |
| 6 | "confirm or refute that a lathe cannot do bilabiate because it is axisymmetric" | **Confirmed for a lathe, and moot**: the primitive that should be built takes any closed cross-section per row and any top extent per column, so two lips of different heights and the per-petal tilts the roles already give the limb are one control away. | Q2 |
| 7 | "Ranked by how much of the look they carry: corolla > nod > curve" | For FREE-petal bells the look is carried by cup × tilt (shipped) and the mouth's curl (shipped); the corolla buys the seamless tube and the throat; the curve is what makes a nod visible at all. The ranking holds for a SNAPDRAGON and inverts for a SNOWDROP. | §2, Q7 |
| 8 | "Runs after #243 (sepals) merges" | **#243 is still open** (draft, `claude/great-ptolemy-a96x2l`, updated 13:30 UTC today). This session is docs-only and collides with nothing; any build session that follows this doc waits for it, on the one-registry-PR rule. | PR list |
| 9 | "three unrelated capabilities" | Two of the three are one for a single head: the nod is unobservable without the curve. They are three for an inflorescence, where the frame exists anyway. | Q4, Q5 |
| 10 | The vocabulary sources | `en.wikipedia.org` is blocked by this container's egress proxy (`EGRESS_BLOCKED`), so the botanical terms below are from knowledge, not a fetched page. Nothing in the costings rests on a definition. | — |

---

## 2. Phase A — the sheet, read

31 cells, all settled. Every caption carries the tree, the app's own mode, the shown triangle
count and the Node census for the same label. Readings, in the sheet's own row order:

* **A. Tilt × cup, flat, 8 petals, curl 0, hung.** Tilt 45 at any cup is an open saucer
  (hellebore-ish only if you squint). Tilt 60 × cup 0.6 is a hanging skirt with spread lobes —
  a loose fritillaria. **Tilt 75 × cup 0.6 reads as a lobed bell: a closed tube over the lower
  two thirds and eight free lobes at the mouth**, which is a campanula's construction exactly.
  Tilt 75 × cup 1.2 is the tighter, taller tube with the lobes nested — and it carries 758
  within-shell pairs, every one of them the apex fold of §18a, not the seam.
* **B. Five petals, tilt 75.** The bluebell. Cup 0.6 reads as one; cup 1.2 is a closed bud.
* **C. The mouth.** Spine curl −45 on tilt 75 × cup 0.6 turns the lobes to 30° of elevation
  (a recurved lip, 0 pairs); **−90 reflexes them to 15° below horizontal (a lily-of-the-valley
  mouth, 0 pairs)**; +45 closes the crown. Cup gradient +1.2 tightens the tube toward the mouth
  and folds (736 pairs — it is a cup); −0.8 opens it (0). Roll 180 quills each lobe inside a
  tube shape and folds hard (1,464 pairs); roll is not a bell control.
* **D. Domed heads.** Rise 0.5 and 1.0 at tilt 75 × cup 0.6 look like row A's cell — the dome
  holds the global aim — and carry 342 and 1,058 pairs at the seam, because the seam turn is
  128° and 165° there. The picture and the census disagree on purpose: the fold is under the
  foot, where the eye does not go.
* **E. Inner whorls past 90.** Two whorls with a 30° step put the inner whorl at 105°; it reads
  as a bell inside a bell and carries 5 pairs (span 0). Three whorls (135° innermost) carry 959.
  Why the two-whorl case is clean while a single whorl at 105 is not is §4.
* **F. Lifted clamp (NON-SHIPPING).** Tilt 90 is a straight-walled CYLINDER with lobes
  (tubular; 1 pair, span 0). Tilt 105 on a 35 mm blade converges to the axis and closes (a bud,
  not an urn; 339 pairs at the seam). **Tilt 105 with curl −90 is the URN: a waisted tube with
  a reflexed lip** — the lily-of-the-valley silhouette — and its 336 pairs are all at the seam,
  which the window law clears (§4). Tilt 105 on a 20 × 8 mm blade is a closed cone. Tilt −30 and
  tilt 0 × curl −90, hung, sweep the petals back past the receptacle: the reflexed shooting-star
  / cyclamen form, 0 pairs at cup 0.
* **G. On a straight stem.** The bell hangs from its stem exactly as it would from a pedicel
  — because a 180° nod on a straight stem is the same object (Q4).

**Which cells read as a bell, said plainly:** tilt 75 × cup 0.6 at eight petals and at five;
tilt 75 × cup 0.6 × curl −45 (the recurved lip); tilt 90 × cup 0.6 (tubular, non-shipping);
tilt 105 × cup 0.6 × curl −90 (urceolate, non-shipping). **Which read as a broken flower:** every
cup 1.2 cell (a closed bud with a fold the eye cannot see), every roll cell, the three-whorl
step-30 cell, and tilt 105 at 35 mm without a curl (a closed cone). Tilt 45 reads as neither.

---

## 3. Phase A — the numbers

### T1. Flat head, 8 petals, curl 0 — tilt × cup (EXPORT, the shipped builder; † = lifted clamp)

| tilt | cup | within-shell pairs | worst span mm | voxel pieces | seam turn ° | blade base→tip ° | tip r / z mm | margins mid / mouth (× pitch) |
|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 0 | 0.000 | 1 | 0 | 0 → 0 | 43.84 / 0 | 0.72 / 0.08 |
| 0 | 1.2 | 757 | 0.127 | 1 | 0 | 0 → 0 | 43.84 / 0 | 0.72 / 0.08 |
| 45 | 0.6 | 6 | 0.000 | 1 | 45 | 45 → 45 | 33.59 / 24.75 | 1.02 / 0.11 |
| 60 | 0.6 | 2 | 0.000 | 1 | 60 | 60 → 60 | 26.34 / 30.31 | 1.30 / 0.14 |
| 75 | 0 | 0 | 0.000 | 1 | 75 | 75 → 75 | 17.90 / 33.81 | 1.32 / 0.20 |
| 75 | 0.6 | 1 | 0.000 | 1 | 75 | 75 → 75 | 17.90 / 33.81 | 1.80 / 0.21 |
| 75 | 1.2 | 758 | 0.127 | 1 | 75 | 75 → 75 | 17.90 / 33.81 | 2.63 / 0.22 |
| 90 † | 0.6 | 1 | 0.000 | 1 | 90 | 90 → 90 | 8.84 / 35.00 | 2.70 / 0.44 |
| 90 † | 1.2 | 762 | 0.127 | 1 | 90 | 90 → 90 | 8.84 / 35.00 | 3.90 / 0.50 |
| 105 † | 0 | 336 | 0.402 | 1 | 105 | 105 → 75 | 0.21 / 33.81 | 2.69 / 3.94 |
| 105 † | 0.6 | 339 | 0.491 | 1 | 105 | 105 → 75 | 0.21 / 33.81 | 3.96 / 2.62 |
| 120 † | 0.6 | 340 | 0.589 | 1 | 120 | 120 → 60 | 8.66 / 30.31 | 2.81 / 0.39 |
| 135 † | 0.6 | 984 | 0.563 | 1 | 135 | 135 → 45 | 15.90 / 24.75 | 2.15 / 0.22 |

Every one of the 300 states in the tilt × cup × curl grid (10 tilts × 3 cups × 5 curls × 2
counts) exports as ONE piece at the 0.6 mm cell. The pairs at cup 1.2 are the same ~750 at every
tilt from −30 to 90: the apex fold of session 32 §18a, pre-existing, and independent of the tilt.
The pairs from 105 up are the SEAM, and they are §4's. A 35 mm blade at 105° lands its tip on the
axis (r 0.21 mm), which is why that cell is a closed cone rather than an urn.

### T2. Where the two folds start (8 petals, the shipped law)

| `petalTilt` at cup 0.6 | 88 | 89 | 90 | 91 | 92 | 93 | 94 | 95 | 97 | 100 |
|---|---|---|---|---|---|---|---|---|---|---|
| within-shell pairs | 7 | 5 | 1 | 4 | 104 | 341 | 338 | 338 | 339 | 339 |
| worst span mm | 0 | 0 | 0 | 0 | 0.058 | 0.453 | 0.449 | 0.442 | 0.449 | 0.481 |

| `petalCup` at tilt 75 | 0.6 | 0.7 | 0.8 | 0.9 | 1.0 | 1.1 | 1.2 |
|---|---|---|---|---|---|---|---|
| within-shell pairs | 1 | 139 | 367 | 449 | 682 | 747 | 758 |
| worst span mm | 0 | 0.051 | 0.210 | 0.189 | 0.202 | 0.155 | 0.127 |

**The seam fold on a flat whorl starts between 91° and 93°, not at 90°**; the cup fold starts
between 0.6 and 0.7 and is the one that bounds a bell. Span-0 counts of single digits are the
census's known tangency touches (the `LOBES: x cup 0.40` knife-edge class), not folds.

### T3. Spine curl at the mouth — 8 petals, cup 0.6

| tilt | curl | pairs | span mm | blade base→tip ° | tip r / z mm | margins mid / mouth |
|---|---|---|---|---|---|---|
| 75 | −90 | 0 | 0 | 72.6 → −14.5 | 36.13 / 15.76 | 1.08 / 0.10 |
| 75 | −45 | 0 | 0 | 73.8 → 30.2 | 29.61 / 27.06 | 1.36 / 0.13 |
| 75 | 0 | 1 | 0 | 75 → 75 | 17.90 / 33.81 | 1.80 / 0.21 |
| 75 | +45 | 0 | 0 | 76.2 → 119.8 | 4.39 / 33.82 | 2.42 / 0.86 |
| 90 † | −90 | 0 | 0 | 87.6 → 0.5 | 31.13 / 22.28 | 1.43 / 0.12 |
| 90 † | −45 | 0 | 0 | 88.8 → 45.2 | 21.90 / 31.51 | 1.94 / 0.17 |
| 105 † | −90 | 336 | 0.493 | 102.6 → 15.5 | 24.60 / 27.29 | 2.09 / 0.15 |
| 105 † | −45 | 336 | 0.492 | 103.8 → 60.2 | 13.30 / 33.82 | 3.00 / 0.29 |

Curl moves the mouth and never the seam: the 336 at 105 are the seam's at every curl, and every
curl at 75 and 90 is clean. The flare is a shipped control.

### T4. Cup gradient and roll — 8 petals, cup 0.6, curl 0, tilt 75

| control | pairs | span mm | margins mid / mouth |
|---|---|---|---|
| cup gradient −0.8 | 0 | 0 | 1.45 / 0.20 |
| cup gradient +1.2 | 736 | 0.268 | 2.63 / 0.23 |
| roll −180 | 3,928 | 0.867 | 0.07 / 0.20 |
| roll +180 | 1,464 | 0.731 | 0.23 / 0.21 |
| roll 330 | 10,384 | 0.913 | 0.29 / 0.18 |

### T5. Domed heads — the seam turn past 90 with the global aim held (8 petals, curl 0)

| rise | tilt | cup | seam turn ° | pairs | span mm | blade base→tip ° |
|---|---|---|---|---|---|---|
| 0.5 | 60 | 0 | 113.1 | 216 | 0.398 | 60 → 60 |
| 0.5 | 75 | 0.6 | 128.1 | 342 | 0.443 | 75 → 75 |
| 1.0 | 60 | 0 | 150.0 | 944 | 0.549 | 60 → 60 |
| 1.0 | 75 | 0.6 | 165.0 | 1,058 | 0.661 | 75 → 75 |

The blade aims where it aims flat; the fold is entirely under the foot. These rows are the
declared `EFFECTIVE TILT PAST 90` class (49 of the 261 entries in `SELF_INTERSECTION_XFAIL`).

### T6. Global aim past 90 through the shipped controls (8 petals, tilt 75, layerSize 0.90)

| whorls | step | cup | seam turn ° (innermost) | pairs | span mm | tris |
|---|---|---|---|---|---|---|
| 2 | 15 | 0.6 | 90 | 6 | 0 | 37,888 |
| 2 | 30 | 0.6 | 105 | 5 | 0 | 37,888 |
| 3 | 30 | 0.6 | 135 | 959 | 0.490 | 56,736 |

### T7. Size, sheet and stem at the bell corner (8 petals, cup 0.6, curl 0)

| state | tilt | pairs | span mm | seam step | tip r / z mm |
|---|---|---|---|---|---|
| 20 × 8 mm | 75 | 0 | 0 | 1 | 11.43 / 19.32 |
| 20 × 8 mm † | 105 | 320 | 0.203 | 1 | 1.08 / 19.32 |
| 60 × 16 mm † | 105 | 2 | 0 | 1 | 6.68 / 57.96 |
| 35 × 30 mm | 75 | 73 | 0 | 1 | 20.11 / 33.81 |
| sheet 2.40 | 75 | 1,679 | 0.336 | 1 | 21.57 / 33.81 |
| sheet 2.40 † | 105 | 1,995 | 0.763 | 1 | 3.45 / 33.81 |
| stem 60 × 6 | 75 | 1 | 0 | 1 | 17.90 / 33.81 |
| stem 60 × 6 † | 105 | 339 | 0.491 | 1 | 0.21 / 33.81 |

The 2.40 mm sheet folds at tilt 75 on the shipped law (1,679 pairs, the seam): the clearance
`(t/2) sin θ` is 1.16 mm there against a 0.625 mm row pitch, so the lattice step is 2 and the
first row still sits inside the foot's slab — a shipped state, pre-existing, not this doc's, and
in kind the `ONE lobe by both caps` row PR #210 cleared at 20 mm.

---

## 4. The seam past a right angle — a window, not a wall

**The contradiction that found it.** A single whorl at 105° folds (336 pairs); a second whorl
whose innermost ring is ALSO at 105° (75 + 30) reads 5 pairs at span 0 (T6). Attributed off the
builder's own `bladeLadder`: the single whorl's blade is 35 mm, the inner whorl's 31.5, and the
saturated clearance past 90° is `t/2 = 0.6 mm` on both — so the lattice step is
`floor(0.6/35 × 56) + 1 = 1` on one and `floor(0.6/31.5 × 56) + 1 = 2` on the other. The first
blade row starts at 0.604 mm on the single whorl (0.004 mm above the foot's top skin at the row
CENTRE, and below it once the sheet's half-thickness is offset along a normal that now leans
back over the foot) and at 1.087 mm on the inner whorl, which clears.

**The derivation, in PR #210's own frame** (the ring row at the origin, the foot along +r, the
blade leaving at θ from the outward radial, `a = t/2`, `c = cos θ`, `s = sin θ`). Below 90° the
binding condition is the seam panel's rim crossing the foot's top plane at `r ≥ 0`, which gives
`s₁ > a s` — the shipped law. Past 90° `c < 0` and two different things bind:

* the first row's +N skin, `T = s₁(c, s) + a(−s, c)`, has `z_T = s₁ s − a|c|` and sits over the
  foot (`r_T < 0`); keeping it above the foot's top plane needs **`s₁ ≥ a (1 + |c|) / s`**;
* the seam panel's −N skin runs from the foot's bottom corner `(0, −a)` to `B = s₁(c, s) −
  a(−s, c)`, whose radius is `s₁ c + a s`; if that is negative the panel's outer skin passes
  through the foot's own slab, so **`s₁ ≤ a s / |c|`**.

The window is non-empty iff `s² ≥ |c|(1 + |c|)`, i.e. `2c² + |c| − 1 ≤ 0`, i.e. **`|c| ≤ ½`, θ ≤
120° exactly.** At 120° it is one point; past it the fold is topological — the seam panel is a
chord where the corner would have to be mitred — and no station spacing clears it. That is PR
#210's "no spacing satisfies it", true from 120° on, and its measured crossover of 115–123° on
the incurve target is this window closing.

**Measured on a scratch worktree** (`main` plus one change: `seamClearanceMm` returns the
window's LOWER bound past 90° instead of saturating at `a`; nothing else touched; NON-SHIPPING):

| state (8 petals, cup 0) | shipped law | window law | window at that θ (mm), lattice `s₁` |
|---|---|---|---|
| tilt 93 … 100, cup 0.6 | 341 / 338 / 338 / 339 / 339 | 2 / 2 / 7 / 4 / 6 (span 0) | step 2 lands inside |
| tilt 105 | 336 | **0** | 0.78 .. 2.24, s₁ 1.25 |
| tilt 105, 5 petals | 213 | **0** | as above |
| tilt 105, 20 × 8 mm | 320 | **0** | 0.78 .. 2.24, s₁ 1.07 (step 3) |
| tilt 105, 35 × 30 mm | 422 | 161 | the wide blade's own margins |
| tilt 105, sheet 0.60 | 340 | 86 | — |
| tilt 105, sheet 2.40 | 1,995 | 1,672 | the thick sheet's own class |
| tilt 108 … 115 (35 mm and 20 mm) | — | **0 on all 10** | inside |
| tilt 116 … 119, 35 mm | — | 576 | s₁ 1.25 above the upper bound (1.23 .. 1.08) |
| tilt 116 … 119, 20 mm | — | **0** | s₁ 1.07 inside |
| tilt 120, both lengths | 336 | 576 | the window is a point |
| tilt 122 … 135 | 336 … 984 | 592 … 599 | closed |
| domed, rise 0.5, tilt 60 (seam 113°) | 216 | **0** | inside |
| domed, rise 0.5, tilt 75 (seam 128°) | 328 | 576 | closed |
| domed, rise 1, tilt 60 / 75 (150° / 165°) | 944 / 1,008 | 584 / 608 | closed |
| 3 whorls, step 30 (135°) | 896 | 576 | closed |
| the incurve target, rise 0.5 (128.1°) | 9,944 | 9,159 | closed; the step goes 2 → 4 |
| the incurve target, flat (89.9°) | 510 | 510 | the law is verbatim below 90 |

**22 of 22 window rows land where the closed form put them** (the `IN`/`OUT` prediction per row
was written from the formula and the lattice pitch before the census ran), and the two seams the
window says it cannot help — the incurve target at 128° and every hemisphere rim — it does not
help. Below 90° the scratch law is the shipped law character for character, which is why the
flat incurve row reads the same 510 on both.

**What this is and is not.** It is a derivation with a measurement behind it, on the seam law's
own terms; it is NOT a shipped change, and it does not touch PR #210's finding that past the
window the seam panel would have to be built differently. It says the tilt ruling has TWO
regimes with a hard edge at 120°, not one at 90°.

---

## Q1 — What the tilt-past-90° ruling would have to say

**Today.** `petalTilt` is 0..75, step 1, default 25 (`bloom-registry.js:1841`); 33 of 778
matrix rows pin it (two in the blanket sweep at 0 and 75, the rest at 40 or 75 by name) and 12
`ALL MAX` / `ALL MIN` rows inherit it. The seam law saturates at `(t/2) sin 90°` past a right
angle (`seamClearanceMm`, `bloom-geometry.js:3251`); A7 restates it in the harness; 49 xfail
entries carry `EFFECTIVE TILT PAST 90` and 5 `SEAM CLAMPED`. The seam turn is `|petalTilt +
tiltExtra + domeLean|`, so the past-90 regime is reached today by a tilt STEP on an inner whorl
and by a DOME's lean — never by the control alone.

**A ruling has three separable parts, and they are not the same size.**

1. **The RANGE.** Three candidates: (a) 0..90 — free of risk, since the shipped law is clean to
   91° (T2) and 90 is the cylinder; (b) −30..120 — the urn and the reflexed forms, which needs
   (2) to be worth anything; (c) further — needs a different seam panel (a mitred corner) and is
   not costed here. Negative tilt behaves as its absolute value at the seam (`Math.abs(tilt)`,
   `:6081`; T8's −30 row is +30's row) and reads as the reflexed cyclamen when hung; with a stem
   present a reflexed petal passes through the free stem, which the omission mask sees only on a
   SPHERE (`stemOmission`'s guard) — a flat head has no channel clause, so that state would ship
   as an unflagged cross-shell overlap.
2. **THE LAW PAST 90°.** Replace the saturation with the window's lower bound
   `a(1+|cos θ|)/sin θ` and REPORT when the lattice step lands past the upper bound `a sin
   θ/|cos θ|` — a second `SEAM CLAMPED`-style flag, told never refused. What it changes: A7's
   restated law (the harness rebuilds the expected clearance from the other owners, so the
   restatement moves with it and the `seam-floor-removed` mutant needs its anchor re-checked);
   `seamClearanceMm`'s header, which currently says the opposite; and the `EFFECTIVE TILT PAST 90`
   xfail text on every row, which would be split into "in the window" and "past 120°". **Which
   rows move: exactly those with a ring whose seam turn exceeds 90°** — the law is a branch below
   90, so everything else is bit-identical by construction, and the partition is predeclarable
   from a sweep of the builder's `seamTurnDeg` records (the seam session's own method). Of the 49
   declared rows, the ones between 90° and 120° (three `DEPTH: 6 turns × CONTINUOUS` rows at
   95.5°, the two 96.7° rows, `SLOT: ALL MAX × 3 layers` and `FAN × PER-PETAL` at 99°, the orchid
   × iris at 105°, `headRise max` at 115°) are candidates to clear to zero, each to be measured
   rather than predicted; the 128°–225° rows stay declared.
3. **THE FOOT does not move.** Nothing in either part touches `footRing()`; the held block
   starts later, as PR #210 built it to. J1–J4 and the crowding raster read foot rows that stay
   verbatim.

**Are nodding heads viable without re-deriving the obtuse side?** Yes, and this is the finding
that shrinks the ruling: a nodding BELL is tilt ≤ 90 in the head frame (§0), and the shipped law
is clean there. The obtuse re-derivation is owed by the URN and by the incurve-class domed heads,
and it is now a derivation (§4) rather than a re-measurement.

**Gate rows that would move under (1)(b) + (2):** the two blanket rows for `petalTilt`, the 12
inheriting `ALL MAX`/`ALL MIN` rows (`ALL MAX` would reach 120 + 5 × 30 = 270° on its sixth
whorl and stay a declared refusal), every row whose seam turn is past 90° (the 49 declared, plus
any undeclared row that lands between 90° and 93°, which T2 says exists — none in the matrix
today, since no shipped row's seam sits there), and a new block naming the window's edge at both
lengths. A frozen phase would be owed (rows added).

---

## Q2 — The corolla, two routes costed, and what they collapse into

**(A) Close the petal sheet on itself.** `emitPanel` (`bloom-geometry.js:7196`) emits one
`NR × NV` grid as two skins plus a rim: two side rims at `v = ±1` and two end caps. Closing the
sheet means the side rims go and the columns wrap — a panel PERIODIC in `v`, its rows closed
curves, closed by an inner cap (an annulus at the base) and either a tip cap or a boundary row
shared with the free lobes above it. The row's cross-section in the fused region is the N petals'
own `sect(v)` curves laid end to end, each mapped onto its slot's sector — which forces the fused
half-width to be DERIVED (the sector's chord, `π r(u) / N`), so `petalWidth` and the base taper
stop applying below the fusion row. Cup then draws a PLICATE (pleated) tube, twist a contorted
one, buckle a ruffled wall; roll cannot exist inside a closed ring (a rolled sheet is not a ring)
and is inert there. The foot stays N feet inside the slab — a single annular foot would hand the
area rule one foot of circumference `2πR0` and re-derive the hub radius from it, which is the
registration failure this project cleans up most — so the tube begins at the first blade row and
the N feet are untouched. Connectedness: the tube overlaps the hub through the feet as today; the
lobes share their boundary row with the tube (the cleft's `PANEL_OVERLAP_ROWS` pattern, `:3666`)
so every shell is closed and every overlap is cross-shell.

**(B) A lathe.** `revolveInto` (`:8930`) already builds a surface of revolution with a per-side
outline; the hub's sphere arm (`buildHubInto`, `:8734`) already builds a closed SHELL as two
concentric surfaces of revolution plus a rim band. A corolla lathe is that shell with a profile
`r(u)` (tube, throat, flare, limb reflex) and a top edge whose HEIGHT varies per column by the
lobe law `g(r)` (`lobeCutProfile`, `:5183`) — a notch cut down from the rim rather than in from
the margin. Same emitter shape as (A) with a circular section.

**They are one primitive.** Both are "a closed-ring panel with a per-column top extent"; (B) is
(A) with `sect(v)` a circle. So the question "lathe or sheet" dissolves: build the ring panel once
and let the section be the petals' own (pleated, cupped, twisted) or a circle (smooth). Cost, in
the accumulator's own terms: a ring panel at `NU × (N·NV)` columns is `56 × 80 × 4 = 17,920`
triangles for eight petals against the eight petals' 18,848 — the side rims are what it saves —
plus the lobe panels above the fusion row, so a half-fused bell is about 1.2× today's count. A
pure lathe at 48 sectors is ~10,800. Neither moves the budget.

**Reach, by corolla shape** (terms from knowledge — the vocabulary page was blocked):
campanulate (bell: near-parallel wall, flared limb) — both; tubular — both; funnelform — both
(it is tilt 60–75 with a short fused base); urceolate (urn: constricted mouth) — both, and it
needs Q1's range past 90 because the wall angle IS the tilt; salverform (narrow tube, flat face)
— both, tilt 90 with curl −90 on the limb; rotate (wheel) — both, a short fused base under a flat
limb, which is also nearly what ships. **Bilabiate (foxglove, snapdragon): a LATHE cannot** — it
is axisymmetric — **but the ring panel can**: the upper lip's columns run to a greater extent
than the lower's (per-column extent is already the mechanism) and the two lips take different
tilts and curls through the slot roles the limb already has (`labellum*` / `hood*`). Personate (a
pinched throat) needs a NON-circular section that varies along `u`, which the per-row `sect`
allows and no control yet expresses. **Neither route reaches** a corona (the daffodil's trumpet
is a second structure inside free tepals, a ring panel of its own) or a spathe (the leaf's).

**Assertions, estimated:** a new family (CR0–CR5, names illustrative) — present iff the fusion
row exists; the fusion row shared bit-for-bit with every lobe panel (L6's `Object.is` shape); the
fused section equals the N mapped `sect` curves (the law restated from other owners, C1's
discipline); the per-column extents equal the lobe law; the base annulus lies inside the hub
slab; the fused region reads no `petalWidth` (a Z6-like inertness clause in both directions).
About 15 clauses, a smoke block, four to six mutants, a frozen phase (rows added), and a byte
partition that is 0 moved at fusion 0 by branch. The junction and the stem attach unchanged: the
feet and the hub are not touched, and the stem attaches to the hub (session 43's ruling).

---

## Q3 — Does a corolla replace the petals or coexist with them?

**Coexist, through one control: a FUSION fraction** `fusion` in [0, 1] (default 0, the guard),
the `u` below which the N petal panels are one ring panel — the corolla's "tube length" as a
fraction of the petal. Botanically that is the sympetalous corolla's own parameterisation: tube
below, limb above, the lobes being the free ends of the same petals. Every shipped petal control
keeps a meaning, and the table says which:

| control | below the fusion row (the tube) | above it (the limb / lobes) |
|---|---|---|
| `petalTilt` | the wall's angle at the base — the tube's shape (90 cylinder, < 90 funnel, > 90 urn) | unchanged |
| `petalSpineCurl`, bias, start | the tube's profile curvature — flare or constriction | the limb's reflex |
| `petalCup`, cup gradient | the pleat depth (plicate corolla); 0 is a smooth wall | the lobe's cup |
| `petalTwist` | a contorted tube | unchanged |
| `petalRoll`, roll taper | **inert** (a closed ring cannot roll) — hidden and inert below the row, told | the lobe's quill |
| buckle (3) | a ruffled wall | a ruffled lobe |
| `petalWidth`, base taper | **derived** from the tube radius (the sector chord) — inert, told | the lobe's width where it leaves the tube |
| `petalTipShape`, `petalTipEnd`, lobes (5), fringe (2), apex sweep | — | the lobes' shape, unchanged |
| `petalCount` | the lobe count | the lobe count |
| roles, per-petal groups (47 controls) | — | per-lobe differences: the bilabiate's two lips |
| `sheetThickness`, thinning, delicacy | the wall | unchanged |

Two of 32 petal-family controls go inert in the tube and one is derived there — the roll pair and
the width pair — on the curl family's own rule (hidden AND inert where they cannot act, told in
the read-out). **Saved designs:** nothing persists (`RETIRED_IDS` carry `schema: null`), so no
migration is owed; `fusion` 0 is bit-identical by branch. **The panel:** one row, under Petal
shape beside Lobes and Fringe (a fusion is a change of the outline's topology, as the fringe is),
or its own drop-down if it gains a throat control. **The options, not resolved:** (i) the fusion
fraction as above — recommended, because it keeps one producer of the outline; (ii) a `corolla`
enum swapping the primitive wholesale — rejected in one line, a second producer of the limb; (iii)
nothing: the overlap-closed tulip that ships — which is what Eva may find sufficient for the
free-petal bells, and is the question §8 leads with.

---

## Q4 — Nodding, mechanically

**Confirmed against source:** there is no head frame. `buildBloomInto` (`bloom-geometry.js:9159`)
builds one head at the origin on the world axis with no transform argument; the stem's own
clause ST2 asserts its rings are centred on that axis (`emittedAxisOffset`, `:8076–8095`); the
inflorescence doc's "the hinge is free once heads take a frame" is a statement about route A of
its Q2 — a `MeshBuilder` append under a rigid transform — which does not exist yet.

**What carries the nod.** For a single head on a straight stem, NOTHING carries it: a 180°
hinge on a straight rod is the same STL turned over, and the sheet's row G is that object hung
by its stem. A hinge at any other angle on a straight rod is an obliquely rooted rod — the
petiole's construction (`buildLeafInto`, a 12-gon at `leafAngle` through the wall) applied to a
6 mm tube through a slab — and it reads as a stalk stuck in askew, because a real nutant pedicel
CURVES over the last centimetre. So a nod that reads right on a single head is the pedicel's
crook, which is Q5 at small scale; the hinge as a number is free and is only worth having once
there is a curve or a second head for it to be relative to.

**Gravity:** no. A fixed hinge angle per head (or per node, through the override resolver as
one more role family) reads right; the flower's own droop is a fixed law. What gravity would
change is the ANGLE VARYING WITH LOAD along a raceme, which is a ramp the resolver already
expresses. Not modelled, and not needed to read.

---

## Q5 — Axis curvature, costed as its own session

**Confirmed absent:** `stemStations(lengthMm)` returns `[0, lengthMm]` (`:7493`) — two stations,
no centreline, and the header says curvature "is where a pitch law is owed". **Every site that
assumes the axis is `x = y = 0`, by grep on `main`:** the stem's rings (`[r cos θ, r sin θ, z]`
about the origin, `buildStemInto` `:8052–8332`, three arms, 281 lines); `freeStemDistanceMm`'s
`hypot(x, y)` (`:7853`) and through it the omission mask (`stemOmission`, `:7908`) and ST9's
cylinder; ST2's `emittedAxisOffset`; the root band and the tip plug as `z` intervals
(`solidBandZ`, `belowHeadMm`, `visibleMm` in `stemPlan`, `:7514–7848`); the leaf's root (`rootR`
along a world azimuth at `z = rootZ − nodeDepth`, `:8543–8548`) and its node law in millimetres
of `z`; the meridian packing on a sphere; the hub's apex fans at `[0, 0, z]`.

**What a centreline costs:** a polyline with parallel-transport frames (never Frenet on a
straight run) and stations at a pitch derived from the curvature and the tube's radius — the
owed pitch law; the rings emitted in the local frame; the bore as a swept annulus; the join
reading the tangent at the top rather than +z; the root band and the plug in ARC LENGTH; the
leaf's nodes in arc length and its azimuth in the local frame; the channel mask as distance to a
swept cylinder (a polyline-segment distance, not `hypot`); ST2 and ST9 restated in the frame; LF3
and LF5 in arc length. And the recorded trap, honoured rather than reproduced: the flower's
`stemCenterline` kinks at `k × GOLDEN_ANGLE` while its leaves flip 180° — two laws for one
arrangement (`bloom-geometry.js:8385–8388`). **Print:** a bent 3 mm rod is the cantilever the
leaf already prints at L/d 100 as `UNMEASURED`; a crook of radius under about 5 mm at the 3 mm
floor puts the inner wall of a hollow stem under its own bore (the bore is `r − 1.5`), so a
curved pedicel wants to be SOLID, which the 3 mm floor already is. **Size:** one session for the
centreline, its pitch law and the two restated families, on the record (the stem took three
sessions for a straight tube); the nod and a pendulous raceme follow it for free.

---

## Q6 — Print

**Said once: nothing in this project has ever been printed.** `MIN_FEATURE_MM` 1.0, the 1.2 mm
sheet, `STEM_MIN_WALL_MM` 1.5 and the 3 mm stem floor are declared guesses, and every figure
below is a comparison against a line we drew ourselves.

* **Wall.** A free-petal bell's wall is the sheet: 1.20 mm, 1.00 at export on a thin sheet. A
  ring-panel corolla's wall would be the same sheet; there is no reason for it to be thicker,
  and the tube is stiffer than a free petal because it is closed.
* **Mass.** Volume is tilt-independent (the sheet's area does not change with the frame), so a
  bell at the default size is the inflorescence doc's DEFAULTS figure, ~4.4 cm³ and ~4.5 g in
  PA12; a 20 × 8 mm floret bell is ~0.8 g.
* **Overhang.** SLS needs no supports and nests in any orientation, so a hanging bell is a
  nesting question only. On FDM, printed mouth-up (as a cup) the walls at tilt 75 are 15° off
  vertical and the recurved lip at curl −45 is a 30°-from-horizontal overhang — printable; at
  curl −90 the lip is horizontal and needs support; an urn (tilt 105) printed mouth-up has its
  wall leaning IN at 15°, which is fine, and its reflexed lip under it, which is not.
* **The pedicel.** 4.5 g at the end of a 60 mm solid 3 mm rod is a root moment of ~2.6 mN·m over
  a section modulus of 2.65 mm³ — about **1 MPa**, fifty times under PA12's tensile strength.
  Static strength is not the question; a 60 mm cantilever at L/d 20 with a bell on the end is,
  and no coupon exists.

---

## Q7 — Sizing and order

| step | what | prerequisites | size |
|---|---|---|---|
| 1 | **The tilt ruling with the window law** — range to 120 (or 90, risk-free), the clearance's lower bound past 90°, the lattice-outside-the-window flag, A7 restated, the xfail class split, a block naming the window's edge, a frozen phase | none; independent of #243 in content, but one registry PR at a time | small: one PR |
| 2 | **Free-petal bells** — nothing to build. A "hanging" camera preset is view chrome (0 bytes) if Eva wants the panel to show the object the way the sheet does; presets are Eva's own | 1 for the urn; nothing for the campanula | 0 |
| 3 | **The closed-ring panel with a fusion fraction** (Q2/Q3) | 1 (the tube's wall angle is the tilt); #243 merged | 2–3 sessions: the primitive and its family, the sheet, the panel row |
| 4 | **The centreline** (Q5) | none | 1–2 sessions |
| 5 | **The nod** — a hinge angle on the head frame, the crooked pedicel | 4, and the inflorescence doc's instancing (a frame) | free after 4 for a single head; a small session with instancing |

1 and 4 are independent of each other; 3 needs 1; 5 needs 4. **The honest total for "bells,
nodding and curved axes" is 4–6 sessions**, on the project's sizing record, and the first
visible bell costs none of them.

---

## 8. Ranked questions for Eva

1. **Is the shipped hung head — tilt 75, cup 0.6, curl −45 for the lip — a bell for your
   purposes** (sheet rows A–C), or is the seamless tube what you want? This decides whether the
   corolla primitive (Q2/Q3) is scheduled at all.
2. **The tilt ruling:** (a) 0..90, risk-free on the shipped law; (b) −30..120 with the window law
   (§4), which is what the urn and the reflexed forms need; or (c) further, with a mitred seam
   panel nobody has costed.
3. **The corolla, if wanted:** one closed-ring primitive with a fusion fraction (recommended,
   keeps one producer of the outline and reaches bilabiate) against a lathe (simpler, smooth
   only, axisymmetric).
4. **Nodding:** accept that a single head on a straight stem nods by orientation only, and that
   the visible nod is the centreline session's — or ask for the oblique root as a stopgap and see
   it photographed first.
5. **The cup fold at 0.7 and up** (T2, the §18a class): leave it as the bell's own bound, or
   schedule the combination gate session 32 recorded.
6. **A "hanging" view preset** as view chrome, so the panel can show the object the way this
   sheet does — or not.
7. **#243 sequencing:** this doc collides with nothing; any build session waits for it.

---

## 9. RULINGS (Eva, Sep 17, 2026 — on the seven questions above)

**EVA'S RULINGS ARE MADE OUTSIDE THIS REPOSITORY, AND A RULING THAT IS NOT WRITTEN INTO A DOC
DOES NOT EXIST AS FAR AS ANY SESSION IS CONCERNED.** That is why this section exists, and why
it was owed the moment the rulings were made rather than when the code that implements them
lands. This document shipped on Sep 17 with seven ranked questions and no rulings section; the
tilt ruling was made the same day and, for two days, lived nowhere a session could read it.
A later session opening on `#245` would have found the questions and re-asked them.

Each entry below is a RULING, not a recommendation. Where one contradicts a recommendation
made above, the contradiction is named in a line rather than edited around. Where the ruling
did not ship, that is stated with what stopped it.

1. **Q1 — PARTLY RULED. The shipped hung head IS a bell; the fused corolla is still open.**
   Tilt 75 × cup 0.6 × curl −45 for the lip (§2 rows A–C) is accepted as a bell, so
   **free-petal bells are the shipped answer and cost no build.** Whether Eva also wants the
   seamless tube — a corolla with a real throat, which §2's overlap-closed tulip only imitates
   — is **not decided**, so **the corolla primitive is NOT scheduled**. *Against the doc:* §0
   put the ring panel third in the build order on the assumption the question would be
   answered; half of it is, and the half that would schedule Q2/Q3 is not.

2. **Q2 (the tilt range) — RULED, AND NOT SHIPPED.** The ruling: **`petalTilt` opens from
   0–75 to −30..120. Clamp only — the seam law ships unchanged, the default stays 25 and the
   foot does not move.** Two things go with it, and both are recorded here rather than in a
   code comment, because the code change did not land:

   * **120 IS DERIVED, NOT TYPED, and it must not be rounded to a friendlier number later.**
     The clearance past a right angle is a WINDOW rather than a wall: the first blade row's
     `+N` skin must clear the foot's top plane (`s₁ ≥ a(1+|cos θ|)/sin θ`) while the seam
     panel's `−N` skin must not pass through the foot's own slab (`s₁ ≤ a·sin θ/|cos θ|`), and
     that window is non-empty iff `2cos²θ + |cos θ| − 1 ≤ 0`, i.e. **|cos θ| ≤ ½, θ ≤ 120°
     exactly**. §4 above is the derivation and the 22-row scratch probe that confirms it, row
     by row, against a prediction written from the closed form before the census ran. PR #210's
     measured crossover of 115–123° is that window closing.
   * **THE SEAM-LAW EXTENSION WAS CONSIDERED AND REJECTED.** Replacing the saturation past 90°
     with the window's lower bound clears the flat folds inside the window — §4's own table:
     93°–100° fall from 341/338/338/339/339 pairs to span-0 touches of 2–7, 105° goes 336 → 0
     at both blade lengths and at five petals, and 108°–115° read **0 on all ten probes** — and
     it **makes the closed regime worse where it can do nothing**: 120°, where the window is a
     single point, goes **336 → 576**, and 122° goes **336 → 592**. It also moves bytes on
     every curled row and buys a second regime in a law that has one. **It is not wanted.**
     Recorded so a future session finds the rejection rather than proposing it as an obvious
     improvement.

   **WHY IT DID NOT SHIP — two measured stop conditions, both of which the brief itself wrote
   down.** Full numbers in `docs/bloom-tilt-range-outcome.md`:

   * **−30 REACHES THE DESCENDING SEAM FOLD, AND SO DO ANGLES FAR SHORT OF IT.** Swept at one
     degree over 22 states, the within-shell census leaves zero at **−8° on six whorls at the
     thickest sheet**, −9° on a six-turn continuous head, −10°, −16° on three states including
     six whorls at the SHIPPING sheet, and at −17 / −22 / −23 / −28 / −29 on five more; nine
     states are clean to −30. EXPORT and LIVE agree on the first firing angle on all twelve
     states checked in both modes, every worst site sits at exactly `z = −t/2` (the foot slab's
     underside), and the same `|θ|` read UP is **0 pairs on 13 of 13 probes** — so it is the
     descending case `docs/bloom-sepals-outcome.md` §8 handed to the seam owner, not the
     clearance's own regime. **§2's own "tilt −30 … 0 pairs at cup 0" cell reproduces**: it is
     true of the DEFAULTS petal, and the premise that carried it into the ruling generalised one
     state to the range. **A shallower floor is not the answer either** — the shallowest onset
     is −8, so a clean floor is −7, which reaches no reflexed form at all.
   * **THE RANGE AND THE ROLE-OVERRIDE ENVELOPE ARE ONE NUMBER.** `ROLE_OVERRIDES` restates
     `petalTilt`'s `0..75` as the clamp for `labellumTilt`, `hoodTilt` and the nine
     `petalNTilt` rows, and the harness throws at module load if the two disagree; and holding
     the envelope at 0..75 under a wider base is not merely refused, it is wrong — a `+5°`
     delta on a base of 120 would compose to 125 and clamp back to **75**, dropping that petal
     45° below its whorl. So the envelope widens with the range, and that **moves 43 live rows
     (18 worse on the census, of which eleven go from clean to 42–84 pairs, and 23 crossing 90°
     for the first time) and 1,072 rows across 27 frozen baselines** — seventeen declared
     magnitudes to re-record and eleven to declare for the first time. "Prove the existing
     matrix is 0 moved" is therefore not reachable.

   **Neither is a reason the ruling is wrong; both are reasons it needs re-issuing with the
   numbers in front of it.** The options are priced in §4 of the outcome doc. Nothing was
   quietly clamped somewhere else, and the cup bound (ruling 5) was not touched.

3. **Q3 — STILL OPEN, and downstream of Q1's unanswered half.** Whether a corolla coexists with
   the petals through a fusion fraction cannot be ruled before Q1 says whether the corolla is
   wanted at all. The table in Q3 above stands as the costing.

4. **Q4 — STILL OPEN.** Nodding on a single head with a straight stem is orientation and not
   geometry; the question of whether to accept that, or to build the oblique root as a stopgap
   and photograph it, is not answered.

5. **Q5 — STILL OPEN.** The axis-curvature session is costed above and is not scheduled here.
   (The inflorescence doc's own ruling 8 orders it *after* the bell work, which this ruling does
   not move.)

6. **Q6 — STILL OPEN.** Nothing in this project has been printed; the overhang and pedicel
   readings stand as comparisons against lines we drew ourselves.

7. **Q7 — MOOT. #243 merged as `eb2aaa7`.** The sequencing caveat that closed this document is
   spent: sepals part 1 is on `main`, and a build session no longer waits for it.

*The rulings on Q1 and Q2 are Eva's, made Sep 17. Q2's implementation is the work of a later
session, on a re-issued ruling; `docs/bloom-tilt-range-outcome.md` is what that session starts
from.*
