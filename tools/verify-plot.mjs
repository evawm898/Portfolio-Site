// Gate for /plot — the curve viewer for the bloom generator's grid export.
//
//   node tools/verify-plot.mjs [--negative-control] [--mutant=<id>]
//
// TWO HALVES, the same division the /print gates use and for the same reason.
//
// PART ONE drives the SHIPPED functions in plot-grid.js — densityToEvery(),
// keepsIndex(), readGridScene(), selectStrips(), stripsToSegments(),
// dimToFog() — over fixtures whose right answer can be written down. On the
// real 15,148-segment grid a wrong stride, a wrong family split or a fog range
// that is merely plausible all still draw a plausible picture, and there is
// nothing on screen to compare them against.
//
// PART TWO drives the page in a real browser and measures every pixel claim
// against the ACTUAL RENDERED FRAMEBUFFER — `__plot.readPixels()` reads it back
// through gl.readPixels straight after a render, so the numbers are the
// renderer's own and no DOM panel is ever counted as ink.
//
// THE ADDITIVE CHECK RESTS ON A CALIBRATION, NOT A THRESHOLD PULLED FROM THE
// AIR. Tone mapping is off and the material colour is set in linear space, so
// the brightest pixel a SINGLE fully-covered line can produce is exactly
// sRGB(brightness) — antialiasing and the depth dim can only lower it. Any
// pixel above that is accumulation, and there is no other way to get one.
//
// THE CENSUS IS RECOUNTED INDEPENDENTLY. `extras.kind actually separates the
// families` is not checked by asking the page whether it thinks it did: this
// file parses the .glb's own JSON chunk and counts the strips itself, then
// requires the page to agree strip for strip and segment for segment.
//
// --negative-control re-serves deliberately broken copies of plot.js and
// plot-grid.js through this gate's own HTTP server (and imports the broken
// module for part one), and fails if a mutation does not apply, if a check the
// mutant NAMES stays green, or if a check it did not name goes red.
//
// FIVE CHECKS IN THIS FILE EXIST IN THEIR CURRENT FORM BECAUSE THE FIRST SWEEP
// FOUND THEM WEAK OR ENTANGLED, and each is worth not re-learning:
//   * `kind/the-two-families-partition-the-grid` was `u + v = both`, which is
//     satisfied by collapsing every strip into one family — the reader mutation
//     left it green at 15148 + 0 = 15148. It is anchored to the file's own
//     per-family counts now.
//   * `readout/the-draw-panel-names-the-stride` only looked for the words
//     "every 10th", which the panel still printed beside "280 of 280 lines"
//     with the stride switched off. It has to agree with the drawn state.
//   * `dim/zero-is-off-and-the-read-out-says-so` was one-sided, and "0 is off"
//     is satisfied by a dim that is never applied at any setting.
//   * `select/*` were driven from readGridScene()'s output, so a broken READER
//     reported as a broken SELECTOR and hid behind it. They run on records
//     written down here instead.
//   * `panels/a-collapsed-panel-still-drives-the-draw` and
//     `bytes/garbage-is-reported-and-not-thrown` were driven through, and
//     chained off, machinery other mutations break — so they reported on
//     whatever else was wrong rather than on themselves.
//
// THE STEM IS INFERRED, SO ITS FAILURES ARE SILENT. A stem that tears at the
// ring, a droop applied as a rigid rotation, a bend that drags the bloom head
// with it and a funnel that steps instead of tapering ALL still draw a
// plausible flower on a black field — which is why the stem's own laws are
// driven here as pure functions over stems whose answer is written down, and
// why the seam is asserted BIT FOR BIT rather than to a tolerance. Every draw
// check above it runs with the stem OFF, so those numbers are the ones /plot
// shipped and the stem cannot hide inside them; two later checks turn it on
// and require the draw controls to still work.
//
// Dev-only deps, not in package.json (same convention as the other gates):
//   npm i --no-save playwright-core three@0.161.0

import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const NEG = args.includes('--negative-control') || args.some(a => a.startsWith('--mutant='));
const ONLY = (() => { const a = args.find(x => x.startsWith('--mutant=')); return a ? a.slice(9) : null; })();

const GRID = 'assets/plot-test/bloom-grid-live.glb';
const VIEW = [0.62, 0.46, 1];          // the page's own home direction
const LOW_VIEW = [0.92, 0.14, 1];      // a low angle, where the whorls overlap most

// ===========================================================================
// MUTANTS. `file` is the module the edit lands in; part one imports the broken
// copy and part two is served it.
const MUTANTS = [
  {
    /* RE-ANCHORED, DELIBERATELY. The blend used to be a literal in the material's
       own constructor; it is now the SCREEN polarity's entry in the one map from
       a polarity's blend name to three's constant, and both the constructor and
       `applyStyle` read that map — so this is still exactly "the drawing does not
       blend additively at the polarity /plot ships", edited where the decision
       now lives. Leaving the old anchor would have reported `mutation did not
       apply`, which is survivable; leaving the constructor's literal in place
       while `applyStyle` overwrote it would NOT have been, because the mutation
       would have been silently undone and the mutant would have passed. */
    id: 'blending-is-not-additive', file: 'plot.js',
    from: '  additive: THREE.AdditiveBlending,', to: '  additive: THREE.NormalBlending,',
    /* AND THE FRAME'S OWN CHECK, because that check's claim is a CONTRAST — the
       boundary composites NORMAL where the DRAWING is additive — and this
       mutation removes the second half of it. True, and the claim is worth
       keeping whole: "the boundary is chrome and not ink" is a statement about
       the two blend modes together, not about the frame's alone. */
    /* AND THE THREE POLARITY CHECKS IT ALSO REDDENS ARE NAMED HERE RATHER THAN
       TUNED OUT OF, which is what the control is for. All three are TRUE
       statements about a screen polarity that does not blend additively:
         * `print-changes-the-blend-mode-…` asserts the screen arm IS additive,
           and under this mutation it reads `other` (blending 1, not 2);
         * `additive-clips-where-multiply-does-not` measures the clipping that
           only accumulation produces — with NORMAL blending nothing
           accumulates, so 0 pixels clip flat white against print's 469;
         * `the-polarity-comes-back-as-a-blend-mode-…` reads the blend constant
           back off the renderer after a restore, and gets `other` too.
       The mutation breaks the screen polarity wholesale, so everything that
       asks the screen polarity a question legitimately goes red. */
    breaks: ['blend/the-material-is-additive', 'blend/crossings-exceed-a-single-line',
             'frame/the-boundary-is-chrome-and-not-ink',
             'polarity/print-changes-the-blend-mode-and-not-only-the-colours',
             'polarity/additive-clips-where-multiply-does-not',
             'restore/the-polarity-comes-back-as-a-blend-mode-and-not-only-as-a-value'],
  },
  {
    id: 'every-strip-reads-as-a-u-line', file: 'plot-grid.js',
    from: "  return k === 'u' || k === 'v' ? k : 'other';", to: "  return 'u';",
    breaks: ['read/kind-comes-from-the-extras-not-the-geometry',
             'read/an-untagged-strip-is-not-guessed-at',
             'census/the-page-agrees-with-the-file',
             'kind/u-only-and-v-only-are-different-line-sets',
             'kind/the-two-families-partition-the-grid',
             'kind/u-only-and-v-only-are-different-pictures',
             'density/the-v-slider-thins-v-and-leaves-u-alone',
             // The stem is the u-lines continued, so a reader that calls every
             // strip a u-line continues 1092 of them where the file has 280.
             'stem/every-drawn-u-line-is-continued-and-no-other',
             // And this mutation EMPTIES the v family, so a check measured on
             // the v family has nothing left to measure — the same reason the
             // two v-family checks above are on this list.
             'stem/the-droop-reaches-every-family',
             /* AND IT TAKES THE WHOLE PETAL FEATURE WITH IT, which is a true and
                useful thing to say about a reader that guesses the family: with
                every strip read as a u-line, two thirds of each petal's strips
                have the wrong point count for their panel's declared ladder, so
                nothing is placeable, no petal is warpable, there is no axis to
                measure, and there are no handles to drag. Eleven checks, named
                rather than tuned around. The ones that stay GREEN are worth
                noting too — the base row still holds and the stem is still
                untouched, because with no warpable petal nothing moves at all. */
             'select/the-picker-lists-the-file-own-petals',
             'warp/editing-moves-only-the-selected-petal',
             'warp/both-line-families-move-together',
             'stretch/along-changes-the-length-and-not-the-width',
             'stretch/across-changes-the-width-past-the-hold-and-holds-the-foot',
             'bend/dragging-a-handle-bends-the-selected-petal-and-not-its-neighbours',
             'bend/the-petal-handle-lands-under-the-pointer',
             'bend/a-petal-handle-drag-does-not-orbit-the-camera',
             'bend/add-and-remove-change-the-set-and-reset-rests-it',
             'warp/a-bend-and-its-scales-stay-on-the-petal-across-a-switch',
             /* AND THE PETAL CHECKS, ALL TRUE OF THIS MUTATION rather than
                tuned out of the checks: with every strip called a u-line, a
                v-line's ten points are matched against a 29-row panel ladder,
                get no stations, and the petal holding them is refused WHOLE —
                so there is no warp for the ownership checks to observe and no
                axis for the read-out to report. */
             'select/picking-a-petal-deforms-nothing',
             'warp/a-warp-survives-deselection',
             'warp/two-petals-hold-different-warps-at-once',
             'readout/the-petal-panel-reports-the-axis-the-seam-and-the-warped-count',
             /* AND THE COMPOSITION FILE'S TWO PETAL CHECKS, for the same reason
                as the eleven above: with no warpable petal there is no handle
                to drag for a bend offset, and no per-petal warp to save or
                restore. */
             'save/a-real-drag-put-an-offset-on-both-bend-sets',
             'restore/two-petals-come-back-with-their-own-warps'],
    // The partition check is on this list only because it was ANCHORED to the
    // file's own counts. In its first form — u + v = both — this mutation left
    // it green at 15148 + 0 = 15148.
  },
  {
    id: 'the-stride-is-ignored', file: 'plot-grid.js',
    from: '  if (every <= 1) return true;', to: '  if (every >= 1) return true;',
    // `readout/...` is on this list only because it was strengthened to agree
    // with the drawn state: naming the stride, which the panel still did, is
    // satisfied by a stride that does nothing.
    breaks: ['density/a-stride-thins-the-middle',
             'density/the-u-slider-thins-u-and-leaves-v-alone',
             'density/the-v-slider-thins-v-and-leaves-u-alone',
             'density/the-dead-travel-at-the-sparse-end-is-told',
             'density/thinning-the-grid-thins-the-picture',
             'readout/the-draw-panel-names-the-stride',
             // And the stem thins with the family it is made of, so a stride
             // that does nothing shows up there too.
             'stem/every-drawn-u-line-is-continued-and-no-other',
             'draw/the-existing-controls-still-work-with-the-stem-on'],
    // The HATCH check is deliberately NOT on this list. With the stride ignored
    // every position of both sliders really does draw the same lines, and the
    // page hatches both tracks end to end — a true report of a broken state.
    // The mark is a biconditional against the range the page derived, so it
    // stays green here; what catches the mutation is that the read-out then
    // says "you are in it" at every position, including density 12.
  },
  {
    id: 'the-source-is-read-as-y-up', file: 'plot.js',
    from: 'container.rotation.x = -Math.PI / 2;', to: 'container.rotation.x = 0;',
    // The stem descends in the grid's −Z, which the correction sends to world
    // −Y. Without it the stem runs INTO the screen, the camera fit follows it
    // there, and the root handle projects off the canvas — so a drag aimed at
    // it reaches nothing and the root moves 0.00 mm. A true report that the
    // page's orientation is broken, from a check about something else.
    // And it changes the VIEWING GEOMETRY, so how much of the picture a droop
    // moves changes with it: the v family's ink shifts by 798 px instead of
    // 14,482 and falls under that check's bar. A third true report, from a
    // third check about something else.
    /* AND `select/a-click-picks-and-a-click-on-the-black-clears` HAS COME OFF
       THIS LIST — the one correction this session made in that direction, and
       it is worth reading. It used to red here for a reason that was never
       about picking: the check aimed at `petalScreenPoint(7, 0.5)`, ONE
       hardcoded pixel, and a Z-up misread happened to put that pixel somewhere
       unusable. The aim is SEARCHED for in the clear now (a panel grew and ate
       it), so the check tests what it claims — a click on a petal's own ink
       picks that petal — and under this mutation that claim is TRUE: the
       picking machinery is fine, the ORIENTATION is wrong, and seeing that is
       `zup/the-attachment-ring-is-flat`'s job and no other check's. Losing an
       incidental red is the correct consequence of an aim that stopped being
       brittle, and the dedicated witness is untouched. */
    breaks: ['zup/the-attachment-ring-is-flat',
             'stem/the-droop-reaches-every-family',
             'bend/the-root-is-a-point-like-any-other'],
  },
  {
    id: 'a-mesh-gltf-is-accepted-silently', file: 'plot.js',
    from: '  if (!info.strips.length) {', to: '  if (info.strips.length < 0) {',
    breaks: ['mesh/a-mesh-gltf-fails-visibly', 'mesh/the-message-names-what-it-found',
             'mesh/the-grid-on-screen-survives'],
  },
  {
    id: 'the-depth-dim-is-never-applied', file: 'plot.js',
    from: '  if (sph && s.depthDim > 0) {', to: '  if (sph && s.depthDim > 1e9) {',
    // The last of these is on the list only because it became a biconditional:
    // "0 is off" is satisfied by a dim that is never applied at any setting.
    breaks: ['dim/the-far-side-fades', 'dim/the-fog-is-solved-on-the-live-camera',
             'dim/zero-is-off-and-the-read-out-says-so'],
  },
  {
    id: 'the-weight-slider-does-nothing', file: 'plot.js',
    from: '  material.linewidth = s.weight;', to: '  material.linewidth = 1.1;',
    breaks: ['weight/changes-the-ink-and-not-the-lines',
             'draw/the-existing-controls-still-work-with-the-stem-on'],
  },
  {
    id: 'the-far-plane-is-guessed-rather-than-solved', file: 'plot-grid.js',
    from: '  const t = 0.5 - Math.sin(Math.asin(1 - 2 * y) / 3);', to: '  const t = y;',
    breaks: ['dim/the-slider-inverts-smoothstep-exactly',
             'dim/the-fog-is-solved-on-the-live-camera'],
  },

  // ---- the stem ---------------------------------------------------------
  {
    // The wheel fix. Without it the camera still moves on every wheel event and
    // the framebuffer never changes — measured on the shipped page before the
    // fix: five wheel events, 95.68 -> 70.33 units, ONE distinct frame.
    id: 'a-wheel-event-does-not-repaint', file: 'plot.js',
    from: "controls.addEventListener('change', () => { dirty = true; });",
    to: "controls.addEventListener('change', () => {});",
    breaks: ['zoom/a-wheel-event-repaints'],
  },
  {
    // Its counterpart, so the pair is a biconditional: painting every tick also
    // makes the wheel repaint, and gives up the skip the page is built on.
    id: 'the-idle-frame-is-never-skipped', file: 'plot.js',
    from: '  if (moved || dirty) render();', to: '  if (moved || dirty || true) render();',
    breaks: ['zoom/an-idle-frame-is-still-skipped'],
  },
  {
    // Droop as a rigid rotation — the trap /print's pivot made easy to fall
    // into. The whole stem turns with the head instead of the tilt washing out.
    id: 'the-droop-is-a-rigid-rotation', file: 'plot-stem.js',
    from: '  if (t >= 1) return 0;\n  return 1 - t * t * (3 - 2 * t);',
    to: '  if (t >= 1) return 1;\n  return 1;',
    breaks: ['stem/the-decay-washes-the-droop-out-over-the-neck',
             'stem/the-droop-decays-along-the-neck',
             'stem/the-neck-is-not-derivable-from-the-droop',
             'stem/the-droop-bends-the-stem-rather-than-turning-it'],
  },
  {
    // The tear. The stem's top takes 0.999 of the head's rotation, which is
    // invisible on screen and is exactly what the seam is for.
    id: 'the-stem-does-not-take-the-full-turn-at-the-ring', file: 'plot-stem.js',
    from: '  if (t <= 0) return 1;\n  if (t >= 1) return 0;',
    to: '  if (t <= 0) return 0.999;\n  if (t >= 1) return 0;',
    breaks: ['stem/the-boundary-values-are-exact-not-approached',
             // 0.999 at the ring is BELOW the smoothstep's own first step
             // (0.9997), so the decay rises before it falls and stops being
             // monotone — a second, true thing wrong with it.
             'stem/the-decay-washes-the-droop-out-over-the-neck',
             'stem/the-head-and-the-stem-agree-at-the-ring',
             'stem/the-seam-is-zero-on-every-drawn-line'],
  },
  {
    // The bend reaches the head: drag a control point and the bloom comes too.
    // The gate lives in the STATION PLAN, which is where the bend's
    // displacement is multiplied by the funnel's progress once per station
    // rather than once per point.
    id: 'the-bend-is-not-gated-by-the-funnel', file: 'plot-stem.js',
    from: '           bx: g * d[0], by: g * d[1], bz: g * d[2] };',
    to: '           bx: d[0], by: d[1], bz: d[2] };',
    breaks: ['stem/a-bend-cannot-reach-the-head',
             'stem/the-head-and-the-stem-agree-at-the-ring',
             'bend/dragging-a-handle-leaves-the-head-alone'],
  },
  {
    // The funnel as a step rather than a taper. The gather still happens and
    // the stem still reads as a stem; what goes is the head-to-stem taper.
    id: 'the-funnel-steps-instead-of-tapering', file: 'plot-stem.js',
    from: '  if (t >= 1) return 1;\n  return t * t * (3 - 2 * t);',
    to: '  if (t >= 1) return 1;\n  return 0;',
    // A step is not flat where it lands either: the last sample before the
    // join is 0 and the one at it is 1, so the endpoint-slope clause goes with
    // the smoothness one.
    breaks: ['stem/the-funnel-opens-and-closes-flat',
             'stem/the-funnel-closes-smoothly-over-the-join'],
  },
  {
    // A stem for lines that are not drawn. Plausible everywhere except in the
    // count and under "v only".
    id: 'the-stem-is-drawn-for-lines-that-are-not', file: 'plot.js',
    from: "    if (t.kind !== 'u') continue;\n    // The UNTRANSFORMED foot",
    to: "    if (t.kind === 'zzz') continue;\n    // The UNTRANSFORMED foot",
    breaks: ['stem/every-drawn-u-line-is-continued-and-no-other',
             'stem/no-u-lines-means-no-stem',
             'stem/the-seam-is-zero-on-every-drawn-line',
             /* AND THE PETAL WARP STOPS BEING INVISIBLE TO THE STEM, which is a
                true and useful thing to say about it: that property holds
                because the stem hangs off the u-lines' feet and the petal law
                is exactly the identity at u = 0. Continue a V-line instead and
                its first point is not on the base row at all — so a warp moves
                the foot the stem was built from, and the check that says the
                stem does not notice one correctly stops holding. */
             'warp/a-deformed-petal-leaves-the-stem-alone'],
    // The seam is on this list because the seam check asserts the PAIRING as
    // well as the distance: a stem strip whose head strip does not exist is
    // not a seam that measures zero, it is a seam with nothing on one side.
  },
  {
    // The droop reaches only the u family. The v-lines' row 0 sits on the SAME
    // ring as the u-lines' feet, so the grid tears at the junction — and every
    // instrument that looks at a foot is looking at a u one.
    id: 'the-droop-reaches-only-the-u-lines', file: 'plot.js',
    from: '    const p = headTransform(t.points, t.count, centre, angle);',
    to: "    const p = headTransform(t.points, t.count, centre, t.kind === 'u' ? angle : 0);",
    breaks: ['stem/the-droop-reaches-every-family'],
  },
  {
    // A locked root. Every other handle still works, so nothing but a drag on
    // the last one can see it.
    id: 'the-root-is-anchored', file: 'plot.js',
    from: '  if (!stemRing || !bends[k]) return;',
    to: '  if (!stemRing || !bends[k] || k === bends.length - 1) return;',
    breaks: ['bend/the-root-is-a-point-like-any-other'],
  },
  {
    // A drag that also orbits. The bend still lands; the camera goes with it.
    id: 'a-handle-drag-also-orbits', file: 'plot.js',
    from: '  controls.enabled = false;\n  canvas.setPointerCapture(ev.pointerId);',
    to: '  canvas.setPointerCapture(ev.pointerId);',
    // AND IT LEAVES THE CAMERA EASING, which is a true thing to say about a
    // drag that orbits: `settle()` stops the moment `update()` reports the
    // movement is below EPS, and the residue an orbit leaves then accumulates
    // back over EPS a few times — 7 of 60 driven frames. The shipped code
    // paints 0 because the drag never orbits at all. Named rather than tuned
    // around: loosening the idle bar to swallow this would blunt it against
    // the always-render mutant, which is the check's whole reason to exist.
    // AND THE PETAL'S TWO, because the pointerdown handler is SHARED: one
    // raycast over both handle sets, one drag plane, one place the orbit is
    // switched off. A mutation there reaches whichever handle is grabbed.
    /* AND SIX MORE, which say the most useful thing this mutation has to say:
       A PAGE WHERE EVERY DRAG ALSO ORBITS NEVER SETTLES, so nothing that reads
       the camera twice can agree with itself. The composition section performs
       two REAL handle drags to put an offset on the two bend sets, and the
       camera is still easing when the snapshot and the serialisation are taken
       a moment apart — so the document does not describe the page, the round
       trip does not come back, the button's bytes differ from the page's, and
       the "nothing moves" check watches the ink move. The frame's own identity
       check goes with them for the same reason at a finer tolerance: it asks
       two fits to land within 1e-9 of each other. All six named rather than
       tuned around — the same shape as `a-frame-control-moves-the-camera`
       reddening a stem check. */
    breaks: ['bend/a-handle-drag-does-not-orbit-the-camera',
             'bend/the-handle-lands-under-the-pointer',
             'zoom/an-idle-frame-is-still-skipped',
             'bend/the-petal-handle-lands-under-the-pointer',
             'bend/a-petal-handle-drag-does-not-orbit-the-camera',
             'frame/a-boundary-that-is-the-viewport-is-the-fit-the-page-shipped',
             'save/the-document-describes-the-page-as-it-stands',
             'save/the-button-writes-what-the-page-serialises',
             'restore/every-field-comes-back',
             'restore/a-composition-dropped-on-the-page-is-loaded',
             'restore/a-file-that-is-not-a-composition-is-refused-and-nothing-moves'],
  },
  {
    // The gaussian width stops coming from the neighbours, so adding a control
    // point no longer makes it a local adjustment.
    id: 'the-bend-width-is-not-derived-from-the-neighbours', file: 'plot-warp.js',
    from: '    return Math.max(1e-6, SIGMA_SPREAD * mean);',
    to: '    return Math.max(1e-6, LONE_SIGMA_SPREAD * L);',
    // HOW FINE THE LADDER HAS TO BE IS A PROPERTY OF THE WIDTH LAW. Six
    // control points at 0.6 x the axis instead of 0.6 x their neighbour gap
    // overlap into a field the ladder was not sized for: the bend case measures
    // 0.442 mm against the shipped law's 0.155.
    breaks: ['warp/the-width-comes-from-the-neighbours',
             'stem/the-station-ladder-is-fine-enough-to-draw-the-curve'],
  },

  // ---- one petal, picked and deformed -----------------------------------
  {
    // The base hold is 0.001 at the ring instead of exactly 0. Invisible on
    // screen and exactly what tears a petal off the attachment the stem is
    // built from — the petal's version of the tear the stem's own decay
    // mutation makes, coming the other way.
    id: 'the-petal-warp-is-not-gated-at-the-base', file: 'plot-petal.js',
    from: '  if (t <= 0) return 0;\n  if (t >= 1) return 1;',
    to: '  if (t <= 0) return 0.001;\n  if (t >= 1) return 1;',
    breaks: ['petal/the-base-hold-is-exactly-zero-and-opens-flat',
             'petal/the-delta-is-exactly-zero-at-the-base',
             'petal/a-bend-cannot-reach-the-base',
             'petal/across-scales-the-width-past-the-hold-and-holds-the-foot',
             'warp/the-base-row-holds-to-the-bit-under-every-warp',
             'warp/a-deformed-petal-leaves-the-stem-alone',
             'stretch/across-changes-the-width-past-the-hold-and-holds-the-foot',
             'bend/dragging-a-handle-bends-the-selected-petal-and-not-its-neighbours',
             /* TRUE OF THIS MUTATION: the two-petal check asserts every warped
                base row is still unmoved, and an ungated base moves it. Named
                rather than dropped from the check — the seam IS the claim. */
             'warp/two-petals-hold-different-warps-at-once'],
  },
  {
    // The across scale stops being gated: the petal's own foot widens, which
    // overruns the arc its neighbours occupy on a ring 28 petals share and
    // moves the feet the stem continues from.
    id: 'the-across-scale-is-not-gated-at-the-foot', file: 'plot-petal.js',
    from: '  const kc = g * (st.across - 1);', to: '  const kc = (st.across - 1);',
    breaks: ['petal/the-delta-is-exactly-zero-at-the-base',
             'petal/across-scales-the-width-past-the-hold-and-holds-the-foot',
             'warp/the-base-row-holds-to-the-bit-under-every-warp',
             'warp/a-deformed-petal-leaves-the-stem-alone',
             'stretch/across-changes-the-width-past-the-hold-and-holds-the-foot',
             /* TRUE OF THIS MUTATION: the two-petal check asserts every warped
                base row is still unmoved, and an ungated base moves it. Named
                rather than dropped from the check — the seam IS the claim. */
             'warp/two-petals-hold-different-warps-at-once'],
  },
  {
    // The station is guessed from the point's index instead of read off the
    // file. Right on a uniform ladder — which the shipped grid is — and wrong
    // about a v-line, whose ten points all sit at ONE u and would be spread
    // from 0 to 1 across the petal's width.
    id: 'the-station-is-guessed-from-the-shape', file: 'plot-grid.js',
    from: '    return new Float64Array(count).fill(ud.u);',
    to: '    return Float64Array.from({ length: count }, (_, i) => i / (count - 1));',
    // NOT `station/what-the-file-did-not-place-gets-no-station`: that check
    // stayed green under this mutation and was right to — the edit lands AFTER
    // the guard that refuses a v-line with no `u`, so a strip the file did not
    // place still gets nothing. Named here rather than loosened, and the guard
    // gets a mutant of its own below.
    breaks: ['station/a-u-line-takes-its-own-panel-ladder-and-a-v-line-its-own-u',
             'warp/both-line-families-move-together'],
  },
  {
    // The guard the mutation above leaves alone: a v-line with no declared `u`
    // gets an array of NaN instead of nothing, so a petal the file did not
    // place is deformed against a station that is not a number. Nothing on the
    // shipped grid is missing a `u`, so the page is unmoved and only the
    // written-down case can see it.
    id: 'a-strip-the-file-did-not-place-gets-a-station-anyway', file: 'plot-grid.js',
    from: '    if (!ud || !Number.isFinite(ud.u)) return null;',
    to: '    if (!ud) return null;',
    breaks: ['station/what-the-file-did-not-place-gets-no-station'],
  },
  {
    // The warp reaches every petal, not the one that is picked.
    id: 'the-warp-reaches-every-petal', file: 'plot.js',
    from: '  for (const a of active) for (const t of a.strips) owner.set(t, a);',
    to: '  for (const a of active) for (const t of strips) owner.set(t, a);',
    breaks: ['warp/editing-moves-only-the-selected-petal',
             'warp/two-petals-hold-different-warps-at-once',
             'bend/dragging-a-handle-bends-the-selected-petal-and-not-its-neighbours'],
  },
  {
    // The warp reaches only the family the axis was measured from. The v-lines
    // stay where the file put them and the petal tears along its own lattice —
    // and every other instrument here is looking at a u-line.
    id: 'the-warp-reaches-only-the-u-lines', file: 'plot.js',
    from: "    if (!a || !t.stations) return t;\n    const pts = petalPoints(",
    to: "    if (!a || !t.stations || t.kind !== 'u') return t;\n    const pts = petalPoints(",
    /* THE THREE EXTRAS ARE TRUE STATEMENTS ABOUT THIS MUTATION, NAMED RATHER
       THAN TUNED AROUND — the discipline the stem's own control settled on.
       The bend check asserts that ALL of the petal's strips moved and only ten
       of thirty-nine do; and both stretch checks measure the half-width of
       every strip against a centre line the u-lines moved and the v-lines did
       not, so the width they read is neither the old one nor the new one. */
    breaks: ['warp/both-line-families-move-together',
             'warp/editing-moves-only-the-selected-petal',
             'stretch/along-changes-the-length-and-not-the-width',
             'stretch/across-changes-the-width-past-the-hold-and-holds-the-foot',
             'bend/dragging-a-handle-bends-the-selected-petal-and-not-its-neighbours'],
  },

  // ---- the warp belongs to the petal ------------------------------------
  {
    /* THE WARP GOES BACK TO BEING PAGE-WIDE: selection STAMPS whatever the
       sliders currently read onto the petal just picked, instead of loading
       that petal's own values. This is the defect the page shipped with, and
       every check in this file was green under it — which is why the four
       ownership checks exist. Picking a petal deforms it. */
    id: 'selection-stamps-the-panel-onto-the-petal', file: 'plot.js',
    from: '  frame = frameFor(index);\n  loadPetalControls();',
    to: '  frame = frameFor(index);\n  commitPetalScales();',
    breaks: ['select/picking-a-petal-deforms-nothing',
             'select/selecting-a-warped-petal-loads-its-own-values',
             'warp/two-petals-hold-different-warps-at-once',
             /* TWO MORE THE MUTATION REALLY DOES BREAK. Stamping on pick makes
                a SECOND warped petal, so the deselection check counts two where
                it expects one; and stepping onto the next petal writes the
                previous one's 1.6x / 0.7x into it, so it does not show its own
                1.00x / 1.00x with its bends at rest. */
             'warp/a-warp-survives-deselection',
             'warp/a-bend-and-its-scales-stay-on-the-petal-across-a-switch',
             /* AND THE ROUND TRIP, because the gate builds its saved state by
                PICKING a petal and then writing its scales: under the stamping
                model the pick itself deforms, so the state that was saved is
                not the state that comes back. */
             'restore/every-field-comes-back',
             'restore/two-petals-come-back-with-their-own-warps',
             'restore/a-composition-dropped-on-the-page-is-loaded'],
  },
  {
    /* THE OTHER HALF OF THE SAME DEFECT: deselecting throws the warp away, so
       an adjustment lives only as long as the selection that made it. */
    id: 'deselecting-drops-the-warp', file: 'plot.js',
    from: '  if (index >= 0) petalStateOf(index, true);',
    to: '  if (index >= 0) petalStateOf(index, true); else petalWarps = new Map();',
    breaks: ['warp/a-warp-survives-deselection',
             /* THE CHECKS DOWNSTREAM OF THE DESELECT IN THE SAME SEQUENCE. The
                first petal is warped, then deselected, then the second is
                warped — so under this mutation the first petal's entry is gone
                by the time either of these reads it, and both report it at no
                values rather than at its own. */
             'warp/two-petals-hold-different-warps-at-once',
             'select/selecting-a-warped-petal-loads-its-own-values'],
  },
  {
    /* THE STATE IS PER PETAL BUT THE DRAWING IS NOT: only the selected petal is
       drawn warped, so warping a second petal makes the first spring back while
       its entry quietly survives. */
    id: 'only-the-selected-petal-is-drawn-warped', file: 'plot.js',
    from: '    if (!f || !mine) continue;',
    to: '    if (!f || !mine || index !== selected) continue;',
    breaks: ['warp/two-petals-hold-different-warps-at-once',
             'warp/a-warp-survives-deselection',
             /* AND EVERY CHECK THAT READS A PETAL ACROSS A SELECTION CHANGE,
                all true of this mutation: if only the selected petal is DRAWN
                warped, then picking another makes the first spring back to the
                file's own points while its entry quietly survives — so "every
                petal identical to the bit across a pick" is false, and picking
                the first one back moves two petals rather than none. */
             'select/picking-a-petal-deforms-nothing',
             'select/selecting-a-warped-petal-loads-its-own-values',
             'warp/a-bend-and-its-scales-stay-on-the-petal-across-a-switch'],
  },
  {
    /* THE SEAM AND ITS COUNT STOP NAMING THE SAME POPULATION: the seam still
       ranges over every warped petal and the count beside it drops back to the
       SELECTED petal's share. This is what shipped, and the read-out's own
       sentence is the only place it shows — a petal picked beside a warped one
       reads "unmoved to 0.0e+0 mm over 0 points". Nothing about the drawing
       moves, so only a check that warps two petals can see it. */
    id: 'the-seam-counts-only-the-selected-petal-base-points', file: 'plot.js',
    from: '    seamMm: pw.seam, basePoints: pw.basePoints,',
    to: '    seamMm: pw.seam, basePoints: pw.mine.basePoints,',
    breaks: ['warp/two-petals-hold-different-warps-at-once'],
  },
  {
    /* A CONTROL THAT APPLIES TO NOTHING STAYS LIVE — the panel state that
       advertised the page-wide model in the first place. */
    id: 'the-scales-stay-live-with-nothing-picked', file: 'plot.js',
    from: '  pui.petalAlong.disabled = !st;\n  pui.petalAcross.disabled = !st;',
    to: '  pui.petalAlong.disabled = false;\n  pui.petalAcross.disabled = false;',
    breaks: ['warp/a-warp-survives-deselection'],
  },
  {
    // The two stretches stop being independent: `along` widens the petal too,
    // so there is no setting that makes it longer without making it fatter.
    id: 'the-along-scale-also-widens-the-petal', file: 'plot-petal.js',
    from: '  const kc = g * (st.across - 1);',
    to: '  const kc = g * (st.across * st.along - 1);',
    breaks: ['petal/along-scales-the-length-and-leaves-the-width',
             'stretch/along-changes-the-length-and-not-the-width'],
  },
  {
    // The highlight's own material never gets the viewport's size, so a fat
    // line's width is computed by dividing by the clone's default resolution
    // and every highlighted segment rasterises as a screen-filling quad. The
    // segment count, the colour and the line set are all still right.
    // THIS IS THE SLOWEST MUTANT IN THE FILE, BY CONSTRUCTION AND NOT BY
    // ACCIDENT: it re-creates the pathological rendering it exists to catch, so
    // every control write in the run pays for a few hundred screen-filling
    // quads under software GL. Measured on the shipped page before the fix, one
    // `set()` went from 0.2 s to 7.9 s. Budget for it rather than tuning it.
    id: 'the-highlight-material-misses-the-resolution', file: 'plot.js',
    from: '  for (const m of materials) m.resolution.copy(size);',
    to: '  material.resolution.copy(size);',
    // AND THE FRAME'S MATERIAL GOES WITH IT — `materials` is the list, and the
    // boundary's own LineMaterial is the third entry in it. Named rather than
    // tuned around, because it is true of the mutation.
    breaks: ['select/the-highlight-material-carries-the-resolution-and-the-fog',
             'frame/the-overlay-material-carries-the-viewport-resolution'],
  },
  {
    // The click takes the nearest line on screen rather than the front-most
    // within tolerance. On this bloom the two disagree on better than a third
    // of the pixels that hit anything at all, and both answers are a petal.
    id: 'the-pick-takes-the-nearest-line-rather-than-the-front', file: 'plot.js',
    from: '    if (d <= tol && z < bestZ) { bestZ = z; best = petal; }',
    to: '    if (d <= tol && d < bestZ) { bestZ = d; best = petal; }',
    breaks: ['select/the-pick-is-the-front-most-line-within-tolerance'],
  },
  {
    // A drag selects as well as orbits, so reading the model from another angle
    // costs you the petal you were working on.
    id: 'a-drag-that-travelled-still-selects', file: 'plot.js',
    from: '    if (moved <= CLICK_SLOP_PX) selectFromClick(ev.clientX, ev.clientY);',
    to: '    if (moved <= 1e9) selectFromClick(ev.clientX, ev.clientY);',
    breaks: ['select/a-drag-orbits-and-leaves-the-selection-alone'],
  },
  {
    // The highlight stops being normalised to its own peak channel, so the
    // selected petal draws a third dimmer than the rest of the drawing — which
    // under a depth dim is the cue for "further away".
    /* RE-ANCHORED. The peak normalisation moved out of `applyStyle` and into
       `hueRGB`'s SCREEN arm when the polarity transfer landed, and the sweep
       reported `mutation did not apply` — which is the one thing that makes a
       refactor disarming a mutant survivable. Same mutation, same meaning, at
       the line that now owns it; and it reddens the polarity check that also
       asserts the normalisation, which is named here rather than tuned out. */
    id: 'the-highlight-is-a-brightness-as-well-as-a-hue', file: 'plot-polarity.js',
    from: '    const peak = Math.max(hue[0], hue[1], hue[2]) || 1;',
    to: '    const peak = 1;',
    breaks: ['select/the-highlight-is-a-hue-and-not-a-brightness',
             'polarity/the-highlight-is-a-hue-and-not-a-level-in-both'],
  },

  /* ---- the frame ---------------------------------------------------------
     A boundary that is merely plausible draws a perfectly convincing rectangle
     on a black field, so each of these leaves a picture nobody would question. */
  {
    // The margin slider stops insetting, so the boundary always touches the
    // viewport edge on its limiting axis and the whole control is inert.
    id: 'the-frame-margin-is-ignored', file: 'plot-frame.js',
    from: '  const inset = pct / 100 * Math.min(W, H);',
    to: '  const inset = 0;',
    /* AND THREE IT DOES NOT, all claimed on the first sweep and all wrong in
       the honest direction. The ellipse and shape-switch checks compare the
       outline against WHATEVER BOX `frameRect` returns, so a margin that never
       insets moves both sides together and neither can see it — they are checks
       about the SHAPE, which `the-ellipse-is-drawn-as-a-rectangle` reddens.
       And the drawing still overruns the boundary, by 149 px rather than 43,
       because the box grew on the axis it was already overrunning. */
    breaks: ['frame/the-box-is-the-largest-ratio-box-inside-the-margin',
             'frame/the-margin-insets-from-the-shorter-side',
             'frame/the-overlay-is-drawn-at-written-down-pixels',
             'frame/the-ratio-and-the-margin-each-move-the-boundary'],
  },
  {
    // The ratio control stops reaching the box: every frame is the viewport's
    // own shape, and both the boundary and the fit it drives are wrong.
    id: 'the-frame-ratio-is-ignored', file: 'plot-frame.js',
    from: '  const A = ratio > 0 ? ratio : W / H;',
    to: '  const A = W / H;',
    /* The two SHAPE checks are not on this list for the reason above. The
       READ-OUT is: a 1:1 box at margin 0 comes back 1100 x 800 rather than
       800 x 800, so the panel no longer prints the square it is asked for. */
    breaks: ['frame/the-box-is-the-largest-ratio-box-inside-the-margin',
             'frame/a-square-is-a-rectangle-at-one-to-one-and-a-circle-an-ellipse',
             'frame/the-overlay-is-drawn-at-written-down-pixels',
             'frame/the-ratio-and-the-margin-each-move-the-boundary',
             'frame/a-frame-control-never-moves-the-camera',
             'frame/reset-fits-the-drawing-inside-the-boundary',
             'frame/the-read-out-names-the-box-and-says-the-ink-is-not-cropped'],
  },
  {
    // The ellipse is drawn as a rectangle. The box, the ratio, the margin, the
    // fit and the read-out are all still right, and the control still switches
    // something — it just switches it to the same shape.
    id: 'the-ellipse-is-drawn-as-a-rectangle', file: 'plot-frame.js',
    from: "  if (shape === 'ellipse') {",
    to: '  if (false) {',
    breaks: ['frame/a-square-is-a-rectangle-at-one-to-one-and-a-circle-an-ellipse',
             'frame/the-ellipse-is-inscribed-in-the-very-same-box',
             'frame/the-outline-is-a-closed-loop-in-both-shapes',
             'frame/the-shape-switch-changes-the-outline-and-not-the-box'],
  },
  {
    // Reset fits the viewport rather than the boundary, so every drawing
    // overflows its frame and there is no way to bring it back inside.
    id: 'the-fit-ignores-the-frame', file: 'plot.js',
    from: '    ? fitTangents(tan0, box, canvasSize().h)',
    to: '    ? { tanY: tan0, tanX: tan0 * Math.max(camera.aspect, 1e-3) }',
    breaks: ['frame/reset-fits-the-drawing-inside-the-boundary'],
  },
  {
    // A frame control re-frames the drawing, which is the rule this page keeps
    // everywhere else: a control never moves the camera.
    id: 'a-frame-control-moves-the-camera', file: 'plot.js',
    from: '    buildFrameOverlay();\n    writeFrameOutputs();',
    to: '    buildFrameOverlay();\n    resetView();\n    writeFrameOutputs();',
    /* AND IT TAKES A STEM CHECK WITH IT, which is the most useful thing this
       mutation says: a control that moves the camera makes every "the same
       camera twice" comparison on this page unreliable, because `set()` writes
       the WHOLE control set on every sweep and the frame's four are in it. The
       droop check captures the v-only framebuffer at droop 0, at 40 and back at
       0, and the return came back at 65,456 ink px against 58,295 — a
       re-framing, not a droop. Named rather than tuned around. */
    breaks: ['frame/a-frame-control-never-moves-the-camera',
             'stem/the-droop-reaches-every-family'],
  },

  /* ---- the composition file ----------------------------------------------
     Every one of these leaves a page that looks entirely restored. */
  {
    // The writer drops a draw field. The reader NAMES it — which is the whole
    // design — so a round trip is no longer clean and the field does not come
    // back.
    id: 'the-saved-document-drops-a-draw-field', file: 'plot-file.js',
    from: '  for (const f of fields) o[f.key] = s[f.key];',
    to: "  for (const f of fields) { if (f.key === 'brightness') continue; o[f.key] = s[f.key]; }",
    /* NOT `file/a-field-the-writer-dropped-is-reported-and-not-filled-in`,
       which was claimed and is wrong: that check builds its OWN holed document
       by deleting two keys, so under this mutation the delete is a no-op and
       the reader still reports both fields missing. It is a check about the
       READER; this mutation is in the WRITER. */
    breaks: ['file/every-field-round-trips-through-the-writer-and-the-reader',
             'save/the-document-describes-the-page-as-it-stands',
             'restore/every-field-comes-back',
             'restore/a-clean-round-trip-reports-nothing-missing',
             'restore/a-field-the-file-does-not-carry-leaves-the-page-alone-and-is-named',
             'restore/a-composition-dropped-on-the-page-is-loaded'],
  },
  {
    // A ROW OF THE TABLE VANISHES, which is the one way a field can be lost
    // with the writer and the reader still agreeing perfectly: neither is
    // looking for it, so nothing is reported and the round trip is clean.
    // The written-down census is the only thing that can see it.
    id: 'the-frame-field-table-loses-a-row', file: 'plot-file.js',
    from: "  { key: 'margin', control: 'frameMargin', kind: 'number' },",
    to: '',
    /* AND THE ROUND-TRIP CHECK MISSES IT, exactly as the design predicted —
       measured, not argued. That check iterates the tables, so a table without
       `margin` never compares `margin`, and the writer and the reader agree
       perfectly about a field that is simply gone. The written-down census is
       the only thing that sees it, which is why it is written down. */
    breaks: ['file/the-document-carries-exactly-these-fields',
             'save/the-document-describes-the-page-as-it-stands',
             'restore/every-field-comes-back',
             'restore/a-composition-dropped-on-the-page-is-loaded',
             'save/every-control-on-the-page-is-a-field-of-the-file-or-a-named-exception'],
  },
  {
    // The reader skips a stem field on the way back in. The file still holds
    // it, so nothing is missing and nothing is reported.
    id: 'the-restore-skips-a-stem-field', file: 'plot.js',
    from: '    if (!Object.prototype.hasOwnProperty.call(vals, f.key)) continue;',
    to: "    if (!Object.prototype.hasOwnProperty.call(vals, f.key) || f.key === 'neck') continue;",
    breaks: ['restore/every-field-comes-back',
             'restore/a-composition-dropped-on-the-page-is-loaded'],
  },
  {
    // A missing field stops being reported. The page then looks restored while
    // one field is whatever it happened to be — the exact failure the notes
    // exist for.
    id: 'a-missing-field-is-not-reported', file: 'plot-file.js',
    from: "      notes.push(note('missing', `${path}.${f.key} is missing — the page keeps the value it has`));\n      continue;",
    to: '      continue;',
    breaks: ['file/a-field-the-writer-dropped-is-reported-and-not-filled-in',
             'restore/a-field-the-file-does-not-carry-leaves-the-page-alone-and-is-named'],
  },
  {
    /* THE GLOBAL MODEL, REINTRODUCED IN THE FILE. Every petal is written with
       the first entry's values, so a composition of several differently shaped
       petals saves as several identically shaped ones. The page is right, the
       drawing at save time is right, and the file is a lie. */
    id: 'the-petal-warps-are-written-globally', file: 'plot.js',
    from: '      petals: [...petalWarps.entries()].map(([index, st]) => ({\n        index, along: st.along, across: st.across, bends: bendsOut(st.bends),\n      })),',
    to: '      petals: (g => [...petalWarps.entries()].map(([index]) => ({\n        index, along: g.along, across: g.across, bends: bendsOut(g.bends),\n      })))([...petalWarps.values()][0] || { along: 1, across: 1, bends: [] }),',
    breaks: ['save/the-document-describes-the-page-as-it-stands',
             'restore/every-field-comes-back',
             'restore/two-petals-come-back-with-their-own-warps',
             'restore/a-composition-dropped-on-the-page-is-loaded',
             // Every entry then carries the first petal's bend offsets, so the
             // one bend the drag put on petal 7 is on every petal in the file.
             'save/a-real-drag-put-an-offset-on-both-bend-sets'],
  },
  {
    /* AND THE SAME FAILURE ON THE WAY BACK IN, which the brief names as the
       worst thing this format could do: the warp lands on the NEXT petal. The
       drawing is deformed, the counts are right, the panel is clean, and it is
       the wrong petal. */
    id: 'a-restored-warp-lands-on-the-next-petal', file: 'plot.js',
    from: '    petalWarps.set(p.index, {',
    to: '    petalWarps.set(p.index + 1, {',
    breaks: ['restore/every-field-comes-back',
             'restore/two-petals-come-back-with-their-own-warps',
             'restore/a-composition-dropped-on-the-page-is-loaded'],
  },
  {
    // A composition restored against a different bundle stops saying so. Warps
    // are applied by petal INDEX, and a silently wrong petal is
    // indistinguishable from a right one in the picture.
    /* RE-POINTED after a refactor moved the line it edits (the null-grid guard).
       The sweep reported "mutation did not apply" rather than a false pass,
       which is the one thing that makes that failure mode survivable. */
    id: 'the-grid-mismatch-is-not-reported', file: 'plot.js',
    from: '  const cmp = inst.grid ? compareIdentity(inst.grid, currentIdentity())',
    to: '  const cmp = false ? compareIdentity(inst.grid, currentIdentity())',
    breaks: ['restore/a-composition-from-a-different-grid-is-named-field-by-field'],
  },
  {
    // A file from a newer version is read anyway, which means quietly ignoring
    // whatever that version added — the silent partial restore in another coat.
    id: 'a-newer-version-is-read-anyway', file: 'plot-file.js',
    from: '  if (v > VERSION)',
    to: '  if (false)',
    breaks: ['file/a-newer-version-is-refused-rather-than-partly-read',
             'restore/a-file-that-is-not-a-composition-is-refused-and-nothing-moves'],
  },
  {
    // The camera's position is not restored — silently, with no note, because
    // the document did carry one.
    id: 'the-camera-is-not-restored', file: 'plot.js',
    from: '  camera.position.set(c.position[0], c.position[1], c.position[2]);',
    to: '  void c.position;',
    breaks: ['restore/every-field-comes-back',
             'restore/the-camera-and-the-selection-come-back',
             'restore/a-composition-dropped-on-the-page-is-loaded'],
  },
  {
    // The selection is not restored: a composition comes back with the right
    // shapes and no petal picked, so the panel's two scales read an em dash
    // over a drawing that is exactly right.
    id: 'the-selection-is-not-restored', file: 'plot.js',
    from: '  pui.petalPick.value = String(canSelect ? want : -1);',
    to: '  pui.petalPick.value = String(-1);',
    breaks: ['restore/every-field-comes-back',
             'restore/the-camera-and-the-selection-come-back',
             'restore/a-composition-dropped-on-the-page-is-loaded'],
  },
  {
    /* A WARP FOR A PETAL THIS GRID DOES NOT HAVE IS FOLDED ONTO PETAL 0 rather
       than dropped. Nothing is lost, nothing is reported, and one petal is
       wearing another's shape. */
    id: 'a-dropped-petal-warp-is-moved-onto-another', file: 'plot-file.js',
    from: '  for (const p of list || []) (hasPetal(p.index) ? applied : dropped).push(p);',
    to: '  for (const p of list || []) applied.push(hasPetal(p.index) ? p : { ...p, index: 0 });',
    breaks: ['file/a-warp-for-a-petal-the-grid-does-not-have-is-dropped-not-moved',
             'restore/a-warp-for-a-petal-this-grid-does-not-have-is-dropped-and-counted'],
  },
  // ---- POLARITY -----------------------------------------------------------
  {
    /* THE ONE MUTATION A COLOUR SWAP WOULD SURVIVE. Print keeps its white ground
       and its transfer and blends ADDITIVELY — which on white paper saturates on
       the first line, i.e. the white rectangle this whole design exists to avoid. */
    id: 'polarity-is-only-a-colour-swap', file: 'plot.js',
    from: '  multiply: THREE.MultiplyBlending,', to: '  multiply: THREE.AdditiveBlending,',
    breaks: ['polarity/print-changes-the-blend-mode-and-not-only-the-colours',
             'polarity/the-two-regimes-agree-exactly-on-where-there-is-ink'],
  },
  {
    /* THE FOG DOES NOT FOLLOW THE GROUND. Under multiply this drives far lines
       toward dst*0 — the depth dim makes the MOST DISTANT lines the heaviest
       thing on the page — and no blend-mode check can see it. */
    id: 'the-fog-does-not-follow-the-ground', file: 'plot.js',
    from: '    scene.fog.color.setHex(ground);', to: '    scene.fog.color.setHex(0x000000);',
    breaks: ['polarity/the-depth-dim-fades-into-the-ground-it-is-on'],
  },
  {
    /* THE TRANSFER IS A PLAIN INVERSION OF THE LEVEL. Still a black-on-white
       flower nobody would question — and a single line lands 112 of 255 away
       from where the screen puts it. */
    id: 'the-print-transfer-is-a-plain-inversion', file: 'plot-polarity.js',
    from: '    const t = srgbDecode(1 - srgbEncode(L));', to: '    const t = 1 - L;',
    /* AND `the-two-regimes-agree-exactly-on-where-there-is-ink` IS NOT ON THIS
       LIST, because the control proved the claim false and the claim was the
       thing that was wrong. That check is named for WHERE the ink is, and a
       plain inversion still puts ink in exactly the same places — see the
       check's own note on what MSAA leaves it blind to. The LEVEL is asserted
       in part one, where this project puts a law, and part one reddens. */
    breaks: ['polarity/one-line-lands-at-the-same-ink-in-both-polarities',
             'polarity/the-transfer-is-not-a-plain-inversion-of-the-level',
             'polarity/the-crossings-are-the-part-that-does-not-carry-across',
             'polarity/the-highlight-is-a-hue-and-not-a-level-in-both'],
  },
  {
    // The highlight's ink is not normalised against the drawing's, so a selected
    // petal reads heavier or lighter than the drawing it sits in.
    id: 'the-print-highlight-is-not-normalised', file: 'plot-polarity.js',
    from: '  return absorb.map(a => srgbDecode(clamp01(1 - a / peak * want)));',
    to: '  return absorb.map(a => srgbDecode(clamp01(1 - a * want)));',
    breaks: ['polarity/the-highlight-is-a-hue-and-not-a-level-in-both'],
  },

  // ---- EXPORT -------------------------------------------------------------
  {
    /* ONE PATH PER SEGMENT. The picture is IDENTICAL and the file is a plotter
       lifting the pen fifty-five thousand times — invisible until someone has
       waited three hours at one. */
    id: 'the-svg-emits-one-path-per-segment', file: 'plot-export.js',
    from: '    (run || (run = [])).push(x, y);',
    to: '    (run || (run = [])).push(x, y); if (run.length >= 4) { out.push(run); run = [x, y]; }',
    breaks: ['export/a-whole-strip-is-exactly-one-path',
             'export/the-svg-emits-one-path-per-strip-and-not-one-per-segment'],
  },
  {
    // The SVG is dimensioned in screen pixels wearing a millimetre label — the
    // numbers are plausible (469 x 704) and the plot comes out three times life
    // size.
    /* ANCHORED ON THE DOCUMENT, NOT ON THE REPORT, and the two lines are nearly
       identical — so the anchor carries the line above it. This is the SILENT
       half deliberately: the panel goes on saying millimetres while the file
       carries pixels, which is why the check parses the emitted text's own
       width/height rather than trusting what the page reports about it. */
    id: 'the-svg-is-dimensioned-in-pixels', file: 'plot.js',
    from: '    paths,\n    widthMm: box.width * mmPerPx, heightMm: box.height * mmPerPx,',
    to: '    paths,\n    widthMm: box.width, heightMm: box.height,',
    breaks: ['export/the-svg-carries-real-millimetres-from-the-grid-own-units'],
  },
  {
    // The ellipse clips to its own bounding box, which keeps the four corners —
    // not the same picture, and exactly what plot-frame.js's header warned the
    // export session not to do.
    id: 'the-ellipse-clip-is-a-rectangle', file: 'plot-export.js',
    from: "  const clip = shape === 'ellipse'", to: "  const clip = shape === 'never'",
    breaks: ['export/the-boundary-is-a-real-clip-of-the-boundary-own-shape',
             'export/the-ellipse-svg-renders-and-actually-clips'],
  },
  {
    /* THE GROUND SITS OUTSIDE THE CLIP — the bug this session actually shipped
       and then found by RENDERING one, not by reading the text. A screen-polarity
       ellipse comes out as a full black rectangle with an ellipse of white lines
       floating in it. */
    id: 'the-svg-ground-is-outside-the-clip', file: 'plot-export.js',
    from: '  <g clip-path="url(#plot-frame)">${groundRect}',
    to: '  ${groundRect}\n  <g clip-path="url(#plot-frame)">',
    breaks: ['export/the-ground-is-inside-the-clip-with-the-ink',
             'export/the-ellipse-svg-renders-and-actually-clips'],
  },
  {
    // The selection's teal survives into the export: a print with one teal petal
    // in it, which is a bug report rather than an artefact.
    id: 'the-export-keeps-the-selection-highlight', file: 'plot.js',
    from: '  if (sel) sel.material = material;', to: '  if (sel) sel.material = selMat;',
    breaks: ['export/the-raster-carries-the-ink-and-none-of-the-chrome'],
  },
  {
    // The raster is not cropped to the boundary at all — it is the whole
    // viewport, at the viewport's own aspect, whatever the FRAME panel says.
    id: 'the-raster-is-not-cropped-to-the-frame', file: 'plot.js',
    from: '    ? frameRect(raw.bw, raw.bh, parseRatio(f.ratio) ?? (raw.bw / raw.bh), f.margin)',
    to: '    ? frameRect(raw.bw, raw.bh, raw.bw / raw.bh, 0)',
    breaks: ['export/the-raster-is-not-empty-and-matches-the-frame-aspect'],
  },
  {
    /* THE STROKES DO NOT SCALE WITH THE IMAGE. The same picture in hairlines —
       right aspect, right crop, non-zero ink, still grey, and every other export
       check green. */
    id: 'the-export-strokes-do-not-scale', file: 'plot.js',
    from: '      m.linewidth *= S / prevRatio;', to: '      m.linewidth *= 1;',
    breaks: ['export/the-strokes-scale-with-the-image'],
  },
  {
    /* THE PROJECTION IS FLIPPED IN Y. Exactly the right number of paths, at
       exactly the right physical size, inside exactly the right clip — and the
       bloom is upside down. */
    id: 'the-svg-projection-is-flipped', file: 'plot.js',
    from: '        xy[i * 2 + 1] = (-v.y * 0.5 + 0.5) * h;',
    to: '        xy[i * 2 + 1] = (v.y * 0.5 + 0.5) * h;',
    breaks: ['export/the-svg-lands-where-the-drawing-lands-on-screen'],
  },
  {
    // Outside the ellipse is filled rather than cleared, which is the way round
    // that cannot be undone downstream.
    id: 'the-ellipse-raster-is-filled-not-cleared', file: 'plot-export.js',
    from: '      rgba[(y * w + x) * 4 + 3] = 0;', to: '      rgba[(y * w + x) * 4 + 3] = 255;',
    breaks: ['export/alpha-is-punched-outside-the-ellipse-and-nowhere-else',
             'export/the-ellipse-raster-is-transparent-outside-the-boundary'],
  },
  {
    // The polarity is not a field of the file, so a composition restores into
    // whatever polarity the page happened to be in.
    id: 'the-polarity-is-not-in-the-file', file: 'plot-file.js',
    from: "  { key: 'polarity',   control: 'polarity',   kind: 'enum', values: POLARITIES },\n",
    to: '',
    /* AND THE ROUND-TRIP CHECK IS NOT ON THIS LIST, because a writer and a
       reader that both walk the same table agree PERFECTLY about a field that
       is gone — `composeDoc` never writes it, `readDoc` never looks for it, the
       comparison never compares it, and both halves report a clean read. That
       is the exact failure the WRITTEN-DOWN census exists for, it is already
       recorded here for `the-frame-field-table-loses-a-row`, and the census
       check is what reddens. Measured: this mutant left the round trip green at
       "0 notes". */
    breaks: ['file/the-document-carries-exactly-these-fields',
             'restore/every-field-comes-back',
             'restore/the-polarity-comes-back-as-a-blend-mode-and-not-only-as-a-value',
             'save/every-control-on-the-page-is-a-field-of-the-file-or-a-named-exception'],
  },

];

