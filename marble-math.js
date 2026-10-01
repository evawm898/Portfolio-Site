/* marble-math.js — the /marble page's engine: mathematical marbling.

   Every ink region on the sheet is a closed polygon, and every tool is a point
   function of the plane — the closed-form deformations of the mathematical-
   marbling literature (Jaffer, "Mathematical Marbling"; Lu, Jin, Wang et al.,
   IEEE CG&A 2012). Applying a tool means mapping every vertex of every region
   through that function, inserting vertices wherever a mapped edge stretched
   past MAX_SEG (bisecting the SOURCE edge and mapping the midpoint, so the
   inserted vertex lies on the true image curve rather than on a chord), and
   pruning vertices that have become collinear and close. Nothing here reads a
   canvas; the page draws what this module holds and the gate drives it in Node.

   THE FOUR TRANSFORMS, in sheet units, with u = 2^(-1/c) so the shift HALVES
   every c units of distance (c is the falloff; z the maximum shift):

     drop   (C, r):            P' = C + (P - C) · sqrt(1 + r² / |P - C|²)
                               and a new disc of radius r at C is painted on top.
     tine   (B, M, z, c):      P' = P + z · u^|d| · M,   d = (P - B) · N,
                               M the unit stroke direction, N its left normal.
     wavy   (B, M, z, c, A, L, φ):  as the tine with
                               d = (P - B) · N  -  A · sin(2π (P - B) · M / L + φ),
                               so the full shift lies on the sine curve, not the line.
     stir   (C, r, z, c):      P' = C + R(θ)(P - C),  θ = z · u^| |P-C| - r | / |P - C|
                               — a circular tine line: arc-length shift z on the ring.

   A comb is n tines parallel to the stroke, spaced s apart, centred on it; a
   STRAIGHT comb composes EXACTLY as a sum (d is invariant under a shift along M),
   a wavy one is applied tine by tine. The hash codec is here too: an op list is a
   string and a string is an op list, numbers rounded to one decimal AT COMMIT so
   what the page applied is what the link replays — bit for bit. */

export const SHEET = Object.freeze({ w: 1000, h: 1250 });   // logical sheet, 4:5 portrait
export const FORMAT_VERSION = 'v1';
export const MAX_SEG = 2.5;        // longest mapped edge before a midpoint is inserted (sheet units)
export const MIN_SEG = 0.6;        // an edge shorter than this is a pruning candidate
export const PRUNE_TOL = 0.12;     // ...and is pruned when its vertex sits this close to the chord
export const REFINE_DEPTH = 8;     // one source edge splits at most 2^8 ways
export const POINT_BUDGET = 300000; // past this many vertices the sheet is simplified toward it (told, never silent)
export const DROP_MIN_SIDES = 32;
const LN2 = Math.LN2;

/* ---------------- the point functions (closed form) ---------------- */
export function dropPoint(x, y, cx, cy, r) {
  const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
  if (d2 < 1e-24) return [cx, cy];           // the centre is the one undefined point; hold it
  const f = Math.sqrt(1 + (r * r) / d2);
  return [cx + dx * f, cy + dy * f];
}
export function tinePoint(x, y, bx, by, mx, my, z, c) {
  const d = (x - bx) * -my + (y - by) * mx;    // N = (-my, mx)
  const s = z * Math.exp(-Math.abs(d) * LN2 / c);
  return [x + s * mx, y + s * my];
}
export function wavyPoint(x, y, bx, by, mx, my, z, c, A, L, phi) {
  const px = x - bx, py = y - by;
  const along = px * mx + py * my;
  const d = (px * -my + py * mx) - A * Math.sin(2 * Math.PI * along / L + phi);
  const s = z * Math.exp(-Math.abs(d) * LN2 / c);
  return [x + s * mx, y + s * my];
}
export function stirPoint(x, y, cx, cy, r, z, c) {
  const dx = x - cx, dy = y - cy, rho = Math.hypot(dx, dy);
  if (rho < 1e-12) return [cx, cy];
  const th = z * Math.exp(-Math.abs(rho - r) * LN2 / c) / rho;
  const co = Math.cos(th), si = Math.sin(th);
  return [cx + dx * co - dy * si, cy + dx * si + dy * co];
}

