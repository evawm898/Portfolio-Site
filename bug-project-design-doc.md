# Parametric Bug — project design doc

`/bug` (`bug.html`, `bug.js`, `bug-geometry.js`) is a hidden generative page
(`noindex`, linked from nothing) that builds an insect or a spider as ONE 3D model
and exports it two ways: a top-down SVG for paper / laser / plotter work, and an
STL for printing. It is its own project — it shares the bloom's *doctrine*
(connectedness, verification, derive-don't-expose) and none of its code.

This document covers the whole long-term scope. Only **Phase 1** is built; every
later phase is written down here so that Phase 1 does not foreclose it.

---

## 1. Architecture law

**One 3D model of the bug is the single source of truth. Two exporters read it.**

```
params ──► buildBug(params) ──► MODEL (one indexed triangle mesh + a part table)
                                   │
                    ┌──────────────┴──────────────┐
                exportSvg(model)              exportStl(model)
         top-down orthographic projection      the solid itself
```

- There is **no 2D geometry path**. The SVG is the projection of the model's own
  triangles onto the ground plane. A wing's outline in the SVG is the contour of
  the wing *solid* as seen from straight above — after its dihedral and pitch have
  been applied — never a planform polygon drawn a second time.
- `exportSvg` and `exportStl` take a built model and nothing else. Neither reads
  the parameters. That is what makes "the two exports cannot disagree" a property
  of the code shape rather than a promise.
- The 3D preview on the page draws the same model.

### How the SVG is derived from the solid

For each closed part (a wing slab, a leg segment, the body loft), every triangle
is classified as **front-facing** (normal has +z) or back-facing. The boundary of
the front-facing set — the edges where a front face meets a back face — is a set of
closed directed loops (the *contour generator*). Projected onto x-y, those loops
filled with the **nonzero** rule reproduce the part's projection exactly: every
point of the projection is covered by at least one front face, and each covering
front face contributes +1 winding. No polygon boolean, no 2D outline, no
approximation beyond the mesh itself.

Parts are drawn in a fixed anatomical order (legs, hindwings, forewings,
antennae, body), each a filled region with its own outline, so a wing passing
under the body reads as passing under it. Segment bands on the abdomen are drawn
as lines read off the model's own band rings.

**Cut-safe mode** (toggle, default OFF) instead emits the UNION of every part as
one region with only its true outer boundary and holes — the line a cutter
actually needs. The union is computed by rasterising the nonzero fill of all
contour loops at 0.05 mm, tracing it with marching squares (exact crossings along
each row, half-pixel across rows) and simplifying at 0.01 mm. The exporter counts
the connected regions of that raster and states the count in the file. Because a
continuous projection of a connected solid is connected, a cut-safe export of a
valid bug is one region by construction; the count is the check.

---

## 2. Invariants (hard, every build)

1. **Bilateral symmetry, always.** The right half (+x) is generated; the left is
   its exact mirror (`x → −x`, winding reversed). Axial parts (the body loft) are
   built from half-rings mirrored the same way, and `x = 0` is written as `+0` so
   the mirror of an axial vertex is the vertex itself. Verified numerically:
   `mirrorDiff(model)` matches every triangle against the mirror of the triangle
   set as exact doubles and must read **0**. Not a tolerance — an identity.
2. **STL: ONE connected watertight solid.** The model is assembled from
   individually-closed primitives that overlap (the flower/bloom export
   contract: overlapping closed shells are fine, the slicer unions them). The
   gates are (a) **boundary edges = 0** on the welded float32 STL, (b) every
   primitive closed and outward-wound (positive signed volume), (c) **one
   connected region** by voxel flood-fill below the minimum feature size.
   Component counting by vertex welding is NOT the connectedness test (bloom's
   hard-won rule) — overlapping shells share no vertices.
3. **Every wing and leg physically attaches to the thorax** (the cephalothorax
   on a spider). A wing's root rows are embedded inside the thorax; a leg's coxa
   starts inside it; an antenna starts inside the head. Attachment is by
   volumetric overlap of closed shells, and the flood-fill is what proves it.
4. **Minimum feature floor.** Every tube (legs, antennae, pinnae, wing tails'
   narrowest width) and every wing's thickness is floored at `minDiameter`
   (default **1.0 mm** — the SLS PA12 minimum for unsupported wire in this
   repo's working agreements; 0.8 mm is the supported minimum and is below the
   slider's default for that reason). The floor is a setting, not a constant, and
   it applies to the ONE model, so the SVG shows the same floored geometry the
   printer gets. Like every floor in this repo it is a **declared guess — nothing
   here has been printed.**
5. **SVG cut-safe** is a toggle, default off (see §1).

---

## 3. Full long-term scope

### 3.1 Body plans
- **Insect, 3-part**: head, thorax, abdomen.
- **Spider, 2-part**: cephalothorax (head folded into the thorax), narrow
  pedicel, abdomen (opisthosoma).
- The body is a single loft of stacked rings along the body axis: a radius
  profile that is the max of each part's own profile, with the neck and waist
  floored. Cross-section is a superellipse (roundness 2 = ellipse, higher =
  boxier, lower = keeled/diamond).
- Abdomen: length, width, taper, segment count, banding (constrictions between
  segments).
- Later: abdomen curl (scorpionfly, earwig), thorax hump (cicada), separate
  pronotum shield (beetles), elytra (a third wing kind: hardened forewings).

### 3.2 Legs
- Pair count 0–4. Coxa / femur / tibia / tarsus lengths, splay (fan of the
  pairs forward→back), joint bend, taper, visibility.
- STL: tapered tube segments with a sphere at every joint, root inside the thorax.
- Later: per-pair length scaling (spider front legs, mantis raptorial forelegs),
  tarsal claws, leg pose presets (walking / resting / tucked for print).

### 3.3 Antennae
- clubbed / feathered / filiform / bristle / none; length, curl, spread.
- Later: elbowed (ants, weevils), lamellate (scarabs), segmented beading.

### 3.4 Wings
- 0–2 pairs. Per pair: aspect ratio, sweep, size ratio and overlap between the
  pairs, apex roundness (superellipse exponent — the same law the bloom uses for
  its petal tip), margin scallop depth / count, hindwing tail length / width /
  club, thickness.
- **Tilt**: dihedral (raise / lower at the hinge) and pitch (twist along the
  span), independent per pair. Tilt is applied to the 3D model; the STL carries
  it; the SVG stays a top-down projection of the tilted solid (a wing raised 60°
  projects foreshortened — that is correct, not a bug).
- Phase 1 wings are flat solid slabs.

### 3.5 Venation (Phase 2)
- Vein network generated **on the wing's own planform** (generated by the shape,
  not clipped to it): longitudinal veins from the hinge fanning to the margin,
  cross-veins between them.
- **Cross-vein density** slides the wing from *open* (few cross-veins, large
  cells — butterfly) to *segmented* (dense cross-veins, small cells — dragonfly).
- **Discal cell**: the closed central cell of lepidopteran wings, a named
  feature of the network rather than an accident of density.
- **Pterostigma**: the thickened, filled cell on the leading edge near the apex
  (dragonflies, bees).
- Venation is a property of the wing in its planform frame; the same tilt
  transform that places the slab places the veins, so the SVG and STL cannot
  disagree about where a vein is.

**OPEN PHASE 2 QUESTION — veins as cut-through holes vs raised ridges in STL.**
In SVG the answer is natural (veins are lines; cells are fills or cut-outs). In
the STL there are two incompatible readings and the choice changes print
strength, not just look:

| | Cells cut through (veins are the only material) | Veins as raised ridges on a solid membrane |
|---|---|---|
| Look | lace / dragonfly; light through it | embossed; reads at a distance only by shading |
| Strength | the wing becomes a **wire network** — every vein must clear the 1.0 mm unsupported-wire floor, cross-veins become free-spanning struts, and a dense (segmented) setting multiplies the number of thin members; failure is by snapping at the hinge where all load funnels | the membrane carries the load in-plane and the ridges stiffen it like ribs; far stronger per gram; but the membrane itself must be ≥ the thickness floor, so the wing is heavier and stiffer than a real one |
| Connectedness | every cell boundary must close and every vein must reach the hinge or another vein — free ends become possible (the flower's "connected ≠ no dangling ends" lesson) | trivially one piece (ridges sit on a continuous sheet) |
| Interaction with SVG cut-safe | the cut file and the print file would agree (both are a network) | the cut file is a network, the print a sheet — the "two exports, one model" law then needs the vein role to be explicit per export |

It is also not obviously binary: a hybrid (cut through only cells above an area
threshold, ridge the rest) may be what prints and reads best. **Not decided;
Phase 2 must measure it** — at minimum a printed coupon at the floor, since every
strength claim in this repo is still theory.

### 3.6 Pattern (Phase 3)
- Marginal bands (a band following the wing margin at an inset), spots
  (placed in planform space), eyespots (concentric rings), and a
  **negative-space mode** where the pattern is removed material rather than
  added colour.
- SVG: fills. STL: the same tension as venation — pattern as holes vs relief —
  and the same need to measure strength.
- Pattern lives in the wing's planform frame and is carried by the same
  transform as everything else.

### 3.7 SVG import (Phase 4)
- Import an SVG drawing onto a wing with an explicit **role**:
  - **replace veins** — the imported strokes become the vein network;
  - **fill cells** — the imported artwork fills the cells of the procedural
    network.
- **Warp** of the import onto the wing: **clip** (place and trim at the margin),
  **radial** (polar map about the hinge, so artwork fans with the veins),
  **envelope** (map the artwork's bounding box onto the planform so it follows
  the outline).
- A **procedural ↔ import blend** slider.
- An import is always mapped into the planform frame first, so it is subject to
  tilt, mirror, and both exports like everything else. Never a separate 2D
  layer pasted onto the SVG.

### 3.8 Not yet scheduled
- Colour per region in SVG; print orientation and supports (Phase 1 only REPORTS
  which presets would need supports); multi-bug compositions; leg poses.

---

## 4. Phases

| Phase | Scope | Status |
|---|---|---|
| **1** | body plans + presets, legs, antennae, wings 0–2 pairs with tilt, flat solid wings, SVG + STL exports, 3D preview | **built (this PR)** |
| 2 | venation; resolve holes-vs-ridges with a printed coupon | waits on Eva's ruling on the Phase 1 sheet |
| 3 | pattern (bands, spots, eyespots, negative space) | — |
| 4 | SVG import (roles, warps, blend) | — |

**Phase 2 does not start until Eva has ruled on the Phase 1 contact sheet** —
silhouettes, body volume and tilt — by eye.

---

## 5. Phase 1 — what was built

### Files
- `bug-geometry.js` — pure ES module, no three.js, runs in Node and the page:
  `PARAM_SPEC` (every control's id, section, range, default — the ONE
  declaration; the panel is generated from it), `PRESETS`, `randomParams(seed)`,
  `buildBug(params)`, `exportStl(model)`, `exportSvg(model, {cutSafe})`,
  `mirrorDiff(model)`.
- `bug.js` — the page: panel generated from `PARAM_SPEC`, three.js preview with
  orbit, live SVG inset, exports, read-out.
- `bug.html` — the page shell. `noindex, nofollow`, linked from nothing.
- `tools/verify-bug.mjs` — the gate (Node, no browser).
- `tools/shot-bug-sheet.mjs` — the contact sheet (headless Chromium).

### The model
- Units are **millimetres**. x = right, y = forward (head), z = up.
- **Body**: one loft. Stations every ~0.25 mm along y, 32 points a ring built as
  a right half-ring mirrored. Pole fans at both ends.
- **Wing**: a structured slab — rows along the span, columns across the chord,
  top face + bottom face + rim. Planform half-chords come from a profile `f(t)`
  rising from the root to the widest point and then following the
  superellipse `(1 − s^n)^(1/n)` to the apex (`n` = apex roundness: < 1 pointed,
  2 ellipse, 3 held-width round). The chord splits 35 % ahead / 65 % behind the
  span line (the costa carries little chord); scallops cut the trailing margin
  over the outer 70 % of the span with round lobes and sharp notches. The apex
  is floored at `minDiameter` across rather than collapsed to a point.
  - Transform, in order: **sweep** (yaw in the wing plane, + = backward) →
    **pitch** (rotation about the swept span axis, growing linearly from 0 at
    the hinge to the full angle at the tip, + = leading edge up) → **dihedral**
    (rotation about the body's long axis through the hinge, + = tip up) →
    translate to the hinge.
  - **Hindwing tail**: its own closed slab rooted inside the hindwing at 78 % of
    the span, carried by the same transform.
- **Legs**: per segment a tapered frustum, a sphere at each joint and at the
  tip; coxa rooted inside the thorax underside.
- **Antennae**: a tube along a curved centreline (parallel-transport frames);
  clubbed adds an ellipsoid club, feathered adds pinnae both sides, bristle
  tapers from a thick base.

### Controls added beyond the brief (each needed to make the presets reachable)
- **Abdomen width** — the brief lists length / taper / segments / banding; a
  spider's bulbous opisthosoma and a dragonfly's needle cannot share a width
  derived from the thorax.
- **Wing length (pair 1)** — the brief gives pair 2's size as a *ratio*, so pair
  1 needs an absolute size.
- **Widest point (per pair)** — where the chord peaks along the span. Without it
  a butterfly forewing, a moth forewing and a dragonfly hindwing are the same
  teardrop. Same role as the bloom petal's peak position.

### Decisions made without a ruling (reversible)
1. **Floor default 1.0 mm** (see §2.4). Range 0.6–2.0.
2. **The floor applies to the one model**, so the SVG shows floored legs too.
   The alternative (a live un-floored model for SVG) would be a second model.
3. **SVG ink**: parts filled `#0A0A0C`, outlined `#EDEDE8` at 0.15 mm — the
   silhouette reads as a cut-paper shape, inner lines show overlaps. Cut-safe
   mode emits fill only.
4. **Draw order is anatomical, not by depth** (legs < hindwings < forewings <
   antennae < body). A painter's sort by z would draw a 30°-dihedral wing over
   the thorax that holds it. Wrong for extreme negative dihedral; documented.
5. **Leg root diameter** is derived (0.44 × thorax half-width), not a control.
6. Mirror check compares exact doubles; the STL census welds float32.

### What Phase 1 does NOT cover
Venation, pattern, import, print orientation, supports (only reported — see the
PR / sheet), colour.

### Verification
- `node tools/verify-bug.mjs` — presets + 40 seeded random bugs: mirror diff 0,
  boundary edges 0, every primitive closed and outward, one connected region
  (voxel flood fill at 0.4 mm, below the 1.0 mm floor; a multi-region result is
  re-read at half the cell before it is called a detachment), measured minimum
  tube diameter and wing thickness ≥ floor (measured off the emitted vertices,
  reference = the control), SVG mirror-symmetric and cut-safe = 1 region.
  `--negative-control` detaches a wing, opens a shell, breaks the mirror by
  1e-6 and thins a leg below the floor, and requires each to fail.
- `node tools/shot-bug-sheet.mjs <dir>` — the 4 presets and 8 random bugs, each
  top-down (the actual exported SVG) beside a 3/4 3D view.
- **Neither runs in CI** (every Actions gate here is path-filtered to flower /
  bloom); run by hand.

### Measured at close (Phase 1)
- `node tools/verify-bug.mjs --seeds 120`: **124 / 124 pass** — mirror diff 0,
  boundary edges 0, every part closed and outward, ONE voxel region, cut-safe
  SVG one region, measured minimum tube inscribed diameter 1.000 mm and wing
  thickness ≥ 1.000 mm on every row. `--negative-control`: 5 / 5 mutations
  caught by the clause that names each.
- The voxel sampler needed one fix, found by the gate itself: at a 0.35-cell
  step, random:40 read a **one-voxel** second region at 0.4 mm and at 0.2 mm, in
  a different place each time — consecutive samples crossing a voxel corner.
  The step is 0.12 of a cell now (only adds cells the surface passes through);
  6-connectivity is unchanged.
- Cost, butterfly default: **25,136 triangles, 1,227 KiB STL**; dragonfly
  33,728 / 1,647 KiB; moth 25,568 / 1,249 KiB; spider 13,824 / 675 KiB. Build
  20–50 ms in Node.
- Page vs Node: the page's STL vertices equal a Node build of the same
  parameters to the bit on all 12 sheet bugs; on 5 of them the facet-normal
  floats differ in the last bit (Chromium's V8 vs Node's).

### Print supports (reported, not solved)
SLS — the printing assumption this repo works to — needs **no supports** for
any preset: unfused powder carries every overhang. Under FDM / resin, at the
model's own orientation (body level, legs down), downward-facing area steeper
than 45° and off the build plate:

| Preset | Overhang | Needs supports (FDM/resin)? Why |
|---|---|---|
| butterfly | 2,179 mm² (wings 1,972, tail 49, body 63, legs 53, antennae 42) | **Yes** — both wing pairs are slabs held out from the thorax, their whole undersides in mid-air above the plate; legs and clubs too |
| moth | 1,284 mm² (wings 1,010, antennae 132, body 89, legs 52) | **Yes** — same wing reason; the feathered antennae's pinnae are horizontal wires |
| dragonfly | 1,191 mm² (wings 1,012, body 136, legs 35) | **Yes** — four long flat wings at ~2° dihedral are bridges over nothing; the 52 mm abdomen hangs unsupported behind the legs |
| spider | 262 mm² (body 152, legs 109) | **Yes, least** — no wings; the body hangs above the plate between the leg tips, and the femurs rise then fall |

Print orientation is not solved (out of Phase 1 scope); every preset would
need re-orienting or supports on anything but SLS.
