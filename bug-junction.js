/* bug-junction.js — the WING–BODY JUNCTION BLEND (design doc §16).

   Pure ES module: no DOM, no three.js. bug-geometry.js calls junctionBlend()
   once per build, on the ASSEMBLED top-down silhouette of the right half (the
   body and every right wing, in world millimetres), and hands each wing back a
   new outline that its slab is built over. Nothing here knows what a library
   shape, a blend, a tail or a wing angle is: the rule runs on the silhouette,
   so it acts identically on all of them.

   THE RULE. A morphological CLOSING of the silhouette by a disc of radius r:
   every point of empty space that no r-disc lying wholly in empty space can
   cover is filled. That removes every gap between a wing and the body that is
   narrower than about 2r (a slot, a wedge's narrow end) and rounds every
   remaining concave wing–body corner with an r fillet — one operation, both
   halves of the brief. Only fill that touches a wing AND reaches to within r
   of the body is kept (two wings crossing AT the body's edge close a pocket
   the body bounds at a point): a notch in a wing's own outline far from the
   body, or a gap between two wings out along the span, is not the junction
   and is left as drawn. A fill that
   touches more than one wing belongs to the BACKMOST of them (the highest pair
   index): the SVG draws the front pair over the back one (drawOrder), so the
   fill slides under the forewing rather than standing on top of it.

   EMBEDMENT. The old root tab (a rectangle carried `embed` mm into the thorax)
   is replaced: the wing and its fill are swept TOWARD THE MIDLINE (-x) inside
   the body by `embedMm`, but only from where they actually meet the body — the
   body pixels inside or beside the wing's own footprint (or its fill's). So the
   buried part follows the attachment and never runs along the body's side past
   it, where it would show as a shelf; and it never leaves the body's silhouette,
   where no burial could hide it (design doc §16.3).

   HOW. A raster at JUNCTION_RES of r (anchored at multiples of the pixel, so
   two builds that differ only far from the body — a tail — see the same pixels
   near it), the closing as two exact Euclidean distance transforms
   (Felzenszwalb–Huttenlocher), components labelled, then each wing's region
   traced back to a polygon: the stretches of the DRAWN outline the fill does not
   touch are kept vertex for vertex (so the silhouette there IS the drawn
   outline, exactly), and only the new stretches come from the raster —
   contoured on a smoothed indicator, resampled, smoothed, and joined to the
   drawn outline with its own tangent. The x < 0 strip is the mirror image of
   the right half, so the closing near the midline sees the left wings it would
   see on the real model. */

/* ------------------------------------------------------------------ */
/* Exact Euclidean distance transform (Felzenszwalb–Huttenlocher)      */
/* ------------------------------------------------------------------ */

export function edt1(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
}
/* squared distance (in pixels^2) from every pixel to the nearest pixel where `src` is set */
export function edt2(src, nx, ny) {
  const INF = 1e20, out = new Float64Array(nx * ny), m = Math.max(nx, ny);
  const f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1);
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) f[y] = src[y * nx + x] ? 0 : INF;
    edt1(f, ny, d, v, z);
    for (let y = 0; y < ny; y++) out[y * nx + x] = d[y];
  }
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) f[x] = out[y * nx + x];
    edt1(f, nx, d, v, z);
    for (let x = 0; x < nx; x++) out[y * nx + x] = d[x];
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

export const JUNCTION_TUCK_PX = 3;          // a fill meeting another wing (or a wing abutting the one in front) runs this many pixels on under it — past the trace's 2.5-pixel exposure probe, so the edge it covers reads as covered
export const JUNCTION_RES = 1 / 12;       // pixel = r / 12 (clamped below): a fillet of radius r is drawn by about 19 pixels a quarter turn, then contoured and smoothed
export const JUNCTION_PIXEL_MM = [0.03, 0.08];   // the pixel's range in mm (a large r is not drawn finer than it needs; a small one not coarser than 0.08)
export const JUNCTION_REACH = [6, 2];     // the raster reaches 6 r + 2 mm past the body: a fill reaching further is a wedge narrower than 2r over 6r of length (narrower than 19 degrees)
export const JUNCTION_STEP_MM = 0.25;     // the new stretches of outline are resampled to this spacing before they are smoothed (a 1 mm fillet at 0.25 mm chords is within 0.008 mm of its arc)
export const JUNCTION_JOIN_MM = 0.6;      // over this much arc a new stretch turns into the drawn outline's own tangent
const SMOOTH_ITERS = 6;
export const JUNCTION_NEAR_PX = 1.5;      // a traced point within this many pixels of the drawn outline is the drawn outline
export const JUNCTION_CLEAR_MM = 0.01;    // a new point never stands closer than this to the drawn outline (it is outside the drawn wing)

/* ------------------------------------------------------------------ */
/* Small 2D helpers                                                     */
/* ------------------------------------------------------------------ */

const hyp = Math.hypot;
function area2(P) { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a; }
export function pointInPoly(P, x, y) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[i], b = P[j];
    if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function segDist(px, py, a, b) {
  const ex = b[0] - a[0], ey = b[1] - a[1], L2 = ex * ex + ey * ey || 1e-30;
  const t = Math.max(0, Math.min(1, ((px - a[0]) * ex + (py - a[1]) * ey) / L2));
  return hyp(px - a[0] - t * ex, py - a[1] - t * ey);
}

/* Even-odd scanline fill at pixel centres: set `bit` in mask for every pixel
   whose centre lies inside the closed polygon P. */
