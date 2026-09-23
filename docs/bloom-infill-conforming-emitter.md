# The Voronoi infill's conforming emitter (S1 of the port plan, Sep 23 2026)

S1 of `docs/bloom-infill-port-plan.md` §6. **Prototype only**: `bloom-geometry.js`,
`bloom-registry.js`, `bloom.js`, `bloom.html`, `bloom.css` and every flower file are
untouched — predeclared before a line was written, and measured at the close rather than
asserted: all five are **sha256-identical to a worktree of the base commit** (`2464d50`).
Nothing here ships in the generator; there is still no infill in the bloom.

**AND `{ conform: false }` IS BIT-IDENTICAL TO THE EMITTER IT REPLACED**, which is what
licenses the must-fail running through the SHIPPED function instead of a mutated copy of it,
and what makes §6's companion comparison a partition rather than an impression:
`node tools/verify-bloom-infill-conform.mjs --legacy-identity <base-tree>` reads **0 of
4,826,448 floats differing and 0 streams differing in LENGTH over 224 states** (14 forms x 2
walls x 8 seeds), `Object.is`, with a control proving the comparison can fail — the
CONFORMING stream differs from the base on **224 of 224**.

---

## 0. The headline

| | legacy flat fan | conforming |
|---|---|---|
| worst emitted facet, `petalRoll` 330 | **2.4990 mm** | **0.4317 mm** |
| … against the SHIPPED LATTICE's own worst on the same state | 0.5730 | 0.5730 |
| worst emitted facet, ALL FORM MAX | **6.8717 mm** | **0.4813 mm** (lattice 0.6348) |
| within-shell census on the FLAT default, cells alone | **822 pairs / 0.8847 mm** | **0 / 0.0000** |
| triangles, the shipping default petal | 2,392 | **2,744 (+14.7 %)** |
| triangles, the whole bloom | 19,496 | **22,124 (+13.5 %)** |

The picture is `docs/img/infill-conforming-emitter.png` — a 3.2 mm band of the blade at
`petalRoll` 330 seen down the spine, legacy against conforming, the band centred on the
legacy emitter's own worst facet (found at run time, not chosen). The left cell is a bowl
with a flat bottom drawn straight across the rolled tube; the right cell is the tube.

---

## 1. The defect, measured before anything was changed

`cutThrough` tessellated a solid cell as a FLAT FAN over the whole cell polygon. A flat
facet spanning several millimetres of a surface that WRAPS is a chord. Measured on the base
tree (`2464d50`), one seed, one petal, EXPORT, 16 cells, wall 1.0 mm:

| state | worst emitted facet | the shipped lattice's own |
|---|---|---|
| default (flat) | 0.0083 mm | 0.1416 |
| `petalRoll` 330 | **2.4990** | 0.5730 |
| `petalCup` 1.2 x `petalSpineCurl` 360 | **1.7385** | 0.1977 |
| ALL FORM MAX | **6.8717** | 0.6348 |

**THE FLAT DEFAULT READS 0.0083 mm AND THAT IS THE CONTROL, NOT A MISS.** The default
blade is planar above the root blend — a straight chord in plan maps to a straight line in
3-space, measured 0.00000 mm over three written-down probes — so a fan there is exact and
the measure correctly says so. The residue is at `u` 0.9936, the tip.

**AND THE PLAN MAP REPRODUCES THE BUILDER'S OWN ROWS EXACTLY**, which is what licenses
using it as the reference: `mapPt` of each blade row's (row, column) plan point equals
`buildPetalInto`'s emitted `mid[j]` to **0.00e+0 mm**. The FOOT rows are excluded by name —
all three carry `u = 0` and are laid by `footRowsAt()`, not by `at()`, so the map misses
one by 3.54 mm, which is the ring's own overhang and not an error.

---

## 2. THE SECOND DEFECT, WHICH THE BRIEF DOES NOT NAME: THE MERGE-WALK COVERED ITS OWN HOLE

The baseline measurement turned this up before any fix was attempted, and it is why the
brief's gate 1 could not have passed on the chord alone.

