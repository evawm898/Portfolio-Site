/* bug-wing-reframe.mjs — re-express a library wing in its OWN FRAME plus a
   sweep (design doc §13.6). Dev-time only: it wrote bug-wing-library.js's
   entries #1–#17 from their #349 form (tools/bug-wing-library-v1.mjs), and
   `node tools/bug-wing-reframe.mjs [id ...]` prints them again so the
   conversion can be re-run and diffed (about a minute and a half a shape: the
   least-squares refit is numerical).

   A wing's FRAME: u along its own LONG AXIS, hinge to apex; the apex is the
   point of the drawn outline farthest from the hinge (a tail excluded), so in
   the new frame it is the outline's largest u — the point every apex rule in
   the geometry already reads. The axis's angle is the pair's SWEEP (+ =
   backward, the geometry's own sign).

   UNITS. Each wing keeps its own: its length stays its reach across the body
   (the forewing's is the bug's size, which applying never writes; the
   hindwing's is that times its lengthRatio, unchanged), so its apex lands at
   u = 1 / cos(sweep) — up to 1.40 on these 17, inside the 1.6 the outline rule
   allows. (Re-normalising the hindwing to its apex was tried first: #15's
   long hindwing then asked for 60.3 mm and the 60 mm slider clamped it.)

   HOW. Everything happens on the shape AS APPLIED to the default bug (41 mm
   forewing, its hinges): the old drawn outline is sampled densely in the world,
   RE-ROOTED (bug-image.js rerootChain: kept from where it leaves the default
   body, joined by Hermite bridges to a short root chord square to the new axis
   at the hinge — the old root ran along the body, square to the axis only at
   sweep 0), carried into the new frame, and refitted: the image fitter's
   fewest-points fit at a loose tolerance, then its knots MOVED by Levenberg-
   Marquardt until the spline lies on the old curve within REFRAME_TOL_MM, a
   point of the old curve added where it still strays. Rotating the old control
   points alone is exact only at stretch 1 (the spline is centripetal in the
   editor's anisotropic units, so a rotation bends it between its knots — up to
   0.25 mm at stretch 1.8); the plain fewest-points fit stalled at 0.06–0.13 mm
   against its own minimum point spacing. The fit is held where the outline
   SHOWS: beyond ROOT_ZONE_MM of the default body.

   A tail group (#16) is fitted WITH its wing — the old outline composed with
   the tail, one curve, so the spline through the joins is held too — and split
   off again: the knots on the old tail's stretch become the group, anchored
   where composeOutline puts them back exactly. The gate (LB7) holds the result
   to the old shape; this file is never its reference. */

import * as G from '../bug-geometry.js';
import { fitOutline, wingAxis, rerootChain, axisFrame } from '../bug-image.js';

export const REFRAME_TOL_MM = 0.015;
const START_TOLS = [0.25, 0.12, 0.06];
const REF_LEN = 41;                  // mm: the default bug's forewing; the shape is re-expressed AS APPLIED to the default bug
export const ROOT_HALF_FRAC = 0.02;  // the root chord's half-width, of the wing's length (the outline rule wants 0.03 of it, whole)

