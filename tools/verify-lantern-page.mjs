#!/usr/bin/env node
/* verify-lantern-page.mjs — the /lantern page, driven in headless Chromium
   with REAL pointer events and downloads (lantern-design-doc.md §13). The
   geometry is the Node gate's (tools/verify-lantern.mjs); this asks whether
   the page's controls write the state, whether the hand lands where the
   geometry says, and whether its buttons give the files they claim.

     P0  the page loads clean on the defaults: the Lit view (ruling 7; Folded until phase 5), both halves
         drawn (the mesh's triangle count is the geometry's), frames rendering.
     P1  the view toggle: Flat shows one outline, 2N tabs, N mountain scores,
         N valley perfs, the opening and the ring; Folded resumes rendering.
     P2  a slider writes the state (points 7 → seven mountains in the Flat
         view, N = 7 in the model), with undo taking it back and redo forward.
     P3  the point-outline editor: after the convex quick mode, a REAL drag on
         a middle point lands it under the pointer (within 3 px) and the mode
         reads custom; a double-click on the curve adds a point; a double-click
         on that point removes it; an end point cannot be dragged.
     P4  a preset click sets its state and the random button yields a design
         that closes without a clamp; the preset strip carries thumbnails.
     P5  an infeasible target shows the clamp in Checks (a warn flag with the
         built depth) and the depth read-out says what was built.
     P6  the SVG buttons download the front (CUT / SCORE / PERF layers, N
         scores) and the back (the opening and ring circles); the design JSON
         downloads and opens back to the same state through the file input.
     P7  the design survives a reload (local storage), and a fresh profile
         opens on the defaults.
     P8  at phone width the page loads clean and the preview comes first.
     P9  the Checks badge reads ok on the defaults and the dimensions read-out
         prints finished AND flat sizes with inches.
     P10 THE PATTERN IS ON THE PAGE: the defaults carry a judged pattern (cuts
         on every facet, no island), the Flat view draws 2N × the per-facet
         cuts, the folded view draws its parts through alpha-mapped materials,
         and the front SVG's CUT layer carries the cuts.
     P11 the Pattern section: the generator select changes the cut count and
         the thumbnails exist; "none" empties the cuts and the SVG's CUT layer
         goes back to the outline, tabs and holes; alternate-solid halves the
         placed polygons; reseed changes the layout; undo brings it back.
     P12 a cut finding is CLICKABLE: with auto-bridge off on a dense lace, the
         Checks list shows an island as a problem (badge "problem"), clicking
         it switches to the Flat view zoomed on the finding with a focus ring,
         and a click on the drawing restores the whole sheet.
     P13 the random pattern button keeps the lowest-scoring of its draws (restated from each draw's own counts, auto-bridge off, three presses) and the
         note says so; the pattern survives a reload.
     P14 MATERIAL AND EXPORT: the defaults open judged (thin notes listed on
         the first paint); a heavier stock raises every rule and re-lays the
         pattern on them (the bridge in the read-out moves); the default bed
         splits the halves into modules and a 900 × 600 bed does not; the ZIP
         download holds one SVG per sheet, a README and the design; the PNG
         download is a PNG; a bed too small reports a problem.
     P15 BACKING AND BUILD (phase 4): backing on draws a tissue material behind
         every cut part and lays out 2N pieces; the Build view lists the steps
         with the counts and the settings table; the PDF download is a PDF; the
         test grid and coupon downloads are SVGs; the ZIP then holds the backing
         sheets, the grid, the coupon and INSTRUCTIONS.txt; backing survives a
         reload.
     P16 LIT (phase 5): the page opens on the Lit view with the lamp on; the
         wall behind the star carries the pattern (the lamp lights a FRACTION of
         the frame through the holes — more than none, less than with no
         shadow); every Light slider moves the lamp's record and the wall
         distance moves the wall; a changed warmth survives a reload and rides
         in the design file; the Folded view puts every light back (the lit
         record is null and the paper reads as phase 1's).

   --negative-control re-serves deliberately broken copies of lantern.js and
   requires each to fail the check that names it. Every anchor is checked
   first. */

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { openLantern, REPO } from './lantern-page-harness.mjs';
import * as G from '../lantern-geometry.js';

const args = process.argv.slice(2);
const NEG = args.includes('--negative-control');
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);

async function download(page, trigger, timeout = 20000) {   // a download that RENDERS (the PNG reads the WebGL canvas) gets the sheet's 120 s: 20 s timed out on the runner's software GL (run 39762462046)
  const [d] = await Promise.all([page.waitForEvent('download', { timeout }), trigger()]);
  const p = await d.path();
  return { name: d.suggestedFilename(), path: p, text: /\.(svg|json|txt)$/.test(d.suggestedFilename()) ? fs.readFileSync(p, 'utf8') : '' };
}

