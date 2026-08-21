/* ===================================================================
   flower-sdf.js — the receptacle as ONE implicit surface (SDF).

   The lower flower is not a lathe and not a bundle of separate tubes: it
   is a single smooth field. A SKELETON of round-cone capsules (the petal
   strand feet running INWARD, merging pairwise as they converge into a
   compact button below the bloom centre, then a single trunk descending
   into the stem neck) is turned into a signed-distance field by smooth
   union (polynomial smin, blend radius = ABSORPTION). It is polygonised
   with a narrow-band surface-nets mesher, given SDF-gradient normals, and
   relaxed by a floor-aware constrained Laplacian. The result is a closed,
   watertight solid that OVERLAPS the petal feet (up-stubs) and the stem
   (neck down-stub); the slicer unions the overlap. Print floor is honored
   by flooring every capsule radius before the field is built.

   GATHER is the fix for flat blooms: real daisy/anemone feet don't splay —
   their strands run inward to a compact receptacle button and only then
   descend. GATHER RADIUS ~0 => tight button on the axis; wide => the
   strands meet late and it degrades back to a splay. GATHER HEIGHT is how
   far below the feet the button forms.

   Pure math — no THREE, no DOM. Returns flat vertex / normal / index
   arrays plus stats, ready to drop into a MeshAccumulator.
   =================================================================== */

// ---- small vec helpers (arrays [x,y,z]) ----
const _sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const _add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const _mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const _len = (a) => Math.hypot(a[0], a[1], a[2]);
const _norm = (a) => { const l = _len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const _clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const _lerp = (a, b, t) => a + (b - a) * t;

// signed distance to a ROUND CONE (tapered capsule) a..b, radii ra..rb
function sdRoundCone(px, py, pz, a, b, ra, rb) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz || 1e-9;
  const pax = px - a[0], pay = py - a[1], paz = pz - a[2];
  const h = _clamp((pax * bax + pay * bay + paz * baz) / l2, 0, 1);
  const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
  return Math.hypot(dx, dy, dz) - (ra + (rb - ra) * h);
}
// polynomial smooth-min: larger k -> parts absorb into one smooth mass
function smin(d1, d2, k) {
  if (k <= 1e-6) return Math.min(d1, d2);
  const h = _clamp(0.5 + 0.5 * (d2 - d1) / k, 0, 1);
  return d2 * (1 - h) + d1 * h - k * h * (1 - h);
}
// approximate signed distance to an axis-aligned ELLIPSOID (iq): a solid oblate
// disc when ry < rx = rz — the compact daisy receptacle BUTTON the strands fuse into.
function sdEllipsoid(px, py, pz, c, r) {
  const x = (px - c[0]) / r[0], y = (py - c[1]) / r[1], z = (pz - c[2]) / r[2];
  const k0 = Math.hypot(x, y, z);
  const k1 = Math.hypot(x / r[0], y / r[1], z / r[2]) || 1e-9;
  return k0 * (k0 - 1.0) / k1;
}

// PROFILE as a radius multiplier along the receptacle height (0 = neck bottom,
// 1 = gather node top). Shapes the outer silhouette without touching the leaf
// stubs (which must stay matched to the petal strands they continue).
function profileMult(profile, h) {
  switch (profile) {
    case 'flare':  return _lerp(0.95, 1.65, h);                 // trumpet: widens up to the bloom
    case 'cone':   return _lerp(1.35, 0.85, h);                 // taper to a point at the stem
    case 'dome':   return 1 + 0.55 * Math.sin(Math.PI * _clamp(h, 0, 1));   // rounded mid-bulge
    case 'urn':    return 1 + 0.5 * Math.cos((_clamp(h, 0, 1) - 0.82) * Math.PI * 1.1);  // pinch low, swell high
    case 'gentle':
    default:       return 1.0;                                  // near-uniform column
  }
}

