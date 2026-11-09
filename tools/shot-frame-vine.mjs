#!/usr/bin/env node
/* shot-frame-vine.mjs <dir> [--refs <dir>] [--only <regex>] — phase 3e
   step 3's contact sheet, SECOND ROUND (Eva's rulings on the first: the
   ornament capped to the band, the crest draped low and wide along it), in
   LARGER cells:
     - each skeleton full-frame at its default, front-on, one per row;
     - a close-up of the crest on all three (front-on and three-quarter, so
       "low" can be read as well as "wide");
     - a close-up of one corner / springing / shoulder on each;
     - the crest's two forms side by side on each skeleton (the shell and the
       spray, through the Crest control) — the lettered option;
     - Eva's references 2, 3 and 4 beside it when --refs names the directory
       holding 2.png / 3.png / 4.png (not in the repository).
   No pixel claim anywhere: for ruling by eye. Writes <dir>/index.html and
   <dir>/frame-vine-sheet.png. --only keeps the cells whose label matches
   (iteration). */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'frame-vine-sheet');
const refsAt = process.argv.indexOf('--refs'), REFS = refsAt > 0 ? path.resolve(process.argv[refsAt + 1]) : null;
fs.mkdirSync(OUT, { recursive: true });

const onlyAt = process.argv.indexOf('--only'), ONLY = onlyAt > 0 ? new RegExp(process.argv[onlyAt + 1]) : null;
const SK = [['arch', {}], ['rectangle', { skeleton: 'rect' }], ['oval', { skeleton: 'oval' }]];

// ---- the renders, through the page ----
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const VW = 900, VH = 1100;
const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route('**fonts.googleapis.com/**', (r) => r.abort());
await page.route('**fonts.gstatic.com/**', (r) => r.abort());
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
  catch { route.abort(); }
});
await page.goto(`${base}/frame.html`);
await page.waitForFunction(() => !!window.__frame);
await page.addStyleTag({ content: '.fr-panel,.fr-header,.fr-viewtoggle{display:none!important} .fr-stage{right:0!important;padding:0!important}' });
await page.evaluate(() => window.__frame.setView('3d'));
await page.waitForFunction(() => window.__frame.view() === '3d' && window.__frame.view3dInk() !== null, null, { timeout: 60000 });

const FRONT = { dir: [0, 0, 1], radius: 330 };
const ON = { filigree: 'scrolls' };
const at = (anchor, dir, radius) => ({ anchor, dir, radius });
const CREST = { arch: 'apex', rectangle: 'topCentre', oval: 'topCentre' };
const SHOULDER = { arch: ['springR', 'the right springing'], rectangle: ['cornerTR', 'the top-right corner'], oval: ['sideR', 'the right side (the shoulder)'] };
let cells = [
  ...SK.map(([sk, q]) => ({ row: `${sk} — the default, full frame, front-on`, label: `${sk} · default`, params: { ...q, ...ON }, cam: FRONT, big: true })),
  ...SK.flatMap(([sk, q]) => [
    { row: `close: the crest — ${sk}`, label: `${sk} crest · front-on`, params: { ...q, ...ON }, cam: at(CREST[sk], [0, 0, 1], 85), wide: true },
    { row: `close: the crest — ${sk}`, label: `${sk} crest · from above and the side`, params: { ...q, ...ON }, cam: at(CREST[sk], [0.35, 0.75, 1], 85), wide: true },
  ]),
  ...SK.flatMap(([sk, q]) => [
    { row: `close: ${SHOULDER[sk][1]} — ${sk}`, label: `${sk} ${SHOULDER[sk][0]} · front-on`, params: { ...q, ...ON }, cam: at(SHOULDER[sk][0], [0, 0, 1], 75), wide: true },
    { row: `close: ${SHOULDER[sk][1]} — ${sk}`, label: `${sk} ${SHOULDER[sk][0]} · three-quarter`, params: { ...q, ...ON }, cam: at(SHOULDER[sk][0], [0.45, 0.3, 1], 75), wide: true },
  ]),
  ...SK.flatMap(([sk, q]) => ['shell', 'spray'].map((k) => ({ row: 'the crest\'s two forms (the Crest control) — shell or spray', label: `${sk} · crest ${k}`, params: { ...q, ...ON, ornCrestMotif: k }, cam: at(CREST[sk], [0, 0, 1], 85), wide: true }))),
];
if (ONLY) cells = cells.filter((c) => ONLY.test(c.label));

