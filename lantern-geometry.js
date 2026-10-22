/* lantern-geometry.js — the one owner of the paper star lantern's geometry
   (lantern-design-doc.md §1–§3). Pure: no DOM, no three. The page, the views,
   the exports and the gates all read the MODEL `solveLantern(state)` returns.

   THE MODEL (doc §2): a half is a PLEATED CONE — every facet a cone with its
   apex at the raised centre C = (0, 0, H) over a planar rim curve in z = 0.
   Rigid flat triangles cannot fold into two mirrored halves at all (§2.2), so
   the facet is a developable with ONE freedom, the rim's bow, and the solver
   finds the bow that makes the development's centre angle close.

   Flat facet coordinates: C at the origin, the tip's ridge along +x, the facet
   on the +y side (its valley at polar angle `a`). The development condition
   along the rim, with ρ the generator length and r = √(ρ² − H²) the 3D radius:
       r² θ'² = ρ² α'² − r'² H² / ρ²
   `develop()` integrates it; `solveLantern()` bisects the bow λ until θ(1)
   = π/N (or the pair of flat angles for alternating points, §2.5). */

import { curveFunction, cloneCurve } from './bloom-curve.js';

export const MM_PER_IN = 25.4;
export const POINTS_RANGE = [3, 16];
export const WIDTH_RANGE = [150, 900];
export const DEPTH_FRAC_RANGE = [0.1, 0.9];
export const SLENDER_RANGE = [0.15, 0.95];
export const ALT_RATIO_RANGE = [0.4, 0.95];
export const TIP_RADIUS_RANGE = [1, 8];
export const OPENING_RANGE = [20, 80];
export const RING_WIDTH_RANGE = [10, 40];
export const SCALLOP_RANGE = [2, 9];
export const SCALLOP_DEPTH_RANGE = [0.005, 0.05];
export const EDGE_MODES = ['straight', 'convex', 'concave', 's-curve', 'scalloped', 'custom'];
export const TIP_MODES = ['sharp', 'blunt'];
export const PROFILE_MODES = ['straight'];          // 'faceted' is phase 6 (doc §2.6)
export const TAB_WIDTH_MM = 8;                     // phase 1 constant; the material model owns it from phase 3
export const TAB_TAPER_MM = 10;
export const HANG_HOLE_MM = 6;
export const HANG_HOLE_INSET_MM = 15;
export const EDGE_SAMPLES = 256;                   // the development quadrature's resolution per facet edge
export const DESIGN_FORMAT = 'lantern-design';
export const DESIGN_VERSION = 2;   // 2: the pattern's fields (phase 2); a v1 file reads with them reported missing

/* The edge curve's spec, in the chord frame: x along the chord from the tip
   (0) to the inner vertex (1), y the OUTWARD normal offset as a fraction of
   the chord length. Both ends are locked (the tip and the inner vertex are
   the sliders'); up to 12 points; a function curve (PCHIP) so it cannot fold
   back. The `owner` is the chord, whose length the readout prints. */
export const EDGE_SPEC = Object.freeze({ modes: ['single'], x: [0, 1], y: [-0.25, 0.25], points: [2, 12], owner: 'width', monotoneX: true, lock: { first: 'xy', last: 'xy' } });

export const DEFAULTS = Object.freeze({
  points: 5, width: 508, depthFrac: 0.42, slender: 0.45,
  alternate: false, altRatio: 0.72,
  edgeMode: 'straight', edge: { mode: 'single', points: [[0, 0], [1, 0]] },
  scallops: 4, scallopDepth: 0.015,
  tip: 'blunt', tipRadius: 3,
  profile: 'straight',
  opening: 40, ringWidth: 24, hangHole: false,
});

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/* ---- the quick edge modes ------------------------------------------------ */
/* Each writes the curve's control points; the editor then edits them. */
export function edgeCurveFor(mode, { scallops = 4, scallopDepth = 0.03, amount = 0.05 } = {}) {
  const pts = [];
  if (mode === 'straight') return { mode: 'single', points: [[0, 0], [1, 0]] };
  if (mode === 'convex') return { mode: 'single', points: [[0, 0], [0.35, amount], [0.7, amount * 0.85], [1, 0]] };
  if (mode === 'concave') return { mode: 'single', points: [[0, 0], [0.35, -amount], [0.7, -amount * 0.85], [1, 0]] };
  if (mode === 's-curve') return { mode: 'single', points: [[0, 0], [0.3, amount * 0.9], [0.7, -amount * 0.9], [1, 0]] };
  if (mode === 'scalloped') {
    const n = Math.round(clamp(scallops, SCALLOP_RANGE[0], SCALLOP_RANGE[1]));
    const d = clamp(scallopDepth, SCALLOP_DEPTH_RANGE[0], SCALLOP_DEPTH_RANGE[1]);
    /* n crests and n+1 dips, ends on dips; the crests carry a sin(πu)
       ENVELOPE, because a folded rim cannot hold a scallop flank near the tip
       or the inner vertex (the edge there runs within a few degrees of the
       development's radial limit — measured: a flat 2% scallop is steep on the
       default star, an enveloped 1.5% is not). */
    const m = 2 * n;
    for (let k = 0; k <= m; k++) { const u = k / m; pts.push([+u.toFixed(4), k % 2 ? +(d * Math.sin(Math.PI * u)).toFixed(4) : 0]); }
    return { mode: 'single', points: pts };
  }
  return null;
}