function fillPoly(mask, nx, ny, gx, gy, h, P, bit) {
  let y0 = Infinity, y1 = -Infinity;
  for (const q of P) { if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
  const j0 = Math.max(0, Math.floor((y0 - gy) / h - 0.5)), j1 = Math.min(ny - 1, Math.ceil((y1 - gy) / h - 0.5));
  const xs = [];
  for (let j = j0; j <= j1; j++) {
    const yc = gy + (j + 0.5) * h; xs.length = 0;
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k] - gx) / h - 0.5)), i1 = Math.min(nx - 1, Math.floor((xs[k + 1] - gx) / h - 0.5));
      for (let i = i0; i <= i1; i++) mask[j * nx + i] |= bit;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Marching squares on a scalar field (inside where f < level)          */
/* ------------------------------------------------------------------ */

/* Closed loops of the level set, each a list of [x, y] in world mm, walked
   with the inside on the LEFT (so an outer boundary comes out CCW). A saddle
   is resolved by the cell's own centre value. */
function contourLoops(f, nx, ny, gx, gy, h, level) {
  const ins = (i, j) => f[j * nx + i] < level;
  const P = (i, j) => [gx + (i + 0.5) * h, gy + (j + 0.5) * h];
  // edge ids: horizontal edge (i,j)-(i+1,j) -> 2*(j*nx+i); vertical (i,j)-(i,j+1) -> 2*(j*nx+i)+1
  const pt = new Map();
  const cross = (i0, j0, i1, j1, id) => {
    let p = pt.get(id);
    if (p) return id;
    const a = f[j0 * nx + i0] - level, b = f[j1 * nx + i1] - level, t = a / (a - b);
    const A = P(i0, j0), B = P(i1, j1);
    pt.set(id, [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]);
    return id;
  };
  const next = new Map();
  for (let j = 0; j + 1 < ny; j++) for (let i = 0; i + 1 < nx; i++) {
    const c = [ins(i, j), ins(i + 1, j), ins(i + 1, j + 1), ins(i, j + 1)];
    const k = (c[0] ? 1 : 0) + (c[1] ? 2 : 0) + (c[2] ? 4 : 0) + (c[3] ? 8 : 0);
    if (k === 0 || k === 15) continue;
    // the four cell edges in CCW order, each from corner a to corner b
    const E = [
      [i, j, i + 1, j, 2 * (j * nx + i)],             // bottom: c0 -> c1
      [i + 1, j, i + 1, j + 1, 2 * (j * nx + i + 1) + 1],   // right: c1 -> c2
      [i, j + 1, i + 1, j + 1, 2 * ((j + 1) * nx + i)],     // top: c2 -> c3 (stored c3 -> c2)
      [i, j, i, j + 1, 2 * (j * nx + i) + 1],         // left: c3 -> c0 (stored c0 -> c3)
    ];
    const exits = [], entries = [];
    for (let e = 0; e < 4; e++) {
      const a = c[e], b = c[(e + 1) % 4];
      if (a === b) continue;
      const [i0, j0, i1, j1, id] = E[e];
      cross(i0, j0, i1, j1, id);
      (a ? exits : entries).push(e);
    }
    const centreIn = (f[j * nx + i] + f[j * nx + i + 1] + f[(j + 1) * nx + i + 1] + f[(j + 1) * nx + i]) / 4 < level;
    for (const x of exits) {
      // inside on the left: from an exit crossing to the next entry crossing
      // CCW (a saddle whose centre is outside pairs with the previous one instead)
      let best = -1;
      const order = entries.length === 2 && !centreIn ? [3, 2, 1] : [1, 2, 3];
      for (const dlt of order) { const e = (x + dlt) % 4; if (entries.includes(e)) { best = e; break; } }
      next.set(E[x][4], E[best][4]);
    }
  }
  const loops = [], used = new Set();
  for (const start of next.keys()) {
    if (used.has(start)) continue;
    const L = []; let e = start, guard = 0;
    while (!used.has(e) && guard++ < 1e7) { used.add(e); L.push(pt.get(e)); e = next.get(e); if (e === undefined) break; }
    if (L.length >= 3) loops.push(L);
  }
  return loops;
}

/* ------------------------------------------------------------------ */
/* Polyline utilities                                                   */
/* ------------------------------------------------------------------ */

function resample(L, step) {
  const cum = [0];
  for (let i = 1; i < L.length; i++) cum.push(cum[i - 1] + hyp(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]));
  const tot = cum[cum.length - 1];
  if (!(tot > 0)) return L.map((q) => q.slice());
  const n = Math.max(1, Math.round(tot / step)), out = [];
  let k = 0;
  for (let s = 0; s <= n; s++) {
    const t = (tot * s) / n;
    while (k + 1 < cum.length - 1 && cum[k + 1] < t) k++;
    const seg = cum[k + 1] - cum[k] || 1e-30, u = Math.max(0, Math.min(1, (t - cum[k]) / seg));
    out.push([L[k][0] + (L[k + 1][0] - L[k][0]) * u, L[k][1] + (L[k + 1][1] - L[k][1]) * u]);
  }
  out[0] = L[0].slice(); out[out.length - 1] = L[L.length - 1].slice();
  return out;
}
function smoothOpen(L, iters) {
  let A = L.map((q) => q.slice());
  for (let it = 0; it < iters; it++) {
    const B = A.map((q) => q.slice());
    for (let i = 1; i + 1 < A.length; i++) for (let c = 0; c < 2; c++) B[i][c] = 0.25 * A[i - 1][c] + 0.5 * A[i][c] + 0.25 * A[i + 1][c];
    A = B;
  }
  return A;
}
/* Douglas–Peucker: mark in keep[] the points of R[i..j] (ends kept) needed to
   hold the polyline within tol. */
function dp(R, i, j, tol, keep) {
  keep[i] = 1; keep[j] = 1;
  let bi = -1, bd = tol;
  for (let k = i + 1; k < j; k++) { const d = segDist(R[k][0], R[k][1], R[i], R[j]); if (d > bd) { bd = d; bi = k; } }
  if (bi >= 0) { dp(R, i, bi, tol, keep); dp(R, bi, j, tol, keep); }
}
/* Replace the first `len` mm of the open run R by a cubic Hermite from R[0]
   leaving along `t0` (a unit tangent) into the run at arc `len`, along the
   run's own tangent there. Same at the other end with `t1` (arriving). */
