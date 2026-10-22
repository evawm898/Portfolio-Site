# Paper Star Lantern — design doc (`/lantern`)

`/lantern` (`lantern.html`, `lantern.css`, `lantern.js`, `lantern-geometry.js`,
`lantern-registry.js`, `lantern-view.js`, later `lantern-pattern.js`,
`lantern-material.js`, `lantern-export.js`, `lantern-instructions.js`) is a
hidden generative page (`noindex`, linked from nothing) that designs a FOLDED
PAPER STAR LANTERN — the classic hanging star: two identical pleated halves
glued at the rim, five long points, a deep body, cut scroll patterns in the
faces, tissue behind the cuts, a cord kit through the back — and produces the
laser / blade-cutter files, the backing pieces, a 3D fold preview, a lit
simulation and the assembly instructions for it.

It is its own project. It shares the site's doctrine (one geometry owner,
derive-don't-expose, every claim gated, every judgment call written down) and
reuses two things from the other pages: `bloom-curve.js` (the curve VALUE, its
sampler and `proposeEdit`) for the point-outline editor, and the tools'
headless-Chromium harness pattern. Nothing else here imports from another
generator.

This is an unattended overnight build. Every decision that would normally wait
for Eva is listed in §14 and taken the most reasonable way in the meantime.

---

## 0. Reference object and scope

The targets are the commercial hanging paper stars (the "Atomic White" 24"
star, the tissue-backed two-tone "Ganasha" star, the "Pink Obsession"
lavender star): ~24" (610 mm) tip to tip, ~10" (254 mm) deep, FIVE long
slender points, a deep three-dimensional body, scroll / paisley cuts in every
face, tissue behind the cuts for a coloured glow, hung from a pendant cord kit
through an opening in the back. Measured on the references: depth / width
≈ 0.42; inner-vertex radius / tip radius ≈ 0.4–0.45 (a regular pentagram is
0.382).

**Moravian stars (stellated polyhedra, 20+ points) are OUT OF SCOPE** — a
different object (every point a separate pyramid glued to a core) with none of
this geometry. A possible future mode; nothing here forecloses it, nothing here
builds toward it.

---

## 1. Architecture law

```
state ──► solveLantern(state) ──► MODEL { flat (one facet's edge, radii, angle, bow),
                                          finished (rim curve, H), halves, tabs, creases }
                     │
      ┌──────────────┼──────────────────┬─────────────────────┐
  flatSvg(model)  foldedMesh(model)  cutFiles(model, …)   instructions(model, …)
```

- `lantern-geometry.js` is PURE (no DOM) and is the one owner of the fold
  solver, the flat pattern, the 3D mesh and the rim. Every view, every export
  and every gate reads the same model. The page draws it and routes the hand.
- The flat pattern is DERIVED from the finished object (the inverse problem,
  §2.3). The 3D mesh is derived from the flat pattern by the same isometry the
  solver used, so the fold preview is the development run backwards, never a
  separate drawing.
- Phase 1 (this PR) is the geometry core, the page shell and the Flat and
  Folded views. Later phases add modules beside it; each is named below with
  what it owns.

---

## 2. Geometry model

### 2.1 The object

A lantern is two IDENTICAL halves, front and back, joined at a shared RIM. Each
half is a flat star outline with radial creases from its centre: a MOUNTAIN
fold from the centre to every tip, a VALLEY fold from the centre to every inner
vertex. Folded, the centre rises by H above the rim plane; the two halves are
mirror images across that plane and the rim is their common planar boundary.
Each point is two mirrored facets; one facet — the triangle (centre, tip,
inner vertex) — is the fundamental domain under the dihedral symmetry D_N
(D_{N/2} when points alternate long / short).

The back half carries a round opening at its centre for the cord kit (§2.7)
and a separate reinforcing ring; the front half carries the glue tabs along
its rim edges. An optional side band (a wall of constant height between the
two rims) adds drum depth and is phase 6.

### 2.2 The finding that fixes the model: rigid flat triangles cannot do this

