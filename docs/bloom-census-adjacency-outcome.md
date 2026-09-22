# The census reads a shared corner as topology, not as a fold

**Instrument only.** `git diff origin/main --stat` touches the census, the
harness's declared magnitudes, two new instruments, one fixture file, this doc,
the project's pointer file and one CI wiring line. No geometry, no emitter,
nothing under `flower*` — and `--scope` (CA5) asserts that allowlist on every CI
run rather than leaving it to the party who could have broken it.

Every figure below names the TREE it was taken on, because the thing under
change is the measuring instrument itself and a census figure without a tree is
not a measurement.

| name | what it is |
|---|---|
| `main` | `370521f` — `origin/main` at the time of writing |
| `pr278` | `17cff3a` — PR #278's head, read-only; **none of its geometry is merged** |
| `fix` | this branch: `main` plus the census change |

## 1. The defect

`tools/bloom-self-intersection.mjs` asks whether a closed shell passes through
itself, and X2 in both STL gates turns its answer into a verdict. Two triangles
that share a vertex or an edge MEET at that feature by topology, and the census
has always discarded such a meeting — but it decided which meetings to discard
by DISTANCE, against an absolute `PT_EPS` of 1e-9 mm on coordinates of 20–40 mm.

The segment-triangle solve's own conditioning near a shared corner delivers
about that much error. **The bar was the solve's noise**, and the verdict sat on
whichever side of it a vertex happened to fall. PR #278's edge profile puts many
more near-tangent facets around one corner than the flat wall did, and 108 of its
rows reddened X2 on nothing else.

## 2. The fix, and why it is a theorem rather than a threshold

An edge one of whose endpoints the other triangle also carries meets that
triangle in one of exactly two ways:

* the weld is by EXACT position, so a shared endpoint `p` is bit-identical to one
  of the other triangle's corners and lies EXACTLY in its plane — not nearly;
* a line through a point of a plane either meets that plane ONLY at that point,
  or lies IN it. There is no third case.

The first branch makes the hit the shared feature and nothing else, whatever the
barycentric solve reports for `t`. **The second branch is a real meeting along a
SEGMENT and must not be discarded** — and getting that wrong was the one real
defect in the first draft of this change, found by an adversarial review rather
than by any gate.

**THE SECOND BRANCH IS NOT THE COPLANAR ARM'S CASE**, which is what made it easy
to miss: the arm asks whether the two TRIANGLES are coplanar, and a pair can be
transverse while one triangle has an edge running along the line where the planes
meet. Measured on `main`'s own `FRINGE: x the buckle at 0.30 f 3`, the worst pair
of that row: the two planes read `n1·n2 = -0.9200` — thoroughly transverse — while
both triangles have an INCIDENT edge whose sine to the other plane is 2.95e-15 and
3.10e-15 over 1.5315 mm. Their intersection really is a 1.5315 mm segment, and
`main`'s `worstAt` sits at its far end.

**SO THE DISCARD IS LICENSED BY TRANSVERSALITY, AND THE WELD MAKES THAT DECIDABLE
AT ONE POINT.** Because the shared endpoint lies exactly in the other plane, the
edge lies in that plane iff its FAR endpoint does. `offPlane()` is that test:
|sin| of the edge to the plane, against `segTri`'s own relative bar, so the two
agree about what parallel means. **The polarity is deliberate** — where the test
cannot say the edge is transverse, the hit is KEPT. The rule discards only what it
can prove is the shared feature, which makes "it can never lose a fold" a
construction rather than a sweep result.

What is consulted is still CONNECTIVITY — which welded indices the two triangles
have in common — plus one scale-free angle. No distance from the reported point to
anything is ever measured.

**The argument deliberately does not rest on `segTri`'s parallel guard**, and the
first draft of it did. That guard is relative — `|det| > 1e-12·|e1|·|p|` — but
`p` is `D × e2` and `e2` is an edge of the tested triangle, so `|p|` collapses
toward zero in exactly the configuration the premise was meant to exclude. The
bar sinks with the quantity it bounds. The endpoint argument needs no guard at
all.

