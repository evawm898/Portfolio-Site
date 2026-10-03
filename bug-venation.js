/* bug-venation.js — Phase 2 of the Parametric Bug: procedural VENATION as a
   planar subdivision of ONE wing's planform into CELLS.

   Pure 2D, pure ES module (no DOM, no three.js). bug-geometry.js calls
   planVenation() once per wing, in the wing's own PLANFORM frame (u along the
   span, w along the chord, millimetres, before the wing transform), and builds
   the HOLES frame or the RIDGE strips from what comes back. The SVG and the STL
   therefore cannot disagree about where a vein is: both read the same record,
   placed by the same transform as the slab.

   THE ARCHITECTURE: cells are not strokes. The wing polygon is SPLIT, chord by
   chord — every vein is a polyline whose two ends lie ON the boundary of the
   cell it cuts — so the cells always partition the wing EXACTLY: a shared edge
   is the same two doubles in both cells, the areas sum to the wing's, and no
   point is in two cells. Phase 4 (SVG import filling cells) reads the cells as
   closed polygons from this record; see bug-project-design-doc.md §8.3 for the
   data format.

   Order of construction:
     1. main veins — K = count x (1 + branch) TERMINAL paths from the root
        point R (the middle of the root chord) to targets spread by arc length
        along the drawn margin (the tail's tip is always a target when a tail
        is drawn, so veins run into the tail);
     2. the DISCAL cell — one cross-vein closing the strip between two central
        paths at `discalSize` of the way out, on the root side of which no
        cross-vein is cut;
     3. the PTEROSTIGMA — two chords from the lead-most path to the leading
        margin around 75 % of the way out, the cell between them marked
        `stigma` (kept solid in HOLES, raised as a plate in RIDGES);
     4. CROSS-VEINS — round(density x CROSS_MAX) per strip between adjacent
        paths (and from the two outermost paths to the margin), at the same
        fractions on both sides when regularity is 1 (a grid) and jittered /
        staggered as it falls toward 0 (an irregular net);
     5. HOLES — every non-stigma cell inset by half the local vein width along
        vein edges and by the margin border along outline edges; a cell whose
        inset is not a clean polygon at least `minCellMm` across is MERGED
        into the neighbour it shares the longest vein with (the vein between
        them is dropped) and the pass repeats; what still cannot be cut stays
        solid and says why.

   A chord that cannot be routed inside its cell (a concave outline between
   the root and a margin target, a falcate hook) is DROPPED and counted in
   `dropped`, never forced: the cells still tile. */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul2 = (a, s) => [a[0] * s, a[1] * s];
const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

/* Constants of the law (not controls — each says why). */
export const CROSS_MAX = 10;          // cross-veins per strip at density 1: a dragonfly net, ~2.5 mm cells on a 26 mm wing
export const MARGIN_TRIM = 0.06;      // the first and last 6% of the margin's arc get no vein target (angles from the root are tiny there)
export const BRANCH_AT = 0.45;        // a branching main vein forks at 45% of its stem
export const ROOT_SPREAD_LO = 0.1, ROOT_SPREAD_HI = 0.9;   // the main veins leave the root chord over its middle 80%
export const ROOT_ARC_TRIM = 0.14;    // the margin within 14% of the arc of either root corner gets no vein target: seen from the root it is a few degrees wide, and a target there is a stub to the margin beside the body
export const STIGMA_AT = 0.75;        // the pterostigma sits about 3/4 of the way out along the lead-most vein
export const MIN_CELL_MM_DEFAULT = 1.5; // smallest hole across that is cut cleanly (a declared guess: nothing here is printed)
const EPS = 1e-9;

/* ------------------------------------------------------------------ */
/* polygon helpers                                                      */
/* ------------------------------------------------------------------ */

