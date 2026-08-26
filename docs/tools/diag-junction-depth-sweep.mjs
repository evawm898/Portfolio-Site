/*
 * diag-junction-depth-sweep.mjs — how deep should the junction hang? (#84)
 *
 * REPORT-ONLY DIAGNOSTIC, not a gate. Under docs/tools/ so it is not mistaken for one.
 * It does not choose anything; it lays out the evidence for a choice somebody else makes.
 *
 * WHY IT EXISTS. Making the junction unconditional gives every bare bloom connective mass
 * it never had, below the petal feet. `receptacleDepth` drives
 * `depthW = lerp(0.18, 1.15, depth)` — the descent below the attachment ring — so it is the
 * one control that trades "prints in one piece" against "grew a spike underneath". This
 * sweeps it across the designs that were broken and reports, per depth, the numbers AND the
 * renders, from the same page state so they cannot disagree.
 *
 * WHAT IT REPORTS PER (design, depth):
 *   components   voxel flood fill at CELL_MM, same as tools/verify-connectedness.mjs. The
 *                only value that matters is 1.
 *   tris / delta export triangle count, and the change from this design's shallowest depth.
 *   tailXZ       XZ extent of the lowest 8% of the model over the whole model's XZ extent.
 *                This is the OBJECTIVE "does the junction hang below the bloom" measure:
 *                ~1 means the lowest slice is petal underside and the junction is tucked up
 *                inside the flower; a small value means a narrow spike is the lowest thing
 *                in the model. It is a ratio, so heightMM's normalisation cannot skew it.
 *   PNGs         three-quarter and side view. The underside is the thing in question, so a
 *                head-on view alone would beg it.
 *
 * SELF-CHECK (hard, aborts the run):
 *   1. READ-BACK — receptacleDepth must read back exactly what was set, per row.
 *   2. DISTINCTNESS — for one design, the STLs at different depths must have different
 *      SHA-256s. If the control were silently ignored (the failure mode that would make
 *      every number here a lie while still looking plausible), the hashes would collide.
 *      This is the assertion the negative control exercises. The per-design record is an
 *      ARRAY and not a Map keyed by depth: a Map deduplicates a repeated depth, which left
 *      the check with nothing to compare and let the negative control pass on a harness
 *      that could not fail. That is what running the control caught.
 *
 * NEGATIVE CONTROL:  node docs/tools/diag-junction-depth-sweep.mjs <dir> --negative-control
 *   Sweeps the SAME depth several times, so distinctness must fail. If the run still passes,
 *   the check is not measuring anything and no result from this tool is worth quoting.
 *
 * RUN:  node docs/tools/diag-junction-depth-sweep.mjs <outDir>
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { findChromium } from '../../tools/chromium-harness.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const THREE_VERSION = '0.161.0';
const CELL_MM = 0.6;          // must match tools/verify-connectedness.mjs
const MAX_VOXELS = 90e6;
const TAIL_FRAC = 0.08;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const OUT = process.argv[2];
const NEGATIVE_CONTROL = process.argv.includes('--negative-control');
if (!OUT) { console.error('usage: node docs/tools/diag-junction-depth-sweep.mjs <outDir> [--negative-control]'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const { PRESETS } = await import(pathToFileURL(path.join(ROOT, 'flower-presets.js')).href);

// depthW = lerp(0.18, 1.15, depth), so 0 is not "no junction" — it is the shallowest the
// control can express. The sweep brackets the shipped default (0.5) from below.
const DEPTHS = NEGATIVE_CONTROL ? [0.5, 0.5, 0.5] : [0, 0.1, 0.2, 0.3, 0.5];

// The four presets #84 broke, plus the shipped DEFAULTS — the state a cold visitor lands on
// before touching anything. Rose / Dahlia / Carnation were already one piece and are not
// the question being asked here.
const DESIGNS = [
  { key: 'defaults', label: 'shipped DEFAULTS (bare bloom)', presetSlug: null },
  ...['daisy', 'lily', 'poppy', 'thistle'].map((slug) => {
    const p = PRESETS.find((x) => x.slug === slug);
    return { key: slug, label: `preset: ${p.name}`, presetSlug: slug };
  }),
];

function analyse(buf, cell) {
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
  // tail probe — same definition as the gate's
  const whole = Math.max(hi[0] - lo[0], hi[2] - lo[2]);
  const cut = lo[1] + (hi[1] - lo[1]) * TAIL_FRAC;
  const tlo = [Infinity, Infinity], thi = [-Infinity, -Infinity];
  for (const t of tri) for (const v of t) {
    if (v[1] > cut) continue;
    if (v[0] < tlo[0]) tlo[0] = v[0]; if (v[0] > thi[0]) thi[0] = v[0];
    if (v[2] < tlo[1]) tlo[1] = v[2]; if (v[2] > thi[1]) thi[1] = v[2];
  }
  const tailXZ = (isFinite(thi[0]) && whole > 0) ? +(Math.max(thi[0] - tlo[0], thi[1] - tlo[1]) / whole).toFixed(4) : NaN;

  const dim = hi.map((h, k) => Math.max(1, Math.ceil((h - lo[k]) / cell) + 1));
  if (dim[0] * dim[1] * dim[2] > MAX_VOXELS) return { tris: n, tailXZ, comps: null, dim };
  const occ = new Uint8Array(dim[0] * dim[1] * dim[2]);
  const at = (x, y, z) => (z * dim[1] + y) * dim[0] + x;
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
  return { tris: n, tailXZ, comps, strayFraction: total ? +(1 - biggest / total).toFixed(5) : 0 };
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
const ctx = await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2, acceptDownloads: true });
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
    // Hide the panels: a render of the control panel is not a render of the flower. The
    // export button is inside one of them, so it is clicked in-page below rather than
    // through Playwright's visibility-aware click.
    for (const sel of ['.fl-panel', '.fl-presets', '.fl-view', '#readout']) {
      for (const el of document.querySelectorAll(sel)) el.style.visibility = 'hidden';
    }
    const a = document.getElementById('autoRotate');
    if (a && a.checked) { a.checked = false; a.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await page.waitForTimeout(250);
}

const shot = async (view, file) => {
  await page.evaluate((v) => {
    const el = document.getElementById('viewPreset');
    el.value = v; el.dispatchEvent(new Event('change', { bubbles: true }));
  }, view);
  await page.waitForTimeout(600);
  await page.locator('#flower-canvas').screenshot({ path: file });
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flower-depth-'));
const bad = [];
const rows = [];
for (const d of DESIGNS) {
  // An ARRAY, not a Map keyed by depth. A Map silently deduplicates repeated depths, which
  // is precisely the shape the negative control sweeps — so the distinctness check below had
  // nothing to compare and the control ran green on a harness that could not fail. Found by
  // running the control; a self-check nobody has watched fail is a hope, not a check.
  const hashes = [];
  for (const depth of DEPTHS) {
    await freshPage();
    if (d.presetSlug) {
      const clicked = await page.evaluate((slug) => {
        const cell = document.querySelector(`#presetRow .fl-preset[data-slug="${slug}"]`);
        if (!cell) return false; cell.click(); return true;
      }, d.presetSlug);
      if (!clicked) { bad.push(`${d.label}: gallery cell not found`); continue; }
      await page.waitForTimeout(300);
    }
    // SELF-CHECK 1: read-back.
    const got = await page.evaluate((v) => {
      const el = document.getElementById('receptacleDepth');
      if (!el) return { missing: true };
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { value: el.value };
    }, depth);
    if (got.missing) { bad.push(`${d.label} @${depth}: no #receptacleDepth control`); continue; }
    if (Math.abs(Number(got.value) - depth) > 1e-9) { bad.push(`${d.label} @${depth}: reads back "${got.value}"`); continue; }
    await page.waitForTimeout(700);

    const tag = `${d.key}__depth${String(depth).replace('.', 'p')}`;
    await shot('default', path.join(OUT, `${tag}__34.png`));
    await shot('side', path.join(OUT, `${tag}__side.png`));

    // Dispatch the click in-page rather than through Playwright: the panels are hidden for
    // the renders above, and Playwright's click waits for visibility. The button is real and
    // wired either way — this is the same handler a visitor's click runs.
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 180000 }).catch(() => null),
      page.evaluate(() => document.getElementById('exportStl').click()),
    ]);
    if (!dl) { bad.push(`${d.label} @${depth}: no STL download`); continue; }
    const fp = path.join(tmp, 'x.stl');
    await dl.saveAs(fp);
    const buf = fs.readFileSync(fp);
    const sha = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
    hashes.push({ depth, sha });
    rows.push({ design: d.label, key: d.key, depth, sha, ...analyse(buf, CELL_MM) });
  }
  // SELF-CHECK 2: distinctness. A silently-ignored control collides here. Every pair is
  // compared, so a repeat of the same depth collides with itself — which is what makes the
  // negative control able to exercise this at all.
  const seen = new Map();
  for (const { depth, sha } of hashes) {
    if (seen.has(sha)) bad.push(`${d.label}: depth ${depth} and depth ${seen.get(sha)} exported the SAME STL (${sha}) — receptacleDepth is not taking`);
    else seen.set(sha, depth);
  }
}
await browser.close();
server.close();
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`junction depth sweep — depthW = lerp(0.18, 1.15, depth); components at ${CELL_MM} mm\n`);
let lastKey = null, baseTris = 0;
for (const r of rows) {
  if (r.key !== lastKey) {
    console.log(`\n${r.design}`);
    console.log('  depth   comps      tris      delta   tailXZ   sha');
    lastKey = r.key; baseTris = r.tris;
  }
  const delta = r.tris - baseTris;
  console.log(`  ${String(r.depth).padEnd(5)}  ${String(r.comps).padStart(5)}  ${String(r.tris).padStart(9)}  ${(delta >= 0 ? '+' : '') + delta}`.padEnd(48)
    + `  ${String(r.tailXZ).padEnd(7)}  ${r.sha}`);
}
console.log(`\ntailXZ: ~1 = the lowest slice of the model is petal underside (junction tucked up inside the bloom).`);
console.log(`        small = a narrow spike is the lowest thing in the model (junction hangs below).`);
console.log(`\nPNGs in ${OUT} — <design>__depth<N>__34.png and __side.png.`);

if (NEGATIVE_CONTROL) {
  if (bad.length) { console.log('\nNEGATIVE CONTROL: PASS — the distinctness check rejected the repeated depth, as it must.'); process.exit(0); }
  console.error('\nNEGATIVE CONTROL: FAILED — three runs at the SAME depth were not detected as identical.');
  console.error('The distinctness check is not measuring anything. Do not trust a result from this tool.');
  process.exit(1);
}
if (bad.length) {
  console.error(`\ndiag: INVALID — ${bad.length} self-check failure(s); no number above is trustworthy:`);
  for (const b of bad) console.error(`  - ${b}`);
  process.exit(1);
}
console.log('\ndiag: self-checks passed — every depth read back, and every depth produced a distinct export.');
