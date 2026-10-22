#!/usr/bin/env node
/* verify-lantern-page.mjs — the /lantern page, driven in headless Chromium
   with REAL pointer events and downloads (lantern-design-doc.md §13). The
   geometry is the Node gate's (tools/verify-lantern.mjs); this asks whether
   the page's controls write the state, whether the hand lands where the
   geometry says, and whether its buttons give the files they claim.

     P0  the page loads clean on the defaults: the Folded view, both halves
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

   --negative-control re-serves deliberately broken copies of lantern.js and
   requires each to fail the check that names it. Every anchor is checked
   first. */

import fs from 'node:fs';
import path from 'node:path';
import { openLantern, REPO } from './lantern-page-harness.mjs';
import * as G from '../lantern-geometry.js';

const args = process.argv.slice(2);
const NEG = args.includes('--negative-control');
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);

async function download(page, trigger) {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), trigger()]);
  const p = await d.path();
  return { name: d.suggestedFilename(), text: fs.readFileSync(p, 'utf8') };
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
      ok(!errors.length && m.N === 5 && m.ok && m.tris === want && m.frames > 0 && m.view === 'folded' && m.running, `P0: loads clean on the Folded view — N ${m.N}, ${m.tris} triangles (geometry says ${want}), ${m.frames} frames, errors: ${errors.join(' | ') || 'none'}`);
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
      const thumbs = await T(() => [...document.querySelectorAll('.ln-preset svg path')].length);
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
      ok(badge === 'ok' && /finished/.test(dims) && /flat/.test(dims) && /″/.test(dims) && /mm deep/.test(dims), `P9: the badge reads "${badge}" and the read-out prints finished and flat sizes with inches`);
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
  { id: 'undo-is-dead', file: 'lantern.js', from: 'function undo() { if (!history.past.length) return;', to: 'function undo() { return;', breaks: ['P2'] },
  { id: 'the-editor-ignores-the-drag', file: 'lantern.js', from: "edit({ op: 'move', side: 'left', i: drag.i, xy: q([v.x, -v.y]) }, { during: true });", to: '0;', breaks: ['P3'] },
  { id: 'a-preset-is-not-applied', file: 'lantern.js', from: 'state = { ...state, ...st, width: state.width };     // a preset is a shape; the size is hers', to: 'state = { ...state };', breaks: ['P4'] },
  { id: 'the-clamp-is-not-shown', file: 'lantern.js', from: "li.className = n.kind === 'clamp' ? 'warn' : n.kind;", to: "li.className = 'info';", breaks: ['P5'] },
  { id: 'the-design-is-not-stored', file: 'lantern.js', from: "function persist() { try { localStorage.setItem(STORE, snap(state)); }", to: 'function persist() { try { 0; }', breaks: ['P7'] },
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
