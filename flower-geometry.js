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

   "Flattened" petal space (used to lay out the leaf-venation network so the
   veins and cells come out evenly sized in real-world scale):
     X = arc length along the petal spine from base -> tip   (== L * u)
     Y = lateral position across the petal, in [-halfWidth, +halfWidth]
   The axis of symmetry is the line Y = 0 (the midrib).

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
  u = clamp(u, 0, 1);   // guard the tip boundary: a fractional tipExp turns a
                        // marginally-negative cos() (u just past 1) into NaN
  const T = clamp(P.taper, 0, 1);
  const tip = clamp(P.tip, 0, 1);

  const peak    = lerp(0.48, 0.34, T);   // where the petal is widest
  const riseExp = lerp(1.0, 1.7, T);     // base sharpness
  // Fall-off exponent for the tip segment (cos^tipExp). Below 1 the outline
  // meets the apex with a vertical tangent -> a genuinely rounded/domed tip;
  // at 1 it meets linearly -> a sharp leaf point. (Exponents above 1 draw the
  // tip out into a thin needle, which reads as sharper, not rounder — the old
  // 3.0->1.0 mapping had this backwards and never produced a round tip.)
  const tipExp  = lerp(0.5, 1.0, tip);   // 0 = round dome -> 1 = sharp point

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
   5. Leaf venation — a hierarchical, bilaterally-symmetric vein network
      (this is the petal infill).

   Built strictly by hierarchy (never by random point scatter):
     1. a single central MIDRIB along the axis of symmetry (Y = 0), from
        base to tip, thickest at the base and tapering toward the tip;
     2. SECONDARY veins branching off the midrib at ~45-60 deg, curving
        forward toward the tip, and shorter the nearer the tip they start;
     3. TERTIARY cross-veins laddering between adjacent secondaries, plus
        marginal loops that join secondary tips — together these enclose
        the polygonal cells. Rungs are spaced tighter toward the margin,
        so cells shrink toward the edge and stay large near the midrib;
     4. fine free-ending VEINLETS poking into the big inner cells so they
        read as irregular polygons rather than a tidy ladder.

   Only the right half (Y >= 0) is generated, then mirrored across the axis
   to build the left half EXACTLY — so every petal is perfectly symmetric.
   ("Alternating left/right" is realised as opposite pairs; strict mirror
   symmetry, which the brief requires explicitly, rules out true alternation
   since that would not be mirror-symmetric.) All jitter is drawn from the
   supplied seeded PRNG, so a given petal is stable across live rebuilds.

   Line-weights are RELATIVE multipliers (midrib thickest -> veinlet
   thinnest); the render layer scales them by the tube-thickness slider so
   the taper keeps its proportions at any thickness.

   Returns:
     veins : [{ points:[{x,y}...], w0, w1 }]   polylines, end line-weights
     nodes : [{ x, y, width }]                 welded caps at ends/junctions
   ------------------------------------------------------------------- */

const VEIN_MIDRIB_BASE = 1.00;
const VEIN_MIDRIB_TIP  = 0.42;
const VEIN_SEC_BASE    = 0.56;
const VEIN_SEC_TIP     = 0.32;
const VEIN_TERTIARY    = 0.30;
const VEIN_VEINLET     = 0.20;

