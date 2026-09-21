#!/usr/bin/env node
// verify-scene.mjs — the behaviour gate for /scene: the shell, and scene 1.
//
//   node tools/verify-scene.mjs [--negative-control] [--shots <dir>]
//
// NOTHING IN CI COVERS THIS PAGE. Every GitHub Actions workflow in this repo is
// path-filtered to flower*/bloom*, so scene* is gated by this file and by
// nothing else. Run it by hand before calling a /scene change done.
//
// IT RUNS IN TWO HALVES, for the reason /plot's gate gives: on a live pond a
// WRONG simulation still draws a plausible picture. Part one drives the shipped
// modules in Node over fixtures whose answer is WRITTEN DOWN — and written down
// from the BRIEF (0.2 a click, a 2 s ramp, a 3 s hold, a 10 s decay, 3 scroll
// actions, 6 s of wind decay, 3-7 koi), never imported from the module under
// test, because a clause that reads its expected value out of the thing it is
// checking measures its own consistency and nothing else. Part two drives the
// real page in a real browser and measures what the DOM and the scene's own
// reported state actually say.
//
// --negative-control IS REQUIRED BEFORE QUOTING A PASS from a changed harness.
// It applies 22 deliberate defects — each one a mistake that was either
// actually made while building this, or is the obvious way to break a claim —
// and fails if a mutation does not apply, if a check the mutant NAMES stays
// green, or if the base pass was not clean. A mutation that cannot be applied
// is reported rather than skipped: a refactor silently disarms a mutant, and
// that is the failure mode a sweep is least likely to notice.
//
// Playwright is a global install in this dev container, not a project
// dependency; it is resolved from NODE_PATH / the usual global roots.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCENE = path.join(REPO, 'scene');

// Node imports a mutated module by writing it beside its siblings, because the
// scene modules import each other by relative path and a copy anywhere else
// resolves to nothing. The name is fixed and swept at start as well as in a
// finally, so a crashed run cannot leave one behind.
const MUTANT_PREFIX = '__mutant__';

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const roots = [
    ...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []),
    '/opt/node22/lib/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules',
  ].filter(Boolean);
  for (const root of roots) {
    const entry = path.join(root, 'playwright', 'index.js');
    if (fs.existsSync(entry)) return require(entry);
  }
  try { return require('playwright'); }
  catch {
    console.error('Could not resolve playwright. Try:\n  NODE_PATH=/opt/node22/lib/node_modules node tools/verify-scene.mjs');
    process.exit(2);
  }
}

// The MODULE_TYPELESS_PACKAGE_JSON notice fires for every scene module this
// gate imports: package.json has no "type", and it is there so Netlify installs
// the Function's one dependency, not to describe these files. Silenced here
// rather than changed there.
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ModuleTypelessPackageJsonWarning') return;
  console.warn(w.stack || String(w));
});

// ---------------------------------------------------------------- harness ---
const results = [];
let section = '';
const setSection = (s) => { section = s; };

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function check(name, fn) {
  const full = `${section}/${slug(name)}`;
  try {
    const detail = fn();
    results.push({ name: full, ok: true, detail: detail || '' });
  } catch (err) {
    results.push({ name: full, ok: false, detail: err && err.message ? err.message : String(err) });
  }
}

async function checkAsync(name, fn) {
  const full = `${section}/${slug(name)}`;
  try {
    const detail = await fn();
    results.push({ name: full, ok: true, detail: detail || '' });
  } catch (err) {
    results.push({ name: full, ok: false, detail: err && err.message ? err.message : String(err) });
  }
}

const near = (a, b, tol, what) => {
  if (!(Math.abs(a - b) <= tol)) throw new Error(`${what}: ${a} is not within ${tol} of ${b}`);
};

// ------------------------------------------------------------ mutations ----
// Each names the checks it MUST redden. A check outside that list going red is
// still a failure of the sweep — the mutation was not the defect it claims.
const MUTANTS = [
  // ----------------------------------------------------------- scene 3 ----
  // Six of these are mistakes that were ACTUALLY MADE while building the beach
  // and are marked; the rest are the obvious way to break a claim the brief
  // makes in so many words.
  {
    id: 'the-high-water-mark-follows-the-swash',
    file: 'scene/beach-swash.js',
    from: '        if (wet[i] > sat[i]) wet[i] = Math.max(sat[i], wet[i] - dt / OVERRUN_DRY_S);\n        else wet[i] = sat[i];',
    to: '        wet[i] = e;',
    // AND IT NO LONGER CLAIMS THE RATCHET CHECK, BECAUSE THE CLAIM WAS WRONG.
    // A mark that follows the swash exactly does not ratchet — it is the
    // OPPOSITE defect, and `wet-sand-persists-after-the-water-has-left-it` is
    // the clause that names it. It used to redden the ratchet check only
    // because that check read `wet` at a single instant, which under this
    // mutation is a snapshot of wherever a swash happened to be: a coin flip
    // that this session's own timing change landed the other way. The fixture
    // is a median over a window now and the claim came off the list. A mutant
    // that stays green is sometimes the CLAIM being wrong rather than the
    // check — /plot's own lesson, in another gate.
    breaks: ['swash/wet-sand-persists-after-the-water-has-left-it',
             'scene3/the-swash-runs-and-drains-while-the-wet-band-stays'],
    mayAlso: ['swash/the-overrun-zone-dries-back-and-does-not-ratchet',
              'swash/the-high-water-mark-is-effectively-static-in-quiet-water',
              'swash/an-overrun-fires-with-the-extent-it-reached',
              'scene3/the-two-queries-answer-in-screen-pixels-and-follow-the-shear'],
    why: 'ONE OSCILLATING WATERLINE — the failure mode the brief names by name',
  },
  {
    id: 'one-drying-rate-for-the-whole-beach',
    file: 'scene/beach-swash.js',
    from: '        sat[i] = Math.max(WATERLINE_S, sat[i] - dt / SAT_DRY_S);',
    to: '        sat[i] = Math.max(WATERLINE_S, sat[i] - dt / OVERRUN_DRY_S);',
    breaks: ['swash/wet-sand-persists-after-the-water-has-left-it'],
    mayAlso: ['swash/the-overrun-zone-dries-back-and-does-not-ratchet',
              'swash/an-overrun-fires-with-the-extent-it-reached',
              'swash/the-high-water-mark-is-effectively-static-in-quiet-water',
              'scene3/the-swash-runs-and-drains-while-the-wet-band-stays'],
    why: '"do not use one rate for the whole beach" — the saturated zone dried at the overrun rate',
  },
  {
    id: 'the-two-rates-are-declared-the-same',
    file: 'scene/beach-swash.js',
    from: 'export const SAT_DRY_S = 530;',
    to: 'export const SAT_DRY_S = 20;',
    breaks: ['swash/the-two-drying-rates-are-an-order-of-magnitude-apart'],
    mayAlso: ['swash/wet-sand-persists-after-the-water-has-left-it',
              'swash/an-overrun-fires-with-the-extent-it-reached',
              'swash/the-high-water-mark-is-effectively-static-in-quiet-water',
              'swash/the-overrun-zone-dries-back-and-does-not-ratchet',
              'scene3/the-swash-runs-and-drains-while-the-wet-band-stays'],
    why: 'the separation is the feature; collapsing it is not a tuning change',
  },
  {
    id: 'the-saturated-level-is-a-running-maximum',
    file: 'scene/beach-swash.js',
    from: '          sat[i] = Math.max(WATERLINE_S, sat[i] + (v - sat[i]) * SAT_ALPHA);',
    to: '          sat[i] = Math.max(sat[i], v);',
    // AND THE SWEEP ON THE MERGED TREE FOUND ITS LIST SHORT — honest-direction,
    // and the claim was widened rather than any check loosened. A mark that
    // ratchets outward stops being the wet/dry boundary the value ordering is
    // measured across, so that clause legitimately reddens too.
    breaks: ['swash/the-overrun-zone-dries-back-and-does-not-ratchet'],
    mayAlso: ['swash/an-overrun-fires-with-the-extent-it-reached',
              'swash/the-high-water-mark-is-effectively-static-in-quiet-water',
              'swash/wet-sand-persists-after-the-water-has-left-it',
              'scene3/the-swash-runs-and-drains-while-the-wet-band-stays'],
    why: '"it must return, not ratchet" — a max never comes back',
  },
  {
    id: 'a-running-swash-reads-the-set-energy',
    file: 'scene/beach-swash.js',
    from: '    advance(dt, { energy = 0, intervalScale = 1 } = {}) {\n      clock += dt;',
    to: '    advance(dt, { energy = 0, intervalScale = 1 } = {}) {\n      clock += dt;\n      for (const w of waves) w.runup = WATERLINE_S + (w.runup - WATERLINE_S) * (1 + 0.4 * energy);',
    // AND THE SWEEP ON THE MERGED TREE FOUND ITS LIST SHORT — honest-direction,
    // and the claim was widened rather than any check loosened. A swash that
    // keeps growing under a live set moves BOTH published boundaries, so the
    // screen-mapping clause and the value ordering both read it.
    breaks: ['swash/the-energy-reaches-the-next-wave-and-never-the-one-running'],
    mayAlso: ['swash/an-overrun-fires-with-the-extent-it-reached',
              'swash/the-overrun-zone-dries-back-and-does-not-ratchet',
              'swash/the-high-water-mark-is-effectively-static-in-quiet-water',
              'scene3/the-swash-runs-and-drains-while-the-wet-band-stays',
              'scene3/the-two-queries-answer-in-screen-pixels-and-follow-the-shear'],
    why: '"a broken wave is committed" — deforming one mid-run reads as a slider on the water',
  },
  {
    id: 'the-swash-record-carries-its-energy',
    file: 'scene/beach-wave.js',
    // RE-POINTED at `WAVE_FIELDS`, which is where the claim lives now that a
    // swash is stage six of a wave. The anchor pre-check caught the old one as
    // disarmed the first time it ran after the split, which is that mechanism
    // doing its job.
    from: "  'bandMax', 'bandFadeS', 'swellLeadS', 'height',",
    to: "  'bandMax', 'bandFadeS', 'swellLeadS', 'height', 'energy',",
    breaks: ['swash/a-swash-carries-no-record-of-the-energy-that-chose-it'],
    why: 'provenance in the record is what would let a later reader branch on the cause',
  },
  {
    id: 'every-swash-reaches-the-same-distance',
    file: 'scene/beach-swash.js',
    from: 'export const RUNUP_VARY = [0.88, 1.12];',
    to: 'export const RUNUP_VARY = [1, 1];',
    breaks: ['swash/successive-swashes-do-not-reach-identical-distances'],
    mayAlso: ['swash/the-high-water-mark-is-effectively-static-in-quiet-water',
              'swash/an-overrun-fires-with-the-extent-it-reached',
              'swash/the-overrun-zone-dries-back-and-does-not-ratchet'],
    why: '"successive swashes must not reach identical distances"',
  },
  {
    id: 'the-overrun-fires-on-every-wave',
    file: 'scene/beach-swash.js',
    from: 'export const OVERRUN_MARGIN_S = 0.150;',
    to: 'export const OVERRUN_MARGIN_S = 0.0;',
    breaks: ['swash/an-overrun-fires-with-the-extent-it-reached'],
    why: 'an event that fires as often without a set as with one is no signal',
  },
  {
    id: 'the-break-goes-white-all-at-once',
    file: 'scene/beach-wave.js',
    from: '    peelS,\n    peelFrom: rand.unit(),',
    to: '    peelS: 1e-6,\n    peelFrom: rand.unit(),',
    // AND IT REDDENS THE ENERGY CHECK TOO, which is true about it rather than
    // collateral: `peelS` is one of the four quantities the set energy sizes at
    // birth, and a peel pinned at 1e-6 is outside its own declared range at
    // every energy.
    breaks: ['wave/the-break-runs-along-the-crest-rather-than-all-at-once',
             'draw/the-peel-is-monotone-in-time-and-runs-across-the-frame',
             'wave/the-energy-sizes-the-wave-at-every-stage-and-only-at-birth'],
    mayAlso: ['scene3/several-waves-are-alive-at-once-at-different-stages',
              'wave/a-wave-passes-through-all-six-stages-in-order-exactly-once-each'],
    why: '"it does not go white all at once" — the brief\'s own sentence, and 1.87 s of it is measured',
  },
  {
    id: 'the-wave-has-no-dark-face',
    file: 'scene/beach-wave.js',
    from: 'export function faceAmountOf(w) {\n  const a = w.age - w.breakAge;',
    to: 'export function faceAmountOf(w) {\n  if (w) return 0;\n  const a = w.age - w.breakAge;',
    // ITS BLAST RADIUS SHRANK WITH THE TONE FIELD, and that is worth saying
    // rather than quietly re-listing: it used to redden four checks, two of
    // which measured the face as emitted TONE. What is left is the stage
    // label, because COLLAPSE is defined as "this column has broken and the
    // wave still has a face" and a tree with no face never reaches it.
    breaks: ['wave/the-stage-a-wave-reports-is-the-stage-it-is-drawing'],
    mayAlso: ['wave/a-wave-passes-through-all-six-stages-in-order-exactly-once-each',
              'scene3/several-waves-are-alive-at-once-at-different-stages'],
    why: 'THE FAILURE MODE THE BRIEF NAMES: what is left without it is a white stripe',
  },
  {
    id: 'the-seaward-life-is-per-wave',
    file: 'scene/beach-wave.js',
    from: '  const crest0 = waterline - speedS * PRE_S;',
    to: '  const crest0 = breakS - speedS * swellLeadS;',
    breaks: ['wave/every-wave-takes-the-same-time-to-reach-the-shore'],
    // THE REAL DEFECT, and its blast radius is the finding rather than a
    // nuisance: the spawner's interval is a claim about ARRIVALS, and a
    // per-wave seaward life silently turns it into a claim about BIRTHS.
    mayAlso: ['swash/the-high-water-mark-is-effectively-static-in-quiet-water',
              'swash/an-overrun-fires-with-the-extent-it-reached',
              'scene3/the-swash-runs-and-drains-while-the-wet-band-stays',
              'scene3/several-waves-are-alive-at-once-at-different-stages',
              'scene3/the-break-travels-shoreward-instead-of-sitting-at-one-station',
              'draw/no-wave-is-drawn-once-it-is-spent',
              'draw/the-peel-is-monotone-in-time-and-runs-across-the-frame'],
    why: 'THE REAL BUG: arrivals scrambled, and the high-water mark went from 5.9 px per 3.5 s to 54.5',
  },
  {
    id: 'the-waves-composite-shoreward-first',
    file: 'scene/beach-wave.js',
    from: '  return waves.slice().sort((a, b) => (a.crest0 + a.speedS * a.age) - (b.crest0 + b.speedS * b.age));',
    to: '  return waves.slice().sort((a, b) => (b.crest0 + b.speedS * b.age) - (a.crest0 + a.speedS * a.age));',
    // ONE CHECK, AND THE CLAIM THAT IT WAS TWO WAS WRONG RATHER THAN THE
    // CHECK BEING BLIND. `draw/the-nearer-wave-is-painted-last` hands the
    // renderer its two waves in an order it writes down itself, because what
    // it is about is the renderer HONOURING the order it is given — a sort
    // that has been reversed cannot reach it, and a renderer that re-sorts has
    // its own mutant. The two are complementary rather than overlapping and
    // neither substitutes for the other.
    breaks: ['wave/a-nearer-wave-covers-the-one-behind-it'],
    why: 'a nearer band of foam has to hide the water behind it, which is what the order IS',
  },
  {
    id: 'the-energy-does-not-size-the-band',
    file: 'scene/beach-wave.js',
    from: '    bandMax: BAND_MAX[0] + (BAND_MAX[1] - BAND_MAX[0]) * e * rand.range(0.85, 1.15),',
    to: '    bandMax: BAND_MAX[0] + (BAND_MAX[1] - BAND_MAX[0]) * 0.5 * rand.range(0.85, 1.15),',
    breaks: ['wave/the-energy-sizes-the-wave-at-every-stage-and-only-at-birth'],
    why: '"it should now size the wave at EVERY stage" — how wide the foam band is one of the three named',
  },
  {
    id: 'the-wave-never-leaves-the-swell',
    file: 'scene/beach-wave.js',
    from: '  if (b < -w.steepS) return SWELL;\n  if (b < 0) return STEEPEN;',
    to: '  if (b < w.peelS) return SWELL;\n  if (b < 0) return STEEPEN;',
    breaks: ['wave/a-wave-passes-through-all-six-stages-in-order-exactly-once-each',
             'wave/the-stage-a-wave-reports-is-the-stage-it-is-drawing'],
    mayAlso: ['scene3/several-waves-are-alive-at-once-at-different-stages'],
    why: 'a stage label that has drifted from the geometry it is read off',
  },
  {
    id: 'the-set-energy-is-signed',
    file: 'scene/beach-sets.js',
    from: '      st.scrolled = clamp01(st.scrolled + Math.abs(delta) / (ACTIONS_TO_MAX * ACTION_DELTA));',
    to: '      st.scrolled = clamp01(st.scrolled + delta / (ACTIONS_TO_MAX * ACTION_DELTA));',
    breaks: ['sets/either-scroll-direction-adds-energy'],
    why: 'a set has no negative; scene 1\'s wind is signed for a reason that does not apply here',
  },
  {
    id: 'no-set-arrives-on-its-own',
    file: 'scene/beach-sets.js',
    from: '        if (st._untilSet <= 0) {',
    to: '        if (false && st._untilSet <= 0) {',
    breaks: ['sets/large-sets-arrive-with-no-input-at-all'],
    // AND IT DESTABILISES THE HIGH-WATER MARK, which was not predicted and is
    // a real coupling rather than a nuisance: a set pulls the saturated level
    // UP, and the ordinary waves that follow then sit below it and leave the
    // mark alone. With no sets at all the level only ever decays, so every
    // ordinary wave tops it and the mark sawtooths. Measured over three seeds:
    // 9.0 px per 3.5 s becomes 24.2.
    mayAlso: ['swash/the-high-water-mark-is-effectively-static-in-quiet-water',
              'scene3/the-swash-runs-and-drains-while-the-wet-band-stays'],
    why: '"an untouched scene still gets overruns"',
  },
  {
    id: 'the-streaks-are-rebuilt-every-frame',
    file: 'scene/beach-water.js',
    from: '      for (const f of streaks) {',
    to: '      for (const f of streaks) { place(f, true); }\n      for (const f of streaks) {',
    breaks: ['water/the-streaks-persist-and-drift-shoreward'],
    // AND IT NOW REDDENS NOTHING ELSE, which is a finding rather than a
    // tidy-up: with the halftone lattice gone, NOTHING DRAWS THE STREAK
    // RECORDS. beach-brush.js marks the open water with two paper brush lines
    // of its own, driven by `phase` — which this module's `drift` supplies, so
    // half of it is live and half of it is a field no frame reads. The law is
    // still worth testing and the check still tests it; whether the records
    // should be drawn in the new idiom or the module should lose its streak
    // half is a ruling, not a cleanup, and it is named in the outcome doc.
    why: 'a re-randomised surface reads as static rather than as water',
  },
  // --- THE DRAWING LAYER ----------------------------------------------------
  {
    id: 'the-renderer-generates-its-own-foam-edge',
    file: 'scene/beach-render.js',
    from: '        frontAt: st.swashAt,',
    to: '        frontAt: undefined,',
    // THE INVARIANT THAT MATTERS MOST, AND THE MUTATION IS NOT SYNTHETIC: it
    // is the state the drawing layer ARRIVED IN. beach-brush.js generated its
    // own scallops from `lobes()` while the simulation published its own edge,
    // and the two curves are close enough that the picture looks perfectly
    // fine — which is exactly why it needs a check. A bird stands where
    // `swashYAt(x)` says the water is.
    breaks: ['draw/the-drawn-foam-edge-is-the-published-swash-edge'],
    why: 'a drawn edge generated beside the published one puts birds on dry sand',
  },
  {
    id: 'the-drawing-keeps-its-own-shear',
    file: 'scene/beach-render.js',
    from: '        shear: shore.slope * w / h,',
    to: '        shear: undefined,',
    breaks: ['draw/the-drawing-takes-its-shear-from-the-shore',
             'draw/the-drawn-foam-edge-is-the-published-swash-edge'],
    // The two published queries are read through the SHORE, so their fitted
    // slope is unchanged and that clause stays green — which is the point of
    // having the edge invariant read the canvas.
    why: 'the module draws 5.0 degrees on a 4:3 frame against the shore\'s 3.0',
  },
  {
    id: 'a-spent-wave-is-still-drawn',
    file: 'scene/beach-render.js',
    from: '      const list = (st.waves || []).filter(wv => waveStage(wv, WATERLINE_S) !== SWASH);',
    to: '      const list = (st.waves || []);',
    breaks: ['draw/no-wave-is-drawn-once-it-is-spent'],
    mayAlso: ['draw/every-wave-is-drawn-once-with-its-own-record'],
    why: 'the drawing has no fade, so a wave left in the list sits on the sand drawing a full white band',
  },
  {
    id: 'every-wave-draws-the-first-waves-record',
    file: 'scene/beach-render.js',
    from: '        const wv = list[i];',
    to: '        const wv = list[0];',
    // TWO CHECKS, AND THE SECOND IS TRUE ABOUT IT RATHER THAN COLLATERAL.
    // Both recorder clauses pull a wave's op BLOCK out of the frame's stream
    // by its length, so a frame that draws one record twice puts the wrong
    // block in both of them. The three drawing mutants here redden this pair
    // between them, which is what one instrument carrying two claims costs —
    // named rather than loosened out of either check.
    breaks: ['draw/the-nearer-wave-is-painted-last',
             'draw/a-wave-s-foam-holds-still-between-frames'],
    mayAlso: ['draw/every-wave-is-drawn-once-with-its-own-record',
              'draw/the-peel-is-monotone-in-time-and-runs-across-the-frame'],
    why: 'one record drawn N times is a sea of identical waves, and every count-based clause passes it',
  },
  {
    id: 'the-renderer-sorts-behind-the-callers-back',
    file: 'scene/beach-render.js',
    from: '      r.waves = specs.length;',
    to: '      specs.reverse();\n      r.waves = specs.length;',
    breaks: ['draw/the-nearer-wave-is-painted-last',
             'draw/a-wave-s-foam-holds-still-between-frames'],
    why: 'the order IS the model, and a renderer that re-decides it makes sortWaves decorative',
  },
  {
    id: 'the-lobes-are-drawn-per-frame',
    file: 'scene/beach-render.js',
    from: '          scalA: wv.drawA,\n          scalB: wv.drawB,\n          bubbles: wv.drawBubbles,',
    to: '          scalA: null,\n          scalB: null,\n          bubbles: null,',
    // "Do not regenerate lobes per frame — the foam will boil." It reddens the
    // ARTEFACT clause and not the record one, which is the whole reason that
    // second clause was written: the stored parameters are still on the record
    // and still unchanged, so the half that reads them passes perfectly.
    // AND IT REDDENS THE ORDER CHECK TOO, which is the same property read
    // from the other side: with the lobes back on the shared stream a wave's
    // ops depend on what was drawn before it, so that pair's "back's block
    // verbatim" clause stops holding as well.
    breaks: ['draw/a-wave-s-foam-holds-still-between-frames',
             'draw/the-nearer-wave-is-painted-last'],
    why: 'the foam boils, and the record-reading half of its own check cannot see it',
  },
  {
    id: 'the-break-phase-runs-backwards',
    file: 'scene/beach-wave.js',
    from: '  return FOAM_ONSET_B + (1 - FOAM_ONSET_B) * clamp01(b / (w.preS - w.breakAge));',
    to: '  return FOAM_ONSET_B + (1 - FOAM_ONSET_B) * clamp01(1 - b / (w.preS - w.breakAge));',
    breaks: ['draw/the-peel-is-monotone-in-time-and-runs-across-the-frame'],
    mayAlso: ['draw/no-wave-is-drawn-once-it-is-spent'],
    why: 'a wave that un-breaks as it travels shoreward',
  },
  {
    id: 'the-shoreline-is-level',
    file: 'scene/beach-shore.js',
    from: 'export const SHORE_TILT_DEG = 3.0;',
    to: 'export const SHORE_TILT_DEG = 0;',
    breaks: ['shore/the-shoreline-is-oblique-and-runs-up-to-the-right',
             'scene3/the-two-queries-answer-in-screen-pixels-and-follow-the-shear'],
    why: '"the shoreline sits oblique to the frame, not level"',
  },
  {
    id: 'the-shoreline-runs-the-other-way',
    file: 'scene/beach-shore.js',
    from: '  const slope = -Math.tan(tiltDeg * Math.PI / 180);',
    to: '  const slope = Math.tan(tiltDeg * Math.PI / 180);',
    breaks: ['shore/the-shoreline-is-oblique-and-runs-up-to-the-right',
             'scene3/the-two-queries-answer-in-screen-pixels-and-follow-the-shear'],
    why: 'every measurement on the three clips agrees about the SIGN; only the magnitude was noisy',
  },
  {
    id: 'the-bands-are-not-the-briefs-proportions',
    file: 'scene/beach-shore.js',
    from: 'export const RUNUP_NOMINAL = 0.20;',
    to: 'export const RUNUP_NOMINAL = 0.33;',
    breaks: ['shore/the-bands-are-the-brief-s-forty-twenty-forty'],
    mayAlso: ['swash/an-overrun-fires-with-the-extent-it-reached',
              'swash/the-overrun-zone-dries-back-and-does-not-ratchet'],
    why: 'the wet band is the swash\'s own travel, so the runup IS the 20%',
  },
  {
    id: 'ellipse-without-the-moveto',
    file: 'scene/surface.js',
    from: '      ctx.moveTo(x + r, cy);\n',
    to: '',
    breaks: ['surface/a-circle-starts-its-own-subpath'],
    mayAlso: ['scene1/the-frame-is-affordable-during-a-downpour',
              'scene1/the-pond-has-koi-in-it-and-draws-them',
              'reduced-motion/the-flash-is-damped-when-motion-is-not-wanted'],
    why: 'the real bug: batched ripples joined by chords across the whole viewport',
  },
  {
    id: 'the-ripple-records-what-made-it',
    file: 'scene/koi-ripples.js',
    from: "      const rip = { x, y, r: 0, maxR, age: 0, life, strength, rings };",
    to: "      const rip = { x, y, r: 0, maxR, age: 0, life, strength, rings, source: rings === 3 ? 'click' : 'rain' };",
    breaks: ['ripples/a-ripple-carries-no-record-of-its-cause',
             'scene1/a-click-on-the-water-makes-a-ripple-where-it-was-clicked'],
    why: 'provenance in the data is what lets a fish branch on the cause',
  },
  {
    id: 'the-fish-tell-a-click-from-a-raindrop',
    file: 'scene/koi-fish.js',
    from: '          const wgt = rip.strength * fresh * prox;',
    to: '          const wgt = rip.strength * fresh * prox * (rip.rings >= 3 ? 2.5 : 1);',
    breaks: ['fish/any-ripple-gets-the-same-reaction'],
    mayAlso: ['fish/some-koi-swim-to-a-ripple-and-some-flee-it',
              'fish/the-pond-holds-three-to-seven-koi-on-screen'],
    why: 'reacting to a click differently from a raindrop, via a proxy for the cause',
  },
  {
    id: 'the-click-ramp-is-a-rate-not-a-duration',
    file: 'scene/koi-storm.js',
    from: '        const u = Math.min(1, st._rampT / RAMP_S);',
    to: '        const u = Math.min(1, st._rampT / (RAMP_S * (st.target - st._rampFrom) / CLICK_STEP));',
    breaks: ['storm/five-rapid-clicks-reach-full-downpour-two-seconds-later'],
    mayAlso: ['storm/a-full-downpour-holds-three-seconds-before-it-ebbs',
              'storm/a-second-burst-at-full-downpour-flashes',
              'storm/a-burst-while-ebbing-does-not-flash',
              'storm/the-flash-and-the-jolt-decay-to-nothing',
              'scene1/five-rapid-clicks-bring-on-a-downpour',
              'scene1/a-second-burst-at-full-downpour-throws-lightning',
              'scene1/the-storm-ebbs-back-to-idle-on-its-own',
              'scene1/the-frame-is-affordable-during-a-downpour',
              'reduced-motion/the-flash-is-damped-when-motion-is-not-wanted'],
    why: 'the reading of the brief that cannot satisfy both of its sentences',
  },
  {
    id: 'the-hold-is-skipped',
    file: 'scene/koi-storm.js',
    from: '        if (st._holdT >= HOLD_S) st.phase = \'ebbing\';',
    to: '        st.phase = \'ebbing\';',
    breaks: ['storm/a-full-downpour-holds-three-seconds-before-it-ebbs'],
    mayAlso: ['storm/a-second-burst-at-full-downpour-flashes',
              'storm/the-flash-and-the-jolt-decay-to-nothing',
              'scene1/five-rapid-clicks-bring-on-a-downpour',
              'scene1/a-second-burst-at-full-downpour-throws-lightning',
              'scene1/the-storm-ebbs-back-to-idle-on-its-own',
              'reduced-motion/the-flash-is-damped-when-motion-is-not-wanted'],
    why: 'the plateau is a stated behaviour, not a side effect of the ramp',
  },
  {
    id: 'lightning-fires-on-the-first-burst',
    file: 'scene/koi-storm.js',
    from: '      if (st.burst >= BURST_N && st.intensity >= FULL_BAR) {',
    to: '      if (st.burst >= BURST_N) {',
    breaks: ['storm/the-first-burst-does-not-flash', 'storm/a-burst-while-ebbing-does-not-flash'],
    mayAlso: ['storm/a-second-burst-at-full-downpour-flashes',
              'storm/clicks-spread-out-are-not-a-burst',
              'scene1/a-second-burst-at-full-downpour-throws-lightning'],
    why: 'the flash is for a SECOND burst at full downpour',
  },
  {
    id: 'the-wind-decays-while-it-is-being-given',
    file: 'scene/koi-wind.js',
    from: '      if (w._sinceInput < WIND_GRACE_S || w.value === 0) return;',
    to: '      if (w.value === 0) return;',
    breaks: ['wind/three-rapid-scroll-actions-reach-the-maximum'],
    mayAlso: ['wind/the-maximum-is-a-diagonal',
              'wind/the-wind-decays-to-zero-six-seconds-after-the-last-scroll',
              'scene1/scrolling-tilts-the-rain-and-it-comes-back-to-vertical'],
    why: 'a tank that leaks while it fills cannot be filled by the gesture that is meant to fill it',
  },
  {
    id: 'the-rest-angle-is-nearly-vertical',
    file: 'scene/koi-wind.js',
    from: '      if (Math.abs(w.value) <= step) w.value = 0;',
    to: '      if (Math.abs(w.value) <= step * 0.001) w.value = 0;',
    breaks: ['wind/the-rest-angle-is-exactly-vertical'],
    mayAlso: ['wind/the-wind-decays-to-zero-six-seconds-after-the-last-scroll',
              'scene1/scrolling-tilts-the-rain-and-it-comes-back-to-vertical'],
    why: '"perfectly vertical" is an identity, not a tolerance',
  },
  {
    id: 'separation-is-a-personality',
    file: 'scene/koi-fish.js',
    from: '        addNorm(steer, sx, sy, W_SEPARATE * (1 + SEP_URGENCY * sepPeak));',
    to: '        addNorm(steer, sx, sy, W_SEPARATE * (1 + SEP_URGENCY * sepPeak) * (1 - f.traits.social));',
    breaks: ['fish/separation-is-a-body-not-a-personality'],
    mayAlso: ['fish/schooling-koi-end-up-nearer-each-other-than-solitary-ones',
              'fish/the-pond-holds-three-to-seven-koi-on-screen',
              'scene1/the-pond-has-koi-in-it-and-draws-them'],
    why: 'letting the sociability slider switch off a body is the error the check is named for',
  },
  {
    id: 'the-population-counts-only-what-is-in-frame',
    file: 'scene/koi-fish.js',
    from: '      const live = school.presentCount();',
    to: '      const live = school.visibleCount(w, h);',
    breaks: ['fish/the-pond-holds-three-to-seven-koi-on-screen'],
    mayAlso: ['scene1/the-pond-has-koi-in-it-and-draws-them',
              'scene1/the-traits-are-per-fish-and-span-the-sliders',
              'fish/separation-is-a-body-not-a-personality',
              'fish/schooling-koi-end-up-nearer-each-other-than-solitary-ones',
              // AND IT CHURNS, which is a true statement about this mutation
              // rather than a check that needs loosening. A koi crossing the
              // frame edge is ordinary swimming, so a manager counting only
              // what is IN FRAME sees a population that oscillates on its own
              // and spawns and departs against it — which is what the churn
              // check measures. It went unnamed until the density work shifted
              // the sequence enough to surface it; the mutation is more plainly
              // broken now, not less.
              'fish/the-population-does-not-churn-at-a-steady-intensity',
              // Measured on this mutation: a koi on its way out is counted as
              // present, so the manager stops recalling in time and the pond
              // reaches EIGHT on screen. The recall check's own count bar is
              // what sees it — not its recall bar, which still reads 9 of 10.
              'fish/a-koi-sent-away-is-called-back-rather-than-replaced'],
    why: 'the defect that filled the pond with sixteen koi to keep seven on screen',
  },
  {
    id: 'the-drawn-placement-is-not-lagged',
    file: 'scene/koi-fish.js',
    from: '        const kDraw = Math.min(1, dt / DRAW_TAU);',
    to: '        const kDraw = 1;',
    breaks: ['fish/the-drawn-koi-is-smoother-than-the-one-it-follows'],
    why: 'the jitter itself: the koi drawn at the raw 60 Hz placement it swims',
  },
  {
    id: 'the-bend-bias-snaps-to-the-turn-rate',
    file: 'scene/koi-fish.js',
    from: '        f.bend += (f.omega - f.bend) * Math.min(1, dt / BEND_TAU);',
    to: '        f.bend = f.omega;',
    breaks: ['fish/the-drawn-koi-is-smoother-than-the-one-it-follows'],
    why: 'a body that changes its curvature the instant the turn rate does',
  },
  {
    id: 'the-drawn-heading-is-lagged-without-its-position',
    file: 'scene/koi-fish.js',
    from: `        f.drawX += (f.x - f.drawX) * kDraw;
        f.drawY += (f.y - f.drawY) * kDraw;`,
    to: `        f.drawX = f.x;
        f.drawY = f.y;`,
    breaks: ['fish/the-drawn-koi-is-smoother-than-the-one-it-follows'],
    why: 'the two lags split apart, which aims the koi off its own travel',
  },
  {
    // REPLACES `the-spine-is-pinned-at-the-nose`, whose anchor went with the
    // curvature-bias drawing law it was written against. Same question — where
    // is the drawing pinned to the chain — asked of the law that is there now.
    // Forcing the station index to 0 makes every drawn point extrapolate along
    // the FIRST segment, so the koi becomes a rigid straight fish hung off its
    // head joint: it still translates with the chain and its nose is still at
    // the head joint, and it stops bending at all.
    id: 'the-drawing-hangs-off-one-joint',
    file: 'scene/koi-draw.js',
    from: '      let i = Math.floor(t);\n',
    to: '      let i = 0;\n',
    breaks: ['fish/the-drawn-koi-rides-the-chain-it-is-given'],
    why: 'the drawing must be local to the chain, not a rigid body hung off one joint',
  },
  {
    id: 'a-departure-never-leaves',
    file: 'scene/koi-fish.js',
    from: "      if (pick) { pick.state = 'leaving'; school.departures++; }",
    to: '      if (pick) { school.departures++; }',
    breaks: ['fish/the-population-does-not-churn-at-a-steady-intensity'],
    mayAlso: ['fish/the-pond-holds-three-to-seven-koi-on-screen',
              'scene1/the-pond-has-koi-in-it-and-draws-them',
              'scene1/the-traits-are-per-fish-and-span-the-sliders',
              // WITH NOTHING EVER LEAVING, THE MANAGER NEVER ACTS AGAIN.
              // Measured: 0 spawns beyond the seed and 0 recalls over 150 s of
              // swinging storm, the population stuck at 7 against a target of
              // 3. Every entry/exit check needs that machinery to run, so each
              // fires its own vacuity guard rather than its claim.
              'fish/a-koi-is-never-placed-inside-the-frame',
              'fish/no-koi-appears-or-vanishes-in-view',
              'fish/a-koi-swims-in-rather-than-crawling-in',
              'fish/a-koi-sent-away-is-called-back-rather-than-replaced'],
    why: 'a manager whose count never registers what it just did departs a koi every cooldown, for ever',
  },
  {
    id: 'a-koi-is-placed-inside-the-frame',
    file: 'scene/koi-fish.js',
    from: 'const SPAWN_OUT = BODY_LEN_PX * SIZE_VAR[1] * 1.35;',
    to: 'const SPAWN_OUT = -BODY_LEN_PX;',
    breaks: ['fish/a-koi-is-never-placed-inside-the-frame',
             'fish/no-koi-appears-or-vanishes-in-view'],
    mayAlso: ['fish/a-koi-sent-away-is-called-back-rather-than-replaced',
              'fish/the-pond-holds-three-to-seven-koi-on-screen',
              'fish/a-koi-swims-in-rather-than-crawling-in',
              // Seven koi placed just inside the edges start far closer to one
              // another than seven that swam in, and the control tree that
              // check compares against does not carry this mutation.
              'fish/separation-is-a-body-not-a-personality'],
    why: 'a koi conjured in clear water is the thing the whole entry model exists to stop',
  },
  {
    id: 'a-departure-vanishes-where-it-stands',
    file: 'scene/koi-fish.js',
    from: `      school.fish = school.fish.filter(f => f.state === 'leaving'
        ? surface.onScreen(f.x, f.y, w, h, f.len * LEAVE_CLEAR_LEN)
        : surface.onScreen(f.x, f.y, w, h, CULL_MARGIN));`,
    to: `      school.fish = school.fish.filter(f => f.state !== 'leaving'
        && surface.onScreen(f.x, f.y, w, h, CULL_MARGIN));`,
    breaks: ['fish/no-koi-appears-or-vanishes-in-view',
             'fish/a-koi-sent-away-is-called-back-rather-than-replaced'],
    mayAlso: ['fish/the-population-does-not-churn-at-a-steady-intensity',
              'fish/the-pond-holds-three-to-seven-koi-on-screen'],
    why: 'the other half of the rule — leaving has to be a swim, not a deletion',
  },
  {
    id: 'an-entering-koi-is-braked-like-one-turning-back',
    file: 'scene/koi-fish.js',
    from: '          const against = Math.max(0, -(fx * ox + fy * oy) / im);',
    to: '          const against = 1;',
    breaks: ['fish/a-koi-swims-in-rather-than-crawling-in'],
    mayAlso: ['fish/the-pond-holds-three-to-seven-koi-on-screen',
              'fish/a-koi-sent-away-is-called-back-rather-than-replaced',
              'fish/no-koi-appears-or-vanishes-in-view',
              'fish/the-population-does-not-churn-at-a-steady-intensity',
              // Koi that crawl in bunch along the edges they came through, and
              // the control tree does not carry this mutation either.
              'fish/separation-is-a-body-not-a-personality'],
    why: 'containment carries a koi IN as well as turning one back, and braking both throttles the entry',
  },
  {
    id: 'an-entering-koi-is-not-carried-in',
    file: 'scene/koi-fish.js',
    from: "        if (f.state === 'leaving') {",
    to: "        if (f.state !== 'cruising') {",
    breaks: ['fish/a-koi-swims-in-rather-than-crawling-in',
             'fish/the-pond-holds-three-to-seven-koi-on-screen'],
    mayAlso: ['fish/a-koi-sent-away-is-called-back-rather-than-replaced',
              'fish/the-population-does-not-churn-at-a-steady-intensity',
              'scene1/the-pond-has-koi-in-it-and-draws-them',
              'scene1/the-traits-are-per-fish-and-span-the-sliders',
              'fish/separation-is-a-body-not-a-personality',
              'fish/schooling-koi-end-up-nearer-each-other-than-solitary-ones',
              'fish/no-koi-appears-or-vanishes-in-view',
              // seed() returns an EMPTY pond under this one — measured, 0 koi
              // on every seed — so the blast radius is every fixture that
              // builds a seeded pond at all: the ones that place koi by hand
              // have nothing to place, and the rest trip makeSchool's own
              // vacuity guard. That breadth is the mutation being severe, not
              // the checks being fragile.
              'fish/any-ripple-gets-the-same-reaction',
              // And the pad check that compares the wired scene's koi against a
              // school built from the seed ALONE: with nothing seeded there is
              // nothing to compare, so it refuses rather than passing vacuously.
              'pads/wiring-in-the-pads-did-not-move-the-koi',
              'fish/some-koi-swim-to-a-ripple-and-some-flee-it',
              'fish/every-trait-is-a-slider-in-nought-to-one',
              'fish/koi-vary-mildly-in-size-around-an-inch',
              'fish/the-pond-is-fuller-when-it-is-calm-than-when-it-storms'],
    why: 'a koi born outside and then steered outward never arrives, and the pond empties',
  },
  {
    id: 'a-koi-sent-away-is-never-called-back',
    file: 'scene/koi-fish.js',
    from: `          if (school.recall(w, h)) school._cool = DEPART_COOL_S;
          else { school.spawn(w, h); school._cool = SPAWN_COOL_S; }`,
    to: '          school.spawn(w, h); school._cool = SPAWN_COOL_S;',
    breaks: ['fish/a-koi-sent-away-is-called-back-rather-than-replaced'],
    mayAlso: ['fish/the-pond-holds-three-to-seven-koi-on-screen',
              'fish/the-population-does-not-churn-at-a-steady-intensity'],
    why: 'an eighth koi called in while the seventh is still swimming off is how the count breaks',
  },
  {
    id: 'the-page-carries-a-hint-again',
    file: 'scene.html',
    from: '<div id="scene-stage" role="img" aria-label="Scene"></div>',
    to: '<div id="scene-stage" role="img" aria-label="Scene"></div>\n<p class="scene-hint">click the water. scroll for wind.</p>',
    breaks: ['shell/there-is-no-text-on-the-page-but-the-nav'],
    why: '"no chrome besides the nav" is literal, and a transient line is still a line',
  },
  {
    id: 'the-wind-moves-where-the-rain-lands',
    file: 'scene/koi-rain.js',
    from: '          ripples.spawn(surface.px(d.lx), surface.py(d.ly), rollRipple(rand, splash));',
    to: '          ripples.spawn(surface.px(d.lx + fallDir.x * 200), surface.py(d.ly), rollRipple(rand, splash));',
    breaks: ['rain/the-wind-does-not-move-where-a-drop-lands'],
    why: 'wind tilts the fall; it must not sweep the rain into a corner of the pond',
  },
  {
    id: 'a-stale-scene-load-is-mounted-anyway',
    file: 'scene.js',
    from: '  if (token !== loadToken) return false;   // the stale-load guard',
    to: '  /* guard removed */',
    breaks: ['swap/the-last-scene-asked-for-is-the-one-that-mounts'],
    why: 'two dynamic imports in flight resolve in whatever order the network gives',
  },
  {
    // The shipped defect, before it was measured: canvases in normal flow.
    id: 'the-planes-stack-instead-of-overlapping',
    file: 'scene.css',
    from: '.scene-canvas { display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; }',
    to: '.scene-canvas { display: block; width: 100%; height: 100%; }',
    breaks: ['layers/two-planes-occupy-the-same-rect-rather-than-stacking',
             'layers/the-back-plane-reaches-the-screen-through-the-front-one'],
    why: 'in normal flow the second plane lands a full viewport below the first',
  },
  {
    // The other half of the same defect, and the quieter one: the geometry is
    // right and the front plane is opaque black everywhere it did not draw.
    id: 'every-plane-is-opaque',
    file: 'scene.js',
    from: '      const alpha = opts.alpha !== undefined ? !!opts.alpha : canvases.length > 0;',
    to: '      const alpha = false;',
    breaks: ['layers/only-the-backmost-plane-is-opaque',
             'layers/the-back-plane-reaches-the-screen-through-the-front-one'],
    why: 'on an opaque context even clearRect yields black, so the front plane hides the back',
  },
  {
    // The obvious "simplification" in the other direction. It costs nothing
    // visible — which is the point: only the alpha flag itself can see it.
    id: 'every-plane-is-transparent',
    file: 'scene.js',
    from: '      const alpha = opts.alpha !== undefined ? !!opts.alpha : canvases.length > 0;',
    to: '      const alpha = true;',
    breaks: ['layers/only-the-backmost-plane-is-opaque',
             'layers/a-one-canvas-scene-is-still-a-single-opaque-plane'],
    why: 'the backmost plane is the one that can be opaque, and scene 1 must stay that way',
  },
  // ------------------------------------------------------------------ pads --
  {
    id: 'a-pad-is-drawn-under-the-fish',
    file: 'scene/koi-draw.js',
    // IT HAS TO MOVE THE PASS, NOT ADD A SECOND ONE. The first version only
    // prepended a call and left the real one in place, so the pads were drawn
    // twice and the later pass still covered everything — the mutation applied,
    // looked right, and changed nothing the checks could see. `pads` is a
    // destructured parameter, so nulling it is what disarms the later call.
    from: '    for (const f of fish) drawFish(f);\n',
    to: '    drawPads(width, height, pads);\n    for (const f of fish) drawFish(f);\n    pads = null;\n',
    breaks: ['pads/a-pad-is-drawn-over-the-fish-and-the-ripples',
             'scene1/a-pad-hides-the-water-under-it'],
    why: 'draw order is the only depth cue here; a pad under the koi reads as painted on the pond floor',
  },
  {
    id: 'a-pad-does-not-reset-the-water-under-it',
    file: 'scene/koi-draw.js',
    from: '    ctx.fillStyle = GROUND;\n    ctx.fill();\n    ctx.fillStyle = groundFor(w, h);\n    ctx.fill();\n    ctx.fillStyle = rgba(INK, PAD_FILL_A);',
    to: '    ctx.fillStyle = rgba(INK, PAD_FILL_A);',
    breaks: ['pads/a-pad-is-drawn-over-the-fish-and-the-ripples',
             'scene1/a-pad-hides-the-water-under-it'],
    why: 'every other mark here is translucent ink, so without the opaque reset the order buys nothing',
  },
  {
    id: 'a-pad-reads-the-cause-of-a-ripple',
    file: 'scene/koi-pads.js',
    from: '    const amp = WAVE_AMP * rip.strength * env;',
    to: '    const amp = WAVE_AMP * rip.strength * env * (rip.rings >= 3 ? 2.5 : 1);',
    breaks: ['pads/a-pad-answers-any-ripple-the-same-way'],
    why: 'a pad may feel how big a splash was and must not be able to tell what made it',
  },
  {
    id: 'the-pads-cannot-feel-the-water',
    file: 'scene/koi-pads.js',
    from: '    h += amp * g;',
    to: '    h += 0;',
    breaks: ['pads/a-passing-front-rocks-a-pad-and-lets-it-go',
             'scene1/the-pads-on-the-real-page-are-riding-the-water'],
    mayAlso: ['pads/the-rock-is-subtle-and-a-downpour-does-not-peg-it',
              'pads/a-pad-answers-any-ripple-the-same-way'],
    why: 'a pad that does not read the height field does not bob, and the gradient alone is half the law',
  },
  {
    id: 'a-pad-only-foreshortens',
    file: 'scene/koi-pads.js',
    from: '  out.z = base + a * Math.sin(theta);',
    to: '  out.z = base;',
    breaks: ['pads/a-tilted-pad-is-foreshortened-one-way-and-lifted-the-other'],
    why: 'cos is even, so a foreshortening alone reads as a pulse at twice the wave rather than a rock',
  },
  {
    id: 'the-rock-is-clamped-rather-than-saturated',
    file: 'scene/koi-pads.js',
    from: '    const theta = TILT_MAX * k * Math.tanh(slope / TILT_REF);',
    to: '    const theta = Math.min(TILT_MAX * k, slope);',
    breaks: ['pads/the-rock-is-subtle-and-a-downpour-does-not-peg-it'],
    why: 'a hard clamp puts every pad in the pond at the ceiling for the whole of a storm',
  },
  {
    id: 'pads-scatter-instead-of-clumping',
    file: 'scene/koi-pads.js',
    from: '          const at = put || scatter(spot, spread, R);',
    to: '          const at = put || scatter({ x: rand.range(want.x0, want.x1), y: rand.range(want.y0, want.y1) }, spread, R);',
    breaks: ['pads/pads-clump-and-there-is-open-water-between-the-clumps'],
    mayAlso: ['pads/blooms-rise-among-the-pads-and-there-are-two-or-three',
              'scene1/the-pond-has-lily-pads-on-it-in-clumps-with-blooms-among-them'],
    why: 'the brief asks for loose clusters with open water between them, which is what a scatter is not',
  },
  {
    id: 'the-pad-field-is-regenerated-on-a-resize',
    file: 'scene/koi-pads.js',
    from: '      const newArea = (want.x1 - want.x0) * (want.y1 - want.y0)\n        - (covered ? overlapArea(want, covered) : 0);',
    to: '      field.pads.length = 0; field.clusters.length = 0; covered = null;\n      const newArea = (want.x1 - want.x0) * (want.y1 - want.y0);',
    breaks: ['pads/growing-the-frame-grows-the-field-and-moves-nothing'],
    why: 'a pad is a thing in the pond, and a fixed object that jumps on a resize stops reading as fixed',
  },
  {
    id: 'a-bloom-lands-anywhere-in-its-cluster',
    file: 'scene/koi-pads.js',
    from: '      if (ok && beside) return { x, y };',
    to: '      if (ok) return { x, y };',
    breaks: ['pads/blooms-rise-among-the-pads-and-there-are-two-or-three'],
    why: '"rising among the pad clusters" needs a leaf beside it; otherwise it is a flower alone on a pond',
  },
  {
    id: 'the-wedge-keeps-a-fixed-sample-count',
    file: 'scene/koi-pads.js',
    from: '  const notchPts = 2 * Math.max(NOTCH_PTS_MIN / 2, Math.ceil(2 * notchHalf / rimStep));',
    to: '  const notchPts = NOTCH_PTS_MIN;',
    breaks: ['pads/a-pad-is-a-near-circle-with-one-wedge-cut-out-of-it'],
    why: 'eight samples is dense across a five-degree slit and coarser than the rim across a sixty-five degree wedge, '
       + 'which draws its flanks as a staircase — and nothing else in the check can see it',
  },
  {
    id: 'every-wedge-is-cut-at-the-same-angle',
    file: 'scene/koi-pads.js',
    // IT STILL TAKES THE DRAW AND THROWS IT AWAY, and that is the whole
    // difference between a mutation about wedges and a mutation about the
    // pond. Deleting the `rand.range` deletes one draw PER PAD, which shifts
    // every number the shared pad stream hands out after it — so every pad's
    // size and position moves and the field is a different field. Measured:
    // it reddened the CLUMPING check as well, which is not a statement about
    // wedge angles and not something this mutant should be allowed to claim
    // or to excuse. The comma expression consumes exactly what the shipped
    // line consumes and yields the constant, so the field is bit-identical
    // and the only thing that moved is the angle each wedge is cut at.
    from: '  const notchDeg = rand.range(NOTCH_DEG[0], NOTCH_DEG[1]);',
    to: '  const notchDeg = (rand.range(NOTCH_DEG[0], NOTCH_DEG[1]), NOTCH_DEG[0]);',
    breaks: ['pads/the-stem-wedge-is-cut-at-a-different-angle-on-every-pad'],
    why: 'the ruling is a variety of angles from 5 to 65, and a field cut at one width is what it replaced',
  },
  {
    id: 'the-rim-is-as-lumpy-as-it-was',
    file: 'scene/koi-pads.js',
    from: 'export const LOBE_AMP = [0.024, 0.017, 0.009];\nexport const LOBE_VARY = [0.65, 1.30];',
    to: 'export const LOBE_AMP = [0.048, 0.034, 0.018];\nexport const LOBE_VARY = [0.55, 1.45];',
    breaks: ['pads/a-pad-is-a-near-circle-with-one-wedge-cut-out-of-it'],
    why: '"make the lily pads rounder" is a ruling, and the amplitudes it replaced are the state it was ruled against',
  },
  {
    id: 'the-pads-draw-from-the-shared-stream',
    file: 'scene/scene-koi.js',
    from: '  const padRand = makeRandom((host.seed ^ PAD_SEED_SALT) >>> 0);',
    to: '  const padRand = rand;',
    breaks: ['pads/wiring-in-the-pads-did-not-move-the-koi'],
    why: 'a draw on the shared stream shifts every number taken after it, the koi included',
  },
];

