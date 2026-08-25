/*
 * verify-connectedness.mjs — is the exported model ONE printed piece? (issue #43)
 *
 * WHAT THIS IS FOR. The flower-project skill states the invariant plainly: the model is
 * always one connected watertight solid. Two of those three words have had a gate for a
 * long time; "connected" has not. The export gate measures MANIFOLDNESS (boundary edges =
 * 0) and nothing else — and two entirely separate closed solids floating a centimetre apart
 * also have zero boundary edges. A model can pass every gate this project owns and print as
 * a bloom plus a detached stem.
 *
 * WHY THE OBVIOUS MEASURES DO NOT WORK. The skill records both dead ends, and they cost
 * real time:
 *   - Vertex-weld shell count is NOT connectedness. The model is assembled from many
 *     individually-closed primitives that interpenetrate WITHOUT sharing welded vertices,
 *     so union-find over welded vertices reports 15 to 26,684 shells across healthy
 *     configs. It is a labelled diagnostic, never a gate.
 *   - An AABB-overlap graph is WORSE THAN NOTHING. Bounding boxes can overlap when the
 *     shells inside them do not, so it would pass a broken model. A gate that can only
 *     produce false negatives is more dangerous than an absent one.
 * Connectedness is volumetric, so it needs a volumetric measure.
 *
 * WHAT THIS MEASURES. Rasterise every triangle into a voxel grid at a cell below the
 * minimum printable feature (0.8 mm), then 6-connected flood-fill the occupied voxels. One
 * region means every primitive's surface touches or overlaps its neighbours' within one
 * cell, so the slicer unions them into one body. More than one region means the export
 * contains pieces that are not joined — a print that arrives in parts.
 *
 * WHAT IT DOES NOT YET PROVE — read this before quoting a PASS:
 *   - It is a SURFACE occupancy test, not a solid one. Two shells that merely graze within
 *     one cell read as connected. A true solid test would need per-shell interior
 *     classification (ray parity per shell, OR the occupancy grids, then fill); that is the
 *     stronger measure and is not built. This one cannot produce a false ALARM, only a
 *     false pass on a hairline touch — the safe direction for a first gate, and the reason
 *     it is worth shipping before the stronger one exists.
 *   - Cell size is a floor, not a proof: at 0.6 mm a genuine 0.2 mm gap reads as joined.
 *     Lower CELL_MM to tighten it, at cubic cost in memory.
 *   - The config list below is small and hand-picked (it began as the junction-risk probe
 *     for the receptacle controls, and now carries one Voronoi PARTITION row for the region
 *     seams, which are a different failure shape from a junction). It is NOT the export
 *     gate's matrix. Every config here has come back as one component; that is evidence the
 *     junction and those seams hold at these corners, not evidence they hold everywhere.
 *     Widen it before treating a PASS as general.
 *
 * A grid larger than MAX_VOXELS is SKIPPED and reported as skipped, never silently passed.
 *
 * RUN:  node tools/verify-connectedness.mjs
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { findChromium } from './chromium-harness.mjs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_VERSION = '0.161.0';
const CELL_MM = 0.6;          // < MIN_FEATURE_MM (0.8): a real gap cannot hide inside a cell
const MAX_VOXELS = 90e6;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

// Baseline every row starts from, so a row's meaning does not depend on the row before it.
const BASE = [
  { id: 'bloomType', value: 'radial', evt: 'change' }, { id: 'petalCount', value: '9' },
  { id: 'layerCount', value: '1' }, { id: 'infillType', value: 'veins', evt: 'change' },
  { id: 'continuousMargin', value: 'on', evt: 'change' }, { id: 'heightMM', value: '120' },
  { id: 'stemType', value: 'stem', evt: 'change' }, { id: 'sepalsType', value: 'sepals', evt: 'change' },
  { id: 'tube', value: '0.4' }, { id: 'stemCurve', value: '0' }, { id: 'stemLength', value: '4' },
  { id: 'stemThickness', value: '1' }, { id: 'receptacleType', value: 'none', evt: 'change' },
];

// JUNCTION-RISK CONFIGS. `tube` is the master length scale for every tube/bead primitive —
// including the junction neck radius and the SDF junction feet — so its extremes are the
// values most able to shrink the connective mass below the point where it still overlaps
// the petal feet. `stemCurve` is here because it has never been exported at a non-zero
// value in this project's history: it was unreachable in the UI from the day it shipped, so
// its geometry path is untested rather than tested-and-fine.
const CONFIGS = [
  { label: 'tube 0 (thinnest junction) + stem + sepals', set: [{ id: 'tube', value: '0' }] },
  { label: 'tube 0.4 (default)', set: [] },
  { label: 'tube 1 (thickest)', set: [{ id: 'tube', value: '1' }] },
  { label: 'tube 0, NO STEM (SDF junction seals alone)', set: [{ id: 'tube', value: '0' }, { id: 'stemType', value: 'none', evt: 'change' }] },
  { label: 'tube 1, NO STEM', set: [{ id: 'tube', value: '1' }, { id: 'stemType', value: 'none', evt: 'change' }] },
  { label: 'tube 0, LEGACY receptacle (continuous margin OFF)', set: [{ id: 'tube', value: '0' }, { id: 'continuousMargin', value: 'off', evt: 'change' }] },
  { label: 'tube 1, LEGACY receptacle', set: [{ id: 'tube', value: '1' }, { id: 'continuousMargin', value: 'off', evt: 'change' }] },
  { label: 'stemCurve -1, long stem', set: [{ id: 'stemCurve', value: '-1' }, { id: 'stemLength', value: '8' }] },
  { label: 'stemCurve +1, max length, thinnest stem', set: [{ id: 'stemCurve', value: '1' }, { id: 'stemLength', value: '10' }, { id: 'stemThickness', value: '0.5' }] },
  { label: 'stemCurve +1 + tube 0 (thinnest curved stem)', set: [{ id: 'stemCurve', value: '1' }, { id: 'stemLength', value: '10' }, { id: 'stemThickness', value: '0.5' }, { id: 'tube', value: '0' }] },
  { label: 'receptacleType ON alone (junction forced, no stem, no sepals)', set: [{ id: 'stemType', value: 'none', evt: 'change' }, { id: 'sepalsType', value: 'none', evt: 'change' }, { id: 'receptacleType', value: 'on', evt: 'change' }] },
  // REGION SEAMS, not a junction corner. Every config above probes the junction — where
  // the petal feet, the centre and the stem meet — so a green result from them says
  // nothing about the seams the Voronoi PARTITION introduces: the divider that runs down
  // each cleft slot to its sinus floor, and the midline where the +Y half meets its own
  // mirror. Those are places where two independently-clipped cells are expected to touch,
  // which is exactly the shape of thing that prints in two pieces if they do not.
  // 4 lobes puts a divider on the midline (an even lobe count places a cleft centre at
  // y = 0, so the divider seam and the mirror seam coincide there — the worst case);
  // voronoi because the partition only exists for it.
  { label: 'LOBED 4 + voronoi (partition region seams + mirror midline)', set: [
    { id: 'infillType', value: 'voronoi', evt: 'change' }, { id: 'cleftDepth', value: '0.55' },
    { id: 'cleftLobes', value: '4' }, { id: 'cleftWidth', value: '0.3' }] },
];

function boundaryEdges(buf) {
  const n = buf.readUInt32LE(80);
  const q = (v) => Math.round(v * 1e5) / 1e5;
  const edges = new Map();
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50; const t = [];
    for (let k = 0; k < 3; k++) { const b = o + 12 + k * 12; t.push(`${q(buf.readFloatLE(b))},${q(buf.readFloatLE(b + 4))},${q(buf.readFloatLE(b + 8))}`); }
    for (let k = 0; k < 3; k++) { const a = t[k], b = t[(k + 1) % 3]; const e = a < b ? `${a}|${b}` : `${b}|${a}`; edges.set(e, (edges.get(e) || 0) + 1); }
  }
  let boundary = 0; for (const c of edges.values()) if (c === 1) boundary++;
  return { tris: n, boundary };
}

function voxelComponents(buf, cell) {
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
  // Barycentric sampling at half a cell, so no cell a triangle passes through is skipped.
  for (const t of tri) {
    const e1 = [t[1][0] - t[0][0], t[1][1] - t[0][1], t[1][2] - t[0][2]];
    const e2 = [t[2][0] - t[0][0], t[2][1] - t[0][1], t[2][2] - t[0][2]];
    const s = Math.max(2, Math.ceil(Math.max(Math.hypot(...e1), Math.hypot(...e2)) / (cell * 0.5)));
    for (let a = 0; a <= s; a++) for (let b = 0; b + a <= s; b++) {
      const u = a / s, v = b / s;
      const x = Math.round((t[0][0] + e1[0] * u + e2[0] * v - lo[0]) / cell);
      const y = Math.round((t[0][1] + e1[1] * u + e2[1] * v - lo[1]) / cell);
      const z = Math.round((t[0][2] + e1[2] * u + e2[2] * v - lo[2]) / cell);
      if (x >= 0 && y >= 0 && z >= 0 && x < dim[0] && y < dim[1] && z < dim[2]) occ[at(x, y, z)] = 1;
    }
  }
  const seen = new Uint8Array(occ.length), stack = [];
  let comps = 0, biggest = 0, total = 0;
  for (let i = 0; i < occ.length; i++) if (occ[i]) total++;
  for (let i = 0; i < occ.length; i++) {
    if (!occ[i] || seen[i]) continue;
    comps++; let sz = 0; stack.push(i); seen[i] = 1;
    while (stack.length) {
      const c = stack.pop(); sz++;
      const x = c % dim[0], y = Math.floor(c / dim[0]) % dim[1], z = Math.floor(c / (dim[0] * dim[1]));
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (nx < 0 || ny < 0 || nz < 0 || nx >= dim[0] || ny >= dim[1] || nz >= dim[2]) continue;
        const j = at(nx, ny, nz); if (occ[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    if (sz > biggest) biggest = sz;
  }
  return { dim, comps, biggest, total, strayFraction: total ? +(1 - biggest / total).toFixed(5) : 0 };
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
await page.goto(`http://127.0.0.1:${port}/flower.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => { const el = document.getElementById('readout'); return el && /tris/.test(el.textContent); }, { timeout: 60000 });
// Advanced, and open the Make accordion so the export button is clickable.
await page.evaluate(() => {
  const t = document.getElementById('advancedToggle'); t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true }));
  const h = document.querySelector('.fl-acc__head[aria-controls="acc-make"]');
  if (h && h.getAttribute('aria-expanded') !== 'true') h.click();
});
await page.waitForTimeout(200);

// READ-BACK: a value the UI silently rewrites would make this measure a different design
// from the one it names, and report a pass for it. Fail the config; never warn.
const applySets = (sets) => page.evaluate((ss) => {
  const bad = [];
  for (const s of ss) {
    const el = document.getElementById(s.id);
    if (!el) { bad.push(`${s.id}: not in the DOM`); continue; }
    el.value = s.value;
    el.dispatchEvent(new Event(s.evt || 'input', { bubbles: true }));
    if ((s.evt || 'input') !== 'change') el.dispatchEvent(new Event('change', { bubbles: true }));
    const got = el.value;
    const num = s.value !== '' && got !== '' && isFinite(Number(s.value)) && isFinite(Number(got));
    if (!(num ? Math.abs(Number(s.value) - Number(got)) < 1e-9 : String(s.value) === String(got))) bad.push(`${s.id}: set "${s.value}", reads back "${got}"`);
  }
  return bad;
}, sets);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flower-conn-'));
const results = [];
for (const cfg of CONFIGS) {
  const bad = [...await applySets(BASE), ...await applySets(cfg.set)];
  if (bad.length) { results.push({ label: cfg.label, ok: false, note: `config did not take: ${bad.join('; ')}` }); continue; }
  await page.waitForTimeout(400);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 180000 }).catch(() => null), page.click('#exportStl')]);
  if (!dl) { results.push({ label: cfg.label, ok: false, note: 'no STL download' }); continue; }
  const fp = path.join(tmp, 'x.stl');
  await dl.saveAs(fp);
  const buf = fs.readFileSync(fp);
  const e = boundaryEdges(buf);
  const v = voxelComponents(buf, CELL_MM);
  if (v.skipped) results.push({ label: cfg.label, ok: null, ...e, note: `SKIPPED — grid ${v.dim.join('x')} exceeds ${MAX_VOXELS.toLocaleString()} voxels` });
  else results.push({ label: cfg.label, ok: v.comps === 1, ...e, ...v });
}
await browser.close();
server.close();
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`connectedness: voxel flood fill at ${CELL_MM} mm (min printable feature is 0.8 mm)\n`);
for (const r of results) {
  const verdict = r.ok === null ? 'SKIP' : r.ok ? 'ok  ' : 'FAIL';
  const detail = r.comps !== undefined ? `components=${r.comps} stray=${r.strayFraction} tris=${r.tris} boundary=${r.boundary}` : (r.note || '');
  console.log(`  ${verdict}  ${r.label.padEnd(58)} ${detail}${r.ok !== null && r.note ? ' — ' + r.note : ''}`);
}
const failed = results.filter((r) => r.ok === false);
const skipped = results.filter((r) => r.ok === null);
console.log(`\n${results.length - failed.length - skipped.length}/${results.length} configs are ONE connected piece`
  + (skipped.length ? `; ${skipped.length} skipped (grid too large — NOT a pass)` : ''));
console.log('LIMITS: surface occupancy, not solid — two shells grazing within one cell read as joined. '
  + 'These configs are junction corners, not the export matrix; a pass here is not a general claim. See the header.');
if (failed.length) {
  console.error(`\nconnectedness: FAIL — ${failed.length} config(s) export as more than one piece:`);
  for (const f of failed) console.error(`  - ${f.label}: ${f.note || `${f.comps} components, ${(f.strayFraction * 100).toFixed(2)}% of surface detached`}`);
  process.exit(1);
}
console.log('\nconnectedness: PASS — every config above exports as a single connected body.');
