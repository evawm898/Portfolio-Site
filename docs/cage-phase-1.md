# /cage — the Parametric Cage, Phase 1

A decorative birdcage generator at `cage.html` (hidden: `noindex`, unlinked from the nav).
One 3D model; the STL is the solid, the SVG its front elevation. Files: `cage.html`,
`cage.css`, `cage.js`, `cage-geometry.js`; gates `tools/verify-cage.mjs` and
`tools/verify-cage-page.mjs`, the page harness `tools/cage-page-harness.mjs`, the ruling
sheet `tools/shot-cage.mjs` → `docs/img/cage-phase-1.png`; CI `cage-gate.yml`.

## 0. The audit — what is imported, what is copied, what is new

| Source | Finding | Used as |
|---|---|---|
| `/dress` | The deployed page has **no curve editor**: `dress.html` loads only a glTF viewer. The draggable profile lives in `tools/dress-shell/shape-editor/`, an offline dev tool behind a Python API, canvas-only, y-only drags, no insert/remove, nothing exported. | **Not used.** |
| `bloom-curve.js` | Pure, no DOM: a curve VALUE (`{mode, points}`), the PCHIP sampler for a function curve, `proposeEdit` (refuses, never clamps), `nearestOnCurve`. The /lantern editor over it is 83 lines, coupled to lantern state. | **Imported unchanged** as the profile's value and law (`PROFILE_SPEC`: `single`, monotone in height, radius 0.08–1 of the half width, ends locked in x). The SVG editor in `cage.js` is the lantern editor de-stated (~70 lines). |
| `/bug` | Registry-driven panel (`SECTIONS` + `PARAM_SPEC`, `visibleWhen`, nested collapsed `<details>` for fine controls, no "Advanced"), the Render/SVG toggle, the three.js camera and lights, the STL writer and `Acc` (both inline in a 4,198-line file, `Acc` not exported). Floor: `MIN_DIAMETER_DEFAULT` 1.0 for SLS PA12, a declared guess. | **Copied**: the panel builder (~50 lines), the view framing and lights, the toggle's shape. Not imported: nothing in bug is a module boundary. |
| `/frame` | `Mesh` (indexed accumulator), `exportStl(relief, header)` and `analyzeStl` are exported from `frame-relief.js`; `MIN_FEATURE_MM` 1.0. The filigree is **strictly planar** — a 2D spine lifted as a height-field prism by `bandSolid`; nothing sweeps a 3D polyline. | **Imported unchanged**: `Mesh`, `exportStl` (the gate imports `analyzeStl`). The filigree is untouched and is Phase 2's: a ring band is a developable strip, so a planar scroll group unwraps onto it. |
| `/bloom` | `revolveInto` (12 core lines: rings + two pole fans, closed by construction); `buildHubInto`'s dome arms are entangled with `footRing`, the stem join and face tags. `MeshBuilder` is non-indexed. | **Copied**: `revolve()` is `revolveInto`'s core over an `(r, z)` profile. Noted as a duplication; not extracted because `bloom-geometry.js` sits in five gates' path filters. |

**Written fresh**: the tube sweep (`tube()`: rotation-minimising frame, the elliptical mitre at
every vertex — `1/cos(half turn)` along the in-bend direction, so a polygon ring's corners are
true mitres and a smooth curve's are ~1; closed loops spread the frame's end-to-end twist round
the loop; open runs close on end fans), the surface (`polyRadius`, the cap laws, the door
outline laws), the door cut, the base styles, the hanger, the front-elevation SVG.

**No existing page changed.** `git diff main --stat` touches only `cage*`, `tools/*cage*`,
`docs/cage-phase-1.md`, `docs/img/cage-phase-1.png`, the workflow and CLAUDE.md.

**CI path filter.** No workflow carries `tools/**` any more (#335/#340 narrowed the flower
gates), so a cage-only change starts no flower or bloom gate — checked against every `paths:`
list under `.github/workflows/`. `cage-gate.yml` lists the cage's files plus the two imported
modules (`bloom-curve.js`, `frame-relief.js` and its two imports), so a change to those runs
the cage gate too; `bloom-curve.js` is already in six bloom filters and `frame-relief.js` in the
frame's, which is unchanged.

## 1. The model

Z up, the base ring at z = 0, the door facing −y (the front elevation looks along +y, x to the right).

- **Surface**: the profile curve gives the circumradius `ρ(z) = (width/2)·f(z/H)`; a polygon
  (4/6/8) takes `polyRadius(ρ, θ, N)` — the boundary of the regular N-gon of that circumradius.
