# The Voronoi infill's metric plan (S2 of the port plan, Sep 23 2026)

S2 of `docs/bloom-infill-port-plan.md` §6, and Eva's **ruling 2**. **Prototype only**:
`bloom-geometry.js`, `bloom-registry.js`, `bloom.js`, `bloom.html`, `bloom.css` and every
flower file are untouched — predeclared before a line was written and measured at the close
rather than asserted: all nine are **sha256-identical to a worktree of the base commit**
(`eb102d3`). Nothing here ships in the generator; there is still no infill in the bloom.

**AND `{ metricPlan: false }` IS BIT-IDENTICAL TO THE PLAN IT REPLACED.** `node
tools/verify-bloom-infill-metric.mjs --partition <base-tree>` reads **0 of 6,317,568 floats
differing and 0 streams differing in LENGTH over 208 states** (13 forms × 2 walls × 8 seeds),
`Object.is`. That is what licenses the must-fail running through the SHIPPED function instead
of a mutated copy of it, and what keeps every figure the companion tools published valid.

---

## 0. The headline

The quantity is named once and is the same throughout: **`wallSurfaceMm`, the minimum over
every emitted hole-rim point of the IN-SHEET distance — through the material — to the nearest
point of another solid boundary.** Nominal **1.0 mm**: a shared wall is inset w/2 from each
side and an outline edge by the full w. §1b's own measure (a hole's rim to its OWN cell's
outer polygon, 3-D, nominal 0.5) is reported beside it so the before/after against the
published table is the same quantity as the published table.

| state | flat plan | **metric plan** | §1b's measure, flat → metric |
|---|---|---|---|
| default (flat) | 1.0000 | **1.0000** | 0.5000 → 0.5000 |
| `petalCup` 1.2 | 1.0000 | **1.0000** | 0.5000 → 0.5000 |
| `petalSpineCurl` 360 | 1.0000 | **1.0000** | 0.4998 → 0.4999 |
| `petalRoll` 330 | 1.0000 | **1.0000** | **0.4308 → 0.4980** |
| `petalTwist` 180 | 1.0000 | **1.0000** | 0.5000 → 0.5000 |
| **`cup` 1.2 × `curl` 180** | **0.8097** | **1.0133** | **0.3501 → 0.5025** |
| **`cup` 1.2 × `curl` 360** | **0.3050** | **1.0130** | **0.1108 → 0.5050** |
| **ALL FORM MAX** | **0.7218** | **1.0017** | **0.1879 → 0.5037** |
| `buckle` 0.6 f3 | 1.0000 | **1.0000** | 0.5000 → 0.5000 |
| `cup` 1.2 × `cupGradient` 1 | 1.0000 | **1.0000** | 0.5000 → 0.5000 |
| `petalWidth` 30 / 8 | 1.0000 | **1.0000** | 0.5000 → 0.5000 |
| `footDelicacy` 0.25 | 1.0000 | **1.0000** | 0.5000 → 0.5000 |

**THE RULED WALL HOLDS ON EVERY STATE, including both combined corners, and not merely
improves.** §1b's column reproduces the published figures before it moves them: 0.3501
against §7's own 0.3501 at `cup × curl` 180, 0.1108 against 0.1074, 0.1879 against 0.1841 —
the small differences are the densification step, which §1b did not name.

**AND §1b's OWN MEASURE READS SLIGHTLY UNDER 0.5 ON THE ROLLED STATES, WHICH IS A PROPERTY OF
THAT MEASURE AND NOT OF THE WALL.** It is a 3-D distance, so where the sheet curves between
two points its chord is shorter than the material between them: `petalRoll` 330 reads 0.4980
while the IN-SHEET wall reads exactly 1.0000, and `petalSpineCurl` 360 reads 0.4999. It is
kept unadjusted because it is §1b's and the point of quoting it is that it is §1b's — and the
metric plan improves it there too (0.4308 → 0.4980), which is the roll onset ramp's own
non-isometric band being paid for.