/* ---- the flat facet edge ------------------------------------------------- */
/* One facet's rim edge, flat, from the tip's ridge to the inner vertex:
   `{ pts, chord, normal, filletRows }` in facet coordinates. `bow` is the
   solver's λ (a fraction of the chord, outward). The tip fillet (tip 'blunt')
   replaces the sharp corner at T by an arc tangent to the edge and to its
   mirror across the ridge; the polyline then starts on the ridge at the arc's
   midpoint, which is where the ridge now ends. */
export function facetEdge({ Ro, Ri, a, edgeFn, bow = 0, tipRadius = 0, n = EDGE_SAMPLES }) {
  const T = [Ro, 0], V = [Ri * Math.cos(a), Ri * Math.sin(a)];
  const ch = [V[0] - T[0], V[1] - T[1]], L = Math.hypot(ch[0], ch[1]);
  let nn = [ch[1] / L, -ch[0] / L];
  const mid = [(T[0] + V[0]) / 2, (T[1] + V[1]) / 2];
  if (nn[0] * mid[0] + nn[1] * mid[1] < 0) nn = [-nn[0], -nn[1]];   // outward = away from C
  const w = (u) => ((edgeFn ? edgeFn(u) : 0) + bow * Math.sin(Math.PI * u)) * L;
  const P = (u) => [T[0] + u * ch[0] + w(u) * nn[0], T[1] + u * ch[1] + w(u) * nn[1]];
  let pts = [];
  for (let k = 0; k <= n; k++) pts.push(P(k / n));
  let filletRows = 0;
  if (tipRadius > 0) {
    // tangent direction at T: the edge's first chord; half-angle β to the ridge (the +x axis, pointing back toward C is −x)
    const d0 = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]];
    const beta = Math.atan2(Math.abs(d0[1]), -d0[0]);            // angle between the edge and the ridge (toward C)
    if (beta > 0.02 && beta < Math.PI / 2 - 0.02) {
      const tlen = tipRadius / Math.tan(beta);                     // tangent length from T along the edge
      const cx = Ro - tipRadius / Math.sin(beta);                  // arc centre on the ridge
      // walk the edge by arc length tlen
      let acc = 0, k = 1;
      while (k < pts.length && acc + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]) < tlen) { acc += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); k++; }
      if (k < pts.length - 2) {
        const seg = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
        const t = seg > 0 ? (tlen - acc) / seg : 0;
        const tp = [pts[k - 1][0] + t * (pts[k][0] - pts[k - 1][0]), pts[k - 1][1] + t * (pts[k][1] - pts[k - 1][1])];
        const ang1 = Math.atan2(tp[1], tp[0] - cx);                // the tangent point's angle about the arc centre
        const arcN = Math.max(4, Math.ceil(ang1 / (Math.PI / 48)));
        const arc = [];
        for (let j = 0; j <= arcN; j++) { const g = (ang1 * j) / arcN; arc.push([cx + tipRadius * Math.cos(g), tipRadius * Math.sin(g)]); }
        pts = [...arc, ...pts.slice(k)];
        filletRows = arc.length;
      }
    }
  }
  return { pts, chord: L, normal: nn, filletRows, T, V };
}

/* ---- the development ----------------------------------------------------- */
/* The rim's 3D azimuth θ(u) for a flat facet edge and a centre height H.
   Returns `{ theta[], r[], rho[], end, infeasible, flatLength }`: `end` is the
   azimuth the rim reaches at the inner vertex, `infeasible` the number of
   samples whose edge runs too near a generator to lie in the rim plane
   (clamped to θ' = 0 and counted — doc §2.3). */
export function develop(pts, H) {
  const n = pts.length;
  const rho = new Float64Array(n), al = new Float64Array(n), r = new Float64Array(n), theta = new Float64Array(n);
  for (let k = 0; k < n; k++) { rho[k] = Math.hypot(pts[k][0], pts[k][1]); al[k] = Math.atan2(pts[k][1], pts[k][0]); r[k] = Math.sqrt(Math.max(0, rho[k] * rho[k] - H * H)); }
  let th = 0, infeasible = 0, flatLength = 0;
  for (let k = 1; k < n; k++) {
    const rm = (r[k] + r[k - 1]) / 2, rhom = (rho[k] + rho[k - 1]) / 2;
    const dal = al[k] - al[k - 1], dr = r[k] - r[k - 1];
    flatLength += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    const rhs = (rhom * dal) * (rhom * dal) - (dr * H / rhom) * (dr * H / rhom);
    if (rhs < 0 || !(rm > 0)) infeasible++;
    else th += Math.sqrt(rhs) / rm;
    theta[k] = th;
  }
  return { theta, r, rho, end: th, infeasible, flatLength };
}

/* ---- the solver ---------------------------------------------------------- */
function readState(raw) {
  const s = { ...DEFAULTS, ...(raw || {}) };
  s.points = Math.round(clamp(num(s.points, 5), POINTS_RANGE[0], POINTS_RANGE[1]));
  s.width = clamp(num(s.width, 508), WIDTH_RANGE[0], WIDTH_RANGE[1]);
  s.depthFrac = clamp(num(s.depthFrac, 0.42), DEPTH_FRAC_RANGE[0], DEPTH_FRAC_RANGE[1]);
  s.slender = clamp(num(s.slender, 0.45), SLENDER_RANGE[0], SLENDER_RANGE[1]);
  s.altRatio = clamp(num(s.altRatio, 0.72), ALT_RATIO_RANGE[0], ALT_RATIO_RANGE[1]);
  s.alternate = !!s.alternate && s.points % 2 === 0;
  s.tipRadius = clamp(num(s.tipRadius, 3), TIP_RADIUS_RANGE[0], TIP_RADIUS_RANGE[1]);
  s.tip = TIP_MODES.includes(s.tip) ? s.tip : 'blunt';
  s.opening = clamp(num(s.opening, 40), OPENING_RANGE[0], OPENING_RANGE[1]);
  s.ringWidth = clamp(num(s.ringWidth, 24), RING_WIDTH_RANGE[0], RING_WIDTH_RANGE[1]);
  s.hangHole = !!s.hangHole;
  s.edgeMode = EDGE_MODES.includes(s.edgeMode) ? s.edgeMode : 'custom';
  try { s.edge = cloneCurve(s.edge); } catch { s.edge = cloneCurve(DEFAULTS.edge); }
  return s;
}

