#!/usr/bin/env node
/* verify-weave.mjs — the Weave Draft's gate.

   PART ONE (Node, no browser, seconds) drives the shipped weave-draft.js and
   weave-render.js against answers that are WRITTEN DOWN, never read back from
   the module under test:
     - plain weave is the checkerboard  up(p, e) = (p + e) even;
     - 2/2 twill on a straight draw is  up(p, e) = (e - p) mod 4 in {0, 1},
       with warp and weft floats of exactly 2 on both faces;
     - 3/1 twill floats 3 on the warp face and 1 on the weft face; the 4-shaft
       waffle's longest float is 5; satin has no float longer than n - 1;
     - a WIF round trip is LOSSLESS on every preset and on seeded random drafts
       (multi-shaft ends, multi-treadle picks, striped colours included), a
       sinking-shed WIF weaves the same cloth, and the URL hash round-trips the
       WHOLE state, view settings included;
     - the generators produce the sequences they are named for, and the SVG
       export is well-formed and carries one element per drawdown cell.

   PART TWO (--browser) serves the repo over HTTP, drives the real page in
   headless Chromium at a desktop and a PHONE viewport (390 x 844), and checks
   what only a browser can: a click on the tie-up changes the drawdown AND the
   URL hash, a hash reproduces a draft, every export button hands back bytes of
   the right kind, the WIF that comes out reads back equal, and at phone width
   nothing overflows the viewport horizontally (the draft scrolls inside its own
   stage; the page itself does not).

   --negative-control runs part one against COPIES of the modules with one
   thing broken at a time (the drawdown rule, the tie-up lookup, the WIF writer,
   the hash encoder) and requires every check a mutant names to go red and
   nothing else to. A mutant whose anchor no longer matches exactly once is a
   refusal, not a pass. Run it before quoting a pass from a changed harness.

   Usage: node tools/verify-weave.mjs [--browser] [--negative-control] [--shots <dir>] */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const args = process.argv.slice(2);
const BROWSER = args.includes('--browser');
const NEG = args.includes('--negative-control');
const shotsAt = args.indexOf('--shots');
const SHOTS = shotsAt >= 0 ? path.resolve(args[shotsAt + 1]) : null;

/* ------------------------------------------------------------- harness */

