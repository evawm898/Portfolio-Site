# The flower's stem, read from source, against the bloom's

*Sep 28, 2026. Discovery only: this document is the whole diff. No geometry, registry,
harness or tool file changed. Base: `main` at `38a4893`. Every `flower.js` line number
below is on that commit. Follows `docs/bloom-stem-form-discovery.md` (#296) and
`docs/bloom-stem-taper-laws.md` (#298); their measurements stand and are not re-derived.*

**The sheet:** https://claude.ai/artifact/Qfggw2DfeovRL59awmPdPq (private). Five rows at one length (100 mm), one camera per row,
the first cell being the flower's own stem at node prominence 0.00 against 0.48.

Why this session exists: Eva liked none of #298's taper laws, then pointed at the flower's
stem and said it looks right, and that she likes how its node blends.

---

## 0. The answer

**The bloom's stem problem is a node-and-straightness problem, not a taper problem. Taper
was the wrong lever for #296 and #298.** Four measurements say so:

1. **The flower's taper runs the other way.** It is linear, thick at the flower and thin
   at the free end (0.45 : 1). Both earlier sessions built stems that widen toward the free
   end, following Eva's #296 ruling. The stem she now likes does the opposite.
2. **At prominence 0 the flower's stem already has that 2.2 : 1 taper, and her own two
   screenshots show the prominence slider doing most of the work.** The only things that
   slider changes are a swelling at each node and a change of direction below it. The taper
   is identical at both ends of the slider.
3. **Of the two things the slider does, the change of direction moves the silhouette about
   seven times as far as the swelling.** At 0.48 on three nodes the stem's tip ends up
   3.29 mm off the straight line on a 100 mm stem, about one stem diameter. The largest
   swelling moves each side of the stem 0.48 mm.
4. **The flower has no other source of non-straightness.** Its `stemCurve` control has been
   hidden since it shipped (`flower-registry.js:376`, "Never reachable since it shipped").
   So everything about the flower's stem that is not straight comes from the node kink.

Which half carries the look is still a reading of the picture, and it is Eva's (sheet
row 2). The numbers above only say which half moves more material.

---

## 1. What the flower's stem geometry is

**A lofted tube.** It is not a lathe and not an SDF. The stem zone of `buildTrunkInto`
(`flower.js:2154`, stem zone from `:2450`) walks a 48-segment centreline polyline, places a
**horizontal** circle of `M = RADIAL_SEGMENTS × 2 = 16` points at every one of the 49
centreline points, joins consecutive rings with quads, and caps each end with a fan to a
centre apex (`:2503`). Vertex normals are smoothed by central differences along and across
the tube. The stem is **solid**: no bore. It is always **1,568 triangles**, whatever the
node count or prominence, because the 49 stations are fixed and dense.

`flower-sdf.js` builds the receptacle field. It plays no part in the stem.

**The radius law**, `stemRadiusFn` (`flower.js:1818`), quoted:

```js
return (t) => {
  let swell = 0;
  for (const tk of nodeTs) { const d = (t - tk) / 0.055; swell += prom * 0.6 * Math.exp(-d * d); }
  return P.tubeRadius * lerp(4.0, 1.8, t) * thickness * (1 + swell);
};
```

`t` is the fraction of the stem's length from the flower (0) to the free end (1). So:

- **The taper is linear and narrows toward the free end**, from `4.0 × tubeRadius` to
  `1.8 × tubeRadius`, a ratio of **0.45**. At the shipped `tube` 0.4 and thickness 1 that is
  0.0672 → 0.0302 world units. Scaled to 100 mm long (25 mm per unit; the flower's own
  export calibration is 26) it is **3.36 mm across at the flower and 1.51 mm at the foot**.
- **Slenderness:** length over diameter is **29.8 at the top and 66 at the foot**. The
  bloom's shipped 100 × 6 mm stem is **16.7**. The flower's stem is about twice as slender
  where it leaves the head and four times as slender at its end.

**The centreline**, `stemCenterline` (`flower.js:1788`), quoted:

```js
let hx = bendMag * t * t, hz = 0;                       // bendMag = 0: stemCurve is unreachable
for (let k = 0; k < nodeTs.length; k++) {
  const past = t - nodeTs[k];
  if (past <= 0) continue;
  const drift = prom * length * 0.13 * past * smoothstep01(0, 0.12, past);
  hx += Math.cos(nodeAng[k]) * drift;
  hz += Math.sin(nodeAng[k]) * drift;
}
pts.push({ x: cx + hx, y: cy - length * t, z: cz + hz });
```

with `nodeAng[k] = k × GOLDEN_ANGLE`. The node positions are `stemNodeParams`
(`flower.js:1777`): evenly spread over `t` 0.16 to 0.86 (0.16 / 0.51 / 0.86 at three nodes),
or 0.55 for one. Nodes exist whenever the stem does. They do not depend on leaves: leaves are
attached to them afterwards (`buildLeafInto`, `:2044`).

## 2. What `NODE PROMINENCE` does, taken apart

One slider, `stemNodeProminence` (0–1, default **0.40**), drives two independent terms:

| | swelling (on the radius) | kink (on the centreline) |
|---|---|---|
| law | `+ 0.6 · prom · exp(−((t − t_k)/0.055)²)` | heading change `atan(0.13 · prom)`, spread over `0.12 L` below the node |
| at 0.40 | +24.0% of radius | 2.98° a node |
| at 0.48 | **+28.8%** | **3.57° a node** |
| at 1.00 | +60.0% | 7.41° a node |
| extent along the stem | `w` = 0.055 L (5.5 mm on 100 mm, **3.3 top radii**) | the turn is half done 0.033 L below the node and complete at 0.12 L |
| silhouette moved, 0.48, three nodes, 100 mm | **0.48 mm** per side at the top node | tip **3.29 mm** off the axis (0.98 top diameters) |
| worst tilt from vertical | — | 5.73° (three nodes), 6.01° (eight) |

Measured by calling the shipped `stemCenterline` and `stemRadiusFn` in Node (§7), not by
reading the formula.

- **The kink carries more displacement than the swelling**, by 3.29 / 0.48 = **6.9x** at
  the setting in Eva's screenshot. The swelling is what marks where a node is. The kink is
  what makes the stem stop being ruler-straight.
- **The blend Eva likes has a measurable shape.** The curvature of each kink peaks
  **0.045 L below its node**, inside the lower half of the swelling (`w` = 0.055 L). So the
  stem bends where it is thickened, and the swelling reads as the joint it turned at rather
  than as a bead on a straight rod. The swelling is also long: `w` is 3.3 of the stem's own
  radii. #296 and #298 used `w = 1.2 ×` the top radius, a node **2.7 times shorter** relative
  to the stem's thickness. That difference is visible on sheet row 3.
- **The kinks go in different directions.** Each node turns toward its own golden-angle
  azimuth, so the stem zigzags gently in plan rather than curving one way. From any single
  side view some kinks are foreshortened.

**Would a per-node kink give the bloom most of the curvature read without a centreline?
No: the kink is a centreline.** But it is a much smaller one than the curvature job
costed in `docs/bloom-bell-corolla-discovery.md` Q5, and this is the strategic finding:

- **The flower's rings stay horizontal.** Only their centres move. No frame is transported
  along the stem, no ring is tilted, and each ring is still a circle in a horizontal plane.
  So a bloom version would be a **stem axis offset as a function of arc length**
  (`stemAxisAt(s)`), with every ring drawn about its own centre.
- **What that keeps unchanged in the bloom:** `endFace` and both ends' caps (the rings are
  still horizontal circles), the bore rule applied ring by ring, the hub-to-stem join, the
  root band, `headInsideBore` and the meridian packing. The flower's first node sits at
  `t` 0.16, so the stem is exactly on the axis where it leaves the head.
