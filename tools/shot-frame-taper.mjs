#!/usr/bin/env node
/* shot-frame-taper.mjs <dir> — phase 3b's contact sheet: the CONSTANT wire
   beside the TAPERED one (Eva's ruling 1), on the default arch, rectangle
   and oval as the STL prints them (one pinned camera on every whole cell),
   the engraving (SVG) of each, and close cameras on one corner group in
   each style, placed on the page's own named anchors. Defaults otherwise
   (scale 2.5, density 2, crest + corners, relief 1.25). Captions carry the
   read-out's ornament line. No pixel claim anywhere: this sheet is for the
   one ruling — the default wire style. Writes <dir>/index.html and
   <dir>/frame-taper-sheet.png. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'frame-skeletons-sheet');
fs.mkdirSync(OUT, { recursive: true });
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
const page = await browser.newPage({ viewport: { width: 720, height: 900 }, deviceScaleFactor: 1 });
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

const WHOLE = { dir: [0.45, 0.3, 1], radius: 380 };
const SK = [['arch', {}], ['rectangle', { skeleton: 'rect' }], ['oval', { skeleton: 'oval' }]];
const ON = { filigree: 'scrolls' };
const at = (anchor, dir, radius) => ({ anchor, dir, radius });
const STY = [['constant', { ...ON, ornWireStyle: 'constant' }], ['tapered', { ...ON, ornWireStyle: 'tapered' }]];
const cells = [
  ...SK.map(([sk, q]) => STY.map(([l, o]) => ({ row: `${sk} — relief, constant vs tapered`, label: `${sk} · ${l}`, params: { ...q, ...o }, cam: WHOLE }))).flat(),
  ...SK.map(([sk, q]) => STY.map(([l, o]) => ({ row: `${sk} — the engraving (SVG)`, label: `${sk} · ${l}`, params: { ...q, ...o }, svg: true }))).flat(),
  ...STY.map(([l, o]) => ({ row: 'close: the rectangle\'s top-right corner group', label: `corner group · ${l}`, params: { skeleton: 'rect', ...o }, cam: at('cornerTR', [0.35, 0.25, 1], 55) })),
  ...STY.map(([l, o]) => ({ row: 'close: the arch\'s right springing group, low light angle', label: `springing group · ${l}`, params: { ...o }, cam: at('springR', [0.55, 0.15, 0.8], 50) })),
  ...STY.map(([l, o]) => ({ row: 'close: the arch crest (the mirrored pair on the axis)', label: `crest · ${l}`, params: { ...o }, cam: at('apex', [0.25, 0.35, 1], 55) })),
];

const out = [];
for (const c of cells) {
  await page.evaluate((p) => window.__frame.setParams(p), c.params);
  let png = null;
  if (c.svg) {
    await page.evaluate(() => window.__frame.setView('svg'));
    await page.waitForTimeout(150);
    png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 720, height: 900 } });
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
    for (let i = 0; i < 8; i++) { png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 720, height: 900 } }); if (prev && prev.equals(png)) break; prev = png; await page.waitForTimeout(120); }
  }
  const r = await page.evaluate(() => window.__frame.readout());
  const lines = r.split('\n');
  out.push({ ...c, png: png.toString('base64'), readout: (lines.find((l) => /^ornament/.test(l.replace(/<[^>]+>/g, ''))) || '').replace(/<[^>]+>/g, '') });
}
await page.evaluate(() => window.__frame.pinCamera(null));

const rows = [...new Set(out.map((c) => c.row))];
const html = `<!doctype html><meta charset="utf-8"><title>/frame — phase 3b wire style</title>
<style>body{background:#0A0A0C;color:#EDEDE8;font:11px/1.5 "Space Mono",monospace;margin:20px}h1{font:600 22px "Playfair Display",serif;margin:0 0 4px}h2{font:400 11px monospace;letter-spacing:.18em;text-transform:uppercase;color:#5FA0A0;margin:22px 0 8px}.row{display:flex;gap:14px;flex-wrap:wrap}.cell{width:340px}.cell img{width:340px;display:block;background:#0A0A0C;border:1px solid rgba(237,237,232,.22)}.cap{color:#8A8A85;margin-top:4px;font-size:10px}.cap b{color:#EDEDE8;font-weight:400}</style>
<h1>/frame — phase 3b: constant vs tapered wire</h1><div>left of each pair the CONSTANT wire, right the TAPERED (full width through the body, thinning over each volute to max(1.0, ½ wire) at the eye); the volute share held at 0.5 (a long body ending in a smaller curl); the STL's own positions under the one fixed light; one pinned camera on every whole cell; close cells on the page's named anchors; the engraving is the SVG string the button saves. Nothing here has been printed; the 1.0 mm floor is an assumption. ${errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'no page errors'}</div>
${rows.map((r) => `<h2>${r}</h2><div class="row">${out.filter((c) => c.row === r).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap"><b>${c.label}</b><br>${c.readout}</div></div>`).join('')}</div>`).join('')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sheet = await browser.newPage({ viewport: { width: 760, height: 900 }, deviceScaleFactor: 1 });
await sheet.goto(`file://${path.join(OUT, 'index.html')}`);
await sheet.screenshot({ path: path.join(OUT, 'frame-taper-sheet.png'), fullPage: true });
await browser.close(); server.close();
console.log(`${out.length} cells → ${OUT}/index.html, frame-taper-sheet.png${errors.length ? '\nPAGE ERRORS: ' + errors.join(' | ') : ''}`);
for (const c of out) console.log(`  ${c.label.padEnd(44)} ${c.readout.slice(0, 160)}`);
