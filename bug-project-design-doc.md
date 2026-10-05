# Parametric Bug — project design doc

`/bug` (`bug.html`, `bug.js`, `bug-geometry.js`) is a hidden generative page
(`noindex`, linked from nothing) that builds an insect or a spider as ONE 3D model
and exports it two ways: a top-down SVG for paper / laser / plotter work, and an
STL for printing. It is its own project — it shares the bloom's *doctrine*
(connectedness, verification, derive-don't-expose) and none of its code.

This document covers the whole long-term scope. Only **Phase 1** is built; every
later phase is written down here so that Phase 1 does not foreclose it.

---

## 0. Governing principle (Eva, the elegance pass)

**BODIES TREND TOWARD ANATOMICAL ACCURACY; WINGS CARRY THE FANTASY.** The bug is
a curio-cabinet specimen — real but magical in its unreality: an anatomically
plausible insect body under impossible (lace) wings. By default the page avoids
the CUTE signals — a large head relative to the body, a short plump body, thick
limbs, ball-ended extremities, slab wings. Every one of them stays REACHABLE by
a slider or toggle; none is the default (§9).

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
- **PARKED by Eva's ruling (Oct 2): she does not want lace SVG import.** It was built
  in full — roles, warps, blend, islands, the lace floor, against a stand-in test
  pattern — on branch `claude/lucid-hopper-sjgl2d` (head `81033c1`, gate 219/219 with the
  negative control passing) and opened as PR #343, which was CLOSED UNMERGED. The branch is
  kept so the work can be revived; its design is §10 of this document as it stands on that branch. Nothing of it is on `main`.

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
| 2 | venation: cells as data, HOLES and RIDGES as two renderings of one record, vein floor | built (§8, #341 merged) |
| elegance | the default becomes a pinned specimen; edge profile, teardrop club, groove/bulge segments, pointed tips, SET SPECIMEN | **built (§9)** — waits on Eva's ruling on `docs/img/bug-elegance-sheet.png` |
| edges | rounded edges (full bullnose on every wing edge, the default); Top view on load; Render / SVG toggle; the outline editor on the wing itself; the reference backdrop behind the whole bug | **built (§10)** — waits on Eva's ruling on `docs/img/bug-edges-sheet.png` |
| image | IMAGE → BUG: paste / drop / load a top-down picture, fit an editable bug to it (outline and proportions only) | **built (§11)** — waits on Eva's ruling on `docs/img/bug-image-sheet.jpg` and on her own pictures in the preview |
| wing library, step 2 | the BLENDED ROOT (every wing narrows to its own short, filleted attachment); every fitted wing a COMPLETE shape; the smoothness clause J | **built (§12)** — waits on Eva's ruling on the exploded sheet; the library file and gallery are not built yet |
| 3 | pattern (bands, spots, eyespots, negative space) | — |
| 4 | SVG import (roles, warps, blend) | **PARKED** (Eva, Oct 2) — built on `claude/lucid-hopper-sjgl2d`, PR #343 closed unmerged; see §3.7 |

Phase 2 started after Eva's ruling on the Phase 1 revision (§6.6, #326 merged).

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
- `--negative-control`: eleven mutations at the time (thirteen after §6.6), every one caught by the clause
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

### 6.6 Approved, with one fix: a refusal on a BLENDED pair says what to do

Eva approved the tail and the block (not thickening), with one fix before
merge. A linked middle pair has no drawing of its own, so "widen it there"
was not actionable on it.

- **The message:** each violating pair gets its own sentence. A linked middle
  pair's reads: "Pair 2 is narrower than the 1.00 mm floor (… — shown red in
  the view). Pair 2 is blended from pairs 1 and 3. Widen those, or unlink
  pair 2 to edit it directly." A drawn pair (first, last, the only one, or an
  unlinked middle one) keeps "… shown red in the editor and the view. Widen it
  there." One closing line for all: "Or lower the floor in Print."
  `floorViolations[i].blendedFrom` names the two drawn pairs.
- **Red in the view, whichever pair is open in the editor:** the builder
  emits each thin pair's narrow runs in world millimetres just above the top
  face (`wingPairs[k].thinSegments`, both wings). The 3D view tints that
  pair's wings red and draws those runs on top; the page's SVG preview draws
  them in red with the export's own frame. Both are view chrome — the
  downloaded SVG and STL bytes are unchanged by them.
- **Gate (N):** which pairs are blended is derived from the PARAMETERS (a
  middle pair not in `unlinked`), never from the violation record. A blended
  pair's refusal must contain the exact sentence naming pairs 1 and N and
  offering to unlink. A drawn pair's refusal must not call it blended. Every
  violating pair must have red segments for the view. New row: "blended pair
  under the floor" (`blendedThin()`: the crossing blend at 3 pairs, last pair
  36 mm at stretch 1.6 — pair 2 at 2.08 mm past the disc, pairs 1 and 3
  clear). Two new negative-control mutations: the refusal names no drawn
  pairs, and a thin pair not red in the view. Both are caught by N.
- **A builder defect found on the way:** at a floor/6 raster a sharp point's
  tip, thinner than a pixel, was never filled, so the builder read it up to
  0.5 mm shallower than the gate did (0.37 against 0.90 mm on one fixture).
  `THIN_RES` is now 12. That is ~1.4× the build time (default ~23 ms,
  tail on ~62 ms, Node). Randomize still blocks 0 of 200 bugs.
- **Verification:** `verify-bug --seeds 120` 174/174; `--negative-control`
  13 of 13 caught. The screenshot is `docs/img/bug-blended-refusal.png`
  (`node tools/shot-bug-blended.mjs <out.png>`, a real click of Get STL with
  pair 1 open in the editor).

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


## 8. Phase 2 — procedural venation

Built on `main` at `ecdeb0a`+. Files: **`bug-venation.js`** (new, pure 2D: the plan,
the cells, the holes), `bug-geometry.js` (the frame, the ridges, the floor, the
exporters), `bug.js` / `bug.html` (controls, editor overlay, read-out),
`tools/verify-bug.mjs` (the V family), `tools/shot-bug-venation.mjs` (the sheet,
`docs/img/bug-venation-sheet.png`), and `.github/workflows/bug-gate.yml` (§8.8).

### 8.1 Architecture — the cells are the data

The venation step does not draw strokes. `planVenation(outline, tailFlags, spec)`
takes the wing's DRAWN planform (scallops and tail included, the root tab excluded)
in millimetres, in the planform frame `(u, w)`, and **splits it into cells, chord
by chord**: every vein is a polyline whose two ends lie ON the boundary of the one
cell it cuts, and a cut replaces that cell by two. So the cells partition the wing
by construction — a shared edge is the same two doubles in both cells, the areas
sum to the wing's, no point is in two cells — rather than by a boolean operation
whose failure would have to be detected. Both STL renderings and the SVG read that
one record; the wing transform that places the slab places every vein and hole,
so the two exports cannot disagree about where a vein is (§1's law, unchanged).

Order of construction, each step a set of cuts:

1. **Main veins.** `veinCount` × `(1 + veinBranch)` TERMINAL paths. The targets are
   spread **evenly in ANGLE** about the middle of the root chord over the margin's
   angular extent (the margin within 14 % of the arc of either root corner,
   `ROOT_ARC_TRIM`, gets no target — seen from the root it is a few degrees wide
   and a target there was a stub to the margin beside the body). Each target is
   where the ray first leaves the planform, so a vein never crosses the outline.
   The veins **leave the root chord at distinct points** spread over its middle
   80 % (`ROOT_SPREAD_LO/HI`): one shared root point was built first and made
   every base cell a wedge a few degrees wide, too thin to cut, whose merges then
   snaked through the wing. A branching vein runs to a fork at 45 % of its stem
   (`BRANCH_AT`) and then to each of its targets. Arc-length targets were tried
   first and put slivers along the margin; see the module header.
2. **The tail.** When the bottom pair's outline carries a tail (§6.1's tagged
   group), the tail's tip is reached by its own vein: a two-segment chord from the
   root chord (or from the nearest vertex of the cell the tip lies in) through a
   point just inside the tail's base to the tip — a straight ray from the root
   exits through the trailing margin before it reaches the tip.
3. **The discal cell** (`discal`, `discalSize`, `discalPos`): one cross-vein
   closing the strip between two central paths (the boundary between two
   different main veins nearest `discalPos`) at `discalSize` of the way out; the
   root-side cell is tagged `discal` and no cross-vein is cut below the
   discocellular on either path.
4. **The pterostigma** (`stigma`, `stigmaSize`): two chords from the lead-most
   path, perpendicular to it, to the leading margin at `STIGMA_AT` 0.75 ±
   `stigmaSize`/2 of the way out; the cell between is tagged `stigma`, and no
   later cut may enter it.
5. **Cross-veins** (`crossDensity`, `cellRegularity`): `round(density × 10)` per
   strip between adjacent paths (and from the two outermost paths perpendicular
   to the margin, from a quarter of the way out), at the same fraction on both
   sides when regularity is 1 — a grid, the dragonfly polygon-net — and jittered
   on each side and staggered strip to strip as it falls toward 0.
6. **Vein width** is one law: `veinWidth × (1 − veinTaper × t)` with `t` the
   fraction of arc along the terminal path; every vein edge carries the width at
   its own position, cross-veins included.

**Every vein is a STRAIGHT chord.** A bow was built first; it is deferred (it is a
look Eva has not ruled on, and with the kernel-inset holes of the first attempt it
collapsed the hole of every cell on its concave side — the raster erosion below
would cut it fine now).

**A chord that cannot be routed inside its cell is DROPPED and counted**
(`stats.dropped`), never forced — a falcate hook or a notch between the root and
a target; the cells still tile.

**Cut endpoints snap to an existing vertex within 0.02 mm** (`SNAP_MM`): two
vertices microns apart make a sliver whose orientation is decided by rounding —
measured, a 7 µm pair put an inverted needle on the top face and a three-edge
contour loop in the SVG, which the gate's S clause caught.

### 8.2 HOLES and RIDGES — two renderings of one record

`venation` is a CHOICE (`none` / `holes` / `ridges`, default **none**, so the
Phase 1 wing is byte-identical — the gate's Phase 1 rows are unchanged). Per-pair
vein fields live in `WING_FIELDS` and are blended for linked middle pairs by the
same lerp as every other field (integer-stepped fields rounded: vein count,
branching, the two on/off flags).

**HOLES.** Every non-stigma cell is **eroded** by half the local vein width along
its vein edges and by `marginBorder` along its outline and root edges — a true
erosion of an arbitrary simple polygon (a merged cell is not convex), done on a
raster at `HOLE_PX` 0.05 mm (the cut-safe SVG's own pitch): each edge paints a band
of its own radius plus 1.5 px (so the hole stands at least its distance from
every edge, never less — the border band is also painted from the WHOLE wing
outline, because at a vein's tip the next cell's margin is nearer than the border,
measured 0.83 against 1.00 mm), the remainder is traced by marching squares and
simplified at just over a pixel. **One hole per cell**: if the erosion leaves
several components the material between them is a bridge narrower than the bands
that made it, so only the largest is cut (the gate measured two components of one
cell 0.47 mm apart). A cell whose hole cannot hold a disc of **`minCellMm`**
(default **1.5 mm**, a declared guess like every floor here) **merges with the
neighbour whose union is the most compact** (4πA/P²; the longest shared edge was
tried first and glued base wedges to the side of big cells, whose holes then ran
as snakes), the vein between them is dropped, and the pass repeats; what still
cannot be cut stays solid and says why (`holeReason`). A kernel inset (the
intersection of half-planes) was built first: exact for a convex cell, it
collapsed on every merged (concave) one, so every merge failed again and the whole
wing merged into one solid cell.

The frame is **ONE closed slab**: every cut cell is its outline with its hole
bridged in (the ear-clipping bridge, hole traversed clockwise) and ear-clipped
with every vertex kept — `triangulateCell` removes the (tolerantly) collinear
vertices other cells share on a straight vein edge, triangulates, and puts each
one back by splitting the triangle on its chord, so cells stay conforming and the
rim walk sees no T-junction; solid cells and the root tab (fanned over every
vertex on the root chord) go into the same vertex pool, keyed by coordinate. The
existing `planformSlab` then emits top, bottom and a rim along EVERY boundary edge
— the hole rims by the same directed-edge rule as the outer rim — so the HOLES
wing is one connected watertight solid by construction, which the C and W clauses
measure.

**RIDGES.** The slab is Phase 1's; every vein is a closed strip of rectangular
section (its own tapered width, from 0.15 mm inside the top skin to
`ridgeHeight` above it, default 0.6 mm) and the pterostigma a plate over its cell,
each its own closed part (kind `vein`) overlapping the slab — the export
contract's closed-shells-union.

**SVG.** In HOLES nothing is added: the cells ARE holes in the wing's projected
contour (nonzero fill), the paper-cut look. In RIDGES the veins are drawn as lines
on the wing at their own width, from the model's vein record (the ridge strips'
centrelines — their contours would stroke every vein twice), and the pterostigma
as a light-filled cell. **The lines are in `SVG_LINE`, the file's light line
colour, not black**: the wing's fill IS the ink, so a black line on it would be
invisible; this is a decision for Eva (§8.7).

### 8.3 The cell data format (what Phase 4 reads)

`model.wingPairs[k].venation` (one per pair, RIGHT wing; the left is the mirror):

```
{
  frame:     'planform mm: u along the span from the root chord, w along the chord
              (+ toward the head); the wing transform places it',
  rootChord: [[0, w], ...],            // every vertex on the root chord, trail -> lead
  outline:   [[u, w], ...],            // the wing polygon, CCW, root trail first; its
                                       // closing edge (last -> first) is the root chord
  veins: [{ id, kind: 'main' | 'branch' | 'cross' | 'discal' | 'stigma',
            points: [[u, w], ...],     // the chord as cut (straight)
            width: [w0, w1],           // mm, at its two ends (the taper law)
            t: [t0, t1],               // fraction of arc along its terminal path
            main, terminal, tail?, strip?, dropped? }],
  cells: [{ id, role: 'cell' | 'discal' | 'stigma',
            points: [[u, w], ...],     // CCW, closed implicitly, tiles the outline exactly
            edges:  [{ kind: 'outline' | 'root' | 'vein', vein?, width?, tail? }],
                                       // edges[i] describes points[i] -> points[i+1]
            holes:  [[[u, w], ...]],   // HOLES only: 0 or 1 polygon, CCW, inside the cell
            holeReason: 'cut' | 'too-small' | 'solid' | 'stigma' | 'bridge-failed' | null,
            mergedFrom: [cellId, ...] }],
  stats: { terminals, mainMade, crossMade, dropped: {main, cross, discal, stigma},
           cells, discal, stigma, wingArea, cellAreaSum, tailTargeted,
           holes?, merged?, solidCells?, minCellMm? },
  notes: []
}
```

Invariants the gate holds on it (V1): `Σ area(cells) = area(outline)` to 1e-9
relative; every `vein` edge is carried by exactly two cells in opposite
directions and every `outline` / `root` edge by exactly one; every cell is simple;
every `outline` edge lies on the planform. A consumer may rely on them.

### 8.4 The vein floor

`veinWidth × (1 − veinTaper)` (the tip width) and, in HOLES, `marginBorder` must
clear `minDiameter`. Under it, the pair gets a **`kind: 'vein'` floor violation**:
the STL is BLOCKED with the same shape of sentence as the drawn outline's
("Pair 1's veins taper to 0.30 mm, narrower than the 1.00 mm floor (the veins are
shown red in the view). Raise its vein width or lower its taper there."; a linked
middle pair's names the two drawn pairs and offers unlinking), the veins are
drawn red in the 3D view and the editor, and the read-out says UNDER the floor.
Blocking, not thickening, for §6.3's reasons. The defaults (1.2 mm, taper 0.15,
border 1.0 mm) clear the 1.0 mm floor.

### 8.5 Controls

