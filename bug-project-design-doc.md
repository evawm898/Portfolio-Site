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

Parts are drawn in a fixed anatomical order (legs, then the wing pairs back
to front with the last pair's tail straight after its own wing, antennae,
body), each a filled region with its own outline, so a wing passing
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
6. **Every wing outline is simple and clear** — it never crosses itself and
   never pinches to a neck (see §5.4). The editor blocks an edit that would
   break this; a design file that breaks it is refused with a note; an
   interpolated middle pair that would break it is repaired and reported.
7. **Wing roots never stack.** N pairs sit at N distinct points along the
   thorax, front to back in pair order, and the thorax lengthens with the pair
   count to make room.

---

## 3. Full long-term scope

### 3.1 Body plans
A plain setting, **body parts 2 or 3** (Eva, revision ruling — there are no
named presets):
- **3 parts**: head, thorax, abdomen.
- **2 parts**: cephalothorax (head folded into the thorax), narrow pedicel,
  abdomen (opisthosoma).
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
  pairs forward→back), joint bend, taper, visibility, and **reach** (tucked
  under the body ↔ splayed out — revision, §5.6).
- STL: tapered tube segments with a sphere at every joint, root inside the thorax.
- Later: per-pair length scaling (spider front legs, mantis raptorial forelegs),
  tarsal claws, leg pose presets (walking / resting / tucked for print).

### 3.3 Antennae
- clubbed / feathered / filiform / bristle / none; length, curl, spread.
- Later: elbowed (ants, weevils), lamellate (scarabs), segmented beading.

### 3.4 Wings
- 0–4 pairs (revision). Each pair's planform is a **drawn outline** (§5.3);
  stretch and sweep transform the drawn curve; scallop depth / count,
  thickness and tilt are applied on top; the LAST pair carries the hindwing
  tail (length / width / club). The first and last pairs are drawn; pairs
  between interpolate both unless unlinked.
- **Tilt**: dihedral (raise / lower at the hinge) and pitch (twist along the
  span), independent per pair. Tilt is applied to the 3D model; the STL carries
  it; the SVG stays a top-down projection of the tilted solid (a wing raised 60°
  projects foreshortened — that is correct, not a bug).
- Phase 1 wings are flat solid slabs over the drawn planform.

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
  which bugs would need supports); multi-bug compositions; leg poses.
