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
const EDGE_CURVE_AMP = 0.6;  // max side billow / pinch from the edge-curve slider

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
  // Edge curve: billow (+) the sides outward or pinch (-) them inward,
  // independently of the taper. The bulge peaks mid-petal and vanishes at the
  // base and tip, so the claw and apex stay anchored while the sides bow.
  const edge = clamp(P.edgeCurve || 0, -1, 1);
  const bulge = 1 + EDGE_CURVE_AMP * edge * Math.sin(Math.PI * u);
  return Math.max(0, P.W * shape * bulge);
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

// Amplitude of the RUFFLED buckle at TIP LENGTH = 1, in world units along the
// surface normal (which is the spine normal — the same axis the cup lifts along).
const RUFFLE_AMP_MAX = 0.55;

// RUFFLED is a full-surface treatment, not an outline trick: the margin carries
// excess length and buckles OUT of the petal plane, and that deflection reaches
// inward across the whole lamina, fading to nothing at the stiff mid-rib. This
// returns that out-of-plane deflection at (u, v): a wave running ALONG the
// margin (phase from u), deepening from mid-rib to edge (radial from v), eased
// in at the region start and out at the tip so it blends with the smooth
// surface and never tears the apex. Because the mid-rib stays put and the edges
// swing, the lamina flutes — exactly the differential-growth ruffle.
function ruffleLift(u, v, P) {
  if ((P.tipLength || 0) <= 1e-4) return 0;
  const freq = clamp(Math.round(P.tipFrequency || 1), 1, 40);
  // Finer ruffles ride shallower: amplitude eases down with frequency so many
  // flutes read as fine fabric texture, not a row of tall spikes (broad ruffles
  // still stand proud). TIP LENGTH remains the dominant amplitude control.
  const amp = (P.tipLength || 0) * RUFFLE_AMP_MAX * clamp(Math.pow(5 / freq, 0.4), 0.42, 1.3);
  const { uStart } = tipRegionRange(P);
  const uTip = 0.985;
  if (u <= uStart || u >= uTip) return 0;
  const p = (u - uStart) / (uTip - uStart);          // 0 at region start -> 1 near the tip
  const RAMP = 0.14;
  const envU = smootherstep(p / RAMP) * smootherstep((1 - p) / RAMP);
  if (envU <= 1e-6) return 0;
  const radial = smootherstep(Math.abs(v));           // mid-rib still -> edge swings full (eased both ends)
  const k = lerp(1, 3, clamp(P.tip != null ? P.tip : 0.5, 0, 1));  // TIP SHAPE: sine -> gathered crest
  const s = Math.sin(Math.PI * 2 * freq * p);
  const wave = Math.sign(s) * Math.pow(Math.abs(s), k);
  return amp * envU * radial * wave;
}

export function surfacePoint(u, v, P, spine) {
  const sp = sampleSpine(spine, u);
  const hw = petalHalfWidth(u, P);
  let lift = P.cup * hw * v * v;   // parabolic cup: 0 at mid-rib, max at edges
  if (P.tipStyle === 'ruffled') lift += ruffleLift(u, v, P);   // + full-surface ruffle buckle
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
   5. Leaf venation — a hierarchical, bilaterally-symmetric, FRACTAL
      vein network (this is the petal infill).

   Built strictly by recursive hierarchy (never by random point scatter):
     1. a single central MIDRIB along the axis of symmetry (Y = 0), base
        to tip, thickest at the base and tapering toward the tip;
     2. SECONDARY veins branch off the midrib at ~45-60 deg and then
        RECURSE: every vein spawns finer child veins at softened angles,
        each a shorter, thinner, curvier copy of its parent, down to a
        depth set by `maxDepth`. That self-similar bifurcation is what
        gives the network its organic, fractal, skeleton-leaf character;
     3. TERTIARY cross-veins ladder between adjacent secondaries and
        marginal loops join their tips, closing the polygonal cells that
        the fractal branches fill (rungs pack tighter toward the margin,
        so cells shrink outward and stay large near the midrib).

   Angle softening: every finished polyline is run through `softenVein`, a
   corner-rounding (Chaikin) pass whose strength follows the `softness`
   knob — 0 leaves crisp branch angles, 1 rounds them into smooth arcs.

   Fractal density: `maxDepth` (how many times the branching recurses) is
   driven by the density slider, so a "denser" bloom is literally a more
   deeply fractal one, not just more struts.

   Only the right half (Y >= 0) is generated, then mirrored across the
   axis to build the left half EXACTLY — so every petal is perfectly
   symmetric. All jitter is drawn from the supplied seeded PRNG, so a
   given petal is stable across live rebuilds.

   Line-weights are RELATIVE multipliers (midrib thickest -> finest twig
   thinnest); the render layer scales them by the tube-thickness slider so
   the taper keeps its proportions at any thickness.

   Returns:
     veins : [{ points:[{x,y}...], w0, w1 }]   polylines, end line-weights
     nodes : [{ x, y, width }]                 welded caps at ends/junctions
   ------------------------------------------------------------------- */

const VEIN_MIDRIB_BASE = 1.00;
const VEIN_MIDRIB_TIP  = 0.42;
const VEIN_TERTIARY    = 0.28;
// relative line-weight by branch order (0 = midrib). Deeper orders are finer;
// the last entry is the floor so very deep fractal twigs stay visible.
const VEIN_WIDTH_BY_ORDER = [1.00, 0.56, 0.38, 0.28, 0.22, 0.18];
const D2R = Math.PI / 180;

function widthOfOrder(o) {
  return VEIN_WIDTH_BY_ORDER[Math.min(o, VEIN_WIDTH_BY_ORDER.length - 1)];
}

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

// Point + local heading (radians) at fraction t along a polyline.
function veinPointHeading(pts, t) {
  const p  = veinSample(pts, t);
  const pA = veinSample(pts, Math.max(0, t - 0.03));
  const pB = veinSample(pts, Math.min(1, t + 0.03));
  return { p, theta: Math.atan2(pB.y - pA.y, pB.x - pA.x) };
}

// --- angle softening (Chaikin corner-cutting, endpoint-preserving) -----
function chaikinOnce(pts) {
  if (pts.length < 3) return pts.slice();
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
    out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function resamplePolyline(pts, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(veinSample(pts, n <= 1 ? 0 : i / (n - 1)));
  return out;
}
function polyLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return L;
}
// Insert evenly-spaced points along a flattened polyline (endpoints preserved)
// so it can ride a high-frequency surface — the ruffle buckle — without
// faceting. `step` is the target spacing in flattened (X, Y) units.
export function densifyByStep(pts, step) {
  if (pts.length < 2 || step <= 0) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const segs = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= segs; k++) out.push({ x: lerp(a.x, b.x, k / segs), y: lerp(a.y, b.y, k / segs) });
  }
  return out;
}

