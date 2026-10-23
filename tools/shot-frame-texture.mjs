#!/usr/bin/env node
/* shot-frame-texture.mjs <dir> [--png <file>] [--only <regex>] — the phase-4 VOCABULARY sheet
   (charter §12): every candidate texture, drawn by the page's own Relief view
   (frame-view3d.js — the STL's positions under the registry's one LIGHT,
   auto-rotate off), for Eva to pick from.

     A  close-up on the COVE preset's left jamb, each texture × scale (fine
        2 mm / medium 4 mm / coarse 8 mm) × amplitude (the 1.0 mm floor / 2×
        the floor), beside the untextured cove;
     B  the seam: the oval's bottom centre (the closed loop's start, where a
        sweep-parameter texture would show a line) per texture;
     C  each texture on the default arch, rectangle and oval, whole, at the
        medium scale and the floor amplitude, beside the three untextured.

   Every cell is the real page (window.__frame.setParams, setView('3d')) with
   the chrome hidden and the camera PINNED; captions carry the relief's own
   numbers (triangles, STL size, the achieved amplitude and every hold). No
   pixel claim is made: the sheet is for ruling by eye. Writes
   <dir>/index.html and <dir>/frame-texture-sheet.png (or --png). */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const OUT = path.resolve(args.find((a, i) => !a.startsWith('--') && !['--png', '--only'].includes(args[i - 1])) || 'frame-texture-sheet');
const PNG = args.includes('--png') ? path.resolve(args[args.indexOf('--png') + 1]) : path.join(OUT, 'frame-texture-sheet.png');
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
const page = await browser.newPage({ viewport: { width: 440, height: 440 }, deviceScaleFactor: 1 });
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

const KINDS = [['stone', 'stone grain'], ['weathering', 'weathering — pits + worn edges'], ['cracks', 'cracks — incised'], ['hammered', 'hammered metal — faceted dimples']];
const SCALES = [[2, 'fine 2 mm'], [4, 'medium 4 mm'], [8, 'coarse 8 mm']];
const AMPS = [[1, 'floor 1.0 mm'], [2, '2× floor 2.0 mm']];
/* cameras in PRINT mm. The cove's left jamb at mid-height, a little raking
   so the light reads the relief; the oval's bottom centre (its seam); the
   three skeletons whole. */
const COVE = { dir: [0.3, 0.12, 1], radius: 44, target: [-47, 60, 3] };
const SEAM = { dir: [0.0, 0.32, 1], radius: 44, target: [0, 5, 3] };
const WHOLE = { dir: [0.35, 0.25, 1], radius: 420 };
const cells = [
  { row: 'A · reference — the cove, no texture', size: 440, label: 'cove · none', params: { profilePreset: 'cove' }, cam: COVE },
  ...KINDS.flatMap(([k, kl]) => SCALES.flatMap(([s, sl]) => AMPS.map(([a, al]) => ({ row: `A · ${kl} — the cove, left jamb`, size: 440, label: `${sl} · ${al}`, params: { profilePreset: 'cove', texture: k, textureScale: s, textureAmplitude: a }, cam: COVE })))),
  { row: 'B · the seam — the oval\'s bottom centre, where the closed loop starts (medium 4 mm, 2× floor)', size: 440, label: 'none', params: { skeleton: 'oval' }, cam: SEAM },
  ...KINDS.map(([k, kl]) => ({ row: 'B · the seam — the oval\'s bottom centre, where the closed loop starts (medium 4 mm, 2× floor)', size: 440, label: kl, params: { skeleton: 'oval', texture: k, textureScale: 4, textureAmplitude: 2 }, cam: SEAM })),
  ...[['arch', {}], ['rectangle', { skeleton: 'rect' }], ['oval', { skeleton: 'oval' }]].flatMap(([sk, sq]) => [['none', 'none'], ...KINDS].map(([k, kl]) => ({ row: `C · the default ${sk}, whole (medium 4 mm, floor 1.0 mm)`, size: 660, label: kl, params: { ...sq, texture: k, textureScale: 4, textureAmplitude: 1 }, cam: WHOLE }))),
];