/* ---------------- ops ---------------- */
// d: drop · t: tine · k: comb · w: wavy comb · s: stir. Coordinates are sheet units.
export function unitDir(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy);
  return l > 1e-9 ? [dx / l, dy / l] : [1, 0];
}
export function combOffsets(n, s) {
  const out = [];
  for (let i = 0; i < n; i++) out.push((i - (n - 1) / 2) * s);
  return out;
}

/* A mapper is (x, y, out) => void writing out[0], out[1]; one per op, built once. */
export function mapperFor(op) {
  switch (op.k) {
    case 'd': {
      const { x: cx, y: cy, r } = op; const r2 = r * r;
      return (x, y, o) => {
        const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
        if (d2 < 1e-24) { o[0] = cx; o[1] = cy; return; }
        const f = Math.sqrt(1 + r2 / d2); o[0] = cx + dx * f; o[1] = cy + dy * f;
      };
    }
    case 't': case 'k': {
      const [mx, my] = unitDir(op.x0, op.y0, op.x1, op.y1);
      const nx = -my, ny = mx, bx = op.x0, by = op.y0, z = op.z, kc = LN2 / op.c;
      const offs = op.k === 'k' ? combOffsets(op.n, op.s) : [0];
      const m = offs.length;
      return (x, y, o) => {
        const dn = (x - bx) * nx + (y - by) * ny;
        let s = 0;
        for (let i = 0; i < m; i++) s += Math.exp(-Math.abs(dn - offs[i]) * kc);
        s *= z; o[0] = x + s * mx; o[1] = y + s * my;
      };
    }
    case 'w': {
      // tine by tine: the wave's d reads the along-M coordinate, which a shift along M moves
      const [mx, my] = unitDir(op.x0, op.y0, op.x1, op.y1);
      const nx = -my, ny = mx, bx = op.x0, by = op.y0, z = op.z, kc = LN2 / op.c;
      const A = op.A, w = 2 * Math.PI / op.L, phi = op.phi * Math.PI / 180;
      const offs = combOffsets(op.n, op.s), m = offs.length;
      return (x, y, o) => {
        for (let i = 0; i < m; i++) {
          const px = x - bx, py = y - by;
          const d = (px * nx + py * ny) - offs[i] - A * Math.sin(w * (px * mx + py * my) + phi);
          const s = z * Math.exp(-Math.abs(d) * kc);
          x += s * mx; y += s * my;
        }
        o[0] = x; o[1] = y;
      };
    }
    case 's': {
      const { x: cx, y: cy, r, z } = op; const kc = LN2 / op.c;
      return (x, y, o) => {
        const dx = x - cx, dy = y - cy, rho = Math.sqrt(dx * dx + dy * dy);
        if (rho < 1e-12) { o[0] = cx; o[1] = cy; return; }
        const th = z * Math.exp(-Math.abs(rho - r) * kc) / rho;
        const co = Math.cos(th), si = Math.sin(th);
        o[0] = cx + dx * co - dy * si; o[1] = cy + dx * si + dy * co;
      };
    }
    default: throw new Error(`unknown op kind ${op.k}`);
  }
}

/* ---------------- polygons ---------------- */
class Builder {
  constructor(cap) { this.a = new Float64Array(Math.max(16, cap)); this.n = 0; }
  push(x, y) {
    if (this.n + 2 > this.a.length) { const b = new Float64Array(this.a.length * 2); b.set(this.a); this.a = b; }
    this.a[this.n++] = x; this.a[this.n++] = y;
  }
  done() { return this.a.length === this.n ? this.a : this.a.slice(0, this.n); }
}

