/* frame-flow.js — the /frame FLOW MODEL (the flow study, Nov 13; NOT the
   shipped default). A prototype behind a hidden param, `ornFlow`:
   'band' (layout A, the flow inside the band) or 'contour' (layout B, the
   flow forming the frame's outer silhouette beyond the molding). With the
   param absent nothing here runs and every frame builds as on `main`, by
   branch (withOrnament). Read docs/frame-flow-grammar.md (the spec, §8) and
   docs/frame-flow-study.md (what was built and measured) before touching it.

   THE GRAMMAR, as construction:
   - a FLOW PER SIDE: the right half outline (top axis → bottom axis, or the
     sill) is one path, concatenated from the skeleton's runs (CHAIN_RUNS);
     the SOURCES are the axis motifs and (rect, arch) the corners /
     springings, and between two sources the two flows MEET at a declared
     fraction read off the references (FLOW_MEET); a flow that reaches a
     non-source end (an arch's sill, an oval whose bottom is off) runs to it.
   - an ELEMENT is one spine of piecewise-linear curvature: a body of two
     clothoids (κ0 → κm → κ1) tightening into a log-spiral volute (radius
     falling linearly in arc length from rv to the eye), continuous in
     curvature throughout (G2). κm is solved so the body ends at the heading
     that lands it where its volute must sit.
   - the HAND-OFF: element k+1 SPLITS from element k's body — same point,
     same tangent, same curvature (G1 and G2) — at the station where k's
     heading is closest to the frame's tangent, and parts from it gradually
     (the curvatures diverge linearly). So a tail becomes the next start; the
     volutes alternate sides (outward / inward) as the chain runs.
   - VARIATION: an element's length follows the flow's own decay from its
     source, the outline's local radius (long where the frame is flat) and
     the source's weight; its turns, volute share and split vary with its
     place; the chain is fitted (a bisection on one scale) to land its last
     volute at the meeting, so no two flows are the same length.
   - a meeting is two OPPOSED volutes (each curls back toward its own source)
     and a terminal acanthus pointing along the arriving crest flow; every
     fork carries a sheathing acanthus pointing with the growth.
   Every wire reuses the approved carved stroke (frame-filigree's
   carvedWidth), the arris section, the acanthus (frame-rinceau's), the
   crest shell and corner rosettes (frame-vine's drapedCrest, placeMotif) and
   the flowers-in-front stand pass (standMotifs) — nothing in the relief is
   new. Pure functions, no DOM. */

import { MIN_FEATURE_MM } from './frame-registry.js';
import { FRAME_TRI_BUDGET, solidTriBound, plateOutline, EMBED_MM } from './frame-relief.js';
import {
  CHAIN_RUNS, CHAIN_SEAT, runPath, mapToPath, bandRegion, moldingHeightField, seatOn, slitWorst, mirrorCurve,
  wireClear, wireClearBound, joinsCleanly, LEAF_CROSS, carvedWidth, wAt, selfGap, profileFor, rigid, pip, placeMotif,
  wireHeight, wireProfile, LEAF_RELIEF, crownScale,
} from './frame-filigree.js';
import { acanthusLeaf } from './frame-rinceau.js';
import { drapedCrest, edgeFrame, silDistance, anchorClass, ampOf } from './frame-vine.js';
import { mirrorElement, wireElementContact, elementClear } from './frame-elements.js';
import * as FM from './frame-math.js';

const F = MIN_FEATURE_MM;
const MARGIN = 0.1;                       // mm past F: the clearances (the vine's VINE_MARGIN)
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const TAU = 2 * Math.PI;

/* where two flows meet, as a fraction of the segment from its first node
   (read off the references: R2's crest → bottom meeting 28 % down; R4's crest
   scrolls reaching most of the way to the corner; R5's side waist a third
   down) — docs/frame-flow-grammar.md §1 */
export const FLOW_MEET = {
  'oval:crest>bottom': 0.30,
  'rect:crest>junction': 0.62,
  'rect:junction>junction': 0.40,
  'rect:junction>bottom': 0.50,
  'arch:crest>junction': 0.55,
};
/* the element laws, × the band width M; [band, contour] where they differ */
export const FLOW = {
  size: { band: [2.2, 1.0], contour: [3.4, 1.6] },   // the source element's length: base + slope × the source's weight
  cornerTilt: 0.14,     // a corner's weight × (1 + this × its height on the frame, −1 bottom … +1 top)
  decay: 0.42,          // the length falls by this share from the source to the meeting
  maxLen: { band: 5.0, contour: 7.0 },   // × M: no element longer (R2's longest, the flank flame, is 5.8 M of ITS band; ours is the asked band, narrower)
  flatK: 0.3,           // length ∝ (the outline's radius / FLOW.rhoRef)^flatK, clamped
  flatClamp: [0.72, 1.35],
  rhoRef: 4,            // × M
  rvK: { band: [0.12, 0.09], contour: [0.13, 0.1] },   // the volute's start radius, × the element's length, at the source → at the meeting
  turns: [0.95, 1.35],   // the volute's asked turns, source → meeting (held to the coil gap)
  turnsJitter: [0, 0.14, -0.08, 0.1, -0.12, 0.06, -0.04, 0.12, -0.1],
  splitJitter: [0.5, 0.36, 0.62, 0.44, 0.56, 0.4, 0.66, 0.48, 0.38],
  capK: 0.095,          // the carved cap (the body's width), × the element's length
  capOfRv: 0.62,        // …and at most this × the volute's start radius
  minBody: 0.32,        // the body is at least this share of the element
  body: 0.5,           // the gentle body (before the ramp) is at least this share
  forkBack: 0.6,       // × the parent's rv: the fork stands this far before the parent's curl begins
  coilRoom: 1.6,        // × rv: how far a volute's coil stands past its body's end
  leafLen: 0.36, leafAspect: 0.46, leafLobes: 5, leafTilt: 0.22,   // the sheathing acanthus, × the child's length
  termLen: 0.55,        // the meeting's terminal leaf, × the last element's length
  envelope: [0.8, 1.6],   // contour: the outer envelope past the band, × M: base + slope × w(s)
  limitPad: 0.12,       // × M: band mode keeps every wire edge this far inside the band's edges
};