/* The closure residual of one facet type at bow λ: θ(1) − target. */
function facetClosure({ Ro, Ri, a, edgeFn, bow, tipRadius, H, target }) {
  const e = facetEdge({ Ro, Ri, a, edgeFn, bow, tipRadius });
  const d = develop(e.pts, H);
  return { edge: e, dev: d, err: d.end - target };
}

/* The facet's closure RATIO at zero bow, θ(1)/(π/N) — the quantity doc §2.3
   tables; ≥ 1 means a convex bow closes it, < 1 means no planar rim exists. */
export function closureRatio(state) {
  const s = readState(state);
  const rt = s.width / 2, H = s.depthFrac * s.width / 2, rv = s.slender * rt, a = Math.PI / s.points;
  const edgeFn = curveFunction(s.edge.points, EDGE_SPEC);
  const c = facetClosure({ Ro: Math.hypot(rt, H), Ri: Math.hypot(rv, H), a, edgeFn: (u) => edgeFn(u) ?? 0, bow: 0, tipRadius: s.tip === 'blunt' ? s.tipRadius : 0, H, target: a });
  return { ratio: c.dev.end / a, infeasible: c.dev.infeasible };
}

function bisect(f, lo, hi, iters = 48) {
  let flo = f(lo), fhi = f(hi);
  if (flo === 0) return lo; if (fhi === 0) return hi;
  if (flo * fhi > 0) return null;
  for (let i = 0; i < iters; i++) { const m = (lo + hi) / 2, fm = f(m); if (fm === 0) return m; if (fm * flo > 0) { lo = m; flo = fm; } else { hi = m; fhi = fm; } }
  return (lo + hi) / 2;
}

export const BOW_RANGE = [0, 0.6];

/* THE SOLVER. Returns the model (doc §2.4). Never throws on a valid state:
   an unreachable depth is CLAMPED to the nearest closing depth and told in
   `model.notes`. */
