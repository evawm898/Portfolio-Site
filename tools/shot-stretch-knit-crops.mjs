#!/usr/bin/env node
// shot-stretch-knit-crops.mjs — matched-stitch crops of the knit swatch on
// /textile-stretch-simulator.html, this tree beside another (usually a worktree of main).
//
//   NODE_PATH=/opt/node22/lib/node_modules node tools/shot-stretch-knit-crops.mjs <dir> [--base <tree>]
//
// Each crop is EIGHT WALES BY EIGHT COURSES of the swatch, centred on its material centre,
// sized from the page's own drawn pitches (state.knitDraw W and C) so a stretched state is
// cropped to the same stitches as a resting one. Four states, cotton jersey:
//   rest · 50 % course pull · course pull just short of the yarn break · wale pull just short
//   of the yarn break.
// A pull is held still before the crop is taken and the crop is read from the swatch's tile
// canvas (yarn only — no pull handle, no grid). Writes <dir>/crops.png and the cells.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { findChromium } from './chromium-harness.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const out = argv[0];
const baseTree = argv.includes('--base') ? path.resolve(argv[argv.indexOf('--base') + 1]) : null;
if (!out || out.startsWith('--')) { console.error('usage: node tools/shot-stretch-knit-crops.mjs <dir> [--base <tree>]'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });

const require = createRequire(import.meta.url);
const pwRoots = [...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []), '/opt/node22/lib/node_modules', '/usr/lib/node_modules'];
const pwEntry = pwRoots.map(r => path.join(r, 'playwright', 'index.js')).find(p => fs.existsSync(p));
const { chromium } = pwEntry ? require(pwEntry) : require('playwright');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const serve = root => new Promise(resolve => {
  const s = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  s.listen(0, '127.0.0.1', () => resolve(s));
});

const browser = await chromium.launch({ executablePath: findChromium() });
const errors = [];
const b64 = buf => 'data:image/png;base64,' + buf.toString('base64');

async function cropsFor(root, label) {
  const server = await serve(root);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 3 });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(label + ': ' + e));
  await page.goto('http://127.0.0.1:' + server.address().port + '/textile-stretch-simulator.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__stretchSim && window.__stretchSim.state.P);
  const frames = n => page.evaluate(n => new Promise(r => { let k = n; const f = () => (--k <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  await page.evaluate(() => window.__stretchSim.applyPreset('cotton-jersey')); await frames(3);
  const read = () => page.evaluate(() => {
    const S = window.__stretchSim, st = S.state;
    return { sigma: st.sigma, ext: S.strainAlong(st.elastic, st.theta), W: st.knitDraw.W, C: st.knitDraw.C, ys: st.loop.yarnStrain, regime: document.getElementById('ro-regime').textContent };
  });
  async function pullTo(deg, target) {
    let lo = 0, hi = 1400, r = null;
    for (let i = 0; i < 22; i++) {
      const px = 0.5 * (lo + hi);
      await page.evaluate(([d, p]) => { const S = window.__stretchSim; S.relax(); S.pull(d, p); }, [deg, px]);
      await frames(3); r = await read();
      if (r.ext < target) lo = px; else hi = px;
    }
    await frames(4);   // held still: the tile (full shading) is what is on screen
    return read();
  }
  const capExt = deg => page.evaluate(deg => { const S = window.__stretchSim, P = S.state.P, th = deg * Math.PI / 180; return S.strainAlong(S.elasticStrains(P, 0.97 * S.loadCap(P, th), th), th); }, deg);
  // the crop is read from the swatch's own tile canvas — yarn over transparency, no grid
  // and no pull handle — composited on the page's background colour; every state cropped
  // here is held still, so the tile IS what the page shows
  const crop = async (name, r) => {
    await frames(4);
    const url = await page.evaluate(r => {
      const S = window.__stretchSim, t = S.knitTile, view = document.getElementById('swatchCanvas');
      if (!t.ready) return null;
      const dpr = view.width / view.getBoundingClientRect().width;
      const [cx, cy, sc] = S.screenOf(0, 0), w = 8 * r.W * sc * dpr, h = 8 * r.C * sc * dpr;
      const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h);
      const g = c.getContext('2d'); g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--black-raised').trim(); g.fillRect(0, 0, c.width, c.height);
      g.drawImage(t.canvas, cx * dpr - w / 2, cy * dpr - h / 2, w, h, 0, 0, c.width, c.height);
      return c.toDataURL('image/png');
    }, r);
    if (!url) throw new Error(label + ' ' + name + ': swatch not on its tile');
    const png = Buffer.from(url.split(',')[1], 'base64');
    fs.writeFileSync(path.join(out, `${label}-${name}.png`), png);
    return png;
  };
  const items = [];
  const cap = (tag, r) => `${tag} · ${r.sigma.toFixed(1)} N · ext ${(r.ext * 100).toFixed(0)}% · yarn ${(r.ys * 100).toFixed(1)}% · ${r.regime}`;
  await page.evaluate(() => { const S = window.__stretchSim; S.release(); S.relax(); }); await frames(4);
  let r = await read(); items.push({ img: b64(await crop('rest', r)), cap: cap('rest', r) });
  r = await pullTo(0, 0.5); items.push({ img: b64(await crop('course50', r)), cap: cap('course 50%', r) });
  r = await pullTo(0, await capExt(0)); items.push({ img: b64(await crop('course-near-break', r)), cap: cap('course near break', r) });
  await page.evaluate(() => { const S = window.__stretchSim; S.release(); S.relax(); }); await frames(3);
  r = await pullTo(90, await capExt(90)); items.push({ img: b64(await crop('wale-near-break', r)), cap: cap('wale near break', r) });
  await ctx.close(); server.close();
  return items;
}

const rows = [];
if (baseTree) rows.push({ label: 'base (' + path.basename(baseTree) + ')', items: await cropsFor(baseTree, 'base') });
rows.push({ label: 'this tree', items: await cropsFor(REPO, 'this') });

const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:24px;background:#0b0d0d;color:#cfd6d6;font:12px/1.4 ui-monospace,Menlo,monospace}
h1{font-size:14px;margin:0 0 4px;color:#e9eeee} h2{font-size:12px;margin:22px 0 8px;color:#5fa0a0;letter-spacing:.08em;text-transform:uppercase}
.row{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start} figure{margin:0} img{height:260px;max-width:1640px;object-fit:cover;object-position:left;display:block;border:1px solid #223}
figcaption{margin-top:5px;color:#9aa5a5;max-width:340px}
</style><h1>Knit swatch — 8 wales × 8 courses at the swatch centre, cotton jersey</h1>
<div>Page errors: ${errors.length ? errors.join(' | ') : 'none'}.</div>
${rows.map(r => `<h2>${r.label}</h2><div class="row">${r.items.map(i => `<figure><img src="${i.img}"><figcaption>${i.cap}</figcaption></figure>`).join('')}</div>`).join('')}`;
const ctx = await browser.newContext({ viewport: { width: 1700, height: 900 } });
const sheet = await ctx.newPage();
await sheet.setContent(html, { waitUntil: 'load' });
await sheet.screenshot({ path: path.join(out, 'crops.png'), fullPage: true });
console.log('wrote', path.join(out, 'crops.png'), errors.length ? 'ERRORS: ' + errors.join(' | ') : 'no page errors');
await browser.close();
