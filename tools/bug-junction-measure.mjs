/* bug-junction-measure.mjs — the junction blend's three measures (design doc
   §16.6), built on WHICHEVER geometry module it is handed: the gate's JB1-JB3
   (tools/verify-bug.mjs) read the tree under test, and the junction sheet
   (tools/shot-bug-junction.mjs) reads the base tree with the same code, so a
   number on the sheet is the gate's number for that tree. Every measure reads
   the EMITTED model — the body's and each wing's top-down contour
   (G.contourLoops), the body part's triangles — never the builder's record of
   the blend. */

const segDist = (p, a, b) => { const ab = [b[0] - a[0], b[1] - a[1]], L2 = ab[0] * ab[0] + ab[1] * ab[1] || 1e-18; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2)); return Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1]); };
function fillRaster(loops, px, box) {
  const nx = Math.ceil((box.x1 - box.x0) / px), ny = Math.ceil((box.y1 - box.y0) / px), g = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const y = box.y0 + (j + 0.5) * px, xs = [];
    for (const L of loops) for (let i = 0; i < L.length; i++) {
      const a = L[i], b = L[(i + 1) % L.length];
      if ((a[1] <= y) !== (b[1] <= y)) xs.push([a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), b[1] > a[1] ? 1 : -1]);
    }
    xs.sort((p, q) => p[0] - q[0]);
    let w = 0;
    for (let k = 0; k + 1 < xs.length; k++) {
      w += xs[k][1];
      if (w === 0) continue;
      const i0 = Math.max(0, Math.ceil((xs[k][0] - box.x0) / px - 0.5)), i1 = Math.min(nx - 1, Math.floor((xs[k + 1][0] - box.x0) / px - 0.5));
      for (let i = i0; i <= i1; i++) g[j * nx + i] = 1;
    }
  }
  return g;
}

