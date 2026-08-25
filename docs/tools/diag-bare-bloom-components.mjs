/*
 * diag-bare-bloom-components.mjs — WHAT are the pieces? (#84)
 *
 * REPORT-ONLY DIAGNOSTIC, not a gate. Under docs/tools/ so it is not mistaken for one.
 *
 * `tools/verify-connectedness.mjs` answers "how many pieces" and nothing else. A count is
 * not a diagnosis: 7 components on a 6-petal preset is consistent with "every petal is
 * loose" and equally consistent with "the centre shattered into six", and those two imply
 * different fixes. This decomposes the same voxel flood fill back onto the triangles and
 * reports, per component, its triangle share and where it sits.
 *
 * METHOD. Identical rasterisation to the gate — same CELL_MM, same half-cell barycentric
 * sampling, same 6-connected flood fill — then each triangle is assigned to the component
 * of the voxels its own sample points land in. A triangle is connected in the grid by
 * construction, so its samples agree; the assertion below checks that rather than assuming
 * it, and any triangle whose samples straddle two labels is counted and reported.
 *
 * WHAT EACH COLUMN MEANS.
 *   tris / share   the component's triangles, and its share of the whole export
 *   axisR          distance from the model's vertical axis to the component's centroid, in
 *                  millimetres. A petal sits OUT at radius; the core sits ON the axis. This
 *                  is the column that separates "the petals came loose" from "the centre
 *                  came loose", and it is why a bare count could not.
 *   bbox           x/y/z extent in millimetres
 *   yMid           the component's mid-height, so a core reading low or high is visible
 *
 * SELF-CHECK (hard, aborts): the per-component triangle counts must sum to the export's
 * total, and the component count must equal the gate's flood-fill count for the same STL.
 * A decomposition that loses triangles is measuring something else.
 *
 * RUN:  node docs/tools/diag-bare-bloom-components.mjs                 (all seven presets)
 *       node docs/tools/diag-bare-bloom-components.mjs lily poppy      (named presets)
 *       node docs/tools/diag-bare-bloom-components.mjs --bare          (+ the 9-petal BARE row)
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { findChromium } from '../../tools/chromium-harness.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const THREE_VERSION = '0.161.0';
const CELL_MM = 0.6;          // must match tools/verify-connectedness.mjs
const MAX_VOXELS = 90e6;
const TOP_N = 12;             // components listed per config, largest first
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const { PRESETS } = await import(pathToFileURL(path.join(ROOT, 'flower-presets.js')).href);
const argv = process.argv.slice(2);
const WANT_BARE = argv.includes('--bare');
const named = argv.filter((a) => !a.startsWith('--')).map((s) => s.toLowerCase());

const CONFIGS = [];
for (const p of PRESETS) {
  if (named.length && !named.includes(p.slug)) continue;
  CONFIGS.push({ label: `preset: ${p.name}`, presetSlug: p.slug, meta: `${p.ui.bloomType} / ${p.ui.petalCount} petals / centre ${p.ui.centerArch}` });
}
if (WANT_BARE) {
  // The gate's BARE row, so the "the detached piece is the centre" reading of a 9-petal
  // radial bloom can be checked against the same instrument as the presets.
  CONFIGS.push({
    label: 'BARE bloom, classic + stamens (gate BASE, 9 petals)',
    meta: 'radial / 9 petals / centre classic',
    set: [
      { id: 'bloomType', value: 'radial', evt: 'change' }, { id: 'petalCount', value: '9' },
      { id: 'layerCount', value: '1' }, { id: 'infillType', value: 'veins', evt: 'change' },
      { id: 'continuousMargin', value: 'on', evt: 'change' }, { id: 'heightMM', value: '120' },
      { id: 'stemType', value: 'none', evt: 'change' }, { id: 'sepalsType', value: 'none', evt: 'change' },
      { id: 'receptacleType', value: 'none', evt: 'change' }, { id: 'tube', value: '0.4' },
    ],
  });
}

/* Rasterise, flood fill, then label the triangles. Returns one entry per component with its
   triangle count and extent, plus `straddlers` — triangles whose own sample points fell in
   more than one component, which must be zero for the labelling to mean anything. */
