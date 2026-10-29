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
- **Door**: an outline in (arc s, height z) on the surface — rectangle, round arch (radius
  `min(a, h/2)`), gothic (two arcs of radius W, rise `min(0.6h, 0.866W)`), ogee (pointed, rise
  `min(0.55h, 1.1a)`); the **frame** is a closed wire on that outline; every bar and ring run
  through the opening is **cut where it crosses the outline (bisected)**, so each cut end sits
  on the frame wire's centreline and is buried in it. Width is held to 42 % of the sill
  circumference and height to 92 % of the body, told. `onSurf` is the exact inverse of the
  cut's own arc coordinate, so the jambs and the ring ends meet to the bit (the first cut
  used an approximate inverse and the gate caught the polygon case 2 ends off).
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

| Preset | overall mm | triangles | STL | bars | door |
|---|---|---|---|---|---|
| Cylinder (default) | 90 × 152 | 53,420 | 2.5 MiB | 20 | arch 30×48 |
| Bell | 107 × 173 | 61,052 | | 22 | arch 28×46 |
| Pyramid / cone | 107 × 162 | 41,924 | | 16 (4-gon) | gothic 26×50 |
| Onion | 96 × 175 | 64,480 | | 24 | ogee 28×50 |
| Tiered dome on drum | 100 × 189 | 73,256 | | 24 | rect 30×40 |
| Hex lantern | 86 × 179 | 51,140 | | 18 (6-gon) | rect 28×52 |

(After the Oct 29 rulings; the tiered cage gained its two shoulder rings. The default's
collar boss reads r 7.6 mm, bead 8.7 mm, the twenty 1.4 mm bars meeting it 2.40 mm apart.)

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
   wire.** No infill in Phase 1 by the brief.
6. **The ogee's point and the gothic's rise are fractions of the door height** (0.55 / 0.6)
   so the door keeps its jambs. *Undo*: `doorTop`.
7. **The SVG draws every wire, back and front** (a cage is its wires), each at its own
   diameter, solids as silhouettes; paper `#EDEDE8`, ink `#0A0A0C`.
8. **Default size 90 × 110 mm body**, bars 1.4 mm, rings 1.8 mm, frame rings 1.25×. (Ruling 6
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
