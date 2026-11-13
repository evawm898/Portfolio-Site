/* frame-compose.js — the /frame COMPOSED contour (the flow study's round 2,
   Nov 13–14; NOT the shipped default). A prototype behind the hidden param
   `ornFlow: 'composed'`; with it absent nothing here runs and every frame
   builds as on `main`, by branch (withOrnament). Read
   docs/frame-flow-study.md (round 2) and docs/frame-flow-grammar.md first.

   Round 1 GREW the ornament: a scroll, children forking off its body, placed
   until something collided — and five critics in a row read "a wire with hooks
   hanging off it". This module COMPOSES it, the way baroque scrollwork is
   drawn: the silhouette first, then a head-to-tail sequence of C and S scrolls
   along it, then the volutes at their ends, then the leaves.

   1. THE SILHOUETTE. A target outer envelope e(s) per skeleton, beyond the
      molding's outer edge in band widths M, from the references' own profile
      (R2, measured off the trace — grammar §4): the crest high, a WAIST under
      it, an upper-flank SWELL above the frame's widest point, a lower node,
      FEET at the bottom. Keypoints (ENVELOPES) are placed on the side path by
      its own nodes (a corner, a springing) and eased between (smoothstep, so
      every keypoint is an extremum exactly). Mirrored: everything is built on
      the right half and mirrored to the bit.
   2. THE PARTITION. The keypoints that are BOUNDARIES (a waist — low; a
      swell's peak, a corner, a foot — high; the crest's root) split the half
      into scrolls; a scroll between two lows is a C bowed out to the swell
      between them, low → high or high → low an S, the last one an S ending
      in the foot. So the scrolls' lengths are the envelope's own (longest at
      the swell, short at the waist) and nothing is placed by a pitch.
   3. THE HAND-OFF. Two neighbouring scrolls meet BACK TO BACK: the end volute
      of one and the start volute of the next are tangent circles at the
      boundary (their outer turns share a tangent line there — G1 between the
      scrolls, never a branch off a body), overlapping by a share of the wire
      so they print as one solid. A LOW pair sits embedded in the molding's
      outer edge (the scrolls are attached there — R2's "attached at their
      roots and hand-offs, pierced between"); a HIGH pair stands at the
      envelope, curling outward (the flank's opposed horns; the rectangle's
      corner — its largest volutes).
   4. ONE SCROLL. A body and its two volutes, ONE curve: the start volute
      (spiral from its eye out to the body, radius rising linearly in arc
      length from the floor to rv), the body (a quintic Hermite carrying the
      joint's position, heading AND curvature at both ends — G2 into each
      volute), the end volute (spiral in). A C curls one way throughout (its
      volutes both turn toward the frame, under its arch); an S changes sense
      once. The body's departure angle is solved (bisection) so a C's crown
      just touches the envelope.
   5. SOURCES: the crest shell (frame-vine's drapedCrest) takes the two crest
      C's roots — an opposed C pair poured out of the shell; a bottom shell
      sits between the two feet; on the rectangle the corner's high pair is
      the largest volute on the frame.
   6. LEAVES: an acanthus flame sheathes every LOW hand-off (pointing outward
      out of the V between the two arches) and one feathers off the back of
      every HIGH volute pair, pointing with the growth (frame-rinceau's
      acanthusLeaf).
   7. FILL: where a C stands further than COMPOSE.fillAt off the molding, a
      secondary small C continues from that C's start volute (its own start
      volute kissing the primary's, back to back again) under the arch —
      never forked off a body.
   Every wire is the approved carved stroke and arris; the relief order
   (flowers in front, crest highest) is withOrnament's standMotifs; the floors
   are MIN_FEATURE_MM. A wire that cannot be placed a feature clear of
   everything (wire to wire, wire to band — the PLAN GAP: a gap or a join,
   never a slit under 1 mm) is shrunk on a ladder, then left out and TOLD.
   Pure functions, no DOM. */

import { MIN_FEATURE_MM } from './frame-registry.js';
import { FRAME_TRI_BUDGET, solidTriBound, plateOutline, EMBED_MM } from './frame-relief.js';
import {
  CHAIN_SEAT, bandRegion, moldingHeightField, seatOn, slitWorst, mirrorCurve, wireClear, wireClearBound, joinsCleanly,
  LEAF_CROSS, carvedWidth, wAt, selfGap, profileFor, rigid, pip, placeMotif, wireHeight, wireProfile, LEAF_RELIEF, crownScale,
} from './frame-filigree.js';
import { acanthusLeaf } from './frame-rinceau.js';
import { drapedCrest, edgeFrame } from './frame-vine.js';
import { mirrorElement, wireElementContact, elementClear } from './frame-elements.js';
import { sidePath, at, voluteLen } from './frame-flow.js';
import * as FM from './frame-math.js';
import { planSlit2D } from './frame-print.js';

const F = MIN_FEATURE_MM;
const MARGIN = 0.1;
const TAU = 2 * Math.PI;
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const sincH = (x) => (Math.abs(x) < 1e-8 ? 1 - x * x / 6 : FM.sin(x) / x);
const DEG = Math.PI / 180;

/* THE SILHOUETTE, per skeleton: keypoints along the right half, each placed
   by a node of the side path (`n`: the node index, `f`: the fraction of the
   way to the next node) with its projection beyond the molding (`e`, in M)
   and its role in the partition (`b`: 'root' — a crest scroll's start, under
   the shell; 'low' — a waist, a back-to-back pair embedded in the molding;
   'high' — a swell's or a corner's back-to-back pair at the envelope; 'foot'
   — the last scroll's outward foot volute; 'swell' — only the envelope's
   shape, inside a C; 'end' — where the half ends (the bottom shell or the
   sill)). The oval's are R2's, measured off the trace (grammar §4: crest 2.5,
   a waist 0.6–0.8 at ~0.2 of the half, the upper-flank swell 1.8 at ~0.37 —
   above the oval's widest — a dip ~1.0, the lower node 1.7 at ~0.65, the feet
   2.5 at ~0.9); the rectangle's and the arch's are R4/R5's reading (the
   corner the largest, a waist on the top run and on the side). */
export const ENVELOPES = {
  oval: [
    { n: 0, f: 0.03, e: 2.0, b: 'root' }, { n: 0, f: 0.12, e: 1.6, b: 'swell' }, { n: 0, f: 0.40, e: 0.7, b: 'low' },
    { n: 0, f: 0.76, e: 1.8, b: 'high' }, { n: 1, f: 0.06, e: 1.0, b: 'low' }, { n: 1, f: 0.28, e: 1.7, b: 'swell' },
    { n: 1, f: 0.50, e: 0.9, b: 'low' }, { n: 1, f: 0.74, e: 2.4, b: 'foot' }, { n: 1, f: 1, e: 1.8, b: 'end' },
  ],
  rect: [
    { n: 0, f: 0.10, e: 1.8, b: 'root' }, { n: 0, f: 0.35, e: 1.3, b: 'swell' }, { n: 0, f: 0.66, e: 0.6, b: 'low' },
    { n: 1, f: 0, e: 2.0, b: 'high' }, { n: 1, f: 0.26, e: 0.6, b: 'low' }, { n: 1, f: 0.50, e: 1.3, b: 'swell' },
    { n: 1, f: 0.74, e: 0.7, b: 'low' }, { n: 2, f: 0, e: 1.7, b: 'high' }, { n: 2, f: 0.22, e: 1.0, b: 'swell' },
    { n: 2, f: 0.5, e: 1.9, b: 'foot' }, { n: 2, f: 1, e: 1.6, b: 'end' },
  ],
  arch: [
    { n: 0, f: 0.05, e: 2.0, b: 'root' }, { n: 0, f: 0.25, e: 1.4, b: 'swell' }, { n: 0, f: 0.58, e: 0.7, b: 'low' },
    { n: 1, f: 0, e: 1.9, b: 'high' }, { n: 1, f: 0.28, e: 0.6, b: 'low' }, { n: 1, f: 0.50, e: 1.3, b: 'swell' },
    { n: 1, f: 0.64, e: 0.7, b: 'low' }, { n: 1, f: 0.84, e: 1.7, b: 'foot' }, { n: 1, f: 1, e: 1.0, b: 'end' },
  ],
};