/* ------------------------------------------------------------------ */
/* the element                                                        */
/* ------------------------------------------------------------------ */

const sincH = (x) => (Math.abs(x) < 1e-8 ? 1 - x * x / 6 : FM.sin(x) / x);
/* the volute's arc length for `turns` turns with its radius falling linearly
   from rv to re (frame-filigree's linTurn, inverted) */
const voluteLen = (turns, rv, re) => (turns <= 0 ? 0 : Math.abs(rv - re) < 1e-12 * rv ? TAU * turns * rv : TAU * turns * (rv - re) / FM.log(rv / re));

/* ONE ELEMENT, in a flow's local frame (x along the growth, y outward):
   root, heading phi, root curvature k0 (inherited from the parent: G1, G2),
   length S, volute start radius rv, eye re, turns, sgn (+1 the volute curls
   toward +y, −1 toward −y), body split share, and the body's end heading
   phiEnd. Returns the curve (pts, tan unwrapped, nrm the left normal, kap,
   u, w the carved width under cap). `bodyOnly` stops at the body's end. */
export function flowElement(spec, bodyOnly = false) {
  const { root = [0, 0], phi = 0, k0 = 0, S, rv: rv0, re = F, sgn = 1, split = 0.5, phiEnd = 0, cap = F } = spec;
  let turns = spec.turns, rv = Math.max(rv0, 1.6 * re);
  let Lv = voluteLen(turns, rv, re);
  if (S - Lv < FLOW.minBody * S) { Lv = (1 - FLOW.minBody) * S; turns = Lv * FM.log(rv / re) / (rv - re) / TAU; }
  // the body: a long gentle clothoid (κ0 → κm) and a short ramp (κm → κ1)
  // into the volute, (1.1 + split) rv long — so the curvature climbs to the
  // volute's only where the volute begins (a long ramp piles up heading the
  // solve must cancel with a loop)
  const Lb = S - Lv, Lb2 = Math.min(0.5 * Lb, (1.1 + split) * rv), Lb1 = Lb - Lb2, k1 = sgn / rv;
  const km = (2 * (phiEnd - phi) - Lb1 * k0 - Lb2 * k1) / Lb;
  const kOf = (s) => (s <= Lb1 ? k0 + (km - k0) * s / Lb1 : s <= Lb ? km + (k1 - km) * (s - Lb1) / Lb2 : sgn / (rv + (re - rv) * Math.min(1, (s - Lb) / Lv)));
  const end = bodyOnly ? Lb : S;
  const n = Math.max(24, Math.ceil(end / Math.min(0.25, S / 240)));
  const ds = end / n;
  const pts = [root.slice()], tan = [phi], kap = [kOf(0)], u = [0];
  let x = root[0], y = root[1], f = phi;
  for (let i = 0; i < n; i++) {
    const s = i * ds, k = kOf(s + ds / 2), h = k * ds / 2, c = ds * sincH(h);
    x += c * FM.cos(f + h); y += c * FM.sin(f + h); f += k * ds;
    pts.push([x, y]); tan.push(f); kap.push(kOf(s + ds)); u.push(s + ds);
  }
  const nrm = tan.map((a) => [-FM.sin(a), FM.cos(a)]);
  const w = kap.map((k) => carvedWidth(1 / Math.max(1e-12, Math.abs(k)), cap));
  return { kind: 'flow', pts, tan, nrm, kap, u, w, root: 0, info: { kind: 'flow', role: 'scroll', carved: true, wire: cap, tip: F, L: S, rv, re, turns, split, turnsAsked: spec.turns, sgn, Lb, Lb1, Lv, k0, km, k1, phi, phiEnd } };
}

/* the body's end heading that lands the body's end at height yT (bisection:
   the end height rises with phiEnd), clamped to ±lim */
export function solveEnd(spec, yT, lim = 1.05) {
  const yAt = (pe) => { const c = flowElement({ ...spec, phiEnd: pe }, true); return c.pts[c.pts.length - 1][1]; };
  let lo = -lim, hi = lim;
  if (yAt(lo) >= yT) return lo;
  if (yAt(hi) <= yT) return hi;
  for (let i = 0; i < 32; i++) { const m = (lo + hi) / 2; if (yAt(m) < yT) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/* ------------------------------------------------------------------ */
/* the side path, its nodes, its segments                             */
/* ------------------------------------------------------------------ */

const resample = (poly, step) => {
  const cum = [0]; for (let k = 1; k < poly.length; k++) cum.push(cum[k - 1] + Math.hypot(poly[k][0] - poly[k - 1][0], poly[k][1] - poly[k - 1][1]));
  return { poly, cum, length: cum[cum.length - 1] };
};
const at = (P, s) => {
  const { poly, cum } = P; let k = 0; const q = Math.min(P.length, Math.max(0, s));
  let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= q) lo = m; else hi = m; } k = lo;
  const t = (q - cum[k]) / Math.max(1e-12, cum[k + 1] - cum[k]);
  return [poly[k][0] + t * (poly[k + 1][0] - poly[k][0]), poly[k][1] + t * (poly[k + 1][1] - poly[k][1]), k, t];
};

