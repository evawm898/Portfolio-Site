#!/usr/bin/env node
/* shot-frame-flow.mjs <dir> [--png <file>] [--round <n>] [--only <regex>] [--growth] —
   the flow study's sheet. ROUND 2 (default): every default skeleton front-on in
   three layouts — the rinceau on `main`, round 1's grown OUTER CONTOUR
   (ornFlow 'contour') and the COMPOSED contour (ornFlow 'composed',
   frame-compose.js) — then, per skeleton, the composed frame's shoulder, waist
   and bottom close-ups and a three-quarter view, and a plan plot of each
   composed frame with its target ENVELOPE drawn faintly (dashed). --growth
   shoots round 1's sheet instead (below).

   ROUND 1 (--growth): the flow study's sheet (docs/frame-flow-study.md): every default skeleton
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
const GROWTH = process.argv.includes('--growth');
const MODES = GROWTH ? [['the rinceau (main)', {}], ['flow — on the band', { ornFlow: 'band' }], ['flow — outer contour', { ornFlow: 'contour' }]]
  : [['the rinceau (main)', {}], ['round 1 — grown contour', { ornFlow: 'contour' }], ['round 2 — composed contour', { ornFlow: 'composed' }]];
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
// round 2's close-ups: at the composed frame's own boundaries (its first HIGH — the shoulder swell, its first LOW
// — the waist — and its FOOT), off the builder's envelope (sampled one print mm apart along the side)
const plots = [];
if (!GROWTH) for (const [sk, q] of CASES) {
  const params = { filigree: 'scrolls', ...q, ornFlow: 'composed' };
  const m = T.FL.withOrnament(T.G.buildFrame({ ...T.G.DEFAULTS, ...params })), o = m.ornament, f = o.flow;
  plots.push({ sk, svg: planPlot(m, o) });
  if (!want(`close ${sk}`)) continue;
  const at = (b) => { const k = f.keypoints.find((x) => x.b === b); return k ? f.envelope[Math.min(f.envelope.length - 1, Math.round(k.s))] : null; };
  const plateT = await page.evaluate((p) => { window.__frame.setParams(p); return window.__frame.stl().info.plateT; }, params);
  const cells = [];
  for (const [where, b, radius] of [['shoulder', 'high', 70], ['waist', 'low', 70], ['bottom', 'foot', 80]]) {
    const pt = at(b) || at('swell');
    // the bottom is framed on the stretch from the foot to the axis (the feet and the bottom shell between them)
    const end = f.envelope[f.envelope.length - 1], tg = where === 'bottom' ? [pt[0] / 2, (pt[1] + end[1]) / 2] : pt;
    cells.push({ label: `${sk} · composed · ${where}, front-on`, png: await shoot(params, { dir: [0, 0, 1], radius: where === 'bottom' ? Math.max(radius, 0.75 * Math.hypot(pt[0], pt[1] - end[1]) + 25) : radius, target: [tg[0], tg[1], plateT] }), cap: '', told: [] });
  }
  cells.push({ label: `${sk} · composed · three-quarter, whole`, png: await shoot(params, { dir: [0.55, 0.35, 1], radius: 470 }), cap: '', told: [] });
  rows.push({ head: `the ${sk}, composed: the shoulder swell, the waist, the bottom (foot), and three-quarter`, cells });
}
function planPlot(m, o) {
  const sil = T.RL.plateOutline(m).map(([x, y]) => [x * o.scale, y * o.scale]), reg = T.FL.bandRegion(m, o.scale);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of [...sil, ...o.curves.flatMap((c) => c.pts), ...o.flow.envelope]) { x0 = Math.min(x0, x, -x); x1 = Math.max(x1, x, -x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const pad = 6, W = 380, sc = Math.min(W / (x1 - x0 + 2 * pad), W / (y1 - y0 + 2 * pad));
  const Tp = ([x, y]) => `${((x - (x0 + x1) / 2) * sc + W / 2).toFixed(1)},${((((y0 + y1) / 2) - y) * sc + W / 2).toFixed(1)}`;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" style="background:#fff">`;
  for (const e of reg.edges) svg += `<polyline points="${e.map(Tp).join(' ')}" fill="none" stroke="#999" stroke-width="1"/>`;
  for (const c of o.curves) { const leaf = c.info.role === 'acanthus' || c.kind === 'leaf'; for (let i = 0; i < c.pts.length - 1; i++) { const [a, b] = [Tp(c.pts[i]).split(','), Tp(c.pts[i + 1]).split(',')]; svg += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${leaf ? '#4d7a33' : '#222'}" stroke-width="${Math.max(0.6, T.FL.wAt(c, i) * sc).toFixed(2)}" stroke-linecap="round"/>`; } }
  for (const el of o.elements || []) for (const l of el.loops) svg += `<polygon points="${l.map(Tp).join(' ')}" fill="#b98a55" fill-opacity="0.45" stroke="#7a5a35" stroke-width="0.6"/>`;
  for (const sg of [1, -1]) svg += `<polyline points="${o.flow.envelope.map(([x, y]) => Tp([sg * x, y])).join(' ')}" fill="none" stroke="#c33" stroke-opacity="0.55" stroke-dasharray="4 3" stroke-width="1"/>`;
  return svg + '</svg>';
}
for (const [nm, mq] of GROWTH ? MODES.slice(1) : []) {
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
<h1 style="font-size:15px">/frame — the flow study${ROUND ? `, round ${ROUND}` : ''}: ${GROWTH ? 'the rinceau on main beside the flow model (ornFlow band / contour)' : 'the rinceau on main, round 1\'s grown contour, and round 2\'s COMPOSED contour'}</h1>
<p class="cap">Node builds of the same params give every caption (tools/frame-flow-measure.mjs). Repetition: pairs of scroll elements on one side sharing a shape (length within 5 %, turns within 0.08, curvature profile RMS within 0.15); continuity: tangent / curvature jump at every hand-off; following: the body's angle to the frame's tangent.</p>
${rows.map((r) => `<h2>${esc(r.head)}</h2><div class="row">${r.cells.map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div><b>${esc(c.label)}</b></div><div class="cap">${esc(c.cap)}</div>${c.told.length ? `<div class="told">${c.told.map(esc).join('<br>')}</div>` : ''}</div>`).join('')}</div>`).join('')}
${plots.length ? `<h2>the composed frames in plan: the band (grey), the scrolls (black), the leaves (green), the motifs (brown), and the target envelope (dashed red, faint)</h2><div class="row">${plots.map((p) => `<div class="cell">${p.svg}<div><b>${esc(p.sk)} · composed · plan with envelope</b></div></div>`).join('')}</div>` : ''}
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
// the plan plots as cells too: each SVG written out, then rendered by one page at a fixed viewport
if (plots.length) {
  const pg = await browser.newPage({ viewport: { width: 380, height: 380 }, deviceScaleFactor: 1 });
  for (const p of plots) {
    const name = `${String(ci++).padStart(2, '0')}-${p.sk}-composed-plan-with-envelope`;
    fs.writeFileSync(path.join(OUT, 'cells', `${name}.svg`), p.svg);
    await pg.goto(`file://${path.join(OUT, 'cells', `${name}.svg`)}`); await pg.waitForTimeout(100);
    fs.writeFileSync(path.join(OUT, 'cells', `${name}.png`), await pg.screenshot({ type: 'png' }));
  }
}
await browser.close();
console.log(`wrote ${path.join(OUT, 'index.html')} and ${PNG}${errors.length ? ` — ${errors.length} page errors: ${errors.slice(0, 3).join(' | ')}` : ''}`);