// Round the corners of a vein by `softness` in [0,1]: 0 -> crisp branch angles,
// 1 -> fully Chaikin-smoothed arcs, in between a continuous blend of the two.
// Every vein is resampled to an arc-length-proportional, capped point count, so
// point density (and therefore triangle count) stays bounded on deep fractals.
function softenVein(pts, softness) {
  if (pts.length < 2) return pts;
  const n = Math.max(2, Math.min(22, Math.round(polyLen(pts) / 0.16) + 1));
  const sharp = resamplePolyline(pts, n);
  if (softness <= 0.001 || pts.length < 3) return sharp;
  const sm = resamplePolyline(chaikinOnce(chaikinOnce(pts)), n);
  if (softness >= 0.999) return sm;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ x: lerp(sharp[i].x, sm[i].x, softness), y: lerp(sharp[i].y, sm[i].y, softness) });
  }
  return out;
}

// Grow one vein on the RIGHT half (Y >= 0) and RECURSE into finer children.
// Returns the vein's own polyline so a caller can hang cross-veins off a
// top-level secondary. Children branch off, each shorter, thinner and curvier
// than the parent — the self-similar fractal step.
//
// A vein LAUNCHES from `launchHeading` (near its parent's own heading) and only
// eases out to its full `branchHeading` over the first `easeFrac` of its length,
// then curls forward toward the tip. That easing is what turns every junction
// from a hard V into a smooth fork; the softer the `softness`, the longer and
// gentler the peel-off (and children are launched nearer to tangent as well).
function growBranch(start, launchHeading, branchHeading, length, order, env, rng, ctx) {
  if (ctx.count >= ctx.maxCount) return null;
  ctx.count++;
  const { P, L, maxDepth, softness } = env;
  const ds = 0.07;
  const n = Math.max(2, Math.round(length / ds));
  const easeFrac = 0.22 + 0.4 * softness;      // longer, gentler peel-off when softer
  const tipTarget = branchHeading * 0.5;       // curl gently forward toward the tip
  const wanderAmp = 0.02 + 0.014 * order;      // deeper veins wander a little more
  const pts = [{ x: start.x, y: start.y }];
  let x = start.x, y = start.y, theta = launchHeading;
  for (let i = 1; i <= n; i++) {
    const s = i / n;
    const target = s < easeFrac
      ? lerp(launchHeading, branchHeading, s / easeFrac)                       // peel off the parent
      : lerp(branchHeading, tipTarget, (s - easeFrac) / (1 - easeFrac));       // then sweep to the tip
    theta = lerp(theta, target, 0.3) + (rng() - 0.5) * wanderAmp;
    x += ds * Math.cos(theta);
    y += ds * Math.sin(theta);
    const marg = petalHalfWidth(clamp(x / L, 0, 1), P);
    if (marg <= 1e-3 || x >= L * 0.99) break;
    // run right out to the margin (a hair inside it) so veins reach the edge
    if (y > 0.985 * marg) { pts.push({ x, y: 0.985 * marg }); break; }
    if (y < 0.02) y = 0.02;                    // keep this half on its own side
    pts.push({ x, y });
  }
  if (pts.length < 2) return null;

  ctx.rightVeins.push({ points: pts, w0: widthOfOrder(order), w1: widthOfOrder(order + 1) });

  if (order < maxDepth && length > 0.14) {
    const kids = 2;
    for (let c = 0; c < kids; c++) {
      const f = kids === 1 ? 0.7 : 0.5 + 0.32 * c;        // spawn mid- and near-tip
      const { p, theta: h } = veinPointHeading(pts, f);
      const side = (c % 2 === 0) ? 1 : -1;                // alternate sides
      const branchAngle = (46 - 5 * order + (rng() - 0.5) * 10) * D2R;
      const full = h + side * branchAngle;
      const launch = h + side * branchAngle * (1 - 0.7 * softness);   // soft -> leave near-tangent
      growBranch(p, launch, full, length * (0.52 + rng() * 0.16), order + 1, env, rng, ctx);
    }
  }
  return pts;
}

