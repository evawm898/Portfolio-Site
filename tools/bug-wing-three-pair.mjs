#!/usr/bin/env node
/* bug-wing-three-pair.mjs [--out <dir>] [--sweep] [--emit <ids>] [--no-3d] — the
   DEV-TIME batch fit behind the THREE-PAIR wing-shape library entries
   (bug-project-design-doc.md §18). Not page code.

   Reads the artwork in tools/bug-wing-sources/ (GITIGNORED, never committed —
   Eva's references) and:
     1. SPLITS each sheet into individual subjects: the sheet is WHITENED above a
        per-sheet luminance (SHEETS[].lum — a grey ground merges neighbours at
        the library fit's 215), then 4-connected components after a small
        closing, components under MIN_AREA_FRAC dropped. A sheet marked
        `bodiless` (wing pairs drawn with no body between them) has its left and
        right wings PAIRED — two components overlapping in y and near each other
        in x — and a BODY PAINTED down the midline: a capsule as wide as the
        narrowest gap between the two wings' inner edges (plus a margin, never
        under BODY_MIN_FRAC of the span), bridging to both wings on the rows
        where they come close, from above the wings' tops to below their
        attachment. The fitter needs a body column to find the wings beside;
        the painted body is a DEV-TIME convenience and nothing of it is kept
        (the record is outlines only, the library has no bodies).
     2. FITS each crop with the shipped image -> bug fitter at THREE pairs
        (bug-image.js, pairs: 3 — one wing mass split at two notches by the
        lobe test, §18) on the default bug at 72 mm and 0.6 mm tolerance, the
        silhouette first, the source pixels if the silhouette is refused; a fit
        under the floor is re-fitted at the nearest tolerance that clears it and
        flagged when none does. The fit at `auto` runs beside it for the report
        (what the two-pair rule would have read).
     3. RECORDS each fit in the library's N-PAIR form (shapePairs): per pair the
        outline turned to angle 0 (canonical, 9 decimals), its measured angle
        (G.wingAngleOf), stretch, and its length as a ratio of the FRONT pair's;
        the tail as the fitter grouped it. Posing the record back must reproduce
        the fitted points to the 5th decimal (reported as poseErrMm).
     4. MEASURES each pair's angle RANGE: the outline rule's span within +-20,
        then (quick) every whole degree built on the default bug with no floor
        violation and no repair note; `--sweep` replaces the quick range with the
        gate's own — every whole degree through EVERY row clause of
        tools/verify-bug.mjs --rows (minutes, N jobs at once), the same
        instrument tools/bug-wing-angles.mjs sweep uses.
     5. WRITES <out>/candidates.json and <out>/review.html (+ .png): per artwork
        the source with the three fitted outlines over it (one colour per pair)
        and each pair's ANGLE LINE from its hinge; the EXPLODED view (each pair
        a complete closed shape, side by side); the assembled bug — SVG export,
        the page's 3D view at 3/4 and a JUNCTION close-up (real page renders
        through a headless Chromium, `--no-3d` to skip); and a VERDICT: the
        measured facts (confidence of both splits, floor, repair notes, the
        gate's J smoothness, the three pairs' distinctness) under an automatic
        GOOD / FIXABLE / DROP, with a hand-written reading beside it (VERDICTS)
        once the page has been looked at.
     6. `--emit 1,3` APPENDS the kept candidates (by candidate number) to
        bug-wing-library.js, ids numbered on from the library's last, in the
        N-pair form. Existing entries are never touched.

   Nothing here is shipped: the library gains entries only after Eva's keep /
   drop list, through --emit. */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as G from '../bug-geometry.js';
import { imageToBug } from '../bug-image.js';
import { encodePNG } from './verify-bug-image-fixtures.mjs';
import { decode } from './bug-wing-library-fit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'tools/bug-wing-sources');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = path.resolve(opt('--out', path.join(SRC, 'out-three')));
const SWEEP = args.includes('--sweep'), NO3D = args.includes('--no-3d'), EMIT = opt('--emit', null);
if (import.meta.url === `file://${process.argv[1]}`) fs.mkdirSync(OUT, { recursive: true });

/* the sheets, by hand: the whitening luminance and whether the wings are
   drawn without a body (then left/right are paired and a body painted) */
export const SHEETS = [
  { file: '1.png', lum: 235, bodiless: false, note: 'a swallowtail, two pairs with tails' },
  { file: '2.png', lum: 200, bodiless: false, note: 'three tattoo butterflies with flourishes' },
  { file: '3.webp', lum: 150, bodiless: false, note: 'nine butterflies on grey, one with three pairs (row 3, left)' },
  { file: '4.png', lum: 215, bodiless: true, note: 'five fairy wing pairs, no body; one with three pairs (middle left)' },
  { file: '5.png', lum: 215, bodiless: true, note: 'one fairy wing pair, no body' },
];
export const CLOSE_PX = 3, MIN_AREA_FRAC = 0.004, KEEP_GROW = 6, PAD_FRAC = 0.3;
export const BODY_MIN_FRAC = 0.025;   // the painted body's half-width is at least this of the span
export const BRIDGE_MAX_FRAC = 0.12;  // the wings are bridged to the body on rows where their gap is under this of the span
export const DISTINCT_BAR = 0.03 * 72 / 41;   // the library's dedupe bar (3% of the 72 mm span) in units of the wing's length: two pairs closer than this are the same shape
const COLORS = ['#d6006f', '#1f6fd6', '#1a8f3c'];   // pair 1, 2, 3 on every picture

