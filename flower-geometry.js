/* ===================================================================
   flower-geometry.js
   Parametric 3D flower-bloom — PURE GEOMETRY / MATH LAYER

   This module has NO dependency on Three.js. Everything here operates on
   plain {x, y, z} objects and arrays, which keeps the hard geometry logic
   testable in isolation (Node) and keeps each piece easy to find and
   iterate on. The Three.js layer (flower.js) imports these functions and
   is responsible only for turning the abstract geometry into tube meshes
   and putting them on screen.

   Coordinate conventions
   ----------------------
   Local petal frame (before a petal is rotated into place around the bloom):
     x  = radial  (distance out from the central vertical axis)
     y  = up      (the bloom's central axis is +y)
     z  = tangential / lateral (petal width fans out along ±z)

   "Flattened" petal space (used only to lay out the Voronoi lattice so the
   cells come out evenly sized in real-world scale):
     X = arc length along the petal spine from base -> tip   (== L * u)
     Y = lateral position across the petal, in [-halfWidth, +halfWidth]

   The parameter `u` runs 0 (base, attached to the receptacle) -> 1 (tip).
   The parameter `v` runs -1 (one edge) -> 0 (mid-rib) -> +1 (other edge).
   =================================================================== */


/* -------------------------------------------------------------------
   0. Small numeric helpers + a deterministic PRNG

   A seeded PRNG (mulberry32) is used instead of Math.random so that a
   given set of slider values always produces the same bloom — sliders
   regenerate the geometry live, and we don't want the lattice to reshuffle
   chaotically on every frame. Each petal is seeded independently of the
   petal count, so changing the count doesn't disturb the others.
   ------------------------------------------------------------------- */

export function lerp(a, b, t) { return a + (b - a) * t; }

export function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