export function polyArea(P) { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
export function pointInPoly(p, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[i], b = P[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
/* proper or touching intersection of two segments */
function segInter(p1, p2, p3, p4) {
  const d1 = orient(p3, p4, p1), d2 = orient(p3, p4, p2), d3 = orient(p1, p2, p3), d4 = orient(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  const on = (a, b, c) => Math.min(a[0], b[0]) - EPS <= c[0] && c[0] <= Math.max(a[0], b[0]) + EPS && Math.min(a[1], b[1]) - EPS <= c[1] && c[1] <= Math.max(a[1], b[1]) + EPS;
  if (d1 === 0 && on(p3, p4, p1)) return true;
  if (d2 === 0 && on(p3, p4, p2)) return true;
  if (d3 === 0 && on(p1, p2, p3)) return true;
  if (d4 === 0 && on(p1, p2, p4)) return true;
  return false;
}
export function polySimple(P) {
  const n = P.length;
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n];
    if (same(a, b)) return false;
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (segInter(a, b, P[j], P[(j + 1) % n])) return false;
    }
  }
  return true;
}
/* point p lies on segment ab (within tol of the line, inside its extent)? returns the parameter or null */
function onSegment(p, a, b, tol = 1e-7) {
  const ab = sub2(b, a), L = Math.hypot(ab[0], ab[1]);
  if (L < EPS) return null;
  const ap = sub2(p, a);
  if (Math.abs(cross2(ab, ap)) / L > tol) return null;
  const t = (ap[0] * ab[0] + ap[1] * ab[1]) / (L * L);
  if (t < -tol / L || t > 1 + tol / L) return null;
  return clamp(t, 0, 1);
}

/* ------------------------------------------------------------------ */
/* the cell set                                                         */
/* ------------------------------------------------------------------ */

/* A cell: { id, pts (CCW), edges[i] = tag of edge pts[i] -> pts[i+1] }.
   Tags: { kind: 'outline' | 'root' | 'vein', vein, width, tail }. */
class Cells {
  constructor() { this.list = []; this.next = 0; }
  add(pts, edges, role = 'cell') { const c = { id: this.next++, pts, edges, role }; this.list.push(c); return c; }
  remove(c) { this.list = this.list.filter((x) => x !== c); }
  /* insert point p on every cell edge that runs between a and b (either direction, exact endpoints) */
  insertOnEdge(p, a, b) {
    for (const c of this.list) {
      for (let i = 0; i < c.pts.length; i++) {
        const u = c.pts[i], v = c.pts[(i + 1) % c.pts.length];
        if ((same(u, a) && same(v, b)) || (same(u, b) && same(v, a))) {
          c.pts.splice(i + 1, 0, p); c.edges.splice(i + 1, 0, { ...c.edges[i] });
          break;
        }
      }
    }
  }
  /* the cell(s) whose boundary carries point p; returns [{cell, i, t}] (edge index, parameter) */
  edgesAt(p) {
    const out = [];
    for (const c of this.list) for (let i = 0; i < c.pts.length; i++) {
      const a = c.pts[i], b = c.pts[(i + 1) % c.pts.length];
      if (same(p, a)) { out.push({ cell: c, i, t: 0 }); continue; }
      if (same(p, b)) continue;                       // reported as t = 0 of the next edge
      const t = onSegment(p, a, b);
      if (t !== null && t > 0 && t < 1) out.push({ cell: c, i, t });
    }
    return out;
  }
}

/* Make p a VERTEX of every cell whose boundary it lies on (idempotent). */
function materialise(cells, p) {
  const hits = cells.edgesAt(p).filter((h) => h.t > 0);
  if (!hits.length) return;
  const h = hits[0], a = h.cell.pts[h.i], b = h.cell.pts[(h.i + 1) % h.cell.pts.length];
  cells.insertOnEdge(p, a, b);
}

/* Is the open polyline Q (ends on the boundary of cell c, both already vertices)
   strictly inside c? Every interior segment must avoid every boundary edge,
   except that the first and last segments may touch at their own endpoint. */
function chordInside(c, Q) {
  const n = c.pts.length;
  const iA = c.pts.findIndex((p) => same(p, Q[0])), iB = c.pts.findIndex((p) => same(p, Q[Q.length - 1]));
  if (iA < 0 || iB < 0 || iA === iB) return false;
  for (let k = 0; k + 1 < Q.length; k++) {
    const a = Q[k], b = Q[k + 1];
    if (dist2(a, b) < 1e-7) return false;
    for (let i = 0; i < n; i++) {
      const u = c.pts[i], v = c.pts[(i + 1) % n];
      const touchesA = k === 0 && (i === iA || (i + 1) % n === iA);
      const touchesB = k === Q.length - 2 && (i === iB || (i + 1) % n === iB);
      if (touchesA || touchesB) {
        // the chord's end sits on this edge's end; reject only a fold ALONG the edge or a crossing elsewhere
        const other = touchesA ? b : a, end = touchesA ? a : b;
        const far = same(u, end) ? v : u;
        if (orient(end, far, other) === 0 && ((far[0] - end[0]) * (other[0] - end[0]) + (far[1] - end[1]) * (other[1] - end[1])) > 0) return false;
        if (touchesA && touchesB) continue;
        continue;
      }
      if (segInter(a, b, u, v)) return false;
    }
    // interior points must be inside
    const m = lerp2(a, b, 0.5);
    if (!pointInPoly(m, c.pts)) return false;
  }
  // a chord between two vertices of the SAME edge run would be a zero-area cut
  return true;
}

/* Split cell c by chord Q (ends are vertices of c). Returns the two cells. */
function splitCell(cells, c, Q, tag) {
  const n = c.pts.length;
  const iA = c.pts.findIndex((p) => same(p, Q[0])), iB = c.pts.findIndex((p) => same(p, Q[Q.length - 1]));
  const walk = (from, to) => { const pts = [], edges = []; let i = from; while (i !== to) { pts.push(c.pts[i]); edges.push(c.edges[i]); i = (i + 1) % n; } pts.push(c.pts[to]); return { pts, edges }; };
  const inner = Q.slice(1, -1);
  // cell 1: A -> boundary forward -> B -> Q reversed -> A
  const w1 = walk(iA, iB);
  const pts1 = [...w1.pts, ...inner.slice().reverse()];
  const edges1 = [...w1.edges, ...Array(inner.length + 1).fill(0).map(() => ({ ...tag }))];
  // cell 2: B -> boundary forward -> A -> Q forward -> B
  const w2 = walk(iB, iA);
  const pts2 = [...w2.pts, ...inner];
  const edges2 = [...w2.edges, ...Array(inner.length + 1).fill(0).map(() => ({ ...tag }))];
  cells.remove(c);
  const c1 = cells.add(pts1, edges1, c.role), c2 = cells.add(pts2, edges2, c.role);
  return [c1, c2];
}

/* The cell carrying BOTH p and q on its boundary (p, q vertices or on edges). */
function cellWith(cells, p, q) {
  const A = cells.edgesAt(p).map((h) => h.cell), B = cells.edgesAt(q).map((h) => h.cell);
  return A.find((c) => B.includes(c)) || null;
}

/* Try to cut a vein from A to B through the cell that carries both; the
   candidate paths are tried in order (bowed, then straight); the first that
   lies inside wins. Returns the cell pair, or null if none routes. */
export const SNAP_MM = 0.1;    // a cut landing within this of an existing vertex takes that vertex: two vertices a few tens of microns apart (cross-vein feet from neighbouring strips) make sliver facets whose facing is noise (measured: 22-37 um pairs, needles on the top face, 3-edge contour loops in the SVG); 0.1 mm is a tenth of the floor and below print resolution
function snapTo(cells, p) {
  let best = null, bd = SNAP_MM;
  for (const c of cells.list) for (const q of c.pts) { const d = dist2(p, q); if (d < bd) { bd = d; best = q; } }
  return best || p;
}
function cut(cells, A, B, candidates, tag) {
  const A2 = snapTo(cells, A), B2 = snapTo(cells, B);
  if (A2 !== A || B2 !== B) {
    if (same(A2, B2)) return null;
    candidates = candidates.map((Q) => [A2, ...Q.slice(1, -1), B2]);
    A = A2; B = B2;
  }
  materialise(cells, A); materialise(cells, B);
  const c = cellWith(cells, A, B);
  if (!c || c.role === 'stigma') return null;           // the pterostigma is one cell by definition
  for (const Q of candidates) if (chordInside(c, Q)) return { cells: splitCell(cells, c, Q, tag), path: Q };
  return null;
}

/* ------------------------------------------------------------------ */
/* the margin: arc length, tangents, tail                               */
/* ------------------------------------------------------------------ */

function marginFrame(P) {
  // P: [R, p1, ..., pm] CCW; margin = p1..pm; cum arc from p1
  const m = P.length - 1, cum = [0];
  for (let i = 2; i <= m; i++) cum.push(cum[cum.length - 1] + dist2(P[i - 1], P[i]));
  const L = cum[cum.length - 1];
  const at = (s) => {                       // point on the margin at arc s, and the segment index
    s = clamp(s, 0, L);
    let j = 0; while (j + 1 < cum.length - 1 && cum[j + 1] < s) j++;
    const seg = cum[j + 1] - cum[j] || 1;
    return { p: lerp2(P[j + 1], P[j + 2], (s - cum[j]) / seg), seg: j + 1 };
  };
  return { L, cum, at };
}

/* deterministic jitter in [-0.5, 0.5) from integers */
function jit(...ks) {
  let h = 2166136261 >>> 0;
  for (const k of ks) { h ^= (k * 2654435761) >>> 0; h = Math.imul(h, 16777619) >>> 0; h ^= h >>> 13; }
  return (h >>> 0) / 4294967296 - 0.5;
}

/* ------------------------------------------------------------------ */
/* the plan                                                             */
/* ------------------------------------------------------------------ */

/* outline: the drawn planform in mm, CLOCKWISE from the root lead round the
   apex to the root trail (the builder's own `scalloped`), closed by the root
   chord; tailFlags[i] marks the outline samples that belong to the TAIL group.
   spec: veinCount, veinBranch, discal, discalSize, discalPos, crossDensity,
   cellRegularity, veinWidth, veinTaper, stigma, stigmaSize, marginBorder.
   opts: { minCellMm, holes (bool: compute the hole polygons) , seed }. */
export function planVenation(outline, tailFlags, spec, opts = {}) {
  const notes = [], dropped = { main: 0, cross: 0, discal: 0, stigma: 0 };
  // CCW with the root point R first: R, root trail, ... apex ..., root lead
  const ccw = outline.slice().reverse();
  const lead = ccw[ccw.length - 1], trail = ccw[0];
  // the fan's centre for ANGLES: the root chord's middle — or, under the
  // blended root (§12.1), the middle of the NECK, where every vein must pass
  const neck = opts.neck || null;
  const R = neck ? [neck.u, neck.c] : [0, (lead[1] + trail[1]) / 2];
  const flags = tailFlags ? tailFlags.slice().reverse() : null;
  const P = ccw;                                  // P[0] = root trail ... P[last] = root lead; the closing edge is the root chord
  const edges = [];
  for (let i = 0; i < P.length; i++) {
    const i1 = (i + 1) % P.length;
    if (i1 === 0) edges.push({ kind: 'root' });
    else edges.push({ kind: 'outline', tail: !!(flags && flags[i] && flags[i1]) });
  }
  /* Where each main vein LEAVES the base: K distinct points spread along the
     root chord from the trail toward the lead (ROOT_SPREAD of it, centred).
     One shared root point was built first: every cell at the base was then a
     wedge a few degrees wide, too thin to cut, and the merges that absorbed
     them snaked through the wing. A wing's veins emerge along its base. */
  const startAt = (s) => lerp2(trail, lead, s);
  const cells = new Cells();
  cells.add(P.map((q) => q.slice()), edges);
  const wingArea = polyArea(P);

  const w0 = spec.veinWidth, taper = clamp(spec.veinTaper, 0, 0.95);
  const widthAt = (t) => w0 * (1 - taper * clamp(t, 0, 1));
  const reg = clamp(spec.cellRegularity, 0, 1);
  const N = Math.max(1, Math.round(spec.veinCount)), B = Math.max(0, Math.round(spec.veinBranch));
  const K = N * (1 + B);
  const veins = [];
  let vid = 0;
  const addVein = (kind, path, tA, tB, extra = {}) => { const v = { id: vid++, kind, points: path.map((q) => q.slice()), width: [widthAt(tA), widthAt(tB)], t: [tA, tB], ...extra }; veins.push(v); return v; };

  /* 1. terminal targets by ANGLE from the root. Arc length was tried first and
     put the first and last targets a few percent of the arc from the root
     chord, which is a few DEGREES from the root point: the strips between
     those veins and the margin were slivers. Evenly spaced angles over the
     margin's angular extent fan the veins the way a wing does; each target is
     where the ray from R first leaves the planform (so a vein never crosses
     the outline on its way). The TAIL is reached separately: a ray from R
     toward the tail's tip exits through the trailing margin first, so the tail
     vein is a two-segment chord through the middle of the tail's own base. */
  const margin = P;
  const angOf = (q) => Math.atan2(q[1] - R[1], q[0] - R[0]);
  const trim = Math.round(margin.length * ROOT_ARC_TRIM);
  let aMin = Infinity, aMax = -Infinity;
  for (let i = trim; i < margin.length - trim; i++) { const a = angOf(margin[i]); aMin = Math.min(aMin, a); aMax = Math.max(aMax, a); }
  const exitAt = (ang) => {                 // first margin crossing of the ray from R at angle ang
    const dir = [Math.cos(ang), Math.sin(ang)];
    let best = null;
    for (let i = 0; i + 1 < P.length; i++) {
      const u = P[i], v = P[i + 1], e = sub2(v, u), den = cross2(dir, e);
      if (Math.abs(den) < 1e-12) continue;
      const d = sub2(u, R), t = cross2(d, e) / den, r = cross2(d, dir) / den;
      if (t > 1e-9 && r >= 0 && r <= 1 && (!best || t < best.t)) best = { t, p: lerp2(u, v, r) };
    }
    return best ? best.p : null;
  };
  const delta = (aMax - aMin) / K;
  const targets = [];
  for (let k = 0; k < K; k++) {
    const a = aMin + delta * (k + 0.5 + (1 - reg) * 0.3 * jit(k, 11));
    const q = exitAt(a);
    targets.push(q);
  }
  // the tail: its base chord (first and last tail samples) and its tip (the
  // tail sample farthest from the root)
  let tailPath = null;
  if (flags && flags.some(Boolean)) {
    const idx = []; for (let i = 0; i < P.length; i++) if (flags[i]) idx.push(i);
    let tip = idx[0]; for (const i of idx) if (dist2(P[i], R) > dist2(P[tip], R)) tip = i;
    const baseA = P[idx[0]], baseB = P[idx[idx.length - 1]], baseMid = lerp2(baseA, baseB, 0.5);
    const pull = lerp2(baseMid, R, 0.08);   // a little inside the wing, so the bend sits in the blade, not on the margin
    // the tail's MEDIAL line: the tail samples run base -> tip -> base, so the
    // midpoints of the j-th sample from each end walk up its middle. A tail is
    // a drawn curve and may bend (random:8 drips left then right and ends in
    // two lobes), so a straight run from the base to the tip leaves the
    // outline; the medial polyline is the candidate that stays inside it, and
    // chordInside still decides. Thinned to about one point per `step`.
    const n = idx.length, mids = [];
    for (let j = 1; j < Math.floor(n / 2); j++) mids.push(lerp2(P[idx[j]], P[idx[n - 1 - j]], 0.5));
    const step = Math.max(0.6, dist2(P[tip], baseMid) / 10), medial = [];
    for (const q of mids) if (!medial.length || dist2(q, medial[medial.length - 1]) >= step) medial.push(q);
    while (medial.length && dist2(medial[medial.length - 1], P[tip]) < step) medial.pop();
    tailPath = { via: pull, medial, tip: P[tip] };
  }
  /* terminal paths: path k = [R, (branch point), ..., tip]; built per main vein */
  const paths = [];                       // { pts, cum, L, divergeT, main }
  const pathAt = (pth, t) => { const s = clamp(t, 0, 1) * pth.L; let j = 0; while (j + 1 < pth.cum.length - 1 && pth.cum[j + 1] < s) j++; const seg = pth.cum[j + 1] - pth.cum[j] || 1; return lerp2(pth.pts[j], pth.pts[j + 1], (s - pth.cum[j]) / seg); };
  const finish = (pts) => { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist2(pts[i - 1], pts[i])); return { pts, cum, L: cum[cum.length - 1] }; };
  /* Every vein is a STRAIGHT chord (a bow is deferred — see the design doc:
     with the raster erosion below a bowed vein would cut fine, but a bow is a
     look Eva has not ruled on and it costs a sampled polyline per vein). */
  const candidatesTo = (A, B) => [[A, B]];
  for (let i = 0; i < N; i++) {
    const ks = Array.from({ length: 1 + B }, (_, j) => i * (1 + B) + j);
    const tips = ks.map((k) => targets[k]);
    if (tips.some((q) => !q)) { dropped.main += 1 + B; for (const _ of ks) paths.push(null); continue; }
    const fr = ROOT_SPREAD_LO + (ROOT_SPREAD_HI - ROOT_SPREAD_LO) * ((i + 0.5) / N);
    const S = startAt(fr);
    // under the blended root every vein runs through the NECK first, at the
    // same fraction across it (inside its middle 80%): a straight chord from
    // the root chord to a margin target would leave the wing at the neck
    const Nk = neck ? [neck.u, neck.c - 0.8 * neck.half + 1.6 * neck.half * ((i + 0.5) / N)] : null;
    const via = (A, B) => (Nk ? [[A, Nk, B], [A, B]] : candidatesTo(A, B));
    if (B === 0) {
      const r = cut(cells, S, tips[0], via(S, tips[0]), { kind: 'vein', width: widthAt(0.5), vein: vid });
      if (!r) { dropped.main++; paths.push(null); continue; }
      const v = addVein('main', r.path, 0, 1, { main: i, terminal: ks[0] });
      for (const e of r.cells.flatMap((c) => c.edges)) if (e.vein === v.id) e.width = v.width[0] * 0.5 + v.width[1] * 0.5;
      paths.push({ ...finish(r.path), divergeT: 0, main: i, vein: v.id, s: dist2(S, trail) });
      continue;
    }
    // stem to the branch point (toward the mean tip), then a branch to each tip
    const mean = tips.reduce((a, q) => add2(a, mul2(q, 1 / tips.length)), [0, 0]);
    const Bp = lerp2(Nk || S, mean, BRANCH_AT);
    const stemPts = Nk ? [S, Nk, Bp] : [S, Bp];
    // the stem is a chord only once the first branch reaches the margin: cut
    // stem + first branch as ONE chord, then the other branches from Bp
    let first = null;
    for (let j = 0; j < tips.length && !first; j++) {
      const cand = candidatesTo(Bp, tips[j]).map((q) => [...stemPts.slice(0, -1), ...q]);
      const r = cut(cells, S, tips[j], cand, { kind: 'vein', width: widthAt(0.5), vein: vid });
      if (r) first = { j, r };
    }
    if (!first) { dropped.main += 1 + B; for (const _ of ks) paths.push(null); continue; }
    const stemLen = stemPts.reduce((a, q, k) => (k ? a + dist2(stemPts[k - 1], q) : 0), 0);
    const stem = addVein('main', stemPts, 0, 0, { main: i });
    const fullLen = (p) => p.reduce((s, q, k) => (k ? s + dist2(p[k - 1], q) : 0), 0);
    const pathsHere = [];
    for (let j = 0; j < tips.length; j++) {
      let path;
      if (j === first.j) path = first.r.path;
      else {
        const r = cut(cells, Bp, tips[j], candidatesTo(Bp, tips[j]), { kind: 'vein', width: widthAt(0.7), vein: vid });
        if (!r) { dropped.main++; pathsHere.push(null); continue; }
        path = [...stemPts.slice(0, -1), ...r.path];
      }
      const Lp = fullLen(path), tDiv = stemLen / Lp;
      const bv = addVein('branch', path.slice(stemPts.length - 1), tDiv, 1, { main: i, terminal: ks[j] });
      stem.width = [widthAt(0), widthAt(tDiv)]; stem.t = [0, tDiv];
      pathsHere.push({ ...finish(path), divergeT: tDiv, main: i, vein: bv.id, s: dist2(S, trail) });
    }
    // edge widths: the stem's edges carry the stem's mean width, each branch its own
    for (const c of cells.list) for (let e = 0; e < c.edges.length; e++) {
      const a = c.pts[e], b = c.pts[(e + 1) % c.pts.length];
      if (c.edges[e].kind !== 'vein') continue;
      const onSeg = (q) => stemPts.some((_, k) => k > 0 && onSegment(q, stemPts[k - 1], stemPts[k]) !== null);
      const onStem = onSeg(a) && onSeg(b);
      if (onStem) { c.edges[e].width = (stem.width[0] + stem.width[1]) / 2; c.edges[e].vein = stem.id; }
    }
    paths.push(...pathsHere);
  }
  // the tail vein: R -> inside the tail's base -> the tail's tip, straight on
  // from a corner that must sit inside the blade
  if (tailPath) {
    // the cell the tip lies in; the vein leaves from that cell's own point on
    // the root chord (nearest the tail), or, if the cell does not reach the
    // root, from its vertex nearest the tail's base (a vein already there)
    materialise(cells, tailPath.tip);
    const host = (cells.edgesAt(tailPath.tip)[0] || {}).cell;
    let r = null, start = null;
    if (host) {
      const onRoot = host.pts.filter((q, i) => host.edges[i].kind === 'root' || host.edges[(i + host.pts.length - 1) % host.pts.length].kind === 'root');
      // waypoints the host cell actually contains: when the lowest main vein
      // runs close to the trailing margin the tail's base straddles it and
      // `via` (and the first medial points) sit in the NEXT cell over
      // (random:8), so a route through them can never be inside the host
      const inHost = [tailPath.via, ...tailPath.medial].filter((q) => pointInPoly(q, host.pts));
      const aim = inHost[0] || tailPath.via;
      // root vertices first (a tail vein leaving the base, like every main
      // vein), then any other vertex of the host nearest the first waypoint —
      // a vein that branches off the one already there
      const others = host.pts.filter((q) => !same(q, tailPath.tip) && !onRoot.includes(q)).sort((a, b) => dist2(a, aim) - dist2(b, aim));
      const starts = [...onRoot.slice().sort((a, b) => dist2(a, aim) - dist2(b, aim)), ...others];
      for (const S of starts) {
        r = cut(cells, S, tailPath.tip, [[S, tailPath.via, ...tailPath.medial, tailPath.tip], [S, tailPath.via, tailPath.tip], [S, ...inHost, tailPath.tip], [S, tailPath.tip]], { kind: 'vein', width: widthAt(0.5), vein: vid });
        if (r) { start = S; break; }
      }
    }
    if (r) { const v = addVein('main', r.path, 0, 1, { main: N, terminal: K, tail: true }); paths.push({ ...finish(r.path), divergeT: 0, main: N, vein: v.id, tail: true, s: onSegment(start, trail, lead) !== null ? dist2(start, trail) : 1e9 }); }
    else { dropped.main++; paths.push(null); notes.push('the tail vein could not be routed into the tail'); }
  }
  // per-edge widths for every vein edge from its own path's t (one law: taper by arc fraction)
  const tOn = (q) => { let best = null; for (const pth of paths) { if (!pth) continue; for (let i = 0; i + 1 < pth.pts.length; i++) { const t = onSegment(q, pth.pts[i], pth.pts[i + 1]); if (t !== null) { const s = pth.cum[i] + t * (pth.cum[i + 1] - pth.cum[i]); const tt = s / pth.L; if (best === null || tt < best) best = tt; } } } return best; };
  // strips run trail -> lead in the order the veins leave the base
  const live = paths.map((p, k) => (p ? k : -1)).filter((k) => k >= 0).sort((x, y) => paths[x].s - paths[y].s);

  /* 2. the discal cell */
  let discalCell = null;
  if (spec.discal >= 0.5 && live.length >= 2) {
    const pos = clamp(spec.discalPos, 0, 1);
    // the boundary between two MAIN veins nearest `pos`, so the discal spans a whole strip
    let best = -1, bd = Infinity;
    for (let q = 0; q + 1 < live.length; q++) {
      const ka = live[q], kb = live[q + 1];
      const x = (q + 0.5) / (live.length - 1);
      const sameMain = paths[ka].main === paths[kb].main;
      const d = Math.abs(x - pos) + (sameMain ? 0.5 : 0);     // prefer a strip between two different main veins
      if (d < bd) { bd = d; best = q; }
    }
    const ka = live[best], kb = live[best + 1];
    const t = clamp(spec.discalSize, 0.15, 0.95);
    const tA = Math.max(t, paths[ka].divergeT + 0.05), tB = Math.max(t, paths[kb].divergeT + 0.05);
    const A = pathAt(paths[ka], tA), Bq = pathAt(paths[kb], tB);
    const r = cut(cells, A, Bq, [[A, Bq]], { kind: 'vein', width: widthAt((tA + tB) / 2), vein: vid });
    if (r) {
      addVein('discal', r.path, tA, tB, { strip: [ka, kb] });
      // the root-side cell of the two is the discal cell: it carries R or the stem
      const rootSide = r.cells.find((c) => c.edges.some((e) => e.kind === 'root')) || r.cells.reduce((a, c) => (polyArea(c.pts) < polyArea(a.pts) ? c : a));
      rootSide.role = 'discal'; discalCell = rootSide;
      paths[ka].crossFrom = tA; paths[kb].crossFrom = tB;   // no cross-vein below the discocellular on either path
      paths[ka].discalStrip = kb;
    } else dropped.discal++;
  }

  /* 3. the pterostigma: between the lead-most path and the leading margin */
  let stigmaCell = null;
  const rayToMargin = (c, A, dirs) => {
    // first boundary hit along dir from A, excluding the edges at A; landing on an outline edge only
    for (const dir of dirs) {
      let best = null;
      for (let i = 0; i < c.pts.length; i++) {
        const u = c.pts[i], v = c.pts[(i + 1) % c.pts.length];
        if (same(u, A) || same(v, A)) continue;
        const e = sub2(v, u), den = cross2(dir, e);
        if (Math.abs(den) < 1e-12) continue;
        const d = sub2(u, A), s = cross2(d, e) / den, r = cross2(d, dir) / den;
        if (s > 1e-7 && r >= 0 && r <= 1 && (!best || s < best.s)) best = { s, i, r, p: lerp2(u, v, r) };
      }
      if (best && c.edges[best.i].kind === 'outline' && best.r > 1e-6 && best.r < 1 - 1e-6) return best.p;
    }
    return null;
  };
  const perp = (pth, t) => { const a = pathAt(pth, Math.max(0, t - 0.01)), b = pathAt(pth, Math.min(1, t + 0.01)); const d = sub2(b, a), L = Math.hypot(d[0], d[1]) || 1; return [[-d[1] / L, d[0] / L], [d[1] / L, -d[0] / L]]; };
  const outerCut = (k, t, role) => {
    const pth = paths[k]; const A = pathAt(pth, t);
    materialise(cells, A);
    const hits = cells.edgesAt(A);
    for (const h of hits) {
      const c = h.cell;
      const Bq = rayToMargin(c, A, perp(pth, t));
      if (!Bq) continue;
      const r = cut(cells, A, Bq, [[A, Bq]], { kind: 'vein', width: widthAt(t), vein: vid });
      if (r) { addVein(role, r.path, t, t, { strip: [k, 'margin'] }); return r; }
    }
    return null;
  };
  if (spec.stigma >= 0.5 && live.length) {
    const k = live[live.length - 1], pth = paths[k];
    const half = clamp(spec.stigmaSize, 0.03, 0.4) / 2;
    const t0 = clamp(STIGMA_AT - half, pth.divergeT + 0.05, 0.95), t1 = clamp(STIGMA_AT + half, t0 + 0.02, 0.98);
    const r0 = outerCut(k, t0, 'stigma'), r1 = r0 && outerCut(k, t1, 'stigma');
    if (r0 && r1) {
      // the stigma: the cell between the two chords — it carries both chord feet on the path
      const a = pathAt(pth, t0), b = pathAt(pth, t1);
      stigmaCell = cells.list.find((c) => c.pts.some((p) => same(p, a)) && c.pts.some((p) => same(p, b)) && !c.edges.some((e) => e.kind === 'root') && c.edges.some((e) => e.kind === 'outline'));
      if (stigmaCell) { stigmaCell.role = 'stigma'; pth.stigmaT = [t0, t1]; }
      else dropped.stigma++;
    } else dropped.stigma++;
  }

  /* 4. cross-veins */
  const nCross = Math.round(clamp(spec.crossDensity, 0, 1) * CROSS_MAX);
  let crossMade = 0;
  if (nCross > 0) {
    const strips = [];
    for (let q = 0; q + 1 < live.length; q++) strips.push([live[q], live[q + 1]]);
    for (let q = 0; q < live.length; q++) {
      const k = live[q];
      if (q === 0) strips.push([k, 'trail']);
      if (q === live.length - 1) strips.push([k, 'lead']);
    }
    strips.forEach(([ka, kb], si) => {
      const A = paths[ka], Bp = typeof kb === 'number' ? paths[kb] : null;
      // an outer strip (vein to margin) is a wedge at the root: its cross-veins start at a quarter of the way out
      const tMin = Math.max(Bp ? Math.max(A.divergeT, Bp.divergeT) : Math.max(A.divergeT, 0.25), A.crossFrom && A.discalStrip === kb ? A.crossFrom : 0, Bp && Bp.crossFrom && A.discalStrip === kb ? Bp.crossFrom : 0) + 0.02;
      const stagger = (1 - reg) * 0.5 * (si % 2);
      for (let j = 0; j < nCross; j++) {
        const base = (j + 1 + stagger) / (nCross + 1);
        const t = tMin + (0.97 - tMin) * base;
        if (t >= 0.97) continue;
        const step = (0.97 - tMin) / (nCross + 1);
        const tA = clamp(t + (1 - reg) * 0.8 * step * jit(si, j, 1), tMin, 0.97);
        if (Bp) {
          const tB = clamp(t + (1 - reg) * 0.8 * step * jit(si, j, 2), tMin, 0.97);
          // skip the stigma's own stretch on the lead-most path
          if (Bp.stigmaT && tB > Bp.stigmaT[0] - 0.02 && tB < Bp.stigmaT[1] + 0.02) continue;
          if (A.stigmaT && tA > A.stigmaT[0] - 0.02 && tA < A.stigmaT[1] + 0.02) continue;
          const pa = pathAt(A, tA), pb = pathAt(Bp, tB);
          const r = cut(cells, pa, pb, [[pa, pb]], { kind: 'vein', width: widthAt((tA + tB) / 2), vein: vid });
          if (r) { addVein('cross', r.path, tA, tB, { strip: [ka, kb] }); crossMade++; } else dropped.cross++;
        } else {
          if (A.stigmaT && kb === 'lead' && tA > A.stigmaT[0] - 0.02 && tA < A.stigmaT[1] + 0.02) continue;
          if (outerCut(ka, tA, 'cross')) crossMade++; else dropped.cross++;
        }
      }
    });
  }

  /* every vein edge's width from its own position along its path */
  for (const c of cells.list) for (let e = 0; e < c.edges.length; e++) {
    if (c.edges[e].kind !== 'vein') continue;
    const a = c.pts[e], b = c.pts[(e + 1) % c.pts.length];
    const ta = tOn(a), tb = tOn(b);
    if (ta !== null && tb !== null) c.edges[e].width = widthAt((ta + tb) / 2);
  }

  /* tiling, measured on the record itself */
  const cellAreaSum = cells.list.reduce((s, c) => s + polyArea(c.pts), 0);

  const chordPts = [];
  for (const c of cells.list) for (const q of c.pts) if (onSegment(q, trail, lead) !== null && !chordPts.some((x) => same(x, q))) chordPts.push(q.slice());
  chordPts.sort((a, b) => a[1] - b[1]);
  const out = {
    frame: 'planform mm: u along the span from the root chord, w along the chord (+ toward the head); the wing transform places it',
    rootChord: chordPts,          // every vertex on the root chord, trail -> lead (the vein starts between the two corners); the root tab fans over them
    outline: P.map((q) => q.slice()),
    veins,
    cells: cells.list.map((c) => ({ id: c.id, role: c.role, points: c.pts.map((q) => q.slice()), edges: c.edges.map((e) => ({ ...e })), holes: [], holeReason: null, mergedFrom: [] })),
    stats: { terminals: K, mainMade: live.length, crossMade, dropped, cells: cells.list.length, discal: !!discalCell, stigma: !!stigmaCell, wingArea, cellAreaSum, tailTargeted: !!(tailPath && paths.some((q) => q && q.tail)) },
    notes,
  };
  if (dropped.main) notes.push(`${dropped.main} vein${dropped.main > 1 ? 's' : ''} could not be routed inside the outline and ${dropped.main > 1 ? 'were' : 'was'} dropped`);
  if (opts.holes) planHoles(out, opts.minCellMm ?? MIN_CELL_MM_DEFAULT, spec.marginBorder);
  return out;
}