/* Build the receptacle skeleton as a NECK, from the strand feet.
   feet:   [{ p:[x,y,z], r, up:[x,y,z] }]   up = unit dir INTO the petal
   neck:   { p:[x,y,z], r }                 stem-top join point + stem radius

   The junction is a single tapered trunk on the axis whose radius follows a PROFILE
   law of height — narrow, swelling at a COMMON ARRIVAL height where the strands meet
   it, then tapering continuously into the stem (the stem is the bottom of the same
   taper, no seam). Each strand curves from its foot to the neck surface at the arrival
   height and enters TANGENTIALLY (its arrival direction runs along the surface, so it
   emerges from the neck instead of stabbing in). Radii are the TRUE (unfloored) foot
   radii, so the midrib>margin grammar survives and the area-rule trunk stays ~4x a
   strand instead of being inflated by the print floor. Printability is a final-mesh
   check, not baked into these driving radii (the neck is well above the floor).
   returns { caps:[{a,b,ra,rb}], buttons:[], meta } */
function buildGatherSkeleton(feet, neck, opts) {
  const cx = opts.cx, cz = opts.cz;
  const tube = opts.tubeRadius || 0.0168;
  const profile = opts.profile || 'gentle';

  const Rring = feet.reduce((s, f) => s + Math.hypot(f.p[0] - cx, f.p[2] - cz), 0) / Math.max(1, feet.length);
  const yFeet = feet.reduce((s, f) => s + f.p[1], 0) / Math.max(1, feet.length);
  const yStem = neck.p[1];
  const stemR = neck.r;
  const vspan = Math.max(1e-3, yFeet - yStem);

  // area-rule trunk radius from UNFLOORED leaves (√Σr²) — the natural ~4x-a-strand trunk.
  const Rtrunk = Math.sqrt(feet.reduce((s, f) => s + f.r * f.r, 0)) || stemR;

  // COMMON ARRIVAL height: one plane just below the feet where every strand meets the neck.
  // GATHER HEIGHT sets how far below the feet it sits.
  const gH = _clamp(opts.gatherHeight != null ? opts.gatherHeight : 0.25, 0.05, 0.9);
  const yArrival = yFeet - gH * vspan * 0.5;
  // BUTTON SIZE degrades from a solid disc to a modest ARRIVAL SWELL — how much the neck
  // widens to receive the strands (kept near Rtrunk so the junction stays ~4x a strand).
  const buttonSize = _clamp(opts.buttonSize != null ? opts.buttonSize : 0.3, 0, 1);
  const swell = Rtrunk * _lerp(1.0, 1.7, buttonSize);

  // NECK radius law neckR(y): swell at the arrival zone -> taper to the stem, SHAPED by
  // PROFILE (this is the trunk-radius function PROFILE modulates, so DOME/URN/CONE differ).
  // t: 0 at arrival (top) -> 1 at the stem (bottom).
  const amp = Rtrunk * 0.55;
  const neckR = (y) => {
    const t = _clamp((yArrival - y) / Math.max(1e-3, yArrival - yStem), 0, 1);
    const base = _lerp(swell, stemR, t);
    switch (profile) {
      case 'dome':  return base + amp * Math.sin(Math.PI * t) * 0.8;                       // mid bulge
      case 'urn':   return base + amp * (Math.sin(Math.PI * (0.15 + 0.85 * t)) - 0.3);      // waisted: pinch then swell
      case 'cone':  return _lerp(swell, stemR, Math.pow(t, 1.7));                           // convex taper
      case 'flare': return _lerp(swell * 1.3, stemR, 1 - Math.pow(1 - t, 1.9));             // wide top, quick pull-in
      case 'gentle':
      default:      return base;                                                            // near-linear neck
    }
  };
  const dNeckR = (y) => (neckR(y + 1e-3) - neckR(y - 1e-3)) / 2e-3;   // dR/dy for surface tangents/normals

  const caps = [];
  // NECK: a chain of short coaxial round-cone segments = a smooth lathe. A small rounded
  // shoulder above the arrival zone (so strands emerge from a shoulder, not a flat rim),
  // then neckR(y) down to just past the stem top (the stem lathe continues at stemR).
  const yTop = yArrival + gH * vspan * 0.30;
  const yBot = yStem - tube * 8;
  const N = 30;
  let prev = null;
  for (let i = 0; i <= N; i++) {
    const y = _lerp(yTop, yBot, i / N);
    let r;
    if (y >= yArrival) { const u = _clamp((y - yArrival) / Math.max(1e-3, yTop - yArrival), 0, 1); r = _lerp(swell, Rtrunk * 0.4, u); }
    else if (y >= yStem) r = neckR(y);
    else r = stemR;
    const p = [cx, y, cz];
    if (prev) caps.push({ a: prev.p, b: p, ra: prev.r, rb: r });
    prev = { p, r };
  }

  // STRANDS: each foot -> a cubic bezier arriving TANGENTIALLY at the neck surface at the
  // common arrival height. Radius = the true foot radius (grammar preserved), so a strand
  // matches the local surface where it joins and blends in via the field's smooth union.
  let maxEntryDeg = 0;
  for (const f of feet) {
    const az = Math.atan2(f.p[2] - cz, f.p[0] - cx), c = Math.cos(az), s = Math.sin(az);
    const P0 = f.p.slice();
    const rA = neckR(yArrival);
    const P3 = [cx + rA * c, yArrival, cz + rA * s];                 // arrival ON the neck surface
    const dr = dNeckR(yArrival);
    const tanEnd = _norm([-c * dr, -1, -s * dr]);                    // down the meridian (tangent to the surface)
    const tanStart = _norm([-c, -0.4, -s]);                         // leave the foot down-and-in
    const d = Math.hypot(P3[0] - P0[0], P3[1] - P0[1], P3[2] - P0[2]) || 1e-3;
    const c1 = [P0[0] + tanStart[0] * d * 0.45, P0[1] + tanStart[1] * d * 0.45, P0[2] + tanStart[2] * d * 0.45];
    const c2 = [P3[0] - tanEnd[0] * d * 0.45, P3[1] - tanEnd[1] * d * 0.45, P3[2] - tanEnd[2] * d * 0.45];
    const K = 9;
    let pr = null;
    for (let i = 0; i <= K; i++) {
      const t = i / K, mt = 1 - t, w0 = mt*mt*mt, w1 = 3*mt*mt*t, w2 = 3*mt*t*t, w3 = t*t*t;
      const pt = [w0*P0[0]+w1*c1[0]+w2*c2[0]+w3*P3[0], w0*P0[1]+w1*c1[1]+w2*c2[1]+w3*P3[1], w0*P0[2]+w1*c1[2]+w2*c2[2]+w3*P3[2]];
      if (pr) caps.push({ a: pr, b: pt, ra: f.r, rb: f.r });
      pr = pt;
    }
    // up-stub into the petal so the receptacle overlaps the petal strand tube
    caps.push({ a: P0, b: _add(P0, _mul(_norm(f.up), tube * 4)), ra: f.r, rb: f.r });
    // entry angle: bezier end direction vs the neck-surface normal (0 = tangential, 90 = stab)
    const endDir = _norm([P3[0] - c2[0], P3[1] - c2[1], P3[2] - c2[2]]);
    const nrm = _norm([c, -dr, s]);
    const entry = 90 - Math.acos(Math.min(1, Math.abs(endDir[0]*nrm[0] + endDir[1]*nrm[1] + endDir[2]*nrm[2]))) * 180 / Math.PI;
    if (entry > maxEntryDeg) maxEntryDeg = entry;
  }

  // COLLAR: a radius bump near the stem (unions in via smin). True radii, no floor.
  const collar = opts.collar || 'none';
  if (collar === 'band') {
    const y = yStem + vspan * 0.10;
    caps.push({ a: [cx, y - tube * 1.2, cz], b: [cx, y + tube * 1.2, cz], ra: stemR * 1.5, rb: stemR * 1.5 });
  } else if (collar === 'ferrule') {
    for (let s = 0; s < 3; s++) {
      const y = yStem + vspan * (0.06 + s * 0.07), rr = stemR * (1.55 - s * 0.16);
      caps.push({ a: [cx, y - tube * 0.9, cz], b: [cx, y + tube * 0.9, cz], ra: rr, rb: rr });
    }
  }

  const maxWidth = Math.max(swell, neckR(_lerp(yArrival, yStem, 0.5))) * 2;   // widest junction diameter
  return { caps, buttons: [], meta: { Rring, yFeet, yStem, yArrival, Rtrunk, swell, stemR, maxEntryDeg, maxWidth, leafCount: feet.length, neckR } };
}