function hermiteEnds(R, t0, t1, len) {
  const cum = [0];
  for (let i = 1; i < R.length; i++) cum.push(cum[i - 1] + hyp(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]));
  const tot = cum[cum.length - 1];
  const ell = Math.min(len, tot / 3);
  if (!(ell > 1e-6)) return R;
  const at = (s) => {
    let k = 0; while (k + 1 < cum.length - 1 && cum[k + 1] < s) k++;
    const seg = cum[k + 1] - cum[k] || 1e-30, u = Math.max(0, Math.min(1, (s - cum[k]) / seg));
    const p = [R[k][0] + (R[k + 1][0] - R[k][0]) * u, R[k][1] + (R[k + 1][1] - R[k][1]) * u];
    const dx = R[k + 1][0] - R[k][0], dy = R[k + 1][1] - R[k][1], l = hyp(dx, dy) || 1;
    return { p, t: [dx / l, dy / l], k };
  };
  const herm = (P0, T0, P1, T1, m) => {
    const out = [];
    for (let i = 1; i < m; i++) {
      const s = i / m, s2 = s * s, s3 = s2 * s;
      const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
      out.push([h00 * P0[0] + h10 * T0[0] + h01 * P1[0] + h11 * T1[0], h00 * P0[1] + h10 * T0[1] + h01 * P1[1] + h11 * T1[1]]);
    }
    return out;
  };
  const m = Math.max(3, Math.round(ell / (JUNCTION_STEP_MM / 2)));
  const A = at(ell), B = at(tot - ell);
  const head = [R[0], ...herm(R[0], [t0[0] * ell, t0[1] * ell], A.p, [A.t[0] * ell, A.t[1] * ell], m), A.p];
  const tail = [B.p, ...herm(B.p, [B.t[0] * ell, B.t[1] * ell], R[R.length - 1], [t1[0] * ell, t1[1] * ell], m), R[R.length - 1]];
  const mid = [];
  for (let i = 0; i < R.length; i++) if (cum[i] > ell + 1e-9 && cum[i] < tot - ell - 1e-9) mid.push(R[i]);
  return [...head, ...mid, ...tail];
}

/* ------------------------------------------------------------------ */
/* The blend                                                            */
/* ------------------------------------------------------------------ */

/* input:
     body  { outline: the right half's silhouette, an open polyline from
             (0, yMin) up the right side to (0, yMax); rxMax; yMin; yMax }
     wings [{ poly: the DRAWN planform in world mm (closed, CCW, its root chord
             included), densified so no edge is longer than a couple of pixels
             (the swallowed stretch is found per point); keep: per point, whether
             it is one of the drawn outline's own vertices (a densifying point is
             kept in the result only where a kept stretch starts or ends) }]
     r     the closing radius (mm, > 0)
     embedMm  how far the attachment is swept into the body
   returns { h, perWing: [ { outline: [[x, y], ...] CCW, src: [i or -1], inBody: [bool], added: mm^2 of fill,
             fill: [loops of the fill region alone], ok, why } ] } */
