#!/usr/bin/env node
// verify-study.mjs — the Smart Textiles study session (/smart-textiles-study.html) in a real browser, at 1280
// and 390.
//   NODE_PATH=/opt/node22/lib/node_modules node tools/smart-textiles/verify-study.mjs [--negative-control]
// Per width:
//   V1  every [data-st] host has a scene; 18 mounted
//   V2  every scene, scrolled to, draws different markup 400 ms apart, and no stretch of any loop longer than
//       300 ms draws the same frame twice (nothing is static)
//   V3  every <text> of every scene lies inside its viewBox, at 12 points in the loop, with every lab slider
//       at its minimum and at its maximum and every lab toggle in each position
//   V4  no NaN / undefined in any scene's markup, and no hex colour (colour has one owner)
//   V5  each lab slider writes its scene's state, its read-out, and changes the drawing
//   V6  a mnemonic card: "Show the line" reveals the hook; "Got it" raises its box in storage
//   V7  a chapter check: Next is hidden until the question is answered; the answer marks right and wrong and
//       shows the explanation
//   V8  Pick the Metal scores the best option 2; Which Sensor counts a right answer
//   V9  Build the Stack: a wrong layer is refused with feedback and placed nothing; the true order builds it;
//       the heated panel's two TPU films are interchangeable
//   V10 the mixed round is 10 questions and a question missed last time comes first
//   V11 progress survives a reload
//   V12 no page errors, no horizontal page scroll
// --negative-control re-serves the page with a defect planted, one at a time, and requires the named check
// to fail: storage never written (V6, V11), the Next button shown early (V7), Build the Stack accepting any
// layer (V9), a slider that writes nothing (V5), the mixed round unranked (V10).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const DATA = await import(pathToFileURL(path.join(REPO, 'smart-textiles-study-data.js')).href);
const N_SCENES = 18;

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
  const server = serve(patch), url = `http://localhost:${server.address().port}/smart-textiles-study.html`;
  const b = await chromium.launch();
  const fails = new Set(); let bad = 0;
  const ok = (id, c, m) => { if (!quiet) console.log((c ? 'ok   ' : 'FAIL ') + id + ' ' + m); if (!c) { bad++; fails.add(id); } };
  try {
    for (const [w, h] of [[1280, 900], [390, 844]]) {
      const ctx = await b.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
      page.on('dialog', d => d.accept());
      await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
      await page.goto(url); await page.waitForTimeout(500);
      const names = await page.$$eval('[data-st]', es => es.map(e => e.dataset.st));
      const known = await page.evaluate(() => (window.__sxPlayers || []).map(p => p.name));
      ok('V1', names.length === N_SCENES && names.every(n => known.includes(n)), `${w}px ${names.length} hosts, ${known.length} mounted`);

      // V2 motion
      const still = [];
      for (const n of names) {
        await page.$eval(`[data-st="${n}"]`, e => e.scrollIntoView({ block: 'center' }));
        await page.waitForTimeout(400);
        const a = await page.$eval(`[data-st="${n}"] svg`, s => s.innerHTML); await page.waitForTimeout(400);
        const c = await page.$eval(`[data-st="${n}"] svg`, s => s.innerHTML);
        if (a === c) still.push(n);
      }
      // and stepping each loop in 150 frames: no stretch longer than 300 ms draws the same frame twice
      const stalls = await page.evaluate(() => window.__sxPlayers.map(p => {
        // one state object across the loop: the labs carry their running phase in it (adv())
        let prev = null, run = 0, worst = 0; const K = 150, dt = p.scene.dur / K, st = { ...p.state };
        for (let k = 0; k <= K; k++) { const m = p.scene.draw(k / K, st); if (m === prev) { run += dt; worst = Math.max(worst, run); } else run = 0; prev = m; }
        return worst > 300 ? `${p.name} ${Math.round(worst)} ms` : null;
      }).filter(Boolean));
      ok('V2', !still.length && !stalls.length, `${w}px ${still.length ? 'not moving on screen: ' + still.join(', ') + '; ' : ''}${stalls.length ? 'holds still: ' + stalls.join(', ') : 'every scene moves, no stretch over 300 ms'}`);

      // V3 / V4 over every lab position
      const geo = await page.evaluate(() => {
        const out = [], dirty = [];
        const variants = { ohm: [{ V: 0.5, R: 10 }, { V: 12, R: 500 }, { V: 12, R: 10 }], yarnR: ['silver', 'copper', 'steel', 'nichrome', 'carbon'].flatMap(mat => [{ mat, len: 0.1, fil: 0 }, { mat, len: 2, fil: 7 }]),
          heater: ['10', '30', '100'].flatMap(yarn => [{ yarn, n: 1, len: 0.1 }, { yarn, n: 8, len: 2 }, { yarn, n: 1, len: 2 }, { yarn, n: 8, len: 0.1 }]),
          divider: [{ press: 0 }, { press: 1 }], bucket: ['1', '3', '80'].flatMap(eps => [{ eps, gap: 0.5 }, { eps, gap: 6 }]),
          circuit: ['both', 'electrons', 'current'].map(view => ({ view })), stack: [] };
        for (const p of window.__sxPlayers) {
          const [x0, y0, vw, vh] = p.scene.vb.split(' ').map(Number), keep = { ...p.state }, was = p.running;
          p.running = false;
          let vs = variants[p.name] || [{}];
          if (p.name === 'stack') vs = [...document.querySelectorAll('[data-st-for="stack"]')].flatMap(btn => [-1, 0, 1, 2, 3, 4, 5].map(sel => ({ id: btn.dataset.stValue, sel })));
          for (const v of vs) {
            Object.assign(p.state, v);
            for (let i = 0; i < 12; i++) {
              const t = (i + 0.5) / 12; p.draw(t);
              const m = p.svg.innerHTML;
              if (/NaN|undefined/.test(m) || /#[0-9a-fA-F]{3,6}\b/.test(m.replace(/url\(#[^)]*\)|id="[^"]*"|var\(--[\w-]+,\s*#[0-9a-fA-F]{3,6}\)/g, ''))) dirty.push(`${p.name} ${JSON.stringify(v)}`);
              for (const tx of p.svg.querySelectorAll('text')) {
                if (!tx.textContent.trim()) continue;
                if (+(tx.getAttribute('fill-opacity') ?? 1) < 0.05 || +(tx.getAttribute('opacity') ?? 1) < 0.05) continue;
                const r = tx.getBBox();
                if (r.x < x0 - 1 || r.y < y0 - 1 || r.x + r.width > x0 + vw + 1 || r.y + r.height > y0 + vh + 1) out.push(`${p.name} ${JSON.stringify(v)} t=${t.toFixed(2)} "${tx.textContent.trim().slice(0, 30)}"`);
              }
            }
          }
          Object.keys(p.state).forEach(k => delete p.state[k]); Object.assign(p.state, keep); p.running = was; p.draw(0.55);
        }
        return { out: [...new Set(out)], dirty: [...new Set(dirty)] };
      });
      ok('V3', !geo.out.length, `${w}px ${geo.out.length} labels outside their frame${geo.out.length ? ': ' + geo.out.slice(0, 6).join(' | ') : ''}`);
      ok('V4', !geo.dirty.length, `${w}px ${geo.dirty.length ? geo.dirty.slice(0, 4).join(' | ') : 'no NaN, undefined or hex'}`);

      // V5 sliders
      const sl = await page.evaluate(() => {
        const bad = [];
        for (const input of document.querySelectorAll('input[data-sx-for]')) {
          const p = window.__sxPlayers.find(q => q.name === input.dataset.sxFor), key = input.dataset.sxKey;
          const out = document.querySelector(`[data-sx-out="${input.dataset.sxFor}.${key}"]`);
          p.running = false; input.value = input.min; input.dispatchEvent(new Event('input')); p.draw(0.4);
          const a = p.svg.innerHTML, ra = out.textContent;
          input.value = input.max; input.dispatchEvent(new Event('input')); p.draw(0.4);
          const m = p.svg.innerHTML, rb = out.textContent;
          if (+p.state[key] !== +input.max || a === m || ra === rb) bad.push(`${input.dataset.sxFor}.${key}`);
          input.value = input.defaultValue; input.dispatchEvent(new Event('input')); p.running = true;
        }
        return { n: document.querySelectorAll('input[data-sx-for]').length, bad };
      });
      ok('V5', sl.n === 8 && !sl.bad.length, `${w}px ${sl.n} sliders${sl.bad.length ? ', dead: ' + sl.bad.join(', ') : ', each writes state, read-out and drawing'}`);

      if (w === 1280) {
        // V6 cards
        await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(400);
        const deck = '[data-sx-cards="flow"]';
        const id = await page.$eval(`${deck} [data-card]`, e => e.dataset.card);
        const hidden = await page.$eval(`${deck} .sx-card__hook`, e => getComputedStyle(e).display === 'none');
        await page.click(`${deck} [data-a="show"]`);
        const shown = await page.$eval(`${deck} .sx-card__hook`, e => getComputedStyle(e).display !== 'none' && e.textContent.length > 3);
        await page.click(`${deck} [data-a="got"]`);
        const boxNow = await page.evaluate(id => (JSON.parse(localStorage.getItem('st-study.v1') || '{}').cards || {})[id] || 0, id);
        ok('V6', hidden && shown && boxNow === 1, `card ${id}: hook hidden ${hidden}, shown ${shown}, box after Got it ${boxNow}`);

        // V7 chapter check
        const q = '[data-sx-quiz="flow"]';
        const nextBefore = await page.$eval(`${q} .sx-next`, e => getComputedStyle(e).display !== 'none');
        const qid = await page.$eval(`${q} .sx-q`, e => e.dataset.q), item = DATA.QUIZ.find(x => x.id === qid);
        const wrong = item.a === 0 ? 1 : 0;
        await page.click(`${q} .sx-opt[data-i="${wrong}"]`);
        const after = await page.$eval(q, (e, a) => ({ next: getComputedStyle(e.querySelector('.sx-next')).display !== 'none', right: e.querySelector(`.sx-opt[data-i="${a}"]`).dataset.r, why: !e.querySelector('.sx-why').hidden && e.querySelector('.sx-why').textContent.length > 20, disabled: [...e.querySelectorAll('.sx-opt')].every(o => o.disabled) }), item.a);
        ok('V7', !nextBefore && after.next && after.right === 'right' && after.why && after.disabled, `Next before answering ${nextBefore}, after ${after.next}; right option marked ${after.right}; explanation ${after.why}`);

        // V8 games
        const prompt = await page.$eval('[data-sx-pickmetal] .sx-prompt', e => e.textContent);
        const sc = DATA.PICK_METAL.find(s => s.prompt === prompt), best = sc.o.find(o => o[1] === 2)[0];
        await page.click(`[data-sx-pickmetal] .sx-chip[data-id="${best}"]`);
        const pts = await page.$eval('[data-sx-pickmetal] .sx-game__bar b', e => +e.textContent);
        const wp = await page.$eval('[data-sx-which] .sx-prompt', e => e.textContent), ws = DATA.WHICH_SENSOR.find(s => s.prompt === wp);
        await page.click(`[data-sx-which] .sx-chip[data-k="${ws.a}"]`);
        const wr = await page.$eval('[data-sx-which] .sx-game__bar b', e => +e.textContent);
        ok('V8', pts === 2 && wr === 1, `Pick the Metal best answer scored ${pts}; Which Sensor right answer counted ${wr}`);

        // V9 build the stack
        // a tap that cannot happen is a red check, never a thrown timeout
        const tap = sel => page.click(sel, { timeout: 2000 }).then(() => true, () => false);
        const B = '[data-sx-build]', placed = () => page.$$eval(`${B} .sx-slot[data-filled="true"]`, e => e.length);
        const res = DATA.STACKS.find(s => s.id === 'resistive');
        await tap(`${B} .sx-layer-btn:has-text("${res.layers.at(-1).name}")`);
        const afterWrong = await placed(), fb = await page.$eval(`${B} .sx-feedback`, e => e.innerHTML);
        for (const l of res.layers) await tap(`${B} .sx-layer-btn:has-text("${l.name}") >> nth=0`);
        const built = await placed();
        await tap(`${B} [data-stack="heater"]`);
        const heat = DATA.STACKS.find(s => s.id === 'heater');
        for (const l of heat.layers) await tap(`${B} .sx-layer-btn:has-text("${l.name}") >> nth=-1`);
        const heatBuilt = await placed();
        ok('V9', afterWrong === 0 && /class="bad"/.test(fb) && built === res.layers.length && heatBuilt === heat.layers.length, `wrong layer placed ${afterWrong}, refused ${/class="bad"/.test(fb)}; resistive built ${built}/${res.layers.length}; heater (either TPU first) ${heatBuilt}/${heat.layers.length}`);

        // V10 mixed round ranking + V11 persistence
        const target = DATA.QUIZ.find(x => x.ch === 'stack');
        await page.evaluate(t => { const s = JSON.parse(localStorage.getItem('st-study.v1') || '{}'); s.quiz = s.quiz || {}; for (const k of Object.keys(s.quiz)) s.quiz[k].last = true; s.quiz[t] = { right: 0, wrong: 1, last: false }; localStorage.setItem('st-study.v1', JSON.stringify(s)); }, target.id);
        const pctBefore = await page.$eval('[data-sx-total]', e => e.textContent);
        await page.reload(); await page.waitForTimeout(400);
        const firstQ = await page.$eval('[data-sx-round] .sx-q', e => e.dataset.q);
        const total = await page.$eval('[data-sx-round] .sx-game__bar span', e => e.textContent);
        ok('V10', firstQ === target.id && /of 10/.test(total), `first mixed-round question ${firstQ} (missed: ${target.id}); "${total}"`);
        const kept = await page.evaluate(id => (JSON.parse(localStorage.getItem('st-study.v1') || '{}').cards || {})[id], id);
        const pctAfter = await page.$eval('[data-sx-total]', e => e.textContent);
        ok('V11', kept === 1 && pctAfter !== '0%', `after reload card box ${kept}, progress ${pctAfter} (before reload ${pctBefore})`);
      }

      const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok('V12', !errs.length && sw <= 0, `${w}px page errors ${errs.length}${errs.length ? ' ' + errs[0] : ''}; horizontal overflow ${sw}px`);
      await ctx.close();
    }
  } finally { await b.close(); server.close(); }
  return { bad, fails };
}