**THE WORST STATE AFTER THE FIX, ON EACH OF THE THREE AXES THE BRIEF ASKS ABOUT.** The
tightest WALL is **ALL FORM MAX at 1.0017 mm** — 0.17 % of headroom over the ruled 1.0, on the
state that carries cup, curl, roll and twist at once. The worst COST is
**`cup 1.2 × cupGradient 1` at +11.3 %**, and it is a stretch giving a cell back its hole (16
holes → 17), not a compression. The worst ACHIEVED COUNT is **`cup 1.2 × curl 360`, 10 of 16**,
which is the fix refusing to cut a hole where a 1.0 mm wall does not fit (§5).

**COST ON THE SHIPPING DEFAULT IS ZERO, BY BRANCH**: the petal is 2,744 triangles and the
whole bloom 22,124, both S1's own published figures to the integer. The picture is
`docs/img/infill-metric-plan.png`; the sheet is `node tools/shot-bloom-infill.mjs <dir>`.

---

## 1. THE MECHANISM, AND WHY "AN ARC-LENGTH PLAN" IS NOT WHAT THIS IS

The brief and ruling 2 both call it the arc-length metric. Measured, the arc length is the
one thing that was already right.

**The midrib is arc-length by construction.** `|dP/dx|` at v = 0 reads **EXACTLY 1.0000** on
every state in the table. A reparameterisation x(u) would fix the midrib and leave the
margins where they are.

**The cup lifts the sheet off the midrib and the curl's own radius does the rest.** Under a
spine curl the spine is a circle of radius `R = L / (2π turns)`; a point lifted `w` toward
its centre travels `(R − w)/R` of the arc the midrib does. At `petalSpineCurl` 360 on the
shipping 35 mm blade **R is 5.5704 mm** and `petalCup` 1.2 carries the margin past 5 mm of
it. Measured along one station at u 0.30 the along-spine metric reads

```
 v = -1     -0.5      0        +0.5     +1
 0.9628   0.6067   1.0000   0.6067   0.9628
```

— and at the worst emitted hole-rim point it reads **0.0882**, so the plan's 1.0 mm wall
came out a tenth of a millimetre of material.

**SO NO PLAN COORDINATE SYSTEM FIXES IT.** The compression varies ACROSS the width at one
station, so no `(x, y) → (u, v)` makes the map an isometry: the surface has Gaussian
curvature and Gauss's theorema egregium settles it. **What ships is a LOCAL METRIC**, and
every LENGTH the plan uses asks it for its answer in surface millimetres.

**§1a IS NOT CONTRADICTED, IT IS NARROWER THAN IT READS.** Its table measured the stretch
*across the width* and every single-control state reads ≥ 1.000 there. The compression is
ALONG THE SPINE. Measured over the blade at `cup 1.2 × curl 360`: κ across an x-running edge
runs 1.000–2.415 (stretch only) while κ across a y-running edge runs **0.0239**–0.9999.

---

## 2. THE MEASURE: `κ(t) = sqrt(det M) / sqrt(tᵀ M t)`

At a plan point the map has a Jacobian `J` and a first fundamental form `M = JᵀJ`. For a plan
line with unit tangent `t`, a plan offset `d` across it delivers a SURFACE distance
`d · κ(t)`. For an orthonormal plan basis `{n, t}`,
`(nᵀMn)(tᵀMt) − (nᵀMt)² = det M`, which is that identity rearranged.

**IT IS NOT `|J n|`, AND THE DIFFERENCE IS THE SHEAR, WHICH IS NOT A ROUNDING MATTER.**
`|J n|` is the length of the plan perpendicular's IMAGE; the perpendicular in the SURFACE is
shorter whenever `F ≠ 0`, and the shear cosine reaches **0.87** on `cup 1.2 × curl 360`.
Taking `|J n|` reads the wall HIGH and under-insets. It is a MUTANT (`the-shear-is-dropped`,
`kappaMode: 'normal'`) and a written-down M0 fixture: on the sheared plane `P = (x + y, y, 0)`
the shipped formula reads **1.000** and `|J n|` reads **1.41421** — a wall 29 % thin, silently.

