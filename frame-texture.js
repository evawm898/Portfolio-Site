/* frame-texture.js — /frame phase 4: TEXTURE as real displacement of the
   molding's relief surface (charter §12). Pure functions, no DOM,
   Node-importable. Read by frame-relief.js's bandSolid and nothing else; the
   SVG never sees it.

   THE LAW (charter §12.1):
     h(P)      a height in print mm at the UNDISPLACED top-grid point P (print
               mm, x y z) — world-space value noise and cell patterns built
               from Math.imul, floor, products and sqrt only, never from arc
               length, so a closed loop's seam and every mitre show nothing.
               NOT mirrored: a function of x, never |x|.
     D         the direction: normalAt (frame-geometry's one owner) of the
               relief's across-slope read over a quarter of the texture's
               scale, its in-plane part faded to 0 at the band's walls over
               twice the amplitude (the footprint never moves).
     clamp     z + h·D_z >= MIN_FEATURE_MM at every top vertex: inward
               displacement is held LOCALLY and counted — a pit or a crack
               never comes nearer the back than the floor, so it never
               pierces.
     floor     the amplitude (peak-to-valley) asked under MIN_FEATURE_MM is
               built AT it and told.

   Refinement (refineSpine / refineColumns) inserts rows and columns that
   LERP their neighbours' points and normals, so offsetCurve of the refined
   spine is the same ruled surface subdivided and stays the ONE producer of
   every grid point (charter §4, O4). */

import { offsetCurve, normalAt } from './frame-geometry.js';
import { MIN_FEATURE_MM } from './frame-registry.js';

export const TEXTURE_KINDS = ['stone', 'weathering', 'cracks', 'hammered'];
/* samples per texture feature (along and across): the grid step is
   scale / TEXTURE_SAMPLES_PER_FEATURE, a length from a length */
export const TEXTURE_SAMPLES_PER_FEATURE = 6;
/* a crack is at least the floor wide (a narrower groove fills in) */
export const CRACK_WIDTH_FRAC = 0.15;
/* about the fraction of the cell-border network that carries a crack (the
   rest fades out under a smooth noise) */
export const CRACK_KEEP = 0.5;
/* samples across a crack's width */
export const CRACK_SAMPLES = 4;
/* a displacement toward the cross-section's centre of curvature is held at
   this fraction of the local radius (at the radius the offset folds) */
export const CURVE_HOLD = 0.8;

/* ------------------------------------------------------------------ */
/* The spec from the params                                            */
/* ------------------------------------------------------------------ */

export function textureSpec(p) {
  if (!p.texture || p.texture === 'none') return null;
  if (!TEXTURE_KINDS.includes(p.texture)) throw new Error(`texture: unknown kind ${p.texture}`);
  const told = [];
  const scale = +p.textureScale, asked = +p.textureAmplitude;
  let amp = asked;
  if (amp < MIN_FEATURE_MM) { told.push(`texture amplitude ${asked.toFixed(2)} mm built at the ${MIN_FEATURE_MM.toFixed(1)} mm assumed floor (a shallower relief does not print)`); amp = MIN_FEATURE_MM; }
  const crackW = Math.max(MIN_FEATURE_MM, CRACK_WIDTH_FRAC * scale);
  let step = scale / TEXTURE_SAMPLES_PER_FEATURE;
  if (p.texture === 'cracks') step = Math.min(step, crackW / CRACK_SAMPLES);
  return { kind: p.texture, scale, amp, asked, seed: (+p.textureSeed) | 0, step, crackW, told };
}

/* ------------------------------------------------------------------ */
/* Hashing and noise — integer arithmetic, engine-agreed               */
/* ------------------------------------------------------------------ */

function hash4(i, j, k, s) {
  let h = Math.imul(i, 0x27d4eb2d) ^ Math.imul(j, 0x165667b1) ^ Math.imul(k, 0x9e3779b1) ^ Math.imul(s + 0x632be5ab, 0x85ebca77);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;                 // [0, 1)
}
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/* value noise in [-1, 1], quintic, trilinear */
export function valueNoise(x, y, z, seed) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  const u = fade(x - i), v = fade(y - j), w = fade(z - k);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (di, dj, dk) => 2 * hash4(i + di, j + dj, k + dk, seed) - 1;
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v),
    L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
/* three octaves, weights summing to 1: bounded by [-1, 1] */
export function fbm(x, y, z, seed) {
  return 0.57 * valueNoise(x, y, z, seed) + 0.29 * valueNoise(2.03 * x + 17.1, 2.03 * y + 3.7, 2.03 * z, seed + 1) + 0.14 * valueNoise(4.11 * x + 5.3, 4.11 * y + 29.9, 4.11 * z, seed + 2);
}