export const COMPOSE = {
  rv: { low: [0.11, 2.4, 0.6], high: [0.13, 2.8, 0.8], foot: [0.14, 2.8, 0.9] },   // × the scroll's length, clamped [mm, × M]
  corner: 1.25,          // a high pair ON a corner / springing: its volutes × this (R4/R5: the corner is the largest volute)
  cap: [0.075, 1.5, 0.42], // the body's width: × the scroll's length, clamped [mm, × M]
  turns: { low: 1.05, high: 1.2, foot: 1.35 },
  turnsJitter: [0, 0.12, -0.08, 0.15, -0.1, 0.06, -0.05, 0.1],
  lowSink: EMBED_MM,
  lowSinkK: 0.25,        // × the pair's larger radius: the least a low pair sinks (below)   // mm: a LOW pair's centres stand this far INSIDE the molding's outer edge — the eye and the
                         // inner coil embedded (round 2's first sheet: an eye ending 0.2 mm off the edge was a slit)
  kiss: 0,               // × the thinner cap: a back-to-back pair's centrelines are TANGENT (G1 at the hand-off); the wires
                         // overlap by their half-widths there, which is the join (one solid)
  alpha: [40, 80],       // the bisected departure angle of a C at a low volute (degrees)
  beta: 38,              // an S's angle at its high end (degrees)
  sAlpha: 58,            // an S's angle at its low end (degrees)
  handJoin: 0.5,         // mm: two NEIGHBOURING scrolls join where they overlap at least this deep (their volutes'
                         // shared stretch beside the kiss is fused material, not a hairline; the plan-slit check is the backstop)
  lam: 0.95,             // the Hermite's tangent length, × the chord
  ramp: 1.4,             // × rv: the clothoid ramp out of a volute into the body
  voluteMass: [0.65, 0.35],
  crownFloor: 0.85,
  shrink: [0.85, 0.72, 0.6],
  thin: [0.8, 0.65, 0.5],  // the ladder a scroll's body is thinned down when shrinking its volutes did not clear it
  eyeTrim: [0.8, 0.65, 0.5],   // the ladder a neighbour's end-volute turns are trimmed down   // the ladder a scroll's volutes are shrunk down when it cannot be placed clear
  fillAt: 1.25,          // × M: a C whose crown stands further out than this gets a secondary fill scroll under it
  fillLen: 0.42,         // the fill scroll's chord, × its primary's
  leafLen: 0.42, leafAspect: 0.32, leafLobes: 4,
  nodeR: 1.2,            // a node's volute × this (it carries the spring)
  nodeLean: 12,
  sheathAt: 2.5,         // mm along the spring: the second root a node's sheathing leaf is tried at          // degrees: the spring's lean onward off the node coil's tangent line
  bandWedge: 3.2,        // mm: the same against the band's edge (a volute's coil crossing it at ~25° runs 2.5 mm and prints)
  motifWedge: 1.0,       // mm: the same against a motif's (the crest shell's) lobed edge — a lobe's bump puts a neck in it
  wedge: 1.5,            // mm: the most either of two wires may run beside the other closer than a feature (a V's own tip)
  flameLean: [35, 50],   // degrees: a flame's lean off the stem's tangent, outward (low hand-off, high)
  leafRootUp: 0.35,      // × the pair's radius: a leaf's root above the pair's centres (inside the kiss)
  crestScale: 2.3,      // × M: the crest shell (C3: the crest must stand highest — §5)
  bottomScale: 2.2,      // × M: the bottom shell's size (shrunk until it takes the bottom roots clear)
  pad: 0.15,             // × M: the envelope's inner margin for a wire's crown
};

/* ------------------------------------------------------------------ */
/* the side's own frame                                               */
/* ------------------------------------------------------------------ */

function frameOf(side) {
  const { P } = side, poly = P.poly, L = P.length;
  const fr = (s) => {
    const [x, y, k, t] = at(P, s);
    const k1 = Math.min(poly.length - 1, k + 1);
    const a = side.out[k], b = side.out[k1], o = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])], l = Math.hypot(o[0], o[1]) || 1;
    const k0 = Math.max(0, Math.min(poly.length - 2, k)), dx = poly[k0 + 1][0] - poly[k0][0], dy = poly[k0 + 1][1] - poly[k0][1], tl = Math.hypot(dx, dy) || 1;
    return { p: [x, y], n: [o[0] / l, o[1] / l], t: [dx / tl, dy / tl] };
  };
  const W = (s, y) => { const f = fr(s); return [f.p[0] + y * f.n[0], f.p[1] + y * f.n[1]]; };
  // a world point → (s, y): the nearest point of the side line, the offset along its normal
  const local = (q) => {
    let best = Infinity, bs = 0;
    for (let k = 0; k < poly.length - 1; k++) {
      const ax = poly[k][0], ay = poly[k][1], dx = poly[k + 1][0] - ax, dy = poly[k + 1][1] - ay, l2 = dx * dx + dy * dy || 1e-12;
      const t = Math.max(0, Math.min(1, ((q[0] - ax) * dx + (q[1] - ay) * dy) / l2)), px = ax + t * dx, py = ay + t * dy, d = (q[0] - px) * (q[0] - px) + (q[1] - py) * (q[1] - py);
      if (d < best) { best = d; bs = P.cum[k] + t * (P.cum[k + 1] - P.cum[k]); }
    }
    const f = fr(bs);
    return [bs, (q[0] - f.p[0]) * f.n[0] + (q[1] - f.p[1]) * f.n[1]];
  };
  return { fr, W, local, L };
}
const headingOf = (v) => FM.atan2(v[1], v[0]);
const wAtC = (c, i) => (c.w ? c.w[i] : c.info.wire);
const segD = (q, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1e-12, t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l)); return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy); };

/* ------------------------------------------------------------------ */
/* one scroll: start volute → body → end volute, ONE curve            */
/* ------------------------------------------------------------------ */

/* a spiral from P at heading phi, curling sgn (+1 left), radius falling
   linearly in arc length from rv to re over `turns` turns: P → the eye */
function spiralIn(P, phi, sgn, rv, re, turns) {
  const Lv = voluteLen(turns, rv, re), n = Math.max(12, Math.ceil(Lv / 0.25)), ds = Lv / n;
  const pts = [P.slice()], tan = [phi], kap = [sgn / rv], r = [rv];
  let x = P[0], y = P[1], f = phi;
  for (let i = 0; i < n; i++) {
    const rm = rv + (re - rv) * (i + 0.5) / n, k = sgn / rm, h = k * ds / 2, c = ds * sincH(h);
    x += c * FM.cos(f + h); y += c * FM.sin(f + h); f += k * ds;
    pts.push([x, y]); tan.push(f); const ri = rv + (re - rv) * (i + 1) / n; kap.push(sgn / ri); r.push(ri);
  }
  return { pts, tan, kap, r, Lv };
}

/* the quintic Hermite from (P0, heading a0, curvature k0) to (P1, a1, k1),
   tangent lengths lam × the chord: G2 at both ends */
function hermite(P0, a0, k0, P1, a1, k1, lam) {
  const D = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]), L = lam * D;
  const T0 = [FM.cos(a0), FM.sin(a0)], T1 = [FM.cos(a1), FM.sin(a1)], N0 = [-T0[1], T0[0]], N1 = [-T1[1], T1[0]];
  const V0 = [L * T0[0], L * T0[1]], V1 = [L * T1[0], L * T1[1]], A0 = [L * L * k0 * N0[0], L * L * k0 * N0[1]], A1 = [L * L * k1 * N1[0], L * L * k1 * N1[1]];
  const m = Math.max(64, Math.ceil(D / 0.08)), pts = [];
  for (let i = 0; i <= m; i++) {
    const t = i / m, t2 = t * t, t3 = t2 * t, t4 = t3 * t, t5 = t4 * t;
    const h0 = 1 - 10 * t3 + 15 * t4 - 6 * t5, h1 = t - 6 * t3 + 8 * t4 - 3 * t5, h2 = 0.5 * t2 - 1.5 * t3 + 1.5 * t4 - 0.5 * t5;
    const h3 = 0.5 * t3 - t4 + 0.5 * t5, h4 = -4 * t3 + 7 * t4 - 3 * t5, h5 = 10 * t3 - 15 * t4 + 6 * t5;
    pts.push([0, 1].map((c) => h0 * P0[c] + h1 * V0[c] + h2 * A0[c] + h3 * A1[c] + h4 * V1[c] + h5 * P1[c]));
  }
  return pts;
}