**THE METRIC VARIES OVER THE OFFSET, SO THE OFFSET IS MARCHED AND NOT DIVIDED**: the plan
offset is the `d` solving `∫₀^d κ(τ) dτ = want` along the inward normal ray. On the compressed
states that offset runs to several millimetres and κ changes by a factor of ten over it.

### 2a. Where it is read

One owner (`surfaceOffsetPlanMm`), three readers, and each was a plan length before:

* **the wall inset** — `insetConvex` already took a PER-EDGE distance (`dOf`), so this is a
  change of what that function returns and of nothing else. The seeding, the relaxation, the
  Voronoi cut, the basal V and the outline are untouched.
* **the fillet radius** — a constant plan radius on a compressed surface draws a corner that
  is not round on the object, which is the one thing "cells always round" forbids. It asks
  for `FILLET_MM` of surface across each of the two edges meeting at the corner and takes the
  larger; `tMax` is still the ceiling, so it cannot eat the hole.
* **the hole bar** — "is this a real hole" is asked on the object now. A hole 0.6 mm across
  in PLAN that maps to 0.02 mm of surface is not a hole and the flat plan called it one.

### 2b. The lattice, and the two numbers that are derived rather than typed

`planMetricField` is a 256 × 96 lattice in `(u, v)`, built once per petal, with the
derivatives taken by the chain rule between ADJACENT ROWS so one `rowAt` serves a whole
column: **~20 ms a petal**, against the ~390 ms a four-point stencil per node would cost.

**IT IS IN (u, v) AND NOT IN PLAN (x, y) BECAUSE `mapPt` CLAMPS.** A central difference in
plan y taken at the margin reads a step that was silently truncated — measured on the flat
default, a 0.05 mm plan stencil reports `|G − 1|` up to **1.769e-1** near the tip, which is
the clamp and not the surface. In `(u, v)` the ends are one-sided by construction.

**THE LOOKUP IS THE WORST CORNER OF THE ENCLOSING CELL, NOT AN INTERPOLATION**, and the
direction is the reason: interpolating `M` and then forming κ smooths a local MINIMUM away,
which is the unsafe direction.

**THE MARCH STEP AND THE EDGE SAMPLE SPACING ARE THE LATTICE'S OWN, HALVED.** This is not
bookkeeping. The first cut sampled six FIXED points along each edge, and on `ALL FORM MAX`
the tip face's six landed at v = {−1, −0.6, −0.2, 0.2, 0.6, 1} and **MISSED v = 0**, where the
metric is exactly the identity by construction. The band's true worst κ was 0.9999, the
sampled minimum was 1.00728, and **the wall came out 0.9955 mm where it had asked for
1.0000**. A sample spacing at the lattice's own resolution cannot skip a cell. It is the
mutant `the-edge-is-sampled-at-six-fixed-points`.

**AND THE WORST SAMPLE WINS AT EVERY MARCH STEP, NOT AT THE END OF ITS OWN MARCH.** Marching
each sample separately answers "how far in must THIS point go", and the wall's closest
approach runs between two rim points that need not sit on one normal ray. Taking the minimum
κ across the whole edge at each step insets the BAND, which is conservative for every path
through it — measured, it is what took `petalCup` 1.2 from 0.9849 to 1.0000.

**THE MARCH'S CAP IS THE CALLER'S OWN POLYGON**, not a petal length: a cell is a few
millimetres across, so once the offset passes its diameter the clip is empty whatever else
happens, and on the compressed states a cap in petal lengths marched 20 mm to answer a
question the polygon settled at 3.

---