- **What it has to change:** every consumer that assumes the stem is on the world z axis.
  That is `freeStemDistanceMm` and through it `stemOmission`, the rachis approach and the
  combination gate's `leaf-stem` measure; `rodWallRootMm` / `rodWallEmbedMm` /
  `rodWallCrossingMm` for the leaf petiole and the pedicel; ST2 (ring centres' offset from
  the axis); ST9 (locates the stem by its rings); LF3. That is the consumer half of the
  curvature session. The swept-frame half is not needed for the flower's look.
- **Where horizontal rings stop being enough.** A horizontal ring on a tilted axis is an
  ellipse in the plane perpendicular to the axis, and a wall measured horizontally is
  thinner perpendicular to the axis by `cos(tilt)`. At 0.48 the worst tilt is 5.73°, so a
  1.5 mm horizontal wall is **1.4925 mm** perpendicular. At prominence 1.0 it is **1.465 mm**.
  Eva's wall rule has been applied horizontally everywhere so far; whether it must hold
  perpendicular to the axis is her reading. Either answer is cheap: accept it, or widen
  each ring by `1 / cos(tilt)`.

## 3. `SIDE BUD`, mechanically

`buildBudBranchInto` (`flower.js:1840`) and `buildBudInto` (`:1879`):

- **The offshoot** leaves the main stem **45% of the way down**, at a fixed azimuth
  `1.5 × GOLDEN_ANGLE`. It is a cubic Bézier tube, half the main stem's length, reaching
  out and rising, with radius `3.0 → 2.0 × tubeRadius` (0.75 → 0.5 of the main stem's top
  radius). A bead welds it to the stem.