export function smootherstep(t) {
  t = clamp(t, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


/* -------------------------------------------------------------------
   1. Petal profile — half-width as a function of length

   petalHalfWidth(u, P) returns the physical half-width of the petal at
   station u, already scaled by P.W (the max half-width). The silhouette is
   symmetric about the mid-rib, so the full outline is +/- this value.

   The profile is a single continuous curve with three intuitive knobs:
     P.W     : overall max half-width (world units)
     P.taper : 0 = broad/paddle-like, 1 = slender. Also moves the widest
               point toward the base as it increases.
     P.tip   : 0 = round/blunt tip, 1 = sharp point.

   Construction: a rise segment (base -> widest point) and a fall segment
   (widest point -> tip), joined continuously at value 1.0 where they meet.
   The base keeps a small non-zero width (baseFloor) so the petal attaches
   with a real "claw" rather than pinching to a single flimsy point; the
   tip always closes to zero.
   ------------------------------------------------------------------- */

const BASE_FLOOR = 0.12;   // petal base half-width as a fraction of max

export function petalHalfWidth(u, P) {
  const T = clamp(P.taper, 0, 1);
  const tip = clamp(P.tip, 0, 1);

  const peak    = lerp(0.48, 0.34, T);   // where the petal is widest
  const riseExp = lerp(1.0, 1.7, T);     // base sharpness
  const tipExp  = lerp(3.0, 1.0, tip);   // round (blunt, high exp) -> point (linear)

  let shape;
  if (u <= peak) {
    const t = peak <= 1e-6 ? 1 : u / peak;
    shape = BASE_FLOOR + (1 - BASE_FLOOR) * Math.pow(Math.sin(t * Math.PI / 2), riseExp);
  } else {
    const t = (u - peak) / (1 - peak);
    shape = Math.pow(Math.cos(t * Math.PI / 2), tipExp);
  }
  return Math.max(0, P.W * shape);
}


/* -------------------------------------------------------------------
   2. Petal spine — the curved mid-rib in the radial/vertical plane

   The spine is a curve in the (s = radial, y = vertical) plane. It launches
   from a small base radius r0 at height 0 and arcs outward + upward. Its
   tangent angle measured FROM THE VERTICAL AXIS is:

       phi(u) = bloom + curl * smootherstep(u)

     - `bloom` (radians) is the launch angle: 0 = straight up (closed bud),
       ~pi/2 = straight out (fully open / flat flower). This is the "bloom
       angle" slider and is deliberately independent of petal shape.
     - `curl` adds a gentle progressive outward bend toward the tip so even
       a bud reads as an organic teardrop rather than a stiff spike.

   Because the curve is parameterised so that |dP/du| = L (constant speed),
   the arc length from the base is exactly L*u. That identity is what lets
   the flattened lattice space use X = L*u with no arc-length inversion.

   Each sample stores the spine position (s, y), the inward-pointing surface
   normal (nx, ny) used for cupping, and u. Normal = tangent rotated +90deg:
       tangent = (sin phi, cos phi)   ->   normal = (-cos phi, sin phi)
   which points up-and-inward, so cupping opens toward the flower's centre.
   ------------------------------------------------------------------- */

export function buildSpine(P, n = 64) {
  const samples = [];
  const du = 1 / (n - 1);
  let s = P.r0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    const u = i * du;
    const phi = P.bloom + P.curl * smootherstep(u);
    samples.push({
      u, s, y,
      nx: -Math.cos(phi),
      ny:  Math.sin(phi),
    });
    // advance to the next station (Euler step; n is large enough that the
    // accumulated error is negligible for our purposes)
    s += P.L * Math.sin(phi) * du;
    y += P.L * Math.cos(phi) * du;
  }
  return samples;
}

// Sample the spine at an arbitrary u in [0,1] by linear interpolation.
export function sampleSpine(spine, u) {
  const n = spine.length;
  const f = clamp(u, 0, 1) * (n - 1);
  const i0 = Math.floor(f);
  if (i0 >= n - 1) return spine[n - 1];
  const i1 = i0 + 1;
  const t = f - i0;
  const a = spine[i0], b = spine[i1];
  return {
    u,
    s: lerp(a.s, b.s, t),
    y: lerp(a.y, b.y, t),
    nx: lerp(a.nx, b.nx, t),
    ny: lerp(a.ny, b.ny, t),
  };
}


/* -------------------------------------------------------------------
   3. Surface mapping — (u, v) -> local 3D point on the petal membrane

   Given a spine sample and the half-width at u, we place a point across the
   petal width and add a parabolic cup (edges lift along the spine normal so
   the petal cradles the flower's centre). The result is the local-frame 3D
   position of that point on the (imaginary) petal surface; the tube lattice
   rides on this surface.
   ------------------------------------------------------------------- */

export function surfacePoint(u, v, P, spine) {
  const sp = sampleSpine(spine, u);
  const hw = petalHalfWidth(u, P);
  const lift = P.cup * hw * v * v;   // 0 at mid-rib, max at edges
  return {
    x: sp.s + sp.nx * lift,
    y: sp.y + sp.ny * lift,
    z: v * hw,
  };
}

/* Place a local petal point into the bloom.
     tilt         : lean the petal within its own radial/vertical plane (about
                    the local z / width axis) — used so petals follow the
                    slope of an elevated (cone) or depressed (bowl) centre.
     az           : rotation about the vertical (y) axis — the petal's angular
                    position on the phyllotactic spiral.
     radialOffset : shift the base outward along its radial direction, so the
                    petal attaches at its spiral radius rather than the axis.
     baseHeight   : vertical lift (the receptacle height at this petal). */
export function placePoint(p, az, baseHeight, radialOffset = 0, tilt = 0) {
  let x = p.x, y = p.y;
  if (tilt !== 0) {
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const nx = x * ct - y * st;
    y = x * st + y * ct;
    x = nx;
  }
  const c = Math.cos(az), s = Math.sin(az);
  return {
    x: x * c + p.z * s + radialOffset * c,
    y: y + baseHeight,
    z: -x * s + p.z * c - radialOffset * s,
  };
}


/* -------------------------------------------------------------------
   4. Flattened silhouette polygon

   Builds the closed petal outline in flattened (X, Y) space: down the +Y
   side from base to tip, then back up the -Y side. Used both as the clip
   boundary for the Voronoi cells and for rejection-testing seed points.
   Because the half-width is unimodal, the polygon is (near) convex, but the
   clipping below only relies on the half-planes being convex, so an
   arbitrary outline is fine.
   ------------------------------------------------------------------- */

export function buildSilhouette(P, n = 56) {
  const right = [];
  const left = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const X = P.L * u;
    const hw = petalHalfWidth(u, P);
    right.push({ x: X, y: hw });
    left.push({ x: X, y: -hw });
  }
  // outline: base(+Y) -> tip along +Y edge, then tip -> base along -Y edge
  const outline = [];
  for (let i = 0; i < right.length; i++) outline.push(right[i]);
  for (let i = left.length - 1; i >= 0; i--) outline.push(left[i]);
  // drop duplicate/degenerate points at the tip (hw -> 0) and base
  return dedupePolygon(outline);
}

