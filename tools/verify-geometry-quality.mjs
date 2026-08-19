/* ===================================================================
   verify-geometry-quality.mjs — geometry-CORRECTNESS gate, alongside the watertight
   export gate. The export gate only proves manifoldness (boundaryEdges=0); a petal can
   be perfectly watertight and still be the WRONG SHAPE — the Lobed cleft is the standing
   example: with continuous margin ON its rim is drawn by two un-clefted marginal strands
   that skip the sinus, so the printed solid is a smooth shield with a decorative interior
   slit, not a bifid petal. That passes the export gate. These three checks catch it,
   measuring the geometry the renderer actually builds, per petal, in flattened 2-D space:

     1. MARGIN FIDELITY / CLOSURE — every point of the true material boundary past the
        neck must be traced by the RENDERED margin (marginStrands when continuous margin
        is on, the cleft-aware contour when off). The max gap is the unsealed-sinus depth
        in mm; a fragmented contour (2+ loops) also fails. THIS is the check that sees the
        Lobed defect (gap ~= the cleft depth) that manifoldness misses.
     2. CONTOUR SMOOTHNESS — turn angle and turn-per-mm (curvature) around the material
        contour. Curvature is sampling-invariant (the cleft contour is sampled far finer
        than the analytic loop), so it, not the raw angle, is gated. Catches a coarse /
        stair-stepped contour. Reports max + p95 of both.
     3. UNCAPPED FREE ENDS — degree-1 nodes (via the same buildRibGraph the terminator
        uses) that land neither on the material boundary nor at the petal foot. Gated for
        the STRUCTURED infills (veins/bone/strands) that are meant to cap onto the margin;
        space-colonization's growth-frontier tips and Voronoi's closed slab rings are
        exempt (bead-capped and watertight by design, not trees hung off the margin).

   Browser-based (like verify-flower-export): serves flower.js with an appended hook that
   calls the real resolveParams + exported geometry fns (reaching the two exports flower.js
   does not import — buildRibGraph, getCleftContour — via a dynamic import), so it measures
   exactly what the renderer uses. Cleft-on-continuous-margin configs are a KNOWN, tracked
   failure (#64): they are marked xfail so the table shows their real numbers without
   breaking the build; the gate is hard for every shipping (non-cleft) config. Usage:
     node tools/verify-geometry-quality.mjs               # 5 shapes x 5 patterns gate
     node tools/verify-geometry-quality.mjs --report-only # never exit non-zero (just report)
     node tools/verify-geometry-quality.mjs --sweep       # cleftDepth sweep (Lobed), report-only
     GQ_MARGIN_OFF=1 node tools/verify-geometry-quality.mjs   # prove the gate: cleft-aware rim => gap 0
     GQ_JSON=out.json node tools/verify-geometry-quality.mjs  # also dump per-config rows
   Exits non-zero only on a NON-xfail failure (unless --report-only / --sweep).
   =================================================================== */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_DIR = path.join(ROOT, 'node_modules', 'three');
const argv = process.argv.slice(2);
const SWEEP = argv.includes('--sweep');
const REPORT_ONLY = argv.includes('--report-only') || SWEEP;

// Thresholds. Calibrated (below) from the smooth-shape baseline vs the broken cleft:
//   marginGapMM  — the rendered rim must trace the material boundary; a skipped sinus
//                  shows as a multi-mm gap. p95Curv — a stair-stepped contour spikes the
//                  per-mm turn rate. freeEnds — every infill tip caps onto the boundary.
const T = { marginGapMM: 1.5, p95CurvDegMM: 40, freeEnds: 3 };
// The connectivity check applies only to the STRUCTURED infills that are meant to cap
// onto the margin. Space-colonization's free tips are its growth frontier (bead-capped
// and watertight per the export gate), and Voronoi is closed slab rings — neither is a
// tree hung off the margin, so a degree-1 tip there is by design, not an uncapped end.
const ENDS_INFILLS = new Set(['veins', 'bone', 'strands']);

