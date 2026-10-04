#!/usr/bin/env node
/* shot-bug-wing-library.mjs <dir> — the WING-SHAPE LIBRARY sheet
   (bug-project-design-doc.md §13): the gallery as it sits in the real page's
   panel; six library shapes applied to the default bug by a REAL click on
   their thumbnail (the SVG export, and the page's 3D view at 3/4); and six
   RANDOMIZE WINGS blends, each with the label the page printed. Every number
   in a caption is read off the model or the page; no pixel claim. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import * as G from '../bug-geometry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'bug-wing-library');
fs.mkdirSync(OUT, { recursive: true });
const APPLIED = [2, 5, 9, 13, 16, 17];
const SEEDS = [1, 2, 3, 4, 5, 6];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => d.startsWith('chromium-')).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`).find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); } catch { route.abort(); }
});
await page.route('**fonts.googleapis.com/**', (r) => r.abort());
await page.route('**fonts.gstatic.com/**', (r) => r.abort());
await page.goto(`${base}/bug.html`);
await page.waitForFunction(() => !!window.__bug);

// 1. the gallery in the page: the panel, scrolled to the section
await page.evaluate(() => document.getElementById('wlSec').scrollIntoView({ block: 'start' }));
const panelBox = await page.locator('.bg-panel').boundingBox();
const gallery = (await page.screenshot({ type: 'png', clip: { x: panelBox.x, y: panelBox.y, width: panelBox.width, height: Math.min(panelBox.height, 560) } })).toString('base64');
const libState = await page.evaluate(() => window.__bug.library());

// undo: a real click on a thumbnail, then on Undo, must give back the params byte for byte
await page.evaluate(() => document.getElementById('randomBtn').click());
const beforeUndo = await page.evaluate(() => JSON.stringify(window.__bug.getParams()));
{ const [ux, uy] = await page.evaluate(() => window.__bug.libraryScreen(7)); await page.mouse.click(ux, uy); }
const afterApply = await page.evaluate(() => JSON.stringify(window.__bug.getParams()));
await page.evaluate(() => document.getElementById('wlUndo').scrollIntoView({ block: 'center' }));
await page.click('#wlUndo');
const afterUndo = await page.evaluate(() => JSON.stringify(window.__bug.getParams()));
const undoOk = afterApply !== beforeUndo && afterUndo === beforeUndo;
const undoLine = `undo: apply #7 to a randomized bug then Undo — ${undoOk ? 'params restored byte for byte' : 'NOT restored'}`;

const hide = await page.addStyleTag({ content: '.bg-panel,.bg-view,.bg-header,.bg-edbar,.bg-viewtoggle{visibility:hidden!important}' });
async function capture() {
  const p = await page.evaluate(() => window.__bug.getParams());
  const m = G.buildBug(p), ex = G.exportSvg(m);
  await page.evaluate(() => { window.__bug.flushBuild(); window.__bug.setView('three'); });
  const img = (await page.screenshot({ type: 'png' })).toString('base64');
  await page.evaluate(() => window.__bug.setView('top'));
  const svg = ex.svg.replace(/<\?xml[^>]*>/, '').replace(/width="[^"]*"/, 'width="100%"').replace(/height="[^"]*"/, '');
  return { svg, img, tris: m.triangleCount, notes: m.notes, floor: m.floorViolations.length };
}

// 2. six shapes applied by a REAL click on the thumbnail
const applied = [];
for (const id of APPLIED) {
  await page.evaluate(() => document.getElementById('resetBtn').click());
  await hide.evaluate((e) => (e.disabled = true));
  const [cx, cy] = await page.evaluate((i) => window.__bug.libraryScreen(i), id);
  await page.mouse.click(cx, cy);
  await hide.evaluate((e) => (e.disabled = false));
  const st = await page.evaluate(() => window.__bug.library());
  applied.push({ id, ...(await capture()), message: st.message, selected: st.selected });
}

// 3. six RANDOMIZE WINGS blends on the default bug, labels as the page printed them
const blends = [];
for (const seed of SEEDS) {
  await page.evaluate(() => document.getElementById('resetBtn').click());
  const r = await page.evaluate((s) => window.__bug.randomWings(s), seed);
  const st = await page.evaluate(() => window.__bug.library());
  blends.push({ seed, label: r.label, tries: r.blend && r.blend.tries, ...(await capture()), message: st.message });
}

const cell = (title, c, extra) => `<div class="c"><div class="k">${title}</div>${c.svg}<img src="data:image/png;base64,${c.img}"><div>${extra}<br>${c.tris.toLocaleString()} tris · STL ${c.floor ? 'REFUSED (floor)' : 'exports'}${c.notes.length ? ' · ' + c.notes.join('; ') : ''}</div></div>`;
const html = `<!doctype html><meta charset="utf-8"><title>bug — wing-shape library</title><style>
body{margin:0;background:#f4f3ee;color:#111;font:11px/1.35 ui-monospace,monospace;padding:16px;width:1900px}
h1{font-size:16px;margin:0 0 4px} h2{font-size:13px;margin:16px 0 6px} .g{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.c{background:#fff;border:1px solid #ccc;padding:6px} .c img{width:100%;display:block;margin-top:4px} .c svg{display:block;background:#0A0A0C;max-height:300px}
.k{font-size:14px;font-weight:bold} .gal{display:flex;gap:16px;align-items:flex-start} .gal img{border:1px solid #ccc}
</style><h1>Wing-shape library — ${libState.ids.length} shapes, outlines only</h1>
<div>A click applies a shape's fore- and hindwing outlines (with its tail) and nothing else; RANDOMIZE WINGS blends two shapes at a random t and re-rolls a blend that crosses or is under the floor. Each cell: the SVG export, then the page's 3D view at 3/4.</div>
<h2>The gallery, in the page's panel</h2><div class="gal"><img src="data:image/png;base64,${gallery}"><div>${libState.thumbs} thumbnails · ${undoLine} · unlabeled (a name can be typed for the last applied shape, kept in this browser) · Undo ${libState.undoDisabled ? 'disabled (nothing to undo yet)' : 'enabled'}</div></div>
<h2>Six shapes applied to the default bug (a real click on each thumbnail)</h2><div class="g">${applied.map((c) => cell(`shape #${c.id}`, c, `page: “${c.message}” · highlighted: #${c.selected.join(',')}`)).join('')}</div>
<h2>Six RANDOMIZE WINGS blends (seeds ${SEEDS.join(', ')})</h2><div class="g">${blends.map((c) => cell(c.label, c, `page: “${c.message}” · tries ${c.tries}`)).join('')}</div>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sh = await browser.newPage({ viewport: { width: 1932, height: 900 } });
await sh.goto('file://' + path.join(OUT, 'index.html'));
await sh.screenshot({ path: path.join(OUT, 'bug-wing-library.png'), fullPage: true });
await browser.close(); server.close();
console.log(undoLine);
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
for (const c of applied) console.log('applied', c.id, c.tris, c.floor, c.notes.join('; '), '|', c.message);
for (const c of blends) console.log('blend', c.seed, c.label, c.tries, c.floor, c.notes.join('; '));
if (errors.length || !undoOk) process.exit(1);