/* Narrow-band surface nets over a capsule list. Rasterizes each capsule into
   its expanded AABB and folds smin per grid corner, so field eval stays cheap
   even over a large grid. Returns { val, dims, mn, cell } for reuse (normals,
   Laplacian reprojection) plus the raw { verts, faces }. */
function fieldMesh(caps, buttons, k, cell) {
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const c of caps) { const m = Math.max(c.ra, c.rb) + k + 3 * cell;
    for (const q of [c.a, c.b]) for (let d = 0; d < 3; d++) { mn[d] = Math.min(mn[d], q[d] - m); mx[d] = Math.max(mx[d], q[d] + m); } }
  for (const e of buttons) { const pad = k + 3 * cell;
    for (let d = 0; d < 3; d++) { mn[d] = Math.min(mn[d], e.c[d] - e.r[d] - pad); mx[d] = Math.max(mx[d], e.c[d] + e.r[d] + pad); } }
  const nx = Math.ceil((mx[0] - mn[0]) / cell) + 1, ny = Math.ceil((mx[1] - mn[1]) / cell) + 1, nz = Math.ceil((mx[2] - mn[2]) / cell) + 1;
  const vidx = (i, j, kk) => i + nx * (j + ny * kk); const BIG = 1e9;
  const val = new Float32Array(nx * ny * nz).fill(BIG);
  const gx = (i) => mn[0] + i * cell, gy = (j) => mn[1] + j * cell, gz = (kk) => mn[2] + kk * cell;
  for (const c of caps) { const m = Math.max(c.ra, c.rb) + k + 3 * cell;
    const i0 = Math.max(0, Math.floor((Math.min(c.a[0], c.b[0]) - m - mn[0]) / cell)), i1 = Math.min(nx - 1, Math.ceil((Math.max(c.a[0], c.b[0]) + m - mn[0]) / cell));
    const j0 = Math.max(0, Math.floor((Math.min(c.a[1], c.b[1]) - m - mn[1]) / cell)), j1 = Math.min(ny - 1, Math.ceil((Math.max(c.a[1], c.b[1]) + m - mn[1]) / cell));
    const k0 = Math.max(0, Math.floor((Math.min(c.a[2], c.b[2]) - m - mn[2]) / cell)), k1 = Math.min(nz - 1, Math.ceil((Math.max(c.a[2], c.b[2]) + m - mn[2]) / cell));
    for (let kk = k0; kk <= k1; kk++) for (let j = j0; j <= j1; j++) { const zz = gz(kk), yy = gy(j); let base = vidx(i0, j, kk);
      for (let i = i0; i <= i1; i++, base++) { const d = sdRoundCone(gx(i), yy, zz, c.a, c.b, c.ra, c.rb); const cur = val[base]; val[base] = cur >= BIG ? d : smin(cur, d, k); } } }
  for (const e of buttons) { const pad = k + 3 * cell;
    const i0 = Math.max(0, Math.floor((e.c[0] - e.r[0] - pad - mn[0]) / cell)), i1 = Math.min(nx - 1, Math.ceil((e.c[0] + e.r[0] + pad - mn[0]) / cell));
    const j0 = Math.max(0, Math.floor((e.c[1] - e.r[1] - pad - mn[1]) / cell)), j1 = Math.min(ny - 1, Math.ceil((e.c[1] + e.r[1] + pad - mn[1]) / cell));
    const k0 = Math.max(0, Math.floor((e.c[2] - e.r[2] - pad - mn[2]) / cell)), k1 = Math.min(nz - 1, Math.ceil((e.c[2] + e.r[2] + pad - mn[2]) / cell));
    for (let kk = k0; kk <= k1; kk++) for (let j = j0; j <= j1; j++) { const zz = gz(kk), yy = gy(j); let base = vidx(i0, j, kk);
      for (let i = i0; i <= i1; i++, base++) { const d = sdEllipsoid(gx(i), yy, zz, e.c, e.r); const cur = val[base]; val[base] = cur >= BIG ? d : smin(cur, d, k); } } }
  const cellVert = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1); const cidx = (i, j, kk) => i + (nx - 1) * (j + (ny - 1) * kk);
  const verts = []; const cornerOff = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edgeC = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [3, 7], [2, 6]];
  for (let kk = 0; kk < nz - 1; kk++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const cv = new Array(8); let neg = 0, pos = 0;
    for (let c = 0; c < 8; c++) { const o = cornerOff[c]; const v = val[vidx(i + o[0], j + o[1], kk + o[2])]; cv[c] = v; if (v < 0) neg++; else pos++; }
    if (neg === 0 || pos === 0) continue; let sx = 0, sy = 0, sz = 0, ne = 0;
    for (const [c0, c1] of edgeC) { const v0 = cv[c0], v1 = cv[c1]; if ((v0 < 0) === (v1 < 0)) continue; const t = v0 / (v0 - v1); const o0 = cornerOff[c0], o1 = cornerOff[c1];
      sx += i + o0[0] + t * (o1[0] - o0[0]); sy += j + o0[1] + t * (o1[1] - o0[1]); sz += kk + o0[2] + t * (o1[2] - o0[2]); ne++; }
    cellVert[cidx(i, j, kk)] = verts.length; verts.push([gx(sx / ne), gy(sy / ne), gz(sz / ne)]); }
  const faces = []; const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (!flip) { faces.push([a, b, c]); faces.push([a, c, d]); } else { faces.push([a, c, b]); faces.push([a, d, c]); } };
  for (let kk = 1; kk < nz - 1; kk++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const v0 = val[vidx(i, j, kk)], v1 = val[vidx(i + 1, j, kk)]; if ((v0 < 0) === (v1 < 0)) continue; quad(cellVert[cidx(i, j - 1, kk - 1)], cellVert[cidx(i, j, kk - 1)], cellVert[cidx(i, j, kk)], cellVert[cidx(i, j - 1, kk)], v0 < 0); }
  for (let kk = 1; kk < nz - 1; kk++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const v0 = val[vidx(i, j, kk)], v1 = val[vidx(i, j + 1, kk)]; if ((v0 < 0) === (v1 < 0)) continue; quad(cellVert[cidx(i - 1, j, kk - 1)], cellVert[cidx(i, j, kk - 1)], cellVert[cidx(i, j, kk)], cellVert[cidx(i - 1, j, kk)], v0 > 0); }
  for (let kk = 0; kk < nz - 1; kk++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const v0 = val[vidx(i, j, kk)], v1 = val[vidx(i, j, kk + 1)]; if ((v0 < 0) === (v1 < 0)) continue; quad(cellVert[cidx(i - 1, j - 1, kk)], cellVert[cidx(i, j - 1, kk)], cellVert[cidx(i, j, kk)], cellVert[cidx(i - 1, j, kk)], v0 < 0); }
  return { verts, faces, val, dims: [nx, ny, nz], mn, cell };
}