// The five silhouette bundles (mirror flower.js SHAPES).
const SHAPES = {
  rounded: { width: 0.9, taper: 0.35, clawLength: 0, clawWidth: 0.3, shoulder: 0.5, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.5, centerCurve: 0.4, edgeCurve: 0, edgeProfile: 0, petalCup: 0 },
  pointed: { width: 0.7, taper: 0.5, clawLength: 0, clawWidth: 0.3, shoulder: 0.4, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.15, centerCurve: 0.3, edgeCurve: -0.1, edgeProfile: 0, petalCup: 0 },
  strap: { width: 0.45, taper: 0.5, clawLength: 0, clawWidth: 0.3, shoulder: 0.3, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.3, centerCurve: 0.15, edgeCurve: 0, edgeProfile: 0, petalCup: 0.05 },
  clawed: { width: 1.0, taper: 0.3, clawLength: 0.35, clawWidth: 0.25, shoulder: 0.55, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.6, centerCurve: 0.35, edgeCurve: 0.05, edgeProfile: 0, petalCup: 0.15 },
  lobed: { width: 0.95, taper: 0.35, clawLength: 0, clawWidth: 0.3, shoulder: 0.55, cleftDepth: 0.45, cleftLobes: 2, cleftWidth: 0.3, tip: 0.5, centerCurve: 0.4, edgeCurve: 0.05, edgeProfile: 0, petalCup: 0.1 },
};
const PATTERNS = ['veins', 'voronoi', 'strands', 'bone', 'spacecol'];

// Config list. Cleft petals (Lobed) render their sinus correctly ONLY when the rim is
// cleft-aware — i.e. continuous margin OFF. With it ON (the Standard default) the two
// un-clefted marginal strands skip the sinus entirely, so the shape is manifold-but-wrong.
// That is a KNOWN, tracked defect (#64), so cleft-on-continuous-margin configs are marked
// xfail: they still appear in the table with their real numbers, but a known failure does
// not break the build. When #64 makes the strands cleft-aware, drop the marker and the
// gate goes hard. A cleft config that UNEXPECTEDLY passes (xpass) is surfaced too.
const CLEFT_XFAIL = !process.env.GQ_MARGIN_OFF;   // margin-off routes through the good path
const CONFIGS = [];
if (SWEEP) {
  for (const depth of [0.10, 0.15, 0.20, 0.25, 0.30, 0.35]) {
    for (const pat of PATTERNS) {
      CONFIGS.push({ name: `d${depth.toFixed(2)}__${pat}`, ui: { ...SHAPES.lobed, cleftDepth: depth, cleftLobes: 2, infillType: pat }, xfail: CLEFT_XFAIL, ref: '#64' });
    }
  }
} else {
  for (const shape of Object.keys(SHAPES)) for (const pat of PATTERNS) {
    const cleft = (SHAPES[shape].cleftDepth || 0) > 0;
    CONFIGS.push({ name: `${shape}__${pat}`, ui: { ...SHAPES[shape], infillType: pat }, xfail: cleft && CLEFT_XFAIL, ref: cleft ? '#64' : undefined });
  }
}
// Credibility check: GQ_MARGIN_OFF flips continuous margin off on every config, routing
// the rim through the cleft-aware contour. The fidelity gap must then collapse to ~0 —
// proof the gate measures the RENDERED margin, not merely the presence of a cleft.
if (process.env.GQ_MARGIN_OFF) for (const c of CONFIGS) c.ui.continuousMargin = 'off';