// Sample a polyline at fraction t in [0,1] by cumulative arc length.
function veinSample(pts, t) {
  const n = pts.length;
  if (n === 1) return { x: pts[0].x, y: pts[0].y };
  const cum = [0];
  let total = 0;
  for (let i = 1; i < n; i++) {
    total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    cum.push(total);
  }
  if (total < 1e-9) return { x: pts[0].x, y: pts[0].y };
  const target = clamp(t, 0, 1) * total;
  let i = 1;
  while (i < n && cum[i] < target) i++;
  const f = (target - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
  return { x: lerp(pts[i - 1].x, pts[i].x, f), y: lerp(pts[i - 1].y, pts[i].y, f) };
}

// Grow one secondary vein on the RIGHT half (Y >= 0). It launches from the
// midrib at station u0, at ~45-60 deg from the axis, then curves progressively
// forward (toward the tip) and stops just shy of the margin. Returns a polyline
// of >= 2 flattened points, or a single point if there was no room to grow.
function growSecondary(u0, P, rng) {
  const L = P.L;
  const D = Math.PI / 180;
  const start = { x: L * u0, y: 0 };
  const pts = [start];
  // launch steeper near the base, shallower near the tip; small seeded wobble
  let ang    = (lerp(58, 47, u0) + (rng() - 0.5) * 5) * D;   // from the +X (tip) axis
  const angTip = (24 + (rng() - 0.5) * 8) * D;               // forward-sweep target
  const reachFrac = clamp(0.86 + (rng() - 0.5) * 0.06, 0.7, 0.94);
  const maxLen = L * (0.95 - 0.6 * u0);                      // shorter toward the tip
  const ds = 0.055;
  let x = start.x, y = start.y, len = 0, guard = 0;
  while (len < maxLen && guard++ < 400) {
    x += ds * Math.cos(ang);
    y += ds * Math.sin(ang);
    len += ds;
    if (x >= L * 0.98) { x = L * 0.98; }
    const marg = petalHalfWidth(clamp(x / L, 0, 1), P);
    if (marg <= 1e-3) break;
    if (y >= reachFrac * marg) { pts.push({ x, y: reachFrac * marg }); break; }
    pts.push({ x, y });
    if (x >= L * 0.98) break;
    ang = lerp(ang, angTip, 0.10);   // curve forward toward the tip
  }
  return pts;
}

export function buildVenation(P, rng, opts = {}) {
  const L = P.L;
  const secCount  = clamp(Math.round(opts.secondaries || 6), 3, 11);
  const crossBase = clamp(Math.round(opts.crossPerStrip || 4), 2, 9);
  const margin = (u) => petalHalfWidth(clamp(u, 0, 1), P);

  const veins = [];        // on-axis + final (mirrored) output
  const nodes = [];
  const rightVeins = [];   // right-half veins, mirrored to the left below
  const rightNodes = [];   // right-half nodes (off-axis), mirrored below

  // --- 1. midrib (on the axis; added once, never mirrored) ----------
  const uBase = 0.02, uApex = 0.985, nMid = 30;
  const midrib = [];
  for (let i = 0; i <= nMid; i++) midrib.push({ x: L * lerp(uBase, uApex, i / nMid), y: 0 });
  veins.push({ points: midrib, w0: VEIN_MIDRIB_BASE, w1: VEIN_MIDRIB_TIP });
  nodes.push({ x: midrib[0].x, y: 0, width: VEIN_MIDRIB_BASE });     // base cap
  nodes.push({ x: midrib[nMid].x, y: 0, width: VEIN_MIDRIB_TIP });   // apex cap

  // --- 2. secondary veins (right half), evenly stationed base -> tip -
  const secondaries = [];
  for (let i = 0; i < secCount; i++) {
    const frac = (i + 0.5) / secCount;
    const u0 = clamp(lerp(0.13, 0.9, frac) + (rng() - 0.5) * 0.02, 0.1, 0.92);
    const pts = growSecondary(u0, P, rng);
    if (pts.length < 2) continue;
    secondaries.push({ u0, pts });
    const wBase = lerp(VEIN_SEC_BASE, VEIN_SEC_BASE * 0.7, u0);
    const wTip  = lerp(VEIN_SEC_TIP,  VEIN_SEC_TIP  * 0.7, u0);
    rightVeins.push({ points: pts, w0: wBase, w1: wTip });
    nodes.push({ x: pts[0].x, y: 0, width: wBase });   // base sits on the axis
    rightNodes.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, width: wTip });
  }

  // --- 3. tertiary cross-veins + marginal loops between neighbours ---
  for (let i = 0; i < secondaries.length - 1; i++) {
    const A = secondaries[i].pts;       // inner (nearer the base)
    const B = secondaries[i + 1].pts;   // outer (nearer the tip)
    const rungs = clamp(crossBase - i, 2, crossBase);
    for (let k = 1; k <= rungs; k++) {
      // bias rungs toward t = 1 (the margin) so outer cells come out smaller
      const t = Math.pow(k / (rungs + 1), 0.7);
      const a = veinSample(A, t);
      const b = veinSample(B, t);
      const mid = {
        x: (a.x + b.x) / 2 + (rng() - 0.5) * 0.05,
        y: (a.y + b.y) / 2 + (rng() - 0.5) * 0.05,
      };
      rightVeins.push({ points: [a, mid, b], w0: VEIN_TERTIARY, w1: VEIN_TERTIARY });

      // free-ending veinlet dropped into the larger inner cells (small t)
      if (t < 0.5) {
        const vlen = 0.10 + rng() * 0.06;
        const tip = { x: mid.x + (rng() - 0.35) * 0.06, y: Math.max(0.03, mid.y - vlen) };
        rightVeins.push({ points: [mid, tip], w0: VEIN_VEINLET, w1: VEIN_VEINLET * 0.6 });
        rightNodes.push({ x: tip.x, y: tip.y, width: VEIN_VEINLET * 0.6 });
      }
    }

    // marginal loop: arch joining A's tip to a near-tip point of B, bowed out
    const tip = A[A.length - 1];
    const anchor = veinSample(B, 0.8);
    const um = clamp(((tip.x + anchor.x) / 2) / L, 0, 1);
    const crest = {
      x: (tip.x + anchor.x) / 2,
      y: Math.min(margin(um) * 0.95, (tip.y + anchor.y) / 2 + 0.3 * (margin(um) - (tip.y + anchor.y) / 2)),
    };
    rightVeins.push({ points: [tip, crest, anchor], w0: VEIN_TERTIARY, w1: VEIN_TERTIARY });
    // marginal veinlet from the loop crest out to the edge (free tip)
    const edge = { x: crest.x, y: Math.min(margin(um) * 0.99, crest.y + 0.5 * (margin(um) - crest.y)) };
    rightVeins.push({ points: [crest, edge], w0: VEIN_VEINLET, w1: VEIN_VEINLET });
    rightNodes.push({ x: edge.x, y: edge.y, width: VEIN_VEINLET });
  }

  // --- 4. apical fan filling the tip above the last secondary --------
  const lastU = secondaries.length ? secondaries[secondaries.length - 1].u0 : 0.6;
  for (let i = 1; i <= 2; i++) {
    const u0 = clamp(lerp(lastU + 0.02, 0.955, i / 3), 0.1, 0.965);
    const pts = growSecondary(u0, P, rng);
    if (pts.length < 2) continue;
    rightVeins.push({ points: pts, w0: VEIN_SEC_TIP, w1: VEIN_SEC_TIP * 0.7 });
    nodes.push({ x: pts[0].x, y: 0, width: VEIN_SEC_TIP });
    rightNodes.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, width: VEIN_SEC_TIP * 0.7 });
  }

  // --- 5. mirror the right half across the axis to build the left ----
  for (const v of rightVeins) {
    veins.push(v);
    veins.push({ points: v.points.map((p) => ({ x: p.x, y: -p.y })), w0: v.w0, w1: v.w1 });
  }
  for (const nd of rightNodes) {
    nodes.push(nd);
    nodes.push({ x: nd.x, y: -nd.y, width: nd.width });
  }

  return { veins, nodes };
}


/* -------------------------------------------------------------------
   6. Map a flattened petal point onto the cupped 3D petal surface

   The (X, Y) -> (u, v) conversion uses the arc-length identity X = L*u and
   v = Y / halfWidth(u). Near the tip halfWidth -> 0, so v is clamped to guard
   the degenerate 0/0 exactly at the apex.
   ------------------------------------------------------------------- */

export function mapPointToSurface(pt, P, spine) {
  const u = clamp(pt.x / P.L, 0, 0.9995);
  const hw = petalHalfWidth(u, P);
  const v = hw > 1e-4 ? clamp(pt.y / hw, -1, 1) : 0;
  return surfacePoint(u, v, P, spine);
}
