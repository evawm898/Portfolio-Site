/* frame-flow-measure.mjs — the flow study's measurements (docs/frame-flow-study.md
   §4), importable by the sheet (tools/shot-frame-flow.mjs) and the gate
   (tools/verify-frame-flow.mjs), and runnable alone:
     node tools/frame-flow-measure.mjs [--json]
   prints every default skeleton × {rinceau (main), band, contour}.

   For one ornamented model (withOrnament's output) and its relief:
   - REPETITION: every scroll element on the RIGHT side (the flow's elements;
     the rinceau's volute tendrils) described by its length L, its turns drawn
     (root to end tangent / 2π) and its curvature profile κ·L at 16 stations
     of its own arc length; two elements SHARE a shape when |ΔL|/L̄ < 5 %,
     |Δturns| < 0.08 and the profiles' RMS difference < 0.15 (all three).
     Reported: the pairs that share, and the closest pair by d = the largest
     of the three ratios to their tolerances (d < 1 shares).
   - CONTINUITY: at every hand-off (a flow's child at its fork on the parent;
     a rinceau tendril at its branch on the stem) the tangent jump (degrees)
     and the curvature jump (1/mm), read off the EMITTED centrelines (the
     mapped curves the relief sweeps): the child's first stations against the
     parent's station nearest the child's root.
   - FOLLOWING: the angle between an element's BODY (the stations before its
     volute's ramp; the rinceau's stem) and the frame's own tangent, read in
     the run's local frame (whose x-axis IS the frame's tangent): median and
     90th percentile, degrees.
   - PRINT: boundary edges (the welded float32 bytes), voxel regions, the
     thinnest wire (the least emitted width), measurePrint's narrowest feature
     and gap in plan (cell 0.2 mm), triangles against the 1.5 M budget. */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { coverageOf } from './frame-mass-coverage.mjs';

const TOL = { L: 0.05, T: 0.08, P: 0.15 };
const turnsOf = (c) => Math.abs(c.tan[c.tan.length - 1] - c.tan[0]) / (2 * Math.PI);
const arcOf = (pts) => { const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return s; };
const circK = (a, b, q) => { const A = Math.hypot(b[0] - q[0], b[1] - q[1]), B = Math.hypot(a[0] - q[0], a[1] - q[1]), C = Math.hypot(a[0] - b[0], a[1] - b[1]); const cr = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]); return A * B * C > 1e-12 ? 2 * cr / (A * B * C) : 0; };
// the signed curvature profile κ·L at 16 stations of the curve's own arc length (smoothed over ±2 stations)
function profile(c) {
  const s = arcOf(c.pts), L = s[s.length - 1], out = [];
  for (let k = 0; k < 16; k++) {
    const want = L * (k + 0.5) / 16; let i = s.findIndex((v) => v >= want); i = Math.min(c.pts.length - 3, Math.max(2, i));
    const kk = circK(c.pts[i - 2], c.pts[i], c.pts[i + 2]);
    out.push(kk * L);
  }
  return { L, prof: out };
}
function describe(c) { const { L, prof } = profile(c); return { L, T: turnsOf(c), prof }; }
function pairD(a, b) {
  const dL = Math.abs(a.L - b.L) / ((a.L + b.L) / 2) / TOL.L, dT = Math.abs(a.T - b.T) / TOL.T;
  // a profile and its mirror (a volute curling the other way is the same shape)
  const rms = (s) => Math.sqrt(a.prof.reduce((acc, v, i) => acc + (v - s * b.prof[i]) ** 2, 0) / a.prof.length) / Math.max(1, Math.sqrt(a.prof.reduce((acc, v) => acc + v * v, 0) / a.prof.length));
  const dP = Math.min(rms(1), rms(-1)) / TOL.P;
  return { d: Math.max(dL, dT, dP), dL, dT, dP };
}

