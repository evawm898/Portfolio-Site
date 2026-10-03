#!/usr/bin/env node
/* shot-bug-wing-root.mjs <dir> [--library <candidates.json> --num <n>] — the
   ROOT PINCH LADDER (bug-project-design-doc.md §12.1): the wing root at pinch
   0, 0.15, 0.3, 0.45, 0.6 and 1.0 on the default bug — the SVG export cropped
   to the thorax, and the real page's 3D view at 3/4 looking at the right wing
   roots — plus the same ladder on one library shape when a fitted record is
   given (the kept-shape records are a dev-time file, gitignored with their
   sources). Pinch 0 is the straight root chord, by branch. No pixel claim:
   every number is read off the model. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import * as G from '../bug-geometry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const OUT = path.resolve(args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--'))) || 'bug-wing-root');
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
fs.mkdirSync(OUT, { recursive: true });
const PINCHES = [0, 0.15, 0.3, 0.45, 0.6, 1];
const LENGTHS = [0.5, 0.75, 1, 1.25, 1.5, 2];   // the length ladder, at LENGTH_PINCH
const LENGTH_PINCH = 0.6;

// a library record applied to the default bug: its two outlines (and tail), nothing else
// (the same rule as tools/bug-wing-library-fit.mjs's applyRecord)
function applyRecord(base, rec) {
  const p = JSON.parse(JSON.stringify(base));
  p.wingPairs = 2;
  const L = p.wings.first.length;
  Object.assign(p.wings.first, { points: rec.fore.points.map((q) => q.slice()), stretch: rec.fore.stretch, sweep: 0 });
  Object.assign(p.wings.last, { points: rec.hind.points.map((q) => q.slice()), stretch: rec.hind.stretch, sweep: 0, length: +(L * rec.hind.lengthRatio).toFixed(3) });
  p.wings.unlinked = {};
  p.wings.tail = rec.tail ? JSON.parse(JSON.stringify(rec.tail)) : (p.wings.tail ? { ...p.wings.tail, on: false } : null);
  return p;
}
const pinchSteps = PINCHES.map((pinch) => ({ pinch, len: 1 })), lenSteps = LENGTHS.map((len) => ({ pinch: LENGTH_PINCH, len }));
const rows = [{ label: 'the default bug — the pinch ladder (length 1)', base: G.defaultParams(), steps: pinchSteps }, { label: `the default bug — the LENGTH ladder (pinch ${LENGTH_PINCH})`, base: G.defaultParams(), steps: lenSteps }];
if (opt('--library')) {
  const all = JSON.parse(fs.readFileSync(opt('--library'), 'utf8'));
  const e = all.find((x) => String(x.num) === String(opt('--num') || 9));
  if (!e) throw new Error(`no library record #${opt('--num')}`);
  rows.push({ label: `library shape #${e.num} — the pinch ladder`, base: applyRecord(G.defaultParams(), e.record), steps: pinchSteps }, { label: `library shape #${e.num} — the length ladder (pinch ${LENGTH_PINCH})`, base: applyRecord(G.defaultParams(), e.record), steps: lenSteps });
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => d.startsWith('chromium-')).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`).find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 760, height: 560 }, deviceScaleFactor: 1 });
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

for (const row of rows) {
  row.cells = [];
  for (const { pinch, len } of row.steps) {
    const p = { ...JSON.parse(JSON.stringify(row.base)), wingRootPinch: pinch, wingRootLength: len };
    const m = G.buildBug(p), ex = G.exportSvg(m), fr = ex.frame;
    // the SVG cropped to the thorax: world x -14..14, y -10..9
    const [X0, Y0] = G.svgFromWorld(fr, -14, 9), [X1, Y1] = G.svgFromWorld(fr, 14, -10);
    const svg = ex.svg.replace(/<\?xml[^>]*>/, '').replace(/width="[^"]*"/, 'width="100%"').replace(/height="[^"]*"/, '').replace(/viewBox="[^"]*"/, `viewBox="${X0} ${Y0} ${X1 - X0} ${Y1 - Y0}"`);
    const H = G.wingHinges(p, m.layout);
    const roots = m.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R').map((q) => (q.meta.root
      ? `pair ${q.meta.pair + 1}: neck ${q.meta.root.width.toFixed(2)} of ${(2 * q.meta.root.drawnHalf).toFixed(2)} mm (${Math.round((100 * q.meta.root.width) / (2 * q.meta.root.drawnHalf))}%), fillet ${q.meta.root.fillet.toFixed(2)}`
      : `pair ${q.meta.pair + 1}: straight chord`));
    await page.evaluate((q) => window.__bug.setParams(q), p);
    await page.evaluate(() => window.__bug.flushBuild());
    await page.evaluate(() => window.__bug.setView('three'));
    await page.evaluate((c) => window.__bug.lookAt(c.t, c.d, c.dist), { t: [H[0].hinge[0] + 3, -1, 0], d: [0.55, -0.75, 0.95], dist: 30 });
    const img = (await page.screenshot({ type: 'png' })).toString('base64');
    row.cells.push({ pinch, len, svg, img, tris: m.indices.length / 3, roots, notes: m.notes, floor: m.floorViolations.length });
  }
}
const html = `<!doctype html><meta charset="utf-8"><title>bug — root pinch ladder</title><style>
body{margin:0;background:#f4f3ee;color:#111;font:11px/1.35 ui-monospace,monospace;padding:16px;width:1900px}
h1{font-size:16px;margin:0 0 4px} h2{font-size:13px;margin:14px 0 6px} .g{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.c{background:#fff;border:1px solid #ccc;padding:6px} .c img{width:100%;display:block;margin-top:4px} .c svg{display:block;background:#fff}
.k{font-size:14px;font-weight:bold}
</style><h1>Wing root — the pinch ladder (0 the straight chord … 1 the first neck) and the length ladder</h1>
<div>Each cell: SVG export cropped to the thorax (world x −14..14 mm), then the 3D view at 3/4 on the right wing roots. The pinch mixes the straight chord with the full neck, relative to each wing's own drawn root: the neck and every slope scale with it ("fillet" below is the effective radius, the full one over the pinch).</div>
${rows.map((r) => `<h2>${r.label}</h2><div class="g">${r.cells.map((c) => `<div class="c"><div class="k">pinch ${c.pinch} · length ${c.len}</div>${c.svg}<img src="data:image/png;base64,${c.img}"><div>${c.roots.join('<br>')}<br>${c.tris.toLocaleString()} tris · STL ${c.floor ? 'REFUSED' : 'exports'}${c.notes.length ? ' · ' + c.notes.join('; ') : ''}</div></div>`).join('')}</div>`).join('')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sh = await browser.newPage({ viewport: { width: 1932, height: 900 } });
await sh.goto('file://' + path.join(OUT, 'index.html'));
await sh.screenshot({ path: path.join(OUT, 'bug-wing-root.png'), fullPage: true });
await browser.close(); server.close();
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
for (const r of rows) for (const c of r.cells) console.log(r.label, c.pinch, c.len, c.tris, c.roots.join(' | '), c.notes.join('; '));
if (errors.length) process.exit(1);
