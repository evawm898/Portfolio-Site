/* tile-geometry.js — the /tile model: ONE tile, its lattice, its curves, the
   editor's operations, the shape guardrails and the SVG exports.

   Pure ES module: no DOM, no three.js. Runs in the page (tile.js) and in Node
   (tools/verify-tile.mjs). Units are millimetres; x right, y up. Read
   tile-design-doc.md §1–§2 before touching any of it.

   THE TILING (doc §1): a lattice of translated copies of one tile whose
   boundary is edge A (bottom, and top = bottom + tB) and edge B (left, and
   right = left + tA). The corners are therefore a parallelogram, forced:
       C0 = 0, C1 = tA, C2 = tA + tB, C3 = tB,
       tA = (pitchA, 0), tB = pitchB·(cos θ, sin θ), θ = the crossing angle.
   A SIMPLE outline of that form tiles the plane (area identity + degree, doc
   §1.2), so simplicity is the ONE validity rule, and every edit that would
   break it is BLOCKED: the operations below return the tile unchanged with the
   reason.

   EDGE POINTS live in LATTICE coordinates (u, v): the point is u·tA + v·tB.
   Edge A's points run u 0→1 with v an offset; edge B's the other way round.
   Each edge is stored ONCE and drawn twice, so an edit to either copy is an
   edit to the edge and the tile always tessellates; a pitch or angle change is
   an affine map of the whole tile, which preserves simplicity.

   THE CURVE LAW is /bug's — centripetal Catmull–Rom, sampleOutline from
   bug-geometry.js (doc §2.2), with SHARP points splitting an edge into runs and
   a SMOOTH corner extended by its PERIODIC neighbour so each chained line is
   C1 through the corner. */

import { sampleOutline, polygonSimple } from './bug-geometry.js';

/* ------------------------------------------------------------------ */
/* Constants — each with its reason                                     */
/* ------------------------------------------------------------------ */

export const PITCH_RANGE = [15, 120];       // mm; below 15 a cookie is a crumb and the pegs crowd the bars
export const ANGLE_RANGE = [30, 150];       // degrees; a bar leans at θ from horizontal when printed, and a thin wall prints cleanly above ~20°
export const CR_PER = 20;                   // samples per Catmull–Rom segment: 0.75 mm spacing on a 15 mm segment, chord error ~0.01 mm at a 7 mm bend
export const MIN_POINT_GAP_MM = 0.05;       // consecutive control points closer than this are REFUSED: the curve law divides by their distance
/* Interior points are clamped into a generous box in lattice coordinates; the
   real limit is simplicity, which the validator enforces. The box only stops a
   point being thrown off into the next county by a stray drag. */
export const EDGE_BOUNDS = { along: [-0.6, 1.6], across: [-0.95, 0.95] };
export const SPIKE_DEPTH_FRAC = 1.0;        // a removed sliver reaching more than this many min-widths past the opened cookie is a SPIKE (a 90° corner reaches 0.21, a 39° corner 1.0)
export const SPIKE_MIN_PX = 3;              // components smaller than this are raster dust
const D2R = Math.PI / 180;

/* ------------------------------------------------------------------ */
/* The tile                                                             */
/* ------------------------------------------------------------------ */

/* The default: a wave on each edge, edge B edge A turned a quarter about C0, so
   the cookie swirls. Points are [u, v, sharp]. */
export function defaultTile() {
  return {
    pitchA: 40, pitchB: 40, angle: 90, cornerSmooth: true,
    edgeA: [[0.3, 0.13, 0], [0.7, -0.13, 0]],
    edgeB: [[-0.13, 0.3, 0], [0.13, 0.7, 0]],
  };
}
export const cloneTile = (t) => ({ ...t, edgeA: t.edgeA.map((p) => p.slice()), edgeB: t.edgeB.map((p) => p.slice()) });

