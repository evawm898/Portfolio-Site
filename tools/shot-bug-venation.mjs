#!/usr/bin/env node
/* shot-bug-venation.mjs <dir> — the contact sheet for /bug Phase 2: VENATION.

   Cells, each driven through the real page (bug.html), each as the exported
   SVG (top-down, the file itself) beside the 3D canvas at 3/4:
     one wing at FIVE steps of cross-vein density, open -> segmented, in HOLES;
     the same bug in HOLES and in RIDGES;
     a swallowtail with a drawn TAIL, a vein running into it (both modes);
     a 4-pair bug whose first and last pairs differ in venation, the two
       middle pairs BLENDED (both modes; the caption carries the terminal
       counts the record holds, against the blend law);
     a deliberately too-fine venation (veins under the floor): the 3D view
       with the veins red and a REAL click of Get STL with the refusal it prints.
   Eva's reference image 1 (paper-cut butterflies) is the visual target for
   HOLES; it is not in the repository, so the sheet asks to be held beside it.

   Writes <dir>/index.html (self-contained) and <dir>/bug-venation-sheet.png.
   No pixel claim is made anywhere: the sheet is for ruling by eye. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import * as G from '../bug-geometry.js';
import { HAND_OUTLINES } from './bug-fixtures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'bug-venation-sheet');
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); } catch { route.abort(); }
});
await page.route('**fonts.googleapis.com/**', (r) => r.abort());
await page.route('**fonts.gstatic.com/**', (r) => r.abort());
await page.goto(`${base}/bug.html`);
await page.waitForFunction(() => !!window.__bug);
const HIDE = '.bg-panel,.bg-view,.bg-header,.bg-editor{visibility:hidden!important}';
const hide = await page.addStyleTag({ content: HIDE });
const show = (css) => hide.evaluate((n, c) => { n.textContent = c; }, css);

/* a long-winged bug so the cells read: the default outline, 40 mm, stretch 1.3 */
const longWing = (mode) => {
  const p = G.defaultParams(); p.venation = mode; p.wingPairs = 2;
  for (const w of [p.wings.first, p.wings.last]) { w.length = 40; w.stretch = 1.3; w.stigma = 1; }
  p.wings.last.length = 30;
  return p;
};
const withDensity = (mode, d) => { const p = longWing(mode); for (const w of [p.wings.first, p.wings.last]) w.crossDensity = d; return p; };
const swallow = (mode) => { const p = longWing(mode); p.wings.first.points = HAND_OUTLINES.swallowtail.map((q) => q.slice()); p.wings.tail.on = true; p.wings.last.length = 32; p.wings.last.stretch = 1.5; for (const w of [p.wings.first, p.wings.last]) { w.crossDensity = 0.35; w.stigma = 0; } return p; };
const fourPair = (mode) => { const p = longWing(mode); p.wingPairs = 4; p.wings.first.veinCount = 8; p.wings.first.crossDensity = 1; p.wings.first.cellRegularity = 1; p.wings.first.veinBranch = 0; p.wings.last.veinCount = 3; p.wings.last.crossDensity = 0; p.wings.last.veinBranch = 1; p.wings.last.length = 28; p.wings.first.stigma = 0; p.wings.last.stigma = 0; return p; };
const tooFine = () => { const p = longWing('holes'); p.wings.first.veinWidth = 0.6; p.wings.first.veinTaper = 0.5; p.wings.first.crossDensity = 0.6; return p; };

const out = [];
async function shoot(label, sec, params, extra = {}) {
  if (params) await page.evaluate((p) => window.__bug.setParams(p), params);
  await page.evaluate(() => window.__bug.flushBuild());
  await page.evaluate(() => window.__bug.setView('three'));
  const png = (await page.screenshot({ type: 'png' })).toString('base64');
  const svg = await page.evaluate(() => window.__bug.svg(false));
  const pp = await page.evaluate(() => window.__bug.getParams());
  const fl = await page.evaluate(() => window.__bug.floor());
  const ven = await page.evaluate(() => window.__bug.venation());
  const rec = { label, sec, params: pp, png, svg: svg.svg, svgW: svg.widthMm, svgH: svg.heightMm, tris: await page.evaluate(() => window.__bug.triangleCount()), notes: await page.evaluate(() => window.__bug.notes()), floor: fl, ven, ...extra };
  out.push(rec);
  console.log(`${label.padEnd(40)} tris=${rec.tris} ${ven.map((v, i) => (v ? `p${i + 1}:${v.stats.cells}c/${v.stats.holes ?? '-'}h` : '')).join(' ')} floor ${fl.violations.length ? 'VIOLATED ' + fl.violations.map((v) => `pair ${v.pair + 1} ${v.kind}`).join(',') : 'ok'}`);
  return rec;
}