const ONLY = args.includes('--only') ? new RegExp(args[args.indexOf('--only') + 1]) : null;   // iteration: a cell subset by row or label
const out = [];
let vp = 0;
for (const c of cells.filter((q) => !ONLY || ONLY.test(q.row + ' ' + q.label))) {
  if (vp !== c.size) { await page.setViewportSize({ width: c.size, height: c.size }); vp = c.size; await page.waitForTimeout(100); }
  await page.evaluate((p) => window.__frame.setParams(p), c.params);
  await page.evaluate((v) => window.__frame.pinCamera(v), c.cam);
  await page.waitForTimeout(150);
  let prev = null, png = null;
  for (let i = 0; i < 8; i++) { png = await page.screenshot({ type: 'png' }); if (prev && prev.equals(png)) break; prev = png; await page.waitForTimeout(120); }
  const st = await page.evaluate(() => window.__frame.stl());
  const T = st.info.texture;
  const cap = `${st.triangles.toLocaleString('en')} tris · ${(st.bytes / 1048576).toFixed(1)} MB STL`
    + (T ? ` · achieved ${T.achieved.toFixed(2)} of ${T.amp.toFixed(2)} mm · held: floor ${T.clamped}, curvature ${T.curveHeld}, fold pass ${T.foldHeld} of ${T.vertices.toLocaleString("en")} · folds ${T.folds} · nearest the back ${T.zMin.toFixed(2)} mm · wall lean ≤ ${Math.max(T.leanOut, T.leanIn).toFixed(2)} mm` : '');
  out.push({ ...c, png: png.toString('base64'), cap });
  process.stdout.write('.');
}
await page.evaluate(() => window.__frame.pinCamera(null));
console.log('');

const rows = [...new Set(out.map((c) => c.row))];
const html = `<!doctype html><meta charset="utf-8"><title>/frame — phase 4 texture vocabulary</title>
<style>body{background:#0A0A0C;color:#EDEDE8;font:11px/1.5 "Space Mono",monospace;margin:20px;width:1460px}h1{font:600 22px "Playfair Display",serif;margin:0 0 4px}h2{font:400 11px monospace;letter-spacing:.14em;text-transform:uppercase;color:#5FA0A0;margin:20px 0 8px}.row{display:flex;gap:12px;flex-wrap:wrap}.cell img{display:block;border:1px solid rgba(237,237,232,.22)}.c440{width:228px}.c440 img{width:228px}.c660{width:280px}.c660 img{width:280px}.cap{color:#8A8A85;margin-top:3px;font-size:9.5px}.cap b{color:#EDEDE8;font-weight:400;font-size:10.5px}</style>
<h1>/frame — phase 4: texture, the vocabulary</h1><div>Real displacement of the MOLDING's relief surface along its normal, in the STL; never the plate, never the scrolls; evaluated in 3-D space, not mirrored. The page's Relief view: the STL's positions under the one fixed light (upper left). Amplitude is peak to valley in print mm; 1.0 mm is the assumed floor (nothing has been printed). ${errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'no page errors'}</div>
${rows.map((r) => `<h2>${r}</h2><div class="row">${out.filter((c) => c.row === r).map((c) => `<div class="cell c${c.size}"><img src="data:image/png;base64,${c.png}"><div class="cap"><b>${c.label}</b><br>${c.cap}</div></div>`).join('')}</div>`).join('')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sheet = await browser.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1 });
await sheet.goto(`file://${path.join(OUT, 'index.html')}`);
await sheet.screenshot({ path: PNG, fullPage: true });
await browser.close(); server.close();
console.log(`${out.length} cells → ${OUT}/index.html, ${PNG}${errors.length ? '\nPAGE ERRORS: ' + errors.join(' | ') : ''}`);
for (const c of out) console.log(`  ${c.row.slice(0, 40).padEnd(40)} ${c.label.padEnd(34)} ${c.cap}`);