/* resample a polyline at `step` by arc length; headings unwrapped from a0 */
function resampleCurve(poly, step, a0) {
  const cum = [0]; for (let k = 1; k < poly.length; k++) cum.push(cum[k - 1] + Math.hypot(poly[k][0] - poly[k - 1][0], poly[k][1] - poly[k - 1][1]));
  const L = cum[cum.length - 1], n = Math.max(2, Math.ceil(L / step)), pts = [];
  let k = 0;
  for (let i = 0; i <= n; i++) {
    const s = L * i / n; while (k < poly.length - 2 && cum[k + 1] < s) k++;
    const t = (s - cum[k]) / Math.max(1e-12, cum[k + 1] - cum[k]);
    pts.push([poly[k][0] + t * (poly[k + 1][0] - poly[k][0]), poly[k][1] + t * (poly[k + 1][1] - poly[k][1])]);
  }
  const tan = []; let prev = a0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let f = FM.atan2(b[1] - a[1], b[0] - a[0]);
    while (f - prev > Math.PI) f -= TAU; while (f - prev < -Math.PI) f += TAU;
    tan.push(f); prev = f;
  }
  return { pts, tan, L };
}

/* one scroll: spec { A: {kind, c (centre) or root, rv, sgn, phi}, B: {...},
   cap, turnsA, turnsB, lam } → the curve record (pts, tan unwrapped, nrm,
   kap, u, w), with the joints' indices and the body's span */
function buildScroll(spec) {
  const { A, B, cap, lam } = spec, re = F;
  // the joints: P = c − sgn·r·nL(φ) (the circle of radius r tangent at P, on the curl's side)
  const jointOf = (v) => (v.root ? v.root : [v.c[0] + v.sgn * v.rv * FM.sin(v.phi), v.c[1] - v.sgn * v.rv * FM.cos(v.phi)]);
  const PA = jointOf(A), PB = jointOf(B);
  // the start volute: spiralled in BACKWARDS from its joint, then reversed
  let startPts = [], startTan = [], startKap = [];
  if (!A.root) {
    const sp = spiralIn(PA, A.phi + Math.PI, -A.sgn, A.rv, re, spec.turnsA);
    startPts = sp.pts.slice().reverse(); startTan = sp.tan.slice().reverse().map((f) => f - Math.PI); startKap = sp.kap.slice().reverse().map((k) => -k);
  }
  // the body: a short CLOTHOID RAMP out of each volute (curvature from the
  // volute's 1/rv falling linearly to 0 over COMPOSE.ramp × rv), then the
  // quintic Hermite between the ramps' ends at zero curvature — G2 throughout
  // (a Hermite carrying the volute's curvature over a long chord swings
  // wildly: its second derivative is chord² / rv)
  const ramp = (P, phi, k, Lr) => {
    const n = Math.max(8, Math.ceil(Lr / 0.2)), ds = Lr / n, pts = [P.slice()];
    let x = P[0], y = P[1], f = phi;
    for (let i = 0; i < n; i++) { const km = k * (1 - (i + 0.5) / n), h = km * ds / 2, c = ds * sincH(h); x += c * FM.cos(f + h); y += c * FM.sin(f + h); f += km * ds; pts.push([x, y]); }
    return { pts, phi: f };
  };
  const rA = A.root ? { pts: [PA.slice()], phi: A.phi } : ramp(PA, A.phi, A.sgn / A.rv, COMPOSE.ramp * A.rv);
  const rBb = B.root ? { pts: [PB.slice()], phi: B.phi + Math.PI } : ramp(PB, B.phi + Math.PI, -B.sgn / B.rv, COMPOSE.ramp * B.rv);
  const QA = rA.pts[rA.pts.length - 1], QB = rBb.pts[rBb.pts.length - 1];
  const mid = hermite(QA, rA.phi, 0, QB, rBb.phi - Math.PI, 0, lam);
  const bodyRaw = [...rA.pts.slice(0, -1), ...mid, ...rBb.pts.slice(0, -1).reverse()];
  const endSp = B.root ? { pts: [PB.slice()] } : spiralIn(PB, B.phi, B.sgn, B.rv, re, spec.turnsB);
  // one polyline: start volute (without its joint, the body carries it), body, end volute
  const all = [...startPts.slice(0, -1), ...bodyRaw, ...endSp.pts.slice(1)];
  const nStart = startPts.length ? startPts.length - 1 : 0;
  const a0 = startTan.length ? startTan[0] : A.phi;
  const rs = resampleCurve(all, 0.25, a0);
  // arc-length stations of the joints, for the width law
  const cumAt = (cnt) => { let s = 0; for (let k = 1; k <= cnt && k < all.length; k++) s += Math.hypot(all[k][0] - all[k - 1][0], all[k][1] - all[k - 1][1]); return s; };
  const sA = cumAt(nStart), sB = cumAt(nStart + bodyRaw.length - 1);
  const u = rs.pts.map((_, i) => rs.L * i / (rs.pts.length - 1));
  const kap = rs.tan.map((_, i) => { const a = Math.max(0, i - 2), b = Math.min(rs.tan.length - 1, i + 2); return (rs.tan[b] - rs.tan[a]) / Math.max(1e-9, u[b] - u[a]); });
  const nrm = rs.tan.map((f) => [-FM.sin(f), FM.cos(f)]);
  const LvA = A.root ? 0 : voluteLen(spec.turnsA, A.rv, re), LvB = B.root ? 0 : voluteLen(spec.turnsB, B.rv, re);
  // the width: the carved law on the body, the volute's mass held to its eye
  const w = u.map((s, i) => {
    const cw = carvedWidth(1 / Math.max(1e-12, Math.abs(kap[i])), cap);
    if (s < sA && LvA) { const v = Math.min(1, (sA - s) / LvA); return Math.max(cw, cap * (COMPOSE.voluteMass[0] + (COMPOSE.voluteMass[1] - COMPOSE.voluteMass[0]) * v)); }
    if (s > sB && LvB) { const v = Math.min(1, (s - sB) / LvB); return Math.max(cw, cap * (COMPOSE.voluteMass[0] + (COMPOSE.voluteMass[1] - COMPOSE.voluteMass[0]) * v)); }
    // the body SWELLS: from the volutes' 0.65 × cap at its two joints to the full cap at its middle (a
    // carved C has mass in its sweep, not a uniform rod)
    const t = (s - sA) / Math.max(1e-9, sB - sA);
    return Math.max(F, Math.min(cw, cap * (COMPOSE.voluteMass[0] + (1 - COMPOSE.voluteMass[0]) * FM.sin(Math.PI * t))));
  });
  return { kind: 'flow', pts: rs.pts, tan: rs.tan, nrm, kap, u, w, root: 0, body: { sA, sB, PA, PB, raw: bodyRaw },
    info: { kind: 'flow', role: 'scroll', carved: false, flowWidth: true, crownFloor: COMPOSE.crownFloor, wire: cap, tip: F, L: rs.L, Lb: sB - sA, rvA: A.rv, rvB: B.rv, turnsA: spec.turnsA, turnsB: spec.turnsB, sgnA: A.sgn, sgnB: B.sgn, cB: B.c || null } };
}

/* ------------------------------------------------------------------ */
/* the composed ornament                                              */
/* ------------------------------------------------------------------ */

