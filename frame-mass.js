/* frame-mass.js — the /frame flow study's round 3 (Nov 14): the composed
   contour built as CARVED MASS, not swept wire. A prototype behind the
   hidden param `ornFlow: 'mass'`; with it absent nothing here runs and every
   frame builds as on `main`, by branch (withOrnament). Read
   docs/frame-flow-study.md §10 and docs/frame-flow-grammar.md first.

   Round 2 (frame-compose.js, kept as C2) composed the chain right — the
   silhouette, a head-to-tail run of C and S scrolls, back-to-back volutes —
   and every critic then read it as "a wire coat hanger": thin loops, big
   empty gaps between them and the molding, attached at a few points. The
   references are mostly MATERIAL with small pierced accents (2.webp's bronze
   covers 59 % of the zone between its molding and the target envelope,
   measured — tools/frame-mass-coverage.mjs; C2 covers 24 %), and lines
   cannot make carved mass. So the composed SPINES are kept and the element
   is changed:

   1. FILLED 2D REGIONS around the spines, on a raster in print mm:
      - a scroll's BODY is a tapered comma: widest near its SOURCE (the
        crest above the meeting, the bottom below it; MASS.bodyPeak), tapering
        hard into its tail volute; its inner edge held at the molding's edge
        less the embed (the comma swells outward, it does not cover the band);
      - a VOLUTE is a filled spiral: its coil as wide as the coil spacing
        allows less a pierced gap ≥ MASS.gap, or — where that would leave a
        coil thinner than its own body — merged solid with the spiral
        INCISED instead (a groove in the relief, not a hole);
      - an ACANTHUS FLAME, lobed, at every hand-off, fused over both
        scrolls' volutes and pointing with the flow;
      - THE GROUND: where a body bows off the molding, one acanthus leaf lying
        along the molding in the lens between them (its lower edge embedded
        in the molding, its upper edge stepped in lobes, veined), and between
        that leaf and the body ONE shaped opening — a crescent, or two
        teardrops on a long lens — closing where the leaf meets the body; so
        the ornament grows from the frame along most of each run;
      - REACH: where the raster so far falls short of the target envelope at
        a crest root, a high, a swell or a foot, a flame from the outermost
        material there, pointing out.
      The regions are UNIONED (a max over the raster: overlapping parts are
      one material, no hairline V where two parts meet), then CLOSED (every
      gap narrower than 2·MASS.close filled — a V between two parts ends in
      a rounded notch, never a slit) and OPENED (every sliver narrower than
      2·MASS.open removed). What is left empty between the regions is the
      piercing; the plan-gap check on the relief (measurePrint's slit) is the
      backstop.
   2. INFLATED to relief by a height function of the distance to the
      region's edge: a rounded pillow (a quarter circle of MASS.round, up to
      MASS.plateau), an ARRIS ridge along every scroll spine, a MIDRIB along
      every leaf and flame (its veins grooved), a GROOVE along every merged
      volute's spiral and two FLUTES down each body's tail, a raised boss at
      every eye; a HIERARCHY by element (eye > volute coil > body > flame >
      ground leaf > the close's fill, MASS.levels, smoothed); the
      whole raised over the molding where it overlaps it (the molding's own
      height, carried outward on a falling cone, so the mass rises out of
      the frame), and kept low under the shells so the relief order holds
      (crest > flowers > ornament > molding — the shells are then stood over
      the mass by frame-vine's standMotifs, reading the mass's own top).
   3. One WATERTIGHT ELEMENT: marching squares over the region's signed
      distance (smoothed, so the outline is a curve, not a staircase), the
      top a height field, the bottom on the back plane, walls between; built
      on the right half and mirrored to the bit.
   Pure functions, no DOM; every transcendental through frame-math.js. */

import { MIN_FEATURE_MM } from './frame-registry.js';
import { EMBED_MM, plateOutline } from './frame-relief.js';
import * as FM from './frame-math.js';

const F = MIN_FEATURE_MM;
const DEG = Math.PI / 180;
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export const MASS = {
  cell: 0.2,                 // mm at a 180 mm print: the raster (it scales with the print height, so the triangles do not)
  body: [0.2, 2.6, 0.55],    // a comma's widest FULL width: × its body's length, clamped [mm, × M]
  bodyPeak: 0.18,            // where along the body (from its source) the comma is widest
  bodyEnds: [0.8, 0.3],      // its width at the source end and at the tail (a hard taper into the tail volute), × the widest
  volute: 0.42,              // × M: a volute's outer coil (the heaviest part of a scroll — at least the body's own width at its joint); it narrows to MASS.eye at the eye
  eye: 2.0,                  // mm: a volute's coil at its eye
  eyeBoss: 0.36,             // × the volute's radius: the boss at its eye
  coilMin: 2.2,              // mm: a coil is pierced from the next only where it stays at least this wide (else merged, incised)
  rvMul: 1.45,               // the composed volutes scaled (frame-compose's rvMul): a volute larger than the body it ends
  turnsAdd: 0.35,            // and wound further (frame-compose's turnsAdd)
  shellMul: 1.35,            // and the shells enlarged (frame-compose's shellMul)
  flute: { off: 0.3, ends: [0.5, 0.9] },   // two flutes down each body, at ± off × its half-width, fading at its ends
  reach: { short: 0.35, len: 0.25, width: 0.16, maxW: 0.3, lean: 25 },   // an outward flame where the mass falls short of the envelope (× M)
  ground: { min: 2.4, leafMin: 1.8, embed: 1.0, over: 0.8, open: 0.74, lobes: 5, step: 0.34, twoAt: 45 },
  gap: 1.75,                 // mm: a pierced gap's least width (> the 1 mm plan floor, and > 2·close, so the close never fills it)
  close: 0.7,                // mm: the closing radius (a gap narrower than 1.4 mm is filled — no slit)
  open: 0.55,                // mm: the opening radius (a sliver narrower than 1.1 mm is removed)
  flame: { len: 0.6, width: 0.2, lobes: 4, notch: 0.42, lean: [32, 18], bend: 0.9, maxW: 0.5 },
  blur: [3, 10],             // [1 2 1] passes: the outline's signed distance, the heights' (σ ≈ 0.8 / 1.6 cells)
  levels: [1.0, 1.4, 2.0, 2.6, 3.1, 3.6],   // mm over the floor, by class (0 the close's fill, ground leaf, flame, body, volute, eye): the hierarchy
  leaf: { rib: 0.8, ribW: 1.3, blade: 0.55 },  // a leaf (classes 1–2) is a BLADE: its pillow lowered, its midrib raised, its veins grooved
  height: { edge: 0.45, plateau: 2.3, round: 1.9, ridge: 0.3, ridgeW: 0.6, rib: 0.35, ribW: 0.45, groove: 0.55, grooveW: 0.38, slope: 0.55, fade: 3.5, under: 0.3 },
};