/* Grid sampler: trilinear field value + gradient read straight from the narrow-band
   grid the mesh came from. O(1) per query regardless of capsule count (the analytic
   field is O(caps) per sample, which makes per-vertex reprojection quadratic and
   dominates export time). Same field the surface was contoured from, so reprojection
   is self-consistent. Cells never touched by any capsule hold BIG(1e9); clamp reads
   to the interior so a stray BIG can't poison an interpolation. */
function makeGridSampler(grid) {
  const { val, dims, mn, cell } = grid; const [nx, ny, nz] = dims;
  const vidx = (i, j, k) => i + nx * (j + ny * k);
  const at = (i, j, k) => { const v = val[vidx(_clamp(i, 0, nx - 1) | 0, _clamp(j, 0, ny - 1) | 0, _clamp(k, 0, nz - 1) | 0)]; return v >= 1e9 ? cell * 4 : v; };
  const f = (p) => {
    const fx = (p[0] - mn[0]) / cell, fy = (p[1] - mn[1]) / cell, fz = (p[2] - mn[2]) / cell;
    const i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz);
    const tx = fx - i, ty = fy - j, tz = fz - k;
    const c000 = at(i, j, k), c100 = at(i + 1, j, k), c010 = at(i, j + 1, k), c110 = at(i + 1, j + 1, k);
    const c001 = at(i, j, k + 1), c101 = at(i + 1, j, k + 1), c011 = at(i, j + 1, k + 1), c111 = at(i + 1, j + 1, k + 1);
    const x00 = _lerp(c000, c100, tx), x10 = _lerp(c010, c110, tx), x01 = _lerp(c001, c101, tx), x11 = _lerp(c011, c111, tx);
    return _lerp(_lerp(x00, x10, ty), _lerp(x01, x11, ty), tz);
  };
  const grad = (p) => _norm([
    f([p[0] + cell, p[1], p[2]]) - f([p[0] - cell, p[1], p[2]]),
    f([p[0], p[1] + cell, p[2]]) - f([p[0], p[1] - cell, p[2]]),
    f([p[0], p[1], p[2] + cell]) - f([p[0], p[1], p[2] - cell]),
  ]);
  return { f, grad };
}