The annular arm's `advA` branch emits `(a_i, a_{i+1}, b_j)` — two consecutive **OUTER**
vertices and one inner one — so wherever an outer edge spans a wide angular sector about
the hole's centroid the triangle reaches across the hole's own tip. **On the FLAT default,
where no chord error is possible at all, the cells alone read 822 within-shell pairs against
the plain lamina's 0**: a hole rim lying coplanar inside a skin triangle that should not have
been drawn over it, 562 of them at span 0 and the rest to 0.8847 mm. Written down, cell 2 of
the default field: outer edge `(22.80, ±1.68)` spans 42 degrees about the hole's centroid
while the hole has four vertices inside that sector, and the walk's last triangle covers the
lot.

A facet drawn over a hole is a facet that should not exist, so it is the same sentence as
the chord and is fixed here.

---

## 3. The construction, in two independent halves

### 3a. Topology — a plan triangulation that cannot cover a hole

A solid cell is **ear-clipped**. An annular cell is cut into **SECTORS**: the hole is
densified with the point where the ray from its own centroid through each outer vertex meets
it, and the region between one outer EDGE and the inner arc below it is ear-clipped. Ear
clipping triangulates a simple polygon using only that polygon's own vertices, so no triangle
can leave it — which a fan from a corner does not guarantee, because a convex hole bulging
into a wide sector can be cut by a chord whose two ends are both outside it.

**THE DENSIFICATION IS ON THE INNER RING ONLY.** The outer ring is SHARED with the
neighbouring cell and a point inserted there that the neighbour does not also generate is a
crack.

**A CENTROID FAN WAS TRIED FIRST AND IS WRONG, AND ONLY THE PARTITION CHECK SAID SO.** A fan
from the centroid is valid on a star-shaped polygon; a cell at the blade's **WAIST** is not
one, because the outline `{|y| <= h(x)}` is convex only where `h` is concave and `h` rises
then falls about the waist. On the below-floor rows `bloom-infill-lamina-floor.mjs` sweeps,
the fan drew up to **4.16 mm² MORE than the material**. Ear clipping for both arms is one
triangulator and one argument.

### 3b. Geometry — deviation-driven subdivision, crack-free by construction

A plan edge is split at its MIDPOINT when its own measured chord deviation exceeds the
tolerance, and each half is then asked the same question. So the points introduced on any
plan edge are `splitPoints(A, B)` — **a pure function of the unordered pair** — and two cells
sharing a wall edge produce the same set on it whatever else they do. A triangle splits one
of its edges and recurses; it stops only when all three are under the tolerance, so every edge
is eventually taken to its own `splitPoints`. That is the whole crack-freeness argument and it
does not depend on the order cells are visited in.

**The midpoint is safe to share** — `(a + b) / 2` is commutative in IEEE-754, so a midpoint is
bit-identical from either side — **and the floor is a LENGTH, not a recursion depth**, because
a depth is a property of the walk (two cells can reach one edge at different depths) while a
length is a property of the edge. Fifth instance in this project of a discrete decision taken
from something that is not a property of the thing decided.

### 3c. The tolerance, and why 3/4

**THE TOLERANCE IS THE SHIPPED LATTICE'S OWN CHORD ERROR ON THE SAME STATE**
(`latticeChordDevMm`, measured on the rows `buildPetalInto` emitted — an owner the infill does
not write). "Conforming" therefore means *the cell tessellation follows the surface at least as
closely as the mesh that already ships*: a bar in millimetres that moves with the state rather
than a constant to be wrong. It is NOT a fraction of the sheet — "the facet is still inside its
own sheet" is `t/2` = 0.600 mm on the default, four times looser than the 0.1416 mm the lattice
actually draws.

The refiner's criterion is a chord along an EDGE; the bar is the deviation over a FACET, and
they are not the same number. For a locally quadratic surface the affine interpolant's error on
a triangle is `-(l1 l2 q12 + l2 l3 q23 + l3 l1 q31)` in barycentric coordinates, where `q_ij` is
the second difference along edge ij; an edge midpoint reads `q/4` and the interior maximum, at
the centroid with all three equal, is `q/3`. **So a facet can exceed its worst edge by at most
4/3, and `CONFORM_EDGE_SHARE = 3/4` makes the facet bound hold.** Measured against it, the worst
observed amplification is **1.13** (`petalRoll` 330), 1.05 (cup x curl) and 1.02 (ALL FORM MAX)
— inside the bound on every state, which is what says the bound is the right shape and not a
coincidence of one petal.

