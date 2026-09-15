# Leaves on the bloom's stem — PHASE A: measure and show

Discovery only. **Zero geometry bytes**: `bloom-geometry.js`, `bloom-registry.js`
and `bloom.js` are untouched. Two tools ship, both of which build no mesh into
the repo, place no row, and are imported by nothing:

* `node tools/bloom-leaf-discovery.mjs [--section=1..7]` — every figure below,
  in seconds, with no browser.
* `node tools/shot-bloom-leaf-phase-a.mjs [outdir]` — `docs/img/leaf-phase-a.png`.

**Nothing was in flight against `bloom-geometry.js`.** The stem tip plug (#238)
merged as `1fd0af5`, which is `origin/main`'s head; no other open PR touches the
file. Builds serialise here and the path was clear.

**The leaf discovery session's outcome doc is not in this repository**, and the
search for it was bounded deliberately: this is the same class as
`claude/lobes-serration-status.md`, which CLAUDE.md records as having cost two
sessions to establish. Its three conclusions are stated in this session's brief
(the flower has real leaves in `flower.js`'s `buildLeafInto`; `flower-geometry.js`'s
"leaf" hits are petal VENATION and a different thing; the flower's connectedness
gate has zero leaf coverage) and its subject — the flower source — is in the repo
and was read directly where rulings 8 and 9 required porting a law.

---

## A1 — the outline and the cut separate cleanly. YES.

This was ruling 2's open half and the session's named risk. It is answered by
measurement, and the answer is that the split falls exactly where the ruling
wants it.

**`widthProfile` reads exactly two fields off `ring`:** `width` (which feeds the
root blend and nothing else) and `thickness` (the lobe pitch floor, which a leaf
owns anyway). Nothing else about the foot is reachable from the outline layer.

**The root blend already has a declared off-switch, and it has gate coverage on
`main` today.** `widthProfile` carries `rootBlend = stalk ? () => 0 : …` — "a
stalk narrower than the foot is the whole point, so the foot-continuity floor
stands down for it" — and `CAPABILITY_CLAW` exercises that branch on shipped
matrix rows. This is not a dead path being lit up for the first time.

**The identity (§1).** The same outline sampled at 4001 stations with
`ring.width` at 3.0 and at 40.0 mm, compared with `Object.is`, on the emitted
half-width:

| | root blend live | root blend stood down |
|---|---|---|
| LIVE | 917 of 4001 differ | **0 of 4001** |
| EXPORT | 917 of 4001 differ | **0 of 4001** |

`footHalf` is still *reported* on the record (carried, never consulted).

> Measured on `halfWidthAt`, **not** `shapeAt`. `shapeAt` is the shape term
> *before* the floors, so it is not what the builder emits; read there the same
> comparison is 174 rather than 917. A clause whose *measured* side is not the
> artefact measures something else — session 41's L7 lesson, and it applies to a
> discovery measurement exactly as it applies to a gate.

**The form law takes its frame as an argument (§2), which is what makes ruling 3
free.** `petalForm(state, halfW, t)` reads nothing off a ring at all;
`sectAt(C, T1, N1, h, u, hb)` and `frameAt(R, T, phi, u, up)` take every input
from the caller. Measured with no ring in existence: cup 0.80 gives an 8.8000 mm
section rise on a 22 mm blade, and twist 60/180 give frame rotations of exactly
60.0000° / 180.0000° base to tip.

**The cut is built on a flat 2D outline (§3).** The lobe arc table is
`rimArcTable((u) => [u*length, laminaHalf(u), 0], …)` — it touches no surface,
no foot and no ladder, and the whole lobe record builds correctly when
`widthProfile` is driven directly with a two-field stand-in ring.

**The ladder is not needed (§4).** Stationed uniformly at NU = 56 with no seam
and no ladder, the drawn tooth comes out at **80–95% of its analytic amplitude at
the worst of 200 phase offsets**, across serrate / crenate / dentate / the shipped
default at counts 5, 7 and 10. That is not a staircase; session 38's staircase was
3.0 rows per lobe at NU 28.

### The three substitutions, and they are one line each

| # | what reaches in | what a leaf substitutes | measured cost |
|---|---|---|---|
| 1 | `rootBlend` reads `ring.width` | the existing `stalk` off-switch | 0 floats move |
| 2 | the lobe window's lower bound is `ROOT_BLEND_END` | the petiole junction | withholds **31.3–31.6%** of the rim's margin arc, at every leaf size sampled |
| 3 | the count cap goes through `ladderWindowCapacity` → `HELD_ROWS` + `ladderGapFactor` | the leaf's own row capacity | conservative: it under-counts a leaf's available rows, so it caps teeth low rather than wrong |

**None of the three is structural.** The cut law itself — `lobeCutProfile`, the
`g(r)` two-exponent family, crest and notch shape, depth, the relief guard — reads
nothing from the foot or the ladder. `petalSurface` *is* deeply foot-coupled
(dome, radius, z, slope, overhang), and a leaf does not use it: it supplies its own
petiole frame to the same form law. That is additive work, not a refactor of the
petal's path.

**So the scope does not change and Phase B is not blocked.**

---

## A2 — the premise is false. The hazard is the ANGLE, not the bore.

The proposal was to **test** rather than adopt, so the premise was tested first.

**A petiole rooted on the axis is not detached.** A radial rod from the axis
crosses the wall annulus on its way out, and that crossing is a real solid
overlap: **exactly 2 × `STEM_MIN_WALL_MM` = 3.00 mm of material at every hollow
diameter**, because Eva's bore rule fixes the wall at 1.5 mm. Measured at one
component on the default 6 mm stem and on the widest 12 mm bore, at both cells.

> The probe is calibrated in the tool (two overlapping boxes → 1, two separated
> → 2, and the run refuses if not) **and its resolution is measured**: it merges
> two shells closer than **0.7 mm**, so a near miss under that is reported as
> saying nothing rather than as a pass. This mattered — the first negative
> control sat 0.3 mm from the bore wall under a 0.6 mm cell and was useless.
> A control has to sit near the boundary it is controlling for.

**What *is* reachable is detachment through the leaf angle — ruling 7's own
control.** The escape length for an axis-rooted petiole is `outerR / cos(θ)`,
which runs away as the angle steepens. Measured, a 10 mm axis-rooted petiole on a
12 mm stem:

| angle from horizontal | radius reached | verdict |
|---|---|---|
| 0° | 10.00 mm | 1 component |
| 45° | 7.07 mm | 1 component |
| **75°** | 2.59 mm | **2 components — DETACHED** |
| **85°** | 0.87 mm | **2 components — DETACHED** |

**The fix is a rooting radius, not a node band.** Rooted in the wall's
mid-thickness the petiole is embedded at every angle and only gets *more*
embedded as the angle steepens — `wall / cos(θ)`, 1.50 mm at horizontal rising to
17.21 mm at 85°. It is derived from two lengths `stemPlan` already owns (`boreR`
and `outerR`), it adds no geometry, it puts nothing inside a sealed cavity, and
it is inert on a stem with no leaves.

### What the node band would have cost, if it is ever wanted for stiffness

Recorded because the brief asked, and because "we considered it" is worth less
than the numbers. Ported node law (ruling 9), band = `2·rp + 2·STEM_MIN_WALL_MM`:

* **Bands merge** on short stems at high counts — 20 mm × 5 and × 8 nodes, 40 mm
  × 8 nodes — collapsing the stem to solid.
* **The bottom band meets the tip plug** on a 20 mm stem at every count tried.
* **It splits the bore rather than extending it.** The tip-plug session made the
  bore an *interval closed at both ends* — one sealed cavity, which O1 carries as
  one declared inward shell. N node bands give **N+1 cavities and N+2 boundary
  components**, so O1's declared-inward-shell count and ST1's triangle prediction
  both move with the node count. Those are shipped gate declarations.

**Recommendation: do not close the bore at each node.** Root the petiole in the
wall. The node band is the expensive fix for a problem a rooting radius solves for
nothing, and it costs two gate declarations to take.

---

## A3 — the picture

`docs/img/leaf-phase-a.png` — `node tools/shot-bloom-leaf-phase-a.mjs`.

Three phyllotaxies (alternate / opposite / whorled, the flower's own laws ported
verbatim) at 3 and 5 nodes, plus an **angle row** at 0 / 20 / 35 / 50 / 70°, which
is what the sheet is for. Every cell is print preview ON (`exportMode: true`),
whole plant in frame, labelled with node count, phyllotaxy, leaf length and width
in mm, and the angle. Stem 70 × 6 mm at the shipped defaults; bloom at DEFAULTS;
leaf 52 × 17 mm, petiole 1.8 mm × 7 mm; serrate at 9 teeth.

**Same-tree control: 0 bytes, across two full runs — an identity.** The renderer
is the rig's own (orthographic, painter's algorithm, flat shaded) and is **not the
app's**, so no pixel here is evidence about what `bloom.html` draws; what it is
evidence about is arrangement and angle, which are geometry. With no GPU, no
damping and no page session the control is exactly zero by construction, which
this project's contact-sheet rule says needs no noise floor.