export function latticeVectors(tile) {
  const a = tile.angle * D2R;
  return { tA: [tile.pitchA, 0], tB: [tile.pitchB * Math.cos(a), tile.pitchB * Math.sin(a)] };
}
/* lattice -> mm and back */
export function toMm(tile, u, v) {
  const { tA, tB } = latticeVectors(tile);
  return [u * tA[0] + v * tB[0], u * tA[1] + v * tB[1]];
}
export function toLattice(tile, x, y) {
  const { tA, tB } = latticeVectors(tile);
  const det = tA[0] * tB[1] - tA[1] * tB[0];
  return [(x * tB[1] - y * tB[0]) / det, (tA[0] * y - tA[1] * x) / det];
}
export const cellArea = (tile) => { const { tA, tB } = latticeVectors(tile); return tA[0] * tB[1] - tA[1] * tB[0]; };

const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* An edge's control chain in mm: corner, interior points, corner — with the
   sharp flag of each (a corner is sharp iff the tile's corners are). */
export function edgeChain(tile, which) {
  const { tA, tB } = latticeVectors(tile);
  const t = which === 'A' ? tA : tB;
  const pts = which === 'A' ? tile.edgeA : tile.edgeB;
  const chain = [[0, 0]];
  const sharp = [!tile.cornerSmooth];
  for (const [u, v, s] of pts) { chain.push([u * tA[0] + v * tB[0], u * tA[1] + v * tB[1]]); sharp.push(!!s); }
  chain.push([t[0], t[1]]);
  sharp.push(!tile.cornerSmooth);
  return { chain, sharp, t };
}

/* The dense polyline of one edge, corner to corner, in mm. Each run between
   sharp points is one sampleOutline call; a smooth corner extends its run by
   the periodic neighbour (the previous copy's last interior point, p − t, or
   the next copy's first, p + t) and the extra segment is trimmed off — so the
   segment leaving the corner is shaped by the same three points on both sides
   of it and the chained line is C1 there (doc §2.2).
   Returns pts, seg (the control segment each sample after the first belongs
   to: sample k lies on chain segment seg[k-1]) and ctrl (the dense index of
   each chain point). */
export function edgeDense(tile, which, per = CR_PER) {
  const { chain, sharp, t } = edgeChain(tile, which);
  const n = chain.length;
  const cuts = [0];
  for (let i = 1; i < n - 1; i++) if (sharp[i]) cuts.push(i);
  cuts.push(n - 1);
  const pts = [chain[0].slice()], seg = [], ctrl = [0];
  for (let r = 0; r + 1 < cuts.length; r++) {
    const a = cuts[r], b = cuts[r + 1];
    let run = chain.slice(a, b + 1);
    let pre = 0, post = 0;
    if (a === 0 && tile.cornerSmooth) { run = [sub2(chain[n - 2], t), ...run]; pre = 1; }
    if (b === n - 1 && tile.cornerSmooth) { run = [...run, add2(chain[1], t)]; post = 1; }
    const dense = sampleOutline(run, per);
    const i0 = pre * per, i1 = dense.length - 1 - post * per;
    for (let k = i0 + 1; k <= i1; k++) {
      pts.push(dense[k]);
      seg.push(a + Math.floor((k - i0 - 1) / per));
      if ((k - i0) % per === 0) ctrl.push(pts.length - 1);
    }
  }
  // the corners are written EXACTLY (0 and t), so copies meet bit for bit
  pts[0] = [0, 0]; pts[pts.length - 1] = [t[0], t[1]];
  return { pts, seg, ctrl, chain, sharp, t };
}

/* The closed outline, counter-clockwise: bottom (A), right (B + tA), top
   (A + tB, reversed), left (B, reversed). side[k] says which copy vertex k is
   on and its index in that edge's dense list, for hit-testing. */
export function outline(tile, per = CR_PER) {
  const A = edgeDense(tile, 'A', per), B = edgeDense(tile, 'B', per);
  const { tA, tB } = latticeVectors(tile);
  const pts = [], side = [];
  for (let k = 0; k < A.pts.length - 1; k++) { pts.push(A.pts[k]); side.push(['A', 0, k]); }
  for (let k = 0; k < B.pts.length - 1; k++) { pts.push(add2(B.pts[k], tA)); side.push(['B', 1, k]); }
  for (let k = A.pts.length - 1; k > 0; k--) { pts.push(add2(A.pts[k], tB)); side.push(['A', 1, k]); }
  for (let k = B.pts.length - 1; k > 0; k--) { pts.push(B.pts[k]); side.push(['B', 0, k]); }
  return { pts, side, A, B, tA, tB };
}

export function signedArea(poly) {
  let s = 0;
  for (let i = 0, n = poly.length; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; s += a[0] * b[1] - a[1] * b[0]; }
  return s / 2;
}

/* ------------------------------------------------------------------ */
/* Validity — ONE rule, enforced on every edit                          */
/* ------------------------------------------------------------------ */

export function validate(tile) {
  if (!tile || typeof tile !== 'object') return { ok: false, reason: 'not a tile' };
  for (const k of ['pitchA', 'pitchB', 'angle']) if (!Number.isFinite(tile[k])) return { ok: false, reason: `${k} is not a number` };
  if (tile.pitchA < PITCH_RANGE[0] - 1e-9 || tile.pitchA > PITCH_RANGE[1] + 1e-9 || tile.pitchB < PITCH_RANGE[0] - 1e-9 || tile.pitchB > PITCH_RANGE[1] + 1e-9) return { ok: false, reason: `a pitch is outside ${PITCH_RANGE[0]}–${PITCH_RANGE[1]} mm` };
  if (tile.angle < ANGLE_RANGE[0] - 1e-9 || tile.angle > ANGLE_RANGE[1] + 1e-9) return { ok: false, reason: `the crossing angle is outside ${ANGLE_RANGE[0]}–${ANGLE_RANGE[1]}°` };
  for (const which of ['A', 'B']) {
    const pts = which === 'A' ? tile.edgeA : tile.edgeB;
    if (!Array.isArray(pts)) return { ok: false, reason: `edge ${which} has no point list` };
    for (const p of pts) if (!Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return { ok: false, reason: `an edge ${which} point is not a number pair` };
    const { chain } = edgeChain(tile, which);
    for (let i = 0; i + 1 < chain.length; i++) if (dist2(chain[i], chain[i + 1]) < MIN_POINT_GAP_MM) return { ok: false, reason: `two neighbouring points on edge ${which} coincide` };
  }
  const o = outline(tile);
  if (!polygonSimple(o.pts)) return { ok: false, reason: 'the outline would cross or touch itself' };
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Editor operations — each BLOCKS an invalid result                    */
/* ------------------------------------------------------------------ */

const listOf = (tile, which) => (which === 'A' ? tile.edgeA : tile.edgeB);
/* clamp an interior point into the bounds box, in the edge's own (along, across) */
function clampPoint(which, u, v) {
  const { along, across } = EDGE_BOUNDS;
  return which === 'A' ? [clamp(u, along[0], along[1]), clamp(v, across[0], across[1])] : [clamp(u, across[0], across[1]), clamp(v, along[0], along[1])];
}
function attempt(tile, next, extra = {}) {
  const v = validate(next);
  return v.ok ? { ok: true, tile: next, ...extra } : { ok: false, tile, reason: v.reason };
}
/* Move interior point i of edge `which` to lattice (u, v) — given on the BASE
   copy (the caller subtracts the copy's offset). */
export function movePoint(tile, which, i, uv) {
  const next = cloneTile(tile);
  const p = listOf(next, which)[i];
  if (!p) return { ok: false, tile, reason: 'no such point' };
  [p[0], p[1]] = clampPoint(which, uv[0], uv[1]);
  return attempt(tile, next);
}
/* Insert a point at lattice (u, v) after chain index `after` (0 = right after
   the start corner). Without `after`, the control segment whose curve passes
   nearest the point is used. Returns the new point's interior index. */
export function insertPoint(tile, which, uv, after = null) {
  if (after === null) after = nearestSegment(tile, which, toMm(tile, uv[0], uv[1]));
  const next = cloneTile(tile);
  const list = listOf(next, which);
  const [u, v] = clampPoint(which, uv[0], uv[1]);
  list.splice(after, 0, [u, v, 0]);
  return attempt(tile, next, { index: after });
}
export function nearestSegment(tile, which, q) {
  const d = edgeDense(tile, which);
  let best = Infinity, segBest = 0;
  for (let k = 0; k + 1 < d.pts.length; k++) {
    const e = segDist(q, d.pts[k], d.pts[k + 1]);
    if (e < best) { best = e; segBest = d.seg[k]; }
  }
  return segBest;
}
export function deletePoint(tile, which, i) {
  const next = cloneTile(tile);
  const list = listOf(next, which);
  if (!list[i]) return { ok: false, tile, reason: 'corners cannot be deleted' };
  list.splice(i, 1);
  return attempt(tile, next);
}
export function togglePoint(tile, which, i) {
  const next = cloneTile(tile);
  const p = listOf(next, which)[i];
  if (!p) return { ok: false, tile, reason: 'no such point' };
  p[2] = p[2] ? 0 : 1;
  return attempt(tile, next);
}
export function toggleCorner(tile) {
  const next = cloneTile(tile);
  next.cornerSmooth = !next.cornerSmooth;
  return attempt(tile, next);
}
/* A tile parameter (pitch or angle): an affine map of the whole tile. */
export function setParam(tile, key, value) {
  const next = cloneTile(tile);
  next[key] = value;
  return attempt(tile, next);
}
/* RESIZE from a corner (doc §2.3): the dragged corner goes to `target`, the
   OPPOSITE corner stays where it is, the edge directions (so θ) are kept.
   `opposite` is the opposite corner's position in the same frame as target.
   Each corner's offset from its opposite is ±|tA| t̂A ± |tB| t̂B. */
const CORNER_SIGNS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];   // C0, C1, C2, C3 relative to the opposite corner
export function resizeFromCorner(tile, corner, target, opposite) {
  const { tA, tB } = latticeVectors(tile);
  const eA = [tA[0] / tile.pitchA, tA[1] / tile.pitchA], eB = [tB[0] / tile.pitchB, tB[1] / tile.pitchB];
  const d = sub2(target, opposite);
  const det = eA[0] * eB[1] - eA[1] * eB[0];
  const alpha = (d[0] * eB[1] - d[1] * eB[0]) / det, beta = (eA[0] * d[1] - eA[1] * d[0]) / det;
  const [sA, sB] = CORNER_SIGNS[corner];
  const next = cloneTile(tile);
  next.pitchA = clamp(sA * alpha, PITCH_RANGE[0], PITCH_RANGE[1]);
  next.pitchB = clamp(sB * beta, PITCH_RANGE[0], PITCH_RANGE[1]);
  return attempt(tile, next);
}
/* corner k's position, C0 at the origin */
export function cornerAt(tile, k) {
  const { tA, tB } = latticeVectors(tile);
  return [[0, 0], tA, add2(tA, tB), tB][k];
}

function segDist(p, a, b) {
  const ab = sub2(b, a), L2 = ab[0] * ab[0] + ab[1] * ab[1] || 1e-18;
  const t = clamp(((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2, 0, 1);
  return Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1]);
}
export { segDist };

/* ------------------------------------------------------------------ */
/* Guardrails — FLAGS, never fixes (doc §6)                             */
/* ------------------------------------------------------------------ */

/* Control points closer than the blade can show (`bar`, the blade wall). */
export function closePoints(tile, bar) {
  const out = [];
  for (const which of ['A', 'B']) {
    const { chain } = edgeChain(tile, which);
    for (let i = 0; i + 1 < chain.length; i++) {
      const d = dist2(chain[i], chain[i + 1]);
      if (d < bar) out.push({ which, i, j: i + 1, d });      // chain indices: 0 = start corner, n-1 = end corner
    }
  }
  return out;
}

/* exact Euclidean distance transform (Felzenszwalb & Huttenlocher), squared,
   in pixels^2, from every pixel to the nearest pixel where src is set */
function edt1(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
}
export function edt2(src, nx, ny) {
  const INF = 1e20, out = new Float64Array(nx * ny), m = Math.max(nx, ny);
  const f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1);
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) f[y] = src[y * nx + x] ? 0 : INF;
    edt1(f, ny, d, v, z);
    for (let y = 0; y < ny; y++) out[y * nx + x] = d[y];
  }
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) f[x] = out[y * nx + x];
    edt1(f, nx, d, v, z);
    for (let x = 0; x < nx; x++) out[y * nx + x] = d[x];
  }
  return out;
}
/* even-odd scanline fill of a simple polygon at pixel centres */
export function rasterize(poly, frame) {
  const { gx, gy, h, nx, ny } = frame;
  const inside = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const yc = gy + (j + 0.5) * h, xs = [];
    for (let i = 0, n = poly.length; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k] - gx) / h - 0.5)), i1 = Math.min(nx - 1, Math.floor((xs[k + 1] - gx) / h - 0.5));
      for (let i = i0; i <= i1; i++) inside[j * nx + i] = 1;
    }
  }
  return inside;
}
function labelComponents(mask, nx, ny, eight = false) {
  const lab = new Int32Array(nx * ny).fill(-1);
  const comps = [];
  const stack = [];
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || lab[s] >= 0) continue;
    const id = comps.length, list = [];
    lab[s] = id; stack.push(s);
    while (stack.length) {
      const p = stack.pop(); list.push(p);
      const x = p % nx, y = (p - x) / nx;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((dx === 0 && dy === 0) || (!eight && dx && dy)) continue;
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= nx || Y >= ny) continue;
        const q = Y * nx + X;
        if (mask[q] && lab[q] < 0) { lab[q] = id; stack.push(q); }
      }
    }
    comps.push(list);
  }
  return { lab, comps };
}

