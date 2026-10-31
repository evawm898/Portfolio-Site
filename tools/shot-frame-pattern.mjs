#!/usr/bin/env node
/* shot-frame-pattern.mjs <dir> — phase 3e step 1's contact sheet: the BAND
   PATTERN (fused beading, the laurel run of leaf tips) along the edges of
   all three skeletons, as the STL will print it (the page's own 3D view,
   one pinned camera on every whole cell), and close on the crest (the
   axis), a corner (the mitre) and the oval's seam, at a grazing light so
   the seat on the molding and the fusing read. No pixel claim anywhere:
   for ruling by eye. Writes <dir>/index.html and <dir>/frame-pattern-sheet.png. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'frame-pattern-sheet');
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
const BEAD = { bandPattern: 'beading' }, LEAF = { bandPattern: 'leaf-tips', bandSize: 6, bandPitch: 4 };
const at = (anchor, dir, radius) => ({ anchor, dir, radius });
const cells = [
  { row: 'beading on the sight edge, all three skeletons', label: 'arch', params: BEAD, cam: WHOLE },
  { row: 'beading on the sight edge, all three skeletons', label: 'rectangle', params: { skeleton: 'rect', ...BEAD }, cam: WHOLE },
  { row: 'beading on the sight edge, all three skeletons', label: 'oval', params: { skeleton: 'oval', ...BEAD }, cam: WHOLE },
  { row: 'leaf tips (a laurel run), 6 mm leaves 4 mm apart', label: 'arch', params: LEAF, cam: WHOLE },
  { row: 'leaf tips (a laurel run), 6 mm leaves 4 mm apart', label: 'rectangle, both edges', params: { skeleton: 'rect', ...LEAF, bandEdge: 'both' }, cam: WHOLE },
  { row: 'leaf tips (a laurel run), 6 mm leaves 4 mm apart', label: 'oval, outer edge', params: { skeleton: 'oval', ...LEAF, bandEdge: 'outer' }, cam: WHOLE },
  { row: 'close, grazing light: the beads fused and seated on the profile', label: 'arch apex (the axis)', params: BEAD, cam: at('apex', [0.9, 0.3, 0.5], 36) },
  { row: 'close, grazing light: the beads fused and seated on the profile', label: 'rectangle corner (the mitre)', params: { skeleton: 'rect', ...BEAD }, cam: at('cornerTR', [0.9, 0.3, 0.5], 36) },
  { row: 'close, grazing light: the beads fused and seated on the profile', label: 'oval bottom (the seam)', params: { skeleton: 'oval', ...BEAD }, cam: at('bottomCentre', [0.9, 0.3, 0.5], 36) },
  { row: 'close, grazing light: the leaves overlap base over tip', label: 'arch apex (the two first leaves cross)', params: LEAF, cam: at('apex', [0.9, 0.3, 0.5], 40) },
  { row: 'close, grazing light: the leaves overlap base over tip', label: 'rectangle corner', params: { skeleton: 'rect', ...LEAF }, cam: at('cornerTR', [0.9, 0.3, 0.5], 40) },
  { row: 'close, grazing light: the leaves overlap base over tip', label: 'oval bottom (the seam: the two last leaves cross)', params: { skeleton: 'oval', ...LEAF }, cam: at('bottomCentre', [0.9, 0.3, 0.5], 40) },
  { row: 'with the chains: the pattern under the filigree', label: 'arch, beading + chains', params: { ...BEAD, filigree: 'scrolls' }, cam: WHOLE },
  { row: 'with the chains: the pattern under the filigree', label: 'rectangle, leaf tips + chains, reeded profile', params: { skeleton: 'rect', profilePreset: 'reeded', ...LEAF, filigree: 'scrolls' }, cam: WHOLE },
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
  let png = null, prev = null;
  for (let i = 0; i < 8; i++) { png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 720, height: 900 } }); if (prev && prev.equals(png)) break; prev = png; await page.waitForTimeout(120); }
  const r = await page.evaluate(() => window.__frame.readout());
  const lines = r.split('\n');
  out.push({ ...c, png: png.toString('base64'), readout: [lines[0], lines[3]].join(' · ') });
}
await page.evaluate(() => window.__frame.pinCamera(null));

const rows = [...new Set(out.map((c) => c.row))];
const html = `<!doctype html><meta charset="utf-8"><title>/frame — phase 3e: the band pattern</title>
<style>body{background:#0A0A0C;color:#EDEDE8;font:11px/1.5 "Space Mono",monospace;margin:20px}h1{font:600 22px "Playfair Display",serif;margin:0 0 4px}h2{font:400 11px monospace;letter-spacing:.18em;text-transform:uppercase;color:#5FA0A0;margin:22px 0 8px}.row{display:flex;gap:14px;flex-wrap:wrap}.cell{width:260px}.cell img{width:260px;display:block;background:#0A0A0C;border:1px solid rgba(237,237,232,.22)}.cap{color:#8A8A85;margin-top:4px;font-size:10px}.cap b{color:#EDEDE8;font-weight:400}</style>
<h1>/frame — phase 3e, step 1: the band pattern (beading, leaf tips)</h1><div>the STL's own positions under the one fixed light; one pinned camera on every whole cell; close cells on the page's named anchors. Nothing here has been printed; the 1.0 mm floor is an assumption. ${errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'no page errors'}</div>
${rows.map((r) => `<h2>${r}</h2><div class="row">${out.filter((c) => c.row === r).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap"><b>${c.label}</b><br>${c.readout}</div></div>`).join('')}</div>`).join('')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sheet = await browser.newPage({ viewport: { width: 1140, height: 900 }, deviceScaleFactor: 1 });
await sheet.goto(`file://${path.join(OUT, 'index.html')}`);
await sheet.screenshot({ path: path.join(OUT, 'frame-pattern-sheet.png'), fullPage: true });
await browser.close(); server.close();
console.log(`${out.length} cells → ${OUT}/index.html, frame-pattern-sheet.png${errors.length ? '\nPAGE ERRORS: ' + errors.join(' | ') : ''}`);
for (const c of out) console.log(`  ${c.label.padEnd(44)} ${c.readout.slice(0, 200)}`);