export function flowMetrics(m, relief, { RL, FP, print = true } = {}) {
  const o = m.ornament, right = (o.groups[0] ? o.groups[0].curves : []).filter((c) => c.info.role !== 'acanthus' && c.kind !== 'leaf');
  // the scroll elements: the flow's; the rinceau's volute tendrils (not the stems)
  const els = o.layout === 'flow' ? right.filter((c) => c.flow) : right.filter((c) => c.info.role === 'volute');
  const D = els.map(describe);
  let share = 0, closest = null;
  for (let i = 0; i < D.length; i++) for (let j = i + 1; j < D.length; j++) {
    const r = pairD(D[i], D[j]); if (r.d < 1) share++;
    if (!closest || r.d < closest.d) closest = { ...r, a: i, b: j, La: D[i].L, Lb: D[j].L, Ta: D[i].T, Tb: D[j].T };
  }
  // continuity at the hand-offs
  const hand = [];
  const nearest = (pts, q) => { let b = 0, bd = Infinity; pts.forEach((p, i) => { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < bd) { bd = d; b = i; } }); return { i: b, d: bd }; };
  const wrap = (a) => { a %= 2 * Math.PI; if (a > Math.PI) a -= 2 * Math.PI; if (a < -Math.PI) a += 2 * Math.PI; return a; };
  const jump = (child, parent) => {
    const nn = nearest(parent.pts, child.pts[1]), j = Math.min(parent.pts.length - 3, Math.max(2, nn.i));
    const tc = Math.atan2(child.pts[3][1] - child.pts[1][1], child.pts[3][0] - child.pts[1][0]), tp = Math.atan2(parent.pts[j + 1][1] - parent.pts[j - 1][1], parent.pts[j + 1][0] - parent.pts[j - 1][0]);
    const kc = circK(child.pts[1], child.pts[3], child.pts[5]), kp = circK(parent.pts[j - 2], parent.pts[j], parent.pts[j + 2]);
    return { tan: Math.abs(wrap(tc - tp)) * 180 / Math.PI, kap: Math.abs(kc - kp), off: nn.d };
  };
  let composedHand = null;
  const comp = o.mode === 'composed' || o.mode === 'mass';
  if (comp) {
    // a hand-off is two back-to-back volutes with tangent centrelines: the builder's own measurement of each pair
    // (its least centreline gap, how far the two wires overlap there, the tangent angle there, and whether they join)
    const H = o.flow.handoffs.filter((h) => !h.fill);
    composedHand = { n: H.length, joined: H.filter((h) => h.joins).length, maxTanDeg: H.length ? Math.max(...H.map((h) => h.tanDeg)) : NaN, minOverlap: H.length ? Math.min(...H.map((h) => h.overlap)) : NaN };
  } else if (o.layout === 'flow') {
    for (const fl of o.flow.flowsRaw) for (let i = 1; i < fl.curves.length; i++) hand.push(jump(fl.curves[i], fl.curves[i - 1]));
  } else if (o.layout === 'rinceau') {
    const stems = right.filter((c) => c.info.role === 'stem' || c.kind === 'stem');
    for (const t of els) { let best = null; for (const st of stems) { const q = nearest(st.pts, t.pts[0]); if (!best || q.d < best.q.d) best = { st, q }; } if (best) hand.push(jump(t, best.st)); }
  }
  // following: the body's local tangent against the frame's (the local x-axis)
  const ang = [];
  if (comp) {
    for (const c of els) ang.push(...(c.flow.bodyAngDeg || []));
  } else if (o.layout === 'flow') {
    for (const fl of o.flow.flowsRaw) for (const c of fl.curves) { const L = c.local || null; const loc = L || c; const Lb1 = c.info.Lb1; loc.u.forEach((u, i) => { if (u <= Lb1) { let a = Math.abs(wrap(loc.tan[i])); if (a > Math.PI / 2) a = Math.PI - a; ang.push(a * 180 / Math.PI); } }); }
  } else if (o.layout === 'rinceau') {
    for (const st of right.filter((c) => c.localX)) { for (let i = 1; i < st.localX.length - 1; i++) { const dx = st.localX[i + 1] - st.localX[i - 1], dy = st.localY[i + 1] - st.localY[i - 1]; if (dx > 0) ang.push(Math.abs(Math.atan2(dy, dx)) * 180 / Math.PI); } }
  }
  ang.sort((a, b) => a - b);
  const q = (f) => (ang.length ? ang[Math.min(ang.length - 1, Math.floor(f * ang.length))] : NaN);
  const out = {
    layout: o.layout, mode: o.mode || null, elements: els.length,
    repetition: { pairs: D.length * (D.length - 1) / 2, share, closest },
    continuity: composedHand ? { ...composedHand, maxKap: NaN, maxOff: NaN, composed: true } : { n: hand.length, maxTanDeg: hand.length ? Math.max(...hand.map((h) => h.tan)) : NaN, maxKap: hand.length ? Math.max(...hand.map((h) => h.kap)) : NaN, maxOff: hand.length ? Math.max(...hand.map((h) => h.off)) : NaN },
    following: { n: ang.length, median: q(0.5), p90: q(0.9) },
    thinnest: o.curves.length ? Math.min(...o.curves.map((c) => (c.w ? Math.min(...c.w) : c.info.wire))) : null,
    // the scroll BODY's full width (the composed wire's emitted width; the mass's comma), min / median / max
    bodyWidth: o.massStats ? o.massStats.bodyWidth : comp ? (() => { const w = []; for (const c of els) c.u.forEach((u, i) => { if (u >= c.body.sA && u <= c.body.sB) w.push(c.w[i]); }); w.sort((a, b) => a - b); return w.length ? { min: w[0], median: w[w.length >> 1], max: w[w.length - 1] } : null; })() : null,
    told: o.told,
  };
  if (relief && RL) {
    const a = RL.analyzeStl(RL.exportStl(relief)), c = RL.connected(relief);
    out.print = { tris: relief.indices.length / 3, budget: 1500000, boundary: a.boundary, regions: c.comps };
    if (o.flow && o.flow.envelope) { const cv = coverageOf(m, relief, RL, o, FP); out.coverage = { fill: cv.fill, attach: cv.attach, slit: cv.slit ? cv.slit.mm : null, slitAt: cv.slit ? cv.slit.at : null }; }
    if (print && FP) { const mp = FP.measurePrint(relief, { cell: 0.2, slit: true }); out.print.feature = mp.feature.mm; out.print.gap = mp.gap.mm; out.print.slit = mp.slit.mm; out.print.box = mp.box; }
  }
  return out;
}

