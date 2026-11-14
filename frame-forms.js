/* frame-forms.js — the /frame flow study's round 4 (Nov 14): the FORMS. A
   prototype behind the hidden param `ornFlow: 'forms'`; with it absent
   nothing here runs and every frame builds as on `main`, by branch
   (withOrnament). Read docs/frame-flow-study.md §11 and the MEASURED PROFILES
   in docs/frame-flow-grammar.md §9 first.

   Round 3 (frame-mass.js, M3) filled and inflated a region round C2's thin
   composed spines, and every critic read it as "a web behind a wire": the
   spine said where the body was, and the spine was a wire's. This round keeps
   round 3's construction — the raster, the union, the close and open, the
   height hierarchy, the watertight marching-squares element, the coverage
   instrument — and the composition's PLACEMENTS (the keypoints along the side:
   the crest root, the waist, the meeting at the high, the node, the foot),
   and REPLACES HOW EACH ELEMENT'S OUTLINE IS MADE. Every element is built
   from the profiles measured off the bronze oval (grammar §9), not from C2's
   spine:

   - a C-SCROLL STRAP (the shoulder arch, the crest and bottom C's): a band of
     near-constant width (0.46 M measured, 0.37 M entering its volute), on a
     circular ARC (curvature ≈ 1/M held over ~60 % of its length) that ramps
     into a VOLUTE of ≥ 1.1 turns round a PIERCED EYE; its other end curls the
     same way into a small tail volute (both ends curl in, under the arch); its
     section is CHANNELLED (a raised bead along each edge, a hollow between);
     a pointed TONGUE leaf hangs from its crown on the inner side;
   - a REEDED FLAME (the flank): a bundle of 4 reeds, 0.38 M at its root
     swelling to 0.72 M at 62 % of its length, nearly straight (curvature
     ≤ 0.25/M) and following the frame, its tip ROLLED OVER outward into an
     open curl round a pierced hollow;
   - a REEDED STEM rising from the lower flank to a ROLLED NODE (the stem's top
     rolled over outward), and a FOOT strap curling UNDER at the bottom;
   - NODE MOTIFS that differ in kind by position: a FAN of three leaflets at
     the meeting (the crest flow's last word), a lobed SHEATH over the flame
     group's root, a CURL-UNDER leaf where the stem and the foot part;
   - SHELLS at the crest and the bottom MODELLED as cupped fans: radial lobes
     with rolled tips round a scalloped rim, fluted between, rising to the rim.
   Every volute's coil is pierced from the next turn where it stays at least
   FORMS.coilMin wide with a gap ≥ FORMS.gap (else merged, the spiral incised),
   and every eye is a hole ≥ FORMS.eyeHole: both survive the close.

   Pure functions, no DOM; every transcendental through frame-math.js. */

import { MIN_FEATURE_MM } from './frame-registry.js';
import { plateOutline } from './frame-relief.js';
import * as FM from './frame-math.js';
import { edt, makeGrid, siteLine, fillPoly, mirrorInto, mirrorUnion, dilate, erode, meshRegion } from './frame-mass.js';

const F = MIN_FEATURE_MM;
const DEG = Math.PI / 180;
const TAU = 2 * Math.PI;
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a, b, t) => a + (b - a) * t;
const sq = (x) => x * x;
const asin = (x) => FM.atan2(x, Math.sqrt(Math.max(0, 1 - x * x)));

/* the measured profiles (grammar §9), in band widths M unless marked mm */
export const FORMS = {
  cell: 0.2,                 // mm at a 180 mm print (scales with the print)
  embed: 1.0,                // mm: a root runs this far into the molding
  c: { w: 0.46, wEntry: 0.36, k: 1.0, tongue: [0.5, 0.3] },     // the C strap: body width, entering its volute, the arc's curvature (1/M), the tongue (length, half-width)
  vol: { r0: 0.42, r0Max: 0.7, turns: 1.15, wEnd: 1.3 },        // a C's volute: the coil's centre radius at entry (M; grown to r0Max for a pierced coil), turns, the coil's width at the eye (mm)
  tail: { r0: 0.28, turns: 0.9 },
  flame: { w: [0.3, 0.7, 0.36], peak: 0.62, slit: 1.5, reeds: 3, kMax: 0.25, roll: { r: 0.26, w: 0.32, turns: 0.5, shrink: 0.7 }, lobes: { n: 3, from: 0.55, to: 0.95, a: 0.13 } },
  stem: { w: 0.6, reeds: 5, bow: 0, lift: 0.3, roll: { r: 0.36, w: 0.42, turns: 0.6, shrink: 0.65 } },
  foot: { w: 0.58, reeds: 5, roll: { r: 0.42, w: 0.46, turns: 0.92, shrink: 0.55, narrow: 0.75 } },
  fan: { len: [0.85, 1.1, 0.8], w: 0.5, spread: 28, lobes: 2 },
  sheath: { len: 1.3, w: 0.62, lobes: 3 },
  curl: { len: 0.85, w: 0.36, r0: 0.26 },
  shell: { lobes: 4, lobeW: 0.42, flutes: 18, cup: 0.55, bead: 0.55 },
  gap: 1.3,                  // mm: a pierced coil's least gap (> 2·close)
  coilMin: 1.25,             // mm: a coil is pierced from the next only where it stays at least this wide
  eyeHole: 1.3,              // mm: an eye's hole, at least
  close: 0.5,                // mm: the closing radius (a gap narrower than 1.0 mm is filled — no slit)
  open: 0.5,                 // mm: the opening radius (a sliver narrower than 1.0 mm is removed)
  blur: [3, 3],
  levels: { fill: 1.0, leaf: 2.0, stem: 2.2, flame: 2.8, foot: 2.5, c: 2.7, coil: 3.2, shell: 3.8 },
  height: { edge: 0.45, round: 1.2, slope: 0.55, bead: 0.34, channel: 0.32, reed: 0.2, rib: 0.35, groove: 0.45, grooveW: 0.3, flute: 0.5, eyeRise: 0.45, footEase: 0.8, baseBlur: 1.6 },
};
const RISE = { c: [0.72, 1.18], flame: [0.62, 1.15], stem: [0.75, 1.2], foot: [0.8, 1.15], leaf: [0.8, 1.05] };
const KIND = { fill: 0, leaf: 1, stem: 2, flame: 3, foot: 4, c: 5, coil: 6, shell: 7 };   // flames OVER the stem they spring from (F4)

/* ------------------------------------------------------------------ */
/* paths in the side's LOCAL frame (s along, y out), mapped to the world */
/* ------------------------------------------------------------------ */

/* a turtle: from (s, y) at heading th (radians from +s toward +y), through
   segments { len, k0, k1 } (curvature ramping linearly, 1/mm, + turns toward +y) */
function walk(s, y, th, segs, ds = 0.15) {
  const P = [[s, y]], Hd = [th];
  for (const g of segs) {
    const n = Math.max(1, Math.ceil(g.len / ds)), d = g.len / n;
    for (let i = 0; i < n; i++) {
      const k = lerp(g.k0, g.k1, (i + 0.5) / n);
      const h = th + k * d / 2;
      s += d * FM.cos(h); y += d * FM.sin(h); th += k * d;
      P.push([s, y]); Hd.push(th);
    }
  }
  return { P, Hd };
}
/* a cubic Bézier in the local frame from P0 leaving at heading th0 (handle d0) to P3 arriving at heading th3
   (handle d3), resampled by arc length; its headings read off the samples */
function bez(P0, th0, d0, P3, th3, d3, ds = 0.15) {
  const P1 = [P0[0] + d0 * FM.cos(th0), P0[1] + d0 * FM.sin(th0)], P2 = [P3[0] - d3 * FM.cos(th3), P3[1] - d3 * FM.sin(th3)];
  const B = (t) => { const u = 1 - t; return [u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0], u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1]]; };
  const fine = []; for (let i = 0; i <= 600; i++) fine.push(B(i / 600));
  const u = arcLen(fine), L = u[u.length - 1], n = Math.max(2, Math.ceil(L / ds)), P = [];
  let k = 0;
  for (let i = 0; i <= n; i++) { const want = L * i / n; while (k < fine.length - 2 && u[k + 1] < want) k++; const t = (want - u[k]) / Math.max(1e-12, u[k + 1] - u[k]); P.push([lerp(fine[k][0], fine[k + 1][0], t), lerp(fine[k][1], fine[k + 1][1], t)]); }
  const Hd = P.map((_, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)]; return FM.atan2(b[1] - a[1], b[0] - a[0]); });
  for (let i = 1; i < Hd.length; i++) { while (Hd[i] - Hd[i - 1] > Math.PI) Hd[i] -= TAU; while (Hd[i] - Hd[i - 1] < -Math.PI) Hd[i] += TAU; }
  Hd[Hd.length - 1] = th3 + Math.round((Hd[Hd.length - 2] - th3) / TAU) * TAU;
  return { P, Hd };
}
/* a spiral continuing from the end of `path`: its centre radius from r0 to
   rEnd over `turns`, turning `sg` (+1 toward +y), appended in place; returns
   the index where it starts and its centre */
