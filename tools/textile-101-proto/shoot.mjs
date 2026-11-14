#!/usr/bin/env node
// shoot.mjs — screenshots and recordings of Textile 101's sections 02-09.
//   NODE_PATH=/opt/node22/lib/node_modules node tools/textile-101-proto/shoot.mjs <outdir> [--tag=after] [--page=textile-101.html] [--video]
// Per section and width (1280, 390): <tag>-<section>-<width>.png, taken with reduced motion (every
// figure on its end frame). --video adds <figure>.mp4 for every [data-tx-fig] figure, rendered
// frame by frame by seeking the scene's own t at 30 fps (the scene's timing, not this machine's),
// plus the knit diagram's play-once draw-on recorded live. Needs playwright; --video needs ffmpeg.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = createRequire(REPO + '/tools/x.mjs')('playwright');
const { findChromium } = await import(REPO + '/tools/chromium-harness.mjs');
const args = process.argv.slice(2), out = path.resolve(args.find(a => !a.startsWith('--')) || 'shots');
const opt = k => (args.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1];
const TAG = opt('tag') || 'after', PAGE = opt('page') || 'textile-101.html', VIDEO = args.includes('--video');
fs.mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = http.createServer((q, r) => { const p = path.join(REPO, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
await new Promise(r => server.once('listening', r));
const url = `http://localhost:${server.address().port}/${PAGE}`;
const b = await chromium.launch({ executablePath: findChromium() });
const SECTIONS = ['fibers', 'cross-sections', 'yarn-types', 'yarn-spec', 'wovens-knits-nonwovens', 'wovens-vs-knits', 'warp-weft', 'weft-warp-knit'];
for (const [w, h] of [[1280, 900], [390, 844]]) {
  const page = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce', deviceScaleFactor: w < 600 ? 2 : 1 });
  await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready); await page.waitForTimeout(500);
  await page.addStyleTag({ content: '.back-to-top{display:none!important}' });
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
  for (const id of SECTIONS) {
    const el = await page.$('#' + id); if (!el) { console.log('missing #' + id); continue; }
    await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
    await el.screenshot({ path: path.join(out, `${TAG}-${id}-${w}.png`) });
  }
  console.log(`${w}px: ${SECTIONS.length} sections -> ${out}`);
  await page.close();
}
if (VIDEO) {
  const page = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(url + '?still', { waitUntil: 'networkidle' }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.addStyleTag({ content: '.back-to-top{display:none!important}' });
  const figs = await page.evaluate(() => (window.__tf || []).map(p => ({ name: p.host.dataset.txFig, duration: p.scene.duration })));
  for (const f of figs) {
    const dir = fs.mkdtempSync(path.join(out, 'f-')), el = await page.$(`[data-tx-fig="${f.name}"]`);
    await el.scrollIntoViewIfNeeded();
    const n = Math.ceil(f.duration / 1000 * 30), hold = 30;
    for (let i = 0; i <= n + hold; i++) {
      await page.evaluate(([name, t]) => window.__tf.find(p => p.host.dataset.txFig === name).seek(t), [f.name, Math.min(1, i / n)]);
      await el.screenshot({ path: path.join(dir, String(i).padStart(4, '0') + '.png') });
    }
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(dir, '%04d.png'), '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-pix_fmt', 'yuv420p', path.join(out, f.name + '.mp4')]);
    fs.rmSync(dir, { recursive: true });
    console.log('video ' + f.name);
  }
  await page.close();
}
await b.close(); server.close();
