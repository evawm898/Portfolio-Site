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
import { findChromium } from './chromium-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_VERSION = '0.161.0';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };


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

// PREVIEW MODE + STILL CAMERA, before anything is measured from this frame.
//
// Two defects this tool shipped with, both of which silently produce a frame that does not
// show what the caller asked for:
//
//   CHROME. #flower-canvas spans the whole page and the panel is drawn OVER it, so
//   `locator('#flower-canvas').screenshot()` does NOT crop the panel out — it composites it
//   in. Frames taken with this tool had the control panel across ~40% of the image. The
//   working agreements list "the visual audit measured a frame with the control panel drawn
//   over it" as one of the gates that measured the wrong thing; this was another instance.
//   `body.fl-preview` is the ONE owner of chrome-hiding (flower.css), already used by
//   gen-preset-thumbs.mjs and audit-hires.mjs — used here rather than a fourth copy of the
//   selector list, which would drift the way every duplicated derivation in this repo has.
//
//   AUTO-ROTATE. #autoRotate is `checked` in the markup, and this tool never turned it off,
//   so the camera angle was a function of elapsed wall-clock time. Any before/after pair
//   rendered by two runs of different duration differed by ROTATION, and a pixel diff over
//   such a pair measures the camera, not the geometry. This invalidated a relief contact
//   sheet before it was caught.
//
// Both are asserted below, not merely set: a harness that sets state without reading it back
// reports whatever it happens to compute.
await page.evaluate(() => {
  document.body.classList.add('fl-preview');
  const ar = document.getElementById('autoRotate');
  if (ar && ar.checked) { ar.checked = false; ar.dispatchEvent(new Event('change', { bubbles: true })); }
});
await page.waitForTimeout(120);
{
  const bad = await page.evaluate(() => {
    const out = [];
    const ar = document.getElementById('autoRotate');
    if (!ar) out.push('#autoRotate missing'); else if (ar.checked) out.push('autoRotate still on');
    for (const sel of ['.fl-panel', '.fl-viewpanel', '.fl-header', '.fl-rail', '.fl-panel__toggle', '.fl-hint']) {
      const el = document.querySelector(sel);
      if (el && getComputedStyle(el).display !== 'none') out.push(sel + ' still visible');
    }
    return out;
  });
  if (bad.length) {
    console.error('HARNESS INVALID: ' + bad.join('; '));
    await browser.close(); server.close(); process.exit(2);
  }
}

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
