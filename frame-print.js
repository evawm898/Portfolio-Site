/* frame-print.js — PRINT READINESS, measured off the relief's own mesh (the
   STL-integrity session, docs/frame-charter.md §19). Read-only: nothing here
   changes a vertex. Pure functions, no DOM; the page's read-out and
   tools/verify-frame-stl.mjs call the same code, so the numbers on the page
   are the numbers in the charter.

   WHAT IT MEASURES, AND HOW (every figure is the relief's, in print mm — the
   STL's own units — after the float32 rounding the file applies):
     box        the bounding box of the written vertices.
     height     the highest point above the back (z = 0) and above the
                plate's top (plateT): the relief's own depth.
     back       the least z of any vertex (0 when the back lies on z = 0) and
                the FOOTPRINT RESTING on it: of the vertical rays that meet
                material, the share whose lowest material starts at z = 0
                (1 = the whole footprint stands on the bed plane; a part
                floating above it lowers the share).
     volume     of the UNION of the closed shells (they overlap — the export
                contract — so a sum over shells counts the overlaps twice):
                vertical rays on a square grid of `cell`, each shell's
                crossings paired into inside intervals by parity, the
                intervals unioned, length × cell² summed.
     plan       the relief stands on a flat back, so its features are read
                in PLAN off the same vertical rays: the footprint (every ray
                that meets material) as a raster of `cell`, and an exact
                Euclidean distance transform of it. The NARROWEST FEATURE is
                twice the least distance-to-empty along the footprint's own
                ridge (its medial cells: no neighbour farther from empty); the
                NARROWEST GAP the same on the empty side, for the empty cells
                the material encloses (a light, a slit between two wires) —
                never the outside. Both to about a cell.
     thin       the least material height above the back over the footprint.
     overhang   rays whose material is more than one run (material over an
                empty space): 0 for a relief supported everywhere from the back.
   NOT COVERED, said so: thickness ALONG A SLOPE — the frame's bands and wires
   stand straight up from the back, so the plan width is the wall; a leaning
   feature would read the larger of its two thicknesses. A normal-ray wall
   test was tried and refused: on overlapping shells its rays start at the
   sharp edges and grooves where two shells' surfaces meet in the union and
   read 0.002 mm walls and 0 mm gaps that are not the part. Rays exactly
   along a shared edge are nudged by a fixed irrational offset rather than
   handled exactly; a feature narrower than the cell is not resolved; and
   nothing here has been printed — every floor it is compared against
   (MIN_FEATURE_MM) is an assumption of the undecided print process. */


const F32 = (P) => Float32Array.from(P);

/* the shell (part index) of every triangle */
function shellOf(relief) {
  const nt = relief.indices.length / 3, s = new Int32Array(nt).fill(-1);
  relief.parts.forEach((p, k) => { for (let t = p.t0; t < p.t1; t++) s[t] = k; });
  return s;
}

/* volume and the footprint's rest, by vertical rays on a `cell` grid; the
   raster of every ray's union (its top) for the plan measures */
