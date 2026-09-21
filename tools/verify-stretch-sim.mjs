#!/usr/bin/env node
// verify-stretch-sim.mjs — behaviour gate for textile-stretch-simulator.html
// (Field Notes No. 05).
//
// Nothing in CI covers this page (every Actions workflow is path-filtered to
// flower*/bloom*), and nothing here is geometry for a printer, so there is no
// export gate to lean on. What CAN silently break is the physics the page
// teaches: a knit that stops out-stretching a woven, a bias pull that no
// longer trellises, spandex that no longer recovers, a loop whose yarn
// length quietly drifts while it is supposed to be conserved. This drives a
// real Chromium against the real page and asserts those, through the page's
// own read-only test hook (window.__stretchSim), and with a real pointer drag
// on the canvas so the input path is covered too.
//
//   node tools/verify-stretch-sim.mjs [--url http://127.0.0.1:8899/textile-stretch-simulator.html]
//                                     [--shots <dir>]
//
// It serves the repo on a free port unless --url is given. Google Fonts is
// stubbed (the fallback stack renders; the gate is about behaviour).
// Playwright is a global install in the dev container, not a project
// dependency:  NODE_PATH=/opt/node22/lib/node_modules node tools/verify-stretch-sim.mjs

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { findChromium } from './chromium-harness.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
  try { return require('playwright'); }
  catch { console.error('Could not resolve playwright. Try:\n  NODE_PATH=/opt/node22/lib/node_modules node tools/verify-stretch-sim.mjs'); process.exit(2); }
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
if (!URL_) { server = await serveRepo(); URL_ = 'http://127.0.0.1:' + server.address().port + '/textile-stretch-simulator.html'; }
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
await page.waitForFunction(() => window.__stretchSim && window.__stretchSim.state.P);
await sleep(150);