/* ------------------------------------------------------------------ */
/* HOLES: inset every cell; merge what cannot be cut                    */
/* ------------------------------------------------------------------ */

/* The HOLE(S) of one cell: the cell eroded by half the vein width along each
   vein edge and by the margin border along each outline / root edge — a true
   erosion of an arbitrary simple polygon (a merged cell is not convex), done
   on a raster at HOLE_PX: each edge paints a band of its own radius plus one
   pixel (so the hole stands AT LEAST its distance from every edge, never
   less), the remainder of the cell's interior is the hole, each 4-connected
   component is traced by marching squares and simplified, and a component too
   small for a `minCellMm` disc is dropped. A kernel inset (the intersection of
   half-planes) was tried first and is exact for a convex cell only: the
   merged cells it produced were concave and their kernels collapsed, so every
   merge failed again and the whole wing merged into one solid cell. */
export const HOLE_PX = 0.05;   // the cut-safe SVG's own raster pitch
export function erodeCell(points, edges, border, minCellMm, outline = null, px = HOLE_PX) {
  const d = edges.map((e) => (e.kind === 'vein' ? e.width / 2 : border) + 1.5 * px);   // 1.5 px: one for the raster, half for the simplification's own tolerance below
  // the border holds against the WHOLE wing outline, not only this cell's own
  // outline edges: at a vein's tip the next cell's margin is just across the
  // vein, nearer than the border (measured 0.83 mm against a 1.00 border)
  const bands = points.map((q, i) => [q, points[(i + 1) % points.length], d[i]]);
  if (outline) for (let i = 0; i < outline.length; i++) bands.push([outline[i], outline[(i + 1) % outline.length], border + 1.5 * px]);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of points) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const pad = 2, nx = Math.ceil((x1 - x0) / px) + 2 * pad, ny = Math.ceil((y1 - y0) / px) + 2 * pad;
  if (nx * ny > 4e6) return [];
  const gx = x0 - pad * px, gy = y0 - pad * px;
  const hole = new Uint8Array(nx * ny);
  // inside, by even-odd scanline at pixel centres
  for (let j = 0; j < ny; j++) {
    const yc = gy + (j + 0.5) * px, xs = [];
    for (let i = 0; i < points.length; i++) { const a = points[i], b = points[(i + 1) % points.length]; if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k] - gx) / px - 0.5)), i1 = Math.min(nx - 1, Math.floor((xs[k + 1] - gx) / px - 0.5));
      for (let i = i0; i <= i1; i++) hole[j * nx + i] = 1;
    }
  }
  // each edge's band
  for (const [a, b, r] of bands) {
    const r2 = r * r;
    const ab = sub2(b, a), L2 = ab[0] * ab[0] + ab[1] * ab[1] || 1e-18;
    const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - r - gx) / px)), i1 = Math.min(nx - 1, Math.ceil((Math.max(a[0], b[0]) + r - gx) / px));
    const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - r - gy) / px)), j1 = Math.min(ny - 1, Math.ceil((Math.max(a[1], b[1]) + r - gy) / px));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * nx + i; if (!hole[k]) continue;
      const x = gx + (i + 0.5) * px, y = gy + (j + 0.5) * px;
      const t = clamp(((x - a[0]) * ab[0] + (y - a[1]) * ab[1]) / L2, 0, 1);
      const dx = x - a[0] - t * ab[0], dy = y - a[1] - t * ab[1];
      if (dx * dx + dy * dy < r2) hole[k] = 0;
    }
  }
  // components
  const lab = new Int32Array(nx * ny), q = new Int32Array(nx * ny);
  let comps = 0; const sizes = [];
  for (let s0 = 0; s0 < hole.length; s0++) {
    if (!hole[s0] || lab[s0]) continue;
    comps++; let h = 0, t = 0; q[t++] = s0; lab[s0] = comps;
    while (h < t) { const c = q[h++], ci = c % nx; for (const m of [ci > 0 ? c - 1 : -1, ci < nx - 1 ? c + 1 : -1, c - nx, c + nx]) if (m >= 0 && m < hole.length && hole[m] && !lab[m]) { lab[m] = comps; q[t++] = m; } }
    sizes.push(t);
  }
  // ONE hole per cell: if the erosion leaves several components, the material
  // between them is a bridge narrower than the bands that made it — under the
  // floor — so only the largest component is cut and the rest stays solid
  // (the gate's V2 measured two components of one cell 0.47 mm apart).
  let big = 0; for (let c = 1; c <= comps; c++) if (sizes[c - 1] > sizes[big - 1] || !big) big = c;
  const out = [];
  for (let c = 1; c <= comps; c++) {
    if (c !== big) continue;
    if (sizes[c - 1] * px * px < 0.5 * minCellMm * minCellMm) continue;   // cannot hold the disc
    const mask = new Uint8Array(nx * ny); for (let k = 0; k < mask.length; k++) mask[k] = lab[k] === c ? 1 : 0;
    const loops = traceMask(mask, nx, ny, (i) => gx + (i + 0.5) * px, (j) => gy + (j + 0.5) * px);
    if (!loops.length) continue;
    let L = loops.reduce((a, l) => (Math.abs(polyArea(l)) > Math.abs(polyArea(a)) ? l : a));
    if (polyArea(L) < 0) L = L.slice().reverse();
    // simplify at just over a pixel (the stair-steps of a raster contour are
    // half a pixel high), backing off until the result is simple
    let poly = L;
    for (const tol of [1.2, 0.8, 0.5, 0.3]) { const simp = simplifyLoop(L, tol * px); if (simp.length >= 3 && polySimple(simp)) { poly = simp; break; } }
    const dd = []; for (const q of poly) if (!dd.length || dist2(q, dd[dd.length - 1]) >= SNAP_MM) dd.push(q);
    while (dd.length > 3 && dist2(dd[0], dd[dd.length - 1]) < SNAP_MM) dd.pop();
    poly = dd;
    if (poly.length < 3 || inscribedDiameter(poly) < minCellMm) continue;
    if (!poly.every((v) => pointInPoly(v, points))) continue;
    out.push(poly);
  }
  return out;
}

