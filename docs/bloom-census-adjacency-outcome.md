# The census reads a shared corner as topology, not as a fold

**Instrument only.** `git diff origin/main --stat` touches the census, the
harness's declared magnitudes, two new instruments, one fixture file, this doc
and one CI wiring line. No geometry, no emitter, nothing under `flower*`.

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

**And the artefact class never sets a worst span.** Across `main`'s whole matrix
the sweep reads **0 rows whose `worstSpanMm` moves**, so every re-recorded entry
keeps its recorded depth and only its pair count falls.

## 4. The rejected route and this one agree on this tree — and differ on where the object stands

Said plainly because the obvious claim would be that the fixtures discriminate,
and they do not. Replaying every stored pair under both candidates:

| | artefact pairs still folding | genuine pairs that stopped |
|---|---|---|
| a bar scaled by coordinate magnitude | 0 of 122 | 0 of 232 |
| the adjacency rule | 0 of 122 | 0 of 232 |

What separates them is a real crossing that happens to land NEAR a shared corner.
The same needle-shaped pair, once at the origin and once 30 mm out:

| configuration | `main` | widened bar | adjacency rule |
|---|---|---|---|
| a free edge crossing 1.4e-8 mm from the shared corner, at the origin | 1 | 1 | 1 |
| **the same shape 30 mm out** | **1** | **0** | **1** |
| a crossing 0.01 mm from the shared corner, 30 mm out | 1 | 1 | 1 |

A rule that answers differently for the same shape in two places is answering
about the translation. Connectivity does not move when the object does. Both
shapes are `CA2` fixtures and `the-discard-bar-is-widened-instead` is the mutation
that must redden them.

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
  pairs share NO corner at all, and the worst span is ~1e-15 mm. That is the class
  this repo already declares by name (`VARIANCE: x the IRIS`, session 42's
  `LOBES: x cup 0.40`): "a property of where the stations land on a crease, not of
  a fold". The census is right to report it and the list is where it is answered.

Those rows are #278's to declare, not this PR's to silence. **Widening this rule
to reach them would be the weakening #278 was right to refuse** — it would have to
discard a hit from a FREE edge, which is the one thing the standing guarantee
forbids.

## 7. The gates

`node tools/verify-bloom-census-adjacency.mjs` (CA0–CA4) and
`--negative-control` (five mutations, each naming the families it must redden).
It rides in `bloom-export-watertight.yml` beside arc-stability, for
arc-stability's own three reasons: the same question, Node-only, seconds, and it
imports playwright not at all.

| family | what it measures | what it is blind to |
|---|---|---|
| CA0 | six written-down pairs, answers stated in a sentence | anything the real mesh does |
| CA1 | a planted crossing of 0.01 mm inside ONE shell, and its lifted control | pairs, not rows |
| CA2 | the standing guarantee, plus the shape that separates this rule from a widened bar | — |
| CA3 | every flagged pair of `pr278` and of `main`, replayed: artefacts must clear, genuine ones must still fold | the grid, the shell partition and the span arithmetic — the sweep's |
| CA4 | seeded random shared-corner pairs against a closed-form ground truth | the ill-conditioned grazing the artefact needs — it scores `main` identically |

**The matrix claim is the sweep's, not the gate's**: `node
tools/bloom-census-sweep.mjs --report <file>` reads a recorded A/B back. It builds
each row ONCE and hands the same `Float64Array` to both censuses, so nothing on
the build side can explain a difference.
