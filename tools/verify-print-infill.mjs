// Gate for the authored infill (print-infill.js) — cross-hatch and line-flow
// inside a solid's 2D silhouette.
//
// It runs in TWO halves, on purpose, because the two claims are different
// kinds of claim.
//
// PART ONE — the clipper, as pure functions, in Node, on shapes whose answer
// is known by construction. The load-bearing claim of this stage is "the marks
// land inside the outline, concave regions included, and nothing assumes
// convexity". On the real bloom that claim is untestable in the strong sense:
// its silhouette is nineteen thousand edges of a fused solid, so a wrong
// clipper still produces a plausible picture and there is nothing to compare
// against. So the clipper is driven directly over hand-built outlines whose
// correct spans can be written down: a C, a five-point star, a serrated leaf,
// and a fold-over that puts a second loop INSIDE the first. Those shapes are
// where the concavity and the winding rule are actually proved.
//
// PART TWO — the stage in the real page, in a real browser, on the shipped
// bundle. Every claim here is measured against the EMITTED SEGMENT
// COORDINATES that the page hands back in pixels, never against a screenshot:
// "no ink outside the silhouette" is a statement about coordinates, and a
// screenshot can only ever answer it to within an anti-aliased edge.
//
// --negative-control breaks one thing on purpose and requires this run to
// fail, so a pass from a changed harness means something.
//
// Dev-only deps, not in package.json (same convention as the other gates):
//   npm i --no-save playwright-core three@0.161.0

import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  scanSpans, clipSpans, subtractSpans, insideWinding, ScanIndex,
  toneAt, toneRadius, hash01, LAYER_THRESHOLDS, HATCH_OFFSETS_DEG,
} from '../print-infill.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const NEG = args.includes('--negative-control');
const SHOTS = (() => { const i = args.indexOf('--shots'); return i >= 0 ? args[i + 1] : null; })();
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const checks = new Map();
const details = new Map();
const check = (name, ok, detail = '') => {
  checks.set(name, !!ok); details.set(name, detail);
  console.log(`  [${ok ? 'ok  ' : 'FAIL'}] ${name}${detail ? '  ' + detail : ''}`);
  return !!ok;
};

// ===========================================================================
// PART ONE — the clipper on outlines whose answer is known by construction.

// Build a PartFrame-shaped object from closed rings of [x,y] points. A ring
// given clockwise and one given counter-clockwise wind opposite ways, which is
// exactly how a hole is expressed — and is what separates nonzero from
// even-odd below.
function frameFromRings(rings) {
  const xs = [], ys = [], xe = [], ye = [];
  for (const r of rings) {
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length];
      xs.push(a[0]); ys.push(a[1]); xe.push(b[0]); ye.push(b[1]);
    }
  }
  const all = rings.flat();
  return {
    x0: Float32Array.from(xs), y0: Float32Array.from(ys),
    x1: Float32Array.from(xe), y1: Float32Array.from(ye),
    n: xs.length, ok: xs.length >= 3,
    minX: Math.min(...all.map(p => p[0])), maxX: Math.max(...all.map(p => p[0])),
    minY: Math.min(...all.map(p => p[1])), maxY: Math.max(...all.map(p => p[1])),
    ax: 0, ay: 0, reach: 1, depth: 0,
  };
}

const near = (a, b, tol = 1e-4) => Math.abs(a - b) <= tol;
const spansNear = (got, want, tol = 1e-3) =>
  got.length === want.length && got.every((v, i) => near(v, want[i], tol));

console.log('\n--- part one: the clipper, on outlines with known answers ---');

// A SQUARE. The sanity floor: one span, the full width.
{
  const f = frameFromRings([[[0, 0], [100, 0], [100, 100], [0, 100]]]);
  const s = scanSpans(f, 1, 0, 50);      // horizontal line at y = 50
  check('clip/square-one-span', spansNear(s, [0, 100]), JSON.stringify(s));
}

// A "C". A horizontal line through the mouth must come back as TWO spans with
// a real gap — the single fact that separates a clipper from a bounding box.
{
  const C = [[0, 0], [100, 0], [100, 30], [40, 30], [40, 70], [100, 70],
             [100, 100], [0, 100]];
  const f = frameFromRings([C]);
  const mouth = scanSpans(f, 1, 0, 50);
  const solid = scanSpans(f, 1, 0, 15);
  check('clip/concave-C-splits', spansNear(mouth, [0, 40]) && spansNear(solid, [0, 100]),
    `mouth ${JSON.stringify(mouth)} solid ${JSON.stringify(solid)}`);
  // and a point in the mouth is OUTSIDE, by the same rule the spans used
  check('clip/concave-C-point-outside',
    insideWinding(f, 70, 50) === false && insideWinding(f, 20, 50) === true,
    'the notch is not inside');
}

