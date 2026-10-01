#!/usr/bin/env node
/* shot-bug-sheet.mjs <dir> — the contact sheet for /bug (Phase 1, revised).

   Cells, each driven through the real page (window.__bug.setParams):
     the neutral default · 8 randomized bugs (randomParams(1..8), the function
     behind the Randomize button) · the default at 1, 2, 3 and 4 wing pairs ·
     a swallowtail forewing traced over a reference backdrop, shown WITH the
     editor · the leg fix (tucked against splayed).
   Each bug twice: the exported SVG itself (top-down) and the 3D canvas at 3/4.

   The traced cell also performs two REAL pointer drags in the editor: one that
   moves a point and is accepted, and one that would make the outline cross
   itself and must be blocked. Both outcomes are read back off the page and
   printed. The page's STL bytes are compared against a Node build of the same
   parameters (read back from the page), so the sheet also says whether the page
   and the gate draw one model.

   Writes <dir>/index.html (self-contained) and <dir>/bug-phase1-sheet.png.
   No pixel claim is made anywhere: the sheet is for ruling by eye. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import * as G from '../bug-geometry.js';
import { SWALLOWTAIL_TRACE, swallowtailReferenceSvg } from './bug-fixtures.mjs';

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

const d = () => G.defaultParams();
const pairs = (n) => { const p = d(); p.wingPairs = n; return p; };
const tucked = () => { const p = d(); p.legReach = 0; return p; };
const traced = () => {
  const p = d();
  p.wings.first.points = SWALLOWTAIL_TRACE.map((q) => q.slice());
  p.wings.first.sweep = 4; p.wings.first.length = 28;
  p.wings.last.points = [[0, 0.03], [0.3, 0.02], [0.62, -0.06], [0.84, -0.26], [0.8, -0.48], [0.56, -0.6], [0.24, -0.42], [0, -0.12]];
  p.wings.last.length = 22; p.wings.last.sweep = 6; p.wings.last.scallop = 0.12;
  p.tailLength = 9; p.tailWidth = 2.2; p.tailClub = 0.4;
  return p;
};
const cells = [
  { label: 'neutral default', sec: 'default', params: d() },
  ...Array.from({ length: 8 }, (_, i) => ({ label: `randomize ${i + 1}`, sec: 'random', params: G.randomParams(i + 1) })),
  ...[1, 2, 3, 4].map((n) => ({ label: `${n} wing pair${n > 1 ? 's' : ''}`, sec: 'pairs', params: pairs(n) })),
  { label: 'swallowtail, traced', sec: 'trace', params: traced(), trace: true },
  { label: 'legs tucked (reach 0)', sec: 'legs', params: tucked() },
  { label: 'legs splayed (reach 1)', sec: 'legs', params: d() },
];

const describe = (p) => {
  const bits = [`${p.bodyParts}-part`, `${p.legsVisible ? p.legPairs : 0} leg pr (reach ${(+p.legReach).toFixed(2)})`, `ant ${p.antennaType}`, `${p.wingPairs} wing pr`];
  if (p.wingPairs >= 1) bits.push(`first ${p.wings.first.points.length} pts, dihedral ${(+p.wings.first.dihedral).toFixed(0)}°`);
  if (p.wingPairs >= 2) bits.push(`last ${p.wings.last.points.length} pts`);
  if (p.wingPairs >= 3) bits.push('middle linked');
  return bits.join(' · ');
};

const out = [];
for (const c of cells) {
  await page.evaluate((p) => window.__bug.setParams(p), c.params);
  let editorPng = null, dragReport = null;
  if (c.trace) {
    await hide.evaluate((n) => { n.textContent = '.bg-panel,.bg-view,.bg-header{visibility:hidden!important}'; });
    const ref = 'data:image/svg+xml;base64,' + Buffer.from(swallowtailReferenceSvg()).toString('base64');
    // the backdrop goes in through the real file input
    await page.setInputFiles('#bdFile', { name: 'swallowtail-reference.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(swallowtailReferenceSvg()) });
    await page.waitForFunction(() => !!document.querySelector('#editor image'));
    await page.evaluate(() => { const s = document.getElementById('bdOpacity'); s.value = '0.7'; s.dispatchEvent(new Event('input')); });
    await page.evaluate(() => window.__bug.editPair(0));
    // REAL drag 1 — accepted: nudge the apex point a little outward
    const before = (await page.evaluate(() => window.__bug.getParams())).wings.first.points;
    const [ax, ay] = await page.evaluate(() => window.__bug.pointScreen(3));
    const [tx, ty] = await page.evaluate(() => window.__bug.uvScreen(1.02, 0.262));
    await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move(tx, ty, { steps: 6 }); await page.mouse.up();
    const afterOk = (await page.evaluate(() => window.__bug.getParams())).wings.first.points;
    // REAL drag 2 — must be BLOCKED: the leading-edge point dropped straight
    // across the trailing edge in ONE pointer move (a slow drag is accepted up to
    // the last valid position and stops there; one move tests the block itself)
    const blocked0 = await page.evaluate(() => window.__bug.blockedCount());
    const beforeBlock = (await page.evaluate(() => window.__bug.getParams())).wings.first.points;
    const [bx, by] = await page.evaluate(() => window.__bug.pointScreen(2));
    const [cx, cy] = await page.evaluate(() => window.__bug.uvScreen(0.55, -0.45));
    await page.mouse.move(bx, by); await page.mouse.down(); await page.mouse.move(cx, cy, { steps: 1 });
    const statusMid = await page.evaluate(() => window.__bug.editorStatus());
    await page.mouse.up();
    const afterBlocked = (await page.evaluate(() => window.__bug.getParams())).wings.first.points;
    const crossingOk = G.outlineValid(afterBlocked).ok;
    // the accepted drag before it in this gesture may have moved the point part of the way; the last
    // ACCEPTED position must still be a valid outline, and the target itself must be refused
    const target = afterBlocked.map((q) => q.slice()); target[2] = [0.55, -0.45];
    dragReport = {
      acceptedMoved: JSON.stringify(before[3]) !== JSON.stringify(afterOk[3]), apexBefore: before[3], apexAfter: afterOk[3],
      blockedEvents: (await page.evaluate(() => window.__bug.blockedCount())) - blocked0, statusMid,
      finalValid: crossingOk, targetRefused: !G.outlineValid(target).ok,
      unchanged: JSON.stringify(beforeBlock) === JSON.stringify(afterBlocked),
    };
    await page.evaluate(() => window.__bug.flushBuild());
    editorPng = (await page.locator('#editorBox').screenshot({ type: 'png' })).toString('base64');
    await hide.evaluate((n, css) => { n.textContent = css; }, HIDE);
    console.log(`TRACE real drags: accepted drag moved the apex ${dragReport.acceptedMoved} (${dragReport.apexBefore} -> ${dragReport.apexAfter}); crossing drag blocked on ${dragReport.blockedEvents} pointer events, status "${dragReport.statusMid}"; outline unchanged ${dragReport.unchanged}, valid ${dragReport.finalValid}; target outline refused ${dragReport.targetRefused}`);
  }
  await page.evaluate(() => window.__bug.setView('three'));
  const png = await page.screenshot({ type: 'png' });
  const svg = await page.evaluate(() => window.__bug.svg(false));
  const pp = await page.evaluate(() => window.__bug.getParams());
  const pageStl = Buffer.from(await page.evaluate(() => window.__bug.stl()));
  const nodeStl = Buffer.from(G.exportStl(G.buildBug(pp)));
  const same = pageStl.equals(nodeStl);
  let maxD = 0;
  if (!same && pageStl.length === nodeStl.length) for (let o = 84; o < pageStl.length; o += 50) for (let k = 12; k < 48; k += 4) maxD = Math.max(maxD, Math.abs(pageStl.readFloatLE(o + k) - nodeStl.readFloatLE(o + k)));
  const tris = await page.evaluate(() => window.__bug.triangleCount());
  const notes = await page.evaluate(() => window.__bug.notes());
  out.push({ ...c, params: pp, png: png.toString('base64'), editorPng, dragReport, svg: svg.svg, svgW: svg.widthMm, svgH: svg.heightMm, tris, same, maxD, sameLen: pageStl.length === nodeStl.length, notes });
  console.log(`${c.label.padEnd(24)} tris=${tris} svg=${svg.widthMm.toFixed(1)}x${svg.heightMm.toFixed(1)}mm page-STL ${same ? '== Node build (byte-identical)' : `vs Node build: max |d| ${maxD.toExponential(2)} mm${pageStl.length === nodeStl.length ? '' : ' LENGTH DIFFERS'}`}${notes.length ? ' notes: ' + notes.join('; ') : ''}`);
}

const card = (o) => `
<figure class="cell${o.editorPng ? ' wide' : ''}">
  <div class="pair${o.editorPng ? ' three' : ''}">
    ${o.editorPng ? `<img class="ed" src="data:image/png;base64,${o.editorPng}" alt="editor">` : ''}
    <div class="svg">${o.svg.replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" ')}</div>
    <img src="data:image/png;base64,${o.png}" alt="${o.label} 3/4">
  </div>
  <figcaption><b>${o.label}</b> <span>${describe(o.params)}</span><br><span>${o.tris.toLocaleString()} tris · SVG ${o.svgW.toFixed(0)}×${o.svgH.toFixed(0)} mm · page STL ${o.same ? '= Node build' : (o.sameLen && o.maxD === 0 ? 'vertices = Node build (facet normals differ in the last bit)' : o.sameLen ? `= Node build to ${o.maxD.toExponential(1)} mm` : '≠ Node build')}</span>
  ${o.dragReport ? `<br><span>Editor (left), reference backdrop: a schematic swallowtail drawn for this sheet — not a photograph. Nine control points placed on its forewing outline; then two REAL pointer drags: the apex nudged outward (accepted: ${o.dragReport.acceptedMoved}), and a leading-edge point dragged down across the trailing edge (BLOCKED on ${o.dragReport.blockedEvents} pointer events — “${o.dragReport.statusMid}”; the outline came back unchanged: ${o.dragReport.unchanged}).</span>` : ''}
  ${o.notes.length ? `<br><span>notes: ${o.notes.join('; ')}</span>` : ''}</figcaption>
</figure>`;

const sec = (title, key, blurb = '') => `<h2>${title}</h2>${blurb ? `<p>${blurb}</p>` : ''}<div class="grid">${out.filter((o) => o.sec === key).map(card).join('')}</div>`;
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bug — Phase 1 revised sheet</title>
<style>
body{margin:0;background:#0A0A0C;color:#EDEDE8;font-family:'Space Mono',monospace;font-size:12px;padding:24px}
h1{font-family:'Playfair Display',Georgia,serif;font-weight:600;font-size:30px;margin:4px 0 6px}
.eb{color:#5FA0A0;letter-spacing:.22em;font-size:11px}
p{color:#8A8A85;max-width:1150px;line-height:1.5;margin:0 0 6px}
h2{font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:20px;margin:22px 0 10px;color:#EDEDE8}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.cell{margin:0;border:1px solid rgba(237,237,232,.22);padding:10px}
.cell.wide{grid-column:1 / -1}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px;height:330px}
.pair.three{grid-template-columns:380px 1fr 1fr;height:620px}
.svg{background:#EDEDE8;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:8px}
.svg svg{width:100%;height:100%}
.pair img{width:100%;height:100%;object-fit:cover;background:#0A0A0C}
.pair img.ed{object-fit:contain;object-position:top}
.pair.three img:last-child{object-fit:contain}
figcaption{margin-top:8px;line-height:1.5}
figcaption span{color:#8A8A85}
</style></head><body>
<div class="eb">EM / BUG</div><h1>Phase 1, revised — contact sheet</h1>
<p>Each bug twice: <b>left</b> the exported SVG itself (the top-down orthographic projection of the 3D model), <b>right</b> the 3D model at a 3/4 view. No named presets any more: a neutral default, then eight bugs from the new Randomize ranges (seeds 1–8), then the default at 1–4 wing pairs (middle pairs LINKED: interpolated between the drawn first and last), then a traced outline with the editor visible, then the leg fix.</p>
${sec('Neutral default', 'default')}
${sec('Randomize (seeds 1–8)', 'random', 'Ranges in bug-project-design-doc.md §5.3. A 2-part bug always gets 4 leg pairs, no wings, no antennae.')}
${sec('Wing pairs 1–4', 'pairs', 'The thorax lengthens with each pair past two; roots spread along it, front to back. Pairs between the first and last interpolate both outline and values.')}
${sec('Traced outline — editor visible', 'trace')}
${sec('Fix: legs tucked under the body do not show from above', 'legs', 'Reach 0 folds every leg flat under the body; reach 1 is the splayed pose. Wings are on in both, as on the default.')}
</body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);

const sheet = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await sheet.goto('file://' + path.join(OUT, 'index.html'));
await sheet.screenshot({ path: path.join(OUT, 'bug-phase1-sheet.png'), fullPage: true });
await browser.close();
server.close();
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
console.log(`wrote ${path.join(OUT, 'index.html')} and bug-phase1-sheet.png`);
if (errors.length) process.exit(1);