function verticalRays(X, I, shell, cell) {
  const nt = I.length / 3, hits = new Map();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < X.length; i += 3) { x0 = Math.min(x0, X[i]); y0 = Math.min(y0, X[i + 1]); x1 = Math.max(x1, X[i]); y1 = Math.max(y1, X[i + 1]); }
  // a one-cell empty margin all round, so the outside is one region; ray
  // (i, j) stands at (i − 1 + 0.5 + ε)·cell past the box's corner — ε
  // irrational, so no ray runs exactly along a lattice edge of the mesh
  const eps = 0.0137, ex = eps, ey = eps * 1.618;
  const gx = (i) => x0 + (i - 0.5 + ex) * cell, gy = (j) => y0 + (j - 0.5 + ey) * cell;
  const nx = Math.ceil((x1 - x0) / cell) + 3, ny = Math.ceil((y1 - y0) / cell) + 3;
  for (let t = 0; t < nt; t++) {
    const a = 3 * I[3 * t], b = 3 * I[3 * t + 1], c = 3 * I[3 * t + 2];
    const ax = X[a], ay = X[a + 1], bx = X[b], by = X[b + 1], cx = X[c], cy = X[c + 1];
    const det = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (det === 0) continue;           // a vertical face: no vertical ray crosses it
    const i0 = Math.ceil((Math.min(ax, bx, cx) - x0) / cell + 0.5 - ex), i1 = Math.floor((Math.max(ax, bx, cx) - x0) / cell + 0.5 - ex);
    const j0 = Math.ceil((Math.min(ay, by, cy) - y0) / cell + 0.5 - ey), j1 = Math.floor((Math.max(ay, by, cy) - y0) / cell + 0.5 - ey);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const x = gx(i), y = gy(j);
      const l1 = ((bx - x) * (cy - y) - (by - y) * (cx - x)) / det, l2 = ((cx - x) * (ay - y) - (cy - y) * (ax - x)) / det, l3 = 1 - l1 - l2;
      if (l1 < 0 || l2 < 0 || l3 < 0) continue;
      const z = l1 * X[a + 2] + l2 * X[b + 2] + l3 * X[c + 2];
      const key = i * ny + j; let L = hits.get(key); if (!L) hits.set(key, (L = [])); L.push(shell[t], z);
    }
  }
  const top = new Float64Array(nx * ny).fill(-1);
  let vol = 0, rays = 0, rest = 0, odd = 0, multi = 0, thin = Infinity;
  for (const [key, L] of hits) {
    const by = new Map();
    for (let k = 0; k < L.length; k += 2) { let a = by.get(L[k]); if (!a) by.set(L[k], (a = [])); a.push(L[k + 1]); }
    const iv = [];
    for (const zs of by.values()) { if (zs.length % 2) { odd++; continue; } zs.sort((p, q) => p - q); for (let k = 0; k < zs.length; k += 2) iv.push([zs[k], zs[k + 1]]); }
    if (!iv.length) continue;
    iv.sort((p, q) => p[0] - q[0]);
    let len = 0, runs = 1, s0 = iv[0][0], e0 = iv[0][1];
    for (let k = 1; k < iv.length; k++) { if (iv[k][0] <= e0) e0 = Math.max(e0, iv[k][1]); else { len += e0 - s0; runs++; s0 = iv[k][0]; e0 = iv[k][1]; } }
    len += e0 - s0;
    vol += len * cell * cell; rays++;
    if (iv[0][0] === 0) rest++;
    if (runs > 1) multi++;
    thin = Math.min(thin, e0);
    top[key] = e0;
  }
  return { volume: vol, rays, rest: rays ? rest / rays : 0, odd, multi, thin, raster: { nx, ny, top, x0, y0, cell, gx, gy } };
}

/* the exact squared Euclidean distance transform (Felzenszwalb–Huttenlocher)
   of a binary raster: for every cell, the squared distance in cells to the
   nearest cell where `isSite` holds */
