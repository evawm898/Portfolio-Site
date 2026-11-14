#!/usr/bin/env node
/* ---------------------------------------------------
   verify-yarn-characterization.mjs — the gate for the Yarn
   Characterization field note (yarn-characterization.html).

   Part one (Node, seconds) drives yarn-count.js's pure functions:
     YC1  conversions against numbers WORKED BY HAND from each unit's
          own definition — never against the module's constants, so a
          wrong constant cannot agree with itself
     YC2  every unit round-trips through tex, and the two families run
          in opposite directions
     YC3  the spec parser on a written-down table (plies, total tex,
          filaments, dpf, process, fibre, resultant) and on refusals
     YC4  the filament diameter against d = √(4·m/(π·ρ)) restated here

   Part two (--browser) drives the real page at 1280 and 390 px:
     YP1  the converter: typing in one row rewrites the others to the
          hand-worked values, and the circles' radii are in √tex ratio
     YP2  every decoder preset decodes, a bad spec says ✕ in words
     YP3  the copied yarn diagrams still draw on scroll
     YP4  no console errors, no horizontal scroll

   --negative-control runs part one against mutated copies of
   yarn-count.js; every mutant must turn at least one named check red,
   and every anchor is checked before any mutant runs.

   Not in CI (no workflow names these files); run it by hand:
     node tools/verify-yarn-characterization.mjs [--browser] [--negative-control]
--------------------------------------------------- */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = n => argv.includes(n);

/* ---------- hand-worked reference values (from the definitions) ---------- */
const LB = 453.59237, HANK_KM = 840 * 0.9144 / 1000;   // g, km
const near = (a, b, rel = 1e-9) => Math.abs(a - b) <= rel * Math.max(1, Math.abs(b));

