#!/usr/bin/env node
/* bug-wing-audit.mjs [--only 1,18,...] [--out <dir>] — the WING-SHAPE AUDIT
   (bug-project-design-doc.md §13.7). Dev-time, not page code; reads the
   gitignored source sheets in tools/bug-wing-sources/ (sheet-1 .. sheet-4).

   Every shape so far — library #1-#17 and candidates #18-#57, including the
   ones earlier sessions dropped — is laid back over the crop it was fitted
   from and measured, on the ASSEMBLED top-down silhouette (both wings, both
   sides, as the bug is printed), in the crop's own pixels:

     IoU   — overlap of the fitted wings and the source silhouette, outside a
             band round the body (the body is the bug's, not the shape's) and
             with the antennae taken off the source (thin strokes ahead of the
             wing roots);
     worst — the largest distance from either boundary to the other, in mm at
             the fitted bug's scale (the default 72 mm wingspan), with WHICH way
             (the fit MISSES source, or goes PAST it) and WHERE (forewing apex,
             leading edge, outer margin, the fore/hind junction, hindwing outer
             margin, hindwing inner edge, tail, root);
     p95   — the 95th percentile of the same distances (the typical miss).

   A library entry is measured as STORED (applyWingShape onto the crop's own
   fit, so the same transform places it); its refit by today's fitter is
   reported beside it. FIXES are the fit options a verdict's fix uses (a moved
   split, a tolerance, the old split rule) — applied to the same crop and
   measured the same way, so before and after are one instrument.

   Writes <out>/review.html (one large panel per shape, DROP first, then
   FIXABLE, then GOOD) and <out>/audit.json. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as G from '../bug-geometry.js';
import * as F from './bug-wing-library-fit.mjs';
import { encodePNG } from './verify-bug-image-fixtures.mjs';
import { strayContour, STRAY_MAX_MM } from '../bug-image.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'tools/bug-wing-sources');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = path.resolve(opt('--out', path.join(SRC, 'out-audit')));
const ONLY = opt('--only', null) ? opt('--only').split(',').map(Number) : null;
/* --gate <file>: the output of tools/bug-wing-audit-gate.sh on a previous run's
   records.json, quoted in each panel (the record as stored, and the sheet's fit) */
