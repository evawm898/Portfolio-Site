#!/usr/bin/env node
/* ===================================================================
   WHERE THE PAGE'S TIME GOES ON A BIG MODEL (Eva's ruling, Oct 26 —
   docs/bloom-page-profile-outcome.md). Profiles ONE rebuild of the shipping
   page, phase by phase, in headless Chromium at four sizes, and one HELD
   SLIDER step at each.

   HOW. The page is served with an INSTRUMENTED COPY of bloom.js: timestamps
   are inserted at the boundaries of regenerate(), buildGeometry() and the
   render loop by anchored edits, each of which must match EXACTLY ONCE or the
   run refuses (a drifted anchor would time the wrong span and say nothing).
   Nothing else on the page changes, and the instrumentation only READS the
   clock. Beside the phase marks, a CDP sampling CPU profile (1 ms) of the
   same rebuild attributes the time inside each phase to the functions that
   spent it (inclusive time by function name), which is how the instruments
   inside buildBloomInto are named.

   MODE AND SAMPLING, stated for every number this prints:
   - MODE: the page AS SHIPPED, so the build on screen is EXPORT mode (print
     preview is checked and hidden since F7) — the geometry a visitor sees.
     `--live` unchecks the box first (the gates' mode) and reports LIVE.
   - SAMPLING: `--reps N` rebuilds at rest (default 3), each triggered by one
     real `input` + `change` on a slider and timed to the END OF THE FIRST
     FRAME THAT DRAWS IT; median and range printed. The held step is a real
     pointerdown on a range input, then N `input` events, each waited to its
     drawn frame; release is pointerup + change.
   - GPU: this box draws on SOFTWARE GL (SwiftShader). `renderer.render()`
     only queues commands; `--finish` adds a gl.finish() after each render so
     the frame's GPU cost lands on the main thread where it can be timed.
     Without it, a frame's draw cost shows up as the GAP before the next
     frame. Both are reported; neither is a real-GPU figure.

   RUN:  node tools/bloom-page-profile.mjs [--only <regex>] [--reps N]
              [--held N] [--live] [--finish] [--cpu] [--json <file>]
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, settleBuild, ROOT, UMBEL_DEPTH2_DEFAULTS } from './bloom-harness.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const REPS = Number(opt('--reps', 3));
const HELD = Number(opt('--held', 4));
const ONLY = opt('--only', null);
const LIVE = flag('--live');
const FINISH = flag('--finish');
const CPU = flag('--cpu');
const JSON_OUT = opt('--json', null);
const SRC = opt('--src', 'bloom.js');   // a source to instrument in place of the tree's bloom.js (a base tree's copy)

const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const SIZES = [
  { key: 'default', label: 'the shipping default (8 petals, 1 whorl)', sets: [], slider: 'petalCup' },
  { key: 'head240', label: 'a 240-petal head (40 petals x 6 whorls)', sets: set({ petalCount: 40, layerCount: 6 }), slider: 'petalCup' },
  { key: 'spider', label: 'the spider-lily umbel (block 78 row: 6 florets, head OFF)', sets: set({ stemLength: 120, inflorescence: 'UMBEL', umbelFlorets: 6, pedicelLength: 40, pedicelAngle: 40, floretPetals: 6, floretScale: 1, petalLength: 45, petalWidth: 8, petalSpineCurl: -180, buckleAmp: 0.4, buckleFreq: 5, stamenCount: 6, stamenLength: 70, stamenCurl: 60 }), slider: 'pedicelAngle' },
  { key: 'mophead', label: 'the mophead default (12 rays x 12 florets, depth 2)', sets: set({ stemLength: 120, inflorescence: 'UMBEL', umbelDepth: '2', ...UMBEL_DEPTH2_DEFAULTS }), slider: 'pedicelAngle' },
].filter((s) => !ONLY || new RegExp(ONLY).test(s.key));

/* THE INSTRUMENTATION — anchored edits. `P(name)` closes the span since the
   last mark and opens the next; the render loop records each frame's render
   call (and its gl.finish, under --finish) with the build count it drew. */