async function partOne(modUrl) {
  const M = await import(modUrl + '?v=' + Math.random());
  const results = [];
  const check = (id, name, ok, detail = '') => results.push({ id, name, ok: !!ok, detail });

  // YC1 — 150 D: 150/9 tex, 150·10/9 dtex, Nm 9000/150, Ne = LB / (HANK_KM · tex)
  const a = M.convertAll(150, 'den');
  const tex150 = 150 / 9;
  check('YC1', '150 D is 16.667 tex', near(a.tex, tex150), a.tex);
  check('YC1', '150 D is 166.67 dtex', near(a.dtex, 1500 / 9), a.dtex);
  check('YC1', '150 D is Nm 60', near(a.Nm, 60), a.Nm);
  check('YC1', '150 D is Ne 35.43 (453.59237 g per 0.768096 km hanks)', near(a.Ne, LB / (HANK_KM * tex150)), a.Ne);
  const b = M.convertAll(30, 'Ne');
  check('YC1', 'Ne 30 is 19.685 tex', near(b.tex, LB / (HANK_KM * 30)), b.tex);
  check('YC1', 'Ne 30 is 177.16 D', near(b.den, 9 * LB / (HANK_KM * 30)), b.den);
  check('YC1', 'Ne = 0.5905 × Nm (to 4 figures)', Math.abs(b.Ne / b.Nm - 0.5905) < 5e-5, b.Ne / b.Nm);
  check('YC1', 'the page rule "Ne = 5,315 ÷ D" holds to 4 figures', Math.abs(a.Ne * 150 - 5315) < 1, a.Ne * 150);

  // YC2 — round trips and directions
  let worst = 0;
  for (const u of ['den', 'dtex', 'tex', 'Ne', 'Nm']) {
    for (const v of [0.5, 7, 40, 150, 1234.5]) {
      const back = M.fromTex(M.toTex(v, u), u);
      worst = Math.max(worst, Math.abs(back - v) / v);
    }
  }
  check('YC2', 'every unit round-trips through tex', worst < 1e-12, worst);
  const heavier = M.convertAll(300, 'den');
  check('YC2', 'direct units grow with weight', heavier.dtex > a.dtex && heavier.tex > a.tex);
  check('YC2', 'indirect units shrink with weight', heavier.Ne < a.Ne && heavier.Nm < a.Nm);
  check('YC2', 'a non-positive input is NaN, not a number', Number.isNaN(M.toTex(0, 'den')) && Number.isNaN(M.toTex(-3, 'Ne')));

  // YC3 — the parser
  const T = [
    // spec, plies, total tex, filaments (per ply), dpf, process, fibre, resultant
    ['150D/48F DTY polyester', 1, 150 / 9, 48, 150 / 48, 'dty', 'polyester'],
    ['167dtex/48f', 1, 16.7, 48, 167 * 0.9 / 48, undefined, undefined],
    ['2/150/48 FDY', 2, 300 / 9, 48, 150 / 48, 'fdy', undefined],
    ['75D/72F x2 nylon', 2, 150 / 9, 72, 75 / 72, undefined, 'nylon'],
    ['2x75d/72f', 2, 150 / 9, 72, 75 / 72, undefined, undefined],
    ['75D/72F × 2', 2, 150 / 9, 72, 75 / 72, undefined, undefined],
    ['40D spandex', 1, 40 / 9, null, null, undefined, 'elastane'],
    ['2/30s cotton', 2, 2 * LB / (HANK_KM * 30), null, null, undefined, 'cotton', 15],
    ['30/2 Ne', 2, 2 * LB / (HANK_KM * 30), null, null, undefined, undefined, 15],
    ['Ne 30', 1, LB / (HANK_KM * 30), null, null, undefined, undefined, 30],
    ['30s', 1, LB / (HANK_KM * 30), null, null, undefined, undefined, 30],
    ['Nm 48/2 wool', 2, 2000 / 48, null, null, undefined, 'wool', 24],
    ['2/48 nm', 2, 2000 / 48, null, null, undefined, undefined, 24],
    ['2/78/68 crimp polyamide', 2, 156 / 9, 68, 78 / 68, undefined, 'nylon']
  ];
  for (const [spec, plies, tex, fil, dpf, proc, fibre, res] of T) {
    const r = M.parseSpec(spec);
    const ok = r.ok && r.plies === plies && near(r.texTotal, tex, 1e-9) &&
      (fil === null ? r.filaments === null : r.filaments === fil) &&
      (dpf === null ? r.dpf === null : near(r.dpf, dpf, 1e-9)) &&
      r.process === proc && r.fibre === fibre && (res === undefined || near(r.resultant, res));
    check('YC3', 'parses "' + spec + '"', ok,
      r.ok ? JSON.stringify({ plies: r.plies, tex: r.texTotal, fil: r.filaments, dpf: r.dpf, proc: r.process, fibre: r.fibre, res: r.resultant }) : r.error);
  }
  for (const [spec, why] of [['150/48', /ambiguous/], ['hello', /not understood/], ['', /empty/], ['30/40 Ne', /ply/], ['9/150D/48F', /range/], ['2.5/150/48', /whole/]]) {
    const r = M.parseSpec(spec);
    check('YC3', 'refuses "' + spec + '" and says why', !r.ok && why.test(r.error || ''), r.error);
  }

  // YC4 — filament diameter, restated: m = dtex·1e-4 g/m, ρ·1e6 g/m³
  const dRef = (dtex, rho) => Math.sqrt(4 * (dtex * 1e-4) / (Math.PI * rho * 1e6)) * 1e6;
  check('YC4', '1 dtex PET is 9.61 µm', near(M.filamentDiameterUm(1, 1.38), dRef(1, 1.38)), M.filamentDiameterUm(1, 1.38));
  const r48 = M.parseSpec('150D/48F nylon');
  check('YC4', '150D/48F nylon filament diameter from its own dpf and 1.14 g/cm³',
    near(r48.filamentDiameterUm, dRef(1500 / 9 / 48, 1.14)), r48.filamentDiameterUm);
  const rNone = M.parseSpec('150D/48F');
  check('YC4', 'no fibre named → polyester assumed and SAID', rNone.densityAssumed === true && rNone.density === 1.38);
  return results;
}

function report(results, label) {
  let bad = 0;
  for (const r of results) {
    if (!r.ok) bad++;
    if (!r.ok || flag('--verbose')) console.log((r.ok ? 'ok   ' : 'FAIL ') + r.id + '  ' + r.name + (r.ok ? '' : '  — got ' + r.detail));
  }
  console.log(label + ': ' + (results.length - bad) + '/' + results.length + ' passed');
  return bad;
}