// 1. the density axis, HOLES
for (const d of [0, 0.25, 0.5, 0.75, 1]) await shoot(`cross-vein density ${d.toFixed(2)}`, 'density', withDensity('holes', d));
// 2. HOLES against RIDGES
for (const mode of ['holes', 'ridges']) await shoot(`${mode.toUpperCase()}, density 0.50`, 'mode', withDensity(mode, 0.5));
// 3. the swallowtail with its tail
for (const mode of ['holes', 'ridges']) await shoot(`swallowtail + tail, ${mode.toUpperCase()}`, 'tail', swallow(mode));
// 4. four pairs, blended middles
for (const mode of ['ridges', 'holes']) {
  const rec = await shoot(`4 pairs, 8→3 veins, density 1→0, ${mode.toUpperCase()}`, 'blend', fourPair(mode));
  const p = rec.params, lerp = (a, b, t) => a + (b - a) * t;
  rec.blend = [1, 2].map((k) => { const t = k / 3; const n = Math.round(lerp(p.wings.first.veinCount, p.wings.last.veinCount, t)), b = Math.round(lerp(p.wings.first.veinBranch, p.wings.last.veinBranch, t)); return `pair ${k + 1}: law ${n}×${1 + b} = ${n * (1 + b)} terminals, record ${rec.ven[k].stats.terminals}`; }).join(' · ');
  console.log('  ' + rec.blend);
}
// 5. too-fine veins: red in the view, Get STL refused
{
  await page.evaluate((p) => window.__bug.setParams(p), tooFine());
  await page.evaluate(() => window.__bug.flushBuild());
  await show('.bg-view,.bg-header,.bg-editor{visibility:hidden!important}');
  const tv = await page.evaluate(() => window.__bug.thinView());
  const btn = page.locator('#exportStl');
  await btn.scrollIntoViewIfNeeded();
  let downloaded = false; page.once('download', () => { downloaded = true; });
  await btn.click(); await page.waitForTimeout(300);
  const msg = await page.locator('#exportMsg').textContent();
  const r0 = await page.locator('#exportStl').boundingBox(), r1 = await page.locator('#exportMsg').boundingBox();
  const x = Math.min(r0.x, r1.x) - 8, y = r0.y - 8;
  const panelShot = (await page.screenshot({ type: 'png', clip: { x, y, width: Math.max(r0.x + r0.width, r1.x + r1.width) - x + 8, height: r1.y + r1.height - y + 8 } })).toString('base64');
  console.log(`FLOOR: tinted parts ${tv.tinted}, red segments ${tv.redSegments}; Get STL clicked: downloaded=${downloaded}; message: "${msg}"`);
  await show(HIDE);
  await shoot('veins drawn under the floor (0.60 mm × (1 − 0.5))', 'floor', null, { editShots: [['Get STL, clicked', panelShot]], floorReport: { tv, downloaded, msg } });
}