export function junctionBlend({ body, wings, r, embedMm }) {
  const h = Math.max(JUNCTION_PIXEL_MM[0], Math.min(JUNCTION_PIXEL_MM[1], r * JUNCTION_RES));
  const reach = JUNCTION_REACH[0] * r + JUNCTION_REACH[1];
  // the window: anchored at multiples of h, sized from the body and r alone
  const m = Math.ceil((3 * r + 2 * h) / h);                 // mirror strip pixels (x < 0)
  const gx = -m * h;
  const nxI = m + Math.ceil((body.rxMax + reach) / h);
  const gyI = Math.floor((body.yMin - reach) / h) * h;
  const nyI = Math.ceil((body.yMax + reach - gyI) / h);
  /* THE TRACE'S MARGIN. The closing is the window's (above), but the raster
     reaches further, by the longest drawn edge that crosses the window's edge
     and 10 pixels (the trace's own 3-pixel pad, the exposure probe's 2.5 and
     the 4 a stretch's end is held to): a kept stretch of drawn outline begins
     and ends on a drawn VERTEX, so the vertex a stretch is trimmed back to can
     stand one drawn edge beyond the last pixel the blend added — and where
     that pixel was near the window's edge, the vertex was outside it, where no
     traced boundary passes (measured: lib #18 at r 0.25-0.5, its hindwing's
     wedge fill reaching x 5.6 against a window edge at 6.46, the vertex one
     2.2 mm edge further out, 0.50 mm off the trace, and the pair falling back
     to its drawn root). Out there the raster holds the wings and nothing else:
     no fill is found, no free disc is centred and no tuck is run outside the
     window, so the closing is the window's to the pixel. */
  let edgeOut = 0;
  {
    const x0 = gx, x1 = gx + nxI * h, y0 = gyI, y1 = gyI + nyI * h;
    const inW = (q) => q[0] >= x0 && q[0] <= x1 && q[1] >= y0 && q[1] <= y1;
    for (const wg of wings) {
      const P = wg.poly, n = P.length, K = [];
      for (let i = 0; i < n; i++) if (!wg.keep || wg.keep[i]) K.push(i);
      for (let e = 0; e < K.length; e++) {
        const a = K[e], b = K[(e + 1) % K.length];
        let sIn = false, sOut = false;
        for (let i = a; ; i = (i + 1) % n) { if (inW(P[i])) sIn = true; else sOut = true; if (i === b) break; }
        if (sIn && sOut) edgeOut = Math.max(edgeOut, hyp(P[b][0] - P[a][0], P[b][1] - P[a][1]));
      }
    }
  }
  const ext = Math.ceil(edgeOut / h) + 10;
  const nx = nxI + ext, gy = gyI - ext * h, ny = nyI + 2 * ext;
  const inner = (i, j) => i < nxI && j >= ext && j < ext + nyI;   // the closing's window
  const N = nx * ny;
  const BODY = 1, MIRROR = 128;
  const mask = new Uint8Array(N);
  const bodyPoly = [...body.outline, [0, body.outline[0][1]]];
  // the right half's body outline closed along x = 0
  fillPoly(mask, nx, ny, gx, gy, h, body.outline, BODY);
  const nw = wings.length;
  for (let k = 0; k < nw; k++) {
    fillPoly(mask, nx, ny, gx, gy, h, wings[k].poly, 2 << k);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of wings[k].poly) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    wings[k].bbox = { i0: Math.floor((x0 - gx) / h), i1: Math.ceil((x1 - gx) / h), j0: Math.floor((y0 - gy) / h), j1: Math.ceil((y1 - gy) / h) };
  }
  // x < 0: the mirror of x > 0 (pixel i < m mirrors pixel 2m - 1 - i), and
  // a right wing's own material that crosses the midline keeps its own bit
  // there (its region may run across the midline, as the drawn wing does)
  const WINGS = 0x7e;
  for (let j = 0; j < ny; j++) for (let i = 0; i < m; i++) {
    const s = mask[j * nx + (2 * m - 1 - i)];
    mask[j * nx + i] = (s ? MIRROR : 0) | (mask[j * nx + i] & WINGS);
  }
  // the closing, on the window alone (outside it nothing is solid and no disc
  // is centred — exactly the window's own edge, as if the raster ended there)
  const solid = new Uint8Array(N);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const q = j * nx + i; solid[q] = mask[q] && inner(i, j) ? 1 : 0; }
  const R2 = (r / h) ** 2;
  const d1 = edt2(solid, nx, ny);
  const C = new Uint8Array(N);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const q = j * nx + i; C[q] = d1[q] >= R2 && inner(i, j) ? 1 : 0; }
  const d2 = edt2(C, nx, ny);
  // fill: in the closing (no free r-disc covers it), empty, on the right half
  const fill = new Uint8Array(N);
  for (let j = 0; j < ny; j++) for (let i = m; i < nx; i++) { const q = j * nx + i; if (inner(i, j) && !solid[q] && d2[q] > R2) fill[q] = 1; }
  // components of the fill (8-connected); keep those touching a wing and
  // reaching to within r of the body — not only those touching it: two wings
  // whose edges cross AT the body's edge close a pocket between them that the
  // body bounds at a point, not along a pixel edge (measured: a root pinch of
  // 0.45 opened a lens 0.75 mm wide and 2.5 mm long between the forewing's
  // trailing edge and the hindwing's leading edge, its apex on the body's
  // edge, and a contact test left it empty)
  // (on the columns within r of the body only: every body pixel is there, so
  // the distances there are exact, and a pixel past them is further than r)
  const nb = Math.min(nx, m + Math.ceil((body.rxMax + r) / h) + 2);
  const bodyPx = new Uint8Array(nb * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nb; i++) bodyPx[j * nb + i] = mask[j * nx + i] & (BODY | MIRROR) ? 1 : 0;
  const dB0 = edt2(bodyPx, nb, ny);
  const nearBody = (q) => { const i = q % nx; return i < nb && dB0[((q - i) / nx) * nb + i] <= R2; };
  const comp = new Int32Array(N).fill(-1), comps = [];
  const stack = new Int32Array(N);
  for (let s = 0; s < N; s++) {
    if (!fill[s] || comp[s] >= 0) continue;
    const id = comps.length, info = { id, n: 0, body: false, wings: 0, i0: nx, i1: -1, j0: ny, j1: -1 };
    comps.push(info); comp[s] = id; let sp = 0; stack[sp++] = s;
    while (sp) {
      const q = stack[--sp]; info.n++;
      if (!info.body && nearBody(q)) info.body = true;
      const i = q % nx, j = (q - i) / nx;
      if (i < info.i0) info.i0 = i; if (i > info.i1) info.i1 = i; if (j < info.j0) info.j0 = j; if (j > info.j1) info.j1 = j;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ii = i + di, jj = j + dj;
        if (ii < m || jj < 0 || ii >= nx || jj >= ny) continue;
        const t = jj * nx + ii;
        if (fill[t]) { if (comp[t] < 0) { comp[t] = id; stack[sp++] = t; } continue; }
        if (di && dj) continue;                        // contacts are 4-neighbours
        if (mask[t] & BODY) info.body = true;
        info.wings |= mask[t] & ~(BODY | MIRROR);
      }
    }
  }
  const owner = comps.map((c) => {
    if (!c.body || !c.wings) return -1;
    let k = -1; for (let b = 0; b < nw; b++) if (c.wings & (2 << b)) k = b;
    return k;
  });
  const G = Math.max(1, Math.round(embedMm / h));
  const perWing = [];
  for (let k = 0; k < nw; k++) {
    const wbit = 2 << k;
    // the region of interest: the wing's own pixels, the fill it owns, and
    // the body beside them (the embedment), padded so its border is empty
    let i0 = nx, i1 = -1, j0 = ny, j1 = -1;
    const wb = wings[k].bbox;   // the wing polygon's bounding box, in pixels
    i0 = Math.max(0, wb.i0); i1 = Math.min(nx - 1, wb.i1); j0 = Math.max(0, wb.j0); j1 = Math.min(ny - 1, wb.j1);
    for (const c of comps) if (owner[c.id] === k) { i0 = Math.min(i0, c.i0); i1 = Math.max(i1, c.i1); j0 = Math.min(j0, c.j0); j1 = Math.max(j1, c.j1); }
    i0 = Math.max(0, Math.min(i0, m) - 2); j0 = Math.max(0, j0 - 2); i1 = Math.min(nx - 1, i1 + 2); j1 = Math.min(ny - 1, j1 + 2);
    if (i1 < i0 || j1 < j0) { perWing.push({ ok: false, why: 'the wing is outside the junction window' }); continue; }
    const sx = i1 - i0 + 1, sy = j1 - j0 + 1, NS = sx * sy;
    const Q = (i, j) => (j + j0) * nx + (i + i0);         // sub-window pixel -> window pixel
    // the footprint: the wing and the fill it owns
    const foot = new Uint8Array(NS);
    let fillPx = 0;
    for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) {
      const q = Q(i, j);
      if (mask[q] & wbit) foot[j * sx + i] = 1;
      else if (fill[q] && owner[comp[q]] === k) { foot[j * sx + i] = 1; fillPx++; }
    }
    // where the fill it owns meets ANOTHER wing it runs JUNCTION_TUCK_PX pixels
    // on under that wing (overlapping closed shells union; a fill stopped AT
    // the other wing's edge leaves a crack under a pixel wide between them —
    // 0.004..0.04 mm measured, between a hindwing's fill and the forewing above)
    const tuck = new Uint8Array(NS);
    for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) {
      const q = Q(i, j);
      if (!(fill[q] && owner[comp[q]] === k)) continue;
      for (let dj = -JUNCTION_TUCK_PX; dj <= JUNCTION_TUCK_PX; dj++) for (let di = -JUNCTION_TUCK_PX; di <= JUNCTION_TUCK_PX; di++) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= sx || jj >= sy || di * di + dj * dj > JUNCTION_TUCK_PX * JUNCTION_TUCK_PX) continue;
        const t = Q(ii, jj);
        if (ii + i0 >= m && inner(ii + i0, jj + j0) && (mask[t] & WINGS & ~wbit) && !foot[jj * sx + ii]) tuck[jj * sx + ii] = 1;
      }
    }
    // and where this wing ABUTS a pair in front of it (drawn over it) without
    // overlapping it — a pixel of its own within two pixels of a pixel that is
    // only the other's — the two outlines run within a pixel or two of each
    // other: a crack the closing cannot see (0.05..0.08 mm, measured, between
    // library pairs drawn edge to edge). It runs JUNCTION_TUCK_PX pixels on
    // under that wing too (the empty pixels between are then enclosed, and
    // filled with the region's holes).
    const front = WINGS & ((wbit - 1) & ~BODY);       // the wings in front: lower pair indices
    // (the "within two pixels" test is one dilation of the front-only pixels
    // by a 5 x 5 square, rows then columns — the same set a 5 x 5 scan of
    // every own pixel finds, at a fraction of the cost)
    const seam = [];
    {
      const near = new Uint8Array(NS), row = new Uint8Array(NS);
      for (let j = 0; j < sy; j++) { const b = (j + j0) * nx + i0; for (let i = 0; i < sx; i++) { const v = mask[b + i]; if ((v & front) && !(v & wbit)) for (let d = Math.max(0, i - 2); d <= Math.min(sx - 1, i + 2); d++) row[j * sx + d] = 1; } }
      for (let i = 0; i < sx; i++) for (let j = 0; j < sy; j++) if (row[j * sx + i]) for (let d = Math.max(0, j - 2); d <= Math.min(sy - 1, j + 2); d++) near[d * sx + i] = 1;
      for (let j = 0; j < sy; j++) { const b = (j + j0) * nx + i0; for (let i = 0; i < sx; i++) { const v = mask[b + i]; if (i + i0 >= m && (v & wbit) && !(v & front) && near[j * sx + i]) seam.push([i, j]); } }
    }
    // (inside the closing's window only: see the trace's margin, above)
    const inMargin = (ii, jj) => !inner(ii + i0, jj + j0);
    for (const [i, j] of seam) for (let dj = -JUNCTION_TUCK_PX; dj <= JUNCTION_TUCK_PX; dj++) for (let di = -JUNCTION_TUCK_PX; di <= JUNCTION_TUCK_PX; di++) {
      const ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= sx || jj >= sy || di * di + dj * dj > JUNCTION_TUCK_PX * JUNCTION_TUCK_PX || ii + i0 < m || inMargin(ii, jj)) continue;
      if ((mask[Q(ii, jj)] & front) && !foot[jj * sx + ii]) tuck[jj * sx + ii] = 1;
    }
    for (let s = 0; s < NS; s++) if (tuck[s]) foot[s] = 1;
    // EMBED: body pixels in or beside the footprint, swept toward the midline
    const R = foot.slice();
    for (let j = 0; j < sy; j++) {
      let last = Infinity;                           // the nearest seed to the right in this row's body run
      for (let i = sx - 1; i >= 0; i--) {
        const s = j * sx + i;
        if (i + i0 < m || !(mask[Q(i, j)] & BODY)) { last = Infinity; continue; }   // (the body's own pixels, right half)
        const seed = foot[s] || (i + 1 < sx && foot[s + 1]) || (j > 0 && foot[s - sx]) || (j + 1 < sy && foot[s + sx]) || (i > 0 && foot[s - 1]);
        if (seed) last = i;
        if (last - i <= G) R[s] = 1;
      }
    }
    // the component holding the most of the wing (4-connected), holes filled
    const own = new Uint8Array(NS);
    for (let j = 0; j < sy; j++) { const b = (j + j0) * nx + i0; for (let i = 0; i < sx; i++) own[j * sx + i] = mask[b + i] & wbit ? 1 : 0; }
    const lab = new Int32Array(NS).fill(-1), wn = [];
    for (let s0 = 0; s0 < NS; s0++) {
      if (!R[s0] || lab[s0] >= 0) continue;
      const id = wn.length; wn.push(0); lab[s0] = id; let sp = 0; stack[sp++] = s0;
      while (sp) {
        const s = stack[--sp]; const i = s % sx, j = (s - i) / sx;
        if (own[s]) wn[id]++;
        if (i > 0 && R[s - 1] && lab[s - 1] < 0) { lab[s - 1] = id; stack[sp++] = s - 1; }
        if (i + 1 < sx && R[s + 1] && lab[s + 1] < 0) { lab[s + 1] = id; stack[sp++] = s + 1; }
        if (j > 0 && R[s - sx] && lab[s - sx] < 0) { lab[s - sx] = id; stack[sp++] = s - sx; }
        if (j + 1 < sy && R[s + sx] && lab[s + sx] < 0) { lab[s + sx] = id; stack[sp++] = s + sx; }
      }
    }
    let best = -1; for (let c = 0; c < wn.length; c++) if (best < 0 || wn[c] > wn[best]) best = c;
    const Rk = new Uint8Array(NS);
    for (let s = 0; s < NS; s++) Rk[s] = lab[s] === best && best >= 0 ? 1 : 0;
    // holes: empty pixels the sub-window's border cannot reach (8-connected outside)
    const out = new Uint8Array(NS); let sp = 0;
    for (let i = 0; i < sx; i++) for (const j of [0, sy - 1]) { const s = j * sx + i; if (!Rk[s] && !out[s]) { out[s] = 1; stack[sp++] = s; } }
    for (let j = 0; j < sy; j++) for (const i of [0, sx - 1]) { const s = j * sx + i; if (!Rk[s] && !out[s]) { out[s] = 1; stack[sp++] = s; } }
    while (sp) {
      const s = stack[--sp]; const i = s % sx, j = (s - i) / sx;
      const i0n = i > 0 ? -1 : 0, i1n = i + 1 < sx ? 1 : 0, j0n = j > 0 ? -1 : 0, j1n = j + 1 < sy ? 1 : 0;
      for (let dj = j0n; dj <= j1n; dj++) { const r0 = s + dj * sx; for (let di = i0n; di <= i1n; di++) { const t = r0 + di; if (!Rk[t] && !out[t]) { out[t] = 1; stack[sp++] = t; } } }
    }
    // what the blend ADDS to the drawn wing (fill + embedment + filled holes)
    const added = new Uint8Array(NS);
    let addedPx = 0;
    for (let s = 0; s < NS; s++) {
      if (!out[s]) Rk[s] = 1;
      if (Rk[s] && !own[s]) { added[s] = 1; addedPx++; }
    }
    const sub = { nx: sx, ny: sy, gx: gx + i0 * h, gy: gy + j0 * h, h, m: Math.max(0, m - i0), BODY, i0, j0, wnx: nx, wny: ny, wm: m };
    const bodyAt = (i, j) => {   // window body test (the mirror strip reads its mirror)
      if (i < 0 || j < 0 || i >= nx || j >= ny) return false;
      return !!(i >= m ? mask[j * nx + i] & BODY : mask[j * nx + (2 * m - 1 - i)] & BODY);
    };
    perWing.push(traceWing(wings[k].poly, wings[k].keep || null, Rk, added, bodyAt, sub, { fillMm2: fillPx * h * h, addedMm2: addedPx * h * h }));
  }
  return { h, window: { gx, gy, nx, ny, m }, perWing };
}