/* ---------- negative control ---------- */
const MUTANTS = [
  { id: 'pound-rounded-to-454', from: 'export const POUND_G = 453.59237;', to: 'export const POUND_G = 454;', breaks: ['YC1'] },
  { id: 'denier-read-as-dtex', from: "case 'den':  return v / 9;", to: "case 'den':  return v / 10;", breaks: ['YC1', 'YC2'] },
  { id: 'plies-are-the-larger-number', from: 'plies = Math.min(x, y); count = Math.max(x, y);', to: 'plies = Math.max(x, y); count = Math.min(x, y);', breaks: ['YC3'] },
  { id: 'dpf-from-the-plied-total', from: "res.dpf = filaments ? fromTex(texPerPly, 'den') / filaments : null;", to: "res.dpf = filaments ? fromTex(texPerPly * plies, 'den') / filaments : null;", breaks: ['YC3'] },
  { id: 'trailing-ply-count-ignored', from: 'Number(m[1] || m[5] || 1)', to: 'Number(m[1] || 1)', breaks: ['YC3'] },
  { id: 'diameter-uses-radius', from: 'return Math.sqrt(4 * areaM2 / Math.PI) * 1e6;', to: 'return Math.sqrt(areaM2 / Math.PI) * 1e6;', breaks: ['YC4'] },
  { id: 'assumed-density-not-said', from: 'res.densityAssumed = !res.fibre;', to: 'res.densityAssumed = false;', breaks: ['YC4'] },
  // fromTex's metric arm turned direct — agrees with the truth at exactly 150 D
  { id: 'nm-turned-direct', from: "    case 'Nm':   return 1000 / tex;", to: "    case 'Nm':   return tex * 60 / (150 / 9);", breaks: ['YC1', 'YC2'] }
];