export function solveLantern(rawState) {
  const s = readState(rawState);
  const N = s.points, a0 = Math.PI / N;
  const rt = s.width / 2, rv = s.slender * rt;
  const tipRadius = s.tip === 'blunt' ? s.tipRadius : 0;
  const edgeFn0 = curveFunction(s.edge.points, EDGE_SPEC);
  const edgeFn = (u) => edgeFn0(Math.min(1, Math.max(0, u))) ?? 0;
  const notes = [];
  const Htarget = s.depthFrac * s.width / 2;

  /* one facet type (or two, alternating): the solve at a given H returns the
     bow (or null when no convex bow closes), and the facet records */
  const solveAt = (H) => {
    const Ro = Math.hypot(rt, H);
    if (!s.alternate) {
      const Ri = Math.hypot(rv, H);
      const F = (bow) => facetClosure({ Ro, Ri, a: a0, edgeFn, bow, tipRadius, H, target: a0 });
      const f0 = F(0);
      if (f0.err < 0) return { ok: false, ratio: f0.dev.end / a0, H };
      const bow = bisect((b) => F(b).err, 0, BOW_RANGE[1]);
      if (bow === null) return { ok: false, ratio: f0.dev.end / a0, H, bowOut: true };
      const r = F(bow);
      return { ok: true, H, bow, facets: [{ type: 'long', Ro, Ri, a: a0, rtip: rt, ...r }], ratio: f0.dev.end / a0 };
    }
    // alternating: facet L (long tip, angle aL) and S (short tip, angle aS = 2a0 − aL), one bow, both close at a0 in 3D
    const RoS = Math.hypot(s.altRatio * rt, H), Ri = Math.hypot(rv, H);
    const pair = (aL, bow) => {
      const L = facetClosure({ Ro, Ri, a: aL, edgeFn, bow, tipRadius, H, target: a0 });
      const S = facetClosure({ Ro: RoS, Ri, a: 2 * a0 - aL, edgeFn, bow, tipRadius, H, target: a0 });
      return { L, S };
    };
    // for a given bow, find aL so that the two residuals are equal (then both are the same sign; bisect the bow on that common residual)
    const aLfor = (bow) => bisect((aL) => { const p = pair(aL, bow); return p.L.err - p.S.err; }, 0.15 * a0, 1.85 * a0, 36);
    const common = (bow) => { const aL = aLfor(bow); if (aL === null) return null; const p = pair(aL, bow); return { aL, err: (p.L.err + p.S.err) / 2, p }; };
    const c0 = common(0);
    if (!c0) return { ok: false, ratio: NaN, H };
    if (c0.err < 0) return { ok: false, ratio: 1 + c0.err / a0, H };
    const bow = bisect((b) => { const c = common(b); return c ? c.err : 1; }, 0, BOW_RANGE[1], 40);
    if (bow === null) return { ok: false, ratio: 1 + c0.err / a0, H, bowOut: true };
    const c = common(bow);
    return { ok: true, H, bow, ratio: 1 + c0.err / a0, facets: [{ type: 'long', Ro, Ri, a: c.aL, rtip: rt, ...c.p.L }, { type: 'short', Ro: RoS, Ri, a: 2 * a0 - c.aL, rtip: s.altRatio * rt, ...c.p.S }] };
  };

  let sol = solveAt(Htarget);
  let clampedDepth = false;
  if (!sol.ok) {
    // the nearest closing depth: scan H both ways for the closest ok, then refine on the boundary
    const Hmax = DEPTH_FRAC_RANGE[1] * s.width / 2, Hmin = DEPTH_FRAC_RANGE[0] * s.width / 2;
    const steps = 48;
    let best = null;
    for (let i = 0; i <= steps; i++) {
      const H = Hmin + (Hmax - Hmin) * i / steps;
      const t = solveAt(H);
      if (t.ok && (!best || Math.abs(H - Htarget) < Math.abs(best.H - Htarget))) best = t;
    }
    if (best) {
      // refine the boundary between best.H and the target
      let lo = best.H, hi = Htarget;
      for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; const t = solveAt(m); if (t.ok) { lo = m; best = t; } else hi = m; }
      sol = best;
      clampedDepth = true;
      notes.push({ kind: 'clamp', id: 'depth', text: `depth clamped to ${(2 * sol.H).toFixed(0)} mm (${(2 * sol.H / s.width).toFixed(2)} × width): a straight-ridge point this slender cannot close a planar rim at ${(2 * Htarget).toFixed(0)} mm — the paper would pucker at the centre. Widen the inner radius, blunt the tips, or (phase 6) use the faceted profile.` });
    } else {
      notes.push({ kind: 'bad', id: 'depth', text: 'no depth closes this star: no planar rim exists for these points and this slenderness.' });
      // fall back to a flat-ish build so the page still draws: H tiny, bow 0
      const H = 1e-3 * s.width;
      const Ro = Math.hypot(rt, H), Ri = Math.hypot(rv, H);
      const r = facetClosure({ Ro, Ri, a: a0, edgeFn, bow: 0, tipRadius, H, target: a0 });
      const facets = [{ type: 'long', Ro, Ri, a: a0, rtip: rt, ...r }];
      if (s.alternate) { const RoS = Math.hypot(s.altRatio * rt, H); facets.push({ type: 'short', Ro: RoS, Ri, a: a0, rtip: s.altRatio * rt, ...facetClosure({ Ro: RoS, Ri, a: a0, edgeFn, bow: 0, tipRadius, H, target: a0 }) }); }
      sol = { ok: false, H, bow: 0, facets, ratio: r.dev.end / a0 };
    }
  }
  const infeasible = sol.facets.reduce((m, f) => m + f.dev.infeasible, 0);
  const totalSamples = sol.facets.reduce((m, f) => m + f.dev.theta.length, 0);
  if (infeasible) notes.push({ kind: 'warn', id: 'steep', text: `edge too steep over ${(100 * infeasible / totalSamples).toFixed(1)}% of the rim: that stretch cannot lie in the rim plane on a straight-ridge point — the paper will pucker there.` });
  if (sol.bow > 0.002) notes.push({ kind: 'info', id: 'bow', text: `derived edge bow: ${(sol.bow * sol.facets[0].edge.chord).toFixed(1)} mm outward at mid-edge (${(100 * sol.bow).toFixed(1)}% of the chord) — what closes the fold at this depth.` });

  /* the facet sequence round the star: point j's tip, its type, and the two
     edges (to the valley after it, and from the valley before it) */
  const H = sol.H;
  const types = sol.facets;
  const typeOf = (j) => (s.alternate ? types[j % 2] : types[0]);
  // flat tip angles: walk the facets
  const flatTip = [0], tip3d = [];
  for (let j = 0; j < N; j++) {
    tip3d.push(2 * Math.PI * j / N);
    if (j < N - 1) flatTip.push(flatTip[j] + typeOf(j).a + typeOf(j + 1).a);
  }
  const model = {
    state: s, N, H, depth: 2 * H, width: 2 * rt, rt, rv, bow: sol.bow, ratio: sol.ratio, ok: sol.ok, clampedDepth,
    alternate: s.alternate, facets: types, flatTip, tip3d, infeasible, notes,
    flatSpan: 2 * Math.max(...types.map((t) => t.Ro)), Ro: types[0].Ro, Ri: types[0].Ri,
    tipRadius, tab: { width: Number.isFinite(+s.tabWidth) && +s.tabWidth > 0 ? +s.tabWidth : TAB_WIDTH_MM, taper: TAB_TAPER_MM },   // the material model hands the tab width in on the state (phase 3); the constant is the phase-1 default
    opening: s.opening, ringWidth: s.ringWidth, hangHole: s.hangHole,
    closure: types.map((t) => t.dev.end - a0),   // the residual, for the gate
  };
  return model;
}

/* ---- the flat half ------------------------------------------------------- */
const rot = (p, g) => { const c = Math.cos(g), sn = Math.sin(g); return [p[0] * c - p[1] * sn, p[0] * sn + p[1] * c]; };
const mirY = (p) => [p[0], -p[1]];

/* The full flat outline of one half as a closed polyline (CCW), plus the
   creases and the tabs. `which` is 'front' (tabs) or 'back' (opening + ring).
   Each outline vertex carries which facet and sample it came from, so the
   mesh and the gate can map flat ↔ 3D. */