- **The bud** is the same bloom rebuilt into its own accumulator from a simplified state:
  one whorl, at most 5 petals (4 under Voronoi), no centre, reduced density, and a pose.
  `TIGHT` closes the petals inward into a teardrop; `EARLY` is a smaller, slightly more
  closed copy of the current bloom. It gets its own receptacle. Then it is appended under
  one rigid transform: rotated onto the offshoot's end tangent and scaled by **0.42**, with
  the export floor compensated for the scale.

**What it would cost the bloom: most of it already exists.** #271's inflorescence is the
same construction: one head built once and appended under a rigid transform, on a rod
rooted through the stem wall. A `RACEME` at one node, 5 petals, `floretScale` 0.42 and a
50 mm pedicel builds today (sheet row 5, the shipped builder). What is missing:

- **A curved offshoot.** The bloom's pedicel is a straight rod at `pedicelAngle`. `rodInto`
  already runs `spineLaw`, which bends the stamens and the style, so a curl on the pedicel
  has an owner.
- **A closed-bud pose.** This is the "maturation ramp / bud pose" item deferred by ruling 6
  of the inflorescence rulings, not something new.
- **The pedicel's thickness.** At one node the area rule gives the pedicel the rachis's own
  radius. The flower's offshoot is 0.75 of it.

**About one session**, all of it on the inflorescence and none of it on the stem. It does not
touch the stem's own look.

## 4. Constraints the flower's stem does not have

This is the part that decides what can be ported.