/* NECKS AND SPIKES (doc §6.1): the cookie is OPENED by a disc of the minimum
   width (erode by r, dilate by r — two exact distance transforms). What the
   opening removes is narrower than the width. A removed piece that touches two
   or more separate pieces of the opened cookie is a NECK (the cookie would
   break in two there); one reaching more than SPIKE_DEPTH_FRAC widths past the
   opened cookie is a SPIKE. Plain corner rounding is neither (a 90° corner
   reaches 0.21 widths). Returns the flagged pixels for drawing. */
export function thinAnalysis(tile, minWidth) {
  const poly = outline(tile).pts;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  let h = Math.min(0.2, minWidth / 16);
  const span = Math.max(x1 - x0, y1 - y0);
  if (span / h > 900) h = span / 900;                    // a cap on the raster, not a bias: 900 px across the biggest tile
  const pad = 3;
  const nx = Math.ceil((x1 - x0) / h) + 2 * pad, ny = Math.ceil((y1 - y0) / h) + 2 * pad;
  const frame = { gx: x0 - pad * h, gy: y0 - pad * h, h, nx, ny };
  const inside = rasterize(poly, frame);
  const r = minWidth / 2, r2 = (r / h) ** 2;
  const outside = new Uint8Array(nx * ny); for (let i = 0; i < outside.length; i++) outside[i] = inside[i] ? 0 : 1;
  const dOut = edt2(outside, nx, ny);
  const core = new Uint8Array(nx * ny);
  for (let i = 0; i < core.length; i++) core[i] = inside[i] && dOut[i] >= r2 ? 1 : 0;
  const dCore = edt2(core, nx, ny);
  const opened = new Uint8Array(nx * ny);
  for (let i = 0; i < opened.length; i++) opened[i] = inside[i] && dCore[i] <= r2 ? 1 : 0;
  const dOpen = edt2(opened, nx, ny);
  const removed = new Uint8Array(nx * ny);
  for (let i = 0; i < removed.length; i++) removed[i] = inside[i] && !opened[i] ? 1 : 0;
  const op = labelComponents(opened, nx, ny, true);
  const rm = labelComponents(removed, nx, ny, false);
  const flagged = new Uint8Array(nx * ny);
  const necks = [], spikes = [];
  let worstDepth = 0;
  rm.comps.forEach((list) => {
    if (list.length < SPIKE_MIN_PX) return;
    let depth = 0;
    const touch = new Set();
    for (const p of list) {
      depth = Math.max(depth, Math.sqrt(dOpen[p]) * h);
      const x = p % nx, y = (p - x) / nx;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy;
        if (X >= 0 && Y >= 0 && X < nx && Y < ny && opened[Y * nx + X]) touch.add(op.lab[Y * nx + X]);
      }
    }
    worstDepth = Math.max(worstDepth, depth);
    const isNeck = touch.size >= 2;
    const isSpike = depth > SPIKE_DEPTH_FRAC * minWidth;
    if (isNeck || isSpike) {
      for (const p of list) flagged[p] = 1;
      let cx = 0, cy = 0;
      for (const p of list) { const x = p % nx; cx += x; cy += (p - x) / nx; }
      const at = [frame.gx + (cx / list.length + 0.5) * h, frame.gy + (cy / list.length + 0.5) * h];
      (isNeck ? necks : spikes).push({ depth, px: list.length, at });
    }
  });
  return { frame, flagged, necks, spikes, worstDepth, pieces: op.comps.length, minWidth };
}

