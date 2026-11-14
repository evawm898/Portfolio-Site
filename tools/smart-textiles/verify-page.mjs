#!/usr/bin/env node
// verify-page.mjs — the Smart Textiles field note (/smart-textiles.html) in a real browser, at 1280 and 390.
//   NODE_PATH=/opt/node22/lib/node_modules node tools/smart-textiles/verify-page.mjs [--negative-control]
// Per width:
//   S1  every [data-st] host has a scene, and the page has the expected number of them
//   S2  NOTHING IS STATIC (Eva's ruling): each scene, scrolled to, draws different markup 400 ms apart, and
//       keeps doing so across a whole second; and, stepping each loop in 120 frames, no stretch of it
//       longer than 300 ms draws the same frame twice
//   S3  a scene far off screen does not redraw (the loop draws only what is visible)
//   S4  every <text> of every scene, at 20 points in its loop, lies inside the scene's viewBox
//   S5  no NaN / undefined in any scene's markup, and no hex colour outside a <mask> or a var() fallback
//       (colour has one owner: var(--st-*) and the site tokens)
//   S6  the wrapped yarn's cover toggle changes the drawing and its aria-pressed pair
//   S7  prefers-reduced-motion: every scene draws one still frame and holds it; a click plays it
//   S8  no page errors, no horizontal scroll
//   S9  the corrected copy, as served: none of the audit's wrong statements in the page text or any scene's
//       drawing (heater power at a fixed voltage, carbon composites, capacitive drift, the antenna's frequency,
//       thermoelectric µV per leg, C written without εᵣ), and the corrections present
//   S10 every toggle button is at least 32 px tall at 1280 and 44 px at 390
//   S11 diagram text: a diagram whose smallest label renders under 10 px has an Enlarge button (at 390 that is
//       every one, the tiers and the conductivity ladder included); the enlarged view is the same live drawing
//       with every label at 10 px or more, pans to all of it, and closes back to its button
// --negative-control re-serves the page with the player's draw loop removed (a page of still frames) and
// requires S2 to fail; then with one scene's label pushed outside its frame and requires S4 to fail.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const N_SCENES = 38;