/* marching squares over pixel centres (4-connectivity), loops as [x, y] lists */
function traceMask(g, nx, ny, cx, cy) {
  const pt = new Map(), adj = new Map();
  const node = (id, xy) => { if (!pt.has(id)) { pt.set(id, xy); adj.set(id, []); } return id; };
  const link = (a, b) => { adj.get(a).push(b); adj.get(b).push(a); };
  const at = (i, j) => (i < 0 || j < 0 || i >= nx || j >= ny ? 0 : g[j * nx + i]);
  for (let j = -1; j < ny; j++) for (let i = -1; i < nx; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    const code = a | (b << 1) | (c << 2) | (d << 3);
    if (code === 0 || code === 15) continue;
    const B = () => node(`h${i},${j}`, [(cx(i) + cx(i + 1)) / 2, cy(j)]);
    const T = () => node(`h${i},${j + 1}`, [(cx(i) + cx(i + 1)) / 2, cy(j + 1)]);
    const Lf = () => node(`v${i},${j}`, [cx(i), (cy(j) + cy(j + 1)) / 2]);
    const Rt = () => node(`v${i + 1},${j}`, [cx(i + 1), (cy(j) + cy(j + 1)) / 2]);
    switch (code) {
      case 1: case 14: link(Lf(), B()); break;
      case 2: case 13: link(B(), Rt()); break;
      case 3: case 12: link(Lf(), Rt()); break;
      case 4: case 11: link(Rt(), T()); break;
      case 6: case 9: link(B(), T()); break;
      case 7: case 8: link(Lf(), T()); break;
      case 5: link(Lf(), B()); link(Rt(), T()); break;
      case 10: link(B(), Rt()); link(Lf(), T()); break;
    }
  }
  const used = new Set(), out = [];
  for (const start of adj.keys()) {
    if (used.has(start)) continue;
    const loop = []; let prev = null, cur = start;
    for (let guard = 0; guard < 1e6; guard++) {
      used.add(cur); loop.push(pt.get(cur));
      const nb = adj.get(cur).find((n) => n !== prev && !used.has(n));
      if (nb === undefined) break;
      prev = cur; cur = nb;
    }
    if (loop.length >= 3) out.push(loop);
  }
  return out;
}
function rdp(pts, tol) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-12;
  let best = -1, bi = 0;
  for (let i = 1; i < pts.length - 1; i++) { const [x, y] = pts[i]; const t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1); const dd = Math.hypot(x - ax - t * dx, y - ay - t * dy); if (dd > best) { best = dd; bi = i; } }
  if (best <= tol) return [pts[0], pts[pts.length - 1]];
  return rdp(pts.slice(0, bi + 1), tol).slice(0, -1).concat(rdp(pts.slice(bi), tol));
}
function simplifyLoop(loop, tol) {
  if (loop.length < 8) return loop;
  let far = 0, fd = -1;
  for (let i = 1; i < loop.length; i++) { const dd = dist2(loop[i], loop[0]); if (dd > fd) { fd = dd; far = i; } }
  const a = rdp(loop.slice(0, far + 1), tol), b = rdp(loop.slice(far).concat([loop[0]]), tol);
  return a.slice(0, -1).concat(b.slice(0, -1));
}