## 3. THE FLAT GUARD, AND THE SHIPPING DEFAULT'S WHOLE BYTE STORY

Where the petal has **no form and a straight spine** the plan map is AFFINE — `flatSect` is
`C + T h v` and `C` is `base + dir·x` on a straight spine — so the metric is the identity
exactly. `planIsFlat(ctx)` is `surface.form === null && surface.kC === 0`: **two statements,
both the geometry's**, neither a control list. The field is then not built and every length
comes back as itself, so `{ metricPlan: true }` and `{ metricPlan: false }` are the SAME
DOUBLES there.

**THE GUARD IS MEASURED, NOT TRUSTED.** `flatGuardResidual` reports the worst `|E−1|`,
`|G−1|` and `|F|` the lattice carries, and M4b asserts it against a bar DERIVED from the
finite difference's own conditioning: a central difference of coordinates of magnitude C over
a plan step d carries about `ulp(C)/d`, and E is a square so twice that.

| | worst lattice residual |
|---|---|
| predicted from `ulp(40 mm) / (2 × L/NU)` | 5.2e-14 |
| **measured, worst over the guarded states** | **5.56e-14** |
| the bar (`FLAT_RESIDUAL_ULPS = 8`) | 4.16e-13 |
| **the nearest reading from a state the guard REFUSES** (`petalSpineCurl` 5, the smallest curl the slider reaches) | **3.87e-8** |

The two populations are **ninety-three thousand times apart at the bar**, so nothing in it
is fitted to the data in hand.

**WITHOUT THE GUARD THE FLAT DEFAULT MOVES 13,224 OF 24,696 FLOATS BY 3.64e-14 mm** — the
finite difference's own residue — and `petalWidth 8`'s hole count goes **10 → 12**, because a
perturbation of 1e-14 pushed two marginal cells over the `open` bar. That is the
knife-edge class this project has found five times, and the guard removes it rather than
banding it. It is the mutant `the-guard-is-ignored`.

### 3a. The partition

Predeclared from the guard predicate, not from a list of labels, and checked in BOTH
directions: **9 MOVERS / 4 HOLDERS, 0 states disagreeing.**

| | states |
|---|---|
| **HOLDERS** (the map is affine; 0 floats moved) | default (flat), `petalWidth` 30, `petalWidth` 8, `footDelicacy` 0.25 |
| **MOVERS** (a form or a curl) | `petalCup` 1.2, `petalSpineCurl` 360, `petalRoll` 330, `petalTwist` 180, `cup × curl` 180, `cup × curl` 360, ALL FORM MAX, `buckle` 0.6 f3, `cup × cupGradient` 1 |

---

## 4. THE COST

Against S1's own published figures, so the comparison's reference has a different owner from
this session:

| | S1 | S2 |
|---|---|---|
| the shipping default petal | 2,744 | **2,744 (+0.0 %)** |
| the whole bloom, ruled defaults | 22,124 | **22,124 (+0.0 %)** |

**Zero, by branch**: the shipping default is flat and the guard refuses the field there.
Per state, metric against the flat plan on the same state:

| state | flat | metric | |
|---|---|---|---|
| `petalCup` 1.2 | 3,776 | 3,876 | +2.6 % |
| `cup 1.2 × curl 180` | 4,236 | 4,336 | +2.4 % |
| **`cup 1.2 × curl 360`** | 4,548 | **3,712** | **−18.4 %** |
| ALL FORM MAX | 3,444 | 3,500 | +1.6 % |
| `cup 1.2 × cupGradient` 1 | 3,748 | 4,172 | +11.3 % |
| every other state | — | — | +0.0 % |

**THE WORST STATE IS +11.3 % AND IT IS A STRETCH, NOT A COMPRESSION.** Where the surface
stretches the plan inset SHRINKS, so a cell that was solid can afford a hole:
`cup 1.2 × cupGradient 1` goes 16 holes to 17. **Nothing here approaches the +25 % the brief
asks to be flagged**, and this is on top of S1's +14.7 % per petal / +13.5 % per bloom.