export function buildVenation(P, rng, opts = {}) {
  const L = P.L;
  const secCount  = clamp(Math.round(opts.secondaries || 6), 3, 11);
  const crossBase = clamp(Math.round(opts.crossPerStrip || 3), 1, 8);
  const maxDepth  = clamp(Math.round(opts.maxDepth || 3), 1, 5);
  const softness  = clamp(opts.softness != null ? opts.softness : 0.5, 0, 1);
  const margin = (u) => petalHalfWidth(clamp(u, 0, 1), P);
  const env = { P, L, maxDepth, softness };

  const veins = [];
  const nodes = [];
  const ctx = { rightVeins: [], count: 0, maxCount: 1200 };

  // --- 1. midrib (on the axis; added once, never mirrored) ----------
  const uBase = 0.02, uApex = 0.985, nMid = 30;
  const midrib = [];
  for (let i = 0; i <= nMid; i++) midrib.push({ x: L * lerp(uBase, uApex, i / nMid), y: 0 });
  veins.push({ points: midrib, w0: VEIN_MIDRIB_BASE, w1: VEIN_MIDRIB_TIP });
  nodes.push({ x: midrib[0].x, y: 0, width: VEIN_MIDRIB_BASE });
  nodes.push({ x: midrib[nMid].x, y: 0, width: VEIN_MIDRIB_TIP });

  // --- 2. secondary veins off the midrib, each a recursive fractal ---
  //         Launch each one near-tangent to the midrib (soft T-join) and let it
  //         ease out to its branch angle. A couple of extra basal veins plus a
  //         base-biased station spread keep the narrow petal base from reading
  //         empty (leaves are densest where the veins fan off the petiole).
  const secList = [];   // { u0, pts }
  const addSecondary = (u0, branchDeg) => {
    const branchHeading = branchDeg * D2R;
    const launchHeading = branchHeading * (1 - 0.7 * softness);   // soft junction on the axis
    const len = L * (0.96 - 0.5 * u0);
    const main = growBranch({ x: L * u0, y: 0 }, launchHeading, branchHeading, len, 1, env, rng, ctx);
    if (main) { secList.push({ u0, pts: main }); nodes.push({ x: L * u0, y: 0, width: widthOfOrder(1) }); }
  };
  // basal fan — short, wider-angle veins that populate the claw / base region
  addSecondary(0.05, 70 + (rng() - 0.5) * 8);
  addSecondary(0.09, 64 + (rng() - 0.5) * 8);
  // main pinnate secondaries, biased toward the base so the lower petal fills in
  for (let i = 0; i < secCount; i++) {
    const frac = Math.pow((i + 0.5) / secCount, 1.25);
    const u0 = clamp(lerp(0.12, 0.9, frac) + (rng() - 0.5) * 0.02, 0.1, 0.92);
    addSecondary(u0, lerp(58, 46, u0) + (rng() - 0.5) * 6);
  }
  secList.sort((a, b) => a.u0 - b.u0);
  const secMain = secList.map((s) => s.pts);

  // --- 3. tertiary cross-veins + marginal loops between neighbours ---
  //         (these close the polygonal cells; the fractal branches fill them)
  for (let i = 0; i < secMain.length - 1; i++) {
    const A = secMain[i], B = secMain[i + 1];
    const rungs = clamp(crossBase - Math.floor(i / 2), 1, crossBase);
    for (let k = 1; k <= rungs; k++) {
      const t = Math.pow(k / (rungs + 1), 0.7);          // tighter toward the margin
      const a = veinSample(A, t), b = veinSample(B, t);
      const mid = {
        x: (a.x + b.x) / 2 + (rng() - 0.5) * 0.05,
        y: (a.y + b.y) / 2 + (rng() - 0.5) * 0.05,
      };
      ctx.rightVeins.push({ points: [a, mid, b], w0: VEIN_TERTIARY, w1: VEIN_TERTIARY });
    }
    // marginal loop joining the two tips, riding right up against the margin
    const tipA = A[A.length - 1];
    const anchor = veinSample(B, 0.82);
    const cx = (tipA.x + anchor.x) / 2;
    const um = clamp(cx / L, 0, 1);
    const midY = (tipA.y + anchor.y) / 2;
    const crest = { x: cx, y: Math.min(margin(um) * 0.99, midY + 0.55 * (margin(um) - midY)) };
    ctx.rightVeins.push({ points: [tipA, crest, anchor], w0: VEIN_TERTIARY, w1: VEIN_TERTIARY });
    // a fine veinlet from the loop crest out to touch the petal edge
    ctx.rightVeins.push({ points: [crest, { x: cx, y: margin(um) * 0.997 }], w0: VEIN_TERTIARY, w1: 0.16 });
  }

  // fine marginal spurs so any secondary tip still shy of the rim reaches it
  for (const s of secMain) {
    const tip = s[s.length - 1];
    const um = clamp(tip.x / L, 0, 1);
    const edgeY = margin(um) * 0.997;
    if (tip.y < edgeY - 0.03) {
      ctx.rightVeins.push({ points: [tip, { x: tip.x, y: edgeY }], w0: widthOfOrder(2), w1: 0.16 });
    }
  }

  // --- 4. soften every right-half vein, then MIRROR it to the left ---
  for (const v of ctx.rightVeins) {
    const soft = softenVein(v.points, softness);
    veins.push({ points: soft, w0: v.w0, w1: v.w1 });
    veins.push({ points: soft.map((p) => ({ x: p.x, y: -p.y })), w0: v.w0, w1: v.w1 });
  }

  return { veins, nodes };
}