/* Bridge every hole into the outer loop (the ear-clipping bridge: from each
   hole's rightmost vertex along +x to the outer boundary, to the visible
   endpoint or the reflex vertex inside the triangle it makes). Holes are
   taken rightmost first, each bridged into the loop the previous ones made,
   and traversed CLOCKWISE so the result is one weakly simple CCW polygon the
   ear clipper can triangulate with every vertex kept. Returns the vertex list
   (duplicated bridge endpoints and all), or null if a bridge cannot be found. */
export function bridgeHoles(outer, holes) {
  let poly = outer.map((q) => q.slice());
  const hs = holes.map((h) => { let mi = 0; for (let i = 1; i < h.length; i++) if (h[i][0] > h[mi][0]) mi = i; return { h, mi }; }).sort((p, q) => q.h[q.mi][0] - p.h[p.mi][0]);
  for (const { h, mi } of hs) {
    const Mp = h[mi];
    // the outer edge the +x ray meets first
    let best = null;
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length];
      if ((a[1] > Mp[1]) === (b[1] > Mp[1])) continue;
      const x = a[0] + ((Mp[1] - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
      if (x >= Mp[0] - EPS && (!best || x < best.x)) best = { x, k, a, b };
    }
    if (!best) return null;
    const I = [best.x, Mp[1]];
    let pk = best.a[0] > best.b[0] ? best.k : (best.k + 1) % poly.length;
    let Pp = poly[pk];
    // a reflex outer vertex inside triangle (M, I, P) blocks the bridge: take the one with the smallest angle to the ray, nearest on a tie
    const inTri = (q) => { const o1 = orient(Mp, I, q), o2 = orient(I, Pp, q), o3 = orient(Pp, Mp, q); return (o1 >= 0 && o2 >= 0 && o3 >= 0) || (o1 <= 0 && o2 <= 0 && o3 <= 0); };
    let bt = Infinity, bd = Infinity, bi = -1;
    for (let k = 0; k < poly.length; k++) {
      const q = poly[k];
      if (k === pk || same(q, Pp) || same(q, Mp)) continue;
      const prev = poly[(k + poly.length - 1) % poly.length], next = poly[(k + 1) % poly.length];
      if (orient(prev, q, next) >= 0) continue;       // convex: cannot block
      if (q[0] < Mp[0] || !inTri(q)) continue;
      const tan = Math.abs(q[1] - Mp[1]) / Math.max(1e-12, q[0] - Mp[0]), dd = dist2(q, Mp);
      if (tan < bt || (tan === bt && dd < bd)) { bt = tan; bd = dd; bi = k; }
    }
    if (bi >= 0) { pk = bi; Pp = poly[pk]; }
    const cw = h.slice().reverse();                        // hole clockwise
    const start = cw.length - 1 - mi;                      // where M sits in the reversed loop
    const ring = [];
    for (let i = 0; i <= cw.length; i++) ring.push(cw[(start + i) % cw.length].slice());   // M ... back to M
    poly = [...poly.slice(0, pk + 1), ...ring, Pp.slice(), ...poly.slice(pk + 1)];
  }
  return poly;
}

