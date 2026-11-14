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
     YT1-4 §03 (yarn-twist.js): the twist multipliers from their
          definitions, the surface angle restated (tan θ = π d T), the
          schematic strength curves' shape, the usual-use bands

   Part two (--browser) drives the real page at 1280 and 390 px:
     YP1  the converter: typing in one row rewrites the others to the
          hand-worked values, and the circles' radii are in √tex ratio
     YP2  every decoder preset decodes, a bad spec says ✕ in words
     YP3  the copied yarn diagrams still draw on scroll
     YP4  no console errors, no horizontal scroll
     YW1-3 §03's twist panel: the readouts, hold-TM vs hold-turns, the
          told clamp, the snarl loop and the filament mode

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

async function partOne(dirUrl) {
  const M = await import(dirUrl + 'yarn-count.js');
  const Y = await import(dirUrl + 'yarn-twist.js');
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

  /* ---------- §03 twist (yarn-twist.js) ---------- */
  const IN = 39.37007874015748;                       // 1 m / 0.0254 m
  // YT1 — the multipliers, from their definitions
  check('YT1', '1 TPI is 39.37 TPM', near(Y.tpmFromTpi(1), IN), Y.tpmFromTpi(1));
  check('YT1', 'α_tex = 39.37 × √(453.59237 / 0.768096) × TM ≈ 956.7 × TM', near(Y.alphaTexFromTm(1), IN * Math.sqrt(LB / HANK_KM)), Y.alphaTexFromTm(1));
  const tex30 = LB / (HANK_KM * 30);
  check('YT1', 'Ne 30 at TM 3.8 is 3.8 × √30 TPI = 819.4 TPM', near(Y.tpmFromTm(3.8, tex30), 3.8 * Math.sqrt(30) * IN), Y.tpmFromTm(3.8, tex30));
  check('YT1', 'TM round-trips through TPM at three counts',
    [10, 30, 60].every(ne => near(Y.tmFromTpm(Y.tpmFromTm(4.1, LB / (HANK_KM * ne)), LB / (HANK_KM * ne)), 4.1, 1e-12)));
  check('YT1', 'α_tex = TPM × √tex, read off the module at Ne 40',
    near(Y.tpmFromTm(3.5, LB / (HANK_KM * 40)) * Math.sqrt(LB / (HANK_KM * 40)), Y.alphaTexFromTm(3.5)));

  // YT2 — the surface angle: tan θ = π d T, d from tex and a bulk density (restated here)
  const dMm = (tex, rho) => Math.sqrt(4 * tex * 1e-3 / (Math.PI * rho * 1e6)) * 1e3;
  const thRef = (tpm, tex, rho) => Math.atan(Math.PI * dMm(tex, rho) / 1000 * tpm) * 180 / Math.PI;
  check('YT2', 'yarn diameter from tex and density', near(Y.yarnDiameterMm(tex30, 0.91), dMm(tex30, 0.91)), Y.yarnDiameterMm(tex30, 0.91));
  const th38 = Y.helixAngleDeg(Y.tpmFromTm(3.8, tex30), tex30, 0.91);
  check('YT2', 'Ne 30 at TM 3.8, packed at 0.91 g/cm³: θ ≈ 23.1°', near(th38, thRef(3.8 * Math.sqrt(30) * IN, tex30, 0.91)) && Math.abs(th38 - 23.1) < 0.05, th38);
  const angles = [10, 20, 30, 40, 60].map(ne => { const t = LB / (HANK_KM * ne); return Y.helixAngleDeg(Y.tpmFromTm(3.8, t), t, 0.91); });
  check('YT2', 'the same TM gives the same angle at every count', Math.max(...angles) - Math.min(...angles) < 1e-9, angles.join(', '));
  const tpm30 = Y.tpmFromTm(3.8, tex30), tex10 = LB / (HANK_KM * 10);
  check('YT2', 'the same TPM on a coarser yarn gives a steeper angle', Y.helixAngleDeg(tpm30, tex10, 0.91) > th38 + 10, Y.helixAngleDeg(tpm30, tex10, 0.91));

  // YT3 — the schematic strength curves' SHAPE
  const S = tm => Y.relativeStrength('staple', tm), F = tm => Y.relativeStrength('filament', tm);
  const so = Y.optimumTm('staple'), fo = Y.optimumTm('filament');
  check('YT3', 'an untwisted staple sliver has no strength', S(0) === 0, S(0));
  check('YT3', 'the staple optimum sits in the warp-to-voile range (TM 3.8–5)', so >= 3.8 && so <= 5, so);
  check('YT3', 'the filament optimum is at low twist (TM < 1.5)', fo < 1.5 && fo > 0, fo);
  check('YT3', 'both peak at exactly 1', near(S(so), 1) && near(F(fo), 1));
  const mono = (f, a, b, up) => { for (let x = a; x < b - 0.05; x += 0.05) { if (up ? f(x + 0.05) <= f(x) : f(x + 0.05) >= f(x)) return false; } return true; };
  check('YT3', 'staple rises to its optimum, then falls', mono(S, 0, so, true) && mono(S, so + 0.05, 7, false));
  check('YT3', 'filament falls past its optimum (obliquity)', mono(F, fo + 0.05, 7, false) && F(7) < 0.7, F(7));
  check('YT3', 'filament is stronger than staple at low twist', F(1) > S(1));

  // YT4 — the usual-use bands
  const B = Y.TM_BANDS;
  check('YT4', 'the bands are contiguous from TM 2.5 to 7', B[0].from === 2.5 && B[B.length - 1].to === 7 && B.every((b, i) => i === 0 || b.from === B[i - 1].to));
  check('YT4', 'TM 3.8 reads weft, 4.0 warp, 6 crepe, 1 below range',
    Y.bandOf(3.8).id === 'weft' && Y.bandOf(4).id === 'warp' && Y.bandOf(6).id === 'crepe' && Y.bandOf(1).id === 'low');
  check('YT4', 'a single snarls when slack at TM 4.5, not at TM 2.5', Y.snarls(4.5) && !Y.snarls(2.5));
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
  { id: 'nm-turned-direct', from: "    case 'Nm':   return 1000 / tex;", to: "    case 'Nm':   return tex * 60 / (150 / 9);", breaks: ['YC1', 'YC2'] },
  // §03 — yarn-twist.js
  { file: 'yarn-twist.js', id: 'tm-divides-by-ne-not-its-root', from: 'return tpiFromTpm(tpm) / Math.sqrt(NE_K / tex);', to: 'return tpiFromTpm(tpm) / (NE_K / tex);', breaks: ['YT1'] },
  { file: 'yarn-twist.js', id: 'inch-taken-as-25mm', from: 'export const IN_PER_M = 1 / 0.0254;', to: 'export const IN_PER_M = 1 / 0.025;', breaks: ['YT1'] },
  { file: 'yarn-twist.js', id: 'helix-uses-radius', from: 'return Math.atan(Math.PI * d * tpm) * 180 / Math.PI;', to: 'return Math.atan(Math.PI * d / 2 * tpm) * 180 / Math.PI;', breaks: ['YT2'] },
  { file: 'yarn-twist.js', id: 'staple-needs-no-grip', from: 'const g = 1 - Math.exp(-Math.pow(tm / STAPLE_GRIP.a, STAPLE_GRIP.b));', to: 'const g = 1;', breaks: ['YT3'] },
  { file: 'yarn-twist.js', id: 'filament-ignores-obliquity', from: 'return c * cos2(tm, YARN_TYPES.filament.density);', to: 'return c;', breaks: ['YT3'] }
];