const EDITS = [
  ['import * as THREE from', `const __PROF = (window.__prof = { builds: [], cur: null, frames: [], finish: false });
function __mark(name) { const c = __PROF.cur; if (!c) return; const now = performance.now(); c.phases.push([name, now - c.t]); c.t = now; }
import * as THREE from`],
  ['function regenerate() {\n  buildCount++;', `function regenerate() {
  buildCount++;
  __PROF.cur = { build: buildCount, start: performance.now(), t: performance.now(), phases: [] };`],
  /* anchored on the line's PREFIX and on the line after it, so the profile
     instruments a tree whose call passes more options too (--src) */
  ['\n  const built = buildBloomInto(acc, uiForBuild, ', `\n  __mark('pre-build (readUI, the accumulator)');
  const built = buildBloomInto(acc, uiForBuild, `],
  ['\n  if (record) {\n    lastShownMode', `\n  __mark('buildBloomInto (the geometry, every instrument it runs)');
  if (record) {
    lastShownMode`],
  ['  const geo = new THREE.BufferGeometry();\n  geo.setAttribute(\'position\'', `  __mark('the record block (the telemetry cache)');
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position'`],
  ['    toCreasedNormals(geo, SMOOTH_SHADING_CREASE_DEG * Math.PI / 180);\n  }', `    toCreasedNormals(geo, SMOOTH_SHADING_CREASE_DEG * Math.PI / 180);
  }
  __mark('BufferGeometry + normals (copy, computeVertexNormals / toCreasedNormals)');`],
  ['  lightOnScreen = light;\n  if (light) lightBuildCount++;', `  lightOnScreen = light;
  if (light) lightBuildCount++;
  __mark('(return)');`],
  ['  lastShown = shown;\n  if (syncScopeBar(ui)) applyVisibility();', `  __mark('the shown record');
  lastShown = shown;
  if (syncScopeBar(ui)) applyVisibility();
  __mark('syncScopeBar / applyVisibility');`],
  ['  refreshLabels(ui, scopeShown(shown), scopeView ? viewUi(ui) : null);\n  applyCaps(scopeShown(shown));\n  refreshScopeNotes(ui);',
    `  refreshLabels(ui, scopeShown(shown), scopeView ? viewUi(ui) : null);
  __mark('refreshLabels (every control read-out)');
  applyCaps(scopeShown(shown));
  __mark('applyCaps (the track marks)');
  refreshScopeNotes(ui);
  __mark('refreshScopeNotes');`],
  ['  geo.computeBoundingSphere();\n  lastFitRadius', `  __mark('mesh swap (dispose the old geometry)');
  geo.computeBoundingSphere();
  __mark('computeBoundingSphere');
  lastFitRadius`],
  ['\n  shownSummary = (light ? ', `\n  __mark('camera fit');
  shownSummary = (light ? `],
  ['  readout.textContent = shownSummary;\n}', `  __mark('summarise + materialLines (the read-out text)');
  readout.textContent = shownSummary;
  __mark('readout.textContent');
  __PROF.cur.total = performance.now() - __PROF.cur.start; __PROF.builds.push(__PROF.cur); __PROF.cur = null;
}`],
  ['  renderer.render(scene, camera);\n});', `  const __t0 = performance.now();
  renderer.render(scene, camera);
  const __t1 = performance.now();
  if (__PROF.finish) renderer.getContext().finish();
  __PROF.frames.push({ at: __t0, render: __t1 - __t0, finish: performance.now() - __t1, end: performance.now(), build: buildCount, tris: mesh && mesh.geometry && mesh.geometry.attributes.position ? mesh.geometry.attributes.position.count / 3 : 0 });
  if (__PROF.frames.length > 400) __PROF.frames.splice(0, 200);
});`],
];
function instrument(src) {
  let out = src;
  for (const [from, to] of EDITS) {
    const n = out.split(from).length - 1;
    if (n !== 1) throw new Error(`bloom-page-profile: anchor matched ${n} times (must be exactly once): ${JSON.stringify(from.slice(0, 80))}`);
    out = out.replace(from, () => to);
  }
  return out;
}
const PATCHED = instrument(fs.readFileSync(path.resolve(ROOT, SRC), 'utf8'));

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 1100, height: 800 } });
await page.route('**/bloom.js', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: PATCHED }));
const cdp = CPU ? await page.context().newCDPSession(page) : null;
if (cdp) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 1000 }); }

const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const fmt = (a) => (a.length ? `${med(a).toFixed(0)} (${Math.min(...a).toFixed(0)}–${Math.max(...a).toFixed(0)})` : '—');