/* ------------------------------------------------------------------ */
/* the raster                                                          */
/* ------------------------------------------------------------------ */

/* the exact squared Euclidean distance transform (Felzenszwalb), in cells,
   to the nearest SITE; rows j, columns i, index j·nx + i */
function edt(nx, ny, site) {
  const INF = 1e20, n = Math.max(nx, ny), f = new Float64Array(n), d = new Float64Array(nx * ny);
  const v = new Int32Array(n), z = new Float64Array(n + 1), out = new Float64Array(n);
  const pass = (m) => {
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < m; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0; for (let q = 0; q < m; q++) { while (z[k + 1] < q) k++; out[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
  };
  for (let i = 0; i < nx; i++) { for (let j = 0; j < ny; j++) f[j] = site(j * nx + i) ? 0 : INF; pass(ny); for (let j = 0; j < ny; j++) d[j * nx + i] = out[j]; }
  for (let j = 0; j < ny; j++) { for (let i = 0; i < nx; i++) f[i] = d[j * nx + i]; pass(nx); for (let i = 0; i < nx; i++) d[j * nx + i] = out[i]; }
  return d;
}

function makeGrid(box, c) {
  // x symmetric about the axis: column n is x = 0 exactly, x_i = (i − n)·c
  const n = Math.ceil(Math.max(Math.abs(box.x0), Math.abs(box.x1)) / c) + 4;
  const nx = 2 * n + 1, y0 = box.y0 - 4 * c, ny = Math.ceil((box.y1 - y0) / c) + 5;
  return { n, nx, ny, c, y0, X: (i) => (i - n) * c, Y: (j) => y0 + j * c };
}

/* a variable-width stroke into a mask: the union of tapered capsules
   between consecutive centreline points (half-widths r) */
function stamp(g, mask, pts, r, val = 1, cls = null, cv = 0) {
  const { nx, ny, c, n, y0 } = g;
  for (let k = 0; k + 1 < pts.length; k++) {
    const a = pts[k], b = pts[k + 1], ra = r[k], rb = r[k + 1];
    if (!(ra > 0) && !(rb > 0)) continue;
    const R = Math.max(ra, rb);
    const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - R) / c) + n), i1 = Math.min(nx - 1, Math.ceil((Math.max(a[0], b[0]) + R) / c) + n);
    const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - R - y0) / c)), j1 = Math.min(ny - 1, Math.ceil((Math.max(a[1], b[1]) + R - y0) / c));
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-12;
    for (let j = j0; j <= j1; j++) {
      const y = y0 + j * c;
      for (let i = i0; i <= i1; i++) {
        const x = (i - n) * c, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2));
        const ex = x - a[0] - t * dx, ey = y - a[1] - t * dy, rr = ra + (rb - ra) * t;
        if (rr > 0 && ex * ex + ey * ey <= rr * rr) { const kk = j * nx + i; mask[kk] = val; if (cls) { const v = typeof cv === 'number' ? cv : cv[k]; if (v > cls[kk]) cls[kk] = v; } }
      }
    }
  }
}
/* the exact distance (mm) to a polyline, written as a minimum into `field` within `reach` of it (a raster of
   site cells made the ridges a staircase, read on the relief as a row of beads) */