function makeRunner() {
  const results = [];
  const check = (name, fn) => {
    try {
      const detail = fn();
      results.push({ name, ok: true, detail: detail == null ? '' : String(detail) });
    } catch (err) {
      results.push({ name, ok: false, detail: err && err.message ? err.message : String(err) });
    }
  };
  check.async = async (name, fn) => {
    try {
      const detail = await fn();
      results.push({ name, ok: true, detail: detail == null ? '' : String(detail) });
    } catch (err) {
      results.push({ name, ok: false, detail: err && err.message ? err.message : String(err) });
    }
  };
  return { check, results };
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const eqArr = (a, b) => a.length === b.length && Array.from(a).every((v, i) => v === b[i]);

function printResults(results, label) {
  let bad = 0;
  for (const r of results) {
    if (!r.ok) bad++;
    console.log(`${r.ok ? ' ok ' : 'FAIL'}  ${r.name}${r.detail ? '  — ' + r.detail : ''}`);
  }
  console.log(`\n${label}: ${results.length - bad} / ${results.length} passed${bad ? `, ${bad} FAILED` : ''}`);
  return bad;
}

/* ------------------------------------------------------------ part one */

async function partOne(draftUrl, renderUrl) {
  const D = await import(draftUrl);
  const R = await import(renderUrl);
  const { check, results } = makeRunner();

  const cell = (dd, s, p, e) => dd[p * s.ends + e];

  check('plain weave is the checkerboard up(p,e) = (p+e) even', () => {
    const s = D.applyPreset(D.blankState(2, 2, 16, 16), 'plain');
    const dd = D.drawdown(s);
    for (let p = 0; p < s.picks; p++) for (let e = 0; e < s.ends; e++) {
      const want = (p + e) % 2 === 0 ? 1 : 0;
      assert(cell(dd, s, p, e) === want, `pick ${p + 1} end ${e + 1}: got ${cell(dd, s, p, e)}, want ${want}`);
    }
    const f = D.floatRuns(dd, s.ends, s.picks);
    assert(f.warpFace === 1 && f.warpBack === 1 && f.weftFace === 1 && f.weftBack === 1,
      `plain weave has a float: ${JSON.stringify([f.warpFace, f.warpBack, f.weftFace, f.weftBack])}`);
    return '256 cells, every float 1';
  });

  check('2/2 twill on a straight draw is up(p,e) = (e-p) mod 4 in {0,1}', () => {
    const s = D.applyPreset(D.blankState(4, 4, 24, 24), 'twill22');
    const dd = D.drawdown(s);
    for (let p = 0; p < s.picks; p++) for (let e = 0; e < s.ends; e++) {
      const d = ((e - p) % 4 + 4) % 4;
      const want = d === 0 || d === 1 ? 1 : 0;
      assert(cell(dd, s, p, e) === want, `pick ${p + 1} end ${e + 1}: got ${cell(dd, s, p, e)}, want ${want}`);
    }
    const f = D.floatRuns(dd, s.ends, s.picks);
    assert([f.warpFace, f.warpBack, f.weftFace, f.weftBack].every(x => x === 2),
      `2/2 twill floats ${JSON.stringify([f.warpFace, f.warpBack, f.weftFace, f.weftBack])}, want 2 everywhere`);
    let up = 0; for (const v of dd) up += v;
    assert(up * 2 === dd.length, `2/2 twill is half warp-up: ${up} of ${dd.length}`);
    return 'diagonal holds on 576 cells; every float exactly 2';
  });

  check('3/1 twill floats 3 on the warp face and 1 on the weft face', () => {
    const s = D.applyPreset(D.blankState(4, 4, 16, 16), 'twill31');
    const f = D.floatRuns(D.drawdown(s), s.ends, s.picks);
    assert(f.warpFace === 3 && f.weftFace === 1 && f.warpBack === 1 && f.weftBack === 3,
      `got ${JSON.stringify(f)}`);
    return `warp ${f.warpFace}/${f.warpBack}, weft ${f.weftFace}/${f.weftBack}`;
  });

  check('the 4-shaft waffle floats 5 at most and the satins n-1', () => {
    const w = D.applyPreset(D.blankState(4, 4, 24, 24), 'waffle');
    const fw = D.floatRuns(D.drawdown(w), w.ends, w.picks);
    const mx = Math.max(fw.warpFace, fw.warpBack, fw.weftFace, fw.weftBack);
    assert(mx === 5, `waffle longest float ${mx}, want 5`);
    for (const [id, n] of [['satin5', 5], ['satin8', 8]]) {
      const s = D.applyPreset(D.blankState(4, 4, 40, 40), id);
      const dd = D.drawdown(s);
      const f = D.floatRuns(dd, s.ends, s.picks);
      assert(f.warpFace === n - 1 && f.weftBack === n - 1, `${id}: warp face ${f.warpFace}, want ${n - 1}`);
      assert(f.weftFace === 1 && f.warpBack === 1, `${id}: a float longer than 1 on the weft face`);
      /* one down-point per pick per repeat, never two adjacent */
      for (let p = 0; p < s.picks; p++) {
        let down = 0; for (let e = 0; e < n; e++) if (!dd[p * s.ends + e]) down++;
        assert(down === 1, `${id} pick ${p + 1}: ${down} ends down in one repeat`);
      }
    }
    return 'waffle 5; satin 5 -> 4; satin 8 -> 7';
  });

  check('every preset threads every end and treadles every pick', () => {
    for (const p of D.PRESETS) {
      const s = D.applyPreset(D.blankState(4, 4, 64, 64), p.id);
      const sum = D.summary(s);
      assert(sum.unthreaded === 0 && sum.untrodden === 0, `${p.id}: ${sum.unthreaded} unthreaded, ${sum.untrodden} untrodden`);
      assert(s.shafts === p.shafts && s.treadles === p.treadles, `${p.id}: counts not applied`);
    }
    return `${D.PRESETS.length} presets`;
  });

  check('generators: straight, point, walk, as drawn in', () => {
    assert(eqArr(D.straightSeq(4), [1, 2, 3, 4]), 'straight');
    assert(eqArr(D.pointSeq(4), [1, 2, 3, 4, 3, 2]), 'point');
    assert(eqArr(D.pointSeq(2), [1, 2]), 'point on 2 shafts is plain');
    const w1 = D.walkSeq(8, 200, 7), w2 = D.walkSeq(8, 200, 7), w3 = D.walkSeq(8, 200, 8);
    assert(eqArr(w1, w2), 'a seed does not reproduce its walk');
    assert(!eqArr(w1, w3), 'two seeds gave one walk');
    for (let i = 1; i < w1.length; i++) assert(Math.abs(w1[i] - w1[i - 1]) === 1, `walk step at ${i} is not +-1`);
    assert(w1.every(v => v >= 1 && v <= 8), 'walk left the shafts');
    const rp = D.applyPreset(D.blankState(4, 4, 16, 16), 'rosepath');
    const adi = D.treadlingFrom(rp, 'asdrawn');
    assert(eqArr(adi.treadling, rp.threading), 'as drawn in is not the threading');
    const s = D.threadingFrom(D.blankState(6, 6, 20, 20), 'point');
    const per = D.period(s.threading);
    assert(per === 10, `point on 6 shafts has period ${per}, want 10`);
    return 'all four';
  });

  check('resize continues the sequence and drops the bits that go away', () => {
    const s = D.applyPreset(D.blankState(4, 4, 8, 8), 'twill22');
    const big = D.resized(s, { ends: 13, picks: 10 });
    for (let e = 0; e < 13; e++) assert(big.threading[e] === s.threading[e % 8], `end ${e + 1}`);
    const small = D.resized(big, { shafts: 2, treadles: 3 });
    assert(small.threading.every(m => m < 4), 'a shaft bit survived the shrink');
    assert(small.tieup.length === 3 && small.tieup.every(m => m < 4), 'tie-up bits survived');
    assert(small.treadling.every(m => m < 8), 'a treadle bit survived');
    return 'ok';
  });

  /* random drafts, seeded, exercising the corners a file has to carry */
  const randomDraft = (seed) => {
    const r = D.rng(seed);
    const pick = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
    const s = D.blankState(pick(2, 16), pick(2, 16), pick(8, 64), pick(8, 64));
    for (let e = 0; e < s.ends; e++) {
      let m = 1 << Math.floor(r() * s.shafts);
      if (r() < 0.1) m |= 1 << Math.floor(r() * s.shafts); // a doubled end
      if (r() < 0.05) m = 0;                               // an unthreaded end
      s.threading[e] = m;
    }
    for (let t = 0; t < s.treadles; t++) s.tieup[t] = Math.floor(r() * (1 << s.shafts));
    for (let p = 0; p < s.picks; p++) {
      let m = 1 << Math.floor(r() * s.treadles);
      if (r() < 0.15) m |= 1 << Math.floor(r() * s.treadles); // two treadles
      if (r() < 0.05) m = 0;
      s.treadling[p] = m;
    }
    const col = () => '#' + Math.floor(r() * 0xffffff).toString(16).padStart(6, '0').toUpperCase();
    s.warp = Array.from({ length: pick(1, 4) }, () => ({ color: col(), count: pick(1, 7) }));
    s.weft = Array.from({ length: pick(1, 4) }, () => ({ color: col(), count: pick(1, 7) }));
    s.view = { mode: r() < 0.5 ? 'draft' : 'drawdown', grid: r() < 0.5, cell: pick(4, 24),
      fabric: r() < 0.5, yarn: pick(40, 100) / 100, maxFloat: pick(2, 32), warn: r() < 0.5 };
    return s;
  };

  check('WIF round trip is lossless on every preset', () => {
    for (const p of D.PRESETS) {
      const s = D.applyPreset(D.blankState(4, 4, 24, 24), p.id);
      s.warp = [{ color: '#EDEDE8', count: 3 }, { color: '#5FA0A0', count: 1 }];
      const back = D.fromWif(D.toWif(s)).state;
      assert(D.sameDraft(s, back), `${p.id} did not survive the WIF`);
      assert(eqArr(D.drawdown(s), D.drawdown(back)), `${p.id}: the drawdown moved`);
    }
    return `${D.PRESETS.length} presets, draft and drawdown identical`;
  });

  check('WIF round trip is lossless on 60 seeded random drafts', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const s = randomDraft(seed);
      const text = D.toWif(s);
      const back = D.fromWif(text).state;
      assert(D.sameDraft(s, back), `seed ${seed}: draft differs after the round trip`);
      assert(eqArr(D.drawdown(s), D.drawdown(back)), `seed ${seed}: drawdown differs`);
      const again = D.toWif(back);
      assert(again === text, `seed ${seed}: a second trip wrote different bytes`);
    }
    return '60 drafts, bytes stable on the second trip';
  });

  check('a sinking-shed WIF weaves the same cloth', () => {
    const s = D.applyPreset(D.blankState(4, 4, 16, 16), 'twill31');
    const all = (1 << s.shafts) - 1;
    let text = D.toWif(s).replace('Rising Shed=yes', 'Rising Shed=no');
    text = text.replace(/\[TIEUP\][^[]*/, '[TIEUP]\n' + Array.from(s.tieup, (m, t) => {
      const comp = (~m) & all; const list = [];
      for (let i = 0; i < s.shafts; i++) if (comp & (1 << i)) list.push(i + 1);
      return `${t + 1}=${list.join(',')}`;
    }).join('\n') + '\n\n');
    const { state, notes } = D.fromWif(text);
    assert(eqArr(D.drawdown(s), D.drawdown(state)), 'the drawdown differs');
    assert(notes.some(n => /sinking/.test(n)), 'the conversion was not reported');
    return notes[0];
  });

  check('WIF reader is case-insensitive, skips comments and refuses what is not a WIF', () => {
    const s = D.applyPreset(D.blankState(2, 2, 8, 8), 'plain');
    const shouted = D.toWif(s).toLowerCase().replace(/^(\[.*\])$/gm, m => m.toUpperCase()) + '\n; trailing comment\n';
    assert(D.sameDraft(s, D.fromWif(shouted).state), 'lower-cased keys did not read');
    let threw = false;
    try { D.fromWif('hello\nthere'); } catch { threw = true; }
    assert(threw, 'a non-WIF text was read');
    threw = false;
    try { D.fromWif('[WIF]\nVersion=1.1\n[WEAVING]\nShafts=40\n'); } catch (e) { threw = /40 shafts/.test(e.message); }
    assert(threw, 'a 40-shaft file was not refused by name');
    return 'ok';
  });

  check('the URL hash round-trips the whole state, view included, on 60 seeded drafts', () => {
    let longest = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const s = randomDraft(seed);
      const h = D.encodeHash(s);
      assert(h.split('&').every(kv => !/[#&=]/.test(kv.slice(kv.indexOf('=') + 1))), `seed ${seed}: hash carries a stray delimiter`);
      longest = Math.max(longest, h.length);
      const back = D.decodeHash('#' + h);
      assert(back, `seed ${seed}: hash did not decode`);
      assert(D.sameState(s, back), `seed ${seed}: state differs after the hash`);
      assert(D.encodeHash(back) === h, `seed ${seed}: a second encoding differs`);
    }
    const max = D.blankState(16, 16, 256, 256);
    assert(D.sameState(max, D.decodeHash(D.encodeHash(max))), 'the largest draft');
    assert(D.decodeHash('#v=9&s=4') === null && D.decodeHash('') === null && D.decodeHash('#junk') === null,
      'a foreign hash was not refused');
    return `longest of 60: ${longest} chars; 16x16x256x256 is ${D.encodeHash(max).length} chars`;
  });

  check('stripes expand cyclically and read back from per-thread colours', () => {
    const cols = D.expandStripes([{ color: '#aabbcc', count: 2 }, { color: '#112233', count: 1 }], 7);
    assert(eqArr(cols, ['#AABBCC', '#AABBCC', '#112233', '#AABBCC', '#AABBCC', '#112233', '#AABBCC']), cols.join(','));
    const st = D.stripesFrom(cols);
    assert(st.length === 5 && st[0].count === 2 && st[4].count === 1, JSON.stringify(st));
    assert(D.expandStripes([], 3).every(c => c === '#EDEDE8'), 'empty stripes fall back to paper');
    return 'ok';
  });

  check('long floats are reported above the bar, in both directions', () => {
    const s = D.applyPreset(D.blankState(4, 4, 16, 16), 'twill31');
    s.view.maxFloat = 2;
    const sum = D.summary(s);
    assert(sum.long.warp.length > 0 && sum.long.weft.length > 0, 'a 3-float was not flagged above a bar of 2');
    assert(sum.long.warp.every(r => r.len === 3 && r.up) && sum.long.weft.every(r => r.len === 3 && r.up),
      'the flagged runs are not the 3/1 twill\'s own');
    s.view.maxFloat = 3;
    assert(D.summary(s).long.warp.length === 0 && D.summary(s).long.weft.length === 0, 'a 3-float was flagged at a bar of 3');
    return `${sum.long.warp.length} warp + ${sum.long.weft.length} weft runs over 2`;
  });

  check('the SVG export is well-formed and carries one element per drawdown cell', () => {
    const s = D.applyPreset(D.blankState(4, 4, 8, 8), 'twill22');
    s.view.mode = 'drawdown'; s.view.grid = false;
    const svg = R.renderSvg(s);
    assert(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/.test(svg) && /<\/svg>\s*$/.test(svg), 'not an svg document');
    const open = (svg.match(/<g\b/g) || []).length, close = (svg.match(/<\/g>/g) || []).length;
    assert(open === close, `unbalanced <g>: ${open} open, ${close} close`);
    const cells = (svg.match(/<rect[^>]*class="dd"/g) || []).length;
    assert(cells === 64, `${cells} drawdown cells, want 64`);
    s.view.fabric = true;
    const fab = R.renderSvg(s);
    const yarn = (fab.match(/<rect[^>]*class="yarn"/g) || []).length;
    const bases = (fab.match(/<rect[^>]*class="yarn-base"/g) || []).length;
    const grads = (fab.match(/<linearGradient/g) || []).length;
    /* one segment per float ON TOP: a column run of warp-up, a row run of warp-down */
    const dd = D.drawdown(s); let want = 0;
    for (let e = 0; e < s.ends; e++) for (let p = 0; p < s.picks; p++)
      if (dd[p * s.ends + e] === 1 && (p === 0 || dd[(p - 1) * s.ends + e] !== 1)) want++;
    for (let p = 0; p < s.picks; p++) for (let e = 0; e < s.ends; e++)
      if (dd[p * s.ends + e] === 0 && (e === 0 || dd[p * s.ends + e - 1] !== 0)) want++;
    assert(yarn === want, `${yarn} yarn segments, the drawdown has ${want} floats on top`);
    assert(bases === s.ends + s.picks, `${bases} under-threads, want ${s.ends + s.picks}`);
    assert(grads === 2, `${grads} gradients for two colours, want 2`);
    const fw = (fab.match(/<rect[^>]*class="float-warn"/g) || []).length;
    assert(fw === 0, `${fw} float warnings on a 2/2 twill at the default bar`);
    return `${cells} cells; fabric ${yarn} segments / ${grads} gradients`;
  });

  check('the layout puts the four parts where a draft puts them', () => {
    const s = D.applyPreset(D.blankState(4, 4, 8, 8), 'twill22');
    const L = R.layout(s);
    const { threading: T, tieup: U, treadling: W, drawdown: X } = L.blocks;
    assert(T.y < X.y && U.y < W.y, 'threading and tie-up are not on top');
    assert(U.x > T.x && W.x > X.x, 'tie-up and treadling are not on the right');
    assert(T.x === X.x && U.x === W.x && T.y === U.y && X.y === W.y, 'the four blocks do not align');
    const hit = R.hitTest(L, X.x + L.cell * 0.5, X.y + L.cell * 0.5);
    assert(hit && hit.block === 'drawdown' && hit.end === s.ends - 1 && hit.pick === 0,
      `top-left drawdown cell is end ${hit && hit.end + 1}, pick ${hit && hit.pick + 1}; end 1 sits at the right`);
    const hitT = R.hitTest(L, T.x + L.cell * (s.ends - 0.5), T.y + L.cell * (s.shafts - 0.5));
    assert(hitT && hitT.block === 'threading' && hitT.end === 0 && hitT.shaft === 0,
      'bottom-right threading cell is not end 1 / shaft 1');
    return 'orientation: end 1 right, pick 1 top, shaft 1 bottom, treadle 1 left';
  });

  return results;
}

/* --------------------------------------------------------- negative ctl */

const MUTANTS = [
  { id: 'the-drawdown-rule-reads-OR', file: 'weave-draft.js',
    from: 'if (m & s.threading[e]) out[row + e] = 1;', to: 'if (m | s.threading[e]) out[row + e] = 1;',
    breaks: ['plain weave is the checkerboard up(p,e) = (p+e) even',
      '2/2 twill on a straight draw is up(p,e) = (e-p) mod 4 in {0,1}',
      '3/1 twill floats 3 on the warp face and 1 on the weft face',
      'the 4-shaft waffle floats 5 at most and the satins n-1',
      'long floats are reported above the bar, in both directions',
      /* every cell up lights the float warnings the SVG check requires absent */
      'the SVG export is well-formed and carries one element per drawdown cell'] },
  { id: 'the-tie-up-is-never-consulted', file: 'weave-draft.js',
    from: 'if (pressed & bit(t)) m |= s.tieup[t];', to: 'if (pressed & bit(t)) m |= bit(t);',
    breaks: ['2/2 twill on a straight draw is up(p,e) = (e-p) mod 4 in {0,1}',
      '3/1 twill floats 3 on the warp face and 1 on the weft face',
      'the 4-shaft waffle floats 5 at most and the satins n-1',
      /* NOT the sinking-shed check: a tie-up that is never consulted is ignored on
         BOTH sides of that comparison, so the two drawdowns still agree */
      'long floats are reported above the bar, in both directions'] },
  { id: 'the-wif-writer-drops-the-treadling', file: 'weave-draft.js',
    from: "if (s.treadling[p]) L.push(`${p + 1}=${maskList(s.treadling[p], s.treadles)}`);", to: '{}',
    breaks: ['WIF round trip is lossless on every preset', 'WIF round trip is lossless on 60 seeded random drafts',
      'a sinking-shed WIF weaves the same cloth',
      'WIF reader is case-insensitive, skips comments and refuses what is not a WIF'] },
  { id: 'the-wif-writer-forgets-the-weft-colours', file: 'weave-draft.js',
    from: 'weftI.forEach((c, i) => L.push(`${i + 1}=${c}`));', to: '{}',
    breaks: ['WIF round trip is lossless on 60 seeded random drafts'] },
  { id: 'the-hash-drops-the-grid-setting', file: 'weave-draft.js',
    from: "['g', v.grid ? 1 : 0],", to: '',
    breaks: ['the URL hash round-trips the whole state, view included, on 60 seeded drafts'] },
  { id: 'the-hash-reads-the-tie-up-as-the-treadling', file: 'weave-draft.js',
    from: "s.treadling = b64ToU16(kv.tr || '', s.picks).map(x => x & mt);",
    to: "s.treadling = b64ToU16(kv.tu || '', s.picks).map(x => x & mt);",
    breaks: ['the URL hash round-trips the whole state, view included, on 60 seeded drafts'] },
  { id: 'the-walk-may-repeat-a-shaft', file: 'weave-draft.js',
    from: 'let next = cur + (r() < 0.5 ? -1 : 1);', to: 'let next = cur + (r() < 0.5 ? 0 : 1);',
    breaks: ['generators: straight, point, walk, as drawn in'] },
  { id: 'end-1-is-drawn-at-the-left', file: 'weave-render.js',
    from: 'const endOfCol = (L, c) => L.ends - 1 - c;', to: 'const endOfCol = (L, c) => c;',
    breaks: ['the layout puts the four parts where a draft puts them'] },
];

async function negativeControl() {
  const scratch = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'weave-neg-'));
  const sources = { 'weave-draft.js': fs.readFileSync(path.join(REPO, 'weave-draft.js'), 'utf8'),
    'weave-render.js': fs.readFileSync(path.join(REPO, 'weave-render.js'), 'utf8') };
  /* every anchor first, before any mutant runs */
  for (const m of MUTANTS) {
    const n = sources[m.file].split(m.from).length - 1;
    if (n !== 1) { console.error(`REFUSED: mutant ${m.id} anchors ${n} times in ${m.file} (want exactly 1)`); process.exit(2); }
  }
  const base = await partOne(pathToFileURL(path.join(REPO, 'weave-draft.js')).href,
    pathToFileURL(path.join(REPO, 'weave-render.js')).href);
  const names = new Set(base.map(r => r.name));
  for (const m of MUTANTS) for (const b of m.breaks) {
    if (!names.has(b)) { console.error(`REFUSED: mutant ${m.id} names a check the gate does not run: ${b}`); process.exit(2); }
  }
  if (base.some(r => !r.ok)) { printResults(base, 'base pass'); console.error('the base pass is not clean; fix that first'); process.exit(1); }
  let bad = 0;
  for (const m of MUTANTS) {
    const dir = fs.mkdtempSync(path.join(scratch, m.id + '-'));
    for (const [file, src] of Object.entries(sources)) {
      const body = file === m.file ? src.replace(m.from, m.to) : src;
      fs.writeFileSync(path.join(dir, file), body);
    }
    const res = await partOne(pathToFileURL(path.join(dir, 'weave-draft.js')).href,
      pathToFileURL(path.join(dir, 'weave-render.js')).href);
    const red = new Set(res.filter(r => !r.ok).map(r => r.name));
    const missed = m.breaks.filter(b => !red.has(b));
    const unclaimed = [...red].filter(r => !m.breaks.includes(r));
    const ok = !missed.length && !unclaimed.length;
    if (!ok) bad++;
    console.log(`${ok ? ' ok ' : 'FAIL'}  mutant ${m.id}: ${red.size} red` +
      (missed.length ? `; MISSED (stayed green): ${missed.join(' | ')}` : '') +
      (unclaimed.length ? `; UNCLAIMED red: ${unclaimed.join(' | ')}` : ''));
  }
  fs.rmSync(scratch, { recursive: true, force: true });
  console.log(`\nnegative control: ${MUTANTS.length - bad} / ${MUTANTS.length} mutants behave`);
  return bad;
}

