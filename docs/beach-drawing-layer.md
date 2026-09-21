# Scene 3 — the drawing layer replaced

The wave object, its six stages, the reference tooling and the gate work from
#271 stay. What is replaced is the layer that turned all of it into marks.

`scene/beach-draw.js` — a halftone lattice that carried tone as stroke weight
and duty on a constant pitch — is gone. `scene/beach-brush.js` is the drawing
layer: a cartoon on paper, a mid-grey sea, a near-black wave face, scalloped
foam edges, brush strokes with a swelling width. It arrived as a working,
self-contained module verified in headless Chromium at three resolutions. This
session wired it; it did not illustrate anything.

---

## 0. The standalone picture did not move, and that is measured

`beach-brush.js` needed four edits to be wireable at all (below). The control
for every one of them is that the module, called with no wave list and no
published edge, draws exactly what it drew before:

> **0 of 11,289,600 pixels differ** over ten frozen states — a peel sweep from
> −0.30 to 1.70, a phase drift and a second seed — at 960x720, 1920x1080 and
> 2560x1440.

That is an identity rather than a threshold, so it needs no noise floor. It is
available because both sides were produced by the same page session drawing the
same content; the repo's rule about the renderer's determinism *between*
sessions still holds and no pixel delta is quoted anywhere else here.

Getting it took one correction worth keeping. The first cut moved the bubble
loop's random draws into a `bubbleParams()` call at the top of the wave — which
draws all forty-eight values unconditionally, where the loop skips two of every
three on a gated-out bubble. **5% of pixels moved**, on every cell, because
every later draw on the frame's shared stream shifted. The standalone branch
keeps the original loop draw for draw; only the wired branch reads stored
parameters.

## 1. The four edits to the drawing layer

Each one is a number moving from the module to a caller that owns it. Nothing
below changes a mark.

| what | before | after |
|---|---|---|
| the shear | `SHEAR`, a module constant | `state.shear`, from `beach-shore.js` |
| the swash front | `lobes()` generated here | `state.frontAt(u)`, the published edge |
| the strand line | a fixed `s = 0.755` | `state.wetAt(u)`, the high-water mark |
| the waves | two hardcoded | `state.waves`, one entry per live record |

Plus two mechanical splits that let a wave's foam be drawn once and stored:
`lobeParams()` / `lobesFrom()` (the parameter draw separated from the
evaluation, in fractions of the width so a stored set survives a resize) and
`bubbleParams()`. And one constant surfaced by name, `FOAM_ONSET_B`, read off
`foamw`'s own smoothstep, so the simulation's break clock and the drawing's
break phase have one owner for where foam begins.

`scene/beach-render.js` is new: the adapter, the only file that has read both
sides. It holds no state, no clock and no constant of its own.

## 2. The invariant: one curve

**The drawn foam edge and the published swash edge are the same curve**, because
there is only one curve. The scallops — the union of half-discs every cartoon
foam line has — are generated in `beach-swash.js` from each wave's own seed at
birth, folded into `extentOf`, and reach the drawing through `swash.edgeAtU`.
The renderer generates nothing.

Two halves, and both are checked:

* `draw/the-drawn-foam-edge-is-the-published-swash-edge` reads the front back
  **off the rasterised framebuffer** in twelve columns and compares it with the
  scene's own `swashYAt(x)`. Measured: **12 of 12 columns, worst 0.46 and mean
  0.31 CSS px.** The brief's bar was "within a pixel or two".
* `draw/the-drawing-takes-its-shear-from-the-shore`. `beach-shore.js` declares
  an ANGLE (3.0 degrees) and every published query goes through it;
  `beach-brush.js` declared a fraction of height dropped across the width,
  which is a different quantity and draws **5.0 degrees on a 4:3 frame and 3.76
  on 16:9**. Left alone the two lines would have diverged by seventeen pixels at
  the frame's edges however exactly they agreed about `s`. The shore wins; the
  module's own `SHEAR` stays as the standalone default. **This makes the drawn
  shoreline shallower than the module drew it, and that is a look change** — it
  is the one the invariant costs.

