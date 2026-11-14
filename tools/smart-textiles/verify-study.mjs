#!/usr/bin/env node
// verify-study.mjs — the Smart Textiles study session (/smart-textiles-study.html) in a real browser, at 1280
// and 390.
//   NODE_PATH=/opt/node22/lib/node_modules node tools/smart-textiles/verify-study.mjs [--negative-control]
// Per width:
//   V1  every [data-st] host has a scene; 23 mounted
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
//   V13 every card has its explanation, two other mnemonics and words to blank; Flip shows them only after
//       "Show the line"; Type the line refuses wrong words and accepts the right ones (and records them)
//   V14 Up, down or same: Check waits for every row; the right arrows score every row, a wrong one is marked
//   V15 Work it out: every generator gives a finite positive answer and hints (Node, 300 draws each); the
//       renderer says too high / too low, accepts within 3% and refuses 3.3% off
//   V16 Put it in order: a check locks exactly the items in place; swaps then solve it and the best is stored
//   V17 Spot the fault: the right tap reads right and is stored; a wrong layer tap and a wrong gap tap read wrong
//   V18 lab challenges advance when the lab's own state meets the target, and the progress is stored
//   V19 the Hard round is 8 items, interleaved, and an arrow grid missed last time comes first
//   V20 chapter 06's lab formulas (Poisson width and volume, the stretched conductor's R, its gauge factor, copper's
//       yield) against the physics restated in the gate, and every stretch challenge reachable on the sliders
//   V21 chapter-check options are shuffled once per question per visit: over 12 fresh loads the right answer of each
//       chapter's first question lands on every letter (each letter 6 to 34 times of 72) and moves in every chapter;
//       a question shown again in the same visit keeps its order; the "It's X" letter is the right answer's letter as
//       shown, never its position in the data, and the right answer is the option marked right (six questions, so a
//       mapping mixed up between shown and data order can't pass by luck)
//   V22 the question set: no id used twice (check questions and the sensor questions share one record), no
//       throwaway option, and the right answer is the strictly longest option on at most a quarter of questions
//   V23 arrow grids: every item has three rows, no item points all one way, and no direction is right on more than a
//       third of the rows; reports what answering "up" everywhere scores
//   V24 tap targets: every control in the progress panel and the chapters is at least 32 px tall at 1280 and 44 px at
//       390 (the sliders' hit area included)
//   V25 the corrected copy, as served: none of the audit's wrong statements anywhere in the page text, the scenes'
//       drawings or the three study modules; permittivity written εᵣ; the contact line read from one place (card,
//       caption, drawing, cloze); one explanation of the harder games, in chapter 01; PEDOT:PSS's best figure and the
//       heater yarns' labels
//   V26 wrong-answer feedback, as served: every wrong option of every check question and Which Sensor item has its
//       own why-not (one or two sentences), none repeats the right answer's reason, another option's why-not or a
//       line to remember, none scolds; the 21 explanations that only restated the line now say why (the line kept
//       as a second line); every arrow row has its own one-line reason
//   V27 the feedback on screen, after the shuffle: a wrong pick shows that option's why-not (by the option, not its
//       position), then the right answer, its reason and the line; the other why-nots stay hidden until "Why not
//       the other two?"; a right answer shows them all. Every chapter check, the mixed round and Which Sensor
//   V28 arrow grids: each row answered wrong shows its own reason, a row answered right shows none (every chapter)
// --negative-control [--mutant=a,b] re-serves the page with a defect planted, one at a time, and requires the named check
// to fail: storage never written (V6, V11), the Next button shown early (V7), Build the Stack accepting any
// layer (V9), a slider that writes nothing (V5), the mixed round unranked (V10), Type the line accepting
// anything (V13), arrows ungraded (V14), a 30% tolerance (V15), an order check that locks everything (V16),
// any layer tap or any gap tap counted right (V17), challenges that never advance (V18), the Hard round unranked (V19), the Poisson width with its sign flipped and a
// stretched conductor that only gets longer, never thinner (V20).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const DATA = await import(pathToFileURL(path.join(REPO, 'smart-textiles-study-data.js')).href);
const HARD = await import(pathToFileURL(path.join(REPO, 'smart-textiles-study-hard.js')).href);
const N_SCENES = 23;

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
          circuit: ['both', 'electrons', 'current'].map(view => ({ view })), stack: [],
          curves: ['metal', 'fibre', 'knit', 'rubber'].map(mat => ({ mat })),
          poisson: ['cork', 'metal', 'rubber', 'aux', 'bias'].flatMap(mat => [{ mat, strain: 0 }, { mat, strain: 0.2 }]),
          gauge: ['metal', 'liquid'].flatMap(mat => [{ mat, strain: 0 }, { mat, strain: 0.002 }, { mat, strain: 0.3 }]) };
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
      ok('V5', sl.n === 10 && !sl.bad.length, `${w}px ${sl.n} sliders${sl.bad.length ? ', dead: ' + sl.bad.join(', ') : ', each writes state, read-out and drawing'}`);

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

        const store = () => page.evaluate(() => JSON.parse(localStorage.getItem('st-study.v1') || '{}'));
        const fill = (sel, v) => page.fill(sel, String(v), { timeout: 2000 }).then(() => true, () => false);
        page.setDefaultTimeout(5000);
        try {
          // V13 card extras: data, flip, type the line
          const missingMore = DATA.CARDS.filter(c => { const m = DATA.CARD_MORE[c.id]; return !m || !m.explain || m.alts.length < 2 || !m.cloze.length; }).map(c => c.id);
          await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(400);
          const D = '[data-sx-cards="flow"]';
          const moreHidden = await page.$eval(`${D} .sx-card__more`, e => getComputedStyle(e).display === 'none');
          await tap(`${D} [data-a="show"]`);
          const moreShown = await page.$eval(`${D} .sx-card__more`, e => getComputedStyle(e).display !== 'none' && e.querySelectorAll('.sx-alts li').length >= 2);
          await tap(`${D} [data-mode="type"]`);
          const cid = await page.$eval(`${D} [data-card]`, e => e.dataset.card), words = DATA.CARD_MORE[cid]?.cloze || [];
          const ngaps = await page.$$eval(`${D} .sx-gap`, e => e.length);
          for (let i = 0; i < ngaps; i++) await fill(`${D} .sx-gap[data-gap="${i}"]`, 'qqqq');
          await tap(`${D} [data-a="check"]`);
          const refused = await page.$eval(`${D} .sx-reveal`, e => e.hidden);
          for (let i = 0; i < ngaps; i++) await fill(`${D} .sx-gap[data-gap="${i}"]`, words[i].toUpperCase());
          await tap(`${D} [data-a="check"]`);
          const revealed = await page.$eval(`${D} .sx-reveal`, e => !e.hidden && /Got it/.test(e.textContent)).catch(() => false);
          const clozeRec = ((await store()).hard?.cloze || {})[cid];
          ok('V13', !missingMore.length && moreHidden && moreShown && ngaps === words.length && refused && revealed && clozeRec?.last === true,
            `cards missing extras ${missingMore.length}; more hidden ${moreHidden}, shown ${moreShown}; ${cid} gaps ${ngaps}/${words.length}; wrong words refused ${refused}; right words revealed ${revealed}; recorded ${clozeRec?.last}`);
          await tap(`${D} [data-mode="flip"]`);
        } catch (e) { ok('V13', false, 'threw: ' + String(e.message).split('\n')[0]); }
        try {
          // V14 arrows (the flow widget opens on Up, down or same?)
          const A = '[data-sx-hard="flow"]';
          const aq = await page.$eval(`${A} .sx-prompt`, e => e.textContent), arr = HARD.ARROWS.find(x => x.q === aq);
          const checkOff = await page.$eval(`${A} [data-a="check"]`, e => e.disabled);
          for (let r = 0; r < arr.rows.length - 1; r++) await tap(`${A} [data-row="${r}"] [data-dir="${arr.rows[r][1]}"]`);
          const checkStillOff = await page.$eval(`${A} [data-a="check"]`, e => e.disabled);
          const lastWant = arr.rows.at(-1)[1], lastWrong = lastWant === 'up' ? 'down' : 'up';
          await tap(`${A} [data-row="${arr.rows.length - 1}"] [data-dir="${lastWrong}"]`);
          await tap(`${A} [data-a="check"]`);
          const marks = await page.$$eval(`${A} .sx-arrow-row`, e => e.map(r => r.dataset.r));
          const aRec1 = ((await store()).hard?.arrows || {})[arr.id];
          await tap(`${A} [data-a="more"]`);
          const aq2 = await page.$eval(`${A} .sx-prompt`, e => e.textContent), arr2 = HARD.ARROWS.find(x => x.q === aq2);
          for (let r = 0; r < arr2.rows.length; r++) await tap(`${A} [data-row="${r}"] [data-dir="${arr2.rows[r][1]}"]`);
          await tap(`${A} [data-a="check"]`);
          const marks2 = await page.$$eval(`${A} .sx-arrow-row`, e => e.map(r => r.dataset.r));
          const wantMarks = arr.rows.map((_, r) => r < arr.rows.length - 1 ? 'right' : 'wrong');
          ok('V14', checkOff && checkStillOff && JSON.stringify(marks) === JSON.stringify(wantMarks) && aRec1?.last === false && marks2.every(m => m === 'right'),
            `check disabled at start ${checkOff}, with a row unpicked ${checkStillOff}; one wrong row marks ${marks.join('/')}; recorded ${aRec1?.last}; all right marks ${marks2.join('/')}`);
        } catch (e) { ok('V14', false, 'threw: ' + String(e.message).split('\n')[0]); }
        try {
          // V15 numbers: generators in Node, the renderer in the page on a fixed problem
          const genBad = [];
          for (const [k, g] of Object.entries(HARD.PROBLEMS)) for (let i = 0; i < 300; i++) { const pr = g.make(); if (!(isFinite(pr.ans) && pr.ans > 0 && pr.hints.length >= 2 && !/NaN|undefined/.test(pr.q + pr.work + pr.hints.join('')))) { genBad.push(k); break; } }
          await page.evaluate(async () => {
            const H = await import('/smart-textiles-study-hard.js');
            const d = document.createElement('div'); d.id = 'v15'; d.style.cssText = 'padding:20px'; document.body.append(d);
            window.__v15 = null; H.renderProblem(d, { q: 'Fixed', ans: 30, unit: 'mA', hints: ['h1', 'h2'], work: 'w' }, (ok, clean) => { window.__v15 = { ok, clean }; });
          });
          // a renderer check, not a layout check: drive it through the DOM so nothing on the page can sit over it
          const say = v => page.evaluate(v => { const r = document.getElementById('v15'); r.querySelector('.sx-input').value = v; r.querySelector('[data-a="check"]').click(); return r.querySelector('.sx-why').textContent; }, String(v));
          const hi = await say(500), lo = await say(1), far = await say(31);
          await page.evaluate(() => { const h = document.querySelector('#v15 [data-a="hint"]'); h.click(); h.click(); });
          const nh = await page.$$eval('#v15 .sx-hintline', e => e.length);
          const near = await say('30.8');
          const res15 = await page.evaluate(() => window.__v15);
          ok('V15', !genBad.length && /Too high/.test(hi) && /Too low/.test(lo) && /Too high/.test(far) && nh === 2 && /✓/.test(near) && res15?.ok === true && res15.clean === false,
            `${Object.keys(HARD.PROBLEMS).length} generators, bad ${genBad.join(',') || 'none'}; 500 "${hi.slice(0, 12)}", 1 "${lo.slice(0, 11)}", 31 (3.3% off) "${far.slice(0, 12)}"; hints ${nh}; 30.8 accepted ${/✓/.test(near)}; done ${JSON.stringify(res15)}`);
          await page.evaluate(() => document.getElementById('v15').remove());
        } catch (e) { ok('V15', false, 'threw: ' + String(e.message).split('\n')[0]); }
        try {
          // V16 order (resist chapter)
          const O = '[data-sx-hard="resist"]';
          await tap(`${O} [data-hmode="order"]`);
          const oq = await page.$eval(`${O} .sx-prompt`, e => e.textContent), ord = HARD.ORDERS.find(x => x.q === oq);
          const texts = () => page.$$eval(`${O} .sx-order-item`, e => e.map(b => b.childNodes[1].textContent));
          const t0 = await texts(), inPlace = t0.filter((t, i) => t === ord.items[i]).length;
          await tap(`${O} [data-a="check"]`);
          const lockedNow = await page.$$eval(`${O} .sx-order-item[data-lock="true"]`, e => e.length);
          let guard = 0;
          while (guard++ < 20) {
            const t = await texts(), i = t.findIndex((x, k) => x !== ord.items[k]);
            if (i < 0) break;
            const j = t.indexOf(ord.items[i]);
            await tap(`${O} .sx-order-item[data-i="${i}"]`); await tap(`${O} .sx-order-item[data-i="${j}"]`);
          }
          await tap(`${O} [data-a="check"]`);
          const solved = await page.$eval(O, e => /Solved in 2 checks/.test(e.textContent));
          const oRec = ((await store()).hard?.order || {})[ord.id];
          ok('V16', lockedNow === inPlace && lockedNow < ord.items.length && solved && oRec === 2, `${ord.id}: ${inPlace} in place, ${lockedNow} locked after the first check; solved in 2 ${solved}; stored best ${oRec}`);
        } catch (e) { ok('V16', false, 'threw: ' + String(e.message).split('\n')[0]); }
        try {
          // V17 spot the fault
          const F = '[data-sx-hard="stack"]';
          const findFault = async () => {
            const head = (await page.$eval(`${F} .sx-prompt`, e => e.textContent)).split(':')[0];
            const st = DATA.STACKS.find(x => x.name === head);
            const names = await page.$$eval(`${F} .sx-fault-layer`, e => e.map(b => b.textContent));
            const i = names.findIndex((n, k) => n !== st.layers[k].name);
            return names.length < st.layers.length ? { gap: i < 0 ? names.length : i } : { pos: i };
          };
          await tap(`${F} [data-hmode="fault"]`);
          const f1 = await findFault();
          await tap(f1.gap != null ? `${F} .sx-gap-btn[data-gap="${f1.gap}"]` : `${F} .sx-fault-layer[data-pos="${f1.pos}"]`);
          const why1 = await page.$eval(`${F} .sx-why`, e => e.textContent);
          // a wrong tap of each kind: a layer tapped when one is missing, a gap tapped when two are swapped.
          // "Another one" stays hidden until a fault is answered, so a fault of the other kind is answered
          // first, with a tap that is wrong by construction (a gap on a swap, a layer on a missing one), and
          // counted. Without that the search got one draw, and a swap at position 0 made the "wrong" layer
          // tap right about one run in five.
          const wrongs = []; let skipped = 0, found = 0;
          const wrongTap = f => tap(f.gap != null ? `${F} .sx-fault-layer[data-pos="0"]` : `${F} .sx-gap-btn[data-gap="0"]`);
          for (const kind of ['gap', 'pos']) {
            await tap(`${F} [data-a="more"]`);
            let f2 = await findFault();
            for (let k = 0; k < 40 && f2[kind] == null; k++) { await wrongTap(f2); skipped++; await tap(`${F} [data-a="more"]`); f2 = await findFault(); }
            if (f2[kind] != null) found++;
            await wrongTap(f2);
            wrongs.push(await page.$eval(`${F} .sx-why`, e => e.textContent));
          }
          const fRec = (await store()).hard?.fault?.all;
          ok('V17', /^✓ Right/.test(why1) && found === 2 && wrongs.every(w => /^✕/.test(w)) && /missing/.test(wrongs[0]) && /swapped/.test(wrongs[1]) && fRec?.right === 1 && fRec?.wrong === 2 + skipped, `right tap "${why1.slice(0, 7)}"; wrong layer tap on a missing layer "${wrongs[0].slice(0, 26)}", wrong gap tap on a swap "${wrongs[1].slice(0, 26)}" (${skipped} of the other kind answered on the way); stored ${JSON.stringify(fRec)}`);
        } catch (e) { ok('V17', false, 'threw: ' + String(e.message).split('\n')[0]); }
        try {
          // V18 lab challenges
          const setSlider = (scene, key, v) => page.evaluate(([scene, key, v]) => { const i = document.querySelector(`[data-sx-for="${scene}"][data-sx-key="${key}"]`); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }, [scene, key, v]);
          await setSlider('ohm', 'V', 5); await setSlider('ohm', 'R', 100); await page.waitForTimeout(60);
          await setSlider('divider', 'press', 0.18); await page.waitForTimeout(60);
          await tap('[data-st-for="heater"][data-st-value="10"]'); await setSlider('heater', 'n', 2); await setSlider('heater', 'len', 1.2); await page.waitForTimeout(60);
          await tap('[data-st-for="poisson"][data-st-value="metal"]'); await setSlider('poisson', 'strain', 0.1);
          await tap('[data-st-for="gauge"][data-st-value="liquid"]'); await setSlider('gauge', 'strain', 0.095); await page.waitForTimeout(60);
          const doneCount = async n => page.$$eval(`[data-sx-chal="${n}"] li[data-state="done"]`, e => e.length);
          const c18 = { ohm: await doneCount('ohm'), divider: await doneCount('divider'), heater: await doneCount('heater'), bucket: await doneCount('bucket'), poisson: await doneCount('poisson'), gauge: await doneCount('gauge') };
          const chalRec = (await store()).hard?.chal || {};
          ok('V18', c18.ohm === 1 && c18.divider === 1 && c18.heater === 1 && c18.bucket === 0 && c18.poisson === 1 && c18.gauge === 1 && chalRec.ohm === 1 && chalRec.heater === 1 && chalRec.poisson === 1, `targets met: ${JSON.stringify(c18)} (bucket untouched); stored ${JSON.stringify(chalRec)}`);
        } catch (e) { ok('V18', false, 'threw: ' + String(e.message).split('\n')[0]); }
        try {
          // V20 chapter 06: the lab formulas against the physics restated here, as the page serves them
          const r20 = await page.evaluate(async () => {
            const S = await import('/smart-textiles-study-scenes.js'), bad = [];
            const NU = { cork: 0, metal: 0.3, rubber: 0.5, aux: -0.4, bias: 1 };
            for (const [mat, nu] of Object.entries(NU)) for (const e of [0.01, 0.05, 0.2]) {
              const c = S.poissonCalc(mat, e);
              if (Math.abs(c.width - (-nu * e)) > 1e-12) bad.push(`${mat} ${e} width ${c.width}`);
              if (Math.abs(c.vol - (1 - 2 * nu) * e) > 1e-12) bad.push(`${mat} ${e} volume ${c.vol}`);
            }
            for (const [mat, nu] of [['metal', 0.34], ['liquid', 0.5]]) for (const e of [0.001, 0.1, 0.3]) {
              const L = 1 + e, A = (1 + e) ** (-2 * nu), want = L / A, c = S.gaugeCalc(mat, e);
              if (Math.abs(c.ratio - want) > 1e-9) bad.push(`${mat} ${e} R ratio ${c.ratio} vs ${want}`);
              if (e <= 0.001 && Math.abs(c.gf - (1 + 2 * nu)) > 0.01) bad.push(`${mat} small-strain GF ${c.gf}`);
            }
            if (S.gaugeCalc('metal', 0.0021).yielded !== true || S.gaugeCalc('metal', 0.002).yielded !== false) bad.push('copper yield at 0.2%');
            return bad;
          });
          const unreach = [];
          for (const [name, mats, max, step] of [['poisson', ['cork', 'metal', 'rubber', 'aux', 'bias'], 0.2, 0.01], ['gauge', ['metal', 'liquid'], 0.3, 0.001]]) {
            const spec = HARD.CHALLENGES[name];
            spec.targets.forEach(([text, f]) => { let hit = false; for (const mat of mats) for (let k = 0; k * step <= max + 1e-9 && !hit; k++) if (f(spec.read({ mat, strain: +(k * step).toFixed(4) }))) hit = true; if (!hit) unreach.push(`${name}: ${text}`); });
          }
          ok('V20', !r20.length && !unreach.length, `${r20.length ? r20.slice(0, 3).join(' | ') : 'Poisson width −νε and volume (1−2ν)ε, R × (1+ε)^(1+2ν), GF → 1+2ν, copper yield at 0.2%'}; ${unreach.length ? 'unreachable: ' + unreach.join(' | ') : 'every stretch challenge reachable on the sliders'}`);
        } catch (e) { ok('V20', false, 'threw: ' + String(e.message).split('\n')[0]); }
        try {
          // V19 hard round
          const miss = HARD.ARROWS.find(x => x.ch === 'stack');
          await page.evaluate(([miss, ids]) => { const s = JSON.parse(localStorage.getItem('st-study.v1') || '{}'); s.hard = s.hard || {}; s.hard.arrows = {}; for (const id of ids) s.hard.arrows[id] = { right: 1, wrong: 0, last: true }; s.hard.arrows[miss] = { right: 0, wrong: 1, last: false }; localStorage.setItem('st-study.v1', JSON.stringify(s)); }, [miss.id, HARD.ARROWS.map(x => x.id)]);
          // three fresh rounds, so an unranked round (1 in 27 to lead with it by chance) cannot pass by luck
          const R = '[data-sx-hardround]', firsts = [];
          let bar = '';
          for (let k = 0; k < 3; k++) {
            await page.reload(); await page.waitForTimeout(400);
            firsts.push(await page.$eval(`${R} .sx-prompt`, e => e.textContent));
            bar = await page.$eval(`${R} .sx-game__bar span`, e => e.textContent);
          }
          const led = firsts.filter(f => f === miss.q).length;
          ok('V19', led === 3 && /^1 of 8 · Up, down or same\?/.test(bar), `missed arrow grid (${miss.id}) led ${led} of 3 fresh rounds; "${bar}"`);
        } catch (e) { ok('V19', false, 'threw: ' + String(e.message).split('\n')[0]); }
        try {
          // V21 option order: spread over fresh loads, stable within one, and the feedback letter as shown
          await page.evaluate(() => localStorage.clear());
          const letters = { A: 0, B: 0, C: 0, D: 0 }, perCh = {}, LOADS = 12;
          for (let k = 0; k < LOADS; k++) {
            await page.reload(); await page.waitForTimeout(250);
            const got = await page.$$eval('[data-sx-quiz] .sx-q', qs => qs.map(q => ({ id: q.dataset.q, ch: q.closest('[data-sx-quiz]').dataset.sxQuiz, opts: [...q.querySelectorAll('.sx-opt')].map(o => ({ key: o.dataset.key, i: +o.dataset.i })) })));
            for (const g of got) { const it = DATA.QUIZ.find(x => x.id === g.id), key = g.opts.find(o => o.i === it.a)?.key; if (key) letters[key]++; (perCh[g.ch] ||= new Set()).add(key); }
          }
          const nSamples = Object.values(letters).reduce((a, b) => a + b, 0);
          const spread = Object.values(letters).every(n => n >= 6 && n <= 34);
          const moved = Object.values(perCh).every(set => set.size >= 2);
          // stable within the visit, and the feedback letter: answer every flow question wrong, then start over
          const Q = '[data-sx-quiz="flow"]', order = () => page.$$eval(`${Q} .sx-opt`, os => os.map(o => o.dataset.i).join(''));
          const order0 = await order(), letterBad = [];
          for (let n = 0; n < 12; n++) {
            const qid = await page.$eval(`${Q} .sx-q`, e => e.dataset.q).catch(() => null); if (!qid) break;
            const it = DATA.QUIZ.find(x => x.id === qid);
            await tap(`${Q} .sx-opt[data-i="${it.a === 0 ? 1 : 0}"]`);
            const fb = await page.$eval(Q, (e, a) => ({ said: ((e.querySelector('.sx-why__lead b')?.textContent || '').match(/It’s ([A-D])/) || [])[1], key: e.querySelector(`.sx-opt[data-i="${a}"]`).dataset.key, mark: e.querySelector(`.sx-opt[data-i="${a}"]`).dataset.r }), it.a);
            if (fb.said !== fb.key) letterBad.push(`${qid} said ${fb.said}, shown ${fb.key}`);
            if (fb.mark !== 'right') letterBad.push(`${qid} right answer marked ${fb.mark}`);
            if (!await tap(`${Q} [data-a="next"]`)) break;
          }
          await tap(`${Q} [data-a="all"]`);
          const order1 = await order();
          ok('V21', nSamples === 6 * LOADS && spread && moved && order0 === order1 && !letterBad.length,
            `right answer over ${LOADS} loads × 6 chapters: ${Object.entries(letters).map(([k, n]) => `${k} ${n}`).join(', ')}; moved in every chapter ${moved}; same order after starting over ${order0 === order1}; feedback letter ${letterBad.length ? 'wrong: ' + letterBad.slice(0, 2).join(' | ') : 'is the shown letter, and the right answer is marked right'}`);
        } catch (e) { ok('V21', false, 'threw: ' + String(e.message).split('\n')[0]); }
        try {
          // V22 the question set, as served
          const r22 = await page.evaluate(async () => {
            const D = await import('/smart-textiles-study-data.js'), H = await import('/smart-textiles-study-hard.js');
            const dup = a => a.filter((x, i) => a.indexOf(x) !== i);
            const longest = D.QUIZ.filter(q => { const L = q.o.map(x => x.length), m = Math.max(...L); return L[q.a] === m && L.filter(x => x === m).length === 1; }).map(q => q.id);
            const junk = D.QUIZ.flatMap(q => q.o.filter(o => /magnetic|fashion|in the dark|weighing it|melts at body|drops to zero|goes negative|flip sign/i.test(o)).map(o => `${q.id}: ${o}`));
            return { n: D.QUIZ.length, dq: dup(D.QUIZ.map(q => q.id).concat(D.WHICH_SENSOR.map(w => `w-${w.id}`))), dc: dup(D.CARDS.map(c => c.id)), da: dup(H.ARROWS.map(a => a.id)), longest, junk };
          });
          ok('V22', !r22.dq.length && !r22.dc.length && !r22.da.length && !r22.junk.length && r22.longest.length <= r22.n / 4,
            `${r22.n} questions; ids used twice: ${[...r22.dq, ...r22.dc, ...r22.da].join(', ') || 'none'}; throwaway options: ${r22.junk.join(' | ') || 'none'}; right answer strictly longest on ${r22.longest.length} (at most ${r22.n / 4})`);
        } catch (e) { ok('V22', false, 'threw: ' + String(e.message).split('\n')[0]); }
        try {
          // V23 arrow grids, as served
          const r23 = await page.evaluate(async () => {
            const H = await import('/smart-textiles-study-hard.js'), c = { up: 0, down: 0, same: 0 }, short = [], mono = [];
            let rows = 0;
            for (const a of H.ARROWS) { if (a.rows.length < 3) short.push(a.id); if (new Set(a.rows.map(r => r[1])).size === 1) mono.push(a.id); for (const r of a.rows) { c[r[1]]++; rows++; } }
            const allOne = d => H.ARROWS.filter(a => a.rows.every(r => r[1] === d)).length;
            return { n: H.ARROWS.length, c, rows, short, mono, upItems: allOne('up') };
          });
          const share = d => r23.c[d] / r23.rows, pc = x => `${(x * 100).toFixed(1)}%`;
          ok('V23', !r23.short.length && !r23.mono.length && ['up', 'down', 'same'].every(d => share(d) <= 1 / 3 + 1e-9),
            `${r23.n} items, ${r23.rows} rows: up ${r23.c.up}, down ${r23.c.down}, same ${r23.c.same}; under three rows: ${r23.short.join(', ') || 'none'}; all one way: ${r23.mono.join(', ') || 'none'}; answering up everywhere: ${pc(share('up'))} of rows, ${r23.upItems} of ${r23.n} items (chance is 33.3% of rows)`);
        } catch (e) { ok('V23', false, 'threw: ' + String(e.message).split('\n')[0]); }
        try {
          // V25 the corrected copy and notation, everywhere the page says it
          const r25 = await page.evaluate(async () => {
            const D = await import('/smart-textiles-study-data.js'), S = await import('/smart-textiles-study-scenes.js');
            const svgs = window.__sxPlayers.map(p => [0.15, 0.5, 0.85].map(t => p.scene.draw(t, { ...p.state })).join(' ')).join(' ');
            const mods = (await Promise.all(['/smart-textiles-study-data.js', '/smart-textiles-study-hard.js', '/smart-textiles-study-scenes.js'].map(u => fetch(u).then(r => r.text())))).join(' ');
            const all = document.body.innerText + ' ' + svgs + ' ' + mods;
            const FORBID = [/every contact is a toll booth/i, /C = εA/, /\(ε ≈/, /ε the material filling/, /Water’s permittivity is/, /10⁻⁵ at best/, /often 100× higher/, /silver-plated, 10 Ω\/m/i, /silver-plated yarn \(10/i, /150 times that/, /A plain solid material/, /a hundredth of what the liquid metal takes/, /0\.05–0\.2%/, /its low Ω\/m means long lines/, /40× copper/, /40× worse than copper/];
            const hits = FORBID.filter(re => re.test(all)).map(String);
            const cap = document.querySelector('[data-sx-line="contact"]')?.textContent.trim();
            const card = D.CARDS.find(c => c.id === 'toll'), more = D.CARD_MORE.toll;
            const contacts = window.__sxPlayers.find(p => p.name === 'contacts');
            const drawn = contacts ? contacts.scene.draw(0.3, { ...contacts.state }) : '';
            const whole = w => new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, 'u').test(D.CONTACT.hook);
            const contact = D.CONTACT_LINES.length >= 2 && D.CONTACT_LINES.includes(D.CONTACT) && cap === D.CONTACT.hook && card.hook === D.CONTACT.hook && drawn.includes(D.CONTACT.hook) && more.cloze.join() === D.CONTACT.cloze.join() && D.CONTACT.cloze.every(whole);
            const help = document.querySelectorAll('[data-sx-harder-help]'), notes = document.querySelectorAll('.sx-sub-note');
            const harder = help.length === 1 && notes.length === 1 && !!help[0].closest('#flow');
            const pedot = D.METALS.find(m => m.id === 'pedot').rho, yarn = S.HEATER_YARNS[10];
            return { hits, contact, cap, harder, nHelp: help.length, nNotes: notes.length, pedot, yarn };
          });
          ok('V25', !r25.hits.length && r25.contact && r25.harder && r25.pedot <= 3e-6 && !/silver/i.test(r25.yarn),
            `wrong statements found: ${r25.hits.join(' ') || 'none'}; contact line "${r25.cap}" in card, caption, drawing and blanks ${r25.contact}; harder-games help ${r25.nHelp}, notes ${r25.nNotes}, in chapter 01 ${r25.harder}; PEDOT best ρ ${r25.pedot}; 10 Ω/m yarn "${r25.yarn}"`);
        } catch (e) { ok('V25', false, 'threw: ' + String(e.message).split('\n')[0]); }
        try {
          // V26 the why-nots and reasons, as served
          const r26 = await page.evaluate(async () => {
            const D = await import('/smart-textiles-study-data.js'), H = await import('/smart-textiles-study-hard.js');
            const norm = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
            const hooks = new Set([...D.CARDS.map(c => c.hook), ...D.CONTACT_LINES.map(c => c.hook), ...D.QUIZ.map(q => q.hook).filter(Boolean), ...D.METALS.map(m => m.hook)].map(norm));
            const SCOLD = /\b(obviously|of course|clearly|oops|nope|silly|easy|careful|wrong!)\b/i, K = ['R', 'C', 'E'];
            const items = D.QUIZ.map(q => ({ id: q.id, o: q.o, a: q.a, why: q.why, hook: q.hook, no: q.no }))
              .concat(D.WHICH_SENSOR.map(w => ({ id: `w-${w.id}`, o: K, a: K.indexOf(w.a), why: w.why, no: K.map(k => w.no?.[k] ?? null) })));
            const bad = [], seen = new Map(); let n = 0;
            for (const q of items) {
              if (!Array.isArray(q.no) || q.no.length !== q.o.length) { bad.push(`${q.id}: no why-not list`); continue; }
              if (q.no[q.a] != null) bad.push(`${q.id}: a why-not on the right answer`);
              q.no.forEach((t, i) => {
                if (i === q.a) return; n++;
                if (typeof t !== 'string' || t.length < 40) { bad.push(`${q.id}[${i}]: missing or too short`); return; }
                const sent = (t.match(/[.?!](?=\s|$)/g) || []).length;
                if (sent > 2 || t.length > 240) bad.push(`${q.id}[${i}]: ${sent} sentences, ${t.length} chars`);
                const nt = norm(t), nw = norm(q.why);
                if (nt === nw || nt.includes(nw) || nw.includes(nt)) bad.push(`${q.id}[${i}]: repeats the right answer's reason`);
                if (hooks.has(nt) || (q.hook && nt.includes(norm(q.hook))) || nt.includes(norm(D.CONTACT.hook))) bad.push(`${q.id}[${i}]: is the line to remember`);
                if (SCOLD.test(t)) bad.push(`${q.id}[${i}]: scolds`);
                if (seen.has(nt)) bad.push(`${q.id}[${i}]: same as ${seen.get(nt)}`); else seen.set(nt, `${q.id}[${i}]`);
              });
            }
            // the 21 explanations the audit found restating the line (1 = it had a line to keep)
            const SHORT = { 'q-doubleR': 1, 'q-square': 1, 'q-rank': 1, 'q-core': 1, 'q-halfgap': 1, 'q-area': 1, 'q-eps': 1, 'q-water': 1, 'q-creep': 1, 'q-switch': 1, 'q-tpubase': 1, 'q-baretrace': 1, 'q-heaterins': 1, 'q-young': 1, 'q-auxetic': 1, 'q-island': 1, 'q-serp': 1, 'q-compress': 1, 'q-poisson': 0, 'q-rubber': 0, 'q-cap': 0 };
            for (const [id, line] of Object.entries(SHORT)) {
              const q = D.QUIZ.find(x => x.id === id); if (!q) { bad.push(`${id}: gone`); continue; }
              if (q.why.length < 70 || hooks.has(norm(q.why)) || (q.hook && norm(q.why).includes(norm(q.hook)))) bad.push(`${id}: the reason restates the line`);
              if (line && !q.hook) bad.push(`${id}: the line to remember was dropped`);
            }
            for (const a of H.ARROWS) {
              const rs = a.rows.map(r => r[2]);
              if (rs.some(r => typeof r !== 'string' || r.length < 15 || r.length > 160)) bad.push(`${a.id}: a row without a one-line reason`);
              if (new Set(rs.map(norm)).size !== rs.length) bad.push(`${a.id}: two rows share a reason`);
            }
            return { bad, n, rows: H.ARROWS.reduce((t, a) => t + a.rows.length, 0) };
          });
          ok('V26', !r26.bad.length && r26.n === 188 && r26.rows === 108, `${r26.n} why-nots, ${r26.rows} arrow-row reasons; ${r26.bad.length ? r26.bad.slice(0, 4).join(' | ') : 'each its own, none the reason, the line or another option’s; the 21 short explanations say why'}`);
        } catch (e) { ok('V26', false, 'threw: ' + String(e.message).split('\n')[0]); }
        try {
          // V27 the feedback on screen, after the shuffle
          await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(400);
          const K = ['R', 'C', 'E'], LABEL = { R: 'Resistive', C: 'Capacitive', E: 'Either works' };
          const ALLQ = DATA.QUIZ.concat(DATA.WHICH_SENSOR.map(w => ({ id: `w-${w.id}`, o: K.map(k => LABEL[k]), a: K.indexOf(w.a), why: w.why, no: K.map(k => w.no[k] ?? null) })));
          const norm = t => String(t).replace(/\s+/g, ' ').trim(), has = (t, x) => norm(t).includes(norm(x));
          const bad27 = []; let nWrong = 0, nRight = 0;
          const answer = async (host, mode) => {
            const st = await page.$eval(`${host} .sx-q`, e => ({ id: e.dataset.q, opts: [...e.querySelectorAll('.sx-opt')].map((o, k) => ({ k, key: o.dataset.key, i: +o.dataset.i })) }));
            const q = ALLQ.find(x => x.id === st.id), keyOf = i => st.opts.find(o => o.i === i).key;
            const wrong = st.opts.filter(o => o.i !== q.a);
            const pick = mode === 'right' ? st.opts.find(o => o.i === q.a) : (wrong.find(o => o.k !== o.i) || wrong[0]);
            await tap(`${host} .sx-opt[data-i="${pick.i}"]`);
            const fb = await page.$eval(`${host} .sx-why`, e => ({ text: e.innerText, picked: e.querySelector('.sx-whynot--picked')?.innerText || '', lead: e.querySelector('.sx-why__lead')?.innerText || '', btn: !!e.querySelector('[data-a="others"]') }));
            const others = wrong.filter(o => o.i !== pick.i);
            if (!has(fb.text, q.why)) bad27.push(`${q.id}: reason not shown`);
            if (q.hook && !has(fb.text, q.hook)) bad27.push(`${q.id}: line to remember not shown`);
            if (mode === 'wrong') {
              nWrong++;
              if (!has(fb.picked, `Not ${pick.key}.`) || !has(fb.picked, q.no[pick.i])) bad27.push(`${q.id}: picked ${pick.key}, shows "${norm(fb.picked).slice(0, 48)}"`);
              if (!has(fb.lead, `It’s ${keyOf(q.a)}`) || !has(fb.lead, q.o[q.a])) bad27.push(`${q.id}: right answer line "${norm(fb.lead).slice(0, 40)}"`);
              for (const o of others) if (has(fb.text, q.no[o.i])) bad27.push(`${q.id}: ${o.key}'s why-not shown before giving up`);
              if (!fb.btn) bad27.push(`${q.id}: no "why not the others"`);
              else {
                await tap(`${host} [data-a="others"]`);
                const t2 = await page.$eval(`${host} .sx-why`, e => e.innerText);
                for (const o of others) if (!has(t2, `Not ${o.key}. ${q.no[o.i]}`)) bad27.push(`${q.id}: ${o.key}'s why-not missing after giving up`);
              }
            } else {
              nRight++;
              for (const o of others) if (!has(fb.text, `Not ${o.key}. ${q.no[o.i]}`)) bad27.push(`${q.id}: ${o.key}'s why-not not shown after a right answer`);
              if (fb.btn) bad27.push(`${q.id}: a give-up button on a right answer`);
            }
          };
          for (const ch of DATA.CHAPTERS.map(c => c.id).filter(id => DATA.QUIZ.some(q => q.ch === id))) {
            const Q = `[data-sx-quiz="${ch}"]`;
            await answer(Q, 'wrong'); await tap(`${Q} [data-a="next"]`); await answer(Q, 'right');
          }
          for (let k = 0; k < 4; k++) { await answer('[data-sx-round]', k % 2 ? 'right' : 'wrong'); await tap('[data-sx-round] [data-a="next"]'); }
          // Which Sensor, the standalone game: labels for keys
          const W = '[data-sx-which]', prompt = await page.$eval(`${W} .sx-prompt`, e => e.textContent);
          const ws = DATA.WHICH_SENSOR.find(x => x.prompt === prompt), wk = K.find(k => k !== ws.a), rest = K.filter(k => k !== ws.a && k !== wk);
          await tap(`${W} .sx-chip[data-k="${wk}"]`);
          const wt = await page.$eval(`${W} .sx-why`, e => e.innerText);
          if (!has(wt, `Not ${LABEL[wk]}. ${ws.no[wk]}`) || !has(wt, `It’s ${LABEL[ws.a]}.`) || !has(wt, ws.why)) bad27.push(`${ws.id}: picked ${wk}, shows "${norm(wt).slice(0, 48)}"`);
          if (rest.some(k => has(wt, ws.no[k]))) bad27.push(`${ws.id}: the other why-not shown before giving up`);
          await tap(`${W} [data-a="others"]`);
          const wt2 = await page.$eval(`${W} .sx-why`, e => e.innerText);
          if (!rest.every(k => has(wt2, `Not ${LABEL[k]}. ${ws.no[k]}`))) bad27.push(`${ws.id}: the other why-not missing after giving up`);
          ok('V27', !bad27.length && nWrong >= 8 && nRight >= 8, `${nWrong} wrong and ${nRight} right answers across 6 chapter checks, the mixed round and Which Sensor; ${bad27.length ? bad27.slice(0, 3).join(' | ') : 'the picked option’s own why-not, then the right answer, its reason and the line; the others only once given up on or answered right'}`);
        } catch (e) { ok('V27', false, 'threw: ' + String(e.message).split('\n')[0]); }
        try {
          // V28 arrow grids: a reason under each row answered wrong, none under a row answered right
          await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(400);
          const bad28 = []; let nRows = 0;
          for (const ch of [...new Set(HARD.ARROWS.map(a => a.ch))]) {
            const Hh = `[data-sx-hard="${ch}"]`, prompt = await page.$eval(`${Hh} .sx-prompt`, e => e.textContent);
            const item = HARD.ARROWS.find(a => a.q === prompt);
            if (!item) { bad28.push(`${ch}: no arrow grid showing`); continue; }
            for (let r = 0; r < item.rows.length; r++) { const want = item.rows[r][1]; await tap(`${Hh} [data-row="${r}"] .sx-dir[data-dir="${r === 0 ? want : ['up', 'down', 'same'].find(d => d !== want)}"]`); }
            await tap(`${Hh} [data-a="check"]`);
            const got = await page.$$eval(`${Hh} .sx-arrow-row`, rs => rs.map(r => r.querySelector('.sx-arrow-why')?.innerText.trim() || ''));
            got.forEach((g, r) => { nRows++; const want = r === 0 ? '' : item.rows[r][2]; if (g !== want) bad28.push(`${item.id} row ${r + 1}: "${g.slice(0, 40)}"`); });
          }
          ok('V28', !bad28.length && nRows >= 18, `${nRows} rows over every chapter's grid; ${bad28.length ? bad28.slice(0, 3).join(' | ') : 'each wrong row shows its own reason, the right rows none'}`);
        } catch (e) { ok('V28', false, 'threw: ' + String(e.message).split('\n')[0]); }
      }

      // V24 tap targets: every control in the progress panel and the chapters, prose links excepted
      const minH = w < 700 ? 44 : 32;
      await page.evaluate(() => window.scrollTo(0, 0));
      const small = await page.evaluate(min => {
        const out = [];
        for (const e of document.querySelectorAll('#progress a, #progress button, #smart button, #smart input, #smart select')) {
          const r = e.getBoundingClientRect();
          if (!r.width || !r.height || e.closest('p, figcaption, .st-credit')) continue;
          if (r.height < min - 0.5) out.push(`${e.tagName.toLowerCase()}.${String(e.className || e.type).split(' ')[0]} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 18)}" ${Math.round(r.height)}px`);
        }
        return { out, n: document.querySelectorAll('#progress a, #progress button, #smart button, #smart input, #smart select').length };
      }, minH);
      ok('V24', !small.out.length, `${w}px ${small.n} controls, ${small.out.length} under ${minH} px${small.out.length ? ': ' + small.out.slice(0, 5).join(' | ') : ''}`);

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
    ['cloze-accepts-anything', { 'smart-textiles-study-hard.js': ['const all = gaps.every((g, i) => wordMatch(g.value, words[i]));', 'const all = true;'] }, ['V13']],
    ['arrows-ungraded', { 'smart-textiles-study-hard.js': ['const ok = picks[r] === want;', 'const ok = true;'] }, ['V14']],
    ['tolerance-thirty-percent', { 'smart-textiles-study-hard.js': ['Math.abs(ans) * 0.03', 'Math.abs(ans) * 0.3'] }, ['V15']],
    ['order-locks-everything', { 'smart-textiles-study-hard.js': ['order.forEach((v, i) => { if (v === i) locked.add(i); });', 'order.forEach((v, i) => locked.add(i));'] }, ['V16']],
    ['fault-any-layer-right', { 'smart-textiles-study-hard.js': ["answer(f.type === 'swap' &&", 'answer(true ||'] }, ['V17']],
    ['fault-any-gap-right', { 'smart-textiles-study-hard.js': ["answer(f.type === 'missing' &&", 'answer(true ||'] }, ['V17']],
    ['poisson-width-sign', { 'smart-textiles-study-scenes.js': ['width: -nu * e', 'width: nu * e'] }, ['V20', 'V18']],
    ['gauge-ignores-thinning', { 'smart-textiles-study-scenes.js': ['ratio = (1 + e) ** (1 + 2 * g.nu)', 'ratio = (1 + e)'] }, ['V20', 'V18']],
    ['challenge-never-advances', { 'smart-textiles-study-hard.js': ['if (at < spec.targets.length && spec.targets[at][1](v))', 'if (false)'] }, ['V18']],
    ['hard-round-unranked', { 'smart-textiles-study.js': ["ranked('arrows', ARROWS).slice(0, 3)", 'shuffle(ARROWS).slice(0, 3)'] }, ['V19']],
    ['options-not-shuffled', { 'smart-textiles-study.js': ['OPT_ORDER.set(q.id, shuffle(q.o.map((_, i) => i)))', 'OPT_ORDER.set(q.id, q.o.map((_, i) => i))'] }, ['V21']],
    ['options-reshuffled-every-render', { 'smart-textiles-study.js': ['if (!OPT_ORDER.has(q.id)) OPT_ORDER.set(', 'if (true) OPT_ORDER.set('] }, ['V21']],
    ['marking-by-shown-position', { 'smart-textiles-study.js': ["opts.forEach(o => { const k = +o.dataset.i; o.disabled = true;", "opts.forEach((o, k) => { o.disabled = true;"] }, ['V21']],
    ['feedback-letter-from-data-order', { 'smart-textiles-study.js': ['<b>It’s ${keyOf(q.a)}${', "<b>It’s ${'ABCD'[q.a]}${"] }, ['V21', 'V27']],
    ['throwaway-option', { 'smart-textiles-study-data.js': ["o: ['Silver', 'Gold', 'Nickel', 'Copper']", "o: ['Silver', 'Gold', 'Nickel', 'Copper, because it’s magnetic']"] }, ['V22']],
    ['right-answer-longest', { 'smart-textiles-study-data.js': ['export const STATS = [', "QUIZ.forEach(q => { q.o[q.a] += ', which is the fully worked-out answer'; });\nexport const STATS = ["] }, ['V22']],
    ['duplicate-question-id', { 'smart-textiles-study-data.js': ["{ id: 'q-creep',", "{ id: 'q-drift',"] }, ['V22']],
    ['arrow-item-two-rows', { 'smart-textiles-study-hard.js': [", ['LED brightness', 'down', 'With no current, the LED has nothing to turn into light.']]", ']'] }, ['V23']],
    ['arrows-lean-up', { 'smart-textiles-study-hard.js': ["['Its resistance once it cools back to 20 °C', 'same'", "['Its resistance once it cools back to 20 °C', 'up'"] }, ['V23']],
    ['small-slider-hit-area', { 'smart-textiles-study.css': ['  .sx-slider input[type="range"] { height: 44px; }\n', ''] }, ['V24']],
    ['toll-booth-line-back', { 'smart-textiles-study-scenes.js': ['s += T(40, 224, CONTACT.hook, { size: 9.5 });', "s += T(40, 224, 'Every contact is a toll booth.', { size: 9.5 });"] }, ['V25']],
    ['contact-caption-not-read', { 'smart-textiles-study.js': ["for (const el of $$('[data-sx-line=\"contact\"]')) el.textContent = CONTACT.hook;", ''] }, ['V25']],
    ['permittivity-without-r', { 'smart-textiles-study-hard.js': ['fill the gap with polyester (εᵣ ≈ 3)', 'fill the gap with polyester (ε ≈ 3)'] }, ['V25']],
    ['harder-help-repeated', { 'smart-textiles-study.html': ['<div class="sx-hard" data-sx-hard="resist"></div>', '<p class="sx-sub-note" data-sx-harder-help>Again.</p>\n    <div class="sx-hard" data-sx-hard="resist"></div>'] }, ['V25']],
    // PR 2: wrong-answer feedback
    ['whynot-by-shown-position', { 'smart-textiles-study.js': ['opts.map(o => +o.dataset.i), i)', 'opts.map(o => +o.dataset.i), opts.indexOf(b))'] }, ['V27']],
    ['whynot-not-shown', { 'smart-textiles-study.js': ['<b>✕ Not ${keyOf(i)}.</b> ${esc(q.no?.[i] || \'\')}</p>', '<b>✕ Not ${keyOf(i)}.</b></p>'] }, ['V27']],
    ['others-shown-on-a-wrong-answer', { 'smart-textiles-study.js': ['${list(true)}', '${list(false)}'] }, ['V27']],
    ['others-hidden-on-a-right-answer', { 'smart-textiles-study.js': ['<p class="sx-why__sub">Why not the others</p>${list(false)}', '<p class="sx-why__sub">Why not the others</p>${list(true)}'] }, ['V27']],
    ['giving-up-reveals-nothing', { 'smart-textiles-study.js': ["$('[data-others]', why).hidden = false; ", ''] }, ['V27']],
    ['right-answer-hidden-on-a-wrong-answer', { 'smart-textiles-study.js': ['<p class="sx-why__lead"><b>It’s', '<p class="sx-why__lead" hidden><b>It’s'] }, ['V27']],
    ['line-to-remember-dropped', { 'smart-textiles-study.js': ["${q.hook ? `<p class=\"sx-hook\">${esc(q.hook)}</p>` : ''}", ''] }, ['V27']],
    ['sensor-whynot-for-the-wrong-key', { 'smart-textiles-study.js': ['no: KEYS.map(k => sc.no[k] ?? null) }', 'no: KEYS.map(k => sc.no[KEYS[(KEYS.indexOf(k) + 1) % 3]] ?? null) }'] }, ['V27']],
    ['arrow-reason-not-shown', { 'smart-textiles-study-hard.js': ["if (!ok) row.insertAdjacentHTML('beforeend'", "if (false) row.insertAdjacentHTML('beforeend'"] }, ['V28']],
    ['arrow-reason-on-every-row', { 'smart-textiles-study-hard.js': ["if (!ok) row.insertAdjacentHTML('beforeend'", "row.insertAdjacentHTML('beforeend'"] }, ['V28']],
    ['whynot-repeats-the-reason', { 'smart-textiles-study-data.js': ["'Halving would follow if the resistance had doubled. Here only the push changed, and more push drives more flow.'", "'I = V / R. Same fight, twice the push, twice the flow.'"] }, ['V26']],
    ['whynot-is-the-line', { 'smart-textiles-study-data.js': ["'Either kind can be made with metal or carbon; the difference is how the electricity behaves, not the material.'", "'R is a Road, C is a Canyon: remember the line.'"] }, ['V26']],
    ['whynot-copies-a-sibling', { 'smart-textiles-study-data.js': ["'A quarter would need four equal yarns side by side. Two of them give half.'", "'Doubling would follow if the two yarns were joined end to end. Plied together they sit side by side and share the current.'"] }, ['V26']],
    ['whynot-missing', { 'smart-textiles-study-data.js': ["'Silver allergy is rare; silver is even used in wound dressings against the skin.'", 'null'] }, ['V26']],
    ['whynot-scolds', { 'smart-textiles-study-data.js': ["'Silicone is the softest here, around 1 MPa or less.'", "'Obviously not: silicone is the softest here, around 1 MPa or less.'"] }, ['V26']],
    ['reason-back-to-the-line', { 'smart-textiles-study-data.js': ["why: 'A resistive sensor is a conducting path:", "why: 'R is a Road, C is a Canyon.', was: 'A resistive sensor is a conducting path:"] }, ['V26']],
    ['arrow-row-without-a-reason', { 'smart-textiles-study-hard.js': [", 'The battery sets the voltage; a longer thread doesn’t change it.'", ''] }, ['V26']],
    ['sensor-whynot-missing', { 'smart-textiles-study-data.js': ["E: 'Resistive needs contact, so it can’t see a hand 2 cm away; only one of the two works here.'", "E: ''"] }, ['V26']],
    ['pedot-figure-back', { 'smart-textiles-study-data.js': ["rho: 2.3e-6, rhoNote: '≈ 2 × 10⁻⁶ at best (acid-treated film); 10⁻³–10⁻² untreated',", "rho: 1e-5, rhoNote: '≈ 10⁻⁵ at best; often 100× higher',"] }, ['V25']],
  ];
  let failed = 0;
  const only = (process.argv.find(a => a.startsWith('--mutant=')) || '').slice(9).split(',').filter(Boolean);
  for (const [id, patch, want] of MUTANTS) {
    if (only.length && !only.includes(id)) continue;
    const { fails } = await run(patch, !only.length);
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
