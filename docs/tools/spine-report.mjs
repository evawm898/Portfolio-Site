/*
 * spine-report.mjs — export-level evidence for a junction law: watertightness, triangle
 * counts, STL bytes, and DETERMINISM (the same tree exported twice must agree byte for
 * byte — "run the same tree twice" is a working agreement, not an optimisation).
 *
 * Dev-only, change-report artifact in the diff-export-bytes.mjs family (same serve /
 * read-back / export mechanics), pointed at ONE law over the junction-relevant configs:
 * the shipped default bare + stemmed, and every preset. Each config is exported TWICE,
 * each time on a fresh page (#92/#100), and the two SHA-256s are compared; a mismatch
 * fails the run — nondeterminism in a construction that claims to be deterministic is a
 * finding, not noise. Boundary edges must be 0 on every export (the hard invariant).
 *
 * RUN:  node docs/tools/spine-report.mjs [--law spine]
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findChromium } from '../../tools/chromium-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const THREE_VERSION = '0.161.0';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const lawIdx = process.argv.indexOf('--law');
const LAW = lawIdx >= 0 ? process.argv[lawIdx + 1] : 'spine';

// boundary-edge census, same quantisation as diff-export-bytes.mjs
function analyzeStl(buf) {
  const tris = buf.readUInt32LE(80);
  const edges = new Map();
  const q = (x) => Math.round(x * 1e4) / 1e4;
  const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  let off = 84;
  for (let i = 0; i < tris; i++) {
    off += 12;
    const v = [];
    for (let k = 0; k < 3; k++) { v.push(q(buf.readFloatLE(off)) + ',' + q(buf.readFloatLE(off + 4)) + ',' + q(buf.readFloatLE(off + 8))); off += 12; }
    off += 2;
    for (let k = 0; k < 3; k++) { const e = key(v[k], v[(k + 1) % 3]); edges.set(e, (edges.get(e) || 0) + 1); }
  }
  let boundary = 0;
  for (const c of edges.values()) if (c === 1) boundary++;
  return { tris, boundary };
}

const { PRESETS } = await import(pathToFileURL(path.join(ROOT, 'flower-presets.js')).href);
const CONFIGS = [
  { label: 'DEFAULT bare', set: {} },
  { label: 'DEFAULT + stem', set: { stemType: 'stem' } },
  ...PRESETS.map((p) => ({ label: `preset: ${p.name}`, presetSlug: p.slug, set: {} })),
];

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/flower.html';
  fs.readFile(path.join(ROOT, p), (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });

async function settle(page) {
  await page.waitForTimeout(150);
  await page.waitForFunction(() => { const b = document.getElementById('building'); return !b || !b.classList.contains('is-on'); }, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(200);
}

async function exportOnce(cfg) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await page.route('**cdn.jsdelivr.net/**', (route) => {
    const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
    try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
    catch { route.abort(); }
  });
  let out = null;
  try {
    await page.goto(`http://localhost:${port}/flower.html?junctionProbe=1&junctionLaw=${LAW}`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => { const el = document.getElementById('readout'); return el && /tris/.test(el.textContent); }, { timeout: 60000 });
    await page.evaluate(() => {
      const t = document.getElementById('advancedToggle'); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); }
      const h = document.querySelector('.fl-acc__head[aria-controls="acc-make"]');
      if (h && h.getAttribute('aria-expanded') !== 'true') h.click();
    });
    if (cfg.presetSlug) {
      const ok = await page.evaluate((slug) => { const c = document.querySelector(`#presetRow .fl-preset[data-slug="${slug}"]`); if (!c) return false; c.click(); return true; }, cfg.presetSlug);
      if (!ok) throw new Error('preset cell not found');
      await settle(page);
      const pre = PRESETS.find((q) => q.slug === cfg.presetSlug);
      const st = await page.evaluate(() => window.__flowerUIState());
      for (const [id, v] of Object.entries(pre.ui || {})) {
        if (!(id in st)) continue;
        const a = st[id], num = isFinite(Number(v)) && isFinite(Number(a)) && String(v) !== '' && String(a) !== '';
        if (!(num ? Math.abs(Number(v) - Number(a)) < 1e-9 : String(v) === String(a))) throw new Error(`read-back: ${id} wanted "${v}", app has "${a}"`);
      }
    }
    for (const [id, v] of Object.entries(cfg.set)) {
      await page.evaluate(({ id, v }) => {
        const el = document.getElementById(id); if (!el) return;
        el.value = String(v); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
      }, { id, v });
    }
    await settle(page);
    const st2 = await page.evaluate(() => window.__flowerUIState());
    for (const [id, v] of Object.entries(cfg.set)) {
      const a = st2[id], num = isFinite(Number(v)) && isFinite(Number(a));
      if (!(num ? Math.abs(Number(v) - Number(a)) < 1e-9 : String(v) === String(a))) throw new Error(`read-back: ${id} wanted "${v}", app has "${a}"`);
    }
    const liveTris = await page.evaluate(() => (/([\d,]+)\s*tris/.exec(document.getElementById('readout').textContent) || [])[1]);
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 180000 }).catch(() => null),
      page.click('#exportStl'),
    ]);
    if (!dl) throw new Error('no STL download');
    const buf = fs.readFileSync(await dl.path());
    const jf = await page.evaluate(() => window.__junctionField && { tris: window.__junctionField.stats.tris, exportMode: window.__junctionField.exportMode, minCapR: window.__junctionField.stats.minCapR, law: window.__junctionField.meta.approachLaw });
    if (!jf || jf.law !== LAW) throw new Error(`junction field law "${jf && jf.law}", asked "${LAW}"`);
    out = { sha: crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16), bytes: buf.length,
            liveTris: Number(String(liveTris).replace(/,/g, '')), junctionTrisExport: jf.tris, minCapR: jf.minCapR, ...analyzeStl(buf) };
  } finally { await ctx.close(); }
  return out;
}

console.log(`spine-report — law "${LAW}", each config exported twice on fresh pages\n`);
console.log('  ' + 'config'.padEnd(22) + 'sha (run1==run2?)'.padStart(20) + 'bytes'.padStart(10) + 'STL tris'.padStart(10) + 'boundary'.padStart(9) + 'live tris'.padStart(10) + 'jct tris(exp)'.padStart(14) + 'minCapR'.padStart(9));
let bad = 0;
for (const cfg of CONFIGS) {
  try {
    const r1 = await exportOnce(cfg);
    const r2 = await exportOnce(cfg);
    const same = r1.sha === r2.sha;
    const ok = same && r1.boundary === 0;
    if (!ok) bad++;
    console.log('  ' + cfg.label.padEnd(22) + `${r1.sha} ${same ? '==' : '!= ' + r2.sha}`.padStart(20)
      + String(r1.bytes).padStart(10) + String(r1.tris).padStart(10) + String(r1.boundary).padStart(9)
      + String(r1.liveTris).padStart(10) + String(r1.junctionTrisExport).padStart(14) + r1.minCapR.toFixed(4).padStart(9)
      + (ok ? '' : same ? '   BOUNDARY != 0' : '   NONDETERMINISTIC'));
  } catch (e) { bad++; console.log('  ' + cfg.label.padEnd(22) + '  ERROR ' + e.message); }
}
await browser.close();
server.close();
if (bad) { console.log(`\n${bad} config(s) failed.`); process.exit(1); }
console.log('\nAll configs: byte-deterministic across two runs, 0 boundary edges.');
