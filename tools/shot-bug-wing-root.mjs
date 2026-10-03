#!/usr/bin/env node
/* shot-bug-wing-root.mjs <dir> — the close-up for the BLENDED ROOT
   (bug-project-design-doc.md §12.1): the default bug with its OLD straight root
   chord (wingRootWidth 0, the branch back to the shipped code) beside the NEW
   blended root (width 1.6 mm, fillet 0.9 mm) — the SVG export cropped to the
   thorax, and the real page's 3D view at 3/4 looking at the right wing roots.
   No pixel claim: every number is read off the model. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import * as G from '../bug-geometry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'bug-wing-root');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
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
const page = await browser.newPage({ viewport: { width: 1100, height: 820 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); } catch { route.abort(); }
});
await page.route('**fonts.googleapis.com/**', (r) => r.abort());
await page.route('**fonts.gstatic.com/**', (r) => r.abort());
await page.goto(`${base}/bug.html`);
await page.waitForFunction(() => !!window.__bug);
await page.addStyleTag({ content: '.bg-panel,.bg-view,.bg-header,.bg-edbar,.bg-viewtoggle{visibility:hidden!important}' });

const OLD = { ...G.defaultParams(), wingRootWidth: 0 }, NEW = G.defaultParams();
const cells = [];
for (const [label, p] of [['OLD — the straight root chord (root width 0)', OLD], ['NEW — the blended root (width 1.6 mm, fillet 0.9 mm)', NEW]]) {
  const m = G.buildBug(p), ex = G.exportSvg(m), fr = ex.frame;
  // crop the SVG to the thorax: world x -14..14, y -10..9
  const [X0, Y0] = G.svgFromWorld(fr, -14, 9), [X1, Y1] = G.svgFromWorld(fr, 14, -10);
  const svg = ex.svg.replace(/<\?xml[^>]*>/, '').replace(/width="[^"]*"/, 'width="100%"').replace(/height="[^"]*"/, '').replace(/viewBox="[^"]*"/, `viewBox="${X0} ${Y0} ${X1 - X0} ${Y1 - Y0}"`);
  const H = G.wingHinges(p, m.layout);
  const roots = m.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R').map((q) => (q.meta.root ? `pair ${q.meta.pair + 1}: neck ${q.meta.root.width.toFixed(2)} mm at ${q.meta.root.neckU.toFixed(2)} mm from the hinge (body edge at ${q.meta.root.ub.toFixed(2)}), drawn root ${(2 * q.meta.root.drawnHalf).toFixed(2)} mm` : `pair ${q.meta.pair + 1}: straight root chord`));
  await page.evaluate((q) => window.__bug.setParams(q), p);
  await page.evaluate(() => window.__bug.flushBuild());
  await page.evaluate(() => window.__bug.setView('three'));
  const w = m.parts.find((q) => q.kind === 'wing1' && q.side === 'R');
  const hinge = H[0].hinge;
  await page.evaluate((c) => window.__bug.lookAt(c.t, c.d, c.dist), { t: [hinge[0] + 3, -1, 0], d: [0.55, -0.75, 0.95], dist: 30 });
  const img = (await page.screenshot({ type: 'png' })).toString('base64');
  cells.push({ label, svg, img, tris: m.indices.length / 3, roots, notes: m.notes, floor: m.floorViolations.length });
}
const html = `<!doctype html><meta charset="utf-8"><title>bug — blended root</title><style>
body{margin:0;background:#f4f3ee;color:#111;font:12px/1.4 ui-monospace,monospace;padding:18px;width:1240px}
h1{font-size:16px;margin:0 0 6px} .g{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.c{background:#fff;border:1px solid #ccc;padding:8px} .c img{width:100%;display:block} .c svg{display:block;background:#fff}
</style><h1>The wing root, close: OLD straight root chord vs NEW blended root — default bug, SVG export (cropped to the thorax) and 3D at 3/4</h1>
<div class="g">${cells.map((c) => `<div class="c"><b>${c.label}</b>${c.svg}<div>${c.roots.join('<br>')}<br>${c.tris.toLocaleString()} triangles · STL ${c.floor ? 'REFUSED' : 'exports'}${c.notes.length ? ' · ' + c.notes.join('; ') : ''}</div></div>`).join('')}
${cells.map((c) => `<div class="c"><b>${c.label} — 3D, 3/4, the right wing roots</b><img src="data:image/png;base64,${c.img}"></div>`).join('')}</div>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sh = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await sh.goto('file://' + path.join(OUT, 'index.html'));
await sh.screenshot({ path: path.join(OUT, 'bug-wing-root.png'), fullPage: true });
await browser.close(); server.close();
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
if (errors.length) process.exit(1);