/* Floor-aware constrained Laplacian: umbrella-smooth each vertex toward its
   neighbour average, then reproject onto the isosurface (Newton step along the
   field gradient) so tangential lumps go but the surface never shrinks below the
   floored feature — the field already encodes the print floor. */
function smoothConstrained(verts, faces, sampler, iters) {
  if (iters <= 0) return verts;
  const n = verts.length;
  const adj = Array.from({ length: n }, () => new Set());
  for (const [a, b, c] of faces) { adj[a].add(b); adj[a].add(c); adj[b].add(a); adj[b].add(c); adj[c].add(a); adj[c].add(b); }
  const lambda = 0.5;
  let P = verts;
  for (let it = 0; it < iters; it++) {
    const Q = new Array(n);
    for (let v = 0; v < n; v++) {
      let ax = 0, ay = 0, az = 0, m = 0;
      for (const w of adj[v]) { ax += P[w][0]; ay += P[w][1]; az += P[w][2]; m++; }
      if (!m) { Q[v] = P[v]; continue; }
      const px = _lerp(P[v][0], ax / m, lambda), py = _lerp(P[v][1], ay / m, lambda), pz = _lerp(P[v][2], az / m, lambda);
      const d = sampler.f([px, py, pz]); const g = sampler.grad([px, py, pz]);   // reproject to surface
      Q[v] = [px - d * g[0], py - d * g[1], pz - d * g[2]];
    }
    P = Q;
  }
  return P;
}