// helpers -------------------------------------------------------------
const frames = n => page.evaluate(n => new Promise(r => { let k = n; const f = () => (--k <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const read = () => page.evaluate(() => {
  const S = window.__stretchSim, st = S.state, P = st.P;
  const tot = { e1: st.elastic.e1 + st.residual.e1, e2: st.elastic.e2 + st.residual.e2, g: st.elastic.g + st.residual.g };
  return {
    sigma: st.sigma, theta: st.theta, broken: st.broken,
    ext: S.strainAlong(tot, st.theta), elasticExt: S.strainAlong(st.elastic, st.theta),
    residual: { ...st.residual }, elastic: { ...st.elastic },
    loop: st.loop ? { len: st.loop.len, H: st.loop.H, W: st.loop.W, jammed: st.loop.jammed, yarnStrain: st.loop.yarnStrain, a: st.loop.a, ha: st.loop.ha } : null,
    woven: st.woven ? { ...st.woven } : null,
    regime: document.getElementById('ro-regime').textContent,
    load: document.getElementById('ro-load').textContent,
    fabric: st.fabric, len0: P.len0, gLock: P.gLock,
  };
});
const preset = async name => { await page.evaluate(n => window.__stretchSim.applyPreset(n), name); await frames(2); };
const pull = async (deg, px) => { await page.evaluate(([d, p]) => window.__stretchSim.pull(d, p), [deg, px]); await frames(3); return read(); };
const release = async () => { await page.evaluate(() => window.__stretchSim.release()); };
const shot = async name => { if (shotsDir) await page.locator('.sim').screenshot({ path: path.join(shotsDir, name + '.png') }); };

// 1. page loads clean ---------------------------------------------------
section('Page');
check('no page errors on load', errors.length === 0, errors.join(' | '));
check('canvas present and sized', await page.evaluate(() => { const c = document.getElementById('swatchCanvas'); return c.width > 300 && c.height > 300; }));
check('index reads No. 05 / NN', /^No\. 05 \/ \d\d$/.test((await page.textContent('.project-header__index')).trim()));
await shot('01-knit-rest');

// 2. knit: course-wise pull — loops flatten, yarn length conserved ----------
section('Knit, course-wise');
await preset('cotton-jersey');
const rest = await read();
const kx = await pull(0, 150);
// (pull() grabs the swatch centre and pins the far edge)
check('load is positive under pull', kx.sigma > 0.5, kx.load);
check('extends along the course direction', kx.ext > 0.25, 'ext ' + (kx.ext * 100).toFixed(0) + '%');
check('loop widens and flattens', kx.loop.W > rest.loop.W * 1.15 && kx.loop.H < rest.loop.H * 0.9, `W ${rest.loop.W.toFixed(2)}→${kx.loop.W.toFixed(2)}  H ${rest.loop.H.toFixed(2)}→${kx.loop.H.toFixed(2)}`);
check('yarn length conserved in the structural regime', !kx.loop.jammed && Math.abs(kx.loop.len - kx.len0) < 1e-6, `ℓ ${kx.loop.len.toFixed(4)} vs ℓ₀ ${kx.len0.toFixed(4)}`);
check('regime text says loops rearranging', /rearranging/.test(kx.regime), kx.regime);
await shot('02-knit-course-pull');
const kxBig = await pull(0, 700);
check('a hard course-wise pull jams the loops and strains the yarn', kxBig.loop.jammed && kxBig.loop.yarnStrain > 0.005, `yarn ${(kxBig.loop.yarnStrain * 100).toFixed(1)}%  ext ${(kxBig.ext * 100).toFixed(0)}%`);
check('cotton jersey reaches the yarn break cap', kxBig.broken === true, kxBig.regime);
await shot('03-knit-course-jammed');
await release(); await frames(2);

// 3. knit: wale-wise — loops go tall and narrow, fabric narrows ---------------
section('Knit, wale-wise');
await page.evaluate(() => window.__stretchSim.relax());
const ky = await pull(90, 150);
check('extends along the wale direction', ky.ext > 0.1, 'ext ' + (ky.ext * 100).toFixed(0) + '%');
check('loop narrows and grows tall', ky.loop.W < rest.loop.W * 0.95 && ky.loop.H > rest.loop.H * 1.05, `W ${rest.loop.W.toFixed(2)}→${ky.loop.W.toFixed(2)}  H ${rest.loop.H.toFixed(2)}→${ky.loop.H.toFixed(2)}`);
check('wale-wise is stiffer than course-wise at the same hand pull', ky.ext < kx.ext, `${(ky.ext * 100).toFixed(0)}% vs ${(kx.ext * 100).toFixed(0)}%`);
await shot('04-knit-wale-pull');
await release(); await frames(2);

// 4. recovery: cotton holds set, spandex snaps back -------------------------
section('Recovery');
await page.evaluate(() => window.__stretchSim.relax());
await pull(0, 150); await release(); await sleep(reduceWait(900)); await frames(2);
const cottonAfter = await read();
check('cotton jersey holds residual set after release', cottonAfter.residual.e1 > 0.03, 'residual e1 ' + (cottonAfter.residual.e1 * 100).toFixed(1) + '%');
await shot('05-knit-cotton-set');
await preset('spandex-jersey');
await pull(0, 150); await release(); await sleep(reduceWait(900)); await frames(2);
const spandexAfter = await read();
check('spandex jersey recovers almost fully', spandexAfter.residual.e1 < 0.015, 'residual e1 ' + (spandexAfter.residual.e1 * 100).toFixed(2) + '%');
check('spandex jersey extends further before its yarn breaks', await page.evaluate(() => { const S = window.__stretchSim; return S.loadCap(S.state.P, 0); }) > 20, 'cap N');

// 5. woven on grain vs bias -----------------------------------------------
section('Woven');
await preset('cotton-poplin');
const wRest = await read();
check('fabric switched to woven', wRest.fabric === 'woven');
await shot('06-woven-rest');
const wx = await pull(0, 150);
check('woven on grain barely extends', wx.ext < 0.12, 'ext ' + (wx.ext * 100).toFixed(1) + '%');
check('woven on grain carries far more load than the knit did at the same pull', wx.sigma > kx.sigma * 2, `${wx.sigma.toFixed(1)} N vs ${kx.sigma.toFixed(1)} N`);
check('knit out-stretches woven at the same hand pull', kx.ext > wx.ext * 3, `${(kx.ext * 100).toFixed(0)}% vs ${(wx.ext * 100).toFixed(1)}%`);
check('on-grain regime is crimp interchange or yarn extension', /crimp/.test(wx.regime), wx.regime);
await shot('07-woven-grain-pull');
await release(); await frames(2); await page.evaluate(() => window.__stretchSim.relax());
const wb = await pull(45, 150);
check('woven on the bias extends more than on grain', wb.ext > wx.ext * 2, `${(wb.ext * 100).toFixed(1)}% vs ${(wx.ext * 100).toFixed(1)}%`);
check('bias pull shears the yarns (angle < 90°)', wb.woven.shear > 0.05, 'shear ' + (wb.woven.shear * 180 / Math.PI).toFixed(1) + '°');
check('bias regime is the trellis', /trellis/.test(wb.regime), wb.regime);
await shot('08-woven-bias-pull');
const wbBig = await pull(45, 900);
check('a hard bias pull locks the trellis', Math.abs(wbBig.elastic.g) >= wbBig.gLock * 0.98, `γ ${(Math.abs(wbBig.elastic.g) * 180 / Math.PI).toFixed(1)}° lock ${(wbBig.gLock * 180 / Math.PI).toFixed(1)}°`);
await shot('09-woven-bias-locked');
await release(); await frames(2);

// 6. stretch denim: spandex gives a woven real on-grain stretch ---------------
await preset('stretch-denim');
const dx = await pull(0, 150);
check('stretch denim extends more on grain than poplin', dx.ext > wx.ext * 1.5, `${(dx.ext * 100).toFixed(1)}% vs ${(wx.ext * 100).toFixed(1)}%`);
await release(); await frames(2);

// 7. density: tighter knit jams sooner -------------------------------------
section('Density');
await preset('cotton-jersey');
const capLoose = await page.evaluate(() => { const S = window.__stretchSim; S.setParams({ density: 3.5 }); const P = S.state.P; return S.strainAlong(S.elasticStrains(P, S.loadCap(P, 0), 0), 0); });
const capTight = await page.evaluate(() => { const S = window.__stretchSim; S.setParams({ density: 8 }); const P = S.state.P; return S.strainAlong(S.elasticStrains(P, S.loadCap(P, 0), 0), 0); });
check('loose knit extends further than tight knit before its yarn breaks', capLoose > capTight, `${(capLoose * 100).toFixed(0)}% vs ${(capTight * 100).toFixed(0)}%`);
await preset('cotton-jersey');

// 8. real pointer drag on the canvas ----------------------------------------
section('Input');
const box = await page.locator('#swatchCanvas').boundingBox();
await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2);
await page.mouse.down();
for (let i = 1; i <= 12; i++) { await page.mouse.move(box.x + box.width / 2 + 40 + i * 12, box.y + box.height / 2 - i * 2); await frames(1); }
await frames(2);
const dragged = await read();
check('a real pointer drag loads the swatch', dragged.sigma > 0.3 && dragged.ext > 0.05, `${dragged.load}, ext ${(dragged.ext * 100).toFixed(0)}%`);
check('drag direction follows the pointer', Math.abs(dragged.theta) < 0.35, 'θ ' + (dragged.theta * 180 / Math.PI).toFixed(0) + '°');
await shot('10-pointer-drag');
await page.mouse.up(); await frames(2);
const afterUp = await read();
check('releasing the pointer starts recovery', afterUp.sigma === 0 && afterUp.residual.e1 > 0, 'residual e1 ' + (afterUp.residual.e1 * 100).toFixed(1) + '%');
// press-and-hold pull button
const btn = page.locator('[data-pull="90"]');
await btn.scrollIntoViewIfNeeded();          // the stage bar sits below the 1000 px fold; the mouse does not scroll
const bb = await btn.boundingBox();
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await sleep(500); await frames(2);
const held = await read();
check('press-and-hold pull button loads along the wale', held.sigma > 0.3 && Math.abs(held.theta - Math.PI / 2) < 1e-6, held.load);
await page.mouse.up(); await frames(2);
check('releasing the button releases the swatch', (await read()).sigma === 0);
// keyboard on the pull button
await btn.focus(); await page.keyboard.down('Space'); await sleep(400); await frames(2);
const keyHeld = await read();
check('space on a pull button pulls', keyHeld.sigma > 0.3, keyHeld.load);
await page.keyboard.up('Space'); await frames(2);
check('controls relabel per fabric', await page.evaluate(() => { window.__stretchSim.setFabric('woven'); return document.getElementById('lblDensity').textContent === 'Thread density' && document.getElementById('valDensity').textContent.includes('threads/cm'); }));
await page.evaluate(() => window.__stretchSim.setFabric('knit'));

// 9. responsive layout does not overflow ------------------------------------
section('Layout');
for (const vw of [1440, 1000, 640, 390]) {
  await page.setViewportSize({ width: vw, height: 900 }); await frames(3);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`no horizontal overflow at ${vw}px`, over <= 0, 'overflow ' + over + 'px');
  if (shotsDir && (vw === 1000 || vw === 390)) await page.screenshot({ path: path.join(shotsDir, `11-layout-${vw}.png`), fullPage: vw === 390 ? false : true });
}
await page.setViewportSize({ width: 1440, height: 1000 });

check('no page errors during the run', errors.length === 0, errors.join(' | '));

function reduceWait(ms) { return ms; }

await browser.close();
if (server) server.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) { console.log('FAILED:\n' + failed.map(f => '  - ' + f.name).join('\n')); process.exit(1); }
