/*
 * shot-shape-picker.mjs — contact sheet of the FORM section in Advanced, once per option
 * the Standard petal-shape picker offers, plus the CUSTOM state reached by hand-editing.
 *
 * WHY ITS OWN TOOL RATHER THAN MORE MATRIX ROWS: `petalShape` drives no predicate — it is a
 * macro that writes SHAPE_PARAMS through applyShape(), and the panel reacts to those params,
 * not to the picker. tools/visibility-matrix.mjs exists to drive PREDICATES to both
 * polarities, so adding five rows there for a control that gates nothing would bloat every
 * consumer of that matrix to answer a question about one section. This shoots the question
 * directly: pick each shape the way a visitor does, photograph what the Form section then
 * offers.
 *
 * WHAT IT IS FOR: the shape family (claw and cleft sliders) is gated on its enabling
 * parameter, so choosing CLAWED or LOBED is what reveals the rest of that family. That claim
 * is asserted as data by tools/dump-visibility.mjs; this is the eyes-decide companion — the
 * flower-project rule is that the metric screens and eyes decide, and "the lobe sliders
 * appear when you pick LOBED" is a claim about a panel someone looks at.
 *
 * The 3D canvas is hidden before shooting: it is not deterministic frame to frame and this
 * measures the PANEL. Dev-only, not a CI gate.
 *
 * RUN:  node tools/shot-shape-picker.mjs <outDir>
 *       diff <before>/MANIFEST.txt <after>/MANIFEST.txt
 */
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { findChromium } from './chromium-harness.mjs';
import { PICKER_SHAPE_NAMES } from '../flower-shapes.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_VERSION = '0.161.0';
const OUT = process.argv[2];
if (!OUT) { console.error('usage: node tools/shot-shape-picker.mjs <outDir>'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/flower.html';
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox', '--use-gl=swiftshader', '--force-device-scale-factor=1', '--hide-scrollbars'] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1400 }, deviceScaleFactor: 1 })).newPage();
await page.route('**cdn.jsdelivr.net/**', (rt) => {
  const rel = new URL(rt.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
  try { rt.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); } catch { rt.abort(); }
});
await page.goto(`http://127.0.0.1:${port}/flower.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => { const e = document.getElementById('readout'); return e && /tris/.test(e.textContent); }, { timeout: 60000 });
await page.addStyleTag({ content: 'canvas{visibility:hidden !important}' });

// Advanced, because that is the tier where the shape family lives.
await page.evaluate(() => {
  const t = document.getElementById('advancedToggle');
  if (!t.checked) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); }
});
await page.waitForTimeout(200);

// The accordion sections start collapsed, so the Form body is not laid out until its head is
// clicked. Open it the way a visitor does rather than forcing styles — a section forced open
// by CSS is not the section the visitor sees.
await page.evaluate(() => {
  const head = document.querySelector('.fl-acc__head[aria-controls="acc-form"]');
  if (head && head.getAttribute('aria-expanded') !== 'true') head.click();
});
await page.waitForTimeout(250);
if (await page.evaluate(() => { const h = document.querySelector('.fl-acc__head[aria-controls="acc-form"]'); return !h || h.getAttribute('aria-expanded') !== 'true'; })) {
  console.error('FAIL: could not open the Form accordion section'); await browser.close(); server.close(); process.exit(1);
}

const pickShape = async (name) => {
  const got = await page.evaluate((n) => {
    const el = document.getElementById('petalShape');
    el.value = n; el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  }, name);
  await page.waitForTimeout(220);
  return got;
};

const manifest = [];
const shoot = async (label, note) => {
  // Which Form controls are visible right now — recorded beside the image, so the sheet
  // carries the fact as text too and a reviewer need not count sliders in a PNG.
  const visible = await page.evaluate(() => [...document.querySelectorAll('#acc-form .fl-ctrl')]
    .filter((d) => !d.hidden && !d.closest('[hidden]:not(.fl-ctrl)'))
    .map((d) => (d.querySelector('input,select') || {}).id).filter(Boolean));
  const file = path.join(OUT, `shape-${label}.png`);
  const sec = await page.$('#acc-form');   // the body; its head carries only the section name
  await sec.screenshot({ path: file });
  const sha = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
  manifest.push(`${label.padEnd(10)} ${sha}  picker=${note}  form-visible=${visible.length}\n           ${visible.join(' ')}`);
  console.log(`  ${label.padEnd(10)} ${sha}  picker=${note}  ${visible.length} Form controls visible`);
};

console.log('shape-picker sheet ->', OUT);
for (const name of PICKER_SHAPE_NAMES) {
  const got = await pickShape(name);
  if (got !== name) { console.error(`FAIL: picked "${name}", picker reads back "${got}"`); await browser.close(); server.close(); process.exit(1); }
  await shoot(name, got);
}

// CUSTOM: reached only by hand-editing a shape param away from every bundle, which is what
// detectShape() is for. Shot last because it leaves the params off-bundle.
await pickShape('rounded');
await page.evaluate(() => {
  const el = document.getElementById('cleftDepth');
  el.value = '0.23'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
});
await page.waitForTimeout(220);
const custom = await page.evaluate(() => document.getElementById('petalShape').value);
if (custom !== '__custom') { console.error(`FAIL: hand-edited cleftDepth, picker reads "${custom}" (expected __custom)`); await browser.close(); server.close(); process.exit(1); }
await shoot('custom', custom);

fs.writeFileSync(path.join(OUT, 'MANIFEST.txt'), manifest.join('\n') + '\n');
await browser.close(); server.close();
console.log(`\nwrote ${manifest.length} frames + MANIFEST.txt`);