| constraint in the bloom | the flower's stem | consequence for porting |
|---|---|---|
| one connected solid, one owner per boundary | a closed tube whose top ring coincides with the receptacle's neck ring; overlap is the construction | none |
| `STEM_DIAMETER_RANGE` minimum **3 mm**, "Eva's stated minimum outer diameter" (`bloom-registry.js`) | narrows to 1.51 mm at 100 mm | **the flower's slenderness is out of reach.** The flower's own taper at a 6 mm top ends at 2.70 mm and breaks the floor; clamped, it holds 3 mm over the last 9% (row 3). A 3 mm stem, the thinnest allowed, is the flower's top slenderness and cannot narrow at all (row 4) |
| Eva's bore rule, 1.5 mm wall | solid | a horizontal-ring kink thins the wall perpendicular to the axis by `cos(tilt)` (§2) |
| Eva's #296 ruling: the stem widens toward its free end | narrows toward its free end | **the flower's taper contradicts a ruling.** It is also not what carries the look (§0), so this conflict does not need resolving to port the nodes |
| `MIN_FEATURE_MM` 1.0 | its export floor is per process (1.0 mm on SLS) and applies to the whole model | none at the stem's sizes |
| the sphere stem channel (ST7–ST9, `stemOmission`) | none | a kinked stem moves toward some petals and away from others. On a sphere the channel must read the offset axis. The kink starts at the first node, below the pole, so the petals nearest the pole see an on-axis stem |
| ST0–ST6, ST10, ST11; LF3 | none | ST2 and ST9 restated to read the axis offset; ST3 per ring; a new clause for the node law |
| the stem is the floret's pedicel (`floretState`) | the side bud's offshoot is its own tube | `floretState` must pin any node control, or pedicels get nodes too |
| leaf nodes exist only with leaves, and their **count is mode-dependent** (#296 §3) | nodes are the stem's own and exist without leaves | Eva's reading: are nodes the stem's (the flower's model) or the leaves' (the bloom's today)? If they sit at leaf depths, #296's mode-dependence fix comes first |
| export scale: the model's largest dimension is set to `heightMM` | the stem is usually that dimension, so a longer flower stem makes the whole flower smaller in millimetres | the bloom works in millimetres throughout; nothing to port |

**Nothing the flower's look depends on is forbidden, except its slenderness.** The kink and
the swelling are both portable. The thinness is not: the 3 mm floor is Eva's own stated
minimum, and it is why the bloom's stem will always read heavier than the flower's at the
same length.

## 5. The portable elements, ranked by look for cost

Station cost in the bloom is 192 triangles a station (one outer ring and one bore ring at 48
sectors, #298 §2). The flower uses 49 fixed stations; a bloom port would use the station
placer #296 and #298 both found owed, so the counts below are bounded by 49 stations, not
measured on a placer.

| rank | element | what carries the look | owners touched | assertions | default identity | triangles | sessions |
|---|---|---|---|---|---|---|---|
| 1 | **node kink** (axis offset, horizontal rings) | the stem stops being straight; one diameter of drift on 100 mm at 0.48 | new `stemAxisAt(s)` in `stemPlan`; `buildStemInto` ring centres; `freeStemDistanceMm`, `stemOmission`, `rodWall*`, `leafPlan` clearance, pedicel roots | ST2, ST9, LF3 restated; a new clause restating the kink from the controls; mutants: kink ignored, kink on the wrong side of the node, axis read on-axis by a consumer | by branch at prominence 0 (`stemStations` verbatim) | a few stations a node for the turn | **1** (it is curvature's consumer half) |
| 2 | **node swelling** (the flower's long spindle, `w` = 0.055 L) | marks the node; the "blend" when it coincides with the kink | `stemPlan` radius at arc length; the placer; `leafPlan` clearance at the node radius | ST3 per ring; ST1 generalised; the swelling at declared depths, restated | by branch | #298 measured +5,856 for three nodes at 0.35 with the bore following; up to +8,832 at 49 stations | **1**, and shares the placer with rank 1, so ranks 1 and 2 together are **about 2** |
| 3 | **side bud** | a second, smaller head on the stem | inflorescence only: a pedicel curl through `rodInto`, a bud pose | ID family; the pedicel's curl | the raceme is already guarded at NONE | one head, O(1) in count | **~1**, and it is not the stem's look |
| 4 | **the flower's taper** (narrowing, linear) | little: it is on both screenshots and neither reads right alone | `stemPlan` | as #296 | by branch | +96 (one bore ring, #298 §2) | conflicts with a ruling and the 3 mm floor; **not recommended** |

Order if Eva wants it: **kink and swelling together, as one "node prominence" control
matching the flower's, built with the station placer and the axis owner in the same session
pair.** Rank 1 without rank 2 would be a stem that wanders without joints. Rank 2 without
rank 1 is #298's row 4, which did not read.

## 6. What this changes for the plan

- #296 recommended taper → curvature → nodes. #298 said the order changes to
  curvature → nodes → taper if row 4 read better. The flower settles it: **nodes first,
  built with a kink, which is the first half of curvature. Taper afterwards, if at all.**
- A full swept-frame curvature (a crook, a droop past about 15°) stays a later session. The
  horizontal-ring axis offset is its first half, not a throwaway: the consumers it migrates
  are the same ones.
- The bloom's node law should take the flower's constants as its starting point, not #296's:
  `w` = 0.055 of the length (not 1.2 top radii), amplitude `0.6 × prom`, a turn of
  `atan(0.13 × prom)` spread over 0.12 of the length below each node, directions at the
  golden angle. They are constants tuned on a thinner stem; on a 6 mm stem the swelling is
  1.83 radii long rather than 3.3, and whether that still reads is on sheet row 3.

## 7. How this was measured, and what it cannot tell

- **The flower's code is the shipped code.** A scratch harness (outside the repository)
  slices `stemNodeParams`, `stemCenterline`, `stemRadiusFn` and `buildTrunkInto` out of
  `flower.js` by brace-matching, evaluates them in Node with `flower-geometry.js`'s own
  `lerp` and `clamp`, and drives `buildTrunkInto`'s stem-only path with a stub accumulator.
  A slice that fails throws.
- **The swell-only and kink-only cells** call the same shipped functions with prominence 0
  for the half that is switched off. They go through a replica of `buildTrunkInto`'s stem
  loop that takes the centreline and the radius as arguments. **The replica is checked
  bit-identical to the shipped `buildTrunkInto` on 24 states** (prominence 0 / 0.4 / 0.48 /
  1.0 × 0 / 3 / 8 nodes × two thicknesses), every position under `Object.is` and every
  index, before any cell is rendered.
- **The sheet draws every stem at 48 sectors** (the bloom's `HUB_SECTORS`) so facets match
  between cells. The flower itself uses 16. The bloom head and the first row-3 and row-5
  cells are the shipped `buildBloomInto`. Other bloom-sized stems are the replica loft
  placed where the shipped 100 mm stem begins (its foot at z −101.92, measured). They show
  the outer surface only, as #298's did.
- **Renders** are `tools/bloom-soft-render.mjs`: deterministic, flat-shaded, so no pixel
  delta is quoted and none is owed. The flower's page shades its stem with smoothed normals;
  flat shading shows the 2 mm ring spacing slightly more than the page does.
- **Not measured:** the station placer's actual count on a kinked, swollen profile; the
  sphere omission set under a kinked stem; the combination-gate cells; the flower's stem
  with its own head and leaves (the flower page was not driven); anything printed. Nothing
  in this project has been printed.

## 8. For Eva

**On sheet row 2, which half of the flower's node carries the look: the swelling, the kink,
or only the two together?** The answer picks the first build: kink alone is curvature's
consumer half (one session), swelling alone is #298 row 4 with the flower's longer spindle
(one session), both together is about two.