/* Split non-manifold VERTICES into per-fan copies. A vertex whose incident faces
   form more than one edge-connected fan is where two surface sheets touch at a
   single point (a surface-nets pinch); duplicating the vertex once per fan
   separates the sheets. This only ever re-labels which vertex a face references —
   it never removes a face or an edge, so a watertight mesh stays watertight (no
   boundary edges introduced). Edge-type non-manifold (one edge shared by 4 faces)
   is left alone; those are rare here (GATHER keeps strands from running close) and
   remain watertight. Returns a possibly-longer vertas array; faces mutated in place. */
function splitNonManifoldVertices(verts, faces) {
  const nv0 = verts.length;
  const vFaces = Array.from({ length: nv0 }, () => []);
  for (let fi = 0; fi < faces.length; fi++) { const f = faces[fi]; vFaces[f[0]].push(fi); vFaces[f[1]].push(fi); vFaces[f[2]].push(fi); }
  const out = verts.slice();
  for (let v = 0; v < nv0; v++) {
    const inc = vFaces[v]; if (inc.length < 2) continue;
    // union incident faces that share an edge through v (i.e. share the other endpoint w)
    const idxOf = new Map(); inc.forEach((fi, i) => idxOf.set(fi, i));
    const par = inc.map((_, i) => i);
    const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    const byW = new Map();
    for (const fi of inc) { const f = faces[fi]; for (const w of f) { if (w === v) continue; (byW.get(w) || byW.set(w, []).get(w)).push(fi); } }
    for (const arr of byW.values()) for (let i = 1; i < arr.length; i++) par[find(idxOf.get(arr[0]))] = find(idxOf.get(arr[i]));
    const fans = new Map();
    for (const fi of inc) { const r = find(idxOf.get(fi)); (fans.get(r) || fans.set(r, []).get(r)).push(fi); }
    if (fans.size < 2) continue;
    let first = true;
    for (const group of fans.values()) {
      if (first) { first = false; continue; }               // keep one fan on the original vertex
      const nvid = out.length; out.push(verts[v].slice());
      for (const fi of group) { const f = faces[fi]; for (let c = 0; c < 3; c++) if (f[c] === v) f[c] = nvid; }
    }
  }
  return out;
}