/* ---------- 1. split ---------- */
const lumAt = (img, k) => 0.299 * img.data[4 * k] + 0.587 * img.data[4 * k + 1] + 0.114 * img.data[4 * k + 2];
function dilate(M, W, H, r) {
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (M[y * W + x])
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (dx * dx + dy * dy > r * r) continue; const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H) out[Y * W + X] = 1; }
  return out;
}
function erode(M, W, H, r) { const inv = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) inv[k] = M[k] ? 0 : 1; const d = dilate(inv, W, H, r); for (let k = 0; k < W * H; k++) d[k] = d[k] ? 0 : 1; return d; }
function label(M, W, H) {
  const lab = new Int32Array(W * H).fill(-1), comps = [];
  for (let s = 0; s < W * H; s++) {
    if (!M[s] || lab[s] >= 0) continue;
    const id = comps.length, st = [s]; lab[s] = id; let n = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
    while (st.length) {
      const k = st.pop(), x = k % W, y = (k / W) | 0; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const q = Y * W + X; if (M[q] && lab[q] < 0) { lab[q] = id; st.push(q); } }
    }
    comps.push({ id, n, x0, y0, x1, y1 });
  }
  return { lab, comps };
}
function fillHoles(M, W, H) {
  const out = new Uint8Array(W * H).fill(1), st = [];
  const push = (k) => { if (!M[k] && out[k]) { out[k] = 0; st.push(k); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (st.length) { const k = st.pop(), x = k % W, y = (k / W) | 0; if (x > 0) push(k - 1); if (x < W - 1) push(k + 1); if (y > 0) push(k - W); if (y < H - 1) push(k + W); }
  return out;
}
/* the subjects of one sheet: each a set of components (one, or a left/right
   pair), rendered on white with its own pixels only, and — bodiless — a
   painted body; `img` the source pixels, `sil` the filled silhouette */
export function splitSheet(img, sheet) {
  const W = img.width, H = img.height;
  const M = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) M[k] = lumAt(img, k) < sheet.lum ? 1 : 0;
  const C = erode(dilate(M, W, H, CLOSE_PX), W, H, CLOSE_PX);
  for (let k = 0; k < W * H; k++) C[k] = C[k] || M[k];
  const { lab, comps } = label(C, W, H);
  const keep = comps.filter((c) => c.n >= MIN_AREA_FRAC * W * H);
  const mh = keep.map((c) => c.y1 - c.y0).sort((a, b) => a - b)[keep.length >> 1] || 1;
  keep.sort((a, b) => { const ay = (a.y0 + a.y1) / 2, by = (b.y0 + b.y1) / 2; return Math.abs(ay - by) > mh / 3 ? ay - by : (a.x0 + a.x1) - (b.x0 + b.x1); });
  // subjects: single components, or left/right PAIRS on a bodiless sheet
  let subjects = keep.map((c) => [c]);
  if (sheet.bodiless) {
    subjects = []; const used = new Set();
    for (const a of keep) {
      if (used.has(a.id)) continue;
      let best = null;
      for (const b of keep) {
        // b to the right of a (by centre: wings leaning inward have boxes that overlap by a third)
        if (b === a || used.has(b.id) || b.x0 + b.x1 <= a.x0 + a.x1) continue;
        const oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0), hy = Math.min(a.y1 - a.y0, b.y1 - b.y0);
        const gap = b.x0 - a.x1, wa = a.x1 - a.x0, wb = b.x1 - b.x0, wmin = Math.min(wa, wb);
        // a mirror pair: alike in size (a component already holding both wings is 2x wider than a single wing)
        if (oy < 0.6 * hy || gap > 0.8 * wmin || -gap > 0.6 * wmin || Math.max(wa, wb) > 1.5 * wmin || Math.max(a.n, b.n) > 2 * Math.min(a.n, b.n)) continue;
        if (!best || gap < best.gap) best = { b, gap };
      }
      used.add(a.id);
      if (best) { used.add(best.b.id); subjects.push([a, best.b]); } else subjects.push([a]);
    }
  }
  return subjects.map((cs) => {
    const bx0 = Math.min(...cs.map((c) => c.x0)), bx1 = Math.max(...cs.map((c) => c.x1)), by0 = Math.min(...cs.map((c) => c.y0)), by1 = Math.max(...cs.map((c) => c.y1));
    const pad = Math.round(PAD_FRAC * Math.max(bx1 - bx0, by1 - by0));
    const x0 = bx0 - pad, y0 = by0 - pad, w = bx1 - bx0 + 2 * pad + 1, h = by1 - by0 + 2 * pad + 1;
    const inSheet = (X, Y) => X >= 0 && Y >= 0 && X < W && Y < H;
    const ids = new Set(cs.map((c) => c.id));
    const own = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) own[y * w + x] = inSheet(x + x0, y + y0) && ids.has(lab[(y + y0) * W + x + x0]) ? 1 : 0;
    let body = null;
    if (cs.length === 2) {
      // the painted body (crop px): inner edges per row, the narrowest gap
      const [A, B] = cs, span = B.x1 - A.x0;
      const inL = new Float64Array(h).fill(-1), inR = new Float64Array(h).fill(-1);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!own[y * w + x]) continue; const sx = x + x0, sy = y + y0; const id = lab[sy * W + sx]; if (id === A.id) inL[y] = Math.max(inL[y], x); else if (id === B.id && inR[y] < 0) inR[y] = x; }
      let gmin = Infinity, yb0 = Infinity, yb1 = -Infinity;
      for (let y = 0; y < h; y++) if (inL[y] >= 0 && inR[y] >= 0) { gmin = Math.min(gmin, inR[y] - inL[y]); if (inR[y] - inL[y] <= BRIDGE_MAX_FRAC * span) { yb0 = Math.min(yb0, y); yb1 = Math.max(yb1, y); } }
      const cx = (A.x1 + B.x0) / 2 - x0, hw = Math.max(BODY_MIN_FRAC * span, gmin / 2 + 2);
      const yTop = (by0 - y0) - 0.06 * span, yBot = (Number.isFinite(yb1) ? yb1 : by1 - y0) + 0.14 * span;
      body = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dy = y < yTop + hw ? yTop + hw - y : y > yBot - hw ? y - (yBot - hw) : 0;
        if (y >= yTop && y <= yBot && (x - cx) ** 2 + dy * dy <= hw * hw) body[y * w + x] = 1;
        if (y >= yb0 && y <= yb1 && inL[y] >= 0 && inR[y] >= 0 && inR[y] - inL[y] <= BRIDGE_MAX_FRAC * span && x >= inL[y] && x <= inR[y]) body[y * w + x] = 1;
      }
    }
    const grown = dilate(own, w, h, KEEP_GROW);
    const all = own.slice(); if (body) for (let k = 0; k < w * h; k++) if (body[k]) all[k] = 1;
    const fill = fillHoles(all, w, h);
    const data = new Uint8ClampedArray(w * h * 4), sil = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = x + x0, sy = y + y0, s = 4 * (sy * W + sx), d = 4 * (y * w + x);
      if (body && body[y * w + x]) { data[d] = data[d + 1] = data[d + 2] = 40; }
      else if (grown[y * w + x] && inSheet(sx, sy)) { data[d] = img.data[s]; data[d + 1] = img.data[s + 1]; data[d + 2] = img.data[s + 2]; }
      else data[d] = data[d + 1] = data[d + 2] = 255;
      sil[d] = sil[d + 1] = sil[d + 2] = fill[y * w + x] ? 20 : 245;
      data[d + 3] = sil[d + 3] = 255;
    }
    return { box: [x0, y0, w, h], paired: cs.length === 2, img: { width: w, height: h, data }, sil: { width: w, height: h, data: sil } };
  });
}