function applyMutant(m) {
  const abs = path.join(REPO, m.file);
  const src = fs.readFileSync(abs, 'utf8');
  const n = src.split(m.from).length - 1;
  if (n === 0) throw new Error(`mutation "${m.id}" did not apply: its anchor is not in ${m.file}`);
  if (n > 1) throw new Error(`mutation "${m.id}" is ambiguous: its anchor occurs ${n} times in ${m.file}`);
  return src.replace(m.from, m.to);
}

function sweepMutantFiles() {
  for (const dir of [SCENE, REPO]) {
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith(MUTANT_PREFIX)) fs.rmSync(path.join(dir, f), { recursive: true, force: true });
    }
  }
}

// A mutated tree is a COPY OF THE WHOLE scene/ DIRECTORY with one file changed,
// because these modules import each other by relative path: a single mutated
// file dropped anywhere else is imported by nobody, and the sweep would report
// a clean run on an unmutated tree.
let mutantSeq = 0;
async function loadScene(mutant) {
  if (!mutant || !mutant.file.startsWith('scene/')) {
    const bust = `?v=${++mutantSeq}`;
    const m = async (f) => import(pathToFileURL(path.join(SCENE, f)).href + bust);
    return {
      surface: await m('surface.js'), rng: await m('rng.js'),
      storm: await m('koi-storm.js'), wind: await m('koi-wind.js'),
      ripples: await m('koi-ripples.js'), rain: await m('koi-rain.js'),
      fish: await m('koi-fish.js'), registry: await m('registry.js'),
      pads: await m('koi-pads.js'), draw: await m('koi-draw.js'),
      sceneKoi: await m('scene-koi.js'),
      shore: await m('beach-shore.js'), swash: await m('beach-swash.js'),
      sets: await m('beach-sets.js'), water: await m('beach-water.js'),
      beachBrush: await m('beach-brush.js'), beachWave: await m('beach-wave.js'),
      beachRender: await m('beach-render.js'),
    };
  }
  const dir = path.join(SCENE, `${MUTANT_PREFIX}${++mutantSeq}`);
  fs.mkdirSync(dir, { recursive: true });
  const mutated = applyMutant(mutant);
  for (const f of fs.readdirSync(SCENE)) {
    if (!f.endsWith('.js')) continue;
    const body = ('scene/' + f) === mutant.file ? mutated : fs.readFileSync(path.join(SCENE, f), 'utf8');
    fs.writeFileSync(path.join(dir, f), body);
  }
  const m = async (f) => import(pathToFileURL(path.join(dir, f)).href);
  return {
    surface: await m('surface.js'), rng: await m('rng.js'),
    storm: await m('koi-storm.js'), wind: await m('koi-wind.js'),
    ripples: await m('koi-ripples.js'), rain: await m('koi-rain.js'),
    fish: await m('koi-fish.js'), registry: await m('registry.js'),
    pads: await m('koi-pads.js'), draw: await m('koi-draw.js'),
    sceneKoi: await m('scene-koi.js'),
    shore: await m('beach-shore.js'), swash: await m('beach-swash.js'),
    sets: await m('beach-sets.js'), water: await m('beach-water.js'),
    beachBrush: await m('beach-brush.js'), beachWave: await m('beach-wave.js'),
    beachRender: await m('beach-render.js'),
  };
}

// =========================================================== PART ONE =======
// The shipped modules, in Node, against numbers taken from the brief.

