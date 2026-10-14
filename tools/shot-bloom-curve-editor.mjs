#!/usr/bin/env node
/* shot-bloom-curve-editor.mjs — THE CURVE EDITOR'S SHEET (the curve-editor
   session, Oct 14; docs/bloom-curve-editor.md).

   The widget in symmetric and in two-sided mode, and a REFUSED drag caught
   with the pointer still down (the point where it last was, ringed, and the
   validator's reason under the editor), each at a DESKTOP viewport (1280 x
   900) and a NARROW one (390 x 844, a phone) — six cells. Every cell is the
   real page: the editor mounted through the page's capability hook
   (`__bloomCurveTest`) on the panel gate's own test outline and test
   validator, every gesture a REAL mouse event at a point the editor itself
   projects, and each caption carries the editor's VALUE as the page reports
   it, never what this tool asked for. No pixel delta is quoted: nothing here
   compares two renders (the noise-floor rule in CLAUDE.md).

   Run: node tools/shot-bloom-curve-editor.mjs <dir> [--png <sheet.png>]
   Writes <dir>/<cell>.png, <dir>/index.html and the composed sheet (default
   <dir>/curve-editor.png). Needs playwright-core and three@0.161.0
   (npm i --no-save). */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom } from './bloom-harness.mjs';

const argv = process.argv.slice(2);
const dir = argv.find((a) => !a.startsWith('--'));
if (!dir) { console.error('usage: node tools/shot-bloom-curve-editor.mjs <dir> [--png <sheet.png>]'); process.exit(2); }
const pngAt = argv.indexOf('--png');
const sheetPath = pngAt >= 0 ? argv[pngAt + 1] : path.join(dir, 'curve-editor.png');
fs.mkdirSync(dir, { recursive: true });

/* the panel gate's route (af) test outline and validator, restated */
const SPEC = { modes: ['symmetric', 'two-sided'], x: [0, 1], y: [0, 0.4], lock: { first: 'x', last: 'x' }, monotoneX: true, points: [2, 12], owner: 'petalLength' };
const START = { mode: 'symmetric', points: [[0, 0.08], [0.28, 0.2], [0.55, 0.24], [1, 0.03]] };
const LIMIT = 0.30;

const VIEWPORTS = [{ name: 'desktop', w: 1280, h: 900 }, { name: 'narrow', w: 390, h: 844 }];
const { server, port } = await serveRepo();
const cells = [];
for (const vp of VIEWPORTS) {
  const { browser, page } = await launchPage({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await openBloom(page, port);
  await page.evaluate(([spec, value, limit]) => window.__bloomCurveTest.mount({
    label: 'Test outline', spec, value,
    validate: (cand) => {
      const s = window.__bloomCurveTest.law.curveSamples(cand, spec);
      const m = Math.max(...s.left.map((q) => q[1]), ...(s.right || []).map((q) => q[1]));
      return m > limit ? `the drawn half-width ${m.toFixed(3)} passes the test limit ${limit}` : null;
    },
  }), [SPEC, START, LIMIT]);
  const T = (fn, ...a) => page.evaluate(([f, args]) => window.__bloomCurveTest[f](...args), [fn, a]);
  const drag = async (side, i, to, release = true, steps = 6) => {
    const a = await T('pointClient', side, i), b = await T('fracClient', side, to);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps });
    if (release) await page.mouse.up();
  };
  const clipOf = () => page.evaluate(() => { const r = document.querySelector('.bl-curve-test').getBoundingClientRect(); return { x: Math.max(0, r.x - 10), y: Math.max(0, r.y - 10), width: r.width + 20, height: r.height + 20 }; });
  const shoot = async (name, title) => {
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const file = `${vp.name}-${name}.png`;
    await page.screenshot({ path: path.join(dir, file), clip: await clipOf() });
    const v = await T('value');
    cells.push({ vp: vp.name, file, title, value: JSON.stringify(v), said: await T('said'), status: await T('status'), dims: await T('dims') });
  };
  /* symmetric: the left side drawn, its mirror dashed, one drag to shape it */
  await drag('left', 2, [0.55, 0.27]);
  await shoot('symmetric', 'symmetric — one half drawn, the mirror dashed');
  /* a refused drag, pointer still down */
  const before = JSON.stringify(await T('value'));
  await drag('left', 2, [0.55, 0.37], false, 1);
  await shoot('refused', 'a refused drag, pointer still down');
  await page.mouse.up();
  const after = JSON.stringify(await T('value'));
  cells[cells.length - 1].held = after === before;
  /* two-sided: the right side given its own shape */
  await page.selectOption('.bl-curve-test select', 'two-sided');
  await drag('right', 1, [0.3, 0.1]);
  await drag('right', 2, [0.66, 0.13]);
  await shoot('two-sided', 'two-sided — each side its own handles');
  if (errors.length) console.error(`${vp.name}: page errors: ${errors.join(' | ')}`);
  await browser.close();
}
server.close();

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const html = `<!doctype html><meta charset="utf-8"><title>Curve editor</title>
<style>body{margin:0;padding:22px;background:#0c0f0e;color:#e8ece9;font:12px "IBM Plex Mono",monospace}
h1{font:500 20px Georgia,serif;margin:0 0 4px}p.sub{color:#9aa8a0;margin:0 0 16px;max-width:1100px;line-height:1.45}
.row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px}.cell{border:1px solid #24302b;border-radius:8px;padding:10px;background:#101412}
.cell img{width:100%;display:block;border-radius:6px}.t{color:#8fd6b8;margin:0 0 6px;font-size:12px}.v{color:#9aa8a0;font-size:10.5px;line-height:1.4;word-break:break-all;margin-top:6px}.vp{color:#9aa8a0;letter-spacing:.14em;text-transform:uppercase;font-size:10px;margin:0 0 8px}</style>
<h1>Curve editor — the panel widget (no geometry consumer yet)</h1>
<p class="sub">Mounted through <code>__bloomCurveTest</code> on the panel gate's test outline (x 0..1, y 0..0.4 of Petal length, ends x-locked, a function curve) with a test validator refusing a drawn half-width past ${LIMIT}. Real mouse events; each caption is the editor's own value. Desktop 1280 × 900 and narrow 390 × 844, device scale 2.</p>
${VIEWPORTS.map((vp) => `<div class="vp">${vp.name} — ${vp.w} × ${vp.h}</div><div class="row">${cells.filter((c) => c.vp === vp.name).map((c) => `<div class="cell"><p class="t">${esc(c.title)}</p><img src="${c.file}"><div class="v">${esc(c.said)} · ${esc(c.dims)}${c.status ? `<br>status: ${esc(c.status)}` : ''}${c.held !== undefined ? `<br>value after release ${c.held ? 'IDENTICAL to before the drag' : 'MOVED'}` : ''}<br>${esc(c.value)}</div></div>`).join('')}</div>`).join('')}`;
fs.writeFileSync(path.join(dir, 'index.html'), html);

/* the composed sheet: the index rendered */
{
  const { server: s2, port: p2 } = await serveRepo(path.resolve(dir));
  const { browser, page } = await launchPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${p2}/index.html`, { waitUntil: 'load' });
  await page.screenshot({ path: sheetPath, fullPage: true });
  await browser.close(); s2.close();
}
for (const c of cells) console.log(`${c.vp.padEnd(8)} ${c.title}: ${c.said}${c.status ? ` — ${c.status}` : ''}${c.held !== undefined ? ` — held ${c.held}` : ''}`);
console.log(`sheet: ${sheetPath}`);