/* -------------------------------------------------------------------
   5b. Voronoi infill — an alternative petal fill to the leaf venation.

   Seeds are scattered only in the +Y half of the petal and MIRRORED to the
   -Y half, so the whole diagram — and therefore every cell — is symmetric
   across the centre axis. With no seed sitting on the axis, the midline turns
   into a continuous run of cell walls (a clean central seam) and each +Y cell
   has an exact mirror twin below it. Each cell is the petal silhouette clipped
   by that seed's perpendicular-bisector half-planes against every other seed;
   interior walls (shared by two cells) are drawn once, and walls that fall on
   the silhouette are left to the rim. Returns the same { veins, nodes } shape
   as buildVenation, so the render layer treats it identically.
   ------------------------------------------------------------------- */
export function buildVoronoi(P, rng, opts = {}) {
  const density = clamp(Math.round(opts.density || 7), 3, 12);
  const perHalf = Math.round(lerp(9, 34, (density - 3) / 9));   // seeds in the +Y half
  const sil = buildSilhouette(P, 72);
  const margin = (u) => petalHalfWidth(clamp(u, 0, 1), P);

  // blue-noise-ish seeds in the +Y half (best-candidate sampling for even cells)
  const half = [];
  const xLo = P.L * 0.05, xHi = P.L * 0.96;
  let guard = 0;
  while (half.length < perHalf && guard < perHalf * 600) {
    let best = null, bestD = -1;
    for (let c = 0; c < 10; c++) {
      guard++;
      const x = lerp(xLo, xHi, rng());
      const hw = margin(x / P.L);
      if (hw < 0.06) continue;
      const y = lerp(0.02 * hw + 0.015, hw * 0.95, rng());     // strictly +Y, inside the edge
      if (!pointInPoly(x, y, sil)) continue;
      let d = 1e9;
      for (const s of half) d = Math.min(d, (s.x - x) ** 2 + (s.y - y) ** 2);
      if (d > bestD) { bestD = d; best = { x, y }; }
    }
    if (best) half.push(best);
  }

  // mirror to a fully symmetric seed set (no seed on the axis)
  const seeds = [];
  for (const s of half) { seeds.push({ x: s.x, y: s.y }); seeds.push({ x: s.x, y: -s.y }); }

  // each cell = silhouette clipped by every perpendicular-bisector half-plane
  const edges = new Map();                    // dedup key -> { a, b, n }
  const rk = (v) => Math.round(v * 2000) / 2000;
  const edgeKey = (a, b) => {
    const ka = rk(a.x) + ',' + rk(a.y), kb = rk(b.x) + ',' + rk(b.y);
    return ka < kb ? ka + '|' + kb : kb + '|' + ka;
  };
  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i];
    let cell = sil;
    for (let j = 0; j < seeds.length && cell.length >= 3; j++) {
      if (j === i) continue;
      const t = seeds[j];
      // keep the side closer to s:  2(t-s)·p + (|s|^2 - |t|^2) <= 0
      cell = clipHalfPlane(cell, 2 * (t.x - s.x), 2 * (t.y - s.y),
        (s.x * s.x + s.y * s.y) - (t.x * t.x + t.y * t.y));
    }
    if (cell.length < 3) continue;
    for (let k = 0; k < cell.length; k++) {
      const a = cell[k], b = cell[(k + 1) % cell.length];
      if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-4) continue;
      const key = edgeKey(a, b);
      const e = edges.get(key);
      if (e) e.n++; else edges.set(key, { a, b, n: 1 });
    }
  }

  // interior walls border TWO cells -> keep once; silhouette walls border one
  // -> drop (the rim already traces them).
  const walls = [];
  for (const { a, b, n } of edges.values()) if (n >= 2) walls.push({ a, b });

  // SOFTNESS rounds the angular cells into smooth organic ones. It works on the
  // shared wall graph (not per cell), so junctions stay connected and mirror
  // symmetry is preserved: subdivide every wall, then Laplacian-smooth with the
  // petal-boundary vertices pinned and each step re-symmetrised across the axis.
  const softness = clamp(opts.softness != null ? opts.softness : 0, 0, 1);
  const polylines = softness > 0.02
    ? roundGraph(walls, sil, softness)
    : walls.map((w) => [{ x: w.a.x, y: w.a.y }, { x: w.b.x, y: w.b.y }]);

  const veins = polylines.map((pl) => ({ points: pl, w0: VEIN_TERTIARY, w1: VEIN_TERTIARY }));
  const nodes = [];                          // bead the (smoothed) junctions to seal joins
  const seen = new Set();
  for (const pl of polylines) {
    for (const p of [pl[0], pl[pl.length - 1]]) {
      const vk = rk(p.x) + ',' + rk(p.y);
      if (!seen.has(vk)) { seen.add(vk); nodes.push({ x: p.x, y: p.y, width: VEIN_TERTIARY }); }
    }
  }
  return { veins, nodes };
}

