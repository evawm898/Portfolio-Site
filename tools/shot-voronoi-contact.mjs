/*
 * shot-voronoi-contact.mjs — contact sheet for the VORONOI infill designs.
 *
 * Dev-only. Renders one isolated petal per voronoi config, top-down, with the
 * chrome hidden, so a change to the cell tiling can be looked at rather than
 * inferred from a triangle count.
 *
 * TWO THINGS THIS HARNESS HAS TO GET RIGHT, both of which it got wrong first time:
 *   - CHROME. #flower-canvas spans the whole page and the panel is drawn OVER it, so
 *     screenshotting the canvas does NOT crop the panel out. body.fl-preview is the
 *     project's own chrome-hiding class (flower.css) and is applied here.
 *   - MOTION. Auto-rotate is ON by default. Two runs then render at unsynchronised
 *     rotation phases and every pixel differs for reasons that have nothing to do
 *     with geometry. The toggle is switched off, and the shot is only taken once two
 *     consecutive frames are byte-identical — a moving scene fails rather than
 *     quietly producing a meaningless diff.
 *
 * WHY IT EXISTS: PR #77 moved the polygon Voronoi clips against. Five designs
 * changed triangle count by up to 12.6%, every change a reduction. The numbers
 * say the slivers that lived in the collapsed neck stopped being produced; only
 * eyes confirm nothing else went with them.
 *
 * RUN:  node tools/shot-voronoi-contact.mjs <outDir>
 * THEN: node tools/diff-contact.mjs <beforeDir> <afterDir>
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChromium } from './chromium-harness.mjs';
import { SHAPES } from '../flower-shapes.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_VERSION = '0.161.0';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

const outDir = process.argv[2];
if (!outDir) { console.error('usage: node tools/shot-voronoi-contact.mjs <outDir>'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });

// The same CHRYSANTHEMUM bundle verify-geometry-quality.mjs uses — a quilled floret at
// the width floor. Not a named SHAPES entry (it is a cross-section extreme, not a
// silhouette), so it is spelled out here exactly as the gate spells it.
const CHRYSANTHEMUM_UI = {
  width: 0.1, taper: 1, tip: 1, tipFineness: 1,
  clawLength: 0, clawWidth: 0.3, shoulder: 0.5,
  cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3,
  curlAmount: 0.2, edgeCurve: 0, edgeProfile: 0, petalCup: 0,
  crossSection: 1, crossSectionTaper: 0,
};
// ISOLATE THE PETAL: one petal, no receptacle, no stem, no sepals, no centre. The
// subject is the cell tiling, and a bloom of nine overlapping petals hides it.
const ISOLATE = { petalCount: '1', receptacleType: 'none', stemType: 'none', sepalsType: 'none', centerType: 'none' };
// RESET, applied before every config. Controls persist across configs in one page session,
// so anything one row sets and the next does not clear silently leaks forward — the first
// version of this sheet let `lobed-aniso` set voronoiAniso: 4 and every lobe-count row
// after it was measured at anisotropy 4 while claiming to be the default. Every key any
// config sets must appear here with its default.
const RESET = {
  cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3,
  voronoiAniso: 1, voronoiLloyd: 0, voronoiDensityLaw: 0, density: 7,
  clawLength: 0, crossSection: 0, curlAmount: 0, continuousMargin: 'on',
};

const CONFIGS = [];
for (const shape of Object.keys(SHAPES)) CONFIGS.push({ name: shape, ui: { ...SHAPES[shape], infillType: 'voronoi' } });
CONFIGS.push({ name: 'chrysanthemum', ui: { ...CHRYSANTHEMUM_UI, infillType: 'voronoi' } });
// Anisotropy on a cleft is the config with the largest triangle move (-12.6%), and the
// one place the per-seed metric engages (#73). It has to be on the sheet.
CONFIGS.push({ name: 'lobed-aniso', ui: { ...SHAPES.lobed, infillType: 'voronoi', cleftLobes: 4, voronoiAniso: 4 } });
// LOBE PARITY. cleftConfig places n-1 cleft centres symmetrically, so an EVEN lobe count
// puts one at exactly y = 0 — a slot down the midline, where the axis seeds are pinned.
// Odd counts have no centre on the axis. Both are on the sheet deliberately: the even rows
// are where a seed-placement fix must show, and the odd rows are the control that says a
// change is confined to the case it was aimed at. (Relaxation can push a seed into a sinus
// on any parity, so the odd rows are a control, not a guarantee of no movement.)
for (const n of [2, 3, 4, 5, 7]) {
  CONFIGS.push({ name: `lobes-${n}`, ui: { ...SHAPES.lobed, infillType: 'voronoi', cleftLobes: n } });
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/flower.html';
  fs.readFile(path.join(ROOT, p), (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
  catch { route.abort(); }
});
await page.goto(`http://localhost:${port}/flower.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => { const el = document.getElementById('readout'); return el && /tris/.test(el.textContent); }, { timeout: 60000 });

// Chrome off (CSS only — NOT preview mode, which would also suppress the build) and
// motion stopped, before anything is measured.
await page.evaluate(() => {
  document.body.classList.add('fl-preview');
  const ar = document.getElementById('autoRotate');
  if (ar && ar.checked) { ar.checked = false; ar.dispatchEvent(new Event('change', { bubbles: true })); }
});
{
  const bad = await page.evaluate(() => {
    const out = [];
    const ar = document.getElementById('autoRotate');
    if (!ar || ar.checked) out.push('autoRotate still on');
    for (const sel of ['.fl-panel', '.fl-viewpanel', '.fl-header', '.fl-hint']) {
      const el = document.querySelector(sel);
      if (el && getComputedStyle(el).display !== 'none') out.push(sel + ' still visible');
    }
    return out;
  });
  if (bad.length) { console.error('HARNESS INVALID: ' + bad.join('; ')); await browser.close(); server.close(); process.exit(2); }
}

// Wait until the scene stops moving, then shoot. Returns null if it never settles.
const shootWhenStill = async (file) => {
  let prev = null;
  for (let i = 0; i < 25; i++) {
    const buf = await page.locator('#flower-canvas').screenshot();
    if (prev && buf.equals(prev)) { fs.writeFileSync(file, buf); return true; }
    prev = buf;
    await page.waitForTimeout(200);
  }
  return false;
};

const setAll = async (ui) => {
  const failed = await page.evaluate((cfg) => {
    const miss = [];
    for (const [id, value] of Object.entries(cfg)) {
      const el = document.getElementById(id);
      if (!el) { miss.push(id + ':missing'); continue; }
      el.value = String(value);
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
      // A control the registry has hidden silently keeps its old value, which would make
      // this sheet a picture of a design nobody asked for. Report rather than assume.
      if (String(el.value) !== String(value)) miss.push(id + ':' + el.value + '!=' + value);
    }
    return miss;
  }, ui);
  return failed;
};

const rows = [];
for (const cfg of CONFIGS) {
  const bad = await setAll({ ...RESET, ...ISOLATE, ...cfg.ui });
  // Top-down frames the blade flat-on, which is the view the cell tiling reads in.
  // Re-applied per config because the camera refits to each new plant.
  await page.evaluate(() => {
    const v = document.getElementById('viewPreset');
    if (v) { v.value = 'top'; v.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  const file = path.join(outDir, cfg.name + '.png');
  if (!await shootWhenStill(file)) { console.error('HARNESS INVALID: ' + cfg.name + ' never settled — the scene is still moving.'); await browser.close(); server.close(); process.exit(2); }
  const readout = await page.evaluate(() => (document.getElementById('readout')?.textContent || '').replace(/\s+/g, ' ').trim());
  const tris = /([\d,]+)\s*tris/.exec(readout);
  rows.push({ name: cfg.name, tris: tris ? tris[1] : '?', notTaken: bad });
  console.log(cfg.name.padEnd(16), (tris ? tris[1] : '?').padStart(9), 'tris', bad.length ? '  CONFIG DID NOT TAKE: ' + bad.join(' ') : '');
}
fs.writeFileSync(path.join(outDir, 'readouts.json'), JSON.stringify(rows, null, 1));
const anyBad = rows.some((r) => r.notTaken.length);
if (pageErrors.length) { const real = pageErrors.filter((e) => !/fonts\.googleapis/.test(e)); if (real.length) { console.log('PAGE ERRORS:'); real.forEach((e) => console.log('  ! ' + e)); } }
await browser.close();
server.close();
process.exit(anyBad ? 1 : 0);