---

## 4. TWO DEFECTS THE GATE FOUND IN THE FIX, BOTH CRACKS, AND NEITHER WAS VISIBLE IN A PICTURE

**(i) THE EDGE-SELECTION RULE DID NOT TERMINATE.** The first version split the WORST-deviating
edge. That can pick a SHORT edge for ever: the children still carry the long one, which never
shortens, so a sliver on a near-collinear chain recursed without bound and the depth escape
hatch then emitted the triangle **with an edge its neighbour had split** — 6 unmatched directed
edges on `buckle 0.6 f3` and 20 on `cup 1.2 x cupGradient 1`, with the vertex-welded shell count
going 1 -> 2 and the worst facet reading 0.7695 mm (3.078x the lattice). Splitting the LONGEST
wanting edge (Rivara's choice) halves the triangle's diameter whenever it is chosen, so the
`minEdgeMm` floor is reached. **WHICH wanting edge is chosen does not affect crack-freeness**:
the recursion stops only when NO edge wants splitting.

**(ii) A TRIANGLE WITH A REPEATED VERTEX CYCLED.** Ear clipping legitimately emits the wedge
between a chord A-B and the polyline A-C-B when C lies on that chord. Refining it splits A-B at
its midpoint, the plan canonicaliser lands that midpoint ON C, and the children are `(A, C, C)`
and `(C, B, C)` — the same shape as the parent. They are dropped now: the sliver's material is
zero in plan, and the triangle across the chord splits it at C by the same rule, so the mesh
closes on the fine path.

**THE DEPTH CAP STAYS AND IS NOW LOUD** — it counts, the builder reports it and C3c fails on a
non-zero count, because a cap that fires silently is exactly how this one hid.

---

## 5. The gate

`node tools/verify-bloom-infill-conform.mjs [--quick] [--json <file>]`, and
`--negative-control` before quoting a pass. One seed (`SEED`), one petal, EXPORT mode, 16
cells, wall 1.0 mm — naming the sampling because this project's first durable rule requires
it. Fourteen states: `petalRoll` 330 by name, §1b's two combined corners, one state per
curvature direction, a doubly curved one, the two petal widths that move the cell size, and
`footDelicacy` 0.25, whose lamina floor is set by the WALL rather than by the waist.

**C0** the instruments vouch for themselves before anything is reported, on answers written
down: ear clipping tiles a non-convex C (area 7 exactly, `n - 2` triangles), the sectors tile a
square-in-a-square annulus and NOT its hole (12 exactly), and the self-approach measure reads a
written-down 0.30 mm and excludes a pair 0.2 mm apart in plan. It ABORTS rather than reporting.

**C1** surface fidelity, read OFF THE EMITTED STREAM (triangles mapped back to their plan points
through `capturePlan`'s canonicaliser, never taken from the emitter's own report) against the
shipped lattice's own worst facet — plus an absolute clause at half the sheet, so the pair is not
purely self-referential.

**C2** self-approach: the minimum 3-space distance between facets whose PLAN footprints are more
than one minimum printable feature apart, measured the same way on the infilled cells and on the
PLAIN sheet over the very rows the cells cover.

**C3** the partition: the emitted plan triangles tile the MATERIAL and nothing else, per cell,
per sector and in total; no cell fell back; no triangle emitted at the recursion cap.

**C4** boundary edges 0, the vertex-welded shell count no worse than the legacy emitter's on the
same state, one voxel piece at 0.6 and 0.3 mm.

**C5** cost, reported per state, flagged only above +25 % on the shipping default.

### 5a. THE BRIEF'S ABSOLUTE BAR FOR GATE 1 IS NOT AVAILABLE, AND THE REASON IS A MEASUREMENT

The brief asks that "minimum self-approach across the sweep clears the project's bar, with
`petalRoll` 330 explicitly in the set". **The shipped petal itself folds at `petalRoll` 330.**
Its matrix row is a declared census xfail (15,280 pairs / 1.5539 mm) and CLAUDE.md records
"roll from 270 degrees ... fold a single petal at ANY depth". Measured here, the PLAIN lamina
over the cell region's own rows reads **2,347 pairs / 1.3837 mm** at roll 330 with no infill in
it at all, and its self-approach is **0.00000 mm**. No emitter can un-fold it.

So C2 is a two-sided build. Where the plain sheet clears the printable gap, the infilled one
must too; where it does not, C2 reports and C1 carries the claim.

**AND THE WORST SPAN IS REPORTED, NEVER BOUNDED.** A span is a property of the TESSELLATION
(this project's own rule) and the two tessellations under comparison are different by
construction: under pure roll the surface is a cylinder, straight along `u`, so a conforming
facet is long down the blade and short across it, and a long facet lying in the far wall reads a
long span **while drawing the surface more faithfully**. That is why roll 330's census span goes
1.3837 -> 6.0344 while its facet deviation goes 2.4990 -> 0.4317, and reading the first as a
regression would be reading the mesh for the solid.

### 5b. The table

Conforming, all clauses green:

| state | lattice | facet | ratio | cells pairs/span | plain pairs/span | tris (legacy) | approach cell/plain |
|---|---|---|---|---|---|---|---|
| default (flat) | 0.1416 | 0.0083 | 0.059 | 0 / 0.0000 | 0 / 0.0000 | 2744 (2392) | 1.00077 / 1.00001 |
| `petalRoll` 180 | 0.2772 | 0.2087 | 0.753 | 21 / 0.0145 | 0 / 0.0000 | 3236 (2392) | 0.75577 / 0.00253 |
| `petalRoll` 330 | 0.5730 | 0.4317 | 0.753 | 1861 / 6.0344 | 2347 / 1.3837 | 3188 (2392) | 0.00000 / 0.00000 |
| `petalRoll` -330 | 0.5730 | 0.4317 | 0.753 | 1836 / 6.2007 | 2347 / 1.3837 | 3188 (2392) | 0.00000 / 0.00000 |
| `petalCup` 1.2 | 0.1680 | 0.1329 | 0.791 | 49 / 0.1279 | 90 / 0.1268 | 3776 (2392) | 0.10465 / 0.09779 |
| `petalSpineCurl` 360 | 0.1419 | 0.1085 | 0.765 | 0 / 0.0000 | 0 / 0.0000 | 4272 (2392) | 0.89280 / 0.90119 |
| `petalTwist` 180 | 0.1407 | 0.1071 | 0.761 | 11 / 0.0156 | 0 / 0.0000 | 3096 (2392) | 0.93229 / 0.97617 |
| cup 1.2 x curl 360 | 0.1977 | 0.1509 | 0.763 | 848 / 0.8966 | 838 / 0.7606 | 4548 (2392) | 0.00063 / 0.00018 |
| ALL FORM MAX | 0.6348 | 0.4813 | 0.758 | 1097 / 2.3789 | 1141 / 1.2616 | 3444 (2392) | 0.00015 / 0.00000 |
| buckle 0.6 f3 | 0.1910 | 0.1427 | 0.747 | 0 / 0.0000 | 0 / 0.0000 | 3928 (2392) | 0.62745 / 0.55006 |
| cup 1.2 x cupGradient 1 | 0.2500 | 0.2175 | 0.870 | 86 / 0.5092 | 100 / 0.3493 | 3748 (2392) | 0.00209 / 0.00000 |
| `petalWidth` 30 | 0.2711 | 0.1424 | 0.525 | 0 / 0.0000 | 0 / 0.0000 | 3140 (2756) | 1.00001 / 1.00014 |
| `petalWidth` 8 | 0.0708 | 0.0230 | 0.325 | 0 / 0.0000 | 0 / 0.0000 | 1916 (1704) | 1.00003 / 1.00004 |
| `footDelicacy` 0.25 | 0.1039 | 0.0234 | 0.225 | 0 / 0.0000 | 0 / 0.0000 | 2120 (1864) | 1.00014 / 1.00001 |

Every ratio is below 1, boundary edges are 0 everywhere, the shell count never exceeds the
legacy's, and the voxel fill reads one piece at both cells on every row. The isometric rows
(flat, both widths, `footDelicacy`) read the self-approach pinned just above 1.0 mm **by
construction**, which is the measure's own floor and is stated in the gate's header rather than
left to be found: a pass there says exactly "nothing 1 mm apart on the sheet is within 1 mm in
space", and what carries the claim on a flat petal is C1 and C3.

### 5c. Two residues, reported

**`petalTwist` 180 reads 11 pairs at a worst span of 0.0156 mm where the plain sheet reads 0** —
a sixtieth of the minimum printable feature. Every one of them is a rim quad against a
neighbouring cell's skin: a rim spans the two skins at one plan point, so under twist it is
NON-PLANAR while its subdivision is driven by `R.points`, which reads the SKIN's chord. **It is a
discretisation artefact and not material overlap, measured**: 11 pairs / 1.560e-2 mm at the
shipped tolerance, 7 / 2.502e-3 at half, 3 / 1.819e-3 at a quarter and **ZERO at an eighth** —
but that eighth costs 3,096 -> 6,628 triangles on that state (+114 %). Reported, not tuned away.
`petalRoll` 120 / 150 / 180 carry the same class at 3 / 9 / 21 pairs.

**`cup 1.2 x curl 360` reads 848 pairs against the plain sheet's 838.** The petal's own form is
folded there before a cell is cut (its plain self-approach is 0.00018 mm), so the comparison is
between two fold tessellations and carries nothing.

### 5d. The negative control, and the gap it exposed

Three mutations, each running through the SHIPPED function rather than a mutated copy of it:

| mutation | claims | actually fired |
|---|---|---|
| `the-flat-fan-is-restored` (`{ conform: false }`) | C1a, C1b, C3a | C1a, C1b, C3a |
| `the-subdivision-is-halved` (`{ levelBias: -1 }`) | C1a, C1b | C1a, C1b |
| `a-sector-is-fanned-from-a-corner` (`{ sectorFan: true }`) | C3a, C3b | C1a, C1b, C3a, C3b, C4a |

The third's extra three are collateral the mutation is allowed but not required to cause, and
all three are true about it: fanning a sector from a corner covers the hole (C3a), leaves the
covering triangles unrefined (C1) and mismatches a rim against a skin (C4a).

**THE LISTS ARE MEASURED, NOT PREDICTED.** `the-flat-fan-is-restored` was written claiming C2a
and the control reported it **MISSED** — which is the CLAIM being wrong rather than the clause.
The self-approach measure asks about parts of the sheet more than a printable feature apart IN
PLAN; a chord's damage on a flat blade is material drawn over a hole (C3a's subject) and on a
curved one it is the facet's own position (C1's). Every curved state in the sweep either has the
PLAIN sheet already under the gap — so C2a reports rather than asserts — or is flat enough that
the fan is exact. **NO MUTATION HERE NAMES C2a, and that is recorded as a gap rather than closed
by widening a list**; what vouches for that measure instead is C0, which reads a written-down
0.30 mm and refuses a pair 0.2 mm apart in plan. `petalRoll` 180 was added to the sweep trying to
close it and did not: the plain sheet's own approach there is already 0.00253 mm.