/* wait until build `k` exists and a frame has been drawn that rendered it;
   returns { build, frame, wallMs } where wallMs is from `t0` (page clock) to
   the END of that frame */
async function waitDrawn(k, t0, timeout = 180000) {
  return page.waitForFunction(([k, t0]) => {
    const P = window.__prof;
    const b = P.builds.find((x) => x.build === k);
    if (!b) return null;
    const f = P.frames.find((x) => x.build >= k && x.at > b.start + b.total - 0.001);
    if (!f) return null;
    return { build: b, frame: f, wallMs: f.end - t0, firstFrames: P.frames.filter((x) => x.build >= k).slice(0, 3) };
  }, [k, t0], { timeout, polling: 50 }).then((h) => h.jsonValue());
}
/* the CPU profile's inclusive time by function name, over the samples taken */
function inclusive(profile) {
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const dt = profile.timeDeltas;
  const tot = new Map(); const self = new Map();
  for (let i = 0; i < profile.samples.length; i++) {
    const d = (dt[i + 1] ?? dt[i] ?? 0) / 1000;
    let id = profile.samples[i]; const seen = new Set(); let first = true;
    while (id !== undefined) {
      const n = byId.get(id); const f = n.callFrame;
      const name = `${f.functionName || '(anon)'} ${path.basename(f.url || '')}:${f.lineNumber + 1}`;
      if (first) { self.set(name, (self.get(name) || 0) + d); first = false; }
      if (!seen.has(name)) { seen.add(name); tot.set(name, (tot.get(name) || 0) + d); }
      id = parent.get(id);
    }
  }
  return { tot, self };
}

