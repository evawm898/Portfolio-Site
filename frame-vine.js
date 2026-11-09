/* frame-vine.js — the /frame VINE (phase 3e, step 3): the placed elements
   wired into the chains as ONE CONTINUOUS STEM per run, with a SCALE
   HIERARCHY read off a weight field around the frame. Pure functions, no
   DOM, Node-importable. Read docs/frame-charter.md §17 before touching it.

   THE WEIGHT FIELD w(s). One weight per point of every run, derived from
   the skeleton's own named anchors, never placed per frame:
     - each anchor a run begins or ends at carries an AMPLITUDE by its class —
       the CREST (an anchor on the axis in the upper half) 1.0; a JUNCTION
       (an anchor two runs of the skeleton share: a springing, a corner, an
       oval's side) 0.75; the BOTTOM (on the axis in the lower half) 0.7; a
       TERMINAL (an anchor only one run reaches: an arch's sill end) 0.3;
     - along a run of length L the weight is the larger of the two ends'
       amplitudes, each falling off as 1 − smoothstep(d / (HIER.reach · L))
       with the distance d from its anchor, floored at HIER.floor — so it is
       highest at the crest, secondary at the corners / springings / sides /
       bottom and lowest mid-run;
     - the HIERARCHY STRENGTH h (ornHierarchy) blends it toward a uniform
       0.5: w_h = (1 − h) · 0.5 + h · w. h = 0 is not this module at all: the
       chains of phase 3d run instead, by branch (withOrnament).
   The CLASS of everything placed is read off w_h: heavy (shell, palmette,
   rose) only as the junction motifs at the peaks; medium (a sunk rosette, a
   scroll-and-leaf cluster) approaching them; light (a bud, a leaf, a sprig,
   or the bare stem) mid-run. Scale, the stem's meander amplitude and
   wavelength, and the density all follow w_h; everything along a run
   compresses where the band's path curves (c(x) = 1 / (1 + CURVE_K · M · |κ|),
   M the molding width, κ the path's own curvature over one molding width).

   THE VINE. One stem per run, laid in the run's path frame (runPath, the
   chains' own: offsetCurve inside the band's outer edge), meandering across
   the band about its centre line, y = y_c + A(x) sin θ(x), θ' = π / P(x):
   an extremum every half wavelength P. The stem is SEATED by the chains'
   law (the molding's own height field, read at the emitted columns). Its
   ends: on the axis it stops a feature short of its own mirror (the axis
   motif covers both ends); at a junction it runs on past the anchor along
   its own tangent until it crosses the next run's stem (one group per side,
   so the two stems JOIN — an overlap, never a graze). Items spring from
   the stem at its extrema, each into the bay the stem bends around, grown
   forward (away from the crest): every item's root lies on the stem (a
   JOINT, ≥ EMBED_MM of overlap), and every item is a feature clear of every
   other, of the band's opening and of every other side's wire — an item
   that is not is shrunk 15 % up to five times, then not built (told, as a
   count). A sunk rosette at a zero crossing of the meander sits ON the stem.
   Junction motifs are placed by placeMotif (frame-filigree), the law the
   chains' motifs use: the same primitive. */

import { MIN_FEATURE_MM } from './frame-registry.js';
import { FRAME_TRI_BUDGET, solidTriBound, plateOutline, EMBED_MM } from './frame-relief.js';
import {
  CHAIN_RUNS, CHAIN_SEAT, runPath, mapToPath, bandRegion, moldingHeightField, seatOn, slitWorst, mirrorCurve,
  wireClear, wireClearBound, joinsCleanly, buildScroll, buildLeaf, carvedCap, LEAF_ASPECT, wAt, selfGap, profileFor, rigid, pip, placeMotif, wireHeight, wireProfile, LEAF_RELIEF,
} from './frame-filigree.js';
import { placeElement, relift, mirrorElement, wireElementContact, elementClear, elementDepth } from './frame-elements.js';

/* the field's constants (one each, every one a measured choice in §17) */
export const HIER = {
  crest: 1.0, junction: 0.75, bottom: 0.7, terminal: 0.3,   // anchor amplitudes by class
  floor: 0.15,                                               // the least weight mid-run
  reach: 0.55,                                               // a peak's falloff, × its run's length
  uniform: 0.5,                                              // what h → 0 blends toward
  heavy: 0.68, medium: 0.4,                                  // the class thresholds on w_h
};
export const CURVE_K = 1.2;
/* the stem and the items, × the molding width M, each [base, slope in w_h] */
export const STEM_W = [0.15, 0.08];     // the stem's width
export const STEM_A = [0.12, 0.2];      // its meander's amplitude
export const STEM_P = [1.1, 0.9];       // its half wavelength (an item every half wave)
export const ITEM = { tendril: [0.7, 0.45], leaf: [0.62, 0.4], sprig: 0.45, bud: [0.6, 0.3], rosette: 0.85 };            // the curvature compression: c = 1 / (1 + CURVE_K · M · |κ|)
export const VINE_MARGIN = 0.1;
export const AXIS_GAP = 0.1;          // mm past the half feature: where a stem stops short of its mirror
export const VINE_LEAF_CURL = 1.2;   // rad: a vine leaf's turn (the chains' 2.2 curls a short leaf back onto its stem)
export let TFLIP = false; export const setFlip = (v) => { TFLIP = v; };
export let DEBUG = null; export const setDebug = (d) => { DEBUG = d; };        // mm: the build's clearances stand this far past F
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/* the CLASS of an anchor, from the skeleton alone: on the axis (the upper
   half the crest, the lower the bottom), a junction where two of the
   skeleton's runs meet, else a terminal */
