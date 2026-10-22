# The umbel — outcome (Oct 22)

Eva's rulings of Oct 21–22: the spider lily. Florets on pedicels radiating
from ONE junction at the top of the stem, with the head an optional toggle that
ships OFF. This document is the record of what was measured, what was built,
what was declared rather than fixed, and what is open for Eva.

## 1. The raceme probe first (the ruling's own first step)

Before a line was written the raceme was asked how close it already gets:
`inflorescence RACEME`, `floretNodes 1`, `floretPhyllotaxy whorled`, a 120 mm
stem, the shipped defaults otherwise (measured, Node, EXPORT, `probe1.mjs` in
the session scratchpad):

* **It builds exactly three florets, at 0 / 120 / 240 deg** — `whorled` is the
  leaves' law, three a node, and nothing reaches any other count.
* **The one node sits 66 mm down the stem** (`LEAF_NODE_SOLO`, 0.55 of the
  length), not at the top, and its pedicels are **rooted in the stem WALL** at
  r 2.25 mm (`rodWallRootMm`), each through its own hole.
* **The head is always there**: a raceme is a terminal head with florets under
  it; nothing turns the head off.

So the raceme reaches "three florets on one node" and nothing else the spider
lily needs: not the count, not the top of the stem, not the junction, not a
headless stem. **What was built is exactly the missing part** — one new TYPE of
the existing inflorescence plan (`inflorescence: UMBEL`), never a second
inflorescence law: the plan, the floret build, the per-unit memo, the
placement, the pedicel's area rule, the reach inset and the approach measures
are all the raceme's own, asked on ONE node.

## 2. The controls

| control | values | default | what it is |
|---|---|---|---|
| `inflorescence` | NONE / RACEME / **UMBEL** | NONE | UMBEL is the third value |
| `umbelFlorets` | 2–12 | **6** | NEW — the umbel's own count (`floretNodes` is a raceme's node count and `floretPhyllotaxy` its arrangement; neither means anything on one evenly spread node, so they hide under UMBEL rather than being reused) |
| `umbelHead` | **OFF** / ON | **OFF** | NEW — the spider lily has no head |
| `pedicelLength`, `pedicelAngle` | unchanged | 20 mm, 35 deg | read as they are on a raceme |
| `floretPetals`, `floretScale`, `nodeVariance` | unchanged | | the floret's own |

`floretNodes`, `floretPhyllotaxy`, `pedicelCorymb` and `pedicelGradient` are
RACEME-only (`racemePresent`) — hidden and inert under UMBEL, by ONE predicate
in each file. With the head OFF the petal count (`petalCount`), the scope
toggles and every head-only control hide (`headPresent`); the PETAL SHAPE
controls stay, because they still define every floret through `floretState`,
and **the Petal section's own label says so**: `Petal — the head is off: these
shape the umbel's FLORETS` (a derived section label, the hood's mechanism).

## 3. The junction knot — derived, never typed

The pedicels root on a horizontal ring about the knot's centre, at the whorl
law's own evenly spread azimuths (`buildWhorlInto`'s RADIAL arm — no third
azimuth owner). Two lengths decide the ring, both from radii:

* **one printable gap between neighbours**: `ringRho = (rP + gap/2) / sin(pi/n)`
  — the case the gap is for is 90 deg, where every pedicel is VERTICAL and
  parallel to its neighbours along its whole length (exact tangency would share
  a line of vertices: measured on paper at n = 2);
* **with the head ON, one printable gap off the stem** that runs on past the
  knot to the head: `stemRho = outerR + rP + gap`. Measured before it was
  derived: 623 within-shell pairs on `UMBEL: 6 florets at 90 deg, head ON`, the
  six pedicels standing inside the stem wall above a 6 mm stem's knot. With the
  head OFF the stem ENDS at the knot and nothing runs beside the pedicels.

`rho = max(ringRho, stemRho)`, and the KNOT is the sphere of radius
`rho + rP + gap/2` about the ring's centre — half a printable gap past the least
sphere holding every pedicel's root disc, so every pedicel is rooted inside
solid by construction and its edge never lies ON the knot. The least sphere was
built first and is an exact tangency at each disc's outermost point, where the
two emitted surfaces can share a double and weld into one shell: measured, 749
within-shell pairs on `UMBEL: 6 florets at 90 deg, head ON`, every one at that
point; half a gap in, 0. `rP` is the raceme's own area rule read downward from
the ASKED count.

* **Head OFF**: the knot's centre is the stem's own TOP end (`topZ`); the stem
  ends there. The florist's cut stays on the FREE end, untouched (UM4).