- **Top cap**: height `topHeight × ρ(H)`; radius law `g(s)`: dome `√(1−s²)`, spire
  `(1−s)^1.35`, onion a bulged cap, flat none.
- **Bars** at even azimuths (a polygon's count is rounded to a multiple of N so every corner
  carries one, told), sampled every 1.5 mm up the body and 1.0 mm over the cap. Converging
  bars run over the cap until neighbouring bars are **one printable gap apart** (pitch
  `2·rBar + floor` — Eva's ruling 1, replacing the 1.05-diameter pack: the bars read as
  individual wires meeting a collar), where a turned **collar boss** (a revolve: a band the
  bars enter, a bead 1.14× proud of it, a crown to a flat seat the hanger stands on) takes
  them; its radius is derived from the count, the bar and the floor, never typed
  (`collarMult` scales it, default 1.0). Bars ending at the top ring leave the cap to **half their number of
  ribs** (told). A flat top gets **2N spokes (8 round) and a hub** so the hanger has something to stand on (told).
- **Rings**: base and top at `ringMm × frameRingMult`, `ringCount` between, even or
  clustered toward the ends (`t' = ½ + ½·sign(u)·|u|^0.45`), **and one at every profile
  shoulder** (ruling 5): a knot of the drawn profile whose two chords, in millimetres, turn by
  `SHOULDER_DEG` (25°) or more — PCHIP is C1 at every knot, so a one-sided slope cannot see a
  step and the chords are what decide it (`profileShoulders`). A shoulder within
  `max(3·rRing, 2·rFrame + rRing)` of a ring already placed takes that ring; the rest are
  added and told. The tiered preset's two shoulders (75 and 86 mm) carry rings now; the bell
  and the onion, whose chords turn by 8–20°, get none. A polygon ring samples each
  face 16 times with the corners exact.
- **Door** (§9, Nov 9): an outline in (u, z) on the surface, u the lateral fraction of the door at
  that height — rectangle, round arch (radius `min(a, h/2)`), gothic (two arcs of radius W, rise
  `min(0.6h, √3·a)`), ogee (pointed, rise `min(0.55h, 1.1a)`), a the half width at the springing.
  It spans k whole bar gaps and its **jambs are bars**; it is centred at the front on a bar or a gap
  (a polygon: on a face centre — the lattice turns so it is the front); its **sill sits on a ring** and
  its head stays a printable gap under the first shoulder ring, banded ring or the top ring. Every bar
  inside stops on the sill and starts on the head, every ring it crosses ends on the jambs or the head,
  each cut end a vertex of the frame wire. Width held to 42 % of the circumference (round) or the face,
  height to 92 % of the body; every snap told.
- **Base**: plain ring; tray (a revolved dish with a lip, polygon-aware); scalloped skirt (a
  closed wall whose lower edge sags in `scallopCount` scallops — ruling 9: fewer, wider, the
  count a control (2–24, default 8, about one per two or three bars), BUILT as the divisor of
  the bar count nearest the asked one so every cusp sits on a bar, told when it moved);
  feet (turned buns, N under the ring).
- **Hanger**: ring, hook (a J in the x–z plane), finial + ring (a turned spindle, then the
  ring) — it stands on the collar's seat (or the flat top's hub), ruling 1.

**Print.** Floor `MIN_FEATURE_MM = 1.0`, assumed for **SLS PA12** (the process this site's
generators assume; nothing has been printed). Every wire radius is floored and the clamp
told. SLS needs no support, so **overhang is reported, never clamped**: the read-out prints
the shallowest angle any wire makes with the horizontal and where — on the presets it is the
hanger ring (5°) or the hook (0°), and under 45° it says an FDM print would want support there.
The dome ribs read 25–60° at the collar; a flat ring is a bridge for FDM and is not counted.

## 2. Numbers (EXPORT = LIVE; one model, one mode)

