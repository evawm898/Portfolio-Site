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
  { label: 'full plant (blended receptacle + stem + solid sepals)', set: [{ id: 'receptacleType', value: 'blended', evt: 'change' }, { id: 'stemType', value: 'stem', evt: 'change' }] },
  { label: '+ 3 layers (uniform count)', set: [{ id: 'layerCount', value: '3' }] },
  { label: '+ 4 layers, per-layer counts (rose/peony)', set: [{ id: 'layerCount', value: '4' }, { id: 'petalsPerLayer', value: '6,10,14,18' }] },
  { label: 'petal cup +1 (cupped, single layer)', set: [{ id: 'layerCount', value: '1' }, { id: 'petalsPerLayer', value: '' }, { id: 'petalCup', value: '1' }] },
  { label: 'petal cup -1 (reflexed) + solid sepals', set: [{ id: 'petalCup', value: '-1' }] },
  { label: 'radial rosette (flat, no sphere)', set: [{ id: 'petalCup', value: '0' }, { id: 'bloomType', value: 'radial', evt: 'change' }, { id: 'petalCount', value: '8' }] },
  { label: 'edge noise 0.7 on CLEAN tip', set: [{ id: 'bloomType', value: 'coiled', evt: 'change' }, { id: 'petalCount', value: '4' }, { id: 'edgeNoise', value: '0.7' }, { id: 'edgeNoiseScale', value: '0.6' }] },
  { label: 'edge noise 1.0 dense + RUFFLED (peony edge)', set: [{ id: 'tipStyle', value: 'ruffled', evt: 'change' }, { id: 'edgeNoise', value: '1' }, { id: 'edgeNoiseScale', value: '1' }] },
  { label: 'stem nodes + thickness (prominent)', set: [{ id: 'tipStyle', value: 'clean', evt: 'change' }, { id: 'edgeNoise', value: '0' }, { id: 'edgeNoiseScale', value: '0' }, { id: 'stemNodeCount', value: '5' }, { id: 'stemNodeProminence', value: '1' }, { id: 'stemThickness', value: '2.2' }] },
  { label: 'tight side bud (veins)', set: [{ id: 'stemBudMode', value: 'tight', evt: 'change' }] },
  { label: 'early-bloom side bud + voronoi infill', set: [{ id: 'infillType', value: 'voronoi', evt: 'change' }, { id: 'stemBudMode', value: 'early', evt: 'change' }] },
  { label: 'compound leaves (rose), alternate', set: [{ id: 'infillType', value: 'veins', evt: 'change' }, { id: 'stemBudMode', value: 'none', evt: 'change' }, { id: 'stemNodeCount', value: '4' }, { id: 'stemThickness', value: '1' }, { id: 'leafType', value: 'compound', evt: 'change' }, { id: 'leafPhyllotaxy', value: 'alternate', evt: 'change' }] },
  { label: 'lobed leaves (poppy), opposite', set: [{ id: 'leafType', value: 'lobed', evt: 'change' }, { id: 'leafPhyllotaxy', value: 'opposite', evt: 'change' }] },
  { label: 'oval leaves, whorled + tight bud', set: [{ id: 'leafType', value: 'oval', evt: 'change' }, { id: 'leafPhyllotaxy', value: 'whorled', evt: 'change' }, { id: 'stemBudMode', value: 'tight', evt: 'change' }] },
  { label: 'narrow leaves, opposite (no bud)', set: [{ id: 'leafType', value: 'narrow', evt: 'change' }, { id: 'leafPhyllotaxy', value: 'opposite', evt: 'change' }, { id: 'stemBudMode', value: 'none', evt: 'change' }] },
  { label: 'center: DENSE CLUSTER (150 stamens) on full plant', set: [{ id: 'tipStyle', value: 'clean', evt: 'change' }, { id: 'edgeNoise', value: '0' }, { id: 'leafType', value: 'none', evt: 'change' }, { id: 'centerArch', value: 'dense', evt: 'change' }, { id: 'denseStamenCount', value: '150' }] },
  { label: 'center: DISC (domed + ring stamens)', set: [{ id: 'centerArch', value: 'disc', evt: 'change' }, { id: 'discHeight', value: '0.8' }, { id: 'ringStamenCount', value: '60' }] },
  { label: 'center: PETALOID FILL (120 tiny petals)', set: [{ id: 'centerArch', value: 'petaloid', evt: 'change' }, { id: 'fillPetalCount', value: '120' }] },
  { label: 'center: PETALOID FILL + lobed leaves (combined)', set: [{ id: 'centerArch', value: 'petaloid', evt: 'change' }, { id: 'fillPetalCount', value: '90' }, { id: 'leafType', value: 'lobed', evt: 'change' }, { id: 'stemNodeCount', value: '3' }] },
  // Unified trunk (approach D) edge cases:
  // receptacle WITHOUT a stem — the lofted trunk must still seal (bottom cap at the neck).
  { label: 'trunk: receptacle only, no stem, high blend', set: [{ id: 'centerArch', value: 'classic', evt: 'change' }, { id: 'leafType', value: 'none', evt: 'change' }, { id: 'stemBudMode', value: 'none', evt: 'change' }, { id: 'stemType', value: 'none', evt: 'change' }, { id: 'receptacleType', value: 'blended', evt: 'change' }, { id: 'blendSmoothness', value: '1' }, { id: 'receptacleDepth', value: '0.8' }] },
  // many attachments (petals + solid sepals) + tight deep neck — drives the sector count M toward its cap.
  { label: 'trunk: 20 petals + solid sepals, tight deep neck + stem', set: [{ id: 'petalCount', value: '20' }, { id: 'layerCount', value: '1' }, { id: 'petalsPerLayer', value: '' }, { id: 'sepalsType', value: 'sepals', evt: 'change' }, { id: 'sepalStyle', value: 'solid', evt: 'change' }, { id: 'stemType', value: 'stem', evt: 'change' }, { id: 'blendSmoothness', value: '1' }, { id: 'convergenceTightness', value: '1' }, { id: 'receptacleDepth', value: '1' }, { id: 'stemThickness', value: '2.5' }, { id: 'stemNodeCount', value: '5' }, { id: 'stemNodeProminence', value: '1' }, { id: 'leafType', value: 'oval', evt: 'change' }, { id: 'leafPhyllotaxy', value: 'whorled', evt: 'change' }, { id: 'stemBudMode', value: 'tight', evt: 'change' }] },
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