/* Map one closed polygon (pts = x0,y0,x1,y1,…, n vertices) through f, refining
   each SOURCE edge by bisection until its image edges are no longer than maxSeg.
   Every output vertex is f() of a point ON the source polygon — never a chord point. */
export function mapPolygon(pts, n, f, maxSeg = MAX_SEG, depthCap = REFINE_DEPTH) {
  const out = new Builder(n * 3);
  const o = [0, 0];
  const seg2 = maxSeg * maxSeg;
  const refine = (ax, ay, bx, by, fax, fay, fbx, fby, depth) => {
    const dx = fbx - fax, dy = fby - fay;
    if (dx * dx + dy * dy <= seg2 || depth >= depthCap) return;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    f(mx, my, o); const fmx = o[0], fmy = o[1];
    refine(ax, ay, mx, my, fax, fay, fmx, fmy, depth + 1);
    out.push(fmx, fmy);
    refine(mx, my, bx, by, fmx, fmy, fbx, fby, depth + 1);
  };
  f(pts[0], pts[1], o);
  const f0x = o[0], f0y = o[1];
  let ax = pts[0], ay = pts[1], fax = f0x, fay = f0y;
  for (let i = 0; i < n; i++) {
    const j = i + 1 === n ? 0 : i + 1;
    const bx = pts[2 * j], by = pts[2 * j + 1];
    let fbx, fby;
    if (j === 0) { fbx = f0x; fby = f0y; } else { f(bx, by, o); fbx = o[0]; fby = o[1]; }
    out.push(fax, fay);
    refine(ax, ay, bx, by, fax, fay, fbx, fby, 0);
    ax = bx; ay = by; fax = fbx; fay = fby;
  }
  return out.done();
}

/* Drop a vertex when the edge from the last KEPT vertex into it is short AND
   every vertex of the run being dropped sits within tol of the chord from that
   kept vertex to the next one — the chord the pruned polygon will actually draw,
   so no removed vertex ends up further than tol from the outline. Keeps at least
   3 vertices. Deterministic. */
export function prunePolygon(pts, minSeg = MIN_SEG, tol = PRUNE_TOL) {
  const n = pts.length / 2;
  if (n <= 3) return pts;
  const keep = new Uint8Array(n).fill(1);
  const min2 = minSeg * minSeg, tol2 = tol * tol;
  let prev = n - 1, kept = n;
  for (let i = 0; i < n && kept > 3; i++) {
    const nxt = i + 1 === n ? 0 : i + 1;
    const px = pts[2 * prev], py = pts[2 * prev + 1], x = pts[2 * i], y = pts[2 * i + 1], qx = pts[2 * nxt], qy = pts[2 * nxt + 1];
    const ex = x - px, ey = y - py;
    if (ex * ex + ey * ey < min2) {
      const cx = qx - px, cy = qy - py, c2 = cx * cx + cy * cy;
      let within = true;
      for (let j = prev === n - 1 && i < prev ? 0 : prev + 1; within && j <= i; j++) {
        const vx = pts[2 * j] - px, vy = pts[2 * j + 1] - py;
        let dev2;
        if (c2 < 1e-24) dev2 = vx * vx + vy * vy;
        else { const t = Math.max(0, Math.min(1, (vx * cx + vy * cy) / c2)); const hx = t * cx - vx, hy = t * cy - vy; dev2 = hx * hx + hy * hy; }
        if (dev2 >= tol2) within = false;
      }
      if (within) { keep[i] = 0; kept--; continue; }   // prev stays: i is gone
    }
    prev = i;
  }
  if (kept === n) return pts;
  const out = new Float64Array(kept * 2);
  let k = 0;
  for (let i = 0; i < n; i++) if (keep[i]) { out[k++] = pts[2 * i]; out[k++] = pts[2 * i + 1]; }
  return out;
}

