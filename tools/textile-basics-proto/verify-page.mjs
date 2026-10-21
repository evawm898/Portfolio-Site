#!/usr/bin/env node
// verify-page.mjs — NODE_PATH=/opt/node22/lib/node_modules node tools/textile-basics-proto/verify-page.mjs
// the real page: scroll-in plays each animation once to its end, hover replays, reduced motion = end frame
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = createRequire(REPO + '/tools/x.mjs')('playwright');
const { findChromium } = await import(REPO + '/tools/chromium-harness.mjs');
const server = http.createServer((q, r) => { const p = path.join(REPO, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const url = `http://localhost:${server.address().port}/textile-101.html`;
const b = await chromium.launch({ executablePath: findChromium() });
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const names = ['fiber', 'yarn', 'fabric', 'knit', 'woven', 'nonwoven'];
const sig = (page, n) => page.$eval(`[data-tx-anim="${n}"] svg`, s => s.innerHTML.length + '|' + s.getAttribute('viewBox') + '|' + [...s.querySelectorAll('[data-p]')].filter(e => e.style.display !== 'none').length);
for (const [w, h] of [[1280, 900], [390, 844]]) {
  const page = await b.newPage({ viewport: { width: w, height: h }, ...(w < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });   // ERR_FAILED: the fonts this harness blocks
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(url);
  const before = {}; for (const n of names) before[n] = await sig(page, n);
  for (const n of names) {
    await page.$eval(`[data-tx-anim="${n}"]`, e => e.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(9500);
  }
  // reference end frames from a reduced-motion page
  const ref = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  await ref.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ref.goto(url); await ref.waitForTimeout(500);
  for (const n of names) {
    const end = await sig(page, n), r = await sig(ref, n);
    ok(end === r, `${w}px ${n}: played on scroll-in and holds its end frame (= the reduced-motion frame)`);
    ok(n === 'fiber' || before[n] !== end, `${w}px ${n}: the frame before scroll-in is not the end frame`);
  }
  // replay on hover (desktop) / tap (phone)
  const n = 'yarn', el = await page.$(`[data-tx-anim="${n}"]`);
  await el.scrollIntoViewIfNeeded();
  if (w > 600) { await page.mouse.move(5, 5); await el.hover(); } else await el.tap();
  await page.waitForTimeout(400);
  ok(await sig(page, n) !== await sig(ref, n), `${w}px ${n}: hover/tap replays (mid-animation 400 ms later)`);
  await page.waitForTimeout(7500);
  ok(await sig(page, n) === await sig(ref, n), `${w}px ${n}: and comes back to rest on the end frame`);
  ok(errs.length === 0, `${w}px no page errors${errs.length ? ': ' + errs.join(' | ') : ''}`);
  // layout: each animation fills its card's width
  const fill = await page.$$eval('.tx-anim', es => es.map(e => (e.getBoundingClientRect().width / e.parentElement.getBoundingClientRect().width).toFixed(2)));
  ok(fill.every(f => +f > 0.85), `${w}px animations fill their cards (width share ${fill.join(' ')})`);
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(scrollW <= w, `${w}px no horizontal scroll (scrollWidth ${scrollW})`);
  await page.close(); await ref.close();
}
await b.close(); server.close();
console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0);
