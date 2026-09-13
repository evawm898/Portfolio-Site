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
// It applies eleven deliberate defects — each one a mistake that was either
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
              'fish/schooling-koi-end-up-nearer-each-other-than-solitary-ones'],
    why: 'the defect that filled the pond with sixteen koi to keep seven on screen',
  },
  {
    id: 'a-departure-never-leaves',
    file: 'scene/koi-fish.js',
    from: "      if (pick) { pick.state = 'leaving'; school.departures++; }",
    to: '      if (pick) { school.departures++; }',
    breaks: ['fish/the-population-does-not-churn-at-a-steady-intensity'],
    mayAlso: ['fish/the-pond-holds-three-to-seven-koi-on-screen',
              'scene1/the-pond-has-koi-in-it-and-draws-them',
              'scene1/the-traits-are-per-fish-and-span-the-sliders'],
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
              // seed() returns an EMPTY pond under this one — measured — so
              // every fixture that takes the seeded koi and places them by hand
              // has nothing to place.
              'fish/any-ripple-gets-the-same-reaction',
              'fish/some-koi-swim-to-a-ripple-and-some-flee-it'],
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
    const ages = f.list.map(r => r.age);
    if (!(Math.max(...ages) < 0.35)) throw new Error('an old ripple survived the eviction');
    return `capped at ${M.ripples.MAX_RIPPLES}, oldest evicted`;
  });

  // ------------------------------------------------------------------- rain
  setSection('rain');
  check('the fall gets heavier with the storm and with the screen', () => {
    const r = M.rain.createRain({ rand: M.rng.makeRandom(1), ripples: M.ripples.createRipples() });
    const idle = r.rateFor(0, 1440, 900), storm = r.rateFor(1, 1440, 900);
    const big = r.rateFor(0, 2880, 1800);
    if (!(storm > idle * 20)) throw new Error(`idle ${idle}, downpour ${storm}`);
    near(big / idle, 4, 1e-9, 'four times the area');
    return `${idle.toFixed(1)}/s idle, ${storm.toFixed(0)}/s downpour, x4 on x4 area`;
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
  const SCENE_MODULES = ['surface.js', 'koi-storm.js', 'koi-wind.js', 'koi-ripples.js',
                         'koi-rain.js', 'koi-fish.js', 'koi-draw.js', 'scene-koi.js'];
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

function serveRepo({ mutant, withProbe }) {
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
