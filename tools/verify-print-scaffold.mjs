// verify-print-scaffold.mjs — behaviour gate for the /print scaffold.
//
//   node tools/verify-print-scaffold.mjs [shots-dir]
//
// Serves the repo on a free port with Netlify's clean-URL behaviour emulated
// (a request for /print falls back to print.html), so the ROUTE is exercised
// and not just the file. Three.js is fulfilled from node_modules at the exact
// jsDelivr URLs print.html pins, so the gate needs no CDN egress:
//
//   npm i --no-save three@0.161.0 playwright-core
//
// It asserts, in one run: the bundle loads, the scene holds meshes, the model
// is actually LIT AND ON SCREEN (measured from the screenshot bytes, not from
// readPixels — the context has no preserveDrawingBuffer, so a readPixels after
// the frame returns a cleared buffer and scores 100% "non-background" for a
// completely empty scene), a drag on the canvas moves the camera, and the
// pivot node's extras round-trip through GLTFLoader with the junction position,
// the junction tangent and a non-empty rotation_limits_deg. It also asserts
// the exporter's pivot_marker sphere is found, still in the tree, and hidden
// by default, and that its toggle shows and re-hides it.
//
// Verified falsifiable — each of these turns it red, on the check that names
// the behaviour: not adding gltf.scene to the scene, disabling OrbitControls,
// looking for a pivot node that does not exist, removing every light, and
// stripping `extras` from the bundle at generation time, leaving the marker
// visible, and REMOVING the marker from the tree instead of hiding it.

import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';

const ROOT = '/home/user/Portfolio-Site';
const OUT = process.argv[2] || '/tmp/print-shots';
mkdirSync(OUT, { recursive: true });
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.glb':'model/gltf-binary', '.json':'application/json', '.svg':'image/svg+xml',
  '.ico':'image/x-icon', '.png':'image/png' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(ROOT, p);
  if (!existsSync(f) && existsSync(f + '.html')) f += '.html';   // Netlify clean URL
  if (!existsSync(f) || !readFileSync) { res.writeHead(404); return res.end('nf'); }
  try {
    const body = readFileSync(f);
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: process.env.PRINT_CHROME || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });

// serve three from node_modules at the exact pinned CDN URLs
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.161.0/**', route => {
  const u = new URL(route.request().url());
  const rel = u.pathname.replace('/npm/three@0.161.0/', '');
  const f = path.join(ROOT, 'node_modules/three', rel);
  if (!existsSync(f)) return route.fulfill({ status: 404, body: 'nf' });
  route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8') });
});
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));

const page = await ctx.newPage();
const errs = [], logs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => logs.push(`${m.type()}: ${m.text()}`));
page.on('requestfailed', r => logs.push('REQFAIL ' + r.url()));
page.on('response', r => { if (r.status() >= 400) logs.push('HTTP ' + r.status() + ' ' + r.url()); });

// hit the CLEAN url, no .html
await page.goto(`${base}/print`, { waitUntil: 'load' });
try {
  await page.waitForFunction('window.__printScaffold', { timeout: 20000 });
} catch (e) {
  console.log('page errors:', errs);
  console.log('console:', logs.join('\n'));
  console.log('debug panel:', await page.textContent('#print-debug').catch(() => '(none)'));
  throw e;
}
const ready = await page.evaluate(() => window.__printScaffold.ready);
if (!ready) {
  console.log('scaffold reported not ready:', await page.evaluate(() => window.__printScaffold));
  console.log('page errors:', errs);
  console.log('console:', logs.join('\n'));
  process.exit(1);
}

const info = await page.evaluate(() => ({ ...window.__printScaffold, cameraPosition: window.__printScaffold.cameraPosition() }));
console.log('scaffold:', JSON.stringify(info, null, 2));
console.log('debug panel:\n' + await page.textContent('#print-log'));

// The pivot_marker is the exporter's diagnostic sphere, hidden by default.
// Asserted as three separate facts, because "not on screen" has more than one
// cause and only one of them is the intended one: the node is FOUND, it is
// still IN THE TREE (hidden, not removed — so the node count and the extras
// keep describing the bundle as shipped), and it is NOT VISIBLE.
const markerFound = info.markerFound;
const markerInTree = await page.evaluate(() => window.__printScaffold.markerInTree());
const hiddenByDefault = !(await page.evaluate(() => window.__printScaffold.markerVisible()));
console.log(`pivot marker: found=${markerFound} inTree=${markerInTree} hiddenByDefault=${hiddenByDefault}`);

// and the toggle brings it back, in BOTH directions. Offered is checked
// FIRST: a hidden toggle makes page.check() sit there for its full timeout,
// which is a slow, unnamed failure rather than a stated one.
const toggleOffered = !(await page.locator('#print-marker-toggle').isHidden());
if (!toggleOffered) {
  console.log('marker toggle: offered=false — no visible toggle to drive');
  console.log('\nFAIL');
  await browser.close(); server.close();
  process.exit(1);
}
await page.check('#showPivotMarker');
const shownAfterCheck = await page.evaluate(() => window.__printScaffold.markerVisible());
await page.uncheck('#showPivotMarker');
const hiddenAfterUncheck = !(await page.evaluate(() => window.__printScaffold.markerVisible()));
console.log(`marker toggle: offered=${toggleOffered} shows=${shownAfterCheck} re-hides=${hiddenAfterUncheck}`);

await page.screenshot({ path: path.join(OUT, '01-loaded.png') });

// pixel sanity, measured from the SCREENSHOT BYTES rather than readPixels:
// the WebGL context has no preserveDrawingBuffer, so a readPixels after the
// frame returns a cleared buffer and would score 100% "non-background" for a
// completely empty scene. The screenshot is what the eye sees.
function inkFraction(png) {
  const { width, height, data } = decodePNG(png);
  const channels = 4;
  let n = 0;
  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels], g = data[i * channels + 1], b = data[i * channels + 2];
    // the page background is #0c0e0e; the debug panel sits over it, so ignore
    // the top-left block where the panel is drawn
    const x = i % width, y = (i / width) | 0;
    if (x < 520 && y < 340) continue;
    if (Math.abs(r - 12) > 14 || Math.abs(g - 14) > 14 || Math.abs(b - 14) > 14) n++;
  }
  return n / (width * height);
}
const drawn = inkFraction(readFileSync(path.join(OUT, '01-loaded.png')));
console.log('lit pixel fraction (outside debug panel):', drawn.toFixed(4));

// orbit: drag across the canvas, camera must move
const before = await page.evaluate(() => window.__printScaffold.cameraPosition());
const box = await page.locator('#print-canvas').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + box.width / 2 + i * 22, box.y + box.height / 2 + i * 4);
await page.mouse.up();
await page.waitForTimeout(600);
const after = await page.evaluate(() => window.__printScaffold.cameraPosition());
const moved = Math.hypot(after[0]-before[0], after[1]-before[1], after[2]-before[2]);
console.log('camera before:', before.map(n=>n.toFixed(1)).join(', '));
console.log('camera after :', after.map(n=>n.toFixed(1)).join(', '));
console.log('camera moved by:', moved.toFixed(2));
await page.screenshot({ path: path.join(OUT, '02-orbited.png') });

console.log('\npage errors:', errs.length ? errs : 'none');
console.log('console:\n' + logs.join('\n'));
await browser.close(); server.close();

const ok = info.ready && info.meshes >= 1 && info.pivotExtras
  && info.pivotExtras.junction && Array.isArray(info.pivotExtras.junction.position)
  && Array.isArray(info.pivotExtras.junction.tangent) && info.pivotExtras.rotation_limits_deg
  && Object.keys(info.pivotExtras.rotation_limits_deg).length > 0
  && drawn > 0.01 && drawn < 0.9 && moved > 1
  && markerFound && markerInTree && hiddenByDefault
  && toggleOffered && shownAfterCheck && hiddenAfterUncheck && errs.length === 0;
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