function dedupePolygon(poly) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = out[out.length - 1];
    if (!b || Math.hypot(a.x - b.x, a.y - b.y) > 1e-6) out.push(a);
  }
  // remove closing duplicate
  if (out.length > 1) {
    const first = out[0], last = out[out.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) < 1e-6) out.pop();
  }
  return out;
}


/* -------------------------------------------------------------------
   5. Polygon utilities: area, point-in-polygon, half-plane clip
   ------------------------------------------------------------------- */

export function polygonArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

export function pointInPolygon(poly, pt) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i], pj = poly[j];
    const intersect = ((pi.y > pt.y) !== (pj.y > pt.y)) &&
      (pt.x < (pj.x - pi.x) * (pt.y - pi.y) / ((pj.y - pi.y) || 1e-12) + pi.x);
    if (intersect) inside = !inside;
  }
  return inside;
}

/* Sutherland–Hodgman clip of `poly` (any polygon) against one half-plane.
   Keeps the region where dot(point - mid, normal) <= 0. */
function clipHalfPlane(poly, midx, midy, nx, ny) {
  const out = [];
  const L = poly.length;
  for (let i = 0; i < L; i++) {
    const A = poly[i];
    const B = poly[(i + 1) % L];
    const dA = (A.x - midx) * nx + (A.y - midy) * ny;
    const dB = (B.x - midx) * nx + (B.y - midy) * ny;
    const inA = dA <= 0;
    const inB = dB <= 0;
    if (inA) out.push(A);
    if (inA !== inB) {
      const t = dA / (dA - dB);
      out.push({ x: A.x + t * (B.x - A.x), y: A.y + t * (B.y - A.y) });
    }
  }
  return out;
}

/* One Voronoi cell = the silhouette clipped by the perpendicular bisector
   between `seed` and every other seed, keeping the seed's side. */
export function clipCellPolygon(seed, seeds, boundary) {
  let poly = boundary.slice();
  for (let k = 0; k < seeds.length; k++) {
    const q = seeds[k];
    if (q === seed) continue;
    const nx = q.x - seed.x;
    const ny = q.y - seed.y;
    if (nx * nx + ny * ny < 1e-12) continue;   // coincident seeds
    const midx = (seed.x + q.x) * 0.5;
    const midy = (seed.y + q.y) * 0.5;
    poly = clipHalfPlane(poly, midx, midy, nx, ny);
    if (poly.length < 3) return poly;           // clipped away
  }
  return poly;
}


/* -------------------------------------------------------------------
   6. Seed generation — jittered grid, rejection-tested inside the petal

   A jittered grid gives an even, organic-but-non-slivery seed distribution
   (far better than pure random for a lace lattice). `targetSeeds` sets the
   approximate count; cell density derives directly from it. All jitter uses
   the supplied seeded PRNG so the pattern is stable across regenerations.
   ------------------------------------------------------------------- */

export function generateSeeds(outline, targetSeeds, rng) {
  const area = polygonArea(outline);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of outline) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const seeds = [];
  let cell = Math.sqrt(area / Math.max(1, targetSeeds));
  if (!isFinite(cell) || cell <= 1e-4) cell = (maxX - minX) / 4 || 0.25;

  for (let x = minX + cell * 0.5; x < maxX; x += cell) {
    for (let y = minY + cell * 0.5; y < maxY; y += cell) {
      const jx = (rng() - 0.5) * cell * 0.7;
      const jy = (rng() - 0.5) * cell * 0.7;
      const p = { x: x + jx, y: y + jy };
      if (pointInPolygon(outline, p)) seeds.push(p);
    }
  }

  // Guarantee a workable minimum so tiny petals / low density still lattice.
  if (seeds.length < 2) {
    for (const u of [0.35, 0.6, 0.8]) {
      const p = { x: (minX + (maxX - minX) * u), y: 0 };
      if (pointInPolygon(outline, p)) seeds.push(p);
    }
  }
  return seeds;
}