/* ---------- 2. fit at three pairs ---------- */
let JAG = null;
const JAGGED = () => { if (!JAG) { const src = fs.readFileSync(path.join(ROOT, 'tools/verify-bug.mjs'), 'utf8'); const a = src.indexOf('const JAG_DEADBAND'), b = src.indexOf('function smoothChecks'); JAG = new Function(src.slice(a, b).replace('export function', 'function') + '; return jaggedness;')(); } return JAG; };
/* SPLIT LINES PLACED BY HAND, by candidate name — what a drag on the page's
   pink handles would do, for a source whose second notch is not in the
   silhouette (two lobes drawn overlapping leave no notch: the boundary is a
   drawn line inside the mass, which the fitter cannot see). Each line is
   [outer, root] in CROP FRACTIONS (x, y of the crop's width and height); the
   tool maps them into the fit's own world frame through its transform, exactly
   as the page hands the fitter its handles (o.splits). Said on the page. */
export const SPLIT_OVERRIDES = {
  '4.png#3': [null, [[0.80, 0.56], [0.50, 0.55]]],   // the lower two lobes overlap in the drawing: their boundary is the drawn edge, not a notch
};
export function fit3(c, base, name = '') {
  const over = SPLIT_OVERRIDES[name];
  const run = (extra) => {
    let r = imageToBug(c.sil, base, extra), input = 'silhouette'; if (!r.ok) { const r2 = imageToBug(c.img, base, extra); if (r2.ok) { r = r2; input = 'source pixels'; } }
    if (over && r.ok && extra.pairs === 3 && !extra.splits) {
      // the hand-placed lines, crop px -> world through this fit's own matrix; the lines not overridden stay the fitter's own
      const M = r.transform.matrix, toW = ([fx, fy]) => { const px = fx * c.img.width, py = fy * c.img.height; return [M[0] * px + M[2] * py + M[4], M[1] * px + M[3] * py + M[5]]; };
      const splits = over.map((L, i) => (L ? { outer: toW(L[0]), root: toW(L[1]) } : r.splits ? { outer: r.splits[i].outer, root: r.splits[i].root } : null));
      if (splits.every(Boolean)) { const r3 = imageToBug(input === 'silhouette' ? c.sil : c.img, base, { ...extra, splits }); if (r3.ok) { r = r3; r.handPlaced = over.map((L) => !!L); } }
    }
    return { r, input };
  };
  let { r, input } = run({ pairs: 3 }), tolUsed = 0.6;
  const judged = (q) => G.buildBug(G.applyWingShape(G.defaultParams(), record3(q.params)));   // as the LIBRARY applies it: the default bug, its own root
  if (r.ok && judged(r).floorViolations.length) {
    for (const tol of [0.45, 0.8, 0.35, 1.0, 0.25, 1.3]) { const q = run({ pairs: 3, toleranceMm: tol }); if (q.r.ok && !judged(q.r).floorViolations.length) { r = q.r; input = q.input; tolUsed = tol; break; } }
  }
  const auto = run({}).r;
  const autoLine = auto.ok ? `${auto.mode}: ${auto.pairs.length} pair${auto.pairs.length > 1 ? 's' : ''}` : `refused (${auto.reason})`;
  if (!r.ok) return { ok: false, reason: r.reason, input, autoLine };
  const mFit = G.buildBug(r.params);   // the fitted bug (its own body): the overlay on the source
  const m = judged(r);                 // the library application on the default bug: what is judged
  const rw = m.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R').sort((a, b) => +a.kind.slice(4) - +b.kind.slice(4));
  return {
    ok: true, input, tolUsed, params: r.params, autoLine, mode: r.mode, splits: r.splits || null, handPlaced: r.handPlaced || null, notes: r.notes, transform: r.transform.matrix,
    fit: r.pairs.map((q) => ({ points: q.points, maxDevMm: +q.maxDevMm.toFixed(3), tail: q.tail ? (q.tail.inline ? 'inline' : q.tail.points) : null })),
    overlay: mFit.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R').sort((a, b) => +a.kind.slice(4) - +b.kind.slice(4)).map((part) => G.contourLoops(mFit, part).map((L) => L.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]))),
    floor: (m.floorViolations || []).map((v) => `pair ${v.pair + 1}${v.kind ? ' ' + v.kind : ''}`),
    wings: rw.map((q) => q.meta.planform.slice(1, -1).map(([u, w]) => [+u.toFixed(3), +w.toFixed(3)])),
    smooth: rw.map((q) => { const j = JAGGED()(q.meta.drawnMm, r.params.minDiameter); return j.jagged ? `JAGGED (${j.worst.kind})` : 'smooth'; }),
    hinges: rw.map((_, k) => G.editorFrame(r.params, k).hinge),
    svg: G.exportSvg(m).svg, tris: m.triangleCount, modelNotes: m.notes,
  };
}

