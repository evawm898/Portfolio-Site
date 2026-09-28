# Stem taper laws — discovery

*Sep 28, 2026. Discovery only: this document is the whole diff. No geometry, registry,
harness or tool file changed. Base: `main` at `edbf410`. Follow-up to
`docs/bloom-stem-form-discovery.md` (#296, `2a6ce59`), whose measurements stand and are
not re-derived here; where this session's instrument re-measures one of them it says so,
and every such figure reproduces.*

**The sheet Eva rules from:** https://claude.ai/artifact/UiPRAmouwdpb3e3s1f9tNZ (private).
Four rows of the default bloom on a 100 mm stem, 6 mm across at the flower, one camera
throughout: every law at one end ratio, the same with leaves, every law at matched visual
weight, and node swellings against taper.

## What was settled before this session, and is not reopened

Eva ruled two things after #296's sheet:

- `stemDiameter` means the diameter **at the flower**. The stem widens toward its free end,
  and the bore follows her 1.5 mm wall rule at every point (`bore = max(0, r(s) − 1.5)`).
- The taper ships **off**: ratio 1.0 is the default and is byte-identical, opt-in only.

None of #296's three linear ratios (1.3, 1.6, 2.0) read as a stem to her. The open
question is the **law**, not the amount. The hypothesis under test: a linear taper is a
cone, a constant slope reads as machined, and real stems stay near-parallel along most of
their length with the widening concentrated low down.

---

## 0. The answer in six lines

1. **Every non-linear law moves the widening low, and at the same end ratio they read as a
   straight stem with a foot rather than as a cone** (sheet row 1). Power 3, power 5 and
   the three flares look like that. Power 2 and the concave law still read as a cone.
2. **They are lighter, and that is the catch.** At one end ratio a flare adds 4–7% of the
   cylinder's mass where linear adds 40%. To carry linear 1.6's side silhouette a flare
   needs a base **4.6 to 7 times** the top and turns into a candlestick (row 3). Power 3
   (k 2.2) and power 5 (k 2.8) are the heaviest laws that still read as a stem.
3. **Laws that stay parallel near the flower keep the sphere channel clear.** The flares
   never move the nearest-petal distance at any ratio up to 3.0. Power 5 holds the 1.0 mm
   clearance to 3.0 on the 40-petal sphere and power 3 to 1.6. #296's clearance finding is
   a property of the linear law, not of taper.
4. **The cost is stations, and it is small.** 4 to 8 stations at a 0.02 mm radial
   tolerance on the default stem, +480 to +1,152 stem triangles, from a 476-triangle stem
   on a 26,796-triangle bloom. No law is exact on the two shipped stations except linear.
5. **The flares buy almost no strength.** Held at its foot, the worst stress on a flared
   stem falls only to ×0.73–0.83 of the cylinder's, because the parallel shaft still
   carries the moment and the worst section moves up to the knee. Power 3 reaches ×0.40.
6. **Silhouette may not be the main lever.** Node swellings at the leaf heights change the
   whole visible length of the stem; every taper changes its last few centimetres (row 4).
   Whether nodes do more work than any profile is a reading of the sheet, and it is Eva's.
   If they do, the plan's order changes (§5).

---

## 1. The laws

Every law is `r(s) = R · (1 + (k − 1) · g(s/L))`, with `s` the arc length from the hub's
underside (the placer's own argument, per #296 §5), `R` the radius at the flower and `k`
the base-to-top ratio. Every `g` has `g(0) = 0` and `g(1) = 1`, so **every law ends at the
same base for a given k**. That is how the end-to-end width change is held constant across
laws: exactly, not approximately.

| law | `g(t)` | leaves the hub |
|---|---|---|
| linear (control) | `t` | at the full slope `(k−1)R/L` |
| power 2 / 3 / 5 | `t^2`, `t^3`, `t^5` | parallel (slope 0) |
| flare 85 / 80 / 75 | `0` to the knee, then `((t − h)/(1 − h))^2` with `h` = 0.85 / 0.80 / 0.75 | parallel, exactly, to the knee; C1 at the knee |
| concave | `t − 0.12 sin(πt)` | at 62% of linear's slope; the cone with its middle pulled in by 12% of the widening |

The concave law is the only one that starts widening straight away. It is the cone
hollowed slightly, which is closer to a column's profile than a stem's. The prompt's
"entasis" is strictly a convex bulge; the convex version was not rendered, because it puts
more material higher up, which is the opposite of the hypothesis.

## 2. What each law costs

Measured with the shipped builder plus one hook (§7). 100 mm × 6 mm stem, k 1.6,
**0.02 mm** maximum radial departure between the ring ladder and the true profile.

| law | stations | stem tris (export = live) | Δ vs cylinder |
|---|---|---|---|
| cylinder (shipped) | 2 | 476 | — |
| linear | 2 | 572 | +96 |
| power 2 | 6 | 1,340 | +864 |
| power 3 | 7 | 1,532 | +1,056 |
| power 5 | 8 | 1,628 | +1,152 |
| flare 85 / 80 / 75 | 7 | 1,436 | +960 |
| concave | 4 | 956 | +480 |

- **Every station costs 192 triangles** because the bore follows the outside: one outer
  ring and one bore ring, 96 each.
- **Linear is not quite zero, and this corrects #296's "476 before and after".** The void
  runs up through the hub-to-stem join to the top face (the open top of the bore). Above
  the underside the stem is the join's own cylinder, so its bore is constant there; below
  the underside it tapers. The bore ladder therefore needs a ring **at the underside**:
  +96 triangles. #296's zero holds for the outer wall, which already carries a ring at the
  underside, and would hold for a bore that did not follow the outside exactly there.
- **The station count does not depend on the stem's length.** Curvature scales as
  `(k−1)R/L²` and the stations needed scale as `L·√(curvature/ε)`, so `L` cancels. It grows
  with the top radius and the ratio. At the widest stem (12 mm) the counts are 7–13 at
  k 2.0 and 9–17 at k 3.0 (0.02 mm), and at most 24 at 0.01 mm, which is +4,224 triangles.
- **Every law needs its own station placer; only linear is exact on two stations.** The
  placer used here is greedy in millimetres of arc against a radial tolerance. It is a
  function of the profile alone, so it is the same in both modes. It is the pitch law
  curvature also owes (#296 §3, §5), so the station placer should be built once and serve
  both.
- **Validity, checked on every law at k 1.6:** the stem shell reads 0 boundary edges and
  0 directed-edge mismatches, and live and export stem triangle counts are equal.

## 3. Mass, stress and matched visual weight

Same load model as #296 §2b (Euler–Bernoulli on round tubes, one density, ratios to the
shipped cylinder, head volume 4,225 mm³). **Calibrated:** at a 5 mm top this model gives
#296's linear figures exactly: mass ×1.21 / ×1.43 / ×1.71, foot stress ×0.50 / ×0.29 /
×0.17, join ×1.29 / ×1.57 / ×1.95 at k 1.3 / 1.6 / 2.0.

6 mm top, 100 mm, k 1.6:

| law | mass | side area | held at foot: worst stress (where) | at the join, held by the head |
|---|---|---|---|---|
| linear | ×1.40 | ×1.30 | ×0.31 (at the foot) | ×1.53 |
| power 2 | ×1.27 | ×1.20 | ×0.33 (70% down) | ×1.40 |
| power 3 | ×1.20 | ×1.15 | ×0.40 (66% down) | ×1.32 |
| power 5 | ×1.13 | ×1.10 | ×0.51 (69% down) | ×1.23 |
| flare 85 | ×1.04 | ×1.03 | ×0.83 (86% down, the knee) | ×1.08 |
| flare 80 | ×1.05 | ×1.04 | ×0.78 (82% down) | ×1.10 |
| flare 75 | ×1.07 | ×1.05 | ×0.73 (78% down) | ×1.12 |
| concave | ×1.34 | ×1.25 | ×0.31 (at the foot) | ×1.47 |

- **The worst section moves up the stem** for every non-linear law, to where the shaft is
  still thin and the moment is already large. A flare strengthens only below its knee.
- **The join's handling stress rises by the mass ratio**, as #296 found for linear, so the
  lighter laws cost the join less (×1.08–1.12 for the flares against ×1.53).
- **Matched visual weight.** The ratio each law needs to carry linear 1.6's side
  silhouette area: power 2 **1.90**, power 3 **2.20**, power 5 **2.80**, flare 85
  **7.00**, flare 80 **5.50**, flare 75 **4.60**, concave **1.71**. Row 3 renders each at
  that ratio. **This is where the end ratio could not be held equal**: holding both the end
  ratio and the weight equal is impossible across laws, so row 1 holds the ratio and row 3
  holds the weight. At matched weight the flares are a candlestick base, not a stem.

## 4. The sphere channel

Nearest approach of any petal vertex to the free stem solid, export mode, the omission
mask unchanged (as #296 measured). The stem solid is the profile of revolution, measured
exactly in the meridian plane. **Calibrated:** the linear column reproduces #296 §2d on
every row to three decimals (1.132 / 0.757 / 0.383 / 0.000; 1.399 / 1.094 / 0.788 / 0.382;
1.675 → 0.000 at 3.0; 4.641; 2.970).

| law | 40 petals · 1.3 | 1.6 | 2.0 | 3.0 | 40 × 6 turns · 1.3 | 1.6 | 2.0 | 3.0 |
|---|---|---|---|---|---|---|---|---|
| linear | **0.757** | **0.383** | **0.000** | **0.000** | 1.094 | **0.788** | **0.382** | **0.000** |
| power 2 | **0.976** | **0.820** | **0.612** | **0.094** | 1.295 | 1.192 | 1.054 | **0.708** |
| power 3 | 1.067 | 1.002 | **0.916** | **0.699** | 1.364 | 1.329 | 1.282 | 1.165 |
| power 5 | 1.120 | 1.109 | 1.094 | 1.057 | 1.395 | 1.391 | 1.385 | 1.372 |
| flare 85 / 80 / 75 | 1.132 | 1.132 | 1.132 | 1.132 | 1.399 | 1.399 | 1.399 | 1.399 |
| concave | **0.861** | **0.591** | **0.231** | **0.000** | 1.188 | **0.977** | **0.696** | **0.000** |

Bold is under the 1.0 mm clearance. The default sphere (4.641 mm) and the CAP control
(2.970 mm) do not move under any law at any ratio. On the 12 mm stem only linear (0.000 at
3.0) and concave (0.653 at 3.0) cross.

**The finding:** the petals that reach toward the stem on a dense sphere do so in the upper
three quarters of the stem, so a law that stays parallel there never changes the channel's
answer, and the omission set does not change. For linear and concave laws the widening stem
closes on those petals and the omission mask must read the profile (#296 §2d's
consequence). For the flares it provably changes nothing on these rows up to k 3.0; power 5
nearly nothing. `freeStemDistanceMm` still has to become a distance to the profiled stem
for any law, because a correct function is owed whether or not it moves this table.

## 5. Nodes, and whether silhouette is the lever

Row 4 renders, all with the same three 40 mm leaves at alternate nodes: the cylinder; the
cylinder with node swellings of amplitude 0.35 and 0.60 (#296 §3's law,
`r·(1 + a·Σ exp(−((s − s_k)/w)²))`, `w` = 1.2 × the top radius, at the leaf plan's own node
depths); power 3 and flare 80 at k 1.6 with no nodes; and power 3 with nodes at 0.35.

Measured on the profile, not judged from the picture:

- **Where each changes the stem's width by more than 5%** of the cylinder's: linear over
  the lower 92% of its length, power 3 over the lower 56%, flare 80 over the lower 14%.
  Nodes at 0.35 change it over about 10 mm at each of three nodes, spread over the leaf
  zone, and by up to 35% (6.0 → 8.1 mm) at each node.
- **With leaves on, the leaves hide most of the upper stem**, so the part of the stem that
  a taper changes and the part the eye reads are mostly the lower third.
- **Cost.** Nodes at 0.35 on three nodes take the stem from 476 to **6,332 triangles** with
  the bore following the outside through each swelling (as rendered), about 5.5× any taper
  law. With the bore held constant under a node (#296's reading: a node only adds material
  outside), each station costs one ring instead of two and the cost roughly halves.

What the sheet cannot say for Eva: whether the knuckled stem in row 4 reads more like a
stem than the tapered ones. **If it does, the order should change**: nodes carry the look
and a taper becomes a small addition to them. Nodes owe the station placer (and #296's
mode-dependent node-count finding must be fixed first), and curvature owes the same placer,
so the order would become **curvature → nodes → taper**, with the placer built once in the
curvature session. If the tapers read better, #296's order holds: **taper → curvature →
nodes**, except that a non-linear taper now owes a station placer too, so it no longer
comes free of the curvature session's pitch work.

## 6. What changes for the build

For any non-linear law, over and above #296 §2c:

- **A station placer is owed in the taper session**, in millimetres of arc against a
  radial tolerance, a function of the profile alone (mode-free). Linear alone would not
  need it.
- **The bore ladder reads the same stations as the outer tube**, plus the underside ring
  (§2). The void's own `stemStations(voidMm)` call no longer describes the void.
- **`freeStemDistanceMm` becomes a distance to a surface of revolution.** The meridian-plane
  polygon distance used here is exact to the sampling of the profile and cheap enough for
  the omission mask (the 240-foot sphere row, 2 M petal vertices, ran in the same pass as the rest).
- **A new knife edge at the 3 mm floor, for top-anchored taper too.** At `stemDiameter` 3
  the top is solid (`bore = 0`), and with the bore following the outside the stem becomes
  hollow wherever `r(s) > 1.5`, which is everywhere below the flower. The void would start
  at a point, which is the degenerate apex #296 found only for base anchoring. The simplest
  rule is to decide solidity from the top radius (a stem solid at the flower stays solid);
  it needs Eva's reading of her rule, and it is the only slider value that reaches it
  (`stemDiameter` steps by 0.5 from 3).
- **Assertions**: #296's list stands (ST3, ST9, ST10, LF3 restated; ST12 new), with ST12
  restating the law's `g` in the gate and the station tolerance restated as a bound on the
  emitted rings, never read from the plan.
- **Leaves**: the petiole root, embed and clearance read the radius **at the node**. The
  prototype does this and the leaves in row 2 sit correctly on every law.

## 7. How this was measured, and what it cannot tell

- **The builder is the shipped one.** A scratch copy of `bloom-geometry.js` outside the
  repository takes one hook: an optional `r(s)` and station list for `buildStemInto`'s
  outer rings, the bore at `r(s) − 1.5` on a ladder over the same stations, and the leaf's
  wall read at its node. With the hook unset the copy was checked bit-identical to `main`
  on 8 builds (four states × both modes, 3,584,592 floats, `Object.is`, 0 differing).
- **The renders** are the soft rasteriser (`tools/bloom-soft-render.mjs`), deterministic,
  so no pixel delta is quoted and none is owed. Every cell is the default bloom, LIVE mode,
  one camera, 3.5 px per mm at the stem.
- **Not measured:** the combination-gate cells (a taper × `leafAngle` pair still owes one,
  #296 §2c), the omission set a taper would produce (this table measures the distance with
  the shipped mask, as #296 did), the stress concentration at a flare's knee, and anything
  printed. Nothing in this project has been printed.
- **The laws' constants are choices for the sheet, not proposals**: the exponents 2/3/5,
  the knees at 75/80/85%, the concave law's 12%, and the 0.02 mm station tolerance. A ruling
  on a family picks its own constant.

## 8. For Eva

**Which law reads as a stem: a power law (rows 1–3), a base flare, or none of them — and
does row 4 say the stem needs nodes more than a taper?** The first answer picks the law
and its constant; the second decides whether taper or nodes goes first.