One scale per row-group, from the union of that group's projected extents (grid
rows 3.93 px/mm, angle row 1.96 px/mm — its 0° cell is much wider). A row whose
cells each auto-fit would draw the same leaf at five sizes and the sweep would be
measuring the zoom.

**The overhang figures on the angle row are from VERTICAL**: a leaf at 0° is a
pure overhang at 90°, and the 45° line falls between 35° and 50°. The 45° rule is
the classic FDM one and is **a declared guess like every floor in this project** —
nothing here has ever been printed.

### A finding the sheet surfaced (§6)

**The flower's top-node inset is a fraction of the STEM, and it cannot say
whether the top leaf clears the HEAD.** The inset is `0.16 × stemLength`; a leaf
of length `Lf` at angle θ rises `Lf·sin(θ)` above its own node. Three different
lengths, and no fraction of one holds the other two. Measured over stems 30–120 mm
× leaves 40/52/70 mm × angles 30°/50°: **30 of 30 states foul the head**, by
+0.8 mm at best and +48.8 mm at worst. It is visible on the sheet as the dark mass
under the bloom in the opposite and whorled cells.

The inset a leaf actually needs is derived from the leaf — `inset ≥ Lf·sin(θ)`,
clamped and told. That is ruling 9's own reason ("express it in millimetres")
arriving as a measurement rather than as a preference.

