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
       (multi-shaft ends, multi-treadle picks, yarn libraries, interleaved
       systems and construction included), a sinking-shed WIF weaves the same
       cloth, and the URL hash round-trips the WHOLE state, view settings
       included;
     - the generators produce the sequences they are named for, and the SVG
       export is well-formed and carries one element per drawdown cell;
     - THE CONSTRUCTION: the count conversions reproduce known values (150 den
       is 16.67 tex and 166.7 dtex, Ne 30 is 177.2 den, Nm 50 is 180 den, an
       inch is 25.4 mm, 20 per cm is 50.8 per inch) and the diameter estimate
       reproduces Peirce's 1/(28 sqrt Ne) inch for cotton; the weight per metre
       is a WORKED EXAMPLE DONE BY HAND in the test (2000 ends of 150 den at 5 %
       crimp are 35.0 g/m, a one-metre weft at 20 per cm the same, 70 g/m in
       all), with a mixed two-system warp worked beside it; a v=1 hash from the
       stripe era migrates into yarns and systems with every thread's colour
       unmoved; the "too dense" warning fires exactly past 100 % cover in a
       direction and not under it; the systems interleave by ratio; the sheet
       and the CSV carry what physical() says; the WIF carries the sett as
       Spacing and the diameters as Thickness and reads a foreign WIF's spacing
       back as the sett; the true-scale layout spaces the threads at the sett.

   PART TWO (--browser) serves the repo over HTTP, drives the real page in
   headless Chromium at a desktop and a PHONE viewport (390 x 844), and checks
   what only a browser can: a click on the tie-up changes the drawdown AND the
   URL hash, a hash reproduces a draft, every export button hands back bytes of
   the right kind (the PDF through jsPDF served from node_modules at the pinned
   cdnjs URL), the WIF that comes out reads back equal, the yarn editor and the
   physical inputs reach the drawdown, the read-out and the hash, the warning
   appears on screen, and at phone width nothing overflows the viewport
   horizontally with the yarn library open (the draft scrolls inside its own
   stage; the page itself does not).

   --negative-control runs part one against COPIES of the modules with one
   thing broken at a time (the drawdown rule, the tie-up lookup, the WIF writer,
   the hash encoder, the denier arithmetic, the stripe migration, the warning
   threshold) and requires every check a mutant names to go red and nothing
   else to. A mutant whose anchor no longer matches exactly once is a refusal,
   not a pass. Run it before quoting a pass from a changed harness.

   Usage: node tools/verify-weave.mjs [--browser] [--negative-control] [--shots <dir>]
   Part two needs jsPDF for the PDF check: npm i --no-save jspdf@2.5.1 */

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
    /* a yarn library with awkward names (every delimiter the hash and the WIF
       use), fractional counts, both twists, an elastic yarn now and then */
    const nY = pick(1, 4);
    s.yarns = Array.from({ length: nY }, (_, i) => D.newYarn({
      id: `y${i + 1}`, name: ['cotton 30s', 'poly 150/48', 'a&b|c,d=e#f;g', 'wool 2/20 Nm'][i] + (r() < 0.3 ? ' x' : ''),
      fiber: D.FIBERS[Math.floor(r() * D.FIBERS.length)].id, den: Math.round(r() * 200000) / 100 + 20,
      filaments: r() < 0.5 ? 0 : pick(1, 200), ply: pick(1, 4), tpm: pick(0, 1200), twist: r() < 0.5 ? 'S' : 'Z',
      elastic: r() < 0.25, relax: Math.round((0.1 + r() * 0.9) * 100) / 100, color: col() }));
    const systems = (dir) => Array.from({ length: pick(1, 3) }, (_, i) => D.newSystem({
      name: `${dir} ${i + 1}${r() < 0.3 ? ' & more' : ''}`, ratio: pick(1, 4),
      seq: Array.from({ length: pick(1, 3) }, () => ({ yarn: `y${pick(1, nY)}`, count: pick(1, 7) })) }));
    s.warpSystems = systems('warp'); s.weftSystems = systems('weft');
    const inches = r() < 0.5;
    s.physical = { width: inches ? pick(5, 300) + 0.5 : pick(100, 3000), widthUnit: inches ? 'in' : 'mm',
      epi: pick(4, 120) + (r() < 0.5 ? 0.25 : 0), ppi: pick(4, 120), densityUnit: r() < 0.5 ? 'in' : 'cm',
      crimpWarp: pick(0, 20), crimpWeft: pick(0, 20) + 0.5 };
    s.view = { mode: r() < 0.5 ? 'draft' : 'drawdown', grid: r() < 0.5, cell: pick(4, 24),
      fabric: r() < 0.5, yarn: pick(40, 100) / 100, maxFloat: pick(2, 32), warn: r() < 0.5,
      trueScale: r() < 0.3, dpi: pick(50, 600) };
    return s;
  };

  check('WIF round trip is lossless on every preset', () => {
    for (const p of D.PRESETS) {
      const s = D.applyPreset(D.blankState(4, 4, 24, 24), p.id);
      s.warpSystems = [D.newSystem({ name: 'ground', ratio: 1, seq: [{ yarn: 'y1', count: 3 }, { yarn: 'y2', count: 1 }] })];
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

  /* ------------------------------------------------------ construction */

  const near = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, `${msg}: got ${a}, want ${b} (±${tol})`);

  check('count conversions reproduce the known values, and the diameter reproduces Peirce', () => {
    /* denier = g / 9000 m; tex = g / 1000 m; dtex = g / 10000 m; Ne = 840-yard
       hanks per pound (5315 / den); Nm = metres per gram (9000 / den) */
    near(D.fromDenier(150, 'tex'), 16.6667, 1e-3, '150 den in tex');
    near(D.fromDenier(150, 'dtex'), 166.667, 1e-2, '150 den in dtex');
    near(D.toDenier(30, 'Ne'), 177.167, 1e-2, 'Ne 30 in denier');
    near(D.toDenier(50, 'Nm'), 180, 1e-9, 'Nm 50 in denier');
    near(D.fromDenier(D.toDenier(59.05, 'tex'), 'Ne'), 10, 1e-2, 'tex 59.05 is Ne 10');
    near(D.toDenier(1, 'tex'), 9, 1e-12, 'a tex is nine denier');
    near(D.toDenier(10, 'dtex'), 9, 1e-12, 'ten dtex is nine denier');
    for (const u of D.COUNT_UNITS) near(D.toDenier(D.fromDenier(333.3, u), u), 333.3, 1e-9, `${u} does not invert`);
    assert(Number.isNaN(D.toDenier(0, 'Ne')) && Number.isNaN(D.toDenier(-1, 'den')), 'a non-positive count was not refused');
    /* the physical panel's own two unit pairs */
    const s = D.defaultState();
    s.physical = { width: 10, widthUnit: 'in', epi: 20, ppi: 10, densityUnit: 'cm', crimpWarp: 0, crimpWeft: 0 };
    const ph = D.physical(s);
    near(ph.widthMm, 254, 1e-9, 'ten inches in mm');
    near(ph.epi, 50.8, 1e-9, '20 per cm in per inch');
    near(ph.ppi, 25.4, 1e-9, '10 per cm in per inch');
    assert(ph.totalEnds === 508, `254 mm at 20 per cm is 508 ends, got ${ph.totalEnds}`);
    s.physical = { width: 254, widthUnit: 'mm', epi: 50.8, ppi: 25.4, densityUnit: 'in', crimpWarp: 0, crimpWeft: 0 };
    const ph2 = D.physical(s);
    near(ph2.epcm, 20, 1e-9, '50.8 per inch in per cm');
    assert(ph2.totalEnds === 508, `the same cloth in inches is ${ph2.totalEnds} ends`);
    /* diameter: d = sqrt(tex / (250 pi rho)), rho = fibre density x packing,
       stated here independently; cotton Ne 30 against Peirce's 1/(28 sqrt Ne) in */
    const cotton = D.newYarn({ id: 'y1', fiber: 'cotton', den: D.toDenier(30, 'Ne'), filaments: 0 });
    const tex = cotton.den / 9, rho = 1.54 * 0.60;
    const want = Math.sqrt(tex / (250 * Math.PI * rho));
    near(D.yarnDiameterMm(cotton), want, 1e-12, 'the diameter formula');
    const peirce = 25.4 / (28 * Math.sqrt(30));
    assert(Math.abs(want - peirce) / peirce < 0.02, `cotton Ne 30: ${want.toFixed(4)} mm against Peirce's ${peirce.toFixed(4)} — more than 2 % apart`);
    const fil = D.newYarn({ id: 'y2', fiber: 'cotton', den: cotton.den, filaments: 48 });
    assert(D.yarnDiameterMm(fil) < D.yarnDiameterMm(cotton), 'a filament yarn did not pack tighter than a spun one');
    return `150 den = 16.67 tex = 166.7 dtex; Ne 30 = 177.2 den; cotton Ne 30 ≈ ${want.toFixed(4)} mm (Peirce ${peirce.toFixed(4)})`;
  });

  check('weight per metre reproduces the worked example done by hand', () => {
    /* BY HAND. One yarn, 150 denier: 150 / 9000 = 0.016667 g per metre of yarn.
       Width 1000 mm at 20 ends/cm: 2000 ends. Each end runs one metre of cloth
       plus 5 % crimp: 2000 x 0.016667 x 1.05 = 35.000 g/m.
       Weft at 20 picks/cm: 2000 picks per metre, each the 1 m width plus 5 %:
       2000 x 1 x 0.016667 x 1.05 = 35.000 g/m. Total 70.000 g/m; the cloth is
       one metre wide so 70.0 g/m2. */
    const s = D.defaultState();
    s.yarns = [D.newYarn({ id: 'y1', name: 'poly', fiber: 'polyester', den: 150, filaments: 48, color: '#5FA0A0' })];
    s.warpSystems = [D.newSystem({ name: 'ground', ratio: 1, seq: [{ yarn: 'y1', count: 1 }] })];
    s.weftSystems = [D.newSystem({ name: 'ground', ratio: 1, seq: [{ yarn: 'y1', count: 1 }] })];
    s.physical = { width: 1000, widthUnit: 'mm', epi: 20, ppi: 20, densityUnit: 'cm', crimpWarp: 5, crimpWeft: 5 };
    const ph = D.physical(s);
    assert(ph.totalEnds === 2000, `${ph.totalEnds} ends, want 2000`);
    near(ph.warp.gPerM, 35, 1e-9, 'warp g/m');
    near(ph.weft.gPerM, 35, 1e-9, 'weft g/m');
    near(ph.gPerM, 70, 1e-9, 'total g/m');
    near(ph.gsm, 70, 1e-9, 'g/m2');
    assert(ph.warp.systems.length === 1 && ph.warp.systems[0].threads === 2000, 'the one warp system does not hold every end');
    near(ph.weft.systems[0].threads, 2000, 1e-9, 'the one weft system does not hold every pick');
    /* BY HAND, two systems interleaved 1:1 over 2000 ends: A is 1000 ends of
       150 den (16.667 g/m x 1.05 = 17.500), B is 1000 ends of 300 den (35.000);
       warp 52.500. Weft unchanged at 35.000 -> 87.500 g/m. Zero crimp on the
       weft takes it to 33.333: 85.833 in all. */
    s.yarns.push(D.newYarn({ id: 'y2', name: 'heavy', fiber: 'polyester', den: 300, filaments: 96, color: '#EDEDE8' }));
    s.warpSystems = [D.newSystem({ name: 'A', ratio: 1, seq: [{ yarn: 'y1', count: 1 }] }),
      D.newSystem({ name: 'B', ratio: 1, seq: [{ yarn: 'y2', count: 1 }] })];
    const two = D.physical(s);
    near(two.warp.systems[0].gPerM, 17.5, 1e-9, 'system A');
    near(two.warp.systems[1].gPerM, 35, 1e-9, 'system B');
    near(two.warp.gPerM, 52.5, 1e-9, 'two-system warp');
    near(two.gPerM, 87.5, 1e-9, 'two-system total');
    s.physical.crimpWeft = 0;
    near(D.physical(s).gPerM, 52.5 + 2000 / 9000 * 150, 1e-9, 'zero weft crimp');
    /* and the width in inches: 39.37 in is the same metre */
    s.physical = { width: 1000 / 25.4, widthUnit: 'in', epi: 20, ppi: 20, densityUnit: 'cm', crimpWarp: 5, crimpWeft: 5 };
    near(D.physical(s).gPerM, 87.5, 1e-6, 'the same cloth with the width in inches');
    return 'one system 35 + 35 = 70 g/m; two systems 1:1 at 150/300 den 52.5 + 35 = 87.5 g/m';
  });

  check('systems interleave by ratio and every thread resolves to a yarn', () => {
    const yarns = [D.newYarn({ id: 'y1', color: '#111111' }), D.newYarn({ id: 'y2', color: '#222222' }), D.newYarn({ id: 'y3', color: '#333333' })];
    const A = D.newSystem({ name: 'A', ratio: 2, seq: [{ yarn: 'y1', count: 1 }, { yarn: 'y2', count: 1 }] });
    const B = D.newSystem({ name: 'B', ratio: 1, seq: [{ yarn: 'y3', count: 1 }] });
    const got = D.resolveThreads([A, B], yarns, 9).map(t => t.yarn);
    /* A takes two ends in turn through its own repeat (y1, y2, y1, y2 ...), B one */
    assert(eqArr(got, ['y1', 'y2', 'y3', 'y1', 'y2', 'y3', 'y1', 'y2', 'y3']), got.join(','));
    const sys = D.resolveThreads([A, B], yarns, 9).map(t => t.sys);
    assert(eqArr(sys, [0, 0, 1, 0, 0, 1, 0, 0, 1]), 'system indices ' + sys.join(','));
    const A3 = D.newSystem({ name: 'A', ratio: 3, seq: [{ yarn: 'y1', count: 2 }, { yarn: 'y2', count: 1 }] });
    const g2 = D.resolveThreads([A3, B], yarns, 8).map(t => t.yarn);
    assert(eqArr(g2, ['y1', 'y1', 'y2', 'y3', 'y1', 'y1', 'y2', 'y3']), g2.join(','));
    /* a system naming a yarn the library no longer has contributes nothing;
       with no live system every thread is the library's first yarn */
    const ghost = D.newSystem({ name: 'g', ratio: 1, seq: [{ yarn: 'y9', count: 1 }] });
    assert(D.resolveThreads([ghost, B], yarns, 4).every(t => t.yarn === 'y3'), 'a ghost yarn took threads');
    assert(D.resolveThreads([ghost], yarns, 4).every(t => t.yarn === 'y1' && t.sys === -1), 'no live system did not fall back');
    const s = D.defaultState();
    assert(D.threadColors(s, 'warp', 3).every(c => c === '#EDEDE8') && D.threadColors(s, 'weft', 3).every(c => c === '#5FA0A0'),
      'the default draft does not keep its paper warp and teal weft');
    assert(D.yarnInUse(s, 'y1') && D.yarnInUse(s, 'y2') && !D.yarnInUse(s, 'y3'), 'yarnInUse');
    return 'A:B at 2:1 and 3:1; ghosts drop; the fallback is the first yarn';
  });

  check('a legacy v=1 hash migrates its stripes into yarns and systems with every colour unmoved', () => {
    /* captured from the stripe-era encoder: a waffle 8x8, warp AABBCC x2 /
       112233 x1, weft 5FA0A0 x3 / AABBCC x1, drawdown-only fabric view */
    const legacy = 'v=1&s=4&t=4&e=8&p=8&th=AQACAAQACAABAAIABAAIAA&tu=AwAGAAwACQA&tr=AQACAAQACAABAAIABAAIAA'
      + '&wc=AABBCC.2,112233.1&fc=5FA0A0.3,AABBCC.1&vm=dd&g=0&c=9&f=1&y=60&m=7&w=0';
    const s = D.decodeHash('#' + legacy);
    assert(s, 'the legacy hash did not decode');
    assert(s.shafts === 4 && s.ends === 8 && s.picks === 8 && s.view.mode === 'drawdown' && s.view.fabric && s.view.cell === 9
      && s.view.maxFloat === 7 && s.view.warn === false, 'the draft or the view moved');
    /* the stripes expanded by the stripe-era rule — written down */
    const wantWarp = ['#AABBCC', '#AABBCC', '#112233', '#AABBCC', '#AABBCC', '#112233', '#AABBCC', '#AABBCC'];
    const wantWeft = ['#5FA0A0', '#5FA0A0', '#5FA0A0', '#AABBCC', '#5FA0A0', '#5FA0A0', '#5FA0A0', '#AABBCC'];
    assert(eqArr(D.threadColors(s, 'warp', 8), wantWarp), 'warp colours ' + D.threadColors(s, 'warp', 8).join(','));
    assert(eqArr(D.threadColors(s, 'weft', 8), wantWeft), 'weft colours ' + D.threadColors(s, 'weft', 8).join(','));
    /* one auto-generated yarn per distinct colour, shared across the directions */
    assert(s.yarns.length === 3, `${s.yarns.length} yarns for three colours`);
    assert(eqArr(s.yarns.map(y => y.color), ['#AABBCC', '#112233', '#5FA0A0']), s.yarns.map(y => y.color).join(','));
    assert(s.warpSystems.length === 1 && s.weftSystems.length === 1, 'one system per direction');
    assert(s.warpSystems[0].seq.length === 2 && s.warpSystems[0].seq[0].count === 2 && s.warpSystems[0].seq[1].count === 1, 'the warp repeat');
    assert(s.weftSystems[0].seq[0].count === 3 && s.weftSystems[0].seq[1].yarn === s.warpSystems[0].seq[0].yarn, 'the weft repeat shares the warp\'s yarn');
    assert(s.physical.width === D.PHYSICAL_DEFAULTS.width && s.view.trueScale === false, 'a legacy hash should take the physical defaults');
    /* and it re-encodes as v=2, which decodes to the same state */
    const h = D.encodeHash(s);
    assert(/^v=2&/.test(h) && !/&wc=|&fc=/.test(h), 'the re-encoding is not v=2 without stripes');
    assert(D.sameState(s, D.decodeHash('#' + h)), 'the migrated state does not round-trip');
    /* a stripe-era hash with no stripes at all keeps the starter library */
    const bare = D.decodeHash('#v=1&s=2&t=2&e=8&p=8');
    assert(bare && bare.yarns.length === D.starterYarns().length, 'a bare v=1 hash lost the starter library');
    assert(D.decodeHash('#v=3&s=4') === null, 'a v=3 hash was not refused');
    return '3 yarns, 2 systems, 16 thread colours identical; re-encodes as v=2';
  });

  check('the too-dense warning fires exactly past 100 % cover in a direction and not under it', () => {
    /* cover = threads per mm x diameter. The diameter is the test's own formula
       (above), so the threshold sett is derived here, not read off the model. */
    const s = D.defaultState();
    s.yarns = [D.newYarn({ id: 'y1', name: 'c', fiber: 'cotton', den: 300, filaments: 0, color: '#EDEDE8' })];
    s.warpSystems = [D.newSystem({ name: 'g', ratio: 1, seq: [{ yarn: 'y1', count: 1 }] })];
    s.weftSystems = [D.newSystem({ name: 'g', ratio: 1, seq: [{ yarn: 'y1', count: 1 }] })];
    const d = Math.sqrt((300 / 9) / (250 * Math.PI * 1.54 * 0.60));
    const jam = 10 / d;   // threads per cm at which the summed diameters fill the width
    const at = (epcm, ppcm) => {
      s.physical = { width: 1000, widthUnit: 'mm', epi: epcm, ppi: ppcm, densityUnit: 'cm', crimpWarp: 5, crimpWeft: 5 };
      return D.physical(s);
    };
    const under = at(jam * 0.98, jam * 0.98);
    assert(!under.tooDense && D.denseWarning(under) === '', `warned at 98 % cover: ${D.denseWarning(under)}`);
    near(under.warp.cover, 0.98, 2e-3, 'warp cover at 98 %');
    const overW = at(jam * 1.02, jam * 0.5);
    assert(overW.tooDense && D.denseWarning(overW).startsWith(D.DENSE_WARNING) && /warp/.test(D.denseWarning(overW)) && !/weft/.test(D.denseWarning(overW)),
      `102 % warp cover: ${D.denseWarning(overW)}`);
    const overF = at(jam * 0.5, jam * 1.02);
    assert(overF.tooDense && /weft/.test(D.denseWarning(overF)) && !/warp/.test(D.denseWarning(overF)), `102 % weft cover: ${D.denseWarning(overF)}`);
    assert(D.DENSE_WARNING === 'too dense for single-layer — likely needs multiple layers', `the wording moved: ${D.DENSE_WARNING}`);
    /* the warning rides on the sheet and the CSV, in the totals, and not otherwise */
    const csvOver = D.constructionCsv(s);
    assert(csvOver.includes('"totals","warning","' + D.DENSE_WARNING), 'the CSV does not carry the warning');
    at(jam * 0.5, jam * 0.5);
    assert(!D.constructionCsv(s).includes('"warning"'), 'the CSV warns on an open cloth');
    /* total cover is the union, and K its cotton-system cousin */
    const half = at(jam * 0.5, jam * 0.5);
    near(half.coverTotal, 0.75, 2e-3, 'the union of two halves');
    near(half.warp.K, (jam * 0.5 * 2.54) / Math.sqrt(590.5 / (300 / 9)), 1e-6, 'Peirce K');
    return `jam at ${jam.toFixed(2)} per cm for a ${d.toFixed(4)} mm thread; 98 % silent, 102 % named per direction`;
  });

  check('the construction sheet and the CSV carry what physical() says', () => {
    const s = D.defaultState();
    s.yarns = [D.newYarn({ id: 'y1', name: 'poly, "150"', fiber: 'polyester', den: 150, filaments: 48, color: '#5FA0A0' })];
    s.warpSystems = [D.newSystem({ name: 'ground', ratio: 1, seq: [{ yarn: 'y1', count: 1 }] })];
    s.weftSystems = [D.newSystem({ name: 'ground', ratio: 1, seq: [{ yarn: 'y1', count: 1 }] })];
    s.physical = { width: 1000, widthUnit: 'mm', epi: 20, ppi: 20, densityUnit: 'cm', crimpWarp: 5, crimpWeft: 5 };
    const sheet = D.constructionSheet(s, '2/2 twill');
    const titles = sheet.sections.map(x => x.title);
    assert(eqArr(titles, ['construction', 'warp systems', 'weft systems', 'yarns', 'totals']), titles.join(' | '));
    const row = (sec, item) => { const r = (sheet.sections.find(x => x.title === sec) || { rows: [] }).rows.find(x => x[0] === item); return r && r[1]; };
    assert(row('construction', 'total ends') === '2000', `total ends ${row('construction', 'total ends')}`);
    assert(row('construction', 'width') === '1000 mm (39.37 in)', `width ${row('construction', 'width')}`);
    assert(row('construction', 'structure') === '2/2 twill', 'the structure label');
    assert(row('totals', 'weight per metre · total') === '70 g/m', `total weight ${row('totals', 'weight per metre · total')}`);
    assert(row('warp systems', 'ground · ends') === '2000' && row('warp systems', 'ground · weight') === '35 g/m', 'the warp system rows');
    assert(/^2000 per m$/.test(row('weft systems', 'ground · picks')), `weft picks ${row('weft systems', 'ground · picks')}`);
    assert(/^polyester, 150 den \(16\.7 tex · Ne 35\.4 · Nm 60\), 48 filaments, 1-ply, no twist$/.test(row('yarns', 'poly, "150"')), `the yarn description: ${row('yarns', 'poly, "150"')}`);
    /* the CSV: a header, one row per sheet row, quoted so a comma or a quote
       in a name survives */
    const csv = D.constructionCsv(s, '2/2 twill');
    const lines = csv.trim().split('\n');
    assert(lines[0] === 'section,item,value', lines[0]);
    const n = sheet.sections.reduce((a, x) => a + x.rows.length, 0);
    assert(lines.length === n + 1, `${lines.length - 1} CSV rows for ${n} sheet rows`);
    const parse = (line) => { const out = []; const re = /"((?:[^"]|"")*)"(?:,|$)/g; let m; while ((m = re.exec(line))) out.push(m[1].replace(/""/g, '"')); return out; };
    const rows = lines.slice(1).map(parse);
    assert(rows.every(r => r.length === 3), 'a CSV row did not parse as three fields');
    const w = rows.find(r => r[0] === 'totals' && r[1] === 'weight per metre · total');
    assert(w && w[2] === '70 g/m', `CSV total weight ${w && w[2]}`);
    const y = rows.find(r => r[0] === 'yarns' && r[1] === 'poly, "150"');
    assert(y, 'the yarn with a comma and a quote in its name did not survive the CSV');
    const ph = D.physical(s);
    const cover = rows.find(r => r[1] === 'cover · warp');
    assert(cover && cover[2].startsWith(`${Math.round(ph.warp.cover * 1000) / 10}%`), `cover row ${cover && cover[2]}`);
    /* an elastic yarn adds the relaxed estimate */
    s.yarns[0].elastic = true; s.yarns[0].relax = 0.5;
    const rel = D.constructionSheet(s).sections.find(x => x.title === 'relaxed estimate');
    assert(rel, 'no relaxed section with an elastic yarn');
    const phR = D.physical(s).relaxed;
    near(phR.widthMm, 500, 1e-9, 'relaxed width at 0.5'); near(phR.gPerM, 140, 1e-9, 'relaxed g/m at 0.5');
    return `${n} rows, 5 sections; CSV parses; total 70 g/m`;
  });

  check('the WIF carries the sett as Spacing and the diameters as Thickness, and reads a foreign spacing back', () => {
    const s = D.defaultState();
    s.physical = { width: 1000, widthUnit: 'mm', epi: 25, ppi: 20, densityUnit: 'cm', crimpWarp: 5, crimpWeft: 5 };
    const text = D.toWif(s);
    const S = D.parseWifSections(text);
    assert(S.WARP.UNITS === 'Centimeters' && S.WEFT.UNITS === 'Centimeters', 'units');
    near(parseFloat(S.WARP.SPACING), 1 / 25, 1e-4, 'warp spacing = 1 / ends per cm');
    near(parseFloat(S.WEFT.SPACING), 1 / 20, 1e-4, 'weft spacing = 1 / picks per cm');
    near(parseFloat(S.WARP.THICKNESS), D.yarnDiameterMm(s.yarns[0]) / 10, 1e-4, 'warp thickness = the yarn diameter in cm');
    near(parseFloat(S.WEFT.THICKNESS), D.yarnDiameterMm(s.yarns[1]) / 10, 1e-4, 'weft thickness');
    assert(S.NOTES && Object.keys(S.NOTES).length > 10 && Object.values(S.NOTES).some(v => /weight per metre/.test(v)), 'the notes do not carry the sheet');
    assert(S['EM WEAVE YARNS'] && Object.keys(S['EM WEAVE YARNS']).length === s.yarns.length, 'the private yarn records');
    const back = D.fromWif(text).state;
    assert(D.sameConstruction(s, back), 'the construction did not come back from the private sections');
    /* a mixed warp writes per-thread thickness exceptions */
    s.warpSystems = [D.newSystem({ name: 'g', ratio: 1, seq: [{ yarn: 'y1', count: 1 }, { yarn: 'y4', count: 1 }] })];
    const mixed = D.parseWifSections(D.toWif(s));
    assert(Object.keys(mixed['WARP THICKNESS']).length === s.ends / 2, `${Object.keys(mixed['WARP THICKNESS']).length} thickness exceptions, want ${s.ends / 2}`);
    /* a WIF from elsewhere: no private sections, Spacing in inches -> the sett */
    const foreign = D.toWif(s).replace(/\[EM WEAVE[\s\S]*$/, '').replace(/\[NOTES\][^[]*/, '')
      .replace('Units=Centimeters\nSpacing=0.04', 'Units=Inches\nSpacing=0.025')
      .replace('Units=Centimeters\nSpacing=0.05', 'Units=Inches\nSpacing=0.02');
    const f = D.fromWif(foreign);
    near(f.state.physical.epi, 40 / 2.54, 1e-6, 'ends per cm from a spacing of 0.025 in');
    near(f.state.physical.ppi, 50 / 2.54, 1e-6, 'picks per cm from a spacing of 0.02 in');
    assert(f.state.physical.densityUnit === 'cm' && f.notes.some(n => /spacing/.test(n)), 'the sett read was not reported');
    assert(f.state.yarns.length === 3 && f.state.yarns.every(y => /colour/.test(y.name)), `a foreign WIF did not get one auto yarn per colour: ${f.state.yarns.map(y => y.name).join(', ')}`);
    assert(D.sameDraft(f.state, s), 'the foreign WIF lost a thread colour');
    /* a file whose colours were edited elsewhere falls back to the colours */
    const edited = D.toWif(s).replace(/\[COLOR TABLE\]\n1=[^\n]*/, '[COLOR TABLE]\n1=10,20,30');
    const e = D.fromWif(edited);
    assert(e.notes.some(n => /no longer match/.test(n)) && D.threadColors(e.state, 'warp', 1)[0] === '#0A141E', 'an edited colour table was not noticed');
    return 'spacing 0.04 / 0.05 cm; thickness in cm; foreign inches read back; edited colours noticed';
  });

  check('the true-scale layout spaces the threads at the sett', () => {
    const s = D.defaultState();
    s.physical = { width: 1000, widthUnit: 'mm', epi: 24, ppi: 12, densityUnit: 'cm', crimpWarp: 5, crimpWeft: 5 };
    s.view.trueScale = true; s.view.dpi = 96;
    const L = R.layout(s);
    near(L.cellW, 96 / 25.4 * 10 / 24, 1e-9, 'end pitch at 24 per cm, 96 dpi');
    near(L.cellH, 96 / 25.4 * 10 / 12, 1e-9, 'pick pitch at 12 per cm, 96 dpi');
    const X = L.blocks.drawdown;
    near(X.w, s.ends * L.cellW, 1e-9, 'drawdown width'); near(X.h, s.picks * L.cellH, 1e-9, 'drawdown height');
    assert(L.blocks.tieup.cw === s.view.cell && L.blocks.tieup.ch === s.view.cell, 'the tie-up is not at the view cell');
    assert(L.blocks.threading.cw === L.cellW && L.blocks.threading.ch === s.view.cell, 'the threading does not share the end pitch');
    assert(L.blocks.treadling.ch === L.cellH && L.blocks.treadling.cw === s.view.cell, 'the treadling does not share the pick pitch');
    const c = R.cellCentre(L, 'drawdown', { end: 0, pick: 3 });
    const hit = R.hitTest(L, c.x, c.y);
    assert(hit && hit.block === 'drawdown' && hit.end === 0 && hit.pick === 3, 'hit-test on non-square cells');
    s.view.trueScale = false;
    const L2 = R.layout(s);
    assert(L2.cellW === s.view.cell && L2.cellH === s.view.cell, 'off, the pitch is the view cell');
    /* the fabric SVG at true scale draws a thread at its own diameter */
    s.view.trueScale = true; s.view.fabric = true; s.view.mode = 'drawdown'; s.view.dpi = 600;
    const svg = R.renderSvg(s);
    const widths = [...svg.matchAll(/<rect x="[^"]*" y="[^"]*" width="([^"]*)" height="[^"]*" rx="0"[^>]*class="yarn-base"/g)].map(m => +m[1]);
    const dWarp = Math.min(D.yarnDiameterMm(s.yarns[0]) * 600 / 25.4, R.layout(s).cellW);
    assert(widths.some(w => Math.abs(w - dWarp) < 0.02), `no under-thread at the warp's own diameter ${dWarp.toFixed(3)} px: ${widths.slice(0, 4).join(',')}`);
    return `end pitch ${L.cellW.toFixed(3)} px, pick pitch ${L.cellH.toFixed(3)} px at 96 dpi`;
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
      'WIF reader is case-insensitive, skips comments and refuses what is not a WIF',
      /* the foreign-WIF read compares the whole draft, treadling included */
      'the WIF carries the sett as Spacing and the diameters as Thickness, and reads a foreign spacing back'] },
  { id: 'the-wif-writer-forgets-the-weft-colours', file: 'weave-draft.js',
    from: 'weftI.forEach((c, i) => L.push(`${i + 1}=${c}`));', to: '{}',
    breaks: ['WIF round trip is lossless on 60 seeded random drafts'] },
  { id: 'the-hash-drops-the-grid-setting', file: 'weave-draft.js',
    from: "['g', v.grid ? 1 : 0],", to: '',
    breaks: ['the URL hash round-trips the whole state, view included, on 60 seeded drafts',
      /* the migrated legacy state is round-tripped through the hash too */
      'a legacy v=1 hash migrates its stripes into yarns and systems with every colour unmoved'] },
  { id: 'the-hash-reads-the-tie-up-as-the-treadling', file: 'weave-draft.js',
    from: "s.treadling = b64ToU16(kv.tr || '', s.picks).map(x => x & mt);",
    to: "s.treadling = b64ToU16(kv.tu || '', s.picks).map(x => x & mt);",
    breaks: ['the URL hash round-trips the whole state, view included, on 60 seeded drafts'] },
  { id: 'the-walk-may-repeat-a-shaft', file: 'weave-draft.js',
    from: 'let next = cur + (r() < 0.5 ? -1 : 1);', to: 'let next = cur + (r() < 0.5 ? 0 : 1);',
    breaks: ['generators: straight, point, walk, as drawn in'] },
  { id: 'end-1-is-drawn-at-the-left', file: 'weave-render.js',
    from: 'const endOfCol = (L, c) => L.ends - 1 - c;', to: 'const endOfCol = (L, c) => c;',
    breaks: ['the layout puts the four parts where a draft puts them',
      /* the true-scale check hit-tests a drawdown cell by its end index */
      'the true-scale layout spaces the threads at the sett'] },
  /* the denier arithmetic: a denier is a gram per 9000 m, not per 1000 */
  { id: 'the-denier-math-reads-per-thousand-metres', file: 'weave-draft.js',
    from: 'gPerM: r.den / 9000 * scale,', to: 'gPerM: r.den / 1000 * scale,',
    breaks: ['weight per metre reproduces the worked example done by hand',
      'the construction sheet and the CSV carry what physical() says'] },
  { id: 'the-count-conversion-takes-tex-for-denier', file: 'weave-draft.js',
    from: "case 'tex': return v * 9;", to: "case 'tex': return v;",
    breaks: ['count conversions reproduce the known values, and the diameter reproduces Peirce'] },
  { id: 'the-stripe-migration-keeps-only-the-first-stripe', file: 'weave-draft.js',
    from: 'const seq = list.length ? list.map(x => ({ yarn: yarnFor(x.color, dir), count: x.count }))',
    to: 'const seq = list.length ? list.slice(0, 1).map(x => ({ yarn: yarnFor(x.color, dir), count: x.count }))',
    breaks: ['a legacy v=1 hash migrates its stripes into yarns and systems with every colour unmoved',
      /* a WIF with no private yarn records goes through the same migration */
      'the WIF carries the sett as Spacing and the diameters as Thickness, and reads a foreign spacing back'] },
  { id: 'the-dense-warning-fires-at-half-cover', file: 'weave-draft.js',
    from: 'tooDense: coverWarp > 1 || coverWeft > 1,', to: 'tooDense: coverWarp > 0.5 || coverWeft > 0.5,',
    breaks: ['the too-dense warning fires exactly past 100 % cover in a direction and not under it'] },
  { id: 'the-systems-ignore-the-ratio', file: 'weave-draft.js',
    from: 'for (let r = 0; r < L.ratio && i < n; r++) {', to: 'for (let r = 0; r < 1 && i < n; r++) {',
    /* NOT the worked example: its two systems are both ratio 1, where taking
       one thread in turn is the same sequence */
    breaks: ['systems interleave by ratio and every thread resolves to a yarn'] },
  { id: 'the-hash-drops-the-yarn-library', file: 'weave-draft.js',
    from: "['yl', yarnsToStr(s.yarns)],", to: '',
    breaks: ['the URL hash round-trips the whole state, view included, on 60 seeded drafts',
      'a legacy v=1 hash migrates its stripes into yarns and systems with every colour unmoved'] },
  { id: 'the-true-scale-pitch-ignores-the-dpi', file: 'weave-render.js',
    from: 'cellW = clamp(pxPerMm * 10 / P.epcm, 1, 64);', to: 'cellW = clamp(10 / P.epcm, 1, 64);',
    breaks: ['the true-scale layout spaces the threads at the sett'] },
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

  /* jsPDF is loaded by the page only when the construction PDF is asked for,
     from the cdnjs pin cards.html uses; serve it from node_modules so the
     gate needs no egress, and REFUSE rather than skip if it is not there */
  const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const jspdfFile = path.join(REPO, 'node_modules/jspdf/dist/jspdf.umd.min.js');
  const open = async (viewport, hash = '', extra = {}) => {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, acceptDownloads: true, ...extra });
    /* the webfont is chrome: answer it with an empty sheet rather than aborting,
       which Chromium would log as a resource error */
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await ctx.route(JSPDF_URL, r => fs.existsSync(jspdfFile)
      ? r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(jspdfFile) })
      : r.fulfill({ status: 404, body: 'not installed' }));
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
    s.yarns.push(D.newYarn({ id: 'y7', name: 'silk 20/22 & co', fiber: 'silk', den: 21, filaments: 22, color: '#AABBCC' }));
    s.warpSystems = [D.newSystem({ name: 'ground', ratio: 1, seq: [{ yarn: 'y7', count: 2 }, { yarn: 'y3', count: 1 }] })];
    s.physical = { width: 36, widthUnit: 'in', epi: 60, ppi: 48, densityUnit: 'in', crimpWarp: 7, crimpWeft: 4.5 };
    s.view = { mode: 'drawdown', grid: false, cell: 9, fabric: true, yarn: 0.6, maxFloat: 7, warn: false, trueScale: false, dpi: 110 };
    const other = await open({ width: 1280, height: 800 }, '#' + D.encodeHash(s));
    const got = await other.page.evaluate(() => window.__weave.hash());
    assert(got === D.encodeHash(s), 'the page re-encoded a different state');
    const sum = await other.page.evaluate(() => window.__weave.summary());
    assert(sum.ends === 20 && sum.picks === 14 && sum.mode === 'drawdown' && sum.fabric === true && sum.yarns === 7, JSON.stringify(sum));
    const ph = await other.page.evaluate(() => window.__weave.physical());
    assert(ph.totalEnds === 2160 && Math.abs(ph.widthMm - 914.4) < 1e-9, `36 in at 60 epi: ${ph.totalEnds} ends, ${ph.widthMm} mm`);
    const panel = await other.page.evaluate(() => ({ w: document.getElementById('width').value, u: document.getElementById('widthUnit').value,
      epi: document.getElementById('epi').value, du: document.getElementById('densityUnit').value,
      yarnName: document.querySelector('details.wv-yarn[data-yarn="y7"] .wv-yarn-name').textContent }));
    assert(panel.w === '36' && panel.u === 'in' && panel.epi === '60' && panel.du === 'in' && panel.yarnName === 'silk 20/22 & co', JSON.stringify(panel));
    await other.ctx.close();
    return 'waffle 20x14, drawdown-only fabric view, 36 in at 60 x 48 per inch = 2160 ends';
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

  await check.async('desktop: the construction PDF and the CSV hand back the right bytes', async () => {
    assert(fs.existsSync(jspdfFile), 'node_modules/jspdf is not installed — run: npm i --no-save jspdf@2.5.1');
    const csv = await download(page, '#exportCsv');
    assert(/-construction\.csv$/.test(csv.name), csv.name);
    const text = csv.bytes.toString('utf8');
    assert(/^section,item,value\n/.test(text), 'not the construction CSV');
    const live = await page.evaluate(() => window.__weave.csv());
    assert(text === live, 'the CSV bytes differ from the model\'s own sheet');
    const ph = await page.evaluate(() => window.__weave.physical());
    const want = `"totals","weight per metre · total","${Math.round(ph.gPerM * 100) / 100} g/m"`;
    assert(text.includes(want), `the CSV does not carry ${want}`);
    const pdf = await download(page, '#exportPdf');
    assert(/-construction\.pdf$/.test(pdf.name), pdf.name);
    const head = pdf.bytes.toString('latin1', 0, 8);
    assert(/^%PDF-1\.\d/.test(head), `not a PDF: ${head}`);
    const body = pdf.bytes.toString('latin1');
    assert(/\/Type\s*\/Page[^s]/.test(body), 'no page object');
    assert(body.includes('Construction sheet') && body.includes('total ends') && body.includes('cover'), 'the PDF text does not carry the sheet');
    assert(/\/Subtype\s*\/Image/.test(body), 'the PDF carries no image of the draft');
    return `csv ${csv.bytes.length} B, pdf ${pdf.bytes.length} B`;
  });

  await check.async('desktop: the yarn editor reaches the drawdown, the weight and the hash', async () => {
    const before = await page.evaluate(() => ({ hash: location.hash, ph: window.__weave.physical(),
      wC: window.__weave.state().yarns[1].color }));
    await page.evaluate(() => { document.getElementById('yarnList').closest('details.wv-sec').open = true; });
    await page.click('details.wv-yarn[data-yarn="y2"] summary');
    await page.fill('[aria-label="polyester 150/48 count"]', '300');
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => ({ hash: location.hash, ph: window.__weave.physical(), den: window.__weave.state().yarns[1].den }));
    assert(after.den === 300, `the count did not reach the yarn: ${after.den}`);
    assert(Math.abs(after.ph.weft.gPerM - 2 * before.ph.weft.gPerM) < 1e-6, `doubling the weft denier did not double the weft weight: ${before.ph.weft.gPerM} -> ${after.ph.weft.gPerM}`);
    assert(Math.abs(after.ph.warp.gPerM - before.ph.warp.gPerM) < 1e-9, 'the warp weight moved with a weft yarn');
    assert(after.hash !== before.hash, 'the hash did not change');
    /* the unit select re-states the number and moves nothing */
    await page.selectOption('[aria-label="polyester 150/48 count unit"]', 'tex');
    const shown = await page.inputValue('[aria-label="polyester 150/48 count"]');
    assert(Math.abs(+shown - 300 / 9) < 1e-3, `300 den shown in tex as ${shown}`);
    assert((await page.evaluate(() => window.__weave.state().yarns[1].den)) === 300, 'a unit change moved the denier');
    /* a colour change reaches the weft bar and the drawdown */
    const pix = async () => await page.evaluate(() => {
      const c = document.getElementById('draft'), g = c.getContext('2d'), L = window.__weave.layout();
      const b = L.blocks.weftBar, dpr = c.width / L.width;
      const d = g.getImageData(Math.round((b.x + b.w / 2) * dpr), Math.round((b.y + b.ch / 2) * dpr), 1, 1).data;
      return [d[0], d[1], d[2]].join(',');
    });
    const p0 = await pix();
    await page.fill('[aria-label="polyester 150/48 colour"]', '#ff0000');
    await page.dispatchEvent('[aria-label="polyester 150/48 colour"]', 'input');
    await page.waitForTimeout(250);
    const p1 = await pix();
    assert(p0 !== p1 && p1 === '255,0,0', `the weft bar reads ${p1} after a red yarn (was ${p0})`);
    const col = await page.evaluate(() => window.__weave.state().yarns[1].color);
    assert(col === '#FF0000', col);
    await page.fill('[aria-label="polyester 150/48 count"]', (150 / 9).toFixed(6));
    await page.fill('[aria-label="polyester 150/48 colour"]', before.wC.toLowerCase());
    await page.dispatchEvent('[aria-label="polyester 150/48 colour"]', 'input');
    await page.waitForTimeout(200);
    return 'count 150 -> 300 den doubled the weft g/m; tex shown as 33.333; red reached the bar';
  });

  await check.async('desktop: the physical inputs drive the readout and the too-dense warning appears on screen', async () => {
    const ph0 = await page.evaluate(() => window.__weave.physical());
    assert(!ph0.tooDense, 'the default cloth is already too dense');
    await page.fill('#width', '500');
    await page.waitForTimeout(200);
    const ph1 = await page.evaluate(() => window.__weave.physical());
    assert(Math.abs(ph1.widthMm - 500) < 1e-9 && ph1.totalEnds === Math.round(ph0.totalEnds / 2), `half the width: ${ph1.totalEnds} ends`);
    let text = await page.textContent('#physOut');
    assert(text.includes(`${ph1.totalEnds} ends`) && /g\/m/.test(text) && /cover/.test(text), text.slice(0, 120));
    assert(!text.includes('too dense'), 'the warning shows on an open cloth');
    await page.fill('#epi', '200');
    await page.waitForTimeout(200);
    const ph2 = await page.evaluate(() => window.__weave.physical());
    assert(ph2.tooDense && ph2.warp.cover > 1, `200 per cm is not too dense: cover ${ph2.warp.cover}`);
    text = await page.textContent('#physOut');
    assert(text.includes('too dense for single-layer — likely needs multiple layers'), 'the warning is not on the physical readout');
    const main = await page.textContent('#readout');
    assert(main.includes('too dense for single-layer'), 'the warning is not on the main readout');
    /* the density unit select keeps the sett and re-states the number */
    await page.selectOption('#densityUnit', 'in');
    await page.waitForTimeout(200);
    const ph3 = await page.evaluate(() => window.__weave.physical());
    const epiShown = await page.inputValue('#epi');
    assert(Math.abs(ph3.epcm - 200) < 0.01 && Math.abs(+epiShown - 508) < 0.01, `per inch: shown ${epiShown}, ${ph3.epcm} per cm`);
    assert((await page.getAttribute('#epi', 'max')) === '762', 'the input max did not follow the unit');
    assert((await page.textContent('#ppiUnit')) === 'inch', 'the picks label did not follow the unit');
    await page.selectOption('#densityUnit', 'cm');
    await page.fill('#epi', '24'); await page.fill('#width', '1000');
    await page.waitForTimeout(200);
    const ph4 = await page.evaluate(() => window.__weave.physical());
    assert(!ph4.tooDense && ph4.totalEnds === ph0.totalEnds, 'the cloth did not come back');
    return `500 mm -> ${ph1.totalEnds} ends; 200/cm warns at cover ${Math.round(ph2.warp.cover * 100)}%`;
  });

  await check.async('desktop: true scale spaces the drawdown at the sett and the hash carries it', async () => {
    await page.selectOption('#densityUnit', 'cm');
    await page.fill('#epi', '24'); await page.fill('#ppi', '24'); await page.fill('#width', '1000');
    await page.waitForTimeout(200);
    const L0 = await page.evaluate(() => window.__weave.layout());
    await page.check('#trueScale');
    await page.fill('#dpi', '200');
    await page.waitForTimeout(250);
    const got = await page.evaluate(() => ({ L: window.__weave.layout(), hash: location.hash, sum: window.__weave.summary() }));
    assert(got.sum.trueScale === true && /&ts=1&dpi=200/.test(got.hash), `hash ${got.hash.slice(-30)}`);
    const want = 200 / 25.4 * 10 / 24;
    assert(Math.abs(got.L.cellW - want) < 1e-9 && Math.abs(got.L.cellH - want) < 1e-9, `pitch ${got.L.cellW}, want ${want}`);
    assert(got.L.blocks.drawdown.w < L0.blocks.drawdown.w, 'the drawdown did not shrink to true scale');
    await page.uncheck('#trueScale');
    await page.fill('#dpi', '96');
    await page.waitForTimeout(200);
    const back = await page.evaluate(() => window.__weave.layout());
    assert(back.cellW === L0.cellW, 'off, the cell did not come back');
    return `3.15 px a thread at 200 dpi, 24 per cm`;
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
    /* the yarn library and the systems open, a yarn card expanded: the panel
       scrolls down, never sideways */
    const m2 = await phone.page.evaluate(() => {
      for (const sec of document.querySelectorAll('details.wv-sec')) sec.open = true;
      document.querySelector('details.wv-yarn').open = true;
      const panel = document.querySelector('.wv-panel');
      const wide = [...panel.querySelectorAll('*')].filter(el => el.getBoundingClientRect().right > window.innerWidth + 0.5)
        .map(el => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${el.className}`);
      return { docW: document.documentElement.scrollWidth, panelScrollW: panel.scrollWidth, panelClientW: panel.clientWidth, wide: wide.slice(0, 5) };
    });
    assert(m2.docW <= m.inner, `with every section open the page scrollWidth is ${m2.docW}`);
    assert(m2.panelScrollW <= m2.panelClientW + 1, `the panel scrolls sideways: ${m2.panelScrollW} > ${m2.panelClientW}`);
    assert(m2.wide.length === 0, `past the right edge: ${m2.wide.join(' ')}`);
    return `doc ${m.docW} <= ${m.inner}; panel ${Math.round(m.panel.width)} wide; every section open, nothing past the edge`;
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