/* The largest disc that fits a polygon, approximately: 2 x the greatest
   distance from any of a grid of interior sample points to the boundary. */
export function inscribedDiameter(P, samples = 9) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const segD = (p) => { let d = Infinity; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; const ab = sub2(b, a), L2 = ab[0] * ab[0] + ab[1] * ab[1] || 1e-12; const t = clamp(((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2, 0, 1); d = Math.min(d, dist2(p, lerp2(a, b, t))); } return d; };
  let best = 0;
  const cx = P.reduce((s, q) => s + q[0], 0) / P.length, cy = P.reduce((s, q) => s + q[1], 0) / P.length;
  if (pointInPoly([cx, cy], P)) best = segD([cx, cy]);
  for (let j = 0; j < samples; j++) for (let i = 0; i < samples; i++) {
    const p = [x0 + ((i + 0.5) / samples) * (x1 - x0), y0 + ((j + 0.5) / samples) * (y1 - y0)];
    if (pointInPoly(p, P)) best = Math.max(best, segD(p));
  }
  return 2 * best;
}

/* Union of two cells that share a contiguous run of edges: the shared run is
   dropped and the two boundaries are joined. Null if they share nothing, or
   share two separate runs (the union would have a hole). */
function unionCells(a, b) {
  const n = a.pts.length, m = b.pts.length;
  const sharedA = [];
  for (let i = 0; i < n; i++) {
    const u = a.pts[i], v = a.pts[(i + 1) % n];
    for (let j = 0; j < m; j++) if (same(b.pts[j], v) && same(b.pts[(j + 1) % m], u)) sharedA.push(i);
  }
  if (!sharedA.length) return null;
  // the shared edges must be ONE contiguous run in a (cyclically)
  const S = new Set(sharedA);
  let start = sharedA.find((i) => !S.has((i + n - 1) % n));
  if (start === undefined) return null;   // a shares every edge with b?!
  let run = 0; for (let i = start; S.has(i); i = (i + 1) % n) run++;
  if (run !== sharedA.length) return null;
  const endA = (start + run) % n;           // first a-edge after the run: starts at vertex endA
  // walk a from endA round to start (the vertex where the run begins)
  const pts = [], edges = [];
  for (let i = endA; i !== start; i = (i + 1) % n) { pts.push(a.pts[i]); edges.push(a.edges[i]); }
  pts.push(a.pts[start]); // the run's first vertex; now continue along b from its matching vertex
  // in b, the run appears reversed: b's vertex equal to a.pts[start] ends b's run
  const jb = b.pts.findIndex((q) => same(q, a.pts[start]));
  // walk b forward from jb until we reach a.pts[endA]
  let j = jb, guard = 0;
  while (!same(b.pts[j], a.pts[endA]) && guard++ < m + 1) { edges.push(b.edges[j]); j = (j + 1) % m; if (!same(b.pts[j], a.pts[endA])) pts.push(b.pts[j]); }
  if (guard > m) return null;
  if (!polySimple(pts) || !(polyArea(pts) > 0)) return null;
  return { pts, edges };
}

