#!/usr/bin/env node
/* ===================================================================
   shot-bloom-texture-lab.mjs — the RULING SHEET for the surface-texture
   discovery. Drives bloom-texture-lab.html in headless Chromium (three.js is
   served from node_modules at the exact jsDelivr URLs the page pins) and
   photographs the page's own split view: every cell is A (left) beside B
   (right) on ONE camera, so the pair is the comparison and no pixel delta is
   quoted anywhere (two arms, one frame, one renderer — and this repo's rule
   that a pixel number needs its own same-tree control).

   Usage: node tools/shot-bloom-texture-lab.mjs <dir> [--png <file>] [--quick]
   Needs: npm i --no-save three@0.161.0 ; playwright (global install here).
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const DIR = path.resolve(args.find((a) => !a.startsWith('--')) || 'texture-sheet');
const PNG = args.includes('--png') ? path.resolve(args[args.indexOf('--png') + 1]) : null;
const QUICK = args.includes('--quick');
fs.mkdirSync(DIR, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(DIR_SERVE(u), '');
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(buf);
  });
});
function DIR_SERVE(u) { return u.startsWith('/__sheet/') ? path.join(DIR, u.slice(9)) : path.join(ROOT, u); }
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;

const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? undefined : undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 640 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route('https://cdn.jsdelivr.net/npm/three@0.161.0/**', (route) => {
  const rel = route.request().url().split('three@0.161.0/')[1];
  route.fulfill({ path: path.join(ROOT, 'node_modules/three', rel), contentType: 'text/javascript' });
});
await page.goto(`http://localhost:${PORT}/bloom-texture-lab.html`);
await page.waitForFunction(() => window.__lab && window.__lab.ready, null, { timeout: 120000 });
await page.evaluate(() => window.__lab.ready);

const BASE = { type: 'pebble', height: 0.3, lambda: 2, mode: 'outward', split: 'rows', edge: 0.4, maskBeads: true, maskHoleRims: true, maskFeet: true, maskCreases: true, flat: false };
const cells = [];
async function shot(id, section, caption, opts, view) {
  const t0 = Date.now();
  await page.evaluate((o) => window.__lab.set(o), { ...BASE, ...opts });
  await page.evaluate((v) => window.__lab.view(v), view);
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => window.__lab.info());
  const file = `${id}.png`;
  await page.locator('#view').screenshot({ path: path.join(DIR, file), timeout: 240000, animations: 'disabled' });
  cells.push({ id, section, caption, file, info, opts: { ...BASE, ...opts }, view });
  console.log(`${id} ${caption} — ${info.tris} tris (${Date.now() - t0} ms)`);
}

const S1 = '1 · A vs B at the seams between organs';
await shot('s1-hub', S1, 'hub seam, petal feet into the slab — pebble 0.3 mm outward', { state: 'default' }, 'hub');
await shot('s1-hub-none', S1, 'the same view with NO relief (control: the seams as shipped)', { state: 'default', type: 'none' }, 'hub');
if (!QUICK) {
  /* the whole bloom is 1.92 M triangles at 0.4 mm — over the export budget —
     so its cells are shot at 0.6 mm with a 2.5 mm feature (still >= 4 edges) */
  await shot('s1-stem', S1, 'whole bloom: stem, sepals, stamens into the hub-to-stem join — feature 2.5 mm', { state: 'whole', edge: 0.6, lambda: 2.5 }, 'stem');
  await shot('s1-whole', S1, 'whole bloom, whole view — one layer over every organ — feature 2.5 mm', { state: 'whole', edge: 0.6, lambda: 2.5 }, 'whole');
}
const S2 = '2 · relief on / off at beads and cell holes (A cannot turn it off)';
await shot('s2-tip-none', S2, 'petal tip, no relief', { state: 'default', type: 'none' }, 'tip');
await shot('s2-tip-masked', S2, 'petal tip — B masks the rim bead (fade 0.6 mm)', { state: 'default' }, 'tip');
await shot('s2-tip-unmasked', S2, 'petal tip — B relief on the bead too (masks off)', { state: 'default', maskBeads: false, maskCreases: false, maskFeet: false }, 'tip');
if (!QUICK) {
  await shot('s2-hole-none', S2, 'Voronoi hole rims, no relief', { state: 'infill', type: 'none' }, 'hole');
  await shot('s2-hole-masked', S2, 'hole rims — B masks hole rims and margin beads', { state: 'infill' }, 'hole');
  await shot('s2-hole-unmasked', S2, 'hole rims — B relief on the rims (masks off)', { state: 'infill', maskBeads: false, maskHoleRims: false }, 'hole');
}
/* §3 was outward vs centred / inward / emboss. Ruling 2 left outward only and
   T1 removed the other modes, so the committed docs/img/bloom-surface-texture.png
   (rendered on the red-green split, before T1) is the record of that section
   and this tool no longer reproduces it. §3 is now the split itself. */