/* ---------- 3. the record, N-pair form ---------- */
const r9 = (x) => +x.toFixed(9);
export function record3(params) {
  const R = G.resolveWingPairs(G.normalizeParams(params)), L0 = params.wings.first.length;
  const pairs = R.map((sp, k) => {
    const a = +G.wingAngleOf(sp.points, sp.stretch).toFixed(3);
    // canonical = the posed outline turned by -angle with the root anchors
    // left where the ramped turn puts them (turnWingFree) — not turnWingRaw,
    // which forces them onto u = 0 and so does not invert when an anchor sits
    // outside the ramp's inner radius (a short middle pair's do: half a floor
    // over a 15 mm length is r 0.07); posing (rotateWingBlade) forces u = 0
    // after ITS turn, which lands back on the fitted points (poseErrMm says)
    return { stretch: sp.stretch, lengthRatio: k ? +(sp.length / L0).toFixed(4) : 1, sweep: a, range: null, points: G.turnWingFree(sp.points, sp.stretch, -a).map(([u, w]) => [r9(u), r9(w)]) };
  });
  const tail = params.wings.tail && params.wings.tail.on ? JSON.parse(JSON.stringify(params.wings.tail)) : null;
  const rec = { pairs, tail };
  // posing the record must land on the fitted points (the 5-decimal ones):
  // control point by control point, in the pair's own true planform (mm)
  let worst = 0;
  pairs.forEach((q, k) => {
    const sp = R[k], posed = G.posedWing(q);
    if (posed.points.length !== sp.points.length) { worst = Infinity; return; }
    posed.points.forEach(([u, w], i) => { worst = Math.max(worst, Math.hypot((u - sp.points[i][0]) * sp.length, (w * posed.stretch - sp.points[i][1] * sp.stretch) * sp.length)); });
  });
  rec.poseErrMm = +worst.toFixed(4);
  return rec;
}
export const emitEntry = (id, source, rec) => {
  const w = (q) => `{ stretch: ${q.stretch}, lengthRatio: ${q.lengthRatio}, sweep: ${q.sweep},${q.range ? ` range: [${q.range[0]}, ${q.range[1]}],` : ''} points: ${JSON.stringify(q.points)} }`;
  return `  { id: ${id}, name: "", source: ${JSON.stringify(source)}, pairs: [\n${rec.pairs.map((q) => `      ${w(q)},`).join('\n')}\n    ],\n    tail: ${JSON.stringify(rec.tail)} },`;
};

/* ---------- 4. ranges ---------- */
/* a copy of the applied shape with pair k turned by d (rotateWingBlade on the
   POSED outline; the tail with the bottom pair), or the outline rule's refusal */
export function turnedPair(rec, k, d, base = G.defaultParams()) {
  const p = G.applyWingShape(base, rec), N = p.wingPairs, W = k === 0 ? p.wings.first : k === N - 1 ? p.wings.last : p.wings.unlinked[k];
  const r = G.rotateWingBlade(W.points, W.stretch, d, k === N - 1 && rec.tail ? p.wings.tail : null);
  if (!r.ok) return { ok: false, reason: r.reason };
  W.points = r.points; W.stretch = r.stretch; if (k === N - 1 && r.tail) p.wings.tail = r.tail;
  return { ok: true, params: p };
}
export function quickRange(rec, k) {
  const okAt = (d) => { const t = turnedPair(rec, k, d); if (!t.ok) return false; const m = G.buildBug(t.params); return !m.floorViolations.length && !m.notes.length; };
  let hi = 0, lo = 0; for (let d = 1; d <= 20; d++) { if (!okAt(d)) break; hi = d; } for (let d = 1; d <= 20; d++) { if (!okAt(-d)) break; lo = -d; }
  // MEASURED degrees (the control asks for them): what the last verified raw turn reads
  const p = G.applyWingShape(G.defaultParams(), rec), N = p.wingPairs, W = k === 0 ? p.wings.first : k === N - 1 ? p.wings.last : p.wings.unlinked[k], a0 = G.wingAngleOf(W.points, W.stretch);
  const meas = (d) => { if (!d) return 0; const t = turnedPair(rec, k, d).params, Wt = k === 0 ? t.wings.first : k === N - 1 ? t.wings.last : t.wings.unlinked[k]; const m = G.wingAngleOf(Wt.points, Wt.stretch) - a0; return Math.sign(m) * Math.floor(Math.abs(m) * 10) / 10; };
  return { raw: [lo, hi], range: [Math.max(-20, meas(lo)), Math.min(20, meas(hi))] };
}
/* the gate's own range: every whole degree of the quick span and one past it,
   through verify-bug.mjs --rows, N jobs at once */
