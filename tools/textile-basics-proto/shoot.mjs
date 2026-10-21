#!/usr/bin/env node
// shoot.mjs — record the six textile-basics animations and their end frames.
//   NODE_PATH=/opt/node22/lib/node_modules node tools/textile-basics-proto/shoot.mjs <dir> [--frames=N] [--only=a,b]
// Writes per animation <name>.mp4 + <name>.gif (frames rendered by seeking t, so the timing is
// the scene's own duration at 30 fps and nothing depends on how fast this box renders), and
// end-frame screenshots of the whole section at 1280 and 390 wide, plus the reduced-motion page.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { findChromium } from '../chromium-harness.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = process.argv[2]; if (!out) { console.error('usage: shoot.mjs <dir>'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const only = arg('only', '') ? arg('only').split(',') : null;
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  const p = path.join(REPO, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(REPO) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
}).listen(0);
const port = server.address().port;
const url = q => `http://localhost:${port}/tools/textile-basics-proto/index.html${q || ''}`;

const browser = await chromium.launch({ executablePath: findChromium() });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto(url('?still'), { waitUntil: 'load' });
await page.waitForFunction(() => window.__tb && window.__tb.length === 6);
const names = await page.evaluate(() => window.__tb.map(p => p.host.dataset.txAnim));

const FPS = 30;
for (let k = 0; k < names.length; k++) {
  const name = names[k]; if (only && !only.includes(name)) continue;
  const dur = await page.evaluate(i => window.__tb[i].scene.duration, k);
  const frames = Math.round(dur / 1000 * FPS) + FPS;      // + a held second on the end frame
  const dir = path.join(out, `${name}-frames`); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const el = await page.$(`[data-tx-anim="${name}"] .tx-anim`);
  await el.scrollIntoViewIfNeeded();
  let ms = 0;
  for (let f = 0; f < frames; f++) {
    const t = Math.min(1, f / (dur / 1000 * FPS));
    ms += await page.evaluate(([i, t]) => { const a = performance.now(); window.__tb[i].seek(t); return performance.now() - a; }, [k, t]);
    await el.screenshot({ path: path.join(dir, `f${String(f).padStart(4, '0')}.png`) });
  }
  const mp4 = path.join(out, `${name}.mp4`), gif = path.join(out, `${name}.gif`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png'), '-vf', 'scale=640:-2', '-pix_fmt', 'yuv420p', mp4]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png'), '-vf', 'fps=20,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse', gif]);
  console.log(`${name}: ${frames} frames, ${(ms / frames).toFixed(1)} ms/frame draw (seek), mp4 ${fs.statSync(mp4).size >> 10} KB, gif ${fs.statSync(gif).size >> 10} KB`);
  fs.rmSync(dir, { recursive: true, force: true });
}
// end frames
for (const [w, h] of [[1280, 900], [390, 844]]) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(url('?reduce'), { waitUntil: 'load' });
  await p.waitForFunction(() => window.__tb && window.__tb.length === 6);
  await (await p.$('#what-is-a-textile')).screenshot({ path: path.join(out, `end-${w}.png`) });
  await p.close();
}
console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors');
await browser.close(); server.close();