The read-back needed one carve-out, stated rather than hidden: **eleven bubbles
are drawn along the front after it**, each a paper disc with an ink outline, so
where one lands the first ink below the grey band is the bubble's rim and reads
seven pixels off. A column whose ink run is one pixel is not readable. The front
itself is brushed at `3.8 * H / 720` px and is never one pixel, so an edge
generated separately would still be in the subject — it would be a full-width
stroke in the wrong place.

## 3. What moving the scallops into the simulation cost

The front's shape is now the drawing's. Two consequences, both measured over
five seeds and five minutes each:

**(a) `WOB_S` changed value because its job changed.** It was "how deep the
scallops on a front run" at 0.020; the scallops are the drawing's now and it is
only the long wander beneath them. Its value is read off the drawing —
`bumps(..., 0.007 * H, 3, ...)` sums to 0.00947 of a frame height at its peak,
and `wob` is two sines summing to at most 1.5, so **0.00631**. Holding 0.020 and
adding the scallops puts the live front's peak-to-trough at **0.0496 against the
drawing's own 0.0344** — a third deeper than the picture that was verified.

**(b) `OVERRUN_MARGIN_S` was re-derived, 0.12 → 0.150.** This is a MEASURED
separation between two populations and the quantity it separates them by moved.
The same sweep the original used, on the front as it is now:

```
  margin   0.035  0.060  0.090  0.120  0.150  0.180
  quiet    12.32  12.32   7.24   0.36   0.00   0.00   overruns per minute
  w/ sets   8.24   5.60   3.48   3.04   2.80   2.64
```

0.150 reads exactly what 0.120 used to: nothing at all on a quiet beach, and the
set-driven rate down 8%. **The gate caught this rather than a reading of the
code** — `swash/an-overrun-fires-with-the-extent-it-reached` asserts zero
overruns in fifteen quiet minutes and went red at three. Holding 0.120 would have
left the event firing about once every three and a half minutes with no input at
all, which is the no-signal state that constant exists to avoid; the only other
lever was making the drawn scallops shallower than the drawing draws them, which
is tuning a picture to satisfy a simulation constant.

The high-water mark's own headline measurement is untouched: **30.0 px per 3.5 s
on a 900 px frame against 30.2 before.**

## 4. Wiring the wave records

* **A seed per wave**, drawn at birth. Every mark a wave makes comes off it, so
  nothing a wave draws depends on what was drawn before it.
* **Its lobes and bubbles drawn once**, at birth, off that seed, stored on the
  record as `drawA` / `drawB` / `drawBubbles`.
* **`height`**, new, energy-sized at birth. The range's ends are the module's own
  two numbers — `[0.048, 0.082]`, its far wave and its hero — which is the least
  invention available, and the shape is the one every other energy-sized field in
  that file already has. PICKED: nothing in the reference measures a wave's
  height against the size of the set that made it.
* **`peelS` is now energy-sized too**, as the brief asked. The direction (a
  bigger set peels over a longer stretch) is PICKED and stated; the energy shifts
  where in the range the draw lands and a jitter keeps the wave-to-wave variation,
  because a plain `LO + (HI-LO) * e` would make every wave on a quiet beach peel
  for the same 0.8 s.
* **`drawPhaseAt(w, u)`** is the map from this simulation's clock to the
  drawing's one number per column. Both scales are the record's own derived
  lengths — `breakAge` (birth to break) and `preS - breakAge` (break to the
  waterline) — and the anchor is `FOAM_ONSET_B`, imported. So the moment the
  simulation says a column has broken is the moment the drawing first puts foam
  on it.
