#!/usr/bin/env node
// verify-page.mjs — the fiber / yarn / structure panel's playback, in a real browser at 1280 and 390.
//   NODE_PATH=/opt/node22/lib/node_modules node tools/textile-taxonomy-proto/verify-page.mjs [page]
// page defaults to the prototype (tools/textile-taxonomy-proto/index.html); pass textile-101.html
// once the panel is on the page. Checks, per width:
//   * nothing has played before it is scrolled to; each scene plays once on scroll-in and rests on
//     exactly the reduced-motion end frame (markup compared character for character);
//   * a scene scrolled away mid-play stops animating and jumps to its end frame;
//   * hover (desktop) / tap (phone) replays, then comes back to rest on the end frame;
//   * no page errors, every animation fills its cell, no horizontal scroll.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = createRequire(REPO + '/tools/x.mjs')('playwright');
const { findChromium } = await import(REPO + '/tools/chromium-harness.mjs');
const PAGE = process.argv[2] || 'tools/textile-taxonomy-proto/index.html';
const server = http.createServer((q, r) => { const p = path.join(REPO, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const url = `http://localhost:${server.address().port}/${PAGE}`;
const b = await chromium.launch({ executablePath: findChromium() });
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const sig = (page, n) => page.$eval(`[data-tx-scene="${n}"] svg`, s => s.getAttribute('viewBox') + '|' + s.innerHTML);
const open = async (w, h, extra = {}) => {
  const page = await b.newPage({ viewport: { width: w, height: h }, ...extra });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(url); await page.waitForTimeout(400);
  return { page, errs };
};
for (const [w, h] of [[1280, 900], [390, 844]]) {
  const phone = w < 600;
  const { page, errs } = await open(w, h, phone ? { hasTouch: true, isMobile: true } : {});
  const { page: ref } = await open(w, h, { reducedMotion: 'reduce' });
  const names = await page.$$eval('[data-tx-scene]', es => es.map(e => e.dataset.txScene));
  ok(names.length === 12, `${w}px twelve scenes on the page (${names.join(' ')})`);
  const durs = await page.evaluate(() => Object.fromEntries((window.__tt || []).map(p => [p.host.dataset.txScene, p.scene.duration])));
  const before = {}; for (const n of names) before[n] = await sig(page, n);
  ok(names.filter(n => before[n] !== '').length === 12, `${w}px every scene draws a first frame before it plays`);
  for (const n of names) {
    await page.$eval(`[data-tx-scene="${n}"]`, e => e.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout((durs[n] || 8000) + 700);
    const end = await sig(page, n), r = await sig(ref, n);
    ok(end === r, `${w}px ${n}: played on scroll-in and holds its end frame (= the reduced-motion frame)`);
    ok(before[n] !== end, `${w}px ${n}: the frame before scroll-in is not the end frame`);
  }
  // scrolled away mid-play: stops and jumps to the end
  const n = 'cord', el = await page.$(`[data-tx-scene="${n}"]`);
  await el.scrollIntoViewIfNeeded();
  if (!phone) { await page.mouse.move(5, 5); await el.hover(); } else await el.tap();
  await page.waitForTimeout(500);
  const mid = await sig(page, n);
  ok(mid !== await sig(ref, n), `${w}px ${n}: hover/tap replays (mid-animation 500 ms later)`);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(600);
  const playing = await page.evaluate(n => window.__tt.find(p => p.host.dataset.txScene === n).playing, n);
  ok(!playing && await sig(page, n) === await sig(ref, n), `${w}px ${n}: scrolled off screen mid-play, it stops and shows its end frame`);
  await el.scrollIntoViewIfNeeded();
  if (!phone) { await page.mouse.move(5, 5); await el.hover(); } else await el.tap();
  await page.waitForTimeout(durs[n] + 700);
  ok(await sig(page, n) === await sig(ref, n), `${w}px ${n}: a replay comes back to rest on the end frame`);
  ok(errs.length === 0, `${w}px no page errors${errs.length ? ': ' + errs.join(' | ') : ''}`);
  const fill = await page.$$eval('[data-tx-scene] .tx-anim', es => es.map(e => (e.getBoundingClientRect().width / e.parentElement.getBoundingClientRect().width).toFixed(2)));
  ok(fill.every(f => +f > 0.85), `${w}px animations fill their cells (width share ${[...new Set(fill)].join(' ')})`);
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(scrollW <= w, `${w}px no horizontal scroll (scrollWidth ${scrollW})`);
  await page.close(); await ref.close();
}
await b.close(); server.close();
console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0);