/* 3-D Worley: the nearest and second-nearest feature points (one per unit
   cell, jittered), the distance to their bisector plane, and the nearest
   cell's id. */
export function worley(x, y, z, seed) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  let d1 = Infinity, d2 = Infinity, p1 = null, p2 = null, id1 = null, id2 = null;
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (let dk = -1; dk <= 1; dk++) {
    const a = i + di, b = j + dj, c = k + dk;
    const fx = a + hash4(a, b, c, seed), fy = b + hash4(a, b, c, seed + 101), fz = c + hash4(a, b, c, seed + 202);
    const dx = fx - x, dy = fy - y, dz = fz - z, d = dx * dx + dy * dy + dz * dz;
    if (d < d1) { d2 = d1; p2 = p1; id2 = id1; d1 = d; p1 = [fx, fy, fz]; id1 = [a, b, c]; }
    else if (d < d2) { d2 = d; p2 = [fx, fy, fz]; id2 = [a, b, c]; }
  }
  const qx = p2[0] - p1[0], qy = p2[1] - p1[1], qz = p2[2] - p1[2];
  const bis = (d2 - d1) / (2 * Math.sqrt(qx * qx + qy * qy + qz * qz));   // distance to the F1/F2 bisector plane
  return { f1: Math.sqrt(d1), f2: Math.sqrt(d2), bis, id1, id2, p1 };
}
/* The distance from (x, y, z) to the boundary of its own Worley cell: the
   least distance to a bisector plane between the nearest feature and any
   other (cells two away included). CONTINUOUS — the F1/F2 bisector distance
   alone jumps where the second-nearest feature changes identity (a crack's
   wall would end on a cliff there, measured on the sheet). */