function decompose(buf, cell) {
  const n = buf.readUInt32LE(80);
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], tri = [];
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50, t = [];
    for (let k = 0; k < 3; k++) {
      const b = o + 12 + k * 12, p = [buf.readFloatLE(b), buf.readFloatLE(b + 4), buf.readFloatLE(b + 8)];
      for (let d = 0; d < 3; d++) { if (p[d] < lo[d]) lo[d] = p[d]; if (p[d] > hi[d]) hi[d] = p[d]; }
      t.push(p);
    }
    tri.push(t);
  }
  const dim = hi.map((h, k) => Math.max(1, Math.ceil((h - lo[k]) / cell) + 1));
  if (dim[0] * dim[1] * dim[2] > MAX_VOXELS) return { skipped: true, dim };
  const occ = new Uint8Array(dim[0] * dim[1] * dim[2]);
  const at = (x, y, z) => (z * dim[1] + y) * dim[0] + x;
  // Same half-cell barycentric sampling as the gate, and the sample indices are kept so the
  // second pass labels each triangle from the very cells that made it occupied.
  const samplesOf = (t) => {
    const e1 = [t[1][0] - t[0][0], t[1][1] - t[0][1], t[1][2] - t[0][2]];
    const e2 = [t[2][0] - t[0][0], t[2][1] - t[0][1], t[2][2] - t[0][2]];
    const s = Math.max(2, Math.ceil(Math.max(Math.hypot(...e1), Math.hypot(...e2)) / (cell * 0.5)));
    const out = [];
    for (let a = 0; a <= s; a++) for (let b = 0; b + a <= s; b++) {
      const u = a / s, v = b / s;
      const x = Math.round((t[0][0] + e1[0] * u + e2[0] * v - lo[0]) / cell);
      const y = Math.round((t[0][1] + e1[1] * u + e2[1] * v - lo[1]) / cell);
      const z = Math.round((t[0][2] + e1[2] * u + e2[2] * v - lo[2]) / cell);
      if (x >= 0 && y >= 0 && z >= 0 && x < dim[0] && y < dim[1] && z < dim[2]) out.push(at(x, y, z));
    }
    return out;
  };
  for (const t of tri) for (const i of samplesOf(t)) occ[i] = 1;

  const label = new Int32Array(occ.length).fill(-1);
  const stack = [];
  let comps = 0;
  for (let i = 0; i < occ.length; i++) {
    if (!occ[i] || label[i] >= 0) continue;
    const id = comps++;
    stack.push(i); label[i] = id;
    while (stack.length) {
      const c = stack.pop();
      const x = c % dim[0], y = Math.floor(c / dim[0]) % dim[1], z = Math.floor(c / (dim[0] * dim[1]));
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (nx < 0 || ny < 0 || nz < 0 || nx >= dim[0] || ny >= dim[1] || nz >= dim[2]) continue;
        const j = at(nx, ny, nz);
        if (occ[j] && label[j] < 0) { label[j] = id; stack.push(j); }
      }
    }
  }

  const parts = Array.from({ length: comps }, () => ({
    tris: 0, lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity], cx: 0, cy: 0, cz: 0,
  }));
  let straddlers = 0, unlabelled = 0;
  for (const t of tri) {
    const ids = new Set();
    for (const i of samplesOf(t)) ids.add(label[i]);
    if (ids.size === 0) { unlabelled++; continue; }
    if (ids.size > 1) straddlers++;
    const id = ids.values().next().value;
    const p = parts[id];
    p.tris++;
    for (const v of t) {
      for (let d = 0; d < 3; d++) { if (v[d] < p.lo[d]) p.lo[d] = v[d]; if (v[d] > p.hi[d]) p.hi[d] = v[d]; }
      p.cx += v[0]; p.cy += v[1]; p.cz += v[2];
    }
  }
  // Model axis: the centre of the whole model's XZ footprint. A petal's centroid sits out
  // from it; a core's sits on it.
  const ax = (lo[0] + hi[0]) / 2, az = (lo[2] + hi[2]) / 2;
  for (const p of parts) {
    const nv = p.tris * 3;
    if (!nv) continue;
    p.cx /= nv; p.cy /= nv; p.cz /= nv;
    p.axisR = Math.hypot(p.cx - ax, p.cz - az);
    p.bbox = [p.hi[0] - p.lo[0], p.hi[1] - p.lo[1], p.hi[2] - p.lo[2]];
    p.yMid = (p.lo[1] + p.hi[1]) / 2;
  }
  return { total: n, comps, parts: parts.filter((p) => p.tris > 0), straddlers, unlabelled, modelY: [lo[1], hi[1]] };
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/flower.html';
  fs.readFile(path.join(ROOT, p), (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('dialog', (d) => d.accept().catch(() => {}));
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
  catch { route.abort(); }
});
async function freshPage() {
  await page.goto(`http://127.0.0.1:${port}/flower.html`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => { const el = document.getElementById('readout'); return el && /tris/.test(el.textContent); }, { timeout: 60000 });
  await page.evaluate(() => {
    const t = document.getElementById('advancedToggle'); t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true }));
    const h = document.querySelector('.fl-acc__head[aria-controls="acc-make"]');
    if (h && h.getAttribute('aria-expanded') !== 'true') h.click();
  });
  await page.waitForTimeout(200);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flower-diag-'));
