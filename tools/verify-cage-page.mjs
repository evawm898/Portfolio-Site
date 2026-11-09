#!/usr/bin/env node
/* verify-cage-page.mjs — the /cage PAGE gate, in headless Chromium.

   What only a browser can say: the page loads with no error and every
   registry control is in the DOM; a slider's own `input` event rebuilds;
   picking a preset applies it and an edit makes it Custom; a predicate-gated
   control hides AND shows; the Render / SVG toggle puts the export's own
   text on screen; the page's STL bytes equal a Node build of the same state
   (the two engines agree, through float32); a REAL pointer drag on a profile
   point moves it and rebuilds, and a drag past the box is refused with the
   point left where it was; the two export buttons produce real downloads;
   and the chrome is on the site's tokens in BOTH views (P5c/P5d: the SVG
   stage is ground around its paper sheet, the canvas ground is #060707, the
   read-out's separators are faint em-dashes).

   `--negative-control` re-serves seven broken copies of cage.js / cage.css
   and requires each to redden exactly the checks it names. */
import fs from 'node:fs';
import path from 'node:path';
import { openCage, ROOT } from './cage-page-harness.mjs';
import { PARAM_SPEC, buildCage, exportStl, defaultParams, applyPreset } from '../cage-geometry.js';

const NEG = process.argv.includes('--negative-control');

