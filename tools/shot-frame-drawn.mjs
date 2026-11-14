#!/usr/bin/env node
/* shot-frame-drawn.mjs — the hand-drawn filigree's PROOF sheet (docs/frame-flow-study.md §12):
   the three default frames built from the template's PLACEHOLDER drawings (ornFlow 'drawn') beside the forms round
   they were made from (F6, ornFlow 'forms'), so the import path is seen to reproduce it; the PLAN of where every
   drawing lands, coloured by depth; close-ups of the drawn relief; and the template itself.

     node tools/shot-frame-drawn.mjs <dir> [--png <file>] [--drawing <svg>] [--only <regex>]

   --drawing builds from another drawing (Eva's) instead of the placeholders, and puts it on the sheet beside F6.
   Every number is measured: coverage (tools/frame-mass-coverage.mjs), triangles, and the PLAN AGREEMENT between
   the two builds — the intersection over union of their solid cells, read off the same raster (both build on
   ownersGrid's cells). No pixel delta is quoted: two renders are compared by eye, the plans by number. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { loadTree } from './frame-flow-measure.mjs';
import { coverageOf } from './frame-mass-coverage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'frame-drawn-sheet');
fs.mkdirSync(OUT, { recursive: true });
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const PNG = arg('--png') ? path.resolve(arg('--png')) : path.join(OUT, 'frame-drawn.png');
const DRAWING = arg('--drawing') ? fs.readFileSync(path.resolve(arg('--drawing')), 'utf8') : null;
const ONLY = arg('--only') ? new RegExp(arg('--only')) : null;
const want = (l) => !ONLY || ONLY.test(l);
const CASES = [['oval', { skeleton: 'oval', ornBottom: 'on' }], ['rect', { skeleton: 'rect', ornBottom: 'on' }], ['arch', {}]];

const T = await loadTree(ROOT);
const C = await import(path.join(ROOT, 'frame-compose.js'));
const DR = await import(path.join(ROOT, 'frame-drawn.js'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
function serve(root) {
  return new Promise((res) => {
    const s = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}
const browser = await chromium.launch();
// the 2-D cells (the plans, the template) and the sheet itself in a SECOND browser: a second page beside the WebGL one
// fails Page.captureScreenshot on this box
const browser2 = await chromium.launch();
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
await page.waitForFunction(() => window.__frame.view() === '3d' && window.__frame.view3dInk() !== null, null, { timeout: 180000 });
if (DRAWING) await page.evaluate((svg) => window.__frame.setDrawing && window.__frame.setDrawing(svg), DRAWING);

async function shoot(params, cam) {
  await page.evaluate((p) => window.__frame.setParams(p), params);
  await page.evaluate((v) => window.__frame.pinCamera(v), cam);
  await page.waitForTimeout(150);
  let png = null, prev = null;
  for (let i = 0; i < 8; i++) { png = await page.screenshot({ type: 'png' }); if (prev && prev.equals(png)) break; prev = png; await page.waitForTimeout(120); }
  return png.toString('base64');
}
async function svgPng(svg, w, h) {
  const p2 = await browser2.newPage({ viewport: { width: w, height: h } });
  await p2.setContent(`<html><body style="margin:0;background:#fff">${svg}</body></html>`);
  await p2.waitForTimeout(150);
  const b = await p2.screenshot({ type: 'png' }); await p2.close();
  return b.toString('base64');
}
const pct = (v) => (100 * v).toFixed(1) + ' %';
const build = (params) => { const m = T.FL.withOrnament(T.G.buildFrame({ ...T.G.DEFAULTS, ...params }), { drawing: DRAWING }); const r = T.RL.buildRelief(m); return { m, r }; };
// the two builds' solid cells on the same raster (both stand on ownersGrid's cells): their intersection over union
function planOf(params, mode) {
  const model = T.G.buildFrame({ ...T.G.DEFAULTS, ...params, ornFlow: mode });
  const orn = C.composeFor({ ...model, params: { ...model.params, ornLeaves: 'off' } }, {});
  const SF = C.frameOf(orn.flow.side);
  return mode === 'forms' ? T.FF.formsFor(model, orn, SF) : DR.drawnFor(model, orn, SF, { drawing: DRAWING });
}
const rows = [], metrics = {};
const plans = [];
for (const [sk, q] of CASES) {
  if (!want(`whole ${sk}`)) continue;
  const base = { filigree: 'scrolls', ...q };
  const A = planOf(base, 'forms'), B = planOf(base, 'drawn');
  let inter = 0, uni = 0; const a = A.debug.Rg, b = B.debug.Rg;
  for (let k = 0; k < a.length; k++) { if (a[k] && b[k]) inter++; if (a[k] || b[k]) uni++; }
  const iou = inter / uni;
  const cells = [];
  for (const [nm, mode] of [['round 4 — the forms (F6)', 'forms'], [DRAWING ? 'the drawn filigree (the given drawing)' : 'the drawn filigree (the template\'s placeholders)', 'drawn']]) {
    const params = { ...base, ornFlow: mode };
    const { m, r } = build(params), cv = coverageOf(m, r, T.RL);
    metrics[`${sk}/${mode}`] = { fill: cv.fill, attach: cv.attach, tris: r.info.triangles, told: m.ornament.told };
    cells.push({ label: `${sk} · ${nm} · front-on`, png: await shoot(params, { dir: [0, 0, 1], radius: sk === 'oval' ? 440 : 420 }), cap: `fill ${pct(cv.fill)} of the zone (2.webp's bronze 59.3 %), attached ${pct(cv.attach)} · ${r.info.triangles.toLocaleString('en-US')} triangles${mode === 'drawn' ? ` · plan agreement with F6 (IoU of the solid cells) ${pct(iou)}` : ''}` });
  }
  metrics[`${sk}/iou`] = iou;
  // the PLAN of the placements: every drawn part's outline where it lands (right half), coloured by depth
  const g = B.debug.g, els = B.debug.els, COL = { back: '#9a958d', mid: '#4a4744', front: '#1d1c1a' };
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const e of els) for (const r of e.rings) for (const [x, y] of r) { x0 = Math.min(x0, x, -x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const sc = 360 / Math.max(x1 - x0, y1 - y0), tx = (x) => ((x - x0) * sc + 10).toFixed(1), ty = (y) => ((y1 - y) * sc + 10).toFixed(1);
  const sil = T.RL.plateOutline(B.debug.model || T.G.buildFrame({ ...T.G.DEFAULTS, ...base, ornFlow: 'drawn' }));
  const s = B.stats;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="380" viewBox="0 0 380 380"><rect width="380" height="380" fill="#fbfaf7"/>`
    + els.map((e) => e.rings.map((r) => `<path d="${r.map((p, i) => `${i ? 'L' : 'M'}${tx(p[0])} ${ty(p[1])}`).join('')}Z" fill="${COL[e.depth]}" fill-opacity="0.55" stroke="${COL[e.depth]}" stroke-width="0.5"/>`).join('')).join('')
    + B.debug.holes.filter((h) => h.poly).map((h) => `<path d="${h.poly.map((p, i) => `${i ? 'L' : 'M'}${tx(p[0])} ${ty(p[1])}`).join('')}Z" fill="#fff" stroke="#c33" stroke-width="0.6"/>`).join('')
    + `</svg>`;
  plans.push({ label: `${sk} · the plan: where each drawing lands (right half; grey back, dark mid, black front, red holes)`, png: await svgPng(svg, 380, 380), cap: s.placed.map((p) => `${p.slot} ← ${p.drawing}${p.rigid ? ' (whole)' : ` (stretch ${p.aniso.toFixed(2)}, fold ${p.foldMax.toFixed(2)}${p.relaxed ? `, spine relaxed ${p.relaxed}×` : ''})`}`).join(' · ') });
  rows.push({ head: `the whole ${sk} at the default 180 mm print, front-on: the forms round beside the same placements built from the drawn placeholders`, cells });
}
if (plans.length) rows.push({ head: 'the plan of the placements (the drawn build)', cells: plans });
// close-ups of the drawn relief
for (const [sk, q] of CASES) {
  if (!want(`close ${sk}`) || sk !== 'oval') continue;
  const params = { filigree: 'scrolls', ...q, ornFlow: 'drawn' };
  const plateT = await page.evaluate((p) => { window.__frame.setParams(p); return window.__frame.stl().info.plateT; }, params);
  const cells = [];
  const add = async (label, at, radius, dir = [0, 0, 1]) => cells.push({ label: `${sk} · drawn · ${label}`, png: await shoot(params, { dir, radius, target: [at[0], at[1], plateT] }), cap: '' });
  const P = DR.drawnFor ? planOf({ filigree: 'scrolls', ...q }, 'drawn').stats.placed : [];
  const at = (re) => { const p = P.find((x) => re.test(x.slot) && x.at); return p ? p.at : null; };
  for (const [label, re, radius] of [['the crest C and its volute, front-on', /^crest C$/, 55], ['the shoulder C and its volute, front-on', /^shoulder C$/, 60], ['the flank flames, front-on', /^flame 2$/, 95], ['the foot curling under, front-on', /^foot$/, 60], ['the crest shell, front-on', /^crest shell$/, 55]]) { const a = at(re); if (a) await add(label, a, radius); }
  cells.push({ label: `${sk} · drawn · three-quarter, whole`, png: await shoot(params, { dir: [0.55, 0.35, 1], radius: 470 }), cap: '' });
  rows.push({ head: 'close-ups of the drawn build (the oval)', cells });
}
// the template itself
const tpl = DRAWING || fs.readFileSync(path.join(ROOT, 'docs/frame-drawing-template.svg'), 'utf8');
const tplPng = await svgPng(tpl.replace(/<\?xml[^>]*>/, '').replace(/width="[^"]*mm" height="[^"]*mm"/, 'width="1500" height="1100"'), 1500, 1100);
const html = `<!doctype html><meta charset="utf-8"><title>/frame — the hand-drawn filigree: the proof sheet</title>
<style>body{background:#EDEDE8;color:#0A0A0C;font:12px/1.45 monospace;margin:16px} .row{display:flex;gap:10px;margin:6px 0 18px;flex-wrap:wrap} .cell{width:380px} .cell img{width:380px;height:380px;display:block;border:1px solid #bbb;background:#fff} h2{font-size:13px;margin:14px 0 4px} .cap{font-size:10.5px;color:#333}</style>
<h1 style="font-size:15px">/frame — the hand-drawn filigree: the import path, run on the template's placeholder drawings, beside the forms round (F6) the placeholders were made from</h1>
${rows.map((r) => `<h2>${r.head}</h2><div class="row">${r.cells.map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div><b>${c.label}</b></div><div class="cap">${c.cap}</div></div>`).join('')}</div>`).join('')}
<h2>the drawing template (docs/frame-drawing-template.svg) — one artboard per element; the placeholders drawn in, ready to be drawn over</h2><img src="data:image/png;base64,${tplPng}" style="width:1500px;border:1px solid #bbb;background:#fff">
<p class="cap">${errors.length ? 'page errors: ' + errors.join(' | ') : 'no page errors'}</p>`;
const HTML = PNG.replace(/\.png$/, '.html');
fs.writeFileSync(HTML, html);
fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 1));
await browser.close();
const p2 = await browser2.newPage({ viewport: { width: 1600, height: 900 } });
await p2.goto('file://' + HTML); await p2.waitForTimeout(300);
await p2.screenshot({ path: PNG, fullPage: true });
await browser2.close(); server.close();
console.log('wrote', PNG, JSON.stringify(metrics), errors.length ? `(${errors.length} page errors)` : '');