async function partOne(mutant) {
  // A MODULE THAT REFUSES TO LOAD IS A RED CHECK, NOT A DEAD SWEEP. Some of
  // these modules assert their own invariants at module scope — the dry sand's
  // register headroom is one — and a refusal there is STRONGER than a failed
  // check, because nothing downstream can run on a tree that is wrong in that
  // way. But an uncaught throw here takes the whole negative control down with
  // it and reports nothing at all, so the refusal is caught and named.
  let M;
  setSection('load');
  try {
    M = await loadScene(mutant);
    results.push({ name: 'load/every-scene-module-imports', ok: true, detail: `${Object.keys(M).length} modules` });
  } catch (err) {
    results.push({ name: 'load/every-scene-module-imports', ok: false,
      detail: err && err.message ? err.message : String(err) });
    return;
  }
  const DT = 1 / 240;   // fine enough that a 2 s ramp is not a sampling claim

  // ---------------------------------------------------------------- surface
  setSection('surface');
  check('the squash is inside the ruled 55-65 per cent', () => {
    const s = M.surface.createSurface();
    if (!(s.squash >= 0.55 && s.squash <= 0.65)) throw new Error(`squash ${s.squash} outside 0.55-0.65`);
    assert.throws(() => M.surface.createSurface(0.9), /outside/);
    return `${s.squash}`;
  });

  check('a circle on the water is one ellipse everywhere, with no perspective', () => {
    const s = M.surface.createSurface();
    // The same circle at four very different places on the plane must project
    // to the same shape. A perspective camera would not.
    const shapes = [[10, 10], [900, 40], [40, 1400], [1200, 1400]].map(([x, y]) => {
      const calls = [];
      const fake = { moveTo: (...a) => calls.push(['moveTo', ...a]),
                     ellipse: (...a) => calls.push(['ellipse', ...a]) };
      s.ellipse(fake, x, y, 50);
      const e = calls.find(c => c[0] === 'ellipse');
      return `${e[3]}x${e[4]}`;
    });
    assert.strictEqual(new Set(shapes).size, 1, `four places gave ${shapes.join(' / ')}`);
    assert.strictEqual(shapes[0], `50x${50 * s.squash}`);
    return `${shapes[0]} at every point on the plane`;
  });

  check('a circle starts its own subpath', () => {
    // ctx.ellipse() CONNECTS from the current point rather than beginning a
    // subpath, so batching ripples into one path drew a chord between each
    // ripple and the next. Asserted on the call sequence, which is the only
    // place it is visible without a screenshot.
    const s = M.surface.createSurface();
    const calls = [];
    const fake = { moveTo: () => calls.push('moveTo'), ellipse: () => calls.push('ellipse') };
    s.ellipse(fake, 100, 100, 20);
    s.ellipse(fake, 400, 700, 35);
    assert.deepStrictEqual(calls, ['moveTo', 'ellipse', 'moveTo', 'ellipse'],
      `two ripples in one path produced: ${calls.join(', ')}`);
    return 'moveTo precedes every ellipse';
  });

  check('the plane and the screen round-trip', () => {
    const s = M.surface.createSurface();
    for (const y of [0, 137.5, 900]) near(s.py(s.sy(y)), y, 1e-12, 'plane->screen->plane');
    const vis = s.visible(1440, 900);
    near(vis.y1, 900 / s.squash, 1e-12, 'the visible plane is taller than the viewport');
    return `1440x900 viewport is ${vis.w}x${Math.round(vis.h)} of water`;
  });

  // ------------------------------------------------------------------ storm
  setSection('storm');
  const runStorm = (script) => {
    const st = M.storm.createStorm();
    let t = 0;
    const advance = (secs) => { const n = Math.round(secs / DT); for (let i = 0; i < n; i++) { st.advance(DT); t += DT; } };
    const click = () => st.click(t);
    script({ st, advance, click, now: () => t });
    return st;
  };

  check('one click adds a fifth of a downpour, over two seconds', () => {
    let mid = 0, end = 0, before = 0;
    runStorm(({ st, advance, click }) => {
      click();
      advance(1.0); mid = st.intensity;
      advance(0.95); before = st.intensity;
      advance(0.06); end = st.intensity;
    });
    near(mid, 0.1, 0.005, 'half way through the ramp');
    if (!(before < 0.2)) throw new Error(`the ramp finished early: ${before}`);
    near(end, 0.2, 1e-9, 'after two seconds');
    return `0 -> 0.100 at 1 s -> 0.200 at 2 s`;
  });

  check('five rapid clicks reach full downpour two seconds later', () => {
    // THE TWO SECONDS RUN FROM THE LAST CLICK, so that is the clock this is
    // measured against. Timing the midpoint from the FIRST click instead read
    // 0.390 where 0.5 was expected and looked like a defect in the ramp; it
    // was the check starting its stopwatch 0.32 s early.
    let atBurst = 0, mid = 0, justShort = 0, atTwo = 0;
    runStorm(({ st, advance, click }) => {
      for (let i = 0; i < 5; i++) { click(); advance(0.08); }   // last click at t = 0.32
      atBurst = st.intensity;
      advance(1.0 - 0.08); mid = st.intensity;                  // last click + 1.00 s
      advance(0.98); justShort = st.intensity;                  // last click + 1.98 s
      advance(0.02); atTwo = st.intensity;                      // last click + 2.00 s
    });
    if (!(atBurst < 0.35)) throw new Error(`the burst itself should not be a downpour yet: ${atBurst}`);
    if (!(mid > 0.40 && mid < 0.65)) throw new Error(`a second in, it should be part way up, not ${mid}`);
    if (!(justShort < 1)) throw new Error(`it reached full before two seconds: ${justShort}`);
    near(atTwo, 1, 1e-9, 'two seconds after the last of five clicks');
    return `${atBurst.toFixed(3)} during the burst, ${mid.toFixed(3)} at +1 s, 1.000 at +2 s`;
  });

  check('a full downpour holds three seconds before it ebbs', () => {
    const marks = [];
    runStorm(({ st, advance, click }) => {
      for (let i = 0; i < 5; i++) { click(); advance(0.02); }
      advance(2.0);
      advance(2.8); marks.push(st.intensity);   // inside the hold
      advance(0.4); marks.push(st.intensity);   // just past it
      advance(1.0); marks.push(st.intensity);
    });
    near(marks[0], 1, 1e-9, 'still at full inside the hold');
    if (!(marks[1] < 1)) throw new Error('it did not begin to ebb after the hold');
    if (!(marks[2] < marks[1])) throw new Error('it stopped ebbing');
    return `1.000 at +2.8 s, ${marks[1].toFixed(3)} at +3.2 s, ${marks[2].toFixed(3)} at +4.2 s`;
  });

  check('a full downpour decays to idle in ten seconds', () => {
    // MEASURED FROM EXACTLY FULL, which is what the brief's ten seconds is
    // about: the ebb is a RATE, so a shallower plateau takes proportionally
    // less and only the full one is a stated number.
    const st = M.storm.createStorm();
    st.intensity = 1; st.target = 1; st.phase = 'ebbing';
    let secs = 0;
    while (st.intensity > 0 && secs < 20) { st.advance(DT); secs += DT; }
    near(secs, 10, 0.02, 'full downpour to idle');
    // And a partial plateau ebbs at that same rate rather than in its own ten.
    const half = M.storm.createStorm();
    half.intensity = 0.5; half.target = 0.5; half.phase = 'ebbing';
    let halfSecs = 0;
    while (half.intensity > 0 && halfSecs < 20) { half.advance(DT); halfSecs += DT; }
    near(halfSecs, 5, 0.02, 'half a downpour, at the same rate');
    return `${secs.toFixed(3)} s from full, ${halfSecs.toFixed(3)} s from half`;
  });

  check('the first burst does not flash', () => {
    let fired = 0;
    runStorm(({ advance, click, st }) => {
      for (let i = 0; i < 5; i++) { if (st.click(0.05 * i)) fired++; advance(0.05); }
      advance(3.0);
    });
    assert.strictEqual(fired, 0, `the first five clicks fired ${fired} flash(es)`);
    return 'no flash while the storm is still building';
  });

  check('a second burst at full downpour flashes', () => {
    let firstBurst = 0, secondBurst = 0, flashes = 0;
    runStorm(({ st, advance, click, now }) => {
      for (let i = 0; i < 5; i++) { if (st.click(now())) firstBurst++; advance(0.1); }
      advance(2.2);
      for (let i = 0; i < 5; i++) { if (st.click(now())) secondBurst++; advance(0.1); }
      flashes = st.flashes;
    });
    assert.strictEqual(firstBurst, 0, 'the first burst flashed');
    assert.strictEqual(secondBurst, 1, `the second burst fired ${secondBurst} flashes`);
    assert.strictEqual(flashes, 1);
    return 'exactly one flash, on the second burst';
  });

  check('clicks spread out are not a burst', () => {
    let fired = 0;
    runStorm(({ st, advance, now }) => {
      for (let i = 0; i < 5; i++) { st.click(now()); advance(0.1); }
      advance(2.2);
      // the same five clicks, but a second apart — slower than RAPID_GAP_S
      for (let i = 0; i < 5; i++) { if (st.click(now())) fired++; advance(1.0); }
    });
    assert.strictEqual(fired, 0, 'five slow clicks counted as a burst');
    return 'a run of clicks a second apart never reaches a burst';
  });

  check('a burst while ebbing does not flash', () => {
    let fired = 0;
    runStorm(({ st, advance, now }) => {
      for (let i = 0; i < 5; i++) { st.click(now()); advance(0.05); }
      advance(2.0 + 3.0 + 1.5);            // full, held, then well into the ebb
      if (!(st.intensity < 0.97)) throw new Error(`still at ${st.intensity}; the ebb had not started`);
      for (let i = 0; i < 5; i++) { if (st.click(now())) fired++; advance(0.05); }
    });
    assert.strictEqual(fired, 0, 'a burst below full downpour flashed');
    return 'the bar is "already at full downpour", not "was recently"';
  });

  check('the flash and the jolt decay to nothing', () => {
    const st = M.storm.createStorm();
    for (let i = 0; i < 5; i++) { st.click(i * 0.05); st.advance(0.05); }
    for (let i = 0; i < Math.round(2.2 / DT); i++) st.advance(DT);
    for (let i = 0; i < 5; i++) { st.click(3 + i * 0.05); st.advance(0.05); }
    let peak = 0;
    for (let i = 0; i < Math.round(1.2 / DT); i++) { st.advance(DT); peak = Math.max(peak, st.flash); }
    if (!(peak > 0.5)) throw new Error(`the flash never rose: peak ${peak}`);
    assert.strictEqual(st.flash, 0, 'the flash did not return to zero');
    assert.strictEqual(st.shake, 0, 'the jolt did not return to zero');
    return `peak ${peak.toFixed(3)}, both back to exactly 0`;
  });

  // ------------------------------------------------------------------- wind
  setSection('wind');
  check('the rest angle is exactly vertical', () => {
    const w = M.wind.createWind();
    assert.ok(Object.is(w.angleRad, 0), `a fresh wind reads ${w.angleRad}`);
    const d = w.fallDir();
    assert.ok(Object.is(d.x, 0) && d.y === 1, `fallDir at rest is ${JSON.stringify(d)}`);

    // THE CLAMP HAS TO LAND ON ZERO FROM ANY VALUE AT ANY FRAME RATE, so it is
    // exercised from one that no whole number of steps can reach. Decaying from
    // exactly 1.0 at exactly 1/240 s a step arrives at exactly 0 by the
    // arithmetic alone — measured, on a tree with the clamp neutered, which
    // settled on the same exact zero — so the obvious version of this check
    // passes with the clause it is named for removed and says nothing at all.
    const odd = M.wind.createWind();
    odd.scroll(M.wind.normalizeWheel(97, 0, 800));
    odd.scroll(M.wind.normalizeWheel(-233, 0, 800));
    const dt = 1 / 61.3;
    for (let i = 0; i < Math.ceil(9 / dt); i++) odd.advance(dt);
    assert.ok(Object.is(odd.angleRad, 0), `an uneven decay settled at ${odd.angleRad} rad`);
    // AND IT STAYS THERE. Without the clamp the value hunts either side of zero
    // for ever — it reads -8.9e-4 and climbing when this is run against one.
    for (let i = 0; i < 200; i++) {
      odd.advance(dt);
      if (!Object.is(odd.value, 0)) throw new Error(`it left zero again, at ${odd.value}`);
    }
    return 'exactly 0 rad at rest, after an uneven decay, and it stays there';
  });

  check('three rapid scroll actions reach the maximum', () => {
    const w = M.wind.createWind();
    for (let i = 0; i < 3; i++) { w.scroll(M.wind.normalizeWheel(120, 0, 800)); w.advance(DT); }
    near(Math.abs(w.value), 1, 1e-9, 'three notches');
    const two = M.wind.createWind();
    for (let i = 0; i < 2; i++) { two.scroll(M.wind.normalizeWheel(120, 0, 800)); two.advance(DT); }
    if (!(Math.abs(two.value) < 0.9)) throw new Error(`two notches already reached ${two.value}`);
    return `3 x 120 px -> ${w.angleDeg.toFixed(1)}deg, 2 x 120 px -> ${two.angleDeg.toFixed(1)}deg`;
  });

  check('the maximum is a diagonal', () => {
    const w = M.wind.createWind();
    for (let i = 0; i < 4; i++) w.scroll(M.wind.normalizeWheel(120, 0, 800));
    near(Math.abs(w.angleDeg), 45, 1e-9, 'the capped angle');
    const d = w.fallDir();
    near(d.x, d.y, 1e-9, 'a diagonal falls equally in x and y');
    return `${w.angleDeg.toFixed(1)}deg, and it clamps rather than passing it`;
  });

  check('the wind is signed', () => {
    const up = M.wind.createWind(), down = M.wind.createWind();
    up.scroll(M.wind.normalizeWheel(-120, 0, 800));
    down.scroll(M.wind.normalizeWheel(120, 0, 800));
    if (!(up.angleDeg < 0 && down.angleDeg > 0)) {
      throw new Error(`up ${up.angleDeg}, down ${down.angleDeg}`);
    }
    return 'scrolling up leans the rain the other way';
  });

  check('the wind decays to zero six seconds after the last scroll', () => {
    const w = M.wind.createWind();
    for (let i = 0; i < 3; i++) w.scroll(M.wind.normalizeWheel(120, 0, 800));
    const steps = Math.round(6 / DT);
    for (let i = 0; i < steps - 3; i++) w.advance(DT);
    if (!(w.value > 0)) throw new Error('it reached zero early');
    for (let i = 0; i < 3; i++) w.advance(DT);
    assert.strictEqual(w.value, 0, `after six seconds it reads ${w.value}`);
    return 'non-zero at 5.99 s, exactly zero at 6.00 s';
  });

  check('every wheel mode means the same thing', () => {
    const px = M.wind.normalizeWheel(120, 0, 800);
    const lines = M.wind.normalizeWheel(120 / 16, 1, 800);
    near(px, lines, 1e-9, 'one notch in pixels vs in lines');
    const pages = M.wind.normalizeWheel(3, 2, 800);
    if (!(Math.abs(pages) <= 240)) throw new Error(`a page-mode event was not clamped: ${pages}`);
    return `px ${px}, lines ${lines}, a 3-page event clamped to ${pages}`;
  });

  // ---------------------------------------------------------------- ripples
  setSection('ripples');
  check('a ripple carries no record of its cause', () => {
    const f = M.ripples.createRipples();
    const rip = f.spawn(10, 20, { maxR: 40, life: 2, strength: 0.5, rings: 2 });
    const keys = Object.keys(rip).sort();
    assert.deepStrictEqual(keys, [...M.ripples.RIPPLE_FIELDS].sort(),
      `the record is {${keys.join(', ')}}`);
    const smells = keys.filter(k => /source|cause|kind|origin|from|type|click|rain|drop/i.test(k));
    assert.deepStrictEqual(smells, [], `these keys name a cause: ${smells.join(', ')}`);
    return `{${keys.join(', ')}} — geometry and energy only`;
  });

  check('the two spawn paths produce the same record', () => {
    const a = M.ripples.createRipples(), b = M.ripples.createRipples();
    const params = { maxR: 77, life: 2.1, strength: 0.6, rings: 2 };
    const fromRain = a.spawn(300, 400, { ...params });
    const fromClick = b.spawn(300, 400, { ...params });
    assert.deepStrictEqual(fromRain, fromClick, 'the same numbers gave different records');
    return 'identical parameters, identical record';
  });

  check('the front expands from nothing to its full reach and then expires', () => {
    const f = M.ripples.createRipples();
    const rip = f.spawn(0, 0, { maxR: 100, life: 2, strength: 1, rings: 2 });
    assert.strictEqual(rip.r, 0);
    f.advance(1.0);
    if (!(rip.r > 50 && rip.r < 100)) throw new Error(`half way the front is at ${rip.r}`);
    f.advance(0.9);
    const nearEnd = rip.r;
    f.advance(0.2);
    assert.strictEqual(f.list.length, 0, 'it outlived its life');
    return `0 -> ${nearEnd.toFixed(1)} of 100, then gone`;
  });

  check('a downpour is capped, and it is the oldest that goes', () => {
    const f = M.ripples.createRipples();
    for (let i = 0; i < M.ripples.MAX_RIPPLES + 40; i++) {
      f.spawn(i, i, { maxR: 30, life: 5, strength: 0.4, rings: 2 });
      f.advance(0.001);
    }
    assert.strictEqual(f.list.length, M.ripples.MAX_RIPPLES, 'the cap did not hold');
    // WHICH ONES SURVIVED, NOT HOW OLD THEY ARE. This asserted `max(age) < 0.35`,
    // which reads as a statement about the eviction and is really a statement
    // about the CAP: the fixture spawns one per millisecond, so the bar was just
    // the old MAX_RIPPLES of 340 written as a time. Raising the cap took it red
    // on an eviction that was working perfectly.
    //
    // Each ripple is spawned at x = its own index, so the survivors ARE the
    // claim: with 40 spawned past the cap, the 40 oldest must be the 40 gone and
    // the lowest surviving index must be exactly 40. That is stronger than the
    // age bar it replaces and it does not move when the cap does.
    const xs = f.list.map(r => r.x);
    assert.strictEqual(Math.min(...xs), 40, 'the oldest 40 were not the ones evicted');
    assert.strictEqual(Math.max(...xs), M.ripples.MAX_RIPPLES + 39, 'the newest did not survive');
    return `capped at ${M.ripples.MAX_RIPPLES}, the 40 oldest evicted and the newest kept`;
  });

  // ------------------------------------------------------------------- rain
  setSection('rain');
  check('the fall gets heavier with the storm and with the screen', () => {
    const r = M.rain.createRain({ rand: M.rng.makeRandom(1), ripples: M.ripples.createRipples() });
    const idle = r.rateFor(0, 1440, 900), storm = r.rateFor(1, 1440, 900);
    const big = r.rateFor(0, 2880, 1800);
    // THE BAR WAS 20x AND IS 4x, AND THAT IS A WEAKENING WITH A REASON RATHER
    // THAN A THRESHOLD TUNED UNTIL A RED WENT GREEN. It was written when idle
    // was 2.0 drops/s; idle is 45 now, deliberately, so the surface is dense at
    // rest (see koi-rain.js). The RATE ratio is therefore 5.3x where it was
    // 120x — but the rate is no longer the whole of the escalation. Across the
    // same step the fall SPEED goes 900 -> 1900 px/s, the streak alpha rises,
    // the splash switches to the small sharp storm table, and the drops in the
    // AIR roughly double (23 -> 40, measured at 1440x900). What this check can
    // still catch is the thing it is named for — rain that does not respond to
    // the storm at all — and a 4x bar catches that as decisively as 20x did.
    if (!(storm > idle * 4)) throw new Error(`idle ${idle}, downpour ${storm}`);
    near(big / idle, 4, 1e-9, 'four times the area');
    return `${idle.toFixed(1)}/s idle, ${storm.toFixed(0)}/s downpour (${(storm/idle).toFixed(1)}x), x4 on x4 area`;
  });

  check('a drop that lands makes exactly one ripple, where it landed', () => {
    const ripples = M.ripples.createRipples();
    const surf = M.surface.createSurface();
    const rain = M.rain.createRain({ rand: M.rng.makeRandom(4), ripples });
    // One drop, placed by hand, advanced past its own fall time.
    rain.drops.push({ lx: 640, ly: 300, p: 0, fall: 0.2, dist: 300, len: 20, alpha: 0.5 });
    rain._acc = -1e6;    // no new drops, so the count below is about this one
    for (let i = 0; i < 40; i++) {
      rain.advance(0.01, { width: 1280, height: 720, intensity: 0, fallDir: { x: 0, y: 1 }, surface: surf });
    }
    assert.strictEqual(ripples.spawned, 1, `${ripples.spawned} ripples from one drop`);
    const rip = ripples.list[0];
    near(rip.x, surf.px(640), 1e-9, 'the ripple is at the landing point in x');
    near(rip.y, surf.py(300), 1e-9, 'the ripple is at the landing point in y');
    return `one ripple at plane (${rip.x}, ${rip.y.toFixed(1)})`;
  });

  check('the wind does not move where a drop lands', () => {
    const surf = M.surface.createSurface();
    const where = (dir) => {
      const ripples = M.ripples.createRipples();
      const rain = M.rain.createRain({ rand: M.rng.makeRandom(4), ripples });
      rain.drops.push({ lx: 640, ly: 300, p: 0, fall: 0.2, dist: 300, len: 20, alpha: 0.5 });
      rain._acc = -1e6;
      for (let i = 0; i < 40; i++) {
        rain.advance(0.01, { width: 1280, height: 720, intensity: 0, fallDir: dir, surface: surf });
      }
      return ripples.list[0];
    };
    const still = where({ x: 0, y: 1 });
    const gale = where({ x: Math.SQRT1_2, y: Math.SQRT1_2 });
    near(gale.x, still.x, 1e-9, 'the landing point moved with the wind');
    near(gale.y, still.y, 1e-9, 'the landing point moved with the wind');
    return 'the streak tilts; the splash stays put';
  });

  check('a drop is a streak in the air, behind where it will land', () => {
    const d = { lx: 500, ly: 400, p: 0.5, fall: 0.3, dist: 200, len: 24, alpha: 0.5 };
    const seg = M.rain.dropSegment(d, { x: 0, y: 1 });
    near(seg.y, 400 - 100, 1e-9, 'half way down');
    near(seg.x, 500, 1e-9, 'straight down means no lateral drift');
    near(seg.y2, seg.y - 24, 1e-9, 'the streak trails behind the drop');
    const tilted = M.rain.dropSegment(d, { x: Math.SQRT1_2, y: Math.SQRT1_2 });
    if (!(tilted.x < 500)) throw new Error('a tilted drop did not approach from the side');
    return 'position and trail both follow the fall direction';
  });

  // ------------------------------------------------------------------- fish
  setSection('fish');
  // A FIXTURE MUST NOT BE HANDED FEWER KOI THAN IT THINKS IT HAS. Several
  // checks below take the seeded pond and then write `school.fish.length = 4`
  // and place those four by hand — which SILENTLY DOES NOTHING on an array of
  // two, and nothing at all on an empty one, so the fixture measures a pond it
  // never built and reports the miss as a failure of whatever it was checking.
  // Measured on a mutation that stops containment carrying an entering koi in:
  // seed() returned ZERO fish and two ripple checks failed with a message about
  // ripples. The guard turns that into the sentence it actually is.
  const makeSchool = (seed, W = 1440, H = 900) => {
    const rand = M.rng.makeRandom(seed);
    const s = M.fish.createSchool({ rand, surface: M.surface.createSurface(), width: W, height: H });
    s.seed(W, H);
    const want = s.targetFor(0);
    if (s.fish.length !== want) {
      throw new Error(`seed() left ${s.fish.length} koi, not ${want} — the fixture has no pond to measure`);
    }
    return s;
  };

  check('every trait is a slider in nought to one', () => {
    const s = makeSchool(21);
    const all = s.fish.flatMap(f => [f.traits.speed, f.traits.ripple, f.traits.social]);
    for (const v of all) if (!(v >= 0 && v <= 1)) throw new Error(`a trait read ${v}`);
    const distinct = new Set(s.fish.map(f => JSON.stringify(f.traits))).size;
    assert.strictEqual(distinct, s.fish.length, 'two fish were rolled identical');
    return `${all.length} trait values in [0,1], ${distinct} distinct fish`;
  });

  check('koi vary mildly in size around an inch', () => {
    const s = makeSchool(33);
    const lens = s.fish.map(f => f.len);
    const lo = Math.min(...lens), hi = Math.max(...lens);
    if (!(lo > M.fish.BODY_LEN_PX * 0.7 && hi < M.fish.BODY_LEN_PX * 1.3)) {
      throw new Error(`sizes ran ${lo.toFixed(0)}..${hi.toFixed(0)} against a ${M.fish.BODY_LEN_PX} px body`);
    }
    assert.strictEqual(M.fish.BODY_LEN_PX, 96, 'an inch at 96 CSS px per inch');
    return `${lo.toFixed(0)}-${hi.toFixed(0)} px around ${M.fish.BODY_LEN_PX}`;
  });

  check('the pond is fuller when it is calm than when it storms', () => {
    const s = makeSchool(5);
    const calm = s.targetFor(0), storm = s.targetFor(1);
    assert.strictEqual(calm, 7, `calm target is ${calm}`);
    assert.strictEqual(storm, 3, `storm target is ${storm}`);
    let prev = calm;
    for (let i = 1; i <= 10; i++) {
      const t = s.targetFor(i / 10);
      if (t > prev) throw new Error(`the target rose with the storm at ${i / 10}`);
      prev = t;
    }
    return `7 calm, 3 in a downpour, monotone between`;
  });

  check('the pond holds three to seven koi on screen', () => {
    // Real ripples from a real emitter, so the fish are genuinely disturbed.
    let worstLo = 99, worstHi = 0, cases = 0;
    for (const [W, H] of [[1440, 900], [390, 844], [2560, 1440]]) {
      for (const seed of [2, 88]) {
        for (const I of [0, 1]) {
          const rand = M.rng.makeRandom(seed);
          const surf = M.surface.createSurface();
          const school = M.fish.createSchool({ rand, surface: surf, width: W, height: H });
          const ripples = M.ripples.createRipples();
          const rain = M.rain.createRain({ rand, ripples });
          school.seed(W, H);
          for (let i = 0; i < 60 * 70; i++) {
            rain.advance(1 / 60, { width: W, height: H, intensity: I, fallDir: { x: 0, y: 1 }, surface: surf });
            ripples.advance(1 / 60);
            school.advance(1 / 60, { ripples: ripples.list, intensity: I, width: W, height: H });
            if (i > 60 * 20) {
              const v = school.visibleCount(W, H);
              worstLo = Math.min(worstLo, v); worstHi = Math.max(worstHi, v);
            }
          }
          cases++;
        }
      }
    }
    if (worstLo < M.fish.MIN_ON_SCREEN) throw new Error(`only ${worstLo} koi were on screen at one point`);
    if (worstHi > M.fish.MAX_ON_SCREEN) throw new Error(`${worstHi} koi were on screen at one point`);
    return `${worstLo}-${worstHi} across ${cases} runs of 70 s, three viewports, calm and downpour`;
  });

  check('the population does not churn at a steady intensity', () => {
    const rand = M.rng.makeRandom(9);
    const surf = M.surface.createSurface();
    const school = M.fish.createSchool({ rand, surface: surf, width: 1440, height: 900 });
    const ripples = M.ripples.createRipples();
    const rain = M.rain.createRain({ rand, ripples });
    school.seed(1440, 900);                      // seven koi, the calm target
    const step = (I) => {
      rain.advance(1 / 60, { width: 1440, height: 900, intensity: I, fallDir: { x: 0, y: 1 }, surface: surf });
      ripples.advance(1 / 60);
      school.advance(1 / 60, { ripples: ripples.list, intensity: I, width: 1440, height: 900 });
    };
    // Fall to the downpour target and settle there. This part SHOULD cost
    // departures: it is the population change the brief asks for.
    for (let i = 0; i < 60 * 45; i++) step(1);
    const settled = school.arrivals + school.departures;
    if (!(settled >= 3)) throw new Error(`the pond never shed koi for the storm: ${settled} changes`);
    // From here the target does not move, so nothing should.
    for (let i = 0; i < 60 * 120; i++) step(1);
    const after = school.arrivals + school.departures - settled;
    if (after > 1) throw new Error(`${after} arrivals+departures over two settled minutes`);
    return `${settled} changes falling 7 -> ${school.target}, then ${after} over 120 s held there`;
  });

  // THE ENTRY AND THE EXIT. The brief's "3-7 koi on screen" is a statement
  // about a POND, and a pond does not conjure a fish in the middle of it: a koi
  // that blinks into existence in clear water, or out of it, reads as a bug in
  // the page rather than as weather. Every check below judges inside/outside
  // with surface.visible(), which is an owner koi-fish.js does not write — the
  // school records WHERE it put each koi and nothing else, so the claim under
  // test never gets to answer for itself.

  check('a koi is never placed inside the frame', () => {
    const surf = M.surface.createSurface();
    let spawns = 0, bad = 0, worstIn = -Infinity, nearest = Infinity;
    // Four viewports (one of them phone-shaped, where the frame is small enough
    // that an "outside" figure tuned on a desktop could still land in view) and
    // a storm that swings, because a spawn only happens when the target moves.
    for (const [W, H] of [[1440, 900], [390, 844], [1920, 1080], [820, 1180]]) {
      for (let seed = 1; seed <= 4; seed++) {
        const school = M.fish.createSchool({
          rand: M.rng.makeRandom(seed * 97), surface: surf, width: W, height: H });
        const seen = new Set();
        const drain = () => {
          for (const sp of school.spawnLog) {
            if (seen.has(sp.id)) continue;
            seen.add(sp.id);
            spawns++;
            const vis = surf.visible(sp.w, sp.h, 0);
            // How far OUTSIDE the frame it is, on its worst axis. Positive is
            // outside; anything at or below zero is a koi placed in view.
            const out = Math.max(vis.x0 - sp.x, sp.x - vis.x1, vis.y0 - sp.y, sp.y - vis.y1);
            if (out <= 0) bad++;
            worstIn = Math.max(worstIn, -out);
            nearest = Math.min(nearest, out);
          }
        };
        // The SEED is in this too, and it is the case most likely to be
        // exempted by accident: a page that opens full is the one place it is
        // tempting to just put seven koi on the water.
        school.seed(W, H);
        drain();
        for (let i = 0; i < 60 * 150; i++) {
          const t = (i / 60) % 60;
          const I = t < 12 ? 0 : t < 30 ? 1 : t < 45 ? 0 : 1;
          school.advance(1 / 60, { ripples: [], intensity: I, width: W, height: H });
          if (i % 30 === 0) drain();
        }
        drain();
      }
    }
    if (spawns < 200) throw new Error(`only ${spawns} spawns to judge — the fixture is not exercising the manager`);
    if (bad > 0) throw new Error(`${bad} of ${spawns} koi were placed inside the frame`);
    return `${spawns} spawns across four viewports, every one outside the frame (nearest ${nearest.toFixed(0)} plane px out)`;
  });

  check('no koi appears or vanishes in view', () => {
    // THE PROPERTY THE SPAWN LOG CANNOT STATE. A koi could be born outside and
    // still be culled mid-frame, or be teleported after birth. This watches
    // every koi that ever exists and asks two questions about it: was it off
    // screen the first time it was seen, and was it off screen the last time?
    const surf = M.surface.createSurface();
    let born = 0, poppedIn = 0, poppedOut = 0, ended = 0;
    for (const [W, H] of [[1440, 900], [390, 844], [1920, 1080]]) {
      for (let seed = 1; seed <= 3; seed++) {
        const school = M.fish.createSchool({
          rand: M.rng.makeRandom(seed * 31), surface: surf, width: W, height: H });
        school.seed(W, H);
        // The seed's koi are ALREADY swum in by the time seed() returns — that
        // is the whole point of the warm-up — so the watch starts from the ids
        // it produced and asks the question of everyone after them.
        const seeded = new Set(school.fish.map((f) => f.id));
        const rec = new Map();
        for (let i = 0; i < 60 * 180; i++) {
          const t = (i / 60) % 60;
          const I = t < 12 ? 0 : t < 30 ? 1 : t < 45 ? 0 : 1;
          school.advance(1 / 60, { ripples: [], intensity: I, width: W, height: H });
          const alive = new Set();
          for (const f of school.fish) {
            alive.add(f.id);
            const on = surf.onScreen(f.x, f.y, W, H, 0);
            let r = rec.get(f.id);
            if (!r) { r = { firstOn: on, lastOn: on }; rec.set(f.id, r); if (!seeded.has(f.id)) born++; }
            r.lastOn = on;
          }
          for (const [id, r] of rec) {
            if (!r.gone && !alive.has(id)) { r.gone = true; if (!seeded.has(id)) { ended++; if (r.lastOn) poppedOut++; } }
          }
        }
        for (const [id, r] of rec) if (!seeded.has(id) && r.firstOn) poppedIn++;
      }
    }
    if (born < 100) throw new Error(`only ${born} koi were born — the fixture is not exercising the manager`);
    if (ended < 50) throw new Error(`only ${ended} koi left — nothing is being culled`);
    if (poppedIn > 0) throw new Error(`${poppedIn} of ${born} koi were already in view the first frame they existed`);
    if (poppedOut > 0) throw new Error(`${poppedOut} of ${ended} koi were still in view the frame they were removed`);
    return `${born} koi in and ${ended} out over three viewports, none of either in view`;
  });

  check('a koi swims in rather than crawling in', () => {
    // THE WITNESS FOR THE BRAKE. Containment is what carries an entering koi in,
    // and it is also what slows a koi that is coming about — so applied
    // indiscriminately it throttles the entry to a third speed at the exact
    // point the fish is deepest in the band. Measured with it ungated the mean
    // entry took over fifteen seconds and the pond spent its time waiting.
    const surf = M.surface.createSurface();
    const W = 1440, H = 900;
    const times = [];
    for (let seed = 1; seed <= 4; seed++) {
      const school = M.fish.createSchool({
        rand: M.rng.makeRandom(seed * 13), surface: surf, width: W, height: H });
      school.seed(W, H);
      const born = new Map();
      const seeded = new Set(school.fish.map((f) => f.id));
      let t = 0;
      for (let i = 0; i < 60 * 150; i++) {
        const u = (i / 60) % 50;
        const I = u < 10 ? 0 : u < 25 ? 1 : 0;
        school.advance(1 / 60, { ripples: [], intensity: I, width: W, height: H });
        t += 1 / 60;
        for (const f of school.fish) {
          if (seeded.has(f.id)) continue;
          if (!born.has(f.id)) born.set(f.id, { t0: t, tIn: null });
          const r = born.get(f.id);
          if (r.tIn === null && surf.onScreen(f.x, f.y, W, H, 0)) r.tIn = t;
        }
      }
      for (const r of born.values()) if (r.tIn !== null) times.push(r.tIn - r.t0);
    }
    if (times.length < 20) throw new Error(`only ${times.length} entries to measure`);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const worst = Math.max(...times);
    // Loose bars on purpose: what is being ruled out is a koi that is visibly
    // barely moving, not a particular speed. A fish crossing ~150 plane px at
    // a third of a 21-57 px/s cruise takes 11 s at best and 40 at worst.
    if (mean > 8) throw new Error(`a koi takes ${mean.toFixed(1)} s on average to swim into frame`);
    if (worst > 20) throw new Error(`one koi took ${worst.toFixed(1)} s to swim into frame`);
    return `${times.length} entries, ${mean.toFixed(1)} s mean and ${worst.toFixed(1)} s worst from spawn to in frame`;
  });

  check('a koi sent away is called back rather than replaced', () => {
    // A DEPARTURE IS NOT INSTANT ANY MORE, which creates a state that could not
    // exist while a leaving koi faded out on the spot: one that has been sent
    // away, is still in the frame, and is wanted again. Spawning there puts an
    // eighth koi on the water while the seventh is still swimming off. Both
    // halves are asserted — that the recall happens, and that the count it is
    // protecting never breaks.
    const surf = M.surface.createSurface();
    const W = 1440, H = 900;
    let recalls = 0, spawnsInWindow = 0, worstVisible = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const school = M.fish.createSchool({
        rand: M.rng.makeRandom(seed * 7 + 1), surface: surf, width: W, height: H });
      school.seed(W, H);
      const step = (I) => {
        school.advance(1 / 60, { ripples: [], intensity: I, width: W, height: H });
        worstVisible = Math.max(worstVisible, school.visibleCount(W, H));
      };
      for (let i = 0; i < 60 * 6; i++) step(0);
      // Storm just long enough to send one or two away, then stop at once —
      // the fish that were sent are still on screen when the pond wants them.
      const before = school.recalls, spawnedBefore = school.arrivals;
      for (let i = 0; i < 60 * 5; i++) step(1);
      for (let i = 0; i < 60 * 10; i++) step(0);
      recalls += school.recalls - before;
      spawnsInWindow += school.arrivals - spawnedBefore;
    }
    if (recalls === 0) throw new Error('no koi was ever called back, over six short storms');
    if (worstVisible > M.fish.MAX_ON_SCREEN) throw new Error(`${worstVisible} koi were on screen at one point`);
    return `${recalls} recalled and ${spawnsInWindow} newly called in over six short storms, never more than ${worstVisible} on screen`;
  });

  check('the drawn koi is smoother than the one it follows', () => {
    // THE WITNESS FOR THE LAGS, AND ITS REFERENCE HAS A DIFFERENT OWNER. The
    // expected values are f.heading and f.omega, which the steering writes and
    // the lag never touches; the quantities under test are f.drawHeading and
    // f.bend, which only the lag writes. DRAW_TAU and BEND_TAU are deliberately
    // NOT imported — a bar read out of the constant under test would move with
    // a defect in it and could not fail.
    //
    // THE STATISTIC IS THE JERK, NOT THE STEP, and that distinction is the
    // whole reading. A drawn heading MUST track a sustained turn, so its
    // per-frame step is about the same as the raw one at the maximum (measured,
    // ratio 0.955) and a bar on the step would say nothing at all. What reads
    // as sharp is the step CHANGING abruptly, which is the second difference.
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    let jRaw = 0, jDrawn = 0, sRaw = 0, sDrawn = 0, offMax = 0, n = 0;
    for (const seed of [11, 37]) {
      const surf = M.surface.createSurface();
      const W = 1440, H = 900, dt = 1 / 60;
      const rand = M.rng.makeRandom(seed);
      const school = M.fish.createSchool({ rand, surface: surf, width: W, height: H });
      const ripples = M.ripples.createRipples();
      const rain = M.rain.createRain({ rand, ripples });
      school.seed(W, H);
      const prev = new Map();
      for (let i = 0; i < 60 * 40; i++) {
        // Both weathers: the reversals this exists for are worst in a crowded
        // ripple field, and the plain pond is where a lag could hide.
        const I = ((i / 60) % 40) < 20 ? 0 : 0.8;
        rain.advance(dt, { width: W, height: H, intensity: I, fallDir: { x: 0, y: 1 }, surface: surf });
        ripples.advance(dt);
        school.advance(dt, { ripples: ripples.list, intensity: I, width: W, height: H });
        for (const f of school.fish) {
          const p = prev.get(f.id);
          const stepH = p ? wrap(f.heading - p.h) : null;
          const stepD = p ? wrap(f.drawHeading - p.dh) : null;
          if (p) {
            sRaw = Math.max(sRaw, Math.abs(f.omega - p.o));
            sDrawn = Math.max(sDrawn, Math.abs(f.bend - p.b));
            if (p.stepH !== null) {
              jRaw = Math.max(jRaw, Math.abs(stepH - p.stepH));
              jDrawn = Math.max(jDrawn, Math.abs(stepD - p.stepD));
            }
            // ...AND IT IS STILL A LAG RATHER THAN A DISCONNECT. Position and
            // heading are lagged with ONE constant so the drawn koi is (near
            // enough) the koi a tenth of a second ago: a coherent fish, whose
            // nose points along the way its own drawn body is going. Without
            // this clause a FROZEN drawn placement would pass the two above.
            const ddx = f.drawX - p.dx, ddy = f.drawY - p.dy;
            if (Math.hypot(ddx, ddy) > 1e-3) {
              offMax = Math.max(offMax, Math.abs(wrap(Math.atan2(ddy, ddx) - f.drawHeading)));
              n++;
            }
          }
          prev.set(f.id, { h: f.heading, dh: f.drawHeading, o: f.omega, b: f.bend,
                           dx: f.drawX, dy: f.drawY, stepH, stepD });
        }
      }
    }
    if (n < 5000) throw new Error(`only ${n} moving samples to measure`);
    const jr = jDrawn / jRaw, sr = sDrawn / sRaw, offDeg = offMax * 180 / Math.PI;
    // Bars with real headroom over the measured 0.132 / 0.323 / 5.2 deg: what
    // is ruled out is a placement drawn RAW, not a particular time constant.
    if (!(jr <= 0.40)) throw new Error(`drawn heading jerk is ${(jr * 100).toFixed(0)}% of the raw jerk`);
    if (!(sr <= 0.60)) throw new Error(`drawn bend steps ${(sr * 100).toFixed(0)}% as hard as the turn rate`);
    if (!(offDeg <= 15)) throw new Error(`the drawn koi points ${offDeg.toFixed(1)} deg off its own drawn travel`);
    return `jerk ${(jr * 100).toFixed(0)}% of raw, bend steps ${(sr * 100).toFixed(0)}% of raw, `
         + `points within ${offDeg.toFixed(1)} deg of its own travel over ${n} samples`;
  });

  check('the drawn koi rides the chain it is given', () => {
    // WHERE THE DRAWING IS PINNED TO THE CHAIN, and nothing else here can see
    // it: that is a rendering decision, so this drives the SHIPPED renderer
    // through a recording context rather than restating the law.
    //
    // WHAT THIS REPLACED, AND WHY IT COULD NOT BE REPAIRED. It was
    // `the bend moves the head too`, which swung `f.bend` from one saturated
    // end to the other and asked how much of the excursion the head took. The
    // chain rewrite deleted the mechanism underneath it: `drawFish` reads
    // f.len, f.spine, f.seg, f.speed, f.phase, f.finPhase and f.patches, and
    // `f.bend` is not among them — the body bends because it is physically
    // behind the head, not because a curvature bias is applied to it. The check
    // did not go quietly red on a stale claim, it THREW on a fixture with no
    // `spine`, and its mutant's anchor had gone from the file at the same time.
    // The two shielded each other: a dirty base pass stops the sweep before the
    // anchor guard runs, so nothing reported the disarmed mutant either.
    //
    // THE CLAIM THAT SURVIVED THE REWRITE is the one worth keeping, and it is
    // now three: the drawing is a function of the CHAIN (translate the chain and
    // every vertex translates with it, exactly), it is LOCAL to the chain (bend
    // the tail joints and the head end does not move), and its head end is at
    // the chain's own head joint rather than somewhere along it.
    const surf = M.surface.createSurface();
    let pts = [];
    const noop = () => {};
    const rec = new Proxy({
      moveTo: (x, y) => pts.push(x, y), lineTo: (x, y) => pts.push(x, y),
      quadraticCurveTo: (a, b, x, y) => pts.push(a, b, x, y),
      bezierCurveTo: (a, b, c, d, x, y) => pts.push(a, b, c, d, x, y),
      ellipse: (x, y) => pts.push(x, y), arc: (x, y) => pts.push(x, y),
      createRadialGradient: () => ({ addColorStop: noop }),
      createLinearGradient: () => ({ addColorStop: noop }),
    }, { get: (t, k) => (k in t ? t[k] : noop), set: () => true });
    const rend = M.draw.createRenderer(rec, surf);
    const L = 96, X = 400, Y = 300;
    const N = M.fish.SPINE_JOINTS;
    const seg = M.fish.CHAIN_SPAN_U * L / (N - 1);
    // Straight, nose at (X, Y), running back along -x: the chain koi-fish.js
    // lays down behind a head pointing at +x.
    const chain = (edit) => {
      const sp = [];
      for (let i = 0; i < N; i++) sp.push({ x: X - seg * i, y: Y });
      if (edit) edit(sp);
      return sp;
    };
    const grab = (spine) => {
      pts = [];
      rend.drawFish({ id: 1, len: L, seg, spine, speed: 40, phase: 0.8, finPhase: 0.7,
        patches: [{ s: 0.26, t: -0.10, rx: 0.08, ry: 0.6, rot: 0.2 }] });
      return pts.slice();
    };

    const a = grab(chain());
    const D = 30;
    const moved = grab(chain(sp => sp.forEach(j => { j.y += D; })));
    const bent = grab(chain(sp => { for (let i = 8; i < N; i++) sp[i].y += D; }));
    if (a.length < 200) throw new Error(`only ${a.length / 2} vertices were emitted`);
    if (moved.length !== a.length || bent.length !== a.length) {
      throw new Error(`the three draws do not correspond (${a.length}/${moved.length}/${bent.length})`);
    }

    // (i) Translating the CHAIN translates the drawing, exactly. In screen space
    // that is dy = D * squash and dx = 0, at every vertex — the drawing is a
    // function of the chain and of no other position.
    let worst = 0;
    for (let k = 0; k < a.length; k += 2) {
      worst = Math.max(worst, Math.abs(moved[k] - a[k]),
                              Math.abs((moved[k + 1] - a[k + 1]) - D * surf.squash));
    }
    if (!(worst < 1e-9)) throw new Error(`a translated chain moved a vertex by ${worst} off the translation`);

    // (ii) LOCAL, not rigid: bending only the back half moves the tail a long
    // way and leaves the head end exactly where it was. A koi hung off one joint
    // passes (i) and (iii) and fails this.
    let headMoved = 0, tailMoved = 0;
    for (let k = 0; k < a.length; k += 2) {
      const d = Math.hypot(a[k] - bent[k], a[k + 1] - bent[k + 1]);
      // The head end, in the fish's own frame: within a third of a body length
      // forward of the nose joint, which is the head and the shoulders.
      if (a[k] > X - L * 0.33) headMoved = Math.max(headMoved, d);
      else tailMoved = Math.max(tailMoved, d);
    }
    if (!(tailMoved > 8)) throw new Error(`bending the back half barely moved the tail (${tailMoved.toFixed(2)} px)`);
    if (!(headMoved < 1e-9)) throw new Error(`bending the back half moved the head by ${headMoved.toFixed(3)} px`);

    // (iii) The head end is AT the chain's head joint. The nose domes forward of
    // it and the flanks stand off it, so this is a body width rather than zero —
    // what it refuses is a drawing whose nose sits a joint or more back.
    let nearest = Infinity;
    for (let k = 0; k < a.length; k += 2) {
      nearest = Math.min(nearest, Math.hypot(a[k] - X, a[k + 1] / surf.squash - Y));
    }
    if (!(nearest < L * 0.14)) throw new Error(`the nearest drawn vertex is ${nearest.toFixed(1)} px from the chain's head joint`);
    return `translation exact to ${worst.toExponential(1)}, tail ${tailMoved.toFixed(1)} px against a head of 0, nose ${nearest.toFixed(1)} px off the joint`;
  });

  check('any ripple gets the same reaction', () => {
    // THE BRIEF'S CENTRAL CLAIM. Two ponds, identical in every way, each given
    // one ripple. The ripples agree on every quantity a disturbance HAS —
    // where it is, how far its front has reached, how hard it hit — and differ
    // only in `rings`, which is how many circles the renderer strokes. If the
    // koi move differently, something in the fish is reading the cause.
    //
    // THE KOI ARE PLACED BY HAND AND THEIR TRAITS ARE SET BY HAND, and the
    // first version of this did neither. Seeded at random around a fixed
    // ripple, whether ANY koi was inside the 330 px reach was up to the seed,
    // and a koi whose ripple trait sits near the indifferent midpoint weights
    // the whole term by nearly zero — so the check passed on a pond where the
    // ripple could not have changed anything, and MISSED the mutation it
    // exists for. Four koi, ringed around the ripple well inside the reach, at
    // the two extremes of the trait and two points between.
    const build = (rings) => {
      const school = makeSchool(64);
      school.fish.length = 4;
      school._cool = 1e9;
      const traits = [0, 0.25, 0.75, 1];
      school.fish.forEach((f, i) => {
        const a = i * Math.PI / 2;
        f.traits.ripple = traits[i];
        f.traits.social = 0.5;
        f.baseSpeed = 40; f.speed = 40; f.alarm = 0;
        f.x = 700 + Math.cos(a) * 150;
        f.y = 700 + Math.sin(a) * 150;
        f.heading = a + Math.PI / 2;
        for (let k = 0; k < f.spine.length; k++) {
          f.spine[k].x = f.x - Math.cos(f.heading) * f.seg * k;
          f.spine[k].y = f.y - Math.sin(f.heading) * f.seg * k;
        }
      });
      const rip = { x: 700, y: 700, r: 0, maxR: 120, age: 0, life: 2.3, strength: 0.98, rings };
      for (let i = 0; i < 60 * 3; i++) {
        rip.age += 1 / 60;
        rip.r = rip.maxR * M.ripples.frontAt(rip.age / rip.life);
        school.advance(1 / 60, { ripples: rip.age < rip.life ? [rip] : [],
                                 intensity: 0, width: 1440, height: 900 });
      }
      return school.fish.map(f => [f.x, f.y, f.heading, f.speed, f.alarm]);
    };
    const a = build(2), b = build(3);
    assert.strictEqual(a.length, b.length, 'the two ponds ended with different fish');
    for (let i = 0; i < a.length; i++) {
      for (let k = 0; k < a[i].length; k++) {
        if (!Object.is(a[i][k], b[i][k])) {
          throw new Error(`fish ${i} differs in field ${k}: ${a[i][k]} vs ${b[i][k]}`);
        }
      }
    }
    // And the fixture is not vacuous: the ripple genuinely moved these koi.
    const still = (() => {
      const school = makeSchool(64);
      school.fish.length = 4; school._cool = 1e9;
      school.fish.forEach((f, i) => {
        const ang = i * Math.PI / 2;
        f.traits.ripple = [0, 0.25, 0.75, 1][i]; f.traits.social = 0.5;
        f.baseSpeed = 40; f.speed = 40; f.alarm = 0;
        f.x = 700 + Math.cos(ang) * 150; f.y = 700 + Math.sin(ang) * 150;
        f.heading = ang + Math.PI / 2;
        for (let k = 0; k < f.spine.length; k++) {
          f.spine[k].x = f.x - Math.cos(f.heading) * f.seg * k;
          f.spine[k].y = f.y - Math.sin(f.heading) * f.seg * k;
        }
      });
      for (let i = 0; i < 60 * 3; i++) {
        school.advance(1 / 60, { ripples: [], intensity: 0, width: 1440, height: 900 });
      }
      return school.fish.map(f => [f.x, f.y]);
    })();
    const moved = a.reduce((m, f, i) => Math.max(m, Math.hypot(f[0] - still[i][0], f[1] - still[i][1])), 0);
    if (!(moved > 25)) {
      throw new Error(`the ripple moved the koi by only ${moved.toFixed(1)} px against no ripple at all — `
        + 'this fixture cannot see the difference it is testing for');
    }
    return `${a.length} koi across the whole trait range, bit-identical under a "rain" and a "click" `
      + `ripple, and displaced ${moved.toFixed(0)} px by it`;
  });

  check('some koi swim to a ripple and some flee it', () => {
    // MEASURED AS CLOSEST AND FARTHEST APPROACH, never as the distance at the
    // end. An attracted koi reaches the ripple and keeps swimming: at 45 px/s
    // over four and a half seconds it covers 200 px on a 150 px approach, so
    // it is 26 px PAST the thing it swam to when the clock stops, and a check
    // reading the final distance reports that it fled.
    const run = (rippleTrait) => {
      const school = makeSchool(101);
      const f = school.fish[0];
      school.fish.length = 1;                  // no neighbours, no company term
      school._cool = 1e9;                      // and none arrives part way through
      f.traits.ripple = rippleTrait;
      f.baseSpeed = 45;                        // so the reading is not the seed's
      f.speed = 45;
      f.x = 700; f.y = 500; f.heading = 0; f.alarm = 0;
      for (let i = 0; i < f.spine.length; i++) { f.spine[i].x = f.x - i * f.seg; f.spine[i].y = f.y; }
      // A LONG-LIVED RIPPLE WELL INSIDE THE REACH. This is a fixture for the
      // STEERING LAW: a koi facing across the stimulus spends the first second
      // and a half coming about, and a shipped ripple dies at 2.5 s, which is
      // the turn and almost nothing else. Its weight also falls off with
      // distance, so at the edge of the 330 px reach it sits below the wander
      // and the fixture measures the meander instead of the reaction.
      const rip = { x: 700, y: 650, r: 0, maxR: 130, age: 0, life: 5.0, strength: 1, rings: 3 };
      const d0 = Math.hypot(rip.x - f.x, rip.y - f.y);
      let lo = d0, hi = d0;
      for (let i = 0; i < 60 * 4.5; i++) {
        rip.age += 1 / 60;
        rip.r = rip.maxR * M.ripples.frontAt(rip.age / rip.life);
        school.advance(1 / 60, { ripples: [rip], intensity: 0, width: 1440, height: 900 });
        const d = Math.hypot(rip.x - f.x, rip.y - f.y);
        lo = Math.min(lo, d); hi = Math.max(hi, d);
      }
      return { d0, lo, hi };
    };
    const drawn = run(1), fled = run(0), mid = run(0.5);
    // THE BARS ARE PROPORTIONS, NOT PIXEL COUNTS: halve the distance, or half
    // again. A koi does not land on a ripple — it has a turning circle and a
    // meander — so "closed by 80 px" is a claim about how tight an arc it flies
    // rather than about which way it went.
    if (!(drawn.lo < drawn.d0 * 0.6)) {
      throw new Error(`an attracted koi only closed to ${drawn.lo.toFixed(0)} px of ${drawn.d0.toFixed(0)}`);
    }
    if (!(fled.hi > fled.d0 * 1.5)) {
      throw new Error(`an averse koi only opened to ${fled.hi.toFixed(0)} px of ${fled.d0.toFixed(0)}`);
    }
    if (!(fled.lo > fled.d0 * 0.75)) {
      throw new Error(`an averse koi approached to ${fled.lo.toFixed(0)} px of ${fled.d0.toFixed(0)}`);
    }
    if (!(drawn.lo < mid.lo && fled.hi > mid.hi)) {
      throw new Error(`a koi at 0.5 was not between the two: closest ${mid.lo.toFixed(0)}, farthest ${mid.hi.toFixed(0)}`);
    }
    return `from ${drawn.d0.toFixed(0)} px: trait 1 closed to ${drawn.lo.toFixed(0)}, `
      + `trait 0 opened to ${fled.hi.toFixed(0)} (never nearer than ${fled.lo.toFixed(0)}), `
      + `trait 0.5 ${mid.lo.toFixed(0)}-${mid.hi.toFixed(0)}`;
  });

  await checkAsync('separation is a body, not a personality', async () => {
    // A COMPARISON, NOT A THRESHOLD, and for the reason this repo already
    // learned on /print's contour check: the closest approach over a long run
    // is a TAIL statistic set by a single unlucky head-on encounter, so a bar
    // on it moves every time a seed is added — measured, 39 px over three
    // seeds and 24 px over six. What is stable, and what the claim actually
    // is, is that separation is doing the work AT BOTH ENDS of the sociability
    // slider: it is a body, not a personality. So the same pond is run against
    // a tree with the separation term removed, and the difference is the
    // measurement.
    // THE CONTROL TREE IS BUILT FROM THE SOURCE ON DISK, WHICH IS NOT THE TREE
    // UNDER TEST DURING A SWEEP. loadScene reads the pristine file and applies
    // only this one edit, so while --negative-control has a koi-fish mutation
    // active, `M` carries it and `control` does not — and any mutation that
    // moves the koi about therefore shifts one side of the ratio and not the
    // other. That is why several fish mutants list this check as collateral
    // they are ALLOWED to redden: it is the comparison losing its footing, not
    // the claim failing. Composing the sweep's mutation into the control would
    // fix it (loadScene would take a list of edits and chain them onto one
    // file) and is deliberately not done here — it is shared machinery three
    // pre-existing mutants already depend on, and naming the collateral keeps
    // the check exactly as strict in the meantime.
    const control = await loadScene({ id: 'no-separation-control', file: 'scene/koi-fish.js',
      from: 'const W_SEPARATE = 1.7;', to: 'const W_SEPARATE = 0;' });
    const closest = (mod, social) => {
      let worst = Infinity;
      for (const seed of [7, 44, 91]) {
        const school = mod.fish.createSchool({ rand: mod.rng.makeRandom(seed),
          surface: mod.surface.createSurface(), width: 1440, height: 900 });
        school.seed(1440, 900);
        for (const f of school.fish) { f.traits.social = social; f.traits.ripple = 0.5; }
        for (let i = 0; i < 60 * 60; i++) {
          school.advance(1 / 60, { ripples: [], intensity: 0, width: 1440, height: 900 });
          if (i < 60 * 6) continue;
          for (let a = 0; a < school.fish.length; a++) {
            for (let b = a + 1; b < school.fish.length; b++) {
              worst = Math.min(worst, Math.hypot(school.fish[a].x - school.fish[b].x,
                                                 school.fish[a].y - school.fish[b].y));
            }
          }
        }
      }
      return worst;
    };
    const onSchool = closest(M, 1), offSchool = closest(control, 1);
    const onSolo = closest(M, 0), offSolo = closest(control, 0);
    // THE TWO BARS DIFFER AND THE DIFFERENCE IS A MEASUREMENT, not a fudge. At
    // full sociability the personality is pulling the koi TOGETHER, so
    // separation is the only thing holding them apart and removing it collapses
    // the approach. At full solitude the personality is already pushing them
    // apart, so separation has far less left to do — measured 143 px with it
    // against 90 px without, where the schooling end reads 5x. Asking for the
    // same ratio at both ends would be asking the solitary koi to prove
    // something that is not true of them.
    if (!(onSchool > offSchool * 2.5)) {
      throw new Error(`at full sociability, separation bought only ${onSchool.toFixed(1)} px against ${offSchool.toFixed(1)} px without it`);
    }
    if (!(onSolo > offSolo)) {
      throw new Error(`at full solitude, separation made things worse: ${onSolo.toFixed(1)} px against ${offSolo.toFixed(1)} px without it`);
    }
    return `closest approach ${onSchool.toFixed(0)} px schooling (${offSchool.toFixed(0)} without) and `
      + `${onSolo.toFixed(0)} px solitary (${offSolo.toFixed(0)} without)`;
  });

  check('schooling koi end up nearer each other than solitary ones', () => {
    const spread = (social) => {
      const school = makeSchool(44);
      for (const f of school.fish) { f.traits.social = social; f.traits.ripple = 0.5; }
      let sum = 0, n = 0;
      for (let i = 0; i < 60 * 90; i++) {
        school.advance(1 / 60, { ripples: [], intensity: 0, width: 1440, height: 900 });
        if (i % 30 || i < 60 * 20) continue;
        for (let a = 0; a < school.fish.length; a++) {
          for (let b = a + 1; b < school.fish.length; b++) {
            sum += Math.hypot(school.fish[a].x - school.fish[b].x, school.fish[a].y - school.fish[b].y);
            n++;
          }
        }
      }
      return sum / n;
    };
    const together = spread(1), apart = spread(0);
    if (!(together < apart)) throw new Error(`schooling ${together.toFixed(0)} px vs solitary ${apart.toFixed(0)} px`);
    return `mean separation ${together.toFixed(0)} px schooling against ${apart.toFixed(0)} px solitary`;
  });

  // ------------------------------------------------------------------- pads
  setSection('pads');
  const padField = (seed, w = 1280, h = 800) => M.pads.createPads({
    rand: M.rng.makeRandom(seed), surface: M.surface.createSurface(), width: w, height: h,
  });
  // Signed angular distance, so a wedge straddling angle zero is one stretch
  // rather than two — which is what a naive sort of raw atan2 produces, and is
  // the shape of the "two notches" failure the silhouette check counts.
  const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  check('the height of a thing on the water is derived from the squash', () => {
    // THE ONE NUMBER A FLOATING THING NEEDS, and it is not a free constant. The
    // view is an oblique orthographic with sin(elevation) = squash, so
    // cos(elevation) is what a unit of height draws as — and the two must
    // satisfy the identity, or the pads are riding a second camera.
    const surf = M.surface.createSurface();
    const id = surf.squash * surf.squash + surf.lift * surf.lift;
    near(id, 1, 1e-12, 'squash^2 + lift^2');
    if (!(surf.lift > 0)) throw new Error('nothing above the water would move at all');
    // At height 0 it is not merely close to the flat projection, it IS it.
    for (const y of [0, 123.456, -900.5]) {
      if (surf.syAt(y, 0) !== surf.sy(y)) throw new Error(`height 0 at y=${y} is not the flat projection`);
    }
    return `squash ${surf.squash}, lift ${surf.lift}, exact at height 0`;
  });

  check('pads clump, and there is open water between the clumps', () => {
    // THE BRIEF'S OWN WORDS: loose clusters, not a uniform grid or scatter. The
    // witness is a comparison against the scatter the brief rules out — the SAME
    // number of pads spread uniformly over the same water — because "are these
    // clumped" has no answer without something to be clumped against, and a
    // threshold on a nearest-neighbour distance alone would be a number picked
    // to pass. Measured on the field's own reported positions, three seeds.
    const rows = [];
    for (const seed of [4242, 7, 90210]) {
      const f = padField(seed);
      const pads = f.pads;
      if (!(pads.length >= 12)) throw new Error(`seed ${seed} placed only ${pads.length} pads`);
      if (!(f.clusters.length >= 2)) throw new Error(`seed ${seed} made ${f.clusters.length} clusters`);
      const box = M.surface.createSurface().visible(1280, 800, M.pads.FIELD_MARGIN);
      const rand = M.rng.makeRandom(seed ^ 0x5eed);
      const nn = (pts) => {
        let sum = 0;
        for (const a of pts) {
          let best = Infinity;
          for (const b of pts) if (b !== a) best = Math.min(best, Math.hypot(a.x - b.x, a.y - b.y));
          sum += best;
        }
        return sum / pts.length;
      };
      const flat = pads.map(() => ({ x: rand.range(box.x0, box.x1), y: rand.range(box.y0, box.y1) }));
      const clumped = nn(pads), scattered = nn(flat);
      // And the OPEN WATER: the largest gap a pad-free straight run of the
      // frame's own width leaves. A scatter leaves none worth the name.
      const gapOf = (pts) => {
        const xs = pts.map(p => p.x).sort((a, b) => a - b);
        let g = 0;
        for (let i = 1; i < xs.length; i++) g = Math.max(g, xs[i] - xs[i - 1]);
        return g;
      };
      rows.push({ seed, n: pads.length, clumped, scattered, gap: gapOf(pads), flatGap: gapOf(flat) });
      if (!(clumped < scattered * 0.78)) {
        throw new Error(`seed ${seed}: mean nearest neighbour ${clumped.toFixed(0)} px against `
          + `${scattered.toFixed(0)} for the same pads scattered — that is not clumping`);
      }
      if (!(rows[rows.length - 1].gap > rows[rows.length - 1].flatGap)) {
        throw new Error(`seed ${seed}: the widest pad-free band is ${rows[rows.length - 1].gap.toFixed(0)} px, `
          + `narrower than the ${rows[rows.length - 1].flatGap.toFixed(0)} a scatter leaves`);
      }
    }
    return rows.map(r => `seed ${r.seed}: ${r.n} pads, nn ${r.clumped.toFixed(0)} vs ${r.scattered.toFixed(0)} scattered`).join('; ');
  });

  check('a pad is a near-circle with one wedge cut out of it', () => {
    // The SILHOUETTE, off the shipped outline rather than off a picture.
    //
    // THE RIM IS THE RING OUTSIDE THE DECLARED WEDGE, AND IT HAS TO BE — a
    // RANK cannot find it any more. The first cut of this check took every
    // sample above 55% of R as rim, and the wedge's flank is a CONTINUOUS ramp
    // from its apex out to the rim, so it landed samples at every value in
    // between and the check read the wedge's depth as the rim's variation. A
    // rank window (the top 70%) fixed that while the wedge was one fixed
    // narrow width and is wrong now that it is a per-pad draw: at 65 degrees
    // the wedge carries a THIRD of the samples, so a rank cut at 70% lets its
    // flank back in. What locates it instead is the pad's own declaration.
    //
    // A DECLARATION CAN LIE, so it is not taken on trust — four clauses below
    // pin it to the shape: the one stretch that dives lies inside the declared
    // window, it reaches the declared apex depth, the window's own two edges
    // are back up at the rim, and the declared half-angle is inside the ruled
    // range. What is left is an over-declared window hiding a mangled rim, and
    // that is BOUNDED rather than closed: the ruled ceiling is 65 degrees, so
    // at most 18% of the ring can be excluded by a declaration at all.
    const f = padField(4242);
    const rimStep = (Math.PI * 2) / M.pads.OUTLINE_PTS;
    let worstRound = 0, leastVary = Infinity, worstGap = 0;
    const bad = [];
    for (const pad of f.pads) {
      const pts = pad.outline.map(p => ({
        d: wrapPi(Math.atan2(p.y, p.x) - pad.notchAt),
        r: Math.hypot(p.x, p.y) / pad.R,
      }));
      const rim = pts.filter(q => Math.abs(q.d) > pad.notchHalf).map(q => q.r);
      const hi = Math.max(...rim), lo = Math.min(...rim);
      worstRound = Math.max(worstRound, hi - lo);
      leastVary = Math.min(leastVary, hi - lo);

      // (i) exactly one stretch dives toward the centre, and it is the one the
      // pad declared. Walk the ring in angle order; a pad with two runs has
      // been sampled or wrapped wrong, one with none has no stem.
      const ring = pts.slice().sort((a, b) => a.d - b.d);
      let runs = 0, deepest = Infinity, deepestAt = 0;
      for (let i = 0; i < ring.length; i++) {
        const prev = ring[(i - 1 + ring.length) % ring.length];
        if (ring[i].r < 0.5 && prev.r >= 0.5) runs++;
        if (ring[i].r < deepest) { deepest = ring[i].r; deepestAt = ring[i].d; }
      }
      if (runs !== 1) bad.push(`${runs} wedges`);
      if (Math.abs(deepestAt) > pad.notchHalf) bad.push('the dive is outside the declared wedge');
      // (ii) the apex reaches the depth the law says it does.
      if (Math.abs(deepest - M.pads.NOTCH_INNER) > 0.02) bad.push('the wedge does not reach its apex');
      // (iii) the declared EDGES are at the rim, which is what pins the
      // declared width to the width actually cut: a window declared wider than
      // the cut would have rim inside it, and one declared narrower would have
      // flank outside it (clause (i) catches that as a second run).
      // The wedge's own ladder runs flank to flank, so both declared edges ARE
      // samples — taken exactly rather than through a band, because a band as
      // wide as the rim's step swallows the whole of a five-degree wedge and
      // reads its apex as its edge.
      // AND THE EMPTY CASE IS A COMPLAINT, NOT A PASS. `Math.min()` of nothing
      // is Infinity, which clears any bar — so a declaration that named a
      // window with no sample on its edge would satisfy this clause by having
      // nothing in it, which is the one way a clause of this shape fails to be
      // one at all.
      const edges = ring.filter(q => Math.abs(Math.abs(q.d) - pad.notchHalf) < 1e-9);
      if (edges.length < 2) bad.push('the declared wedge has no sample on its own edge');
      else if (!(Math.min(...edges.map(q => q.r)) > 0.85)) bad.push('the declared wedge is wider than the cut');
      // (iv) inside the ruled range.
      const deg = pad.notchHalf * 360 / Math.PI;
      if (deg < M.pads.NOTCH_DEG[0] - 1e-9 || deg > M.pads.NOTCH_DEG[1] + 1e-9) bad.push(`a wedge of ${deg.toFixed(1)} degrees`);

      // (v) THE WEDGE IS THE BETTER RESOLVED OF THE TWO. Its sample count is
      // derived from its own width, so a 65-degree wedge gets as many samples
      // as it needs rather than the eight a 5-degree slit wants — a fixed
      // count is coarser than the RIM at the wide end and draws the flanks as
      // a staircase. Nothing above can see this: a coarse wedge still dives,
      // still reaches its apex and still leaves the rim alone.
      const inside = ring.filter(q => Math.abs(q.d) <= pad.notchHalf + 1e-12);
      if (inside.length < 3) bad.push('the wedge carries fewer than three samples');
      for (let i = 1; i < inside.length; i++) worstGap = Math.max(worstGap, inside[i].d - inside[i - 1].d);
    }
    if (bad.length) throw new Error(`${bad.length} complaints over ${f.pads.length} pads: ${[...new Set(bad)].join(', ')}`);
    // THE BAR IS SET FROM TWO MEASURED DISTRIBUTIONS, NOT FROM THE DATA IN
    // HAND. Over 20 fields and 792 pads the worst rim in a field varies by
    // 0.093-0.106 of its own radius under the ruled amplitudes and 0.203-0.234
    // under the ones they replaced; 0.16 is between them with a third of
    // headroom either way, and it is what carries "make the lily pads rounder"
    // rather than leaving it as a number someone could quietly put back.
    if (!(worstRound < 0.16)) throw new Error(`a rim varies by ${(worstRound * 100).toFixed(0)}% of its radius — that is lumpier than the ruling`);
    if (!(leastVary > 0.01)) throw new Error('a rim is a compass circle');
    if (!(worstGap <= rimStep / 2 + 1e-12)) throw new Error(`a wedge is sampled ${(worstGap / rimStep).toFixed(2)} of a rim step apart — coarser than half`);
    return `${f.pads.length} pads, one wedge each, rims vary ${(leastVary * 100).toFixed(1)}-${(worstRound * 100).toFixed(1)}% of radius, `
      + `wedges sampled within ${(worstGap / rimStep).toFixed(2)} of a rim step`;
  });

  check('the stem wedge is cut at a different angle on every pad', () => {
    // EVA'S RULING: "the cut out a variety of angles ranging from 5 to 65".
    // Two claims, and the one that matters is measured off the DRAWN outline
    // rather than off the record, because a field whose pads all declare a
    // different angle and all draw the same wedge satisfies a check that only
    // reads the declaration.
    //
    // THE DRAWN ANGLE IS RECOVERED FROM WHERE THE RADII SIT. The flank is a
    // linear ramp from NOTCH_INNER at the apex to the rim at the edge, so the
    // stretch under half a radius is a fixed fraction of the half-width —
    // (0.5 - NOTCH_INNER) / (1 - NOTCH_INNER) of it, either side. Read that
    // stretch's angular extent off the outline and it hands back the wedge the
    // pad was actually cut with, whatever the pad says about itself.
    const f = padField(4242);
    const frac = (0.5 - M.pads.NOTCH_INNER) / (1 - M.pads.NOTCH_INNER);
    const drawn = [], said = [];
    const bad = [];
    for (const pad of f.pads) {
      const dives = pad.outline
        .map(p => ({ d: wrapPi(Math.atan2(p.y, p.x) - pad.notchAt), r: Math.hypot(p.x, p.y) / pad.R }))
        .filter(q => q.r < 0.5).map(q => q.d);
      const extent = Math.max(...dives) - Math.min(...dives);
      // The samples are a finite ladder, so the run's two ends each fall short
      // of the true crossing by up to one step; add a step back rather than
      // widening the tolerance, which would hide a real disagreement. The step
      // is read off the dive's own samples, so nothing here consults the
      // wedge's declared width.
      const step = dives.length > 1 ? extent / (dives.length - 1) : 0;
      const deg = ((extent + step) / (2 * frac)) * 360 / Math.PI;
      drawn.push(deg);
      said.push(pad.notchDeg);
      if (Math.abs(deg - pad.notchDeg) > 0.25 * pad.notchDeg + 1.5) {
        bad.push(`a pad says ${pad.notchDeg.toFixed(1)} and draws ${deg.toFixed(1)} degrees`);
      }
    }
    if (bad.length) throw new Error(`${bad.length} of ${f.pads.length} pads: ${[...new Set(bad)].slice(0, 3).join(', ')}`);
    const loD = Math.min(...drawn), hiD = Math.max(...drawn);
    // The range is 5 to 65 and the draw is uniform, so a field of this size
    // reaches within a couple of degrees of each end; the bars are loose enough
    // that an unlucky field is not a failure and tight enough that a narrowed
    // range is. A FIELD THAT DRAWS ONE WIDTH FAILS BOTH.
    if (!(loD < 15)) throw new Error(`the narrowest wedge drawn is ${loD.toFixed(1)} degrees — the range starts at ${M.pads.NOTCH_DEG[0]}`);
    if (!(hiD > 50)) throw new Error(`the widest wedge drawn is ${hiD.toFixed(1)} degrees — the range ends at ${M.pads.NOTCH_DEG[1]}`);
    if (!(new Set(said.map(v => v.toFixed(3))).size === said.length)) throw new Error('two pads were cut at exactly the same angle');
    return `${f.pads.length} pads, drawn wedges ${loD.toFixed(1)}-${hiD.toFixed(1)} degrees `
      + `(declared ${Math.min(...said).toFixed(1)}-${Math.max(...said).toFixed(1)}, range ${M.pads.NOTCH_DEG[0]}-${M.pads.NOTCH_DEG[1]})`;
  });

  check('a pad answers any ripple the same way', () => {
    // THE SAME CLAIM THE FISH CARRY, one module along, and for the same reason:
    // the cause of a ripple is not in the record, so nothing can branch on it.
    // Two ponds, one pad each in the same place, each given one ripple that
    // agrees on every quantity a disturbance HAS and differs only in `rings` —
    // which is how many circles the renderer strokes and nothing a leaf can
    // feel. If the pads rock differently, something is reading the cause.
    const mk = (rings) => {
      const rip = { x: 300, y: 300, r: 0, maxR: 120, age: 0, life: 2.2, strength: 0.9, rings };
      const pad = M.pads.makePad(M.rng.makeRandom(5), 380, 300, 40);
      return { rip, pad };
    };
    const a = mk(2), b = mk(3);
    let moved = 0;
    for (let i = 0; i < 600; i++) {
      for (const s2 of [a, b]) {
        s2.rip.age += DT;
        s2.rip.r = s2.rip.maxR * M.ripples.frontAt(s2.rip.age / s2.rip.life);
        M.pads.respond(s2.pad, M.pads.waveAt([s2.rip], s2.pad.x, s2.pad.y), DT);
      }
      moved = Math.max(moved, Math.hypot(a.pad.tx, a.pad.ty), Math.abs(a.pad.lift));
    }
    // Not vacuous: the ripple must actually have rocked the pad.
    if (!(moved > 0.01)) throw new Error(`the ripple did not move the pad at all (${moved})`);
    for (const k of ['tx', 'ty', 'lift']) {
      if (a.pad[k] !== b.pad[k]) throw new Error(`${k} came out ${a.pad[k]} against ${b.pad[k]}`);
    }
    return `peak response ${moved.toFixed(4)}, identical to the bit on both`;
  });

  check('a passing front rocks a pad and lets it go', () => {
    // THE SHAPE OF THE RESPONSE, not merely that there is one. A front crossing
    // a pad tips it one way, then the OTHER as the crest passes the centre, and
    // then the pad comes back to flat — that reversal is what makes it a rock
    // rather than a shove, and it comes out of the slope under the pad changing
    // sign rather than out of any oscillator.
    const pad = M.pads.makePad(M.rng.makeRandom(11), 500, 300, 42);
    const rip = { x: 300, y: 300, r: 0, maxR: 320, age: 0, life: 3.0, strength: 1, rings: 2 };
    let along = [], peak = 0, peakLift = 0;
    for (let i = 0; i < 3.0 / DT; i++) {
      rip.age += DT;
      rip.r = rip.maxR * M.ripples.frontAt(rip.age / rip.life);
      M.pads.respond(pad, M.pads.waveAt([rip], pad.x, pad.y), DT);
      // The component along the line from the splash: positive is tipped away.
      along.push(pad.tx);
      peak = Math.max(peak, Math.hypot(pad.tx, pad.ty));
      peakLift = Math.max(peakLift, pad.lift);
    }
    const hi = Math.max(...along), lo = Math.min(...along);
    if (!(hi > 0.004)) throw new Error(`the front never tipped the pad toward the splash (${hi})`);
    if (!(lo < -0.004)) throw new Error(`the pad never tipped back the other way (${lo}) — that is a shove, not a rock`);
    const rest = Math.hypot(pad.tx, pad.ty);
    if (!(rest < peak * 0.2)) throw new Error(`it is still rocking at ${rest} after the ripple died (peak ${peak})`);
    if (!(peakLift > 0.05)) throw new Error(`the pad never rode up the wave (${peakLift})`);
    return `tilt ${(lo * 180 / Math.PI).toFixed(2)}° to ${(hi * 180 / Math.PI).toFixed(2)}°, `
      + `bob ${peakLift.toFixed(2)} px, back to ${(rest * 180 / Math.PI).toFixed(3)}° at rest`;
  });

  check('the rock is subtle and a downpour does not peg it', () => {
    // BOUNDED, AND NOT BY A CLAMP. The brief asks for a slight rock; a hard
    // clamp would deliver that and would also put every pad in the pond at the
    // ceiling for the whole of a storm, which is one thing a field of leaves
    // must not do. What separates the two is not the ceiling, which both
    // respect — it is whether there is a FLAT REGION above it, so the law is
    // swept as a function rather than sampled on a fixture.
    //
    // THE FIRST CUT OF THIS CHECK LOOKED AT A FIXTURE AND MISSED THE MUTATION
    // IT EXISTS FOR. It ran twelve pads under a hundred and twenty ripples and
    // asked whether their tilts still differed from one another at the end —
    // and they did under the clamp too, because by then the ripples had aged
    // and the clamp was no longer binding on any of them. A pond does not hold
    // still long enough to be a controlled experiment; the law does.
    const settled = (slope) => {
      const pad = M.pads.makePad(M.rng.makeRandom(1), 0, 0, 30);
      const wave = { h: 0, gx: slope, gy: 0 };
      for (let i = 0; i < 400; i++) M.pads.respond(pad, wave, 1 / 60);
      return Math.hypot(pad.tx, pad.ty);
    };
    const xs = [], ys = [];
    for (let i = 1; i <= 40; i++) { const g = i * M.pads.TILT_REF * 0.25; xs.push(g); ys.push(settled(g)); }
    const top = ys[ys.length - 1];
    if (!(top <= M.pads.TILT_MAX + 1e-9)) throw new Error(`a slope of ${xs[xs.length - 1]} reached ${top} rad against a cap of ${M.pads.TILT_MAX}`);
    if (!(M.pads.TILT_MAX * 180 / Math.PI < 9)) throw new Error(`the cap itself is ${(M.pads.TILT_MAX * 180 / Math.PI).toFixed(1)}° — that is not a slight rock`);
    // NO FLAT REGION, ANYWHERE. A clamp is flat above its ceiling by definition,
    // so this is the clause that tells the two apart — and it is asserted over
    // the WHOLE sweep, including ten times the reference slope, because a clamp
    // placed high enough would pass a sweep that stopped short of it.
    for (let i = 1; i < ys.length; i++) {
      if (!(ys[i] > ys[i - 1])) {
        throw new Error(`the response is flat between slopes ${xs[i - 1].toFixed(3)} and ${xs[i].toFixed(3)} `
          + `(both ${ys[i].toFixed(6)} rad) — that is a clamp, not a saturation`);
      }
    }
    // AND IT HOLDS ON A REAL POND, where a hundred crests overlap under one pad
    // and the naive sum would be many times the ceiling.
    const rand = M.rng.makeRandom(3);
    const pads = [];
    for (let i = 0; i < 12; i++) pads.push(M.pads.makePad(rand, 400 + i * 37, 300 + (i % 4) * 29, 34));
    const rips = [];
    for (let i = 0; i < 120; i++) {
      rips.push({ x: rand.range(300, 900), y: rand.range(200, 500), r: 0,
        maxR: rand.range(60, 170), age: rand.range(0.1, 0.5), life: 2.4, strength: 1, rings: 2 });
    }
    let worst = 0, worstLift = 0;
    for (let i = 0; i < 400; i++) {
      for (const r of rips) { r.age += DT; r.r = r.maxR * M.ripples.frontAt(Math.min(0.99, r.age / r.life)); }
      for (const p of pads) {
        M.pads.respond(p, M.pads.waveAt(rips, p.x, p.y), DT);
        worst = Math.max(worst, Math.hypot(p.tx, p.ty));
        worstLift = Math.max(worstLift, Math.abs(p.lift));
      }
    }
    if (!(worst <= M.pads.TILT_MAX + 1e-9)) throw new Error(`a pad reached ${worst} rad against a cap of ${M.pads.TILT_MAX}`);
    if (!(worstLift <= M.pads.BOB_MAX + 1e-9)) throw new Error(`a pad bobbed ${worstLift} px against a cap of ${M.pads.BOB_MAX}`);
    if (!(worst > M.pads.TILT_MAX * 0.5)) throw new Error(`the storm only reached ${worst} rad — the cap was never approached`);
    return `strictly rising over 40 slopes to ${(top * 180 / Math.PI).toFixed(3)}° of a `
      + `${(M.pads.TILT_MAX * 180 / Math.PI).toFixed(2)}° cap; under 120 ripples `
      + `${(worst * 180 / Math.PI).toFixed(2)}° and ${worstLift.toFixed(2)} px of bob`;
  });

  check('a tilted pad is foreshortened one way and lifted the other', () => {
    // BOTH HALVES OF THE ROCK, because a foreshortening ALONE is even in the
    // tilt — cos(-t) is cos(t) — so a pad drawn with only that reads as pulsing
    // at twice the wave's frequency rather than rocking. The height term is odd
    // in the tilt, and it is what makes one edge visibly lift while the other
    // drops. Measured on `padPoint`, which is the one place a local point
    // becomes a place on the water.
    const pad = M.pads.makePad(M.rng.makeRandom(2), 0, 0, 50);
    pad.tx = 0; pad.ty = 0; pad.lift = 0;
    const flat = M.pads.padPoint(pad, 50, 0);
    if (!(flat.x === 50 && flat.y === 0 && flat.z === 0)) throw new Error('an untilted pad is not flat');
    const T = 0.1;
    pad.tx = T;                       // tipped up toward +x
    const up = M.pads.padPoint(pad, 50, 0);
    const down = M.pads.padPoint(pad, -50, 0);
    const across = M.pads.padPoint(pad, 0, 50);
    near(up.x, 50 * Math.cos(T), 1e-12, 'the near edge foreshortens');
    near(up.z, 50 * Math.sin(T), 1e-12, 'the near edge rises');
    near(down.z, -50 * Math.sin(T), 1e-12, 'the far edge drops');
    if (!(up.z > 0 && down.z < 0)) throw new Error('both edges moved the same way — that is a pulse, not a rock');
    near(across.z, 0, 1e-12, 'the tilt axis itself does not move');
    near(Math.hypot(across.x, across.y), 50, 1e-12, 'the tilt axis is not foreshortened');
    // And it is SIGNED: tilting the other way swaps which edge is up.
    pad.tx = -T;
    const flipped = M.pads.padPoint(pad, 50, 0);
    near(flipped.z, -up.z, 1e-12, 'reversing the tilt reverses the height');
    near(flipped.x, up.x, 1e-12, 'reversing the tilt leaves the foreshortening alone');
    return `at ${(T * 180 / Math.PI).toFixed(1)}°: near edge +${up.z.toFixed(2)} px, far edge ${down.z.toFixed(2)}, `
      + `axis exactly 0, foreshortened to ${up.x.toFixed(3)} of 50`;
  });

  check('growing the frame grows the field and moves nothing', () => {
    // A PAD IS A THING IN THE POND, NOT A THING IN THE VIEWPORT. A resize that
    // re-generated the field would make every pad jump, which is the one thing
    // a fixed object must not do; one that did nothing would leave the new water
    // bare. Both directions are asserted, and the pads are compared by IDENTITY
    // rather than by count — a field that replaced its pads with the same number
    // of different ones passes a count.
    const f = padField(4242, 900, 620);
    const before = f.pads.slice();
    const where = before.map(p => [p.x, p.y, p.R]);
    f.ensure(1600, 1000);
    const after = f.pads;
    if (!(after.length > before.length)) throw new Error(`the field did not grow (${before.length} -> ${after.length})`);
    for (let i = 0; i < before.length; i++) {
      if (after[i] !== before[i]) throw new Error(`pad ${i} is not the same object after a resize`);
      const [x, y, R] = where[i];
      if (after[i].x !== x || after[i].y !== y || after[i].R !== R) throw new Error(`pad ${i} moved`);
    }
    // Shrinking keeps everything: the pond does not lose its leaves because the
    // window got smaller.
    f.ensure(700, 500);
    if (f.pads.length !== after.length) throw new Error(`shrinking the frame changed the field ${after.length} -> ${f.pads.length}`);
    // And the blooms are the PICTURE's, not the pond area's: a resize must not
    // breed a fourth.
    if (!(f.blooms.length >= M.pads.BLOOMS[0] && f.blooms.length <= M.pads.BLOOMS[1])) {
      throw new Error(`${f.blooms.length} blooms after two resizes, outside the ruled ${M.pads.BLOOMS.join('-')}`);
    }
    return `${before.length} pads over 900x620 -> ${after.length} over 1600x1000, none moved, ${f.blooms.length} blooms`;
  });

  check('blooms rise among the pads and there are two or three', () => {
    const rows = [];
    for (const seed of [4242, 7, 90210, 31337]) {
      const f = padField(seed);
      if (!(f.blooms.length >= M.pads.BLOOMS[0] && f.blooms.length <= M.pads.BLOOMS[1])) {
        throw new Error(`seed ${seed} placed ${f.blooms.length} blooms`);
      }
      for (const b of f.blooms) {
        let nearest = Infinity, inside = false;
        for (const p of f.pads) {
          const d = Math.hypot(p.x - b.x, p.y - b.y);
          nearest = Math.min(nearest, d / p.R);
          if (d < p.R * 0.80) inside = true;
        }
        // AMONG the pads: a leaf beside it, and not sitting on one. One without
        // the other is a flower alone on a pond, or a flower growing out of a leaf.
        if (inside) throw new Error(`seed ${seed}: a bloom sits inside a pad's rim`);
        if (!(nearest <= M.pads.BLOOM_BESIDE)) {
          throw new Error(`seed ${seed}: the nearest pad to a bloom is ${nearest.toFixed(2)} of its own radius away`);
        }
      }
      rows.push(`${seed}:${f.blooms.length}`);
    }
    return `blooms per seed ${rows.join(' ')}, each beside a pad and on none`;
  });

  check('wiring in the pads did not move the koi', () => {
    // THE FORKED STREAM, AND IT IS NOT TIDINESS. koi-ripples.js says it in as
    // many words: every draw on the shared stream shifts every number taken
    // after it for the rest of the run, and the fish share that stream. A pad
    // field placed from it would hand the pond a different set of koi — so the
    // koi would have changed for a reason that has nothing to do with pads, and
    // NOTHING ELSE HERE WOULD NOTICE: they would still be seven, still distinct,
    // still swimming.
    //
    // The witness is a school built from the seed ALONE, with no scene around
    // it, against the school the wired scene actually has. `state()` is read
    // before a single frame is advanced, so the traits are the seeded ones.
    const seed = 4242, W = 1280, H = 800;
    const alone = M.fish.createSchool({ rand: M.rng.makeRandom(seed),
      surface: M.surface.createSurface(), width: W, height: H });
    alone.seed(W, H);
    const wired = M.sceneKoi.default({
      width: W, height: H, seed, reducedMotion: false,
      canvas2d: () => ({ canvas: null, ctx: new Proxy({}, { get: () => () => {}, set: () => true }) }),
    });
    const st2 = wired.state();
    if (!(st2.pads > 0)) throw new Error('the scene built no pads, so this proves nothing');
    const mine = alone.fish.map(f => JSON.stringify(f.traits));
    const theirs = st2.traits.map(t => JSON.stringify(t));
    if (mine.length !== theirs.length) throw new Error(`${mine.length} koi alone against ${theirs.length} wired`);
    if (!mine.length) throw new Error('no koi were seeded, so this proves nothing');
    for (let i = 0; i < mine.length; i++) {
      if (mine[i] !== theirs[i]) {
        throw new Error(`koi ${i} is ${theirs[i]} in the scene and ${mine[i]} from the seed alone — `
          + 'the pads are drawing from the stream the fish use');
      }
    }
    wired.dispose();
    return `${mine.length} koi identical to the seed's own, with ${st2.pads} pads and ${st2.blooms} blooms placed`;
  });

  check('a pad is drawn over the fish and the ripples', () => {
    // THE DEPTH ORDER, MEASURED ON THE OPS THE RENDERER ACTUALLY EMITS. The
    // renderer's own header says draw order is the ONLY depth cue in this scene,
    // and a lily pad floats ON the water: a koi swims beneath it and a ring
    // spreads around it, so the pad has to come after both. The browser half
    // proves the pad hides the WATER in pixels; it cannot see the koi, whose
    // outline is dimmer than a stack of the pad's own freckles. This can, and it
    // is the claim in its general form — one placement in draw() decides both.
    //
    // The three are put in three places along the frame so an op belongs to
    // whichever it is nearest, with no overlap to argue about.
    const surf = M.surface.createSurface();
    // TWO KINDS OF EVENT, AND THE FIRST CUT OF THIS RECORDER CONFLATED THEM. It
    // tagged every path point with the fill style in effect AT THE TIME OF THE
    // POINT — but a path is built first and painted after, so a pad's own
    // outline came back wearing whatever the ripple pass had left set. The
    // paints are recorded as their own events now and a shape's paint is the
    // first one after its points.
    const ops = [];
    const noop = () => {};
    const at = (x) => ops.push({ kind: 'pt', x });
    const rec = new Proxy({
      moveTo: (x) => at(x), lineTo: (x) => at(x),
      quadraticCurveTo: (a, b, x) => at(x), bezierCurveTo: (a, b, c, d, x) => at(x),
      ellipse: (x) => at(x), arc: (x) => at(x), rect: (x) => at(x),
      fill: () => ops.push({ kind: 'fill', style: String(rec.fillStyle) }),
      stroke: () => ops.push({ kind: 'stroke', style: String(rec.strokeStyle) }),
      createRadialGradient: () => ({ addColorStop: noop, toString: () => 'GRADIENT' }),
      createLinearGradient: () => ({ addColorStop: noop, toString: () => 'GRADIENT' }),
    }, {
      get: (t, k) => (k in t ? t[k] : (t[k] !== undefined ? t[k] : noop)),
      set: (t, k, v) => { t[k] = v; return true; },
    });

    // The grain is a cached Path2D, which Node has no notion of. Stubbed for the
    // length of this check and removed after: the grain is water, it is filled
    // before anything else in the frame, and none of its points is near the
    // three things being ordered.
    const hadPath2D = 'Path2D' in globalThis;
    if (!hadPath2D) globalThis.Path2D = class { rect() {} moveTo() {} lineTo() {} closePath() {} };
    try {
      const rend = M.draw.createRenderer(rec, surf);
      const N = M.fish.SPINE_JOINTS, L = 96;
      const seg = M.fish.CHAIN_SPAN_U * L / (N - 1);
      const spine = [];
      for (let i = 0; i < N; i++) spine.push({ x: 300 - seg * i, y: 400 });
      const pad = M.pads.makePad(M.rng.makeRandom(1), 700, 400, 45);
      rend.draw({
        width: 1280, height: 800,
        fish: [{ id: 1, len: L, seg, spine, speed: 40, phase: 0, finPhase: 0, patches: [] }],
        ripples: [{ x: 1100, y: 400, r: 60, maxR: 120, age: 0.5, life: 2, strength: 1, rings: 2 }],
        drops: [], pads: { drawOrder: [pad], pads: [pad], blooms: [] },
        fallDir: { x: 0, y: 1 }, storm: { shake: 0, flash: 0 },
        reducedMotion: false, ripplePhase: 0,
      });
    } finally { if (!hadPath2D) delete globalThis.Path2D; }

    const band = (lo, hi) => ops.map((o, i) => ({ ...o, i }))
      .filter(o => o.kind === 'pt' && o.x > lo && o.x < hi);
    const fishOps = band(120, 480), padOps = band(620, 780), ripOps = band(950, 1250);
    if (!fishOps.length || !padOps.length || !ripOps.length) {
      throw new Error(`nothing to compare (${fishOps.length} fish / ${padOps.length} pad / ${ripOps.length} ripple ops)`);
    }
    const lastFish = fishOps[fishOps.length - 1].i;
    const lastRip = ripOps[ripOps.length - 1].i;
    const firstPad = padOps[0].i;
    if (!(firstPad > lastFish)) throw new Error(`the pad starts at op ${firstPad}, before the koi ends at ${lastFish}`);
    if (!(firstPad > lastRip)) throw new Error(`the pad starts at op ${firstPad}, before the ripples end at ${lastRip}`);
    // AND THE RESET IS THE FIRST THING IT PAINTS. Every other mark in this scene
    // is translucent ink, so without an opaque fill of the water's own value the
    // order buys nothing — the koi would simply tint through.
    const firstPaint = ops.slice(firstPad).find(o => o.kind === 'fill' || o.kind === 'stroke');
    if (!firstPaint || firstPaint.kind !== 'fill' || firstPaint.style !== M.draw.GROUND) {
      throw new Error(`the pad's first paint is a ${firstPaint ? firstPaint.kind : 'nothing'} `
        + `with "${firstPaint ? firstPaint.style : ''}" rather than a fill of the ground`);
    }
    return `koi ops end at ${lastFish}, ripples at ${lastRip}, the pad starts at ${firstPad} with a ground fill`;
  });

  check('the pad field costs a frame nothing it cannot afford', () => {
    // The wave field is read once per pad per frame over the whole ripple list,
    // which during a downpour is the cap. Measured rather than reasoned about,
    // because "one pass over a bounded list" is how every accidental quadratic
    // starts.
    const f = padField(4242, 1440, 900);
    const rand = M.rng.makeRandom(9);
    const rips = [];
    for (let i = 0; i < M.ripples.MAX_RIPPLES; i++) {
      rips.push({ x: rand.range(0, 1440), y: rand.range(0, 1500), r: rand.range(0, 160),
        maxR: 170, age: rand.range(0.2, 1.2), life: 3.0, strength: 0.6, rings: 2 });
    }
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < 60; i++) f.advance(1 / 60, { ripples: rips });
    const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 60;
    if (!(ms < 2.0)) throw new Error(`${ms.toFixed(2)} ms a frame for ${f.pads.length} pads against ${rips.length} ripples`);
    return `${ms.toFixed(3)} ms a frame, ${f.pads.length} pads x ${rips.length} ripples (the cap)`;
  });

  // ============================================================== SCENE 3 ===
  // The beach. Numbers here come from the BRIEF and from the reference clips,
  // never from the module under test — a clause that reads its expected value
  // out of the thing it is checking measures its own consistency.
  {
    const S = M.shore, W = M.swash, SE = M.sets, WA = M.water, B = M.beachBrush, WV = M.beachWave;
    const R = M.beachRender;
    const rng = (n) => M.rng.makeRandom(n);
    // One beach, settled, reusable by the checks that only need to look at it.
    // The same, with no set energy at any point — see the ratchet check.
    const settledQuiet = (seed = 4242, secs = 150) => {
      const sw = W.createSwash({ rand: rng(seed) });
      const se = SE.createSets({});          // no `rand`, so no natural sets ever arrive
      for (let i = 0; i < secs * 60; i++) sw.advance(1 / 60, { energy: 0, intervalScale: 1 });
      return { sw, se };
    };

    const settled = (seed = 4242, secs = 90) => {
      const sw = W.createSwash({ rand: rng(seed) });
      const se = SE.createSets({ rand: rng(seed ^ 99) });
      for (let i = 0; i < secs * 60; i++) {
        se.advance(1 / 60);
        sw.advance(1 / 60, { energy: se.energy, intervalScale: se.intervalScale });
      }
      return { sw, se };
    };

    setSection('shore');

    check('the bands are the brief\'s forty twenty forty', () => {
      // "water ~40% of frame height, wet band ~20%, dry sand ~40%" — and the
      // wet band is not a third number, it is the swash's own travel.
      assert.strictEqual(S.WATERLINE_S, 0.40, 'the waterline is not at 40%');
      assert.strictEqual(S.RUNUP_NOMINAL, 0.20, 'the nominal runup is not 20%');
      near(S.WATERLINE_S + S.RUNUP_NOMINAL, 0.60, 1e-12, 'the high-water mark');
      near(1 - (S.WATERLINE_S + S.RUNUP_NOMINAL), 0.40, 1e-12, 'the dry sand');
      // and a wave at full energy can reach the bottom of frame, no further
      near(S.WATERLINE_S + S.RUNUP_MAX, 1, 1e-12, 'the deepest reachable runup');
      return 'water 40% / wet 20% / dry 40%, and a full set reaches s = 1';
    });

    check('the shoreline is oblique and runs UP to the right', () => {
      const sh = S.createShore(); sh.resize(1000, 600);
      assert.ok(sh.tiltDeg > 0, `tilt ${sh.tiltDeg} is not positive`);
      const yL = sh.yAt(0, 0.4), yC = sh.yAt(500, 0.4), yR = sh.yAt(1000, 0.4);
      // Screen y falls as x rises: lower on the left, higher on the right,
      // which is the sign every measurement on the three clips agrees about.
      assert.ok(yL > yC && yC > yR, `left ${yL} centre ${yC} right ${yR} is not a rise to the right`);
      near(yC, 0.4 * 600, 1e-9, 'the band fraction is not exact at frame centre');
      return `${sh.tiltDeg}deg: left ${yL.toFixed(1)} centre ${yC.toFixed(1)} right ${yR.toFixed(1)}`;
    });

    check('the screen mapping round-trips exactly', () => {
      const sh = S.createShore(); sh.resize(1234, 789);
      for (const x of [0, 1, 617, 1233]) for (const v of [0, 0.31, 0.62, 1]) {
        near(sh.sAt(x, sh.yAt(x, v)), v, 1e-12, `round trip at x=${x} s=${v}`);
      }
      return 'sAt(yAt(s)) is s to 1e-12 over the frame';
    });

    setSection('swash');

    check('a swash carries no record of the energy that chose it', () => {
      // THE STRUCTURAL FORM of "set energy biases the NEXT wave, never the one
      // currently running": the record has no field to branch on.
      // THE DECLARATION IS NOW TWO LISTS AND THE RECORD IS ONE OBJECT. A swash
      // is stage six of a wave, so `WAVE_FIELDS` (the seaward life) plus
      // `SWASH_FIELDS` (the run-up) is the whole of it — and the claim is
      // unchanged and made twice over: neither list may name a cause, and the
      // record may hold nothing outside the two.
      const sw = W.createSwash({ rand: rng(1) });
      sw.spawn(0.9);
      assert.ok(sw.waves.length, 'nothing was spawned');
      const declared = [...W.SWASH_FIELDS, ...WV.WAVE_FIELDS];
      assert.strictEqual(new Set(declared).size, declared.length,
        'the two field lists overlap, so neither owns what they share');
      assert.deepStrictEqual(Object.keys(sw.waves[0]).sort(), [...declared].sort(),
        'a wave record has fields the declarations do not');
      // BOTH THE RECORD AND THE DECLARATIONS. A name that reaches only the
      // record misses a declaration that has grown a cause the builder has not
      // written yet, and a name that reaches only the declarations misses a
      // field written straight onto the object — which is the half the
      // deepStrictEqual above already covers, so this pair is belt and braces
      // in two different directions.
      for (const k of [...Object.keys(sw.waves[0]), ...declared]) {
        assert.ok(!/energy|set|source|kind|stage/i.test(k), `a wave record or declaration carries "${k}"`);
      }
      return `${WV.WAVE_FIELDS.length} seaward + ${W.SWASH_FIELDS.length} run-up fields, none naming a cause or a stage`;
    });

    check('the energy reaches the next wave and never the one running', () => {
      // The strong form: advance the SAME running wave under opposite energies
      // and require every emitted extent to be identical.
      const mk = () => { const sw = W.createSwash({ rand: rng(7) }); sw.spawn(0.5); return sw; };
      const a = mk(), b = mk();
      for (let i = 0; i < 120; i++) {
        a.advance(1 / 60, { energy: 0 });
        b.advance(1 / 60, { energy: 1 });
      }
      // Its own extent must not have moved. (A new wave may have been spawned
      // in b, so compare the FIRST wave's record rather than the edge field.)
      assert.deepStrictEqual(
        [a.waves[0].runup, a.waves[0].advanceS, a.waves[0].retreatS],
        [b.waves[0].runup, b.waves[0].advanceS, b.waves[0].retreatS],
        'a running wave changed with the energy');
      return 'the running wave is bit-identical under energy 0 and 1';
    });

    check('the retreat takes the measured two to three seconds', () => {
      // MEASURED: the brief's own reading of the two clean drains.
      const sw = W.createSwash({ rand: rng(3) });
      const w = sw.spawn(0);
      assert.ok(w.retreatS >= 2 && w.retreatS <= 3, `retreat ${w.retreatS} is outside 2-3 s`);
      // and the envelope really does take that long to come back to nothing
      const peak = w.advanceS + w.holdS;
      near(W.swashEnv(peak, w.advanceS, w.holdS, w.retreatS), 1, 1e-9, 'the envelope at the peak');
      near(W.swashEnv(peak + w.retreatS, w.advanceS, w.holdS, w.retreatS), 0, 1e-9, 'the envelope at the end');
      assert.ok(W.swashEnv(peak + w.retreatS / 2, w.advanceS, w.holdS, w.retreatS) > 0.2,
        'the drain is not still running half way through');
      return `retreat ${w.retreatS.toFixed(2)} s`;
    });

    check('the advance is well under a second and is not claimed as measured', () => {
      // PICKED, and the brief says so: "do not claim it was derived from the
      // footage." What is checked is the stated property, not a fit.
      assert.ok(W.ADVANCE_S < 1, `advance ${W.ADVANCE_S} is not under a second`);
      assert.ok(W.ADVANCE_S < W.RETREAT_S / 2, 'the advance is not much faster than the retreat');
      const src = fs.readFileSync(path.join(SCENE, 'beach-swash.js'), 'utf8');
      assert.ok(/NOT measured|PICKED, NOT MEASURED/i.test(src),
        'the advance is not declared as picked rather than measured');
      return `${W.ADVANCE_S} s, declared picked`;
    });

    check('successive swashes do not reach identical distances', () => {
      const sw = W.createSwash({ rand: rng(11) });
      const reaches = [];
      for (let i = 0; i < 20; i++) reaches.push(sw.spawn(0).runup);
      const uniq = new Set(reaches.map(r => r.toFixed(6)));
      assert.strictEqual(uniq.size, reaches.length, 'two swashes reached the same distance');
      const spread = Math.max(...reaches) - Math.min(...reaches);
      assert.ok(spread > 0.01, `the reaches only spread ${spread}`);
      return `20 distinct reaches, spread ${spread.toFixed(3)} of frame height`;
    });

    check('wet sand persists after the water has left it', () => {
      // THE FAILURE MODE THE BRIEF NAMES: "Animating one oscillating waterline
      // is the failure mode here. Wet sand must persist after the water has
      // left it." So at full drain the two boundaries must be far apart.
      const { sw } = settled();
      let found = null;
      for (let i = 0; i < 60 * 40 && !found; i++) {
        sw.advance(1 / 60, { energy: 0 });
        if (sw.edgeAtU(0.5) < S.WATERLINE_S + 0.01) found = { e: sw.edgeAtU(0.5), w: sw.wetAtU(0.5) };
      }
      assert.ok(found, 'the swash never drained');
      const gap = found.w - found.e;
      assert.ok(gap > 0.12, `the wet band is only ${gap.toFixed(3)} of frame height at full drain`);
      return `edge ${found.e.toFixed(3)}, high-water ${found.w.toFixed(3)}, a wet band ${gap.toFixed(3)} deep`;
    });

    check('the two drying rates are an order of magnitude apart', () => {
      // "Do not use one rate for the whole beach." They are two variables, so
      // the separation is a property of the declaration and not of a branch.
      assert.ok(W.SAT_DRY_S / W.OVERRUN_DRY_S > 10,
        `the two rates are only ${(W.SAT_DRY_S / W.OVERRUN_DRY_S).toFixed(1)}x apart`);
      return `overrun ${W.OVERRUN_DRY_S} s vs saturated ${W.SAT_DRY_S} s — ${(W.SAT_DRY_S / W.OVERRUN_DRY_S).toFixed(0)}x`;
    });

    check('the overrun zone dries back and does not ratchet', () => {
      // "then recedes as the sand behind it dries ... it must return, not
      // ratchet." Measured on the emitted fields, not on the declaration.
      // `wet0` AND `back` ARE MEDIANS OVER A WINDOW, NOT INSTANTANEOUS READS,
      // and that is what stops this clause being a coin flip. On the shipped
      // tree the mark barely moves, so any single sample is the same number —
      // but under the mutation this check exists for (`wet` follows the swash)
      // it OSCILLATES with the edge, so a single `wet0` is a snapshot of
      // wherever a swash happened to be. Measured: the mutant reddened this
      // check before this session and stayed green after, with nothing about
      // the ratchet changed — only the phase of the simulation, because waves
      // now take PRE_S seconds to arrive. A fixture that is 50/50 makes a
      // must-fail control a coin flip, which is Eva's fifth durable rule and
      // the one case of it a mutant table can catch.
      // AND IT SETTLES ON A QUIET BEACH, NOT A SET ONE. `settled()` runs with
      // the natural sets in it, so on a tree whose saturated level RATCHETS
      // everything is already at its ceiling before the measurement starts —
      // the set then has nothing left to add and the clause's subject stops
      // containing the defect. Both ratchet mutants reported MISSED on it.
      // Pinning the energy to zero through the settle puts every tree at the
      // ordinary waves' own level, so the set is the only excursion there is.
      const { sw, se } = settledQuiet(88);
      const win = () => {
        const v = [];
        for (let i = 0; i < 60 * 8; i++) {
          se.advance(1 / 60); sw.advance(1 / 60, { energy: 0, intervalScale: 1 });
          v.push(sw.wetAtU(0.5));
        }
        v.sort((a, b) => a - b); return v[v.length >> 1];
      };
      const sat0 = sw.satAtU(0.5), wet0 = win();
      se.scroll(120); se.scroll(120); se.scroll(120);
      let peak = 0;
      for (let i = 0; i < 60 * 30; i++) {
        se.advance(1 / 60); sw.advance(1 / 60, { energy: se.energy, intervalScale: se.intervalScale });
        peak = Math.max(peak, sw.wetAtU(0.5));
      }
      assert.ok(peak > sat0 + 0.08, `the set only reached ${peak.toFixed(3)} against a saturated ${sat0.toFixed(3)}`);
      // and once the energy has gone it comes back down toward the saturated level
      for (let i = 0; i < 60 * 70; i++) {
        se.advance(1 / 60); sw.advance(1 / 60, { energy: 0, intervalScale: 1 });
      }
      const back = win();
      assert.ok(back < peak - 0.05, `the mark stayed at ${back.toFixed(3)} after peaking at ${peak.toFixed(3)}`);
      // RETURNED, not ratcheted: back to where it sat BEFORE the set. Comparing
      // it against the CURRENT saturated level instead would be a clause
      // reading its reference out of the thing it is checking — sat is what the
      // set moved, so "wet came back to sat" is true of a ratchet too.
      assert.ok(back <= wet0 + 0.05,
        `the mark settled at ${back.toFixed(3)} against ${wet0.toFixed(3)} before the set`);
      return `${wet0.toFixed(3)} before, peak ${peak.toFixed(3)}, ${back.toFixed(3)} after (sat0 ${sat0.toFixed(3)})`;
    });

    check('the high-water mark is effectively static in quiet water', () => {
      // The brief's own instrument: "it moves about 6px in 3.5 seconds".
      // Measured here in the same units on a 900 px frame, over windows with no
      // set energy in them — a set is the one time it IS meant to move.
      // A WINDOW IS QUIET IF NO SET TOUCHED ANY WAVE THAT IS ON THE BEACH IN
      // IT — which since waves became objects means the window AND the PRE_S
      // seconds before it, because that is when the wave arriving now was
      // born and sized. The old form looked only at the window, and with a
      // 17.6 s seaward life it let a wave commissioned by a set arrive inside
      // a "quiet" one: measured, the figure went from 5.9 px to 54.5 without
      // anything about the mark changing. The subject moved, not the tree.
      const H = 900, moves = [];
      const LEAD = Math.ceil(WV.PRE_S * 60);
      for (const seed of [1, 7, 4242]) {
        const { sw, se } = settled(seed);
        const hist = [];
        for (let k = 0; k < 40; k++) {
          const before = sw.wetAtU(0.5);
          for (let i = 0; i < 210; i++) {
            se.advance(1 / 60); sw.advance(1 / 60, { energy: se.energy, intervalScale: se.intervalScale });
            hist.push(se.energy);
          }
          const from = Math.max(0, hist.length - 210 - LEAD);
          let calm = true;
          for (let i = from; i < hist.length; i++) if (hist[i] > 0.02) { calm = false; break; }
          if (calm) moves.push(Math.abs(sw.wetAtU(0.5) - before) * H);
        }
      }
      assert.ok(moves.length > 12, `only ${moves.length} quiet windows`);
      const mean = moves.reduce((a, b) => a + b, 0) / moves.length;
      assert.ok(mean < 12, `the mark moves ${mean.toFixed(1)} px per 3.5 s, which is not "effectively static"`);
      return `${mean.toFixed(1)} px per 3.5 s over ${moves.length} windows (the brief measured ~6)`;
    });

    check('an overrun fires with the extent it reached', () => {
      const { sw, se } = settled(555);
      sw.overruns.length = 0;
      se.scroll(120); se.scroll(120); se.scroll(120);
      for (let i = 0; i < 60 * 40; i++) {
        se.advance(1 / 60); sw.advance(1 / 60, { energy: se.energy, intervalScale: se.intervalScale });
      }
      assert.ok(sw.overruns.length > 0, 'a full set fired no overrun');
      for (const o of sw.overruns) {
        assert.ok(Number.isFinite(o.extent) && o.extent > S.WATERLINE_S, `extent ${o.extent}`);
        assert.ok(o.over >= W.OVERRUN_MARGIN_S, `an overrun fired only ${o.over} past the mark`);
        assert.ok(o.at >= 0 && o.at <= 1, `at ${o.at} is not an along-shore position`);
      }
      // AND A QUIET BEACH FIRES NONE, which is what makes the event a signal
      // rather than a wave counter. Measured over five seeds at five minutes
      // each, the margin was set where this rate reaches zero while the
      // set-driven rate is barely touched.
      // AND THE IN-FLIGHT WAVES ARE FLUSHED FIRST. `settled` runs with sets in
      // it, and a wave's seaward life is PRE_S seconds, so waves commissioned
      // by a set during the settling are still on their way in when the energy
      // reads zero — they arrive inside the "quiet" stretch and fire. Measured,
      // that was four overruns in fifteen quiet minutes on a tree whose margin
      // is calibrated to fire none. The energy going to zero is not the same
      // moment as the sea going quiet, and it never was; it is only now that
      // the gap is long enough to notice.
      let quietFires = 0;
      for (const seed of [556, 557, 558]) {
        const { sw: q } = settled(seed);
        for (let i = 0; i < Math.ceil(WV.PRE_S * 60) + 240; i++) q.advance(1 / 60, { energy: 0, intervalScale: 1 });
        q.overruns.length = 0;
        for (let i = 0; i < 60 * 300; i++) q.advance(1 / 60, { energy: 0, intervalScale: 1 });
        quietFires += q.overruns.length;
      }
      assert.strictEqual(quietFires, 0, `${quietFires} overruns in fifteen quiet minutes`);
      return `${sw.overruns.length} on a full set, 0 in fifteen quiet minutes`;
    });

    check('the gloss is a length behind the edge, not a fixed band', () => {
      // "Sand goes glossy -> matte over roughly half a second behind the
      // departing water" — so a fast drain leaves a WIDER glossy band.
      const { sw } = settled(31);
      let drainMax = 0, restMin = Infinity;
      for (let i = 0; i < 60 * 60; i++) {
        sw.advance(1 / 60, { energy: 0 });
        if (sw.sheet > 0.3 && sw.sheet < 0.8) drainMax = Math.max(drainMax, sw.glossDepth);
        if (sw.sheet === 0) restMin = Math.min(restMin, sw.glossDepth);
      }
      assert.ok(drainMax > restMin * 4, `draining ${drainMax.toFixed(4)} vs at rest ${restMin.toFixed(4)}`);
      return `${restMin.toFixed(4)} at rest, ${drainMax.toFixed(4)} mid-drain`;
    });

    setSection('sets');

    check('three scroll actions reach the maximum', () => {
      const se = SE.createSets({ rand: rng(2) });
      for (let i = 0; i < 3; i++) se.scroll(SE.ACTION_DELTA);
      near(se.energy, 1, 1e-9, 'three actions did not fill it');
      return `3 x ${SE.ACTION_DELTA} px -> ${se.energy.toFixed(3)}`;
    });

    check('either scroll direction adds energy', () => {
      // UNSIGNED, unlike scene 1's wind: a set has no negative, and what puts
      // it back is the decay.
      const up = SE.createSets({ rand: rng(2) }), down = SE.createSets({ rand: rng(2) });
      up.scroll(SE.ACTION_DELTA); down.scroll(-SE.ACTION_DELTA);
      near(up.energy, down.energy, 1e-12, 'the two directions disagree');
      assert.ok(up.energy > 0, 'scrolling added nothing');
      return `both directions -> ${up.energy.toFixed(3)}`;
    });

    check('the energy decays to zero over its window', () => {
      const se = SE.createSets({ rand: null });
      for (let i = 0; i < 3; i++) se.scroll(SE.ACTION_DELTA);
      for (let i = 0; i < Math.round(SE.DECAY_S * 240); i++) se.advance(1 / 240);
      assert.strictEqual(se.scrolled, 0, `the scrolled energy is ${se.scrolled} after the window`);
      return `zero exactly at ${SE.DECAY_S} s`;
    });

    check('large sets arrive with no input at all', () => {
      // "an untouched scene still gets overruns"
      const se = SE.createSets({ rand: rng(5) });
      let peak = 0;
      for (let i = 0; i < 240 * 60 * 4; i++) { se.advance(1 / 240); peak = Math.max(peak, se.energy); }
      assert.ok(se.sets > 0, 'no set arrived in four minutes');
      assert.ok(peak >= SE.SET_PEAK[0] * 0.95, `the biggest natural set only reached ${peak.toFixed(2)}`);
      assert.strictEqual(se.scrolled, 0, 'the natural set went through the scroll account');
      return `${se.sets} sets in 4 min, peaking at ${peak.toFixed(2)}, with no input`;
    });

    setSection('water');

    check('the streaks persist and drift shoreward', () => {
      // They are records, not a field regenerated each frame: a re-randomised
      // surface reads as static rather than as water.
      const wa = WA.createWater({ rand: rng(6), count: 60 });
      assert.deepStrictEqual(Object.keys(wa.streaks[0]).sort(), [...WA.STREAK_FIELDS].sort());
      const first = wa.streaks[0];
      const s0 = first.s, u0 = first.u;
      for (let i = 0; i < 30; i++) wa.advance(1 / 60, { energy: 0 });
      assert.strictEqual(wa.streaks[0], first, 'the streak array was rebuilt');
      assert.ok(first.s > s0, 'the streak did not drift shoreward');
      near(first.u, u0, 1e-12, 'a streak wandered along the shore');
      assert.ok(wa.drift > 0, 'the drift phase did not advance');
      return `s ${s0.toFixed(3)} -> ${first.s.toFixed(3)}, same record, u unchanged`;
    });

    // ======================================================== the wave ====
    // THE SCENE PASSED 133 CHECKS WITH NO WAVE IN IT. Every clause below
    // exists because the merged build satisfied all of them vacuously: the
    // water was a tone field with one fixed dip at the back of frame, and
    // nothing in the gate could tell that from a sea.
    setSection('wave');

    const mkWave = (e = 0.5, seed = 3) => WV.makeWave({ rand: rng(seed), energy: e });

    check('a wave passes through all six stages, in order, exactly once each', () => {
      // THE WHOLE CLAIM OF THE FEATURE, and the one a tone field cannot
      // satisfy however it is tuned. Walked at the median column over a whole
      // life, the stage must be non-decreasing and must visit every value.
      const w = mkWave(0.6);
      const seen = [], order = [];
      for (let t = 0; t <= w.preS + 4; t += 1 / 30) {
        w.age = t;
        const st = WV.stageAt(w, 0.5, S.WATERLINE_S);
        if (order[order.length - 1] !== st) order.push(st);
        if (!seen.includes(st)) seen.push(st);
      }
      // The WAVE-level stage is where PEEL lives; the column's own sequence
      // skips it, which is stageAt's declared behaviour and not a hole.
      let sawPeel = false;
      for (let t = 0; t <= w.preS + 4; t += 1 / 30) {
        w.age = t;
        if (WV.waveStage(w, S.WATERLINE_S) === WV.PEEL) sawPeel = true;
      }
      assert.ok(sawPeel, 'the wave is never in PEEL at any moment of its life');
      for (const st of [WV.SWELL, WV.STEEPEN, WV.COLLAPSE, WV.FOAM_BAND, WV.SWASH]) {
        assert.ok(seen.includes(st), `a column never reaches ${WV.STAGE_NAMES[st]}`);
      }
      for (let i = 1; i < order.length; i++) {
        assert.ok(order[i] > order[i - 1], `the stage went ${WV.STAGE_NAMES[order[i - 1]]} -> ${WV.STAGE_NAMES[order[i]]}`);
      }
      assert.strictEqual(order.length, 5, `a column visited ${order.length} stages, not five`);
      return `column: ${order.map(x => WV.STAGE_NAMES[x]).join(' -> ')}, and the wave peels`;
    });

    check('the break runs along the crest rather than all at once', () => {
      // MEASURED ON THE REFERENCE: 64 of 64 column blocks over 1.87 s, onset
      // slope -1.34 s across the frame. The claim here is the structural one —
      // that at some moment some columns have broken and others have not, that
      // the onset is MONOTONE in u, and that it takes the wave's own peelS.
      const w = mkWave(0.5);
      const onset = [];
      for (let i = 0; i <= 32; i++) {
        const u = i / 32;
        let t0 = null;
        for (let t = 0; t <= w.preS; t += 1 / 60) { w.age = t; if (WV.brokenAt(w, u) >= 0) { t0 = t; break; } }
        assert.ok(t0 !== null, `column u=${u} never breaks`);
        onset.push(t0);
      }
      const rise = onset[onset.length - 1] - onset[0];
      // THE BAR HAS A DIFFERENT OWNER FROM THE QUANTITY. The first cut compared
      // the measured spread against the wave's OWN `peelS` — so a tree that
      // set `peelS` to a microsecond moved both sides together and the clause
      // stayed green on a break that went white all at once. Eva's fourth
      // durable rule, in the check written for the brief's central claim.
      // `PEEL_RANGE` is the RANGE the feature declares reachable and 1.0 s is
      // the reference's own floor (the brief: "treat >= 1 s as a FLOOR"), so
      // neither moves with a record.
      assert.ok(Math.abs(rise) >= Math.min(1.0, WV.PEEL_RANGE[0]),
        `the whole break takes ${Math.abs(rise).toFixed(3)} s — the reference's own floor is 1 s`);
      assert.ok(Math.abs(rise) <= WV.PEEL_RANGE[1] + 0.1,
        `the peel spans ${Math.abs(rise).toFixed(2)} s, past the declared range`);
      assert.ok(Math.abs(Math.abs(rise) - w.peelS) < 0.1,
        `the emitted peel (${Math.abs(rise).toFixed(2)} s) disagrees with the record's ${w.peelS.toFixed(2)}`);
      const up = onset[onset.length - 1] > onset[0];
      for (let i = 1; i < onset.length; i++) {
        assert.ok(up ? onset[i] >= onset[i - 1] : onset[i] <= onset[i - 1],
          'the onset is not monotone along the shore — the break is not peeling, it is scattering');
      }
      // and the state the whole thing is for: broken here, not there
      w.age = w.breakAge + w.peelS * 0.5;
      assert.ok(WV.brokenAt(w, up ? 0 : 1) >= 0 && WV.brokenAt(w, up ? 1 : 0) < 0,
        'halfway through its own peel the wave has broken everywhere or nowhere');
      return `${Math.abs(rise).toFixed(2)} s from end to end, ${up ? 'left to right' : 'right to left'}`;
    });

    // TWO MORE RETIRED WITH THE TONE FIELD, and they are this PR's own rather
    // than the merged scene's — which is the reason to name them carefully:
    //
    //   the dark face is darker than the water on both sides of it
    //       measured on the EMITTED TONE through `waveToneAt`, which was the
    //       wave's contribution to a lattice's ink density. The finding it
    //       carried is not lost — it is what beach-brush.js DRAWS, as a
    //       `PALETTE.ink` fill from the crest down to `faceBot`, against a
    //       paper lip — but "darker than the water either side" is not a
    //       question a flat fill answers, and the machinery that made it one
    //       is gone. `draw/every-wave-is-drawn-once-with-its-own-record` is
    //       what now says the face is put on the paper at all.
    //   the face is one band across the wave while the foam is not
    //       it asserted the face sits at one DEPTH below the crest at every
    //       column while the band varies. THAT IS FALSE OF THE NEW DRAWING ON
    //       PURPOSE: its `faceBot` is `(0.040 + 0.030 * (1 - b)) * H + 0.22 h`,
    //       which is per column by construction — the face deepens toward the
    //       unbroken end. beach-wave.js held one depth because a bilevel row
    //       averaged across a varying one read as nothing; a fill has no such
    //       problem. Keeping the check would have meant tuning the drawing to
    //       satisfy it, which is the one thing the brief rules out.
    check('the energy sizes the wave at every stage and only at birth', () => {
      // "Set energy should now size the wave at EVERY stage — how far out it
      // breaks, how deep the dark face, how wide the foam band", and the
      // drawing layer adds "feed it to the wave's height and peel rate there,
      // not per frame". Both halves: the numbers MOVE with the energy at
      // birth, and NOTHING moves after.
      //
      // THE FOUR IT NOW READS ARE THE FOUR THE DRAWING CONSUMES. `faceDepth`
      // and `swellDepth` were tone targets and went with the tone field;
      // `height` and `peelS` arrived with the drawing that needs them.
      const lo = WV.makeWave({ rand: rng(11), energy: 0.05 });
      const hi = WV.makeWave({ rand: rng(11), energy: 0.95 });
      assert.ok(hi.breakS < lo.breakS, `a bigger set breaks at ${hi.breakS.toFixed(3)}, not further out than ${lo.breakS.toFixed(3)}`);
      assert.ok(hi.bandMax > lo.bandMax * 1.2, 'the band does not grow with the set');
      assert.ok(hi.height > lo.height * 1.2, `the wave is ${lo.height.toFixed(3)} tall at rest and ${hi.height.toFixed(3)} at full set`);
      assert.ok(hi.peelS > lo.peelS, `the peel runs ${lo.peelS.toFixed(2)} s at rest and ${hi.peelS.toFixed(2)} s at full set`);
      // and every one of them stays inside the range it was drawn from
      assert.ok(lo.height >= WV.HEIGHT[0] * 0.84 && hi.height <= WV.HEIGHT[1] * 1.16, 'a height left its own range');
      assert.ok(lo.peelS >= WV.PEEL_RANGE[0] - 1e-12 && hi.peelS <= WV.PEEL_RANGE[1] + 1e-12, 'a peel left its own range');
      // AND THE RUNNING WAVE CANNOT BE REACHED. Two copies of one wave driven
      // under opposite energies must put the drawing in the same place at
      // every station — the structural form, since no law here takes an
      // energy at all. Read on the two quantities the drawing actually asks a
      // record for: where its crest is, and how far through the break each
      // column of it has got.
      const a2 = mkWave(0.5), b2 = mkWave(0.5);
      for (let t = 0; t < 18; t += 1 / 60) {
        a2.age = t; b2.age = t;
        for (const u of [0, 0.1, 0.5, 0.9, 1]) {
          assert.strictEqual(WV.crestAt(a2, u), WV.crestAt(b2, u), 'two identical waves put their crests in different places');
          assert.strictEqual(WV.drawPhaseAt(a2, u), WV.drawPhaseAt(b2, u), 'two identical waves are drawn at different break phases');
        }
      }
      for (const k of Object.keys(lo)) assert.ok(!/energy/i.test(k), `the record carries "${k}"`);
      return `break ${lo.breakS.toFixed(3)} -> ${hi.breakS.toFixed(3)}, band ${lo.bandMax.toFixed(3)} -> ${hi.bandMax.toFixed(3)}, `
        + `height ${lo.height.toFixed(3)} -> ${hi.height.toFixed(3)}, peel ${lo.peelS.toFixed(2)} -> ${hi.peelS.toFixed(2)} s`;
    });

    check('every wave takes the same time to reach the shore', () => {
      // THE SPAWNER'S INTERVAL IS A CLAIM ABOUT ARRIVALS. The first cut derived
      // each wave's birth position from its own swell lead, so `preS` ranged
      // over nine seconds while waves were spawned 3.2-6.4 s apart and the
      // arrivals scrambled — measured, the high-water mark went from 5.9 px
      // per 3.5 s to 54.5 and four overruns fired in fifteen quiet minutes.
      const pres = [];
      for (let i = 0; i < 24; i++) pres.push(WV.makeWave({ rand: rng(100 + i), energy: (i % 7) / 6 }).preS);
      const spread = Math.max(...pres) - Math.min(...pres);
      assert.ok(spread < 1e-9, `the seaward life ranges over ${spread.toFixed(3)} s, so arrivals do not follow spawns`);
      // and a wave's own speed shows up in WHERE IT IS BORN instead
      const slow = WV.makeWave({ rand: rng(5), energy: 0.5 }), fast = WV.makeWave({ rand: rng(9), energy: 0.5 });
      if (Math.abs(slow.speedS - fast.speedS) > 1e-6) {
        assert.ok(Math.abs(slow.crest0 - fast.crest0) > 1e-6,
          'two waves at different speeds were born in the same place, which cannot both be true');
      }
      return `preS ${pres[0].toFixed(2)} s on all ${pres.length}, spread ${spread.toExponential(1)}`;
    });

    check('a nearer wave covers the one behind it', () => {
      // The ORDER IS THE MODEL: seaward first, so the most shoreward wave is
      // drawn last and its foam covers the water behind it — which is what "a
      // nearer band of foam hides the water behind it" means in a plan view.
      // It used to be measured on the composited TONE; with a drawing that
      // paints rather than accumulates, the claim is the order itself, and the
      // half that says the drawing HONOURS that order is in the browser, off
      // the canvas ops (`draw/the-nearer-wave-is-painted-last`).
      const back = mkWave(0.6, 3), front = mkWave(0.6, 3);
      back.age = back.breakAge + back.peelS + 0.2;
      front.age = front.breakAge + front.peelS + 0.2;
      front.crest0 += 0.12;                        // stand it nearer the shore
      assert.ok(WV.crestAt(front, 0.5) > WV.crestAt(back, 0.5), 'the fixture did not put one wave in front of the other');
      // BOTH INPUT ORDERS, because a sort that ignored its input would pass
      // one of them by luck.
      for (const list of [[front, back], [back, front]]) {
        const sorted = WV.sortWaves(list);
        assert.strictEqual(sorted[0], back, 'sortWaves did not put the seaward wave first');
        assert.strictEqual(sorted[1], front, 'sortWaves did not put the shoreward wave last');
        assert.strictEqual(list.length, 2, 'sortWaves mutated the list it was given');
      }
      // and it orders by where a crest IS, not by when it was born: age the
      // seaward wave past the other and the order has to swap.
      back.crest0 += 0.30;
      assert.strictEqual(WV.sortWaves([front, back])[1], back, 'the order is not read off the live crests');
      return `the seaward wave first and the shoreward one last on both input orders, and the order follows the live crests`;
    });

    check('the stage a wave reports is the stage it is drawing', () => {
      // A STORED STAGE WOULD BE A SECOND OWNER. These are read off the same
      // `broken` the tone is, so a label cannot drift from the picture — and
      // this is what says so rather than the absence of a field.
      const w = mkWave(0.6);
      let checked = 0;
      const hit = new Map();
      for (let t = 0; t < w.preS; t += 0.2) {
        w.age = t;
        const u = 0.5, b = WV.brokenAt(w, u);
        const st = WV.stageAt(w, u, S.WATERLINE_S);
        hit.set(st, (hit.get(st) || 0) + 1);
        const band = WV.bandWidthAt(w, b), face = WV.faceAmountOf(w);
        if (st === WV.SWELL) assert.strictEqual(band, 0, 'a column in SWELL is drawing foam');
        if (st === WV.STEEPEN) assert.ok(band <= WV.LIP_W + 1e-9, `a column in STEEPEN is drawing a band of ${band.toFixed(3)}`);
        if (st === WV.COLLAPSE) assert.ok(face > 0, 'a column in COLLAPSE is drawing no face');
        if (st === WV.FOAM_BAND) assert.strictEqual(face, 0, 'a column in FOAM BAND is still drawing a face');
        checked++;
      }
      // AND EVERY LABEL HAS TO BE REACHED, which is the clause that stops the
      // four above being vacuous. A tree whose face is always zero never puts
      // a column in COLLAPSE at all — so the COLLAPSE clause is CORRECT, IN
      // SCOPE AND EMPTY, which is Eva's fifth durable rule exactly. Measured:
      // `the-wave-has-no-dark-face` reported MISSED on this check until this
      // clause existed.
      for (const st of [WV.SWELL, WV.STEEPEN, WV.COLLAPSE, WV.FOAM_BAND]) {
        assert.ok((hit.get(st) || 0) > 0, `no station was ever in ${WV.STAGE_NAMES[st]}, so its clause claimed nothing`);
      }
      return `${checked} stations over ${hit.size} stages, every label agreeing with what is drawn`;
    });

    setSection('beach-tone');

    // ---------------------------------------------------------------------
    // RETIRED WITH THE HALFTONE LATTICE. Five checks stood here and all five
    // were about ink DENSITY on a bilevel lattice measured against a
    // photograph. beach-draw.js is gone and beach-brush.js draws with flat
    // fills and brush strokes — a mid-grey sea, a near-black wave face, bare
    // paper sand — so every one of them is a question about a module that no
    // longer exists. Named here rather than deleted quietly, because what a
    // check stops covering is worth more than the fact that it went:
    //
    //   the value ordering is the reference's own
    //       `TONE.deep > shallow > gloss > wet > foam == dry == 0`. THE NEW
    //       DRAWING BREAKS THIS ORDERING ON PURPOSE: its shallows are bare
    //       paper, LIGHTER than the wet-sand grey behind the swash front, so
    //       the sea is no longer monotone from deep water to dry sand. What
    //       replaces it is not another ordering — it is that there is no tone
    //       ladder left to order.
    //   the foam band is a plateau of paper, not a ramp to one
    //       about `waterTone`'s band profile. The foam is a paper FILL now,
    //       bounded by a scalloped path; a plateau is what a fill is.
    //   the run-up sheet is lighter than deep water
    //       about the ocean gradient being anchored off the moving edge. There
    //       is no gradient: the sheet is one flat `PALETTE.wet`.
    //   the dry sand leaves a register for the marks session
    //       THE ONE REAL LOSS, and it is a loss rather than an obsolescence.
    //       The lattice drew its sand texture at a declared alpha with 0.30 of
    //       headroom under the floor a later session's drawn marks would start
    //       at, so the two could not collide. Every mark in the new drawing is
    //       full-strength ink, so that separation does not exist and cannot be
    //       asserted. The marks session will have to separate its register some
    //       other way — by density, by shape or by weight — and this paragraph
    //       is the whole of the warning it gets.
    //   the swell fades out in the deep water
    //       about `swell()`, the lattice's along-shore displacement. Gone with
    //       it; the surface's own wander is beach-brush.js's `bumps` now.
    // ---------------------------------------------------------------------
  }

  // --------------------------------------------------------------- registry
  setSection('registry');
  check('there are eight slots and two are built', () => {
    assert.strictEqual(M.registry.SCENES.length, M.registry.MAX_SCENES);
    assert.strictEqual(M.registry.MAX_SCENES, 8);
    M.registry.SCENES.forEach((s, i) => assert.strictEqual(s.id, i + 1));
    const built = M.registry.builtScenes();
    assert.strictEqual(built.length, 2, `${built.length} scenes are built`);
    assert.deepStrictEqual(built.map(b => b.id), [1, 3]);
    assert.ok(built.every(b => b.title), 'a built slot has no title');
    return `8 slots, ${built.map(b => `${b.id} "${b.title}"`).join(' + ')}, 6 stubs`;
  });

  check('the random pick excludes what is showing', () => {
    // With two built it must always move, and never to the one showing.
    for (const u of [0, 0.49, 0.5, 0.99]) {
      assert.strictEqual(M.registry.randomSceneId(1, () => u), 3);
      assert.strictEqual(M.registry.randomSceneId(3, () => u), 1);
    }
    // And with only one it has nowhere to go, which is what disables the
    // button rather than leaving a no-op that looks broken.
    const saved = M.registry.SCENES[2];
    M.registry.SCENES[2] = { id: 3, title: null, load: null };
    try {
      assert.strictEqual(M.registry.randomSceneId(1, () => 0.5), null,
        'with one scene built there is nowhere to go');
    } finally { M.registry.SCENES[2] = saved; }
    return 'never the current one with two built; null with one';
  });

  check('the url names a scene and falls back when it cannot', () => {
    assert.strictEqual(M.registry.sceneFromUrl('?scene=1'), 1);
    assert.strictEqual(M.registry.sceneFromUrl('?scene=5'), 1, 'an unbuilt slot fell through to nothing');
    assert.strictEqual(M.registry.sceneFromUrl('?scene=99'), 1);
    assert.strictEqual(M.registry.sceneFromUrl(''), 1);
    return 'unbuilt and out-of-range both land on the first built scene';
  });

  // ------------------------------------------------------- the two rules ---
  // The shell's guarantees are STRUCTURAL — one animation loop, one set of
  // input listeners, one random source — and a structural guarantee is only
  // worth anything if nothing quietly opts out of it. These read the shipped
  // source. Comments are stripped first, since every one of these rules is
  // also WRITTEN ABOUT in the headers it governs.
  setSection('discipline');
  // A NEW SCENE MODULE MUST BE ADDED HERE OR IT IS SCANNED BY NOTHING. The list
  // is the scan's own coverage, and a module missing from it passes every
  // discipline check by not being read — the hole this repo has found in a
  // hand-written coverage list more than once.
  const SCENE_MODULES = ['surface.js', 'koi-storm.js', 'koi-wind.js', 'koi-ripples.js',
                         'koi-rain.js', 'koi-fish.js', 'koi-pads.js', 'koi-draw.js',
                         'scene-koi.js',
                         'beach-shore.js', 'beach-swash.js', 'beach-sets.js',
                         'beach-water.js', 'beach-wave.js', 'beach-brush.js', 'beach-render.js',
                         'scene-beach.js'];
  const stripComments = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  const scanModules = (pattern, what) => {
    const hits = [];
    for (const f of SCENE_MODULES) {
      const src = stripComments(fs.readFileSync(path.join(SCENE, f), 'utf8'));
      src.split('\n').forEach((line, i) => {
        if (pattern.test(line)) hits.push(`${f}:${i + 1} ${line.trim().slice(0, 60)}`);
      });
    }
    if (hits.length) throw new Error(`${what}:\n    ${hits.join('\n    ')}`);
    return `${SCENE_MODULES.length} scene modules clean`;
  };

  check('no scene module schedules its own frame', () =>
    scanModules(/requestAnimationFrame|setInterval|\bsetTimeout\b/,
      'a scene that owns a loop can leave one running after it is disposed'));

  check('no scene module registers its own listener', () =>
    scanModules(/addEventListener|\bonclick\b|\bonwheel\b/,
      'a scene that binds a listener can leak one across a swap'));

  check('no scene module reaches the document or the window', () =>
    scanModules(/\bdocument\s*\.|\bwindow\s*\.|\blocation\s*\./,
      'the shell hands a scene everything it needs; reaching past it is how a scene stops being swappable'));

  check('no scene module calls Math.random', () =>
    scanModules(/Math\s*\.\s*random/,
      'every scene draws from the seeded stream, or `?seed=` means nothing'));

  check('the shell owns exactly one loop and one set of listeners', () => {
    const shell = stripComments(fs.readFileSync(path.join(REPO, 'scene.js'), 'utf8'));
    const rafs = (shell.match(/requestAnimationFrame\(/g) || []).length;
    assert.strictEqual(rafs, 2, `the shell schedules frames in ${rafs} places (expected the tick and the start)`);
    const binds = (shell.match(/addEventListener\(/g) || []).length;
    if (binds < 8) throw new Error(`only ${binds} listeners are bound in the shell`);
    // Every one of them must be inside bindInput(), which runs once at boot.
    const body = shell.slice(shell.indexOf('function bindInput'), shell.indexOf('// --- test chrome'));
    const inBind = (body.match(/addEventListener\(/g) || []).length;
    const inNav = (shell.match(/b\.addEventListener|randomBtn\.addEventListener/g) || []).length;
    assert.strictEqual(inBind + inNav, binds,
      `${binds - inBind - inNav} listener(s) are bound outside bindInput() and the nav`);
    return `${rafs} rAF sites, ${binds} listeners, all bound once at boot`;
  });

  return M;
}

// =========================================================== PART TWO =======
// The real page in a real browser. Every claim is measured against the DOM, the
// scene's own reported state, or the pixels that were actually rasterised.

const PROBE_SCENE = `
// A synthetic scene, served only by the gate. It exists to make the shell's two
// guarantees observable: it counts the frames it is given and records that it
// was disposed, so a leaked loop or a skipped teardown is a number rather than
// an inference.
export const meta = { title: 'Probe' };
export default function createProbe(host) {
  const { ctx } = host.canvas2d();
  window.__probe = { frames: 0, disposed: false, built: (window.__probe?.built || 0) + 1 };
  return {
    frame() { window.__probe.frames++; ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 40, 40); },
    dispose() { window.__probe.disposed = true; },
    state() { return { probe: true, frames: window.__probe.frames }; },
  };
}
`;

// A synthetic MULTIPLANE scene, served only by the gate. Nothing that ships
// calls host.canvas2d() more than once, so without this the layering contract
// is exercised by nobody and every claim about it is an inference. The back
// plane floods red; the front plane clears itself and draws one blue square,
// well clear of the nav's translucent chrome (sampling under that measures the
// nav, not the plane).
const LAYER_PROBE = `
export const meta = { title: 'Planes' };
export const LAYER_SQUARE = { x: 300, y: 300, w: 200, h: 200 };
export default function createLayers(host) {
  const back = host.canvas2d();
  const front = host.canvas2d();
  window.__layers = { frames: 0, square: { x: 300, y: 300, w: 200, h: 200 } };
  return {
    frame() {
      window.__layers.frames++;
      back.ctx.fillStyle = '#ff0000';
      back.ctx.fillRect(0, 0, host.width, host.height);
      front.ctx.clearRect(0, 0, host.width, host.height);
      front.ctx.fillStyle = '#0000ff';
      front.ctx.fillRect(300, 300, 200, 200);
    },
    state() { return { layers: true, frames: window.__layers.frames }; },
  };
}
`;

function serveRepo({ mutant, withProbe, withLayers }) {
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png' };
  const state = { probeDelayMs: 0 };
  const server = http.createServer(async (req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    const send = (body, type) => {
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      res.end(body);
    };

    if (rel === 'scene/scene-probe.js') {
      if (state.probeDelayMs) await new Promise(r => setTimeout(r, state.probeDelayMs));
      return send(PROBE_SCENE, 'text/javascript');
    }

    if (rel === 'scene/scene-layers.js') return send(LAYER_PROBE, 'text/javascript');

    const file = path.join(REPO, rel);
    if (!file.startsWith(REPO) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end('not found'); return;
    }
    let body = fs.readFileSync(file);
    if (mutant && rel === mutant.file) body = Buffer.from(applyMutant(mutant));
    if (withProbe && rel === 'scene/registry.js') {
      const src = body.toString();
      const swapped = src.replace(
        "  { id: 2, title: null, load: null },",
        "  { id: 2, title: 'Probe', load: () => import('./scene-probe.js') },");
      if (swapped === src) throw new Error('the probe could not be injected into the registry');
      body = Buffer.from(swapped);
    }
    if (withLayers && rel === 'scene/registry.js') {
      // THE PROBE TAKES THE FIRST EMPTY SLOT RATHER THAN A NUMBERED ONE. It sat
      // on slot 3 and slot 3 became the beach, so the injection silently found
      // nothing to replace and the whole pass died on its own guard. Slot 4 is
      // the next stub, and taking "the first empty slot" means the next scene
      // built does not do this again.
      const src = body.toString();
      const empty = src.match(/ {2}\{ id: (\d+), title: null, load: null \},/);
      if (!empty) throw new Error('the layer probe found no empty slot in the registry');
      const swapped = src.replace(empty[0],
        `  { id: ${empty[1]}, title: 'Planes', load: () => import('./scene-layers.js') },`);
      if (swapped === src) throw new Error('the layer probe could not be injected into the registry');
      state.layerSlot = Number(empty[1]);
      body = Buffer.from(swapped);
    }
    send(body, MIME[path.extname(file)] || 'application/octet-stream');
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, state })));
}

