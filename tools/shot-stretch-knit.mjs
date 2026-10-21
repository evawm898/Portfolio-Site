#!/usr/bin/env node
// shot-stretch-knit.mjs — contact sheet for the knit swatch on /textile-stretch-simulator.html.
//
//   NODE_PATH=/opt/node22/lib/node_modules node tools/shot-stretch-knit.mjs <dir>
//
// Writes <dir>/knit-sheet.png plus the cells it is made of:
//   * textile 101's weft-knit panel beside the simulator's swatch at rest — both drawn from
//     /textile-knit-loops.js, so they should read as the same fabric;
//   * the swatch pulled along the course direction to 0 %, 50 % and just short of the yarn
//     break, each captioned with the page's own numbers (load, extension, loop W and H,
//     yarn strain, regime) — read off window.__stretchSim, never restated here;
//   * the same three along the wale direction.
// It also times one full swatch draw (drawJersey on an offscreen canvas, median of 40) so the
// cost of drawing every loop live is a number rather than a feeling.
// Animation is off (prefers-reduced-motion) so textile 101's strands are fully drawn.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { findChromium } from './chromium-harness.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2];
if (!out) { console.error('usage: node tools/shot-stretch-knit.mjs <dir>'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });

const require = createRequire(import.meta.url);
const pwRoots = [...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []), '/opt/node22/lib/node_modules', '/usr/lib/node_modules'];
const pwEntry = pwRoots.map(r => path.join(r, 'playwright', 'index.js')).find(p => fs.existsSync(p));
const { chromium } = pwEntry ? require(pwEntry) : require('playwright');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = await new Promise(resolve => {
  const s = http.createServer((req, res) => {
    const file = path.join(REPO, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
    if (!file.startsWith(REPO) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  s.listen(0, '127.0.0.1', () => resolve(s));
});
const base = 'http://127.0.0.1:' + server.address().port + '/';

const browser = await chromium.launch({ executablePath: findChromium() });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
const errors = [];
const cells = [];
const b64 = buf => 'data:image/png;base64,' + buf.toString('base64');

// ---- textile 101, the weft panel --------------------------------------------------------
const t101 = await ctx.newPage();
t101.on('pageerror', e => errors.push('t101: ' + e));
await t101.goto(base + 'textile-101.html', { waitUntil: 'load' });
const weft = t101.locator('#weft-warp-knit .tx-panel').first();
await weft.scrollIntoViewIfNeeded();
const t101Png = await weft.screenshot();
fs.writeFileSync(path.join(out, '00-textile-101-weft.png'), t101Png);

// ---- the simulator -----------------------------------------------------------------------
const page = await ctx.newPage();
page.on('pageerror', e => errors.push('sim: ' + e));
await page.goto(base + 'textile-stretch-simulator.html', { waitUntil: 'load' });
await page.waitForFunction(() => window.__stretchSim && window.__stretchSim.state.P);
const frames = n => page.evaluate(n => new Promise(r => { let k = n; const f = () => (--k <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const read = () => page.evaluate(() => {
  const S = window.__stretchSim, st = S.state;
  return {
    sigma: st.sigma, ext: S.strainAlong(st.elastic, st.theta), loop: { W: st.loop.W, H: st.loop.H, C: st.loop.C, ys: st.loop.yarnStrain, jammed: st.loop.jammed },
    regime: document.getElementById('ro-regime').textContent, crossings: st.knitDraw.crossings,
  };
});
await page.evaluate(() => window.__stretchSim.applyPreset('cotton-jersey'));
await frames(3);

// a pull whose extension is `target`, found by bisection on the hand distance
async function pullTo(deg, target) {
  let lo = 0, hi = 1400, best = null;
  for (let i = 0; i < 22; i++) {
    const px = 0.5 * (lo + hi);
    await page.evaluate(([d, p]) => { const S = window.__stretchSim; S.relax(); S.pull(d, p); }, [deg, px]);
    await frames(3);
    const r = await read();
    best = r;
    if (r.ext < target) lo = px; else hi = px;
  }
  return best;
}
const swatchShot = async (name, clipFrac) => {
  const box = await page.locator('#swatchCanvas').boundingBox();
  const w = box.width * clipFrac, h = box.height * clipFrac;
  const png = await page.screenshot({ clip: { x: box.x + (box.width - w) / 2, y: box.y + (box.height - h) / 2, width: w, height: h } });
  fs.writeFileSync(path.join(out, name + '.png'), png);
  return png;
};
// a close crop centred on the swatch's material centre, a fixed ~150 x 110 CSS px window
const zoomItems = [];
const zoomShot = async name => {
  const box = await page.locator('#swatchCanvas').boundingBox();
  const [cx, cy] = await page.evaluate(() => window.__stretchSim.screenOf(0, 0));
  const w = 170, h = 120;
  const png = await page.screenshot({ clip: { x: box.x + cx - w / 2, y: box.y + cy - h / 2, width: w, height: h } });
  fs.writeFileSync(path.join(out, name + '.png'), png);
  return png;
};
const caption = r => `${r.sigma.toFixed(1)} N · ext ${(r.ext * 100).toFixed(0)}% · loop W ${r.loop.W.toFixed(2)} H ${r.loop.H.toFixed(2)} mm · course pitch ${r.loop.C.toFixed(2)} · yarn ${(r.loop.ys * 100).toFixed(1)}% · ${r.regime} · ${r.crossings} crossings`;

// rest: the same textile-101 cell side by side, swatch cropped tight around itself
await page.evaluate(() => window.__stretchSim.relax()); await frames(3);
const rest = await read();
const restPng = await swatchShot('01-sim-rest', 0.42);
const restZoom = await zoomShot('01z-sim-rest');
cells.push({ row: 'At rest — same fabric?', items: [
  { img: b64(t101Png), cap: 'textile 101 · weft knitting panel (static SVG, generated from textile-knit-loops.js)' },
  { img: b64(restPng), cap: 'simulator · cotton jersey at rest · ' + caption(rest) },
  { img: b64(restZoom), cap: 'simulator · the same, close up (about seven wales)' },
] });

const capExt = await page.evaluate(deg => { const S = window.__stretchSim, P = S.state.P, th = deg * Math.PI / 180; return S.strainAlong(S.elasticStrains(P, 0.97 * S.loadCap(P, th), th), th); }, 0);
const capExtW = await page.evaluate(deg => { const S = window.__stretchSim, P = S.state.P, th = deg * Math.PI / 180; return S.strainAlong(S.elasticStrains(P, 0.97 * S.loadCap(P, th), th), th); }, 90);
for (const [deg, label, targets] of [[0, 'Course-direction pull', [0, 0.5, capExt]], [90, 'Wale-direction pull', [0, 0.5, capExtW]]]) {
  const items = [];
  for (const t of targets) {
    const r = t === 0 ? (await page.evaluate(() => { const S = window.__stretchSim; S.release(); S.relax(); }), await frames(3), await read()) : await pullTo(deg, t);
    const tag = t === 0 ? '0%' : (t === 0.5 ? '50%' : 'near break');
    const png = await swatchShot(`${deg === 0 ? '1' : '2'}-${tag.replace(/[^a-z0-9]+/gi, '')}`, 0.96);
    items.push({ img: b64(png), cap: `${tag} · ` + caption(r) });
    zoomItems.push({ img: b64(await zoomShot(`${deg === 0 ? '1' : '2'}z-${tag.replace(/[^a-z0-9]+/gi, '')}`)), cap: `${label.split(' ')[0]} ${tag} · ` + caption(r) });
  }
  cells.push({ row: label, items });
  cells.push({ row: label + ' — close up, the swatch centre', items: zoomItems.splice(0) });
}
await page.evaluate(() => { const S = window.__stretchSim; S.release(); S.relax(); });

// cost of one live swatch draw at rest and near break, offscreen, median of 40
const timing = await page.evaluate(async () => {
  const S = window.__stretchSim, st = S.state, P = st.P;
  const c = document.createElement('canvas'); c.width = 1700; c.height = 1360; const g = c.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0);
  const res = {};
  for (const [name, f] of [['rest', 0], ['near break', 0.97]]) {
    S.relax(); if (f) S.pull(0, 1); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (f) { st.elastic = S.elasticStrains(P, f * S.loadCap(P, 0), 0); }
    const W = Math.max(P.Wmin, P.W0 * (1 + st.elastic.e1)), C = Math.max(P.Cmin, P.C0 * (1 - P.nu * Math.min(st.elastic.e1, P.epsJ1)));
    const L = S.solveLoop(W, C, P.len0, P.d);
    const ts = [];
    for (let i = 0; i < 40; i++) {
      const t0 = performance.now();
      S.drawJersey(g, { nx: P.nx, ny: P.ny, W, C, H: L.H, map: (x, y) => [425 + x * 13, 340 - y * 13], widthPx: S.knitStyle.fullness * P.W0 * 13, bg: '#101414', samples: st.knitDraw.samples, colorOf: () => ({ mid: [47, 163, 163] }) });
      g.getImageData(0, 0, 1, 1); // flush
      ts.push(performance.now() - t0);
    }
    ts.sort((a, b) => a - b);
    res[name] = ts[20];
  }
  S.release(); S.relax();
  return res;
});

// ---- the sheet ---------------------------------------------------------------------------
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:28px;background:#0b0d0d;color:#cfd6d6;font:13px/1.4 ui-monospace,Menlo,monospace}
h1{font-size:15px;margin:0 0 4px;color:#e9eeee} h2{font-size:13px;margin:26px 0 10px;color:#5fa0a0;letter-spacing:.08em;text-transform:uppercase}
.row{display:flex;gap:18px;align-items:flex-start} figure{margin:0;flex:1} img{width:100%;display:block;border:1px solid #223}
figcaption{margin-top:6px;color:#9aa5a5;font-size:12px}
</style><h1>Knit swatch — textile 101 loop geometry in the stretch simulator</h1>
<div>Swatch draw, offscreen, median of 40: at rest ${timing.rest.toFixed(2)} ms · near break ${timing['near break'].toFixed(2)} ms. Page errors: ${errors.length ? errors.join(' | ') : 'none'}.</div>
${cells.map(r => `<h2>${r.row}</h2><div class="row">${r.items.map(i => `<figure><img src="${i.img}"><figcaption>${i.cap}</figcaption></figure>`).join('')}</div>`).join('')}`;
const sheetPage = await ctx.newPage();
await sheetPage.setViewportSize({ width: 1600, height: 1000 });
await sheetPage.setContent(html, { waitUntil: 'load' });
await sheetPage.screenshot({ path: path.join(out, 'knit-sheet.png'), fullPage: true });
fs.writeFileSync(path.join(out, 'timing.json'), JSON.stringify(timing, null, 2));
console.log('wrote', path.join(out, 'knit-sheet.png'), JSON.stringify(timing), errors.length ? 'ERRORS: ' + errors.join(' | ') : 'no page errors');
await browser.close(); server.close();
