// Gate for the TONAL FILL family (print-infill.js, mode 'tone') — the
// silhouette filled solid or graded, with vein paths reserved out of the fill.
//
//   node tools/verify-print-tone.mjs [--shots <dir>] [--negative-control]
//                                    [--mutant=<id>] [--skip-leaf]
//
// It runs in TWO halves, for the same reason the hatch/flow gate does, and the
// reason is sharper here. A filled shape is MORE forgiving to the eye than a
// hatch, not less: ink that runs past the outline reads as "a bold drawing"
// until it is measured. So:
//
// PART ONE drives the SHIPPED functions — toneRowSpans(), reserveSpansAt(),
// capsuleSpanAtRow(), veinPaths() — over outlines whose correct answer can be
// written down: a square, a C, a star, a fold-over, a bent leaf, a tapered
// leaf. Filled area is compared against ANALYTIC area, not against a second
// run of the same code. toneRowSpans() was pulled out of the Infill class
// precisely so this half tests the shipped arithmetic rather than a copy.
//
// PART TWO drives the stage in a real browser and measures every claim against
// the EMITTED SEGMENT COORDINATES the page hands back in pixels. Never a
// screenshot: "no ink outside the outline" is a claim about coordinates.
//
// THE OPEN-SILHOUETTE PROBLEM, checked before it was built on rather than
// after. #157 found that a projected silhouette here is NOT a closed curve —
// the shipped bundle's bloom is a fused STL split with 24 boundary edges and
// 324 edges whose third face is dropped — and that this is what leaked its
// first streamline clipper. A fill needs closure at least as badly. The answer
// this family takes is not to repair the boundary but to inherit the row-span
// rule that is already immune to it: a scanline is self-consistent along its
// own row, so it can only be wrong in a way the membership test is wrong in
// too. `boundary/*` measures the actual closure defect on each part and then
// asserts the fill is clean anyway — which is the claim, stated as a
// measurement rather than as an argument.
//
// --negative-control re-runs everything against deliberately broken copies of
// print-infill.js and requires each to fail, on the checks it names and no
// others. A mutant run skips the leaf-bundle section (a 21 MB load, and none
// of the mutations touch bundle loading); the per-part darkness claim those
// checks extend is also asserted on the default bundle, which the mutants do
// cover.
//
// Dev-only deps, not in package.json (same convention as the other gates):
//   npm i --no-save playwright-core three@0.161.0

import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const NEG = args.includes('--negative-control') || args.some(a => a.startsWith('--mutant='));
const ONLY = (() => { const a = args.find(x => x.startsWith('--mutant=')); return a ? a.slice(9) : null; })();
const SHOTS = (() => { const i = args.indexOf('--shots'); return i >= 0 ? args[i + 1] : null; })();
const SKIP_LEAF = args.includes('--skip-leaf');
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const DEFAULT_BUNDLE = 'assets/print-test/flower-test-bundle.glb';
const LEAF_BUNDLE = 'assets/print-test/bloom-stem-leaf-bundle.glb';

// ===========================================================================
// The mutants. Each is one surgical edit to print-infill.js that leaves the
// page running and the picture plausible. `breaks` is the set of check names
// that MUST go red; anything else going red means the mutation broke the page
// rather than the property, which is how a fake negative control is caught.
const MUTANTS = [
  {
    id: 'fill-to-the-bounding-box',
    from: '  let spans = idx.spansAt(v);\n  if (!spans.length) return out;\n  out.onOutline = true;',
    to: '  let spans = [idx.f.minX - 20, idx.f.maxX + 20];\n  out.onOutline = true;',
    // NOT in this list, and both are the right answer: the two `reserve/…-area`
    // checks fill a SQUARE, where the bounding box is the shape, and
    // `tone/darkness-is-per-part` is about which part a number reaches rather
    // than about where the ink lands.
    breaks: [
      'fill/square-is-solid', 'fill/area-matches-the-outline',
      'fill/concave-C-leaves-the-mouth-empty', 'fill/star-has-no-ink-outside',
      'fill/fold-over-is-not-a-hole', 'fill/opposite-winding-is-a-hole',
      'tone/every-vertex-inside-the-silhouette', 'tone/fill-covers-the-silhouette',
      'boundary/fill-is-clean-despite-an-open-outline',
      'boundary/inside-is-direction-dependent-when-the-outline-is-open',
      'tone/gradient-reduces-ink', 'reserve/still-clips-to-the-outline',
      'nib/fewer-rows-still-covers-the-shape',
    ],
  },
  {
    id: 'veins-reserve-nothing',
    from: 'export function reserveSpansAt(paths, v, halfWidth) {\n  if (!(halfWidth > 0)) return [];',
    to: 'export function reserveSpansAt(paths, v, halfWidth) {\n  if (halfWidth >= 0) return [];',
    breaks: [
      'reserve/vein-band-is-empty', 'reserve/diagonal-band-is-empty',
      'reserve/area-removed-is-the-capsule', 'reserve/is-subtraction-not-a-stroke',
      'reserve/every-row-is-cut', 'reserve/veins-cut-a-real-fraction-of-the-leaf',
      'reserve/removes-ink-from-the-page', 'reserve/ink-avoids-the-vein-paths',
      'readout/reports-rows-cut-by-a-vein',
    ],
  },
  {
    id: 'darkness-is-global',
    from: 'const D = Math.max(0, Math.min(1, this.darkness[i] / 100));',
    to: 'const D = Math.max(0, Math.min(1, this.darkness[0] / 100));',
    breaks: ['tone/darkness-is-per-part'],
  },
  {
    id: 'dither-rows-in-order',
    from: 'export const TONE_ORDER = [0, 4, 2, 6, 1, 5, 3, 7];',
    to: 'export const TONE_ORDER = [0, 1, 2, 3, 4, 5, 6, 7];',
    breaks: ['dither/rows-spread-rather-than-band'],
  },
  {
    id: 'rib-is-a-straight-line',
    from: '    rib.push(pt(t, sp ? (sp[0] + sp[1]) / 2 : u0));',
    to: '    rib.push(pt(t, u0));',
    // The second witness is not padding: a rib laid straight through the
    // centroid of a BENT leaf does not merely wander off the medial line, it
    // starts outside the shape altogether.
    breaks: ['veins/midrib-follows-a-bent-leaf', 'veins/anchored-inside-the-outline'],
  },
];

// ===========================================================================
// Harness. One run() that can be pointed at a mutated print-infill.js.

let OVERRIDE = null;                    // { text } for print-infill.js

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/print') p = '/print.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f)) { r.writeHead(404); return r.end('nf'); }
  const body = (OVERRIDE && p === '/print-infill.js')
    ? Buffer.from(OVERRIDE.text, 'utf8') : readFileSync(f);
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  r.end(body);
});
await new Promise(r => server.listen(0, r));
const PORT = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.PRINT_CHROME || '/opt/pw-browsers/chromium' });

// The module under test, freshly imported per run so a mutant's PART ONE sees
// the mutation too. A temp copy lives beside the original so its `three` and
// `three/addons/` imports resolve exactly as the real file's do.
async function loadModule(mutantId) {
  if (!mutantId) return import('../print-infill.js');
  const tmp = path.join(ROOT, `.tone-mutant-${mutantId}.js`);
  writeFileSync(tmp, OVERRIDE.text);
  try { return await import(`../.tone-mutant-${mutantId}.js?v=${Date.now()}`); }
  finally { setTimeout(() => { try { rmSync(tmp); } catch {} }, 0); }
}