* **A spent wave is not drawn.** `waveStage` says SWASH once the crest has
  crossed the waterline everywhere, which is where the drawing's phase reaches
  its spent end and where the swash front takes over the same stretch of beach.
  **The drop is not a visible pop, measured**: over 219 frames a drop event
  changes a median of 38,527 pixels against an ordinary step's median of 29,804
  and maximum of 103,591 — inside the ordinary frame-to-frame variation.

### Why `b` spans the whole seaward life

The first cut mapped the drawing's break phase onto `BAND_GROW_S + bandFadeS`
(2.6–3.8 s), which is where the simulation's own foam alpha reaches zero. **The
drawing has no fade**: its foam band grows with `b` and never thins. So a wave
hit `b = 1` about three seconds after breaking and then spent the remaining
**eight seconds** — half a frame of travel — drawing a full white band on its way
to the shore. Rendered, the middle of the frame was a stack of spent bands with
no faces in it. Spanning the whole seaward life puts the spent end exactly at the
hand-over to stage six.

## 5. The retirements, each named

The brief: *"Identify every check and mutant that encodes the photographic
approach, remove them EXPLICITLY, and say in the PR which ones went and why."*

**Five part-one checks** (`beach-tone`), all about `beach-draw.js`'s tone ladder:

| check | why it goes |
|---|---|
| the value ordering is the reference's own | `TONE.deep > shallow > gloss > wet > foam == dry == 0`. **The new drawing breaks this ordering on purpose**: its shallows are bare paper, LIGHTER than the wet-sand grey behind the swash front. There is no tone ladder left to order. |
| the foam band is a plateau of paper, not a ramp to one | about `waterTone`'s band profile. The foam is a paper FILL now; a plateau is what a fill is. |
| the run-up sheet is lighter than deep water | about the ocean gradient being anchored off the moving edge. There is no gradient. |
| the dry sand leaves a register for the marks session | **THE ONE REAL LOSS** — see below. |
| the swell fades out in the deep water | about `swell()`, the lattice's along-shore displacement. |

**Three browser checks**:

| check | why it goes |
|---|---|
| the value ordering holds and the dry sand is toned not blank | **the five-band ink-coverage comparison the brief names.** Band means plus a local-contrast floor on the dry band and a darkest-1% ceiling. The new drawing fails it by design and its sand texture is full-strength ink. |
| the foam band reaches bare paper | the band's longest bare run against the reference's 0.43–3.56% of frame. The foam is a fill; it is bare everywhere inside its own path. |
| the swell has somewhere to go | measured the swell's DELIVERED INK through `beach-draw.js`'s `__flatTone` hook. There is no lattice and no `__flatTone`. |

**Two wave checks**, this PR's own rather than the merged scene's:

| check | why it goes |
|---|---|
| the dark face is darker than the water on both sides of it | measured on the emitted TONE through `waveToneAt`. The finding is not lost — it is what the drawing now DRAWS, as a `PALETTE.ink` fill against a paper lip — but "darker than the water either side" is not a question a flat fill answers. |
| the face is one band across the wave while the foam is not | **it is false of the new drawing on purpose.** `faceBot` is `(0.040 + 0.030 * (1 - b)) * H + 0.22 h`, per column by construction. `beach-wave.js` held one depth because a bilevel row averaged across a varying one read as nothing; a fill has no such problem. Keeping it would have meant tuning the drawing. |

**Eleven mutants**, all on `scene/beach-draw.js` except the first:
`the-face-follows-each-column` (anchored on `faceCentreOf`),
`the-deep-water-keeps-the-old-saturated-tone`, `the-drift-phase-is-not-wrapped`,
`the-renderer-sets-its-own-transform`, `the-water-ramp-follows-the-moving-edge`,
`the-foam-band-is-a-ramp-not-a-plateau`, `the-swell-bands-the-deep-water`,
`the-dry-sand-is-blank-paper`, `the-sand-texture-is-in-the-marks-register`,
`the-register-headroom-is-given-away`, `the-foam-band-is-narrower-than-a-row`.