/* ------------------------------------------------------------ part two */

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const roots = [
    ...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []),
    '/opt/node22/lib/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules',
  ];
  for (const root of roots) {
    const entry = path.join(root, 'playwright', 'index.js');
    if (fs.existsSync(entry)) return require(entry);
  }
  try { return require('playwright'); } catch {
    console.error('Could not resolve playwright. Try: NODE_PATH=/opt/node22/lib/node_modules node tools/verify-weave.mjs --browser');
    process.exit(2);
  }
}

function serveRepo() {
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon', '.png': 'image/png', '.wif': 'text/plain' };
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    if (rel === 'weave') rel = 'weave.html';
    const file = path.join(REPO, rel);
    if (!file.startsWith(REPO) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(fs.readFileSync(file));
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

async function partTwo() {
  const D = await import(pathToFileURL(path.join(REPO, 'weave-draft.js')).href);
  const { chromium } = loadPlaywright();
  const { server, port } = await serveRepo();
  const base = `http://127.0.0.1:${port}/weave.html`;
  const browser = await chromium.launch();
  const { check, results } = makeRunner();
  const errors = [];
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

  const open = async (viewport, hash = '', extra = {}) => {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, acceptDownloads: true, ...extra });
    /* the webfont is chrome: answer it with an empty sheet rather than aborting,
       which Chromium would log as a resource error */
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(base + hash, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__weave && window.__weave.ready);
    return { ctx, page };
  };
  const download = async (page, selector) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.click(selector)]);
    const file = await dl.path();
    return { name: dl.suggestedFilename(), bytes: fs.readFileSync(file) };
  };

  const desk = await open({ width: 1280, height: 800 });
  const page = desk.page;

  await check.async('desktop: the page opens on the default draft with no console error', async () => {
    const st = await page.evaluate(() => window.__weave.summary());
    assert(st.shafts === 4 && st.treadles === 4 && st.ends === 32 && st.picks === 32, JSON.stringify(st));
    assert(errors.length === 0, errors.join(' | '));
    return `${st.shafts}x${st.treadles}, ${st.ends}x${st.picks}`;
  });

  await check.async('desktop: a click on a tie-up cell changes the drawdown and the hash', async () => {
    const before = await page.evaluate(() => ({ hash: location.hash, dd: window.__weave.drawdownDigest() }));
    const pt = await page.evaluate(() => window.__weave.cellCentre('tieup', { treadle: 0, shaft: 2 }));
    await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => ({ hash: location.hash, dd: window.__weave.drawdownDigest(),
      tie: window.__weave.state().tieup[0] }));
    assert(after.dd !== before.dd, 'the drawdown did not change');
    assert(after.hash !== before.hash && after.hash.length > 20, 'the hash did not change');
    assert((after.tie & (1 << 2)) !== 0, `treadle 1 is not tied to shaft 3: mask ${after.tie}`);
    await page.mouse.click(pt.x, pt.y); // put it back
    await page.waitForTimeout(250);
    const restored = await page.evaluate(() => ({ hash: location.hash, dd: window.__weave.drawdownDigest() }));
    assert(restored.dd === before.dd && restored.hash === before.hash, 'a second click did not toggle it back');
    return 'toggled and restored';
  });

  await check.async('desktop: a drag across the threading paints a straight draw', async () => {
    await page.evaluate(() => window.__weave.set({ clear: 'threading' }));
    const a = await page.evaluate(() => window.__weave.cellCentre('threading', { end: 0, shaft: 0 }));
    const b = await page.evaluate(() => window.__weave.cellCentre('threading', { end: 3, shaft: 3 }));
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(a.x + (b.x - a.x) * i / 12, a.y + (b.y - a.y) * i / 12);
    await page.mouse.up();
    await page.waitForTimeout(250);
    const th = await page.evaluate(() => Array.from(window.__weave.state().threading.slice(0, 4)));
    assert(eqArr(th, [1, 2, 4, 8]), `ends 1-4 read ${th.join(',')}, want 1,2,4,8`);
    await page.evaluate(() => window.__weave.set({ preset: 'twill22' }));
    return 'ends 1-4 on shafts 1-4';
  });

  await check.async('desktop: a hash reproduces a draft exactly', async () => {
    const s = D.applyPreset(D.blankState(4, 4, 20, 14), 'waffle');
    s.warp = [{ color: '#AABBCC', count: 2 }, { color: '#112233', count: 1 }];
    s.view = { mode: 'drawdown', grid: false, cell: 9, fabric: true, yarn: 0.6, maxFloat: 7, warn: false };
    const other = await open({ width: 1280, height: 800 }, '#' + D.encodeHash(s));
    const got = await other.page.evaluate(() => window.__weave.hash());
    assert(got === D.encodeHash(s), 'the page re-encoded a different state');
    const sum = await other.page.evaluate(() => window.__weave.summary());
    assert(sum.ends === 20 && sum.picks === 14 && sum.mode === 'drawdown' && sum.fabric === true, JSON.stringify(sum));
    await other.ctx.close();
    return 'waffle 20x14, drawdown-only fabric view';
  });

  await check.async('desktop: WIF export reads back equal, and the file input imports it', async () => {
    const { name, bytes } = await download(page, '#exportWif');
    assert(/\.wif$/.test(name), name);
    const live = await page.evaluate(() => window.__weave.hash());
    const back = D.fromWif(bytes.toString('utf8')).state;
    assert(D.sameDraft(D.decodeHash(live), back), 'the exported WIF differs from the draft on screen');
    await page.evaluate(() => window.__weave.set({ preset: 'plain' }));
    await page.setInputFiles('#importWif', { name: 'back.wif', mimeType: 'text/plain', buffer: bytes });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => window.__weave.hash());
    assert(D.sameDraft(D.decodeHash(after), back), 'the import did not restore the draft');
    return `${bytes.length} bytes, imported back`;
  });

  await check.async('desktop: SVG and PNG exports hand back the right bytes', async () => {
    const svg = await download(page, '#exportSvg');
    assert(/\.svg$/.test(svg.name) && /^<svg xmlns=/.test(svg.bytes.toString('utf8')), 'not an svg');
    const png = await download(page, '#exportPng');
    assert(/\.png$/.test(png.name) && png.bytes[0] === 0x89 && png.bytes.toString('latin1', 1, 4) === 'PNG', 'not a png');
    return `svg ${svg.bytes.length} B, png ${png.bytes.length} B`;
  });

  await check.async('desktop: every control is reachable and the readout names the floats', async () => {
    await page.selectOption('#preset', 'twill31');
    await page.fill('#maxFloat', '2');
    await page.dispatchEvent('#maxFloat', 'input');
    await page.waitForTimeout(200);
    const text = await page.textContent('#readout');
    assert(/over 2/.test(text) && /warp 3/.test(text), text);
    await page.selectOption('#preset', 'twill22');
    await page.fill('#maxFloat', '5'); await page.dispatchEvent('#maxFloat', 'input');
    return text.split('\n')[1] || text.slice(0, 80);
  });

  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'weave-desktop.png'), fullPage: false });
  await desk.ctx.close();

  const phone = await open({ width: 390, height: 844 }, '', { hasTouch: true, isMobile: true });
  await check.async('phone (390px): nothing overflows the viewport horizontally', async () => {
    const m = await phone.page.evaluate(() => ({
      docW: document.documentElement.scrollWidth, bodyW: document.body.scrollWidth, inner: window.innerWidth,
      panel: document.querySelector('.wv-panel').getBoundingClientRect().toJSON(),
      stage: document.querySelector('.wv-stage').getBoundingClientRect().toJSON(),
    }));
    assert(m.docW <= m.inner && m.bodyW <= m.inner, `page scrollWidth ${m.docW}/${m.bodyW} > ${m.inner}`);
    assert(m.panel.right <= m.inner + 0.5 && m.panel.left >= -0.5, `panel ${JSON.stringify(m.panel)}`);
    assert(m.stage.right <= m.inner + 0.5, `stage ${JSON.stringify(m.stage)}`);
    return `doc ${m.docW} <= ${m.inner}; panel ${Math.round(m.panel.width)} wide`;
  });
  await check.async('phone: the draft is tappable and the panel still drives it', async () => {
    const before = await phone.page.evaluate(() => window.__weave.drawdownDigest());
    /* the tie-up is to the right of 32 ends — off-screen at 390 px until the stage scrolls */
    const pt = await phone.page.evaluate(() => window.__weave.reveal('tieup', { treadle: 1, shaft: 0 }));
    assert(pt.x >= 0 && pt.x <= 390 && pt.y >= 0 && pt.y <= 844, `cell is still off-screen at ${JSON.stringify(pt)}`);
    await phone.page.touchscreen.tap(pt.x, pt.y);
    await phone.page.waitForTimeout(250);
    const after = await phone.page.evaluate(() => window.__weave.drawdownDigest());
    assert(after !== before, 'a tap on the tie-up changed nothing');
    await phone.page.selectOption('#preset', 'plain');
    await phone.page.waitForTimeout(200);
    const st = await phone.page.evaluate(() => window.__weave.summary());
    assert(st.shafts === 2, 'the preset select did not apply');
    return 'tap toggled; preset applied';
  });
  if (SHOTS) await phone.page.screenshot({ path: path.join(SHOTS, 'weave-phone.png'), fullPage: false });
  await phone.ctx.close();

  check('no page error or console error during the browser run', () => {
    assert(errors.length === 0, errors.join(' | '));
    return 'clean';
  });

  await browser.close();
  server.close();
  return results;
}

/* ---------------------------------------------------------------- main */

let failed = 0;
if (NEG) {
  failed += await negativeControl();
} else {
  const one = await partOne(pathToFileURL(path.join(REPO, 'weave-draft.js')).href,
    pathToFileURL(path.join(REPO, 'weave-render.js')).href);
  failed += printResults(one, 'part one (Node)');
  if (BROWSER) {
    console.log('');
    const two = await partTwo();
    failed += printResults(two, 'part two (browser)');
  }
}
process.exit(failed ? 1 : 0);