---

## 6. WHAT MOVED IN THE FOUR COMPANION TOOLS: THE TRIANGLE COUNT, AND NOTHING ELSE

Predeclared before the runs, then measured. `bloom-basal-grading.mjs`,
`bloom-infill-base-panel.mjs` and `bloom-infill-lamina-floor.mjs` were run at `--quick` on a
worktree of the base commit and on this head, and the two outputs diffed **with the
triangle-count columns masked and nothing else**:

```
bloom-basal-grading:      IDENTICAL
bloom-infill-base-panel:  IDENTICAL
bloom-infill-lamina-floor: IDENTICAL
```

Every published figure those tools carry — the lowest hole's `u`, the hole counts, the real-hole
counts, the wall fractions, the anisotropy, the panel percentage, the bottom-45 % solid fraction,
the blade-open fraction, the apex cap, the boundary / non-manifold / shell / voxel columns — is a
property of the PLAN, which this change does not touch. The triangle counts move because the
tessellation is the thing that changed.

**AND BOTH COMPANION MUST-FAILS STILL PASS ON THE NEW EMITTER**, with their published figures
intact: `bloom-infill-base-panel.mjs --control` reads **C2 at 112 of 560** — the number
CLAUDE.md records — and C3 reproduces #250's seven-row truncation table with a 0.00e+0
residual on two of three boundaries; `bloom-infill-lamina-floor.mjs --control` passes K1–K4,
with K2c still firing on 2 of 3 petals and explained by a measured monotone curve on the third.