// A FIVE-POINT STAR. Deep concavity in both axes, and a row that crosses six
// boundaries — three disjoint spans.
{
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const r = i % 2 ? 40 : 100;
    pts.push([200 + r * Math.cos(a), 200 + r * Math.sin(a)]);
  }
  const f = frameFromRings([pts]);
  let maxSpans = 0;
  for (let y = 110; y < 300; y += 1) maxSpans = Math.max(maxSpans, scanSpans(f, 1, 0, y).length / 2);
  check('clip/star-splits-between-the-legs', maxSpans >= 2, `up to ${maxSpans} disjoint spans on one row`);
  // every span endpoint is ON the outline: stepping just inside is inside,
  // just outside is outside
  let endpointsClean = true;
  for (let y = 120; y < 290; y += 7) {
    for (const s of chunk(scanSpans(f, 1, 0, y))) {
      if (!insideWinding(f, s[0] + 0.05, y) || !insideWinding(f, s[1] - 0.05, y)) endpointsClean = false;
      if (insideWinding(f, s[0] - 0.05, y) && insideWinding(f, s[1] + 0.05, y)) endpointsClean = false;
    }
  }
  check('clip/star-endpoints-on-the-outline', endpointsClean);
}

// A COMB — four teeth, so a single row crosses eight boundaries and comes back
// as FOUR disjoint spans. The star only ever splits in two; this is the shape
// that shows the scanline is general rather than lucky.
{
  // one ring: across the top, then down and back up each tooth
  const ring = [[0, 0], [200, 0], [200, 200], [180, 200], [180, 60], [155, 60],
                [155, 200], [135, 200], [135, 60], [110, 60], [110, 200],
                [90, 200], [90, 60], [65, 60], [65, 200], [45, 200], [45, 60],
                [20, 60], [20, 200], [0, 200]];
  const f = frameFromRings([ring]);
  const row = scanSpans(f, 1, 0, 150);
  check('clip/comb-five-spans', row.length / 2 === 5,
    `${row.length / 2} spans: ${JSON.stringify(row.map(v => +v.toFixed(1)))}`);
  let allIn = true;
  for (const sp of chunk(row)) if (!insideWinding(f, (sp[0] + sp[1]) / 2, 150)) allIn = false;
  check('clip/comb-spans-are-inside', allIn);
}

// A SERRATED LEAF. The shape this stage is actually for, and the one whose
// margin a convex clipper would smooth away without any other symptom.
{
  const leaf = [];
  const teeth = 9;
  for (let i = 0; i <= teeth * 2; i++) {           // upper margin, toothed
    const t = i / (teeth * 2);
    const x = 20 + t * 260;
    const w = Math.sin(t * Math.PI) * 60;
    leaf.push([x, 150 - w + (i % 2 ? 14 : 0)]);
  }
  for (let i = teeth * 2; i >= 0; i--) {          // lower margin, toothed
    const t = i / (teeth * 2);
    const x = 20 + t * 260;
    const w = Math.sin(t * Math.PI) * 60;
    leaf.push([x, 150 + w - (i % 2 ? 14 : 0)]);
  }
  const f = frameFromRings([leaf]);
  let anyMulti = false, allInside = true;
  for (let y = 100; y < 200; y += 2) {
    const sp = scanSpans(f, 1, 0, y);
    if (sp.length > 2) anyMulti = true;
    for (const s of chunk(sp)) {
      const mid = (s[0] + s[1]) / 2;
      if (!insideWinding(f, mid, y)) allInside = false;
    }
  }
  check('clip/leaf-serrations-survive', anyMulti, 'a toothed margin produces >1 span on some rows');
  check('clip/leaf-spans-are-inside', allInside);
}