export function worleyBorder(x, y, z, seed) {
  const w = worley(x, y, z, seed), p1 = w.p1;
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  let best = Infinity;
  for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) for (let dk = -2; dk <= 2; dk++) {
    const a = i + di, b = j + dj, c = k + dk;
    const fx = a + hash4(a, b, c, seed), fy = b + hash4(a, b, c, seed + 101), fz = c + hash4(a, b, c, seed + 202);
    const qx = fx - p1[0], qy = fy - p1[1], qz = fz - p1[2], ql = Math.sqrt(qx * qx + qy * qy + qz * qz);
    if (ql < 1e-12) continue;                    // the nearest feature itself
    const d = ((fx + p1[0]) / 2 - x) * qx / ql + ((fy + p1[1]) / 2 - y) * qy / ql + ((fz + p1[2]) / 2 - z) * qz / ql;
    if (d < best) best = d;
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* The four textures — h in print mm at an undisplaced point            */
/* ------------------------------------------------------------------ */

/* edgeDist: the point's distance (print mm, across the band) to the band's
   nearer wall — read only by weathering's worn edges. */
export function textureHeight(spec, x, y, z, edgeDist) {
  const A = spec.amp, s = spec.scale, sd = spec.seed;
  const X = x / s, Y = y / s, Z = z / s;
  switch (spec.kind) {
    case 'stone': {
      // a grain: fbm, sharpened a little toward its extremes, centred
      const n = fbm(X, Y, Z, sd) / 0.62;
      const c = Math.max(-1, Math.min(1, n));
      return 0.5 * A * c * (1.35 - 0.35 * c * c);
    }
    case 'weathering': {
      // PITS: one per cell where a hash says so, a smooth dish of a hashed
      // radius; WORN EDGES: the arris eased down near each wall, the wear
      // varying along the band by a low noise; a faint grain under both
      let h = 0;
      const i = Math.floor(X), j = Math.floor(Y), k = Math.floor(Z);
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (let dk = -1; dk <= 1; dk++) {
        const a = i + di, b = j + dj, c = k + dk;
        if (hash4(a, b, c, sd + 303) > 0.55) continue;
        const r = 0.22 + 0.2 * hash4(a, b, c, sd + 404);
        const dx = a + hash4(a, b, c, sd) - X, dy = b + hash4(a, b, c, sd + 101) - Y, dz = c + hash4(a, b, c, sd + 202) - Z;
        const q = (dx * dx + dy * dy + dz * dz) / (r * r);
        if (q < 1) { const t = 1 - q; h = Math.min(h, -A * t * t); }
      }
      const wearW = 0.45 * s * (0.6 + 0.4 * (0.5 + 0.5 * valueNoise(X * 0.5 + 7.7, Y * 0.5, Z * 0.5, sd + 9)));
      if (edgeDist < wearW) { const t = 1 - edgeDist / wearW; h = Math.min(h, -A * t * t); }
      // bounded peak-to-valley A: the pits and wear take 0.9 of it, a grain
      // of ±0.05 the rest (fbm is bounded by ±1)
      return 0.9 * h + 0.05 * A * fbm(2.7 * X, 2.7 * Y, 2.7 * Z, sd + 5);
    }
    case 'cracks': {
      // incised grooves along the Worley cell BORDERS, a ROUNDED V
      // ((1 − t²)², no sharp bottom to alias on the grid), at least the floor
      // wide; where a crack runs is a smooth world-space noise, so a crack
      // thins out and stops rather than ending on a cliff (CRACK_KEEP of the
      // network carries one)
      const half = 0.5 * spec.crackW / s;
      const bd = worleyBorder(X, Y, Z, sd);
      if (bd >= half) return 0;
      const n = valueNoise(1.3 * X + 11.3, 1.3 * Y, 1.3 * Z, sd + 606);
      const f = Math.max(0, Math.min(1, 3 * (n + 0.55 - CRACK_KEEP)));
      if (f <= 0) return 0;
      const t = bd / half, u = 1 - t * t;
      return -A * u * u * f * f * (3 - 2 * f);
    }
    case 'hammered': {
      // a paraboloid dish per cell, the dishes meeting at sharp ridges on
      // the cell borders — faceted; 0 at the ridge, -A at a dish's centre
      const w = worley(X, Y, Z, sd);
      const R = 0.75;
      const q = Math.min(1, w.f1 / R);
      return A * (q * q - 1);
    }
  }
  return 0;
}

/* ------------------------------------------------------------------ */
/* Refinement — rows and columns that LERP their neighbours            */
/* ------------------------------------------------------------------ */

/* Insert rows into a spine until no band-edge segment (the outer and inner
   offsets, in print mm) is longer than `step`. An inserted row lerps the two
   neighbouring points AND normals (normals un-normalised), so its offset is
   exactly the lerp of their offsets: the same ruled surface, subdivided.
   Returns the refined spine and rowOf[i] = the new index of original row i. */
export function refineSpine(S, d0, d1, scale, step) {
  const n = S.pts.length, closed = !!S.closed;
  const e0 = offsetCurve(S, d0), e1 = offsetCurve(S, d1);
  const len = (a, b) => (a && b ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0);
  const pts = [], nrm = [], ws = S.widthScale ? [] : null, zs = S.depthScale ? [] : null, rowOf = [];
  const segs = closed ? n : n - 1;
  for (let v = 0; v < n; v++) {
    rowOf.push(pts.length);
    pts.push(S.pts[v]); nrm.push(S.nrm[v]); if (ws) ws.push(S.widthScale[v]); if (zs) zs.push(S.depthScale[v]);
    if (v >= segs) continue;
    const u = (v + 1) % n;
    const L = scale * Math.max(len(S.pts[v], S.pts[u]), len(e0[v], e0[u]), len(e1[v], e1[u]));
    const k = Math.max(1, Math.ceil(L / step));
    for (let t = 1; t < k; t++) {
      const f = t / k, g = 1 - f;
      pts.push([g * S.pts[v][0] + f * S.pts[u][0], g * S.pts[v][1] + f * S.pts[u][1]]);
      nrm.push([g * S.nrm[v][0] + f * S.nrm[u][0], g * S.nrm[v][1] + f * S.nrm[u][1]]);
      if (ws) ws.push(g * S.widthScale[v] + f * S.widthScale[u]);
      if (zs) zs.push(g * S.depthScale[v] + f * S.depthScale[u]);
    }
  }
  const out = { ...S, pts, nrm, joins: (S.joins || []).map((j) => rowOf[j]) };
  if (ws) out.widthScale = ws;
  if (zs) out.depthScale = zs;
  return { spine: out, rowOf };
}

/* Subdivide the columns (model-mm offsets ds, profile heights zs) until no
   column gap is wider than `step` in print mm. */
export function refineColumns(ds, zs, scale, step) {
  const D = [], Z = [], colOf = [];
  for (let c = 0; c < ds.length; c++) {
    colOf.push(D.length);
    D.push(ds[c]); Z.push(zs[c]);
    if (c === ds.length - 1) continue;
    const k = Math.max(1, Math.ceil(Math.abs(ds[c + 1] - ds[c]) * scale / step));
    for (let t = 1; t < k; t++) { const f = t / k; D.push(ds[c] + (ds[c + 1] - ds[c]) * f); Z.push(zs[c] + (zs[c + 1] - zs[c]) * f); }
  }
  return { ds: D, zs: Z, colOf };
}

/* ------------------------------------------------------------------ */
/* The displaced top grid                                              */
/* ------------------------------------------------------------------ */

/* Positions (print mm) of a band's top grid, V rows × C columns, row-major
   (v, c). xy[c][v] are the (null-resolved) model-mm offsets; srcRow[c][v] is
   the row whose point and normal a vertex takes (its own, or the join's where
   offsetCurve trimmed it to the mitre point — so coincident points share ONE
   displacement). edge0 / edge1: the column indices of the band's outer and
   inner walls (a sill lip column sits outside edge0 and counts as the wall).

   The direction is the TRUE normal (normalAt of the relief's own
   across-slope). Measured on the shipped arch at 2 mm scale and amplitude:
   smoothing the normal over the texture's scale, or fading its in-plane part
   toward the walls, puts the direction OFF the normal, and a steep texture
   (a crack's wall) then folds across its own wall — the off-normal part of
   h' · D runs backwards; along the true normal it cannot. Two holds, each
   LOCAL and counted, in this order. A wall's TOP follows the true normal
   too — its bottom (the footprint, the light's clear width) never moves, so
   the wall LEANS by the in-plane part, measured as leanOut / leanIn. (A wall
   held to its plane is off-normal, and its neighbour folded over it: 454 of
   457 reversed edges on the cove's outer wall, measured, before this.)
     curve  toward the cross-section's centre of curvature by at most
            CURVE_HOLD of the local radius (deeper folds the offset curve —
            the ogee's convex curl on a mullion is ~2.4 mm);
     floor  z + h·D_z >= MIN_FEATURE_MM (a pit or a crack never nearer the
            back than the floor, so it cannot pierce).
   Then the FOLD PASS: any grid edge whose displaced vector runs against its
   undisplaced one (the inner side of a mitre is a concave corner of radius
   0 in plan, where in-plane pushes converge) has the displacement at both
   ends halved, repeated until none does — h = 0 everywhere is fold-free, so
   it terminates — and every vertex it touched is counted. Returns
   { top, stats }. */
export function displacedTop({ S, xy, srcRow, ds, zs, scale, plateT, reliefDepth, spec, edge0, edge1 }) {
  const V = S.pts.length, C = ds.length;
  const F = MIN_FEATURE_MM;
  const sp = ds.map((d) => d * scale), zp = zs.map((z) => z * reliefDepth);
  // the across-slope (central difference) and the cross-section's turning
  // per vertex over half its two segments; the hold reads the WORST of a
  // vertex and its two neighbours (an edge either side turns by theirs too)
  const slope = new Float64Array(C);
  for (let c = 0; c < C; c++) { const a = Math.max(0, c - 1), b = Math.min(C - 1, c + 1); slope[c] = (zp[b] - zp[a]) / (sp[b] - sp[a]); }
  const segA = (c) => Math.atan2(zp[c + 1] - zp[c], sp[c + 1] - sp[c]);
  const kv = new Float64Array(C);
  for (let c = 1; c < C - 1; c++) {
    const l = 0.5 * (Math.hypot(sp[c + 1] - sp[c], zp[c + 1] - zp[c]) + Math.hypot(sp[c] - sp[c - 1], zp[c] - zp[c - 1]));
    kv[c] = l > 0 ? (segA(c) - segA(c - 1)) / l : 0;   // > 0: concave (centre above)
  }
  const kPos = new Float64Array(C), kNeg = new Float64Array(C);
  for (let c = 0; c < C; c++) for (let d = Math.max(0, c - 1); d <= Math.min(C - 1, c + 1); d++) { kPos[c] = Math.max(kPos[c], kv[d]); kNeg[c] = Math.min(kNeg[c], kv[d]); }
  const edgeDist = sp.map((q) => Math.max(0, Math.min(q - sp[edge0], sp[edge1] - q)));

  const n = V * C;
  const base = new Float64Array(3 * n), dir = new Float64Array(3 * n), h = new Float64Array(n), rep = new Int32Array(n);
  let curveHeld = 0, leanOut = 0, leanIn = 0, clamped = 0, hAskMin = Infinity, hAskMax = -Infinity;
  for (let v = 0; v < V; v++) for (let c = 0; c < C; c++) {
    const i = v * C + c, r = srcRow[c][v];
    rep[i] = r * C + c;                          // the vertex whose displacement this one shares
    const nr = S.nrm[r], ln = Math.hypot(nr[0], nr[1]), ax = nr[0] / ln, ay = nr[1] / ln;
    const N = normalAt(slope[c], [ax, ay]);
    const x = xy[c][v][0] * scale, y = xy[c][v][1] * scale, z = plateT + zp[c];
    let hh = textureHeight(spec, x, y, z, edgeDist[c]);
    if (hh < hAskMin) hAskMin = hh; if (hh > hAskMax) hAskMax = hh;
    const Dx = N[0], Dy = N[1], Dz = N[2];
    if (kPos[c] > 0 && hh > CURVE_HOLD / kPos[c]) { hh = CURVE_HOLD / kPos[c]; curveHeld++; }
    else if (kNeg[c] < 0 && hh < CURVE_HOLD / kNeg[c]) { hh = CURVE_HOLD / kNeg[c]; curveHeld++; }
    if (z + hh * Dz < F) { hh = (F - z) / Dz; clamped++; }
    if (c <= edge0 || c >= edge1) { const out = (c <= edge0 ? -1 : 1) * hh * (N[0] * ax + N[1] * ay); if (out > leanOut) leanOut = out; if (-out > leanIn) leanIn = -out; }
    base[3 * i] = x; base[3 * i + 1] = y; base[3 * i + 2] = z;
    dir[3 * i] = Dx; dir[3 * i + 1] = Dy; dir[3 * i + 2] = Dz;
    h[i] = hh;
  }
  // the fold pass, on the SHARED displacement (rep), so coincident mitre
  // points always move together
  const at = (i, k) => base[3 * i + k] + h[rep[i]] * dir[3 * i + k];
  const edgesList = [];
  const rows = S.closed ? V : V - 1;
  for (let v = 0; v < V; v++) for (let c = 0; c < C - 1; c++) edgesList.push(v * C + c, v * C + c + 1);
  for (let v = 0; v < rows; v++) for (let c = 0; c < C; c++) edgesList.push(v * C + c, ((v + 1) % V) * C + c);
  const reversed = (a, b) => {
    const ux = base[3 * b] - base[3 * a], uy = base[3 * b + 1] - base[3 * a + 1], uz = base[3 * b + 2] - base[3 * a + 2];
    if (ux * ux + uy * uy + uz * uz < 1e-18) return false;     // collapsed to the mitre point: no direction
    return ux * (at(b, 0) - at(a, 0)) + uy * (at(b, 1) - at(a, 1)) + uz * (at(b, 2) - at(a, 2)) <= 0;
  };
  const touched = new Uint8Array(n);
  let passes = 0;
  for (; passes < 60; passes++) {
    let any = false;
    for (let e = 0; e < edgesList.length; e += 2) {
      const a = edgesList[e], b = edgesList[e + 1];
      if (reversed(a, b)) { any = true; h[rep[a]] *= 0.5; h[rep[b]] *= 0.5; touched[rep[a]] = 1; touched[rep[b]] = 1; }
    }
    if (!any) break;
  }
  let foldHeld = 0; for (let i = 0; i < n; i++) foldHeld += touched[i];
  const top = new Float64Array(3 * n);
  let hMin = Infinity, hMax = -Infinity, zMin = Infinity, folds = 0, edges = 0;
  for (let i = 0; i < n; i++) {
    const hh = h[rep[i]];
    if (hh < hMin) hMin = hh; if (hh > hMax) hMax = hh;
    for (let k = 0; k < 3; k++) top[3 * i + k] = at(i, k);
    if (top[3 * i + 2] < zMin) zMin = top[3 * i + 2];
  }
  // the end state, measured independently of the pass's own bookkeeping
  for (let e = 0; e < edgesList.length; e += 2) {
    const a = edgesList[e], b = edgesList[e + 1];
    const ux = base[3 * b] - base[3 * a], uy = base[3 * b + 1] - base[3 * a + 1], uz = base[3 * b + 2] - base[3 * a + 2];
    if (ux * ux + uy * uy + uz * uz < 1e-18) continue;
    edges++;
    if (ux * (top[3 * b] - top[3 * a]) + uy * (top[3 * b + 1] - top[3 * a + 1]) + uz * (top[3 * b + 2] - top[3 * a + 2]) <= 0) folds++;
  }
  return { top, stats: { vertices: n, clamped, curveHeld, leanOut, leanIn, foldHeld, passes, hMin, hMax, hAskMin, hAskMax, zMin, folds, edges } };
}
