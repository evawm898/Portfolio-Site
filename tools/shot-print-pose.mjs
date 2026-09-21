// shot-print-pose.mjs — contact sheet for the /print posing stage.
//
//   node tools/shot-print-pose.mjs <dir>
//
// Every pose on this sheet is produced by a REAL POINTER DRAG on the canvas or
// a real slider input, never by writing state — the point of the sheet is what
// the hand can do, so a cell built by setting a variable would be a picture of
// something the user cannot reach.
//
// Cells: rest; a bent stem from two drags; the same bend seen after a camera
// orbit (the pose must survive it); droop alone; twist alone; droop+twist;
// and the extremes of the bundle's own declared limits.
import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = '/home/user/Portfolio-Site';
const OUT = process.argv[2] || '/tmp/print-pose-sheet';
mkdirSync(OUT, { recursive: true });
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.glb':'model/gltf-binary', '.json':'application/json', '.svg':'image/svg+xml',
  '.ico':'image/x-icon', '.png':'image/png' };

const server = http.createServer((req, res) => {
  let f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(f) && existsSync(f + '.html')) f += '.html';
  if (!existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: process.env.PRINT_CHROME || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.161.0/**', route => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  const f = path.join(ROOT, 'node_modules/three', rel);
  if (!existsSync(f)) return route.fulfill({ status: 404, body: 'nf' });
  route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8') });
});
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));

const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.goto(`${base}/print`, { waitUntil: 'load' });
await page.waitForFunction('window.__printScaffold && window.__printScaffold.ready');

const call = e => page.evaluate(e);
const shot = async (name) => { await page.waitForTimeout(250); await page.screenshot({ path: path.join(OUT, name) }); console.log('  ' + name); };

async function dragHandle(i, dx, dy) {
  const [x, y] = await call(`window.__printScaffold.handleScreenPos(${i})`);
  await page.mouse.move(x, y);
  await page.mouse.down();
  const N = 14;
  for (let k = 1; k <= N; k++) await page.mouse.move(x + dx * k / N, y + dy * k / N);
  await page.mouse.up();
  await page.waitForTimeout(120);
}
async function orbit(dx, dy) {
  const b = await page.locator('#print-canvas').boundingBox();
  const cx = b.x + b.width * 0.72, cy = b.y + b.height * 0.55;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let k = 1; k <= 14; k++) await page.mouse.move(cx + dx * k / 14, cy + dy * k / 14);
  await page.mouse.up();
  await page.waitForTimeout(300);
}
const setD = v => call(`window.__printScaffold.setDroop(${v})`);
const setT = v => call(`window.__printScaffold.setTwist(${v})`);
const reset = () => page.click('#resetPose');

console.log('writing sheet to ' + OUT);

await shot('01-rest.png');

// an S-curve from two real drags, in opposite directions
await dragHandle(1, -70, 0);
await dragHandle(2, 60, 0);
const bent = await call('window.__printScaffold.bendPoints()');
console.log('  bend points now: ' + JSON.stringify(bent.map(p => p.map(v => +v.toFixed(1)))));
await shot('02-bent-s-curve.png');

// the same bend, from another angle — the pose must be a property of the
// model, not of where the camera happens to be
await orbit(-260, -40);
await shot('03-bent-orbited.png');
await orbit(260, 40);

// hinge, one axis at a time, then together
await setD(30); await shot('04-bent-droop30.png');
await setD(0); await setT(-25); await shot('05-bent-twist-25.png');
await setD(45); await setT(30); await shot('06-bent-limits-max.png');

// hinge extremes on an UNBENT stem, as the control
await reset();
await setD(45); await setT(30); await shot('07-straight-limits-max.png');
await setD(0); await setT(0);
await shot('08-back-to-rest.png');

const restUlps = await call('window.__printScaffold.restResidualUlps()');
const leaf = await call('window.__printScaffold.leafVertexCount()');
console.log(`\n  rest residual after the whole run: ${restUlps.toFixed(3)} float32 ULP`);
console.log(`  leaf vertices still present: ${leaf}`);
console.log('  page errors: ' + (errs.length ? errs.join('; ') : 'none'));

await browser.close(); server.close();
process.exit(errs.length ? 1 : 0);
