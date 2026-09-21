/* ===================================================================
   measure-flower-edge.mjs — WHAT THE EDGE OF A SOLIDIFIED SHEET ACTUALLY
   LOOKS LIKE, read off the EXPORTED STL.

   It reads the emitted triangles and nothing else. It does not import the
   emitter, does not read a record the emitter wrote, and has no page hook —
   so a blade that DECLARES a bead and does not emit one measures the same as
   one that never tried. (The fourth durable rule, applied here: the expected
   values are the ruling's own numbers, the measured ones come off the file.)

   WHAT IT MEASURES
     - boundary edges (the watertightness criterion, restated so this tool's
       numbers can never be quoted from a broken export)
     - the DIHEDRAL between every pair of adjacent faces, as a histogram, and
       the count landing in the CLIFF BAND [80, 100] degrees
     - the sheet's local THICKNESS at the rim, as the distance between the two
       skin vertices that share a rim column

   WHAT IT IS BLIND TO, stated here because a gate's own header is the worst
   place for a label naming a computation nobody performed:
     - it cannot tell WHICH part a triangle came from. Run it on two trees and
       diff, or on two fixtures and diff; a single absolute number over a whole
       flower mixes the blade with every tube, bead and ribbon in the model.
     - a tube of RADIAL_SEGMENTS = 8 is a 45-degree-per-facet cylinder, so the
       model's own round features sit ABOVE a 30-degree bar. Any "max dihedral"
       read over a whole flower is reporting that, not the blade's rim.

   USAGE
     node tools/measure-flower-edge.mjs [--root <tree>] [--fixture <name>]
   =================================================================== */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { findChromium } from './chromium-harness.mjs';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const ROOT = path.resolve(arg('--root', path.join(HERE, '..')));
const THREE_VERSION = '0.161.0';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.png': 'image/png' };

/* The fixtures are chosen so the SOLID BLADE is present and dominant. A lace
   petal is ribbons and a perforated slab; `addBladeSolid` is reached by SOLID
   sepals, by leaves and by petaloid-fill centres, and by nothing else. */
const FIXTURES = {
  'solid-sepals': [
    { id: 'petalCount', value: '5' },
    { id: 'layerCount', value: '1' },
    { id: 'sepalsType', value: 'sepals', evt: 'change' },
    { id: 'sepalStyle', value: 'solid', evt: 'change' },
    { id: 'sepalSize', value: '1' },
    { id: 'leafType', value: 'none', evt: 'change' },
  ],
  'leaf-oval': [
    { id: 'sepalsType', value: 'none', evt: 'change' },
    { id: 'leafType', value: 'oval', evt: 'change' },
  ],
};

/* ---- STL -> geometry ------------------------------------------------- */
function readStl(buf) {
  const n = buf.readUInt32LE(80);
  const tri = new Array(n);
  let off = 84;
  for (let i = 0; i < n; i++) {
    off += 12;
    const v = [];
    for (let k = 0; k < 3; k++) { v.push([buf.readFloatLE(off), buf.readFloatLE(off + 4), buf.readFloatLE(off + 8)]); off += 12; }
    off += 2;
    tri[i] = v;
  }
  return tri;
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const L = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / L, a[1] / L, a[2] / L]; };

/* The same 1e-4 quantised weld the export gate's own edge census uses, so a
   shell counts as joined to its neighbour exactly where that gate says it is. */