**The rule is per EDGE, never per pair.** The edge opposite a shared vertex is
free in both triangles, so a pair that shares a corner AND crosses elsewhere is
still reported. A blanket "skip a pair that shares a vertex" — which the file's
own header has warned against since session 35 — is one of the five mutations the
negative control requires to redden.

**It cannot touch the cross-shell count, and that is provable rather than
measured**: the shell partition is connected components over shared vertices, so
two triangles with a corner in common are one shell by construction. The sweep
asserts it anyway and reads 0 rows moved on the cross column.

**It can only remove candidate points, never add one.** So `within` can only fall,
and **no row can newly fire X2** — a property, not a sweep result.

## 3. PR #278's "0.8187 mm fold" is the length of a shared edge

§7 of `docs/bloom-edge-profile-outcome.md` separates three genuine folds from the
108 artefacts "by the one quantity that is physical, the worst span", and names
`VARIANCE: size ±50% x 40 petals` — 66 pairs, worst span 0.8187 mm — as real. It
is not, and the span is what misled it.

Measured on `pr278`, three ways that share no code:

* **All 66 pairs are adjacency artefacts.** Every surviving point on every pair
  came from an edge INCIDENT to a shared corner; 0 of 66 has a free-edge point;
  0 overlaps in plane. Every point sits 1.16e-9 to 2.41e-9 mm from a shared
  corner.
* **The pair that sets the row's worst span shares an EDGE**, and its two
  surviving points sit 1.2168e-9 mm and 1.3312e-9 mm from the edge's two ENDS.
  The distance between those two ends is 0.818700 mm. The reported "depth" is the
  shared edge's own length.
* **Replayed pair by pair under both censuses**: 66 artefact, 0 genuine.

The other two rows §7 names are real and this PR leaves them alone — measured the
same way: `DOME: the mum x rise 1` 0 artefact / 84 genuine, `BUCKLE: THE IRIS
look` 0 artefact / 4 genuine. Both are in the gate as MUST-STILL-FOLD fixtures.

**The consequence for #278 is that its own reason for rejecting the epsilon route
does not hold** — that route's damage to this row was damage to an artefact. The
reason to prefer connectivity is §7's other half and §7 of this doc, not that one.

## 3b. What the artefact class looks like, measured on two trees

`tools/bloom-self-intersection.mjs` was copied and instrumented to report, per
within-shell pair, how many corners the two triangles share, whether each
surviving point came from an edge INCIDENT to a shared corner, how far it sits
from the nearest shared corner, the dihedral between the two planes, and whether
the pair overlaps in plane with the coplanar arm's own gate ignored.

| row | tree | pairs | all-incident | free-edge | distance to the shared corner | span | in-plane overlap |
|---|---|---|---|---|---|---|---|
| `VARIANCE: size ±50% x 40 petals` | pr278 | 66 | **66** | 0 | 1.16e-9 – 2.41e-9 mm | 0 except the shared-edge pair | 0 |
| `ORCHID x the foot UPPER clamp (petalWidth 30) x 2 whorls in step` | main | 46 | **46** | 0 | 1.00e-9 – 1.75e-9 mm | 0.0000 | 0 |
| `petalCup max (1.2)` | main | 752 | 32 | 338 | 1.03e-9 – 1.94e-9 mm on the 32 | 0.0000 on the 32 | 0 |
| `DOME: the mum x rise 1` | pr278 | 208 | **0** | 208 | — (124 share nothing) | 0.1658 mm | 0 |
| `BUCKLE: THE IRIS look` | pr278 | 8 | **0** | 8 | — (4 share nothing) | 0.0554 mm | 0 |

**The dihedral is not the tell.** On the ORCHID row the two planes meet at
0.02° to 16.76°, so these are not near-coplanar pairs; what they have in common is
a grazing edge that starts at a corner the two triangles share, which is where the
solve is ill-conditioned. That is why the remedy is topological and not a
flatness test.

**And the artefact class almost never sets a worst span.** Across `main`'s whole
matrix the sweep reads **1 row whose `worstSpanMm` moves**, and it is not a pair
being removed: on `SEPALS: sepalBuckleFreq min (1)` one pair carries a real
crossing point AND a phantom on the shared corner, so its recorded depth
(0.8972 mm) was the distance between the two and what is left is the crossing's
own extent (0.3585 mm). That is the same shape as §3's finding, on a pair that
survives rather than one that goes. Every other re-recorded entry keeps its
recorded depth and only its pair count falls.

