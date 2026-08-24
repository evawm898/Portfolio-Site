/*
 * diag-52-residual.mjs — is the 5-edge non-manifold residual on #52 step 2 caused by
 * degenerate Voronoi cells? MEASUREMENT ONLY.
 *
 * #51 left "LOBED depth 0.5 x 3 lobes" and "x 5 lobes" with 5 non-manifold edges each
 * (4faces:4, 10faces:1) incident to zero-area triangles, while 4, 6 and 7 lobes went to 0.
 * The LOBED + VORONOI work found degenerate Voronoi cells on main, so they were a
 * candidate source. This checks that, and then checks the next hypothesis up.
 *
 * RUN: node docs/tools/diag-52-residual.mjs
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
const HOOK = `
window.__r52Set = function(obj) { const bad = [];
  for (const k in obj) { const el = inputs[k]; if (!el) { bad.push(k+':absent'); continue; }
    el.value = obj[k]; if (String(el.value) !== String(obj[k])) bad.push(k+':'+el.value); }
  return bad; };
window.__r52 = async function () {
  const G = window.__r52G || (window.__r52G = await import('./flower-geometry.js'));
  const ui = readUI(); const P = resolveParams(ui); const cfg = G.cleftConfig(P);
  const outlineN = G.spineCurlPeakRate(P) > 0
    ? Math.max(P.outlineSteps || 56, G.spineSampleCount(P)) : (P.outlineSteps || 56);
  // Consecutive-point spacing on the boundary the rim is lofted along. A pair closer than
  // the STL weld precision (1e-4) welds to one vertex, and the triangle spanning them has
  // zero area — exactly what #52 step 2 describes as incident to those edges.
  const spacing = (poly) => { let below1e4 = 0, below1e6 = 0, min = Infinity;
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i+1) % poly.length];
      const d = Math.hypot(b.x-a.x, b.y-a.y);
      if (d < min) min = d; if (d < 1e-4) below1e4++; if (d < 1e-6) below1e6++; }
    return { n: poly.length, min, below1e4, below1e6 }; };
  const loop = G.ribPath(P).loop(outlineN);
  const sil = G.buildSilhouette(P, outlineN);
  const out = { infill: P.infillType, lobes: cfg ? cfg.count : 0, depth: P.cleftDepth,
                outlineN, loop: spacing(loop), silhouette: spacing(sil) };
  // Voronoi cells only exist if the infill IS voronoi. Recorded so the refutation is
  // measured rather than argued.
  if (P.infillType === 'voronoi') {
    const mk = (s)=>{let t=s>>>0;return()=>{t=(t+0x6D2B79F5)>>>0;let x=Math.imul(t^(t>>>15),1|t);
      x=(x+Math.imul(x^(x>>>7),61|x))^x;return((x^(x>>>14))>>>0)/4294967296;};};
    const v = G.buildVoronoi(P, mk(12345), { density:P.density, softness:P.softness,
      lloyd:P.voronoiLloyd, anisotropy:P.voronoiAniso, cellDensityLaw:P.voronoiDensityLaw,
      weightHierarchy:P.voronoiWeight, weightFalloff:P.voronoiWeightFalloff,
      slabTaper:P.voronoiSlabTaper, minCellSize:0 });
    const A=(c)=>{let a=0;for(let i=0;i<c.length;i++){const p=c[i],q=c[(i+1)%c.length];a+=p.x*q.y-q.x*p.y;}return Math.abs(a*0.5);};
    const Pr=(c)=>{let l=0;for(let i=0;i<c.length;i++){const p=c[i],q=c[(i+1)%c.length];l+=Math.hypot(q.x-p.x,q.y-p.y);}return l;};
    out.voronoiCells = v.slabs.length;
    out.degenerateCells = v.slabs.filter((s)=>Pr(s.outer)>1e-9 && (4*Math.PI*A(s.outer))/(Pr(s.outer)**2) < 0.02).length;
  } else { out.voronoiCells = 0; out.degenerateCells = 0; }
  return out;
};
window.__r52Ready = true;`;
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/flower.html';
  const abs = path.join(ROOT, u); if (!abs.startsWith(ROOT)) { res.writeHead(403); return res.end('no'); }
  fs.readFile(abs, (err, buf) => { if (err) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream' });
    if (abs.endsWith('flower.js')) res.end(buf.toString('utf8') + '\n' + HOOK); else res.end(buf); });
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
await page.waitForFunction('window.__r52Ready === true', { timeout:30000 });
await page.evaluate(() => { const t = document.getElementById('advancedToggle'); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event('change',{bubbles:true})); } });

// The export gate's "LOBED depth 0.5 x N lobes (rim contour split)" family verbatim:
// continuous margin ON, infill VEINS, cleftWidth 0.3, clawLength 0, cleftDepth 0.5.
console.log('config                          infill    loopPts  minSeg      <1e-4  <1e-6   cells  degenerate');
for (const lobes of [2,3,4,5,6,7]) {
  const bad = await page.evaluate((o) => window.__r52Set(o),
    { continuousMargin:'on', infillType:'veins', cleftWidth:'0.3', clawLength:'0', cleftDepth:'0.5', cleftLobes:String(lobes) });
  if (bad.length) { console.error('DID NOT TAKE:', bad.join(';')); process.exitCode = 1; }
  const r = await page.evaluate(() => window.__r52());
  console.log(`LOBED 0.5 x ${lobes} lobes`.padEnd(32) + String(r.infill).padEnd(10) +
    String(r.loop.n).padStart(7) + '  ' + r.loop.min.toExponential(2).padStart(9) +
    String(r.loop.below1e4).padStart(7) + String(r.loop.below1e6).padStart(7) +
    String(r.voronoiCells).padStart(8) + String(r.degenerateCells).padStart(12));
}
await browser.close(); server.close();
