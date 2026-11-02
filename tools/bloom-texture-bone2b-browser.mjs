#!/usr/bin/env node
/* ===================================================================
   bloom-texture-bone2b-browser.mjs — THE LIVE VIEW'S TWO BUILDS, TIMED IN
   THE BROWSER (BONE v2 round 2, ruling 4; docs/bloom-surface-texture-bone-v2.md
   §15). Not a gate; an instrument. Headless Chromium on this box.

   Ruling 4: dragging keeps the light preview; RELEASE builds COARSE pores
   (v1-weight); a "full detail" button and the export build the FULL pores. So
   per state, EXPORT (what the page shows; print preview is always on), the
   geometry build alone, each in a FRESH page (one build's heap is not the
   next one's):
     preview  the untextured build (the held-slider build, shipped module);
     v1       BONE v1 as shipped (today's release build);
     coarse   the v2 field on the shipped lattice (round 2's release build);
     full     the HYBRID (round 2's full-detail and export build).
   The page's own overheads (normals, upload, read-outs) are NOT included;
   docs/bloom-page-profile-outcome.md measures them.

     node tools/bloom-texture-bone2b-browser.mjs [--only default,umbel,mophead]
       [--modes preview,v1,coarse,full] [--timeout 1200] [--out <json>]
   =================================================================== */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChromium } from './chromium-harness.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = arg('--out', path.join(ROOT, 'docs/data/bloom-texture-bone-v2b-browser.json'));
const ONLY = arg('--only', 'default,umbel,mophead').split(',');
const MODES = arg('--modes', 'preview,v1,coarse,full').split(',');
const TIMEOUT_S = Number(arg('--timeout', 1200));
const { chromium } = await import('playwright-core');
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (u === '/__bench.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><meta charset="utf-8"><title>bench</title><body></body>'); return; }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const browser = await chromium.launch({ executablePath: findChromium() || ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium'].find((f) => fs.existsSync(f)), args: ['--no-sandbox', '--enable-precise-memory-info'] });
const STATES = {
  default: {},
  umbel: { inflorescence: 'UMBEL', umbelHead: 'ON', stemLength: 60 },
  mophead: { inflorescence: 'UMBEL', umbelDepth: '2', stemLength: 120, umbelFlorets: 12, floretPetals: 4, floretScale: 0.2, pedicelLength: 12, pedicelAngle: 20, petalTipShape: 2, petalCup: 0.2, petalTilt: 15 },
};
const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { box: 'headless Chromium (Playwright), software GL, this container; geometry build only, EXPORT, a fresh page per build', states: {} };
for (const name of ONLY) {
  out.states[name] = out.states[name] || {};
  for (const mode of MODES) {
    const page = await browser.newPage();
    let crashed = false;
    page.on('crash', () => { crashed = true; });
    page.on('pageerror', (e) => console.log('pageerror', e.message));
    await page.goto(`http://localhost:${port}/__bench.html`);
    const run = page.evaluate(async ({ o, mode }) => {
      const G = await import('/bloom-geometry.js');
      const { DEFAULTS } = await import('/bloom-registry.js');
      const B = await import('/bloom-texture-bone2.js');
      const heap = () => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null);
      const ship = (st) => { const acc = new G.MeshBuilder({ exportMode: true }); G.buildBloomInto(acc, st, { below: null }); return acc.triangleCount; };
      /* one warm-up of the SAME build (the JIT), then the timed one */
      const once = async () => {
        if (mode === 'preview') return ship({ ...DEFAULTS, ...o });
        if (mode === 'v1') return ship({ ...DEFAULTS, ...o, petalTexture: 'BONE' });
        const r = await B.bone2Bloom(B.bone2State(DEFAULTS, o), { mode: mode === 'coarse' ? 'coarse' : 'hybrid' });
        return r.acc.triangleCount;
      };
      const warm = mode === 'full' ? null : await once();
      const t0 = performance.now();
      const tris = await once();
      return { ms: Math.round(performance.now() - t0), tris, heapMB: heap(), warmed: warm !== null };
    }, { o: STATES[name], mode }).catch((e) => ({ error: String(e.message || e) }));
    const r = await Promise.race([run, new Promise((res) => setTimeout(() => res({ stalled: TIMEOUT_S }), TIMEOUT_S * 1000))]);
    if (crashed) r.crashed = true;
    out.states[name][mode] = r;
    console.log(`${name} ${mode}: ${JSON.stringify(r)}`);
    fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
    await page.close().catch(() => {});
  }
}
await browser.close(); server.close();
console.log(`wrote ${OUT}`);