export function circlePolygon(cx, cy, r, maxSeg = MAX_SEG) {
  const k = Math.max(DROP_MIN_SIDES, Math.ceil(2 * Math.PI * r / maxSeg));
  const pts = new Float64Array(k * 2);
  for (let i = 0; i < k; i++) { const a = 2 * Math.PI * i / k; pts[2 * i] = cx + r * Math.cos(a); pts[2 * i + 1] = cy + r * Math.sin(a); }
  return pts;
}

/* ---------------- state ---------------- */
// A state is { sheet: '#hex', regions: [{ pts: Float64Array, color }] }. Regions
// are painted in order, so the newest drop sits on top of everything it pushed aside.
export function emptyState(sheet = '#EDEDE8') { return { sheet, regions: [], segScale: 1 }; }
export function pointCount(state) { let n = 0; for (const r of state.regions) n += r.pts.length / 2; return n; }
export function segFor(state) {
  // coarsen past the budget: a length derived from a count, said in the readout.
  // Never mutates the state (snapshots share states by reference).
  const n = pointCount(state);
  const scale = n > POINT_BUDGET ? n / POINT_BUDGET : 1;   // linear: the next op lands near the budget
  return { seg: MAX_SEG * scale, scale };
}

export function applyOp(state, op, { refine = true, prune = true, maxSeg = null, depthCap = REFINE_DEPTH } = {}) {
  const budget = segFor(state);
  const seg = maxSeg ?? budget.seg;
  let segScale = Math.max(state.segScale || 1, maxSeg == null ? budget.scale : 1);
  const f = mapperFor(op);
  const o = [0, 0];
  const regions = state.regions.map((rg) => {
    let pts;
    if (refine) pts = mapPolygon(rg.pts, rg.pts.length / 2, f, seg, depthCap);
    else { pts = new Float64Array(rg.pts.length); for (let i = 0; i < pts.length; i += 2) { f(rg.pts[i], rg.pts[i + 1], o); pts[i] = o[0]; pts[i + 1] = o[1]; } }
    if (prune) pts = prunePolygon(pts, MIN_SEG * (seg / MAX_SEG), PRUNE_TOL * (seg / MAX_SEG));
    return { pts, color: rg.color };
  });
  if (op.k === 'd') regions.push({ pts: circlePolygon(op.x, op.y, op.r, seg), color: op.color });
  const out = { sheet: state.sheet, regions, segScale };
  // one op can multiply the count (a fine comb over a raked sheet), so the budget
  // is also enforced AFTER mapping: simplify toward it with a tolerance derived
  // from the overshoot. Deterministic, so a link still replays the same sheet;
  // segScale carries the largest coarsening this sheet has ever taken, so the
  // readout keeps saying so for as long as the simplified edges are on it.
  if (prune) {
    let n = pointCount(out), guard = 0;
    while (n > POINT_BUDGET * 1.25 && guard++ < 4) {
      const sc = n / POINT_BUDGET;
      out.regions = out.regions.map((rg) => ({ pts: prunePolygon(rg.pts, MAX_SEG * sc, PRUNE_TOL * sc), color: rg.color }));
      out.segScale = Math.max(out.segScale, sc);
      n = pointCount(out);
    }
  }
  return out;
}

export function replay(ops, sheet = '#EDEDE8') {
  let st = emptyState(sheet);
  for (const op of ops) st = applyOp(st, op);
  return st;
}