function siteLine(g, field, pts, reach = 2.5) {
  const { nx, ny, c, n, y0 } = g;
  for (let k = 0; k + 1 < pts.length; k++) {
    const a = pts[k], b = pts[k + 1];
    const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - reach) / c) + n), i1 = Math.min(nx - 1, Math.ceil((Math.max(a[0], b[0]) + reach) / c) + n);
    const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - reach - y0) / c)), j1 = Math.min(ny - 1, Math.ceil((Math.max(a[1], b[1]) + reach - y0) / c));
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-12;
    for (let j = j0; j <= j1; j++) {
      const y = y0 + j * c;
      for (let i = i0; i <= i1; i++) {
        const x = (i - n) * c, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)), ex = x - a[0] - t * dx, ey = y - a[1] - t * dy, d = Math.sqrt(ex * ex + ey * ey), kk = j * nx + i;
        if (d < field[kk]) field[kk] = d;
      }
    }
  }
}
function mirrorMin(g, a) { const { nx, ny, n } = g; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, m = j * nx + 2 * n - i; if (a[m] < a[k]) a[k] = a[m]; } }
/* a polygon's interior (scanline, even-odd) */
function fillPoly(g, mask, poly, val = 1) {
  const { nx, ny, c, n, y0 } = g, m = poly.length;
  for (let j = 0; j < ny; j++) {
    const y = y0 + j * c, xs = [];
    for (let k = 0; k < m; k++) { const a = poly[k], b = poly[(k + 1) % m]; if ((a[1] <= y) !== (b[1] <= y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) { const i0 = Math.max(0, Math.ceil(xs[k] / c) + n), i1 = Math.min(nx - 1, Math.floor(xs[k + 1] / c) + n); for (let i = i0; i <= i1; i++) mask[j * nx + i] = val; }
  }
}
/* the left half made the mirror of the right, to the bit */
function mirrorInto(g, a) { const { nx, ny, n } = g; for (let j = 0; j < ny; j++) for (let i = 0; i < n; i++) a[j * nx + i] = a[j * nx + 2 * n - i]; }
function mirrorUnion(g, a) { const { nx, ny, n } = g; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, m = j * nx + 2 * n - i; if (a[m]) a[k] = 1; } }

const dilate = (g, A, r) => { const d = edt(g.nx, g.ny, (k) => A[k]), R2 = (r / g.c) * (r / g.c), out = new Uint8Array(A.length); for (let k = 0; k < A.length; k++) out[k] = d[k] <= R2 ? 1 : 0; return out; };
const erode = (g, A, r) => { const d = edt(g.nx, g.ny, (k) => !A[k]), R2 = (r / g.c) * (r / g.c), out = new Uint8Array(A.length); for (let k = 0; k < A.length; k++) out[k] = d[k] > R2 ? 1 : 0; return out; };

/* ------------------------------------------------------------------ */
/* the shapes                                                          */
/* ------------------------------------------------------------------ */

/* a lobed acanthus flame from `root` at heading `ang`, bending `bend`
   (radians over its length): its centreline and half-widths */
function flame(root, ang, len, halfW, bend, lobes, notch) {
  const n = Math.max(16, Math.ceil(len / 0.25)), ds = len / n, pts = [root.slice()], r = [];
  let x = root[0], y = root[1], f = ang;
  for (let k = 0; k < n; k++) { const h = bend / n / 2; x += ds * FM.cos(f + h); y += ds * FM.sin(f + h); f += bend / n; pts.push([x, y]); }
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const body = t < 0.38 ? 0.55 + 0.45 * smooth(t / 0.38) : FM.cos((t - 0.38) / 0.62 * Math.PI / 2);
    let lobe = 1;
    for (let q = 1; q < lobes + 1; q++) { const tq = 0.3 + 0.62 * q / (lobes + 0.5), w = 0.035 + 0.01 * q; const e = (t - tq) / w; lobe -= notch * FM.exp(-e * e); }
    r.push(Math.max(0, halfW * body * Math.max(0.15, lobe)));
  }
  return { pts, r, midrib: pts.slice(Math.floor(0.06 * n), Math.ceil(0.86 * n)) };
}

/* ------------------------------------------------------------------ */
/* the mass                                                            */
/* ------------------------------------------------------------------ */

/* orn: composeFor's record (the composed spines); SF: frame-compose's side
   frame for that record. Returns { element, stats, told } */