async function openPage(browser, base, { reducedMotion = 'no-preference', seed = 4242, viewport } = {}) {
  const ctx = await browser.newContext({
    viewport: viewport || { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    reducedMotion,
  });
  // The page pins one Google font. It is chrome, not content, and the gate must
  // not depend on the network to run.
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await ctx.route('https://fonts.gstatic.com/**', r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`${base}/scene.html?seed=${seed}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__scene && window.__scene.activeId !== null, null, { timeout: 10000 });
  return { page, ctx, errors };
}

// Mean brightness of the scene canvas, read back from the rasterised pixels
// rather than from anything the page says about itself.
// WAIT ON THE SIMULATION'S OWN CLOCK, NOT THE WALL'S. A scene advances by the
// sum of its CLAMPED frame deltas, so a page rendering at 18 fps against a
// clamp of 1/20 advances 0.9 s of pond per second of wall — and a check that
// slept 5.4 s and asserted the storm had begun to ebb was really asserting
// something about how fast the machine was. Measured: the ellipse mutant drops
// the frame rate by a factor of three and reddened two timing checks that have
// nothing to do with it. This asks the page how much pond has actually gone by.
async function waitSceneSeconds(page, secs, capMs = 30000) {
  const from = await page.evaluate(() => window.__scene.sceneState().clock);
  await page.waitForFunction(
    ([t0, want]) => window.__scene.sceneState().clock - t0 >= want,
    [from, secs], { timeout: capMs, polling: 50 });
}

const CANVAS_STATS = `(() => {
  const c = document.querySelector('.scene-canvas');
  const g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let sum = 0, lit = 0;
  for (let i = 0; i < d.length; i += 4) {
    const v = (d[i] + d[i+1] + d[i+2]) / 3;
    sum += v; if (v > 26) lit++;
  }
  return { mean: sum / (d.length / 4), lit, px: d.length / 4 };
})()`;

// Bright pixels inside a screen-space ellipse and in an annulus just outside
// it, read back from the RASTERISED framebuffer. The threshold sits above the
// pad's own body and freckles and below a ripple ring or a koi's outline, so
// what it counts is things ON the water rather than the pad itself.
// THE LEVEL IS A MEASURED CLIFF, NOT A GUESS, and the first two numbers tried
// were both wrong for reasons worth writing down. A pad's own FRECKLES
// composite to about 71 over the ground — one over a threshold of 70 — so at
// that level the check was counting the pad's texture as something showing
// through it. And freckles OVERLAP: two on top of each other reach ~103 and
// three ~123, which is past a koi's own outline (~97), so no threshold
// separates "a fish under the pad" from "the pad's own marks" by brightness.
// Sampled over 22 frames on an isolated pad at idle, interior against the water
// just outside it:
//     level    inside    outside
//        70    3.135%     2.981%
//        90    2.447%     1.599%
//       110    0.053%     0.446%
//       120    0.000%     0.210%
// So 120 is above everything a pad draws on itself and below plenty of what the
// water carries. WHAT IT THEREFORE CANNOT SEE is the koi, whose outline is
// dimmer than a stack of freckles — that half of the claim is measured by
// `pads/a-pad-is-drawn-over-the-fish-and-the-ripples`, in Node, on the order the
// renderer actually emits.
// (the measured brightness table above is kept because it is WHY this check is
// a variance; no clause reads a level any more.)
// Mean brightness inside each of several equal-sized screen ellipses, read back
// from the RASTERISED framebuffer in ONE call per frame — so several pads and
// their control are sampled at the same instant and are directly comparable.
// EVERY DISC IS THE SAME SIZE, because variance scales with area: a single ring
// crossing a small disc moves its mean far more than it moves a large one, so
// discs of different radii cannot be compared to each other at all.
const DISC_MEANS = `(discs, rx, ry) => {
  const c = document.querySelector('.scene-canvas');
  const g = c.getContext('2d');
  const dpr = c.width / parseFloat(c.style.width);
  return discs.map(([cx, cy]) => {
    const R = Math.ceil(rx * dpr) + 2, Ry = Math.ceil(ry * dpr) + 2;
    const x0 = Math.max(0, Math.round(cx * dpr) - R), y0 = Math.max(0, Math.round(cy * dpr) - Ry);
    const w = Math.min(c.width - x0, R * 2), h = Math.min(c.height - y0, Ry * 2);
    if (w <= 0 || h <= 0) return null;
    const d = g.getImageData(x0, y0, w, h).data;
    let n = 0, sum = 0;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const i = (py * w + px) * 4;
        const dx = ((x0 + px) / dpr - cx) / rx, dy = ((y0 + py) / dpr - cy) / ry;
        if (Math.hypot(dx, dy) > 1) continue;
        n++; sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
      }
    }
    return n ? sum / n : null;
  });
}`;

async function partTwo(browser, mutant, shotsDir) {
  // ---------------------------------------------------- pass A: the page ---
  {
    const { server, state } = await serveRepo({ mutant, withProbe: false });
    void state;
    const base = `http://127.0.0.1:${server.address().port}`;
    const { page, ctx, errors } = await openPage(browser, base);
    try {
      setSection('shell');
      await checkAsync('the page opens on scene one, running', async () => {
        const st = await page.evaluate(() => ({
          id: window.__scene.activeId, running: window.__scene.running,
          canvases: window.__scene.canvasCount, children: window.__scene.stageChildren,
        }));
        assert.strictEqual(st.id, 1);
        assert.strictEqual(st.running, true, 'the loop is not running');
        assert.strictEqual(st.canvases, 1, `${st.canvases} canvases`);
        assert.strictEqual(st.children, 1, `${st.children} things on the stage`);
        return 'scene 1, one canvas, loop running';
      });

      await checkAsync('the nav offers eight slots, the unbuilt ones disabled', async () => {
        const nav = await page.evaluate(() => {
          const btns = [...document.querySelectorAll('#scene-nav-scenes [data-scene]')];
          return btns.map(b => ({ label: b.textContent, disabled: b.disabled,
                                  active: b.classList.contains('is-active'),
                                  current: b.getAttribute('aria-current') }));
        });
        const numbered = nav.filter(b => /^\d$/.test(b.label));
        assert.strictEqual(numbered.length, 8, `${numbered.length} numbered buttons`);
        assert.deepStrictEqual(numbered.map(b => b.label), ['1','2','3','4','5','6','7','8']);
        assert.strictEqual(numbered.filter(b => b.disabled).length, 6, 'the wrong number are disabled');
        assert.strictEqual(numbered[0].disabled, false, 'scene 1 is disabled');
        assert.strictEqual(numbered[2].disabled, false, 'scene 3 is disabled');
        assert.strictEqual(numbered[0].active, true, 'scene 1 is not marked active');
        assert.strictEqual(numbered[0].current, 'true', 'scene 1 carries no aria-current');
        const rnd = nav.find(b => b.label === '?');
        assert.ok(rnd, 'there is no random button');
        assert.strictEqual(rnd.disabled, false, 'the random button is dead with two scenes to choose from');
        return '2 built (1, 3), 6 disabled, ? live';
      });

      await checkAsync('return goes back to the site', async () => {
        const href = await page.evaluate(() => document.querySelector('.scene-nav__return').getAttribute('href'));
        assert.strictEqual(href, 'index.html');
        const visible = await page.evaluate(() => {
          const el = document.querySelector('.scene-nav__return');
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
        });
        assert.strictEqual(visible, true, 'the return link is not visible');
        return 'always visible, top left, -> index.html';
      });

      await checkAsync('the url names the scene it is showing', async () => {
        const q = await page.evaluate(() => location.search);
        assert.ok(/scene=1/.test(q), `the url reads "${q}"`);
        assert.ok(/seed=4242/.test(q), 'the seed was dropped from the url');
        return q;
      });

      await checkAsync('the canvas is sized in device pixels and drawn in css pixels', async () => {
        const st = await page.evaluate(() => {
          const c = document.querySelector('.scene-canvas');
          return { w: c.width, h: c.height, cssW: parseFloat(c.style.width), cssH: parseFloat(c.style.height),
                   dpr: window.__scene.viewport.dpr, vp: window.__scene.viewport };
        });
        assert.strictEqual(st.w, Math.round(st.cssW * st.dpr), 'backing width');
        assert.strictEqual(st.h, Math.round(st.cssH * st.dpr), 'backing height');
        assert.strictEqual(st.cssW, st.vp.w);
        return `${st.cssW}x${st.cssH} css at dpr ${st.dpr} -> ${st.w}x${st.h}`;
      });

      await checkAsync('the page takes over the viewport and does not scroll', async () => {
        for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 240);
        await page.waitForTimeout(120);
        const st = await page.evaluate(() => ({
          y: window.scrollY, x: window.scrollX,
          overflow: getComputedStyle(document.documentElement).overflow,
          tall: document.documentElement.scrollHeight <= window.innerHeight + 1,
        }));
        assert.strictEqual(st.y, 0, 'the document scrolled');
        assert.strictEqual(st.x, 0, 'the document scrolled sideways');
        assert.strictEqual(st.tall, true, 'the document is taller than the viewport');
        return `no scroll after six wheel events, overflow ${st.overflow}`;
      });

      await checkAsync('there is no text on the page but the nav', async () => {
        // "NO CHROME BESIDES THE NAV" IS LITERAL. This page once carried a line
        // of instructional text that faded out after seven seconds, on the
        // grounds that the two interactions are otherwise undiscoverable; that
        // was overruled, and the rule is that there is no on-screen text
        // outside the nav EVER, not that a particular string is gone. So the
        // check walks the rendered text rather than looking for that sentence,
        // and any future caption fails it the day it is added.
        //
        // WHAT COUNTS AS SHOWN IS ASKED OF THE BROWSER, NOT OF THE STYLESHEET.
        // The obvious filter — display:none or visibility:hidden — is WRONG
        // here, measured rather than assumed: Chromium reports `display:
        // inline` and `visibility: visible` for a <noscript> whose contents it
        // is not rendering at all, and the noscript block is the one piece of
        // text on this page that genuinely must stay (it is what a visitor with
        // scripting off gets instead of a blank viewport). What it DOES report
        // is zero client rects and checkVisibility() false, which is the
        // platform's own answer to "is this painted" and is the thing the rule
        // is actually about.
        //
        // OPACITY IS NOT AN EXEMPTION, on purpose: a hint mid-fade is still a
        // hint, and checkVisibility() ignores opacity unless asked, so a line
        // fading out is still caught.
        const strayText = () => page.evaluate(() => {
          const nav = document.querySelector('.scene-nav');
          const out = [];
          const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          for (let n = walk.nextNode(); n; n = walk.nextNode()) {
            const t = n.textContent.replace(/\s+/g, ' ').trim();
            if (!t) continue;
            const el = n.parentElement;
            if (!el || (nav && nav.contains(el))) continue;
            const painted = el.checkVisibility
              ? el.checkVisibility()
              : el.getClientRects().length > 0;
            if (!painted || el.getClientRects().length === 0) continue;
            out.push(`<${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}> "${t.slice(0, 60)}"`);
          }
          return out;
        });
        // Twice, a few seconds apart: once now, and once after anything on a
        // timer would have had its moment.
        const now = await strayText();
        await waitSceneSeconds(page, 2.5);
        const later = await strayText();
        const stray = [...new Set([...now, ...later])];
        if (stray.length) throw new Error(`text outside the nav: ${stray.join(' | ')}`);
        const nav = await page.evaluate(() => {
          const n = document.querySelector('.scene-nav');
          return n ? n.innerText.replace(/\s+/g, ' ').trim() : '';
        });
        assert.ok(nav.length > 0, 'the nav itself has no text');
        return `nothing outside the nav, which reads "${nav}"`;
      });

      setSection('scene1');
      await checkAsync('the pond has koi in it and draws them', async () => {
        await page.waitForTimeout(800);
        const st = await page.evaluate(() => window.__scene.sceneState());
        if (!(st.visible >= 3 && st.visible <= 7)) throw new Error(`${st.visible} koi on screen`);
        const ink = await page.evaluate(CANVAS_STATS);
        if (!(ink.lit > 400)) throw new Error(`only ${ink.lit} lit pixels — nothing is being drawn`);
        return `${st.visible} koi, ${st.ripples} ripples, ${ink.lit} lit pixels`;
      });

      await checkAsync('the pond has lily pads on it, in clumps, with blooms among them', async () => {
        const st2 = await page.evaluate(() => window.__scene.sceneState());
        if (!(st2.pads >= 12)) throw new Error(`${st2.pads} pads on the water`);
        if (!(st2.clusters >= 2)) throw new Error(`${st2.clusters} clusters`);
        if (!(st2.blooms >= 2 && st2.blooms <= 3)) throw new Error(`${st2.blooms} blooms`);
        // Back to front, which is what lets a nearer pad cover a farther one's
        // rim: ascending plane y is the painter's order under this viewpoint.
        for (let i = 1; i < st2.padOrder.length; i++) {
          if (st2.padOrder[i] < st2.padOrder[i - 1]) throw new Error('the draw order is not back to front');
        }
        if (st2.padOrder.length !== st2.pads + st2.blooms) {
          throw new Error(`${st2.padOrder.length} things are drawn against ${st2.pads + st2.blooms} placed`);
        }
        return `${st2.pads} pads in ${st2.clusters} clusters, ${st2.blooms} blooms, drawn back to front`;
      });

      await checkAsync('a pad hides the water under it', async () => {
        // THE OCCLUSION, READ OFF THE RASTERISED FRAME rather than off the draw
        // order the page reports. A lily pad floats ON the water: a ring spreads
        // around it and a koi swims beneath it, and neither can be seen through
        // a leaf. Nothing in this scene occluded anything before the pads —
        // every other mark is translucent ink — so this is the one check that
        // can say the reset works in pixels.
        //
        // WHAT SEPARATES A PAD FROM WATER IS NOT BRIGHTNESS, IT IS MOTION, and
        // two threshold-based cuts had to fail before that was obvious. A pad's
        // freckles composite to ~71, two overlapping reach ~103 and three ~123 —
        // past a koi's outline at ~97 — so at any level low enough to catch the
        // rings the pad's own texture matches them (3.135% against 2.981% at
        // level 70), and at any level high enough to exclude the texture the
        // ambient rings barely clear it either (2 lit pixels over 30 frames at
        // 120). There is no threshold in between. A pad's interior is STATIC
        // apart from its own rock, while open water has rings sweeping through
        // it continuously, so what is measured is the VARIATION of each disc's
        // mean brightness across frames.
        //
        // SEVERAL PADS, NOT ONE, AND THAT IS THE DIFFERENCE BETWEEN A CHECK THAT
        // FIRES AND ONE THAT MIGHT. Watching a single pad, whether any ring
        // crosses ITS patch during the window is luck: the sweep caught this as
        // a MISSED — the mutation that deletes the reset entirely left the check
        // GREEN — on a run where the one pad it had picked sat over quiet water,
        // and the same mutation had reddened it on an earlier run. With the
        // reset gone EVERY pad shows the water through it, so taking the WORST
        // ratio over several makes the mutation unmissable while costing the
        // clean tree nothing: on a correct pad the interior is quiet wherever it
        // sits.
        const st2 = await page.evaluate(() => window.__scene.sceneState());
        const inFrame = st2.padAt
          .map(([x, y, R, , , notchAt], i) => ({ i, x, y, R, notchAt, sx: x, sy: y * st2.squash }))
          .filter(p => p.R > 24
            && p.sx - p.R > 6 && p.sx + p.R < st2.width - 6
            && p.sy - p.R * st2.squash > 6 && p.sy + p.R * st2.squash < st2.height - 6)
          .sort((a2, b2) => b2.R - a2.R)
          .slice(0, 5);
        if (inFrame.length < 3) throw new Error(`only ${inFrame.length} pads are fully in frame`);
        // THE DISC SITS ON THE PAD'S OWN MATERIAL, WHICH IS NOT THE SAME AS ON
        // THE PAD'S CENTRE — and the difference only started to matter when the
        // stem wedge became a per-pad draw reaching 65 degrees. A disc centred
        // on the pad and 0.9 of its radius across then takes in a sector of the
        // wedge, which is OPEN WATER: the check's own subject quietly grew to
        // include the thing it is comparing against. Measured on the tree that
        // introduced the range, before this fix: the pads' median variation went
        // 0.044-0.067 (one fixed 5.7-degree slit) to 0.193, with the worst pad
        // at 0.234 against a bar of 0.35 — still green, and no longer measuring
        // only what it names.
        //
        // So the disc is offset along the axis AWAY from the wedge, and it is
        // the largest one that fits there. The wedge's two flanks are rays from
        // the pad's own centre, so a disc on the opposite axis is clear of both
        // exactly when it does not reach the centre — its radius must not
        // exceed its offset — and it is inside the rim when the two together do
        // not. 0.42 and 0.40 satisfies both AT EVERY ANGLE THE RULING ALLOWS
        // rather than on this field's luck, with 0.02 R of clearance from the
        // apex and 0.12 R from the nearest rim a tenth of variation can produce.
        // The static marks it crosses — the midrib, a fold — cost a VARIANCE
        // nothing, because they do not move between frames.
        //
        // IT IS A FIFTH OF THE AREA THE OLD CENTRED DISC HAD, and that is the
        // honest cost of a cut that reaches the centre rather than a choice: a
        // smaller disc averages fewer pixels, so rain and the pad's own rock
        // move its mean further. Both sides are sampled at this radius, so the
        // comparison stays fair; what it spends is margin, measured below.
        const OFF = 0.42, DISC = 0.40;
        const rx = Math.min(...inFrame.map(p => p.R)) * DISC, ry = rx * st2.squash;
        for (const p of inFrame) {
          p.sx = p.x - Math.cos(p.notchAt) * OFF * p.R;
          p.sy = (p.y - Math.sin(p.notchAt) * OFF * p.R) * st2.squash;
        }

        // The control is a disc of the SAME size on open water, which the brief
        // guarantees exists — loose clusters with gaps between them — placed at
        // a similar distance from the frame's centre so the vignette matches.
        const away = (x, y) => st2.padAt.every(([ox, oy, oR]) => Math.hypot(ox - x, oy - y) > oR + rx + 6)
          && st2.bloomAt.every(([ox, oy, oR]) => Math.hypot(ox - x, oy - y) > oR + rx + 6);
        const cx0 = st2.width / 2, cy0 = st2.height / st2.squash / 2;
        const want = Math.hypot(inFrame[0].x - cx0, inFrame[0].y - cy0);
        const open = [];
        for (let gx = 0; gx < 44; gx++) {
          for (let gy = 0; gy < 44; gy++) {
            const x = (gx + 0.5) / 44 * st2.width, y = (gy + 0.5) / 44 * (st2.height / st2.squash);
            if (x - rx < 6 || x + rx > st2.width - 6) continue;
            if (y * st2.squash - ry < 6 || y * st2.squash + ry > st2.height - 6) continue;
            if (!away(x, y)) continue;
            open.push({ x, y, d: Math.abs(Math.hypot(x - cx0, y - cy0) - want) });
          }
        }
        if (!open.length) throw new Error('no patch of open water the size of a pad to compare against');
        open.sort((a2, b2) => a2.d - b2.d);
        // FIVE CONTROL PATCHES, NOT ONE, FOR THE SAME REASON THERE ARE FIVE PADS
        // — and the first cut of this fix used five pads against ONE patch,
        // which left the comparison exactly as luck-dependent on the other side:
        // measured across two runs of an unchanged tree, a single patch's
        // variation read 3.041 and then 0.751, a factor of four, purely from how
        // many rings happened to cross it. Both sides are medians over five now,
        // so neither is one draw.
        const spots = [];
        for (const c of open) {
          if (spots.every(o => Math.hypot(o.x - c.x, o.y - c.y) > rx * 2.2)) spots.push(c);
          if (spots.length === 5) break;
        }
        if (spots.length < 3) throw new Error(`only ${spots.length} separate patches of open water to compare against`);

        const discs = [...inFrame.map(p => [p.sx, p.sy]),
                       ...spots.map(c => [c.x, c.y * st2.squash])];
        const series = discs.map(() => []);
        // ON THE POND'S CLOCK: what this needs is rings that have MOVED between
        // samples, and how much pond a wall-clock wait covers depends on how
        // fast the machine is.
        for (let t = 0; t < 34; t++) {
          const means = await page.evaluate(`(${DISC_MEANS})(${JSON.stringify(discs)}, ${rx}, ${ry})`);
          if (means && means.every(m => m !== null)) means.forEach((m, k) => series[k].push(m));
          await waitSceneSeconds(page, 0.10);
        }
        const frames = series[0].length;
        if (frames < 10) throw new Error(`only ${frames} frames could be sampled`);
        const sd = (xs) => {
          const m = xs.reduce((p2, q) => p2 + q, 0) / xs.length;
          return Math.sqrt(xs.reduce((p2, q) => p2 + (q - m) * (q - m), 0) / xs.length);
        };
        const mid = (xs) => xs.slice().sort((a2, b2) => a2 - b2)[Math.floor(xs.length / 2)];
        const padSds = series.slice(0, inFrame.length).map(sd);
        const waterSds = series.slice(inFrame.length).map(sd);
        const waterSd = mid(waterSds);
        // THE MEDIAN OF THE FIVE, NOT THE WORST, AND RAIN IS WHY. A streak is in
        // the AIR and is drawn in FRONT of a pad — correct behaviour, not a leak
        // — and one crossing a disc of this size moves its mean by about a
        // level, the same order as the whole signal the open water carries. That
        // is visible on a CLEAN tree as the spread between the quietest and the
        // noisiest of five equally-correct pads: 0.026 against 0.199, a factor
        // of eight, entirely from where the drops happened to fall. Taking the
        // WORST therefore reads the weather, and it went red three times on
        // mutations that provably could not reach it — the last being a storm
        // ramp that is inert until the first click, which this check runs before.
        //
        // The median is the statistic the CLAIM wants: a missing reset shows the
        // water through EVERY pad, so the middle one rises with the rest, while
        // a couple of unlucky drops move one or two and leave the middle alone.
        const median = mid(padSds);
        // NOT VACUOUS: the open water has to be visibly doing something, or a
        // pad that hid nothing would pass beside water that showed nothing.
        if (!(waterSd > 0.35)) {
          throw new Error(`the median of ${waterSds.length} equal patches of open water varies by only `
            + `${waterSd.toFixed(3)} levels across ${frames} frames — nothing was sweeping them, `
            + `so there is nothing to hide (all: ${waterSds.map(v => v.toFixed(3)).join(', ')})`);
        }
        if (!(median < waterSd * 0.35)) {
          throw new Error(`the median of ${inFrame.length} pads varies by ${median.toFixed(3)} levels against `
            + `the open water's ${waterSd.toFixed(3)} — things on the water are sweeping through them `
            + `(all of them: ${padSds.map(v => v.toFixed(3)).join(', ')})`);
        }
        return `${inFrame.length} pads vary ${Math.min(...padSds).toFixed(3)}-${Math.max(...padSds).toFixed(3)} `
          + `levels, median ${median.toFixed(3)}; ${waterSds.length} open-water patches `
          + `${Math.min(...waterSds).toFixed(3)}-${Math.max(...waterSds).toFixed(3)}, median `
          + `${waterSd.toFixed(3)}; over ${frames} frames, discs r=${rx.toFixed(0)}`;
      });

      await checkAsync('the traits are per fish and span the sliders', async () => {
        const traits = await page.evaluate(() => window.__scene.sceneState().traits);
        assert.ok(traits.length >= 3, 'too few fish to say anything');
        for (const t of traits) {
          for (const k of ['speed', 'ripple', 'social']) {
            if (!(t[k] >= 0 && t[k] <= 1)) throw new Error(`${k} read ${t[k]}`);
          }
        }
        const distinct = new Set(traits.map(t => JSON.stringify(t))).size;
        assert.strictEqual(distinct, traits.length, 'two koi share a personality');
        return `${traits.length} koi, all distinct`;
      });

      await checkAsync('ambient rain makes ripples with no hand on the mouse', async () => {
        const before = await page.evaluate(() => window.__scene.sceneState().spawned);
        await waitSceneSeconds(page, 2.5);
        const after = await page.evaluate(() => window.__scene.sceneState());
        if (!(after.spawned > before)) throw new Error('no ripple appeared on its own');
        if (!(after.landed > 0)) throw new Error('no drop ever landed');
        assert.strictEqual(after.phase, 'idle', `the resting state reads "${after.phase}"`);
        return `${after.spawned - before} ripples in 2.5 s, storm idle`;
      });

      await checkAsync('a click on the water makes a ripple where it was clicked', async () => {
        const before = await page.evaluate(() => window.__scene.sceneState().spawned);
        await page.mouse.click(430, 260);
        await page.waitForTimeout(60);
        const st = await page.evaluate(() => window.__scene.sceneState());
        if (!(st.spawned > before)) throw new Error('the click made no ripple');
        assert.strictEqual(st.rippleFields.join(','), 'x,y,r,maxR,age,life,strength,rings',
          `the live record is {${st.rippleFields.join(', ')}} — it has grown a field`);
        // WHERE it landed, in the water's own coordinates: the click is in CSS
        // pixels and the pond is the screen stretched by 1/squash, so a ripple
        // at the click point sits at (x, y / squash). A ripple in the right
        // place by accident is not available here — the nearest ambient drop
        // is hundreds of pixels away.
        const want = { x: 430, y: 260 / st.squash };
        const fresh = st.ripplePositions.filter(([, , , age]) => age < 0.25);
        const hit = fresh.find(([x, y]) => Math.hypot(x - want.x, y - want.y) < 4);
        if (!hit) {
          throw new Error(`no fresh ripple near plane (${want.x}, ${want.y.toFixed(0)}); `
            + `fresh ones sat at ${fresh.map(([x, y]) => `(${x.toFixed(0)},${y.toFixed(0)})`).join(' ') || 'nowhere'}`);
        }
        // And it is a click-sized splash, not a raindrop that happened to land there.
        if (!(hit[2] > 90)) throw new Error(`the ripple at the click point has maxR ${hit[2].toFixed(0)}`);
        return `plane (${hit[0].toFixed(0)}, ${hit[1].toFixed(0)}), maxR ${hit[2].toFixed(0)}`;
      });

      await checkAsync('five rapid clicks bring on a downpour', async () => {
        for (let i = 0; i < 5; i++) { await page.mouse.click(500 + i * 40, 300 + i * 30); await page.waitForTimeout(70); }
        await waitSceneSeconds(page, 2.2);
        const st = await page.evaluate(() => window.__scene.sceneState());
        near(st.intensity, 1, 0.02, 'intensity two seconds after five rapid clicks');
        if (!(st.drops > 10)) throw new Error(`only ${st.drops} drops in the air during a downpour`);
        return `intensity ${st.intensity.toFixed(3)}, ${st.drops} drops, ${st.ripples} ripples`;
      });

      await checkAsync('a second burst at full downpour throws lightning', async () => {
        const before = await page.evaluate(() => window.__scene.sceneState().flashes);
        for (let i = 0; i < 5; i++) { await page.mouse.click(640, 400); await page.waitForTimeout(70); }
        const after = await page.evaluate(() => window.__scene.sceneState());
        assert.strictEqual(after.flashes, before + 1, `flashes went ${before} -> ${after.flashes}`);
        return `flash ${after.flashes}`;
      });

      await checkAsync('the storm ebbs back to idle on its own', async () => {
        // FIVE SECONDS AND A BIT OF POND, not three: a click at full downpour
        // restarts the two-second ramp before the three-second hold, so the
        // plateau runs five seconds past the last click. See koi-storm.js — it
        // is what makes clicking sustain a downpour.
        await waitSceneSeconds(page, 5.2);
        const mid = await page.evaluate(() => window.__scene.sceneState());
        if (!(mid.intensity < 1)) throw new Error('it never started to ebb');
        return `ebbing at ${mid.intensity.toFixed(3)} (${mid.phase})`;
      });

      await checkAsync('scrolling tilts the rain, and it comes back to vertical', async () => {
        // THE DELTA A PAGE RECEIVES IS NOT THE DELTA PLAYWRIGHT SENDS, and the
        // difference is the device scale factor: measured, an injected
        // mouse.wheel(0, 120) arrives as deltaY 120 at dsf 1 and as 60 at
        // dsf 2. That is an artifact of how a synthetic wheel is converted
        // into CSS coordinates, not something a real wheel does — a hardware
        // notch is a fixed number of CSS pixels whatever the display. So the
        // events are scaled to land as 120 each, and what the page ACTUALLY
        // received is asserted before anything is concluded from it.
        const dpr = await page.evaluate(() => {
          window.__wheelSeen = 0;
          window.addEventListener('wheel', e => { window.__wheelSeen += e.deltaY; }, { passive: true });
          return window.devicePixelRatio;
        });
        for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 120 * dpr); await page.waitForTimeout(25); }
        await page.waitForTimeout(60);
        const seen = await page.evaluate(() => window.__wheelSeen);
        near(seen, 360, 1, 'the page received three 120 px scroll actions');
        const windy = await page.evaluate(() => window.__scene.sceneState());
        near(Math.abs(windy.windDeg), 45, 0.5, 'three notches');
        await waitSceneSeconds(page, 6.1);
        const calm = await page.evaluate(() => window.__scene.sceneState());
        assert.strictEqual(calm.windRad, 0, `it settled at ${calm.windRad} rad rather than exactly vertical`);
        return `${windy.windDeg.toFixed(1)}deg -> exactly 0 after six seconds`;
      });

      await checkAsync('a resize is carried through to the scene', async () => {
        await page.setViewportSize({ width: 900, height: 620 });
        await page.waitForTimeout(250);
        const st = await page.evaluate(() => ({ s: window.__scene.sceneState(), v: window.__scene.viewport,
          c: (() => { const c = document.querySelector('.scene-canvas'); return { w: c.width, cssW: parseFloat(c.style.width) }; })() }));
        assert.strictEqual(st.s.width, 900, `the scene still thinks it is ${st.s.width} wide`);
        assert.strictEqual(st.c.cssW, 900);
        assert.strictEqual(st.c.w, Math.round(900 * st.v.dpr), 'the backing store did not follow');
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.waitForTimeout(200);
        return 'viewport, canvas and scene all agree after a resize';
      });

      await checkAsync('the pads on the real page are riding the water', async () => {
        // WHAT A BROWSER CAN HONESTLY SAY ABOUT THE ROCK, AND IT IS NOT WHAT
        // THIS CHECK FIRST CLAIMED. It used to click beside a pad and assert
        // that pad rocked and then settled. Both halves are unmeasurable here,
        // and the sweep is what proved it — the check went red under
        // `the-notch-is-sampled-at-the-rims-own-spacing`, which changes only how
        // an outline is sampled, consumes no randomness and touches nothing this
        // check reads. It was flaky, not collateral.
        //
        // MEASURED, on the shipped page: AMBIENT RAIN ROCKS A PAD AS HARD AS A
        // CLICK DOES. Peaks over a window at idle ran 1.07-3.77 degrees with no
        // hand on the mouse, against 3.11-4.66 for a pad clicked beside — and on
        // one run the settle reading four and a half seconds later was 3.98
        // degrees, HIGHER than the click's own peak of 3.83, because another
        // drop happened to be crossing. A paired control pad 500-650 px away was
        // no better: the click-to-control ratio ran 1.10x to 2.65x, because the
        // control is in the same rain. There is no bar there.
        //
        // So attributing a rock to a click, and watching one decay, both belong
        // where there IS no ambient field: `pads/a-passing-front-rocks-a-pad-and-
        // lets-it-go` drives one ripple over one pad in Node and asserts the
        // reversal AND the return to rest, and `pads/the-rock-is-subtle-and-a-
        // downpour-does-not-peg-it` owns the cap. What is left for the page is
        // the thing Node cannot say: that the wiring is LIVE — real pads are
        // being advanced against the real ripple list every frame, each reading
        // its own patch of water, inside the ruled bounds.
        const seen = [];
        for (let t = 0; t < 26; t++) {
          const s2 = await page.evaluate(() => window.__scene.sceneState());
          s2.padAt.forEach(([, , , tilt, lift], i) => {
            const e = seen[i] || (seen[i] = { tilt: 0, lift: 0 });
            e.tilt = Math.max(e.tilt, tilt);
            e.lift = Math.max(e.lift, Math.abs(lift));
          });
          await waitSceneSeconds(page, 0.12);
        }
        if (seen.length < 5) throw new Error(`only ${seen.length} pads to watch`);
        const tilts = seen.map(e => e.tilt), lifts = seen.map(e => e.lift);
        const maxTilt = Math.max(...tilts), maxLift = Math.max(...lifts);
        // THE PADS ARE ANSWERING THE WATER. Ambient alone reaches degrees, so
        // this bar is well under what was measured and far above nothing.
        if (!(maxTilt > 0.008)) throw new Error(`no pad rocked more than ${(maxTilt * 180 / Math.PI).toFixed(3)}° in ${seen.length} pads over the window`);
        // AND THE BOB IS THE OTHER HALF OF THE LAW. A pad that reads only the
        // gradient still rocks, so a tilt bar alone leaves the height unmeasured
        // on the page — which is exactly the mutation that stayed green here.
        if (!(maxLift > 0.2)) throw new Error(`no pad rode up a wave (${maxLift.toFixed(3)} px of bob)`);
        // BOUNDED, ON THE REAL PAGE, not only in the fixture.
        const TILT_MAX = 0.125 + 1e-9, BOB_MAX = 5.0 + 1e-9;
        if (!(maxTilt <= TILT_MAX)) throw new Error(`a pad reached ${maxTilt} rad against the ruled cap`);
        if (!(maxLift <= BOB_MAX)) throw new Error(`a pad bobbed ${maxLift} px against the ruled cap`);
        // AND EACH READS ITS OWN PATCH OF WATER. One global number handed to
        // every pad would draw a field of leaves all leaning together.
        const distinct = new Set(tilts.map(v => v.toFixed(6))).size;
        if (!(distinct > seen.length * 0.5)) {
          throw new Error(`${distinct} distinct peaks across ${seen.length} pads — they are not reading their own water`);
        }
        return `${seen.length} pads, peaks to ${(maxTilt * 180 / Math.PI).toFixed(2)}° and `
          + `${maxLift.toFixed(2)} px, ${distinct} distinct, all inside the ruled caps`;
      });

      await checkAsync('the frame is affordable during a downpour', async () => {
        for (let i = 0; i < 5; i++) { await page.mouse.click(400 + i * 60, 250 + i * 40); await page.waitForTimeout(60); }
        await waitSceneSeconds(page, 2.2);
        const cost = await page.evaluate(async () => {
          const f0 = window.__scene.frames, t0 = performance.now();
          await new Promise(r => setTimeout(r, 2500));
          const frames = window.__scene.frames - f0, ms = performance.now() - t0;
          return { fps: frames / (ms / 1000), frames };
        });
        const st = await page.evaluate(() => window.__scene.sceneState());
        // Headless software GL, so this is a floor rather than a target: what
        // it can catch is a frame that has become pathological.
        if (!(cost.fps > 12)) throw new Error(`${cost.fps.toFixed(1)} fps at ${st.ripples} ripples / ${st.drops} drops`);
        return `${cost.fps.toFixed(1)} fps on software GL at ${st.ripples} ripples, ${st.drops} drops`;
      });

      if (shotsDir) {
        fs.mkdirSync(shotsDir, { recursive: true });
        await page.screenshot({ path: path.join(shotsDir, 'downpour.png') });
        await page.waitForTimeout(11000);
        await page.screenshot({ path: path.join(shotsDir, 'idle.png') });
      }

      await checkAsync('the page reports no errors', async () => {
        assert.deepStrictEqual(errors, [], errors.join(' | '));
        return 'clean console';
      });
    } finally {
      await ctx.close();
      server.close();
    }
  }

  // -------------------------------------------- pass A3: scene 3, live ----
  // The beach on the real page, through the real shell. Everything here is
  // either measured off the RASTERISED framebuffer or read from the scene's
  // own reported state; nothing is asserted against the control that wrote it.
  {
    const { server } = await serveRepo({ mutant, withProbe: false });
    const base = `http://127.0.0.1:${server.address().port}`;
    const { page, ctx, errors } = await openPage(browser, base);
    // A MUTATION CAN STOP THE SCENE MODULE LOADING AT ALL, AND A BARE WAIT HERE
    // TURNS THAT INTO A TimeoutError OUT OF THE WHOLE RUN — no summary, no
    // FAILURES block, and every mutant after it in the sweep unrun. This repo's
    // own rule: a missing thing is a RED CHECK, never a hang. The mutation that
    // found it is `the-register-headroom-is-given-away`, which makes
    // beach-draw.js refuse at module scope exactly as it is meant to, so the
    // page never mounts scene 3 — the refusal IS the behaviour under test and
    // it must be reportable. The mount is a check now, and the rest of the
    // section is skipped rather than run against a page that has no beach on
    // it, so the run still reaches its summary and still names what failed.
    scene3: try {
      setSection('scene3');
      await page.evaluate(() => window.__scene.activate(3));
      let mounted = false;

      await checkAsync('the beach loads, draws and takes over the nav', async () => {
        try {
          await page.waitForFunction(() => window.__scene.activeId === 3 && window.__scene.frames > 4,
            null, { timeout: 10000 });
          mounted = true;
        } catch {
          throw new Error('scene 3 never mounted — its module did not load, '
            + `page errors: ${errors.length ? errors.join(' | ') : '(none reported)'}`);
        }
        const st = await page.evaluate(() => ({
          id: window.__scene.activeId, running: window.__scene.running,
          canvases: window.__scene.canvasCount, children: window.__scene.stageChildren,
          title: document.title,
          active: [...document.querySelectorAll('#scene-nav-scenes [data-scene]')]
            .filter(b => b.classList.contains('is-active')).map(b => b.textContent),
        }));
        assert.strictEqual(st.id, 3);
        assert.strictEqual(st.running, true, 'the loop is not running');
        assert.strictEqual(st.canvases, 1, `${st.canvases} canvases — this is not a multiplane scene`);
        assert.strictEqual(st.children, 1, `${st.children} things on the stage`);
        assert.deepStrictEqual(st.active, ['3'], 'the nav does not mark scene 3');
        assert.ok(/Beach/i.test(st.title), `the tab reads "${st.title}"`);
        return `scene 3, one canvas, nav marks 3, "${st.title}"`;
      });

      // Everything below reads the beach's own state or its framebuffer; with
      // no beach mounted they would each fail for the same one reason and bury
      // it in twenty identical reds.
      if (!mounted) break scene3;

      await checkAsync('the published interface is exactly the three things', async () => {
        // "Expose three things and nothing else." Birds need the first two;
        // mark-erasure needs all three.
        const api = await page.evaluate(() => window.__scene.sceneApi());
        assert.deepStrictEqual(api, { swashYAt: 'function', highWaterYAt: 'function', overruns: 'array' },
          `the interface is ${JSON.stringify(api)}`);
        return 'swashYAt · highWaterYAt · overruns';
      });

      await checkAsync('the two queries answer in screen pixels and follow the shear', async () => {
        // BOTH SIDES ARE READ IN ONE EVALUATE, because the page is live: asking
        // the interface in one call and the scene's own report in the next put
        // a frame between them and the two answers were 3 px apart on a moving
        // swash. That is the harness measuring the clock, not the scene.
        const { st, q } = await page.evaluate(() => {
          const w = window.__scene.viewport.w;
          const xs = [0, w * 0.25, w * 0.5, w * 0.75, w - 1];
          return {
            q: xs.map(x => ({ x, s: window.__scene.sceneQuery('swashYAt', x),
                              h: window.__scene.sceneQuery('highWaterYAt', x) })),
            st: window.__scene.sceneState(),
          };
        });
        const DRY_S = await page.evaluate(async () => (await import('/scene/beach-swash.js')).OVERRUN_DRY_S);
        const lagPx = st.height / 20 / DRY_S;
        for (const r of q) {
          assert.ok(Number.isFinite(r.s) && Number.isFinite(r.h), `not a number at x=${r.x}`);
          // THE TOLERANCE IS THE MODEL'S OWN, not a pixel picked by hand.
          // Within one step `wet` is raised to the edge and THEN dried, so it
          // is allowed to sit exactly one step of overrun drying below it:
          // `dt / OVERRUN_DRY_S` of a frame height, with `dt` clamped at 1/20
          // by the shell. Two owners, neither of them this clause. A real
          // inversion is tens of pixels; this is under three.
          assert.ok(r.h > r.s - lagPx,
            `the high-water mark is ${(r.s - r.h).toFixed(2)} px seaward of the swash at x=${r.x}, `
            + `against one step of drying at ${lagPx.toFixed(2)} px`);
        }
        // THE SHEAR IS RECOVERED BY A FIT, NOT BY TWO SAMPLES. Comparing the
        // left edge against the right conflates the shear with the SCALLOPS on
        // the front: at this tilt the shear is ~67 px across the frame and the
        // wobble is ±24 px, so a single pair can come out either way and a
        // LEVEL shoreline passed that clause on the wobble alone (measured —
        // the mutant stayed green). The wobble is zero-mean along the shore, so
        // a least-squares slope over the whole width recovers the shear and
        // nothing else.
        const fit = await page.evaluate(() => {
          const w = window.__scene.viewport.w;
          const n = 41, xs = [], ys = [], hs = [];
          for (let i = 0; i < n; i++) {
            const x = (i / (n - 1)) * (w - 1);
            xs.push(x); ys.push(window.__scene.sceneQuery('swashYAt', x));
            hs.push(window.__scene.sceneQuery('highWaterYAt', x));
          }
          const slope = (a) => {
            const mx = xs.reduce((p, c) => p + c, 0) / n, my = a.reduce((p, c) => p + c, 0) / n;
            let num = 0, den = 0;
            for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (a[i] - my); den += (xs[i] - mx) ** 2; }
            return num / den;
          };
          return { edge: slope(ys), wet: slope(hs), declared: window.__scene.sceneState().slope };
        });
        assert.ok(fit.declared < 0, `the shore declares a slope of ${fit.declared}`);
        for (const [what, v] of [['swash edge', fit.edge], ['high-water mark', fit.wet]]) {
          assert.ok(v < 0, `the ${what} does not rise to the right (slope ${v.toFixed(4)})`);
          near(v, fit.declared, Math.abs(fit.declared) * 0.45,
            `the ${what}'s drawn slope is not the shore's declared one`);
        }
        // And they agree with what the scene says about itself, in its own units.
        near(q[2].s, st.swashY[2], 1e-6, 'swashYAt disagrees with the reported state');
        near(q[2].h, st.highWaterY[2], 1e-6, 'highWaterYAt disagrees with the reported state');
        return `fitted slope: edge ${fit.edge.toFixed(4)}, high-water ${fit.wet.toFixed(4)}, shore declares ${fit.declared.toFixed(4)}`;
      });

      // TWO MORE PHOTOGRAPHIC CHECKS RETIRED HERE, and they are the pair the
      // brief names. Both read the rasterised framebuffer and compared BAND
      // MEANS and INK COVERAGE against figures measured off the reference
      // footage, which is the right question to ask of a halftone lattice and
      // the wrong one to ask of a cartoon:
      //
      //   the value ordering holds and the dry sand is toned not blank
      //       the five-band comparison — deep < mid < wet < dry as means, plus
      //       a local-contrast floor on the dry band and a darkest-1% ceiling
      //       holding its texture inside the marks register. The new drawing
      //       fails it by design (its shallows are bare paper) and its sand
      //       texture is full-strength ink, so neither half survives.
      //   the foam band reaches bare paper
      //       the band's longest bare run against the reference's own 0.43-3.56
      //       per cent of frame. The foam is a fill; it is bare everywhere
      //       inside its own path, so the question is vacuous.
      //
      // What replaces them is the `draw/*` section below: the edge invariant,
      // one wave per record, the peel monotone in time, the lobes stable, and
      // no wave drawn once it is spent. Structure rather than tone.
      await checkAsync('the swash runs and drains while the wet band stays', async () => {
        // The two-line model on the live page: over a whole cycle the edge
        // moves a long way and the high-water mark barely does.
        // A SET IS THE ONE TIME THE MARK IS MEANT TO MOVE — and a set's waves
        // arrive PRE_S seconds after it, so "the energy reads zero now" is not
        // the same statement as "no set is on this beach". Same correction as
        // the quiet-window one in the swash section, on the live page.
        const PRE_S_PAGE = await page.evaluate(async () => (await import('/scene/beach-wave.js')).PRE_S);
        let eMin = 9, eMax = -9, wMin = 9, wMax = -9, lastHot = -1e9, taken = 0, spins = 0;
        while (taken < 26 && spins++ < 400) {
          await page.evaluate(() => window.__scene.scenePump(0.35));
          const st = await page.evaluate(() => window.__scene.sceneState());
          if (st.energy > 0.03) { lastHot = st.clock; continue; }
          if (st.clock - lastHot < PRE_S_PAGE) continue;
          taken++;
          eMin = Math.min(eMin, st.edge[2]); eMax = Math.max(eMax, st.edge[2]);
          wMin = Math.min(wMin, st.wet[2]); wMax = Math.max(wMax, st.wet[2]);
        }
        assert.ok(taken >= 26, `only ${taken} windows with no set anywhere on the beach`);
        const eRange = eMax - eMin, wRange = wMax - wMin;
        assert.ok(eRange > 0.12, `the swash edge only moved ${eRange.toFixed(3)} of a frame height`);
        assert.ok(wRange < eRange / 3, `the high-water mark moved ${wRange.toFixed(3)} against the swash's ${eRange.toFixed(3)}`);
        return `edge ${eMin.toFixed(3)}..${eMax.toFixed(3)} (${eRange.toFixed(3)}), high-water ${wRange.toFixed(3)}`;
      });

      //   the swell has somewhere to go
      //       RETIRED WITH THEM. It measured the swell's DELIVERED INK against
      //       the resting water's through beach-draw.js's `__flatTone` hook —
      //       the only instrument that could say a stage was dead because the
      //       lattice had saturated. There is no lattice, no `__flatTone` and
      //       no tone target: the swell is an ink FACE band in the new drawing
      //       and its presence is structural, which `draw/every-wave-is-drawn-
      //       once-with-its-own-record` and the stage checks cover.
      await checkAsync('several waves are alive at once, at different stages', async () => {
        // THE NORMAL STATE, NOT AN EDGE CASE. Measured per column, the
        // reference carries a mean of 1.3 to 3.4 separate bright bands with
        // 33-96% of columns carrying two or more — so one wave at a time was
        // never the picture. This is the live page's own report, and it is the
        // only check here that could tell a scene with a wave OBJECT from one
        // with a fixed dip at the back of frame.
        const seen = new Set();
        let maxAlive = 0, bothAtOnce = 0, peeled = 0;
        for (let i = 0; i < 30; i++) {
          await page.evaluate(() => window.__scene.scenePump(1.3));
          const st = await page.evaluate(() => window.__scene.sceneState());
          const ws = st.waveStages || [];
          maxAlive = Math.max(maxAlive, ws.length);
          for (const w of ws) seen.add(w.stage);
          if (new Set(ws.map(w => w.stage)).size >= 2) bothAtOnce++;
          // a peel is columns disagreeing, which the per-u report can see
          for (const w of ws) if (new Set(w.at).size >= 2) peeled++;
        }
        assert.ok(maxAlive >= 3, `at most ${maxAlive} waves were ever alive at once`);
        assert.ok(seen.size >= 4, `the scene only ever showed ${seen.size} distinct stages`);
        assert.ok(bothAtOnce >= 20, `only ${bothAtOnce} of 30 samples had two stages on the beach at once`);
        assert.ok(peeled > 0, 'no wave was ever mid-peel — the break goes white all at once');
        return `up to ${maxAlive} alive, ${seen.size} stages seen, two or more at once in ${bothAtOnce}/30 samples, ${peeled} peeling observations`;
      });

      await checkAsync('the break travels shoreward instead of sitting at one station', async () => {
        // The merged scene's break was a FIXED STATION whose depth and width
        // scaled with the energy. A crest that never moves passes every tone
        // check ever written here, so this is the clause that says it must.
        const crests = [];
        for (let i = 0; i < 14; i++) {
          await page.evaluate(() => window.__scene.scenePump(1.0));
          const st = await page.evaluate(() => window.__scene.sceneState());
          for (const w of (st.waveStages || [])) crests.push([w.age, w.crest]);
        }
        assert.ok(crests.length > 12, `only ${crests.length} wave observations`);
        // every wave's crest is a rising function of its own age, and the
        // population spans a real stretch of the beach rather than one line
        const lo = Math.min(...crests.map(c => c[1])), hi = Math.max(...crests.map(c => c[1]));
        assert.ok(hi - lo > 0.20, `every crest sat between ${lo.toFixed(3)} and ${hi.toFixed(3)} of frame height`);
        return `crests observed from ${lo.toFixed(3)} to ${hi.toFixed(3)} of frame height over ${crests.length} observations`;
      });

      // ----------------------------------------------------------- drawing --
      // THE DRAWING LAYER, CHECKED AS STRUCTURE. These replace the band-mean
      // and ink-coverage comparisons retired above. None of them asks what
      // TONE anything is: they ask whether the line that is drawn is the line
      // that is published, whether one record makes one wave, whether the peel
      // runs one way in time, whether a wave's foam holds still between
      // frames, and whether a spent wave is still being drawn.
      setSection('draw');

      await checkAsync('the drawn foam edge IS the published swash edge', async () => {
        // THE ONE INVARIANT THAT MATTERS MOST, and the failure it prevents is
        // not cosmetic: a bird stands at `swashYAt(x)` and a mark is erased
        // where the water reached, so a drawn edge generated separately from
        // the published one puts birds on dry sand.
        //
        // READ BACK OFF THE CANVAS, which is the only owner that cannot lie
        // about what was drawn. The published side is the scene's own
        // `swashYAt`; the drawn side is found by walking each column of the
        // framebuffer for the swash front's own stroke. They have different
        // owners — one is the simulation, one is the rasteriser — which is
        // what makes the comparison worth making.
        const m = await page.evaluate(async () => {
          window.__scene.pause(true);
          window.__scene.scenePump(2.2); window.__scene.step();
          const c = document.querySelector('.scene-canvas');
          const g = c.getContext('2d');
          const rect = c.getBoundingClientRect();
          const dpr = c.width / rect.width;
          const d = g.getImageData(0, 0, c.width, c.height).data;
          const W = c.width, H = c.height;
          const at = (x, y) => d[(y * W + x) * 4];
          // THE FRONT IS THE BOUNDARY OF THE WET BAND, which is the one thing
          // in this drawing with `PALETTE.wet` above it and paper below: find
          // the LAST row in each column that is wet-grey, then take the centre
          // of the ink stroke that follows it. Anything else in the frame is
          // ink-on-paper or paper-on-grey and cannot be confused with it.
          // A RUN, NOT A PIXEL. Ink (22) over paper (243) antialiases THROUGH
          // the wet grey (198), so a bare "is this pixel grey" test finds a
          // single blended pixel UNDER the stroke and then looks for the
          // stroke below it and finds nothing. Measured: that found 4 columns
          // of 8. The band is tens of pixels deep, so requiring a run of six
          // separates it from any edge the rasteriser can manufacture.
          const out = [];
          for (const fx of [0.06, 0.14, 0.22, 0.3, 0.38, 0.46, 0.54, 0.62, 0.7, 0.78, 0.86, 0.94]) {
            const x = Math.round(fx * W);
            let run = 0, bandEnd = -1;
            for (let y = 1; y < H; y++) {
              const v = at(x, y);
              if (v > 180 && v < 215) { run++; if (run >= 6) bandEnd = y; }
              else run = 0;
            }
            if (bandEnd < 0) { out.push(null); continue; }
            // the stroke: the first run of ink at or below the band's floor
            let y0 = -1, y1 = -1;
            for (let y = bandEnd; y < Math.min(H, bandEnd + 16); y++) {
              if (at(x, y) < 90) { if (y0 < 0) y0 = y; y1 = y; }
              else if (y0 >= 0) break;
            }
            // A COLUMN WITH A BUBBLE ON IT IS NOT READABLE, AND THAT CARVE-OUT
            // DOES NOT EXCLUDE THE FAILURE THIS CHECK DOUBTS. Eleven bubbles
            // are drawn along the front after it, each a PAPER disc with an
            // ink outline: where one lands it punches the last rows out of the
            // grey band and leaves two one-pixel outline runs either side of
            // the stroke, so the first ink below the band is the bubble's rim
            // and reads seven pixels off. The front itself is brushed at
            // `3.8 * H / 720` CSS px, so it is never one pixel — measured, the
            // eleven readable columns of a twelve-column sweep give runs of
            // two to four pixels and the bubble column gives one. An edge
            // generated separately from the published one would put a
            // full-width stroke in the WRONG PLACE, which stays in the subject.
            out.push(y0 < 0 || (y1 - y0) < 1 ? null : { xCss: x / dpr, yCss: ((y0 + y1) / 2) / dpr });
          }
          const pub = out.map(o => o && window.__scene.sceneQuery('swashYAt', o.xCss));
          window.__scene.pause(false);
          return { out, pub, dpr };
        });
        const pairs = m.out.map((o, i) => o && ({ x: o.xCss, drawn: o.yCss, pub: m.pub[i] })).filter(Boolean);
        assert.ok(pairs.length >= 9, `only ${pairs.length} of 12 columns had a readable front`);
        let worst = 0, at = 0;
        for (const q of pairs) { const e = Math.abs(q.drawn - q.pub); if (e > worst) { worst = e; at = q.x; } }
        // THE BAR IS THE STROKE'S OWN HALF-WIDTH PLUS A PIXEL, not a number
        // picked to pass. The front is brushed at `3.8 * H / 720` CSS px wide,
        // so at 720 the centre of the laid stroke can only be located to
        // within about 1.9 px however exact the geometry is, and the
        // anti-aliased shoulders and the row quantisation add the rest. The
        // brief's own bar is "within a pixel or two".
        assert.ok(worst <= 2.5,
          `the drawn front is ${worst.toFixed(2)} CSS px from the published edge at x=${at.toFixed(0)}`);
        const mean = pairs.reduce((a2, q) => a2 + Math.abs(q.drawn - q.pub), 0) / pairs.length;
        return `${pairs.length} of 12 columns, worst ${worst.toFixed(2)} and mean ${mean.toFixed(2)} CSS px between the drawn front and swashYAt`;
      });

      await checkAsync('the drawing takes its shear from the shore', async () => {
        // THE OTHER HALF OF ONE CURVE. beach-brush.js declares its own SHEAR
        // as a fraction of HEIGHT dropped across the WIDTH; beach-shore.js
        // declares an ANGLE, and every published query goes through it. Left
        // to its own the drawing runs 5.0 degrees on a 4:3 frame and 3.8 on
        // 16:9 against the shore's 3.0, so the drawn edge and the published
        // one would diverge by seventeen pixels at the frame's edges however
        // exactly they agreed about `s`.
        //
        // MEASURED OFF THE PIXELS, AND THE FIRST CUT WAS NOT. It read
        // `state().shear` — which is `scene-beach.js`'s own restatement of the
        // shore's slope, not the number the renderer hands over — so the
        // mutant that makes the drawing keep its own SHEAR left it GREEN.
        // Session 41's mirror rule: name the owner of the MEASURED side too,
        // and check it is the artefact.
        //
        // DRAWN INTO A SCRATCH CANVAS WITH NO WAVES, through the SHIPPED
        // adapter, which is what makes the horizon readable at all. On the
        // live page a wave's ink face is over part of that boundary at every
        // moment — waves are born above the top of frame and take thirteen
        // seconds to pass it while one arrives every three to six — and the
        // best frame in thirty left nine columns of twenty-five. The adapter
        // is the thing under test and it takes its wave list as an argument,
        // so handing it none costs the claim nothing.
        const m = await page.evaluate(async () => {
          const R = await import('/scene/beach-render.js');
          const S = await import('/scene/beach-shore.js');
          const B = await import('/scene/beach-brush.js');
          const W = 900, H = 600;
          const cv = document.createElement('canvas');
          cv.width = W; cv.height = H; document.body.appendChild(cv);
          const ctx = cv.getContext('2d', { alpha: false });
          const sh = S.createShore(); sh.resize(W, H);
          R.createRenderer(ctx, sh).draw({ width: W, height: H, waves: [], waterline: S.WATERLINE_S,
            swashAt: () => 0.42, wetAt: () => 0.60, drift: 0, frontSeed: 7 });
          const d = ctx.getImageData(0, 0, W, H).data;
          const at = (x, y) => d[(y * W + x) * 4];
          // seaDeep is 62 and sea is 86: the first row in each column that
          // leaves the dark band, with a run either side so an antialiased
          // edge cannot manufacture it.
          const xs = [], ys = [];
          for (let k = 0; k <= 24; k++) {
            const x = Math.round((0.02 + 0.96 * k / 24) * (W - 1));
            const deep = (y) => at(x, y) > 55 && at(x, y) < 72;
            const mid = (y) => at(x, y) > 78 && at(x, y) < 100;
            for (let y = 6; y < H * 0.45; y++) {
              if (deep(y) && deep(y - 2) && deep(y - 4) && mid(y + 2) && mid(y + 4) && mid(y + 6)) { xs.push(x); ys.push(y); break; }
            }
          }
          cv.remove();
          const n = xs.length;
          if (n < 20) return { n, declared: sh.slope, own: B.SHEAR, w: W, h: H };
          const mx = xs.reduce((a2, b2) => a2 + b2, 0) / n, my = ys.reduce((a2, b2) => a2 + b2, 0) / n;
          let num = 0, den = 0;
          for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
          return { n, fitted: num / den, declared: sh.slope, own: B.SHEAR, w: W, h: H };
        });
        assert.ok(m.fitted !== undefined, `the horizon was readable in only ${m.n} of 25 columns`);
        // THE MODULE'S SHEAR IS A FRACTION OF *HEIGHT* DROPPED ACROSS THE
        // *WIDTH*, so the screen slope it draws is `SHEAR * H / W` — and the
        // first cut of this line had that ratio upside down. It did not change
        // the fitted value, only the BAR derived from it, and it made the bar
        // four times too generous: on the 3:2 scratch canvas the mutant draws
        // -0.0778 against the shore's -0.0524, an error of 0.0254, and the
        // inverted bar sat at 0.0307. `the-drawing-keeps-its-own-shear`
        // reported MISSED by a hair, and only the sweep said so.
        const ownSlope = m.own * m.h / m.w;
        assert.ok(Math.abs(ownSlope - m.declared) > 0.02,
          'the module\'s own SHEAR happens to draw the shore\'s slope here, so this check proves nothing');
        // THE BAR IS A QUARTER OF THE WAY BETWEEN THE TWO ANSWERS, which is
        // what makes it a measurement rather than a tolerance: the fit carries
        // the horizon's own wander (0.005 of frame height over three
        // harmonics) and cannot be exact. Measured on this frame, the clean
        // tree's error is 0.0008 against a bar of 0.0063 — eight times the
        // headroom — and the mutant's is 0.0254.
        const err = Math.abs(m.fitted - m.declared);
        assert.ok(err < Math.abs(ownSlope - m.declared) / 4,
          `the drawn horizon fits a slope of ${m.fitted.toFixed(4)}: the shore declares ${m.declared.toFixed(4)} `
          + `and the module's own SHEAR would draw ${ownSlope.toFixed(4)}`);
        return `horizon fitted at ${m.fitted.toFixed(4)} over ${m.n} columns against the shore's ${m.declared.toFixed(4)}, `
          + `where the module's own SHEAR draws ${ownSlope.toFixed(4)}`;
      });

      await checkAsync('every wave is drawn once, with its own record', async () => {
        // ONE WAVE PER RECORD. The drawing used to hold two hardcoded waves;
        // the claim now is that it holds exactly the live ones, and that each
        // one is drawn from ITS OWN record rather than from a shared spec.
        //
        // The count is compared against the SIMULATION's list less the waves
        // that have become the swash, which is a different owner from the
        // renderer's own tally.
        const m = await page.evaluate(async () => {
          window.__scene.pause(true);
          const rows = [];
          for (let i = 0; i < 12; i++) {
            window.__scene.scenePump(1.1); window.__scene.step();
            const st = window.__scene.sceneState();
            rows.push({ alive: st.waves, drawn: st.drawnWaves,
              notSwash: (st.waveStages || []).filter(w => w.stage !== 6).length,
              seeds: (st.waveStages || []).map(w => w.seed),
              heights: (st.waveStages || []).map(w => w.height) });
          }
          window.__scene.pause(false);
          return rows;
        });
        let seen = 0, multi = 0;
        for (const r of m) {
          assert.strictEqual(r.drawn, r.notSwash,
            `${r.drawn} waves drawn against ${r.notSwash} alive and not yet the swash (of ${r.alive})`);
          if (r.drawn >= 2) multi++;
          seen = Math.max(seen, r.drawn);
          const uniq = new Set(r.seeds);
          assert.strictEqual(uniq.size, r.seeds.length, 'two live waves share a seed, so they draw the same foam');
        }
        assert.ok(multi >= 8, `only ${multi} of ${m.length} samples had two or more waves drawn at once`);
        assert.ok(seen >= 3, `at most ${seen} waves were ever drawn at once`);
        return `up to ${seen} drawn at once, ${multi}/${m.length} samples with two or more, every seed distinct`;
      });

      await checkAsync('no wave is drawn once it is spent', async () => {
        // The drawing has no fade: its foam band grows with the break phase
        // and never thins, so a wave left in the list after it has arrived
        // would sit on the sand drawing a full white band. The boundary is the
        // simulation's own SWASH label — the moment the crest has crossed the
        // waterline everywhere and the swash front owns that stretch of beach.
        //
        // BOTH DIRECTIONS. A renderer that drew nothing at all would satisfy
        // "no spent wave is drawn" perfectly, so the clause that matters is
        // that an UNSPENT wave IS drawn.
        const m = await page.evaluate(async () => {
          window.__scene.pause(true);
          let spentDrawn = 0, liveDrawn = 0, samples = 0, everSpent = 0;
          for (let i = 0; i < 40; i++) {
            window.__scene.scenePump(0.7); window.__scene.step();
            const st = window.__scene.sceneState();
            const ws = st.waveStages || [];
            const spent = ws.filter(w => w.stage === 6).length;
            everSpent += spent;
            if (st.drawnWaves > ws.length - spent) spentDrawn++;
            if (st.drawnWaves === ws.length - spent && st.drawnWaves > 0) liveDrawn++;
            samples++;
          }
          window.__scene.pause(false);
          return { spentDrawn, liveDrawn, samples, everSpent };
        });
        assert.ok(m.everSpent > 0, 'no wave ever reached the swash, so the subject of this check was empty');
        assert.strictEqual(m.spentDrawn, 0, `${m.spentDrawn} of ${m.samples} frames drew a wave that had already arrived`);
        assert.ok(m.liveDrawn > m.samples * 0.7, `only ${m.liveDrawn} of ${m.samples} frames drew the waves that were live`);
        return `${m.samples} frames, ${m.everSpent} spent-wave observations, none drawn; ${m.liveDrawn} frames drew every live wave`;
      });

      await checkAsync('the peel is monotone in time and runs across the frame', async () => {
        // A PEEL IS ONE DIRECTION. The drawing reads ONE number per column —
        // how far through the break it is — and two things have to hold of it:
        // at a fixed column it only ever goes forward, and at a fixed moment
        // it differs from one end of the frame to the other, which is what
        // makes a break run along a crest rather than happen all at once.
        const m = await page.evaluate(async () => {
          window.__scene.pause(true);
          const tracks = new Map();
          for (let i = 0; i < 90; i++) {
            window.__scene.scenePump(0.22);
            for (const w of (window.__scene.sceneState().waveStages || [])) {
              if (!tracks.has(w.seed)) tracks.set(w.seed, []);
              tracks.get(w.seed).push(w.phase);
            }
          }
          window.__scene.pause(false);
          return [...tracks.values()].filter(t => t.length >= 6).map(t => ({
            n: t.length,
            back: t.some((p, i) => i && p.some((v, k) => v < t[i - 1][k] - 1e-12)),
            spread: Math.max(...t.map(p => Math.max(...p) - Math.min(...p))),
            span: Math.max(...t.map(p => Math.max(...p))) - Math.min(...t.map(p => Math.min(...p))),
          }));
        });
        assert.ok(m.length >= 4, `only ${m.length} waves were tracked for long enough`);
        const backwards = m.filter(t => t.back);
        assert.strictEqual(backwards.length, 0, `${backwards.length} of ${m.length} waves ran their break backwards at some column`);
        const peeled = m.filter(t => t.spread > 0.02);
        assert.ok(peeled.length >= m.length * 0.75,
          `only ${peeled.length} of ${m.length} waves ever had two ends of the frame at different break phases`);
        const worst = Math.max(...m.map(t => t.spread));
        return `${m.length} waves tracked, none ran backwards, ${peeled.length} peeled across the frame (widest spread ${worst.toFixed(3)})`;
      });

      await checkAsync('a wave\'s foam holds still between frames', async () => {
        // "Do not regenerate lobes per frame — the foam will boil." The
        // scallops on a wave's own band, and its bubbles, are drawn ONCE at
        // birth off the wave's own stream and stored on its record. Left on
        // the frame's stream they would move every frame, because the bubble
        // loop and the brush's pass cuts each take a VARIABLE number of draws
        // and shift everything after them.
        //
        // READ AS A CHECKSUM OF THE STORED PARAMETERS rather than as pixels:
        // the picture legitimately changes every frame (the wave moves), so a
        // pixel comparison cannot separate boiling foam from a travelling one.
        const m = await page.evaluate(async () => {
          window.__scene.pause(true);
          const seen = new Map(); let moved = 0, checked = 0;
          for (let i = 0; i < 60; i++) {
            window.__scene.scenePump(0.12); window.__scene.step();
            for (const w of (window.__scene.sceneState().waveStages || [])) {
              if (seen.has(w.seed)) {
                checked++;
                const p = seen.get(w.seed);
                if (p.lobes !== w.lobes || Math.abs(p.lobeSum - w.lobeSum) > 0) moved++;
              } else seen.set(w.seed, { lobes: w.lobes, lobeSum: w.lobeSum });
            }
          }
          window.__scene.pause(false);
          return { waves: seen.size, checked, moved };
        });
        assert.ok(m.checked > 200, `only ${m.checked} frame-to-frame comparisons`);
        assert.ok(m.waves >= 4, `only ${m.waves} distinct waves were seen`);
        assert.strictEqual(m.moved, 0, `${m.moved} of ${m.checked} observations found a wave's lobes had been re-drawn`);

        // AND THE CLAUSE THAT READS THE ARTEFACT RATHER THAN THE RECORD. The
        // one above asks the RECORD whether its stored parameters moved, and a
        // renderer that ignored them and generated its own per frame would
        // leave the record untouched and pass it — session 41's mirror rule,
        // in the family it keeps happening to. So the second clause is about
        // the marks: A WAVE'S OP BLOCK MUST NOT DEPEND ON WHAT WAS DRAWN
        // BEFORE IT. Drawn off the frame's shared stream the lobes and the
        // bubbles move whenever an earlier wave's gate changes how many draws
        // it takes, which is the whole of how foam boils.
        const q = await page.evaluate(async () => {
          const V = await import('/scene/beach-wave.js');
          const R = await import('/scene/beach-render.js');
          const S = await import('/scene/beach-shore.js');
          let k = 0;
          const seq = [0.31, 0.77, 0.12, 0.58, 0.93, 0.40, 0.66, 0.05, 0.84, 0.23, 0.51, 0.71];
          const rand = { unit: () => seq[k++ % seq.length], range: (a, b) => a + (b - a) * seq[k++ % seq.length],
                         int: (a, b) => a + Math.floor((b - a + 1) * seq[k++ % seq.length]) };
          const first = V.makeWave({ rand, energy: 0.6 });
          const second = V.makeWave({ rand, energy: 0.6 });
          second.crest0 += 0.12; second.age = second.breakAge + 1.1;
          const sh = S.createShore(); sh.resize(900, 600);
          const run = (list) => {
            const ops = []; const noop = () => {};
            const push = (t) => (...v) => ops.push(t + ':' + v.map(n => (typeof n === 'number' ? n.toFixed(4) : n)).join(','));
            const rec = new Proxy({ moveTo: push('M'), lineTo: push('L'), ellipse: push('E'), arc: push('A'),
              fill: () => ops.push('F'), stroke: () => ops.push('S'), fillRect: push('R'),
              beginPath: noop, closePath: noop, save: noop, restore: noop, setTransform: noop,
            }, { get: (t, kk) => (kk in t ? t[kk] : noop), set: (t, kk, v) => { t[kk] = v; return true; } });
            R.createRenderer(rec, sh).draw({ width: 900, height: 600, waves: list, waterline: S.WATERLINE_S,
              swashAt: () => 0.42, wetAt: () => 0.60, drift: 0, frontSeed: 7 });
            return ops;
          };
          // the SECOND wave's block, with the first wave at two different ages
          const empty = run([]).length;
          const blockOf = (age) => {
            first.age = age;
            const one = run([first]).length;
            const two = run([first, second]);
            const na = one - empty;
            let k0 = 0; const P = run([]);
            while (k0 < P.length && P[k0] === two[k0]) k0++;
            return { block: two.slice(k0 + na, k0 + na + (run([second]).length - empty)), na };
          };
          const A = blockOf(first.breakAge + 0.4);
          const B = blockOf(first.breakAge + 1.9);
          return { same: A.block.length === B.block.length && A.block.every((v, i) => v === B.block[i]),
                   n: A.block.length, gateMoved: A.na !== B.na, na: [A.na, B.na] };
        });
        assert.ok(q.n > 300, `the second wave's block is only ${q.n} ops`);
        assert.ok(q.gateMoved, `the wave in front of it drew the same ${q.na[0]} ops at both ages, so nothing upstream moved`);
        assert.ok(q.same, 'a wave\'s own marks changed when the wave drawn before it did — its foam is coming off the shared stream');
        return `${m.waves} waves over ${m.checked} comparisons, 0 re-drawn; and a wave's ${q.n}-op block is unmoved `
          + `by the wave in front of it going from ${q.na[0]} to ${q.na[1]} ops`;
      });

      await checkAsync('the nearer wave is painted last', async () => {
        // THE ORDER THE DRAWING HONOURS, which `wave/a-nearer-wave-covers-the-
        // one-behind-it` cannot see — that one checks `sortWaves`, and a
        // renderer that ignored the order it was handed would pass it. Driven
        // through a RECORDING CONTEXT, so the claim is about the ops that were
        // issued rather than about anything measured afterwards: the same
        // trick scene 1 uses to say a pad is drawn over a fish.
        //
        // AND IT IS AN EXACT CLAIM ABOUT THE STREAM, not a comparison of where
        // marks landed. The first cut attributed ops to a wave by how near
        // their y was to that wave's crest, and a wave's own foam band reaches
        // 0.12 of frame height past its crest — so the seaward wave's marks
        // landed inside the shoreward wave's window and it failed on a clean
        // tree. A wired wave draws NOTHING off the frame's shared stream (its
        // lobes, its bubbles and every brush pass come from its own seed), so
        // its op block is identical whoever it is drawn beside: the stream for
        // [back, front] must be the background, then back's block verbatim,
        // then front's, then the shore.
        const m = await page.evaluate(async () => {
          const V = await import('/scene/beach-wave.js');
          const R = await import('/scene/beach-render.js');
          const S = await import('/scene/beach-shore.js');
          let k = 0;
          const seq = [0.31, 0.77, 0.12, 0.58, 0.93, 0.40, 0.66, 0.05, 0.84, 0.23, 0.51, 0.71];
          const rand = { unit: () => seq[k++ % seq.length], range: (a, b) => a + (b - a) * seq[k++ % seq.length],
                         int: (a, b) => a + Math.floor((b - a + 1) * seq[k++ % seq.length]) };
          const back = V.makeWave({ rand, energy: 0.6 });
          const front = V.makeWave({ rand, energy: 0.6 });
          back.age = back.breakAge + 1.2; front.age = front.breakAge + 1.2;
          front.crest0 += 0.12;
          const sh = S.createShore(); sh.resize(900, 600);
          const run = (list) => {
            const ops = [];
            const noop = () => {};
            const push = (t) => (...v) => ops.push(t + ':' + v.map(n => (typeof n === 'number' ? n.toFixed(3) : n)).join(','));
            const rec = new Proxy({
              moveTo: push('M'), lineTo: push('L'), ellipse: push('E'), arc: push('A'),
              fill: () => ops.push('F:' + rec.fillStyle), stroke: () => ops.push('S:' + rec.strokeStyle),
              fillRect: push('R'), beginPath: noop, closePath: noop, save: noop, restore: noop, setTransform: noop,
            }, { get: (t, kk) => (kk in t ? t[kk] : noop), set: (t, kk, v) => { t[kk] = v; return true; } });
            const r = R.createRenderer(rec, sh);
            r.draw({ width: 900, height: 600, waves: list, waterline: S.WATERLINE_S,
                     swashAt: () => 0.42, wetAt: () => 0.60, drift: 0, frontSeed: 7 });
            return { ops, drawn: r.waves };
          };
          const P = run([]), A = run([back]), B = run([front]), AB = run([back, front]), BA = run([front, back]);
          // where the wave block starts: the first op the empty frame and the
          // one-wave frame disagree about
          let k0 = 0;
          while (k0 < P.ops.length && P.ops[k0] === A.ops[k0]) k0++;
          const na = A.ops.length - P.ops.length, nb = B.ops.length - P.ops.length;
          const eq = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
          return {
            drawn: [P.drawn, A.drawn, B.drawn, AB.drawn, BA.drawn],
            k0, na, nb, total: AB.ops.length - P.ops.length,
            prefixOk: eq(AB.ops.slice(0, k0), P.ops.slice(0, k0)),
            backFirst: eq(AB.ops.slice(k0, k0 + na), A.ops.slice(k0, k0 + na)),
            frontSecond: eq(AB.ops.slice(k0 + na, k0 + na + nb), B.ops.slice(k0, k0 + nb)),
            reversedIsDifferent: !eq(AB.ops, BA.ops),
            reversedFrontFirst: eq(BA.ops.slice(k0, k0 + nb), B.ops.slice(k0, k0 + nb)),
            // AND THE TWO BLOCKS DIFFER, which is what stops every clause
            // above being satisfied by a renderer that drew ONE record twice.
            blocksDiffer: !eq(A.ops.slice(k0, k0 + na), B.ops.slice(k0, k0 + nb)),
            crests: [V.crestAt(back, 0.5), V.crestAt(front, 0.5)],
          };
        });
        assert.deepStrictEqual(m.drawn, [0, 1, 1, 2, 2], `the renderer drew ${JSON.stringify(m.drawn)} waves`);
        assert.ok(m.crests[0] < m.crests[1], 'the fixture did not put one wave nearer the shore than the other');
        assert.ok(m.na > 400 && m.nb > 400, `a wave's block is only ${m.na}/${m.nb} ops — this fixture draws almost nothing`);
        assert.ok(m.prefixOk, 'the background ops moved when waves were added, so the block boundary is not where it is taken to be');
        assert.ok(m.backFirst, 'the seaward wave\'s ops are not the first block in the frame');
        assert.ok(m.frontSecond, 'the shoreward wave\'s ops are not the second block in the frame');
        assert.ok(m.reversedIsDifferent, 'reversing the list changed nothing, so the order reaches no mark');
        assert.ok(m.blocksDiffer, 'the two waves drew the same marks, so every clause here would hold for one record drawn twice');
        assert.ok(m.reversedFrontFirst, 'reversed, the shoreward wave is still not drawn first — the renderer is sorting behind the caller\'s back');
        return `${m.na} + ${m.nb} ops, seaward block first and verbatim, and reversing the list swaps them`;
      });

      setSection('scene3');

      await checkAsync('scrolling raises set energy and it ebbs on its own', async () => {
        const before = await page.evaluate(() => window.__scene.sceneState().scrolled);
        await page.mouse.move(640, 400);
        const dpr = await page.evaluate(() => window.devicePixelRatio);
        // A synthetic wheel arrives divided by the device scale factor, so what
        // is SENT is scaled and what ARRIVED is what gets asserted.
        for (let i = 0; i < 3; i++) await page.mouse.wheel(0, 120 * dpr);
        const after = await page.evaluate(() => window.__scene.sceneState().scrolled);
        assert.ok(after > before + 0.5, `three actions took the energy from ${before.toFixed(2)} to ${after.toFixed(2)}`);
        await page.evaluate(() => window.__scene.scenePump(12));
        const ebbed = await page.evaluate(() => window.__scene.sceneState().scrolled);
        assert.strictEqual(ebbed, 0, `the scrolled energy is ${ebbed} after its window`);
        return `${before.toFixed(2)} -> ${after.toFixed(2)} -> 0`;
      });

      await checkAsync('a click on the beach does nothing at all', async () => {
        // "No click or drag interaction of any kind. Do not scaffold for them
        // speculatively." So the claim is that the scene exposes no handler AND
        // that clicking changes nothing it reports.
        const hasHandler = await page.evaluate(() =>
          typeof window.__scene.sceneQuery('pointer', 0) !== 'number' &&
          (window.__scene.sceneApi() !== null));
        void hasHandler;
        await page.evaluate(() => window.__scene.pause(true));
        const before = await page.evaluate(() => JSON.stringify(window.__scene.sceneState()));
        await page.mouse.click(500, 300);
        await page.mouse.click(900, 550);
        const after = await page.evaluate(() => JSON.stringify(window.__scene.sceneState()));
        await page.evaluate(() => window.__scene.pause(false));
        assert.strictEqual(after, before, 'a click moved something');
        const src = fs.readFileSync(path.join(SCENE, 'scene-beach.js'), 'utf8');
        assert.ok(!/\bpointer\s*\(/.test(src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')),
          'the scene declares a pointer handler');
        return 'no pointer handler, and two clicks moved nothing';
      });

      await checkAsync('the frame is affordable', async () => {
        const cost = await page.evaluate(async () => {
          const f0 = window.__scene.frames, t0 = performance.now();
          await new Promise(r => setTimeout(r, 2500));
          return { fps: (window.__scene.frames - f0) / ((performance.now() - t0) / 1000) };
        });
        const st = await page.evaluate(() => window.__scene.sceneState());
        // Headless software GL, so a floor rather than a target: what it catches
        // is a frame that has become pathological.
        assert.ok(cost.fps > 12, `${cost.fps.toFixed(1)} fps with ${st.drawnWaves} waves drawn`);
        return `${cost.fps.toFixed(1)} fps on software GL, ${st.waves} waves alive and ${st.drawnWaves} drawn`;
      });

      await checkAsync('swapping back to the koi leaves nothing behind', async () => {
        await page.evaluate(() => window.__scene.activate(1));
        await page.waitForFunction(() => window.__scene.activeId === 1, null, { timeout: 8000 });
        const st = await page.evaluate(() => ({
          id: window.__scene.activeId, canvases: window.__scene.canvasCount,
          children: window.__scene.stageChildren, running: window.__scene.running,
          api: window.__scene.sceneApi(),
        }));
        assert.strictEqual(st.id, 1);
        assert.strictEqual(st.canvases, 1, `${st.canvases} canvases after the swap`);
        assert.strictEqual(st.children, 1, `${st.children} things on the stage after the swap`);
        assert.strictEqual(st.running, true);
        // The beach's interface went with it; the koi publish none of it.
        assert.deepStrictEqual(st.api, { swashYAt: 'undefined', highWaterYAt: 'undefined', overruns: 'undefined' },
          `scene 1 reports ${JSON.stringify(st.api)}`);
        return 'back on scene 1, one canvas, the beach\'s interface gone with it';
      });

      await checkAsync('the beach reports no errors', async () => {
        assert.deepStrictEqual(errors, [], errors.join(' | '));
        return 'clean console';
      });
    } finally {
      await ctx.close();
      server.close();
    }
  }

  // ------------------------------------------- pass A2: reduced motion -----
  {
    const { server } = await serveRepo({ mutant, withProbe: false });
    const base = `http://127.0.0.1:${server.address().port}`;
    const peakFlash = async (reduced) => {
      const { page, ctx } = await openPage(browser, base, { reducedMotion: reduced ? 'reduce' : 'no-preference' });
      try {
        for (let i = 0; i < 5; i++) { await page.mouse.click(500, 400); await page.waitForTimeout(70); }
        await waitSceneSeconds(page, 2.2);
        const flagged = await page.evaluate(() => window.__scene.reducedMotion);
        for (let i = 0; i < 5; i++) { await page.mouse.click(500, 400); await page.waitForTimeout(70); }
        let peak = 0;
        for (let i = 0; i < 14; i++) {
          const s = await page.evaluate(CANVAS_STATS);
          peak = Math.max(peak, s.mean);
          await page.waitForTimeout(40);
        }
        return { peak, flagged };
      } finally { await ctx.close(); }
    };
    try {
      setSection('reduced-motion');
      await checkAsync('the flash is damped when motion is not wanted', async () => {
        const on = await peakFlash(true), off = await peakFlash(false);
        assert.strictEqual(on.flagged, true, 'the page did not notice the preference');
        assert.strictEqual(off.flagged, false, 'the page reported the preference when it was not set');
        if (!(on.peak < off.peak * 0.75)) {
          throw new Error(`peak frame brightness ${on.peak.toFixed(1)} reduced against ${off.peak.toFixed(1)} normal`);
        }
        return `peak ${off.peak.toFixed(1)} normally, ${on.peak.toFixed(1)} damped`;
      });
    } finally { server.close(); }
  }

  // ----------------------------------------------- pass B: the swap --------
  {
    const { server, state } = await serveRepo({ mutant, withProbe: true });
    const base = `http://127.0.0.1:${server.address().port}`;
    const { page, ctx, errors } = await openPage(browser, base);
    try {
      setSection('swap');
      await checkAsync('a second built scene lights up the nav and the random button', async () => {
        const nav = await page.evaluate(() => {
          const b = [...document.querySelectorAll('#scene-nav-scenes [data-scene]')];
          return { two: b.find(x => x.dataset.scene === '2').disabled,
                   rnd: b.find(x => x.dataset.scene === 'random').disabled };
        });
        assert.strictEqual(nav.two, false, 'the built second scene is still disabled');
        assert.strictEqual(nav.rnd, false, 'the random button is disabled with two scenes to choose from');
        return 'scene 2 enabled, ? enabled';
      });

      await checkAsync('switching scenes leaves exactly one canvas on the stage', async () => {
        await page.click('[data-scene="2"]');
        await page.waitForFunction(() => window.__scene.activeId === 2, null, { timeout: 5000 });
        await page.waitForTimeout(300);
        const st = await page.evaluate(() => ({
          id: window.__scene.activeId, canvases: window.__scene.canvasCount,
          children: window.__scene.stageChildren, built: window.__probe.built,
          frames: window.__probe.frames, running: window.__scene.running,
        }));
        assert.strictEqual(st.id, 2);
        assert.strictEqual(st.canvases, 1, `${st.canvases} canvases after the swap`);
        assert.strictEqual(st.children, 1, `${st.children} elements on the stage after the swap`);
        assert.strictEqual(st.built, 1, 'the probe was constructed more than once');
        if (!(st.frames > 3)) throw new Error(`the probe got ${st.frames} frames`);
        return `scene 2 mounted, one canvas, ${st.frames} frames`;
      });

      await checkAsync('the scene that left is disposed and stops being drawn', async () => {
        await page.click('[data-scene="1"]');
        await page.waitForFunction(() => window.__scene.activeId === 1, null, { timeout: 5000 });
        await page.waitForTimeout(120);
        const at = await page.evaluate(() => ({ disposed: window.__probe.disposed, frames: window.__probe.frames }));
        assert.strictEqual(at.disposed, true, 'dispose() was never called on the outgoing scene');
        await page.waitForTimeout(900);
        const after = await page.evaluate(() => ({ frames: window.__probe.frames,
          canvases: window.__scene.canvasCount, children: window.__scene.stageChildren,
          shellFrames: window.__scene.frames }));
        assert.strictEqual(after.frames, at.frames,
          `the disposed scene drew ${after.frames - at.frames} more frames — its loop leaked`);
        assert.strictEqual(after.canvases, 1, `${after.canvases} canvases`);
        assert.strictEqual(after.children, 1, `${after.children} elements on the stage`);
        return `disposed, frozen at ${at.frames} frames while the shell kept running`;
      });

      await checkAsync('the last scene asked for is the one that mounts', async () => {
        // Scene 2's module is served slowly. Ask for it, change your mind, and
        // the slow one must not arrive over the top a second later.
        state.probeDelayMs = 900;
        const builtBefore = await page.evaluate(() => window.__probe.built);
        await page.evaluate(() => { window.__scene.activate(2); window.__scene.activate(1); });
        await page.waitForTimeout(1800);
        const st = await page.evaluate(() => ({ id: window.__scene.activeId, built: window.__probe.built,
          canvases: window.__scene.canvasCount }));
        state.probeDelayMs = 0;
        assert.strictEqual(st.id, 1, `the stale load mounted scene ${st.id}`);
        assert.strictEqual(st.built, builtBefore, 'the abandoned scene was constructed anyway');
        assert.strictEqual(st.canvases, 1);
        return 'the abandoned load was dropped';
      });

      await checkAsync('the keyboard picks a scene too', async () => {
        await page.keyboard.press('2');
        await page.waitForFunction(() => window.__scene.activeId === 2, null, { timeout: 5000 });
        await page.keyboard.press('1');
        await page.waitForFunction(() => window.__scene.activeId === 1, null, { timeout: 5000 });
        return 'digits 1-8 select';
      });

      await checkAsync('the random button never picks the scene that is showing', async () => {
        for (let i = 0; i < 6; i++) {
          const from = await page.evaluate(() => window.__scene.activeId);
          await page.click('[data-scene="random"]');
          await page.waitForFunction((f) => window.__scene.activeId !== f, from, { timeout: 5000 });
          const to = await page.evaluate(() => window.__scene.activeId);
          if (to === from) throw new Error(`random went ${from} -> ${to}`);
        }
        return 'six picks, every one a different scene';
      });

      await checkAsync('the swap pass reports no errors', async () => {
        assert.deepStrictEqual(errors, [], errors.join(' | '));
        return 'clean console';
      });
    } finally {
      await ctx.close();
      server.close();
    }
  }

  // -------------------------------------------- pass C: the planes ---------
  // MULTIPLANE IS A SHELL CAPABILITY WITH NO SHIPPED CALLER, which is exactly
  // why it is gated here: scene 1 uses one canvas, so every other check in this
  // file stays green on a shell that cannot layer at all. Both halves of the
  // contract were broken when they were first measured — the planes stacked a
  // full viewport apart, and the front one was opaque black where nothing had
  // been drawn — and neither is visible in anything scene 1 does.
  {
    const { server, state: layerState } = await serveRepo({ mutant, withProbe: false, withLayers: true });
    const base = `http://127.0.0.1:${server.address().port}`;
    const { page, ctx, errors } = await openPage(browser, base);
    try {
      setSection('layers');

      // Scene 1 first, on this same page, because the claim that layering was
      // added WITHOUT moving the one-canvas case is the other half of it.
      await checkAsync('a one-canvas scene is still a single opaque plane', async () => {
        await page.waitForFunction(() => window.__scene.activeId === 1, null, { timeout: 5000 });
        const st = await page.evaluate(() => {
          const c = document.querySelector('.scene-canvas');
          return { canvases: window.__scene.canvasCount,
                   children: window.__scene.stageChildren,
                   alpha: c.getContext('2d').getContextAttributes().alpha,
                   scrollH: document.getElementById('scene-stage').scrollHeight,
                   h: window.__scene.viewport.h };
        });
        assert.strictEqual(st.canvases, 1, `${st.canvases} canvases`);
        assert.strictEqual(st.children, 1, `${st.children} stage children`);
        // An opaque backmost plane is the cheap path and is what scene 1 has
        // always had; a default that flipped every plane to alpha would be
        // invisible on screen and is what this clause exists to catch.
        assert.strictEqual(st.alpha, false, 'scene 1\'s only canvas stopped being opaque');
        assert.strictEqual(st.scrollH, st.h, 'the stage scrolls with one canvas on it');
        return 'one canvas, opaque, stage does not scroll';
      });

      await checkAsync('two planes occupy the same rect rather than stacking', async () => {
        await page.click(`[data-scene="${layerState.layerSlot}"]`);
        await page.waitForFunction((id) => window.__scene.activeId === id, layerState.layerSlot, { timeout: 5000 });
        await page.waitForTimeout(200);
        const st = await page.evaluate(() => {
          const cs = [...document.querySelectorAll('.scene-canvas')];
          const r = cs.map(c => { const b = c.getBoundingClientRect();
            return { x: Math.round(b.x), y: Math.round(b.y),
                     w: Math.round(b.width), h: Math.round(b.height) }; });
          return { n: cs.length, rects: r,
                   scrollH: document.getElementById('scene-stage').scrollHeight,
                   h: window.__scene.viewport.h };
        });
        assert.strictEqual(st.n, 2, `${st.n} canvases for a two-plane scene`);
        assert.deepStrictEqual(st.rects[1], st.rects[0],
          `the planes are at different rects: ${JSON.stringify(st.rects)}`);
        // The measured symptom of the original defect: the stage grew to twice
        // the viewport and the front plane sat entirely below the fold.
        assert.strictEqual(st.scrollH, st.h,
          `the stage scrolls to ${st.scrollH} against a ${st.h} viewport`);
        return `both planes at ${JSON.stringify(st.rects[0])}, stage does not scroll`;
      });

      await checkAsync('only the backmost plane is opaque', async () => {
        const alpha = await page.evaluate(() => [...document.querySelectorAll('.scene-canvas')]
          .map(c => c.getContext('2d').getContextAttributes().alpha));
        assert.deepStrictEqual(alpha, [false, true],
          `context alpha flags are ${JSON.stringify(alpha)}, want [false, true]`);
        return 'back plane opaque, front plane transparent';
      });

      await checkAsync('the back plane reaches the screen through the front one', async () => {
        // THE RASTERISED COMPOSITE IS THE ONLY INSTRUMENT FOR THIS. Reading each
        // canvas with getImageData says what that plane HOLDS; it cannot say
        // what survived compositing, which is the whole question.
        const vp = page.viewportSize();
        const png = await page.screenshot({ clip: { x: 0, y: 0, width: vp.width, height: vp.height } });
        const px = await page.evaluate(async (b64) => {
          const img = new Image();
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej;
            img.src = 'data:image/png;base64,' + b64; });
          const c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          const g = c.getContext('2d'); g.drawImage(img, 0, 0);
          // The screenshot is in device pixels; the square is declared in CSS.
          const s = img.width / window.innerWidth;
          const at = (cx, cy) => { const d = g.getImageData(Math.round(cx * s), Math.round(cy * s), 1, 1).data;
            return [d[0], d[1], d[2]]; };
          const q = window.__layers.square;
          return { onSquare: at(q.x + q.w / 2, q.y + q.h / 2), offSquare: at(q.x + q.w + 120, q.y + q.h / 2) };
        }, png.toString('base64'));
        assert.deepStrictEqual(px.offSquare, [255, 0, 0],
          `the back plane does not reach the screen: ${JSON.stringify(px.offSquare)}`);
        assert.deepStrictEqual(px.onSquare, [0, 0, 255],
          `the front plane is not on top: ${JSON.stringify(px.onSquare)}`);
        return 'back plane red where the front drew nothing, front plane blue where it did';
      });

      await checkAsync('the plane pass reports no errors', async () => {
        assert.deepStrictEqual(errors, [], errors.join(' | '));
        return 'clean console';
      });
    } finally {
      await ctx.close();
      server.close();
    }
  }
}

