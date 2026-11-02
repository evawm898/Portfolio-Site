#!/usr/bin/env node
/* ===================================================================
   bloom-budget-limits.mjs — WHAT THE 1.5 M EXPORT CAP PROTECTS, MEASURED
   (BONE v2 round 2; docs/bloom-surface-texture-bone-v2.md §16). Not a gate;
   an instrument. The cap (`EXPORT_TRI_BUDGET`, bloom-geometry.js) is NOT
   moved by anything here.

   For a ladder of triangle counts, each in a FRESH Chromium page (so one
   step's heap is not the next one's), it runs the page's own export path on
   a synthetic mesh of that size, step by step, and times each step:
     build   a plain JS array of 9N numbers, pushed one at a time — what the
             generator's `MeshBuilder.positions` is (bloom-geometry.js);
     geo     `new THREE.Float32BufferAttribute(positions, 3)` on a
             BufferGeometry — bloom.js's `buildGeometry`;
     stl     `new STLExporter().parse(mesh, { binary: true })` and the Blob —
             bloom.js's export handler, verbatim;
     render  one WebGL draw of the mesh (the page shows what it built; this
             box's GL is SwiftShader, so this is the software rasteriser's
             time, not a GPU's).
   It records the JS heap after each step (performance.memory) and the first
   step that THROWS (a RangeError on the array, an allocation failure), CRASHES
   the renderer (Playwright's 'crash' event) or STALLS (a step over
   --stall seconds, default 120). The STL size is arithmetic: 84 + 50 N bytes.

     node tools/bloom-budget-limits.mjs [--ladder 1.5,3,6,12,24,48]
       [--stall 120] [--out docs/data/bloom-budget-limits.json]
   =================================================================== */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChromium } from './chromium-harness.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = arg('--out', path.join(ROOT, 'docs/data/bloom-budget-limits.json'));
const LADDER = arg('--ladder', '1.5,3,6,12,24,48').split(',').map(Number);
const STALL_S = Number(arg('--stall', 120));
const NO_RENDER = args.includes('--no-render');
const { chromium } = await import('playwright-core');
const THREE_DIR = path.join(ROOT, 'node_modules/three');
if (!fs.existsSync(path.join(THREE_DIR, 'build/three.module.js'))) throw new Error('needs three@0.161.0 in node_modules (npm i --no-save three@0.161.0 playwright-core)');

const PAGE = `<!doctype html><meta charset="utf-8"><title>budget</title>
<script type="importmap">{ "imports": { "three": "/node_modules/three/build/three.module.js", "three/addons/": "/node_modules/three/examples/jsm/" } }</script>
<canvas id="c" width="640" height="480"></canvas>
<script type="module">
import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
window.__run = async (N, render) => {
  const heap = () => (performance.memory ? performance.memory.usedJSHeapSize : null);
  const out = { N, steps: {}, heap: {}, limit: performance.memory ? performance.memory.jsHeapSizeLimit : null };
  let t = performance.now();
  /* build: 9N numbers pushed — a jittered sheet of triangles (the values are
     irrelevant to the cost; distinct so nothing is shared) */
  const positions = [];
  const side = Math.ceil(Math.sqrt(N / 2));
  for (let i = 0; i < N; i++) { const q = i >> 1, x = q % side, y = (q / side) | 0, o = i & 1; positions.push(x, y, 0, x + 1, y + o, 0, x + o, y + 1, 0); }
  out.steps.build = performance.now() - t; out.heap.build = heap();
  t = performance.now();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.steps.geo = performance.now() - t; out.heap.geo = heap();
  t = performance.now();
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
  const stl = new STLExporter().parse(mesh, { binary: true });
  const blob = new Blob([stl], { type: 'model/stl' });
  out.steps.stl = performance.now() - t; out.heap.stl = heap(); out.stlBytes = blob.size;
  if (render) {
    t = performance.now();
    const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c') });
    const sc = new THREE.Scene(); sc.add(mesh);
    const cam = new THREE.OrthographicCamera(0, side, side, 0, -1, 1);
    r.render(sc, cam);
    const gl = r.getContext(); const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    out.steps.render = performance.now() - t; out.heap.render = heap();
    r.dispose();
  }
  return out;
};
window.__ready = true;
</script>`;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (u === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGE); return; }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const browser = await chromium.launch({ executablePath: findChromium() || ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium'].find((f) => fs.existsSync(f)), args: ['--no-sandbox', '--enable-precise-memory-info'] });
const rows = [];
for (const M of LADDER) {
  const N = Math.round(M * 1e6);
  const page = await browser.newPage();
  let crashed = false;
  page.on('crash', () => { crashed = true; });
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => window.__ready);
  const t0 = Date.now();
  let row;
  try {
    row = await Promise.race([
      page.evaluate(([n, r]) => window.__run(n, r).catch((e) => ({ N: n, error: String(e && e.message || e) })), [N, !NO_RENDER]),
      new Promise((res) => setTimeout(() => res({ N, stalled: true }), STALL_S * 1000)),
    ]);
  } catch (e) { row = { N, error: String(e.message || e), crashed }; }
  row.wallS = (Date.now() - t0) / 1000;
  row.crashed = crashed || !!row.crashed;
  row.stlMB = +((84 + 50 * N) / 1e6).toFixed(1);
  rows.push(row);
  const st = row.steps || {};
  console.log(`N ${(N / 1e6).toFixed(1)} M: STL ${row.stlMB} MB | build ${st.build?.toFixed(0)} ms, geo ${st.geo?.toFixed(0)}, stl ${st.stl?.toFixed(0)}, render ${st.render?.toFixed(0)} | heap after stl ${row.heap?.stl ? (row.heap.stl / 1e6).toFixed(0) + ' MB' : '-'} of ${row.limit ? (row.limit / 1e6).toFixed(0) + ' MB' : '?'}${row.error ? ' | THREW: ' + row.error : ''}${row.stalled ? ` | STALLED past ${STALL_S} s` : ''}${row.crashed ? ' | RENDERER CRASHED' : ''}`);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ ladder: LADDER, stallS: STALL_S, rows }, null, 1));
  await page.close().catch(() => {});
  if (row.error || row.stalled || row.crashed) break;
}
await browser.close();
server.close();
console.log(`wrote ${OUT}`);