/* the side's runs concatenated, in order from the top: { P (the line), O (the
   outward normals, same sampling), nodes: [{ id, s, cls }], runs } */
function sidePath(model, scale, depth, enabled) {
  const kind = model.info.kind, pts = [], out = [], nodes = [], runs = [];
  for (const run of CHAIN_RUNS[kind] || []) {
    if (!enabled(run)) { if (pts.length) break; continue; }
    if (!model.info.anchors[run.from] || !model.info.anchors[run.to]) break;
    const rp = runPath(model, run, scale, depth);
    const s0 = pts.length ? resample(pts, 1).length : 0;
    if (!nodes.length) nodes.push({ id: run.from, s: 0, cls: anchorClass(model, run.from) });
    for (let k = pts.length ? 1 : 0; k < rp.pts.length; k++) { pts.push(rp.pts[k]); out.push(rp.out[k]); }
    runs.push({ run, s0, length: rp.length });
    nodes.push({ id: run.to, s: s0 + rp.length, cls: anchorClass(model, run.to) });
  }
  if (!pts.length) return null;
  const P = resample(pts, 1);
  // the node positions re-read off the concatenated line (the joins dropped a point)
  let acc = 0; nodes[0].s = 0; for (let i = 0; i < runs.length; i++) { acc += runs[i].length; nodes[i + 1].s = Math.min(P.length, acc); }
  nodes[nodes.length - 1].s = P.length;
  return { P, out, nodes, runs, kind };
}

/* a sub-path [sa → sb] of the side (sb < sa walks it backwards), resampled
   at 0.5 mm, in runPath's own record (pts, s, tan, out, length) so mapToPath
   lays a flow's local curves on it */