export function halfOutline(model, which = 'front') {
  const { N, facets, flatTip } = model;
  const typeOf = (j) => (model.alternate ? facets[j % 2] : facets[0]);
  const outline = [];       // [x, y]
  const map = [];           // { j, side: +1|-1, k } per outline vertex
  const creases = [];       // { kind: 'mountain'|'valley', from: [0,0], to: [x,y], j }
  const edges = [];         // per facet edge: { j, side, pts (flat, placed) } — the rim edges, for tabs and the gate
  for (let j = 0; j < N; j++) {
    const t = typeOf(j), tn = typeOf((j + 1) % N);
    const gTip = flatTip[j];
    // right edge of point j: facet type t, from tip j to the valley after it
    const right = t.edge.pts.map((p) => rot(p, gTip));
    // left edge of point j+1: facet type tn mirrored, from the valley to tip j+1; walk from the valley toward the tip
    const gNext = flatTip[j] + t.a + tn.a;
    const left = tn.edge.pts.map((p) => rot(mirY(p), gNext)).reverse();
    for (let k = 0; k < right.length; k++) { outline.push(right[k]); map.push({ j, side: 1, k }); }
    edges.push({ j, side: 1, pts: right, type: t.type });
    for (let k = 1; k < left.length - (j === N - 1 ? 1 : 0); k++) { outline.push(left[k]); map.push({ j: (j + 1) % N, side: -1, k: left.length - 1 - k }); }
    edges.push({ j: (j + 1) % N, side: -1, pts: left, type: tn.type });
    creases.push({ kind: 'mountain', from: [0, 0], to: rot([t.edge.pts[0][0], 0], gTip), j });
    creases.push({ kind: 'valley', from: [0, 0], to: rot([t.Ri * Math.cos(t.a), t.Ri * Math.sin(t.a)], gTip), j });
  }
  // tip fillet closes each point: the right edge starts at the fillet midpoint on the ridge, the previous left edge ends there — the same point (dropped above by the slice)
  const out = { which, outline, map, creases, edges, tabs: [], holes: [], ring: null };
  if (which === 'front') out.tabs = edges.map((e) => tabFor(e, model, valleyBisector(e, edges)));
  if (which === 'back') {
    const rh = model.opening / 2;
    out.holes.push({ kind: 'opening', cx: 0, cy: 0, r: rh });
    out.ring = { inner: rh, outer: rh + model.ringWidth };
  }
  if (model.hangHole) {
    const t = typeOf(0);
    const x = t.edge.pts[0][0] - HANG_HOLE_INSET_MM;
    out.holes.push({ kind: 'hang', cx: x, cy: 0, r: HANG_HOLE_MM / 2 });
  }
  return out;
}

/* A glue tab outside one rim edge: the edge offset outward by the tab width,
   tapered to nothing over `taper` mm at the tip end (a tab never reaches the
   tip) and CLIPPED at the inner-vertex end to the valley's exterior bisector
   (`bis`: the vertex V, the bisector direction b and the side vector m toward
   this edge), so the two tabs meeting at V share the bisector as a seam and
   cannot overlap. Returns a closed polygon. */