* **Head ON**: the knot sits on the stem at the reach-inset law's depth (the
  florets' highest point one printable gap under the head's lowest material),
  floored at the raceme's own bottom bound.

Knot radii on a 6 mm stem, head OFF: n 2 — 5.243 mm, n 6 — 6.000 mm,
n 12 — 9.727 mm (the least sphere plus half a gap).

## 4. Budget, before building

The worst corner the controls reach — 12 florets x 12 petals x floret scale
1.00, head ON, on the 120 mm stem — was costed before the builder existed:
**1,381,266 export triangles, 92.1 % of the 1,500,000 budget** (one floret
build, twelve appends: O(1) in the count). It is a matrix row
(`UMBEL: SIZE CORNER`).

## 5. Reachability of the spider lily's own features on a floret

The floret is the head's own build through `floretState`, which pins only
what an inflorescence must pin (`PEDICEL_PINS`: the floret's own stem nodes and
cut, its own leaves, its own inflorescence). None of the three features is
pinned:

* **recurved narrow petals**: `petalSpineCurl` negative (−180 on the row) with
  `petalWidth` 8 — reaches every floret;
* **a buckled margin**: `buckleAmp` 0.4 / `buckleFreq` 5 — reaches every floret;
* **long upturned stamens**: `stamenCount` 6, `stamenLength` 70, `stamenCurl`
  60 — reaches every floret.

`UMBEL: THE SPIDER LILY` is the row that holds all three at once, head OFF.

## 6. Gates

* **UM0–UM4** (`umbelClauses`, both STL gates, every inflorescence row): UM0
  the head toggle's two statements (registry `headPresent`, geometry
  `umbelHeadIsAbsent`) both ways and the artefact; UM1 the knot RESTATED from
  the controls and the stem's radius against the EMITTED knot; UM2 every
  pedicel's emitted root disc inside the knot, at `i 2pi/n`, on the ring; UM3
  the knot on the stem's top end (OFF) or on the stem below the head (ON); UM4
  the cut on the free end.
* **The ID family** reads the umbel: ID1/ID2 count the knot's triangles and
  the umbel's one node; ID9 (e) the umbel's inset and (d) is not asked of a
  headless umbel (there is no head to clear); ID10's pair classes are the
  umbel's own (every pair on one node).
* **ST9** names every pedicel (the rod list) AND the knot (its own declared
  triangle range), never a region; a headless umbel has no sphere channel.
* Head-only families (form telemetry, J, ST4+, JS, JG, SP, Z, VS5, coverage,
  crowding) stand down on a headless build by the hub's own `absent` record —
  UM0 is what holds that record true.
* **Four mutants** in the apex table, each with a witness on the mutated
  module: the pedicel rooted off the junction, the head built while toggled off,
  a typed knot, the umbel on the cut end.
* **Panel route (ao)** (THIRTY-TWO routes): the umbel controls appear and the
  raceme's hide under UMBEL, the head-off label, two registry mutants.

## 6b. A pre-existing defect found on the way — the inflorescence read-outs

`bloom.js` hands every control's `fmt` a `shown` record of the build on screen,
and **on `main` that record never carried the inflorescence plan**. So the
`Type` read-out said *"a raceme — but there is no stem to carry it, so nothing
is built"* on EVERY raceme with a stem, the pedicel read-outs never quoted
their plan's numbers, and **the gradient cap's hatch on `pedicelGradient`
(build 3's ruling 2, "hatched on the control") was never drawn** — its `cap`
reads `shown.inflorescence.gradientMax`. Panel route (ao) found it (its
"the read-out says there is no head" clause read the stem line). Fixed by
adding `inflorescence` / `inflorescenceBuilt` to `shown`; read-out only, no
byte moves.

## 7. Declared, never clamped

* **The florets of one umbel overlap** — every row but the two-floret ones
  reads 0.0000 mm floret-to-floret (ID10 (d), `INFLO_APPROACH_XFAIL`, and the
  combination gate's `umbel-florets-x-angle`). There is no internode to move
  them apart; a real umbel's florets interleave. Declared by value.

## 8. Open for Eva

* The defaults: `umbelFlorets` 6 and `umbelHead` OFF ship as declared
  defaults; neither is a ruling on the numbers.
* The knot is a sphere; whether the junction should read as a sphere, a
  flattened boss, or flare into the stem is a look question.
* `pedicelAngle` keeps the raceme's range (−60..90); at −60 the florets reach
  the stem below the knot (declared).