## 4. The rejected route does not do the job, and only main's own rows say so

**AN EARLIER DRAFT OF THIS SECTION SAID THE OPPOSITE AND IS CORRECTED HERE RATHER
THAN REWRITTEN AWAY.** It read: *"the obvious claim would be that the fixtures
discriminate, and they do not"* — 0 of 122 artefact pairs still folding under a
bar scaled by coordinate magnitude, 0 of 232 genuine pairs lost — and concluded
that the only thing separating the two candidates is translation dependence.
That was measured on **PR #278's rows alone**. Once `main`'s own 67 moved rows
are stored too, the fixture set is 2196 artefact pairs rather than 122, and the
conclusion reverses:

| over 2196 artefact and 1997 genuine stored pairs | artefact pairs still folding | genuine pairs that stopped |
|---|---|---|
| a bar scaled by coordinate magnitude (#278's route) | **651** | 0 |
| discarding on incidence alone (no transversality test) | 0 | **13** |
| **the adjacency rule as shipped** | **0** | **0** |

The 651 are on fourteen rows, 572 of them on `DEPTH: 6 turns x layerSize min x
petalCount 40` and the rest spread over the FRINGE block, the stamens' apex
corner and a VARIANCE row.

**THE MECHANISM IS WHY NO BAR CAN DO THIS, AND IT IS THE STRONGEST SINGLE
MEASUREMENT IN THIS PR.** The premise behind an epsilon is that the
ill-conditioned solve puts its phantom point NEAR the shared corner. It does not.
An incident edge that grazes the other triangle's plane passes the relative
parallel guard and the solve then places `t` anywhere along that edge. Measured
over the 666 hits the widened bar leaves standing, distance from the nearest
shared corner:

| min | p25 | median | p75 | max |
|---|---|---|---|---|
| 1.0009e-9 mm | 2.7033e-9 mm | 1.3309e-8 mm | 7.5820e-8 mm | **2.0933 mm** |

80 of them are past 1e-5 mm and 40 are past 0.1 mm. A bar wide enough to clear
the worst would discard every real crossing within two millimetres of a corner,
which is most of a petal's crease. The error is not bounded by any tolerance; it
is bounded by the length of an edge.

**TRANSLATION DEPENDENCE IS STILL TRUE AND IS STILL A FIXTURE**, and it is the
half that holds even on #278's own rows. The same needle-shaped pair, once at the
origin and once 30 mm out:

| configuration | `main` | widened bar | adjacency rule |
|---|---|---|---|
| a free edge crossing 1.4e-8 mm from the shared corner, at the origin | 1 | 1 | 1 |
| **the same shape 30 mm out** | **1** | **0** | **1** |
| a crossing 0.01 mm from the shared corner, 30 mm out | 1 | 1 | 1 |

A rule that answers differently for the same shape in two places is answering
about the translation. Connectivity does not move when the object does. Both
shapes are `CA2` fixtures; `the-discard-bar-is-widened-instead` is the mutation
that must redden them, and it must now redden `CA3` as well.

**THE CORRECTION ARRIVED FROM THE GATE, NOT FROM A READING.** The two mutations
above were declared to break `CA2` only, and both came back with `CA3` also red
the first time the negative control ran against the larger fixture set. Neither
check was loosened: both claim lists were widened to what was measured, and this
section is what the widening says.

## 5. What it is blind to

**A pair sharing an EDGE that lies EXACTLY in one plane and folds back on
itself.** The coplanar arm is gated on fewer than two shared vertices, so it never
asks; and such a pair produces no hit at all, because every edge is parallel to the
other plane and `segTri` returns null. Nothing looks. **That is true of `main` too,
and this rule does not widen it** — the transversality test keeps the hits of a
NEARLY coplanar pair, which is the whole population `main` ever counted here.

The measurement that settled it: an earlier draft discarded on INCIDENCE alone and
lost **89 pairs on 18 rows** of `main`'s matrix that the arm reports as genuine
in-plane overlaps, every one on a shared EDGE, sitting 7.3e-3 to 7.4e-1 mm from the
nearest shared corner rather than the ~1e-9 mm the artefact class sits at. With
transversality those are kept, and the rows read `main`'s own counts again:
`CAPABILITY: cleft x 6 layers` 27,990 → 27,916 → **27,990**, `SEPALS: ALIGNED at
the shipped size` 2,130 → 2,128 → **2,130**.

**OPENING THE ARM'S GATE WAS BUILT AND REVERTED, TWICE, AND BOTH ATTEMPTS ARE
RECORDED BECAUSE BOTH WERE INSTRUCTIVE.** Gating it on fewer than THREE shared
vertices reports pairs nothing ever counted — **+56 on `petalCup max (1.2)`
alone, 13 of the first 163 `main` rows moved** — which is a real strengthening
with its own calibration to do first, since `coplanarOverlap` opens with an
ABSOLUTE 1e-9 mm planarity test on the same 20–40 mm coordinates this file has
just been burned by. A narrower version — ask the arm wherever the rule discarded
a hit — preserves whichever pairs the old solve happened to squeak through, which
is an accident and not a criterion; **and as written it was a TAUTOLOGY** (with two
shared vertices every edge is incident, so its condition was the exact complement
of the arm's own gate), so it silently became the gate-opening. It widened
`SEPALS: ALIGNED at size 1.00` by **70%**, and **CA0–CA4 were all green on it**.
That is why CA7 exists.

**A weld that is not exact.** The premise is that a shared corner is
bit-identical, which `census()`'s exact-position weld guarantees and a
distance-based weld would take away.

**The metric rule is now measured inert, with a number.** `isSharedFeature` and
its 1e-9 bar are untouched and still run on the points the adjacency rule leaves.
Instrumented over five representative `main` rows — `petalCup max (1.2)`,
`petalRoll max (330)`, `CAPABILITY: cleft`, `FRINGE: THE CARNATION` and
`SEPALS: ALIGNED at the shipped size` — it was called **111,195 times and fired
0**. Only FREE-edge hits can reach it now, and a free edge is the one opposite
the shared corner. It is KEPT rather than deleted because a sliver can put a
free-edge hit next to a shared corner and this geometry simply does not — which
is a statement about the tree, not about the rule. The census's own header says
so rather than leaving a reader to assume the bar is doing work.

**`--prove-exclusion` is not a witness for this change.** It passes
character-for-character on `main` and on `fix`, because its crossing is on a free
edge. It still demonstrates the pair-level guarantee it was written for; it
demonstrates nothing about the new rule, and the gate does not cite it as if it
did.

## 6. Not every row PR #278 reddened is an adjacency artefact

The brief for this session, and §7 of #278, say the flagged rows share "exactly
one vertex" — a characterisation #278 made on a SAMPLE of pairs. It does not hold
for all of them. Replaying every flagged pair under both censuses separates two
classes:

* **The adjacency artefacts**, which this rule clears. Every surviving point comes
  from an edge INCIDENT to a shared corner and sits ~1e-9 mm from it.
* **SPAN-0 TANGENCIES, which it does not and must not.** Two skins meeting exactly
  — the hits land at `z = +0` and `z = -0` on either side of one plane, half the
  pairs share NO corner at all, and the worst span is ~1e-15 mm. The census is
  right to report it and the list is where it is answered.

Three of #278's reddened rows are in that second class and remain red under this
rule, with what the fixtures record for each:

| row | pairs | of which share NO corner | worst span |
|---|---|---|---|
| `TILT: 90 (the right angle — where the clearance law saturates)` | 32 | 16 | 1.99e-15 mm |
| `DOME: rise 1 x petalTilt 0 (the blade lies in the tangent plane)` | 32 | 16 | 4.45e-16 mm |
| `DEPTH: the mum at 6 turns (D_max 19 measured, CROWDED)` | 33 | 21 | 8.87e-3 mm |

Those rows are #278's to declare, not this PR's to silence. **Widening this rule
to reach them would be the weakening #278 was right to refuse** — it would have to
discard a hit from a FREE edge, which is the one thing the standing guarantee
forbids.

**AND TWO ROWS THIS REPO HAD ALREADY DECLARED AS SPAN-0 TANGENCIES WERE NOT
TANGENCIES AT ALL.** `VARIANCE: x the IRIS at 2 whorls` (3 pairs) and session 42's
`LOBES: x cup 0.40` (1 pair) are both described in `CLAUDE.md` and in their own
entries as "a property of where the stations land on a crease, not of a fold" —
the honest reading available at the time, and the reason each was declared rather
than chased. Every one of those four pairs shares a corner and every hit came from
an edge incident to it: they were phantoms, they read 0 now, and their entries are
gone. The distinction the list could not draw is exactly the one this rule draws,
and the three rows in the table above are what is left of the class once the
phantoms are out of it.

## 7. The gates

`node tools/verify-bloom-census-adjacency.mjs` (CA0–CA4 and CA7) and
`--negative-control` (six mutations, each naming the families it must redden,
with every anchor checked before any of them runs). It rides in
`bloom-export-watertight.yml` beside arc-stability, for arc-stability's own three
reasons: the same question, Node-only, seconds, and it imports playwright not at
all. `--scope` (CA5) runs there too, so the allowlist is asserted by the gate on
every run rather than by the only party who could have broken it.

| family | what it measures | what it is blind to |
|---|---|---|
| CA0 | six written-down pairs, answers stated in a sentence | anything the real mesh does |
| CA1 | a planted crossing of 0.01 mm inside ONE shell, and its lifted control | pairs, not rows |
| CA2 | the standing guarantee, plus the shape that separates this rule from a widened bar | — |
| CA3 | every flagged pair of `pr278` and of `main`, replayed: artefacts must clear, genuine ones must still fold | the grid, the shell partition and the span arithmetic — the sweep's |
| CA4 | seeded random shared-corner pairs against a closed-form ground truth | the ill-conditioned grazing the artefact needs — it scores `main` identically |
| CA7 | every stored pair replayed against the SAME census with the rule removed: the rule may only DISCARD | a rule that discards correctly and too much — that is CA3's genuine class |
| CA5 | the diff against the base names only census and instrument files; refuses an empty diff | what is inside those files |
| CA6 | a recorded matrix sweep replayed: no verdict flip, no cross-shell move, no undeclared mover | anything the recorded sweep did not cover |

**The matrix claim is the sweep's, not the gate's**: `node
tools/bloom-census-sweep.mjs --report <file>` reads a recorded A/B back. It builds
each row ONCE and hands the same `Float64Array` to both censuses, so nothing on
the build side can explain a difference.

## 8. What was measured, and the four things the brief asked for

**GATE 1 — `artefacts-clear`.** The fixture export covers **191 rows of PR
#278's head (17cff3a)**. Under that tree's own census X2 would fire on **109** of
them; under this one it fires on **3**, the rows of §6. So **106 clear**, and the
three that remain are the span-0 tangency class the census is right to report.
(#278 reports 108 where this sweep reads 109 on a subset of its matrix. Which row
the extra is has not been isolated, and it is recorded as a discrepancy rather
than reconciled: the classification of every flagged pair is per PAIR and is in
the fixture file, so the claim that rests on it does not depend on the count.)

**GATE 2 — `still-catches`.** `CA1` plants two faces crossing by **0.01 mm** with
no corner in common, bridged into ONE shell by a triangle that touches neither —
two triangles that share nothing are two shells, and a planted crossing that is
not connected is a fixture testing nothing. The census must report it, and must
report it BETWEEN the right two triangles: on a three-triangle fixture the right
count by accident is the same number. Its control lifts the face 0.02 mm clear
and the count must go to 0. `CA2` plants the other half — a pair that shares a
corner AND crosses elsewhere — which is the standing guarantee a blanket
skip-if-adjacent destroys, and `adjacency-rule-is-per-pair` is the mutation that
must redden it.

**GATE 3 — `no-baseline-drift`.** `tools/bloom-census-sweep.mjs` builds each row
of `main`'s matrix ONCE and hands the same `Float64Array` to both censuses, so
nothing on the build side can explain a difference. Over the **909-row live
matrix in EXPORT mode**, with coverage checked against the matrix itself:

| | |
|---|---|
| rows present / in the matrix | **909 of 909**, all censused, none skipped |
| X2 fires | **0 rows under either census** |
| X2 verdict flipped | **0** |
| cross-shell counts moved | **0** |
| worst spans moved | **1**, predeclared |
| within-shell counts moved | **68**, all declared, **0 undeclared** |
| rows censused twice across processes, disagreeing | **49 / 0** |

The one worst-span move is `SEPALS: sepalBuckleFreq min (1)`, 0.8972 → 0.3585 mm,
and it is not a removal: the pair carries a real crossing point AND a phantom on
the shared corner, so its recorded depth was the distance between the two.

**GATE 4 — `geometry-untouched`.** `git diff main --stat` names census and
instrument files only — no geometry, no emitter, no `flower.*` — and `--scope`
(CA5) asserts it on every CI run rather than leaving it to the only party who
could have broken it. It refuses an empty diff, so it cannot pass by having no
subject.

### The re-record, per #213

**68 rows move, 881 pairs stop being counted.** 57 keep their entry at the new
count with the previous figure beside it; **11 drop to zero and their entries are
gone**, named in the block at the head of `SELF_INTERSECTION_XFAIL` so an absence
has a reason beside it. Of the 735 removed from the 67 rows whose pairs are stored
as fixtures, **734 read a span of exactly 0.0000 mm and the largest anywhere is
1.8e-14 mm** — each was a count of phantoms and nothing else. The 68th is
`ALL MAX` (196,142 → 195,996), whose pairs are not stored because it is 2,354,268
triangles, and whose worst span, cross-shell count and shell count are all
unmoved.

Two instruments agree on the size of it without sharing code: the sweep's
per-row delta and the fixture export's per-row artefact count are **equal on all
67 stored rows**, and they sum to the same 735. `ALL MAX` is read by two as well
— the sweep and `bloom-xfail-magnitudes --only '^ALL MAX$' --include-refused`
both give 195,996 · 5.7609 mm.

**AND THE RE-RECORD IS CONFIRMED IN THE BROWSER, NOT ONLY IN NODE, WHICH IS THE
ONE THING A NODE MEASUREMENT CANNOT SETTLE.** X1's band on pairs is EXACTLY 0,
the gate's census runs on the builder's doubles as Chromium's V8 computes them,
and this repo has already measured the two engines disagreeing in the last bits
(session 38 §B10.7). So every moved row was re-run through the real gate:
`node tools/verify-bloom-export.mjs --only '<the 68 moved labels>'` reads
**PASS — 67 of 68 attempted configs reached the results and every one exports
watertight; 1 refused on the triangle budget, declared and asserted by XR1** —
with **every X1 line reading "still failing at that magnitude"**. No validity
assertion fired and no row was dropped. `node tools/bloom-xfail-magnitudes.mjs`
reads 290 of 290 at their recorded magnitude in Node, and its `--control` fires
in both directions on both quantities.

### The coverage lesson this session had to learn twice

**A SWEEP THAT SKIPS A ROW SILENTLY REPORTS OVER THE ROWS THAT SURVIVED.** Two
runs of this sweep finished with dead shards and no complaint — 58 PR rows and
then 42, then 7, `main` rows missing — and every population it printed was
computed over what was left. The report now takes `--harness <tree>` and compares
what it was given against `buildMatrix()`, and FAILS on a short run.

**AND THE SAME HOLE HAD A SECOND MOUTH: A ROW SKIPPED BY DESIGN.** `ALL MAX` is
export-refused (2,354,268 triangles) and the sweep skipped every refused row —
while `ALL MAX` is also a declared self-intersector, so a census change could move
its recorded count with nothing here to see it. `--include-refused` covers it, and
the report FAILS on any skipped row that carries a `SELF_INTERSECTION_XFAIL`
entry, so the hole cannot reopen quietly. **It earned its keep on the run that
added it**: `ALL MAX` moves 196,142 → 195,996, so without `--include-refused`
this PR would have shipped a declared row 146 pairs adrift from what the tree
measures — the exact debt #213 exists to stop, and invisible to CI, since an
export-refused row produces no STL for X1 to read.