// A FOLD-OVER: a second loop INSIDE the first, wound the SAME way. This is a
// petal folding across itself, and it is where nonzero and even-odd part
// company — even-odd would call the overlap a hole.
{
  const outer = [[0, 0], [200, 0], [200, 200], [0, 200]];
  const innerSame = [[60, 60], [140, 60], [140, 140], [60, 140]];         // same winding
  const innerOpp = [[60, 60], [60, 140], [140, 140], [140, 60]];          // opposite
  const same = frameFromRings([outer, innerSame]);
  const opp = frameFromRings([outer, innerOpp]);
  check('clip/fold-over-is-not-a-hole',
    insideWinding(same, 100, 100) === true && spansNear(scanSpans(same, 1, 0, 100), [0, 200]),
    `overlap stays filled: ${JSON.stringify(scanSpans(same, 1, 0, 100))}`);
  check('clip/opposite-winding-is-a-hole',
    insideWinding(opp, 100, 100) === false
      && spansNear(scanSpans(opp, 1, 0, 100), [0, 60, 140, 200]),
    `a true hole still cuts: ${JSON.stringify(scanSpans(opp, 1, 0, 100))}`);
}

// ROTATED FRAMES. Hatching is not axis-aligned, so the scanline is run in a
// rotated frame; a clipper that only worked horizontally would pass everything
// above. The same C, hatched at 37 degrees, must still split.
{
  const C = [[0, 0], [100, 0], [100, 30], [40, 30], [40, 70], [100, 70], [100, 100], [0, 100]];
  const f = frameFromRings([C]);
  const a = 37 * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  let split = 0, checked = 0, inside = true;
  for (let v = -60; v < 120; v += 2) {
    const sp = scanSpans(f, ca, sa, v);
    if (sp.length > 2) split++;
    for (const s of chunk(sp)) {
      checked++;
      const u = (s[0] + s[1]) / 2;
      if (!insideWinding(f, u * ca - v * sa, u * sa + v * ca)) inside = false;
    }
  }
  check('clip/rotated-frame-still-splits', split > 0, `${split} rows split at 37°`);
  check('clip/rotated-spans-are-inside', inside && checked > 20, `${checked} spans sampled`);
}

// SPAN SUBTRACTION — how a nearer part occludes a farther one.
{
  check('spans/subtract-middle', spansNear(subtractSpans([0, 100], [40, 60]), [0, 40, 60, 100]));
  check('spans/subtract-whole', subtractSpans([0, 100], [-10, 110]).length === 0);
  check('spans/subtract-none', spansNear(subtractSpans([0, 100], [200, 300]), [0, 100]));
  check('spans/clip-to-interval', spansNear(clipSpans([0, 100], 30, 70), [30, 70]));
}

// THE ROW INDEX — the shared membership rule, and the thing that makes the
// stage affordable. It buckets edges by row so a scanline visits only the ones
// that can reach it, and it MUST agree with the unindexed scan exactly; if it
// did not, cross-hatch and line-flow would disagree about what is inside.
{
  const C = [[0, 0], [100, 0], [100, 30], [40, 30], [40, 70], [100, 70], [100, 100], [0, 100]];
  const f = frameFromRings([C]);
  let agree = true, rows = 0;
  for (const [ca, sa] of [[1, 0], [Math.cos(0.6), Math.sin(0.6)]]) {
    const idx = new ScanIndex(f, ca, sa, 1);
    for (let v = -80; v < 130; v += 1) {
      rows++;
      if (!spansNear(idx.spansAt(v), scanSpans(f, ca, sa, v), 1e-4)) agree = false;
    }
  }
  check('index/agrees-with-the-plain-scan', agree, `${rows} rows, two angles`);
  const idx = new ScanIndex(f, 1, 0, 1);
  check('index/contains-matches-winding',
    idx.contains(20, 50) === true && idx.contains(70, 50) === false
      && idx.contains(70, 15) === true && idx.contains(-5, 50) === false,
    'inside, in the notch, in the solid part, off the shape');
}

// THE TONE FIELD, and the identity the analytic clipping depends on: the
// radius at which the tone equals a threshold must be the radius the hatch
// layer is clipped to, or the picture and the read-out disagree.
{
  let worst = 0;
  for (const gamma of [0.4, 1, 2.2]) {
    for (const t of LAYER_THRESHOLDS) {
      const r = toneRadius(t, 200, gamma);
      worst = Math.max(worst, Math.abs(toneAt(r, 200, gamma) - t));
    }
  }
  check('tone/radius-inverts-tone', worst < 1e-9, `max |tone(toneRadius(t)) - t| = ${worst.toExponential(2)}`);
  check('tone/monotonic',
    toneAt(0, 100, 1) === 1 && toneAt(100, 100, 1) === 0 && toneAt(50, 100, 1) > toneAt(80, 100, 1));
  const hs = Array.from({ length: 500 }, (_, i) => hash01(i));
  check('tone/hash-is-spread',
    Math.min(...hs) < 0.05 && Math.max(...hs) > 0.95
      && Math.abs(hs.reduce((a, b) => a + b, 0) / hs.length - 0.5) < 0.05,
    `mean ${(hs.reduce((a, b) => a + b, 0) / hs.length).toFixed(3)}`);
}

