#!/usr/bin/env node
// shoot.mjs — record the twelve fiber / yarn / structure animations and their end frames.
//   NODE_PATH=/opt/node22/lib/node_modules node tools/textile-taxonomy-proto/shoot.mjs <dir> [--only=a,b] [--sheet] [--no-video]
// Per animation: <name>.mp4 + <name>.gif, rendered by seeking t at 30 fps (the scene's own
// timing, not this machine's) plus a held second on the end frame. Then end-frame screenshots of
// the whole panel at 1280 and 390 wide (reduced motion), and the per-frame draw cost.
// --sheet also writes sheet.png: every animation at t = 0, 0.25, 0.5, 0.75, 1, one row each.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { findChromium } from '../chromium-harness.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = process.argv[2]; if (!out || out.startsWith('--')) { console.error('usage: shoot.mjs <dir> [--only=a,b] [--sheet] [--no-video]'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const has = k => process.argv.includes(`--${k}`);
const only = arg('only', '') ? arg('only').split(',') : null;
const { chromium } = createRequire(import.meta.url)('playwright');

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  const p = path.join(REPO, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(REPO) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
}).listen(0);
const port = server.address().port;
const url = q => `http://localhost:${port}/tools/textile-taxonomy-proto/index.html${q || ''}`;

const browser = await chromium.launch({ executablePath: findChromium() });
const errs = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
page.on('pageerror', e => errs.push(String(e)));
await page.goto(url('?still'), { waitUntil: 'load' });
await page.waitForFunction(() => window.__tt && window.__tt.length === 12);
const names = await page.evaluate(() => window.__tt.map(p => p.host.dataset.txScene));

// per-frame draw cost (seek = markup + DOM), sampled over the whole animation
const cost = {};
for (let k = 0; k < names.length; k++) {
  if (only && !only.includes(names[k])) continue;
  cost[names[k]] = await page.evaluate(i => { const p = window.__tt[i]; let worst = 0, sum = 0; for (let j = 0; j <= 40; j++) { const a = performance.now(); p.seek(j / 40); const d = performance.now() - a; sum += d; worst = Math.max(worst, d); } return { mean: sum / 41, worst }; }, k);
}

if (has('sheet')) {
  const T = [0, 0.25, 0.5, 0.75, 1], dir = path.join(out, 'sheet-cells'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const rows = [];
  for (let k = 0; k < names.length; k++) {
    const name = names[k]; if (only && !only.includes(name)) continue;
    const el = await page.$(`[data-tx-scene="${name}"] .tx-anim`); await el.scrollIntoViewIfNeeded();
    const cells = [];
    for (const t of T) { await page.evaluate(([i, t]) => window.__tt[i].seek(t), [k, t]); const f = path.join(dir, `${name}-${t}.png`); await el.screenshot({ path: f }); cells.push(f); }
    const row = path.join(dir, `${name}.png`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...cells.flatMap(c => ['-i', c]), '-filter_complex', `${cells.map((_, i) => `[${i}]scale=520:-2,pad=530:ih:5:0:color=0x232727[c${i}]`).join(';')};${cells.map((_, i) => `[c${i}]`).join('')}hstack=inputs=${cells.length}`, row]);
    rows.push(row);
  }
  if (rows.length === 1) fs.copyFileSync(rows[0], path.join(out, 'sheet.png'));
  else execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...rows.flatMap(r => ['-i', r]), '-filter_complex', `${rows.map((_, i) => `[${i}]pad=iw:ih+6:0:0:color=0x232727[r${i}]`).join(';')};${rows.map((_, i) => `[r${i}]`).join('')}vstack=inputs=${rows.length}`, path.join(out, 'sheet.png')]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('sheet.png written');
}

if (!has('no-video')) {
  const FPS = 30;
  for (let k = 0; k < names.length; k++) {
    const name = names[k]; if (only && !only.includes(name)) continue;
    const dur = await page.evaluate(i => window.__tt[i].scene.duration, k);
    const frames = Math.round(dur / 1000 * FPS) + FPS;
    const dir = path.join(out, `${name}-frames`); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
    const el = await page.$(`[data-tx-scene="${name}"] .tx-anim`); await el.scrollIntoViewIfNeeded();
    for (let f = 0; f < frames; f++) {
      await page.evaluate(([i, t]) => window.__tt[i].seek(t), [k, Math.min(1, f / (dur / 1000 * FPS))]);
      await el.screenshot({ path: path.join(dir, `f${String(f).padStart(4, '0')}.png`) });
    }
    const mp4 = path.join(out, `${name}.mp4`), gif = path.join(out, `${name}.gif`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png'), '-vf', 'scale=640:-2', '-pix_fmt', 'yuv420p', mp4]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png'), '-vf', 'fps=15,scale=400:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse', gif]);
    console.log(`${name}: ${frames} frames, mp4 ${fs.statSync(mp4).size >> 10} KB, gif ${fs.statSync(gif).size >> 10} KB`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto(url('?reduce'), { waitUntil: 'load' });
    await p.waitForFunction(() => window.__tt && window.__tt.length === 12);
    await (await p.$('#what-is-a-textile')).screenshot({ path: path.join(out, `end-${w}.png`) });
    await p.close();
  }
}
for (const [n, c] of Object.entries(cost)) console.log(`draw ${n.padEnd(9)} mean ${c.mean.toFixed(1)} ms, worst ${c.worst.toFixed(1)} ms`);
console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors');
await browser.close(); server.close();
