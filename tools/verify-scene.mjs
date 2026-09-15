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
    id: 'the-notch-is-sampled-at-the-rims-own-spacing',
    file: 'scene/koi-pads.js',
    from: '  for (let i = 0; i <= NOTCH_PTS; i++) {\n    angles.push(notch - NOTCH_HALF + (i / NOTCH_PTS) * 2 * NOTCH_HALF);\n  }',
    to: '',
    breaks: ['pads/a-pad-is-a-lumpy-near-circle-with-one-slit-in-it'],
    why: 'a narrow angular window sampled at the rim spacing is a jagged bite rather than a stem slit',
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
  };
}

// =========================================================== PART ONE =======
// The shipped modules, in Node, against numbers taken from the brief.

async function partOne(mutant) {
  const M = await loadScene(mutant);
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

  check('a pad is a lumpy near-circle with one slit in it', () => {
    // The SILHOUETTE, off the shipped outline rather than off a picture. Two
    // claims that a wrong shape breaks in different ways: the rim is
    // near-circular but not a compass circle, and exactly one stretch of it
    // dives toward the centre — the stem notch.
    //
    // THE ROUNDNESS IS MEASURED ON THE TOP 70% OF THE RADII, AND THE FIRST CUT
    // OF THIS CHECK WAS WRONG ABOUT WHICH SAMPLES ARE RIM. It took everything
    // above 55% of R as rim — but the notch's ramp is CONTINUOUS from its apex
    // out to the rim, so its own flank lands samples at every value in between
    // and several of them cleared the bar. The check read the notch's depth as
    // the rim's variation (55% of a radius) and went red on a shape that is
    // fine. There is no threshold that separates a continuous ramp from the rim
    // it runs into; a RANK does, because the notch is a bounded fraction of the
    // ring however deep it cuts. The clause below it is what covers a rim
    // mangled inside the discarded 30%.
    const f = padField(4242);
    let worstRound = 0, leastVary = Infinity;
    const bad = [];
    for (const pad of f.pads) {
      const rs = pad.outline.map(p => Math.hypot(p.x, p.y) / pad.R);
      const rim = rs.slice().sort((a, b) => b - a).slice(0, Math.floor(rs.length * 0.70));
      const lo = rim[rim.length - 1], hi = rim[0];
      worstRound = Math.max(worstRound, hi - lo);
      leastVary = Math.min(leastVary, hi - lo);
      // Exactly one notch: walk the ring and count the runs that dive under half
      // the radius. A pad with two has been sampled or wrapped wrong (which is
      // what a naive sort of a notch straddling angle zero produces); one with
      // none has no stem.
      let runs = 0;
      for (let i = 0; i < rs.length; i++) {
        const prev = rs[(i - 1 + rs.length) % rs.length];
        if (rs[i] < 0.5 && prev >= 0.5) runs++;
      }
      if (runs !== 1) bad.push(`${runs} notches`);
      if (Math.min(...rs) > 0.4) bad.push('the notch does not reach in');
    }
    if (bad.length) throw new Error(`${bad.length} of ${f.pads.length} pads: ${[...new Set(bad)].join(', ')}`);
    if (!(worstRound < 0.35)) throw new Error(`a rim varies by ${(worstRound * 100).toFixed(0)}% of its radius — that is not a pad`);
    if (!(leastVary > 0.01)) throw new Error('a rim is a compass circle');
    return `${f.pads.length} pads, one notch each, rims vary ${(leastVary * 100).toFixed(1)}-${(worstRound * 100).toFixed(0)}% of radius`;
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

  // --------------------------------------------------------------- registry
  setSection('registry');
  check('there are eight slots and one is built', () => {
    assert.strictEqual(M.registry.SCENES.length, M.registry.MAX_SCENES);
    assert.strictEqual(M.registry.MAX_SCENES, 8);
    M.registry.SCENES.forEach((s, i) => assert.strictEqual(s.id, i + 1));
    const built = M.registry.builtScenes();
    assert.strictEqual(built.length, 1, `${built.length} scenes are built`);
    assert.strictEqual(built[0].id, 1);
    return `8 slots, scene 1 "${built[0].title}" built, 7 stubs`;
  });

  check('the random pick excludes what is showing', () => {
    assert.strictEqual(M.registry.randomSceneId(1, () => 0.5), null,
      'with one scene built there is nowhere to go');
    // and with a second built, it never returns the current one
    const stub = { id: 2, title: 'stub', load: async () => ({}) };
    const saved = M.registry.SCENES[1];
    M.registry.SCENES[1] = stub;
    try {
      for (const u of [0, 0.49, 0.5, 0.99]) {
        assert.strictEqual(M.registry.randomSceneId(1, () => u), 2);
        assert.strictEqual(M.registry.randomSceneId(2, () => u), 1);
      }
    } finally { M.registry.SCENES[1] = saved; }
    return 'null with one built; never the current one with two';
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
                         'scene-koi.js'];
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
      const src = body.toString();
      const swapped = src.replace(
        "  { id: 3, title: null, load: null },",
        "  { id: 3, title: 'Planes', load: () => import('./scene-layers.js') },");
      if (swapped === src) throw new Error('the layer probe could not be injected into the registry');
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
        assert.strictEqual(numbered.filter(b => b.disabled).length, 7, 'the wrong number are disabled');
        assert.strictEqual(numbered[0].disabled, false, 'scene 1 is disabled');
        assert.strictEqual(numbered[0].active, true, 'scene 1 is not marked active');
        assert.strictEqual(numbered[0].current, 'true', 'scene 1 carries no aria-current');
        const rnd = nav.find(b => b.label === '?');
        assert.ok(rnd, 'there is no random button');
        assert.strictEqual(rnd.disabled, true, 'the random button is live with only one scene to choose from');
        return '1 built, 7 disabled, ? disabled with nowhere to go';
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
          .map(([x, y, R], i) => ({ i, x, y, R, sx: x, sy: y * st2.squash }))
          .filter(p => p.R > 24
            && p.sx - p.R > 6 && p.sx + p.R < st2.width - 6
            && p.sy - p.R * st2.squash > 6 && p.sy + p.R * st2.squash < st2.height - 6)
          .sort((a2, b2) => b2.R - a2.R)
          .slice(0, 5);
        if (inFrame.length < 3) throw new Error(`only ${inFrame.length} pads are fully in frame`);
        // ONE RADIUS FOR EVERY DISC, the smallest chosen pad's, so the pads and
        // the control are the same area and their variances are comparable.
        const rx = Math.min(...inFrame.map(p => p.R)) * 0.9, ry = rx * st2.squash;

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
        const spot = open[0];

        const discs = [...inFrame.map(p => [p.sx, p.sy]), [spot.x, spot.y * st2.squash]];
        const series = discs.map(() => []);
        // ON THE POND'S CLOCK: what this needs is rings that have MOVED between
        // samples, and how much pond a wall-clock wait covers depends on how
        // fast the machine is.
        for (let t = 0; t < 28; t++) {
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
        const padSds = series.slice(0, inFrame.length).map(sd);
        const waterSd = sd(series[inFrame.length]);
        const worst = Math.max(...padSds);
        // NOT VACUOUS: the open water has to be visibly doing something, or a
        // pad that hid nothing would pass beside water that showed nothing.
        if (!(waterSd > 0.35)) {
          throw new Error(`an equal patch of open water varies by only ${waterSd.toFixed(3)} levels `
            + `across ${frames} frames — nothing was sweeping it, so there is nothing to hide`);
        }
        if (!(worst < waterSd * 0.35)) {
          const k = padSds.indexOf(worst);
          throw new Error(`pad ${k} of ${inFrame.length} varies by ${worst.toFixed(3)} levels against the `
            + `open water's ${waterSd.toFixed(3)} — things on the water are sweeping through it`);
        }
        return `${inFrame.length} pads vary ${Math.min(...padSds).toFixed(3)}-${worst.toFixed(3)} levels `
          + `against open water's ${waterSd.toFixed(3)} over ${frames} frames, discs r=${rx.toFixed(0)}`;
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
    const { server } = await serveRepo({ mutant, withProbe: false, withLayers: true });
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
        await page.click('[data-scene="3"]');
        await page.waitForFunction(() => window.__scene.activeId === 3, null, { timeout: 5000 });
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
