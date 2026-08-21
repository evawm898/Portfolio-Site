/*
 * shot-flower.mjs — headless screenshot helper for the Flower Bloom generator.
 *
 * Dev-only. Reuses the same offline setup as verify-flower-export.mjs (serve the
 * repo, intercept the three CDN import -> node_modules/three, headless Chromium),
 * sets a chosen UI configuration, optionally dollies the camera in, and writes a
 * PNG of the canvas so a geometry change can be eyeballed without the browser.
 *
 * RUN:  node tools/shot-flower.mjs <out.png> [zoomTicks] [key=value ...]
 *   e.g. node tools/shot-flower.mjs /tmp/before.png 6 stemThickness=1.2 receptacleDepth=0.6
 * Any key=value pairs are applied as UI control values (id -> value) before the shot.
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_VERSION = '0.161.0';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

function findChromium() {
  if (process.env.CHROMIUM_EXECUTABLE && fs.existsSync(process.env.CHROMIUM_EXECUTABLE)) return process.env.CHROMIUM_EXECUTABLE;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const d of fs.readdirSync(base)) {
      if (!d.startsWith('chromium-')) continue;
      const p = path.join(base, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) return p;
    }
  } catch { /* fall through */ }
  return undefined;
}

const outPath = process.argv[2] || '/tmp/flower.png';
const zoomTicks = parseInt(process.argv[3] || '0', 10);
// Default config: a bloom on a receptacle + stem, so the receptacle/stem join is prominent.
const cfg = {
  receptacleType: 'blended', stemType: 'stem',
  stemThickness: '1.2', stemLength: '2.2', stemNodeCount: '2', receptacleDepth: '0.6',
  blendSmoothness: '0.5', convergenceTightness: '0.5',
};
for (const kv of process.argv.slice(4)) { const i = kv.indexOf('='); if (i > 0) cfg[kv.slice(0, i)] = kv.slice(i + 1); }

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
const ctx = await browser.newContext({ viewport: { width: 1100, height: 1100 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
  const fp = path.join(ROOT, 'node_modules/three', rel);
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(fp) }); }
  catch { route.abort(); }
});

await page.goto(`http://localhost:${port}/flower.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => { const el = document.getElementById('readout'); return el && /tris/.test(el.textContent); }, { timeout: 60000 });

// Apply the config. Selects need a 'change' event; ranges take 'input'.
for (const [id, value] of Object.entries(cfg)) {
  await page.evaluate(({ id, value }) => {
    const el = document.getElementById(id); if (!el) return;
    el.value = value;
    const evt = el.tagName === 'SELECT' ? 'change' : 'input';
    el.dispatchEvent(new Event(evt, { bubbles: true }));
  }, { id, value });
}
await page.waitForTimeout(500); // let the rebuild + camera refit settle

// Optional dolly-in: OrbitControls listens to wheel on the canvas (deltaY<0 zooms in).
for (let i = 0; i < zoomTicks; i++) {
  await page.evaluate(() => {
    const c = document.getElementById('flower-canvas');
    const r = c.getBoundingClientRect();
    c.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, clientX: r.left + r.width / 2, clientY: r.top + r.height * 0.42, bubbles: true }));
  });
  await page.waitForTimeout(60);
}
await page.waitForTimeout(300);

const readout = await page.evaluate(() => document.getElementById('readout')?.textContent || '');
await page.locator('#flower-canvas').screenshot({ path: outPath });

console.log('shot:', outPath);
console.log('readout:', readout.replace(/\s+/g, ' ').trim());
if (pageErrors.length) { const real = pageErrors.filter((e) => !/fonts\.googleapis/.test(e)); if (real.length) { console.log('PAGE ERRORS:'); real.forEach((e) => console.log('  ! ' + e)); } }

await browser.close();
server.close();
