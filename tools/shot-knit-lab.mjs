// tools/shot-knit-lab.mjs — screenshots of /knit-lab.html: plain and eyelet swatches settled, both
// mid-pull (at +20%) and after the load-unload test, and the load-unload plot with both, with the
// page's own timings. Usage: node tools/shot-knit-lab.mjs <out-dir> [#HASH=overrides]
// Serves the repo itself; Google Fonts are aborted (the page falls back to its font stack).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.resolve(process.argv[2] || 'knit-lab-shots');
const HASH = process.argv[3] || '';
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const port = server.address().port;

const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${port}/knit-lab.html${HASH}`);
const stage = page.locator('.kl__grid');
await page.waitForFunction(() => window.__knitLab && window.__knitLab.state);
await page.evaluate(() => document.querySelector('.kl').scrollIntoView());
const out = { errors };
const MID = 0.2;
for (const sw of ['plain', 'eyelet']) {
  if (sw !== 'plain') { await page.click(`[data-swatch="${sw}"]`); await page.waitForFunction(s => window.__knitLab.init && window.__knitLab.init.swatch === s && window.__knitLab.state, sw); }
  const t0 = Date.now();
  await page.waitForFunction(() => window.__knitLab.state.phase !== 'settling', null, { timeout: 900000, polling: 500 });
  await page.waitForTimeout(600);
  await stage.screenshot({ path: path.join(OUT, `${sw}-1-settled.png`) });
  const settle = await page.evaluate(() => { const k = window.__knitLab, s = k.state; return { frames: s.settledAt.frames, wallMs: s.settleWallMs, msPerSubstep: s.timing.msPerSubstep, n: k.init.n, worstDeep: s.worstDeep }; });
  await page.click('#klTest');
  await page.waitForFunction(m => window.__knitLab.state.phase === 'pulling' && window.__knitLab.state.extension > m, MID, { timeout: 900000, polling: 100 });
  await page.evaluate(() => window.__knitLab.send({ type: 'pause', value: true }));
  await page.waitForTimeout(500);
  const mid = await page.evaluate(() => window.__knitLab.state.extension);
  await stage.screenshot({ path: path.join(OUT, `${sw}-2-mid-pull.png`) });
  await page.evaluate(() => window.__knitLab.send({ type: 'pause', value: false }));
  await page.waitForFunction(() => window.__knitLab.state.phase === 'done', null, { timeout: 900000, polling: 500 });
  await page.waitForTimeout(600);
  await stage.screenshot({ path: path.join(OUT, `${sw}-3-done.png`) });
  const res = await page.evaluate(s => { const r = window.__knitLab.results[s]; return { jam: r.jam.ext, lossFraction: r.cycle.lossFraction, set: r.cycle.set, loadEnd: r.loadEnd, peak: r.peak, rows: r.rows.length }; }, sw);
  out[sw] = { settle, midPullExtension: mid, result: res, wallMs: Date.now() - t0 };
}
await page.locator('#klChart').screenshot({ path: path.join(OUT, 'load-unload-plot.png') });
await page.locator('.kl__panel').screenshot({ path: path.join(OUT, 'panel.png') });
console.log(JSON.stringify(out, null, 1));
await browser.close(); server.close();