**[Nov 9: superseded by §9.4 — the door placement moved every preset's door and the hex lantern to 24 bars.]**

| Preset | overall mm | triangles | STL | bars | door |
|---|---|---|---|---|---|
| Bell (default) | 97 × 186 | 64,132 | 3.1 MiB | 22 | arch 28×46 |
| Cylinder | 92 × 152 | 53,420 | 2.5 MiB | 20 | arch 30×48 |
| Pyramid / cone | 107 × 162 | 42,244 | 2.0 MiB | 16 (4-gon) | gothic 26×50 |
| Onion | 98 × 175 | 66,420 | 3.2 MiB | 24 | ogee 28×50 |
| Tiered dome on drum | 102 × 189 | 73,736 | 3.5 MiB | 24 | rect 30×40 |
| Hex lantern | 89 × 179 | 51,500 | 2.5 MiB | 18 (6-gon) | rect 28×52 |

(After the Oct 29 default tweak, §6: every preset on 1.1 mm bars, the bell at 90 × 140 as the
default, the onion with its third ring. The default's collar boss reads r 7.35 mm, bead 8.38 mm,
the twenty-two 1.1 mm bars meeting it 2.10 mm apart — `2·rBar + floor`, the floor's share now
the larger half of the pitch. The overall box is the body plus the base and the finial. Before
this round the cylinder was the default at 53,420 and the bell read 61,052 at 100 × 120.)

Worst reachable: 48 bars × 240 mm ≈ 230 k triangles. Builds are ~40 ms; a slider drag rebuilds
on the next frame.

## 3. Gates

`node tools/verify-cage.mjs` (452 checks over 6 presets + 24 random cages): C1 the STL's
bytes are watertight (`analyzeStl`, boundary 0); C2 every part is its own closed shell
(directed-edge census per part); C3 ONE piece (a 1.0 mm voxel flood fill); C4 every emitted
wire at or above the floor; C5 every cut end ON the frame wire, C5b the door cuts bars, **C5c
no bar or ring sample inside the opening, restated from the EMITTED frame alone** (a
point-in-polygon in (arc, z) — the clause the uncut-ring mutant needed; the ends-only clause
could not see a ring that was never cut); C6 polygon corners; C7 the mitre read off the base
ring's own vertices (`R + r/cos(π/N)`); C8 ring heights and clustering, **C8c every profile
shoulder carries a ring** (the shoulders restated in the gate from the CONTROL's points by the
chord law, never read off the builder); C9 converge / ribs / spokes, **C9b neighbouring bars
meet the collar one printable gap apart** (the chord between the bars' last cap stations off the
EMITTED wires against `2·rBar + floor` restated from the controls; round cages); C10 the SVG
census and mm viewBox; C11 determinism; C12 the overhang report; C13 the floor told; C14 a
profile outside the box refused; C15 the polygon rounding told; **C16 the skirt's cusps** (the
shallowest points of the emitted edge) **sit on bars and divide the bar count**, told when the
asked count moved. `--negative-control`: thirteen mutants, each caught by what it names, 13 of 13
(the three new: a step that gets no ring, bars packing until they touch, cusps off the bars).

`node tools/verify-cage-page.mjs` (14 checks, Chromium): controls in the DOM, a slider's own
input rebuilds, preset → custom, visibility both ways, the SVG stage shows the export's own
paths, **the page's STL equals Node's build within 8 float32 ULP of the largest coordinate
(measured worst 2.6e-15 mm, on axis points; an exact identity across two V8s is a claim this
repo has measured false)**, a real pointer drag narrows the base and rebuilds, a drag past the
box is refused with the point left where it was, both downloads, Randomize. `--negative-control`:
four mutants of `cage.js`.

## 4. Decisions made without a ruling (each reversible, named)

1. ~~**Bars pack to 1.05 diameters at the collar** and the collar is a turned cap sized from
   that.~~ **RULED Oct 29 (1): a looser pack with a visible boss** — bars meet the collar one
   printable gap apart (`2·rBar + floor`, derived), the collar is a turned boss with a bead,
   and the hanger stands on its seat. *Rejected*: a typed collar radius. *Undo*: `collarPitch`
   in `buildCage`, `collarMult`.
2. **A polygon's bar count rounds to a multiple of N** so every corner carries a bar, told.
   *Undo*: one `if` in `buildCage`.
3. **Bars ending at the top ring leave half their number of dome ribs** (the Victorian
   dense-body / light-dome look). *Rejected*: a bare dome (the hanger would float).
4. **A flat top carries 2N spokes and a hub.** *Rejected*: nothing (no hanger seat).
5. **The door is always on the front (−y) and is cut cleanly; bars end buried in the frame
   wire.** No infill in Phase 1 by the brief. **[Nov 9: the door's PLACEMENT is ruled by §9 — its jambs are bars, it is centred on a
   face or a bar/gap at the front (the lattice turns), its sill sits on a ring.]**
6. **The ogee's point and the gothic's rise are fractions of the door height** (0.55 / 0.6)
   so the door keeps its jambs. *Undo*: `doorTop`.
7. **The SVG draws every wire, back and front** (a cage is its wires), each at its own
   diameter, solids as silhouettes; paper `#EDEDE8`, ink `#0A0A0C`.