/* One wing's new outline: the drawn outline where nothing was added beside it,
   the region's own traced boundary everywhere else. */
function traceWing(D, keep, Rk, added, bodyAt, g, stats) {
  const { nx, ny, gx, gy, h } = g;
  // window pixel of a point (the body test reads the whole window)
  const wpx = (x, y) => [Math.floor((x - gx) / h) + g.i0, Math.floor((y - gy) / h) + g.j0];
  const pix = (x, y) => {
    const i = Math.floor((x - gx) / h), j = Math.floor((y - gy) / h);
    return i >= 0 && j >= 0 && i < nx && j < ny ? j * nx + i : -1;
  };
  const n = D.length;
  // EXPOSED: a drawn vertex whose outside (a few pixels along its outward
  // normal) is not something the blend added
  const exposed = new Uint8Array(n);
  const dl = 2.5 * h;
  for (let i = 0; i < n; i++) {
    const a = D[(i + n - 1) % n], p = D[i], b = D[(i + 1) % n];
    let ox = 0, oy = 0;
    for (const [s, t] of [[a, p], [p, b]]) { const dx = t[0] - s[0], dy = t[1] - s[1], l = hyp(dx, dy) || 1; ox += dy / l; oy += -dx / l; }
    const l = hyp(ox, oy) || 1;
    const q = pix(p[0] + (ox / l) * dl, p[1] + (oy / l) * dl);
    exposed[i] = q < 0 || !added[q] ? 1 : 0;
  }
  let ne = 0; for (let i = 0; i < n; i++) ne += exposed[i];
  if (ne === n) {
    const idx = []; for (let i = 0; i < n; i++) if (!keep || keep[i]) idx.push(i);
    return { ok: true, outline: idx.map((i) => D[i].slice()), src: idx, changed: false, ...stats };
  }
  if (ne < 3) return { ok: false, why: 'the blend swallowed the whole drawn outline' };
  // the traced boundary of the region: marching squares on a lightly smoothed
  // indicator, over the region's bounding box padded by 2 pixels
  let i0 = nx, i1 = -1, j0 = ny, j1 = -1;
  for (let q = 0; q < Rk.length; q++) if (Rk[q]) { const i = q % nx, j = (q - i) / nx; if (i < i0) i0 = i; if (i > i1) i1 = i; if (j < j0) j0 = j; if (j > j1) j1 = j; }
  const pad = 3, sx = i1 - i0 + 1 + 2 * pad, sy = j1 - j0 + 1 + 2 * pad;
  let F = new Float64Array(sx * sy);
  for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) {
    const ii = i + i0 - pad, jj = j + j0 - pad;
    F[j * sx + i] = ii >= 0 && jj >= 0 && ii < nx && jj < ny && Rk[jj * nx + ii] ? 1 : 0;
  }
  // [1 2 1]/4 twice in each direction (a binomial blur, sigma about 1 pixel)
  for (let pass = 0; pass < 2; pass++) {
    const T = new Float64Array(sx * sy);
    for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) {
      const a = F[j * sx + Math.max(0, i - 1)], b = F[j * sx + i], c = F[j * sx + Math.min(sx - 1, i + 1)];
      T[j * sx + i] = 0.25 * a + 0.5 * b + 0.25 * c;
    }
    for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) {
      const a = T[Math.max(0, j - 1) * sx + i], b = T[j * sx + i], c = T[Math.min(sy - 1, j + 1) * sx + i];
      F[j * sx + i] = 0.25 * a + 0.5 * b + 0.25 * c;
    }
  }
  // inside where F > 0.5: contour -F at level -0.5
  for (let q = 0; q < F.length; q++) F[q] = -F[q];
  const loops = contourLoops(F, sx, sy, gx + (i0 - pad) * h, gy + (j0 - pad) * h, h, -0.5);
  if (!loops.length) return { ok: false, why: 'the region has no boundary' };
  let Lc = loops[0]; for (const L of loops) if (Math.abs(area2(L)) > Math.abs(area2(Lc))) Lc = L;
  if (area2(Lc) < 0) Lc = Lc.slice().reverse();
  const nc = Lc.length;
  const nearest = (p) => { let bi = 0, bd = Infinity; for (let i = 0; i < nc; i++) { const d = (Lc[i][0] - p[0]) ** 2 + (Lc[i][1] - p[1]) ** 2; if (d < bd) { bd = d; bi = i; } } return { i: bi, d: Math.sqrt(bd) }; };
  // runs of exposed drawn vertices, cyclically. A kept stretch begins and
  // ends on one of the drawn outline's OWN vertices (a densifying point is
  // only a probe): the new stretch then leaves exactly from a drawn vertex,
  // which every consumer of the drawn outline (the venation's cells, above
  // all) already carries.
  if (keep) { const e0 = exposed.slice(); for (let i = 0; i < n; i++) if (!keep[i]) exposed[i] = e0[i] && e0[(i + n - 1) % n] && e0[(i + 1) % n] ? 1 : 0; }
  let s0 = 0; while (exposed[s0] && s0 < n) s0++;       // a swallowed vertex: start there
  const runs = [];
  for (let k = 0, i = s0; k < n; ) {
    if (!exposed[i % n]) { k++; i++; continue; }
    const a = i % n; let len = 0;
    while (exposed[i % n] && k < n) { len++; k++; i++; }
    // trim the run to its first and last drawn vertex
    let a2 = a, len2 = len;
    if (keep) { while (len2 > 0 && !keep[a2]) { a2 = (a2 + 1) % n; len2--; } while (len2 > 0 && !keep[(a2 + len2 - 1) % n]) len2--; }
    if (len2 > 0) runs.push([a2, len2]);
  }
  if (!runs.length) return { ok: false, why: 'no drawn vertex of the outline is left uncovered' };
  // in the body: the pixel and its 4 neighbours are body (the buried part —
  // the slab there is under the body's surface, its outline never an edge)
  const inBodyPx = (x, y) => {
    const [i, j] = wpx(x, y);
    return bodyAt(i, j) && bodyAt(i + 1, j) && bodyAt(i - 1, j) && bodyAt(i, j + 1) && bodyAt(i, j - 1);
  };
  // signed distance from a world point to the drawn outline (+ outside), and
  // the drawn segment it is nearest to, searched over the swallowed stretch
  // end..b (the stretch the new boundary replaces)
  const sdD = (x, y, e, bb) => {
    let d = Infinity, k = e, t = 0;
    for (let i = e; ; i = (i + 1) % n) {
      const a = D[i], c = D[(i + 1) % n], ex = c[0] - a[0], ey = c[1] - a[1], L2 = ex * ex + ey * ey || 1e-30;
      const u = Math.max(0, Math.min(1, ((x - a[0]) * ex + (y - a[1]) * ey) / L2));
      const dd = hyp(x - a[0] - u * ex, y - a[1] - u * ey);
      if (dd < d) { d = dd; k = i; t = u; }
      if (i === bb) break;
    }
    return { d: pointInPoly(D, x, y) ? -d : d, k, t };
  };
  // is drawn index `to` at or past `cur` going forward from e toward bb
  const ahead = (cur, to, e, bb) => ((to - e + n) % n) > ((cur - e + n) % n) && ((to - e + n) % n) <= ((bb - e + n) % n);
  // a new point closer to the drawn outline than JUNCTION_CLEAR_MM (or inside
  // it) is moved out to that distance along the nearest segment's normal
  const pushOut = (q, e, bb) => {
    const s0 = sdD(q[0], q[1], e, bb);
    if (s0.d >= JUNCTION_CLEAR_MM) return q;
    const a = D[s0.k], c = D[(s0.k + 1) % n], ex = c[0] - a[0], ey = c[1] - a[1], l = hyp(ex, ey) || 1;
    const fx = a[0] + s0.t * ex, fy = a[1] + s0.t * ey;     // the foot on the drawn outline; outward = the right normal (CCW)
    return [fx + (ey / l) * JUNCTION_CLEAR_MM, fy - (ex / l) * JUNCTION_CLEAR_MM];
  };
  const outline = [], src = [];
  // the drawn outline's direction of travel ARRIVING at vertex i and LEAVING
  // it — one-sided, never averaged: a new stretch leaves a drawn vertex along
  // the drawn edge it continues (and arrives along the one it hands over to),
  // so the join is C1 with the outline that stays even where the drawn
  // outline has a corner there (a root corner the blend uncovers: averaged,
  // its half-angle kink folded the bead's inset)
  const unit = (p, q) => { const dx = q[0] - p[0], dy = q[1] - p[1], l = hyp(dx, dy) || 1; return [dx / l, dy / l]; };
  const tangentIn = (i) => unit(D[(i + n - 1) % n], D[i]);
  const tangentOut = (i) => unit(D[i], D[(i + 1) % n]);
  for (let r = 0; r < runs.length; r++) {
    const [a, len] = runs[r];
    // the kept stretch: its own two ends (where it leaves and meets the blend)
    // and every drawn vertex between them
    for (let k = 0; k < len; k++) { const i = (a + k) % n; if (!keep || keep[i]) { outline.push(D[i].slice()); src.push(i); } }
    const end = (a + len - 1) % n, [b] = runs[(r + 1) % runs.length];
    // the new stretch: the contour from nearest(end) forward to nearest(b)
    const A = nearest(D[end]), B = nearest(D[b]);
    if (A.d > 4 * h || B.d > 4 * h) return { ok: false, why: 'a kept stretch of the drawn outline is not on the blended region' };
    const seg = [D[end]];
    for (let i = (A.i + 1) % nc; i !== B.i; i = (i + 1) % nc) seg.push(Lc[i]);
    seg.push(D[b]);
    let R = resample(seg, JUNCTION_STEP_MM);
    R = smoothOpen(R, SMOOTH_ITERS);
    /* THE NEW STRETCH STAYS OUTSIDE THE DRAWN WING. Where the traced boundary
       runs along the drawn outline (the closing's fill leaves it tangentially,
       and a raster follows it to within a pixel either side), the drawn
       outline's own vertices are used instead; only the stretches that stand
       clear of it by more than JUNCTION_NEAR_PX pixels are new. So the drawn
       wing is inside the blended one, the two share their common boundary
       vertex for vertex, and the pieces between them (what HOLES triangulates
       beside the cells) are simple polygons. */
    const near = R.map((q, i) => i === 0 || i === R.length - 1 || sdD(q[0], q[1], end, b).d <= JUNCTION_NEAR_PX * h);
    const items = [];      // { d: drawn index } | { p: [x, y] }
    let cur = end;
    const emitDrawn = (to) => { for (let i = (cur + 1) % n; ; i = (i + 1) % n) { if (keep ? keep[i] : true) items.push({ d: i }); if (i === to) break; } cur = to; };
    for (let i = 1; i < R.length; ) {
      if (near[i]) {
        let j = i; while (j + 1 < R.length && near[j + 1]) j++;
        // the drawn vertices this near stretch runs along, up to the one at or before its last point
        let to = j === R.length - 1 ? b : sdD(R[j][0], R[j][1], end, b).k;
        if (!keep) to = to; else while (to !== cur && !keep[to]) to = (to + n - 1) % n;
        if (ahead(cur, to, end, b)) emitDrawn(to);
        i = j + 1;
      } else {
        let j = i; while (j + 1 < R.length && !near[j + 1]) j++;
        const away = R.slice(i, j + 1);
        // C1 into the stretch from the drawn vertex before it, and out of it
        // into the drawn vertex after it (the next near stretch's first)
        // it lands on a drawn vertex AHEAD of the last one emitted (the drawn
        // vertices it passes over are under it, and are not emitted)
        const fwd = (k) => { k %= n; if (keep) while (k !== b && !keep[k]) k = (k + 1) % n; return k; };
        let nx2 = j + 1 < R.length - 1 ? fwd(sdD(R[j + 1][0], R[j + 1][1], end, b).k + 1) : b;
        if (!ahead(cur, nx2, end, b)) nx2 = fwd(cur + 1);
        const A0 = D[cur], B0 = D[nx2];
        const H = hermiteEnds([A0, ...away, B0], tangentIn(cur), tangentOut(nx2), JUNCTION_JOIN_MM);
        for (let k = 1; k + 1 < H.length; k++) items.push({ p: pushOut(H[k], end, b) });
        items.push({ d: nx2 }); cur = nx2;
        i = j + 1;
      }
    }
    if (cur !== b) emitDrawn(b);
    items.pop();           // b itself starts the next kept stretch (it is always the last item)
    // inside the body the outline is not an edge anyone sees: its new
    // stretches there are thinned (Douglas–Peucker to 0.02 mm), so the buried
    // part costs a handful of triangles rather than one every JUNCTION_STEP_MM
    for (let i = 0; i < items.length; ) {
      if (!items[i].p || !inBodyPx(...items[i].p)) { i++; continue; }
      let j = i; while (j + 1 < items.length && items[j + 1].p && inBodyPx(...items[j + 1].p)) j++;
      if (j - i >= 2) {
        const P = items.slice(i, j + 1).map((t) => t.p), kp = new Uint8Array(P.length);
        dp(P, 0, P.length - 1, 0.02, kp);
        for (let k = 1; k < P.length - 1; k++) if (!kp[k]) items[i + k].drop = true;
      }
      i = j + 1;
    }
    for (const t of items) { if (t.drop) continue; if (t.d !== undefined) { outline.push(D[t.d].slice()); src.push(t.d); } else { outline.push(t.p); src.push(-1); } }
  }
  const inBody = outline.map(([x, y]) => { const [i, j] = wpx(x, y); return bodyAt(i, j); });
  return { ok: true, outline, src, inBody, changed: true, ...stats, contour: Lc };
}