function tabFor(edge, model, bis) {
  const pts = edge.pts, n = pts.length;
  const { width, taper } = model.tab;
  const tipEnd = edge.side === 1 ? 0 : n - 1;
  const cum = [0]; for (let k = 1; k < n; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  const total = cum[n - 1];
  const distTip = (k) => (tipEnd === 0 ? cum[k] : total - cum[k]);
  const outer = [];
  for (let k = 0; k < n; k++) {
    const dt = distTip(k);
    if (dt < taper * 0.6) continue;                        // the tab never reaches the tip
    const wT = clamp((dt - taper * 0.6) / taper, 0, 1);
    const kp = Math.max(0, k - 1), kn = Math.min(n - 1, k + 1);
    const tx = pts[kn][0] - pts[kp][0], ty = pts[kn][1] - pts[kp][1], tl = Math.hypot(tx, ty) || 1;
    let nx = ty / tl, ny = -tx / tl;
    if (nx * pts[k][0] + ny * pts[k][1] < 0) { nx = -nx; ny = -ny; }   // outward = away from the centre
    // the bisector clip: P + w n must stay on this edge's side of the line (V, b)
    const px = pts[k][0] - bis.V[0], py = pts[k][1] - bis.V[1];
    const side = px * bis.m[0] + py * bis.m[1], nm = nx * bis.m[0] + ny * bis.m[1];
    let wMax = Infinity;
    if (side <= 0) wMax = 0; else if (nm < 0) wMax = side / -nm;
    const w = Math.max(0, Math.min(width * wT, wMax));
    outer.push([pts[k][0] + w * nx, pts[k][1] + w * ny, k]);
  }
  if (outer.length < 2) return null;
  const k0 = outer[0][2], k1 = outer[outer.length - 1][2];
  const base = pts.slice(k0, k1 + 1).reverse();
  const poly = [...outer.map((p) => [p[0], p[1]]), ...base];
  return { j: edge.j, side: edge.side, poly };
}
/* The exterior bisector at the inner vertex an edge ends on: the vertex, the
   unit bisector of the two edges' tangents there (pointing away from the
   paper), and the side vector toward THIS edge. */
function valleyBisector(edge, edges) {
  const pts = edge.pts, n = pts.length;
  const V = edge.side === 1 ? pts[n - 1] : pts[0];
  const tangentAtV = (e) => { const p = e.pts, m = p.length; const a = e.side === 1 ? p[m - 1] : p[0], b = e.side === 1 ? p[m - 2] : p[1]; const d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(d[0], d[1]) || 1; return [d[0] / l, d[1] / l]; };
  const N = edges.length / 2;
  const other = edge.side === 1 ? edges.find((e) => e.j === (edge.j + 1) % N && e.side === -1) : edges.find((e) => e.j === (edge.j + N - 1) % N && e.side === 1);
  const t1 = tangentAtV(edge), t2 = tangentAtV(other);
  let b = [t1[0] + t2[0], t1[1] + t2[1]]; const bl = Math.hypot(b[0], b[1]) || 1; b = [b[0] / bl, b[1] / bl];
  let m = [-b[1], b[0]];
  if (m[0] * t1[0] + m[1] * t1[1] < 0) m = [-m[0], -m[1]];
  return { V, b, m };
}

/* ---- the folded half ----------------------------------------------------- */
/* The 3D rim of one facet type, from its development: cylindrical (r, θ) in
   z = 0, with θ measured from the tip's ridge. */
function rim3dOf(facet) {
  const { dev } = facet;
  const out = [];
  for (let k = 0; k < dev.theta.length; k++) out.push([dev.r[k], dev.theta[k]]);
  return out;
}

/* The folded half as triangles (one Float32Array of xyz triples) with its
   crease lines, `sign` +1 for the front (centre at +H) and −1 for the back.
   Fans from the centre to each facet's rim; with an opening, a strip from the
   opening ring (on each generator at ρ = r_h) to the rim. */
export function foldedMesh(model, sign = 1, { opening = false, solidAlternate = false } = {}) {
  const { N, facets, H, tip3d } = model;
  const typeOf = (j) => (model.alternate ? facets[j % 2] : facets[0]);
  const tris = [];
  const creases = [];
  const C = [0, 0, sign * H];
  const rh = opening ? model.opening / 2 : 0;
  // per facet TYPE: its own position and uv streams, so a pattern texture per type maps onto exactly its facets
  // with "alternate points solid" the odd points carry no pattern: they get their own parts, flagged, so the view can give them an uncut material
  const parts = facets.flatMap((t) => (solidAlternate ? [{ type: t.type, solid: false, pos: [], uv: [], box: uvBox(t) }, { type: t.type, solid: true, pos: [], uv: [], box: uvBox(t) }] : [{ type: t.type, solid: false, pos: [], uv: [], box: uvBox(t) }]));
  const partOf = (facet, j) => parts[facets.indexOf(facet) * (solidAlternate ? 2 : 1) + (solidAlternate && j % 2 === 1 ? 1 : 0)];
  let cur = null, curFlat = null;
  const push = (p, flat) => { tris.push(p[0], p[1], p[2]); cur.pos.push(p[0], p[1], p[2]); cur.uv.push(flat[0] / cur.box.Ro, (flat[1] + cur.box.yMax) / (2 * cur.box.yMax)); };
  const onGen = (Q, rho, frac) => [C[0] + (Q[0] - C[0]) * frac, C[1] + (Q[1] - C[1]) * frac, C[2] + (Q[2] - C[2]) * frac];
  for (let j = 0; j < N; j++) {
    const t = typeOf(j), tn = typeOf((j + 1) % N);
    const g = tip3d[j];
    const rimR = rim3dOf(t).map(([r, th]) => [r * Math.cos(g + th), r * Math.sin(g + th), 0]);
    const gN = tip3d[(j + 1) % N] + (j === N - 1 ? 2 * Math.PI : 0);
    const rimL = rim3dOf(tn).map(([r, th]) => [r * Math.cos(gN - th), r * Math.sin(gN - th), 0]).reverse();
    for (const rim of [rimR, rimL]) {
      const facet = rim === rimR ? t : tn;
      cur = partOf(facet, rim === rimR ? j : (j + 1) % N);   // the left rim of point j belongs to point j+1's facet
      // the flat (facet-local) coordinate of each rim sample: the right half uses the edge as drawn, the left half its mirror
      const flatOf = (k) => { const q = rim === rimR ? facet.edge.pts[k] : facet.edge.pts[rim.length - 1 - k]; return rim === rimR ? q : [q[0], -q[1]]; };
      const O = [0, 0];
      for (let k = 1; k < rim.length; k++) {
        const Q0 = rim[k - 1], Q1 = rim[k], F0 = flatOf(k - 1), F1 = flatOf(k);
        const rho0 = rim === rimR ? facet.dev.rho[k - 1] : facet.dev.rho[rim.length - k], rho1 = rim === rimR ? facet.dev.rho[k] : facet.dev.rho[rim.length - 1 - k];
        if (rh > 0) {
          const A = onGen(Q0, rho0, rh / rho0), B = onGen(Q1, rho1, rh / rho1);
          const FA = [F0[0] * rh / rho0, F0[1] * rh / rho0], FB = [F1[0] * rh / rho1, F1[1] * rh / rho1];
          // outward-facing winding for the front (sign +1): (Q0, Q1, B), (Q0, B, A)
          if (sign > 0) { push(Q0, F0); push(Q1, F1); push(B, FB); push(Q0, F0); push(B, FB); push(A, FA); } else { push(Q1, F1); push(Q0, F0); push(B, FB); push(B, FB); push(Q0, F0); push(A, FA); }
        } else if (sign > 0) { push(C, O); push(Q0, F0); push(Q1, F1); } else { push(C, O); push(Q1, F1); push(Q0, F0); }
      }
    }
    const tipP = rimR[0], valP = rimR[rimR.length - 1];
    creases.push({ kind: 'mountain', from: C, to: tipP });
    creases.push({ kind: 'valley', from: C, to: valP });
  }
  return { positions: new Float32Array(tris), creases, triangles: tris.length / 9, parts: parts.filter((p) => p.pos.length).map((p) => ({ type: p.type, solid: p.solid, positions: new Float32Array(p.pos), uvs: new Float32Array(p.uv), box: p.box })) };
}
/* The flat box a facet type's pattern texture covers: x in [0, Ro] along the
   ridge, y in [−yMax, yMax] across both halves. One owner, read by the mesh's
   UVs and by the page's texture painter. */
export function uvBox(facet) { let yMax = 1e-6; for (const p of facet.edge.pts) yMax = Math.max(yMax, Math.abs(p[1])); return { Ro: facet.Ro, yMax }; }
/* Facet-local frame of point j, side +1 (right of the ridge) or −1: a flat
   placement function for the pattern's cuts and the gate. */
export function facetPlacer(model, j, side = 1) { const g = model.flatTip[j]; return (p) => rot(side > 0 ? p : mirY(p), g); }

/* The whole rim of one half in 3D, as a closed polyline (xyz), from the
   facets' developments — what the rim-match gate compares between halves. */
export function rimCurve(model) {
  const { N, facets, tip3d } = model;
  const typeOf = (j) => (model.alternate ? facets[j % 2] : facets[0]);
  const out = [];
  for (let j = 0; j < N; j++) {
    const t = typeOf(j), tn = typeOf((j + 1) % N), g = tip3d[j], gN = tip3d[j] + 2 * Math.PI / N;
    const R = rim3dOf(t), L = rim3dOf(tn);
    for (let k = 0; k < R.length; k++) out.push([R[k][0] * Math.cos(g + R[k][1]), R[k][0] * Math.sin(g + R[k][1]), 0]);
    for (let k = L.length - 2; k >= 1; k--) out.push([L[k][0] * Math.cos(gN - L[k][1]), L[k][0] * Math.sin(gN - L[k][1]), 0]);
  }
  return out;
}

/* ---- dimensions and the readout ------------------------------------------ */
export function dimensions(model) {
  const f = model.facets[0];
  return {
    finishedWidth: model.width, finishedDepth: model.depth, finishedInner: model.rv,
    flatSpan: model.flatSpan, flatOuter: f.Ro, flatInner: f.Ri, facetAngleDeg: (f.a * 180) / Math.PI,
    bowMm: model.bow * f.edge.chord, chordMm: f.edge.chord, edgeLengthMm: f.dev.flatLength,
    tabWidth: model.tab.width, ratio: model.ratio,
  };
}
export const inches = (mm) => `${(mm / MM_PER_IN).toFixed(1)}″`;

/* ---- the flat SVG --------------------------------------------------------- */
/* One half as an SVG: LightBurn-style named layers (CUT red, SCORE blue for
   mountains, PERF green for valleys), mm user units. Phase 3 replaces the
   valley lines with real perforation dashes and nests pieces; this is the
   half as one sheet. */
export function flatSvg(model, which = 'front', { margin = 10, cuts = [] } = {}) {
  const h = halfOutline(model, which);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (p) => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); };
  h.outline.forEach(grow); for (const t of h.tabs) if (t) t.poly.forEach(grow);
  const W = x1 - x0 + 2 * margin, Hh = y1 - y0 + 2 * margin;
  const tx = -x0 + margin, ty = y1 + margin;      // y up in the model, down in svg
  const P = (p) => `${(p[0] + tx).toFixed(3)},${(ty - p[1]).toFixed(3)}`;
  const path = (pts, closed) => `M${pts.map(P).join(' L')}${closed ? ' Z' : ''}`;
  const cut = [], score = [], perf = [];
  cut.push(`<path d="${path(h.outline, true)}"/>`);
  for (const t of h.tabs) if (t) cut.push(`<path d="${path(t.poly, true)}"/>`);
  for (const c of cuts) cut.push(`<path d="${path(c, true)}"/>`);
  for (const o of h.holes) cut.push(`<circle cx="${(o.cx + tx).toFixed(3)}" cy="${(ty - o.cy).toFixed(3)}" r="${o.r.toFixed(3)}"/>`);
  for (const c of h.creases) (c.kind === 'mountain' ? score : perf).push(`<path d="${path([c.from, c.to], false)}"/>`);
  // the tabs' fold lines are scores along the rim edge: part of the outline on the front (the edge is a crease, not a cut, where a tab is)
  const ring = h.ring ? `<g id="RING" inkscape:label="RING" stroke="#ff0000" fill="none" stroke-width="0.2"><circle cx="${(x1 + margin + 2 * h.ring.outer + 10 + tx).toFixed(3)}" cy="${(ty).toFixed(3)}" r="${h.ring.outer}"/><circle cx="${(x1 + margin + 2 * h.ring.outer + 10 + tx).toFixed(3)}" cy="${(ty).toFixed(3)}" r="${h.ring.inner}"/></g>` : '';
  const Wt = W + (h.ring ? 2 * h.ring.outer + 20 : 0);
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- paper star lantern, ${which} half — mm units. Layers: CUT (red) SCORE (blue, mountain folds) PERF (green, valley folds, perforate). Cut inner shapes before the outline. -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${Wt.toFixed(2)}mm" height="${Hh.toFixed(2)}mm" viewBox="0 0 ${Wt.toFixed(3)} ${Hh.toFixed(3)}">
<g id="SCORE" inkscape:label="SCORE" stroke="#0000ff" fill="none" stroke-width="0.2">${score.join('')}</g>
<g id="PERF" inkscape:label="PERF" stroke="#00a000" fill="none" stroke-width="0.2">${perf.join('')}</g>
<g id="CUT" inkscape:label="CUT" stroke="#ff0000" fill="none" stroke-width="0.2">${cut.join('')}</g>
${ring}
</svg>`;
}

/* ---- the design file ----------------------------------------------------- */
export const STATE_FIELDS = ['points', 'width', 'depthFrac', 'slender', 'alternate', 'altRatio', 'edgeMode', 'edge', 'scallops', 'scallopDepth', 'tip', 'tipRadius', 'profile', 'opening', 'ringWidth', 'hangHole'];
/* Other modules register their own state fields here (the pattern's), each
   with a reader that clamps; the file then carries them beside the shape's. */
export const EXTRA_FIELDS = [];   // [{ fields: [...ids], read: (state) => cleanState }]
export function registerDesignFields(fields, read) { EXTRA_FIELDS.push({ fields, read }); }
const allFields = () => [...STATE_FIELDS, ...EXTRA_FIELDS.flatMap((e) => e.fields)];
export function serializeDesign(state) {
  const out = { format: DESIGN_FORMAT, version: DESIGN_VERSION, state: {} };
  for (const k of allFields()) out.state[k] = k === 'edge' ? cloneCurve(state[k]) : state[k];
  return JSON.stringify(out, null, 1);
}
/* Reads a design: `{ ok, state, notes }`. A newer version is refused whole; a
   missing field is reported and the current value kept; a value outside its
   range is clamped and told. */
export function readDesign(text, current = DEFAULTS) {
  let doc;
  try { doc = typeof text === 'string' ? JSON.parse(text) : text; } catch (e) { return { ok: false, notes: [`not JSON: ${e.message}`] }; }
  if (!doc || doc.format !== DESIGN_FORMAT) return { ok: false, notes: ['not a lantern design file'] };
  if (!(doc.version <= DESIGN_VERSION)) return { ok: false, notes: [`version ${doc.version} is newer than this page reads (${DESIGN_VERSION})`] };
  const notes = [];
  const st = { ...current };
  const fields = allFields();
  for (const k of fields) {
    if (!(k in (doc.state || {}))) { notes.push(`missing ${k} — kept ${JSON.stringify(current[k])}`); continue; }
    st[k] = doc.state[k];
  }
  for (const k of Object.keys(doc.state || {})) if (!fields.includes(k)) notes.push(`unknown field ${k} ignored`);
  let clean = readState(st);
  for (const e of EXTRA_FIELDS) clean = { ...clean, ...e.read(st) };
  for (const k of fields) if (k !== 'edge' && JSON.stringify(clean[k]) !== JSON.stringify(st[k])) notes.push(`${k}: ${JSON.stringify(st[k])} → ${JSON.stringify(clean[k])} (clamped)`);
  return { ok: true, state: clean, notes };
}

/* ---- presets and the randomizer ------------------------------------------ */
export const SHAPE_PRESETS = [
  { id: 'classic5', name: 'Classic 5-point', state: {} },
  { id: 'slender7', name: 'Slender 7', state: { points: 7, slender: 0.58, depthFrac: 0.46 } },
  { id: 'alt8', name: '8 alternating', state: { points: 8, alternate: true, altRatio: 0.7, slender: 0.62, depthFrac: 0.36 } },
  { id: 'sunburst12', name: '12-point sunburst', state: { points: 12, slender: 0.8, depthFrac: 0.4, tip: 'sharp' } },
  { id: 'flower', name: 'Scalloped flower', state: { points: 6, slender: 0.6, depthFrac: 0.34, edgeMode: 'scalloped', scallops: 3, scallopDepth: 0.03 } },
  { id: 'puffy6', name: 'Puffy hexagon', state: { points: 6, slender: 0.86, depthFrac: 0.38, edgeMode: 'convex' } },
  { id: 'convex5', name: 'Convex 5', state: { points: 5, slender: 0.5, depthFrac: 0.4, edgeMode: 'convex' } },
  { id: 'deep4', name: 'Deep 4-point', state: { points: 4, slender: 0.42, depthFrac: 0.5 } },
  { id: 'spiky3', name: 'Three spikes', state: { points: 3, slender: 0.3, depthFrac: 0.45, tip: 'sharp' } },
  { id: 'alt10', name: '10 alternating', state: { points: 10, alternate: true, altRatio: 0.65, slender: 0.72, depthFrac: 0.34 } },
];
export function presetState(p) {
  const st = { ...DEFAULTS, ...p.state };
  if (st.edgeMode !== 'custom' && st.edgeMode !== 'straight') st.edge = edgeCurveFor(st.edgeMode, st) || DEFAULTS.edge;
  if (st.edgeMode === 'straight') st.edge = edgeCurveFor('straight');
  return st;
}

/* A seeded random shape that CLOSES without a depth clamp (the solver is
   asked; a draw that clamps is redrawn, up to 24 times). */
export function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function randomShape(seed) {
  const rnd = mulberry32(seed);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  for (let tries = 0; tries < 24; tries++) {
    const points = pick([3, 4, 5, 5, 5, 6, 6, 7, 8, 8, 10, 12]);
    const st = { ...DEFAULTS, points, slender: 0.3 + 0.6 * rnd(), depthFrac: 0.25 + 0.3 * rnd(), width: DEFAULTS.width,
      alternate: points % 2 === 0 && rnd() < 0.4, altRatio: 0.55 + 0.35 * rnd(),
      edgeMode: pick(['straight', 'straight', 'convex', 'concave', 's-curve', 'scalloped']), scallops: 2 + Math.floor(rnd() * 5), scallopDepth: 0.015 + 0.04 * rnd(),
      tip: rnd() < 0.7 ? 'blunt' : 'sharp', tipRadius: 2 + Math.round(rnd() * 4) };
    st.edge = edgeCurveFor(st.edgeMode, { ...st, amount: 0.03 + 0.05 * rnd() });
    const m = solveLantern(st);
    if (m.ok && !m.clampedDepth && m.infeasible === 0) return st;
  }
  return { ...DEFAULTS };
}