---

## 5. THE ACHIEVED COUNT, AND THE ONE THING THAT GETS WORSE

**`cup 1.2 × curl 360` LOSES SIX OF ITS SIXTEEN HOLES, AND THAT IS THE FIX WORKING RATHER
THAN A COST TO TUNE AWAY.** The surface there is compressed by up to a factor of forty; a
cell that is 3 mm across in plan is a fraction of a millimetre on the object, and a 1.0 mm
wall around a printable hole does not fit in it. The flat plan cut sixteen holes there and
every one of them had a wall a slicer would reject. Ruling 3's answer is the number, and the
gate's M3 prints it on every state.

**THE CELLS ARE STILL LAID OUT IN THE FLAT PLAN AND S2 DID NOT CHANGE THAT.** A metric-sized
cell would be LARGER in plan where the surface compresses and would keep more of its holes.
That is a look change — it moves where every cell is on every curved state — and it is S4's,
beside the relaxation and anisotropy rulings §4 of the port plan says must be ruled from one
sheet. **Recorded, not done.** What S2 owes is that a wall asked for in millimetres is
millimetres of material, and that is measured.

**EVA'S RULED 1.5 mm HOLE BAR IS PHOTOGRAPHED, NOT ENFORCED.** The prototype's own "is this
even a hole" threshold (`HOLE_MIN_MM` 0.6) is unchanged; what changed is that it is asked in
SURFACE millimetres. `opts.holeBarMm` is a capability hook no control reaches, and the sheet
uses it for one cell. At the ruled defaults it reproduces §2b exactly — **13 of 16 clear
1.5 mm**, on the same bimodal distribution (`0.92 0.94 0.96 | 1.52 … 3.13`), so the ruled bar
selects the same thirteen a 1.0 mm bar would. **Enforcing it is ruling 3's
drop-all-sub-bar-seeds-and-recompute iteration, which is a BUILDER mechanism and is S3's.**

---

## 6. THE GATE

`node tools/verify-bloom-infill-metric.mjs [--quick] [--json <file>]`, and
`--negative-control` before quoting a pass. One seed (`SEED`), one petal, EXPORT mode, 16
cells, wall 1.0 mm — naming the sampling because this project's first durable rule requires
it. Thirteen states.

**M0 FIRST, AND IT ABORTS**, on SYNTHETIC surfaces whose answers are written down and driven
through the SHIPPED functions: a plane (κ = 1 both ways, the offset for 0.5 comes back 0.5), a
plane stretched 2× along the spine (κ = 2 across a y-running edge, and the offset halves), a
SHEARED plane (the fixture that separates the shipped formula from `|J n|`), and the wall
measure itself on two written-down rims 1.0 mm apart with a third 0.4 mm away THROUGH A HOLE,
so the in-material clause has something to refuse.

**M1** the ruled wall in surface millimetres. The bar is `MIN_FEATURE_MM`, IMPORTED from
`bloom-geometry.js`; the measured side reads the EMITTED rim polygons through `petalSurface`
DIRECTLY and touches no metric field, so the thing that builds the wall is not the thing that
measures it. **M2a** the winning pair's path is asserted to run through the material.
**M2b/M2c** report the 3-space distance of the same pair and §1b's own measure. **M3** the
achieved count, asserted non-zero — a wall that held by cutting no hole would satisfy M1 and
mean nothing. **M4** the guard, both directions. **M5** boundary edges 0, the shell count no
worse than the flat plan's, one voxel piece at 0.6 and 0.3 mm. **M6** cost.

### 6a. The in-sheet measure, and the two bounds it sits between

`wallSurfaceMm` walks the STRAIGHT PLAN SEGMENT, which is an **upper** bound on the geodesic
through the material; the 3-space distance of the same pair is a **lower** bound. M2b reports
both, and on every state in the table they agree to within 2 %, which says the path is
straight and the bound is tight.