const GATE = (() => { const f = opt('--gate', null); if (!f) return null; const m = new Map(); let cur = null;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) { const h = line.match(/^(ok  |FAIL) library:#(\d+)/); if (h) { cur = { ok: h[1] === 'ok  ', why: [] }; m.set(+h[2], cur); } else if (cur && /^     /.test(line)) cur.why.push(line.trim()); }
  return m; })();

/* the shapes: the library by its own `source`, the candidates by the numbers
   the #18-#57 sheet pinned (ADD_NUMBERS) plus the two numbered on after them */
export const CANDIDATE_SOURCES = { ...F.ADD_NUMBERS, 'sheet-2#10': 56, 'sheet-2#11': 57 };

/* VERDICTS — filled from the panels, one line each. FIXES — the fit options a
   FIXABLE verdict's fix uses; `edit` (optional) hand-adjusts the record after. */
/* The library's ROOT CONVENTION: #1-#17 were fitted when the base bug's root
   pinch was above 0, and at pinch > 0 the fitter centres each root chord on
   its hinge (±half a root width, bug-image.js completeChain's blended arm);
   since the pinch defaults to 0 it keeps the picture's own root ends, which
   on these sheets run the forewing's root ~2 mm back along the body. Today's
   refit of #1 at pinch 0.5 reproduces its stored root to 1e-4. Candidates are
   refitted this way; the record holds outlines only, so the pinch itself is
   not stored and every row is still built at the default pinch. */
export const LIB_ROOT_BASE = (() => { const p = G.defaultParams(); p.wingRootPinch = 0.5; return p; })();
export const VERDICTS = {};
export const FIXES = {};

/* ---- the audit's verdicts (Oct 4), one line each, from the panels ---- */
const STEP = 'the sheet\'s fit put a square STEP on the forewing costa beside the head (the picture\'s own root end held at the thorax, then the costa jumping up); refitted at the library\'s root convention the costa runs smoothly from a centred root chord';
Object.assign(VERDICTS, {
  1: { v: 'GOOD', why: 'IoU 0.982, worst 0.6 mm; split at the real junction; the scalloped hindwing margin kept.' },
  2: { v: 'GOOD', why: 'Hindwing scallops faithful; worst 2.0 mm is the costa beside the head, where the antenna crosses it, a hair high.' },
  3: { v: 'GOOD', why: 'Worst 1.0 mm at the left hindwing margin; split, apex and scallops faithful.' },
  4: { v: 'GOOD', why: 'Faint hindwing scallops smoothed; a small shoulder on the costa beside the head (1.4 mm). Closest neighbour: candidate #22 (2.47 mm).' },
  5: { v: 'GOOD', why: 'Worst 0.9 mm; hindwing scallops present.' },
  6: { v: 'GOOD', why: 'Worst 0.8 mm at the fore/hind junction; the rice-paper outline exact.' },
  7: { v: 'GOOD', why: 'The photo is not symmetric (its left costa dips 2 mm near the head); the fit is the mirror average, as it must be.' },
  8: { v: 'GOOD', why: 'Worst 1.1 mm; the slight hindwing scallops kept.' },
  9: { v: 'GOOD', why: 'Worst 1.0 mm; deep hindwing scallops faithful.' },
  10: { v: 'GOOD', why: 'The blurred hindwing margin is smoothed, which is right; worst 1.2 mm at the junction.' },
  11: { v: 'GOOD', why: 'Worst 1.1 mm at the left apex; scallops faithful.' },
  12: { v: 'GOOD', why: 'Worst 0.6 mm; the ringlet outline exact.' },
  13: { v: 'GOOD', why: 'Worst 1.1 mm (the hindwing inner edge beside the abdomen); scallops faithful.' },
  14: { v: 'GOOD', why: 'Worst 0.9 mm; scallops faithful.' },
  15: { v: 'GOOD', why: 'Long tails kept (inline in the hindwing outline, not a tagged tail group); the hidden hindwing edge is a straight band under the forewing.' },
  16: { v: 'GOOD', why: 'Tagged tail faithful; worst 1.0 mm at the costa.' },
  17: { v: 'GOOD', why: 'Scallops faithful; the costa sits 2.2 mm high beside the head (the antenna base).' },
  18: { v: 'FIXABLE', why: STEP + '. Otherwise faithful (worst 0.6 mm).' },
  19: { v: 'GOOD', why: 'Worst 0.6 mm; the invented hindwing edge runs up under the forewing to the costa, plausibly. Near library #10 (2.81 mm).' },
  20: { v: 'FIXABLE', why: STEP + '. The tails stay inline in the outline.' },
  21: { v: 'GOOD', why: 'Worst 0.6 mm; long narrow forewing and the small rounded hindwing faithful.' },
  22: { v: 'FIXABLE', why: STEP + '. Near library #4 (2.47 mm, over the 2.16 mm duplicate bar); #34 is the same drawing and is dropped.' },
  23: { v: 'FIXABLE', why: STEP + '. The thin hooks at the hindwing tips (0.4 mm strokes, under the 1 mm floor) cannot be fitted or printed and are lost.' },
  24: { v: 'GOOD', why: 'Tagged tail faithful; worst 0.6 mm.' },
  25: { v: 'FIXABLE', why: STEP + ' — that step is also the gate\'s S failure (a 0.53 mm hairline in the SVG), gone after. The hairline tails (single strokes, under the floor) are lost.' },
  26: { v: 'FIXABLE', why: STEP + '. Scallops faithful.' },
  27: { v: 'FIXABLE', why: STEP + '. Scallops faithful.' },
  28: { v: 'GOOD', why: 'Worst 0.6 mm; plain rounded wings faithful.' },
  29: { v: 'FIXABLE', why: STEP + '. Tails inline, faithful. (Struck last session for a stray SVG line: today\'s gate passes it either way.)' },
  30: { v: 'GOOD', why: 'Worst 0.6 mm; the split sits on the forewing\'s trailing edge above the eyespots.' },
  31: { v: 'GOOD', why: 'Dropped last session for a hindwing "79 deg back": the source\'s hindwings do run back to meet at the midline, the visible margin is exact (worst 0.9 mm), and the hidden part runs under the forewing to the thorax as a moth\'s does. Unique (nearest 17 mm).' },
  32: { v: 'GOOD', why: 'Worst 0.6 mm. Near library #4 (3.0 mm).' },
  33: { v: 'GOOD', why: 'Worst 0.6 mm; the small squared hindwing faithful.' },
  34: { v: 'DROP', why: 'The same drawing as #22 (the sheet repeats its second row as its last); 1.75 mm from #22 as recorded (2.05 mm on the sheet), under the 2.16 mm duplicate bar.' },
  35: { v: 'GOOD', why: 'Worst 0.9 mm at a small dent near the hindwing\'s inner corner; split along the forewing\'s swept trailing edge.' },
  36: { v: 'FIXABLE', why: 'The sheet\'s fit set the whole forewing root behind its hinge, so the fore and hind roots STACK (gate R fails, -0.16 mm); at the library\'s root convention they are ordered.' },
  37: { v: 'FIXABLE', why: 'The sheet\'s fit was UNDER THE FLOOR (a thin finger on the hindwing\'s inner edge along the abdomen) and its roots stacked (gate R, -0.55 mm); at the library\'s root convention both are gone.' },
  38: { v: 'GOOD', why: 'Worst 1.5 mm at the hindwing margin, whose small scallops are smoothed.' },
  39: { v: 'FIXABLE', why: 'A knob on the forewing costa at the shoulder (the picture\'s root end); gone at the library\'s root convention. Moth: forewing swept over the hindwing, split along its trailing edge. (Struck last session for a stray line: the gate passes it.)' },
  40: { v: 'GOOD', why: 'Scalloped forewing margin and tailed hindwing faithful; the hidden hindwing is a narrow blade along the body, as this moth hides it. (The 10 mm "miss" on the first pass was the feathered antennae.) At the library\'s root convention the rounded edge folded once (a 0.52 mm hairline, gate S), so the record takes the fitter\'s own fold repair at a 0.96 mm tolerance: IoU 0.980 -> 0.970, worst 1.4 mm, as the sheet\'s own fit had.' },
  41: { v: 'GOOD', why: 'Worst 1.8 mm at the costa beside the head (antenna); faithful elsewhere.' },
  42: { v: 'FIXABLE', why: 'A spike on the forewing costa beside the head, where a watermark stroke touches it; gone at the library\'s root convention.' },
  43: { v: 'FIXABLE', why: 'The antenna bases were fitted as a KNOB on the forewing costa (the gate\'s S failure, a 0.60 mm hairline), and a watermark stroke cut a dip into the costa; the knob goes at the library\'s root convention, the dip by deleting its two points.' },
  44: { v: 'GOOD', why: 'Worst 1.0 mm; the angular apex and step on the costa are the drawing\'s own.' },
  45: { v: 'FIXABLE', why: STEP + ' (a small one, 1.4 mm). Tagged tail faithful; the 5.8 mm "miss" is a watermark stroke running on from the tail tip, not wing.' },
  46: { v: 'GOOD', why: 'Worst 0.9 mm at the small lobe on the hindwing margin.' },
  47: { v: 'GOOD', why: 'The ragged costa is the drawing\'s own; the 2.5 mm "miss" is a watermark stroke.' },
  48: { v: 'FIXABLE', why: 'The CLUB TAILS were lost (the ~1 mm stalks are dropped as clutter); fitted from a silhouette grown 2 px below 60% of the crop they come back, the clubs drawn as tapering tails. Fragile: growing from 65% loses them again.' },
  49: { v: 'GOOD', why: 'Worst 1.3 mm at the notch in the forewing margin, which is the drawing\'s own.' },
  50: { v: 'DROP', why: 'Luna-type moth: the fitter takes the long tails, which converge under the body, as the abdomen, and the hindwing comes out a comma; a flat picture cannot separate them.' },
  51: { v: 'GOOD', why: 'Worst at a watermark stroke (not wing); a small bump on the costa near the shoulder (under 1 mm).' },
  52: { v: 'GOOD', why: 'The crop also holds a luna moth (the two touch through a watermark stroke); the fitter took only the butterfly, and the fit is faithful (worst 1.3 mm). The moth is not a candidate.' },
  53: { v: 'FIXABLE', why: 'A spike on the forewing costa near the apex, where a watermark stroke crosses it; deleted (one point). Tagged tail faithful.' },
  54: { v: 'FIXABLE', why: 'The sheet\'s fit set the whole forewing root behind its hinge, so the roots STACK (gate R, -0.55 mm); ordered at the library\'s root convention. The 4.1 mm "miss" is watermark text.' },
  55: { v: 'FIXABLE', why: 'The CLUB TAILS were lost; fitted from a silhouette grown 1 px below 60% of the crop they come back (worst 7.0 -> about 1 mm). Fragile: growing from 70% loses them again.' },
  56: { v: 'FIXABLE', why: 'A bump-and-dip on the forewing costa at the shoulder (the picture\'s root end); smooth at the library\'s root convention.' },
  57: { v: 'FIXABLE', why: STEP + '. The forewing drops from 31 control points to 11 with the same IoU (0.990).' },
});

/* crop preparations a FIX may use — for the FITTER only; every measurement is
   against the untouched crop */
const swapSil = (c, sil) => ({ ...c, sil, img: c.img });
/* grow the silhouette by r px (from row yFrac of the crop down): a tail stalk
   narrower than the fitter's clutter opening survives it */
export const growSil = (r, yFrac = 0) => (c) => {
  const { width: W, height: H, data } = c.sil, M = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) M[k] = data[4 * k] < 128 ? 1 : 0;
  const out = new Uint8ClampedArray(data);
  for (let y = Math.floor(yFrac * H); y < H; y++) for (let x = 0; x < W; x++) {
    let on = false; for (let dy = -r; dy <= r && !on; dy++) for (let dx = -r; dx <= r && !on; dx++) { if (dx * dx + dy * dy > r * r) continue; const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && M[Y * W + X]) on = true; }
    if (on) { const d = 4 * (y * W + x); out[d] = out[d + 1] = out[d + 2] = 20; }
  }
  return swapSil(c, { width: W, height: H, data: out });
};
/* keep only what lies below the narrowest row of the silhouette's middle
   third (a crop that holds two butterflies one above the other) */
