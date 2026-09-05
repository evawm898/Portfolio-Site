// shot-print-lines.mjs — contact sheet for the /print line-art stage.
//
//   node tools/shot-print-lines.mjs <dir>
//
// Every cell is a REAL SCREENSHOT of the live page driven through its own
// controls — a slider input, a pointer drag, a wheel zoom. Nothing here writes
// state the hand cannot reach, for the same reason the pose sheet does not:
// a picture of an unreachable configuration is not evidence about the tool.
//
// The sheet answers the review gate's four questions, in this order:
//   the shaded preview and the line art side by side, on ONE camera;
//   detail x weight, four combinations;
//   pointillism at 0, 40 and 100;
//   the linework under a LIVE pose change — a bend-point drag and the hinge —
//     which is the whole claim of the stage and the one thing a static cell
//     cannot show, so it is shot as a before/after pair on one camera.
import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = '/home/user/Portfolio-Site';
const OUT = process.argv[2] || '/tmp/print-lines-sheet';
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
await page.waitForFunction('window.__printLineArt', { timeout: 30000 });

const call = e => page.evaluate(e);
const shot = async (name) => {
  await page.waitForTimeout(320);
  await page.screenshot({ path: path.join(OUT, name) });
  const st = await call(() => window.__printLineArt.stats());
  console.log(`  ${name.padEnd(34)} seg ${String(st.segments).padStart(6)} = ${String(st.silhouette).padStart(6)} sil + ${String(st.crease).padStart(6)} crease | ${String(st.strokes).padStart(6)} strokes + ${String(st.dots).padStart(6)} dots | ${st.creaseAngleDeg.toFixed(1)}°`);
};
const style = (o) => call(`window.__printLineArt.setStyle(${JSON.stringify(o)})`);

// Frame the bloom: a wheel zoom through OrbitControls, so the camera the sheet
// uses is one the hand can reach.
const box = await page.locator('#print-canvas').boundingBox();
const cx = box.x + box.width * 0.42, cy = box.y + box.height * 0.35;
await page.mouse.move(cx, cy);
for (let i = 0; i < 9; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(40); }
// and a small orbit so the bloom is seen three-quarter rather than dead-on
await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
await page.mouse.down();
for (let i = 1; i <= 14; i++) await page.mouse.move(box.x + box.width * 0.6 - i * 5, box.y + box.height * 0.6 - i * 2);
await page.mouse.up();
await page.waitForTimeout(400);

console.log('\nthe switch — same camera, same pose');
await call(() => window.__printLineArt.setLineArt(false));
await shot('00-shaded-preview.png');
await call(() => window.__printLineArt.setLineArt(true));
await style({ weight: 1.6, detail: 45, blend: 0 });
await shot('01-line-art.png');

console.log('\ndetail x weight');
for (const [d, w, tag] of [[0, 1.0, 'a-detail0-weight1.0'], [0, 4.0, 'b-detail0-weight4.0'],
                           [70, 1.0, 'c-detail70-weight1.0'], [70, 4.0, 'd-detail70-weight4.0'],
                           [100, 2.5, 'e-detail100-weight2.5']]) {
  await style({ detail: d, weight: w, blend: 0 });
  await shot(`02-${tag}.png`);
}

console.log('\npointillism blend — same extraction, different drawing');
await style({ detail: 45, weight: 2.2 });
for (const b of [0, 40, 80, 100]) {
  await style({ blend: b });
  await shot(`03-dots-${String(b).padStart(3, '0')}.png`);
}

console.log('\nlive under a pose change — the stage is a layer, not a mode');
await style({ detail: 45, weight: 1.8, blend: 0 });
await shot('04-a-before-pose.png');
// a real pointer drag on a real bend point, while stylized
const [hx, hy] = await call(() => window.__printScaffold.handleScreenPos(2));
await page.mouse.move(hx, hy);
await page.mouse.down();
for (let i = 1; i <= 16; i++) await page.mouse.move(hx + i * 5, hy + i * 1);
await page.mouse.up();
await shot('04-b-bend-dragged.png');
await call(() => { window.__printScaffold.setDroop(38); window.__printScaffold.setTwist(-24); });
await shot('04-c-bend-plus-hinge.png');
await style({ blend: 100 });
await shot('04-d-bend-plus-hinge-dots.png');

console.log('\nperf (mean over the frames since the sheet started):',
  JSON.stringify(await call(() => window.__printLineArt.perf())));
console.log('read-out:\n' + await call(() => window.__printLineArt.artText()));
console.log('\npage errors:', errs.length ? errs : 'none');
console.log('sheet:', OUT);
await browser.close(); server.close();
process.exit(errs.length ? 1 : 0);