async function run(override = null) {
  const res = [];
  const ok = (c, m) => res.push([!!c, m]);
  const s = await openLantern({ storage: '', override });
  const { page, errors } = s;
  const T = (f, ...a) => page.evaluate(f, ...a);
  try {
    await page.waitForTimeout(400);
    // P0
    {
      const m = await T(() => { const m = window.__lantern.model(); return { N: m.N, ok: m.ok, tris: window.__lantern.fold.triangles(), frames: window.__lantern.fold.frames(), view: window.__lantern.view(), running: window.__lantern.fold.running() }; });
      const want = G.foldedMesh(G.solveLantern(G.DEFAULTS), 1).triangles + G.foldedMesh(G.solveLantern(G.DEFAULTS), -1, { opening: true }).triangles;
      ok(!errors.length && m.N === 5 && m.ok && m.tris === want && m.frames > 0 && m.view === 'lit' && m.running, `P0: loads clean on the Lit view (phase 5 — ruling 7; the halves are the Folded view's) — N ${m.N}, ${m.tris} triangles (geometry says ${want}), ${m.frames} frames, errors: ${errors.join(' | ') || 'none'}`);
    }
    // P1
    {
      await page.click('#views [data-view="flat"]');
      await page.waitForTimeout(150);
      const c = await T(() => window.__lantern.flatCounts()), v = await T(() => window.__lantern.view());
      const vis = await T(() => ({ svg: document.getElementById('flatSvg').getClientRects().length > 0, canvas: document.getElementById('foldCanvas').getClientRects().length > 0 }));
      const f0 = await T(() => window.__lantern.fold.frames());
      await page.click('#views [data-view="folded"]');
      await page.waitForTimeout(400);
      const f1 = await T(() => window.__lantern.fold.frames());
      ok(v === 'flat' && vis.svg && !vis.canvas && c.outline === 1 && c.tabs === 10 && c.mountain === 5 && c.valley === 5 && c.holes === 1 && c.ring === 2 && f1 > f0, `P1: the view toggle — flat on screen ${vis.svg}, canvas off ${!vis.canvas}; ${c.outline} outline, ${c.tabs} tabs, ${c.mountain} scores, ${c.valley} perfs, ${c.holes} hole, ${c.ring} ring circles; folded resumes (${f0} → ${f1} frames)`);
    }
    // P2 slider + undo/redo
    {
      await T(() => window.__lantern.set('points', 7));
      const n7 = await T(() => window.__lantern.model().N);
      await T(() => window.__lantern.view('flat'));
      const c = await T(() => window.__lantern.flatCounts());
      await T(() => document.getElementById('undo').click()); await T(() => window.__lantern.flush());
      const n5 = await T(() => window.__lantern.model().N);
      await T(() => document.getElementById('redo').click()); await T(() => window.__lantern.flush());
      const n7b = await T(() => window.__lantern.model().N);
      await T(() => document.getElementById('undo').click()); await T(() => window.__lantern.flush());
      await T(() => window.__lantern.view('folded'));
      ok(n7 === 7 && c.mountain === 7 && c.valley === 7 && c.tabs === 14 && n5 === 5 && n7b === 7, `P2: points 7 → N ${n7}, ${c.mountain} scores / ${c.valley} perfs / ${c.tabs} tabs; undo → ${n5}, redo → ${n7b}`);
    }
    // P3 the editor
    {
      await T(() => window.__lantern.edgeMode('convex'));
      await T(() => window.__lantern.flush());
      const before = await T(() => window.__lantern.state());
      const p1 = await T(() => window.__lantern.editor.pointScreen(1));
      const to = [p1[0] + 10, p1[1] - 18];
      await page.mouse.move(p1[0], p1[1]); await page.mouse.down(); await page.mouse.move(to[0], to[1], { steps: 8 }); await page.mouse.up();
      await T(() => window.__lantern.flush());
      const after = await T(() => window.__lantern.state());
      const p1b = await T(() => window.__lantern.editor.pointScreen(1));
      const landed = Math.hypot(p1b[0] - to[0], p1b[1] - to[1]);
      // double-click on the curve at u = 0.55 adds a point
      const c = await T(() => window.__lantern.editor.curveScreen(0.55));
      const n0 = after.edge.points.length;
      await page.mouse.dblclick(c[0], c[1]);
      await T(() => window.__lantern.flush());
      const n1 = (await T(() => window.__lantern.state())).edge.points.length;
      // and double-click on that point removes it
      const idx = (await T(() => window.__lantern.state())).edge.points.findIndex((p) => Math.abs(p[0] - 0.55) < 0.03);
      const q = await T((i) => window.__lantern.editor.pointScreen(i), idx);
      await page.mouse.dblclick(q[0], q[1]);
      await T(() => window.__lantern.flush());
      const n2 = (await T(() => window.__lantern.state())).edge.points.length;
      // an end point does not move
      const e = await T(() => window.__lantern.editor.pointScreen(0));
      await page.mouse.move(e[0], e[1]); await page.mouse.down(); await page.mouse.move(e[0] + 20, e[1] - 20, { steps: 5 }); await page.mouse.up();
      await T(() => window.__lantern.flush());
      const endPt = (await T(() => window.__lantern.state())).edge.points[0];
      ok(before.edgeMode === 'convex' && after.edgeMode === 'custom' && landed < 3 && n1 === n0 + 1 && idx >= 0 && n2 === n0 && endPt[0] === 0 && endPt[1] === 0,
        `P3: the editor — convex → drag point 1 lands ${landed.toFixed(1)} px from the pointer, mode ${after.edgeMode}; dblclick the curve ${n0} → ${n1} points, dblclick the point → ${n2}; the end point stays at (${endPt})`);
    }
    // P4 presets + random
    {
      await page.click('.ln-preset[data-preset="sunburst12"]');
      await T(() => window.__lantern.flush());
      const st = await T(() => window.__lantern.state());
      await page.waitForFunction(() => window.__lantern.thumbsReady(), null, { timeout: 15000 });
      const thumbs = await T(() => [...document.querySelectorAll('#shapePresets .ln-preset svg path')].length);
      await page.click('#randomShape');
      await T(() => window.__lantern.flush());
      const rm = await T(() => { const m = window.__lantern.model(); return { ok: m.ok, clamped: m.clampedDepth, steep: m.infeasible }; });
      ok(st.points === 12 && st.tip === 'sharp' && thumbs === G.SHAPE_PRESETS.length && rm.ok && !rm.clamped && rm.steep === 0, `P4: preset sunburst12 → ${st.points} points, tip ${st.tip}; ${thumbs} thumbnails; random: ok=${rm.ok} clamped=${rm.clamped} steep=${rm.steep}`);
    }
    // P5 the clamp is told
    {
      await T(() => window.__lantern.setState({ ...window.__lantern.state(), points: 5, slender: 0.38, depthFrac: 0.2, edgeMode: 'straight', edge: { mode: 'single', points: [[0, 0], [1, 0]] } }));
      const flags = await T(() => window.__lantern.flags()), txt = await T(() => document.getElementById('depthFrac-out').textContent), badge = await T(() => document.getElementById('flagCount').textContent);
      const warn = flags.find((f) => f.id === 'depth');
      ok(warn && /warn/.test(warn.kind) && /clamped/.test(warn.text) && /built/.test(txt) && /note/.test(badge), `P5: an infeasible target — Checks: ${warn ? warn.kind + ' "' + warn.text.slice(0, 60) + '…"' : 'no depth flag'}; read-out "${txt}"; badge "${badge}"`);
      await page.click('#resetAll'); await T(() => window.__lantern.flush());
    }
    // P6 exports
    {
      const front = await download(page, () => page.click('#svgFront'));
      const back = await download(page, () => page.click('#svgBack'));
      const scores = ((front.text.match(/<g id="SCORE"[\s\S]*?<\/g>/) || [''])[0].match(/<path/g) || []).length;
      const layersOk = ['CUT', 'SCORE', 'PERF'].every((l) => front.text.includes(`id="${l}"`));
      const design = await download(page, () => page.click('#saveDesign'));
      await T(() => window.__lantern.set('points', 9));
      const tmp = path.join(REPO, 'node_modules', '.lantern-design-roundtrip.json'); fs.writeFileSync(tmp, design.text);
      await page.setInputFiles('#openDesign', tmp); await page.waitForTimeout(300); await T(() => window.__lantern.flush());
      const st = await T(() => window.__lantern.state()), msg = await T(() => document.getElementById('designMsg').textContent);
      fs.unlinkSync(tmp);
      ok(/front\.svg$/.test(front.name) && layersOk && scores === 5 && (back.text.match(/<circle/g) || []).length === 3 && /\.json$/.test(design.name) && st.points === 5 && /clean read/.test(msg), `P6: exports — ${front.name} (${scores} scores, layers ${layersOk}), ${back.name} (${(back.text.match(/<circle/g) || []).length} circles), ${design.name} opened back to ${st.points} points: "${msg}"`);
    }
    // P7 storage
    {
      await T(() => window.__lantern.set('points', 6));
      await page.reload(); await page.waitForFunction(() => !!window.__lantern && !!window.__lantern.model());
      const n = await T(() => window.__lantern.model().N);
      ok(n === 6, `P7: the design survives a reload — ${n} points`);
    }
    // P9
    {
      await page.click('#resetAll'); await T(() => window.__lantern.flush());
      const badge = await T(() => document.getElementById('flagCount').textContent), dims = await T(() => window.__lantern.dimsText());
      ok(/^(ok|\d+ notes?)$/.test(badge) && /finished/.test(dims) && /flat/.test(dims) && /″/.test(dims) && /mm deep/.test(dims), `P9: the badge reads "${badge}" (no problem) and the read-out prints finished and flat sizes with inches`);
    }
    // P10 the pattern is on the page
    {
      const pat = await T(() => window.__lantern.pattern());
      const placed = await T(() => window.__lantern.placedCuts());
      const N = await T(() => window.__lantern.model().N);
      await T(() => window.__lantern.view('flat')); await page.waitForTimeout(150);
      const drawn = await T(() => document.querySelectorAll('#flatSvg .cutpat').length);
      await T(() => window.__lantern.view('folded')); await page.waitForTimeout(150);
      const mats = await T(() => window.__lantern.fold.materials());
      const svg = await T(() => window.__lantern.svgText('front'));
      const cutLayer = (svg.split('<g id="CUT"')[1] || '').split('</g>')[0];
      const paths = (cutLayer.match(/<path/g) || []).length;
      ok(pat && pat.validated && pat.counts.island === 0 && pat.cuts[0] > 20 && placed === 2 * N * pat.cuts[0] && drawn === placed && mats.length >= 2 && mats.every((m) => m === 'cut') && paths === placed + 1 + 2 * N,
        `P10: ${pat && pat.cuts[0]} cuts per facet, ${pat && pat.counts.island} islands, ${placed} placed, ${drawn} drawn in the Flat view, folded materials [${mats.join(', ')}], the SVG's CUT layer holds ${paths} paths (outline + ${2 * N} tabs + ${placed} cuts)`);
    }
    // P11 the Pattern section
    {
      const c0 = await T(() => window.__lantern.pattern().cuts[0]);
      await T(() => window.__lantern.set('patMode', 'geometric'));
      const c1 = await T(() => window.__lantern.pattern().cuts[0]);
      await page.waitForTimeout(300);
      const thumbs = await T(() => document.querySelectorAll('#patternPresets .ln-preset svg path').length);
      await T(() => window.__lantern.set('patMode', 'none'));
      const none = await T(() => ({ placed: window.__lantern.placedCuts(), svgPaths: ((window.__lantern.svgText('front').split('<g id="CUT"')[1] || '').split('</g>')[0].match(/<path/g) || []).length }));
      await T(() => window.__lantern.set('patMode', 'paisley'));
      const full = await T(() => window.__lantern.placedCuts());
      await T(() => window.__lantern.set('patSolidAlt', true));
      const half = await T(() => window.__lantern.placedCuts());
      await T(() => window.__lantern.set('patSolidAlt', false));
      const seed0 = await T(() => window.__lantern.state().patSeed);
      const a = await T(() => JSON.stringify(window.__lantern.pattern()));
      await page.click('#patReseed'); await T(() => window.__lantern.flush());
      const seed1 = await T(() => window.__lantern.state().patSeed), b = await T(() => JSON.stringify(window.__lantern.pattern()));
      await T(() => window.__lantern.undo()); await T(() => window.__lantern.flush());
      const seed2 = await T(() => window.__lantern.state().patSeed);
      ok(c0 !== c1 && c1 > 20 && thumbs > 12 && none.placed === 0 && none.svgPaths === 11 && full > 0 && half === full * 3 / 5 && seed1 !== seed0 && a !== b && seed2 === seed0,
        `P11: paisley ${c0} → geometric ${c1} cuts; ${thumbs} thumbnail paths; none → ${none.placed} placed and ${none.svgPaths} CUT paths; alternate solid ${full} → ${half}; reseed ${seed0} → ${seed1} (layout ${a === b ? 'unchanged' : 'moved'}); undo → ${seed2}`);
    }
    // P12 a clickable finding
    {
      await T(() => window.__lantern.setState({ ...window.__lantern.state(), patMode: 'paisley', patSeed: 7, patDensity: 0.6, patIntricacy: 0.7, patAutoBridge: false }));
      await page.waitForTimeout(150);
      const flags = await T(() => window.__lantern.flags());
      const badge = await T(() => document.getElementById('flagCount').textContent);
      const island = flags.find((f) => f.id === 'islands');
      // dispatched clicks, not page.click: under a mutant the element may be hidden or absent, and a wait for visibility is a hang where a red check is owed
      await T(() => { const li = document.querySelector('#flags li[data-flag="islands"]'); if (li) li.click(); }); await page.waitForTimeout(200);
      const z = await T(() => ({ view: window.__lantern.view(), focus: window.__lantern.flatFocus(), ring: document.querySelectorAll('#flatSvg .issue.is-focus').length, text: [...document.querySelectorAll('#flatSvg text')].map((t) => t.textContent).join(' ') }));
      await T(() => document.getElementById('flatSvg').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await page.waitForTimeout(150);
      const back = await T(() => ({ focus: window.__lantern.flatFocus(), text: [...document.querySelectorAll('#flatSvg text')].map((t) => t.textContent).join(' ') }));
      ok(island && island.kind === 'bad cut' && /problem/.test(badge) && z.view === 'flat' && z.focus && z.focus.kind === 'island' && z.ring === 1 && /zoomed on an island/.test(z.text) && !back.focus && /flat sheet/.test(back.text),
        `P12: with auto-bridge off, Checks lists ${island ? '"' + island.text.slice(0, 50) + '…" as ' + island.kind : 'no island'} (badge "${badge}"); click → view ${z.view}, focus ${z.focus && z.focus.kind}, ${z.ring} focus ring, "${z.text.slice(0, 40)}…"; click the drawing → ${back.focus ? 'still zoomed' : 'the whole sheet'}`);
      await T(() => window.__lantern.view('folded'));
    }
    // P13 the random pattern, and it survives a reload
    // The score is RESTATED here from each draw's own counts (the page records the counts, never its score): the kept draw
    // must be the lowest, the search must stop only on a clean draw or after eight, and the note must match the kept
    // score. With auto-bridge ON every island is bridged and nearly every draw scores 0, which made a mutant that scores
    // everything 0 a coin flip (it MISSED in CI once) — so the draws are made with auto-bridge OFF, three presses in a row.
    {
      await T(() => window.__lantern.setState({ ...window.__lantern.state(), patAutoBridge: false }));
      const restate = (c) => c.island * 100 + c.thin + c.narrow + c.keepout;
      const presses = [];
      for (let i = 0; i < 3; i++) {
        await page.click('#randomPattern'); await T(() => window.__lantern.flush());
        const r = await T(() => window.__lantern.random()), note = await T(() => document.getElementById('patternNote').textContent), pat = await T(() => window.__lantern.pattern());
        const scores = r ? r.draws.map((d) => restate(d.counts)) : [], kept = r ? scores[r.picked] : NaN, last = scores[scores.length - 1];
        presses.push({ n: scores.length, kept, min: Math.min(...scores), stopped: scores.length === 8 || last === 0, noteOk: /random/.test(note) && (kept === 0 ? /passes every check/.test(note) : /best of eight/.test(note)), onPage: pat.counts.island === r.draws[r.picked].counts.island });
      }
      const st = await T(() => window.__lantern.state());
      await page.reload(); await page.waitForTimeout(600);
      const st2 = await T(() => window.__lantern.state());
      await T(() => window.__lantern.setState({ ...window.__lantern.state(), patAutoBridge: true }));
      ok(presses.every((p) => p.kept === p.min && p.stopped && p.noteOk && p.onPage) && st2.patMode === st.patMode && st2.patSeed === st.patSeed,
        `P13: random pattern, auto-bridge off, three presses — ${presses.map((p) => `${p.n} draws, kept ${p.kept} (min ${p.min}${p.stopped ? '' : ', stopped early'}${p.noteOk ? '' : ', note wrong'})`).join('; ')}; ${st.patMode} #${st.patSeed} after a reload ${st2.patMode} #${st2.patSeed}`);
    }
    // P14 material and export
    {
      await page.click('#resetAll'); await T(() => window.__lantern.flush());
      const first = await T(() => ({ validated: window.__lantern.pattern().validated, flags: window.__lantern.flags().map((f) => f.id) }));
      const r0 = await T(() => window.__lantern.rules()), pat0 = await T(() => window.__lantern.pattern());
      await T(() => window.__lantern.set('material', 'cover300'));
      const r1 = await T(() => window.__lantern.rules()), txt = await T(() => window.__lantern.rulesText()), pat1 = await T(() => window.__lantern.pattern());
      const planG = await T(() => window.__lantern.plan());
      await T(() => window.__lantern.set('bed', 'laser900'));
      const planL = await T(() => window.__lantern.plan());
      const zip = await download(page, () => page.click('#exportZip'));
      const JSZip = createRequire(import.meta.url)(path.join(REPO, 'node_modules/jszip'));   // the UMD build, through require
      const z = await JSZip.loadAsync(fs.readFileSync(zip.path));
      const names = Object.keys(z.files);
      const svgs = names.filter((n) => /-sheet-\d+-of-\d+\.svg$/.test(n)),   // the CUT sheets by name; the zip also carries backing sheets, the test grid and the coupon (P15's)
       readme = names.find((n) => /README/.test(n)), json = names.find((n) => /\.json$/.test(n));
      const sheet1 = svgs.length ? await z.file(svgs[0]).async('string') : '';
      const png = await download(page, () => page.click('#exportPng'), 120000);
      const pngHead = fs.readFileSync(png.path).subarray(0, 8).toString('hex');
      await T(() => window.__lantern.set('bed', 'k40'));
      const small = await T(() => ({ plan: window.__lantern.plan(), badge: document.getElementById('flagCount').textContent, bed: window.__lantern.flags().find((f) => f.id === 'bed') }));
      await T(() => window.__lantern.set('bed', 'glowforge')); await T(() => window.__lantern.set('material', 'card200'));
      ok(first.validated && first.flags.includes('thin') && r1.bridge > r0.bridge && r1.rimMargin > r0.rimMargin && new RegExp(`bridge ${r1.bridge}`).test(txt) && pat1.validated && pat1.cuts[0] !== pat0.cuts[0] && planG.split && planG.sheets > 2 && !planL.split && planL.sheets === 2 && svgs.length === planL.sheets && readme && json && /id="CUT"/.test(sheet1) && /id="PERF"/.test(sheet1) && pngHead === '89504e470d0a1a0a' && !small.plan.fitsBed && small.bed && /bad/.test(small.bed.kind) && /problem/.test(small.badge),
        `P14: first paint judged (${first.flags.join(', ')}); cover300 → bridge ${r0.bridge} → ${r1.bridge}, rim margin ${r0.rimMargin} → ${r1.rimMargin}, read-out "${txt.slice(0, 40)}…", pattern re-laid on the new rules (${pat0.cuts[0]} → ${pat1.cuts[0]} cuts); Glowforge split=${planG.split} ${planG.sheets} sheets, 900×600 split=${planL.split} ${planL.sheets} sheets; zip holds ${svgs.length} svg + ${readme ? 'README' : 'no README'} + ${json ? 'design' : 'no design'}; png header ${pngHead}; K40: fits=${small.plan.fitsBed}, "${small.bed && small.bed.text.slice(0, 50)}…", badge "${small.badge}"`);
    }
    // P16 lit
    {
      await page.reload(); await page.waitForTimeout(700); await T(() => window.__lantern.flush());
      const opens = await T(() => ({ label: document.getElementById('previewLabel').textContent, lit: window.__lantern.lit(), canvas: !document.getElementById('foldCanvas').hidden, on: document.querySelector('#views .is-on').dataset.view }));
      const shadow = await T(() => window.__lantern.litWallSamples(false)), open = await T(() => window.__lantern.litWallSamples(true));
      await T(() => window.__lantern.set('litWarmth', 2200)); await T(() => window.__lantern.set('litBrightness', 1.5)); await T(() => window.__lantern.set('litRoom', 0.4)); await T(() => window.__lantern.set('litWall', 2.2));
      const moved = (await T(() => window.__lantern.lit())) || { none: true };   // null when the page is not lit (the opens-folded mutant) — the clause fails, the detail must still print
      const json = JSON.parse(await T(() => window.__lantern.designJson())).state;
      await page.reload(); await page.waitForTimeout(700);
      const kept = await T(() => ({ st: window.__lantern.state().litWarmth, lit: window.__lantern.lit() }));
      await T(() => window.__lantern.view('folded')); await page.waitForTimeout(200);
      const off = await T(() => ({ lit: window.__lantern.lit(), label: document.getElementById('previewLabel').textContent }));
      await page.click('#resetAll'); await T(() => window.__lantern.view('lit'));
      ok(opens.label === 'Lit' && opens.on === 'lit' && opens.canvas && opens.lit && opens.lit.lampIntensity > 0 && opens.lit.shadows >= 2 && shadow.lit >= 5 && shadow.lit < open.lit * 0.5 && !moved.none && moved.warmth === 2200 && moved.brightness === 1.5 && moved.room === 0.4 && moved.wallDistance === 2.2 && Math.abs(moved.wallZ) > Math.abs(opens.lit.wallZ) * 1.4 && moved.lampIntensity > opens.lit.lampIntensity && json.litWarmth === 2200 && kept.st === 2200 && kept.lit && kept.lit.warmth === 2200 && off.lit === null && off.label === 'Folded',
        `P16: opens ${opens.label} (${opens.on}), lamp ${opens.lit && opens.lit.lampIntensity.toFixed(0)}, ${opens.lit && opens.lit.shadows} casters; wall band lit ${shadow.lit} of ${shadow.n} samples through the holes (the star masked out by a lamp-off frame; a solid shadow reads 0) against ${open.lit} unshadowed; sliders → ${moved.warmth} K / ${moved.brightness} / ${moved.room} / wall ${moved.wallDistance} (z ${moved.wallZ && moved.wallZ.toFixed(0)} from ${opens.lit && opens.lit.wallZ.toFixed(0)}); file litWarmth ${json.litWarmth}; after reload ${kept.st} (lit ${kept.lit ? kept.lit.warmth + ' K' : 'null'}); Folded → lit ${off.lit}, "${off.label}"`);
    }
    // P15 backing and build
    {
      await T(() => window.__lantern.set('backing', true)); await page.waitForTimeout(200);
      const mats = await T(() => window.__lantern.fold.materials()), bk = await T(() => ({ pieces: window.__lantern.backingPieces(), sheets: window.__lantern.backingSheets(), N: window.__lantern.model().N }));
      await T(() => window.__lantern.view('build')); await page.waitForTimeout(150);
      const build = await T(() => ({ steps: window.__lantern.steps(), text: window.__lantern.buildText(), vis: !document.getElementById('buildView').hidden && document.getElementById('foldCanvas').hidden }));
      const pdf = await download(page, () => page.click('#instructionsPdf'));
      const pdfHead = fs.readFileSync(pdf.path).subarray(0, 5).toString();
      const grid = await download(page, () => page.click('#testGrid')), coupon = await download(page, () => page.click('#coupon'));
      const zip = await download(page, () => page.click('#exportZip'));
      const JSZip = createRequire(import.meta.url)(path.join(REPO, 'node_modules/jszip'));
      const names = Object.keys((await JSZip.loadAsync(fs.readFileSync(zip.path))).files);
      const has = (re) => names.filter((n) => re.test(n)).length;
      await page.reload(); await page.waitForTimeout(600);
      const kept = await T(() => window.__lantern.state().backing);
      await T(() => window.__lantern.set('backing', false)); await T(() => window.__lantern.view('folded'));
      ok(mats.includes('tissue') && mats.filter((m) => m === 'tissue').length === 2 * bk.N && bk.pieces === 2 * bk.N && bk.sheets >= 1 && build.vis && build.steps.length === 11 && /Join the modules/.test(build.text) && /LED only/.test(build.text) && /starting setting/.test(build.text) && pdfHead === '%PDF-' && /test-grid\.svg$/.test(grid.name) && /◀/.test(grid.text) && /coupon\.svg$/.test(coupon.name) && /id="CUT"/.test(coupon.text) && has(/backing-\d+-of/) === bk.sheets && has(/test-grid/) === 1 && has(/coupon/) === 1 && has(/INSTRUCTIONS/) === 1 && kept === true,
        `P15: backing → ${mats.filter((m) => m === 'tissue').length} tissue materials for ${bk.N} points, ${bk.pieces} pieces on ${bk.sheets} sheets; Build view ${build.vis ? 'shown' : 'hidden'} with ${build.steps.length} steps; PDF "${pdfHead}"; ${grid.name}, ${coupon.name}; zip: ${has(/backing/)} backing sheets, ${has(/test-grid/)} grid, ${has(/coupon/)} coupon, ${has(/INSTRUCTIONS/)} instructions; backing after a reload: ${kept}`);
    }
  } finally { await s.close(); }
  // P7b fresh profile and P8 phone
  {
    const f = await openLantern({ storage: '' });
    const n = await f.page.evaluate(() => window.__lantern.model().N);
    await f.close();
    const m = await openLantern({ storage: '', viewport: { width: 390, height: 844 } });
    await m.page.waitForTimeout(500);
    const order = await m.page.evaluate(() => { const a = document.querySelector('.ln-main').getBoundingClientRect().top, b = document.querySelector('.ln-panel').getBoundingClientRect().top; return a < b; });
    const tris = await m.page.evaluate(() => window.__lantern.fold.triangles());
    ok(n === 5 && !m.errors.length && order && tris > 0, `P7b/P8: a fresh profile opens on ${n} points; phone width loads clean (errors: ${m.errors.join(' | ') || 'none'}), preview above the panel: ${order}`);
    await m.close();
  }
  return res;
}

const MUTANTS = [
  { id: 'the-view-toggle-does-not-switch', file: 'lantern.js', from: "$('flatSvg').toggleAttribute('hidden', name !== 'flat');", to: "$('flatSvg').toggleAttribute('hidden', true);", breaks: ['P1'] },
  { id: 'undo-is-dead', file: 'lantern.js', from: 'function undo() { if (!history.past.length) return;', to: 'function undo() { return;', breaks: ['P2', 'P11'] },
  { id: 'the-editor-ignores-the-drag', file: 'lantern.js', from: "edit({ op: 'move', side: 'left', i: drag.i, xy: q([v.x, -v.y]) }, { during: true });", to: '0;', breaks: ['P3'] },
  { id: 'a-preset-is-not-applied', file: 'lantern.js', from: 'state = { ...state, ...st, width: state.width };     // a preset is a shape; the size is hers', to: 'state = { ...state };', breaks: ['P4'] },
  { id: 'the-clamp-is-not-shown', file: 'lantern.js', from: "li.className = n.kind === 'clamp' ? 'warn' : n.kind;", to: "li.className = 'info';", breaks: ['P5'] },
  { id: 'the-cuts-are-not-drawn-flat', file: 'lantern.js', from: "flatSvg.append(el('path', { class: 'cutpat', d: path(c.poly, true) }));", to: '0;', breaks: ['P10'] },
  { id: 'the-svg-has-no-cuts', file: 'lantern.js', from: "const exportSvg = (which) => G.flatSvg(model, which, { cuts: state.patMode === 'none' ? [] : PAT.placeCuts(model, pattern, state).map((c) => c.poly) });", to: "const exportSvg = (which) => G.flatSvg(model, which);", breaks: ['P10'] },
  { id: 'the-folded-view-has-no-cuts', file: 'lantern.js', from: "bounds: model.rt, textureOf: texOf, colourOf });", to: "bounds: model.rt, colourOf });", breaks: ['P10', 'P15', 'P16'] },
  { id: 'an-island-is-not-a-problem', file: 'lantern.js', from: "if (pc.island) cutFindings.push({ kind: 'bad',", to: "if (pc.island) cutFindings.push({ kind: 'info',", breaks: ['P12'] },
  { id: 'a-finding-click-does-not-zoom', file: 'lantern.js', from: "if (n.issue) { li.title = 'show in the Flat view'; li.addEventListener('click', () => focusIssue(n.issue)); }", to: "if (n.issue) { li.title = 'show in the Flat view'; }", breaks: ['P12'] },
  { id: 'the-random-pattern-keeps-islands', file: 'lantern.js', from: "const score = pat.counts.island * 100 + pat.counts.thin + pat.counts.narrow + pat.counts.keepout;", to: "const score = 0;", breaks: ['P13'] },
  { id: 'a-preset-stock-keeps-the-old-caliper', file: 'lantern.js', from: "if (id === 'material' && value !== 'custom') { const m = MAT.MATERIALS.find((x) => x.id === value); state.gsm = m.gsm; state.caliper = m.t; }", to: "0;", breaks: ['P14'] },
  { id: 'the-pattern-ignores-the-rules', file: 'lantern.js', from: "pattern = PAT.patternForModel(model, state, rules, { validate: commit || !pattern });", to: "pattern = PAT.patternForModel(model, state, PAT.RULES_DEFAULT, { validate: commit || !pattern });", breaks: ['P14'] },
  { id: 'the-zip-drops-the-readme', file: 'lantern.js', from: "zip.file('README.txt', EXP.readme(model, plan, state, rules));", to: '0;', breaks: ['P14'] },
  { id: 'the-backing-is-not-drawn', file: 'lantern.js', from: "const colourOf = backing ? (part) => (part.solid ? null : BLD.colourOfPoint(state, part.j)) : null;", to: "const colourOf = null;", breaks: ['P15'] },
  { id: 'the-zip-drops-the-backing-sheets', file: 'lantern.js', from: "plan.backingSheets.forEach((sh, k) => { sh.machine = plan.machine; zip.file(", to: "[].forEach((sh, k) => { sh.machine = plan.machine; zip.file(", breaks: ['P15'] },
  { id: 'the-page-opens-folded', file: 'lantern.js', from: "setView('lit');\n\n/* the page's test chrome */", to: "setView('folded');\n\n/* the page's test chrome */", breaks: ['P0', 'P16'] },
  /* the shadow pass takes the cut-out from the OBJECT material's alphaMap + alphaTest (three copies them onto the distance
     material), so the defect that ships a solid shadow is alphaTest 0 on the cut material — the one this project hit */
  { id: 'the-shadow-ignores-the-holes', file: 'lantern-view.js', from: "if (lit) { m.emissive = kelvin(lit.warmth); m.emissiveIntensity = 1.0 * lit.brightness; m.emissiveMap = glowFor(canvas); m.needsUpdate = true; }", to: "if (lit) { m.emissive = kelvin(lit.warmth); m.emissiveIntensity = 1.0 * lit.brightness; m.emissiveMap = glowFor(canvas); m.alphaTest = 0; m.needsUpdate = true; }", breaks: ['P16'] },
  { id: 'the-lit-settings-are-not-stored', file: 'lantern.js', from: "const LIT_FIELDS = ['litWarmth', 'litBrightness', 'litRoom', 'litWall'];", to: "const LIT_FIELDS = ['litBrightness', 'litRoom', 'litWall'];", breaks: ['P16'] },
  { id: 'the-lamp-ignores-the-wall-distance', file: 'lantern-view.js', from: "wall.position.set(0, 0, -d); wall.scale", to: "wall.position.set(0, 0, -radius * 1.4); wall.scale", breaks: ['P16'] },
  { id: 'the-build-view-stays-hidden', file: 'lantern.js', from: "$('buildView').toggleAttribute('hidden', name !== 'build');", to: "$('buildView').toggleAttribute('hidden', true);", breaks: ['P15'] },
  { id: 'the-design-is-not-stored', file: 'lantern.js', from: "function persist() { try { localStorage.setItem(STORE, snap(state)); }", to: 'function persist() { try { 0; }', breaks: ['P7', 'P13', 'P15', 'P16'] },
];

function print(res, label) { let f = 0; for (const [p, m] of res) { console.log(`${p ? 'ok  ' : 'FAIL'} ${m}`); if (!p) f++; } console.log(`\n${label}: ${res.length - f} of ${res.length} passed`); return f; }

if (!NEG) {
  const fails = print(await run(), 'verify-lantern-page');
  process.exit(fails ? 1 : 0);
} else {
  const srcs = {};
  let bad = 0;
  for (const m of MUTANTS) { srcs[m.file] ??= fs.readFileSync(path.join(REPO, m.file), 'utf8'); const n = srcs[m.file].split(m.from).length - 1; if (n !== 1) { console.log(`ANCHOR ${m.id}: matches ${n} times`); bad++; } }
  if (bad) process.exit(1);
  const clean = await run();
  const names = clean.map(([, msg]) => msg.split(':')[0]);
  for (const m of MUTANTS) for (const b of m.breaks) if (!names.includes(b)) { console.log(`STALE NAME ${m.id} claims ${b}`); bad++; }
  if (clean.some(([p]) => !p) || bad) { print(clean, 'clean'); console.log('the clean tree does not pass; the control cannot run'); process.exit(1); }
  for (const m of MUTANTS) {
    if (ONLY.length && !ONLY.includes(m.id)) continue;
    const res = await run({ [`/${m.file}`]: srcs[m.file].replace(m.from, m.to) });
    const red = res.filter(([p]) => !p).map(([, msg]) => msg.split(':')[0]);
    const missed = m.breaks.filter((b) => !red.includes(b)), unclaimed = red.filter((r) => !m.breaks.includes(r));
    const good = !missed.length && !unclaimed.length;
    console.log(`${good ? 'ok  ' : 'BAD '} ${m.id}: reddened ${red.join(', ') || 'nothing'}${missed.length ? ` — MISSED ${missed.join(', ')}` : ''}${unclaimed.length ? ` — UNCLAIMED ${unclaimed.join(', ')}` : ''}`);
    if (!good) bad++;
  }
  console.log(`\nnegative control: ${MUTANTS.length - bad} of ${MUTANTS.length} mutants behave`);
  process.exit(bad ? 1 : 0);
}
