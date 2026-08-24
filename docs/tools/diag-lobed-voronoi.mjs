/*
 * diag-lobed-voronoi.mjs — measurement for the "LOBED + VORONOI: the cells don't know the
 * lobes are there" report. DIAGNOSIS ONLY: it changes nothing and asserts nothing.
 *
 * Same harness shape as tools/verify-geometry-quality.mjs — the hook is appended to the
 * SERVED flower.js, so it runs in module scope and calls the real resolveParams / readUI
 * and the real geometry exports. Configs are set through __diagSet, which reads every
 * value back: a config the UI rewrites would measure a different petal than the one it names.
 *
 * RUN: npm i --no-save three@0.161.0 playwright-core playwright
 *      node docs/tools/diag-lobed-voronoi.mjs
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
window.__diagSet = function(obj) {
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
window.__diagGeom = null;
window.__diag = async function() {
  const G = window.__diagGeom || (window.__diagGeom = await import('./flower-geometry.js'));
  const ui = readUI();
  const P = resolveParams(ui);
  const cfg = G.cleftConfig(P);
  const MM = 26;
  const out = { infill: P.infillType, cleftDepth: P.cleftDepth, cleftLobes: P.cleftLobes,
                L: P.L, W: P.W, density: P.density, cellLaw: P.voronoiDensityLaw, aniso: P.voronoiAniso,
                lobes: cfg ? cfg.count : 0, uFloor: cfg ? cfg.uFloor : null, Wpeak: cfg ? cfg.Wpeak : null };

  const area = (poly) => { let a = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i+1)%poly.length]; a += p.x*q.y - q.x*p.y; } return Math.abs(a*0.5); };
  const inPoly = (x, y, poly) => { let s = false; for (let i = 0, j = poly.length-1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (((yi > y) !== (yj > y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi)) s = !s; } return s; };
  const bbox = (poly) => { let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; for (const p of poly){ if(p.x<x0)x0=p.x; if(p.x>x1)x1=p.x; if(p.y<y0)y0=p.y; if(p.y>y1)y1=p.y; } return {x0,x1,y0,y1}; };
  // A degenerate SH bridge has ZERO AREA, so an area/interior test cannot see it.
  // The bridge is an EDGE that runs across the void — so sample the PERIMETER.
  const perimeterVoid = (poly) => {
    let total = 0, inVoid = 0;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i+1)%poly.length];
      const len = Math.hypot(q.x-p.x, q.y-p.y);
      if (len < 1e-12) continue;
      const steps = Math.max(2, Math.min(40, Math.ceil(len / (P.L*0.004))));
      for (let k = 0; k < steps; k++) {
        const t = (k+0.5)/steps, x = p.x + (q.x-p.x)*t, y = p.y + (q.y-p.y)*t;
        total += len/steps;
        if (G.petalMask(x, y, P, cfg) < -1e-9) inVoid += len/steps;
      }
    }
    return total > 0 ? inVoid/total : 0;
  };
  const voidFraction = (poly, n) => {
    const b = bbox(poly); let inside = 0, voidHits = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = b.x0 + (b.x1-b.x0)*(i+0.5)/n, y = b.y0 + (b.y1-b.y0)*(j+0.5)/n;
      if (!inPoly(x, y, poly)) continue;
      inside++;
      if (G.petalMask(x, y, P, cfg) < 0) voidHits++;
    }
    return inside ? { frac: voidHits/inside, inside } : { frac: 0, inside: 0 };
  };

  // ---- (1) THE CLIP POLYGON: is it cleft-aware? ----
  const clip = G.ribMarginPolyline(P, 72);
  const material = G.buildSilhouette(P, 160);
  out.clipVertices = clip.length;
  out.clipArea = area(clip);
  out.materialArea = area(material);
  out.clipVoid = voidFraction(clip, 220);
  const crossings = (poly, x) => { let c = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i+1)%poly.length];
    if ((p.x <= x) !== (q.x <= x)) c++; } return c; };
  let clipMaxCross = 0, matMaxCross = 0;
  for (let i = 1; i < 40; i++) { const x = P.L * i / 40;
    clipMaxCross = Math.max(clipMaxCross, crossings(clip, x));
    matMaxCross = Math.max(matMaxCross, crossings(material, x)); }
  out.clipMaxCrossings = clipMaxCross;
  out.materialMaxCrossings = matMaxCross;

  // ---- (2) ENVELOPE vs LOBE-LOCAL HALF-WIDTH ----
  if (cfg) {
    const at = [];
    for (const uu of [0.55, 0.65, 0.75, 0.85, 0.95]) {
      const x = P.L * uu, env = G.petalHalfWidth(uu, P);
      const N = 2000, ys = [];
      let run = null;
      for (let i = 0; i <= N; i++) { const y = -env*1.05 + (2*env*1.05)*i/N;
        const solid = G.petalMask(x, y, P, cfg) >= 0;
        if (solid && !run) run = { a: y, b: y }; else if (solid) run.b = y;
        else if (run) { ys.push(run); run = null; } }
      if (run) ys.push(run);
      const widths = ys.map(r => r.b - r.a);
      const widest = widths.length ? Math.max(...widths) : 0;
      at.push({ u: uu, envelopeHalfWidth: env, envelopeFullWidth: 2*env,
                lobeIntervals: widths.length, widestLobeWidth: widest,
                ratio: widest > 1e-9 ? (2*env)/widest : null });
    }
    out.widthRatios = at;
  }

  // ---- (3) THE CELLS ----
  const mkRng = (s) => { let t = s >>> 0; return () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
  const vor = G.buildVoronoi(P, mkRng(12345), {
    density: P.density, softness: P.softness, lloyd: P.voronoiLloyd,
    anisotropy: P.voronoiAniso, cellDensityLaw: P.voronoiDensityLaw,
    weightHierarchy: P.voronoiWeight, weightFalloff: P.voronoiWeightFalloff,
    slabTaper: P.voronoiSlabTaper, minCellSize: 0 });
  out.cellCount = vor.slabs.length;
  let cellsWithVoid = 0, cellsMostlyVoid = 0, totalVoidFrac = 0, worst = 0, straddling = 0;
  let cellsPerimCrossingVoid = 0, totalPerimVoid = 0;
  const xFloor = cfg ? cfg.uFloor * P.L : Infinity;
  for (const sl of vor.slabs) {
    const poly = sl.outer;
    const v = voidFraction(poly, 26);
    if (v.inside < 8) continue;
    totalVoidFrac += v.frac;
    if (v.frac > 0.02) cellsWithVoid++;
    if (v.frac > 0.25) cellsMostlyVoid++;
    if (v.frac > worst) worst = v.frac;
    const pv = perimeterVoid(poly);
    if (pv > 0.02) cellsPerimCrossingVoid++;
    totalPerimVoid += pv;
    if (cfg) {
      const b = bbox(poly);
      for (const c of cfg.centers) {
        if (b.y0 < c && b.y1 > c && b.x1 > xFloor) {
          let lo = false, hi = false;
          for (let i = 0; i < 24; i++) for (let j = 0; j < 24; j++) {
            const x = b.x0 + (b.x1-b.x0)*(i+0.5)/24, y = b.y0 + (b.y1-b.y0)*(j+0.5)/24;
            if (x < xFloor) continue;
            if (!inPoly(x, y, poly)) continue;
            if (G.petalMask(x, y, P, cfg) < 0) continue;
            if (y < c) lo = true; else hi = true;
          }
          if (lo && hi) { straddling++; break; }
        }
      }
    }
  }
  out.cellsWithVoid = cellsWithVoid;
  out.cellsMostlyVoid = cellsMostlyVoid;
  out.meanCellVoidFrac = vor.slabs.length ? totalVoidFrac / vor.slabs.length : 0;
  out.worstCellVoidFrac = worst;
  out.cellsStraddlingASinus = straddling;
  out.cellsPerimCrossingVoid = cellsPerimCrossingVoid;
  out.meanCellPerimeterInVoid = vor.slabs.length ? totalPerimVoid / vor.slabs.length : 0;
  out.areaPerCell = vor.slabs.length ? out.materialArea / vor.slabs.length : null;
  out.areaPerCellMM2 = out.areaPerCell != null ? out.areaPerCell * MM * MM : null;

  // ---- (4) IS THE HALF-PLANE CLIPPER VALID ON A RE-ENTRANT SUBJECT? ----
  // The recommendation turns on this: if the clip polygon were simply swapped for the
  // true cleft contour, buildVoronoi would be handing a CONCAVE subject to a
  // Sutherland-Hodgman clipper. Measure it rather than assert it: clip the true contour
  // by a half-plane cutting across a sinus and ask how much of the result is void.
  if (cfg) {
    const SH = (poly, a, b, c) => { const o = []; const n = poly.length;
      for (let i = 0; i < n; i++) { const p = poly[i], q = poly[(i+1)%n];
        const dp = a*p.x + b*p.y + c, dq = a*q.x + b*q.y + c;
        if (dp <= 0) o.push(p);
        if ((dp < 0) !== (dq < 0)) { const t = dp/(dp-dq); o.push({ x: p.x + (q.x-p.x)*t, y: p.y + (q.y-p.y)*t }); } }
      return o; };
    const contour = G.buildSilhouette(P, 160);
    // a bisector-like cut: keep the basal side of a line at x = 0.8L (crosses every sinus)
    const cut = SH(contour, 1, 0, -0.80 * P.L);
    out.shConcave = { subjectVerts: contour.length, resultVerts: cut.length,
                      resultArea: area(cut), resultVoid: voidFraction(cut, 200).frac };
    // The case that actually matters: a SEQUENCE of half-planes whose kept region is
    // DISCONNECTED (two lobe fragments, sinus between, base cut away) — which is what a
    // Voronoi cell is, an intersection of many half-planes. SH cannot represent two
    // components; it emits one ring with a bridge across the void.
    let seq = contour;
    seq = SH(seq, -1, 0, 0.72 * P.L);        // keep x >= 0.72L (cuts the base away)
    seq = SH(seq, 0, 1, -0.45 * cfg.Wpeak);  // keep y <= 0.45*Wpeak
    seq = SH(seq, 0, -1, -0.45 * cfg.Wpeak); // keep y >= -0.45*Wpeak
    out.shDisconnected = seq.length >= 3
      ? { resultVerts: seq.length, resultArea: area(seq), resultVoid: voidFraction(seq, 240).frac,
          resultPerimeterInVoid: perimeterVoid(seq) }
      : { resultVerts: seq.length, collapsed: true };
    out.shConcave.resultPerimeterInVoid = perimeterVoid(cut);
    // control: the same cut on the SMOOTH envelope (convex-ish, SH is valid there)
    const env = G.ribMarginPolyline(P, 160);
    const cutE = SH(env, 1, 0, -0.80 * P.L);
    out.shConvexControl = { resultVerts: cutE.length, resultArea: area(cutE) };
  }
  return out;
};
window.__diagReady = true;
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
    if (abs.endsWith('flower.js')) res.end(buf.toString('utf8') + '\n' + HOOK); else res.end(buf);
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
await page.waitForFunction('window.__diagReady === true', { timeout:30000 });
await page.evaluate(() => { const t = document.getElementById('advancedToggle'); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event('change',{bubbles:true})); } });
await page.waitForTimeout(250);

const LOBED = { width:0.95, taper:0.35, clawLength:0, clawWidth:0.3, shoulder:0.55,
                cleftDepth:0.55, cleftLobes:2, cleftWidth:0.3, tip:0.85, curlAmount:0.4,
                edgeCurve:0.05, edgeProfile:0, petalCup:0.1 };
const ROUNDED = { width:0.9, taper:0.35, clawLength:0, clawWidth:0.3, shoulder:0.5,
                  cleftDepth:0, cleftLobes:2, cleftWidth:0.3, tip:0.5, curlAmount:0.4,
                  edgeCurve:0, edgeProfile:0, petalCup:0 };

const CONFIGS = [
  { name:'ROUNDED + voronoi (control)', ui:{ ...ROUNDED, infillType:'voronoi' } },
  { name:'LOBED + voronoi (shipped)',   ui:{ ...LOBED,   infillType:'voronoi' } },
  { name:'LOBED lobes=4 + voronoi',     ui:{ ...LOBED, cleftLobes:4, infillType:'voronoi' } },
  { name:'LOBED lobes=4, law=1',        ui:{ ...LOBED, cleftLobes:4, infillType:'voronoi', voronoiDensityLaw:1 } },
  { name:'LOBED lobes=4, aniso=4',      ui:{ ...LOBED, cleftLobes:4, infillType:'voronoi', voronoiAniso:4 } },
  { name:'LOBED l=4, law=1 aniso=4 lloyd=8', ui:{ ...LOBED, cleftLobes:4, infillType:'voronoi', voronoiDensityLaw:1, voronoiAniso:4, voronoiLloyd:8 } },
  { name:'LOBED lobes=7, density=12',   ui:{ ...LOBED, cleftLobes:7, infillType:'voronoi', density:12 } },
];

const RESET = { cleftDepth:0, cleftLobes:2, cleftWidth:0.3, voronoiDensityLaw:0, voronoiAniso:1, voronoiLloyd:0, density:7 };
const results = [];
for (const c of CONFIGS) {
  const bad = await page.evaluate((u) => window.__diagSet(u), { ...RESET, ...c.ui });
  if (bad.length) { console.error('CONFIG DID NOT TAKE:', c.name, bad.join('; ')); process.exitCode = 1; continue; }
  const r = await page.evaluate(() => window.__diag());
  results.push({ name: c.name, ...r });
  console.error('measured', c.name);
}
await browser.close(); server.close();
console.log(JSON.stringify(results, null, 1));