export const keepLower = (c) => {
  const { width: W, height: H, data } = c.sil; let best = -1, bn = Infinity;
  for (let y = Math.floor(H / 3); y < Math.floor(2 * H / 3); y++) { let n = 0; for (let x = 0; x < W; x++) if (data[4 * (y * W + x)] < 128) n++; if (n < bn) { bn = n; best = y; } }
  const blank = (img) => { const o = new Uint8ClampedArray(img.data); for (let y = 0; y <= best; y++) for (let x = 0; x < W; x++) { const d = 4 * (y * W + x); o[d] = o[d + 1] = o[d + 2] = img === c.sil ? 245 : 255; } return { width: W, height: H, data: o }; };
  return { ...c, sil: blank(c.sil), img: blank(c.img) };
};

FIXES[48] = { what: 'the silhouette grown 2 px below 60% of the crop for the fit (the club-tail stalks, ~1 mm, are dropped as clutter otherwise)', prep: growSil(2, 0.6) };
FIXES[55] = { what: 'the silhouette grown 1 px below 60% of the crop for the fit (the club-tail stalks are dropped as clutter otherwise)', prep: growSil(1, 0.6) };
/* hand edits: delete control points, each GUARDED by the point it expects, so
   a refit that moves them refuses rather than deleting the wrong point */
const dropPoints = (pair, expect) => (rec) => {
  const P = rec[pair].points;
  for (const [i, q] of expect) if (!P[i] || Math.hypot(P[i][0] - q[0], P[i][1] - q[1]) > 2e-3) throw new Error(`hand edit: ${pair} point ${i} is ${JSON.stringify(P[i])}, expected ${JSON.stringify(q)}`);
  const drop = new Set(expect.map(([i]) => i));
  rec[pair].points = P.filter((_, i) => !drop.has(i));
  return rec;
};
FIXES[43] = { what: 'two forewing points deleted: the dip a watermark stroke cut into the costa (points 3 and 4)', edit: dropPoints('fore', [[3, [0.62209, -0.03914]], [4, [0.66616, -0.02596]]]) };
FIXES[53] = { what: 'one forewing point deleted: the spike a watermark stroke raised on the costa near the apex (point 6)', edit: dropPoints('fore', [[6, [0.57531, 0.39393]]]) };

/* ------------------------------------------------------------------ */
const inv = (M) => { const [a, b, c, d, e, f] = M, det = a * d - b * c; return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det]; };
const ap = (M, x, y) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];
function rasterLoop(L, W, H, out) {          // even-odd fill of ONE closed loop (px coords), OR-ed into out
  const tmp = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) {
    const y = j + 0.5, xs = [];
    for (let k = 0; k < L.length; k++) {
      const [x0, y0] = L[k], [x1, y1] = L[(k + 1) % L.length];
      if ((y0 <= y) !== (y1 <= y)) xs.push(x0 + (y - y0) * (x1 - x0) / (y1 - y0));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) { const i0 = Math.max(0, Math.ceil(xs[k] - 0.5)), i1 = Math.min(W - 1, Math.floor(xs[k + 1] - 0.5)); for (let i = i0; i <= i1; i++) tmp[j * W + i] ^= 1; }
  }
  for (let k = 0; k < W * H; k++) if (tmp[k]) out[k] = 1;
}
function dilate(M, W, H, r) {
  const out = new Uint8Array(W * H), R = Math.ceil(r);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (M[y * W + x])
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H) out[Y * W + X] = 1;
    }
  return out;
}
const erode = (M, W, H, r) => { const n = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) n[k] = M[k] ? 0 : 1; const d = dilate(n, W, H, r); for (let k = 0; k < W * H; k++) d[k] = d[k] ? 0 : 1; return d; };
function boundary(M, W, H, skip) {
  const pts = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x; if (!M[k] || (skip && skip[k])) continue;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1 || !M[k - 1] || !M[k + 1] || !M[k - W] || !M[k + W]) pts.push([x + 0.5, y + 0.5]);
  }
  return pts;
}
function grid(P, cell) {
  const g = new Map(); for (const p of P) { const key = `${Math.floor(p[0] / cell)},${Math.floor(p[1] / cell)}`; (g.get(key) || g.set(key, []).get(key)).push(p); }
  return { near(q) { let best = Infinity, bp = null; const cx = Math.floor(q[0] / cell), cy = Math.floor(q[1] / cell);
    for (let r = 0; r < 60; r++) { for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; for (const p of g.get(`${cx + dx},${cy + dy}`) || []) { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (d < best) { best = d; bp = p; } } } if (bp && Math.sqrt(best) < r * cell) break; }
    return [Math.sqrt(best), bp]; } };
}
const outerLoop = (m, part) => { const Ls = G.contourLoops(m, part); let best = null, ba = -1; for (const L of Ls) { let a = 0; for (let k = 0; k < L.length; k++) { const p = L[k], q = L[(k + 1) % L.length]; a += p[0] * q[1] - q[0] * p[1]; } if (Math.abs(a) > ba) { ba = Math.abs(a); best = L; } } return best; };