function subPath(side, sa, sb) {
  const L = Math.abs(sb - sa), n = Math.max(3, Math.ceil(L / 0.5) + 1), dir = sb >= sa ? 1 : -1;
  const pts = [], out = [];
  for (let k = 0; k < n; k++) {
    const s = sa + dir * L * k / (n - 1), [x, y, i, t] = at(side.P, s);
    pts.push([x, y]);
    const a = side.out[i], b = side.out[Math.min(side.out.length - 1, i + 1)], o = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])], l = Math.hypot(o[0], o[1]) || 1;
    out.push([o[0] / l, o[1] / l]);
  }
  const tan = pts.map((_, k) => { const a = pts[Math.max(0, k - 1)], b = pts[Math.min(n - 1, k + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; });
  const s = pts.map((_, k) => L * k / (n - 1));
  // the path's own curvature, over a window (for the length's flatness term)
  const ang = [0]; for (let k = 1; k < n; k++) { let d = FM.atan2(tan[k][1], tan[k][0]) - FM.atan2(tan[k - 1][1], tan[k - 1][0]); while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; ang.push(ang[k - 1] + d); }
  return { pts, s, tan, out, length: L, ang };
}
const curvatureAt = (path, x, win) => {
  const n = path.pts.length, ds = path.length / (n - 1), k = Math.min(n - 1, Math.max(0, Math.round(x / ds))), h = Math.max(1, Math.round(win / 2 / ds));
  const a = Math.max(0, k - h), b = Math.min(n - 1, k + h);
  return b > a ? Math.abs(path.ang[b] - path.ang[a]) / ((b - a) * ds) : 0;
};

/* which nodes are SOURCES: the axis motifs, and a corner / springing (a
   junction) on a rectangle or an arch; the oval's side and an arch's sill
   are not (the oval's flank is one flow; the sill is where a flow ends) */
const isSource = (kind, cls) => cls === 'crest' || cls === 'bottom' || (cls === 'junction' && kind !== 'oval');

/* the flows of a side: per segment between consecutive nodes that matter */
export function flowPlan(side) {
  const { nodes, kind } = side;
  const keep = nodes.filter((nd, i) => i === 0 || i === nodes.length - 1 || isSource(kind, nd.cls));
  const segs = [];
  for (let i = 0; i < keep.length - 1; i++) {
    const a = keep[i], b = keep[i + 1], sa = isSource(kind, a.cls), sb = isSource(kind, b.cls);
    if (!sa && !sb) continue;
    const key = `${kind}:${a.cls}>${b.cls}`;
    const frac = sa && sb ? FLOW_MEET[key] ?? 0.5 : sa ? 1 : 0;
    segs.push({ a, b, sa, sb, s0: a.s, s1: b.s, meet: a.s + frac * (b.s - a.s), frac });
  }
  return segs;
}

/* ------------------------------------------------------------------ */
/* laying a flow                                                      */
/* ------------------------------------------------------------------ */

/* the chain of one flow in its own local frame (x from the source along
   the growth, y outward from the path line): n elements at one scale k.
   ctx: { M, D, mode, S0, lim(x) → [ylo, yhi] (the wire-centre's limits),
   flat(x), root0 } */
function layChain(ctx, n, k, shrink = []) {
  const els = [];
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    let root, phi, k0;
    const parent = els[i - 1];
    if (!parent) { root = ctx.root0.pt.slice(); phi = ctx.root0.phi; k0 = 0; }
    else {
      // the fork: where the parent BEGINS TO CURL (the start of its ramp into
      // the volute, less a little) — there the parent's curvature climbs away
      // from the child's, so the two part within a few widths (a fork mid-body
      // parts at third order and the grandchild lies over its grandparent)
      const pi = parent.info, sF = Math.max(0.3 * pi.Lb1, pi.Lb1 - FLOW.forkBack * pi.rv);
      const best = Math.max(1, parent.u.findIndex((s) => s >= sF));
      root = parent.pts[best].slice(); phi = parent.tan[best]; k0 = parent.kap[best]; parent.info.fork = best;
    }
    const sgn = i === 0 ? ctx.firstSgn : -els[i - 1].info.sgn;
    const flat = ctx.flat(root[0]);
    const S = Math.min(FLOW.maxLen[ctx.mode] * ctx.M, k * ctx.S0 * (1 - FLOW.decay * t) * flat) * (shrink[i] ?? 1);
    const rk = FLOW.rvK[ctx.mode], rvK = rk[0] + (rk[1] - rk[0]) * t;
    const turns = Math.max(0.35, FLOW.turns[0] + (FLOW.turns[1] - FLOW.turns[0]) * t + FLOW.turnsJitter[i % FLOW.turnsJitter.length]);
    const split = FLOW.splitJitter[i % FLOW.splitJitter.length];
    // the volute sized to its room (its coil stands ~coilRoom rv past the
    // body's end, inside the limits), and the body's width to the volute: a
    // body wider than ~0.6 rv meets its own coil (the self gap)
    const [rlo, rhi] = ctx.lim(root[0] + 0.5 * S);
    const room = rhi - rlo;
    let rv = Math.max(1.6 * F, Math.min(rvK * S, (room - F) / (FLOW.coilRoom + 1.5 * FLOW.capOfRv))), el = null;
    // …and to the BODY: the gentle body (the part the chain advances by) is
    // at least FLOW.body of the element — the ramp and the volute share the rest
    { const need = (r) => voluteLen(turns, r, F) + (1.1 + split) * r; if (need(rv) > (1 - FLOW.body) * S) { let lo = 1.6 * F, hi = rv; for (let it = 0; it < 30; it++) { const m = (lo + hi) / 2; if (need(m) > (1 - FLOW.body) * S) hi = m; else lo = m; } rv = lo; } }
    const cap = Math.max(F, Math.min(FLOW.capK * S, FLOW.capOfRv * rv));
    for (let tries = 0; tries < 6; tries++) {
      let tt = turns;
      const base = { root, phi, k0, S, rv, re: F, sgn, split, turns: tt, cap };
      const Lv = Math.min((1 - FLOW.minBody) * S, voluteLen(turns, Math.max(rv, 1.6 * F), F)), xe = root[0] + 0.85 * (S - Lv);
      const [ylo, yhi] = ctx.lim(xe);
      const yRaw = sgn > 0 ? yhi - FLOW.coilRoom * rv - cap / 2 : ylo + FLOW.coilRoom * rv + cap / 2;
      const yT = Math.min(yhi - cap / 2 - 0.2, Math.max(ylo + cap / 2 + 0.2, yRaw));
      const pe = solveEnd(base, yT);
      el = flowElement({ ...base, phiEnd: pe });
      // its own coil gap: fewer turns on the same body until it holds
      if (selfGap(el).gap < F + MARGIN) {
        let lo = 0.2, hi = 1;
        const mk = (f) => flowElement({ ...base, turns: f * turns, S: el.info.Lb + voluteLen(f * turns, el.info.rv, F), split, phiEnd: pe });
        for (let it = 0; it < 8; it++) { const m = (lo + hi) / 2; if (selfGap(mk(m)).gap >= F + MARGIN) lo = m; else hi = m; }
        el = mk(lo); el.info.turnsAsked = turns;
      }
      // the whole element inside the limits (its edges), else a smaller volute
      let worst = 0;
      el.pts.forEach(([x, y], j) => { const [a, b] = ctx.lim(x); worst = Math.max(worst, a - (y - el.w[j] / 2), (y + el.w[j] / 2) - b); });
      el.info.over = worst;
      if (worst <= 1e-6) break;
      rv *= 0.85;
    }
    el.info.t = t; el.info.index = i;
    els.push(el);
  }
  return els;
}
const reachOf = (els) => Math.max(...els[els.length - 1].pts.map((q, j) => q[0] + els[els.length - 1].w[j] / 2));

/* the chain fitted to its length: for a few element counts around the
   estimate, the scale k (bisected) that lands the last element's reach at
   D; the count whose k is nearest 1 wins */