const bad = [];
for (const cfg of CONFIGS) {
  await freshPage();
  if (cfg.presetSlug) {
    const clicked = await page.evaluate((slug) => {
      const cell = document.querySelector(`#presetRow .fl-preset[data-slug="${slug}"]`);
      if (!cell) return false;
      cell.click();
      return true;
    }, cfg.presetSlug);
    if (!clicked) { bad.push(`${cfg.label}: gallery cell not found`); continue; }
  } else {
    const miss = await page.evaluate((ss) => {
      const out = [];
      for (const s of ss) {
        const el = document.getElementById(s.id);
        if (!el) { out.push(`${s.id}: not in the DOM`); continue; }
        el.value = s.value;
        el.dispatchEvent(new Event(s.evt || 'input', { bubbles: true }));
        if ((s.evt || 'input') !== 'change') el.dispatchEvent(new Event('change', { bubbles: true }));
        if (String(el.value) !== String(s.value)) out.push(`${s.id}: set "${s.value}", reads back "${el.value}"`);
      }
      return out;
    }, cfg.set);
    if (miss.length) { bad.push(`${cfg.label}: config did not take: ${miss.join('; ')}`); continue; }
  }
  await page.waitForTimeout(400);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 180000 }).catch(() => null), page.click('#exportStl')]);
  if (!dl) { bad.push(`${cfg.label}: no STL download`); continue; }
  const fp = path.join(tmp, 'x.stl');
  await dl.saveAs(fp);
  const d = decompose(fs.readFileSync(fp), CELL_MM);
  if (d.skipped) { console.log(`\n${cfg.label} — SKIPPED, grid ${d.dim.join('x')} too large\n`); continue; }

  // SELF-CHECK. A decomposition that loses or double-counts triangles is not a
  // decomposition, and a straddling triangle would mean the labelling is ambiguous.
  const sum = d.parts.reduce((a, p) => a + p.tris, 0);
  if (sum + d.unlabelled !== d.total) bad.push(`${cfg.label}: components hold ${sum} tris + ${d.unlabelled} unlabelled, export has ${d.total}`);
  if (d.straddlers) bad.push(`${cfg.label}: ${d.straddlers} triangle(s) sampled into more than one component — the labelling is ambiguous`);
  if (d.unlabelled) bad.push(`${cfg.label}: ${d.unlabelled} triangle(s) landed in no voxel at all`);

  d.parts.sort((a, b) => b.tris - a.tris);
  console.log(`\n${cfg.label}  (${cfg.meta})`);
  console.log(`  ${d.comps} component(s), ${d.total.toLocaleString()} tris total, model height ${(d.modelY[1] - d.modelY[0]).toFixed(1)} mm`);
  console.log('   #      tris   share   axisR      bbox x*y*z (mm)      yMid');
  d.parts.slice(0, TOP_N).forEach((p, i) => {
    console.log(`  ${String(i).padStart(2)}  ${String(p.tris).padStart(8)}  ${(100 * p.tris / d.total).toFixed(2).padStart(5)}%  ${p.axisR.toFixed(2).padStart(6)}  `
      + `${p.bbox.map((v) => v.toFixed(1).padStart(6)).join(' x ')}  ${p.yMid.toFixed(1).padStart(6)}`);
  });
  if (d.parts.length > TOP_N) console.log(`  ... and ${d.parts.length - TOP_N} more`);
}
await browser.close();
server.close();
fs.rmSync(tmp, { recursive: true, force: true });

if (bad.length) {
  console.error('\ndiag: INVALID — the decomposition does not account for the export:');
  for (const b of bad) console.error(`  - ${b}`);
  process.exit(1);
}
console.log('\ndiag: every component accounted for; triangle counts sum to the export total, no straddlers.');