**IT IS IN-SHEET AND NOT 3-SPACE, AND THAT IS THE WHOLE SEPARATION §1b NAMES.** A 3-space
minimum reads **0.0415 mm on `petalRoll` 330** — on a pair **8.7 mm apart along the sheet**,
which is the petal's own declared fold and not a wall at all. The in-sheet measure reads that
state at exactly 1.0000. A fold is S1's C2's subject and stays there.

### 6b. The negative control

Four mutations, each running through the SHIPPED function rather than a mutated copy of it,
each naming the clauses it must redden, **and each list measured rather than predicted**:

| mutation | claims | fired |
|---|---|---|
| `the-flat-plan-is-restored` (`{ metricPlan: false }`) | M1, M4c | M1, M4c |
| `the-shear-is-dropped` (`{ kappaMode: 'normal' }`) | M1 | M1 |
| `the-edge-is-sampled-at-six-fixed-points` (`{ metricSamples: 5 }`) | M1 | M1 |
| `the-guard-is-ignored` (`{ metricNoGuard: true }`) | M4a | M4a |

**`the-flat-plan-is-restored` DOES NOT NAME M4a**, and that is the guard working rather than
a clause failing: on a state the guard already refuses the metric, restoring the flat plan
changes nothing.

**A FIFTH LEVER IS WIRED AND IS NOT IN THE TABLE, AND THE REASON IS MEASURED RATHER THAN
ASSERTED.** `metricHoleBarInPlan` puts the inset in surface millimetres and leaves the BAR in
plan. Swept over all thirteen states it moves **nothing at all** — the hole count and the wall
are identical to the digit on every one — so it is not a control, and a mutation that changes
nothing cannot be one. Why it is inert here: on the guarded states plan and surface are the
same number by construction, and on the compressed ones the inset has already eaten the
marginal cells outright (the offset reaches the polygon's own diameter and the clip comes back
empty), so no hole is left sitting near the bar for the bar's units to decide. **The clause
that asks the bar on the object is therefore carried by M0's written-down fixtures and by
nothing else on this state set** — recorded as a gap rather than closed by claiming a clause it
does not move. A state set that put a hole within a few percent of the bar under compression
would close it; none of §1b's corners does.

**AND S1's `the-subdivision-is-halved` NOW REDDENS C3c AS WELL**, which it did not on the flat
plan: under the metric plan that mutation leaves a triangle at the recursion cap. It is
collateral the mutation is allowed to cause and it is TRUE about it; C3c reads 0 on every
state of the CLEAN tree, which is what the clause is for.

### 6c. What it does not cover, in the gate's own header as well as here