function fitChain(ctx) {
  const est = Math.max(1, Math.round(ctx.D / (0.55 * ctx.S0 * (1 - FLOW.decay / 2))));
  // a chain is admissible when every element fits its limits; its reach is
  // NOT monotone in the scale past that (a long element loops), so the scale
  // is searched on a grid first, then bisected inside the first bracket
  const evalAt = (n, k) => { const els = layChain(ctx, n, k); return { els, reach: reachOf(els), over: Math.max(...els.map((e) => e.info.over)) }; };
  let best = null;
  const score = (r) => (r.over > 1e-6 ? 10 + r.over : 0) + Math.abs(Math.log(r.k)) + 2 * Math.abs(r.reach - ctx.D) / ctx.D;
  for (let n = Math.max(1, est - 2); n <= est + 2; n++) {
    let prev = null, hit = null;
    for (let k = 0.45; k <= 2.0 + 1e-9; k *= 1.12) {
      const r = { n, k, ...evalAt(n, k) };
      if (r.over > 1e-6) { if (prev && prev.reach < ctx.D) break; prev = null; continue; }
      if (r.reach >= ctx.D) { hit = prev ? [prev, r] : [r, r]; break; }
      prev = r;
    }
    let cand = null;
    if (hit) {
      let [a, b] = hit;
      for (let it = 0; it < 14 && a !== b; it++) { const k = Math.sqrt(a.k * b.k), r = { n, k, ...evalAt(n, k) }; if (r.over > 1e-6) { b = r; break; } if (r.reach < ctx.D) a = r; else b = r; }
      cand = b.over > 1e-6 ? a : b;
    } else if (prev) cand = prev;   // the largest admissible scale, short of the meeting
    if (cand && (!best || score(cand) < score(best))) best = cand;
  }
  if (!best) best = { n: 1, k: 0.45, ...evalAt(1, 0.45) };
  return { n: best.n, k: best.k, els: best.els, reach: best.reach };
}

/* ------------------------------------------------------------------ */
/* the flow ornament                                                  */
/* ------------------------------------------------------------------ */

