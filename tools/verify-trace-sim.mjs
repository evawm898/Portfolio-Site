#!/usr/bin/env node
// verify-trace-sim.mjs — behaviour gate for conductive-trace-resistance.html
// (Field Notes No. 06).
//
// Nothing in CI covers this page (every Actions workflow is path-filtered to
// flower*/bloom*). What can silently break is the physics it teaches: a
// printed trace that stops cracking, a serpentine whose resistance moves while
// it straightens, a yarn whose contacts no longer re-form, electrons that keep
// flowing through an open circuit. This drives a real Chromium against the
// real page through its read-only hook (window.__traceSim) and a real pointer
// drag on the canvas.
//
//   node tools/verify-trace-sim.mjs [--url http://127.0.0.1:8899/conductive-trace-resistance.html]
//                                   [--shots <dir>]
//
// Playwright is a global install in the dev container, not a project
// dependency:  NODE_PATH=/opt/node22/lib/node_modules node tools/verify-trace-sim.mjs

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
  catch { console.error('Could not resolve playwright. Try:\n  NODE_PATH=/opt/node22/lib/node_modules node tools/verify-trace-sim.mjs'); process.exit(2); }
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
if (!URL_) { server = await serveRepo(); URL_ = 'http://127.0.0.1:' + server.address().port + '/conductive-trace-resistance.html'; }
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
await page.waitForFunction(() => window.__traceSim && window.__traceSim.state.sample);
await sleep(150);