function spiralOn(path, r0, rEnd, turns, sg, ds = 0.12) {
  const P = path.P, Hd = path.Hd, i0 = P.length - 1;
  let [s, y] = P[i0], th = Hd[i0];
  const b = FM.log(r0 / rEnd) / (TAU * turns), phiEnd = TAU * turns;
  const cen = [s - sg * r0 * FM.sin(th), y + sg * r0 * FM.cos(th)];
  let phi = 0;
  while (phi < phiEnd) {
    const r = r0 * FM.exp(-b * phi), dphi = Math.min(ds / r, phiEnd - phi), dd = r * dphi;
    const h = th + sg * dphi / 2;
    s += dd * FM.cos(h); y += dd * FM.sin(h); th += sg * dphi; phi += dphi;
    P.push([s, y]); Hd.push(th);
  }
  return { i0, cen, b, r0, rEnd, turns };
}
const boxOf = (P) => { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const [x, y] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { at: [(x0 + x1) / 2, (y0 + y1) / 2], size: Math.max(x1 - x0, y1 - y0) }; };
const arcLen = (P) => { const u = [0]; for (let i = 1; i < P.length; i++) u.push(u[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); return u; };

/* ------------------------------------------------------------------ */
/* the raster with OWNERS: each cell remembers the element that owns it  */
/* and where across that element it lies (the section's coordinate)      */
/* ------------------------------------------------------------------ */

function stampOwn(g, R, el, pts, r, uArr, edge = 0) {
  const { nx, ny, c, n, y0 } = g, id = el.id, pri = el.pri;
  for (let k = 0; k + 1 < pts.length; k++) {
    const a = pts[k], b = pts[k + 1], ra = r[k], rb = r[k + 1];
    if (!(ra > 0) && !(rb > 0)) continue;
    const R0 = Math.max(ra, rb);
    const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - R0) / c) + n), i1 = Math.min(nx - 1, Math.ceil((Math.max(a[0], b[0]) + R0) / c) + n);
    const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - R0 - y0) / c)), j1 = Math.min(ny - 1, Math.ceil((Math.max(a[1], b[1]) + R0 - y0) / c));
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-12, l = Math.sqrt(l2);
    for (let j = j0; j <= j1; j++) {
      const yy = y0 + j * c;
      for (let i = i0; i <= i1; i++) {
        const x = (i - n) * c, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (yy - a[1]) * dy) / l2));
        const ex = x - a[0] - t * dx, ey = yy - a[1] - t * dy, rr = ra + (rb - ra) * t, d2 = ex * ex + ey * ey;
        if (!(rr > 0) || d2 > rr * rr) continue;
        const kk = j * nx + i, q = Math.sqrt(d2) / rr, sgn = (dx * ey - dy * ex) / l >= 0 ? 1 : -1;
        R.A[kk] = 1;
        if (edge) { if (R.own[kk] < 0 || pri > R.pri[kk]) { R.pri[kk] = pri; R.own[kk] = id; R.acr[kk] = edge; R.alu[kk] = uArr ? lerp(uArr[k], uArr[k + 1], t) : 0; } continue; }
        if (pri > R.pri[kk] || (pri === R.pri[kk] && q < Math.abs(R.acr[kk]))) {
          R.pri[kk] = pri; R.own[kk] = id; R.acr[kk] = sgn * q; R.alu[kk] = uArr ? lerp(uArr[k], uArr[k + 1], t) : 0;
        }
      }
    }
  }
}
function fillOwn(g, R, el, poly) {
  const { nx, ny, c, n, y0 } = g, m = poly.length;
  for (let j = 0; j < ny; j++) {
    const y = y0 + j * c, xs = [];
    for (let k = 0; k < m; k++) { const a = poly[k], b = poly[(k + 1) % m]; if ((a[1] <= y) !== (b[1] <= y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil(xs[k] / c) + n), i1 = Math.min(nx - 1, Math.floor(xs[k + 1] / c) + n);
      for (let i = i0; i <= i1; i++) { const kk = j * nx + i; R.A[kk] = 1; if (el.pri > R.pri[kk]) { R.pri[kk] = el.pri; R.own[kk] = el.id; R.acr[kk] = 0; R.alu[kk] = 0; } }
    }
  }
}

/* ------------------------------------------------------------------ */
/* the forms                                                           */
/* ------------------------------------------------------------------ */

export function formsFor(model, orn, SF) {
  const p = model.params, s = orn.scale, M = orn.length, told = [];
  const cell = FORMS.cell * Math.max(1, p.printHeight / 180);
  const yOut = orn.flow.yOut, side = orn.flow.side, L = SF.L, emb = FORMS.embed;
  const kp = orn.flow.keypoints.slice().sort((a, b) => a.s - b.s);
  const eAt = (sv) => {
    if (sv <= kp[0].s) return kp[0].e; if (sv >= kp[kp.length - 1].s) return kp[kp.length - 1].e;
    let i = 0; while (i < kp.length - 2 && kp[i + 1].s < sv) i++;
    return kp[i].e + (kp[i + 1].e - kp[i].e) * smooth((sv - kp[i].s) / Math.max(1e-9, kp[i + 1].s - kp[i].s));
  };
  const W = (q) => SF.W(Math.max(0, Math.min(L, q[0])), q[1]) ;
  // a local point past the side's ends is carried along the end's own tangent
  const Wx = (q) => { if (q[0] >= 0 && q[0] <= L) return SF.W(q[0], q[1]); const e = q[0] < 0 ? 0 : L, f = SF.fr(e), ds = q[0] - e; return [f.p[0] + ds * f.t[0] + q[1] * f.n[0], f.p[1] + ds * f.t[1] + q[1] * f.n[1]]; };
  const sil = plateOutline(model).map(([x, y]) => [x * s, y * s]);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of [...orn.flow.envelope, ...sil]) { x0 = Math.min(x0, x, -x); x1 = Math.max(x1, x, -x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const pad = 3 * M;
  const g = makeGrid({ x0: x0 - pad, x1: x1 + pad, y0: y0 - pad, y1: y1 + pad }, cell);
  const { nx, ny, n } = g, N = nx * ny, X = g.X, Y = g.Y;
  const R = { A: new Uint8Array(N), own: new Int16Array(N).fill(-1), pri: new Uint8Array(N), acr: new Float32Array(N), alu: new Float32Array(N) };
  const groove = new Float64Array(N).fill(1e9), rib = new Float64Array(N).fill(1e9), eyeD = new Float64Array(N).fill(1e9);
  const els = [], holes = [], rec = [], nodes = [], nodePlaces = [];
  const add = (kind, extra = {}) => { const el = { id: els.length, kind, pri: KIND[kind] + 1, lvl: FORMS.levels[kind], ...extra }; els.push(el); return el; };

  /* one strap: a local path, half-widths per point; the world points stamped and recorded */
  const strap = (el, path, half, opts = {}) => {
    const Pw = path.P.map(W), u = arcLen(Pw), Lw = u[u.length - 1];
    stampOwn(g, R, el, Pw, half, u.map((v) => v / Lw));
    el.pts = Pw; el.half = half; el.u = u;
    if (opts.rib) siteLine(g, rib, Pw.slice(Math.floor(opts.rib[0] * Pw.length), Math.ceil(opts.rib[1] * Pw.length)));
    return Pw;
  };
  /* a volute's coil: its width limited by the turn inside it (pierced where a gap ≥ FORMS.gap leaves the coil
     ≥ FORMS.coilMin, else merged and the spiral incised); its eye a hole */
  const coilWidths = (Pw, i0, wIn, wEnd, sp) => {
    const nP = Pw.length, w = new Float64Array(nP - i0), merged = new Uint8Array(nP - i0);
    const ph = [0]; for (let i = i0 + 1; i < nP; i++) ph.push(ph[ph.length - 1] + 1);
    const total = nP - 1 - i0;
    for (let i = i0; i < nP; i++) {
      const t = total ? (i - i0) / total : 1, tw = lerp(wIn, wEnd, smooth(t));
      // the inner turn: points of this coil more than ¾ of a turn further in
      let d = Infinity;
      for (let j = i0; j < nP; j++) {
        const dp = (j - i) / Math.max(1, total) * sp.turns; if (Math.abs(dp) < 0.75) continue;
        const dd = Math.hypot(Pw[j][0] - Pw[i][0], Pw[j][1] - Pw[i][1]); if (dd < d) d = dd;
      }
      if (d === Infinity) { w[i - i0] = tw; continue; }
      if (d - FORMS.gap >= Math.max(FORMS.coilMin, 0.6 * tw)) w[i - i0] = Math.min(tw, d - FORMS.gap);
      else { w[i - i0] = Math.max(tw, d + 0.15); merged[i - i0] = 1; }
    }
    return { w, merged };
  };
  // a volute's EYE: the centre of its last turn (the centroid of the coil's final full turn), the hole the largest
  // circle there that leaves every point of that turn its own half-width — at least FORMS.eyeHole across
  const volute = (Pw, half, iV, turns) => {
    // the eye: the largest circle inside the coil's LAST full turn that leaves every point of that turn its own
    // half-width (searched on a 0.1 mm lattice inside the turn) — at least FORMS.eyeHole across
    const n = Pw.length, i0 = Math.max(iV, Math.round(n - 1 - (n - 1 - iV) / Math.max(1, turns)));
    const T = Pw.slice(i0), Th = half.slice(i0);
    let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
    for (const [x, y] of T) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); }
    const inside = (q) => { let c = false; for (let i = 0, j = T.length - 1; i < T.length; j = i++) { const a = T[i], b = T[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    let best = -Infinity, cen = [(bx0 + bx1) / 2, (by0 + by1) / 2];
    for (let x = bx0; x <= bx1; x += 0.1) for (let y = by0; y <= by1; y += 0.1) {
      const q = [x, y]; if (!inside(q)) continue;
      let m = Infinity; for (let i = 0; i < T.length; i++) m = Math.min(m, Math.hypot(T[i][0] - x, T[i][1] - y) - Th[i]);
      if (m > best) { best = m; cen = q; }
    }
    // the eye is a BALL on the coil's END, in a dark crescent RING (the bronze's E1/E2: "a ball eye in a dark ring"):
    // the last turn's empty circle is pierced, and the ball is kept out of the cut, joined to the coil where the
    // spiral ends. Round 4's first cut pierced the ball's centre, which read as two dots — a face, not an eye.
    const room = best - 0.1, r = FORMS.eyeHole / 2, end = Pw[n - 1];
    // the ball CONCENTRIC in a ring of uniform width FORMS.eyeHole, held to the coil's end by a bridge one printable
    // feature wide — a ball touching the coil left the crescent tapering to a sub-millimetre wedge (FP, measured
    // 0.93 mm at the corner C)
    const ringW = FORMS.eyeHole, ball = room - ringW >= 0.6 ? room - ringW : 0;
    if (ball) {
      const dl = Math.hypot(end[0] - cen[0], end[1] - cen[1]) || 1, to = [cen[0] + (end[0] - cen[0]) / dl * (room + 0.3), cen[1] + (end[1] - cen[1]) / dl * (room + 0.3)];
      const boss = add('coil'); stampOwn(g, R, boss, [cen, cen], [ball + 0.05, ball + 0.05], null);
      stampOwn(g, R, boss, [cen, to], [0.6, 0.6], null);
      holes.push({ c: cen, r: room, keep: { c: cen, r: ball, to, w: 0.55 } });
      siteLine(g, eyeD, [cen, cen], 4);
      return { cen, r: ringW / 2, ball: true, squeezed: false };
    }
    holes.push({ c: cen, r: Math.max(r, room) });
    siteLine(g, eyeD, [cen, cen], 4);
    return { cen, r: Math.max(r, room), ball: false, squeezed: room < r };
  };

  // ---- the C-scroll strap ----
  // from a ROOT on the molding at local (sR, yOut − emb), heading thR; an arc of curvature kSg·FORMS.c.k/M for
  // `arc` radians; then a spiral volute (≥ 1.1 turns) the same way; the root end curls the same way into a tail
  // volute (built back from the root). Returns the element.
  const cScroll = (sR, thR, arc, sense, opts = {}) => {
    const el = add('c'), kc = (opts.k || FORMS.c.k) / M, sg = sense;
    const body = opts.body || walk(sR, yOut - emb, thR, [{ len: arc / kc, k0: sg * kc, k1: sg * kc }]);
    const nBody = body.P.length;
    const r0 = (opts.r0 || FORMS.vol.r0) * M, wEnd = FORMS.vol.wEnd;
    // the volute: grow r0 until a ≥ 1.1-turn coil keeps a pierced gap (to r0Max), else merged
    let rv = r0, sp = null, path = null;
    for (let tries = 0; tries < 8; tries++) {
      path = { P: body.P.map((q) => q.slice()), Hd: body.Hd.slice() };
      // a short clothoid from the arc's curvature into the coil's
      const kIn = 1 / rv, ramp = 0.6 * rv;
      const tmp = walk(path.P[path.P.length - 1][0], path.P[path.P.length - 1][1], path.Hd[path.Hd.length - 1], [{ len: ramp, k0: sg * kc, k1: sg * kIn }]);
      path.P.push(...tmp.P.slice(1)); path.Hd.push(...tmp.Hd.slice(1));
      const rEnd = FORMS.eyeHole / 2 + wEnd / 2 + 0.1;
      sp = spiralOn(path, rv, Math.min(rEnd, 0.6 * rv), opts.turns || FORMS.vol.turns, sg);
      const Pw = path.P.map(W), cw = coilWidths(Pw, sp.i0, FORMS.c.wEntry * M, wEnd, sp);
      const mergedShare = cw.merged.reduce((a, b) => a + b, 0) / cw.merged.length;
      if (mergedShare < 0.05 || rv >= FORMS.vol.r0Max * M) { path.cw = cw; break; }
      rv = Math.min(FORMS.vol.r0Max * M, rv * 1.12);
    }
    // the tail volute at the root, built backward: reverse the body, curl
    const tail = { P: body.P.slice().reverse().map((q) => q.slice()), Hd: body.Hd.slice().reverse().map((h) => h + Math.PI) };
    let tailSp = null;
    if (opts.tail !== false) {
      const tr = (opts.tailR || FORMS.tail.r0) * M;
      tailSp = spiralOn(tail, tr, Math.min(FORMS.eyeHole / 2 + 0.75, 0.7 * tr), opts.tailTurns || FORMS.tail.turns, -sg);
    }
    // one path: the tail's spiral (reversed back out) + the body + the volute
    const tailPart = tailSp ? tail.P.slice(tailSp.i0 + 1).reverse() : [];
    const full = { P: [...tailPart, ...path.P], Hd: [] };
    const nT = tailPart.length, nBodyFull = nT + nBody, nAll = full.P.length;
    const iV = nT + sp.i0;
    const half = new Array(nAll);
    for (let i = 0; i < nAll; i++) {
      if (i < nT) { const t = i / Math.max(1, nT); half[i] = 0.5 * lerp(FORMS.coilMin * 1.05, FORMS.c.w * M * 0.85, smooth(t)); continue; }
      if (i < nBodyFull) { const t = (i - nT) / Math.max(1, nBody - 1); half[i] = 0.5 * M * lerp(FORMS.c.w * 0.92, FORMS.c.w, Math.sqrt(Math.max(0, FM.sin(Math.PI * Math.min(1, t * 1.4))))); continue; }
      if (i < iV) { const t = (i - nBodyFull) / Math.max(1, iV - nBodyFull); half[i] = 0.5 * M * lerp(FORMS.c.w, FORMS.c.wEntry, smooth(t)); continue; }
      half[i] = 0.5 * path.cw.w[i - iV];
    }
    const Pw = strap(el, full, half);
    el.coilFrom = iV / nAll; el.tailTo = nT / nAll;
    // the coil and the eye: their own class (higher), stamped over the strap's coil stretch
    const coil = add('coil');
    stampOwn(g, R, coil, Pw.slice(iV), half.slice(iV), Pw.slice(iV).map((_, i, a) => i / (a.length - 1)));
    const vEnd = path.P[path.P.length - 1];
    const eye = volute(Pw, half, iV, sp.turns), cen = eye.cen;
    // the merged stretch's incised spiral
    const gp = [];
    for (let i = iV; i < nAll; i++) { if (path.cw.merged[i - iV]) gp.push(Pw[i]); else { if (gp.length > 3) siteLine(g, groove, gp.splice(0)); gp.length = 0; } }
    if (gp.length > 3) siteLine(g, groove, gp);
    if (tailSp) { if (nT > 4) volute(Pw.slice(0, nT + 1).reverse(), half.slice(0, nT + 1).reverse(), 0, tailSp.turns); if (nT > 1) stampOwn(g, R, add('coil'), Pw.slice(0, nT + 1), half.slice(0, nT + 1), Pw.slice(0, nT + 1).map((_, i, a) => i / (a.length - 1))); }
    // the TONGUE: a pointed leaf hanging from the crown on the inner side
    if (opts.tongue !== false) {
      const ic = Math.floor(nT + 0.5 * nBody), [sc, yc] = full.P[ic], hc = body.Hd[Math.floor(0.5 * nBody)];
      const inn = hc + sg * Math.PI / 2;    // toward the arch's centre (a turn of sense sg has its centre on that side)
      const [tl, tw] = FORMS.c.tongue;
      const tp = walk(sc, yc, inn + sg * 0.35, [{ len: tl * M, k0: 0, k1: sg * 0.6 / M }]);
      const lf = add('leaf');
      strap(lf, tp, tp.P.map((_, i, a) => { const t = i / (a.length - 1); return M * tw * FM.pow(Math.max(0, FM.sin(Math.PI * Math.min(1, 0.15 + 0.85 * t))), 0.7) * FM.pow(Math.max(0, 1 - t), 0.4); }), { rib: [0.05, 0.85] });
    }
    rec.push({ kind: 'C', role: opts.role || 'C', ...boxOf(Pw), L: arcLen(Pw).pop() / M, turns: sp.turns, voluteR: rv / M, eye: eye.r * 2, eyeSqueezed: eye.squeezed, pierced: path.cw.merged.reduce((a, b) => a + b, 0) / path.cw.merged.length < 0.5 });
    return { el, cen, Pw };
  };

  // ---- a reeded strap (flame, stem, foot): a local path, a width profile, its end ROLLED: the measured roll is a
  //      CURL of near-constant radius (not a spiral) — the strap turns over through `turns` round a pierced hollow,
  //      so the curl's outer diameter is about the strap's own width twice over (E4: 0.95 M round a 0.18 M hollow)
  const reeded = (kind, path, wProf, roll, rollSense, reeds, lobes = null) => {
    const el = add(kind, { reeds });
    const nPath = path.P.length, wR = roll.w * M;
    const rc = Math.max(roll.r * M, wR / 2 + FORMS.eyeHole / 2 + 0.15);
    const [sE, yE] = path.P[nPath - 1], thE = path.Hd[nPath - 1];
    const ramp = 0.6 * rc;
    // an open hook rolls at a constant radius (E4/E5); a SPIRAL (the foot, E3: "a closed curl round a dark hollow",
    // the strap entering it and narrowing) tightens to shrink × the radius over its second half — round 4's F2
    // foot was a constant-radius ring, read by its critic as a bagel
    const rcE = rc * (roll.shrink || 1), arcT = TAU * roll.turns - 0.3;
    const tail = walk(sE, yE, thE, roll.shrink
      ? [{ len: ramp, k0: 0, k1: rollSense / rc }, { len: rc * 0.5 * arcT, k0: rollSense / rc, k1: rollSense / rc }, { len: lerp(rc, rcE, 0.5) * 0.5 * arcT, k0: rollSense / rc, k1: rollSense / rcE }]
      : [{ len: ramp, k0: 0, k1: rollSense / rc }, { len: rc * arcT, k0: rollSense / rc, k1: rollSense / rc }]);
    path.P.push(...tail.P.slice(1)); path.Hd.push(...tail.Hd.slice(1));
    const nAll = path.P.length, iR = nPath - 1;
    const half = new Array(nAll), Ploc = path.P.map((q) => q.slice());
    for (let i = 0; i < nAll; i++) {
      if (i <= iR) {
        const t = i / Math.max(1, iR);
        half[i] = 0.5 * M * wProf(t);
        // the LOBES: the outer edge (the side away from the frame, +y of the strap's left when heading upstream)
        // stepped in bumps that rise slowly and drop sharply toward the tip (acanthus serration points with growth)
        continue;
      }
      const t = (i - iR) / Math.max(1, nAll - 1 - iR), w0 = M * wProf(1);
      const endTaper = roll.closed ? (t > 0.93 ? 0.55 + 0.45 * Math.sqrt(Math.max(0, 1 - sq((t - 0.93) / 0.07))) : 1) : lerp(1, 0.38, smooth((t - 0.45) / 0.55));
      half[i] = 0.5 * lerp(Math.min(w0, wR * 1.15), wR, smooth(Math.min(1, t * 3))) * endTaper * (roll.narrow ? lerp(1, roll.narrow, smooth(t)) : 1);
    }
    const Pw = Ploc.map(W), u = arcLen(Pw), Lw = u[u.length - 1];
    stampOwn(g, R, el, Pw, half, u.map((v) => v / Lw));
    // the LOBES: bumps on the OUTER edge (the side the tip rolls toward), each rising slowly and dropping sharply
    // toward the tip — acanthus serration points with the growth; stamped as edge material, so the strap's own
    // section (its reeds) is not moved
    if (lobes) {
      const bp = [], br = [];
      for (let i = 0; i <= iR; i++) {
        const t = i / Math.max(1, iR); let bump = 0;
        for (let q = 0; q < lobes.n; q++) { const t0 = lobes.from + (lobes.to - lobes.from) * q / lobes.n, t1 = lobes.from + (lobes.to - lobes.from) * (q + 1) / lobes.n; if (t >= t0 && t < t1) { const v = (t - t0) / (t1 - t0); bump = v < 0.78 ? smooth(v / 0.78) : 1 - smooth((v - 0.78) / 0.22); } }
        const th = path.Hd[i], side = -rollSense, dl = lobes.a * M * bump;
        const off = half[i] + dl / 2 - 0.3 * dl;
        bp.push(W([Ploc[i][0] - side * FM.sin(th) * off * -1, Ploc[i][1] + side * FM.cos(th) * off * -1])); br.push(Math.max(0, dl * 0.65));
      }
      stampOwn(g, R, el, bp, br, null, 0.97);
    }
    el.pts = Pw; el.half = half; el.rollFrom = iR / nAll; el.rollU = u[iR] / Lw;
    const [sL, yL] = path.P[nAll - 1], thL = path.Hd[nAll - 1];
    const cen = W([sL - rollSense * rcE * FM.sin(thL), yL + rollSense * rcE * FM.cos(thL)]);
    // which side of the strap the roll's hollow is on, in stampOwn's own sign (the cross of the strap's direction
    // with the way to the centre): the roll is turned OVER, its outer edge high, sloping down into the hollow
    { const im = Math.round(iR + 0.5 * (nAll - 1 - iR)), A = Pw[Math.max(0, im - 1)], B = Pw[Math.min(nAll - 1, im + 1)], dx = B[0] - A[0], dy = B[1] - A[1]; el.hollowSide = (dx * (cen[1] - A[1]) - dy * (cen[0] - A[0])) >= 0 ? 1 : -1; }
    let hr = 0;
    // a CLOSED curl (the foot) is pierced: its hollow a hole; an open hook leaves its hollow open
    if (roll.closed) { hr = Math.max(FORMS.eyeHole / 2, rcE - wR * (roll.narrow || 1) / 2 - 0.05); holes.push({ c: cen, r: hr }); }
    rec.push({ kind, ...boxOf(Pw), rollAt: W(path.P[Math.round(iR + 0.5 * (nAll - 1 - iR))]), L: Lw / M, turns: roll.turns, rollD: 2 * (rc + wR / 2) / M, hollow: roll.closed ? 2 * hr / M : 2 * (rc - wR / 2) / M, closed: !!roll.closed });
    return { el, Pw, cen, nPath, half, iR };
  };

  // ---- a leaf (fan leaflet, sheath, curl-under): a local path, a lobed half-width, a midrib ----
  const leaf = (path, lenM, wM, lobes, opts = {}) => {
    const el = add('leaf');
    const Pw = path.P.map(W), nP = Pw.length;
    const half = Pw.map((_, i) => {
      const t = i / (nP - 1);
      const body = t < 0.3 ? 0.55 + 0.45 * smooth(t / 0.3) : FM.pow(Math.max(0, FM.cos((t - 0.3) / 0.7 * Math.PI / 2)), 0.8);
      let lb = 1; for (let q = 1; q <= lobes; q++) { const tq = 0.3 + 0.6 * q / (lobes + 0.5), e = (t - tq) / 0.05; lb -= 0.3 * FM.exp(-e * e); }
      return Math.max(0, 0.5 * wM * M * body * lb + (opts.tipRound && t > 0.9 ? 0.2 : 0));
    });
    const u = arcLen(Pw), Lw = u[u.length - 1];
    stampOwn(g, R, el, Pw, half, u.map((v) => v / Lw));
    siteLine(g, rib, Pw.slice(Math.floor(0.05 * nP), Math.ceil(0.85 * nP)));
    el.pts = Pw;
    return el;
  };

  // ---- the shells: cupped fans, lobes with rolled tips round a scalloped rim, fluted ----
  const shells = [];
  const shell = (sBase, dirSign, Rm, lobesN) => {
    // the base on the axis, the fan opening along the side's normal there (crest: up, bottom: down)
    const f0 = SF.fr(sBase), base = [0, f0.p[1] + (yOut - emb) * f0.n[1]], out = [0, Math.sign(f0.n[1])];
    const el = add('shell'); el.base = base; el.out = out; el.R = Rm;
    const span = 62 * DEG, nL = 2 * lobesN - 1;
    // a cupped fan to 0.78 R, then the LOBES: broad, touching at the rim (each as wide as its share of the rim),
    // rounded at the tip, so the rim is scalloped
    const sector = [base];
    for (let a = -span; a <= span + 1e-9; a += span / 30) sector.push([base[0] + 0.84 * Rm * FM.sin(a), base[1] + out[1] * 0.84 * Rm * FM.cos(a)]);
    fillOwn(g, R, el, sector);
    // a disc at the base: the fan's two edges leave a wedge against the molding there, too narrow to print open
    { const disc = []; for (let k = 0; k <= 32; k++) { const a = Math.PI * k / 32; disc.push([base[0] + 0.42 * Rm * FM.cos(a), base[1] + out[1] * 0.42 * Rm * FM.sin(a)]); } fillOwn(g, R, el, disc); }
    const share = 2 * span * Rm / nL;
    for (let q = -lobesN + 1; q <= lobesN - 1; q++) {
      const a = q / (lobesN - 1) * span * (1 - 0.5 / nL), len = Rm * (1 - 0.08 * sq(q / (lobesN - 1)));
      const d = [FM.sin(a), out[1] * FM.cos(a)];
      const pts = [], half = [];
      for (let k = 0; k <= 24; k++) {
        const t = k / 24, r = len * lerp(0.3, 1, t);
        pts.push([base[0] + r * d[0], base[1] + r * d[1]]);
        const wide = 0.5 * share * 0.98 * (r / Rm);
        half.push(Math.max(0.5, wide * (t > 0.86 ? Math.sqrt(Math.max(0, 1 - sq((t - 0.86) / 0.14))) * 0.75 + 0.25 : 1)));
      }
      stampOwn(g, R, el, pts, half, pts.map((_, i) => i / 24));
    }
    shells.push(el);
    rec.push({ kind: 'shell', at: [base[0], base[1] + out[1] * 0.5 * Rm], size: 2 * Rm, R: Rm / M, lobes: nL });
    return el;
  };

  // ================= the assembly, by the keypoints' roles (grammar §1, §9: the bronze's own sequence) =================
  // the CREST flow: the shell → a small C poured out from under it, curling up and back toward the shell → the
  //   shoulder C rising off the waist, arching back toward the crest, its volute opposed to the crest C's → a FAN
  //   at the meeting (the crest flow's last word);
  // the BOTTOM flow: the bottom shell (or the sill) → the FOOT strap running out from under it and curling under at
  //   the foot → the STEM rising from beside the foot up the lower flank to a ROLLED NODE → the FLAMES springing
  //   from the frame just above the node, fanning up toward the meeting, their tips rolled outward.
  const bnd = kp.filter((k) => k.b !== 'swell');
  const sw = kp.filter((k) => k.b === 'swell');
  const lows = bnd.filter((k) => k.b === 'low');
  const root = bnd.find((k) => k.b === 'root'), foot = bnd.find((k) => k.b === 'foot'), end = bnd.find((k) => k.b === 'end');
  const lastNode = side.nodes[side.nodes.length - 1];
  const reedW = (w0, w1, peak, w2) => (t) => (t < peak ? lerp(w0, w1, smooth(t / peak)) : lerp(w1, w2, smooth((t - peak) / (1 - peak))));
  // the crest: a shell, and the small C (E2): from under the shell's edge running out along the frame, curling up
  // and back toward the shell (its eye faces the source)
  if (root) {
    shell(0, 1, Math.min(1.9, Math.max(1.4, root.e)) * M, FORMS.shell.lobes);
    // E2's measured curvature: a near-straight run (κ·M 0.2–0.3 over its first third), then turning hard (κ·M 1–3)
    // into the volute — not a hoop (round 4's first crest C was a 205° hoop at κ·M 1.8, read as a ring handle)
    // only where the run to the waist has room for both Cs (a rectangle's short top: the crest C ran into the
    // shoulder C and the two clotted round one hole)
    if (!lows[0] || lows[0].s - root.s >= 2.2 * M) {
      const cBody = walk(0.95 * M, yOut - emb, 14 * DEG, [{ len: 0.55 * M, k0: 0.25 / M, k1: 0.6 / M }, { len: 1.15 * M, k0: 0.6 / M, k1: 2.4 / M }]);
      cScroll(1.05 * M, 8 * DEG, 0, 1, { body: cBody, k: 2.0, r0: 0.4, tail: false, tongue: false, turns: 1.1, role: 'crest C' });
    }
  }
  // the shoulder C (E1): rooted at the first low (the waist), rising up and back toward the crest, arching over and
  // curling in under its own arch; its volute just outside the molding, opposed to the crest C's
  const low0 = lows[0];
  if (root && low0) {
    // E1's own curvature: a HELD ARC (κ·M 0.7–1.0) rising off the waist toward the crest, ≈ 2.4 M long, then the
    // volute curling down under its own arch. The F5 critic read the earlier circle-through-a-chord (with a tail
    // volute inside it) as "a doughnut": a C that closes on itself is not E1
    const Lb = Math.min(2.4 * M, 0.7 * (low0.s - root.s)), th0 = Math.PI - 58 * DEG;
    const sBody = walk(low0.s, yOut - emb, th0, [{ len: 0.35 * Lb, k0: 0.7 / M, k1: 0.95 / M }, { len: 0.65 * Lb, k0: 0.95 / M, k1: 1.2 / M }]);
    cScroll(low0.s, th0, 0, 1, { body: sBody, k: 1.0, tail: false, turns: 1.25, role: 'shoulder C' });
  }
  // the meeting: a FAN — three broad leaflets from one root just downstream of the waist, spread down and out
  if (low0) {
    nodePlaces.push({ place: 'meeting', kind: 'fan' }); nodes.push({ kind: 'fan', place: 'meeting', s: low0.s });
    const s0 = low0.s + 0.25 * M;
    FORMS.fan.len.forEach((ln, q) => {
      const a = (-FORMS.fan.spread + q * FORMS.fan.spread) * DEG + 32 * DEG;
      leaf(walk(s0, yOut - emb, a, [{ len: ln * M, k0: 0, k1: -0.7 / M }]), ln, FORMS.fan.w, 2, { tipRound: true });
    });
  }
  // the FLAMES: round every HIGH between two lows, a group rooted together at the downstream low (just above the
  // node), FANNING: the inner flame low along the molding and longest, up toward the meeting; the middle rising to
  // ~0.6 of the envelope; the outer rising steeply to the high's envelope; each then following the frame, its tip
  // rolled outward and over (a NEGATIVE turn heading upstream: −s → +y → +s)
  const flameRoots = []; let corners = 0;
  for (let i = 0; i < bnd.length - 2; i++) {
    const a = bnd[i], h = bnd[i + 1], b = bnd[i + 2];
    if (!((a.b === 'low' || a.b === 'root') && h.b === 'high' && b.b === 'low')) continue;
    const sRoot = b.s + 0.2 * M, eH = h.e, corner = !!h.corner;
    flameRoots.push(sRoot);
    // the three TIPS (where each roll begins): the outer at the high, rolled out to its envelope; the middle further
    // up, at ~0.6 of the envelope; the inner, longest, low along the molding up to just short of the meeting
    const upTo = corner ? h.s + 0.9 * M : a.b === 'low' ? a.s + (a === lows[0] ? 1.0 : 0.8) * M : a.s + 2.4 * M;
    // the inner tip reaches the meeting (or just short of the high, where the meeting is nearer); the next two are
    // spaced between it and the high, so a long side gets long flames rather than a gap above a short bundle
    // — but never longer than 4.5 M from the high (a long rail's meeting is a whole stile away, and a flame run that
    // far wrapped the rectangle's corners), and at a CORNER the bundle keeps to the corner (its tips past it) unless the corner is CRAMPED (the arch's
    // springing, its next low 2.3 M away: the bundle had no room and built one flame) — then it runs up past it
    // (a corner's TURN, the angle between the side's tangents 1 M either side: the arch's springing turns ~0°, a
    // rectangle's corner 90° — only a shallow one may be run past, or the bundle wraps the rectangle's corner)
    const cosTurn = (q) => { const t0 = SF.fr(q - M).t, t1 = SF.fr(q + M).t; return t0[0] * t1[0] + t0[1] * t1[1]; };
    const cramped = corner && b.s - h.s < 3 * M && cosTurn(h.s) > Math.SQRT1_2;
    const tIn = corner ? (cramped ? h.s - 1.1 * M : Math.max(upTo, h.s - 1.1 * M)) : Math.min(h.s - 1.1 * M, Math.max(upTo, h.s - 4.5 * M)), tOut = h.s - 0.05 * M;
    const fan = [
      { tip: [tIn, 0.3 * M], roll: { ...FORMS.flame.roll, r: 0.24, w: 0.3, turns: 0.36 }, launch: 1.3 },
      { tip: [Math.max(tIn + 1.0 * M, tOut), Math.max(0.75, 0.78 * eH - 0.3) * M], roll: { ...FORMS.flame.roll, r: 0.27, turns: 0.45 }, launch: 2.0 },
      { tip: [h.s + (corner ? 0.9 : 0.45) * M, Math.max(0.85, eH - (corner ? 0.8 : 0.55)) * M], roll: { ...FORMS.flame.roll, r: corner ? 0.36 : 0.3, w: corner ? 0.4 : 0.36, turns: 0.63 }, launch: 2.4, ws: 1.25, lobeA: 0.2 },
    ];
    // the roots are STAGGERED along the frame (the inner flame springs first, the outer last): a bundle that splits,
    // so a slit opens between each pair rather than one wing-shaped mass
    const grp = [];
    for (const [fi, fg] of fan.entries()) {
      const P0 = [sRoot + (fi - 1) * 0.28 * M, yOut - emb], P3 = [fg.tip[0], yOut + fg.tip[1]], dist = P0[0] - P3[0];
      if (dist < 1.0 * M) continue;
      const th0 = Math.PI - Math.min(70 * DEG, FM.atan2(fg.launch * (P3[1] - P0[1]), dist));
      const path = bez(P0, th0, 0.38 * dist, P3, Math.PI, 0.42 * dist);
      // ONE dominant flame (F5: "one dominant swelling flame with feathered lobes, plus a smaller one" — four alike read
      // as a comb): the outer swells to 1.25 × the others, its lobes deeper
      const ws = fg.ws || 0.85;
      grp.push(reeded('flame', path, reedW(FORMS.flame.w[0], ws * FORMS.flame.w[1], FORMS.flame.peak, FORMS.flame.w[2]), fg.roll, -1, FORMS.flame.reeds, { ...FORMS.flame.lobes, a: fg.lobeA || FORMS.flame.lobes.a }));
    }
    // each flame its OWN body (E5; the F2 critic: "one fused reeded wing"): a pierced SLIT along the midline between
    // each neighbouring pair, from a third of the way up to where they part, wherever both keep ≥ a printable
    // feature beside it — the bundle still springs as one from the root, then splits
    for (let q = 0; q + 1 < grp.length; q++) {
      const A = grp[q], B = grp[q + 1], rs = Math.max(FORMS.flame.slit / 2, 2.4 * cell), keep = 1.0;
      for (let i = Math.round(0.3 * A.iR); i <= A.iR; i++) {
        let bj = -1, bd = Infinity;
        for (let j = Math.round(0.15 * B.iR); j <= B.iR; j++) { const d = Math.hypot(A.Pw[i][0] - B.Pw[j][0], A.Pw[i][1] - B.Pw[j][1]); if (d < bd) { bd = d; bj = j; } }
        if (bj < 0 || bd < 2 * (rs + keep) || bd > A.half[i] + B.half[bj] + 0.2) continue;
        holes.push({ c: [(A.Pw[i][0] + B.Pw[bj][0]) / 2, (A.Pw[i][1] + B.Pw[bj][1]) / 2], r: rs });
      }
    }
    // a lobed SHEATH over the group's root, pointing up with the flames
    // a CORNER is a source (R4/R5): the largest volute on the frame — a C rooted just past the corner, curling up
    // round it into a big volute on the corner's diagonal, the flames running up to meet it
    if (corner) {
      // its body a curve from the side (2.4 M past the corner, rising off the molding) up to the corner's diagonal,
      // arriving heading out, then the volute curling over and back toward the side (the largest volute: r0 0.5 M)
      const P0 = [h.s + 2.4 * M, yOut - emb], P3 = [h.s + 0.25 * M, yOut + Math.max(0.9, eH - 0.75) * M];
      const body = bez(P0, Math.PI - 35 * DEG, 0.45 * (P0[0] - P3[0]), P3, Math.PI / 2 + 25 * DEG, 0.5 * (P3[1] - P0[1]));
      cScroll(P0[0], 0, 0, -1, { body, k: 0.9, r0: corners === 0 ? 0.52 : 0.46, tail: false, tongue: false, turns: corners === 0 ? 1.3 : 1.42, role: 'corner C' }); corners++;
    }
    nodePlaces.push({ place: `flames@${sRoot.toFixed(1)}`, kind: 'sheath' }); nodes.push({ kind: 'sheath', place: `flames@${sRoot.toFixed(1)}`, s: sRoot });
    leaf(walk(sRoot + 0.45 * M, yOut - emb, Math.PI - 30 * DEG, [{ len: FORMS.sheath.len * M, k0: 0, k1: 0.6 / M }]), FORMS.sheath.len, FORMS.sheath.w, FORMS.sheath.lobes);
  }
  // the FOOT (E3): from under the bottom shell (or the sill's end) running out upstream to the foot, curling UNDER.
  // Built FIRST: the stem springs from it (the bottom flow is ONE chain — grammar §2, the critic's round-4 F1 note)
  let footBody = null;
  if (foot && end) {
    const sRoot = end.s - (lastNode.cls === 'bottom' ? 0.55 : 0.35) * M, dist = sRoot - foot.s;
    const yT = Math.max(0.9, foot.e - 0.55) * M, lenB = Math.max(1.4 * M, dist + 0.3 * M), aL = 0.55 * lenB, rise = FM.atan2(2 * (yT + emb), aL);
    const path = walk(sRoot, yOut - emb, Math.PI - rise, [{ len: aL / 2, k0: 0, k1: 0 }, { len: aL / 2, k0: rise * 2 / (aL / 2) * 0.5, k1: rise * 2 / (aL / 2) * 0.5 }, { len: lenB - aL, k0: 0, k1: 0.35 / M }]);
    footBody = { P: path.P.map((q) => q.slice()), Hd: path.Hd.slice() };
    // curling under: heading upstream (−s), turning toward +y (out, down at the bottom) and back (+s) — negative
    reeded('foot', path, reedW(0.42, FORMS.foot.w, 0.3, 0.46), FORMS.foot.roll, -1, FORMS.foot.reeds);
  }
  // the STEM: round a SWELL between two lows with no high between, a reeded strap that SPRINGS FROM THE FOOT STRAP
  // (leaving it along its own tangent at 55 % of its length — a split, not a joint) where the foot is next, or from
  // the molding otherwise; it comes in to HUG the molding (its centre 0.32 M out, its inner edge on the molding's),
  // runs up the flank along the frame and ROLLS outward and over (the node) just below the flame group's roots, so
  // the lower flank is one piece: foot → stem → node → flames
  for (let i = 0; i < bnd.length - 1; i++) {
    const a = bnd[i], b = bnd[i + 1];
    if (!(a.b === 'low' && b.b === 'low')) continue;
    const sv = sw.find((q) => q.s > a.s && q.s < b.s); if (!sv) continue;
    const nxt = bnd[i + 2];
    const fr = flameRoots.find((q) => Math.abs(q - a.s) < 0.6 * M) ?? a.s;
    const tipS = fr + 0.2 * M, yHug = 0.32 * M;    // its roll under the flames' root, sharing material (F5: fused hand-offs)
    let P0, h0, onFoot = false;
    if (nxt && nxt.b === 'foot' && footBody) {
      const k = Math.round(0.55 * (footBody.P.length - 1)); P0 = footBody.P[k].slice(); h0 = footBody.Hd[k]; onFoot = true;
    } else {
      const sRoot = nxt ? Math.min(b.s + 0.6 * (nxt.s - b.s), b.s + 2.4 * M) : b.s; P0 = [sRoot, yOut - emb]; h0 = Math.PI - 35 * DEG;
    }
    if (P0[0] - tipS < 1.2 * M) continue;
    // in to the molding (arriving parallel), then along it, then the node's roll
    const sIn = P0[0] - Math.min(1.8 * M, 0.35 * (P0[0] - tipS));
    const inPath = bez(P0, h0, 0.35 * (P0[0] - sIn), [sIn, yOut + yHug], Math.PI, 0.45 * (P0[0] - sIn));
    // an S-BOW (grammar §2; the F2 critic: "a ruler-straight fluted plank"): along the molding, bowing OUT by
    // FORMS.stem.bow M at its middle — a pierced lens opening between it and the band — and back in, then lifting
    // off toward the node so the roll stands out from the frame (E4: the node 1.26 M out)
    const sMid = (sIn + tipS) / 2, bowY = yOut + yHug + FORMS.stem.bow * M;
    const along1 = bez([sIn, yOut + yHug], Math.PI, 0.35 * (sIn - sMid), [sMid, bowY], Math.PI, 0.35 * (sIn - sMid));
    const along2 = bez([sMid, bowY], Math.PI, 0.35 * (sMid - tipS), [tipS, yOut + yHug + FORMS.stem.lift * M], Math.PI - 22 * DEG, 0.35 * (sMid - tipS));
    const path = { P: [...inPath.P, ...along1.P.slice(1), ...along2.P.slice(1)], Hd: [...inPath.Hd, ...along1.Hd.slice(1), ...along2.Hd.slice(1)] };
    reeded('stem', path, onFoot ? reedW(0.46, FORMS.stem.w, 0.25, 0.55) : reedW(0.44, FORMS.stem.w, 0.3, 0.55), FORMS.stem.roll, -1, FORMS.stem.reeds, { n: 2, from: 0.6, to: 0.95, a: 0.14 });
    // a CURL-UNDER leaf where the stem leaves the foot (or its root), rolled down toward the foot
    const cs = onFoot ? sIn + 0.3 * M : P0[0];
    nodePlaces.push({ place: `stem@${cs.toFixed(1)}`, kind: 'curl' }); nodes.push({ kind: 'curl', place: `stem@${cs.toFixed(1)}`, s: cs });
    leaf(walk(cs, yOut - emb, 50 * DEG, [{ len: 0.45 * FORMS.curl.len * M, k0: 0, k1: -1.5 / M }, { len: 0.55 * FORMS.curl.len * M, k0: -1.5 / M, k1: -2.3 / M }]), FORMS.curl.len, FORMS.curl.w, 2);
  }
  if (end && lastNode.cls === 'bottom') {
    shell(L, -1, Math.min(1.5, Math.max(1.0, end.e)) * M, FORMS.shell.lobes - 1);
    // the bottom C (the crest C's answer): from under the bottom shell running out along the frame, curling out and
    // back toward the shell, between the molding and the foot strap
    // no bottom C: the FOOT strap is what pours out from under the bottom shell (E3, the bronze); a C there collided
    // with the foot's curl (F2: "a pad with two drill holes"; run out along the frame, a clot of holes)
  }

  // ---- the union, mirrored; closed and opened; the holes cut ----
  // the owners' fields are mirrored (the left half the right's)
  mirrorUnion(g, R.A);
  for (const f of [R.own, R.pri, R.acr, R.alu]) mirrorInto(g, f);
  { for (let j = 0; j < ny; j++) for (let i = 0; i < n; i++) { const k = j * nx + i; R.acr[k] = -R.acr[k]; } }
  for (const f of [groove, rib, eyeD]) { for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, m = j * nx + 2 * n - i; if (f[m] < f[k]) f[k] = f[m]; } }
  const frame = new Uint8Array(N); fillPoly(g, frame, sil); mirrorInto(g, frame);
  const U = new Uint8Array(N); for (let k = 0; k < N; k++) U[k] = R.A[k] | frame[k];
  const Cl = erode(g, dilate(g, U, FORMS.close), FORMS.close);
  for (let k = 0; k < N; k++) if (frame[k]) Cl[k] = 1;
  // and a last CLOSE after the open: an open can leave a one-cell notch where it trimmed a lip (FP read 0.93 mm at
  // two such notches); a close only fills, so it can add no feature under the open's own floor
  const Op = erode(g, dilate(g, dilate(g, erode(g, Cl, FORMS.open), FORMS.open), FORMS.open), FORMS.open);
  const out = new Uint8Array(N); for (let k = 0; k < N; k++) out[k] = frame[k] ? 0 : Op[k];
  const into = dilate(g, out, emb);
  const Rg = new Uint8Array(N);
  for (let k = 0; k < N; k++) Rg[k] = frame[k] ? (R.A[k] | into[k]) : out[k];
  // the eyes and the rolls' hollows: holes (both halves), cut after the close so it cannot fill them
  const cutHole = (hc, rr, keep) => {
    const r2 = (rr / cell) * (rr / cell), ic = Math.round(hc[0] / cell) + n, jc = Math.round((hc[1] - g.y0) / cell), rc = Math.ceil(rr / cell) + 1;
    for (let j = jc - rc; j <= jc + rc; j++) for (let i = ic - rc; i <= ic + rc; i++) {
      if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
      const dx = X(i) - hc[0], dy = Y(j) - hc[1];
      if (keep && (X(i) - keep.c[0]) * (X(i) - keep.c[0]) + (Y(j) - keep.c[1]) * (Y(j) - keep.c[1]) <= keep.r * keep.r) continue;
      if (keep && keep.to) {
        const ax = keep.to[0] - keep.c[0], ay = keep.to[1] - keep.c[1], t = Math.max(0, Math.min(1, ((X(i) - keep.c[0]) * ax + (Y(j) - keep.c[1]) * ay) / (ax * ax + ay * ay)));
        if (sq(X(i) - keep.c[0] - t * ax) + sq(Y(j) - keep.c[1] - t * ay) <= keep.w * keep.w) continue;
      }
      if (dx * dx + dy * dy <= rr * rr && !frame[j * nx + i] && R.pri[j * nx + i] !== KIND.shell + 1) Rg[j * nx + i] = 0;
    }
  };
  for (const h of holes) { cutHole(h.c, h.r, h.keep); cutHole([-h.c[0], h.c[1]], h.r, h.keep && { c: [-h.keep.c[0], h.keep.c[1]], r: h.keep.r, to: h.keep.to && [-h.keep.to[0], h.keep.to[1]], w: h.keep.w }); }
  mirrorInto(g, Rg);

  // the frame's height inside it, carried out on a falling cone
  const dSil = edt(nx, ny, (k) => !frame[k]);
  const Hz = new Float64Array(N).fill(-Infinity);
  // the WHOLE band, not a strip 1.4 M in from its edge (round 3's): a form lying further in than the strip sank
  // under the molding and the band's own surface cut a straight scratch across it
  const near = Infinity;
  for (let j = 0; j < ny; j++) for (let i = n; i < nx; i++) { const k = j * nx + i; if (frame[k] && dSil[k] <= near) { const hh = orn.H([X(i), Y(j)]); if (hh > -Infinity) Hz[k] = hh; } }
  mirrorInto(g, Hz);
  // a piece held by nothing (not touching the frame) is left out, told
  {
    const lab = new Int32Array(N).fill(-1), keep = [];
    let id = 0;
    for (let k0 = 0; k0 < N; k0++) {
      if (!Rg[k0] || lab[k0] >= 0) continue;
      const st = [k0]; lab[k0] = id; let held = false;
      while (st.length) { const k = st.pop(); if (Hz[k] > -Infinity) held = true; const i = k % nx, j = (k - i) / nx; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= ny) continue; const kk = b * nx + a; if (Rg[kk] && lab[kk] < 0) { lab[kk] = id; st.push(kk); } } }
      keep.push(held); id++;
    }
    let dropped = 0;
    for (let k = 0; k < N; k++) if (Rg[k] && !keep[lab[k]]) Rg[k] = 0;
    for (const q of keep) if (!q) dropped++;
    if (dropped) told.push(`${dropped} piece${dropped > 1 ? 's' : ''} held by nothing — left out`);
  }

  // ---- the signed distance and the heights ----
  const dIn = edt(nx, ny, (k) => !Rg[k]), dOut = edt(nx, ny, (k) => Rg[k]);
  const sd = new Float64Array(N);
  for (let k = 0; k < N; k++) sd[k] = Rg[k] ? -(Math.sqrt(dIn[k]) - 0.5) * cell : (Math.sqrt(dOut[k]) - 0.5) * cell;
  const blur = (f, passes) => {
    for (let pass = 0; pass < passes; pass++) {
      const t = new Float64Array(N);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; t[k] = (2 * f[k] + f[j * nx + Math.max(0, i - 1)] + f[j * nx + Math.min(nx - 1, i + 1)]) / 4; }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; f[k] = (2 * t[k] + t[Math.max(0, j - 1) * nx + i] + t[Math.min(ny - 1, j + 1) * nx + i]) / 4; }
    }
  };
  blur(sd, FORMS.blur[0]);
  const sdh = Float64Array.from(sd); blur(sdh, FORMS.blur[1]);
  for (let k = 0; k < N; k++) if (sd[k] === 0) sd[k] = 1e-9;
  mirrorInto(g, sd); mirrorInto(g, sdh);
  const base = new Float64Array(N);
  for (let k = 0; k < N; k++) base[k] = Hz[k];
  const sl = FORMS.height.slope * cell, sd2 = sl * Math.SQRT2;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; let v = base[k]; if (i > 0) v = Math.max(v, base[k - 1] - sl); if (j > 0) { v = Math.max(v, base[k - nx] - sl); if (i > 0) v = Math.max(v, base[k - nx - 1] - sd2); if (i < nx - 1) v = Math.max(v, base[k - nx + 1] - sd2); } base[k] = v; }
  for (let j = ny - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) { const k = j * nx + i; let v = base[k]; if (i < nx - 1) v = Math.max(v, base[k + 1] - sl); if (j < ny - 1) { v = Math.max(v, base[k + nx] - sl); if (i < nx - 1) v = Math.max(v, base[k + nx + 1] - sd2); if (i > 0) v = Math.max(v, base[k + nx - 1] - sd2); } base[k] = v; }
  // the cone's FOOT eased into the ground (a C1 quadratic over ± footEase): a max(0, ·) left a crease along the
  // contour where the cone runs out, read in the relief as a straight scratch across every element it crossed
  { const w = FORMS.height.footEase; for (let k = 0; k < N; k++) { const b = base[k]; base[k] = b >= w ? b : b <= -w ? 0 : (b + w) * (b + w) / (4 * w); } }
  // and BLURRED (σ ≈ baseBlur mm): the band's own profile turns fast at its outer edge, and a form lying across that
  // edge took the turn as a crease straight across it
  { const sg = FORMS.height.baseBlur / cell; blur(base, Math.max(1, Math.round(2 * sg * sg))); }
  mirrorInto(g, base);

  const Hh = FORMS.height, raw = new Float64Array(N);
  const g2 = (d, w) => (d > 4 * w ? 0 : FM.exp(-d * d / (w * w)));
  for (let k = 0; k < N; k++) {
    if (!(sd[k] < 0)) continue;
    const o = R.own[k], el = o >= 0 ? els[o] : null, a = R.acr[k], aa = Math.abs(a);
    let lvl = el ? el.lvl : FORMS.levels.fill, f = 1;
    if (el) {
      switch (el.kind) {
        case 'c': f = 0.86 + Hh.bead / lvl * 2 * FM.exp(-sq((aa - 0.72) / 0.18)) - Hh.channel / lvl * 2 * FM.exp(-sq(a / 0.32)); break;
        case 'coil': f = 0.8 + 0.2 * Math.sqrt(Math.max(0, 1 - aa * aa)); break;
        case 'flame': case 'stem': case 'foot': {
          // the reeds run along the body and DIE OUT before the end turns (§9; the critic's F1 note: reeds run into
          // the eye read as fingerprint grooves); in the roll the strap is turned OVER: its outer edge high, falling
          // into the hollow (seen from the front, the roll's back with its eye in shadow), and the whole roll raised
          // round 4 F4: the reeds are CARRIED into the curl and die out halfway round it (the F3 critic: "the strap
          // carries its reeds and its width into the curl"; a curl with a plain surface read as a ring)
          const u = R.alu[k], ru = el.rollU ?? 1, fade = 1 - smooth((u - (ru + 0.45 * (1 - ru))) / (0.3 * (1 - ru) + 1e-9));
          const nr = el.reeds, ph = Math.PI * nr * (a + 1) - Math.PI, reed = fade * Hh.reed / lvl * 2 * (0.5 + 0.5 * FM.cos(ph));
          f = 0.86 * (1 - 0.1 * aa * aa);
          if (u > ru - 0.04) {
            const t = smooth((u - (ru - 0.04)) / 0.12), ao = a * (el.hollowSide || 1);   // +1 at the hollow's edge, −1 the outer
            f = lerp(f, 1.18 - 0.32 * (ao + 1) / 2 - 0.12 * ao * ao, t);
          }
          f += reed * (1 - 0.1 * aa * aa);
          break;
        }
        case 'leaf': f = 0.72 + 0.28 * FM.exp(-sq(a / 0.3)); break;
        case 'shell': {
          const bx = el.base, x = X(Math.min(nx - 1, k % nx)), yv = Y(Math.floor(k / nx));
          const dx = Math.abs(x) - 0, dy = (yv - bx[1]) * el.out[1], rho = Math.hypot(x, dy) / el.R, ang = FM.atan2(x, Math.max(1e-6, dy));
          const fl = 0.5 + 0.5 * FM.cos(ang * FORMS.shell.flutes * 2);
          f = (1 - FORMS.shell.cup) + FORMS.shell.cup * FM.pow(Math.min(1, rho), 1.3) - Hh.flute / lvl * fl * smooth((rho - 0.15) / 0.25) * (1 - smooth((rho - 0.9) / 0.1)) + FORMS.shell.bead / lvl * smooth((rho - 0.82) / 0.12);
          break;
        }
        default: f = 1;
      }
    }
    // DEPTH along the element (the F4 critic: "every element one plateau"): low where it leaves its parent, rising
    // to its crown, the end (a volute, a roll, a hook) climbing highest — so overlapping parts stand at different heights
    if (el && RISE[el.kind]) { const [r0, r1] = RISE[el.kind], u = R.alu[k]; f *= r0 + (r1 - r0) * smooth(u); }
    raw[k] = lvl * f;
  }
  // the levels step between elements, they do not cliff: a light blur of the raw height (the reeds survive)
  mirrorInto(g, raw);
  blur(raw, 2);
  const top = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    if (!(sd[k] < 0)) continue;
    const a = Math.min(1, Math.max(0, -sdh[k]) / Hh.round), rd = Math.sqrt(1 - (1 - a) * (1 - a));
    let h = Hh.edge + (raw[k] - Hh.edge) * rd;
    h += Hh.rib * g2(rib[k], 0.45) * a;
    h -= Hh.groove * g2(groove[k], Hh.grooveW) * a;
    h += Hh.eyeRise * g2(eyeD[k], 2.2) * a;
    top[k] = base[k] + Math.max(Hh.edge, h);
  }
  mirrorInto(g, top);
  const el = meshRegion(g, sd, top, base, Hh.edge);
  el.kind = 'mass'; el.mass = true; el.forms = true;
  const Wt = [];
  for (let i = 0; i < el.positions.length; i += 3) if (el.positions[i + 2] > 0) Wt.push(el.positions[i], el.positions[i + 1], el.positions[i + 2]);
  return { element: el, top: Wt, told, stats: { cell, elements: rec, holes: holes.length, nodes, nodePlaces, triangles: el.indices.length / 3 }, debug: { g, Rg, top, base, raw, groove, rib, eyeD, own: R.own, holes } };
}