async function negativeControl() {
  const SRC = { 'yarn-count.js': fs.readFileSync(path.join(ROOT, 'yarn-count.js'), 'utf8'),
                'yarn-twist.js': fs.readFileSync(path.join(ROOT, 'yarn-twist.js'), 'utf8') };
  let missing = 0;
  for (const m of MUTANTS) {
    const n = SRC[m.file || 'yarn-count.js'].split(m.from).length - 1;
    if (n !== 1) { console.log('ANCHOR ' + m.id + ': matches ' + n + ' times'); missing++; }
  }
  if (missing) { console.log('NEGATIVE CONTROL: ' + missing + ' anchor(s) do not match exactly once — refusing'); return 1; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yc-mut-'));
  let failed = 0;
  for (const m of MUTANTS) {
    // each mutant gets its own directory: the twist module imports ./yarn-count.js,
    // and Node caches a module by its URL
    const md = path.join(dir, m.id);
    fs.mkdirSync(md);
    for (const [name, src] of Object.entries(SRC)) {
      fs.writeFileSync(path.join(md, name), name === (m.file || 'yarn-count.js') ? src.replace(m.from, m.to) : src);
    }
    fs.writeFileSync(path.join(md, 'package.json'), '{"type":"module"}');
    let results;
    try { results = await partOne(pathToFileURL(md + path.sep).href); }
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

    // YW — §03 twist panel
    const yt = async () => JSON.parse(await page.getAttribute('[data-yt]', 'data-yt-state'));
    const out = async k => (await page.textContent('[data-yt-out="' + k + '"]')).trim();
    let s0 = await yt();
    check('YW1', 'opens on staple Ne 30 at TM 3.8 = 819 TPM, θ 23.1°' + w,
      s0.kind === 'staple' && s0.ne === 30 && s0.tm === 3.8 && Math.abs(s0.tpm - 3.8 * Math.sqrt(30) * 39.37007874) < 1e-3 && (await out('theta')) === '23.1°',
      JSON.stringify(s0) + ' ' + (await out('theta')));
    await page.locator('[data-yt-tm]').fill('5');
    let s1 = await yt();
    const marker = await page.getAttribute('[data-yt-marker]', 'data-yt-marker');
    check('YW1', 'the slider moves the TM, the turns and the chart marker' + w, s1.tm === 5 && s1.tpm > s0.tpm && marker === '5.00', JSON.stringify(s1) + ' marker ' + marker);
    const theta5 = await out('theta');
    // hold TM: change count, angle holds, turns move (state rounds TPM to 3 decimals)
    await page.click('[data-yt-hold="tm"]');
    await page.selectOption('[data-yt-count]', '60');
    let s2 = await yt();
    check('YW2', 'holding TM across Ne 30 → 60 keeps the angle, moves the turns by √2' + w,
      s2.tm === 5 && (await out('theta')) === theta5 && Math.abs(s2.tpm / s1.tpm - Math.SQRT2) < 1e-5 && /angle did not/.test(await out('note')),
      JSON.stringify(s2) + ' ' + (await out('theta')) + ' vs ' + theta5 + ' / ' + (await out('note')));
    // hold turns to a COARSER count: TM = TPI / √Ne grows, 5 × √6 = 12.2 is past the chart — clamped and told
    await page.click('[data-yt-hold="tpm"]');
    await page.selectOption('[data-yt-count]', '10');
    let s3 = await yt();
    check('YW2', 'the same turns on Ne 60 → 10 would be TM 12.2: stops at 7 and says so' + w,
      s3.tm === 7 && /^! .*TM 12\.2.*past this chart/.test(await out('note')), JSON.stringify(s3) + ' / ' + (await out('note')));
    // hold turns to a FINER count: TM 3 on Ne 10 → TM 1.5 on Ne 40, same TPM, smaller angle
    await page.locator('[data-yt-tm]').fill('3');
    const s4a = await yt(), th4a = await out('theta');
    await page.selectOption('[data-yt-count]', '40');
    let s4 = await yt();
    check('YW2', 'holding the turns across Ne 10 → 40 keeps the TPM, halves the TM, flattens the angle' + w,
      Math.abs(s4.tpm - s4a.tpm) < 1e-6 && Math.abs(s4.tm - 1.5) < 1e-9 && parseFloat(await out('theta')) < parseFloat(th4a) && /angle moved/.test(await out('note')),
      JSON.stringify(s4) + ' ' + th4a + ' → ' + (await out('theta')) + ' / ' + (await out('note')));
    // snarl
    await page.click('[data-yt-hold="tm"]');
    await page.selectOption('[data-yt-count]', '30');
    await page.locator('[data-yt-tm]').fill('4.5');
    await page.click('[data-yt-slack]');
    const sn1 = (await yt()).snarl;
    await page.locator('[data-yt-tm]').fill('2.5');
    const sn2 = (await yt()).snarl;
    await page.click('[data-yt-slack]');
    const sn3 = (await yt()).snarl;
    check('YW3', 'slack at TM 4.5 snarls, at TM 2.5 hangs open, taut is straight' + w, sn1 === 'snarl' && sn2 === 'open' && sn3 === 'taut', [sn1, sn2, sn3].join(' / '));
    // filament: hairiness is n/a and the filament curve is the active one
    await page.click('[data-yt-kind="filament"]');
    const na = await page.$eval('[data-yt-gauge="hairy"]', e => e.closest('.yt-gauge').classList.contains('is-na'));
    const active = await page.$$eval('.yt-curve.is-active', es => es.map(e => e.getAttribute('class')));
    check('YW3', 'filament: hairiness reads n/a and the dashed filament curve is active' + w, na && active.length === 1 && /filament/.test(active[0]), na + ' ' + active);
    await page.click('[data-yt-kind="staple"]');

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
let bad = report(await partOne(pathToFileURL(ROOT + path.sep).href), 'PART ONE (yarn-count.js, yarn-twist.js)');
if (flag('--browser')) bad += report(await browser(), 'PART TWO (the page)');
if (flag('--negative-control')) bad += await negativeControl();
console.log(bad ? 'VERDICT: FAIL' : 'VERDICT: PASS');
process.exit(bad ? 1 : 0);