async function negativeControl() {
  const src = fs.readFileSync(path.join(ROOT, 'yarn-count.js'), 'utf8');
  let missing = 0;
  for (const m of MUTANTS) {
    const n = src.split(m.from).length - 1;
    if (n !== 1) { console.log('ANCHOR ' + m.id + ': matches ' + n + ' times'); missing++; }
  }
  if (missing) { console.log('NEGATIVE CONTROL: ' + missing + ' anchor(s) do not match exactly once — refusing'); return 1; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yc-mut-'));
  let failed = 0;
  for (const m of MUTANTS) {
    const f = path.join(dir, m.id + '.mjs');
    fs.writeFileSync(f, src.replace(m.from, m.to));
    let results;
    try { results = await partOne(pathToFileURL(f).href); }
    catch (e) { results = [{ id: 'CRASH', ok: false }]; }
    const red = new Set(results.filter(r => !r.ok).map(r => r.id));
    const missed = m.breaks.filter(id => !red.has(id));
    const ok = red.size > 0 && missed.length === 0;
    if (!ok) failed++;
    console.log((ok ? 'caught ' : 'MISSED ') + m.id + ' — red: ' + ([...red].join(', ') || 'nothing') + (missed.length ? ' — expected also ' + missed.join(', ') : ''));
  }
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('NEGATIVE CONTROL: ' + (MUTANTS.length - failed) + '/' + MUTANTS.length + ' mutants caught');
  return failed;
}

/* ---------- part two: the page ---------- */
async function browser() {
  const require = createRequire(import.meta.url);
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { ({ chromium } = require('playwright-core')); }
  const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]);
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(r);
  }).listen(0);
  const port = srv.address().port;
  const b = await chromium.launch();
  const results = [];
  const check = (id, name, ok, detail = '') => results.push({ id, name, ok: !!ok, detail });
  for (const width of [1280, 390]) {
    const ctx = await b.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('requestfailed', rq => { if (!/fonts\./.test(rq.url())) errs.push('request failed ' + rq.url()); });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, body: '' }));
    await page.goto('http://localhost:' + port + '/yarn-characterization.html');
    await page.waitForSelector('[data-unit="den"]');
    const w = ' @' + width;

    // YP1 — converter
    const read = () => page.$$eval('[data-unit]', els => Object.fromEntries(els.map(e => [e.dataset.unit, Number(e.value)])));
    await page.fill('[data-unit="den"]', '300');
    let v = await read();
    check('YP1', 'typing 300 D sets dtex 333.3 and Nm 30' + w, Math.abs(v.dtex - 333.3) < 0.06 && Math.abs(v.Nm - 30) < 0.006, JSON.stringify(v));
    check('YP1', 'typing 300 D sets Ne 17.72' + w, Math.abs(v.Ne - LB / (HANK_KM * (300 / 9))) < 0.006, v.Ne);
    const radii = await page.$$eval('[data-yc-xsec] circle', cs => cs.map(c => Number(c.getAttribute('r'))));
    check('YP1', 'circle radii are in √tex ratio to the 150 D reference' + w, radii.length === 2 && Math.abs(radii[1] / radii[0] - Math.sqrt(2)) < 1e-6, radii);
    await page.fill('[data-unit="Ne"]', '30');
    v = await read();
    check('YP1', 'typing Ne 30 sets 177.2 D, and keeps the typed row' + w, Math.abs(v.den - 177.2) < 0.06 && v.Ne === 30, JSON.stringify(v));
    await page.fill('[data-unit="tex"]', '0');
    const status = await page.textContent('[data-yc-status]');
    check('YP1', 'a zero says so in words' + w, /enter a positive number/.test(status), status);
    const circlesNow = await page.$$eval('[data-yc-xsec] circle', cs => cs.length);
    check('YP1', 'a zero draws no stale "this yarn" circle' + w, circlesNow === 1, circlesNow);
    await page.fill('[data-unit="den"]', '150');

    // YP2 — decoder
    const presets = await page.$$eval('[data-yc-preset]', els => els.map(e => e.dataset.ycPreset));
    for (const p of presets) {
      await page.click('[data-yc-preset="' + p + '"]');
      const out = await page.textContent('[data-yc-out]');
      const pressed = await page.getAttribute('[data-yc-preset="' + p + '"]', 'aria-pressed');
      check('YP2', 'preset "' + p + '" decodes' + w, /Plies/.test(out) && !/✕/.test(out) && pressed === 'true', out.slice(0, 120));
    }
    await page.fill('[data-yc-spec]', '150/48');
    const amb = await page.textContent('[data-yc-out]');
    check('YP2', 'an ambiguous spec is refused in words' + w, /✕ ambiguous/.test(amb), amb);

    // YP3 — the copied diagrams still draw
    const grid = await page.$('[data-yarn-grid]');
    const top = await grid.evaluate(e => e.getBoundingClientRect().top + window.scrollY);
    for (let y = top - 700; y < top + 1200; y += 200) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(120); }
    await page.waitForTimeout(3200);
    const drawn = await page.$$eval('[data-yarn-grid] svg path', ps => ps.filter(p => p.style.strokeDashoffset === '0' || p.style.strokeDashoffset === '0px').length);
    check('YP3', 'the yarn construction diagrams draw on scroll' + w, drawn >= 30, drawn);

    // YP4
    const hs = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('YP4', 'no horizontal scroll' + w, hs <= 0, hs);
    check('YP4', 'no console or page errors' + w, errs.length === 0, errs.join(' | '));
    if (flag('--shots')) await page.screenshot({ path: path.join(argv[argv.indexOf('--shots') + 1], 'yarn-characterization-' + width + '.png'), fullPage: true });
    await ctx.close();
  }
  await b.close();
  srv.close();
  return results;
}

/* ---------- main ---------- */
const modUrl = pathToFileURL(path.join(ROOT, 'yarn-count.js')).href;
let bad = report(await partOne(modUrl), 'PART ONE (yarn-count.js)');
if (flag('--browser')) bad += report(await browser(), 'PART TWO (the page)');
if (flag('--negative-control')) bad += await negativeControl();
console.log(bad ? 'VERDICT: FAIL' : 'VERDICT: PASS');
process.exit(bad ? 1 : 0);
