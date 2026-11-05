#!/usr/bin/env node
// shoot.mjs — record the dyeing animations and the section's end frames.
//   NODE_PATH=/opt/node22/lib/node_modules node tools/dyeing-proto/shoot.mjs <dir> [--only=a,b] [--sheet] [--no-video]
// Per animation (and per interactive state: chain at three stages, cross with each toggle):
// <name>.mp4 + <name>.gif, rendered by seeking t at 30 fps (the scene's own timing, not this
// machine's) plus a held second on the end frame. Then end-frame screenshots of the whole section
// at 1280 and 390 wide (reduced motion), and the per-frame draw cost.
// --sheet writes sheet.png: every clip at t = 0, 0.25, 0.5, 0.75, 1.
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
const url = q => `http://localhost:${port}/tools/dyeing-proto/index.html${q || ''}`;

// clip = scene + state
const CLIPS = [
  ['chain-package', 'chain', { stage: 'package' }], ['chain-solution', 'chain', { stage: 'solution' }], ['chain-piece', 'chain', { stage: 'piece' }], ['chain-grid', 'chain', { stage: 'package' }, 'phone'],
  ['skein', 'skein'], ['package', 'package'], ['beam', 'beam'], ['pen-yarn', 'pen-yarn'], ['pen-piece', 'pen-piece'],
  ['solution', 'solution'], ['printed', 'printed'], ['dyed', 'dyed'],
  ['disperse', 'disperse'], ['acid', 'acid'], ['reactive', 'reactive'],
  ['cross', 'cross', { reserve: false, reality: false }], ['cross-reserve', 'cross', { reserve: true, reality: false }], ['cross-reality', 'cross', { reserve: false, reality: true }],
].filter(c => !only || only.includes(c[0]));

const browser = await chromium.launch({ executablePath: findChromium() });
const errs = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
page.on('pageerror', e => errs.push(String(e)));
await page.goto(url('?still'), { waitUntil: 'load' });
await page.waitForFunction(() => window.__dy && window.__dy.length === 13);
// a clip marked 'phone' is recorded on a 390-wide page (the chain's 2 x 2 layout follows the viewport)
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await phone.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
phone.on('pageerror', e => errs.push(String(e)));
await phone.goto(url('?still'), { waitUntil: 'load' });
await phone.waitForFunction(() => window.__dy && window.__dy.length === 13);
const pageFor = where => where === 'phone' ? phone : page;
const at = (scene, state, t, where) => pageFor(where).evaluate(([n, s, t]) => { const p = window.__dy.find(q => q.name === n); if (s) Object.assign(p.state, s); p.seek(t); }, [scene, state || null, t]);

const cost = {};
for (const [clip, scene, state, where] of CLIPS) {
  cost[clip] = await pageFor(where).evaluate(([n, s]) => { const p = window.__dy.find(q => q.name === n); if (s) Object.assign(p.state, s); p.seek(0); let worst = 0, sum = 0; for (let j = 1; j <= 40; j++) { const a = performance.now(); p.seek(j / 40); const d = performance.now() - a; sum += d; worst = Math.max(worst, d); } return { mean: sum / 40, worst }; }, [scene, state || null]);
}

if (has('sheet')) {
  const T = [0, 0.25, 0.5, 0.75, 1], dir = path.join(out, 'sheet-cells'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const rows = [];
  for (const [clip, scene, state, where] of CLIPS) {
    await at(scene, state, 0, where);
    const el = await pageFor(where).$(`[data-dye-scene="${scene}"] svg`); await el.scrollIntoViewIfNeeded();
    const cells = [];
    for (const t of T) { await at(scene, state, t, where); const f = path.join(dir, `${clip}-${t}.png`); await el.screenshot({ path: f }); cells.push(f); }
    const row = path.join(dir, `${clip}.png`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...cells.flatMap(c => ['-i', c]), '-filter_complex', `${cells.map((_, i) => `[${i}]scale=520:-2,pad=530:ih:5:0:color=0x232727[c${i}]`).join(';')};${cells.map((_, i) => `[c${i}]`).join('')}hstack=inputs=${cells.length}`, row]);
    rows.push(row);
  }
  const W = rows.map(r => execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width', '-of', 'csv=p=0', r]).toString().trim());
  if (rows.length === 1) fs.copyFileSync(rows[0], path.join(out, 'sheet.png'));
  else execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...rows.flatMap(r => ['-i', r]), '-filter_complex', `${rows.map((_, i) => `[${i}]pad=${Math.max(...W)}:ih+6:0:0:color=0x232727[r${i}]`).join(';')};${rows.map((_, i) => `[r${i}]`).join('')}vstack=inputs=${rows.length}`, path.join(out, 'sheet.png')]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('sheet.png written');
}

if (!has('no-video')) {
  const FPS = 30;
  for (const [clip, scene, state, where] of CLIPS) {
    const dur = await pageFor(where).evaluate(n => window.__dy.find(q => q.name === n).scene.duration, scene);
    const frames = Math.round(dur / 1000 * FPS) + FPS;
    const dir = path.join(out, `${clip}-frames`); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
    await at(scene, state, 0, where);
    const el = await pageFor(where).$(`[data-dye-scene="${scene}"] svg`); await el.scrollIntoViewIfNeeded();
    for (let f = 0; f < frames; f++) {
      await at(scene, state, Math.min(1, f / (dur / 1000 * FPS)), where);
      await el.screenshot({ path: path.join(dir, `f${String(f).padStart(4, '0')}.png`) });
    }
    const mp4 = path.join(out, `${clip}.mp4`), gif = path.join(out, `${clip}.gif`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png'), '-vf', 'scale=720:-2', '-pix_fmt', 'yuv420p', mp4]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png'), '-vf', 'fps=15,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse', gif]);
    console.log(`${clip}: ${frames} frames, mp4 ${fs.statSync(mp4).size >> 10} KB, gif ${fs.statSync(gif).size >> 10} KB`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto(url('?reduce'), { waitUntil: 'load' });
    await p.waitForFunction(() => window.__dy && window.__dy.length === 13);
    await (await p.$('#dyeing')).screenshot({ path: path.join(out, `end-${w}.png`) });
    await p.close();
  }
}
for (const [n, c] of Object.entries(cost)) console.log(`draw ${n.padEnd(15)} mean ${c.mean.toFixed(1)} ms, worst ${c.worst.toFixed(1)} ms`);
console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors');
await browser.close(); server.close();
