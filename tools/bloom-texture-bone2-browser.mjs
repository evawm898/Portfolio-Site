#!/usr/bin/env node
/* ===================================================================
   bloom-texture-bone2-browser.mjs — HOW LONG A BONE v2 BUILD TAKES IN THE
   BROWSER (Chromium, headless, this box). Not a gate; an instrument.

   The page's own drag discipline (`dragLight`, bloom.js) is the frame: while a
   slider is HELD the build drops the texture (DRAG_LIGHT_OVERRIDE), so the
   LIGHT PREVIEW is an untextured build; on RELEASE the full relief is built.
   So per state it times, in Chromium, the geometry build (buildBloomInto, the
   whole bloom, EXPORT — the mode the page shows, print preview being always
   on — and LIVE for the default):
     preview  the untextured build (the shipped module);
     v1       BONE v1 as shipped (the shipped module);
     v2 lat.  the v2 field on the shipped lattice (the prototype's patched copy,
              no refinement — what the field alone costs);
     v2 grid  the v2 field, refined at 0.1 mm (the default only; it is 2.86 M
              triangles there);
     v2 rings ESTIMATED: the v2-lattice build plus the porous area x the
              rings' measured browser cost per mm2 on the plate (the rings run on
              charted patches only, the doc's §6).
   The page's own overheads (the normals, the upload, the read-outs) are NOT in
   these figures; docs/bloom-page-profile-outcome.md measures them (<= 10 ms for
   the read-outs; the frame is software GL here).

     node tools/bloom-texture-bone2-browser.mjs [--out <json>] [--only default,umbel,mophead]
   =================================================================== */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChromium } from './chromium-harness.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = arg('--out', path.join(ROOT, 'docs/data/bloom-texture-bone-v2-browser.json'));
const ONLY = arg('--only', 'default,umbel,mophead').split(',');
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
const browser = await chromium.launch({ executablePath: findChromium() || ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium'].find((f) => fs.existsSync(f)), args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(`http://localhost:${port}/__bench.html`);
const STATES = {
  default: {},
  umbel: { inflorescence: 'UMBEL', umbelHead: 'ON', stemLength: 60 },
  mophead: { inflorescence: 'UMBEL', umbelDepth: '2', stemLength: 120, umbelFlorets: 12, floretPetals: 4, floretScale: 0.2, pedicelLength: 12, pedicelAngle: 20, petalTipShape: 2, petalCup: 0.2, petalTilt: 15 },
};
const out = { box: 'headless Chromium (Playwright), software GL, this container', states: {} };
/* the rings' browser cost per mm2, on the plate (both packings) */
out.ringsMsPerMm2 = await page.evaluate(async () => {
  const B = await import('/bloom-texture-bone2.js');
  const PL = await import('/tools/bloom-texture-bone2-plate.mjs');
  const res = {};
  for (const packing of ['overlap', 'hardcore']) {
    const params = { ...B.bone2Params({}), packing };
    const field = B.bone2Field(params);
    const win = { x0: 10, x1: 20, y0: -5, y1: 5 };
    PL.meshPatch('rings', PL.plateDomain(), field, params, win);   // warm
    const M = PL.meshPatch('rings', PL.plateDomain(), B.bone2Field(params), params, win);
    res[packing] = M.msPerMm2;
  }
  return res;
});
console.log('rings ms/mm2 in the browser', out.ringsMsPerMm2);
for (const name of ONLY) {
  const o = STATES[name];
  const r = await page.evaluate(async ({ o, name, rings }) => {
    const G = await import('/bloom-geometry.js');
    const { DEFAULTS } = await import('/bloom-registry.js');
    const B = await import('/bloom-texture-bone2.js');
    const time = (fn) => { const t0 = performance.now(); const v = fn(); return { ms: performance.now() - t0, v }; };
    const ship = (st, ex) => { const acc = new G.MeshBuilder({ exportMode: ex }); G.buildBloomInto(acc, st, { below: null }); return acc.triangleCount; };
    const row = {};
    for (const ex of name === 'default' ? [true, false] : [true]) {
      const mode = ex ? 'export' : 'live';
      ship({ ...DEFAULTS, ...o }, ex);   // warm the JIT
      const p = time(() => ship({ ...DEFAULTS, ...o }, ex));
      const v1 = time(() => ship({ ...DEFAULTS, ...o, petalTexture: 'BONE' }, ex));
      const t0 = performance.now(); const lat = await B.bone2Bloom(B.bone2State(DEFAULTS, o), { mode: 'lattice', exportMode: ex }); const latMs = performance.now() - t0;
      const c = await B.bone2Bloom(B.bone2State(DEFAULTS, o), { mode: 'count', exportMode: ex });
      let porous = 0; for (const v of Object.values(c.stats.organs || {})) porous += v.porousAreaMm2;
      row[mode] = { previewMs: Math.round(p.ms), previewTris: p.v, v1Ms: Math.round(v1.ms), v1Tris: v1.v, v2LatticeMs: Math.round(latMs), v2LatticeTris: lat.acc.triangleCount, porousAreaMm2: Math.round(porous), v2RingsEstMs: { overlap: Math.round(latMs + porous * rings.overlap), hardcore: Math.round(latMs + porous * rings.hardcore) } };
      if (name === 'default') { const t1 = performance.now(); const g = await B.bone2Bloom(B.bone2State(DEFAULTS, o), { mode: 'grid', edgeMm: 0.1, exportMode: ex }); row[mode].v2Grid01Ms = Math.round(performance.now() - t1); row[mode].v2Grid01Tris = g.acc.triangleCount; }
    }
    return row;
  }, { o, name, rings: out.ringsMsPerMm2 });
  out.states[name] = r;
  console.log(name, JSON.stringify(r));
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
}
await browser.close(); server.close();
console.log(`wrote ${OUT}`);