// THE STRUCTURAL CLAIM OF THE WHOLE STAGE: this module never reads the
// surface. Asserted against the SOURCE, because it is a claim about what the
// code is allowed to depend on, and no picture can show it.
{
  const src = readFileSync(path.join(ROOT, 'print-infill.js'), 'utf8');
  const code = src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  // Word-bounded: `faceCanon` (which vertices a face has) is TOPOLOGY and is
  // how the silhouette gets oriented. `faceN`, `faceC`, `edgeDot`, `facing`
  // are the SURFACE — normals, centroids, dihedrals, front/back — and none of
  // them may appear.
  const forbidden = [/\bfaceN\b/, /\bfaceC\b/, /\bedgeDot\b/, /\bfacing\b/,
                     /\bcreaseAngle/, /\bcreaseCos\b/, /\bcomputeVertexNormals\b/];
  const hits = forbidden.filter(t => t.test(code)).map(t => String(t));
  // selKind is read ONLY to keep silhouette edges and drop creases
  const usesCreaseKind = /selKind\s*\[[^\]]*\]\s*===\s*2/.test(code);
  check('infill/reads-no-surface', hits.length === 0 && !usesCreaseKind,
    hits.length ? `references ${hits.join(', ')}` : 'no normals, no dihedrals, no creases, no light');
}

function chunk(flat) {
  const out = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push([flat[i], flat[i + 1]]);
  return out;
}