const S3 = '3 · the split: the discovery\'s red-green against T1\'s rows (whole bloom, the stem)';
for (const split of ['redgreen', 'rows']) {
  await shot(`s3-${split}`, S3, `${split} split — pebble 0.3 mm outward, stem at 0.6 mm`, { state: 'whole', split, edge: 0.6 }, 'stem');
}
if (!QUICK) {
  const S4 = '4 · the three relief types (outward 0.3 mm, whole default bloom)';
  for (const type of ['pebble', 'cellular', 'ribbing']) await shot(`s4-${type}`, S4, `${type}`, { state: 'default', type }, 'whole');
  await shot('s4-cellular-close', S4, 'cellular, petal tip close-up', { state: 'default', type: 'cellular' }, 'tip');
  const S5 = '5 · the TUBE ring';
  await shot('s5-ring-none', S5, 'tube ring, no relief', { state: 'tube', type: 'none' }, 'ring');
  await shot('s5-ring', S5, 'tube ring — pebble 0.3 mm outward (B has no mid-surface for the ring: mesh normal, like A)', { state: 'tube' }, 'ring');
}

fs.writeFileSync(path.join(DIR, 'cells.json'), JSON.stringify(cells, null, 1));
const sections = [...new Set(cells.map((c) => c.section))];
const html = `<!doctype html><meta charset="utf-8"><title>Bloom surface texture — ruling sheet</title>
<style>body{background:#0b0b0d;color:#e8e6e1;font:13px ui-monospace,monospace;margin:16px;width:1240px}
h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;color:#6fb7ae;margin:18px 0 6px}p{color:#8b8a86;margin:0 0 8px}
.grid{display:grid;grid-template-columns:600px 600px;gap:10px 16px}.c img{width:600px;display:block;border:1px solid #2a2a30}.c div{font-size:11px;color:#c9c6bf;margin-top:2px}</style>
<h1>Bloom surface texture — A (left of each pair) vs B (right of each pair)</h1>
<p>Discovery prototype, not shipped. A: post-pass on the finished triangle soup, mesh normals, no knowledge. B: the same world-space field applied with each emitter's own knowledge (emulated): sheet normal, feature masks. Outward only (ruling 2). Export-mode geometry, subdivided to the edge in each caption. Feature size 2 mm unless noted. No pixel deltas are quoted.</p>
${sections.map((s) => `<h2>${s}</h2><div class="grid">${cells.filter((c) => c.section === s).map((c) => `<div class="c"><img src="${c.file}"><div>${c.caption} · ${c.opts.state} · ${c.opts.mode} · ${c.opts.split} split · edge ${c.opts.edge} mm · ${c.info.tris.toLocaleString()} tris (shipped ${c.info.shippedTris.toLocaleString()})</div></div>`).join('')}</div>`).join('')}`;
fs.writeFileSync(path.join(DIR, 'index.html'), html);
if (PNG) {
  const p2 = await browser.newPage({ viewport: { width: 1272, height: 900 } });
  await p2.goto(`http://localhost:${PORT}/__sheet/index.html`);
  await p2.waitForTimeout(500);
  await p2.screenshot({ path: PNG, fullPage: true });
}
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
await browser.close(); server.close();
console.log(errors.length ? 'FAILED (page errors)' : 'done');
process.exit(errors.length ? 1 : 0);
