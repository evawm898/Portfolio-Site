// tools/shot-knit-lab.mjs — screenshots of /knit-lab.html: start, settled, mid-pull, end of pull,
// with the page's own timings. Usage: node tools/shot-knit-lab.mjs <out-dir> [#HASH=overrides]
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
const errors = []; page.on('pageerror', e => errors.push(String(e)));
await page.goto(`http://localhost:${port}/knit-lab.html${HASH}`);
const stage = page.locator('.kl__grid');
await page.waitForFunction(() => window.__knitLab && window.__knitLab.sim);
await page.evaluate(() => document.querySelector('.kl').scrollIntoView());
await page.waitForTimeout(150);
await stage.screenshot({ path: path.join(OUT, '1-start.png') });
const t0 = Date.now();
await page.waitForFunction(() => window.__knitLab.sim.phase !== 'settling', null, { timeout: 600000, polling: 500 });
const settle = await page.evaluate(() => { const s = window.__knitLab.sim; return { ...s.settledAt, wallMs: window.__knitLab.settleWallMs, msPerStep: s.timing.totalMs / s.timing.steps, n: s.n, worstDeep: window.__knitLab.worstDeep }; });
await page.waitForTimeout(400);
await stage.screenshot({ path: path.join(OUT, '2-settled.png') });
await page.click('#klPull');
await page.waitForFunction(() => window.__knitLab.sim.extension() > 0.2, null, { timeout: 600000, polling: 200 });
await stage.screenshot({ path: path.join(OUT, '3-mid-pull.png') });
await page.waitForFunction(() => { const s = window.__knitLab.sim; return s.strainStopped || s.pullOffset >= s.pullTarget; }, null, { timeout: 600000, polling: 500 });
await page.waitForTimeout(500);
await stage.screenshot({ path: path.join(OUT, '4-end-of-pull.png') });
const end = await page.evaluate(() => { const s = window.__knitLab.sim; return { msPerStep: s.timing.totalMs / s.timing.steps, frameMs: s.timing.frameMs, drawMs: window.__knitLab.drawMs, worstDeep: window.__knitLab.worstDeep, logLen: window.__knitLab.log.length, extension: s.extension(), strainStopped: s.strainStopped }; });
// frame rate while pulling: animation frames per second of wall time, measured over 3 s after a restart of the pull is not possible, so measure idle-held frames
const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
end.fpsHeld = fps;
console.log(JSON.stringify({ settle, end, wallTotal: Date.now() - t0, errors }, null, 1));
await browser.close(); server.close();
