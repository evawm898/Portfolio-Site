#!/usr/bin/env node
// record-scene-studio.mjs — scene 4 as MOVING PICTURES, for judging by eye.
//
//   node tools/record-scene-studio.mjs ambient <dir> [--seconds 60] [--fps 30] [--seed 21]
//   node tools/record-scene-studio.mjs jump <dir> [--edge floor>chairL] [--cat 0] [--hz 240] [--seed 21]
//
// A passing gate is not evidence that the scene reads well, so this makes the
// thing itself: frames of the REAL page (/scene.html?scene=4), and, where
// ffmpeg is on the path, a video of them.
//
// THE FRAMES ARE EXACT, NOT SAMPLED FROM A LIVE PAGE. The shell's own loop is
// paused; each frame advances the scene by exactly 1/fps of simulated time
// (through the scene's __pump, in its own 1/120 s slices) and is redrawn once
// (the shell's `step`) before it is photographed. So 60 s of video is 60 s of
// the cats' time, at real speed, with no frame lost to a slow screenshot —
// which a screen recording of headless Chromium cannot promise.
//
//   ambient   the cats left alone: the director, as the page runs it
//   jump      one leg, forced by the dev harness from a still room, captured at
//             `hz` frames a second (240 by default) and written as a video that
//             plays at a quarter speed, plus a strip of every 8th frame
//
// Nothing here is a gate. tools/verify-scene-studio.mjs is.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const mode = argv[0];
const OUT = path.resolve(argv[1] || 'studio-recording');
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
if (!['ambient', 'jump'].includes(mode)) { console.error('usage: record-scene-studio.mjs ambient|jump <dir> [...]'); process.exit(2); }
fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  for (const root of [...(process.env.NODE_PATH || '').split(path.delimiter), '/opt/node22/lib/node_modules', '/usr/lib/node_modules']) {
    if (root && fs.existsSync(path.join(root, 'playwright', 'index.js'))) return require(path.join(root, 'playwright'));
  }
  return require('playwright');
}
function serve() {
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    const f = path.join(REPO, rel);
    if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(fs.readFileSync(f));
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}
const hasFfmpeg = () => { try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } };

const server = await serve();
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const W = 1280, H = 800;
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, body: '' }));
const dev = '';   // the dev harness's commands work without its panel or overlay
await page.goto(`http://127.0.0.1:${server.address().port}/scene.html?scene=4&seed=${opt('seed', 21)}${dev}`);
await page.waitForFunction(() => window.__scene && window.__scene.activeId === 4 && window.__scene.frames > 5);
await page.evaluate(() => { window.__scene.pause(true); const p = document.querySelector('.scene-dev'); if (p) p.style.display = 'none'; });
const frame = (n) => path.join(OUT, 'frames', `f${String(n).padStart(5, '0')}.png`);

if (mode === 'ambient') {
  const secs = +opt('seconds', 60), fps = +opt('fps', 30);
  const log = [];
  for (let n = 0; n < secs * fps; n++) {
    await page.evaluate((dt) => { window.__scene.scenePump(dt); window.__scene.step(); }, 1 / fps);
    await page.screenshot({ path: frame(n) });
    if (n % fps === 0) {
      const st = await page.evaluate(() => window.__scene.sceneState());
      log.push(`${st.t.toFixed(1)} s  ` + st.cats.map(c => `${c.id}: ${c.node} ${c.action || (c.asleep ? 'asleep' : '-')}${c.phase ? '/' + c.phase : ''}`).join('   '));
    }
  }
  fs.writeFileSync(path.join(OUT, 'timeline.txt'), log.join('\n') + '\n');
  const st = await page.evaluate(() => window.__scene.sceneState());
  fs.writeFileSync(path.join(OUT, 'director-log.json'), JSON.stringify(st.log, null, 1));
  if (hasFfmpeg()) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(OUT, 'frames', 'f%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', path.join(OUT, 'ambient.mp4')]);
  console.log(`${secs * fps} frames, ${secs} s at ${fps} fps -> ${OUT}${hasFfmpeg() ? '/ambient.mp4' : ''}`);
} else {
  const edge = opt('edge', 'floor>chairL'), cat = +opt('cat', 0), hz = +opt('hz', 240);
  await page.evaluate(() => window.__scene.sceneQuery('dev', { op: 'hold', on: true }));
  // the other cat sits still; the forced cat is routed to the edge's start if need be
  const r = await page.evaluate(([c, e]) => window.__scene.sceneQuery('dev', { op: 'force', cat: c, edge: e }), [cat, edge]);
  if (!/^ok/.test(r)) throw new Error(r);
  // run any leg that gets it to the edge's start, then record the edge itself
  for (let g = 0; g < 60 * 120; g++) {
    const st = await page.evaluate(() => window.__scene.sceneState());
    if (st.cats[cat].edge === edge) break;
    await page.evaluate(() => { window.__scene.scenePump(1 / 120); window.__scene.step(); });
  }
  // frame the whole leg: the cat's bounds over the leg, padded
  let box = null, n = 0;
  const seen = [];
  for (;;) {
    const st = await page.evaluate((c) => { const s = window.__scene.sceneState(); const b = window.__scene.sceneQuery('dev', { op: 'bounds', cat: c }); return { e: s.cats[c].edge, b }; }, cat);
    seen.push(st.b);
    if (st.e !== edge && n > 10) break;
    // (step() redraws, which is what refreshes the rig the bounds are read from)
    await page.evaluate((dt) => { window.__scene.scenePump(dt, dt); window.__scene.step(); }, 1 / hz);
    n++;
    if (n > hz * 20) break;
  }
  for (const b of seen) box = box ? { x0: Math.min(box.x0, b.x0), y0: Math.min(box.y0, b.y0), x1: Math.max(box.x1, b.x1), y1: Math.max(box.y1, b.y1) } : { ...b };
  // second pass: replay the leg from its snapshot (the dev harness's replay is
  // exact) and photograph every step
  await page.evaluate(() => window.__scene.sceneQuery('dev', { op: 'replay' }));
  await page.evaluate(() => window.__scene.pause(true));
  const pad = 24;
  const clip = { x: Math.max(0, Math.floor(box.x0 - pad)), y: Math.max(0, Math.floor(box.y0 - pad)) };
  clip.width = Math.min(W - clip.x, Math.ceil(box.x1 - box.x0 + 2 * pad)); clip.height = Math.min(H - clip.y, Math.ceil(box.y1 - box.y0 + 2 * pad));
  clip.width -= clip.width % 2; clip.height -= clip.height % 2;
  const phases = [];
  for (let k = 0; k < n; k++) {
    await page.evaluate((dt) => { window.__scene.scenePump(dt, dt); window.__scene.step(); }, 1 / hz);
    await page.screenshot({ path: frame(k), clip });
    const st = await page.evaluate((c) => window.__scene.sceneState().cats[c], cat);
    phases.push(`${(k / hz).toFixed(4)} s  ${st.phase || '-'}`);
  }
  fs.writeFileSync(path.join(OUT, 'phases.txt'), phases.join('\n') + '\n');
  if (hasFfmpeg()) {
    // played at 60 fps: a quarter of real speed for 240 Hz frames
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(OUT, 'frames', 'f%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', path.join(OUT, `jump-${hz}hz-quarter-speed.mp4`)]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(hz), '-i', path.join(OUT, 'frames', 'f%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-r', String(hz), path.join(OUT, `jump-${hz}hz-real-speed.mp4`)]);
  }
  console.log(`${n} frames of ${edge} at ${hz} Hz (${(n / hz).toFixed(2)} s) -> ${OUT}`);
}
await browser.close();
server.close();