const results = [];
for (const S of SIZES) {
  await openBloom(page, port, { asShipped: !LIVE });
  await page.evaluate((f) => { window.__prof.finish = f; }, FINISH);
  const bad = await applyConfig(page, S.sets, null, { settleMs: 180000 });
  if (bad.length) throw new Error(`${S.key}: ${bad.join('; ')}`);
  await settleBuild(page, 180000);
  const mode = await page.evaluate(() => window.__bloomMetrics().shownMode);
  const tris = await page.evaluate(() => window.__bloomMetrics().shownTris ?? null);
  await page.evaluate((id) => { const el = document.getElementById(id); for (let d = el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; el.scrollIntoView({ block: 'center' }); }, S.slider);
  await page.waitForTimeout(300);
  /* idle frames: what one frame of 'nothing changed' costs on this box */
  const idle = await page.evaluate(async () => { const P = window.__prof; const n0 = P.frames.length; await new Promise((r) => setTimeout(r, 3000)); const fr = P.frames.slice(n0); return fr.map((f, i) => ({ render: f.render, finish: f.finish, gap: i ? f.at - fr[i - 1].end : null })); });

  /* REBUILDS AT REST: one slider nudged by a step and back (input + change) */
  const rest = [], restT0 = [];
  let cpuProfile = null;
  for (let r = 0; r < REPS; r++) {
    if (cdp && r === REPS - 1) await cdp.send('Profiler.start');
    const { k, t0 } = await page.evaluate((id) => {
      const el = document.getElementById(id), c = window.__bloomBuildState().count;
      const st = Number(el.step) || 1; const v = Number(el.value);
      el.value = String(v + st <= Number(el.max) ? v + st : v - st);
      const t0 = performance.now();
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
      return { k: c + 1, t0 };
    }, S.slider);
    const d = await waitDrawn(k, t0); restT0.push(t0);
    if (cdp && r === REPS - 1) cpuProfile = (await cdp.send('Profiler.stop')).profile;
    rest.push(d);
    await settleBuild(page, 180000);
  }
  /* A HELD SLIDER: pointerdown on the range, HELD steps, then release */
  /* pressed ON THE THUMB, at the slider's current value, so the held steps
     measure the same state as the rebuilds at rest (a press elsewhere on the
     track would move the value there first) */
  const box = await page.evaluate((id) => { const el = document.getElementById(id), r = el.getBoundingClientRect(); const f = (Number(el.value) - Number(el.min)) / (Number(el.max) - Number(el.min)); return { x: r.x, y: r.y, w: r.width, h: r.height, f }; }, S.slider);
  await page.mouse.move(box.x + 8 + (box.w - 16) * box.f, box.y + box.h / 2);
  await page.mouse.down();
  await settleBuild(page, 180000);   // a pointerdown on the track moves the thumb: that build is the first held one
  const held = [], heldT0 = [];
  for (let i = 0; i < HELD; i++) {
    const { k, t0 } = await page.evaluate((id) => {
      const el = document.getElementById(id), c = window.__bloomBuildState().count;
      const st = Number(el.step) || 1;
      el.value = String(Number(el.value) + (Number(el.value) + st <= Number(el.max) ? st : -st));
      const t0 = performance.now();
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return { k: c + 1, t0 };
    }, S.slider);
    held.push(await waitDrawn(k, t0)); heldT0.push(t0);
  }
  const drag = await page.evaluate(() => (window.__bloomDragState ? window.__bloomDragState() : null));
  const { k: kr, t0: tr } = await page.evaluate(() => ({ k: window.__bloomBuildState().count + 1, t0: performance.now() }));
  await page.mouse.up();
  await page.evaluate((id) => document.getElementById(id).dispatchEvent(new Event('change', { bubbles: true })), S.slider);
  const release = await waitDrawn(kr, tr).catch(() => null);
  await settleBuild(page, 180000);

  const phaseNames = rest[0].build.phases.map((p) => p[0]);
  const phases = phaseNames.map((n, i) => ({ name: n, rest: rest.map((d) => d.build.phases[i][1]), held: held.map((d) => d.build.phases[i] ? d.build.phases[i][1] : NaN) }));
  const firstFrame = rest.map((d) => d.frame.render + d.frame.finish);
  const gap = rest.map((d) => d.frame.at - (d.build.start + d.build.total));
  const out = { key: S.key, label: S.label, mode, tris, slider: S.slider, finish: FINISH,
    idle: { render: idle.slice(1).map((f) => f.render), finish: idle.slice(1).map((f) => f.finish), gap: idle.slice(1).map((f) => f.gap), frames: idle.length },
    rest: { wall: rest.map((d) => d.wallMs), wait: rest.map((d, i) => d.build.start - restT0[i]), regenerate: rest.map((d) => d.build.total), firstFrame, gap },
    held: { wall: held.map((d) => d.wallMs), wait: held.map((d, i) => d.build.start - heldT0[i]), regenerate: held.map((d) => d.build.total), firstFrame: held.map((d) => d.frame.render + d.frame.finish), light: drag },
    release: release ? release.wallMs : null, phases };
  if (cpuProfile) {
    const { tot, self } = inclusive(cpuProfile);
    out.cpuTop = [...tot.entries()].sort((a, b) => b[1] - a[1]).slice(0, 70).map(([n, ms]) => [n, Math.round(ms), Math.round(self.get(n) || 0)]);
  }
  results.push(out);
  console.log(`\n== ${S.label} — ${mode.toUpperCase()} on screen, ${tris != null ? tris.toLocaleString('en-US') : '?'} tris, slider ${S.slider}${FINISH ? ', gl.finish after each render' : ''}`);
  console.log(`   idle frame (${out.idle.frames} in 3 s): render() ${fmt(out.idle.render)} ms · finish ${fmt(out.idle.finish)} · gap ${fmt(out.idle.gap.filter((x) => x != null))}`);
  console.log(`   AT REST (${REPS}): input -> drawn ${fmt(out.rest.wall)} ms · input -> regenerate starts ${fmt(out.rest.wait)} · regenerate() ${fmt(out.rest.regenerate)} · build-end -> first frame ${fmt(gap)} · first frame ${fmt(firstFrame)}`);
  console.log(`   HELD (${HELD} steps): input -> drawn ${fmt(out.held.wall)} ms · input -> regenerate starts ${fmt(out.held.wait)} · regenerate() ${fmt(out.held.regenerate)} · first frame ${fmt(out.held.firstFrame)} · light on screen ${drag ? drag.lightOnScreen : '?'}`);
  console.log(`   release -> drawn ${release ? release.wallMs.toFixed(0) : '—'} ms`);
  for (const p of phases) console.log(`     ${p.name.padEnd(74)} rest ${fmt(p.rest).padStart(18)}   held ${fmt(p.held).padStart(18)}`);
  if (out.cpuTop) { console.log('   CPU profile (last rest rebuild, inclusive ms / self ms):'); for (const [n, t, s] of out.cpuTop.slice(0, 45)) console.log(`     ${String(t).padStart(7)} ${String(s).padStart(7)}  ${n}`); }
}
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(results, null, 1));
await browser.close(); server.close();
