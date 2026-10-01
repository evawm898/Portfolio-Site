#!/usr/bin/env node
/* shot-bug-sheet.mjs <dir> — the Phase 1 contact sheet for /bug.

   The four presets and eight seeded random bugs (randomParams(1..8), the same
   function behind the page's Random button), each shown twice:
     left   the SVG export itself, inlined — the top-down projection of the model
     right  the page's own 3D canvas at the 3/4 view (chrome hidden)
   Every cell is driven through the real page (window.__bug.setParams), and the
   page's STL bytes are compared against a Node build of the same parameters, so
   the sheet also says whether the page and the gate are drawing one model.

   Writes <dir>/index.html (self-contained) and <dir>/bug-phase1-sheet.png.
   No pixel claim is made anywhere: the renderer is not a measuring instrument
   here, and none is needed — the sheet is for ruling by eye. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import * as G from '../bug-geometry.js';

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
const page = await browser.newPage({ viewport: { width: 760, height: 620 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); /* the aborted font requests */ });
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); } catch { route.abort(); }
});
await page.route('**fonts.googleapis.com/**', (r) => r.abort());
await page.route('**fonts.gstatic.com/**', (r) => r.abort());
await page.goto(`${base}/bug.html`);
await page.waitForFunction(() => !!window.__bug);
await page.addStyleTag({ content: '.bg-panel,.bg-view,.bg-header{display:none!important}' });

const cells = [
  ...Object.keys(G.PRESETS).map((n) => ({ label: n, kind: 'preset', params: G.presetParams(n) })),
  ...Array.from({ length: 8 }, (_, i) => ({ label: `random ${i + 1}`, kind: 'random', params: G.randomParams(i + 1) })),
];

const describe = (p) => {
  const bits = [p.bodyPlan === 'spider' ? 'spider' : 'insect', `${p.legsVisible ? p.legPairs : 0} leg pr`, `ant ${p.antennaType}`, `${p.wingPairs} wing pr`];
  if (p.wingPairs >= 1) bits.push(`dihedral ${p.w1Dihedral}°/pitch ${p.w1Pitch}°`);
  if (p.wingPairs >= 2) bits.push(`hind ${p.w2Dihedral}°/${p.w2Pitch}°`);
  return bits.join(' · ');
};

const out = [];
for (const c of cells) {
  await page.evaluate(([p, n]) => window.__bug.setParams(p, n), [c.params, c.kind === 'preset' ? c.label : null]);
  await page.evaluate(() => window.__bug.setView('three'));
  const png = await page.screenshot({ type: 'png' });
  const svg = await page.evaluate(() => window.__bug.svg(false));
  const pageStl = Buffer.from(await page.evaluate(() => window.__bug.stl()));
  const nodeStl = Buffer.from(G.exportStl(G.buildBug(c.params)));
  const same = pageStl.equals(nodeStl);
  // Where the bytes differ, say by how much: Chromium's V8 and Node's need not
  // agree on the last bit of a sine, so the comparison is reported as the
  // largest float difference, not as a pass/fail.
  let maxD = 0;
  if (!same && pageStl.length === nodeStl.length) for (let o = 84; o < pageStl.length; o += 50) for (let k = 12; k < 48; k += 4) maxD = Math.max(maxD, Math.abs(pageStl.readFloatLE(o + k) - nodeStl.readFloatLE(o + k)));
  const tris = await page.evaluate(() => window.__bug.triangleCount());
  out.push({ ...c, png: png.toString('base64'), svg: svg.svg, svgW: svg.widthMm, svgH: svg.heightMm, tris, same, maxD, sameLen: pageStl.length === nodeStl.length });
  console.log(`${c.label.padEnd(10)} tris=${tris} svg=${svg.widthMm.toFixed(1)}x${svg.heightMm.toFixed(1)}mm page-STL ${same ? '== Node build (byte-identical)' : `vs Node build: max |d| ${maxD.toExponential(2)} mm${pageStl.length === nodeStl.length ? '' : ' LENGTH DIFFERS'}`}`);
}

const card = (o) => `
<figure class="cell">
  <div class="pair">
    <div class="svg">${o.svg.replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" ')}</div>
    <img src="data:image/png;base64,${o.png}" alt="${o.label} 3/4">
  </div>
  <figcaption><b>${o.label}</b> <span>${describe(o.params)}</span><br><span>${o.tris.toLocaleString()} tris · SVG ${o.svgW.toFixed(0)}×${o.svgH.toFixed(0)} mm · page STL ${o.same ? '= Node build' : (o.sameLen && o.maxD === 0 ? 'vertices = Node build (facet normals differ in the last bit)' : o.sameLen ? `= Node build to ${o.maxD.toExponential(1)} mm` : '≠ Node build')}</span></figcaption>
</figure>`;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bug — Phase 1 sheet</title>
<style>
body{margin:0;background:#0A0A0C;color:#EDEDE8;font-family:'Space Mono',monospace;font-size:12px;padding:24px}
h1{font-family:'Playfair Display',Georgia,serif;font-weight:600;font-size:30px;margin:4px 0 6px}
.eb{color:#5FA0A0;letter-spacing:.22em;font-size:11px}
p{color:#8A8A85;max-width:1100px;line-height:1.5;margin:0 0 6px}
h2{font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:20px;margin:22px 0 10px;color:#EDEDE8}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.cell{margin:0;border:1px solid rgba(237,237,232,.22);padding:10px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px;height:330px}
.svg{background:#EDEDE8;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:8px}
.svg svg{width:100%;height:100%}
.pair img{width:100%;height:100%;object-fit:cover;background:#0A0A0C}
figcaption{margin-top:8px;line-height:1.5}
figcaption span{color:#8A8A85}
</style></head><body>
<div class="eb">EM / BUG</div><h1>Phase 1 — contact sheet</h1>
<p>Each bug twice: <b>left</b> the exported SVG itself (the top-down orthographic projection of the 3D model — tilt is in the solid, so a raised wing projects foreshortened), <b>right</b> the 3D model at a 3/4 view. Presets first, then eight random bugs (every slider uniform over its own range, seeds 1–8).</p>
<p>To rule by eye: the silhouettes, the body volume, and the tilt. Nothing on this sheet asks you to read a number.</p>
<h2>Presets</h2><div class="grid">${out.filter((o) => o.kind === 'preset').map(card).join('')}</div>
<h2>Random sliders</h2><div class="grid">${out.filter((o) => o.kind === 'random').map(card).join('')}</div>
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
