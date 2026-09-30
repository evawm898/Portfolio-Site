#!/usr/bin/env node
// verify-color-change.mjs — behaviour gate for color-change.html (Field
// Notes No. 07). Nothing in CI covers this page. What can silently break is
// the physics each block teaches: a photochromic lens that stops clearing,
// an e-paper pixel that forgets when the field is off, a chameleon whose
// reflected wavelength no longer follows its lattice. This drives a real
// Chromium through the page's read-only hook (window.__colorChange) and a
// real pointer on the hold buttons.
//
//   node tools/verify-color-change.mjs [--url http://127.0.0.1:8899/color-change.html] [--shots <dir>]
//   NODE_PATH=/opt/node22/lib/node_modules node tools/verify-color-change.mjs

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { findChromium } from './chromium-harness.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const roots = [...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []), '/opt/node22/lib/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules'];
  for (const root of roots) { const entry = path.join(root, 'playwright', 'index.js'); if (fs.existsSync(entry)) return require(entry); }
  try { return require('playwright'); }
  catch { console.error('Could not resolve playwright. Try:\n  NODE_PATH=/opt/node22/lib/node_modules node tools/verify-color-change.mjs'); process.exit(2); }
}
const { chromium } = loadPlaywright();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
function serveRepo() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
      const file = path.join(REPO, rel);
      if (!file.startsWith(REPO) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}
const argv = process.argv.slice(2);
const argOf = flag => { const i = argv.indexOf(flag); return i > -1 ? argv[i + 1] : null; };
const shotsDir = argOf('--shots');
let server = null, URL_ = argOf('--url');
if (!URL_) { server = await serveRepo(); URL_ = 'http://127.0.0.1:' + server.address().port + '/color-change.html'; }
if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });

const results = [];
function check(name, ok, detail) { results.push({ name, ok }); console.log((ok ? '  ok   ' : '  FAIL ') + name + (detail ? '  — ' + detail : '')); }
function section(t) { console.log('\n' + t); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
await page.goto(URL_, { waitUntil: 'load' });
await page.waitForFunction(() => window.__colorChange);
await sleep(150);

const frames = n => page.evaluate(n => new Promise(r => { let k = n; const f = () => (--k <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const st = id => page.evaluate(id => { const m = window.__colorChange.mechs[id]; return { f: m.f, x: m.x, T: m.T, d: m.d, wet: m.wet, whiteUp: m.whiteUp, field: m.field, coverage: m.coverage, liquid: m.liquid, bound: m.bound, mode: m.mode, drive: m.drive, lambda: m.lambda ? m.lambda() : null, ro: m.readout() }; }, id);
const hold = (id, on) => page.evaluate(([id, on]) => window.__colorChange.hold(id, on), [id, on]);
const scrollTo = async id => { await page.locator('#mech-' + id).scrollIntoViewIfNeeded(); await frames(3); };
const shot = async (id, name) => { if (shotsDir) await page.locator('#mech-' + id).screenshot({ path: path.join(shotsDir, name + '.png') }); };
const painted = id => page.evaluate(id => { const c = document.getElementById('cv-' + id); const ctx = c.getContext('2d'); const d = ctx.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 90) n++; return n / (d.length / 16); }, id);

section('Page');
check('no page errors on load', errors.length === 0, errors.join(' | '));
check('index reads No. 07 / NN', /^No\. 07 \/ \d\d$/.test((await page.textContent('.project-header__index')).trim()));
check('seven mechanism blocks', (await page.locator('.cc__mech').count()) === 7);
for (const id of ['ephoretic', 'chromatophore', 'thermo', 'echromic', 'photo', 'chameleon', 'morpho']) { await scrollTo(id); check(`${id} canvas is painted`, (await painted(id)) > 0.003); }

section('Electrophoretic — pigment moving, bistable');
await scrollTo('ephoretic');
await page.evaluate(() => window.__colorChange.pulse(-1)); await sleep(1100); await frames(2);
const eBlack = await st('ephoretic');
check('black pulse leaves the pixel dark', eBlack.whiteUp < 0.3, (eBlack.whiteUp * 100).toFixed(0) + '% white');
await page.evaluate(() => window.__colorChange.pulse(1)); await sleep(500); await frames(2);
const eMid = await st('ephoretic');
check('field is on during the pulse', eMid.field === 1 && /driving/.test(eMid.ro.state), eMid.ro.state);
await sleep(700); await frames(2);
const eWhite = await st('ephoretic');
check('white pulse leaves the pixel light', eWhite.whiteUp > 0.7, (eWhite.whiteUp * 100).toFixed(0) + '% white');
check('field off afterwards and the image holds', eWhite.field === 0 && /holding/.test(eWhite.ro.state), eWhite.ro.state);
await sleep(1200); await frames(2);
const eLater = await st('ephoretic');
check('still holding with no power', eLater.whiteUp > 0.65, (eLater.whiteUp * 100).toFixed(0) + '% white');
await shot('ephoretic', '01-electrophoretic');

section('Chromatophores — muscle, fast');
await scrollTo('chromatophore');
const c0 = await st('chromatophore');
await hold('chromatophore', true); await sleep(500); await frames(2);
const c1 = await st('chromatophore');
check('firing expands the sacs (coverage up)', c1.coverage > c0.coverage * 4, `${(c0.coverage * 100).toFixed(1)}% → ${(c1.coverage * 100).toFixed(1)}%`);
await shot('chromatophore', '02-chromatophore');
await hold('chromatophore', false); await sleep(1200); await frames(2);
const c2 = await st('chromatophore');
check('release retracts them elastically', c2.coverage < c0.coverage * 2, (c2.coverage * 100).toFixed(1) + '%');

section('Thermochromic — solvent melts, dye unbinds, hysteresis');
await scrollTo('thermo');
const t0 = await st('thermo');
check('cold: solid solvent, dye bound and coloured', !t0.liquid && t0.bound > 0.95, `${t0.T.toFixed(1)} °C, ${(t0.bound * 100).toFixed(0)}% bound`);
await hold('thermo', true); await sleep(2600); await frames(2);
const t1 = await st('thermo');
check('heating melts the solvent', t1.liquid && t1.T > 33, `${t1.T.toFixed(1)} °C`);
check('dye–developer pairs separate; colour fades', t1.bound < 0.3, (t1.bound * 100).toFixed(0) + '% bound');
await shot('thermo', '03-thermochromic');
await hold('thermo', false); await sleep(1500); await frames(2);
const t2 = await st('thermo');
check('cooling below the melt point does not re-solidify at once (hysteresis)', t2.T < 31 && t2.T > 27.5 ? t2.liquid : true, `${t2.T.toFixed(1)} °C, liquid ${t2.liquid}`);
await sleep(5000); await frames(2);
const t3 = await st('thermo');
check('cold again: re-solidified and coloured', !t3.liquid && t3.bound > 0.85, `${t3.T.toFixed(1)} °C, ${(t3.bound * 100).toFixed(0)}% bound`);

section('Electrochromic — ions in, tint holds');
await scrollTo('echromic');
await page.evaluate(() => window.__colorChange.echromic('color')); await sleep(2500); await frames(2);
const w1 = await st('echromic');
check('colouring drives x up and transmission down', w1.x > 0.5 && w1.T < 0.5, `x ${w1.x.toFixed(2)}, T ${(w1.T * 100).toFixed(0)}%`);
await shot('echromic', '04-electrochromic');
await page.evaluate(() => window.__colorChange.echromic('off')); await frames(2);
const wOff = await st('echromic');
await sleep(1200); await frames(2);
const w2 = await st('echromic');
check('open circuit holds the tint', Math.abs(w2.x - wOff.x) < 1e-6, `x ${wOff.x.toFixed(3)} → ${w2.x.toFixed(3)}`);
await page.evaluate(() => window.__colorChange.echromic('bleach')); await sleep(3000); await frames(2);
const w3 = await st('echromic');
check('bleaching clears it', w3.x < 0.15, `x ${w3.x.toFixed(2)}`);

section('Photochromic — fast under UV, slow to clear');
await scrollTo('photo');
await hold('photo', true); await sleep(1500); await frames(2);
const p1 = await st('photo');
check('UV converts most molecules', p1.f > 0.8, (p1.f * 100).toFixed(0) + '%');
check('readout names the open form', /merocyanine/.test(p1.ro.form), p1.ro.form);
await shot('photo', '05-photochromic');
await hold('photo', false); await sleep(1500); await frames(2);
const p2 = await st('photo');
check('clears slowly in the dark (still partly converted after 1.5 s)', p2.f > 0.4 && p2.f < p1.f, (p2.f * 100).toFixed(0) + '%');
await sleep(6000); await frames(2);
const p3 = await st('photo');
check('nearly clear after several seconds', p3.f < 0.15, (p3.f * 100).toFixed(0) + '%');

section('Chameleon — lattice spacing sets the wavelength');
await scrollTo('chameleon');
const k0 = await st('chameleon');
check('relaxed lattice reflects blue', k0.lambda > 430 && k0.lambda < 470 && /blue/.test(k0.ro.lambda), k0.ro.lambda);
await hold('chameleon', true); await sleep(3000); await frames(2);
const k1 = await st('chameleon');
check('excited: spacing widens and the wavelength lengthens', k1.d > k0.d + 40 && k1.lambda > 580, `d ${k0.d.toFixed(0)} → ${k1.d.toFixed(0)} nm, λ ${k1.lambda.toFixed(0)} nm`);
check('λ = 2·n·d holds', Math.abs(k1.lambda - 2 * 1.6 * k1.d) < 1e-6);
await shot('chameleon', '06-chameleon');
await hold('chameleon', false); await sleep(4500); await frames(2);
const k2 = await st('chameleon');
check('relaxes back toward blue', k2.d < k0.d + 12, `d ${k2.d.toFixed(0)} nm`);

section('Morpho — angle and index, no pigment');
await scrollTo('morpho');
const m0 = await st('morpho');
check('dry, face-on: blue near 450 nm', m0.lambda > 440 && m0.lambda < 465, m0.lambda.toFixed(0) + ' nm');
await page.evaluate(() => window.__colorChange.angle(50)); await frames(2);
const m1 = await st('morpho');
check('tilting shifts the peak bluer', m1.lambda < m0.lambda - 100, m1.lambda.toFixed(0) + ' nm at 50°');
await page.evaluate(() => window.__colorChange.angle(0)); await frames(2);
await hold('morpho', true); await sleep(2200); await frames(2);
const m2 = await st('morpho');
check('wetting with alcohol shifts it to green', m2.lambda > 520 && /green/.test(m2.ro.lambda), m2.ro.lambda);
await shot('morpho', '07-morpho');
await hold('morpho', false); await sleep(6000); await frames(2);
const m3 = await st('morpho');
check('alcohol evaporates: back to blue', m3.lambda < 475, m3.lambda.toFixed(0) + ' nm');

section('Input');
await scrollTo('photo');
const btn = page.locator('[data-hold="photo"]');
const bb = await btn.boundingBox();
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await sleep(800); await frames(2);
const held = await st('photo');
check('a real press-and-hold applies UV', held.f > 0.5, (held.f * 100).toFixed(0) + '%');
await page.mouse.up(); await frames(2);
check('releasing the pointer stops the UV', /dark|clear/.test((await st('photo')).ro.state));
await btn.focus(); await page.keyboard.down('Space'); await sleep(400); await frames(2);
check('space on a hold button works', /UV on/.test((await st('photo')).ro.state));
await page.keyboard.up('Space'); await frames(2);
const slider = page.locator('#ctlMorphoAngle');
await slider.fill('30'); await frames(2);
const m30 = await page.evaluate(() => ({ angle: window.__colorChange.mechs.morpho.angle, lambda: window.__colorChange.mechs.morpho.lambda(), label: document.getElementById('valMorphoAngle').textContent }));
check('the angle slider drives the Morpho', m30.angle === 30 && m30.label === '30°' && m30.lambda < m3.lambda, `${m30.label}, λ ${m30.lambda.toFixed(0)} nm`);
await page.locator('[data-echromic="bleach"]').click(); await frames(2);
check('electrochromic buttons toggle the mode', (await st('echromic')).mode === 'bleach' && await page.evaluate(() => document.querySelector('[data-echromic="bleach"]').classList.contains('is-active')));

section('Electrochromic principle — electrons and ions arrive together');
await page.locator('#ec-svg').scrollIntoViewIfNeeded();
const ec = () => page.evaluate(() => ({ q: __ecPrinciple.q(), tint: __ecPrinciple.tint(), cap: document.querySelector('[data-ec-cap]').textContent, ions: [...document.querySelectorAll('#ec-svg circle[r="5"]')].filter(c => c.getAttribute('cx')).length }));
check('starts empty and open', (await ec()).q === 0 && /nothing can move/.test((await ec()).cap));
await page.locator('[data-ec-mode="charge"]').click(); await sleep(1000);
const ecMid = await ec();
check('charge fills at ~0.5 per second (a full charge in ~2 s)', ecMid.q > 0.3 && ecMid.q < 0.75, 'q ' + ecMid.q.toFixed(2));
await page.locator('[data-ec-mode="open"]').click(); const ecA = (await ec()).q; await sleep(500);
const ecB = await ec();
check('open freezes the cell mid-state', ecB.q === ecA && ecB.q > 0 && ecB.q < 1 && ecB.cap === 'nothing can move, so nothing changes.', 'q ' + ecB.q.toFixed(2));
await page.locator('[data-ec-mode="charge"]').click(); await sleep(2200);
const ecFull = await ec();
check('WO₃: full is blue', ecFull.q === 1 && ecFull.tint > 0.85, 'tint ' + ecFull.tint);
await page.locator('[data-ec-mat="pedot"]').click(); await frames(2);
const ecP = await page.evaluate(() => ({ tint: __ecPrinciple.tint(), label: [...document.querySelectorAll('#ec-svg text')].map(t => t.textContent).join('|'), note: document.querySelector('.cc__ec-note').textContent }));
check('PEDOT: the same full cell is also blue — the toggle only relabels', ecP.tint > 0.85 && /(^|\|)PEDOT(\||$)/.test(ecP.label), 'tint ' + ecP.tint);
check('the note says same direction', /same motion, same direction/i.test(ecP.note), ecP.note);
await page.locator('[data-ec-mode="discharge"]').click(); await sleep(2200);
check('discharge empties it and clears it', (await ec()).q === 0 && (await ec()).tint < 0.1);
await page.locator('[data-ec-mat="wo3"]').click(); await page.locator('[data-ec-mode="open"]').click();

section('PEDOT display — a digit is dark segments on a pale ground');
await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__pedot);
await page.locator('#mech-pedot').scrollIntoViewIfNeeded();
const pe = () => page.evaluate(() => ({ dark: __pedot.dark(), lv: __pedot.level.map(v => +v.toFixed(3)), fills: [...document.querySelectorAll('#pe-svg polygon')].map(p => [p.getAttribute('fill'), p.getAttribute('stroke')]), ro: ['state', 'driven', 'power'].map(k => document.querySelector('[data-ro="pedot:' + k + '"]').textContent) }));
const pe_p0 = await pe();
check('one digit: exactly 7 segments, no outline', pe_p0.fills.length === 7 && pe_p0.fills.every(([, s]) => s === 'none'));
check('on load 0 segments are dark (pale, like an unlit LCD)', pe_p0.dark === 0 && pe_p0.lv.every(v => v === 0) && pe_p0.ro[1] === '0 of 7', pe_p0.ro.join(' / '));
const pe_btns = await page.evaluate(() => [...document.querySelectorAll('[data-pe-mode]')].map(b => b.textContent.trim()));
check('controls read Darken / Clear / Hold', pe_btns.join('|') === 'Darken (−V)|Clear (+V)|Hold', pe_btns.join('|'));
await page.locator('[data-pe-digit="8"]').click(); await page.locator('[data-pe-mode="darken"]').click(); await sleep(1100);
const pe_p8 = await pe();
check('darkening digit 8 yields 7 dark', pe_p8.dark === 7 && pe_p8.ro[0] === 'darkened — showing 8' && pe_p8.ro[1] === '7 of 7', pe_p8.ro.join(' / '));
check('a dark segment is PEDOT blue', pe_p8.fills[0][0] === 'rgb(30,52,150)', pe_p8.fills[0][0]);
await page.locator('[data-pe-digit="3"]').click(); await sleep(1100);
const pe_p3 = await pe();
// a..g; digit 3 is a b c d g — e and f clear, the rest stay dark, in one motion
check('switching to 3 while darkening clears e, f and keeps the rest', pe_p3.lv.join('') === '1111001' && pe_p3.ro[0] === 'darkened — showing 3' && pe_p3.ro[1] === '5 of 7', pe_p3.lv.join('') + ' · ' + pe_p3.ro.join(' / '));
await page.locator('[data-pe-mode="clear"]').click(); await sleep(350);
await page.locator('[data-pe-mode="hold"]').click(); const pe_h1 = (await pe()).lv; await sleep(500);
const pe_h2 = await pe();
check('hold freezes a fade mid-way', pe_h2.lv.join() === pe_h1.join() && pe_h2.lv.some(v => v > 0 && v < 1) && pe_h2.ro[2] === '~0 µW — holding', pe_h2.ro.join(' / '));
await page.locator('[data-pe-mode="clear"]').click(); await sleep(1100);
const pe_pc = await pe();
check('clear fades all seven back to pale', pe_pc.dark === 0 && pe_pc.lv.every(v => v === 0) && pe_pc.fills.every(([f]) => f === 'rgb(202,211,215)'), pe_pc.ro.join(' / '));
check('no "clear on blue" or "bleach" wording survives in the PEDOT column', await page.evaluate(() => !/clear on blue|bleach|blue when empty/i.test(document.getElementById('mech-pedot').textContent)));
check('table: colored state is "both: with electrons in"', await page.evaluate(() => [...document.querySelectorAll('.cc__cmp div')].some(d => /Colored state/.test(d.textContent) && /both: with electrons in/.test(d.textContent))));
check('mech-pedot and mech-echromic anchors still resolve', await page.evaluate(() => !!document.getElementById('mech-pedot') && !!document.getElementById('mech-echromic')));

section('Layout');
for (const vw of [1440, 1000, 640, 390]) {
  await page.setViewportSize({ width: vw, height: 900 }); await frames(3);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`no horizontal overflow at ${vw}px`, over <= 0, 'overflow ' + over + 'px');
  if (shotsDir && (vw === 1440 || vw === 390)) { await page.evaluate(() => window.scrollTo(0, 0)); await frames(2); await page.screenshot({ path: path.join(shotsDir, `08-layout-${vw}.png`), fullPage: true }); }
}
await page.setViewportSize({ width: 1440, height: 1000 });
check('no page errors during the run', errors.length === 0, errors.join(' | '));

await browser.close(); if (server) server.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) { console.log('FAILED:\n' + failed.map(f => '  - ' + f.name).join('\n')); process.exit(1); }