/* Measure params P (the bug as the shape would print) against crop c placed by
   the fit transform M (crop px -> world mm, y up). */
export function measure(P, M, c, split) {
  const m = G.buildBug(P), Mi = inv(M), W = c.img.width, H = c.img.height, mmPerPx = Math.hypot(M[0], M[1]);
  const wings = m.parts.filter((q) => /^wing\d$/.test(q.kind));
  const loopsW = wings.map((part) => ({ kind: part.kind, side: part.side, L: outerLoop(m, part) }));
  const body = m.parts.find((q) => q.kind === 'body');
  const bodyL = G.contourLoops(m, body);
  const toPx = (L) => L.map(([x, y]) => ap(Mi, x, y));
  const fit = new Uint8Array(W * H); for (const w of loopsW) rasterLoop(toPx(w.L), W, H, fit);
  const bodyM = new Uint8Array(W * H); for (const L of bodyL) rasterLoop(toPx(L), W, H, bodyM);
  const bodyZone = dilate(bodyM, W, H, 1.2 / mmPerPx);
  // ... and the body COLUMN: the source's own body (often longer or wider than
  // the bug's) cannot be fitted by a wing and is not the shape's
  const bodyHalf0 = Math.max(...bodyL.flat().map((p) => Math.abs(p[0])));
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (Math.abs(ap(M, i + 0.5, j + 0.5)[0]) < bodyHalf0 + 1.0) bodyZone[j * W + i] = 1;
  // the source silhouette, antennae (thin strokes AHEAD of the wing roots) off
  const sil = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) sil[k] = c.sil.data[4 * k] < 128 ? 1 : 0;
  const r = Math.max(2, 0.7 / mmPerPx), open = dilate(erode(sil, W, H, r), W, H, r);
  const fy = Math.max(...wings.map((q) => (q.meta.planform ? 0 : 0))) || 0;   // wing roots stand about y = 0
  const src = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (!sil[k]) continue; if (open[k]) { src[k] = 1; continue; } const [, y] = ap(M, i + 0.5, j + 0.5); if (y < fy - 2) src[k] = 1; }
  let inter = 0, uni = 0, a = 0, b = 0;
  // the MIDLINE GAP: source pixels inboard of the fitted wings' own inner edge
  // on that row (between the hindwings, beside a broad moth body; between the
  // forewings, a feathered antenna) are body, not wing — excluded like the body
  // column; so is anything AHEAD of the roots on a row no wing reaches and more
  // than 2 mm from the fit (an antenna above the wingtips — a wingtip the fit
  // falls short of by less is still counted)
  const innerR = new Float64Array(H).fill(Infinity), innerL = new Float64Array(H).fill(Infinity);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (!fit[k] || bodyM[k]) continue; const x = ap(M, i + 0.5, j + 0.5)[0]; if (x >= 0) innerR[j] = Math.min(innerR[j], x); else innerL[j] = Math.min(innerL[j], -x); }
  const gfit = grid(boundary(fit, W, H, null), 6);
  const skip = bodyZone.slice();
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (!src[k] || fit[k]) continue; const x = ap(M, i + 0.5, j + 0.5)[0]; const inn = x >= 0 ? innerR[j] : innerL[j]; if (inn > Math.abs(x) && (inn < Infinity || (ap(M, i + 0.5, j + 0.5)[1] > 0 && gfit.near([i + 0.5, j + 0.5])[0] * mmPerPx > 2))) skip[k] = 1; }
  inter = 0; uni = 0; a = 0; b = 0;
  for (let k = 0; k < W * H; k++) { if (skip[k]) continue; const s = src[k], f = fit[k]; if (s && f) inter++; if (s || f) uni++; if (s) a++; if (f) b++; }
  const Bs = boundary(src, W, H, null), Bf = boundary(fit, W, H, null);
  const gs = grid(Bs, 6), gf = grid(Bf, 6);
  // WORST: one-sided, over AREA — every source pixel the fit leaves uncovered
  // (its distance to the fit) and every fitted pixel outside the source (its
  // distance to the source); p95 / mean: every point of the SOURCE outline's
  // distance to the fitted outline (the true outline, how far the fit is from it)
  // the ROOT ZONE (within 3 mm of the body's edge) is reported apart: there the
  // bug's own body and root tab meet the wing, and a difference is the body's
  let worst = { d: -1 }, rootWorst = { d: 0 };
  for (let k = 0; k < W * H; k++) {
    if (skip[k] || src[k] === fit[k]) continue;
    const p = [(k % W) + 0.5, Math.floor(k / W) + 0.5];
    const [d] = (src[k] ? gf : gs).near(p);
    const inRoot = Math.abs(ap(M, ...p)[0]) < bodyHalf0 + 3;
    if (inRoot) { if (d > rootWorst.d) rootWorst = { d, at: p, dir: src[k] ? 'MISSES source' : 'goes PAST source' }; continue; }
    if (d > worst.d) worst = { d, at: p, dir: src[k] ? 'MISSES source' : 'goes PAST source' };
  }
  if (!worst.at) worst = { d: 0 };
  const D = [];
  for (const p of Bs) { const k = Math.floor(p[1]) * W + Math.floor(p[0]); if (skip[k]) continue; D.push(gf.near(p)[0]); }
  D.sort((x, y) => x - y);
  const p95 = D[Math.floor(0.95 * (D.length - 1))] * mmPerPx, mean = D.reduce((s, x) => s + x, 0) / D.length * mmPerPx;
  // WHERE: the nearest fitted outline point, its wing, its outward normal
  let where = '—', worldAt = null;
  if (worst.at) {
    worldAt = ap(M, ...worst.at);
    const q = [Math.abs(worldAt[0]), worldAt[1]];
    let bd = Infinity, bw = null, bk = -1;
    for (const w of loopsW.filter((x) => x.side === 'R')) w.L.forEach((p, k) => { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < bd) { bd = d; bw = w; bk = k; } });
    const L = bw.L, p0 = L[(bk - 3 + L.length) % L.length], p1 = L[(bk + 3) % L.length];
    let nx = p1[1] - p0[1], ny = -(p1[0] - p0[0]); const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    let ar = 0; for (let k = 0; k < L.length; k++) { const s = L[k], t = L[(k + 1) % L.length]; ar += s[0] * t[1] - t[0] * s[1]; }
    if (ar < 0) { nx = -nx; ny = -ny; }
    const xmax = Math.max(...L.map((p) => p[0])), apex = L.reduce((s, p) => (p[0] > s[0] ? p : s), L[0]);
    const bodyHalf = Math.max(...bodyL.flat().map((p) => p[0]));
    const fore = bw.kind === 'wing1';
    const nearSplit = split && Math.hypot(q[0] - split.outer[0], q[1] - split.outer[1]) < 0.08 * xmax;
    const tailRec = P.wings.tail && P.wings.tail.on;
    if (q[0] < bodyHalf + 3) where = 'root';
    else if (nearSplit) where = 'fore/hind junction';
    else if (fore) where = Math.hypot(q[0] - apex[0], q[1] - apex[1]) < 0.15 * xmax ? 'forewing apex' : ny > 0.6 ? 'forewing leading edge' : 'forewing outer margin';
    else if (tailRec && q[1] < Math.min(...L.map((p) => p[1])) + 0.25 * (Math.max(...L.map((p) => p[1])) - Math.min(...L.map((p) => p[1])))) where = 'tail';
    else where = (nx < 0.2 && q[0] < 0.55 * xmax) ? 'hindwing inner edge' : 'hindwing outer margin';
    where += worldAt[0] < 0 ? ' (left side)' : '';
  }
  return {
    model: m, iou: inter / uni, rootWorstMm: rootWorst.d * mmPerPx, rootWorstDir: rootWorst.dir, worstMm: worst.d * mmPerPx, worstDir: worst.dir, where, worstPx: worst.at, worldAt, p95Mm: p95, meanMm: mean,
    areaRatio: b / a, floor: (m.floorViolations || []).map((v) => `pair ${v.pair + 1}${v.kind ? ' ' + v.kind : ''}`),
    loopsW, bodyL, mmPerPx,
  };
}