const DEFAULT = G.defaultParams();
const DEFAULT_BODY = (() => { const m = G.buildBug(DEFAULT); return G.contourLoops(m, m.parts.find((q) => q.kind === 'body')); })();
const inPoly = (p, L) => { let c = false; for (let i = 0, j = L.length - 1; i < L.length; j = i++) { const a = L[i], b = L[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
export const inDefaultBody = (q) => DEFAULT_BODY.some((L) => inPoly(q, L));
/* THE ROOT ZONE: within ROOT_ZONE_MM of the default bug's body silhouette. The
   root is rebuilt there (it must close on a chord square to the wing's own
   axis), so the re-expression is held to the tolerance only beyond it — and
   so is the gate (LB7). */
export const ROOT_ZONE_MM = 1;
const segd0 = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-30, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
export const inRootZone = (q) => inDefaultBody(q) || DEFAULT_BODY.some((L) => L.some((a, i) => segd0(q, a, L[(i + 1) % L.length]) < ROOT_ZONE_MM));

const r5 = (v) => +v.toFixed(5);
const segd = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-30, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
/* Both ways: every target point's distance to the spline, every spline
   sample's distance to the target (windowed by arc order — both run root lead
   to root trail). Returns the residual vector and the worst. */
function residuals(knots, target, W, seen = () => true) {
  const sp = G.sampleOutline(knots).map(W), r = [];
  let worst = 0, worstAt = 0, worstTarget = target[0];
  const nT = target.length, nS = sp.length;
  for (let j = 0; j < nT; j++) {
    const c = Math.round((j / (nT - 1)) * (nS - 1)), lo = Math.max(0, c - 60), hi = Math.min(nS - 2, c + 60);
    let d = Infinity, at = c; for (let k = lo; k <= hi; k++) { const e = segd(target[j], sp[k], sp[k + 1]); if (e < d) { d = e; at = k; } }
    const vj = seen(target[j]); r.push((vj ? 1 : 0.2) * d * (1 + d / REFRAME_TOL_MM)); if (vj && d > worst) { worst = d; worstAt = at; worstTarget = target[j]; }
  }
  for (let k = 0; k < nS; k++) {
    const c = Math.round((k / (nS - 1)) * (nT - 1)), lo = Math.max(0, c - 120), hi = Math.min(nT - 2, c + 120);
    let d = Infinity, at = c; for (let j = lo; j <= hi; j++) { const e = segd(sp[k], target[j], target[j + 1]); if (e < d) { d = e; at = j; } }
    const vk = seen(sp[k]); r.push((vk ? 1 : 0.2) * d * (1 + d / REFRAME_TOL_MM)); if (vk && d > worst) { worst = d; worstAt = k; worstTarget = target[Math.min(nT - 1, at + 1)]; }
  }
  return { r, worst, worstAt, worstTarget };
}
/* Levenberg-Marquardt on the interior knots (the two roots stay on u = 0, free
   along it); a step that makes the outline invalid is refused. */
function refine(knots, target, W, seen) {
  let K = knots.map((q) => q.slice());
  const n = K.length, vars = [];
  for (let i = 0; i < n; i++) { if (i > 0 && i < n - 1) vars.push([i, 0]); vars.push([i, 1]); }
  const ss = (r) => r.reduce((a, x) => a + x * x, 0);
  let R = residuals(K, target, W, seen), cost = ss(R.r), lam = 1e-3;
  const h = 2e-5;
  for (let it = 0; it < 40; it++) {
    const J = vars.map(([i, c]) => { const K2 = K.map((q) => q.slice()); K2[i][c] += h; const r2 = residuals(K2, target, W, seen).r; return r2.map((x, j) => (x - R.r[j]) / h); });
    const m = vars.length, A = Array.from({ length: m }, () => new Float64Array(m)), g = new Float64Array(m);
    for (let a = 0; a < m; a++) { for (let b = a; b < m; b++) { let v = 0; const Ja = J[a], Jb = J[b]; for (let j = 0; j < Ja.length; j++) v += Ja[j] * Jb[j]; A[a][b] = A[b][a] = v; } let v = 0; for (let j = 0; j < J[a].length; j++) v += J[a][j] * R.r[j]; g[a] = v; }
    let improved = false;
    for (let tries = 0; tries < 8 && !improved; tries++) {
      const M = A.map((row, a) => Float64Array.from(row, (v, b) => (a === b ? v * (1 + lam) + 1e-12 : v)));
      const dx = solve(M, Array.from(g, (v) => -v));
      if (!dx) { lam *= 10; continue; }
      const K2 = K.map((q) => q.slice()); vars.forEach(([i, c], a) => { K2[i][c] += dx[a]; });
      if (!valid(K2)) { lam *= 10; continue; }
      const R2 = residuals(K2, target, W, seen), c2 = ss(R2.r);
      if (c2 < cost) { K = K2; R = R2; cost = c2; lam = Math.max(1e-7, lam / 3); improved = true; } else lam *= 10;
    }
    if (!improved) break;
  }
  return { knots: K, worst: R.worst, worstAt: R.worstAt, worstTarget: R.worstTarget };
}
// the outline rule with a little room, so rounding the result to 5 decimals cannot break it
const valid = (K) => G.outlineValid(K).ok && K.every((q, i) => i === 0 || Math.hypot(q[0] - K[i - 1][0], q[1] - K[i - 1][1]) >= 0.0125);
function solve(A, b) {
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-18) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((row, i) => row[n] / row[i]);
}
/* One wing, as drawn on the default bug at sweep 0 (pair `pair`, length
   41 mm x `lengthRatio`), re-expressed in its own frame. `keepUnits`: the
   length stays (the forewing); else the apex is put at u = 1 and `scale` is
   the factor the length grew by. */
export function reframeWing(points, stretch, opts = {}) {
  const L0 = REF_LEN * (opts.lengthRatio || 1), hinge = G.editorFrame(DEFAULT, opts.pair || 0).hinge;
  // a tail is fitted WITH its wing (the spline through the joins is one curve),
  // and split off again after: its dense samples are tagged
  const comp = opts.tail ? G.composeOutline(points, { ...opts.tail, on: true }) : null;
  const drawn = comp ? comp.points : points;
  const world = G.sampleOutline(drawn, 40).map(([u, w]) => [hinge[0] + u * L0, hinge[1] + w * stretch * L0]);
  const tailIdx = comp ? (() => { const t = comp.tags.map((g, i) => (g[0] === 'tail' ? i : -1)).filter((i) => i >= 0); return [(t[0] - 1) * 40, (t[t.length - 1] + 1) * 40]; })() : null;
  // the axis is read off the BASE outline (the tail group excluded entirely),
  // which is the subject LB8 checks: with the tail spliced in, the margin it
  // replaces is gone and the farthest point moves (2 degrees on #16's hindwing)
  const baseWorld = comp ? G.sampleOutline(points, 40).map(([u, w]) => [hinge[0] + u * L0, hinge[1] + w * stretch * L0]) : world;
  const ax = wingAxis(baseWorld, hinge);
  const sweep = +ax.sweep.toFixed(2);
  const L = opts.keepUnits ? L0 : ax.dist, scale = L / L0;
  // the stretch, the fitter's rule, read in the new frame at S = 1 (off the
  // old outline: the root chord is small against its extents), then the root
  // chord, ROOT_HALF_FRAC of the length in w — i.e. x the stretch in mm
  const f1 = axisFrame(hinge, sweep, L, 1), WB = G.OUTLINE_BOUNDS.w;
  let ymax = -Infinity, ymin = Infinity; for (const q of world) { const w = f1.toUW(q)[1]; ymax = Math.max(ymax, w); ymin = Math.min(ymin, w); }
  const S = +Math.min(3, Math.max(1, ymax / (WB[1] - 0.02), -ymin / (-WB[0] - 0.02))).toFixed(4);
  const rr = rerootChain(world, hinge, sweep, ROOT_HALF_FRAC * L * S, inDefaultBody);
  if (!rr) throw new Error('nothing of the wing outside the body');
  const F = axisFrame(hinge, sweep, L, S);
  const chain = rr.chain.map(F.toUW);
  chain[0] = [0, chain[0][1]]; chain[chain.length - 1] = [0, chain[chain.length - 1][1]];
  // the fewest-points fit at a loose tolerance, then its knots MOVED (least
  // squares, Levenberg-Marquardt) until the spline lies on the old curve; a
  // point of the old curve is added where it still strays, and so on
  const W = (uw) => F.toWorld(uw);
  const target = rr.chain;
  // the fit is held to the tolerance where the outline SHOWS on the default bug
  const seen = (q) => !inRootZone(q);
  // a start that stalls above the tolerance is retried from a finer first fit
  // (a stray at a rounded apex can sit in a local minimum no insertion leaves:
  // #4's forewing held at 0.054 mm from the 0.25 start); the best is kept
  let overall = null;
  for (const startTol of START_TOLS) {
    const f0 = fitOutline(chain, F.toWorld, startTol);
    if (!f0.valid) { if (startTol === START_TOLS[0]) throw new Error(`the first fit is invalid: ${G.outlineValid(f0.points).reason} ${JSON.stringify(chain.slice(0, 4))}`); continue; }
    let knots = f0.points.map((q) => q.slice());
    let fit = refine(knots, target, W, seen), best = fit, stall = 0;
    for (let round = 0; round < 30 && fit.worst > REFRAME_TOL_MM; round++) {
      // add the target point nearest the worst stray as a knot, between the knots
      // it falls between along the curve (tried at its neighbours too if the
      // outline rule refuses it there)
      const P = fit.knots, q = F.toUW(fit.worstTarget);
      const k0 = Math.min(P.length - 2, Math.floor(fit.worstAt / G.CR_SAMPLES));
      let next = null;
      for (const c of [q]) { if (next) continue; for (const k of [k0, k0 - 1, k0 + 1]) { if (k < 0 || k > P.length - 2) continue; const t = [...P.slice(0, k + 1), c, ...P.slice(k + 1)]; if (valid(t)) { next = t; break; } } }
      if (!next) break;
      const f2 = refine(next, target, W, seen);
      // an insertion that does not pay at once is still KEPT for up to three
      // rounds (a stray at a rounded apex needs two knots, not one: #4's
      // forewing stalled at 0.054 mm against LB7's 0.05 when the first one alone
      // was judged); the best fit seen is what is returned
      if (f2.worst < best.worst) { best = f2; stall = 0; } else if (++stall > 3) break;
      fit = f2;
    }
    if (!overall || best.worst < overall.worst) overall = best;
    if (overall.worst <= REFRAME_TOL_MM) break;
  }
  let fit = overall;
  const pts = fit.knots.map(([u, w]) => [r5(u), r5(w)]); pts[0][0] = 0; pts[pts.length - 1][0] = 0;
  const v = G.outlineValid(pts);
  if (!v.ok) throw new Error(`reframed outline invalid: ${v.reason}`);
  // the tail group: the knots that lie on the old tail's stretch of curve
  let tail = null, base = pts;
  if (tailIdx) {
    const off = rr.chain.indexOf(world[rr.keptFrom]);
    const nearestWorld = (q) => { const P = F.toWorld(q); let bd = Infinity, bk = -1; for (let k = 0; k < rr.chain.length; k++) { const d = Math.hypot(rr.chain[k][0] - P[0], rr.chain[k][1] - P[1]); if (d < bd) { bd = d; bk = k; } } return bk - off + rr.keptFrom; };
    const isT = pts.map((q, i) => i > 0 && i < pts.length - 1 && (() => { const d = nearestWorld(q); return d > tailIdx[0] + 20 && d < tailIdx[1] - 20; })());
    const a = isT.indexOf(true), b = isT.lastIndexOf(true);
    if (a < 0 || b - a + 1 < G.MIN_TAIL_POINTS) throw new Error('the tail did not survive the refit');
    base = [...pts.slice(0, a), ...pts.slice(b + 1)];
    const tailPts = pts.slice(a, b + 1);
    // the anchor: where composeOutline(base, tail) puts the group back exactly (bug-image.js tailGroup's search)
    const dense = G.sampleOutline(base); let apex = 0; for (let k = 1; k < dense.length; k++) if (dense[k][0] > dense[apex][0]) apex = k;
    const seg = a - 1;
    for (let f = 1; f < G.CR_SAMPLES && !tail; f++) {
      const d = dense[seg * G.CR_SAMPLES + f]; if (!d || seg * G.CR_SAMPLES + f <= apex) continue;
      const A = G.tailAnchor(base, d[0]); if (A.seg !== seg) continue;
      const offs = tailPts.map((q) => { const dx = q[0] - A.point[0], dy = q[1] - A.point[1]; return [dx * A.T[0] + dy * A.T[1], dx * A.N[0] + dy * A.N[1]]; });
      const c2 = G.composeOutline(base, { on: true, anchorU: d[0], points: offs });
      if (c2.points.every((q, k) => Math.abs(q[0] - pts[k][0]) < 1e-9 && Math.abs(q[1] - pts[k][1]) < 1e-9) && G.outlineValid(c2.points).ok) tail = { on: true, anchorU: d[0], points: offs };
    }
    if (!tail) throw new Error('the refitted tail could not be anchored on the new base');
    // round, and check the rounded group still composes to a valid outline
    tail = { on: true, anchorU: r5(tail.anchorU), points: tail.points.map(([x, y]) => [r5(x), r5(y)]) };
    if (!G.outlineValid(base).ok || !G.outlineValid(G.composeOutline(base, tail).points).ok) throw new Error('the rounded tail group does not compose');
  }
  return { points: base, tail, stretch: S, sweep, scale, maxDevMm: fit.worst, frame: F, oldWorld: ([u, w]) => [hinge[0] + u * L0, hinge[1] + w * stretch * L0] };
}

export function reframeShape(shape) {
  const fore = reframeWing(shape.fore.points, shape.fore.stretch, { keepUnits: true, pair: 0 });
  const hind = reframeWing(shape.hind.points, shape.hind.stretch, { lengthRatio: shape.hind.lengthRatio, pair: 1, keepUnits: true, tail: shape.tail });
  return {
    ...shape,
    fore: { stretch: fore.stretch, sweep: fore.sweep, points: fore.points },
    hind: { stretch: hind.stretch, sweep: hind.sweep, lengthRatio: +(shape.hind.lengthRatio * hind.scale).toFixed(4), points: hind.points },
    tail: hind.tail,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { WING_LIBRARY_V1 } = await import('./bug-wing-library-v1.mjs');
  const f = (a) => JSON.stringify(a);
  const only = process.argv.slice(2).map(Number).filter(Boolean);   // ids to print (default: all)
  for (const s of WING_LIBRARY_V1) {
    if (only.length && !only.includes(s.id)) continue;
    const n = reframeShape(s);
    console.log(`  { id: ${n.id}, name: '', source: '${n.source}',\n    fore: { stretch: ${n.fore.stretch}, sweep: ${n.fore.sweep}, points: ${f(n.fore.points)} },\n    hind: { stretch: ${n.hind.stretch}, sweep: ${n.hind.sweep}, lengthRatio: ${n.hind.lengthRatio}, points: ${f(n.hind.points)} },\n    tail: ${n.tail ? `{ on: true, anchorU: ${n.tail.anchorU}, points: ${f(n.tail.points)} }` : 'null'} },`);
  }
}