export function anchorClass(model, id) {
  const a = model.info.anchors[id];
  if (Math.abs(a.pt[0]) < 1e-9) return a.pt[1] > (model.box.y0 + model.box.y1) / 2 ? 'crest' : 'bottom';
  const touching = (CHAIN_RUNS[model.info.kind] || []).filter((r) => r.from === id || r.to === id).length;
  return touching >= 2 ? 'junction' : 'terminal';
}
export const ampOf = (cls) => HIER[cls];
/* the weight at distance x along a run of length L between amplitudes Aa
   (at x = 0) and Ab (at x = L), before the hierarchy strength */
export function weightAt(x, L, Aa, Ab) {
  const r = HIER.reach * L, f = (d) => 1 - smooth(Math.max(0, d) / r);
  return Math.max(HIER.floor, Aa * f(x), Ab * f(L - x));
}
export const withStrength = (w, h) => (1 - h) * HIER.uniform + h * w;
export const classOf = (w) => (w >= HIER.heavy ? 'heavy' : w >= HIER.medium ? 'medium' : 'light');

/* THE WEIGHT PROFILE of a skeleton for the sheet's plot: s from the crest
   along the right half through every run the skeleton has (built or not),
   with w(s) and w_h(s). */
export function weightProfile(model, h = 1, step = 1) {
  const p = model.params, scale = p.printHeight / (model.box.y1 - model.box.y0);
  const depth = CHAIN_SEAT * p.moldingWidth * scale;
  const out = { runs: [], samples: [] };
  let s0 = 0;
  for (const run of CHAIN_RUNS[model.info.kind] || []) {
    if (!model.info.anchors[run.from] || !model.info.anchors[run.to]) continue;
    const path = runPath(model, run, scale, depth), L = path.length;
    const Aa = ampOf(anchorClass(model, run.from)), Ab = ampOf(anchorClass(model, run.to));
    out.runs.push({ id: run.id, from: run.from, to: run.to, s0, L, Aa, Ab, classFrom: anchorClass(model, run.from), classTo: anchorClass(model, run.to) });
    for (let x = 0; x <= L + 1e-9; x += step) { const w = weightAt(x, L, Aa, Ab); out.samples.push({ run: run.id, s: s0 + x, w, wh: withStrength(w, h) }); }
    s0 += L;
  }
  out.total = s0;
  return out;
}

/* the path's curvature, smoothed over a window (mm), per station */
function pathCurvature(path, win) {
  const n = path.pts.length, ds = path.length / Math.max(1, n - 1), ang = [0];
  for (let k = 1; k < n; k++) { let d = Math.atan2(path.tan[k][1], path.tan[k][0]) - Math.atan2(path.tan[k - 1][1], path.tan[k - 1][0]); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; ang.push(ang[k - 1] + d); }
  const half = Math.max(1, Math.round(win / 2 / ds));
  return path.pts.map((_, k) => { const a = Math.max(0, k - half), b = Math.min(n - 1, k + half); return b > a ? (ang[b] - ang[a]) / ((b - a) * ds) : 0; });
}
const at1 = (arr, path, x) => { const n = arr.length, q = Math.min(path.length, Math.max(0, x)), k = Math.min(n - 1, Math.round(q / path.length * (n - 1))); return arr[k]; };

/* a TENDRIL: the second half of a carved C (from its root to its eye) — a
   long flat body curling into one volute; its root at the origin, its
   tangent +x, curling toward +y */
export function tendril(len, tightness) {
  const c = buildScroll({ kind: 'C', length: 2 * len, tightness, wire: carvedCap(2 * len), balance: 1, carved: true });
  const r = c.root, sl = (a) => (Array.isArray(a) ? a.slice(r) : a);
  const out = { ...c, kind: 'tendril', pts: sl(c.pts), nrm: sl(c.nrm), tan: sl(c.tan), u: sl(c.u), kap: sl(c.kap), w: sl(c.w), root: 0 };
  out.info = { ...c.info, role: 'tendril', L: len };
  return out;
}
/* lay a local curve (root at its origin, growing along +x) at `root` in a
   run's local frame, heading `phi`, curling right of its march when
   `flip`; then mapped onto the path */
