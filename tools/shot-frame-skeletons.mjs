#!/usr/bin/env node
/* shot-frame-skeletons.mjs <dir> — the phase-2b contact sheet: the three
   skeleton types as RELIEF, drawn by the page's own 3D view (the STL's
   positions under the registry's one LIGHT, auto-rotate off), chrome hidden.

   Rows: every skeleton (arch, rectangle, oval) × three presets (ogee — the
   shipped default — cove, reeded) at ONE pinned camera; the rectangle's four
   corner treatments whole; the oval's aspect (circle, tall, wide); CLOSE-UPS
   of a rectangle corner (top-right, each treatment) and of the oval's SEAM
   (the loop's own start, the bottom centre) beside its antipode (the top
   centre) — both placed from the page's own named anchors and print scale,
   never typed; the INTERIOR (open / backed / recessed) on a frame, for the
   unruled default; the relief depth at 0.5 / 1 / 2 × profile on a frame.

   Writes <dir>/index.html and <dir>/frame-skeletons-sheet.png. No pixel claim
   is made: this sheet is for ruling by eye. */

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

const WHOLE = { dir: [0.45, 0.3, 1], radius: 360 };
const RECT = { skeleton: 'rect' }, OVAL = { skeleton: 'oval' };
// a close camera on a named anchor, in print mm (the anchor × the print scale)
const at = (anchor, dir, radius) => ({ anchor, dir, radius });
const cells = [
  ...[['arch', {}], ['rectangle', RECT], ['oval', OVAL]].flatMap(([sk, q]) => ['ogee', 'cove', 'reeded'].map((k) => ({ row: `${sk} × preset`, label: `${sk} · ${k}${k === 'ogee' ? ' (shipped preset)' : ''}`, params: { ...q, profilePreset: k }, cam: WHOLE }))),
  ...['mitre', 'rounded', 'notched', 'eared'].map((t) => ({ row: 'rectangle corners', label: t, params: { ...RECT, cornerTreatment: t }, cam: WHOLE })),
  ...[[1, 'circle — aspect 1.00'], [0.5, 'tall — 0.50'], [2, 'wide — 2.00']].map(([k, l]) => ({ row: 'oval aspect', label: l, params: { ...OVAL, aspect: k }, cam: WHOLE })),
  ...['mitre', 'rounded', 'notched', 'eared'].map((t) => ({ row: 'close: a rectangle corner (top right, from its anchor)', label: `${t} · ogee`, params: { ...RECT, cornerTreatment: t }, cam: at('cornerTR', [0.3, 0.35, 1], 55) })),
  { row: 'close: the oval seam (the loop\'s start) and its antipode', label: 'seam — bottom centre, reeded', params: { ...OVAL, profilePreset: 'reeded' }, cam: at('bottomCentre', [0, -0.45, 1], 40) },
  { row: 'close: the oval seam (the loop\'s start) and its antipode', label: 'antipode — top centre, reeded', params: { ...OVAL, profilePreset: 'reeded' }, cam: at('topCentre', [0, 0.45, 1], 40) },
  { row: 'close: the oval seam (the loop\'s start) and its antipode', label: 'seam — bottom centre, ogee', params: { ...OVAL }, cam: at('bottomCentre', [0, -0.45, 1], 40) },
  { row: 'close: the oval seam (the loop\'s start) and its antipode', label: 'seam — rectangle bottom centre, reeded', params: { ...RECT, profilePreset: 'reeded' }, cam: at('bottomCentre', [0, -0.45, 1], 40) },
  ...[['pierced', 'open (pierced)'], ['backed', 'backed'], ['recessed', 'recessed']].flatMap(([v, l]) => [
    { row: 'interior — NOT RULED for the frames', label: `rectangle · ${l}`, params: { ...RECT, lights: v }, cam: WHOLE },
    { row: 'interior — NOT RULED for the frames', label: `oval · ${l}`, params: { ...OVAL, lights: v }, cam: WHOLE },
  ]),
  ...[0.5, 1, 2].map((k) => ({ row: 'relief depth (ruling 5 asks for the default)', label: `rectangle rounded · ${k.toFixed(2)} × profile`, params: { ...RECT, cornerTreatment: 'rounded', reliefScale: k }, cam: at('cornerTR', [0.6, 0.2, 0.8], 70) })),
];

const out = [];
for (const c of cells) {
  await page.evaluate((p) => window.__frame.setParams(p), c.params);
  let cam = c.cam;
  if (cam.anchor) {
    const { pt, scale, plateT } = await page.evaluate((id) => { const m = window.__frame.model(); const s = window.__frame.stl().info; return { pt: m.info.anchors[id].pt, scale: s.scale, plateT: s.plateT }; }, cam.anchor);
    cam = { dir: cam.dir, radius: cam.radius, target: [pt[0] * scale, pt[1] * scale, plateT] };
  }
  await page.evaluate((v) => window.__frame.pinCamera(v), cam);
  await page.waitForTimeout(150);
  let prev = null, png = null;
  for (let i = 0; i < 8; i++) { png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 720, height: 900 } }); if (prev && prev.equals(png)) break; prev = png; await page.waitForTimeout(120); }
  const r = await page.evaluate(() => window.__frame.readout());
  const lines = r.split('\n');
  out.push({ ...c, png: png.toString('base64'), readout: [lines[0], lines.find((l) => /^(rectangle|oval|circle|spring line)/.test(l)) || ''].join(' · ') });
}
await page.evaluate(() => window.__frame.pinCamera(null));

const rows = [...new Set(out.map((c) => c.row))];
const html = `<!doctype html><meta charset="utf-8"><title>/frame — phase 2b skeletons</title>
<style>body{background:#0A0A0C;color:#EDEDE8;font:11px/1.5 "Space Mono",monospace;margin:20px}h1{font:600 22px "Playfair Display",serif;margin:0 0 4px}h2{font:400 11px monospace;letter-spacing:.18em;text-transform:uppercase;color:#5FA0A0;margin:22px 0 8px}.row{display:flex;gap:14px;flex-wrap:wrap}.cell{width:260px}.cell img{width:260px;display:block;background:#0A0A0C;border:1px solid rgba(237,237,232,.22)}.cap{color:#8A8A85;margin-top:4px;font-size:10px}.cap b{color:#EDEDE8;font-weight:400}</style>
<h1>/frame — phase 2b: rectangle and oval skeletons</h1><div>the STL's own positions under the one fixed light, auto-rotate off; one pinned camera on every whole cell; the close cells are placed on the page's own named anchors. Nothing here has been printed; the 1.0 mm floor is an assumption. ${errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'no page errors'}</div>
${rows.map((r) => `<h2>${r}</h2><div class="row">${out.filter((c) => c.row === r).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap"><b>${c.label}</b><br>${c.readout}</div></div>`).join('')}</div>`).join('')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sheet = await browser.newPage({ viewport: { width: 1140, height: 900 }, deviceScaleFactor: 1 });
await sheet.goto(`file://${path.join(OUT, 'index.html')}`);
await sheet.screenshot({ path: path.join(OUT, 'frame-skeletons-sheet.png'), fullPage: true });
await browser.close(); server.close();
console.log(`${out.length} cells → ${OUT}/index.html, frame-skeletons-sheet.png${errors.length ? '\nPAGE ERRORS: ' + errors.join(' | ') : ''}`);
for (const c of out) console.log(`  ${c.row.slice(0, 34).padEnd(34)} ${c.label.padEnd(40)} ${c.readout.slice(0, 110)}`);