/* ---------------- rounding + codec ---------------- */
const q1 = (v) => Math.round(v * 10) / 10 + 0;      // one decimal; "+ 0" turns -0 into +0
const FIELDS = {
  d: ['x', 'y', 'r'],
  t: ['x0', 'y0', 'x1', 'y1', 'z', 'c'],
  k: ['x0', 'y0', 'x1', 'y1', 'z', 'c', 'n', 's'],
  w: ['x0', 'y0', 'x1', 'y1', 'z', 'c', 'n', 's', 'A', 'L', 'phi'],
  s: ['x', 'y', 'r', 'z', 'c'],
};
const INT = new Set(['n']);
export function roundOp(op) {
  const out = { k: op.k };
  for (const f of FIELDS[op.k]) out[f] = INT.has(f) ? Math.round(op[f]) : q1(op[f]);
  if (op.k === 'd') out.color = normHex(op.color);
  return out;
}
export function normHex(c) {
  const m = String(c).trim().replace(/^#/, '');
  const full = m.length === 3 ? m.split('').map((ch) => ch + ch).join('') : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`bad colour ${c}`);
  return '#' + full.toUpperCase();
}
const num = (v) => { const s = String(v); return s; };

/* groups: an array of op arrays. The hash is  v1_<sheet hex>_<group>~<group>…,
   a group is ops joined by ';', an op is its kind and fields joined by ','.
   Every character used is allowed in a URI fragment unescaped. */
