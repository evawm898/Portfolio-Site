#!/usr/bin/env node
// verify-page.mjs — the dyeing section's playback, in a real browser at 1280 and 390.
//   NODE_PATH=/opt/node22/lib/node_modules node tools/dyeing-proto/verify-page.mjs [page]
// page defaults to the prototype (tools/dyeing-proto/index.html). Per width:
//   * nothing plays before it is scrolled to; each scene plays once on scroll-in and rests on
//     exactly the reduced-motion end frame (markup + the svg's colour variables, compared
//     character for character);
//   * a scene scrolled away mid-play stops and jumps to its end frame;
//   * hover (desktop) / tap (phone) replays and comes back to rest on the end frame;
//   * the controls: every stage button replays the chain and lands on that stage's reduced-motion
//     frame, the caption and the meters follow it, and the two cross-dyeing toggles do the same;
//   * colour has one owner: no scene's markup names a hex colour for a dye — every dye stroke
//     reads var(--dye-*), and changing --dye-acid on the section recolours the nylon;
//   * no page errors, no horizontal scroll.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = createRequire(REPO + '/tools/x.mjs')('playwright');
const { findChromium } = await import(REPO + '/tools/chromium-harness.mjs');
const PAGE = process.argv[2] || 'tools/dyeing-proto/index.html';
const server = http.createServer((q, r) => { const p = path.join(REPO, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const url = `http://localhost:${server.address().port}/${PAGE}`;
const b = await chromium.launch({ executablePath: findChromium() });
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const sig = (page, n) => page.$eval(`[data-dye-scene="${n}"] svg`, s => (s.getAttribute('style') || '') + '|' + s.innerHTML);
const open = async (w, h, extra = {}) => {
  const page = await b.newPage({ viewport: { width: w, height: h }, ...extra });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(url); await page.waitForTimeout(400);
  return { page, errs };
};
const N = 13;
for (const [w, h] of [[1280, 900], [390, 844]]) {
  const phone = w < 600;
  const { page, errs } = await open(w, h, phone ? { hasTouch: true, isMobile: true } : {});
  const { page: ref } = await open(w, h, { reducedMotion: 'reduce' });
  const names = await page.$$eval('[data-dye-scene]', es => es.map(e => e.dataset.dyeScene));
  ok(names.length === N, `${w}px ${N} scenes on the page (${names.join(' ')})`);
  const durs = await page.evaluate(() => Object.fromEntries((window.__dy || []).map(p => [p.name, p.scene.duration])));
  const before = {}; for (const n of names) before[n] = await sig(page, n);
  // scroll-in plays once and lands on the reduced-motion frame
  for (const n of names) {
    await page.$eval(`[data-dye-scene="${n}"]`, e => e.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout((durs[n] || 8000) + 600);
    const end = await sig(page, n), r = await sig(ref, n);
    ok(end === r, `${w}px ${n}: played on scroll-in and holds its end frame (= the reduced-motion frame)`);
    ok(before[n] !== end, `${w}px ${n}: the frame before scroll-in is not the end frame`);
  }
  // scrolled away mid-play: stops and jumps to the end
  const n = 'cross', el = await page.$(`[data-dye-scene="${n}"]`);
  await el.scrollIntoViewIfNeeded();
  if (!phone) { await page.mouse.move(5, 5); await el.hover(); } else await el.tap();
  await page.waitForTimeout(600);
  ok(await sig(page, n) !== await sig(ref, n), `${w}px ${n}: hover/tap replays (mid-animation 600 ms later)`);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(600);
  const playing = await page.evaluate(n => window.__dy.find(p => p.name === n).playing, n);
  ok(!playing && await sig(page, n) === await sig(ref, n), `${w}px ${n}: scrolled off screen mid-play, it stops and shows its end frame`);
  // controls: each stage, and each toggle, replays and lands on the reduced-motion frame of that state
  const stages = await page.$$eval('[data-dye-for="chain"]', es => es.map(e => e.dataset.dyeValue));
  for (const st of stages) {
    const sel = `[data-dye-for="chain"][data-dye-value="${st}"]`;
    await page.$eval(sel, e => e.scrollIntoView({ block: 'center' }));
    await page.click(sel); await ref.click(sel);
    await page.waitForTimeout(400);
    const mid = await sig(page, 'chain');
    await page.waitForTimeout(durs.chain + 400);
    const end = await sig(page, 'chain'), r = await sig(ref, 'chain');
    const cap = await page.$$eval('[data-stage-copy]', es => es.filter(e => !e.hidden).map(e => e.dataset.stageCopy));
    const pressed = await page.$$eval('[data-dye-for="chain"][aria-pressed="true"]', es => es.map(e => e.dataset.dyeValue));
    ok(mid !== end && end === r && cap.join() === st && pressed.join() === st, `${w}px stage ${st}: replays, lands on its end frame, caption and button follow`);
  }
  const pips = await page.$$eval('[data-meter] i.on', es => es.length);
  ok(pips === stages.length + 1, `${w}px the two meters always light ${stages.length + 1} pips between them (${pips})`);
  for (const key of ['reserve', 'reality']) {
    for (const pg of [page, ref]) await pg.click(`[data-dye-for="cross"][data-dye-key="${key}"]`);
    await page.waitForTimeout(durs.cross + 400);
    const note = await page.$eval(`[data-cross-note="${key}"]`, e => !e.hidden);
    ok(await sig(page, 'cross') === await sig(ref, 'cross') && note, `${w}px toggle ${key} on: replays to its end frame, its note shows`);
    for (const pg of [page, ref]) await pg.click(`[data-dye-for="cross"][data-dye-key="${key}"]`);
    await page.waitForTimeout(durs.cross + 400);
  }
  ok(await page.$eval('[data-cross-note="reality"]', e => e.textContent.trim() === ''), `${w}px the poly/nylon Reality copy slot is still empty (row 15 is Eva's)`);
  // colour has one owner
  const hexDye = await page.$$eval('[data-dye-scene] svg', ss => ss.flatMap(s => (s.innerHTML.match(/#(e3a44a|a98ce6|c9604e|d97757|b8a6f0)/gi) || [])));
  ok(hexDye.length === 0, `${w}px no dye hex in any scene's markup (${hexDye.length})`);
  const recolour = await page.evaluate(() => {
    const sec = document.getElementById('dyeing'), svg = document.querySelector('[data-dye-scene="cross"] svg');
    const yarn = svg.querySelector('path[stroke="var(--cn)"]'); const a = getComputedStyle(yarn).stroke;
    sec.style.setProperty('--dye-acid', 'rgb(0, 255, 0)'); const b = getComputedStyle(yarn).stroke; sec.style.removeProperty('--dye-acid');
    return [a, b];
  });
  ok(recolour[0] !== recolour[1] && /0, 255, 0/.test(recolour[1]), `${w}px changing --dye-acid on the section recolours the nylon (${recolour.join(' -> ')})`);
  // the lead animation's layout: a row of four on wide screens, a 2 x 2 grid under 560 px
  const lay = await page.evaluate(() => {
    const p = window.__dy.find(q => q.name === 'chain'), svg = p.svg, vb = svg.viewBox.baseVal, r = svg.getBoundingClientRect();
    const panel = r.width * 140 / vb.width;
    const html = getComputedStyle(document.querySelector('.tx-dye__labels')).display !== 'none';
    const svgLabels = [...svg.querySelectorAll('text')].map(t => t.textContent);
    return { layout: p.state.layout, panel, html, svgLabels };
  });
  if (phone) ok(lay.layout === 'grid' && lay.panel >= 130 && !lay.html && lay.svgLabels.length === 4 && lay.svgLabels.filter(t => /dye here/.test(t)).length === 1,
    `${w}px chain is a 2 x 2 grid: panels ${lay.panel.toFixed(0)} px wide, its own four labels (${lay.svgLabels.join(' / ')}), the HTML row hidden`);
  else ok(lay.layout === 'row' && !lay.svgLabels.length && lay.html, `${w}px chain is one row of four (panels ${lay.panel.toFixed(0)} px), labels in the HTML row`);
  const btnsAbove = await page.evaluate(() => document.querySelector('.tx-dye__stages').getBoundingClientRect().bottom <= document.querySelector('[data-dye-scene="chain"]').getBoundingClientRect().top);
  ok(btnsAbove, `${w}px the stage buttons sit above the chain`);
  ok(errs.length === 0, `${w}px no page errors${errs.length ? ': ' + errs.join(' | ') : ''}`);
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(scrollW <= w, `${w}px no horizontal scroll (scrollWidth ${scrollW})`);
  await page.close(); await ref.close();
}
// resizing across 560 px switches the chain's layout in place
{
  const { page, errs } = await open(1280, 900);
  const lay = () => page.evaluate(() => { const p = window.__dy.find(q => q.name === 'chain'); return p.state.layout + ' ' + p.svg.getAttribute('viewBox'); });
  const a = await lay(); await page.setViewportSize({ width: 400, height: 900 }); await page.waitForTimeout(300);
  const c = await lay(); await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(300);
  const d = await lay();
  ok(/^row 0 0 640/.test(a) && /^grid 0 0 330/.test(c) && /^row 0 0 640/.test(d) && !errs.length, `resize 1280 -> 400 -> 1280: chain ${a} -> ${c} -> ${d}`);
  await page.close();
}
await b.close(); server.close();
console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0);