const out = [];
for (const c of cells) {
  await page.evaluate((p) => window.__frame.setParams(p), c.params);
  let png = null;
  if (c.svg) {
    await page.evaluate(() => window.__frame.setView('svg'));
    await page.waitForTimeout(150);
    png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: VW, height: c.wide ? Math.round(VH * 0.62) : VH } });
    await page.evaluate(() => window.__frame.setView('3d'));
    await page.waitForFunction(() => window.__frame.view3dInk() !== null, null, { timeout: 60000 });
  } else {
    let cam = c.cam;
    if (cam.anchor) {
      const { pt, scale, plateT } = await page.evaluate((id) => { const m = window.__frame.model(); const s = window.__frame.stl().info; return { pt: m.info.anchors[id].pt, scale: s.scale, plateT: s.plateT }; }, cam.anchor);
      cam = { dir: cam.dir, radius: cam.radius, target: [pt[0] * scale, pt[1] * scale, plateT] };
    }
    await page.evaluate((v) => window.__frame.pinCamera(v), cam);
    await page.waitForTimeout(150);
    let prev = null;
    for (let i = 0; i < 8; i++) { png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: VW, height: c.wide ? Math.round(VH * 0.62) : VH } }); if (prev && prev.equals(png)) break; prev = png; await page.waitForTimeout(120); }
  }
  const r = await page.evaluate(() => window.__frame.readout());
  const lines = r.split('\n');
  out.push({ ...c, png: png.toString('base64'), readout: [lines[0].replace(/ · floor:.*/, ''), lines.find((l) => /^ornament/.test(l)) || ''].join(' · ') });
}
await page.evaluate(() => window.__frame.pinCamera(null));

const rows = [...new Set(out.map((c) => c.row))];
const refs = REFS ? `<h2>Eva's references 2, 3, 4</h2><div class="row">${['2', '3', '4'].map((n) => { const f = path.join(REFS, n + '.png'); return fs.existsSync(f) ? `<div class="cell"><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"><div class="cap"><b>ref ${n}</b></div></div>` : ''; }).join('')}</div>` : '<h2>references 2, 3, 4 — not in the repository: hold the sheet beside them</h2>';
const html = `<!doctype html><meta charset="utf-8"><title>/frame — phase 3e step 3: the vine</title>
<style>body{background:#0A0A0C;color:#EDEDE8;font:11px/1.5 "Space Mono",monospace;margin:20px}h1{font:600 22px "Playfair Display",serif;margin:0 0 4px}h2{font:400 11px monospace;letter-spacing:.18em;text-transform:uppercase;color:#5FA0A0;margin:22px 0 8px}.row{display:flex;gap:14px;flex-wrap:wrap}.cell{width:640px}.cell.big{width:900px}.cell img{width:100%;display:block;background:#0A0A0C;border:1px solid rgba(237,237,232,.22)}.cap{color:#8A8A85;margin-top:4px;font-size:9.5px}.cap b{color:#EDEDE8;font-weight:400}</style>
<h1>/frame — phase 3e step 3, second round: the ornament capped to the band, the crest draped low and wide</h1><div>the STL's own positions under the one fixed light; the engraving is the SVG the button saves. Nothing here has been printed; the 1.0 mm floor is an assumption. ${errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'no page errors'}</div>
${refs}
${rows.map((r) => `<h2>${r}</h2><div class="row">${out.filter((c) => c.row === r).map((c) => `<div class="cell${c.big ? ' big' : ''}"><img src="data:image/png;base64,${c.png}"><div class="cap"><b>${c.label}</b><br>${c.readout}</div></div>`).join('')}</div>`).join('')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sheet = await browser.newPage({ viewport: { width: 1340, height: 900 }, deviceScaleFactor: 1 });
await sheet.goto(`file://${path.join(OUT, 'index.html')}`);
await sheet.screenshot({ path: path.join(OUT, 'frame-vine-sheet.png'), fullPage: true });
await browser.close(); server.close();
console.log(`${out.length} cells → ${OUT}/index.html, frame-vine-sheet.png${errors.length ? '\nPAGE ERRORS: ' + errors.join(' | ') : ''}`);