- **Abdomen banding review** (Eva, revision): with many segments and banding on,
  the constrictions stack into a slinky (seen on the first sheet's random 4).
  Noted for a later banding pass; nothing changed now.

---

## 4. Phases

| Phase | Scope | Status |
|---|---|---|
| **1** | body plans, legs, antennae, wings with tilt, flat solid wings, SVG + STL exports, 3D preview | built (#324, merged) |
| **1 rev.** | presets removed → neutral default + Randomize + save/load; wings 0–4 pairs with drawn, linked outlines; curve editor with reference backdrop; tucked legs | **built (this PR, §5)** — waits on Eva's ruling on the revised sheet |
| 2 | venation; resolve holes-vs-ridges with a printed coupon | waits on the revised sheet |
| 3 | pattern (bands, spots, eyespots, negative space) | — |
| 4 | SVG import (roles, warps, blend) | — |

**Phase 2 does not start until Eva has ruled on the revised Phase 1 contact
sheet** (`docs/img/bug-phase1-revised-sheet.png`).

---

## 5. Phase 1 revision — Eva's rulings on the first sheet, and what was built

> **The tail parts of this section are superseded by §6**: the tail is now part
> of the bottom pair's outline, its sliders are retired, and the random-range
> row for it below no longer applies.

The first sheet (`docs/img/bug-phase1-sheet.png`, #324) was **not approved**.
The rulings, and how each was carried out:

### 5.1 No named presets
Butterfly / moth / dragonfly / spider are gone (`PRESETS` and `presetParams`
are deleted). In their place:
- **A neutral default bug** (`defaultParams()`): 3 parts, 3 splayed leg pairs,
  filiform antennae, two plain rounded wing pairs (a forewing and a shorter,
  rounder, swept-back hindwing), no tail, no scallop. Not any named insect.
- **Randomize** (`randomParams(seed)`, the button and the sheet share it). Not
  every slider uniform any more: ranges chosen so a random bug is plausible most
  of the time. Lengths are multiples of the thorax, so proportions hold at any
  size. The table is `RANDOM_RANGES` in `bug-geometry.js`:

| | range / rule |
|---|---|
| body parts | 3 parts 80 %, 2 parts 20 % |
| 2-part bug | **4 leg pairs, 0 wing pairs, no antennae** — always (no stray wing on a spider) |
| 3-part bug | **3 leg pairs** — always (never 0 legs); antennae: none 10 %, else clubbed / feathered / filiform / bristle evenly |
| wing pairs (3-part) | 0: 8 % · 1: 12 % · 2: 60 % · 3: 12 % · 4: 8 % |
| cross-section roundness | 1.8 – 3 |
| head | 2.6 – 6.5 mm |
| thorax | length 4.5 – 11 mm, width 3.5 – 8.5 mm, depth 0.75 – 1.05 × width |
| abdomen | length 1.4 – 4.2 × thorax (3-part), 1.1 – 1.8 × (2-part); width 0.55 – 1.25 × thorax (3-part), 1.0 – 1.6 × (2-part); taper 0.2 – 0.8; segments 4 – 10 (3-part), 1 – 3 (2-part); banding 50 % |
| legs | reach: tucked (0) 30 % on a 3-part bug, else 0.75 – 1 (never half-way — §5.6); coxa 0.8 – 2 mm; femur 0.5 – 1.3 × thorax (3-part), 0.9 – 1.6 × (2-part); tibia 0.9 – 1.25 × femur; tarsus 0.5 – 1.0 × femur; splay 20 – 55°; bend 25 – 70°; taper 0.3 – 0.7 |
| antennae | length 1.2 – 4.5 × head; curl −30 – 70°; spread 12 – 45° |
| wings | first pair length 2.2 – 4.8 × thorax, last 0.6 – 1.0 × first; outline: a random star-shaped outline of 4 – 7 interior points (validated, redrawn if invalid); stretch 0.75 – 1.35; sweep −12 – 20° first, 12 – 50° last; scallop 30 % at 0.05 – 0.2; thickness 1.0 – 1.5 mm; dihedral −5 – 25°; pitch −8 – 8° |
| tail | 25 % when 2+ wing pairs; length 3 – 12 mm, width 1.2 – 3.2 mm, club 0 – 0.8 |
| floor | left at its default (a random floor tests the floor, not the generator) |

  Measured over 500 seeds (gate clause K): 411 three-part, 89 two-part; wing
  pairs 0–4: 125 / 54 / 250 / 45 / 26; every 2-part bug wingless with 4 leg
  pairs; no bug without legs.
- **Save / load of Eva's own designs** (she authors presets herself). A design
  is `{ format: 'parametric-bug-design', version: 1, name, params }` — the whole
  parameter set, wing outlines included. Saved by name in this browser
  (`localStorage`), and exported / imported as a `.bug.json` file. A loaded
  design is normalised: every field clamped to its range, and an outline that
  fails §5.4 is **refused and replaced by the default, with a note** — never
  silently partly loaded. A newer version is refused outright. The reference
  backdrop is **not** saved in a design (it is a tracing aid, and an image
  would make every design file large).

### 5.2 Wing pairs 0–4
- **Roots distribute along the thorax, and the thorax lengthens with the pair
  count**: effective thorax length = `thoraxLength × (1 + 0.3 × max(0, N − 2))`
  (`THORAX_PER_PAIR`); roots are spaced evenly front to back over the middle
  70 % of it (`WING_ROOT_SPAN`), each later pair a little lower so the pairs
  stack in z rather than share a plane. One pair sits where Phase 1's forewing
  did. Hinge spacing is ≥ 0.7 Lt / (N − 1) ≥ 1.12 mm even on the smallest
  thorax at four pairs. The read-out prints the lengthened thorax.
- **Linking: the first and last pairs are drawn; middle pairs interpolate.**
  Outline AND every per-pair value (length, stretch, sweep, scallop, thickness,
  dihedral, pitch) interpolate linearly by pair index. Any middle pair can be
  **unlinked** — it then starts from exactly what was on screen (its
  interpolated curve resampled to as many control points as the larger drawn
  pair, and its interpolated values) and is drawn by hand; **relink** discards
  the hand drawing.
- **Interpolation with unequal point counts: RESAMPLE, not enforce.** The two
  drawn outlines are sampled densely (the spline), then each is resampled by
  arc length into 2 × 48 + 1 points **apex-aligned** — the leading half (root
  lead → apex, the sample farthest along the span) and the trailing half (apex
  → root trail) separately — and mixed point for point. So Eva can add points
  to the forewing without touching the hindwing, and the apices correspond.
  Enforcing equal counts was rejected: it couples two drawings that are
  otherwise independent, and every add/delete on one would demand an edit on
  the other.
- **A blend can cross itself even when both ends are simple.** If it does, the
  middle pair is **repaired**: the mix fraction is eased toward the nearer drawn
  pair (bisection, 30 steps) until the outline is simple and clear, and the
  build reports it in `model.notes` and the read-out. The gate builds such a pair
  (`CROSSING_BLEND` in `tools/bug-fixtures.mjs`, found by searching 300 outlines)
  and checks both that the raw mix crosses and that the built pair is repaired.

### 5.3 The wing shape curve editor
Modelled on the dress pipeline's curve editors (`anthropic-skills:dress-shell`):
- **The RIGHT wing's outline only**; the left is the model's mirror, so the
  editor cannot break symmetry. Drawn in the wing's own planform frame: `u`
  along the span (units of the pair's length), `w` along the chord, + toward
  the head, so the editor reads like the top view.
- **The outline**: an open chain of control points from the **root lead**,
  round the apex, back along the trailing edge to the **root trail** — both
  root points pinned at `u = 0` (draggable along the chord only, never
  deletable) — closed by the straight root chord, which the builder pushes into
  the thorax to embed the wing.
- **Curve law: centripetal Catmull-Rom** (α = 0.5) through every control point,
  with reflected phantom end points so it passes through the roots. Centripetal
  parameterisation has no cusps and no self-intersection within a segment — the
  trap the dress skill names for plain cubic splines. 10 samples a segment.
- **Add / delete**: double-click the curve to insert a point into the nearest
  segment; select a point and press Delete / the button, or right-click it.
  Minimum 4 points (two roots + two interior).
- **Self-intersecting drags are BLOCKED, not repaired.** Every drag event, add
  and delete goes through `moveControlPoint` / `insertControlPoint` /
  `deleteControlPoint`, which validate the outline that WOULD result (§5.4) and,
  if it fails, return the points unchanged with the reason, which the editor
  shows ("Blocked: the outline would cross itself."). A slow drag toward a
  crossing is therefore accepted up to the last valid position and stops there.
  Repair was rejected for the interactive path: silently reshaping what the hand
  is dragging is worse than refusing the step.
- **Reference backdrop**: load any image behind the editor, with opacity,
  scale and x/y offset sliders, to trace a reference.
- **Layering**: the drawn curve is the base planform. **Stretch** (a chord
  scale of the drawn curve, 0.3–3) and **sweep** (in-plane rotation, −30–70°)
  transform it; **scallop** (depth / count, on the trailing half), **hindwing
  tail**, **thickness** and **tilt** (dihedral, pitch) stay sliders applied on
  top. A scallop that would make the outline cross or pinch is halved until it
  does not, and reported.
- **Live**: every accepted drag event rebuilds the one model, the 3D preview and
  the SVG inset (one build per animation frame). Measured in Node: validation
  0.26 ms per drag event; a build 19 ms at two pairs, 47 ms at four.

**Sliders retired** (fully replaced by the drawn curve or by the per-pair
model): `w1Aspect` / `w2Aspect` (aspect ratio → the drawn chord, plus
**stretch**), `w1Widest` / `w2Widest` (widest point → drawn), `w1Apex` /
`w2Apex` (apex roundness → drawn), `w2Size` (size ratio → each pair's own
**length**), `wingOverlap` (overlap between pairs → roots distributed by §5.2,
which is what stopped pairs stacking on one root). Every per-pair field moved
from `w1*` / `w2*` names into a per-pair spec (`WING_FIELDS`): length, stretch,
sweep, scallop depth, scallop count, thickness, dihedral, pitch. There is no
saved-design migration: no design format existed before this revision.

### 5.4 Outline validity — one rule, enforced in three places
`outlineValid(points)`: at least 4 points; roots at `u = 0` with the lead at
least 0.03 ahead of the trail; every point inside the drawing area (`u` 0–1.2,
`w` ±0.65); no two neighbouring points closer than 0.012; the sampled outline
(closed by the root chord) **simple**; and **clear** — every point at least
0.015 of the length from any part of the outline more than 4 × that away along
the curve (`OUTLINE_CLEARANCE`). Clearance was added because simple is not
enough: the first interpolation repair eased only to "just simple", left a
0.012 mm neck, and the cut-safe SVG split into 3 regions there. A sharp tip
passes down to about 29°. The editor blocks on it, a loaded file is refused on
it, and the interpolation repair eases until it holds.

### 5.5 Triangulating a drawn planform
A drawn outline need not be span-monotone (the gate's `falcate` outline hooks
back past its own trailing margin), so Phase 1's row-by-row slab is replaced by:
the outline polygon (with its embedded root tab) → ear clipping that takes the
**best-shaped** ear each step → **Lawson flips** to the constrained Delaunay
triangulation → two rounds of 1→4 midpoint subdivision (conforming: shared
midpoints) → a solid slab (top, bottom, a rim walked along the top face's own
boundary edges). First-found ear clipping left needle triangles along the
margin, which the first revised sheet showed as **hairlines across the wing in
the SVG** (zero-area contour loops). Best-ear + flips removed most; the rest
were rim facets that a twisted wing tilts a hair past vertical. The exporter now
counts a facet seen almost exactly edge-on (`|nz|` < 1e-4 of its squared edge
lengths, `EDGE_ON_REL`) as front-facing, which is symmetric (a triangle and its
mirror twin compute the same `nz`). Dropping tiny LOOPS instead was tried first
and **broke the SVG's exact mirror symmetry** (the two sides chain the same
edges into loops differently), so it was reverted. Measured over 240 random
4-pair bugs: every remaining extra contour loop lies within 0.26 mm of its
wing's outline (rim micro-loops under the outline stroke); gate clause S fails
any loop standing more than 0.5 mm inside.

### 5.6 Legs tucked under the body — and what the "two stubs" actually were
Ruling: legs tucked under the body should not show from above unless splayed.
New control **reach** (0 tucked ↔ 1 splayed, default 1). At 0 each leg folds
flat under the body — coxa down, femur back, tibia forward, tarsus back — on a
root near the midline, and every joint is held inside the body's own
half-width at its y, so a fold that runs back past a wide thorax beside a narrow
abdomen does not reappear there. Measured from above, leg area outside the
body's projection: **0.22 of 26.95 mm² on the default** (gated ≤ 2 %), 0–5.0 %
over twelve random bugs forced to reach 0 (reported). Randomize never draws a
half-way reach: a mid reach reads as stubs poking from under the wings.

**But the two stubs on the first sheet's butterfly were not legs — they were
the hindwing TAILS.** Rendering that tree's own SVG export with legs red and
tails blue (`docs/img/bug-phase1-stubs.png`, `node tools/shot-bug-stubs.mjs
<phase-1-tree> <png>`) shows the two stubs below the hindwings are the 9 mm
clubbed tails, while the legs only peek out at the front, between the
forewings and the head. The leg fix above is built as ruled and does hide legs;
it would not have changed that butterfly's stubs. The tail is unchanged (it
stays a slider, per the ruling) — **whether the tail should be reshaped is
Eva's question** (the sheet's random 8 shows the same reading).

### 5.7 What this revision does NOT cover
Venation, pattern, import, print orientation, colour, the banding review
(§3.8). Planform WIDTHS of a drawn outline are not floored (a drawn spike can be
narrower than `minDiameter`; clearance bounds a pinch relative to the wing's
length, not in mm) — recorded, not gated. The backdrop is not saved in designs.

### 5.8 Verification (revision)
- `node tools/verify-bug.mjs --seeds 120`: **156 / 156 pass** — 13 function
  checks (E editor blocking / add / delete / pinned roots; I the crossing blend
  really crosses; K Randomize plausibility over 500 seeds; D design round trip,
  refused bad outline, refused newer version) and 143 built rows: the default at
  0–4 pairs, tucked legs, 4 pairs on the smallest thorax, 120 random bugs, 8
  random bugs forced to 4 pairs, five hand-drawn outlines (swallowtail trace,
  falcate, notched, strap, minimal) each as the first pair of a 4-pair bug,
  swallowtail → notched with scallop and tail, an unlinked falcate middle pair,
  and the crossing blend. Every built row: mirror diff 0, boundary edges 0,
  every part closed and outward, ONE voxel region, floor held, SVG symmetric
  with no hairline, cut-safe one region, roots distinct and in order (R),
  every planform simple by the gate's OWN segment test (O).
- `--negative-control`: **10 / 10** caught by the clause that names each —
  Phase 1's five plus: pair 2 moved onto pair 1's root (R), a planform with two
  vertices swapped (O), a wing top face folded (S hairline), tucked legs moved
  out 4 mm (L), and the L clause reading splayed legs as showing. The R clause
  needed a second instrument: its first version (the centroid of wing vertices
  inside the thorax ellipsoid) MISSED the stacking mutation, because moving a
  wing changes which of its vertices are inside — it resampled its own subject.
- `node tools/shot-bug-sheet.mjs <dir>` → `docs/img/bug-phase1-revised-sheet.png`:
  the neutral default, 8 randomized bugs, 1–4 wing pairs, the swallowtail
  traced over a schematic reference backdrop with the editor visible (the
  backdrop loaded through the real file input; one real pointer drag accepted,
  one real crossing drag blocked on its pointer event with the outline
  unchanged), and tucked vs splayed legs. Page STL vertices equal a Node build
  on all 16 cells (on 2, facet normals differ in the last bit).
- Cost, default bug: 0 / 1 / 2 / 3 / 4 pairs = **13,424 / 18,336 / 23,248 /
  31,488 / 39,648 triangles, 656 / 895 / 1,135 / 1,538 / 1,936 KiB STL.**
- Supports (FDM/resin, model orientation; SLS none): default 888 mm², 4 pairs
  1,659 mm² — the wing undersides, as before.
- Neither tool runs in CI.

---

## 6. Second ruling on #326 — the TAIL is part of the outline, and the drawn-width FLOOR

Eva's ruling on the revised sheet. **This section supersedes §5 wherever they
disagree** — in particular the tail is no longer "a slider applied on top"
(§5.3) and no longer a random-range row (§5.1's table). The sheet is
`docs/img/bug-tail-sheet.png` (`node tools/shot-bug-sheet.mjs <dir>`).

### 6.1 The tail is a tagged group of control points in the bottom pair's outline

- **Stored once**, at `wings.tail = { on, anchorU, points }`, never inside a
  pair's own `points`. `composeOutline(base, tail)` splices it into the outline
  as drawn and returns a TAG per drawn point (`['base', i]` or `['tail', j]`).
  OFF composes the base alone — exactly those points go and nothing else moves;
  ON composes the stored group, which is **the last edited tail, never the
  starter** (the toggle writes `on` and nothing else).
- **Where it attaches:** the point where the outline's trailing half crosses
  `u = anchorU` (0.6 for the starter). The tail's points are stored as offsets
  in the MARGIN FRAME there — along the trailing edge's tangent toward the
  root, and along its outward normal — in units of the pair's length. So a
  tail rides the margin: editing a base point near it carries the tail with
  the edge instead of leaving it stranded inside or off the wing.
- **Editing:** drag, insert (double-click) and delete go through
  `moveComposed` / `insertComposed` / `deleteComposed`, which map the drawn
  index back through the tags. An insert between two tail points joins the
  tail (the tag survives resampling because the tail is never resampled — it
  is not part of the base the interpolation resamples). A tail keeps at least
  two points; below that the editor refuses and says "turn TAIL off". Tail
  points draw AMBER in the editor.
- **Which pair:** only the BOTTOM pair — pair N of N, the only pair at 1 — and
  the TAIL checkbox appears only while that pair is the one being edited.
  Changing the pair count moves the tail with its edits to the new bottom pair
  for free: it is stored on the wing set, not on a pair.
- **Interpolation excludes it.** Middle pairs blend `first.points` and
  `last.points` — the tail-less bases — so no partial tail or stub reaches a
  middle pair. The gate's clause **T** proves it: the same bug built with TAIL
  on and off must have every non-bottom wing part bit-identical
  (`Object.is` on every vertex) and the bottom pair different. Rows at 1, 2,
  3 and 4 pairs plus a 4-pair bug with one pair unlinked. Measured on the
  sheet's own read-back parameters: at 2 pairs `1R 1L` identical, at 4 pairs
  `1R 1L 2R 2L 3R 3L` identical; only the bottom pair differs.
- **A tail that does not fit** (the composed outline would cross or pinch) is
  dropped from the build with a note naming the pair; the stored group is
  kept so editing the outline brings it back.
- **The starter** is a spatulate swallowtail strap, ten points.
- **Randomize** turns a tail on in about 1 bug in 10 (21 of seeds 1–200), and
  only when it fits AND clears the floor at that bug's scale — so Randomize
  never hands Eva a bug whose STL is refused (0 of 200).

### 6.2 The old tail sliders are retired, and saved designs migrate

`tailLength` / `tailWidth` / `tailClub` are gone from the panel and the
schema (`DESIGN_VERSION` 2). A file carrying them (`tailLength > 0`, no
`wings.tail`) is migrated by `migrateOldTail()`: the old strap — 20° outward
and back from the trailing edge, `tailWidth` wide, `tailLength + tailWidth`
long, swelling into the club near 86 % of its length — is sampled at 0.15,
0.5, 0.8 and 0.92 of its length on each side plus its end, giving an
**11-point tagged group**, turned ON, anchored at u 0.6. The old strap hung
at 0.78; on the default outline 0.78 lands on a base control point (a
coincident neighbour) and pushes a long strap past the drawing area, so the
starter's anchor is used. If the group still does not fit it is SCALED DOWN
about its anchor in 5 % steps until it does (`fitMigratedTail`), and the load
note says so ("…migrated into a TAIL group of 11 control points on the bottom
pair, scaled to 80 % to fit"). Measured: 6/10/3 mm tails at 1–4 pairs
migrate at full size; 12 mm × 4 mm with full club needs 80 %. The result is
the old strap up to the spline through those points, not the old solid
exactly.

### 6.3 The drawn-width floor — measured as an OPENING, and the STL is BLOCKED

- **The measure** (`thinAnalysis`): the planform is rasterised at floor/6 with
  an exact Euclidean distance transform; a point is reachable by a floor-wide
  disc if it lies within floor/2 of a point at least floor/2 from the
  boundary (the morphological opening). The DEPTH of any part the disc cannot
  reach is how far it stands from the reachable region. A wing is thin when
  that depth exceeds **half the floor** (`THIN_DEPTH_FRAC` 0.5): ordinary
  corners lose a little to any opening (measured ≤ 0.30 mm at a 1 mm floor
  over 120 random bugs) and must not count, while a neck narrower than the
  floor loses its whole length.
- **In the editor** every drawn sample in a thin region is drawn RED, live —
  the editor redraws on every accepted pointer move.
- **SVG is not affected.** The floor is a print property.
- **STL: BLOCK, not thicken.** `exportStl` throws a `FloorError` naming the
  pair and the depth, and the page prints it under the export buttons
  (`STL not exported: pair 2's drawn outline is narrower than the 1.00 mm
  floor …`) and marks "STL BLOCKED" in the readout. Why block:
  1. **Thickening would make a second model.** The STL would carry a shape the
     SVG, the 3D view and the editor do not — the one-model law (§1) exists
     to stop exactly that.
  2. **It would change the drawing silently.** The red highlight already
     tells Eva where; widening it herself keeps the decision hers.
  3. **It costs nothing in practice:** Randomize never produces one (0 of 200)
     and the default never does; only a hand-drawn shape can.
  Lowering the floor in Print is the other exit, and is said in the message.
- **`OUTLINE_CLEARANCE` went 0.015 → 0.008.** At 0.015 the validity rule
  refused a narrow neck as a "pinch" before the floor ever saw it, so a thin
  tail could not be drawn at all, let alone shown red. The floor is the right
  owner of "too narrow to print"; the clearance now only guards against an
  outline touching itself.
- **Two hand-drawn rows now refuse**, honestly: the swallowtail → notched
  fixture with scallop and tail (0.93 mm past the disc) and the crossing-blend
  fixture (its eased middle pair, 1.40 mm). Both are drawn shapes narrower
  than the floor, which is what the rule is for.

### 6.4 Verification

- `node tools/verify-bug.mjs --seeds 120`: **173/173 pass** (24 function
  checks + 149 built rows, 120 random), 3 m 29 s. New:
  - **N** (floor): an INDEPENDENT measure — interior grid at floor/12, exact
    point-to-segment distances, neighbour search through buckets — against
    the builder's `floorViolations` and against `exportStl` actually refusing
    with a reason. Decisive outside a band of two grid steps either side of
    the bar; **2 of 149 rows** fall in the band and are reported, not
    asserted. The thin-tail row reads 3.12 mm (builder 3.00).
  - **T** (tail): the isolation clause above, plus function checks — off
    composes the base, on adds exactly the tail, a drag moves only the tail,
    off/on restores the edit, insert keeps the tag, deleting below two is
    refused, the tail follows the bottom pair at 1/2/4 pairs, migration gives
    11 points drawn on the bottom pair.
- `--negative-control`: eleven mutations, every one caught by the clause
  that names it, including the two new ones — **a middle pair carries tail
  geometry** (caught by T) and **a floor violation goes unreported** (caught
  by N, and by N's "the STL exported although…" line).
- **The sheet performs the claims through the real page**: a real pointer
  drag on the tail's tip point (the group moved), a real click of TAIL off
  (0 tail points drawn) and on (the edited 10-point tail came back exactly),
  and a real click of "Get STL" on the thin tail (no download; the refusal
  printed). No page errors.
- **Cost:** the default is unchanged at 23,248 triangles / 1,135 KiB. A tail
  adds 8,000 triangles (2 pairs 23,248 → 31,248; 4 pairs 39,648 → 47,648).
  A build with the tail on takes ~42 ms against ~17 ms without (the floor
  raster and the extra outline), Node, this box.

### 6.5 How #324 was merged

From the PR timeline and this account's session transcripts: #324 was merged
at 14:33:08 UTC by the Phase 1 session (`session_01NPd47RmJCHE8r6akBx7qYq`)
calling the GitHub merge tool, 11 seconds after a message from Eva in that
session reading "approved, merge it" (sent from claude.ai). Commit
`4a96b3f`, committer web-flow. It was **not** auto-merge, **not** a scheduled
check-in, and **not** this session. #326 is a draft with auto-merge off; the
one scheduled check-in this session owns says in its own prompt that it must
never merge #326 or mark it ready — #326 merges only after Eva approves in
this conversation.

## 7. Phase 1 as first built (#324) — superseded where §5 and §6 say so

### Files
- `bug-geometry.js` — pure ES module, no three.js, runs in Node and the page:
  `PARAM_SPEC` (every control's id, section, range, default — the ONE
  declaration; the panel is generated from it), `PRESETS` (removed, §5.1), `randomParams(seed)`,
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
