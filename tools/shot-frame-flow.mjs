#!/usr/bin/env node
/* shot-frame-flow.mjs <dir> [--png <file>] [--round <n>] [--only <regex>] —
   the flow study's sheet (docs/frame-flow-study.md): every default skeleton
   (oval, rectangle, arch — the oval and rectangle with the bottom run on)
   front-on at the default 180 mm print in three layouts — the RINCEAU as on
   `main` (no ornFlow), the flow ON THE BAND (ornFlow 'band') and the flow as
   the OUTER CONTOUR (ornFlow 'contour') — then the oval's close-ups in both
   flow layouts (the upper shoulder where the two flows meet, the side, the
   bottom) and a three-quarter view of each whole oval.

   Every cell is the page's own Relief view (Node's bytes, §19), the camera
   pinned to a print-mm point and radius; every caption is a Node build of the
   same params through tools/frame-flow-measure.mjs (repetition, continuity,
   following, print). No pixel claim anywhere: the sheet is for ruling by eye.
   Writes <dir>/index.html and <dir>/frame-flow.png (or --png). */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { loadTree, measureCase, line, CASES } from './frame-flow-measure.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'frame-flow-sheet');
fs.mkdirSync(OUT, { recursive: true });
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const PNG = arg('--png') ? path.resolve(arg('--png')) : path.join(OUT, 'frame-flow.png');
const ROUND = arg('--round') || '';
const ONLY = arg('--only') ? new RegExp(arg('--only')) : null;

const T = await loadTree(ROOT);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
function serve(root) {
  return new Promise((res) => {
    const s = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}
const browser = await chromium.launch();
const errors = [];
const server = await serve(ROOT);
const page = await browser.newPage({ viewport: { width: 760, height: 760 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => errors.push(String(e)));
await page.route('**fonts.googleapis.com/**', (r) => r.abort());
await page.route('**fonts.gstatic.com/**', (r) => r.abort());
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); } catch { route.abort(); }
});
await page.goto(`http://127.0.0.1:${server.address().port}/frame.html`);
await page.waitForFunction(() => !!window.__frame);
await page.addStyleTag({ content: '.fr-panel,.fr-header,.fr-viewtoggle{display:none!important} .fr-stage{right:0!important;padding:0!important}' });
await page.evaluate(() => window.__frame.setView('3d'));
await page.waitForFunction(() => window.__frame.view() === '3d' && window.__frame.view3dInk() !== null, null, { timeout: 120000 });

