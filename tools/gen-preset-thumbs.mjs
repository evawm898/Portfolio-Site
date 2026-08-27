/*
 * gen-preset-thumbs.mjs — build-time thumbnails for the shipped presets.
 *
 * WHY: the preset gallery (the "shop window") shows a thumbnail per preset. Those
 * images are a BUILD-TIME artifact, never rendered at runtime — so a cold visitor
 * never waits on seven offscreen renders. This script regenerates them from
 * flower-presets.js, keeping the pictures honest to the params.
 *
 * WHAT: serves the repo, loads /flower.html headless, and for each preset loads it
 * through the real applyDesign() path, frames the bloom, and writes
 * assets/presets/<slug>.png. It also writes assets/presets/manifest.json recording
 * each preset's triangle count + bounding box — deterministic values (no GPU
 * dependence), so `--check` can fail the build if a preset drifts.
 *
 *   node tools/gen-preset-thumbs.mjs          # (re)write PNGs + manifest
 *   node tools/gen-preset-thumbs.mjs --check  # regenerate to a temp dir, diff the
 *                                             # manifest vs committed, exit 1 on drift
 *
 * REQUIREMENTS (dev/CI only; the deployed site needs none of this):
 *   npm i three@0.161.0 playwright-core
 * Watertightness/quality of each preset is guarded by the export + geometry-quality
 * gates (which also load flower-presets.js by name); this script guards the pictures.
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { findChromium } from './chromium-harness.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_VERSION = '0.161.0';
const OUT_DIR = path.join(ROOT, 'assets', 'presets');
const CHECK = process.argv.includes('--check');
const THUMB_PX = 400;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };


// A compact, read-only hook appended to the SERVED copy of flower.js (the file on
// disk is never touched) — enough to load a design and frame it for a screenshot.
const THUMB_HOOK = `
window.__thumb = {
  ready: true,
  apply: (d) => { applyDesign(d); return true; },
  tris() { const p = meshPetals.geometry.index ? meshPetals.geometry.index.count : 0; const c = meshCore.geometry.index ? meshCore.geometry.index.count : 0; return (p + c) / 3; },
  // #44: LIVE_TRI_BUDGET straight from flower.js's own module scope (this hook is
  // appended to the served copy of it) -- never a value copied into this tool, which
  // would silently drift the moment the constant changes there.
  liveTriBudget: LIVE_TRI_BUDGET,
  bbox() {
    const b = new THREE.Box3(); b.makeEmpty();
    for (const m of [meshPetals, meshCore]) { if (!m.geometry || !m.geometry.attributes.position) continue; m.geometry.computeBoundingBox(); if (m.geometry.boundingBox && isFinite(m.geometry.boundingBox.min.x)) b.union(m.geometry.boundingBox); }
    return { min: b.min.toArray(), max: b.max.toArray() };
  },
  frame(dir, pad = 1.45) {
    controls.autoRotate = false;
    const b = this.bbox();
    const cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2, cz = (b.min[2] + b.max[2]) / 2;
    const radius = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) * 0.5 || 2;
    const dist = (radius / Math.tan((camera.fov * Math.PI / 180) / 2)) * pad;
    const dl = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    controls.target.set(cx, cy, cz);
    camera.position.set(cx + dir[0] / dl * dist, cy + dir[1] / dl * dist, cz + dir[2] / dl * dist);
    camera.near = Math.max(0.01, dist * 0.01); camera.far = dist * 20;
    camera.updateProjectionMatrix(); controls.update();
    return true;
  }
};
`;

const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/flower.html';
  const abs = path.join(ROOT, u);
  if (!abs.startsWith(ROOT)) { res.writeHead(403); return res.end('no'); }
  fs.readFile(abs, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream' });
    if (abs.endsWith('flower.js')) res.end(buf.toString('utf8') + '\n' + THUMB_HOOK); else res.end(buf);
  });
});

const { PRESETS, PRESET_SCHEMA } = await import(pathToFileURL(path.join(ROOT, 'flower-presets.js')).href);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewportSize({ width: THUMB_PX, height: THUMB_PX });
await page.route('**/cdn.jsdelivr.net/**', (route) => {
  const m = route.request().url().match(new RegExp(`three@${THREE_VERSION.replace(/\./g, '\\.')}/(.*)$`));
  if (!m) return route.continue();
  try { return route.fulfill({ status: 200, headers: { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(path.join(ROOT, 'node_modules', 'three', m[1])) }); }
  catch { return route.fulfill({ status: 404, body: 'nf' }); }
});
await page.goto(`http://127.0.0.1:${port}/flower.html`, { waitUntil: 'load', timeout: 45000 });
await page.waitForFunction('window.__thumb && window.__thumb.ready === true', { timeout: 45000 });
await page.evaluate(() => document.body.classList.add('fl-preview'));
await page.waitForTimeout(300);

const writeDir = CHECK ? path.join(ROOT, 'assets', 'presets', '.check') : OUT_DIR;
fs.mkdirSync(writeDir, { recursive: true });
const liveTriBudget = await page.evaluate(() => window.__thumb.liveTriBudget);
const manifest = {};
// #44: the shipped presets are the "shop window" — the first thing a visitor
// clicks. LIVE_TRI_BUDGET refuses over-budget LIVE builds with an on-screen
// message; a preset that drifted over it would refuse SILENTLY on load (no
// slider to blame it on, no message the visitor asked for) instead of failing a
// build someone can see. Gated here, every time this script runs (not just
// --check), because this is the one place that already knows every preset's
// real triangle count.
let budgetFail = 0;
for (const p of PRESETS) {
  await page.evaluate((d) => window.__thumb.apply(d), { ...p.ui, schemaVersion: PRESET_SCHEMA });
  await page.waitForTimeout(280);   // let the deferred regen settle
  await page.evaluate(() => window.__thumb.frame([0.28, 0.62, 1], 1.45));
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(writeDir, `${p.slug}.png`) });
  const tris = await page.evaluate(() => window.__thumb.tris());
  const bbox = await page.evaluate(() => window.__thumb.bbox());
  // `tris` here is the LIVE three.js count (window.__thumb.tris() reads
  // meshPetals/meshCore geometry), NOT the exported STL's. The two differ per design by
  // 1.09x to 1.44x because export mode floors feature sizes, so they are never
  // interchangeable — and both gates used to print the bare word "tris", which is how an
  // export figure can be read against LIVE_TRI_BUDGET and look alarming for no reason.
  manifest[p.slug] = { name: p.name, mode: 'live', tris, bbox };
  const margin = tris > 0 ? liveTriBudget / tris : Infinity;
  if (tris > liveTriBudget) {
    console.log(`FAIL ${p.slug.padEnd(12)} ${tris.toLocaleString().padStart(9)} live tris — OVER the live budget (${liveTriBudget.toLocaleString()}), #44`);
    budgetFail++;
  } else {
    process.stdout.write(`${p.slug.padEnd(12)} ${tris.toLocaleString().padStart(9)} live tris   (${margin.toFixed(2)}x under the ${liveTriBudget.toLocaleString()} live budget)\n`);
  }
}
await browser.close(); server.close();

if (budgetFail > 0) {
  console.log(`\n${budgetFail} preset(s) exceed LIVE_TRI_BUDGET — a visitor's first click would be refused. Lighten the preset or raise the budget deliberately (flower.js), don't ship this.`);
}

if (!CHECK) {
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nwrote ${PRESETS.length} thumbnails + manifest.json to assets/presets/`);
  process.exit(budgetFail > 0 ? 1 : 0);
}

// --check: diff the freshly-rendered manifest against the committed one. Triangle
// count is exact (GPU-independent); bbox is compared with a small tolerance.
let fail = budgetFail;
const committed = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'manifest.json'), 'utf8'));
const bboxDrift = (a, b) => {
  let d = 0; for (const side of ['min', 'max']) for (let i = 0; i < 3; i++) d = Math.max(d, Math.abs(a[side][i] - b[side][i]));
  return d;
};
for (const p of PRESETS) {
  const now = manifest[p.slug], was = committed[p.slug];
  if (!was) { console.log(`FAIL ${p.slug}: no committed manifest entry (run without --check and commit)`); fail++; continue; }
  if (now.tris !== was.tris) { console.log(`FAIL ${p.slug}: live tris ${was.tris} -> ${now.tris}`); fail++; continue; }
  const drift = bboxDrift(now.bbox, was.bbox);
  if (drift > 1e-3) { console.log(`FAIL ${p.slug}: bbox drift ${drift.toFixed(4)} units`); fail++; continue; }
  console.log(`ok   ${p.slug}`);
}
fs.rmSync(writeDir, { recursive: true, force: true });
if (fail === 0) {
  console.log('\nPASS — preset thumbnails match committed manifest, all under LIVE_TRI_BUDGET');
} else if (budgetFail === fail) {
  console.log(`\nFAIL: ${budgetFail} preset(s) over LIVE_TRI_BUDGET (see above) — not a thumbnail drift, fix the preset or the budget`);
} else {
  console.log(`\nDRIFT: ${fail} preset(s) changed or over budget; regenerate with \`node tools/gen-preset-thumbs.mjs\` and commit`);
}
process.exit(fail === 0 ? 0 : 1);