export function planHoles(plan, minCellMm, border) {
  const cells = plan.cells;
  const tryHole = (c) => {
    if (c.role === 'stigma') { c.holes = []; c.holeReason = 'stigma'; return true; }
    const hs = erodeCell(c.points, c.edges, border, minCellMm, plan.outline);
    if (!hs.length) { c.holes = []; c.holeReason = 'too-small'; return false; }
    c.holes = hs; c.holeReason = 'cut'; return true;
  };
  for (const c of cells) tryHole(c);
  // merge passes: a cell that cannot be cut joins the neighbour it shares the
  // longest vein with; the vein between them is dropped; the union is retried
  let merged = 0;
  for (let pass = 0; pass < 200; pass++) {
    const bad = cells.find((c) => c.holeReason === 'too-small');
    if (!bad) break;
    // the neighbour whose UNION with it is the most compact (4 pi A / P^2):
    // the longest shared edge was tried first and glued a base wedge to the
    // side of the big cell beside it, whose hole then ran as a snake along
    // the wedge; compactness merges base wedges with each other first
    let bestN = null, bestU = null, bestQ = -1;
    const seen = new Set();
    for (let i = 0; i < bad.points.length; i++) {
      if (bad.edges[i].kind !== 'vein') continue;
      const u = bad.points[i], v = bad.points[(i + 1) % bad.points.length];
      const nb = cells.find((c) => c !== bad && c.role !== 'stigma' && c.points.some((p, j) => same(p, v) && same(c.points[(j + 1) % c.points.length], u)));
      if (!nb || seen.has(nb)) continue;
      seen.add(nb);
      const un = unionCells({ pts: bad.points, edges: bad.edges }, { pts: nb.points, edges: nb.edges });
      if (!un) continue;
      let per = 0; for (let k = 0; k < un.pts.length; k++) per += dist2(un.pts[k], un.pts[(k + 1) % un.pts.length]);
      const q = (4 * Math.PI * polyArea(un.pts)) / (per * per);
      if (q > bestQ) { bestQ = q; bestN = nb; bestU = un; }
    }
    if (!bestN) { bad.holeReason = 'solid'; continue; }
    const u = bestU;
    const keep = bestN;
    keep.points = u.pts; keep.edges = u.edges; keep.mergedFrom = [...keep.mergedFrom, bad.id, ...bad.mergedFrom];
    if (bad.role === 'discal') keep.role = 'discal';
    cells.splice(cells.indexOf(bad), 1);
    merged++;
    tryHole(keep);
  }
  // the veins the merges removed: a vein edge no cell carries any more
  const carried = new Set();
  for (const c of cells) for (const e of c.edges) if (e.kind === 'vein') carried.add(e.vein);
  for (const v of plan.veins) if (!carried.has(v.id)) v.dropped = true;
  plan.stats.merged = merged;
  plan.stats.holes = cells.reduce((n, c) => n + c.holes.length, 0);
  plan.stats.solidCells = cells.filter((c) => !c.holes.length).length;
  plan.stats.minCellMm = minCellMm;
  plan.stats.cellAreaSum = cells.reduce((s, c) => s + polyArea(c.points), 0);
  return plan;
}