async function sweepRanges(cands) {
  const rows = [];
  for (const c of cands) if (c.ok) c.rec.pairs.forEach((q, k) => { const [lo, hi] = c.quick[k].raw; for (let d = Math.max(-20, lo - 1); d <= Math.min(20, hi + 1); d++) { if (!d) continue; const t = turnedPair(c.rec, k, d); if (t.ok) rows.push([`cand ${c.num} pair ${k + 1} ${d > 0 ? '+' : ''}${d}`, t.params]); } });
  const jobs = Math.max(1, Math.min(os.cpus().length, 8)), chunks = Array.from({ length: jobs }, () => []);
  rows.forEach((r, i) => chunks[i % jobs].push(r));
  const res = await Promise.all(chunks.map((ch, i) => new Promise((ok) => {
    const f = path.join(OUT, `rows-${i}.json`); fs.writeFileSync(f, JSON.stringify(ch));
    const pr = spawn(process.execPath, [path.join(ROOT, 'tools/verify-bug.mjs'), '--rows', f], { stdio: ['ignore', 'pipe', 'ignore'] });
    let s = ''; pr.stdout.on('data', (b) => { s += b; }); pr.on('close', () => { fs.unlinkSync(f); ok(s); });
  })));
  const verdict = new Map();
  for (const txt of res) for (const line of txt.split('\n')) { const m = line.match(/^(ok  |FAIL) cand (\d+) pair (\d) ([+-]\d+)$/); if (m) verdict.set(`${m[2]}/${m[3]}/${+m[4]}`, m[1] === 'ok  '); }
  for (const c of cands) if (c.ok) c.rec.pairs.forEach((q, k) => {
    const bad = (d) => verdict.get(`${c.num}/${k + 1}/${d}`) === false || !verdict.has(`${c.num}/${k + 1}/${d}`);
    let hi = 0, lo = 0; for (let d = 1; d <= 20; d++) { if (bad(d)) break; hi = d; } for (let d = 1; d <= 20; d++) { if (bad(-d)) break; lo = -d; }
    const p = G.applyWingShape(G.defaultParams(), c.rec), N = p.wingPairs, W = k === 0 ? p.wings.first : k === N - 1 ? p.wings.last : p.wings.unlinked[k], a0 = G.wingAngleOf(W.points, W.stretch);
    const meas = (d) => { if (!d) return 0; const t = turnedPair(c.rec, k, d).params, Wt = k === 0 ? t.wings.first : k === N - 1 ? t.wings.last : t.wings.unlinked[k]; const m = G.wingAngleOf(Wt.points, Wt.stretch) - a0; return Math.sign(m) * Math.floor(Math.abs(m) * 10) / 10; };
    q.range = [Math.max(-20, meas(lo)), Math.min(20, meas(hi))]; q.rangeSource = 'the gate (every row clause)';
  });
  return rows.length;
}

/* ---------- distinctness: are the three pairs three shapes? ---------- */
const D2R = Math.PI / 180;
function canonicalDense(points, stretch, n = 160) {
  const d = G.sampleOutline(points).map(([u, w]) => [u, w * stretch]);
  const L = [0]; for (let k = 1; k < d.length; k++) L.push(L[k - 1] + Math.hypot(d[k][0] - d[k - 1][0], d[k][1] - d[k - 1][1]));
  const out = []; let j = 0;
  for (let i = 0; i < n; i++) { const t = (L[L.length - 1] * i) / (n - 1); while (j + 1 < L.length - 1 && L[j + 1] < t) j++; const f = (t - L[j]) / Math.max(1e-12, L[j + 1] - L[j]); out.push([d[j][0] + f * (d[j + 1][0] - d[j][0]), d[j][1] + f * (d[j + 1][1] - d[j][1])]); }
  return out.filter(([u, b]) => Math.hypot(u, b) >= 0.15);
}
function hausdorff(A, B) { const one = (X, Y) => { let m = 0; for (const p of X) { let d = Infinity; for (const q of Y) { const e = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (e < d) d = e; } if (d > m) m = d; } return m; }; return Math.sqrt(Math.max(one(A, B), one(B, A))); }
export function distinctness(rec) {
  // each pair's CANONICAL outline (angle 0, units of its own length): the
  // smallest Hausdorff distance over the three pairs, in lengths
  const C = rec.pairs.map((q) => canonicalDense(q.points, q.stretch));
  const d = []; for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) d.push({ i, j, d: +hausdorff(C[i], C[j]).toFixed(4) });
  return d;
}

/* ---------- 5. the review page ---------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
/* Eva's / the reviewer's reading, by candidate name, written after looking at
   the page; the automatic verdict stands where none is written */
export const VERDICTS = {
};
export function autoVerdict(c) {
  if (!c.ok) return ['DROP', `the fitter refused it: ${c.reason}`];
  const facts = [];
  const conf = c.splits ? c.splits.map((s) => s.confident) : [];
  if (c.mode !== 'split3') facts.push(`not three pairs (${c.mode})`);
  if (c.handPlaced && c.handPlaced.some(Boolean)) facts.push(`${c.handPlaced.filter(Boolean).length} split line${c.handPlaced.filter(Boolean).length > 1 ? 's' : ''} placed by hand (the drawn boundary between two overlapping lobes is not a notch of the silhouette)`);
  else if (conf.some((x) => !x)) facts.push(`${conf.filter((x) => !x).length} default split line${conf.filter((x) => !x).length > 1 ? 's' : ''} (no notch found)`);
  if (c.floor.length) facts.push(`under the floor at every tolerance (${c.floor.join(', ')})`);
  if (c.modelNotes.length) facts.push(`repair notes: ${c.modelNotes.join('; ')}`);
  if (c.smooth.some((s) => s !== 'smooth')) facts.push(`J: ${c.smooth.join(' / ')}`);
  const near = c.distinct.filter((d) => d.d < DISTINCT_BAR);
  if (near.length) facts.push(`pairs ${near.map((d) => `${d.i + 1}~${d.j + 1}`).join(', ')} are the same shape within the dedupe bar`);
  if (c.rec.poseErrMm > 0.05) facts.push(`the record does not pose back onto the fit (${c.rec.poseErrMm} mm)`);
  if (c.mode !== 'split3' || c.floor.length) return ['DROP', facts.join('; ')];
  if (facts.length) return ['FIXABLE', facts.join('; ')];
  return ['GOOD', 'three pairs at two found notches, no floor violation, no repair note, every pair smooth and distinct'];
}