const describe = (p) => `${p.venation.toUpperCase()} · ${p.wingPairs} pr · pair 1: ${p.wings.first.veinCount} veins ×${1 + p.wings.first.veinBranch}, density ${(+p.wings.first.crossDensity).toFixed(2)}, regularity ${(+p.wings.first.cellRegularity).toFixed(2)}, vein ${(+p.wings.first.veinWidth).toFixed(2)} mm taper ${(+p.wings.first.veinTaper).toFixed(2)}, border ${(+p.wings.first.marginBorder).toFixed(2)} mm${p.venation === 'holes' ? ` · smallest hole ${(+p.minCellMm).toFixed(1)} mm` : ` · ridge ${(+p.ridgeHeight).toFixed(2)} mm`} · floor ${(+p.minDiameter).toFixed(2)} mm`;
const venLine = (o) => o.ven.map((v, i) => (v ? `pair ${i + 1}: ${v.stats.cells} cells, ${v.stats.mainMade} veins + ${v.stats.crossMade} cross${v.stats.holes !== undefined ? `, ${v.stats.holes} holes, ${v.stats.merged} merged` : ''}${v.stats.discal ? ', discal' : ''}${v.stats.stigma ? ', stigma' : ''}${v.stats.tailTargeted ? ', a vein into the tail' : ''}` : '')).filter(Boolean).join(' · ');
const card = (o) => `
<figure class="cell${o.editShots ? ' wide' : ''}">
  ${o.editShots ? `<div class="eds">${o.editShots.map(([t, b]) => `<div><div class="et">${t}</div><img src="data:image/png;base64,${b}"></div>`).join('')}</div>` : ''}
  <div class="pair">
    <div class="svg">${o.svg.replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" ')}</div>
    <img src="data:image/png;base64,${o.png}" alt="${o.label} 3/4">
  </div>
  <figcaption><b>${o.label}</b> <span>${describe(o.params)}</span><br><span>${o.tris.toLocaleString()} tris · SVG ${o.svgW.toFixed(0)}×${o.svgH.toFixed(0)} mm · ${venLine(o)} · STL ${o.floor.violations.length ? 'REFUSED' : 'exports'}</span>
  ${o.blend ? `<br><span>Blend law against the record: ${o.blend}</span>` : ''}
  ${o.floorReport ? `<br><span>${o.floorReport.tv.tinted} wing parts tinted red, ${o.floorReport.tv.redSegments} red vein segments in the view. "Get STL" clicked: file downloaded — ${o.floorReport.downloaded}. The page said: “${o.floorReport.msg}”.</span>` : ''}
  ${o.notes.length ? `<br><span>notes: ${o.notes.join('; ')}</span>` : ''}</figcaption>
</figure>`;
const sec = (title, key, blurb = '') => `<h2>${title}</h2>${blurb ? `<p>${blurb}</p>` : ''}<div class="grid">${out.filter((o) => o.sec === key).map(card).join('')}</div>`;
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bug — venation sheet</title>
<style>
body{margin:0;background:#0A0A0C;color:#EDEDE8;font-family:'Space Mono',monospace;font-size:12px;padding:24px}
h1{font-family:'Playfair Display',Georgia,serif;font-weight:600;font-size:30px;margin:4px 0 6px}
.eb{color:#5FA0A0;letter-spacing:.22em;font-size:11px}
p{color:#8A8A85;max-width:1150px;line-height:1.5;margin:0 0 6px}
h2{font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:20px;margin:22px 0 10px;color:#EDEDE8}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.cell{margin:0;border:1px solid rgba(237,237,232,.22);padding:10px}
.cell.wide{grid-column:1 / -1}
.pair{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:100%;gap:8px;height:330px}
.pair > *{min-height:0;min-width:0}
.eds{display:flex;gap:8px;margin-bottom:8px;align-items:flex-start}
.eds > div{flex:1;min-width:0}
.eds img{width:100%;display:block}
.et{color:#5FA0A0;margin-bottom:4px}
.svg{background:#EDEDE8;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:8px}
.svg svg{width:100%;height:100%}
.pair img{width:100%;height:100%;object-fit:cover;background:#0A0A0C}
figcaption{margin-top:8px;line-height:1.5}
figcaption span{color:#8A8A85}
</style></head><body>
<div class="eb">EM / BUG</div><h1>Venation — contact sheet (Phase 2)</h1>
<p>Each bug as <b>left</b> the exported SVG itself (the top-down projection of the 3D model; in HOLES the cells are the holes of that projection, in RIDGES the veins are drawn as lines at their own width from the model's vein record) and <b>right</b> the 3D model at 3/4. Hold the HOLES cells beside Eva's reference image 1 (paper-cut butterflies), which is not in the repository.</p>
${sec('One wing at five steps of cross-vein density — open → segmented (HOLES)', 'density', 'Cells too small to cut cleanly (under the smallest-hole threshold) merge with a neighbour; the caption counts the merges.')}
${sec('The same bug in HOLES and in RIDGES', 'mode')}
${sec('A swallowtail with a drawn tail — a vein runs into the tail', 'tail')}
${sec('Four pairs — the middle pairs blend the first and last pairs’ venation', 'blend')}
${sec('Veins drawn under the floor — red in the view, the STL refused', 'floor', 'The same block-not-thicken rule as the drawn outline (design doc §6.3).')}
</body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);

const sheet = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await sheet.goto('file://' + path.join(OUT, 'index.html'));
await sheet.screenshot({ path: path.join(OUT, 'bug-venation-sheet.png'), fullPage: true });
await browser.close();
server.close();
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
console.log(`wrote ${path.join(OUT, 'index.html')} and bug-venation-sheet.png`);
if (errors.length) process.exit(1);