// Round a shared wall graph into smooth cells. Walls are subdivided and the
// whole network is Laplacian-smoothed; vertices on the petal boundary are
// pinned (cells stay inside the rim) and every pass is mirrored across the axis
// so bilateral symmetry is exact. Returns one smoothed polyline per wall, all
// sharing their junction endpoints so the mesh stays connected.
function roundGraph(walls, sil, softness) {
  const rk = (v) => Math.round(v * 8000) / 8000;
  const key = (p) => rk(p.x) + ',' + rk(p.y);
  const verts = [];
  const idx = new Map();
  const getV = (p) => {
    const k = key(p); let i = idx.get(k);
    if (i === undefined) { i = verts.length; verts.push({ x: p.x, y: p.y }); idx.set(k, i); }
    return i;
  };
  const segs = walls.map((w) => [getV(w.a), getV(w.b)]);
  const nV = verts.length;

  const S = 4;                               // subdivisions per wall
  const pts = verts.map((v) => ({ x: v.x, y: v.y }));
  const pinned = new Array(nV).fill(false);
  for (let i = 0; i < nV; i++) if (distToPolyBoundary(verts[i].x, verts[i].y, sil) < 0.03) pinned[i] = true;

  const chains = [];
  for (const [a, b] of segs) {
    const chain = [a];
    for (let s = 1; s < S; s++) {
      const t = s / S, i = pts.length;
      pts.push({ x: lerp(verts[a].x, verts[b].x, t), y: lerp(verts[a].y, verts[b].y, t) });
      chain.push(i);
    }
    chain.push(b);
    chains.push(chain);
  }
  const nP = pts.length;
  const isPinned = (i) => i < nV && pinned[i];

  const nbr = Array.from({ length: nP }, () => []);
  for (const chain of chains) for (let i = 0; i < chain.length - 1; i++) { nbr[chain[i]].push(chain[i + 1]); nbr[chain[i + 1]].push(chain[i]); }

  // fixed mirror pairing from the (exactly symmetric) starting positions
  const pos = new Map();
  for (let i = 0; i < nP; i++) pos.set(key(pts[i]), i);
  const mate = new Array(nP).fill(-1);
  for (let i = 0; i < nP; i++) { const j = pos.get(rk(pts[i].x) + ',' + rk(-pts[i].y)); if (j !== undefined) mate[i] = j; }

  const iters = Math.max(1, Math.round(lerp(1, 7, softness)));
  const wgt = 0.5;
  for (let it = 0; it < iters; it++) {
    const nx = new Array(nP), ny = new Array(nP);
    for (let i = 0; i < nP; i++) {
      if (isPinned(i) || nbr[i].length === 0) { nx[i] = pts[i].x; ny[i] = pts[i].y; continue; }
      let sx = 0, sy = 0;
      for (const j of nbr[i]) { sx += pts[j].x; sy += pts[j].y; }
      sx /= nbr[i].length; sy /= nbr[i].length;
      nx[i] = lerp(pts[i].x, sx, wgt); ny[i] = lerp(pts[i].y, sy, wgt);
    }
    for (let i = 0; i < nP; i++) { pts[i].x = nx[i]; pts[i].y = ny[i]; }
    for (let i = 0; i < nP; i++) {                 // re-symmetrise across the axis
      const j = mate[i];
      if (j >= i) {
        const ax = (pts[i].x + pts[j].x) / 2, ay = (pts[i].y - pts[j].y) / 2;
        pts[i].x = ax; pts[i].y = ay; pts[j].x = ax; pts[j].y = -ay;
      }
    }
  }
  return chains.map((chain) => chain.map((i) => ({ x: pts[i].x, y: pts[i].y })));
}