---

## The cantilever — reported, not solved (§7)

A leaf on a petiole is a cantilever, and nothing in this project has ever been
printed, so this joins the stamens' and style's SLENDERNESS line verbatim:
**UNMEASURED — no coupon has been printed.**

The blade is one sheet thick (the petal's own rule), so its mass scales with
`L × W` and the root moment with `L² × W`. The worst lever a plausible control
range reaches is the longest leaf on the thinnest petiole: **120 mm on a 1.8 mm
petiole is L/d = 66.7**, carrying ~2,976 mm² of blade. Nothing here is a limit,
because there is no measurement to set one from. **Clamp and tell, never refuse.**

---

## EVA'S RULING — the leaf angle default is **35°**

Ruled from the angle row of `docs/img/leaf-phase-a.png`, Sep 15. It is the
sheet's own third cell, and it was ruled with that cell's overhang figure in
front of it.

**Recorded, not re-argued: 35° from horizontal is a 55° overhang from vertical,
which is past the classic 45° FDM line** — the sheet prints exactly that under
the cell, in red. Two things make this a ruling rather than an oversight, and
both are already on the record: the 45° rule is **a declared guess like every
floor in this project**, nothing here has ever been printed, and the coupon is
the only thing that can turn it into a bound. So the default stands at 35° and
the overhang figure stands beside it, the way the `petalTipShape` 1.70 default
stands beside 2.50 as Eva's preferred look.

**The RANGE is not decided by this.** 50° and 70° are both under the 45° line on
the same sheet, so a printable angle is one slider step away, and ruling 7's
"drooping through upright" keeps the full span reachable.

---

## Phase B — the plan, and what Phase A changed about it

**Not started.** Two items on the brief's own Phase B list are changed by what
Phase A measured, and both are flagged for Eva before a build spends a session
on them:

1. **The node bands are dropped.** A2 measured the premise false. They solve
   nothing about attachment, and taking them would move O1's declared
   inward-shell count and ST1's triangle prediction — two shipped gate
   declarations — for a problem a rooting radius answers for free.
2. **Leaf serration needs its own controls**, and that is a decision rather than
   a reading. Ruling 2 names "the g(r) cut law, crest and notch shape, count,
   depth" as the machinery a leaf shares. Sharing the *machinery* is not sharing
   the *values*: if a leaf read `lobeDepth` and friends, turning on petal lobes
   would serrate every leaf and vice versa — the organ-to-organ coupling session
   22 ruled against when it refused to let a style's presence move every stamen.
   So the plan gives leaves four of their own (`leafSerrationDepth`, `…Count`,
   `…CrestShape`, `…NotchShape`) in a nested drop-down, the `antherTip` /
   `stigmaTip` precedent. **Nine new controls total** — the panel cost is real
   and is the reason this is flagged rather than assumed.

### What A1 and A2 settle, and the build order

* **The blade** is `widthProfile` + `petalForm` on a petiole frame, stationed
  **uniformly**. No `petalSurface`, no `bladeStations`, no seam clearance, no
  foot rows. The three substitutions in A1 are the whole of the plumbing:
  the `stalk` off-switch, a lamina start replacing `ROOT_BLEND_END`, and a leaf
  row capacity replacing `ladderWindowCapacity`.
* **The petiole roots in the stem wall's mid-thickness**, `(boreR + outerR) / 2`,
  derived from two lengths `stemPlan` already owns. Embedded at every angle, more
  so as the angle steepens. **No node bands.**
* **Node placement** is the flower's law in millimetres, with the top inset
  derived from the leaf (`inset ≥ Lf·sin(θ)`), clamped and told — §6 measured the
  flower's stem-fraction inset fouling the head on 30 of 30 states.
* **Controls**: `leafLength` / `leafWidth` in absolute mm (ruling 5),
  `leafAngle` default **35°** (ruling 7, now ruled), `leafNodes` as its own
  control, `phyllotaxy` as the three ported laws (ruling 8), plus the four
  serration rows above. `leafLength` 0 is the guard, byte-identical by branch
  (ruling 6).
* **The assertion family comes first and is SEEN RED**, before any geometry —
  including specifically **a leaf on a HOLLOW stem**, which is the state the
  flower's gates could never reach and the one A2 §5 shows can actually detach.
  A steep-angle row is owed beside it, because that is the reachable failure.
* Then: the matrix block, the predeclared byte partition from the **builder's own
  record** (a row moves iff a leaf is actually built), and the owed frozen phase.
* `node tools/bloom-smoke.mjs --check` must report a **higher block count** — a
  green census that does not mention the new block is not a pass (session 34's
  block-27 lesson).

* **The blade** is `widthProfile` + `petalForm` on a petiole frame, stationed
  uniformly. No `petalSurface`, no `bladeStations`, no seam clearance, no foot
  rows. The three substitutions above are the whole of the plumbing.
* **The petiole roots in the stem wall's mid-thickness**, derived from `boreR`
  and `outerR`. **No node bands.**
* **Node placement** is the flower's law in millimetres, with the top inset
  derived from the leaf (`Lf·sin(θ)`) rather than from the stem — §6.
* **Controls** (rulings 5–8): leaf length and leaf width in absolute mm; leaf
  angle with no typed default, held for Eva's ruling from the sheet; node count
  as its own control; phyllotaxy as the three ported laws. `leafLength` 0 is the
  guard, byte-identical by branch.
* **An assertion family built before the geometry and seen red**, including
  specifically **a leaf on a HOLLOW stem** — the state the flower's gates could
  never reach, and the state §5 shows is the one that can actually detach.
* A matrix block, a predeclared byte partition from the builder's own record, and
  the owed frozen phase.

## Not ported, and why

* The flower's lobe law — crest 1.0000 (a corner), notch 2.0000 (parabolic) — is
  one fixed point of the two-exponent family the bloom already ships at 0.60–3.00
  each. Strictly less expressive.
* Its proportional cut with a `sin(πu)` envelope: MODEL A plus the relief fade,
  both measured and replaced in session 42.
* `LEAF_UP_TILT = 0.36` (ruling 7); `leafSize` as a length multiplier (ruling 5).
* **The golden-angle / azimuth disagreement, recorded so it is not reproduced:**
  `stemCenterline` kinks the stem at `k * GOLDEN_ANGLE` while `leafAzimuths`
  flips leaves 180° — confirmed present in `flower.js`. Moot while the bloom's
  stem is straight (`stemStations` returns `[0, lengthMm]`), and it must not come
  back with curvature.
* `stemCurve`, the venation/infill inheritance, `continuousMargin`, `tipStyle`.
