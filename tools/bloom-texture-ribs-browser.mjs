#!/usr/bin/env node
/* ===================================================================
   bloom-texture-ribs-browser.mjs — RIBS IN CHROMIUM: build time and engine
   agreement (docs/bloom-surface-texture-ribs.md §5).

     node tools/bloom-texture-ribs-browser.mjs [--states default,umbel,mophead]
          [--out docs/data/bloom-texture-ribs.json] [--resume]

   Per state x law x mode (lattice = the release build: the field on the
   shipped 0.4 mm lattice; crest = the export build: crest lines as edges),
   a FRESH Chromium page builds the RIBS prototype from its own module copy,
   EXPORT mode, and reports its seconds, its JS heap at the end (CDP), its
   triangle count and an FNV-1a hash of its float32s; Node builds the same
   and the two are compared (count + hash = AGREE). Node seconds beside them.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = arg('--out', path.join(ROOT, 'docs/data/bloom-texture-ribs.json'));
const data = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const save = () => fs.writeFileSync(OUT, JSON.stringify(data, null, 1));
const { STATES } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-texture-ribs-measure.mjs')).href);
const R = await import(pathToFileURL(path.join(ROOT, 'bloom-texture-ribs.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { chromium } = await import('playwright-core');
const fnv = (P) => { let h = 0x811c9dc5; const b = new Uint8Array(new Float32Array(P).buffer); for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
const srv = http.createServer((req, res) => { if (req.url === '/__ribs-blank') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>ribs</title>'); return; } const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': 'text/javascript' }); fs.createReadStream(f).pipe(res); });
await new Promise((ok) => srv.listen(0, ok));
const port = srv.address().port;
const exe = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const rows = data.browser || [];
const GEO = await R.ribsGeometry();
try {
  for (const key of arg('--states', 'default,umbel,mophead').split(',')) for (const law of ['A', 'B']) for (const mode of ['lattice', 'crest']) {
    if (args.includes('--resume') && rows.find((x) => x.key === key && x.law === law && x.mode === mode)) continue;
    const extra = { ...STATES[key], ribLaw: law };
    const nb = await R.ribsBuild(DEFAULTS, extra, { mode, GEO });
    const node = { tris: nb.acc.triangleCount, hash: fnv(nb.acc.positions), s: +(nb.ms / 1000).toFixed(2) };
    nb.acc.positions = null;
    const browser = await chromium.launch(exe ? { executablePath: exe, args: ['--js-flags=--max-old-space-size=12000'] } : {});
    let chromium_ = null;
    try {
      const page = await browser.newPage();
      await page.goto(`http://localhost:${port}/__ribs-blank`);
      const cdp = await page.context().newCDPSession(page);
      chromium_ = await page.evaluate(async ({ extra, mode }) => {
        const R = await import('/bloom-texture-ribs.js');
        const { DEFAULTS } = await import('/bloom-registry.js');
        await R.ribsGeometry();
        const t0 = performance.now();
        const b = await R.ribsBuild(DEFAULTS, extra, { mode });
        const s = (performance.now() - t0) / 1000;
        let h = 0x811c9dc5; const u8 = new Uint8Array(new Float32Array(b.acc.positions).buffer); for (let i = 0; i < u8.length; i++) { h ^= u8[i]; h = Math.imul(h, 0x01000193) >>> 0; }
        window.__keep = b;
        return { tris: b.acc.triangleCount, hash: h.toString(16), s: +s.toFixed(2) };
      }, { extra, mode }).catch((e) => ({ error: String(e).slice(0, 160) }));
      const hu = await cdp.send('Runtime.getHeapUsage').catch(() => null);
      if (hu && chromium_ && !chromium_.error) chromium_.heapEndGB = +(hu.usedSize / 1e9).toFixed(2);
    } finally { await browser.close(); }
    const row = { key, law, mode, node, chromium: chromium_, agree: !!(chromium_ && !chromium_.error && chromium_.tris === node.tris && chromium_.hash === node.hash) };
    const at = rows.findIndex((x) => x.key === key && x.law === law && x.mode === mode); if (at >= 0) rows[at] = row; else rows.push(row);
    data.browser = rows; save();
    console.log(`${key} ${law} ${mode}: node ${node.tris} ${node.s} s | chromium ${chromium_.error ? 'ERROR ' + chromium_.error : `${chromium_.tris} ${chromium_.s} s heap ${chromium_.heapEndGB} GB`} ${row.agree ? 'AGREE' : 'DIFFER'}`);
  }
} finally { srv.close(); }
