# Stem form — discovery

*Sep 28, 2026. Discovery only: no geometry, registry, harness or tool file changed; this
document is the whole diff. Base: `main` at `0993c6e`. Every line number below is on that
commit.*

**The sheet Eva rules from:** https://claude.ai/artifact/KnbwF7JMuVmcydgNwp48L4 (private).
Six rows: taper without and with leaves, nodes, five cross-sections end-on and at reading
distance, and the whole bloom on top.

Eva's ask: *the stem looks like an extruded cylinder, because that is what it is. Every
other part of this flower has had a look session; the stem has only ever had plumbing
sessions. What would it cost to make it read as a stem?*

---

## 0. The answer in five lines

1. **Taper first, and it is the cheapest of the four by a wide margin.** A linear frustum is
   exact with the two stations the placer already emits, so it costs **zero triangles**
   (476 stem triangles before and after, measured). It reads at every viewing distance on
   the sheet. It puts material where a stem held at its foot is loaded: at a 1.6 ratio the
   worst lateral stress falls to **x0.29**.
2. **Parameterise it from the TOP.** `stemDiameter` stays the diameter where the stem
   leaves the hub and the stem widens toward its free end. Then the join, the root band,
   the meridian packing and `headInsideBore` read an unchanged number, and the 3 mm floor
   can never bind. Naming the base instead makes the top thinner, makes the floor bind at a
   ratio of 1.67 on a 5 mm stem, and raises stress at the join by x3.3.
3. **Curvature second, nodes third.** Nodes need a station pitch law. Curvature also needs
   one, and a node should be a *demand* on that placer (session 38's
   "the ladder accepts a demand" pattern), not a second placer built beforehand.
4. **Cross-section last, if ever.** It is the most expensive (about two sessions), it
   breaks the shipped end-cap construction on every non-convex outline, and **at reading
   distance it is close to invisible on a 5 mm stem** (sheet row 5).
5. **The ordering question.** Neither taper nor nodes has to be redone after curvature,
   provided both are written as a radius function of **arc length** from the hub, which is
   already the placer's own argument. What curvature redoes is taper's *distance-to-cone*
   work (it becomes distance to a swept tube) and ST9's restatement. The cross-section is
   the one that must be written in the tube's **local frame** from the start, or it has to
   be redone.

Your order was taper, nodes, section, curvature. Measurement agrees on taper first and
section last. It disagrees on one point: put curvature ahead of nodes.

---

## 1. What the stem is today

* **One owner, `stemPlan`** (`bloom-geometry.js:11349`). It holds the outer and bore radii,
  `topZ` / `rootZ` / `tipZ`, the join thickness, the solid root band (`headInsideBore`,
  `:11543`), the tip plug (`:11609`), and the station list `stemStations(lengthMm)`, which
  returns `[0, lengthMm]` (`:11328`).
* **One builder, `buildStemInto`** (`:11890`). `ringAt(rad, z)` (`:11903`) emits a circle of
  `HUB_SECTORS = 48` (`:11332`) about the world z axis. There is one outer band, one inner
  band over the void's own length, and `endFace` (`:11955`) closes each end with **rim
  fans** (`:11963`, and the no-void arm's caps at `:12051`). Rim fans are deliberate. A
  centre fan at `topZ` puts a vertex on the hub's own apex and the two shells weld (528
  within-shell pairs, measured in session 43).
* **Eva's bore rule** is `stemBoreRadius(outerR) = max(0, outerR − 1.5)` (`:11168`). It is
  solid at the 3 mm floor and hollow above it.
* **The join is derived from the stem's section modulus.** `stemJoinThickness(outerR, hubT)`
  (`:11200`), `stemJoinBlendRadius` (`:11210`), and the styled profile
  `hubJoinThicknessAt` (`:11297`), read by `buildHubInto` (`:12613`).