// Distance from a point to the boundary of a polygon (min over its edges).
function distToPolyBoundary(x, y, poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j].x, ay = poly[j].y, bx = poly[i].x, by = poly[i].y;
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
    t = clamp(t, 0, 1);
    const cx = ax + dx * t, cy = ay + dy * t;
    best = Math.min(best, Math.hypot(x - cx, y - cy));
  }
  return best;
}

// Keep the part of a polygon on the inner side of a*x + b*y + c <= 0
// (Sutherland-Hodgman against one half-plane; robust for any simple polygon).
function clipHalfPlane(poly, a, b, c) {
  const out = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p = poly[i], q = poly[(i + 1) % n];
    const dp = a * p.x + b * p.y + c, dq = a * q.x + b * q.y + c;
    if (dp <= 0) out.push(p);
    if ((dp < 0) !== (dq < 0)) {
      const t = dp / (dp - dq);
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  return out;
}

// Even-odd point-in-polygon test for seed rejection.
function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
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


/* -------------------------------------------------------------------
   7. Jagged edge — the petal's own OUTLINE becomes a row of sharp teeth
   around the TIP END (the outer third of the margin); the sides stay smooth.

   This is not an add-on: the rim tube traces the teeth (so the outline itself
   is jagged) and a fine vein runs up the middle of each tooth (so the veins
   extend into the jagged edge too). Each tooth apex is pushed out along the
   in-surface OUTWARD NORMAL — the surface tangent perpendicular to the edge,
   from the real 3D surface — so teeth follow the petal's curvature and tilt,
   not a fixed world axis. The whole edge is one modifiable outline, ready for
   the other PETAL EDGE options (ruffle, undulation, fractal) to perturb next.

   buildJaggedEdge returns LOCAL-frame geometry (or null when not jagged):
     rim        : ordered [{x,y,z}] closed outline, weaving through the teeth
     teethVeins : [ [{x,y,z}...] ]  one small mid-vein polyline per tooth
   The render layer places these into the bloom exactly like every other point.
   ------------------------------------------------------------------- */

const TIP_LENGTH_MAX = 0.5;    // world reach of a tooth at TIP LENGTH = 1
const TIP_U_APEX     = 0.985;  // the tip region reaches almost to the apex; a
                               // dedicated apex tooth then wraps the very tip
const TIP_REGION_MIN = 0.10;   // shortest "tip" — the last tenth of the petal
const TIP_REGION_MAX = 0.95;   // longest — teeth run all the way to the base

// How much of the petal END counts as "the tip", driven by the TIP REGION
// slider (P.tipRegion, 0..1). Shared by every PETAL EDGE style (jagged now;
// ruffle / fractal later) so they all shape the same stretch of the outline.
// Returns { uStart, uEnd } stations bounding the tip region on the edge.
export function tipRegionRange(P) {
  const region = clamp(P.tipRegion != null ? P.tipRegion : 0.3, 0, 1);
  const uEnd = TIP_U_APEX;
  const uStart = clamp(uEnd - lerp(TIP_REGION_MIN, TIP_REGION_MAX, region), 0.05, uEnd - 0.04);
  return { uStart, uEnd };
}

// Edge point at station u on side s (+1 / -1), plus the unit outward direction:
// tangent to the surface and perpendicular to the edge, so it tracks curvature.
function edgeOutward(u, s, P, spine) {
  const eps = 0.004;
  const p = surfacePoint(u, s, P, spine);
  // along-edge tangent (central difference in u)
  const a = surfacePoint(clamp(u + eps, 0, 0.9995), s, P, spine);
  const b = surfacePoint(clamp(u - eps, 0, 0.9995), s, P, spine);
  let tx = a.x - b.x, ty = a.y - b.y, tz = a.z - b.z;
  const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
  // lateral direction (inner -> edge across the width) points generally outward
  const pin = surfacePoint(u, s * (1 - eps), P, spine);
  let lx = p.x - pin.x, ly = p.y - pin.y, lz = p.z - pin.z;
  // remove the along-edge component so the result is perpendicular to the edge
  const d = lx * tx + ly * ty + lz * tz;
  lx -= d * tx; ly -= d * ty; lz -= d * tz;
  const ll = Math.hypot(lx, ly, lz) || 1;
  return { p, out: { x: lx / ll, y: ly / ll, z: lz / ll }, tan: { x: tx, y: ty, z: tz } };
}

export function buildJaggedEdge(P, spine, rng) {
  if (P.tipStyle !== 'jagged') return null;
  // There is ONE feature — a pointed tip — that appears as the big apex tip and
  // as smaller repeated teeth along the edge. TIP LENGTH sets the apex reach;
  // teeth are the same tip scaled down by a fixed sub-apex ratio, so the apex
  // is always the largest and lengthening never flattens the hierarchy.
  const apexLen = (P.tipLength || 0) * TIP_LENGTH_MAX;
  if (apexLen <= 1e-4) return null;
  // TIP FREQUENCY = TOTAL number of tips including the apex. 1 -> apex only;
  // each extra pair flanks the apex symmetrically with more, smaller teeth.
  const freqTotal = clamp(Math.round(P.tipFrequency || 1), 1, 41);
  const perSide = Math.max(0, Math.round((freqTotal - 1) / 2));
  const irr = clamp(P.tipIrregularity || 0, 0, 1);
  const shape = clamp(P.tip != null ? P.tip : 0.5, 0, 1);  // TIP SHAPE: sharpness of EVERY tip
  const { uStart, uEnd } = tipRegionRange(P);    // the petal edge that carries teeth
  const du = perSide > 0 ? (uEnd - uStart) / perSide : 0;
  const hb = du * 0.48;                          // tooth base half-width, in u
  const nEdge = 64;
  // Teeth shrink as more of them pack in (more teeth -> smaller teeth), but
  // always stay a sub-apex fraction so the apex reads as the largest tip.
  const toothLen = apexLen * clamp(0.62 * Math.pow(Math.max(perSide, 1), -0.4), 0.18, 0.72);

  // Teeth extend along the CUP-FREE outward normal so they stay in the petal's
  // broad plane — the same plane the apex tooth lives in (its peak runs up the
  // midrib, where there is no cup). Taking the direction from a flat clone of
  // the surface strips the transverse cupping that would otherwise splay each
  // tooth out of plane by a different amount, which is what made the side teeth
  // read as ragged, inconsistent spikes next to the clean apex. Feet still sit
  // on the real (cupped) edge, so every tooth attaches seamlessly to the rim.
  const Pflat = { ...P, cup: 0 };

  // ONE shape rule for every tip — the side teeth and the apex tip alike.
  // A tip is two feet on the edge (F0, F1) rising to a single peak K. The rim
  // sweeps the straight chord F0->F1 while lifting toward K by a height profile
  // that morphs from a smooth hump (ROUND) to a sharp tent (POINTED) via TIP
  // SHAPE. The feet themselves are supplied by the edge trace, so the samples
  // here are the interior of the tip. At POINTED every sample lands on the two
  // straight sides F0->K and K->F1, giving a crisp triangle; ROUND bulges past
  // those sides. The apex tip runs through the very same profile.
  const tent = (t) => 1 - 2 * Math.abs(t - 0.5);
  const profile = (t) => (1 - shape) * Math.sin(Math.PI * t) + shape * tent(t);
  const T_SAMPLES = [0.15, 0.35, 0.5, 0.65, 0.85];
  const toothRim = (F0, K, F1) => {
    const mx = (F0.x + F1.x) / 2, my = (F0.y + F1.y) / 2, mz = (F0.z + F1.z) / 2;
    const hx = K.x - mx, hy = K.y - my, hz = K.z - mz;   // chord midpoint -> peak
    return T_SAMPLES.map((t) => {
      const h = profile(t);
      const bx = F0.x + (F1.x - F0.x) * t, by = F0.y + (F1.y - F0.y) * t, bz = F0.z + (F1.z - F0.z) * t;
      return { x: bx + hx * h, y: by + hy * h, z: bz + hz * h };
    });
  };

  // A side tooth centred at uc on side s: its two feet on the edge, its peak
  // (pushed out along the cup-free outward normal), and an inner vein root.
  const makeTooth = (uc, s) => {
    const { out, tan } = edgeOutward(uc, s, Pflat, spine);
    let len = toothLen, skew = 0;
    if (irr > 0) {
      len *= 1 + irr * (rng() * 2 - 1) * 0.55;   // varied length
      skew = irr * (rng() * 2 - 1) * 0.5;        // varied angle: skew along the edge
    }
    const c = surfacePoint(clamp(uc, 0, 0.9995), s, P, spine);
    const sk = skew * len;
    return {
      uc, s,
      nearFoot: surfacePoint(clamp(uc - hb, 0, 0.9995), s, P, spine),
      farFoot:  surfacePoint(clamp(uc + hb, 0, 0.9995), s, P, spine),
      peak: { x: c.x + out.x * len + tan.x * sk, y: c.y + out.y * len + tan.y * sk, z: c.z + out.z * len + tan.z * sk },
      footInner: surfacePoint(clamp(uc, 0, 0.9995), s * 0.45, P, spine),
    };
  };
  const teethOf = (s) => {
    const arr = [];
    for (let k = 0; k < perSide; k++) arr.push(makeTooth(uStart + du * (k + 0.5), s));
    return arr;
  };
  const plus = teethOf(1);
  const minus = teethOf(-1);

  // The apex tip caps the very end of the petal. It is just the largest tip:
  // feet at the tip on each side, peak pointing tip-ward, run through the SAME
  // profile — only longer (apexLen) than the flanking teeth.
  const apF0 = surfacePoint(uEnd, 1, P, spine);
  const apF1 = surfacePoint(uEnd, -1, P, spine);
  const tipC = surfacePoint(0.99, 0, P, spine);
  const tAhead = surfacePoint(0.999, 0, P, spine), tBack = surfacePoint(uEnd, 0, P, spine);
  let ax = tAhead.x - tBack.x, ay = tAhead.y - tBack.y, az = tAhead.z - tBack.z;
  const al = Math.hypot(ax, ay, az) || 1; ax /= al; ay /= al; az /= al;
  let aLen = apexLen; if (irr > 0) aLen *= 1 + irr * (rng() * 2 - 1) * 0.55;
  const apexPeak = { x: tipC.x + ax * aLen, y: tipC.y + ay * aLen, z: tipC.z + az * aLen };

  // ---- rim: smooth edge, detouring through each tooth (foot -> profile -> foot)
  const rim = [];
  const uBase = 0.004;
  const edgeTo = (from, to, s) => {              // append edge samples for u in (from, to]
    const steps = Math.max(1, Math.round(Math.abs(to - from) * nEdge));
    for (let i = 1; i <= steps; i++) rim.push(surfacePoint(clamp(lerp(from, to, i / steps), 0, 0.9995), s, P, spine));
  };

  rim.push(surfacePoint(uBase, 1, P, spine));    // +Y base, then base -> tip
  let cur = uBase;
  for (const t of plus) {
    edgeTo(cur, t.uc - hb, 1);                    // smooth edge up to the near foot
    for (const p of toothRim(t.nearFoot, t.peak, t.farFoot)) rim.push(p);
    rim.push(t.farFoot);                          // ...and back down to the far foot
    cur = t.uc + hb;
  }
  edgeTo(cur, uEnd, 1);                           // +Y edge up to the apex tooth's foot
  for (const p of toothRim(apF0, apexPeak, apF1)) rim.push(p);   // wrap the very tip
  rim.push(apF1);                                 // down onto the -Y side
  cur = uEnd;
  for (let i = minus.length - 1; i >= 0; i--) {   // -Y side, tip -> base (descending)
    const t = minus[i];
    edgeTo(cur, t.uc + hb, -1);                   // down to the far foot first
    const seg = toothRim(t.nearFoot, t.peak, t.farFoot);  // built near->far; walk it far->near
    for (let j = seg.length - 1; j >= 0; j--) rim.push(seg[j]);
    rim.push(t.nearFoot);
    cur = t.uc - hb;
  }
  edgeTo(cur, uBase, -1);                         // smooth edge back to the base

  // ---- a fine mid-vein running from inside the petal into each tooth's peak --
  const teethVeins = [];
  for (const t of [...plus, ...minus]) teethVeins.push([t.footInner, t.peak]);
  teethVeins.push([surfacePoint(0.9, 0, P, spine), apexPeak]);  // into the apex tooth

  return { rim, teethVeins };
}

/* -------------------------------------------------------------------
   RUFFLED tip: a FULL-surface edge treatment, not an outline trick. The
   buckle itself lives in surfacePoint (ruffleLift), so the whole lamina —
   every vein and the margin alike — waves out of plane, strongest at the
   edge and fading to the mid-rib, exactly like differential growth on a thin
   sheet. This function only supplies the RIM: a densely-sampled smooth
   outline which, mapped through the now-buckling surfacePoint, traces the
   fluted margin. Shared controls, remapped:
     TIP SHAPE     -> buckle profile: soft sine (0) -> tight gathered crest (1)
     TIP FREQUENCY -> flutes along the margin
     TIP REGION    -> how far the ruffle reaches from the apex down the edge
     TIP LENGTH    -> amplitude of the out-of-plane buckle
   Returns { rim, teethVeins: [] } or null when the style/amplitude is off.
   ------------------------------------------------------------------- */
export function buildRuffledEdge(P, spine /* , rng */) {
  if (P.tipStyle !== 'ruffled') return null;
  if ((P.tipLength || 0) * RUFFLE_AMP_MAX <= 1e-4) return null;
  const freq = clamp(Math.round(P.tipFrequency || 1), 1, 40);
  const { uStart } = tipRegionRange(P);
  const uBase = 0.004, uApex = 0.9995;
  const nRuffle = clamp(Math.round(freq * 16) + 96, 180, 460);   // dense enough to trace the buckled margin
  const nSmooth = 48;

  const rim = [];
  const sampleTo = (from, to, s, n) => {
    for (let i = 1; i <= n; i++) rim.push(surfacePoint(clamp(lerp(from, to, i / n), 0, uApex), s, P, spine));
  };
  const belowSteps = Math.max(2, Math.round((uStart - uBase) * nSmooth));

  rim.push(surfacePoint(uBase, 1, P, spine));
  sampleTo(uBase, uStart, 1, belowSteps);   // smooth margin below the region (+Y)
  sampleTo(uStart, uApex, 1, nRuffle);       // ruffled +Y margin up to the apex
  rim.push(surfacePoint(uApex, 0, P, spine)); // the apex point itself
  sampleTo(uApex, uStart, -1, nRuffle);      // ruffled -Y margin back down
  sampleTo(uStart, uBase, -1, belowSteps);   // smooth margin below the region (-Y)

  return { rim, teethVeins: [] };            // no extra veins; the real veins ride the buckle
}