**`bloom-basal-grading --inert <base-tree>` IS THE ONE INVOCATION THAT CANNOT BE RUN ACROSS THIS
COMMIT.** It compares the head's `cutThrough` against a base tree's float for float to prove the
`u0` defaulting is inert; with the emitters differing, it is comparing two emitters. It remains
valid between two trees that share the emitter, and a note to that effect is in the tool's header.

---

## 7. WHAT S2 NEEDS TO KNOW: SUBDIVISION MOVES THE WALL COMPRESSION NEITHER WAY

The brief asks explicitly. Measured, both emitters, same field:

| state | PLAN wall (§1b's measure) | EMITTED rim-to-rim, legacy | EMITTED rim-to-rim, conforming |
|---|---|---|---|
| default (flat) | 0.5000 | 1.0073 | **1.0073** |
| `petalCup` 1.2 alone | 0.5000 | 0.9061 | **0.9061** |
| `petalSpineCurl` 360 alone | 0.4998 | 1.0073 | **1.0073** |
| cup 1.2 x curl 180 | 0.3501 | 0.8792 | **0.8792** |
| **cup 1.2 x curl 360** | **0.1074** | 0.2231 | **0.2231** |
| ALL FORM MAX | 0.1841 | 0.0191 | **0.0191** |

**Identical to four decimals on every state.** The rim's vertices are `pt()` of the hole's own
plan points, which the subdivision does not move; it inserts points ON the same rim curve. The
compression is a property of the PLAN and the MAP, and S1 changes only how the material between
the rims is triangulated. **S2 still has to fix it**, and §1b's ruling 2 stands.

Two things for S2 beside that. The PLAN-wall column reproduces §1b's published table in shape
(0.3501 against its 0.3551 at cup x curl 180; 0.1074 against 0.1183 at cup x curl 360; 0.1841
against 0.1722 at ALL FORM MAX) — the small differences are the two trees, since §1b measured on
`370521f` and this is `2464d50` after #278 and #279. And **the EMITTED wall on ALL FORM MAX is
0.0191 mm, an order of magnitude tighter than the plan measure suggests**, because the plan
measure reads a hole against its OWN cell's outline while the emitted one reads two holes' rims
against each other.

---

## 8. A finding that is the FIELD's and not the emitter's, recorded because the gate can now see it

**Below the derived lamina floor, `cellsFor` can hand the emitter a polygon that is not simple.**
`clipHalfPlane` is Sutherland–Hodgman, which is correct for a CONVEX subject; the petal outline
`{|y| <= h(x)}` is convex only where `h` is concave, and `h` rises then falls about the blade's
waist. On the rows `bloom-infill-lamina-floor.mjs` sweeps below the floor — a region the floor
exists to refuse — the cells there are non-convex and occasionally non-simple.

The emitter now SAYS SO instead of drawing garbage: `earClip` returns nothing rather than a
partial cover, the per-cell and per-sector partition checks catch it, and `cutThrough` reports a
counted `tileFail` and falls back to the legacy tessellation for that cell, so the mesh is never
worse than it was. Measured after the fallback: **0 of the below-floor rows regress** on boundary
edges, non-manifold edges or shells against the legacy emitter, across the eight seeds and both
of `bloom-infill-lamina-floor.mjs`'s below-floor rows.

It is not S1's to fix — the shipped `basalSplit` never chooses those rows — but S3 should know
that a cell region reaching the waist wants a clipper that handles a non-convex subject.

---

## 9. What this does NOT cover, in the gate's own header as well as here

* C1 measures **SKIN** facets. A rim quad spans the two skins at one plan point and has no
  mid-surface to deviate from; it inherits its subdivision from `R.points`, which is driven by the
  skin chord, and what covers it is C2 and C4. §5c is the residue that leaves.
* the prototype is **not** the shipping emitter and this gate is **not** wired to CI. Nothing in
  the repository's CI can see any of it: `bloom-voronoi-proto.mjs` emits into its own `Acc`, not
  into `MeshBuilder`.
* the plan is still **flat-computed**. That is S2.
* **one seed, one petal, EXPORT mode.** The basal-grading doc sweeps eight seeds and finds real
  seed-to-seed spread in the basal band; no figure here should be quoted as a population.
* adding a file under `tools/` makes both FLOWER gates run through their `tools/**` filter. They
  test flower geometry and are not evidence about any of this.
