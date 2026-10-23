#!/usr/bin/env node
/* frame-fold-boundary.mjs — ruling 5 (phase 3a): where does a closed frame's
   INNER EDGE fold, MEASURED, and does the shipped clamp sit on the measured
   side of it? Node only, seconds.

   The clamps in rectSkeleton / ovalSkeleton are analytic (the inner offset of
   a curve folds where the centreline's radius of curvature is under the half
   band, w/2; a step folds where it is shorter than the band). This tool does
   not trust that algebra: it builds a COPY of frame-geometry.js with the
   clamps removed, sweeps the asked value, and BISECTS the onset of a fold on
   the EMITTED inner edge — a fold is any inner-edge segment that runs
   BACKWARDS against its own centreline segment (an offset that has turned
   inside out), the same signal on arcs, ellipses and steps. It then reports
   the measured onset beside the analytic one and the shipped clamp's floor,
   which must sit at least half a feature (MIN_FEATURE_MM / 2, an
   ASSUMPTION) on the safe side: the clamp keeps the inner edge's own radius
   at F/2, so a corner the band cannot carry is held at fold + F/2 and TOLD.

   Usage: node tools/frame-fold-boundary.mjs  (prints a table; exit 1 if any
   measured onset disagrees with the analytic one by more than the bisection
   tolerance, or the clamp sits on the unsafe side). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'frame-geometry.js'), 'utf8');
const UNCLAMP = [
  ['if (sz < lo) { info.clamped.push(`corner radius', 'if (false) { info.clamped.push(`corner radius'],
  ['if (sz < lo) { info.clamped.push(treat === \'eared\'', 'if (false) { info.clamped.push(treat === \'eared\''],
  ['if (k < kLo) {', 'if (false) {'],
  ['if (k > kHi) {', 'if (false) {'],
];
let free = src;
for (const [a, b] of UNCLAMP) { if (free.split(a).length !== 2) { console.log(`FAIL anchor: ${a}`); process.exit(1); } free = free.replace(a, b); }
const tmp = path.join(ROOT, `_frame-fold-free-${process.pid}.mjs`);
fs.writeFileSync(tmp, free);
const Gf = await import(pathToFileURL(tmp).href);
fs.unlinkSync(tmp);
const G = await import(pathToFileURL(path.join(ROOT, 'frame-geometry.js')).href);
const { MIN_FEATURE_MM: F } = await import(pathToFileURL(path.join(ROOT, 'frame-registry.js')).href);

/* a fold on the emitted inner edge: a segment running against its centreline */
/* a fold on EITHER emitted edge: an edge segment running against its
   centreline segment. offsetCurve trims vertices past a join's bisector, so a
   segment is compared through the vertices both polylines keep. */
export function folds(sp, w, Gx = G) {
  let r = 0;
  const n = sp.pts.length;
  for (const d of [-w / 2, w / 2]) {
    const off = Gx.offsetCurve(sp, d);
    const keep = []; for (let i = 0; i < n; i++) if (off[i]) keep.push(i);
    for (let k = 0; k < keep.length; k++) {
      const i = keep[k], j = keep[(k + 1) % keep.length];
      const a = sp.pts[i], b = sp.pts[j], p = off[i], q = off[j];
      if ((b[0] - a[0]) * (q[0] - p[0]) + (b[1] - a[1]) * (q[1] - p[1]) < 0) r++;
    }
  }
  // a fold is also an edge that CROSSES itself (an ear's inner edge loops
  // back through its own step before any segment reverses)
  for (const d of [-w / 2, w / 2]) r += selfCrossings(Gx.offsetPoly(sp, d));
  return r;
}
const segX = (a, b, c, d) => {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d);
  return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9));
};
function selfCrossings(poly) { let n = 0; for (let i = 0; i < poly.length - 1; i++) for (let j = i + 2; j < poly.length - 1; j++) { if (i === 0 && j === poly.length - 2) continue; if (segX(poly[i], poly[i + 1], poly[j], poly[j + 1])) n++; } return n; }
const skel = (Gx, p) => Gx.skeletonFor({ ...G.DEFAULTS, ...p }).spines[0];
/* bisect the onset of folding between a value that folds and one that does not */
function onset(make, w, foldAt, cleanAt) {
  let a = foldAt, b = cleanAt;
  for (let k = 0; k < 60; k++) { const m = (a + b) / 2; if (folds(make(m), w, Gf) > 0) a = m; else b = m; }
  return (a + b) / 2;
}