async function captures3d(cands) {
  const { chromium } = await import('playwright-core');
  const http = await import('node:http');
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => d.startsWith('chromium-')).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`).find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 1 });
  await page.route('**cdn.jsdelivr.net/**', (route) => { const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', ''); try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); } catch { route.abort(); } });
  await page.route('**fonts.googleapis.com/**', (r) => r.abort()); await page.route('**fonts.gstatic.com/**', (r) => r.abort());
  await page.goto(`${base}/bug.html`); await page.waitForFunction(() => !!window.__bug);
  await page.addStyleTag({ content: '.bg-panel,.bg-view,.bg-header,.bg-edbar,.bg-viewtoggle{visibility:hidden!important}' });
  for (const c of cands) {
    if (!c.ok) continue;
    const p = G.applyWingShape(G.defaultParams(), c.rec);
    await page.evaluate((q) => { window.__bug.setParams(q); window.__bug.flushBuild(); window.__bug.setView('three'); }, p);
    const span = G.wingspanOf(p);
    await page.evaluate(([t, d, dist]) => window.__bug.lookAt(t, d, dist), [[0, -0.1 * span, 0], [1, -0.8, 0.75], 1.25 * span]);
    await page.waitForTimeout(300);
    c.img3d = (await page.screenshot({ type: 'jpeg', quality: 80 })).toString('base64');
    // the junction: the right side of the thorax from ahead, above and outside, close
    const t = [p.thoraxWidth * 0.5, 0, 0], d = [1, 0.55, 0.9], dist = 2.2 * p.thoraxLength * (1 + G.THORAX_PER_PAIR) + 10;
    await page.evaluate(([t, d, dist]) => window.__bug.lookAt(t, d, dist), [t, d, dist]);
    await page.waitForTimeout(200);
    c.imgJunction = (await page.screenshot({ type: 'jpeg', quality: 80 })).toString('base64');
    await page.evaluate(() => window.__bug.setView('top'));
  }
  await browser.close(); server.close();
}

function reviewHtml(cands) {
  const cell = (c) => {
    const crop = `<img src="data:image/png;base64,${c.cropPng}">`;
    const v = c.verdict;
    if (!c.ok) return `<section class="cand drop"><h2>${esc(c.name)} — <span class="v">DROP</span></h2><div class="row"><div class="p">${crop}</div><div class="p msg">REFUSED by the fitter at three pairs:<br>${esc(c.reason)}<br><br>at auto: ${esc(c.autoLine)}</div></div><p class="why">${esc(v[1])}</p></section>`;
    const [w, h] = [c.box[2], c.box[3]], M = c.transform;
    const all = c.overlay.flat(2), xs = all.map((q) => q[0]), ys = all.map((q) => q[1]);
    const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys), mg = 0.1 * Math.max(bx1 - bx0, by1 - by0);
    const vb = [bx0 - mg, -by1 - mg, bx1 - bx0 + 2 * mg, by1 - by0 + 2 * mg], sw = (vb[2] / 320).toFixed(3);
    const pic = (op) => `<g transform="scale(1,-1)"><image href="data:image/png;base64,${c.cropPng}" width="${w}" height="${h}" transform="matrix(${M.join(',')})" opacity="${op}"/></g>`;
    const polys = c.overlay.map((loops, k) => loops.map((L) => `<polygon points="${L.map(([x, y]) => `${x},${-y}`).join(' ')}" fill="${COLORS[k]}" fill-opacity="0.12" stroke="${COLORS[k]}" stroke-width="${sw}"/>`).join('')).join('');
    // the angle line from each hinge: the wing's axis at its measured angle (+ backward), 0.7 of the pair's length
    const lines = c.rec.pairs.map((q, k) => { const [hx, hy] = c.hinges[k], a = q.sweep * D2R, L = 0.7 * c.params.wings.first.length * q.lengthRatio; const ex = hx + L * Math.cos(a), ey = hy - L * Math.sin(a); return `<line x1="${hx}" y1="${-hy}" x2="${ex}" y2="${-ey}" stroke="${COLORS[k]}" stroke-width="${(2 * sw).toFixed(3)}" stroke-dasharray="${(6 * sw).toFixed(2)} ${(3 * sw).toFixed(2)}"/><circle cx="${hx}" cy="${-hy}" r="${(3 * sw).toFixed(3)}" fill="${COLORS[k]}"/><text x="${ex}" y="${-ey}" font-size="${(vb[2] / 28).toFixed(2)}" fill="${COLORS[k]}" font-family="ui-monospace,monospace">${q.sweep.toFixed(1)}°</text>`; }).join('');
    const mirror = c.overlay.map((loops, k) => loops.map((L) => `<polygon points="${L.map(([x, y]) => `${-x},${-y}`).join(' ')}" fill="none" stroke="${COLORS[k]}" stroke-width="${sw}" stroke-dasharray="${(4 * sw).toFixed(2)} ${(3 * sw).toFixed(2)}"/>`).join('')).join('');
    const over = `<svg viewBox="${vb[0] - (bx1 - bx0) - mg} ${vb[1]} ${vb[2] + (bx1 - bx0) + mg} ${vb[3]}">${pic(0.55)}${mirror}${polys}${lines}</svg>`;
    // exploded: each pair alone (built planform, mm), side by side, labelled
    const Wn = c.wings, gap = 4, boxes = Wn.map((P) => { const xs = P.map((q) => q[0]), ys = P.map((q) => q[1]); return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]; });
    let x = 0; const placed = Wn.map((P, k) => { const b = boxes[k], dx = x - b[0]; x += b[1] - b[0] + gap; return P.map(([u, w2]) => [u + dx, w2]); });
    const y0 = Math.min(...boxes.map((b) => b[2])), y1 = Math.max(...boxes.map((b) => b[3])), bot = 0.12 * (x - gap);
    const evb = [-2, -y1 - 2, x - gap + 4, y1 - y0 + 4 + bot];
    const expl = `<svg viewBox="${evb.join(' ')}">${placed.map((P, k) => `<polygon points="${P.map(([u, w2]) => `${u},${-w2}`).join(' ')}" fill="${COLORS[k]}" fill-opacity="0.15" stroke="${COLORS[k]}" stroke-width="${(evb[2] / 400).toFixed(3)}" stroke-linejoin="round"/>`).join('')}${placed.map((P, k) => { const xs = P.map((q) => q[0]), xm = (Math.min(...xs) + Math.max(...xs)) / 2, fs = (evb[2] / 48).toFixed(2); return `<text x="${xm}" y="${-y0 + 0.045 * (x - gap)}" font-size="${fs}" text-anchor="middle" fill="${COLORS[k]}" font-family="ui-monospace,monospace">pair ${k + 1}: ${c.rec.pairs[k].sweep.toFixed(1)}°</text><text x="${xm}" y="${-y0 + 0.085 * (x - gap)}" font-size="${fs}" text-anchor="middle" fill="${COLORS[k]}" font-family="ui-monospace,monospace">×${c.rec.pairs[k].lengthRatio} · ${c.fit[k].points} pts</text>`; }).join('')}</svg>`;
    const svg = c.svg.replace(/<\?xml[^>]*>/, '').replace(/width="[^"]*"/, '').replace(/height="[^"]*"/, '');
    const three = c.img3d ? `<img src="data:image/jpeg;base64,${c.img3d}">` : '<div class="msg">(3D skipped)</div>';
    const junc = c.imgJunction ? `<img src="data:image/jpeg;base64,${c.imgJunction}">` : '<div class="msg">(3D skipped)</div>';
    const ranges = c.rec.pairs.map((q, k) => `pair ${k + 1}: angle ${q.sweep.toFixed(1)}°, range ${q.range ? `${q.range[0]}…${q.range[1]}°` : '—'}${q.rangeSource ? '' : ' (quick: floor + notes)'}, stretch ${q.stretch}, length ×${q.lengthRatio}, ${c.fit[k].points} pts, dev ${c.fit[k].maxDevMm} mm, ${c.smooth[k]}`).join('<br>');
    const dist = c.distinct.map((d) => `${d.i + 1}~${d.j + 1}: ${(d.d * 41).toFixed(2)} mm`).join(' · ');
    const meta = `fitted from the ${c.input} at ${c.tolUsed} mm · ${c.mode} · splits ${c.splits ? c.splits.map((s, i) => (c.handPlaced && c.handPlaced[i] ? 'PLACED BY HAND (as a drag on the page would)' : s.confident ? 'at a found notch' : 'DEFAULT line')).join(' / ') : '—'} · at auto: ${esc(c.autoLine)} · ${c.tris} triangles · floor ${c.floor.length ? c.floor.join(', ') : 'ok'} · notes ${c.modelNotes.length ? esc(c.modelNotes.join('; ')) : 'none'} · fit notes ${c.notes.length ? esc(c.notes.join('; ')) : 'none'} · pose error ${c.rec.poseErrMm} mm · pair distinctness (Hausdorff, canonical, at 41 mm; bar ${(DISTINCT_BAR * 41).toFixed(2)}) ${dist}`;
    return `<section class="cand ${v[0].toLowerCase()}" id="c${c.num}"><h2>#${c.num} — ${esc(c.name)}${c.paired ? ' (left + right paired, body painted)' : ''} — <span class="v">${v[0]}</span> <small>${esc(v[1])}</small>${c.auto[0] !== v[0] ? `<br><small class="auto">automatic reading: ${c.auto[0]} — ${esc(c.auto[1])}</small>` : ''}</h2>