/* the whole-bug check the gate runs on a library row, on THIS record: the same
   build tools/verify-bug.mjs would make for `library:#N` — run separately by
   tools/bug-wing-audit-gate.sh against a scratch tree with these records in. */

function rec2lib(id, source, r) { return { id, name: '', source, fore: r.fore, hind: r.hind, tail: r.tail || null }; }
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function panelSvg(c, M, meas, split, opts = {}) {
  const W = c.img.width, H = c.img.height, Mi = inv(M), sw = Math.max(W, H) / 380;
  const toPx = (L) => L.map(([x, y]) => ap(Mi, x, y).map((v) => v.toFixed(1)).join(',')).join(' ');
  const col = { wing1: '#e0006f', wing2: '#0072e0' };
  const polys = meas.loopsW.map((w) => `<polygon points="${toPx(w.L)}" fill="${col[w.kind]}" fill-opacity="0.10" stroke="${col[w.kind]}" stroke-width="${sw}" stroke-linejoin="round"/>`).join('');
  const sp = split ? [split.root, split.outer, [-split.root[0], split.root[1]], [-split.outer[0], split.outer[1]]].map((p) => ap(Mi, ...p)) : null;
  const spl = sp ? `<line x1="${sp[0][0]}" y1="${sp[0][1]}" x2="${sp[1][0]}" y2="${sp[1][1]}" stroke="#ff9800" stroke-width="${sw * 1.4}" stroke-dasharray="${sw * 4},${sw * 3}"/><line x1="${sp[2][0]}" y1="${sp[2][1]}" x2="${sp[3][0]}" y2="${sp[3][1]}" stroke="#ff9800" stroke-width="${sw * 1.4}" stroke-dasharray="${sw * 4},${sw * 3}"/>` : '';
  const wp = meas.worstPx ? `<circle cx="${meas.worstPx[0]}" cy="${meas.worstPx[1]}" r="${sw * 9}" fill="none" stroke="#00b050" stroke-width="${sw * 1.6}"/>` : '';
  return `<svg viewBox="0 0 ${W} ${H}"><image href="data:image/png;base64,${opts.png}" width="${W}" height="${H}" opacity="${opts.op ?? 0.55}"/>${polys}${spl}${wp}</svg>`;
}
function exploded(meas) {
  const R = meas.loopsW.filter((w) => w.side === 'R').sort((a, b) => a.kind.localeCompare(b.kind));
  const gap = 4; let x = 0;
  const placed = R.map((w) => { const xs = w.L.map((p) => p[0]), dx = x - Math.min(...xs); x += Math.max(...xs) - Math.min(...xs) + gap; return { kind: w.kind, L: w.L.map(([u, v]) => [u + dx, v]) }; });
  const ys = placed.flatMap((w) => w.L.map((p) => p[1])), y0 = Math.min(...ys), y1 = Math.max(...ys), mg = 2;
  const vb = [-mg, -y1 - mg, x - gap + 2 * mg, y1 - y0 + 2 * mg];
  const col = { wing1: '#e0006f', wing2: '#0072e0' };
  return `<svg viewBox="${vb.join(' ')}">${placed.map((w) => `<polygon points="${w.L.map(([u, v]) => `${u.toFixed(2)},${(-v).toFixed(2)}`).join(' ')}" fill="${col[w.kind]}" fill-opacity="0.12" stroke="${col[w.kind]}" stroke-width="${(vb[2] / 450).toFixed(3)}" stroke-linejoin="round"/>`).join('')}</svg>`;
}
const svgOf = (m) => G.exportSvg(m).svg.replace(/<\?xml[^>]*>/, '').replace(/width="[^"]*"/, '').replace(/height="[^"]*"/, '');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const base = G.defaultParams();
  const crops = new Map();
  for (const n of [1, 2, 3, 4]) {
    const file = path.join(SRC, `sheet-${n}.webp`);
    if (!fs.existsSync(file)) { console.error(`missing ${file} — the source sheets are gitignored; re-attach them`); process.exit(2); }
    F.splitSheet(F.decode(file)).forEach((c, j) => crops.set(`sheet-${n}#${j + 1}`, c));
  }
  const shapes = [
    ...G.WING_LIBRARY.map((s) => ({ id: s.id, source: s.source, lib: s })),
    ...Object.entries(CANDIDATE_SOURCES).map(([source, id]) => ({ id, source })),
  ].sort((a, b) => a.id - b.id).filter((s) => !ONLY || ONLY.includes(s.id));
  const results = [];
  const span = 2 * Math.max(...rwb(base).map((p) => p[0]));
  const { imageToBug } = await import('../bug-image.js');
  const defPinch = base.wingRootPinch;
  /* one fit, measured: `prep` may replace the crop's pixels for the FITTER only
     (the measurement is always against the untouched crop), `edit` hand-adjusts
     the record; the bug is measured at the default root pinch, as a library row
     is built (the fit's base may differ — see LIB_ROOT_BASE) */
  const fitWith = (c, b, { opts = {}, prep = null, edit = null, measurePrep = false } = {}) => {
    const cc = prep ? prep(c) : c;
    let fr = F.fitCrop(cc, b, opts, { refit: true });
    if (!fr.ok) return { ok: false, reason: fr.reason };
    let raw = imageToBug(fr.input === 'silhouette' ? cc.sil : cc.img, b, { ...opts, ...(fr.tolUsed !== 0.6 ? { toleranceMm: fr.tolUsed } : {}) });
    const built = (q, rec) => { const P = G.applyWingShape(q.params, rec); P.wingRootPinch = defPinch; return P; };
    // the fitter's own fold repair (bug-image.js imageToBug: step the tolerance
    // until the rounded edge leaves no stray contour line) judges the bug it
    // fitted; on LIB_ROOT_BASE that is a pinched bug, while a library row is
    // built at the default pinch — so the same repair is run on THAT build
    let strayTol = null;
    const rowOf = (rec) => G.buildBug(G.applyWingShape(G.defaultParams(), rec));   // the library row itself
    const clean = (q, rec) => { const a = G.buildBug(built(q, rec)), r = rowOf(rec); return Math.max(strayContour(a).worst, strayContour(r).worst) <= STRAY_MAX_MM && !a.floorViolations.length && !r.floorViolations.length; };
    if (b !== base && !clean(raw, fr.record)) {
      const want = opts.toleranceMm ?? 0.6;
      for (const f of [0.85, 0.7, 0.55, 0.4, 1.25, 1.6, 2.0]) {
        const t = Math.max(0.1, Math.min(3, want * f));
        const fr2 = F.fitCrop(cc, b, { ...opts, toleranceMm: t }, { refit: false });
        if (!fr2.ok) continue;
        const raw2 = imageToBug(fr2.input === 'silhouette' ? cc.sil : cc.img, b, { ...opts, toleranceMm: t });
        if (clean(raw2, fr2.record)) { fr = fr2; raw = raw2; strayTol = t; break; }
      }
    }
    const record = edit ? edit(JSON.parse(JSON.stringify(fr.record))) : fr.record;
    const P = built(raw, record);
    return { ok: true, fr, record, P, strayTol, meas: measure(P, fr.transform, measurePrep ? cc : c, fr.split) };
  };
  for (const s of shapes) {
    const c = crops.get(s.source), t0 = Date.now();
    const png = encodePNG(c.img).toString('base64');
    const def = fitWith(c, base);
    if (!def.ok) { results.push({ ...s, ok: false, reason: def.reason }); console.log(`#${s.id} ${s.source}: REFUSED ${def.reason}`); continue; }
    let entry;
    if (s.lib) {
      // the library entry AS STORED, placed by today's fit of its own crop
      const record = { fore: s.lib.fore, hind: s.lib.hind, tail: s.lib.tail };
      const raw = imageToBug(def.fr.input === 'silhouette' ? c.sil : c.img, base, def.fr.tolUsed !== 0.6 ? { toleranceMm: def.fr.tolUsed } : {});
      const P = G.applyWingShape(raw.params, record); P.wingRootPinch = defPinch;
      entry = { ...s, ok: true, fr: def.fr, record, P, meas: measure(P, def.fr.transform, c, def.fr.split), png, c, refitDiff: shapeDist(base, s.lib, fitWith(c, LIB_ROOT_BASE).record) };
    } else {
      // BEFORE: the fit the #18-#57 sheet showed (the default bug, root pinch 0);
      // the RECORD: refitted at the library's root convention, plus any fix
      const fx = FIXES[s.id] || {};
      const main = fitWith(c, LIB_ROOT_BASE, fx);
      if (!main.ok) { results.push({ ...s, ok: false, reason: main.reason }); console.log(`#${s.id}: REFUSED after fix ${main.reason}`); continue; }
      entry = { ...s, ok: true, ...main, png, c, before: def, fixWhat: [fx.what, main.strayTol ? `the fitter's fold repair at tolerance ${main.strayTol.toFixed(2)} mm, judged at the default root pinch` : null].filter(Boolean).join(' + ') || null };
    }
    results.push(entry);
    const f = (x) => x.toFixed(3), m = entry.meas, bm = entry.before && entry.before.meas;
    console.log(`#${s.id} ${s.source}: IoU ${f(m.iou)} worst ${f(m.worstMm)} mm (${m.worstDir}, ${m.where}) p95 ${f(m.p95Mm)} area ${f(m.areaRatio)}${m.floor.length ? ' FLOOR ' + m.floor : ''}${entry.refitDiff != null ? ` refit-vs-stored ${entry.refitDiff.toFixed(2)} mm` : ''}${bm ? ` | before: IoU ${f(bm.iou)} worst ${f(bm.worstMm)} (${bm.where})${bm.floor.length ? ' FLOOR' : ''}` : ''} (${Date.now() - t0} ms)`);
  }
  // nearest other shape (applied to the default bug, as the gallery and the dedupe see it)
  const okR = results.filter((r) => r.ok);
  const bnd = okR.map((r) => rwb(G.applyWingShape(base, r.record)));
  okR.forEach((r, a) => { let best = null; okR.forEach((q, b) => { if (a === b) return; const d = hd(bnd[a], bnd[b]); if (!best || d < best.d) best = { d, id: q.id }; }); r.nearest = best ? { id: best.id, mm: +best.d.toFixed(2), pct: +(100 * best.d / span).toFixed(1) } : null; });
  writeOut(results);
}
function rwb(params) {
  const m = G.buildBug(params), pts = [];
  for (const part of m.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R')) for (const L of G.contourLoops(m, part)) for (let k = 0; k < L.length; k++) {
    const a = L[k], b = L[(k + 1) % L.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.4));
    for (let t = 0; t < n; t++) pts.push([a[0] + (b[0] - a[0]) * t / n, a[1] + (b[1] - a[1]) * t / n]);
  }
  return pts;
}
function hd(A, B) { const one = (P, Q) => { const g = grid(Q, 2); let w = 0; for (const p of P) { const [d] = g.near(p); if (d > w) w = d; } return w; }; return Math.max(one(A, B), one(B, A)); }
function shapeDist(base, a, b) { return hd(rwb(G.applyWingShape(base, a)), rwb(G.applyWingShape(base, b))); }

