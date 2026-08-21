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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findChromium, serveRepo, routeThreeCDN } from './flower-gate-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_VERSION = '0.161.0';
const OUT_DIR = path.join(ROOT, 'assets', 'presets');
const CHECK = process.argv.includes('--check');
const THUMB_PX = 400;

// A compact, read-only hook appended to the SERVED copy of flower.js (the file on
// disk is never touched) — enough to load a design and frame it for a screenshot.
const THUMB_HOOK = `
window.__thumb = {
  ready: true,
  apply: (d) => { applyDesign(d); return true; },
  tris() { const p = meshPetals.geometry.index ? meshPetals.geometry.index.count : 0; const c = meshCore.geometry.index ? meshCore.geometry.index.count : 0; return (p + c) / 3; },
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

const { PRESETS, PRESET_SCHEMA } = await import(pathToFileURL(path.join(ROOT, 'flower-presets.js')).href);
const { server, port } = await serveRepo(ROOT, { hook: THUMB_HOOK });
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewportSize({ width: THUMB_PX, height: THUMB_PX });
await routeThreeCDN(page, ROOT, THREE_VERSION);
await page.goto(`http://127.0.0.1:${port}/flower.html`, { waitUntil: 'load', timeout: 45000 });
await page.waitForFunction('window.__thumb && window.__thumb.ready === true', { timeout: 45000 });
await page.evaluate(() => document.body.classList.add('fl-preview'));
await page.waitForTimeout(300);

const writeDir = CHECK ? path.join(ROOT, 'assets', 'presets', '.check') : OUT_DIR;
fs.mkdirSync(writeDir, { recursive: true });
const manifest = {};
for (const p of PRESETS) {
  await page.evaluate((d) => window.__thumb.apply(d), { ...p.ui, schemaVersion: PRESET_SCHEMA });
  await page.waitForTimeout(280);   // let the deferred regen settle
  await page.evaluate(() => window.__thumb.frame([0.28, 0.62, 1], 1.45));
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(writeDir, `${p.slug}.png`) });
  const tris = await page.evaluate(() => window.__thumb.tris());
  const bbox = await page.evaluate(() => window.__thumb.bbox());
  manifest[p.slug] = { name: p.name, tris, bbox };
  process.stdout.write(`${p.slug.padEnd(12)} ${tris.toLocaleString().padStart(9)} tris\n`);
}
await browser.close(); server.close();

if (!CHECK) {
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nwrote ${PRESETS.length} thumbnails + manifest.json to assets/presets/`);
  process.exit(0);
}

// --check: diff the freshly-rendered manifest against the committed one. Triangle
// count is exact (GPU-independent); bbox is compared with a small tolerance.
let fail = 0;
const committed = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'manifest.json'), 'utf8'));
const bboxDrift = (a, b) => {
  let d = 0; for (const side of ['min', 'max']) for (let i = 0; i < 3; i++) d = Math.max(d, Math.abs(a[side][i] - b[side][i]));
  return d;
};
for (const p of PRESETS) {
  const now = manifest[p.slug], was = committed[p.slug];
  if (!was) { console.log(`FAIL ${p.slug}: no committed manifest entry (run without --check and commit)`); fail++; continue; }
  if (now.tris !== was.tris) { console.log(`FAIL ${p.slug}: tris ${was.tris} -> ${now.tris}`); fail++; continue; }
  const drift = bboxDrift(now.bbox, was.bbox);
  if (drift > 1e-3) { console.log(`FAIL ${p.slug}: bbox drift ${drift.toFixed(4)} units`); fail++; continue; }
  console.log(`ok   ${p.slug}`);
}
fs.rmSync(writeDir, { recursive: true, force: true });
console.log(`\n${fail === 0 ? 'PASS — preset thumbnails match committed manifest' : 'DRIFT: ' + fail + ' preset(s) changed; regenerate with `node tools/gen-preset-thumbs.mjs` and commit'}`);
process.exit(fail === 0 ? 0 : 1);
