/*
 * diag-lobed-voronoi-options.mjs — round 2 of the LOBED + VORONOI diagnosis.
 * MEASUREMENT ONLY. Builds no fix: it prototypes the candidate fixes INSIDE the harness
 * so each can be costed and checked against the star-shape constraint before any of them
 * is written into flower-geometry.js.
 *
 * Answers three questions:
 *  1. Is a cleft-aware inner bound viable? Built here as the marching-squares level set
 *     of petalMask - ribRadius(u) — the same construction maskContours uses, at a
 *     threshold instead of zero. Reports its crossings, its void content, and how well
 *     petalMask behaves as a distance (|grad| should be ~1).
 *  2. Per-lobe partition vs material-aware adjacency vs clip-only, each measured for the
 *     constraint that decides it: cellAnnulus builds outer[k]/inner[k] on rays from the
 *     centroid, so EVERY emitted cell must be star-shaped about its centroid or the
 *     annulus is garbage geometry — a print-safety failure, not a looks failure.
 *  3. What verify-geometry-quality's registration metric would say about each option.
 *     That metric compares infill points to ribInnerEdge(u) — the scalar envelope — so
 *     it is measured here rather than assumed.
 *
 * THE SEED SAMPLER IS A REPLICA of buildVoronoi's, which is a second copy of a producer
 * and would be unacceptable in shipped code. It is verified against the real builder in
 * every run (out.replica: cell count and total cell area under the same envelope clip);
 * if those diverge, the options are being measured on the wrong seeds and the run is void.
 *
 * RUN: npm i --no-save three@0.161.0 playwright-core playwright
 *      node docs/tools/diag-lobed-voronoi-options.mjs
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChromium } from '../../tools/chromium-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const THREE_DIR = path.join(ROOT, 'node_modules', 'three');
const THREE_VERSION = '0.161.0';
const HOOK = fs.readFileSync(path.join(ROOT, 'docs', 'tools', '_diag2-hook.js'), 'utf8');

const SET_HOOK = `
window.__diagSet2 = function(obj) {
  const rejected = [];
  for (const k in obj) {
    const el = inputs[k];
    if (!el) { rejected.push(k + ': no such control'); continue; }
    if (el.type === 'checkbox') { el.checked = !!obj[k]; continue; }
    el.value = obj[k];
    const want = obj[k], got = el.value;
    const num = want !== '' && got !== '' && isFinite(Number(want)) && isFinite(Number(got));
    const ok = num ? Math.abs(Number(want) - Number(got)) < 1e-9 : String(want) === String(got);
    if (!ok) rejected.push(k + ': set ' + JSON.stringify(want) + ' reads ' + JSON.stringify(got));
  }
  return rejected;
};
`;

const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/flower.html';
  const abs = path.join(ROOT, u);
  if (!abs.startsWith(ROOT)) { res.writeHead(403); return res.end('no'); }
  fs.readFile(abs, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream' });
    if (abs.endsWith('flower.js')) res.end(buf.toString('utf8') + '\n' + SET_HOOK + '\n' + HOOK); else res.end(buf);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
await page.route('**/cdn.jsdelivr.net/**', (route) => {
  const m = route.request().url().match(new RegExp('three@' + THREE_VERSION.replace(/\./g,'\\.') + '/(.*)$'));
  if (!m) return route.continue();
  try { return route.fulfill({ status:200, headers:{'Content-Type':'text/javascript','Access-Control-Allow-Origin':'*'}, body: fs.readFileSync(path.join(THREE_DIR, m[1])) }); }
  catch { return route.fulfill({ status:404, body:'nf' }); }
});
await page.goto(`http://127.0.0.1:${port}/flower.html`, { waitUntil:'load', timeout:30000 });
await page.waitForFunction('window.__diag2Ready === true', { timeout:30000 });
await page.evaluate(() => { const t = document.getElementById('advancedToggle'); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event('change',{bubbles:true})); } });
await page.waitForTimeout(250);

const LOBED = { width:0.95, taper:0.35, clawLength:0, clawWidth:0.3, shoulder:0.55,
                cleftDepth:0.55, cleftLobes:2, cleftWidth:0.3, tip:0.85, curlAmount:0.4,
                edgeCurve:0.05, edgeProfile:0, petalCup:0.1 };
// continuousMargin OFF isolates the question: with it on, ribCenterline applies a flare
// the mask level set has to reproduce separately, and a disagreement there would be
// confounded with the cleft question. Both are measured — 'margin ON' is the last row.
const CONFIGS = [
  { name:'SMOOTH, margin off — agreement check', ui:{ ...LOBED, cleftDepth:0, continuousMargin:'off', infillType:'voronoi' } },
  { name:'LOBED 2, margin off (shipped shape)',  ui:{ ...LOBED, continuousMargin:'off', infillType:'voronoi' } },
  { name:'LOBED 4, margin off',                  ui:{ ...LOBED, cleftLobes:4, continuousMargin:'off', infillType:'voronoi' } },
  { name:'LOBED 7 d12, margin off',              ui:{ ...LOBED, cleftLobes:7, density:12, continuousMargin:'off', infillType:'voronoi' } },
  { name:'LOBED 4 aniso 4, margin off',          ui:{ ...LOBED, cleftLobes:4, voronoiAniso:4, continuousMargin:'off', infillType:'voronoi' } },
  { name:'SMOOTH, margin ON — flare agreement',  ui:{ ...LOBED, cleftDepth:0, continuousMargin:'on', infillType:'voronoi' } },
  { name:'LOBED 4, margin ON (the real default)',ui:{ ...LOBED, cleftLobes:4, continuousMargin:'on', infillType:'voronoi' } },
];
const RESET = { cleftDepth:0, cleftLobes:2, cleftWidth:0.3, voronoiDensityLaw:0, voronoiAniso:1, voronoiLloyd:0, density:7, continuousMargin:'on' };

const results = [];
for (const c of CONFIGS) {
  const bad = await page.evaluate((u) => window.__diagSet2(u), { ...RESET, ...c.ui });
  if (bad.length) { console.error('CONFIG DID NOT TAKE:', c.name, bad.join('; ')); process.exitCode = 1; continue; }
  const r = await page.evaluate(() => window.__diag2());
  results.push({ name: c.name, ...r });
  console.error('measured', c.name);
}
await browser.close(); server.close();
console.log(JSON.stringify(results, null, 1));