// ===========================================================================
// A minimal GLB reader/writer, so the census can be recounted from the file
// itself and the failure fixtures can be built rather than committed.
function readGlb(buf) {
  const total = buf.readUInt32LE(8);
  let off = 12, json = null, bin = null;
  while (off < total) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const body = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(body));
    if (type === 0x004E4942) bin = Buffer.from(body);
    off += 8 + len;
  }
  return { json, bin };
}
function writeGlb(json, bin) {
  const pad = (b, fill) => {
    const r = (4 - (b.length % 4)) % 4;
    return r ? Buffer.concat([b, Buffer.alloc(r, fill)]) : b;
  };
  const j = pad(Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
  const b = pad(bin || Buffer.alloc(0), 0);
  const chunks = [Buffer.alloc(8), j];
  chunks[0].writeUInt32LE(j.length, 0); chunks[0].writeUInt32LE(0x4E4F534A, 4);
  if (b.length) {
    const h = Buffer.alloc(8);
    h.writeUInt32LE(b.length, 0); h.writeUInt32LE(0x004E4942, 4);
    chunks.push(h, b);
  }
  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4);
  head.writeUInt32LE(12 + body.length, 8);
  return Buffer.concat([head, body]);
}

// The file's own census, counted here and not asked of the page.
function censusFromFile(json) {
  const live = new Set();
  const walk = i => { if (live.has(i)) return; live.add(i);
    for (const c of json.nodes[i].children || []) walk(c); };
  for (const n of json.scenes[json.scene ?? 0].nodes) walk(n);
  const c = { u: 0, v: 0, other: 0, strips: 0, uSegments: 0, vSegments: 0, otherSegments: 0, segments: 0 };
  const petals = new Set();
  for (const i of live) {
    const nd = json.nodes[i];
    if (nd.mesh === undefined) continue;
    if (nd.extras && Number.isFinite(nd.extras.petalIndex)) petals.add(nd.extras.petalIndex);
    for (const p of json.meshes[nd.mesh].primitives) {
      if ((p.mode ?? 4) !== 3) continue;                       // LINE_STRIP only
      const n = json.accessors[p.attributes.POSITION].count;
      if (n < 2) continue;
      const k = p.extras && (p.extras.kind === 'u' || p.extras.kind === 'v') ? p.extras.kind : 'other';
      c[k]++; c.strips++; c[`${k}Segments`] += n - 1; c.segments += n - 1;
    }
  }
  return { census: c, petals: petals.size };
}

// A triangles-only glTF: what someone drops when they reach for the STL-shaped
// export by mistake. Two triangles, mode 4, no line strips anywhere.
function meshOnlyGlb() {
  const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0]);
  const bin = Buffer.from(pos.buffer);
  return writeGlb({
    asset: { version: '2.0', generator: 'verify-plot.mjs mesh fixture' },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'a_solid' }],
    meshes: [{ name: 'a_solid', primitives: [{ attributes: { POSITION: 0 }, mode: 4 }] }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 6, type: 'VEC3',
                  min: [0, 0, 0], max: [1, 1, 0] }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: bin.length }],
    buffers: [{ byteLength: bin.length }],
  }, bin);
}

// The same grid with only its first four petals in the scene — a real second
// file for the swap, with a census that cannot be confused for the default's.
function trimmedGridGlb(json, bin, petals = 4) {
  const j = JSON.parse(JSON.stringify(json));
  j.scenes[j.scene ?? 0].nodes = j.scenes[j.scene ?? 0].nodes.slice(0, petals);
  return writeGlb(j, bin);
}

// ===========================================================================
let OVERRIDE = null;   // { file, text }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/plot') p = '/plot.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f)) { r.writeHead(404); return r.end('nf'); }
  const body = (OVERRIDE && p === '/' + OVERRIDE.file)
    ? Buffer.from(OVERRIDE.text, 'utf8') : readFileSync(f);
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  r.end(body);
});
await new Promise(r => server.listen(0, r));
const PORT = server.address().port;
const browser = await chromium.launch({ executablePath: process.env.PLOT_CHROME || '/opt/pw-browsers/chromium' });

/* Import one of the three shipped modules, or a mutated copy of it. The copy is
   written into the REPO ROOT rather than a temp directory on purpose:
   plot-stem.js imports './plot-warp.js', and a mutant sitting anywhere else
   would resolve that to nothing. */
async function loadModule(name, mutantId) {
  if (!mutantId || OVERRIDE.file !== name) return import(`../${name}`);
  const tmp = path.join(ROOT, `.plot-mutant-${mutantId}-${name}`);
  writeFileSync(tmp, OVERRIDE.text);
  try { return await import(`../.plot-mutant-${mutantId}-${name}?v=${Date.now()}`); }
  finally { setTimeout(() => { try { rmSync(tmp); } catch {} }, 0); }
}

// sRGB transfer, matching the shader's own encode — the calibration the
// additive check is measured against.
const srgb = v => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