**Two sheet tools**: `tools/shot-beach-mockup.mjs` (the tone mockup against the
reference contact sheet, merged in #269) and `tools/shot-beach-stages.mjs` (this
PR's six-stage sheet, whose entire measurement half was row means and tone
targets). Replaced by `tools/shot-beach-brush.mjs`.

**And the tone half of `beach-wave.js`** — `waveToneAt`, `waveField`,
`swellDepthAt`, `faceCentreOf`, the constants `FACE_TONE`, `SWELL_TONE`,
`FACE_GAP`, `FACE_W`, `SWELL_W`, `BAND_RAMP_IN/OUT`, and the record's
`faceDepth` / `swellDepth`. The MODEL stays: `brokenAt`, `crestAt`,
`bandWidthAt`, `foamAlphaAt`, `faceAmountOf`, `stageAt`, `waveStage`,
`sortWaves`, `makeWave` and every measured constant. The measurements the tone
targets were set from are in `docs/beach-wave-object.md` and in that file's own
reference block.

### The loss, stated plainly

**The dry sand's marks register is gone and cannot be asserted.** The lattice
drew its sand texture at a declared alpha with 0.30 of headroom under the floor a
later session's drawn marks would start at, so the two could not collide. Every
mark in the new drawing is full-strength ink. **The sand-marking session will
have to separate its register some other way — by density, by shape or by
weight — and this paragraph is the whole of the warning it gets.**

## 6. What replaced them

Seven checks in a new `draw` section, none of which asks what tone anything is.

| check | what it reads |
|---|---|
| the drawn foam edge IS the published swash edge | the framebuffer, against `swashYAt` |
| the drawing takes its shear from the shore | the drawn shear against the shore's own slope |
| every wave is drawn once, with its own record | the renderer's tally against the simulation's list less the arrived waves |
| no wave is drawn once it is spent | both directions — a spent wave is never drawn AND a live one always is |
| the peel is monotone in time and runs across the frame | per wave, tracked over 90 samples |
| a wave's foam holds still between frames | two clauses, and the second is the one that matters |
| the nearer wave is painted last | the op stream, exactly |

Two of them needed a second clause because the first read the RECORD rather than
the artefact — session 41's mirror rule, in the family it keeps happening to:

* **foam holds still.** The record-reading clause asks whether a wave's stored
  lobe parameters moved. A renderer that ignored them and generated its own per
  frame leaves the record untouched and passes it. The second clause is about the
  marks: **a wave's op block must not depend on what was drawn before it** —
  measured, a wave's 5,160-op block is unmoved by the wave in front of it going
  from 4,813 to 6,128 ops. `the-lobes-are-drawn-per-frame` reddens the second
  clause and not the first, which is why the second exists.
* **the nearer wave is painted last.** Every count-and-order clause is satisfied
  by a renderer that draws ONE record twice, so the check also asserts the two
  waves' op blocks DIFFER. `every-wave-draws-the-first-waves-record` is its
  mutant.

The order check's first cut attributed ops to a wave by how near their y was to
that wave's crest, and **a wave's own foam band reaches 0.12 of frame height past
its crest** — so the seaward wave's marks landed inside the shoreward wave's
window and it failed on a clean tree. A wired wave draws nothing off the frame's
shared stream, so its op block is identical whoever it is drawn beside: the claim
is now that the stream for `[back, front]` is the background, then back's block
verbatim, then front's.

**Seven new mutants**: `the-renderer-generates-its-own-foam-edge` (the state the
drawing layer arrived in), `the-drawing-keeps-its-own-shear`,
`a-spent-wave-is-still-drawn`, `every-wave-draws-the-first-waves-record`,
`the-renderer-sorts-behind-the-callers-back`, `the-lobes-are-drawn-per-frame`,
`the-break-phase-runs-backwards`.

**And the anchor pre-check earned its keep**: re-deriving `OVERRUN_MARGIN_S`
disarmed `the-overrun-fires-on-every-wave`, whose `from` was the old literal. The
sweep refused before running a single mutant.