// ---- the geometry-quality hook, appended to the served flower.js (module scope, so it
//      shares resolveParams / readUI / inputs / the imported geometry fns). Exports
//      flower.js does NOT import (buildRibGraph, getCleftContour) are reached through a
//      dynamic import of the geometry module (same relative specifier flower.js uses). --
const GQ_HOOK = `
const MM = 26;   // MM_PER_UNIT — report gaps in mm, the unit that matters for print.
window.__gqSet = function(obj) {
  for (const k in obj) { const el = inputs[k]; if (!el) continue; if (el.type === 'checkbox') el.checked = !!obj[k]; else el.value = obj[k]; }
};
window.__gqGeom = null;
// point -> distance to the nearest segment across a set of polylines [{points:[...]}...]
function __gqDistToSegs(p, polys) {
  let best = Infinity;
  for (const pl of polys) { const pts = pl.points || pl; for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
    let t = L2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = a.x + t * dx, qy = a.y + t * dy, d = Math.hypot(p.x - qx, p.y - qy);
    if (d < best) best = d;
  } }
  return best;
}
window.__gq = async function() {
  const G = window.__gqGeom || (window.__gqGeom = await import('./flower-geometry.js'));
  const ui = readUI();
  const P = resolveParams(ui);
  const cfg = cleftConfig(P);
  const seed = 12345;

  // MATERIAL BOUNDARY — the true cleft-aware outline of the printed material (closed
  // ring). buildSilhouette resolves clefts via the marching-squares contour.
  const material = buildSilhouette(P, P.outlineSteps || 56);
  if (!material || material.length < 3) return { error: 'empty-silhouette' };
  const n = material.length;
  const matRing = [{ points: material.concat([material[0]]) }];   // closed for seg distance

  // RENDERED MARGIN — the polyline(s) the renderer actually traces the rim from. This is
  // the crux: with continuous margin ON (the Standard default) the margin is TWO strands
  // on +/- petalHalfWidth(u) that do NOT know about the cleft; with it OFF the rim is the
  // cleft-aware contour. Measuring against THIS (not the material contour) is what makes
  // the gate see the real defect instead of the manifold-but-wrong shape.
  const contMargin = !!P.continuousMargin && !P.solidBlade;
  let rendered;
  if (contMargin) rendered = marginStrands(P, P.bundleTightness, P.flareRate);   // [{points,side}...]
  else rendered = matRing;                                                        // drawRim traces the contour

  // (3) MARGIN FIDELITY / CLOSURE — every point of the material boundary past the neck
  //     (x > 0.4L, i.e. the blade, clear of the tulip-neck flare that legitimately leaves
  //     the outline near the foot) must be traced by the rendered margin. The max gap is
  //     the unsealed-sinus depth: ~0 when the rim is cleft-aware, ~the cleft depth when
  //     the un-clefted strands skip it. Also flag a contour that fragments into 2+ loops.
  let numLoops = 1;
  if (cfg) { const cc = G.getCleftContour(P); numLoops = (cc && cc.loops) ? cc.loops.length : 0; }
  let marginGap = 0;
  for (const p of material) { if (p.x <= 0.4 * P.L) continue; const d = __gqDistToSegs(p, rendered); if (d > marginGap) marginGap = d; }
  const marginGapMM = marginGap * MM;
  const marginClosed = numLoops === 1;

  // (1) CONTOUR SMOOTHNESS — turn angle AND turn-per-mm (curvature) at each vertex of the
  //     material ring. Raw turn angle is sampling-dependent (the cleft contour is sampled
  //     far finer than the analytic loop), so curvature = turn / segment-length-mm is the
  //     comparable measure: a stair-step is a big turn over a tiny grid segment -> huge
  //     curvature; a smooth arc stays bounded; a single sharp tip shows in max, not p95.
  const turns = [], curv = [];
  for (let i = 0; i < n; i++) {
    const a = material[(i - 1 + n) % n], b = material[i], c = material[(i + 1) % n];
    const v1x = b.x - a.x, v1y = b.y - a.y, v2x = c.x - b.x, v2y = c.y - b.y;
    const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y); if (l1 < 1e-9 || l2 < 1e-9) continue;
    let cs = (v1x * v2x + v1y * v2y) / (l1 * l2); cs = cs < -1 ? -1 : cs > 1 ? 1 : cs;
    const t = Math.acos(cs) * 180 / Math.PI;
    turns.push(t); curv.push(t / (0.5 * (l1 + l2) * MM));
  }
  const pct = (arr, q) => { const s = arr.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; };
  const maxTurn = turns.length ? Math.max(...turns) : 0;
  const p95Turn = pct(turns, 0.95);
  const maxCurv = curv.length ? Math.max(...curv) : 0;
  const p95Curv = pct(curv, 0.95);

  // (2) UNCAPPED FREE ENDS — build the infill exactly as the render does (dispatch -> clip
  //     to the cleft mask -> terminate onto the contour), then count DEGREE-1 nodes with
  //     the SAME buildRibGraph the terminator uses. A degree-1 node that lands neither on
  //     the material boundary (where caps go) nor at the petal foot is an uncapped end.
  //     Voronoi is slab rings already clipped to the silhouette, so it does not apply.
  let veins = [], applies = P.infillType !== 'voronoi';
  if (applies) {
    const rng = mulberry32(seed);
    try {
      if (P.infillType === 'strands') veins = (buildStrands(P, { count: P.strandCount, width: P.strandWidth, taper: P.strandTaper, curvature: P.strandCurvature, irregularity: P.strandIrregularity, seed }).veins) || [];
      else if (P.infillType === 'bone') veins = (buildBone(P, { count: P.boneCount, width: P.boneWidth, curve: P.boneCurve, spread: P.boneSpread }).veins) || [];
      else if (P.infillType === 'spacecol') veins = (getSpaceColonization(P, spaceColSeed(P, seed), { mode: P.spaceMode, sourceCount: Math.min(P.spaceSourceCount, SPACECOL_LIVE_CAP), birthDist: P.spaceBirth, killDist: P.spaceKill, growthStep: P.spaceStep, seedPattern: P.spacePattern }).veins) || [];
      else veins = (buildVenation(P, rng, { secondaries: P.secondaries, crossPerStrip: P.crossPerStrip, maxDepth: P.maxDepth, softness: P.softness, branchStart: P.branchStart, continuousMargin: P.continuousMargin }).veins) || [];
    } catch (e) { return { error: 'infill:' + e.message }; }
    if (cfg && veins.length) { try { veins = clipVeinsToMask(veins, P, cfg) || veins; } catch (e) {} }
    if ((P.infillType === 'veins' || P.infillType === 'bone' || P.infillType === 'spacecol') && P.edgeTermination && P.edgeTermination !== 'fade') {
      try { const term = terminateEdges(veins, material, P, P.edgeTermination, P.captureDist); for (const v of term.veins) veins.push(v); } catch (e) {}
    }
  }
  let degree1 = 0, onMargin = 0, atBase = 0, freeEnds = 0;
  if (applies && veins.length) {
    const g = G.buildRibGraph(veins);
    const eps = Math.max(P.L * 0.02, 0.1);   // ~ the rib weld radius
    for (const nd of g.nodes) {
      if (nd.deg !== 1) continue;
      degree1++;
      if (__gqDistToSegs(nd, matRing) < eps) { onMargin++; continue; }
      if (nd.x < eps) { atBase++; continue; }   // rooted at the petal foot (u = 0)
      freeEnds++;
    }
  }

  return { infill: P.infillType, cleftDepth: +(P.cleftDepth || 0).toFixed(2), contMargin, numLoops, marginClosed,
           marginGapMM: +marginGapMM.toFixed(2),
           maxTurnDeg: +maxTurn.toFixed(1), p95TurnDeg: +p95Turn.toFixed(1),
           maxCurvDegMM: +maxCurv.toFixed(1), p95CurvDegMM: +p95Curv.toFixed(1),
           degree1, onMargin, atBase, freeEnds, marginPts: n, L: +P.L.toFixed(3) };
};
window.__gqReady = true;
`;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/flower.html';
  const abs = path.join(ROOT, u);
  if (!abs.startsWith(ROOT)) { res.writeHead(403); return res.end('no'); }
  fs.readFile(abs, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream' });
    if (abs.endsWith('flower.js')) res.end(buf.toString('utf8') + '\n' + GQ_HOOK); else res.end(buf);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const THREE_VERSION = '0.161.0';
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  for (const d of fs.readdirSync(base)) if (d.startsWith('chromium-') && !d.includes('headless')) {
    const p = path.join(base, d, 'chrome-linux', 'chrome'); if (fs.existsSync(p)) return p;
  }
  return undefined;
}
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.route('**/cdn.jsdelivr.net/**', (route) => {
  const m = route.request().url().match(new RegExp('three@' + THREE_VERSION.replace(/\./g, '\\.') + '/(.*)$'));
  if (!m) return route.continue();
  try { return route.fulfill({ status: 200, headers: { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(path.join(THREE_DIR, m[1])) }); }
  catch { return route.fulfill({ status: 404, body: 'nf' }); }
});
await page.goto(`http://127.0.0.1:${port}/flower.html`, { waitUntil: 'load', timeout: 30000 });
await page.waitForFunction('window.__gqReady === true', { timeout: 30000 });
await page.waitForTimeout(300);

const rows = [];
let fails = 0, xfails = 0, xpasses = 0;
console.log(`config`.padEnd(20), 'gapMM'.padStart(7), 'p95Curv'.padStart(8), 'maxTurn'.padStart(8), 'loops'.padStart(6), 'free'.padStart(5), '  verdict');
for (const cfg of CONFIGS) {
  await page.evaluate((ui) => window.__gqSet(ui), cfg.ui);
  const q = await page.evaluate(() => window.__gq());
  if (q.error) { console.log(cfg.name.padEnd(20), 'ERROR', q.error); rows.push({ name: cfg.name, error: q.error }); fails++; continue; }
  const badFidelity = q.marginGapMM > T.marginGapMM || !q.marginClosed;
  const badSmooth = q.p95CurvDegMM > T.p95CurvDegMM;
  const badEnds = ENDS_INFILLS.has(q.infill) && q.freeEnds > T.freeEnds;
  const bad = badFidelity || badSmooth || badEnds;
  const reasons = [badFidelity ? 'fidelity' : '', badSmooth ? 'smooth' : '', badEnds ? 'ends' : ''].filter(Boolean).join(',');
  let verdict;
  if (bad && cfg.xfail) { verdict = `xfail(${cfg.ref}:${reasons})`; xfails++; }         // known, tracked — not a build failure
  else if (!bad && cfg.xfail) { verdict = `XPASS(${cfg.ref}?)`; xpasses++; }             // known bug appears fixed — retire the marker
  else if (bad) { verdict = `FAIL(${reasons})`; fails++; }                               // real regression — breaks the build
  else verdict = 'ok';
  rows.push({ name: cfg.name, xfail: !!cfg.xfail, ...q, verdict });
  console.log(cfg.name.padEnd(20), String(q.marginGapMM).padStart(7), String(q.p95CurvDegMM).padStart(8), String(q.maxTurnDeg).padStart(8), String(q.numLoops).padStart(6), String(q.freeEnds).padStart(5), '  ' + verdict);
}
if (process.env.GQ_JSON) fs.writeFileSync(process.env.GQ_JSON, JSON.stringify(rows, null, 1));
const okCount = CONFIGS.length - fails - xfails - xpasses;
console.log(`\n${okCount} ok, ${xfails} xfail(#64), ${xpasses} xpass, ${fails} FAIL / ${CONFIGS.length}. thresholds: marginGap<=${T.marginGapMM}mm p95Curv<=${T.p95CurvDegMM}deg/mm freeEnds<=${T.freeEnds} marginClosed=true`);
if (xpasses) console.log(`note: ${xpasses} xpass config(s) now pass — the tracked bug may be fixed; drop the xfail marker.`);
await browser.close(); server.close();
process.exit(REPORT_ONLY ? 0 : (fails ? 1 : 0));
