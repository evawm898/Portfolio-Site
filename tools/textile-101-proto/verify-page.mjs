#!/usr/bin/env node
// verify-page.mjs — Textile 101's section figures (sections 02, 03, 08: [data-tx-fig]) and the
// section 09 knit panels, in a real browser at 1280 and 390.
//   NODE_PATH=/opt/node22/lib/node_modules node tools/textile-101-proto/verify-page.mjs [page]
// Per width: nothing has played before it is scrolled to; each figure plays once on scroll-in and
// rests on exactly the reduced-motion frame; scrolled away mid-play it jumps to its end; hover /
// tap replays; the knit panels draw on once, hold, and replay; no draw-on loops for ever; every
// SVG colour is a token; no page errors; no horizontal scroll.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = createRequire(REPO + '/tools/x.mjs')('playwright');
const { findChromium } = await import(REPO + '/tools/chromium-harness.mjs');
const PAGE = process.argv[2] || 'textile-101.html';
const server = http.createServer((q, r) => { const p = path.join(REPO, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const url = `http://localhost:${server.address().port}/${PAGE}`;
const b = await chromium.launch({ executablePath: findChromium() });
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const sig = (page, n) => page.$eval(`[data-tx-fig="${n}"] svg`, s => s.getAttribute('viewBox') + '|' + s.innerHTML);
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
  const names = await page.$$eval('[data-tx-fig]', es => es.map(e => e.dataset.txFig));
  ok(names.length === 12, `${w}px twelve figures on the page (${names.join(' ')})`);
  const durs = await page.evaluate(() => Object.fromEntries((window.__tf || []).map(p => [p.host.dataset.txFig, p.scene.duration])));
  const before = {}; for (const n of names) before[n] = await sig(page, n);
  ok(names.filter(n => before[n] !== '').length === names.length, `${w}px every scene draws a first frame before it plays`);
  for (const n of names) {
    await page.$eval(`[data-tx-fig="${n}"]`, e => e.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout((durs[n] || 8000) + 1800);   // the page scrolls smoothly: a long scroll takes a while to arrive
    const end = await sig(page, n), r = await sig(ref, n);
    ok(end === r, `${w}px ${n}: played on scroll-in and holds its end frame (= the reduced-motion frame)`);
    ok(before[n] !== end, `${w}px ${n}: the frame before scroll-in is not the end frame`);
  }
  // scrolled away mid-play: stops and jumps to the end
  const n = 'weave-twill', el = await page.$(`[data-tx-fig="${n}"]`);
  await el.scrollIntoViewIfNeeded();
  if (!phone) { await page.mouse.move(5, 5); await el.hover(); } else await el.tap();
  await page.waitForTimeout(500);
  const mid = await sig(page, n);
  ok(mid !== await sig(ref, n), `${w}px ${n}: hover/tap replays (mid-animation 500 ms later)`);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(600);
  const playing = await page.evaluate(n => window.__tf.find(p => p.host.dataset.txFig === n).playing, n);
  ok(!playing && await sig(page, n) === await sig(ref, n), `${w}px ${n}: scrolled off screen mid-play, it stops and shows its end frame`);
  await el.scrollIntoViewIfNeeded();
  if (!phone) { await page.mouse.move(5, 5); await el.hover(); } else await el.tap();
  await page.waitForTimeout(durs[n] + 700);
  ok(await sig(page, n) === await sig(ref, n), `${w}px ${n}: a replay comes back to rest on the end frame`);
  // section 09: the knit panels draw on once and hold
  const knit = await page.$('.tx-diagram--knit');
  const kstate = () => page.$eval('.tx-diagram--knit', e => ({ cls: e.className, off: getComputedStyle(e.querySelector('.yarn-path')).strokeDashoffset, iter: getComputedStyle(e.querySelector('.yarn-path')).animationIterationCount }));
  ok((await kstate()).off === '900px', `${w}px knit: not drawn before it is scrolled to`);
  await knit.scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
  const kmid = await kstate();
  ok(/is-playing/.test(kmid.cls) && kmid.iter === '1', `${w}px knit: plays on scroll-in, once (iteration count ${kmid.iter})`);
  await page.waitForTimeout(3600);
  const kend = await kstate();
  ok(/is-done/.test(kend.cls) && !/is-playing/.test(kend.cls) && kend.off === '0px', `${w}px knit: holds the finished drawing`);
  ok(await ref.$eval('.tx-diagram--knit', e => !e.classList.contains('is-armed') && getComputedStyle(e.querySelector('.yarn-path')).strokeDashoffset === '0px'), `${w}px knit: reduced motion shows the finished drawing`);
  if (!phone) { await page.mouse.move(5, 5); await knit.hover(); } else await knit.tap();
  await page.waitForTimeout(300);
  ok(/is-playing/.test((await kstate()).cls), `${w}px knit: hover/tap replays`);
  const hexes = await page.$$eval('[data-tx-fig] svg', es => es.flatMap(e => [...e.innerHTML.matchAll(/(?:stroke|fill|stop-color)="(#[0-9a-fA-F]{3,8})"/g)].map(m => m[1])).filter(h => !/^#(000|fff)$/i.test(h)));
  ok(hexes.length === 0, `${w}px figures draw in tokens only (hex colours outside masks: ${[...new Set(hexes)].join(' ') || 'none'})`);
  ok(errs.length === 0, `${w}px no page errors${errs.length ? ': ' + errs.join(' | ') : ''}`);
  const fill = await page.$$eval('[data-tx-fig]:not(.tx-weave) .tx-anim', es => es.map(e => (e.getBoundingClientRect().width / e.parentElement.getBoundingClientRect().width).toFixed(2)));
  ok(fill.every(f => +f > 0.85), `${w}px animations fill their cells (width share ${[...new Set(fill)].join(' ')})`);
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(scrollW <= w, `${w}px no horizontal scroll (scrollWidth ${scrollW})`);
  await page.close(); await ref.close();
}
await b.close(); server.close();
console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0);