The obvious model — every facet a rigid flat triangle, folded about its two
creases — has NO non-flat solution for two mirrored halves. Put the centre at
(0, 0, H), the tip at radius r_t and the inner vertex at radius r_v, both in
the rim plane z = 0 (forced: a point of the rim is its own mirror image, so it
lies ON the mirror plane; for odd N the same follows from a 180° turn about an
in-plane axis, and for even N too — checked, not assumed). Then |C T|² = r_t² +
H², |C V|² = r_v² + H², and the rim edge T–V is forced to the 3D chord length
√(r_t² + r_v² − 2 r_t r_v cos(π/N)), which is SHORTER than the flat edge for
every H > 0. A rigid triangle has nothing to give, so H = 0. The real star
exists because PAPER BENDS WITHOUT STRETCHING: each facet is a slightly curved
developable surface, the extra edge length bows the rim, and the centre
region takes up what is left.

### 2.3 The model: a pleated cone, and the one freedom that closes it

Each facet is a CONE with its apex at the raised centre C, over a planar rim
curve γ from T to V in z = 0. A cone is developable, so the facet's flat shape
is an isometric development of it; the creases are its generators C→T and
C→V. The development angle of all 2N facets sums to 2π (flat paper), so C is a
legitimate pleated apex (mountain, valley, mountain …), not a cone point.