* the CELL SIZE is flat-planned (§5).
* **S1's claims are S1's gate's.** This one does not re-assert them: `node
  tools/verify-bloom-infill-conform.mjs` (+ `--negative-control`) is run separately and
  passes unchanged on the new plan — **every C1 ratio still below 1, boundary edges 0
  everywhere, one voxel piece on every row.**
* one seed, one petal, EXPORT mode; the prototype is not the shipping emitter; nothing here
  is wired to CI.

---

## 7. AN EXACT `>=` ON A 32-CHORD SUM, WHICH IS THE FOURTH INSTANCE OF THAT CLASS HERE

M1 shipped as `wall >= MIN_FEATURE_MM` and went RED on `petalWidth 8`, reporting
*"1.0000 mm against the ruled 1 mm"*. `inSheetLenMm` sums `IN_SHEET_STEPS` chords, each a
`hypot` of coordinate differences of magnitude ~40 mm, so the sum lands a few parts in 10¹⁶
under the true answer on a petal where the true answer is exactly the plan length. The bar
carries the measure's own conditioning now — `IN_SHEET_ULPS × IN_SHEET_STEPS × ulp(maxCoord)`,
about **1.8e-12 mm** — which is **10⁹ times smaller than the smallest shortfall any mutant
here produces** (0.0045 mm) and 10¹¹ under the 0.3 mm horizontal wall floor the ruling is
about. Derived, in the unit the quantity has.

---

## 8. THE SHEET

`node tools/shot-bloom-infill.mjs <dir> [--quick] [--png <file>]`. It builds the meshes
itself and renders them with `bloom-soft-render.mjs`, so it is ONE command and needs no
browser. **The rasteriser is deterministic, so no pixel delta is quoted anywhere and none is
owed.** Four sections: the ruled defaults with the achieved count at both bars; a density
sweep (8/12/16/24/32) with the achieved count in every caption; the metric pair; and the
whole bloom at the ruled defaults.

**THERE IS NO MACRO AT `curl` 360 AND THAT IS A MEASUREMENT, NOT A FRAMING FAILURE.** Three
cameras and a tangent-plane cutaway were tried. At that state the petal is a coil that passes
within **0.0002 mm of ITSELF before a cell is cut** (S1's own reading of the PLAIN sheet), so
every other turn is inside any slab drawn around the wall under discussion. The pair at
`curl` 360 is on the sheet whole, carried by its numbers; **the macro is taken at
`cup 1.2 × curl 180`**, where the flat plan fails the ruled wall by a fifth (0.8097) and the
petal is a half-coil that can be read. `docs/img/infill-metric-plan.png` is that pair.

**AND THE TWO WHOLE-BLOOM COUNTS MUST NOT BE SUBTRACTED**, which the caption says rather than
leaving a reader to do it: the plain cell is the SHIPPED bloom with #278's rim bead (24,688)
and the infilled cell is the PROTOTYPE, whose hole rims are flat walls because giving them
the bead is S5 (22,124). §2c of the port plan projects **~41,000** for an infilled bloom once
they take it.

---

## 9. WHAT MOVED BESIDE THE PLAN

**The 5×7 bitmap font and the blitter moved from `shot-bloom-conform.mjs` into
`bloom-soft-render.mjs`**, which already owns rasterising and PNG writing, so two sheet tools
read one font rather than carrying two copies. **Measured inert**: the same tree with the old
in-file font and with the moved one writes **byte-identical PNGs**
(`2a5383059f128bff…` both ways), and the base tool on the base tree still reproduces the
committed image exactly (`34b4fd70692285f3…`). `J`, `K` and `Q` were missing from that font
and it showed — the composite's own label read *"WALL AS ED 1 MM"*; they are added, and S1's
image is unaffected by the addition.

**`docs/img/infill-conforming-emitter.png` NO LONGER REPRODUCES ON THIS TREE, AND IT STAYS
PUT** — the convention this project already states for `serration-range.png` and
`lobe-shape-law.png`: each records a law that was shipping when it was rendered. `petalRoll`
330 is a MOVER here, so S1's legacy cell goes 2,392 → 2,344 triangles and its conforming
worst facet 0.4317 → 0.4318 mm. Its finding is unchanged; its bytes are not.

---

## 10. FOR S3

* **`ruling 2` is discharged** and the acceptance is §1b's table re-run, above.
* the METRIC is `planMetricField` / `kappaAt` / `surfaceOffsetPlanMm` in the prototype. The
  builder will want the same three, and the lattice is ~20 ms a petal — against the 15.0 ms
  the field and the cut already cost, so an infilled petal roughly doubles in CPU and stays
  four seconds for a 240-petal head. **The cost is still triangles, not the field.**
* the flat guard is what makes "0 bytes moved at the guard" a construction in the builder
  too: at the shipping default the petal is flat AND the infill is off, so there are two
  independent reasons the default cannot move.
* **the cell size is the open one** (§5), and it is coupled to the relaxation and anisotropy
  rulings §7 of the port plan still lists as pending renders.