/* The full guardrail report for a tile (the roller-side flags live in
   tile-roller.js). */
export function tileFlags(tile, print) {
  const thin = thinAnalysis(tile, print.minCookie);
  const close = closePoints(tile, print.bladeWall);
  return { thin, close };
}

/* ------------------------------------------------------------------ */
/* The 3x3 patch and the lines                                          */
/* ------------------------------------------------------------------ */

/* The (2r+1)^2 tiles about the centre one, each as a closed polygon. */
export function patch(tile, r = 1, per = CR_PER) {
  const o = outline(tile, per);
  const out = [];
  for (let k = -r; k <= r; k++) for (let m = -r; m <= r; m++) {
    const off = [m * o.tA[0] + k * o.tB[0], m * o.tA[1] + k * o.tB[1]];
    out.push({ m, k, pts: o.pts.map((p) => add2(p, off)) });
  }
  return out;
}
/* A chained LINE of one family: `count` copies of the edge from `start`. The
   copies meet at corners bit for bit (each copy's first point is the previous
   copy's last). */
export function chainLine(tile, which, start, count, per = CR_PER) {
  const d = edgeDense(tile, which, per);
  const t = d.t;
  const out = [start.slice()];
  for (let c = 0; c < count; c++) {
    const base = [start[0] + c * t[0], start[1] + c * t[1]];
    for (let k = 1; k < d.pts.length; k++) out.push([base[0] + d.pts[k][0], base[1] + d.pts[k][1]]);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* SVG exports                                                          */
/* ------------------------------------------------------------------ */

export const SVG_STROKE_MM = 0.25;
function svgPathOf(poly, closed, f = (p) => p) {
  return 'M' + poly.map((p) => { const [x, y] = f(p); return `${x.toFixed(3)} ${y.toFixed(3)}`; }).join('L') + (closed ? 'Z' : '');
}
function svgDoc(polys, title, opts = {}) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const { pts } of polys) for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const m = opts.margin ?? 5;
  const W = x1 - x0 + 2 * m, H = y1 - y0 + 2 * m;
  const f = ([x, y]) => [x - x0 + m, y1 - y + m];       // y up -> SVG y down
  let body = '';
  if (opts.fills) {
    body += '<g id="tiles" stroke="none">';
    for (const p of polys.filter((q) => q.fill)) body += `<path fill="${p.fill}" d="${svgPathOf(p.pts, true, f)}"/>`;
    body += '</g>';
  }
  body += `<g id="cut" fill="none" stroke="#0A0A0C" stroke-width="${SVG_STROKE_MM}" stroke-linejoin="round" stroke-linecap="round">`;
  for (const p of polys.filter((q) => q.stroke !== false)) body += `<path d="${svgPathOf(p.pts, !!p.closed, f)}"/>`;
  body += '</g>';
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(3)}mm" height="${H.toFixed(3)}mm" viewBox="0 0 ${W.toFixed(3)} ${H.toFixed(3)}">\n<title>${title}</title>\n${body}\n</svg>\n`;
  return { svg, widthMm: W, heightMm: H };
}
/* The tile: its outline, a cut line in millimetres. */
export function tileSvg(tile) {
  const o = outline(tile);
  const d = (x) => x.toFixed(1);
  return svgDoc([{ pts: o.pts, closed: true }], `Tessellation tile — ${d(tile.pitchA)} × ${d(tile.pitchB)} mm at ${d(tile.angle)}° — eva-maskalenko.com/tile`);
}
/* The 3x3 patch: the nine tiles in two tones behind the CUT LINES — four lines
   of each family across the patch, each drawn once (no doubled strokes where
   tiles share an edge). */