export function massFor(model, orn, SF) {
  const p = model.params, s = orn.scale, M = orn.length, told = [];
  const cell = MASS.cell * Math.max(1, p.printHeight / 180);
  const yOut = orn.flow.yOut, side = orn.flow.side, L = SF.L;
  const scrollsRec = orn.flow.scrolls;
  const meet = scrollsRec.findIndex((x) => x.to === 'high');
  const prim = (orn.groups[0] ? orn.groups[0].curves : []).filter((c) => c.sc && !c.fill && c.info.role === 'scroll').sort((a, b) => a.sc.i - b.sc.i);
  const sil = plateOutline(model).map(([x, y]) => [x * s, y * s]);
  // the raster's box: the envelope, both halves, and the frame
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of [...orn.flow.envelope, ...sil, ...prim.flatMap((c) => c.pts)]) { x0 = Math.min(x0, x, -x); x1 = Math.max(x1, x, -x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const pad = 3 * M;
  const g = makeGrid({ x0: x0 - pad, x1: x1 + pad, y0: y0 - pad, y1: y1 + pad }, cell);
  const { nx, ny, n } = g, N = nx * ny, X = g.X, Y = g.Y;
  const A = new Uint8Array(N);                  // the material
  const cls = new Uint8Array(N), eyeD = new Float64Array(N).fill(1e9);   // the element's CLASS (the relief's hierarchy): 1 ground leaf, 2 flame, 3 body, 4 volute coil, 5 eye
  const spine = new Float64Array(N).fill(1e9), rib = new Float64Array(N).fill(1e9), groove = new Float64Array(N).fill(1e9);
  const widths = [];                            // body full widths, for the record
  const flowSign = (i) => (meet < 0 || i < meet ? 1 : -1);   // +1: the source is the start (s rising downstream)

  const bodyHalf = (c, ui) => {
    const { sA, sB } = c.body, Lb = Math.max(1e-6, sB - sA), Wb = Math.min(MASS.body[2] * M, Math.max(MASS.body[1], MASS.body[0] * Lb));
    let t = (ui - sA) / Lb; if (flowSign(c.sc.i) < 0) t = 1 - t;
    const [w0, w1] = MASS.bodyEnds, tp = MASS.bodyPeak;
    return 0.5 * Wb * (t < tp ? w0 + (1 - w0) * smooth(t / tp) : 1 - (1 - w1) * smooth((t - tp) / (1 - tp)));
  };
  // a flame's VEINS: from the midrib out to each lobe (each local maximum of its half-width), raking forward
  const veins = (fl) => {
    const P = fl.pts, r = fl.r;
    for (let k = 2; k < P.length - 2; k++) {
      if (!(r[k] > r[k - 1] && r[k] >= r[k + 1]) || r[k] < 1.2) continue;
      const tx = P[k + 1][0] - P[k - 1][0], ty = P[k + 1][1] - P[k - 1][1], tl = Math.hypot(tx, ty) || 1, nn = [-ty / tl, tx / tl];
      const back = Math.max(0, k - 3);
      for (const sg of [1, -1]) siteLine(g, groove, [P[back], [P[k][0] + sg * nn[0] * 0.8 * r[k], P[k][1] + sg * nn[1] * 0.8 * r[k]]], 1.5);
    }
  };
  // ---- 1a. each scroll: the comma body and its two filled volutes ----
  for (const c of prim) {
    const { sA, sB } = c.body, u = c.u, P = c.pts, nP = P.length;
    const Lb = Math.max(1e-6, sB - sA);
    const Wb = Math.min(MASS.body[2] * M, Math.max(MASS.body[1], MASS.body[0] * Lb));
    const bodyW = (ui) => 2 * bodyHalf(c, ui);
    // the volute coil's target: from the body's own width at its joint down to the eye
    const LvA = sA, LvB = u[nP - 1] - sB;
    const wJ = { A: bodyW(sA), B: bodyW(sB) };
    const target = (i) => {
      const ui = u[i];
      const wv = (wj) => Math.max(wj, MASS.volute * M);
      if (ui < sA) { const v = LvA > 0 ? (sA - ui) / LvA : 1; return wv(wJ.A) * (1 - v) + MASS.eye * v; }
      if (ui > sB) { const v = LvB > 0 ? (ui - sB) / LvB : 1; return wv(wJ.B) * (1 - v) + MASS.eye * v; }
      return bodyW(ui);
    };
    // a volute coil: the spacing to the coil beside it (a point of the same curve more than ¾ of a turn away)
    const w = new Float64Array(nP), merged = new Uint8Array(nP);
    for (let i = 0; i < nP; i++) {
      const ui = u[i], tw = target(i);
      if (ui >= sA && ui <= sB) { w[i] = tw; widths.push(tw); continue; }
      const rl = 1 / Math.max(1e-6, Math.abs(c.kap[i])), away = 0.75 * 2 * Math.PI * rl;
      let d = Infinity;
      for (let j = 0; j < nP; j++) { if (Math.abs(u[j] - ui) <= away) continue; const dd = Math.hypot(P[j][0] - P[i][0], P[j][1] - P[i][1]); if (dd < d) d = dd; }
      if (d - MASS.gap >= Math.max(0.9 * tw, MASS.coilMin)) w[i] = Math.min(tw, d - MASS.gap);       // a pierced coil: the gap kept
      else { w[i] = Math.max(tw, d + 0.2); merged[i] = d < Infinity ? 1 : 0; } // merged solid: the spiral incised
    }
    // a BODY's inner edge stays at the molding's edge less the embed (the comma swells outward, it does not cover the molding)
    const Pc = P.map((q) => q.slice()), hwArr = Array.from(w, (x) => x / 2);
    for (let i = 0; i < nP; i++) {
      if (u[i] < sA || u[i] > sB) continue;
      const [ls, ly] = SF.local(P[i]), over = hwArr[i] - (ly - yOut) - MASS.ground.embed;
      if (over <= 0) continue;
      const fn = SF.fr(Math.max(0, Math.min(L, ls))).n, dlt = Math.min(over, hwArr[i] - 0.5) / 2;
      Pc[i] = [P[i][0] + fn[0] * dlt, P[i][1] + fn[1] * dlt]; hwArr[i] -= dlt;
    }
    stamp(g, A, Pc, hwArr, 1, cls, Array.from(u, (x) => (x >= sA && x <= sB ? 3 : 4)));
    // the EYE: a boss at each volute's end
    for (const [e, rv] of [[0, c.info.rvA], [nP - 1, c.info.rvB]]) if (rv > 0) { const re = Math.max(MASS.eye * 0.75, MASS.eyeBoss * rv); stamp(g, A, [P[e], P[e]], [re, re], 1, cls, 5); siteLine(g, eyeD, [P[e], P[e]], 3 * re); }
    siteLine(g, spine, P);
    // two FLUTES down the body, following it, fading out before the volutes
    for (const sg of [1, -1]) {
      const fl = [];
      for (let i = 0; i < nP; i++) {
        const t = (u[i] - sA) / Lb;
        if (t < MASS.flute.ends[0] || t > MASS.flute.ends[1]) continue;
        const off = sg * MASS.flute.off * hwArr[i];
        fl.push([Pc[i][0] + c.nrm[i][0] * off, Pc[i][1] + c.nrm[i][1] * off]);
      }
      if (fl.length > 3) siteLine(g, groove, fl);
    }
    // the incised spiral of a merged volute: midway to the coil inside it
    const gpts = [];
    for (let i = 0; i < nP; i++) {
      const nearEye = (u[i] < sA && u[i] < 0.25 * LvA) || (u[i] > sB && u[i] > sB + 0.75 * LvB);   // the groove stops short of the eye (a pit there read as a pinhole)
      if (!merged[i] || nearEye) { if (gpts.length > 2) siteLine(g, groove, gpts); gpts.length = 0; continue; }
      const sg = Math.sign(c.kap[i]) || 1, rl = 1 / Math.max(1e-6, Math.abs(c.kap[i]));
      const off = Math.min(0.5 * rl, 0.5 * w[i] + 0.15);
      gpts.push([P[i][0] + sg * c.nrm[i][0] * off, P[i][1] + sg * c.nrm[i][1] * off]);
    }
    if (gpts.length > 2) siteLine(g, groove, gpts);
  }

  // ---- 1b. an acanthus flame at every hand-off, fused over both volutes ----
  let flames = 0;
  const kisses = [];   // every hand-off's closest approach of the two volutes' centrelines (measured on the mass below)
  for (let k = 0; k + 1 < prim.length; k++) {
    const a = prim[k], b = prim[k + 1];
    if (b.sc.i !== a.sc.i + 1) continue;
    // the kiss: the closest approach of a's end volute and b's start volute
    let best = Infinity, q = null, pa = null, pb = null;
    for (let i = 0; i < a.pts.length; i++) { if (a.u[i] <= a.body.sB) continue; for (let j = 0; j < b.pts.length; j++) { if (b.u[j] >= b.body.sA) break; const d = Math.hypot(a.pts[i][0] - b.pts[j][0], a.pts[i][1] - b.pts[j][1]); if (d < best) { best = d; pa = a.pts[i]; pb = b.pts[j]; q = [(a.pts[i][0] + b.pts[j][0]) / 2, (a.pts[i][1] + b.pts[j][1]) / 2]; } } }
    if (!q) continue;
    kisses.push({ a: a.sc.i, b: b.sc.i, pa, pb, gap: best });
    const [sq] = SF.local(q), fr = SF.fr(Math.max(0, Math.min(L, sq)));
    const low = scrollsRec[a.sc.i].to === 'low', dir = flowSign(b.sc.i);
    const lean = (low ? MASS.flame.lean[0] : MASS.flame.lean[1]) * DEG;
    const d = [dir * fr.t[0] * FM.cos(lean) + fr.n[0] * FM.sin(lean), dir * fr.t[1] * FM.cos(lean) + fr.n[1] * FM.sin(lean)];
    const len = MASS.flame.len * Math.min(a.info.Lb || a.info.L, b.info.Lb || b.info.L) * (low ? 1 : 0.8);
    const hw = Math.min(MASS.flame.maxW * M, MASS.flame.width * len);
    // bending back toward the frame (the flame lies along the flow, not out into the air)
    const bend = -dir * MASS.flame.bend * (low ? 1 : 0.6) * Math.sign(fr.t[0] * fr.n[1] - fr.t[1] * fr.n[0] || 1);
    const fl = flame(q, FM.atan2(d[1], d[0]), len, hw, bend, MASS.flame.lobes, MASS.flame.notch);
    stamp(g, A, fl.pts, fl.r, 1, cls, 2); siteLine(g, rib, fl.midrib); veins(fl); flames++;
  }

  // ---- 1c. the GROUND: where a body bows off the molding, the lens between them is one acanthus leaf lying
  //      along the molding (rooted at the source end, its tip downstream, its lower edge embedded in the molding),
  //      its upper edge stepped in lobes; what is left between the leaf and the body is ONE shaped opening — a
  //      crescent or teardrop, closing at both ends where the leaf meets the body (two on a long lens) ----
  let groundLeaves = 0;
  for (const c of prim) {
    const loc = [];
    for (let i = 0; i < c.pts.length; i++) { if (c.u[i] < c.body.sA || c.u[i] > c.body.sB) continue; const [ls, ly] = SF.local(c.pts[i]); loc.push([ls, ly, bodyHalf(c, c.u[i])]); }
    if (loc.length < 4) continue;
    loc.sort((m1, m2) => m1[0] - m2[0]);
    const at = (sv) => { if (sv < loc[0][0] || sv > loc[loc.length - 1][0]) return null; let k = 0; while (k < loc.length - 2 && loc[k + 1][0] < sv) k++; const t = (sv - loc[k][0]) / Math.max(1e-9, loc[k + 1][0] - loc[k][0]); return [loc[k][1] + t * (loc[k + 1][1] - loc[k][1]), loc[k][2] + t * (loc[k + 1][2] - loc[k][2])]; };
    const st = 0.5, runs = []; let cur = null;
    for (let sv = loc[0][0]; sv <= loc[loc.length - 1][0]; sv += st) {
      const q = at(sv); if (!q) continue;
      const top = q[0] - q[1], hl = top - yOut;
      if (hl > MASS.ground.min && q[0] > yOut) { if (!cur) { cur = []; runs.push(cur); } cur.push([sv, top]); } else cur = null;
    }
    const dir = flowSign(c.sc.i);
    for (const run of runs) {
      if (run.length < 8) continue;
      const ord = dir > 0 ? run : run.slice().reverse(), nR = ord.length, Lr = (nR - 1) * st;
      const nOpen = Lr > MASS.ground.twoAt ? 2 : 1;
      const pts = [], r = [], mid = [], vns = []; let prevSaw = 1;
      for (let q = 0; q < nR; q++) {
        const [sv, top] = ord[q], t = q / (nR - 1);
        const ylo = yOut - MASS.ground.embed, full = top + MASS.ground.over - ylo;
        // the opening: a crescent (or two teardrops) between the leaf's upper edge and the body
        const ph = nOpen === 1 ? FM.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.06) / 0.86))) : Math.abs(FM.sin(2 * Math.PI * Math.min(1, Math.max(0, (t - 0.06) / 0.86))));
        let open = Math.min(MASS.ground.open * (full - MASS.ground.over), full - MASS.ground.over - MASS.ground.leafMin) * Math.sqrt(ph);
        // the leaf's upper edge stepped down the flow in lobes (a saw: each lobe rises then drops, pointing downstream)
        const saw = (t * MASS.ground.lobes) % 1, lobe = MASS.ground.step * (full - MASS.ground.over) * (saw < 0.75 ? saw / 0.75 : (1 - saw) / 0.25) * ph;
        open = Math.max(0, open + lobe - MASS.ground.step * (full - MASS.ground.over) * 0.5 * ph);
        const yL = ylo + full - (open > MASS.gap ? open : 0);
        const f0 = SF.fr(Math.max(0, Math.min(L, sv)));
        const yc = (ylo + yL) / 2;
        pts.push([f0.p[0] + yc * f0.n[0], f0.p[1] + yc * f0.n[1]]);
        r.push(Math.max(0, (yL - ylo) / 2));
        if (t > 0.08 && t < 0.88) { const ym = ylo + 0.42 * (yL - ylo); mid.push([f0.p[0] + ym * f0.n[0], f0.p[1] + ym * f0.n[1]]); }
        // a vein to each lobe's tip (the saw's peak), from the midrib behind it
        if (saw < prevSaw && t > 0.1 && t < 0.9 && mid.length > 6) { const ym = ylo + 0.92 * (yL - ylo); vns.push([mid[mid.length - 6], [f0.p[0] + ym * f0.n[0], f0.p[1] + ym * f0.n[1]]]); }
        prevSaw = saw;
      }
      if (pts.length < 4) continue;
      stamp(g, A, pts, r, 1, cls, 1); if (mid.length > 2) siteLine(g, rib, mid); for (const v of vns) siteLine(g, groove, v); groundLeaves++;
    }
  }

  // ---- 1d. REACH: where the mass as drawn so far falls short of the target envelope at a crest root, a high, a
  //      swell or a foot (read off the raster itself, the outermost material within ±5 mm of the keypoint), an
  //      acanthus flame from that outermost point, pointing out and leaning with the flow ----
  let reachFlames = 0;
  {
    const inA = (q) => { const i = Math.round(q[0] / cell) + n, j = Math.round((q[1] - g.y0) / cell); return i >= 0 && j >= 0 && i < nx && j < ny && A[j * nx + i] === 1; };
    for (const k of orn.flow.keypoints) {
      if (!['high', 'foot', 'root', 'swell'].includes(k.b)) continue;
      const yT = yOut + k.e * M;
      let best = null;
      for (let sv = Math.max(0, k.s - 5); sv <= Math.min(L, k.s + 5); sv += 0.5) {
        const f0 = SF.fr(sv);
        for (let y = yT + 1; y >= yOut; y -= 0.25) { const q = [f0.p[0] + y * f0.n[0], f0.p[1] + y * f0.n[1]]; if (inA(q)) { if (!best || y > best.y) best = { s: sv, y, q }; break; } }
      }
      if (!best) continue;
      const short = yT - best.y;
      if (short < MASS.reach.short * M) continue;
      const fr = SF.fr(best.s);
      const near = prim.reduce((m, c) => { const d = Math.min(...c.pts.map((p2) => Math.hypot(p2[0] - best.q[0], p2[1] - best.q[1]))); return !m || d < m.d ? { c, d } : m; }, null);
      const dir = near ? flowSign(near.c.sc.i) : 1, lean = MASS.reach.lean * DEG * (k.b === 'root' ? -1 : 1);
      const d = [fr.n[0] * FM.cos(lean) + dir * fr.t[0] * FM.sin(lean), fr.n[1] * FM.cos(lean) + dir * fr.t[1] * FM.sin(lean)];
      const len = short + MASS.reach.len * M, hw = Math.min(MASS.reach.maxW * M, MASS.reach.width * len);
      const root = [best.q[0] - d[0] * 0.6 * hw, best.q[1] - d[1] * 0.6 * hw];
      const fl = flame(root, FM.atan2(d[1], d[0]), len, hw, 0.5 * dir, MASS.flame.lobes, MASS.flame.notch);
      if (!fl.pts.every((q) => q[0] > -hw)) continue;
      stamp(g, A, fl.pts, fl.r, 1, cls, 2); siteLine(g, rib, fl.midrib); veins(fl); reachFlames++;
    }
  }
  // ---- the union, mirrored; closed and opened ----
  // the shells' footprints join the union (the mass runs on under them, low; standMotifs stands them over it), so
  // the close fills a hairline between a scroll and a shell as it does between two scrolls
  const mot = new Uint8Array(N);
  for (const el of orn.elements) for (const l of el.loops) fillPoly(g, mot, l);
  for (let k = 0; k < N; k++) if (mot[k]) A[k] = 1;
  mirrorUnion(g, A); mirrorMin(g, spine); mirrorMin(g, rib); mirrorMin(g, groove); mirrorMin(g, eyeD);
  { const { nx: X1, ny: Y1 } = g; for (let j = 0; j < Y1; j++) for (let i = 0; i < X1; i++) { const k = j * X1 + i, m = j * X1 + 2 * n - i; if (cls[m] > cls[k]) cls[k] = cls[m]; } }
  // the FRAME takes part in the close and the open as a solid (a hairline between a scroll and the molding is
  // filled as one between two scrolls is), but gains no mass of its own: inside the silhouette the mass stays
  // where it was drawn (its embed)
  const frame = new Uint8Array(N); fillPoly(g, frame, sil); mirrorInto(g, frame);
  const U = new Uint8Array(N); for (let k = 0; k < N; k++) U[k] = A[k] | frame[k];
  const Cl = erode(g, dilate(g, U, MASS.close), MASS.close);
  for (let k = 0; k < N; k++) Cl[k] = frame[k] ? (A[k] ? 1 : 1) : Cl[k];
  const Op = dilate(g, erode(g, Cl, MASS.open), MASS.open);
  // where the mass meets the silhouette it runs on INTO the frame by the embed (no hairline along the band's edge)
  const out = new Uint8Array(N); for (let k = 0; k < N; k++) out[k] = frame[k] ? 0 : Op[k];
  const into = dilate(g, out, MASS.ground.embed);
  let R = new Uint8Array(N);
  for (let k = 0; k < N; k++) R[k] = frame[k] ? (A[k] | into[k]) : out[k];
  mirrorInto(g, R);

  // the frame: its silhouette, the molding's height inside it (the band), the motifs' footprints
  const dSil = edt(nx, ny, (k) => !frame[k]);       // inside: squared cells to the outside
  const Hz = new Float64Array(N).fill(-Infinity);
  const near = (1.4 * M / cell) * (1.4 * M / cell);
  for (let j = 0; j < ny; j++) for (let i = n; i < nx; i++) { const k = j * nx + i; if (frame[k] && dSil[k] <= near) { const h = orn.H([X(i), Y(j)]); if (h > -Infinity) Hz[k] = h; } }
  mirrorInto(g, Hz);
  // the material must hold on to the frame: a piece not touching the band or a shell is left out (told)
  {
    const lab = new Int32Array(N).fill(-1), keep = [];
    let id = 0;
    for (let k0 = 0; k0 < N; k0++) {
      if (!R[k0] || lab[k0] >= 0) continue;
      const st = [k0]; lab[k0] = id; let held = false, cnt = 0;
      while (st.length) { const k = st.pop(); cnt++; if (Hz[k] > -Infinity || mot[k]) held = true; const i = k % nx, j = (k - i) / nx; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= ny) continue; const kk = b * nx + a; if (R[kk] && lab[kk] < 0) { lab[kk] = id; st.push(kk); } } }
      keep.push({ held, cnt }); id++;
    }
    let dropped = 0;
    for (let k = 0; k < N; k++) if (R[k] && !keep[lab[k]].held) { R[k] = 0; }
    for (const q of keep) if (!q.held) dropped++;
    if (dropped) told.push(`${dropped} piece${dropped > 1 ? 's' : ''} of the mass held by nothing — left out`);
  }

  // the hand-offs, measured on the MASS: the segment between the two volutes' nearest centreline points is material
  // its whole length (the two scrolls are one carved piece there, whatever their wires' widths would have been)
  const inR = (q) => { const i = Math.round(q[0] / cell) + n, j = Math.round((q[1] - g.y0) / cell); return i >= 0 && j >= 0 && i < nx && j < ny && R[j * nx + i] === 1; };
  const handoffs = kisses.map((h) => { const m = Math.max(2, Math.ceil(h.gap / (0.5 * cell))); let ok = true; for (let t = 0; t <= m; t++) if (!inR([h.pa[0] + (h.pb[0] - h.pa[0]) * t / m, h.pa[1] + (h.pb[1] - h.pa[1]) * t / m])) ok = false; return { a: h.a, b: h.b, centreGap: h.gap, joined: ok }; });
  // ---- 2. the signed distance (smoothed) and the heights ----
  const dIn = edt(nx, ny, (k) => !R[k]), dOut = edt(nx, ny, (k) => R[k]);
  let sd = new Float64Array(N);
  for (let k = 0; k < N; k++) sd[k] = R[k] ? -(Math.sqrt(dIn[k]) - 0.5) * cell : (Math.sqrt(dOut[k]) - 0.5) * cell;
  // two [1 2 1] passes each way: the outline becomes a curve, not a staircase
  const blur = (f, passes) => {
    for (let pass = 0; pass < passes; pass++) {
      const t = new Float64Array(N);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; t[k] = (2 * f[k] + f[j * nx + Math.max(0, i - 1)] + f[j * nx + Math.min(nx - 1, i + 1)]) / 4; }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; f[k] = (2 * t[k] + t[Math.max(0, j - 1) * nx + i] + t[Math.min(ny - 1, j + 1) * nx + i]) / 4; }
    }
  };
  blur(sd, MASS.blur[0]);
  // the HEIGHTS read a more smoothed copy: the binary region's staircase rings in its distance field, and the
  // pillow drew it as a row of beads down every edge
  const sdh = Float64Array.from(sd); blur(sdh, MASS.blur[1]);
  for (let k = 0; k < N; k++) if (sd[k] === 0) sd[k] = 1e-9;
  mirrorInto(g, sd);
  // the molding's height carried out on a falling cone, so the mass rises out of the frame
  const base = new Float64Array(N);
  for (let k = 0; k < N; k++) base[k] = Hz[k];
  const sl = MASS.height.slope * cell, sd2 = sl * Math.SQRT2;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; let v = base[k]; if (i > 0) v = Math.max(v, base[k - 1] - sl); if (j > 0) { v = Math.max(v, base[k - nx] - sl); if (i > 0) v = Math.max(v, base[k - nx - 1] - sd2); if (i < nx - 1) v = Math.max(v, base[k - nx + 1] - sd2); } base[k] = v; }
  for (let j = ny - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) { const k = j * nx + i; let v = base[k]; if (i < nx - 1) v = Math.max(v, base[k + 1] - sl); if (j < ny - 1) { v = Math.max(v, base[k + nx] - sl); if (i < nx - 1) v = Math.max(v, base[k + nx + 1] - sd2); if (i > 0) v = Math.max(v, base[k + nx - 1] - sd2); } base[k] = v; }
  for (let k = 0; k < N; k++) base[k] = Math.max(0, base[k]);
  mirrorInto(g, base);
  const dMt = edt(nx, ny, (k) => mot[k]);
  const Hh = MASS.height, top = new Float64Array(N);
  // the class's level and the share of leaf, smoothed (the hierarchy steps, it does not cliff)
  const lev = new Float64Array(N), leafW = new Float64Array(N);
  for (let k = 0; k < N; k++) { lev[k] = MASS.levels[cls[k]]; leafW[k] = cls[k] === 1 || cls[k] === 2 ? 1 : 0; }
  mirrorInto(g, lev); mirrorInto(g, leafW);
  blur(lev, 6); blur(leafW, 6);
  const g2 = (d, w) => (d > 4 * w ? 0 : FM.exp(-d * d / (w * w)));
  for (let k = 0; k < N; k++) {
    if (!(sd[k] < 0)) continue;
    const a = Math.min(1, Math.max(0, -sdh[k]) / Hh.round), rd = Math.sqrt(1 - (1 - a) * (1 - a));
    const lw = leafW[k], P = lev[k];
    let h = Hh.edge + (P - Hh.edge) * rd * (1 - lw * (1 - MASS.leaf.blade));
    h += Hh.ridge * g2(spine[k], Hh.ridgeW) * a + (Hh.rib * (1 - lw) + MASS.leaf.rib * lw) * g2(rib[k], Hh.ribW * (1 - lw) + MASS.leaf.ribW * lw) * a;
    h += 0.8 * g2(eyeD[k], 1.6) * a;   // the eye: a raised boss
    h -= Hh.groove * g2(groove[k], Hh.grooveW) * a;
    h = Math.max(Hh.edge, h);
    // under and beside a shell the mass stays low: the shell is stood over it (standMotifs)
    const fm = smooth(Math.sqrt(dMt[k]) * cell / Hh.fade);
    h = Hh.edge + (h - Hh.edge) * (Hh.under + (1 - Hh.under) * fm);
    top[k] = base[k] + h;
  }
  mirrorInto(g, top);

  // ---- 3. the element: marching squares, the right half, mirrored ----
  const el = meshRegion(g, sd, top, base, Hh.edge);
  el.kind = 'mass'; el.mass = true;
  const W = [];
  for (let i = 0; i < el.positions.length; i += 3) if (el.positions[i + 2] > 0) W.push(el.positions[i], el.positions[i + 1], el.positions[i + 2]);
  widths.sort((a, b) => a - b);
  // the creases for the paper: the spines, the ribs, the grooves (only where the region is)
  return { element: el, top: W, told, stats: { cell, flames, groundLeaves, reachFlames, handoffs, bodyWidth: widths.length ? { min: widths[0], median: widths[widths.length >> 1], max: widths[widths.length - 1] } : null, triangles: el.indices.length / 3 } };
}