if (process.argv.includes('--negative-control')) {
  const MUTANTS = [
    ['storage-never-written', { 'smart-textiles-study.js': ['try { localStorage.setItem(KEY, JSON.stringify(S)); }', 'try { void KEY; }'] }, ['V6', 'V11']],
    ['next-shown-early', { 'smart-textiles-study.css': ['.sx-next[hidden] { display: none; }', ''] }, ['V7']],
    ['build-accepts-anything', { 'smart-textiles-study.js': ['if (ok(i, k)) {', 'if (true) {'] }, ['V9']],
    ['slider-writes-nothing', { 'smart-textiles-study.js': ['if (p) { p.state[key] = +input.value;', 'if (p) { void key;'] }, ['V5']],
    ['round-unranked', { 'smart-textiles-study.js': ['.sort((a, b) => rank(a) - rank(b))', ''] }, ['V10']],
  ];
  let failed = 0;
  for (const [id, patch, want] of MUTANTS) {
    const { fails } = await run(patch, true);
    const missed = want.filter(v => !fails.has(v));
    console.log(`${missed.length ? 'MISSED' : 'caught'} ${id}: fired ${[...fails].join(', ') || 'nothing'} (wants ${want.join(', ')})`);
    if (missed.length) failed++;
  }
  console.log(failed ? `NEGATIVE CONTROL FAILED: ${failed} mutant(s) not caught` : 'NEGATIVE CONTROL PASS: every mutant caught');
  process.exit(failed ? 1 : 0);
} else {
  const { bad } = await run();
  console.log(bad ? `FAIL: ${bad} check(s)` : 'PASS');
  process.exit(bad ? 1 : 0);
}