* **Readers of the stem's radius outside the stem.** `freeStemDistanceMm` (`:11688`, a
  cylinder by `hypot − outerR`) is read by `stemOmission` (`:11743`), the inflorescence's
  rachis approach (`:13781`) and the combination gate's `leaf-stem` measure.
  `meridianPacking` (`:11826`, the stem's footprint on a sphere). `rodWallRootMm` /
  `rodWallEmbedMm` / `rodWallCrossingMm` (`:12253–12262`) are read by the leaf petiole
  (`leafPlan`, `:12294`; its clearance `:12331`) and by the pedicel (`:13617`). The
  pedicel's own radius comes from the area rule on `stem.outerR` (`:13548`).
* **The pedicel IS the floret's stem.** `floretState` (`:13650`) spreads the whole state and
  overrides only `stemLength` and `stemDiameter`, so **any new stem control reaches every
  pedicel unless `floretState` pins it**. That is a ruling each candidate below owes.
* **Assertions.** `stemAssertions` (`tools/bloom-harness.mjs:5602`) runs ST0–ST6, ST10 and
  ST11. ST7 and ST8 are the channel's. `stemChannelAssertions` (`:7346`) is ST9 and reads
  the exported file. LF3 (`:6326`) checks the petiole's crossing of the wall.

---

## 2. Taper

### 2a. Parameterisation, and why the top

| | stemDiameter names the **top** (recommended) | stemDiameter names the **base** |
|---|---|---|
| join, blend radius, `hubJoinThicknessAt` | read the same `outerR`, **unchanged** | read a thinner top; the join thins with it |
| root band, `headInsideBore`, meridian packing, `stemOmission` near the pole | unchanged inputs | all move |
| 3 mm floor | **cannot bind** (the stem only widens) | binds at ratio 5/3 on a 5 mm stem and 2.0 on 6 mm |
| sphere channel below the pole | the widening cone can reach petals (§2d) | the cone narrows toward the head |

### 2b. The bore: three readings, measured

Setup: a 100 mm stem, 5 mm at the hub, linear in arc length. Stress uses a lateral-load
model with the stem lying horizontal. "Held at the foot" is the head's weight as a tip load
plus the stem's own weight; the head is the default bloom's shell volume, **4,225 mm³**,
against the stem's **1,654 mm³**. "Held by the head" is the stem's own weight cantilevered
from the join. These are ratios to the shipped cylinder, not strengths. Nothing here has
been printed.

| top 5 mm | base | bore top / base (Ø) | mass | worst stress, held at foot | stress at join, held by head |
|---|---|---|---|---|---|
| cylinder (shipped) | 5.0 | 2.0 / 2.0 | x1.00 | x1.00, at the foot | x1.00 |
| 1.3, **bore follows** | 6.5 | 2.0 / 3.5 | x1.21 | x0.50 | x1.29 |
| 1.6, **bore follows** | 8.0 | 2.0 / 5.0 | x1.43 | x0.29 | x1.57 |
| 2.0, **bore follows** | 10.0 | 2.0 / 7.0 | x1.71 | x0.17 | x1.95 |
| 1.3, bore constant | 6.5 | 2.0 / 2.0 | x1.39 | x0.47 | x1.53 |
| 1.6, bore constant | 8.0 | 2.0 / 2.0 | x1.86 | x0.26 | x2.17 |
| 2.0, bore constant | 10.0 | 2.0 / 2.0 | x2.59 | x0.14 (moves up to s/L 0.76) | x3.18 |
| 1.6, **names the base**, bore follows | 5.0 (top 3.1) | 0.1 / 2.0 | x0.73 | x0.94 | x3.28 |
| 2.0, names the base, bore follows | 5.0 (top 3.0, floor) | 0.0 / 2.0 | x0.71 | x0.94 | x3.65 |

At 6 mm the pattern is the same: at 1.6, bore follows gives mass x1.40, x0.31 at the foot
and x1.53 at the join.

* **Recommended: the bore follows the outside.** This is Eva's rule
  `bore = max(0, r − 1.5)` applied at every station, so it needs no new ruling. The wall is
  1.5 mm everywhere it is hollow. It is the lightest of the top-anchored options, and it is
  still a frustum, exact with two rings. A void whose two end radii differ changes nothing
  about `endFace`.
* **Bore constant** (the wall thickens toward the base) is structurally strongest and
  heaviest. At 2.0 it makes the stem weigh about as much as the whole head.
* **The wall floor binds only in one place.** Top-anchored, it never binds: the top is the
  thinnest section and already obeys the 3 mm floor. Base-anchored with the bore
  following, the top reaches the floor and the bore **closes to a point at the root**
  (5 mm at ratio ≥ 1.67, 6 mm at 2.0). The void then becomes a cone with an apex exactly
  at the join. That is a degenerate apex and a new continuous-quantity knife edge (where
  does a void "start"?). It is avoidable by not anchoring at the base.
* **Where the bending moment is worst.** On the shipped cylinder, a stem held at its foot is
  worst at the foot, with the least material relative to its load. A top-anchored taper
  moves material exactly there. The trade is a heavier stem, so the handling case (picking
  the flower up by its head) loads the join harder. The join's thickness is derived from the
  top section, which does not change, so the **join's stress rises by the mass ratio**:
  x1.57 at 1.6. That is the one print cost to take to the coupon, and the join is derived,
  so no control moves it.

### 2c. What it touches

* **Functions.** `stemPlan` (a base radius field and a radius-at-arc-length owner),
  `buildStemInto` (the outer and inner rings take a per-station radius), `freeStemDistanceMm`
  (distance to a frustum rather than a cylinder), and through it `stemOmission`, the rachis
  approach, and the combination gate's `leaf-stem` measure. The petiole and pedicel root
  must read the radius **at their node** (`rodWallRootMm` / `rodWallEmbedMm` /
  `rodWallCrossingMm` / `leafPlan`'s clearance). `floretState` needs a pin or a ruling. The
  join, root band, tip plug length, meridian packing and `buildHubInto` are **unchanged**
  under top anchoring.
* **Assertions.**
  * **ST3 is restated.** Its `emittedMaxR === R` becomes "widest emitted vertex at the base
    radius, narrowest at the top bore".
  * **ST9 breaks and must be rewritten.** It locates the stem by the three z-levels of
    vertices at exactly `outerR`, and a frustum has vertices at `outerR` only at the top.
  * **ST10's closed-form bottom area** reads the base radius.
  * **ST1 and ST2 are unchanged** (two stations, the same count).
  * **LF3** reads the wall at the node.
  * **New: ST12**, the emitted ring radii against the taper law, restated in the gate from
    the control, never read from the plan. It carries a mutant set: taper ignored, taper
    inverted, bore constant where the law says it follows.
* **Default byte identity, by branch.** The control's identity value (ratio 1) takes the
  verbatim `ringAt(R, z)` path. That is the #271/#273 null-default shape, not an argument
  that `R * (1 + 0 * s)` rounds to `R`. The partition is predeclared from the builder's own
  record: a row moves if and only if it builds a taper. **Check `ALL MAX` first.** A new
  slider gated on `stemPresent` is hidden at the defaults, so the `STEM_SUB_IDS` derivation
  should keep it out of block 1 and `ALL MAX` a holder. Measure that rather than assume it.
* **Owed:** a byte partition, a matrix block and a smoke block (so a frozen phase is owed),
  and one combination-gate pair: taper x `leafAngle` on `leaf-stem`, because a widening stem
  closes on a steep leaf's blade. **One session.**

### 2d. The sphere channel is the one place taper changes topology

On a SPHERE head the blades radiate toward the far pole, which is where the stem leaves.
Nearest approach of any petal vertex to the free stem, measured on this tree with the
taper modelled as a frustum, export mode:

| row | 1.0 | 1.3 | 1.6 | 2.0 | 3.0 |
|---|---|---|---|---|---|
| default sphere, 60 x 6 | 4.641 | 4.641 | 4.641 | 4.641 | 4.641 |
| sphere, 40 petals, 60 x 6 | 1.132 | **0.757** | **0.383** | **0.000** | 0.000 |
| sphere, 40 x 6 turns | 1.399 | 1.094 | **0.788** | **0.382** | 0.000 |
| sphere, 60 x 12 | 1.675 | 1.672 | 1.668 | 1.661 | 0.000 |
| CAP default, 100 x 5 (control) | 2.970 | 2.970 | 2.970 | 2.970 | 2.970 |

Bold is under the 1.0 mm clearance. On dense spheres the omission mask must therefore read
the frustum, and it will omit more petals as the taper rises. That is a topology change on
exactly the rows the channel exists for, and it is why `freeStemDistanceMm` is in scope and
not optional. The union over both modes stays the right construction.

---

## 3. Nodes

* **The law.** A swelling on the outer wall at each leaf node's depth: `r(s) = r_taper(s) ·
  (1 + a · Σ exp(−((s − s_k)/w)²))`, with `w` about 1.2x the top radius. The heights already
  have one owner, `leafNodeDepthsMm` (`:12273`), and it does **not** depend on the stem's
  radius. So `stemPlan` can read the node depths without a cycle; `leafPlan` then reads the
  node radius back.
* **Triangles, and this is the whole cost.** The profile needs stations. The prototype used
  13 a node: **476 → 4,220 stem triangles for three nodes**. Per node, 9 stations cost 864
  and 13 cost 1,248. At the 8-node maximum that is +6,912 to +9,984. This would be the first
  stem whose triangle count depends on a control, and it owes the **pitch law curvature also
  owes** (`stemStations`' own header says so).
* **The petiole root law survives, and one term has to move.** A node only adds material
  outside a bore that does not change, so the root at the wall's mid-thickness stays
  embedded and gets more embedded. What has to change is the petiole's **clearance**
  (`leafPlan`, `:12331`): it reads `stem.outerR`. At the default 40 mm leaf the
  `0.12 x length` term wins (4.8 mm against a 2.75 mm clearance) and nothing shows. On a
  short leaf, where the clearance governs, a node of 0.5x the radius leaves the blade's base
  inside the swelling by **1.25 mm**. So the clearance must read the node radius.
* **Nodes exist only with leaves.** On the rachis, `floretState` pins `leafLength: 0`, so
  pedicels get no nodes by construction. Whether a floret node should swell the rachis is a
  separate question for Eva.
* **A pre-existing finding this inherits (not a node defect).** The leaf node **count** is
  already mode-dependent. The pitch floor is `2 x petioleR`, which is `floorThickness`, so
  it is 0.6 mm live and 1.0 mm in export on a thin sheet. Swept over 12,960 states (sheet
  0.6 / 0.8 / 1.2, stem 1–120 mm, 2 / 4 / 8 nodes, three leaf lengths, four angles), live
  and export **disagree on 225**: 142 at sheet 0.6 and 83 at 0.8, on stems up to 77 mm, and
  never at 1.2. The count of leaves (topology) already differs between the two modes there.
  Nodes would carry the same disagreement into the **stem's** triangle count. A node
  session should fix the owner first: take the pitch floor mode-free, the way session 42
  took the lamina. This document does not change it.
* **Assertions.** ST1's prediction is already stated over the plan's station list, so it
  generalises. ST3's max radius becomes the node radius. ST9's three-level location breaks
  (every band adds rings). LF3 reads the node wall. New: the swelling sits at the declared
  depths, with the depth restated from the leaf controls rather than read off the plan.
* **Default byte identity, by branch.** A node amount of 0 takes `stemStations` verbatim.
* **Owed:** a byte partition (only rows with leaves and the control on move), a block, a
  smoke block, a frozen phase, and the mode question above. **One session after curvature
  (a demand on its placer); about 1.5 before it (its own pitch law, later merged).**

---

## 4. Cross-section

Five sections at a 2.5 mm circumradius, measured on the 48-sample outline the stem already
emits. The bore is Eva's rule applied to the **inscribed** radius, so the thinnest wall is
exactly 1.5 mm. That application is itself a new reading of her rule and needs her ruling.

| section | r_min (mm) | bore Ø (round: 2.00) | area | weakest-axis section modulus |
|---|---|---|---|---|
| round | 2.50 | 2.00 | x1.00 | x1.00 |
| 6 ribs | 2.20 | 1.40 | x0.96 | x0.80 |
| 8 flutes | 2.15 | 1.30 | x1.04 | x0.91 |
| hexagon | 2.17 | 1.33 | x0.90 | x0.70 |
| square | 1.77 | 0.54 | x0.74 | **x0.44** |

At a 6 mm radius flutes come out stiffer than round (x1.10), because the smaller bore more
than pays for the grooves.

* **What it breaks.**
  * **The end caps.** The shipped rim fans (`:11963`, `:12051`) are only valid on a convex
    outline, and a fluted or ribbed outline is not convex. A centre fan works at the tip,
    which is what the sheet uses, but it is **forbidden at the top**, where it welds to the
    hub's apex. The top face needs ear clipping or an offset centre.
  * **The join.** `stemJoinThickness` equates a *round* section's modulus with the plate's,
    so the join's derivation must be restated for the section, and ST5/ST11 with it.
  * **The petiole and pedicel roots** sit at an azimuth, and the wall under them now depends
    on it. `leafAzimuths` against the flute phase is a real coupling: does a leaf sit on a
    rib or in a groove?
  * **ST3** (min/max radii) and ST10's bottom area are restated.
  * `freeStemDistanceMm` can stay a circumscribed cylinder, which is conservative.
* **Sampling bound.** The stem shares the hub's 48 sectors. Six ribs get 8 samples a period
  and eight flutes get 6; **twelve flutes would get 4**, which is undersampled. More
  features means more sectors, and that makes triangle count depend on a control.
* **What it reads as.** Sheet row 4 (end-on) makes every section legible. Row 5, the same
  stems at the framing a person sees the flower in, makes them **nearly indistinguishable**
  on a 5 mm stem. The sheet is the evidence.
* **Under curvature** the flute phase must ride the tube's parallel-transport frame. A
  section written against world azimuth, as `ringAt` is today, is exactly what curvature
  replaces. So write it in the local frame from the start: on a straight stem that frame IS
  the world frame, so it costs nothing now.
* **Default byte identity:** by branch on a ROUND value. **About two sessions** (the cap
  triangulation, the join's section modulus, the bore ruling, the root coupling, ST3/ST9/
  ST10), plus a partition, a block, a smoke block and a frozen phase.

---

## 5. Curvature, and the ordering question

Curvature is costed in `docs/bloom-bell-corolla-discovery.md` Q5 as **one session** for the
centreline, its pitch law and the restated families. `docs/bloom-state-of-play.md` §11b
item 3 lists the same paths. Not re-costed here. What matters is what each candidate costs
if curvature lands later.

| candidate | written as | redone after curvature? | thrown away |
|---|---|---|---|
| taper | `r(s)`, s = arc length from the hub (the placer's own argument) | **no**: the ring becomes `frame(s)` applied to a circle of `r(s)` | its frustum distance (becomes a swept-tube distance) and its ST9 restatement |
| nodes | `r(s)` plus stations | **no for the law.** Its station list becomes a *demand* on curvature's placer | a standalone pitch law, if built first |
| section | `r(θ)` | **yes, unless θ is local-frame from day one** | world-azimuth flute phase; leaf-vs-flute phase |
| curvature | — | — | — |

The one hazard `buildLeafInto` already records carries over. The flower kinks its stem at
`k · GOLDEN_ANGLE` while its leaves flip 180° (`:12223`, "NOTE FOR WHOEVER ADDS STEM
CURVATURE"). A node session run after curvature must read the leaf azimuth in the same local
frame as the bend.

**Recommended order: taper → curvature → nodes → (section).** Taper first costs curvature
nothing: the frustum distance is small work, and curvature rewrites that function anyway.

---

## 6. Summary table

| | taper | nodes | section | curvature |
|---|---|---|---|---|
| sessions | **1** | 1 after curvature, ~1.5 before | ~2 | 1 (Q5) |
| stem triangles | **+0** | +864 to +1,248 a node | +0 (at ≤ 48 sectors) | per its pitch law |
| default identity | branch | branch | branch | branch |
| new ST family | ST12 (radius law) | node placement | section law | frame/pitch |
| ST restated | ST3, ST9, ST10, LF3 | ST3, ST9, LF3 | ST3, ST5, ST10, ST11 | ST2, ST9, LF3, LF5 |
| topology moves | sphere omission set (§2d) | stem tris with leaves | none | leaf nodes in arc length |
| reads at distance (sheet) | **yes** | yes, at 0.35+ | **barely** | yes |
| print | foot stress x0.29, join x1.57 at 1.6 | adds material only | square x0.44, ribs x0.80 | a crook under ~5 mm radius wants solid |

---

## 7. How this was measured, and what it cannot tell

* **The prototype is the shipped builder, not a re-implementation.** A scratch copy of
  `bloom-geometry.js` (outside the repository) with one hook: `buildStemInto`'s outer rings
  take an optional `r(s, θ)` and an optional station list, and a bore override. With the
  hook unset the copy was checked **bit-identical to `main` on 8 builds** (four states x
  both modes, `Object.is` over every float, 0 differences). The sheet's cells are that
  builder plus the hook.
* **The stress model** is Euler–Bernoulli on round tubes in two load cases, with one
  density throughout, so only ratios are reported. It ignores leaf mass, stress
  concentration at the join's shoulder, and anything a printer does. Nothing in this project
  has been printed, and the 1.5 mm wall is Eva's stated requirement, not a measured one.
* **The sphere-channel table** measures petal vertices from the build, so it is the
  artefact. It does not rebuild the omission mask; how many *more* petals a taper would
  omit is the taper session's measurement.
* **Not measured:** a nonlinear taper profile (needs stations, so it has node-like cost),
  the combination-gate cells, and anything about the hub-to-stem join's appearance under a
  wider stem below it.
* **The scratch tool is not committed** (the brief asked for one file). The patch is small
  enough to restate: in a copy of the geometry, replace `ringAt(R, z)` for the outer rings
  with a sample of `r(rootZ − z, θ)`, let `zs` take an injected station list, let `b` take an
  injected bore, and record `acc.triangleCount` around `buildHubInto` and `buildStemInto`.

---

## 8. For Eva

The one decision that unblocks the first session: **does taper keep `stemDiameter` as the
diameter at the hub (recommended), with the bore following your 1.5 mm rule at every
station?** Also, from the sheet: **which ratio reads as a stem**? The sheet shows 1.3, 1.6
and 2.0.

Later, not needed now: whether nodes should swell the rachis at floret nodes; whether a
section, if ever built, applies your bore rule to the inscribed radius; whether taper
reaches pedicels (they are the floret's own stems).