function edt2(nx, ny, isSite) {
  const INF = 1e20, n = Math.max(nx, ny), f = new Float64Array(n), d = new Float64Array(nx * ny);
  const v = new Int32Array(n), z = new Float64Array(n + 1), out = new Float64Array(n);
  const pass = (m) => {
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < m; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0; for (let q = 0; q < m; q++) { while (z[k + 1] < q) k++; out[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
  };
  for (let i = 0; i < nx; i++) { for (let j = 0; j < ny; j++) f[j] = isSite(i * ny + j) ? 0 : INF; pass(ny); for (let j = 0; j < ny; j++) d[i * ny + j] = out[j]; }
  for (let j = 0; j < ny; j++) { for (let i = 0; i < nx; i++) f[i] = d[i * ny + j]; pass(nx); for (let i = 0; i < nx; i++) d[i * ny + j] = out[i]; }
  return d;
}
/* the least width of a region at a NECK: along its ridge (cells no
   8-neighbour in the region lies farther from the other side of), the
   ridge cells whose ridge runs on in two opposite directions and is no
   narrower on either side — a uniform slit or strip, or a pinch in one.
   A WEDGE is not a neck: the last CUSP_MM of a ridge before its end is
   excluded — a cusp where two edges meet is not a gap the print could lose,
   and its width at the tip is 0 by construction (measured: the arch's
   spandrel cusp between a sub-arch and the head read a 0.1 mm "gap", the
   rasterised wedge's last cells holding one cell's width for two rows, a
   plateau a local-minimum test alone takes for a slit). The
   width at a cell is twice the distance to the other side's nearest CELL
   CENTRE less one cell (the boundary lies half a cell short of both). */
export const CUSP_MM = 1;   // MIN_FEATURE_MM's own length: the last millimetre before a ridge's end
function narrowest(R, d2, inRegion) {
  const { nx, ny, cell } = R;
  const ridge = new Uint8Array(nx * ny);
  for (let i = 1; i < nx - 1; i++) for (let j = 1; j < ny - 1; j++) {
    const k = i * ny + j; if (!inRegion(k)) continue;
    const dk = d2[k]; let ok = true;
    for (let a = -1; a <= 1 && ok; a++) for (let b = -1; b <= 1; b++) { if (!a && !b) continue; const m = (i + a) * ny + (j + b); if (inRegion(m) && d2[m] > dk) { ok = false; break; } }
    if (ok) ridge[k] = 1;
  }
  let best = Infinity, at = null;
  const N8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  // the distance ALONG THE RIDGE to its nearest END (a ridge cell with at
  // most one ridge neighbour — a cusp's tip, where two edges meet), by a
  // multi-source Dijkstra over the ridge's own cells. A cell within
  // CUSP_MM of an end is the cusp's own approach, not a gap: a sharp cusp is
  // narrow all the way to its tip, so no multiple of its width can tell it
  // from a slit, but a length can (charter §19).
  const toEnd = new Float64Array(nx * ny).fill(Infinity), heap = [];
  const push = (k, d) => { heap.push([d, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  for (let i = 1; i < nx - 1; i++) for (let j = 1; j < ny - 1; j++) {
    const k = i * ny + j; if (!ridge[k]) continue;
    let deg = 0; for (const [a, b] of N8) if (ridge[(i + a) * ny + (j + b)]) deg++;
    if (deg <= 1) { toEnd[k] = 0; push(k, 0); }
  }
  while (heap.length) {
    const [d, k] = pop(); if (d > toEnd[k]) continue;
    const i = Math.floor(k / ny), j = k % ny;
    for (const [a, b] of N8) { const m = (i + a) * ny + (j + b); if (!ridge[m]) continue; const nd = d + (a && b ? Math.SQRT2 : 1) * cell; if (nd < toEnd[m]) { toEnd[m] = nd; push(m, nd); } }
  }
  for (let i = 2; i < nx - 2; i++) for (let j = 2; j < ny - 2; j++) {
    const k = i * ny + j; if (!ridge[k] || toEnd[k] < CUSP_MM) continue;
    const dk = d2[k]; let localMin = true, opposite = false;
    const nb = N8.map(([a, b]) => ridge[(i + a) * ny + (j + b)] ? d2[(i + a) * ny + (j + b)] : -1);
    for (let q = 0; q < 8; q++) { if (nb[q] >= 0 && nb[q] < dk) localMin = false; if (nb[q] >= 0 && (nb[(q + 3) % 8] >= 0 || nb[(q + 4) % 8] >= 0 || nb[(q + 5) % 8] >= 0)) opposite = true; }
    if (!localMin || !opposite) continue;
    const w = (2 * Math.sqrt(dk) - 1) * cell;
    if (w < best) { best = w; at = [R.gx(i), R.gy(j)]; }
  }
  return { mm: best, at };
}

/* The report (cell: the rays' pitch in mm). */
export function measurePrint(relief, { cell = 0.1 } = {}) {
  const X = F32(relief.positions), I = relief.indices, shell = shellOf(relief);
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < X.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], X[i + k]); hi[k] = Math.max(hi[k], X[i + k]); }
  const v = verticalRays(X, I, shell, cell), R = v.raster;
  const solid = (k) => R.top[k] >= 0, empty = (k) => R.top[k] < 0;
  const feature = narrowest(R, edt2(R.nx, R.ny, empty), solid);
  // the empty cells reached from the margin are OUTSIDE, never a gap
  const outside = new Uint8Array(R.nx * R.ny), stack = [0];
  outside[0] = 1;
  while (stack.length) { const k = stack.pop(), i = Math.floor(k / R.ny), j = k % R.ny; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= R.nx || jj >= R.ny) continue; const m = ii * R.ny + jj; if (empty(m) && !outside[m]) { outside[m] = 1; stack.push(m); } } }
  const gap = narrowest(R, edt2(R.nx, R.ny, solid), (k) => empty(k) && !outside[k]);
  const tris = I.length / 3;
  return {
    box: { x: hi[0] - lo[0], y: hi[1] - lo[1], z: hi[2] - lo[2], lo, hi },
    heightMm: hi[2], abovePlateMm: hi[2] - relief.plateT, plateT: relief.plateT,
    backZ: lo[2], rest: v.rest, rays: v.rays, oddRays: v.odd, overhangRays: v.multi, thinMm: v.thin,
    volumeMm3: v.volume, cell, feature, gap,
    triangles: tris, bytes: 84 + 50 * tris, shells: relief.parts.length,
  };
}
