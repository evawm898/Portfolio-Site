#!/usr/bin/env node
/* shot-bug-sheet.mjs <dir> — the contact sheet for /bug: the TAIL and the
   drawn-width FLOOR (Eva's second ruling on PR #326).

   Cells, each driven through the real page:
     2 and 4 wing pairs with TAIL on, and the same bugs with TAIL off — the
       tail on the bottom pair only, nothing on a middle pair (measured: every
       non-bottom wing part bit-identical on and off, from Node builds of the
       parameters READ BACK off the page);
     a tail EDITED by a real pointer drag in the editor, then the TAIL box
       really clicked off and on again — three editor shots, and whether the
       edit came back;
     a tail drawn thinner than the floor — the editor with its red highlight,
       and a real click of "Get STL" with the refusal it prints.
   Each bug as the exported SVG (top-down) and the 3D canvas at 3/4.

   Writes <dir>/index.html (self-contained) and <dir>/bug-tail-sheet.png.
   No pixel claim is made anywhere: the sheet is for ruling by eye. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import * as G from '../bug-geometry.js';
import { THIN_TAIL } from './bug-fixtures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'bug-sheet');
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
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

const pairsTail = (n, on) => { const p = G.defaultParams(); p.wingPairs = n; p.wings.tail.on = on; return p; };
const thin = () => { const p = G.defaultParams(); p.wingPairs = 2; p.wings.tail = JSON.parse(JSON.stringify(THIN_TAIL)); return p; };
const show = (css) => hide.evaluate((n, c) => { n.textContent = c; }, css);
const edShot = async () => { await page.evaluate(() => window.__bug.flushBuild()); return (await page.locator('#editorBox').screenshot({ type: 'png' })).toString('base64'); };
// every wing part's vertices, from a NODE build of the parameters the page holds
const wingVerts = (pp) => { const m = G.buildBug(pp); const o = {}; for (const q of m.parts.filter((x) => /^wing\d$/.test(x.kind))) o[`${q.kind}${q.side}`] = Array.from(m.positions.slice(3 * q.v0, 3 * q.v1)); return { o, m }; };
const sameArr = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

async function shoot(label, sec, params, extra = {}) {
  if (params) await page.evaluate((p) => window.__bug.setParams(p), params);
  await page.evaluate(() => window.__bug.flushBuild());
  await page.evaluate(() => window.__bug.setView('three'));
  const png = (await page.screenshot({ type: 'png' })).toString('base64');
  const svg = await page.evaluate(() => window.__bug.svg(false));
  const pp = await page.evaluate(() => window.__bug.getParams());
  const fl = await page.evaluate(() => window.__bug.floor());
  const rec = { label, sec, params: pp, png, svg: svg.svg, svgW: svg.widthMm, svgH: svg.heightMm,
    tris: await page.evaluate(() => window.__bug.triangleCount()), notes: await page.evaluate(() => window.__bug.notes()), floor: fl, ...extra };
  out.push(rec);
  console.log(`${label.padEnd(34)} tris=${rec.tris} tail on pairs [${fl.pairs.map((w, i) => (w.hasTail ? i + 1 : '')).filter(Boolean).join(',') || '-'}] floor ${fl.violations.length ? 'VIOLATED ' + fl.violations.map((v) => `pair ${v.pair + 1} ${v.maxDepth.toFixed(2)}mm`).join(',') : 'ok'}`);
  return rec;
}

const out = [];
// 1. the tail on the bottom pair only, at 2 and 4 pairs, against the same bug with TAIL off
for (const n of [2, 4]) {
  const on = await shoot(`${n} pairs, TAIL on`, 'pairs', pairsTail(n, true));
  const off = await shoot(`${n} pairs, TAIL off`, 'pairs', pairsTail(n, false));
  const A = wingVerts(on.params).o, B = wingVerts(off.params).o;
  const mids = [], diff = [];
  for (let k = 1; k <= n; k++) for (const s of ['R', 'L']) (sameArr(A[`wing${k}${s}`], B[`wing${k}${s}`]) ? mids : diff).push(`${k}${s}`);
  on.iso = `pairs bit-identical with TAIL on and off: ${mids.join(' ') || 'none'} · differ: ${diff.join(' ')}`;
  console.log(`  ${on.iso}`);
}

// 2. a tail edited by a real drag, then the TAIL box clicked off and on
{
  await page.evaluate((p) => window.__bug.setParams(p), pairsTail(2, true));
  await show('.bg-view,.bg-header{visibility:hidden!important}');
  await page.evaluate(() => window.__bug.editPair(1));
  const tags = await page.evaluate(() => window.__bug.shownTags());
  const pts = await page.evaluate(() => window.__bug.shownPoints());
  // the tail point that stands furthest out — the tip of the spatula
  let ti = -1, far = -Infinity;
  tags.forEach(([k], i) => { if (k === 'tail' && -pts[i][1] > far) { far = -pts[i][1]; ti = i; } });
  const tailBefore = (await page.evaluate(() => window.__bug.tailPoints())).points;
  const [ax, ay] = await page.evaluate((i) => window.__bug.pointScreen(i), ti);
  const [tx, ty] = await page.evaluate(([u, w]) => window.__bug.uvScreen(u, w), [pts[ti][0] + 0.07, pts[ti][1] - 0.04]);
  await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move(tx, ty, { steps: 8 }); await page.mouse.up();
  const edited = (await page.evaluate(() => window.__bug.tailPoints())).points;
  const shotEdited = await edShot();
  const box = page.locator('#tailToggle');
  await box.scrollIntoViewIfNeeded(); await box.click();
  const offState = await page.evaluate(() => ({ on: window.__bug.tailPoints().on, tails: window.__bug.shownTags().filter(([k]) => k === 'tail').length, hasTail: window.__bug.floor().pairs.map((w) => w.hasTail) }));
  const shotOff = await edShot();
  await box.click();
  const back = (await page.evaluate(() => window.__bug.tailPoints())).points;
  const shotOn = await edShot();
  const moved = JSON.stringify(tailBefore) !== JSON.stringify(edited);
  const restored = JSON.stringify(back) === JSON.stringify(edited);
  const report = { moved, restored, offState, ti, nTail: edited.length };
  console.log(`EDIT: real drag of drawn point ${ti} (a tail point) moved the tail group ${moved}; TAIL off -> on=${offState.on}, ${offState.tails} tail points drawn; TAIL on -> edited tail restored ${restored}`);
  await show(HIDE);
  await shoot('tail edited, toggled off then on', 'edit', null, { editShots: [['edited (drag)', shotEdited], ['TAIL off', shotOff], ['TAIL on again', shotOn]], editReport: report });
}

// 3. a tail drawn thinner than the floor: red in the editor, and the STL refused
{
  await page.evaluate((p) => window.__bug.setParams(p), thin());
  await show('.bg-view,.bg-header{visibility:hidden!important}');
  await page.evaluate(() => window.__bug.editPair(1));
  const thinShot = await edShot();
  const redPaths = await page.evaluate(() => document.querySelectorAll('#editor path.thin').length);
  const btn = page.locator('#exportStl');
  await btn.scrollIntoViewIfNeeded();
  let downloaded = false; page.once('download', () => { downloaded = true; });
  await btn.click(); await page.waitForTimeout(300);
  const msg = await page.locator('#exportMsg').textContent();
  const readout = await page.evaluate(() => [...document.querySelectorAll('#readout *, .bg-readout *')].map((e) => e.textContent).find((t) => /STL BLOCKED/.test(t)) || '');
  // just the export row and the message under it — what the click produced
  const r0 = await page.locator('#exportStl').boundingBox(), r1 = await page.locator('#exportMsg').boundingBox();
  const x = Math.min(r0.x, r1.x) - 8, y = r0.y - 8;
  const panelShot = (await page.screenshot({ type: 'png', clip: { x, y, width: Math.max(r0.x + r0.width, r1.x + r1.width) - x + 8, height: r1.y + r1.height - y + 8 } })).toString('base64');
  console.log(`FLOOR: ${redPaths} red run(s) in the editor; Get STL clicked: downloaded=${downloaded}; message: "${msg}"`);
  await show(HIDE);
  await shoot('tail drawn under the floor', 'floor', null, { editShots: [['editor — red = narrower than the floor', thinShot], ['Get STL, clicked', panelShot]], floorReport: { redPaths, downloaded, msg, readout } });
}

const describe = (p) => `${p.wingPairs} wing pr · TAIL ${p.wings.tail.on ? 'on' : 'off'} (${p.wings.tail.points.length} pts, anchor u ${(+p.wings.tail.anchorU).toFixed(2)}) · floor ${(+p.minDiameter).toFixed(2)} mm`;
const card = (o) => `
<figure class="cell${o.editShots ? ' wide' : ''}">
  ${o.editShots ? `<div class="eds">${o.editShots.map(([t, b]) => `<div><div class="et">${t}</div><img src="data:image/png;base64,${b}"></div>`).join('')}</div>` : ''}
  <div class="pair">
    <div class="svg">${o.svg.replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" ')}</div>
    <img src="data:image/png;base64,${o.png}" alt="${o.label} 3/4">
  </div>
  <figcaption><b>${o.label}</b> <span>${describe(o.params)}</span><br><span>${o.tris.toLocaleString()} tris · SVG ${o.svgW.toFixed(0)}×${o.svgH.toFixed(0)} mm · tail drawn on pair ${o.floor.pairs.map((w, i) => (w.hasTail ? i + 1 : '')).filter(Boolean).join(',') || '— none'} · STL ${o.floor.violations.length ? 'REFUSED' : 'exports'}</span>
  ${o.iso ? `<br><span>${o.iso}</span>` : ''}
  ${o.editReport ? `<br><span>A REAL pointer drag on the tail's tip point (drawn point ${o.editReport.ti}) moved the tail group: ${o.editReport.moved}. The TAIL box clicked OFF: ${o.editReport.offState.tails} tail points drawn, tail on pairs [${o.editReport.offState.hasTail.map((h, i) => (h ? i + 1 : '')).filter(Boolean).join(',') || 'none'}]. Clicked ON again: the edited tail (${o.editReport.nTail} points) came back exactly — ${o.editReport.restored}. The bug below is the final state.</span>` : ''}
  ${o.floorReport ? `<br><span>${o.floorReport.redPaths} red run(s) drawn in the editor. "Get STL" clicked: file downloaded — ${o.floorReport.downloaded}. The page said: “${o.floorReport.msg}”. SVG is not affected and still exports.</span>` : ''}
  ${o.notes.length ? `<br><span>notes: ${o.notes.join('; ')}</span>` : ''}</figcaption>
</figure>`;

const sec = (title, key, blurb = '') => `<h2>${title}</h2>${blurb ? `<p>${blurb}</p>` : ''}<div class="grid">${out.filter((o) => o.sec === key).map(card).join('')}</div>`;
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bug — tail and floor sheet</title>
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
.eds > div.narrow{flex:0.8}
.et{color:#5FA0A0;margin-bottom:4px}
.svg{background:#EDEDE8;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:8px}
.svg svg{width:100%;height:100%}
.pair img{width:100%;height:100%;object-fit:cover;background:#0A0A0C}
figcaption{margin-top:8px;line-height:1.5}
figcaption span{color:#8A8A85}
</style></head><body>
<div class="eb">EM / BUG</div><h1>The tail and the floor — contact sheet</h1>
<p>Each bug as <b>left</b> the exported SVG itself (the top-down projection of the 3D model) and <b>right</b> the 3D model at 3/4. The tail is part of the bottom pair's outline (amber control points in the editor); middle pairs interpolate the tail-less outlines.</p>
${sec('Tail on the bottom pair only — 2 and 4 pairs, on against off', 'pairs', 'The "bit-identical" line is measured from Node builds of the parameters read back off the page: every wing part except the bottom pair has the same vertices to the bit with TAIL on and off.')}
${sec('An edited tail survives TAIL off → on', 'edit')}
${sec('A tail drawn thinner than the floor', 'floor', 'The STL refuses rather than thickening: see bug-project-design-doc.md §6.')}
</body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);

const sheet = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await sheet.goto('file://' + path.join(OUT, 'index.html'));
await sheet.screenshot({ path: path.join(OUT, 'bug-tail-sheet.png'), fullPage: true });
await browser.close();
server.close();
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
console.log(`wrote ${path.join(OUT, 'index.html')} and bug-tail-sheet.png`);
if (errors.length) process.exit(1);