// ===========================================================================
async function run({ mutant = null } = {}) {
  const G = await loadModule('plot-grid.js', mutant);
  const S = await loadModule('plot-stem.js', mutant);
  const W = await loadModule('plot-warp.js', mutant);
  const PT = await loadModule('plot-petal.js', mutant);
  const FR = await loadModule('plot-frame.js', mutant);
  const FL = await loadModule('plot-file.js', mutant);
  const PL = await loadModule('plot-polarity.js', mutant);
  const EX = await loadModule('plot-export.js', mutant);
  const {
    densityToEvery, everyLabel, keepsIndex, readGridScene, selectStrips,
    stripsToSegments, boundsOf, dimToFog, fogFactor, MIN_DENSITY, MAX_DENSITY,
    stationsForStrip, panelFor,
  } = G;

  const checks = new Map(), details = new Map();
  const check = (name, ok, detail = '') => {
    checks.set(name, !!ok); details.set(name, detail);
    if (!mutant) console.log(`  [${ok ? 'ok  ' : 'FAIL'}] ${name}${detail ? '  ' + detail : ''}`);
    return !!ok;
  };
  const log = (...a) => { if (!mutant) console.log(...a); };

  // =========================================================================
  // PART ONE — the shipped arithmetic, on answers that can be written down.
  log('\n--- part one: plot-grid.js, on fixtures whose answer is written down ---');

  // --- the density slider --------------------------------------------------
  const ladder = [];
  for (let d = MIN_DENSITY; d <= MAX_DENSITY; d++) ladder.push(densityToEvery(d));
  check('density/the-slider-runs-the-other-way-from-its-stride',
    ladder[ladder.length - 1] === 1 && ladder[0] === MAX_DENSITY
    && ladder.every((n, i) => i === 0 || n < ladder[i - 1]),
    `density ${MIN_DENSITY}..${MAX_DENSITY} -> stride ${ladder.join(',')}`);

  // Written down: over columns 0..9 at stride 3, the kept set is {0,3,6,9} —
  // multiples of three, plus both margins (9 is the last, and is also 3*3).
  // At stride 4 it is {0,4,8,9}: 9 survives ONLY because it is the margin.
  const keptAt = (last, every) => {
    const k = [];
    for (let i = 0; i <= last; i++) if (keepsIndex(i, last, every)) k.push(i);
    return k;
  };
  check('density/a-stride-thins-the-middle',
    keptAt(9, 3).join(',') === '0,3,6,9' && keptAt(9, 4).join(',') === '0,4,8,9'
    && keptAt(9, 1).length === 10,
    `stride 3 -> {${keptAt(9, 3)}} · stride 4 -> {${keptAt(9, 4)}}`);
  check('density/both-margins-are-always-kept',
    [1, 2, 3, 4, 7, 12].every(e => keepsIndex(0, 9, e) && keepsIndex(9, 9, e)),
    'the u family’s two margins are the petal’s own outline');

  // --- packing -------------------------------------------------------------
  // Written down: a 4-point strip is 3 segments, and the pairs run (0,1)(1,2)(2,3).
  const strip4 = { kind: 'u', index: 0, last: 0, count: 4, segments: 3,
                   points: Float32Array.from([0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0]) };
  const packed = stripsToSegments([strip4]);
  check('strips/a-strip-of-n-points-is-n-minus-one-segments',
    packed.segments === 3 && packed.positions.length === 18
    && [...packed.positions].filter((_, i) => i % 3 === 0).join(',') === '0,1,1,2,2,3',
    `4 points -> ${packed.segments} segments, ${packed.positions.length} floats`);

  // --- reading a scene -----------------------------------------------------
  const IDENT = { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] };
  const shift = (x, y, z) => ({ elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1] });
  const attr = pts => ({ count: pts.length / 3, getX: i => pts[i * 3],
                         getY: i => pts[i * 3 + 1], getZ: i => pts[i * 3 + 2] });
  const strip = (userData, pts, mw = IDENT, extra = {}) => ({
    isLine: true, children: [], matrixWorld: mw,
    geometry: { userData, getAttribute: () => attr(pts) }, ...extra,
  });
  const petalNode = (i, kids) => ({ userData: { petalIndex: i }, children: kids });

  // A strip tagged `v` whose points run exactly like a u-line. The family must
  // come from the tag, never from the shape.
  const longPts = [0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0, 4, 0, 0];
  const shortPts = [0, 0, 0, 0, 1, 0];
  const sceneA = { children: [petalNode(0, [
    strip({ kind: 'u', column: 0 }, longPts),
    strip({ kind: 'u', column: 1 }, longPts),
    strip({ kind: 'v', row: 0 }, longPts),      // <- u-shaped, tagged v
    strip({ kind: 'v', row: 1 }, shortPts),
  ])] };
  const readA = readGridScene(sceneA);
  check('read/kind-comes-from-the-extras-not-the-geometry',
    readA.census.u === 2 && readA.census.v === 2
    && readA.strips.filter(s => s.kind === 'v').some(s => s.count === 5),
    `u ${readA.census.u} · v ${readA.census.v}; the u-shaped strip tagged v stayed in v`);
  check('read/petals-come-from-the-node-above-the-strip',
    readA.petals === 1 && readA.strips.every(s => s.petal === 0), `${readA.petals} petal`);

  const sceneB = { children: [petalNode(0, [
    strip({ kind: 'u', column: 0 }, longPts, shift(10, 0, 0)),
    strip({ panel: 'full' }, longPts),                       // no kind at all
    { isLineSegments: true, isLine: true, children: [],
      matrixWorld: IDENT, geometry: { userData: { kind: 'u' }, getAttribute: () => attr(longPts) } },
    { isMesh: true, children: [], matrixWorld: IDENT,
      geometry: { userData: {}, getAttribute: () => attr(new Array(27).fill(0)) } },
  ])] };
  const readB = readGridScene(sceneB);
  check('read/the-world-matrix-is-applied',
    Math.abs(readB.strips.find(s => s.kind === 'u').points[0] - 10) < 1e-6,
    'a strip under a translated parent comes back translated');
  check('read/an-untagged-strip-is-not-guessed-at',
    readB.census.other === 1 && readB.census.u === 1,
    `untagged ${readB.census.other} · u ${readB.census.u} — an untagged strip lands in its own bucket`);
  // Kind-independent on purpose: a LINES primitive pairs its vertices
  // differently, so what matters is that it never became a strip at all —
  // asked as a count, not as a claim about which family it did not join.
  check('read/line-segments-are-not-read-as-strips',
    readB.found.lineSegments === 1 && readB.found.meshes === 1 && readB.strips.length === 2,
    `${readB.strips.length} strips read from 4 objects; `
    + `${readB.found.lineSegments} LINES and ${readB.found.meshes} mesh counted, neither paired`);
  check('read/a-mesh-only-scene-yields-no-strips-and-says-what-it-found',
    readGridScene({ children: [sceneB.children[0].children[3]] }).strips.length === 0
    && readGridScene({ children: [sceneB.children[0].children[3]] }).found.triangles === 3,
    '3 triangles, 0 strips');

  // --- selection -----------------------------------------------------------
  // Records written down here rather than taken from readGridScene(), so the
  // selector is tested apart from the reader — a reader that mislabels every
  // strip would otherwise show up as a selector failure and hide behind it.
  const all = { families: 'both', uDensity: MAX_DENSITY, vDensity: MAX_DENSITY };
  const rec = (kind, index, last, n) => ({ kind, index, last, count: n, segments: n - 1,
                                           points: new Float32Array(n * 3) });
  const bag = [rec('u', 0, 1, 5), rec('u', 1, 1, 5), rec('v', 0, 1, 3), rec('v', 1, 1, 3),
               rec('other', -1, -1, 2)];
  const sel = k => selectStrips(bag, { ...all, families: k }).map(t => t.kind);
  check('select/the-family-switch-picks-exactly-one-family',
    sel('both').join(',') === 'u,u,v,v,other'
    && sel('u').join(',') === 'u,u,other' && sel('v').join(',') === 'v,v,other',
    `both {${sel('both')}} · u {${sel('u')}} · v {${sel('v')}}`);
  check('select/an-untagged-strip-is-drawn-under-every-switch',
    ['both', 'u', 'v'].every(f => sel(f).includes('other')),
    'a strip the format did not tag is never made unreachable');

  /* --- WHERE A POINT SITS ALONG ITS PETAL ---------------------------------
     Written down, because a station guessed from the point's index is right on
     a uniform ladder and wrong on any other — and the shipped grid IS uniform,
     so the real file cannot tell the two apart. A v-line takes its own declared
     u for all of its points; a u-line takes its panel's declared ladder, one
     value per point; anything the file did not place gets null rather than a
     number, and the petal holding it is refused whole. */
  const LADDER = [0, 0.1, 0.4, 1];
  const PANELS = [{ label: 'full', u: LADDER, v: [-1, 0, 1] },
                  { label: 'left', u: [0, 0.5, 0.9, 1], v: [-1, 1] }];
  const uSt = stationsForStrip('u', { kind: 'u', column: 0, panel: 'full' }, 4, PANELS);
  const uLeft = stationsForStrip('u', { kind: 'u', column: 0, panel: 'left' }, 4, PANELS);
  const vSt = stationsForStrip('v', { kind: 'v', row: 2, u: 0.4, panel: 'full' }, 3, PANELS);
  check('station/a-u-line-takes-its-own-panel-ladder-and-a-v-line-its-own-u',
    uSt && [...uSt].join(',') === '0,0.1,0.4,1'
    && uLeft && [...uLeft].join(',') === '0,0.5,0.9,1'
    && vSt && [...vSt].join(',') === '0.4,0.4,0.4'
    && panelFor(PANELS, 'left').u[1] === 0.5,
    `u/full {${uSt}} · u/left {${uLeft}} · v at u 0.4 {${vSt}} — a cleft petal's three `
    + 'panels each carry their own ladder, and the strip names which');
  // A station is never derived from the shape or the count: the wrong panel,
  // a ladder of the wrong length, a v-line with no `u`, and a strip the format
  // did not tag all come back with nothing rather than with something.
  check('station/what-the-file-did-not-place-gets-no-station',
    stationsForStrip('u', { panel: 'nope' }, 4, PANELS) === null
    && stationsForStrip('u', { panel: 'full' }, 5, PANELS) === null
    && stationsForStrip('u', { panel: 'full' }, 4, null) === null
    && stationsForStrip('u', {}, 4, PANELS) === null
    && stationsForStrip('v', { kind: 'v', row: 0 }, 3, PANELS) === null
    && stationsForStrip('other', { u: 0.5 }, 3, PANELS) === null
    && panelFor(PANELS, null) === null && panelFor([PANELS[0]], null) === PANELS[0],
    'a missing panel, a ladder of the wrong length, no panels at all, an unnamed '
    + 'panel among two, a v-line with no u, and an untagged strip: six nulls');

  /* AND A PETAL HOLDING ONE UNPLACED STRIP IS REFUSED WHOLE, which is the only
     safe answer: deforming the rest of it and leaving that strip behind would
     tear the grid internally, and a line drawing is the worst possible place to
     notice it. */
  const placed = (kind, ud, n) => ({ kind, index: 0, count: n, segments: n - 1,
    petal: 0, points: new Float32Array(n * 3),
    stations: stationsForStrip(kind, ud, n, PANELS) });
  const okPetal = G.petalList([
    placed('u', { panel: 'full' }, 4), placed('v', { u: 0.4, panel: 'full' }, 3),
  ], new Map([[0, { name: 'petal_0', userData: { petalIndex: 0, azimuthDeg: 12, role: 'OUTER',
                                                panels: PANELS } }]]));
  const badPetal = G.petalList([
    placed('u', { panel: 'full' }, 4), placed('other', {}, 3),
  ], new Map());
  const noAxis = G.petalList([placed('v', { u: 0.4, panel: 'full' }, 3)], new Map());
  check('station/a-petal-with-an-unplaced-strip-is-not-warpable',
    okPetal[0].warpable === true && okPetal[0].name === 'petal_0'
    && okPetal[0].azimuthDeg === 12 && okPetal[0].role === 'OUTER'
    && badPetal[0].warpable === false && /1 of its 2 strips/.test(badPetal[0].why)
    && noAxis[0].warpable === false && /no u-lines/.test(noAxis[0].why),
    `placed: warpable · unplaced: "${badPetal[0].why}" · v-only: "${noAxis[0].why}"`);

  // --- the depth dim -------------------------------------------------------
  let worst = 0;
  for (const y of [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    const f = dimToFog(y, 12, 60);
    worst = Math.max(worst, Math.abs(fogFactor(f.near, f.far, 60) - y));
  }
  check('dim/the-slider-inverts-smoothstep-exactly', worst < 1e-9,
    `worst |asked - delivered| over 7 amounts: ${worst.toExponential(2)}`);
  const f50 = dimToFog(0.5, 12, 60);
  check('dim/the-near-end-of-the-model-is-untouched',
    f50.near === 12 && fogFactor(f50.near, f50.far, 12) === 0,
    'near is pinned at the nearest point, where the fade is exactly 0');
  check('dim/zero-and-a-degenerate-range-are-off',
    dimToFog(0, 12, 60) === null && dimToFog(0.5, 60, 60) === null, 'both return null');

  // =========================================================================
  // THE WARP — control points on an axis with a gaussian falloff. Built to be
  // pointed at a different axis and a different line set (the next thing that
  // wants it is a petal warped along its own u), so nothing here knows what a
  // stem is and every answer below is a scalar function of one station.
  log('\n--- part one: plot-warp.js ---');

  // Written down: a lone point has no neighbour to take a width from, so it
  // takes the whole axis — 0.6 x 120 = 72.
  check('warp/a-lone-point-takes-the-whole-axis',
    W.sigmasFor([60], 120).length === 1 && Math.abs(W.sigmasFor([60], 120)[0] - 72) < 1e-12,
    `sigma ${W.sigmasFor([60], 120)[0]} on a 120-long axis`);

  // Written down: three points evenly spaced 40 apart are all 0.6 x 40 = 24;
  // and on [10, 20, 120] the widths are 0.6 x 10, 0.6 x mean(10, 100) and
  // 0.6 x 100 — a point with a close neighbour is a LOCAL adjustment and a
  // point with a far one bends the whole run.
  const evenSig = W.sigmasFor([40, 80, 120], 120);
  const unevenSig = W.sigmasFor([10, 20, 120], 120);
  check('warp/the-width-comes-from-the-neighbours',
    evenSig.every(v => Math.abs(v - 24) < 1e-12)
    && Math.abs(unevenSig[0] - 6) < 1e-12 && Math.abs(unevenSig[1] - 33) < 1e-12
    && Math.abs(unevenSig[2] - 60) < 1e-12,
    `even -> ${evenSig.join('/')} · uneven -> ${unevenSig.map(v => v.toFixed(1)).join('/')}`);

  const oneWarp = W.makeWarp([40, 80, 120], [[3, -2, 1], [0, 0, 0], [0, 0, 0]], 120);
  const wo = [0, 0, 0];
  W.warpAt(oneWarp, 40, wo);
  const own = wo.slice();
  W.warpAt(oneWarp, 40 + oneWarp.points[0].sigma, wo);
  check('warp/a-point-pulls-fully-at-its-own-station',
    own[0] === 3 && own[1] === -2 && own[2] === 1
    && Math.abs(wo[0] / 3 - Math.exp(-1)) < 1e-12,
    `[${own}] at its station, ${(wo[0] / 3).toFixed(6)} of it one sigma away`);

  // TWO POINTS BLEND RATHER THAN KINK: the sum's slope has to be continuous AT
  // a control point, which is what rules out a hat function (whose slope jumps
  // by 2 x offset / sigma there) and a spline through the offsets (which would
  // promise to pass through them, and a control point is a PULL).
  const blend = W.makeWarp([40, 80], [[1, 0, 0], [1, 0, 0]], 120);
  const at = x => { const o = [0, 0, 0]; W.warpAt(blend, x, o); return o[0]; };
  const hh2 = 1e-4;
  const slopeL = (at(40) - at(40 - hh2)) / hh2, slopeR = (at(40 + hh2) - at(40)) / hh2;
  check('warp/two-points-blend-rather-than-kink',
    Math.abs(slopeR - slopeL) < 1e-6,
    `slope ${slopeL.toExponential(3)} into the station, ${slopeR.toExponential(3)} out of it`);

  check('warp/no-offset-is-the-identity',
    W.warpIsRest(W.makeWarp([40, 120], [[0, 0, 0], [0, 0, 0]], 120))
    && W.warpIsRest(null) && !W.warpIsRest(blend)
    && W.warpAt(W.makeWarp([40], [[0, 0, 0]], 120), 40, [0, 0, 0]).every(v => v === 0),
    'a warp at rest writes zero and says so');

  // Written down: on [40,80,120] every gap is 40 and the first one wins, so a
  // new point lands at 20; on [20,40,120] the 80-wide gap wins and it lands at
  // 80; on [20,40,60] the tail below the last point is the widest, so it lands
  // at 90; with nothing placed at all it lands at the ROOT.
  // AND THE TIE GOES TO THE GAP NEAREST THE RING. The page's own three
  // defaults on a 170 mm stem are a tie that floating point does not read as
  // one — 56.666666666666664 against 56.66666666666667 — and a bare `>` sent
  // the new point to the middle of the stem. Measured on the page, not imagined.
  const evenThirds = [170 / 3, 2 * 170 / 3, 170];
  check('warp/add-subdivides-the-largest-gap',
    W.nextStation([40, 80, 120], 120) === 20 && W.nextStation([20, 40, 120], 120) === 80
    && W.nextStation([], 120) === 120 && W.nextStation([20, 40, 60], 120) === 90
    && Math.abs(W.nextStation(evenThirds, 170) - 170 / 6) < 1e-9,
    `20 / 80 / 120 / 90, and ${W.nextStation(evenThirds, 170).toFixed(4)} on the page's `
    + 'own tied thirds');
  check('warp/remove-keeps-the-two-ends',
    [1, 2, 3, 4, 5].map(W.removeIndex).join(',') === '0,0,1,1,2' && W.removeIndex(0) === -1,
    'the middle goes; the root and the point nearest the head stay');

  // =========================================================================
  // THE STEM'S LAW. Every failure here draws a plausible flower, which is the
  // whole reason these are functions with written-down answers and not a
  // picture someone looked at.
  log('\n--- part one: plot-stem.js ---');

  // THE TWO BOUNDARY VALUES ARE EXACT, NOT APPROACHED, and Object.is is the
  // comparison on purpose: the seam rests on `droop * droopDecay(0)` being the
  // same float as `droop`, and on `0 * anything` dropping out of the sum. A
  // decay of 0.999 at the ring is invisible on screen and tears the drawing.
  const exactOne = [1, 12, 45, 300, 0].every(n => Object.is(S.droopDecay(0, n), 1));
  const exactZero = [0.5, 12, 80, 0].every(j => Object.is(S.convergence(0, j), 0));
  check('stem/the-boundary-values-are-exact-not-approached',
    exactOne && exactZero,
    'droopDecay(0, n) is exactly 1 and convergence(0, j) is exactly 0, at every setting');

  const NECK = 45;
  const decays = [];
  for (let i = 0; i <= 100; i++) decays.push(S.droopDecay(NECK * i / 100, NECK));
  check('stem/the-decay-washes-the-droop-out-over-the-neck',
    decays[0] > 0.99 && S.droopDecay(NECK, NECK) === 0 && S.droopDecay(2 * NECK, NECK) === 0
    && decays.every((v, i) => i === 0 || v <= decays[i - 1] + 1e-15)
    && Math.abs(decays[1] - decays[0]) < 1e-3
    && Math.abs(decays[100] - decays[99]) < 1e-3,
    `1 -> 0 over ${NECK} mm, monotone, flat at both ends`);

  const JOIN = 12;
  const gs = [];
  for (let i = 0; i <= 100; i++) gs.push(S.convergence(JOIN * i / 100, JOIN));
  check('stem/the-funnel-opens-and-closes-flat',
    S.convergence(JOIN, JOIN) === 1 && S.convergence(2 * JOIN, JOIN) === 1
    && gs.every((v, i) => i === 0 || v >= gs[i - 1] - 1e-15)
    && Math.abs(gs[1] - gs[0]) < 1e-3 && Math.abs(gs[100] - gs[99]) < 1e-3,
    '0 -> 1 over the join, monotone, flat at both ends');

  // Written down: the ring is the feet's own centroid.
  const ringFix = S.ringOf([[2, 0, 0], [-2, 0, 0], [0, 4, 0], [0, -4, 0]]);
  check('stem/the-ring-is-the-feet-own-centroid',
    ringFix.center.every(v => Math.abs(v) < 1e-12)
    && Math.abs(ringFix.rMin - 2) < 1e-12 && Math.abs(ringFix.rMax - 4) < 1e-12
    && ringFix.count === 4,
    `centre (${ringFix.center.join(', ')}) · ${ringFix.rMin}–${ringFix.rMax} out`);

  /* THE LADDER IS UNIFORM WITH THE TOP ZONE PACKED, and both halves of that
     are asserted. Uniform, because that is what makes a bend's resolution the
     same wherever the artist puts it — a single graded ladder left the lower
     stem at 4.5 mm chords and six bend points measured 1.15 mm of
     corner-cutting there. Packed at the top, because a 0.5 mm funnel gets no
     intermediate station at all from a uniform ladder and stops being a taper.
     `topZoneOf` is the one owner of how far down "the top" reaches. */
  const lad = S.stationLadder(170, S.topZoneOf(170, 12, 45));
  const gaps = [];
  for (let i = 1; i < lad.length; i++) gaps.push(lad[i] - lad[i - 1]);
  const body = gaps.slice(-20);
  const bodyUniform = Math.max(...body) - Math.min(...body) < 1e-9;
  // A 0.5 mm join with a 1 mm neck: the top zone is 1 mm, and it still gets
  // its own stations rather than being crossed in one jump.
  const tiny = S.stationLadder(170, S.topZoneOf(170, 0.5, 1));
  // THE GUARANTEE IS A COUNT INSIDE THE ZONE, not a finer FIRST gap. The two
  // sets are merged rather than partitioned, so when the body is already finer
  // than the packing — a 45 mm top zone against a 1.417 mm body spacing — the
  // packing correctly adds nothing, and the property that has to hold is that
  // the zone is resolved either way.
  const within = (l, a) => [...l].filter(v => v > 0 && v <= a + 1e-9).length;
  check('stem/the-ladder-is-uniform-with-the-top-zone-packed',
    lad[0] === 0 && lad[lad.length - 1] === 170
    && [...lad].every((v, i) => i === 0 || v > lad[i - 1])
    && bodyUniform && within(lad, 45) >= S.TOP_ROWS && within(tiny, 1) >= S.TOP_ROWS - 1
    && S.topZoneOf(170, 12, 45) === 45 && S.topZoneOf(170, 80, 45) === 80
    && S.topZoneOf(400, 12, 45) === 45 && S.topZoneOf(20, 12, 45) === 20,
    `${lad.length} stations, body uniform at ${body[0].toFixed(3)} mm; `
    + `${within(lad, 45)} inside a 45 mm top zone, ${within(tiny, 1)} inside a 1 mm one`);

  // --- the seam, bit for bit ----------------------------------------------
  const RING = { center: [0, 0, 0], rMin: 2.23, rMax: 5.32, count: 280 };
  // FLOAT32 ON BOTH SIDES, because that is what the grid's own vertices are and
  // what both builders write. Handing the stem an f64 foot and the head an f32
  // one compares two roundings of two different inputs and fails on a stem that
  // is exact — measured: 54 of 216 corners, all of them at a non-zero droop.
  const FOOT = Float32Array.from([4.275, -3.2, 0]);
  const bentWarp = W.makeWarp([57, 113, 170], [[9, -4, 2], [-6, 11, -3], [4, 4, 8]], 170);
  const seamRows = [];
  for (const droopDeg of [0, -35, 40, 120]) {
    for (const nk of [1, 45, 300]) {
      for (const jn of [0.5, 12, 80]) {
        for (const bundle of [0, 0.35, 5]) {
          for (const warp of [null, bentWarp]) {
            const o = { bundle, join: jn, length: 170,
                        droopRad: droopDeg * Math.PI / 180, neck: nk };
            // THROUGH THE SHIPPED BUFFERS ON BOTH SIDES. `stemLine` and
            // `headTransform` both store Float32 — that is what the drawing is
            // made of — so comparing a raw f64 `stemPointAt` result against a
            // Float32 head point would be comparing two different roundings and
            // would fail on a stem that is exact. A one-station ladder is the
            // stem's own s = 0 point, packed the way the page packs it.
            const stemPt = S.stemLine(FOOT, RING, o, S.stationPlans(o, warp, [0]));
            const headPt = S.headTransform(FOOT, 1, RING.center, o.droopRad);
            seamRows.push([0, 1, 2].every(a2 => Object.is(stemPt[a2], headPt[a2])));
          }
        }
      }
    }
  }
  check('stem/the-head-and-the-stem-agree-at-the-ring',
    seamRows.every(Boolean),
    `${seamRows.filter(Boolean).length} of ${seamRows.length} corners identical to the bit, `
    + 'with and without a bend');

  check('stem/droop-zero-hands-the-grid-straight-back',
    (() => { const arr = Float32Array.from([1, 2, 3]);
             return S.headTransform(arr, 1, [0, 0, 0], 0) === arr; })(),
    'headTransform returns the SAME array at angle 0, so the default draws the file');

  // --- droop is a decaying rotation, not a rigid one ------------------------
  const dOpts = d => ({ bundle: 0.35, join: 12, length: 170,
                        droopRad: d * Math.PI / 180, neck: 45 });
  const ptAt = (d, sAt, warp = null) => {
    const o = [0, 0, 0];
    S.stemPointAt(FOOT, RING, dOpts(d), warp, sAt, o, [0, 0, 0]);
    return o;
  };
  const dist = (a2, b2) => Math.hypot(a2[0] - b2[0], a2[1] - b2[1], a2[2] - b2[2]);
  const far0 = ptAt(0, 100), far40 = ptAt(40, 100);
  const near0 = ptAt(0, 20), near40 = ptAt(40, 20);
  check('stem/the-droop-decays-along-the-neck',
    [0, 1, 2].every(a2 => Object.is(far0[a2], far40[a2])) && dist(near0, near40) > 1,
    'past the 45 mm neck the stem is untouched to the bit; inside it, '
    + `${dist(near0, near40).toFixed(2)} mm`);

  const atNeck = n => { const o = [0, 0, 0];
    S.stemPointAt(FOOT, RING, { ...dOpts(40), neck: n }, null, 40, o, [0, 0, 0]); return o; };
  check('stem/the-neck-is-not-derivable-from-the-droop',
    dist(atNeck(20), atNeck(90)) > 5,
    `the same 40° head over a 20 mm and a 90 mm neck differ by `
    + `${dist(atNeck(20), atNeck(90)).toFixed(2)} mm at 40 mm down — a stiff stalk `
    + 'against a nodding one');

  // --- the bend cannot reach the head --------------------------------------
  const bigWarp = W.makeWarp([57, 113, 170], [[80, -60, 40], [70, 50, -30], [-90, 20, 60]], 170);
  const rest0 = ptAt(40, 0), bent0 = ptAt(40, 0, bigWarp);
  const bentMid = ptAt(40, 113, bigWarp), restMid = ptAt(40, 113);
  check('stem/a-bend-cannot-reach-the-head',
    [0, 1, 2].every(a2 => Object.is(rest0[a2], bent0[a2])) && dist(bentMid, restMid) > 40,
    'a 100 mm pull leaves the ring point identical to the bit while moving the stem '
    + `${dist(bentMid, restMid).toFixed(1)} mm`);

  // --- the funnel ----------------------------------------------------------
  const R0 = Math.hypot(FOOT[0], FOOT[1]), TH0 = Math.atan2(FOOT[1], FOOT[0]);
  const radii = [];
  for (let i = 0; i <= 200; i++) {
    const q2 = ptAt(0, 12 * i / 200);
    radii.push(Math.hypot(q2[0], q2[1]));
  }
  const past = ptAt(0, 60);
  const dR = R0 - 0.35;
  let worstD2 = 0;
  for (let i = 1; i < radii.length - 1; i++) {
    worstD2 = Math.max(worstD2, Math.abs(radii[i + 1] - 2 * radii[i] + radii[i - 1]));
  }
  check('stem/the-funnel-closes-smoothly-over-the-join',
    radii[0] === R0 && Math.abs(radii[radii.length - 1] - 0.35) < 1e-9
    && radii.every((v, i) => i === 0 || v < radii[i - 1])
    && worstD2 < 0.01 * dR,
    `${R0.toFixed(3)} -> 0.350 mm strictly, largest second difference `
    + `${worstD2.toExponential(2)} against a step's ${dR.toFixed(3)}`);
  check('stem/below-the-join-a-line-sits-on-the-bundle-at-its-own-azimuth',
    Math.abs(Math.hypot(past[0], past[1]) - 0.35) < 1e-9
    && Math.abs(Math.atan2(past[1], past[0]) - TH0) < 1e-9,
    `radius ${Math.hypot(past[0], past[1]).toFixed(6)} mm at azimuth `
    + `${(TH0 * 180 / Math.PI).toFixed(3)}°, the foot's own`);

  // --- how much the graded ladder cuts the corner --------------------------
  const sagRows = [
    ['defaults', { bundle: 0.35, join: 12, length: 170, droopRad: 0, neck: 45 }],
    ['droop 40', dOpts(40)],
    ['90° into a 20 mm neck',
     { bundle: 0.35, join: 12, length: 170, droopRad: Math.PI / 2, neck: 20 }],
    ['120° into a 10 mm neck',
     { bundle: 0.35, join: 0.5, length: 170, droopRad: 120 * Math.PI / 180, neck: 10 }],
  ].map(([label, o]) => [label, S.maxChordSagitta(RING, o, null,
    S.stationLadder(170, S.topZoneOf(170, o.join, o.neck)))]);
  // AND UNDER A BEND, which is the case the first ladder got wrong: six control
  // points with real pulls read 1.150 mm of corner-cutting on the graded
  // 64-row ladder and 0.155 mm on this one.
  const bendStations = [];
  for (let i = 1; i <= 6; i++) bendStations.push(170 * i / 6);
  const sixBend = W.makeWarp(bendStations,
    [[0, 0, 0], [90, 0, 0], [0, 0, 0], [-80, 0, 0], [0, 0, 0], [70, 0, 0]], 170);
  const bendOpts = { bundle: 0.35, join: 12, length: 170, droopRad: 0.7, neck: 45 };
  sagRows.push(['six bend points, three 90 mm pulls',
    S.maxChordSagitta(RING, bendOpts, sixBend,
      S.stationLadder(170, S.topZoneOf(170, 12, 45)))]);
  check('stem/the-station-ladder-is-fine-enough-to-draw-the-curve',
    sagRows.every(([, v]) => v < 0.2),
    sagRows.map(([l, v]) => `${l} ${v.toFixed(3)} mm`).join(' · ') + ' on a 170 mm stem');

  // =========================================================================
  // THE PETAL'S LAW. Every failure here draws a plausible bloom, which is the
  // reason these are functions over a petal whose answer is written down: on a
  // 28-petal drawing a warp that leaks into a neighbour, a warp that reaches
  // one line family and not the other, and a base that quietly drifts off the
  // attachment ring are all invisible.
  log('\n--- part one: plot-petal.js, on a petal whose answer is written down ---');

  /* A FLAT STRAIGHT PETAL, SO EVERY ANSWER CAN BE STATED. 21 rows at u = r/20
     spaced 2 mm apart along +x, 3 columns at y = -4, 0, +4. So the centre line
     is the x axis, its length is exactly 40 mm, the half-width is exactly 4,
     the base is the origin and the hold — ROOT_HOLD_ROWS rows in — is exactly
     6 mm. The lattice is shared exactly the way the real file's is: the u-line
     in column c and the v-line in row r hand back the SAME point. */
  const FIX_ROWS = 21, FIX_COLS = 3, FIX_STEP = 2, FIX_HALF = 4;
  const fixtureStrips = () => {
    const out = [];
    const at = (r, c) => [r * FIX_STEP, (c - 1) * FIX_HALF, 0];
    for (let c = 0; c < FIX_COLS; c++) {
      const pts = new Float32Array(FIX_ROWS * 3), st = new Float64Array(FIX_ROWS);
      for (let r = 0; r < FIX_ROWS; r++) {
        const q2 = at(r, c);
        pts[r * 3] = q2[0]; pts[r * 3 + 1] = q2[1]; pts[r * 3 + 2] = q2[2];
        st[r] = r / (FIX_ROWS - 1);
      }
      out.push({ kind: 'u', index: c, last: FIX_COLS - 1, count: FIX_ROWS,
                 segments: FIX_ROWS - 1, points: pts, stations: st, petal: 0 });
    }
    for (let r = 0; r < FIX_ROWS; r++) {
      const pts = new Float32Array(FIX_COLS * 3);
      for (let c = 0; c < FIX_COLS; c++) {
        const q2 = at(r, c);
        pts[c * 3] = q2[0]; pts[c * 3 + 1] = q2[1]; pts[c * 3 + 2] = q2[2];
      }
      out.push({ kind: 'v', index: r, last: FIX_ROWS - 1, count: FIX_COLS,
                 segments: FIX_COLS - 1, points: pts, petal: 0,
                 stations: new Float64Array(FIX_COLS).fill(r / (FIX_ROWS - 1)) });
    }
    return out;
  };
  const FIX = fixtureStrips();
  const fixFrame = PT.petalFrame(FIX);
  const FIX_L = (FIX_ROWS - 1) * FIX_STEP;

  check('petal/the-frame-is-measured-from-the-file-own-points',
    fixFrame && fixFrame.rows.length === FIX_ROWS
    && fixFrame.length === FIX_L && fixFrame.holdRows === PT.ROOT_HOLD_ROWS
    && fixFrame.hold === PT.ROOT_HOLD_ROWS * FIX_STEP
    && fixFrame.base.every(v => v === 0) && fixFrame.rows[0].s === 0
    && PT.stationOfU(fixFrame, 0.5) === FIX_L / 2
    && PT.petalHalfWidth(FIX, fixFrame) === FIX_HALF,
    `${fixFrame.rows.length} rows · ${fixFrame.length} mm along the centre line · hold `
    + `${fixFrame.hold} mm (${fixFrame.holdRows} rows) · half-width `
    + `${PT.petalHalfWidth(FIX, fixFrame)} mm — all exact`);

  /* THE HOLD IS EXACTLY ZERO AT THE BASE, and `Object.is` is the comparison for
     the same reason the stem's boundary check uses it: the whole seam rests on
     `0 * anything` dropping out of the sum, and a hold of 0.001 at the base is
     invisible on screen while tearing the petal off the ring the stem hangs
     from. Flat at both ends so the petal leaves the ring tangentially. */
  const holds = [];
  for (let i = 0; i <= 100; i++) holds.push(PT.rootHold(6 * i / 100, 6));
  check('petal/the-base-hold-is-exactly-zero-and-opens-flat',
    [0.5, 6, 40, 0].every(h => Object.is(PT.rootHold(0, h), 0))
    && PT.rootHold(6, 6) === 1 && PT.rootHold(60, 6) === 1
    && holds.every((v, i) => i === 0 || v >= holds[i - 1] - 1e-15)
    && Math.abs(holds[1] - holds[0]) < 1e-3 && Math.abs(holds[100] - holds[99]) < 1e-3,
    'rootHold(0, h) is exactly 0 at every hold; 0 -> 1 over the hold, monotone, '
    + 'flat at both ends');

  /* AND THE DELTA IS EXACTLY ZERO THERE, at every setting there is — which is
     the property the seam is, rather than a consequence of it. Swept over both
     scales and a bend big enough to throw the petal across the frame. */
  const fixWarp = W.makeWarp([FIX_L * 0.5, FIX_L], [[60, -40, 25], [-50, 30, 45]], FIX_L);
  let deltaRows = 0, deltaZero = 0;
  for (const along of [0.25, 1, 2.5]) {
    for (const across of [0.25, 1, 2.5]) {
      for (const wp of [null, fixWarp]) {
        const d = PT.petalDeltaAt(fixFrame, wp, { along, across }, 0,
          fixFrame.base, [0, -FIX_HALF, 0], [0, 0, 0], [0, 0, 0]);
        deltaRows++;
        if (d[0] === 0 && d[1] === 0 && d[2] === 0) deltaZero++;
      }
    }
  }
  check('petal/the-delta-is-exactly-zero-at-the-base',
    deltaZero === deltaRows && deltaRows === 18,
    `${deltaZero} of ${deltaRows} corners of (along x across x bend) put the base row `
    + 'exactly nowhere — the seam is this, not a consequence of it');

  check('petal/at-rest-the-points-come-straight-back',
    PT.petalIsRest({ along: 1, across: 1 }, null)
    && !PT.petalIsRest({ along: 1.5, across: 1 }, null)
    && !PT.petalIsRest({ along: 1, across: 0.5 }, null)
    && !PT.petalIsRest({ along: 1, across: 1 }, fixWarp)
    && PT.petalPoints(FIX[0].points, FIX[0].count, FIX[0].stations, fixFrame, null,
                      { along: 1, across: 1 }) === FIX[0].points,
    'petalPoints returns the SAME array when nothing is asked of the petal, so an '
    + 'untouched petal draws the vertices the file wrote');

  /* THE TWO STRETCHES ARE INDEPENDENT, and each is asserted on what it must
     LEAVE ALONE as well as on what it changes — a single control wired to "make
     it look different" satisfies the first half of either on its own. Measured
     by re-deriving the frame from the DEFORMED points, so the length and the
     width come from the drawing rather than from the number that was typed. */
  const warped = (along, across, wp = null) => FIX.map(t => ({ ...t,
    points: PT.petalPoints(t.points, t.count, t.stations, fixFrame, wp, { along, across }) }));
  const sizeOf = set => { const f2 = PT.petalFrame(set);
                          return { L: f2.length, half: PT.petalHalfWidth(set, f2) }; };
  /* THE WIDTH IS MEASURED ROW BY ROW, NOT AS A MAXIMUM, and that is a finding
     rather than a nicety. The across scale rides `rootHold`, so the rows inside
     the hold keep the width the junction gave the foot — narrow the blade
     enough and the petal's WIDEST point moves into the hold, where it is
     correctly not narrowing, and a maximum then reads unchanged. Measured on
     this fixture: the max half-width comes back 4.00 mm at across 0.5 and at
     0.25 alike, and the first version of this check failed on it. So the claim
     is stated where it belongs — the blade past the hold scales exactly, and
     the base row does not move at all. */
  const halfAtRow = (set, f2, u) => {
    let w = 0;
    const c = PT.centreOfU(f2, u, [0, 0, 0]);
    for (const t of set) {
      if (!t.stations) continue;
      for (let i = 0; i < t.count; i++) {
        if (t.stations[i] !== u) continue;
        w = Math.max(w, Math.hypot(t.points[i * 3] - c[0], t.points[i * 3 + 1] - c[1],
                                   t.points[i * 3 + 2] - c[2]));
      }
    }
    return w;
  };
  const TIP_U = 1, BASE_U = 0;
  const sizeAt = set => { const f2 = PT.petalFrame(set);
    return { L: f2.length, blade: halfAtRow(set, f2, TIP_U),
             foot: halfAtRow(set, f2, BASE_U), max: PT.petalHalfWidth(set, f2) }; };
  const alongRows = [0.25, 0.5, 1, 1.6, 2.5].map(k => [k, sizeAt(warped(k, 1))]);
  const acrossRows = [0.25, 0.5, 1, 1.6, 2.5].map(k => [k, sizeAt(warped(1, k))]);
  check('petal/along-scales-the-length-and-leaves-the-width',
    alongRows.every(([k, r2]) => Math.abs(r2.L - k * FIX_L) < 1e-4
                                 && Math.abs(r2.blade - FIX_HALF) < 1e-4
                                 && Math.abs(r2.foot - FIX_HALF) < 1e-4),
    alongRows.map(([k, r2]) => `${k}x -> ${r2.L.toFixed(2)} mm long, `
      + `${r2.blade.toFixed(2)} wide`).join(' · '));
  check('petal/across-scales-the-width-past-the-hold-and-holds-the-foot',
    acrossRows.every(([k, r2]) => Math.abs(r2.blade - k * FIX_HALF) < 1e-4
                                  && Math.abs(r2.foot - FIX_HALF) < 1e-9
                                  && Math.abs(r2.L - FIX_L) < 1e-4),
    acrossRows.map(([k, r2]) => `${k}x -> blade ${r2.blade.toFixed(2)} mm, foot `
      + `${r2.foot.toFixed(2)}, length ${r2.L.toFixed(2)}`).join(' · ')
    + ` — and the whole-petal MAXIMUM reads ${acrossRows.map(([, r2]) =>
        r2.max.toFixed(2)).join('/')}, which is why it is not what is asserted`);

  // A BEND CANNOT REACH THE BASE — the petal's own version of the claim the
  // stem's funnel gate carries, and the reason the base row is compared to the
  // BIT rather than to a tolerance.
  const bentFix = warped(1, 1, fixWarp);
  let baseBit = 0, baseN = 0, midMove = 0;
  for (let k = 0; k < FIX.length; k++) {
    for (let i = 0; i < FIX[k].count; i++) {
      const d = Math.hypot(bentFix[k].points[i * 3] - FIX[k].points[i * 3],
        bentFix[k].points[i * 3 + 1] - FIX[k].points[i * 3 + 1],
        bentFix[k].points[i * 3 + 2] - FIX[k].points[i * 3 + 2]);
      if (FIX[k].stations[i] === 0) {
        baseN++;
        if ([0, 1, 2].every(a2 => Object.is(bentFix[k].points[i * 3 + a2],
                                            FIX[k].points[i * 3 + a2]))) baseBit++;
      } else if (d > midMove) midMove = d;
    }
  }
  check('petal/a-bend-cannot-reach-the-base',
    baseN > 0 && baseBit === baseN && midMove > 20,
    `a 60 mm pull on a 40 mm petal leaves all ${baseN} base points identical to the bit `
    + `while moving the rest up to ${midMove.toFixed(1)} mm`);

  /* THE TWO LINE FAMILIES TAKE THE SAME DISPLACEMENT, as an identity. The
     u-line in column c and the v-line in row r share the point (r, c); every
     term of the law depends on the point and on its station and on nothing
     else, so the two copies cannot part company. A warp that reached one family
     and not the other would tear the grid internally — conspicuous once it
     happens and easy to miss while developing with `u only` on. */
  const crossings = (set) => {
    const U = set.filter(t => t.kind === 'u').sort((a, b) => a.index - b.index);
    const V = set.filter(t => t.kind === 'v').sort((a, b) => a.index - b.index);
    let bad = 0, n = 0;
    for (let c = 0; c < U.length; c++) {
      for (let r2 = 0; r2 < V.length; r2++) {
        for (let a2 = 0; a2 < 3; a2++) {
          n++;
          if (!Object.is(U[c].points[r2 * 3 + a2], V[r2].points[c * 3 + a2])) bad++;
        }
      }
    }
    return { bad, n };
  };
  const crossRows = [[1, 1, fixWarp], [2.5, 1, null], [1, 2.5, null], [0.4, 0.6, fixWarp]]
    .map(([a2, b2, wp]) => crossings(warped(a2, b2, wp)));
  check('petal/the-two-line-families-take-the-same-displacement',
    crossings(FIX).bad === 0 && crossRows.every(r2 => r2.bad === 0),
    `${crossRows.reduce((a2, r2) => a2 + r2.n, 0)} shared coordinates over four settings, `
    + `${crossRows.reduce((a2, r2) => a2 + r2.bad, 0)} of them different — the lattice is `
    + 'shared and stays shared');

  // =========================================================================
  // THE FRAME, as arithmetic. A boundary that is merely plausible draws a
  // perfectly convincing rectangle on a black field, so every number below is
  // written down here rather than read back off a picture.
  log('\n--- part one: plot-frame.js, on boxes whose answer is written down ---');

  // Written down: on a 1000 x 800 canvas at margin 0, a 1:1 box is the height,
  // 800 x 800 at x = 100; a 2:3 box is height-limited too (1000/800 = 1.25 is
  // wider than 2/3), so 533.333 x 800 at x = 233.333. At margin 10% the inset
  // is 10% of the SHORTER side = 80 px a side, leaving 840 x 640, and the 2:3
  // box in it is 426.667 x 640 at (286.667, 80).
  const fnear = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
  const frBoxEq = (r, x, y, w, h) => fnear(r.x, x, 1e-6) && fnear(r.y, y, 1e-6)
                                && fnear(r.width, w, 1e-6) && fnear(r.height, h, 1e-6);
  const bSquare = FR.frameRect(1000, 800, 1, 0);
  const b23 = FR.frameRect(1000, 800, 2 / 3, 0);
  const b23m = FR.frameRect(1000, 800, 2 / 3, 10);
  check('frame/the-box-is-the-largest-ratio-box-inside-the-margin',
    frBoxEq(bSquare, 100, 0, 800, 800) && frBoxEq(b23, 233.3333333333, 0, 533.3333333333, 800)
    && frBoxEq(b23m, 286.6666666666, 80, 426.6666666666, 640),
    `1000x800: 1:1 -> ${bSquare.width}x${bSquare.height} at x ${bSquare.x.toFixed(3)}; `
    + `2:3 -> ${b23.width.toFixed(3)}x${b23.height}; 2:3 at 10% -> `
    + `${b23m.width.toFixed(3)}x${b23m.height} at (${b23m.x.toFixed(3)}, ${b23m.y})`);

  // The same percentage on a frWide canvas and a frTall one has to be the same
  // visual gap, which is what "of the shorter side" buys.
  const frWide = FR.frameRect(1000, 800, 1, 10), frTall = FR.frameRect(800, 1000, 1, 10);
  check('frame/the-margin-insets-from-the-shorter-side',
    fnear(frWide.inset, 80) && fnear(frTall.inset, 80)
    && fnear(FR.frameRect(1000, 800, 1, 0).inset, 0),
    `10% is ${frWide.inset} px on 1000x800 and ${frTall.inset} px on 800x1000 — the same gap`);

  // TWO TYPES, NOT FOUR: the ratio is its own axis, so 1:1 gives a square and a
  // circle exactly rather than by a fourth named shape agreeing with it.
  const frCircle = FR.frameOutline('ellipse', bSquare);
  const frRadii = [];
  for (let i = 0; i < frCircle.count; i++) {
    frRadii.push(Math.hypot(frCircle.points[i * 3] - bSquare.cx, frCircle.points[i * 3 + 1] - bSquare.cy));
  }
  check('frame/a-square-is-a-rectangle-at-one-to-one-and-a-circle-an-ellipse',
    FR.parseRatio('1:1') === 1 && fnear(bSquare.width, bSquare.height)
    && frRadii.every(r => fnear(r, 400, 1e-4)),
    `1:1 -> ${bSquare.width}x${bSquare.height}; every one of ${frCircle.count} ellipse points `
    + `is ${Math.min(...frRadii).toFixed(4)}..${Math.max(...frRadii).toFixed(4)} from the centre`);

  // THE ELLIPSE IS INSCRIBED IN THE VERY SAME BOX, so switching shape moves no
  // edge — the box is a function of the ratio and the margin and of nothing else.
  /* TOLERANCES SIZED FOR FLOAT32, WHICH IS WHAT THE OUTLINE IS. `frameOutline`
     returns a Float32Array because that is what the geometry buffer takes, so a
     coordinate near 700 px carries about 8e-5 of quantisation and the ellipse's
     own residual lands near 3e-7. Asking for 1e-6 here failed on the dust and
     not on the geometry — the first run of this check did exactly that. */
  const F32 = 1e-3;
  const frEll = FR.frameOutline('ellipse', b23m);
  let frOnCurve = 0, frWorst = 0;
  const ea = b23m.width / 2, eb = b23m.height / 2;
  let ex0 = Infinity, ey0 = Infinity, ex1 = -Infinity, ey1 = -Infinity;
  for (let i = 0; i < frEll.count; i++) {
    const x = frEll.points[i * 3], y = frEll.points[i * 3 + 1];
    const f = ((x - b23m.cx) / ea) ** 2 + ((y - b23m.cy) / eb) ** 2;
    frWorst = Math.max(frWorst, Math.abs(f - 1));
    if (fnear(f, 1, 1e-5)) frOnCurve++;
    ex0 = Math.min(ex0, x); ex1 = Math.max(ex1, x);
    ey0 = Math.min(ey0, y); ey1 = Math.max(ey1, y);
  }
  check('frame/the-ellipse-is-inscribed-in-the-very-same-box',
    frOnCurve === frEll.count && fnear(ex0, b23m.x, F32) && fnear(ey0, b23m.y, F32)
    && fnear(ex1, b23m.x + b23m.width, F32) && fnear(ey1, b23m.y + b23m.height, F32),
    `${frOnCurve} of ${frEll.count} points satisfy the ellipse to ${frWorst.toExponential(1)}, `
    + `and its extremes touch the box at ${ex0.toFixed(3)}..${ex1.toFixed(3)} x `
    + `${ey0.toFixed(3)}..${ey1.toFixed(3)}`);

  const rectLoop = FR.frameOutline('rect', b23m);
  const loopCloses = o => o.points[0] === o.points[(o.count - 1) * 3]
                   && o.points[1] === o.points[(o.count - 1) * 3 + 1];
  check('frame/the-outline-is-a-closed-loop-in-both-shapes',
    loopCloses(rectLoop) && loopCloses(frEll) && rectLoop.segments === 4
    && frEll.segments === FR.ELLIPSE_SEGMENTS,
    `rect ${rectLoop.segments} segments · ellipse ${frEll.segments} — both return to their `
    + 'first point exactly, so the join needs no special case');

  /* THE UNFRAMED FIT IS THE EXPRESSION /plot SHIPPED, term for term. This is
     the identity the page's `fitCamera` rests on: hand `fitTangents` the
     canvas's own box and it returns `tanY` and `tanY * W / H`, and
     `camera.aspect` IS W / H. Asserted with === rather than a tolerance,
     because it is an identity and not an approximation. */
  const frTan0 = Math.tan((38 * Math.PI / 180) / 2);
  const wholeTan = FR.fitTangents(frTan0, { width: 1100, height: 800 }, 800);
  check('frame/the-unframed-fit-is-the-expression-the-page-shipped',
    wholeTan.tanY === frTan0 && wholeTan.tanX === frTan0 * (1100 / 800),
    `tanY ${wholeTan.tanY} === ${frTan0} and tanX ${wholeTan.tanX} === tanY * 1100/800 — exactly`);

  check('frame/a-ratio-the-page-cannot-show-is-not-guessed-at',
    FR.parseRatio('7:5') === 1.4 && FR.isListedRatio('7:5') === false
    && FR.parseRatio('rubbish') === null && FR.parseRatio('0:3') === null
    && FR.isListedRatio('2:3') === true,
    '7:5 parses and is not offered; "rubbish" and "0:3" are not ratios at all');

  // =========================================================================
  // THE COMPOSITION FILE. Every claim here is about the ROUND TRIP, because a
  // restore that silently drops a field looks exactly like one that did not.
  log('\n--- part one: plot-file.js, round-tripped over a state written down ---');

  // The bounds a control would supply. Written down rather than read off the
  // markup, so a check about clamping is about the clamp.
  const FILE_BOUNDS = {
    frameMargin: { min: 0, max: 40, step: 1 },
    uDensity: { min: 1, max: 12, step: 1 }, vDensity: { min: 1, max: 12, step: 1 },
    weight: { min: 0.3, max: 5, step: 0.1 },
    brightness: { min: 5, max: 100, step: 1 }, depthDim: { min: 0, max: 100, step: 1 },
    stemBundle: { min: 0, max: 5, step: 0.05 }, stemJoin: { min: 0.5, max: 80, step: 0.5 },
    stemLength: { min: 10, max: 500, step: 1 }, stemDroop: { min: -120, max: 120, step: 1 },
    stemNeck: { min: 1, max: 300, step: 1 },
    petalAlong: { min: 0.25, max: 2.5, step: 0.05 },
    petalAcross: { min: 0.25, max: 2.5, step: 0.05 },
  };
  const FILE_OPTS = { boundsOf: id => FILE_BOUNDS[id] || null,
                 limits: { stemBends: 8, petalBends: 6 } };
  const FILE_STATE = {
    frame: { on: 'on', shape: 'ellipse', ratio: '4:5', margin: 18 },
    draw: { families: 'u', uDensity: 5, vDensity: 8, weight: 2.4, polarity: 'print',
            brightness: 62, depthDim: 20 },
    view: { stemHandles: false, petalHandles: true },
    camera: { position: [11, 22, 33], target: [1, 2, 3], fov: 38 },
    selection: { instance: 0, petal: 7 },
    instances: [{
      id: 'bloom-0',
      grid: { name: 'g.glb', mode: 'live', petals: 28, u: 280, v: 812, other: 0,
              strips: 1092, segments: 15148 },
      transform: FL.IDENTITY_TRANSFORM,
      stem: { on: 'on', bundle: 1.6, join: 30, length: 240, droopDeg: 35, neck: 90,
              bends: [{ t: 0.25, offset: [1, 2, 3] }, { t: 0.75, offset: [-4, 5, -6] }] },
      // TWO PETALS AT DIFFERENT SHAPES — the state a single global warp could
      // not express, and the reason the file holds a LIST.
      petals: [{ index: 7, along: 1.9, across: 0.7, bends: [{ t: 0.5, offset: [3, 0, 1] }] },
               { index: 2, along: 0.6, across: 2.2, bends: [] }],
    }],
  };
  const roundTrip = st => FL.readDoc(JSON.parse(FL.toText(FL.composeDoc(st))), FILE_OPTS);

  /* THE TABLES ARE THE ONE OWNER OF WHAT IS IN THE FILE — and a table ROW that
     vanished would round-trip perfectly while silently losing its field, since
     the writer and the reader walk the same table. So the census is written
     down here: adding a field to the format means editing this line on purpose. */
  const fieldKeysOf = t => t.map(f => f.key).join(',');
  check('file/the-document-carries-exactly-these-fields',
    fieldKeysOf(FL.FRAME_FIELDS) === 'on,shape,ratio,margin'
    && fieldKeysOf(FL.DRAW_FIELDS) === 'families,uDensity,vDensity,weight,polarity,brightness,depthDim'
    && fieldKeysOf(FL.VIEW_FIELDS) === 'stemHandles,petalHandles'
    && fieldKeysOf(FL.STEM_FIELDS) === 'on,bundle,join,length,droopDeg,neck'
    && fieldKeysOf(FL.PETAL_FIELDS) === 'along,across',
    `frame(${fieldKeysOf(FL.FRAME_FIELDS)}) draw(${fieldKeysOf(FL.DRAW_FIELDS)}) `
    + `view(${fieldKeysOf(FL.VIEW_FIELDS)}) stem(${fieldKeysOf(FL.STEM_FIELDS)}) `
    + `petal(${fieldKeysOf(FL.PETAL_FIELDS)})`);

  const rt = roundTrip(FILE_STATE);
  const rtDiff = [];
  if (rt.ok) {
    for (const [group, fields] of [['frame', FL.FRAME_FIELDS], ['draw', FL.DRAW_FIELDS],
                                   ['view', FL.VIEW_FIELDS]]) {
      for (const f of fields) {
        if (rt.doc[group][f.key] !== FILE_STATE[group][f.key]) rtDiff.push(`${group}.${f.key}`);
      }
    }
    const si = FILE_STATE.instances[0], di = rt.doc.instances[0];
    for (const f of FL.STEM_FIELDS) if (di.stem[f.key] !== si.stem[f.key]) rtDiff.push(`stem.${f.key}`);
    if (JSON.stringify(di.stem.bends) !== JSON.stringify(si.stem.bends)) rtDiff.push('stem.bends');
    for (const p of si.petals) {
      const got = di.petals.find(x => x.index === p.index);
      if (!got) { rtDiff.push(`petal ${p.index} missing`); continue; }
      for (const f of FL.PETAL_FIELDS) if (got[f.key] !== p[f.key]) rtDiff.push(`petal ${p.index}.${f.key}`);
      if (JSON.stringify(got.bends) !== JSON.stringify(p.bends)) rtDiff.push(`petal ${p.index}.bends`);
    }
    if (JSON.stringify(rt.doc.camera) !== JSON.stringify(FILE_STATE.camera)) rtDiff.push('camera');
    if (JSON.stringify(rt.doc.selection) !== JSON.stringify(FILE_STATE.selection)) rtDiff.push('selection');
  } else rtDiff.push(`refused: ${rt.error}`);
  check('file/every-field-round-trips-through-the-writer-and-the-reader',
    rt.ok && rtDiff.length === 0 && rt.notes.length === 0,
    rtDiff.length ? `differed: ${rtDiff.join(', ')}`
      : `every field of five groups, two bend lists and two petals came back; `
        + `${rt.notes.length} notes`);

  /* A WARP IS PER PETAL IN THE FILE AS ON THE PAGE. Two things, and the second
     is the one the global model would fail: the entries are separable, AND
     nowhere in the document is there a warp that is not inside a petal entry. */
  const flatText = FL.toText(FL.composeDoc(FILE_STATE));
  const globalWarp = /"along"\s*:/g;
  const alongCount = (flatText.match(globalWarp) || []).length;
  check('file/a-warp-belongs-to-its-petal-and-not-to-the-drawing',
    rt.ok && rt.doc.instances[0].petals.length === 2
    && rt.doc.instances[0].petals.find(p => p.index === 7).along === 1.9
    && rt.doc.instances[0].petals.find(p => p.index === 2).along === 0.6
    && alongCount === 2 && !('along' in rt.doc.draw) && !('along' in rt.doc.instances[0].stem),
    `two petals hold 1.9x and 0.6x separately; the word "along" appears ${alongCount} times `
    + 'in the file and both are inside a petal entry');

  check('file/the-root-is-a-list-of-instances-even-with-one-bloom',
    Array.isArray(rt.doc.instances) && rt.doc.instances.length === 1
    && ['grid', 'transform', 'stem', 'petals'].every(k => k in rt.doc.instances[0])
    && !('stem' in rt.doc) && !('petals' in rt.doc)
    && 'frame' in rt.doc && 'camera' in rt.doc && 'draw' in rt.doc,
    'the bloom-shaped state is inside instances[0] and the composition-shaped state is at '
    + 'the root — adding a second bloom is an entry, not a migration');

  // A file the WRITER dropped a field from: the reader has to name it, and must
  // not fill it in — a defaulted field is a page that looks restored.
  const docMissing = JSON.parse(flatText);
  delete docMissing.draw.brightness;
  delete docMissing.instances[0].stem.neck;
  const rMissing = FL.readDoc(docMissing, FILE_OPTS);
  const missNotes = rMissing.notes.filter(n => n.kind === 'missing');
  check('file/a-field-the-writer-dropped-is-reported-and-not-filled-in',
    rMissing.ok && !('brightness' in rMissing.doc.draw)
    && !('neck' in rMissing.doc.instances[0].stem)
    && missNotes.some(n => n.text.includes('draw.brightness'))
    && missNotes.some(n => n.text.includes('stem.neck')),
    `${missNotes.length} missing notes; neither key is in the result, so the applier has `
    + 'nothing to write and the page keeps what it has');

  const docStrange = JSON.parse(flatText);
  docStrange.draw.glitter = 3;
  docStrange.mood = 'wistful';
  const rStrange = FL.readDoc(docStrange, FILE_OPTS);
  check('file/a-field-this-page-does-not-know-is-reported-rather-than-ignored',
    rStrange.ok && rStrange.notes.filter(n => n.kind === 'unknown').length === 2,
    rStrange.notes.filter(n => n.kind === 'unknown').map(n => n.text).join(' · '));

  const docRough = JSON.parse(flatText);
  docRough.draw.brightness = 400;          // past the control's top
  docRough.draw.weight = 1.137;            // off its 0.1 step
  docRough.instances[0].stem.length = -20; // under its floor
  const rRough = FL.readDoc(docRough, FILE_OPTS);
  check('file/a-value-the-control-cannot-hold-is-clamped-or-snapped-and-told',
    rRough.ok && rRough.doc.draw.brightness === 100 && fnear(rRough.doc.draw.weight, 1.1, 1e-9)
    && rRough.doc.instances[0].stem.length === 10
    && rRough.notes.filter(n => n.kind === 'clamped').length === 3,
    `brightness 400 -> ${rRough.doc.draw.brightness}, weight 1.137 -> ${rRough.doc.draw.weight}, `
    + `length -20 -> ${rRough.doc.instances[0].stem.length}, all three told`);

  const docRefusals = [
    ['not an object', FL.readDoc('nope', FILE_OPTS)],
    ['wrong format', FL.readDoc({ format: 'something-else', version: 1 }, FILE_OPTS)],
    ['no version', FL.readDoc({ format: FL.FORMAT }, FILE_OPTS)],
    ['no instances', FL.readDoc({ format: FL.FORMAT, version: 1, instances: [] }, FILE_OPTS)],
  ];
  check('file/it-refuses-what-is-not-a-composition',
    docRefusals.every(([, r2]) => r2.ok === false && typeof r2.error === 'string' && r2.error.length > 10),
    docRefusals.map(([n, r2]) => `${n}: ${r2.error.slice(0, 44)}…`).join(' · '));

  const docFuture = JSON.parse(flatText); docFuture.version = FL.VERSION + 1;
  docFuture.draw.somethingNew = 12;
  const rFuture = FL.readDoc(docFuture, FILE_OPTS);
  check('file/a-newer-version-is-refused-rather-than-partly-read',
    rFuture.ok === false && rFuture.error.includes(String(FL.VERSION + 1)),
    'reading a v' + (FL.VERSION + 1) + ' file with a v' + FL.VERSION + ' reader would mean '
    + 'ignoring whatever it added, which is the silent partial restore in another coat');

  const docPlaced = JSON.parse(flatText);
  docPlaced.instances[0].transform.position = [40, 0, 0];
  const rPlaced = FL.readDoc(docPlaced, FILE_OPTS);
  check('file/a-transform-this-page-cannot-honour-is-reported-as-not-applied',
    rPlaced.ok && rPlaced.notes.some(n => n.kind === 'not-applied' && n.text.includes('transform'))
    && FL.isIdentityTransform(FL.IDENTITY_TRANSFORM) === true
    && FL.isIdentityTransform({ position: [0, 0, 0], rotationDeg: [0, 0, 0], scale: [1, 1, 1] }) === true
    && FL.isIdentityTransform(rPlaced.doc.instances[0].transform) === false,
    'placing an instance is multi-bloom work and is not built — a file that carries one is '
    + 'told, not drawn as though it did not');

  const twoBlooms = JSON.parse(flatText);
  twoBlooms.instances.push(JSON.parse(JSON.stringify(twoBlooms.instances[0])));
  const rTwo = FL.readDoc(twoBlooms, FILE_OPTS);
  check('file/a-file-with-more-blooms-than-this-page-draws-is-read-and-told',
    rTwo.ok && rTwo.doc.instances.length === 2
    && rTwo.notes.some(n => n.kind === 'not-applied' && n.text.includes('only the first')),
    'both instances are READ — the format is not the limit — and the page says it drew one');

  /* A WARP FOR A PETAL THE GRID DOES NOT HAVE IS DROPPED, NEVER FOLDED ONTO A
     NEIGHBOUR. The one outcome worse than a warp not landing is a warp landing
     on the wrong petal, and neither the picture nor any count would show it. */
  const resolved = FL.resolvePetals([{ index: 2 }, { index: 999 }, { index: 7 }], i => i < 28);
  check('file/a-warp-for-a-petal-the-grid-does-not-have-is-dropped-not-moved',
    resolved.applied.length === 2 && resolved.dropped.length === 1
    && resolved.applied.map(p => p.index).join(',') === '2,7' && resolved.dropped[0].index === 999,
    `petals 2 and 7 applied, 999 dropped — and dropped means dropped, not index 999 mod 28`);

  const docMessy = JSON.parse(flatText);
  docMessy.instances[0].stem.bends = [{ t: 0.9, offset: [0, 0, 0] }, { t: 0.2, offset: [0, 0, 0] },
                                   { t: 4, offset: [1, 1, 1] }];
  // BY INDEX, NOT BY POSITION: `composeInstance` sorts the petal list so a file
  // is stable and diffable, so `petals[0]` is petal 2 and not the petal this
  // check then goes looking for.
  docMessy.instances[0].petals.find(p2 => p2.index === 7).bends =
    new Array(9).fill(0).map((_, i) => ({ t: i / 9, offset: [0, 0, 0] }));
  const rMessy = FL.readDoc(docMessy, FILE_OPTS);
  const mb = rMessy.doc.instances[0].stem.bends;
  check('file/bends-are-sorted-clamped-and-capped-and-each-is-told',
    rMessy.ok && mb.map(b => b.t).join(',') === '0.2,0.9,1'
    && rMessy.doc.instances[0].petals.find(p => p.index === 7).bends.length === 6
    && rMessy.notes.some(n => n.kind === 'reordered')
    && rMessy.notes.some(n => n.kind === 'clamped' && n.text.includes('outside 0..1'))
    && rMessy.notes.some(n => n.kind === 'dropped' && n.text.includes('at most 6')),
    `stem bends came back ${mb.map(b => b.t).join(',')} and the petal's nine were capped at six, `
    + 'each with its own note');

  // --- the grid's identity -------------------------------------------------
  const idA = FL.gridIdentity({ name: 'a.glb', mode: 'live', petals: 28,
    census: { u: 280, v: 812, other: 0, strips: 1092, segments: 15148 } });
  const idB = FL.gridIdentity({ name: 'b.glb', mode: 'export', petals: 40,
    census: { u: 400, v: 812, other: 0, strips: 1092, segments: 15148 } });
  const idCmp = FL.compareIdentity(idA, idB);
  check('identity/a-different-grid-is-named-field-by-field',
    idCmp.match === false && idCmp.differences.map(d => d.field).join(',') === 'name,mode,petals,u'
    && idCmp.differences[2].saved === 28 && idCmp.differences[2].current === 40,
    `"28 petals saved, 40 here" is something an artist can act on where a changed hash is `
    + `not: ${idCmp.differences.map(d => `${d.field} ${d.saved}->${d.current}`).join(', ')}`);
  check('identity/the-same-grid-matches',
    FL.compareIdentity(idA, FL.gridIdentity({ name: 'a.glb', mode: 'live', petals: 28,
      census: { u: 280, v: 812, other: 0, strips: 1092, segments: 15148 } })).match === true,
    'the census the page recounted from the file, plus its name and the export mode');

  // --- polarity, on values whose answer can be written down ----------------
  /* ON THE REAL PAGE A WRONG TRANSFER STILL DRAWS AN ENTIRELY PLAUSIBLE
     PICTURE — a plain inversion, a mis-normalised hue and a level applied in
     the wrong space all produce a black-on-white flower nobody would question.
     So the transfer is driven here, over the arithmetic itself. */
  log('\n  polarity');

  // THE SCREEN ARM IS THE SHIPPED EXPRESSION, UNCHANGED. `setScalar(brightness)`
  // is what /plot draws with, so this is the claim that the picture already
  // approved did not move — and it is an identity, at every position of the
  // control, not a comparison against a remembered number.
  let screenMoved = 0;
  for (let v = 5; v <= 100; v++) {
    const L = v / 100, rgb = PL.inkRGB('screen', L);
    if (!(rgb[0] === L && rgb[1] === L && rgb[2] === L)) screenMoved++;
  }
  check('polarity/the-screen-arm-is-the-shipped-expression-unchanged',
    screenMoved === 0,
    `inkRGB('screen', L) === [L,L,L] exactly at all 96 positions of the control`);

  /* ONE LINE LANDS AT THE SAME INK IN BOTH REGIMES. The whole reason this page
     needs no second set of defaults: the two framebuffer values a single
     fully-covered line produces sum to 255. An identity on the values this
     module computes — the GPU's own encode uses pow(x, 0.41666) against 1/2.4
     here, so the PIXEL figure is reported in part two and asserted nowhere. */
  const sums = [], pairs = [];
  for (let v = 5; v <= 100; v++) {
    const L = v / 100;
    const a = Math.round(PL.singleLinePixel('screen', L) * 255);
    const b = Math.round(PL.singleLinePixel('print', L) * 255);
    sums.push(a + b);
    if ([5, 15, 30, 55, 80, 100].includes(v)) pairs.push(`${v}%:${a}/${b}`);
  }
  check('polarity/one-line-lands-at-the-same-ink-in-both-polarities',
    sums.every(x => x === 255),
    `screen px + print px === 255 at all 96 positions — ${pairs.join(' ')}`);

  /* AND THAT IS NOT WHAT A PLAIN INVERSION GIVES, which is the mutation this
     check exists to separate itself from: inverting the LEVEL rather than the
     transmittance puts a single line 43 of 255 off at the shipped setting. */
  const naive = Math.round(srgb(1 - 0.30) * 255);
  const real = Math.round(PL.singleLinePixel('print', 0.30) * 255);
  check('polarity/the-transfer-is-not-a-plain-inversion-of-the-level',
    real === 106 && naive !== real && Math.abs(naive - real) > 20,
    `the transmittance whose sRGB encoding is 1 - sRGB(level) is ${real}; `
    + `inverting the level itself gives ${naive}, ${Math.abs(naive - real)} off`);

  /* THE CROSSINGS ARE WHERE THE TWO REGIMES GENUINELY DIFFER, and the
     difference is irreducible: additive CLIPS at the top of the byte and
     multiply approaches the ground without reaching it. Reported by the panel
     rather than tuned away, and asserted here so "they are equivalent" cannot
     quietly become true. */
  const scrLadder = [1, 2, 3, 4, 6].map(n => PL.crossingInk('screen', 0.30, n));
  const prLadder = [1, 2, 3, 4, 6].map(n => PL.crossingInk('print', 0.30, n));
  check('polarity/the-crossings-are-the-part-that-does-not-carry-across',
    scrLadder[0] === prLadder[0]
    && scrLadder[1] === 255 && scrLadder[2] === 255
    && prLadder[1] < 255 && prLadder[2] < 255 && prLadder[2] > prLadder[1],
    `at 1,2,3,4,6 lines screen reaches ${scrLadder.join(' ')} and print `
    + `${prLadder.join(' ')} — the same single line, then additive clips at two `
    + `where multiply still has range`);

  /* THE HIGHLIGHT IS A HUE AND NEVER A LEVEL, in both regimes and in the space
     each one's invariant is stated in: the brightest CHANNEL on screen, the
     strongest ABSORPTION in print. Either way its peak is the drawing's own,
     so selecting a petal cannot make it read nearer or further than it is. */
  const teal = [0.1568, 0.4620, 0.4046];       // 0x6fb7ae, linear
  const hs = PL.hueRGB('screen', teal, 0.30);
  const hp = PL.hueRGB('print', teal, 0.30);
  const peakScreen = Math.max(...hs);
  const absorbPrint = Math.max(...hp.map(c => 1 - PL.srgbEncode(c)));
  const inkAbsorb = 1 - PL.srgbEncode(PL.inkRGB('print', 0.30)[0]);
  check('polarity/the-highlight-is-a-hue-and-not-a-level-in-both',
    Math.abs(peakScreen - 0.30) < 1e-12
    && Math.abs(absorbPrint - inkAbsorb) < 1e-12
    // and it is still TEAL in print — green and blue let more through than red
    && hp[1] > hp[0] && hp[2] > hp[0],
    `screen peak channel ${peakScreen.toFixed(6)} = the level; print strongest `
    + `absorption ${absorbPrint.toFixed(6)} = a black line's ${inkAbsorb.toFixed(6)}; `
    + `print rgb ${hp.map(c => c.toFixed(3)).join(',')} still reads teal`);

  check('polarity/the-ground-and-the-fog-are-one-field',
    PL.POLARITY.screen.ground === 0x000000 && PL.POLARITY.print.ground === 0xffffff
    && PL.POLARITY.screen.blend === 'additive' && PL.POLARITY.print.blend === 'multiply'
    && PL.POLARITY.print.groundIsWhite === true,
    'one `ground` per polarity, read by the clear colour and by the fog — there is '
    + 'no second place to get "what a line fades into" wrong');

  // --- the exports, on polylines whose answer can be written down ----------
  log('\n  export');

  /* ONE PATH PER STRIP IS THE WHOLE PLOT TIME, and it is the kind of thing that
     is invisible until someone has waited three hours at a plotter: 55,188
     segments emitted one path each is fifty-five thousand pen lifts. */
  const rectMm = { x: 10, y: 20, width: 100, height: 150 };
  const whole = EX.stripToPaths([10, 20, 60, 20, 110, 170], null, rectMm, 2);
  check('export/a-whole-strip-is-exactly-one-path',
    whole.length === 1 && whole[0].length === 6
    && EX.pathData(whole[0]) === 'M0 0L100 0L200 300',
    `three points -> ${whole.length} path with ${whole[0].length / 2} points: `
    + `${EX.pathData(whole[0])}`);

  /* A STRIP IS SPLIT ONLY WHERE THE PROJECTION HAD NOTHING TO SAY, and a run of
     ONE point is not a path — `M x y` with nothing after it is a pen-down and no
     stroke, which some plotter software puts down as a dot. */
  const splitRun = EX.stripToPaths([0, 0, 10, 0, 20, 0, 30, 0, 40, 0],
                                   [1, 1, 0, 1, 1], { x: 0, y: 0 }, 1);
  const lone = EX.stripToPaths([0, 0, 10, 0, 20, 0], [1, 0, 1], { x: 0, y: 0 }, 1);
  check('export/a-strip-splits-only-at-a-gap-and-a-lone-point-is-not-a-path',
    splitRun.length === 2 && splitRun[0].length === 4 && splitRun[1].length === 4
    && lone.length === 0,
    `a five-point strip with one unplaceable point -> ${splitRun.length} paths of 2 points; `
    + `a strip whose only runs are single points -> ${lone.length} paths`);

  /* REAL MILLIMETRES. The picture plane's scale is a closed form in the camera,
     so it is checked against one — not against a number this file remembers. */
  const mmpp = EX.mmPerPixel(38, 343, 800);
  const byHand = 2 * Math.tan(38 * Math.PI / 360) * 343 / 800;
  check('export/millimetres-per-pixel-is-the-camera-in-closed-form',
    Math.abs(mmpp - byHand) < 1e-15 && Math.abs(mmpp - 0.2952611) < 1e-6
    // and it scales the way a projection does: twice the standoff, twice the mm
    && Math.abs(EX.mmPerPixel(38, 686, 800) - 2 * mmpp) < 1e-12,
    `2·tan(fov/2)·d/H = ${mmpp.toFixed(6)} mm/px at fov 38, d 343, H 800`);

  const svgR = EX.svgDocument({ paths: [[0, 0, 10, 10]], widthMm: 100, heightMm: 150,
    shape: 'rect', strokeMm: 0.36, ink: 0x000000, ground: 0xffffff, drawGround: false });
  const svgE = EX.svgDocument({ paths: [[0, 0, 10, 10]], widthMm: 100, heightMm: 150,
    shape: 'ellipse', strokeMm: 0.36, ink: 0xffffff, ground: 0x000000, drawGround: true });

  check('export/the-svg-is-dimensioned-in-real-units-at-one-unit-per-mm',
    svgR.includes('width="100mm"') && svgR.includes('height="150mm"')
    && svgR.includes('viewBox="0 0 100 150"') && svgR.includes('stroke-width="0.36"'),
    'width/height carry the unit and the viewBox carries the same numbers, so one '
    + 'user unit is one millimetre and a stroke width is a real width');

  check('export/the-boundary-is-a-real-clip-of-the-boundary-own-shape',
    svgE.includes('<clipPath id="plot-frame"><ellipse cx="50" cy="75" rx="50" ry="75"/>')
    && svgR.includes('<clipPath id="plot-frame"><rect x="0" y="0" width="100" height="150"/>')
    && svgE.includes('clip-path="url(#plot-frame)"') && svgR.includes('clip-path="url(#plot-frame)"'),
    'an ellipse frame clips to an ellipse inscribed in the very same box, and the '
    + 'rectangle clips too rather than leaning on the viewport overflow');

  /* AND THE GROUND IS INSIDE THAT CLIP. Outside it a screen-polarity ellipse
     comes out as a full black RECTANGLE with an ellipse of white lines floating
     in it — which is neither the boundary the page drew nor what the raster's
     own elliptical alpha produces. Found by rendering one, not by reading it. */
  const gi = svgE.indexOf('clip-path="url(#plot-frame)"');
  const ri = svgE.indexOf('<rect x="0" y="0" width="100" height="150" fill="#000000"/>');
  check('export/the-ground-is-inside-the-clip-with-the-ink',
    gi > 0 && ri > gi && !svgR.includes('fill="#000000"') && !svgR.includes('fill="#ffffff"'),
    'the screen ground is a rect INSIDE the clipped group; print draws no ground at '
    + 'all, because on white paper the absence of ink is the ground');

  /* ALPHA OUTSIDE THE ELLIPSE, AND ONLY THERE. Driven over a grid small enough
     to write the answer down: on a 4x4, the four corner pixels fall outside an
     inscribed ellipse and the twelve others do not. */
  const rgba = new Uint8ClampedArray(4 * 4 * 4).fill(255);
  const cleared = EX.punchEllipse(rgba, 4, 4);
  const alphaGrid = [];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) alphaGrid.push(rgba[(y * 4 + x) * 4 + 3]);
  check('export/alpha-is-punched-outside-the-ellipse-and-nowhere-else',
    cleared === 4 && alphaGrid.filter(a => a === 0).length === 4
    && alphaGrid[0] === 0 && alphaGrid[3] === 0 && alphaGrid[12] === 0 && alphaGrid[15] === 0
    && EX.punchEllipse(new Uint8ClampedArray(16 * 4).fill(255), 4, 4) === 4,
    `${cleared} of 16 pixels cleared on a 4x4, and they are the four corners — `
    + 'alpha is the recoverable way round: a ground fill cannot be taken back off');

  check('export/the-file-name-says-what-the-artefact-is',
    EX.exportName('bloom-grid-live.glb', 'print', 'ellipse', 'svg')
      === 'bloom-grid-live-print-ellipse.svg'
    && EX.exportName('', 'screen', 'rect', 'png') === 'plot-screen-rect.png',
    'two exports of one composition at two polarities are the pair anyone reviewing '
    + 'this will be holding side by side, so the name carries both');

  // =========================================================================
  // PART TWO — the page.
  log('\n--- part two: the page, measured on the rendered framebuffer ---');

  const raw = readGlb(readFileSync(path.join(ROOT, GRID)));
  const fileCensus = censusFromFile(raw.json);

  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  await ctx.route('https://cdn.jsdelivr.net/npm/three@0.161.0/**', route => {
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
    const f = path.join(ROOT, 'node_modules/three', rel);
    if (!existsSync(f)) return route.fulfill({ status: 404, body: 'nf' });
    route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8') });
  });
  await ctx.route('https://fonts.googleapis.com/**', r =>
    r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/plot`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__plot, null, { timeout: 30000 });
  const loaded = await page.evaluate(() => window.__plot.ready);

  const set = o => page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) {
      const el = document.getElementById(k);
      if (el.type === 'checkbox') el.checked = !!v; else el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, o);
  const view = (dir, margin = 1.06) => page.evaluate(([d, m]) =>
    window.__plot.setView(d, m), [dir, margin]);
  const px = () => page.evaluate(() => { window.__plot.settle(); return window.__plot.readPixels(); });
  const q = fn => page.evaluate(fn);
  // The DRAW read-out is written by the render, so force one before reading it
  // rather than sampling whatever the last frame happened to say.
  const drawTextNow = () => page.evaluate(() => {
    window.__plot.renderNow(); return window.__plot.drawText();
  });
  // Same reason: scene.fog is (re-)solved during the render against the live
  // camera, so it is read after one and not before.
  const fogNow = () => page.evaluate(() => {
    window.__plot.renderNow(); return window.__plot.fogInfo();
  });
  /* EVERY DRAW CHECK RUNS WITH THE STEM OFF. `set()` writes every one of these
     on every reset, so the ink and the segment counts below are the ones /plot
     shipped and the stem cannot be hiding inside any of them; the page's own
     default is stem ON, and the stem section further down turns it back on. */
  /* AND WITH NO PETAL PICKED AND NO WARP, for the reason the stem is off here:
     every ink figure and every segment count above the petal section is then
     the one /plot shipped, and neither the highlight's own object nor a
     deformed petal can be hiding inside one of them. The petal section further
     down picks one. */
  /* AND WITH THE FRAME OFF, for the third time and the same reason. The page
     ships a boundary ON, and it draws a teal loop into the very framebuffer
     `readPixels` reads — so every ink figure above the frame section would
     carry the boundary's own pixels inside it. Off here; the frame section
     turns it on. */
  /* AND AT THE SCREEN POLARITY, for the fourth time and the same reason. The
     page ships white ink on black, every ink figure below was measured in that
     regime, and `readPixels`'s own `ink` counts pixels ABOVE a black ground —
     a number that means nothing on white paper. The polarity section turns it
     over and checks the two against each other. */
  const DEFAULTS = { frame: 'off', frameShape: 'rect', frameRatio: '2:3', frameMargin: 6,
                     families: 'both', uDensity: 12, vDensity: 12, weight: 1.1,
                     polarity: 'screen', brightness: 30, depthDim: 55, stem: 'off',
                     stemBundle: 0.35, stemJoin: 12, stemLength: 170,
                     stemDroop: 0, stemNeck: 45, stemHandles: true,
                     petalPick: -1, petalAlong: 1, petalAcross: 1, petalHandles: true };
  const reset = async (o = {}) => { await set({ ...DEFAULTS, ...o }); await view(VIEW); };

  await reset();
  const drawn0 = await q(() => window.__plot.drawn());
  check('load/the-default-grid-draws', loaded === true && drawn0.total > 0,
    `${drawn0.total} segments from ${await q(() => window.__plot.source())}`);

  // --- the census, recounted from the file ---------------------------------
  const pageCensus = await q(() => window.__plot.census());
  const pagePetals = await q(() => window.__plot.petals());
  const same = ['u', 'v', 'other', 'strips', 'uSegments', 'vSegments', 'segments']
    .every(k => pageCensus[k] === fileCensus.census[k]);
  check('census/the-page-agrees-with-the-file',
    same && pagePetals === fileCensus.petals,
    `file: ${fileCensus.census.u} u · ${fileCensus.census.v} v · ${fileCensus.census.segments} segments`
    + ` · ${fileCensus.petals} petals   page: ${pageCensus.u} u · ${pageCensus.v} v · `
    + `${pageCensus.segments} segments · ${pagePetals} petals`);

  const assetX = await q(() => window.__plot.assetExtras());
  check('readout/the-export-mode-is-surfaced',
    !!assetX && (await q(() => window.__plot.gridText())).includes(`mode ${assetX.mode}`),
    `mode ${assetX && assetX.mode} · units ${assetX && assetX.units}`);

  // --- the two families ----------------------------------------------------
  await reset({ families: 'u' }); const uOnly = await q(() => window.__plot.drawn());
  const uPix = await px();
  await reset({ families: 'v' }); const vOnly = await q(() => window.__plot.drawn());
  const vPix = await px();
  await reset({ families: 'both' }); const bothD = await q(() => window.__plot.drawn());
  check('kind/u-only-and-v-only-are-different-line-sets',
    uOnly.u > 0 && uOnly.v === 0 && vOnly.v > 0 && vOnly.u === 0 && uOnly.u !== vOnly.v,
    `u only: ${uOnly.u} segments · v only: ${vOnly.v}`);
  // ANCHORED TO THE FILE'S OWN PER-FAMILY COUNTS, not to a sum. `u + v = both`
  // is satisfied by collapsing every strip into one family (measured: the
  // reader mutation left it green at 15148 + 0 = 15148), so the numbers each
  // side has to hit come from the .glb.
  check('kind/the-two-families-partition-the-grid',
    uOnly.u === fileCensus.census.uSegments && vOnly.v === fileCensus.census.vSegments
    && bothD.u === uOnly.u && bothD.v === vOnly.v && uOnly.u + vOnly.v === bothD.total,
    `u ${uOnly.u} + v ${vOnly.v} = ${bothD.total}, against the file's `
    + `${fileCensus.census.uSegments} + ${fileCensus.census.vSegments}`);
  check('kind/u-only-and-v-only-are-different-pictures',
    uPix.hash !== vPix.hash && uPix.ink > 1000 && vPix.ink > 1000,
    `u ink ${uPix.ink} px · v ink ${vPix.ink} px, different framebuffers`);

  // --- density -------------------------------------------------------------
  const uLadder = [], vLadder = [];
  for (const d of [12, 9, 6, 3, 1]) {
    await set({ ...DEFAULTS, uDensity: d });
    uLadder.push(await q(() => window.__plot.drawn()));
  }
  for (const d of [12, 9, 6, 3, 1]) {
    await set({ ...DEFAULTS, vDensity: d });
    vLadder.push(await q(() => window.__plot.drawn()));
  }
  // NON-INCREASING WITH REAL STEPS, NOT STRICTLY DECREASING. A stride can only
  // thin a family down to its two margins, so the sparse end of each slider has
  // dead travel whose length is a property of the FILE (10 columns bottom out
  // at stride 10; 29 rows are still thinning at 12). The range is fixed and the
  // saturation is told rather than trimmed — the same ruling `stamenSpread`
  // got — so what is asserted is the thinning, the dead travel and the fact
  // that the page says which is which, in both directions.
  check('density/the-u-slider-thins-u-and-leaves-v-alone',
    uLadder.every((r, i) => i === 0 || r.u <= uLadder[i - 1].u)
    && new Set(uLadder.map(r => r.u)).size >= 4
    && uLadder.every(r => r.v === uLadder[0].v),
    `u segments ${uLadder.map(r => r.u).join(' >= ')} · v held at ${uLadder[0].v}`);
  check('density/the-v-slider-thins-v-and-leaves-u-alone',
    vLadder.every((r, i) => i === 0 || r.v <= vLadder[i - 1].v)
    && new Set(vLadder.map(r => r.v)).size >= 4
    && vLadder.every(r => r.u === vLadder[0].u),
    `v segments ${vLadder.map(r => r.v).join(' >= ')} · u held at ${vLadder[0].u}`);

  // The dead travel, in both directions: the page must mark the positions where
  // dragging further left changes nothing, and must NOT mark the ones where it
  // still thins.
  const sat = await page.evaluate(() => {
    const r = { u: [], v: [] };
    for (const k of ['u', 'v']) {
      for (let d = 1; d <= 12; d++) {
        r[k].push({ d, key: window.__plot.selectionKey(k, d),
                    bottom: window.__plot.sparsestReached(k, d) });
      }
    }
    return r;
  });
  // Against the SELECTION, not against a line count: two strides can keep the
  // same number of lines and different ones (stride 3 keeps {0,3,6,9} of ten
  // columns, stride 4 keeps {0,4,8,9}), and a count test called eight of the u
  // slider's twelve positions dead where four are.
  const honest = ['u', 'v'].every(k => sat[k].every(row =>
    row.bottom === (row.d > 1 && sat[k][row.d - 2].key === row.key)));
  const uDead = sat.u.filter(r => r.bottom).map(r => r.d);
  const vDead = sat.v.filter(r => r.bottom).map(r => r.d);
  // Read the u ROW of the read-out, not the whole panel: the v row's answer is
  // the v family's business and an empty family is legitimately at its sparsest.
  const uRow = async () => (await drawTextNow())
    .split('\n').find(l => l.startsWith('u ')) || '';
  // The named range must be the RUN the per-step answers imply, for BOTH
  // families — not this file's particular numbers. A family the page has no
  // strips for genuinely IS dead at every position, and hard-coding "v has
  // none" made the reader mutation, which empties v, look like a dead-travel
  // defect.
  const runFrom = k => { let d = 1; while (d < 12 && sat[k][d].bottom) d++; return d; };
  const rng = await q(() => window.__plot.deadRange());
  const rangeIsTheRun = ['u', 'v'].every(k => rng[k] === runFrom(k));
  await set({ ...DEFAULTS, uDensity: rng.u });
  const inIt = await uRow();
  await set({ ...DEFAULTS, uDensity: 12 });
  const outOfIt = await uRow();
  const namesIt = rng.u > 1
    ? inIt.includes(`density 1–${rng.u} all draw the same lines`) && inIt.includes('you are in it')
      && outOfIt.includes(`density 1–${rng.u} all draw the same lines`)
      && !outOfIt.includes('you are in it')
    : !inIt.includes('draw the same lines') && !outOfIt.includes('draw the same lines');
  check('density/the-dead-travel-at-the-sparse-end-is-told',
    honest && rangeIsTheRun && namesIt,
    `dead steps — u at density ${uDead.length ? uDead.join(',') : 'none'} `
    + `(10 columns per petal), v at ${vDead.length ? vDead.join(',') : 'none'} (29 rows). `
    + `The read-out names the RANGE — density 1–${rng.u} on u, `
    + `${rng.v > 1 ? `1–${rng.v}` : 'none'} on v — at every position, and says when the `
    + 'slider is inside it.');

  // THE RANGE IS TOLD ON THE CONTROL TOO — `stamenSpread`'s convention, applied
  // to a slider whose dead travel is at the left end: the span is hatched with
  // a tick at its right edge, and the range itself is NOT narrowed.
  const uMark = await q(() => window.__plot.trackMark('u'));
  const vMark = await q(() => window.__plot.trackMark('v'));
  const bounds = await q(() => {
    const el = document.getElementById('uDensity');
    return { min: +el.min, max: +el.max, step: +el.step };
  });
  // Both directions, from the range the page itself derived: hatched exactly
  // when there is dead travel, and to exactly its extent.
  const markOK = [['u', uMark], ['v', vMark]].every(([k, m]) => (rng[k] > 1
    ? m.hatched && m.upTo === rng[k] && Math.abs(+m.fraction - (rng[k] - 1) / 11) < 1e-3
    : !m.hatched && m.upTo === null && m.fraction === null));
  check('density/the-dead-range-is-hatched-on-the-track-and-the-range-is-not-narrowed',
    markOK && bounds.min === 1 && bounds.max === 12 && bounds.step === 1,
    `u track hatched to density ${uMark.upTo} (${uMark.fraction} of the travel), `
    + `v ${vMark.hatched ? `hatched to ${vMark.upTo}` : 'not hatched'}; the slider is still `
    + `${bounds.min}..${bounds.max} step ${bounds.step} — the range is told, not narrowed`);

  await reset({ families: 'u', depthDim: 0 });
  const inkDense = (await px()).ink;
  await set({ ...DEFAULTS, families: 'u', depthDim: 0, uDensity: 3 });
  const inkSparse = (await px()).ink;
  check('density/thinning-the-grid-thins-the-picture', inkSparse < inkDense * 0.9,
    `${inkDense} ink px at every line, ${inkSparse} at every 10th`);
  // NAMING THE STRIDE IS NOT ENOUGH: with the stride ignored the panel still
  // printed "every 10th" beside "280 of 280 lines" and this check stayed green
  // (measured). It now has to agree with the drawn state and show a thinned one.
  const thinnedRow = (await drawTextNow()).split('\n')[0];
  const thinnedDrawn = await q(() => window.__plot.drawn());
  const thinnedCensus = await q(() => window.__plot.census());
  check('readout/the-draw-panel-names-the-stride',
    thinnedRow.includes('every 10th')
    && thinnedRow.includes(`${thinnedDrawn.uLines} of ${thinnedCensus.u} lines`)
    && thinnedRow.includes(`${thinnedDrawn.u} segments`)
    && thinnedDrawn.uLines < thinnedCensus.u,
    thinnedRow);

  // --- additive blending ---------------------------------------------------
  const mat = await q(() => window.__plot.materialInfo());
  check('blend/the-material-is-additive', mat.additive === true && mat.depthTest === false,
    `blending ${mat.blending}, depthTest ${mat.depthTest}`);

  // THE CALIBRATION. With tone mapping off and the colour set in linear space,
  // a fully-covered single line is exactly sRGB(brightness); coverage and the
  // depth dim can only take it lower. Anything above it is accumulation.
  const blendRows = [];
  for (const b of [25, 40]) {
    await reset({ families: 'both', depthDim: 0, brightness: b });
    const p = await px();
    const ceil = Math.round(srgb(b / 100) * 255);
    let above = 0;
    for (let i = ceil + 6; i < 256; i++) above += p.hist[i];
    blendRows.push({ b, ceil, max: p.max, above, ink: p.ink });
  }
  check('blend/crossings-exceed-a-single-line',
    blendRows.every(r => r.max > r.ceil + 6 && r.above > 200),
    blendRows.map(r => `brightness ${r.b}%: one line tops out at ${r.ceil}/255, `
      + `the frame reaches ${r.max} with ${r.above} px above it`).join(' | '));

  // --- weight --------------------------------------------------------------
  await reset({ families: 'u', depthDim: 0, weight: 0.6 });
  const thin = await px(); const thinD = await q(() => window.__plot.drawn());
  await set({ ...DEFAULTS, families: 'u', depthDim: 0, weight: 4 });
  const fat = await px(); const fatD = await q(() => window.__plot.drawn());
  check('weight/changes-the-ink-and-not-the-lines',
    fat.ink > thin.ink * 1.5 && fatD.total === thinD.total
    && (await q(() => window.__plot.materialInfo())).linewidth === 4,
    `${thinD.total} segments at both ends; ink ${thin.ink} px at 0.6 px -> ${fat.ink} px at 4.0 px`);

  // --- the depth dim, on the live camera -----------------------------------
  await reset({ depthDim: 0 });
  const noDim = await px();
  const fogOff = await fogNow();
  const textOff = await drawTextNow();
  await set({ ...DEFAULTS, depthDim: 55 });
  const fogOn = await fogNow();
  const textOn = await drawTextNow();
  // BOTH DIRECTIONS. "0 is off" alone is satisfied by a dim that is never
  // applied at any setting — measured: that mutation left the one-sided form
  // green.
  check('dim/zero-is-off-and-the-read-out-says-so',
    fogOff === null && textOff.includes('depth dim off')
    && fogOn !== null && textOn.includes('depth dim 55%')
    // "ink" and not "brightness": the same fade is an amount of light on black
    // and an amount of ink on white, and the line NAMES the ground it fades
    // into — which the polarity section below checks turns over with it.
    && textOn.includes('45% of its ink')
    && textOn.includes('fading into the black'),
    'null and "off" at 0; a fog and "the farthest line draws at 45% of its ink, '
    + 'fading into the black" at 55');

  const dimRows = [];
  for (const d of [30, 60, 90]) {
    await set({ ...DEFAULTS, depthDim: d });
    const p = await px();
    const fog = await fogNow();
    const range = await q(() => window.__plot.depthRange());
    dimRows.push({ d, sum: p.sum, fog, range });
  }
  check('dim/the-far-side-fades',
    dimRows.every((r, i) => r.sum < (i === 0 ? noDim.sum : dimRows[i - 1].sum)),
    `total ink ${noDim.sum} off -> ${dimRows.map(r => r.sum).join(' > ')} at 30/60/90%`);
  const solved = dimRows.every(r => r.fog && r.range
    && Math.abs(r.fog.near - r.range.near) < 1e-3
    && Math.abs(fogFactor(r.fog.near, r.fog.far, r.range.far) - r.d / 100) < 1e-6);
  check('dim/the-fog-is-solved-on-the-live-camera', solved,
    dimRows.map(r => `${r.d}%: near ${r.fog ? r.fog.near.toFixed(2) : '—'} vs model `
      + `${r.range.near.toFixed(2)}, delivered `
      + `${r.fog ? (fogFactor(r.fog.near, r.fog.far, r.range.far) * 100).toFixed(3) : '—'}%`).join(' | '));

  // --- the Z-up correction -------------------------------------------------
  await reset();
  const att = await q(() => window.__plot.attachmentsWorld());
  const ys = att.map(a => a[1]);
  const spread = a => Math.max(...a) - Math.min(...a);
  check('zup/the-attachment-ring-is-flat',
    att.length > 4 && spread(ys) < 1e-4
    && spread(att.map(a => a[0])) > 1 && spread(att.map(a => a[2])) > 1,
    `${att.length} attachments: y spread ${spread(ys).toExponential(1)}, `
    + `x ${spread(att.map(a => a[0])).toFixed(2)}, z ${spread(att.map(a => a[2])).toFixed(2)}`);

  // --- orbit ---------------------------------------------------------------
  // The drag starts in the GAP between the two fixed columns, measured from
  // their real bounding boxes — a pointerdown that lands on a panel never
  // reaches the canvas and the orbit under test never happens.
  const gap = await q(() => {
    const l = document.getElementById('plot-left').getBoundingClientRect();
    const r = document.getElementById('plot-side').getBoundingClientRect();
    return { x: (l.right + r.left) / 2, y: window.innerHeight * 0.72,
             left: l.right, right: r.left };
  });
  /* A POINT ON BARE CANVAS, ASKED OF THE PAGE RATHER THAN GUESSED. /print's own
     measured lesson — a wheel or a pointerdown that lands on a control column
     never reaches the canvas, and the check then reports on the panel it hit —
     arriving here the moment a panel grew. The zoom check's fixed "30% of the
     width, half the height" point sat on bare canvas for two sessions and then
     sat on the GRID read-out, because the COMPOSITION panel made the left
     column 180 px taller: four wheel events moved the camera 0.0 units and
     scrolled a paragraph instead. A fraction of the viewport is not a place. */
  const barePoint = async (fx, fy) => {
    const p2 = await page.evaluate(([ax, ay]) => {
      const c = document.getElementById('plot-canvas').getBoundingClientRect();
      for (const gx of [ax, 0.5, 0.55, 0.45, 0.6, 0.42]) {
        for (const gy of [ay, 0.75, 0.5, 0.85, 0.25]) {
          const x = c.x + c.width * gx, y = c.y + c.height * gy;
          const el = document.elementFromPoint(x, y);
          if (el && el.id === 'plot-canvas') return { x, y, fx: gx, fy: gy };
        }
      }
      return null;
    }, [fx, fy]);
    if (!p2) throw new Error('no point on this page is bare canvas — every candidate '
      + 'is under a control column, so nothing here can be driven by a pointer');
    return p2;
  };

  const camBefore = await q(() => window.__plot.cameraInfo());
  const pixBefore = await px();
  await page.mouse.move(gap.x, gap.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(gap.x - i * 9, gap.y - i * 4);
  await page.mouse.up();
  const camAfter = await q(() => { window.__plot.settle(); return window.__plot.cameraInfo(); });
  const pixAfter = await px();
  const moved = Math.hypot(...camAfter.position.map((v, i) => v - camBefore.position[i]));
  check('orbit/a-drag-changes-the-projection',
    moved > camBefore.distance * 0.05 && pixAfter.hash !== pixBefore.hash,
    `camera moved ${moved.toFixed(1)} of a ${camBefore.distance.toFixed(1)} standoff, `
    + `drag started at x=${gap.x.toFixed(0)} (panels end ${gap.left.toFixed(0)} / `
    + `${gap.right.toFixed(0)}), framebuffer changed`);

  // --- a file that is not a grid -------------------------------------------
  const drop = async (bytes, name) => {
    await page.evaluate(async ([b64, n]) => {
      const bin = atob(b64), arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const f = new File([arr], n, { type: 'model/gltf-binary' });
      const dt = new DataTransfer(); dt.items.add(f);
      document.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 350));
    }, [Buffer.from(bytes).toString('base64'), name]);
  };

  await reset();
  const beforeBad = await q(() => window.__plot.drawn());
  await drop(meshOnlyGlb(), 'a-solid.glb');
  const meshErr = await q(() => window.__plot.error());
  const afterMesh = await q(() => window.__plot.drawn());
  check('mesh/a-mesh-gltf-fails-visibly', meshErr.length > 0
    && (await q(() => window.__plot.gridText())).includes(meshErr.slice(0, 40)),
    meshErr || '(no error reported)');
  check('mesh/the-message-names-what-it-found',
    /LINE_STRIP/.test(meshErr) && /triangle/.test(meshErr) && /mesh glTF/.test(meshErr),
    meshErr);
  check('mesh/the-grid-on-screen-survives',
    afterMesh.total === beforeBad.total && (await q(() => window.__plot.source())) === 'bloom-grid-live.glb',
    `${afterMesh.total} segments still drawn, source still `
    + `${await q(() => window.__plot.source())}`);

  // Its own baseline, taken after whatever the previous drop did: chaining it
  // off the mesh check's baseline made it a second casualty of that mutation
  // rather than a witness of its own.
  const beforeGarbage = await q(() => window.__plot.drawn());
  const sourceBefore = await q(() => window.__plot.source());
  await drop(Buffer.from('this is not a glb, it is a sentence about one'), 'notes.glb');
  check('bytes/garbage-is-reported-and-not-thrown',
    (await q(() => window.__plot.error())).length > 0
    && (await q(() => window.__plot.drawn())).total === beforeGarbage.total
    && (await q(() => window.__plot.source())) === sourceBefore
    && errs.length === 0,
    (await q(() => window.__plot.error())).slice(0, 90));

  // --- swapping in a real second grid ---------------------------------------
  const trimmed = trimmedGridGlb(raw.json, raw.bin, 4);
  await drop(trimmed, 'bloom-grid-4petals.glb');
  const swapped = await q(() => ({ c: window.__plot.census(), s: window.__plot.source(),
                                   p: window.__plot.petals(), e: window.__plot.error() }));
  const trimmedCensus = censusFromFile(readGlb(trimmed).json);
  check('swap/a-dropped-grid-replaces-the-one-on-screen',
    swapped.s === 'bloom-grid-4petals.glb' && swapped.p === 4 && swapped.e === ''
    && swapped.c.segments === trimmedCensus.census.segments
    && swapped.c.segments < fileCensus.census.segments,
    `${swapped.p} petals, ${swapped.c.segments} segments (the file says `
    + `${trimmedCensus.census.segments}); was ${fileCensus.census.segments}`);

  const tmpFile = path.join(os.tmpdir(), 'bloom-grid-live.glb');
  writeFileSync(tmpFile, readFileSync(path.join(ROOT, GRID)));
  await page.setInputFiles('#gridFile', tmpFile);
  await page.waitForFunction(() => window.__plot.petals() === 28, null, { timeout: 15000 })
    .catch(() => {});
  rmSync(tmpFile, { force: true });
  check('swap/the-file-input-loads-a-grid-too',
    (await q(() => window.__plot.petals())) === 28
    && (await q(() => window.__plot.census())).segments === fileCensus.census.segments
    && (await q(() => window.__plot.source())) === 'bloom-grid-live.glb',
    `back to ${await q(() => window.__plot.petals())} petals via the file input`);

  // =========================================================================
  // THE STEM, ON THE PAGE. Every draw check above ran with the stem OFF — the
  // gate's DEFAULTS say so — so those numbers are the ones /plot shipped and
  // nothing the stem does can hide inside them. These turn it on.
  const STEM_ON = { ...DEFAULTS, stem: 'on' };
  // RE-FRAME AFTER TURNING IT ON. A control never moves the camera — that is
  // the page's rule, not an oversight — so a stem switched on under a frame fitted
  // to the head alone hangs off the bottom of the viewport, and a handle
  // projected there is at y = 1327 on an 800 px page. Measured: the first run of
  // this section dragged nothing at all and reported it as a bend that does not
  // move the stem.
  const stemOn = async (o = {}) => { await set({ ...STEM_ON, ...o }); await view(VIEW); };
  const restBends = () => page.evaluate(() => document.getElementById('bendReset').click());
  const dist3 = (a, b, i) => Math.hypot(a[i * 3] - b[i * 3], a[i * 3 + 1] - b[i * 3 + 1],
                                        a[i * 3 + 2] - b[i * 3 + 2]);
  const worstOf = (a, b) => { let w = 0;
    for (let i = 0; i * 3 < a.length; i++) w = Math.max(w, dist3(a, b, i)); return w; };

  // THE STEM IS THE U-LINES CONTINUED, so the pairing is exact at every
  // density and there is never a continuation of a line that is not drawn.
  const stemLadder = [];
  for (const d of [12, 6, 1]) {
    await stemOn({ uDensity: d });
    const si = await q(() => window.__plot.stemInfo());
    const dr = await q(() => window.__plot.drawn());
    stemLadder.push({ d, lines: si.lines, uLines: dr.uLines, seg: si.segments,
                      rows: si.rows,      // rows = STATIONS, so n-1 segments
                      ringFeet: si.ring ? si.ring.count : -1 });
  }
  // AND THE RING IS READ OFF EVERY U-LINE FOOT IN THE FILE, not off the ones a
  // density happens to keep: a stem that moved sideways when the slider thinned
  // the feet it averages would make the density control decide where the flower
  // hangs from. That is the same claim as the count, so it lives with it —
  // anchored to the FILE, one aisle away from the checks that are about shape.
  check('stem/every-drawn-u-line-is-continued-and-no-other',
    stemLadder.every(r => r.lines === r.uLines && r.seg === r.lines * (r.rows - 1))
    && stemLadder[0].lines === fileCensus.census.u
    && stemLadder.every(r => r.ringFeet === fileCensus.census.u)
    && new Set(stemLadder.map(r => r.lines)).size === 3,
    stemLadder.map(r => `density ${r.d}: ${r.lines} lines = ${r.uLines} u-lines`).join(' · ')
    + ` · the ring holds all ${stemLadder[0].ringFeet} feet at every density`);

  await stemOn({ families: 'v' });
  const vStem = await q(() => window.__plot.stemInfo());
  const vStemText = await q(() => window.__plot.stemText());
  await stemOn({ families: 'u' });
  const uStem = await q(() => window.__plot.stemInfo());
  check('stem/no-u-lines-means-no-stem',
    vStem.drawn === false && vStem.segments === 0 && vStem.lines === 0
    && /no stem drawn/.test(vStemText) && uStem.segments > 0,
    `v only: ${vStem.segments} stem segments, and the panel says so · u only: ${uStem.segments}`);

  // THE STEM IS INK, NOT A RELABELLING: the grid's own segment count is
  // identical with it on and off, and the framebuffer is not.
  // AT ONE CAMERA. `stemOn` re-frames, and a frame that has to hold a 170 mm
  // stem shrinks the head — measured: comparing across the two framings read
  // 95,314 ink px without the stem against 11,569 with it, which says nothing
  // about the stem and everything about the zoom. So the fit happens once, with
  // the stem on, and only the stem is switched.
  await stemOn();
  const stemPix = await px(); const withStemDrawn = await q(() => window.__plot.drawn());
  await set({ ...STEM_ON, stem: 'off' });
  const noStemPix = await px(); const noStemDrawn = await q(() => window.__plot.drawn());
  check('stem/the-stem-is-drawn-and-adds-ink',
    withStemDrawn.total === noStemDrawn.total && withStemDrawn.stem > 0
    && stemPix.ink > noStemPix.ink && stemPix.hash !== noStemPix.hash,
    `grid held at ${noStemDrawn.total} segments; ink ${noStemPix.ink} -> ${stemPix.ink} px `
    + `with ${withStemDrawn.stem} stem segments`);

  // Written down against the controls: the continuation starts AT the foot and
  // descends to the root, one station at a time.
  await stemOn({ stemDroop: 0, stemLength: 170 });
  await restBends();
  const line0 = await q(() => window.__plot.stemLine(0));
  const foot0 = (await q(() => window.__plot.headFeet()))[0];
  const nPts = line0.length / 3;
  let descends = true;
  for (let i = 1; i < nPts; i++) if (!(line0[i * 3 + 2] < line0[(i - 1) * 3 + 2])) descends = false;
  // AGAINST THE LINE'S OWN FOOT, not the ring's centroid z. The law is
  // `foot[2] - s` per line, and the two coincide only when every foot shares
  // one z — which is true of this grid and is not a property of the law.
  check('stem/the-continuation-runs-from-the-foot-to-the-root',
    line0[0] === foot0[0] && line0[1] === foot0[1] && line0[2] === foot0[2] && descends
    && Math.abs(line0[(nPts - 1) * 3 + 2] - (foot0[2] - 170)) < 1e-3,
    `starts on the foot, ${nPts} stations strictly descending, root at z `
    + `${line0[(nPts - 1) * 3 + 2].toFixed(3)} against its foot's ${foot0[2].toFixed(3)} − 170`);

  // THE SEAM, MEASURED ON THE PAGE, at a droop and with the bends at rest: the
  // stem's own top point against the head's own answer for the same foot, line
  // for line. Asserted at ZERO, because both boundary values are exact.
  await stemOn({ stemDroop: 40 });
  await restBends();
  const sFeet = await q(() => window.__plot.stemFeet());
  const hFeet = await q(() => window.__plot.headFeet());
  let seamWorst = 0;
  for (let i = 0; i < Math.min(sFeet.length, hFeet.length); i++) {
    seamWorst = Math.max(seamWorst, Math.hypot(sFeet[i][0] - hFeet[i][0],
      sFeet[i][1] - hFeet[i][1], sFeet[i][2] - hFeet[i][2]));
  }
  // THE PAIRING AND THE DISTANCE, never how many u-lines the file holds — that
  // is the count check's job, one aisle up, and folding it in here made this
  // report on the reader instead of on the seam.
  check('stem/the-seam-is-zero-on-every-drawn-line',
    sFeet.length === hFeet.length && sFeet.length > 0 && seamWorst === 0,
    `${sFeet.length} lines paired, worst gap ${seamWorst} mm at a 40° droop`);

  // DROOP IS NOT A RIGID ROTATION. The head turns fully, an upper station of
  // the stem turns with it, and the root — past the neck — is untouched to the
  // bit. A rigid rotation moves all three.
  await stemOn({ stemDroop: 0, stemNeck: 45 });
  await restBends();
  const flatLine = await q(() => window.__plot.stemLine(0));
  const flatFeet = await q(() => window.__plot.headFeet());
  await stemOn({ stemDroop: 40, stemNeck: 45 });
  const bentLine = await q(() => window.__plot.stemLine(0));
  const bentFeet = await q(() => window.__plot.headFeet());
  const rootMoved = dist3(flatLine, bentLine, nPts - 1);
  const headMoved = Math.hypot(flatFeet[0][0] - bentFeet[0][0],
    flatFeet[0][1] - bentFeet[0][1], flatFeet[0][2] - bentFeet[0][2]);
  check('stem/the-droop-bends-the-stem-rather-than-turning-it',
    headMoved > 1 && worstOf(flatLine, bentLine) > 5 && rootMoved === 0,
    `head foot moved ${headMoved.toFixed(2)} mm, the stem up to `
    + `${worstOf(flatLine, bentLine).toFixed(2)} mm, the root ${rootMoved} mm`);

  /* THE DROOP REACHES EVERY FAMILY, NOT JUST THE ONE THE STEM IS MADE OF. A
     v-line's row 0 sits on the same ring as the u-lines' feet, so a head
     transform that reached only the u family would tear the grid apart at the
     junction — and every other instrument here is looking at a u-line foot, so
     none of them would see it. Measured with the u family SWITCHED OFF, at one
     camera: the fit happens at droop 0 and only the droop is changed after it,
     because re-framing would move the picture for a reason that has nothing to
     do with the head turning. */
  /* AND WITH THE DEPTH DIM OFF. The fog is solved against what the drawing
     OCCUPIES, and that walker rotates every strip by the droop whatever the
     head transform did with it — so under the mutation the v-only frame changed
     because the FADE moved, not because the lines turned, and this check passed
     for the wrong reason at an identical ink count of 58,295 px. */
  await stemOn({ families: 'v', stemDroop: 0, depthDim: 0 });
  // SETTLED BEFORE THE FIRST CAPTURE, not just inside each one. `stemOn`
  // re-fits the camera, and a fit applies whatever damping residue the previous
  // section left — so the first frame can be caught mid-drift while the third,
  // taken later, is at rest, and the round trip fails on the camera rather than
  // on the droop. Measured: exactly that, once.
  await q(() => window.__plot.settle());
  const vFlat = await px();
  await set({ ...STEM_ON, families: 'v', stemDroop: 40, depthDim: 0 });
  const vBent = await px();
  await set({ ...STEM_ON, families: 'v', stemDroop: 0, depthDim: 0 });
  const vBack = await px();
  /* THE RETURN IS COMPARED BY INK AND NOT BY HASH, and asking for the bit was
     wrong twice over. Damping never reaches exactly zero: `settle()` stops when
     `update()` reports the movement is below EPS, and every later `settle()`
     still applies one more sub-EPS step — so three captures at the "same"
     camera creep, and the third came back at 58,294 px against 58,295 with a
     different hash. That is /print's own measured lesson ("the camera did not
     move" is not observable here) arriving in a different disguise. The
     INEQUALITY is safe — a one-pixel drift can only help it — and what carries
     the claim is the SIZE of the change: 14,000 px of ink move when the v
     family turns, and exactly 0 when it does not. */
  check('stem/the-droop-reaches-every-family',
    vFlat.hash !== vBent.hash && Math.abs(vFlat.ink - vBent.ink) > 1000
    && Math.abs(vBack.ink - vFlat.ink) <= 8 && vFlat.ink > 1000,
    `with u switched off, the v family's framebuffer moves under the droop `
    + `(${vFlat.ink} -> ${vBent.ink} ink px, a change of `
    + `${Math.abs(vFlat.ink - vBent.ink)}) and comes back to ${vBack.ink}`);

  // =========================================================================
  // BEND POINTS — driven with a REAL pointer drag on a handle found through the
  // page's own projection, never by writing an offset in.
  await stemOn({ stemDroop: 0 });
  await restBends();
  await q(() => window.__plot.settle());
  const preLine = await q(() => window.__plot.stemLine(0));
  const preFeet = await q(() => window.__plot.headFeet());
  const preJoin = await q(() => window.__plot.stemFeet());
  const preCam = await q(() => window.__plot.cameraInfo());
  const grab = await q(() => window.__plot.handleScreenPos(1));
  const visible1 = await q(() => window.__plot.handleVisible(1));
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await page.mouse.move(grab.x + 120, grab.y - 30, { steps: 6 });
  const landed = await q(() => window.__plot.handleScreenPos(1));
  const midCam = await q(() => window.__plot.cameraInfo());
  await page.mouse.up();
  const postLine = await q(() => window.__plot.stemLine(0));
  const postFeet = await q(() => window.__plot.headFeet());
  const postJoin = await q(() => window.__plot.stemFeet());
  check('bend/dragging-a-handle-moves-the-stem',
    visible1 === true && worstOf(preLine, postLine) > 10,
    `handle 1 dragged 120 px; the stem moved up to ${worstOf(preLine, postLine).toFixed(2)} mm`);
  /* MEASURED AT THE JOIN, NOT ON THE HEAD'S OWN VERTICES. `headTransform` does
     not take the warp at all, so the head's points could not move under a bend
     however broken the gate was — measured: the ungated mutation left this
     check green at 0 mm. What the gate actually protects is the point where the
     head hangs, which is the STEM's own s = 0 station, and there the ungated
     bend arrives through the gaussian's tail: tiny (the handle is three sigma
     up the stem) and not zero, which is why the bar is exactly zero and not a
     tolerance. Both are compared foot by foot: a checksum would not do, because
     the ring is a rosette about the axis and a pull that dragged it sideways
     would leave a coordinate sum almost unchanged. */
  const worstFoot = (a, b) => {
    let w = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      w = Math.max(w, Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1], a[i][2] - b[i][2]));
    }
    return w;
  };
  const headWorst = worstFoot(preFeet, postFeet);
  const joinWorst = worstFoot(preJoin, postJoin);
  check('bend/dragging-a-handle-leaves-the-head-alone',
    preFeet.length === postFeet.length && preJoin.length === postJoin.length
    && preJoin.length > 0 && headWorst === 0 && joinWorst === 0,
    `${preJoin.length} joins and ${preFeet.length} feet, worst movement `
    + `${joinWorst} mm at the join and ${headWorst} mm on the head — the funnel gate holds`);
  check('bend/the-handle-lands-under-the-pointer',
    Math.abs(landed.x - (grab.x + 120)) < 3 && Math.abs(landed.y - (grab.y - 30)) < 3,
    `asked (${(grab.x + 120).toFixed(1)}, ${(grab.y - 30).toFixed(1)}), landed `
    + `(${landed.x.toFixed(1)}, ${landed.y.toFixed(1)})`);
  /* NOT AN EQUALITY. OrbitControls runs with damping, whose residue never
     reaches exactly zero, so "the camera did not move" is not observable here —
     the same measured fact /print's scaffold gate records. The bar is set where
     only a real orbit can clear it: a 120 px drag on this standoff swings the
     camera by tens of units, and a settled page drifts by less than a
     thousandth. */
  const camDrift = Math.hypot(...midCam.position.map((v, i) => v - preCam.position[i]));
  check('bend/a-handle-drag-does-not-orbit-the-camera',
    camDrift < 0.5,
    `the camera moved ${camDrift.toExponential(2)} of a ${preCam.distance.toFixed(1)} `
    + 'standoff while a handle was held');

  // THE ROOT IS A POINT LIKE ANY OTHER — the last handle, dragged, moves the
  // stem's last station. Nothing else in the file can see a locked root.
  await restBends();
  const rootBefore = await q(() => window.__plot.stemLine(0));
  const nb = await q(() => window.__plot.bends());
  const rootGrab = await page.evaluate(k => window.__plot.handleScreenPos(k), nb.length - 1);
  await page.mouse.move(rootGrab.x, rootGrab.y);
  await page.mouse.down();
  await page.mouse.move(rootGrab.x - 110, rootGrab.y + 10, { steps: 6 });
  await page.mouse.up();
  const rootAfter = await q(() => window.__plot.stemLine(0));
  check('bend/the-root-is-a-point-like-any-other',
    nb[nb.length - 1].t === 1 && dist3(rootBefore, rootAfter, nPts - 1) > 10,
    `the last bend point sits at t = 1 and its drag moved the root `
    + `${dist3(rootBefore, rootAfter, nPts - 1).toFixed(2)} mm`);

  await restBends();
  const restedLine = await q(() => window.__plot.stemLine(0));
  check('bend/reset-returns-every-point-to-rest',
    worstOf(rootBefore, restedLine) === 0
    && (await q(() => window.__plot.bends())).every(b => b.offset.every(v => v === 0))
    && (await q(() => window.__plot.stemInfo())).rest === true,
    'the stem is identical to the bit to what it was before the drag');

  // ADD SUBDIVIDES THE LARGEST GAP AND REMOVE KEEPS THE ENDS — the page's own
  // buttons, against the law the module states.
  const bendsBefore = await q(() => window.__plot.bends());
  await page.evaluate(() => document.getElementById('bendAdd').click());
  const bendsAdded = await q(() => window.__plot.bends());
  await page.evaluate(() => document.getElementById('bendRemove').click());
  const bendsBack = await q(() => window.__plot.bends());
  const countText = await page.evaluate(() => document.getElementById('bendCount').textContent);
  const handlesBack = await q(() => window.__plot.handleCount());
  check('bend/add-and-remove-change-the-set',
    bendsBefore.length === 3 && bendsAdded.length === 4 && bendsBack.length === 3
    && Math.abs(bendsAdded[0].t - 1 / 6) < 1e-9 && handlesBack === 3
    && bendsBack[bendsBack.length - 1].t === 1 && countText === '3',
    `3 -> 4 (new point at t = ${bendsAdded[0].t.toFixed(4)}, the midpoint of the widest gap)`
    + ' -> 3, with the root kept');

  // =========================================================================
  // ZOOM. The framebuffer is sampled with a SCREENSHOT and never with
  // readPixels(), because readPixels forces a render — which is exactly the
  // thing the defect hid behind.
  await stemOn();
  await page.waitForTimeout(1200);
  const canvasBox = await barePoint(0.30, 0.5);
  const CLIP = { x: 330, y: 60, width: 420, height: 700 };
  const hashOf = buf => { let h = 2166136261;
    for (let i = 0; i < buf.length; i++) h = (Math.imul(h ^ buf[i], 16777619)) >>> 0; return h; };
  /* DRIVEN FRAMES, NOT WALL-CLOCK. Headless Chromium's rAF is driven by the
     compositor, which idles when nothing is dirty — so 1.5 s of doing nothing
     produced 2 frames under a page that renders EVERY tick, which is the same
     number a page that skips them correctly produces, and the always-render
     mutant sailed through. Scheduling rAF from the page forces the frames to
     happen, and the two answers separate completely: 0 against ~60. */
  const driveFrames = n => page.evaluate(n => new Promise(res => {
    let i = 0;
    const tick = () => (++i < n ? requestAnimationFrame(tick) : res(i));
    requestAnimationFrame(tick);
  }), n);
  const DRIVEN = 60;
  // SETTLED AT THE MOMENT THE WINDOW OPENS, not a second and a bit before it:
  // the orbit mutation leaves the camera easing, and a settle that happened
  // earlier let 7 of 60 driven frames land on residue that was real motion.
  await q(() => window.__plot.settle());
  const idleBefore = await q(() => window.__plot.renderCount());
  const driven = await driveFrames(DRIVEN);
  const idleAfter = await q(() => window.__plot.renderCount());
  const wheelFrames = [], wheelDist = [];
  for (let i = 0; i < 4; i++) {
    await page.mouse.move(canvasBox.x, canvasBox.y);
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(320);
    wheelFrames.push(hashOf(await page.screenshot({ clip: CLIP })));
    wheelDist.push(await q(() => window.__plot.cameraInfo().distance));
  }
  const afterWheel = await q(() => window.__plot.renderCount());
  check('zoom/a-wheel-event-repaints',
    new Set(wheelFrames).size === wheelFrames.length
    && wheelDist.every((d, i) => i === 0 || d < wheelDist[i - 1])
    && afterWheel - idleAfter >= 1,
    `${new Set(wheelFrames).size} distinct frames from ${wheelFrames.length} wheel events at `
    + `(${canvasBox.x.toFixed(0)}, ${canvasBox.y.toFixed(0)}) — bare canvas, asked of the page — `
    + `camera ${wheelDist.map(d => d.toFixed(1)).join(' -> ')}, `
    + `${afterWheel - idleAfter} frames painted`);
  /* THE IDLE HALF ALONE. It used to also require the wheel to paint, which is
     the other check's job — so removing the wheel fix reddened both and the
     pair stopped being a biconditional over two independent properties. */
  check('zoom/an-idle-frame-is-still-skipped',
    idleAfter - idleBefore <= 2,
    `${idleAfter - idleBefore} frames painted over ${driven} rAF ticks driven `
    + 'from the page with nothing happening');

  // THE DRAW CONTROLS STILL WORK WITH THE STEM ON — the checks above them all
  // ran with it off, so without this the stem could be shipping a page whose
  // sliders only work when it is not there.
  await reset();
  await stemOn({ weight: 0.6, depthDim: 0 });
  const withStemThin = await px();
  await stemOn({ weight: 4, depthDim: 0 });
  const withStemFat = await px();
  // Read here, not after the density pass below: every stemOn() writes the
  // whole control set, so the weight is back at its default by then.
  const fatMat = await q(() => window.__plot.materialInfo());
  await stemOn({ uDensity: 12 });
  const dense = await q(() => window.__plot.drawn());
  await stemOn({ uDensity: 4 });
  const sparse = await q(() => window.__plot.drawn());
  /* A GENTLER RATIO THAN THE WEIGHT CHECK ABOVE, for the reason that check's
     own comment records: ink is coverage, not width, and the frame that holds a
     170 mm stem packs the head into few enough pixels that it is already a
     solid mass at 0.6 px. Measured here: 1.31x, against 1.91x at the head's own
     framing with the stem off. The claim is that the sliders still reach the
     drawing, and the linewidth read back from the material is the half of it
     that cannot saturate. */
  check('draw/the-existing-controls-still-work-with-the-stem-on',
    withStemFat.ink > withStemThin.ink * 1.15 && fatMat.linewidth === 4
    && dense.u > sparse.u && dense.total > sparse.total,
    `ink ${withStemThin.ink} -> ${withStemFat.ink} px `
    + `(${(withStemFat.ink / withStemThin.ink).toFixed(2)}x) over the weight slider; `
    + `u ${dense.u} -> ${sparse.u} segments over the density slider`);

  // The two self-reports the panel makes have to be the numbers the page
  // actually holds, not a sentence claiming a property.
  await stemOn({ stemDroop: 40 });
  const stemPanel = await page.evaluate(() => {
    window.__plot.renderNow(); return window.__plot.stemText();
  });
  const si40 = await q(() => window.__plot.stemInfo());
  // Against the PAGE's own census. Against the file's, this becomes a second
  // census check and reports on the reader rather than on the panel.
  const pageU = (await q(() => window.__plot.census())).u;
  check('readout/the-stem-panel-reports-the-seam-and-the-chord',
    stemPanel.includes(`agree at the ring to ${si40.seamMm.toExponential(1)} mm`)
    && stemPanel.includes(`cuts the corner by at most ${si40.sagittaMm.toFixed(3)} mm`)
    && stemPanel.includes(`${si40.lines} of ${pageU} u-lines continued`),
    `seam ${si40.seamMm.toExponential(1)} mm · chord ${si40.sagittaMm.toFixed(3)} mm`);

  // =========================================================================
  // ONE PETAL, PICKED AND DEFORMED. Every check above ran with NOTHING picked
  // and both scales at 1, so those numbers are /plot's own and nothing here can
  // be hiding inside them. These pick one.
  //
  // The camera is re-framed after each state change for the reason the stem
  // section records: a control never moves the camera, so a petal stretched to
  // two and a half times its length hangs out of a frame fitted to the file.
  const PETAL_ON = { ...DEFAULTS, stem: 'off' };
  /* AND IT RESTS THE BEND POINTS, which the sliders cannot do. A bend offset is
     not a control value — it is set by dragging a handle — so `set()` cannot
     clear one, and a check that dragged one leaves it for whatever runs next.
     Measured: without this, the check that drags a handle to prove both line
     families move together left that bend in place, and the stretch checks two
     aisles down then measured a petal that was bent AS WELL AS stretched and
     read 60.31 mm where 2.2x of 27.04 is 59.49. The stem sheet's own `reset`
     clicks its bend reset for the same reason. */
  /* AND IT PICKS BEFORE IT WRITES THE SCALES, which the ownership makes
     load-bearing rather than tidy. Selecting a petal LOADS that petal's values
     into the two sliders; writing every control in one sweep then puts 1.00x
     back over whatever was loaded, which is legitimate page behaviour (a hand
     dragging the slider to 1.00 really does reset that petal) and makes the
     load impossible to observe. So the selection goes in on its own first, and
     the scales are written afterwards and only when the caller asked for them.
     `pick` is the same event a click or an arrow raises — one path in. */
  const pick = index => page.evaluate(i => {
    const el = document.getElementById('petalPick');
    el.value = String(i);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, index);
  /* CLEARING A WARP TAKES THE PAGE'S OWN CONTROLS, because a warp now outlives
     the selection that made it and there is no page-wide reset — which is the
     ownership, not an omission. So this picks each warped petal in turn, puts
     its two scales back to 1.00x and clicks its bend reset: three real controls,
     no state written from outside. Without it every check would inherit the
     previous one's petals, and "exactly this petal's strips moved" would be
     measuring the section above it. */
  const restAllPetals = async () => {
    for (const e of await q(() => window.__plot.petalWarpStore())) {
      if (!e.warped) continue;
      await pick(e.index);
      await set({ petalAlong: 1, petalAcross: 1 });
      await page.evaluate(() => document.getElementById('petalBendReset').click());
    }
    await pick(-1);
  };
  const petalOn = async (o = {}) => {
    await restAllPetals();
    const { petalAlong, petalAcross, petalPick, ...rest } = o;
    await set({ ...PETAL_ON, ...rest, petalAlong: 1, petalAcross: 1, petalPick: -1 });
    if (petalPick !== undefined && petalPick >= 0) await pick(petalPick);
    if (petalAlong !== undefined || petalAcross !== undefined) {
      const w = {};
      if (petalAlong !== undefined) w.petalAlong = petalAlong;
      if (petalAcross !== undefined) w.petalAcross = petalAcross;
      await set(w);
    }
    await view(VIEW);
  };
  const pList = await q(() => window.__plot.petalList());
  const OPTS = await q(() => window.__plot.petalOptions());

  check('select/the-picker-lists-the-file-own-petals',
    pList.length === fileCensus.petals && OPTS.length === pList.length + 1
    && OPTS[0] === '-1' && OPTS.slice(1).join(',') === pList.map(p => String(p.index)).join(',')
    && pList.every(p => p.warpable) && pList[0].name === 'petal_0'
    && pList.every(p => p.uLines > 0 && p.vLines > 0),
    `${pList.length} petals, all deformable, ${pList[0].uLines} u-lines x `
    + `${pList[0].vLines} v-lines each; the list is "none" plus the file's own order`);

  /* EXACTLY ONE PETAL IS SELECTED, AND THE DRAWING DOES NOT MOVE WHEN IT IS.
     Both halves matter: the highlight has to be exactly that petal's strips and
     no others, and the DRAW panel is about the FILE — so the per-family segment
     and line counts have to be identical to the number they read with nothing
     picked. A highlight that quietly dropped or duplicated a strip would show
     up in the second half even where the first cannot see it. */
  await petalOn();
  const noneDrawn = await q(() => window.__plot.drawn());
  await petalOn({ petalPick: 11 });
  const oneDrawn = await q(() => window.__plot.drawn());
  const oneInfo = await q(() => window.__plot.petalInfo());
  const p11 = pList.find(p => p.index === 11);
  const p11Segments = (await q(() => window.__plot.petalPoints(11, false)))
    .reduce((a, t) => a + (t.count - 1), 0);
  check('select/exactly-one-petal-is-highlighted-and-the-counts-do-not-move',
    oneInfo.selected === 11 && oneDrawn.selectedLines === p11.strips
    && oneDrawn.selected === p11Segments && noneDrawn.selectedLines === 0
    && ['u', 'v', 'other', 'uLines', 'vLines', 'total'].every(k => oneDrawn[k] === noneDrawn[k]),
    `petal_11 highlighted: ${oneDrawn.selectedLines} of the file's ${p11.strips} strips, `
    + `${oneDrawn.selected} segments; the DRAW counts held at u ${noneDrawn.u} · `
    + `v ${noneDrawn.v} · ${noneDrawn.total} total`);

  /* THE HIGHLIGHT IS A HUE AND NOT A BRIGHTNESS, which is the one signal this
     page cannot spend: overlapping petals already brighten where they cross, so
     a selected petal drawn brighter or dimmer reads as nearer or further. The
     accent is normalised to its own largest linear channel, so its ceiling is
     exactly the white line's — same exposure, same weight, different hue. */
  const selMat = await q(() => window.__plot.selectionColor());
  const mainMat = await q(() => window.__plot.materialInfo());
  const peak = Math.max(...selMat.colorLinear);
  check('select/the-highlight-is-a-hue-and-not-a-brightness',
    selMat.drawn === true && Math.abs(peak - mainMat.colorLinear) < 1e-6
    && selMat.linewidth === mainMat.linewidth
    && Math.min(...selMat.colorLinear) < peak * 0.9,
    `the highlight tops out at ${peak.toFixed(4)} against the drawing's `
    + `${mainMat.colorLinear}, at the same ${selMat.linewidth} px, with channels `
    + `(${selMat.colorLinear.map(v => v.toFixed(3)).join(', ')}) — a hue, not a level`);

  /* AND THE HIGHLIGHT'S MATERIAL CARRIES THE STATE A CLONE SILENTLY MISSES.
     A `LineMaterial` divides by `resolution` to work out a fat line's width, so
     a clone that never gets the viewport's size draws every one of its segments
     as a screen-filling quad — and the symptom is NOT a wrong picture, it is a
     stalled renderer: measured here before the fix, a selected petal's 541
     segments took a headless software-GL frame from milliseconds to SECONDS and
     pinned the GPU process at 350% CPU, which read as this gate hanging. The
     fog FLAG is the same shape of mistake, because three compiles `USE_FOG`
     into the program and a clone that is never told keeps the program it was
     first compiled with while the drawing beside it fades. Neither is visible
     in a segment count and neither has a colour. */
  await petalOn({ petalPick: 11, depthDim: 0 });
  const selNoFog = await q(() => window.__plot.selectionColor());
  await petalOn({ petalPick: 11, depthDim: 55 });
  const selFog = await q(() => window.__plot.selectionColor());
  const mainFog = await q(() => window.__plot.materialInfo());
  check('select/the-highlight-material-carries-the-resolution-and-the-fog',
    selFog.resolution.length === 2 && selFog.resolution[0] > 1 && selFog.resolution[1] > 1
    && selFog.resolution.every((v, i) => v === mainFog.resolution[i])
    && selFog.fog === true && selNoFog.fog === true
    && selFog.blending === mainFog.blending,
    `resolution ${selFog.resolution.join('x')} on both materials, fog flag on, blending `
    + `${selFog.blending} — the two pieces of LineMaterial state that are not properties `
    + 'of the drawing and are invisible in a segment count');

  /* THE PICK TAKES THE FRONT-MOST LINE WITHIN TOLERANCE, re-derived in the gate
     from a DIFFERENT primitive than the shipped rule uses. `pickAt` scans every
     drawn segment at once and returns one petal; `petalDistancesAt` reports, per
     petal, that petal's own nearest segment and its depth — so the gate can
     work out which petal SHOULD win and compare, rather than restate the scan.
     The detail line carries the measurement the whole design rests on. */
  await petalOn({ petalPick: -1 });
  const probes = await page.evaluate(() => {
    const out = [];
    for (let y = 40; y < 780; y += 30) {
      for (let x = 40; x < 1060; x += 30) {
        const near = window.__plot.petalDistancesAt(x, y);
        out.push({ x, y, pick: window.__plot.pickAt(x, y), near });
      }
    }
    return { out, tol: window.__plot.pickTolerance() };
  });
  let hits = 0, agree = 0, ambiguous = 0, disagree = 0, offInk = 0;
  for (const pr of probes.out) {
    const within = pr.near.filter(n => n.d <= probes.tol);
    if (!within.length) { if (pr.pick >= 0) offInk++; continue; }
    hits++;
    const front = within.reduce((a, b) => (b.z < a.z ? b : a));
    const closest = within.reduce((a, b) => (b.d < a.d ? b : a));
    if (pr.pick === front.petal) agree++;
    if (within.length > 1) ambiguous++;
    if (front.petal !== closest.petal) disagree++;
  }
  /* AND IT IS NOT ALLOWED TO PASS VACUOUSLY. `disagree > 0` is the clause that
     makes this check falsifiable at all: on a drawing where no two petals ever
     overlap, front-most and nearest-on-screen agree everywhere and the mutation
     this check exists for would sail through. On this bloom they disagree on a
     third of the hits, and requiring that says so. */
  check('select/the-pick-is-the-front-most-line-within-tolerance',
    hits > 100 && agree === hits && offInk === 0 && ambiguous > 0 && disagree > 0,
    `${agree} of ${hits} probes with ink within ${probes.tol} px picked the FRONT-most `
    + `petal, and ${offInk} picked a petal where there was no ink. Of those hits `
    + `${(100 * ambiguous / hits).toFixed(1)}% had two or more petals in reach and `
    + `${(100 * disagree / hits).toFixed(1)}% would have picked a different petal on `
    + `nearest-on-screen — which is why the list is the primary control and this is `
    + `the convenience (${(100 * hits / probes.out.length).toFixed(1)}% of the canvas `
    + 'has any line within reach at all)');

  /* A CLICK PICKS, A DRAG ORBITS, AND A CLICK ON THE BLACK CLEARS. Aimed at a
     pixel the PAGE says is on a named petal's ink, so the aim is the page's and
     what is under test is the plumbing: the slop that separates a click from an
     orbit, the route through the dropdown, and the miss. */
  /* AND THE AIM IS SEARCHED FOR, not named. `petalScreenPoint` answers where a
     petal's ink is; whether that pixel is under a control column is a different
     question, and its answer moved when a panel grew — petal 7's own line came
     back at (366, 507), which is inside the GRID read-out. The sheets already
     search for a HANDLE in the clear for the same reason. */
  const aim = await page.evaluate(() => {
    for (let petal = 0; petal < 28; petal++) {
      for (const frac of [0.5, 0.35, 0.65, 0.2, 0.8]) {
        const a2 = window.__plot.petalScreenPoint(petal, frac);
        if (!a2) continue;
        const el = document.elementFromPoint(a2.x, a2.y);
        if (el && el.id === 'plot-canvas') return { ...a2, petal, frac };
      }
    }
    return null;
  });
  const aimPick = aim ? await page.evaluate(a => window.__plot.pickAt(a.x, a.y), aim) : -1;
  await page.mouse.move(aim.x, aim.y);
  await page.mouse.down();
  await page.mouse.up();
  const afterClick = await q(() => window.__plot.petalInfo());
  const optionAfter = await q(() => document.getElementById('petalPick').value);
  const miss = await barePoint(0.5, 0.15);
  await page.mouse.move(miss.x, miss.y);
  await page.mouse.down();
  await page.mouse.up();
  const afterMiss = await q(() => window.__plot.petalInfo());
  check('select/a-click-picks-and-a-click-on-the-black-clears',
    !!aim && aimPick >= 0 && afterClick.selected === aimPick
    && optionAfter === String(aimPick) && afterMiss.selected === -1,
    `a click on petal_${aim && aim.petal}'s own ink, at a pixel in the clear, selected `
    + `petal_${aimPick} and moved the dropdown to ${optionAfter}; a click on empty canvas `
    + 'cleared it');

  await petalOn({ petalPick: 9 });
  const beforeOrbit = await q(() => window.__plot.petalInfo());
  const camPre = await q(() => window.__plot.cameraInfo());
  await page.mouse.move(gap.x, gap.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(gap.x - i * 9, gap.y - i * 4);
  await page.mouse.up();
  const afterOrbit = await q(() => { window.__plot.settle(); return window.__plot.petalInfo(); });
  const camPost = await q(() => window.__plot.cameraInfo());
  const orbited = Math.hypot(...camPost.position.map((v, i) => v - camPre.position[i]));
  check('select/a-drag-orbits-and-leaves-the-selection-alone',
    beforeOrbit.selected === 9 && afterOrbit.selected === 9
    && orbited > camPre.distance * 0.05,
    `the camera moved ${orbited.toFixed(1)} of a ${camPre.distance.toFixed(1)} standoff `
    + 'and petal_9 stayed picked — reading the model from every angle costs nothing');

  // THE ARROWS STEP THE FILE'S OWN ORDER and stop at its ends rather than
  // wrapping, so holding one does not spin through the bloom forever.
  await petalOn({ petalPick: 0 });
  const stepped = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => document.getElementById('petalNext').click());
    stepped.push((await q(() => window.__plot.petalInfo())).selected);
  }
  await page.evaluate(() => document.getElementById('petalPrev').click());
  stepped.push((await q(() => window.__plot.petalInfo())).selected);
  await petalOn({ petalPick: 0 });
  const atFirst = await q(() => ({ prev: document.getElementById('petalPrev').disabled,
                                   next: document.getElementById('petalNext').disabled }));
  await petalOn({ petalPick: pList[pList.length - 1].index });
  const atLast = await q(() => ({ prev: document.getElementById('petalPrev').disabled,
                                  next: document.getElementById('petalNext').disabled }));
  check('select/the-arrows-step-the-file-own-order-and-stop-at-its-ends',
    stepped.join(',') === '1,2,3,2' && atFirst.prev === true && atFirst.next === false
    && atLast.prev === false && atLast.next === true,
    `0 -> ${stepped.join(' -> ')} · the arrows are disabled at the two ends`);

  /* THE WARP MOVES THE SELECTED PETAL AND NOTHING ELSE — trap three, and the
     one that goes wrong quietly, because neighbouring petals share the ring and
     sit close in space. Asserted as an ARRAY IDENTITY over the whole file:
     `applyPetalWarp` hands back the very array the file wrote for every strip it
     did not move, so a strip that shifted by a millionth of a millimetre would
     be a new array and would be counted here, where a tolerance would swallow
     it. */
  /* ---- THE WARP IS A PROPERTY OF THE PETAL ---------------------------------
     Four checks, and they exist because the page shipped the other model and
     every check here stayed green under it. `warp/editing-moves-only-the-
     selected-petal` is TRUE of a single page-wide warp applied to whichever
     petal is selected — it just never said whose the warp WAS. That is the same
     class as the two checks this file already records as passing for the wrong
     reason: a true statement that does not test the thing that matters.

     THE INSTRUMENT IS GEOMETRY, NOT INK, and that is a deliberate strengthening
     of what was asked for. Selecting a petal necessarily changes the ink — the
     highlight is a hue by design, so a different petal draws teal — and it also
     legitimately leaves an already-warped petal in frame. Neither is the defect.
     Comparing every petal's emitted points BIT FOR BIT across the selection
     isolates exactly the thing: did picking a petal move anything at all. */
  const petalGeom = () => page.evaluate(() => window.__plot.allPetalPoints(true));
  const sameGeom = (a, b) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].index !== b[i].index || a[i].points.length !== b[i].points.length) return false;
      for (let k = 0; k < a[i].points.length; k++) {
        const x = a[i].points[k], y = b[i].points[k];
        if (x.length !== y.length) return false;
        for (let j = 0; j < x.length; j++) if (!Object.is(x[j], y[j])) return false;
      }
    }
    return true;
  };
  const petalMoved = (a, b, index) => {
    const A = a.find(e => e.index === index), B = b.find(e => e.index === index);
    if (!A || !B) return -1;
    let m = 0;
    for (let k = 0; k < A.points.length; k++) {
      for (let j = 0; j < A.points[k].length; j += 3) {
        m = Math.max(m, Math.hypot(A.points[k][j] - B.points[k][j],
          A.points[k][j + 1] - B.points[k][j + 1], A.points[k][j + 2] - B.points[k][j + 2]));
      }
    }
    return m;
  };

  const A_PETAL = 3, B_PETAL = 7;
  await petalOn({ petalPick: A_PETAL, petalAlong: 0.30, petalAcross: 2.50 });
  const withA = await petalGeom();
  const storeA = await q(() => window.__plot.petalWarpStore());
  await pick(B_PETAL);
  const afterPick = await petalGeom();
  const panelAtB = await q(() => window.__plot.petalControls());
  check('select/picking-a-petal-deforms-nothing',
    sameGeom(withA, afterPick)
    && storeA.filter(e => e.warped).map(e => e.index).join(',') === String(A_PETAL)
    && panelAtB.along === 1 && panelAtB.across === 1,
    `petal_${A_PETAL} warped to 0.30x / 2.50x, then petal_${B_PETAL} picked: all `
    + `${afterPick.length} petals identical to the bit, and the panel loaded `
    + `${panelAtB.along.toFixed(2)}x / ${panelAtB.across.toFixed(2)}x — petal_${B_PETAL}'s `
    + 'own values, not the ones on screen a moment earlier');

  await pick(-1);
  const afterDeselect = await petalGeom();
  const storeOff = await q(() => window.__plot.petalWarpStore());
  const offInfo = await q(() => window.__plot.petalInfo());
  const offControls = await q(() => window.__plot.petalControls());
  check('warp/a-warp-survives-deselection',
    sameGeom(withA, afterDeselect)
    && storeOff.filter(e => e.warped).map(e => e.index).join(',') === String(A_PETAL)
    && offInfo.warpedPetals === 1 && offInfo.selected === -1
    && offControls.alongDisabled === true && offControls.acrossDisabled === true
    && offControls.alongOut === '\u2014' && offControls.acrossOut === '\u2014',
    `with nothing picked, petal_${A_PETAL} is still warped to the bit and the page still `
    + `counts ${offInfo.warpedPetals}; the two scales are switched off and read an em `
    + 'dash, because a control that applies to nothing should say so');

  await pick(B_PETAL);
  await set({ petalAlong: 2.20, petalAcross: 0.40 });
  const bothStore = await q(() => window.__plot.petalWarpStore());
  const bothInfo = await q(() => window.__plot.petalInfo());
  const withBoth = await petalGeom();
  const aHeld = petalMoved(withA, withBoth, A_PETAL);
  const bMoved = petalMoved(withA, withBoth, B_PETAL);
  const aEntry = bothStore.find(e => e.index === A_PETAL);
  const bEntry = bothStore.find(e => e.index === B_PETAL);
  /* AND THE SEAM'S OWN POPULATION GROWS WITH THE WARPED SET. The seam ranges
     over every warped petal, so the count of base points beside it has to be
     the SAME population — this is the one place two petals are warped at once
     and therefore the only place the two can be told apart. They shipped
     crossed: the count was the selected petal's share, so `offInfo` above (one
     petal warped, nothing picked) read "unmoved to 0.0e+0 mm over 0 points"
     under a claim about all of them. `> 0` is what catches that one and
     `bothInfo > offInfo` is what catches counting only the selected petal. */
  check('warp/two-petals-hold-different-warps-at-once',
    aEntry && bEntry && aEntry.along === 0.30 && aEntry.across === 2.50
    && bEntry.along === 2.20 && bEntry.across === 0.40
    && aHeld === 0 && bMoved > 1
    && bothInfo.warpedPetals === 2 && bothInfo.seamMm === 0
    && offInfo.basePoints > 0 && bothInfo.basePoints > offInfo.basePoints,
    `petal_${A_PETAL} at ${aEntry && aEntry.along}x / ${aEntry && aEntry.across}x and `
    + `petal_${B_PETAL} at ${bEntry && bEntry.along}x / ${bEntry && bEntry.across}x together: `
    + `warping the second moved petal_${A_PETAL} by ${aHeld} mm and petal_${B_PETAL} by `
    + `${bMoved.toFixed(2)} mm, ${bothInfo.warpedPetals} carry a warp, and every warped `
    + `base row is still unmoved at ${bothInfo.seamMm} mm over ${bothInfo.basePoints} base `
    + `points — the seam's own population, which was ${offInfo.basePoints} with one of them `
    + 'warped and nothing picked');

  await pick(A_PETAL);
  const backAtA = await q(() => window.__plot.petalControls());
  const backGeom = await petalGeom();
  const aStill = petalMoved(withBoth, backGeom, A_PETAL);
  const bStill = petalMoved(withBoth, backGeom, B_PETAL);
  check('select/selecting-a-warped-petal-loads-its-own-values',
    backAtA.along === 0.30 && backAtA.across === 2.50
    && backAtA.alongOut === '0.30\u00d7' && backAtA.acrossOut === '2.50\u00d7'
    && aStill === 0 && bStill === 0,
    `picking petal_${A_PETAL} back put ${backAtA.along.toFixed(2)}x / `
    + `${backAtA.across.toFixed(2)}x into the panel — its own values, loaded — and moved `
    + `nothing: petal_${A_PETAL} ${aStill} mm, petal_${B_PETAL} ${bStill} mm`);

  const SEL = 11;
  await petalOn({ petalPick: SEL, petalAlong: 2.2, petalAcross: 1.8 });
  const untouched = await q(() => window.__plot.petalUntouched());
  const allStrips = await q(() => window.__plot.census());
  const mineIdx = await page.evaluate(sel => window.__plot.petalPoints(sel, false).length, SEL);
  const movedCount = untouched.filter(v => !v).length;
  const warpInfo = await q(() => window.__plot.petalInfo());
  /* AND THIS ONE IS TRUE OF A PAGE-WIDE WARP TOO, which is why it is not on its
     own the guarantee: with exactly one petal carrying a warp, "exactly that
     petal's strips moved" holds under either model. It is kept because it is
     the right claim about EDITING — a slider reaches the petal it belongs to
     and no other — and the four checks above carry the ownership. */
  check('warp/editing-moves-only-the-selected-petal',
    movedCount === mineIdx && untouched.length === allStrips.strips
    && warpInfo.untouched === untouched.length - movedCount
    && warpInfo.offPetal === untouched.length - movedCount
    && warpInfo.warpedPetals === 1
    && warpInfo.movedMm > 5,
    `${movedCount} strips moved, exactly petal_${SEL}'s ${mineIdx}; the other `
    + `${untouched.length - movedCount} came back as the arrays the file wrote, `
    + `${warpInfo.warpedPetals} petal carries a warp, and it moved up to `
    + `${warpInfo.movedMm.toFixed(2)} mm`);

  /* THE BASE ROW HOLDS UNDER EVERY WARP — trap one. Compared to the BIT against
     the file's own points, at the corners of both scales and with a bend, and
     with the stem ON at a droop so the ring the stem hangs from is under load
     from both ends at once. */
  const baseRows = [];
  for (const [al, ac, stem, droop] of [[1, 1, 'off', 0], [2.5, 1, 'off', 0],
                                       [0.25, 2.5, 'off', 0], [2.5, 2.5, 'on', 40],
                                       [0.25, 0.25, 'on', -35]]) {
    await petalOn({ petalPick: SEL, petalAlong: al, petalAcross: ac,
                    stem, stemDroop: droop });
    const before = await page.evaluate(sel => window.__plot.petalPoints(sel, false), SEL);
    const after = await page.evaluate(sel => window.__plot.petalPoints(sel, true), SEL);
    let base = 0, bit = 0;
    for (let k = 0; k < before.length; k++) {
      // A STRIP WITH NO STATIONS IS SKIPPED, NOT DEREFERENCED. The negative
      // control runs this file against deliberately broken code, and one of the
      // mutations leaves two thirds of a petal's strips unplaced — a check that
      // reached into `stations` there THREW and took the whole sweep with it,
      // where what it owes is a red line and a number.
      if (!before[k].stations) continue;
      for (let i = 0; i < before[k].count; i++) {
        if (before[k].stations[i] !== 0) continue;
        base++;
        if ([0, 1, 2].every(a2 => Object.is(after[k].points[i * 3 + a2],
                                            before[k].points[i * 3 + a2]))) bit++;
      }
    }
    baseRows.push({ al, ac, stem, droop, base, bit,
                    seam: (await q(() => window.__plot.petalInfo())).seamMm });
  }
  check('warp/the-base-row-holds-to-the-bit-under-every-warp',
    baseRows.every(r2 => r2.base > 0 && r2.bit === r2.base && r2.seam === 0),
    baseRows.map(r2 => `along ${r2.al} across ${r2.ac} stem ${r2.stem} droop ${r2.droop}: `
      + `${r2.bit}/${r2.base} base points identical`).join(' · '));

  /* AND THE STEM DOES NOT NOTICE. The stem is built from the u-lines' feet, and
     the petal law is exactly the identity there — so this is structural rather
     than an ordering, and it is measured with the stem drawn and drooped so a
     failure would have somewhere to show. */
  await petalOn({ petalPick: SEL, stem: 'on', stemDroop: 40, petalAlong: 1, petalAcross: 1 });
  const stemFlat = await q(() => window.__plot.stemLine(0));
  const feetFlat = await q(() => window.__plot.stemFeet());
  await set({ ...PETAL_ON, petalPick: SEL, stem: 'on', stemDroop: 40,
              petalAlong: 2.5, petalAcross: 2.5 });
  const stemWarped = await q(() => window.__plot.stemLine(0));
  const feetWarped = await q(() => window.__plot.stemFeet());
  const sameStem = stemFlat.length === stemWarped.length
    && stemFlat.every((v, i) => Object.is(v, stemWarped[i]));
  const sameFeet = feetFlat.length === feetWarped.length
    && feetFlat.every((f, i) => [0, 1, 2].every(a2 => Object.is(f[a2], feetWarped[i][a2])));
  /* THE STEM'S OWN SEAM IS THE STEM'S CHECK, ONE AISLE UP, and folding it in
     here made this report on the stem rather than on the petal — the mistake
     this file already records twice. What this check owes is a comparison: the
     stem WITH a petal deformed against the stem without, under identical stem
     settings. */
  check('warp/a-deformed-petal-leaves-the-stem-alone',
    sameStem && sameFeet && feetFlat.length > 0,
    `${feetFlat.length} stem feet and all ${stemFlat.length / 3} stations of stem line 0 `
    + 'identical to the bit with the petal at 2.5x in both directions, at a 40° droop');

  /* BOTH LINE FAMILIES MOVE TOGETHER — trap two, measured on the page over every
     shared lattice point of the selected petal, with BOTH families drawn. The
     u-line in column c and the v-line in row r hold the same point; they are
     equal to the bit in the file and must stay equal to the bit after the warp,
     because the station is a function of u alone. */
  const latticeRows = [];
  for (const [al, ac, bend] of [[1, 1, false], [2.5, 1, false], [1, 2.5, false],
                                [0.5, 1.7, false], [1, 1, true]]) {
    await petalOn({ petalPick: SEL, petalAlong: al, petalAcross: ac, families: 'both' });
    if (bend) {
      // Through a REAL drag on a real handle, so this covers the bend arriving
      // from the pointer and not only from a slider.
      const h = await page.evaluate(() => window.__plot.petalHandleScreenPos(0));
      if (h && h.x > gap.left + 30 && h.x < gap.right - 30 && h.y > 40 && h.y < 760) {
        await page.mouse.move(h.x, h.y);
        await page.mouse.down();
        await page.mouse.move(h.x + 70, h.y - 40, { steps: 4 });
        await page.mouse.up();
      }
    }
    const set2 = await page.evaluate(sel => window.__plot.petalPoints(sel, true), SEL);
    const U = set2.filter(t => t.kind === 'u').sort((a, b) => a.index - b.index);
    const V = set2.filter(t => t.kind === 'v').sort((a, b) => a.index - b.index);
    let bad = 0, n = 0;
    for (let c = 0; c < U.length; c++) {
      for (let r2 = 0; r2 < V.length; r2++) {
        for (let a2 = 0; a2 < 3; a2++) {
          n++;
          if (!Object.is(U[c].points[r2 * 3 + a2], V[r2].points[c * 3 + a2])) bad++;
        }
      }
    }
    latticeRows.push({ al, ac, bend, bad, n, u: U.length, v: V.length });
  }
  check('warp/both-line-families-move-together',
    latticeRows.every(r2 => r2.n > 0 && r2.bad === 0)
    && latticeRows.every(r2 => r2.u > 1 && r2.v > 1),
    `${latticeRows[0].u} u-lines x ${latticeRows[0].v} v-lines share `
    + `${latticeRows[0].n / 3} points; over five settings including a real handle drag, `
    + `${latticeRows.reduce((a2, r2) => a2 + r2.bad, 0)} of `
    + `${latticeRows.reduce((a2, r2) => a2 + r2.n, 0)} shared coordinates differ`);

  /* THE TWO STRETCHES, ON THE PAGE, each asserted on what it LEAVES ALONE too.
     Measured off the emitted points — the centre line's own arc length and the
     largest distance from it — never off the number that was typed. */
  const measure = async (al, ac) => {
    await petalOn({ petalPick: SEL, petalAlong: al, petalAcross: ac });
    const set2 = await page.evaluate(sel => window.__plot.petalPoints(sel, true), SEL);
    const rows = new Map();
    for (const t of set2) {
      if (t.kind !== 'u' || !t.stations) continue;
      for (let i = 0; i < t.count; i++) {
        const u = t.stations[i];
        let r2 = rows.get(u);
        if (!r2) rows.set(u, r2 = { u, n: 0, x: 0, y: 0, z: 0 });
        r2.n++; r2.x += t.points[i * 3]; r2.y += t.points[i * 3 + 1]; r2.z += t.points[i * 3 + 2];
      }
    }
    const ord = [...rows.values()].sort((a2, b2) => a2.u - b2.u)
      .map(r2 => [r2.x / r2.n, r2.y / r2.n, r2.z / r2.n]);
    if (!ord.length) return { L: 0, half: new Map() };
    let L = 0;
    for (let i = 1; i < ord.length; i++) {
      L += Math.hypot(ord[i][0] - ord[i - 1][0], ord[i][1] - ord[i - 1][1],
                      ord[i][2] - ord[i - 1][2]);
    }
    const byU = new Map();
    [...rows.values()].sort((a2, b2) => a2.u - b2.u)
      .forEach((r2, i) => byU.set(r2.u, ord[i]));
    /* PER ROW, NOT AS A MAXIMUM — the finding part one records. The across
       scale is gated at the base, so on this grid the blade at across 0.4
       lands on exactly the base row's own 3.2 mm and a whole-petal maximum
       would have read "narrowed correctly" for no reason at all. */
    const half = new Map();
    for (const t of set2) {
      if (!t.stations) continue;
      for (let i = 0; i < t.count; i++) {
        const u = t.stations[i], c = byU.get(u);
        if (!c) continue;
        const d = Math.hypot(t.points[i * 3] - c[0], t.points[i * 3 + 1] - c[1],
                             t.points[i * 3 + 2] - c[2]);
        if (d > (half.get(u) ?? 0)) half.set(u, d);
      }
    }
    return { L, half };
  };
  const rest = await measure(1, 1);
  // The widest row at rest, and the base row: one is where the blade scale has
  // to show, the other is where it must not. Both are `null` on a petal the
  // file did not place, which a mutation can produce — the two checks below
  // then read undefined and go red, which is what they owe.
  const BLADE_U = rest.half.size
    ? [...rest.half.entries()].reduce((a2, b2) => (b2[1] > a2[1] ? b2 : a2))[0] : null;
  const FOOT_U = rest.half.size ? Math.min(...rest.half.keys()) : null;
  const longer = await measure(2.2, 1);
  const shorter = await measure(0.4, 1);
  const wider = await measure(1, 2.2);
  const narrower = await measure(1, 0.4);
  const near = (a2, b2) => Number.isFinite(a2) && Number.isFinite(b2)
    && Math.abs(a2 - b2) < 2e-3 * Math.max(1, Math.abs(b2));
  const blade = r2 => r2.half.get(BLADE_U) ?? NaN, foot = r2 => r2.half.get(FOOT_U) ?? NaN;
  const show = v => (Number.isFinite(v) ? v.toFixed(2) : 'nothing');
  check('stretch/along-changes-the-length-and-not-the-width',
    near(longer.L, 2.2 * rest.L) && near(shorter.L, 0.4 * rest.L)
    && near(blade(longer), blade(rest)) && near(blade(shorter), blade(rest))
    && near(foot(longer), foot(rest)) && near(foot(shorter), foot(rest)),
    `${rest.L.toFixed(2)} mm at rest -> ${longer.L.toFixed(2)} at 2.2x and `
    + `${shorter.L.toFixed(2)} at 0.4x, with the widest row held at `
    + `${show(blade(rest))} mm and the foot at ${show(foot(rest))} mm`);
  check('stretch/across-changes-the-width-past-the-hold-and-holds-the-foot',
    near(blade(wider), 2.2 * blade(rest)) && near(blade(narrower), 0.4 * blade(rest))
    && foot(wider) === foot(rest) && foot(narrower) === foot(rest)
    && near(wider.L, rest.L) && near(narrower.L, rest.L),
    `the widest row goes ${show(blade(rest))} -> ${show(blade(wider))} mm at 2.2x `
    + `and ${show(blade(narrower))} at 0.4x, while the foot stays at exactly `
    + `${show(foot(rest))} mm and the length at ${rest.L.toFixed(2)} mm`);

  /* A REAL DRAG ON A REAL HANDLE, at a handle the page itself projected into the
     gap between the two panels — a pointerdown that lands on a control column
     never reaches the canvas, which is /print's own measured lesson and would
     read here as a bend that does not move anything. */
  await petalOn({ petalPick: -1 });
  let dragPetal = -1, grabAt = null;
  for (const cand of pList.map(p => p.index)) {
    await petalOn({ petalPick: cand });
    const h = await q(() => window.__plot.petalHandleScreenPos(0));
    if (h && h.x > gap.left + 40 && h.x < gap.right - 40 && h.y > 60 && h.y < 740) {
      dragPetal = cand; grabAt = h; break;
    }
  }
  /* NO HANDLE IN THE CLEAR IS A RED LINE, NOT A CRASH. A mutation can leave a
     petal with no axis and therefore no handles at all, and the first version
     of this section reached into a null screen position and threw — which took
     down the whole negative-control sweep on its second mutant, where what it
     owed was one failing check with a reason. */
  let visible0 = false, landedAt = null, dragWorst = 0, dragMoved = -1;
  let preDrag = [], camBeforeBend = null, camDuringBend = null, dragInfo = null;
  if (dragPetal >= 0 && grabAt) {
    await petalOn({ petalPick: dragPetal });
    await q(() => window.__plot.settle());
    grabAt = await q(() => window.__plot.petalHandleScreenPos(0));
    visible0 = await q(() => window.__plot.petalHandleVisible(0));
    preDrag = await page.evaluate(sel => window.__plot.petalPoints(sel, true), dragPetal);
    camBeforeBend = await q(() => window.__plot.cameraInfo());
    await page.mouse.move(grabAt.x, grabAt.y);
    await page.mouse.down();
    await page.mouse.move(grabAt.x + 100, grabAt.y - 45, { steps: 6 });
    landedAt = await q(() => window.__plot.petalHandleScreenPos(0));
    camDuringBend = await q(() => window.__plot.cameraInfo());
    await page.mouse.up();
    const postDrag = await page.evaluate(sel => window.__plot.petalPoints(sel, true), dragPetal);
    const dragUntouched = await q(() => window.__plot.petalUntouched());
    dragInfo = await q(() => window.__plot.petalInfo());
    for (let k = 0; k < preDrag.length; k++) {
      for (let i = 0; i < preDrag[k].count; i++) {
        dragWorst = Math.max(dragWorst, Math.hypot(
          postDrag[k].points[i * 3] - preDrag[k].points[i * 3],
          postDrag[k].points[i * 3 + 1] - preDrag[k].points[i * 3 + 1],
          postDrag[k].points[i * 3 + 2] - preDrag[k].points[i * 3 + 2]));
      }
    }
    dragMoved = dragUntouched.filter(v => !v).length;
  }
  check('bend/dragging-a-handle-bends-the-selected-petal-and-not-its-neighbours',
    visible0 === true && dragWorst > 3 && dragMoved === preDrag.length
    && dragInfo && dragInfo.seamMm === 0 && dragInfo.bendsRest === false,
    dragPetal < 0 || !grabAt
      ? 'no petal offered a bend handle in the clear between the two panels'
      : `handle 0 of petal_${dragPetal} dragged 100 px: that petal moved up to `
        + `${dragWorst.toFixed(2)} mm, ${dragMoved} strips changed (all ${preDrag.length} of `
        + `them its own), and the base row is still unmoved at ${dragInfo.seamMm} mm`);
  check('bend/the-petal-handle-lands-under-the-pointer',
    !!landedAt && Math.abs(landedAt.x - (grabAt.x + 100)) < 3
    && Math.abs(landedAt.y - (grabAt.y - 45)) < 3,
    landedAt
      ? `asked (${(grabAt.x + 100).toFixed(1)}, ${(grabAt.y - 45).toFixed(1)}), landed `
        + `(${landedAt.x.toFixed(1)}, ${landedAt.y.toFixed(1)})`
      : 'no handle to drag');
  // NOT AN EQUALITY — damping never reaches exactly zero here, the measured fact
  // the stem's own drag check records. The bar is one only a real orbit clears.
  const bendDrift = camDuringBend ? Math.hypot(...camDuringBend.position
    .map((v, i) => v - camBeforeBend.position[i])) : NaN;
  check('bend/a-petal-handle-drag-does-not-orbit-the-camera',
    bendDrift < 0.5,
    camDuringBend
      ? `the camera moved ${bendDrift.toExponential(2)} of a `
        + `${camBeforeBend.distance.toFixed(1)} standoff while a handle was held`
      : 'no handle to drag');

  // ADD, REMOVE AND REST, against the law plot-warp.js states — the same three
  // buttons the stem has, over the petal's own axis.
  const pbBefore = await q(() => window.__plot.petalBends());
  await page.evaluate(() => document.getElementById('petalBendAdd').click());
  const pbAdded = await q(() => window.__plot.petalBends());
  await page.evaluate(() => document.getElementById('petalBendRemove').click());
  const pbBack = await q(() => window.__plot.petalBends());
  await page.evaluate(() => document.getElementById('petalBendReset').click());
  const pbRested = await q(() => window.__plot.petalBends());
  const restedPts = await page.evaluate(sel => window.__plot.petalPoints(sel, true), dragPetal);
  const filePts = await page.evaluate(sel => window.__plot.petalPoints(sel, false), dragPetal);
  const backToFile = restedPts.every((t, k) => t.points.every((v, i) =>
    Object.is(v, filePts[k].points[i])));
  check('bend/add-and-remove-change-the-set-and-reset-rests-it',
    pbBefore.length === 2 && pbAdded.length === 3 && pbBack.length === 2
    && Math.abs((pbAdded[0] || {}).t - 0.25) < 1e-9
    && pbBack[pbBack.length - 1].t === 1
    && pbRested.every(b => b.offset.every(v => v === 0)) && backToFile,
    `2 -> 3 (new point at t = ${(pbAdded[0] ? pbAdded[0].t : NaN).toFixed(4)}, the midpoint of the widest `
    + 'gap) -> 2 with the tip kept; reset puts the petal back on the file\u2019s own '
    + 'points, to the bit');

  /* A BEND IS WARP STATE TOO, AND IT SURVIVES THE SWITCH — the claim that
     replaces this file's earlier one. Under the model the page shipped with, a
     petal switch RESTED the bend offsets and carried the two scales forward,
     and that was asserted here as though it were a property rather than the
     defect it was: the scales belonged to the page, so they had to go
     somewhere, and the offsets had nowhere to live. Both halves are gone. A
     bend now stays on the petal it was dragged onto, and stepping to the next
     petal shows THAT petal's own bends — at rest, because nobody has touched
     them. Driven by a real handle drag, because a bend offset cannot be set
     from a slider. */
  await petalOn({ petalPick: dragPetal, petalAlong: 1.6, petalAcross: 0.7 });
  const h2 = dragPetal >= 0 ? await q(() => window.__plot.petalHandleScreenPos(0)) : null;
  if (h2) {
    await page.mouse.move(h2.x, h2.y);
    await page.mouse.down();
    await page.mouse.move(h2.x + 80, h2.y - 30, { steps: 4 });
    await page.mouse.up();
  }
  const bentThere = await q(() => window.__plot.petalInfo());
  const bentGeom = await petalGeom();
  await page.evaluate(() => document.getElementById('petalNext').click());
  const afterSwitch = await q(() => window.__plot.petalInfo());
  const afterSwitchGeom = await petalGeom();
  const switchStore = await q(() => window.__plot.petalWarpStore());
  const bentEntry = switchStore.find(e => e.index === dragPetal);
  const nextEntry = switchStore.find(e => e.index === afterSwitch.selected);
  const bentOffset = bentEntry
    ? Math.max(...bentEntry.bends.map(b => Math.hypot(...b.offset))) : -1;
  check('warp/a-bend-and-its-scales-stay-on-the-petal-across-a-switch',
    bentThere.bendsRest === false && !!h2
    && sameGeom(bentGeom, afterSwitchGeom)
    && bentEntry && bentEntry.along === 1.6 && bentEntry.across === 0.7 && bentOffset > 1
    && nextEntry && nextEntry.along === 1 && nextEntry.across === 1
    && afterSwitch.bendsRest === true && afterSwitch.selected !== dragPetal,
    `petal_${dragPetal} bent by ${bentOffset.toFixed(1)} mm at 1.6x / 0.7x, then stepped `
    + `on: every petal identical to the bit, petal_${dragPetal}'s entry still holds its `
    + `bend and its scales, and petal_${afterSwitch.selected} shows its own 1.00x / 1.00x `
    + 'with its bends at rest');

  // The panel's self-reports have to be the numbers the page holds, not a
  // sentence claiming a property.
  await petalOn({ petalPick: SEL, petalAlong: 1.7, petalAcross: 0.6 });
  const petalPanel = await page.evaluate(() => {
    window.__plot.renderNow(); return window.__plot.petalText();
  });
  const pInfo = await q(() => window.__plot.petalInfo());
  const pFrame = await q(() => window.__plot.petalFrame());
  check('readout/the-petal-panel-reports-the-axis-the-seam-and-the-warped-count',
    !!pFrame
    && petalPanel.includes(`${pFrame.length.toFixed(2)} mm along its own centre line`)
    && petalPanel.includes(`unmoved to ${pInfo.seamMm.toExponential(1)} mm`)
    && petalPanel.includes(`over ${pInfo.basePoints} points the file placed at u = 0`)
    && petalPanel.includes(`up to ${pInfo.movedMm.toFixed(2)} mm`)
    && petalPanel.includes(`held over the first ${pFrame.holdRows} rows`)
    // AND THE COUNT THAT IS ONLY MEANINGFUL UNDER THE OWNERSHIP: how many
    // petals carry a warp, and how many strips are still the file's own.
    && petalPanel.includes(`${pInfo.warpedPetals} of ${pList.length} petals carry a warp`)
    && petalPanel.includes(`${pInfo.movedStrips} strips moved, ${pInfo.untouched} drawn`),
    pFrame
      ? `axis ${pFrame.length.toFixed(2)} mm · seam ${pInfo.seamMm.toExponential(1)} mm over `
        + `${pInfo.basePoints} base points · ${pInfo.warpedPetals} of ${pList.length} petals `
        + `warped, ${pInfo.movedStrips} strips moved, ${pInfo.untouched} untouched`
      : 'this petal has no measurable axis');

  // COST. The warp touches one petal's ~580 points per rebuild, which is
  // nothing beside the 16,268 the camera bounds already walk — but a warp that
  // quietly ran over every petal would show here as well as in the identity
  // check above.
  await petalOn({ petalPick: SEL, petalAlong: 1.8, petalAcross: 1.4 });
  const petalFrames = await q(() => { window.__plot.settle();
    const a = []; for (let i = 0; i < 15; i++) a.push(window.__plot.renderNow()); return a; });
  const petalMedian = petalFrames.slice().sort((a, b) => a - b)[Math.floor(petalFrames.length / 2)];
  check('cost/the-petal-warp-is-trivial', petalMedian < 5,
    `${petalMedian.toFixed(2)} ms median over 15 settled frames with a petal at 1.8x / `
    + `1.4x (worst ${Math.max(...petalFrames).toFixed(2)} ms)`);

  await set({ ...DEFAULTS });

  // =========================================================================
  // THE FRAME, ON THE PAGE. Every draw check above ran with it OFF — the gate's
  // DEFAULTS say so — so those ink figures are the ones /plot shipped and the
  // boundary's own teal pixels cannot be inside any of them.
  log('\n--- the frame ---');

  await reset();
  // Written down for THIS viewport, so a box that is merely self-consistent
  // cannot pass: 1100 x 800 at 2:3 and margin 6% is an inset of 0.06 * 800 = 48
  // px a side, leaving 1004 x 704; 1004/704 is wider than 2/3, so the box is
  // height-limited at 704 tall and 469.333 wide, centred at x = 315.333.
  await set({ frame: 'on', frameShape: 'rect', frameRatio: '2:3', frameMargin: 6 });
  const fBox = await q(() => window.__plot.frameBox());
  const fSegs = await q(() => window.__plot.frameSegments());
  const corners = new Set(fSegs.map(g => `${g[0].toFixed(3)},${g[1].toFixed(3)}`));
  check('frame/the-overlay-is-drawn-at-written-down-pixels',
    fnear(fBox.x, 315.3333333, 1e-4) && fnear(fBox.y, 48, 1e-6)
    && fnear(fBox.width, 469.3333333, 1e-4) && fnear(fBox.height, 704, 1e-6)
    && fSegs.length === 4
    && ['315.333,48.000', '784.667,48.000', '784.667,752.000', '315.333,752.000']
       .every(c => corners.has(c)),
    `${fBox.width.toFixed(3)} x ${fBox.height} at (${fBox.x.toFixed(3)}, ${fBox.y}); the four `
    + `segments the overlay actually holds start at ${[...corners].join(' ')}`);

  await set({ frameShape: 'ellipse' });
  const eSegs = await q(() => window.__plot.frameSegments());
  const eBox = await q(() => window.__plot.frameBox());
  const ex = eSegs.flatMap(g => [g[0], g[3]]), ey = eSegs.flatMap(g => [g[1], g[4]]);
  check('frame/the-shape-switch-changes-the-outline-and-not-the-box',
    eSegs.length > 4 && JSON.stringify(eBox) === JSON.stringify(fBox)
    && fnear(Math.min(...ex), fBox.x, 1e-3) && fnear(Math.max(...ex), fBox.x + fBox.width, 1e-3)
    && fnear(Math.min(...ey), fBox.y, 1e-3) && fnear(Math.max(...ey), fBox.y + fBox.height, 1e-3),
    `rect 4 segments · ellipse ${eSegs.length}, inscribed in the identical box — two shapes, `
    + 'one boundary, and the ratio is the separate axis');

  await set({ frameShape: 'rect', frameRatio: '16:9', frameMargin: 0 });
  const wideBox = await q(() => window.__plot.frameBox());
  await set({ frameRatio: '2:3', frameMargin: 24 });
  const tightBox = await q(() => window.__plot.frameBox());
  check('frame/the-ratio-and-the-margin-each-move-the-boundary',
    fnear(wideBox.width, 1100, 1e-6) && fnear(wideBox.height, 618.75, 1e-4)
    && fnear(wideBox.y, 90.625, 1e-4)
    && fnear(tightBox.inset, 192, 1e-6) && fnear(tightBox.height, 416, 1e-6)
    && tightBox.width < fBox.width,
    `16:9 at margin 0 is ${wideBox.width} x ${wideBox.height.toFixed(3)} (width-limited); `
    + `2:3 at 24% insets ${tightBox.inset} px and comes back `
    + `${tightBox.width.toFixed(3)} x ${tightBox.height}`);

  check('frame/the-ratio-options-are-the-ones-the-file-will-accept',
    JSON.stringify(await q(() => window.__plot.frameOptions()))
      === JSON.stringify(await q(() => window.__plot.frameRatios()))
    && (await q(() => window.__plot.frameRatios())).every(v => FR.isListedRatio(v)),
    'the select is written from FRAME_RATIOS and the reader checks a saved ratio against the '
    + 'same array — two lists of ratios would be one of them wrong');

  /* THE BOUNDARY IS CHROME, NOT INK. Two structural claims rather than a pixel
     one: the drawn segment counts do not move when the frame appears (it is its
     own primitive in its own scene), and it composites with NORMAL blending
     where the drawing is additive — a teal line that ADDED to the ink beneath it
     would brighten exactly the crossings the additive look is about. */
  await reset();
  const drawnNoFrame = await q(() => window.__plot.drawn());
  await set({ frame: 'on' });
  const drawnFramed = await q(() => window.__plot.drawn());
  const fMat = await q(() => window.__plot.frameMaterialInfo());
  const dMat = await q(() => window.__plot.materialInfo());
  check('frame/the-boundary-is-chrome-and-not-ink',
    JSON.stringify(drawnNoFrame) === JSON.stringify(drawnFramed)
    && fMat.normalBlending === true && dMat.additive === true
    && fMat.depthTest === false && fMat.fog === false,
    `${drawnFramed.total} segments drawn either way; the boundary composites NORMAL where the `
    + 'drawing is additive, so it cannot brighten a crossing');

  /* THE RECORDED LESSON, PAID FORWARD. A second LineMaterial on this page once
     shipped without the viewport's resolution and every one of its segments
     rasterised as a screen-filling quad — a stalled renderer, not a wrong
     picture. This is the third one. */
  check('frame/the-overlay-material-carries-the-viewport-resolution',
    JSON.stringify(fMat.resolution) === JSON.stringify(dMat.resolution)
    && fMat.resolution[0] > 0 && fMat.resolution[1] > 0,
    `the boundary's material holds ${fMat.resolution.join(' x ')}, the same the drawing's does`);

  /* A CONTROL NEVER MOVES THE CAMERA, and RESET FITS THE FRAME — the pair. The
     first is this page's own rule; the second is what makes the first
     survivable, because a boundary you just changed has to be reachable. */
  await reset();
  await view(VIEW);
  await q(() => window.__plot.settle());
  const camLoose = await q(() => window.__plot.cameraInfo());
  const drawnLoose = await q(() => window.__plot.drawnScreenBox());
  await set({ frame: 'on', frameShape: 'rect', frameRatio: '2:3', frameMargin: 6 });
  const camAfterFrame = await q(() => window.__plot.cameraInfo());
  const camMoved = Math.max(...[0, 1, 2].map(i =>
    Math.abs(camLoose.position[i] - camAfterFrame.position[i])));
  /* THE OVERFLOW IS ON WHICHEVER SIDE IT IS ON, not the one this check first
     assumed. With the stem off — which the gate's DEFAULTS say — the drawing is
     a wide flat disc, so the unframed fit is WIDTH-limited and a portrait
     boundary is overrun at the sides rather than at the foot. Measuring only
     the bottom read −107 px, which is the drawing sitting comfortably inside
     the very edge it was overrunning. */
  const overflowOf = (d, f) => Math.max(f.x - d.x, f.y - d.y,
    (d.x + d.width) - (f.x + f.width), (d.y + d.height) - (f.y + f.height));
  const overflow = overflowOf(drawnLoose, fBox);
  check('frame/a-frame-control-never-moves-the-camera',
    camMoved < 1e-4 * camLoose.distance && overflow > 20,
    `turning a 2:3 boundary on moved the camera ${camMoved.toExponential(2)} of a `
    + `${camLoose.distance.toFixed(1)} standoff — and the drawing fitted to the whole viewport `
    + `(${drawnLoose.width.toFixed(0)} x ${drawnLoose.height.toFixed(0)} px) now overruns the `
    + `${fBox.width.toFixed(0)} x ${fBox.height} boundary by ${overflow.toFixed(1)} px, which is `
    + 'what reset is for');

  const inside = (d, f, slack = 1) => d.x >= f.x - slack && d.y >= f.y - slack
    && d.x + d.width <= f.x + f.width + slack && d.y + d.height <= f.y + f.height + slack;
  await view(VIEW);
  const drawnFitted = await q(() => window.__plot.drawnScreenBox());
  await set({ frameRatio: '1:1', frameMargin: 0 });
  const squareBox = await q(() => window.__plot.frameBox());
  await view(VIEW);
  const drawnSquare = await q(() => window.__plot.drawnScreenBox());
  check('frame/reset-fits-the-drawing-inside-the-boundary',
    inside(drawnFitted, fBox) && inside(drawnSquare, squareBox)
    && fnear(squareBox.width, 800, 1e-6) && fnear(squareBox.x, 150, 1e-6),
    `at 2:3 the drawing lands in ${drawnFitted.width.toFixed(0)} x ${drawnFitted.height.toFixed(0)} `
    + `inside ${fBox.width.toFixed(0)} x ${fBox.height}; at 1:1 it lands in `
    + `${drawnSquare.width.toFixed(0)} x ${drawnSquare.height.toFixed(0)} inside `
    + `${squareBox.width} x ${squareBox.height}`);

  check('frame/the-read-out-names-the-box-and-says-the-ink-is-not-cropped',
    (await q(() => window.__plot.frameInfoText())).includes('800 x 800')
    && (await q(() => window.__plot.frameInfoText())).includes('ink outside the boundary is still drawn')
    && (await (async () => { await set({ frame: 'off' });
         return q(() => window.__plot.frameInfoText()); })()).includes('no frame'),
    'the panel gives the box in pixels and says the boundary marks the crop rather than '
    + 'applying it — clipping is the export session’s');

  /* THE IDENTITY, IN THE BROWSER. At an 800 x 800 viewport a 1:1 boundary at
     margin 0 IS the viewport, so `fitTangents` returns `tan0 * 1` on both axes
     and the framed fit has to be the very fit the unframed page performs. Part
     one asserts that arithmetic with `===`; here it is asserted on the camera
     the page actually lands on, to 1e-9 of the standoff, because damping never
     reaches exactly zero on this harness and no check here asks for the bit. */
  await page.setViewportSize({ width: 800, height: 800 });
  await reset();
  await view(VIEW);
  await q(() => window.__plot.settle());
  const camUnframed = await q(() => window.__plot.cameraInfo());
  await set({ frame: 'on', frameShape: 'rect', frameRatio: '1:1', frameMargin: 0 });
  const sqBox = await q(() => window.__plot.frameBox());
  await view(VIEW);
  await q(() => window.__plot.settle());
  const camFramed = await q(() => window.__plot.cameraInfo());
  const camDelta = Math.max(...[0, 1, 2].map(i =>
    Math.max(Math.abs(camUnframed.position[i] - camFramed.position[i]),
             Math.abs(camUnframed.target[i] - camFramed.target[i]))));
  check('frame/a-boundary-that-is-the-viewport-is-the-fit-the-page-shipped',
    fnear(sqBox.width, 800, 1e-9) && fnear(sqBox.height, 800, 1e-9)
    && fnear(sqBox.x, 0, 1e-9) && fnear(sqBox.y, 0, 1e-9)
    && camDelta < 1e-9 * camUnframed.distance,
    `on an 800 x 800 viewport a 1:1 boundary at margin 0 is the viewport exactly, and the `
    + `framed fit lands ${camDelta.toExponential(2)} from the unframed one on a `
    + `${camUnframed.distance.toFixed(1)} standoff`);
  await page.setViewportSize({ width: 1100, height: 800 });
  await reset();

  // =========================================================================
  /* POLARITY, ON THE PAGE. The one thing a colour swap would satisfy and this
     must not is the BLEND: inverting the colours alone gives a white rectangle,
     because additive ink on a white ground saturates on the first line. So the
     blend constant and the ground are asked SEPARATELY, and the crossing
     behaviour is measured on the framebuffer rather than inferred from either. */
  log('\n--- polarity ---');

  await reset({ depthDim: 0 });
  await view(VIEW);
  const polScreen = await q(() => window.__plot.polarityInfo());
  const pxScreen = await px();
  await set({ polarity: 'print' });
  const polPrint = await q(() => window.__plot.polarityInfo());
  const pxPrint = await px();

  check('polarity/print-changes-the-blend-mode-and-not-only-the-colours',
    polScreen.blendName === 'additive' && polPrint.blendName === 'multiply'
    && polScreen.blending !== polPrint.blending
    && polScreen.clearColor === 0x000000 && polPrint.clearColor === 0xffffff,
    `blending ${polScreen.blending} -> ${polPrint.blending} (additive -> multiply) and the `
    + `ground 0x000000 -> 0xffffff — a mutation that flips only the colours leaves the `
    + `first pair equal`);

  /* THE TWO REGIMES AGREE EXACTLY ON WHERE THERE IS INK, AND THEY CANNOT AGREE
     ON HOW MUCH — and asserting both is what this check did on its first run.
     "Is there ink at this pixel" is the same question either way, because the
     two framebuffer values sum to 255 at every coverage and no amount of
     accumulation moves a pixel back toward its own ground: an IDENTITY, over
     two counts of the same drawing at one camera, so the renderer's own noise
     cannot reach it.
     "Is this pixel saturated" is the other half and is precisely where the
     regimes differ — additive clips flat against white where multiply
     approaches black without arriving — so it is REPORTED here and asserted by
     `additive-clips-where-multiply-does-not` below, as an asymmetry rather than
     as an equality that happens to be nearly true.

     WHAT THIS CHECK IS BLIND TO, MEASURED RATHER THAN GUESSED: the ink LEVEL.
     MSAA quantises coverage to a handful of steps, so both thresholds sit in
     empty regions of the histogram — on this drawing the screen has exactly ONE
     populated bin between 1 and 39 (bin 38, 9,452 px) and print's mirror at 218
     holds the same 9,452. Any monotone transfer therefore inks the same
     PIXELS, and `the-print-transfer-is-a-plain-inversion` stays green here; the
     negative control is what said so, after that mutant claimed this check. The
     level is a law, it is asserted in part one, and part one reddens. Do not
     re-add the claim without first making this check able to see it. */
  check('polarity/the-two-regimes-agree-exactly-on-where-there-is-ink',
    pxScreen.ink === pxPrint.dark && pxScreen.ink > 10000,
    `screen ink ${pxScreen.ink} === print dark ${pxPrint.dark} exactly — the same lines, `
    + `the same coverage, read from opposite grounds. Where they part is saturation: `
    + `${pxScreen.dark} unsaturated on screen against ${pxPrint.ink} in print, a `
    + `${Math.abs(pxScreen.dark - pxPrint.ink)} px gap that is the clipping`);

  /* AND WHERE THEY ARE NOT COMPLEMENTS IS THE CROSSINGS, measured: additive
     CLIPS a great many pixels flat against white where multiply reaches the
     ground on almost none. Reported with the numbers, because "the two look
     equivalent" is exactly the claim this session was asked to test. */
  check('polarity/additive-clips-where-multiply-does-not',
    pxScreen.hist[255] > 20 * pxPrint.hist[0],
    `${pxScreen.hist[255]} pixels are clipped flat white on screen against `
    + `${pxPrint.hist[0]} driven to pure black in print — the same drawing, and the `
    + `asymmetry the panel prints rather than tunes away`);

  /* THE DEPTH DIM FADES INTO THE GROUND IT IS ON. A black fog under multiply
     would drive far lines toward dst*0 — the most distant lines would be the
     HEAVIEST thing on the page — and no blend-mode check can see that. */
  await set({ ...DEFAULTS, polarity: 'screen', depthDim: 55 });
  const fogScreen = await fogNow();
  const dimTextScreen = await drawTextNow();
  await set({ polarity: 'print' });
  const fogPrint = await fogNow();
  const dimTextPrint = await drawTextNow();
  check('polarity/the-depth-dim-fades-into-the-ground-it-is-on',
    fogScreen && fogPrint && fogScreen.color === 0x000000 && fogPrint.color === 0xffffff
    && dimTextScreen.includes('fading into the black')
    && dimTextPrint.includes('fading into the white'),
    `fog 0x${fogScreen.color.toString(16)} on black and 0x${fogPrint.color.toString(16)} `
    + `on white, and the read-out names the ground in both`);

  check('polarity/the-level-control-is-renamed-and-not-re-identified',
    polScreen.levelWord === 'brightness' && polPrint.levelWord === 'darkness'
    && polScreen.brightnessLabel === 'brightness' && polPrint.brightnessLabel === 'darkness'
    && (await q(() => window.__plot.pageControls().some(c => c.id === 'brightness'))),
    'the word on the label follows the polarity because the same number is light on '
    + 'black and ink on white; the control ID does not, because that is what every '
    + 'saved composition names');

  // =========================================================================
  /* THE EXPORTS. Both through the very functions the two buttons call. */
  log('\n--- export ---');

  await reset({ frame: 'on', frameShape: 'rect', frameRatio: '2:3', frameMargin: 6,
                stem: 'on', polarity: 'screen' });
  await view(VIEW);
  const rasterScreen = await q(() => window.__plot.exportRaster({ scale: 2 }));
  const boxNow = await q(() => window.__plot.exportBox());

  check('export/the-raster-is-not-empty-and-matches-the-frame-aspect',
    rasterScreen.stats.ink > 5000
    && Math.abs(rasterScreen.aspect - 2 / 3) < 0.002
    && rasterScreen.width === Math.round(boxNow.width * rasterScreen.scale)
    && rasterScreen.height === Math.round(boxNow.height * rasterScreen.scale),
    `${rasterScreen.width} x ${rasterScreen.height} px at ${rasterScreen.scale}x, aspect `
    + `${rasterScreen.aspect.toFixed(5)} against the boundary's 0.66667, carrying `
    + `${rasterScreen.stats.ink} px of ink`);

  /* AN EXPORT DRAWS THE INK AND NONE OF THE CHROME, and the witness is that it
     is GREY. Both polarities' ink and ground are neutral, so every pixel of a
     correct export has r === g === b exactly — where the frame's teal
     (0x6fb7ae), the stem handles' teal and the petal handles' amber (0xd6a15c)
     are neutral in no channel. One identity catches a leaked boundary, a leaked
     handle and a leaked selection highlight, and it needs no tolerance.
     RUN WITH ALL THREE ON SCREEN, or it is a test of an empty room. */
  await reset({ frame: 'on', stem: 'on', stemHandles: true, petalHandles: true,
                petalPick: 11, polarity: 'screen' });
  await view(VIEW);
  const chromeOn = await q(() => ({
    frame: window.__plot.frameDrawn(),
    sel: window.__plot.selectionColor().drawn,
    handles: window.__plot.handleScreenPos ? 1 : 1,
  }));
  const rasterChrome = await q(() => window.__plot.exportRaster({ scale: 1 }));
  await set({ polarity: 'print' });
  const rasterChromePrint = await q(() => window.__plot.exportRaster({ scale: 1 }));
  check('export/the-raster-carries-the-ink-and-none-of-the-chrome',
    chromeOn.frame === true && chromeOn.sel === true
    && rasterChrome.stats.notGrey === 0 && rasterChromePrint.stats.notGrey === 0
    && rasterChrome.stats.ink > 1000,
    `with the boundary drawn, a petal selected and both handle sets shown, `
    + `${rasterChrome.stats.notGrey} of ${rasterChrome.stats.pixels} exported pixels are `
    + `non-neutral on screen and ${rasterChromePrint.stats.notGrey} in print — the accent `
    + `is 0x6fb7ae and the petal handles 0xd6a15c, neither of them grey`);

  /* THE STROKES SCALE WITH THE IMAGE, and nothing above can see it if they do
     not. `linewidth` is divided by `resolution.y` in the shader, so an export
     that enlarges the buffer without enlarging the widths is the same picture
     drawn in hairlines — right aspect, right crop, non-zero ink, still grey.
     Measured as an ink FRACTION so the two scales are comparable at all: with
     the widths scaled it holds; without, the 2x image carries about half. */
  const rs1 = await q(() => window.__plot.exportRaster({ scale: 1 }));
  const rs2 = await q(() => window.__plot.exportRaster({ scale: 2 }));
  /* MASS PER PIXEL, NOT THE INK COUNT, and the first version of this check used
     the count and MISSED its own mutant — measured, ratio 0.871 against a clean
     0.956 where a halved stroke should read 0.5. A pixel count asks "does any
     ink reach here", which a hairline satisfies almost as well as a full
     stroke: it marks nearly the same pixels, just lighter. Total distance from
     the ground is what scales with the width. Same shape of error as the MSAA
     one in `the-two-regimes-agree-exactly-on-where-there-is-ink` — a threshold
     over coverage cannot see an AMOUNT. */
  const mass1 = rs1.stats.mass / rs1.stats.pixels, mass2 = rs2.stats.mass / rs2.stats.pixels;
  const frac1 = rs1.stats.ink / rs1.stats.pixels, frac2 = rs2.stats.ink / rs2.stats.pixels;
  check('export/the-strokes-scale-with-the-image',
    mass1 > 1 && Math.abs(mass2 / mass1 - 1) < 0.15,
    `ink mass per pixel ${mass1.toFixed(2)} at 1x and ${mass2.toFixed(2)} at 2x, a ratio of `
    + `${(mass2 / mass1).toFixed(3)} — unscaled widths halve it. (The pixel COUNT, which `
    + `cannot see this, moves only ${(frac1 * 100).toFixed(2)}% -> ${(frac2 * 100).toFixed(2)}%.)`);

  /* THE ELLIPSE'S CORNERS ARE TRANSPARENT AND THE RECTANGLE'S ARE NOT. Alpha
     rather than a ground fill, because alpha is the recoverable way round. */
  await set({ frameShape: 'ellipse' });
  const rasterEllipse = await q(() => window.__plot.exportRaster({ scale: 1 }));
  await set({ frameShape: 'rect' });
  const rasterRect = await q(() => window.__plot.exportRaster({ scale: 1 }));
  const areaRatio = rasterEllipse.stats.opaque / rasterEllipse.stats.pixels;
  check('export/the-ellipse-raster-is-transparent-outside-the-boundary',
    rasterEllipse.stats.cornerAlpha.every(a => a === 0)
    && rasterRect.stats.cornerAlpha.every(a => a === 255)
    && rasterRect.cleared === 0
    && Math.abs(areaRatio - Math.PI / 4) < 0.01,
    `all four ellipse corners read alpha 0 and all four rectangle corners 255; `
    + `${(areaRatio * 100).toFixed(1)}% of the ellipse image is opaque against `
    + `pi/4 = ${(100 * Math.PI / 4).toFixed(1)}%`);

  /* ONE PATH PER LINE STRIP. Fifty-five thousand segments emitted one path each
     is fifty-five thousand pen lifts, which is the difference between a plot
     that finishes and one that does not. Compared against the page's OWN count
     of what is drawn, set by set, so a second bloom instance would be counted
     rather than missed. */
  await reset({ frame: 'on', frameShape: 'rect', frameRatio: '2:3', frameMargin: 6,
                stem: 'on', polarity: 'print' });
  await view(VIEW);
  const sets = await q(() => window.__plot.drawnLineSetCounts());
  /* READ OFF THE EMITTED TEXT, NOT OFF WHAT THE PAGE SAYS ABOUT IT. A document
     dimensioned in screen pixels beside a report that still says millimetres is
     exactly the silent half of that mutation, and a check that asked the report
     would pass it. */
  const svg = await q(() => { const r = window.__plot.exportSvg();
    const attr = n => { const m = new RegExp(`\\s${n}="([^"]+)"`).exec(r.text); return m ? m[1] : null; };
    return { ...r, text: undefined, bytes: r.text.length,
             docWidth: attr('width'), docHeight: attr('height'),
             docViewBox: attr('viewBox'), docStroke: attr('stroke-width'),
             pathTags: (r.text.match(/<path /g) || []).length,
             moveTos: (r.text.match(/M-?[\d.]/g) || []).length,
             lineTos: (r.text.match(/L-?[\d.]/g) || []).length }; });
  const wantStrips = sets.reduce((a, x) => a + x.strips, 0);
  check('export/the-svg-emits-one-path-per-strip-and-not-one-per-segment',
    svg.paths === wantStrips && svg.pathTags === wantStrips && svg.dropped === 0
    && svg.moveTos === wantStrips && svg.lineTos === svg.points - wantStrips
    && svg.lineTos > 20 * wantStrips,
    `${sets.map(x => `${x.id} ${x.strips}`).join(' + ')} = ${wantStrips} strips -> `
    + `${svg.pathTags} <path> tags, ${svg.moveTos} pen-downs and ${svg.lineTos} draws over `
    + `${svg.points} points — per segment it would be ${svg.lineTos} pen-downs`);

  const docW = parseFloat(svg.docWidth), docH = parseFloat(svg.docHeight);
  const wantW = boxNow.width * svg.mmPerPx, wantH = boxNow.height * svg.mmPerPx;
  check('export/the-svg-carries-real-millimetres-from-the-grid-own-units',
    svg.unit === 'mm'
    // the DOCUMENT's own attributes, in the grid's own unit, agreeing with the
    // viewBox so one user unit is one millimetre
    && svg.docWidth.endsWith('mm') && svg.docHeight.endsWith('mm')
    && Math.abs(docW - wantW) < 0.01 && Math.abs(docH - wantH) < 0.01
    && svg.docViewBox === `0 0 ${docW} ${docH}`
    && Math.abs(docH / docW - 3 / 2) < 0.002 && docW > 50 && docW < 500
    // and the stroke is the weight CONVERTED, not the weight carried across
    && Math.abs(parseFloat(svg.docStroke)
                - 1.1 / (await q(() => window.devicePixelRatio || 1)) * svg.mmPerPx) < 1e-4,
    `the file says width="${svg.docWidth}" height="${svg.docHeight}" viewBox="${svg.docViewBox}" `
    + `stroke-width="${svg.docStroke}" — ${svg.mmPerPx.toFixed(5)} mm/px at the target plane, `
    + `and a weight of 1.1 px converted rather than relabelled`);

  /* AND THE CLIP ACTUALLY CLIPS, which is a claim about a RENDERED SVG and not
     about its text. Measured with the camera pushed IN so ink genuinely reaches
     the corners: at the home framing the drawing does not fill the box and an
     ellipse and a rectangle render identically, which would be a clip test that
     passes with no clip at all. */
  await reset({ frame: 'on', frameShape: 'ellipse', frameRatio: '1:1', frameMargin: 0,
                stem: 'on', polarity: 'screen' });
  await view(VIEW, 0.42);
  const svgEllipseText = await q(() => window.__plot.exportSvg().text);
  await set({ frameShape: 'rect' });
  const svgRectText = await q(() => window.__plot.exportSvg().text);
  const renderSvg = text => page.evaluate(async t => {
    const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(t)));
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res; img.onerror = () => rej(new Error('the SVG did not render')); img.src = url;
    });
    const cv = document.createElement('canvas');
    cv.width = 400; cv.height = 400;
    const g = cv.getContext('2d');
    // Magenta shows through wherever the SVG put nothing at all.
    g.fillStyle = '#ff00ff'; g.fillRect(0, 0, 400, 400);
    g.drawImage(img, 0, 0, 400, 400);
    const d = g.getImageData(0, 0, 400, 400).data;
    let empty = 0, cornerPix = 0, cornerEmpty = 0;
    for (let y = 0; y < 400; y++) for (let x = 0; x < 400; x++) {
      const i = (y * 400 + x) * 4;
      const mag = d[i] === 255 && d[i + 1] === 0 && d[i + 2] === 255;
      if (mag) empty++;
      if ((x < 40 || x > 359) && (y < 40 || y > 359)) { cornerPix++; if (mag) cornerEmpty++; }
    }
    return { empty, cornerPix, cornerEmpty, w: img.naturalWidth, h: img.naturalHeight };
  }, text);
  const renEllipse = await renderSvg(svgEllipseText);
  const renRect = await renderSvg(svgRectText);
  check('export/the-ellipse-svg-renders-and-actually-clips',
    renEllipse.w > 0 && renRect.w > 0
    && renEllipse.cornerEmpty === renEllipse.cornerPix
    && renRect.cornerEmpty === 0
    && Math.abs(renEllipse.empty / 160000 - (1 - Math.PI / 4)) < 0.01,
    `rendered at ${renEllipse.w}px: the ellipse leaves all ${renEllipse.cornerPix} corner `
    + `pixels empty and the rectangle none of them, and ${(100 * renEllipse.empty / 160000).toFixed(1)}% `
    + `of the ellipse image is outside the boundary against 1 - pi/4 = 21.5%`);

  /* AND IT LANDS WHERE THE DRAWING DOES. A projection that flipped y or lost
     the boundary's origin emits exactly the right number of paths, at exactly
     the right physical size, inside exactly the right clip — and draws the
     bloom upside down or off the page. So the emitted coordinates are mapped
     back into the page's own CSS-pixel space and compared against
     `drawnScreenBox()`, which walks the SAME population (the drawn grid strips
     and the stem's continuations) through the same camera. */
  await reset({ frame: 'on', frameShape: 'rect', frameRatio: '2:3', frameMargin: 6,
                stem: 'on', polarity: 'print' });
  await view(VIEW);
  const svgBox = await q(() => {
    const r = window.__plot.exportSvg();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const re = /[ML](-?[\d.]+) (-?[\d.]+)/g;
    let m;
    while ((m = re.exec(r.text))) {
      const x = +m[1], y = +m[2];
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return { x0, y0, x1, y1, mmPerPx: r.mmPerPx };
  });
  const svgCropBox = await q(() => window.__plot.exportBox());
  const onScreen = await q(() => window.__plot.drawnScreenBox());
  const backX0 = svgBox.x0 / svgBox.mmPerPx + svgCropBox.x;
  const backY0 = svgBox.y0 / svgBox.mmPerPx + svgCropBox.y;
  const backX1 = svgBox.x1 / svgBox.mmPerPx + svgCropBox.x;
  const backY1 = svgBox.y1 / svgBox.mmPerPx + svgCropBox.y;
  const off = Math.max(Math.abs(backX0 - onScreen.x), Math.abs(backY0 - onScreen.y),
                       Math.abs(backX1 - (onScreen.x + onScreen.width)),
                       Math.abs(backY1 - (onScreen.y + onScreen.height)));
  check('export/the-svg-lands-where-the-drawing-lands-on-screen',
    off < 0.05 && onScreen.width > 100,
    `the emitted paths map back to (${backX0.toFixed(2)}, ${backY0.toFixed(2)})..`
    + `(${backX1.toFixed(2)}, ${backY1.toFixed(2)}) against the drawing's own screen box `
    + `(${onScreen.x.toFixed(2)}, ${onScreen.y.toFixed(2)})..`
    + `(${(onScreen.x + onScreen.width).toFixed(2)}, ${(onScreen.y + onScreen.height).toFixed(2)}) `
    + `— ${off.toExponential(2)} px apart, which a flipped y or a lost origin could not be`);

  check('export/the-panel-says-what-the-two-artefacts-are',
    (await q(() => window.__plot.exportInfoText())).includes('flat strokes, no glow')
    && (await q(() => window.__plot.exportInfoText())).includes('one path each')
    && (await q(() => window.__plot.exportInfoText())).includes('mm'),
    'the SVG is an honestly different artefact and the panel says so, rather than '
    + 'letting anyone expect the screen image out of a plotter');

  await reset();

  // =========================================================================
  // THE COMPOSITION FILE, ON THE PAGE. Every claim here is about the ROUND
  // TRIP, field by field, because a restore that quietly drops one looks
  // exactly like a restore that did not — the page is plausible either way.
  log('\n--- the composition file ---');

  /* WHAT THE PAGE HOLDS, read from the page's own accessors and never from the
     document — so "it came back" is the page agreeing with itself before and
     after, rather than the file agreeing with the file. */
  const compSnapshot = () => q(() => ({
    frame: window.__plot.frame(),
    draw: window.__plot.state(),
    stem: window.__plot.stem(),
    bends: window.__plot.bends().map(b => ({ t: b.t, offset: b.offset })),
    /* SORTED BY INDEX, because the store is a Map and its ITERATION ORDER is
       not state. The page inserts an entry the first time a petal is selected,
       so a session that picked 7 then 2 iterates 7, 2; a restore inserts them
       in the file's own sorted order. Comparing unsorted made "did it come
       back" a claim about which petal was clicked first. */
    petals: window.__plot.petalWarpStore()
      .map(e => ({ index: e.index, along: e.along, across: e.across, bends: e.bends }))
      .sort((a2, b2) => a2.index - b2.index),
    selected: window.__plot.petalInfo().selected,
    camera: window.__plot.cameraInfo(),
    petalHandles: document.getElementById('petalHandles').checked,
  }));
  const diffState = (a2, b2) => {
    const out = [];
    for (const k of ['on', 'shape', 'ratio', 'margin']) if (a2.frame[k] !== b2.frame[k]) out.push(`frame.${k}`);
    for (const k of Object.keys(a2.draw)) if (a2.draw[k] !== b2.draw[k]) out.push(`draw.${k}`);
    for (const k of ['on', 'bundle', 'join', 'length', 'droopDeg', 'neck', 'showHandles']) {
      if (a2.stem[k] !== b2.stem[k]) out.push(`stem.${k}`);
    }
    if (JSON.stringify(a2.bends) !== JSON.stringify(b2.bends)) out.push('stem.bends');
    if (JSON.stringify(a2.petals) !== JSON.stringify(b2.petals)) out.push('petals');
    if (a2.selected !== b2.selected) out.push('selection');
    if (a2.petalHandles !== b2.petalHandles) out.push('view.petalHandles');
    for (const i of [0, 1, 2]) {
      if (Math.abs(a2.camera.position[i] - b2.camera.position[i]) > 1e-6) out.push(`camera.position[${i}]`);
      if (Math.abs(a2.camera.target[i] - b2.camera.target[i]) > 1e-6) out.push(`camera.target[${i}]`);
    }
    return out;
  };

  /* STATE A: every control off its default, TWO petals warped differently, and
     a real bend on each of the two handle sets — a bend offset is not a control
     value, so the only honest way to have one is to drag for it. */
  const RT_PETAL_A = 7, RT_PETAL_B = 2;
  await petalOn({ petalPick: RT_PETAL_A, petalAlong: 1.9, petalAcross: 0.7 });
  await pick(RT_PETAL_B);
  await set({ petalAlong: 0.6, petalAcross: 2.2 });
  await pick(RT_PETAL_A);
  await set({ frame: 'on', frameShape: 'ellipse', frameRatio: '4:5', frameMargin: 18,
              families: 'both', uDensity: 5, vDensity: 8, weight: 2.4, brightness: 62,
              depthDim: 20, stem: 'on', stemBundle: 1.6, stemJoin: 30, stemLength: 240,
              stemDroop: 35, stemNeck: 90, stemHandles: true, petalHandles: false });
  await view(VIEW);
  await q(() => document.getElementById('bendAdd').click());     // four stem bends, not three
  const stemGrab = await q(() => window.__plot.handleScreenPos(1));
  if (stemGrab) {
    await page.mouse.move(stemGrab.x, stemGrab.y);
    await page.mouse.down();
    await page.mouse.move(stemGrab.x + 70, stemGrab.y - 20, { steps: 6 });
    await page.mouse.up();
  }
  await set({ petalHandles: true });
  const petalGrab = await q(() => window.__plot.petalHandleScreenPos(0));
  if (petalGrab) {
    await page.mouse.move(petalGrab.x, petalGrab.y);
    await page.mouse.down();
    await page.mouse.move(petalGrab.x + 40, petalGrab.y - 35, { steps: 6 });
    await page.mouse.up();
  }
  await set({ petalHandles: false });
  await q(() => window.__plot.settle());

  const stateA = await compSnapshot();
  const savedText = await q(() => window.__plot.compositionText());
  const savedDoc = JSON.parse(savedText);
  const aBendOffsets = stateA.bends.filter(b => b.offset.some(n => n !== 0)).length;
  const aPetalOffsets = stateA.petals.reduce((n, p2) =>
    n + p2.bends.filter(b => b.offset.some(m => m !== 0)).length, 0);

  /* THE DOCUMENT DESCRIBES THE PAGE AS IT STANDS — gathered from the right
     place. A writer that read the wrong control would round-trip perfectly and
     still be wrong, so this compares the file against the page's own readers
     before anything is restored. */
  const gathered = [];
  for (const f of FL.DRAW_FIELDS) {
    const want = f.key === 'brightness' || f.key === 'depthDim'
      ? stateA.draw[f.key] * 100 : stateA.draw[f.key];
    if (savedDoc.draw[f.key] !== want) gathered.push(`draw.${f.key}`);
  }
  for (const [k, v] of [['on', stateA.stem.on ? 'on' : 'off'], ['bundle', stateA.stem.bundle],
                        ['join', stateA.stem.join], ['length', stateA.stem.length],
                        ['droopDeg', stateA.stem.droopDeg], ['neck', stateA.stem.neck]]) {
    if (savedDoc.instances[0].stem[k] !== v) gathered.push(`stem.${k}`);
  }
  if (savedDoc.frame.on !== 'on' || savedDoc.frame.shape !== 'ellipse'
      || savedDoc.frame.ratio !== '4:5' || savedDoc.frame.margin !== 18) gathered.push('frame');
  if (savedDoc.selection.petal !== stateA.selected) gathered.push('selection.petal');
  if (JSON.stringify(savedDoc.camera.position) !== JSON.stringify(stateA.camera.position)) gathered.push('camera.position');
  if (savedDoc.view.petalHandles !== stateA.petalHandles) gathered.push('view.petalHandles');
  /* THE PETAL ENTRIES BY VALUE, NOT BY COUNT — and this check shipped as a
     count. `the-petal-warps-are-written-globally` leaves the count untouched:
     every entry is still written, each carrying the FIRST entry's numbers, so
     the file describes a bloom the page is not drawing and a length comparison
     sails straight past it (measured — it did). Strengthened rather than
     unclaimed, because "the document describes the page as it stands" is
     exactly the claim a wrong per-petal value breaks. */
  const savedPetals = savedDoc.instances[0].petals;
  if (savedPetals.length !== stateA.petals.length) gathered.push('petals.length');
  for (const want of stateA.petals) {
    const got = savedPetals.find(p2 => p2.index === want.index);
    if (!got) { gathered.push(`petal ${want.index} is not in the file`); continue; }
    if (got.along !== want.along || got.across !== want.across) gathered.push(`petal ${want.index} scales`);
    if (JSON.stringify(got.bends) !== JSON.stringify(want.bends)) gathered.push(`petal ${want.index} bends`);
  }
  check('save/the-document-describes-the-page-as-it-stands',
    gathered.length === 0 && savedDoc.format === FL.FORMAT && savedDoc.version === FL.VERSION
    && savedDoc.instances.length === 1
    && savedDoc.instances[0].grid.petals === fileCensus.petals,
    gathered.length ? `differed: ${gathered.join(', ')}`
      : `${(savedText.length / 1024).toFixed(1)} KB · ${savedDoc.instances[0].petals.length} petal `
        + `entries · ${savedDoc.instances[0].stem.bends.length} stem bends · grid identity names `
        + `${savedDoc.instances[0].grid.petals} petals and ${savedDoc.instances[0].grid.segments} segments`);

  check('save/a-real-drag-put-an-offset-on-both-bend-sets',
    aBendOffsets > 0 && aPetalOffsets > 0
    && savedDoc.instances[0].stem.bends.some(b => b.offset.some(n => n !== 0))
    && savedDoc.instances[0].petals.some(p2 => p2.bends.some(b => b.offset.some(n => n !== 0))),
    `${aBendOffsets} stem bend${aBendOffsets === 1 ? '' : 's'} and ${aPetalOffsets} petal bend`
    + `${aPetalOffsets === 1 ? '' : 's'} carry a displacement — a bend offset is not a control `
    + 'value, so the only honest way to have one is to drag for it');

  /* STATE B: every field moved somewhere ELSE, so a restore that leaves a field
     alone is a restore that failed. Both petals rested and a third selected,
     the bend counts changed, the camera moved. */
  await petalOn({ petalPick: 13, petalAlong: 1.3, petalAcross: 1.7 });
  await set({ frame: 'off', frameShape: 'rect', frameRatio: '16:9', frameMargin: 3,
              families: 'v', uDensity: 12, vDensity: 3, weight: 0.6,
              polarity: 'print', brightness: 15,
              depthDim: 90, stem: 'off', stemBundle: 0.1, stemJoin: 60, stemLength: 90,
              stemDroop: -60, stemNeck: 15, stemHandles: false, petalHandles: true });
  await q(() => { document.getElementById('bendRemove').click();
                  document.getElementById('bendReset').click(); });
  await view([1, 0.1, 0.2]);
  await q(() => window.__plot.settle());
  const stateB = await compSnapshot();
  const movedEverywhere = diffState(stateA, stateB);

  const restored = await page.evaluate(t => window.__plot.loadComposition(t, 'round-trip.json'), savedText);
  await q(() => window.__plot.settle());
  const stateC = await compSnapshot();
  const backDiff = diffState(stateA, stateC);
  check('restore/every-field-comes-back',
    restored === true && backDiff.length === 0 && movedEverywhere.length >= 12,
    backDiff.length ? `did not come back: ${backDiff.join(', ')}`
      : `${movedEverywhere.length} fields were moved away and every one came back — `
        + `${stateA.petals.length} petal entries, ${stateA.bends.length} stem bends, the frame, `
        + 'the draw settings, the stem, the selection and the camera');

  const compState = await q(() => window.__plot.compositionState());
  check('restore/a-clean-round-trip-reports-nothing-missing',
    compState.action === 'restored' && compState.notes.length === 0
    && compState.mismatch === null && compState.dropped === 0
    && (await q(() => window.__plot.compositionReadOut())).includes('every field in the file was read'),
    'a departure from a clean read — missing, unknown, clamped, re-ordered, dropped — is a note, '
    + 'so "nothing to report" is a measurement and not a hope');

  /* AND THE POLARITY COMES BACK AS A RENDER, NOT AS A SELECT. Restoring the
     control's value while the blend mode stayed where it was is a silent
     partial restore of exactly the kind this format exists to prevent — and it
     is invisible in every field-by-field comparison, because the field is
     right. So the blend constant and the clear colour are read back from the
     renderer itself, on both sides of the trip. */
  const polAfterRestore = await q(() => window.__plot.polarityInfo());
  check('restore/the-polarity-comes-back-as-a-blend-mode-and-not-only-as-a-value',
    stateA.draw.polarity === 'screen' && stateB.draw.polarity === 'print'
    && stateC.draw.polarity === 'screen'
    && polAfterRestore.blendName === 'additive' && polAfterRestore.clearColor === 0x000000,
    `the control went screen -> print -> screen, and the renderer came back to `
    + `${polAfterRestore.blendName} on 0x${polAfterRestore.clearColor.toString(16).padStart(6, '0')} `
    + `— a restore that wrote the select and not the render would pass every `
    + `field-by-field comparison here`);

  check('restore/two-petals-come-back-with-their-own-warps',
    stateC.petals.length === stateA.petals.length
    && JSON.stringify(stateC.petals.find(p2 => p2.index === RT_PETAL_A))
       === JSON.stringify(stateA.petals.find(p2 => p2.index === RT_PETAL_A))
    && JSON.stringify(stateC.petals.find(p2 => p2.index === RT_PETAL_B))
       === JSON.stringify(stateA.petals.find(p2 => p2.index === RT_PETAL_B))
    && stateA.petals.find(p2 => p2.index === RT_PETAL_A).along
       !== stateA.petals.find(p2 => p2.index === RT_PETAL_B).along
    && !stateC.petals.some(p2 => p2.index === 13),
    // Same reason: a mutation that shifts or drops an entry is exactly what this
    // check is for, so the detail may not assume the entry is there.
    `petal ${RT_PETAL_A} came back at ${(stateC.petals.find(p2 => p2.index === RT_PETAL_A)
      || { along: 'nothing' }).along}x along and petal ${RT_PETAL_B} at `
    + `${(stateC.petals.find(p2 => p2.index === RT_PETAL_B) || { along: 'nothing' }).along}x, each `
    + `with its own bends — the store holds ${stateC.petals.map(p2 => p2.index).join(',')} `
    + 'and petal 13, which state B had touched, is gone rather than kept');

  check('restore/the-camera-and-the-selection-come-back',
    stateC.selected === RT_PETAL_A && stateB.selected !== RT_PETAL_A
    && Math.abs(stateC.camera.distance - stateA.camera.distance) < 1e-6
    && [0, 1, 2].every(i => Math.abs(stateC.camera.target[i] - stateA.camera.target[i]) < 1e-6),
    `selection ${stateA.selected} -> ${stateB.selected} -> ${stateC.selected}; the standoff came `
    + `back to ${stateC.camera.distance.toFixed(4)} from ${stateB.camera.distance.toFixed(4)}`);

  /* A FIELD THE FILE DOES NOT CARRY LEAVES THE PAGE ALONE AND IS NAMED. The
     alternative — defaulting it — is a page that LOOKS restored, which is the
     whole failure this format is built against. */
  const holed = JSON.parse(savedText);
  delete holed.draw.weight;
  delete holed.instances[0].stem.join;
  const beforeHole = await compSnapshot();
  await page.evaluate(t => window.__plot.loadComposition(t, 'holed.json'), JSON.stringify(holed));
  const afterHole = await compSnapshot();
  const holeNotes = (await q(() => window.__plot.compositionState())).notes;
  check('restore/a-field-the-file-does-not-carry-leaves-the-page-alone-and-is-named',
    afterHole.draw.weight === beforeHole.draw.weight
    && afterHole.stem.join === beforeHole.stem.join
    && holeNotes.filter(n => n.kind === 'missing').length === 2
    && (await q(() => window.__plot.compositionReadOut())).includes('missing'),
    `weight stayed at ${afterHole.draw.weight} and join at ${afterHole.stem.join}, and the panel `
    + `names both: ${holeNotes.map(n => n.text.split(' — ')[0]).join(' · ')}`);

  /* THE WORST FAILURE THIS FORMAT COULD HAVE. A composition restored against a
     different bundle must SAY so, field by field, because warps are applied by
     petal INDEX and a silently wrong petal is indistinguishable from a right
     one in the picture. */
  await page.evaluate(t => window.__plot.loadComposition(t, 'ok.json'), savedText);
  const foreign = JSON.parse(savedText);
  foreign.instances[0].grid.name = 'some-other-bloom.glb';
  foreign.instances[0].grid.petals = 40;
  foreign.instances[0].grid.segments = 99999;
  await page.evaluate(t => window.__plot.loadComposition(t, 'foreign.json'), JSON.stringify(foreign));
  const foreignState = await q(() => window.__plot.compositionState());
  const foreignOut = await q(() => window.__plot.compositionReadOut());
  // NULL-SAFE, because the mutation this check exists for is precisely the one
  // that makes `mismatch` null — and a detail string that assumes its own
  // premise takes the sweep down instead of going red.
  const fm = foreignState.mismatch || [];
  check('restore/a-composition-from-a-different-grid-is-named-field-by-field',
    foreignState.mismatch !== null
    && fm.map(d => d.field).sort().join(',') === 'name,petals,segments'
    && (fm.find(d => d.field === 'petals') || {}).saved === 40
    && foreignOut.includes('DIFFERENT grid') && foreignOut.includes('some-other-bloom.glb')
    && foreignState.petals === stateA.petals.length,
    (foreignState.mismatch === null
      ? 'the panel reported NO mismatch at all'
      : `${fm.length} fields differ and all are named on the panel (${fm
          .map(d => `${d.field} ${JSON.stringify(d.saved)}->${JSON.stringify(d.current)}`).join(', ')})`)
    + '; the warps were still applied, by index, and the panel says to check them');

  const orphan = JSON.parse(savedText);
  orphan.instances[0].petals[0] = { ...orphan.instances[0].petals[0], index: 999 };
  await page.evaluate(t => window.__plot.loadComposition(t, 'orphan.json'), JSON.stringify(orphan));
  const orphanState = await q(() => window.__plot.compositionState());
  const orphanStore = await q(() => window.__plot.petalWarpStore());
  check('restore/a-warp-for-a-petal-this-grid-does-not-have-is-dropped-and-counted',
    orphanState.dropped === 1 && orphanState.petals === stateA.petals.length - 1
    && !orphanStore.some(e => e.index === 999)
    && orphanStore.length === stateA.petals.length - 1
    && orphanState.notes.some(n => n.kind === 'dropped' && n.text.includes('999')),
    `petal 999 was dropped and counted, not folded onto another petal — ${orphanStore.length} `
    + `entries where the file named ${stateA.petals.length}`);

  // Back to a clean restore before the button and the drop are exercised.
  await page.evaluate(t => window.__plot.loadComposition(t, 'ok.json'), savedText);

  /* THE BUTTON AND THE SERIALISER ARE ONE OWNER. The download is captured for
     real, so this is not "a function returned a string" — it is the bytes a
     visitor's browser receives. */
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    page.click('#saveComposition'),
  ]);
  const dlPath = await download.path();
  const dlText = dlPath ? readFileSync(dlPath, 'utf8') : '';
  const dlName = download.suggestedFilename();
  const savedHook = await q(() => window.__plot.compositionSaved());
  const nowText = await q(() => window.__plot.compositionText());
  const stripStamp = t => t.replace(/"savedAt": "[^"]*"/, '"savedAt": "-"');
  check('save/the-button-writes-what-the-page-serialises',
    dlText.length > 0 && stripStamp(dlText) === stripStamp(nowText)
    && savedHook && savedHook.text === dlText
    && /^plot-composition-\d{8}-\d{4}\.json$/.test(dlName),
    `the browser received ${(dlText.length / 1024).toFixed(1)} KB as ${dlName}, byte for byte `
    + 'what the page serialises (its timestamp aside)');

  /* A COMPOSITION DROPPED ON THE PAGE LOADS, through a real File on a real
     DataTransfer and a real dispatched DragEvent — the same path the .glb drop
     already takes, and the reason the drop handler now has to tell the two
     kinds of file apart. */
  await set({ ...DEFAULTS });
  await view([1, 0.1, 0.2]);
  const beforeDrop = await compSnapshot();
  await page.evaluate(async t => {
    const dt = new DataTransfer();
    dt.items.add(new File([t], 'dropped.json', { type: 'application/json' }));
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 400));
  }, savedText);
  await q(() => window.__plot.settle());
  const afterDrop = await compSnapshot();
  const dropState = await q(() => window.__plot.compositionState());
  const dropDiff = diffState(stateA, afterDrop);
  const dropMoved = diffState(stateA, beforeDrop);
  check('restore/a-composition-dropped-on-the-page-is-loaded',
    dropState && dropState.action === 'restored' && dropState.name === 'dropped.json'
    && dropDiff.length === 0 && dropMoved.length > 0
    && (await q(() => window.__plot.source())) === GRID.split('/').pop(),
    `${dropState ? dropState.action : 'nothing'} ${dropState ? dropState.name : ''}: `
    + `${dropMoved.length} fields were away and ${dropDiff.length} did not come back`
    + `${dropDiff.length ? ` (${dropDiff.join(', ')})` : ''} — a .json goes to the composition `
    + `reader and a .glb to the grid reader, and the grid on screen is still `
    + `${await q(() => window.__plot.source())}`);

  /* AND A FILE THAT IS NOT A COMPOSITION CHANGES NOTHING AT ALL. Same contract
     the grid loader already keeps: a refusal is reported and what is on screen
     is left exactly as it was. */
  /* A CHECK THAT CANNOT ANSWER OWES A RED LINE AND A REASON, NOT A THROW — the
     harness has a net under it, and this check fell into it. The first version
     registered a check name PER FAILING FILE (so a name existed only under a
     mutant, which the stale-name guard cannot see either way) and then quoted
     `junkState.error.slice(...)` in its detail. Under
     `a-newer-version-is-read-anyway` the v99 file is ACCEPTED, so `error` is
     null, and the detail string threw and took the whole sweep down on its
     second mutant. Every outcome is collected first and the detail is
     null-safe; the claim is over all three files rather than the last one. */
  const beforeJunk = await compSnapshot();
  const junkPix = await px();
  const junkTried = [];
  for (const [label, body] of [['not JSON', 'this is not json at all'],
                               ['a JSON object that is not a composition', '{"hello":"world"}'],
                               ['a newer version', JSON.stringify({ ...savedDoc, version: 99 })]]) {
    await page.evaluate(t => window.__plot.loadComposition(t, 'junk.json'), body);
    const st2 = await q(() => window.__plot.compositionState());
    junkTried.push({ label, action: st2 ? st2.action : 'nothing', error: st2 ? st2.error : null });
  }
  const afterJunk = await compSnapshot();
  const junkPix2 = await px();
  const junkReadOut = await q(() => window.__plot.compositionReadOut());
  const refusedAll = junkTried.every(j => j.action === 'refused' && typeof j.error === 'string');
  check('restore/a-file-that-is-not-a-composition-is-refused-and-nothing-moves',
    refusedAll && diffState(beforeJunk, afterJunk).length === 0
    && junkPix.ink === junkPix2.ink && junkReadOut.includes('left exactly as it was'),
    junkTried.map(j => `${j.label} -> ${j.action}`).join(' · ')
    + (refusedAll ? ` — the last says "${String(junkTried[2].error).slice(0, 50)}…"` : '')
    + ` — and the page held ${junkPix2.ink} ink pixels throughout`);

  /* EVERY CONTROL THE PANELS HOLD IS EITHER A FIELD OF THE FILE OR A NAMED
     EXCEPTION. This is the one form of silent partial restore no round-trip
     check can see: a control added later that nobody ever saved round-trips
     perfectly, because it is not in the file to be compared. */
  const EXEMPT = {
    gridFile: 'a file input — the grid is identified in the file, never embedded in it',
    compositionFile: 'a file input — it is how a composition gets here',
    petalPick: 'the selection, which the file carries at the top level as one cursor',
  };
  const pageControls = await q(() => window.__plot.pageControls());
  const covered = new Set([...FL.FRAME_FIELDS, ...FL.DRAW_FIELDS, ...FL.VIEW_FIELDS,
                           ...FL.STEM_FIELDS, ...FL.PETAL_FIELDS].map(f => f.control));
  const uncovered = pageControls.filter(c => !covered.has(c.id) && !(c.id in EXEMPT));
  check('save/every-control-on-the-page-is-a-field-of-the-file-or-a-named-exception',
    uncovered.length === 0 && pageControls.length === covered.size + Object.keys(EXEMPT).length,
    uncovered.length ? `not saved anywhere: ${uncovered.map(c => c.id).join(', ')}`
      : `${pageControls.length} controls: ${covered.size} are fields of the file and `
        + `${Object.keys(EXEMPT).length} are named exceptions (${Object.keys(EXEMPT).join(', ')})`);

  await set({ ...DEFAULTS });

  // --- the panels ----------------------------------------------------------
  const panels = await q(() => [...document.querySelectorAll('details.panel')]
    .map(d => ({ id: d.id, summary: d.querySelector('summary').textContent.trim(), open: d.open })));
  check('panels/every-panel-is-present-and-is-a-details',
    panels.length === 7 && panels.every(p => p.open)
    && panels.map(p => p.summary).join('|')
       === 'LOAD GRID|COMPOSITION|GRID|FRAME|DRAW|PETAL|STEM',
    panels.map(p => `${p.summary}(${p.id})`).join(' · '));

  // Driven through `brightness`, which no mutation in this file touches, so
  // this check reports on the panel and not on whatever else is broken. It
  // asserts the control reached the MATERIAL and that the frame was redrawn.
  await reset();
  const beforeCollapse = await q(() => window.__plot.materialInfo());
  const pixCollapseBefore = await px();
  await q(() => { document.getElementById('plot-draw').open = false; });
  await set({ ...DEFAULTS, brightness: 80 });
  const whileCollapsed = await q(() => window.__plot.materialInfo());
  const pixCollapseAfter = await px();
  const stillShut = await q(() => document.getElementById('plot-draw').open);
  await q(() => { document.getElementById('plot-draw').open = true; });
  check('panels/a-collapsed-panel-still-drives-the-draw',
    stillShut === false && Math.abs(whileCollapsed.colorLinear - 0.8) < 1e-6
    && whileCollapsed.colorLinear !== beforeCollapse.colorLinear
    && pixCollapseAfter.hash !== pixCollapseBefore.hash,
    `brightness ${beforeCollapse.colorLinear} -> ${whileCollapsed.colorLinear} with DRAW shut, `
    + 'and the framebuffer changed');

  // --- cost ----------------------------------------------------------------
  await reset({ families: 'both', uDensity: 12, vDensity: 12 });
  const frames = await q(() => { window.__plot.settle();
    const a = []; for (let i = 0; i < 15; i++) a.push(window.__plot.renderNow()); return a; });
  const median = frames.slice().sort((a, b) => a - b)[Math.floor(frames.length / 2)];
  check('cost/the-frame-is-trivial', median < 5,
    `${median.toFixed(2)} ms median over 15 settled frames at all `
    + `${fileCensus.census.segments} segments (worst ${Math.max(...frames).toFixed(2)} ms)`);

  await set({ ...DEFAULTS, stem: 'on' });
  await view(VIEW);
  const stemFrames = await q(() => { window.__plot.settle();
    const a = []; for (let i = 0; i < 15; i++) a.push(window.__plot.renderNow()); return a; });
  const stemMedian = stemFrames.slice().sort((a, b) => a - b)[Math.floor(stemFrames.length / 2)];
  const stemSeg = (await q(() => window.__plot.stemInfo())).segments;
  check('cost/the-stem-is-still-trivial', stemMedian < 5,
    `${stemMedian.toFixed(2)} ms median with ${stemSeg} stem segments on top of the grid's `
    + `${fileCensus.census.segments} (worst ${Math.max(...stemFrames).toFixed(2)} ms)`);
  await set({ ...DEFAULTS });

  check('page/no-errors', errs.length === 0, errs.join(' | '));
  if (!mutant) {
    log('\n--- GRID ---\n' + await q(() => window.__plot.gridText()));
    log('\n--- DRAW ---\n' + await q(() => window.__plot.drawText()));
  }
  await ctx.close();
  return { checks, details, errs, ok: [...checks.values()].every(Boolean) };
}