/* Top-level: build the receptacle field mesh.
   Returns { positions:[x,y,z,...], normals:[nx,ny,nz,...], indices:[a,b,c,...],
             stats:{ tris, verts, caps, gen ms is measured by caller }, meta }. */
export function buildReceptacleField(feet, neck, opts = {}) {
  const absorption = _clamp(opts.absorption != null ? opts.absorption : 0.85, 0, 1);
  const k = 0.006 + absorption * 0.055;                        // blend radius (validated in prototypes)
  const cell = opts.cell != null ? opts.cell : (opts.exportMode ? 0.011 : 0.02);
  const iters = opts.smoothIters != null ? opts.smoothIters : (opts.exportMode ? 2 : 0);

  const { caps, buttons, meta } = buildGatherSkeleton(feet, neck, opts);
  const grid = fieldMesh(caps, buttons, k, cell);
  const { verts, faces } = grid;
  const sampler = makeGridSampler(grid);
  let sm = smoothConstrained(verts, faces, sampler, iters);
  sm = splitNonManifoldVertices(sm, faces);                  // separate surface-nets pinches (safe: no new boundary)

  // SDF-gradient normals (outward = +gradient); kills faceting under smooth shading
  const positions = new Array(sm.length * 3);
  const normals = new Array(sm.length * 3);
  for (let v = 0; v < sm.length; v++) {
    const p = sm[v]; const g = sampler.grad(p);
    positions[v * 3] = p[0]; positions[v * 3 + 1] = p[1]; positions[v * 3 + 2] = p[2];
    normals[v * 3] = g[0]; normals[v * 3 + 1] = g[1]; normals[v * 3 + 2] = g[2];
  }
  const indices = new Array(faces.length * 3);
  for (let t = 0; t < faces.length; t++) { const f = faces[t]; indices[t * 3] = f[0]; indices[t * 3 + 1] = f[1]; indices[t * 3 + 2] = f[2]; }

  return { positions, normals, indices, stats: { tris: faces.length, verts: sm.length, caps: caps.length, k, cell }, meta };
}

// Expose internals for the acceptance probe / tests.
export const _internals = { sdRoundCone, smin, buildGatherSkeleton, fieldMesh, makeGridSampler, profileMult };