// ===========================================================================
async function run({ mutant = null, shots = false } = {}) {
  const M = await loadModule(mutant);
  const {
    scanSpans, clipSpans, subtractSpans, insideWinding, ScanIndex,
    toneAt, toneRadius, toneCoverage, levelThreshold, toneRowSpans,
    mergeSpans, capsuleSpanAtRow, reserveSpansAt, principalAxis, veinPaths,
    rotatePaths, TONE_LEVELS, TONE_ORDER, INFILL_MODES,
  } = M;

  const checks = new Map();
  const details = new Map();
  const check = (name, ok, detail = '') => {
    checks.set(name, !!ok); details.set(name, detail);
    if (!mutant) console.log(`  [${ok ? 'ok  ' : 'FAIL'}] ${name}${detail ? '  ' + detail : ''}`);
    return !!ok;
  };
  const log = (...a) => { if (!mutant) console.log(...a); };

  // -------------------------------------------------------------------------
  // PART ONE — the shipped fill, over outlines with known answers.
  log('\n--- part one: the fill and the reservation, on known shapes ---');

  const frameFromRings = (rings) => {
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
  };

  // Fill a synthetic frame through the SHIPPED row function. Returns the rows,
  // the total inked length, and the implied area (length x pitch).
  const fillShape = (f, o = {}) => {
    const pitch = o.pitch !== undefined ? o.pitch : 1;
    const ang = (o.angleDeg || 0) * Math.PI / 180;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const paths = o.paths || [];
    const ctx = {
      idx: new ScanIndex(f, ca, sa, pitch),
      occ: (o.occluders || []).map(g => new ScanIndex(g, ca, sa, pitch)),
      rot: rotatePaths(paths, ca, sa),
      halfVein: (o.veinWidth || 0) / 2,
      pitch, au: o.au || 0, av: o.av || 0,
      reach: o.reach || 1, gamma: o.gamma || 1,
      darkness: o.darkness !== undefined ? o.darkness : 1,
      gradient: o.gradient !== undefined ? o.gradient : 0,
      jitter: o.jitter || 0,
    };
    let vmin = Infinity, vmax = -Infinity;
    for (const [x, y] of [[f.minX, f.minY], [f.maxX, f.minY], [f.minX, f.maxY], [f.maxX, f.maxY]]) {
      const v = -x * sa + y * ca;
      if (v < vmin) vmin = v;
      if (v > vmax) vmax = v;
    }
    const rows = [], pts = [];
    let ink = 0, drawn = 0, touched = 0, reserved = 0;
    for (let k = Math.ceil(vmin / pitch); k <= Math.floor(vmax / pitch); k++) {
      const row = toneRowSpans(ctx, k);
      if (row.onOutline) touched++;
      if (row.reserved) reserved++;
      if (row.spans.length) drawn++;
      rows.push(row);
      for (let q = 0; q + 1 < row.spans.length; q += 2) {
        ink += row.spans[q + 1] - row.spans[q];
        const v = row.v;
        for (const u of [row.spans[q], row.spans[q + 1], (row.spans[q] + row.spans[q + 1]) / 2]) {
          pts.push([u * ca - v * sa, u * sa + v * ca]);
        }
      }
    }
    return { rows, pts, ink, area: ink * pitch, drawn, touched, reserved, ctx };
  };

  const ptSeg = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  };
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  const spansNear = (g, w, tol = 1e-3) => g.length === w.length && g.every((v, i) => near(v, w[i], tol));

  // --- the fill ------------------------------------------------------------
  {
    const f = frameFromRings([[[0, 0], [100, 0], [100, 100], [0, 100]]]);
    const r = fillShape(f, { pitch: 0.5 });
    const solid = r.rows.filter(x => x.spans.length).every(x => spansNear(x.spans, [0, 100], 0.01));
    check('fill/square-is-solid', solid && r.drawn > 190,
      `${r.drawn} rows, every one the full width`);
    check('fill/area-matches-the-outline', near(r.area, 10000, 120),
      `${r.area.toFixed(0)} px^2 against an analytic 10000`);
  }
  {
    // The C from the hatch gate. A row through the mouth must be TWO spans,
    // and the fill must leave the notch bare.
    const C = [[0, 0], [100, 0], [100, 30], [40, 30], [40, 70], [100, 70], [100, 100], [0, 100]];
    const f = frameFromRings([C]);
    const r = fillShape(f, { pitch: 0.5 });
    const inNotch = r.pts.filter(([x, y]) => x > 42 && x < 98 && y > 32 && y < 68).length;
    const analytic = 10000 - 60 * 40;
    check('fill/concave-C-leaves-the-mouth-empty', inNotch === 0 && near(r.area, analytic, 150),
      `${inNotch} inked points in the notch; area ${r.area.toFixed(0)} vs ${analytic}`);
  }
  {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 ? 40 : 100;
      pts.push([200 + rr * Math.cos(a), 200 + rr * Math.sin(a)]);
    }
    const f = frameFromRings([pts]);
    const r = fillShape(f, { pitch: 0.6, angleDeg: 23 });
    // A span END sits exactly ON the outline by construction, where a winding
    // vote is a coin toss, so "outside" has to mean outside BY SOMETHING. The
    // bar is a hundredth of a pixel: a real leak past one of the star's five
    // notches would be tens of pixels.
    let outside = 0, worst = 0;
    for (const [x, y] of r.pts) {
      if (insideWinding(f, x, y)) continue;
      let d = Infinity;
      for (let k = 0; k < f.n; k++) d = Math.min(d, ptSeg(x, y, f.x0[k], f.y0[k], f.x1[k], f.y1[k]));
      if (d > 0.01) { outside++; worst = Math.max(worst, d); }
    }
    check('fill/star-has-no-ink-outside', r.pts.length > 500 && outside === 0,
      `${outside} of ${r.pts.length} inked points outside the outline`
      + (outside ? `, worst ${worst.toFixed(2)} px` : ''));
  }
  {
    // A petal folding over itself drops a SECOND loop the same way round. Even-
    // odd would punch a hole there; nonzero fills it.
    const outer = [[0, 0], [200, 0], [200, 200], [0, 200]];
    const same = [[60, 60], [140, 60], [140, 140], [60, 140]];
    const opp = [...same].reverse();
    const fSame = frameFromRings([outer, same]);
    const fOpp = frameFromRings([outer, opp]);
    const rSame = fillShape(fSame, { pitch: 0.5 });
    const rOpp = fillShape(fOpp, { pitch: 0.5 });
    check('fill/fold-over-is-not-a-hole', near(rSame.area, 40000, 300),
      `${rSame.area.toFixed(0)} px^2 — the inner loop is filled, not punched out`);
    check('fill/opposite-winding-is-a-hole', near(rOpp.area, 40000 - 6400, 300),
      `${rOpp.area.toFixed(0)} px^2 against 33600`);
  }

  {
    // THE OPEN-OUTLINE CLOSURE, in both directions. On a closed outline the
    // winding returns to zero on every row and the repair never runs, so the
    // spans must be BIT-IDENTICAL to what the un-repaired rule gave — which is
    // what lets the repair live in the rule both other families clip with. On
    // an outline with one edge removed it is the difference between a fill and
    // nothing at all.
    const ring = [[0, 0], [120, 0], [120, 90], [0, 90]];
    const closed = frameFromRings([ring]);
    const cIdx = new ScanIndex(closed, 1, 0, 1);
    let sameEverywhere = true;
    for (let y = 1; y < 90; y++) if (!spansNear(cIdx.spansAt(y + 0.5), [0, 120], 1e-6)) sameEverywhere = false;
    check('boundary/closure-is-inert-on-a-closed-outline',
      sameEverywhere && cIdx.openRows === 0,
      `${cIdx.openRows} rows repaired on a closed square — the repair cannot move a closed outline`);

    // The defect MODELLED, not invented: a dropped third face leaves an edge
    // oriented by the wrong side, so one wall of the shape counts the same way
    // round as the opposite wall and the winding walks up without ever coming
    // back to zero. That is what the leaf does — three crossings on every row —
    // and unrepaired it fills to NOTHING.
    const flipped = frameFromRings([ring]);
    for (let i = 0; i < flipped.n; i++) {
      if (flipped.x0[i] === 0 && flipped.x1[i] === 0) {          // the left wall
        const tx = flipped.x0[i], ty = flipped.y0[i];
        flipped.x0[i] = flipped.x1[i]; flipped.y0[i] = flipped.y1[i];
        flipped.x1[i] = tx; flipped.y1[i] = ty;
      }
    }
    const fIdx = new ScanIndex(flipped, 1, 0, 1);
    let recovered = 0, empty = 0;
    for (let y = 1; y < 89; y++) {
      const sp = fIdx.spansAt(y + 0.5);
      if (spansNear(sp, [0, 120], 1e-6)) recovered++;
      else if (!sp.length) empty++;
    }
    check('boundary/closure-recovers-an-open-outline',
      recovered > 80 && empty === 0 && fIdx.openRows === recovered,
      `a wall left facing the wrong way: ${recovered} rows closed at their last crossing back to the `
      + `full width, ${empty} still empty (unrepaired, every one of them is empty)`);
  }

  // --- the capsule, the primitive the reservation is built on --------------
  {
    const mid = capsuleSpanAtRow(0, 0, 0, 10, 2, 5);
    const cap = capsuleSpanAtRow(0, 0, 0, 10, 2, 11);
    const miss = capsuleSpanAtRow(0, 0, 0, 10, 2, 13);
    const horiz = capsuleSpanAtRow(0, 0, 10, 0, 2, 0);
    const dot = capsuleSpanAtRow(5, 5, 5, 5, 3, 5);
    check('capsule/slab-is-the-width', spansNear(mid, [-2, 2]), JSON.stringify(mid));
    check('capsule/ends-are-round',
      cap && near(cap[0], -Math.sqrt(3), 1e-6) && near(cap[1], Math.sqrt(3), 1e-6), JSON.stringify(cap));
    check('capsule/misses-return-nothing', miss === null);
    check('capsule/horizontal-segment-is-its-own-row', spansNear(horiz, [-2, 12]), JSON.stringify(horiz));
    check('capsule/degenerate-is-a-disc', spansNear(dot, [2, 8]), JSON.stringify(dot));
    // a 45-degree segment: the slab is sqrt(2) x r wide on a horizontal row
    const diag = capsuleSpanAtRow(0, 0, 100, 100, 4, 50);
    check('capsule/diagonal-widens-on-the-row',
      diag && near(diag[1] - diag[0], 8 * Math.SQRT2, 1e-3), `width ${(diag[1] - diag[0]).toFixed(4)}`);
  }
  {
    check('merge/sorts-and-joins', spansNear(mergeSpans([5, 7, 1, 3, 2, 4]), [1, 4, 5, 7]));
    check('merge/drops-empties', spansNear(mergeSpans([5, 5, 1, 3]), [1, 3]));
    check('merge/touching-spans-join', spansNear(mergeSpans([0, 5, 5, 9]), [0, 9]));
  }

  // --- the reservation -----------------------------------------------------
  {
    const f = frameFromRings([[[0, 0], [100, 0], [100, 100], [0, 100]]]);
    const vein = [[[50, -10], [50, 110]]];
    const W = 6;
    const bare = fillShape(f, { pitch: 0.5 });
    const cut = fillShape(f, { pitch: 0.5, paths: vein, veinWidth: W });
    const inBand = cut.pts.filter(([x]) => x > 50 - W / 2 + 0.02 && x < 50 + W / 2 - 0.02).length;
    check('reserve/vein-band-is-empty', inBand === 0 && cut.pts.length > 0,
      `${inBand} inked points inside a ${W} px reserved band, of ${cut.pts.length}`);
    check('reserve/is-subtraction-not-a-stroke', cut.area < bare.area,
      `${bare.area.toFixed(0)} -> ${cut.area.toFixed(0)} px^2`);
    check('reserve/area-removed-is-the-capsule', near(bare.area - cut.area, W * 100, 90),
      `removed ${(bare.area - cut.area).toFixed(0)} px^2 against an analytic ${W * 100}`);
    check('reserve/every-row-is-cut', cut.reserved > 190, `${cut.reserved} rows cut`);
  }
  {
    const f = frameFromRings([[[0, 0], [200, 0], [200, 200], [0, 200]]]);
    const vein = [[[10, 10], [190, 190]]];
    const W = 7;
    const cut = fillShape(f, { pitch: 0.5, paths: vein, veinWidth: W });
    let worst = Infinity;
    for (const [x, y] of cut.pts) worst = Math.min(worst, ptSeg(x, y, 10, 10, 190, 190));
    check('reserve/diagonal-band-is-empty', worst >= W / 2 - 0.05,
      `closest inked point is ${worst.toFixed(3)} px from a ${W} px vein (needs >= ${(W / 2).toFixed(2)})`);
  }
  {
    // A reservation may not resurrect ink that the tone or the outline had
    // already ruled out: subtracting from nothing is still nothing.
    const f = frameFromRings([[[0, 0], [100, 0], [100, 100], [0, 100]]]);
    const cut = fillShape(f, { pitch: 0.5, darkness: 0, paths: [[[50, -10], [50, 110]]], veinWidth: 6 });
    check('reserve/cannot-add-ink', cut.area === 0 && cut.reserved === 0,
      'a part at darkness 0 has nothing for a vein to cut into');
  }

  // --- the tone ramp -------------------------------------------------------
  {
    let worst = 0;
    for (const g of [0.25, 0.5, 1]) {
      for (const D of [0.4, 0.7, 1]) {
        for (let L = 0; L < TONE_LEVELS; L++) {
          const tau = levelThreshold(L, D, g);
          if (!(tau > 0 && tau < 1)) continue;
          worst = Math.max(worst, Math.abs(toneCoverage(D, g, tau) - L / TONE_LEVELS));
        }
      }
    }
    check('tone/coverage-inverts-threshold', worst < 1e-12, `max residual ${worst.toExponential(2)}`);
  }
  {
    const f = frameFromRings([[[0, 0], [100, 0], [100, 100], [0, 100]]]);
    const frac = (D) => fillShape(f, { pitch: 1, darkness: D }).drawn
      / fillShape(f, { pitch: 1, darkness: 1 }).drawn;
    const got = [0.25, 0.5, 0.75, 1].map(frac);
    const ok = got.every((v, i) => Math.abs(v - [0.25, 0.5, 0.75, 1][i]) < 1 / TONE_LEVELS + 0.02)
      && got.every((v, i) => i === 0 || v > got[i - 1]);
    check('dither/coverage-tracks-darkness', ok,
      `darkness 25/50/75/100% -> ${got.map(v => (v * 100).toFixed(0) + '%').join(' / ')} of rows`);
  }
  {
    // The bit reversal is what stops a half-tone from banding into a stripe.
    // At n drawn levels the gap between drawn rows must stay near
    // TONE_LEVELS / n; in source order it collapses to one solid block.
    const f = frameFromRings([[[0, 0], [40, 0], [40, 400], [0, 400]]]);
    const rows = fillShape(f, { pitch: 1, darkness: 0.5 }).rows;
    const drawn = rows.map((r, i) => [i, r.spans.length > 0]).filter(([, d]) => d).map(([i]) => i);
    let maxGap = 0;
    for (let i = 1; i < drawn.length; i++) maxGap = Math.max(maxGap, drawn[i] - drawn[i - 1]);
    check('dither/rows-spread-rather-than-band', drawn.length > 100 && maxGap <= 2,
      `at 50% darkness the largest gap between inked rows is ${maxGap} rows (even spread is 2)`);
  }
  {
    const f = frameFromRings([[[0, 0], [200, 0], [200, 200], [0, 200]]]);
    const flat = fillShape(f, { pitch: 0.5, gradient: 0 });
    const ramp = fillShape(f, { pitch: 0.5, gradient: 1, au: 100, av: 100, reach: 70, gamma: 1 });
    // and the ramp really is a ramp: ink density falls with distance from the
    // anchor, measured in rings.
    const ring = (lo, hi) => {
      let n = 0;
      for (const [x, y] of ramp.pts) {
        const d = Math.hypot(x - 100, y - 100);
        if (d >= lo && d < hi) n++;
      }
      return n / (Math.PI * (hi * hi - lo * lo));
    };
    const r0 = ring(0, 25), r1 = ring(25, 50), r2 = ring(50, 75);
    check('tone/gradient-is-a-ramp-from-the-anchor',
      ramp.area < flat.area && r0 > r1 && r1 > r2,
      `flat ${flat.area.toFixed(0)} -> graded ${ramp.area.toFixed(0)} px^2; density by ring `
      + `${r0.toFixed(4)} > ${r1.toFixed(4)} > ${r2.toFixed(4)}`);
  }

  // --- the veins -----------------------------------------------------------
  {
    // A rotated ellipse: the principal axis must come back as its long axis.
    const pts = [];
    const th = 27 * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
    for (let i = 0; i < 120; i++) {
      const a = i / 120 * Math.PI * 2;
      const x = 90 * Math.cos(a), y = 22 * Math.sin(a);
      pts.push([300 + x * c - y * s, 300 + x * s + y * c]);
    }
    const f = frameFromRings([pts]);
    const ax = principalAxis(f);
    const dot = Math.abs(ax.ex * c + ax.ey * s);
    check('axis/principal-recovers-a-rotated-ellipse', dot > 0.999,
      `|axis . true| = ${dot.toFixed(5)}, centre (${ax.cx.toFixed(1)}, ${ax.cy.toFixed(1)})`);
  }

  // A BENT leaf: a lens shape whose medial line is an arc, not a chord. This is
  // the shape the midrib construction exists for — a straight line through the
  // centroid is visibly off it, and the snapped-to-cross-span rib is not.
  const bentLeaf = (() => {
    const top = [], bot = [];
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      const x = u * 300;
      const arc = 70 * Math.sin(u * Math.PI);            // the medial line
      const halfW = 30 * Math.sin(u * Math.PI) ** 0.7;   // the width profile
      top.push([x, arc - halfW]);
      bot.push([x, arc + halfW]);
    }
    return frameFromRings([[...top, ...bot.reverse()]]);
  })();
  const medialAt = (x) => 70 * Math.sin((x / 300) * Math.PI);
  {
    const paths = veinPaths(bentLeaf, 3);
    const rib = paths[0];
    let worstRib = 0;
    for (const [x, y] of rib) worstRib = Math.max(worstRib, Math.abs(y - medialAt(x)));
    // the control: the straight line through the centroid, on the same span
    const ax = principalAxis(bentLeaf);
    let worstStraight = 0;
    for (const [x] of rib) {
      const t = (x - ax.cx) / (ax.ex || 1e-9);
      worstStraight = Math.max(worstStraight, Math.abs((ax.cy + ax.ey * t) - medialAt(x)));
    }
    check('veins/midrib-follows-a-bent-leaf', worstRib < 4 && worstStraight > 12,
      `rib is at most ${worstRib.toFixed(2)} px off the true medial line; `
      + `a straight line through the centroid is ${worstStraight.toFixed(2)} px off`);
  }
  {
    const paths = veinPaths(bentLeaf, 3);
    check('veins/count-is-a-midrib-plus-pairs', paths.length === 1 + 3 * 2,
      `${paths.length} paths for 3 pairs`);
    const none = veinPaths(bentLeaf, 0);
    check('veins/zero-pairs-is-just-the-midrib', none.length === 1, `${none.length} path`);
    // Laterals are scaled by the measured half-width on their own side, so a
    // tapering leaf gets shorter laterals toward the tip with nothing told to
    // taper. Compared base pair against tip pair.
    const len = (p) => {
      let L = 0;
      for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      return L;
    };
    const tapered = (() => {
      const top = [], bot = [];
      for (let i = 0; i <= 60; i++) {
        const u = i / 60, x = u * 300, halfW = 40 * (1 - u * 0.92);
        top.push([x, -halfW]); bot.push([x, halfW]);
      }
      return frameFromRings([[...top, ...bot.reverse()]]);
    })();
    const tp = veinPaths(tapered, 3);
    const base = (len(tp[1]) + len(tp[2])) / 2, tip = (len(tp[5]) + len(tp[6])) / 2;
    check('veins/laterals-scale-with-the-measured-width', base > tip * 1.8,
      `base pair ${base.toFixed(1)} px, tip pair ${tip.toFixed(1)} px`);
  }
  {
    // Every vein path STARTS inside the shape. (It is allowed to run out near
    // the tip — reservation is subtractive, so an excursion reserves nothing —
    // but a rib that begins outside would be reserving the wrong shape.)
    const paths = veinPaths(bentLeaf, 4);
    let out = 0;
    for (const p of paths) if (!insideWinding(bentLeaf, p[0][0], p[0][1])) out++;
    check('veins/anchored-inside-the-outline', out === 0, `${out} of ${paths.length} paths start outside`);
  }
  {
    // The whole point, on a shape where it can be seen: filling the bent leaf
    // with veins reserved leaves connected bare channels through the ink.
    const bare = fillShape(bentLeaf, { pitch: 0.5 });
    const cut = fillShape(bentLeaf, { pitch: 0.5, paths: veinPaths(bentLeaf, 3), veinWidth: 5 });
    const frac = (bare.area - cut.area) / bare.area;
    check('reserve/veins-cut-a-real-fraction-of-the-leaf', frac > 0.06 && frac < 0.45,
      `${(frac * 100).toFixed(1)}% of the fill withheld along the veins`);
  }
  {
    // The module still reads NOTHING off the surface — the same source check
    // #157 shipped, restated because tonal fill is exactly the family that
    // would be tempted to reach for a normal.
    const src = OVERRIDE ? OVERRIDE.text : readFileSync(path.join(ROOT, 'print-infill.js'), 'utf8');
    const code = src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    const banned = ['faceN', 'faceC', 'edgeDot', 'facing', 'computeVertexNormals', 'dihedral'];
    const hits = banned.filter(w => new RegExp(`\\b${w}\\b`).test(code));
    check('infill/reads-no-surface', hits.length === 0, hits.length ? hits.join(', ')
      : 'no normals, no dihedrals, no creases, no light — the veins are authored 2D');
  }

  // -------------------------------------------------------------------------
  // PART TWO — the stage in the page.
  log('\n--- part two: the tonal fill in the page ---');

  const ctxB = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  await ctxB.route('https://cdn.jsdelivr.net/npm/three@0.161.0/**', route => {
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
    const f = path.join(ROOT, 'node_modules/three', rel);
    if (!existsSync(f)) return route.fulfill({ status: 404, body: 'nf' });
    route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8') });
  });
  await ctxB.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));

  const page = await ctxB.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  const call = (fn, ...a) => page.evaluate(fn, ...a);
  const settle = () => page.waitForTimeout(700);

  await page.goto(`http://127.0.0.1:${PORT}/print`);
  await page.waitForFunction(() => window.__printScaffold && window.__printScaffold.ready, { timeout: 60000 });
  await settle();

  check('page/tone-is-a-family', INFILL_MODES.includes('tone')
    && (await call(() => [...document.querySelectorAll('#infillMode option')].map(o => o.value))).includes('tone'));
  check('page/tone-is-opt-in', (await call(() => window.__printInfill.mode())) === 'off',
    'the stage still changes nothing about a bundle on load');

  // Quieten the outline so the fill is separable from the line work.
  await call(() => { window.__printLineArt.setDetailWidget(12); window.__printLineArt.setWeightWidget(1.2); });
  await settle();

  // One evaluate per part: the page re-extracts every frame, so reading the
  // outline and the ink in two calls compares different frames.
  const snapshot = async (i) => call(k => ({
    frame: window.__printInfill.frame(k),
    sil: window.__printInfill.silhouette(k),
    segs: window.__printInfill.segments(k),
    veins: window.__printInfill.veinPaths(k),
    name: window.__printInfill.partNames()[k],
    pitch: window.__printInfill.tonePitch(),
  }), i);
  const rebuildFrame = (sil) => ({
    x0: Float32Array.from(sil.map(s => s[0])), y0: Float32Array.from(sil.map(s => s[1])),
    x1: Float32Array.from(sil.map(s => s[2])), y1: Float32Array.from(sil.map(s => s[3])),
    n: sil.length, ok: sil.length >= 3,
    minX: Math.min(...sil.map(s => Math.min(s[0], s[2]))),
    maxX: Math.max(...sil.map(s => Math.max(s[0], s[2]))),
    minY: Math.min(...sil.map(s => Math.min(s[1], s[3]))),
    maxY: Math.max(...sil.map(s => Math.max(s[1], s[3]))),
  });
  // MEMBERSHIP, AT THE POINT'S OWN ROW AND IN A CHOSEN DIRECTION. Two things
  // this had to learn the hard way, both measured:
  //
  // 1. ScanIndex.contains() quantises to the row centre — right for line-flow,
  //    which memoises one answer per pixel row, wrong here. spansAt() evaluates
  //    the crossings at exactly the v asked for.
  //
  // 2. "INSIDE" IS DIRECTION-DEPENDENT WHEN THE OUTLINE IS OPEN, which is
  //    #157's finding in a new costume. The bloom's projected silhouette has
  //    2240 unbalanced vertices, and a winding rule scanned at one angle can
  //    disagree with the same rule scanned at another: measured on the shipped
  //    bundle, the solid fill judged by a rule at ITS OWN angle has 0 of 4194
  //    points outside, and the identical ink judged by a rule 35 degrees away
  //    has 33 of 5361, up to 20 px deep inside the shape. The fill is not
  //    leaking there; the two rules are answering different questions. So the
  //    leak check matches directions, and the disagreement gets its own named
  //    measurement rather than being buried in a tolerance.
  const containsExact = (idx, ca, sa, x, y) => {
    const sp = idx.spansAt(-x * sa + y * ca);
    const u = x * ca + y * sa;
    for (let i = 0; i + 1 < sp.length; i += 2) if (u >= sp[i] && u <= sp[i + 1]) return true;
    return false;
  };
  const ptSegDist = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  };

  // How much of an emitted segment set lands outside its own silhouette, and
  // how much area it covers against the outline's own area.
  const inkReport = async (angleDeg) => {
    const a = angleDeg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const xa = a + Math.PI / 2, cx = Math.cos(xa), sx = Math.sin(xa);
    const parts = await call(() => window.__printInfill.partCount());
    let total = 0, outside = 0, worst = 0, cross = 0, ink = 0, shapeArea = 0, names = [];
    for (let i = 0; i < parts; i++) {
      const snap = await snapshot(i);
      if (!snap.frame.ok || !snap.segs.length) continue;
      names.push(snap.name);
      const fr = rebuildFrame(snap.sil);
      const idx = new ScanIndex(fr, ca, sa, 1);         // the fill's own direction
      const idxX = new ScanIndex(fr, cx, sx, 1);        // 90 degrees to it
      for (const [x0, y0, x1, y1] of snap.segs) {
        ink += Math.hypot(x1 - x0, y1 - y0) * snap.pitch;
        for (const [x, y] of [[x0, y0], [x1, y1], [(x0 + x1) / 2, (y0 + y1) / 2]]) {
          total++;
          const inA = containsExact(idx, ca, sa, x, y);
          const inB = containsExact(idxX, cx, sx, x, y);
          if (inA && inB) continue;
          let d = Infinity;
          for (let k = 0; k < fr.n; k++) d = Math.min(d, ptSegDist(x, y, fr.x0[k], fr.y0[k], fr.x1[k], fr.y1[k]));
          if (d <= 1.5) continue;                       // a span end sits ON the outline
          if (!inA) { outside++; worst = Math.max(worst, d); }
          if (!inB) cross++;
        }
      }
      // the outline's own area, by the same row-span rule
      const areaIdx = new ScanIndex(fr, 1, 0, 1);
      for (let v = Math.ceil(fr.minY); v <= Math.floor(fr.maxY); v++) {
        const sp = areaIdx.spansAt(v + 0.5);
        for (let q = 0; q + 1 < sp.length; q += 2) shapeArea += sp[q + 1] - sp[q];
      }
    }
    return { total, outside, worst, cross, ink, shapeArea, names };
  };

  await call(() => window.__printInfill.setMode('tone'));
  await call(() => window.__printInfill.setWidget('veinWidth', 0));
  await settle();
  const FILL_ANGLE = 35;             // the shipped default, and what the page is on
  const solid = await inkReport(FILL_ANGLE);
  check('tone/every-vertex-inside-the-silhouette', solid.total > 500 && solid.outside === 0,
    `${solid.total} measured points across ${solid.names.join(' + ')}, ${solid.outside} outside`
    + (solid.outside ? `, worst ${solid.worst.toFixed(2)} px` : ''));
  check('tone/fill-covers-the-silhouette',
    solid.ink > solid.shapeArea * 0.9 && solid.ink < solid.shapeArea * 1.06,
    `inked ${solid.ink.toFixed(0)} px^2 against an outline area of ${solid.shapeArea.toFixed(0)} px^2`);
  if (shots && SHOTS) await page.screenshot({ path: path.join(SHOTS, 'gate-tone-solid.png') });

  // The closure defect, measured, and the fill shown clean in spite of it.
  {
    const parts = await call(() => window.__printInfill.partCount());
    const lines = [];
    let anyOpen = false;
    for (let i = 0; i < parts; i++) {
      const snap = await snapshot(i);
      if (!snap.frame.ok) continue;
      // A closed oriented curve visits every vertex as often as it leaves it.
      const deg = new Map();
      const key = (x, y) => `${Math.round(x * 64)},${Math.round(y * 64)}`;
      for (const [x0, y0, x1, y1] of snap.sil) {
        deg.set(key(x0, y0), (deg.get(key(x0, y0)) || 0) + 1);
        deg.set(key(x1, y1), (deg.get(key(x1, y1)) || 0) - 1);
      }
      let bad = 0;
      for (const v of deg.values()) if (v !== 0) bad++;
      if (bad) anyOpen = true;
      lines.push(`${snap.name}: ${snap.sil.length} oriented edges, ${bad} unbalanced vertices`);
    }
    check('boundary/closure-is-measured-not-assumed', lines.length > 0, lines.join('; '));
    check('boundary/fill-is-clean-despite-an-open-outline',
      solid.outside === 0 && anyOpen,
      anyOpen ? `the projected outline is NOT closed and the fill is clean anyway `
        + `(${solid.total} points, 0 outside its own row rule)`
        : 'the outline came back closed — this check has nothing to prove and must be re-derived');
    // The pair that makes the number above interpretable. The SAME ink judged
    // by a rule scanned 90 degrees away disagrees on a handful of points; that
    // is the open outline, not the filler, and it is bounded rather than
    // hidden. A fill that really did leak would be red on BOTH.
    check('boundary/inside-is-direction-dependent-when-the-outline-is-open',
      solid.cross < solid.total * 0.02,
      `${solid.cross} of ${solid.total} points fall outside a rule scanned 90° from the fill's own, `
      + `against 0 outside the fill's own — the outline is open, so the two rules are not the same question`);
  }

  // The gradient.
  await call(() => window.__printInfill.setWidget('gradient', 100));
  await call(() => window.__printInfill.setWidget('reach', 60));
  await settle();
  const graded = await inkReport(FILL_ANGLE);
  check('tone/gradient-reduces-ink', graded.ink < solid.ink * 0.9 && graded.ink > 0
    && graded.outside === 0,
    `solid ${solid.ink.toFixed(0)} -> graded ${graded.ink.toFixed(0)} px^2, ${graded.outside} points outside`);
  if (shots && SHOTS) await page.screenshot({ path: path.join(SHOTS, 'gate-tone-graded.png') });
  await call(() => window.__printInfill.setWidget('gradient', 0));
  await settle();

  // PER-PART DARKNESS — the control the reference's depth needs.
  {
    const parts = await call(() => window.__printInfill.partCount());
    check('panel/one-darkness-row-per-part',
      (await call(() => window.__printInfill.darknessRowCount())) === parts
      && (await call(() => window.__printInfill.darknessRowsInDom())) === parts,
      `${parts} parts, ${await call(() => window.__printInfill.darknessRowsInDom())} rows in the DOM`);

    const segsOf = async () => {
      const out = [];
      for (let i = 0; i < parts; i++) out.push((await snapshot(i)).segs.length);
      return out;
    };
    const both = await segsOf();
    await call(() => window.__printInfill.setDarknessWidget(0, 0));
    await settle();
    const firstOff = await segsOf();
    await call(() => window.__printInfill.setDarknessWidget(0, 100));
    await call(() => window.__printInfill.setDarknessWidget(1, 0));
    await settle();
    const secondOff = await segsOf();
    await call(() => window.__printInfill.setDarknessWidget(1, 100));
    await settle();
    check('tone/darkness-is-per-part',
      both.every(v => v > 0) && firstOff[0] === 0 && firstOff[1] > 0
      && secondOff[1] === 0 && secondOff[0] > 0,
      `both ${JSON.stringify(both)}, part 0 dark 0 -> ${JSON.stringify(firstOff)}, `
      + `part 1 dark 0 -> ${JSON.stringify(secondOff)}`);

    // and a part turned down does not take its OUTLINE with it — light against
    // dark is the whole effect, and it needs the light shape still drawn.
    await call(() => window.__printInfill.setDarknessWidget(0, 0));
    await settle();
    const artSegs = await call(() => window.__printLineArt.stats().strokes);
    await call(() => window.__printInfill.setDarknessWidget(0, 100));
    await settle();
    check('tone/a-light-part-keeps-its-outline', artSegs > 0,
      `${artSegs} line-art stroke segments still drawn while part 0 fills at 0%`);
  }

  // RESERVED LINES, in the page.
  {
    await call(() => window.__printInfill.setWidget('veinWidth', 0));
    await settle();
    const off = await inkReport(FILL_ANGLE);
    await call(() => window.__printInfill.setWidget('veins', 4));
    await call(() => window.__printInfill.setWidget('veinWidth', 6));
    await settle();
    const on = await inkReport(FILL_ANGLE);
    check('reserve/removes-ink-from-the-page', on.ink < off.ink * 0.985 && on.ink > off.ink * 0.5,
      `${off.ink.toFixed(0)} -> ${on.ink.toFixed(0)} px^2 with a 6 px reservation`);
    check('reserve/still-clips-to-the-outline', on.outside === 0, `${on.outside} points outside`);

    // The ink that survives keeps clear of the vein paths the fill reserved
    // against — read from the page, not re-derived.
    const parts = await call(() => window.__printInfill.partCount());
    let closest = Infinity, checked = 0;
    for (let i = 0; i < parts; i++) {
      const snap = await snapshot(i);
      if (!snap.veins.length || !snap.segs.length) continue;
      for (const [x0, y0, x1, y1] of snap.segs) {
        for (const [x, y] of [[x0, y0], [x1, y1], [(x0 + x1) / 2, (y0 + y1) / 2]]) {
          checked++;
          for (const p of snap.veins) {
            for (let k = 0; k + 1 < p.length; k++) {
              closest = Math.min(closest, ptSegDist(x, y, p[k][0], p[k][1], p[k + 1][0], p[k + 1][1]));
            }
          }
        }
      }
    }
    check('reserve/ink-avoids-the-vein-paths', checked > 200 && closest >= 6 / 2 - 0.25,
      `closest of ${checked} inked points is ${closest.toFixed(3)} px from a vein (needs >= 2.75)`);
    check('readout/reports-rows-cut-by-a-vein',
      /cut by a vein/.test(await call(() => window.__printInfill.infillText()))
      && (await call(() => window.__printInfill.stats())).parts.some(p => p.reservedRows > 0),
      'the read-out names the reservation and counts the rows it cut');
    if (shots && SHOTS) await page.screenshot({ path: path.join(SHOTS, 'gate-tone-veins.png') });
  }

  // THE NIB. It is the fill's mark width AND its cost: rows are laid at
  // 0.80 x the nib, so a fatter nib is fewer rows for the same solid shape.
  {
    await call(() => window.__printInfill.setWidget('veinWidth', 0));
    await call(() => window.__printInfill.setWidget('fillWeight', 1.1));
    await settle();
    const fine = await call(() => window.__printInfill.stats());
    const finePitch = await call(() => window.__printInfill.tonePitch());
    await call(() => window.__printInfill.setWidget('fillWeight', 3.3));
    await settle();
    const fat = await call(() => window.__printInfill.stats());
    const fatPitch = await call(() => window.__printInfill.tonePitch());
    const fatInk = await inkReport(FILL_ANGLE);
    check('nib/sets-the-row-pitch', Math.abs(fatPitch / finePitch - 3) < 0.05,
      `nib 1.1 -> ${finePitch.toFixed(2)} px pitch, nib 3.3 -> ${fatPitch.toFixed(2)} px`);
    const fineRows = fine.parts.reduce((a, p) => a + p.rows, 0);
    const fatRows = fat.parts.reduce((a, p) => a + p.rows, 0);
    check('nib/fewer-rows-still-covers-the-shape',
      fatRows < fineRows * 0.45 && fatInk.outside === 0
      && fatInk.ink > fatInk.shapeArea * 0.85 && fatInk.ink < fatInk.shapeArea * 1.2,
      `${fineRows} rows -> ${fatRows} rows; inked ${fatInk.ink.toFixed(0)} px^2 against `
      + `${fatInk.shapeArea.toFixed(0)} px^2 of outline, ${fatInk.outside} points outside`);
    await call(() => window.__printInfill.setWidget('fillWeight', 1.1));
    await settle();
  }

  // The panel.
  {
    const rows = await call(() => ({
      layers: !document.getElementById('row-infillLayers').hidden,
      curvature: !document.getElementById('row-infillCurvature').hidden,
      gradient: !document.getElementById('row-infillGradient').hidden,
      veins: !document.getElementById('row-infillVeins').hidden,
      nib: !document.getElementById('row-infillFillWeight').hidden,
      spacing: !document.getElementById('infillSpacing').closest('.pose-row').hidden,
      parts: window.__printInfill.partsBlockVisible(),
    }));
    await call(() => window.__printInfill.setMode('hatch'));
    await settle();
    const hatchRows = await call(() => ({
      layers: !document.getElementById('row-infillLayers').hidden,
      gradient: !document.getElementById('row-infillGradient').hidden,
      veins: !document.getElementById('row-infillVeins').hidden,
      nib: !document.getElementById('row-infillFillWeight').hidden,
      spacing: !document.getElementById('infillSpacing').closest('.pose-row').hidden,
      parts: window.__printInfill.partsBlockVisible(),
    }));
    check('panel/rows-match-the-family',
      rows.gradient && rows.veins && rows.nib && rows.parts && !rows.layers && !rows.curvature && !rows.spacing
      && hatchRows.layers && hatchRows.spacing && !hatchRows.gradient && !hatchRows.veins
      && !hatchRows.nib && !hatchRows.parts,
      `tone ${JSON.stringify(rows)} hatch ${JSON.stringify(hatchRows)}`);
    await call(() => window.__printInfill.setMode('tone'));
    await settle();
    check('readout/names-the-vocabulary',
      /TONAL FILL/.test(await call(() => window.__printInfill.infillText()))
      && /UNFILLED PAPER, never a stroke/.test(await call(() => window.__printInfill.infillText())),
      'the read-out says what a reserved line is');
  }

  // The stage is still a LAYER: nothing about the pose or the line work moved.
  {
    const st = await call(() => ({
      pose: { d: window.__printScaffold.droop(), t: window.__printScaffold.twist(),
              rest: window.__printScaffold.isRest() },
      style: window.__printLineArt.style(),
    }));
    check('independence/pose-and-linework-untouched',
      st.pose.rest === true && st.pose.d === 0 && st.pose.t === 0 && st.style.detail === 12,
      `pose ${JSON.stringify(st.pose)} style ${JSON.stringify(st.style)}`);
  }

  // -------------------------------------------------------------------------
  // THE SEPARATE LEAF. Skipped under --negative-control: it is a 21 MB load and
  // none of the mutations touch bundle loading. Everything it asserts about
  // per-part contrast is also asserted on the default bundle above, which the
  // mutants do cover; what it adds is that the two parts are a LEAF and a STEM
  // rather than two halves of one flower.
  if (!mutant && !SKIP_LEAF) {
    log('\n--- the separate leaf ---');
    const buf = readFileSync(path.join(ROOT, LEAF_BUNDLE));
    await page.setInputFiles('#bundleFile',
      { name: 'bloom-stem-leaf-bundle.glb', mimeType: 'model/gltf-binary', buffer: buf });
    await page.waitForFunction(
      () => window.__printScaffold && window.__printScaffold.source === 'bloom-stem-leaf-bundle.glb',
      { timeout: 120000 });
    await page.waitForFunction(() => !!window.__printInfill, { timeout: 120000 });
    await page.waitForTimeout(2500);

    const names = await call(() => window.__printInfill.partNames());
    check('leaf/bundle-has-a-separate-leaf-part',
      names.includes('leaf') && names.includes('stem') && names.includes('bloom'),
      `parts: ${names.join(', ')}`);

    await call(() => { window.__printLineArt.setDetailWidget(12); window.__printLineArt.setWeightWidget(1.2); });
    await call(() => window.__printInfill.setMode('tone'));
    await call(() => window.__printInfill.setWidget('gradient', 0));
    await call(() => window.__printInfill.setWidget('veinWidth', 0));
    await settle();

    const li = names.indexOf('leaf'), si = names.indexOf('stem');
    // Frame the LEAF, or it is a twenty-pixel speck beside a 92-unit bloom and
    // nothing measured on it means anything.
    const box = await call(() => window.__printScaffold.partBox('leaf'));
    check('leaf/is-its-own-node', !!box, box ? `bbox ${JSON.stringify(box.min.map(v => +v.toFixed(1)))} .. ${JSON.stringify(box.max.map(v => +v.toFixed(1)))}` : 'no node named leaf');
    if (box) {
      const c = box.min.map((v, i) => (v + box.max[i]) / 2);
      const r = Math.max(...box.max.map((v, i) => v - box.min[i]));
      // Looking down the leaf's thin axis (it is a flat solid), close enough
      // that it is most of the viewport rather than a speck beside the bloom.
      await call(([p, t]) => window.__printScaffold.setView(p, t),
        [[c[0] + r * 0.25, c[1] - r * 1.5, c[2] + r * 0.25], c]);
      await settle();
    }

    const leafSnap = await snapshot(li);
    check('leaf/has-a-silhouette-of-its-own', leafSnap.frame.ok && leafSnap.sil.length > 8,
      `${leafSnap.sil.length} oriented silhouette edges`);

    if (leafSnap.frame.ok && leafSnap.segs.length) {
      const fr = rebuildFrame(leafSnap.sil);
      // matched to the fill's own scan direction, for the reason containsExact
      // spells out above
      const la = FILL_ANGLE * Math.PI / 180, lca = Math.cos(la), lsa = Math.sin(la);
      const idx = new ScanIndex(fr, lca, lsa, 1);
      let total = 0, outside = 0, worst = 0;
      for (const [x0, y0, x1, y1] of leafSnap.segs) {
        for (const [x, y] of [[x0, y0], [x1, y1], [(x0 + x1) / 2, (y0 + y1) / 2]]) {
          total++;
          if (!containsExact(idx, lca, lsa, x, y)) {
            let d = Infinity;
            for (let k = 0; k < fr.n; k++) d = Math.min(d, ptSegDist(x, y, fr.x0[k], fr.y0[k], fr.x1[k], fr.y1[k]));
            if (d > 1.5) { outside++; worst = Math.max(worst, d); }
          }
        }
      }
      check('leaf/fills-inside-its-own-silhouette', total > 100 && outside === 0,
        `${total} measured points, ${outside} outside${outside ? `, worst ${worst.toFixed(2)}` : ''}`);
    } else {
      check('leaf/fills-inside-its-own-silhouette', false, 'the leaf emitted no fill');
    }

    // THE FILL AGAINST THE SHAPE ITSELF, not against the outline. The leaf's
    // projected silhouette is OPEN — 16 of its 114 edges are non-manifold and
    // their third face is dropped, so it comes back three crossings to a row
    // and, before the closure repair, filled to nothing at all. So the area is
    // checked against the projected TRIANGLES, which owe the silhouette
    // nothing: rasterised here at the pitch the fill used.
    {
      const tris = await call(k => window.__printInfill.projectedTriangles(k), li);
      const pitch = leafSnap.pitch;
      let shape = 0;
      if (tris && tris.length) {
        let lo = Infinity, hi = -Infinity;
        for (const t of tris) for (const y of [t[1], t[3], t[5]]) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
        for (let y = Math.ceil(lo); y <= Math.floor(hi); y++) {
          const xs = [];
          for (const [ax, ay, bx, by, cx2, cy2] of tris) {
            const e = [[ax, ay, bx, by], [bx, by, cx2, cy2], [cx2, cy2, ax, ay]];
            const hits = [];
            for (const [x0, y0, x1, y1] of e) {
              if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) hits.push(x0 + (x1 - x0) * (y - y0) / (y1 - y0));
            }
            if (hits.length === 2) xs.push([Math.min(...hits), Math.max(...hits)]);
          }
          if (!xs.length) continue;
          xs.sort((a, b) => a[0] - b[0]);
          let cur = xs[0].slice();
          for (let i = 1; i < xs.length; i++) {
            if (xs[i][0] <= cur[1]) cur[1] = Math.max(cur[1], xs[i][1]);
            else { shape += cur[1] - cur[0]; cur = xs[i].slice(); }
          }
          shape += cur[1] - cur[0];
        }
      }
      let ink = 0;
      for (const [x0, y0, x1, y1] of leafSnap.segs) ink += Math.hypot(x1 - x0, y1 - y0) * pitch;
      check('leaf/fill-matches-the-projected-triangles',
        tris && shape > 1000 && ink > shape * 0.85 && ink < shape * 1.15,
        tris ? `inked ${ink.toFixed(0)} px^2 against ${shape.toFixed(0)} px^2 of projected leaf `
          + `(${((ink / shape - 1) * 100).toFixed(1)}%), from ${tris.length} triangles the outline had no say in`
          : 'projectedTriangles refused — the part is over the cap');
    }

    // THE HEADLINE: two REAL parts at opposite tones, both ways round.
    const segCount = async (i) => (await snapshot(i)).segs.length;
    await call(i => window.__printInfill.setDarknessWidget(i, 100), li);
    await call(i => window.__printInfill.setDarknessWidget(i, 0), si);
    await settle();
    const darkLeaf = [await segCount(li), await segCount(si)];
    if (shots && SHOTS) await page.screenshot({ path: path.join(SHOTS, 'gate-leaf-dark.png') });
    await call(i => window.__printInfill.setDarknessWidget(i, 0), li);
    await call(i => window.__printInfill.setDarknessWidget(i, 100), si);
    await settle();
    const darkStem = [await segCount(li), await segCount(si)];
    if (shots && SHOTS) await page.screenshot({ path: path.join(SHOTS, 'gate-leaf-light.png') });
    check('leaf/tonal-contrast-between-two-real-parts',
      darkLeaf[0] > 0 && darkLeaf[1] === 0 && darkStem[0] === 0 && darkStem[1] > 0,
      `leaf dark -> [leaf ${darkLeaf[0]}, stem ${darkLeaf[1]}] segs; `
      + `stem dark -> [leaf ${darkStem[0]}, stem ${darkStem[1]}]`);

    await call(i => window.__printInfill.setDarknessWidget(i, 100), li);
    await call(() => window.__printInfill.setWidget('veins', 4));
    await call(() => window.__printInfill.setWidget('veinWidth', 5));
    await settle();
    const veined = await call(() => window.__printInfill.stats());
    check('leaf/reserved-veins-on-a-real-leaf',
      veined.parts[li].reservedRows > 0 && veined.parts[li].veinPaths === 9,
      `${veined.parts[li].reservedRows} rows cut by ${veined.parts[li].veinPaths} vein paths`);
    if (shots && SHOTS) await page.screenshot({ path: path.join(SHOTS, 'gate-leaf-veins.png') });

    // Leak witnesses across the swap. The darkness rows are the one piece of
    // per-bundle DOM this family adds, so a rebuild that failed to tear the old
    // set down is invisible everywhere else — it still swaps, still poses and
    // still fills.
    check('swap/darkness-rows-do-not-stack',
      (await call(() => window.__printInfill.darknessRowsInDom())) === names.length
      && (await call(() => window.__printInfill.darknessRowCount())) === names.length,
      `${await call(() => window.__printInfill.darknessRowsInDom())} rows in the DOM `
      + `for ${names.length} parts, after a swap from a 2-part bundle`);
    check('swap/tone-settings-survive',
      (await call(() => window.__printInfill.mode())) === 'tone'
      && (await call(() => window.__printInfill.options())).veinWidth === 5,
      'the family and its settings are a rendering preference, not a property of one bundle');
  }

  check('page/no-errors', errs.length === 0, errs.join(' | '));
  if (!mutant) log(`\n${await call(() => window.__printInfill.infillText())}`);
  await ctxB.close();
  return { checks, details, errs, ok: [...checks.values()].every(Boolean) };
}