Global (section Venation): `venation` (choice), `ridgeHeight` (0.2–2 mm, RIDGES),
`minCellMm` (0.5–5 mm, HOLES). Per pair (`WING_FIELDS`, blended on linked pairs,
shown only with veins on): `veinCount` 1–10 (4), `veinBranch` 0–2 (1), `discal`
0/1 (1), `discalSize` 0.15–0.95 (0.55), `discalPos` 0–1 (0.5), `crossDensity` 0–1
(0.1), `cellRegularity` 0–1 (0.6), `veinWidth` 0.4–3 mm (1.2), `veinTaper` 0–0.8
(0.15), `stigma` 0/1 (0), `stigmaSize` 0.03–0.4 (0.12), `marginBorder` 0.4–4 mm
(1.0). `DESIGN_VERSION` is 3; a v2 file loads with every new field at its default.
Randomize leaves venation off (not asked for; one line in `randomParams` the day
it is wanted).

### 8.6 Verification

- `node tools/verify-bug.mjs --seeds 40` (CI's own setting): **135/135 PASS**
  — 24 function checks and 111 built rows, every HOLES and RIDGES row
  watertight (boundary 0), mirror 0, one voxel region. `--negative-control`:
  PASS, every mutation caught by the clause that names it. The V
  family (V1 tiling, V2 holes inside their cells / apart by the narrowest vein /
  the border from the outline / the top face one connected triangle set / the
  stigma never cut, V3 a linked pair's terminals and root width equal the blend
  law restated in the gate, V4 the vein floor re-derived from the parameters and
  the ridge width MEASURED off the emitted strips, V5 a vein ends on a
  tail-tagged stretch of the outline, V6 discal and stigma) rides on every
  venation row beside M/W/P/C/F/S/R/O/N; the S clause learned that a hole is a
  legitimate interior loop (a stray loop is one that hugs neither the outline
  nor a recorded hole polygon, by point-to-SEGMENT distance — vertex-to-vertex
  read 6 mm against a hole's own loop and was the instrument's defect).
- `--negative-control`: eight record mutations beside Phase 1's thirteen — a
  cell vertex pushed, a cell dropped, a hole shifted across its vein, the stigma
  cut, the linked pair carrying the first pair's width, a vein floor violation
  unreported, the tail vein stopped short, a ridge strip missing — each caught by
  the clause that names it.
- **What the gate found while this was built** (each a class this repository
  already names): the needle from two vertices 7 µm apart (snap, §8.1); the
  border measured against the cell's own outline edges only (the whole-outline
  band, §8.2); two erosion components of one cell 0.47 mm apart (one hole per
  cell, §8.2); and in the gate itself the stray-loop instrument measuring to the
  wrong primitive and `minGap` accumulating across pairs (a thin-veined pair's
  legitimate 0.47 mm judged against the next pair's 1.02).
- **What the gate found on the dense HOLES rows, and all four are mesh
  conformity rather than venation** (the S clause's hairlines and V2's "top
  face in 9 pieces", seven rows at `--seeds 20`):
  1. **A NEEDLE on the bottom skin reads as a contour.** The ear clipper may
     admit a diagonal passing a thousandth of a millimetre from a boundary
     vertex — a 16 mm triangle 1.3e-3 mm tall. Its subdivided children share
     one nz (−1.31e-3) and carry DIFFERENT edge-length tolerances, so
     `contourLoops`' edge-on rule (|nz| under `EDGE_ON_REL` × Σ|e|²) counted
     the long children front and the short ones back, and the SVG stroked a
     hairline along the needle. Fixed at the source: `improveTriangulation`
     runs Lawson flips over each cell (interior diagonals only, strictly
     convex quads, flip when the smaller minimum angle rises); the thinnest
     frame triangle on that row went 1.3e-3 → 1.0e-2 mm.
  2. **`earClip` drops an exactly collinear vertex, which is a T-junction
     inside the frame.** A cross-vein's end sits exactly on the main vein it
     meets; once the ears around it are clipped it is collinear with its
     neighbours in the clipper's working list and is dropped, so the cell is
     covered by a triangle whose edge spans it while the cell across the vein
     keeps it (cell 78 of the irregular dense row: 32 vertices, 29 triangles).
     `planformSlab` then closes the unpaired edge with a WALL inside the
     material. The dropped vertex is still USED by the restored collinear fan,
     so "unused" is not the test — `reinsertUnused` splits every triangle edge
     that passes through a polygon vertex, on both sides. Every cell's
     triangulation now has exactly the cell's own boundary edges.
  3. **`holeLoops` carried the top rim only.** Under dihedral a hole's contour
     runs along the top rim where its wall faces away and along the BOTTOM rim
     where the wall faces up — 1.04 mm apart on a 1.2 mm sheet at 60° — so the
     gate read bottom-rim stretches as strays. The record holds both rims.
  4. **The tail vein is routed along the tail's medial line, from any vertex
     of the tip's host cell.** A straight run base → tip leaves a tail that
     bends (random:8 drips left then right and ends in two lobes), and when
     the lowest main vein hugs the trailing margin the tail's base straddles
     it, so the `via` point is in the next cell over; the candidates are now
     `[S, via, medial…, tip]`, `[S, via, tip]`, `[S, in-host waypoints…, tip]`,
     `[S, tip]`, starts root vertices first then the host's other vertices
     nearest the first waypoint (a vein branching off the one already there).
     And V5 reads the tail points off `part.meta.planform` — the DRAWN,
     scalloped outline, the planform owner's record — because a scallop pulls
     the trailing half (tail included) and the veins are planned on the drawn
     outline (random:6 read 0.023 mm off the raw tail tip).
- **Cost, EXPORT, from the sheet's own captions**: the default two-pair bug is
  24,656 triangles in RIDGES against Phase 1's 19,040-class slab; HOLES at
  cross-vein density 0 / 0.25 / 0.5 / 0.75 / 1.0 on the long wing reads
  38,800 / 57,168 / 62,880 / 69,824 / 71,728 triangles (84 × 42 mm SVG); the
  four-pair blended bug 110,096 in HOLES against 46,496 in RIDGES. The frame
  is subdivided twice, which is most of the HOLES cost.

### 8.7 Decisions made without a ruling (reversible)

1. SVG vein lines in the light line colour, not black (§8.2) — one constant.
2. Straight veins (§8.1) — `candidatesTo` is the one place a bow would go back.
3. `minCellMm` default 1.5 mm; `ridgeHeight` default 0.6 mm; `HOLE_PX` 0.05 mm;
   `SNAP_MM` 0.1 mm (0.02 was tried first and left vertices 7–37 µm apart); `ROOT_ARC_TRIM` 14 %; `ROOT_SPREAD` 10–90 %; `BRANCH_AT`
   45 %; `STIGMA_AT` 75 %; `CROSS_MAX` 10 — all constants with their reason in
   the source.
4. Vein fields are blended on linked pairs exactly like the outline fields (the
   brief's "middle pairs blend them like everything else").
5. The holes-vs-ridges STRENGTH question (§3.5) is still unmeasured: nothing has
   been printed. Both ship as a toggle; the coupon is still owed.

**PARKED, NOT FIXED** (Eva's ruling on PR #341, Oct 1 — approved as "good enough for
now" with the shipped defaults: density 0.1, min cell 1.5 mm, ridge 0.6 mm, border
1.0 mm). Two items are recorded here so they are scheduled rather than rediscovered:

- **The veins read maze-like / circuit-like.** The main veins are straight segments
  from the root and the cross-veins step between them at right angles, so a dense
  HOLES wing reads as a printed circuit rather than a wing. Reference image 1 has main
  veins FANNING from the root with gentle curvature, and cross-veins meeting the main
  veins at varied angles. Candidate future controls: a main-vein CURVATURE (a bow in
  `candidatesTo`, item 2 above — the one place it goes), and a cross-vein ANGLE
  VARIANCE. Neither is built; both would move every venation row's bytes and want
  their own sheet beside the reference.
- **The holes-vs-ridges print strength is still unmeasured** (item 5) and stays so
  until something is printed. No number in this document is a measurement of a part.

### 8.8 CI

`bug-gate.yml` runs `verify-bug.mjs --negative-control` then `--seeds 40` on
pull requests and pushes to `main` that touch `bug.html`, `bug*.js`,
`tools/verify-bug*.mjs`, `tools/bug-fixtures.mjs` or the workflow. The two flower
gates (`flower-export-watertight.yml`, `flower-geometry-quality.yml`) name the tools
they import rather than `tools/**` (#340, Oct 1 — the negations this PR first carried
were dropped in the merge as redundant), so a bug-only change runs the bug gate and
nothing else; the bloom gates list their files by name and never matched. Measured
on #341's own head: one Actions run fired, `bug-gate`, and neither flower gate.


## 9. The elegance pass — the default is a pinned specimen

Eva's ruling: the page read cute and blocky and must read ELEGANT by default
(§0). Her visual target is the lace reference — an anatomically realistic
butterfly under impossible lace wings. **The reference image is not in this
repository**; everything calibrated against it below was calibrated from her
description of it ("the body is a thin stalk under very large wings"), and the
sheet asks to be held beside it.

Files: `bug-geometry.js` (every control, the edge field, the terminations, the
segments, `specimenPose`, the new default and the legacy one), `bug.js` /
`bug.html` (the SET SPECIMEN button), `tools/verify-bug.mjs` (the B, X, G and Y
families), `tools/shot-bug-elegance.mjs` (the sheet,
`docs/img/bug-elegance-sheet.png`).

**Every new control has an OLD END that is a BRANCH back to the shipped code**, so
the cute bug is reachable bit for bit, not approximately. `LEGACY_STYLE` names
those ends and `legacyDefaultParams()` is the whole Phase 1/2 default; §9.6 has the
measurement.

### 9.1 The wing's edge profile (two controls, Wings)

- **`wingEdgeTaper`** (0–0.9, default **0.5**): the thickness falls linearly along
  the span from the pair's own thickness at the root to
  `max(floor, thickness × (1 − taper))` at its outermost point.
- **`wingEdgeBevel`** (0–4 mm, default **4 mm** — Eva's ruling on the sheet, where
  only the 4 mm cell visibly softened the slab edge in 3D; the first cut shipped
  1.2): within that distance of the
  drawn outline (the root chord excluded — it is inside the body) both skins ramp
  linearly down to the **floor exactly at the outline**: a chamfer.
- **Both 0 is the Phase 1/2 vertical-walled slab, by branch** (the same double on
  every vertex). It is a non-default setting now.
- Never under the floor anywhere, by construction (`edgeField`), and measured
  (B). The pair's own thickness default went 1.2 → **1.8 mm** so the taper has
  room to read (root 1.8 → the 1.0 floor at the margin).
- One owner of the drawn planform in millimetres, `drawnPlanformMm`, now read by
  the builder AND by `specimenPose`; `planformSlab` takes the half-thickness as a
  number or a function; the RIDGES strips and the pterostigma plate stand on the
  LOCAL top skin.
- **Why the chamfer carries the delicacy, not the taper** (Eva's note, recorded): at
  a 72 mm wingspan the 1.0 mm floor leaves almost no room for the taper — the root
  is 1.8 mm, so the whole taper is 0.8 mm across 41 mm of span, invisible from any
  normal viewing distance. The 3D delicacy comes mainly from the chamfer (the edge
  meets the floor on a 4 mm ramp instead of a vertical wall) and from print scale
  (a larger print gives the floor less of the wing's thickness).

### 9.2 The antenna club and the feathered antenna

- **Clubbed** is now a **TEARDROP** (`clubRadius`): the drop's thin tail toward
  the shaft — a gradual sin² swell over the final **`clubLength`** (0–0.5 of the
  antenna, default **0.22**) to **`clubWidth`** × the shaft (1–4, default **1.8**)
  — and its round head toward the tip, an elliptical close; **`clubTaper`** (0–1,
  default **0.35**) moves the peak back and draws the end from 0.55 of the club's
  width (a rounded end) down to the floor. Never under the floor (a function
  check samples the whole grid of its controls).
- **`clubLength` 0 is the old ellipsoid knob, by branch.**
- `clubWidth` is a THIRD club control where the brief named two (length, taper):
  without it the club's size is a constant and "subtle" cannot be tuned. Flagged
  as a decision (§9.9).
- **Feathered** under pointed tips is a **LEAF**: 15 pinnae a side whose lengths
  follow a lanceolate envelope (longest a third of the way out, vanishing at the
  tip), swept toward the tip, each a floored wire ending in a point. With pointed
  tips off, the old fan of 11, by branch.

### 9.3 Abdomen segment style (Abdomen)

**`segmentStyle`** (0–1, default **0**): a bulge ↔ groove axis.
- **0 GROOVE**: a continuous tapered abdomen with each segment boundary a fine
  INCISED line — a Gaussian groove `GROOVE_SIGMA_MM` 0.18 mm wide cutting
  `GROOVE_DEPTH` 12% of the local radius. The body loft gets its own stations
  across every groove, the boundary itself among them, so the SVG's segment line
  is read off the groove's own ring (the gate caught a first cut whose station
  de-dup dropped the boundary's ring).
- **1 BULGE**: the old beaded constrictions (`BAND_DEPTH`), **by branch** — no
  groove stations, the old envelope.
- Between: `style` of the bead and `(1 − style)` of the groove, multiplied.
- `banding` is relabelled "Segments marked" and still switches segmentation off.

### 9.4 Pointed terminations (one toggle, Body)

**`pointedTips`** (default **on**): the abdomen tip, the tarsi and every antenna
(and pinna) end taper to points instead of ending round.
- A pointed tube end closes in a cone whose apex stands `TIP_POINT` 2 × the last
  ring's radius beyond it; **the last ring is at or over the floor** (it is a tube
  ring, floored like every other), and the tarsus end carries no ball.
- **The cone closes on a NIB 0.16 mm across (`TIP_NIB_MM` 0.08), not on a point,
  and the reason is measured**: with a mathematical apex, 5 of 40 random bugs read
  **2 cut-safe SVG regions** — a cone drawn diagonally in projection thins past one
  0.05 mm raster pixel before its apex and the 4-connected union cuts the tip off as
  an island; every island was at a leg, antenna or pinna tip, and the same bugs with
  rounded ends read 1. The nib clears two pixels on any diagonal and is far under
  anything a printer resolves. The fix is in the geometry, not the raster.
- The **pointed abdomen**: a cosine fall instead of the ellipse (it meets the axis
  at a finite slope — a tip, not a dome), floored at the floor's radius over all of
  the abdomen but a final cone 1.6 floor radii long that closes on the loft's apex.
- Off: balls and the old dome, by branch.

### 9.5 SET SPECIMEN

A button beside Randomize. `specimenPose(params)` returns slider values and notes;
nothing about it is a mode and every value stays editable after:
- **forewings pulled forward** until their INNER MARGINS (root trail → tornus) form
  one straight line square to the body axis. The tornus is the trailing-half point
  farthest outside the apex–root-trail chord, read off the drawn planform in mm —
  the polygon the builder triangulates. With pitch 0, a planform direction
  (du, dw) lands at world dy = −du sin(sweep) + dw cos(sweep), so the margin is
  square at **sweep = atan2(dw, du)**; the mirror puts the left margin on the same
  line. **The sweep slider is −90…90° so the pose never clamps** (Eva's ruling; the
  first cut's −30…70° clamped random:6, which needs −43.1°). The bound is an
  argument, not a sample: every outline point sits at u ≥ 0 (`OUTLINE_BOUNDS`) and
  the root trail at u = 0, so du ≥ 0 and atan2(dw, du) lies in [−90°, 90°] for any
  wing the randomizer or the editor can produce. The gate's Y now REQUIRES the
  margin square on every specimen row (a clamp is a failure), and a function check
  runs the pose over 400 random bugs and requires no clamp note;
- **every wing flat** (dihedral 0, pitch 0, on every drawn and unlinked pair);
- **legs tucked** (`legReach` 0);
- **antennae a symmetric V** (curl 0, spread 22°).
The hindwings' sweep is left as it is (a specimen's hindwings are tucked under the
forewings by hand; nothing in the brief derives it).

### 9.6 The new default, and the old one kept reachable

| | new default | old (Phase 1/2) |
|---|---|---|
| head | 2.4 mm | 4.0 |
| thorax | 5.0 × 2.9 × 2.9 mm | 7 × 5 × 4.6 |
| abdomen | 15 × 2.2 mm, taper 0.75, 7 segments, GROOVE | 15 × 5, taper 0.5, 6, beads |
| legs | tucked; coxa / femur / tibia / tarsus 0.9 / 4.0 / 4.2 / 3.4 mm, pointed | splayed; 1.2 / 5 / 5.5 / 4, balls |
| antennae | clubbed teardrop, 17 mm, straight V at 22° | filiform 10 mm, ball tip |
| forewing | angular apex, straight-to-slightly-concave outer margin, clear tornus; 41 mm; sweep **−25.59° derived by the pose** | rounded, 26 mm |
| hindwing | rounded fan, scalloped margin (0.06 × 8); 29 mm, sweep 14° | rounded, 20 mm, sweep 32° |
| wings | flat; 1.8 mm root tapering to the floor; 4 mm chamfer (was 1.2 on the first cut) | dihedral 12 / 8, 1.2 mm slab |

- **The body : wingspan ratio landed on: 3.39×** — body (head front to abdomen
  tip) **21.3 mm**, wingspan (tip to tip, top-down) **72.1 mm**, read off the model
  by the sheet; the old default was 2.18× (24.3 / 52.9). The body is **2.9 mm**
  wide at its widest under a 72 mm span (the old one 5.0). A real butterfly sits
  near 3×; "many times" and "a thin stalk under very large wings" pushed past it.
  It is two sliders (the wing lengths) to move.
- **The default IS its own specimen pose**: the forewing sweep is not typed — the
  module applies `specimenPose` to `DEFAULTS` once at load (a function check holds
  it).
- **Cute stays reachable, measured bit for bit**: `legacyDefaultParams()` builds
  **identically to `main`'s default** (23,248 triangles, every position `Object.is`)
  and, against a worktree of `main` at `20efd53`, **55 configurations** — the
  default, 40 random bugs, 6 HOLES and 6 RIDGES random bugs, clubbed and feathered —
  each with `LEGACY_STYLE`, read **0 differing of 2,432,178 floats**.
- **One honest exception, and it is a refinement of the TUCK, not a new control**:
  on a slim body the tucked legs showed **6.3%** of their area outside the body from
  above (gate L bars 2%) — the femur's straight run crossed a floor-wide waist that
  only the JOINTS were held inside. The tuck now holds each joint inside the
  NARROWEST body width along the segment reaching it, folds the coxae onto the
  midline, and keeps **0.08 mm off the midline** (`TUCK_MIDLINE_GAP`: ON it, the left
  leg is the right one's exact mirror and the two tubes coincide face for face — the
  welded STL read 1,506 non-manifold edges). Applied only while tucked
  (`legReach` < 1), so at reach 1 the old arithmetic is untouched (the 55-row
  identity above is at reach 1). It does change bugs with reach between 0 and 1,
  which Randomize draws (0.75–1). New default exposure: **1.65%**.
- A design saved before this pass (`DESIGN_VERSION` < 4) loads with
  `LEGACY_STYLE` for the fields it does not carry, so it **looks as it was saved**
  (function check D, bit-identical). Randomize starts from the new default, so random
  bugs now carry the new style.
- The hindwing was made a little shallower at 60% of its span so the existing
  starter TAIL still fits it (the gate's T rows went vacuous on the first cut).

### 9.7 OPEN — the margin fringe (cilia). NOT BUILT, NOT DECIDED.

**Status, Eva's ruling: OPEN.** Option C below is *not* adopted: a scallop does not
read as hair, and the frayed / hairy margin is key to the target look. Revisit with
Phase 4 (lace / SVG import), where fine line work is the medium. The table and the
recommendation that followed it are kept as the record of what was weighed.
**It STAYS OPEN after Phase 4 was parked (Eva, Oct 2)**: the lace branch carried only a
design proposal for it (Option A via a fringe import, its §10.9), nothing built, and with
the lace import parked that revisit no longer has a home — the fringe is still undecided.

The fine hairs along a wing's margin are a key part of the target look and cannot
survive the floor: a cilium is ~0.01–0.05 mm across, the floor 1.0 mm. Options, for
Eva's ruling:

| | A. SVG-only fringe | B. Floored comb | C. Fringe-like scallop |
|---|---|---|---|
| What | hairlines along the margin drawn into the SVG from a **fringe record in the model** (the RIDGES vein lines are the precedent: lines read off a model record) | real teeth along the margin, each a closed floored solid (≥ 1.0 mm wide, ≥ 1.0 mm apart), carried by both exports | a high-count, shallow scallop / serration OF THE OUTLINE itself (a third margin law beside scallop) |
| Look | the only option that actually looks like cilia — any density, any fineness | an eyelash or a comb: at 1 mm pitch on a 72 mm wing, ~70 coarse teeth a side, never hair | a crenellated or fringed edge; reads as fringe at a distance, as teeth up close |
| One-model law (§1) | **breaks its spirit**: the SVG would carry geometry the STL does not. The letter survives (both read one model, and the record says it is SVG-only), but "the two exports cannot disagree" becomes "they disagree by declaration" — exactly what §1 exists to prevent, so this needs a ruling and an explicit `svgOnly` role, not a quiet line | holds | holds: it IS the outline, so the SVG, the STL, the editor and the floor all see it |
| Floor / print | nothing printed | every tooth at the floor; cut-safe stays one region (teeth are attached); many thin free cantilevers — the weakest part of the print, unmeasured | the drawn-width floor (§6.3) already polices it: a tooth narrower than the floor turns the STL red, so its density is capped by the floor at the wing's own size |
| Cost | none in the STL; the SVG grows by the hair count | large: hundreds of closed parts per wing | small: outline points only |

**Recommendation at the time (superseded by the ruling above — kept as a record):** C for what prints, with A considered only as an
explicit, labelled SVG-only layer if the paper / laser output must carry real hair —
because A is the one option that changes §1. B is listed for completeness and is the
one I would not build: it costs the most and looks least like the thing.

### 9.7b Parked observation — RIDGES reads as busy stripes

On the sheet the new default in RIDGES mode reads as busy parallel stripes across
the wing rather than as venation. Recorded as an observation only; nothing is
changed for it. Candidates when it is picked up: fewer / thinner ridges on the
specimen default, ridge height falling toward the margin, or main veins only.

### 9.8 Verification

- `node tools/verify-bug.mjs --seeds 40` (CI's setting): **174 / 174 PASS** after the
  ruling (173 on the first cut) — 29
  function checks (the new one: Set specimen never clamps on 400 random bugs, sweep
  −48.2…5.0° inside −90…90°) and 145 built rows (the old 135 + the elegance rows: the legacy
  default; every new control at both ends; segment style 0.5; feathered pointed and
  rounded; filiform and bristle pointed; a 2-part pointed abdomen; floor 0.6 and 2.0
  mm against the edge law; HOLES and RIDGES with a 2 mm chamfer; the specimen pose on
  the new default, the old default, 4 pairs and 6 random bugs). 5 m 57 s on this box.
- The four new families, each with an expected value owned by the parameters or
  restated in the gate and a measured side read off emitted vertices:
  **B** the edge law restated from the parameters and the drawn planform against the
  top/bottom pair of EVERY planform point (1e-9 mm), nothing under the floor, every
  outline vertex at the floor under a chamfer (802 such vertices on the default);
  **X** every pointed end's last ring ≥ the floor and its apex ≥ a ring radius beyond
  it, no ball left, the abdomen ≥ the floor above its restated tip cone;
  **G** each boundary's dip against the same bug with segments unmarked, at least
  half of what the style asks (a first version compared neighbouring rings and read a
  bead as missing where the envelope still rises steeply — biased, rewritten);
  **Y** the inner margin square off the emitted vertices with the tornus by the gate's
  own rule, every wing's mid-surface flat, the antennae straight.
- `--negative-control`: **PASS, 28 mutations + the L control**, seven of them new — the
  seventh (after the ruling) rebuilds random:6 with its sweep clamped at the old −30°
  bound and requires Y to fire;
  an outline vertex thinned under the floor (B, F), the chamfer missing the outline
  (B), a pointed end blunted onto its ring (X), a tip ring thinned (X, F), a groove
  filled (G), the forewing margin not square (Y). The L control had assumed the
  default bug is splayed; it builds a splayed bug explicitly now.
- **Cost, EXPORT**: the new default **30,512 triangles, 1,490 KiB STL** (old 23,248 /
  1,135); in HOLES 53,120, in RIDGES 31,920. The extra triangles are the groove
  stations and the 56-ring teardrop antenna; the edge field moves vertices and adds
  none. Build ~0.25 s in Node at the default (the edge field's distance-to-outline is
  per vertex).
- Welded-STL non-manifold edges (unrated, never gated): the new default **8**, against
  `main`'s own default **36**.
- The sheet: `node tools/shot-bug-elegance.mjs <dir>` → `docs/img/bug-elegance-sheet.png`.
  SET SPECIMEN is a REAL click of the page's button. No pixel claim anywhere.
  **The committed sheet predates the ruling**: its "new default" cells carry the
  first-cut 1.2 mm chamfer; its "edge chamfer 4 mm" cell is what the default is now.

### 9.9 Decisions made without a ruling (reversible)

1. The new outlines (forewing 12 points, hindwing 10), lengths 41 / 29 mm, the 1.8 mm
   root thickness, taper 0.5 and first-cut chamfer 1.2 mm — tuned by eye on renders (the chamfer is now 4 mm by ruling).
2. **`clubWidth`** — a third club slider beyond the brief's two (§9.2).
3. The **feathered leaf rides the terminations toggle** (pointed ⇒ leaf, rounded ⇒ the
   old fan) rather than a control of its own.
4. **One toggle for all three terminations** (abdomen, tarsi, antennae).
5. `TIP_POINT` 2, the 0.16 mm nib, `GROOVE_SIGMA_MM` 0.18, `GROOVE_DEPTH` 0.12, the
   abdomen tip cone 1.6 floor radii, `TUCK_MIDLINE_GAP` 0.08 — constants with their
   reasons in the source.
6. The specimen V is 22° straight; the pose leaves the hindwing sweep alone. (The
   forewing sweep range is now −90…90° by ruling, so it never clamps.)
7. The tuck refinement (§9.6) changes partially splayed legs, not only tucked ones.
8. Pre-v4 designs load at the old ends (§9.6).


## 10. The edges + editor pass — no 90° cliff on a wing, and the editor on the wing

Eva's brief (Oct 2): every wing edge a full bullnose, the round radius a slider
whose default and maximum is half the local thickness, never thinner than the floor;
the page opening in the Top view; a Render / SVG toggle in the Top view; the outline
editor drawn ON the wing being edited in the SVG view, with the edited wing shown
flat; the reference backdrop behind the whole bug. Files: `bug-geometry.js` (the
bead, `insetLoops` / `insetMesh`, `editorFrame`, `buildBug`'s `flatPair`),
`bug.js` / `bug.html` (the view, the toggle, the on-wing editor, the toolbar),
`tools/verify-bug.mjs` (the E family, Q, the rows and the mutations),
`tools/shot-bug-edges.mjs` (the sheet, `docs/img/bug-edges-sheet.png`).

### 10.1 The rounded edge — one construction for every free edge

- **`wingEdgeRound`** (Wings, 0–1, default **1**) — the bead's in-plane radius as a
  fraction of HALF THE LOCAL THICKNESS: 1 is the full half-round (radius = half the
  thickness), 0 is the old square wall, **by branch** (the bead is never built, the
  shipped slab verbatim — the 55-row legacy identity of §9.6 still reads through it,
  and `legacyDefaultParams()` carries `wingEdgeRound: 0`). A fraction and not
  millimetres because the thing Eva named is "half the local thickness", and that
  is a different number at the root (1.8 mm sheet) and at the tip (the 1.0 mm
  floor): a mm slider would be the full bead at one end and a flattened one at the
  other.
- **The silhouette does not move.** The two skins stop short of the drawn outline
  by the radius `a` and a bead closes them, its apex — its mid-plane point — exactly
  ON the drawn outline (or the planned hole). So the SVG projection of a flat wing is
  the drawn outline to the double (gate E7), the editor's curve is still the wing's
  edge, and the drawn-width floor (§6.3) reads the same polygon it always did.
- **The profile is a half ellipse**, semi-axes `a` in the plane and the local
  half-thickness `H` across it — a half-round at round 1, flattened as round falls,
  tangent to both skins (no step) and vertical only at its apex; `EDGE_ROUND_SEGMENTS`
  6 facets (30° each, even so the apex is a ring vertex). On every boundary point a
  ring of 7 vertices from the top skin's edge through the apex to the bottom skin's;
  the root chord (inside the body) carries the same ring along its vertical wall so
  rings always match point for point, and the bead grows in over the first 1 mm of
  span (`ROUND_ROOT_RAMP_MM`).
- **`a` never exceeds half the thickness at the skin's new edge** — a fixed point of
  `a = round x h(P - a n)`, since that is where the bead's height is taken; a
  subdivision midpoint on a concave stretch (where the edge law's chord midpoint is a
  hair thinner) steps its skin edge back until it holds (measured up to 0.12% over
  before that step).
- **It never removes material below the floor.** The skins are only inset — their
  thickness is the edge law's (§9.1), unchanged, and gate B still holds it at every
  planform point — and the bead's height IS the local thickness (≥ the floor, gate
  E5). The radius is held to `ROUND_ROOM_FRAC` 0.45 of the material's local width
  (an inward ray to the nearest other boundary), so the two beads of a narrow strip
  never meet: a 10% flat always remains.
- **How it is built**: the boundary LOOPS are inset before triangulation and the
  moved loops are what is triangulated (`insetLoops`, the plain and RIDGES wings and
  the pterostigma plate) — a notch tighter than the bead shrinks the radii of that
  stretch until the inset loop no longer crosses itself. In HOLES the frame's cells
  are fragile to re-triangulate (a first cut that re-planned the cells moved holes
  out of their cells: 92 cut-safe regions), so the coarse frame mesh's boundary
  points move in place instead (`insetMesh`) and any triangle that would flip or
  collapse below 5% of its area shrinks its corners' radii. Either way the subdivided
  skins conform and the slab is one closed shell.
- **RIDGES**: the ridges are rounded too — a half-ellipse top across the vein's
  half-width, `round x min(half-width, ridge height)` high (at the defaults, 1.2 mm
  veins 0.6 mm tall: a half-round rod lying on the skin); a ridge that runs out to the
  drawn outline stops one bead radius + 0.05 mm inside it and ramps down over the last
  2 x the ridge height into the skin, so no end wall stands over the margin's bead.
  The pterostigma plate carries its own bead (its apex on its cell, like every bead;
  where it meets the leading margin it stands over the wing's own bead — pulling it
  inside the wing's flat skin was tried and, on a narrow stigma cell, ate the whole
  room and made the SVG contour chain asymmetrically).
- **The chamfer and the taper stay** (`wingEdgeBevel`, `wingEdgeTaper`); the chamfer's
  default went **4 mm → 0** (the bullnose is the default edge profile; a chamfer under
  a bead still works — it brings the edge to the floor and the bead is then a 1 mm
  rod), the taper stays 0.5 (it is the thickness law along the span, not an edge
  profile). Square-edged slab: round 0 and chamfer 0.
- **Designs**: `DESIGN_VERSION` 5. A version-4 file knows no round radius and loads
  with it at 0 — the square-walled chamfer it was saved with, bit for bit (function
  check D); older files load at the old ends as before (§9.6).

### 10.2 The bullnose against the 1 mm floor — the veins become near-round rods

Measured on the sheet, sections drawn from the two facing beads' emitted vertices:
- HOLES default, a vein near the root: **1.26 mm wide × 1.53 mm thick, flat 0.12 mm**
  — bead radii 0.57 against H 0.77 (the room, 0.45 x the width, binds before the
  round): an upright near-round rod.
- Veins at the floor (width 1.0, sheet 1.0): the beads are full half-rounds (radius
  0.5 = H) wherever the vein is wide enough, and the 10% flat keeps the rod from
  pinching — the vein reads as a **round rod at the floor's own diameter**.
- A 3 mm sheet over 1.26 mm veins: the vein is taller than it is wide and the bead an
  upright ellipse (radius 0.57 under H 1.25) — the room, not the round, decides it.
- Over the default HOLES bug **123 of 1,520** hole-rim beads past the root are at the
  full half-round; the rest are room-limited (the veins are narrower than the sheet is
  thick near the root). On the plain default **756 of 780** outline beads are full;
  the rest are the forewing's angular apex, whose ear is tighter than the bead.

### 10.3 The page

- **Opens in the Top view.** 3/4, Front and Side stay one click away. The 3D picture is
  centred in the space left of the control panel (`setViewOffset`).
- **Render / SVG toggle**, upper right of the viewport, shown in Top only: SVG puts the
  export's own projection — exactly what Get SVG writes (`exportSvg` of the model,
  cut-safe when that box is ticked) — on paper in the main viewport. **The small SVG
  inset is removed** (the main view replaces it); the cut-safe box and the size note
  stay in the View box.
- **The outline editor is ON the wing.** In SVG mode a click on a wing selects its pair
  (pair 1 is on top); points are edited on the RIGHT wing in place, the left is drawn
  mirrored live (dashed) and rebuilt by the model. Everything the old editor did
  carries over: drag, double-click the curve to add, right-click / Delete to delete,
  blocked self-crossing with its reason, the red below-floor runs (now the view's own
  thin-preview), the TAIL toggle on the bottom pair with amber tail points. A linked
  middle pair offers **Unlink this pair to edit it** (the panel's own unlink law). A
  click on bare paper, Escape or Done ends the edit.
- **The edited pair is displayed FLAT** (`buildBug(params, { flatPair: k })`: dihedral
  and pitch 0 for the picture only), so a screen drag maps exactly onto the outline
  through `editorFrame()` — sweep, stretch and length, a rigid motion and two scales.
  The parameters never change; the real model (tilted) is rebuilt when the hand rests
  and always before an export (`realModel()`); the toolbar says the pair is shown flat
  and what its tilt is. When the edit ends the pose comes back. **While a pair is edited
  the view's frame is FROZEN** — a frame that grew with the wing rescaled the picture
  under the pointer and a 16 px drag moved the apex 7.7 mm (measured, the first cut).
- **The reference backdrop** sits in the main viewport behind the whole bug, placed in
  WORLD millimetres (centred on the bug, as wide as the bug when loaded), so it stays
  put while the outline is edited; opacity / scale / offset in the floating toolbar;
  while one is loaded the bug's fills are drawn see-through so the photo reads under
  them. Never saved, never exported (as before).
- **The separate editor panel is removed.** Nothing needed it: outlines are drawn in
  Top → SVG, and every other per-pair value is still in the panel.
- **The 3D wings are drawn smooth-shaded when the edge is rounded** (a bead is tangent
  to its skins, so vertex normals are honest); a square-walled slab keeps flat facets.

### 10.4 Verification

- **E** (every row): E1 every bead ring a half ellipse off its own emitted skin and
  apex vertices (1e-9 mm where the wing is untwisted; a pitched wing is a helicoid, so
  there the world chord carries the twist and only the "never more than a half-round"
  bar is checked, at 1%), E2 no square wall left (and at round 0 every rim point has
  one and no bead is recorded), E3 no rim point past the root left square, E4 every
  apex on the drawn outline or a planned hole and every planned hole vertex some
  bead's apex (every hole rim rounded), E5 every bead as tall as the floor, E6 no
  top-skin triangle flipped (off the emitted vertices on a flat wing), E7 a flat wing's
  silhouette is the drawn outline in world mm past the root ramp (inside the first
  2 mm a ring next to a much smaller one can carry the contour along its 60° vertex,
  ≤ 0.13 a inside the outline — 0.029 mm measured on the blended row).
- **Q** (function check): three drags — a tilted forewing at stretch 1.3 / sweep −20,
  a tilted hindwing at stretch 0.8 / sweep 35, an unlinked middle pair at stretch 1.6
  / sweep 50 — each performed exactly as the page performs it (SVG units → world →
  `editorFrame.fromWorld` → `moveControlPoint`), and the landing MEASURED on the
  emitted bead apex of the moved point in the rebuilt flat display: **0 mm** off (to
  1e-9); the control points are drawn on the emitted wing; the flat display leaves
  every part but the edited pair bit-identical to the real model. In the browser the
  sheet's REAL pointer drag on a tilted hindwing lands **0.000 px** from its target.
- **Two instrument corrections**, both found by the new geometry, neither a loosening:
  V2's "top face" was triangles with normal z > 0.5, and a rounded rim's sloped bead
  facets read as extra "pieces" — it is the slab's own layout now (all three vertices
  top-skin); and Y read the specimen margin off top-skin vertices, which the inset
  moves off the outline — it reads the bead apexes now (its mutation shears the wing,
  rings and all).
- **Negative control**: seven bead mutations (a bead flattened to a square wall → E3,
  dented → E1, thinned under the floor → E5, the silhouette pushed past the outline →
  E7, a hole rim left square → E4, square walls under a round asked for → E2, a skin
  triangle flipped → E6) and three broken editor frames (stretch ignored, sweep the
  wrong way, the edited wing not displayed flat → Q), beside the existing ones.
- **Cost, EXPORT**: default **30,512 → 46,992 triangles (+54%), 1,490 → 2,295 KiB**;
  HOLES 53,120 → 84,400; RIDGES 31,920 → 50,880. The bead is 12 triangles per rim point
  (6 quads) against the wall's 2. Build ~80 ms at the default in Node (the chamfer's
  per-vertex distance is gone from the default); ~230 ms in HOLES.
- The sheet: `node tools/shot-bug-edges.mjs <dir>` → `docs/img/bug-edges-sheet.png`.
  Every page cell is a real click or a real pointer drag; no pixel claim anywhere.

### 10.5 Decisions made without a ruling (reversible)

1. The round radius is a FRACTION of half the local thickness (0–1), not mm (§10.1).
2. The chamfer's default went to 0; the taper stays 0.5.
3. Six facets on the bead; the 0.45 room fraction (the bloom's `RIM_ROOM_FRAC` value);
   the 1 mm root ramp; ridges ending one bead radius + 0.05 mm inside the outline with
   a 2 x height ramp; the stigma plate's bead on its own cell edge.
4. The SVG view draws the bug with see-through fills while a backdrop is loaded; the
   backdrop lives in the SVG view only (in the 3D render a photo cannot be registered
   to the perspective camera).
5. The toggle defaults to Render (the page loads as the 3D top view); the floating
   toolbar sits bottom centre; the editor's frame is frozen while editing.
6. Older sheet tools (`shot-bug-sheet`, `-venation`, `-elegance`, `-blended`) drove the
   removed editor panel through `__bug` hooks that now point at the on-wing editor;
   their committed sheets stand as records and were not re-shot.


## 11. Image → bug — fit an editable bug to a top-down picture

Eva's brief (Oct 2): paste, drag in or load a top-down picture of a butterfly, moth or
dragonfly and the page does its best to replicate it as an editable bug, so she does not
trace by hand. **Outline and proportions only — veins, spots and pattern are out of
scope** (they are filled away). Lace import stays parked (§3.7) and is untouched.

Files: **`bug-image.js`** (new, pure: no DOM, no canvas — the page hands it a canvas's
`ImageData`, the gate an identical `{width, height, data}` rasterised in Node),
`bug.js` / `bug.html` (the "From an image" section, paste / drop, the split line and the
erase brush on the Top → SVG view, the backdrop placed by the fit),
`tools/verify-bug-image.mjs` (the IM family), `tools/verify-bug-image-fixtures.mjs` (the
synthetic pictures), `tools/shot-bug-image.mjs` (the sheet, `docs/img/bug-image-sheet.jpg`).
**`bug-geometry.js` is untouched**: nothing here builds geometry — the import returns
params, and `buildBug` builds them like every other bug.

**In-browser, classical image processing, no library.** Every step is a few dozen lines
of array code (Otsu, a chamfer distance transform, 4-connected labelling, crack-following
contours, a convex hull); a CDN library (OpenCV.js is ~8 MB) would cost more to load than
it saves to write, so none is used.

### 11.1 The pipeline

1. **Segment** (`segment`). Luminance, a 3×3 blur, a threshold — **Otsu's** unless the
   slider sets one — and the **polarity read off the picture's border** (the border is
   background; the subject is whichever side of the threshold the border is not), with an
   **invert** toggle. The brush's erased pixels are removed, the **largest 4-connected
   shape** is kept, and its holes are filled (a spot in a wing is pattern, not a hole).
   The picture is drawn to a canvas at most `WORK_MAX` 560 px on its long side first.
2. **Symmetry** (`findAxis`, `upright`). The mirror axis is **searched**, not assumed
   vertical: every 3° over a half turn through the centroid, then refined to 0.1° and a
   sub-pixel offset, scoring the fraction of the shape whose mirror image is shape. The
   head is taken to be the end nearer the TOP of the picture — **a guess, with a Flip
   button** (there is no reliable head/tail cue in a silhouette: a butterfly's head often
   hides between its forewings). The shape is resampled upright, and **each cell is the
   average of the shape at X and at −X** — the two halves averaged — and from then on only
   the RIGHT half is used, so the model's mirror (§2.1) makes the bug **mirror-exact by
   construction**, whatever the picture's asymmetry.
3. **Body** — the narrow central column. The rows where wing pieces ATTACH (touch the
   body cut) split the column into a head above and an abdomen below. Measured: the body
   length (head front to abdomen tip), the head's width (`headSize`), the abdomen's widest
   visible width. The thorax is UNDER the wings and cannot be seen: its length is
   `THORAX_SHARE` 0.24 of the body (the default specimen's own share) and its width 1.1×
   the wider of head and abdomen. The head block stops at a gap, at a sudden widening, or
   once it is longer than 2.2× its width — a moth's feathered antennae merge into one
   blade above the head, and the first cut read them as 9 mm of head. Everything is
   clamped into the existing slider ranges; the body is always 3-part.
4. **Wings.** The upright half beyond the body column (1.15 × its half-width + 1 px),
   with thin attachments — an antenna against a wing, a splayed leg — removed by an
   **opening-by-reconstruction** of radius 0.02 × the half-span (0.72 mm at 72 mm; wider
   than a 1 mm antenna, narrower than a tail neck). The opening acts on the WING region
   only: **a first cut opened the whole picture and took a slim abdomen off with the
   antennae** — behind the hindwings an abdomen is about as wide as an antenna, so width
   cannot tell them apart; where they are can. Pieces under 20% of the largest are
   dropped (a feathered antenna's blade survived as a "7 mm wing").
   - **2–4 separate pieces** (a dragonfly) are 2–4 pairs, front to back; the middle pairs
     come back **unlinked**, each with its own fitted outline.
   - **One mass** is one pair, or two if its outer margin has a **notch** deeper than 6%
     of the wing (the deepest point of the outline inside its convex hull, away from the
     body). Then a **SPLIT LINE** runs from the notch to the body — square to the body by
     default (a pinned specimen's inner margin is) — drawn in Top → SVG as a pink line with
     two handles. **Dragging either handle refits both pairs live** (a refit per animation
     frame): the outer end **snaps to the nearest point of the outline** (so it slides
     along the margin; a line ending inside the wing would let the halves meet round its
     end), the root end slides along the body, kept off the attachment's ends. The line
     is a WALL: the mass minus the wall falls into pieces, each in front of or behind it —
     beyond the notch the line means nothing (an infinite line handed a forewing tornus
     that hangs back past the notch to the hindwing, and the first cut grew a strip out to
     the forewing's tip).
   - **THE HIDDEN OVERLAP — the guess, stated.** What of the hindwing lies under the
     forewing cannot be seen. The hindwing's hidden leading edge is taken to be **the split
     line moved FORWARD by 8% of the wing's extent, alongside the segment only and clipped
     to the visible silhouette**: the hindwing tucks under the forewing along a band.
     Nothing of the guess can show from above (the forewing is drawn over it, and the band
     lies inside the picture's own silhouette); in the model the two pairs overlap the way
     real wings do. In the page's see-through SVG view (a backdrop loaded) the band reads
     as a darker bar under the forewing — that bar IS the guess, made visible.
5. **The fit** (`fitOutline`). Each wing's outline is traced (crack following, Gaussian
   smoothing σ 1.2 px), the stretch along the body cut removed, its two ends brought to
   `u = 0` (inside the body, hidden under it), and mapped into the pair's own `(u, w)`
   frame: **sweep 0, the pair's hinge exactly where the model puts it** (read off
   `editorFrame`), length = the apex's distance from the hinge, stretch raised only if the
   chord would leave the drawing area. Control points are chain points (Catmull-Rom
   interpolates them): inserted at the worst deviation until every control segment is
   within the **tolerance in mm**, both ways (chain to spline and spline to chain — an
   overshoot counts as much as a missed bump), then **pruned** — the point whose removal
   hurts least goes while the fit stays inside the tolerance and the outline stays valid.
   **The FEWEST points**, the slider's one job: on the butterfly 26 / 37 points at 0.1 mm,
   9 / 11 at 0.6, 4 / 5 at 3.
6. **The tail** (`findTail`, `tailGroup`). The bottom pair's region opened at 7% of its
   extent; a removed piece reaching more than 12% of the extent and 2.5 opening radii
   from the opened wing, at least as long as its mean width, behind the wing's middle, is
   a tail. Its tip is kept as a control point; after the fit, **the control points inside
   the tail (grown back by the opening radius, so the neck goes with it) become the tagged
   TAIL group** (§6.1) and the TAIL toggle is ON. The anchor is chosen so that
   `composeOutline(base, tail)` puts every point back **exactly** where the fit put it
   (checked to 1e-9), and the base without the tail must be a valid outline on its own —
   else the tail stays inline in the outline and the note says why. Off, the tail goes and
   nothing else moves.
7. **The result is ordinary state.** `imageToBug` returns params — normal control points,
   normal sliders — normalised by the geometry module's own `normalizeParams` (an outline
   it would refuse is a failed fit, never a substituted default). The bug the picture is
   fitted onto is **the one on screen when the picture arrived**: its legs, antennae,
   venation, floor and edge settings are kept; its body and wings come from the picture;
   every wing is flat (dihedral 0, pitch 0 — a top-down picture shows a flat planform),
   with no scallop (the outline carries the shape). Savable like any design; the picture
   is not saved (§5.1's backdrop rule).
8. **The backdrop.** The picture is loaded automatically as the reference backdrop, placed
   by the fit's own transform — **rotated, scaled and offset in world millimetres** — so
   the fitted bug sits on the source in Top → SVG (the view switches there on import). The
   toolbar's opacity / scale / offset still work on it. A teal outline shows what the
   segmentation found and the brush's strokes show red ("show what was found").

**The scale.** A picture carries no millimetres. The **Wingspan** slider (20–130 mm; it
starts at the bug's own span when the picture arrives, 72 mm on the default) sets it,
tip to tip; every length follows from it.

### 11.2 The rules apply to the fitted outline — and the one repair

- **Self-crossing / pinch**: the fit is validated by the geometry module's own
  `outlineValid`; a fit that will not validate gets more points, then a tighter tolerance
  (said in a note), and failing that is **refused** — never a broken bug.
- **Mirror diff 0, watertight, one connected region**: properties of the model; every
  fitted fixture is built in the gate as an ordinary row through every clause (M, W, P, C,
  F, S, R, O, N, E, B, X, G…) and passes.
- **The drawn-width floor is NOT repaired**: a fitted wing narrower than the floor
  somewhere (a tail tip at a coarse tolerance, measured on the swallowtail at 3 mm) shows
  red and blocks the STL exactly as a drawn one does (§6.3), and the import's message says
  so — widening is Eva's.
- **The one repair — a stray contour line.** At some fitted tips tighter than the
  bullnose bead (§10), the bead folds and the SVG grows a contour loop out in the wing
  (the gate's S clause bars any more than 0.5 mm inside the outline; measured 0.70 mm at
  the swallowtail's paddle end at tolerances 0.4–1.0 mm). The import builds the fitted bug
  once, and if a stray line stands more than 0.4 mm inside, **moves the tolerance** — tighter
  first, then looser — to the first value that builds clean, and **says so** ("the fit
  tolerance was moved from 0.60 to 0.33 mm: at 0.60 mm the rounded edge folded at pair 2's
  outline…"). If none does, the fit is kept and the note says where the line is. This is a
  builder robustness edge the import can only step around, recorded rather than fixed here:
  a hand-drawn tip that tight would fold the same way.

### 11.3 Refusals — said in the page, the bug left as it was

`segment` refuses when more than 55% of the picture reads as subject, when the shape runs
along more than 15% of the picture's edge (**"the background is too busy to find one clear
shape — try another threshold, invert, or erase the stray regions with the brush"**), or
when the shape is under 1% of the picture; `findAxis` refuses below 80% mirror match ("no
clear symmetric shape — the best mirror axis maps only N% of the shape onto itself"); the
column and wing steps refuse when there are no wings beside a narrow body. A refused fit
changes nothing about the bug: the message says the bug on screen is unchanged (or is the
last good fit of that picture), and the picture and what was found stay on screen so the
threshold, invert and brush have something to work against.

### 11.4 Page

"From an image" is a section at the top of the control panel: Load picture (and Ctrl/⌘V
anywhere, and a drop anywhere on the page), Threshold (+ automatic), invert, Wingspan,
**Fit tolerance — fewer points ↔ closer fit**, Wing pairs (auto / 1 / 2 — 3 and 4 need
wings that are visibly separate), find a hindwing tail, Flip head ↔ tail, **Erase brush**
(paint over stray regions in Top → SVG; brush size; Clear erasing), show what was found,
Close picture. The message line under them is the fit's own report: pairs and how they
were found, each pair's control points and how close the fit is, the tail, the body length,
the mirror axis and its symmetry score, the notes (repairs, a refused tail), the floor, and
the time. **A refit replaces the wings and body** — editing after a fit is ordinary editing,
and the next refit (any import control moved) discards it; every refit starts from the bug
as it was when the picture arrived, so moving a slider twice does not compound.

### 11.5 Verification

- **IM** in `tools/verify-bug.mjs` (which runs in CI as `bug-gate`), against synthetic
  pictures DRAWN FROM KNOWN BUGS (`verify-bug-image-fixtures.mjs`: every part's own contour
  loops filled at 6 px/mm, 3×3 supersampled, rotated −5…4°, the left half stretched
  1.5–2.5%, background-coloured spots in the wings, a paper gradient, Gaussian noise σ 9):
  a butterfly (the default specimen), a swallowtail (its TAIL on), a moth (one pair, a light
  bug on a dark ground, feathered antennae), a dragonfly (two separate strap pairs, a
  34 mm abdomen), a butterfly with a stray blob joined to a wingtip, and the butterfly over
  420 overlapping dark blobs. **The reference is the KNOWN bug, never the fit's own
  reading**: IM1 pairs and mode; IM2 the axis within 1°; IM3 the fitted right wings' union
  silhouette within `tol + 3 px + half the asymmetry at the tip` of the known one
  (boundary distance) and a mean offset within `tol / 2 + 1 px`; IM4 mirror-exact from an
  asymmetric picture; IM5 the tail found (its tip within the IM3 bound) and not found where
  there is none; IM6 the busy picture refused with no params; IM7 the tolerance's two ends;
  IM8 the split line moved — both pairs refit, the union unchanged; IM9 the stray blob
  spoils the fit and the erase mask restores it; IM10 the body length within 3 px + 2% and
  the abdomen width within 3 px of the known bug (the head size REPORTED — a head is often
  hidden between the forewings' roots or merged with the antennae: the moth reads 3.9 mm
  for 2.4). Measured at 0.6 mm: the four fits within **0.50–0.67 mm** of the known outlines
  (bounds 1.37–1.55), mean offsets **0.17–0.18 mm**, axes within **0.1°**, body lengths
  within **0.3 mm**.
- **IM3 was entangled in its first version and the negative control is what said so**: it
  placed the fitted bug in the picture through the FIT'S OWN transform, so a deliberately
  wrong scale (the mutant reading the half-span as 0.9 of it) moved both sides together and
  the clause stayed green — the fourth durable rule (CLAUDE.md) in a new family. Both bugs
  are placed by the KNOWN transform in millimetres now, the fitted one shifted along its
  body axis only (to the known wings' centroid — the one freedom the import legitimately
  has). A second correction: an IoU bar was tried first and dropped — it is a property of
  the wing's WIDTH, not its outline (a strap wing read 0.946 at a 0.50 mm boundary distance).
- **Every successful fit is also an ordinary built row** (`image: <name> (fitted)`) through
  every clause of the gate.
- **`--negative-control`** adds ten CODE mutants of `bug-image.js` (every anchor checked to
  match exactly once before any runs; each copy written beside the module and imported): a
  busy picture accepted (all three refusal layers off — disabling the border test alone is
  NOT that defect: the mirror score still refuses the busy picture, which the first run of
  this mutant measured as a miss), the axis assumed vertical, the scale misread, no tail
  grouped, the split line ignored, the tolerance ignored, the erase mask ignored, separate
  wings taken as one mass, the polarity not read off the border, the body read 15% short —
  each caught by the IM clause that names it.
- **The sheet** (`node tools/shot-bug-image.mjs <dir>`): the four fits, each loaded through
  a different real route (the file input, a dispatched PASTE event, a dispatched DROP),
  beside the source, in Top → SVG over the backdrop and in 3D at 3/4; the split line at
  three positions by real pointer drags on its handles; the tolerance slider at both ends
  with the point counts read back; a real brush stroke over the stray blob; the busy picture
  refused with the page's message. **Every picture on it is synthetic — Eva's own reference
  pictures are not in the repository, and how the import does on real photographs can only
  be judged by trying them in the preview.**
- **Cost**: a fit is ~200–300 ms in the page for these pictures (one build of the fitted
  bug for the stray-line check included), ~1.5 s when the tolerance repair runs; the gate's
  IM family adds ~8 s. The fitted bugs are 24,000–71,000 triangles (the default bug is
  46,992).

### 11.6 Decisions made without a ruling (reversible)

1. **The head is the end nearer the top of the picture**, with a Flip button — there is no
   reliable cue.
2. **The hidden overlap**: a band up to 8% of the wing ahead of the split line, tapering
   to nothing at the notch, alongside the segment, inside the silhouette
   (`HIDDEN_OVERLAP_FRAC`; the taper is §11.7's).
3. **The default split runs square to the body** from the notch.
4. **The thorax is 0.24 of the body** and 1.1× the wider of head and abdomen (it is under
   the wings).
5. **Legs, antennae, venation, floor and edges come from the bug on screen**; every fitted
   wing is flat with sweep 0 and no scallop.
6. **Sweep 0, the hinge where the model puts it**: the drawn outline is the picture's wing
   relative to the model's own hinge, so the silhouette lands where the picture has it.
   Stretch rises above 1 only when the chord would leave the drawing area (the default
   butterfly's forewing comes back at stretch 1.29).
7. The constants in §11.1 (`THIN_OPEN_FRAC` 0.02, `NOTCH_MIN_FRAC` 0.06, the tail's 7% /
   12% / 1.0, `PIECE_MIN_FRAC` 0.2, the refusal bars, the 0.4 mm stray bar) — each with its
   reason in `bug-image.js`.
8. The tolerance cannot always reach 0.1 mm: points closer than 0.015 of the wing length
   are not added (the outline rule refuses neighbours under 0.012), so the closest fit on
   the butterfly reads 0.14–0.16 mm, and the message says the number it reached.

### 11.7 Round 2 — Eva's Morpho photo: the body, clutter, the wingspan

Eva tried a real Morpho photograph on PR #346. The outline fit was good; three things were
not. Each fix below is gated (IM11–IM14), and the sheet is
`node tools/shot-bug-image-fixes.mjs <dir> --base <worktree of the previous commit>` →
`docs/img/bug-image-fixes.jpg`.

**1. The body was swallowed — two causes, both fixed.**
- **Cause one: the body was measured when it could not be seen.** On a photograph whose
  dark body touches the dark wing roots, no narrow column shows between the wings — only
  the abdomen's TIP below them.
  - The old fit measured that tip: abdomen 1.65 mm, head and thorax at their slider
    minimums, on the gate's same-tone picture. That reproduces Eva's 1.5 mm.
  - The body now carries a CONFIDENCE. It is measured only when at least `ABD_SEEN_FRAC`
    (6%) of the wingspan of abdomen shows below the wings, at least `ABD_WIDTH_SHARE`
    (0.6) of the fallback's width.
  - Otherwise it is ESTIMATED: the default specimen's body (`defaultParams`, one owner)
    scaled by the fitted wingspan over the default's own wingspan.
  - The page says which, and why ("Body ESTIMATED from the wingspan — only 2.1 mm of
    abdomen shows below the wings…").
  - Measured visible abdomen: 9.3–31 mm on the clean pictures (13–41% of the wingspan),
    2.1 mm (2.9%) on the same-tone one.
- **Cause two: the wing ROOT ran down the body.** A wing's outline closes on its root
  chord (u = 0 at the model's hinge, inside the thorax). The old chord spanned every row
  the picture's wing touched the body — on the hindwing, the whole length of the abdomen
  — so the two wings covered the body as one plate whatever its width.
  - The root now attaches only along the THORAX's span (|y| ≤ half the thorax length).
  - Beside the abdomen (or the head) the wing's inner edge stays in the outline, ON the
    body's edge (the cut at 1.15 × the body's half-width + 1 px).
  - A pair that touches the body only beside the abdomen (a hindwing whose root is under
    the forewing) gets a strip along the body's edge up to the thorax. The strip is
    hidden under the pair ahead of it, at least twice the print floor wide and joined to
    the thorax over at least twice the floor, so the wing's neck never falls under the
    floor (it did at first, 0.8 mm).
- **The hidden band now tapers** to nothing at the notch. Its square end was a hook
  tighter than the bead, which folded there: a stray SVG contour line on the same-tone
  picture.
- **IM11** asserts the source (estimated on the same-tone picture, measured on every
  other) and that an estimated body is no narrower than the default proportions at that
  wingspan. Its reference is computed in the gate from `defaultParams`, not read from the
  importer's own fallback.
- **IM12** asserts no fitted right-wing point beside the abdomen or head lies inside the
  BUILT body's own surface (per 0.5 mm band). The points within 1 mm of the thorax's span
  are the root, which attaches there by design.
- Measured: 0.29–0.57 mm outside the body on every picture.

**2. Clutter, and refusals that name their step.**
- Step 1 now drops clutter before anything is measured:
  - a shape running along more than 4% of the picture's edge is the GROUND (a table, the
    far side of a paper edge);
  - a shape whose largest hole is at least 10% of its filled area ENCLOSES the bug (a
    sheet of paper in view);
  - of the rest, the largest shape is the bug, and every smaller detached mark (a scale
    bar, text) is ignored and counted.
- The polarity is chosen by the same rule: the polarity whose best acceptable shape is the
  larger, no longer the border's median alone. A dark table along a white sheet's edge
  turned that median the wrong way round.
- Busy is refused when the kept shape is under 25% of everything that stands out (the busy
  picture: 3%).
- The symmetry check runs on that one shape. The previous commit on the gate's two clutter
  pictures:
  - the paper corner with a table larger than the bug: refused as busy, because the table
    was the largest shape and ran along 46% of the edge;
  - the whole sheet on a table: refused, because the sheet read as the subject (60% of
    the picture).
  - Both fit now (IM13).
- Every refusal names its step — "step 2 of 5 (finding the mirror axis) failed: … the shape
  it found is outlined on the picture…" — and returns the shape for the page (IM14).
- The page switches "show what was found" ON when a fit is refused, and draws the dropped
  clutter in amber beside the teal outline and the red erase.
- What made Eva's attempt read 41% is not known: the photo is not in the repository. The
  clutter pictures are the best reproduction of what she described.
- **The price of the frame rule:** a bug with ONE see-through window over a tenth of its
  area (a glasswing) reads as a sheet. Forcing the polarity with the Invert box turns the
  frame rule off.

**3. The wingspan slider was wired; the labels were the problem.**
- Measured in the page: the slider at 20 fits a bug 20.06 mm tip to tip, at 130 one 130.0
  mm. Nothing in the wiring was wrong.
- The two numbers Eva compared are different quantities. The SVG note is the size of the
  FILE: the whole bug with legs, antennae and margin, 76.1 mm for a 72.1 mm wingspan. And
  a refit the picture refuses leaves the last good fit on screen while the slider keeps
  the asked value.
- The label is now "Wingspan, tip to tip (sets the fit's scale)".
- Its readout adds "— the bug on screen is X mm (this wingspan was not fitted)" whenever
  the two differ.
- The SVG note says "(the file: the whole bug, legs and antennae and margin included; the
  wingspan alone is X mm)".



## 12. Wing-shape library, step 2 — the blended root, complete wings, smoothness

Eva's ruling on the step-1 candidate sheet (17 of 20 kept; #6, #15, #19 struck as under
the floor; the near-duplicate out): before the library or the gallery is built, two
outline-quality fixes that affect EVERY bug, not only fitted ones. The reference sheets
stay out of the repository (`tools/bug-wing-sources/`, gitignored); the dev-time batch fit
is `tools/bug-wing-library-fit.mjs` (`--kept` re-fits Eva's 17 and writes the exploded
sheet). **The library data file and the gallery UI are not built yet** — they wait on her
ruling on the exploded views.

### 12.1 The blended root

Every wing closed on a straight root chord at u = 0: left at its drawn width it was a
vertical cut beside the body, and a forewing and a hindwing side by side read as one
rectangular block. Two controls (Wings): **`wingRootPinch`** (0–1, default **0 — Eva's pick
from the ladder**; 0 is the old straight root chord, BY BRANCH — the map is never built) and
**`wingRootLength`** (0.5–2×, default 1, shown only when the pinch is on): how far out from the
body the narrowing reaches. It scales the neck's offset from the body's silhouette and the
release back to the drawn wing together, LINEARLY — the release is derived at length 1 and
then multiplied (re-deriving it over the longer stretch read the root edges wider and grew
3.2× at ×2), and the two-floor minimum is applied after the length. Length 1 is the derived
root unchanged. The range stops at 2×: at 2.5× and up a full pinch left one flipped sliver
facet where the wing meets the body's silhouette (a 0.47–0.58 mm contour loop, measured).
**The image fitter follows the pinch**: with the straight chord (pinch 0) it keeps the root the
picture shows along the thorax and bridges only the hidden stretches — the narrow anchors
either side of the hinge are a neck, right only when the model blends it (at pinch 0 their
embedded root tab stood past the body beside the head: IM12 −2.5 mm, IM3 up to 6 mm on every
fixture). And every bridge's JOIN to the seen margin is kept as a control point: where a
hidden edge emerges, the two wings' edges cross at a shallow angle, and a fit free to sit a
tolerance off each edge slid that visible crossing by tolerance / sin(angle) — 1.74 mm on the
same-tone fixture against `main`'s 0.83, 0.745 with the joins kept. The IM checks fit at the
default pinch 0; the blended branch of the fitter has no IM row of its own (recorded gap). Since the default pinch is 0 the gate
carries its own blended-root rows — the pinch ladder, the length range, 4 pairs, holes and
ridges, the dense net, and every random bug given a seeded pinch and length (the page's
Randomize leaves the root off).

- **The pinch is RELATIVE to the drawn root (Eva's ruling on the first cut).** The first cut
  was two absolute controls, a 1.6 mm neck and a 0.9 mm fillet, and it pinched the default's
  4.51 mm root to a third of its width, carving teardrop gaps beside the body. Now the neck
  at pinch 1 is `ROOT_NECK_AT_FULL × the drawn chord` (never under the floor) with fillet radius `ROOT_FILLET_AT_FULL × the drawn chord`
  — the FULL neck at pinch 1 — and a lower pinch MIXES the straight chord with that full
  neck, `w' = w + pinch (full(w) − w)`: the neck lands at `h0 − pinch (h0 − hr)`, both ends
  fractions of the wing's OWN root, so one pinch reads the same on every shape. **Shrinking
  the fillet radius with the pinch was built first and REJECTED BY THE GATE**: a smaller
  copy of the same curve turns through the same angles, so a low pinch was a small kink
  (J fired on six rows). Mixed, every slope and turn scales with the pinch (the effective
  fillet radius is the full one over the pinch), and a convex mix of two increasing maps
  is increasing, so the map stays a bijection; its inverse is solved by bisection. The
  release is never shorter than two floors (a 1.55 mm root on random:29 read two 0.6 mm
  lobes inside a millimetre). `ROOT_NECK_AT_FULL` 0.355 and `ROOT_FILLET_AT_FULL`
  0.2 make pinch 1 the first cut exactly on the default forewing (1.60 mm / 0.90 mm, 57,392
  triangles, unchanged). The floor at the neck still holds (`hr ≥ floor / 2`). The ladder
  (pinch 0 / 0.15 / 0.3 / 0.45 / 0.6 / 1, default bug and library shape #9) is
  `node tools/shot-bug-wing-root.mjs <dir> --library <candidates.json> --num 9`.

- **One map, in planform millimetres, read by every consumer**: `rootWarp(spec)` —
  `w' = c(u) + f_u(w − c0)`, u unchanged. `drawnPlanformMm` applies it (so the builder,
  the venation, the floor, the specimen pose and the SVG all see it) and `editorFrame`
  composes it (so the on-wing editor draws the shaped curve and a drag lands where the hand
  put it — the map is inverted exactly). Drawn, fitted and library wings all go through it.
- **Each side separately**: the band between the root chord's centre c0 and each ROOT EDGE
  (the outline walked from the root lead / root trail — only the outline NEAR the root, so
  a hindwing's inner margin running down beside the abdomen is not taken for its root) is
  SCALED so the edge lands on the envelope; what lies beyond a root edge is only SHIFTED by
  the same amount, never crushed. For every u the map is monotone in w, so it is a
  **bijection of the plane: it cannot make a simple outline cross itself**, and it moves no
  point along the span (the apex, the tail, every index stay put). The centre moves from c0
  to the hinge, so **each pair attaches at its own hinge; between hinges the thorax shows.**
- **The envelope**: the neck half-width `hr = max(width, floor)/2` at `un = ub + R`
  (`ub` the body's silhouette, half the thorax's local half-width beyond the hinge); toward
  the body a parabola with curvature radius R at the neck (the FILLET) reaching 45° at the
  silhouette, easing back to horizontal at the root chord inside the body — C1 everywhere.
  A quarter circle was tried first: it ends vertical at the silhouette, leaving a convex
  corner where the rounded edge folded (a stray SVG contour line). The drawn edge and the
  envelope meet through a SMOOTH minimum (a plain min left a corner there too). Outward,
  the map releases to the drawn wing over `blend = max(0.1 L, 2.5 R, 1.0 × the narrowing)`
  by a smoothstep — a deep squeeze released over a short span was a kink the bead folded on.
- **The bead starts at the silhouette** (1 mm short of it) instead of at the root chord:
  the stretch inside the body is hidden, and the bead ramping through the fillet folded.
- **The floor at the neck**: the neck is never narrower than the floor (`hr ≥ floor/2`).
  The drawn-width measure reads the polygon WITH its root tab and judges nothing inside the
  body (u < 0) — the root chord is no edge any more (the wing runs on into the body), and
  read as one it flagged the stub's corners (0.53 mm "thin" on the default). Without the
  blended root the measure is exactly what it was. The gate's N clause restates the same.
- **Venation through the neck**: every main vein leaves its root-chord point THROUGH the
  neck (at the same fraction across its middle 80%) — a straight chord from the root chord
  to a margin target would leave the wing at the neck (4 of 8 terminals dropped on the
  pterostigma row before; 2 after). The fan's angles are taken from the neck's middle.
- **The outline is resampled at 0.5 mm where the map moves it**, so the fillet is drawn,
  not chorded; `part.meta.denseAt` maps a dense sample to its planform point (the editor's
  apex lookup, the gate's Q and V5 read it).
- **Robustness, said**: a pair whose rounded edge still cannot be inset (a hook at the root
  tighter than the bead) steps down — half the fillet, no fillet, the drawn root chord — and
  `model.notes` says so; a map that would make the outline cross or pinch keeps the drawn
  root chord, with a note. Neither fires on the default or on the 17 library shapes.
- **Saved designs keep the old root** (`DESIGN_VERSION` 6; a file saved before loads with
  `wingRootPinch` 0 — `PRE_ROOT_STYLE`): every earlier pass loaded an old design at its OLD
  ends so it looks as saved (§9.6, §10.1), and this follows that rule. One slider turns the
  blended root on for an old design; the reverse (migrating) would change every saved
  design's silhouette without asking. `LEGACY_STYLE` carries `wingRootPinch: 0`, so
  `legacyDefaultParams()` still builds bit-identically to Phase 2.
- **Cost, EXPORT**: the default **46,992 → 57,392 triangles (+22%)** (the resampled root
  zone under a 12-triangle-per-point bead). Build time is unchanged in practice.

### 12.2 Every wing a complete shape on its own

The fitter used to keep, as the wing's outline, whatever bounded its region in the picture:
the straight SPLIT line between fore- and hindwing, the straight edge of the band the
hindwing is tucked under, the strip to the thorax, the run along the body. Viewed alone a
wing had flat cuts and hooks wherever the other wing hid it. Now (`completeChain` in
`bug-image.js`): a point of the traced chain is SEEN when it lies on the picture's own
silhouette margin, UNSEEN when it lies inside the silhouette (8 probes 2 px out all shape)
or on the body cut; the stretch of each end within 12% of the span from the body (the ROOT
ZONE) is unseen too. Every unseen run between seen stretches is replaced by a cubic Hermite
tangent to the seen margin on both sides; each END is a cubic from the seen margin to the
pair's ROOT ANCHOR on the body's edge beside its own hinge, arriving square to the body.
So the hindwing's hidden leading edge is a smooth convex curve under the forewing, the
forewing's inner margin a smooth curve from its tornus to its root, and every fitted wing
narrows to its own attachment (the blended root then shapes the last millimetres). A seen
stretch shorter than 1 mm between unseen runs is noise on a wall and joins them.

The image gate's IM3 is compared only beyond the KNOWN bug's own blended roots (read off
the known model, never off the fit): within each pair's root map both bugs carry a designed
root, not the picture's. IM10's abdomen width is read from the rows behind the thorax: with
the blended root the rows just behind a wing's neck show the thorax's rear as body column
(the moth read 3.61 mm for 2.20 before).

### 12.3 The smoothness clause, J

`jaggedness(outline, floor)` in `tools/verify-bug.mjs`, on every built row, reads the DRAWN
outline before the scallop law (`part.meta.drawnMm`, root map applied), vertex by vertex: a
vertex's curvature under 0.05 /mm is straight; consecutive vertices turning the same way are
a RUN, which counts at ≥ 6° in all; a one-vertex run is a CUSP, a longer one a LOBE. The
outline is **jagged** where two consecutive counting runs of opposite sense (with no more
than the floor of straight between) are both CUSPS (a zig-zag) or both LOBES shorter than
0.8 × the floor (a wobble finer than the print can make — the noise of a fit that followed
the pixels).

**How it tells a deliberate scallop from jaggedness**: the scallop SLIDER is a law the
builder applies on top of the drawn outline, so it is deliberate by construction and the
clause reads the outline it is applied to. A wave DRAWN into the control points (a
picture's real scalloped margin) is a run of lobes separated by notches; every lobe of a
scallop that prints is longer than 0.8 × the floor, so lobe-against-lobe below that scale
never occurs in a printable scallop, and the Catmull-Rom spline never makes cusps. What the
clause cannot tell from a deliberate shape is a deliberate wave of smooth lobes finer than
the floor — which the floor would not print either. (Reading the post-scallop polyline was
tried first: every scallop notch is one polyline vertex, and on a small wing a lobe is two
or three vertices, so cusp-against-cusp appeared on deliberate scallops; it was the wrong
subject, not a wrong threshold.)

Negative control: `a jagged outline` lays a zig-zag (±0.2 mm every 0.4 mm) along the
forewing's drawn margin and requires J to fire.

### 12.4 Decisions made without a ruling (reversible)

1. `ROOT_NECK_AT_FULL` 0.355 and `ROOT_FILLET_AT_FULL` 0.2 (pinch 1 = the first cut on the
   default forewing); the default pinch is 0 (Eva's ruling), the length 1; `ROOT_BLEND_FRAC` 0.1, `ROOT_BLEND_SLOPE`
   1.0, `ROOT_SAMPLE_MM` 0.5; the neck sits one fillet beyond the body's silhouette.
2. Saved designs keep the straight root chord (12.1).
3. The fitter's root zone is 12% of the span; bridges are cubic Hermites with tangents 0.6
   of the chord; a library shape whose fit falls under the floor at 0.6 mm is re-fitted at
   the nearest tolerance that clears it (#15, the zebra swallowtail, at 0.45 mm), never
   widened by hand.
4. **Found, not fixed — a pre-existing cut-safe island.** The blended root moves the
   default forewing's DERIVED sweep (-25.59° -> -27.34°: the specimen pose reads the inner
   margin off the shaped outline). At -27.34° (and at -20°) the gate's
   "tail ON, 4 pairs, one unlinked" row reads 2 cut-safe regions: the swallowtail's drawn
   tail tip is narrower than two 0.05 mm raster pixels on the diagonal and leaves a
   one-pixel island on ONE side. Measured identical on `main` at `d1fac30` with the same
   sweep — not this change. Since the root became a relative PINCH the derived sweep moves
   with the default pinch (-26.12 at the provisional 0.3, where four more tail rows read the
   same island, again identical at pinch 0), so EVERY tail row now pins its forewing sweep
   to main's -25.59 (`TAIL_ROW_SWEEP` in the gate, with this note beside it) — their
   subject is the tail, not that tip, and a change of the default must not flip them.
5. **IM12's mutant is retired, not passing.** "The wing root runs down the body" fired
   nothing once the root was blended: the fitter's completion replaces the root zone with
   a bridge to two anchors on the thorax, and the model narrows every wing to its neck —
   the mutation stayed silent even with the completion switched off as well. IM12 still
   asserts on every fit; it has no live mutant, recorded as a gap.
6. **Two pre-existing slivers the root exposed, both fixed.** (a) A vein-to-margin cut
   materialised its start point without the 0.1 mm snap every other cut uses, so a foot
   landing 0.3 µm from a cross-vein's foot left two vertices that far apart once the holes'
   merges took both veins away — a 0.78 mm contour hairline (gate row "holes: cross
   density 1, long wing"). It is snapped now. (b) Under the blended root every main vein
   converges on the neck, so the cells between them are long thin wedges whose ear-clipped
   slivers flip facing under the wing's bend (0.59 mm, "holes: irregular dense net"); the
   frame mesh gets a Delaunay pass under the root only, so every design with the straight
   root chord keeps its triangulation byte for byte.
7. **A pre-existing watertightness hole the pinch landed on, fixed.** A vein's end is
   inserted ON an outline edge, exactly collinear with that edge's ends, and the cell's ear
   clip could return flat triangles along the outline; subdivided, their slab's rim walk
   lost its way — 24 boundary edges on "holes: 3 pairs, 8 -> 3 veins" at pinch 0.3 only
   (identical with the Delaunay pass and the snap both removed). `flipDegenerate` flips a
   flat triangle across its long edge, or drops it when that edge IS the outline; it visits
   no other triangle, so a mesh without one is byte-identical. And the negative control's
   "fold a wing top face" mutant pushed the top vertex nearest the centroid 3 mm along y —
   right by luck of the vertex it landed on: once the pinch moved the centroid it landed on
   an outline vertex, which only reshapes the outline, and S stayed silent. It now takes the
   nearest INTERIOR top vertex (the slab's own `meta.slab.n`, rim vertices excluded) and
   pushes it past its farthest neighbour, which folds the face at every pinch.

## 13. Wing-shape library, step 3 — the library file, the gallery, RANDOMIZE WINGS

The library is `bug-wing-library.js`: 17 entries, Eva's kept shapes from the step-1 sheet,
each a forewing and a hindwing outline in the editor's planform units, the chord stretch each
was drawn at, the hindwing's length as a ratio of the forewing's, and an optional tail group
(one entry, #16, has one). **Outlines only — there are no whole-bug presets.** The data is
the fitter's output; the stock-art sheets it was fitted from stay in the gitignored
`tools/bug-wing-sources/`. Entries are unlabeled (`name: ''`); a name typed on the page for
the last applied shape is kept in that browser only.

### 13.1 Apply — what it writes, and nothing else

`applyWingShape(params, shape)` (bug-geometry.js) is the one function that knows what applying
may write: the first pair's points / stretch / sweep / scallop, the last pair's points /
stretch / sweep / scallop / length, the cleared `unlinked` map and the tail group. Every other
byte of the params — body, legs, antennae, venation, thickness, tilt, the pair count, the
forewing's length — is untouched, and LB2 holds that against a list RESTATED in the gate.
With 3–4 pairs the shape lands on the first and last pairs and the middles blend (an unlinked
middle is cleared). With one pair the forewing outline is the pair. With no wings the shape is
stored and the page says to add a pair (the pair count is not a shape setting).
Applying is undoable on the page (an undo stack of whole params; Undo, or Ctrl/⌘ Z outside a
text field); a randomize and a randomize-wings push onto it too.

### 13.2 RANDOMIZE WINGS

`randomWingBlend(params, seed)` picks two different shapes (keyed on their ids since §15.1) and a t in [0.1, 0.9] (two decimals,
rounded BEFORE the blend, so the label "blend of #a and #b at t" is the t used), blends them
(`blendWingShapes`: each outline resampled apex-aligned in TRUE planform — w times its own
stretch — mixed, divided by the mixed stretch, re-expressed as control points; the tail is the
nearer shape's) and applies it. A blend that crosses, whose tail does not fit, or that puts a
wing under the floor (read off the BUILT model) is RE-ROLLED, up to 24 times, then a plain
library shape. Over the gate's 88 rolls 10 re-rolled once. The whole-bug Randomize calls it on
its own seeded stream for every bug with wings, and the page prints the label.

### 13.3 Decisions made without a ruling (reversible)

1. **Applying sets the scallop depth to 0 on both pairs** (ruled: keep — Eva, on #349). A fitted outline carries its own
   margin; the bug's procedural scallop cut a second one into it — on the default bug's 0.06
   hindwing scallop that read as 9 "scallop depth reduced" repairs over the 17 shapes and put
   shape #1 under the floor. The count is kept (it is inert at depth 0). Undo: drop
   `scallop` from `applyWingShape` and `WING_SHAPE_WRITES` (and the gate's restated list).
2. **Sweep is 0 on both pairs** (ruled: keep — Eva, on #349) — the shapes were fitted at sweep 0, so their orientation is
   in the points; keeping the bug's sweep would rotate them off the fit.
3. **A blend smooths margin detail — PARKED (Eva, on #349).** Random blends read plainer than
   either parent: two scalloped margins whose bumps do not line up average toward a smooth
   edge (and the blend re-expresses the mix with one more control point than the denser
   parent, which keeps the overall shape and not every bump). Candidate fixes, not built:
   carry the margin detail from ONE parent onto the blended shape, or bias t toward the ends
   so a blend stays near one parent's margin. **Blending the sweep separately does NOT fix it
   (measured, §13.6, Oct 4 — the item stays parked):** with each outline in its own frame and
   the sweep mixed apart from it, a blend kept the same absolute margin detail as before
   (0.153 against 0.156 mm on seed 3; 0.142 / 0.148, 0.152 / 0.154, 0.178 / 0.187 on seeds 11,
   19, 7) and looked the same; its share of its parents' detail fell from 42 % to 34 % over 60
   seeds only because the re-expressed parents carried more points.
4. **A shape without a tail switches the bug's own tail group OFF and keeps its points**
   (the tail toggle brings it back); a blend takes the nearer parent's tail.
5. The gallery is a 4-column grid of filled silhouettes (both wings and their mirror, placed
   as on the default bug through `editorFrame`), in a "Wing shapes" section open by default
   above "From an image".

### 13.4 What the library exposed in the core, and the fixes

The library's outlines are fitted, so their margins carry real detail and their roots are
narrow and curved. Three pre-existing mechanisms that had only ever seen smooth random
outlines broke the J clause on them (measured over 276 pinched random bugs with library
wings: 39 jagged before, 0 after; and 24 of 272 library-shape x pair-count x pinch states on
the default bug, 0 after):

1. **A middle pair is drawn through control points.** A linked middle pair was the raw
   per-sample mix of the first and last pairs — 48 samples a half, 1.6 mm chords on a
   41 mm wing — and two detailed margins mixed into a 20-degree zig-zag. Resampling finer
   made it worse (it kept lobes under the floor on small wings). Now the mix is decided
   exactly as before (whether it crosses, how far it is eased) and what is DRAWN is that mix
   re-expressed as control points (one more than the denser drawn pair) through the same
   spline as every drawn outline; unlinking starts from exactly those points. If the
   re-expression is not simple and clear, the raw mix is drawn, as before. **This moves
   every 3–4 pair design's middle pairs slightly** (a smoother curve through the same blend).
2. **A root near the floor is not pinched.** The full neck is held at half the floor, so on a
   small wing with a narrow root the "pinch" was a dip of a tenth of a millimetre. The pinch
   now fades in with the full narrowing h0 − hr: none under 3/4 of a floor, whole from 1 1/4
   floors (a ramp, never a step). The default forewing narrows by 1.45 mm: untouched.
3. **The neck is at least one floor out from the body's silhouette** (it was R x length,
   0.4 mm on a small wing, putting the root tab's shoulder and the neck's fillet two
   opposite turns apart under the floor). On the default bug R is 0.9 mm, so the neck moves
   0.1 mm out at length 1 — a pinched default is a hair different from the ladder sheet.
4. **J judges the visible outline.** The stretch of a wing's outline inside the body's
   top-down silhouette (the buried root tab) is drawn in neither export and is now skipped,
   the outline judged run by run between such stretches; the silhouette is the body's own
   emitted contour. With (3) the neck is never buried, so the fillet J allows stays judged.

The pinch shipped in this same unmerged PR, so (2)–(3) move no saved design. The gate's
"blended pair under the floor" fixture went vacuous with (1) — the re-expression smooths away
the waist its eased mix had — and is replaced by one found by search (`blendedThin()` in
tools/bug-fixtures.mjs, its reasoning beside it).

**Found and NOT fixed (pre-existing, outside the library's reach):** `buildBug` THROWS
(`earClip: polygon is not simple`) on library forewing #15's outline at about 15–16 mm long and
stretch 0.6, at any pair count, with the rounded edge on (round 0 builds) — reproduced
identically on the tree before this work. The rounded edge's inset is not simple on that narrow
wing and nothing catches it. Applying or blending a shape always sets its own stretch (1.0 or
more), so the library cannot reach it; a hand-set stretch can. Its own fix (a fallback in the
edge inset, like the root's retries) is a separate change.

Gate: LB1–LB6 (tools/verify-bug-library.mjs) plus 31 built rows ("library: ..."); the negative
control adds seven code mutants of bug-geometry.js and one data mutant. Sheet:
`node tools/shot-bug-wing-library.mjs <dir>`.

### 13.5 Adding shapes to the library

`node tools/bug-wing-library-fit.mjs --add` fits every sheet in the gitignored
`tools/bug-wing-sources/`, dedupes each fit against the CURRENT library (every entry applied to
the default bug, the same Hausdorff and 3% bar as step 1) and then within the batch in reading
order, and writes the step-2 exploded sheet to `out-add/`, survivors numbered on from the
library's last id; a fit under the floor at 0.6 mm is re-fitted at the nearest tolerance that
clears it, and still flagged (red row) when none does. Existing ids never change: kept shapes are
APPENDED to `bug-wing-library.js` after Eva's keep / drop list.

### 13.6 Each wing in its own frame — TRIED AND REVERTED; the split kept

Eva's ruling on the #18–#55 sheet asked for each wing to be fitted in its own frame (along its
own long axis, hinge to apex) with its angle stored as the pair's SWEEP, #1–#17 re-expressed
so the assembled bug is unchanged, and a library shape applied as outline + sweep. It was
built (commit `9273d92`, kept in the branch history) and **reverted under her fallback ruling
(Oct 4)**: the library is #349's data again, each wing's angle in its points, a shape applies
at sweep 0, and §13.3 #2 stands.

**Why it was reverted, measured.** The geometry closes every outline on a root chord at u = 0,
square to the wing's own axis through its hinge. A wing re-expressed in its own frame at a
sweep therefore needs its root REBUILT, and on the default bug the hinge sits only ~0.9 mm
inside the thorax's edge, so the rebuilt root turns the pair's whole sweep (27–60°) within
that millimetre and the rounded edge folds on the turn. Every assembled outline held within
0.05 mm of #349 beyond 1 mm of the body (worst 0.045 mm), but inside that millimetre the full
gate's J (outline jagged) and S (a stray line in the SVG) failed on all 17 library rows and on
three random rows whose wings are library blends — 334 of 359. Four root constructions were
measured and none was clean (a 0.10-of-the-length chord: 9 of 17 rows still failing, and #9's
and #15's hindwings under the floor; the whole #349 outline kept to its old root corners; the
corners trimmed 0.5 mm past the hinge line: 11 of 17, and #16's tail moved 0.67 mm; the fit
held to the body's edge: no change).

**The root square to the BODY (Eva's ruling 1, Oct 4) was probed and not built.** About 37
places assume the root chord is at u = 0 (the root pinch's neck, the venation fan from the
chord's middle, the rounded edge's ramp, the root tab, the floor's exclusion, the editor), so
re-cutting the root square to the body in the planform touches all of them. The contained
form — a warp applied only in the planform-to-world transform, shearing the root square to
the body and easing to the rigid sweep over the root region (3.9 mm on the default forewing,
1.8 mm on its hindwing) — was put in the builder and editorFrame and gated on every non-
library row: it broke the DEFAULT bug's rounded edge (E1: 13 beads wider in plane than a
half-round on the forewing, hundreds on random bugs; E7: the silhouette moved 0.028 mm), and
IM12 (fitted wings crossing into the body). Making that green means re-deriving the E family,
the fitter and the re-expression around a non-rigid root — the open-ended iteration the
fallback ruling exists to stop. The probe is not in the tree.

**What was kept** (the gate green with it): the fore/hind split of one wing mass needs a WING
ON EACH SIDE of its notch — seen from the middle of the mass's attachment, the farthest outline
point ahead of the notch and the farthest behind it must each reach `NOTCH_LOBE_FRAC` (0.4) of
the farthest overall; the deepest concavity that passes is the notch, from
`NOTCH_LOBE_MIN_FRAC` (0.045) deep, and the split line runs from the notch to the MIDDLE of the
attachment. For a heavily overlapped pair (a moth's forewing swept back over its hindwing) the
notch is the shallow step where the forewing's back corner meets the hindwing's margin, not a
dent in the forewing's leading edge with no wing ahead of it (that dent cut #43's forewing off
at the root). Where no concavity passes, the old rule (the deepest, at `NOTCH_MIN_FRAC`, split
square to the body). `notchLobes: false` is the old rule, and the sheet's BEFORE column.
Also kept: two interior control points closer than the outline rule allows, at a tight tip,
are merged into their midpoint instead of tightening the tolerance (which only adds points
there). Gate: 350 of 350 and the negative control (61 mutations) green with both — **and no
mutant names the new split rule**: the IM fixtures have no moth, so its witness is the sheet's
before / after column (#43's forewing whole instead of a stub), a gap recorded rather than closed.
**Excluded from this session's sheet** (not accepted by Eva — see Status below): #34 (judged
the same as #22), #37 (under the floor), #50 (a luna-type moth — the tail-hindwing cannot be
separated from a flat picture) and #31 (its hindwing fitted 79° back where the source spreads
it out and down).

**STATUS AT THE CLOSE OF THIS SESSION (Oct 4).** The library is UNCHANGED at #1–#17 (#349's
data, sweep 0). The candidates #18–#57 are UNRULED and go to a full audit session. Eva has
accepted neither this session's drops (#31, #34, #37, #50) nor its suggested strikes (#25,
#29, #39, #40, #43 — each carries a stray contour line in the SVG near its root, which the
gate's S clause would fail as a library row); the audit re-examines all of them. **The source
images are gitignored** (`tools/bug-wing-sources/` — `sheet-2.webp`, `sheet-3.webp`,
`sheet-4.webp`, Eva's three attached sheets) **and are not in the repository: they must be
re-attached in the next session** before `node tools/bug-wing-library-fit.mjs --add` can run.


### 13.7 The wing-shape audit (Oct 4) — every shape against its source

Eva did not accept the last session's drops (#31, #34, #37, #50) or suggested strikes (#25,
#29, #39, #40, #43), so every shape so far — library #1–#17 and candidates #18–#57 — was laid
back over the crop it was fitted from and judged. `node tools/bug-wing-audit.mjs` is the
instrument (the four source sheets must be in the gitignored `tools/bug-wing-sources/` as
`sheet-1.webp` … `sheet-4.webp`; it refuses without them); it writes `review.html` (one large
panel per shape: the fitted outline drawn ON the source crop, fore magenta, hind blue, the
split orange; the exploded wings; the bug's own SVG; DROP first, then FIXABLE, then GOOD) and
`audit.json`. `tools/bug-wing-audit-gate.sh <records.json>` runs the gate's own library-row
checks on every record in a scratch copy of the tree.

**The measures**, on the ASSEMBLED top-down silhouette (both wings, both sides), in the crop's
own pixels: IoU against the source silhouette, and the worst one-sided distance between them
in mm at the fitted 72 mm wingspan, with which way (the fit MISSES source or goes PAST it) and
where (forewing apex / leading edge / outer margin, the fore/hind junction, hindwing outer
margin / inner edge, tail; the ROOT ZONE, within 3 mm of the body, reported apart, since there
the bug's own body meets the wing). Excluded, each for a stated reason: a 1.2 mm band round the
bug's body and the body column (the body is not the shape's); source pixels inboard of the
fitted wings' own inner edge on their row (between the hindwings, beside a broad moth body;
between the forewings, a feathered antenna); and anything ahead of the roots on a row no wing
reaches AND more than 2 mm from the fit (an antenna above the wingtips; a wingtip the fit falls
short of by less is still counted). Two corrections were made on the way, both because a
number disagreed with the picture: the first version counted the boundary of the fitted
union's own midline gap as a miss (17 mm "worst" on #31, which fits within 0.6 mm), and
excluded too much ahead of the wings.

**THE FINDING THAT COVERS MOST OF THE FIXABLE ROWS — THE ROOT CONVENTION.** Every library entry
has a root chord SYMMETRIC about its hinge (±0.027–0.050 of the length); every candidate the
#18–#57 sheet showed has an ASYMMETRIC one, its forewing root running ~2 mm back along the body
(front +0.01…+0.03, rear −0.06…−0.15). The library was fitted when the base bug's root pinch
was above 0, and at pinch > 0 the fitter centres each root chord on its hinge (bug-image.js,
`completeChain`'s blended arm); since the pinch defaults to 0 (de4c799) it keeps the picture's
own root ends, held to the thorax (be129b1). On these sheets that asymmetry is what put a square
STEP on the forewing costa beside the head (15 candidates; a visible notch in the SVG, and the
gate's S hairline on #25 and #43) and what STACKED the fore and hind roots on #36, #37 and #54
(gate R: −0.16 / −0.55 / −0.55 mm). Refitted on a base at pinch 0.5 (`LIB_ROOT_BASE`) both go;
today's refit of #1 that way lands on its stored root to 1e-4 and its outline within 0.57–1.13 mm
over the whole library. The record holds outlines only, so the pinch is not stored and every
shape is still built at the default pinch 0. One consequence had to be handled: the fitter's
own fold repair (step the tolerance until the rounded edge leaves no stray contour line) judges
the bug it fitted — a pinched one on that base — so the audit runs the same repair judging the
library row itself (the record on the default bug, pinch 0); #40 needed it (a 0.52 mm hairline,
repaired at a 0.96 mm tolerance).

**Other fixes, each mechanical and each shown before / after in the review page:** the club
tails of #48 and #55, whose ~1 mm stalks the fitter drops as clutter, come back when the
silhouette handed to the FITTER is grown 2 px / 1 px below 60% of the crop (the measurement is
always against the untouched crop) — fragile, recorded as such: growing from 65–70% loses them
again; and two watermark artefacts on sheet 4 are deleted as control points, each deletion
GUARDED by the point it expects so a refit that moves them refuses (#43's costa dip, two points;
#53's costa spike, one). #37's under-the-floor finger and #42's root spike went with the root
convention.

**Measured, not fixed:** sub-floor strokes are lost and cannot be printed anyway (#23's hooks,
#25's hairline tails); the watermark strokes on sheet 4 dominate several "worst" figures and are
named in those rows; #52's crop also holds a luna moth, which the fitter ignored (the butterfly's
fit is faithful); the library's #7 photo is asymmetric and the fit is its mirror average.

**DROP (2):** #34 — the same drawing as #22 (the sheet repeats its second row as its last),
1.75 mm from it as recorded (2.05 on the sheet), under the duplicate bar; #50 — a luna-type moth whose converging tails the
fitter takes as the abdomen, leaving a comma for a hindwing. #31 (dropped last session for a
hindwing "79° back") is GOOD: the source's hindwings do run back to meet at the midline, and the
visible margin fits within 0.9 mm. #29, #39 and #40 (struck last session for a stray SVG line)
pass today's gate; #25 and #43 failed S, and pass after the root convention.

**THE GATE ON EVERY RECORD:** all 57 — the 17 library entries as stored and the 40 candidates
as they would be stored — pass the gate's library-row checks (`tools/verify-bug.mjs`, rows
`library:#N`, on the default bug); of the sheet's own fits, #25 and #43 fail S and #36, #37 and
#54 fail R, as above.

**Tally: 35 GOOD · 20 FIXABLE (every fix applied and shown) · 2 DROP.** Library #1–#17: all
GOOD, nothing to fix in place. Verdicts are recorded in `VERDICTS` in the tool; Eva's keep /
drop list decides what is appended (existing ids never change).

**RULED (Eva, Oct 4): keep every GOOD and FIXABLE shape, drop #34 and #50.** The 38 kept
candidates are appended to `bug-wing-library.js` as #18–#57 with the audit's own numbers (#34 and
#50 are gaps, so a number on the review page is the number in the library), each record exactly
the audit's — refitted at the library's root convention, with the fixes above. #1–#17 are
unchanged. LB1 now restates the 55 kept ids in order.



## 14. Wing angles — each preset carries the angle it was found at

Eva's brief (Oct 5): presets carry their own wing angle, the library knows when two presets are
the same wing shape at different angles, and applying a preset sets the angle it was found at.
Eva calls it "tilt"; it is an in-plane angle about the hinge, seen from above — **not** the
pair's `sweep` field (which stays 0, §13.3 #2), and never dihedral or pitch.

### 14.1 The convention (one for every wing)

In TRUE planform — (u, w × stretch), units of the wing's own length, so the measure is isotropic —
the wing's AXIS runs from the hinge (0, 0) to the arc-length centroid of the drawn outline
**beyond the root bridge** (r > `WING_ANGLE_RAMP[1]` = 0.3 lengths; the tail group is not part of
it). The angle is that axis's angle from the span direction (+u, square to the body),
**positive backward** — the sweep field's sign. `wingAngleOf` is its one owner. A farthest-point
axis was built first and dropped: #4 and #22, near-identical wings, read 8° apart because their
farthest points sat on different lobes; the centroid reads them 2.4° apart, which the
angle-free alignment confirms (2.7°).

### 14.2 Store and apply — the builder learns nothing (§13.6 not repeated)

Each library wing is stored at ANGLE 0 (`points`: its outline turned onto its own axis, 9
decimals) with the angle it was found at (`sweep`, degrees) and the RANGE its control allows
(`range`, offsets from that angle, measured — §14.4). Applying (`posedWing` →
`rotateWingBlade`) regenerates an ORDINARY outline: each control point turns by
deg × ramp(r), r its distance from the hinge — 0 inside `WING_ANGLE_RAMP[0]` (0.06; the root
anchors on u = 0 stay where they are, the root chord square to the body), 1 beyond 0.3 (the
blade turns rigidly), a smoothstep between (the root bridge, tangent-continuous at both ends).
A turn about the hinge keeps r, so turns add exactly; a stretch too small for the turned
outline is raised (the true shape unchanged); the tail turns with the blade and is re-anchored
on the turned margin, its offsets re-read in the new anchor's frame. `buildBug`,
`editorFrame` and every root construction are untouched: the engine only sees outlines.

**Why not the fitter's root completion (`completeChain`) literally**: completion bridges a dense
chain and is then re-FITTED to control points at a 0.6 mm tolerance, so it cannot reproduce
today's outline at the found angle within 0.05 mm, and a turn of 0.5° would jump by the fit's
own error. The ramp is the same construction on the control points — a root on u = 0 square to
the body, joined tangent-continuously to the turned blade — and it is the identity at 0°.

**At each preset's own angle the bug is #361's to the bit**: posing the 9-decimal canonical
outline rounds back to the 5-decimal points it came from. WA1 measures it in world mm through
`editorFrame` against `tools/bug-wing-library-snapshot.json` (#361's data, applied by the old
rule restated in the gate): worst **0.00 mm** over 55 shapes × both pairs (bar 0.05 mm).
On the way: #16's tail first landed 0.59 mm off with 5-decimal canonicals — its anchor sits
exactly on a control point's u, where a 1e-5 nudge swings the tail frame's tangent window by
2.6°.

### 14.3 The page

A per-pair **Wing angle** slider in the pair block (first, last, and unlinked middle pairs; a
linked middle blends). Its value is the outline's own measured angle; it runs the wing's
measured range about the angle the wing was FOUND at (a library shape), or ±20° about the angle
it was loaded at (anything else — unmeasured, said in the tooltip); setting it calls
`setWingAngle` (turn, then two small corrections: the spline is drawn in (u, w), so a turn in
true planform is not exactly a turned curve when the stretch is not 1 — lands within 0.01°). A
turn the outline rule refuses is told and not made. Undoable.

### 14.4 The range — measured per wing, not declared

Each wing's `range` is what `node tools/bug-wing-angles.mjs sweep` found: every whole degree
from −20 to +20 that the outline rule accepts (the span), each built on the default bug through
EVERY row clause of the gate (`verify-bug.mjs --rows`): **3,948 built rows, 63 failing, all
S** (the rounded edge leaving a contour line 0.50–0.81 mm inside the outline — the class §13.7
met, knife-edge in the angle: #4's forewing fails at +2..+5 and passes beyond). The range is
the widest run about 0 with no failure, stored in MEASURED degrees (a raw turn reads slightly
less where the stretch is raised: +16 raw is +15.81 on #16's hindwing — the first version
stored raw degrees and the control, which asks for measured ones, was refused at that edge;
WA3 caught it), clamped to ±20.

- **Forewings: 49 of 55 turn the full ±20°** (median −19.8…+19.8). Narrowest: #4 (−20…+1.9),
  #29 (−19.7…+5.9), #15 (−20…+10), #26 (−6.9…+19.5) — each stopped by an S hairline.
- **Hindwings: 8 of 55 turn the full ±20°; median −19.8…+12.0.** Turned BACK, a hindwing's
  inner edge runs along the abdomen and reaches into the body (u < 0), which the outline rule
  refuses — the commonest limit, a property of the shape, not of the turn. Turned forward a few
  outrun the drawing area. Narrowest: #31 (−5.9…+0.9), #17 (−1.9…+7.9), #55 (−0.9…+8.1), #40
  (−4.9…+3.9), #25 (−6.9…+3.0).

The gate cannot afford 3,948 rows; it holds the range three ways: WA3 (every wing, both ends
and the midpoints, the control lands within 0.01°), WA4 (every wing's range, the root unmoved)
and 18 built rows `angle: …` (#5, #13, #31 at both ends of the range, each pair alone and both).
Between the integer degrees the sweep built, the slider's half-degree stops are not built — the
sweep is the evidence and says what it covers.

### 14.5 Same shape, different angle — the audit

`node tools/bug-wing-angles.mjs measure` compares every pair of shapes with the angle taken out
(each wing turned onto its own axis, then the residual turn that best aligns them, ±12°), in
units of each wing's own length, the root zone (r < 0.15) left out; bar: the library's dedupe
bar (2.16 mm at a 41 mm wing). Two groups pass on BOTH wings:

| group | forewings aligned (as drawn) | hindwings aligned (as drawn) | Δ angle fore / hind |
|---|---|---|---|
| #4 ~ #22 | 1.47 (2.50) mm | 1.18 (2.50) | 2.7° / −2.5° |
| #4 ~ #57 | 1.86 (4.04) | 2.19 (2.67) | −6.7° / −1.1° |
| #22 ~ #57 | 2.02 (4.67) | 2.05 (2.81) | −7.3° / 1.6° |
| #10 ~ #19 | 1.42 (1.74) | 2.11 (2.55) | 0.5° / −0.7° |

#4 / #22 and #10 / #19 are near-duplicates at nearly the same angle; #57 is #4 / #22's forewing
turned ~7° back. Near pairs the angle explains most of (as drawn ≫ aligned, over the bar):
#12 ~ #39 (fore 11.66 → 3.06 mm at −14.5°, hind 7.41 → 2.45 at −11°), #38 ~ #54 fore
(10.61 → 2.28 at −14.7°), #9 ~ #10 fore (7.96 → 3.03 at −11.7°), #22 ~ #35 / #4 ~ #35 fore
(~9 → 3.2 at ~−10°). **RULED (Eva, Oct 5): merging #22 into #4 and #19 into #10 is APPROVED and DEFERRED** (applied in §15) to a
follow-up PR, together with two builder fixes. Removing the two entries reshuffles the random
bugs' blends (picked by position in the library), and the new draws hit two pre-existing
builder defects, both reproduced on `main`'s own code: random:3's blend #20/#31 at 0.62 has a
hindwing the gate's N measure reads 1.04 mm past the floor disc while the builder reads 0.42
(under its 0.5 bar) and exports; random:1's blend #55/#27 at 0.37 in HOLES fails E1 (6 beads
wider than a half-round). The library therefore stays at 55 shapes in this PR (option A);
`tools/bug-wing-angles.mjs store`'s MERGED map is where the follow-up applies the merge.
**#57 is kept** as its own shape: a narrower forewing tip and a ~16% longer hindwing, so it adds
variety even though its forewing is #4's turned ~7° back. The angle ladder and the regenerated
root were approved from the review page.

### 14.6 Verification

WA1–WA4 (tools/verify-bug-library.mjs, function checks) and the 18 `angle:` rows; the negative
control adds three: the stored angle ignored on apply (WA1), the root turning with the blade and
the bridge starting at the hinge (WA4), and a DATA mutant zeroing every stored angle (WA1 + WA2).
**The angles were measured from the AUDITED FITS, not re-checked against the source sheets**
(Eva's ruling, Oct 5: the fits were laid back over their sources and judged in §13.7, so the
angle check against the pictures was skipped). The sheets were not in `tools/bug-wing-sources/`
this session (they arrived in the chat as pictures, not files); the review tool draws each
angle on the source crop when they are present.

Tools: `node tools/bug-wing-angles.mjs measure | sweep | store | review [--out <dir>]` — the
angles and groups, the per-wing range sweep (every built row through `verify-bug.mjs --rows`),
the library rewrite from `tools/bug-wing-library-snapshot.json` (#361's data, also WA1's
reference) and the review page.

## 15. Stable random draws, the floor measure made one, the pitched bead, the merges

Eva's follow-up to §14 (Oct 5): the two merges §14.5 approved and deferred, and the three things
that had to land first. Removing #22 and #19 reshuffled every random gate row (the blends were
picked by POSITION in the library), and the new draws hit two pre-existing builder defects, both
reproduced on `main`'s own code.

### 15.1 The random draws are keyed on shape ids

`randomWingBlend` used to pick `lib[floor(r() · n)]`, so adding or removing any shape changed
every random row's blend, and unrelated defects showed up as "new" failures. Now each try `k`
gives every shape a score `drawHash(seed, k, slot, id)` (a 32-bit integer mix, then [0, 1)), and
the lowest score wins. Shape a is slot 1, shape b is slot 2 among the rest, and t is
`drawHash(seed, k, 3)`. This is rendezvous hashing. Removing a shape changes a roll only when that
shape won one of the roll's slots, and adding one changes a roll only when the new shape wins one.
Every other roll keeps the same blend at the same t, and the library's array order plays no part.
The plain-shape fallback walks the library in id order. `randomParams` and `randomParamsWithBlend`
pass an optional `{ library }` through, for the gate.

This change itself reshuffles the random rows once, against the positional draws. After it, the
merges below moved exactly the rows that had drawn #22 or #19, measured: 4 of the 40 random gate
rows (random:7, :11, :13, :31, all of which had drawn #22). The other 36 kept the same label.
random:11's blend was a re-rolled draw, so its t moved with it (#3/#22 at 0.50 became #29/#14 at
0.22).

**LB7** (tools/verify-bug-library.mjs) runs this on all 40 random gate rows and on RANDOMIZE WINGS
seeds 1–8 on the default bug. Three changes to the library must leave each row's label, its tries
and its params byte-identical: removing either of two shapes the row never drew (accepted or
refused), and reversing the library's order. For non-vacuity, removing the shape a row DID draw
must change that row (3 rows). The negative control restores a position-keyed pick (`the draw picks
by library POSITION again`) and LB7 catches it.

**Cost.** LB7's first version rebuilt about 200 bugs, and the negative control ran it inside every
library mutant. The PR's first CI run then hit `bug-gate`'s 30-minute timeout: the negative
control took 16.3 min against `main`'s 9.4, and the gate was cut off.

Two changes fixed it, with no workflow edit:
- `randomWingBlend` takes an optional `problem` hook, and LB7 passes `wingShapeProblem` cached
  on the candidate params. The draws under test are unchanged, and a library variant reuses the
  verdicts the full library's run already reached. LB7 costs 13.5 s.
- The negative control runs LB7 only on the clean module and on the mutant that names it.

### 15.2 The floor measure: one definition, and the builder refuses the root

**The case.** random:3's body with blend #20/#31 at 0.62, three pairs (now fixed as data,
`rootUnderFloor()` in tools/bug-fixtures.mjs). The hindwing closes on a straight root chord
0.85 mm wide and stays narrower than a floor-wide disc for its first stretch. The gate's N read it
**1.04 mm** past the floor disc. The builder read **0.42**, under its 0.5 bar, and the STL
exported.

**The cause.** Both measures read the same polygon on the same lattice (pixel centres at
floor/12). Where they differed was the CORE: the centres where a floor-wide disc fits. The gate
takes the exact point-to-segment distance to the boundary. The builder read the distance off a
pixel EDT to the nearest *outside pixel centre*. That distance is never less than the true one and
can exceed it by a pixel or more. In a channel about a floor wide, it admitted disc centres the
exact measure refuses: one at **0.458 mm** from the edge, against a 0.5 radius. The covered region
then spread across the root, and the depth fell from 1.04 to 0.42.

**The fix.** `thinAnalysis` decides the core by the exact segment distance, with the segments
bucketed in cells of side floor/2 (any segment within r of a pixel lies in the 3×3 block). The
covering and the depth are unchanged: exact EDTs on the lattice, which is also what the gate
computes. The two measures are now the same definition on the same lattice. They can differ only
in how a point lying on the boundary is classified. The builder reads the fixture's hindwing at
**1.044 mm**, the gate at **1.044**; the builder reports pair 3 and the STL is refused. Build time
is unchanged within noise (126 against 140 ms a build, seven bugs).

**Verification.**
- **N0** (function check) builds the fixture, the default, the blended-thin fixture and random:1–6,
  and requires the two measures to agree within one grid step on every wing (worst read 0.000 mm).
  It also requires the fixture's hindwing to read thin by both measures and to be reported.
- The fixture is a built row, `fixture: #20/#31 at 0.62, hindwing root under the floor (refused)`,
  run with `expectThin`. A row mutant, `the disc test reads a pixel distance again`, restores the
  old core, builds the fixture with the mutated module and must fail N.

### 15.3 The pitched bead (E1)

**The case.** random:1's body with blend #55/#27 at 0.37, two pairs, HOLES, pitch −7.2° / +7.0°
(`pitchedBeadHoles()`). E1 found 14 beads up to **1.12%** wider in plane than half the thickness.
The gate's allowance for a pitched wing was 1%.

**The cause.** In the wing's own planform every bead was exactly a half-round (a/H ≤ 1.000000).
But a pitched wing is a helicoid: the transform turns each span station by its own angle. The
mid-surface metric is then diag(1 + (w a′)², 1), with a′ the pitch per mm of span, so planform
distances along u stretch by √(1 + (w a′)²). This long hindwing reaches 26 mm back from the hinge
chord. There, a′ ≈ 0.0058 rad/mm gives +1.1%, so the emitted bead really is wider than a
half-round in the world.

**The fix.** On a pitched wing, the bead's planform radius is round × h divided by an UPPER
BOUND on the stretch over its whole reach: √(1 + (a′ (|w| + round·h))²). The world chord from the
skin point to the apex is never longer than the planform segment's length in the world metric, and
that length is at most this bound times the planform radius. So the world chord is at most
round × h, and a bead whose radius runs along w comes out slightly under a half-round (by ≤ 1%).
The radius is decided BEFORE the inset (`aRound`) and in the existing concavity step after
subdivision, through one function (`radius`), so the inset's own flip guards apply.

**A per-point world-chord step-back AFTER the inset was built first and reverted.** It moved skin
points by at most 4 µm, each along its own direction. On the #20/#31 fixture that flipped one
near-collinear sliver at the margin (cross product −2.4e-7, E6) and left a 0.51 mm contour
hairline (S). The full gate found it; no clause on the bead alone could have. Pitch 0 is a rigid
transform: the factor is not formed, so the default bug and every unpitched wing are
byte-identical.

**Verification.**
- E1's bar is now 1e-9 on pitched wings too (the 1% allowance is gone).
- The fixture is a built row, `fixture: #55/#27 at 0.37, pitched, holes`. Its worst world ratio is
  1.00000 with 0 beads over.
- The row mutant `a pitched bead is sized in the planform` must fail E1.
- Every pitched wing's bead moves by up to ~1% of its radius (a few µm). The ellipse-residual half
  of E1 stays reported-only on twisted wings: the ring between skin and apex is not an exact world
  ellipse on a helicoid.

### 15.4 The merges

#22 is merged into #4 and #19 into #10, as Eva ruled in §14.5. Both entries are gone from
`bug-wing-library.js`. Ids never change, so 22 and 19 are gaps, like 34 and 50. #57 stays.
`tools/bug-wing-angles.mjs store` carries `MERGED = { 22: 4, 19: 10 }`, so a re-store keeps them
merged. LB1's restated keep list drops them. The library holds 53 shapes.

### 15.5 Sheet

`node tools/shot-bug-follow-up.mjs <dir> --base <worktree of main>` renders:
- the two fixtures before (`main`'s code, served from its worktree) and after (this tree), each as
  the SVG and the 3D ¾ view;
- the #20/#31 hindwing root as a close-up;
- the gallery before and after the merges, drawn from each tree's own library data.

Every number on the sheet is read off the model each tree built.