/* a region's signed distance sd (< 0 inside) on the grid → one closed
   solid: the top at `top` (inside nodes) and base + edge on the outline, the
   bottom on z = 0, walls between. Marching squares, the saddle split by the
   cell's mean; cells on the right half only, the left their mirror */
function meshRegion(g, sd, top, base, edgeH) {
  const { nx, ny, n, c } = g, X = g.X, Y = g.Y;
  const pos = [], idx = [];
  const vmap = new Map();
  const inside = (i, j) => sd[j * nx + i] < 0;
  // a vertex: kind 0 node (i, j), 1 the edge (i, j)–(i+1, j), 2 the edge (i, j)–(i, j+1); top or bottom
  const make = (kind, i, j, t) => {
    if (kind === 0) { const z = t ? top[j * nx + i] : 0; return [X(i), Y(j), z]; }
    const [ia, ja, ib, jb] = kind === 1 ? [i, j, i + 1, j] : [i, j, i, j + 1];
    const ka = ja * nx + ia, kb = jb * nx + ib;
    // always FROM the inside node: the mirror's crossing is then the exact negation
    const [ki, ko, ii, ji, io, jo] = sd[ka] < 0 ? [ka, kb, ia, ja, ib, jb] : [kb, ka, ib, jb, ia, ja];
    const tt = sd[ki] / (sd[ki] - sd[ko]);
    const x = X(ii) + tt * (X(io) - X(ii)), y = Y(ji) + tt * (Y(jo) - Y(ji));
    return [x, y, t ? base[ki] + tt * (base[ko] - base[ki]) + edgeH : 0];
  };
  const isLeft = (kind, i) => (kind === 0 ? i < n : kind === 1 ? i < n : i < n);
  const mirrorKey = (kind, i, j) => (kind === 1 ? [kind, 2 * n - i - 1, j] : [kind, 2 * n - i, j]);
  const V = (kind, i, j, t) => {
    const key = ((kind * ny + j) * nx + i) * 2 + (t ? 1 : 0);
    let v = vmap.get(key); if (v !== undefined) return v;
    let p;
    if (isLeft(kind, i)) { const [mk, mi, mj] = mirrorKey(kind, i, j), q = pos[V(mk, mi, mj, t)]; p = [-q[0], q[1], q[2]]; }
    else p = make(kind, i, j, t);
    v = pos.push(p) - 1; vmap.set(key, v); return v;
  };
  const tris = [];   // right-half triangles as vertex specs [kind, i, j, t]
  const segs = [];   // right-half boundary segments [specA, specB] (interior on the left)
  for (let j = 0; j < ny - 1; j++) for (let i = n; i < nx - 1; i++) {
    const cs = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], ins = cs.map(([a, b]) => inside(a, b));
    const cnt = ins.filter(Boolean).length;
    if (!cnt) continue;
    const node = (k) => [0, cs[k][0], cs[k][1]];
    const edge = (k) => (k === 0 ? [1, i, j] : k === 1 ? [2, i + 1, j] : k === 2 ? [1, i, j + 1] : [2, i, j]);
    let polys;
    const saddle = cnt === 2 && ins[0] === ins[2];
    if (saddle && (sd[j * nx + i] + sd[j * nx + i + 1] + sd[(j + 1) * nx + i + 1] + sd[(j + 1) * nx + i]) / 4 >= 0) {
      polys = ins[0] ? [[node(0), edge(0), edge(3)], [edge(1), node(2), edge(2)]] : [[edge(0), node(1), edge(1)], [edge(2), node(3), edge(3)]];
    } else {
      const pl = [];
      for (let k = 0; k < 4; k++) { if (ins[k]) pl.push(node(k)); if (ins[k] !== ins[(k + 1) % 4]) pl.push(edge(k)); }
      polys = [pl];
    }
    for (const pl of polys) {
      for (let k = 1; k + 1 < pl.length; k++) tris.push([pl[0], pl[k], pl[k + 1]]);
      for (let k = 0; k < pl.length; k++) { const a = pl[k], b = pl[(k + 1) % pl.length]; if (a[0] && b[0]) segs.push([a, b]); }
    }
  }
  const emit = (a, b, cc) => idx.push(a, b, cc);
  const spec = (s, t, mir) => { if (!mir) return V(s[0], s[1], s[2], t); const [mk, mi, mj] = mirrorKey(s[0], s[1], s[2]); return V(mk, mi, mj, t); };
  for (const mir of [false, true]) {
    for (const [a, b, cc] of tris) {
      const A = spec(a, 1, mir), B = spec(b, 1, mir), C = spec(cc, 1, mir), a0 = spec(a, 0, mir), b0 = spec(b, 0, mir), c0 = spec(cc, 0, mir);
      if (!mir) { emit(A, B, C); emit(a0, c0, b0); } else { emit(A, C, B); emit(a0, b0, c0); }
    }
    for (const [a, b] of segs) {
      const Ta = spec(a, 1, mir), Tb = spec(b, 1, mir), Ba = spec(a, 0, mir), Bb = spec(b, 0, mir);
      if (!mir) { emit(Ta, Ba, Bb); emit(Ta, Bb, Tb); } else { emit(Ta, Bb, Ba); emit(Ta, Tb, Bb); }
    }
  }
  // the outline's loops (for the paper): chain the segments, both halves
  const next = new Map();
  for (const mir of [false, true]) for (const [a, b] of segs) { const ka = spec(a, 1, mir), kb = spec(b, 1, mir); if (!mir) next.set(ka, kb); else next.set(kb, ka); }
  const loops = [], seen = new Set();
  for (const k0 of next.keys()) {
    if (seen.has(k0)) continue;
    const l = []; let k = k0;
    while (k !== undefined && !seen.has(k)) { seen.add(k); l.push([pos[k][0], pos[k][1]]); k = next.get(k); }
    if (l.length > 2) { l.push(l[0].slice()); loops.push(l); }
  }
  const positions = new Float64Array(pos.length * 3);
  for (let k = 0; k < pos.length; k++) { positions[3 * k] = pos[k][0]; positions[3 * k + 1] = pos[k][1]; positions[3 * k + 2] = pos[k][2]; }
  const T = idx.length / 3;
  return { positions, indices: Int32Array.from(idx), parts: [{ id: 'mass', kind: 'mass', base: 0, t0: 0, t1: T, nu: 0, nv: 0, c: null, r: null }], loops, at: [0, 0] };
}