const rows = [];
for (const w of [6, 18, 30, 40]) {
  // rounded corner: centreline radius r; analytic fold r = w/2
  {
    const make = (r) => skel(Gf, { skeleton: 'rect', cornerTreatment: 'rounded', cornerSize: r, moldingWidth: w, width: 400, height: 600 });
    const m = onset(make, w, 0.01, w);
    const lo = (w + F) / 2;
    rows.push({ what: `rounded corner radius, band ${w}`, measured: m, analytic: w / 2, clamp: lo, side: 'below' });
  }
  // eared step: the inner edge loops back through the ear's own step (a
  // self-crossing) for every sz < w — its last offset step runs from a + sz −
  // w/2 back past a − sz + w/2
  {
    const make = (s) => skel(Gf, { skeleton: 'rect', cornerTreatment: 'eared', cornerSize: s, moldingWidth: w, width: 400, height: 600 });
    rows.push({ what: `eared step, band ${w}`, measured: onset(make, w, 0.01, 2 * w), analytic: w, clamp: w + F, side: 'below' });
  }
  // notched step: each offset step keeps length sz, so it NEVER folds — the
  // measurement is a sweep that must find none; the floor is the feature F
  {
    let n = 0; for (let s = 0.05; s <= 2 * w; s += 0.05) n += folds(skel(Gf, { skeleton: 'rect', cornerTreatment: 'notched', cornerSize: s, moldingWidth: w, width: 400, height: 600 }), w, Gf);
    rows.push({ what: `notched step, band ${w}`, measured: n === 0 ? 0 : NaN, analytic: 0, clamp: F, side: 'below', never: true });
  }
  // oval: the least centreline radius A^2/B (narrow) or B^2/A (wide) equals w/2
  const h = Math.max(80, 3 * w + 20), B = (h - w) / 2;
  {
    const make = (k) => skel(Gf, { skeleton: 'oval', aspect: k, moldingWidth: w, height: h });
    const kf = Math.sqrt((w / 2) / B);
    rows.push({ what: `oval aspect (narrow), band ${w}, height ${h}`, measured: onset(make, w, kf / 3, Math.min(1, 3 * kf)), analytic: kf, clamp: Math.sqrt(((w + F) / 2) / B), side: 'below' });
    const kh = B / (w / 2);
    rows.push({ what: `oval aspect (wide), band ${w}, height ${h}`, measured: onset(make, w, 3 * kh, Math.max(1, kh / 3)), analytic: kh, clamp: B / ((w + F) / 2), side: 'above' });
  }
}
let bad = 0;
console.log('what'.padEnd(44), 'fold measured', '  analytic   ', 'shipped clamp', 'margin');
for (const r of rows) {
  const agree = r.never ? r.measured === 0 : Math.abs(r.measured - r.analytic) <= 1e-3 * Math.max(1, r.analytic);
  const safe = r.side === 'below' ? r.clamp > r.measured : r.clamp < r.measured;
  if (!agree || !safe) bad++;
  if (r.never) { console.log(`${r.what.padEnd(44)} ${(agree ? 'never folds' : 'FOLDS').padStart(12)}  ${'never'.padStart(11)}  ${r.clamp.toFixed(5).padStart(12)}  (the feature floor, not a fold)`); continue; }
  console.log(`${r.what.padEnd(44)} ${r.measured.toFixed(5).padStart(12)}  ${r.analytic.toFixed(5).padStart(11)}  ${r.clamp.toFixed(5).padStart(12)}  ${(r.side === 'below' ? r.clamp - r.measured : r.measured - r.clamp).toFixed(4)}${agree ? '' : '  DISAGREES'}${safe ? '' : '  CLAMP ON THE FOLDING SIDE'}`);
}
// and the shipped builder, at its clamp, folds nowhere
let shippedFolds = 0;
for (const r of rows) {
  const w = +r.what.match(/band (\d+)/)[1];
  const q = r.what.startsWith('rounded') ? { skeleton: 'rect', cornerTreatment: 'rounded', cornerSize: 2, moldingWidth: w, width: 400, height: 600 }
    : r.what.startsWith('notched') ? { skeleton: 'rect', cornerTreatment: 'notched', cornerSize: 2, moldingWidth: w, width: 400, height: 600 }
    : r.what.startsWith('eared') ? { skeleton: 'rect', cornerTreatment: 'eared', cornerSize: 2, moldingWidth: w, width: 400, height: 600 }
    : { skeleton: 'oval', aspect: r.side === 'below' ? 0.4 : 2.5, moldingWidth: w, height: +r.what.match(/height (\d+)/)[1] };
  const m = G.buildFrame(q);
  shippedFolds += folds(m.spines[0], w);
}
console.log(`\nshipped builder at every clamped corner / aspect: ${shippedFolds} folded segments`);
console.log(`${rows.length - bad} of ${rows.length} rows: measured onset = analytic (1e-3), clamp on the safe side (half a feature of inner radius on a curve, a feature on a step)`);
process.exit(bad || shippedFolds ? 1 : 0);