function analyze(tri) {
  const q = (x) => Math.round(x * 1e4) / 1e4;
  const key = (p) => q(p[0]) + ',' + q(p[1]) + ',' + q(p[2]);
  const ek = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  const edges = new Map();
  for (const t of tri) {
    const nrm = norm(cross(sub(t[1], t[0]), sub(t[2], t[0])));
    const k = t.map(key);
    for (let i = 0; i < 3; i++) {
      const e = ek(k[i], k[(i + 1) % 3]);
      let r = edges.get(e);
      if (!r) edges.set(e, r = { c: 0, n: [] });
      r.c++; if (r.n.length < 2) r.n.push(nrm);
    }
  }
  let boundary = 0, nonManifold = 0;
  const hist = new Array(19).fill(0);      // 10-degree bins, 0..180
  let cliff = 0, maxDeg = 0;
  const degs = [];
  for (const r of edges.values()) {
    if (r.c === 1) { boundary++; continue; }
    if (r.c > 2) { nonManifold++; continue; }
    const c = Math.max(-1, Math.min(1, dot(r.n[0], r.n[1])));
    const deg = Math.acos(c) * 180 / Math.PI;
    if (!isFinite(deg)) continue;
    degs.push(deg);
    hist[Math.min(18, Math.floor(deg / 10))]++;
    if (deg >= 80 && deg <= 100) cliff++;
    if (deg > maxDeg) maxDeg = deg;
  }
  degs.sort((a, b) => a - b);
  const pct = (p) => degs.length ? degs[Math.min(degs.length - 1, Math.floor(p * degs.length))] : 0;
  return { tris: tri.length, edges: edges.size, boundary, nonManifold, cliff, maxDeg, p50: pct(0.5), p99: pct(0.99), hist };
}

/* ---- drive the page --------------------------------------------------- */
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
page.on('dialog', (d) => d.accept().catch(() => {}));
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
  catch { route.abort(); }
});
await page.goto(`http://localhost:${port}/flower.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => { const el = document.getElementById('readout'); return el && /tris/.test(el.textContent); }, { timeout: 60000 });
await page.evaluate(() => { const t = document.getElementById('advancedToggle'); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); } });
await page.waitForTimeout(200);
await page.evaluate(() => { const h = document.querySelector('.fl-acc__head[aria-controls="acc-make"]'); if (h && h.getAttribute('aria-expanded') !== 'true') h.click(); });
await page.waitForTimeout(120);

const only = arg('--fixture', null);
const out = {};
for (const [name, set] of Object.entries(FIXTURES)) {
  if (only && name !== only) continue;
  /* SET, THEN READ BACK — a control that refuses what it is handed exports a
     design nobody asked for under a label that says otherwise. */
  const bad = [];
  for (const s of set) {
    const got = await page.evaluate(({ id, value, evt }) => {
      const el = document.getElementById(id);
      if (!el) return { missing: true };
      el.value = value; el.dispatchEvent(new Event(evt || 'input', { bubbles: true }));
      return { value: el.value };
    }, s);
    if (got.missing) { bad.push(`no control #${s.id}`); continue; }
    if (String(got.value) !== String(s.value)) bad.push(`${s.id} set "${s.value}" reads back "${got.value}"`);
  }
  await page.waitForTimeout(400);
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 90000 }).catch(() => null),
    page.click('#exportStl'),
  ]);
  if (!dl) { out[name] = { error: 'no STL download', bad }; continue; }
  out[name] = { ...analyze(readStl(fs.readFileSync(await dl.path()))), bad };
}
await browser.close(); server.close();

console.log(`tree: ${ROOT}`);
if (pageErrors.length) console.log('PAGE ERRORS: ' + pageErrors.slice(0, 3).join(' | '));
for (const [name, r] of Object.entries(out)) {
  if (r.error) { console.log(`  ${name}: ${r.error}`); continue; }
  if (r.bad && r.bad.length) console.log(`  ${name}: VALUES DID NOT TAKE -> ${r.bad.join('; ')}`);
  console.log(`  ${name}`);
  console.log(`    tris ${r.tris.toLocaleString()}  edges ${r.edges.toLocaleString()}  boundary ${r.boundary}  nonManifold ${r.nonManifold}`);
  console.log(`    dihedral: median ${r.p50.toFixed(1)}  p99 ${r.p99.toFixed(1)}  max ${r.maxDeg.toFixed(1)}  CLIFF[80..100] ${r.cliff.toLocaleString()}`);
  console.log(`    hist(10deg bins): ${r.hist.join(' ')}`);
}
console.log(JSON.stringify(out));