export function patchSvg(tile) {
  const tiles = patch(tile, 1);
  const { tA, tB } = latticeVectors(tile);
  const polys = tiles.map((q) => ({ pts: q.pts, fill: (q.m + q.k) % 2 === 0 ? '#E3E3DD' : '#F4F4F0', stroke: false }));
  for (let k = -1; k <= 2; k++) polys.push({ pts: chainLine(tile, 'A', [-tA[0] + k * tB[0], -tA[1] + k * tB[1]], 3) });
  for (let m = -1; m <= 2; m++) polys.push({ pts: chainLine(tile, 'B', [m * tA[0] - tB[0], m * tA[1] - tB[1]], 3) });
  const d = (x) => x.toFixed(1);
  return svgDoc(polys, `Tessellation — 3 × 3 patch of ${d(tile.pitchA)} × ${d(tile.pitchB)} mm tiles at ${d(tile.angle)}° — eva-maskalenko.com/tile`, { fills: true });
}

/* ------------------------------------------------------------------ */
/* Saved designs                                                        */
/* ------------------------------------------------------------------ */

export const DESIGN_FORMAT = 'tessellation-roller-design';
export const DESIGN_VERSION = 1;
/* Read a tile from untrusted JSON: the numbers are copied field by field and
   the result must pass validate(); anything else is refused with the reason. */
export function readTile(obj) {
  if (!obj || typeof obj !== 'object') return { ok: false, reason: 'not an object' };
  const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : NaN);
  const pts = (L) => (Array.isArray(L) ? L.map((p) => [num(p && p[0]), num(p && p[1]), p && p[2] ? 1 : 0]) : null);
  const tile = { pitchA: num(obj.pitchA), pitchB: num(obj.pitchB), angle: num(obj.angle), cornerSmooth: obj.cornerSmooth !== false, edgeA: pts(obj.edgeA), edgeB: pts(obj.edgeB) };
  if (!tile.edgeA || !tile.edgeB) return { ok: false, reason: 'an edge point list is missing' };
  const v = validate(tile);
  return v.ok ? { ok: true, tile } : { ok: false, reason: v.reason };
}