// ===========================================================================
// PART TWO — the stage in the real page.

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/print') p = '/print.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f)) { r.writeHead(404); return r.end('nf'); }
  let body = readFileSync(f);
  // --negative-control: break the clip so a hatch line runs to the silhouette's
  // BOUNDING BOX instead of its outline. The picture stays a plausible hatched
  // flower; only the coordinate checks can see it.
  if (NEG && p === '/print-infill.js') {
    // Make every row report one span covering everything. Both families read
    // membership through this, so the page then hatches the silhouette's
    // BOUNDING BOX while still looking like a plausibly shaded flower — the
    // failure only the coordinate checks can see.
    const before = body.toString('utf8');
    const s = before.replace(
      '    if (!cand || cand.length < 2) return [];',
      '    return [-1e4, 1e4];');
    if (s === before) { console.error('negative control did not apply'); process.exit(2); }
    body = Buffer.from(s, 'utf8');
  }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  r.end(body);
});
await new Promise(r => server.listen(0, r));
const PORT = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.PRINT_CHROME || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.161.0/**', route => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  const f = path.join(ROOT, 'node_modules/three', rel);
  if (!existsSync(f)) return route.fulfill({ status: 404, body: 'nf' });
  route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8') });
});
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));

const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
const call = (fn, ...a) => page.evaluate(fn, ...a);
const settle = () => page.waitForTimeout(700);

console.log('\n--- part two: the stage in the page ---');
await page.goto(`http://127.0.0.1:${PORT}/print`);
await page.waitForFunction(() => window.__printScaffold && window.__printScaffold.ready, { timeout: 40000 });
await settle();

check('page/infill-hook', await call(() => !!window.__printInfill));
check('page/panel-present', !(await page.locator('#print-infill').isHidden()));
check('page/off-by-default', (await call(() => window.__printInfill.mode())) === 'off',
  'shading is opt-in — the stage never changes what a bundle looks like on load');

// Quieten the outline so the infill is separable from the line work.
await call(() => { window.__printLineArt.setDetailWidget(12); window.__printLineArt.setWeightWidget(1.2); });
await settle();

check('mode/off-emits-nothing',
  (await call(() => window.__printInfill.stats())) === null
    && (await call(() => window.__printInfill.segments(0))).length === 0);

// The claim, on the real bundle: EVERY emitted endpoint is inside the part's
// own silhouette, by the same winding rule the clipper used.
const outsideReport = async (mode) => {
  await call(m => window.__printInfill.setMode(m), mode);
  await settle();
  const parts = await call(() => window.__printInfill.partCount());
  let total = 0, outside = 0, worst = 0, names = [];
  for (let i = 0; i < parts; i++) {
    // ONE evaluate. The page re-extracts every frame, so reading the outline
    // and the ink in two calls compares a silhouette from one frame against
    // segments from another — which reports failures the clipper never made.
    const snap = await call(k => ({
      frame: window.__printInfill.frame(k),
      sil: window.__printInfill.silhouette(k),
      segs: window.__printInfill.segments(k),
      name: window.__printInfill.partNames()[k],
    }), i);
    const f = snap.frame;
    if (!f.ok) continue;
    const sil = snap.sil, segs = snap.segs;
    if (!segs.length) continue;
    names.push(snap.name);
    const fr = {
      x0: Float32Array.from(sil.map(s => s[0])), y0: Float32Array.from(sil.map(s => s[1])),
      x1: Float32Array.from(sil.map(s => s[2])), y1: Float32Array.from(sil.map(s => s[3])),
      n: sil.length, ok: true,
    };
    // The SAME rule the clipper uses: a point is inside when it lies in a span
    // of its own row. Rebuilt here from the silhouette the page handed back,
    // independently of the page's own index.
    const idx = new ScanIndex(fr, 1, 0, 1);
    for (const [x0, y0, x1, y1] of segs) {
      for (const [x, y] of [[x0, y0], [x1, y1]]) {
        total++;
        if (!idx.contains(x, y)) {
          // an endpoint sits ON the outline by construction, so allow it to be
          // within a hair of it before calling it outside
          let d = Infinity;
          for (let k = 0; k < fr.n; k++) d = Math.min(d, ptSegDist(x, y, fr.x0[k], fr.y0[k], fr.x1[k], fr.y1[k]));
          if (d > 1.5) { outside++; worst = Math.max(worst, d); }
        }
      }
    }
  }
  return { total, outside, worst };
};

const hatchIn = await outsideReport('hatch');
check('hatch/every-vertex-inside-the-silhouette', hatchIn.total > 200 && hatchIn.outside === 0,
  `${hatchIn.total} endpoints, ${hatchIn.outside} outside${hatchIn.outside ? `, worst ${hatchIn.worst.toFixed(2)} px` : ''}`);
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'gate-hatch.png') });

const flowIn = await outsideReport('flow');
check('flow/every-vertex-inside-the-silhouette', flowIn.total > 200 && flowIn.outside === 0,
  `${flowIn.total} endpoints, ${flowIn.outside} outside${flowIn.outside ? `, worst ${flowIn.worst.toFixed(2)} px` : ''}`);
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'gate-flow.png') });

// Density responds to spacing, and does so the right way round.
await call(m => window.__printInfill.setMode(m), 'hatch');
await call(() => window.__printInfill.setWidget('spacing', 14)); await settle();
const coarse = (await call(() => window.__printInfill.stats())).segments;
await call(() => window.__printInfill.setWidget('spacing', 5)); await settle();
const fine = (await call(() => window.__printInfill.stats())).segments;
check('hatch/spacing-drives-density', fine > coarse * 1.5, `spacing 14 -> ${coarse} segs, spacing 5 -> ${fine}`);

// Angle drives direction. Measured off the emitted segments, not the slider.
const meanDir = async () => {
  const segs = await call(() => window.__printInfill.segments(1));
  let sx = 0, sy = 0;
  for (const [x0, y0, x1, y1] of segs) {
    let dx = x1 - x0, dy = y1 - y0;
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    if (dx < 0) { dx = -dx; dy = -dy; }            // direction, not sense
    sx += dx; sy += dy;
  }
  return (Math.atan2(sy, sx) * 180 / Math.PI + 180) % 180;
};
await call(() => window.__printInfill.setWidget('layers', 1));
await call(() => window.__printInfill.setWidget('angle', 0)); await settle();
const dir0 = await meanDir();
await call(() => window.__printInfill.setWidget('angle', 90)); await settle();
const dir90 = await meanDir();
const swing = Math.abs(((dir90 - dir0) + 180) % 180);
check('hatch/angle-drives-direction', swing > 60 && swing < 120,
  `mean segment direction ${dir0.toFixed(1)}° -> ${dir90.toFixed(1)}° (swing ${swing.toFixed(1)}°)`);

// Layers build tone up in steps rather than fading: adding a layer adds ink,
// and adds it in a DIFFERENT direction.
await call(() => window.__printInfill.setWidget('angle', 35));
await call(() => window.__printInfill.setWidget('layers', 1)); await settle();
const oneLayer = (await call(() => window.__printInfill.stats())).segments;
await call(() => window.__printInfill.setWidget('layers', 3)); await settle();
const threeLayer = (await call(() => window.__printInfill.stats())).segments;
const dirs = await call(() => {
  const segs = window.__printInfill.segments(1);
  const bins = new Set();
  for (const [x0, y0, x1, y1] of segs) {
    let a = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
    a = ((a % 180) + 180) % 180;
    bins.add(Math.round(a / 10));
  }
  return [...bins].sort((p, q) => p - q);
});
check('hatch/layers-add-a-second-direction', threeLayer > oneLayer && dirs.length >= 3,
  `1 layer ${oneLayer} segs, 3 layers ${threeLayer}; ${dirs.length} direction bins`);

// WHERE IS DARK. The anchor is the mechanism, so the test is that moving it
// moves the ink — measured as the centroid of the emitted segments following
// the anchor, and as the density falling off with distance from it.
await call(() => window.__printInfill.setWidget('layers', 2));
await call(() => window.__printInfill.setWidget('reach', 60)); await settle();
const inkCentroid = async (i) => {
  const segs = await call(k => window.__printInfill.segments(k), i);
  let x = 0, y = 0;
  for (const s of segs) { x += (s[0] + s[2]) / 2; y += (s[1] + s[3]) / 2; }
  return segs.length ? [x / segs.length, y / segs.length] : null;
};
const home = await call(() => window.__printInfill.anchorLocal(1));
const beforeA = await inkCentroid(1);
const anchorBefore = (await call(() => window.__printInfill.frame(1))).ax;
// shove the bloom's anchor sideways in its own local space
await call(a => window.__printInfill.setAnchorLocal(1, [a[0] + 40, a[1], a[2]]), home);
await settle();
const afterA = await inkCentroid(1);
const anchorAfter = (await call(() => window.__printInfill.frame(1))).ax;
const anchorMoved = anchorAfter - anchorBefore;
// A part with no ink has no centroid; say so rather than throwing, so a
// harness under --negative-control still reports its failures legibly.
const inkMoved = (beforeA && afterA) ? afterA[0] - beforeA[0] : null;
check('dark/ink-follows-the-anchor',
  inkMoved !== null && Math.abs(anchorMoved) > 8
    && Math.sign(inkMoved) === Math.sign(anchorMoved) && Math.abs(inkMoved) > 4,
  inkMoved === null ? 'no ink emitted to measure'
    : `anchor moved ${anchorMoved.toFixed(1)} px, ink centroid moved ${inkMoved.toFixed(1)} px`);

await call(a => window.__printInfill.setAnchorLocal(1, a), home); await settle();

// Density really is a falling function of distance from the anchor — the
// substance of "this is where the dark is".
await call(() => window.__printInfill.setWidget('spacing', 4)); await settle();
const rings = await call(() => {
  const f = window.__printInfill.frame(1);
  const segs = window.__printInfill.segments(1);
  const B = 3, len = new Array(B).fill(0), area = new Array(B).fill(0);
  for (const [x0, y0, x1, y1] of segs) {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const b = Math.min(B - 1, Math.floor(Math.hypot(mx - f.ax, my - f.ay) / f.reach * B));
    len[b] += Math.hypot(x1 - x0, y1 - y0);
  }
  for (let b = 0; b < B; b++) {
    const r0 = f.reach * b / B, r1 = f.reach * (b + 1) / B;
    area[b] = Math.PI * (r1 * r1 - r0 * r0);
  }
  return len.map((l, b) => l / area[b]);
});
// Three rings, not five: the innermost of five is a disc a few pixels across
// and its density is dominated by whether one hatch line happens to pass
// through it. The claim being made is that ink THINS with distance from the
// anchor, and that is an inner-versus-outer statement.
const falling = rings.every((v, i) => i === 0 || v <= rings[i - 1] * 1.05)
  && rings[0] > rings[rings.length - 1] * 1.8;
check('dark/density-falls-off-with-distance', falling,
  'ink per unit area by ring: ' + rings.map(v => v.toFixed(4)).join(' > '));
await call(() => window.__printInfill.setWidget('spacing', 7)); await settle();

// Reach is what that falloff is measured in.
await call(() => window.__printInfill.setWidget('reach', 30)); await settle();
const tight = (await call(() => window.__printInfill.stats())).segments;
await call(() => window.__printInfill.setWidget('reach', 160)); await settle();
const wide = (await call(() => window.__printInfill.stats())).segments;
check('dark/reach-scales-the-shaded-region', wide > tight * 1.5, `reach 30 -> ${tight} segs, 160 -> ${wide}`);
await call(() => window.__printInfill.setWidget('reach', 85)); await settle();

// LINE-FLOW's field. At full concentric the segments run PERPENDICULAR to the
// radius from the anchor; at full radial they run ALONG it. Measured on the
// emitted segments, which is the only place the field is observable.
const radialAlignment = async () => call(() => {
  const f = window.__printInfill.frame(1);
  const segs = window.__printInfill.segments(1);
  let s = 0, n = 0;
  for (const [x0, y0, x1, y1] of segs) {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    let rx = mx - f.ax, ry = my - f.ay;
    const rl = Math.hypot(rx, ry); if (rl < f.reach * 0.15) continue;
    rx /= rl; ry /= rl;
    let dx = x1 - x0, dy = y1 - y0;
    const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    s += Math.abs(rx * dx + ry * dy); n++;
  }
  return n ? s / n : null;
});
await call(m => window.__printInfill.setMode(m), 'flow');
await call(() => window.__printInfill.setWidget('curvature', 100)); await settle();
const concentric = await radialAlignment();
await call(() => window.__printInfill.setWidget('curvature', -100)); await settle();
const radial = await radialAlignment();
check('flow/curvature-steers-the-field', concentric < 0.35 && radial > 0.75,
  `|dir·radial| concentric ${concentric && concentric.toFixed(3)} vs radial ${radial && radial.toFixed(3)}`);

// The two families are genuinely different algorithms, not one with a switch:
// cross-hatch emits straight parallel spans, line-flow emits chains whose
// direction turns along their length.
await call(() => window.__printInfill.setWidget('curvature', 70)); await settle();
const flowTurn = await call(() => {
  const segs = window.__printInfill.segments(1);
  let turns = 0, joins = 0;
  for (let i = 1; i < segs.length; i++) {
    const a = segs[i - 1], b = segs[i];
    if (Math.hypot(b[0] - a[2], b[1] - a[3]) > 0.01) continue;   // not consecutive
    const a1 = Math.atan2(a[3] - a[1], a[2] - a[0]), b1 = Math.atan2(b[3] - b[1], b[2] - b[0]);
    let d = Math.abs(((b1 - a1) * 180 / Math.PI + 540) % 360 - 180);
    turns += d; joins++;
  }
  return { mean: joins ? turns / joins : 0, joins };
});
check('flow/streamlines-actually-curve', flowTurn.joins > 100 && flowTurn.mean > 0.5,
  `mean turn ${flowTurn.mean.toFixed(2)}° over ${flowTurn.joins} joins`);

// Only the controls that mean something in the chosen family are offered.
await call(m => window.__printInfill.setMode(m), 'hatch'); await settle();
const rowsHatch = await call(() => window.__printInfill.rowVisibility());
await call(m => window.__printInfill.setMode(m), 'flow'); await settle();
const rowsFlow = await call(() => window.__printInfill.rowVisibility());
check('panel/rows-match-the-family',
  rowsHatch.layers && !rowsHatch.curvature && !rowsFlow.layers && rowsFlow.curvature,
  `hatch ${JSON.stringify(rowsHatch)} flow ${JSON.stringify(rowsFlow)}`);

// The infill must not disturb the two stages under it.
const poseBefore = await call(() => ({ d: window.__printScaffold.droop(), t: window.__printScaffold.twist(),
  rest: window.__printScaffold.isRest() }));
const styleBefore = await call(() => window.__printLineArt.style());
await call(m => window.__printInfill.setMode(m), 'hatch');
await call(() => window.__printInfill.setWidget('spacing', 4));
await call(() => window.__printInfill.setWidget('angle', 120)); await settle();
const poseAfter = await call(() => ({ d: window.__printScaffold.droop(), t: window.__printScaffold.twist(),
  rest: window.__printScaffold.isRest() }));
const styleAfter = await call(() => window.__printLineArt.style());
check('independence/pose-and-linework-untouched',
  JSON.stringify(poseBefore) === JSON.stringify(poseAfter)
    && JSON.stringify(styleBefore) === JSON.stringify(styleAfter),
  `pose ${JSON.stringify(poseAfter)} style ${JSON.stringify(styleAfter)}`);

// A bend must still reach the infill: the silhouette moved, so the shading in
// it must move too.
await call(() => window.__printInfill.setWidget('spacing', 7)); await settle();
const stemSegsBefore = (await call(() => window.__printInfill.segments(0))).length;
const [hx, hy] = await call(() => window.__printScaffold.handleScreenPos(2));
await page.mouse.move(hx, hy); await page.mouse.down();
for (let i = 1; i <= 10; i++) await page.mouse.move(hx + i * 7, hy);
await page.mouse.up(); await settle();
const bent = !(await call(() => window.__printScaffold.isRest()));
const stemSegsAfter = (await call(() => window.__printInfill.segments(0))).length;
check('live/infill-follows-a-bend', bent && stemSegsBefore !== stemSegsAfter,
  `bent=${bent} stem infill ${stemSegsBefore} -> ${stemSegsAfter} segments`);

// The anchors are grabbable, and grabbing one does NOT bend the stem.
await call(() => { window.__printScaffold.setDroop(0); window.__printScaffold.setTwist(0); });
await call(() => window.__printScaffold.resetPose && window.__printScaffold.resetPose());
await settle();
const anchorsShown = await call(() => window.__printInfill.anchorsVisible());
// The bloom's anchor projects under the BUNDLE read-out, which is exactly the
// collision the always-present COLLAPSIBLE panels exist to let you resolve —
// so resolve it the way a hand would, by shutting that panel.
await page.click('#print-debug > summary');
await page.waitForTimeout(150);
const [ax0, ay0] = await call(() => window.__printInfill.anchorScreenPos(1));
const onCanvas = await page.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y);
  return { hit: !!el && el.id === 'print-canvas', got: el ? (el.id || el.tagName) : null };
}, [ax0, ay0]);
const anchorLocalBefore = await call(() => window.__printInfill.anchorLocal(1));
const restBefore = await call(() => window.__printScaffold.isRest());
await page.mouse.move(ax0, ay0); await page.mouse.down();
for (let i = 1; i <= 10; i++) await page.mouse.move(ax0 + i * 4, ay0 + i * 2);
await page.mouse.up(); await settle();
const anchorLocalAfter = await call(() => window.__printInfill.anchorLocal(1));
const restAfter = await call(() => window.__printScaffold.isRest());
const moved = Math.hypot(...anchorLocalAfter.map((v, i) => v - anchorLocalBefore[i]));
check('dark/anchor-is-draggable',
  anchorsShown.every(Boolean) && onCanvas.hit && moved > 1e-3,
  `visible=${anchorsShown} ring at (${ax0.toFixed(0)},${ay0.toFixed(0)}) over ${onCanvas.got}`
  + ` anchor moved ${moved.toFixed(3)} local units`);
check('dark/anchor-drag-is-not-a-pose-drag', restBefore === restAfter,
  `isRest ${restBefore} -> ${restAfter}`);
await page.click('#print-debug > summary');

// The read-out names the decision rather than leaving it implicit.
const text = await call(() => window.__printInfill.infillText());
check('readout/names-the-decision',
  /WHERE IS DARK/.test(text) && /anchor/i.test(text) && /no light source|not a light/i.test(text),
  text.split('\n').find(l => /WHERE IS DARK/.test(l)) || '(missing)');

check('page/no-errors', errs.length === 0, errs.join(' | '));

if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'gate-final.png') });
await browser.close();
server.close();

function ptSegDist(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2)) : 0;
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

const failed = [...checks].filter(([, v]) => !v).map(([k]) => k);
console.log(`\n${checks.size} checks, ${failed.length} failed${failed.length ? ': ' + failed.join(', ') : ''}`);
if (NEG) {
  const ok = failed.length > 0;
  console.log(ok
    ? `\nNEGATIVE CONTROL OK — the run failed, as it must (${failed.length} check(s))`
    : '\nNEGATIVE CONTROL FAILED — the harness passed a clipper that ignores the outline');
  process.exit(ok ? 0 : 1);
}
console.log(failed.length ? '\nFAIL' : '\nPASS');
process.exit(failed.length ? 1 : 0);