export const CASES = [['oval', { skeleton: 'oval', ornBottom: 'on' }], ['rect', { skeleton: 'rect', ornBottom: 'on' }], ['arch', {}]];
export const MODES = [['rinceau', {}], ['band', { ornFlow: 'band' }], ['contour', { ornFlow: 'contour' }], ['composed', { ornFlow: 'composed' }], ['mass', { ornFlow: 'mass' }]];

export async function loadTree(root) {
  const imp = (f) => import(pathToFileURL(path.join(root, f)).href);
  return { G: await imp('frame-geometry.js'), FL: await imp('frame-filigree.js'), RL: await imp('frame-relief.js'), FP: await imp('frame-print.js'), MS: await imp('frame-mass.js').catch(() => null) };
}
export function measureCase(T, params, opts = {}) {
  const m = T.FL.withOrnament(T.G.buildFrame({ ...T.G.DEFAULTS, filigree: 'scrolls', ...params }));
  const r = T.RL.buildRelief(m);
  return flowMetrics(m, r, { RL: T.RL, FP: T.FP, ...opts });
}
export const fmt = (x) => (x == null || Number.isNaN(x) ? '—' : typeof x === 'number' ? (Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(2)) : String(x));
export function line(r) {
  const c = r.repetition.closest;
  return `elements ${r.elements} · repetition: ${r.repetition.share} of ${r.repetition.pairs} pairs share a shape${c ? `, closest d ${fmt(c.d)} (L ${fmt(c.La)}/${fmt(c.Lb)} mm, turns ${fmt(c.Ta)}/${fmt(c.Tb)})` : ''}`
    + (r.continuity.composed ? ` · hand-offs ${r.continuity.n} (back-to-back volutes): ${r.continuity.joined} joined, tangent ≤ ${fmt(r.continuity.maxTanDeg)}°, wires overlap ≥ ${fmt(r.continuity.minOverlap)} mm`
      : ` · hand-offs ${r.continuity.n}: tangent ≤ ${fmt(r.continuity.maxTanDeg)}°, curvature ≤ ${fmt(r.continuity.maxKap)}/mm`)
    + ` · following: median ${fmt(r.following.median)}°, p90 ${fmt(r.following.p90)}°`
    + (r.coverage ? ` · COVERAGE: fill ${(100 * r.coverage.fill).toFixed(1)} % of the zone, attached ${(100 * r.coverage.attach).toFixed(1)} % of the edge${r.coverage.slit != null ? `, narrowest pierced neck outside the frame ${fmt(r.coverage.slit)} mm` : ''}` : '')
    + (r.bodyWidth ? ` · body width ${fmt(r.bodyWidth.min)} / ${fmt(r.bodyWidth.median)} / ${fmt(r.bodyWidth.max)} mm` : '')
    + (r.print ? ` · print: boundary ${r.print.boundary}, regions ${r.print.regions}, ${r.thinnest != null ? `thinnest wire ${fmt(r.thinnest)} mm` : 'no wire'}${r.print.feature != null ? `, narrowest feature ${fmt(r.print.feature)} / gap ${fmt(r.print.gap)} mm${r.print.slit != null ? ` / plan slit ${fmt(r.print.slit)} mm` : ''}` : ''}, ${r.print.tris.toLocaleString('en-US')} tris (${(100 * r.print.tris / r.print.budget).toFixed(1)} %)` : '');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const T = await loadTree(path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'));
  const json = process.argv.includes('--json'), all = {};
  for (const [sk, q] of CASES) for (const [md, mq] of MODES) {
    const r = measureCase(T, { ...q, ...mq }, { print: !process.argv.includes('--fast') });
    all[`${sk}/${md}`] = r;
    if (!json) console.log(`${sk.padEnd(5)} ${md.padEnd(8)} ${line(r)}`);
  }
  if (json) console.log(JSON.stringify(all, (k, v) => (k === 'told' ? undefined : v), 1));
}