function writeOut(results) {
  const order = { DROP: 0, FIXABLE: 1, GOOD: 2, undefined: 3 };
  const verdictOf = (r) => VERDICTS[r.id] || {};
  const sorted = results.slice().sort((a, b) => (order[verdictOf(a).v] - order[verdictOf(b).v]) || a.id - b.id);
  const f = (x) => (x == null ? '—' : x.toFixed(3));
  const stats = (r, meas, fr) => `IoU <b>${f(meas.iou)}</b> · worst <b>${f(meas.worstMm)} mm</b> — fit ${meas.worstDir || ''} at the <b>${meas.where}</b> (green ring) · root zone ${f(meas.rootWorstMm)} mm · p95 ${f(meas.p95Mm)} mm · mean ${f(meas.meanMm)} mm · fitted/source area ${f(meas.areaRatio)}${meas.floor.length ? ` · <b class="bad">FLOOR: ${meas.floor.join(', ')}</b>` : ''}${fr ? ` · points ${fr.fit.map((q) => q.points).join(' / ')} · max dev ${fr.fit.map((q) => q.maxDevMm).join(' / ')} mm · split ${fr.splitMode || '—'}${fr.tolUsed !== 0.6 ? ` · refit at tol ${fr.tolUsed}` : ''} · tail ${r.record && r.record.tail ? 'yes' : 'no'}` : ''}`;
  const panel = (r) => {
    const v = verdictOf(r);
    if (!r.ok) return `<section class="p drop"><h2>#${r.id} <span class="v">${esc(v.v || 'UNRULED')}</span> <small>${esc(r.source)}</small></h2><p class="why">REFUSED by the fitter: ${esc(r.reason)}</p></section>`;
    const row = (meas, fr, label) => `<div class="pics"><div class="cell big"><div class="cap">${label}: fitted outline ON the source (fore <span style="color:#e0006f">magenta</span>, hind <span style="color:#0072e0">blue</span>, split <span style="color:#ff9800">orange</span>)</div>${panelSvg(r.c, fr.transform, meas, fr.split, { png: r.png })}</div><div class="cell"><div class="cap">exploded — fore | hind (right side, root left)</div>${exploded(meas)}</div><div class="cell"><div class="cap">assembled SVG</div>${svgOf(meas.model)}</div></div><p class="st">${stats(r, meas, fr)}</p>`;
    const showBefore = !r.lib && r.before && (v.v === 'FIXABLE' || r.fixWhat);
    const what = `refitted at the library's root convention${r.fixWhat ? ' + ' + r.fixWhat : ''}`;
    const head = r.lib ? '<p class="cap">library entry measured AS STORED; the orange split line is today&#39;s refit of the same crop (the stored data carries no split)</p>'
      : showBefore ? '' : `<p class="cap">the record as it would be stored (${esc(what)}); the #18–#57 sheet&#39;s fit measured IoU ${f(r.before.meas.iou)}, worst ${f(r.before.meas.worstMm)} mm</p>`;
    return `<section class="p ${(v.v || 'unruled').toLowerCase()}" id="s${r.id}"><h2>#${r.id} <span class="v">${esc(v.v || 'UNRULED')}</span> <small>${r.lib ? 'LIBRARY' : 'candidate'} · ${esc(r.source)}${r.nearest ? ` · nearest shape #${r.nearest.id} at ${r.nearest.mm} mm (${r.nearest.pct}% of span)` : ''}${r.refitDiff != null ? ` · today's refit is ${r.refitDiff.toFixed(2)} mm from the stored entry` : ''}</small></h2>
<p class="why">${esc(v.why || '')}</p>${GATE ? `<p class="gate">gate, as a library row on the default bug: <b class="${(GATE.get(r.id) || {}).ok ? 'gok' : 'bad'}">${GATE.get(r.id) ? (GATE.get(r.id).ok ? 'PASS' : 'FAIL — ' + esc(GATE.get(r.id).why.join(' | '))) : 'not run'}</b>${!r.lib && GATE.get(r.id + 1000) ? ` · the sheet&#39;s fit: <b class="${GATE.get(r.id + 1000).ok ? 'gok' : 'bad'}">${GATE.get(r.id + 1000).ok ? 'PASS' : 'FAIL — ' + esc(GATE.get(r.id + 1000).why.join(' | '))}</b>` : ''}</p>` : ''}${head}${showBefore ? `<h3>BEFORE — the fit the #18–#57 sheet showed</h3>${row(r.before.meas, r.before.fr, 'before')}<h3>AFTER — ${esc(what)}</h3>` : ''}${row(r.meas, r.fr, showBefore ? 'after' : 'fit')}</section>`;
  };
  const counts = { DROP: 0, FIXABLE: 0, GOOD: 0 }; for (const r of results) if (verdictOf(r).v) counts[verdictOf(r).v]++;
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Wing-shape audit</title><style>
body{font:13px/1.4 ui-monospace,Menlo,monospace;background:#f4f3ee;color:#111;margin:16px auto;max-width:1500px;padding:0 12px}
h1{font-size:18px} h2{font-size:17px;margin:0 0 4px} h3{font-size:13px;margin:10px 0 4px} small{font-weight:normal;color:#555;font-size:12px}
.p{background:#fff;border:1px solid #ccc;border-left:8px solid #999;margin:18px 0;padding:10px 12px}
.drop{border-left-color:#c00} .fixable{border-left-color:#e69500} .good{border-left-color:#2a9d3a}
.v{padding:1px 8px;color:#fff;background:#999;border-radius:3px;font-size:13px} .drop .v{background:#c00} .fixable .v{background:#e69500} .good .v{background:#2a9d3a}
.why{font-size:14px;margin:4px 0 8px}
.pics{display:grid;grid-template-columns:2fr 1.3fr 1fr;gap:8px}
.cell{background:#fafafa;border:1px solid #e5e5e5;height:520px;display:flex;flex-direction:column} .cell svg{flex:1;width:100%;min-height:0}
.cap{font-size:11px;color:#555;padding:2px 4px} .gate{font-size:12px;margin:2px 0 6px} .gok{color:#2a9d3a} .st{font-size:12px} .bad{color:#c00}
nav a{margin-right:6px}
</style>
<h1>Wing-shape audit — library #1–#17 and candidates #18–#57</h1>
<p><b>One finding covers most of the FIXABLE rows.</b> Library #1–#17 were fitted when the base bug's root pinch was above 0, where the fitter centres each wing's root chord on its hinge. Since the pinch defaults to 0 the fitter keeps the picture's own root ends instead, and on these sheets that runs the forewing's root about 2 mm back along the body. That is what put a square STEP on the forewing costa beside the head (a visible notch in the SVG, and the gate's S hairline on #25 and #43), and what STACKED the fore and hind roots on #36, #37 and #54 (gate R). Every candidate's record below is refitted at the library's convention: today's refit of #1 that way lands on its stored root to 1e-4. The record holds outlines only, so every shape is still built at the default root pinch 0. FIXABLE panels show the sheet's fit (BEFORE) against the record (AFTER); GOOD panels show the record, with the sheet's numbers in their caption.</p>
<p>${results.length} shapes · <b style="color:#c00">${counts.DROP} DROP</b> · <b style="color:#e69500">${counts.FIXABLE} FIXABLE</b> · <b style="color:#2a9d3a">${counts.GOOD} GOOD</b>. Order: DROP, then FIXABLE, then GOOD. Each panel: the fitted assembled outline drawn on the source crop at full resolution (zoom in — it is vector over the source pixels), the exploded wings, and the bug's own SVG export. Metrics are on the assembled top-down silhouette, both sides, outside a 1.2 mm band round the body (the body is the bug's, not the shape's), antennae removed from the source; distances in mm at the fitted bug's 72 mm wingspan. The green ring marks the worst deviation.</p>
<nav>${sorted.map((r) => `<a href="#s${r.id}">#${r.id}</a>`).join('')}</nav>
${sorted.map(panel).join('\n')}`;
  fs.writeFileSync(path.join(OUT, 'review.html'), html);
  fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify(results.map((r) => r.ok ? ({ id: r.id, source: r.source, lib: !!r.lib, verdict: verdictOf(r), iou: +r.meas.iou.toFixed(4), worstMm: +r.meas.worstMm.toFixed(3), rootWorstMm: +r.meas.rootWorstMm.toFixed(3), worstDir: r.meas.worstDir, where: r.meas.where, p95Mm: +r.meas.p95Mm.toFixed(3), meanMm: +r.meas.meanMm.toFixed(3), areaRatio: +r.meas.areaRatio.toFixed(3), floor: r.meas.floor, nearest: r.nearest, refitDiffMm: r.refitDiff, record: r.record, before: r.before ? { iou: +r.before.meas.iou.toFixed(4), worstMm: +r.before.meas.worstMm.toFixed(3), where: r.before.meas.where, p95Mm: +r.before.meas.p95Mm.toFixed(3), floor: r.before.meas.floor, record: r.before.record } : null, fixWhat: r.fixWhat || null }) : ({ id: r.id, source: r.source, ok: false, reason: r.reason })), null, 1));
  // every record as a library entry, for tools/bug-wing-audit-gate.sh (the
  // #18-#57 sheet's own fit of a candidate under id + 1000, for comparison)
  const lib = []; for (const r of results) if (r.ok) { lib.push(rec2lib(r.id, r.source, r.record)); if (r.before) lib.push(rec2lib(r.id + 1000, r.source, r.before.record)); }
  fs.writeFileSync(path.join(OUT, 'records.json'), JSON.stringify(lib));
  console.log('wrote', path.join(OUT, 'review.html'));
}
if (import.meta.url === `file://${process.argv[1]}`) main();