// ===========================================================================
const main = await run({});
console.log('\npage errors:', main.errs.length ? main.errs : 'none');
const failed = [...main.checks].filter(([, v]) => !v).map(([k]) => k);
console.log(`\n${main.checks.size} checks, ${failed.length} failed${failed.length ? ': ' + failed.join(', ') : ''}`);

let mutantsOK = true;
if (NEG) {
  console.log('\n=== negative control ===');
  const wanted = ONLY ? ONLY.split(',') : null;
  /* A CLAIM THAT NAMES NO CHECK CAN NEVER FIRE, AND READS AS "stayed green" —
     which is indistinguishable from a mutation the gate is blind to. This
     session renamed `readout/…-and-the-neighbours` to `…-and-the-warped-count`
     and left the old name on a mutant's list, where it cost a twenty-minute
     sweep to find. The base run has just named every check there is, so this is
     the first moment the claim can be checked at all — and it is checked for
     EVERY mutant, not only the ones this invocation is about to run, because a
     stale name in a mutant `--mutant=` skips is exactly the one nobody sees. */
  const known = new Set(main.checks.keys());
  const stale = MUTANTS.flatMap(m =>
    m.breaks.filter(c => !known.has(c)).map(c => `${m.id} claims ${c}`));
  if (stale.length) {
    console.log(`  [FAIL] ${stale.length} claimed check${stale.length === 1 ? '' : 's'} `
      + `name${stale.length === 1 ? 's' : ''} nothing the gate runs:`);
    for (const line of stale) console.log(`         ${line}`);
    mutantsOK = false;
  }
  for (const m of MUTANTS) {
    if (wanted && !wanted.includes(m.id)) continue;
    const src = readFileSync(path.join(ROOT, m.file), 'utf8');
    if (!src.includes(m.from)) {
      console.log(`  [FAIL] ${m.id}: mutation did not apply — the source it edits has moved`);
      mutantsOK = false; continue;
    }
    OVERRIDE = { file: m.file, text: src.replace(m.from, m.to) };
    /* A MUTANT THAT CRASHES THE GATE IS THAT MUTANT'S FAILURE, NOT THE SWEEP'S.
       Measured: one mutation leaves two thirds of a petal's strips unplaced, a
       check reached into their missing stations, and the THROW took the whole
       run down on its second mutant — thirty minutes to find out nothing. A
       check that cannot answer owes a red line and a reason; a harness that
       cannot survive one owes the same. The checks were fixed; this is the net
       under them. */
    let r;
    try {
      r = await run({ mutant: m.id });
    } catch (e) {
      console.log(`  [FAIL] ${m.id.padEnd(46)} THREW: ${(e && e.message) || e}`);
      console.log('         a check reached into state this mutation removed — fix the '
        + 'check to report rather than throw');
      OVERRIDE = null;
      mutantsOK = false;
      continue;
    }
    OVERRIDE = null;
    const red = [...r.checks].filter(([, v]) => !v).map(([k]) => k);
    const missed = m.breaks.filter(k => !red.includes(k));
    const extra = red.filter(k => !m.breaks.includes(k));
    const ok = missed.length === 0 && extra.length === 0;
    if (!ok) mutantsOK = false;
    console.log(`  [${ok ? 'ok  ' : 'FAIL'}] ${m.id.padEnd(46)} red: ${red.length ? red.join(', ') : '(none)'}`);
    if (missed.length) console.log(`         MISSED (stayed green): ${missed.join(', ')}`);
    if (extra.length) console.log(`         UNCLAIMED (also red): ${extra.join(', ')}`);
    if (!ok) for (const k of [...missed, ...extra]) console.log(`           ${k}: ${r.details.get(k) || '(no detail)'}`);
  }
} else {
  console.log('\n(negative control not run — pass --negative-control to falsify every assertion above)');
}

await browser.close();
server.close();
const ok = main.ok && mutantsOK;
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