/* -------------------------------------------------------------------
   7. Voronoi lattice — cell walls as a deduplicated edge graph

   For each seed we compute its clipped Voronoi cell, then collect the cell
   walls. Interior walls are shared by two cells and appear twice (reversed);
   we dedupe them by rounding endpoints to a grid and keying canonically.
   We also record node degree. The Three.js layer places a small welded bead
   at every node: this covers the open ends of the tubes (so no hollow rings
   show) and makes the network read as a connected, print-friendly web of
   struts-and-nodules. Higher-degree junctions get a slightly larger bead.

   Returns:
     edges : [{ a:{x,y}, b:{x,y} }, ...]        unique struts (flattened space)
     nodes : [{ x, y, degree }, ...]            unique welded nodes
   ------------------------------------------------------------------- */

const Q = 1e4;   // rounding grid for endpoint welding
function keyOf(p) { return Math.round(p.x * Q) + ',' + Math.round(p.y * Q); }

export function buildLattice(outline, targetSeeds, rng) {
  const seeds = generateSeeds(outline, targetSeeds, rng);
  const edgeMap = new Map();   // canonicalKey -> {a, b}
  const nodePos = new Map();   // key -> {x, y}
  const degree  = new Map();   // key -> count

  for (const seed of seeds) {
    const cell = clipCellPolygon(seed, seeds, outline);
    if (cell.length < 3) continue;
    for (let i = 0; i < cell.length; i++) {
      const A = cell[i];
      const B = cell[(i + 1) % cell.length];
      if (Math.hypot(A.x - B.x, A.y - B.y) < 1e-4) continue;
      const kA = keyOf(A), kB = keyOf(B);
      if (kA === kB) continue;
      const ek = kA < kB ? kA + '|' + kB : kB + '|' + kA;
      if (!edgeMap.has(ek)) {
        edgeMap.set(ek, { a: A, b: B });
        nodePos.set(kA, A);
        nodePos.set(kB, B);
      }
    }
  }

  for (const e of edgeMap.values()) {
    const kA = keyOf(e.a), kB = keyOf(e.b);
    degree.set(kA, (degree.get(kA) || 0) + 1);
    degree.set(kB, (degree.get(kB) || 0) + 1);
  }

  const nodes = [];
  for (const [k, d] of degree.entries()) {
    const p = nodePos.get(k);
    nodes.push({ x: p.x, y: p.y, degree: d });
  }

  return { edges: Array.from(edgeMap.values()), nodes, seedCount: seeds.length };
}


/* -------------------------------------------------------------------
   8. Map a flattened-space edge onto the 3D petal surface

   A strut is a straight segment in flattened (X, Y) space, but on the cupped,
   arced petal surface it should follow the surface rather than cut through
   it as a chord. So we subdivide long struts and lift every sample onto the
   surface via surfacePoint. Returns a polyline of LOCAL 3D points; the
   caller rotates/lifts them into place and builds a tube along the polyline.

   The (X, Y) -> (u, v) conversion uses the arc-length identity X = L*u and
   v = Y / halfWidth(u). Near the tip halfWidth -> 0; seeds can't exist there
   (they're inside the outline where |Y| <= halfWidth), and v is clamped to
   guard the degenerate 0/0 exactly at the apex.
   ------------------------------------------------------------------- */

export function mapEdgeToSurface(edge, P, spine, opts = {}) {
  const maxSeg = opts.maxSeg || 6;
  const segLen = opts.segLen || 0.14;
  const len = Math.hypot(edge.b.x - edge.a.x, edge.b.y - edge.a.y);
  const nseg = clamp(Math.round(len / segLen), 1, maxSeg);

  const pts = [];
  for (let k = 0; k <= nseg; k++) {
    const t = k / nseg;
    const X = lerp(edge.a.x, edge.b.x, t);
    const Y = lerp(edge.a.y, edge.b.y, t);
    const u = clamp(X / P.L, 0, 0.9995);
    const hw = petalHalfWidth(u, P);
    const v = hw > 1e-4 ? clamp(Y / hw, -1, 1) : 0;
    pts.push(surfacePoint(u, v, P, spine));
  }
  return pts;
}

/* Convenience: map a single flattened point (e.g. a junction) to a local
   3D surface point. */
export function mapPointToSurface(pt, P, spine) {
  const u = clamp(pt.x / P.L, 0, 0.9995);
  const hw = petalHalfWidth(u, P);
  const v = hw > 1e-4 ? clamp(pt.y / hw, -1, 1) : 0;
  return surfacePoint(u, v, P, spine);
}