<div class="row"><div class="p big"><div class="t">source with the three fitted outlines (right wings solid, left mirrored dashed) and each pair's angle line from its hinge</div>${over}</div><div class="p big"><div class="t">exploded — each pair a complete closed shape (root at the left, inside the body)</div>${expl}</div></div>
<div class="row"><div class="p"><div class="t">assembled — SVG export</div>${svg}</div><div class="p"><div class="t">assembled — 3D at 3/4</div>${three}</div><div class="p"><div class="t">the junction, close</div>${junc}</div></div>
<p class="meta">${meta}</p><p class="meta">${ranges}</p></section>`;
  };
  const counts = ['GOOD', 'FIXABLE', 'DROP'].map((v) => `${v} ${cands.filter((c) => c.verdict[0] === v).length}`).join(' · ');
  return `<!doctype html><meta charset="utf-8"><title>three-pair wing shapes — review</title><style>
body{font:13px/1.4 ui-monospace,monospace;background:#f4f3ee;color:#111;margin:18px;max-width:1800px}
h1{font-size:18px;margin:0 0 6px} h2{font-size:15px;margin:0 0 6px} h2 small{font-weight:normal;font-size:12px} .auto{color:#555}
.sum{max-width:1700px;margin:0 0 14px}
.cand{border-top:2px solid #bbb;padding:12px 0 8px} .good h2 .v{color:#1a8f3c} .fixable h2 .v{color:#b36b00} .drop h2 .v{color:#a00} .drop{opacity:.75}
.row{display:flex;gap:10px;margin:0 0 8px;flex-wrap:wrap}
.p{background:#fff;border:1px solid #ddd;flex:1 1 380px;min-height:360px;height:380px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;cursor:zoom-in}
.p.big{flex:1 1 760px;height:560px}
.p svg,.p img{max-width:100%;max-height:calc(100% - 22px);width:100%;height:calc(100% - 22px);object-fit:contain}
.t{font-size:11px;color:#444;align-self:flex-start;padding:4px 6px;height:22px;box-sizing:border-box}
.meta{font-size:11.5px;margin:4px 0;max-width:1700px} .msg{color:#a00;padding:10px} .why{font-size:12px}
#zoom{position:fixed;inset:0;background:rgba(10,10,12,.92);display:none;align-items:center;justify-content:center;cursor:zoom-out;z-index:9}
#zoom.on{display:flex} #zoom>*{max-width:96vw;max-height:96vh;width:96vw;height:96vh;background:#fff}
</style><h1>Three-pair wing shapes — the batch fit, for Eva's keep / drop list</h1>
<p class="sum">Every subject of the five artworks fitted at THREE pairs (one wing mass split at two notches by the lobe test; a notch not found gives a DEFAULT line, said in the verdict). ${counts}. Colours: <b style="color:${COLORS[0]}">pair 1</b> <b style="color:${COLORS[1]}">pair 2</b> <b style="color:${COLORS[2]}">pair 3</b>. Angles are the library's convention (hinge to the blade's centroid, + backward). Each pair's RANGE is ${SWEEP ? 'the gate’s own (every whole degree through every row clause)' : 'a QUICK range (every whole degree building with no floor violation and no repair note; the gate’s own sweep is --sweep)'}. Click any panel to zoom.</p>
${cands.map(cell).join('\n')}
<div id="zoom"></div><script>
for (const p of document.querySelectorAll('.p')) p.addEventListener('click', () => { const z = document.getElementById('zoom'); z.innerHTML = ''; const n = p.querySelector('svg,img'); if (!n) return; z.appendChild(n.cloneNode(true)); z.classList.add('on'); });
document.getElementById('zoom').addEventListener('click', (e) => e.currentTarget.classList.remove('on'));
</script>`;
}

async function screenshotPage() {
  try {
    const { chromium } = await import('playwright-core');
    const exe = fs.readdirSync('/opt/pw-browsers').find((d) => /^chromium-\d+$/.test(d));
    const b = await chromium.launch({ executablePath: path.join('/opt/pw-browsers', exe, 'chrome-linux/chrome') });
    const pg = await b.newPage({ viewport: { width: 1840, height: 900 } });
    await pg.goto('file://' + path.join(OUT, 'review.html'));
    await pg.screenshot({ path: path.join(OUT, 'review.png'), fullPage: true });
    await b.close(); console.log('wrote', path.join(OUT, 'review.png'));
  } catch (e) { console.log('(no screenshot: ' + e.message + ')'); }
}

/* the fit's base: the library's root convention — the BLENDED root (pinch
   0.5, tools/bug-wing-audit.mjs's LIB_ROOT_BASE), so the fitter puts each
   pair's two root anchors half a blended root apart either side of the hinge
   (inside the angle ramp's inner radius) rather than at the picture's own root
   ends; every build and range below is on the plain default bug */
export const FIT_BASE = () => { const p = G.defaultParams(); p.wingRootPinch = 0.5; return p; };
async function main() {
  const base = FIT_BASE();
  const cands = [];
  for (const sheet of SHEETS) {
    const file = path.join(SRC, sheet.file);
    if (!fs.existsSync(file)) { console.log(`${sheet.file}: not present (tools/bug-wing-sources/ is gitignored)`); continue; }
    const img = decode(file), crops = splitSheet(img, sheet);
    console.log(`${sheet.file}: ${img.width}x${img.height}, ${crops.length} subject(s)${sheet.bodiless ? ' (paired, body painted)' : ''}`);
    crops.forEach((c, j) => {
      const name = `${sheet.file}#${j + 1}`, t0 = Date.now();
      const e = { num: cands.length + 1, name, sheet: sheet.file, box: c.box, paired: c.paired, cropPng: encodePNG(c.img).toString('base64'), ...fit3(c, base, name) };
      if (e.ok) { e.rec = record3(e.params); e.quick = e.rec.pairs.map((_, k) => quickRange(e.rec, k)); e.rec.pairs.forEach((q, k) => { q.range = e.quick[k].range; }); e.distinct = distinctness(e.rec); }
      e.auto = autoVerdict(e); e.verdict = VERDICTS[name] || e.auto; e.ms = Date.now() - t0;
      console.log(`  #${e.num} ${name}: ${e.ok ? `${e.mode}, pts ${e.fit.map((q) => q.points).join('/')}, angles ${e.rec.pairs.map((q) => q.sweep.toFixed(1)).join('/')}, ranges ${e.rec.pairs.map((q) => q.range.join('..')).join(' ')}, floor ${e.floor.length ? e.floor.join(',') : 'ok'}, pose ${e.rec.poseErrMm} mm` : `REFUSED — ${e.reason}`} · ${e.verdict[0]} (${e.ms} ms)`);
      cands.push(e);
    });
  }
  if (EMIT) return emit(cands);
  if (SWEEP) { const n = await sweepRanges(cands); console.log(`sweep: ${n} rows through the gate's row clauses`); for (const c of cands) if (c.ok) console.log(`  #${c.num}: ranges ${c.rec.pairs.map((q) => q.range.join('..')).join(' ')}`); }
  if (!NO3D) await captures3d(cands);
  fs.writeFileSync(path.join(OUT, 'candidates.json'), JSON.stringify(cands.map(({ cropPng, svg, img3d, imgJunction, overlay, params, ...rest }) => rest), null, 1));
  fs.writeFileSync(path.join(OUT, 'review.html'), reviewHtml(cands));
  console.log(`wrote ${path.join(OUT, 'review.html')}: ${cands.length} candidates`);
  await screenshotPage();
}
/* --emit a,b: append the kept candidates to bug-wing-library.js, ids on from the last */
function emit(cands) {
  const keep = EMIT.split(',').map(Number), file = path.join(ROOT, 'bug-wing-library.js');
  let src = fs.readFileSync(file, 'utf8'), id = Math.max(...G.WING_LIBRARY.map((s) => s.id));
  const add = [];
  for (const n of keep) { const c = cands.find((x) => x.num === n); if (!c || !c.ok) throw new Error(`candidate #${n} is not a fitted candidate`); add.push(emitEntry(++id, `three-${c.name}`, c.rec)); }
  src = src.replace(/\n\];\s*$/, `\n${add.join('\n')}\n];\n`);
  fs.writeFileSync(file, src);
  console.log(`emit: ${add.length} three-pair entr${add.length === 1 ? 'y' : 'ies'} appended, ids ${id - add.length + 1}..${id}`);
}
if (import.meta.url === `file://${process.argv[1]}`) main();