// ===========================================================================
const main = await run({ shots: true });
console.log('\npage errors:', main.errs.length ? main.errs : 'none');
const failed = [...main.checks].filter(([, v]) => !v).map(([k]) => k);
console.log(`\n${main.checks.size} checks, ${failed.length} failed${failed.length ? ': ' + failed.join(', ') : ''}`);

let mutantsOK = true;
if (NEG) {
  console.log('\n=== negative control ===');
  const src = readFileSync(path.join(ROOT, 'print-infill.js'), 'utf8');
  const wanted = ONLY ? ONLY.split(',') : null;
  for (const m of MUTANTS) {
    if (wanted && !wanted.includes(m.id)) continue;
    if (!src.includes(m.from)) {
      console.log(`  [FAIL] ${m.id}: mutation did not apply — the source it edits has moved`);
      mutantsOK = false; continue;
    }
    OVERRIDE = { text: src.replace(m.from, m.to) };
    const r = await run({ mutant: m.id });
    OVERRIDE = null;
    const red = [...r.checks].filter(([, v]) => !v).map(([k]) => k);
    const missed = m.breaks.filter(k => !red.includes(k));
    const extra = red.filter(k => !m.breaks.includes(k));
    const ok = missed.length === 0 && extra.length === 0;
    if (!ok) mutantsOK = false;
    console.log(`  [${ok ? 'ok  ' : 'FAIL'}] ${m.id.padEnd(28)} red: ${red.length ? red.join(', ') : '(none)'}`);
    if (missed.length) console.log(`         MISSED (stayed green): ${missed.join(', ')}`);
    if (extra.length) console.log(`         UNCLAIMED (also red): ${extra.join(', ')}`);
    if (!ok) for (const k of [...missed, ...extra]) console.log(`           ${k}: ${r.details.get(k) || '(no detail)'}`);
  }
} else {
  console.log('\n(negative control not run — pass --negative-control to falsify every assertion above)');
}

await browser.close();
server.close();
const ok = main.ok && mutantsOK;
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
