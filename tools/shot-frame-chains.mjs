#!/usr/bin/env node
/* shot-frame-chains.mjs <dir> [--refs <dir>] — phase 3d's contact sheet:
   the RUNNING CHAINS seated on the molding, on all three skeletons at the
   default and dense (density 5, every run on), as the STL will print it (the
   page's own 3D view, one pinned camera on every whole cell), the engraving,
   and close cameras on the crest (the axis motif) and on a corner junction,
   on the page's named anchors — beside the phase-3a groups at the same camera
   so the change is legible, and beside Eva's references 2, 3 and 4 when
   --refs names the directory holding 2.png / 3.png / 4.png (the photographs
   are not in the repository). No pixel claim anywhere: for ruling by eye.
   Writes <dir>/index.html and <dir>/frame-chains-sheet.png. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'frame-chains-sheet');
const refsAt = process.argv.indexOf('--refs'), REFS = refsAt > 0 ? path.resolve(process.argv[refsAt + 1]) : null;
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
const DENSE = { filigree: 'scrolls', ornDensity: 5, ornCrest: 'on', ornCorners: 'on', ornSides: 'on', ornBottom: 'on' };
const GROUPS = { ornLayout: 'groups' };
const at = (anchor, dir, radius) => ({ anchor, dir, radius });
const cells = [
  ...SK.flatMap(([sk, q]) => [['default', ON], ['dense — density 5, every run', DENSE]].map(([l, o]) => ({ row: `${sk} — the chains, relief`, label: `${sk} · ${l}`, params: { ...q, ...o }, cam: WHOLE }))),
  ...SK.map(([sk, q]) => ({ row: 'the engraving (SVG) — dense chains', label: `${sk} · dense`, params: { ...q, ...DENSE }, svg: true })),
  { row: 'close: the crest — the axis motif (a palmette on the axis, its own mirror)', label: 'arch apex · default', params: { ...ON }, cam: at('apex', [0.25, 0.35, 1], 70) },
  { row: 'close: the crest — the axis motif (a palmette on the axis, its own mirror)', label: 'rectangle top centre · dense', params: { skeleton: 'rect', ...DENSE }, cam: at('topCentre', [0.25, 0.35, 1], 70) },
  { row: 'close: the crest — the axis motif (a palmette on the axis, its own mirror)', label: 'oval top · dense', params: { skeleton: 'oval', ...DENSE }, cam: at('topCentre', [0.25, 0.35, 1], 70) },
  { row: 'close: a corner junction (two chains meeting on a rosette)', label: 'rectangle top-right corner · dense', params: { skeleton: 'rect', ...DENSE }, cam: at('cornerTR', [0.35, 0.25, 1], 70) },
  { row: 'close: a corner junction (two chains meeting on a rosette)', label: 'arch right springing · dense', params: { ...DENSE }, cam: at('springR', [0.35, 0.25, 1], 70) },
  { row: 'close: a corner junction (two chains meeting on a rosette)', label: 'oval right side · dense', params: { skeleton: 'oval', ...DENSE }, cam: at('sideR', [0.35, 0.25, 1], 70) },
  { row: 'seated, from low: the chain stands on the molding (no gap under it)', label: 'rectangle corner · dense, grazing light', params: { skeleton: 'rect', ...DENSE }, cam: at('cornerTR', [0.9, 0.2, 0.45], 55) },
  { row: 'seated, from low: the chain stands on the molding (no gap under it)', label: 'arch jamb · dense', params: { ...DENSE }, cam: at('sideR', [0.95, 0.1, 0.4], 60) },
  { row: 'before: the phase-3a groups at the same cameras (the floating pairs the ruling replaced)', label: 'arch · dense, groups', params: { ...DENSE, ...GROUPS }, cam: WHOLE },
  { row: 'before: the phase-3a groups at the same cameras (the floating pairs the ruling replaced)', label: 'rectangle corner · dense, groups', params: { skeleton: 'rect', ...DENSE, ...GROUPS }, cam: at('cornerTR', [0.35, 0.25, 1], 70) },
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
  out.push({ ...c, png: png.toString('base64'), readout: [lines[0], lines[1]].join(' · ') });
}
await page.evaluate(() => window.__frame.pinCamera(null));

const rows = [...new Set(out.map((c) => c.row))];
const refs = REFS ? `<h2>Eva's references 2, 3, 4 (the target: ornament that FOLLOWS the frame)</h2><div class="row">${['2', '3', '4'].map((n) => { const f = path.join(REFS, n + '.png'); return fs.existsSync(f) ? `<div class="cell"><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"><div class="cap"><b>ref ${n}</b></div></div>` : ''; }).join('')}</div>` : '';
const html = `<!doctype html><meta charset="utf-8"><title>/frame — phase 3d chains</title>
<style>body{background:#0A0A0C;color:#EDEDE8;font:11px/1.5 "Space Mono",monospace;margin:20px}h1{font:600 22px "Playfair Display",serif;margin:0 0 4px}h2{font:400 11px monospace;letter-spacing:.18em;text-transform:uppercase;color:#5FA0A0;margin:22px 0 8px}.row{display:flex;gap:14px;flex-wrap:wrap}.cell{width:260px}.cell img{width:260px;display:block;background:#0A0A0C;border:1px solid rgba(237,237,232,.22)}.cap{color:#8A8A85;margin-top:4px;font-size:10px}.cap b{color:#EDEDE8;font-weight:400}</style>
<h1>/frame — phase 3d: running chains, seated on the molding</h1><div>the STL's own positions under the one fixed light; one pinned camera on every whole cell; close cells on the page's named anchors; the engraving is the SVG string the button saves. Nothing here has been printed; the 1.0 mm floor is an assumption. ${errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'no page errors'}</div>
${refs}${rows.map((r) => `<h2>${r}</h2><div class="row">${out.filter((c) => c.row === r).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap"><b>${c.label}</b><br>${c.readout}</div></div>`).join('')}</div>`).join('')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sheet = await browser.newPage({ viewport: { width: 1140, height: 900 }, deviceScaleFactor: 1 });
await sheet.goto(`file://${path.join(OUT, 'index.html')}`);
await sheet.screenshot({ path: path.join(OUT, 'frame-chains-sheet.png'), fullPage: true });
await browser.close(); server.close();
console.log(`${out.length} cells → ${OUT}/index.html, frame-chains-sheet.png${errors.length ? '\nPAGE ERRORS: ' + errors.join(' | ') : ''}`);
for (const c of out) console.log(`  ${c.label.padEnd(44)} ${c.readout.slice(0, 160)}`);