## 7. Performance

Measured on the same box, software GL, headless Chromium, `deviceScaleFactor` 1.

| | median | p95 |
|---|---|---|
| standalone, 960x720 | 3.9 ms | 6.7 |
| standalone, 1920x1080 | 3.6 | 6.8 |
| standalone, 2560x1440 | 2.9 | 7.1 |
| **wired**, 960x720 | **4.0** | **6.2** |
| **wired**, 1920x1080 | **4.0** | **7.0** |
| **wired**, 2560x1440 | **4.7** | **7.2** |

The standalone column reproduces the brief's own pre-wiring figures (~3 ms
median, <12 ms p95), which is what makes the two comparable. **The wired median
is 4.0–4.7 ms, under the ~8 ms the brief names**, with an average of 3.7 waves
alive against the module's fixed two.

**A reproducible ~1.2 s stall exists and it is NOT the wiring's.** Every ~160
frames the live scene spends 1.15–1.24 s on one frame; redrawing the identical
state costs 3–5 ms, so it is not the geometry. **The module standalone does the
same thing** — 3 stalls of ~1.0 s over 700 frames, one every ~217 — so it is a
property of the drawing's per-frame allocation (a fresh set of arrays per wave
per frame) and not of anything this session did. Wiring raises the frequency
about 1.35x, which is the extra waves. The mechanism is not established beyond
"not the state"; the remedy would be reusing buffers, which is a drawing change.

## 8. What I noticed and did not change

The brief's four known-imperfect items are hers and are untouched: the hero wave
still reads band-like across the frame, the small artifact at the left edge early
in the peel, the hard parallel edges on the grey sea bands, the brush width
variation. Five more, all reported rather than acted on:

1. **The composition assumes a hero wave near the shore and the simulation breaks
   far out.** `BREAK_S` is `[0.115, 0.020]` — at rest a wave breaks at 11.5% of
   frame height and then travels to 0.40. The module's hero sits at 0.375. So the
   drama sits higher in the frame than the module's default and the middle of the
   frame carries spent bands. One constant, and it is the settled stage model's.
2. **A wave arriving at the shore is progressively covered by the swash sheet**,
   which is drawn after the waves. Its face survives as small black teeth above
   the sheet's top edge for a second or two. Physically right, visually odd; it is
   the hand-over region.
3. **Nothing draws the streak records any more.** `beach-water.js` publishes
   `drift` (consumed, as the drawing's `phase`) and `streaks` (consumed by
   nothing — the new drawing marks the open water with two paper brush lines of
   its own). The law is still tested and the check still tests it. Whether the
   records should be drawn in the new idiom or the module should lose its streak
   half is a ruling.
4. **The drawing's scallop depth was aspect-dependent** and could not stay so once
   it lived in the simulation, which has no canvas. Fixed at 16:9 — two of the
   three frames it was verified at — so the scallops are a third deeper on a 4:3
   frame than the module drew them there, and identical on 16:9.
5. **`waveStage` can never report STEEPEN on a peeling wave**, and that is not a
   defect: it returns PEEL the moment its columns disagree across the break, and
   the steepening window is 0.35 s against a peel of 0.8–1.9 s. The stage lives in
   the per-column report, which is where the six-stages check already reads it.

## 9. Gate

`node tools/verify-scene.mjs` — **141/141**, 66 mutants declared.
`node tools/shot-beach-brush.mjs <dir>` is the sheet: the module standalone at
five frozen states as the control, then the live scene at each of the six stages.

![the module standalone, mid-peel — the control](img/beach-drawing-standalone.png)
*`beach-brush.js` drawn on its own at `peel` 0.35: two waves, one of them mid-peel.
This is the picture the drawing layer arrived with, and it is unchanged to the pixel.*

![the live scene](img/beach-drawing-wired.png)
*The same module drawing the simulation's own records: five waves alive at four
different stages, the swash front drawn from the published edge, the strand line
drawn from the high-water mark.*