8. **Default size 90 × 110 mm body**, bars 1.4 mm, rings 1.8 mm, frame rings 1.25×. **[Oct 29,
   second round: SUPERSEDED by §6 — the default is the BELL at 90 × 140 on 1.1 mm bars.]** (Ruling 6
   left the size bracket unfilled and asked only that the default be taller than wide: 90 × 110
   is, so it stands.)
9. **The shoulder threshold `SHOULDER_DEG` = 25°** (ruling 5 asked for a ring at every
   step/shoulder and did not say what a shoulder is): chosen so the tiered preset's two knots
   (55° of chord turn) and the random step family read as shoulders while the bell's (8°) and
   the onion's (17–20°) do not. *Undo*: one constant.
10. **Scallops default 8, built as the nearest divisor of the bar count** (ruling 9 asked for
   about one per two or three bars with cusps on bars; a divisor is what puts every cusp on a
   bar at any count). *Rejected*: snapping the bar count to the scallops. *Undo*: the divisor
   reduce in the skirt block.

## 5. Eva's rulings on the Phase 1 sheet (Oct 29) — the open questions, answered

1. **Collar**: a looser pack with a visible collar/boss at the apex; bars read as individual
   wires meeting a collar, not fused; the hanger attaches to the collar. **Applied** (§1, §4.1).
2. **Dome ribs** at half the bar count when bars end at the top ring: **a fixed ruling, no control.**
3. **Polygon bar count rounding to a multiple of N**: accepted.
4. **Door on the front only**: fine for Phase 1.
5. **Every profile step/shoulder auto-places a ring**: yes. **Applied** (§1, §4.9).
6. **Default**: the bracket (keep 90 × 110, or change to ___) was left unfilled; the one
   constraint given is that the default be taller than wide. 90 × 110 is, and **stands**.
   **[Superseded the same day by the default tweak, §6.]**
7. **Print process**: the bracket (SLS PA12 at 1.0 mm / other ___) was left unfilled; the one
   instruction was that the floor be a single named constant. It is — `MIN_FEATURE_MM` is the
   only floor, every wire and the skirt read it — and **SLS PA12 at 1.0 mm stays the assumption**.
8. **Size range** 40–160 W, 40–240 H: fine.
9. **Scalloped skirt**: fewer, wider scallops with the count a control (about one per two or
   three bars, cusps on bars). **Applied** (§1, §4.10).
