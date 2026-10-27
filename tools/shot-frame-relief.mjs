#!/usr/bin/env node
/* shot-frame-relief.mjs <dir> — the phase-2 contact sheet: the RELIEF, as the
   STL will print it, drawn by the page's own 3D view (frame-view3d.js, the
   STL's positions under the registry's one LIGHT, auto-rotate off).

   Every cell is the real page (window.__frame.setParams, setView('3d')) with
   the chrome hidden and the camera PINNED through __frame.pinCamera — the
   same camera on every whole-relief cell, so the frames are comparable — plus
   two close cameras: the COVE's left jamb (the profile's own relief, where the
   2-D sheet measures its tone) and the APEX MITRE (the join where the two
   offset arcs meet and the grid fans onto the mitre point). Cells: the
   shipped default, every molding preset, 0 and 4 mullions, each sill, pierced
   against backed, and the relief depth at three scales. Captions carry the
   read-out's own relief line (size, triangles, plate, depth, the floor).

   Writes <dir>/index.html (self-contained) and <dir>/frame-relief-sheet.png.
   No pixel claim is made anywhere: this sheet is for ruling by eye. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'frame-relief-sheet');
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
await page.route('**cdn.jsdelivr.net/**', (route) => {       // three from node_modules, no CDN egress
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
  catch { route.abort(); }
});
await page.goto(`${base}/frame.html`);
await page.waitForFunction(() => !!window.__frame);
await page.addStyleTag({ content: '.fr-panel,.fr-header,.fr-viewtoggle{display:none!important} .fr-stage{right:0!important;padding:0!important}' });
await page.evaluate(() => window.__frame.setView('3d'));
await page.waitForFunction(() => window.__frame.view() === '3d' && window.__frame.view3dInk() !== null, null, { timeout: 60000 });

/* Cameras in PRINT millimetres (the relief's own space). The default relief is
   180 mm tall; the whole view looks from front-right-above. The close views
   are the cove's left jamb mid-height and the apex, looking nearly straight
   on so the depth reads as light and shade. */
const WHOLE = { dir: [0.45, 0.3, 1], radius: 330 };
const COVE = { dir: [0.25, 0.1, 1], radius: 42, target: [-46, 52, 2] };
const APEX = { dir: [0.0, 0.25, 1], radius: 36, target: [0, 176, 2] };
const cells = [
  { row: 'shipped default', label: 'ogee · 2 mullions · plain sill · 180 mm · pierced', params: {}, cam: WHOLE },
  ...['flat', 'bead', 'cove', 'ogee', 'reeded', 'fluted', 'stepped'].map((n) => ({ row: 'profile preset (relief)', label: n, params: { profilePreset: n, mullions: 1 }, cam: WHOLE })),
  { row: 'mullions', label: '0 mullions', params: { mullions: 0 }, cam: WHOLE },
  { row: 'mullions', label: '4 mullions', params: { mullions: 4 }, cam: WHOLE },
  { row: 'sill', label: 'none', params: { sill: 'none' }, cam: WHOLE },
  { row: 'sill', label: 'stepped', params: { sill: 'stepped' }, cam: WHOLE },
  { row: 'lights', label: 'pierced (shipped)', params: {}, cam: WHOLE },
  { row: 'lights', label: 'backed', params: { lights: 'backed' }, cam: WHOLE },
  ...[0.5, 1, 2].map((k) => ({ row: 'relief depth scale', label: `${k.toFixed(2)} × profile`, params: { reliefScale: k }, cam: WHOLE })),
  { row: 'close: the cove, left jamb', label: 'cove · the profile as relief', params: { profilePreset: 'cove', mullions: 1 }, cam: COVE },
  { row: 'close: the cove, left jamb', label: 'ogee (shipped)', params: {}, cam: COVE },
  { row: 'close: the apex mitre', label: 'ogee (shipped) — the two offset arcs meet on the mitre', params: {}, cam: APEX },
  { row: 'close: the apex mitre', label: 'reeded — every reed meets its twin', params: { profilePreset: 'reeded', mullions: 1 }, cam: APEX },
  // the apex is at `height` whatever the pointedness (the jambs take what the rise leaves), so the same camera
  { row: 'close: the apex mitre', label: 'lancet 1.00 — a sharper mitre, same apex', params: { pointedness: 1 }, cam: APEX },
];

const out = [];
for (const c of cells) {
  await page.evaluate((p) => window.__frame.setParams(p), c.params);
  await page.evaluate((v) => window.__frame.pinCamera(v), c.cam);
  await page.waitForTimeout(150);
  // settle: screenshot until two consecutive frames are byte-identical
  let prev = null, png = null;
  for (let i = 0; i < 8; i++) { png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 720, height: 900 } }); if (prev && prev.equals(png)) break; prev = png; await page.waitForTimeout(120); }
  const r = await page.evaluate(() => window.__frame.readout());
  out.push({ ...c, png: png.toString('base64'), readout: r.split('\n').slice(0, 2).join(' · ') });
}
await page.evaluate(() => window.__frame.pinCamera(null));

const rows = [...new Set(out.map((c) => c.row))];
const html = `<!doctype html><meta charset="utf-8"><title>/frame — phase 2 relief sheet</title>
<style>body{background:#0A0A0C;color:#EDEDE8;font:11px/1.5 "Space Mono",monospace;margin:20px}h1{font:600 22px "Playfair Display",serif;margin:0 0 4px}h2{font:400 11px monospace;letter-spacing:.18em;text-transform:uppercase;color:#5FA0A0;margin:22px 0 8px}.row{display:flex;gap:14px;flex-wrap:wrap}.cell{width:260px}.cell img{width:260px;display:block;background:#0A0A0C;border:1px solid rgba(237,237,232,.22)}.cap{color:#8A8A85;margin-top:4px;font-size:10px}.cap b{color:#EDEDE8;font-weight:400}</style>
<h1>/frame — phase 2: the relief</h1><div>the STL's own positions under the one fixed light (upper-left), auto-rotate off, one pinned camera on every whole-relief cell; the close cells name their own. Nothing here has been printed; the 1.0 mm floor is an assumption. ${errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'no page errors'}</div>
${rows.map((r) => `<h2>${r}</h2><div class="row">${out.filter((c) => c.row === r).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap"><b>${c.label}</b><br>${c.readout}</div></div>`).join('')}</div>`).join('')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sheet = await browser.newPage({ viewport: { width: 1140, height: 900 }, deviceScaleFactor: 1 });
await sheet.goto(`file://${path.join(OUT, 'index.html')}`);
await sheet.screenshot({ path: path.join(OUT, 'frame-relief-sheet.png'), fullPage: true });
await browser.close(); server.close();
console.log(`${out.length} cells → ${OUT}/index.html, frame-relief-sheet.png${errors.length ? '\nPAGE ERRORS: ' + errors.join(' | ') : ''}`);
for (const c of out) console.log(`  ${c.row.padEnd(28)} ${c.label.padEnd(44)} ${c.readout}`);