Parametrise the flat facet by polar coordinates (ρ, α) from C and the 3D rim
point by cylindrical (r, θ, 0). On a cone, ρ is the same in both (the
generator's length), r = √(ρ² − H²), and the isometry along the rim reads

```
r² θ'² = ρ² α'² − r'² H² / ρ²          (the development condition)
```

so a flat edge curve (ρ(u), α(u)) determines the rim's azimuth θ(u) by one
quadrature. The facet CLOSES when the rim sweeps exactly the symmetry's
azimuth: θ(1) = π/N. That is one scalar condition on the flat edge curve, and
with the straight edge of a star of given (W, D, s, N) it is generally NOT met:
the straight edge's development sweeps a ratio ρ_closure = θ(1) / (π/N) that
is above or below 1.

Measured (the prototype in the phase-1 session), N = 5, straight edges, depth
/ width d, inner / outer s:

| s \ d | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 |
|---|---|---|---|---|---|---|---|
| 0.38 | 0.985 | 0.950 | 0.915 | 0.901 | 0.922 | 0.981 | 1.075 |
| 0.40 | 0.989 | 0.963 | 0.939 | 0.935 | 0.962 | 1.022 | 1.113 |
| 0.45 | 0.996 | 0.987 | 0.983 | 0.997 | 1.033 | 1.095 | 1.180 |
| 0.50 | 1.000 | 1.001 | 1.011 | 1.035 | 1.078 | 1.141 | 1.223 |

Two things this table says:

1. **A slender straight-edged pentagram closes at a DEEP depth.** s = 0.40
   closes (ratio exactly 1, no bow) at d ≈ 0.58; s = 0.45 at d ≈ 0.41 — which
   is the commercial 24" × 10" star to within the floppiness of tissue paper.
   The classic proportion is not a styling choice; it is where the paper
   closes.
2. **Slender AND shallow is infeasible** (ratio < 1: the paper has more angle
   round the centre than the rim can sweep). A physical star forced there
   puckers at the centre. The solver REFUSES to fake it: it clamps the depth to
   the nearest closing depth and says so.

Where the ratio is ABOVE 1 the rim can sweep more azimuth than the symmetry
allows, and the one freedom the model has absorbs it: the flat edge BOWS
OUTWARD by λ·sin(πu)·(chord length) — a convex edge, solved by bisection so
that θ(1) = π/N exactly. The convex root is the physical one (a concave bow
makes the tip region steeper than the cone can hold — the per-sample condition
ρ²α'² ≥ r'²H²/ρ² fails near the tip, measured). The bow is reported in the UI
as "derived edge bow: x mm". The user's own edge curve (§3, the editor) is
applied FIRST and the bow on top, so a drawn convex edge needs less bow and a
scallop rides on whatever bow the closure needs.

Feasibility per sample: the condition above also fails wherever the flat edge
runs nearly RADIAL (within atan(H/r) of a generator) — a deep scallop notch,
a very sharp tip at a very deep body. Such a stretch of rim cannot lie in the
rim plane on a cone; the solver clamps θ' = 0 there, counts the samples, and
reports "edge too steep over n% of the rim — the paper will pucker there";
the gate asserts the shipped defaults and every preset have 0 such samples.

### 2.4 The inverse problem, as the UI states it

The user gives the FINISHED object: tip-to-tip width W (= 2 r_t), depth D
(= 2 H), points N, slenderness s = r_v / r_t, the edge curve, tip treatment,
alternation. The solver returns the FLAT pattern: outer radius R_o = √(r_t² +
H²), inner radius R_i = √(r_v² + H²), the facet angle π/N (or the solved
pair a_L + a_S = 2π/N for alternating points), the bowed edge, the creases,
the tabs — and the finished rim curve, which the 3D mesh is built from. Both
sets of dimensions are shown.

### 2.5 Alternating points

Two facet types (long, short) share a valley. The 3D valley azimuth is held
midway (π/N) — a placement made without a ruling — and the solver finds the
two FLAT facet angles (a_L, a_S, a_L + a_S = 2π/N) and ONE bow λ shared by
both, so that both facets close: two unknowns, two equations, nested
bisection. The short tip's finished radius is `altRatio × r_t`.

### 2.6 Side-view profile

- **Straight** (default): the ridge C→T is a cone generator, so the silhouette
  is a straight line from the centre to each tip. This is the model above.
- **Faceted curve** (phase 6): each facet split into k bands by extra creases
  across the point, the ridge a polyline, so the side silhouette rounds. Each
  band is its own cone (apex on the axis at its own height); the closure
  condition applies band by band and the extra apex heights are the freedom
  that makes slender-and-deep reachable WITHOUT a bow. This is what the
  commercial stars' deep round bodies and flat thin points actually do, and it
  is the route to the brief's "slenderness 0.4 at depth 0.4" that the straight
  profile cannot reach (§2.3). Stubbed; not built tonight.
- **True curved creases**: OUT OF SCOPE. A curved crease's fold profile is a
  consequence of the crease curve and the sheet's stiffness together; it is
  not directly choosable from a parameter and needs physical testing to
  calibrate. Recorded so it is not re-proposed as "just another mode".

### 2.7 Mounting

The back half's centre carries a circular opening of adjustable diameter
(default 40 mm, sized for a standard E26/E27 pendant cord kit's cord grip and
socket neck; the lamp holder passes through, the shade ring sits outside) and
a separate reinforcing RING piece (outer diameter opening + 2 × ring width,
default 24 mm wide) glued around it on the inside. An optional hang hole
(default 6 mm) sits on one tip's ridge, 15 mm in from the tip.

### 2.8 Tabs

Glue tabs on the FRONT half only, one per rim edge (T→V), outside the edge:
the edge offset outward by the tab width, tapered to nothing over `taper` mm
at the tip end (a sharp tip cannot take a tab, so the tab stops 6 mm short of
it), and CLIPPED at the inner-vertex end to the valley's EXTERIOR BISECTOR
(`valleyBisector`: the two edges' tangents at V, summed), so the two tabs
meeting at V share the bisector as a seam and cannot overlap. A linear taper
to zero at V was the first cut and it OVERLAPPED on 71 of 115 inner vertices
over the fixtures (the gate's L8 found it): at a reflex vertex the two
outward offsets cross before either reaches zero. Width from the material
model (phase 3); phase 1 carries a constant 8 mm.

### 2.8a Scallops are enveloped

A scalloped edge cannot carry its full amplitude near the tip or the inner
vertex: there the straight edge already runs within a few degrees of the
development's radial limit (atan(H / r) — 23° at the default tip, 43° at its
inner vertex, against the edge's own 28° / 55°), and a flank of ±9° (a flat
2% scallop) crosses it. Measured on the default star: a flat 2% scallop is
steep (the solver flags it), an enveloped 1.5% is not for 3–5 scallops, 2%
for 3. So the quick mode writes crests of `depth × sin(πu)`, the default
depth is 1.5% and the range tops at 5%; a hand can still drag a crest past the
limit and Checks says so.

### 2.9 Collapsible construction

The commercial stars fold flat because the halves are joined only at the rim
and the centre is not fixed — the pleats collapse like a fan. The geometry
here already has that property (every crease is radial from C, so a half with
no wall band folds flat about its creases). A clip or tab-lock that HOLDS the
star open is not built: the cord kit's ring and the tissue backing stiffen a
real star enough. Logged in §14.

---

## 3. Parameters (phase 1)

| id | range | default | what |
|---|---|---|---|
| `points` | 3–16 | 5 | N |
| `width` | 150–900 mm | 508 (20") | finished tip-to-tip |
| `depth` | 0.1–0.9 × width | 0.42 × width | finished, TARGET; clamped to the nearest closing depth and told |
| `slender` | 0.15–0.95 | 0.45 | finished inner / outer radius |
| `alternate` | off / on | off | long / short points (N even) |
| `altRatio` | 0.4–0.95 | 0.72 | short tip / long tip |
| `edgeMode` | straight / convex / concave / s-curve / scalloped / custom | straight | quick modes write the curve's points; a drag makes it custom |
| `edge` | curve value | straight | `bloom-curve.js` value, `single` mode, x along the chord (0 = tip, 1 = inner vertex), y the outward normal offset as a fraction of the chord |
| `scallops`, `scallopDepth` | 2–9, 0.01–0.08 | 4, 0.03 | the scalloped quick mode |
| `tip` | sharp / blunt | blunt | a fillet of `tipRadius` mm at the tip |
| `tipRadius` | 1–8 mm | 3 | |
| `profile` | straight | straight | faceted is phase 6 |
| `opening` | 20–80 mm | 40 | back-half opening diameter |
| `ringWidth` | 10–40 mm | 24 | |
| `hangHole` | off / on | off | 6 mm hole on tip 0's ridge |

Finished and flat dimensions are both printed: W, D (achieved), r_v; R_o, R_i,
flat span (2 R_o), the facet angle, the derived bow, the tab width.

---

## 4. Pattern system (phase 2 — plan)

Point-oriented layout per facet, in the facet's own (along-the-point,
across) frame: a solid SPINE along the ridge crease (width from the material
model), a RIM BAND along the outer edge with a border motif (scallop, beads,
picot, dashed), an INTERIOR FIELD of motifs oriented along the point axis and
scaled by the local facet width so detail tapers toward the tip and never
violates bridge / hole rules; the tip degrades to a simpler motif or to solid.
Generators (kaleidoscope, seeded): paisley/scroll (default), lace/filigree,
botanical, geometric, celestial. Then SVG-into-wedge and SVG-across-face.
Validity: no islands (paper must stay one connected piece), bridge width, min
hole, fold and rim keep-out; a badge; the randomizer only yields valid designs.

## 5. Material model (phase 3 — plan)

One constants module labelled "starting values — confirm with test cuts".
Presets by gsm / caliper; derived minimum bridge, minimum hole, fold keep-out,
rim margin, spine width, tab width, kerf; a weight estimate and a sag warning.
Formulas will be documented here when the module lands.

## 6. Modularization (phase 3 — plan)

Any piece larger than the chosen bed is split per point (or per facet pair) on
VALLEY folds, each seam with a glue tab and matching labels; gate: every module
fits the bed with margin, every seam has a tab and a label pair.

## 7. Backing (phase 4 — plan)

Translucent pieces behind cut regions, per facet / region, outline = cut region
+ glue margin, trimmed off the folds; 1–3 colours by region with curated
palettes; "no backing" stays available.

## 8. Export (phase 3/4 — plan)

Machine profiles, score strategy (laser: mountains scored, valleys perforated
1 mm / 1 mm; blade: score layer), LightBurn-style layers (CUT red, SCORE blue,
PERF green, ENGRAVE black), bed presets and nesting, settings panel, test
grid, single-point coupon, SVG per sheet, ZIP, PNG, design JSON.

Phase 1 ships: the flat half as one SVG (outline, creases on their layers,
tabs, the opening and ring) and the design JSON save / load.

## 9. Instructions (phase 4 — plan), 10. Lit view (phase 5 — plan)

As briefed. Phase 1 opens on the FOLDED view with a slow turntable; phase 5
moves the default to LIT.

Why three.js for the 3D views: the folded view needs orbit controls, a
double-sided lit material and, in phase 5, a point light inside a translucent
shell with emissive cut regions and a projected shadow on a backdrop — all of
which three gives for one pinned CDN import (`three@0.161.0`, the version
every other generator here pins, so the headless tools serve one local copy).
Hand-rolled WebGL would be a week of shader and camera code for no gain and
no gate coverage. It is confined to `lantern-view.js`; nothing else imports
it, and the geometry module hands it plain Float32 triangle data.

---

## 11. UI

Site identity (ink #0A0A0C, paper #EDEDE8, teal #5FA0A0, Playfair Display
headings, Space Mono body, "EM / LANTERN" eyebrow, em-dash tagline). A left
control panel of collapsible `<details>` sections — Shape, Profile, (Pattern,
Backing, Material, Machine & Export, Instructions as their phases land) — and
the preview on the right with a Flat / Folded (/ Lit) toggle in its upper
right. NO "Advanced" section: fine controls live in a collapsed drop-down
inside their own section. A shape-preset strip with thumbnails above the
sliders, a randomizer, undo / redo, numeric readouts with units, tooltips.
Phone width stacks the preview over the panel.

## 12. Phases

1. Geometry core, page shell, Flat + Folded, curve editor, presets, gates.
2. Pattern system + validity.
3. Material model + modularization + export.
4. Backing + settings + test grid + coupon + instructions + ring.
5. Lit simulation.
6. Stretch: faceted-curve profile, SVG import, wall band, collapsible lock.

## 12a. What the phase-1 build found (beside §2.3)

- **Rigid triangles cannot fold two mirrored halves** (§2.2) and the cone
  model's closure table (§2.3) — the design's two load-bearing facts.
- A slider's `input` events mutate the state before its `change` commits, so
  a history snapshot taken at `change` is already the new value; the page
  records the gesture's start on the first `input` (the page gate's P2 found
  it: undo took 7 back to 7).
- `hidden` is not an IDL property of an SVG element: `svg.hidden = false`
  sets an expando and the attribute stays. The view toggle uses
  `toggleAttribute`.
- A stroke on a viewBox one unit wide is one unit wide: the editor's frame
  carries `vector-effect: non-scaling-stroke`.
- The flat sheet's bounding width is not 2·R_o for odd N (the tips are not
  opposite each other); the Flat view labels the SHEET size and the read-out
  the tip radius.

