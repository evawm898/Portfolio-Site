/*
 * shot-panel-chrome.mjs — before/after evidence for the PANEL CHROME: the frame around
 * the flower, not the flower. Shoots the whole viewport (canvas included) at two
 * viewports x the chrome states, so a chrome change is compared against the same frames.
 *
 * WHY THE FULL VIEWPORT, AND WHY THE CANVAS IS NOT HIDDEN: the sibling tool
 * shot-panel-matrix.mjs hides the canvas and crops to `.fl-panel`, because its subject is
 * conditional control visibility and the 3D frame is renderer noise. Here the subject IS
 * the frame — where the panel's edge falls, whether a scrollbar shows, whether the tick
 * rail lines up, what remains when the panel is collapsed. Cropping to the panel would cut
 * away every one of those. The bloom is set to a fixed preset-free default and the shot is
 * taken after the build settles, so the canvas is stable enough to diff by eye.
 *
 * `--hide-scrollbars` is deliberately NOT passed to Chromium: the panel's scrollbar is one
 * of the things under test, and the matrix tool's flag is exactly why that tool cannot see
 * it.
 *
 * STATES (a state absent from the page — e.g. the collapse control on a `main` checkout —
 * is skipped with a note rather than failing, so the same tool takes the BEFORE shots):
 *   expanded    — panel open, first section closed (the load state)
 *   section     — a section opened, so the tick rail shows its current-section highlight
 *   collapsed   — panel collapsed to nothing
 *
 * RUN:  node tools/shot-panel-chrome.mjs <outDir>
 */
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { findChromium } from './chromium-harness.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const THREE_VERSION = '0.161.0';
const OUT = process.argv[2];
if (!OUT) { console.error('usage: node tools/shot-panel-chrome.mjs <outDir>'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css',
               '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/flower.html';
  fs.readFile(path.join(ROOT, p), (e, d) => {
    if (e) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--no-sandbox', '--use-gl=swiftshader', '--force-device-scale-factor=1'] });

// Wide desktop, and a SHORT one — a full-height flush-right panel behaves differently when
// the window is short, and the tick rail has to fit in whatever height is left.
const VIEWPORTS = [
  { label: 'wide',  width: 1400, height: 900 },
  { label: 'short', width: 1100, height: 520 },
  { label: 'narrow', width: 560, height: 760 },   // below the 640px bottom-sheet breakpoint
];

const shots = [];
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.route('**cdn.jsdelivr.net/**', (rt) => {
    const rel = new URL(rt.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
    try { rt.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
    catch { rt.abort(); }
  });
  await page.goto(`http://127.0.0.1:${port}/flower.html`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => { const e = document.getElementById('readout'); return e && /tris/.test(e.textContent); }, { timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('autoRotate'); if (t && t.checked) { t.checked = false; t.dispatchEvent(new Event('change', { bubbles: true })); } });
  await page.waitForTimeout(400);

  const shot = async (name) => {
    const fp = path.join(OUT, `${vp.label}--${name}.png`);
    await page.screenshot({ path: fp });
    shots.push(`${vp.label}--${name}.png`);
  };

  await shot('expanded');

  // Open a section so the rail (if present) shows its current-section highlight.
  const opened = await page.evaluate(() => {
    const h = document.querySelector('.fl-acc__head[aria-controls="acc-edge"]');
    if (!h) return false;
    if (h.getAttribute('aria-expanded') !== 'true') h.click();
    return true;
  });
  await page.waitForTimeout(350);
  if (opened) await shot('section-open'); else console.log(`${vp.label}: no acc-edge head — skipped section-open`);

  // Collapse the panel, if this checkout has a collapse control.
  const canCollapse = await page.evaluate(() => {
    const b = document.getElementById('panelToggle');
    if (!b) return false;
    if (b.getAttribute('aria-expanded') !== 'false') b.click();
    return true;
  });
  await page.waitForTimeout(350);
  if (canCollapse) await shot('collapsed'); else console.log(`${vp.label}: no #panelToggle — skipped collapsed (expected on a pre-change checkout)`);

  await ctx.close();
}
await browser.close(); server.close();
console.log(`${shots.length} chrome shots -> ${OUT}\n  ${shots.join('\n  ')}`);