export function flowFor(model, { triBudget = FRAME_TRI_BUDGET } = {}) {
  const p = model.params, kind = model.info.kind, E = EMBED_MM, Fm = F + MARGIN;
  const mode = p.ornFlow === 'contour' ? 'contour' : 'band';
  const frameH = model.box.y1 - model.box.y0, scale = p.printHeight / frameH;
  const region = bandRegion(model, scale);
  const told = [];
  const M = p.moldingWidth * scale, h = p.ornHierarchy;
  if (p.bandAsked != null) told.push(`the band is drawn ${M.toFixed(1)} mm wide for the flow (the profile width asks ${(p.bandAsked * scale).toFixed(1)} mm)`);
  const sil = plateOutline(model).map(([x, y]) => [x * scale, y * scale]);
  const opening = (q) => pip(q, sil) && !region.inside(q);
  const beyond = (q) => !pip(q, sil);
  const H = moldingHeightField(model, scale);
  const Hz = (q) => Math.max(0, H(q));
  const depth = CHAIN_SEAT * M;
  const leaves = p.ornLeaves === 'on';
  let tris = model.spines.reduce((a, sp) => a + solidTriBound(sp.pts.length + 2, model.prof.x.length + 1), 0);
  const frameTris = tris;

  const side = sidePath(model, scale, depth, (run) => p[run.control] === 'on');
  if (!side) return { scale, length: M, wire: F, style: 'carved', layout: 'flow', mode, tip: F, groups: [], curves: [], elements: [], items: [], motifs: [], weight: { h, runs: [] }, region, H, told: ['no run of the flow is on'], tris: { bound: tris, frame: frameTris, budget: triBudget }, flow: { flows: [] } };
  const segs = flowPlan(side);
  // the outer envelope (contour): from every node's weight (the oval's side
  // included — R2's widest is its upper flank), falling off over 0.55 of the
  // segment, floored
  const envAt = (s) => {
    let w = 0;
    for (let i = 0; i < side.nodes.length; i++) {
      const nd = side.nodes[i], L = Math.max(1, (side.nodes[Math.min(side.nodes.length - 1, i + 1)].s - side.nodes[Math.max(0, i - 1)].s) / 2);
      w = Math.max(w, ampOf(nd.cls) * (1 - smooth(Math.abs(s - nd.s) / (0.55 * L))));
    }
    return M * (FLOW.envelope[0] + FLOW.envelope[1] * w);
  };
  const yOut = depth, yIn = depth - M, pad = FLOW.limitPad * M;

  // ---- 1. the flows: one chain per source end of every segment ----
  const flows = [];
  for (const sg of segs) {
    for (const end of ['a', 'b']) {
      if (end === 'a' ? !sg.sa : !sg.sb) continue;
      const src = end === 'a' ? sg.a : sg.b;
      const sStart = src.s, sEnd = end === 'a' ? sg.meet : sg.meet;
      const len = Math.abs(sEnd - sStart);
      if (len < 1.2 * M) continue;
      const path = subPath(side, sStart, end === 'a' ? sStart + len : sStart - len);
      const onAxis = src.cls === 'crest' || src.cls === 'bottom';
      // a source's weight: its class's amplitude, and a corner high on the
      // frame heavier than one low on it (R4/R5: the upper corners carry the
      // larger clusters) — so the two corners of a side differ
      const [, ySrc] = at(side.P, src.s), yN = (ySrc - (model.box.y0 + model.box.y1) / 2 * scale) / ((model.box.y1 - model.box.y0) / 2 * scale);
      const w0 = ampOf(src.cls) * (src.cls === 'junction' ? 1 + FLOW.cornerTilt * yN : 1), wh = (1 - h) * 0.5 + h * w0;
      const S0 = M * (FLOW.size[mode][0] + FLOW.size[mode][1] * wh);
      const meetGap = (sg.sa && sg.sb ? Fm / 2 + 0.5 : 0);
      const D = len - meetGap - (sg.sa && sg.sb ? 0 : 0.4 * M);
      // the root: a feature (half) off the axis, or just past a corner
      const cap0 = Math.max(F, FLOW.capK * S0);
      const x0 = onAxis ? (F + cap0) / 2 + 0.1 + 0.4 * M : 0.15 * M;
      const lim = (x) => {
        const s = end === 'a' ? sStart + x : sStart - x;
        return mode === 'band' ? [yIn + pad, yOut - pad] : [yIn + pad, yOut + envAt(s)];
      };
      const flat = (x) => { const kap = curvatureAt(path, Math.min(path.length, Math.max(0, x)), M); const rho = kap > 1e-9 ? 1 / kap : 1e9; return Math.min(FLOW.flatClamp[1], Math.max(FLOW.flatClamp[0], FM.pow(rho / (FLOW.rhoRef * M), FLOW.flatK))); };
      const root0 = { pt: [x0, mode === 'band' ? (yIn + yOut) / 2 : yOut - 0.4 * M], phi: mode === 'band' ? 0 : 0.18 };
      const ctx = { M, D, mode, S0, lim, flat, root0, firstSgn: 1 };
      const fit = fitChain(ctx);
      flows.push({ seg: sg, end, src, path, ctx, fit, onAxis, sStart, dir: end === 'a' ? 1 : -1, local: fit.els });
    }
  }

  // ---- 2. map every element onto its path ----
  // (each element is mapped onto its path as the settle reaches it)

  // ---- 3. settle: each element against everything kept, its volute's
  // turns lowered (its body — and so every child — unmoved) until it is a
  // feature clear; a parent and child JOIN (their fork), never graze ----
  const bandOK = (c) => !c.pts.some((q) => opening(q)) && (mode === 'contour' || c.pts.every((q, i) => silDistance(sil, q) >= wAt(c, i) / 2)) && c.pts.every((q) => q[0] >= -1e-9);
  const near = (c) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of c.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return region.near([(x0 + x1) / 2, (y0 + y1) / 2], Math.hypot(x1 - x0, y1 - y0) / 2 + 4 * F); };
  const clearOf = (a, b) => (wireClearBound(a, b) >= Fm ? Infinity : wireClear(a, b));
  const kept = [];
  let lowered = 0, cut = 0, shrunk = 0;
  const why = [];
  const mapOne = (fl, loc, i) => { const m = mapToPath(loc, fl.path, 0); m.flow = fl; m.k = i; m.localPts = loc.pts; m.local = loc; m.info = { ...loc.info, role: 'scroll' }; return m; };
  for (const fl of flows) {
    const keptHere = [], shrink = [];
    let i = 0, guard = 0;
    while (i < fl.local.length && guard++ < 200) {
      const ok = (c) => {
        if (selfGap(c).gap < Fm) return `self gap ${selfGap(c).gap.toFixed(2)}`;
        if (!bandOK(c)) return 'band / opening / axis';
        if (slitWorst(c, near(c)) > -Infinity) return 'slit against the band';
        if (clearOf(c, mirrorCurve(c)) < Fm && !(fl.onAxis && i === 0)) return 'own mirror';
        for (const o of kept) {
          const same = o.flow === fl, sib = !same && o.flow && o.flow.src === fl.src && i === 0 && o.k === 0;
          if (same && o.k === i - 1) { if (!joinsCleanly(c, o)) return 'grazes its parent'; continue; }
          // the flows that leave ONE source share a root: they JOIN there (an
          // overlap of the embed, never a graze); within a flow an overlap
          // that reaches the embed is a join too (one solid)
          if (same || sib) { if (clearOf(c, o) < Fm && !joinsCleanly(c, o)) return `grazes ${same ? o.k : 'its sibling'}`; if (!(fl.onAxis && sib)) continue; }
          if (!sib && clearOf(c, o) < Fm) return `${o.info.role} ${clearOf(c, o).toFixed(2)}`;
          if (clearOf(c, mirrorCurve(o)) < Fm) return `mirror ${clearOf(c, mirrorCurve(o)).toFixed(2)}`;
        }
        return null;
      };
      let c = mapOne(fl, fl.local[i], i), r = ok(c);
      if (r) {
        // (1) fewer turns on the same body — the children are unmoved
        const L0 = fl.local[i];
        const remake = (tf) => { const loc = flowElement({ root: L0.pts[0], phi: L0.info.phi, k0: L0.info.k0, S: L0.info.Lb + voluteLen(tf * L0.info.turns, L0.info.rv, L0.info.re), rv: L0.info.rv, re: L0.info.re, sgn: L0.info.sgn, split: L0.info.split, turns: tf * L0.info.turns, phiEnd: L0.info.phiEnd, cap: L0.info.wire }); Object.assign(loc.info, { t: L0.info.t, index: i, fork: L0.info.fork, over: L0.info.over }); return mapOne(fl, loc, i); };
        let best = null, lo = 0.2, hi = 1;
        if (!ok(remake(lo))) { best = remake(lo); for (let it = 0; it < 7; it++) { const m = (lo + hi) / 2, cm = remake(m); if (!ok(cm)) { best = cm; lo = m; } else hi = m; } }
        if (best) { c = best; lowered++; }
        else if ((shrink[i] ?? 1) > 0.55) {
          // (2) the element made smaller and the chain re-laid from it (every
          // element before it is the same, so nothing kept moves)
          shrink[i] = (shrink[i] ?? 1) * 0.85; shrunk++;
          const els = layChain(fl.ctx, fl.fit.n, fl.fit.k, shrink);
          for (let j = 0; j < i; j++) els[j] = fl.local[j];
          fl.local = els;
          continue;
        } else { why.push(`${fl.src.id} #${i}: ${r}`); cut++; break; }
      }
      keptHere.push(c); kept.push(c); i++;
    }
    fl.curves = keptHere;
  }
  if (shrunk) told.push(`${shrunk} element${shrunk > 1 ? 's' : ''} made smaller (the chain re-laid from it) to keep a feature clear`);
  if (lowered) told.push(`${lowered} volute${lowered > 1 ? 's' : ''} given fewer turns to keep a feature clear`);
  if (cut) told.push(`${cut} flow${cut > 1 ? 's' : ''} end${cut > 1 ? '' : 's'} early — the next element has no room a feature clear (${why.join('; ')})`);

  // ---- 4. the motifs: the crest shell over the crest flows' roots, a
  // rosette at a corner / springing, a shell at the bottom ----
  const elements = [];
  const frame = edgeFrame(sil, M);
  const capped = [];
  const joinsMotif = (el, onAxis, mustJoin) => {
    const mates = onAxis ? [el] : [el, mirrorElement(el)];
    for (const c of mustJoin) { const q = wireElementContact(c, el, E); if (!(q.graze === -Infinity && q.clear <= -E)) return false; }
    for (const m of mates) for (const c of kept) { if (mustJoin.includes(c)) { const q = wireElementContact(c, m, E); if (q.graze !== -Infinity) return false; continue; } for (const cc of [c, mirrorCurve(c)]) { const q = wireElementContact(cc, m, E); if (q.clear < Fm && !(q.graze === -Infinity && q.clear <= -E && mustJoin.some((j) => j.flow === c.flow))) return false; } }
    return elements.every((o) => [o.el, o.mirror].filter(Boolean).every((oe) => mates.every((m) => elementClear(m, oe) >= Fm)));
  };
  for (const nd of side.nodes) {
    if (!isSource(kind, nd.cls)) continue;
    const roots = flows.filter((fl) => fl.src === nd && fl.curves.length).map((fl) => fl.curves[0]);
    if (!roots.length) continue;
    const onAxis = nd.cls === 'crest' || nd.cls === 'bottom';
    if (!onAxis && p.ornCorners !== 'on') continue;
    if (nd.cls === 'crest') {
      const r = drapedCrest('shell', { M, frame, opening, Hz, fits: (c) => joinsMotif(c, true, roots), why: 'take the flows\' roots', slopes: kind === 'arch', sil });
      told.push(r.note);
      if (r.el) elements.push({ el: r.el, mirror: null, role: 'motif', kind: 'shell', cls: 'heavy', anchor: nd.id, w: 1, onAxis: true, crest: !!r.el.crest });
      continue;
    }
    const mk = onAxis ? 'shell' : 'rosette';
    const [x, y] = at(side.P, nd.s), [, , ii] = at(side.P, nd.s), N = side.out[Math.min(side.out.length - 1, ii)];
    const P = onAxis ? [0, y] : [x, y], w = ampOf(nd.cls);
    const size = mk === 'shell' ? (1.4 + 1.0 * w) * M : (1.0 + 0.6 * w) * M;
    let el = null, f = 1;
    for (let q = 0; q < 16; q++, f *= 0.9) {
      const sz = size * f, inset = mk === 'shell' ? 0.25 * sz : 0;
      const c = placeMotif(mk, { size: sz, at: [P[0] - inset * N[0], P[1] - inset * N[1]], out: N, H, opening, onAxis, sunk: mk === 'rosette', beyond: mode === 'band' ? beyond : null, reach: 0.5 * M });
      if (c && joinsMotif(c, onAxis, roots)) { el = c; break; }
    }
    if (!el) { told.push(`the ${mk} at ${nd.id} is not built — it cannot take the flows' roots`); continue; }
    if (f < 1) capped.push(`${mk} at ${nd.id} ${(100 * f).toFixed(0)}%`);
    elements.push({ el, mirror: onAxis ? null : mirrorElement(el), role: 'motif', kind: mk, cls: 'heavy', anchor: nd.id, w, onAxis, crest: false });
  }
  if (capped.length) told.push(`made smaller to fit: ${capped.join(', ')}`);
  const keptEls = elements.flatMap((o) => [o.el, o.mirror].filter(Boolean));

  // ---- 5. the acanthus: a sheath at every fork (pointing with the growth),
  // the meeting's terminal leaf on the arriving crest flow ----
  const leavesKept = [];
  const leafOK = (lf, host, child) => {
    if (selfGap(lf).gap < Fm) return false;
    if (!bandOK(lf) || slitWorst(lf, near(lf)) > -Infinity) return false;
    if (clearOf(lf, mirrorCurve(lf)) < Fm) return false;
    for (const o of [...kept, ...leavesKept]) {
      if (o === host || o === child) { if (!joinsCleanly(lf, o, LEAF_CROSS)) return false; continue; }
      if (clearOf(lf, o) < Fm || clearOf(lf, mirrorCurve(o)) < Fm) return false;
    }
    for (const e of keptEls) { const q = wireElementContact(lf, e, E); if (q.clear < Fm) return false; }
    return true;
  };
  const layLeaf = (fl, rootLocal, phi, len, side, host, child) => {
    for (let f = 1; f > 0.5; f *= 0.85) {
      const raw = acanthusLeaf(len * f, { aspect: FLOW.leafAspect, lobes: FLOW.leafLobes }, side);
      const loc = side > 0 ? rigid(raw, { at: rootLocal, angle: phi }) : rigid(raw, { at: rootLocal, angle: phi });
      const m = mapToPath(loc, fl.path, 0); m.info = { ...m.info, role: 'acanthus' }; m.flow = fl;
      if (leafOK(m, host, child)) return m;
    }
    return null;
  };
  let leafDropped = 0;
  if (leaves) {
    for (const fl of flows) {
      for (let i = 1; i < fl.curves.length; i++) {
        const parent = fl.curves[i - 1], child = fl.curves[i], ci = child.info;
        const root = fl.local[i - 1].pts[ci.fork ?? fl.local[i - 1].info.fork];
        const rootL = root || child.localPts[0];
        const phi = ci.phi + ci.sgn * FLOW.leafTilt;
        const lf = layLeaf(fl, rootL, phi, FLOW.leafLen * ci.L, ci.sgn > 0 ? -1 : 1, parent, child);
        if (lf) { lf.k = i; leavesKept.push(lf); } else leafDropped++;
      }
      // the terminal leaf at the meeting (the crest flow arrives; it ends the flow)
      const last = fl.curves[fl.curves.length - 1];
      if (last && fl.seg.sa && fl.seg.sb && (fl.src.cls === 'crest' || fl.end === 'a')) {
        const li = fl.local[fl.curves.length - 1], j = li.u.findIndex((s) => s > li.info.Lb);
        const rootL = li.pts[Math.max(0, j - 2)];
        const lf = layLeaf(fl, rootL, li.tan[Math.max(0, j - 2)] - li.info.sgn * 0.5, FLOW.termLen * li.info.L, li.info.sgn > 0 ? -1 : 1, last, null);
        if (lf) { lf.k = -1; lf.terminal = true; leavesKept.push(lf); } else leafDropped++;
      }
    }
  }
  if (leafDropped) told.push(`${leafDropped} acanthus lea${leafDropped > 1 ? 'ves' : 'f'} not built — no room a feature clear`);

  // ---- 6. the seat: scrolls on the molding (the emitted reading raises
  // them, as the rinceau's stems); a leaf rides its host's crown ----
  const leafPeak = Math.max(...wireProfile('leaf').z);
  for (const c of kept) c.lift = c.pts.map(() => 0);
  for (const lf of leavesKept) {
    const host = kept.find((c) => c.flow === lf.flow && c.k === (lf.k > 0 ? lf.k - 1 : lf.flow.curves.length - 1)) || kept[0];
    const crown = Math.max(F, wireHeight(host.info.wire, 'half-round') * p.ornProjection);
    let s = 0; const sAt = lf.pts.map((q, i) => (i ? (s += Math.hypot(q[0] - lf.pts[i - 1][0], q[1] - lf.pts[i - 1][1])) : 0));
    const dLeaf = Math.max(F, LEAF_RELIEF * lf.info.wire * p.ornProjection), kLeaf = crownScale(lf, dLeaf);
    const extraAt = (i) => Math.max(0, F + 0.01 - leafPeak * dLeaf * (kLeaf ? kLeaf[i] : 1));
    const ride = Math.max(0, seatOn(H, host, 0)) + 1.6 * crown, ws = host.info.wire;
    lf.lift = lf.pts.map((_, i) => Math.max(Math.max(0, seatOn(H, lf, i)) + extraAt(i), ride * (1 - smooth(sAt[i] / (3.5 * ws)))));
    lf.seatExtra = lf.pts.map((_, i) => extraAt(i));
  }

  // ---- 7. the record ----
  const curves = [...kept, ...leavesKept];
  const priceC = (c) => 2 * solidTriBound(c.pts.length, profileFor(c, p).x.length);
  tris += curves.reduce((a, c) => a + priceC(c), 0) + elements.reduce((a, o) => a + (o.onAxis ? 1 : 2) * o.el.indices.length / 3, 0);
  if (tris > triBudget) told.push(`the flow's relief is past the ${triBudget.toLocaleString('en-US')}-triangle budget (${tris.toLocaleString('en-US')})`);
  const groups = curves.length ? [{ group: 'flow', anchor: segs.map((s) => `${s.a.id}→${s.b.id}`).join(', '), onAxis: false, curves, mirrored: curves.map(mirrorCurve), push: depth, told: [] }] : [];
  for (const o of elements) groups.push({ group: o.kind, anchor: o.anchor, onAxis: o.onAxis, curves: [], mirrored: [], elements: [o.el, o.mirror].filter(Boolean), motif: o });
  const els = elements.flatMap((o) => [o.el, o.mirror].filter(Boolean));
  const all = groups.flatMap((g) => [...g.curves, ...g.mirrored]);
  const tip = all.length ? Math.min(...all.map((c) => c.info.tip ?? c.info.wire)) : F;
  const flowRec = flows.map((fl) => ({ from: fl.src.id, cls: fl.src.cls, dir: fl.dir, D: fl.ctx.D, n: fl.fit.n, k: fl.fit.k, kept: fl.curves.length,
    elements: fl.curves.map((c) => ({ L: c.info.L, turns: c.info.turns, rv: c.info.rv, sgn: c.info.sgn, Lb: c.info.Lb, k0: c.info.k0, km: c.info.km, k1: c.info.k1, fork: c.info.fork })) }));
  return { scale, length: M, wire: F, style: 'carved', layout: 'flow', mode, tip, groups, curves: all, elements: els, items: [], motifs: elements, weight: { h, runs: side.runs.map((r) => ({ id: r.run.id, from: r.run.from, to: r.run.to, L: r.length })) }, region, H, told, tris: { bound: tris, frame: frameTris, budget: triBudget },
    flow: { mode, segs: segs.map((s) => ({ a: s.a.id, b: s.b.id, meet: s.meet, frac: s.frac })), flows: flowRec, side, flowsRaw: flows } };
}