## 13. Verification

`tools/verify-lantern.mjs` (Node, pure): the solver closes (θ(1) = π/N to
1e-9) on the defaults, every preset and a parameter sweep; the rim is planar
and both halves' rims coincide; the 3D facet is an ISOMETRY of the flat one
(rim arc length, generator lengths, re-developed angle); the bow is convex and
small on the defaults; infeasible targets are clamped and told; the SVG is
well-formed with the named layers; the design JSON round-trips; tabs do not
collide. `--negative-control` mutates the geometry module and requires each
mutant to redden the clause that names it. `tools/verify-lantern-page.mjs`
(Chromium): the page loads clean, the views switch, the controls write the
state, the editor's drag lands, the exports download. `tools/shot-lantern.mjs`
takes the contact sheet. CI: `.github/workflows/lantern-gate.yml`, path-scoped
to the lantern's own files (and `bloom-curve.js`, which it imports).

## 14. Rulings needed from Eva

1. **Straight profile cannot be both slender (0.40) and 0.4 × width deep**
   (§2.3). Taken: default slenderness 0.45 at depth 0.42 × W (closes with no
   bow — the commercial proportion); the depth control is a target, clamped
   to the nearest closing depth and told. Alternative: make the faceted-curve
   profile the default once it lands (phase 6).
2. Default edge bow is DERIVED and drawn (a convex bulge where closure needs
   it). Alternative: hold the drawn edge exactly and derive the inner radius
   instead.
3. Alternating points: the 3D valley sits midway between long and short tips.
4. Tip default: blunt, 3 mm radius (a sharp paper tip tears on the fold).
5. Opening 40 mm / ring 24 mm wide — sized for a generic E26 cord kit; confirm
   against the kit she owns.
6. Collapsible lock / clip: not built (§2.9).
7. Phase 1 opens on the Folded view; Lit becomes the default when it lands.
8. Preset names and the randomizer's ranges (§3) are placements.

## 15. Out of scope, named

Moravian stars; true curved creases; anything in another generator.