10. **Phase 2 route**: confirmed in principle, and **not started** — /frame's ornament is being
   reworked (it floats instead of following the shape); the cage's bands consume it once that
   lands. **A bell's sections are not developable**: the ring bands of a profile that curves
   in height are surfaces of revolution with curvature, so a planar scroll group cannot unwrap
   onto them exactly. Phase 2 will approximate each band as a **cone segment** (the frustum
   through the band's two edge rings — developable, a 1-chord error of the profile's sagitta
   across the band's height) and unwrap onto that; the cylinder and the polygon faces are
   exact. Recorded here so Phase 2 does not rediscover it.

## 6. The default tweak (Oct 29, second round) — defaults and presets only, no new control

Three rulings, each a value in `cage-geometry.js`'s registry or preset table and nowhere else.

1. **The default cage is the BELL at 90 W × 140 H, dome 0.6.** `DEFAULTS` is the registry's
   defaults with `PRESETS.bell` spread over them and `preset: 'bell'`, so the page opens on the
   bell and the preset menu says so; every registry slider default was moved to the bell's own
   value too (bars 22, door 28 × 46 at 0.08, tray base, finial hanger), and C0c holds the two
   owners equal so they cannot drift. The bell preset itself moved 100 × 120 / dome 0.75 →
   90 × 140 / dome 0.6, so picking Bell after a Reset is the identity. Overall 97 × 186 mm with
   the tray and finial — clearly taller than wide. The cylinder is unchanged as a preset.
2. **The default bar is 1.1 mm**, on the registry row and on every preset (all six carried the
   old 1.4). **1.1 sits above `MIN_FEATURE_MM` (1.0), so no floor binds on it** — C0d asserts
   that, and C13's 0.8 mm bar is still raised and told. The collar pitch is `2·rBar + floor` =
   2.10 mm against the old 2.80 (the floor is now the larger half), so the apex boss shrinks
   from r 7.6 to 7.35 mm on the default's 22 bars.
3. **The onion gets a ring at the neck**: `ringCount` 2 → 3, even placement, so the upper ring
   lands at 0.75 H where the profile has fallen from its widest (0.55 H, radius 1.00) toward the
   top (0.74). The bracket offered "add a ring at the neck / leave as is"; it was read as the
   first. A decision made without a ruling inside it: three even rings rather than `clustered`
   (which would have put the upper ring at 0.805 H and moved the lower one to 0.195 H as well) —
   literally one ring added, nothing else moved; one field to change back.

Measured: C0–C16 455 of 455 (four new C0 clauses), 13 of 13 mutants; the page gate 14 of 14, 4 of
4. The cone's and hex lantern's triangle counts move only through the thinner bar (the sweep's
sector count does not change, so the delta is the tube's vertex count in the collar pack); the
bell's +3,080 is 20 mm more bar. The sheet `docs/img/cage-phase-1.png` is re-rendered on these
defaults. No bar of any preset is floored.

## 7. The design-system re-skin (Nov 9) — chrome only, no geometry

#511 had already put `/cage` on `tokens.css` (Fraunces + Plex Mono, every chrome colour a token,
`EM / CAGE` eyebrow kept). What was left, and is done here:

1. **The canvas ground is the ground token** (`#060707`, read from `--color-ground` at boot), not
   the page's old `#0A0A0C`. The cage's metal material and lights are artwork and keep their colours.
2. **The read-out's separators are em-dashes in faint** (DESIGN.md rule 3), where they were `·` in dim.
   The told list's `·` bullets are line markers, not separators, and stay.
3. **The SVG view's stage is ground; only the SVG's own paper rect is light.** The whole stage was
   `#EDEDE8` paper with the header text recoloured `#55554f` and the ground colour over it — chrome
   text outside the six text tokens, in the one view the palette gate does not render. The stage
   now pads left past the header column (and down past it at phone width), so the light sheet never
   sits under chrome text.

Nothing in `cage-geometry.js` moved; C0–C16 read 455 of 455 unchanged. The page gate gains
**P5c** (SVG mode: the stage is ground, every header text a text token) and **P5d** (the canvas
ground pixel is `6,7,7`; the separators are faint em-dashes and no ` · ` is left), with three
mutants — the canvas keeping its own ground, the dots back, the paper stage back (the first
mutant in that table on `cage.css`; a mutant now names its file). 16 of 16, 7 of 7.
`cage-gate.yml`'s comment still says "four broken copies of cage.js": left alone on purpose, since
editing an existing workflow file costs frozen tags dispatched afterwards.

The default comparison asked for (90 × 110 on 1.4 mm bars against 90 × 140 on 1.1 mm) is on the
sheet for the eye; the second is already the shipped default (§6, ruled Oct 29). Sheet:
`node tools/shot-cage-reskin.mjs <dir> --png docs/img/cage-reskin.png`.

**Phase 2 (decorative ring bands) did not start**: of /frame's seven elements, beading and the
leaf-tip run are merged and follow the frame (`frame-pattern.js`, #477), but the shell, palmette,
rose, rosette and bud (`frame-elements.js`, #479) are standalone primitives placed on no frame,
their rulings still pending (frame charter §16), and the wiring session that reconciles the
palmette and rosette with the chain motifs has not happened.

## 8. Phase 2, step 1 — ring bands: beading and the leaf-tip run (Nov 9)

Eva's ruling (Nov 9): go ahead with **beading and the leaf-tip run only**; the rosette and palmette
bands wait until /frame places those elements (frame charter §16). **RULED Nov 9, from the sheet: the
default stays PLAIN** — `bandStyle` ships `none`, so the default cage is the Phase 1 cage to the byte (B0),
and C0f pins it (no preset names a band). Both styles ship as offered; the leaf-tip run reading as a rope
at full size was put to Eva with the sheet and not asked to be reworked.

### 8.1 What is imported, unchanged

Every element is /frame's own code, called as it ships (frame charter §15):

- a **bead** is frame-relief's `sphereSolid` on its own lattice (`PATTERN_LAT` × `PATTERN_LON`);
- a **leaf** is frame-filigree's `buildLeaf` (one lobe, no curl, sixteen stations — frame-pattern's
  `LEAF_RUN_LOBES` / `PATTERN_LEAF_STATIONS`) swept by frame-relief's `bandSolid` in frame-filigree's
  `leafProfile`, its width `LEAF_ASPECT` × its length and its crown `max(floor, LEAF_RELIEF × width)`;
- the **rules** are frame-pattern's constants: beads fused at ≤ `BEAD_FUSE` (1.8) × r and no closer than r;
  a laurel run's pitch inside [`LEAF_RUN_PITCH_MIN`, `LEAF_RUN_PITCH_MAX`] = ½–¾ of a leaf, each base
  stacked a crown over the previous tip (frame's own lift law).

Nothing in frame-*.js moved. **`cage-gate.yml` now names frame-pattern.js and frame-filigree.js** in its
path filter (the cage imports both), and the geometry job's limit rose 20 → 45 min: the 48 cages and
23 mutants made the negative control ~25 min, and the first CI run on this branch was cancelled at the
old limit. **This is an edit to an existing workflow file**, so a frozen tag dispatched after this merges
from a base that predates it will be refused (CLAUDE.md's rule of thumb). Every registered phase was
published before this change (through phase95), so none is owed today. The gate's own per-part
closedness check was also made ~3× faster (vertices keyed by position once, edges packed as numbers),
which took the local gate from 86 s to 59 s with the same answer.

### 8.2 The mapping — the cone segment, through the ring

Each element is built flat by /frame's code in a development (along the ring `s`, across it `t`, out of
the surface `w`; a bead directly in 3D) and every vertex is mapped onto the **cone segment through the
ring**: the frustum through the ring's own centreline whose slope is the chord of the profile across the
band's height (§5 item 10). On a **round** section the map is the exact development of that cone — the
arc at slant `t` is `θ · r(t)`, so a leaf laid along the developed parallel lands with every length
kept; on a cylinder it is the identity. On a **polygon** each face is a plane: the along-distance from
the face's centre is kept, so the map is exact on every face and folds at the corners.

**A decision made without a ruling:** §5 item 10 named the frustum through the band's two EDGE rings;
this uses the frustum through the RING with the same slope, i.e. the edge-ring frustum moved outward by
the profile's sagitta across the band. It puts every bead's centre exactly on its ring and every leaf's
underside through it; the cost is that the band's edges stand off the true surface by at most that
sagitta (reported per build: ≤ 0.11 mm on the bell, ≤ 0.39 mm on the tiered cage's step). B9 bounds it.

### 8.3 The snap — one on every bar

Every bar gap holds the same number `n` of elements, the first ON the bar — a bead's centre on the bar's
crossing with the ring, a leaf's base on it — so the run never sits at a random phase to the bars.
`n` comes from the asked spacing (× the bead's diameter or the leaf's length) and is then held inside
the run's own rule over every gap; the built spacing is told whenever it differs from the asked by more
than 0.02 ("snapped to the bars — ring 2 5 a bar (110), spacing 0.75"). On a polygon the bars sit at
equal AZIMUTHS, so the gaps along a face are unequal and the spacing is a range; where no single `n`
keeps every gap inside the rule, the run is built at the fused end and told.

### 8.4 The other rules

- **Proud of the ring** (a decision made without a ruling, `BAND_OVER_RING` 1.25): a bead's diameter
  and a leaf's width are held at or over 1.25 × the ring's own diameter, told. Under it a bead
  disappears into its ring.
- **Fused**: a bead's centre is on the ring's centreline, so the ring passes through every bead; a
  leaf's column stands from the ring's centreline outward (its crown lifted by the ring's radius), so
  the ring runs through every leaf; and every bar crossing the ring passes through an element.
- **The door** drops every element any of whose vertices would lie in the opening.
- **The SVG** draws a bead as its silhouette circle and a leaf as its projected planform, thin.

### 8.5 Controls (a new top-level section, "Ring bands")

| control | default | range |
|---|---|---|
| Band | plain rings | plain / beading / leaf-tip run |
| On | every ring | every ring / the rings between / base and top / top ring only |
| Bead diameter | 3.0 mm | 1.5–6 |
| Leaf length | 8 mm | 3–14 |
| Spacing | 0.70 × | 0.50–0.90, snapped |

"Each ring is plain or carries a band" is built as the On selector rather than a control per ring (the
ring count moves with the profile's shoulders, so a per-ring list would change length under the hand).
The randomizer draws the band fields LAST, so every earlier field of a seed is the sequence it was.

### 8.6 Gates and cost

- `node tools/verify-cage.mjs`: **997 of 997** over 48 cages (the presets, 24 seeds — about half of
  them banded now — each preset in each band style, the three ring selections, a bead under its ring
  and both styles at the widest spacing). The B family: B0 inert when off (byte-identical STL and SVG),
  B1 the rings named, B2 the snap (a bead's centre within the bar's own wire at every crossing — the
  emitted bar is a polyline, so its crossing carries the polyline's chord error, tenths of a mm on a
  profile step), B3 fused along the run (Eva's 1.8 r; ½–¾ of a leaf, round cages), B4 fused to its
  ring, B5 fused to every bar it crosses (a ray-parity point inside both solids), B6 the floor and
  1.25 × proud (an element's width read as the extent of its (radius, z) cloud — its z extent alone
  reads short on a sloped band, which is what the first cut measured), B7 clear of the door, B8 the
  SVG, B9 on the cage's own shape (the profile restated from the control through bloom-curve.js).
- `--negative-control`: **23 of 23** (ten band mutants). Five claims were widened on measurement,
  every one true collateral rather than a loosening: a run whose fuse cap or laurel pitch is dropped
  parts, so bars cross the ring outside every element (B5); beads floated outward sit on a wider circle,
  so neighbours part (B3); a band kept in the door opening sits where the ring was cut away (B4). And
  the plain-rings mutant was rewritten — forcing an unknown style through built elements with neither
  a centre nor an outline and threw in the SVG writer; it now builds real beads, and an SVG throw is
  C10's red rather than an abort. `--mutant=a,b` runs a named subset.
- `node tools/verify-cage-page.mjs`: **18 of 18** (P11 / P11b), `--negative-control` **8 of 8**.
- Cost, the default bell: 64,132 → **264,652** triangles with beading (12.6 MB STL), **359,044** with
  leaves (17.1 MB); the tiered cage's eight rings 408,536 / 605,960. A bead is 360 triangles, a leaf
  about 1,152. Build 70–170 ms. Sheet: `node tools/shot-cage-bands.mjs <dir> --png docs/img/cage-bands.png`.

## 9. Door placement (Nov 9) — the door is cut where the lattice is

Eva's report: *"sometimes it's in the corner and weird."* Reproduced first, then fixed by rule.

### 9.1 Step 1 — what was wrong, measured

`node tools/cage-door-diagnose.mjs [--module <cage-geometry.js>]` builds every preset × round / 4 / 6 / 8 ×
rect / arch / gothic / ogee (96 cells) plus 14 size extremes and reads the EMITTED model. On `d0e2ed0`
**all 110 cases were flagged**; by class:

| class | cases | what it is |
|---|---|---|
| CORNER | 49 | the door was always centred on −y, and on a 4- or 8-gon −y is a CORNER: the opening folded across two faces. **The shipped Pyramid / cone preset did this** — the "in the corner". A 6-gon's −y happens to be a face centre, which is why the hex lantern looked right. |
| SILL | 110 | the sill sat at `doorY × (H − h)`, on no ring: a stub of every door bar stood between the base ring and the sill (2–15 mm). |
| SLIVER | 20 | the door's width was a free number of millimetres, so a jamb fell anywhere between two bars; an uncut bar stood within a third of a pitch of a jamb. |
| JAMB | 7 | the door was a constant ARC width while bars are constant AZIMUTH, so on a taper (cone, a narrow body, a tall door on the bell) a jamb crossed a bar and cut it part-way up. |
| RING | 21 | a ring passed 0.8–1.5 mm under the head (the cylinder's 55 mm ring, two wires touching), or the door crossed a shoulder ring (tiered) or a banded ring and cut the band. |
| SURF | 0 | the frame always lay on the surface; the suspected flat plane was ruled out. |

### 9.2 The rules (Step 2)

- **The jambs ARE bars, on every cross-section** (the brief stated it for round cages; Step 1 showed slivers on
  polygons too, so it is applied everywhere). The door spans k whole bar gaps, k the count whose width at the
  sill is nearest the asked width; the frame's jambs replace the jamb bars, every bar inside stops ON the
  sill and starts again ON the head, its cut ends the frame's own vertices — no stubs, no slivers.
- **Centred on the front**: a round cage centres the door on a bar (k even) or a gap (k odd); a polygon on a
  FACE centre, never a corner, k up to the bars of that face — k equal to the face's own count makes the
  corner bars its jambs (the door is the whole face, its clear width the face less the jamb wires). The
  lattice is laid in its own frame with the door at its centre and **the whole cage turns once** (everything
  but the hanger, which is drawn square to the front) so that centre is −y. The 4- and 8-gons therefore turn
  45° / 22.5° and now show a face to the front; that is told.
- **Vertically**: the sill SITS ON A RING (the ring nearest the asked position that keeps the asked height,
  else the one holding the tallest door); the head stays one printable gap (`ring + frame + floor`) under the
  first shoulder ring, banded ring or the top ring above the sill, and clear of every other ring by the same
  gap; shortened and told. A ring the door crosses is cut AT the jambs below the springing and on the head
  above it, its ends the frame's own vertices. A banded ring is never crossed; a banded sill gives up the
  elements that would stand in the opening (told).
- **The frame follows the surface**: the outline lives in (u, z), u the lateral fraction of the door at that
  height (of the arc on a round cage, of the flat face on a polygon), so the door narrows with the bars up a
  taper and every frame vertex is a point of the cage. The head is sampled so no chord exceeds 1 mm (a gothic
  head rises steeply from its springing; the uniform samples left a 6 mm chord there, 0.09 mm off the surface).
- **The width is told when it snaps** (`door width 28 mm snapped to 25.7 mm — 2 bar gaps, both jambs on bars`),
  the sill when it moves, the height when it is shortened. The 42 % circumference cap and the 92 % height cap stand.

**Found and fixed on the way**: the gothic outline used 0.866 for √3/2, so its point stood ~1 µm above the
declared height — enough to read as "grazing" a ring sitting exactly one gap above it.

### 9.3 Decisions made without a ruling (for Eva's sheet)

1. **The presets ask for what they build**: every preset's door width, height and position were set to the
   built values so no preset tells a snap (bell 28 → 26 mm and position 0.08 → 0, the registry defaults
   with it; cylinder 30 → 28; cone 26 → 29; onion 28 × 50 → 27 × 47, its head one gap under the 50 mm ring;
   tiered 30 → 26 and position 0.10 → 0.15 so its sill stays on its 13 mm ring; hex lantern 28 → 20).
2. **The hex lantern goes 18 → 24 bars.** At 18 it carries three bars a face, so a face-centred door with its
   jambs on bars is either one gap (13 mm) or the whole face (43 mm); at 24 it is 20 mm. *Undo*: one field.
3. **Most doors now stand on the base ring** (position 0): the asked sill of every preset but the tiered one
   was nearest it. The position control still moves the sill ring by ring.
4. **A whole-face door on a polygon** (the corner bars as jambs) is allowed where it is the nearest width — the
   8-gons at 24 bars do it at the default width.

### 9.4 Numbers (EXPORT = LIVE)

| Preset | overall mm | triangles (was) | STL | bars | door |
|---|---|---|---|---|---|
| Bell (default) | 97 × 186 | 63,852 (64,132) | 3.0 MiB | 22 | arch 25.7×46, 2 gaps on a bar, sill on the base ring |
| Cylinder | 90 × 152 | 53,620 (53,420) | 2.6 MiB | 20 | arch 28.3×48, 2 gaps on a bar, sill on the base ring |
| Pyramid / cone | 107 × 162 | 41,864 (42,244) | 2.0 MiB | 16 (4-gon) | gothic 29.3×50, 2 gaps on a face, sill on the base ring |
| Onion | 96 × 175 | 66,460 (66,420) | 3.2 MiB | 24 | ogee 27.1×47, 3 gaps on a gap, sill on the base ring |
| Tiered dome on drum | 100 × 189 | 73,856 (73,736) | 3.5 MiB | 24 | rect 26.2×40, 2 gaps on a bar, sill on the 13.3 mm ring |
| Hex lantern | 86 × 179 | 63,180 (51,500) | 3.0 MiB | 24 (6-gon) | rect 20.0×52, 2 gaps on a face, sill on the base ring |

The hex lantern's +11,680 is its six extra bars; the rest move by the door's bar stubs going away and the
frame's finer head. Every STL is watertight and one piece (C1–C3).

### 9.5 Gates

`node tools/verify-cage.mjs` gains the **D family**, judged on the emitted frame, bars and rings — on every full
case with a door and, alone, over the whole 96-cell door matrix:
**D1** the door is at the front and, on a polygon, centred on a face with no corner of the emitted base ring
inside it (on a round cage, on a bar or the middle of a gap); **D2** its extreme azimuths are bars, every bar
end on the frame is a frame vertex — the lowest or highest at that bar's azimuth — and no bar of the door has
a sample between sill and head; **D3** the sill is on an emitted ring, the head is one printable gap under every
shoulder ring (restated from the control's chords), banded ring (restated from the control's selection) and the
top ring, and no ring grazes the sill or the apex; **D4** every frame vertex lies on the surface restated from
the control (the polygon's corners read off the emitted base ring) and every frame chord within 0.05 mm;
**D5** every snap is told. Eight full door cells (each section, each shape twice) and three extremes join the
cases. **C6 now reads the corners off the emitted base ring** (the lattice turns), and the bands' door test
counts the ring the sill sits on. `--negative-control` gains six mutants — the door on a polygon corner, the
jambs between bars, the door through a shoulder ring, through a banded ring, a sill floating 3 mm above its
ring, the frame on a flat plane — and three were re-anchored.

The diagnostic is `node tools/cage-door-diagnose.mjs`; the ruling sheet is
`node tools/shot-cage-door.mjs <dir> --base <worktree of d0e2ed0> --png docs/img/cage-door.png` (the
front half of every flagged case, before beside after, defects marked; and the default cage from both pages).