export function encodeHash(groups, sheet) {
  const body = groups.map((g) => g.map((op) => {
    const r = roundOp(op);
    const parts = [r.k, ...FIELDS[r.k].map((f) => num(r[f]))];
    if (r.k === 'd') parts.push(r.color.slice(1));
    return parts.join(',');
  }).join(';')).join('~');
  return `${FORMAT_VERSION}_${normHex(sheet).slice(1)}_${body}`;
}
export function decodeHash(hash) {
  const h = String(hash).replace(/^#/, '');
  if (!h) return { sheet: '#EDEDE8', groups: [] };
  const [ver, sheetHex, body = ''] = h.split('_');
  if (ver !== FORMAT_VERSION) throw new Error(`unknown marble format ${ver}`);
  const sheet = normHex(sheetHex);
  const groups = body ? body.split('~').map((g) => g ? g.split(';').map(parseOp) : []) : [];
  return { sheet, groups: groups.filter((g) => g.length) };
}
function parseOp(s) {
  const parts = s.split(',');
  const k = parts[0];
  const fields = FIELDS[k];
  if (!fields) throw new Error(`unknown op ${k}`);
  const op = { k };
  fields.forEach((f, i) => { const v = Number(parts[i + 1]); if (!Number.isFinite(v)) throw new Error(`bad field ${f} in ${s}`); op[f] = v; });
  if (k === 'd') op.color = normHex(parts[fields.length + 1]);
  return roundOp(op);
}

/* ---------------- patterns (classic sequences, scripted) ---------------- */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const W = SHEET.w, H = SHEET.h;
const cyc = (colors, i) => colors[i % colors.length];

/* the stone base every raked pattern starts from. A drop adds exactly πr² of ink
   and pushes the rest aside without shrinking it, so coverage is Σπr² against the
   sheet: the radii are sized so the grid covers the sheet about 1.3 times over,
   and the grid runs one cell PAST every edge so a rake that shifts everything by
   z does not expose a bare band. Colours are drawn at random (seeded), never the
   same twice running — a grid cycled in order paints one colour per column. */
export function stonePattern(colors, { rand = mulberry32(7), cols = 7, rows = 9, cover = 1.3 } = {}) {
  const ops = []; let last = -1;
  const mx = W / cols, my = H / rows;                 // a one-cell margin past each edge
  const gx = (W + 2 * mx) / (cols + 2), gy = (H + 2 * my) / (rows + 2);
  const rMean = Math.sqrt(cover * (W + 2 * mx) * (H + 2 * my) / ((cols + 2) * (rows + 2)) / Math.PI);
  for (let r = 0; r < rows + 2; r++) for (let c = 0; c < cols + 2; c++) {
    const x = -mx + gx * (c + 0.5) + (rand() - 0.5) * gx * 0.5, y = -my + gy * (r + 0.5) + (rand() - 0.5) * gy * 0.5;
    let ci = Math.floor(rand() * colors.length); if (colors.length > 1 && ci === last) ci = (ci + 1) % colors.length; last = ci;
    ops.push({ k: 'd', x, y, r: rMean * (0.75 + rand() * 0.5), color: colors[ci] });
  }
  return ops;
}
export function concentricPattern(colors, { x = W / 2, y = H / 2, count = 9, r = 70 } = {}) {
  const ops = [];
  for (let i = 0; i < count; i++) ops.push({ k: 'd', x, y, r, color: cyc(colors, i) });
  return ops;
}
/* get-gel: the sheet is raked across in one direction and back, then the other way
   and back, each return pass offset by half a tine spacing — the "come and go". */
export function getGelPasses({ n = 13, z = 130 } = {}) {
  const sx = W / (n - 1), sy = H / (n - 1);
  // falloff near the spacing: the shift still varies across the whole gap, so the
  // come-and-go reads as S-curves rather than as spikes on each tine
  return [
    { k: 'k', x0: W / 2, y0: 0, x1: W / 2, y1: H, z, c: sx / 1.4, n, s: sx },
    { k: 'k', x0: W / 2 + sx / 2, y0: H, x1: W / 2 + sx / 2, y1: 0, z, c: sx / 1.4, n, s: sx },
    { k: 'k', x0: 0, y0: H / 2, x1: W, y1: H / 2, z, c: sy / 1.4, n, s: sy },
    { k: 'k', x0: W, y0: H / 2 + sy / 2, x1: 0, y1: H / 2 + sy / 2, z, c: sy / 1.4, n, s: sy },
  ];
}
export function getGelPattern(colors, opts = {}) { return [...stonePattern(colors, opts), ...getGelPasses(opts)]; }
/* nonpareil: get-gel, then one fine comb drawn once down the sheet. */
export function nonpareilComb({ n = 41, z = 170, x = 0 } = {}) {
  const s = W / (n - 1);
  return { k: 'k', x0: W / 2 + x, y0: 0, x1: W / 2 + x, y1: H, z, c: s / 1.6, n, s };
}
export function nonpareilPattern(colors, opts = {}) { return [...getGelPattern(colors, opts), nonpareilComb(opts)]; }
/* chevron: nonpareil, then the same fine comb drawn back UP, offset by half a tine. */
export function chevronPattern(colors, opts = {}) {
  const n = opts.n ?? 41, s = W / (n - 1);
  const back = { k: 'k', x0: W / 2 + s / 2, y0: H, x1: W / 2 + s / 2, y1: 0, z: opts.z ?? 170, c: s / 1.6, n, s };
  return [...nonpareilPattern(colors, opts), back];
}
/* bouquet: nonpareil, then a wide comb drawn down the sheet along a wavy path. */
export function bouquetPattern(colors, opts = {}) {
  const n = 9, s = W / (n - 1);   // a wide comb: each tine's wave gathers a fan of the nonpareil's arches
  const wavy = { k: 'w', x0: W / 2, y0: 0, x1: W / 2, y1: H, z: 95, c: s / 3, n, s, A: s * 0.55, L: H / 4, phi: 0 };
  return [...nonpareilPattern(colors, opts), wavy];
}
export const PATTERNS = {
  concentric: { label: 'Concentric', build: (colors, o) => concentricPattern(colors, o) },
  getgel: { label: 'Get-gel', build: (colors, o) => getGelPattern(colors, o) },
  nonpareil: { label: 'Nonpareil', build: (colors, o) => nonpareilPattern(colors, o) },
  chevron: { label: 'Chevron', build: (colors, o) => chevronPattern(colors, o) },
  bouquet: { label: 'Bouquet', build: (colors, o) => bouquetPattern(colors, o) },
};

/* a seeded random sequence: a scatter of drops and a few strokes of every kind */
export function randomSequence(seed, colors) {
  const rand = mulberry32(seed);
  const ops = [];
  // enough ink to cover the sheet: Σπr² runs about 0.9-1.6 sheets over 36-70 drops
  const nd = 36 + Math.floor(rand() * 35), rMean = Math.sqrt(1.2 * W * H / nd / Math.PI);
  let last = -1;
  for (let i = 0; i < nd; i++) {
    let ci = Math.floor(rand() * colors.length); if (colors.length > 1 && ci === last) ci = (ci + 1) % colors.length; last = ci;
    ops.push({ k: 'd', x: rand() * W, y: rand() * H, r: rMean * (0.5 + rand()), color: colors[ci] });
  }
  const ns = 2 + Math.floor(rand() * 4);
  for (let i = 0; i < ns; i++) {
    const kind = ['t', 'k', 'w', 's'][Math.floor(rand() * 4)];
    const x0 = rand() * W, y0 = rand() * H, ang = rand() * Math.PI * 2, len = 200 + rand() * 500;
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    const z = 50 + rand() * 110, c = 12 + rand() * 40;
    if (kind === 't') ops.push({ k: 't', x0, y0, x1, y1, z, c });
    else if (kind === 'k') ops.push({ k: 'k', x0, y0, x1, y1, z, c, n: 3 + Math.floor(rand() * 10), s: 20 + rand() * 60 });
    else if (kind === 'w') ops.push({ k: 'w', x0, y0, x1, y1, z, c, n: 3 + Math.floor(rand() * 7), s: 30 + rand() * 60, A: 10 + rand() * 50, L: 100 + rand() * 300, phi: rand() * 360 });
    else ops.push({ k: 's', x: x0, y: y0, r: 30 + rand() * 150, z: (rand() < 0.5 ? -1 : 1) * (40 + rand() * 200), c });
  }
  return ops;
}

/* ---------------- export ---------------- */
const f1 = (v) => (Math.round(v * 10) / 10).toString();
export function exportSvg(state) {
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`,
    `<rect width="${W}" height="${H}" fill="${state.sheet}"/>`];
  for (const rg of state.regions) {
    const p = rg.pts; let d = `M${f1(p[0])} ${f1(p[1])}`;
    for (let i = 2; i < p.length; i += 2) d += `L${f1(p[i])} ${f1(p[i + 1])}`;
    parts.push(`<path d="${d}Z" fill="${rg.color}"/>`);
  }
  parts.push('</svg>');
  return parts.join('\n');
}
/* draw into any CanvasRenderingContext2D at `scale` px per sheet unit. Each
   region is filled and then STROKED one device pixel wide in its own colour:
   two fills sharing an edge are antialiased separately and let the sheet show
   through as a hairline (the conflation artefact), and the stroke covers it. */
export function drawState(ctx, state, scale, { clip = true, seam = true } = {}) {
  ctx.save();
  ctx.scale(scale, scale);
  if (clip) { ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); }
  ctx.fillStyle = state.sheet; ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 1 / scale; ctx.lineJoin = 'round';
  for (const rg of state.regions) {
    const p = rg.pts;
    ctx.beginPath(); ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.closePath(); ctx.fillStyle = rg.color; ctx.fill();
    if (seam) { ctx.strokeStyle = rg.color; ctx.stroke(); }
  }
  ctx.restore();
}
/* a digest of every coordinate, for "the same sheet" claims in the gate */
export function digest(state) {
  let h = 0x811c9dc5 >>> 0, n = 0;
  const view = new DataView(new ArrayBuffer(8));
  for (const rg of state.regions) {
    const p = rg.pts; n += p.length / 2;
    for (let i = 0; i < p.length; i++) {
      view.setFloat64(0, p[i]);
      for (let b = 0; b < 8; b++) { h ^= view.getUint8(b); h = Math.imul(h, 0x01000193) >>> 0; }
    }
    for (const ch of rg.color) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  }
  return `${state.sheet}:${state.regions.length}:${n}:${h.toString(16)}`;
}
