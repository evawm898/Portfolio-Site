/*
 * verify-flower-export.mjs — print-safety gate for the Flower Bloom generator.
 *
 * WHY: STL export + watertight/manifold geometry are a hard, non-negotiable
 * requirement for the flower generator (see CLAUDE.md). A change can look
 * perfect on screen and still export broken geometry, so every geometry change
 * must be checked by actually exporting an STL and inspecting it. This script
 * does that headlessly.
 *
 * WHAT IT DOES: serves the repo, loads /flower.html in headless Chromium, and
 * for a range of configurations clicks "Export STL", captures the downloaded
 * binary STL, and asserts it has ZERO boundary edges (i.e. it encloses a
 * volume — printable). Exits non-zero if any configuration fails.
 *
 * REQUIREMENTS (dev-only; the deployed site needs none of this):
 *   npm i three@0.161.0 playwright-core        # both are npm-registry allowlisted
 * The flower page imports three from a CDN; this script intercepts that request
 * and serves the npm copy from node_modules/three so it runs fully offline.
 * Keep the pinned three version in sync with the importmap in flower.html.
 *
 * BROWSER: uses Chromium via playwright-core. Set CHROMIUM_EXECUTABLE to point
 * at a chrome binary, else it auto-detects a pre-installed one, else it falls
 * back to playwright-core's default resolution.
 *
 * RUN:  node tools/verify-flower-export.mjs
 * When you add a geometry feature, add a config below that exercises it.
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_VERSION = '0.161.0';   // must match the importmap in flower.html
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

function findChromium() {
  if (process.env.CHROMIUM_EXECUTABLE && fs.existsSync(process.env.CHROMIUM_EXECUTABLE)) return process.env.CHROMIUM_EXECUTABLE;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const d of fs.readdirSync(base)) {
      if (!d.startsWith('chromium-')) continue;
      const p = path.join(base, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) return p;
    }
  } catch { /* fall through */ }
  return undefined;   // let playwright-core resolve its default
}

// Boundary/non-manifold analysis of a binary STL. Vertices are quantised so
// coincident corners of adjacent closed shells weld; an undirected edge used by
// exactly one triangle is a boundary (open) edge — the failure we guard against.
function analyzeStl(buf) {
  const tris = buf.readUInt32LE(80);
  const edges = new Map();
  const q = (x) => Math.round(x * 1e4) / 1e4;
  const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  let off = 84;
  for (let i = 0; i < tris; i++) {
    off += 12; // skip normal
    const v = [];
    for (let k = 0; k < 3; k++) { v.push(q(buf.readFloatLE(off)) + ',' + q(buf.readFloatLE(off + 4)) + ',' + q(buf.readFloatLE(off + 8))); off += 12; }
    off += 2; // attribute byte count
    for (let k = 0; k < 3; k++) { const e = key(v[k], v[(k + 1) % 3]); edges.set(e, (edges.get(e) || 0) + 1); }
  }
  let boundary = 0, nonManifold = 0;
  for (const c of edges.values()) { if (c === 1) boundary++; else if (c > 2) nonManifold++; }
  return { tris, boundary, nonManifold };
}

// Each config: a label + UI mutations {id, value, evt}. 'change' for <select>,
// 'input' (default) for sliders. Applied on top of the previous config's state.
const CONFIGS = [
  { label: 'default (veins)', set: [] },
  { label: 'voronoi', set: [{ id: 'infillType', value: 'voronoi', evt: 'change' }] },
  { label: 'strands', set: [{ id: 'infillType', value: 'strands', evt: 'change' }] },
  { label: 'bone', set: [{ id: 'infillType', value: 'bone', evt: 'change' }] },
  { label: 'lace', set: [{ id: 'infillType', value: 'lace', evt: 'change' }] },
  { label: '+ strap sepals', set: [{ id: 'infillType', value: 'veins', evt: 'change' }, { id: 'sepalsType', value: 'sepals', evt: 'change' }, { id: 'sepalStyle', value: 'strap', evt: 'change' }] },
  { label: '+ solid sepals', set: [{ id: 'sepalStyle', value: 'solid', evt: 'change' }] },
  { label: 'full plant (receptacle + stem + solid sepals)', set: [{ id: 'receptacleType', value: 'rounded', evt: 'change' }, { id: 'stemType', value: 'stem', evt: 'change' }] },
  { label: '+ 3 layers (uniform count)', set: [{ id: 'layerCount', value: '3' }] },
  { label: '+ 4 layers, per-layer counts (rose/peony)', set: [{ id: 'layerCount', value: '4' }, { id: 'petalsPerLayer', value: '6,10,14,18' }] },
];

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/flower.html';
  fs.readFile(path.join(ROOT, p), (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 }, acceptDownloads: true });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

// Serve the CDN three import from the local npm package (offline + pinned).
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
  const fp = path.join(ROOT, 'node_modules/three', rel);
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(fp) }); }
  catch { route.abort(); }
});

await page.goto(`http://localhost:${port}/flower.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => { const el = document.getElementById('readout'); return el && /tris/.test(el.textContent); }, { timeout: 60000 });

const results = [];
for (const cfg of CONFIGS) {
  for (const s of cfg.set) {
    await page.evaluate(({ id, value, evt }) => { const el = document.getElementById(id); el.value = value; el.dispatchEvent(new Event(evt || 'input', { bubbles: true })); }, s);
  }
  await page.waitForTimeout(160); // let the double-rAF rebuild settle
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }).catch(() => null),
    page.click('#exportStl'),
  ]);
  if (!dl) { results.push({ label: cfg.label, ok: false, note: 'no STL download' }); continue; }
  const buf = fs.readFileSync(await dl.path());
  const a = analyzeStl(buf);
  results.push({ label: cfg.label, ok: a.boundary === 0, ...a });
}

await browser.close();
server.close();

let failed = 0;
console.log('Flower STL export — watertightness gate\n');
for (const r of results) {
  if (!r.ok) failed++;
  const detail = r.note ? r.note : `${r.tris.toLocaleString()} tris, boundaryEdges=${r.boundary}, nonManifold(overlaps)=${r.nonManifold}`;
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.label.padEnd(46)} ${detail}`);
}
if (pageErrors.length) {
  const real = pageErrors.filter((e) => !/fonts\.googleapis/.test(e));
  if (real.length) { console.log('\nPage errors:'); real.forEach((e) => console.log('  ! ' + e)); failed += real.length; }
}
console.log(failed === 0 ? '\nAll configurations export watertight (0 boundary edges). ✓' : `\n${failed} FAILURE(S) — geometry is not print-safe. ✗`);
process.exit(failed === 0 ? 0 : 1);