export function makeJunctionMeasures(G) {
  /* The body seen from above is its EMITTED contour (G.contourLoops of the body
     part); a wing's planform (u, w) mm is carried into the world by the wing
     transform RESTATED here from the parameters (the hinge from wingHinges, the
     pose from the resolved pair: sweep, pitch over the span, dihedral) — not the
     builder's burial field, which reads a smoothed analytic silhouette. */
  const bodyViews = new WeakMap();
  function bodyView(model) {
    let v = bodyViews.get(model);
    if (v) return v;
    const body = model.parts.find((q) => q.kind === 'body');
    const loops = body ? G.contourLoops(model, body) : [];
    const segs = loops.flatMap((L) => L.map((a, i) => [a, L[(i + 1) % L.length]]));
    // signed distance to the contour, NEGATIVE inside the body (parity over the loops)
    const sd = (x, y) => {
      let d = Infinity, inside = false;
      for (const [a, b] of segs) {
        d = Math.min(d, segDist([x, y], a, b));
        if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
      }
      return inside ? -d : d;
    };
    v = { body, loops, segs, sd };
    bodyViews.set(model, v);
    return v;
  }
  function wingXY(model, k) {
    const p = model.params, spec = G.resolveWingPairs(p)[k], hinge = G.wingHinges(p, model.layout)[k].hinge, D = Math.PI / 180;
    const sw = spec.sweep * D, dh = spec.dihedral * D, cd = Math.cos(dh), sd = Math.sin(dh);
    return (u, w) => {
      const a = spec.pitch * D * Math.max(0, Math.min(1, u / spec.length)), ca = Math.cos(a);
      const x = u * Math.cos(sw) + w * Math.sin(sw) * ca, y = -u * Math.sin(sw) + w * Math.cos(sw) * ca, z = w * Math.sin(a);
      return [hinge[0] + x * cd - z * sd, hinge[1] + y];
    };
  }

  // exact squared distance transform (Felzenszwalb) to the pixels where src is set, in pixels^2
  function edtSq(src, nx, ny) {
    const INF = 1e20, m = Math.max(nx, ny), f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1), out = new Float64Array(nx * ny);
    const pass = (n) => {
      let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
      for (let q = 1; q < n; q++) { let s; for (;;) { s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); if (s <= z[k]) { k--; if (k < 0) { k = 0; break; } } else break; } k++; v[k] = q; z[k] = s; z[k + 1] = INF; }
      k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) ** 2 + f[v[k]]; }
    };
    for (let i = 0; i < nx; i++) { for (let j = 0; j < ny; j++) f[j] = src[j * nx + i] ? 0 : INF; pass(ny); for (let j = 0; j < ny; j++) out[j * nx + i] = d[j]; }
    for (let j = 0; j < ny; j++) { for (let i = 0; i < nx; i++) f[i] = out[j * nx + i]; pass(nx); for (let i = 0; i < nx; i++) out[j * nx + i] = d[i]; }
    return out;
  }
  const loopsBox = (loops, pad) => { const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }; for (const L of loops) for (const [x, y] of L) { b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y); } b.x0 -= pad; b.y0 -= pad; b.x1 += pad; b.y1 += pad; return b; };
  /* JB1 — NO SLOT. The empty space between a wing and the body narrower than
     `gap`, measured on the top-down union (the body's and every wing's emitted
     contours, this file's own rasterizer at 0.05 mm, a window about the body):
     a CLOSING of the union at radius gap/2 fills every such space, and a fill
     component that reaches both the body and a wing is a slot. Its DEPTH is how
     far its farthest pixel stands from open space — a rounded corner fills to a
     sliver a pixel or two deep, a slot to its own length. */
  const SLOT_PX = 0.05, SLOT_DEPTH_MM = 0.5;   // measured: rounded corners read 0.10-0.30 mm over 180 bugs, the slots the blend removes 1.9-6.9 mm
  function slotScan(model, gap) {
    const bv = bodyView(model);
    const wings = model.parts.filter((q) => /^wing\d$/.test(q.kind)).flatMap((q) => G.contourLoops(model, q));
    if (!bv.loops.length || !wings.length) return { depth: 0, comps: [] };
    const rho = gap / 2, b = loopsBox(bv.loops, gap + 3), px = SLOT_PX;
    const nx = Math.ceil((b.x1 - b.x0) / px), ny = Math.ceil((b.y1 - b.y0) / px), N = nx * ny;
    const B = fillRaster(bv.loops, px, b), Wr = fillRaster(wings, px, b);
    const U = new Uint8Array(N); for (let i = 0; i < N; i++) U[i] = B[i] | Wr[i];
    const r2 = (rho / px) ** 2;
    const dU = edtSq(U, nx, ny), notDil = new Uint8Array(N); for (let i = 0; i < N; i++) notDil[i] = dU[i] <= r2 ? 0 : 1;
    // the window's own border counts as open space (a slot is judged where it is seen)
    for (let i = 0; i < nx; i++) { notDil[i] = 1; notDil[(ny - 1) * nx + i] = 1; } for (let j = 0; j < ny; j++) { notDil[j * nx] = 1; notDil[j * nx + nx - 1] = 1; }
    const dN = edtSq(notDil, nx, ny), F = new Uint8Array(N); for (let i = 0; i < N; i++) F[i] = !U[i] && dN[i] > r2 ? 1 : 0;
    const open = new Uint8Array(N); for (let i = 0; i < N; i++) open[i] = !U[i] && !F[i] ? 1 : 0;
    const dOpen = edtSq(open, nx, ny), dB = edtSq(B, nx, ny), dW = edtSq(Wr, nx, ny);
    // a cell cut through a wing (HOLES) is no slot: a fill component lying
    // wholly inside one of a wing's own HOLE loops (its contour loops besides the
    // outer one) is set aside — a slot, or a pocket closed only by the body, has
    // pixels outside every wing hole
    const holeLoops = model.parts.filter((q) => /^wing\d$/.test(q.kind)).flatMap((q) => { const L = G.contourLoops(model, q); if (L.length < 2) return []; const area = (l) => Math.abs(l.reduce((a, [x, y], i) => { const [x2, y2] = l[(i + 1) % l.length]; return a + x * y2 - x2 * y; }, 0)); const big = L.reduce((a, l) => (area(l) > area(a) ? l : a)); return L.filter((l) => l !== big); });
    const Hr = holeLoops.length ? fillRaster(holeLoops, px, b) : new Uint8Array(N);
    const reach = (rho / px + 1.5) ** 2, lab = new Int32Array(N).fill(-1), comps = [];
    for (let s = 0; s < N; s++) {
      if (!F[s] || lab[s] >= 0) continue;
      const st = [s]; lab[s] = comps.length; let nB = false, nW = false, depth = 0, area = 0, at = null, opens = false;
      while (st.length) {
        const q = st.pop(), i = q % nx, j = (q - i) / nx; area++;
        if (dB[q] <= reach) nB = true; if (dW[q] <= reach) nW = true;
        if (!Hr[q]) opens = true;
        const dd = Math.sqrt(dOpen[q]) * px; if (dd > depth) { depth = dd; at = [b.x0 + (i + 0.5) * px, b.y0 + (j + 0.5) * px]; }
        if (i > 0 && F[q - 1] && lab[q - 1] < 0) { lab[q - 1] = comps.length; st.push(q - 1); }
        if (i < nx - 1 && F[q + 1] && lab[q + 1] < 0) { lab[q + 1] = comps.length; st.push(q + 1); }
        if (j > 0 && F[q - nx] && lab[q - nx] < 0) { lab[q - nx] = comps.length; st.push(q - nx); }
        if (j < ny - 1 && F[q + nx] && lab[q + nx] < 0) { lab[q + nx] = comps.length; st.push(q + nx); }
      }
      comps.push({ body: nB, wing: nW, opens, depth, areaMm2: area * px * px, at });
    }
    const wb = comps.filter((c) => c.body && c.wing && c.opens);
    const worst = wb.reduce((a, c) => (c.depth > a.depth ? c : a), { depth: 0, at: null });
    return { depth: worst.depth, at: worst.at, comps: wb };
  }
  /* JB2 — NO NECK. For each right wing, the widest disc that can travel from the
     body into the wing, top-down, through the wing's own emitted OUTLINE (its
     outer contour, holes filled) and
     the body's: a max-min path on the distance transform of (wing + body), from
     every body pixel to the wing pixel standing farthest from any edge within
     NECK_REACH_MM of the body. Twice that radius is the width of the narrowest
     place the wing hangs from at its junction; it must clear NECK_FLOORS floors
     ("comfortably above the floor": over 180 blended bugs the narrowest reads
     1.73 floors, and the drawn root of the #20/#31 fixture, blend off, 0.99). */
  const NECK_PX = 0.05, NECK_REACH_MM = 6, NECK_FLOORS = 1.5;
  function neckScan(model) {
    const bv = bodyView(model), out = [];
    for (const part of model.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R')) {
      // (the wing's OUTER contour, its holes filled: the junction's neck is a
    // property of the outline; a HOLES wing hangs from the body by its vein
    // frame there, and the veins have their own floor — measured through the
    // cut material this read a vein's width, 1.20 mm, or no path at all where
    // a cell cut the wing inside the window)
    const all = G.contourLoops(model, part), areaOf = (l) => Math.abs(l.reduce((a, [x, y], i) => { const [x2, y2] = l[(i + 1) % l.length]; return a + x * y2 - x2 * y; }, 0));
    const wl = all.length ? [all.reduce((a, l) => (areaOf(l) > areaOf(a) ? l : a))] : [], bb = loopsBox(bv.loops, NECK_REACH_MM), px = NECK_PX;
      const nx = Math.ceil((bb.x1 - bb.x0) / px), ny = Math.ceil((bb.y1 - bb.y0) / px), N = nx * ny;
      const B = fillRaster(bv.loops, px, bb), Wg = fillRaster(wl, px, bb);
      const out0 = new Uint8Array(N); for (let i = 0; i < N; i++) out0[i] = B[i] || Wg[i] ? 0 : 1;
      for (let i = 0; i < nx; i++) { out0[i] = 1; out0[(ny - 1) * nx + i] = 1; } for (let j = 0; j < ny; j++) { out0[j * nx] = 1; out0[j * nx + nx - 1] = 1; }
      const D = edtSq(out0, nx, ny);
      let tgt = -1, tv = -1; for (let i = 0; i < N; i++) if (Wg[i] && !B[i] && !out0[i] && D[i] > tv) { tv = D[i]; tgt = i; }
      if (tgt < 0) { out.push({ part: part.name, neck: 0, at: null }); continue; }
      const val = new Float64Array(N).fill(-1), done = new Uint8Array(N), heap = [];
      const push = (i, v) => { heap.push([v, i]); let c = heap.length - 1; while (c > 0) { const pp = (c - 1) >> 1; if (heap[pp][0] >= heap[c][0]) break; [heap[pp], heap[c]] = [heap[c], heap[pp]]; c = pp; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] > heap[m][0]) m = l; if (r < heap.length && heap[r][0] > heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
      for (let i = 0; i < N; i++) if (B[i] && !out0[i]) { val[i] = D[i]; push(i, D[i]); }
      while (heap.length) {
        const [v, q] = pop(); if (done[q]) continue; done[q] = 1; if (q === tgt) break;
        const i = q % nx;
        for (const t of [i > 0 ? q - 1 : -1, i < nx - 1 ? q + 1 : -1, q - nx, q + nx]) {
          if (t < 0 || t >= N || done[t] || out0[t]) continue;
          const nv = Math.min(v, D[t]); if (nv > val[t]) { val[t] = nv; push(t, nv); }
        }
      }
      out.push({ part: part.name, neck: 2 * Math.sqrt(Math.max(0, val[tgt])) * px, widest: 2 * Math.sqrt(tv) * px });
    }
    return out;
  }
  /* JB3 — NO VISIBLE TAB. Every vertex of a right wing standing JB3_INSET_MM or
     more inside the body's top-down contour is inside the body's SOLID: a
     vertical ray from it crosses the body part's emitted triangles an odd number
     of times. (Nearer the contour than that the wing is leaving the body through
     its flank, where the body is thinner than the sheet.)
     TWO ARMS, by the body's own emitted thickness T over the vertex (the span
     of that vertical ray's crossings): where T is at least the floor a sheet
     the floor allows fits inside, and the vertex must be inside the solid
     (above); where T is under the floor NO legal sheet fits — the floor holds
     the sheet at its own thickness — and the vertex may stand out by at most
     half the difference, (floor - T) / 2, the least a floor-thick sheet centred
     in the body can show (JB3_THIN_TOL_MM over it; measured 0.0002 mm on the
     default body at floors 1.2 / 1.5 / 2, where every protruding vertex is
     over a body thinner than the floor and none over a thicker one). */
  const JB3_INSET_MM = 0.5, JB3_THIN_TOL_MM = 0.005;
  function buriedScan(model) {
    const bv = bodyView(model), P = model.positions, I = model.indices, out = [];
    if (!bv.body) return out;
    const cell = 0.5, grid = new Map(), key = (i, j) => i * 100003 + j;
    for (let t = bv.body.t0; t < bv.body.t1; t++) {
      const a = I[3 * t], b = I[3 * t + 1], c = I[3 * t + 2];
      const xs = [P[3 * a], P[3 * b], P[3 * c]], ys = [P[3 * a + 1], P[3 * b + 1], P[3 * c + 1]];
      for (let i = Math.floor(Math.min(...xs) / cell); i <= Math.floor(Math.max(...xs) / cell); i++) for (let j = Math.floor(Math.min(...ys) / cell); j <= Math.floor(Math.max(...ys) / cell); j++) { const k = key(i, j); (grid.get(k) || grid.set(k, []).get(k)).push(t); }
    }
    // the body's emitted crossings of the vertical line through (x, y), sorted
    const zsAt = (x, y) => {
      const zs = [];
      for (const t of grid.get(key(Math.floor(x / cell), Math.floor(y / cell))) || []) {
        const a = I[3 * t], b = I[3 * t + 1], c = I[3 * t + 2];
        const ax = P[3 * a], ay = P[3 * a + 1], bx = P[3 * b], by = P[3 * b + 1], cx = P[3 * c], cy = P[3 * c + 1];
        const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(d) < 1e-18) continue;
        const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d, l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d, l3 = 1 - l1 - l2;
        if (l1 < 0 || l2 < 0 || l3 < 0) continue;
        zs.push(l1 * P[3 * a + 2] + l2 * P[3 * b + 2] + l3 * P[3 * c + 2]);
      }
      return zs.sort((u, v) => u - v);
    };
    const floor = model.params.minDiameter;
    // (a vertex JB3_INSET_MM inside the contour is inside the contour's box
    // shrunk by as much: an exact pre-filter before the distance)
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const L of bv.loops) for (const [x, y] of L) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
    bx0 += JB3_INSET_MM; bx1 -= JB3_INSET_MM; by0 += JB3_INSET_MM; by1 -= JB3_INSET_MM;
    for (const part of model.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R')) {
      let judged = 0, exposed = 0, worst = null, thin = 0, thinOver = 0, thinWorst = null;
      for (let v = part.v0; v < part.v1; v++) {
        const x = P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2];
        if (x < bx0 || x > bx1 || y < by0 || y > by1) continue;
        const d = bv.sd(x, y);
        if (d > -JB3_INSET_MM) continue;
        judged++;
        const zs = zsAt(x, y), above = zs.filter((q) => q > z).length;
        if (above % 2 === 1) continue;
        const T = zs.length >= 2 ? zs[zs.length - 1] - zs[0] : 0;
        if (zs.length >= 2 && T < floor) {
          thin++;
          const out = Math.max(z - zs[zs.length - 1], zs[0] - z), excess = out - (floor - T) / 2;
          if (excess > JB3_THIN_TOL_MM) { thinOver++; if (!thinWorst || excess > thinWorst.excess) thinWorst = { excess, out, T, at: [x, y, z] }; }
          continue;
        }
        exposed++; if (!worst || -d > worst.inset) worst = { inset: -d, at: [x, y, z] };
      }
      out.push({ part: part.name, judged, exposed, worst, thin, thinOver, thinWorst });
    }
    return out;
  }
  return { bodyView, wingXY, slotScan, neckScan, buriedScan, SLOT_PX, SLOT_DEPTH_MM, NECK_PX, NECK_REACH_MM, NECK_FLOORS, JB3_INSET_MM, JB3_THIN_TOL_MM };
}
export { segDist, fillRaster };