async function run({ mutant = null, quiet = false } = {}) {
  const { page, errors, close } = await openCage();
  if (mutant) { /* the mutant was written to cage.js's served path by the caller */ }
  const fails = [], out = [];
  const check = (name, ok, detail = '') => { out.push(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };
  try {
    const present = await page.evaluate((ids) => ids.map((id) => !!document.getElementById(id)), PARAM_SPEC.map((s) => s.id));
    check('P0 every registry control is in the DOM', present.every(Boolean), `${present.filter(Boolean).length} of ${present.length}`);
    check('P1 the page built once with no error', (await page.evaluate(() => window.__cage.builds())) >= 1 && errors.length === 0, errors.join(' | '));
    // P2 a slider's own input event rebuilds and moves the triangle count
    const t0 = await page.evaluate(() => window.__cage.info().triangles);
    const b0 = await page.evaluate(() => window.__cage.builds());
    await page.evaluate(() => { const el = document.getElementById('barCount'); el.value = '28'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.waitForFunction((b) => window.__cage.builds() > b, b0, { timeout: 3000 }).catch(() => {});   // a page that never rebuilds reports red below, never hangs
    const t1 = await page.evaluate(() => window.__cage.info().triangles);
    const bc = await page.evaluate(() => window.__cage.info().barCount);
    check('P2 the Bars slider rebuilds through its own input event (20 → 28 bars, more triangles)', bc === 28 && t1 > t0, `${t0} → ${t1}`);
    check('P2b editing a field makes the preset Custom, and the option appears', (await page.evaluate(() => [window.__cage.getParams().preset, document.querySelector('#preset option[value="custom"]').hidden])).join() === 'custom,false');
    // P3 the preset select applies a whole state
    await page.evaluate(() => { const el = document.getElementById('preset'); el.value = 'hexLantern'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.waitForFunction(() => window.__cage.getParams().preset === 'hexLantern');
    const hp = await page.evaluate(() => window.__cage.getParams());
    check('P3 picking Hex lantern applies its sides, top, door and profile', hp.sides === '6' && hp.topShape === 'spire' && hp.doorShape === 'rect' && hp.profile.points.length === 2);
    // P4 visibility both ways
    await page.evaluate(() => window.__cage.setParams({ topShape: 'flat' }));
    const hidFlat = await page.evaluate(() => [document.getElementById('topHeight').closest('.cg-ctrl').hidden, document.getElementById('barsConverge').closest('.cg-ctrl').hidden]);
    await page.evaluate(() => window.__cage.setParams({ topShape: 'dome' }));
    const hidDome = await page.evaluate(() => [document.getElementById('topHeight').closest('.cg-ctrl').hidden, document.getElementById('barsConverge').closest('.cg-ctrl').hidden]);
    check('P4 Top height and the converge toggle hide on a flat top and show on a dome', hidFlat.every(Boolean) && hidDome.every((h) => !h));
    // P5 the SVG toggle shows the export's own text
    await page.click('#viewToggle [data-main="svg"]');
    const shown = await page.evaluate(() => ({ hidden: document.getElementById('svgStage').hidden, inner: document.getElementById('svgStage').innerHTML, text: window.__cage.svgText(), mode: window.__cage.mainMode() }));
    check('P5 SVG mode shows the export (the same paths, stage visible)', !shown.hidden && shown.mode === 'svg' && shown.inner.includes('class="door"') && (shown.inner.match(/<path /g) || []).length === (shown.text.match(/<path /g) || []).length);
    // P5c the chrome stays on the site's tokens in SVG mode too (DESIGN.md): the stage around the
    // sheet is ground and only the SVG's own paper rect is light, and the header text is a text token
    // (the palette gate renders the default view only, so this view is held here)
    const TEXT = ['rgb(233, 236, 236)', 'rgb(167, 175, 175)', 'rgb(139, 148, 148)', 'rgb(86, 95, 95)', 'rgb(47, 163, 163)', 'rgb(111, 183, 174)'];
    const svgChrome = await page.evaluate(() => ({ stage: getComputedStyle(document.getElementById('svgStage')).backgroundColor, text: ['.cg-header h1', '.cg-sub', '.cg-back', '.cg-eyebrow'].map((q) => getComputedStyle(document.querySelector(q)).color) }));
    check('P5c SVG mode: the stage is ground and every header text is a text token', svgChrome.stage === 'rgb(6, 7, 7)' && svgChrome.text.every((c) => TEXT.includes(c)), JSON.stringify(svgChrome));
    await page.click('#viewToggle [data-main="render"]');
    // P5d the render's canvas ground is the ground token (the cage's material is artwork; the
    // ground is not), and the read-out's separators are em-dashes in faint (DESIGN.md rule 3)
    const ground = await page.evaluate(() => { const c = document.getElementById('cage-canvas'); const k = document.createElement('canvas'); k.width = 4; k.height = 4; const g = k.getContext('2d'); g.drawImage(c, 0, 0, 4, 4, 0, 0, 4, 4); return Array.from(g.getImageData(1, 1, 1, 1).data.slice(0, 3)); });
    const seps = await page.evaluate(() => { const s = [...document.querySelectorAll('#readout .cg-sep')]; return { n: s.length, dash: s.every((e) => e.textContent.trim() === '\u2014'), colour: [...new Set(s.map((e) => getComputedStyle(e).color))], dots: document.getElementById('readout').textContent.includes(' \u00b7 ') }; });
    check('P5d the canvas ground is #060707 and the read-out separators are faint em-dashes', ground.join() === '6,7,7' && seps.n >= 3 && seps.dash && !seps.dots && seps.colour.length === 1 && seps.colour[0] === 'rgb(86, 95, 95)', `ground ${ground} · ${JSON.stringify(seps)}`);
    // P6 the page's STL is the Node build's, byte for byte
    await page.evaluate(() => window.__cage.setPreset('bell'));
    const pageBytes = Uint8Array.from(await page.evaluate(() => window.__cage.stlBytes()));
    const nodeBytes = exportStl(buildCage(applyPreset(defaultParams(), 'bell')));
    // vertices to the bit (positions survive float32 identically in both V8s); the facet normals'
    // near-zero components carry the engines' last-bit trig divergence (measured 2.6e-15) and get a bar
    // vertices within X0's own bar — 8 float32 ULP of the build's LARGEST coordinate (an exact Object.is across
    // two V8s is a cross-engine identity this repo has measured false; here the worst is ~1e-15 on axis points);
    // the facet normals' near-zero components carry the same last-bit trig divergence and get 1e-9
    let vworst = 0, nworst = 0, maxC = 0;
    if (pageBytes.length === nodeBytes.length) {
      const da = new DataView(pageBytes.buffer), db = new DataView(nodeBytes.buffer), nt = da.getUint32(80, true);
      for (let t = 0; t < nt; t++) for (let k = 0; k < 12; k++) { const o = 84 + 50 * t + 4 * k; const a = da.getFloat32(o, true), b = db.getFloat32(o, true); if (k < 3) nworst = Math.max(nworst, Math.abs(a - b)); else { maxC = Math.max(maxC, Math.abs(b)); vworst = Math.max(vworst, Math.abs(a - b)); } }
    }
    const ulp = Math.pow(2, Math.floor(Math.log2(Math.max(1, maxC))) - 23);
    check('P6 the page’s STL equals Node’s build of the same preset (vertices within 8 float32 ULP of the largest coordinate, normals within 1e-9)', pageBytes.length === nodeBytes.length && vworst <= 8 * ulp && nworst < 1e-9, `${pageBytes.length} vs ${nodeBytes.length} bytes, vertices worst ${vworst.toExponential(2)} mm against ${(8 * ulp).toExponential(2)}, normals worst ${nworst.toExponential(2)}`);
    // P7 a real drag on a profile point
    await page.evaluate(() => { document.getElementById('preset').value = 'cylinder'; window.__cage.setPreset('cylinder'); });
    await page.evaluate(() => { const b = document.querySelector('details[data-sec="body"]'); b.open = true; document.getElementById('profileEditor').scrollIntoView(); });
    const b1 = await page.evaluate(() => window.__cage.builds());
    const p0 = await page.evaluate(() => window.__cage.editor.pointScreen(0));
    const before = await page.evaluate(() => window.__cage.getParams().profile.points[0]);
    await page.mouse.move(p0[0], p0[1]); await page.mouse.down(); await page.mouse.move(p0[0] - 30, p0[1], { steps: 6 }); await page.mouse.up();
    const after = await page.evaluate(() => window.__cage.getParams().profile.points[0]);
    const b2 = await page.evaluate(() => window.__cage.builds());
    check('P7 dragging the base point inward narrows the base (x locked at 0) and rebuilds', after[0] === 0 && after[1] < before[1] - 0.05 && b2 > b1, `${before} → ${after}, builds ${b1} → ${b2}`);
    // P7b a drag past the box is refused and the point stays
    const p1 = await page.evaluate(() => window.__cage.editor.pointScreen(1));
    const refusedBefore = await page.evaluate(() => window.__cage.editor.counts.refused);
    await page.mouse.move(p1[0], p1[1]); await page.mouse.down(); await page.mouse.move(p1[0] + 400, p1[1], { steps: 4 }); await page.mouse.up();
    const pt1 = await page.evaluate(() => window.__cage.getParams().profile.points[1]);
    const refusedAfter = await page.evaluate(() => window.__cage.editor.counts.refused);
    const status = await page.evaluate(() => document.getElementById('profileStatus').textContent);
    check('P7b a drag past the box is REFUSED: the point stays inside and the reason is shown', pt1[1] <= 1 && refusedAfter > refusedBefore && /refused/.test(status), status.slice(0, 80));
    // P8 the exports download
    for (const [id, name] of [['exportStl', 'cage.stl'], ['exportSvg', 'cage.svg']]) {
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.click(`#${id}`)]);
      const f = await dl.path(); const size = f ? fs.statSync(f).size : 0;
      check(`P8 ${name} downloads with bytes`, dl.suggestedFilename() === name && size > 1000, `${size} bytes`);
    }
    // P9 randomize changes the state and builds
    const bR = await page.evaluate(() => window.__cage.builds());
    await page.click('#randomBtn');
    await page.waitForFunction((b) => window.__cage.builds() > b, bR, { timeout: 3000 }).catch(() => {});
    check('P9 Randomize builds a cage with no error', (await page.evaluate(() => window.__cage.lastError())) === null && errors.length === 0, errors.join(' | '));
    check('P10 no page error over the run', errors.length === 0, errors.join(' | '));
  } catch (e) { check('the run completed', false, String(e && e.message || e).slice(0, 200)); }
  await close();
  if (!quiet) { for (const l of out) console.log(l); console.log(`\n${out.length - fails.length} of ${out.length} checks pass`); }
  return { fails, out };
}

const MUTANTS = [
  { id: 'a-slider-no-longer-rebuilds', from: "    writeInputs(); scheduleBuild();\n  });\n  const body = secEl[s.section]", to: "    writeInputs();\n  });\n  const body = secEl[s.section]", breaks: /^P2 / },
  { id: 'an-edit-keeps-the-preset', from: "if (PRESET_FIELD_IDS.includes(s.id)) params.preset = 'custom';", to: "", breaks: /^P2b / },
  { id: 'the-svg-view-shows-a-stale-drawing', from: "if (svg) svgStage.innerHTML = exportSvg(model).replace(/ width=\"[^\"]*mm\" height=\"[^\"]*mm\"/, '');", to: "if (svg && !svgStage.innerHTML) svgStage.innerHTML = exportSvg({ ...model, wires: model.wires.filter((w) => w.kind !== 'door') });", breaks: /^P5 / },
  { id: 'the-canvas-keeps-its-own-ground', from: "scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--color-ground').trim() || '#060707');", to: "scene.background = new THREE.Color(0x0a0a0c);", breaks: /^P5d / },
  { id: 'the-readout-separators-are-dots-again', from: "const SEP = '<span class=\"cg-sep\"> — </span>';", to: "const SEP = ' · ';", breaks: /^P5d / },
  { id: 'the-svg-stage-is-paper-again', file: 'cage.css', from: "#svgStage{position:fixed;inset:0;right:330px;z-index:2;background:var(--color-ground);", to: "body.is-svg .cg-sub,body.is-svg .cg-back{color:#55554f;}\n#svgStage{position:fixed;inset:0;right:330px;z-index:2;background:#EDEDE8;", breaks: /^P5c / },
  { id: 'a-refused-drag-is-clamped-instead', from: "if (!r.accepted) { refusal = r.reason; counts.refused++; render(); return false; }", to: "if (!r.accepted) { render(); return false; }", breaks: /^P7b / },
];
if (NEG) {
  // a mutant names its file (cage.js by default); every anchor is checked before any mutant runs
  const srcs = {}; const srcOf = (f) => (srcs[f] ??= fs.readFileSync(path.join(ROOT, f), 'utf8'));
  for (const m of MUTANTS) { const n = srcOf(m.file || 'cage.js').split(m.from).length - 1; if (n !== 1) { console.error(`ANCHOR ${m.id}: matches ${n} times`); process.exit(1); } }
  const base = await run({ quiet: true });
  if (base.fails.length) { console.error('the clean page fails:', base.fails); process.exit(1); }
  let bad = 0;
  try {
    for (const m of MUTANTS) {
      const f = m.file || 'cage.js';
      for (const k of Object.keys(srcs)) fs.writeFileSync(path.join(ROOT, k), srcs[k]);
      fs.writeFileSync(path.join(ROOT, f), srcOf(f).replace(m.from, m.to));
      const r = await run({ mutant: m.id, quiet: true });
      const claimed = r.fails.filter((f) => m.breaks.test(f)), stray = r.fails.filter((f) => !m.breaks.test(f));
      const ok = claimed.length > 0 && stray.length === 0; if (!ok) bad++;
      console.log(`${ok ? 'CAUGHT' : 'BAD   '} ${m.id}: ${claimed.length} named red${stray.length ? `, UNCLAIMED: ${stray.join('; ')}` : ''}`);
    }
  } finally { for (const k of Object.keys(srcs)) fs.writeFileSync(path.join(ROOT, k), srcs[k]); }
  console.log(`\n${MUTANTS.length - bad} of ${MUTANTS.length} mutants behave`);
  process.exit(bad ? 1 : 0);
} else { const r = await run(); process.exit(r.fails.length ? 1 : 0); }
