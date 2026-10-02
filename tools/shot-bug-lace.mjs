#!/usr/bin/env node
/* shot-bug-lace.mjs <dir> [--only=<section>[,..]] — the contact sheet for /bug
   PHASE 4, the lace import (bug-project-design-doc.md §10).

   EVERY lace on this sheet is the STAND-IN TEST PATTERN (rings, dots and one
   zig-zag stroke — bug-lace.js STAND_IN_SVG), not lace: Eva's lace SVGs were
   not supplied, so the LOOK cannot be ruled from this sheet — only the
   mechanics (where the artwork goes, how it is clipped, warped, blended and
   made printable). Every cell is driven through the real page and shows the
   EXPORTED SVG beside the 3D model at 3/4 (the 3D view IS what the STL
   carries: under the SVG-only option it shows the procedural veins). Sections:
     role    the specimen default with the lace in FILL CELLS and in REPLACE VEINS
     warp    CLIP, RADIAL and ENVELOPE on the same lace (REPLACE)
     blend   the procedural <-> import blend at 0, 0.5 and 1
     island  the three island options side by side (and no option: blocked)
     ridges  a RIDGES lace (a raised lace on a solid wing — no islands)
     dfly    a dragonfly-like bug, sliders only, with a REPLACE VEINS panel
   No pixel claim is made anywhere: the sheet is for ruling by eye.

   Writes <dir>/index.html (self-contained) and <dir>/bug-lace-sheet.png. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import * as G from '../bug-geometry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'bug-lace-sheet');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.slice(7).split(',') : null;
const want = (k) => !ONLY || ONLY.includes(k);
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

const D = () => G.defaultParams();
const set = (fn) => { const p = D(); p.venation = 'holes'; fn(p); return p; };
const both = (p, f) => { for (const w of [p.wings.first, p.wings.last]) f(w); };
const laceSum = (L) => L.filter(Boolean).map((x, i) => `p${i + 1}:${x.role}/${x.mode}${x.svgOnly ? '/svg-only' : ''} holes ${x.stats.holes} plates ${x.stats.plates} islands ${x.stats.islandsFound} (dropped ${x.stats.dropped}, tied ${x.ties}, loose ${x.keptIslands ?? 0})${x.thin.thin ? ` THIN ${x.thin.depthMm.toFixed(2)}mm` : ''}`).join(' · ');
const out = [];
async function shoot(label, sec, params, extra = {}) {
  if (params) await page.evaluate((p) => window.__bug.setParams(p), params);
  await page.evaluate(() => window.__bug.flushBuild());
  await page.evaluate(() => window.__bug.setView('three'));
  const png = (await page.screenshot({ type: 'png' })).toString('base64');
  let close = null;
  if (extra.closeUp) {
    await page.evaluate((c) => window.__bug.lookAt(c.target, c.dir, c.dist), extra.closeUp);
    close = (await page.screenshot({ type: 'png' })).toString('base64');
  }
  const svg = await page.evaluate(() => window.__bug.svg(false));
  const pp = await page.evaluate(() => window.__bug.getParams());
  const fl = await page.evaluate(() => window.__bug.floor());
  const lace = await page.evaluate(() => window.__bug.lace());
  const cut = await page.evaluate(() => window.__bug.svg(true).regions);
  const rec = { label, sec, params: pp, png, close, svg: svg.svg, svgW: svg.widthMm, svgH: svg.heightMm, tris: await page.evaluate(() => window.__bug.triangleCount()), notes: await page.evaluate(() => window.__bug.notes()), floor: fl, lace, cut, ...extra };
  out.push(rec);
  console.log(`${label.padEnd(60)} tris=${rec.tris} floor ${fl.violations.length ? 'VIOLATED ' + fl.violations.map((v) => v.kind + (v.pair ?? '')).join(',') : 'ok'} cut-safe regions ${cut} ${laceSum(lace)}`);
  return rec;
}


if (want('role')) {
  await shoot('FILL CELLS — the stand-in clipped to every cell, the veins kept (islands: bridge)', 'role', set((p) => { p.laceIslands = 'bridge'; both(p, (w) => { w.laceRole = 1; }); }));
  await shoot('REPLACE VEINS — one panel clipped to the outline, the veins hidden (islands: bridge)', 'role', set((p) => { p.laceIslands = 'bridge'; both(p, (w) => { w.laceRole = 2; }); }));
}
if (want('warp')) {
  for (const [k, n, why] of [[0, 'CLIP', 'placed flat and trimmed at the margin (40 mm across at scale 1)'], [1, 'RADIAL', 'polar about the hinge: fans with the veins'], [2, 'ENVELOPE', 'the artwork’s box mapped onto the planform: follows the outline']])
    await shoot(`${n} — ${why}`, 'warp', set((p) => { p.laceIslands = 'bridge'; both(p, (w) => { w.laceRole = 2; w.laceWarp = k; }); }));
  // the same lace at the smallest swept scale that exports (1.25 / 1.5 / 1.75 / 2 ... tried in order)
  await shoot('RADIAL at scale 1.5 — the first swept scale that exports', 'warp', set((p) => { p.laceIslands = 'bridge'; both(p, (w) => { w.laceRole = 2; w.laceWarp = 1; w.laceScale = 1.5; }); }));
  await shoot('ENVELOPE at scale 1.75 — the first swept scale that exports', 'warp', set((p) => { p.laceIslands = 'bridge'; both(p, (w) => { w.laceRole = 2; w.laceWarp = 2; w.laceScale = 1.75; }); }));
}
if (want('blend')) {
  for (const b of [0, 0.5, 1]) await shoot(`blend ${b} — ${b === 0 ? 'the procedural wing, bit for bit' : b === 1 ? 'all import' : 'procedural at the root, the import beyond a vein-wide arc'}`, 'blend', set((p) => { p.laceIslands = 'bridge'; both(p, (w) => { w.laceRole = 2; w.laceBlend = b; }); }));
}
if (want('island')) {
  const isl = (opt, lab) => shoot(lab, 'island', set((p) => { p.laceIslands = opt; both(p, (w) => { w.laceRole = 2; }); }), { closeUp: { target: [14, 2, 0], dir: [0.15, -0.35, 1], dist: 38 } });
  await isl('unset', 'no option chosen — islands left loose: the STL is BLOCKED (no default is picked)');
  await isl('drop', 'DROP — islands under 4 mm² removed (the dots go; a larger one would stay and block)');
  await isl('bridge', 'BRIDGE — every island tied straight to its nearest frame, ties at 1.2 mm (≥ the floor)');
  await isl('svg', 'SVG-ONLY — the lace is in the SVG only; the 3D / STL carry the PROCEDURAL veins (the declared exception)');
}
if (want('ridges')) {
  await shoot('RIDGES lace — the stand-in raised on a solid wing, REPLACE (no islands possible)', 'ridges', set((p) => { p.venation = 'ridges'; both(p, (w) => { w.laceRole = 2; }); }), { closeUp: { target: [14, 2, 0], dir: [0.3, -0.6, 0.8], dist: 30 } });
  await shoot('RIDGES lace — FILL CELLS: the kept ridges and the lace merge into one raised plate per wing, so the SVG reads mostly ink at this scale', 'ridges', set((p) => { p.venation = 'ridges'; both(p, (w) => { w.laceRole = 1; }); }));
}
if (want('dfly')) {
  await shoot('DRAGONFLY-like — sliders only, one REPLACE VEINS panel per wing (CLIP, scale 1), islands bridged', 'dfly', set((p) => {
    p.antennaType = 'bristle'; p.antennaLength = 3; p.headSize = 5.2;
    p.thoraxLength = 7; p.thoraxWidth = 4.6; p.thoraxDepth = 4.8; p.abdomenLength = 50; p.abdomenWidth = 2.4; p.abdomenTaper = 0.35; p.abdomenSegments = 10;
    for (const w of [p.wings.first, p.wings.last]) { w.stretch = 0.5; w.length = 40; w.scallop = 0; w.stigma = 1; w.crossDensity = 0.8; w.cellRegularity = 0.8; w.veinCount = 6; w.veinBranch = 0; w.laceRole = 2; w.laceWarp = 0; w.laceScale = 1; }
    p.wings.first.sweep = 0; p.wings.last.sweep = 4; p.wings.last.length = 38;
    p.laceIslands = 'bridge';
  }));
}

const cap = (o) => `${o.tris.toLocaleString()} tris · SVG ${o.svgW.toFixed(0)}×${o.svgH.toFixed(0)} mm · cut-safe ${o.cut} region${o.cut === 1 ? '' : 's'} · STL ${o.floor.violations.length ? `REFUSED (${[...new Set(o.floor.violations.map((v) => v.kind))].join(', ')})` : 'exports'}<br>${laceSum(o.lace) || 'no lace'}${o.notes.length ? ` · notes: ${o.notes.join('; ')}` : ''}`;
const card = (o) => `
<figure class="cell">
  <div class="tag">STAND-IN TEST PATTERN — not lace</div>
  <div class="pair${o.close ? ' three' : ''}">
    <div class="svg">${o.svg.replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" ')}</div>
    <img src="data:image/png;base64,${o.png}" alt="${o.label} 3/4">
    ${o.close ? `<img src="data:image/png;base64,${o.close}" alt="${o.label} close-up">` : ''}
  </div>
  <figcaption><b>${o.label}</b><br><span>${cap(o)}</span></figcaption>
</figure>`;
const sec = (title, key, blurb = '') => (out.some((o) => o.sec === key) ? `<h2>${title}</h2>${blurb ? `<p>${blurb}</p>` : ''}<div class="grid">${out.filter((o) => o.sec === key).map(card).join('')}</div>` : '');
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bug — lace sheet</title>
<style>
body{margin:0;background:#0A0A0C;color:#EDEDE8;font-family:'Space Mono',monospace;font-size:12px;padding:24px}
h1{font-family:'Playfair Display',Georgia,serif;font-weight:600;font-size:30px;margin:4px 0 6px}
.eb{color:#5FA0A0;letter-spacing:.22em;font-size:11px}
p{color:#8A8A85;max-width:1150px;line-height:1.5;margin:0 0 6px}
.warn{color:#e5484d;font-weight:bold;font-size:14px;max-width:1150px}
h2{font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:20px;margin:22px 0 10px;color:#EDEDE8}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.cell{margin:0;border:1px solid rgba(237,237,232,.22);padding:10px}
.tag{color:#e5484d;letter-spacing:.12em;font-size:10px;margin-bottom:6px}
.pair{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:100%;gap:8px;height:330px}
.pair.three{grid-template-columns:1fr 1fr 1fr;height:250px}
.pair > *{min-height:0;min-width:0}
.svg{background:#EDEDE8;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:8px}
.svg svg{width:100%;height:100%}
.pair img{width:100%;height:100%;object-fit:cover;background:#0A0A0C}
figcaption{margin-top:8px;line-height:1.5}
figcaption span{color:#8A8A85}
</style></head><body>
<div class="eb">EM / BUG</div><h1>Phase 4 — the lace import — contact sheet</h1>
<p class="warn">EVERY LACE ON THIS SHEET IS A STAND-IN TEST PATTERN (rings, dots and one zig-zag stroke), NOT LACE. No lace SVGs were supplied, so the LOOK cannot be ruled until Eva’s files exist; this sheet rules only the MECHANICS — where an import goes, how it is clipped, warped, blended and made printable.</p>
<p>Each cell: <b>left</b> the exported SVG (top-down projection of the 3D model — the lace is in black on the wing), <b>right</b> the 3D model at 3/4 (what the STL carries). The island and RIDGES cells add a close-up. Captions carry the measured lace record: holes / plates, islands found and what the option did with them, the cut-safe region count, and whether the STL exports. The lace reference images are not in the repository; the dragonfly cell asks to be held beside them.</p>
${sec('The specimen default with the lace in FILL CELLS and in REPLACE VEINS', 'role')}
${sec('Each warp on the same lace (REPLACE, islands bridged)', 'warp', 'First the three warps at scale 1, then RADIAL and ENVELOPE at the smallest swept scale that exports. RADIAL and ENVELOPE stretch ONE copy of the artwork over the whole wing, so at scale 1 they squeeze the threads under the 1.0 mm floor near the hinge and in the narrow parts: the STL is REFUSED and the thin lace drawn red, exactly as a thin vein is — never silently thickened. CLIP keeps the artwork at an absolute size (40 mm across at scale 1), so its threads are the same width on every wing.')}
${sec('The procedural ↔ import blend at 0, 0.5 and 1', 'blend', 'Below 1 the wing is procedural inside a vein-wide arc about the root chord’s middle and the import outside it; the arc moves out as the blend falls. A signed-distance MORPH was built first and refused on measurement: at 0.25 / 0.5 / 0.75 it thinned both drawings under the floor (§10).')}
${sec('The island problem in HOLES — the three options, and no option', 'island', 'No default is picked: with no option chosen loose islands block the STL. Every option yields ONE connected solid (gated, C and LA3).')}
${sec('A RIDGES lace', 'ridges')}
${sec('A dragonfly-like bug with a REPLACE VEINS panel', 'dfly', 'Sliders only from the default (the elegance sheet’s dragonfly), the stand-in as one continuous CLIP panel per wing, the procedural veins hidden. (RADIAL at 0.8 also exports, but at this chord it reads as a few stretched hoops rather than a panel.)')}
</body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sheet = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await sheet.goto('file://' + path.join(OUT, 'index.html'));
await sheet.screenshot({ path: path.join(OUT, 'bug-lace-sheet.png'), fullPage: true });
await browser.close();
server.close();
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
console.log(`wrote ${path.join(OUT, 'index.html')} and bug-lace-sheet.png`);
if (errors.length) process.exit(1);