export function composeFor(model, { triBudget = FRAME_TRI_BUDGET } = {}) {
  const p = model.params, kind = model.info.kind, E = EMBED_MM, Fm = F + MARGIN;
  const frameH = model.box.y1 - model.box.y0, scale = p.printHeight / frameH;
  const region = bandRegion(model, scale);
  const told = [];
  const M = p.moldingWidth * scale;
  const sil = plateOutline(model).map(([x, y]) => [x * scale, y * scale]);
  const opening = (q) => pip(q, sil) && !region.inside(q);
  const H = moldingHeightField(model, scale);
  const Hz = (q) => Math.max(0, H(q));
  const depth = CHAIN_SEAT * M;
  const leaves = p.ornLeaves === 'on';
  let tris = model.spines.reduce((a, sp) => a + solidTriBound(sp.pts.length + 2, model.prof.x.length + 1), 0);
  const frameTris = tris;
  const empty = (why) => ({ scale, length: M, wire: F, style: 'carved', layout: 'flow', mode: 'composed', tip: F, groups: [], curves: [], elements: [], items: [], motifs: [], weight: { h: p.ornHierarchy, runs: [] }, region, H, told: [why], tris: { bound: tris, frame: frameTris, budget: triBudget }, flow: { mode: 'composed', flowsRaw: [], handoffs: [], scrolls: [] } });
  const side = sidePath(model, scale, depth, (run) => p[run.control] === 'on');
  if (!side) return empty('no run of the composition is on');
  const SF = frameOf(side), L = SF.L, yOut = depth;

  // ---- 1. the silhouette: the keypoints on the side, the envelope eased between ----
  const spec = ENVELOPES[kind] || ENVELOPES.oval;
  const nodeS = (n, f) => { const a = side.nodes[Math.min(n, side.nodes.length - 1)].s, b = side.nodes[Math.min(n + 1, side.nodes.length - 1)].s; return a + f * (b - a); };
  const kp = spec.map((k) => ({ ...k, s: Math.min(L, nodeS(k.n, k.f)), corner: k.b === 'high' && k.f === 0 && k.n > 0 && side.nodes[k.n].cls === 'junction' })).filter((k) => k.s <= L + 1e-9);
  const eAt = (s) => {
    if (s <= kp[0].s) return kp[0].e; if (s >= kp[kp.length - 1].s) return kp[kp.length - 1].e;
    let i = 0; while (i < kp.length - 2 && kp[i + 1].s < s) i++;
    return kp[i].e + (kp[i + 1].e - kp[i].e) * smooth((s - kp[i].s) / Math.max(1e-9, kp[i + 1].s - kp[i].s));
  };
  const yEnv = (s) => yOut + eAt(s) * M;
  const envelope = []; for (let s = 0; s <= L; s += 1) envelope.push(SF.W(s, yEnv(s)));

  // ---- 2. the partition: the boundaries, the scrolls between them ----
  // the chain ENDS in a root too (round 2, C2): the last scroll runs from the foot volute back in under the bottom
  // shell (or into the sill), so the feet are planted between two scrolls rather than dangling, and the bottom is
  // a source that emits a C pair as the crest does
  const bnd = kp.filter((k) => k.b !== 'swell').map((k) => (k.b === 'end' ? { ...k, b: 'broot' } : k));
  const crestRoot = bnd[0] && bnd[0].b === 'root';
  const scrolls = [];
  for (let i = 0; i < bnd.length - 1; i++) {
    const a = bnd[i], b = bnd[i + 1], len = b.s - a.s;
    const lowA = a.b === 'low' || a.b === 'root', lowB = b.b === 'low';
    const type = b.b === 'broot' ? 'C' : lowA && lowB ? 'C' : 'S';
    scrolls.push({ i, a, b, len, type, rise: lowA && !lowB, fall: !lowA && lowB });
  }
  const clampR = (len, r, mul = 1) => Math.min(r[2] * M, Math.max(r[1], r[0] * len)) * mul;
  // the volutes at each boundary: the end volute of the scroll before, the
  // start volute of the scroll after (a root has none, a foot has no after)
  for (const sc of scrolls) {
    const kA = sc.a.b === 'root' ? null : sc.a.b === 'foot' ? 'foot' : sc.a.b === 'low' ? 'low' : 'high', kB = sc.b.b === 'broot' ? null : sc.b.b === 'foot' ? 'foot' : sc.b.b === 'low' ? 'low' : 'high';
    sc.rvA = kA ? clampR(sc.len, COMPOSE.rv[kA], sc.a.corner ? COMPOSE.corner : 1) : 0;
    sc.rvB = kB ? clampR(sc.len, COMPOSE.rv[kB], sc.b.corner ? COMPOSE.corner : 1) : 0;
    sc.cap = Math.min(COMPOSE.cap[2] * M, Math.max(COMPOSE.cap[1], COMPOSE.cap[0] * sc.len));
    sc.turnsA = kA ? COMPOSE.turns[kA] + COMPOSE.turnsJitter[(2 * sc.i) % COMPOSE.turnsJitter.length] : 0;
    sc.turnsB = kB ? COMPOSE.turns[kB] + COMPOSE.turnsJitter[(2 * sc.i + 1) % COMPOSE.turnsJitter.length] : 0;
  }

  // ROUND 2, C3: ONE opposed-volute MEETING per side (§2: "a meeting is marked") — the first high pair, where the
  // crest's flow meets the bottom's. Every other boundary is a NODE: the scroll before it ends in a volute (a size
  // larger), and the scroll after it SPRINGS off that volute's front, tangent to its coil (R2's flank stem leaving
  // the lower node along the node's own tangent), with a leaf sheathing the spring — not a second volute
  const meetB = bnd.findIndex((k) => k.b === 'high');
  for (const sc of scrolls) {
    // a CORNER keeps its opposed pair too: on a rectangle the corner is a source and its pair the largest volutes
    // on the side (R4/R5) — a spring off a diagonal corner volute runs straight into the next run's band
    sc.nodeA = sc.a.b !== 'root' && bnd.indexOf(sc.a) !== meetB && !sc.a.corner && sc.i > 0;
    sc.nodeB = sc.b.b !== 'broot' && bnd.indexOf(sc.b) !== meetB && !sc.b.corner;
    if (sc.nodeB) sc.rvB *= COMPOSE.nodeR;
  }
  // the volute centres and joint headings, in the side's (s, y) frame then the world
  const tangentAngle = (s) => headingOf(SF.fr(s).t);
  const bFrame = (s) => {
    const a = SF.fr(Math.max(0, s - 3)), b = SF.fr(Math.min(L, s + 3)), c = SF.fr(s);
    const n = [a.n[0] + b.n[0], a.n[1] + b.n[1]], nl = Math.hypot(n[0], n[1]) || 1, t = [a.t[0] + b.t[0], a.t[1] + b.t[1]], tl = Math.hypot(t[0], t[1]) || 1;
    return { p: c.p, n: [n[0] / nl, n[1] / nl], t: [t[0] / tl, t[1] / tl] };
  };
  const place = (sc, shrinkA = 1, shrinkB = 1, alpha = null) => {
    const rA = sc.rvA * shrinkA, rB = sc.rvB * shrinkB;
    const prev = scrolls[sc.i - 1], next = scrolls[sc.i + 1];
    // a back-to-back pair overlaps by kiss × the thinner cap
    const ovA = prev ? COMPOSE.kiss * Math.min(prev.cap, sc.cap) : 0, ovB = next ? COMPOSE.kiss * Math.min(next.cap, sc.cap) : 0;
    const vol = (bd, r, end, ov) => {
      // a LOW pair embedded in the molding's edge, a HIGH one at the envelope;
      // the pair stands in the boundary's OWN frame (the side's frame averaged
      // either side of it — a corner's bisector), so a corner's two volutes
      // meet on the diagonal rather than along the two runs
      const low = bd.b === 'low', bf = bFrame(bd.s);
      const dx = (end ? -1 : 1) * (r - ov / 2);
      // a low pair sinks with its size: its centres a fraction of the PAIR's larger radius inside the edge, so the
      // coils cross the edge steeply rather than grazing it as they wind in (a fixed sink scaled badly: a 300 mm
      // print's 8 mm volutes left 0.2 mm wedges against the band)
      const pairR = end ? Math.max(sc.rvB, next ? next.rvA : 0) : Math.max(sc.rvA, prev ? prev.rvB : 0);
      const y = low ? yOut - Math.max(COMPOSE.lowSink, COMPOSE.lowSinkK * pairR) : yEnv(bd.s) - r - sc.cap * 0.5;
      return { c: [bf.p[0] + dx * bf.t[0] + y * bf.n[0], bf.p[1] + dx * bf.t[1] + y * bf.n[1]], s: bd.s, y, ang: headingOf(bf.t) };
    };
    const t = sc.type === 'C' ? (alpha ?? 55) * DEG : COMPOSE.sAlpha * DEG, beta = COMPOSE.beta * DEG;
    let A, B;
    const prevKept = sc.nodeA ? kept.find((c) => c.sc.i === sc.i - 1 && !c.fill) : null;
    if (prevKept && prevKept.info.cB) {
      // a NODE: spring off the front of the previous scroll's end volute, along its coil's tangent line there (the
      // front point K = centre + r·t; a low node's coil turns down there, so the spring rises; a high one's turns up,
      // so it falls), leaning COMPOSE.nodeLean onward
      const bf = bFrame(sc.a.s), r0 = prevKept.info.rvB, cB = prevKept.info.cB;
      const K = [cB[0] + r0 * bf.t[0], cB[1] + r0 * bf.t[1]], low = sc.a.b === 'low', ang = headingOf(bf.t);
      A = { root: K, phi: low ? ang + Math.PI / 2 - COMPOSE.nodeLean * DEG : ang - Math.PI / 2 + COMPOSE.nodeLean * DEG, sgn: low ? -1 : 1, rv: 0 };
    } else if (sc.a.b === 'root') {
      // the crest scroll leaves from under the shell, rising out of it
      const x0 = (F + sc.cap) / 2 + 0.1 + 0.4 * M;
      const s0 = Math.max(sc.a.s, x0), root = SF.W(s0, yOut - 0.35 * M);
      A = { root, phi: tangentAngle(s0) + t, sgn: -1, rv: 0 };
    } else {
      const v = vol(sc.a, rA, false, ovA), low = sc.a.b === 'low';
      // low: curl right (toward the frame), leave rising at +t; high: curl left (outward), leave falling at −beta
      A = low ? { c: v.c, rv: rA, sgn: -1, phi: v.ang + t } : { c: v.c, rv: rA, sgn: +1, phi: v.ang - beta };
    }
    if (sc.b.b === 'broot') {
      // the last scroll runs back in under the bottom shell (or into the sill), arriving downward into the band
      const x0 = (F + sc.cap) / 2 + 0.1 + 0.4 * M;
      const s1 = Math.min(sc.b.s, L - x0), root = SF.W(s1, yOut - 0.35 * M);
      B = { root, phi: tangentAngle(s1) - t, sgn: -1, rv: 0 };
    } else {
      const v = vol(sc.b, rB, true, ovB), low = sc.b.b === 'low';
      B = low ? { c: v.c, rv: rB, sgn: -1, phi: v.ang - t } : { c: v.c, rv: rB, sgn: +1, phi: v.ang + beta };
    }
    return { A, B };
  };
  // a C's departure angle bisected so its crown touches the envelope (less a pad)
  // a C's crown matched to the envelope's PEAK over its span (less a pad and half the wire): the arch IS the
  // silhouette there, and a narrow keypoint bump does not cap a broad arch at its shoulders
  const envPeak = (sc) => { let m = -Infinity; for (let s = sc.a.s; s <= sc.b.s; s += 1) m = Math.max(m, yEnv(s)); return m; };
  const crownOver = (c) => Math.max(...c.body.raw.map((q) => SF.local(q)[1])) - (envPeak(c.scSpec) - COMPOSE.pad * M - c.info.wire / 2);
  // the most turns (≤ asked) each volute admits with every coil a feature apart (bisection on one factor)
  const fitTurns = (mk0) => {
    const ok = (f) => selfGap(mk0(f)).gap >= Fm;
    if (ok(1)) return mk0(1);
    let lo = 0.25, hi = 1;
    if (!ok(lo)) return mk0(lo);
    for (let it = 0; it < 10; it++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; }
    return mk0(lo);
  };
  const build = (sc, shrinkA = 1, shrinkB = 1, capF = 1) => {
    const mk = (alpha) => fitTurns((f) => { const { A, B } = place(sc, shrinkA, shrinkB, alpha); const c = buildScroll({ A, B, cap: Math.max(F, capF * sc.cap), lam: COMPOSE.lam, turnsA: f * sc.turnsA, turnsB: f * sc.turnsB }); c.scSpec = sc; return c; });
    if (sc.type !== 'C') return mk(null);
    let lo = COMPOSE.alpha[0], hi = COMPOSE.alpha[1];
    if (crownOver(mk(hi)) <= 0) return mk(hi);
    if (crownOver(mk(lo)) > 0) return mk(lo);
    for (let it = 0; it < 14; it++) { const m = (lo + hi) / 2; if (crownOver(mk(m)) > 0) hi = m; else lo = m; }
    return mk(lo);
  };

  // ---- 3. lay the scrolls, each checked a feature clear of everything laid
  // (its neighbours JOIN it at the hand-off, never graze) ----
  const near = (c) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of c.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return region.near([(x0 + x1) / 2, (y0 + y1) / 2], Math.hypot(x1 - x0, y1 - y0) / 2 + 4 * F); };
  const clearOf = (a, b) => (wireClearBound(a, b) >= Fm ? Infinity : wireClear(a, b));
  const kept = [];
  const why = [];
  let shrunk = 0, dropped = 0;
  // the narrowest slit in plan around a candidate wire: the candidate, every wire laid near it and the band, on a
  // 0.2 mm raster (measurePrint's own neck rule) — a body easing into a low volute at a shallow angle to the
  // molding leaves a wedge a hairline wide that no wire-to-wire distance reads (round 2's C2 sheet: 0.2 mm)
  const planSlitAround = (c, others) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of c.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const box = [x0 - 4, y0 - 4, x1 + 4, y1 + 4], hit = (o) => o.pts.some(([x, y]) => x > box[0] - 6 && x < box[2] + 6 && y > box[1] - 6 && y < box[3] + 6);
    // a wire's width is read as the sweep can lay it: where the centreline turns tighter than its half-width the
    // relief's offset trims the inner side (offsetCurve), so the stroke is drawn no wider than twice that radius
    const effW = (o) => o.pts.map((q, i) => {
      const w = wAtC(o, i), a = o.pts[Math.max(0, i - 2)], b = o.pts[Math.min(o.pts.length - 1, i + 2)];
      const A = Math.hypot(b[0] - q[0], b[1] - q[1]), B = Math.hypot(a[0] - q[0], a[1] - q[1]), C = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const cr = Math.abs((q[0] - a[0]) * (b[1] - a[1]) - (q[1] - a[1]) * (b[0] - a[0]));
      const rho = cr > 1e-12 ? (A * B * C) / (2 * cr) : Infinity;
      return Math.min(w, 2 * rho);
    });
    const strokes = [c, ...others].filter(hit).map((o) => ({ pts: o.pts, w: effW(o) }));
    const res = planSlit2D(strokes, box, { cell: 0.2, solid: (q) => region.inside(q) });
    if (globalThis.__CDBG && res.mm < Fm) console.log('plan slit', res.mm.toFixed(2), res.at.map((v) => v.toFixed(1)).join(','), 'local', SF.local(res.at).map((v) => v.toFixed(1)).join(','));
    return res.mm;
  };
  // ... and a WEDGE against the band has no neck either: a wire easing onto the molding at a shallow angle runs
  // beside its edge closer than a feature for millimetres (a 300 mm print's S met the band at ~20°). The run of the
  // wire's edge less than a feature off the band's edge (and not on it) is held to COMPOSE.wedge
  const bandWedge = (c) => {
    let run = 0, worst = 0;
    for (let i = 0; i < c.pts.length; i++) {
      const g = -region.depth(c.pts[i]) - wAtC(c, i) / 2;
      if (g > 0.05 && g < Fm) { run += i ? Math.hypot(c.pts[i][0] - c.pts[i - 1][0], c.pts[i][1] - c.pts[i - 1][1]) : 0; worst = Math.max(worst, run); } else run = 0;
    }
    return worst;
  };
  const check = (c, sc) => {
    if (selfGap(c).gap < Fm) return `self gap ${selfGap(c).gap.toFixed(2)}`;
    { const oi = c.pts.findIndex((q) => opening(q)); if (oi >= 0) { const [ls, ly] = SF.local(c.pts[oi]); return `over the opening (at u ${c.u[oi].toFixed(1)} of ${c.info.L.toFixed(1)}, body ${c.body.sA.toFixed(1)}–${c.body.sB.toFixed(1)}, local y ${ly.toFixed(1)})`; } }
    if (c.pts.some((q) => q[0] < -1e-9)) return 'over the axis';
    if (slitWorst(c, near(c)) > -Infinity) { if (globalThis.__CDBG) (globalThis.__BAD ||= []).push({ c, kept: kept.slice(), region, why: 'slitband', i: sc.i }); return 'a slit against the band'; }
    if (clearOf(c, mirrorCurve(c)) < Fm && !(sc.a.b === 'root' || sc.b.b === 'broot')) return 'its own mirror';
    if (bandWedge(c) > COMPOSE.bandWedge) return `a ${bandWedge(c).toFixed(1)} mm wedge against the band`;
    { const sl = planSlitAround(c, kept); if (sl < Fm) { if (globalThis.__CDBG) (globalThis.__BAD ||= []).push({ c, kept: kept.slice(), region }); return `a ${sl.toFixed(2)} mm slit in plan`; } }
    for (const o of kept) {
      const adj = o.sc.i === sc.i - 1 || o.sc.i === sc.i + 1;
      if (adj) { if (clearOf(c, o) < Fm && !joinsCleanly(c, o, COMPOSE.handJoin)) { if (globalThis.__CDBG) { for (const [X, Y, nm] of [[c, o, 'c→o'], [o, c, 'o→c']]) { const runs = []; let run = null; X.pts.forEach((q, ii) => { let d = Infinity; for (let k = 0; k < Y.pts.length; k++) d = Math.min(d, Math.hypot(q[0] - Y.pts[k][0], q[1] - Y.pts[k][1]) - (X.w[ii] + Y.w[k]) / 2); if (d < F) { if (!run) run = { a: X.u[ii], min: d }; run.min = Math.min(run.min, d); run.b = X.u[ii]; } else if (run) { runs.push(run); run = null; } }); if (run) runs.push(run); console.log('graze', sc.i, o.sc.i, nm, 'L', X.info.L.toFixed(1), runs.map((r) => `${r.a.toFixed(1)}–${r.b.toFixed(1)}:${r.min.toFixed(2)}`).join(' ')); } } return `grazes scroll ${o.sc.i}`; } continue; }
      if (clearOf(c, o) < Fm) return `${clearOf(c, o).toFixed(2)} mm from scroll ${o.sc.i}`;
      if (clearOf(c, mirrorCurve(o)) < Fm) return `the mirror of scroll ${o.sc.i}`;
    }
    return null;
  };
  // the volutes shrunk first; then the body thinned (a wide sweep easing past a corner volute leaves a wedge)
  const vLadder = [[1, 1], ...COMPOSE.shrink.map((f) => [f, f]), ...COMPOSE.shrink.map((f) => [1, f]), ...COMPOSE.shrink.map((f) => [f, 1])];
  const ladder = [...vLadder.map(([a, b]) => [a, b, 1]), ...COMPOSE.thin.flatMap((t) => [[1, 1, t], [COMPOSE.shrink[0], COMPOSE.shrink[0], t]])];
  const lay = (sc) => { let r = null; for (const [fa, fb, fc] of ladder) { const cand = build(sc, fa, fb, fc); r = check(cand, sc); if (!r) return { c: cand, f: [fa, fb, fc] }; } return { c: null, r }; };
  let eyes = 0;
  for (const sc of scrolls) {
    let got = lay(sc);
    // a neighbour's END volute whose eye curls round toward this scroll's start (a near-slit at the hand-off):
    // that volute is given fewer turns (its scroll re-laid, re-checked) before this one is given up
    const prevC = kept.length && kept[kept.length - 1].sc.i === sc.i - 1 ? kept[kept.length - 1] : null;
    if (!got.c && prevC && /grazes scroll/.test(got.r)) {
      const prev = prevC.sc, t0 = prev.turnsB;
      for (const f of COMPOSE.eyeTrim) {
        prev.turnsB = t0 * f;
        kept.pop();
        const re = build(prev, prevC.f[0], prevC.f[1], prevC.f[2]); const rr = check(re, prev);
        if (rr) { kept.push(prevC); continue; }
        re.sc = prev; re.k = prev.i; re.f = prevC.f; kept.push(re);
        got = lay(sc);
        if (got.c) { eyes++; break; }
        kept.pop(); kept.push(prevC);
      }
      if (!got.c) prev.turnsB = t0;
    }
    if (!got.c) { why.push(`scroll ${sc.i} (${sc.type}, ${sc.a.b}→${sc.b.b}): ${got.r}`); dropped++; continue; }
    if (got.f[0] !== 1 || got.f[1] !== 1 || got.f[2] !== 1) shrunk++;
    const c = got.c; c.sc = sc; c.k = sc.i; c.f = got.f; kept.push(c);
  }
  if (eyes) told.push(`${eyes} end volute${eyes > 1 ? 's' : ''} given fewer turns, so ${eyes > 1 ? 'their eyes stand' : 'its eye stands'} a feature off the next scroll`);
  if (shrunk) told.push(`${shrunk} scroll${shrunk > 1 ? 's' : ''} had their volutes shrunk to stand a feature clear`);
  if (dropped) told.push(`${dropped} scroll${dropped > 1 ? 's' : ''} not built — no room a feature clear (${why.join('; ')})`);

  // ---- 4. the fill: a small C under a tall C, continuing from its start volute ----
  const fills = [];
  for (const c of kept.slice()) {
    const sc = c.sc;
    if (sc.type !== 'C' || sc.a.b === 'root') continue;
    const peak = Math.max(...c.body.raw.map((q) => SF.local(q)[1])) - yOut;
    if (globalThis.__CDBG) console.log('fill?', sc.i, (peak / M).toFixed(2));
    if (peak < COMPOSE.fillAt * M) continue;
    const len = COMPOSE.fillLen * sc.len, s0 = sc.a.s + sc.rvA * 2 - COMPOSE.kiss * sc.cap, s1 = s0 + len;
    const cap = Math.max(F, 0.7 * sc.cap), rA = Math.max(1.6, 0.6 * sc.rvA), rB = Math.max(1.6, 0.11 * len);
    const yLow = yOut - COMPOSE.lowSink;
    const A = { c: SF.W(s0 + rA, yLow), rv: rA, sgn: -1, phi: tangentAngle(s0 + rA) + 62 * DEG };
    const B = { c: SF.W(s1 - rB, yOut - COMPOSE.lowSink), rv: rB, sgn: -1, phi: tangentAngle(s1 - rB) - 40 * DEG };
    const f = buildScroll({ A, B, cap, lam: 0.8, turnsA: 0.9, turnsB: 1.1 });
    f.sc = { ...sc, i: sc.i + 0.5, fill: true, len, cap, a: sc.a, b: sc.b }; f.k = sc.i + 0.5; f.fill = true;
    // it JOINS its primary at the start volute (back to back) and stands a feature clear of everything else
    let ok = selfGap(f).gap >= Fm && !f.pts.some((q) => opening(q)) && slitWorst(f, near(f)) === -Infinity;
    if (ok && !joinsCleanly(f, c) && clearOf(f, c) < Fm) ok = false;
    if (ok) for (const o of kept) { if (o === c) continue; if (clearOf(f, o) < Fm || clearOf(f, mirrorCurve(o)) < Fm) { ok = false; break; } }
    if (globalThis.__CDBG) console.log('fill', sc.i, ok, selfGap(f).gap.toFixed(2), f.pts.some((q) => opening(q)), slitWorst(f, near(f)), joinsCleanly(f, c), clearOf(f, c).toFixed(2));
    if (ok) { fills.push(f); }
  }
  kept.push(...fills);

  // ---- 5. the sources: the crest shell takes the crest C pair, a shell between the feet ----
  const elements = [];
  const frame = edgeFrame(sil, M);
  const joinsMotif = (el, onAxis, mustJoin) => {
    const mates = onAxis ? [el] : [el, mirrorElement(el)];
    for (const c of mustJoin) { const q = wireElementContact(c, el, E); if (!(q.graze === -Infinity && q.clear <= -E)) return false; }
    for (const m of mates) for (const c of kept) { if (mustJoin.includes(c)) continue; for (const cc of [c, mirrorCurve(c)]) { const q = wireElementContact(cc, m, E); if (q.clear < Fm && !(q.graze === -Infinity && q.clear <= -E)) return false; } }
    return elements.every((o) => [o.el, o.mirror].filter(Boolean).every((oe) => mates.every((m) => elementClear(m, oe) >= Fm)));
  };
  const crestRoots = kept.filter((c) => c.sc.a.b === 'root');
  if (crestRoot && crestRoots.length) {
    // the largest crest that takes the roots (C3: 2.3 M where it fits, down to round 2's first 1.7 M)
    let r = null;
    // ... and leaves no slit in plan against the scrolls it takes (a large shell's lower lobes lie along the roots)
    const motifSlit = (el) => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const l of el.loops) for (const [x, y] of l) { x0 = Math.min(x0, x, -x); y0 = Math.min(y0, y); x1 = Math.max(x1, x, -x); y1 = Math.max(y1, y); }
      const box = [x0 - 4, y0 - 4, x1 + 4, y1 + 4], cs = kept.flatMap((c) => [c, mirrorCurve(c)]).filter((c) => c.pts.some(([x, y]) => x > box[0] - 6 && x < box[2] + 6 && y > box[1] - 6 && y < box[3] + 6));
      const sl = planSlit2D(cs.map((c) => ({ pts: c.pts, w: c.w || c.pts.map(() => c.info.wire) })), box, { cell: 0.2, solid: (q) => region.inside(q) || el.loops.some((l) => pip(q, l)) }).mm;
      if (globalThis.__CDBG) console.log('motif slit', sl);
      if (sl < Fm) return sl;
      // a wire crossing the shell's lobe at a shallow angle leaves a wedge (no neck): its run beside the lobe's edge
      for (const c of cs) {
        let run = 0, worst = 0;
        for (let i = 0; i < c.pts.length; i++) {
          const q = c.pts[i]; let g;
          if (el.loops.some((l) => pip(q, l))) g = -1;
          else { g = Infinity; for (const l of el.loops) for (let k = 0; k < l.length; k++) g = Math.min(g, segD(q, l[k], l[(k + 1) % l.length])); g -= wAtC(c, i) / 2; }
          if (g > 0.05 && g < Fm) { run += i ? Math.hypot(q[0] - c.pts[i - 1][0], q[1] - c.pts[i - 1][1]) : 0; worst = Math.max(worst, run); } else run = 0;
        }
        if (globalThis.__CDBG && worst > 0) console.log('motif wedge', c.k, worst.toFixed(2));
        if (worst > COMPOSE.motifWedge) return 0;
      }
      return Infinity;
    };
    // (the last rung, round 2's own 1.7 M shell with the join alone, is what C1/C2 printed with no slit)
    for (const [k, strict] of [[COMPOSE.crestScale, true], [2.0, true], [1.7, true], [1.7, false]]) { r = drapedCrest('shell', { M: k * M, frame, opening, Hz, fits: (el) => joinsMotif(el, true, crestRoots) && (!strict || motifSlit(el) >= Fm), why: 'take the crest scrolls\' roots', slopes: kind === 'arch', sil }); if (r.el) break; }
    told.push(r.note);
    if (r.el) elements.push({ el: r.el, mirror: null, role: 'motif', kind: 'shell', cls: 'heavy', anchor: side.nodes[0].id, w: 1, onAxis: true, crest: !!r.el.crest });
  }
  const last = side.nodes[side.nodes.length - 1];
  if (last.cls === 'bottom') {
    const [, , ii] = at(side.P, L), N = side.out[Math.min(side.out.length - 1, ii)], [, y] = at(side.P, L);
    const feet = kept.filter((c) => c.sc.b.b === 'foot'), broots = kept.filter((c) => c.sc.b.b === 'broot');
    let el = null, f = 1;
    for (let q = 0; q < 14; q++, f *= 0.9) {
      const sz = COMPOSE.bottomScale * M * f, inset = 0.25 * sz;
      const cand = placeMotif('shell', { size: sz, at: [0, y - inset * N[1]], out: N, H, opening, onAxis: true, sunk: false, beyond: null, reach: 0.5 * M });
      if (cand && (joinsMotif(cand, true, broots) || (!broots.length && joinsMotif(cand, true, [])))) { el = cand; break; }
    }
    if (el) elements.push({ el, mirror: null, role: 'motif', kind: 'shell', cls: 'heavy', anchor: last.id, w: 0.8, onAxis: true, crest: false });
    else told.push('the bottom shell is not built — no room between the feet');
    if (!feet.length) told.push('no foot scroll was built');
  }
  const keptEls = elements.flatMap((o) => [o.el, o.mirror].filter(Boolean));

  // ---- 6. the leaves: a flame out of every LOW hand-off's V, one off every HIGH pair's back ----
  const leavesKept = [];
  const leafWhy = (lf, hosts) => {
    if (selfGap(lf).gap < Fm) return 'self'; if (lf.pts.some((q) => opening(q))) return 'opening'; if (lf.pts.some((q) => q[0] < -1e-9)) return 'axis';
    if (slitWorst(lf, near(lf)) > -Infinity) return 'slit';
    if (clearOf(lf, mirrorCurve(lf)) < Fm) return 'mirror';
    for (const o of [...kept, ...leavesKept]) {
      if (hosts.includes(o)) { if (clearOf(lf, o) < Fm && !joinsCleanly(lf, o, LEAF_CROSS)) return `grazes host ${o.k}`; continue; }
      if (clearOf(lf, o) < Fm) return `near ${o.k}`; if (clearOf(lf, mirrorCurve(o)) < Fm) return `near mirror ${o.k}`;
    }
    for (const e of keptEls) { const q = wireElementContact(lf, e, E); if (q.clear < Fm) return 'motif'; }
    return null;
  };
  // a leaf must JOIN a host (it grows out of the hand-off) — one clear of everything floats
  // ... and leaves NO SLIT in plan: a flame lying along a stem or a volute's coil a hairline off it (round 2's C2
  // sheet: 0.2 mm beside a high volute) is read the way the relief's report reads it, on a 0.2 mm raster of the
  // flame, every wire laid near it and the band
  // a WEDGE has no neck to find (its width only grows from the tip), but the relief's lobed edge puts one in it:
  // so the length of either wire running beside the other at less than a feature (and more than touching) is held
  // to the cusp's own CUSP_MM — a flame leaves its stem steeply enough that the V opens past a feature within it
  const sliver = (a, b) => {
    let run = 0, worst = 0;
    for (let i = 0; i < a.pts.length; i++) {
      let d = Infinity;
      for (let k = 0; k < b.pts.length - 1; k++) d = Math.min(d, segD(a.pts[i], b.pts[k], b.pts[k + 1]) - (wAtC(a, i) + Math.max(wAtC(b, k), wAtC(b, k + 1))) / 2);
      if (d > -0.15 && d < Fm) { run += i ? Math.hypot(a.pts[i][0] - a.pts[i - 1][0], a.pts[i][1] - a.pts[i - 1][1]) : 0; worst = Math.max(worst, run); } else run = 0;
    }
    return worst;
  };
  const leafSlit = (lf) => {
    const sl = planSlitAround(lf, [...kept, ...leavesKept]);
    if (sl < Fm) return sl;
    if (bandWedge(lf) > COMPOSE.bandWedge) return 0;
    for (const o of [...kept, ...leavesKept]) if (clearOf(lf, o) < Fm && Math.max(sliver(lf, o), sliver(o, lf)) > COMPOSE.wedge) return 0;
    return Infinity;
  };
  const leafOK = (lf, hosts) => !leafWhy(lf, hosts) && hosts.some((o) => joinsCleanly(lf, o, LEAF_CROSS) && clearOf(lf, o) < Fm) && leafSlit(lf) >= Fm;
  let leafDropped = 0;
  // the MEETING (§1): the first high pair, where the crest's flow ends and the bottom's begins. Its leaf is a fan
  // pointing out; every other leaf is a FLAME that points WITH its flow (down from the crest above the meeting, up
  // from the bottom below it) and leans out off the molding, lying along the stems it sheathes (§6)
  const meet = scrolls.findIndex((x) => x.b.b === 'high');
  if (leaves) {
    for (let i = 0; i < scrolls.length - 1; i++) {
      const a = kept.find((c) => c.sc.i === i && !c.fill), b = kept.find((c) => c.sc.i === i + 1 && !c.fill);
      if (!a || !b) continue;
      const bd = scrolls[i].b, low = bd.b === 'low';
      const len = COMPOSE.leafLen * Math.min(scrolls[i].len, scrolls[i + 1].len) * (low ? 1 : 0.8);
      // rooted between the pair, pointing out (low: out of the V between the arches; high: outward, leaning with the growth)
      const s = bd.s, f0 = SF.fr(s);
      // rooted IN the hand-off: a low one on the molding (embedded — no slit along the band), up through the kiss; a
      // high one in the pair's shared wire; so the leaf grows out of the hand-off and joins both scrolls
      const rK = Math.min(scrolls[i].rvB, scrolls[i + 1].rvA), rootY = low ? yOut - EMBED_MM - 0.3 : yEnv(s) - rK - scrolls[i].cap * 0.5 + COMPOSE.leafRootUp * rK;
      const bf = bFrame(s), root = [bf.p[0] + rootY * bf.n[0], bf.p[1] + rootY * bf.n[1]];
      const dir = i < meet ? 1 : -1, lean = (low ? COMPOSE.flameLean[0] : COMPOSE.flameLean[1]) * DEG;
      const ang = i === meet ? headingOf(bf.n) - 0.6 : headingOf([dir * bf.t[0] * FM.cos(lean) + bf.n[0] * FM.sin(lean), dir * bf.t[1] * FM.cos(lean) + bf.n[1] * FM.sin(lean)]);
      let lf = null;
      // a NODE's leaf SHEATHES the spring: rooted where the spring leaves the node's coil, lying along the spring's
      // own heading (either curl, a little either side), so it wraps the fork rather than jutting out of it (§6)
      if (scrolls[i].nodeB && b.sc.nodeA) {
        const k0 = Math.min(b.pts.length - 1, Math.round(COMPOSE.sheathAt / 0.25));
        for (const at of [0, k0]) for (const da of [0, 0.25, -0.25, 0.5, -0.5]) for (const side of [1, -1]) for (let g = 1; g > 0.45 && !lf; g *= 0.85) {
          const raw = acanthusLeaf(len * g, { aspect: COMPOSE.leafAspect, lobes: COMPOSE.leafLobes }, side);
          const cand = rigid(raw, { at: b.pts[at], angle: b.tan[at] + da }); cand.info = { ...cand.info, role: 'acanthus' };
          if (leafOK(cand, [a, b])) lf = cand;
        }
      }
      // straight out of the V first; then leaning with the growth (onward, +) or back toward the source (−) — a
      // flame that lies across the kiss sheathes it
      for (const da of i === meet ? [0, 0.35, -0.35, 0.7, -0.7] : [0, -0.2 * dir, 0.2 * dir, -0.45 * dir, 0.45 * dir]) for (let g = 1; g > 0.45 && !lf; g *= 0.85) {
        if (scrolls[i].nodeB && b.sc.nodeA && lf === null && g === 1 && da === 0 && globalThis.__CDBG) console.log('node leaf fell back', i);
        const raw = acanthusLeaf(len * g, { aspect: COMPOSE.leafAspect, lobes: COMPOSE.leafLobes }, 1);
        const cand = rigid(raw, { at: root, angle: ang - da }); cand.info = { ...cand.info, role: 'acanthus' };
        if (leafOK(cand, [a, b])) lf = cand;
      }
      if (lf && globalThis.__CDBG) console.log("leaf kept", i, leafSlit(lf).toFixed(2), lf.w ? "w" : "now");
      if (lf) { lf.k = -1; lf.host = a; leavesKept.push(lf); } else { leafDropped++; if (globalThis.__CDBG) { const raw = acanthusLeaf(len * 0.6, { aspect: COMPOSE.leafAspect, lobes: COMPOSE.leafLobes }, 1); const cand = rigid(raw, { at: root, angle: ang }); console.log('leaf', i, bd.b, len.toFixed(1), leafWhy(cand, [a, b])); } }
    }
  }
  if (leafDropped) told.push(`${leafDropped} acanthus lea${leafDropped > 1 ? 'ves' : 'f'} not built — no room a feature clear`);

  // ---- 7. the seat (the relief's emitted reading raises a wire over the molding; a leaf rides its hosts) ----
  const leafPeak = Math.max(...wireProfile('leaf').z);
  for (const c of kept) c.lift = c.pts.map(() => 0);
  for (const lf of leavesKept) {
    const host = lf.host;
    const crown = Math.max(F, wireHeight(host.info.wire, 'half-round') * p.ornProjection);
    let s = 0; const sAt = lf.pts.map((q, i) => (i ? (s += Math.hypot(q[0] - lf.pts[i - 1][0], q[1] - lf.pts[i - 1][1])) : 0));
    const dLeaf = Math.max(F, LEAF_RELIEF * lf.info.wire * p.ornProjection), kLeaf = crownScale(lf, dLeaf);
    const extraAt = (i) => Math.max(0, F + 0.01 - leafPeak * dLeaf * (kLeaf ? kLeaf[i] : 1));
    const ride = Math.max(0, seatOn(H, host, 0)) + 1.6 * crown, ws = host.info.wire;
    lf.lift = lf.pts.map((_, i) => Math.max(Math.max(0, seatOn(H, lf, i)) + extraAt(i), ride * (1 - smooth(sAt[i] / (3.5 * ws)))));
    lf.seatExtra = lf.pts.map((_, i) => extraAt(i));
  }

  // ---- 8. the hand-offs, measured: every back-to-back pair's least gap and the tangent angle there ----
  const handoffs = [];
  const prim = kept.filter((c) => !c.fill).sort((a, b) => a.sc.i - b.sc.i);
  const pairOf = (a, b) => {
    // the closest approach of a's end volute and b's start volute (the volutes only)
    let best = Infinity, ia = 0, ib = 0;
    const aFrom = a.pts.findIndex((_, i) => a.u[i] > a.body.sB), bTo = b.pts.findIndex((_, i) => b.u[i] >= b.body.sA);
    for (let i = Math.max(0, aFrom); i < a.pts.length; i++) for (let j = 0; j <= Math.max(0, bTo); j++) { const d = Math.hypot(a.pts[i][0] - b.pts[j][0], a.pts[i][1] - b.pts[j][1]); if (d < best) { best = d; ia = i; ib = j; } }
    let dt = Math.abs(((a.tan[ia] - b.tan[ib]) % Math.PI + Math.PI) % Math.PI); dt = Math.min(dt, Math.PI - dt);
    return { a: a.sc.i, b: b.sc.i, at: scrolls[a.sc.i].b.b, centreGap: best, overlap: (a.w[ia] + b.w[ib]) / 2 - best, tanDeg: dt / DEG, joins: joinsCleanly(a, b) };
  };
  for (let i = 0; i < prim.length - 1; i++) if (prim[i + 1].sc.i === prim[i].sc.i + 1) handoffs.push(pairOf(prim[i], prim[i + 1]));
  for (const f of fills) { const host = prim.find((c) => c.sc.i === Math.floor(f.k)); if (host) handoffs.push({ ...pairOf({ ...host, body: { sB: host.body.sA - 1e9 } }, f), fill: true }); }

  // ---- 9. the record (the flow model's shape, so withOrnament and the instruments read it unchanged) ----
  const curves = [...kept, ...leavesKept];
  for (const c of curves) if (!c.info.role) c.info.role = 'scroll';
  const priceC = (c) => 2 * solidTriBound(c.pts.length, profileFor(c, p).x.length);
  tris += curves.reduce((a, c) => a + priceC(c), 0) + elements.reduce((a, o) => a + (o.onAxis ? 1 : 2) * o.el.indices.length / 3, 0);
  if (tris > triBudget) told.push(`the composition's relief is past the ${triBudget.toLocaleString('en-US')}-triangle budget (${tris.toLocaleString('en-US')})`);
  const groups = curves.length ? [{ group: 'composed', anchor: side.nodes.map((n) => n.id).join(' → '), onAxis: false, curves, mirrored: curves.map(mirrorCurve), push: depth, told: [] }] : [];
  for (const o of elements) groups.push({ group: o.kind, anchor: o.anchor, onAxis: o.onAxis, curves: [], mirrored: [], elements: [o.el, o.mirror].filter(Boolean), motif: o });
  const els = elements.flatMap((o) => [o.el, o.mirror].filter(Boolean));
  const all = groups.flatMap((g) => [...g.curves, ...g.mirrored]);
  const tip = all.length ? Math.min(...all.map((c) => c.info.tip ?? c.info.wire)) : F;
  // following, measured in the side's own frame (its x-axis IS the frame's tangent): the body's angle off it
  for (const c of kept) {
    const B = c.body.raw.map((q) => SF.local(q)), ang = [];
    for (let i = 1; i < B.length - 1; i++) { const dx = B[i + 1][0] - B[i - 1][0], dy = B[i + 1][1] - B[i - 1][1]; let a = Math.abs(FM.atan2(dy, dx)); if (a > Math.PI / 2) a = Math.PI - a; ang.push(a / DEG); }
    c.flow = { composed: true, bodyAngDeg: ang };
  }
  return { scale, length: M, wire: F, style: 'carved', layout: 'flow', mode: 'composed', tip, groups, curves: all, elements: els, items: [], motifs: elements, weight: { h: p.ornHierarchy, runs: side.runs.map((r) => ({ id: r.run.id, from: r.run.from, to: r.run.to, L: r.length })) }, region, H, told, tris: { bound: tris, frame: frameTris, budget: triBudget },
    flow: { mode: 'composed', side, envelope, keypoints: kp.map((k) => ({ s: k.s, e: k.e, b: k.b, corner: k.corner })), yOut,
      scrolls: scrolls.map((sc) => { const c = kept.find((q) => q.sc.i === sc.i && !q.fill); return { i: sc.i, type: sc.type, from: sc.a.b, to: sc.b.b, len: sc.len, built: !!c, L: c ? c.info.L : null, rvA: c ? c.info.rvA : null, rvB: c ? c.info.rvB : null, turnsA: sc.turnsA, turnsB: sc.turnsB, cap: sc.cap }; }),
      fills: fills.length, handoffs, flowsRaw: [] } };
}