function lay(c, root, phi, flip, path) {
  const local = flip ? rigid(c, { at: root, angle: phi + Math.PI, mirrorX: true }) : rigid(c, { at: root, angle: phi });
  const on = mapToPath(local, path, 0);
  on.localY = local.pts.map((q) => q[1]);
  on.localX = local.pts.map((q) => q[0]);
  return on;
}

/* THE VINE: the same record chainsFor returns, plus the weight field and the
   items placed (what the gate restates). */
export function vineFor(model, { triBudget = FRAME_TRI_BUDGET, weightOverride = null } = {}) {
  const p = model.params, kind = model.info.kind, F = MIN_FEATURE_MM, Fm = F + VINE_MARGIN, E = EMBED_MM;
  const frameH = model.box.y1 - model.box.y0, scale = p.printHeight / frameH;
  const region = bandRegion(model, scale);
  const told = [];
  const M = p.moldingWidth * scale, h = p.ornHierarchy;
  const sil = plateOutline(model).map(([x, y]) => [x * scale, y * scale]);
  const opening = (q) => pip(q, sil) && !region.inside(q);
  const H = moldingHeightField(model, scale);
  const Hz = (q) => Math.max(0, H(q));
  const depth = CHAIN_SEAT * M;
  const dens = 0.6 + 0.2 * p.ornDensity;
  const leafK = p.ornLeafSize / 0.42;
  const leaves = p.ornLeaves === 'on';
  // the band in a run's local frame: the path lies `depth` inside the outer
  // edge, so the band spans y ∈ [depth − M, depth]; its centre line y_c
  const yc = depth - M / 2;
  let tris = model.spines.reduce((a, sp) => a + solidTriBound(sp.pts.length + 2, model.prof.x.length + 1), 0);
  const frameTris = tris;
  const W = weightOverride || ((x, L, Aa, Ab) => withStrength(weightAt(x, L, Aa, Ab), h));

  // ---- 1. the runs, their paths, their stems ----
  const runs = [];
  for (const run of CHAIN_RUNS[kind] || []) {
    if (p[run.control] !== 'on') continue;
    if (!model.info.anchors[run.from] || !model.info.anchors[run.to]) { told.push(`no ${!model.info.anchors[run.from] ? run.from : run.to} on this frame — its ${run.id} run is not built`); continue; }
    const path = runPath(model, run, scale, depth), L = path.length;
    const cFrom = anchorClass(model, run.from), cTo = anchorClass(model, run.to);
    const Aa = ampOf(cFrom), Ab = ampOf(cTo);
    const kap = pathCurvature(path, M);
    const comp = kap.map((k) => 1 / (1 + CURVE_K * M * Math.abs(k)));
    const wOf = (x) => W(x, L, Aa, Ab);
    const cOf = (x) => at1(comp, path, x);
    const axisA = cFrom === 'crest' || cFrom === 'bottom', axisB = cTo === 'crest' || cTo === 'bottom';
    // the stem's width, amplitude and half wavelength follow w_h
    const wsOf = (x) => Math.max(F, (STEM_W[0] + STEM_W[1] * wOf(x)) * M);
    let ak = 1;      // the meander's share: lowered where the run's own turns fold it (below)
    const ampOfX = (x) => ak * Math.max(0.5, Math.min((STEM_A[0] + STEM_A[1] * wOf(x)) * M, M / 2 - wsOf(x) / 2 - 0.6 * F));
    const P0 = (x) => M * (STEM_P[0] + STEM_P[1] * wOf(x)) * cOf(x) / dens;
    // the stem's x range: a feature short of the axis (its mirror) at an
    // axis end; run on past an interior end
    const ws0 = wsOf(0), wsL = wsOf(L);
    // on the axis the stem stops where its MAPPED end stands AXIS_GAP off
    // x = 0 (the path's arc length is not the distance to the axis where the
    // band turns — the arch's apex is a mitre), found by bisection
    const mappedX = (x, end) => Math.abs(mapToPath({ pts: [[x, yc + ampOfX(end ? L : 0)]], nrm: [[0, 1]], tan: [0], info: {} }, path, 0).pts[0][0]);
    const axisStop = (end) => { const want = (F + (end ? wsL : ws0)) / 2 + AXIS_GAP; let lo = 0, hi = Math.min(L / 2, 6 * want); for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2, xx = end ? L - m : m; if (mappedX(xx, end) < want) lo = m; else hi = m; } return hi; };
    const x0 = axisA ? axisStop(false) : -(E + ws0 + Math.abs(yc));
    const x1 = axisB ? L - axisStop(true) : L + E + wsL + Math.abs(yc);
    // the phase: θ' = π / P(x), scaled so the ends land where they must —
    // an EXTREMUM on the axis (the stem symmetric there), a ZERO at an
    // interior end (the stem on the band's centre line where runs meet)
    const n = Math.max(8, Math.ceil((x1 - x0) / 0.4));
    const xs = [], raw = [0];
    for (let k = 0; k <= n; k++) xs.push(x0 + (x1 - x0) * k / n);
    for (let k = 1; k <= n; k++) { const xm = (xs[k - 1] + xs[k]) / 2; raw.push(raw[k - 1] + Math.PI / P0(Math.min(L, Math.max(0, xm))) * (xs[k] - xs[k - 1])); }
    // phase at x = 0 and x = L by interpolation of the raw integral
    const rawAt = (x) => { const t = (x - x0) / (x1 - x0) * n, k = Math.min(n - 1, Math.max(0, Math.floor(t))); return raw[k] + (raw[k + 1] - raw[k]) * (t - k); };
    const th0 = axisA ? Math.PI / 2 : 0;
    const span = rawAt(L) - rawAt(0);
    const want = axisB ? Math.max(1, Math.round((span - (th0 % Math.PI) - Math.PI / 2) / Math.PI)) * Math.PI + Math.PI / 2 - th0 % Math.PI : Math.max(1, Math.round(span / Math.PI - (axisA ? 0.5 : 0))) * Math.PI + (axisA ? Math.PI / 2 : 0);
    const sc = want / span;
    const theta = (x) => th0 + (rawAt(x) - rawAt(0)) * sc;
    const yOf = (x) => yc + ampOfX(Math.min(L, Math.max(0, x))) * Math.sin(theta(x));
    // the stem curve, local then mapped. Where the run's own path turns hard
    // (a notched corner's jogs) the meander can bring the stem back within a
    // feature of itself: its share is lowered — 1, 0.6, 0.3, 0 — until the
    // stem's own gap is a feature (told), else the run is not built
    let stem = null, lp = null;
    for (const a of [1, 0.6, 0.3, 0]) {
      ak = a;
      lp = xs.map((x) => [x, yOf(x)]);
      const tanL = lp.map((_, i) => { const q0 = lp[Math.max(0, i - 1)], q1 = lp[Math.min(n, i + 1)]; return Math.atan2(q1[1] - q0[1], q1[0] - q0[0]); });
      const local = { kind: 'stem', pts: lp, nrm: tanL.map((f) => [-Math.sin(f), Math.cos(f)]), tan: tanL, w: xs.map((x) => wsOf(Math.min(L, Math.max(0, x)))), root: 0, info: { kind: 'stem', role: 'stem', wire: 0, tip: 0 } };
      local.info.wire = Math.max(...local.w); local.info.tip = Math.min(...local.w);
      const cand = mapToPath(local, path, 0);
      if (selfGap(cand).gap >= Fm) { stem = cand; break; }
    }
    if (!stem) { told.push(`the ${run.id} stem is not built — the run folds it onto itself at any meander`); continue; }
    if (ak < 1) told.push(`the ${run.id} stem meanders at ${(100 * ak).toFixed(0)}% — the run's own turns would bring it within a feature of itself`);
    stem.localY = lp.map((q) => q[1]); stem.localX = xs.slice();
    stem.run = run.id; stem.meander = ak;
    runs.push({ run, path, L, Aa, Ab, cFrom, cTo, axisA, axisB, wOf, cOf, wsOf, ampOfX, theta, yOf, stem, sc, x0, x1, want });
  }

  // ---- 2. the seat (the chains' law: the molding's own height field) ----
  // the stem stands on the highest molding under its own EMITTED vertices
  // (withOrnament's seatEmitted, read at every vertex and its mirror): the
  // lift here is 0 so nothing but that reading raises it (VN5 measures it)
  const finishStem = (c) => { c.lift = c.pts.map(() => 0); return c; };
  for (const r of runs) finishStem(r.stem);
  const stems = runs.map((r) => r.stem);

  // ---- 3. the junction motifs (heavy at the peaks; medium a sunk rosette) ----
  const elements = [];       // { el (right), mirror (left or null), role, anchor, w, station }
  const ends = new Map();
  for (const r of runs) {
    for (const [id, cls, x, end] of [[r.run.from, r.cFrom, 0, 0], [r.run.to, r.cTo, r.L, 1]]) {
      if (!ends.has(id)) ends.set(id, { id, cls, items: [] });
      // the stem's point at the junction (its own end on the axis)
      const sx = end ? Math.min(x, r.x1) : Math.max(x, r.x0);
      const k = r.stem.localX.reduce((b, q, i) => (Math.abs(q - sx) < Math.abs(r.stem.localX[b] - sx) ? i : b), 0);
      ends.get(id).items.push({ r, w: r.wOf(x), P: r.stem.pts[k], N: r.path.out[end ? r.path.out.length - 1 : 0] });
    }
  }
  const motifKind = (cls, wcl) => (wcl === 'heavy' ? (cls === 'crest' ? 'palmette' : cls === 'bottom' ? 'shell' : 'rose') : wcl === 'medium' ? 'rosette' : null);
  for (const [id, e] of ends) {
    if (e.cls === 'terminal') continue;
    const onAxis = e.cls === 'crest' || e.cls === 'bottom';
    if (!onAxis && p.ornCorners !== 'on') continue;
    const w = Math.max(...e.items.map((q) => q.w)), wcl = classOf(w);
    const mk = motifKind(e.cls, wcl);
    if (!mk) continue;
    let nx = 0, ny = 0; for (const q of e.items) { nx += q.N[0]; ny += q.N[1]; } const nl = Math.hypot(nx, ny);
    const P = onAxis ? [0, e.items[0].P[1]] : e.items.reduce((a, q) => [a[0] + q.P[0] / e.items.length, a[1] + q.P[1] / e.items.length], [0, 0]);
    const size = mk === 'palmette' ? (1.6 + 1.2 * w) * M : mk === 'shell' ? (1.4 + 1.0 * w) * M : mk === 'rose' ? (1.2 + 0.8 * w) * M : (1.0 + 0.6 * w) * M;
    // a SHELL opens from its hinge, so its hinge sits inward of the stems'
    // meeting point by a quarter of its size (its fan, not its narrow hinge,
    // takes the stems' ends); the motif's placement then pushes it out of
    // the opening as any motif
    const inset = mk === 'shell' ? 0.25 * size : 0;
    const spec = { size, at: [P[0] - inset * nx / nl, P[1] - inset * ny / nl], out: [nx / nl, ny / nl], H, opening, onAxis, sunk: mk === 'rosette' };
    let el = null, f = 1;
    // the motif must JOIN every stem that ends at it (an overlap of the
    // embed, no graze) and graze nothing: remade 10 % smaller until it does
    for (let q = 0; q < 9; q++, f *= 0.9) {
      el = placeMotif(mk, { ...spec, size: size * f });
      if (!el) break;
      const mates = onAxis ? [el] : [el, mirrorElement(el)];
      if (DEBUG) DEBUG.push(`motif ${mk}@${id} f=${f.toFixed(2)} pushed ${el.pushed.toFixed(2)}: ` + e.items.map((q2) => { const c = wireElementContact(q2.r.stem, el, E); return `stem ${q2.r.run.id} clear ${c.clear.toFixed(2)} graze ${c.graze.toFixed(2)}`; }).join('; ') + ' | others ' + stems.map((st) => { const c = wireElementContact(st, el, E), c2 = wireElementContact(mirrorCurve(st), el, E); return `${st.run} ${c.graze.toFixed(2)}/${c2.graze.toFixed(2)}`; }).join(' '));
      const ok = e.items.every((q2) => { const c = wireElementContact(q2.r.stem, el, E); return c.graze === -Infinity && c.clear <= -E; })
        && mates.every((m) => stems.every((s) => wireElementContact(s, m, E).graze === -Infinity && wireElementContact(mirrorCurve(s), m, E).graze === -Infinity))
        && elements.every((o) => [o.el, o.mirror].filter(Boolean).every((oe) => mates.every((m) => elementClear(m, oe) >= Fm)));
      if (ok) break;
      el = null;
    }
    if (!el) { told.push(`the ${mk} at ${id} is not built — it cannot join its stems without grazing`); continue; }
    if (f < 1) told.push(`the ${mk} at ${id} made ${(100 * f).toFixed(0)}% — at full size it grazes a stem`);
    elements.push({ el, mirror: onAxis ? null : mirrorElement(el), role: 'motif', kind: mk, cls: wcl, anchor: id, w, onAxis });
  }

  // ---- 4. the items along each run, heaviest first ----
  const items = [];          // { run, x, w, kind, side, curves: [...], el }
  const cand = [];
  for (const r of runs) {
    // extrema θ = π/2 + kπ and zero crossings θ = kπ inside the run, away
    // from an axis end (the motif's) by a half wavelength
    const thA = r.theta(0), thB = r.theta(r.L);
    const kMin = Math.ceil((thA - Math.PI / 2) / Math.PI - 1e-9), kMax = Math.floor((thB - Math.PI / 2) / Math.PI + 1e-9);
    const solveX = (target) => { let lo = 0, hi = r.L; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (r.theta(m) < target) lo = m; else hi = m; } return (lo + hi) / 2; };
    const guard = (x) => x > 0.35 * M && x < r.L - 0.35 * M;
    let nExt = 0;
    for (let k = kMin; k <= kMax; k++) {
      const x = solveX(Math.PI / 2 + k * Math.PI); if (!guard(x)) continue;
      const side = Math.sign(Math.sin(r.theta(x))) || 1, w = r.wOf(x);
      cand.push({ r, x, w, side, at: 'extremum', n: nExt++ });
    }
    for (let k = Math.ceil(thA / Math.PI - 1e-9); k <= Math.floor(thB / Math.PI + 1e-9); k++) {
      const x = solveX(k * Math.PI); if (!guard(x) || x < 0.8 * M || x > r.L - 0.8 * M) continue;
      cand.push({ r, x, w: r.wOf(x), side: 0, at: 'zero' });
    }
  }
  cand.sort((a, b) => b.w - a.w || a.x - b.x);
  const itemKind = (c) => {
    if (c.at === 'zero') return c.w >= 0.46 && c.w < 0.66 ? 'rosette' : null;
    if (c.w >= 0.56) return 'cluster';
    if (c.w >= 0.36) return leaves ? 'leaf' : null;
    if (c.w >= 0.22) return 'bud';
    return leaves ? 'sprig' : null;
  };
  // what is kept, both sides, for the clearances
  const keptWires = [...stems, ...stems.map((st) => { const m = mirrorCurve(st); m.mirrorOf = st; return m; })];
  const keptEls = elements.flatMap((o) => [o.el, o.mirror].filter(Boolean));
  const near = (c) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of c.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return region.near([(x0 + x1) / 2, (y0 + y1) / 2], Math.hypot(x1 - x0, y1 - y0) / 2 + 3 * F + 4); };
  const bandOK = (c) => !c.pts.some((q) => opening(q)) && !(slitWorst(c, near(c)) > -Infinity);
  const clearOf = (a, b) => (wireClearBound(a, b) >= Fm ? Infinity : wireClear(a, b));
  let dropped = 0, shrunk = 0;
  for (const c of cand) {
    const kd = itemKind(c); if (!kd) continue;
    const r = c.r, stem = r.stem;
    const root0 = [c.x, r.yOf(c.x)], ws0 = r.wsOf(c.x);
    // a wire item's root starts back across the stem, behind its centre line
    // along the item's own heading, so the joint is a full overlap and
    // never the two wires' edges kissing
    const rootFor = (phi) => [root0[0] - Math.cos(phi) * 0.75 * ws0, root0[1] - Math.sin(phi) * 0.75 * ws0];
    const root = root0;
    const cc = r.cOf(c.x), w = c.w;
    // the item's heading: forward (away from the crest), into the bay the
    // stem bends around (inward at an outward bulge, outward at an inward one)
    const make = (f) => {
      if (kd === 'cluster') {
        const len = (ITEM.tendril[0] + ITEM.tendril[1] * w) * M * cc * f;
        const t = lay(tendril(len, p.ornTightness), rootFor(-c.side * 0.95), -c.side * 0.95, c.side < 0, r.path);
        t.info = { ...t.info, role: 'tendril' };
        const out = [t];
        if (leaves) { const ll = 0.7 * len * leafK; const lf = lay(buildLeaf({ length: ll, width: LEAF_ASPECT * ll, side: -c.side, curl: VINE_LEAF_CURL }), rootFor(-c.side * 0.3), -c.side * 0.3, false, r.path); lf.info = { ...lf.info, role: 'vine-leaf' }; out.push(lf); }
        return { curves: out };
      }
      if (kd === 'leaf' || kd === 'sprig') {
        const ll = (kd === 'leaf' ? ITEM.leaf[0] + ITEM.leaf[1] * w : ITEM.sprig) * M * cc * f * leafK;
        const lf = lay(buildLeaf({ length: ll, width: LEAF_ASPECT * ll, side: -c.side, curl: VINE_LEAF_CURL }), rootFor(-c.side * 0.75), -c.side * 0.75, false, r.path);
        lf.info = { ...lf.info, role: 'vine-leaf' };
        return { curves: [lf] };
      }
      // an element: a bud's cup root on the stem, growing into the bay; a
      // sunk rosette centred ON the stem
      const N = r.path.out[Math.min(r.path.out.length - 1, Math.round(c.x / r.L * (r.path.out.length - 1)))];
      const T = [N[1], -N[0]];
      const P = mapToPath({ pts: [root], nrm: [[0, 1]], tan: [0], info: {} }, r.path, 0).pts[0];
      if (kd === 'rosette') { const el = placeMotif('rosette', { size: ITEM.rosette * M * cc * f, at: P, out: N, H, opening, sunk: true }); return el ? { el } : null; }
      const size = (ITEM.bud[0] + ITEM.bud[1] * w) * M * cc * f, R = size / 2;
      // the bud's local +y along the item's heading (into the bay, forward)
      const ang = -c.side * 1.15, dir = [Math.cos(ang) * T[0] + Math.sin(ang) * N[0], Math.cos(ang) * T[1] + Math.sin(ang) * N[1]];
      const at = [P[0] + dir[0] * 0.7 * R, P[1] + dir[1] * 0.7 * R];
      let el = placeElement('bud', { size, at, angle: Math.atan2(dir[1], dir[0]) - Math.PI / 2, lift: 0 });
      if (el.loops.some((l) => l.some((q) => opening(q)))) return null;
      let lift = 0; const Pp = el.positions; for (let k = 0; k < Pp.length; k += 3) if (Pp[k + 2] !== 0) lift = Math.max(lift, Hz([Pp[k], Pp[k + 1]]), Hz([-Pp[k], Pp[k + 1]]));
      el = relift(el, lift);
      return { el };
    };
    const fits = (it) => {
      const why = (m) => { if (DEBUG) DEBUG.push(`${kd}@${c.x.toFixed(1)}: ${m}`); return false; };
      if (!it) return why('make null');
      if (it.el) {
        const e = it.el, m = mirrorElement(e);
        const st = wireElementContact(stem, e, E);
        if (!(st.graze === -Infinity && st.clear <= -E)) return why(`stem contact clear ${st.clear.toFixed(2)} graze ${st.graze}`);
        for (const o of keptWires) { if (o !== stem) { const q = wireElementContact(o, e, E); if (q.clear < Fm) return why(`wire ${o.kind} clear ${q.clear.toFixed(2)}`); } if (o.mirrorOf !== stem) { const q2 = wireElementContact(o, m, E); if (q2.clear < Fm) return why(`mirror wire ${o.kind} ${q2.clear.toFixed(2)}`); } }
        if (keptEls.some((o) => elementClear(e, o) < Fm || elementClear(m, o) < Fm)) return why('element');
        return elementClear(e, m) >= Fm || why('own mirror');
      }
      for (const cv of it.curves) {
        if (cv.kind === 'tendril' && selfGap(cv).gap < Fm) return why(`self gap ${selfGap(cv).gap.toFixed(2)}`);
        if (!bandOK(cv)) return why(`band: opening ${cv.pts.some((q) => opening(q))} slit ${slitWorst(cv, near(cv))}`);
        if (!joinsCleanly(cv, stem)) { if (DEBUG) { const runs = (a, b) => { const out = []; let run = null; a.pts.forEach((q, i) => { let d = Infinity; for (let k = 0; k < b.pts.length - 1; k++) { const A = b.pts[k], B = b.pts[k + 1], dx = B[0] - A[0], dy = B[1] - A[1], l2 = dx * dx + dy * dy; let t = l2 ? ((q[0] - A[0]) * dx + (q[1] - A[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); d = Math.min(d, Math.hypot(q[0] - A[0] - t * dx, q[1] - A[1] - t * dy) - (wAt(a, i) + Math.max(wAt(b, k), wAt(b, k + 1))) / 2); } if (d < F) { if (!run) run = { i, min: d }; run.min = Math.min(run.min, d); } else if (run) { out.push(run); run = null; } }); if (run) out.push(run); return out.map((r) => `${r.i}:${r.min.toFixed(2)}`).join(','); }; DEBUG.push(`  runs tendril→stem [${runs(cv, stem)}] stem→tendril [${runs(stem, cv)}] n=${cv.pts.length}`); } return why(`${cv.kind} not joined to stem`); }
        const mates = [cv, mirrorCurve(cv)];
        if (clearOf(mates[0], mates[1]) < Fm) return why('own mirror');
        for (const m of mates) {
          for (const o of keptWires) { if ((o === stem && m === cv) || (o.mirrorOf === stem && m !== cv)) continue; if (clearOf(m, o) < Fm) return why(`${cv.kind} vs ${o.kind} ${clearOf(m, o).toFixed(2)}`); }
          for (const e of keptEls) { const q = wireElementContact(m, e, E); if (q.clear < Fm) return why(`${cv.kind} vs element ${q.clear.toFixed(2)}`); }
        }
      }
      // the cluster's leaf and tendril share a root: a joint there
      if (it.curves.length === 2 && !joinsCleanly(it.curves[0], it.curves[1])) return why('cluster pair');
      return true;
    };
    let it = null, q = 0;
    for (; q < 6; q++) { const t = make(0.85 ** q); if (fits(t)) { it = t; break; } }
    if (!it) { dropped++; continue; }
    if (q) shrunk++;
    const rec = { run: r.run.id, x: c.x, w, kind: kd, side: c.side, at: c.at, curves: it.curves || [], el: it.el || null };
    for (const cv of rec.curves) { cv.vineItem = rec; keptWires.push(cv, mirrorCurve(cv)); }
    if (rec.el) { rec.el.vineItem = rec; keptEls.push(rec.el, mirrorElement(rec.el)); }
    items.push(rec);
  }
  if (dropped) told.push(`${dropped} item${dropped > 1 ? 's' : ''} along the vine not built — no room a feature clear at any size`);
  if (shrunk) told.push(`${shrunk} item${shrunk > 1 ? 's' : ''} along the vine made smaller to fit`);

  // ---- 5. seat the items: on the molding, their root riding on the stem ----
  const leafPeak = Math.max(...wireProfile('leaf').z);
  for (const it of items) {
    const r = runs.find((q) => q.run.id === it.run), stem = r.stem;
    const k0 = stem.localX.reduce((b, q, i) => (Math.abs(q - it.x) < Math.abs(stem.localX[b] - it.x) ? i : b), 0);
    const crown = Math.max(F, wireHeight(stem.info.wire, 'half-round') * p.ornProjection);
    const ride = stem.lift[k0] + 0.6 * crown, ws = stem.w[k0];
    for (const cv of it.curves) {
      let s = 0; const sAt = cv.pts.map((q, i) => (i ? (s += Math.hypot(q[0] - cv.pts[i - 1][0], q[1] - cv.pts[i - 1][1])) : 0));
      // a LEAF's own section peaks under its crown (its midrib on a blade —
      // wireProfile('leaf') tops out under 1), so a leaf is lifted by the
      // shortfall to stand a feature over the molding, as a chain's leaf
      // stands on its host's crown
      const extra = cv.kind === 'leaf' ? Math.max(0, F - leafPeak * Math.max(F, LEAF_RELIEF * cv.info.wire * p.ornProjection)) : 0;
      cv.lift = cv.pts.map((_, i) => Math.max(Math.max(0, seatOn(H, cv, i)) + extra, ride * (1 - smooth(sAt[i] / (2 * ws)))));
    }
  }

  // ---- 6. THE TRIANGLE BUDGET (the frame's 1.5 M): priced off the solids'
  // own bounds; past it the vine gives way item by item, lightest first, then
  // whole runs from the last (their stems and the motifs only they reach),
  // told ----
  const priceC = (c) => 2 * solidTriBound(c.pts.length, profileFor(c, p).x.length);       // a curve and its mirror
  const priceE = (e, both = true) => (both ? 2 : 1) * e.indices.length / 3;
  let keptRuns = runs.slice(), keptItems = items.slice(), keptMotifs = elements.slice();
  const total = () => tris + keptRuns.reduce((a, r) => a + priceC(r.stem), 0) + keptItems.reduce((a, it) => a + it.curves.reduce((b, c) => b + priceC(c), 0) + (it.el ? priceE(it.el) : 0), 0) + keptMotifs.reduce((a, o) => a + priceE(o.el, !o.onAxis), 0);
  let gaveItems = 0, gaveRuns = 0;
  if (total() > triBudget) {
    const byW = keptItems.slice().sort((a, b) => a.w - b.w);
    while (byW.length && total() > triBudget) { const it = byW.shift(); keptItems = keptItems.filter((q) => q !== it); gaveItems++; }
    while (keptRuns.length && total() > triBudget) {
      const r = keptRuns.pop(); gaveRuns++;
      keptMotifs = keptMotifs.filter((o) => keptRuns.some((q) => q.run.from === o.anchor || q.run.to === o.anchor));
    }
    if (gaveItems) told.push(`${gaveItems} item${gaveItems > 1 ? 's' : ''} along the vine given way to the ${triBudget.toLocaleString('en-US')}-triangle budget (the lightest first)`);
    if (gaveRuns) told.push(`${gaveRuns} run${gaveRuns > 1 ? 's' : ''} of the vine not built — past the ${triBudget.toLocaleString('en-US')}-triangle budget`);
  }
  // ---- 7. the record: one group per side of curves (stems + items), the
  // motifs as element groups ----
  const curves = [...keptRuns.map((r) => r.stem), ...keptItems.flatMap((it) => it.curves)];
  const groups = keptRuns.length ? [{ group: 'vine', anchor: keptRuns.map((r) => `${r.run.from}→${r.run.to}`).join(', '), onAxis: false, curves, mirrored: curves.map(mirrorCurve), push: depth, told: [], chain: { vine: true, runs: keptRuns.map((r) => ({ id: r.run.id, L: r.L, from: r.run.from, to: r.run.to, cFrom: r.cFrom, cTo: r.cTo, Aa: r.Aa, Ab: r.Ab, path: r.path })) } }] : [];
  for (const o of keptMotifs) groups.push({ group: o.kind, anchor: o.anchor, onAxis: o.onAxis, curves: [], mirrored: [], elements: [o.el, o.mirror].filter(Boolean), motif: o });
  const els = groups.flatMap((g) => g.elements || []);
  for (const it of keptItems) if (it.el) els.push(it.el, mirrorElement(it.el));
  const all = groups.flatMap((g) => [...g.curves, ...g.mirrored]);
  tris = total();
  items.length = 0; items.push(...keptItems);
  const tip = all.length ? Math.min(...all.map((c) => c.info.tip ?? c.info.wire)) : F;
  const weight = { h, runs: keptRuns.map((r) => ({ id: r.run.id, from: r.run.from, to: r.run.to, L: r.L, Aa: r.Aa, Ab: r.Ab, cFrom: r.cFrom, cTo: r.cTo })) };
  return { scale, length: M, wire: F, style: 'carved', layout: 'vine', tip, groups, curves: all, elements: els, items, motifs: keptMotifs, weight, region, H, told, tris: { bound: tris, frame: frameTris, budget: triBudget } };
}