// ============================================================== runner ======

function report(label) {
  const failed = results.filter(r => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? '  ok  ' : '  FAIL'} ${r.name}${r.detail ? `  —  ${r.detail}` : ''}`);
  }
  console.log(`\n${label}: ${results.length - failed.length}/${results.length} checks passed`
    + (failed.length ? `, ${failed.length} FAILED` : ''));
  return failed;
}

async function runAll(browser, mutant, shotsDir) {
  results.length = 0;
  await partOne(mutant);
  if (browser) await partTwo(browser, mutant, shotsDir);
  return results.map(r => ({ ...r }));
}

async function main() {
  const argv = process.argv.slice(2);
  const negative = argv.includes('--negative-control');
  const only = (argv.find(a => a.startsWith('--mutant=')) || '').split('=')[1];
  const shotsAt = argv.indexOf('--shots');
  const shotsDir = shotsAt >= 0 ? path.resolve(argv[shotsAt + 1]) : null;
  const skipBrowser = argv.includes('--no-browser');

  sweepMutantFiles();
  const { chromium } = skipBrowser ? { chromium: null } : loadPlaywright();
  const browser = chromium ? await chromium.launch() : null;

  let exit = 0;
  try {
    // --- the base pass ---------------------------------------------------
    const base = await runAll(browser, null, shotsDir);
    const baseFailed = report('BASE');
    if (baseFailed.length) exit = 1;

    if (negative) {
      // THE STALE-NAME GUARD, run for EVERY mutant before any of them runs. A
      // check that was renamed leaves a `breaks` entry naming nothing the gate
      // runs, and the sweep then reports MISSED (stayed green) — which looks
      // exactly like a mutation the gate is genuinely blind to. /plot lost a
      // twenty-minute chunk to that one; it costs a millisecond to refuse it.
      const known = new Set(base.map(r => r.name));
      // Only sections that actually RAN can be judged. Under --no-browser the
      // part-two names are absent because nothing ran them, not because they
      // are stale, and flagging those would make the two flags mean the same
      // thing — which is the confusion this guard exists to remove.
      const ranSections = new Set(base.map(r => r.name.split('/')[0]));
      const stale = [];
      for (const m of MUTANTS) {
        for (const n of [...(m.breaks || []), ...(m.mayAlso || [])]) {
          if (ranSections.has(n.split('/')[0]) && !known.has(n)) stale.push(`${m.id} names "${n}"`);
        }
      }
      if (stale.length) {
        console.error(`\nNEGATIVE CONTROL REFUSED — these name no check this gate runs:\n  ${stale.join('\n  ')}`);
        exit = 1;
      } else if (baseFailed.length) {
        console.error('\nNEGATIVE CONTROL SKIPPED — the base pass is not clean, so nothing it says would mean anything.');
      } else {
        // And the anchors, likewise for every mutant before any of them runs:
        // a refactor moves a `from` and disarms a mutant silently.
        const disarmed = [];
        for (const m of MUTANTS) {
          try { applyMutant(m); } catch (e) { disarmed.push(e.message); }
        }
        if (disarmed.length) {
          console.error(`\nNEGATIVE CONTROL REFUSED — disarmed mutants:\n  ${disarmed.join('\n  ')}`);
          exit = 1;
        } else {
          const pick = only ? new Set(only.split(',').map(s => s.trim())) : null;
          const list = MUTANTS.filter(m => !pick || pick.has(m.id));
          if (pick) {
            const unknown = [...pick].filter(id => !MUTANTS.some(m => m.id === id));
            if (unknown.length) { console.error(`unknown mutant(s): ${unknown.join(', ')}`); exit = 1; }
          }
          console.log(`\n${'='.repeat(74)}\nNEGATIVE CONTROL — ${list.length} mutation(s)\n${'='.repeat(74)}`);
          let bad = 0;
          const ran = new Set(base.map(r => r.name.split('/')[0]));
          for (const m of list) {
            const claimable = (m.breaks || []).filter(n => ran.has(n.split('/')[0]));
            if (!claimable.length) {
              console.log(`\nSKIP ${m.id}\n     every check it claims is in a section this invocation did not run`);
              continue;
            }
            const res = await runAll(browser, m, null);
            const red = new Set(res.filter(r => !r.ok).map(r => r.name));
            const missed = claimable.filter(n => !red.has(n));
            const allowed = new Set([...(m.breaks || []), ...(m.mayAlso || [])]);
            const unclaimed = [...red].filter(n => !allowed.has(n));
            const ok = !missed.length && !unclaimed.length;
            if (!ok) bad++;
            console.log(`\n${ok ? 'OK  ' : 'BAD '} ${m.id}`);
            console.log(`     ${m.why}`);
            console.log(`     reddened ${red.size} check(s); claimed ${claimable.length}`
              + ((m.mayAlso || []).length ? `, collateral allowed ${(m.mayAlso).filter(n => red.has(n)).length}/${m.mayAlso.length}` : ''));
            if (missed.length) console.log(`     MISSED (stayed green): ${missed.join(', ')}`);
            if (unclaimed.length) console.log(`     UNCLAIMED (went red, not named): ${unclaimed.join(', ')}`);
            sweepMutantFiles();
          }
          console.log(`\n${'='.repeat(74)}\nNEGATIVE CONTROL: ${list.length - bad}/${list.length} mutants behave`);
          if (bad) exit = 1;
        }
      }
    }
  } finally {
    if (browser) await browser.close();
    sweepMutantFiles();
  }
  process.exit(exit);
}

main().catch(err => {
  sweepMutantFiles();
  console.error(err);
  process.exit(2);
});
