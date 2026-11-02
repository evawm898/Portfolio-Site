#!/usr/bin/env node
/* ===================================================================
   bloom-texture-bone-v2-browser.mjs — ENGINE AGREEMENT, TIME AND HEAP for
   the shipped BONE v2 (docs/bloom-surface-texture-bone-v2-shipped.md).

     node tools/bloom-texture-bone-v2-browser.mjs [--states default,umbel,mophead]
          [--detail full|coarse|both] [--out docs/data/bloom-texture-bone-v2-browser.json]

   Each state is built in NODE and in CHROMIUM (the page's own
   `bloom-geometry.js`, served over HTTP and imported in the page — the very
   module `bloom.html` runs), in EXPORT mode at the asked detail, and compared:
   the triangle count and an FNV-1a hash over every float32 of the positions
   (the bytes an STL carries). AGREE is both equal. Beside it: each engine's
   build time, and Chromium's JS heap IN USE AT THE END OF THE BUILD with the
   result still held (`performance.memory.usedJSHeapSize`, precise memory info
   on) — the build is synchronous, so nothing can sample the page DURING it;
   this is a floor on the peak, said so, never called the peak.

   Needs a Chromium (`/opt/pw-browsers/chromium` here; PW_CHROMIUM overrides)
   and playwright-core: `npm i --no-save three@0.161.0 playwright-core`.
   =================================================================== */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import('playwright-core');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { STATES } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-texture-bone-v2-measure.mjs')).href);
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const want = arg('--states', 'default,umbel,mophead').split(',');
const details = arg('--detail', 'both') === 'both' ? ['coarse', 'full'] : [arg('--detail', 'full')];
const OUT = arg('--out', path.join(ROOT, 'docs/data/bloom-texture-bone-v2-browser.json'));
const hashF32 = (P) => { const f = new Float32Array(P.length); for (let i = 0; i < P.length; i++) f[i] = P[i]; const u = new Uint32Array(f.buffer); let h = 2166136261 >>> 0; for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
const srv = http.createServer((q, r) => {
  if (q.url === '/__blank') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end('<!doctype html><title>bone v2</title>'); }
  const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': p.endsWith('.js') || p.endsWith('.mjs') ? 'text/javascript' : 'text/html' }); r.end(fs.readFileSync(p));
}).listen(0);
const port = srv.address().port;
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--js-flags=--max-old-space-size=8000', '--enable-precise-memory-info'] });
const data = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { rows: [] };
for (const [key, name, extra] of STATES) {
  if (!want.includes(key)) continue;
  for (const detail of details) {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/__blank`, { waitUntil: 'load' });
    const st = { ...DEFAULTS, petalTexture: 'BONE', ...extra };
    const t0 = performance.now();
    const acc = new G.MeshBuilder({ exportMode: true, boneDetail: detail });
    const rec = G.buildBloomInto(acc, st, { below: null, capability: null, scopes: null });
    const nodeMs = performance.now() - t0, nodeN = acc.triangleCount, nodeH = hashF32(acc.positions);
    const F = rec.texture && rec.texture.bone && rec.texture.bone.full;
    let b;
    try {
      b = await page.evaluate(async ({ port, st, detail }) => {
        const G = await import(`http://localhost:${port}/bloom-geometry.js`);
        const h0 = performance.memory ? performance.memory.usedJSHeapSize : null;
        const t0 = performance.now(); const acc = new G.MeshBuilder({ exportMode: true, boneDetail: detail }); G.buildBloomInto(acc, st, { below: null, capability: null, scopes: null }); const ms = performance.now() - t0;
        const h1 = performance.memory ? performance.memory.usedJSHeapSize : null;
        const P = acc.positions; const f = new Float32Array(P.length); for (let i = 0; i < P.length; i++) f[i] = P[i]; const u = new Uint32Array(f.buffer); let h = 2166136261 >>> 0; for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 16777619) >>> 0; }
        return { n: acc.triangleCount, h: h.toString(16), ms, heapBeforeGB: h0 && h0 / 1e9, heapAfterGB: h1 && h1 / 1e9 };
      }, { port, st, detail });
    } catch (e) { b = { error: String(e && e.message || e).slice(0, 200) }; }
    await page.close();
    const row = { key, name, detail, node: { tris: nodeN, hash: nodeH, s: +(nodeMs / 1000).toFixed(1), share: F ? +F.fullShare.toFixed(3) : null },
      chromium: b.error ? { error: b.error } : { tris: b.n, hash: b.h, s: +(b.ms / 1000).toFixed(1), heapEndGB: b.heapAfterGB && +b.heapAfterGB.toFixed(2) },
      agree: !b.error && nodeN === b.n && nodeH === b.h };
    data.rows = (data.rows || []).filter((q) => !(q.key === key && q.detail === detail)).concat([row]);
    fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(data, null, 1));
    console.log(JSON.stringify(row));
  }
}
await browser.close(); srv.close();