const frames = n => page.evaluate(n => new Promise(r => { let k = n; const f = () => (--k <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const read = () => page.evaluate(() => {
  const S = window.__traceSim.state, s = S.sample;
  return {
    type: S.type, eps: S.eps, epsMax: S.epsMax, R: isFinite(S.R) ? S.R : 'open', R0: s.R0,
    broken: !!s.broken, contacts: s.contacts ? s.contacts.filter(c => c.intact).length : null,
    cracks: s.cracks ? s.cracks.filter(c => c.active).length : null,
    epsStr: s.epsStr, electrons: S.electrons.map(e => e.pos ? [e.pos[0], e.pos[1]] : null),
    rText: document.getElementById('ro-r').textContent, regime: document.getElementById('ro-regime').textContent,
    history: S.history.length,
  };
});
const setType = async t => { await page.evaluate(t => window.__traceSim.setType(t), t); await frames(2); };
const strain = async e => { await page.evaluate(e => window.__traceSim.setStrain(e), e); await frames(3); return read(); };
const shot = async name => { if (shotsDir) await page.locator('.ctr').screenshot({ path: path.join(shotsDir, name + '.png') }); };
const moved = (a, b) => a.electrons.some((p, i) => p && b.electrons[i] && Math.hypot(p[0] - b.electrons[i][0], p[1] - b.electrons[i][1]) > 0.5);

section('Page');
check('no page errors on load', errors.length === 0, errors.join(' | '));
check('index reads No. 06 / 06', (await page.textContent('.project-header__index')).trim() === 'No. 06 / 06');
await shot('01-printed-rest');

section('Printed');
await setType('printed');
const p0 = await read();
check('rest resistance is R0', Math.abs(p0.R - p0.R0) < 1e-9, p0.rText);
const p1 = await strain(0.1);
check('resistance rises before any crack', p1.R > p0.R * 1.5 && p1.cracks === 0, `${p1.rText}, cracks ${p1.cracks}`);
const p2 = await strain(0.35);
check('cracks open past the threshold', p2.cracks > 0, `${p2.cracks} cracks`);
check('resistance climbs by orders of magnitude', p2.R > p0.R * 20, `${p2.rText} (×${(p2.R / p0.R).toFixed(0)})`);
await shot('02-printed-cracked');
const p3 = await strain(0);
check('printed trace retains damage on release', p3.R > p0.R * 1.3 && p3.cracks > 0, `at rest ${p3.rText} vs R0 ${p0.R0} Ω`);
const p3b = await read(); await frames(6); const p3c = await read();
check('electrons keep moving in a damaged but closed circuit', moved(p3b, p3c));

section('Laminated');
await setType('laminated');
const l0 = await read();
const lMid = await strain(l0.epsStr * 0.6);
check('resistance unchanged while the meander straightens', Math.abs(lMid.R - l0.R) < 1e-9, `${lMid.rText} at ${(lMid.eps * 100).toFixed(0)}% (straightens at ${(l0.epsStr * 100).toFixed(0)}%)`);
await shot('03-laminated-straightening');
const lStr = await strain(l0.epsStr + 0.01);
check('small rise once the copper itself strains', lStr.R > l0.R && lStr.R < l0.R * 1.1 && !lStr.broken, lStr.rText);
const lBreak = await strain(l0.epsStr + 0.08);
check('fractures to an open circuit', lBreak.broken && lBreak.R === 'open', lBreak.regime);
const lb1 = await read(); await frames(8); const lb2 = await read();
check('electrons stop once the circuit is open', !moved(lb1, lb2));
await shot('04-laminated-fractured');
const lBack = await strain(0);
check('fracture is permanent on release', lBack.broken && lBack.R === 'open');
await page.evaluate(() => window.__traceSim.newSample()); await frames(2);
check('new sample restores the trace', !(await read()).broken && (await read()).R === l0.R0);

section('Yarn');
await setType('yarn');
const y0 = await read();
check('all contacts intact at rest', y0.contacts === 60, y0.contacts + ' / 60');
const yDip = await strain(0.08);
check('slight dip at low strain (filaments pressed together)', yDip.R < y0.R, `${yDip.rText} vs ${y0.rText}`);
const yMid = await strain(0.45);
check('contacts break with strain', yMid.contacts < 40, yMid.contacts + ' / 60');
check('resistance rises as contacts go', yMid.R > y0.R * 3, `${yMid.rText} (×${(yMid.R / y0.R).toFixed(1)})`);
await shot('05-yarn-contacts-breaking');
const yHigh = await strain(0.8);
check('most contacts open at high strain', yHigh.contacts < 12, yHigh.contacts + ' / 60');
const yBack = await strain(0);
check('contacts re-form on release', yBack.contacts === 60 && Math.abs(yBack.R - y0.R) < 1e-9, yBack.contacts + ' / 60, ' + yBack.rText);
await page.evaluate(() => window.__traceSim.setStrain(0.3)); await frames(2);
const ya = await read(); await frames(6); const yb = await read();
check('electrons hop between filaments and keep moving', moved(ya, yb));

section('Ordering');
const at30 = {};
for (const t of ['printed', 'laminated', 'yarn']) { await setType(t); const r = await strain(0.3); at30[t] = r.R === 'open' ? Infinity : r.R / r.R0; }
check('at 30 %: printed rises most, laminated not at all, yarn in between', at30.printed > at30.yarn && at30.yarn > at30.laminated && at30.laminated === 1, JSON.stringify(at30));
check('reference curves are ordered the same way', await page.evaluate(() => { const c = window.__traceSim.curves; return c.printed(0.3) > c.yarn(0.3) && c.yarn(0.3) > c.laminated(0.3); }));

section('Input');
await setType('printed');
const box = await page.locator('#traceCanvas').boundingBox();
await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2); await page.mouse.down();
for (let i = 1; i <= 10; i++) { await page.mouse.move(box.x + box.width * 0.4 + i * 9, box.y + box.height / 2); await frames(1); }
await frames(2);
const dragged = await read();
check('a real pointer drag stretches the trace', dragged.eps > 0.1 && dragged.R > dragged.R0 * 1.5, `${(dragged.eps * 100).toFixed(0)}%, ${dragged.rText}`);
await shot('06-pointer-drag');
await page.mouse.up(); await sleep(900); await frames(2);
const sprung = await read();
check('release springs the substrate back', sprung.eps < 0.01, (sprung.eps * 100).toFixed(1) + '%');
check('chart history was recorded', sprung.history > 10, sprung.history + ' points');
const btn = page.locator('#ctlStretch');
await btn.focus(); await page.keyboard.down('Space'); await sleep(500); await frames(2);
const held = await read();
check('holding the stretch button ramps the strain', held.eps > 0.1, (held.eps * 100).toFixed(0) + '%');
await page.keyboard.up('Space'); await sleep(900); await frames(2);
check('releasing the button springs back', (await read()).eps < 0.01);
check('structure labels follow the type', await page.evaluate(() => { window.__traceSim.setType('yarn'); return document.getElementById('ro-spec').textContent.includes('silver-plated') && document.querySelector('[data-type="yarn"]').classList.contains('is-active'); }));

section('Layout');
for (const vw of [1440, 1000, 640, 390]) {
  await page.setViewportSize({ width: vw, height: 900 }); await frames(3);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`no horizontal overflow at ${vw}px`, over <= 0, 'overflow ' + over + 'px');
  if (shotsDir && (vw === 1000 || vw === 390)) await page.screenshot({ path: path.join(shotsDir, `07-layout-${vw}.png`), fullPage: vw !== 390 });
}
await page.setViewportSize({ width: 1440, height: 1000 });
check('no page errors during the run', errors.length === 0, errors.join(' | '));

await browser.close(); if (server) server.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) { console.log('FAILED:\n' + failed.map(f => '  - ' + f.name).join('\n')); process.exit(1); }