async function shoot(params, cam) {
  await page.evaluate((p) => window.__frame.setParams(p), params);
  await page.evaluate((v) => window.__frame.pinCamera(v), cam);
  await page.waitForTimeout(150);
  let png = null, prev = null;
  for (let i = 0; i < 8; i++) { png = await page.screenshot({ type: 'png' }); if (prev && prev.equals(png)) break; prev = png; await page.waitForTimeout(120); }
  return png.toString('base64');
}
// a print-mm point on the oval: the shoulder (the flows' meeting, ~30 % down),
// the side, the bottom — off the page's own model and relief scale
async function target(where) {
  return page.evaluate((where) => {
    const m = window.__frame.model(), s = window.__frame.stl().info, A = m.info.anchors, b = m.frameBox || m.box;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, hw = (b.x1 - b.x0) / 2, hh = (b.y1 - b.y0) / 2;
    let pt;
    if (where === 'shoulder') { const t = 0.62; pt = [cx + hw * Math.sin(t), cy + hh * Math.cos(t)]; }
    else if (where === 'side') pt = A.sideR.pt;
    else if (where === 'bottom') pt = [0, b.y0 + 0.08 * (b.y1 - b.y0)];
    else pt = [cx, cy];
    return [pt[0] * s.scale, pt[1] * s.scale, s.plateT];
  }, where);
}
const MODES = [['the rinceau (main)', {}], ['flow — on the band', { ornFlow: 'band' }], ['flow — outer contour', { ornFlow: 'contour' }]];
const rows = [];
const want = (l) => !ONLY || ONLY.test(l);
const cap = (params) => { const r = measureCase(T, params); return { text: line(r), told: r.told, r }; };
const metrics = {};
for (const [sk, q] of CASES) {
  if (!want(`whole ${sk}`)) continue;
  const cells = [];
  for (const [nm, mq] of MODES) {
    const params = { filigree: 'scrolls', ...q, ...mq };
    const c = cap(params); metrics[`${sk}/${nm}`] = c.r;
    cells.push({ label: `${sk} · ${nm} · front-on`, png: await shoot(params, { dir: [0, 0, 1], radius: sk === 'oval' ? 440 : 420 }), cap: c.text, told: c.told });
  }
  rows.push({ head: `the whole ${sk} at the default 180 mm print, front-on`, cells });
}
for (const [nm, mq] of MODES.slice(1)) {
  if (!want(`oval close ${nm}`)) continue;
  const params = { filigree: 'scrolls', ...CASES[0][1], ...mq }, cells = [];
  await page.evaluate((p) => window.__frame.setParams(p), params);
  for (const [where, dir, radius] of [['shoulder', [0, 0, 1], 95], ['side', [0, 0, 1], 95], ['bottom', [0, 0, 1], 105], ['centre', [0.55, 0.35, 1], 470]]) {
    const t = await target(where);
    cells.push({ label: `oval · ${nm} · ${where === 'centre' ? 'three-quarter, whole' : `${where}, front-on`}`, png: await shoot(params, { dir, radius, target: t }), cap: '', told: [] });
  }
  rows.push({ head: `the oval, ${nm}: the upper shoulder (where the flows meet), the side, the bottom, and three-quarter`, cells });
}
await page.evaluate(() => window.__frame.pinCamera(null));
server.close();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = `<!doctype html><meta charset="utf-8"><title>frame flow study${ROUND ? ' — round ' + ROUND : ''}</title>
<style>body{background:#EDEDE8;color:#0A0A0C;font:12px/1.45 monospace;margin:16px} .row{display:flex;gap:10px;margin:6px 0 18px;flex-wrap:wrap} .cell{width:380px} .cell img{width:380px;height:380px;display:block;border:1px solid #bbb;background:#fff} h2{font-size:13px;margin:14px 0 4px} .cap{font-size:10.5px;color:#333} .told{font-size:10px;color:#8a3a2a}</style>
<h1 style="font-size:15px">/frame — the flow study${ROUND ? `, round ${ROUND}` : ''}: the rinceau on main beside the flow model (ornFlow band / contour)</h1>
<p class="cap">Node builds of the same params give every caption (tools/frame-flow-measure.mjs). Repetition: pairs of scroll elements on one side sharing a shape (length within 5 %, turns within 0.08, curvature profile RMS within 0.15); continuity: tangent / curvature jump at every hand-off; following: the body's angle to the frame's tangent.</p>
${rows.map((r) => `<h2>${esc(r.head)}</h2><div class="row">${r.cells.map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div><b>${esc(c.label)}</b></div><div class="cap">${esc(c.cap)}</div>${c.told.length ? `<div class="told">${c.told.map(esc).join('<br>')}</div>` : ''}</div>`).join('')}</div>`).join('')}
${errors.length ? `<p class="told">page errors: ${errors.map(esc).join('; ')}</p>` : ''}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(metrics, (k, v) => (k === 'told' ? undefined : v), 1));
try {
  const p2 = await browser.newPage({ viewport: { width: 1220, height: 900 } });
  await p2.goto(`file://${path.join(OUT, 'index.html')}`);
  await p2.screenshot({ path: PNG, fullPage: true });
} catch (e) { console.log(`the sheet PNG was not written: ${e.message}`); }
// every cell as its own file (the critic reads them at full size)
fs.mkdirSync(path.join(OUT, 'cells'), { recursive: true });
let ci = 0; for (const r of rows) for (const c of r.cells) fs.writeFileSync(path.join(OUT, 'cells', `${String(ci++).padStart(2, '0')}-${c.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}.png`), Buffer.from(c.png, 'base64'));
await browser.close();
console.log(`wrote ${path.join(OUT, 'index.html')} and ${PNG}${errors.length ? ` — ${errors.length} page errors: ${errors.slice(0, 3).join(' | ')}` : ''}`);