function serve(patch = {}) {
  const server = http.createServer((q, r) => {
    const rel = decodeURIComponent(q.url.split('?')[0]).replace(/^\//, ''), p = path.join(REPO, rel);
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    let body = fs.readFileSync(p);
    if (patch[rel]) { const s = body.toString(), [from, to] = patch[rel]; if (!s.includes(from)) throw new Error(`patch anchor missing in ${rel}`); body = Buffer.from(s.replace(from, to)); }
    r.writeHead(200, { 'content-type': { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' });
    r.end(body);
  }).listen(0);
  return server;
}

async function run(patch = {}, quiet = false) {
  const server = serve(patch), url = `http://localhost:${server.address().port}/smart-textiles.html`;
  const b = await chromium.launch();
  const fails = new Set(); let bad = 0;
  const ok = (id, c, m) => { if (!quiet) console.log((c ? 'ok   ' : 'FAIL ') + id + ' ' + m); if (!c) { bad++; fails.add(id); } };
  const open = async (w, h, extra = {}) => {
    const page = await b.newPage({ viewport: { width: w, height: h }, ...extra });
    const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await page.goto(url); await page.waitForTimeout(500);
    return { page, errs };
  };
  const sig = (page, n) => page.$eval(`[data-st="${n}"] svg`, s => s.innerHTML);
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const phone = w < 600;
    const { page, errs } = await open(w, h, phone ? { hasTouch: true, isMobile: true } : {});
    const names = await page.$$eval('[data-st]', es => es.map(e => e.dataset.st));
    const known = await page.evaluate(() => (window.__st || []).map(p => p.name));
    ok('S1', names.length === N_SCENES && names.every(n => known.includes(n)), `${w}px ${names.length} scene hosts, ${known.length} mounted (want ${N_SCENES})`);
    // S2 / S4 / S5, scene by scene
    const still = [], frozen = [], outside = [], dirty = [], stalls = [];
    for (const n of names) {
      await page.$eval(`[data-st="${n}"]`, e => e.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(250);
      const a = await sig(page, n); await page.waitForTimeout(400); const bb = await sig(page, n);
      if (a === bb) still.push(n);
      await page.waitForTimeout(600); const c = await sig(page, n);
      if (c === bb) frozen.push(n);
      // S4: draw five frames directly and measure every label
      const out = await page.evaluate(n => {
        const p = window.__st.find(q => q.name === n), [x0, y0, vw, vh] = p.scene.vb.split(' ').map(Number), bad = [];
        const wasRunning = p.running; p.running = false;
        for (let i = 0; i < 20; i++) { const t = (i + 0.5) / 20;
          p.draw(t);
          for (const tx of p.svg.querySelectorAll('text')) {
            if (!tx.textContent.trim()) continue;
            const r = tx.getBBox(), op = +(tx.getAttribute('fill-opacity') ?? 1);
            if (op < 0.05) continue;
            if (r.x < x0 - 1 || r.y < y0 - 1 || r.x + r.width > x0 + vw + 1 || r.y + r.height > y0 + vh + 1) bad.push(`t=${t} "${tx.textContent.trim().slice(0, 30)}"`);
          }
        }
        // the longest stretch of the loop over which consecutive frames are identical (ms)
        let prev = null, run = 0, worst = 0; const K = 120, dt = p.scene.dur / K;
        for (let k = 0; k <= K; k++) { const m = p.scene.draw(k / K, p.state); if (m === prev) { run += dt; worst = Math.max(worst, run); } else run = 0; prev = m; }
        p.running = wasRunning;
        return { bad, worst };
      }, n);
      if (out.worst > 300) stalls.push(`${n} ${Math.round(out.worst)} ms`);
      if (out.bad.length) outside.push(`${n}: ${out.bad[0]}${out.bad.length > 1 ? ` (+${out.bad.length - 1})` : ''}`);
      // a hex inside a var() fallback is a safety value, not a colour choice; anything else is
      const m = c.replace(/<mask[\s\S]*?<\/mask>/g, '').replace(/var\(--[\w-]+,\s*#[0-9a-fA-F]{3,8}\)/g, '');
      if (/NaN|undefined/.test(c) || /#[0-9a-fA-F]{3,8}\b/.test(m)) dirty.push(n);
    }
    ok('S2', still.length === 0, `${w}px every scene moves while on screen${still.length ? ' — still: ' + still.join(' ') : ''}`);
    ok('S2', frozen.length === 0, `${w}px every scene keeps moving a second later${frozen.length ? ' — frozen: ' + frozen.join(' ') : ''}`);
    ok('S2', stalls.length === 0, `${w}px no scene holds a still frame for more than 300 ms anywhere in its loop${stalls.length ? ' — ' + stalls.join('; ') : ''}`);
    ok('S4', outside.length === 0, `${w}px every label sits inside its frame, 20 points in each loop${outside.length ? ' — ' + outside.join('; ') : ''}`);
    ok('S5', dirty.length === 0, `${w}px no NaN/undefined and no hex colour outside a mask${dirty.length ? ' — ' + dirty.join(' ') : ''}`);
    // S3: scroll to the top; the last scene is far away and must not redraw
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
    const far = names[names.length - 1], f1 = await sig(page, far); await page.waitForTimeout(700);
    ok('S3', f1 === await sig(page, far), `${w}px an off-screen scene (${far}) does not redraw`);
    // S6: the cover toggle
    await page.$eval('[data-st="wrapped"]', e => e.scrollIntoView({ block: 'center' }));
    const before = await page.evaluate(() => window.__st.find(p => p.name === 'wrapped').scene.draw(0.4, { cover: 'single' }));
    await page.click('[data-st-for="wrapped"][data-st-value="double"]'); await page.waitForTimeout(100);
    const st = await page.evaluate(() => window.__st.find(p => p.name === 'wrapped').state.cover);
    const after = await page.evaluate(() => window.__st.find(p => p.name === 'wrapped').scene.draw(0.4, { cover: 'double' }));
    const pressed = await page.$$eval('[data-st-for="wrapped"]', bs => bs.map(b => b.getAttribute('aria-pressed')).join(','));
    ok('S6', st === 'double' && before !== after && pressed === 'false,true', `${w}px double cover: state ${st}, drawing changes, buttons ${pressed}`);
    // S9 the corrected copy, in the page text and in every scene's drawing at three points in its loop
    const s9 = await page.evaluate(() => {
      const svgs = window.__st.map(p => [0.15, 0.5, 0.85].map(t => p.scene.draw(t, { ...p.state })).join(' ')).join(' ');
      const all = document.body.innerText + ' ' + svgs;
      const FORBID = [/C = εA/, /in proportion to its resistance and the square/, /Carbon composites do the opposite and drop/, /No current flows through the stack, so it drifts less/, /patch size and the felt/, /patch size and felt thickness/, /Tens of microvolts per degree per leg:/, /the yarn’s own resistance makes/];
      const NEED = [/V²\/R/, /bismuth telluride/, /felt’s permittivity/, /self-regulating heaters/, /spacer comes back to the same gap/, /ε0εrA \/ d/];
      return { hits: FORBID.filter(re => re.test(all)).map(String), missing: NEED.filter(re => !re.test(all)).map(String) };
    });
    ok('S9', !s9.hits.length && !s9.missing.length, `${w}px wrong statements found: ${s9.hits.join(' ') || 'none'}; corrections missing: ${s9.missing.join(' ') || 'none'}`);
    // S10 toggle buttons
    const minH = w < 700 ? 44 : 32;
    const s10 = await page.$$eval('.st-btn', (bs, min) => bs.filter(b => b.getBoundingClientRect().height && b.getBoundingClientRect().height < min - 0.5).map(b => `${b.textContent.trim()} ${Math.round(b.getBoundingClientRect().height)}px`), minH);
    ok('S10', !s10.length, `${w}px toggle buttons under ${minH} px: ${s10.join(', ') || 'none'}`);
    // S11 the enlarge view
    const s11 = await page.evaluate(async () => {
      const out = { small: 0, btns: 0, noBtn: [], bad: [], names: [] };
      const px = svg => [...svg.querySelectorAll('text')].reduce((m, t) => Math.min(m, +t.getAttribute('font-size') * (t.getScreenCTM()?.a || 0)), Infinity);
      const wait = ms => new Promise(r => setTimeout(r, ms));
      for (const p of window.__st) {
        p.host.scrollIntoView({ block: 'center' }); await wait(30);
        const m = px(p.svg), btn = document.querySelector(`.st-zoom-btn[data-zoom-for="${p.name}"]`);
        if (m >= 9.95) continue;
        out.small++;
        if (!btn || btn.hidden || !btn.getBoundingClientRect().height) { out.noBtn.push(p.name); continue; }
        out.btns++; out.names.push(p.name);
        btn.click(); await wait(150);
        const dlg = document.querySelector('dialog.st-zoom'), body = dlg?.querySelector('.st-zoom__body'), big = body?.querySelector('svg');
        const mm = big ? px(big) : 0, ov = body ? getComputedStyle(body).overflowX : '';
        const pans = !!big && (big.getBoundingClientRect().width <= body.clientWidth + 1 || ov === 'auto' || ov === 'scroll');
        const t0 = big?.innerHTML; await wait(250);
        const live = !!big && big.innerHTML !== t0;
        if (!dlg?.open || mm < 9.95 || !pans || !live) out.bad.push(`${p.name}: open ${!!dlg?.open}, smallest ${mm.toFixed(1)} px, pans ${pans}, live ${live}`);
        dlg?.querySelector('[data-zoom-close]')?.click(); await wait(60);
        if (dlg?.open || document.activeElement !== btn) out.bad.push(`${p.name}: did not close back to its button`);
      }
      return out;
    });
    const s11need = w < 600 ? ['tiers', 'ladder'].filter(n => !s11.names.includes(n)) : [];
    ok('S11', !s11.noBtn.length && !s11.bad.length && !s11need.length, `${w}px ${s11.small} diagrams with a label under 10 px, ${s11.btns} with Enlarge${s11.noBtn.length ? '; no button: ' + s11.noBtn.join(', ') : ''}${s11need.length ? '; missing: ' + s11need.join(', ') : ''}; ${s11.bad.length ? s11.bad.slice(0, 3).join(' | ') : 'each opens live, every label at 10 px or more, pans, closes to its button'}`);
    // S8
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    ok('S8', sw <= w, `${w}px no horizontal scroll (scrollWidth ${sw})`);
    ok('S8', errs.length === 0, `${w}px no page errors${errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''}`);
    await page.close();
    // S7: reduced motion
    const { page: rp, errs: rerrs } = await open(w, h, { reducedMotion: 'reduce' });
    const n0 = 'carbon';
    await rp.$eval(`[data-st="${n0}"]`, e => e.scrollIntoView({ block: 'center' })); await rp.waitForTimeout(300);
    const r1 = await sig(rp, n0); await rp.waitForTimeout(700); const r2 = await sig(rp, n0);
    const allDrawn = await rp.$$eval('[data-st] svg', ss => ss.every(s => s.childElementCount > 0));
    ok('S7', r1 === r2 && allDrawn, `${w}px reduced motion: every scene drawn, and still`);
    await rp.click(`[data-st="${n0}"]`); await rp.waitForTimeout(500);
    ok('S7', await sig(rp, n0) !== r2, `${w}px reduced motion: a click plays the scene`);
    ok('S8', rerrs.length === 0, `${w}px reduced motion: no page errors`);
    await rp.close();
  }
  await b.close(); server.close();
  return { bad, fails };
}

if (process.argv.includes('--negative-control')) {
  let good = 0;
  const legs = [
    ['the draw loop is removed: a page of still frames', { 'smart-textiles-core.js': ['requestAnimationFrame(frame);\n  return players;', 'return players;'] }, 'S2'],
    ['a label is pushed outside its frame', { 'smart-textiles-yarns.js': ["s += tag(18, yc - 52, 'from the carriers');", "s += tag(318, yc - 52, 'from the carriers');"] }, 'S4'],
    ['a hex colour is written into a scene', { 'smart-textiles-sense.js': ['stroke: C.plum, \'stroke-width\': 4.5', "stroke: '#a98cc8', 'stroke-width': 4.5"] }, 'S5'],
    ['the capacitance formula loses εᵣ in a drawing', { 'smart-textiles-sense.js': ["'C = ε₀εᵣA / d'", "'C = εA / d'"] }, 'S9'],
    ['the antenna caption goes back to the felt thickness', { 'smart-textiles-act.js': ["['Frequency: patch length and', 'the felt’s permittivity (εᵣ).',", "['Its frequency is set by the', 'patch size and felt thickness.',"] }, 'S9'],
    ['the heater copy goes back to "in proportion to its resistance"', { 'smart-textiles.html': ['Current through a resistive yarn turns into heat: P = I&sup2;R.', 'Current through a resistive yarn turns into heat, in proportion to its resistance and the square of the current.'] }, 'S9'],
    ['the Enlarge button is never shown', { 'smart-textiles.js': ['const fit = () => { btn.hidden = !(minPx(p) < MIN_TEXT_PX); };', 'const fit = () => { btn.hidden = true; };'] }, 'S11'],
    ['the enlarged view is drawn at the fitted size', { 'smart-textiles.js': ['k = MIN_TEXT_PX * 1.02 / minUnits(p);', 'k = p.svg.getBoundingClientRect().width / vw;'] }, 'S11'],
    ['the enlarged view does not pan', { 'smart-textiles.css': ['.st-zoom__body { overflow: auto;', '.st-zoom__body { overflow: hidden;'] }, 'S11'],
    ['the enlarged view is a still copy', { 'smart-textiles-core.js': ['        if (p.mirror) p.mirror.innerHTML = svg.innerHTML;\n', ''] }, 'S11'],
    ['the toggles lose their touch size', { 'smart-textiles.css': ['  .st-btn { min-height: 44px; padding-top: 0.5rem; padding-bottom: 0.5rem; }\n', ''] }, 'S10'],
  ];
  for (const [name, patch, want] of legs) {
    const { fails } = await run(patch, true);
    const hit = fails.has(want);
    console.log((hit ? 'ok   ' : 'MISS ') + `negative control — ${name}: ${want} ${hit ? 'fired' : 'stayed green'} (failed: ${[...fails].join(' ') || 'nothing'})`);
    if (hit) good++;
  }
  console.log(good === legs.length ? `NEGATIVE CONTROL PASS (${good}/${legs.length})` : `NEGATIVE CONTROL FAIL (${good}/${legs.length})`);
  process.exit(good === legs.length ? 0 : 1);
} else {
  const { bad } = await run();
  console.log(bad ? `FAIL: ${bad} check(s)` : 'PASS');
  process.exit(bad ? 1 : 0);
}
